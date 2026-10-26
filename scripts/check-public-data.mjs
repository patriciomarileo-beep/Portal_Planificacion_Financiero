import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const fingerprints = [];
for (const [file, name] of [["app/base-consolidada.ts", "baseConsolidada"], ["app/profitability/profitability-data.ts", "profitabilityData"]]) {
  const source = readFileSync(file, "utf8");
  const assignment = source.indexOf("export const " + name);
  const begin = source.indexOf("[[", assignment);
  const end = source.lastIndexOf("]]");
  const rows = JSON.parse(source.slice(begin, end + 2));
  fingerprints.push(...rows.slice(0, 3).map(row => JSON.stringify(row)));
  fingerprints.push(...rows.flat().filter(value => typeof value === "number" && Math.abs(value) > 10000 && !Number.isInteger(value)).slice(0, 30).map(String));
}
let count = 0;
const scan = directory => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.(js|json|csv)$/.test(file)) {
      count++;
      const content = readFileSync(file, "utf8");
      assert.ok(!fingerprints.some(value => content.includes(value)), "Financial snapshot found in public artifact: " + file);
    }
  }
};
scan(".next/static"); scan("public");
if (existsSync("dist/client")) scan("dist/client");
console.log("No financial snapshots found in " + count + " public artifacts (" + fingerprints.length + " fingerprints).");
