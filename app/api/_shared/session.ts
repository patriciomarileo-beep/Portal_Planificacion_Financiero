export type AuthSession = {
  email: string;
  name: string;
  role: string;
  personId: string;
  iat: number;
  exp: number;
  version: 2;
};
const cookieName = "forus_auth";
const maxAgeSeconds = 60 * 60 * 8;
const encoder = new TextEncoder();
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
const signingKey = async () => {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32 || /change-me|replace-me/i.test(secret)) throw new Error("AUTH_SESSION_SECRET must contain at least 32 random characters.");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
};
const cookieAttributes = () => `Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
export const createSessionCookie = async (session: Pick<AuthSession, "email" | "name" | "role" | "personId">) => {
  const iat = Math.floor(Date.now() / 1000);
  const payload = encode(encoder.encode(JSON.stringify({ ...session, iat, exp: iat + maxAgeSeconds, version: 2 })));
  const signature = encode(new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload))));
  return `${cookieName}=${payload}.${signature}; ${cookieAttributes()}; Max-Age=${maxAgeSeconds}`;
};
export const clearSessionCookie = () => `${cookieName}=; ${cookieAttributes()}; Max-Age=0`;
export const readSession = async (cookieHeader: string | null): Promise<AuthSession | null> => {
  const value = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!value || value.length > 4096) return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const [payload, signature] = parts;
    const signatureBytes = decode(signature);
    if (signatureBytes.length !== 32) return null;
    if (!await crypto.subtle.verify("HMAC", await signingKey(), signatureBytes, encoder.encode(payload))) return null;
    const session = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decode(payload))) as AuthSession;
    const now = Math.floor(Date.now() / 1000);
    // Invalidate all sessions issued by the retired email-only login.
    if (session.version !== 2 || !Number.isInteger(session.iat) || !Number.isInteger(session.exp) || session.iat > now || session.exp <= now || session.exp - session.iat !== maxAgeSeconds) return null;
    if (![session.email, session.name, session.role, session.personId].every((field) => typeof field === "string" && field.length > 0 && field.length <= 500)) return null;
    if (!/^[^\s@]+@forus\.cl$/.test(session.email)) return null;
    return session;
  } catch { return null; }
};
