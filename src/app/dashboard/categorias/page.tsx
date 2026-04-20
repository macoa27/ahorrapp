"use client";

// =============================================================
// AHORRAPP — src/app/dashboard/categorias/page.tsx
// Gestión de categorías de gastos y medios de pago.
// =============================================================

import { useCallback, useEffect, useState } from "react";
import { Button, Card, cn } from "@/components/ui";
import type { Category, PaymentMethod } from "@/types/database";

const EMOJIS = ["🍔","🛒","🚗","💊","🎬","👕","📦","🏠","✈️","📚","🐾","💪","🎮","☕","🍷","🎁","💼","🔧","🌿","💈"];
const COLORS = [
  { label: "Violeta", value: "#7c6dfa" },
  { label: "Verde",   value: "#5af0c4" },
  { label: "Naranja", value: "#f5a623" },
  { label: "Rojo",    value: "#e55" },
  { label: "Azul",    value: "#4a9eff" },
  { label: "Rosa",    value: "#f06292" },
  { label: "Gris",    value: "#888" },
];

// ─── CATEGORY FORM ───────────────────────────────────────────

function CategoryForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Category>;
  onSave: (data: { name: string; icon: string; color: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name,  setName]  = useState(initial?.name  ?? "");
  const [icon,  setIcon]  = useState(initial?.icon  ?? "📦");
  const [color, setColor] = useState(initial?.color ?? "#7c6dfa");

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-base-900 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Nombre</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Mascotas, Gym, Viajes..."
          className="w-full bg-base-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Ícono</label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              className={cn(
                "w-8 h-8 rounded-lg text-base transition-colors",
                icon === e ? "bg-brand/20 ring-1 ring-brand/50" : "hover:bg-white/5"
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all",
                color === c.value ? "border-white scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          loading={saving}
          onClick={() => onSave({ name: name.trim(), icon, color })}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

// ─── PAYMENT METHOD FORM ─────────────────────────────────────

function PaymentMethodForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<PaymentMethod>;
  onSave: (data: { name: string; last_four: string; bank: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name,     setName]     = useState(initial?.name      ?? "");
  const [lastFour, setLastFour] = useState(initial?.last_four ?? "");
  const [bank,     setBank]     = useState(initial?.bank      ?? "");

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-base-900 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Nombre</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Visa Galicia, Débito Santander..."
          className="w-full bg-base-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Últimos 4 dígitos</label>
          <input
            type="text"
            value={lastFour}
            onChange={e => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            className="w-full bg-base-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Banco</label>
          <input
            type="text"
            value={bank}
            onChange={e => setBank(e.target.value)}
            placeholder="Galicia, Santander..."
            className="w-full bg-base-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          loading={saving}
          onClick={() => onSave({ name: name.trim(), last_four: lastFour, bank: bank.trim() })}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────

export default function CategoriasPage() {
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading,        setLoading]        = useState(true);

  const [newCat,     setNewCat]     = useState(false);
  const [editCat,    setEditCat]    = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);
  const [savingCat,  setSavingCat]  = useState(false);

  const [newPm,      setNewPm]      = useState(false);
  const [editPm,     setEditPm]     = useState<PaymentMethod | null>(null);
  const [deletingPm, setDeletingPm] = useState<string | null>(null);
  const [savingPm,   setSavingPm]   = useState(false);

  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [catRes, pmRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/payment-methods"),
    ]);
    if (catRes.ok) setCategories(await catRes.json());
    if (pmRes.ok) setPaymentMethods(await pmRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Categorías ──────────────────────────────────────────────

  async function handleSaveCat(data: { name: string; icon: string; color: string }) {
    if (!data.name) { setError("El nombre es obligatorio"); return; }
    setSavingCat(true);
    setError("");
    const res = editCat
      ? await fetch(`/api/categories/${editCat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setSavingCat(false);
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Error"); return; }
    setNewCat(false); setEditCat(null);
    void load();
  }

  async function handleDeleteCat(id: string) {
    setDeletingCat(id);
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setDeletingCat(null);
    void load();
  }

  // ── Medios de pago ──────────────────────────────────────────

  async function handleSavePm(data: { name: string; last_four: string; bank: string }) {
    if (!data.name) { setError("El nombre es obligatorio"); return; }
    setSavingPm(true);
    setError("");
    const res = editPm
      ? await fetch(`/api/payment-methods/${editPm.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : await fetch("/api/payment-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setSavingPm(false);
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Error"); return; }
    setNewPm(false); setEditPm(null);
    void load();
  }

  async function handleDeletePm(id: string) {
    setDeletingPm(id);
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    setDeletingPm(null);
    void load();
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-base font-semibold text-white">Categorías y medios de pago</h1>
        <p className="text-xs text-zinc-500 mt-1">Personalizá cómo clasificás tus gastos.</p>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {/* ── CATEGORÍAS ─────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Categorías</p>
          {!newCat && !editCat && (
            <Button size="sm" variant="secondary" onClick={() => setNewCat(true)}>
              + Nueva
            </Button>
          )}
        </div>

        {newCat && (
          <div className="mb-4">
            <CategoryForm
              onSave={handleSaveCat}
              onCancel={() => setNewCat(false)}
              saving={savingCat}
            />
          </div>
        )}

        <div className="space-y-1">
          {loading ? (
            <p className="text-xs text-zinc-500 py-4 text-center">Cargando...</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id}>
                {editCat?.id === cat.id ? (
                  <div className="mb-2">
                    <CategoryForm
                      initial={cat}
                      onSave={handleSaveCat}
                      onCancel={() => setEditCat(null)}
                      saving={savingCat}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03] group">
                    <span className="text-lg">{cat.icon}</span>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-sm text-zinc-300">{cat.name}</span>
                    {cat.is_system ? (
                      <span className="text-[10px] text-zinc-600">Sistema</span>
                    ) : (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditCat(cat); setNewCat(false); }}
                          className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCat(cat.id)}
                          disabled={deletingCat === cat.id}
                          className="text-[11px] text-danger/70 hover:text-danger px-2 py-1 rounded-lg hover:bg-danger/10 transition-colors"
                        >
                          {deletingCat === cat.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ── MEDIOS DE PAGO ─────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Medios de pago</p>
          {!newPm && !editPm && (
            <Button size="sm" variant="secondary" onClick={() => setNewPm(true)}>
              + Nuevo
            </Button>
          )}
        </div>

        {newPm && (
          <div className="mb-4">
            <PaymentMethodForm
              onSave={handleSavePm}
              onCancel={() => setNewPm(false)}
              saving={savingPm}
            />
          </div>
        )}

        <div className="space-y-1">
          {loading ? (
            <p className="text-xs text-zinc-500 py-4 text-center">Cargando...</p>
          ) : paymentMethods.length === 0 && !newPm ? (
            <p className="text-xs text-zinc-600 py-4 text-center">
              No tenés medios de pago. Agregá uno para empezar.
            </p>
          ) : (
            paymentMethods.map(pm => (
              <div key={pm.id}>
                {editPm?.id === pm.id ? (
                  <div className="mb-2">
                    <PaymentMethodForm
                      initial={pm}
                      onSave={handleSavePm}
                      onCancel={() => setEditPm(null)}
                      saving={savingPm}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03] group">
                    <span className="text-lg">💳</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300">{pm.name}</p>
                      {(pm.last_four || pm.bank) && (
                        <p className="text-[10px] text-zinc-600">
                          {pm.bank}{pm.bank && pm.last_four ? " · " : ""}{pm.last_four ? `···· ${pm.last_four}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditPm(pm); setNewPm(false); }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeletePm(pm.id)}
                        disabled={deletingPm === pm.id}
                        className="text-[11px] text-danger/70 hover:text-danger px-2 py-1 rounded-lg hover:bg-danger/10 transition-colors"
                      >
                        {deletingPm === pm.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}