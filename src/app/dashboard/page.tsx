use client'

// =============================================================
// AHORRAPP — src/app/dashboard/page.tsx
// Dashboard principal. Datos reales desde Supabase.
// Componentes: KPIs · LineChart · CategoryBars · Ingresos · Objetivos · TxTable
// =============================================================

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from 'recharts'
import { Card, Badge, ProgressBar, Avatar, cn } from '@/components/ui'
import type { DashboardData, Transaction } from '@/types/database'

// ─── DATOS DEMO ─────────────────────────────────────────────
// Se reemplazan por los datos reales de Supabase al conectar
const DEMO_DATA: DashboardData = {
  month:          '2025-04',
  totalSpent:     89340,
  txCount:        34,
  avgTicket:      2628,
  totalBudget:    80000,
  budgetUsedPct:  112,
  totalIncome:    320000,
  savingsGoalPct: 70,
  realSavingsPct: 72,
  byCategory: [
    { category_name: 'Restaurantes',    category_icon: '🍔', category_color: '#f97316', total: 24800, tx_count: 12, budget_amount: 20000, budget_pct: 124, category_id: '1' },
    { category_name: 'Supermercado',    category_icon: '🛒', category_color: '#22c55e', total: 17500, tx_count: 8,  budget_amount: 25000, budget_pct: 70,  category_id: '2' },
    { category_name: 'Ropa',            category_icon: '👕', category_color: '#06b6d4', total: 13200, tx_count: 3,  budget_amount: null,  budget_pct: null, category_id: '3' },
    { category_name: 'Transporte',      category_icon: '🚗', category_color: '#3b82f6', total: 8100,  tx_count: 7,  budget_amount: 10000, budget_pct: 81,  category_id: '4' },
    { category_name: 'Entretenimiento', category_icon: '🎬', category_color: '#ec4899', total: 6490,  tx_count: 2,  budget_amount: 8000,  budget_pct: 81,  category_id: '5' },
    { category_name: 'Otros',           category_icon: '📦', category_color: '#94a3b8', total: 4250,  tx_count: 2,  budget_amount: null,  budget_pct: null, category_id: '6' },
  ],
  monthlyEvolution: [
    { month: '2024-11', total: 61000, income: 290000 },
    { month: '2024-12', total: 94000, income: 310000 },
    { month: '2025-01', total: 72000, income: 300000 },
    { month: '2025-02', total: 58000, income: 315000 },
    { month: '2025-03', total: 67000, income: 308000 },
    { month: '2025-04', total: 89340, income: 320000 },
  ],
  recentTransactions: [
    { id: '1', user_id: 'u1', amount: 6840,  merchant: 'Carrefour Palermo', date: '2025-04-18', source: 'email',    category_id: '2', payment_method_id: null, notes: null, raw_email_id: null, created_at: '', updated_at: '' },
    { id: '2', user_id: 'u1', amount: 1250,  merchant: 'Uber',              date: '2025-04-17', source: 'whatsapp', category_id: '4', payment_method_id: null, notes: null, raw_email_id: null, created_at: '', updated_at: '' },
    { id: '3', user_id: 'u1', amount: 8900,  merchant: 'La Alacena',        date: '2025-04-17', source: 'email',    category_id: '1', payment_method_id: null, notes: null, raw_email_id: null, created_at: '', updated_at: '' },
    { id: '4', user_id: 'u1', amount: 2490,  merchant: 'Netflix',           date: '2025-04-16', source: 'email',    category_id: '5', payment_method_id: null, notes: null, raw_email_id: null, created_at: '', updated_at: '' },
    { id: '5', user_id: 'u1', amount: 13200, merchant: 'Zara Unicenter',    date: '2025-04-15', source: 'manual',   category_id: '3', payment_method_id: null, notes: null, raw_email_id: null, created_at: '', updated_at: '' },
  ],
  incomeBreakdown: [
    { label: 'Sueldo',    amount: 280000 },
    { label: 'Freelance', amount: 40000 },
  ],
}

