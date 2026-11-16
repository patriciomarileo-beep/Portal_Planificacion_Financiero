import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

register("../scripts/test-typescript-loader.mjs", import.meta.url);
const { clearSalesMarginData, getSalesMarginSnapshot, loadSalesMargin } = await import("../app/sales-margin/sales-margin-data.ts");
const { default: SalesMargin } = await import("../app/sales-margin/SalesMargin.tsx");

const payload = {
  rows: [
    { month: 1, quarter: "Q1", business: "BRICK & LIFE", chain: "", brand: "MARCA", class: "CALZADO", scenario: "2027P", sales: 12345, marginAmount: 5000 },
    { month: 1, quarter: "Q1", business: "BRICK & LIFE", chain: "", brand: "MARCA", class: "CALZADO", scenario: "2027M", sales: 23456, marginAmount: 10000 },
  ],
  source: "test-table", sourceSheet: "test-sheet", refreshedAt: "2026-11-09", unit: "MM$",
  years: ["2024", "2025", "2026P", "2026E", "2027P", "2027M"],
};
afterEach(() => { clearSalesMarginData(); mock.restoreAll(); });

test("2027M is queried only from PRESUPUESTO in the Toolbox consolidated table", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  assert.match(route, /ft_cl_planificacion_TB_CONSOLIDADA_TOOLBOX_CL/);
  assert.match(route, /ANO_2='2027M' AND ORIGEN_DATO='PRESUPUESTO'/);
  assert.doesNotMatch(route, /ANO_2='2027M' AND ORIGEN_DATO='(?!PRESUPUESTO)[^']+'/);
});

test("2026E combines REAL and FORECAST without exposing an empty 2026 scenario", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  assert.match(route, /WHEN ANO_2='2026E' AND ORIGEN_DATO='REAL' THEN '2026E'/);
  assert.match(route, /WHEN ANO_2='2026FR' AND ORIGEN_DATO='FORECAST' THEN '2026E'/);
  assert.doesNotMatch(route, /ANO_2='2026' AND ORIGEN_DATO='REAL'/);
  assert.doesNotMatch(report, /\{ key: "2026", label: "2026" \}/);
  assert.doesNotMatch(report, /(?:current|previous): "2026"/);
});

test("brands below five million and OTRO are consolidated as OTRAS", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  assert.match(route, /SUM\(COALESCE\(sales_amount, 0\)\) total_sales/);
  assert.match(route, /UPPER\(TRIM\(source\.brand\)\) IN \('OTRO', 'OTRAS'\) THEN 'OTRAS'/);
  assert.match(route, /brand_totals\.total_sales < 5000000 THEN 'OTRAS'/);
  assert.match(route, /ELSE source\.brand/);
  assert.match(route, /FROM classified/);
});

test("the initial query loads only visible years and omits the hidden chain dimension", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  assert.match(route, /const defaultYears = \["2024", "2025", "2026P", "2026E", "2027P", "2027M"\]/);
  assert.match(route, /WHERE scenario IN \(\$\{years\.map/);
  assert.match(route, /SELECT month, quarter, business, brand, class, scenario,/);
  assert.doesNotMatch(route, /SELECT month, quarter, business, chain, brand, class, scenario,/);
});

test("selecting an optional year fetches and merges only the missing year", async () => {
  const requests = [];
  const fetch = mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(String(input), "http://localhost");
    const years = url.searchParams.get("years").split(",");
    requests.push(years);
    return Response.json({
      ...payload,
      years,
      rows: years.map((scenario) => ({ ...payload.rows[0], scenario })),
    });
  });
  const defaults = ["2024", "2025", "2026P", "2026E", "2027P", "2027M"];
  await loadSalesMargin("user-a", false, defaults);
  const expanded = await loadSalesMargin("user-a", false, [...defaults, "2020"]);
  assert.deepEqual(requests, [defaults, ["2020"]]);
  assert.deepEqual(expanded.years, ["2020", ...defaults]);
  assert.equal(expanded.rows.some((row) => row.scenario === "2020"), true);
  await loadSalesMargin("user-a", false, [...defaults, "2020"]);
  assert.equal(fetch.mock.callCount(), 2);
});

