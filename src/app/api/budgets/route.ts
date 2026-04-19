import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, monthDateRange } from "@/lib/dates";
import type { Budget, BudgetWithSpend } from "@/types/database";

function normalizeAlertPct(v: unknown): number {
  const n = Number(v ?? 0.9);
  if (!Number.isFinite(n)) return 0.9;
  if (n > 1) return Math.min(1, Math.max(0, n / 100));
  return Math.min(1, Math.max(0, n));
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
  if (!range) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const { data: budgets, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (budgets ?? []) as Budget[];
  const withSpend: BudgetWithSpend[] = [];

  for (const b of list) {
    const { data: txs } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("category_id", b.category_id)
      .gte("date", range.start)
      .lte("date", range.end);

    const spent = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
    withSpend.push({ ...b, spent });
  }

  return NextResponse.json({ budgets: withSpend });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { category_id?: string; amount?: number; alert_pct?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const category_id = body.category_id;
  const amount = Number(body.amount);
  if (!category_id || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "category_id and amount (> 0) are required" },
      { status: 400 }
    );
  }

  const alert_pct = normalizeAlertPct(body.alert_pct);

  const { data: existing, error: findErr } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("category_id", category_id)
    .maybeSingle();

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("budgets")
      .update({ amount, alert_pct, active: true })
      .eq("id", existing.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
    }
    return NextResponse.json({ budget: data as Budget });
  }

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      category_id,
      amount,
      alert_pct,
      active: true,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ budget: data as Budget });
}
