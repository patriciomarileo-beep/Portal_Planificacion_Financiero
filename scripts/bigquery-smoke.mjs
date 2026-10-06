import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createSign } from "node:crypto";

const loadLocalEnv = () => {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
};

const base64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const tokenFromServiceAccount = async (credential) => {
  if (!credential.client_email || !credential.private_key) {
    throw new Error("La cuenta de servicio no tiene client_email o private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64Url(JSON.stringify({
      iss: credential.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })),
  ].join(".");
  const signature = createSign("RSA-SHA256").update(unsigned).sign(
    credential.private_key.replace(/\\n/g, "\n"),
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(signature)}`,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "No se pudo autenticar con cuenta de servicio.");
  }
  return payload.access_token;
};

const tokenFromAuthorizedUser = async (credential) => {
  if (!credential.client_id || !credential.client_secret || !credential.refresh_token) {
    throw new Error("La credencial ADC no tiene client_id, client_secret o refresh_token.");
  }

  const response = await fetch(credential.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credential.client_id,
      client_secret: credential.client_secret,
      refresh_token: credential.refresh_token,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "No se pudo autenticar con ADC.");
  }
  return payload.access_token;
};

const readCredential = () => {
  if (process.env.BIGQUERY_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.BIGQUERY_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.BIGQUERY_ADC_JSON_BASE64) {
    return JSON.parse(Buffer.from(process.env.BIGQUERY_ADC_JSON_BASE64, "base64").toString("utf8"));
  }

  if (process.env.BIGQUERY_ADC_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return JSON.parse(process.env.BIGQUERY_ADC_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  }

  const paths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.CLOUDSDK_CONFIG ? join(process.env.CLOUDSDK_CONFIG, "application_default_credentials.json") : "",
    process.env.APPDATA ? join(process.env.APPDATA, "gcloud", "application_default_credentials.json") : "",
    join(homedir(), ".config", "gcloud", "application_default_credentials.json"),
  ].filter(Boolean);

  for (const path of paths) {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  }

  throw new Error("No encontre credenciales ADC o cuenta de servicio para BigQuery.");
};

const accessToken = async () => {
  const credential = readCredential();
  if (credential.type === "authorized_user") return tokenFromAuthorizedUser(credential);
  if (credential.type === "service_account") return tokenFromServiceAccount(credential);
  throw new Error(`Tipo de credencial no soportado: ${credential.type ?? "desconocido"}.`);
};

const main = async () => {
  loadLocalEnv();
  const table = process.env.BIGQUERY_TABLE;
  if (!table) throw new Error("Falta BIGQUERY_TABLE en .env.local.");
  const [projectFromTable] = table.split(".");
  const projectId = process.env.BIGQUERY_PROJECT_ID || projectFromTable;
  const token = await accessToken();

  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `SELECT COUNT(1) AS total FROM \`${table}\``,
      useLegacySql: false,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Error ejecutando consulta BigQuery.");

  console.log(JSON.stringify({
    ok: true,
    table,
    totalRows: Number(payload.rows?.[0]?.f?.[0]?.v ?? 0),
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
