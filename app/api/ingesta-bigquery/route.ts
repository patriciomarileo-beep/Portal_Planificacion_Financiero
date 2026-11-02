import { BigQuery, type InsertRowsOptions } from "@google-cloud/bigquery";
import { planningEntrySchema } from "../../toolbox/schema";
import { requireMenuAuth } from "../_shared/auth";
import { errorResponse, HttpError, json, readJson, requireSameOrigin } from "../_shared/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireMenuAuth(request, "toolbox");
    const parsed = planningEntrySchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Datos de planificación inválidos.");
    const projectId = process.env.PROJECT_ID || process.env.BIGQUERY_PROJECT_ID || "";
    const datasetId = process.env.DATASET_ID || process.env.BIGQUERY_INGEST_DATASET_ID || "";
    const tableId = process.env.TABLE_ID || process.env.BIGQUERY_INGEST_TABLE_ID || "";
    if (!projectId || !datasetId || !tableId) throw new HttpError(503, "La captura no está disponible temporalmente.");
    const client = new BigQuery({ projectId });
    const row = { ...parsed.data, valorProyectado: Number(parsed.data.valorProyectado), creadoPor: session.email, creadoEn: new Date().toISOString(), origen: "toolbox-ap-web" };
    const options: InsertRowsOptions = { raw: false, ignoreUnknownValues: false, skipInvalidRows: false };
    await client.dataset(datasetId).table(tableId).insert([row], options);
    return json({ ok: true }, { status: 201 });
  } catch (error) { return errorResponse(error, "planning.insert"); }
}
