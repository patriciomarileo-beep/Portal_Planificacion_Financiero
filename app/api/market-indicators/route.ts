import { calendarDate, parseFredSeries } from "../../market/indicator-data";
import { loadDollarHistory } from "../_shared/dollar-history";
export const runtime = "nodejs";

type SeriesPoint = { fecha: string; valor: number };
type MindicadorResponse = {
  nombre?: string;
  unidad_medida?: string;
  serie?: SeriesPoint[];
};

const INDICATORS = [
  { id: "dolar", label: "Dólar observado", code: "dolar", unit: "CLP" },
  { id: "uf", label: "Unidad de Fomento", code: "uf", unit: "CLP" },
  { id: "cobre", label: "Libra de cobre", code: "libra_cobre", unit: "USD/lb" },
] as const;

const normalizeDate = (value: string) => calendarDate(value);

async function getDollar() {
  const data = await loadDollarHistory();
  const series = data.points.slice(-12), latest = series.at(-1)!, previous = series.at(-2) ?? latest;
  return {
    id: "dolar", label: "Dólar observado", value: latest.value, unit: "CLP", date: latest.date,
    change: ((latest.value - previous.value) / previous.value) * 100,
    history: series.map(point => point.value), source: data.source,
  };
}

async function getMindicador(item: (typeof INDICATORS)[number]) {
  const response = await fetch(`https://mindicador.cl/api/${item.code}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Mindicador ${item.code}: ${response.status}`);
  const data = await response.json() as MindicadorResponse;
  const series = (data.serie ?? []).filter((point) => Number.isFinite(point.valor) && calendarDate(point.fecha)).slice(0, 12);
  if (!series.length) throw new Error(`Sin datos para ${item.code}`);
  const latest = series[0];
  const previous = series[1] ?? latest;
  return {
    id: item.id,
    label: item.label,
    value: latest.valor,
    unit: item.unit,
    date: normalizeDate(latest.fecha)!,
    change: previous.valor ? ((latest.valor - previous.valor) / previous.valor) * 100 : 0,
    history: [...series].reverse().map((point) => point.valor),
    source: "Banco Central de Chile · mindicador.cl",
  };
}

async function getBrentFromFred() {
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - 45);
  const cosd = startDate.toISOString().slice(0, 10);
  const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU&cosd=${cosd}`, {
    headers: { accept: "text/csv" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`FRED Brent: ${response.status}`);
  const rows = parseFredSeries(await response.text());
  if (!rows.length) throw new Error("Sin datos para petróleo Brent");
  const latest = rows.at(-1)!;
  const previous = rows.at(-2) ?? latest;
  return {
    id: "petroleo",
    label: "Petróleo Brent",
    value: latest.value,
    unit: "USD/barril",
    date: latest.date,
    change: previous.value ? ((latest.value - previous.value) / previous.value) * 100 : 0,
    history: rows.map((row) => row.value),
    source: "U.S. EIA · FRED",
  };
}

async function getBrentFallback() {
  const response = await fetch("https://croncopia.com/api/energy/brent_crude.json", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Croncopia Brent: ${response.status}`);
  const data = await response.json() as { price?: number; timestamp?: string };
  if (!Number.isFinite(data.price) || !calendarDate(data.timestamp)) throw new Error("Sin datos para petróleo Brent");
  return {
    id: "petroleo",
    label: "Petróleo Brent",
    value: data.price!,
    unit: "USD/barril",
    date: calendarDate(data.timestamp)!,
    change: 0,
    history: [data.price!],
    source: "Croncopia commodity feed",
  };
}

async function getBrent() {
  try {
    return await getBrentFromFred();
  } catch {
    return getBrentFallback();
  }
}

export async function GET() {
  const results = await Promise.allSettled([...INDICATORS.map(item => item.id === "dolar" ? getDollar() : getMindicador(item)), getBrent()]);
  const indicators = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const unavailable = results.flatMap((result, index) => result.status === "rejected"
    ? [index < INDICATORS.length ? INDICATORS[index].id : "petroleo"]
    : []);
  if (indicators.length) {
    return Response.json(
      { indicators, unavailable, updatedAt: new Date().toISOString() },
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  }
  return Response.json(
    { error: "No fue posible actualizar los indicadores", unavailable },
    { status: 502, headers: { "cache-control": "no-store" } },
  );
}
