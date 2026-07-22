import { useMemo, useState, useEffect, type ReactNode } from 'react'
import useAuth from '../../hooks/useAuth'
import { driverService } from '../../services/driverService'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import {
  SearchIcon,
  PlusIcon,
  EditIcon,
  HistoryIcon,
  XIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  RouteIcon,
  AlertIcon,
  ShieldIcon,
} from '../Dashboard/icons'
import { type RoleId } from '../Dashboard/data'
import {
  DRIVERS,
  DRIVER_STATUS_STYLES,
  DRIVER_STATUSES,
  LICENSE_CATEGORIES,
  daysToExpiry,
  licenseState,
  formatDate,
  driverTrips,
  safetyTrend,
  type Driver,
  type DriverStatus,
  type LicenseCategory,
} from './data'

const PAGE_SIZE = 8

type SortKey = 'name' | 'safety' | 'expiry'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'safety', label: 'Safety Score' },
  { key: 'expiry', label: 'License Expiry Date' },
]

type Panel = { mode: 'add' } | { mode: 'edit'; driver: Driver } | { mode: 'detail'; driver: Driver } | null

/* ---------- small pieces ---------- */

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
}

function StatusPill({ status }: { status: DriverStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${DRIVER_STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  )
}

function SafetyBadge({ score }: { score: number }) {
  const tone =
    score >= 80 ? { bar: 'bg-emerald-500', text: 'text-emerald-700' } : score >= 50 ? { bar: 'bg-amber-500', text: 'text-amber-600' } : { bar: 'bg-red-500', text: 'text-red-600' }
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
      </span>
      <span className={`w-6 text-right text-[12.5px] font-semibold tabular-nums ${tone.text}`}>{score}</span>
    </div>
  )
}

function ExpiryCell({ iso }: { iso: string }) {
  const state = licenseState(iso)
  const cls = state === 'Expired' ? 'text-red-600 font-semibold' : state === 'Expiring Soon' ? 'text-amber-600 font-semibold' : 'text-slate-600'
  return (
    <span className={`text-[13px] ${cls}`}>
      {formatDate(iso)}
      {state !== 'Valid' && <span className="ml-1 text-[11px] font-normal">({state})</span>}
    </span>
  )
}

function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-[13px] font-medium text-navy-900 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 sm:w-44"
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  )
}

/* ---------- form ---------- */

type FormState = { name: string; license: string; category: LicenseCategory; expiry: string; contact: string; safety: string; status: DriverStatus }

