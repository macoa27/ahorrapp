import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, lastKMonthKeys, monthDateRange, monthFirstDay } from "@/lib/dates";
import type { Budget, BudgetWithSpend, DashboardData, MonthlySummary, Transaction } from "@/types/database";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapMonthlySummary(rows: unknown[] | null): MonthlySummary[] {
  return (rows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      category_id: String(row.category_id),
      category_name: String(row.category_name),
      category_icon: String(row.category_icon),
      category_color: String(row.category_color),
      total: num(row.total),
      tx_count: num(row.tx_count),
      budget_amount: row.budget_amount == null ? null : num(row.budget_amount),
      budget_pct: row.budget_pct == null ? null : num(row.budget_pct),
    };
  });
}

async function sumTransactionsInMonth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  monthKey: string
): Promise<number> {
  const r = monthDateRange(monthKey);
  if (!r) return 0;
  const { data } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", r.start)
    .lte("date", r.end);
  return (data ?? []).reduce((s, t) => s + num(t.amount), 0);
}

async function sumIncomesInMonth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  monthKey: string
): Promise<number> {
  const first = monthFirstDay(monthKey);
  if (!first) return 0;
  const { data } = await supabase.from("incomes").select("amount").eq("user_id", userId).eq("month", first);
  return (data ?? []).reduce((s, t) => s + num(t.amount), 0);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? currentYearMonth();
  const range = monthDateRange(month);
  const monthStart = monthFirstDay(month);
  if (!range || !monthStart) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const monthKeys = lastKMonthKeys(month, 6);

  const [
    rpcRes,
    recentRes,
    incomesMonthRes,
    budgetsRes,
    goalRes,
    txMonthRes,
    evoTotals,
    evoIncomes,
  ] = await Promise.all([
    supabase.rpc("get_monthly_summary", { p_user_id: user.id, p_month: monthStart }),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", range.start)
      .lte("date", range.end)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("incomes").select("*").eq("user_id", user.id).eq("month", monthStart).order("created_at"),
    supabase.from("budgets").select("*").eq("user_id", user.id).eq("active", true),
    supabase
      .from("savings_goals")
      .select("target_pct")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("transactions").select("amount, id").eq("user_id", user.id).gte("date", range.start).lte("date", range.end),
    Promise.all(monthKeys.map((k) => sumTransactionsInMonth(supabase, user.id, k))),
    Promise.all(monthKeys.map((k) => sumIncomesInMonth(supabase, user.id, k))),
  ]);

  if (rpcRes.error) {
    return NextResponse.json({ error: rpcRes.error.message }, { status: 500 });
  }
  if (recentRes.error) {
    return NextResponse.json({ error: recentRes.error.message }, { status: 500 });
  }
  if (incomesMonthRes.error) {
    return NextResponse.json({ error: incomesMonthRes.error.message }, { status: 500 });
  }
  if (budgetsRes.error) {
    return NextResponse.json({ error: budgetsRes.error.message }, { status: 500 });
  }
  if (goalRes.error) {
    return NextResponse.json({ error: goalRes.error.message }, { status: 500 });
  }
  if (txMonthRes.error) {
    return NextResponse.json({ error: txMonthRes.error.message }, { status: 500 });
  }

  const byCategory = mapMonthlySummary(rpcRes.data as unknown[] | null);
  const recentTransactions = (recentRes.data ?? []) as Transaction[];
  const incomeRows = incomesMonthRes.data ?? [];
  const totalIncome = incomeRows.reduce((s, r) => s + num(r.amount), 0);
  const incomeBreakdown = incomeRows.map((r) => ({
    label: String(r.label),
    amount: num(r.amount),
  }));

  const savingsGoalPct = goalRes.data?.target_pct != null ? num(goalRes.data.target_pct) : 70;

  const txRows = txMonthRes.data ?? [];
  const totalSpent = txRows.reduce((s, t) => s + num(t.amount), 0);
  const txCount = txRows.length;
  const avgTicket = txCount > 0 ? totalSpent / txCount : 0;

  const budgetsList = (budgetsRes.data ?? []) as Budget[];
  const totalBudget = budgetsList.reduce((s, b) => s + num(b.amount), 0);
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const realSavingsPct =
    totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0;

  const monthlyEvolution = monthKeys.map((k, i) => ({
    month: k,
    total: evoTotals[i] ?? 0,
    income: evoIncomes[i] ?? 0,
  }));

  const budgetsWithSpend: BudgetWithSpend[] = [];
  for (const b of budgetsList) {
    const { data: txs } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("category_id", b.category_id)
      .gte("date", range.start)
      .lte("date", range.end);
    const spent = (txs ?? []).reduce((s, t) => s + num(t.amount), 0);
    budgetsWithSpend.push({ ...b, spent });
  }

  const payload: DashboardData = {
    month,
    totalSpent,
    txCount,
    avgTicket,
    totalBudget,
    budgetUsedPct,
    byCategory,
    monthlyEvolution,
    recentTransactions,
    totalIncome,
    savingsGoalPct,
    realSavingsPct,
    incomeBreakdown,
    budgets: budgetsWithSpend,
  };

  return NextResponse.json(payload);
}
