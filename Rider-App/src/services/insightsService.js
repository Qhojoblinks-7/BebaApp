import { getDocuments, upsertDocument, limit } from "./db";
import { where } from "firebase/firestore";
import { getLocalDateBounds } from "./budgetService";

const { periodStart, periodEnd } = getLocalDateBounds();
const monthStartISO = `${periodStart}T00:00:00.000Z`;
const monthEndISO = `${periodEnd}T23:59:59.999Z`;

export function getInsightPeriodBounds() {
  return { monthStartISO, monthEndISO, conflictPeriodKey: periodStart };
}

export async function fetchInsights(userId) {
  const data = await getDocuments("insights", [where("rider_id", "==", userId), limit(100)]);
  return data.sort((a, b) => (b.computed_at || "").localeCompare(a.computed_at || ""));
}

export async function fetchInsightsByCategory(userId, category) {
  const data = await getDocuments("insights", [
    where("rider_id", "==", userId),
    where("category", "==", category),
    limit(100),
  ]);
  return data.sort((a, b) => (b.computed_at || "").localeCompare(a.computed_at || ""));
}

export async function fetchActionPlans(userId) {
  const data = await getDocuments("insight_actions", [where("rider_id", "==", userId), limit(100)]);
  return data.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
}

const spendingKeywords = {
  needs: {
    rent: ["rent", "mortgage", "lease", "landlord"],
    utilities: ["electricity", "water", "utility", "power", "internet", "wifi", "gas", "phone"],
    fuel: ["fuel", "gasoline", "petrol", "diesel", "transport", "transportation", "uber", "taxi"],
    groceries: ["grocery", "supermarket", "food", "market", "provision", "shoprite", "melcom"],
    maintenance: ["repair", "service", "mechanic", "maintenance", "insurance"],
  },
  wants: {
    dining: ["restaurant", "cafe", "dining", "takeaway", "pizza", "burger", "kfc", "mcdonald"],
    entertainment: ["movie", "netflix", "spotify", "hulu", "game", "party", "event", "concert"],
    shopping: ["clothes", "shoe", "shopping", "mall", "amazon", "jumia", "boutique"],
    hobbies: ["hobby", "sport", "gym", "fitness", "club", "subscription"],
  },
  savings: {
    emergency: ["emergency", "backup", "reserve", "rainy day"],
    investment: ["investment", "stock", "bond", "mutual fund", "treasury bill", "share"],
  },
};

export function categorizeTransaction(description, amount, existingCategory) {
  if (existingCategory && ["needs", "wants", "savings"].includes(existingCategory)) {
    return existingCategory;
  }

  const desc = (description || "").toLowerCase();

  for (const [mainCat, subCats] of Object.entries(spendingKeywords)) {
    for (const [subCat, keywords] of Object.entries(subCats)) {
      if (keywords.some((k) => desc.includes(k))) {
        return mainCat;
      }
    }
  }

  // Fallback thresholds for GH₵ currency contextual pricing:
  // Small amounts (<50): Daily needs like fuel, food, transport
  // Medium amounts (50-200): Regular wants like meals out, shopping
  // Larger amounts (>=200): Treat as savings/investments
  if (amount < 50) return "needs";
  if (amount < 200) return "wants";
  return "savings";
}

export async function fetchAllHistoricalData(userId) {
  const [revenueResponse, manualEntriesResponse, ordersResponse] = await Promise.all([
    getDocuments("revenue", [where("rider_id", "==", userId), limit(100)]),
    getDocuments("manual_entries", [where("rider_id", "==", userId), limit(100)]),
    getDocuments("orders", [where("rider_id", "==", userId), limit(100)]),
  ]);

  const entries = manualEntriesResponse || [];
  const enhancedEntries = entries.map((entry) => ({
    ...entry,
    aiCategory: categorizeTransaction(entry.description, entry.amount, entry.category),
  }));

  return {
    revenue: revenueResponse || [],
    entries: enhancedEntries,
    orders: ordersResponse || [],
  };
}

