import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (error) {
    if (specifier.startsWith(".")) {
      for (const extension of [".ts", ".tsx", "/index.ts"]) {
        const url = new URL(specifier + extension, context.parentURL);
        if (existsSync(url)) return { url: url.href, shortCircuit: true };
      }
    } else if (!specifier.startsWith("node:")) {
      try { return { url: pathToFileURL(createRequire(context.parentURL).resolve(specifier)).href, shortCircuit: true }; } catch { /* original error below */ }
    }
    throw error;
  }
}
export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await readFile(new URL(url), "utf8");
    return { format: "module", source: ts.transpileModule(source, { fileName: fileURLToPath(url), compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
  }
  if (url.endsWith(".json")) return { format: "module", source: "export default " + await readFile(new URL(url), "utf8"), shortCircuit: true };
  return nextLoad(url, context);
}
