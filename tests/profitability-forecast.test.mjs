import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";

register("../scripts/test-typescript-loader.mjs", import.meta.url);

const { decodeProfitabilityForecast } = await import("../app/api/profitability-forecast/data.ts");
const { profitabilityForecastQuery } = await import("../app/api/profitability-forecast/route.ts");
const channelProfitabilitySource = readFileSync(new URL("../app/profitability/ChannelProfitability.tsx", import.meta.url), "utf8");

const fields = [
  "year", "quarter", "month", "channel", "brand", "sales", "margin",
  "operating_cost", "operating_result", "utility",
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
});

test("the brand ranking calculates both annual and budget margin variations", () => {
  assert.match(channelProfitabilitySource, /marginAnnual: variation\(selected\.margin, prior\.margin\)/);
  assert.match(channelProfitabilitySource, /marginBudget: variation\(selected\.margin, budget\.margin\)/);
  assert.match(channelProfitabilitySource, /cell\(item\.marginAnnual\)/);
  assert.match(channelProfitabilitySource, /cell\(item\.marginBudget\)/);
});
