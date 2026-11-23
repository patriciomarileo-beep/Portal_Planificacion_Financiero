export type SalesMarginRow = {
  month: number;
  quarter: string;
  business: string;
  chain: string;
  brand: string;
  originalBrand?: string;
  class: string;
  scenario: string;
  sales: number;
  marginAmount: number;
};


export type SalesMarginYearStatus = {
  key: string;
  realOnly: boolean;
  realMonths: number;
};


export type SalesMarginPayload = {
  rows: SalesMarginRow[];
  yearCatalog?: SalesMarginYearStatus[];
  source: string;
  sourceSheet: string;
  refreshedAt: string | null;
  unit: string;
  years?: string[];
  chainYears?: string[];
  chainPeriodKey?: string;
  brandGrouping: {
    label: "OTRAS";
    thresholdMm: number;
    window: string[];
    brands: { name: string; totalSalesMm: number }[];
  };
  chainBrandGrouping?: {
    label: "OTRAS";
    thresholdMm: number;
    window: string[];
    chains: {
      chain: string;
      brands: { name: string; totalSalesMm: number }[];
    }[];
  };
  error?: string;
};


export const salesMarginYearOptions = [
  "2017R", "2018R", "2019R",
  "2020R", "2021R", "2022R", "2023R",
  "2024R", "2025R",
  "2026E", "2026P",
  "2027P", "2027M", "2027E",
  "2028PS", "2029PS", "2030PS",
] as const;

export const salesMarginDefaultYears = [
  "2025R", "2026E", "2026P",
  "2027P", "2027M",
] as const;


export const sortSalesMarginYears = (
  values: readonly string[]
): string[] => {
  const priority: Record<string, number> = {
    "": -1,
    R: 0,
    E: 1,
    P: 2,
    M: 3,
    PS: 4,
  };

  return [...new Set(
    values.filter((year) =>
      /^20\d{2}(?:PS|[RPEM])?$/.test(year)
    )
  )].sort((a, b) =>
    Number(a.slice(0, 4)) - Number(b.slice(0, 4)) ||
    (priority[a.slice(4)] ?? 99) -
    (priority[b.slice(4)] ?? 99)
  );
};

export const displayScenarioLabel = (
  key: string,
  _catalog: readonly SalesMarginYearStatus[]
): string => {
  void _catalog;
  return key;
};

// Selecciona el último año real completo y cuatro escenarios de planificación.
export const deriveDefaultScenarioYears = (
  catalog: readonly SalesMarginYearStatus[]
): string[] => {
  const completeRealYears = catalog
    .filter((item) =>
      /^20\d{2}R$/.test(item.key) &&
      item.realOnly &&
      item.realMonths === 12
    )
    .sort((a, b) =>
      Number(a.key.slice(0, 4)) -
      Number(b.key.slice(0, 4)) ||
      a.key.length - b.key.length
    );

  const byYear = new Map<number, string>();

  for (const item of completeRealYears) {
    byYear.set(Number(item.key.slice(0, 4)), item.key);
  }

  const historical = [...byYear.values()].slice(-1);

  if (historical.length < 1) {
    return [...salesMarginDefaultYears];
  }

  const latest = historical[historical.length - 1];
  const year = Number(latest.slice(0, 4));
  const available = new Set(catalog.map((item) => item.key));

  const candidates = [
    ...historical,
    `${year + 1}E`,
    `${year + 1}P`,
    `${year + 2}P`,
    `${year + 2}M`,
  ];

  return sortSalesMarginYears(
    candidates.filter((key) => available.has(key))
  );
};


export class SalesMarginRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

const cacheDurationMs = 5 * 60 * 1000;
let scope: string | null = null;
let generation = 0;
const cached = new Map<string, { payload: SalesMarginPayload; expiresAt: number }>();
const pending = new Map<string, { promise: Promise<SalesMarginPayload>; controller: AbortController }>();
const normalizeYears = sortSalesMarginYears;

// Keep financial data only in memory, within the current signed-in session.
export const clearSalesMarginData = () => {
  generation += 1;
  for (const request of pending.values()) request.controller.abort();
  pending.clear();
  cached.clear();
  scope = null;
};

export const getSalesMarginSnapshot = (sessionScope: string) =>
  scope === sessionScope ? cached.get("summary")?.payload ?? null : null;

export const loadSalesMargin = (
  sessionScope: string,
  force = false,
  years: readonly string[] = salesMarginDefaultYears,
  includeChain = false,
  chainMonths: readonly number[] | null = null,
): Promise<SalesMarginPayload> => {
  if (scope !== sessionScope) {
    clearSalesMarginData();
    scope = sessionScope;
  }

  const normalizedChainMonths = chainMonths === null
    ? null
    : [...new Set(chainMonths.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12))]
      .sort((left, right) => left - right);
  const chainPeriodKey = normalizedChainMonths?.length ? normalizedChainMonths.join("-") : "annual";
  const datasetKey = includeChain ? `chain:${chainPeriodKey}` : "summary";
  const cachedDataset = cached.get(datasetKey);
  const cacheExpired = Boolean(cachedDataset && cachedDataset.expiresAt <= Date.now());
  const requestedYears = normalizeYears(years);
  const loadedYears = new Set(cacheExpired ? [] : cachedDataset?.payload.years ?? []);
  const yearsToFetch = force || cacheExpired
    ? requestedYears
    : requestedYears.filter((year) => !loadedYears.has(year));
  if (yearsToFetch.length === 0 && cachedDataset) return Promise.resolve(cachedDataset.payload);

  // Cada granularidad temporal conserva su propia instantanea para evitar
  // mezclar totales anuales con filas mensuales al navegar entre periodos.
  const requestKey = `${datasetKey}:${yearsToFetch.join(",")}`;
  const activeRequest = pending.get(requestKey);
  if (activeRequest) return activeRequest.promise;

  const requestGeneration = generation;
  const controller = new AbortController();
  const search = new URLSearchParams({ years: yearsToFetch.join(",") });
  if (includeChain) {
    search.set("includeChain", "1");
    if (normalizedChainMonths?.length) search.set("months", normalizedChainMonths.join(","));
  }
  const promise = fetch(`/api/sales-margin?${search}`, { cache: "no-store", signal: controller.signal })
    .then(async (response) => {
      const body = await response.json() as SalesMarginPayload;
      if (!response.ok) {
        if (requestGeneration === generation && [401, 403].includes(response.status)) cached.clear();
        throw new SalesMarginRequestError(body.error || "No fue posible cargar Venta & Margen.", response.status);
      }
      if (requestGeneration === generation) {
        const currentDataset = cached.get(datasetKey);
        const responseYears = normalizeYears(body.years?.length ? body.years : yearsToFetch);
        const replacedYears = new Set<string>(responseYears);
        const rows = [
          ...(currentDataset?.payload.rows ?? []).filter((row) => !replacedYears.has(row.scenario)),
          ...body.rows,
        ];
        const mergedYears = normalizeYears([...(currentDataset?.payload.years ?? []), ...responseYears]);
        const nextPayload = {
          ...body,
          rows,
          years: mergedYears,
          chainYears: includeChain ? mergedYears : [],
          ...(includeChain ? { chainPeriodKey } : {}),
        };
        cached.set(datasetKey, {
          payload: nextPayload,
          expiresAt: Date.now() + cacheDurationMs,
        });
        return nextPayload;
      }
      return body;
    })
    .finally(() => {
      if (pending.get(requestKey)?.promise === promise) pending.delete(requestKey);
    });
  pending.set(requestKey, { promise, controller });
  return promise;
};
