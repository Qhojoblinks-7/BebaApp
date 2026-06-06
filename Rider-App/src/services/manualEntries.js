import { supabase } from "../services/supabaseClient";

export async function insertManualEntry({ userId, type, amount, note, occurredAt }) {
  const payload = {
    rider_id: userId,
    type, // "inflow" | "outflow"
    amount: Number(amount),
    note: note || null,
    occurred_at: occurredAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("manual_entries")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchManualEntries(userId) {
  const { data, error } = await supabase
    .from("manual_entries")
    .select("*")
    .eq("rider_id", userId)
    .order("occurred_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function removeManualEntry(entryId) {
  const { data, error } = await supabase
    .from("manual_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw error;
  return data;
}
