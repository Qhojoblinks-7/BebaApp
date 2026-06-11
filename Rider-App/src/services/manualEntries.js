import { getDocuments, where, insertDocument, deleteDocument } from "./db";
import { computeAndStoreInsights } from "./insightsService";
import { syncAllFinances } from "./financesSync";

export async function insertManualEntry({
  userId,
  type,
  category,
  amount,
  note,
  occurredAt,
}) {
  if (!userId || !type || !category || !amount) {
    throw new Error("[Manual Entries Error] Missing required transaction parameters.");
  }

  const payload = {
    rider_id: userId,
    type,
    category: category.toLowerCase().trim(),
    amount: Math.abs(Number(amount)),
    note: note?.trim() || null,
    occurred_at: occurredAt || new Date().toISOString(),
  };

  const transactionRecord = await insertDocument("manual_entries", payload);

  try {
    console.log("[Manual Entries] Triggering background budget re-calculation for rider:", userId);
    await computeAndStoreInsights(userId);
    await syncAllFinances(userId);
    console.log("[Manual Entries] Finance sync complete");
  } catch (insightErr) {
    console.warn("[Manual Entries] Non-blocking insight update failure ignored:", insightErr.message);
  }

  return transactionRecord;
}

export async function fetchManualEntries(userId) {
  const data = await getDocuments("manual_entries", [
    where("rider_id", "==", userId),
  ]);
  return data.sort((a, b) => {
    const ta = new Date(a.occurred_at || 0).getTime();
    const tb = new Date(b.occurred_at || 0).getTime();
    return tb - ta;
  });
}

export async function removeManualEntry(entryId, userId) {
  if (!entryId) throw new Error("[Manual Entries Error] Target entry identifier required for removal.");

  await deleteDocument("manual_entries", entryId);

  if (userId) {
    try {
      console.log("[Manual Entries] Post-deletion cache refresh executing for rider:", userId);
      await computeAndStoreInsights(userId);
      await syncAllFinances(userId);
    } catch (insightErr) {
      console.warn("[Manual Entries] Non-blocking insight update failure ignored:", insightErr.message);
    }
  }

  return true;
}
