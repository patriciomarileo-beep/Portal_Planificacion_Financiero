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
  error?: string;
};

export class SalesMarginRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

const cacheDurationMs = 5 * 60 * 1000;
let scope: string | null = null;
let generation = 0;
let cached: { payload: SalesMarginPayload; expiresAt: number } | null = null;
let pending: { promise: Promise<SalesMarginPayload>; controller: AbortController } | null = null;

// Keep financial data only in memory, within the current signed-in session.
export const clearSalesMarginData = () => {
  generation += 1;
  pending?.controller.abort();
  pending = null;
  cached = null;
  scope = null;
};

export const getSalesMarginSnapshot = (sessionScope: string) =>
  scope === sessionScope ? cached?.payload ?? null : null;

export const loadSalesMargin = (sessionScope: string, force = false): Promise<SalesMarginPayload> => {
  if (scope !== sessionScope) {
    clearSalesMarginData();
    scope = sessionScope;
  }
  // Prefetch, navigation and refresh share a single request.
  if (pending) return pending.promise;
  if (!force && cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.payload);

  const requestGeneration = generation;
  const controller = new AbortController();
  const promise = fetch("/api/sales-margin", { cache: "no-store", signal: controller.signal })
    .then(async (response) => {
      const body = await response.json() as SalesMarginPayload;
      if (!response.ok) {
        if (requestGeneration === generation && [401, 403].includes(response.status)) cached = null;
        throw new SalesMarginRequestError(body.error || "No fue posible cargar Venta & Margen.", response.status);
      }
      if (requestGeneration === generation) {
        cached = { payload: body, expiresAt: Date.now() + cacheDurationMs };
      }
      return body;
    })
    .finally(() => {
      if (pending?.promise === promise) pending = null;
    });
  pending = { promise, controller };
  return promise;
};
