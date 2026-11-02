import assert from "node:assert/strict";
import { test, afterEach, mock } from "node:test";
import { calendarDate, indicatorDateLabel, parseFredSeries, parseMarketIndicators } from "../app/market/indicator-data.ts";
import { GET } from "../app/api/market-indicators/route.ts";
afterEach(() => mock.restoreAll());
const badFred = '<html>\n<link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600">\n</html>';
const valid = { id: "dolar", label: "Dólar", value: 978.56, unit: "CLP", date: "2026-10-21", change: 1, history: [977, 978.56], source: "BCCh" };

test("HTML containing a numeric font weight cannot become an oil price", () => {
  assert.throws(() => parseFredSeries(badFred));
});
test("FRED CSV accepts valid observations and skips missing or impossible dates", () => {
  assert.deepEqual(parseFredSeries("observation_date,DCOILBRENTEU\n2026-10-19,82.50\n2026-10-20,.\n2026-10-21,83.2\n2026-02-30,100\n2026-10-22,"), [{ date: "2026-10-19", value: 82.5 }, { date: "2026-10-21", value: 83.2 }]);
  assert.equal(parseFredSeries("DATE,DCOILBRENTEU\n2026-10-21,83.2")[0].value, 83.2);
});
test("invalid dates cannot crash the date formatter", () => {
  assert.equal(calendarDate("2026-02-30"), null);
  assert.equal(calendarDate("2024-02-29T00:00:00Z"), "2024-02-29");
  assert.equal(indicatorDateLabel('<link href="fonts">'), "Fecha no disponible");
  assert.equal(indicatorDateLabel(null), "Fecha no disponible");
});
test("a malformed cached indicator is discarded without losing valid indicators", () => {
  const data = parseMarketIndicators({ indicators: [valid, { ...valid, id: "petroleo", value: 400, date: '<link href="fonts">' }, { ...valid, id: "unknown" }] });
  assert.deepEqual(data, [valid]);
  for (const payload of [null, {}, { indicators: null }, { indicators: [null] }]) assert.deepEqual(parseMarketIndicators(payload), []);
});
function upstream(fallback) {
  mock.method(globalThis, "fetch", async url => {
    if (String(url).includes("mindicador.cl")) return Response.json({ serie: [{ fecha: "2026-10-21T00:00:00Z", valor: 10 }] });
    if (String(url).includes("bcentral.cl") || String(url).includes("sii.cl")) return new Response("Unavailable", { status: 503 });
    if (String(url).includes("fred.stlouisfed.org")) return new Response(badFred, { headers: { "content-type": "text/html" } });
    return fallback;
  });
}
test("a bad FRED response uses the valid fallback", async () => {
  upstream(Response.json({ price: 82.5, timestamp: "2026-10-21T12:00:00Z" }));
  const response = await GET(), payload = await response.json();
  assert.equal(response.status, 200);
  const oil = payload.indicators.find(item => item.id === "petroleo");
  assert.equal(oil.value, 82.5); assert.equal(oil.date, "2026-10-21"); assert.equal(parseMarketIndicators(payload).length, 4);
});
test("unavailable oil providers do not prevent the other indicators from loading", async () => {
  upstream(new Response("Unavailable", { status: 503 }));
  const payload = await (await GET()).json();
  assert.equal(payload.indicators.length, 3); assert.deepEqual(payload.unavailable, ["petroleo"]);
  assert.equal(parseMarketIndicators(payload).length, 3);
});
test("an invalid fallback timestamp is also rejected", async () => {
  upstream(Response.json({ price: 82.5, timestamp: "invalid" }));
  const payload = await (await GET()).json();
  assert.equal(payload.indicators.some(item => item.id === "petroleo"), false);
});

test("the home dollar indicator loads from Banco Central when mindicador is unavailable", async () => {
  const { dollarHistoryWindow } = await import("../app/market/dollar-history-data.ts");
  const { end } = dollarHistoryWindow(), year = Number(end.slice(0, 4)), month = Number(end.slice(5, 7));
  const cells = Array.from({ length: 12 }, (_, index) => `<td>${index + 1 === month ? "978,56" : ""}</td>`).join("");
  mock.method(globalThis, "fetch", async url => {
    const address = String(url);
    if (address.includes("IndicadoresDiarios")) return new Response('<a id="hypLnk1_3" href="Serie.aspx?gcode=PRE_TCO&amp;param=public">Ver serie</a>');
    if (address.includes("bcentral.cl")) return new Response(`<label id="lblAnioValor">${year}</label><table id="gr"><tr><td>1</td>${cells}</tr></table>`);
    if (address.includes("sii.cl")) return new Response('<table id="table_export"><tr><th>1</th><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>970,00</td><td>970,00</td></tr></table>');
    return new Response("Unavailable", { status: 503 });
  });
  const payload = await (await GET()).json();
  assert.equal(payload.indicators.find(item => item.id === "dolar").value, 978.56);
  assert.ok(!payload.unavailable.includes("dolar"));
});
