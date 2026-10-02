import { useMemo, useState, useEffect, type ReactNode } from 'react'
import useAuth from '../../hooks/useAuth'
import { vehicleService } from '../../services/vehicleService'
import { maintenanceService } from '../../services/maintenanceService'
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
  WrenchIcon,
  AlertIcon,
} from '../Dashboard/icons'
import { ROLE_LABEL, type RoleId } from '../Dashboard/data'
import {
  VEHICLES,
  STATUS_STYLES,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  tripHistory,
  maintHistory,
  inr,
  type Vehicle,
  type VehicleStatus,
  type VehicleType,
} from './data'

const PAGE_SIZE = 8

type SortKey = 'reg' | 'odometerKm' | 'costInr' | 'status'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'reg', label: 'Registration Number' },
  { key: 'odometerKm', label: 'Odometer' },
  { key: 'costInr', label: 'Acquisition Cost' },
  { key: 'status', label: 'Status' },
]

type Panel =
  | { mode: 'add' }
  | { mode: 'edit'; vehicle: Vehicle }
  | { mode: 'detail'; vehicle: Vehicle }
  | null

function StatusPill({ status }: { status: VehicleStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  )
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
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

/* ---------------- Form panel ---------------- */

type FormState = {
  reg: string
  model: string
  type: VehicleType
  capacityKg: string
  odometerKm: string
  costInr: string
  status: VehicleStatus
}

const emptyForm: FormState = {
  reg: '',
  model: '',
  type: 'Truck',
  capacityKg: '',
  odometerKm: '',
  costInr: '',
  status: 'Available',
}

function FormField({
  label,
  error,
  children,
  hint,
}: {
  label: string
  error?: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-navy-900">{label}</label>
      {children}
      {hint && !error && <p className="text-[11.5px] text-slate-400">{hint}</p>}
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
    err
      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/12'
      : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15'
  }`

function VehicleForm({
  editing,
  existing,
  onCancel,
  onSave,
  canSeeCost,
}: {
  editing?: Vehicle
  existing: Vehicle[]
  onCancel: () => void
  onSave: (v: Vehicle) => void
  canSeeCost: boolean
}) {
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          reg: editing.reg,
          model: editing.model,
          type: editing.type,
          capacityKg: String(editing.capacityKg),
          odometerKm: String(editing.odometerKm),
          costInr: String(editing.costInr),
          status: editing.status,
        }
      : emptyForm,
  )
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.reg.trim()) e.reg = 'Registration number is required.'
    else if (
      existing.some((v) => v.reg.toLowerCase() === form.reg.trim().toLowerCase() && v.id !== editing?.id)
    )
      e.reg = 'This registration number already exists.'
    if (!form.model.trim()) e.model = 'Vehicle name / model is required.'
    const nums: [keyof FormState, string][] = [
      ['capacityKg', 'Max load capacity'],
      ['odometerKm', 'Odometer'],
    ]
    if (canSeeCost) {
      nums.push(['costInr', 'Acquisition cost'])
    }
    for (const [k, label] of nums) {
      const raw = form[k]
      if (raw === '') e[k] = `${label} is required.`
      else if (Number.isNaN(Number(raw))) e[k] = 'Enter a valid number.'
      else if (Number(raw) < 0) e[k] = 'Value cannot be negative.'
    }
    return e
  }, [form, existing, editing, canSeeCost])

  const valid = Object.keys(errors).length === 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ reg: true, model: true, capacityKg: true, odometerKm: true, costInr: true })
    if (!valid) return
    onSave({
      id: editing?.id ?? `v${Date.now()}`,
      reg: form.reg.trim(),
      model: form.model.trim(),
      type: form.type,
      capacityKg: Number(form.capacityKg),
      odometerKm: Number(form.odometerKm),
      costInr: Number(form.costInr) || 0,
      status: editing ? form.status : 'Available',
    })
  }

  const err = (k: string) => (touched[k] ? errors[k] : undefined)

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="text-[18px] font-bold text-navy-950">{editing ? 'Edit Vehicle' : 'Register Vehicle'}</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {editing ? `Updating ${editing.reg}` : 'Add a new vehicle to the fleet registry.'}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <FormField label="Registration Number" error={err('reg')}>
          <input
            className={inputCls(!!err('reg'))}
            placeholder="e.g., RJ-14-AB-1234"
            value={form.reg}
            onChange={(e) => set('reg', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, reg: true }))}
          />
        </FormField>

        <FormField label="Vehicle Name / Model" error={err('model')}>
          <input
            className={inputCls(!!err('model'))}
            placeholder="e.g., Tata Ace"
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, model: true }))}
          />
        </FormField>

        <FormField label="Type">
          <div className="relative">
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14px] text-navy-950 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Max Load Capacity" error={err('capacityKg')}>
            <div className="relative">
              <input
                type="number"
                className={`${inputCls(!!err('capacityKg'))} pr-10`}
                placeholder="0"
                value={form.capacityKg}
                onChange={(e) => set('capacityKg', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, capacityKg: true }))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">kg</span>
            </div>
          </FormField>

          <FormField label="Odometer" error={err('odometerKm')}>
            <div className="relative">
              <input
                type="number"
                className={`${inputCls(!!err('odometerKm'))} pr-10`}
                placeholder="0"
                value={form.odometerKm}
                onChange={(e) => set('odometerKm', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, odometerKm: true }))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">km</span>
            </div>
          </FormField>
        </div>

        {canSeeCost && (
          <FormField label="Acquisition Cost" error={err('costInr')}>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-slate-400">₹</span>
              <input
                type="number"
                className={`${inputCls(!!err('costInr'))} pl-8`}
                placeholder="0"
                value={form.costInr}
                onChange={(e) => set('costInr', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, costInr: true }))}
              />
            </div>
          </FormField>
        )}

        <FormField
          label="Status"
          hint={
            editing
              ? 'Status also changes automatically based on trips / maintenance.'
              : 'New vehicles default to Available.'
          }
        >
          <div className="relative">
            <select
              value={form.status}
              disabled={!editing}
              onChange={(e) => set('status', e.target.value)}
              className={`h-11 w-full appearance-none rounded-lg border px-3.5 pr-9 text-[14px] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ${
                editing
                  ? 'border-slate-300 bg-white text-navy-950 hover:border-slate-400'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              {VEHICLE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>
      </div>

      <div className="flex gap-3 border-t border-slate-100 p-5">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30"
        >
          Save Vehicle
        </button>
      </div>
    </form>
  )
}

/* ---------------- Risk Badge ---------------- */

function RiskBadge({ band }: { band: string }) {
  const cls =
    band === 'High'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : band === 'Medium'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {band}
    </span>
  )
}

function RiskBreakdown({ factors }: { factors: any }) {
  if (!factors) return null
  const items = [
    factors.odometerSinceService,
    factors.daysSinceService,
    factors.tripFrequency,
    factors.pastMaintenance,
  ]
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
        <AlertIcon className="h-4 w-4 text-amber-600" /> Maintenance Risk Breakdown
      </h3>
      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        {items.map((f: any) => {
          const tone =
            f.factor >= 71
              ? 'bg-red-500'
              : f.factor >= 41
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          return (
            <div key={f.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-slate-600">{f.label}</span>
                <span className="font-semibold text-navy-900">{f.factor}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${tone}`}
                  style={{ width: `${f.factor}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------------- Detail panel ---------------- */

function DetailPanel({ vehicle, onClose, canSeeCost, riskData }: { vehicle: Vehicle; onClose: () => void; canSeeCost: boolean; riskData?: any }) {
  const totalMaint = maintHistory.reduce((s, m) => s + m.cost, 0)
  const opsCost = vehicle.costInr + totalMaint

  const details = [
    ['Max Load', `${vehicle.capacityKg.toLocaleString('en-IN')} kg`],
    ['Odometer', `${vehicle.odometerKm.toLocaleString('en-IN')} km`],
  ]
  if (canSeeCost) {
    details.push(['Acquisition Cost', inr(vehicle.costInr)])
    details.push(['Total Ops Cost', inr(opsCost)])
    // Show revenue from completed trips if available via riskData (passed from parent with ROI data)
    const totalRevenue = riskData?.totalRevenue ?? 0
    details.push(['Total Revenue', inr(totalRevenue)])
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-mono text-[17px] font-semibold text-navy-950">{vehicle.reg}</h2>
            <StatusPill status={vehicle.status} />
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {vehicle.model} · {vehicle.type}
          </p>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          {details.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-navy-50/60 p-3">
              <p className="text-[11px] text-slate-500">{k}</p>
              <p className="mt-1 text-[15px] font-bold text-navy-900">{v}</p>
            </div>
          ))}
        </div>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
            <RouteIcon className="h-4 w-4 text-navy-600" /> Trip History
          </h3>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {tripHistory.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-3 text-[12.5px]">
                <span className="font-mono text-navy-700">{t.id}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{t.route}</span>
                <span className="shrink-0 text-slate-400">{t.km} km</span>
                <span className="shrink-0 text-slate-400">{t.date}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
            <WrenchIcon className="h-4 w-4 text-amber-600" /> Maintenance History
          </h3>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {maintHistory.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3 text-[12.5px]">
                <span className="font-mono text-navy-700">{m.id}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{m.work}</span>
                <span className="shrink-0 font-medium text-navy-800">{inr(m.cost)}</span>
                <span className="shrink-0 text-slate-400">{m.date}</span>
              </li>
            ))}
          </ul>
        </section>

        {riskData && <RiskBreakdown factors={riskData.factors} />}
      </div>
    </div>
  )
}

/* ---------------- Page ---------------- */

export default function VehicleRegistry() {
  const { user } = useAuth()
  const role = user?.role as RoleId
  const canEdit = role === 'ADMIN' || role === 'MANAGER'
  const canSeeCost = role === 'ADMIN' || role === 'MANAGER' || role === 'FINANCIAL_ANALYST'
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  const fetchVehicles = async () => {
    try {
      const res = await vehicleService.getAll()
      setVehicles(res.data.map((v: any) => ({
        id: v.id,
        reg: v.registrationNo,
        model: `${v.make} ${v.model}`,
        type: 'Truck', // Mock fallback
        capacityKg: 5000, // Mock fallback
        odometerKm: 12500, // Mock fallback
        costInr: v.purchaseCost || 0, // Fallback if hidden
        status: v.status === 'AVAILABLE' ? 'Available' : v.status === 'ON_TRIP' ? 'On Trip' : 'In Shop'
      })))
    } catch (err) {
      console.error(err)
    }
  }

  const [riskMap, setRiskMap] = useState<Record<string, any>>({})

  const fetchRiskScores = async () => {
    try {
      const res = await maintenanceService.getRiskScores()
      const map: Record<string, any> = {}
      for (const r of res.data) {
        map[r.registrationNo] = r
      }
      setRiskMap(map)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchVehicles()
    fetchRiskScores()
  }, [])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [riskFilter, setRiskFilter] = useState('All')
  const [sort, setSort] = useState<SortKey>('reg')
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<Panel>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rank: Record<VehicleStatus, number> = { Available: 0, 'On Trip': 1, 'In Shop': 2, Retired: 3 }
    return vehicles
      .filter((v) => (q ? v.reg.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) : true))
      .filter((v) => (typeFilter === 'All' ? true : v.type === typeFilter))
      .filter((v) => (statusFilter === 'All' ? true : v.status === statusFilter))
      .filter((v) => {
        if (riskFilter === 'All') return true
        const r = riskMap[v.reg]
        return r?.riskBand === riskFilter
      })
      .sort((a, b) => {
        if (sort === 'reg') return a.reg.localeCompare(b.reg)
        if (sort === 'status') return rank[a.status] - rank[b.status]
        return (b[sort] as number) - (a[sort] as number)
      })
  }, [vehicles, query, typeFilter, statusFilter, riskFilter, sort, riskMap])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const to = Math.min(current * PAGE_SIZE, filtered.length)

  // reset to page 1 when filters change
  const resetPage = () => setPage(1)

  async function saveVehicle(v: Vehicle) {
    try {
      const payload = {
        registrationNo: v.reg,
        make: v.model.split(' ')[0] || 'Unknown',
        model: v.model.split(' ').slice(1).join(' ') || 'Unknown',
        year: 2024,
        type: v.type || 'Truck',
        capacity: v.capacityKg,
        currentMileage: v.odometerKm,
        purchaseCost: v.costInr,
        status: v.status === 'Available' ? 'AVAILABLE' : v.status === 'On Trip' ? 'ON_TRIP' : 'IN_SHOP'
      }

      if (panel?.mode === 'edit') {
        await vehicleService.update(v.id, payload)
      } else {
        await vehicleService.create(payload)
      }
      setPanel(null)
      fetchVehicles()
    } catch (err) {
      console.error(err)
      alert("Failed to save vehicle. " + (err.response?.data?.error || ""))
    }
  }

  const showFinancialHint = role === 'financial_analyst'

  return (
    <div className="font-sans text-navy-950">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-navy-950">Vehicle Registry</h1>
              <span className="rounded-full bg-navy-50 px-2.5 py-1 font-mono text-[10.5px] font-medium text-navy-600">
                Visible to: All Roles · Edit actions: Fleet Manager only
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              {filtered.length} vehicle{filtered.length === 1 ? '' : 's'} ·{' '}
              <span className="font-medium text-navy-700">{ROLE_LABEL[role]}</span>{' '}
              {canEdit ? 'full access' : 'view-only'}
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => setPanel({ mode: 'add' })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-navy-900 focus-visible:ring-4 focus-visible:ring-navy-800/25"
            >
              <PlusIcon className="h-4 w-4 text-teal-400" />
              Register Vehicle
            </button>
          )}
        </div>

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
                placeholder="Search by registration number, model…"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
              />
            </div>
          </label>
          <Dropdown
            label="Vehicle Type"
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v)
              resetPage()
            }}
            options={['All', ...VEHICLE_TYPES]}
          />
          <Dropdown
            label="Status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
              resetPage()
            }}
            options={['All', ...VEHICLE_STATUSES]}
          />
          <Dropdown
            label="Risk Level"
            value={riskFilter}
            onChange={(v) => {
              setRiskFilter(v)
              resetPage()
            }}
            options={['All', 'High', 'Medium', 'Low']}
          />
          <Dropdown
            label="Sort by"
            value={SORTS.find((s) => s.key === sort)!.label}
            onChange={(label) => setSort(SORTS.find((s) => s.label === label)!.key)}
            options={SORTS.map((s) => s.label)}
          />
        </div>

        {/* table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-navy-900/[0.04]">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-400">
                <InboxIcon className="h-7 w-7" />
              </span>
              <p className="text-[15px] font-semibold text-navy-900">No vehicles found</p>
              <p className="max-w-xs text-[13px] text-slate-500">
                {canEdit
                  ? "Click 'Register Vehicle' to add your first vehicle, or adjust your filters."
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Max Load</th>
                    <th className="px-4 py-3 text-right">Odometer</th>
                    {canSeeCost && (
                      <th className={`px-4 py-3 text-right ${showFinancialHint ? 'text-navy-700' : ''}`}>
                        Acquisition Cost
                      </th>
                    )}
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Risk</th>
                    {canEdit && <th className="sticky right-0 z-10 bg-slate-50 px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {rows.map((v, i) => (
                    <tr
                      key={v.id}
                      onClick={() => setPanel({ mode: 'detail', vehicle: v })}
                      className={`group cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-teal-50/40 ${
                        i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3 font-mono font-semibold text-navy-900 group-hover:bg-teal-50/40">
                        {v.reg}
                      </td>
                      <td className="px-4 py-3 text-navy-800">{v.model}</td>
                      <td className="px-4 py-3 text-slate-600">{v.type}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {v.capacityKg.toLocaleString('en-IN')} kg
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {v.odometerKm.toLocaleString('en-IN')} km
                      </td>
                      {canSeeCost && (
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            showFinancialHint ? 'font-semibold text-navy-900' : 'text-slate-700'
                          }`}
                        >
                          {inr(v.costInr)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <StatusPill status={v.status} />
                      </td>
                      <td className="px-4 py-3">
                        {riskMap[v.reg] ? (
                          <RiskBadge band={riskMap[v.reg].riskBand} />
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="sticky right-0 z-10 bg-inherit px-4 py-3 group-hover:bg-teal-50/40">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setPanel({ mode: 'edit', vehicle: v })
                              }}
                              aria-label="Edit vehicle"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-navy-50 hover:text-navy-700"
                            >
                              <EditIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setPanel({ mode: 'detail', vehicle: v })
                              }}
                              aria-label="View history"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-navy-50 hover:text-navy-700"
                            >
                              <HistoryIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <p className="text-[12.5px] text-slate-500">
                {from}–{to} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={current <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[12.5px] font-medium text-navy-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeftIcon className="h-4 w-4" /> Prev
                </button>
                <span className="px-2 text-[12.5px] font-medium text-slate-500">
                  {current} / {pageCount}
                </span>
                <button
                  disabled={current >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[12.5px] font-medium text-navy-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
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
              <DetailPanel vehicle={panel.vehicle} onClose={() => setPanel(null)} canSeeCost={canSeeCost} riskData={riskMap[panel.vehicle.reg]} />
            ) : (
              <VehicleForm
                editing={panel.mode === 'edit' ? panel.vehicle : undefined}
                existing={vehicles}
                onCancel={() => setPanel(null)}
                onSave={saveVehicle}
                canSeeCost={canSeeCost}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
