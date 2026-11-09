import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import XLSX from "xlsx";

mkdirSync("tmp", { recursive: true });
const fixture = () => mkdtempSync(resolve("tmp/generator-security-"));

test("the profitability generator reads and writes its fixed project files", () => {
  const cwd = fixture();
  mkdirSync(join(cwd, "private-data/assets"), { recursive: true });
  mkdirSync(join(cwd, "app/profitability"), { recursive: true });
  writeFileSync(join(cwd, "private-data/assets/profitability-channels.csv"), "channel,scenario,period,month,brand,account,a,b,c,d,e\nRetail,2026E,ANUAL,1,Marca,Ventas,100,200,300,400,500\n");
  const result = spawnSync(process.execPath, [resolve("scripts/generate-profitability-data.mjs"), "untrusted-output.ts"], { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).rows, 1);
  assert.match(readFileSync(join(cwd, "app/profitability/profitability-data.ts"), "utf8"), /"Retail","2026E","ANUAL",1,"Marca","Ventas",100,200,300,400,500/);
  assert.equal(existsSync(join(cwd, "untrusted-output.ts")), false);
});

test("refresh-base always writes the fixed application snapshot", () => {
  const cwd = fixture();
  mkdirSync(join(cwd, "app"));
  const workbook = XLSX.utils.book_new();
  const values = [2026, "TOTAL", "ANUAL", "fallback-code", "STORE-1", "Retail", "Fallback", "Tienda", null, null, 123, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, null];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([values.map((_, index) => `field-${index}`), values]), "BASE_CONSOLIDADA");
  writeFileSync(join(cwd, "input.xlsx"), XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
  const result = spawnSync(process.execPath, [resolve("scripts/refresh-base.mjs"), "input.xlsx", "untrusted-output.ts"], { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).rows, 1);
  assert.match(readFileSync(join(cwd, "app/base-consolidada.ts"), "utf8"), /"STORE-1","Retail","Tienda",123/);
  assert.equal(existsSync(join(cwd, "untrusted-output.ts")), false);
});
