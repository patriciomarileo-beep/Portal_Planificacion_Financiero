import type { BaseRow } from "../../base-consolidada-types";
import {
  runQuery,
  validatedTablePath,
  type BigQueryRowsPayload,
} from "./bigquery";

const DEFAULT_BL_TABLE =
  "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL";

type StoreBigQueryPayload = BigQueryRowsPayload;

const valueAt = (row: { f: { v: unknown }[] }, index: number) =>
  row.f[index]?.v;

const requiredText = (
  value: unknown,
  rowNumber: number,
  column: string,
) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(
      `La tabla nativa B&L contiene ${column} vacio en la fila ${rowNumber}.`,
    );
  }
  return text;
};

const requiredNumber = (
  value: unknown,
  rowNumber: number,
  column: string,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      `La tabla nativa B&L contiene ${column} invalido en la fila ${rowNumber}.`,
    );
  }
  return parsed;
};

const nullableNumber = (
  value: unknown,
  rowNumber: number,
  column: string,
) => {
  if (value === null || value === undefined || value === "") return null;
  return requiredNumber(value, rowNumber, column);
};

export const decodeStoreBigQuery = (
  payload: StoreBigQueryPayload,
): {
  baseConsolidada: BaseRow[];
  baseSnapshotAt: string;
} => {
  const rows = payload.rows ?? [];

  if (rows.length === 0) {
    throw new Error("La tabla nativa B&L no contiene registros.");
  }

  const baseConsolidada = rows.map((row, index): BaseRow => {
    const rowNumber = index + 1;
    return [
      requiredNumber(valueAt(row, 0), rowNumber, "ANO"),
      requiredText(valueAt(row, 1), rowNumber, "MES"),
      requiredText(valueAt(row, 2), rowNumber, "TIPO_PERIODO"),
      requiredText(valueAt(row, 3), rowNumber, "CC_REPORTE"),
      String(valueAt(row, 4) ?? ""),
      requiredText(valueAt(row, 5), rowNumber, "TIENDA_REPORTE"),
      requiredNumber(valueAt(row, 6), rowNumber, "VENTAS"),
      requiredNumber(valueAt(row, 7), rowNumber, "MARGEN"),
      requiredNumber(valueAt(row, 8), rowNumber, "REMUNERACIONES"),
      requiredNumber(valueAt(row, 9), rowNumber, "ARRIENDOS"),
      requiredNumber(valueAt(row, 10), rowNumber, "GASTOS_GRAL"),
      requiredNumber(valueAt(row, 11), rowNumber, "DEPRECIACION"),
      requiredNumber(valueAt(row, 12), rowNumber, "FEE_COMERCIAL"),
      requiredNumber(valueAt(row, 13), rowNumber, "FEE_ADM"),
      requiredNumber(valueAt(row, 14), rowNumber, "COSTO_OPERACIONAL"),
      requiredNumber(
        valueAt(row, 15),
        rowNumber,
        "RESULTADO_NO_OPERACIONAL",
      ),
      requiredNumber(valueAt(row, 16), rowNumber, "UTILIDAD_FINAL"),
      nullableNumber(valueAt(row, 17), rowNumber, "FOUR_WALLS"),
    ];
  });

  const requiredYears = [2024, 2025, 2026, 2027];
  if (
    !requiredYears.every((year) =>
      baseConsolidada.some((row) => row[0] === year),
    )
  ) {
    throw new Error("La tabla nativa B&L no contiene todos los anos requeridos.");
  }

  const baseSnapshotAt = requiredText(
    valueAt(rows[0], 18),
    1,
    "BASE_SNAPSHOT_AT",
  );

  if (Number.isNaN(Date.parse(baseSnapshotAt))) {
    throw new Error("La fecha de sincronizacion de B&L no es valida.");
  }

  return { baseConsolidada, baseSnapshotAt };
};

export async function getStoreBigQueryData(): Promise<{
  baseConsolidada: BaseRow[];
  baseSnapshotAt: string;
}> {
  const table = validatedTablePath(
    process.env.BIGQUERY_BL_TABLE || DEFAULT_BL_TABLE,
  );

  const payload = await runQuery<StoreBigQueryPayload>(
    `
      WITH normalized AS (
        SELECT
          ANO,
          MES,
          TIPO_PERIODO,
          COALESCE(NULLIF(TRIM(CC_BASE_REPORTE), ''), NULLIF(TRIM(CC_ORIGEN), '')) AS CC_REPORTE,
          COALESCE(CADENA, '') AS CADENA,
          COALESCE(NULLIF(TRIM(TIENDA_HOMOLOGADA), ''), NULLIF(TRIM(TIENDA_ORIGEN), '')) AS TIENDA_REPORTE,
          VENTAS,
          MARGEN,
          REMUNERACIONES,
          ARRIENDOS,
          GASTOS_GRAL,
          DEPRECIACION,
          FEE_COMERCIAL,
          FEE_ADM,
          COSTO_OPERACIONAL,
          RESULTADO_NO_OPERACIONAL,
          UTILIDAD_FINAL,
          FOUR_WALLS,
          SYNCED_AT
        FROM \`${table}\`
        WHERE ANO IN (2024, 2025, 2026, 2027)
      )
      SELECT
        ANO,
        MES,
        TIPO_PERIODO,
        CC_REPORTE,
        CADENA,
        TIENDA_REPORTE,
        VENTAS,
        MARGEN,
        REMUNERACIONES,
        ARRIENDOS,
        GASTOS_GRAL,
        DEPRECIACION,
        FEE_COMERCIAL,
        FEE_ADM,
        COSTO_OPERACIONAL,
        RESULTADO_NO_OPERACIONAL,
        UTILIDAD_FINAL,
        FOUR_WALLS,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E3SZ', MAX(SYNCED_AT) OVER()) AS BASE_SNAPSHOT_AT
      FROM normalized
      WHERE CC_REPORTE IS NOT NULL
        AND TIENDA_REPORTE IS NOT NULL
      ORDER BY ANO, TIPO_PERIODO, MES, CC_REPORTE
    `,
    [],
    { paginate: true, pageSize: 10000 },
  );

  return decodeStoreBigQuery(payload);
}
