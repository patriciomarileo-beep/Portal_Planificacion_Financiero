import { parameter, runQuery, type BigQueryRowsPayload, type QueryParameter } from "../_shared/bigquery";

const salesTable = "forus-analitica-prod-datalake.silver.ft_cl_reporteria_ventas_tablon";

export type BrickOperationalRow = {
  cut: "MENSUAL" | "ACUMULADO";
  metric: "TICKET" | "ITEM";
  actual: number;
  budget: number;
  prior: number;
};

export type BrickOperationalResult = {
  rows: BrickOperationalRow[];
  source: string;
};

const scalar = (value: unknown): unknown => Array.isArray(value)
  ? value.map(scalar)
  : value && typeof value === "object" && "v" in value ? scalar((value as { v: unknown }).v) : value;

const rowsAsObjects = (payload: BigQueryRowsPayload) => (payload.rows ?? []).map((row) =>
  Object.fromEntries((payload.schema?.fields ?? []).map((field, index) => [field.name, scalar(row.f[index]?.v)])),
);

const selectedChain = (brand: string) => {
  const normalized = brand.trim().toUpperCase();
  if (normalized === "TODAS") return null;
  if (normalized === "CAT" || normalized === "CATERPILLAR") return "CATERPILLAR";
  if (normalized === "DHOUSE") return "DISCOUNT HOUSE";
  if (normalized === "LOCCITANE") return "LO PROVENCE";
  return normalized;
};

export const loadBrickOperational = async (year: number, month: number, brand: string): Promise<BrickOperationalResult> => {
  const chain = selectedChain(brand);
  const chainFilter = chain ? "AND UPPER(TRIM(cadena_facturacion))=@chain" : "";
  const query = `WITH source AS (
    SELECT fecha_transaccion, boleta_oc, unidades, venta_neta
    FROM \`${salesTable}\`
    WHERE fecha_transaccion>=DATE(@priorYear,1,1)
      AND fecha_transaccion<DATE(@year+1,1,1)
      AND EXTRACT(MONTH FROM fecha_transaccion)<=@month
      AND id_canal=1
      AND UPPER(TRIM(tipo_venta))='FACTURADA'
      AND UPPER(TRIM(cadena_facturacion))<>'ECOMMERCE'
      ${chainFilter}
  ), periods AS (
    SELECT 'ACUMULADO' cut, * FROM source
    UNION ALL
    SELECT 'MENSUAL' cut, * FROM source
    WHERE EXTRACT(MONTH FROM fecha_transaccion)=@month
  )
  SELECT cut, EXTRACT(YEAR FROM fecha_transaccion) year,
    SUM(venta_neta) sales,
    SUM(unidades) units,
    COUNT(DISTINCT boleta_oc) orders
  FROM periods
  GROUP BY cut,year`;
  const params: QueryParameter[] = [
    parameter("year", "INTEGER", year),
    parameter("priorYear", "INTEGER", year - 1),
    parameter("month", "INTEGER", month),
  ];
  if (chain) params.push(parameter("chain", "STRING", chain));

  const values = rowsAsObjects(await runQuery<BigQueryRowsPayload>(query, params));
  const rows = (["MENSUAL", "ACUMULADO"] as const).flatMap<BrickOperationalRow>((cut) => {
    const period = (selectedYear: number) => {
      const row = values.find((item) => item.cut === cut && Number(item.year) === selectedYear);
      const orders = Number(row?.orders ?? 0);
      return {
        ticket: orders ? Number(row?.sales ?? 0) / orders : 0,
        item: orders ? Number(row?.units ?? 0) / orders : 0,
      };
    };
    const actual = period(year);
    const prior = period(year - 1);
    return [
      { cut, metric: "TICKET", actual: actual.ticket, budget: 0, prior: prior.ticket },
      { cut, metric: "ITEM", actual: actual.item, budget: 0, prior: prior.item },
    ];
  });

  return { rows, source: salesTable };
};

