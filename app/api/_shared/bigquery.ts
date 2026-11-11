import { GoogleAuth } from "google-auth-library";
export type BigQueryField = {
  name: string;
  type: string;
  fields?: BigQueryField[];
};

export type QueryParameter = {
  name: string;
  parameterType: { type: string };
  parameterValue: { value: string };
};

export type BigQueryRowsPayload = {
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

type RunQueryOptions = {
  paginate?: boolean;
  pageSize?: number;
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

const splitTable = (tableId: string) => {
  const parts = tableId.split(".");
  if (parts.length !== 3) throw new Error("BIGQUERY_TABLE debe tener formato project.dataset.table.");
  return { projectId: parts[0] };
};

export const validatedTablePath = (table: string) => {
  if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/.test(table)) throw new Error("Invalid BigQuery table identifier.");
  return table;
};
export const tablePath = () => validatedTablePath(process.env.BIGQUERY_TABLE || defaultTable);

const configuredProjectId = () => process.env.BIGQUERY_PROJECT_ID || splitTable(tablePath()).projectId;

const bigQueryOrigins = new Set(["https://bigquery.googleapis.com"]);

export const bigQueryQueryUrl = (projectId: string, jobId?: string) => {
  // Only path segments may vary; neither configuration nor job metadata can set the origin.
  const url = new URL("https://bigquery.googleapis.com");
  url.pathname = `/bigquery/v2/projects/${encodeURIComponent(projectId)}/queries${jobId ? `/${encodeURIComponent(jobId)}` : ""}`;
  return url;
};

export const fetchBigQuery = async (url: URL, options: RequestInit) => {
  // Validate the destination before attaching credentials. `manual` prevents
  // following redirects and is supported by both Node and the Vinext runtime.
  if (bigQueryOrigins.has(url.origin)) {
    return fetch(url, { ...options, redirect: "manual" });
  }
  throw new Error("Destino BigQuery no permitido.");
};

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
  return { clientEmail, privateKey };
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

const readApplicationDefaultCredential = async (localOnly = false) => {
  // En desarrollo, el ADC renovable del equipo debe prevalecer sobre cualquier
  // snapshot serializado en .env.local, que puede expirar con invalid_rapt.
  const localBase64 = process.env.BIGQUERY_LOCAL_ADC_JSON_BASE64;
  if (!localOnly) {
    const inlineBase64 = process.env.BIGQUERY_ADC_JSON_BASE64;
    if (inlineBase64) {
      const decoded = new TextDecoder().decode(
        Uint8Array.from(atob(inlineBase64), (character) => character.charCodeAt(0)),
      );
      return JSON.parse(decoded) as ServiceAccountCredential | AuthorizedUserCredential;
    }

    const inline = process.env.BIGQUERY_ADC_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (inline) return JSON.parse(inline) as ServiceAccountCredential | AuthorizedUserCredential;
  }

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

  if (localOnly && localBase64) {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(localBase64), (character) => character.charCodeAt(0)),
    );
    return JSON.parse(decoded) as ServiceAccountCredential | AuthorizedUserCredential;
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
  const label = "PRIVATE KEY";
  const begin = `-----BEGIN ${label}-----`, end = `-----END ${label}-----`;
  const normalized = pem
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r");
  if (!normalized.includes(begin)) {
    throw new Error("BIGQUERY_PRIVATE_KEY debe ser una llave PEM de cuenta de servicio, no una password de usuario.");
  }
  const cleaned = normalized
    .replaceAll(begin, "")
    .replaceAll(end, "")
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
    scope: [
      "https://www.googleapis.com/auth/bigquery",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ].join(" "),
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

const adcAccessToken = async (localOnly = false) => {
  const credential = await readApplicationDefaultCredential(localOnly);
  if (credential.type === "authorized_user") return authorizedUserAccessToken(credential);
  if (credential.type === "service_account") {
    return serviceAccountAccessToken({
      clientEmail: String((credential as ServiceAccountCredential).client_email ?? ""),
      privateKey: String((credential as ServiceAccountCredential).private_key ?? ""),
    });
  }
  throw new Error(`Tipo de credencial ADC no soportado: ${credential.type ?? "desconocido"}. Usa gcloud auth application-default login o una cuenta de servicio.`);
};

// Reuse the SDK client so it can retain and refresh its short-lived access token.
// Application permissions are still checked in BigQuery on every request.
let productionAuth: GoogleAuth | undefined;

export const googleAccessToken = async (preferAdc = false) => {
  if (process.env.NODE_ENV === "production") {
    // Use the attached service account / Workload Identity, never serialized user ADC.
    productionAuth ??= new GoogleAuth({
      projectId: configuredProjectId(),
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
    const token = await productionAuth.getAccessToken();
    if (!token) throw new Error("Cloud credentials unavailable.");
    return token;
  }
  if (preferAdc) return adcAccessToken();
  const authMode = (process.env.BIGQUERY_AUTH_MODE || "").toLowerCase();
  // Los modos explícitos deben prevalecer sobre BIGQUERY_ACCESS_TOKEN, porque
  // ese token es sólo un respaldo temporal y expira aproximadamente en una hora.
  if (authMode === "local-adc") {
    try {
      return await adcAccessToken(true);
    } catch (error) {
      // Vinext's local worker cannot always read the host ADC file. The dev
      // launcher injects a short-lived token and renews it every 45 minutes.
      if (process.env.BIGQUERY_ACCESS_TOKEN) return process.env.BIGQUERY_ACCESS_TOKEN;
      throw error;
    }
  }
  if (authMode === "adc") return adcAccessToken();

  if (process.env.BIGQUERY_ACCESS_TOKEN) return process.env.BIGQUERY_ACCESS_TOKEN;

  const account = serviceAccount();
  if (account?.clientEmail && account.privateKey) return serviceAccountAccessToken(account);

  return adcAccessToken();
};

export const runQuery = async <T,>(
  query: string,
  queryParameters: QueryParameter[] = [],
  options: RunQueryOptions = {},
) => {
  const token = await googleAccessToken();
  const projectId = configuredProjectId();
  const pageSize = Math.min(Math.max(Math.trunc(options.pageSize ?? 10000), 1), 10000);
  const response = await fetchBigQuery(bigQueryQueryUrl(projectId), {
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
      ...(options.paginate ? { maxResults: pageSize } : {}),
    }),
  });
  const payload = await response.json() as T & BigQueryRowsPayload & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "Error ejecutando consulta BigQuery.");
  if (!options.paginate || !payload.pageToken) return payload;

  const jobId = payload.jobReference?.jobId;
  if (!jobId) throw new Error("BigQuery devolvio una pagina parcial sin jobId para continuar.");

  const rows = [...(payload.rows ?? [])];
  const location = payload.jobReference?.location;
  const seenTokens = new Set<string>();
  let pageToken: string | undefined = payload.pageToken;

  while (pageToken) {
    if (seenTokens.has(pageToken)) throw new Error("BigQuery repitio un pageToken durante la paginacion.");
    seenTokens.add(pageToken);

    const params = new URLSearchParams({
      pageToken,
      maxResults: String(pageSize),
      // BigQuery region is a query parameter, never an HTTP Location header.
      ...(location ? { location } : {}),
    });
    const pageUrl = bigQueryQueryUrl(projectId, jobId);
    pageUrl.search = params.toString();
    const pageResponse = await fetchBigQuery(
      pageUrl,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const page = await pageResponse.json() as BigQueryRowsPayload & { error?: { message?: string } };
    if (!pageResponse.ok) throw new Error(page.error?.message || "Error leyendo pagina BigQuery.");

    rows.push(...(page.rows ?? []));
    pageToken = page.pageToken;
  }

  return {
    ...payload,
    rows,
    pageToken: undefined,
  };
};

export const parameter = (name: string, type: string, value: unknown): QueryParameter => ({
  name,
  parameterType: { type: type === "INTEGER" ? "INT64" : type === "FLOAT" ? "FLOAT64" : type },
  parameterValue: { value: value === null || value === undefined ? "" : String(value) },
});
