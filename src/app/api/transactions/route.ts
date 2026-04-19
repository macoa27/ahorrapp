import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, monthDateRange, parseYearMonth } from "@/lib/dates";
import type { Transaction, TransactionSource } from "@/types/database";

function escapeIlike(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isTransactionSource(v: unknown): v is TransactionSource {
  return (
    v === "manual" ||
    v === "email" ||
    v === "whatsapp" ||
    v === "csv" ||
    v === "import"
  );
}

function monthKeyFromISODate(dateStr: string): string | null {
  const p = parseYearMonth(dateStr.slice(0, 7));
  return p ? `${p.y}-${String(p.m).padStart(2, "0")}` : null;
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

  const category = searchParams.get("category");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));
  const offset = (page - 1) * limit;

  let q = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .gte("date", range.start)
    .lte("date", range.end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (category) {
    q = q.eq("category_id", category);
  }
  if (source === "email" || source === "whatsapp" || source === "manual" || source === "csv") {
    q = q.eq("source", source);
  }
  if (search?.trim()) {
    q = q.ilike("merchant", `%${escapeIlike(search.trim())}%`);
  }

  q = q.range(offset, offset + limit - 1);

  const { data: transactions, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    transactions: (transactions ?? []) as Transaction[],
    count: count ?? 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  const merchant = String(body.merchant ?? "Sin descripción");
  const category_id = (body.category_id as string | null | undefined) ?? null;
  const payment_method_id = (body.payment_method_id as string | null | undefined) ?? null;
  const date =
    typeof body.date === "string" && body.date.length >= 10
      ? body.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const source: TransactionSource = isTransactionSource(body.source) ? body.source : "manual";
  const notes = (body.notes as string | null | undefined) ?? null;

  const { data: row, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      amount,
      merchant,
      category_id,
      payment_method_id,
      date,
      source,
      notes,
      raw_email_id: null,
    })
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  const transaction = row as Transaction;

  let alerta: { tipo: "excedido"; gastado: number; presupuesto: number } | null = null;

  if (category_id) {
    const mk = monthKeyFromISODate(date);
    const rng = mk ? monthDateRange(mk) : null;
    if (rng) {
      const { data: budget } = await supabase
        .from("budgets")
        .select("amount")
        .eq("user_id", user.id)
        .eq("category_id", category_id)
        .eq("active", true)
        .maybeSingle();

      if (budget) {
        const { data: rows } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("category_id", category_id)
          .gte("date", rng.start)
          .lte("date", rng.end);

        const gastado = (rows ?? []).reduce((s, t) => s + Number(t.amount), 0);
        const presupuesto = Number(budget.amount);
        if (gastado > presupuesto) {
          alerta = { tipo: "excedido", gastado, presupuesto };
        }
      }
    }
  }

  return NextResponse.json({ transaction, alerta });
}
