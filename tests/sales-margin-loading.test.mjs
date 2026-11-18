import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

register("../scripts/test-typescript-loader.mjs", import.meta.url);
const { clearSalesMarginData, getSalesMarginSnapshot, loadSalesMargin, salesMarginDefaultYears, salesMarginYearOptions } = await import("../app/sales-margin/sales-margin-data.ts");
const {
  buildDisplayRows,
  default: SalesMargin,
  reconcileSalesMarginFilters,
  salesMarginBrandsForFilters,
  salesMarginChainsForFilters,
  salesMarginChannelsForBrands,
  salesMarginChannelsForFilters,
  salesMarginClassesForFilters,
} = await import("../app/sales-margin/SalesMargin.tsx");

const payload = {
  rows: [
    { month: 1, quarter: "Q1", business: "BRICK & LIFE", chain: "", brand: "MARCA", class: "CALZADO", scenario: "2027P", sales: 12345, marginAmount: 5000 },
    { month: 1, quarter: "Q1", business: "BRICK & LIFE", chain: "", brand: "MARCA", class: "CALZADO", scenario: "2027M", sales: 23456, marginAmount: 10000 },
  ],
  source: "test-table", sourceSheet: "test-sheet", refreshedAt: "2026-11-09", unit: "MM$",
  years: ["2024", "2025", "2026E", "2026P", "2027P", "2027M"],
  chainYears: [],
  brandGrouping: {
    label: "OTRAS",
    thresholdMm: 50,
    window: ["2025", "2026E", "2027P"],
    brands: [{ name: "MARCA MENOR", totalSalesMm: 12.5 }],
  },
};
afterEach(() => { clearSalesMarginData(); mock.restoreAll(); });

test("budget periods are selected dynamically and only from PRESUPUESTO", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  assert.match(route, /ft_cl_planificacion_TB_CONSOLIDADA_TOOLBOX_CL/);
  assert.match(route, /REGEXP_CONTAINS\(source_period, r'\^\\\\d\{4\}\[PM\]\$'\) AND source_origin='PRESUPUESTO'/);
  assert.doesNotMatch(route, /ANO_2='2027M'/);
});

test("2028, 2029 and 2030 SARIMA projections are exposed as PS optional filters", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  assert.deepEqual(salesMarginYearOptions.slice(-3), ["2028PS", "2029PS", "2030PS"]);
  assert.equal(salesMarginYearOptions.includes("2028P"), false);
  assert.equal(salesMarginYearOptions.includes("2028E"), false);
  for (const year of ["2028PS", "2029PS", "2030PS"]) assert.equal(salesMarginDefaultYears.includes(year), false);
  assert.match(route, /REGEXP_CONTAINS\(source_period, r'\^\\\\d\{4\}_J\$'\) AND source_origin='PROYECCIONES_VENTAS_SARIMA'/);
  assert.match(route, /THEN CONCAT\(SUBSTR\(source_period, 1, 4\), 'PS'\)/);
  assert.match(route, /ft_cl_planificacion_TB_CONSOLIDADA_TOOLBOX_CL/);
  assert.doesNotMatch(route, /ANO_2='2028P'/);
  assert.doesNotMatch(route, /ANO_2='2028E'/);
  assert.doesNotMatch(route, /ANO_2 IN \('2028_J','2029_J','2030_J'\) AND ORIGEN_DATO='(?!PROYECCIONES_VENTAS_SARIMA)[^']+'/);
});

test("estimated periods prefer the REAL plus FORECAST composition without exposing an empty 2026 scenario", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  assert.match(route, /source_origin='REAL' THEN 1/);
  assert.match(route, /source_origin='FORECAST' THEN 1/);
  assert.match(route, /source_origin IN \('TY_ESTIMADO','NY_ESTIMADO'\) THEN 2/);
  assert.match(route, /MIN\(estimate_priority\) OVER \(PARTITION BY scenario\)/);
  assert.doesNotMatch(report, /\{ key: "2026", label: "2026" \}/);
  assert.doesNotMatch(report, /(?:current|previous): "2026"/);
});

