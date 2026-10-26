import { requireAuth } from "../_shared/auth";
import { errorResponse, HttpError, reportError, json } from "../_shared/http";
import { NextRequest } from "next/server";
import rules from "../../../docs/importaciones-industria-retail/REGLAS_NEGOCIO.json";
import { parameter, runQuery, validatedTablePath, type BigQueryRowsPayload } from "../_shared/bigquery";
import fallbackSnapshot from "../../imports/importaciones-snapshot.json";

const sourceTable = process.env.BIGQUERY_IMPORTS_TABLE || "forus-analitica-test-datalake.silver.ft_cl_planificacion_importaciones_industria";
const responseCache = new Map<string, { expires: number; payload: unknown }>();
let schemaCache: { expires: number; rows: Record<string, unknown>[] } | null = null;
let optionsCache: { expires: number; value: Record<string, unknown> } | null = null;
const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value ? scalar((value as { v: unknown }).v) : value;
const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);
const quoted = (value: string) => `'${value.replace(/'/g, "''")}'`;
const othersLast = (values: unknown[]) => values.map(String).sort((a, b) => Number(/^(OTROS?|OTRAS?|SIN CLASIFICACI[ÓO]N)$/i.test(a)) - Number(/^(OTROS?|OTRAS?|SIN CLASIFICACI[ÓO]N)$/i.test(b)) || a.localeCompare(b, "es"));
const caseFromMap = (field: string, map: Record<string, string>, fallback: string) => {
  const groups = new Map<string, string[]>();
  Object.entries(map).forEach(([key, value]) => groups.set(value, [...(groups.get(value) ?? []), key]));
  return `CASE ${[...groups.entries()].map(([value, keys]) => `WHEN UPPER(TRIM(CAST(${field} AS STRING))) IN (${keys.map((key) => quoted(key.toUpperCase())).join(",")}) THEN ${quoted(value)}`).join(" ")} ELSE ${quoted(fallback)} END`;
};
const normalizedImporter = (field: string) => `UPPER(REGEXP_REPLACE(TRIM(CAST(${field} AS STRING)), r'[^A-Z0-9&]+', ' '))`;
const importerCase = (field: string) => {
  const value = normalizedImporter(field);
  const entries: [string[], string][] = [
    [["FALABELLA"], "FALABELLA RETAIL S.A."], [["CENCOSUD"], "CENCOSUD RETAIL S.A."], [["ECCSA"], "COMERCIAL ECCSA S.A."],
    [["WALMART"], "WALMART CHILE S.A."], [["TRICOT"], "TRICOT S.A."], [["LA POLAR", "EMPRESAS LA POLAR"], "EMPRESAS LA POLAR S.A."],
    [["HITES"], "HITES S.A."], [["TOTTUS"], "TOTTUS S.A."], [["ZARA"], "ZARA S.A."], [["ADIDAS"], "ADIDAS CHILE LTDA."],
    [["PUMA"], "PUMA CHILE SPA."], [["FORUS"], "FORUS S.A."], [["CAFFARENA"], "CAFFARENA S.A."], [["KOMAX"], "KOMAX S.A."],
    [["NIKE"], "NIKE DE CHILE LTDA."], [["BATA"], "BATA CHILE S.A."], [["SKECHER"], "SKECHERS CHILE LTDA."],
    [["COLGRAM"], "COLGRAM S.A."], [["SPARTA"], "DEPORTES SPARTA LTDA."], [["CORONA"], "MULTITIENDAS CORONA S.A."],
    [["DECATHLON"], "DECATHLON CHILE SPA."], [["STREET MACHINE"], "STREET MACHINE S.A."], [["H&M", "HENNES MAURITZ"], "H&M"],
    [["FASHION S PARK"], "FASHIONS PARK S.A."], [["DOITE"], "DOITE LTDA."],
  ];
  return `CASE ${entries.map(([needles, output]) => `WHEN ${needles.map((needle) => `CONTAINS_SUBSTR(${value}, ${quoted(needle)})`).join(" OR ")} THEN ${quoted(output)}`).join(" ")} ELSE 'OTROS' END`;
};
const approvedBrandCase = (field: string) => {
  const approved = new Set([...Object.keys(rules.segmentByBrand), ...Object.keys(rules.privateBrandOwner), ...Object.keys(rules.groupByBrand)]);
  const aliases: Record<string, string> = { SKECHERS: "SKECHER", NEWBALANCE: "NEW BALANCE", NORTHSTAR: "NORTH STAR", "THE NORTH FACE": "NORTH FACE" };
  Object.keys(aliases).forEach((alias) => approved.add(alias));
  const normalized = `UPPER(TRIM(CAST(${field} AS STRING)))`;
  return `CASE ${Object.entries(aliases).map(([alias, target]) => `WHEN ${normalized}=${quoted(alias)} THEN ${quoted(target)}`).join(" ")} WHEN ${normalized} IN (${[...approved].map(quoted).join(",")}) THEN ${normalized} ELSE 'SIN CLASIFICACIÓN' END`;
};
const pick = (columns: Set<string>, actual: Map<string, string>, candidates: string[], label: string) => {
  const selected = candidates.find((candidate) => columns.has(candidate));
  if (!selected) throw new Error(`No se encontró la columna ${label}. Candidatas: ${candidates.join(", ")}.`);
  return `\`${actual.get(selected) ?? selected}\``;
};

