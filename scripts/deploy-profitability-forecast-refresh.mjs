import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const gcloudConfig = process.env.CLOUDSDK_CONFIG || join(root, ".gcloud");
mkdirSync(gcloudConfig, { recursive: true });

for (const fileName of [".env.cloudrun", ".env.local"]) {
  const filePath = join(root, fileName);
  if (!existsSync(filePath)) continue;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const project = process.env.FORECAST_REFRESH_PROJECT || "forus-analitica-test-datalake";
const location = process.env.FORECAST_REFRESH_LOCATION || "us-east4";
const authMode = process.env.FORECAST_REFRESH_AUTH_MODE || "user";
const serviceAccount = process.env.FORECAST_REFRESH_SERVICE_ACCOUNT || process.env.CLOUD_RUN_SERVICE_ACCOUNT || "";
const schedule = process.env.FORECAST_REFRESH_SCHEDULE || "every 5 minutes";
const displayName = process.env.FORECAST_REFRESH_DISPLAY_NAME || "Portal financiero - Carga directa Forecast anual marca canal";
const procedure = `${project}.silver.sp_refresh_forecast_anual_marca_canal`;
const scheduledQuery = `CALL \`${procedure}\`();`;
const procedureSqlPath = join(root, "sql", "refresh-profitability-forecast.sql");
const procedureSql = readFileSync(procedureSqlPath, "utf8");
const dryRun = process.argv.includes("--dry-run");
const runNow = process.argv.includes("--run-now");

const projectPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const locationPattern = /^[a-z0-9-]+$/;
const serviceAccountPattern = /^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/;

if (!projectPattern.test(project)) throw new Error("FORECAST_REFRESH_PROJECT no es valido.");
if (!locationPattern.test(location)) throw new Error("FORECAST_REFRESH_LOCATION no es valida.");
if (!["user", "service-account"].includes(authMode)) {
  throw new Error("FORECAST_REFRESH_AUTH_MODE debe ser user o service-account.");
}
if (authMode === "service-account" && !serviceAccountPattern.test(serviceAccount)) {
  throw new Error("Define FORECAST_REFRESH_SERVICE_ACCOUNT con la cuenta que tiene lectura de la hoja y escritura en BigQuery.");
}

const command = process.platform === "win32" ? "cmd.exe" : "bq";
const gcloudCommand = process.platform === "win32" ? "cmd.exe" : "gcloud";
const commandArgs = (args) => process.platform === "win32"
  ? ["/d", "/s", "/c", "bq.cmd", ...args]
  : args;

const runBq = (args, { input = "", capture = false } = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, commandArgs(args), {
    cwd: root,
    windowsHide: true,
    stdio: ["pipe", capture ? "pipe" : "inherit", "inherit"],
    env: { ...process.env, CLOUDSDK_CONFIG: gcloudConfig },
  });
  let output = "";
  if (capture) child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  child.on("error", reject);
  child.on("exit", (code, signal) => {
    if (signal) reject(new Error(`bq termino con signal ${signal}.`));
    else if (code !== 0) reject(new Error(`bq termino con codigo ${code}.`));
    else resolve(output);
  });
  child.stdin.end(input);
});

const runGcloud = (args, { capture = false } = {}) => new Promise((resolve, reject) => {
  const child = spawn(gcloudCommand, process.platform === "win32"
    ? ["/d", "/s", "/c", "gcloud.cmd", ...args]
    : args, {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
    env: { ...process.env, CLOUDSDK_CONFIG: gcloudConfig },
  });
  let output = "";
  if (capture) child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  child.on("error", reject);
  child.on("exit", (code, signal) => {
    if (signal) reject(new Error(`gcloud termino con signal ${signal}.`));
    else if (code !== 0) reject(new Error(`gcloud termino con codigo ${code}.`));
    else resolve(output.trim());
  });
});

const enableFailureEmail = async (transferName) => {
  const accessToken = await runGcloud(
    ["auth", "application-default", "print-access-token", "--quiet"],
    { capture: true },
  );
  const response = await fetch(
    `https://bigquerydatatransfer.googleapis.com/v1/${transferName}?updateMask=email_preferences`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emailPreferences: { enableFailureEmail: true } }),
    },
  );
  if (!response.ok) {
    throw new Error(`No se pudo habilitar el correo de fallos (${response.status}): ${await response.text()}`);
  }
};

const queryParams = JSON.stringify({ query: scheduledQuery });
const credentialArgs = authMode === "service-account"
  ? [`--service_account_name=${serviceAccount}`]
  : [];
const credentialUpdateArgs = authMode === "service-account"
  ? ["--update_credentials=true", ...credentialArgs]
  : [];

if (dryRun) {
  console.log(JSON.stringify({
    project,
    location,
    authMode,
    serviceAccount: authMode === "service-account" ? serviceAccount : null,
    schedule,
    displayName,
    procedure,
    procedureSqlPath,
    gcloudConfig,
    scheduledQuery,
    runNow,
  }, null, 2));
  process.exit(0);
}

console.log(`Instalando ${procedure} en ${project}/${location}...`);
await runBq([
  "query",
  `--project_id=${project}`,
  `--location=${location}`,
  "--use_legacy_sql=false",
  "--format=none",
], { input: procedureSql });

const transfersJson = await runBq([
  "ls",
  "--transfer_config=true",
  `--transfer_location=${location}`,
  `--project_id=${project}`,
  "--format=json",
], { capture: true });
const transfers = JSON.parse(transfersJson || "[]");
const existing = transfers.find((transfer) => transfer.displayName === displayName);
const isNewSchedule = !existing?.name;

if (existing?.name) {
  console.log(`Actualizando consulta programada ${existing.name}...`);
  await runBq([
    "update",
    "--transfer_config=true",
    `--display_name=${displayName}`,
    `--schedule=${schedule}`,
    `--params=${queryParams}`,
    ...credentialUpdateArgs,
    existing.name,
  ]);
} else {
  console.log("Creando consulta programada...");
  await runBq([
    "mk",
    "--transfer_config=true",
    `--project_id=${project}`,
    `--location=${location}`,
    "--data_source=scheduled_query",
    `--display_name=${displayName}`,
    `--schedule=${schedule}`,
    `--params=${queryParams}`,
    ...credentialArgs,
  ]);
}

const configuredTransfersJson = await runBq([
  "ls",
  "--transfer_config=true",
  `--transfer_location=${location}`,
  `--project_id=${project}`,
  "--format=json",
], { capture: true });
const configuredTransfer = JSON.parse(configuredTransfersJson || "[]")
  .find((transfer) => transfer.displayName === displayName);
if (!configuredTransfer?.name) {
  throw new Error(`No se encontro la consulta programada ${displayName} despues de configurarla.`);
}
console.log(`Habilitando correo de fallos para ${configuredTransfer.name}...`);
await enableFailureEmail(configuredTransfer.name);

if (runNow && !isNewSchedule) {
  console.log("Ejecutando sincronizacion inicial...");
  await runBq([
    "query",
    `--project_id=${project}`,
    `--location=${location}`,
    "--use_legacy_sql=false",
    "--format=prettyjson",
    scheduledQuery,
  ]);
} else if (runNow) {
  console.log(
    "La consulta programada nueva ya dispara su primera ejecucion automaticamente; se omite una segunda ejecucion concurrente.",
  );
}

console.log("Sincronizacion programada de Rentabilidad Forecast instalada correctamente.");