test("brands below fifty million use the latest complete REAL, E and P rolling window", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  assert.match(route, /SUM\(COALESCE\(sales_amount, 0\)\) total_sales/);
  assert.match(route, /UPPER\(TRIM\(brands\.brand\)\) IN \('OTRO', 'OTRAS'\)/);
  assert.match(route, /COALESCE\(brand_totals\.total_sales, 0\) < 50000000 grouped_as_other/);
  assert.doesNotMatch(route, /COALESCE\(brand_totals\.total_sales, 0\) < 25000000/);
  assert.match(route, /SELECT MAX\(base_year\) base_year/);
  assert.match(route, /base_year \+ 1 AS STRING\), 'E'/);
  assert.match(route, /base_year \+ 2 AS STRING\), 'P'/);
  assert.match(route, /JOIN grouping_scenarios USING \(scenario\)/);
  assert.match(route, /IF\(brand_classification\.grouped_as_other, 'OTRAS', source\.brand\) brand/);
  assert.match(route, /FROM classified/);
});

test("the API and report expose the exact brands grouped as OTRAS", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  assert.match(route, /TO_JSON_STRING\(ARRAY_AGG\(STRUCT\(/);
  assert.match(route, /brand AS name/);
  assert.match(route, /ROUND\(total_sales \/ 1000000, 2\) AS totalSalesMm/);
  assert.match(route, /thresholdMm: 50/);
  assert.match(report, /sales-margin-brand-glossary-trigger/);
  assert.match(report, /Composición de “OTRAS”/);
  assert.match(report, /payload\.brandGrouping\.brands\.map/);
});

test("the home exposes direct access to every native Sales and Margin view", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  for (const view of ["summary", "channel", "brand", "brandChannel", "brandClass", "chainBrand"]) {
    assert.match(page, new RegExp(`\\["${view}",`));
  }
  assert.match(page, /openSalesMargin\(targetView\)/);
  assert.match(report, /initialView\?: SalesMarginView/);
  assert.match(report, /useState<SalesMarginView>\(initialView\)/);
});

test("the topbar exposes Sales and Margin as a dropdown with all its native views", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /portal-topnav-group sales-margin-topnav-group/);
  assert.match(page, /openTopnavGroup === "sales-margin"/);
  assert.match(page, /aria-haspopup="true"/);
  for (const label of ["Consolidado", "Canal", "Marca", "Marca × Canal", "Marca × Clase", "Cadena × Marca"]) {
    assert.match(page, new RegExp(`"${label}"`));
  }
  assert.equal(page.match(/\["chainBrand", "Cadena × Marca"\]/g)?.length, 2);
  assert.doesNotMatch(page, /brandClassChannel/);
});

test("direct access to Chain by brand activates its Sales and Margin tab", () => {
  const html = renderToString(createElement(SalesMargin, {
    sessionScope: "test-session",
    initialView: "chainBrand",
  }));

  assert.match(html, /<button type="button" class="active">(?:(?!<\/button>)[\s\S])*<span>Cadena × marca<\/span><\/button>/);
});

test("channel options depend on the selected brands", () => {
  const rows = [
    { ...payload.rows[0], brand: "BROOKS", business: "BRICK & LIFE" },
    { ...payload.rows[0], brand: "BROOKS", business: "ECOMMERCE" },
    { ...payload.rows[0], brand: "BROOKS", business: "MARKETPLACE" },
    { ...payload.rows[0], brand: "OTRA MARCA", business: "WHOLESALE" },
  ];
  assert.deepEqual(salesMarginChannelsForBrands(rows, ["BROOKS"]), ["BRICK & LIFE", "ECOMMERCE", "MARKETPLACE"]);
  assert.deepEqual(salesMarginChannelsForBrands(rows, ["BROOKS", "OTRA MARCA"]), ["BRICK & LIFE", "ECOMMERCE", "MARKETPLACE", "WHOLESALE"]);
  assert.deepEqual(salesMarginChannelsForBrands(rows, []), ["BRICK & LIFE", "ECOMMERCE", "MARKETPLACE", "WHOLESALE"]);
});

