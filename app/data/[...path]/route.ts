import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { requireAuth } from "../../api/_shared/auth";
import { errorResponse, HttpError } from "../../api/_shared/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    await requireAuth(request);
    const { path } = await context.params;
    if (!path.length || path.some((part) => !/^[\w. -]+$/.test(part) || part === "." || part === "..")) throw new HttpError(404, "Archivo no encontrado.");
    const root = resolve(process.cwd(), "private-data/assets");
    const file = resolve(root, ...path);
    if (!file.startsWith(root + sep)) throw new HttpError(404, "Archivo no encontrado.");
    let bytes;
    try { bytes = await readFile(file); } catch { throw new HttpError(404, "Archivo no encontrado."); }
    return new Response(bytes, { headers: { "content-type": file.endsWith(".pdf") ? "application/pdf" : "text/csv; charset=utf-8", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (error) { return errorResponse(error, "data-file"); }
}
