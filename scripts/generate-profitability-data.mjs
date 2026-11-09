import fs from "node:fs";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const number = (value = "") => {
  const parsed = Number(value.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const scenarios = new Set(["2025", "2025PE", "2026E", "2026P"]);
const rows = parseCsv(fs.readFileSync("private-data/assets/profitability-channels.csv", "utf8")).slice(1).flatMap((cells) => {
  if (!scenarios.has(cells[1])) return [];
  return [[cells[0], cells[1], cells[2], Number(cells[3]), cells[4], cells[5], number(cells[6]), number(cells[7]), number(cells[8]), number(cells[9]), number(cells[10])]];
});

const output = `// Generado desde private-data/assets/profitability-channels.csv. No editar manualmente.\nexport type ProfitabilityDataRow = [string,string,string,number,string,string,number,number,number,number,number];\nexport const profitabilityData: ProfitabilityDataRow[] = ${JSON.stringify(rows)};\n`;
fs.writeFileSync("app/profitability/profitability-data.ts", output);
console.log(JSON.stringify({ rows: rows.length, target: "app/profitability/profitability-data.ts" }));
