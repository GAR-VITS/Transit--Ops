import { useMemo, useState, useEffect, type ReactNode } from 'react'
import useAuth from '../../hooks/useAuth'
import { fuelExpenseService } from '../../services/fuelExpenseService'
import { vehicleService } from '../../services/vehicleService'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import {
  SearchIcon,
  PlusIcon,
  XIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  AlertIcon,
  FuelIcon,
  CoinIcon,
  WrenchIcon,
  EditIcon,
  RouteIcon,
} from '../Dashboard/icons'
import { type RoleId } from '../Dashboard/data'
import { inr } from '../VehicleRegistry/data'


import {
  ENTRIES,
  EXPENSE_TYPES,
  ENTRY_TYPE_FILTERS,
  SELF_USER,
  tagStyle,
  nextEntryId,
  formatEntryDate,
  entryDetail,
  type Entry,
  type EntryKind,
  type EntryType,
  type ExpenseType,
} from './data'

const PAGE_SIZE = 8
const THIS_MONTH = '2026-07'

// Vehicles the logged-in driver may log against (from their own trips).


/* ---------- small pieces ---------- */

function TypeTag({ type }: { type: EntryType }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tagStyle(type)}`}>{type}</span>
}

function Dropdown({ label, value, options, onChange, wide }: { label: string; value: string; options: string[]; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-10 appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-[13px] font-medium text-navy-900 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ${wide ? 'w-full sm:w-52' : 'w-full sm:w-40'}`}
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

const inputCls = (err?: boolean) =>
  `h-11 w-full rounded-lg border bg-white px-3.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 ${
    err ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/12' : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15'
  }`

function FormField({ label, error, warn, children }: { label: string; error?: string; warn?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-navy-900">{label}</label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {warn && !error && (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-600">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {warn}
        </p>
      )}
    </div>
  )
}

/* ---------- summary cards ---------- */

function SummaryCards({ fuel, expense, vehicleCount, scoped }: { fuel: number; expense: number; vehicleCount: number; scoped: boolean }) {
  const total = fuel + expense
  const avg = vehicleCount > 0 ? Math.round(total / vehicleCount) : 0
  const cards = [
    { label: scoped ? 'My Fuel Cost (this month)' : 'Total Fuel Cost (this month)', value: inr(fuel), icon: FuelIcon, fg: 'text-navy-800', bg: 'bg-navy-50' },
    { label: scoped ? 'My Other Expenses' : 'Total Other Expenses (this month)', value: inr(expense), icon: CoinIcon, fg: 'text-amber-600', bg: 'bg-amber-50' },
    { label: scoped ? 'My Operational Cost' : 'Total Operational Cost', value: inr(total), icon: WrenchIcon, fg: 'text-teal-700', bg: 'bg-teal-50' },
    { label: scoped ? 'Vehicles Logged' : 'Average Cost per Vehicle', value: scoped ? String(vehicleCount) : inr(avg), icon: RouteIcon, fg: 'text-navy-800', bg: 'bg-navy-50' },
  ]
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04]">
            <div className="mb-3 flex items-center justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${c.bg} ${c.fg}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="text-[26px] font-bold leading-none tracking-tight text-navy-950">{c.value}</p>
            <p className="mt-2 text-[12.5px] font-medium text-slate-500">{c.label}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- log entry panel ---------- */

type FormState = { kind: EntryKind; vehicleReg: string; date: string; liters: string; expenseType: ExpenseType; description: string; costInr: string; proofImage: string }

