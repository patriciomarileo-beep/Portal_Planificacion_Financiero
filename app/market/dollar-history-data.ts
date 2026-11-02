import { calendarDate } from "./indicator-data";

export type DollarObservation = { date: string; value: number };
export type DollarHistoryPayload = {
  points: (DollarObservation & { average: number; month: string })[];
  months: { key: string; label: string; average: number; observations: number; closed: boolean }[];
  source: string;
  sourceUrl: string;
  updatedAt: string;
  lastObservation: string;
};

export const dollarHistoryWindow = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  const year = part("year"), month = part("month");
  const end = `${year}-${String(month).padStart(2, "0")}-${String(part("day")).padStart(2, "0")}`;
  const start = new Date(Date.UTC(year, month - 3, 1)).toISOString().slice(0, 10);
  return { start, end, years: [...new Set([Number(start.slice(0, 4)), year])] };
};

// The SII annual table uses a decimal comma; blank cells are not zero values.
const parseAnnualDollarTable = (table: string | undefined, year: number): DollarObservation[] => {
  if (!table) throw new Error("The provider did not return its annual dollar table.");
  const points: DollarObservation[] = [];
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
      .map(cell => cell[1].replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;|\u00a0/gi, " ").trim());
    if (cells.length !== 13 || !/^\d{1,2}$/.test(cells[0])) continue;
    for (let month = 1; month <= 12; month++) {
      const raw = cells[month];
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)) continue;
      const value = Number(raw.replace(/\./g, "").replace(",", "."));
      const date = calendarDate(`${year}-${String(month).padStart(2, "0")}-${cells[0].padStart(2, "0")}`);
      if (date && Number.isFinite(value) && value > 0) points.push({ date, value });
    }
  }
  if (!points.length) throw new Error("No valid dollar observations in the annual table.");
  return points.sort((a, b) => a.date.localeCompare(b.date));
};

export const parseSiiDollarSeries = (html: string, year: number) => parseAnnualDollarTable(
  html.match(/<table\b[^>]*\bid=["']table_export["'][^>]*>([\s\S]*?)<\/table>/i)?.[1], year,
);

export const parseBcentralDollarSeries = (html: string, year: number) => {
  const publishedYear = html.match(/<label\b[^>]*\bid=["']lblAnioValor["'][^>]*>\s*(\d{4})\s*<\/label>/i)?.[1];
  if (Number(publishedYear) !== year) throw new Error("Banco Central returned a different year.");
  return parseAnnualDollarTable(html.match(/<table\b[^>]*\bid=["']gr["'][^>]*>([\s\S]*?)<\/table>/i)?.[1], year);
};

export const parseMindicadorDollarSeries = (payload: unknown): DollarObservation[] => {
  if (!payload || typeof payload !== "object" || !("serie" in payload) || !Array.isArray(payload.serie)) throw new Error("Invalid dollar history response.");
  return payload.serie.flatMap((point: unknown) => {
    if (!point || typeof point !== "object") return [];
    const item = point as Record<string, unknown>, date = calendarDate(item.fecha);
    return date && typeof item.valor === "number" && Number.isFinite(item.valor) && item.valor > 0 ? [{ date, value: item.valor }] : [];
  });
};

export const summarizeDollarHistory = (observations: DollarObservation[], now = new Date()) => {
  const { start, end } = dollarHistoryWindow(now);
  const unique = new Map(observations.filter(point => calendarDate(point.date) && Number.isFinite(point.value) && point.value > 0 && point.date >= start && point.date <= end).map(point => [point.date, point]));
  const sorted = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) throw new Error("No dollar observations in the requested period.");
  const grouped = new Map<string, { total: number; count: number }>();
  for (const point of sorted) {
    const key = point.date.slice(0, 7), month = grouped.get(key) ?? { total: 0, count: 0 };
    month.total += point.value;
    month.count++;
    grouped.set(key, month);
  }
  const months = [...grouped.entries()].map(([key, values]) => ({
    key,
    label: new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T12:00:00Z`)),
    average: values.total / values.count,
    observations: values.count,
    closed: key !== end.slice(0, 7),
  }));
  const averages = new Map(months.map(month => [month.key, month.average]));
  return {
    months,
    points: sorted.map(point => ({ ...point, month: point.date.slice(0, 7), average: averages.get(point.date.slice(0, 7))! })),
    lastObservation: sorted.at(-1)!.date,
  };
};
