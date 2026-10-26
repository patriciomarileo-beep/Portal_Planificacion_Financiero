import { requireAuth } from "../_shared/auth";
import { errorResponse, readJson, requireSameOrigin } from "../_shared/http";
import { googleAccessToken, validatedTablePath } from "../_shared/bigquery";
import { normalizedUserRole } from "../_shared/user-roles";

export const runtime = "nodejs";

type BigQueryField = {
  name: string;
  type: string;
  fields?: BigQueryField[];
};

type QueryParameter = {
  name: string;
  parameterType: { type: string };
  parameterValue: { value: string };
};
type BigQueryRowsPayload = {
  schema?: { fields?: BigQueryField[] };
  rows?: { f: { v: unknown }[] }[];
  totalRows?: string;
  pageToken?: string;
  jobReference?: {
    projectId?: string;
    jobId?: string;
    location?: string;
  };
};
const defaultTable = "forus-cl-planificacion.Planificacion.ft_cl_planificacion_TB_STG_CL_TALANA_PERSONA";
const editableNames = {
  role: "rol",
  active: "activo",
};
const keyCandidates = [
  "id_persona",
  "idpersona",
  "persona_id",
  "id",
  "rut",
  "run",
  "dni",
  "documento",
  "email",
  "correo",
  "mail",
];

const json = (body: unknown, init?: ResponseInit) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });


const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const splitTable = (tableId: string) => {
  const parts = tableId.split(".");
  if (parts.length !== 3) throw new Error("BIGQUERY_TABLE debe tener formato project.dataset.table.");
  return { projectId: parts[0], datasetId: parts[1], tableName: parts[2] };
};

const tablePath = () => validatedTablePath(process.env.BIGQUERY_TABLE || defaultTable);

const configuredProjectId = () => process.env.BIGQUERY_PROJECT_ID || splitTable(tablePath()).projectId;

const accessToken = googleAccessToken;