function FormField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  const warn = hint?.startsWith('⚠')
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-navy-900">{label}</label>
      {children}
      {hint && !error && <p className={`text-[11.5px] ${warn ? 'text-amber-600' : 'text-slate-400'}`}>{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

const inputCls = (err?: boolean) =>
  `h-11 w-full rounded-lg border bg-white px-3.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 ${
    err ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/12' : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15'
  }`

function DriverForm({
  editing,
  reduced,
  existing,
  onCancel,
  onSave,
}: {
  editing?: Driver
  reduced?: boolean // driver editing own profile → limited fields
  existing: Driver[]
  onCancel?: () => void
  onSave: (d: Driver) => Promise<void>
}) {
  const [backendError, setBackendError] = useState<string>('')
  const [form, setForm] = useState<FormState>(
    editing
      ? { name: editing.name, license: editing.license, category: editing.category, expiry: editing.expiry, contact: editing.contact, safety: String(editing.safety), status: editing.status }
      : { name: '', license: '', category: 'LMV', expiry: '', contact: '', safety: '75', status: 'Available' },
  )
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Driver's name is required."
    if (!form.license.trim()) e.license = 'License number is required.'
    else if (existing.some((d) => d.license.toLowerCase() === form.license.trim().toLowerCase() && d.id !== editing?.id)) e.license = 'This license number already exists.'
    if (!form.expiry) e.expiry = 'License expiry date is required.'
    if (!form.contact.trim()) e.contact = 'Contact number is required.'
    if (backendError) e.license = backendError
    return e
  }, [form, existing, editing, backendError])

  const expiryWarn = form.expiry && daysToExpiry(form.expiry) < 0
  const valid = Object.keys(errors).length === 0 || (Object.keys(errors).length === 1 && errors.license === backendError)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBackendError('')
    setTouched({ name: true, license: true, expiry: true, contact: true })
    if (!valid && !backendError) return // If the only error is backend error, let it try again

    try {
      await onSave({
        id: editing?.id ?? `d${Date.now()}`,
        name: form.name.trim(),
        license: form.license.trim(),
        category: form.category,
        expiry: form.expiry,
        contact: form.contact.trim(),
        safety: editing ? editing.safety : Number(form.safety) || 75,
        status: editing ? form.status : 'Available',
        self: editing?.self,
      })
    } catch (err: any) {
      if (err.response?.data?.error === "License number already exists.") {
        setBackendError("⚠️ This license number is already registered")
      } else {
        alert("Failed to save driver: " + (err.response?.data?.error || err.message))
      }
    }
  }

  const err = (k: string) => (touched[k] ? errors[k] : undefined)

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="text-[18px] font-bold text-navy-950">{editing ? (reduced ? 'Edit My Profile' : 'Edit Driver') : 'Register Driver'}</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {reduced ? 'Update your personal & license details.' : editing ? `Updating ${editing.name}` : 'Add a new driver profile.'}
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
            <XIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <FormField label="Name" error={err('name')}>
          <input readOnly={reduced} className={`${inputCls(!!err('name'))} ${reduced ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`} placeholder="Enter driver's full name" value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} />
        </FormField>

        <FormField label="License Number" error={err('license')}>
          <input readOnly={reduced} className={`${inputCls(!!err('license'))} ${reduced ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`} placeholder="e.g., DL-0420110149646" value={form.license} onChange={(e) => set('license', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, license: true }))} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="License Category">
            <div className="relative">
              <select disabled={reduced} value={form.category} onChange={(e) => set('category', e.target.value)} className={`h-11 w-full appearance-none rounded-lg border border-slate-300 px-3.5 pr-9 text-[14px] outline-none transition ${reduced ? 'cursor-not-allowed bg-slate-50 text-slate-500' : 'bg-white text-navy-950 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15'}`}>
                {LICENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </FormField>

          <FormField label="License Expiry" error={err('expiry')} hint={expiryWarn ? '⚠ Date is in the past.' : undefined}>
            <input readOnly={reduced} type="date" className={`${inputCls(!!err('expiry'))} ${reduced ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`} value={form.expiry} onChange={(e) => set('expiry', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, expiry: true }))} />
          </FormField>
        </div>

        <FormField label="Contact Number" error={err('contact')}>
          <input className={inputCls(!!err('contact'))} placeholder="+91 XXXXX XXXXX" value={form.contact} onChange={(e) => set('contact', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, contact: true }))} />
        </FormField>

        <FormField label="Safety Score" hint="Auto-calculated based on trip history.">
          <div className="relative">
            <input readOnly value={form.safety} className="h-11 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-[14px] text-slate-400 outline-none" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">/ 100</span>
          </div>
        </FormField>

        {!reduced && (
          <FormField label="Status" hint={editing ? 'Status also changes automatically based on trip assignments.' : 'New drivers default to Available.'}>
            <div className="relative">
              <select
                value={form.status}
                disabled={!editing}
                onChange={(e) => set('status', e.target.value)}
                className={`h-11 w-full appearance-none rounded-lg border px-3.5 pr-9 text-[14px] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ${editing ? 'border-slate-300 bg-white text-navy-950 hover:border-slate-400' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`}
              >
                {DRIVER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </FormField>
        )}
      </div>

      <div className="flex gap-3 border-t border-slate-100 p-5">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
            Cancel
          </button>
        )}
        <button type="submit" className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30">
          {editing ? 'Save Changes' : 'Register Driver'}
        </button>
      </div>
    </form>
  )
}

/* ---------- detail panel ---------- */

