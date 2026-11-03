import { parameter, runQuery, type BigQueryRowsPayload, type QueryParameter } from "../_shared/bigquery";

const marketplaceTable = "forus-analitica-prod-datalake.silver.ft_cl_marketplace_ventas";
const pivotSpreadsheetId = "13renb5VYnhpaihjaq4yyKuSaihJbOEDS_kBGudAN5jg";
const monthSheets = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

type PivotRow = {
  year: number;
  origin: string;
  brand: string;
  item: number;
  ticket: number;
  orders: number;
};

export type MarketplaceOperationalRow = {
  cut: "MENSUAL" | "ACUMULADO";
  metric: "TICKET" | "ITEM" | "ORDENES";
  actual: number;
  budget: number;
  prior: number;
};

export type MarketplaceOperationalResult = {
  rows: MarketplaceOperationalRow[];
  source: string;
};

const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value ? scalar((value as { v: unknown }).v) : value;

const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);

const number = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseCsv = (source: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

const loadPivotMonth = async (month: number): Promise<PivotRow[]> => {
  const sheet = monthSheets[month - 1];
  if (!sheet) return [];
  const url = `https://docs.google.com/spreadsheets/d/${pivotSpreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`No fue posible leer ${sheet} desde el PIVOTE (${response.status}).`);
  const [, ...rows] = parseCsv(await response.text());
  return rows
    .filter((row) => row.length >= 6)
    .map((row) => ({
      year: number(row[0]),
      origin: String(row[1] ?? "").trim().toUpperCase(),
      brand: String(row[2] ?? "").trim().toUpperCase(),
      item: number(row[3]),
      ticket: number(row[4]),
      orders: number(row[5]),
    }))
    .filter((row) => Number.isInteger(row.year) && row.orders > 0);
};

const selectedBrands = (brand: string) => {
  const normalized = brand.trim().toUpperCase();
  if (normalized === "TODAS") return null;
  if (["SAFETY", "NORSEG", "NORSEG SAFETY"].includes(normalized)) return new Set(["NORSEG", "NORSEG SAFETY"]);
  return new Set([normalized === "CAT" ? "CATERPILLAR" : normalized]);
};

const aggregatePivot = (rows: PivotRow[], year: number, brand: string) => {
  const brands = selectedBrands(brand);
  const selected = rows.filter((row) => row.year === year
    && row.origin === "CONSOLIDADO"
    && (brands ? brands.has(row.brand) : row.brand === "TODAS LAS MARCAS"));
  const orders = selected.reduce((total, row) => total + row.orders, 0);
  const units = selected.reduce((total, row) => total + row.item * row.orders, 0);
  const sales = selected.reduce((total, row) => total + row.ticket * row.orders, 0);
  return {
    orders,
    item: orders ? units / orders : 0,
    ticket: orders ? Math.round(sales / orders) : 0,
  };
};

const asPresentationRows = (
  monthlyRows: PivotRow[],
  accumulatedRows: PivotRow[],
  year: number,
  brand: string,
): MarketplaceOperationalRow[] => {
  const periods = [
    ["MENSUAL", monthlyRows],
    ["ACUMULADO", accumulatedRows],
  ] as const;
  return periods.flatMap<MarketplaceOperationalRow>(([cut, rows]) => {
    const actual = aggregatePivot(rows, year, brand);
    const prior = aggregatePivot(rows, year - 1, brand);
    return [
      { cut, metric: "TICKET", actual: actual.ticket, budget: 0, prior: prior.ticket },
      { cut, metric: "ITEM", actual: actual.item, budget: 0, prior: prior.item },
      { cut, metric: "ORDENES", actual: actual.orders, budget: 0, prior: prior.orders },
    ];
  });
};

// Regla copiada de la consulta conectada "Datos_BigQuery" del PIVOTE.
const saleStatus = `CASE
  WHEN UPPER(ds_mkpl_estado_final) = 'CANCEL' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'CANCELED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'REFUNDED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'RETURNED,DELIVERED' THEN 'SI'
  WHEN UPPER(ds_mkpl_estado_final) = 'RETURNED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%FAILED%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%PAYMENT_%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%REFUSED%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%STAGING%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%WAITING%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%FRAUD_%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'CANCELED,READY_TO_SHIP' THEN 'SI'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%CANCELLED (PACK_ORDER,NOT_DELIVERED,NOT_PAID)%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%CANCELLED (PACK_ORDER,DELIVERED,NOT_PAID)%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%UNABLE_TO%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%DELETED%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%CANCELADA%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) LIKE '%ERROR BBR%' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'CANCELLED (PACK_ORDER,SPLITTED_ORDER,NOT_DELIVERED,NOT_PAID)' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'DELIVERED,RETURNED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'UNPROCESSED_BY_SELLER' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'RETURN_INITIATED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'RETURNED,RETURN_INITIATED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'CANCELLED (PACK_ORDER,SPLITTED_ORDER,DELIVERED,NOT_PAID)' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'RETURNED,RETURN_SHIPPED_BY_CUSTOMER' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'CANCELLED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'STOCK_SHORTAGE_REFUNDED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'RETURNED,DELIVERED,RETURN_SHIPPED_BY_CUSTOMER' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'STOCK_SHORTAGE' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'RETURN_SHIPPED_BY_CUSTOMER' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'NOT_DELIVERED' THEN 'NO'
  WHEN UPPER(ds_mkpl_estado_final) = 'BLOCKED_BY_CARRIER' THEN 'NO'
  ELSE 'SI' END`;

const loadFromBigQuery = async (year: number, month: number, brand: string): Promise<MarketplaceOperationalResult> => {
  const brands = selectedBrands(brand);
  const brandFilter = !brands
    ? ""
    : brands.size === 2
      ? "AND UPPER(TRIM(ds_mkpl_marca)) IN ('NORSEG','NORSEG SAFETY')"
      : "AND UPPER(TRIM(ds_mkpl_marca))=@marketplaceBrand";
  const query = `WITH source AS (
    SELECT *, ${saleStatus} es_venta
    FROM \`${marketplaceTable}\`
    WHERE EXTRACT(YEAR FROM DATE(ts_mkpl_fecha_creacion_origen)) IN (@year,@priorYear)
      AND EXTRACT(MONTH FROM DATE(ts_mkpl_fecha_creacion_origen))<=@month
      ${brandFilter}
  ), periods AS (
    SELECT 'ACUMULADO' cut, * FROM source
    UNION ALL
    SELECT 'MENSUAL' cut, * FROM source
    WHERE EXTRACT(MONTH FROM DATE(ts_mkpl_fecha_creacion_origen))=@month
  )
  SELECT cut, EXTRACT(YEAR FROM DATE(ts_mkpl_fecha_creacion_origen)) year,
    SUM(int_mkpl_unidades) units,
    SUM(fc_mkpl_venta_neta_pagada_envio) sales,
    COUNT(DISTINCT cod_mkpl_orden_compra) orders
  FROM periods WHERE es_venta='SI'
  GROUP BY cut,year`;
  const params: QueryParameter[] = [
    parameter("year", "INTEGER", year),
    parameter("priorYear", "INTEGER", year - 1),
    parameter("month", "INTEGER", month),
  ];
  if (brands?.size === 1) params.push(parameter("marketplaceBrand", "STRING", [...brands][0]));
  const values = rowsAsObjects(await runQuery<BigQueryRowsPayload>(query, params));
  const rows = (["MENSUAL", "ACUMULADO"] as const).flatMap<MarketplaceOperationalRow>((cut) => {
    const period = (selectedYear: number) => {
      const row = values.find((item) => item.cut === cut && Number(item.year) === selectedYear);
      const orders = Number(row?.orders ?? 0);
      return {
        orders,
        item: orders ? Number(row?.units ?? 0) / orders : 0,
        ticket: orders ? Math.round(Number(row?.sales ?? 0) / orders) : 0,
      };
    };
    const actual = period(year);
    const prior = period(year - 1);
    return [
      { cut, metric: "TICKET", actual: actual.ticket, budget: 0, prior: prior.ticket },
      { cut, metric: "ITEM", actual: actual.item, budget: 0, prior: prior.item },
      { cut, metric: "ORDENES", actual: actual.orders, budget: 0, prior: prior.orders },
    ];
  });
  return { rows, source: marketplaceTable };
};

export const loadMarketplaceOperational = async (
  year: number,
  month: number,
  brand: string,
): Promise<MarketplaceOperationalResult> => {
  try {
    const monthRows = await Promise.all(Array.from({ length: month }, (_, index) => loadPivotMonth(index + 1)));
    const monthly = monthRows[month - 1] ?? [];
    if (!monthly.some((row) => row.year === year || row.year === year - 1)) {
      throw new Error("El PIVOTE no contiene el período solicitado.");
    }
    return {
      rows: asPresentationRows(monthly, monthRows.flat(), year, brand),
      source: `PIVOTE Big Query Marketplace 2026-NUEVO · ${monthSheets[month - 1]}`,
    };
  } catch {
    return loadFromBigQuery(year, month, brand);
  }
};


