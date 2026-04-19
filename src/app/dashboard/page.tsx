"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button, Card, ProgressBar, cn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { fmt, monthLabel } from "@/lib/utils";
import type { DashboardData, MonthlySummary, Transaction } from "@/types/database";
import AddIncomeModal from "@/components/dashboard/AddIncomeModal";

type DashboardViewData = Omit<DashboardData, "monthlyEvolution"> & {
  totalIncome: number;
  savingsGoalPct: number;
  realSavingsPct: number;
  incomeBreakdown: { label: string; amount: number }[];
  monthlyEvolution: Array<{ month: string; total: number; income: number }>;
};

const DEMO_DATA: DashboardViewData = {
  month: "2025-04",
  totalSpent: 89340,
  txCount: 34,
  avgTicket: 2628,
  totalBudget: 80000,
  budgetUsedPct: 112,
  totalIncome: 320000,
  savingsGoalPct: 70,
  realSavingsPct: 72,
  byCategory: [
    { category_id: "1", category_name: "Restaurantes", category_icon: "🍔", category_color: "cat-restaurantes", total: 24800, tx_count: 12, budget_amount: 20000, budget_pct: 124 },
    { category_id: "2", category_name: "Supermercado", category_icon: "🛒", category_color: "cat-supermercado", total: 17500, tx_count: 8,  budget_amount: 25000, budget_pct: 70  },
    { category_id: "3", category_name: "Ropa",         category_icon: "👕", category_color: "cat-ropa",         total: 13200, tx_count: 3,  budget_amount: null,  budget_pct: null },
    { category_id: "4", category_name: "Transporte",   category_icon: "🚗", category_color: "cat-transporte",   total: 8100,  tx_count: 7,  budget_amount: 10000, budget_pct: 81  },
    { category_id: "5", category_name: "Entretenimiento", category_icon: "🎬", category_color: "cat-entretenimiento", total: 6490, tx_count: 2, budget_amount: 8000, budget_pct: 81 },
    { category_id: "6", category_name: "Otros",        category_icon: "📦", category_color: "cat-otros",        total: 4250,  tx_count: 2,  budget_amount: null,  budget_pct: null },
  ],
  monthlyEvolution: [
    { month: "2024-11", total: 61000, income: 290000 },
    { month: "2024-12", total: 94000, income: 310000 },
    { month: "2025-01", total: 72000, income: 300000 },
    { month: "2025-02", total: 58000, income: 315000 },
    { month: "2025-03", total: 67000, income: 308000 },
    { month: "2025-04", total: 89340, income: 320000 },
  ],
  recentTransactions: [
    { id: "1", user_id: "u1", amount: 6840,  merchant: "Carrefour Palermo", category_id: "2", payment_method_id: null, date: "2025-04-18", source: "email",    notes: null, raw_email_id: null, created_at: "2025-04-18T12:00:00.000Z", updated_at: "2025-04-18T12:00:00.000Z" },
    { id: "2", user_id: "u1", amount: 1250,  merchant: "Uber",              category_id: "4", payment_method_id: null, date: "2025-04-17", source: "whatsapp", notes: null, raw_email_id: null, created_at: "2025-04-17T09:00:00.000Z", updated_at: "2025-04-17T09:00:00.000Z" },
    { id: "3", user_id: "u1", amount: 8900,  merchant: "La Alacena",        category_id: "1", payment_method_id: null, date: "2025-04-17", source: "email",    notes: null, raw_email_id: null, created_at: "2025-04-17T20:15:00.000Z", updated_at: "2025-04-17T20:15:00.000Z" },
    { id: "4", user_id: "u1", amount: 2490,  merchant: "Netflix",           category_id: "5", payment_method_id: null, date: "2025-04-16", source: "email",    notes: null, raw_email_id: null, created_at: "2025-04-16T08:00:00.000Z", updated_at: "2025-04-16T08:00:00.000Z" },
    { id: "5", user_id: "u1", amount: 13200, merchant: "Zara Unicenter",    category_id: "3", payment_method_id: null, date: "2025-04-15", source: "manual",   notes: null, raw_email_id: null, created_at: "2025-04-15T16:30:00.000Z", updated_at: "2025-04-15T16:30:00.000Z" },
  ],
  incomeBreakdown: [
    { label: "Sueldo", amount: 280000 },
    { label: "Freelance", amount: 40000 },
  ],
  budgets: [],
};

