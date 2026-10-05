export const runtime = "nodejs";

export async function GET() {
  const googleLoginDisabled = process.env.DISABLE_GOOGLE_LOGIN === "true";

  return Response.json(
    {
      googleClientId: googleLoginDisabled
        ? ""
        : process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
