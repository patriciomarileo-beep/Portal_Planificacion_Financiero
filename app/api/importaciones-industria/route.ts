import { NextRequest, NextResponse } from "next/server";
import rules from "../../../docs/importaciones-industria-retail/REGLAS_NEGOCIO.json";
import { parameter, runQuery, type BigQueryRowsPayload } from "../_shared/bigquery";

const sourceTable = process.env.BIGQUERY_IMPORTS_TABLE || "forus-cl-planificacion.silver.ft_cl_planificacion_importaciones_industria";
const scalar = (value: unknown): unknown => value && typeof value === "object" && "v" in value ? scalar((value as { v: unknown }).v) : value;
const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);
const quoted = (value: string) => `'${value.replace(/'/g, "''")}'`;
const caseFromMap = (field: string, map: Record<string, string>, fallback: string) => {
  const groups = new Map<string, string[]>();
  Object.entries(map).forEach(([key, value]) => groups.set(value, [...(groups.get(value) ?? []), key]));
  return `CASE ${[...groups.entries()].map(([value, keys]) => `WHEN UPPER(TRIM(CAST(${field} AS STRING))) IN (${keys.map((key) => quoted(key.toUpperCase())).join(",")}) THEN ${quoted(value)}`).join(" ")} ELSE ${quoted(fallback)} END`;
};
const pick = (columns: Set<string>, actual: Map<string, string>, candidates: string[], label: string) => {
  const selected = candidates.find((candidate) => columns.has(candidate));
  if (!selected) throw new Error(`No se encontró la columna ${label}. Candidatas: ${candidates.join(", ")}.`);
  return `\`${actual.get(selected) ?? selected}\``;
};

export async function GET(request: NextRequest) {
  try {
    const [project, dataset, table] = sourceTable.split(".");
    if (!project || !dataset || !table) throw new Error("BIGQUERY_IMPORTS_TABLE debe tener formato project.dataset.table.");
    const schemaPayload = await runQuery<BigQueryRowsPayload>(
      `SELECT column_name FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name=@table ORDER BY ordinal_position`,
      [parameter("table", "STRING", table)],
    );
    const schemaRows = rowsAsObjects(schemaPayload);
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
    const period = ["ANUAL", "Q1", "Q2", "Q3", "Q4", "MES"].includes(search.get("period") || "") ? String(search.get("period")) : "ANUAL";
    const year = Number(search.get("year") || 0);
    const month = Math.min(12, Math.max(1, Number(search.get("month") || 1)));
    const quarter = period.startsWith("Q") ? Number(period.slice(1)) : 0;
    const base = `WITH prepared AS (
      SELECT ${yearExpr} anio, ${monthExpr} mes,
        UPPER(TRIM(CAST(${classCol} AS STRING))) clase, UPPER(TRIM(CAST(${unitCol} AS STRING))) unidad,
        UPPER(TRIM(CAST(${brandCol} AS STRING))) marca,
        ${caseFromMap(brandCol, rules.segmentByBrand, rules.fallbacks.segment)} segmento,
        ${caseFromMap(importerCol, rules.importerByRaw, rules.fallbacks.importer)} importador,
        ${caseFromMap(genderCol, rules.genderByRaw, rules.fallbacks.gender)} genero,
        ${caseFromMap(typeCol, rules.typeByRaw, rules.fallbacks.type)} tipo,
        ${caseFromMap(brandCol, rules.groupByBrand, rules.fallbacks.group)} grupo,
        SAFE_CAST(${quantityCol} AS NUMERIC) cantidad, SAFE_CAST(${fobCol} AS NUMERIC) us_fob
      FROM \`${sourceTable}\`
    ), universe AS (
      SELECT * FROM prepared WHERE anio >= 2023
        AND clase IN ('CALZADO','VESTUARIO','ACCESORIOS') AND unidad IN ('PARES','UNIDADES')
    )`;
    const timeWhere = year >= 2023 ? `anio=@year${quarter ? " AND DIV(mes-1,3)+1=@quarter" : period === "MES" ? " AND mes=@month" : ""}` : "TRUE";
    const params = [
      ...(year >= 2023 ? [parameter("year", "INTEGER", year)] : []),
      ...(quarter ? [parameter("quarter", "INTEGER", quarter)] : []),
      ...(period === "MES" ? [parameter("month", "INTEGER", month)] : []),
    ];
    const queries = [
      `${base} SELECT MIN(anio) min_year, MAX(anio) max_year, SUM(IF(${timeWhere},cantidad,0)) cantidad, SUM(IF(${timeWhere},us_fob,0)) us_fob, SAFE_DIVIDE(SUM(IF(${timeWhere},us_fob,0)),SUM(IF(${timeWhere},cantidad,0))) fob_unitario, SAFE_DIVIDE(SUM(IF(${timeWhere} AND importador='FORUS S.A.',us_fob,0)),SUM(IF(${timeWhere},us_fob,0))) forus_share FROM universe`,
      `${base} SELECT anio,mes,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario FROM universe WHERE ${timeWhere} GROUP BY anio,mes ORDER BY anio,mes`,
      `${base} SELECT segmento,clase,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario,SAFE_DIVIDE(SUM(us_fob),SUM(SUM(us_fob)) OVER()) participacion FROM universe WHERE ${timeWhere} GROUP BY segmento,clase ORDER BY us_fob DESC`,
      `${base} SELECT importador,SUM(cantidad) cantidad,SUM(us_fob) us_fob,SAFE_DIVIDE(SUM(us_fob),SUM(cantidad)) fob_unitario,SAFE_DIVIDE(SUM(us_fob),SUM(SUM(us_fob)) OVER()) participacion FROM universe WHERE ${timeWhere} GROUP BY importador ORDER BY us_fob DESC LIMIT 20`,
      `${base} SELECT anio FROM universe GROUP BY anio ORDER BY anio`,
    ];
    const [overview, trend, segments, importers, years] = await Promise.all(queries.map((query, index) => runQuery<BigQueryRowsPayload>(query, index === 4 ? [] : params)));
    return NextResponse.json({
      source: sourceTable,
      scope: { fromYear: 2023, excludedYears: [2019, 2022], classes: rules.allowedClasses, units: rules.allowedUnits },
      overview: rowsAsObjects(overview)[0] ?? {}, trend: rowsAsObjects(trend), segments: rowsAsObjects(segments), importers: rowsAsObjects(importers),
      years: rowsAsObjects(years).map((row) => Number(row.anio)).filter((item) => item >= 2023),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible consultar importaciones." }, { status: 500 });
  }
}
