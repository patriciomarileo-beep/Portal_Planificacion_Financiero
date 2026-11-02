import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const envFile = join(root, ".env.cloudrun");

if (existsSync(envFile)) {
  const content = readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const required = ["CLOUD_RUN_PROJECT", "CLOUD_RUN_REGION", "CLOUD_RUN_SERVICE_ACCOUNT", "CLOUD_RUN_AUTH_SECRET", "GOOGLE_OAUTH_CLIENT_ID", "APP_ORIGIN", "CLOUD_RUN_IMAGE"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Faltan variables para desplegar: ${missing.join(", ")}`);
  console.error("Crea .env.cloudrun desde cloudrun.env.example o define esas variables en tu terminal.");
  process.exit(1);
}

const gcloudConfig = process.env.CLOUDSDK_CONFIG || join(root, ".gcloud");
mkdirSync(gcloudConfig, { recursive: true });

const service = process.env.CLOUD_RUN_SERVICE || "rentabilidad-tiendas-2027";
const image = process.env.CLOUD_RUN_IMAGE.trim();
if (!/^(?:[a-z0-9-]+-docker\.pkg\.dev|gcr\.io)\/[a-zA-Z0-9_./-]+@sha256:[a-f0-9]{64}$/.test(image)) {
  console.error("CLOUD_RUN_IMAGE debe identificar una imagen de Artifact Registry/GCR fijada por digest sha256.");
  process.exit(1);
}
const allowUnauthenticated = process.env.CLOUD_RUN_ALLOW_UNAUTHENTICATED === "true";
if (allowUnauthenticated && !process.env.CLOUD_RUN_PUBLIC_ACCESS_REASON?.trim()) {
  console.error("El acceso público requiere documentar CLOUD_RUN_PUBLIC_ACCESS_REASON y configurar IAP/control equivalente.");
  process.exit(1);
}
try {
  const origin = new URL(process.env.APP_ORIGIN);
  if (origin.protocol !== "https:" || origin.origin !== process.env.APP_ORIGIN) throw new Error();
} catch { console.error("APP_ORIGIN debe ser un origen HTTPS sin ruta ni barra final."); process.exit(1); }
const envVars = {
  BIGQUERY_AUTH_MODE: process.env.BIGQUERY_AUTH_MODE || "adc",
  BIGQUERY_PROJECT_ID: process.env.BIGQUERY_PROJECT_ID || "forus-cl-planificacion",
  BIGQUERY_TABLE: process.env.BIGQUERY_TABLE || "forus-cl-planificacion.Planificacion.ft_cl_planificacion_TB_STG_CL_TALANA_PERSONA",
  BIGQUERY_ROLES_TABLE: process.env.BIGQUERY_ROLES_TABLE || "forus-cl-planificacion.Planificacion.ft_cl_planificacion_TB_ROLES_PLT_FINAN",
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  APP_ORIGIN: process.env.APP_ORIGIN,
  BIGQUERY_IMPORTS_TABLE: process.env.BIGQUERY_IMPORTS_TABLE || "",
  BIGQUERY_COSMETICS_TABLE: process.env.BIGQUERY_COSMETICS_TABLE || "forus-analitica-test-datalake.silver.ft_cl_planificacion_importaciones_industria_cosmeticos",
  PROJECT_ID: process.env.PROJECT_ID || "",
  DATASET_ID: process.env.DATASET_ID || "",
  TABLE_ID: process.env.TABLE_ID || "",
};

const setEnvVars = Object.entries(envVars)
  .filter(([, value]) => value)
  .map(([key, value]) => `${key}=${value}`)
  .join(",");

const args = [
  "run",
  "deploy",
  service,
  "--image",
  image,
  "--project",
  process.env.CLOUD_RUN_PROJECT,
  "--region",
  process.env.CLOUD_RUN_REGION,
];

args.push(allowUnauthenticated ? "--allow-unauthenticated" : "--no-allow-unauthenticated");
if (process.env.CLOUD_RUN_SERVICE_ACCOUNT) {
  args.push("--service-account", process.env.CLOUD_RUN_SERVICE_ACCOUNT);
}
if (setEnvVars) args.push("--set-env-vars", setEnvVars);
if (process.env.CLOUD_RUN_AUTH_SECRET) {
  args.push("--set-secrets", `AUTH_SESSION_SECRET=${process.env.CLOUD_RUN_AUTH_SECRET}`);
}

if (args.some((value) => !/^[a-zA-Z0-9_:/@=.,-]+$/.test(String(value)))) {
  console.error("La configuración contiene caracteres no permitidos para el despliegue.");
  process.exit(1);
}

const trivy = process.env.TRIVY_BINARY || "trivy";
const reportDirectory = join(root, "tmp", "security");
const scanArgs = ["image", "--image-src", "remote", "--scanners", "vuln", "--severity", "HIGH,CRITICAL", "--exit-code", "1", "--format", "json", "--output", join(reportDirectory, "container-security.json"), "--timeout", "10m", image];
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({ securityScan: { command: trivy, args: scanArgs }, deployment: { command: "gcloud", args } }, null, 2));
  process.exit(0);
}

mkdirSync(reportDirectory, { recursive: true });
try {
  await new Promise((resolve, reject) => {
    const scanner = spawn(trivy, scanArgs, { stdio: "inherit", windowsHide: true });
    scanner.on("error", reject);
    scanner.on("exit", code => code === 0 ? resolve() : reject(new Error(`Trivy finalizó con código ${code}.`)));
  });
} catch {
  console.error("Despliegue bloqueado: el escáner no está disponible o la imagen conserva vulnerabilidades HIGH/CRITICAL. Revisa tmp/security/container-security.json.");
  process.exit(1);
}

console.log(`Usando CLOUDSDK_CONFIG=${gcloudConfig}`);
console.log(`Desplegando ${service} en ${process.env.CLOUD_RUN_PROJECT}/${process.env.CLOUD_RUN_REGION}`);

const command = process.platform === "win32" ? "cmd.exe" : "gcloud";
const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "gcloud.cmd", ...args] : args;
const child = spawn(command, commandArgs, {
  windowsHide: true,
  stdio: "inherit",
  env: {
    ...process.env,
    CLOUDSDK_CONFIG: gcloudConfig,
  },
});

child.on("error", (error) => { console.error(`No se pudo iniciar gcloud: ${error.message}`); process.exit(1); });

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`gcloud termino con signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
