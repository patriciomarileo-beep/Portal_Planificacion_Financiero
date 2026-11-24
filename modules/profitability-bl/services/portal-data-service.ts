import type {
  ProfitabilityBlData,
} from "../domain/profitability-bl-data";

export class PortalDataUnauthorizedError extends Error {
  constructor() {
    super("La sesión ya no está disponible.");
    this.name = "PortalDataUnauthorizedError";
  }
}

export async function requestPortalData(
  signal?: AbortSignal,
): Promise<ProfitabilityBlData> {
  const response = await fetch("/api/portal-data", {
    cache: "no-store",
    signal,
  });

  if (response.status === 401) {
    throw new PortalDataUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(
      "No fue posible cargar los informes. Intenta nuevamente.",
    );
  }

  return await response.json() as ProfitabilityBlData;
}