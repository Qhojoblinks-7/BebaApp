import { supabase } from "./supabaseClient";
import { getLocalDateBounds } from "./budgetService";

const { periodStart, periodEnd } = getLocalDateBounds();
const monthStartISO = `${periodStart}T00:00:00.000Z`;
const monthEndISO = `${periodEnd}T23:59:59.999Z`;

export function getInsightPeriodBounds() {
  return { monthStartISO, monthEndISO, conflictPeriodKey: periodStart };
}

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

/**
 * Computes, normalizes, and upserts financial utilization insights safely.
 */
export async function computeAndStoreInsights(userId) {
  const { monthStartISO, conflictPeriodKey } = getInsightPeriodBounds();

  // 1. Fetch concurrent revenue data points in parallel to minimize latency overhead
  const [revenueResponse, manualEntriesResponse] = await Promise.all([
    supabase
      .from("revenue")
      .select("amount")
      .eq("rider_id", userId),
    supabase
      .from("manual_entries")
      .select("type, amount")
      .eq("rider_id", userId)
  ]);

  if (revenueResponse.error) throw revenueResponse.error;
  if (manualEntriesResponse.error) throw manualEntriesResponse.error;

  const deliveryEarnings = (revenueResponse.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
  const externalIncome = (manualEntriesResponse.data || [])
    .filter((e) => e.type === "inflow")
    .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
  const totalEarnings = deliveryEarnings + externalIncome;
  const manualEntries = manualEntriesResponse.data || [];

  if (totalEarnings === 0 && manualEntries.length === 0) {
    return [];
  }

  // 2. Compute true category allocations based on the 50/30/20 budget framework
  const allocationRules = { needs: 0.5, wants: 0.3, savings: 0.2 };
  const targets = {
    needs: totalEarnings * allocationRules.needs,
    wants: totalEarnings * allocationRules.wants,
    savings: totalEarnings * allocationRules.savings,
  };

  // 3. Aggregate real recorded expenditures from manual records without arbitrary scaling percentages
  const spentAggregates = { needs: 0, wants: 0, savings: 0 };
  
  manualEntries.forEach((entry) => {
    const amount = Number(entry.amount) || 0;
    
    if (entry.type === "outflow") {
      if (entry.category === "needs" || entry.category === "wants") {
        spentAggregates[entry.category] += amount;
      } else if (entry.category === "savings") {
        spentAggregates.savings += amount;
      } else {
        spentAggregates.needs += amount * 0.5;
        spentAggregates.wants += amount * 0.3;
        spentAggregates.savings += amount * 0.2;
      }
    }
  });

  // 4. Construct validated insight metric models
  const categoryInsights = Object.keys(allocationRules).map((cat) => {
    const allocated = targets[cat];
    const actualSpent = spentAggregates[cat];
    const percentage = allocated > 0 ? Math.min(Math.round((actualSpent / allocated) * 100), 999) : 0;

    let type = "info";
    let title = `${cat.charAt(0).toUpperCase() + cat.slice(1)} Budget on Track`;
    let body = `You have utilized ${percentage}% of your monthly ${cat} allocation.`;

    if (percentage > 100) {
      type = "danger";
      title = `${cat.charAt(0).toUpperCase() + cat.slice(1)} Budget Exceeded`;
      body = `Alert: You are over budget! Expenditures have reached ${percentage}% of your assigned ${cat} target limit.`;
    } else if (percentage > 85) {
      type = "warning";
      title = `${cat.charAt(0).toUpperCase() + cat.slice(1)} Nearing Limit`;
      body = `Careful: Your spending has reached ${percentage}% of your standard ${cat} framework allocation allowance.`;
    }

    return {
      rider_id: userId,
      category: cat,
      type,
      title,
      body,
      metric_value: `${percentage}%`,
      computed_at: conflictPeriodKey, // FIXED: Populating constraint key to shield execution from structural crashes
    };
  });

  // 5. Commit data records atomically via primary conflict indexes
  if (categoryInsights.length > 0) {
    const { error: upsertError } = await supabase
      .from("insights")
      .upsert(categoryInsights, {
        onConflict: "rider_id,category,computed_at",
      });

    if (upsertError) {
      console.error("[Insights Engine] Batch persistence write failure:", upsertError.message);
      throw upsertError;
    }
  }

  return categoryInsights;
}