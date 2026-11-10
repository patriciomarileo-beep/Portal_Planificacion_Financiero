import { requireMenuAuth } from "../_shared/auth";
import { runQuery, validatedTablePath, type BigQueryRowsPayload } from "../_shared/bigquery";
import { errorResponse, json } from "../_shared/http";
import type { ProfitabilityForecastPayload } from "../../profitability/profitability-types";
import { decodeProfitabilityForecast } from "./data";

export const runtime = "nodejs";

const defaultSourceTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_FORECAST_ANUAL_MARCA_CANAL";
const cacheDurationMs = 5 * 60 * 1000;

type CachedPayload = {
  source: string;
  expiresAt: number;
  payload: ProfitabilityForecastPayload;
};

let cache: CachedPayload | null = null;

export const profitabilityForecastTable = () => validatedTablePath(
  process.env.BIGQUERY_PROFITABILITY_FORECAST_TABLE || defaultSourceTable,
);

export const profitabilityForecastQuery = (sourceTable: string) => `SELECT
  CAST(ANO_2 AS STRING) AS year,
  TRIM(CAST(QUARTER AS STRING)) AS quarter,
  CAST(MES AS INT64) AS month,
  TRIM(CAST(NEGOCIO_DETALLE AS STRING)) AS channel,
  TRIM(CAST(MARCA AS STRING)) AS brand,
  CAST(VENTA_NETA AS FLOAT64) AS sales,
  CAST(MARGEN AS FLOAT64) AS margin,
  CAST(COSTO_OPERACIONAL AS FLOAT64) AS operating_cost,
  CAST(ROP AS FLOAT64) AS operating_result,
  CAST(UTILIDAD_NETA AS FLOAT64) AS utility
FROM \`${sourceTable}\`
WHERE CAST(ANO_2 AS STRING) IN ('2025', '2026E', '2026P', '2027P')
  AND TRIM(CAST(NEGOCIO_DETALLE AS STRING)) IN ('Brick&Life', 'Ecommerce', 'Marketplace', 'Wholesale', 'Consolidado')
ORDER BY year, month, channel, brand`;

export async function GET(request: Request) {
  try {
    await requireMenuAuth(request, "forecast");
  } catch (error) {
    return errorResponse(error, "profitability-forecast.auth");
  }

  try {
    const source = profitabilityForecastTable();
    const forceRefresh = new URL(request.url).searchParams.has("refresh");
    if (!forceRefresh && cache && cache.source === source && cache.expiresAt > Date.now()) return json(cache.payload);

    const result = await runQuery<BigQueryRowsPayload>(profitabilityForecastQuery(source), [], { paginate: true });
    const rows = decodeProfitabilityForecast(result);
    if (!rows.length) throw new Error("BigQuery no devolvio registros para Rentabilidad Forecast.");

    const payload: ProfitabilityForecastPayload = {
      rows,
      source,
      queriedAt: new Date().toISOString(),
      unit: "MM$",
    };
    cache = { source, expiresAt: Date.now() + cacheDurationMs, payload };
    return json(payload);
  } catch (error) {
    return errorResponse(error, "profitability-forecast.query");
  }
}
