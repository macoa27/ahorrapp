'use client'

// =============================================================
// AHORRAPP — src/app/auth/login/page.tsx
// Pantalla de login. Flujo:
//   1. Continuar con Google (OAuth)
//   2. Email + contraseña (formulario)
//   3. Número de celular (OTP SMS vía Supabase)
// =============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Divider, Logo, cn } from '@/components/ui'

type LoginMode = 'default' | 'email' | 'phone'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode, setMode]       = useState<LoginMode>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Email form
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)

  // Phone form
  const [phone, setPhone]   = useState('')
  const [otp, setOtp]       = useState('')
  const [otpSent, setOtpSent] = useState(false)

  // ─── HANDLERS ────────────────────────────────────────────

  async function handleGoogle() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider:  'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:     'email profile https://www.googleapis.com/auth/gmail.readonly',
        // El scope de Gmail se pide aquí para usarlo en el parser de emails
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
    // Si funciona, Supabase redirige solo
  }

  async function handleEmail() {
    if (!email || !password) return
    setLoading(true)
    setError('')

    const fn = isSignup
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password })

    const { error } = await fn
    setLoading(false)

    if (error) { setError(error.message); return }
    if (isSignup) {
      setError('') // mostrar mensaje de "revisá tu email"
      // En un caso real: mostrar un toast de "Revisá tu email"
    } else {
      router.push('/onboarding')
    }
  }

  async function handleSendOtp() {
    if (!phone) return
    setLoading(true)
    setError('')
    const fullPhone = '+54' + phone.replace(/\D/g, '')
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone })
    setLoading(false)
    if (error) { setError(error.message); return }
    setOtpSent(true)
  }

  async function handleVerifyOtp() {
    if (!otp) return
    setLoading(true)
    setError('')
    const fullPhone = '+54' + phone.replace(/\D/g, '')
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type:  'sms',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/onboarding')
  }

  // ─── RENDER ──────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-base-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 animate-fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center text-2xl">
            💰
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ahorrapp</h1>
          <p className="text-sm text-zinc-500">Controlá tus gastos sin esfuerzo</p>
        </div>

        {/* Card principal */}
        <div className="w-full bg-base-700 border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4">

          {/* ── VISTA DEFAULT: Google + opciones alternativas ── */}
          {mode === 'default' && (
            <>
              <Button
                variant="google"
                onClick={handleGoogle}
                loading={loading}
              >
                <GoogleIcon />
                Continuar con Google
              </Button>

              <Divider label="o ingresá con" />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  fullWidth={false}
                  className="w-full text-xs py-2.5"
                  onClick={() => { setMode('email'); setError('') }}
                >
                  <span className="text-sm">✉</span>
                  Email
                </Button>
                <Button
                  variant="secondary"
                  fullWidth={false}
                  className="w-full text-xs py-2.5"
                  onClick={() => { setMode('phone'); setError('') }}
                >
                  <span className="text-sm">📱</span>
                  Celular
                </Button>
              </div>
            </>
          )}

          {/* ── VISTA EMAIL ── */}
          {mode === 'email' && (
            <>
              <button
                onClick={() => { setMode('default'); setError('') }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors self-start"
              >
                ← Volver
              </button>

              <h2 className="text-sm font-medium text-white">
                {isSignup ? 'Crear cuenta' : 'Ingresar con email'}
              </h2>

              <div className="flex flex-col gap-3">
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  hint={isSignup ? 'Mínimo 8 caracteres' : undefined}
                />
              </div>

              <Button onClick={handleEmail} loading={loading}>
                {isSignup ? 'Crear cuenta' : 'Ingresar'}
              </Button>

              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-xs text-zinc-500 text-center hover:text-zinc-300 transition-colors"
              >
                {isSignup
                  ? '¿Ya tenés cuenta? Ingresá'
                  : '¿No tenés cuenta? Registrate gratis'}
              </button>
            </>
          )}

          {/* ── VISTA CELULAR ── */}
          {mode === 'phone' && (
            <>
              <button
                onClick={() => { setMode('default'); setOtpSent(false); setError('') }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors self-start"
              >
                ← Volver
              </button>

              <h2 className="text-sm font-medium text-white">
                {otpSent ? 'Ingresá el código' : 'Ingresar con celular'}
              </h2>

              {!otpSent ? (
                <>
                  <Input
                    label="Número de celular"
                    type="tel"
                    placeholder="9 11 1234 5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    prefix={<span className="text-xs">🇦🇷 +54</span>}
                    hint="Sin el 0 y sin el 15"
                    autoComplete="tel"
                  />
                  <Button onClick={handleSendOtp} loading={loading}>
                    Enviar código SMS
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-500">
                    Enviamos un código al +54 {phone}
                  </p>
                  <Input
                    label="Código de 6 dígitos"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    autoComplete="one-time-code"
                  />
                  <Button onClick={handleVerifyOtp} loading={loading}>
                    Verificar código
                  </Button>
                  <button
                    onClick={() => { setOtpSent(false); setOtp('') }}
                    className="text-xs text-zinc-500 text-center hover:text-zinc-300"
                  >
                    No llegó el código · Reenviar
                  </button>
                </>
              )}
            </>
          )}

          {/* Error global */}
          {error && (
            <p className="text-xs text-danger text-center animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Términos */}
        <p className="text-[11px] text-zinc-600 text-center leading-relaxed">
          Al continuar aceptás los{' '}
          <a href="/terminos" className="text-zinc-500 hover:text-zinc-300">Términos de uso</a>
          {' '}y la{' '}
          <a href="/privacidad" className="text-zinc-500 hover:text-zinc-300">Política de privacidad</a>
        </p>
      </div>
    </main>
  )
}

// Ícono SVG de Google (no emoji — más profesional)
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}