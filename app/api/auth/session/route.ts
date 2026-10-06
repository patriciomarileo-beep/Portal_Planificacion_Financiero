import { readSession } from "../../_shared/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await readSession(request.headers.get("cookie"));
  return Response.json(
    { user: session ? { email: session.email, name: session.name, role: session.role, personId: session.personId } : null },
    { headers: { "cache-control": "no-store" } },
  );
}
