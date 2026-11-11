import type { BigQueryRowsPayload } from "../_shared/bigquery";
import {
  forecastChannels,
  forecastScenarios,
  type ForecastChannel,
  type ForecastScenario,
  type ProfitabilityForecastRow,
} from "../../profitability/profitability-types";

const scenarios = new Set<string>(forecastScenarios);
const channels = new Set<string>(forecastChannels);
const quarters = new Set(["Q1", "Q2", "Q3", "Q4"]);

const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value
    ? scalar((value as { v: unknown }).v)
    : value;

const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);

const finiteNumber = (value: unknown, field: string) => {
  if (value === null || value === undefined || value === "") throw new Error(`BigQuery devolvio ${field} vacio.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`BigQuery devolvio ${field} sin un valor numerico valido.`);
  return parsed;
};

export const decodeProfitabilityForecast = (payload: BigQueryRowsPayload): ProfitabilityForecastRow[] => {
  const keys = new Set<string>();
  return rowsAsObjects(payload).map((source) => {
    const year = String(source.year ?? "").trim();
    const quarter = String(source.quarter ?? "").trim();
    const channel = String(source.channel ?? "").trim();
    const brand = String(source.brand ?? "").trim();
    const month = finiteNumber(source.month, "MES");

    if (!scenarios.has(year)) throw new Error(`BigQuery devolvio un escenario no soportado: ${year || "vacio"}.`);
    if (!quarters.has(quarter)) throw new Error(`BigQuery devolvio un trimestre no soportado: ${quarter || "vacio"}.`);
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`BigQuery devolvio un mes fuera de rango: ${month}.`);
    if (!channels.has(channel)) throw new Error(`BigQuery devolvio un canal no soportado: ${channel || "vacio"}.`);
    if (!brand) throw new Error("BigQuery devolvio una marca vacia.");

    const key = `${year}|${month}|${channel}|${brand}`;
    if (keys.has(key)) throw new Error(`BigQuery devolvio una llave duplicada: ${key}.`);
    keys.add(key);

    return {
      year: year as ForecastScenario,
      quarter: quarter as ProfitabilityForecastRow["quarter"],
      month,
      channel: channel as ForecastChannel,
      brand,
      sales: finiteNumber(source.sales, "VENTA_NETA"),
      margin: finiteNumber(source.margin, "MARGEN"),
      operatingCost: finiteNumber(source.operating_cost, "COSTO_OPERACIONAL"),
      operatingResult: finiteNumber(source.operating_result, "ROP"),
      utility: finiteNumber(source.utility, "UTILIDAD_NETA"),
    };
  });
};
