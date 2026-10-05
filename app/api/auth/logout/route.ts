import { clearSessionCookie } from "../../_shared/session";

export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": clearSessionCookie(),
      },
    },
  );
}
