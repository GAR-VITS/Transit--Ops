import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import { driverService } from '../../services/driverService'
import api from '../../services/api'

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h8A1.5 1.5 0 0 1 14 6.5V16H3V6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 9h3.6a1.5 1.5 0 0 1 1.24.66L21 12.9V16h-7V9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IdCardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="11" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 17c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="14" y1="9" x2="19" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="14" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12.5l2.5 2.5 5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2l7 4v5c0 5.25-3.5 8.25-7 10-3.5-1.75-7-4.75-7-10V6l7-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const LICENSE_CATEGORIES = ['LMV', 'HMV', 'MCWG', 'Trailer'] as const

const STEPS = [
  { key: 'photo', label: 'Photo', icon: CameraIcon, desc: 'Upload your profile photo' },
  { key: 'license', label: 'License', icon: IdCardIcon, desc: 'Enter license details' },
  { key: 'review', label: 'Review', icon: CheckCircleIcon, desc: 'Confirm & submit' },
] as const

const highlights = [
  { icon: ShieldIcon, title: 'Verified Identity', desc: 'Your profile helps dispatch teams identify and assign you to trips.' },
  { icon: IdCardIcon, title: 'License on File', desc: 'Keep your license info current for compliance and safety audits.' },
  { icon: CameraIcon, title: 'Quick Recognition', desc: 'Your photo appears on trip manifests and vehicle assignments.' },
]

/* ------------------------------------------------------------------ */
/* Brand Panel                                                         */
/* ------------------------------------------------------------------ */

