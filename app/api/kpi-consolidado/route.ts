import { NextRequest, NextResponse } from "next/server";
import { requireMenuAuth } from "../_shared/auth";
import { parameter, runQuery, type BigQueryRowsPayload } from "../_shared/bigquery";
import { errorResponse } from "../_shared/http";
import { loadBrickOperational } from "./brick-operational";
import { loadEcommerceOperational } from "./ecommerce-operational";
import { inventoryBudgetSource, loadInventoryBudget } from "./inventory-budget-2026";
import { loadMarketplaceOperational } from "./marketplace-operational";
import { loadProductivityOperational } from "./productivity-operational";

const detailTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EEFF_NEGOCIOS_DETALLE";
const brandTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EEFF_MARCA_NEGOCIO";
const inventoryTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_INVENTARIO_HISTORICO";
const accounts = ["VENTAS NETAS", "MARGEN", "COSTO OPERACIONAL", "RESULTADO OPERACIONAL", "UTILIDAD NETA"];
const businesses = ["BRICK & LIFE", "ECOMMERCE", "MARKETPLACE", "WHOLESALE"];
const excludedFilterBrands = [
  "ACCESORIOS HP",
  "BILLABONG",
  "BROOKS",
  "CONSOLIDADO",
  "BSOUL / BROOKS",
  "BURTON",
  "CALPANY",
  "JANSPORT",
  "KEDS",
  "OTROS", 
];
const normalizedDetailAccount = `CASE
  WHEN NEGOCIO='CONSOLIDADO' AND CUENTA_EERR='UTILIDAD NETA CONSOLIDADA' THEN 'UTILIDAD NETA'
  WHEN NEGOCIO IN ('BRICK & LIFE','ECOMMERCE','MARKETPLACE') AND CUENTA_EERR='RESULTADO DESPUES DE IMPUESTO' THEN 'UTILIDAD NETA'
  WHEN NEGOCIO='WHOLESALE' AND CUENTA_EERR='UTILIDAD WHOLESALE' THEN 'UTILIDAD NETA'
  ELSE CUENTA_EERR END`;
const cache = new Map<string, { expires: number; payload: unknown }>();
let optionsCache: { expires: number; payload: unknown } | null = null;

const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value ? scalar((value as { v: unknown }).v) : value;

const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);

const parseJson = <T,>(value: unknown, fallback: T): T => {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
};

const allowed = (value: string, values: string[], fallback: string) => values.includes(value) ? value : fallback;

