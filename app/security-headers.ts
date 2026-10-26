export const baselineHeaders = () => ({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  ...(process.env.NODE_ENV === "production" ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" } : {}),
});
export const contentSecurityPolicy = (nonce: string) => [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https://www.google.com https://accounts.google.com",
  "font-src 'self'",
  "connect-src 'self' https://accounts.google.com" + (process.env.NODE_ENV !== "production" ? " ws: wss:" : ""),
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");