// ─── HELPERS ────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'decimal', maximumFractionDigits: 0 }).format(n)
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return new Date(+y, +mo - 1).toLocaleDateString('es-AR', { month: 'short' })
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData]           = useState<DashboardData>(DEMO_DATA)
  const [selectedMonth, setMonth] = useState('2025-04')
  const [loading, setLoading]     = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Cargar datos reales de Supabase
  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const res = await fetch(`/api/dashboard?month=${selectedMonth}`, {
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
      setLoading(false)
    }
    load()
  }, [selectedMonth])

  const balance      = (data.totalIncome || 0) - data.totalSpent
  const savingsReal  = data.realSavingsPct || Math.round(balance / (data.totalIncome || 1) * 100)
  const goalMet      = savingsReal >= (data.savingsGoalPct || 70)
  const maxCatTotal  = Math.max(...data.byCategory.map(c => c.total))

  // Línea de referencia de meta en el gráfico
  const savingsGoalAmount = data.totalIncome
    ? Math.round(data.totalIncome * (1 - (data.savingsGoalPct || 70) / 100))
    : null

  return (
    <div className="flex flex-col gap-4 animate-fade-in">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setMonth(e.target.value)}
            className="bg-base-700 border border-white/[0.07] rounded-xl px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-brand/50 cursor-pointer"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-brand text-white text-xs font-medium px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            + Registrar
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Ingresos"
          value={`$${fmt(data.totalIncome || 0)}`}
          sub="este mes"
          color="income"
        />
        <KpiCard
          label="Gastos"
          value={`$${fmt(data.totalSpent)}`}
          sub={`${data.budgetUsedPct}% del presupuesto`}
          color={data.budgetUsedPct > 100 ? 'danger' : 'default'}
        />
        <KpiCard
          label="Balance"
          value={`$${fmt(balance)}`}
          sub="disponible"
          color={balance >= 0 ? 'income' : 'danger'}
        />
        <KpiCard
          label="Ahorro real"
          value={`${savingsReal}%`}
          sub={goalMet ? `meta ${data.savingsGoalPct}% ✓` : `meta ${data.savingsGoalPct}%`}
          color={goalMet ? 'brand' : 'warning'}
        />
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-5 gap-3">

        {/* Gráfico de línea — 3/5 del ancho */}
        <Card className="col-span-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">
            Gastos mensuales
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.monthlyEvolution.map(d => ({
              ...d,
              label:     monthLabel(d.month),
              isCurrentMonth: d.month === selectedMonth,
            }))}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c6dfa" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#7c6dfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#444' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#444' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? Math.round(v/1000) + 'k' : v}`}
                width={36}
              />
              <Tooltip
                contentStyle={{ background: '#1a1a26', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#888' }}
                formatter={(v: number) => [`$${fmt(v)}`, 'Gastos']}
              />
              {savingsGoalAmount && (
                <ReferenceLine
                  y={savingsGoalAmount}
                  stroke="#f5a623"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{ value: 'Meta', position: 'right', fontSize: 9, fill: '#f5a623' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="total"
                stroke="#7c6dfa"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={(props: any) => {
                  const isCurrent = props.payload?.isCurrentMonth
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx} cy={props.cy} r={isCurrent ? 4 : 3}
                      fill={isCurrent ? '#7c6dfa' : 'rgba(124,109,250,0.3)'}
                      stroke="none"
                    />
                  )
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Categorías — 2/5 del ancho */}
        <Card className="col-span-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">
            Por categoría
          </p>
          <div className="flex flex-col gap-2.5">
            {data.byCategory.slice(0, 6).map(cat => (
              <div key={cat.category_id} className="flex items-center gap-2">
                <span className="text-xs w-4 text-center flex-shrink-0">{cat.category_icon}</span>
                <span className="text-[11px] text-zinc-400 w-20 truncate flex-shrink-0">{cat.category_name}</span>
                <div className="flex-1">
                  <ProgressBar
                    value={cat.total}
                    max={maxCatTotal}
                    color="brand"
                  />
                </div>
                <span className="text-[11px] text-white min-w-[44px] text-right flex-shrink-0">
                  ${fmt(cat.total)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── BOTTOM ROW: Ingresos + Objetivo de ahorro ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Ingresos */}
        <Card className="border-income/15">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ingresos del mes</p>
            <button className="text-[10px] text-zinc-600 border border-white/[0.07] rounded-md px-2 py-0.5 hover:text-zinc-400 transition-colors">
              + Agregar
            </button>
          </div>
          <p className="text-xl font-bold text-income tracking-tight">
            ${fmt(data.totalIncome || 0)}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.05]">
            {(data.incomeBreakdown || []).map(item => (
              <div key={item.label} className="text-[11px] text-zinc-500">
                {item.label} <span className="text-zinc-400">${fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Objetivo de ahorro */}
        <Card className="border-warning/15">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Objetivo de ahorro</p>
            <button className="text-[10px] text-zinc-600 border border-white/[0.07] rounded-md px-2 py-0.5 hover:text-zinc-400 transition-colors">
              ✏ Editar
            </button>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-warning tracking-tight">${fmt(balance)}</p>
            <p className="text-xs text-zinc-600">
              de ${fmt(Math.round((data.totalIncome || 0) * (data.savingsGoalPct || 70) / 100))} meta
            </p>
          </div>
          <ProgressBar value={savingsReal} max={100} color="warning" height="md" />
          <p className={cn('text-[10px] mt-1.5', goalMet ? 'text-warning' : 'text-zinc-600')}>
            {goalMet
              ? `✓ Meta superada · ${savingsReal}% de ingresos ahorrado`
              : `${savingsReal}% de ${data.savingsGoalPct}% meta · Faltan $${fmt(
                  Math.round((data.totalIncome || 0) * (data.savingsGoalPct || 70) / 100) - balance
                )}`}
          </p>
        </Card>
      </div>

      {/* ── TABLA DE TRANSACCIONES RECIENTES ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Últimas transacciones
          </p>
          <a href="/dashboard/transacciones" className="text-[11px] text-brand hover:text-brand-light transition-colors">
            Ver todas →
          </a>
        </div>
        <TransactionsTable
          transactions={data.recentTransactions}
          categories={data.byCategory}
        />
      </Card>

    </div>
  )
}

// ─── SUB-COMPONENTES ────────────────────────────────────────

function KpiCard({ label, value, sub, color }: {
  label:  string
  value:  string
  sub?:   string
  color?: 'income' | 'danger' | 'warning' | 'brand' | 'default'
}) {
  const colors = {
    income:  'text-income',
    danger:  'text-danger',
    warning: 'text-warning',
    brand:   'text-brand',
    default: 'text-white',
  }
  return (
    <div className="bg-base-700 border border-white/[0.05] rounded-xl p-3">
      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-lg font-bold tracking-tight', colors[color || 'default'])}>{value}</p>
      {sub && <p className="text-[9px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function TransactionsTable({
  transactions,
  categories,
}: {
  transactions: Transaction[]
  categories:   { category_id: string; category_name: string; category_icon: string }[]
}) {
  const catMap = Object.fromEntries(categories.map(c => [c.category_id, c]))

  return (
    <table className="w-full" style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {['Fecha', 'Comercio', 'Categoría', 'Fuente', 'Monto'].map(h => (
            <th key={h} className="text-left pb-2 text-[9px] text-zinc-600 uppercase tracking-wider border-b border-white/[0.05] font-normal">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {transactions.map(tx => {
          const cat = catMap[tx.category_id || '']
          return (
            <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 text-[11px] text-zinc-500 border-b border-white/[0.03]">
                {new Date(tx.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              </td>
              <td className="py-2.5 text-[12px] text-white font-medium border-b border-white/[0.03] truncate pr-2">
                {tx.merchant}
              </td>
              <td className="py-2.5 border-b border-white/[0.03]">
                {cat && (
                  <span className="text-[11px] text-zinc-400">
                    {cat.category_icon} {cat.category_name}
                  </span>
                )}
              </td>
              <td className="py-2.5 border-b border-white/[0.03]">
                <Badge variant={tx.source as any}>{tx.source}</Badge>
              </td>
              <td className="py-2.5 text-[12px] text-white font-semibold text-right border-b border-white/[0.03]">
                ${fmt(tx.amount)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
