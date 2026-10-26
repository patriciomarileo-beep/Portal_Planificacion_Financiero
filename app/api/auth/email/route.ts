// Email alone is never proof of identity, including in development.
export const runtime = "nodejs";
export async function POST() {
  return Response.json({ error: "Accede con tu cuenta corporativa de Google." },
    { status: 410, headers: { "cache-control": "no-store" } });
}
