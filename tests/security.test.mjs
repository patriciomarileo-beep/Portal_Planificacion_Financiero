import assert from "node:assert/strict";
import { test, afterEach, mock } from "node:test";
import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { NextRequest } from "next/server";
import { createSessionCookie, clearSessionCookie, readSession } from "../app/api/_shared/session";
import { requireAuth } from "../app/api/_shared/auth";
import { HttpError, readJson, requireSameOrigin } from "../app/api/_shared/http";
import { POST as emailLogin } from "../app/api/auth/email/route";
import { POST as googleLogin } from "../app/api/auth/google/route";
import { GET as imports } from "../app/api/importaciones-industria/route";
import { GET as countries } from "../app/api/country-profitability/route";
import { GET as users, PATCH as updateUser } from "../app/api/usuarios/route";
import { POST as ingest } from "../app/api/ingesta-bigquery/route";
import { GET as portalData } from "../app/api/portal-data/route";
import { GET as privateFile } from "../app/data/[...path]/route";
import { proxy } from "../proxy";
const originalEnv = { ...process.env };
afterEach(() => { mock.restoreAll(); for (const key of Object.keys(process.env))
    if (!(key in originalEnv))
        delete process.env[key]; Object.assign(process.env, originalEnv); });
const setup = () => Object.assign(process.env, { NODE_ENV: "production", AUTH_SESSION_SECRET: "test-only-" + "x".repeat(48), APP_ORIGIN: "https://portal.example.com", GOOGLE_OAUTH_CLIENT_ID: "test.apps.googleusercontent.com", DISABLE_GOOGLE_LOGIN: "false" });
const user = { email: "persona@forus.cl", name: "María Muñoz", role: "ADMINISTRADOR", personId: "42" };
const post = (path, body, cookie = "") => new Request("https://portal.example.com" + path, { method: "POST", headers: { origin: "https://portal.example.com", "content-type": "application/json", cookie }, body: JSON.stringify(body) });
const database = (role = "ADMINISTRADOR", active = true) => {
    mock.method(GoogleAuth.prototype, "getAccessToken", async () => "test-access-token");
    mock.method(globalThis, "fetch", async () => Response.json({ rows: active ? [{ f: ["42", "María", "Muñoz", "", role].map(v => ({ v })) }] : [] }));
};
test("email-only login is permanently disabled and never issues a cookie", async () => {
    setup();
    const result = await emailLogin();
    assert.equal(result.status, 410);
    assert.equal(result.headers.get("set-cookie"), null);
});
test("production cookies are Secure/HttpOnly and Unicode identities round-trip", async () => {
    setup();
    const cookie = await createSessionCookie(user);
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; HttpOnly/);
    assert.match(clearSessionCookie(), /; Secure/);
    assert.equal((await readSession(cookie))?.name, user.name);
});
test("tampered, malformed and extra-segment cookies fail closed", async () => {
    setup();
    const cookie = (await createSessionCookie(user)).split(";")[0];
    for (const value of [cookie.replace("=", "=x"), cookie + ".extra", "forus_auth=%%%.abc", "forus_auth=", "forus_auth=" + "a".repeat(5000)])
        assert.equal(await readSession(value), null);
});
test("expired and old email-login sessions are rejected even with a valid HMAC", async () => {
    setup();
    const sign = async (data) => {
        const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.AUTH_SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("base64url");
        return "forus_auth=" + payload + "." + sig;
    };
    const now = Math.floor(Date.now() / 1000);
    assert.equal(await readSession(await sign({ ...user, exp: now + 3600 })), null);
    assert.equal(await readSession(await sign({ ...user, version: 2, iat: now - 28801, exp: now - 1 })), null);
});
test("all sensitive handlers reject anonymous requests before reading source or fallback data", async () => {
    setup();
    mock.method(globalThis, "fetch", async () => { throw Error("must not call upstream"); });
    const request = new NextRequest("https://portal.example.com/api/importaciones-industria");
    for (const handler of [imports, countries, users, portalData]) {
        const result = await handler(request);
        assert.equal(result.status, 401);
        assert.equal((await result.json()).error, "Sesión requerida.");
    }
    assert.equal((await privateFile(request, { params: Promise.resolve({ path: ["profitability-channels.csv"] }) })).status, 401);
    assert.equal((await ingest(post("/api/ingesta-bigquery", {}))).status, 401);
});
test("role demotion and account deactivation override the role in existing cookies", async () => {
    setup();
    const cookie = await createSessionCookie(user);
    database("ANALISTA FINANCIERO");
    await assert.rejects(requireAuth(new Request("https://portal.example.com/api/usuarios", { headers: { cookie } }), true), (e) => e instanceof HttpError && e.status === 403);
    mock.restoreAll();
    database("ADMINISTRADOR", false);
    await assert.rejects(requireAuth(new Request("https://portal.example.com/api/usuarios", { headers: { cookie } })), (e) => e instanceof HttpError && e.status === 401);
});
test("missing OAuth audience configuration blocks login before token verification", async () => {
    setup();
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const verify = mock.method(OAuth2Client.prototype, "verifyIdToken", async () => { throw Error("must not verify"); });
    assert.equal((await googleLogin(post("/api/auth/google", { credential: "x".repeat(50) }))).status, 503);
    assert.equal(verify.mock.callCount(), 0);
});
test("Google verifier gets our audience and verified Workspace account is required", async () => {
    setup();
    database();
    let received;
    const verify = mock.method(OAuth2Client.prototype, "verifyIdToken", async (options) => { received = options; return { getPayload: () => ({ sub: "google-user", email: user.email, email_verified: true, hd: "forus.cl" }) }; });
    const result = await googleLogin(post("/api/auth/google", { credential: "x".repeat(50) }));
    assert.equal(result.status, 200);
    assert.equal(received.audience, process.env.GOOGLE_OAUTH_CLIENT_ID);
    assert.match(result.headers.get("set-cookie"), /Secure/);
    verify.mock.restore();
    mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({ getPayload: () => ({ sub: "google-user", email: user.email, email_verified: true }) }));
    assert.equal((await googleLogin(post("/api/auth/google", { credential: "x".repeat(50) }))).status, 403);
});
test("wrong audience, issuer, expired or invalid signatures rejected by verifier cannot issue a session", async () => {
    setup();
    mock.method(OAuth2Client.prototype, "verifyIdToken", async () => { throw Error("invalid token sentinel"); });
    const result = await googleLogin(post("/api/auth/google", { credential: "x".repeat(50) }));
    assert.equal(result.status, 401);
    assert.equal(result.headers.get("set-cookie"), null);
    assert.doesNotMatch(await result.text(), /sentinel/);
});
test("cross-origin writes and unconfigured production origins fail closed", async () => {
    setup();
    const req = post("/api/auth/google", {});
    req.headers.set("origin", "https://evil.example.com");
    assert.equal((await googleLogin(req)).status, 403);
    assert.equal((await updateUser(req)).status, 403);
    delete process.env.APP_ORIGIN;
    assert.throws(() => requireSameOrigin(post("/api/auth/google", {})), (e) => e instanceof HttpError && e.status === 503);
});
test("JSON validation limits actual streamed bytes, not Content-Length", async () => {
    await assert.rejects(readJson(post("/api/test", { data: "x".repeat(20000) })), (e) => e instanceof HttpError && e.status === 413);
    await assert.rejects(readJson(new Request("https://portal.example.com", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" })), (e) => e instanceof HttpError && e.status === 415);
});
test("upstream authorization failures never return financial fallbacks or internal messages", async () => {
    setup();
    const cookie = await createSessionCookie(user);
    database();
    mock.restoreAll();
    mock.method(GoogleAuth.prototype, "getAccessToken", async () => { throw Error("private-dataset-secret-sentinel"); });
    mock.method(console, "error", () => { });
    for (const handler of [imports, countries]) {
        const result = await handler(new NextRequest("https://portal.example.com/api/data", { headers: { cookie } }));
        assert.equal(result.status, 500);
        const text = await result.text();
        assert.doesNotMatch(text, /sentinel|countries|overview|forus_share/);
        assert.match(text, /errorId/);
    }
});
test("proxy blocks unknown APIs and data files by default, with security headers", async () => {
    setup();
    for (const path of ["/api/future-route", "/api/importaciones-industria", "/data/profitability-channels.csv"]) {
        const result = await proxy(new NextRequest("https://portal.example.com" + path));
        assert.equal(result.status, 401);
        assert.equal(result.headers.get("x-frame-options"), "DENY");
        assert.match(result.headers.get("strict-transport-security"), /63072000/);
        assert.match(result.headers.get("cache-control"), /no-store/);
    }
    const first = await proxy(new NextRequest("https://portal.example.com/"));
    const second = await proxy(new NextRequest("https://portal.example.com/"));
    assert.match(first.headers.get("content-security-policy"), /nonce-/);
    assert.notEqual(first.headers.get("content-security-policy"), second.headers.get("content-security-policy"));
});

test("private files remain readable after authorization and traversal is rejected", async () => {
  setup(); database();
  const cookie = await createSessionCookie(user);
  const request = new Request("https://portal.example.com/data/profitability-channels.csv", { headers: { cookie } });
  const allowed = await privateFile(request, { params: Promise.resolve({ path: ["profitability-channels.csv"] }) });
  assert.equal(allowed.status, 200); assert.match(allowed.headers.get("content-type"), /csv/); assert.ok((await allowed.text()).length > 1000);
  const denied = await privateFile(request, { params: Promise.resolve({ path: ["..", ".env.local"] }) });
  assert.equal(denied.status, 404);
});


test("active accounts without an application role are denied", async () => {
  setup();
  database("ROLE_NOT_APPROVED");
  const cookie = await createSessionCookie(user);
  await assert.rejects(requireAuth(new Request("https://portal.example.com/api/portal-data", { headers: { cookie } })), error => error instanceof HttpError && error.status === 401);
});

test("user administration rejects unknown roles, ambiguous active flags and compound keys", async () => {
  setup();
  database();
  const cookie = await createSessionCookie(user);
  const base = { keyColumn: "id_persona", keyValue: "42", rol: "ANALISTA FINANCIERO", activo: true };
  for (const body of [{ ...base, rol: "SUPERUSER" }, { ...base, activo: "false" }, { ...base, keyValue: { id: 42 } }, { ...base, rol: "" }]) {
    const request = new Request("https://portal.example.com/api/usuarios", { method: "PATCH", headers: { origin: "https://portal.example.com", "content-type": "application/json", cookie }, body: JSON.stringify(body) });
    const response = await updateUser(request);
    assert.equal(response.status, 400);
  }
});