function EntryPanel({ dbVehicles, editing, entries, vehicleOptions, autoVehicle, onCancel, onSave }: any) {
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          kind: editing.kind,
          vehicleReg: editing.vehicleReg,
          date: editing.date,
          liters: editing.liters ? String(editing.liters) : '',
          expenseType: (editing.kind === 'Expense' ? (editing.type as ExpenseType) : 'Toll'),
          description: editing.description ?? '',
          costInr: String(editing.costInr),
          proofImage: editing.proofImage ?? '',
        }
      : { kind: 'Fuel', vehicleReg: autoVehicle ?? '', date: new Date().toISOString().slice(0, 10), liters: '', expenseType: 'Toll', description: '', costInr: '', proofImage: '' },
  )
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const isFuel = form.kind === 'Fuel'
  const todayIso = new Date().toISOString().slice(0, 10)
  const futureDated = form.date > todayIso

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.vehicleReg) e.vehicleReg = 'Select a vehicle.'
    if (!form.date) e.date = 'Select a date.'
    if (isFuel && form.liters !== '' && Number(form.liters) < 0) e.liters = 'Value cannot be negative.'
    if (!isFuel && !form.description.trim()) e.description = 'A description is required.'
    if (form.costInr === '') e.costInr = 'Cost is required.'
    else if (Number(form.costInr) <= 0) e.costInr = 'Cost must be greater than zero.'
    if (!form.proofImage) e.proofImage = 'Proof image is required.'
    return e
  }, [form, isFuel])

  function save() {
    setTouched({ vehicleReg: true, date: true, liters: true, description: true, costInr: true, proofImage: true })
    if (Object.keys(errors).length > 0) return
    const type: EntryType = isFuel ? 'Fuel' : form.expenseType
    onSave({
      id: editing ? editing.id : nextEntryId(entries),
      date: form.date,
      vehicleReg: form.vehicleReg,
      kind: form.kind,
      type,
      liters: isFuel ? Number(form.liters || 0) : undefined,
      description: isFuel ? undefined : form.description.trim(),
      costInr: Number(form.costInr),
      loggedBy: editing ? editing.loggedBy : SELF_USER,
      ownedBySelf: editing ? editing.ownedBySelf : true,
      proofImage: form.proofImage,
    })
  }

  const err = (k: string) => (touched[k] ? errors[k] : undefined)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="text-[18px] font-bold text-navy-950">{editing ? 'Edit Entry' : 'Log Entry'}</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{editing ? editing.id : 'Record a fuel purchase or an operational expense.'}</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {/* type toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          {(['Fuel', 'Expense'] as EntryKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => set('kind', k)}
              className={`h-9 rounded-md text-[13px] font-semibold transition ${form.kind === k ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-700'}`}
            >
              {k}
            </button>
          ))}
        </div>

        <FormField label="Vehicle" error={err('vehicleReg')}>
          <div className="relative">
            <select
              value={form.vehicleReg}
              onChange={(e) => set('vehicleReg', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, vehicleReg: true }))}
              className={`h-11 w-full appearance-none rounded-lg border px-3.5 pr-9 text-[14px] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ${err('vehicleReg') ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'} ${form.vehicleReg ? 'text-navy-950' : 'text-slate-400'}`}
            >
              <option value="">Select a vehicle…</option>
              {vehicleOptions.map((reg) => {
                const v = dbVehicles.find((x: any) => x.id === reg)
                return (
                  <option key={v?.registrationNo || reg} value={reg}>
                    {reg}
                    {v ? ` — ${v.model}` : ''}
                  </option>
                )
              })}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>

        <FormField label="Date" error={err('date')} warn={futureDated ? 'This entry is dated in the future.' : undefined}>
          <input type="date" className={inputCls(!!err('date'))} value={form.date} onChange={(e) => set('date', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, date: true }))} />
        </FormField>

        {isFuel ? (
          <FormField label="Liters" error={err('liters')}>
            <div className="relative">
              <input type="number" className={`${inputCls(!!err('liters'))} pr-8`} placeholder="0" value={form.liters} onChange={(e) => set('liters', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, liters: true }))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">L</span>
            </div>
          </FormField>
        ) : (
          <>
            <FormField label="Expense Type">
              <div className="relative">
                <select value={form.expenseType} onChange={(e) => set('expenseType', e.target.value)} className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14px] text-navy-950 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15">
                  {EXPENSE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </FormField>
            <FormField label="Description" error={err('description')}>
              <input className={inputCls(!!err('description'))} placeholder="e.g. NH-48 toll plaza" value={form.description} onChange={(e) => set('description', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, description: true }))} />
            </FormField>
          </>
        )}

        <FormField label="Cost" error={err('costInr')}>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-slate-400">₹</span>
            <input type="number" className={`${inputCls(!!err('costInr'))} pl-7`} placeholder="0" value={form.costInr} onChange={(e) => set('costInr', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, costInr: true }))} />
          </div>
        </FormField>

        <FormField label="Proof Image" error={err('proofImage')}>
          <input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onloadend = () => set('proofImage', reader.result as string)
              reader.readAsDataURL(file)
            } else {
              set('proofImage', '')
            }
          }} className="w-full text-[13px] text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-teal-700 hover:file:bg-teal-100" />
          {form.proofImage && (
            <div className="mt-2 h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <img src={form.proofImage} alt="Proof" className="h-full w-full object-cover" />
            </div>
          )}
        </FormField>
      </div>

      <div className="flex gap-3 border-t border-slate-100 p-5">
        <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
          Cancel
        </button>
        <button type="button" onClick={save} className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30">
          Save Entry
        </button>
      </div>
    </div>
  )
}

/* ---------- cost summary panel ---------- */

function CostSummaryPanel({ dbVehicles, maintRecords, vehicleReg, entries, onClose }: any) {
  const vehicle = dbVehicles.find((v: any) => v.id === vehicleReg || v.registrationNo === vehicleReg)
  const rows = useMemo(() => entries.filter((e) => e.vehicleReg === vehicleReg), [entries, vehicleReg])
  const fuel = rows.filter((e) => e.kind === 'Fuel').reduce((s, e) => s + e.costInr, 0)
  const other = rows.filter((e) => e.kind === 'Expense').reduce((s, e) => s + e.costInr, 0)
  const maint = maintRecords.filter((m: any) => m.vehicleReg === vehicleReg).reduce((s: any, m: any) => s + m.costInr, 0)
  const combined = fuel + other + maint

  const trend = useMemo(() => {
    const byDay = new Map<string, number>()
    ;[...rows]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.costInr))
    return Array.from(byDay.entries()).map(([date, cost]) => ({ date: date.slice(5), cost }))
  }, [rows])

  const lines = [
    { label: 'Total fuel cost', value: fuel, fg: 'text-navy-700' },
    { label: 'Total other expenses', value: other, fg: 'text-amber-600' },
    { label: 'Total maintenance cost', value: maint, fg: 'text-teal-700', note: 'from Maintenance Log' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Cost Summary</p>
          <h2 className="font-mono text-[18px] font-bold text-navy-950">{vehicleReg}</h2>
          {vehicle && <p className="mt-0.5 text-[12.5px] text-slate-500">{vehicle.model}</p>}
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Combined operational cost</p>
        <p className="mt-0.5 text-[24px] font-bold tabular-nums text-navy-950">{inr(combined)}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
              <span className="text-[13px] text-slate-600">
                {l.label}
                {l.note && <span className="ml-1.5 text-[11px] text-slate-400">({l.note})</span>}
              </span>
              <span className={`text-[13.5px] font-semibold tabular-nums ${l.fg}`}>{inr(l.value)}</span>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[12px] font-medium text-slate-500">Cost over time</p>
          {trend.length > 1 ? (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="cost" stroke="#0d9488" strokeWidth={2.4} dot={{ r: 3, fill: '#0d9488' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-[12.5px] text-slate-400">Not enough data points for a trend yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Page ---------- */

export default function FuelExpense() {
  const { user } = useAuth()
  const role = user?.role as RoleId
  const isDriver = role === 'DRIVER'
  const canLog = role === 'ADMIN' || role === 'MANAGER' || isDriver
  const canDelete = role === 'ADMIN' || role === 'MANAGER'
  const showLoggedBy = role === 'ADMIN' || role === 'MANAGER' || role === 'FINANCIAL_ANALYST'
  const canViewSummary = role === 'ADMIN' || role === 'MANAGER' || role === 'FINANCIAL_ANALYST'
  const canExport = role === 'ADMIN' || role === 'MANAGER' || role === 'FINANCIAL_ANALYST'

  const [entries, setEntries] = useState<Entry[]>([])
  const [dbVehicles, setDbVehicles] = useState<any[]>([])
  const [maintRecords, setMaintRecords] = useState<any[]>([]) // mock for now to avoid breaking UI

  const fetchAll = async () => {
    try {
      const [fRes, vRes] = await Promise.all([
        fuelExpenseService.getAll(),
        vehicleService.getAll()
      ])
      setDbVehicles(vRes.data)
      
      setEntries(fRes.data.map((f: any) => ({
        id: f.id,
        vehicleReg: f.vehicle?.registrationNo || f.vehicleId,
        date: f.date.substring(0, 10),
        kind: f.liters > 0 ? 'Fuel' : 'Expense',
        type: f.liters > 0 ? 'Fuel' : (f.fuelStation === 'Toll' || f.fuelStation === 'Parking' || f.fuelStation === 'Other' ? f.fuelStation : 'Other'),
        liters: f.liters > 0 ? f.liters : undefined,
        description: f.fuelStation || 'Expense',
        costInr: f.totalCost,
        loggedBy: 'Admin',
        ownedBySelf: true,
        vehicleId: f.vehicleId,
        proofImage: f.proofImage,
        source: f.source || undefined,
      })))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [vehicleFilter, setVehicleFilter] = useState('All Vehicles')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<null | { mode: 'create' } | { mode: 'edit'; entry: Entry } | { mode: 'summary'; reg: string }>(null)

  const canEditEntry = (e: Entry) => role === 'ADMIN' || role === 'MANAGER' || (isDriver && e.ownedBySelf)

  // Driver only ever sees their own entries.
  const scopeBase = useMemo(() => (isDriver ? entries.filter((e) => e.ownedBySelf) : entries), [entries, isDriver])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scopeBase
      .filter((e) => (q ? [e.vehicleReg, e.id].some((f) => f.toLowerCase().includes(q)) : true))
      .filter((e) => {
        if (typeFilter === 'All') return true
        if (typeFilter === 'Other') return e.type !== 'Fuel' && e.type !== 'Toll' && e.type !== 'Maintenance-linked'
        return e.type === typeFilter
      })
      .filter((e) => (vehicleFilter === 'All Vehicles' ? true : e.vehicleReg === vehicleFilter))
      .filter((e) => (fromDate ? e.date >= fromDate : true))
      .filter((e) => (toDate ? e.date <= toDate : true))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }, [scopeBase, query, typeFilter, vehicleFilter, fromDate, toDate])

  // Summary metrics scoped to this month.
  const summary = useMemo(() => {
    const month = scopeBase.filter((e) => e.date.startsWith(THIS_MONTH))
    const fuel = month.filter((e) => e.kind === 'Fuel').reduce((s, e) => s + e.costInr, 0)
    const expense = month.filter((e) => e.kind === 'Expense').reduce((s, e) => s + e.costInr, 0)
    const vehicleCount = new Set(month.map((e) => e.vehicleReg)).size
    return { fuel, expense, vehicleCount }
  }, [scopeBase])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const to = Math.min(current * PAGE_SIZE, filtered.length)
  const resetPage = () => setPage(1)

  const vehicleOptions = dbVehicles.map((v) => v.id)

  async function saveEntry(e: any) {
    try {
      const payload = {
        vehicleId: e.vehicleReg, // because form uses vehicleId as vehicleReg
        date: new Date(e.date).toISOString(),
        litres: e.kind === 'Fuel' ? (e.liters || 0) : 0,
        costPerLitre: e.kind === 'Fuel' && e.liters ? (e.costInr / e.liters) : 0,
        totalCost: e.costInr,
        odometer: 0,
        fuelStation: e.kind === 'Fuel' ? 'Fuel Station' : e.type,
        proofImage: e.proofImage || null
      }
      if (panel?.mode === 'edit') {
        await fuelExpenseService.update(e.id, payload)
      } else {
        await fuelExpenseService.create(payload)
      }
      setPanel(null)
      fetchAll()
    } catch (err) {
      console.error(err)
      alert("Failed to save entry.")
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete entry?")) return;
    try {
      await fuelExpenseService.remove(id)
      fetchAll()
    } catch (err) {
      console.error(err)
      alert("Failed to delete entry.")
    }
  }

  function exportCsv() {
    const header = 'ID,Date,Vehicle,Type,Liters,Cost Inr,Description,Logged By\n'
    const csv = filtered
      .map(
        (e) =>
          `${e.id},${e.date},${e.vehicleReg},${e.kind} - ${e.type},${e.liters || ''},${e.costInr},"${e.description.replace(/"/g, '""')}",${e.loggedBy}`,
      )
      .join('\n')
    const blob = new Blob([header + csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transitops-fuel-expenses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="font-sans text-navy-950">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-navy-950">Fuel &amp; Expense Tracking</h1>
              <span className="rounded-full bg-navy-50 px-2.5 py-1 font-mono text-[10.5px] font-medium text-navy-600">
                Fleet Manager · Financial Analyst · Driver (own entries) — not visible to Safety Officer
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} ·{' '}
              <span className="font-medium text-navy-700">
                {role === 'ADMIN' || role === 'MANAGER' ? 'Full access' : isDriver ? 'Log & manage own entries' : 'View & export'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canExport && (
              <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-navy-800 transition hover:bg-slate-50">
                Export CSV
              </button>
            )}
            {canLog && (
              <button onClick={() => setPanel({ mode: 'create' })} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-navy-900 focus-visible:ring-4 focus-visible:ring-navy-800/25">
                <PlusIcon className="h-4 w-4 text-teal-400" />
                Log Entry
              </button>
            )}
          </div>
        </div>

        {/* summary cards */}
        <SummaryCards fuel={summary.fuel} expense={summary.expense} vehicleCount={summary.vehicleCount} scoped={isDriver} />

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
                placeholder="Search by vehicle registration number…"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
              />
            </div>
          </label>
          <Dropdown label="Entry Type" value={typeFilter} onChange={(v) => { setTypeFilter(v); resetPage() }} options={[...ENTRY_TYPE_FILTERS]} />
          <Dropdown label="Vehicle" wide value={vehicleFilter} onChange={(v) => { setVehicleFilter(v); resetPage() }} options={['All Vehicles', ...vehicleOptions]} />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">From</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); resetPage() }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-navy-900 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">To</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); resetPage() }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-navy-900 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15" />
          </label>
        </div>

        {/* table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-navy-900/[0.04]">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-400">
                <InboxIcon className="h-7 w-7" />
              </span>
              <p className="text-[15px] font-semibold text-navy-900">No entries found</p>
              <p className="max-w-xs text-[13px] text-slate-500">{canLog ? "Click 'Log Entry' to add your first fuel or expense record." : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    {showLoggedBy && <th className="px-4 py-3">Logged By</th>}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {rows.map((e, i) => (
                    <tr key={e.id} className={`border-b border-slate-100 transition last:border-0 ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                      <td className="px-4 py-3 text-slate-600">{formatEntryDate(e.date)}</td>
                      <td className="px-4 py-3">
                        {canViewSummary ? (
                          <button onClick={() => setPanel({ mode: 'summary', reg: e.vehicleReg })} className="font-mono font-semibold text-navy-900 transition hover:text-teal-700 hover:underline">
                            {e.vehicleReg}
                          </button>
                        ) : (
                          <span className="font-mono font-semibold text-navy-900">{e.vehicleReg}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TypeTag type={e.type} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {entryDetail(e)}
                        {e.source && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20">
                            {e.source}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-navy-900">{inr(e.costInr)}</td>
                      {showLoggedBy && <td className="px-4 py-3 text-slate-600">{e.loggedBy}</td>}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {e.proofImage && (
                            <button onClick={() => {
                              const w = window.open('', '_blank')
                              if (w) w.document.write(`<title>Receipt</title><img src="${e.proofImage}" style="max-width: 100%; height: auto;" />`)
                            }} title="View Receipt" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-teal-50 hover:text-teal-600">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                            </button>
                          )}
                          {canEditEntry(e) && (
                            <button onClick={() => setPanel({ mode: 'edit', entry: e })} title="Edit entry" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
                              <EditIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => deleteEntry(e.id)} title="Delete entry" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                              <XIcon className="h-4 w-4" />
                            </button>
                          )}
                          {!canEditEntry(e) && !canDelete && <span className="text-[12px] text-slate-300">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            {panel.mode === 'summary' ? (
              <CostSummaryPanel dbVehicles={dbVehicles} maintRecords={maintRecords} vehicleReg={panel.reg} entries={entries} onClose={() => setPanel(null)} />
            ) : (
              <EntryPanel dbVehicles={dbVehicles} editing={panel.mode === 'edit' ? panel.entry : null} entries={entries} vehicleOptions={vehicleOptions} autoVehicle={isDriver && vehicleOptions.length === 1 ? vehicleOptions[0] : undefined} onCancel={() => setPanel(null)} onSave={saveEntry} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
