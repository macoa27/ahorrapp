"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { autoCategory, formatMoneyInput, parseMoneyInput } from "@/lib/utils";
import type { Category, PaymentMethod, Transaction } from "@/types/database";

const selectClass =
  "w-full rounded-xl border border-white/10 bg-base-800 px-3 py-2.5 text-sm text-white focus:border-brand/60 focus:outline-none";

export type BudgetAlert = { tipo: "excedido"; gastado: number; presupuesto: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddTransactionModal({ open, onClose, onSuccess }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categoryManual, setCategoryManual] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [alerta, setAlerta] = useState<BudgetAlert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setMerchant("");
    setCategoryId("");
    setCategoryManual(false);
    setPaymentMethodId("");
    setNotes("");
    setAlerta(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    async function loadRefs() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [catRes, pmRes] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order", { ascending: true }),
        supabase.from("payment_methods").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);

      if (catRes.data) setCategories(catRes.data as Category[]);
      if (pmRes.data) setPaymentMethods(pmRes.data as PaymentMethod[]);
    }

    void loadRefs();
  }, [open]);

  useEffect(() => {
    if (!open || categoryManual || categories.length === 0) return;
    const guess = autoCategory(merchant);
    const match = categories.find((c) => c.name === guess);
    if (match) setCategoryId(match.id);
  }, [merchant, categories, categoryManual, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAlerta(null);

    const n = parseMoneyInput(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Ingresá un monto válido mayor a 0.");
      return;
    }
    if (!merchant.trim()) {
      setError("El comercio es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: n,
          merchant: merchant.trim(),
          category_id: categoryId || null,
          payment_method_id: paymentMethodId || null,
          date,
          source: "manual",
          notes: notes.trim() || null,
        }),
      });

      const json = (await res.json()) as {
        error?: string;
        transaction?: Transaction;
        alerta?: BudgetAlert | null;
      };

      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar.");
        return;
      }

      if (json.alerta?.tipo === "excedido") {
        setAlerta(json.alerta);
      }

      onSuccess();
      if (!json.alerta) onClose();
    } catch {
      setError("Error de red. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-tx-title"
    >
      <Card className="relative w-full max-w-md animate-slide-up border-white/10 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-tx-title" className="text-lg font-semibold text-white">
              Nuevo gasto
            </h2>
            <p className="text-xs text-zinc-500">Se registra como fuente manual.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input
              type="text"
              inputMode="decimal"
              label="Monto"
              placeholder="15.000"
              value={amount}
              onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
              prefix="$"
              required
            />
          </div>

          <Input
            label="Comercio"
            placeholder="Ej: Carrefour, Uber…"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Categoría</label>
            <select
              className={selectClass}
              value={categoryId}
              onChange={(e) => {
                setCategoryManual(true);
                setCategoryId(e.target.value);
              }}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Medio de pago</label>
            <select
              className={selectClass}
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
            >
              <option value="">Sin especificar</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                  {pm.last_four ? ` · ${pm.last_four}` : ""}
                </option>
              ))}
            </select>
          </div>

          <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error ? <p className="text-xs text-danger">{error}</p> : null}

          {alerta ? (
            <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              <p className="font-semibold">Presupuesto superado</p>
              <p className="mt-1 text-zinc-300">
                En esta categoría llevás gastado más que el tope del mes. Podés ajustar el presupuesto en la sección
                correspondiente.
              </p>
              <Badge variant="warning" className="mt-2">
                Gastado ${Math.round(alerta.gastado)} / ${Math.round(alerta.presupuesto)}
              </Badge>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          ) : null}

          {!alerta ? (
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" loading={saving}>
                Guardar
              </Button>
            </div>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
