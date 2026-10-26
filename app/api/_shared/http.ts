export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const json = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "private, no-store");
  return Response.json(body, { ...init, headers });
};

export const reportError = (error: unknown, context: string) => {
  const errorId = crypto.randomUUID();
  // Never log request bodies, cookies or tokens.
  console.error(JSON.stringify({ errorId, context, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : "Unknown error" }));
  return errorId;
};

export const errorResponse = (error: unknown, context: string) => {
  if (error instanceof HttpError) return json({ error: error.message }, { status: error.status });
  return json({ error: "No fue posible completar la operación.", errorId: reportError(error, context) }, { status: 500 });
};

export const requireSameOrigin = (request: Request) => {
  const expected = process.env.APP_ORIGIN?.trim() || (process.env.NODE_ENV !== "production" ? new URL(request.url).origin : "");
  if (!expected) throw new HttpError(503, "El acceso no está disponible temporalmente.");
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(expected).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Origen de solicitud no permitido.");
};

export const readJson = async (request: Request, maxBytes = 16_384): Promise<unknown> => {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new HttpError(415, "Se requiere JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Solicitud inválida.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) { await reader.cancel(); throw new HttpError(413, "Solicitud demasiado grande."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "JSON inválido.");
  } finally { reader.releaseLock(); }
};