function DetailPanel({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const trend = useMemo(() => safetyTrend(driver.safety), [driver.safety])
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-navy-800 text-[14px] font-semibold text-white">{initials(driver.name)}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-navy-950">{driver.name}</h2>
              <StatusPill status={driver.status} />
            </div>
            <p className="mt-0.5 font-mono text-[12px] text-slate-500">{driver.license}</p>
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Category', driver.category],
            ['License Expiry', formatDate(driver.expiry)],
            ['Contact', driver.contact],
            ['Safety Score', `${driver.safety} / 100`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-navy-50/60 p-3">
              <p className="text-[11px] text-slate-500">{k}</p>
              <p className="mt-1 text-[13.5px] font-semibold text-navy-900">{v}</p>
            </div>
          ))}
        </div>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
            <ShieldIcon className="h-4 w-4 text-teal-600" /> Safety Score Trend
          </h3>
          <div className="h-[150px] rounded-lg border border-slate-200 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[30, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  labelStyle={{ fontWeight: 600, color: '#12283f' }}
                />
                <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 2.5, fill: '#0d9488' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
            <RouteIcon className="h-4 w-4 text-navy-600" /> Trip History
          </h3>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {driverTrips.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-3 text-[12.5px]">
                <span className="font-mono text-navy-700">{t.id}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{t.route}</span>
                <span className="shrink-0 text-slate-400">{t.km} km</span>
                <span className="shrink-0 text-slate-400">{t.date}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/* ---------- page ---------- */

export default function DriverManagement() {
  const { user } = useAuth()
  const role = user?.role as RoleId
  const isDriver = role === 'DRIVER'
  const canRegister = role === 'ADMIN' || role === 'MANAGER'
  const canSuspend = role === 'ADMIN' || role === 'MANAGER'
  const showBanner = role === 'ADMIN' || role === 'MANAGER'

  const [drivers, setDrivers] = useState<Driver[]>([])

  const fetchDrivers = async () => {
    try {
      const res = await driverService.getAll()
      setDrivers(res.data.map((d: any) => ({
        id: d.id,
        name: d.name,
        license: `DL-${d.id.substring(0, 8).toUpperCase()}`, // Mock
        category: 'LMV', // Mock
        expiry: '2025-12-31', // Mock
        contact: d.phone || '+1 555-0000',
        safety: 85, // Mock
        status: d.isActive ? 'Available' : 'Suspended',
        self: d.id === user?.id
      })))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [licFilter, setLicFilter] = useState('All')
  const [sort, setSort] = useState<SortKey>('name')
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<Panel>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Driver role: restrict to own record only
  const scoped = useMemo(() => (isDriver ? drivers.filter((d) => d.self) : drivers), [drivers, isDriver])

  const expiringCount = useMemo(() => scoped.filter((d) => licenseState(d.expiry) === 'Expiring Soon').length, [scoped])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scoped
      .filter((d) => (q ? d.name.toLowerCase().includes(q) || d.license.toLowerCase().includes(q) : true))
      .filter((d) => (statusFilter === 'All' ? true : d.status === statusFilter))
      .filter((d) => (licFilter === 'All' ? true : licenseState(d.expiry) === licFilter))
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'safety') return b.safety - a.safety
        return new Date(a.expiry).getTime() - new Date(b.expiry).getTime()
      })
  }, [scoped, query, statusFilter, licFilter, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const to = Math.min(current * PAGE_SIZE, filtered.length)
  const resetPage = () => setPage(1)

  async function saveDriver(d: Driver): Promise<void> {
    const payload = {
      name: d.name,
      phone: d.contact,
      email: `${d.name.toLowerCase().replace(/\s+/g, '.')}@transitops.local`,
      password: 'password123',
      isActive: d.status === 'Available',
      licenseNumber: d.license,
      licenseCategory: d.category,
      licenseExpiry: d.expiry
    }

    if (panel?.mode === 'edit') {
      await driverService.update(d.id, payload)
    } else {
      await driverService.create(payload)
    }
    setPanel(null)
    fetchDrivers()
  }

  function toggleSuspend(d: Driver) {
    setDrivers((list) => list.map((x) => (x.id === d.id ? { ...x, status: x.status === 'Suspended' ? 'Available' : 'Suspended' } : x)))
  }

  const canEditRow = (d: Driver) => role === 'ADMIN' || role === 'MANAGER' || (isDriver && d.self)

  if (isDriver && rows.length > 0) {
    const me = rows[0]
    return (
      <div className="font-sans text-navy-950">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <DriverForm
              existing={drivers}
              editing={me}
              reduced={true}
              onSave={async (d: Driver) => {
                try {
                  await driverService.update(d.id, {
                    name: d.name,
                    phone: d.contact,
                  })
                  fetchDrivers()
                  alert('Profile updated successfully.')
                } catch (err: any) {
                  console.error(err)
                  alert('Failed to update profile. ' + (err.response?.data?.error || ''))
                }
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="font-sans text-navy-950">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-navy-950">Driver Management</h1>
              <span className="rounded-full bg-navy-50 px-2.5 py-1 font-mono text-[10.5px] font-medium text-navy-600">
                Visible to: Fleet Manager, Safety Officer, Driver (self-only) · Not visible to: Financial Analyst
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              {isDriver ? 'Viewing your own profile.' : `${filtered.length} driver${filtered.length === 1 ? '' : 's'}`} ·{' '}
              <span className="font-medium text-navy-700">
                {role === 'ADMIN' || role === 'MANAGER' ? 'Full access' : role === 'safety_officer' ? 'View + flag/suspend' : 'Self-service'}
              </span>
            </p>
          </div>

          {canRegister && (
            <button onClick={() => setPanel({ mode: 'add' })} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-navy-900 focus-visible:ring-4 focus-visible:ring-navy-800/25">
              <PlusIcon className="h-4 w-4 text-teal-400" />
              Register Driver
            </button>
          )}
        </div>

        {/* expiry banner */}
        {showBanner && expiringCount > 0 && !bannerDismissed && (
          <div className="animate-form-in mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600">
              <AlertIcon className="h-4 w-4" />
            </span>
            <p className="flex-1 text-[13px] text-amber-800">
              <span className="font-semibold">{expiringCount} driver{expiringCount === 1 ? '' : 's'}</span> have licenses expiring soon. Review below.
            </p>
            <button
              onClick={() => {
                setLicFilter('Expiring Soon')
                resetPage()
              }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-amber-700"
            >
              View All
            </button>
            <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss" className="grid h-7 w-7 place-items-center rounded-lg text-amber-600 transition hover:bg-amber-100">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* search + filters */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Search</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  resetPage()
                }}
                placeholder="Search by name, license number…"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
              />
            </div>
          </label>
          <Dropdown label="Status" value={statusFilter} onChange={(v) => { setStatusFilter(v); resetPage() }} options={['All', ...DRIVER_STATUSES]} />
          <Dropdown label="License Status" value={licFilter} onChange={(v) => { setLicFilter(v); resetPage() }} options={['All', 'Valid', 'Expiring Soon', 'Expired']} />
          <Dropdown label="Sort by" value={SORTS.find((s) => s.key === sort)!.label} onChange={(label) => setSort(SORTS.find((s) => s.label === label)!.key)} options={SORTS.map((s) => s.label)} />
        </div>

        {/* table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-navy-900/[0.04]">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-400">
                <InboxIcon className="h-7 w-7" />
              </span>
              <p className="text-[15px] font-semibold text-navy-900">No drivers found</p>
              <p className="max-w-xs text-[13px] text-slate-500">{canRegister ? "Click 'Register Driver' to add your first driver, or adjust your filters." : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Name</th>
                    <th className="px-4 py-3">License No.</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">License Expiry</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Safety Score</th>
                    <th className="px-4 py-3">Status</th>
                    {(canSuspend || !isDriver) && <th className="sticky right-0 z-10 bg-slate-50 px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {rows.map((d, i) => {
                    const expired = licenseState(d.expiry) === 'Expired'
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setPanel({ mode: 'detail', driver: d })}
                        className={`group cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-teal-50/40 ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-3 group-hover:bg-teal-50/40">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-100 text-[11px] font-semibold text-navy-800">{initials(d.name)}</span>
                            <span className="flex items-center gap-1.5 font-semibold text-navy-900">
                              {d.name}
                              {expired && <AlertIcon className="h-4 w-4 text-red-500" aria-label="License expired" />}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{d.license}</td>
                        <td className="px-4 py-3 text-slate-600">{d.category}</td>
                        <td className="px-4 py-3">
                          <ExpiryCell iso={d.expiry} />
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{d.contact}</td>
                        <td className="px-4 py-3">
                          <SafetyBadge score={d.safety} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={d.status} />
                        </td>
                        {(canSuspend || !isDriver) && (
                          <td className="sticky right-0 z-10 bg-inherit px-4 py-3 group-hover:bg-teal-50/40">
                            <div className="flex items-center justify-end gap-1">
                              {canEditRow(d) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPanel({ mode: 'edit', driver: d })
                                  }}
                                  aria-label="Edit driver"
                                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-navy-50 hover:text-navy-700"
                                >
                                  <EditIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPanel({ mode: 'detail', driver: d })
                                }}
                                aria-label="View history"
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-navy-50 hover:text-navy-700"
                              >
                                <HistoryIcon className="h-4 w-4" />
                              </button>
                              {canSuspend && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleSuspend(d)
                                  }}
                                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition ${
                                    d.status === 'Suspended' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'
                                  }`}
                                >
                                  {d.status === 'Suspended' ? 'Reinstate' : 'Suspend'}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <p className="text-[12.5px] text-slate-500">
                {from}–{to} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button disabled={current <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[12.5px] font-medium text-navy-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeftIcon className="h-4 w-4" /> Prev
                </button>
                <span className="px-2 text-[12.5px] font-medium text-slate-500">{current} / {pageCount}</span>
                <button disabled={current >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[12.5px] font-medium text-navy-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Next <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* slide-in panel */}
      {panel && (
        <div className="fixed inset-0 z-40">
          <div className="animate-overlay-in absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={() => setPanel(null)} />
          <div className="animate-panel-in absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
            {panel.mode === 'detail' ? (
              <DetailPanel driver={panel.driver} onClose={() => setPanel(null)} />
            ) : (
              <DriverForm editing={panel.mode === 'edit' ? panel.driver : undefined} reduced={isDriver} existing={drivers} onCancel={() => setPanel(null)} onSave={saveDriver} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
