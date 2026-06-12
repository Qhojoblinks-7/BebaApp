import {
  getDocuments,
  upsertDocument,
  insertDocument,
  deleteDocument,
  where,
  orderBy,
  limit,
  collection,
} from "./db";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export function getLocalDateBounds() {
  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart, periodEnd };
}

export async function fetchBudgetBreakdownData(userId) {
  const { periodStart, periodEnd } = getLocalDateBounds();

  const allocations = await getDocuments("budget_allocations", [
    where("rider_id", "==", userId),
    where("period_start", ">=", periodStart),
    where("period_end", "<=", periodEnd),
    orderBy("allocated_percent", "desc"),
    limit(100),
  ]);

  if (!allocations || allocations.length === 0) return null;
  const categoryMap = {};

  allocations.forEach((alloc) => {
    const sortedSubItems = (alloc.budget_items || []).sort((a, b) => a.name.localeCompare(b.name));
    categoryMap[alloc.category] = {
      id: alloc.id,
      rider_id: alloc.rider_id,
      category: alloc.category,
      allocated_percent: alloc.allocated_percent,
      allocated_amount: Number(alloc.allocated_amount || 0),
      spent_amount: Number(alloc.spent_amount || 0),
      period_start: alloc.period_start,
      period_end: alloc.period_end,
      subItems: sortedSubItems.map((it) => ({
        id: it.id,
        name: it.name,
        amount: Number(it.allocated_amount || 0),
        spent: Number(it.spent_amount || 0),
      })),
      icon: getCategoryIcon(alloc.category),
      description: getCategoryDescription(alloc.category),
    };
  });

  return categoryMap;
}

export async function createOrUpdateBudgetAllocation({
  userId,
  category,
  allocatedPercent,
  allocatedAmount,
  spentAmount,
  periodStart,
  periodEnd,
  subItems = [],
}) {
  const id = `${userId}_${category}_${periodStart}`;
  const allocation = await upsertDocument("budget_allocations", id, {
    rider_id: userId,
    category,
    allocated_percent: allocatedPercent,
    allocated_amount: allocatedAmount,
    spent_amount: spentAmount,
    period_start: periodStart,
    period_end: periodEnd,
  });

  if (subItems && subItems.length > 0) {
    const existing = await getDocuments("budget_items", [
      where("allocation_id", "==", id),
      limit(100),
    ]);
    for (const item of existing) {
      await deleteDocument("budget_items", item.id);
    }

    const itemsPayload = subItems.map((item) => ({
      allocation_id: id,
      name: item.name,
      allocated_amount: item.amount,
      spent_amount: item.spent || 0,
    }));

    for (const item of itemsPayload) {
      await insertDocument("budget_items", item);
    }
  }

  return allocation.id || id;
}

