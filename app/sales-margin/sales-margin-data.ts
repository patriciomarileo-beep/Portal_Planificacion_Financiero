export type SalesMarginRow = {
  month: number;
  quarter: string;
  business: string;
  chain: string;
  brand: string;
  class: string;
  scenario: string;
  sales: number;
  marginAmount: number;
};

export type SalesMarginPayload = {
  rows: SalesMarginRow[];
  source: string;
  sourceSheet: string;
  refreshedAt: string | null;
  unit: string;
  years?: string[];
  error?: string;
};

export const salesMarginYearOptions = ["2020", "2021", "2022", "2023", "2024", "2025", "2026P", "2026E", "2027P", "2027M", "2027E", "2028P", "2028E"] as const;
export const salesMarginDefaultYears = ["2024", "2025", "2026P", "2026E", "2027P", "2027M"] as const;

export class SalesMarginRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

const cacheDurationMs = 5 * 60 * 1000;
let scope: string | null = null;
let generation = 0;
let cached: { payload: SalesMarginPayload; expiresAt: number } | null = null;
const pending = new Map<string, { promise: Promise<SalesMarginPayload>; controller: AbortController }>();
const normalizeYears = (years: readonly string[]) => {
  const requested = new Set(years);
  return salesMarginYearOptions.filter((year) => requested.has(year));
};

// Keep financial data only in memory, within the current signed-in session.
export const clearSalesMarginData = () => {
  generation += 1;
  for (const request of pending.values()) request.controller.abort();
  pending.clear();
  cached = null;
  scope = null;
};

export const getSalesMarginSnapshot = (sessionScope: string) =>
  scope === sessionScope ? cached?.payload ?? null : null;

export const loadSalesMargin = (
  sessionScope: string,
  force = false,
  years: readonly string[] = salesMarginDefaultYears,
): Promise<SalesMarginPayload> => {
  if (scope !== sessionScope) {
    clearSalesMarginData();
    scope = sessionScope;
  }

  const cacheExpired = Boolean(cached && cached.expiresAt <= Date.now());
  const requestedYears = normalizeYears(years);
  const loadedYears = new Set(cacheExpired ? [] : cached?.payload.years ?? []);
  const yearsToFetch = force || cacheExpired ? requestedYears : requestedYears.filter((year) => !loadedYears.has(year));
  if (yearsToFetch.length === 0 && cached) return Promise.resolve(cached.payload);

  // Prefetch, navigation and equal year selections share a single request.
  const requestKey = yearsToFetch.join(",");
  const activeRequest = pending.get(requestKey);
  if (activeRequest) return activeRequest.promise;

  const requestGeneration = generation;
  const controller = new AbortController();
  const search = new URLSearchParams({ years: yearsToFetch.join(",") });
  const promise = fetch(`/api/sales-margin?${search}`, { cache: "no-store", signal: controller.signal })
    .then(async (response) => {
      const body = await response.json() as SalesMarginPayload;
      if (!response.ok) {
        if (requestGeneration === generation && [401, 403].includes(response.status)) cached = null;
        throw new SalesMarginRequestError(body.error || "No fue posible cargar Venta & Margen.", response.status);
      }
      if (requestGeneration === generation) {
        const responseYears = normalizeYears(body.years?.length ? body.years : yearsToFetch);
        const replacedYears = new Set<string>(responseYears);
        const rows = [
          ...(cached?.payload.rows ?? []).filter((row) => !replacedYears.has(row.scenario)),
          ...body.rows,
        ];
        const mergedYears = normalizeYears([...(cached?.payload.years ?? []), ...responseYears]);
        cached = {
          payload: { ...body, rows, years: mergedYears },
          expiresAt: Date.now() + cacheDurationMs,
        };
        return cached.payload;
      }
      return body;
    })
    .finally(() => {
      if (pending.get(requestKey)?.promise === promise) pending.delete(requestKey);
    });
  pending.set(requestKey, { promise, controller });
  return promise;
};
