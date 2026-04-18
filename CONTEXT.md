# Ahorrapp — Contexto completo del proyecto
> Leer este archivo antes de cualquier tarea. Es la fuente de verdad del proyecto.

---

## Estado actual (lo que ya existe)

### Archivos creados y funcionales

| Archivo | Estado | Descripción |
|---|---|---|
| `src/app/auth/login/page.tsx` | ✅ Completo | Login con Google, email y celular |
| `src/app/auth/onboarding/page.tsx` | ✅ Completo | Onboarding 3 pasos (nombre, fuentes, tarjetas) |
| `src/app/dashboard/layout.tsx` | ✅ Completo | Sidebar + auth guard |
| `src/app/dashboard/page.tsx` | ✅ Completo | Dashboard con KPIs, gráfico de línea, categorías, ingresos, objetivos |
| `src/components/ui/index.tsx` | ✅ Completo | Button, Input, Card, Badge, ProgressBar, Avatar, Logo, Divider, Spinner |
| `src/app/globals.css` | ✅ Completo | Clases base: `.btn-primary`, `.card`, `.badge`, `.nav-item`, etc. |
| `tailwind.config.ts` | ✅ Completo | Paleta Ahorrapp, animaciones, colores de categorías |
| `src/app/layout.tsx` | ✅ Completo | Root layout con Inter font y metadata |
| `src/types/database.ts` | ✅ Completo | Tipos TypeScript del schema de Supabase |
| `src/lib/supabase/client.ts` | ✅ Completo | Cliente Supabase para browser |

---

## Lo que falta construir (en orden de prioridad)

### PRIORIDAD 1 — Archivos de infraestructura faltantes

#### `src/lib/supabase/server.ts`
Cliente de Supabase para Server Components y API routes.
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
```

#### `src/lib/utils.ts`
Funciones utilitarias compartidas.
```typescript
// fmt: formatear montos en ARS
export function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}

// monthLabel: '2025-04' → 'Abr'
export function monthLabel(m: string): string {
  const [y, mo] = m.split('-')
  return new Date(+y, +mo - 1).toLocaleDateString('es-AR', { month: 'short' })
}

// autoCategory: detectar categoría por nombre de comercio
export function autoCategory(merchant: string): string {
  // ... keywords por categoría
}
```

#### `src/app/auth/callback/route.ts`
Handler del callback OAuth de Google/Supabase.
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}${next}`)
}
```

#### `src/middleware.ts`
Proteger todas las rutas del dashboard.
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Si el path empieza con /dashboard y no hay sesión → /auth/login
}
export const config = { matcher: ['/dashboard/:path*'] }
```

---

### PRIORIDAD 2 — API Routes

#### `src/app/api/dashboard/route.ts`
```
GET /api/dashboard?month=2025-04
Response: DashboardData (ver src/types/database.ts)

Pasos:
1. Verificar sesión con createClient() server-side
2. Llamar a la función RPC de Supabase: get_monthly_summary(user_id, month)
3. Traer las últimas 10 transacciones
4. Calcular evolución de los últimos 6 meses
5. Traer presupuestos activos
6. Traer ingresos del mes desde la tabla incomes (ver schema abajo)
7. Retornar DashboardData tipado
```

#### `src/app/api/transactions/route.ts`
```
GET  /api/transactions?month=&category=&source=&search=&page=&limit=
POST /api/transactions   body: TransactionInsert
```

#### `src/app/api/budgets/route.ts`
```
GET  /api/budgets
POST /api/budgets        body: { category_id, amount, alert_pct }
PUT  /api/budgets/[id]   body: { amount, alert_pct }
```

#### `src/app/api/incomes/route.ts`
```
GET  /api/incomes?month=
POST /api/incomes        body: { amount, label, month, recurring }
```

#### `src/app/api/webhooks/whatsapp/route.ts`
```
POST /api/webhooks/whatsapp  (llamado por Twilio)
Headers: verificar firma Twilio con X-Twilio-Signature
Body (form-encoded): { From, Body }
Lógica:
  1. Buscar user por From (whatsapp_number en profiles)
  2. Si no existe: responder "No encontré tu cuenta. Registrate en ahorrapp.com"
  3. Si el Body es "si"/"no": confirmar/cancelar sesión pendiente en whatsapp_sessions
  4. Si es un gasto: parsear → crear sesión pendiente → responder con confirmación
```

#### `src/app/api/health/route.ts` ✅ Ya existe en el repo de backend

---

### PRIORIDAD 3 — Páginas del dashboard

#### `src/app/dashboard/transacciones/page.tsx`
```
Componentes necesarios:
- Barra de búsqueda (input texto)
- Filtros: mes (input month), categoría (select), fuente (select: email/whatsapp/manual/csv)
- Tabla paginada de transacciones (20 por página)
- Botón exportar CSV
- Botón + Gasto (abre AddTransactionModal)

Datos: GET /api/transactions con los filtros activos
```

