import { requireMenuAuth } from "../_shared/auth";
import { errorResponse, json } from "../_shared/http";
import { getStoreSheetData } from "../_shared/store-sheet";
import { baseConsolidada, baseSnapshotAt } from "../../base-consolidada";
import { catM2SnapshotStores, catM2SnapshotTotals } from "../../cat-m2-2025";
import { storeM2 } from "../../store-m2";
import { storeContractEnd } from "../../store-contract-end";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireMenuAuth(request, "forecast");

    let storeData = { baseConsolidada, baseSnapshotAt };
    try {
      storeData = await getStoreSheetData();
    } catch (sourceError) {
      // B&L must remain available if the live Sheet is temporarily unavailable
      // or the local ADC token has not been granted the Sheets read-only scope.
      console.warn("[portal-data] Se utilizará el snapshot local de B&L.", sourceError);
    }

    return json({
      ...storeData,
      catM2SnapshotStores,
      catM2SnapshotTotals,
      storeM2,
      storeContractEnd,
    });
  } catch (error) {
    return errorResponse(error, "portal-data");
  }
}
