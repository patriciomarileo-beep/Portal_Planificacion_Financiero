import { NextRequest } from "next/server";
import { requireMenuAuth } from "../_shared/auth";
import { runQuery, type BigQueryRowsPayload } from "../_shared/bigquery";
import { errorResponse, json } from "../_shared/http";

const sourceTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CONSOLIDADA_TOOLBOX_CL";
const cacheDurationMs = 5 * 60 * 1000;
const allowedYears = ["2020", "2021", "2022", "2023", "2024", "2025", "2026P", "2026E", "2027P", "2027M", "2027E", "2028P", "2028E"] as const;
const defaultYears = ["2024", "2025", "2026P", "2026E", "2027P", "2027M"] as const;
const allowedYearSet = new Set<string>(allowedYears);

type CachedPayload = {
  expiresAt: number;
  payload: unknown;
};

const cache = new Map<string, CachedPayload>();

const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value
    ? scalar((value as { v: unknown }).v)
    : value;

const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);

const queryForYears = (years: string[]) => `WITH source AS (
  SELECT
    CASE
      WHEN ANO_2='2026E' AND ORIGEN_DATO='REAL' THEN '2026E'
      WHEN ANO_2='2026FR' AND ORIGEN_DATO='FORECAST' THEN '2026E'
      ELSE ANO_2
    END scenario,
    MES month,
    COALESCE(NULLIF(TRIM(QUARTER), ''), 'SIN QUARTER') quarter,
    COALESCE(NULLIF(TRIM(NEGOCIO_DETALLE), ''), 'SIN CANAL') business,
    COALESCE(NULLIF(TRIM(MARCA), ''), 'SIN MARCA') brand,
    COALESCE(NULLIF(TRIM(CLASE), ''), 'SIN CLASE') class,
    VENTA_NETA sales_amount,
    MARGEN_CONTABILIDAD margin_amount,
    FECHA_EJECUCION refreshed_at
  FROM \`${sourceTable}\`
  WHERE (ANO_2 IN ('2020','2021','2022','2023','2024','2025') AND ORIGEN_DATO='REAL')
     OR (ANO_2='2026P' AND ORIGEN_DATO='PRESUPUESTO')
     OR (ANO_2='2026E' AND ORIGEN_DATO='REAL')
     OR (ANO_2='2026FR' AND ORIGEN_DATO='FORECAST')
     OR (ANO_2='2027P' AND ORIGEN_DATO='PRESUPUESTO')
     OR (ANO_2='2027M' AND ORIGEN_DATO='PRESUPUESTO')
     OR (ANO_2='2027E' AND ORIGEN_DATO='NY_ESTIMADO')
     OR (ANO_2='2028P' AND ORIGEN_DATO='PRESUPUESTO')
     OR (ANO_2='2028E' AND ORIGEN_DATO='NY_ESTIMADO')
),
brand_totals AS (
  SELECT brand, SUM(COALESCE(sales_amount, 0)) total_sales
  FROM source
  GROUP BY brand
),
classified AS (
  SELECT
    source.* EXCEPT (brand),
    CASE
      WHEN UPPER(TRIM(source.brand)) IN ('OTRO', 'OTRAS') THEN 'OTRAS'
      WHEN brand_totals.total_sales < 5000000 THEN 'OTRAS'
      ELSE source.brand
    END brand
  FROM source
  JOIN brand_totals USING (brand)
),
filtered AS (
  SELECT *
  FROM classified
  WHERE scenario IN (${years.map((year) => `'${year}'`).join(", ")})
)
SELECT month, quarter, business, brand, class, scenario,
  SUM(sales_amount)/1000000 sales,
  SUM(margin_amount)/1000000 margin_amount,
  (SELECT MAX(refreshed_at) FROM source) refreshed_at
FROM filtered
GROUP BY month, quarter, business, brand, class, scenario
ORDER BY brand, business, class, month, scenario`;

const requestedYears = (request: NextRequest) => {
  const raw = request.nextUrl.searchParams.get("years");
  if (!raw) return [...defaultYears];
  const years = [...new Set(raw.split(",").map((year) => year.trim()).filter(Boolean))];
  if (years.length === 0 || years.some((year) => !allowedYearSet.has(year))) return null;
  return allowedYears.filter((year) => years.includes(year));
};

export async function GET(request: NextRequest) {
  try {
    await requireMenuAuth(request, "sales-margin");
  } catch (error) {
    return errorResponse(error, "sales-margin.auth");
  }

  try {
    const years = requestedYears(request);
    if (!years) return json({ error: "Los años solicitados no son válidos." }, { status: 400 });
    const cacheKey = years.join(",");
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return json(cached.payload);

    const result = await runQuery<BigQueryRowsPayload>(queryForYears(years), [], { paginate: true });
    const records = rowsAsObjects(result);
    const payload = {
      rows: records.map((row) => ({
        month: Number(row.month ?? 0),
        quarter: String(row.quarter ?? ""),
        business: String(row.business ?? ""),
        chain: "",
        brand: String(row.brand ?? ""),
        class: String(row.class ?? ""),
        scenario: String(row.scenario ?? ""),
        sales: Number(row.sales ?? 0),
        marginAmount: Number(row.margin_amount ?? 0),
      })),
      source: sourceTable,
      sourceSheet: "Data Lake · TB_CONSOLIDADA_TOOLBOX_CL · 2027M: PRESUPUESTO",
      refreshedAt: records[0]?.refreshed_at ?? null,
      unit: "MM$",
      years,
    };
    cache.set(cacheKey, { expiresAt: Date.now() + cacheDurationMs, payload });
    return json(payload);
  } catch (error) {
    return errorResponse(error, "sales-margin.query");
  }
}
