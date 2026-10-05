export type AuthSession = {
  email: string;
  name: string;
  role: string;
  personId: string;
  exp: number;
};

const cookieName = "forus_auth";
const maxAgeSeconds = 60 * 60 * 8;

const textEncoder = new TextEncoder();

const base64Url = (bytes: ArrayBuffer | Uint8Array | string) => {
  const binary = typeof bytes === "string"
    ? bytes
    : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
};

const sessionSecret = () => {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Configura AUTH_SESSION_SECRET con al menos 32 caracteres.");
  }
  return secret;
};

const signingKey = async () =>
  crypto.subtle.importKey(
    "raw",
    textEncoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

const signatureFor = async (payload: string) =>
  base64Url(await crypto.subtle.sign("HMAC", await signingKey(), textEncoder.encode(payload)));

export const createSessionCookie = async (session: Omit<AuthSession, "exp">) => {
  const payload = base64Url(JSON.stringify({
    ...session,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }));
  const signature = await signatureFor(payload);
  return `${cookieName}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
};

export const clearSessionCookie = () =>
  `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export const readSession = async (cookieHeader: string | null) => {
  const match = cookieHeader?.match(new RegExp(`(?:^|; )${cookieName}=([^;]+)`));
  if (!match) return null;
  const [payload, signature] = match[1].split(".");
  if (!payload || !signature) return null;
  const expected = await signatureFor(payload);
  if (signature !== expected) return null;

  const session = JSON.parse(fromBase64Url(payload)) as AuthSession;
  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
  return session;
};
