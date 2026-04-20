"use client";

// =============================================================
// AHORRAPP — src/components/dashboard/EditIncomeModal.tsx
// Modal para editar o eliminar un ingreso existente.
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { Income } from "@/types/database";
import { formatMoneyInput, parseMoneyInput } from "@/lib/utils";

const LABELS_SUGERIDOS = ["Sueldo", "Freelance", "Alquiler", "Consultoría", "Otro"];

type Props = {
  open:      boolean;
  income:    Income | null;
  onClose:   () => void;
  onSuccess: () => void;
};

export function EditIncomeModal({ open, income, onClose, onSuccess }: Props) {
  const [label, setLabel]         = useState("");
  const [amount, setAmount]       = useState("");
  const [month, setMonth]         = useState("");
  const [recurring, setRecurring] = useState(false);

  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // Poblar campos cuando se abre con un ingreso
  useEffect(() => {
    if (!income) return;
    setLabel(income.label);
    setAmount(String(income.amount));
    // income.month viene como '2026-04-01', extraer solo YYYY-MM
    setMonth(income.month.substring(0, 7));
    setRecurring(income.recurring ?? false);
    setError(null);
    setConfirmDelete(false);
  }, [income]);

  const handleSave = useCallback(async () => {
    if (!income) return;
    setError(null);

    const n = parseMoneyInput(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Ingresá un monto válido mayor a 0.");
      return;
    }
    if (!label.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/incomes/${income.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          label:     label.trim(),
          amount:    n,
          month:     month,
          recurring,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "No se pudo guardar.");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Error de red. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }, [income, label, amount, month, recurring, onSuccess, onClose]);

  const handleDelete = useCallback(async () => {
    if (!income) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/incomes/${income.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "No se pudo eliminar.");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Error de red. Probá de nuevo.");
    } finally {
      setDeleting(false);
    }
  }, [income, confirmDelete, onSuccess, onClose]);

  if (!open || !income) return null;

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
            <h2 className="text-lg font-semibold text-white">Editar ingreso</h2>
            <p className="text-xs text-zinc-500">Modificá los datos o eliminá este registro.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">

          {/* Label con sugerencias */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Descripción</label>
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
                  type="button"
                  onClick={() => setLabel(s)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                    label === s
                      ? "bg-brand/20 border-brand/40 text-brand-light"
                      : "bg-transparent border-white/10 text-zinc-500 hover:border-white/20"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <Input
            type="text"
            inputMode="decimal"
            label="Monto ($)"
            placeholder="280000"
            value={amount}
            onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
          />

          {/* Mes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Mes</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full bg-base-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50"
            />
          </div>

          {/* Recurrente */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-base-900 border border-white/[0.07]">
            <div className="relative">
              <input
                type="checkbox"
                checked={recurring}
                onChange={e => setRecurring(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${recurring ? "bg-brand" : "bg-white/10"}`}>
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${recurring ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
            <div>
              <p className="text-xs text-white font-medium">Ingreso recurrente</p>
              <p className="text-[10px] text-zinc-500">Se repite todos los meses</p>
            </div>
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}

          {/* Botones principales */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" loading={saving} onClick={handleSave}>
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
                Eliminar este ingreso
              </button>
            ) : (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 space-y-2">
                <p className="text-xs text-danger font-medium text-center">
                  ¿Confirmás que querés eliminar este ingreso? Esta acción no se puede deshacer.
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
  );
}