test("brand, channel and class options are bidirectionally faceted", () => {
  const rows = [
    { ...payload.rows[0], brand: "BROOKS", business: "BRICK & LIFE", class: "CALZADO" },
    { ...payload.rows[0], brand: "BROOKS", business: "BRICK & LIFE", class: "VESTUARIO" },
    { ...payload.rows[0], brand: "BROOKS", business: "ECOMMERCE", class: "CALZADO" },
    { ...payload.rows[0], brand: "BROOKS", business: "MARKETPLACE", class: "CALZADO" },
    { ...payload.rows[0], brand: "BROOKS", business: "MARKETPLACE", class: "VESTUARIO" },
    { ...payload.rows[0], brand: "OTRA MARCA", business: "WHOLESALE", class: "ACCESORIOS" },
  ];
  assert.deepEqual(salesMarginClassesForFilters(rows, ["BROOKS"], []), ["CALZADO", "VESTUARIO"]);
  assert.deepEqual(salesMarginClassesForFilters(rows, ["BROOKS"], ["ECOMMERCE"]), ["CALZADO"]);
  assert.deepEqual(salesMarginClassesForFilters(rows, ["BROOKS"], ["MARKETPLACE"]), ["CALZADO", "VESTUARIO"]);
  assert.deepEqual(salesMarginClassesForFilters(rows, [], ["WHOLESALE"]), ["ACCESORIOS"]);
  assert.deepEqual(salesMarginChannelsForFilters(rows, [], ["ACCESORIOS"]), ["WHOLESALE"]);
  assert.deepEqual(salesMarginBrandsForFilters(rows, ["WHOLESALE"], ["ACCESORIOS"]), ["OTRA MARCA"]);
  assert.deepEqual(salesMarginBrandsForFilters(rows, ["MARKETPLACE"], ["VESTUARIO"]), ["BROOKS"]);
});

test("brand by channel lists each channel and appends one total per brand", () => {
  const rows = [
    { ...payload.rows[0], brand: "MARCA A", business: "BRICK & LIFE", sales: 10, marginAmount: 4 },
    { ...payload.rows[0], brand: "MARCA A", business: "ECOMMERCE", sales: 20, marginAmount: 8 },
    { ...payload.rows[0], brand: "MARCA B", business: "WHOLESALE", sales: 5, marginAmount: 2 },
  ];
  const annual = buildDisplayRows(rows, "brandChannel");
  assert.deepEqual(annual.map(({ primary, secondary }) => [primary, secondary]), [
    ["MARCA A", "BRICK & LIFE"],
    ["MARCA A", "ECOMMERCE"],
    ["MARCA A", "TOTAL"],
    ["MARCA B", "WHOLESALE"],
    ["MARCA B", "TOTAL"],
    ["CONSOLIDADO", ""],
  ]);
  assert.equal(annual.find((row) => row.primary === "MARCA A" && row.secondary === "TOTAL")?.metrics["2027P"]?.sales, 30);
  assert.equal(annual.at(-1)?.metrics["2027P"]?.sales, 35);

  const quarterly = buildDisplayRows(rows, "brandChannel", "Q1", [1, 2, 3]);
  const brandQuarterTotal = quarterly.find((row) =>
    row.primary === "MARCA A" && row.secondary === "TOTAL"
  );
  assert.equal(brandQuarterTotal?.metrics["2027P"]?.sales, 30);
  assert.equal(brandQuarterTotal?.tertiary, "");
  assert.equal(brandQuarterTotal?.expandable, false);
  assert.equal(quarterly.some((row) => row.parentKey === brandQuarterTotal?.key), false);
});

test("brand by class follows the same total and consolidated rules", () => {
  const rows = [
    { ...payload.rows[0], brand: "MARCA A", class: "CALZADO", sales: 10, marginAmount: 4 },
    { ...payload.rows[0], brand: "MARCA A", class: "VESTUARIO", sales: 20, marginAmount: 8 },
    { ...payload.rows[0], brand: "MARCA B", class: "ACCESORIOS", sales: 5, marginAmount: 2 },
  ];
  const multiple = buildDisplayRows(rows, "brandClass");
  assert.deepEqual(multiple.map(({ primary, secondary }) => [primary, secondary]), [
    ["MARCA A", "CALZADO"],
    ["MARCA A", "VESTUARIO"],
    ["MARCA A", "TOTAL"],
    ["MARCA B", "ACCESORIOS"],
    ["MARCA B", "TOTAL"],
    ["CONSOLIDADO", ""],
  ]);
  assert.equal(multiple.find((row) => row.primary === "MARCA A" && row.secondary === "TOTAL")?.metrics["2027P"]?.sales, 30);

  const single = buildDisplayRows(rows.filter((row) => row.brand === "MARCA A"), "brandClass", "ANUAL", [1, 2, 3], false);
  assert.equal(single.some((row) => row.primary === "CONSOLIDADO"), false);
  assert.equal(single.at(-1)?.secondary, "TOTAL");

  const quarterly = buildDisplayRows(rows.filter((row) => row.brand === "MARCA A"), "brandClass", "Q1", [1, 2, 3], false);
  assert.equal(quarterly.some((row) => row.primary === "CONSOLIDADO"), false);
  const brandClassTotal = quarterly.find((row) => row.secondary === "TOTAL");
  assert.equal(brandClassTotal?.tertiary, "");
  assert.equal(brandClassTotal?.expandable, false);
  assert.equal(quarterly.some((row) => row.parentKey === brandClassTotal?.key), false);
});