function mergeDashboardView(
  base: DashboardViewData,
  patch: Partial<DashboardViewData> & Partial<DashboardData>
): DashboardViewData {
  const evo = patch.monthlyEvolution;
  const mergedEvolution =
    Array.isArray(evo) && evo.length
      ? evo.map((row, i) => {
          const r = row as { month: string; total: number; income?: number };
          const income =
            typeof r.income === "number"
              ? r.income
              : base.monthlyEvolution.find((m) => m.month === r.month)?.income ??
                base.monthlyEvolution[i]?.income ??
                0;
          return { month: r.month, total: r.total, income };
        })
      : base.monthlyEvolution;

  return {
    ...base,
    ...patch,
    totalIncome:      patch.totalIncome      ?? base.totalIncome,
    savingsGoalPct:   patch.savingsGoalPct   ?? base.savingsGoalPct,
    realSavingsPct:   patch.realSavingsPct   ?? base.realSavingsPct,
    incomeBreakdown:  patch.incomeBreakdown  ?? base.incomeBreakdown,
    monthlyEvolution: mergedEvolution,
    byCategory:       patch.byCategory       ?? base.byCategory,
    recentTransactions: patch.recentTransactions ?? base.recentTransactions,
    budgets:          patch.budgets          ?? base.budgets,
  };
}

function sourceBadgeVariant(source: Transaction["source"]): "email" | "whatsapp" | "manual" | "csv" | "brand" {
  if (source === "email")     return "email";
  if (source === "whatsapp")  return "whatsapp";
  if (source === "manual")    return "manual";
  if (source === "csv")       return "csv";
  if (source === "import")    return "csv";
  return "brand";
}

function sourceLabel(source: Transaction["source"]): string {
  const labels: Record<Transaction["source"], string> = {
    email: "Email", whatsapp: "WhatsApp", manual: "Manual", csv: "CSV", import: "Importación",
  };
  return labels[source] ?? source;
}

