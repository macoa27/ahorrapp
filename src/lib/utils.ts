import { cn as cnFromUI } from "@/components/ui";

export function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function monthLabel(m: string) {
  const [year, month] = m.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
}

export function autoCategory(merchant: string) {
  const value = merchant
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const has = (re: RegExp) => re.test(value);

  if (has(/disco|carrefour|jumbo|coto|\bdia\b/)) return "Supermercado";
  if (has(/uber|cabify|taxi|sube|peaje|ypf|shell/)) return "Transporte";
  if (has(/mcdonalds|burger|pizza|sushi|rappi|pedidosya|cafe|bar/)) return "Restaurantes";
  if (has(/farmacity|farmacia|clinica|doctor|hospital/)) return "Salud";
  if (has(/netflix|spotify|hbo|disney|amazon|cine/)) return "Entretenimiento";
  if (has(/edesur|edenor|metrogas|telecom|personal|claro|movistar/)) return "Servicios";
  if (has(/zara|\bhm\b|adidas|nike|zapatilla|ropa/)) return "Ropa";

  return "Otros";
}

export function formatMoneyInput(raw: string): string {
  const clean = raw.replace(/[^\d,]/g, "");
  const [intPart, decPart] = clean.split(",");
  const intFormatted = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted;
}

export function parseMoneyInput(formatted: string): number {
  const clean = formatted.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

export const cn = cnFromUI;