test("brand by channel and brand by class keep one flat total for multi-month selections", () => {
  const base = payload.rows[0];
  const rows = [
    { ...base, month: 1, quarter: "Q1", brand: "MARCA A", business: "ECOMMERCE", class: "CALZADO", sales: 10 },
    { ...base, month: 2, quarter: "Q1", brand: "MARCA A", business: "ECOMMERCE", class: "CALZADO", sales: 20 },
  ];

  for (const view of ["brandChannel", "brandClass"]) {
    const display = buildDisplayRows(rows, view, "MES", [1, 2], false);
    const totals = display.filter((row) => row.primary === "MARCA A" && row.secondary === "TOTAL");

    assert.equal(totals.length, 1, `${view} must render one total only`);
    assert.equal(totals[0].metrics["2027P"]?.sales, 30);
    assert.equal(totals[0].tertiary, "");
    assert.equal(totals[0].expandable, false);
    assert.equal(display.some((row) => row.parentKey === totals[0].key), false);
  }
});

test("chain by brand is populated from normalized BigQuery chain fields", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  assert.match(route, /UPPER\(chain_candidate\)='E-COMMERCE' THEN CONCAT\(brand, '\.CL'\)/);
  assert.match(route, /ENDS_WITH\(UPPER\(chain_candidate\), ' E-COMMERCE'\)/);
  assert.match(route, /SUBSTR\(chain_candidate, 1, LENGTH\(chain_candidate\) - LENGTH\(' E-COMMERCE'\)\)/);
  assert.doesNotMatch(route, /THEN '\.CL'/);
  assert.match(route, /\$\{includeChain \? "chain" : "''"\} chain/);
  assert.match(route, /request\.nextUrl\.searchParams\.get\("includeChain"\) === "1"/);
  assert.match(route, /chain: String\(row\.chain \?\? ""\)/);
  assert.match(report, /const SHOW_CHAIN_BRAND_VIEW = true/);
  assert.equal(report.indexOf('id: "chainBrand"'), report.lastIndexOf('id: "chainBrand"'));
  assert.ok(report.indexOf('id: "chainBrand"') > report.indexOf('id: "brandClass"'));

  const rows = [
    { ...payload.rows[0], chain: "HUSH PUPPIES", brand: "MARCA A", sales: 10, marginAmount: 4 },
    { ...payload.rows[0], chain: "HUSH PUPPIES", brand: "MARCA B", sales: 20, marginAmount: 8 },
    { ...payload.rows[0], chain: "ROCKFORD", brand: "MARCA A", sales: 5, marginAmount: 2 },
  ];
  const display = buildDisplayRows(rows, "chainBrand");
  assert.equal(display.some((row) => row.primary === "HUSH PUPPIES" && row.secondary === "TOTAL"), true);
  assert.equal(display.some((row) => row.primary === "ROCKFORD" && row.secondary === "TOTAL"), true);
  assert.equal(display.some((row) => row.secondary === "TOTAL CADENA"), false);
  assert.equal(display.at(-1)?.primary, "CONSOLIDADO");

  const singleChain = buildDisplayRows(rows.filter((row) => row.chain === "HUSH PUPPIES"), "chainBrand", "ANUAL", [1, 2, 3], false);
  assert.equal(singleChain.some((row) => row.primary === "CONSOLIDADO"), false);
  assert.equal(singleChain.at(-1)?.secondary, "TOTAL");

  const quarterly = buildDisplayRows(rows.filter((row) => row.chain === "HUSH PUPPIES"), "chainBrand", "Q1", [1, 2, 3], false);
  assert.equal(quarterly.some((row) => row.primary === "CONSOLIDADO"), false);
  assert.equal(quarterly.some((row) => row.secondary === "TOTAL" && row.tertiary === "Q1" && row.expandable), true);
});

