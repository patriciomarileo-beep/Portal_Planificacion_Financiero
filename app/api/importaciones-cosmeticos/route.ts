import { requireMenuAuth } from "../_shared/auth";
import { cosmeticsReport } from "../_shared/cosmetics-imports";
import { errorResponse, json } from "../_shared/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireMenuAuth(request, "mercado");
    return json(await cosmeticsReport(new URL(request.url).searchParams));
  } catch (error) {
    return errorResponse(error, "imports.cosmetics");
  }
}
