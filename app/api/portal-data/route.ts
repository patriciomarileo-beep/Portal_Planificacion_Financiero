import { requireMenuAuth } from "../_shared/auth";
import { errorResponse, json } from "../_shared/http";
import { getStoreSheetData } from "../_shared/store-sheet";
import { catM2SnapshotStores, catM2SnapshotTotals } from "../../cat-m2-2025";
import { storeM2 } from "../../store-m2";
import { storeContractEnd } from "../../store-contract-end";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireMenuAuth(request, "forecast");
    const storeData = await getStoreSheetData();

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