test("temporal drilldown keeps every logical row and nests its months", () => {
  const base = payload.rows[0];
  const rows = [
    { ...base, month: 1, quarter: "Q1", chain: "HUSH PUPPIES", brand: "MARCA A", business: "BRICK & LIFE", class: "CALZADO", sales: 10 },
    { ...base, month: 2, quarter: "Q1", chain: "HUSH PUPPIES", brand: "MARCA A", business: "BRICK & LIFE", class: "CALZADO", sales: 20 },
  ];
  const expectations = [
    { view: "channel", primary: "BRICK & LIFE", secondary: "Q1", tertiary: "", childPeriod: "FEB" },
    { view: "brand", primary: "MARCA A", secondary: "Q1", tertiary: "", childPeriod: "FEB" },
    { view: "brandChannel", primary: "MARCA A", secondary: "BRICK & LIFE", tertiary: "Q1", childPeriod: "FEB" },
    { view: "brandClass", primary: "MARCA A", secondary: "CALZADO", tertiary: "Q1", childPeriod: "FEB" },
    { view: "chainBrand", primary: "HUSH PUPPIES", secondary: "MARCA A", tertiary: "Q1", childPeriod: "FEB" },
  ];

  for (const expectation of expectations) {
    const display = buildDisplayRows(rows, expectation.view, "Q1", [1, 2, 3], false);
    const parent = display.find((row) =>
      row.primary === expectation.primary
      && row.secondary === expectation.secondary
      && row.tertiary === expectation.tertiary
      && row.expandable
      && !row.total
    );
    assert.ok(parent, `${expectation.view} should expose an expandable parent`);
    assert.equal(parent.metrics["2027P"]?.sales, 30);
    const child = display.find((row) =>
      row.parentKey === parent.key
      && (row.secondary === expectation.childPeriod || row.tertiary === expectation.childPeriod)
    );
    assert.ok(child, `${expectation.view} should nest monthly rows`);
    assert.equal(child.depth, 1);
    assert.equal(child.metrics["2027P"]?.sales, 20);
  }

  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(report, /sales-margin-drilldown-toggle/);
  assert.match(report, /expandedTemporalRows\.has\(row\.parentKey\)/);
  assert.match(styles, /\.sales-margin-table\.view-chainBrand tbody th \{ text-align: center; \}/);
});

test("a single-month table filter keeps unique React rows and never mixes quarters", () => {
  const base = payload.rows[0];
  const rows = [
    { ...base, month: 1, quarter: "Q1", chain: "HUSH PUPPIES", brand: "MARCA A", business: "ECOMMERCE", class: "CALZADO", sales: 10 },
    { ...base, month: 2, quarter: "Q1", chain: "HUSH PUPPIES", brand: "MARCA A", business: "ECOMMERCE", class: "CALZADO", sales: 20 },
    { ...base, month: 1, quarter: "Q1", chain: "ROCKFORD", brand: "MARCA B", business: "WHOLESALE", class: "VESTUARIO", sales: 30 },
    { ...base, month: 8, quarter: "Q3", chain: "ROCKFORD", brand: "MARCA B", business: "WHOLESALE", class: "VESTUARIO", sales: 40 },
  ];

  for (const view of ["channel", "brand", "brandChannel", "brandClass", "chainBrand"]) {
    const display = buildDisplayRows(rows, view, "MES", [1], false);
    const keys = display.map((row) => row.key);
    assert.equal(new Set(keys).size, keys.length, `${view} must not emit duplicate React keys`);
    assert.equal(display.some((row) => row.parentKey), false, `${view} should not add a redundant child for one month`);
    assert.equal(display.some((row) => row.expandable), false, `${view} should not show an empty accordion for one month`);
    const periodsAreSelectedMonthOrFlatTotal = display.every((row) => {
      const period = view === "channel" || view === "brand" ? row.secondary : row.tertiary;
      const isFlatTotal = (view === "brandChannel" || view === "brandClass") && row.total && period === "";
      return period === "ENE" || isFlatTotal;
    });
    assert.equal(periodsAreSelectedMonthOrFlatTotal, true, `${view} must only render the selected month`);
    assert.equal(display.some((row) => row.metrics["2027P"]?.sales === 20 || row.metrics["2027P"]?.sales === 40), false);
  }

  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  assert.match(report, /aggregate-\$\{quarterFilter\}-\$\{activeMonths\.join\("-"\)\}/);
  assert.match(report, /`month-\$\{month\}`/);
});

