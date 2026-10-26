import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "./app/api/_shared/session";
import { baselineHeaders, contentSecurityPolicy } from "./app/security-headers";
import { requireSameOrigin, errorResponse } from "./app/api/_shared/http";
const publicApi = new Set(["/api/config", "/api/auth/google", "/api/auth/email", "/api/auth/session", "/api/auth/logout", "/api/market-indicators", "/api/dollar-history"]);
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const secure = (response: Response) => {
    for (const [key, value] of Object.entries(baselineHeaders())) response.headers.set(key, value);
    response.headers.set("Content-Security-Policy", csp);
    if (request.nextUrl.pathname.startsWith("/api/") && !["/api/market-indicators", "/api/dollar-history"].includes(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith("/data/") || request.nextUrl.pathname === "/") response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method) && path.startsWith("/api/") && path !== "/api/auth/email") {
    try { requireSameOrigin(request); } catch (error) { return secure(errorResponse(error, "proxy.origin")); }
  }
  if ((path.startsWith("/api/") && !publicApi.has(path)) || path.startsWith("/data/")) {
    if (!await readSession(request.headers.get("cookie"))) return secure(NextResponse.json({ error: "Sesión requerida." }, { status: 401 }));
  }
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  return secure(NextResponse.next({ request: { headers } }));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
