"use client";

import {
  createContext,
  useContext,
} from "react";

import type {
  ProfitabilityBlData,
} from "../domain/profitability-bl-data";

export const ProfitabilityBlDataContext =
  createContext<ProfitabilityBlData | null>(
    null,
  );

export function useProfitabilityBlData():
  ProfitabilityBlData {
  const data = useContext(
    ProfitabilityBlDataContext,
  );

  if (!data) {
    throw new Error(
      "Profitability B&L data is required.",
    );
  }

  return data;
}