export async function getLiveBudgetWithExpenses(userId) {
  const revenue = await getDocuments("revenue", [where("rider_id", "==", userId), limit(100)]);
  const inflowEntries = await getDocuments("manual_entries", [
    where("rider_id", "==", userId),
    where("type", "==", "inflow"),
    limit(100),
  ]);

  const deliveryEarnings = (revenue || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const manualInflows = (inflowEntries || []).reduce((sum, r) => sum + Math.abs(Number(r.amount || 0)), 0);
  const totalEarnings = deliveryEarnings + manualInflows;

  if (totalEarnings <= 0) return { totalEarnings: 0, manualInflows: 0, categories: buildDefaultBudget(0) };

  const allocations = await getDocuments("budget_allocations", [
    where("rider_id", "==", userId),
    orderBy("allocated_percent", "desc"),
    limit(100),
  ]);

  if (allocations && allocations.length > 0) {
    return {
      totalEarnings,
      manualInflows,
      categories: allocations.map((alloc) => {
        const sortedSubItems = (alloc.budget_items || []).sort((a, b) => a.name.localeCompare(b.name));
        return {
          id: alloc.category,
          title: `${alloc.allocated_percent}% ${alloc.category.charAt(0).toUpperCase() + alloc.category.slice(1)}`,
          allocated: Number(alloc.allocated_amount || 0),
          spent: Number(alloc.spent_amount || 0),
          color: alloc.category === "needs" ? "#a855f7" : alloc.category === "wants" ? "#6366f1" : "#10b981",
          description: getCategoryDescription(alloc.category),
          icon: getCategoryIcon(alloc.category),
          subItems: sortedSubItems.map((it) => ({
            name: it.name,
            amount: Number(it.allocated_amount || 0),
            spent: Number(it.spent_amount || 0),
          })),
        };
      }),
    };
  }

  const entries = await getDocuments("manual_entries", [
    where("rider_id", "==", userId),
    where("type", "==", "outflow"),
    limit(100),
  ]);

  const spentAggregates = { needs: 0, wants: 0, savings: 0 };
  (inflowEntries || [])
    .filter((entry) => entry.category === "savings")
    .forEach((entry) => {
      spentAggregates.savings += Math.abs(Number(entry.amount || 0));
    });
  entries.forEach((entry) => {
    const amount = Math.abs(Number(entry.amount || 0));
    const cat = entry.category;
    if (cat === "needs" || cat === "wants" || cat === "savings") {
      spentAggregates[cat] += amount;
    } else {
      spentAggregates.needs += amount * 0.5;
      spentAggregates.wants += amount * 0.3;
      spentAggregates.savings += amount * 0.2;
    }
  });

  const allocationRules = { needs: 0.5, wants: 0.3, savings: 0.2 };
  const categories = Object.keys(allocationRules).map((cat) => {
    const allocated = totalEarnings * allocationRules[cat];
    const actualSpent = spentAggregates[cat] || 0;
    return {
      id: cat,
      title: `${Math.round(allocationRules[cat] * 100)}% ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      allocated,
      spent: actualSpent,
      color: cat === "needs" ? "#a855f7" : cat === "wants" ? "#6366f1" : "#10b981",
      description: getCategoryDescription(cat),
      icon: getCategoryIcon(cat),
      subItems: buildSubItems(cat, allocated),
    };
  });

  return { totalEarnings, manualInflows, categories };
}

function buildSubItems(category, totalAllocated) {
  const defs = {
    needs: [
      { name: "Rent", pct: 0.15 },
      { name: "Utilities", pct: 0.05 },
      { name: "Fuel", pct: 0.08 },
      { name: "Groceries", pct: 0.12 },
    ],
    wants: [
      { name: "Dining Out", pct: 0.08 },
      { name: "Hobbies", pct: 0.05 },
      { name: "Shopping", pct: 0.12 },
    ],
    savings: [
      { name: "Emergency Fund", pct: 0.1 },
      { name: "Investments", pct: 0.1 },
    ],
  };
  return (defs[category] || []).map((item) => ({
    name: item.name,
    amount: totalAllocated * item.pct,
    spent: 0,
  }));
}

export function buildDefaultBudget(totalEarnings) {
  return [
    {
      id: "needs",
      title: "50% Needs",
      allocated: totalEarnings * 0.5,
      spent: 0,
      color: "#a855f7",
      description: "Rent, utilities, fuel, maintenance",
      icon: "Home",
      subItems: [
        { name: "Rent", amount: totalEarnings * 0.15 },
        { name: "Utilities", amount: totalEarnings * 0.05 },
        { name: "Fuel", amount: totalEarnings * 0.08 },
        { name: "Groceries", amount: totalEarnings * 0.12 },
      ],
    },
    {
      id: "wants",
      title: "30% Wants",
      allocated: totalEarnings * 0.3,
      spent: 0,
      color: "#6366f1",
      description: "Dining out, hobbies, shopping",
      icon: "ShoppingBag",
      subItems: [
        { name: "Dining Out", amount: totalEarnings * 0.08 },
        { name: "Hobbies", amount: totalEarnings * 0.05 },
        { name: "Shopping", amount: totalEarnings * 0.12 },
      ],
    },
    {
      id: "savings",
      title: "20% Savings",
      allocated: totalEarnings * 0.2,
      spent: 0,
      color: "#10b981",
      description: "Emergency fund, investments",
      icon: "PiggyBank",
      subItems: [
        { name: "Emergency Fund", amount: totalEarnings * 0.1 },
        { name: "Investments", amount: totalEarnings * 0.1 },
      ],
    },
  ];
}

function getCategoryIcon(category) {
  const map = { needs: "Home", wants: "ShoppingBag", savings: "PiggyBank" };
  return map[category] || "Wallet";
}

function getCategoryDescription(category) {
  const map = {
    needs: "Rent, utilities, fuel, maintenance",
    wants: "Dining out, hobbies, personal treats",
    savings: "Emergency backup reserves, investments",
  };
  return map[category] || "";
}
