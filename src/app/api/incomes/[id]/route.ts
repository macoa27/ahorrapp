import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { monthFirstDay, parseYearMonth } from '@/lib/dates'

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { amount, label, month, recurring } = body

  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }
  if (!label?.trim()) {
    return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
  }

  const monthStr = typeof month === 'string' ? month : ''
  if (!parseYearMonth(monthStr)) {
    return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })
  }
  const monthFirst = monthFirstDay(monthStr)
  if (!monthFirst) {
    return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('incomes')
    .update({ amount: n, label: label.trim(), month: monthFirst, recurring: Boolean(recurring) })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })

  return NextResponse.json({ income: data })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}