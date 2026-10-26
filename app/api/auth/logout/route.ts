import { clearSessionCookie } from "../../_shared/session";
import { errorResponse, json, requireSameOrigin } from "../../_shared/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
  } catch (error) { return errorResponse(error, "auth.logout"); }
}
