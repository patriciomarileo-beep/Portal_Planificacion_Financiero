import { parameter, runQuery, type BigQueryRowsPayload, type QueryParameter } from "../_shared/bigquery";
import { loadProductivitySnapshotAugust2026 } from "./productivity-snapshot-2026-08";
import { loadProductivitySnapshotSeptember2026 } from "./productivity-snapshot-2026-09";
import { isSssComparable } from "./sss-exclusions";

const productivityTable = "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_EST_RE_HISTORICO_TIENDA";
const ufTable = "forus-analitica-test-datalake.bronze.stg_cl_oracle_oracledba_uf";
const officialUfFallbackSource = "SII UF diaria · valor al cierre de cada mes (respaldo transitorio)";
const officialUfFallback: Record<string, number> = {
  "2025-01": 38_384.41,
  "2025-02": 38_647.94,
  "2025-03": 38_894.11,
  "2025-04": 39_075.41,
  "2025-05": 39_189.45,
  "2025-06": 39_267.07,
  "2025-07": 39_179.01,
  "2025-08": 39_383.07,
  "2026-01": 39_706.07,
  "2026-02": 39_790.63,
  "2026-03": 39_841.72,
  "2026-04": 40_120.20,
  "2026-05": 40_610.69,
  "2026-06": 40_820.31,
  "2026-07": 40_844.79,
  "2026-08": 40_873.77,
};

type ProductivityMetric = "VENTA SSS" | "VENTA UF M2" | "MARGEN UF M2" | "RENTABILIDAD UF M2";

type SourceRow = {
  year: number;
  month: number;
  sales: number;
  margin: number;
  profitability: number;
  squareMeters: number;
};

type SssSourceRow = {
  year: number;
  month: number;
  costCenter: number;
  sales: number;
};

export type ProductivityOperationalRow = {
  cut: "MENSUAL" | "ACUMULADO";
  metric: ProductivityMetric;
  actual: number;
  budget: number;
  prior: number;
};

export type ProductivityOperationalResult = {
  rows: ProductivityOperationalRow[];
  source: string;
  ufSource: string;
  warning: string | null;
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
  if (normalized === "CAT") return "CATERPILLAR";
  if (normalized === "SAFETY") return "NORSEG";
  return normalized;
};

const ufKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

const configuredUfValues = () => {
  const values = new Map<string, number>(Object.entries(officialUfFallback));
  const raw = process.env.KPI_UF_MONTHLY_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      Object.entries(parsed).forEach(([key, value]) => {
        const amount = Number(value);
        if (Number.isFinite(amount) && amount > 0) values.set(key, amount);
      });
    } catch {
      // The API returns a precise warning below instead of failing every KPI.
    }
  }
  return values;
};

const loadUfValues = async (year: number, month: number) => {
  const values = configuredUfValues();
  let warning: string | null = null;
  let source = process.env.KPI_UF_MONTHLY_JSON ? "KPI_UF_MONTHLY_JSON" : officialUfFallbackSource;
  try {
    const payload = await runQuery<BigQueryRowsPayload>(`SELECT
        EXTRACT(YEAR FROM fecha_transaccion) year,
        EXTRACT(MONTH FROM fecha_transaccion) month,
        AVG(monto) amount
      FROM \`${ufTable}\`
      WHERE DATE(fecha_transaccion)>=DATE(@priorYear,1,1)
        AND DATE(fecha_transaccion)<DATE(@year+1,1,1)
        AND EXTRACT(MONTH FROM fecha_transaccion)<=@month
      GROUP BY year,month`, [
      parameter("year", "INTEGER", year),
      parameter("priorYear", "INTEGER", year - 1),
      parameter("month", "INTEGER", month),
    ]);
    rowsAsObjects(payload).forEach((row) => {
      const amount = Number(row.amount);
      if (amount > 0) values.set(ufKey(Number(row.year), Number(row.month)), amount);
    });
    source = ufTable;
  } catch (error) {
    warning = error instanceof Error ? error.message : "No fue posible consultar la UF mensual.";
  }
  return { values, source, warning };
};

const monthlyValue = (row: SourceRow, field: "sales" | "margin" | "profitability", uf: number) =>
  row.squareMeters > 0 && uf > 0 ? row[field] * 1_000 / row.squareMeters / uf : null;

