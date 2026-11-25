import type {
  BaseRow,
  StoreClassification,
} from "../../base-consolidada-types";
import {
  runQuery,
  validatedTablePath,
  type BigQueryRowsPayload,
} from "./bigquery";

const DEFAULT_BL_TABLE =
  "forus-analitica-test-datalake.silver.ft_cl_planificacion_TB_RENTABILIDAD_BL_CONSOLIDADA";

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

const requiredClassification = (
  value: unknown,
  rowNumber: number,
): StoreClassification => {
  const normalized = requiredText(value, rowNumber, "CLASIFICACION")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();

  if (normalized === "SSS" || normalized === "NS") return normalized;
  if (normalized === "REMODELACION") return "REMODELACIÓN";
  if (normalized === "SIN CLASIFICAR") return "SIN CLASIFICAR";
  throw new Error(
    `La tabla consolidada B&L contiene CLASIFICACION invalida en la fila ${rowNumber}.`,
  );
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
      requiredClassification(valueAt(row, 18), rowNumber),
    ];
  });

  const activeYear = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "America/Santiago",
    }).format(new Date()),
  );
  const requiredYears = [
    activeYear - 2,
    activeYear - 1,
    activeYear,
    activeYear + 1,
  ];
  if (
    !requiredYears.every((year) =>
      baseConsolidada.some((row) => row[0] === year),
    )
  ) {
    throw new Error("La tabla nativa B&L no contiene todos los anos requeridos.");
  }

  const baseSnapshotAt = requiredText(
    valueAt(rows[0], 19),
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
      WITH parameters AS (
        SELECT EXTRACT(YEAR FROM CURRENT_DATE('America/Santiago')) AS active_year
      ), monthly AS (
        SELECT
          SAFE_CAST(SUBSTR(ESCENARIO, 1, 4) AS INT64) AS ANO,
          CASE MES
            WHEN 1 THEN 'ENERO'
            WHEN 2 THEN 'FEBRERO'
            WHEN 3 THEN 'MARZO'
            WHEN 4 THEN 'ABRIL'
            WHEN 5 THEN 'MAYO'
            WHEN 6 THEN 'JUNIO'
            WHEN 7 THEN 'JULIO'
            WHEN 8 THEN 'AGOSTO'
            WHEN 9 THEN 'SEPTIEMBRE'
            WHEN 10 THEN 'OCTUBRE'
            WHEN 11 THEN 'NOVIEMBRE'
            WHEN 12 THEN 'DICIEMBRE'
          END AS MES,
          'MENSUAL' AS TIPO_PERIODO,
          NULLIF(TRIM(CC_REPORTE), '') AS CC_REPORTE,
          COALESCE(NULLIF(TRIM(CADENA), ''), '') AS CADENA,
          COALESCE(NULLIF(TRIM(TIENDA_REPORTE), ''), NULLIF(TRIM(TIENDA_ORIGEN), '')) AS TIENDA_REPORTE,
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
          COALESCE(NULLIF(TRIM(CLASIFICACION), ''), 'SIN CLASIFICAR') AS CLASIFICACION,
          SYNCED_AT
        FROM \`${table}\`
        CROSS JOIN parameters
        WHERE ESCENARIO IN (
          CONCAT(CAST(active_year - 2 AS STRING), 'R'),
          CONCAT(CAST(active_year - 1 AS STRING), 'R'),
          CONCAT(CAST(active_year AS STRING), 'E'),
          CONCAT(CAST(active_year + 1 AS STRING), 'P')
        )
      ), annual AS (
        SELECT
          ANO,
          'TOTAL' AS MES,
          'ANUAL' AS TIPO_PERIODO,
          CC_REPORTE,
          ARRAY_AGG(CADENA ORDER BY SYNCED_AT DESC LIMIT 1)[SAFE_OFFSET(0)] AS CADENA,
          ARRAY_AGG(TIENDA_REPORTE IGNORE NULLS ORDER BY SYNCED_AT DESC LIMIT 1)[SAFE_OFFSET(0)] AS TIENDA_REPORTE,
          SUM(VENTAS) AS VENTAS,
          SUM(MARGEN) AS MARGEN,
          SUM(REMUNERACIONES) AS REMUNERACIONES,
          SUM(ARRIENDOS) AS ARRIENDOS,
          SUM(GASTOS_GRAL) AS GASTOS_GRAL,
          SUM(DEPRECIACION) AS DEPRECIACION,
          SUM(FEE_COMERCIAL) AS FEE_COMERCIAL,
          SUM(FEE_ADM) AS FEE_ADM,
          SUM(COSTO_OPERACIONAL) AS COSTO_OPERACIONAL,
          SUM(RESULTADO_NO_OPERACIONAL) AS RESULTADO_NO_OPERACIONAL,
          SUM(UTILIDAD_FINAL) AS UTILIDAD_FINAL,
          IF(
            COUNTIF(FOUR_WALLS IS NOT NULL) = 0,
            NULL,
            SUM(COALESCE(FOUR_WALLS, 0))
          ) AS FOUR_WALLS,
          'SIN CLASIFICAR' AS CLASIFICACION,
          MAX(SYNCED_AT) AS SYNCED_AT
        FROM monthly
        GROUP BY ANO, CC_REPORTE
      ), normalized AS (
        SELECT * FROM monthly
        UNION ALL
        SELECT * FROM annual
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
        CLASIFICACION,
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
