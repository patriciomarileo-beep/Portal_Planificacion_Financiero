import assert from "node:assert/strict";
import { test, afterEach, mock } from "node:test";
import { dollarHistoryWindow, parseBcentralDollarSeries, parseSiiDollarSeries, parseMindicadorDollarSeries, summarizeDollarHistory } from "../app/market/dollar-history-data.ts";
import { GET } from "../app/api/dollar-history/route.ts";

afterEach(() => mock.restoreAll());
const row = (day, values) => `<tr><th>${day}</th>${Array.from({ length: 12 }, (_, index) => `<td>${values[index + 1] ?? "&nbsp;"}</td>`).join("")}</tr>`;
const table = (...rows) => `<table id="table_export"><tbody>${rows.join("")}</tbody></table>`;

test("Banco Central annual values require the expected year and table", () => {
  const html = '<label id="lblAnioValor">2026</label>' + table(row(21, { 10: '<span class="obs">978,56</span>' })).replace('id="table_export"', 'id="gr"');
  assert.deepEqual(parseBcentralDollarSeries(html, 2026), [{ date: "2026-10-21", value: 978.56 }]);
  assert.throws(() => parseBcentralDollarSeries(html, 2027));
  assert.throws(() => parseBcentralDollarSeries('<label id="lblAnioValor">2026</label><html>Unavailable</html>', 2026));
});

test("SII decimal commas, thousands and blank days are parsed without inventing observations", () => {
  const html = table(row(1, { 8: "917,66", 9: "1.012,34", 10: "0" }), row(2, { 8: "<strong>918,20</strong>", 9: "bad data" }));
  assert.deepEqual(parseSiiDollarSeries(html, 2026), [
    { date: "2026-08-01", value: 917.66 }, { date: "2026-08-02", value: 918.2 }, { date: "2026-09-01", value: 1012.34 },
  ]);
  assert.throws(() => parseSiiDollarSeries('<html>Unavailable 500</html>', 2026));
  assert.throws(() => parseSiiDollarSeries(table(row(1, {})), 2026));
});

test("impossible dates are rejected and leap days are preserved", () => {
  const html = table(row(29, { 2: "900,10" }), row(31, { 4: "900,20" }));
  assert.throws(() => parseSiiDollarSeries(html, 2026));
  assert.deepEqual(parseSiiDollarSeries(html, 2024), [{ date: "2024-02-29", value: 900.1 }]);
  assert.deepEqual(parseMindicadorDollarSeries({ serie: [{ fecha: "invalid", valor: 900 }, { fecha: "2026-10-21", valor: 0 }, { fecha: "2026-10-21T03:00:00Z", valor: 978.56 }] }), [{ date: "2026-10-21", value: 978.56 }]);
});

test("the three-month window respects Chile time and changes of year", () => {
  assert.deepEqual(dollarHistoryWindow(new Date("2027-01-01T02:00:00Z")), { start: "2026-10-01", end: "2026-12-31", years: [2026] });
  assert.deepEqual(dollarHistoryWindow(new Date("2027-01-10T12:00:00Z")), { start: "2026-11-01", end: "2027-01-10", years: [2026, 2027] });
});

test("averages count each observed business day once and exclude future or old values", () => {
  const result = summarizeDollarHistory([
    { date: "2026-08-03", value: 900 }, { date: "2026-08-03", value: 900 }, { date: "2026-08-04", value: 920 },
    { date: "2026-09-01", value: 930 }, { date: "2026-10-01", value: 940 },
    { date: "2026-07-31", value: 10 }, { date: "2026-10-22", value: 999 },
  ], new Date("2026-10-21T12:00:00Z"));
  assert.equal(result.points.length, 4);
  assert.equal(result.months[0].average, 910);
  assert.equal(result.months[0].observations, 2);
  assert.deepEqual(result.months.map(month => month.closed), [true, true, false]);
  assert.equal(result.lastObservation, "2026-10-01");
  assert.throws(() => summarizeDollarHistory([], new Date("2026-10-21")));
});

test("the endpoint uses the SII backup when Banco Central is unavailable", async () => {
  const now = new Date(), { end } = dollarHistoryWindow(now), month = Number(end.slice(5, 7));
  const requests = [];
  mock.method(globalThis, "fetch", async url => {
    requests.push(String(url));
    if (String(url).includes("bcentral.cl")) return new Response("Unavailable", { status: 503 });
    assert.ok(String(url).startsWith("https://www.sii.cl/"));
    return new Response(table(row(1, { [month]: "978,56", 11: "960,00", 12: "970,00" })));
  });
  const response = await GET(), payload = await response.json();
  assert.equal(response.status, 200);
  assert.ok(payload.points.length > 0);
  assert.ok(payload.source.includes("SII"));
  assert.ok(requests.length <= 3);
});

test("the endpoint loads the current official Banco Central series without backups", async () => {
  const { end } = dollarHistoryWindow(), year = Number(end.slice(0, 4)), month = Number(end.slice(5, 7));
  mock.method(globalThis, "fetch", async url => {
    if (String(url).includes("sii.cl")) return new Response(table(row(1, { 11: "960,00", 12: "970,00" })));
    assert.ok(String(url).startsWith("https://si3.bcentral.cl/"));
    if (String(url).includes("IndicadoresDiarios")) return new Response('<a id="hypLnk1_3" href="Serie.aspx?gcode=PRE_TCO&amp;param=public">Ver serie</a>');
    return new Response(`<label id="lblAnioValor">${year}</label>` + table(row(1, { [month]: "978,56" })).replace('id="table_export"', 'id="gr"'));
  });
  const response = await GET(), payload = await response.json();
  assert.equal(response.status, 200);
  assert.ok(payload.source.includes("Banco Central de Chile"));
  assert.ok(!payload.source.includes("mindicador"));
  assert.ok(payload.points.length > 0);
});

test("the backup is used when SII returns HTML without its table", async () => {
  const { end, years } = dollarHistoryWindow();
  mock.method(globalThis, "fetch", async url => {
    if (String(url).includes("bcentral.cl")) return new Response("Unavailable", { status: 503 });
    if (String(url).includes("sii.cl")) return new Response("<html>Unavailable</html>");
    const year = Number(String(url).split("/").at(-1));
    return Response.json({ serie: [{ fecha: year === years.at(-1) ? end : `${year}-12-01`, valor: 978.56 }] });
  });
  const payload = await (await GET()).json();
  assert.equal(payload.source, "Banco Central de Chile · mindicador.cl");
  assert.equal(payload.lastObservation, end);
});

test("failure of both providers returns a retryable error without caching a blank chart", async () => {
  mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
  mock.method(console, "error", () => {});
  const response = await GET(), payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(payload.error.includes("Intenta nuevamente"));
  assert.equal(payload.points, undefined);
});
