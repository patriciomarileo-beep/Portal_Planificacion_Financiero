import { localRuntimeEnv } from "./local-runtime-env.mjs";
import { spawn } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const localEnv = localRuntimeEnv();
const port = localEnv.PORT;
const hostname = localEnv.HOSTNAME;
const standaloneDir = join(process.cwd(), ".next", "standalone");
const staticSource = join(process.cwd(), ".next", "static");
const staticTarget = join(standaloneDir, ".next", "static");
const publicSource = join(process.cwd(), "public");
const publicTarget = join(standaloneDir, "public");

if (!existsSync(join(standaloneDir, "server.js"))) {
  console.error("No existe .next/standalone/server.js. Ejecuta npm run build:cloudrun antes de levantar.");
  process.exit(1);
}

for (const [source, target] of [[staticSource, staticTarget], [publicSource, publicTarget]]) {
  // Refresh generated assets so older builds cannot retain public financial data.
  const resolved = resolve(target);
  if (!resolved.startsWith(resolve(standaloneDir) + sep)) throw new Error("Unexpected standalone output path.");
  rmSync(resolved, { recursive: true, force: true });
  if (existsSync(source)) cpSync(source, resolved, { recursive: true, force: true });
}

const child = spawn(process.execPath, ["server.js"], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: {
    ...localEnv,
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