test("the Sales and Margin month filter starts empty and keeps the annual view until a month is selected", () => {
  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  const monthFilter = readFileSync(new URL("../app/components/MonthPeriodFilter.tsx", import.meta.url), "utf8");

  clearSalesMarginData();
  const html = renderToString(createElement(SalesMargin));

  assert.match(report, /useState<number\[\]>\(\[\]\)/);
  assert.match(report, /setSelectedMonths\(\[\]\)/);
  assert.match(html, /<b>0(?:<!-- -->)? MESES<\/b>/);
  assert.match(html, /type="checkbox"\/>ENE/);
  assert.match(html, /type="checkbox"\/>DIC/);
  assert.match(monthFilter, /<summary>MES<\/summary>/);
  assert.match(monthFilter, /onPeriodChange\(nextSelectedMonths\.length > 0 \? "MES" : "ANUAL"\)/);
});

test("chain view filters are bidirectionally faceted", () => {
  const rows = [
    { ...payload.rows[0], chain: "HUSH PUPPIES", brand: "HUSH PUPPIES", business: "BRICK & LIFE", class: "CALZADO" },
    { ...payload.rows[0], chain: "HUSH PUPPIES", brand: "COLUMBIA", business: "BRICK & LIFE", class: "VESTUARIO" },
    { ...payload.rows[0], chain: "COLUMBIA.CL", brand: "COLUMBIA", business: "ECOMMERCE", class: "VESTUARIO" },
    { ...payload.rows[0], chain: "ROCKFORD", brand: "ROCKFORD", business: "BRICK & LIFE", class: "CALZADO" },
  ];

  assert.deepEqual(salesMarginChainsForFilters(rows, ["HUSH PUPPIES"], [], []), ["HUSH PUPPIES"]);
  assert.deepEqual(salesMarginBrandsForFilters(rows, [], [], ["COLUMBIA.CL"]), ["COLUMBIA"]);
  assert.deepEqual(salesMarginChannelsForFilters(rows, [], [], ["COLUMBIA.CL"]), ["ECOMMERCE"]);
  assert.deepEqual(salesMarginClassesForFilters(rows, [], [], ["HUSH PUPPIES"]), ["CALZADO", "VESTUARIO"]);

  const reconciled = reconcileSalesMarginFilters(rows, {
    brands: ["COLUMBIA", "ROCKFORD"],
    channels: ["BRICK & LIFE", "ECOMMERCE"],
    chains: ["COLUMBIA.CL"],
    classes: ["CALZADO", "VESTUARIO"],
  }, "chains");
  assert.deepEqual(reconciled, {
    brands: ["COLUMBIA"],
    channels: ["ECOMMERCE"],
    chains: ["COLUMBIA.CL"],
    classes: ["VESTUARIO"],
  });
});

test("a single selected brand hides the redundant consolidated row", () => {
  const singleBrandRows = [
    { ...payload.rows[0], brand: "MARCA A", business: "BRICK & LIFE", sales: 10, marginAmount: 4 },
    { ...payload.rows[0], brand: "MARCA A", business: "ECOMMERCE", sales: 20, marginAmount: 8 },
  ];
  const brandRows = buildDisplayRows(singleBrandRows, "brand", "ANUAL", [1, 2, 3], false);
  assert.deepEqual(brandRows.map((row) => row.primary), ["MARCA A"]);

  const brandChannelRows = buildDisplayRows(singleBrandRows, "brandChannel", "ANUAL", [1, 2, 3], false);
  assert.deepEqual(brandChannelRows.map(({ primary, secondary }) => [primary, secondary]), [
    ["MARCA A", "BRICK & LIFE"],
    ["MARCA A", "ECOMMERCE"],
    ["MARCA A", "TOTAL"],
  ]);
  assert.equal(brandChannelRows.some((row) => row.primary === "CONSOLIDADO"), false);

  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  assert.match(report, /brandFilter\.length !== 1/);
});

