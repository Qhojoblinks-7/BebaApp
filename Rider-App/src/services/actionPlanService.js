import { getDocuments, upsertDocument, limit } from "./db";
import { where } from "firebase/firestore";

import { categorizeTransaction } from "./insightsService";

export async function fetchActionPlans(userId) {
  const data = await getDocuments("insight_actions", [where("rider_id", "==", userId), limit(100)]);
  return data.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
}

export function generateActionPlans(data) {
  const plans = [];
  const savingsRate = data.totalEarnings > 0 ? data.outflowByCategory.savings / data.totalEarnings : 0;
  const needsRate = data.totalEarnings > 0 ? data.outflowByCategory.needs / data.totalEarnings : 0;
  const wantsRate = data.totalEarnings > 0 ? data.outflowByCategory.wants / data.totalEarnings : 0;

  if (savingsRate < 0.1) {
    plans.push({
      id: "save_more",
      priority: "high",
      title: "Increase Savings Rate",
      description: `Your savings rate is ${Math.round(savingsRate * 100)}%. Aim for at least 20% of earnings.`,
      suggestedAction: "Set aside GH₵" + (data.totalEarnings * 0.1).toFixed(2) + " daily for savings.",
      category: "financial_health",
    });
  }

  if (needsRate > 0.6) {
    plans.push({
      id: "reduce_needs",
      priority: "medium",
      title: "Optimize Needs Spending",
      description: `Needs spending at ${Math.round(needsRate * 100)}% exceeds recommended 50%.`,
      suggestedAction: "Review fuel costs, consider bulk grocery buying to reduce routine expenses.",
      category: "budget_optimization",
    });
  }

  if (wantsRate > 0.35) {
    plans.push({
      id: "control_wants",
      priority: "medium",
      title: "Manage Wants Spending",
      description: `Wants spending at ${Math.round(wantsRate * 100)}% exceeds recommended 30%.`,
      suggestedAction: "Limit discretionary spending to twice per week maximum.",
      category: "budget_control",
    });
  }

  return plans;
}

export async function generateAndStoreActionPlans(userId) {
  const [revenueResponse, manualEntriesResponse] = await Promise.all([
    getDocuments("revenue", [where("rider_id", "==", userId), limit(100)]),
    getDocuments("manual_entries", [where("rider_id", "==", userId), limit(100)]),
  ]);

  const deliveryEarnings = (revenueResponse || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const manualEntries = manualEntriesResponse || [];
  const manualInflows = manualEntries
    .filter((e) => e.type === "inflow")
    .reduce((sum, e) => sum + Math.abs(Number(e.amount || 0)), 0);
  const totalEarnings = deliveryEarnings + manualInflows;

  const entries = manualEntries.map((entry) => ({
    ...entry,
    aiCategory: categorizeTransaction(entry.description, entry.amount, entry.category),
  }));

  const outflowByCategory = { needs: 0, wants: 0, savings: 0 };
  manualEntries
    .filter((e) => e.type === "inflow" && e.category === "savings")
    .forEach((entry) => {
      outflowByCategory.savings += Math.abs(Number(entry.amount || 0));
    });
  entries
    .filter((e) => e.type === "outflow")
    .forEach((entry) => {
      const amount = Math.abs(Number(entry.amount || 0));
      const cat = entry.aiCategory || entry.category;
      if (cat in outflowByCategory) {
        outflowByCategory[cat] += amount;
      } else {
        outflowByCategory.needs += amount * 0.5;
        outflowByCategory.wants += amount * 0.3;
        outflowByCategory.savings += amount * 0.2;
      }
    });

  const input = {
    totalEarnings,
    totalOutflows: manualEntries
      .filter((e) => e.type === "outflow")
      .reduce((sum, e) => sum + Math.abs(Number(e.amount || 0)), 0),
    outflowByCategory,
    completionRate: 85,
    totalOrders: totalEarnings > 0 ? Math.floor(totalEarnings / 25) : 0,
  };

  const plans = generateActionPlans(input);

  if (plans.length > 0) {
    for (const plan of plans) {
      const planId = `${userId}_${plan.id}`;
      await upsertDocument("insight_actions", planId, {
        rider_id: userId,
        action_id: plan.id,
        priority: plan.priority,
        title: plan.title,
        description: plan.description,
        suggested_action: plan.suggestedAction,
        category: plan.category,
      });
    }
  }

  return plans;
}