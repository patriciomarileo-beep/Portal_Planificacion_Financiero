import type {
  BaseRow,
} from "./profitability-bl-data";

export type Year =
  2024 | 2025 | 2026 | 2027;

export type Metric = {
  sales: number;
  margin: number;
  payroll: number;
  rent: number;
  general: number;
  operatingCost: number;
  operatingResult: number;
  nonOperating: number;
  utility: number;
  ebitda: number;
  fourWalls: number | null;
  fwAvailable: number;
};

export type StoreRow = {
  code: string;
  chain: string;
  name: string;
  annual: Record<Year, Metric>;
  monthly: Record<
    2026 | 2027,
    Record<string, Metric>
  >;
};

const chainNames: Record<string, string> = {
  HP: "Hush Puppies",
  DH: "D.House",
  HPK: "Hush Puppies Kids",
  RK: "Rockford",
  COL: "Columbia",
  MHW: "Mountain Hardwear",
  MER: "Merrell",
  FUN: "Funsport",
  BSOUL: "Bsoul",
  CAT: "Caterpillar",
  SE: "Shoe Express",
  AZ: "Azaleia",
  "7V": "7Veinte",
  VANS: "Vans",
  LOP: "LOP",
  CROCS: "Crocs",
  UA: "Under Armour",
  PRF: "Parfois",
  BIL: "Billabong",
  BLL: "Billabong",
};

export const emptyMetric = (): Metric => ({
  sales: 0,
  margin: 0,
  payroll: 0,
  rent: 0,
  general: 0,
  operatingCost: 0,
  operatingResult: 0,
  nonOperating: 0,
  utility: 0,
  ebitda: 0,
  fourWalls: null,
  fwAvailable: 0,
});

export const metricFrom = (
  row: BaseRow,
): Metric => {
  const officialFourWalls = row[17];
  const operatingCost = -Math.abs(row[14]);

  // Cuando FOUR_WALLS no está disponible,
  // se aplica la fórmula de respaldo.
  const fourWalls =
    officialFourWalls ??
    (
      row[16] -
      (row[11] + row[12] + row[13])
    );

  return {
    sales: row[6],
    margin: row[7],
    payroll: -Math.abs(row[8]),
    rent: -Math.abs(row[9]),
    general: row[10],
    operatingCost,
    operatingResult:
      row[7] + operatingCost,
    nonOperating: row[15],
    utility: row[16],

    // Resultado no operacional se utiliza
    // como proxy conjunto de intereses e impuestos.
    ebitda:
      row[16] -
      row[15] +
      Math.abs(row[11]),

    fourWalls,
    fwAvailable:
      officialFourWalls === null ? 0 : 1,
  };
};

export const addMetric = (
  left: Metric,
  right: Metric,
): Metric => ({
  sales: left.sales + right.sales,
  margin: left.margin + right.margin,
  payroll: left.payroll + right.payroll,
  rent: left.rent + right.rent,
  general: left.general + right.general,

  operatingCost:
    left.operatingCost +
    right.operatingCost,

  operatingResult:
    left.operatingResult +
    right.operatingResult,

  nonOperating:
    left.nonOperating +
    right.nonOperating,

  utility:
    left.utility + right.utility,

  ebitda:
    left.ebitda + right.ebitda,

  fourWalls:
    left.fourWalls === null &&
    right.fourWalls === null
      ? null
      : (
          (left.fourWalls ?? 0) +
          (right.fourWalls ?? 0)
        ),

  fwAvailable:
    left.fwAvailable +
    right.fwAvailable,
});

export const chainLabel = (
  raw: string,
  storeName = "",
): string => {
  const normalizedRaw =
    raw.trim().toUpperCase();

  if (
    normalizedRaw === "WLS" ||
    normalizedRaw === "WE LOVE SHOES"
  ) {
    return "OTROS";
  }

  const mapped = chainNames[normalizedRaw];

  if (mapped) {
    return mapped;
  }

  const name =
    storeName.trim().toUpperCase();

  if (name.startsWith("MERRELL")) {
    return "Merrell";
  }

  if (name.startsWith("BSOUL")) {
    return "Bsoul";
  }

  if (
    name.startsWith("KIDS") ||
    name.startsWith("HPK")
  ) {
    return "Hush Puppies Kids";
  }

  if (name.startsWith("PARFOIS")) {
    return "Parfois";
  }

  if (
    name.startsWith("FUNSPORT") ||
    name.startsWith("FS")
  ) {
    return "Funsport";
  }

  if (name.startsWith("AZA")) {
    return "Azaleia";
  }

  if (name.startsWith("7VEINTE")) {
    return "7Veinte";
  }

  if (
    name.startsWith("BIL") ||
    name.startsWith("BLL")
  ) {
    return "Billabong";
  }

  if (
    name.startsWith("CAR") ||
    name.startsWith("CAT")
  ) {
    return "Caterpillar";
  }

  if (name.startsWith("WLS")) {
    return "OTROS";
  }

  if (name.startsWith("VANS")) {
    return "Vans";
  }

  if (name.startsWith("COLUMBIA")) {
    return "Columbia";
  }

  return "OTROS";
};

export const invalidSourceValue = (
  value: unknown,
): boolean => {
  const text = String(value ?? "")
    .trim()
    .toUpperCase();

  return (
    !text ||
    text.includes("#N/A") ||
    text.includes("#REF") ||
    text.includes("#VALUE") ||
    text.includes("ARRAY RESULT") ||
    text.includes("ERROR")
  );
};

export const buildStores = (
  baseConsolidada: BaseRow[],
): StoreRow[] => {
  const stores =
    new Map<string, StoreRow>();

  for (const row of baseConsolidada) {
    const year = row[0] as Year;
    const code = row[3];

    if (
      invalidSourceValue(code) ||
      invalidSourceValue(row[5])
    ) {
      continue;
    }

    if (!stores.has(code)) {
      stores.set(code, {
        code,
        chain: chainLabel(
          row[4],
          row[5],
        ),
        name:
          row[5] || `Tienda ${code}`,

        annual: {
          2024: emptyMetric(),
          2025: emptyMetric(),
          2026: emptyMetric(),
          2027: emptyMetric(),
        },

        monthly: {
          2026: {},
          2027: {},
        },
      });
    }

    const store = stores.get(code)!;

    const normalizedChain = chainLabel(
      row[4],
      row[5],
    );

    if (
      store.chain === "OTROS" &&
      normalizedChain !== "OTROS"
    ) {
      store.chain = normalizedChain;
    }

    if (
      row[2] === "ANUAL" ||
      row[1] === "TOTAL"
    ) {
      store.annual[year] = addMetric(
        store.annual[year],
        metricFrom(row),
      );
    } else if (
      (year === 2026 || year === 2027) &&
      row[2] === "MENSUAL"
    ) {
      const month =
        row[1].toUpperCase();

      store.monthly[year][month] =
        addMetric(
          store.monthly[year][month] ??
            emptyMetric(),
          metricFrom(row),
        );
    }
  }

  return [...stores.values()];
};