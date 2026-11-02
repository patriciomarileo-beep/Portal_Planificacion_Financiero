import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const workbookPath = path.resolve(process.argv[2] ?? "TIENDAS-current.xlsx");
const outputPath = path.resolve("app/base-consolidada.ts");
const workbook = XLSX.readFile(workbookPath, { cellDates: false });
const sheet = workbook.Sheets.BASE_CONSOLIDADA;

if (!sheet) throw new Error("No se encontró la hoja BASE_CONSOLIDADA.");

const values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
const invalid = (value) => {
  const text = String(value ?? "").trim().toUpperCase();
  return !text || text.includes("#N/A") || text.includes("#REF") || text.includes("#VALUE") || text.includes("ARRAY RESULT") || text.includes("ERROR");
};
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const nullableNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const rows = values.slice(1).flatMap((row) => {
  const year = number(row[0]);
  const code = invalid(row[4]) ? row[3] : row[4];
  const name = invalid(row[7]) ? row[6] : row[7];
  if (![2024, 2025, 2026, 2027].includes(year) || invalid(code) || invalid(name)) return [];
  return [[
    year,
    String(row[1] ?? ""),
    String(row[2] ?? ""),
    String(code),
    String(row[5] ?? ""),
    String(name),
    number(row[10]),
    number(row[11]),
    number(row[12]),
    number(row[13]),
    number(row[14]),
    number(row[15]),
    number(row[16]),
    number(row[17]),
    number(row[18]),
    number(row[19]),
    number(row[20]),
    nullableNumber(row[21]),
  ]];
});

const snapshotAt = new Date().toISOString();
const source = `// Snapshot generado desde BASE_CONSOLIDADA: ${snapshotAt}.\n` +
  `export const baseSnapshotAt = ${JSON.stringify(snapshotAt)};\n` +
  "export type BaseRow = [number,string,string,string,string,string,number,number,number,number,number,number,number,number,number,number,number,number|null];\n" +
  `export const baseConsolidada: BaseRow[] = ${JSON.stringify(rows)};\n`;

fs.writeFileSync(outputPath, source, "utf8");

const sales2026 = rows
  .filter((row) => row[0] === 2026 && row[1] === "TOTAL" && row[2] === "ANUAL")
  .reduce((sum, row) => sum + row[6], 0);
console.log(JSON.stringify({ rows: rows.length, sales2026, snapshotAt }));
