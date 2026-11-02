import { HttpError } from "./http";
import { parameter, runQuery, validatedTablePath, type BigQueryRowsPayload } from "./bigquery";

const defaultTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_importaciones_industria_cosmeticos";
const periods = ["ANUAL", "H1", "H2", "Q1", "Q2", "Q3", "Q4", "MES"];
type Options = { years: number[]; classes: string[]; importers: string[]; brands: string[]; segments: string[]; units: string[]; latestPeriod: number };
let optionsCache: { table: string; expires: number; value: Options } | undefined;
const responseCache = new Map<string, { expires: number; value: Record<string, unknown> }>();

const queryJson = async <T,>(query: string, params: ReturnType<typeof parameter>[] = []): Promise<T> => {
  const payload = await runQuery<BigQueryRowsPayload & { jobComplete?: boolean }>(query, params);
  if (payload.jobComplete === false) throw new HttpError(503, "La consulta sigue en ejecución. Reintenta en unos segundos.");
  const value = payload.rows?.[0]?.f?.[0]?.v;
  if (typeof value !== "string") throw new Error("BigQuery no devolvió el informe de cosméticos.");
  return JSON.parse(value) as T;
};

export const cosmeticsReport = async (search: URLSearchParams) => {
  if (search.toString().length > 4096) throw new HttpError(400, "Filtros demasiado extensos.");
  const period = search.get("period") || "ANUAL";
  const month = Number(search.get("month") || 1);
  if (!periods.includes(period)) throw new HttpError(400, "Período no válido.");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new HttpError(400, "Mes no válido.");
  const table = validatedTablePath(process.env.BIGQUERY_COSMETICS_TABLE || defaultTable);
  const cacheKey = `${table}:${search.toString()}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const base = `WITH prepared AS (
    SELECT SAFE_CAST(ANO AS INT64) anio, SAFE_CAST(MES AS INT64) mes,
      COALESCE(NULLIF(UPPER(TRIM(CATEGORIA)),''),'SIN CATEGORÍA') clase,
      COALESCE(NULLIF(UPPER(TRIM(MARCA_LIMPIEZA)),''),'SIN MARCA') marca,
      COALESCE(NULLIF(UPPER(TRIM(PROBABLE_IMPORTADOR)),''),'NO INFORMADO') importador,
      COALESCE(NULLIF(UPPER(TRIM(TIPO)),''),'SIN TIPO') segmento,
      COALESCE(NULLIF(UPPER(TRIM(PAIS_ORIGEN)),''),'NO INFORMADO') origen,
      COALESCE(NULLIF(UPPER(TRIM(UNIDAD)),''),'SIN UNIDAD') unidad,
      SAFE_CAST(CANTIDAD AS NUMERIC) cantidad, SAFE_CAST(US_FOB AS NUMERIC) us_fob
    FROM \`${table}\`
  ), universe AS (SELECT * FROM prepared WHERE anio > 0 AND mes BETWEEN 1 AND 12)`;
  let options: Options;
  if (optionsCache?.table === table && optionsCache.expires > Date.now()) options = optionsCache.value;
  else {
    options = await queryJson<Options>(`${base} SELECT TO_JSON_STRING(STRUCT(
      ARRAY_AGG(DISTINCT anio ORDER BY anio) AS years,
      ARRAY_AGG(DISTINCT clase ORDER BY clase) AS classes,
      ARRAY_AGG(DISTINCT importador ORDER BY importador) AS importers,
      ARRAY_AGG(DISTINCT marca ORDER BY marca) AS brands,
      ARRAY_AGG(DISTINCT segmento ORDER BY segmento) AS segments,
      ARRAY_AGG(DISTINCT unidad ORDER BY unidad) AS units,
      MAX(anio * 100 + mes) AS latestPeriod)) FROM universe`);
    optionsCache = { table, expires: Date.now() + 30 * 60 * 1000, value: options };
  }
  const selections = (name: string) => [...new Set((search.get(name) || "").split("|").map(value => value.trim()).filter(Boolean))];
  const years = selections("years");
  const classes = selections("classes");
  const importers = selections("importers");
  const brands = selections("brands");
  const segments = selections("segments");
  const unit = search.get("unit") || (options.units ?? []).find(value => value === "KILOGRAMOS NETOS") || options.units?.[0] || "";
  const filters: [string, string[], string[]][] = [
    ["years", years, (options.years ?? []).map(String)], ["classes", classes, options.classes ?? []],
    ["importers", importers, options.importers ?? []], ["brands", brands, options.brands ?? []],
    ["segments", segments, options.segments ?? []], ["unit", unit ? [unit] : [], options.units ?? []],
  ];
  for (const [name, selected, allowed] of filters) {
    if (selected.some(value => !allowed.includes(value))) throw new HttpError(400, `Selección no válida para ${name}.`);
  }
  const availableYears = options.years?.length ? options.years : [0];
  const currentYear = years.length ? Math.max(...years.map(Number)) : Math.max(...availableYears);
  const previousYear = currentYear - 1;
  const comparisonMonth = currentYear === Math.floor(options.latestPeriod / 100) ? options.latestPeriod % 100 : 12;
  const timeCondition = period === "ANUAL" ? "TRUE" : period === "H1" ? "mes BETWEEN 1 AND 6"
    : period === "H2" ? "mes BETWEEN 7 AND 12" : period === "MES" ? "mes=@month" : "DIV(mes-1,3)+1=@quarter";
  const conditions = ["unidad=@unit", timeCondition];
  const params = [parameter("unit", "STRING", unit), parameter("currentYear", "INT64", currentYear), parameter("previousYear", "INT64", previousYear), parameter("comparisonMonth", "INT64", comparisonMonth)];
  for (const [name, column, selected] of [["classes", "clase", classes], ["importers", "importador", importers], ["brands", "marca", brands], ["segments", "segmento", segments]] as const) {
    if (selected.length) {
      conditions.push(`${column} IN UNNEST(SPLIT(@${name},'|'))`);
      params.push(parameter(name, "STRING", selected.join("|")));
    }
  }
  if (period === "MES") params.push(parameter("month", "INT64", month));
  if (period.startsWith("Q")) params.push(parameter("quarter", "INT64", Number(period.slice(1))));
  if (years.length) params.push(parameter("years", "STRING", years.join("|")));
  const query = `${base}, scope AS (SELECT * FROM universe WHERE ${conditions.join(" AND ")}),
    filtered AS (SELECT * FROM scope WHERE ${years.length ? "CAST(anio AS STRING) IN UNNEST(SPLIT(@years,'|'))" : "TRUE"}),
    comparison_scope AS (SELECT * FROM scope WHERE mes <= @comparisonMonth)
    SELECT TO_JSON_STRING(STRUCT(
      (SELECT AS STRUCT COUNT(*) rows_count, MIN(anio) min_year, MAX(anio) max_year,
        SUM(cantidad) cantidad, SUM(us_fob) us_fob, SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario FROM filtered) AS overview,
      (SELECT AS STRUCT @currentYear current_year, @previousYear previous_year, @comparisonMonth through_month,
        SUM(IF(anio=@currentYear,us_fob,NULL)) current_fob,
        SUM(IF(anio=@previousYear,us_fob,NULL)) previous_fob FROM comparison_scope) AS comparison,
      ARRAY(SELECT AS STRUCT anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario FROM filtered GROUP BY anio,mes ORDER BY anio,mes) AS trend,
      ARRAY(SELECT AS STRUCT importador,SUM(cantidad) cantidad,SUM(us_fob) us_fob,
        SAFE_DIVIDE(SUM(us_fob),SUM(SUM(us_fob)) OVER()) participacion FROM filtered GROUP BY importador ORDER BY us_fob DESC LIMIT 30) AS importers,
      ARRAY(SELECT AS STRUCT importador item,anio,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY item,anio) AS importerAnalysis,
      ARRAY(SELECT AS STRUCT marca item,anio,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY item,anio) AS brandAnalysis,
      ARRAY(SELECT AS STRUCT segmento item,clase,anio,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY item,clase,anio) AS segmentAnalysis,
      ARRAY(SELECT AS STRUCT clase item,anio,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY item,anio) AS categoryAnalysis,
      ARRAY(SELECT AS STRUCT origen item,anio,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY item,anio) AS originAnalysis,
      ARRAY(SELECT AS STRUCT dimension,item,anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM (
        SELECT 'TRIMESTRE' dimension,CONCAT('Trim. ',CAST(DIV(mes-1,3)+1 AS STRING)) item,anio,mes,cantidad,us_fob FROM filtered
        UNION ALL SELECT 'CLASE',clase,anio,mes,cantidad,us_fob FROM filtered
        UNION ALL SELECT 'ORIGEN',origen,anio,mes,cantidad,us_fob FROM filtered
      ) GROUP BY dimension,item,anio,mes ORDER BY dimension,item,anio,mes) AS breakdown
    ))`;
  const report = await queryJson<Record<string, unknown>>(query, params);
  const value = { ...report, source: table, options, unit, quantityLabel: unit === "KILOGRAMOS NETOS" ? "KG NETOS" : unit,
    coverage: { fromYear: Math.min(...availableYears), latestPeriod: options.latestPeriod },
    segments: [], importerClass: [], classMonth: [] };
  responseCache.set(cacheKey, { expires: Date.now() + 2 * 60 * 1000, value });
  if (responseCache.size > 8) responseCache.delete(responseCache.keys().next().value!);
  return value;
};
