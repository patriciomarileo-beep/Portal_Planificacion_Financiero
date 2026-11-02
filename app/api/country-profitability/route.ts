import { requireMenuAuth } from "../_shared/auth";
import { errorResponse, HttpError, reportError, json } from "../_shared/http";
import { googleAccessToken } from "../_shared/bigquery";
import snapshot from "../../profitability/country-source.json";

const spreadsheetId = "1davJpQ2wDvbQrc3i6pvuDLKARpClcZkvN2WIbyqHZXg";
const range = "Slides!A1:Q50";
const countryNames = new Set(["CONSOLIDADO", "CHILE", "PERU", "COLOMBIA", "URUGUAY"]);
const scenarioLabels = ["2024R", "2025P", "2025E", "2026P", "2026E", "2027P", "2028P", "2029P"];
let cache: { expires: number; payload: unknown } | null = null;

const number = (value: unknown) => {
  const text = String(value ?? "").trim();
  const negative = /^\(.*\)$/.test(text) || text.startsWith("-");
  const parsed = Number(text.replace(/[(),%\s]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : 0;
};

const margin = (value: unknown) => {
  const parsed = number(value);
  return typeof value === "string" && value.includes("%") ? parsed / 100 : parsed;
};

const parseReport = (values: unknown[][]) => {
  const countries: Record<string, { name: string; scenarios: { label: string; metrics: Record<string, number>; margins: Record<string, number> }[] }> = {};
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const name = String(values[rowIndex]?.[0] ?? "").trim().toUpperCase();
    if (!countryNames.has(name)) continue;
    const metricRows = values.slice(rowIndex + 2, rowIndex + 8);
    countries[name] = {
      name: name === "PERU" ? "Perú" : name.charAt(0) + name.slice(1).toLowerCase(),
      scenarios: scenarioLabels.map((label, index) => {
        const metrics: Record<string, number> = {};
        const margins: Record<string, number> = {};
        metricRows.forEach((row) => {
          const metric = String(row?.[0] ?? "").trim();
          metrics[metric] = number(row?.[index * 2 + 1]);
          margins[metric] = margin(row?.[index * 2 + 2]);
        });
        return { label, metrics, margins };
      }),
    };
  }
  return Object.values(countries);
};

export async function GET(request: Request) {
  try { await requireMenuAuth(request, "forecast"); } catch (error) { return errorResponse(error, "data.auth"); }
  try {
    if (cache && cache.expires > Date.now()) return json(cache.payload);
    const token = await googleAccessToken(true);
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const source = await response.json() as { values?: unknown[][]; error?: { message?: string } };
    if (!response.ok) throw new Error(source.error?.message || "No se pudo consultar la hoja Países.");
    const payload = { countries: parseReport(source.values ?? []), refreshedAt: new Date().toISOString(), source: "Google Sheets · Slides / UR", stale: false };
    cache = { expires: Date.now() + 60 * 60 * 1000, payload };
    return json(payload);
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error, "countries");
    const errorId = reportError(error, "countries");
    return json({
      countries: parseReport(snapshot.values),
      refreshedAt: snapshot.capturedAt,
      source: `${snapshot.source} · respaldo local`,
      stale: true,
      warning: "No se pudo actualizar Países. Se muestra el respaldo disponible.",
      errorId,
    });
  }
}
