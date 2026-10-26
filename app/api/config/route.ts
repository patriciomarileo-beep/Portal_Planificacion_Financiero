export const runtime = "nodejs";
export async function GET() {
  return Response.json({ googleClientId: process.env.DISABLE_GOOGLE_LOGIN === "true" ? "" : (process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim() }, { headers: { "cache-control": "no-store" } });
}