function categoryDotClass(colorToken: string): string | undefined {
  const map: Record<string, string> = {
    "cat-supermercado":    "bg-cat-supermercado",
    "cat-restaurantes":    "bg-cat-restaurantes",
    "cat-transporte":      "bg-cat-transporte",
    "cat-salud":           "bg-cat-salud",
    "cat-entretenimiento": "bg-cat-entretenimiento",
    "cat-ropa":            "bg-cat-ropa",
    "cat-otros":           "bg-cat-otros",
  };
  return map[colorToken];
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  if (typeof v !== "number") return null;
  return (
    <div className="rounded-lg border border-white/10 bg-base-800 px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold text-white">${fmt(v)}</p>
      <p className="text-zinc-500">Gastos</p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData]               = useState<DashboardViewData>(DEMO_DATA);
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(mesActual);
  const [loading, setLoading]         = useState(false);
  const [incomeModal, setIncomeModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setData(DEMO_DATA); return; }
      const res = await fetch(`/api/dashboard?month=${encodeURIComponent(selectedMonth)}`);
      if (!res.ok) { setData(DEMO_DATA); return; }
      const json = (await res.json()) as Partial<DashboardViewData> & Partial<DashboardData>;
      setData(mergeDashboardView(DEMO_DATA, json));
    } catch {
      setData(DEMO_DATA);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { void load(); }, [load]);

  const balance          = useMemo(() => (data.totalIncome ?? 0) - data.totalSpent, [data.totalIncome, data.totalSpent]);
  const savingsGoalMet   = data.realSavingsPct >= data.savingsGoalPct;
  const maxCategoryTotal = useMemo(() => Math.max(1, ...data.byCategory.map((c) => c.total)), [data.byCategory]);

  const savingsGoalSpendCap = data.totalIncome > 0
    ? Math.round(data.totalIncome * (1 - data.savingsGoalPct / 100))
    : null;

  const chartData = useMemo(() =>
    data.monthlyEvolution.map((d) => ({
      ...d,
      label: monthLabel(d.month),
      isCurrentMonth: d.month === selectedMonth,
    })),
    [data.monthlyEvolution, selectedMonth]
  );

  const savingsTargetAmount = useMemo(() =>
    Math.round((data.totalIncome || 0) * (data.savingsGoalPct / 100)),
    [data.totalIncome, data.savingsGoalPct]
  );

  const savingsGap  = savingsTargetAmount - balance;
  const categoryMap = useMemo(() =>
    Object.fromEntries(data.byCategory.map((c) => [c.category_id, c])),
    [data.byCategory]
  );

  return (
    <div className={cn("flex flex-col gap-4", loading && "opacity-90")}>

      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-base font-semibold text-white">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/10 bg-base-800 px-3 py-2 text-xs text-zinc-300 focus:border-brand/50 focus:outline-none"
            aria-label="Mes"
          />
          <Button type="button" variant="primary" size="sm" fullWidth={false} className="shrink-0">
            + Registrar
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Ingresos" value={`$${fmt(data.totalIncome)}`} sub="Este mes" tone="income" />
        <KpiCard label="Gastos"   value={`$${fmt(data.totalSpent)}`}  sub={`${fmt(data.budgetUsedPct)}% del presupuesto`} tone={data.budgetUsedPct > 100 ? "danger" : "default"} />
        <KpiCard label="Balance"  value={`$${fmt(balance)}`}          sub="Ingresos − gastos" tone={balance >= 0 ? "income" : "danger"} />
        <KpiCard label="Ahorro %" value={`${fmt(data.realSavingsPct)}%`}
          sub={savingsGoalMet ? `Meta ${fmt(data.savingsGoalPct)}% · cumplida` : `Meta ${fmt(data.savingsGoalPct)}%`}
          tone={savingsGoalMet ? "brand" : "warning"}
        />
      </section>

      {/* CHARTS */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Gastos por mes</p>
          <div className="text-brand">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="currentColor" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(255 255 255 / 0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgb(161 161 170)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgb(161 161 170)" }}
                  axisLine={false} tickLine={false} width={40}
                  tickFormatter={(v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n)) return "";
                    return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${fmt(n)}`;
                  }}
                />
                <Tooltip content={<ChartTooltip />} />
                {savingsGoalSpendCap != null && (
                  <ReferenceLine
                    y={savingsGoalSpendCap}
                    stroke="rgb(245 166 35)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    ifOverflow="extendDomain"
                    label={{ value: "Meta ahorro", position: "right", fill: "rgb(245 166 35)", fontSize: 10 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="currentColor"
                  strokeWidth={2}
                  fill="url(#dashboardSpendGrad)"
                  dot={(dotProps: { cx?: number; cy?: number; payload?: { isCurrentMonth?: boolean } }) => {
                    const { cx, cy, payload } = dotProps;
                    if (cx == null || cy == null) return null;
                    const r = payload?.isCurrentMonth ? 4 : 3;
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx} cy={cy} r={r}
                        fill="currentColor"
                        className={payload?.isCurrentMonth ? "opacity-100" : "opacity-35"}
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Por categoría</p>
          <ul className="flex flex-col gap-3">
            {data.byCategory.slice(0, 6).map((cat) => {
              const dot = categoryDotClass(cat.category_color);
              return (
                <li key={cat.category_id} className="flex items-center gap-2">
                  <span className="flex w-6 shrink-0 justify-center text-sm" aria-hidden>{cat.category_icon}</span>
                  <span className="w-24 shrink-0 truncate text-[11px] text-zinc-400">{cat.category_name}</span>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", dot ?? "bg-zinc-500")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <ProgressBar value={cat.total} max={maxCategoryTotal} color="brand" />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] font-medium text-white">
                    ${fmt(cat.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* INGRESOS + OBJETIVO */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">

        <Card className="border-income/15">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Ingresos del mes</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onClick={() => setIncomeModal(true)}
            >
              + Agregar
            </Button>
          </div>
          <p className="text-xl font-bold tracking-tight text-income">${fmt(data.totalIncome)}</p>
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            {data.incomeBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">{item.label}</span>
                <span className="font-medium text-zinc-200">${fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-warning/15">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Objetivo de ahorro</p>
            <Button type="button" variant="ghost" size="sm" fullWidth={false} className="text-zinc-400">
              Editar
            </Button>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-xl font-bold tracking-tight text-warning">${fmt(balance)}</p>
            <p className="text-xs text-zinc-500">
              meta ${fmt(savingsTargetAmount)} ({fmt(data.savingsGoalPct)}% del ingreso)
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar value={data.realSavingsPct} max={Math.max(1, data.savingsGoalPct)} color="warning" />
          </div>
          <p className={cn("mt-2 text-[11px]", savingsGoalMet ? "text-success" : "text-zinc-500")}>
            {savingsGoalMet
              ? `Superaste la meta: ${fmt(data.realSavingsPct)}% ahorrado vs ${fmt(data.savingsGoalPct)}% objetivo.`
              : savingsGap > 0
                ? `Te faltan $${fmt(savingsGap)} para llegar al objetivo de ahorro.`
                : "Objetivo en línea con tu balance."}
          </p>
        </Card>
      </section>

      {/* TRANSACCIONES RECIENTES */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Últimas transacciones</p>
          <a href="/dashboard/transacciones" className="text-[11px] text-brand transition-colors hover:opacity-90">
            Ver todas →
          </a>
        </div>
        <TransactionsTable transactions={data.recentTransactions} categoryById={categoryMap} />
      </Card>

      {/* MODAL INGRESOS */}
      <AddIncomeModal
        open={incomeModal}
        onClose={() => setIncomeModal(false)}
        onSuccess={() => {
          setIncomeModal(false);
          void load();
        }}
      />

    </div>
  );
}

function KpiCard({ label, value, sub, tone }: {
  label: string;
  value: string;
  sub?: string;
  tone: "income" | "danger" | "warning" | "brand" | "default";
}) {
  const toneClass =
    tone === "income"  ? "text-income"  :
    tone === "danger"  ? "text-danger"  :
    tone === "warning" ? "text-warning" :
    tone === "brand"   ? "text-brand"   : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-base-700 p-3">
      <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={cn("text-lg font-bold tracking-tight", toneClass)}>{value}</p>
      {sub && <p className="mt-0.5 text-[9px] text-zinc-600">{sub}</p>}
    </div>
  );
}

function TransactionsTable({ transactions, categoryById }: {
  transactions: Transaction[];
  categoryById: Record<string, MonthlySummary>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] table-fixed">
        <thead>
          <tr>
            {["Fecha", "Comercio", "Categoría", "Fuente", "Monto"].map((h) => (
              <th key={h} className={cn(
                "border-b border-white/10 pb-2 text-left text-[9px] font-normal uppercase tracking-wider text-zinc-500",
                h === "Monto" && "text-right"
              )}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const cat = tx.category_id ? categoryById[tx.category_id] : undefined;
            return (
              <tr key={tx.id} className="group hover:bg-white/[0.03]">
                <td className="border-b border-white/[0.06] py-2.5 text-[11px] text-zinc-500">
                  {new Date(tx.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                </td>
                <td className="border-b border-white/[0.06] py-2.5 pr-2 text-[12px] font-medium text-white">
                  <span className="line-clamp-1">{tx.merchant}</span>
                </td>
                <td className="border-b border-white/[0.06] py-2.5 text-[11px] text-zinc-400">
                  {cat ? (
                    <span className="line-clamp-1">
                      <span aria-hidden>{cat.category_icon}</span> {cat.category_name}
                    </span>
                  ) : "—"}
                </td>
                <td className="border-b border-white/[0.06] py-2.5">
                  <Badge variant={sourceBadgeVariant(tx.source)}>{sourceLabel(tx.source)}</Badge>
                </td>
                <td className="border-b border-white/[0.06] py-2.5 text-right text-[12px] font-semibold text-white">
                  ${fmt(tx.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}