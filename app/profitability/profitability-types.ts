export const forecastScenarios = ["2025", "2026E", "2026P", "2027P"] as const;
export type ForecastScenario = (typeof forecastScenarios)[number];

export const forecastChannels = ["Brick&Life", "Ecommerce", "Marketplace", "Wholesale", "Consolidado"] as const;
export type ForecastChannel = (typeof forecastChannels)[number];

export type ProfitabilityForecastRow = {
  year: ForecastScenario;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  month: number;
  channel: ForecastChannel;
  brand: string;
  sales: number;
  margin: number;
  operatingCost: number;
  operatingResult: number;
  utility: number;
};

export type ProfitabilityForecastPayload = {
  rows: ProfitabilityForecastRow[];
  source: string;
  queriedAt: string;
  unit: "MM$";
};
