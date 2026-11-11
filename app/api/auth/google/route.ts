import { OAuth2Client } from "google-auth-library";
import { createSessionCookie } from "../../_shared/session";
import { activeUser } from "../../_shared/auth";
import { errorResponse, HttpError, json, readJson, requireSameOrigin } from "../../_shared/http";
export const runtime = "nodejs";
const client = new OAuth2Client();
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
    if (!clientId || process.env.DISABLE_GOOGLE_LOGIN === "true") throw new HttpError(503, "El acceso no está disponible temporalmente.");
    const body = await readJson(request);
    const credential = body && typeof body === "object" && "credential" in body ? body.credential : null;
    if (typeof credential !== "string" || credential.length < 20 || credential.length > 12000) throw new HttpError(400, "Credencial inválida.");
    let token;
    try {
      // The official verifier checks the signature, audience, issuer and expiry.
      token = (await client.verifyIdToken({ idToken: credential, audience: clientId })).getPayload();
    } catch { throw new HttpError(401, "Google no pudo validar la credencial."); }
    const email = String(token?.email ?? "").toLowerCase();
    if (!token?.sub || token.email_verified !== true || token.hd !== "forus.cl" || !/^[^\s@]+@forus\.cl$/.test(email)) throw new HttpError(403, "Debes usar tu cuenta corporativa de Google habilitada.");
    const user = await activeUser(email);
    if (!user) throw new HttpError(403, "La cuenta no está habilitada para acceder.");
    return json({ user }, { headers: { "set-cookie": await createSessionCookie(user) } });
  } catch (error) { return errorResponse(error, "auth.google"); }
}
