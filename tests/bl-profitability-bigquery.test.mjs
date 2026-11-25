import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

register("../scripts/test-typescript-loader.mjs", import.meta.url);

const setupSql = readFileSync(new URL("../sql/setup-bl-profitability-tables.sql", import.meta.url), "utf8");
const refreshSql = readFileSync(new URL("../sql/refresh-bl-profitability.sql", import.meta.url), "utf8");
const consolidatedSetupSql = readFileSync(new URL("../sql/setup-bl-consolidated.sql", import.meta.url), "utf8");
const classificationSetupSql = readFileSync(new URL("../sql/setup-bl-store-classification.sql", import.meta.url), "utf8");
const classificationRefreshSql = readFileSync(new URL("../sql/refresh-bl-store-classification.sql", import.meta.url), "utf8");
const consolidatedRefreshSql = readFileSync(new URL("../sql/refresh-bl-consolidated.sql", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const adapterSource = readFileSync(new URL("../app/api/_shared/store-bigquery.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/portal-data/route.ts", import.meta.url), "utf8");
const deploySource = readFileSync(new URL("../scripts/deploy-cloudrun.mjs", import.meta.url), "utf8");
const { decodeStoreBigQuery } = await import("../app/api/_shared/store-bigquery.ts");
const { openingType } = await import("../app/store-classification.ts");

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

test("B&L consolidates monthly classifications before publishing the query table", () => {
  assert.match(consolidatedSetupSql, /TB_RENTABILIDAD_BL_CONSOLIDADA/);
  assert.match(classificationSetupSql, /TB_CLASIFICACION_TIENDA/);
  assert.match(classificationRefreshSql, /sp_refresh_clasificacion_tienda_bl/);
  assert.match(consolidatedRefreshSql, /sp_refresh_rentabilidad_bl_consolidada/);
  assert.match(consolidatedRefreshSql, /sp_refresh_clasificacion_tienda_bl/);
  assert.match(consolidatedRefreshSql, /BEGIN TRANSACTION/i);
  assert.match(consolidatedRefreshSql, /ROLLBACK TRANSACTION/i);
});

test("B&L portal endpoint reads the native table with full pagination", () => {
  assert.match(routeSource, /getStoreBigQueryData/);
  assert.doesNotMatch(routeSource, /getStoreSheetData|store-sheet/);
  assert.match(adapterSource, /BIGQUERY_BL_TABLE/);
  assert.match(adapterSource, /TB_RENTABILIDAD_BL/);
  assert.match(adapterSource, /paginate: true/);
  assert.match(adapterSource, /pageSize: 10000/);
  assert.match(adapterSource, /MAX\(SYNCED_AT\) OVER\(\)/);
  assert.match(adapterSource, /TB_RENTABILIDAD_BL_CONSOLIDADA/);
  assert.match(adapterSource, /CURRENT_DATE\('America\/Santiago'\)/);
  assert.match(adapterSource, /activeYear - 3/);
  assert.match(adapterSource, /activeYear - 2/);
  assert.match(adapterSource, /activeYear \+ 1/);
  assert.match(adapterSource, /CLASIFICACION/);
  assert.doesNotMatch(adapterSource, /sheets\.googleapis\.com|BL_SHEET_ID/);
});

test("Cloud Run exposes only the native B&L table setting", () => {
  assert.match(deploySource, /BIGQUERY_BL_TABLE/);
  assert.match(deploySource, /TB_RENTABILIDAD_BL_CONSOLIDADA/);
  assert.doesNotMatch(deploySource, /BL_SHEET_ID/);
});

test("B&L decodes dynamic years and explicit monthly classifications", () => {
  const activeYear = Number(new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date()));
  const classifications = ["REMODELACION", "SSS", "NS", "SIN CLASIFICAR", "SSS"];
  const rows = [activeYear - 3, activeYear - 2, activeYear - 1, activeYear, activeYear + 1].map((year, index) => ({
    // La respuesta conserva el contrato posicional usado por BaseRow:
    // clasificación (18), snapshot (19), escenario (20) y tipo de dato (21).
    f: [
      year, "ENERO", "MENSUAL", `CC-${year}`, "HP", `Tienda ${year}`,
      100, 50, -10, -10, -5, -2, -1, -1, -29, 0, 21, 25,
      classifications[index], "2026-11-20T12:00:00.000Z",
      year <= activeYear - 1 ? `${year}R` : year === activeYear ? `${year}E` : `${year}P`,
      year <= activeYear - 1 ? "REAL" : "FORECAST",
    ].map((value) => ({ v: String(value) })),
  }));
  const decoded = decodeStoreBigQuery({ rows });

  assert.equal(decoded.baseConsolidada[0][18], "REMODELACIÓN");
  assert.equal(decoded.baseConsolidada[1][18], "SSS");
  assert.equal(decoded.baseSnapshotAt, "2026-11-20T12:00:00.000Z");
  assert.equal(openingType({
    code: "210302",
    monthlyClassification: { 2026: { ENERO: "REMODELACIÓN" }, 2027: {} },
  }, 2026, "ENERO"), "NS");
  assert.equal(openingType({
    code: "210302",
    monthlyClassification: { 2026: { ENERO: "SIN CLASIFICAR" }, 2027: {} },
  }, 2026, "ENERO"), "NS");
});

test("B&L removes Remodelacion from the visible classification controls", () => {
  assert.match(pageSource, /\["TOTAL", "SSS", "NS"\]/);
  assert.doesNotMatch(pageSource, /"REMODELED"|monitor-kpi remodeled|\["TOTAL", "SSS", "NS", "REMODELACI/);
});

test("B&L exposes 2023R and opens every visible year by month", () => {
  assert.match(pageSource, /type Year = 2023 \| 2024 \| 2025 \| 2026 \| 2027/);
  assert.match(pageSource, /const years: Year\[\] = \[2023, 2024, 2025, 2026, 2027\]/);
  assert.match(pageSource, /2023: "2023R"/);
  assert.match(pageSource, /store\.realMonthly\[historicalScenario\]/);
  assert.match(pageSource, /store\.realMonthlyClassification\[historicalScenario\]/);
  assert.match(pageSource, /const breakdownTotals = displayedYears\.map/);
  assert.match(consolidatedRefreshSql, /WHEN COUNTIF\(r\.TIPO_DATO = 'REAL'\) > 0 THEN 'SSS'/);
});
