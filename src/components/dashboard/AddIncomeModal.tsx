'use client'

// =============================================================
// AHORRAPP — src/components/dashboard/AddIncomeModal.tsx
// Modal para registrar ingresos del mes.
// Props: open, onClose, onSuccess
// =============================================================

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, cn } from '@/components/ui'

interface Props {
  open:      boolean
  onClose:   () => void
  onSuccess: () => void
}

const LABELS_SUGERIDOS = ['Sueldo', 'Freelance', 'Alquiler', 'Consultoría', 'Otro']

export default function AddIncomeModal({ open, onClose, onSuccess }: Props) {
  const supabase = createClient()

  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  const [label, setLabel]         = useState('')
  const [amount, setAmount]       = useState('')
  const [month, setMonth]         = useState(mesActual)
  const [recurring, setRecurring] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  if (!open) return null

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingresá un monto válido')
      return
    }
    if (!label.trim()) {
      setError('Ingresá una descripción')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No hay sesión activa'); setLoading(false); return }

    const res = await fetch('/api/incomes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        label:     label.trim(),
        amount:    parseFloat(amount),
        month:     `${month}-01`,
        recurring,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al guardar')
      return
    }

    // Reset form
    setLabel('')
    setAmount('')
    setMonth(mesActual)
    setRecurring(false)

    onSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-base-700 border border-white/[0.07] rounded-2xl p-6 w-full max-w-sm mx-4 animate-slide-up">

        <h2 className="text-base font-semibold text-white mb-5">Registrar ingreso</h2>

        {/* Label con sugerencias */}
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Descripción
          </label>
          <input
            type="text"
            placeholder="Sueldo, Freelance, Alquiler..."
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full bg-base-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
          />
          <div className="flex gap-1.5 flex-wrap mt-1">
            {LABELS_SUGERIDOS.map(s => (
              <button
                key={s}
                onClick={() => setLabel(s)}
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-full border transition-colors',
                  label === s
                    ? 'bg-brand/20 border-brand/40 text-brand-light'
                    : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-400'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Monto */}
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Monto ($)
          </label>
          <input
            type="number"
            placeholder="280000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-base-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
          />
        </div>

        {/* Mes */}
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Mes
          </label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-full bg-base-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50"
          />
        </div>

        {/* Recurrente */}
        <label className="flex items-center gap-3 cursor-pointer mb-5 p-3 rounded-xl bg-base-900 border border-white/[0.07]">
          <div className="relative">
            <input
              type="checkbox"
              checked={recurring}
              onChange={e => setRecurring(e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              'w-9 h-5 rounded-full transition-colors duration-200',
              recurring ? 'bg-brand' : 'bg-white/10'
            )}>
              <div className={cn(
                'w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform duration-200',
                recurring ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </div>
          </div>
          <div>
            <p className="text-xs text-white font-medium">Ingreso recurrente</p>
            <p className="text-[10px] text-zinc-500">Se repite todos los meses</p>
          </div>
        </label>

        {error && (
          <p className="text-xs text-danger mb-3 animate-fade-in">{error}</p>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={loading} className="flex-1">
            Guardar
          </Button>
        </div>

      </div>
    </div>
  )
}