import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";

register("../scripts/test-typescript-loader.mjs", import.meta.url);

const { decodeProfitabilityForecast, decodeProfitabilityForecastRefreshedAt } = await import("../app/api/profitability-forecast/data.ts");
const { profitabilityForecastQuery } = await import("../app/api/profitability-forecast/route.ts");
const channelProfitabilitySource = readFileSync(new URL("../app/profitability/ChannelProfitability.tsx", import.meta.url), "utf8");
const monthFilterSource = readFileSync(new URL("../app/components/MonthPeriodFilter.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const fields = [
  "year", "quarter", "month", "channel", "brand", "sales", "margin",
  "operating_cost", "operating_result", "utility", "refreshed_at",
].map((name) => ({ name, type: "STRING" }));

const payload = (values) => ({
  schema: { fields },
  rows: values.map((row) => ({ f: row.map((value) => ({ v: value })) })),
});

test("Rentabilidad Forecast maps the BigQuery schema without changing financial values", () => {
  const rows = decodeProfitabilityForecast(payload([
    ["2027P", "Q1", "1", "Wholesale", "Consolidado", "123.45", "67.89", "-40", "27.89", "20.35"],
  ]));

  assert.deepEqual(rows, [{
    year: "2027P",
    quarter: "Q1",
    month: 1,
    channel: "Wholesale",
    brand: "Consolidado",
    sales: 123.45,
    margin: 67.89,
    operatingCost: -40,
    operatingResult: 27.89,
    utility: 20.35,
  }]);
});

test("Rentabilidad Forecast rejects duplicate business keys and invalid dimensions", () => {
  const row = ["2026E", "Q1", "1", "Ecommerce", "Hush Puppies", "1", "1", "-1", "0", "0"];
  assert.throws(() => decodeProfitabilityForecast(payload([row, row])), /llave duplicada/);
  assert.throws(() => decodeProfitabilityForecast(payload([["2026E", "Q5", "13", "Otro", "Marca", "1", "1", "-1", "0", "0"]])), /trimestre no soportado/);
});

test("the forecast query is restricted to the validated BigQuery source and supported channels", () => {
  const query = profitabilityForecastQuery("project_id.dataset_name.table_name");
  assert.match(query, /FROM `project_id\.dataset_name\.table_name`/);
  assert.match(query, /'Ecommerce'/);
  assert.match(query, /'Marketplace'/);
  assert.match(query, /'Wholesale'/);
  assert.match(query, /'Consolidado'/);
  assert.match(query, /'2027P'/);
  assert.match(query, /`project_id\.dataset_name\.__TABLES__`/);
  assert.match(query, /AS refreshed_at/);
});

test("Rentabilidad Forecast exposes the native table update timestamp", () => {
  const refreshedAt = "2026-11-23T18:30:00.000Z";
  assert.equal(decodeProfitabilityForecastRefreshedAt(payload([[
    "2027P", "Q1", "1", "Wholesale", "Consolidado", "1", "1", "-1", "0", "0", refreshedAt,
  ]])), refreshedAt);
  assert.equal(decodeProfitabilityForecastRefreshedAt(payload([])), null);
  assert.match(channelProfitabilitySource, /setRefreshedAt\(payload\.refreshedAt\)/);
  assert.match(channelProfitabilitySource, /ACTUALIZACIÓN FUENTE/);
});

test("the brand ranking calculates both annual and budget margin variations", () => {
  assert.match(channelProfitabilitySource, /marginAnnual: variation\(selected\.margin, prior\.margin\)/);
  assert.match(channelProfitabilitySource, /marginBudget: variation\(selected\.margin, budget\.margin\)/);
  assert.match(channelProfitabilitySource, /cell\(item\.marginAnnual\)/);
  assert.match(channelProfitabilitySource, /cell\(item\.marginBudget\)/);
});

test("the brand ranking includes a filtered aggregate total", () => {
  assert.match(channelProfitabilitySource, /const rankingTotal = useMemo/);
  assert.match(channelProfitabilitySource, /salesAnnual: variation\(selected\.sales, prior\.sales\)/);
  assert.match(channelProfitabilitySource, /marginBudget: variation\(selected\.margin, budget\.margin\)/);
  assert.match(channelProfitabilitySource, /className="channel-ranking-total"/);
  assert.match(channelProfitabilitySource, /<td>TOTAL<\/td>/);
  assert.match(stylesSource, /\.channel-ranking-table tfoot td/);
});

test("Rentabilidad Forecast uses the standardized empty monthly multi-filter", () => {
  assert.match(channelProfitabilitySource, /"Enero", "Febrero", "Marzo"/);
  assert.match(channelProfitabilitySource, /"Octubre", "Noviembre", "Diciembre"/);
  assert.match(channelProfitabilitySource, /useState<number\[\]>\(\[\]\)/);
  assert.match(channelProfitabilitySource, /<MonthPeriodFilter/);
  assert.match(monthFilterSource, /onPeriodChange\(nextSelectedMonths\.length > 0 \? "MES" : "ANUAL"\)/);
  assert.match(stylesSource, /\.month-options \{[\s\S]*font-size: 10px;/);
  assert.match(stylesSource, /\.month-options label \{[\s\S]*font-size: 10px;/);
});

test("Rentabilidad Forecast replicates the Sales and Margin clear-filter control", () => {
  assert.match(channelProfitabilitySource, /const activeFilterCount = \(scenario === "2026E" \? 0 : 1\)/);
  assert.match(channelProfitabilitySource, /const clearFilters = \(\) => \{/);
  assert.match(channelProfitabilitySource, /setScenario\("2026E"\)/);
  assert.match(channelProfitabilitySource, /setPeriod\("ANUAL"\)/);
  assert.match(channelProfitabilitySource, /setSelectedMonths\(\[\]\)/);
  assert.match(channelProfitabilitySource, /className="sales-margin-clear channel-filter-clear"/);
  assert.match(channelProfitabilitySource, /onClick=\{clearFilters\}/);
});

test("Rentabilidad Forecast scenario and brand filters use the Sales and Margin type scale", () => {
  assert.match(channelProfitabilitySource, /className="scenario-filter"/);
  assert.match(channelProfitabilitySource, /channel-filter-select brand-filter/);
  assert.match(stylesSource, /channel-filter-select:is\(\.scenario-filter, \.brand-filter\)[\s\S]*?font-size: 11px;/);
});
