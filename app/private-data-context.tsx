"use client";
import { createContext, useContext } from "react";
import type { baseConsolidada, baseSnapshotAt } from "./base-consolidada";
import type { catM2SnapshotStores, catM2SnapshotTotals } from "./cat-m2-2025";
import type { storeM2 } from "./store-m2";
import type { storeContractEnd } from "./store-contract-end";
import type { profitabilityData } from "./profitability/profitability-data";
export type PrivateData = {
  baseConsolidada: typeof baseConsolidada;
  baseSnapshotAt: typeof baseSnapshotAt;
  catM2SnapshotStores: typeof catM2SnapshotStores;
  catM2SnapshotTotals: typeof catM2SnapshotTotals;
  storeM2: typeof storeM2;
  storeContractEnd: typeof storeContractEnd;
  profitabilityData: typeof profitabilityData;
};
export const PrivateDataContext = createContext<PrivateData | null>(null);
export const usePrivateData = () => {
  const data = useContext(PrivateDataContext);
  if (!data) throw new Error("Authenticated portal data required.");
  return data;
};
