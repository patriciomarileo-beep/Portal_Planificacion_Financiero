import { requireMenuAuth } from "../_shared/auth";
import { errorResponse, json } from "../_shared/http";
import { getStoreBigQueryData } from "../_shared/store-bigquery";
import { catM2SnapshotStores, catM2SnapshotTotals } from "../../cat-m2-2025";
import { storeM2 } from "../../store-m2";
import { storeContractEnd } from "../../store-contract-end";

import type {
  ProfitabilityBlData,
} from "@/modules/profitability-bl/domain/profitability-bl-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireMenuAuth(request, "forecast");
    const storeData = await getStoreBigQueryData();

    const payload = {
      ...storeData,
      catM2SnapshotStores,
      catM2SnapshotTotals,
      storeM2,
      storeContractEnd,
    } satisfies ProfitabilityBlData;
    return json(payload);
  } catch (error) {
    return errorResponse(error, "portal-data");
  }
}
