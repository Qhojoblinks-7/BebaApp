import { getDocuments, upsertDocument } from "./db";
import { where } from "firebase/firestore";
import { getLocalDateBounds } from "./budgetService";

const { periodStart, periodEnd } = getLocalDateBounds();
const monthStartISO = `${periodStart}T00:00:00.000Z`;
const monthEndISO = `${periodEnd}T23:59:59.999Z`;

export function getInsightPeriodBounds() {
  return { monthStartISO, monthEndISO, conflictPeriodKey: periodStart };
}

export async function fetchInsights(userId) {
  const data = await getDocuments("insights", [where("rider_id", "==", userId)]);
  return data.sort((a, b) => (b.computed_at || "").localeCompare(a.computed_at || ""));
}

export async function fetchInsightsByCategory(userId, category) {
  const data = await getDocuments("insights", [
    where("rider_id", "==", userId),
    where("category", "==", category),
  ]);
  return data.sort((a, b) => (b.computed_at || "").localeCompare(a.computed_at || ""));
}

export async function fetchActionPlans(userId) {
  const data = await getDocuments("insight_actions", [where("rider_id", "==", userId)]);
  return data.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
}

export async function computeAndStoreInsights(userId) {
  const { conflictPeriodKey } = getInsightPeriodBounds();

  const [revenueResponse, manualEntriesResponse] = await Promise.all([
    getDocuments("revenue", [where("rider_id", "==", userId)]),
    getDocuments("manual_entries", [where("rider_id", "==", userId)]),
  ]);

  const deliveryEarnings = (revenueResponse || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const manualEntries = manualEntriesResponse || [];
  const externalIncome = manualEntries
    .filter((e) => e.type === "inflow")
    .reduce((sum, e) => sum + Math.abs(Number(e.amount || 0)), 0);
  const totalEarnings = deliveryEarnings + externalIncome;

  if (totalEarnings === 0 && manualEntries.length === 0) {
    return [];
  }

  const allocationRules = { needs: 0.5, wants: 0.3, savings: 0.2 };
  const targets = {
    needs: totalEarnings * allocationRules.needs,
    wants: totalEarnings * allocationRules.wants,
    savings: totalEarnings * allocationRules.savings,
  };

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
      computed_at: conflictPeriodKey,
    };
  });

  if (categoryInsights.length > 0) {
    for (const insight of categoryInsights) {
      const insightId = `${userId}_${insight.category}_${conflictPeriodKey}`;
      await upsertDocument("insights", insightId, insight);
    }
  }

  return categoryInsights;
}
