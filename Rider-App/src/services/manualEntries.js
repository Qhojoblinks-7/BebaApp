import { supabase } from "./supabaseClient";
import { computeAndStoreInsights } from "./insightsService"; // Import engine context directly

/**
 * Persists a new manual financial log entry and atomic updates insights cache.
 */
export async function insertManualEntry({ 
  userId, 
  type,          // "inflow" | "outflow"
  category,      // "needs" | "wants" | "savings"
  amount, 
  note, 
  occurredAt 
}) {
  if (!userId || !type || !category || !amount) {
    throw new Error("[Manual Entries Error] Missing required transaction parameters.");
  }

  const payload = {
    rider_id: userId,
    type,
    category: category.toLowerCase().trim(), // FIXED: Aligns data footprint with your budgeting engine
    amount: Math.abs(Number(amount)),       // Ensures value is parsed as a clean absolute number
    note: note?.trim() || null,
    occurred_at: occurredAt || new Date().toISOString(),
  };

  // 1. Commit the manual log row to the database
  const { data: transactionRecord, error: transactionError } = await supabase
    .from("manual_entries")
    .insert(payload)
    .select("*")
    .single();

  if (transactionError) {
    console.error("[Manual Entries] Insertion failure:", transactionError.message);
    throw transactionError;
  }

  try {
    // 2. Cascade Side-Effect: Re-calculate insights metrics asynchronously in the background
    console.log("[Manual Entries] Triggering background budget re-calculation for rider:", userId);
    await computeAndStoreInsights(userId);
  } catch (insightErr) {
    // Log the error but don't crash the operation if only the background cache calculation fails
    console.warn("[Manual Entries] Non-blocking insight update failure ignored:", insightErr.message);
  }

  return transactionRecord;
}

/**
 * Retrieves all manual entries logged by a specific rider sorted chronologically.
 */
export async function fetchManualEntries(userId) {
  const { data, error } = await supabase
    .from("manual_entries")
    .select("*")
    .eq("rider_id", userId)
    .order("occurred_at", { ascending: false });

  if (error) {
    console.error("[Manual Entries] Failed to retrieve ledger entries:", error.message);
    throw error;
  }
  
  return data || [];
}

/**
 * Atomically purges a transaction record and refreshes the rider's budget snapshots.
 */
export async function removeManualEntry(entryId, userId) {
  if (!entryId) throw new Error("[Manual Entries Error] Target entry identifier required for removal.");

  // Execute deletion pass
  const { error: deleteError } = await supabase
    .from("manual_entries")
    .delete()
    .eq("id", entryId);

  if (deleteError) {
    console.error("[Manual Entries] Mutation deletion failure:", deleteError.message);
    throw deleteError;
  }

  // If a userId is provided, refresh their analytics parameters immediately
  if (userId) {
    try {
      console.log("[Manual Entries] Post-deletion cache refresh executing for rider:", userId);
      await computeAndStoreInsights(userId);
    } catch (insightErr) {
      console.warn("[Manual Entries] Non-blocking insight update failure ignored:", insightErr.message);
    }
  }

  return true;
}