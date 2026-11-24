import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register(
  "../scripts/test-typescript-loader.mjs",
  import.meta.url,
);

const {
  addMetric,
  buildStores,
  emptyMetric,
  metricFrom,
} = await import(
  "../modules/profitability-bl/domain/store-analysis.ts"
);

const makeRow = ({
  year = 2026,
  month = "TOTAL",
  period = "ANUAL",
  code = "210101",
  chain = "HP",
  name = "H.P. Arica",
  sales = 100,
  fourWalls = 12,
} = {}) => [
  year,
  month,
  period,
  code,
  chain,
  name,
  sales,
  50,
  -10,
  -5,
  -3,
  -4,
  -2,
  -1,
  -20,
  -6,
  7,
  fourWalls,
];

test(
  "metricFrom preserves financial signs and Four Walls",
  () => {
    const metric = metricFrom(makeRow());

    assert.equal(metric.sales, 100);
    assert.equal(metric.margin, 50);
    assert.equal(metric.payroll, -10);
    assert.equal(metric.rent, -5);
    assert.equal(metric.operatingCost, -20);
    assert.equal(metric.operatingResult, 30);
    assert.equal(metric.ebitda, 17);
    assert.equal(metric.fourWalls, 12);
    assert.equal(metric.fwAvailable, 1);
  },
);

test(
  "metricFrom calculates the Four Walls fallback",
  () => {
    const metric = metricFrom(
      makeRow({ fourWalls: null }),
    );

    assert.equal(metric.fourWalls, 14);
    assert.equal(metric.fwAvailable, 0);
  },
);

test(
  "addMetric accumulates values without fabricating Four Walls",
  () => {
    const result = addMetric(
      emptyMetric(),
      emptyMetric(),
    );

    assert.equal(result.sales, 0);
    assert.equal(result.fourWalls, null);
    assert.equal(result.fwAvailable, 0);
  },
);

test(
  "buildStores groups annual and monthly records by store",
  () => {
    const rows = [
      makeRow(),
      makeRow({
        month: "ENERO",
        period: "MENSUAL",
        sales: 25,
      }),
      makeRow({
        code: "#N/A",
        name: "Registro inválido",
      }),
    ];

    const stores = buildStores(rows);

    assert.equal(stores.length, 1);
    assert.equal(
      stores[0].chain,
      "Hush Puppies",
    );
    assert.equal(
      stores[0].annual[2026].sales,
      100,
    );
    assert.equal(
      stores[0].monthly[2026].ENERO.sales,
      25,
    );
  },
);