const runQuery = async <T,>(query: string, queryParameters: QueryParameter[] = []) => {
  const token = await accessToken();
  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${configuredProjectId()}/queries`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      parameterMode: "NAMED",
      queryParameters,
    }),
  });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "Error ejecutando consulta BigQuery.");
  return payload;
};

const runQueryRows = async (query: string, queryParameters: QueryParameter[] = [], maxRows = 50000) => {
  const token = await accessToken();
  const projectId = configuredProjectId();
  const pageSize = Math.min(Math.max(maxRows, 1), 10000);
  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      parameterMode: "NAMED",
      queryParameters,
      maxResults: pageSize,
    }),
  });
  const firstPage = await response.json() as BigQueryRowsPayload & { error?: { message?: string } };
  if (!response.ok) throw new Error(firstPage.error?.message || "Error ejecutando consulta BigQuery.");

  const rows = [...(firstPage.rows ?? [])];
  let pageToken = firstPage.pageToken;
  const jobId = firstPage.jobReference?.jobId;
  const location = firstPage.jobReference?.location;

  while (pageToken && jobId && rows.length < maxRows) {
    const params = new URLSearchParams({
      pageToken,
      maxResults: String(Math.min(10000, maxRows - rows.length)),
    });
    if (location) params.set("location", location);
    const pageResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries/${jobId}?${params.toString()}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const page = await pageResponse.json() as BigQueryRowsPayload & { error?: { message?: string } };
    if (!pageResponse.ok) throw new Error(page.error?.message || "Error leyendo pagina BigQuery.");
    rows.push(...(page.rows ?? []));
    pageToken = page.pageToken;
  }

  return {
    ...firstPage,
    rows,
    loadedRows: rows.length,
    capped: Boolean(pageToken),
  };
};

const cellValue = (field: BigQueryField, value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if (field.type === "RECORD" && Array.isArray((value as { v?: unknown }).v)) return value;
  const raw = String((value as { v?: unknown }).v ?? "");
  if (raw === "") return "";
  if (field.type === "BOOL" || field.type === "BOOLEAN") return raw === "true";
  if (["INTEGER", "INT64", "FLOAT", "FLOAT64", "NUMERIC", "BIGNUMERIC"].includes(field.type)) {
    const number = Number(raw);
    return Number.isFinite(number) ? number : raw;
  }
  return raw;
};

const exactColumn = (fields: BigQueryField[], wanted: string) =>
  fields.find((field) => normalizeName(field.name) === wanted)?.name;

const keyColumn = (fields: BigQueryField[]) =>
  fields.find((field) => keyCandidates.includes(normalizeName(field.name)))?.name ?? null;

const parameter = (name: string, type: string, value: unknown): QueryParameter => ({
  name,
  parameterType: { type: type === "INTEGER" ? "INT64" : type === "FLOAT" ? "FLOAT64" : type },
  parameterValue: { value: value === null || value === undefined ? "" : String(value) },
});

const typedActiveValue = (value: unknown, type: string) => {
  const text = String(value ?? "").trim().toLowerCase();
  const active = ["true", "1", "si", "s", "yes", "y", "activo", "activa"].includes(text);
  if (type === "BOOL" || type === "BOOLEAN") return active;
  if (type === "INTEGER" || type === "INT64") return active ? 1 : 0;
  return active ? "Activo" : "Inactivo";
};

const fieldType = (fields: BigQueryField[], column: string) =>
  fields.find((field) => field.name === column)?.type ?? "STRING";

export async function GET(request: Request) {
  try {
    await requireAuth(request, true);

    const limitParam = new URL(request.url).searchParams.get("limit");
    const configuredMax = Math.min(50000, Math.max(1, Number(process.env.BIGQUERY_USERS_MAX_ROWS) || 50000));
    if (limitParam && limitParam !== "all" && !/^[1-9]\d{0,5}$/.test(limitParam)) return json({ error: "Límite inválido." }, { status: 400 });
    const limit = limitParam === "all" || !limitParam
      ? configuredMax
      : Math.min(Math.max(Number(limitParam), 1), configuredMax);
    const table = tablePath();
    const payload = await runQueryRows(
      `SELECT * FROM \`${table}\` LIMIT @limit`,
      [parameter("limit", "INT64", limit)],
      limit,
    );
    const fields = payload.schema?.fields ?? [];
    const roleColumn = exactColumn(fields, editableNames.role);
    const activeColumn = exactColumn(fields, editableNames.active);
    const rowKey = keyColumn(fields);

    if (!roleColumn || !activeColumn) {
      return json({ error: "La tabla debe contener las columnas Rol y Activo." }, { status: 422 });
    }

    return json({
      columns: fields.map((field) => field.name),
      keyColumn: rowKey,
      roleColumn,
      activeColumn,
      totalRows: Number(payload.loadedRows ?? payload.rows?.length ?? 0),
      rowLimit: limit,
      capped: payload.capped,
      rows: (payload.rows ?? []).map((row, index) => {
        const data = Object.fromEntries(fields.map((field, fieldIndex) => [
          field.name,
          cellValue(field, row.f[fieldIndex]),
        ]));
        return {
          id: rowKey ? String(data[rowKey] ?? index) : String(index),
          data,
        };
      }),
    });
  } catch (error) {
    return errorResponse(error, "usuarios");
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    await requireAuth(request, true);

    const body = await readJson(request) as {
      keyColumn?: string;
      keyValue?: unknown;
      rol?: unknown;
      activo?: unknown;
    };
    if (!body || typeof body !== "object" || typeof body.activo !== "boolean" || !["string", "number"].includes(typeof body.keyValue) || (typeof body.keyValue === "number" && !Number.isFinite(body.keyValue)) || String(body.keyValue).trim().length === 0 || String(body.keyValue).length > 500) return json({ error: "Datos de usuario inválidos." }, { status: 400 });
    const role = normalizedUserRole(body.rol);
    if (!role && !(body.rol === "" && body.activo === false)) return json({ error: "Selecciona un rol permitido." }, { status: 400 });
    const table = tablePath();
    const schemaPayload = await runQuery<{ schema?: { fields?: BigQueryField[] } }>(
      `SELECT * FROM \`${table}\` LIMIT 1`,
    );
    const fields = schemaPayload.schema?.fields ?? [];
    const roleColumn = exactColumn(fields, editableNames.role);
    const activeColumn = exactColumn(fields, editableNames.active);
    const allowedKey = keyColumn(fields);

    if (!roleColumn || !activeColumn) {
      return json({ error: "La tabla debe contener las columnas Rol y Activo." }, { status: 422 });
    }
    if (!allowedKey || body.keyColumn !== allowedKey || body.keyValue === undefined || body.keyValue === null || body.keyValue === "") {
      return json({ error: "No se encontro una columna llave confiable para actualizar este usuario." }, { status: 422 });
    }

    await runQuery(
      `UPDATE \`${table}\`
       SET \`${roleColumn}\` = @rol, \`${activeColumn}\` = @activo
       WHERE \`${allowedKey}\` = @keyValue`,
      [
        parameter("rol", fieldType(fields, roleColumn), role ?? ""),
        parameter("activo", fieldType(fields, activeColumn), typedActiveValue(body.activo, fieldType(fields, activeColumn))),
        parameter("keyValue", fieldType(fields, allowedKey), body.keyValue),
      ],
    );

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error, "usuarios");
  }
}
