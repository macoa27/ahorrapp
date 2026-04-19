"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { currentYearMonth } from "@/lib/dates";
import { fmt, monthLabel } from "@/lib/utils";
import type { DashboardData } from "@/types/database";

type EvoRow = { month: string; total: number; income: number };

function savingsRate(income: number, spent: number) {
  if (income <= 0) return null;
  return Math.round(((income - spent) / income) * 100);
}

export default function ObjetivosPage() {
  const [month, setMonth] = useState(currentYearMonth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [targetInput, setTargetInput] = useState("70");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${encodeURIComponent(month)}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as DashboardData;
      setData(json);
      setTargetInput(String(json.savingsGoalPct ?? 70));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const evolution = useMemo(() => {
    const ev = data?.monthlyEvolution;
    return Array.isArray(ev) ? (ev as EvoRow[]) : [];
  }, [data?.monthlyEvolution]);

  const goalPct = data?.savingsGoalPct ?? 70;

  const historyRows = useMemo(() => {
    return evolution.map((row) => {
      const rate = savingsRate(row.income, row.total);
      const met = rate != null && rate >= goalPct;
      return {
        key: row.month,
        label: monthLabel(row.month),
        met,
        rate,
        income: row.income,
        spent: row.total,
      };
    });
  }, [evolution, goalPct]);

  const chartRows = useMemo(() => {
    return evolution.map((row) => {
      const targetSave = Math.round(row.income * (goalPct / 100));
      const realSave = Math.max(0, Math.round(row.income - row.total));
      return {
        label: monthLabel(row.month),
        meta: targetSave,
        real: realSave,
        isSelected: row.month === month,
      };
    });
  }, [evolution, goalPct, month]);

  const currentRate = data ? savingsRate(data.totalIncome, data.totalSpent) : null;
  const currentMet = currentRate != null && currentRate >= goalPct;

  async function saveGoal() {
    const n = Math.round(Number(targetInput.replace(",", ".")));
    if (!Number.isFinite(n) || n < 1 || n > 100) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        target_pct: n,
      });

      if (!error) {
        setEditOpen(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Objetivos</h1>
          <p className="text-sm text-zinc-500">Meta de ahorro mensual y evolución de los últimos meses.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Mes de referencia (dashboard)</label>
          <input type="month" className="input w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {loading || !data ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : (
        <>
          <Card className="border-brand/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Objetivo de ahorro</p>
                <p className="mt-1 text-3xl font-bold text-white">{goalPct}%</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Del ingreso declarado en <span className="text-zinc-300">{month}</span>, buscás ahorrar al menos esa
                  proporción después de gastos.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-base-800/60 px-4 py-3 text-sm">
                <p className="text-zinc-500">Este mes</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {currentRate == null ? "—" : `${currentRate}%`}{" "}
                  <span className="text-xs font-normal text-zinc-500">ahorro real</span>
                </p>
                <p className={`mt-2 text-xs font-medium ${currentMet ? "text-success" : "text-warning"}`}>
                  {currentMet ? "Meta cumplida (con ingresos cargados)" : "Por debajo de la meta o sin ingresos"}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => setEditOpen((v) => !v)}>
              Editar objetivo
            </Button>

            {editOpen ? (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-base-800/40 p-4 sm:flex-row sm:items-end">
                <Input
                  className="sm:max-w-[160px]"
                  label="Nuevo % de ahorro (1–100)"
                  type="number"
                  min={1}
                  max={100}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                />
                <Button size="sm" loading={saving} onClick={() => void saveGoal()}>
                  Guardar
                </Button>
              </div>
            ) : null}
          </Card>

          <Card className="border-white/10">
            <p className="text-sm font-medium text-white">Historial (últimos 6 meses)</p>
            <p className="mt-1 text-xs text-zinc-500">
              Se compara el ahorro real del mes con la meta actual ({goalPct}% del ingreso).
            </p>
            <ul className="mt-4 space-y-2">
              {historyRows.map((r) => (
                <li
                  key={r.key}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-sm"
                >
                  <span className="text-zinc-300 capitalize">{r.label}</span>
                  <span className={r.met ? "text-success font-medium" : "text-zinc-500"}>
                    {r.rate == null ? "Sin ingresos" : r.met ? "Cumplida" : `${r.rate}% · Pendiente`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-white/10">
            <p className="text-sm font-medium text-white">Ahorro real vs meta en pesos</p>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${fmt(v)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a26",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value) => {
                      const n = typeof value === "number" ? value : Number(value);
                      return [`$${fmt(Number.isFinite(n) ? n : 0)}`, ""];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
                  <Bar dataKey="meta" name="Meta ahorro" fill="#7c6dfa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="real" name="Ahorro real" fill="#5af0c4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
