import { useMemo, useState, useEffect, type ReactNode } from 'react'
import useAuth from '../../hooks/useAuth'
import { maintenanceService } from '../../services/maintenanceService'
import { vehicleService } from '../../services/vehicleService'
import {
  SearchIcon,
  PlusIcon,
  XIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  AlertIcon,
  WrenchIcon,
  EditIcon,
  CheckIcon,
  CoinIcon,
} from '../Dashboard/icons'
import { type RoleId } from '../Dashboard/data'
import { inr } from '../VehicleRegistry/data'
import {
  MAINT_RECORDS,
  MAINT_STATUS_STYLES,
  SERVICE_TYPES,
  nextMaintId,
  formatMaintDate,
  type MaintRecord,
  type MaintStatus,
  type ServiceType,
} from './data'

const PAGE_SIZE = 8

/* ---------- small pieces ---------- */

function StatusPill({ status }: { status: MaintStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${MAINT_STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status === 'Active' ? 'Active · In Shop' : 'Closed'}
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
          className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-[13px] font-medium text-navy-900 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 sm:w-40"
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

function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
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
    </div>
  )
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="animate-overlay-in absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="animate-modal-in relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">{children}</div>
    </div>
  )
}

/* ---------- Create / Edit panel ---------- */

type FormState = { vehicleReg: string; service: ServiceType; description: string; costInr: string; date: string }

function RecordPanel({ dbVehicles, editing, records, onCancel, onSave }: any) {
  const selectable = useMemo(() => dbVehicles.filter((v: any) => v.status !== 'RETIRED'), [dbVehicles])
  const [form, setForm] = useState<FormState>(
    editing
      ? { vehicleReg: editing.vehicleReg, service: editing.service, description: editing.description, costInr: String(editing.costInr), date: editing.date }
      : { vehicleReg: '', service: 'Oil Change', description: '', costInr: '', date: new Date().toISOString().slice(0, 10) },
  )
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const selectedVehicle = dbVehicles.find((v: any) => v.id === form.vehicleReg)
  const alreadyInShop =
    !editing && !!selectedVehicle && (selectedVehicle.status === 'In Shop' || records.some((r) => r.vehicleReg === form.vehicleReg && r.status === 'Active'))

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.vehicleReg) e.vehicleReg = 'Select a vehicle.'
    if (!form.description.trim()) e.description = 'A description is required.'
    if (form.costInr === '') e.costInr = 'Cost is required.'
    else if (Number(form.costInr) < 0) e.costInr = 'Cost cannot be negative.'
    if (!form.date) e.date = 'Select a date.'
    return e
  }, [form])

  function save() {
    setTouched({ vehicleReg: true, description: true, costInr: true, date: true })
    if (Object.keys(errors).length > 0) return
    onSave({
      id: editing ? editing.id : nextMaintId(records),
      vehicleReg: form.vehicleReg,
      service: form.service,
      description: form.description.trim(),
      costInr: Number(form.costInr),
      date: form.date,
      status: editing ? editing.status : 'Active',
      closedNotes: editing?.closedNotes,
    })
  }

  const err = (k: string) => (touched[k] ? errors[k] : undefined)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="text-[18px] font-bold text-navy-950">{editing ? 'Edit Maintenance Record' : 'Log Maintenance'}</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{editing ? editing.id : 'Create a new servicing / repair record.'}</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <FormField label="Vehicle" error={err('vehicleReg')}>
          <div className="relative">
            <select
              value={form.vehicleReg}
              onChange={(e) => set('vehicleReg', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, vehicleReg: true }))}
              disabled={!!editing}
              className={`h-11 w-full appearance-none rounded-lg border px-3.5 pr-9 text-[14px] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 ${err('vehicleReg') ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'} ${form.vehicleReg ? 'text-navy-950' : 'text-slate-400'}`}
            >
              <option value="">Select a vehicle…</option>
              {selectable.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg} — {v.model}
                  {v.status === 'In Shop' ? ' (In Shop)' : ''}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>

        {/* contextual warning banner */}
        {alreadyInShop && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            This vehicle already has an active maintenance record. Adding a new one will not change its current status.
          </div>
        )}

        <FormField label="Service Type">
          <div className="relative">
            <select
              value={form.service}
              onChange={(e) => set('service', e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14px] text-navy-950 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>

        <FormField label="Description" error={err('description')}>
          <textarea
            rows={3}
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 ${err('description') ? 'border-red-400' : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15'}`}
            placeholder="Describe the issue or service needed"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cost" error={err('costInr')}>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-slate-400">₹</span>
              <input type="number" className={`${inputCls(!!err('costInr'))} pl-7`} placeholder="0" value={form.costInr} onChange={(e) => set('costInr', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, costInr: true }))} />
            </div>
          </FormField>
          <FormField label="Date" error={err('date')}>
            <input type="date" className={inputCls(!!err('date'))} value={form.date} onChange={(e) => set('date', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, date: true }))} />
          </FormField>
        </div>

        {!editing && (
          <div className="flex items-start gap-2 rounded-lg bg-navy-50 px-3 py-2.5 text-[12px] text-navy-700">
            <WrenchIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            Saving this record will automatically set the vehicle's status to "In Shop" and remove it from trip dispatch selection.
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-slate-100 p-5">
        <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
          Cancel
        </button>
        <button type="button" onClick={save} className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30">
          Save Record
        </button>
      </div>
    </div>
  )
}

