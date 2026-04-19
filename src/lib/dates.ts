/** `YYYY-MM` → primer día `YYYY-MM-01` (Postgres / incomes.month). */
export function monthFirstDay(month: string): string | null {
  const p = parseYearMonth(month);
  if (!p) return null;
  return `${p.y}-${String(p.m).padStart(2, "0")}-01`;
}

export function parseYearMonth(month: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

/** Rango inclusive `date` para el mes calendario. */
export function monthDateRange(month: string): { start: string; end: string } | null {
  const p = parseYearMonth(month);
  if (!p) return null;
  const start = new Date(p.y, p.m - 1, 1);
  const end = new Date(p.y, p.m, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** `k` meses terminando en `anchorMonth` (inclusive), orden cronológico. */
export function lastKMonthKeys(anchorMonth: string, k: number): string[] {
  const p = parseYearMonth(anchorMonth);
  if (!p) return [];
  const out: string[] = [];
  for (let i = k - 1; i >= 0; i--) {
    const d = new Date(p.y, p.m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
