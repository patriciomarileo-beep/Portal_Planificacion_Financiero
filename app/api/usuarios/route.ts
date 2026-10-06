import { readSession } from "../_shared/session";

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
type ServiceAccountCredential = {
  type?: string;
  client_email?: string;
  private_key?: string;
};
type AuthorizedUserCredential = {
  type?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  token_uri?: string;
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

const isAdminRole = (role: string) => role.trim().toUpperCase() === "ADMINISTRADOR";

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

const tablePath = () => process.env.BIGQUERY_TABLE || defaultTable;

const configuredProjectId = () => process.env.BIGQUERY_PROJECT_ID || splitTable(tablePath()).projectId;

const serviceAccount = () => {
  const rawJson = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as ServiceAccountCredential;
    return {
      clientEmail: String(parsed.client_email ?? ""),
      privateKey: String(parsed.private_key ?? ""),
    };
  }

  const clientEmail = process.env.BIGQUERY_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || "";
  const privateKey = process.env.BIGQUERY_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || "";
  if (!clientEmail || !privateKey) return null;
  return {
    clientEmail,
    privateKey,
  };
};

const adcPaths = async () => {
  const [{ join }, { homedir }] = await Promise.all([import("node:path"), import("node:os")]);
  return [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.CLOUDSDK_CONFIG ? join(process.env.CLOUDSDK_CONFIG, "application_default_credentials.json") : "",
    process.env.APPDATA ? join(process.env.APPDATA, "gcloud", "application_default_credentials.json") : "",
    join(homedir(), ".config", "gcloud", "application_default_credentials.json"),
  ].filter((path): path is string => Boolean(path));
};

const readApplicationDefaultCredential = async () => {
  const inlineBase64 = process.env.BIGQUERY_ADC_JSON_BASE64;
  if (inlineBase64) {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(inlineBase64), (character) => character.charCodeAt(0)),
    );
    return JSON.parse(decoded) as ServiceAccountCredential | AuthorizedUserCredential;
  }

  const inline = process.env.BIGQUERY_ADC_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (inline) return JSON.parse(inline) as ServiceAccountCredential | AuthorizedUserCredential;

  const { readFile } = await import("node:fs/promises");
  const { pathToFileURL } = await import("node:url");
  const paths = await adcPaths();
  for (const credentialPath of paths) {
    try {
      const source = /^[a-zA-Z]:[\\/]/.test(credentialPath)
        ? pathToFileURL(credentialPath)
        : credentialPath;
      const content = await readFile(source, "utf8");
      return JSON.parse(content) as ServiceAccountCredential | AuthorizedUserCredential;
    } catch {
      // Try the next ADC location.
    }
  }

  throw new Error("No encontre credenciales ADC. Ejecuta `gcloud auth application-default login` o define GOOGLE_APPLICATION_CREDENTIALS.");
};

const base64Url = (bytes: ArrayBuffer | Uint8Array | string) => {
  const binary = typeof bytes === "string"
    ? bytes
    : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const pemToArrayBuffer = (pem: string) => {
  const normalized = pem
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r");
  if (!normalized.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("BIGQUERY_PRIVATE_KEY debe ser una llave PEM de cuenta de servicio, no una password de usuario.");
  }
  const cleaned = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const serviceAccountAccessToken = async ({ clientEmail, privateKey }: { clientEmail: string; privateKey: string }) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(signature)}`,
    }),
  });

  const payload = await tokenResponse.json() as { access_token?: string; error_description?: string; error?: string };
  if (!tokenResponse.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "No se pudo autenticar contra Google.");
  }
  return payload.access_token;
};

const authorizedUserAccessToken = async (credential: AuthorizedUserCredential) => {
  if (!credential.client_id || !credential.client_secret || !credential.refresh_token) {
    throw new Error("La credencial ADC no tiene client_id, client_secret o refresh_token.");
  }
  const tokenResponse = await fetch(credential.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credential.client_id,
      client_secret: credential.client_secret,
      refresh_token: credential.refresh_token,
    }),
  });

  const payload = await tokenResponse.json() as { access_token?: string; error_description?: string; error?: string };
  if (!tokenResponse.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "No se pudo autenticar con ADC de gcloud.");
  }
  return payload.access_token;
};

const adcAccessToken = async () => {
  const credential = await readApplicationDefaultCredential();
  if (credential.type === "authorized_user") return authorizedUserAccessToken(credential);
  if (credential.type === "service_account") {
    return serviceAccountAccessToken({
      clientEmail: String((credential as ServiceAccountCredential).client_email ?? ""),
      privateKey: String((credential as ServiceAccountCredential).private_key ?? ""),
    });
  }
  throw new Error(`Tipo de credencial ADC no soportado: ${credential.type ?? "desconocido"}. Usa gcloud auth application-default login o una cuenta de servicio.`);
};

const accessToken = async () => {
  if ((process.env.BIGQUERY_AUTH_MODE || "").toLowerCase() === "adc") return adcAccessToken();

  const account = serviceAccount();
  if (account?.clientEmail && account.privateKey) return serviceAccountAccessToken(account);

  return adcAccessToken();
};

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
    const session = await readSession(request.headers.get("cookie"));
    if (!session) return json({ error: "Sesion requerida." }, { status: 401 });
    if (!isAdminRole(session.role)) return json({ error: "Acceso restringido a administradores." }, { status: 403 });

    const limitParam = new URL(request.url).searchParams.get("limit");
    const configuredMax = Number(process.env.BIGQUERY_USERS_MAX_ROWS ?? 50000);
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
    return json({ error: error instanceof Error ? error.message : "Error desconocido leyendo usuarios." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await readSession(request.headers.get("cookie"));
    if (!session) return json({ error: "Sesion requerida." }, { status: 401 });
    if (!isAdminRole(session.role)) return json({ error: "Acceso restringido a administradores." }, { status: 403 });

    const body = await request.json() as {
      keyColumn?: string;
      keyValue?: unknown;
      rol?: unknown;
      activo?: unknown;
    };
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
        parameter("rol", fieldType(fields, roleColumn), body.rol ?? ""),
        parameter("activo", fieldType(fields, activeColumn), typedActiveValue(body.activo, fieldType(fields, activeColumn))),
        parameter("keyValue", fieldType(fields, allowedKey), body.keyValue),
      ],
    );

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error desconocido actualizando usuario." }, { status: 500 });
  }
}