export async function GET(request: NextRequest) {
  try { await requireAuth(request); } catch (error) { return errorResponse(error, "data.auth"); }
  try {
    validatedTablePath(sourceTable);
    if (request.nextUrl.search.length > 4096) throw new HttpError(400, "Filtros demasiado extensos.");
    const requestedPeriod = request.nextUrl.searchParams.get("period") || "ANUAL";
    const isHalfYear = requestedPeriod === "H1" || requestedPeriod === "H2";
    const cacheKey = `period-v3:${request.nextUrl.searchParams.toString()}`;
    const cached = responseCache.get(cacheKey);
    if (!isHalfYear && cached && cached.expires > Date.now()) return json(cached.payload);
    const [project, dataset, table] = sourceTable.split(".");
    if (!project || !dataset || !table) throw new Error("BIGQUERY_IMPORTS_TABLE debe tener formato project.dataset.table.");
    let schemaRows: Record<string, unknown>[];
    if (schemaCache && schemaCache.expires > Date.now()) schemaRows = schemaCache.rows;
    else {
      const schemaPayload = await runQuery<BigQueryRowsPayload>(
        `SELECT column_name FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name=@table ORDER BY ordinal_position`,
        [parameter("table", "STRING", table)],
      );
      schemaRows = rowsAsObjects(schemaPayload);
      schemaCache = { expires: Date.now() + 60 * 60 * 1000, rows: schemaRows };
    }
    const actual = new Map(schemaRows.map((row) => [String(row.column_name).toUpperCase(), String(row.column_name)]));
    const columns = new Set(actual.keys());
    const classCol = pick(columns, actual, ["CLASE", "CLASE_HOMOLOGADA"], "clase");
    const unitCol = pick(columns, actual, ["UNIDAD", "UNIDAD_MEDIDA", "U_MEDIDA"], "unidad");
    const brandCol = pick(columns, actual, ["MARCA_HOMOLOGADA", "MARCA"], "marca");
    const importerCol = pick(columns, actual, ["IMPORTADOR", "IMPORTADOR_HOMOLOGADO"], "importador");
    const genderCol = pick(columns, actual, ["GENERO", "GÉNERO"], "género");
    const typeCol = pick(columns, actual, ["TIPO", "TIPO_HOMOLOGADO"], "tipo");
    const fobCol = pick(columns, actual, ["US_FOB", "US$ FOB", "FOB_USD", "VALOR_FOB_USD"], "US$ FOB");
    const quantityCol = pick(columns, actual, ["CANTIDAD", "UNIDADES", "QTY", "VOLUMEN", "CANTIDAD_UNIDAD", "CANTIDAD_UNIDADES"], "cantidad");
    const dateName = ["FECHA", "FECHA_IMPORTACION", "FECHA_ARRIBO", "FECHA_DOCUMENTO", "DATE"].find((item) => columns.has(item));
    const yearName = ["ANIO", "AÑO", "ANO", "YEAR"].find((item) => columns.has(item));
    const monthName = ["MES", "MONTH", "MES_NUMERO", "NRO_MES"].find((item) => columns.has(item));
    if (!dateName && !yearName) throw new Error("La fuente no contiene una fecha o año reconocible.");
    const dateCol = dateName ? `\`${actual.get(dateName)}\`` : null;
    const yearExpr = dateCol ? `EXTRACT(YEAR FROM SAFE_CAST(${dateCol} AS DATE))` : `SAFE_CAST(\`${actual.get(yearName!)}\` AS INT64)`;
    const monthExpr = dateCol ? `EXTRACT(MONTH FROM SAFE_CAST(${dateCol} AS DATE))` : monthName ? `SAFE_CAST(\`${actual.get(monthName)}\` AS INT64)` : "NULL";

    const search = request.nextUrl.searchParams;
    const period = ["ANUAL", "H1", "H2", "Q1", "Q2", "Q3", "Q4", "MES"].includes(search.get("period") || "") ? String(search.get("period")) : "ANUAL";
    const selections = (name: string) => (search.get(name) || "").split("|").map((item) => item.trim()).filter(Boolean);
    const selectedYears = selections("years").map(Number).filter((item) => item >= 2023 && item <= 2100);
    const selectedClasses = selections("classes");
    const selectedImporters = selections("importers");
    const selectedBrands = selections("brands");
    const selectedSegments = selections("segments");
    const month = Math.min(12, Math.max(1, (Number(search.get("month")) || 1)));
    const quarter = period.startsWith("Q") ? Number(period.slice(1)) : 0;
    const comparisonCurrentYear = selectedYears.length ? Math.max(...selectedYears) : 2025;
    const comparisonPreviousYear = comparisonCurrentYear - 1;
    const base = `WITH prepared AS (
      SELECT ${yearExpr} anio, ${monthExpr} mes,
        UPPER(TRIM(CAST(${classCol} AS STRING))) clase, UPPER(TRIM(CAST(${unitCol} AS STRING))) unidad,
        ${approvedBrandCase(brandCol)} marca,
        ${caseFromMap(approvedBrandCase(brandCol), rules.segmentByBrand, rules.fallbacks.segment)} segmento,
        ${importerCase(importerCol)} importador,
        ${caseFromMap(genderCol, rules.genderByRaw, rules.fallbacks.gender)} genero,
        ${caseFromMap(typeCol, rules.typeByRaw, rules.fallbacks.type)} tipo,
        ${caseFromMap(approvedBrandCase(brandCol), rules.groupByBrand, rules.fallbacks.group)} grupo,
        SAFE_CAST(${quantityCol} AS NUMERIC) cantidad, SAFE_CAST(${fobCol} AS NUMERIC) us_fob
      FROM \`${sourceTable}\`
    ), universe AS (
      SELECT * FROM prepared WHERE anio >= 2023
        AND clase IN ('CALZADO','VESTUARIO','ACCESORIOS') AND unidad IN ('PARES','UNIDADES')
    )`;
    const conditions = [
      selectedYears.length ? "CAST(anio AS STRING) IN UNNEST(SPLIT(@years,'|'))" : "TRUE",
      quarter ? "DIV(mes-1,3)+1=@quarter" : period === "H1" ? "mes BETWEEN 1 AND 6" : period === "H2" ? "mes BETWEEN 7 AND 12" : period === "MES" ? "mes=@month" : "TRUE",
      selectedClasses.length ? "clase IN UNNEST(SPLIT(@classes,'|'))" : "TRUE",
      selectedImporters.length ? "importador IN UNNEST(SPLIT(@importers,'|'))" : "TRUE",
      selectedBrands.length ? "marca IN UNNEST(SPLIT(@brands,'|'))" : "TRUE",
      selectedSegments.length ? "segmento IN UNNEST(SPLIT(@segments,'|'))" : "TRUE",
    ];
    const filterWhere = conditions.join(" AND ");
    const comparisonConditions = [
      "anio IN (@comparisonCurrentYear,@comparisonPreviousYear)",
      quarter ? "DIV(mes-1,3)+1=@quarter" : period === "H1" ? "mes BETWEEN 1 AND 6" : period === "H2" ? "mes BETWEEN 7 AND 12" : period === "MES" ? "mes=@month" : "TRUE",
      selectedClasses.length ? "clase IN UNNEST(SPLIT(@classes,'|'))" : "TRUE",
      selectedSegments.length ? "segmento IN UNNEST(SPLIT(@segments,'|'))" : "TRUE",
    ].join(" AND ");
    const entityConditions = [
      selectedImporters.length ? "importador IN UNNEST(SPLIT(@importers,'|'))" : "TRUE",
      selectedBrands.length ? "marca IN UNNEST(SPLIT(@brands,'|'))" : "TRUE",
    ];
    const hasEntitySelection = selectedImporters.length > 0 || selectedBrands.length > 0;
    const entityWhere = hasEntitySelection ? entityConditions.join(" AND ") : "importador='FORUS S.A.'";
    const params = [
      ...(selectedYears.length ? [parameter("years", "STRING", selectedYears.join("|"))] : []),
      ...(quarter ? [parameter("quarter", "INTEGER", quarter)] : []),
      ...(period === "MES" ? [parameter("month", "INTEGER", month)] : []),
      ...(selectedClasses.length ? [parameter("classes", "STRING", selectedClasses.join("|"))] : []),
      ...(selectedImporters.length ? [parameter("importers", "STRING", selectedImporters.join("|"))] : []),
      ...(selectedBrands.length ? [parameter("brands", "STRING", selectedBrands.join("|"))] : []),
      ...(selectedSegments.length ? [parameter("segments", "STRING", selectedSegments.join("|"))] : []),
      parameter("comparisonCurrentYear", "INTEGER", comparisonCurrentYear),
      parameter("comparisonPreviousYear", "INTEGER", comparisonPreviousYear),
    ];
    const dataQuery = `${base}, filtered AS (SELECT * FROM universe WHERE ${filterWhere}),
      comparison_scope AS (SELECT * FROM universe WHERE ${comparisonConditions}),
      comparison_entity AS (SELECT * FROM comparison_scope WHERE ${entityWhere}),
      comparison_entity_totals AS (SELECT
        SUM(IF(anio=@comparisonCurrentYear,cantidad,0)) entity_current_cantidad,
        SUM(IF(anio=@comparisonPreviousYear,cantidad,0)) entity_previous_cantidad,
        SUM(IF(anio=@comparisonCurrentYear,us_fob,0)) entity_current_fob,
        SUM(IF(anio=@comparisonPreviousYear,us_fob,0)) entity_previous_fob
        FROM comparison_entity),
      comparison_forus_totals AS (SELECT
        SUM(IF(anio=@comparisonCurrentYear AND importador='FORUS S.A.',cantidad,0)) forus_current_cantidad,
        SUM(IF(anio=@comparisonPreviousYear AND importador='FORUS S.A.',cantidad,0)) forus_previous_cantidad,
        SUM(IF(anio=@comparisonCurrentYear AND importador='FORUS S.A.',us_fob,0)) forus_current_fob,
        SUM(IF(anio=@comparisonPreviousYear AND importador='FORUS S.A.',us_fob,0)) forus_previous_fob,
        SUM(IF(anio=@comparisonCurrentYear,us_fob,0)) market_current_fob
        FROM comparison_scope),
      importer_analysis_grouped AS (SELECT importador item,anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY importador,anio,mes),
      brand_analysis_grouped AS (SELECT marca item,anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY marca,anio,mes)
      SELECT
        TO_JSON_STRING((SELECT AS STRUCT MIN(anio) min_year,MAX(anio) max_year,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario,SAFE_DIVIDE(SUM(IF(importador='FORUS S.A.',us_fob,0)),SUM(us_fob)) forus_share FROM filtered)) overview_json,
        TO_JSON_STRING((SELECT AS STRUCT @comparisonCurrentYear current_year,@comparisonPreviousYear previous_year,e.*,f.* FROM comparison_entity_totals e CROSS JOIN comparison_forus_totals f)) comparison_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario FROM filtered GROUP BY anio,mes ORDER BY anio,mes)) trend_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT grouped.*,SAFE_DIVIDE(grouped.us_fob,totals.total_fob) participacion FROM (SELECT segmento,clase,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario FROM filtered GROUP BY segmento,clase) grouped CROSS JOIN (SELECT SUM(us_fob) total_fob FROM filtered) totals ORDER BY grouped.us_fob DESC)) segments_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT grouped.*,SAFE_DIVIDE(grouped.us_fob,totals.total_fob) participacion FROM (SELECT importador,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario FROM filtered GROUP BY importador) grouped CROSS JOIN (SELECT SUM(us_fob) total_fob FROM filtered) totals ORDER BY grouped.us_fob DESC LIMIT 30)) importers_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT item,anio,mes,cantidad,us_fob FROM importer_analysis_grouped ORDER BY us_fob DESC)) importer_analysis_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT item,anio,mes,cantidad,us_fob FROM brand_analysis_grouped ORDER BY us_fob DESC)) brand_analysis_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT segmento item,clase,anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY segmento,clase,anio,mes ORDER BY segmento,clase,anio,mes)) segment_analysis_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT importador item,clase,anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY importador,clase,anio,mes ORDER BY clase,us_fob DESC)) importer_class_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT mes item,clase,anio,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM filtered GROUP BY mes,clase,anio ORDER BY clase,mes,anio)) class_month_json,
        TO_JSON_STRING(ARRAY(SELECT AS STRUCT dimension,item,anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob FROM (
          SELECT 'TRIMESTRE' dimension,CONCAT('Trim. ',CAST(DIV(mes-1,3)+1 AS STRING)) item,anio,mes,cantidad,us_fob FROM filtered
          UNION ALL SELECT 'CLASE',clase,anio,mes,cantidad,us_fob FROM filtered
          UNION ALL SELECT 'GENERO',genero,anio,mes,cantidad,us_fob FROM filtered
        ) GROUP BY dimension,item,anio,mes ORDER BY dimension,item,anio,mes)) breakdown_json`;
    const optionsQuery = `${base} SELECT
      ARRAY_AGG(DISTINCT anio IGNORE NULLS ORDER BY anio) years,
      ARRAY_AGG(DISTINCT clase IGNORE NULLS ORDER BY clase) classes,
      ARRAY_AGG(DISTINCT importador IGNORE NULLS ORDER BY importador) importers,
      ARRAY_AGG(DISTINCT marca IGNORE NULLS ORDER BY marca) brands,
      ARRAY_AGG(DISTINCT segmento IGNORE NULLS ORDER BY segmento) segments
      FROM universe`;
    const optionsPromise = optionsCache && optionsCache.expires > Date.now()
      ? Promise.resolve(optionsCache.value)
      : runQuery<BigQueryRowsPayload>(optionsQuery).then((result) => {
          const value = rowsAsObjects(result)[0] ?? {};
          optionsCache = { expires: Date.now() + 30 * 60 * 1000, value };
          return value;
        });
    const [dataPayload, options] = await Promise.all([runQuery<BigQueryRowsPayload>(dataQuery, params), optionsPromise]);
    const result = rowsAsObjects(dataPayload)[0] ?? {};
    const parseJson = <T,>(value: unknown, fallback: T): T => {
      try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
    };
    const payload = {
      source: sourceTable,
      scope: { fromYear: 2023, excludedYears: [2019, 2022], classes: rules.allowedClasses, units: rules.allowedUnits },
      overview: parseJson(result.overview_json, {}), trend: parseJson(result.trend_json, []), segments: parseJson(result.segments_json, []), importers: parseJson(result.importers_json, []),
      comparison: { ...parseJson<Record<string, unknown>>(result.comparison_json, {}), entityLabel: selectedImporters.length ? selectedImporters.join(", ") : selectedBrands.length ? selectedBrands.join(", ") : "FORUS S.A.", hasEntitySelection },
      importerAnalysis: parseJson(result.importer_analysis_json, []), brandAnalysis: parseJson(result.brand_analysis_json, []),
      segmentAnalysis: parseJson(result.segment_analysis_json, []), importerClass: parseJson(result.importer_class_json, []), classMonth: parseJson(result.class_month_json, []),
      breakdown: parseJson(result.breakdown_json, []),
      options: {
        years: ((options.years as unknown[]) ?? []).map(Number).filter((item) => item >= 2023),
        classes: options.classes ?? [], importers: othersLast((options.importers as unknown[]) ?? []), brands: othersLast((options.brands as unknown[]) ?? []), segments: options.segments ?? [],
      },
    };
    if (!isHalfYear) responseCache.set(cacheKey, { expires: Date.now() + 2 * 60 * 1000, payload });
    if (responseCache.size > 60) responseCache.delete(responseCache.keys().next().value ?? "");
    return json(payload);
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error, "imports");
    const errorId = reportError(error, "imports");
    return json({
      ...fallbackSnapshot,
      stale: true,
      warning: "Se muestra el último corte H1 disponible mientras se renueva la conexión con BigQuery.",
      errorId,
    });
  }
}
