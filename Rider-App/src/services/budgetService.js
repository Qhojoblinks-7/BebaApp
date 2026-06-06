import { supabase } from "./supabaseClient";

export async function fetchBudgetAllocations(userId, periodStart, periodEnd) {
  let query = supabase
    .from("budget_allocations")
    .select("*")
    .eq("rider_id", userId);

  if (periodStart) query = query.gte("period_start", periodStart);
  if (periodEnd) query = query.lte("period_end", periodEnd);

  const { data, error } = await query.order("allocated_percent", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchBudgetItems(allocationId) {
  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("allocation_id", allocationId)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function fetchBudgetBreakdownData(userId) {
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split("T")[0];
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().split("T")[0];

  const allocations = await fetchBudgetAllocations(userId, periodStart, periodEnd);

  if (allocations.length === 0) {
    return null;
  }

  const categoryMap = {};
  for (const alloc of allocations) {
    const items = await fetchBudgetItems(alloc.id);
    categoryMap[alloc.category] = {
      ...alloc,
      subItems: items.map((it) => ({
        name: it.name,
        amount: Number(it.allocated_amount),
      })),
      icon: getCategoryIcon(alloc.category),
      description: getCategoryDescription(alloc.category),
    };
  }

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
  subItems,
}) {
  const { data: existing, error: fetchError } = await supabase
    .from("budget_allocations")
    .select("id")
    .eq("rider_id", userId)
    .eq("category", category)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  if (fetchError) throw fetchError;

  let allocationId;
  if (existing) {
    const { data, error: updateError } = await supabase
      .from("budget_allocations")
      .update({
        allocated_percent: allocatedPercent,
        allocated_amount: allocatedAmount,
        spent_amount: spentAmount,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError) throw updateError;
    allocationId = data.id;

    await supabase
      .from("budget_items")
      .delete()
      .eq("allocation_id", allocationId);
  } else {
    const { data, error: insertError } = await supabase
      .from("budget_allocations")
      .insert({
        rider_id: userId,
        category,
        allocated_percent: allocatedPercent,
        allocated_amount: allocatedAmount,
        spent_amount: spentAmount,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    allocationId = data.id;
  }

  if (subItems && subItems.length > 0) {
    const itemsPayload = subItems.map((item) => ({
      allocation_id: allocationId,
      name: item.name,
      allocated_amount: item.amount,
      spent_amount: item.spent || 0,
    }));

    const { error: itemsError } = await supabase
      .from("budget_items")
      .insert(itemsPayload);

    if (itemsError) throw itemsError;
  }

  return allocationId;
}

export async function getLiveBudgetFromRevenue(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: revenue, error: revenueError } = await supabase
    .from("revenue")
    .select("amount, order_completed_at")
    .eq("rider_id", userId)
    .gte("order_completed_at", startOfMonth.toISOString());

  if (revenueError) throw revenueError;

  const totalEarnings = (revenue || []).reduce((sum, r) => sum + Number(r.amount), 0);

  if (totalEarnings <= 0) {
    return [];
  }

  const allocations = [
    {
      id: "needs",
      title: "50% Needs",
      allocated: totalEarnings * 0.5,
      spent: totalEarnings * 0.4,
      color: "#a855f7",
      description: "Rent, utilities, fuel, food",
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
      spent: totalEarnings * 0.25,
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
      spent: totalEarnings * 0.2,
      color: "#10b981",
      description: "Emergency fund, investments",
      icon: "PiggyBank",
      subItems: [
        { name: "Emergency Fund", amount: totalEarnings * 0.1 },
        { name: "Investments", amount: totalEarnings * 0.1 },
      ],
    },
  ];

  return allocations;
}

export async function fetchBudgetAllocationsFromServer(userId) {
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split("T")[0];
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().split("T")[0];

  const allocations = await fetchBudgetAllocations(userId, periodStart, periodEnd);
  if (allocations.length === 0) return [];

  const result = [];
  for (const alloc of allocations) {
    const items = await fetchBudgetItems(alloc.id);
    result.push({
      ...alloc,
      subItems: items.map((it) => ({ name: it.name, amount: Number(it.allocated_amount) })),
      icon: getCategoryIcon(alloc.category),
      description: getCategoryDescription(alloc.category),
    });
  }
  return result;
}

function getCategoryIcon(category) {
  const map = { needs: "Home", wants: "ShoppingBag", savings: "PiggyBank" };
  return map[category] || "Wallet";
}

function getCategoryDescription(category) {
  const map = {
    needs: "Rent, utilities, fuel, food",
    wants: "Dining out, hobbies, shopping",
    savings: "Emergency fund, investments",
  };
  return map[category] || "";
}
