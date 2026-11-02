import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { GoogleAuth } from "google-auth-library";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cosmeticsReport } from "../app/api/_shared/cosmetics-imports";
import { GET } from "../app/api/importaciones-cosmeticos/route";
import { createSessionCookie } from "../app/api/_shared/session";
import { aggregateImportRows } from "../app/market/imports-data";
import ImportacionesIndustria from "../app/market/ImportacionesIndustria";

const originalEnv = { ...process.env };
let sequence = 0;
afterEach(() => {
  mock.restoreAll();
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
const options = { years: [2024, 2025, 2026], classes: ["MAQUILLAJE"], importers: ["IMPORTADOR COSMETICOS"], brands: ["L'OREAL"], segments: ["CREMAS"], units: ["KILOGRAMOS NETOS", "UNIDADES"], latestPeriod: 202603 };
const report = { overview: { rows_count: 2, cantidad: 30, us_fob: 120, fob_unitario: 4 }, comparison: { current_year: 2026, previous_year: 2025, through_month: 3, current_fob: 70, previous_fob: 50 }, trend: [], importers: [], importerAnalysis: [], brandAnalysis: [], segmentAnalysis: [], categoryAnalysis: [], originAnalysis: [], breakdown: [] };
const setup = () => {
  Object.assign(process.env, { NODE_ENV: "production", AUTH_SESSION_SECRET: "imports-test-" + "x".repeat(48), BIGQUERY_COSMETICS_TABLE: `fixture-project.silver.cosmetics_${++sequence}` });
  mock.method(GoogleAuth.prototype, "getAccessToken", async () => "test-access-token");
  const state = { active: true, unavailable: false, queries: [] };
  mock.method(globalThis, "fetch", async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.query.startsWith("SELECT id_persona")) return Response.json({ rows: state.active ? [{ f: ["42", "Persona", "Prueba", "", "ADMINISTRADOR"].map(v => ({ v })) }] : [] });
    if (body.query.includes("ft_cl_planificacion_TB_ROLES_PLT_FINAN")) return Response.json({ rows: [{ f: [{ v: "ADMINISTRADOR" }] }] });
    state.queries.push(body);
    if (state.unavailable) return Response.json({ error: { message: "cosmetics-unavailable-sentinel" } }, { status: 403 });
    return Response.json({ jobComplete: true, rows: [{ f: [{ v: JSON.stringify(body.query.includes("AS latestPeriod") ? options : report) }] }] });
  });
  return state;
};
const adminRequest = async () => new Request("https://portal.example.com/api/importaciones-cosmeticos", { headers: { cookie: await createSessionCookie({ email: "persona@forus.cl", name: "Persona", role: "ADMINISTRADOR", personId: "42" }) } });

test("cosmetics report uses its own source, actual years and one measurement unit", async () => {
  const state = setup();
  const result = await cosmeticsReport(new URLSearchParams());
  assert.equal(result.source, process.env.BIGQUERY_COSMETICS_TABLE);
  assert.equal(result.unit, "KILOGRAMOS NETOS");
  assert.equal(result.quantityLabel, "KG NETOS");
  assert.deepEqual(result.options.years, [2024, 2025, 2026]);
  assert.equal(result.coverage.latestPeriod, 202603);
  const dataQuery = state.queries.at(-1);
  const params = Object.fromEntries(dataQuery.queryParameters.map(p => [p.name, p.parameterValue.value]));
  assert.equal(params.currentYear, "2026");
  assert.equal(params.comparisonMonth, "3");
  assert.match(dataQuery.query, /comparison_scope AS \(SELECT \* FROM scope WHERE mes <= @comparisonMonth\)/);
  assert.doesNotMatch(dataQuery.query, /CALZADO|VESTUARIO|FORUS|anio >= 2023/);
});

test("cosmetics filters remain parameterized and half-year, quarter and month scopes are applied", async () => {
  const state = setup();
  for (const period of ["ANUAL", "H1", "H2", "Q2", "MES"]) {
    await cosmeticsReport(new URLSearchParams({ period, month: "8", years: "2025", classes: "MAQUILLAJE", importers: "IMPORTADOR COSMETICOS", brands: "L'OREAL", segments: "CREMAS" }));
    const query = state.queries.at(-1);
    const params = Object.fromEntries(query.queryParameters.map(p => [p.name, p.parameterValue.value]));
    assert.equal(params.brands, "L'OREAL");
    assert.equal(params.comparisonMonth, "12");
    assert.doesNotMatch(query.query, /L'OREAL/);
    assert.match(query.query, /marca IN UNNEST\(SPLIT\(@brands/);
    if (period === "H1") assert.match(query.query, /mes BETWEEN 1 AND 6/);
    if (period === "H2") assert.match(query.query, /mes BETWEEN 7 AND 12/);
    if (period === "Q2") assert.equal(params.quarter, "2");
    if (period === "MES") assert.equal(params.month, "8");
  }
});

test("invalid period, month and unknown category, year or unit are rejected", async () => {
  setup();
  for (const filter of [{ period: "INVALID" }, { month: "1.5" }, { month: "13" }, { years: "2019" }, { classes: "CALZADO" }, { unit: "PARES" }]) {
    await assert.rejects(cosmeticsReport(new URLSearchParams(filter)), error => error.status === 400);
  }
});

test("cached cosmetics data still requires a currently active portal user", async () => {
  const state = setup();
  const request = await adminRequest();
  assert.equal((await GET(request)).status, 200);
  const queryCount = state.queries.length;
  state.active = false;
  assert.equal((await GET(request)).status, 401);
  assert.equal(state.queries.length, queryCount);
});

test("cosmetics failures do not return a retail snapshot or internal errors", async () => {
  const state = setup();
  state.unavailable = true;
  const response = await GET(await adminRequest());
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /sentinel|CALZADO|overview|snapshot/);
});

test("monthly aggregates and full-year totals remain correct for paginated tables", () => {
  const matrix = aggregateImportRows([
    { item: "A", anio: 2024, mes: 1, cantidad: "10.5", us_fob: "40" },
    { item: "A", anio: 2024, mes: 2, cantidad: "9.5", us_fob: "60" },
    { item: "B", anio: 2024, mes: 1, cantidad: "5", us_fob: "30" },
    { item: "A", anio: 2025, mes: 1, cantidad: null, us_fob: "15" },
  ]);
  assert.equal(matrix.valueFor("A", 2024, "cantidad"), 20);
  assert.equal(matrix.valueFor("A", 2024, "us_fob"), 100);
  assert.equal(matrix.totalFor(2024, "cantidad"), 25);
  assert.equal(matrix.totalFor(2024, "us_fob"), 130);
  assert.equal(matrix.totalFor(2025, "us_fob"), 15);
  assert.equal(matrix.valueFor("B", 2025, "cantidad"), 0);
});

test("cosmetics uses the retail report design with cosmetics-specific labels and sheets", () => {
  const cosmetics = renderToStaticMarkup(createElement(ImportacionesIndustria, { variant: "cosmetics" }));
  const retail = renderToStaticMarkup(createElement(ImportacionesIndustria));
  assert.match(cosmetics, /imports-workbench/);
  assert.match(cosmetics, /Importaciones Cosméticos/);
  assert.match(cosmetics, /Kilogramos netos/);
  assert.match(cosmetics, /Tipos por categoría/);
  assert.match(cosmetics, /País de origen/);
  assert.doesNotMatch(cosmetics, /Calzado|Vestuario|Pares y unidades/);
  assert.match(retail, /Importaciones Industria Retail/);
  assert.match(retail, /Calzado/);
});