function BrandPanel({ step }: { step: number }) {
  return (
    <aside className="relative hidden overflow-hidden bg-navy-900 md:flex md:w-[42%] md:flex-col">
      {/* gradient backdrop */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 22%, rgba(20,184,166,0.28) 0, transparent 42%), radial-gradient(circle at 82% 78%, rgba(58,100,151,0.4) 0, transparent 46%)',
        }}
        aria-hidden="true"
      />
      {/* grid */}
      <svg className="absolute inset-0 h-full w-full text-white/[0.07]" aria-hidden="true">
        <defs>
          <pattern id="onboard-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#onboard-grid)" />
      </svg>

      {/* decorative route line */}
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
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpeg" alt="Logo" className="h-10 w-10 rounded-xl object-cover bg-white" />
          <div className="leading-tight">
            <p className="font-mono text-[15px] font-bold tracking-tight text-white ml-2">TransitOps</p>
            <p className="text-[11px] text-navy-100/70">Smart Transport Operations</p>
          </div>
        </div>

        {/* Headline */}
        <div className="max-w-[19rem]">
          <h2 className="text-[30px] font-bold leading-[1.15] tracking-tight text-white lg:text-[34px]">
            One last step before the road.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-navy-100/80">
            Complete your driver profile so dispatch teams can identify, assign, and manage your trips seamlessly.
          </p>
        </div>

        {/* Info cards */}
        <div className="space-y-3 border-t border-white/10 pt-6">
          {highlights.map((h, i) => (
            <div
              key={h.title}
              className={`flex items-start gap-3 rounded-xl border border-white/[0.06] p-3.5 transition-all duration-500 ${
                i === step
                  ? 'bg-white/[0.08] shadow-lg shadow-black/10'
                  : 'bg-white/[0.03]'
              }`}
            >
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-500 ${
                i === step ? 'bg-teal-500 text-navy-950' : 'bg-white/10 text-white/60'
              }`}>
                <h.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-white">{h.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-navy-100/60">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function DriverOnboarding() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseCategory, setLicenseCategory] = useState<string>(LICENSE_CATEGORIES[0])
  const [licenseExpiry, setLicenseExpiry] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  /* ---- Photo handling ---- */
  function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPhotoPreview(result)
      setPhotoBase64(result)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  /* ---- Validation ---- */
  function canAdvance() {
    if (step === 0) return !!photoBase64
    if (step === 1) return licenseNumber.trim().length >= 5 && licenseExpiry !== ''
    return true
  }

  /* ---- Submit ---- */
  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await driverService.onboard({
        licenseNumber: licenseNumber.trim(),
        licenseCategory,
        licenseExpiry,
        photoData: photoBase64,
      })
      // Refresh user data
      const res = await api.get('/auth/me')
      const token = localStorage.getItem('token')!
      login(token, res.data.user)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-navy-50 font-sans text-navy-950">
      <BrandPanel step={step} />

      {/* form side */}
      <main className="flex flex-1 items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[440px]">
          {/* mobile brand */}
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <img src="/logo.jpeg" alt="Logo" className="h-10 w-10 rounded-xl object-cover bg-white" />
            <div className="leading-tight">
              <p className="font-mono text-[15px] font-bold text-navy-900 ml-2">TransitOps</p>
              <p className="text-[11px] text-slate-500">Driver Onboarding</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 pb-8 shadow-xl shadow-navy-900/[0.07] sm:p-8 sm:pb-10">
            {/* Step progress bar */}
            <div className="mb-7 flex items-center gap-0">
              {STEPS.map((s, i) => {
                const done = i < step
                const active = i === step
                return (
                  <div key={s.key} className="flex flex-1 items-center">
                    <div className="flex flex-1 flex-col items-center">
                      <div className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold transition-all duration-300 ${
                        done
                          ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                          : active
                            ? 'bg-navy-900 text-white shadow-md shadow-navy-900/25'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {done ? (
                          <CheckCircleIcon className="h-[18px] w-[18px]" />
                        ) : (
                          <s.icon className="h-[18px] w-[18px]" />
                        )}
                      </div>
                      <span className={`mt-1.5 text-[11px] font-semibold transition-colors ${
                        active ? 'text-navy-900' : done ? 'text-teal-600' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="mb-5 h-0.5 w-full min-w-[24px] max-w-[48px]">
                        <div className={`h-full rounded-full transition-colors duration-500 ${done ? 'bg-teal-400' : 'bg-slate-200'}`} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Header */}
            <div className="mb-5">
              <h1 className="text-[22px] font-bold tracking-tight text-navy-950">
                {step === 0 && 'Upload your photo'}
                {step === 1 && 'License information'}
                {step === 2 && 'Review & confirm'}
              </h1>
              <p className="mt-1 text-[13.5px] text-slate-500">
                {STEPS[step].desc}
              </p>
            </div>

            {/* ---- Step 0: Photo ---- */}
            {step === 0 && (
              <div className="animate-fade-in">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
                    dragOver
                      ? 'border-teal-500 bg-teal-50/60 scale-[1.01]'
                      : photoPreview
                        ? 'border-teal-400 bg-teal-50/30'
                        : 'border-slate-300 bg-slate-50 hover:border-navy-300 hover:bg-navy-50/50'
                  } ${photoPreview ? 'p-4' : 'px-6 py-12'}`}
                >
                  {photoPreview ? (
                    <div className="flex w-full items-center gap-4">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                      />
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-navy-900">Photo uploaded ✓</p>
                        <p className="mt-0.5 text-[12px] text-slate-500">Click or drop a new image to replace</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPhotoPreview(null)
                            setPhotoBase64(null)
                          }}
                          className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 ring-1 ring-inset ring-red-200 transition hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-100/60 text-navy-400 transition group-hover:bg-navy-900 group-hover:text-white group-hover:shadow-lg group-hover:shadow-navy-900/20">
                        <UploadIcon className="h-6 w-6" />
                      </div>
                      <p className="mt-4 text-[14px] font-semibold text-navy-900">
                        Drop your photo here, or <span className="text-teal-600">browse</span>
                      </p>
                      <p className="mt-1 text-[12px] text-slate-400">JPG, PNG or WebP — max 5 MB</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
            )}

            {/* ---- Step 1: License Details ---- */}
            {step === 1 && (
              <div className="animate-fade-in flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="licenseNumber" className="text-[13px] font-medium text-navy-900">
                    License Number
                  </label>
                  <input
                    id="licenseNumber"
                    type="text"
                    placeholder="e.g. DL-0420110149646"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="licenseCategory" className="text-[13px] font-medium text-navy-900">
                    License Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {LICENSE_CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setLicenseCategory(c)}
                        className={`h-10 rounded-lg border text-[13px] font-semibold transition ${
                          licenseCategory === c
                            ? 'border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-500/20'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="licenseExpiry" className="text-[13px] font-medium text-navy-900">
                    License Expiry Date
                  </label>
                  <input
                    id="licenseExpiry"
                    type="date"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[14px] text-navy-950 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
                  />
                </div>
              </div>
            )}

            {/* ---- Step 2: Review ---- */}
            {step === 2 && (
              <div className="animate-fade-in space-y-4">
                {/* Profile card */}
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-navy-50 to-slate-50 p-4">
                  {photoPreview && (
                    <img src={photoPreview} alt="Your photo" className="h-16 w-16 rounded-xl object-cover ring-2 ring-white shadow-md" />
                  )}
                  <div>
                    <p className="text-[15px] font-bold text-navy-950">{user?.name}</p>
                    <p className="text-[12px] text-slate-500">{user?.email}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10.5px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-500/20">
                      <TruckIcon className="h-3 w-3" /> Driver
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">License No.</p>
                    <p className="mt-1 text-[14px] font-bold tabular-nums text-navy-900">{licenseNumber}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Category</p>
                    <p className="mt-1">
                      <span className="inline-flex rounded-md bg-navy-100 px-2 py-0.5 text-[13px] font-bold text-navy-800">{licenseCategory}</span>
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Expiry Date</p>
                    <p className="mt-1 text-[14px] font-bold text-navy-900">
                      {licenseExpiry
                        ? new Date(licenseExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] font-medium text-red-700">
                <AlertIcon className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="h-11 rounded-lg border border-slate-300 px-5 text-[13.5px] font-semibold text-navy-900 transition hover:bg-slate-50 hover:border-slate-400"
                >
                  ← Back
                </button>
              ) : <div />}

              {step < 2 ? (
                <button
                  type="button"
                  disabled={!canAdvance()}
                  onClick={() => { setError(null); setStep(step + 1) }}
                  className="h-11 rounded-lg bg-navy-900 px-6 text-[13.5px] font-semibold text-white shadow-lg shadow-navy-900/20 transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="h-11 rounded-lg bg-teal-600 px-7 text-[13.5px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Submitting…
                    </span>
                  ) : (
                    'Complete Onboarding'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11.5px] text-slate-400">
            © 2026 TransitOps · Fleet Management Platform
          </p>
        </div>
      </main>
    </div>
  )
}