export async function GET(request: NextRequest) {
  try { await requireMenuAuth(request, "kpi"); } catch (error) { return errorResponse(error, "kpi.auth"); }
  try {
    const search = request.nextUrl.searchParams;
    const year = Math.min(2100, Math.max(2024, Number(search.get("year") || 2026)));
    const month = Math.min(12, Math.max(1, Number(search.get("month") || 8)));
    const cut = allowed(String(search.get("cut") || "MENSUAL").toUpperCase(), ["MENSUAL", "ACUMULADO"], "MENSUAL");
    const business = allowed(String(search.get("business") || "CONSOLIDADO").toUpperCase(), ["CONSOLIDADO", ...businesses], "CONSOLIDADO");
    const requestedBrand = String(search.get("brand") || "TODAS").trim().toUpperCase();
    const brand = requestedBrand === "CAT" ? "CATERPILLAR" : requestedBrand;
    const detailBrand = brand === "SAFETY" ? "NORSEG" : brand;
    const allBrands = brand === "TODAS";
    const detailBusinesses = ["BRICK & LIFE", "ECOMMERCE", "WHOLESALE"];
    const usesBrandDetail = !allBrands && (business === "CONSOLIDADO" || detailBusinesses.includes(business));
    const cacheKey = search.toString();
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return NextResponse.json(cached.payload);

    const accountList = accounts.map((account) => `'${account}'`).join(",");
    const businessList = businesses.map((item) => `'${item}'`).join(",");
    const excludedFilterBrandList = excludedFilterBrands.map((item) => `'${item}'`).join(",");
    const source = allBrands
      ? `SELECT ANO, MES, CORTE, NEGOCIO, ${normalizedDetailAccount} CUENTA_EERR, PPTO, REAL, FECHA_EJECUCION
          FROM \`${detailTable}\`
          WHERE NIVEL_DETALLE='CONSOLIDADO'
            AND NEGOCIO=${business === "CONSOLIDADO" ? "'CONSOLIDADO'" : "@business"}`
      : usesBrandDetail
        ? `SELECT ANO, MES, CORTE, NEGOCIO, ${normalizedDetailAccount} CUENTA_EERR, PPTO, REAL, FECHA_EJECUCION
            FROM \`${detailTable}\`
            WHERE NIVEL_DETALLE='MARCA' AND MARCA=@detailBrand
              AND NEGOCIO=${business === "CONSOLIDADO" ? "'CONSOLIDADO'" : "@business"}`
      : `SELECT ANO, MES, CORTE, NEGOCIO, CUENTA_EERR, PPTO, REAL, FECHA_EJECUCION
          FROM \`${brandTable}\`
          WHERE MARCA=@brand
            AND NEGOCIO ${business === "CONSOLIDADO" ? `IN (${businessList})` : "=@business"}`;

    const comparisonQuery = `WITH source AS (${source}), scoped AS (
      SELECT * FROM source
      WHERE ANO IN (@year,@priorYear) AND CORTE=@cut AND CUENTA_EERR IN (${accountList})
    ), selected AS (
      SELECT CUENTA_EERR metric,
        SUM(IF(ANO=@year AND MES=@month,REAL,0))/1000 actual,
        SUM(IF(ANO=@year AND MES=@month,PPTO,0))/1000 budget,
        SUM(IF(ANO=@priorYear AND MES=@month,REAL,0))/1000 prior
      FROM scoped GROUP BY CUENTA_EERR
    ), trend AS (
      SELECT MES month,
        SUM(IF(ANO=@year,REAL,0))/1000 actual,
        SUM(IF(ANO=@year,PPTO,0))/1000 budget,
        SUM(IF(ANO=@priorYear,REAL,0))/1000 prior
      FROM source
      WHERE ANO IN (@year,@priorYear) AND CORTE='MENSUAL' AND CUENTA_EERR='VENTAS NETAS'
      GROUP BY MES
    )
    SELECT
      TO_JSON_STRING(ARRAY(SELECT AS STRUCT * FROM selected ORDER BY CASE metric ${accounts.map((account, index) => `WHEN '${account}' THEN ${index}`).join(" ")} ELSE 99 END)) metrics_json,
      TO_JSON_STRING(ARRAY(SELECT AS STRUCT * FROM trend ORDER BY month)) trend_json,
      MAX(IF(ANO=@year,FECHA_EJECUCION,NULL)) refreshed_at
    FROM source`;

    const presentationSummaryQuery = `WITH source AS (${source})
      SELECT CORTE cut, CUENTA_EERR metric,
        SUM(IF(ANO=@year,REAL,0))/1000 actual,
        SUM(IF(ANO=@year,PPTO,0))/1000 budget,
        SUM(IF(ANO=@priorYear,REAL,0))/1000 prior
      FROM source
      WHERE ANO IN (@year,@priorYear) AND MES=@month
        AND CORTE IN ('MENSUAL','ACUMULADO')
        AND CUENTA_EERR IN (${accountList})
      GROUP BY CORTE,CUENTA_EERR`;

    // Inventario es un saldo al cierre del mes. Para la vista acumulada se
    // presenta el mismo saldo mensual, en vez de sumar los cierres anteriores.
    const inventoryQuery = `WITH inventory AS (
      SELECT ANO, SUM(VNUEVO) / 1000000 inventory_mm
      FROM \`${inventoryTable}\`
      WHERE ANO IN (@year,@priorYear) AND MES=@month
        ${allBrands ? "" : "AND UPPER(TRIM(MARCA2))=UPPER(@detailBrand)"}
      GROUP BY ANO
    )
    SELECT cut, 'INVENTARIO' metric,
      SUM(IF(ANO=@year,inventory_mm,0)) actual,
      0 budget,
      SUM(IF(ANO=@priorYear,inventory_mm,0)) prior
    FROM inventory CROSS JOIN UNNEST(['MENSUAL','ACUMULADO']) cut
    GROUP BY cut`;

    const inventoryRankingQuery = `SELECT
      CASE WHEN UPPER(TRIM(MARCA2))='NORSEG' THEN 'SAFETY' ELSE UPPER(TRIM(MARCA2)) END brand,
      'INVENTARIO' metric,
      SUM(IF(ANO=@year,VNUEVO,0)) / 1000000 actual,
      0 budget,
      SUM(IF(ANO=@priorYear,VNUEVO,0)) / 1000000 prior
    FROM \`${inventoryTable}\`
    WHERE ANO IN (@year,@priorYear) AND MES=@month
      AND MARCA2 IS NOT NULL AND TRIM(MARCA2)<>''
    GROUP BY brand
    ORDER BY brand`;

    const breakdownSource = allBrands
      ? `SELECT ANO, MES, CORTE, NEGOCIO, ${normalizedDetailAccount} CUENTA_EERR, PPTO, REAL
          FROM \`${detailTable}\`
          WHERE NIVEL_DETALLE='CONSOLIDADO' AND NEGOCIO IN (${businessList})`
      : `SELECT ANO, MES, CORTE, NEGOCIO, ${normalizedDetailAccount} CUENTA_EERR, PPTO, REAL
          FROM \`${detailTable}\`
          WHERE NIVEL_DETALLE='MARCA' AND MARCA=@detailBrand AND NEGOCIO IN ('BRICK & LIFE','ECOMMERCE','WHOLESALE')
          UNION ALL
          SELECT ANO, MES, CORTE, NEGOCIO, CUENTA_EERR, PPTO, REAL
          FROM \`${brandTable}\`
          WHERE MARCA=@brand AND NEGOCIO='MARKETPLACE'`;
    const breakdownQuery = `WITH source AS (${breakdownSource})
      SELECT NEGOCIO business, CUENTA_EERR metric,
        SUM(IF(ANO=@year,REAL,0))/1000 actual,
        SUM(IF(ANO=@year,PPTO,0))/1000 budget,
        SUM(IF(ANO=@priorYear,REAL,0))/1000 prior
      FROM source
      WHERE ANO IN (@year,@priorYear) AND MES=@month AND CORTE=@cut AND CUENTA_EERR IN (${accountList})
      GROUP BY NEGOCIO,CUENTA_EERR ORDER BY NEGOCIO,CUENTA_EERR`;

    const presentationBusinessQuery = `WITH source AS (${breakdownSource})
      SELECT CORTE cut, NEGOCIO business, CUENTA_EERR metric,
        SUM(IF(ANO=@year,REAL,0))/1000 actual,
        SUM(IF(ANO=@year,PPTO,0))/1000 budget,
        SUM(IF(ANO=@priorYear,REAL,0))/1000 prior
      FROM source
      WHERE ANO IN (@year,@priorYear) AND MES=@month
        AND CORTE IN ('MENSUAL','ACUMULADO')
        AND CUENTA_EERR IN (${accountList})
      GROUP BY CORTE,NEGOCIO,CUENTA_EERR
      ORDER BY CORTE,NEGOCIO,CUENTA_EERR`;

    const rankingSource = detailBusinesses.includes(business)
      ? `SELECT ANO,MES,CORTE,NEGOCIO,MARCA,${normalizedDetailAccount} CUENTA_EERR,PPTO,REAL
          FROM \`${detailTable}\` WHERE NIVEL_DETALLE='MARCA'`
      : `SELECT ANO,MES,CORTE,NEGOCIO,MARCA,CUENTA_EERR,PPTO,REAL FROM \`${brandTable}\``;
    const rankingQuery = `WITH source AS (${rankingSource})
      SELECT CASE WHEN MARCA='NORSEG' THEN 'SAFETY' ELSE MARCA END brand, CUENTA_EERR metric,
        SUM(IF(ANO=@year,REAL,0))/1000 actual,
        SUM(IF(ANO=@year,PPTO,0))/1000 budget,
        SUM(IF(ANO=@priorYear,REAL,0))/1000 prior
      FROM source
      WHERE ANO IN (@year,@priorYear) AND MES=@month AND CORTE=@cut
        AND MARCA<>'CONSOLIDADO'
        AND CUENTA_EERR IN (${accountList})
        AND NEGOCIO ${business === "CONSOLIDADO" ? `IN (${businessList})` : "=@business"}
      GROUP BY MARCA,CUENTA_EERR ORDER BY MARCA,CUENTA_EERR`;

    const params = [
      parameter("year", "INTEGER", year),
      parameter("priorYear", "INTEGER", year - 1),
      parameter("month", "INTEGER", month),
      parameter("cut", "STRING", cut),
      ...(business === "CONSOLIDADO" ? [] : [parameter("business", "STRING", business)]),
      ...(allBrands ? [] : [parameter("brand", "STRING", brand), parameter("detailBrand", "STRING", detailBrand)]),
    ];
    const inventoryParams = [
      parameter("year", "INTEGER", year),
      parameter("priorYear", "INTEGER", year - 1),
      parameter("month", "INTEGER", month),
      ...(allBrands ? [] : [parameter("detailBrand", "STRING", detailBrand)]),
    ];
    const inventoryRankingParams = [
      parameter("year", "INTEGER", year),
      parameter("priorYear", "INTEGER", year - 1),
      parameter("month", "INTEGER", month),
    ];
    const optionsPromise = optionsCache && optionsCache.expires > Date.now()
      ? Promise.resolve(optionsCache.payload)
      : runQuery<BigQueryRowsPayload>(`SELECT
          TO_JSON_STRING(ARRAY(SELECT DISTINCT ANO FROM \`${brandTable}\` ORDER BY ANO)) years_json,
          TO_JSON_STRING(ARRAY(
            SELECT DISTINCT MARCA FROM \`${brandTable}\`
            WHERE MARCA IS NOT NULL AND TRIM(MARCA)<>''
              AND UPPER(TRIM(MARCA)) NOT IN (${excludedFilterBrandList})
            ORDER BY MARCA
          )) brands_json,
          MAX(IF(ANO=(SELECT MAX(ANO) FROM \`${brandTable}\`),MES,NULL)) latest_month,
          MAX(ANO) latest_year
        FROM \`${brandTable}\``).then((result) => {
          const row = rowsAsObjects(result)[0] ?? {};
          const value = {
            years: parseJson<unknown[]>(row.years_json, [])
              .map(Number)
              .filter(Number.isFinite),
            brands: parseJson<unknown[]>(row.brands_json, [])
              .map(String)
              .filter((item) => item && item !== "null" && item !== "undefined"),
            latestMonth: Number(row.latest_month || 8),
            latestYear: Number(row.latest_year || 2026),
          };
          optionsCache = { expires: Date.now() + 30 * 60 * 1000, payload: value };
          return value;
        });

    const [comparisonPayload, breakdownPayload, rankingPayload, presentationSummaryPayload, presentationBusinessPayload, inventoryPayload, inventoryRankingPayload, options, brickOperational, marketplaceOperational, ecommerceOperational, productivityOperational] = await Promise.all([
      runQuery<BigQueryRowsPayload>(comparisonQuery, params),
      runQuery<BigQueryRowsPayload>(breakdownQuery, params),
      runQuery<BigQueryRowsPayload>(rankingQuery, params),
      runQuery<BigQueryRowsPayload>(presentationSummaryQuery, params),
      runQuery<BigQueryRowsPayload>(presentationBusinessQuery, params),
      runQuery<BigQueryRowsPayload>(inventoryQuery, inventoryParams),
      runQuery<BigQueryRowsPayload>(inventoryRankingQuery, inventoryRankingParams),
      optionsPromise,
      loadBrickOperational(year, month, brand),
      loadMarketplaceOperational(year, month, brand),
      loadEcommerceOperational(year, month, brand),
      loadProductivityOperational(year, month, brand),
    ]);
    const comparison = rowsAsObjects(comparisonPayload)[0] ?? {};
    const presentationSummary = rowsAsObjects(presentationSummaryPayload);
    const selectedInventoryBudget = loadInventoryBudget(year, month, brand) ?? 0;
    const inventoryRows = rowsAsObjects(inventoryPayload).map((row) => ({
      ...row,
      budget: selectedInventoryBudget,
    }));
    presentationSummary.push(...inventoryRows);
    const ranking = rowsAsObjects(rankingPayload);
    const inventoryRankingRows = rowsAsObjects(inventoryRankingPayload).map((row) => ({
      ...row,
      budget: loadInventoryBudget(year, month, String(row.brand ?? "")) ?? 0,
    }));
    ranking.push(...inventoryRankingRows);
    const presentationBusinesses = rowsAsObjects(presentationBusinessPayload);
    presentationBusinesses.push(...brickOperational.rows.map((row) => ({ business: "BRICK & LIFE", ...row })));
    presentationBusinesses.push(...marketplaceOperational.rows.map((row) => ({ business: "MARKETPLACE", ...row })));
    presentationBusinesses.push(...ecommerceOperational.rows.map((row) => ({ business: "ECOMMERCE", ...row })));
    presentationBusinesses.push(...productivityOperational.rows.map((row) => ({ business: "BRICK & LIFE", ...row })));
    const payload = {
      selection: { year, month, cut, business, brand },
      metrics: parseJson(comparison.metrics_json, []),
      trend: parseJson(comparison.trend_json, []),
      breakdown: rowsAsObjects(breakdownPayload),
      ranking,
      presentation: {
        summary: presentationSummary,
        businesses: presentationBusinesses,
      },
      options,
      source: allBrands || usesBrandDetail
        ? detailTable
        : brandTable,
      operationalSource: marketplaceOperational.source,
      operationalSources: {
        brick: brickOperational.source,
        ecommerce: ecommerceOperational.source,
        marketplace: marketplaceOperational.source,
        productivity: productivityOperational.source,
        uf: productivityOperational.ufSource,
      },
      operationalWarnings: {
        productivity: productivityOperational.warning,
      },
      inventorySource: inventoryTable,
      inventoryBudgetSource,
      refreshedAt: comparison.refreshed_at ?? null,
      unit: "MM$",
    };
    cache.set(cacheKey, { expires: Date.now() + 5 * 60 * 1000, payload });
    if (cache.size > 80) cache.delete(cache.keys().next().value ?? "");
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible consultar los KPI consolidados.";
    const authenticationExpired = /invalid_rapt|reauth|invalid authentication credentials|unauthenticated|oauth 2/i.test(message);
    return NextResponse.json({
      error: authenticationExpired
        ? "No fue posible renovar la credencial local de BigQuery. Ejecuta `gcloud.cmd auth application-default login` y reinicia el servidor."
        : message,
    }, { status: 500 });
  }
}

