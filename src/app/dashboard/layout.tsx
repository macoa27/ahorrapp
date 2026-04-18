'use client'

// =============================================================
// AHORRAPP — src/app/dashboard/layout.tsx
// Layout del dashboard: sidebar fija + contenido principal.
// Protege la ruta — redirige al login si no hay sesión.
// =============================================================

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo, Avatar, cn } from '@/components/ui'
import type { PublicProfile } from '@/types/database'

const NAV_ITEMS = [
  { href: '/dashboard',               icon: '⊞',  label: 'Dashboard' },
  { href: '/dashboard/transacciones', icon: '↕',  label: 'Transacciones' },
  { href: '/dashboard/presupuesto',   icon: '◎',  label: 'Presupuesto' },
  { href: '/dashboard/objetivos',     icon: '🎯', label: 'Objetivos' },
  { href: '/dashboard/importar',      icon: '📤', label: 'Importar' },
]

const SOURCE_ITEMS = [
  { icon: '✉',  label: 'Gmail',     status: 'activo' },
  { icon: '💬', label: 'WhatsApp',  status: 'activo' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, whatsapp_number, whatsapp_verified, gmail_connected, onboarding_completed, timezone, currency, created_at, updated_at')
        .eq('id', user.id)
        .single()

      if (data && !data.onboarding_completed) {
        router.push('/auth/onboarding'); return
      }

      setProfile(data)
      setLoading(false)
    }
    checkAuth()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-base-900">

      {/* ── SIDEBAR ── */}
      <aside className="w-48 bg-base-800 border-r border-white/[0.05] flex flex-col gap-1 p-3 flex-shrink-0">

        {/* Logo */}
        <div className="px-2 py-1 mb-2">
          <Logo size="sm" />
        </div>

        {/* Nav principal */}
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors duration-150',
                pathname === item.href
                  ? 'bg-brand/10 text-brand'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300',
              )}
            >
              <span className="text-sm w-4 text-center">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Separador */}
        <div className="h-px bg-white/[0.05] my-1" />

        {/* Fuentes conectadas */}
        <div className="flex flex-col gap-0.5">
          {SOURCE_ITEMS.map(src => (
            <div key={src.label} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-600">
              <span className="text-sm w-4 text-center">{src.icon}</span>
              {src.label}
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Usuario */}
        <div className="mt-auto">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.03]">
            <Avatar name={profile?.full_name || profile?.email || 'U'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400 truncate">
                {profile?.full_name?.split(' ')[0] || 'Usuario'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
              title="Salir"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 p-5 overflow-auto">
        {children}
      </main>

    </div>
  )
}