/* ---------- History panel ---------- */

function HistoryPanel({ dbVehicles, vehicleReg, records, onClose }: any) {
  const vehicle = dbVehicles.find((v: any) => v.registrationNo === vehicleReg)
  const history = useMemo(
    () => records.filter((r) => r.vehicleReg === vehicleReg).sort((a, b) => b.date.localeCompare(a.date)),
    [records, vehicleReg],
  )
  const total = history.reduce((s, r) => s + r.costInr, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Maintenance History</p>
          <h2 className="font-mono text-[18px] font-bold text-navy-950">{vehicleReg}</h2>
          {vehicle && <p className="mt-0.5 text-[12.5px] text-slate-500">{vehicle.model}</p>}
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total maintenance cost to date</p>
        <p className="mt-0.5 text-[22px] font-bold tabular-nums text-navy-950">{inr(total)}</p>
        <p className="text-[12px] text-slate-500">Across {history.length} record{history.length === 1 ? '' : 's'}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {history.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13.5px] font-semibold text-navy-900">{r.service}</p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {r.id} · {formatMaintDate(r.date)}
                </p>
              </div>
              <StatusPill status={r.status} />
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{r.description}</p>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-[12px] text-slate-500">Cost</span>
              <span className="text-[13px] font-semibold tabular-nums text-navy-900">{inr(r.costInr)}</span>
            </div>
            {r.closedNotes && <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11.5px] text-emerald-700">Closing notes: {r.closedNotes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Close modal ---------- */

function CloseModal({ record, onClose, onConfirm }: { record: MaintRecord; onClose: () => void; onConfirm: (notes: string) => void }) {
  const [notes, setNotes] = useState('')
  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-navy-950">Close maintenance record</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-[13px] text-slate-600">
          Close this maintenance record for <span className="font-mono font-semibold text-navy-900">{record.vehicleReg}</span>?
        </p>

        <FormField label="Final Notes (optional)">
          <textarea rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15" placeholder="Summary of the work completed…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-navy-50 px-3 py-2.5 text-[12px] text-navy-700">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          Closing this record will automatically restore the vehicle's status to "Available" (unless it is marked Retired).
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(notes)} className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30">
            Confirm Close
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ---------- Page ---------- */

export default function MaintenanceLog() {
  const { user } = useAuth()
  const role = user?.role as RoleId
  const canManage = role === 'ADMIN' || role === 'MANAGER'
  const showCost = role === 'ADMIN' || role === 'MANAGER' || role === 'FINANCIAL_ANALYST'
  const canViewHistory = role === 'ADMIN' || role === 'MANAGER' || role === 'FINANCIAL_ANALYST'

  const [records, setRecords] = useState<MaintRecord[]>([])
  const [dbVehicles, setDbVehicles] = useState<any[]>([])

  const fetchAll = async () => {
    try {
      const [mRes, vRes] = await Promise.all([
        maintenanceService.getAll(),
        vehicleService.getAll()
      ])
      setDbVehicles(vRes.data)
      
      setRecords(mRes.data.map((m: any) => ({
        id: m.id,
        vehicleReg: m.vehicle?.registrationNo || m.vehicleId, // we map to reg for UI
        service: m.type === 'PREVENTIVE' ? 'Routine Service' : 'Repair',
        description: m.description || '',
        costInr: m.cost || 0,
        date: m.startDate.substring(0, 10),
        status: m.endDate ? 'Closed' : 'Active',
        closedNotes: m.endDate ? 'Completed' : undefined,
        vehicleId: m.vehicleId
      })))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<null | { mode: 'create' } | { mode: 'edit'; record: MaintRecord } | { mode: 'history'; reg: string }>(null)
  const [closing, setClosing] = useState<MaintRecord | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records
      .filter((r) => (q ? [r.vehicleReg, r.service, r.id].some((f) => f.toLowerCase().includes(q)) : true))
      .filter((r) => (statusFilter === 'All' ? true : r.status === statusFilter))
      .filter((r) => (fromDate ? r.date >= fromDate : true))
      .filter((r) => (toDate ? r.date <= toDate : true))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }, [records, query, statusFilter, fromDate, toDate])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const to = Math.min(current * PAGE_SIZE, filtered.length)
  const resetPage = () => setPage(1)

  async function closeRecord(id: string, notes: string) {
    try {
      await maintenanceService.update(id, { endDate: new Date().toISOString() })
      setClosing(null)
      fetchAll()
    } catch (err) {
      console.error(err)
      alert("Failed to close record.")
    }
  }

  async function saveRecord(r: MaintRecord) {
    try {
      if (panel && panel.mode === 'edit') {
        await maintenanceService.update(r.id, { description: r.description, cost: r.costInr })
      } else {
        await maintenanceService.create({
          vehicleId: r.vehicleReg,
          type: r.service === 'Repair' ? 'REPAIR' : 'PREVENTIVE',
          description: r.description,
          cost: r.costInr,
          startDate: new Date(r.date).toISOString()
        })
      }
      setPanel(null)
      fetchAll()
    } catch (err) {
      console.error(err)
      alert("Failed to save record")
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div>
          <h1 className="text-[20px] font-bold text-navy-950">Maintenance Log</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Track and manage vehicle servicing.</p>
        </div>
        {canManage && (
          <button onClick={() => setPanel({ mode: 'create' })} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-navy-900 focus-visible:ring-4 focus-visible:ring-navy-800/25">
              <PlusIcon className="h-4 w-4 text-teal-400" />
              Log Maintenance
            </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <div className="mx-auto w-full max-w-[1000px] rounded-xl border border-slate-200 bg-white shadow-xl shadow-navy-900/[0.04]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between">
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
                placeholder="Search by vehicle registration number, service type…"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
              />
            </div>
          </label>
          <Dropdown label="Status" value={statusFilter} onChange={(v) => { setStatusFilter(v); resetPage() }} options={['All', 'Active', 'Closed']} />
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
              <p className="text-[15px] font-semibold text-navy-900">No maintenance records found</p>
              <p className="max-w-xs text-[13px] text-slate-500">{canManage ? "Click 'Log Maintenance' to add one." : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Service Type</th>
                    <th className="px-4 py-3">Date Created</th>
                    {showCost && <th className="px-4 py-3 text-right">Cost</th>}
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {rows.map((r, i) => (
                    <tr key={r.id} className={`border-b border-slate-100 transition last:border-0 ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                      <td className="px-4 py-3">
                        {canViewHistory ? (
                          <button onClick={() => setPanel({ mode: 'history', reg: r.vehicleReg })} className="font-mono font-semibold text-navy-900 transition hover:text-teal-700 hover:underline">
                            {r.vehicleReg}
                          </button>
                        ) : (
                          <span className="font-mono font-semibold text-navy-900">{r.vehicleReg}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.service}</td>
                      <td className="px-4 py-3 text-slate-600">{formatMaintDate(r.date)}</td>
                      {showCost && <td className="px-4 py-3 text-right tabular-nums text-slate-700">{inr(r.costInr)}</td>}
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage ? (
                            <>
                              {r.status === 'Active' && (
                                <button onClick={() => setClosing(r)} className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-teal-700">
                                  Close Maintenance
                                </button>
                              )}
                              <button onClick={() => setPanel({ mode: 'edit', record: r })} title="Edit record" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
                                <EditIcon className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[12px] text-slate-300">—</span>
                          )}
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

        {/* cost note for FA */}
        {role === 'financial_analyst' && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500">
            <CoinIcon className="h-3.5 w-3.5 text-teal-600" />
            Maintenance cost data feeds directly into your cost reports.
          </p>
        )}
        </div>
      </div>

      {/* slide-in panel: create / edit / history */}
      {panel && (
        <div className="fixed inset-0 z-40">
          <div className="animate-overlay-in absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={() => setPanel(null)} />
          <div className="animate-panel-in absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
            {panel.mode === 'history' ? (
              <HistoryPanel dbVehicles={dbVehicles} vehicleReg={panel.reg} records={records} onClose={() => setPanel(null)} />
            ) : (
              <RecordPanel dbVehicles={dbVehicles} editing={panel.mode === 'edit' ? panel.record : null} records={records} onCancel={() => setPanel(null)} onSave={saveRecord} />
            )}
          </div>
        </div>
      )}

      {closing && <CloseModal record={closing} onClose={() => setClosing(null)} onConfirm={(notes) => closeRecord(closing.id, notes)} />}
    </div>
  )
}
