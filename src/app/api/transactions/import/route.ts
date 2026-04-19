// =============================================================
// AHORRAPP — src/app/api/transactions/import/route.ts
// Importación masiva de transacciones desde CSV.
// Detecta columnas por nombre, ignora filas inválidas.
// =============================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { autoCategory } from '@/lib/utils'

function normalizarFecha(str: string): string | null {
  if (!str) return null
  str = str.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split('-')
    return `${y}-${m}-${d}`
  }
  return null
}

function parsearMonto(str: string): number | null {
  if (!str) return null
  // Eliminar símbolo $ y espacios
  let clean = str.replace(/[$\s]/g, '')
  // Formato 1.234,56 → 1234.56
  if (/\d+\.\d{3},\d{2}/.test(clean)) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  }
  // Formato 1,234.56 → 1234.56
  else if (/\d+,\d{3}\.\d{2}/.test(clean)) {
    clean = clean.replace(/,/g, '')
  }
  // Formato 1234,56 → 1234.56
  else if (/^\d+,\d{2}$/.test(clean)) {
    clean = clean.replace(',', '.')
  }
  // Remover puntos de miles simples
  else {
    clean = clean.replace(/\./g, '').replace(',', '.')
  }
  const n = Math.abs(parseFloat(clean))
  return isNaN(n) || n <= 0 ? null : n
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { csv } = await request.json()
  if (!csv?.trim()) return NextResponse.json({ error: 'CSV vacío' }, { status: 400 })

  const lines = csv.trim().split('\n')
  if (lines.length < 2) return NextResponse.json({ error: 'El CSV necesita al menos una fila de datos' }, { status: 400 })

  // Detectar separador
  const sep     = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map((h: string) => h.toLowerCase().trim().replace(/"/g, ''))

  const colFecha    = headers.findIndex((h: string) => h.includes('fecha'))
  const colMonto    = headers.findIndex((h: string) =>
    ['monto','importe','débito','debito','cargo'].some(k => h.includes(k))
  )
  const colComercio = headers.findIndex((h: string) =>
    ['comercio','descripcion','descripción','concepto','detalle'].some(k => h.includes(k))
  )

  if (colMonto < 0) {
    return NextResponse.json({ error: 'No se encontró columna de monto. Verificá que el CSV tenga una columna llamada "monto", "importe" o "débito".' }, { status: 400 })
  }

  // Obtener categorías del sistema para mapear
  const { data: categorias } = await supabase
    .from('categories')
    .select('id, name')
    .or(`user_id.eq.${user.id},is_system.eq.true`)

  const catMap = Object.fromEntries(
    (categorias || []).map(c => [c.name, c.id])
  )

  const toInsert = []
  let errors     = 0
  const hoy      = new Date().toISOString().split('T')[0]

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue

    const cols     = line.split(sep).map((c: string) => c.trim().replace(/"/g, ''))
    const montoRaw = colMonto >= 0 ? cols[colMonto] : ''
    const monto    = parsearMonto(montoRaw)

    if (!monto) { errors++; continue }

    const fechaRaw = colFecha    >= 0 ? cols[colFecha]    : ''
    const comercio = colComercio >= 0 ? cols[colComercio] : 'Importado'

    const fecha    = normalizarFecha(fechaRaw) || hoy
    const catName  = autoCategory(comercio)
    const catId    = catMap[catName] || null

    toInsert.push({
        user_id:           user.id,
        amount:            monto,
        merchant:          comercio || 'Sin descripción',
        category_id:       catId,
        payment_method_id: null,
        notes:             null,
        raw_email_id:      null,
        date:              fecha,
        source:            'csv' as const,
      })
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ error: 'No se encontraron filas válidas para importar' }, { status: 400 })
  }

  // Insertar en lotes de 50
  let imported = 0
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50)
    const { error } = await supabase.from('transactions').insert(batch)
    if (!error) imported += batch.length
    else errors += batch.length
  }

  return NextResponse.json({ imported, errors })
}