test("the report displays its navigation and table before the data request finishes", async () => {
  let finish;
  mock.method(globalThis, "fetch", () => new Promise(resolve => { finish = resolve; }));
  const pending = loadSalesMargin("user-a");
  const html = renderToString(createElement(SalesMargin, { sessionScope: "user-a" }));
  assert.match(html, /Vistas de Venta y Margen/);
  assert.match(html, /<table/);
  assert.match(html, /2027M/);
  assert.match(html, /Cargando datos/);
  assert.doesNotMatch(html, /No hay registros/);
  finish(Response.json(payload));
  await pending;
});

test("prefetch and opening the report share one request and returning reuses the data", async () => {
  let finish;
  const fetch = mock.method(globalThis, "fetch", () => new Promise(resolve => { finish = resolve; }));
  const prefetch = loadSalesMargin("user-a");
  assert.equal(loadSalesMargin("user-a"), prefetch);
  finish(Response.json(payload));
  await prefetch;
  assert.deepEqual(await loadSalesMargin("user-a"), payload);
  const html = renderToString(createElement(SalesMargin, { sessionScope: "user-a" }));
  assert.match(html, /12\.345/);
  assert.doesNotMatch(html, /sales-margin-placeholder/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("expired data remain available while one background request refreshes them", async () => {
  let now = 1000;
  mock.method(Date, "now", () => now);
  const fetch = mock.method(globalThis, "fetch", async () => Response.json(payload));
  await loadSalesMargin("user-a");
  now += 5 * 60 * 1000 + 1;
  let finish;
  fetch.mock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const refresh = loadSalesMargin("user-a");
  assert.deepEqual(getSalesMarginSnapshot("user-a"), payload);
  assert.equal(loadSalesMargin("user-a"), refresh);
  const newer = { ...payload, refreshedAt: "2026-11-10" };
  finish(Response.json(newer));
  await refresh;
  assert.deepEqual(getSalesMarginSnapshot("user-a"), newer);
  assert.equal(fetch.mock.callCount(), 2);
});

test("explicit refresh fetches again while keeping the currently displayed data", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json(payload));
  await loadSalesMargin("user-a");
  const refresh = loadSalesMargin("user-a", true);
  assert.deepEqual(getSalesMarginSnapshot("user-a"), payload);
  await refresh;
  assert.equal(fetch.mock.callCount(), 2);
});

test("logout aborts prefetch and a late response cannot restore the previous session data", async () => {
  let finish;
  let signal;
  mock.method(globalThis, "fetch", (_url, options) => {
    signal = options.signal;
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = loadSalesMargin("user-a");
  clearSalesMarginData();
  assert.equal(signal.aborted, true);
  finish(Response.json(payload));
  await pending;
  assert.equal(getSalesMarginSnapshot("user-a"), null);
});

test("cached financial data cannot be reused by another user or role", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json(payload));
  await loadSalesMargin("user-a:ADMINISTRADOR");
  assert.equal(getSalesMarginSnapshot("user-b:ANALISTA"), null);
  await loadSalesMargin("user-b:ANALISTA");
  assert.equal(getSalesMarginSnapshot("user-a:ADMINISTRADOR"), null);
  assert.equal(fetch.mock.callCount(), 2);
});

test("authorization failures clear the cache and failed prefetch can be retried", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json(payload));
  await loadSalesMargin("user-a");
  fetch.mock.mockImplementation(async () => Response.json({ error: "Access denied" }, { status: 403 }));
  await assert.rejects(loadSalesMargin("user-a", true), error => error.status === 403);
  assert.equal(getSalesMarginSnapshot("user-a"), null);
  fetch.mock.mockImplementation(async () => Response.json(payload));
  await loadSalesMargin("user-a");
  assert.deepEqual(getSalesMarginSnapshot("user-a"), payload);
});
