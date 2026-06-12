import { getDocuments, insertDocumentWithId, upsertDocument, limit } from "./db";
import { where } from "firebase/firestore";
import { getLocalDateBounds } from "./budgetService";

export async function syncBudgetAllocations(userId) {
  if (!userId) return;

  const { periodStart, periodEnd } = getLocalDateBounds();

  const [revenueRes, manualRes] = await Promise.all([
    getDocuments("revenue", [where("rider_id", "==", userId), limit(100)]),
    getDocuments("manual_entries", [where("rider_id", "==", userId), limit(100)]),
  ]);

  const deliveryEarnings = (revenueRes || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const manualInflows = (manualRes || [])
    .filter((e) => e.type === "inflow")
    .reduce((sum, e) => sum + Math.abs(Number(e.amount || 0)), 0);

  const totalEarnings = deliveryEarnings + manualInflows;
  if (totalEarnings <= 0) return;

  const spentAggregates = { needs: 0, wants: 0, savings: 0 };
  (manualRes || [])
    .filter((entry) => entry.type === "inflow" && entry.category === "savings")
    .forEach((entry) => {
      spentAggregates.savings += Math.abs(Number(entry.amount || 0));
    });
  (manualRes || []).forEach((entry) => {
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
    { key: "needs", percent: 50 },
    { key: "wants", percent: 30 },
    { key: "savings", percent: 20 },
  ];

  const allocations = allocationRules.map((rule) => ({
    rider_id: userId,
    category: rule.key,
    allocated_percent: rule.percent,
    allocated_amount: totalEarnings * (rule.percent / 100),
    spent_amount: spentAggregates[rule.key] || 0,
    period_start: periodStart,
    period_end: periodEnd,
  }));

  for (const alloc of allocations) {
    const id = `${userId}_${alloc.category}_${periodStart}`;
    await upsertDocument("budget_allocations", id, alloc);
  }
}

export async function syncInsightActions(userId) {
  if (!userId) return;

  const insights = await getDocuments("insights", [
    where("rider_id", "==", userId),
    limit(100),
  ]);

  const recent = (insights || []).slice(0, 10);
  if (recent.length === 0) return;

  const actions = [];
  recent.forEach((insight) => {
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
    for (const action of actions) {
      const id = `${userId}_${action.category}_${action.title}`;
      await upsertDocument("insight_actions", id, action);
    }
  }
}

export async function syncAllFinances(userId) {
  if (!userId) return;
  await syncBudgetAllocations(userId);
  await syncInsightActions(userId);
}
