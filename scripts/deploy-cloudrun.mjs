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

const required = ["CLOUD_RUN_PROJECT", "CLOUD_RUN_REGION"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Faltan variables para desplegar: ${missing.join(", ")}`);
  console.error("Crea .env.cloudrun desde cloudrun.env.example o define esas variables en tu terminal.");
  process.exit(1);
}

const gcloudConfig = process.env.CLOUDSDK_CONFIG || join(root, ".gcloud");
mkdirSync(gcloudConfig, { recursive: true });

const service = process.env.CLOUD_RUN_SERVICE || "rentabilidad-tiendas-2027";
const allowUnauthenticated = (process.env.CLOUD_RUN_ALLOW_UNAUTHENTICATED || "true").toLowerCase() !== "false";
const envVars = {
  BIGQUERY_AUTH_MODE: process.env.BIGQUERY_AUTH_MODE || "adc",
  BIGQUERY_PROJECT_ID: process.env.BIGQUERY_PROJECT_ID || "forus-cl-planificacion",
  BIGQUERY_TABLE: process.env.BIGQUERY_TABLE || "forus-cl-planificacion.Planificacion.ft_cl_planificacion_TB_STG_CL_TALANA_PERSONA",
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
};

const setEnvVars = Object.entries(envVars)
  .filter(([, value]) => value)
  .map(([key, value]) => `${key}=${value}`)
  .join(",");

const args = [
  "run",
  "deploy",
  service,
  "--source",
  ".",
  "--project",
  process.env.CLOUD_RUN_PROJECT,
  "--region",
  process.env.CLOUD_RUN_REGION,
];

if (allowUnauthenticated) args.push("--allow-unauthenticated");
if (process.env.CLOUD_RUN_SERVICE_ACCOUNT) {
  args.push("--service-account", process.env.CLOUD_RUN_SERVICE_ACCOUNT);
}
if (setEnvVars) args.push("--set-env-vars", setEnvVars);
if (process.env.CLOUD_RUN_AUTH_SECRET) {
  args.push("--set-secrets", `AUTH_SESSION_SECRET=${process.env.CLOUD_RUN_AUTH_SECRET}`);
}

console.log(`Usando CLOUDSDK_CONFIG=${gcloudConfig}`);
console.log(`Desplegando ${service} en ${process.env.CLOUD_RUN_PROJECT}/${process.env.CLOUD_RUN_REGION}`);

const child = spawn(process.platform === "win32" ? "gcloud.cmd" : "gcloud", args, {
  stdio: "inherit",
  env: {
    ...process.env,
    CLOUDSDK_CONFIG: gcloudConfig,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`gcloud termino con signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
