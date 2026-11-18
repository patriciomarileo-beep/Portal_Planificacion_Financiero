import { NextRequest } from "next/server";
import { requireMenuAuth } from "../_shared/auth";
import { runQuery, type BigQueryRowsPayload } from "../_shared/bigquery";
import { errorResponse, json } from "../_shared/http";

const sourceTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_CONSOLIDADA_TOOLBOX_CL";
const cacheDurationMs = 5 * 60 * 1000;
const allowedYears = ["2020", "2021", "2022", "2023", "2024", "2025", "2026P", "2026E", "2027P", "2027M", "2027E", "2028PS", "2029PS", "2030PS"] as const;
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

export const queryForYears = (years: string[], includeChain: boolean, chainMonths: number[] | null) => {
  const annualChainSummary = includeChain && chainMonths === null;
  const temporalFilter = includeChain && chainMonths?.length
    ? ` AND month IN (${chainMonths.join(", ")})`
    : "";
  const temporalSelect = annualChainSummary
    ? "0 month, 'ANUAL' quarter,"
    : "month, quarter,";
  const temporalGroup = annualChainSummary ? "" : "month, quarter, ";
  const temporalOrder = annualChainSummary ? "" : "month, ";

  return `WITH raw AS (
  SELECT
    TRIM(CAST(ANO_2 AS STRING)) source_period,
    TRIM(CAST(ORIGEN_DATO AS STRING)) source_origin,
    MES month,
    COALESCE(NULLIF(TRIM(QUARTER), ''), 'SIN QUARTER') quarter,
    COALESCE(NULLIF(TRIM(NEGOCIO_DETALLE), ''), 'SIN CANAL') business,
    COALESCE(NULLIF(TRIM(CADENA_2), ''), NULLIF(TRIM(CADENA), ''), 'SIN CADENA') chain_candidate,
    COALESCE(NULLIF(TRIM(MARCA), ''), 'SIN MARCA') brand,
    COALESCE(NULLIF(TRIM(CLASE), ''), 'SIN CLASE') class,
    VENTA_NETA sales_amount,
    MARGEN_CONTABILIDAD margin_amount,
    FECHA_EJECUCION refreshed_at
  FROM \`${sourceTable}\`
),
mapped AS (
  SELECT
    CASE
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}$') AND source_origin='REAL' THEN source_period
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}P$') AND source_origin='PRESUPUESTO' THEN source_period
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}M$') AND source_origin='PRESUPUESTO' THEN source_period
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}E$') AND source_origin IN ('REAL','TY_ESTIMADO','NY_ESTIMADO') THEN source_period
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}FR$') AND source_origin='FORECAST' THEN CONCAT(SUBSTR(source_period, 1, 4), 'E')
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}_J$') AND source_origin='PROYECCIONES_VENTAS_SARIMA' THEN CONCAT(SUBSTR(source_period, 1, 4), 'PS')
    END scenario,
    CASE
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}E$') AND source_origin='REAL' THEN 1
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}FR$') AND source_origin='FORECAST' THEN 1
      WHEN REGEXP_CONTAINS(source_period, r'^\\d{4}E$') AND source_origin IN ('TY_ESTIMADO','NY_ESTIMADO') THEN 2
    END estimate_priority,
    CASE
      WHEN UPPER(chain_candidate)='E-COMMERCE' THEN CONCAT(brand, '.CL')
      WHEN ENDS_WITH(UPPER(chain_candidate), ' E-COMMERCE') THEN CONCAT(
        SUBSTR(chain_candidate, 1, LENGTH(chain_candidate) - LENGTH(' E-COMMERCE')),
        '.CL'
      )
      ELSE chain_candidate
    END chain,
    * EXCEPT (source_period, source_origin, chain_candidate)
  FROM raw
  WHERE (REGEXP_CONTAINS(source_period, r'^\\d{4}$') AND source_origin='REAL')
     OR (REGEXP_CONTAINS(source_period, r'^\\d{4}[PM]$') AND source_origin='PRESUPUESTO')
     OR (REGEXP_CONTAINS(source_period, r'^\\d{4}E$') AND source_origin IN ('REAL','TY_ESTIMADO','NY_ESTIMADO'))
     OR (REGEXP_CONTAINS(source_period, r'^\\d{4}FR$') AND source_origin='FORECAST')
     OR (REGEXP_CONTAINS(source_period, r'^\\d{4}_J$') AND source_origin='PROYECCIONES_VENTAS_SARIMA')
),
source AS (
  SELECT * EXCEPT (estimate_priority, selected_estimate_priority)
  FROM (
    SELECT mapped.*,
      MIN(estimate_priority) OVER (PARTITION BY scenario) selected_estimate_priority
    FROM mapped
    WHERE scenario IS NOT NULL
  )
  WHERE estimate_priority IS NULL OR estimate_priority=selected_estimate_priority
),
grouping_window_candidates AS (
  SELECT DISTINCT SAFE_CAST(actual.scenario AS INT64) base_year
  FROM source actual
  WHERE REGEXP_CONTAINS(actual.scenario, r'^\\d{4}$')
    AND EXISTS (
      SELECT 1 FROM source estimated
      WHERE estimated.scenario=CONCAT(CAST(SAFE_CAST(actual.scenario AS INT64) + 1 AS STRING), 'E')
    )
    AND EXISTS (
      SELECT 1 FROM source projected
      WHERE projected.scenario=CONCAT(CAST(SAFE_CAST(actual.scenario AS INT64) + 2 AS STRING), 'P')
    )
),
active_grouping_window AS (
  SELECT MAX(base_year) base_year
  FROM grouping_window_candidates
),
grouping_scenarios AS (
  SELECT CAST(base_year AS STRING) scenario FROM active_grouping_window
  UNION ALL
  SELECT CONCAT(CAST(base_year + 1 AS STRING), 'E') FROM active_grouping_window
  UNION ALL
  SELECT CONCAT(CAST(base_year + 2 AS STRING), 'P') FROM active_grouping_window
),
brand_totals AS (
  SELECT brand, SUM(COALESCE(sales_amount, 0)) total_sales
  FROM source
  JOIN grouping_scenarios USING (scenario)
  GROUP BY brand
),
brand_classification AS (
  SELECT
    brands.brand,
    COALESCE(brand_totals.total_sales, 0) total_sales,
    UPPER(TRIM(brands.brand)) IN ('OTRO', 'OTRAS')
      OR COALESCE(brand_totals.total_sales, 0) < 50000000 grouped_as_other
  FROM (SELECT DISTINCT brand FROM source) brands
  LEFT JOIN brand_totals USING (brand)
),
classified AS (
  SELECT
    source.* EXCEPT (brand),
    IF(brand_classification.grouped_as_other, 'OTRAS', source.brand) brand
  FROM source
  JOIN brand_classification USING (brand)
),
filtered AS (
  SELECT *
  FROM classified
  WHERE scenario IN (${years.map((year) => `'${year}'`).join(", ")})${temporalFilter}
)
SELECT ${temporalSelect} business, ${includeChain ? "chain" : "''"} chain, brand, class, scenario,
  SUM(sales_amount)/1000000 sales,
  SUM(margin_amount)/1000000 margin_amount,
  (SELECT MAX(refreshed_at) FROM source) refreshed_at,
  IF(ROW_NUMBER() OVER (ORDER BY brand, business${includeChain ? ", chain" : ""}, class, ${temporalOrder}scenario)=1,
    (SELECT CONCAT(
      CAST(base_year AS STRING), ',',
      CAST(base_year + 1 AS STRING), 'E,',
      CAST(base_year + 2 AS STRING), 'P'
    ) FROM active_grouping_window),
    NULL
  ) grouping_window,
  IF(ROW_NUMBER() OVER (ORDER BY brand, business${includeChain ? ", chain" : ""}, class, ${temporalOrder}scenario)=1,
    (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(
      brand AS name,
      ROUND(total_sales / 1000000, 2) AS totalSalesMm
    ) ORDER BY brand))
    FROM brand_classification
    WHERE grouped_as_other),
    NULL
  ) grouped_brands_json
FROM filtered
GROUP BY ${temporalGroup}business${includeChain ? ", chain" : ""}, brand, class, scenario
ORDER BY brand, business${includeChain ? ", chain" : ""}, class, ${temporalOrder}scenario`;
};