#### `src/app/dashboard/presupuesto/page.tsx`
```
Componentes necesarios:
- Grid de BudgetCard por categoría
- Cada card muestra: nombre, ícono, gastado vs presupuesto, barra de progreso
- Color de barra: verde < 90%, naranja 90-100%, rojo > 100%
- Botón "Configurar" por card (abre modal inline)
- Botón "+ Nueva categoría" para agregar presupuesto

Datos: GET /api/budgets + GET /api/transactions?month=actual
```

#### `src/app/dashboard/objetivos/page.tsx`
```
Componentes necesarios:
- Card principal: objetivo de ahorro mensual (% de ingresos)
- Historial de meses: si se cumplió o no (últimos 6)
- Gráfico de barras: ahorro real vs meta por mes
- Botón editar objetivo

Datos: GET /api/dashboard?month= (reutilizar los datos de evolución)
```

---

### PRIORIDAD 4 — Modales

#### `src/components/dashboard/AddTransactionModal.tsx`
```
Props: { open: boolean, onClose: () => void, onSuccess: () => void }

Campos:
- fecha (date, default hoy)
- monto (number, required)
- comercio (text, required) → al escribir, auto-detectar categoría con autoCategory()
- categoría (select con íconos, 12 opciones)
- medio de pago (select, opciones del usuario en payment_methods)
- notas (text, opcional)

Al guardar: POST /api/transactions
Mostrar: alerta si excede presupuesto (viene en la respuesta de la API)
```

#### `src/components/dashboard/AddIncomeModal.tsx`
```
Props: { open: boolean, onClose: () => void, onSuccess: () => void }

Campos:
- label (text, ej: "Sueldo", "Freelance")
- monto (number)
- mes (month, default actual)
- recurrente (checkbox — si está activo, se repite cada mes)

Al guardar: POST /api/incomes
```

---

## Schema de DB relevante

### Tablas principales (ver migraciones completas en `supabase/migrations/`)
```sql
profiles          -- id, email, full_name, whatsapp_number, gmail_connected
transactions      -- id, user_id, amount, merchant, category_id, payment_method_id, date, source
categories        -- id, user_id (null=sistema), name, icon, color, is_system
budgets           -- id, user_id, category_id, amount, alert_pct
payment_methods   -- id, user_id, name, last_four, bank, email_origin
whatsapp_sessions -- id, user_id, phone_number, pending_data, expires_at

-- Tabla a crear (migración pendiente):
incomes           -- id, user_id, amount, label, month (date), recurring (bool)
savings_goals     -- id, user_id, target_pct (int), created_at
```

### Migración pendiente para incomes y savings_goals
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_incomes_savings.sql
create table public.incomes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  label      text not null default 'Ingreso',
  month      date not null,             -- primer día del mes: '2025-04-01'
  recurring  boolean default false,
  created_at timestamptz default now()
);
alter table public.incomes enable row level security;
create policy "incomes_own" on public.incomes for all using (user_id = auth.uid());

create table public.savings_goals (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  target_pct int not null default 70 check (target_pct between 1 and 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.savings_goals enable row level security;
create policy "savings_goals_own" on public.savings_goals for all using (user_id = auth.uid());
```

---

## Prompts listos para Cursor

Copiar y pegar directamente en Cursor:

### Para crear el middleware de auth:
```
Crear src/middleware.ts para Ahorrapp.
Debe proteger todas las rutas que empiecen con /dashboard.
Si no hay sesión de Supabase → redirigir a /auth/login.
Usar createServerClient de @supabase/ssr con las cookies de Next.js.
Ver el patrón en CONTEXT.md sección PRIORIDAD 1.
```

### Para crear la página de transacciones:
```
Crear src/app/dashboard/transacciones/page.tsx para Ahorrapp.
Ver especificación completa en CONTEXT.md sección PRIORIDAD 3.
Usar SIEMPRE los componentes de @/components/ui.
Los colores van con clases Tailwind de tailwind.config.ts, nunca hex hardcodeado.
La función fmt() para formatear montos está en @/lib/utils.ts.
```

### Para crear el modal de carga manual:
```
Crear src/components/dashboard/AddTransactionModal.tsx para Ahorrapp.
Ver especificación en CONTEXT.md sección PRIORIDAD 4.
El modal recibe props: { open, onClose, onSuccess }.
Al escribir en el campo "comercio" debe llamar a autoCategory() de @/lib/utils.ts
y pre-seleccionar la categoría automáticamente.
Mostrar una alerta si la API retorna { alerta: { tipo: 'excedido' } }.
```

### Para crear la API de transacciones:
```
Crear src/app/api/transactions/route.ts para Ahorrapp.
GET: acepta query params month, category, source, search, page, limit.
POST: inserta una transacción nueva.
Usar createClient() de @/lib/supabase/server (server-side).
Verificar sesión en cada endpoint — si no hay user, retornar 401.
Los datos siempre se filtran por user_id del usuario autenticado.
Ver tipos en @/types/database.ts: Transaction, TransactionInsert.
```