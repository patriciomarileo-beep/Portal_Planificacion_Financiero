import { requireAuth } from "../../_shared/auth";
import { errorResponse, HttpError, json } from "../../_shared/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { return json({ user: await requireAuth(request) }); }
  catch (error) {
    if (error instanceof HttpError && error.status === 401) return json({ user: null });
    return errorResponse(error, "auth.session");
  }
}