type GroupedBrand = { name: string; totalSalesMm: number };

const groupedBrandsFrom = (value: unknown): GroupedBrand[] => {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const { name, totalSalesMm } = entry as { name?: unknown; totalSalesMm?: unknown };
      if (typeof name !== "string") return [];
      return [{ name, totalSalesMm: Number(totalSalesMm ?? 0) }];
    });
  } catch {
    return [];
  }
};

const requestedYears = (request: NextRequest) => {
  const raw = request.nextUrl.searchParams.get("years");
  if (!raw) return [...defaultYears];
  const years = [...new Set(raw.split(",").map((year) => year.trim()).filter(Boolean))];
  if (years.length === 0 || years.some((year) => !allowedYearSet.has(year))) return null;
  return allowedYears.filter((year) => years.includes(year));
};

const requestedChainMonths = (request: NextRequest, includeChain: boolean) => {
  if (!includeChain) return null;
  const raw = request.nextUrl.searchParams.get("months");
  if (raw === null) return null;
  const months = [...new Set(raw.split(",").map(Number))]
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
    .sort((left, right) => left - right);
  return months.length > 0 ? months : null;
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
    const includeChain = request.nextUrl.searchParams.get("includeChain") === "1";
    const chainMonths = requestedChainMonths(request, includeChain);
    const chainPeriodKey = chainMonths?.length ? chainMonths.join("-") : "annual";
    const cacheKey = `${includeChain ? `chain:${chainPeriodKey}` : "summary"}:${years.join(",")}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return json(cached.payload);

    const result = await runQuery<BigQueryRowsPayload>(queryForYears(years, includeChain, chainMonths), [], { paginate: true });
    const records = rowsAsObjects(result);
    const groupingWindow = String(records[0]?.grouping_window ?? "").split(",").filter(Boolean);
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
      sourceSheet: "Data Lake · TB_CONSOLIDADA_TOOLBOX_CL · 2027M: PRESUPUESTO · 2028PS-2030PS: PROYECCIONES_VENTAS_SARIMA",
      refreshedAt: records[0]?.refreshed_at ?? null,
      unit: "MM$",
      years,
      chainYears: includeChain ? years : [],
      chainPeriodKey: includeChain ? chainPeriodKey : undefined,
      brandGrouping: {
        label: "OTRAS",
        thresholdMm: 50,
        window: groupingWindow,
        brands: groupedBrandsFrom(records[0]?.grouped_brands_json),
      },
    };
    cache.set(cacheKey, { expiresAt: Date.now() + cacheDurationMs, payload });
    return json(payload);
  } catch (error) {
    return errorResponse(error, "sales-margin.query");
  }
}
