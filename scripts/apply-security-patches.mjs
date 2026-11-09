import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, relative, isAbsolute } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(new URL("../patches/braces-3.0.3-depth-guard.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));
const checkOnly = process.argv.includes("--check");
const hash = text => createHash("sha256").update(text).digest("hex");
const changes = [];
let packages = 0;
for (const packagePath of Object.keys(lock.packages).filter(path => /(^|\/)node_modules\/braces$/.test(path))) {
  const directory = resolve(root, packagePath);
  const inside = relative(root, directory);
  if (inside.startsWith("..") || isAbsolute(inside)) throw Error("Invalid dependency path.");
  if (!existsSync(directory)) continue; // npm ci --omit=dev does not install this tool.
  const metadata = JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8"));
  if (metadata.name !== manifest.package || metadata.version !== manifest.version) throw Error("Review the braces backport for the installed version before continuing.");
  packages++;
  for (const file of manifest.files) {
    const target = resolve(directory, file.path);
    let source = readFileSync(target, "utf8");
    if (hash(source) === file.afterSha256) continue;
    if (checkOnly || hash(source) !== file.beforeSha256) throw Error(`Unverified security patch state: ${packagePath}/${file.path}`);
    for (const { from, to } of file.replacements) {
      if (source.split(from).length !== 2) throw Error(`Security patch context mismatch: ${file.path}`);
      source = source.replace(from, to);
    }
    if (hash(source) !== file.afterSha256) throw Error(`Security patch checksum mismatch: ${file.path}`);
    changes.push({ target, source });
  }
}
// Validate every file before writing any change. Never download or execute code.
for (const { target, source } of changes) writeFileSync(target, source, "utf8");
console.log(`Braces depth guard ${checkOnly ? "verified" : "applied/verified"}: ${packages} installed package(s). Upstream package identity is preserved for security audits.`);
