export type MarketIndicator = {
  id: "dolar" | "uf" | "petroleo" | "cobre";
  label: string;
  value: number;
  unit: string;
  date: string;
  change: number;
  history: number[];
  source: string;
};

export const calendarDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(day + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : null;
};

export const indicatorDateLabel = (value: unknown) => {
  const day = calendarDate(value);
  return day ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z")) : "Fecha no disponible";
};

export const parseFredSeries = (csv: string) => {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  if (!/^(observation_date|DATE),DCOILBRENTEU$/i.test(header?.trim() ?? "")) throw new Error("FRED did not return the expected CSV series.");
  return lines.flatMap(line => {
    const cells = line.split(",");
    if (cells.length !== 2) return [];
    const [rawDate, rawValue] = cells.map(cell => cell.trim());
    const date = calendarDate(rawDate);
    if (!date || rawDate !== date || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(rawValue)) return [];
    const value = Number(rawValue);
    return Number.isFinite(value) ? [{ date, value }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
};

export const parseMarketIndicators = (payload: unknown): MarketIndicator[] => {
  if (!payload || typeof payload !== "object" || !("indicators" in payload) || !Array.isArray(payload.indicators)) return [];
  return payload.indicators.flatMap((value: unknown) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    if (!["dolar", "uf", "petroleo", "cobre"].includes(String(item.id)) || typeof item.value !== "number" || !Number.isFinite(item.value)
      || typeof item.change !== "number" || !Number.isFinite(item.change) || !calendarDate(item.date)
      || typeof item.label !== "string" || typeof item.unit !== "string" || typeof item.source !== "string" || !Array.isArray(item.history)) return [];
    const history = item.history.filter((point): point is number => typeof point === "number" && Number.isFinite(point));
    if (!history.length) return [];
    return [{ ...item, date: calendarDate(item.date)!, history } as MarketIndicator];
  });
};
