"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { AddTransactionModal } from "@/components/dashboard/AddTransactionModal";
import { createClient } from "@/lib/supabase/client";
import { currentYearMonth } from "@/lib/dates";
import { fmt } from "@/lib/utils";
import type { Category, Transaction, TransactionSource } from "@/types/database";

const PAGE_SIZE = 20;

const SOURCE_OPTIONS: { value: "" | TransactionSource; label: string }[] = [
  { value: "", label: "Todas las fuentes" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manual", label: "Manual" },
  { value: "csv", label: "CSV" },
];

function sourceBadgeVariant(
  source: Transaction["source"]
): "email" | "whatsapp" | "manual" | "csv" | "brand" {
  if (source === "email") return "email";
  if (source === "whatsapp") return "whatsapp";
  if (source === "manual") return "manual";
  if (source === "csv") return "csv";
  if (source === "import") return "csv";
  return "brand";
}

function sourceLabel(source: Transaction["source"]): string {
  const labels: Record<Transaction["source"], string> = {
    email: "Email",
    whatsapp: "WhatsApp",
    manual: "Manual",
    csv: "CSV",
    import: "Importación",
  };
  return labels[source] ?? source;
}

export default function TransaccionesPage() {
  const [month, setMonth] = useState(currentYearMonth);
  const [category, setCategory] = useState("");
  const [source, setSource] = useState<"" | TransactionSource>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function loadCats() {
      const supabase = createClient();
      const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (data) setCategories(data as Category[]);
    }
    void loadCats();
  }, []);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("month", month);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (category) params.set("category", category);
      if (source) params.set("source", source);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        setTransactions([]);
        setTotal(0);
        return;
      }
      const json = (await res.json()) as { transactions?: Transaction[]; count?: number };
      setTransactions(json.transactions ?? []);
      setTotal(json.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [month, category, source, debouncedSearch, page]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    setPage(1);
  }, [month, category, source, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function exportCsv() {
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("page", "1");
    params.set("limit", "2000");
    if (category) params.set("category", category);
    if (source) params.set("source", source);
    if (debouncedSearch) params.set("search", debouncedSearch);

    const res = await fetch(`/api/transactions?${params.toString()}`);
    if (!res.ok) return;
    const json = (await res.json()) as { transactions?: Transaction[] };
    const rows = json.transactions ?? [];

    const header = ["fecha", "comercio", "monto", "categoria", "fuente", "notas"];
    const lines = rows.map((t) => {
      const cat = t.category_id ? categoryById[t.category_id] : null;
      const catName = cat ? `${cat.icon} ${cat.name}` : "";
      const esc = (s: string | null | undefined) => {
        const v = (s ?? "").replace(/"/g, '""');
        return `"${v}"`;
      };
      return [
        t.date,
        esc(t.merchant),
        String(t.amount),
        esc(catName),
        esc(sourceLabel(t.source)),
        esc(t.notes),
      ].join(",");
    });

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Transacciones</h1>
          <p className="text-sm text-zinc-500">Buscá, filtrá y exportá tus movimientos del mes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void exportCsv()}>
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + Gasto
          </Button>
        </div>
      </div>

      <Card className="border-white/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-3 lg:flex lg:flex-wrap lg:gap-3 lg:space-y-0">
            <Input
              className="lg:min-w-[200px]"
              label="Buscar"
              placeholder="Comercio…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:flex-1">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs text-zinc-400">Mes</label>
                <input
                  type="month"
                  className="input w-full"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Categoría</label>
                <select
                  className="input w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Fuente</label>
                <select
                  className="input w-full"
                  value={source}
                  onChange={(e) => setSource(e.target.value as "" | TransactionSource)}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-white/10 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-base-800/80 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Comercio</th>
                <th className="px-4 py-3 font-medium text-right">Monto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Fuente</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Notas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    Cargando…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    No hay transacciones con estos filtros.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const cat = t.category_id ? categoryById[t.category_id] : null;
                  return (
                    <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-3 font-medium text-white">{t.merchant}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">${fmt(Number(t.amount))}</td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <span className="inline-flex items-center gap-2 text-zinc-300">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-brand"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>
                              {cat.icon} {cat.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={sourceBadgeVariant(t.source)}>{sourceLabel(t.source)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate hidden md:table-cell">
                        {t.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {total === 0 ? "Sin resultados" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void fetchPage()}
      />
    </div>
  );
}
