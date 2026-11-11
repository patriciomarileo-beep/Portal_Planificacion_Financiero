
import type { BaseRow } from "../../base-consolidada";
import { googleAccessToken } from "./bigquery";

const SHEET_NAME = "BASE_CONSOLIDADA";

const HEADERS = [
  "AÑO", "MES", "TIPO_PERIODO", "CC_ORIGEN",
  "CC_BASE_REPORTE", "CADENA", "TIENDA_ORIGEN",
  "TIENDA_HOMOLOGADA", "ESTADO_HOMOLOGACIÓN",
  "FUENTE", "VENTAS", "MARGEN", "REMUNERACIONES",
  "ARRIENDOS", "GASTOS_GRAL", "DEPRECIACIÓN",
  "FEE_COMERCIAL", "FEE_ADM", "COSTO_OPERACIONAL",
  "RESULTADO_NO_OPERACIONAL", "UTILIDAD_FINAL",
  "FOUR_WALLS",
];

const invalid = (value: unknown) => {
  const text = String(value ?? "").trim().toUpperCase();
  return (
    !text ||
    text.includes("#N/A") ||
    text.includes("#REF") ||
    text.includes("#VALUE") ||
    text.includes("ARRAY RESULT") ||
    text.includes("ERROR")
  );
};

const number = (
  value: unknown,
  row: number,
  column: string
): number => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Valor no numérico en ${SHEET_NAME}!${column}${row}`
    );
  }

  return parsed;
};

const nullableNumber = (
  value: unknown,
  row: number,
  column: string
): number | null => {
  if (value === undefined || value === "") return null;

  if (value === null) return 0;

  return number(value, row, column);
};

const mapRow = (
  cells: unknown[],
  sheetRow: number
): BaseRow | null => {
  const year = number(cells[0], sheetRow, "A");
  const code = invalid(cells[4]) ? cells[3] : cells[4];
  const name = invalid(cells[7]) ? cells[6] : cells[7];

  if (
    ![2024, 2025, 2026, 2027].includes(year) ||
    invalid(code) ||
    invalid(name)
  ) {
    return null;
  }

  return [
    year,
    String(cells[1] ?? ""),
    String(cells[2] ?? ""),
    String(code),
    String(cells[5] ?? ""),
    String(name),
    number(cells[10], sheetRow, "K"),
    number(cells[11], sheetRow, "L"),
    number(cells[12], sheetRow, "M"),
    number(cells[13], sheetRow, "N"),
    number(cells[14], sheetRow, "O"),
    number(cells[15], sheetRow, "P"),
    number(cells[16], sheetRow, "Q"),
    number(cells[17], sheetRow, "R"),
    number(cells[18], sheetRow, "S"),
    number(cells[19], sheetRow, "T"),
    number(cells[20], sheetRow, "U"),
    nullableNumber(cells[21], sheetRow, "V"),
  ];
};

export async function getStoreSheetData(): Promise<{
  baseConsolidada: BaseRow[];
  baseSnapshotAt: string;
}> {
  const spreadsheetId = process.env.BL_SHEET_ID?.trim();

  if (!spreadsheetId || !/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) {
    throw new Error("BL_SHEET_ID no está configurado.");
  }

  const range = `${SHEET_NAME}!A1:V`;

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${spreadsheetId}/values/${encodeURIComponent(range)}`
  );

  url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");
  url.searchParams.set("majorDimension", "ROWS");

  const token = await googleAccessToken();

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(
      `No fue posible consultar Google Sheets. HTTP ${response.status}`
    );
  }

  const payload = (await response.json()) as {
    values?: unknown[][];
  };

  const values = payload.values ?? [];

  if (values.length < 2) {
    throw new Error("BASE_CONSOLIDADA no contiene registros.");
  }

  const header = values[0];

  if (
    HEADERS.some(
      (expected, index) =>
        String(header[index] ?? "").trim() !== expected
    )
  ) {
    throw new Error(
      "Los encabezados de BASE_CONSOLIDADA han cambiado."
    );
  }

  const baseConsolidada = values
    .slice(1)
    .map((cells, index) => mapRow(cells, index + 2))
    .filter((row): row is BaseRow => row !== null);

  if (
    baseConsolidada.length === 0 ||
    ![2024, 2025, 2026, 2027].every((year) =>
      baseConsolidada.some((row) => row[0] === year)
    )
  ) {
    throw new Error(
      "La base está vacía o faltan períodos obligatorios."
    );
  }

  return {
    baseConsolidada,
    baseSnapshotAt: new Date().toISOString(),
  };
}
