import { parameter, runQuery, type BigQueryRowsPayload, type QueryParameter } from "../_shared/bigquery";

const salesTable = "forus-analitica-prod-datalake.gold.agg_cl_reporte_ventas";
const sessionsTable = "forus-analitica-prod-datalake.bronze.stg_cl_ga_sitios";
const sitesTable = "forus-analitica-prod-datalake.bronze.dim_manual_cl_reporteria_maestro_sitios_cadenas";
const pivotSpreadsheetId = "1Iore0nWNmjo4izLaX06dbxtDs306-yu23oOrAPppqY4";
const monthSheets = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

type SalesPivotRow = { year: number; site: string; orders: number; units: number; sales: number };
type SessionsPivotRow = { year: number; site: string; sessions: number; orders: number };

export type EcommerceOperationalRow = {
  cut: "MENSUAL" | "ACUMULADO";
  metric: "VENTA TRANSACCIONAL" | "SESIONES" | "CONVERSION" | "TICKET" | "ITEM";
  actual: number;
  budget: number;
  prior: number;
};

export type EcommerceOperationalResult = { rows: EcommerceOperationalRow[]; source: string };

const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value ? scalar((value as { v: unknown }).v) : value;

const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);

const number = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").trim());
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
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

const loadPivotSheet = async (sheet: string) => {
  const url = `https://docs.google.com/spreadsheets/d/${pivotSpreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`No fue posible leer ${sheet} desde el PIVOTE (${response.status}).`);
  return parseCsv(await response.text()).slice(1);
};

const loadPivotMonth = async (month: number): Promise<{ sales: SalesPivotRow[]; sessions: SessionsPivotRow[] }> => {
  const name = monthSheets[month - 1];
  if (!name) return { sales: [], sessions: [] };
  const [salesRows, sessionRows] = await Promise.all([loadPivotSheet(`${name}_stg`), loadPivotSheet(`${name}_agg`)]);
  return {
    sales: salesRows.map((row) => ({
      year: number(row[0]), site: String(row[1] ?? "").trim().toUpperCase(),
      orders: number(row[2]), units: number(row[3]), sales: number(row[5]),
    })).filter((row) => Number.isInteger(row.year)),
    sessions: sessionRows.map((row) => ({
      year: number(row[0]), site: String(row[1] ?? "").trim().toUpperCase(),
      sessions: number(row[2]), orders: number(row[3]),
    })).filter((row) => Number.isInteger(row.year)),
  };
};

const selectedSites = (brand: string) => {
  const normalized = brand.trim().toUpperCase();
  if (normalized === "TODAS") return new Set(["CONSOLIDADO"]);
  if (["SAFETY", "NORSEG", "NORSEG SAFETY"].includes(normalized)) return new Set(["NORSEG", "NORSEG SAFETY"]);
  if (["CATERPILLAR", "CAT"].includes(normalized)) return new Set(["CAT"]);
  if (normalized === "ELEMENT") return new Set(["ELEMENT", "ELEMENTBRAND"]);
  if (["MOUNTAIN HARDWEAR", "MONTAIN HARDWEAR"].includes(normalized)) return new Set(["MOUNTAIN HARDWEAR", "MONTAIN HARDWEAR"]);
  return new Set([normalized]);
};

const aggregatePivot = (months: readonly { sales: SalesPivotRow[]; sessions: SessionsPivotRow[] }[], year: number, brand: string) => {
  const sites = selectedSites(brand);
  const salesRows = months.flatMap((item) => item.sales).filter((row) => row.year === year && sites.has(row.site));
  const sessionRows = months.flatMap((item) => item.sessions).filter((row) => row.year === year && sites.has(row.site));
  const orders = salesRows.reduce((total, row) => total + row.orders, 0);
  const units = salesRows.reduce((total, row) => total + row.units, 0);
  const sales = salesRows.reduce((total, row) => total + row.sales, 0);
  const sessions = sessionRows.reduce((total, row) => total + row.sessions, 0);
  const conversionOrders = sessionRows.reduce((total, row) => total + row.orders, 0);
  return {
    sessions,
    conversion: sessions ? conversionOrders / sessions : 0,
    ticket: orders ? sales / orders * 1.19 : 0,
    item: orders ? units / orders : 0,
  };
};

const asPresentationRows = (
  monthly: { sales: SalesPivotRow[]; sessions: SessionsPivotRow[] },
  accumulated: { sales: SalesPivotRow[]; sessions: SessionsPivotRow[] }[],
  year: number,
  brand: string,
): EcommerceOperationalRow[] => ([
  ["MENSUAL", [monthly]],
  ["ACUMULADO", accumulated],
] as const).flatMap<EcommerceOperationalRow>(([cut, months]) => {
  const actual = aggregatePivot(months, year, brand);
  const prior = aggregatePivot(months, year - 1, brand);
  return [
    { cut, metric: "SESIONES", actual: actual.sessions, budget: 0, prior: prior.sessions },
    { cut, metric: "CONVERSION", actual: actual.conversion, budget: 0, prior: prior.conversion },
    { cut, metric: "TICKET", actual: actual.ticket, budget: 0, prior: prior.ticket },
    { cut, metric: "ITEM", actual: actual.item, budget: 0, prior: prior.item },
  ];
});

// Réplica de las consultas conectadas: ventas exige fecha/sitio con sesiones;
// conversión parte desde sesiones y hace LEFT JOIN a las órdenes diarias.
const loadFromBigQuery = async (year: number, month: number, brand: string): Promise<EcommerceOperationalResult> => {
  const sites = selectedSites(brand);
  const allBrands = brand.trim().toUpperCase() === "TODAS";
  const selectedSiteList = [...sites];
  const siteFilter = allBrands ? "" : `AND site IN (${selectedSiteList.map((_, index) => `@site${index}`).join(",")})`;
  const query = `WITH sessions_by_day AS (
    SELECT fecha, UPPER(TRIM(sitio)) site,
      SUM(sessions) sessions,
      SUM(totalRevenue) transactional_sales
    FROM \`${sessionsTable}\`
    WHERE EXTRACT(YEAR FROM fecha) IN (@year,@priorYear) AND EXTRACT(MONTH FROM fecha)<=@month
    GROUP BY fecha,site
  ), orders_by_day AS (
    SELECT DATE(r.dt_fecha_completa) fecha, UPPER(TRIM(m.nombre_normalizado)) site,
      COUNT(DISTINCT r.cod_ecom_orden) orders
    FROM \`${salesTable}\` r LEFT JOIN \`${sitesTable}\` m ON m.nombre_sitio=r.ds_ecom_sitio
    WHERE EXTRACT(YEAR FROM r.dt_fecha_completa) IN (@year,@priorYear) AND EXTRACT(MONTH FROM r.dt_fecha_completa)<=@month
    GROUP BY fecha,site
  ), filtered_sales AS (
    SELECT DATE(r.dt_fecha_completa) fecha, UPPER(TRIM(m.nombre_normalizado)) site,
      r.cod_ecom_orden, r.int_cant_venta units,
      CAST(((r.fc_valor_total-r.fc_valor_envio)/1.19) AS NUMERIC)+CAST(r.fc_valor_envio AS NUMERIC) sales
    FROM \`${salesTable}\` r LEFT JOIN \`${sitesTable}\` m ON m.nombre_sitio=r.ds_ecom_sitio
    WHERE EXTRACT(YEAR FROM r.dt_fecha_completa) IN (@year,@priorYear) AND EXTRACT(MONTH FROM r.dt_fecha_completa)<=@month
      AND EXISTS (SELECT 1 FROM \`${sessionsTable}\` s
        WHERE s.fecha=DATE(r.dt_fecha_completa) AND UPPER(TRIM(s.sitio))=UPPER(TRIM(m.nombre_normalizado)))
  ), sales_periods AS (
    SELECT 'ACUMULADO' cut,* FROM filtered_sales
    UNION ALL SELECT 'MENSUAL' cut,* FROM filtered_sales WHERE EXTRACT(MONTH FROM fecha)=@month
  ), conversion_base AS (
    SELECT s.fecha,s.site,s.sessions,s.transactional_sales,COALESCE(o.orders,0) orders
    FROM sessions_by_day s LEFT JOIN orders_by_day o USING(fecha,site)
  ), conversion_periods AS (
    SELECT 'ACUMULADO' cut,* FROM conversion_base
    UNION ALL SELECT 'MENSUAL' cut,* FROM conversion_base WHERE EXTRACT(MONTH FROM fecha)=@month
  ), sales_agg AS (
    SELECT cut,EXTRACT(YEAR FROM fecha) year,SUM(units) units,SUM(sales) sales,COUNT(DISTINCT cod_ecom_orden) orders
    FROM sales_periods WHERE TRUE ${siteFilter} GROUP BY cut,year
  ), conversion_agg AS (
    SELECT cut,EXTRACT(YEAR FROM fecha) year,
      SUM(sessions) sessions,
      SUM(transactional_sales) transactional_sales,
      SUM(orders) conversion_orders
    FROM conversion_periods WHERE TRUE ${siteFilter} GROUP BY cut,year
  )
  SELECT COALESCE(s.cut,c.cut) cut,COALESCE(s.year,c.year) year,
    s.units,s.sales,s.orders,c.sessions,c.transactional_sales,c.conversion_orders
  FROM sales_agg s FULL JOIN conversion_agg c USING(cut,year)`;
  const params: QueryParameter[] = [
    parameter("year", "INTEGER", year), parameter("priorYear", "INTEGER", year - 1), parameter("month", "INTEGER", month),
  ];
  if (!allBrands) selectedSiteList.forEach((site, index) => params.push(parameter(`site${index}`, "STRING", site)));
  const values = rowsAsObjects(await runQuery<BigQueryRowsPayload>(query, params));
  const rows = (["MENSUAL", "ACUMULADO"] as const).flatMap<EcommerceOperationalRow>((cut) => {
    const period = (selectedYear: number) => {
      const row = values.find((item) => item.cut === cut && Number(item.year) === selectedYear);
      const orders = Number(row?.orders ?? 0);
      const sessions = Number(row?.sessions ?? 0);
      return {
        transactionalSales: Number(row?.transactional_sales ?? 0) / 1_000_000,
        sessions,
        conversion: sessions ? Number(row?.conversion_orders ?? 0) / sessions : 0,
        ticket: orders ? Number(row?.sales ?? 0) / orders * 1.19 : 0,
        item: orders ? Number(row?.units ?? 0) / orders : 0,
      };
    };
    const actual = period(year);
    const prior = period(year - 1);
    return [
      { cut, metric: "VENTA TRANSACCIONAL", actual: actual.transactionalSales, budget: 0, prior: prior.transactionalSales },
      { cut, metric: "SESIONES", actual: actual.sessions, budget: 0, prior: prior.sessions },
      { cut, metric: "CONVERSION", actual: actual.conversion, budget: 0, prior: prior.conversion },
      { cut, metric: "TICKET", actual: actual.ticket, budget: 0, prior: prior.ticket },
      { cut, metric: "ITEM", actual: actual.item, budget: 0, prior: prior.item },
    ];
  });
  return { rows, source: `${sessionsTable} (sessions + totalRevenue) + ${salesTable} + ${sitesTable}` };
};

export const loadEcommerceOperational = async (year: number, month: number, brand: string): Promise<EcommerceOperationalResult> => {
  try {
    return await loadFromBigQuery(year, month, brand);
  } catch {
    // El archivo vinculado conserva la misma salida mensual y permite que la
    // presentación siga disponible si la credencial local de BigQuery expira.
    const months = await Promise.all(Array.from({ length: month }, (_, index) => loadPivotMonth(index + 1)));
    const monthly = months[month - 1] ?? { sales: [], sessions: [] };
    if (![...monthly.sales, ...monthly.sessions].some((row) => row.year === year || row.year === year - 1)) {
      throw new Error("El PIVOTE no contiene el período solicitado.");
    }
    return {
      rows: asPresentationRows(monthly, months, year, brand),
      source: `PIVOTE Big Query Ecommerce 2026-nuevo · ${monthSheets[month - 1]}`,
    };
  }
};

