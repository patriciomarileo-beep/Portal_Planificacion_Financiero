import { reportError } from "../_shared/http";
import { loadDollarHistory } from "../_shared/dollar-history";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await loadDollarHistory(), {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    const errorId = reportError(error, "dollar-history");
    return Response.json({ error: "La fuente del dólar observado no está disponible. Intenta nuevamente.", errorId }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
