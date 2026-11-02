import { dollarHistoryWindow, parseBcentralDollarSeries, parseMindicadorDollarSeries, parseSiiDollarSeries, summarizeDollarHistory } from "../../market/dollar-history-data";

async function getBcentral(year: number) {
  const sourceUrl = "https://si3.bcentral.cl/indicadoressiete/secure/IndicadoresDiarios.aspx?Idioma=es-CL";
  const options = { headers: { accept: "text/html" }, next: { revalidate: 3600 } };
  const index = await fetch(sourceUrl, { ...options, signal: AbortSignal.timeout(5000) });
  if (!index.ok) throw new Error(`Banco Central index: ${index.status}`);
  const html = await index.text();
  const href = html.match(/<a\b[^>]*\bid=["']hypLnk1_3["'][^>]*\bhref=["']([^"']+)["']/i)?.[1];
  if (!href) throw new Error("Dollar series link unavailable.");
  const seriesUrl = new URL(href.replace(/&amp;/g, "&"), sourceUrl);
  if (seriesUrl.origin !== "https://si3.bcentral.cl" || seriesUrl.pathname.toLowerCase() !== "/indicadoressiete/secure/serie.aspx" || seriesUrl.searchParams.get("gcode") !== "PRE_TCO") throw new Error("Unexpected dollar series URL.");
  const response = await fetch(seriesUrl, { ...options, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Banco Central series: ${response.status}`);
  return { points: parseBcentralDollarSeries(await response.text(), year), source: "Banco Central de Chile", sourceUrl };
}

async function getYear(year: number, start: string, end: string) {
  if (year === Number(end.slice(0, 4))) {
    try {
      const result = await getBcentral(year);
      if (result.points.some(point => point.date >= start && point.date <= end)) return result;
    } catch { /* The SII annual table is the independent official backup. */ }
  }
  const sourceUrl = `https://www.sii.cl/valores_y_fechas/dolar/dolar${year}.htm`;
  try {
    const response = await fetch(sourceUrl, {
      headers: { accept: "text/html" }, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`SII dollar ${year}: ${response.status}`);
    const points = parseSiiDollarSeries(await response.text(), year);
    if (!points.some(point => point.date >= start && point.date <= end)) throw new Error("SII has no observations for this period.");
    return { points, source: "Banco Central de Chile · SII", sourceUrl };
  } catch {
    const response = await fetch(`https://mindicador.cl/api/dolar/${year}`, {
      headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Mindicador dollar ${year}: ${response.status}`);
    const points = parseMindicadorDollarSeries(await response.json());
    if (!points.some(point => point.date >= start && point.date <= end)) throw new Error("No dollar history for this period.");
    return { points, source: "Banco Central de Chile · mindicador.cl", sourceUrl: "https://mindicador.cl/" };
  }
}

export async function loadDollarHistory() {
  const now = new Date(), { start, end, years } = dollarHistoryWindow(now);
  const results = await Promise.all(years.map(year => getYear(year, start, end)));
  return {
    ...summarizeDollarHistory(results.flatMap(result => result.points), now),
    source: [...new Set(results.map(result => result.source))].join(" / "),
    sourceUrl: results.at(-1)!.sourceUrl,
    updatedAt: now.toISOString(),
  };
}
