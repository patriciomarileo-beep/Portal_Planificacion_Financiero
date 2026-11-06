import assert from "node:assert/strict";
import { test, afterEach, mock } from "node:test";
import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { NextRequest } from "next/server";
import { createSessionCookie, clearSessionCookie, readSession } from "../app/api/_shared/session";
import { requireAuth, requireMenuAuth } from "../app/api/_shared/auth";
import { canAccessMenu, menusForRole, portalMenus } from "../app/menu-access";
import { HttpError, readJson, requireSameOrigin } from "../app/api/_shared/http";
import { POST as emailLogin } from "../app/api/auth/email/route";
import { POST as googleLogin } from "../app/api/auth/google/route";
import { GET as imports } from "../app/api/importaciones-industria/route";
import { GET as cosmetics } from "../app/api/importaciones-cosmeticos/route";
import { GET as countries } from "../app/api/country-profitability/route";
import { GET as consolidatedKpis } from "../app/api/kpi-consolidado/route";
import { GET as salesMargin } from "../app/api/sales-margin/route";
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
const catalogRoles = ["SIN ROL", "ADMINISTRADOR", "ANALISTA FINANCIERO", "PLANIFICADOR FINANCIERO", "COMEX"];
const database = (role = "ADMINISTRADOR", active = true, roles = catalogRoles) => {
    mock.method(GoogleAuth.prototype, "getAccessToken", async () => "test-access-token");
    return mock.method(globalThis, "fetch", async (_url, options) => {
        if (String(_url).startsWith("https://www.googleapis.com/oauth2/v1/certs?")) return Response.json({ "rotated-key": "test-certificate" });
        const query = JSON.parse(options.body).query;
        if (query.includes("ft_cl_planificacion_TB_ROLES_PLT_FINAN")) return Response.json({ rows: roles.map(v => ({ f: [{ v }] })) });
        if (query.startsWith("SELECT id_persona")) return Response.json({ rows: active ? [{ f: ["42", "María", "Muñoz", "", role].map(v => ({ v })) }] : [] });
        if (query.startsWith("SELECT *")) return Response.json({
            schema: { fields: [{ name: "id_persona", type: "INTEGER" }, { name: "rol", type: "STRING" }, { name: "activo", type: "BOOLEAN" }] },
            rows: [{ f: ["42", role, "true"].map(v => ({ v })) }],
        });
        if (query.startsWith("UPDATE")) return Response.json({ numDmlAffectedRows: "1" });
        throw Error("Unexpected database query in test");
    });
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
    for (const handler of [imports, cosmetics, countries, consolidatedKpis, salesMargin, users, portalData]) {
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
test("Google verifier refreshes cached certificates once after a signing-key rotation", async () => {
    setup();
    database();
    const verify = mock.method(OAuth2Client.prototype, "verifyIdToken", async () => {
        throw Error('No pem found for envelope: {"kid":"rotated-key"}');
    });
    const verifyWithFreshCertificates = mock.method(OAuth2Client.prototype, "verifySignedJwtWithCertsAsync", async (_credential, certificates, audience, issuers) => {
        assert.equal(certificates["rotated-key"], "test-certificate");
        assert.equal(audience, process.env.GOOGLE_OAUTH_CLIENT_ID);
        assert.deepEqual(issuers, ["accounts.google.com", "https://accounts.google.com", "googleapis.com"]);
        return { getPayload: () => ({ sub: "google-user", email: user.email, email_verified: true, hd: "forus.cl" }) };
    });
    const result = await googleLogin(post("/api/auth/google", { credential: "x".repeat(50) }));
    assert.equal(result.status, 200);
    assert.equal(verify.mock.callCount(), 1);
    assert.equal(verifyWithFreshCertificates.mock.callCount(), 1);
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
  for (const body of [{ ...base, rol: "SUPERUSER" }, { ...base, activo: "false" }, { ...base, keyValue: { id: 42 } }, { ...base, rol: "" }, { ...base, rol: "SIN ROL" }]) {
    const request = new Request("https://portal.example.com/api/usuarios", { method: "PATCH", headers: { origin: "https://portal.example.com", "content-type": "application/json", cookie }, body: JSON.stringify(body) });
    const response = await updateUser(request);
    assert.equal(response.status, 400);
  }
});

test("user administration loads its role options from the BigQuery catalog", async () => {
  setup();
  const roles = [...catalogRoles, "TESORERIA"];
  database("ADMINISTRADOR", true, roles);
  const cookie = await createSessionCookie(user);
  const response = await users(new Request("https://portal.example.com/api/usuarios", { headers: { cookie } }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.roleOptions, roles);
  assert.equal(payload.roleColumn, "rol");
  assert.equal(payload.rows[0].data.rol, "ADMINISTRADOR");
});

test("catalog roles can be assigned and removing one blocks subsequent updates", async () => {
  setup();
  const roles = [...catalogRoles, "TESORERIA"];
  const upstream = database("ADMINISTRADOR", true, roles);
  const cookie = await createSessionCookie(user);
  const patch = (rol, activo = true) => new Request("https://portal.example.com/api/usuarios", {
    method: "PATCH", headers: { origin: "https://portal.example.com", "content-type": "application/json", cookie },
    body: JSON.stringify({ keyColumn: "id_persona", keyValue: "42", rol, activo }),
  });
  assert.equal((await updateUser(patch(" tesoreria "))).status, 200);
  const updates = () => upstream.mock.calls.map(call => JSON.parse(call.arguments[1].body)).filter(body => body.query.startsWith("UPDATE"));
  assert.equal(updates()[0].queryParameters.find(parameter => parameter.name === "rol").parameterValue.value, "TESORERIA");
  roles.pop();
  assert.equal((await updateUser(patch("TESORERIA"))).status, 400);
  assert.equal(updates().length, 1);
  assert.equal((await updateUser(patch("SIN ROL", false))).status, 200);
});

test("COMEX retains its session while SIN ROL grants no access", async () => {
  setup();
  database("COMEX");
  const cookie = await createSessionCookie(user);
  const request = new Request("https://portal.example.com/api/usuarios", { headers: { cookie } });
  assert.equal((await requireAuth(request)).role, "COMEX");
  await assert.rejects(requireAuth(request, true), error => error instanceof HttpError && error.status === 403);
  mock.restoreAll();
  database("SIN ROL");
  await assert.rejects(requireAuth(request), error => error instanceof HttpError && error.status === 401);
});

const expectedMenus = {
  "SIN ROL": [],
  "ADMINISTRADOR": ["home", "sales-margin", "toolbox", "forecast", "mercado", "comex", "kpi", "users"],
  "ANALISTA FINANCIERO": ["home", "sales-margin", "forecast", "mercado", "kpi"],
  "PLANIFICADOR FINANCIERO": ["home", "sales-margin", "toolbox", "forecast", "mercado", "comex", "kpi"],
  "COMEX": ["comex"],
};

for (const [role, allowed] of Object.entries(expectedMenus)) {
  test(`${role} receives exactly its permitted menus and server access`, async () => {
    setup();
    database(role);
    assert.deepEqual(menusForRole(role), allowed);
    assert.deepEqual(menusForRole(` ${role.toLowerCase()} `), allowed);
    // An older administrator cookie must never override the current database role.
    const cookie = await createSessionCookie(user);
    const request = new Request("https://portal.example.com/api/data", { headers: { cookie } });
    for (const menu of portalMenus) {
      assert.equal(canAccessMenu(role, menu), allowed.includes(menu));
      if (allowed.includes(menu)) assert.equal((await requireMenuAuth(request, menu)).role, role);
      else await assert.rejects(requireMenuAuth(request, menu), error => error instanceof HttpError && error.status === (role === "SIN ROL" ? 401 : 403));
    }
  });
}

test("roles without an explicit menu policy grant no access even if present in the catalog", async () => {
  setup();
  database("TESORERIA", true, [...catalogRoles, "TESORERIA"]);
  assert.deepEqual(menusForRole("TESORERIA"), []);
  const cookie = await createSessionCookie(user);
  await assert.rejects(requireAuth(new Request("https://portal.example.com/api/data", { headers: { cookie } })), error => error.status === 401);
});

test("COMEX cannot read financial or market endpoints, private files or write planning entries", async () => {
  setup();
  const upstream = database("COMEX");
  const cookie = await createSessionCookie(user);
  const request = new NextRequest("https://portal.example.com/api/data", { headers: { cookie } });
  for (const handler of [imports, cosmetics, countries, salesMargin, users, portalData]) {
    const response = await handler(request);
    assert.equal(response.status, 403);
    assert.doesNotMatch(await response.text(), /overview|countries|baseConsolidada|roleOptions/);
  }
  for (const path of [["profitability-channels.csv"], ["market", "national-source.csv"]]) {
    assert.equal((await privateFile(request, { params: Promise.resolve({ path }) })).status, 403);
  }
  assert.equal((await ingest(post("/api/ingesta-bigquery", {}, cookie))).status, 403);
  // Rejected requests only read the account and role catalog, never report data.
  assert.ok(upstream.mock.calls.every(call => {
    const query = JSON.parse(call.arguments[1].body).query;
    return query.startsWith("SELECT id_persona") || query.includes("ft_cl_planificacion_TB_ROLES_PLT_FINAN");
  }));
});

test("analysts cannot write Toolbox entries and planners cannot administer users", async () => {
  setup();
  database("ANALISTA FINANCIERO");
  const cookie = await createSessionCookie(user);
  assert.equal((await ingest(post("/api/ingesta-bigquery", {}, cookie))).status, 403);
  assert.equal((await portalData(new Request("https://portal.example.com/api/portal-data", { headers: { cookie } }))).status, 200);
  mock.restoreAll();
  database("PLANIFICADOR FINANCIERO");
  assert.equal((await users(new Request("https://portal.example.com/api/usuarios", { headers: { cookie } }))).status, 403);
  const patch = new Request("https://portal.example.com/api/usuarios", { method: "PATCH", headers: { origin: "https://portal.example.com", "content-type": "application/json", cookie }, body: "{}" });
  assert.equal((await updateUser(patch)).status, 403);
  // A planner reaches Toolbox input validation after passing authorization.
  assert.equal((await ingest(post("/api/ingesta-bigquery", {}, cookie))).status, 400);
});

test("an unavailable role catalog fails closed without using fixed role options", async () => {
  setup();
  const upstream = database();
  const cookie = await createSessionCookie(user);
  upstream.mock.mockImplementation(async (_url, options) => {
    if (JSON.parse(options.body).query.includes("ft_cl_planificacion_TB_ROLES_PLT_FINAN")) return Response.json({ error: { message: "catalog-unavailable-sentinel" } }, { status: 403 });
    return Response.json({ rows: [{ f: ["42", "María", "Muñoz", "", "ADMINISTRADOR"].map(v => ({ v })) }] });
  });
  const response = await users(new Request("https://portal.example.com/api/usuarios", { headers: { cookie } }));
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /sentinel|roleOptions/);
});
