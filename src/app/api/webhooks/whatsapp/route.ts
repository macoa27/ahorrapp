// =============================================================
// AHORRAPP — src/app/api/webhooks/whatsapp/route.ts
// Webhook de Twilio para WhatsApp.
// Flujo: mensaje → detectar gasto → confirmar → registrar
// =============================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── HELPERS ────────────────────────────────────────────────

function twimlResponse(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parsearMonto(str: string): number | null {
  const clean = str
    .replace(/[$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) || n <= 0 ? null : n
}

function parsearMensaje(texto: string): { monto: number; comercio: string; medioPago: string | null } | null {
  const montoMatch = texto.match(/\$?\s*([\d.,]+)/)
  if (!montoMatch) return null

  const monto = parsearMonto(montoMatch[1])
  if (!monto) return null

  const sinMonto = texto.replace(montoMatch[0], '').trim()

  const mediosKnown = ['galicia', 'santander', 'bbva', 'naranja', 'macro', 'hsbc',
    'mercadopago', 'mp', 'efectivo', 'debito', 'débito', 'credito', 'crédito']
  const palabras = sinMonto.toLowerCase().split(/\s+/)
  let medioPago: string | null = null
  let palabrasComercio = [...palabras]

  for (let i = palabras.length - 1; i >= 0; i--) {
    if (mediosKnown.includes(palabras[i])) {
      medioPago = palabras[i].charAt(0).toUpperCase() + palabras[i].slice(1)
      palabrasComercio = palabras.filter((_, j) => j !== i)
      break
    }
  }

  const comercio = palabrasComercio
    .filter(p => p.length > 0)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ') || 'Sin descripción'

  return { monto, comercio, medioPago }
}

function autoCategoria(comercio: string): string {
  const lower = comercio.toLowerCase()
  const keywords: Record<string, string[]> = {
    'Supermercado':    ['disco', 'carrefour', 'jumbo', 'coto', 'dia', 'vea', 'walmart', 'super', 'mercado'],
    'Restaurantes':    ['mcdonalds', 'burger', 'pizza', 'sushi', 'resto', 'cafe', 'bar', 'rappi', 'pedidos', 'glovo', 'delivery'],
    'Transporte':      ['uber', 'cabify', 'taxi', 'remis', 'peaje', 'ypf', 'shell', 'nafta', 'sube', 'subte'],
    'Salud':           ['farmacia', 'farmacity', 'clinica', 'hospital', 'doctor', 'medico'],
    'Entretenimiento': ['netflix', 'spotify', 'hbo', 'disney', 'amazon', 'cine', 'teatro'],
    'Servicios':       ['edesur', 'edenor', 'metrogas', 'telecom', 'personal', 'claro', 'movistar'],
    'Ropa':            ['zara', 'hm', 'adidas', 'nike', 'ropa', 'zapatilla', 'indumentaria'],
  }
  for (const [cat, kws] of Object.entries(keywords)) {
    if (kws.some(k => lower.includes(k))) return cat
  }
  return 'Otros'
}

// ─── WEBHOOK HANDLER ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const from     = formData.get('From') as string
  const body     = ((formData.get('Body') as string) || '').trim()

  if (!from || !body) {
    return twimlResponse('No pude procesar tu mensaje.')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Buscar usuario por número de WhatsApp
  const phoneClean = from.replace('whatsapp:', '').trim()
  console.log('DEBUG phoneClean:', JSON.stringify(phoneClean))
  console.log('DEBUG from:', JSON.stringify(from))
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('whatsapp_number', phoneClean)
    .single()

  if (!profile) {
    return twimlResponse(
      '👋 No encontré tu cuenta en Ahorrapp.\n\n' +
      'Registrate en https://ahorrapp-delta.vercel.app y agregá tu número de WhatsApp en el perfil.'
    )
  }

  const userId = profile.id

  // ─── ¿Es una confirmación? ────────────────────────────────
  if (/^(si|sí|yes|ok|1)\s*$/i.test(body)) {
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!session) {
      return twimlResponse('⏱️ No hay ningún gasto pendiente de confirmar. Escribí un gasto nuevo.')
    }

    const pending = session.pending_data as {
      monto: number
      comercio: string
      categoria: string
      categoryId: string | null
      medioPago: string | null
    }

    const hoy = new Date().toISOString().split('T')[0]
    await supabase.from('transactions').insert({
      user_id:           userId,
      amount:            pending.monto,
      merchant:          pending.comercio,
      category_id:       pending.categoryId,
      payment_method_id: null,
      date:              hoy,
      source:            'whatsapp',
      notes:             null,
      raw_email_id:      null,
    })

    await supabase.from('whatsapp_sessions').delete().eq('id', session.id)

    const mes = hoy.substring(0, 7)
    let alertaMsg = ''
    if (pending.categoryId) {
      const { data: budget } = await supabase
        .from('budgets')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', pending.categoryId)
        .eq('active', true)
        .single()

      if (budget) {
        const inicioMes = `${mes}-01`
        const finMes = new Date(
          new Date(inicioMes).getFullYear(),
          new Date(inicioMes).getMonth() + 1,
          0
        ).toISOString().split('T')[0]

        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('category_id', pending.categoryId)
          .gte('date', inicioMes)
          .lte('date', finMes)

        const gastado = (txs || []).reduce((a, t) => a + Number(t.amount), 0)
        const pct = Math.round(gastado / Number(budget.amount) * 100)

        if (pct >= 100) {
          alertaMsg = `\n\n⚠️ Superaste el presupuesto de ${pending.categoria} (${pct}% usado).`
        } else if (pct >= 90) {
          alertaMsg = `\n\n⚠️ Estás cerca del límite en ${pending.categoria} (${pct}% usado).`
        }
      }
    }

    const montoFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(pending.monto)
    return twimlResponse(`✅ ¡Registrado!\n$${montoFmt} en ${pending.comercio}${alertaMsg}`)
  }

  // ─── ¿Es una cancelación? ────────────────────────────────
  if (/^(no|cancelar|cancel|2)\s*$/i.test(body)) {
    await supabase.from('whatsapp_sessions').delete().eq('user_id', userId)
    return twimlResponse('❌ Gasto cancelado.')
  }

  // ─── Parsear nuevo gasto ──────────────────────────────────
  const parsed = parsearMensaje(body)

  if (!parsed) {
    return twimlResponse(
      '🤔 No pude detectar el monto.\n\n' +
      'Escribí así:\n"Pizza 1500"\n"Uber $850"\n"Farmacia 2300 Galicia"'
    )
  }

  const catName = autoCategoria(parsed.comercio)
  const { data: catRow } = await supabase
    .from('categories')
    .select('id')
    .eq('name', catName)
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .limit(1)
    .single()

  const categoryId = catRow?.id || null

  await supabase.from('whatsapp_sessions').delete().eq('user_id', userId)
  await supabase.from('whatsapp_sessions').insert({
    user_id:      userId,
    phone_number: phoneClean,
    pending_data: {
      monto:      parsed.monto,
      comercio:   parsed.comercio,
      categoria:  catName,
      categoryId: categoryId,
      medioPago:  parsed.medioPago,
    },
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  const montoFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(parsed.monto)
  let msg = `📝 *Gasto detectado*\n`
  msg += `💰 $${montoFmt}\n`
  msg += `🏪 ${parsed.comercio}\n`
  msg += `📂 ${catName}\n`
  if (parsed.medioPago) msg += `💳 ${parsed.medioPago}\n`
  msg += `\nRespondé *SI* para confirmar o *NO* para cancelar.`

  return twimlResponse(msg)
}