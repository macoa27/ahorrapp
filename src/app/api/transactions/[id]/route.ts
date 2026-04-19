// =============================================================
// AHORRAPP — src/app/api/transactions/[id]/route.ts
// PATCH: editar una transacción
// DELETE: eliminar una transacción
// =============================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

// ─── PATCH — editar ─────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { amount, merchant, category_id, payment_method_id, date, notes } = body

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }
  if (!merchant?.trim()) {
    return NextResponse.json({ error: 'Comercio requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({
      amount:            Number(amount),
      merchant:          merchant.trim(),
      category_id:       category_id || null,
      payment_method_id: payment_method_id || null,
      date:              date,
      notes:             notes || null,
    
    })
    .eq('id', params.id)
    .eq('user_id', user.id)   // RLS extra — garantiza que solo edita sus propias
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })

  return NextResponse.json({ transaction: data })
}

// ─── DELETE — eliminar ───────────────────────────────────────
export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)   // RLS extra

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
