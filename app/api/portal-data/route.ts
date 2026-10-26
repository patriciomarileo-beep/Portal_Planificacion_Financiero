import { requireAuth } from "../_shared/auth";
import { errorResponse, json } from "../_shared/http";
import { baseConsolidada, baseSnapshotAt } from "../../base-consolidada";
import { catM2SnapshotStores, catM2SnapshotTotals } from "../../cat-m2-2025";
import { storeM2 } from "../../store-m2";
import { storeContractEnd } from "../../store-contract-end";
import { profitabilityData } from "../../profitability/profitability-data";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireAuth(request);
    return json({ baseConsolidada, baseSnapshotAt, catM2SnapshotStores, catM2SnapshotTotals, storeM2, storeContractEnd, profitabilityData });
  } catch (error) { return errorResponse(error, "portal-data"); }
}
