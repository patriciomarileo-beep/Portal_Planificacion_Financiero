import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const setupSql = readFileSync(new URL("../sql/setup-bl-profitability-tables.sql", import.meta.url), "utf8");
const refreshSql = readFileSync(new URL("../sql/refresh-bl-profitability.sql", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const adapterSource = readFileSync(new URL("../app/api/_shared/store-bigquery.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/portal-data/route.ts", import.meta.url), "utf8");
const deploySource = readFileSync(new URL("../scripts/deploy-cloudrun.mjs", import.meta.url), "utf8");

test("B&L keeps its six historical frontend views enabled", () => {
  assert.match(pageSource, /id: "bl", label: "B&L", enabled: true/);
  for (const label of [
    "Comparativa anual",
    "Detalle tiendas",
    "Break-Even",
    "m2",
    "Sensibilidad tiendas",
    "Monitor tiendas",
  ]) {
    assert.match(pageSource, new RegExp(label));
  }
});

test("B&L annual comparison and M2 share the standardized empty monthly filter", () => {
  assert.match(pageSource, /"Enero", "Febrero", "Marzo"/);
  assert.match(pageSource, /"Octubre", "Noviembre", "Diciembre"/);
  assert.match(pageSource, /\[selectedMonths, setSelectedMonths\] = useState<string\[\]>\(\[\]\)/);
  assert.match(pageSource, /\[m2Months, setM2Months\] = useState<string\[\]>\(\[\]\)/);
  assert.equal(pageSource.match(/<MonthPeriodFilter/g)?.length, 2);
  assert.match(pageSource, /ariaLabel="Periodo del informe"/);
  assert.match(pageSource, /ariaLabel="Periodo del análisis M2"/);
  assert.doesNotMatch(pageSource, /m2MonthFilterRef|toggleM2Month/);
});

test("B&L replicates the Sales and Margin clear-filter control", () => {
  assert.match(pageSource, /const blActiveFilterCount = selectedChains\.length/);
  assert.match(pageSource, /const clearBlFilters = \(\) => \{/);
  assert.match(pageSource, /setSelectedChains\(\[\]\)/);
  assert.match(pageSource, /setQuery\(""\)/);
  assert.match(pageSource, /setFwBand\(null\)/);
  assert.match(pageSource, /className="sales-margin-clear bl-filter-clear"/);
  assert.match(pageSource, /onClick=\{clearBlFilters\}/);
});

test("B&L BigQuery setup separates the external and native tables", () => {
  assert.match(setupSql, /TB_EXT_RENTABILIDAD_BL/);
  assert.match(setupSql, /TB_RENTABILIDAD_BL/);
  assert.match(setupSql, /format\s*=\s*'GOOGLE_SHEETS'/i);
  assert.match(setupSql, /sheet_range\s*=\s*'BASE_CONSOLIDADA!A:V'/i);
  assert.match(setupSql, /CREATE TABLE IF NOT EXISTS/i);
});

test("B&L refresh validates before an atomic native publication", () => {
  assert.match(refreshSql, /CREATE OR REPLACE PROCEDURE[\s\S]*sp_refresh_rentabilidad_bl/i);
  assert.match(refreshSql, /CREATE TEMP TABLE raw_snapshot/i);
  assert.match(refreshSql, /CREATE TEMP FUNCTION parse_bl_float/i);
  assert.match(refreshSql, /REPLACE\(TRIM\(value\), ',', '\.'\)/i);
  assert.match(refreshSql, /v_duplicate_rows/);
  assert.match(refreshSql, /v_invalid_measure_rows/);
  assert.match(refreshSql, /BEGIN TRANSACTION/i);
  assert.match(refreshSql, /TRUNCATE TABLE[\s\S]*TB_RENTABILIDAD_BL/i);
  assert.match(refreshSql, /COMMIT TRANSACTION/i);
  assert.match(refreshSql, /ROLLBACK TRANSACTION/i);
  assert.doesNotMatch(refreshSql, /TB_RENTABILIDAD_BL_(STAGING|AUDIT)/i);
});

test("B&L portal endpoint reads the native table with full pagination", () => {
  assert.match(routeSource, /getStoreBigQueryData/);
  assert.doesNotMatch(routeSource, /getStoreSheetData|store-sheet/);
  assert.match(adapterSource, /BIGQUERY_BL_TABLE/);
  assert.match(adapterSource, /TB_RENTABILIDAD_BL/);
  assert.match(adapterSource, /paginate: true/);
  assert.match(adapterSource, /pageSize: 10000/);
  assert.match(adapterSource, /MAX\(SYNCED_AT\) OVER\(\)/);
  assert.match(adapterSource, /requiredYears = \[2024, 2025, 2026, 2027\]/);
  assert.doesNotMatch(adapterSource, /sheets\.googleapis\.com|BL_SHEET_ID/);
});

test("Cloud Run exposes only the native B&L table setting", () => {
  assert.match(deploySource, /BIGQUERY_BL_TABLE/);
  assert.doesNotMatch(deploySource, /BL_SHEET_ID/);
});