export function detectSpendingPatterns(entries) {
  const patterns = {
    recurringExpenses: [],
    irregularSpending: [],
    averageDailySpending: 0,
    spendingVolatility: 0,
  };

  const dailySpending = {};
  entries
    .filter((e) => e.type === "outflow")
    .forEach((entry) => {
      const date = (entry.occurred_at || "").split("T")[0];
      if (date) {
        dailySpending[date] = (dailySpending[date] || 0) + Math.abs(Number(entry.amount || 0));
      }
    });

  const dates = Object.keys(dailySpending).sort();
  if (dates.length > 1) {
    const amounts = dates.map((d) => dailySpending[d]);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length;
    patterns.averageDailySpending = avg;
    patterns.spendingVolatility = Math.sqrt(variance);
  }

const descriptionCounts = {};
   entries.forEach((e) => {
     if (e.type === "outflow" && e.description) {
       const desc = (e.description || "").toLowerCase();
       if (!descriptionCounts[desc]) descriptionCounts[desc] = { count: 0, total: 0 };
       descriptionCounts[desc].count += 1;
       descriptionCounts[desc].total += Math.abs(Number(e.amount || 0));
     }
   });

  patterns.recurringExpenses = Object.entries(descriptionCounts)
    .filter(([, data]) => data.count >= 2)
    .map(([desc, data]) => ({
      description: desc,
      frequency: data.count,
      totalAmount: data.total,
      avgAmount: data.total / data.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  return patterns;
}

export function generatePredictiveInsights(metrics, patterns) {
  const insights = [];

  if (patterns.recurringExpenses.length > 0) {
    const topRecurring = patterns.recurringExpenses[0];
    insights.push({
      type: "info",
      category: "spending_pattern",
      title: "Recurring Expense Detected",
      body: `"${topRecurring.description}" appears ${topRecurring.frequency} times, totaling GH₵${topRecurring.totalAmount.toFixed(2)}. Consider automating this expense.`,
      metric_value: `${topRecurring.frequency}x`,
    });
  }

  if (patterns.spendingVolatility > 100) {
    insights.push({
      type: "warning",
      category: "spending_pattern",
      title: "Unstable Spending Pattern",
      body: `Your daily spending varies significantly (σ=GH₵${patterns.spendingVolatility.toFixed(0)}). Consider setting daily spending limits.`,
      metric_value: `σ=${patterns.spendingVolatility.toFixed(0)}`,
    });
  }

  if (metrics.totalEarnings > 0) {
    const burnRate = metrics.totalOrders > 0 ? metrics.totalEarnings / metrics.totalOrders : 0;
    insights.push({
      type: "info",
      category: "earning_pattern",
      title: "Earnings per Delivery",
      body: `Average GH₵${burnRate.toFixed(2)} per delivery. Target GH₵25+ for optimal income.`,
      metric_value: `GH₵${burnRate.toFixed(2)}`,
    });
  }

  return insights;
}

export async function computeAndStoreInsights(userId) {
  const { conflictPeriodKey } = getInsightPeriodBounds();

  const [revenueResponse, manualEntriesResponse] = await Promise.all([
    getDocuments("revenue", [where("rider_id", "==", userId), limit(100)]),
    getDocuments("manual_entries", [where("rider_id", "==", userId), limit(100)]),
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

  const enhancedEntries = manualEntries.map((entry) => ({
    ...entry,
    aiCategory: categorizeTransaction(entry.description, entry.amount, entry.category),
  }));

  const allocationRules = { needs: 0.5, wants: 0.3, savings: 0.2 };
  const targets = {
    needs: totalEarnings * allocationRules.needs,
    wants: totalEarnings * allocationRules.wants,
    savings: totalEarnings * allocationRules.savings,
  };

  const spentAggregates = { needs: 0, wants: 0, savings: 0 };
  manualEntries
    .filter((e) => e.type === "inflow" && e.category === "savings")
    .forEach((entry) => {
      spentAggregates.savings += Math.abs(Number(entry.amount || 0));
    });
  enhancedEntries.forEach((entry) => {
    const amount = Number(entry.amount) || 0;
    if (entry.type === "outflow") {
      if (entry.category && ["needs", "wants", "savings"].includes(entry.category)) {
        spentAggregates[entry.category] += amount;
      } else {
        const aiCat = entry.aiCategory;
        if (aiCat in spentAggregates) {
          spentAggregates[aiCat] += amount;
        } else {
          spentAggregates.needs += amount * 0.5;
          spentAggregates.wants += amount * 0.3;
          spentAggregates.savings += amount * 0.2;
        }
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

  const patterns = detectSpendingPatterns(enhancedEntries);
  const predictiveInsights = generatePredictiveInsights(
    { totalEarnings, totalOrders: 10 },
    patterns
  ).map((insight) => ({
    rider_id: userId,
    category: insight.category,
    type: insight.type,
    title: insight.title,
    body: insight.body,
    metric_value: insight.metric_value,
    computed_at: conflictPeriodKey,
  }));

  const allInsights = [...categoryInsights, ...predictiveInsights];

  if (allInsights.length > 0) {
    for (const insight of allInsights) {
      const insightId = `${userId}_${insight.category}_${insight.title.replace(/\s+/g, "_")}_${conflictPeriodKey}`;
      await upsertDocument("insights", insightId, insight);
    }
  }

  return allInsights;
}
