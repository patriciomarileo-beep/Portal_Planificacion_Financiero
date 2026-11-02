import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
const listener = createServer();
await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const origin = "http://127.0.0.1:" + port;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], { env: { ...process.env, NODE_ENV: "production", AUTH_SESSION_SECRET: randomBytes(48).toString("base64url"), APP_ORIGIN: origin, GOOGLE_OAUTH_CLIENT_ID: "", NEXT_PUBLIC_GOOGLE_CLIENT_ID: "", DISABLE_GOOGLE_LOGIN: "true" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let diagnostics = "";
child.stdout.on("data", data => { diagnostics += data; });
child.stderr.on("data", data => { diagnostics += data; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(origin + "/api/config")).ok) { ready = true; break; } } catch { /* starting */ }
    if (child.exitCode !== null) throw Error("Server exited: " + diagnostics);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, "Server did not become ready");
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const html = await home.text();
  const csp = home.headers.get("content-security-policy");
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  assert.ok(nonce, "Missing CSP nonce");
  assert.ok(html.includes('name="csp-nonce" content="' + nonce + '"'), "Missing nonce metadata");
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
  assert.ok(scripts.length > 0);
  for (const script of scripts) assert.ok(script.includes('nonce="' + nonce + '"'), "Script missing CSP nonce: " + script);
  assert.doesNotMatch(html, /forus_share|valorProyectado/);
  assert.equal(home.headers.get("x-frame-options"), "DENY");
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  assert.equal(home.headers.get("x-powered-by"), null);
  for (const path of ["/api/portal-data", "/api/importaciones-industria", "/api/country-profitability", "/api/usuarios", "/api/new-sensitive-endpoint", "/data/profitability-channels.csv", "/data/market/national-source.csv", "/data/market/reports/IPoM-Septiembre-2026.pdf"]) {
    const result = await fetch(origin + path);
    assert.equal(result.status, 401, path); assert.match(result.headers.get("cache-control"), /no-store/);
  }
  const email = await fetch(origin + "/api/auth/email", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-host": "localhost" }, body: JSON.stringify({ email: "admin@forus.cl" }) });
  assert.equal(email.status, 410); assert.equal(email.headers.get("set-cookie"), null);
  const oauth = await fetch(origin + "/api/auth/google", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ credential: "x".repeat(50) }) });
  assert.equal(oauth.status, 503);
  const csrf = await fetch(origin + "/api/auth/google", { method: "POST", headers: { origin: "https://evil.example.com", "content-type": "application/json" }, body: "{}" });
  assert.equal(csrf.status, 403);
  console.log("Production HTTP checks passed: nonce/hydration scripts, security headers, private APIs/files, retired login and CSRF.");
} finally { child.kill(); }
