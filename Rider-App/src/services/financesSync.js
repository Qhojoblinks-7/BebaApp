import { supabase } from "./supabaseClient";

export async function syncBudgetAllocations(userId) {
  if (!userId) return;

  const { periodStart, periodEnd } = getLocalDateBounds();

  const [revenueRes, manualRes] = await Promise.all([
    supabase.from("revenue").select("amount").eq("rider_id", userId),
    supabase
      .from("manual_entries")
      .select("type, category, amount")
      .eq("rider_id", userId),
  ]);

  if (revenueRes.error) throw revenueRes.error;
  if (manualRes.error) throw manualRes.error;

  const deliveryEarnings = (revenueRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
  const manualInflows = (manualRes.data || [])
    .filter((e) => e.type === "inflow")
    .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);

  const totalEarnings = deliveryEarnings + manualInflows;
  if (totalEarnings <= 0) return;

  const spentAggregates = { needs: 0, wants: 0, savings: 0 };
  (manualRes.data || []).forEach((entry) => {
    if (entry.type === "outflow") {
      const amount = Math.abs(Number(entry.amount) || 0);
      if (entry.category === "needs" || entry.category === "wants" || entry.category === "savings") {
        spentAggregates[entry.category] += amount;
      } else {
        spentAggregates.needs += amount * 0.5;
        spentAggregates.wants += amount * 0.3;
        spentAggregates.savings += amount * 0.2;
      }
    }
  });

  const allocationRules = [
    { key: "needs", percent: 50, color: "#a855f7", icon: "Home", description: "Rent, utilities, fuel, maintenance" },
    { key: "wants", percent: 30, color: "#6366f1", icon: "ShoppingBag", description: "Dining out, hobbies, shopping" },
    { key: "savings", percent: 20, color: "#10b981", icon: "PiggyBank", description: "Emergency fund, investments" },
  ];

  const allocations = allocationRules.map((rule) => {
    const allocatedAmount = totalEarnings * (rule.percent / 100);
    const spentAmount = spentAggregates[rule.key] || 0;
    return {
      rider_id: userId,
      category: rule.key,
      allocated_percent: rule.percent,
      allocated_amount: allocatedAmount,
      spent_amount: spentAmount,
      period_start: periodStart,
      period_end: periodEnd,
    };
  });

  const { error: allocError } = await supabase
    .from("budget_allocations")
    .upsert(allocations, { onConflict: "rider_id,category,period_start,period_end" });

  if (allocError) throw allocError;
}

export async function syncInsightActions(userId) {
  if (!userId) return;

  const { data: insights, error: insightsError } = await supabase
    .from("insights")
    .select("*")
    .eq("rider_id", userId)
    .order("computed_at", { ascending: false })
    .limit(10);

  if (insightsError) throw insightsError;
  if (!insights || insights.length === 0) return;

  const actions = [];
  insights.forEach((insight) => {
    if (insight.type === "danger") {
      actions.push({
        rider_id: userId,
        category: insight.category,
        title: `Reduce ${insight.category} spending`,
        description: `${insight.body} Review your ${insight.category} transactions and cut non-essential expenses this period.`,
      });
    } else if (insight.type === "warning") {
      actions.push({
        rider_id: userId,
        category: insight.category,
        title: `Monitor ${insight.category} closely`,
        description: `${insight.body} Avoid new ${insight.category} commitments until next earnings cycle.`,
      });
    }
  });

  if (actions.length > 0) {
    const { error } = await supabase.from("insight_actions").upsert(actions, {
      onConflict: "rider_id,category,title",
    });
    if (error) throw error;
  }
}

export async function syncAllFinances(userId) {
  if (!userId) return;
  await syncBudgetAllocations(userId);
  await syncInsightActions(userId);
}

function getLocalDateBounds() {
  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart, periodEnd };
}
