'use client'
 
// =============================================================
// AHORRAPP — src/app/auth/onboarding/page.tsx
// Onboarding de 3 pasos. Solo se muestra una vez.
// Paso 1: Nombre y zona horaria
// Paso 2: Conectar Gmail + número WhatsApp
// Paso 3: Agregar tarjetas/cuentas
// Cada paso se guarda en Supabase antes de avanzar.
// =============================================================
 
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Card, cn } from '@/components/ui'
 
const TOTAL_STEPS = 3
 
export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()
 
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
 
  // Paso 1
  const [fullName, setFullName] = useState('')
 
  // Paso 2
  const [gmailConnected, setGmailConnected] = useState(false)
  const [wpNumber, setWpNumber]             = useState('')
  const [wpSaved, setWpSaved]               = useState(false)
 
  // Paso 3
  const [cards, setCards] = useState<{ name: string; last4: string; bank: string }[]>([])
  const [cardName, setCardName] = useState('')
  const [cardLast4, setCardLast4] = useState('')
  const [cardBank, setCardBank]   = useState('Santander')
 
  // ─── HANDLERS ────────────────────────────────────────────
 
  async function connectGmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding&step=2`,
        scopes:     'https://www.googleapis.com/auth/gmail.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) setError(error.message)
    setLoading(false)
    setGmailConnected(true) // en producción esto se setea desde el callback
  }
 
  async function saveWhatsApp() {
    if (!wpNumber || wpNumber.replace(/\D/g, '').length < 8) {
      setError('Ingresá un número válido')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
 
    const fullPhone = '+54' + wpNumber.replace(/\D/g, '')
    const { error } = await supabase
      .from('profiles')
      .update({ whatsapp_number: fullPhone })
      .eq('id', user.id)
 
    setLoading(false)
    if (error) { setError(error.message); return }
    setWpSaved(true)
    setError('')
  }
 
  function addCard() {
    if (!cardName || !cardLast4) return
    setCards(prev => [...prev, { name: cardName, last4: cardLast4, bank: cardBank }])
    setCardName(''); setCardLast4('')
  }
 
  async function finish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
 
    // Guardar tarjetas en payment_methods
    if (cards.length > 0) {
      await supabase.from('payment_methods').insert(
        cards.map((c, i) => ({
          user_id: user.id,
          name: c.name,
          last_four: c.last4,
          bank: c.bank || null,
          email_origin: null,
          is_default: i === 0,
          color: 'cat-transporte',
        }))
      )
    }
 
    // Marcar onboarding como completado
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
 
    router.push('/dashboard')
  }
 
  async function saveStep1() {
    if (!fullName.trim()) { setError('Ingresá tu nombre'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
    }
    setLoading(false)
    setError('')
    setStep(2)
  }
 
  // ─── RENDER ──────────────────────────────────────────────
 
  return (
    <main className="min-h-screen bg-base-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-5 animate-fade-in">
 
        {/* Steps indicator */}
        <div className="flex gap-1.5 justify-center">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                i + 1 === step ? 'w-5 bg-brand' : i + 1 < step ? 'w-2 bg-brand/40' : 'w-2 bg-white/10',
              )}
            />
          ))}
        </div>
 
        {/* ── PASO 1: NOMBRE ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <div>
              <h1 className="text-xl font-bold">¡Bienvenido/a!</h1>
              <p className="text-sm text-zinc-500 mt-1">Primero, ¿cómo te llamás?</p>
            </div>
            <Input
              label="Tu nombre"
              placeholder="Mariana García"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveStep1()}
              autoFocus
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button onClick={saveStep1} loading={loading}>
              Continuar
            </Button>
          </div>
        )}
 
        {/* ── PASO 2: FUENTES ── */}
        {step === 2 && (
          <div className="flex flex-col gap-3 animate-slide-up">
            <div>
              <h1 className="text-xl font-bold">Conectá tus fuentes</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Ahorrapp detecta tus gastos automáticamente.
              </p>
            </div>
 
            {/* Gmail */}
            <Card className={cn(gmailConnected && 'border-success/30')}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-lg flex-shrink-0">
                  ✉
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Gmail</p>
                  <p className="text-xs text-zinc-500">Santander · Galicia · Mercado Pago</p>
                </div>
                {gmailConnected ? (
                  <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center text-[10px] flex-shrink-0">
                    ✓
                  </div>
                ) : (
                  <button
                    onClick={connectGmail}
                    className="text-xs text-brand hover:text-brand-light transition-colors flex-shrink-0"
                  >
                    Conectar
                  </button>
                )}
              </div>
            </Card>
 
            {/* WhatsApp — card con badge flotante */}
            <div className="relative mt-1.5">
              {/* Badge "Recomendado" flotante en esquina superior derecha */}
              <span className="absolute -top-2.5 right-3 z-10 bg-brand text-white text-[9px] font-semibold px-2.5 py-0.5 rounded-full">
                Recomendado
              </span>
 
              <Card accent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-whatsapp/10 flex items-center justify-center text-lg flex-shrink-0">
                    💬
                  </div>
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-zinc-500">
                      Dictale gastos en lenguaje natural desde tu celular
                    </p>
                  </div>
                </div>
 
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    Tu número de WhatsApp
                  </p>
                  <div className="flex gap-2">
                    <div className="bg-base-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-500 flex-shrink-0 flex items-center">
                      🇦🇷 +54
                    </div>
                    <input
                      type="tel"
                      placeholder="9 11 ···· ····"
                      value={wpNumber}
                      onChange={e => setWpNumber(e.target.value)}
                      disabled={wpSaved}
                      className="flex-1 min-w-0 bg-base-900 border border-brand/30 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/60 disabled:opacity-50"
                    />
                  </div>
                  {wpSaved ? (
                    <div className="flex items-center gap-1.5 text-xs text-success">
                      <span>✓</span> Número guardado
                    </div>
                  ) : (
                    <Button
                      onClick={saveWhatsApp}
                      loading={loading}
                      size="sm"
                    >
                      Guardar número
                    </Button>
                  )}
                </div>
              </Card>
            </div>
 
            {error && <p className="text-xs text-danger">{error}</p>}
 
            <Button onClick={() => { setError(''); setStep(3) }}>
              Continuar
            </Button>
            <button
              onClick={() => { setError(''); setStep(3) }}
              className="text-xs text-zinc-600 text-center hover:text-zinc-400 transition-colors"
            >
              Configurar después
            </button>
          </div>
        )}
 
        {/* ── PASO 3: TARJETAS ── */}
        {step === 3 && (
          <div className="flex flex-col gap-3 animate-slide-up">
            <div>
              <h1 className="text-xl font-bold">Tus tarjetas</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Agregá tus tarjetas para clasificar gastos automáticamente.
              </p>
            </div>
 
            {/* Lista de tarjetas agregadas */}
            {cards.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-base-700 border border-white/[0.07] rounded-xl px-3 py-2">
                <span className="text-sm">💳</span>
                <span className="text-sm flex-1">{c.name}</span>
                <span className="text-xs text-zinc-500">···· {c.last4}</span>
                <button
                  onClick={() => setCards(prev => prev.filter((_, j) => j !== i))}
                  className="text-zinc-600 hover:text-danger text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
 
            {/* Formulario para agregar tarjeta */}
            <Card>
              <div className="flex flex-col gap-2.5">
                <p className="text-xs text-zinc-500 font-medium">Agregar tarjeta</p>
                <select
                  value={cardBank}
                  onChange={e => setCardBank(e.target.value)}
                  className="bg-base-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                >
                  {['Santander', 'Galicia', 'BBVA', 'Naranja X', 'Mercado Pago', 'HSBC', 'Macro', 'Otro'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nombre (ej: Visa Galicia)"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="bg-base-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
                />
                <input
                  type="text"
                  placeholder="Últimos 4 dígitos"
                  maxLength={4}
                  inputMode="numeric"
                  value={cardLast4}
                  onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))}
                  className="bg-base-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50"
                />
                <Button variant="secondary" size="sm" onClick={addCard}>
                  + Agregar tarjeta
                </Button>
              </div>
            </Card>
 
            <Button onClick={finish} loading={loading}>
              {cards.length > 0 ? 'Guardar y entrar a Ahorrapp' : 'Entrar a Ahorrapp'}
            </Button>
            <button
              onClick={finish}
              className="text-xs text-zinc-600 text-center hover:text-zinc-400 transition-colors"
            >
              Configurar después
            </button>
          </div>
        )}
 
      </div>
    </main>
  )
}
 