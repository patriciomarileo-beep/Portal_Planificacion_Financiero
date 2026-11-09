import { NextRequest } from "next/server";
import { requireMenuAuth } from "../_shared/auth";
import { runQuery, type BigQueryRowsPayload } from "../_shared/bigquery";
import { errorResponse, json } from "../_shared/http";

const sourceTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CONSOLIDADA_TOOLBOX_CL";
const cacheDurationMs = 5 * 60 * 1000;

type CachedPayload = {
  expiresAt: number;
  payload: unknown;
};

let cache: CachedPayload | null = null;

const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value
    ? scalar((value as { v: unknown }).v)
    : value;

const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);

const query = `WITH source AS (
  SELECT
    CASE
      WHEN ANO_2='2026E' AND ORIGEN_DATO='REAL' THEN '2026E'
      WHEN ANO_2='2026FR' AND ORIGEN_DATO='FORECAST' THEN '2026E'
      ELSE ANO_2
    END scenario,
    MES month,
    COALESCE(NULLIF(TRIM(QUARTER), ''), 'SIN QUARTER') quarter,
    COALESCE(NULLIF(TRIM(NEGOCIO_DETALLE), ''), 'SIN CANAL') business,
    COALESCE(NULLIF(TRIM(CADENA_2), ''), NULLIF(TRIM(CADENA), ''), '') chain,
    COALESCE(NULLIF(TRIM(MARCA), ''), 'SIN MARCA') brand,
    COALESCE(NULLIF(TRIM(CLASE), ''), 'SIN CLASE') class,
    VENTA_NETA sales_amount,
    MARGEN_CONTABILIDAD margin_amount,
    FECHA_EJECUCION refreshed_at
  FROM \`${sourceTable}\`
  WHERE (ANO_2 IN ('2020','2021','2022','2023','2024','2025') AND ORIGEN_DATO='REAL')
     OR (ANO_2='2026' AND ORIGEN_DATO='REAL')
     OR (ANO_2='2026P' AND ORIGEN_DATO='PRESUPUESTO')
     OR (ANO_2='2026E' AND ORIGEN_DATO='REAL')
     OR (ANO_2='2026FR' AND ORIGEN_DATO='FORECAST')
     OR (ANO_2='2027P' AND ORIGEN_DATO='PRESUPUESTO')
     OR (ANO_2='2027E' AND ORIGEN_DATO='NY_ESTIMADO')
     OR (ANO_2='2028P' AND ORIGEN_DATO='PRESUPUESTO')
     OR (ANO_2='2028E' AND ORIGEN_DATO='NY_ESTIMADO')
)
SELECT month, quarter, business, chain, brand, class, scenario,
  SUM(sales_amount)/1000000 sales,
  SUM(margin_amount)/1000000 margin_amount,
  (SELECT MAX(refreshed_at) FROM source) refreshed_at
FROM source
GROUP BY month, quarter, business, chain, brand, class, scenario
ORDER BY chain, brand, business, class, month, scenario`;

export async function GET(request: NextRequest) {
  try {
    await requireMenuAuth(request, "sales-margin");
  } catch (error) {
    return errorResponse(error, "sales-margin.auth");
  }

  try {
    if (cache && cache.expiresAt > Date.now()) return json(cache.payload);

    const result = await runQuery<BigQueryRowsPayload>(query, [], { paginate: true });
    const records = rowsAsObjects(result);
    const payload = {
      rows: records.map((row) => ({
        month: Number(row.month ?? 0),
        quarter: String(row.quarter ?? ""),
        business: String(row.business ?? ""),
        chain: String(row.chain ?? ""),
        brand: String(row.brand ?? ""),
        class: String(row.class ?? ""),
        scenario: String(row.scenario ?? ""),
        sales: Number(row.sales ?? 0),
        marginAmount: Number(row.margin_amount ?? 0),
      })),
      source: sourceTable,
      sourceSheet: "Presupuesto_Ventas_2027 · Ventas_consolidadas / Venta_Canales_HP_RKF / Datos",
      refreshedAt: records[0]?.refreshed_at ?? null,
      unit: "MM$",
    };
    cache = { expiresAt: Date.now() + cacheDurationMs, payload };
    return json(payload);
  } catch (error) {
    return errorResponse(error, "sales-margin.query");
  }
}
