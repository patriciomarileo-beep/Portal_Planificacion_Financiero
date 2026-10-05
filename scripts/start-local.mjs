import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const port = process.env.PORT || "3000";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const standaloneDir = join(process.cwd(), ".next", "standalone");
const staticSource = join(process.cwd(), ".next", "static");
const staticTarget = join(standaloneDir, ".next", "static");
const publicSource = join(process.cwd(), "public");
const publicTarget = join(standaloneDir, "public");

if (!existsSync(join(standaloneDir, "server.js"))) {
  console.error("No existe .next/standalone/server.js. Ejecuta npm run build:cloudrun antes de levantar.");
  process.exit(1);
}

if (existsSync(staticSource)) {
  cpSync(staticSource, staticTarget, { recursive: true, force: true });
}

if (existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { recursive: true, force: true });
}

const child = spawn(process.execPath, ["server.js"], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
