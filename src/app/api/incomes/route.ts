import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, monthFirstDay, parseYearMonth } from "@/lib/dates";
import type { Income } from "@/types/database";

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
  const first = monthFirstDay(month);
  if (!first) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from("incomes")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", first)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const incomes = (rows ?? []) as Income[];
  const total = incomes.reduce((s, r) => s + Number(r.amount), 0);

  return NextResponse.json({ incomes, total });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    amount?: unknown;
    label?: unknown;
    month?: unknown;
    recurring?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Ingreso";
  const monthStr = typeof body.month === "string" ? body.month : currentYearMonth();
  if (!parseYearMonth(monthStr)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  const month = monthFirstDay(monthStr);
  if (!month) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const recurring = Boolean(body.recurring);

  const { data, error } = await supabase
    .from("incomes")
    .insert({
      user_id: user.id,
      amount,
      label,
      month,
      recurring,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ income: data as Income });
}
