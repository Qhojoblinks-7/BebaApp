import { supabase } from "./supabaseClient";

export async function fetchInsights(userId) {
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("rider_id", userId)
    .order("computed_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchInsightsByCategory(userId, category) {
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("rider_id", userId)
    .eq("category", category)
    .order("computed_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchActionPlans(userId) {
  const { data, error } = await supabase
    .from("insight_actions")
    .select("*")
    .eq("rider_id", userId)
    .order("id");

  if (error) throw error;
  return data || [];
}

export async function computeAndStoreInsights(userId) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split("T")[0];

  const { data: revenue, error: revenueError } = await supabase
    .from("revenue")
    .select("amount, order_completed_at")
    .eq("rider_id", userId)
    .gte("order_completed_at", monthStart);

  if (revenueError) throw revenueError;

  const totalEarnings = (revenue || []).reduce((sum, r) => sum + Number(r.amount), 0);

  const { data: manualEntries, error: manualError } = await supabase
    .from("manual_entries")
    .select("type, amount, occurred_at")
    .eq("rider_id", userId)
    .gte("occurred_at", monthStart);

  if (manualError) throw manualError;

  const outflows = (manualEntries || [])
    .filter((e) => e.type === "outflow")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  if (totalEarnings === 0 && outflows === 0) return [];

  const inflows = (manualEntries || [])
    .filter((e) => e.type === "inflow")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const categories = ["needs", "wants", "savings"];
  const categoryInsights = [];

  for (const cat of categories) {
    const allocated = totalEarnings * (cat === "needs" ? 0.5 : cat === "wants" ? 0.3 : 0.2);
    const catSpent = cat === "savings"
      ? inflows * 0.1
      : outflows * (cat === "needs" ? 0.5 : 0.4);
    const percentage = allocated > 0 ? Math.round((catSpent / allocated) * 100) : 0;

    categoryInsights.push({
      rider_id: userId,
      category: cat,
      type: percentage > 90 ? "warning" : "info",
      title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Utilization at ${percentage}%`,
      body: `You have used ${percentage}% of your ${cat} allocation this month.`,
      metric_value: `${percentage}%`,
    });
  }

  if (categoryInsights.length > 0) {
    const { error: upsertError } = await supabase
      .from("insights")
      .upsert(categoryInsights, {
        onConflict: "rider_id,category,computed_at",
      });

    if (upsertError) throw upsertError;
  }

  return categoryInsights;
}
