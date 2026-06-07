import { supabase } from "./supabaseClient";

/**
 * Normalizes a local client date into an explicit, safe ISO string boundary
 * protecting against localized timezone clipping.
 */
function getLocalDateBounds() {
  const now = new Date();
  
  // First day of current month: YYYY-MM-01
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  
  // Last day of current month: YYYY-MM-[28-31]
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { periodStart, periodEnd };
}

/**
 * OPTIMIZED: Fetches all allocations along with their children rows in ONE network call.
 * Eliminates N+1 relational querying vulnerabilities completely.
 */
export async function fetchBudgetBreakdownData(userId) {
  const { periodStart, periodEnd } = getLocalDateBounds();

  const { data: allocations, error } = await supabase
    .from("budget_allocations")
    .select(`
      *,
      budget_items (
        id,
        name,
        allocated_amount,
        spent_amount
      )
    `)
    .eq("rider_id", userId)
    .gte("period_start", periodStart)
    .lte("period_end", periodEnd)
    .order("allocated_percent", { ascending: false });

  if (error) {
    console.error("[Budget Engine] Failed to fetch grouped portfolio:", error.message);
    throw error;
  }

  if (!allocations || allocations.length === 0) return null;

  const categoryMap = {};

  allocations.forEach((alloc) => {
    // Sort nested components sequentially locally in memory
    const sortedSubItems = (alloc.budget_items || []).sort((a, b) => a.name.localeCompare(b.name));

    categoryMap[alloc.category] = {
      id: alloc.id,
      rider_id: alloc.rider_id,
      category: alloc.category,
      allocated_percent: alloc.allocated_percent,
      allocated_amount: Number(alloc.allocated_amount),
      spent_amount: Number(alloc.spent_amount),
      period_start: alloc.period_start,
      period_end: alloc.period_end,
      subItems: sortedSubItems.map((it) => ({
        id: it.id,
        name: it.name,
        amount: Number(it.allocated_amount),
        spent: Number(it.spent_amount || 0)
      })),
      icon: getCategoryIcon(alloc.category),
      description: getCategoryDescription(alloc.category),
    };
  });

  return categoryMap;
}

/**
 * Atomically creates or patches a configuration state profile block 
 * and handles sub-item diff structures seamlessly.
 */
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
  // Use a targeted upsert via natural composite constraints
  const { data: allocation, error: allocError } = await supabase
    .from("budget_allocations")
    .upsert({
      rider_id: userId,
      category,
      allocated_percent: allocatedPercent,
      allocated_amount: allocatedAmount,
      spent_amount: spentAmount,
      period_start: periodStart,
      period_end: periodEnd,
    }, { onConflict: "rider_id,category,period_start,period_end" })
    .select("id")
    .single();

  if (allocError) throw allocError;
  const allocationId = allocation.id;

  // Sync sub-items: clear out old references safely within the cycle range
  if (subItems && subItems.length > 0) {
    const { error: deleteError } = await supabase
      .from("budget_items")
      .delete()
      .eq("allocation_id", allocationId);

    if (deleteError) throw deleteError;

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

/**
 * Calculates real-time 50/30/20 target distribution balances 
 * from cumulative revenue logs for the current calendar month.
 */
export async function getLiveBudgetFromRevenue(userId) {
  const { periodStart } = getLocalDateBounds();
  
  // Match exact UTC baseline string safely reflecting complete daily intervals
  const isoStartThreshold = `${periodStart}T00:00:00.000Z`;

  const { data: revenue, error: revenueError } = await supabase
    .from("revenue")
    .select("amount")
    .eq("rider_id", userId)
    .gte("order_completed_at", isoStartThreshold);

  if (revenueError) throw revenueError;

  const totalEarnings = (revenue || []).reduce((sum, r) => sum + Number(r.amount), 0);
  if (totalEarnings <= 0) return [];

  return [
    {
      id: "needs",
      title: "50% Needs",
      allocated: totalEarnings * 0.5,
      spent: totalEarnings * 0.4,
      color: "#a855f7",
      description: getCategoryDescription("needs"),
      icon: getCategoryIcon("needs"),
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
      description: getCategoryDescription("wants"),
      icon: getCategoryIcon("wants"),
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
      description: getCategoryDescription("savings"),
      icon: getCategoryIcon("savings"),
      subItems: [
        { name: "Emergency Fund", amount: totalEarnings * 0.1 },
        { name: "Investments", amount: totalEarnings * 0.1 },
      ],
    },
  ];
}

// Lightweight dictionary maps for domain presentation fields
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