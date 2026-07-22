import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { authService } from '../../services/authService';

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */



function TruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h8A1.5 1.5 0 0 1 14 6.5V16H3V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 9h3.6a1.5 1.5 0 0 1 1.24.66L21 12.9V16h-7V9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 4l16 16M9.5 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 3.9M6.3 8.2A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.94-.18 2.8-.48"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 12.5 9 17l10.5-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v5.5M12 16.2v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Field primitives                                                    */
/* ------------------------------------------------------------------ */



function Field({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  trailing,
  onBlur,
  children,
}: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-navy-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-11 w-full rounded-lg border bg-white px-3.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 ${
            trailing ? 'pr-11' : ''
          } ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/12'
              : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15'
          }`}
        />
        {trailing}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordToggle({ shown, onToggle }: any) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-navy-700"
    >
      {shown ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function passwordScore(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s // 0..5
}

function strengthLabel(score: number, len: number) {
  if (len === 0) return null
  if (len < 8 || score <= 2) return { label: 'Weak', tone: 'bg-red-500', text: 'text-red-600', bars: 1 }
  if (score === 3 || score === 4) return { label: 'Medium', tone: 'bg-amber-500', text: 'text-amber-600', bars: 2 }
  return { label: 'Strong', tone: 'bg-teal-600', text: 'text-teal-700', bars: 3 }
}



/* ------------------------------------------------------------------ */
/* Branding panel (static)                                             */
/* ------------------------------------------------------------------ */

const stats = [
  { value: '2,480', label: 'Vehicles tracked' },
  { value: '99.2%', label: 'On-time dispatch' },
  { value: '38', label: 'Active depots' },
]

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-navy-900 md:flex md:w-[42%] md:flex-col">
      {/* route map backdrop */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 22%, rgba(20,184,166,0.28) 0, transparent 42%), radial-gradient(circle at 82% 78%, rgba(58,100,151,0.4) 0, transparent 46%)',
        }}
        aria-hidden="true"
      />
      <svg className="absolute inset-0 h-full w-full text-white/[0.07]" aria-hidden="true">
        <defs>
          <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* animated-looking route line */}
      <svg viewBox="0 0 400 500" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          d="M40 430 C 120 360, 90 260, 180 230 S 320 180, 300 90"
          fill="none"
          stroke="rgba(20,184,166,0.55)"
          strokeWidth="2.5"
          strokeDasharray="7 9"
          strokeLinecap="round"
        />
        <circle cx="40" cy="430" r="6" fill="#14b8a6" />
        <circle cx="300" cy="90" r="6" fill="#f59e0b" />
        <circle cx="180" cy="230" r="4.5" fill="#dbe6f2" />
      </svg>

      <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-11">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpeg" alt="Logo" className="h-10 w-10 rounded-xl object-cover bg-white" />
          <div className="leading-tight">
            <p className="font-mono text-[15px] font-bold tracking-tight text-white ml-2">TransitOps</p>
            <p className="text-[11px] text-navy-100/70">Smart Transport Operations</p>
          </div>
        </div>

        <div className="max-w-[19rem]">
          <h2
            className="text-[30px] font-bold leading-[1.15] tracking-tight text-white lg:text-[34px]"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Move every fleet with total operational clarity.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-navy-100/80">
            Live vehicle telemetry, dispatch, and compliance — unified in one control room built for logistics teams.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-mono text-[19px] font-medium text-teal-400">{s.value}</p>
              <p className="mt-1 text-[11px] leading-snug text-navy-100/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export default function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const [mode, setMode] = useState(initialMode)
  const navigate = useNavigate()
  const { login } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loginBanner, setLoginBanner] = useState<string | null>(null)

  // shared fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // which fields have been touched (for inline errors)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }))

  const score = passwordScore(pw)
  const strength = strengthLabel(score, pw.length)

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (mode === 'signup') {
      if (!name.trim()) e.name = 'Full name is required.'
      if (!email) e.email = 'Email address is required.'
      else if (!emailRe.test(email)) e.email = 'Enter a valid email address.'
      if (!phone.trim()) e.phone = 'Phone number is required.'
      if (!pw) e.pw = 'Password is required.'
      else if (pw.length < 8) e.pw = 'Use at least 8 characters.'
      if (!confirm) e.confirm = 'Please confirm your password.'
      else if (confirm !== pw) e.confirm = 'Passwords do not match.'
      if (!terms) e.terms = 'You must accept the terms to continue.'
    } else {
      if (!email) e.email = 'Email address is required.'
      else if (!emailRe.test(email)) e.email = 'Enter a valid email address.'
      if (!pw) e.pw = 'Password is required.'
    }
    return e
  }, [mode, name, email, phone, pw, confirm, terms])

  const valid = Object.keys(errors).length === 0

  function switchMode(next: 'login' | 'signup') {
    if (next === mode) return
    setMode(next)
    setSubmitting(false)
    setTouched({})
    setLoginBanner(null)
    setPw('')
    setConfirm('')
    setShowPw(false)
    setShowConfirm(false)
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (mode === 'signup') {
      setTouched({ name: true, email: true, phone: true, pw: true, confirm: true, terms: true })
    } else {
      setTouched({ email: true, pw: true })
    }
    if (!valid || submitting) return

    setSubmitting(true)
    setLoginBanner(null)

    try {
      if (mode === 'signup') {
        const res = await authService.signup({ name, email, password: pw, phone });
        setToast(res.data?.message || 'Account created successfully! Please wait for approval.');
        setTimeout(() => {
          setToast(null);
          switchMode('login');
          setEmail(email);
        }, 3000);
      } else {
        const res = await authService.login({ email, password: pw });
        login(res.data.token, res.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setLoginBanner(err.response?.data?.error || 'An error occurred.');
    } finally {
      setSubmitting(false)
    }
  }

  const showErr = (k: string) => (touched[k] ? errors[k] : undefined)

  return (
    <div className="flex min-h-screen w-full bg-navy-50 font-sans text-navy-950">
      {/* toast */}
      {toast && (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 px-4">
          <div className="animate-toast-in flex items-center gap-2.5 rounded-xl bg-navy-900 px-4 py-3 text-white shadow-xl shadow-navy-950/25">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-500 text-navy-950">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-[13px] font-medium">{toast}</span>
          </div>
        </div>
      )}

      <BrandPanel />

      {/* form side */}
      <main className="flex flex-1 items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[420px]">
          {/* mobile brand */}
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <img src="/logo.jpeg" alt="Logo" className="h-10 w-10 rounded-xl object-cover bg-white" />
            <div className="leading-tight">
              <p className="font-mono text-[15px] font-bold text-navy-900 ml-2">TransitOps</p>
              <p className="text-[11px] text-slate-500">Smart Transport Operations Platform</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-navy-900/[0.07] sm:p-8">
            {/* tabs */}
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-navy-50 p-1">
              {(['login', 'signup']).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  aria-pressed={mode === m}
                  className={`h-9 rounded-lg text-[13.5px] font-medium transition ${
                    mode === m
                      ? 'bg-white text-navy-900 shadow-sm shadow-navy-900/10'
                      : 'text-slate-500 hover:text-navy-800'
                  }`}
                >
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <h1 className="text-[22px] font-bold tracking-tight text-navy-950">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-1 text-[13.5px] text-slate-500">
                {mode === 'login'
                  ? 'Log in to your TransitOps control room.'
                  : 'Get started with a free Employee account.'}
              </p>
            </div>

            {loginBanner && (
              <div className="animate-form-in mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] font-medium text-red-700">
                <AlertIcon className="h-4 w-4 shrink-0" />
                {loginBanner}
              </div>
            )}

            <form key={mode} onSubmit={handleSubmit} noValidate className="animate-form-in flex flex-col gap-4">
              {mode === 'signup' && (
                <Field
                  id="name"
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={setName}
                  onBlur={() => touch('name')}
                  error={showErr('name')}
                  autoComplete="name"
                />
              )}

              <Field
                id="email"
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={setEmail}
                onBlur={() => touch('email')}
                error={showErr('email')}
                autoComplete="email"
              />

              {mode === 'signup' && (
                <Field
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={setPhone}
                  onBlur={() => touch('phone')}
                  error={showErr('phone')}
                  autoComplete="tel"
                />
              )}




              <Field
                id="password"
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                value={pw}
                onChange={setPw}
                onBlur={() => touch('pw')}
                error={showErr('pw')}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                trailing={<PasswordToggle shown={showPw} onToggle={() => setShowPw((s) => !s)} />}
              >
                {mode === 'signup' && strength && (
                  <div className="mt-1 flex items-center gap-2.5">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition ${
                            i < strength.bars ? strength.tone : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`w-14 text-right text-[11.5px] font-semibold ${strength.text}`}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </Field>

              {mode === 'login' && (
                <div className="-mt-1.5 flex justify-end">
                  <button
                    type="button"
                    className="text-[12.5px] font-medium text-teal-700 transition hover:text-teal-800 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <Field
                  id="confirm"
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={setConfirm}
                  onBlur={() => touch('confirm')}
                  error={showErr('confirm')}
                  autoComplete="new-password"
                  trailing={<PasswordToggle shown={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />}
                />
              )}

              {mode === 'signup' && (
                <div>
                  <label htmlFor="terms" className="flex cursor-pointer items-start gap-2.5 select-none">
                    <span className="relative mt-0.5 flex">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={terms}
                        onChange={(e) => {
                          setTerms(e.target.checked)
                          touch('terms')
                        }}
                        className="peer sr-only"
                      />
                      <span
                        className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition peer-focus-visible:ring-4 peer-focus-visible:ring-teal-500/25 ${
                          terms
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : showErr('terms')
                              ? 'border-red-400 bg-white'
                              : 'border-slate-300 bg-white'
                        }`}
                      >
                        {terms && <CheckIcon className="h-3 w-3" />}
                      </span>
                    </span>
                    <span className="text-[12.5px] leading-snug text-slate-600">
                      I agree to the{' '}
                      <a className="font-medium text-teal-700 hover:underline" href="#">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a className="font-medium text-teal-700 hover:underline" href="#">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                  {showErr('terms') && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-red-600">
                      <AlertIcon className="h-3.5 w-3.5 shrink-0" />
                      {errors.terms}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!valid || submitting}
                className="mt-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin-slow h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : mode === 'login' ? (
                  'Log In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {mode === 'login' && (
              <div className="mt-4 w-full rounded-lg bg-navy-50 p-3.5 text-slate-500">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-navy-700">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <circle cx="8" cy="15" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                    <path
                      d="m10.2 12.8 8-8M15.5 4.5l3 3M13 7l2.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Demo Admin Access
                </p>
                <dl className="mt-2 space-y-1 text-[12px]">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-slate-400">Email</dt>
                    <dd className="font-mono text-slate-600">admin@transitops.com</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-slate-400">Password</dt>
                    <dd className="font-mono text-slate-600">Admin@123</dd>
                  </div>
                </dl>
              </div>
            )}

            <p className="mt-5 text-center text-[13px] text-slate-500">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="font-semibold text-navy-800 transition hover:text-teal-700 hover:underline"
              >
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
