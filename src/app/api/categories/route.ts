// =============================================================
// AHORRAPP — src/app/api/categories/route.ts
// GET: listar categorías del usuario (sistema + propias)
// POST: crear categoría propia
// =============================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`is_system.eq.true,user_id.eq.${user.id}`)
    .order('is_system', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, icon, color } = await request.json()

  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id:   user.id,
      name:      name.trim(),
      icon:      icon || '📦',
      color:     color || '#7c6dfa',
      is_system: false,
      sort_order: 999,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}