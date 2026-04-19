"use client";

// =============================================================
// AHORRAPP — src/components/dashboard/EditTransactionModal.tsx
// Modal para editar o eliminar una transacción existente.
// Se abre al hacer click en una fila de la tabla.
// =============================================================

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { Category, PaymentMethod, Transaction } from "@/types/database";

const selectClass =
  "w-full rounded-xl border border-white/10 bg-base-800 px-3 py-2.5 text-sm text-white focus:border-brand/60 focus:outline-none";

type Props = {
  open:        boolean;
  transaction: Transaction | null;
  onClose:     () => void;
  onSuccess:   () => void;
};

export function EditTransactionModal({ open, transaction, onClose, onSuccess }: Props) {
  const [categories, setCategories]         = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [date, setDate]                   = useState("");
  const [amount, setAmount]               = useState("");
  const [merchant, setMerchant]           = useState("");
  const [categoryId, setCategoryId]       = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes]                 = useState("");

  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // Poblar campos cuando se abre con una transacción
  useEffect(() => {
    if (!transaction) return
    setDate(transaction.date)
    setAmount(String(transaction.amount))
    setMerchant(transaction.merchant)
    setCategoryId(transaction.category_id ?? "")
    setPaymentMethodId(transaction.payment_method_id ?? "")
    setNotes(transaction.notes ?? "")
    setError(null)
    setConfirmDelete(false)
  }, [transaction])

  // Cargar categorías y medios de pago
  useEffect(() => {
    if (!open) return
    async function load() {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [catRes, pmRes] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order", { ascending: true }),
        supabase.from("payment_methods").select("*").eq("user_id", user.id),
      ])
      if (catRes.data) setCategories(catRes.data as Category[])
      if (pmRes.data)  setPaymentMethods(pmRes.data as PaymentMethod[])
    }
    void load()
  }, [open])

  const handleSave = useCallback(async () => {
    if (!transaction) return
    setError(null)

    const n = Number(amount.replace(",", "."))
    if (!Number.isFinite(n) || n <= 0) {
      setError("Ingresá un monto válido mayor a 0.")
      return
    }
    if (!merchant.trim()) {
      setError("El comercio es obligatorio.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          amount:            n,
          merchant:          merchant.trim(),
          category_id:       categoryId || null,
          payment_method_id: paymentMethodId || null,
          notes:             notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "No se pudo guardar.")
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError("Error de red. Probá de nuevo.")
    } finally {
      setSaving(false)
    }
  }, [transaction, date, amount, merchant, categoryId, paymentMethodId, notes, onSuccess, onClose])

  const handleDelete = useCallback(async () => {
    if (!transaction) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "No se pudo eliminar.")
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError("Error de red. Probá de nuevo.")
    } finally {
      setDeleting(false)
    }
  }, [transaction, confirmDelete, onSuccess, onClose])

  if (!open || !transaction) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <Card className="relative w-full max-w-md animate-slide-up border-white/10 shadow-2xl">

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Editar gasto</h2>
            <p className="text-xs text-zinc-500">
              Modificá los datos o eliminá este registro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Fecha"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <Input
              type="text"
              inputMode="decimal"
              label="Monto"
              placeholder="15000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              prefix="$"
            />
          </div>

          <Input
            label="Comercio"
            placeholder="Ej: Carrefour, Uber…"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Categoría</label>
            <select
              className={selectClass}
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Medio de pago</label>
            <select
              className={selectClass}
              value={paymentMethodId}
              onChange={e => setPaymentMethodId(e.target.value)}
            >
              <option value="">Sin especificar</option>
              {paymentMethods.map(pm => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}{pm.last_four ? ` · ${pm.last_four}` : ""}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Notas (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              loading={saving}
              onClick={handleSave}
            >
              Guardar cambios
            </Button>
          </div>

          {/* Zona de eliminación */}
          <div className="border-t border-white/[0.06] pt-3">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-xl border border-danger/30 py-2 text-xs text-danger transition hover:bg-danger/10"
              >
                Eliminar este gasto
              </button>
            ) : (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 space-y-2">
                <p className="text-xs text-danger font-medium text-center">
                  ¿Confirmás que querés eliminar este gasto? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-danger py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </Card>
    </div>
  )
}