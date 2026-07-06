'use client'
import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type LoginTab = 'client' | 'admin'
type Step = 'credentials' | 'mpin' | 'set-mpin' | 'forgot-mpin' | 'reset-mpin' | 'forgot'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `${local}***@${domain}`
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 5))}@${domain}`
}

function redirectForRole(role: string) {
  if (role === 'master_admin') return '/master-admin'
  if (role === 'admin') return '/admin'
  return '/dashboard'
}

const EMAIL_DOMAIN = '@arihantcapital.com'

const TAB_CONFIG: Record<LoginTab, {
  label: string
  expectedRoles: string[]
  accent: string
  ring: string
  btn: string
  activeBg: string
  activeText: string
  icon: React.ReactNode
}> = {
  client: {
    label: 'Client Login',
    expectedRoles: ['user'],
    accent: 'teal',
    ring: 'focus:ring-brand-500',
    btn: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
    activeBg: 'bg-brand-50',
    activeText: 'text-brand-700 border-brand-600',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  admin: {
    label: 'Admin Login',
    expectedRoles: ['admin', 'master_admin'],
    accent: 'indigo',
    ring: 'focus:ring-brand-500',
    btn: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
    activeBg: 'bg-brand-50',
    activeText: 'text-brand-700 border-brand-600',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
}

// 6-box digit input — masked prop hides digits (for MPIN), unmasked shows them (for OTP)
function PinBoxes({ value, onChange, ring, masked = false }: { value: string; onChange: (v: string) => void; ring: string; masked?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1))
      } else if (i > 0) {
        refs.current[i - 1]?.focus()
        onChange(value.slice(0, i - 1) + value.slice(i))
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.focus()
    }
  }

  function handleInput(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    if (!digit) return
    const next = value.slice(0, i) + digit + value.slice(i + 1)
    onChange(next.slice(0, 6))
    if (i < 5) refs.current[i + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      onChange(pasted)
      refs.current[Math.min(pasted.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div className="flex gap-1 sm:gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type={masked ? 'password' : 'text'}
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          autoComplete="off"
          className={`w-8 sm:w-11 h-11 sm:h-[3.25rem] text-center text-lg sm:text-xl font-mono font-bold border-2 rounded-xl focus:outline-none focus:ring-2 ${ring} transition-all ${
            value[i] ? 'border-current bg-gray-50 text-gray-900' : 'border-gray-200 bg-white text-gray-400'
          }`}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const submittingRef = useRef(false)
  const [activeTab, setActiveTab] = useState<LoginTab>('client')
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mpin, setMpin] = useState('')
  const [mpinConfirm, setMpinConfirm] = useState('')
  const [resetOtp, setResetOtp] = useState('')
  const [resetMpin, setResetMpin] = useState('')
  const [resetMpinConfirm, setResetMpinConfirm] = useState('')
  const [resetOtpSent, setResetOtpSent] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotResetUrl, setForgotResetUrl] = useState('')

  function switchTab(tab: LoginTab) {
    setActiveTab(tab)
    setEmail('')
    setPassword('')
    setMpin('')
    setMpinConfirm('')
    setResetOtp('')
    setResetMpin('')
    setResetMpinConfirm('')
    setResetOtpSent(false)
    setDevOtp('')
    setError('')
    setStep('credentials')
    setShowPassword(false)
    setForgotSent(false)
    setForgotEmail('')
    setForgotResetUrl('')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
    setForgotSent(true)
    if (data.resetUrl) setForgotResetUrl(data.resetUrl)
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setError('')
    setLoading(true)

    try {
      const fullEmail = email.includes('@') ? email : email + EMAIL_DOMAIN
      const result = await signIn('credentials', { email: fullEmail, password, redirect: false })
      if (result?.error) {
        const msg = result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error
        setError(msg)
        setLoading(false)
        return
      }

      const session = await fetch('/api/auth/session').then((r) => r.json())
      const role: string = session?.user?.role ?? 'user'
      if (!TAB_CONFIG[activeTab].expectedRoles.includes(role)) {
        setError('This account does not have access to this login')
        setLoading(false)
        return
      }

      setEmail(fullEmail)

      // Check if MPIN is set → go to enter-mpin or set-mpin
      const statusRes = await fetch('/api/auth/mpin-status')
      const statusData = await statusRes.json()
      setLoading(false)

      setMpin('')
      setMpinConfirm('')
      setStep(statusData.mpinSet ? 'mpin' : 'set-mpin')
    } finally {
      submittingRef.current = false
    }
  }

  async function handleVerifyMpin(e: React.FormEvent) {
    e.preventDefault()
    if (mpin.length < 6) return
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/verify-mpin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mpin }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Incorrect MPIN'); return }

    const s = await fetch('/api/auth/session').then((r) => r.json())
    router.push(redirectForRole(s?.user?.role ?? 'user'))
  }

  async function handleSetMpin(e: React.FormEvent) {
    e.preventDefault()
    if (mpin.length < 6) return
    if (mpin !== mpinConfirm) { setError('MPINs do not match'); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/set-mpin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mpin }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to set MPIN'); return }

    const s = await fetch('/api/auth/session').then((r) => r.json())
    router.push(redirectForRole(s?.user?.role ?? 'user'))
  }

  async function handleSendResetOtp() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/forgot-mpin', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to send OTP'); return }
    setResetOtpSent(true)
    setResetOtp('')
    setResetMpin('')
    setResetMpinConfirm('')
    if (data.otp) setDevOtp(data.otp)
  }

  async function handleResetMpin(e: React.FormEvent) {
    e.preventDefault()
    if (resetOtp.length < 6 || resetMpin.length < 6) return
    if (resetMpin !== resetMpinConfirm) { setError('MPINs do not match'); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/reset-mpin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: resetOtp, mpin: resetMpin }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to reset MPIN'); return }

    const s = await fetch('/api/auth/session').then((r) => r.json())
    router.push(redirectForRole(s?.user?.role ?? 'user'))
  }

  const cfg = TAB_CONFIG[activeTab]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-brand-100 p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-6">
          <h2 className="text-base font-semibold text-gray-700">Arihant Capital Markets</h2>
          <p className="text-xs text-gray-400 mt-0.5">Research Servicing Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            {(Object.keys(TAB_CONFIG) as LoginTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === tab
                    ? `${TAB_CONFIG[tab].activeBg} ${TAB_CONFIG[tab].activeText}`
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {TAB_CONFIG[tab].icon}
                {TAB_CONFIG[tab].label}
              </button>
            ))}
          </div>

          <div className="p-7">
            {/* Step header */}
            <div className="text-center mb-6">
              {step === 'mpin' ? (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 mb-3">
                    <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">Enter your MPIN</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Signed in as <span className="font-medium text-gray-700">{maskEmail(email)}</span>
                  </p>
                </>
              ) : step === 'set-mpin' ? (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mb-3">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">Set your MPIN</h1>
                  <p className="text-sm text-gray-500 mt-1">Create a 6-digit PIN for quick login</p>
                </>
              ) : step === 'forgot-mpin' ? (
                <>
                  <h1 className="text-lg font-bold text-gray-900">Reset MPIN</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {resetOtpSent
                      ? 'Enter the OTP sent to your email, then set a new MPIN'
                      : `We'll send an OTP to ${maskEmail(email)}`}
                  </p>
                </>
              ) : step === 'reset-mpin' ? (
                <>
                  <h1 className="text-lg font-bold text-gray-900">New MPIN</h1>
                  <p className="text-sm text-gray-500 mt-1">OTP verified — set your new 6-digit MPIN</p>
                </>
              ) : step === 'forgot' ? (
                <>
                  <h1 className="text-lg font-bold text-gray-900">Reset password</h1>
                  <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset link</p>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-bold text-gray-900">Welcome back</h1>
                  <p className="text-sm text-gray-500 mt-1">Sign in to your {activeTab === 'admin' ? 'admin ' : ''}account</p>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Credentials step */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <div className={`flex items-center border border-gray-200 rounded-xl focus-within:ring-2 ${cfg.ring} focus-within:border-transparent overflow-hidden bg-gray-50`}>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.replace(/@.*/, ''))}
                      required
                      autoFocus
                      className="flex-1 px-4 py-2.5 bg-transparent focus:outline-none text-gray-900 placeholder:text-gray-400 min-w-0"
                      placeholder="username"
                    />
                    <span className="px-3 py-2.5 text-gray-400 text-sm border-l border-gray-200 bg-gray-100 whitespace-nowrap select-none">
                      {EMAIL_DOMAIN}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(email ? email + EMAIL_DOMAIN : ''); setStep('forgot'); setError(''); setForgotSent(false); setForgotResetUrl('') }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 ${cfg.ring} focus:border-transparent text-gray-900 placeholder:text-gray-400`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-600"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full mt-1 ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Spinner />Signing in…</span>
                    : 'Sign In'}
                </button>
              </form>
            )}

            {/* Enter MPIN step */}
            {step === 'mpin' && (
              <form onSubmit={handleVerifyMpin} className="space-y-5">
                <PinBoxes value={mpin} onChange={setMpin} ring={cfg.ring} masked />

                <button
                  type="submit"
                  disabled={loading || mpin.length < 6}
                  className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Spinner />Verifying…</span>
                    : 'Confirm'}
                </button>

                <div className="flex items-center justify-between text-sm pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setMpin(''); setError('') }}
                    className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('forgot-mpin'); setResetOtpSent(false); setError(''); setDevOtp('') }}
                    className="text-gray-400 hover:text-gray-600 font-medium transition-colors"
                  >
                    Forgot MPIN?
                  </button>
                </div>
              </form>
            )}

            {/* Set MPIN step (first time) */}
            {step === 'set-mpin' && (
              <form onSubmit={handleSetMpin} className="space-y-5">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Enter MPIN</p>
                  <PinBoxes value={mpin} onChange={setMpin} ring={cfg.ring} masked />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Confirm MPIN</p>
                  <PinBoxes value={mpinConfirm} onChange={setMpinConfirm} ring={cfg.ring} masked />
                </div>

                <button
                  type="submit"
                  disabled={loading || mpin.length < 6 || mpinConfirm.length < 6}
                  className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Spinner />Saving…</span>
                    : 'Set MPIN & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setMpin(''); setMpinConfirm(''); setError('') }}
                  className="flex items-center justify-center gap-1 w-full text-gray-400 hover:text-gray-600 text-sm transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </form>
            )}

            {/* Forgot MPIN step */}
            {step === 'forgot-mpin' && (
              <div className="space-y-5">
                {!resetOtpSent ? (
                  <>
                    <p className="text-sm text-gray-600 text-center">
                      An OTP will be sent to <span className="font-medium text-gray-800">{maskEmail(email)}</span>. Use it to reset your MPIN.
                    </p>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendResetOtp}
                      className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><Spinner />Sending…</span>
                        : 'Send OTP to Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStep('mpin'); setError('') }}
                      className="flex items-center justify-center gap-1 w-full text-gray-400 hover:text-gray-600 text-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to MPIN
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleResetMpin} className="space-y-5">
                    {devOtp && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 text-center">
                        <span className="font-semibold">Dev OTP: </span>
                        <span className="font-mono tracking-widest text-base">{devOtp}</span>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Enter OTP</p>
                      <PinBoxes value={resetOtp} onChange={setResetOtp} ring={cfg.ring} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">New MPIN</p>
                      <PinBoxes value={resetMpin} onChange={setResetMpin} ring={cfg.ring} masked />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Confirm New MPIN</p>
                      <PinBoxes value={resetMpinConfirm} onChange={setResetMpinConfirm} ring={cfg.ring} masked />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || resetOtp.length < 6 || resetMpin.length < 6 || resetMpinConfirm.length < 6}
                      className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><Spinner />Resetting…</span>
                        : 'Reset MPIN & Continue'}
                    </button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => { setStep('mpin'); setResetOtpSent(false); setDevOtp(''); setError('') }}
                        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleSendResetOtp}
                        className="text-gray-400 hover:text-gray-600 font-medium transition-colors disabled:text-gray-300"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Forgot password step */}
            {step === 'forgot' && (
              <div className="space-y-5">
                {!forgotSent ? (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 ${cfg.ring} focus:border-transparent placeholder:text-gray-400`}
                        placeholder="you@arihantcapital.com"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-sm`}
                    >
                      {loading
                        ? <span className="flex items-center justify-center gap-2"><Spinner />Sending…</span>
                        : 'Send Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStep('credentials'); setError('') }}
                      className="flex items-center justify-center gap-1 w-full text-gray-400 hover:text-gray-600 text-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to login
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-800">
                      <p className="font-semibold mb-1">Check your email</p>
                      <p>If <span className="font-medium">{forgotEmail}</span> is registered, a reset link has been sent. It expires in 1 hour.</p>
                    </div>
                    {forgotResetUrl && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                        <p className="text-amber-800 font-semibold mb-1.5">Dev mode — reset link:</p>
                        <a href={forgotResetUrl} className="text-brand-600 break-all text-xs hover:underline">{forgotResetUrl}</a>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setStep('credentials'); setForgotSent(false); setError('') }}
                      className="flex items-center justify-center gap-1 w-full text-gray-400 hover:text-gray-600 text-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to login
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          © {new Date().getFullYear()} Arihant Capital Markets Ltd.
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
