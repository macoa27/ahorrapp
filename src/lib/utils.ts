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
  const value = merchant.toLowerCase();

  if (/(disco|carrefour|jumbo|dia|coto|chango mas|vea)/.test(value)) return "Supermercado";
  if (/(uber|cabify|sube|ypf|shell|axion|estacion|peaje|metrobus|colectivo)/.test(value)) return "Transporte";
  if (/(farmacity|farmacia|hospital|clinica|osde|swiss medical|medicus)/.test(value)) return "Salud";
  if (/(mcdonald|burger king|mostaza|starbucks|cafe|resto|restaurante|pedido ya|rappi)/.test(value))
    return "Restaurantes";
  if (/(cinemark|hoyts|netflix|spotify|disney|steam|playstation|xbox)/.test(value)) return "Entretenimiento";
  if (/(zara|h&m|adidas|nike|falabella|ropa|indumentaria)/.test(value)) return "Ropa";

  return "Otros";
}

export const cn = cnFromUI;
