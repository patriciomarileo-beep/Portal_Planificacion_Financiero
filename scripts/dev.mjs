import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let bigQueryAccessToken = process.env.BIGQUERY_ACCESS_TOKEN || "";
const localAdc = (process.env.BIGQUERY_AUTH_MODE || "").toLowerCase() === "local-adc";
const refreshLocalToken = () => {
  try {
    return process.platform === "win32"
      ? execFileSync("cmd.exe", ["/d", "/s", "/c", "gcloud.cmd auth application-default print-access-token"], { encoding: "utf8", windowsHide: true }).trim()
      : execFileSync("gcloud", ["auth", "application-default", "print-access-token"], { encoding: "utf8" }).trim();
  } catch {
    console.warn("BigQuery no pudo renovar ADC; el portal iniciará con los respaldos locales disponibles.");
    return "";
  }
};
if (localAdc) {
  bigQueryAccessToken = refreshLocalToken();
}

if (bigQueryAccessToken) {
  const envPath = join(process.cwd(), ".env.local");
  const current = readFileSync(envPath, "utf8");
  const next = `${current.replace(/^BIGQUERY_ACCESS_TOKEN=.*(?:\r?\n|$)/m, "").trimEnd()}\nBIGQUERY_ACCESS_TOKEN=${bigQueryAccessToken}\n`;
  writeFileSync(envPath, next, "utf8");
}

if (localAdc) setInterval(() => {
  const refreshed = refreshLocalToken();
  if (!refreshed) return;
  const envPath = join(process.cwd(), ".env.local");
  const current = readFileSync(envPath, "utf8");
  writeFileSync(envPath, `${current.replace(/^BIGQUERY_ACCESS_TOKEN=.*(?:\r?\n|$)/m, "").trimEnd()}\nBIGQUERY_ACCESS_TOKEN=${refreshed}\n`, "utf8");
}, 45 * 60 * 1000).unref();

const requestedHost = new URL(process.env.APP_ORIGIN || "http://localhost:3000").hostname;
const host = requestedHost === "localhost" ? "localhost" : "127.0.0.1";
const child = spawn(process.execPath, [join(process.cwd(), "node_modules", "vinext", "dist", "cli.js"), "dev", "--host", host, "--port", process.env.PORT || "3000"], {
  stdio: "inherit",
  env: { ...process.env, XDG_CONFIG_HOME: join(process.cwd(), ".wrangler-config"), BIGQUERY_ACCESS_TOKEN: bigQueryAccessToken },
});
child.on("exit", (code, signal) => signal ? process.kill(process.pid, signal) : process.exit(code ?? 1));