test("the initial query loads visible years and defers the chain dimension", () => {
  const route = readFileSync(new URL("../app/api/sales-margin/route.ts", import.meta.url), "utf8");
  
  const defaultYearsMatch = route.match(
    /const defaultYears\s*=\s*\[([\s\S]*?)\]\s*as const/
  );

  assert.ok(defaultYearsMatch);

  const parsedYears = [
    ...defaultYearsMatch[1].matchAll(/"([^"]+)"/g)
  ].map((match) => match[1]);

  assert.deepEqual(parsedYears, [
    "2024", "2025", "2026E",
    "2026P", "2027P", "2027M",
  ]);

  assert.match(route, /WHERE scenario IN \(\$\{years\.map/);
  assert.match(route, /const queryForYears = \(years: string\[\], includeChain: boolean, chainMonths: number\[\] \| null\)/);
  assert.match(route, /\$\{includeChain \? "chain" : "''"\} chain/);
  assert.match(route, /chainYears: includeChain \? years : \[\]/);
  assert.match(route, /annualChainSummary = includeChain && chainMonths === null/);
  assert.match(route, /"0 month, 'ANUAL' quarter,"/);
  assert.match(route, /month IN \(\$\{chainMonths\.join\(", "\)\}\)/);
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
  const defaults = ["2024", "2025", "2026E", "2026P", "2027P", "2027M"];
  await loadSalesMargin("user-a", false, defaults);
  const expanded = await loadSalesMargin("user-a", false, [...defaults, "2020"]);
  assert.deepEqual(requests, [defaults, ["2020"]]);
  assert.deepEqual(expanded.years, ["2020", ...defaults]);
  assert.equal(expanded.rows.some((row) => row.scenario === "2020"), true);
  await loadSalesMargin("user-a", false, [...defaults, "2020"]);
  assert.equal(fetch.mock.callCount(), 2);
});

test("the chain dimension is loaded on demand when opening Chain by brand", async () => {
  const requests = [];
  mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(String(input), "http://localhost");
    const years = url.searchParams.get("years").split(",");
    const includeChain = url.searchParams.get("includeChain") === "1";
    requests.push({ years, includeChain });
    return Response.json({
      ...payload,
      years,
      chainYears: includeChain ? years : [],
      rows: years.map((scenario) => ({
        ...payload.rows[0],
        scenario,
        chain: includeChain ? "HUSH PUPPIES" : "",
      })),
    });
  });

  const defaults = [...salesMarginDefaultYears];
  await loadSalesMargin("user-chain", false, defaults);
  const expanded = await loadSalesMargin("user-chain", false, defaults, true);

  assert.deepEqual(requests, [
    { years: defaults, includeChain: false },
    { years: defaults, includeChain: true },
  ]);
  assert.deepEqual(expanded.chainYears, defaults);
  assert.equal(expanded.rows.every((row) => row.chain === "HUSH PUPPIES"), true);
});

test("Chain by brand caches annual and selected-month datasets independently", async () => {
  const requests = [];
  mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(String(input), "http://localhost");
    const months = url.searchParams.get("months");
    requests.push(months);
    return Response.json({
      ...payload,
      chainYears: [...salesMarginDefaultYears],
      chainPeriodKey: months ? months.replaceAll(",", "-") : "annual",
      rows: [{
        ...payload.rows[0],
        month: months ? Number(months.split(",")[0]) : 0,
        quarter: months ? "Q1" : "ANUAL",
        chain: "HUSH PUPPIES",
      }],
    });
  });

  const years = [...salesMarginDefaultYears];
  const annual = await loadSalesMargin("user-period", false, years, true);
  const quarter = await loadSalesMargin("user-period", false, years, true, [1, 2, 3]);
  const cachedAnnual = await loadSalesMargin("user-period", false, years, true);

  assert.deepEqual(requests, [null, "1,2,3"]);
  assert.equal(annual.chainPeriodKey, "annual");
  assert.equal(quarter.chainPeriodKey, "1-2-3");
  assert.equal(cachedAnnual.chainPeriodKey, "annual");
});

test("Chain by brand paginates chain groups and vertically centers their merged cell", () => {
  const report = readFileSync(new URL("../app/sales-margin/SalesMargin.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(report, /const chainPageSize = 8/);
  assert.match(report, /pageChains\.has\(row\.primary\)/);
  assert.match(report, /className="sales-margin-chain-pagination"/);
  assert.match(styles, /\.sales-margin-table\.view-chainBrand tbody th\[scope="rowgroup"\][\s\S]*vertical-align: middle/);
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
