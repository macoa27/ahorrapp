"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { currentYearMonth } from "@/lib/dates";
import { fmt } from "@/lib/utils";
import type { BudgetWithSpend, Category } from "@/types/database";

function budgetBarTone(spent: number, budget: number): "success" | "warning" | "danger" {
  if (budget <= 0) return "success";
  const r = spent / budget;
  if (r < 0.9) return "success";
  if (r <= 1) return "warning";
  return "danger";
}

const toneClass: Record<"success" | "warning" | "danger", string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export default function PresupuestoPage() {
  const [month, setMonth] = useState(currentYearMonth);
  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editAlertPct, setEditAlertPct] = useState("90");
  const [saving, setSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newAlertPct, setNewAlertPct] = useState("90");

  useEffect(() => {
    async function loadCats() {
      const supabase = createClient();
      const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (data) setCategories(data as Category[]);
    }
    void loadCats();
  }, []);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?month=${encodeURIComponent(month)}`);
      if (!res.ok) {
        setBudgets([]);
        return;
      }
      const json = (await res.json()) as { budgets?: BudgetWithSpend[] };
      setBudgets(json.budgets ?? []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const budgetCategoryIds = useMemo(() => new Set(budgets.map((b) => b.category_id)), [budgets]);

  const availableForNew = useMemo(
    () => categories.filter((c) => !budgetCategoryIds.has(c.id)),
    [categories, budgetCategoryIds]
  );

  function openEdit(b: BudgetWithSpend) {
    setEditingId(b.id);
    setEditAmount(String(Math.round(Number(b.amount))))
    setEditAlertPct(String(Math.round(Number(b.alert_pct) * 100)))
  }

  async function saveEdit() {
    if (!editingId) return;
    const b = budgets.find((x) => x.id === editingId);
    if (!b) return;

    const amount = Number(editAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: b.category_id,
          amount,
          alert_pct: Number(editAlertPct.replace(",", ".")),
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await loadBudgets();
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveNew() {
    const amount = Number(newAmount.replace(",", "."));
    if (!newCategoryId || !Number.isFinite(amount) || amount <= 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: newCategoryId,
          amount,
          alert_pct: Number(newAlertPct.replace(",", ".")),
        }),
      });
      if (res.ok) {
        setNewOpen(false);
        setNewCategoryId("");
        setNewAmount("");
        setNewAlertPct("90");
        await loadBudgets();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Presupuesto</h1>
          <p className="text-sm text-zinc-500">Seguí el gasto por categoría frente a tus topes del mes.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Mes</label>
            <input type="month" className="input w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => setNewOpen(true)} disabled={availableForNew.length === 0}>
            + Presupuesto
          </Button>
        </div>
      </div>

      {newOpen ? (
        <Card className="border-brand/30">
          <p className="text-sm font-medium text-white">Nuevo presupuesto</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs text-zinc-400">Categoría</label>
              <select
                className="input w-full"
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
              >
                <option value="">Elegí…</option>
                {availableForNew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Monto tope"
              prefix="$"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
            />
            <Input
              label="Alerta al %"
              suffix="%"
              value={newAlertPct}
              onChange={(e) => setNewAlertPct(e.target.value)}
              hint="Ej: 90 avisa al 90% del presupuesto."
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={() => void saveNew()}>
              Guardar
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando presupuestos…</p>
      ) : budgets.length === 0 ? (
        <Card className="border-white/10">
          <p className="text-sm text-zinc-400">Todavía no configuraste presupuestos para este mes.</p>
          <Button className="mt-3" size="sm" onClick={() => setNewOpen(true)} disabled={availableForNew.length === 0}>
            Crear el primero
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((b) => {
            const cat = categoryById[b.category_id];
            const spent = Number(b.spent);
            const cap = Number(b.amount);
            const rawPct = cap > 0 ? Math.round((spent / cap) * 100) : 0;
            const barPct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
            const tone = budgetBarTone(spent, cap);
            const over = cap > 0 && spent > cap;

            return (
              <Card key={b.id} className="border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{cat?.icon ?? "📁"}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{cat?.name ?? "Categoría"}</p>
                      <p className="text-xs text-zinc-500">
                        Gastado <span className="text-zinc-300">${fmt(Math.round(spent))}</span>
                        {" · "}
                        Tope <span className="text-zinc-300">${fmt(Math.round(cap))}</span>
                      </p>
                    </div>
                  </div>
                  {over ? (
                    <Badge variant="danger">{rawPct}%</Badge>
                  ) : (
                    <Badge variant={tone === "success" ? "success" : tone === "warning" ? "warning" : "danger"}>
                      {rawPct}%
                    </Badge>
                  )}
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${toneClass[tone]}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => openEdit(b)}>
                  Configurar
                </Button>

                {editingId === b.id ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-base-800/50 p-3">
                    <Input
                      label="Monto tope"
                      prefix="$"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                    <Input
                      label="Alerta al %"
                      suffix="%"
                      value={editAlertPct}
                      onChange={(e) => setEditAlertPct(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditingId(null)}>
                        Cerrar
                      </Button>
                      <Button size="sm" className="flex-1" loading={saving} onClick={() => void saveEdit()}>
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
