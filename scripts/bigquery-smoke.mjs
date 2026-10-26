import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { GoogleAuth } from "google-auth-library";
import { localRuntimeEnv } from "./local-runtime-env.mjs";
if (existsSync(".env.local")) loadEnvFile(".env.local");
Object.assign(process.env, localRuntimeEnv());
async function main() {
  const table = process.env.BIGQUERY_TABLE || "forus-cl-planificacion.Planificacion.ft_cl_planificacion_TB_STG_CL_TALANA_PERSONA";
  if (!table || !/^[\w-]+\.[\w]+\.[\w]+$/.test(table)) throw Error("Configura BIGQUERY_TABLE con project.dataset.table.");
  const project = process.env.BIGQUERY_PROJECT_ID || table.split(".")[0];
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const token = await auth.getAccessToken();
  const quote = String.fromCharCode(96);
  const response = await fetch("https://bigquery.googleapis.com/bigquery/v2/projects/" + project + "/queries", {
    method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ query: "SELECT COUNT(*) total FROM " + quote + table + quote, useLegacySql: false, maximumBytesBilled: "100000000", timeoutMs: 20000 }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json();
  if (!response.ok) throw Error(payload.error?.message || "No fue posible consultar BigQuery.");
  if (!payload.jobComplete) throw Error("La consulta sigue en ejecución. Reintenta la verificación.");
  console.log(JSON.stringify({ ok: true, totalRows: Number(payload.rows?.[0]?.f?.[0]?.v || 0) }));
}
main().catch(error => {
  if (/invalid_rapt|invalid_grant/.test(error.message)) console.error("La credencial local venció. Ejecuta gcloud auth application-default login con CLOUDSDK_CONFIG del proyecto.");
  else console.error(error.message);
  process.exitCode = 1;
});