export const loadProductivityOperational = async (
  year: number,
  month: number,
  brand: string,
): Promise<ProductivityOperationalResult> => {
  const snapshot = loadProductivitySnapshotAugust2026(year, month, brand)
    ?? loadProductivitySnapshotSeptember2026(year, month, brand);
  if (snapshot) {
    return {
      rows: snapshot.rows,
      source: snapshot.source,
      ufSource: snapshot.source,
      warning: null,
    };
  }

  const chain = selectedChain(brand);
  const chainFilter = chain ? "AND UPPER(TRIM(CADENA))=@chain" : "";
  const params: QueryParameter[] = [
    parameter("year", "INTEGER", year),
    parameter("priorYear", "INTEGER", year - 1),
    parameter("month", "INTEGER", month),
  ];
  if (chain) params.push(parameter("chain", "STRING", chain));

  const query = `SELECT
      SAFE_CAST(ANO AS INT64) year,
      SAFE_CAST(MES AS INT64) month,
      SUM(VENTA) sales,
      SUM(MARGEN) margin,
      SUM(UTILIDAD_FINAL) profitability,
      SUM(M2) square_meters
    FROM \`${productivityTable}\`
    WHERE SAFE_CAST(ANO AS INT64) IN (@year,@priorYear)
      AND SAFE_CAST(MES AS INT64) BETWEEN 1 AND @month
      AND PPTO=CONCAT('REAL ',RIGHT(CAST(SAFE_CAST(ANO AS INT64) AS STRING),2))
      AND CONSIDERAR=1
      AND M2>0
      ${chainFilter}
    GROUP BY year,month
    ORDER BY year,month`;

  const sssQuery = `SELECT
      SAFE_CAST(ANO AS INT64) year,
      SAFE_CAST(MES AS INT64) month,
      CC cost_center,
      SUM(VENTA) sales
    FROM \`${productivityTable}\`
    WHERE SAFE_CAST(ANO AS INT64) IN (@year,@priorYear)
      AND SAFE_CAST(MES AS INT64) BETWEEN 1 AND @month
      AND PPTO=CONCAT('REAL ',RIGHT(CAST(SAFE_CAST(ANO AS INT64) AS STRING),2))
      ${chainFilter}
    GROUP BY year,month,cost_center
    ORDER BY year,month,cost_center`;

  const [sourcePayload, sssPayload, ufResult] = await Promise.all([
    runQuery<BigQueryRowsPayload>(query, params),
    runQuery<BigQueryRowsPayload>(sssQuery, params),
    loadUfValues(year, month),
  ]);
  const sourceRows = rowsAsObjects(sourcePayload).map<SourceRow>((row) => ({
    year: Number(row.year),
    month: Number(row.month),
    sales: Number(row.sales ?? 0),
    margin: Number(row.margin ?? 0),
    profitability: Number(row.profitability ?? 0),
    squareMeters: Number(row.square_meters ?? 0),
  }));
  const sssRows = rowsAsObjects(sssPayload).map<SssSourceRow>((row) => ({
    year: Number(row.year),
    month: Number(row.month),
    costCenter: Number(row.cost_center),
    sales: Number(row.sales ?? 0),
  })).filter((row) => isSssComparable(row.costCenter, row.year, row.month));

  const periodValue = (
    selectedYear: number,
    cut: "MENSUAL" | "ACUMULADO",
    field: "sales" | "margin" | "profitability",
  ) => {
    const rows = sourceRows.filter((row) => row.year === selectedYear && (cut === "MENSUAL" ? row.month === month : row.month <= month));
    if (!rows.length || (cut === "ACUMULADO" && rows.length !== month)) return null;
    const monthly = rows.map((row) => monthlyValue(row, field, ufResult.values.get(ufKey(row.year, row.month)) ?? 0));
    if (monthly.some((value) => value === null)) return null;
    return monthly.reduce<number>((total, value) => total + Number(value), 0);
  };

  const definitions: Array<{ metric: ProductivityMetric; field: "sales" | "margin" | "profitability" }> = [
    { metric: "VENTA UF M2", field: "sales" },
    { metric: "MARGEN UF M2", field: "margin" },
    { metric: "RENTABILIDAD UF M2", field: "profitability" },
  ];
  const rows = (["MENSUAL", "ACUMULADO"] as const).flatMap<ProductivityOperationalRow>((cut) =>
    definitions.flatMap<ProductivityOperationalRow>(({ metric, field }) => {
      const actual = periodValue(year, cut, field);
      if (actual === null) return [];
      return [{
        cut,
        metric,
        actual,
        budget: 0,
        prior: periodValue(year - 1, cut, field) ?? 0,
      }];
    }),
  );

  (["MENSUAL", "ACUMULADO"] as const).forEach((cut) => {
    const periodSales = (selectedYear: number) => sssRows
      .filter((row) => row.year === selectedYear && (cut === "MENSUAL" ? row.month === month : row.month <= month))
      .reduce((total, row) => total + row.sales, 0) / 1_000;
    const actual = periodSales(year);
    const prior = periodSales(year - 1);
    if (actual || prior) rows.push({ cut, metric: "VENTA SSS", actual, budget: 0, prior });
  });

  const missingUfWarning = rows.length ? null : "No hay cobertura UF suficiente para calcular Productividad tiendas.";
  return {
    rows,
    source: productivityTable,
    ufSource: ufResult.source,
    warning: missingUfWarning ?? ufResult.warning,
  };
};

