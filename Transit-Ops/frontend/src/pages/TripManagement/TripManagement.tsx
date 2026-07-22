import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import useAuth from '../../hooks/useAuth'
import { tripService } from '../../services/tripService'
import { vehicleService } from '../../services/vehicleService'
import { driverService } from '../../services/driverService'
import { sortVehiclesForSmartMatch, sortDriversForSmartMatch } from '../../utils/smartMatch'
import TripDetailPanel from '../../components/TripDetailPanel'
import LocationPicker from '../../components/common/LocationPicker'
import {
  SearchIcon,
  PlusIcon,
  XIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  ArrowRightIcon,
  AlertIcon,
  CheckIcon,
} from '../Dashboard/icons'
import { type RoleId } from '../Dashboard/data'

const licenseState = (expiry: string) => {
  const exp = new Date(expiry).getTime();
  const now = Date.now();
  const diff = (exp - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'Expired';
  if (diff < 30) return 'Expiring Soon';
  return 'Valid';
}
import {
  TRIPS,
  TRIP_STATUS_STYLES,
  TRIP_STATUSES,
  nextTripId,
  formatTripDate,
  type Trip,
  type TripStatus,
} from './data'

const PAGE_SIZE = 8

/* ---------- validation shared by dispatch + create ---------- */

function tripBlockers(vehicleId: string, driverId: string, cargoKg: number, dbVehicles: any[], dbDrivers: any[]): string[] {
    const reasons: string[] = []
    const vehicle = dbVehicles.find((v) => v.id === vehicleId)
    const driver = dbDrivers.find((d) => d.id === driverId)
    if (vehicle && vehicle.capacity && cargoKg > vehicle.capacity)
      reasons.push(`Cargo weight exceeds capacity (${vehicle.capacity} kg)`)
    if (driver && driver.expiry && licenseState(driver.expiry) === 'Expired') reasons.push("Selected driver's license has expired")
    if (driver && !driver.isActive) reasons.push('Selected driver is suspended')
    return reasons
  }

/* ---------- small pieces ---------- */

function StatusPill({ status }: { status: TripStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${TRIP_STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
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

function FormField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-navy-900">{label}</label>
      {children}
      {hint && !error && <p className="text-[11.5px] text-teal-700">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

/* ---------- Create Trip panel ---------- */

type CreateState = { source: string; destination: string; vehicleType: string; vehicleReg: string; driverName: string; cargoKg: string; distanceKm: string; date: string; time: string }

function CreateTripPanel({ existing, dbVehicles, dbDrivers, user, onCancel, onSave }: { existing: Trip[]; dbVehicles: any[]; dbDrivers: any[]; user: any; onCancel: () => void; onSave: (t: Trip, dispatch: boolean) => void }) {
  const isDriver = user?.role === 'DRIVER'
  
  const [form, setForm] = useState<CreateState>({ source: '', destination: '', vehicleType: '', vehicleReg: '', driverName: isDriver ? user.id : '', cargoKg: '', distanceKm: '', date: new Date().toISOString().slice(0, 10), time: '09:00' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const set = (k: keyof CreateState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Location picker coordinate state
  const [sourceCoords, setSourceCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceAutoMode, setDistanceAutoMode] = useState(true) // true = read-only auto-calc, false = manual fallback
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null)

  // Compute available vehicle types from dbVehicles
  const vehicleTypes = useMemo(() => Array.from(new Set(dbVehicles.map(v => v.type).filter(Boolean))), [dbVehicles])
  
  // Filter vehicles by selected type and ensure they are available on the selected date
  const availableVehicles = useMemo(() => {
    let eligible = dbVehicles.filter(v => v.status !== 'RETIRED' && v.status !== 'Retired' && v.status !== 'IN_SHOP' && v.status !== 'In Shop')
    
    const busyVehicleIds = new Set(
      existing
        .filter(t => t.date === form.date && (t.status === 'Draft' || t.status === 'Dispatched'))
        .map(t => t.vehicleReg)
    )

    let filtered = eligible.filter(v => !busyVehicleIds.has(v.id) && !busyVehicleIds.has(v.registrationNo))

    if (form.vehicleType) {
      filtered = filtered.filter(v => v.type === form.vehicleType)
    }
    return filtered
  }, [dbVehicles, form.vehicleType, form.date, existing])

  const availableDrivers = useMemo(() => {
    const busyDriverIds = new Set(
      existing
        .filter(t => t.date === form.date && (t.status === 'Draft' || t.status === 'Dispatched'))
        .map(t => t.driverName)
    )
    return dbDrivers.filter((d) => d.isActive && !busyDriverIds.has(d.id))
  }, [dbDrivers, form.date, existing])

  const smartVehicles = useMemo(() => sortVehiclesForSmartMatch(availableVehicles, form.cargoKg), [availableVehicles, form.cargoKg])
  const smartDrivers = useMemo(() => {
    if (!form.vehicleReg) return availableDrivers;
    return sortDriversForSmartMatch(availableDrivers);
  }, [availableDrivers, form.vehicleReg])

  const selectedVehicle = dbVehicles.find((v) => v.id === form.vehicleReg)
  const cargoNum = Number(form.cargoKg)
  const capacity = selectedVehicle?.capacity || 5000 // Fallback if missing
  const cargoOver = !!selectedVehicle && form.cargoKg !== '' && cargoNum > capacity

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.source.trim()) e.source = 'Source is required.'
    if (!form.destination.trim()) e.destination = 'Destination is required.'
    if (!form.vehicleReg) e.vehicleReg = 'Select a vehicle.'
    if (!form.driverName) e.driverName = 'Select a driver.'
    if (form.cargoKg === '') e.cargoKg = 'Cargo weight is required.'
    else if (cargoNum < 0) e.cargoKg = 'Value cannot be negative.'
    else if (cargoOver) e.cargoKg = `⚠️ Exceeds vehicle's max capacity (${capacity.toLocaleString('en-IN')} kg)`
    if (form.distanceKm === '') e.distanceKm = 'Planned distance is required.'
    else if (Number(form.distanceKm) < 0) e.distanceKm = 'Value cannot be negative.'
    if (!form.date) e.date = 'Date is required.'
    if (!form.time) e.time = 'Time is required.'
    return e
  }, [form, cargoNum, cargoOver, selectedVehicle])

  const requiredFilled = form.source && form.destination && form.vehicleReg && form.driverName && form.cargoKg !== '' && form.distanceKm !== '' && form.date && form.time
  const blockers = form.vehicleReg && form.driverName && form.cargoKg !== '' ? tripBlockers(form.vehicleReg, form.driverName, cargoNum, dbVehicles, dbDrivers) : []
  const canDispatch = Object.keys(errors).length === 0 && blockers.length === 0

  function build(): Trip {
    return {
      id: nextTripId(existing),
      source: form.source.trim(),
      destination: form.destination.trim(),
      vehicleReg: form.vehicleReg,
      driverName: form.driverName,
      cargoKg: cargoNum,
      distanceKm: Number(form.distanceKm),
      status: 'Draft',
      date: form.date,
      time: form.time,
      ownedBySelf: true,
      sourceLat: sourceCoords?.lat,
      sourceLng: sourceCoords?.lng,
      destLat: destCoords?.lat,
      destLng: destCoords?.lng,
    }
  }

  function saveDraft() {
    setTouched({ source: true, destination: true, vehicleReg: true, driverName: true, cargoKg: true, distanceKm: true, date: true, time: true })
    // A draft may be saved even if cargo exceeds capacity (it stays a Draft
    // and can't be dispatched until fixed), but other fields must be valid.
    const draftErrors = { ...errors }
    if (cargoOver) delete draftErrors.cargoKg
    if (Object.keys(draftErrors).length > 0) return
    onSave(build(), false)
  }

  function createDispatch() {
    setTouched({ source: true, destination: true, vehicleReg: true, driverName: true, cargoKg: true, distanceKm: true, date: true, time: true })
    if (!canDispatch) return
    onSave({ ...build(), status: 'Dispatched' }, true)
  }

  const err = (k: string) => (touched[k] ? errors[k] : undefined)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="text-[18px] font-bold text-navy-950">Create Trip</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Dropdowns show only available, eligible resources.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {/* Location Picker — replaces plain text Source/Destination */}
        <LocationPicker
          source={form.source}
          destination={form.destination}
          onSourceChange={(text, coords) => {
            set('source', text)
            if (coords) setSourceCoords(coords)
            else {
              setSourceCoords(null)
              // Reset distance if source changed manually
              if (distanceAutoMode) set('distanceKm', '')
              setEstimatedDuration(null)
            }
            setTouched((t) => ({ ...t, source: true }))
          }}
          onDestinationChange={(text, coords) => {
            set('destination', text)
            if (coords) setDestCoords(coords)
            else {
              setDestCoords(null)
              if (distanceAutoMode) set('distanceKm', '')
              setEstimatedDuration(null)
            }
            setTouched((t) => ({ ...t, destination: true }))
          }}
          onRouteCalculated={(distanceKm, durationMinutes) => {
            set('distanceKm', String(distanceKm))
            setEstimatedDuration(durationMinutes)
            setDistanceAutoMode(true)
          }}
          onRouteFailed={() => {
            setDistanceAutoMode(false)
          }}
        />

        <FormField label="Vehicle Type" error={err('vehicleType')} hint="Filter vehicles by type (Optional)">
          <div className="relative">
            <select
              value={form.vehicleType}
              onChange={(e) => {
                set('vehicleType', e.target.value)
                set('vehicleReg', '') // Reset vehicle when type changes
              }}
              onBlur={() => setTouched((t) => ({ ...t, vehicleType: true }))}
              className={`h-11 w-full appearance-none rounded-lg border px-3.5 pr-9 text-[14px] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 border-slate-300 hover:border-slate-400 ${form.vehicleType ? 'text-navy-950' : 'text-slate-400'}`}
            >
              <option value="">All Vehicle Types</option>
              {vehicleTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>

        <FormField label="Vehicle" error={err('vehicleReg')} hint="Select a vehicle for this trip.">
          <div className="relative">
            <select
              value={form.vehicleReg}
              onChange={(e) => set('vehicleReg', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, vehicleReg: true }))}
              className={`h-11 w-full appearance-none rounded-lg border px-3.5 pr-9 text-[14px] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ${err('vehicleReg') ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'} ${form.vehicleReg ? 'text-navy-950' : 'text-slate-400'}`}
            >
              <option value="">Select a vehicle…</option>
              {smartVehicles.map((v, i) => {
                const isTopMatch = i === 0 && form.cargoKg && Number(form.cargoKg) > 0;
                return (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo || v.reg} — {v.type} ({v.make} {v.model}) - {v.capacity ? v.capacity.toLocaleString('en-IN') : '5,000'} kg
                    {isTopMatch ? ' ⭐ Best Fit' : ''}
                  </option>
                )
              })}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormField>

        {!isDriver && (
          <FormField label="Driver" error={err('driverName')} hint="Showing only available drivers with valid licenses.">
            <div className="relative">
              <select
                value={form.driverName}
                onChange={(e) => set('driverName', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, driverName: true }))}
                className={`h-11 w-full appearance-none rounded-lg border px-3.5 pr-9 text-[14px] outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ${err('driverName') ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'} ${form.driverName ? 'text-navy-950' : 'text-slate-400'}`}
              >
                <option value="">Select a driver…</option>
                {smartDrivers.map((d, i) => {
                  const isTopMatch = i === 0 && form.vehicleReg;
                  return (
                    <option key={d.id} value={d.id}>
                      {d.name} {isTopMatch ? ' ⭐ Recommended' : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cargo Weight" error={err('cargoKg')}>
            <div className="relative">
              <input type="number" className={`${inputCls(!!err('cargoKg'))} pr-10`} placeholder="0" value={form.cargoKg} onChange={(e) => set('cargoKg', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, cargoKg: true }))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">kg</span>
            </div>
          </FormField>
          <FormField label="Planned Distance" error={err('distanceKm')} hint={distanceAutoMode && form.distanceKm ? 'Calculated automatically based on selected route' : (!distanceAutoMode ? '⚠️ Unable to auto-calculate — enter manually' : undefined)}>
            <div className="relative">
              <input
                type="number"
                className={`${inputCls(!!err('distanceKm'))} pr-10 ${distanceAutoMode && form.distanceKm ? 'bg-slate-50 text-teal-700 font-semibold' : ''}`}
                placeholder="0"
                value={form.distanceKm}
                readOnly={distanceAutoMode && !!form.distanceKm}
                onChange={(e) => set('distanceKm', e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, distanceKm: true }))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">km</span>
            </div>
          </FormField>
        </div>
        {estimatedDuration && (
          <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[12.5px] text-teal-800">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
            Estimated Duration: <strong>{estimatedDuration >= 60 ? `${Math.floor(estimatedDuration / 60)}h ${estimatedDuration % 60}min` : `${estimatedDuration} min`}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Scheduled Date" error={err('date')}>
            <input type="date" className={inputCls(!!err('date'))} value={form.date} onChange={(e) => set('date', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, date: true }))} />
          </FormField>
          <FormField label="Scheduled Time" error={err('time')}>
            <input type="time" className={inputCls(!!err('time'))} value={form.time} onChange={(e) => set('time', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, time: true }))} />
          </FormField>
        </div>

        {/* validation summary */}
        {requiredFilled && blockers.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="text-[12.5px] text-red-700">
              <p className="font-semibold">Cannot dispatch</p>
              <ul className="mt-0.5 list-disc pl-4">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-slate-100 p-5">
        <button type="button" onClick={saveDraft} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
          Save as Draft
        </button>
        <button
          type="button"
          onClick={createDispatch}
          disabled={!canDispatch}
          className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          Create &amp; Dispatch
        </button>
      </div>
    </div>
  )
}

/* ---------- Complete modal ---------- */

function CompleteModal({ trip, onClose, onComplete }: { trip: Trip; onClose: () => void; onComplete: (revenue: number, fuelVolume: number, fuelCost: number, distanceCovered: number) => void }) {
  const [odo, setOdo] = useState<string>(trip.distanceKm ? String(trip.distanceKm) : '')
  const [fuel, setFuel] = useState('')
  const [fuelCost, setFuelCost] = useState('')
  const [revenue, setRevenue] = useState('')
  const [notes, setNotes] = useState('')
  const [touched, setTouched] = useState(false)
  const [fuelPrice, setFuelPrice] = useState<number>(130)
  const fuelCostManuallyEdited = useRef(false)

  useEffect(() => {
    fetch('/api/config/fuel-price', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.fuelPricePerLiter) {
          setFuelPrice(data.fuelPricePerLiter)
        }
      })
      .catch(err => console.error('Failed to fetch fuel price:', err))
  }, [])

  const handleFuelConsumedChange = (value: string) => {
    setFuel(value)
    if (!fuelCostManuallyEdited.current) {
      const num = Number(value)
      if (!isNaN(num)) {
        setFuelCost((num * fuelPrice).toFixed(2))
      } else {
        setFuelCost('')
      }
    }
  }

  const handleFuelCostChange = (value: string) => {
    fuelCostManuallyEdited.current = true
    setFuelCost(value)
  }

  const valid = odo !== '' && Number(odo) >= 0 && fuel !== '' && Number(fuel) >= 0 && revenue !== '' && Number(revenue) >= 0 && (fuel === '' || fuel === '0' || (fuelCost !== '' && Number(fuelCost) >= 0))

  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-navy-950">Complete Trip {trip.id}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-[12.5px] text-slate-500">
          {trip.source} → {trip.destination}
        </p>

        <div className="space-y-4">
          <FormField label="Revenue Earned" error={touched && (revenue === '' || Number(revenue) < 0) ? 'Enter a valid amount (0 for non-revenue trips).' : undefined} hint="This value feeds the Vehicle ROI calculation in Reports & Analytics">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-slate-400">₹</span>
              <input type="number" className={`${inputCls(touched && (revenue === '' || Number(revenue) < 0))} pl-8`} placeholder="Enter trip revenue" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
            </div>
          </FormField>
          <FormField label="Distance Covered" error={touched && (odo === '' || Number(odo) < 0) ? 'Enter a valid reading.' : undefined} hint="Auto-filled from planned route — adjust if actual distance differed">
            <div className="relative">
              <input type="number" className={`${inputCls(touched && (odo === '' || Number(odo) < 0))} pr-10`} placeholder="0" value={odo} onChange={(e) => setOdo(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">km</span>
            </div>
          </FormField>
          <FormField label="Fuel Consumed" error={touched && (fuel === '' || Number(fuel) < 0) ? 'Enter a valid amount.' : undefined}>
            <div className="relative">
              <input type="number" className={`${inputCls(touched && (fuel === '' || Number(fuel) < 0))} pr-14`} placeholder="0" value={fuel} onChange={(e) => handleFuelConsumedChange(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-400">liters</span>
            </div>
          </FormField>
          <FormField label="Fuel Cost" error={touched && Number(fuel) > 0 && (fuelCost === '' || Number(fuelCost) < 0) ? 'Enter the cost of fuel for this trip.' : undefined} hint={`Estimated at ₹${fuelPrice}/liter — adjust if the actual price differed`}>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-slate-400">₹</span>
              <input type="number" className={`${inputCls(touched && Number(fuel) > 0 && (fuelCost === '' || Number(fuelCost) < 0))} pl-8`} placeholder="Cost of fuel for this trip" value={fuelCost} onChange={(e) => handleFuelCostChange(e.target.value)} />
            </div>
          </FormField>
          <FormField label="Notes (optional)">
            <textarea rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15" placeholder="Any observations from the trip…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-navy-50 px-3 py-2.5 text-[12px] text-navy-700">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          Completing this trip will automatically set Vehicle and Driver status back to Available.
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => {
              setTouched(true)
              if (valid) onComplete(Number(revenue), Number(fuel), Number(fuelCost || 0), Number(odo || 0))
            }}
            className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30"
          >
            Complete Trip
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ---------- Cancel modal ---------- */

function CancelModal({ trip, onClose, onConfirm }: { trip: Trip; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertIcon className="h-5 w-5" />
          </span>
          <h2 className="text-[17px] font-bold text-navy-950">Cancel trip {trip.id}?</h2>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">Cancel this trip? Vehicle and Driver will be restored to Available.</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
            Go Back
          </button>
          <button onClick={onConfirm} className="h-11 flex-1 rounded-lg bg-red-600 text-[14px] font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 focus-visible:ring-4 focus-visible:ring-red-500/30">
            Confirm Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="animate-overlay-in absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="animate-modal-in relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl">{children}</div>
    </div>
  )
}

/* ---------- Page ---------- */

export default function TripManagement() {
  const { user } = useAuth()
  const role = user?.role as RoleId
  const isDriver = role === 'DRIVER'
  const canCreate = role === 'ADMIN' || role === 'MANAGER' || role === 'DRIVER'
  const actsAllowed = (t: Trip) => role === 'ADMIN' || role === 'MANAGER' || (isDriver && t.ownedBySelf)

  const [trips, setTrips] = useState<Trip[]>([])
  const [dbVehicles, setDbVehicles] = useState<any[]>([])
  const [dbDrivers, setDbDrivers] = useState<any[]>([])

  const fetchAll = async () => {
    try {
      const [tRes, vRes, dRes] = await Promise.all([
        tripService.getAll(),
        vehicleService.getAll(),
        driverService.getAll()
      ])
      setDbVehicles(vRes.data)
      setDbDrivers(dRes.data)
      
      setTrips(tRes.data.map((t: any) => ({
        id: t.id,
        source: t.origin,
        destination: t.destination,
        vehicleReg: t.vehicle?.registrationNo || t.vehicleId,
        driverName: t.driver?.name || t.driverId,
        cargoKg: t.cargoWeight ?? 500,
        distanceKm: t.distance || 0,
        status: t.status === 'SCHEDULED' ? 'Draft' : t.status === 'IN_PROGRESS' ? 'Dispatched' : t.status === 'COMPLETED' ? 'Completed' : 'Cancelled',
        date: t.scheduledDate.substring(0,10),
        ownedBySelf: (t.driver?.id || t.driverId) === user?.id,
        sourceLat: t.sourceLat ?? null,
        sourceLng: t.sourceLng ?? null,
        destLat: t.destLat ?? null,
        destLng: t.destLng ?? null,
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [completing, setCompleting] = useState<Trip | null>(null)
  const [cancelling, setCancelling] = useState<Trip | null>(null)
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null)
  const canViewMap = role !== 'FINANCIAL_ANALYST'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return trips
      .filter((t) => (isDriver ? t.ownedBySelf : true))
      .filter((t) =>
        q ? [t.id, t.source, t.destination, t.driverName, t.vehicleReg].some((f) => f.toLowerCase().includes(q)) : true,
      )
      .filter((t) => (statusFilter === 'All' ? true : t.status === statusFilter))
      .filter((t) => (fromDate ? t.date >= fromDate : true))
      .filter((t) => (toDate ? t.date <= toDate : true))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }, [trips, query, statusFilter, fromDate, toDate, isDriver])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const to = Math.min(current * PAGE_SIZE, filtered.length)
  const resetPage = () => setPage(1)

  async function setStatus(id: string, status: TripStatus, revenue?: number, fuelVolume?: number, fuelCost?: number, distanceCovered?: number) {
    try {
      const mapped = status === 'Draft' ? 'SCHEDULED' : status === 'Dispatched' ? 'IN_PROGRESS' : status === 'Completed' ? 'COMPLETED' : 'CANCELLED'
      const payload: any = { status: mapped }
      if (mapped === 'COMPLETED') {
        if (revenue !== undefined) payload.revenue = revenue
        if (fuelVolume !== undefined) payload.fuelVolume = fuelVolume
        if (fuelCost !== undefined) payload.fuelCost = fuelCost
        if (distanceCovered !== undefined) payload.distanceCovered = distanceCovered
      }
      await tripService.update(id, payload)
      fetchAll()
    } catch (err) {
      console.error(err)
      alert("Failed to update trip")
    }
  }

  async function addTrip(t: Trip, dispatch: boolean) {
    try {
      const dateTimeString = `${t.date}T${t.time || '09:00'}:00.000Z`
      const payload: any = {
        origin: t.source,
        destination: t.destination,
        vehicleId: t.vehicleReg,
        driverId: t.driverName,
        distance: t.distanceKm,
        scheduledDate: new Date(dateTimeString).toISOString(),
        cargoWeight: t.cargoKg,
        status: dispatch ? 'IN_PROGRESS' : 'SCHEDULED'
      }
      // Include coordinates if available (from LocationPicker)
      if (t.sourceLat != null) payload.sourceLat = t.sourceLat
      if (t.sourceLng != null) payload.sourceLng = t.sourceLng
      if (t.destLat != null) payload.destLat = t.destLat
      if (t.destLng != null) payload.destLng = t.destLng

      await tripService.create(payload)
      setPanelOpen(false)
      fetchAll()
    } catch (err) {
      console.error(err)
      alert("Failed to create trip")
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div>
          <h1 className="text-[20px] font-bold text-navy-950">Trip Management</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Track and dispatch vehicle journeys.</p>
        </div>
        {canCreate && (
          <button onClick={() => setPanelOpen(true)} className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-4 text-[13.5px] font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700">
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Create Trip</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5 sm:p-8">
        <div className="mx-auto w-full max-w-[1000px] rounded-xl border border-slate-200 bg-white shadow-xl shadow-navy-900/[0.04]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative flex-1 sm:max-w-xs">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search trips…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); resetPage() }}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-navy-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
                />
              </div>
              <Dropdown label="Status" value={statusFilter} options={['All', ...TRIP_STATUSES]} onChange={(v) => { setStatusFilter(v); resetPage() }} />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">From</span>
                <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); resetPage() }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-navy-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 sm:w-36" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">To</span>
                <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); resetPage() }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-navy-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 sm:w-36" />
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
                <InboxIcon className="h-6 w-6" />
              </span>
              <p className="mt-4 text-[14px] font-medium text-navy-900">No trips found</p>
              <p className="mt-1 text-[13px] text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-[13px]">
                <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5 pl-6 font-medium">Trip ID &amp; Date</th>
                    <th className="px-4 py-3.5 font-medium">Route</th>
                    <th className="px-4 py-3.5 font-medium">Vehicle &amp; Driver</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 pr-6 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((t) => {
                    const blockers: string[] = [] // Backend handled
                    return (
                      <tr key={t.id} className={`transition hover:bg-slate-50/70 ${canViewMap ? 'cursor-pointer' : ''}`} onClick={() => canViewMap && setViewingTrip(t)}>
                        <td className="px-4 py-4 pl-6 align-top">
                          <p className="font-mono text-[13.5px] font-semibold text-navy-950">{t.id}</p>
                          <p className="mt-0.5 text-slate-500">{formatTripDate(t.date)}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-1.5 text-navy-900">
                            <span className="font-medium">{t.source}</span>
                            <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium">{t.destination}</span>
                          </div>
                          <p className="mt-1 text-[12px] text-slate-500">{(t.distanceKm || 0).toLocaleString()} km expected</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-navy-900">{t.vehicleReg}</p>
                          <p className="mt-0.5 text-[12px] text-slate-500">{t.driverName}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill status={t.status} />
                          {t.status === 'Draft' && blockers.length > 0 && (
                            <div className="mt-2 flex max-w-[180px] items-start gap-1.5 rounded bg-red-50 p-1.5 text-[11px] font-medium leading-tight text-red-600">
                              <AlertIcon className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{blockers[0]} {blockers.length > 1 && `+${blockers.length - 1} more`}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 pr-6 text-right align-top">
                          {actsAllowed(t) ? (
                            <div className="flex flex-col items-end gap-1.5">
                              {t.status === 'Draft' && (role === 'ADMIN' || role === 'MANAGER') && (
                                <button onClick={(e) => { e.stopPropagation(); setStatus(t.id, 'Dispatched') }} disabled={blockers.length > 0} className="rounded px-2 py-1 text-[12px] font-semibold text-teal-600 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent">Dispatch</button>
                              )}
                              {t.status === 'Dispatched' && (
                                <button onClick={(e) => { e.stopPropagation(); setCompleting(t) }} className="rounded px-2 py-1 text-[12px] font-semibold text-navy-600 transition hover:bg-navy-50">Complete</button>
                              )}
                              {(t.status === 'Draft' || t.status === 'Dispatched') && (role === 'ADMIN' || role === 'MANAGER') && (
                                <button onClick={(e) => { e.stopPropagation(); setCancelling(t) }} className="rounded px-2 py-1 text-[12px] font-semibold text-red-600 transition hover:bg-red-50">Cancel</button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400">—</span>
                          )}
                        </td>
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

      {/* create slide-in */}
      {panelOpen && (
        <div className="fixed inset-0 z-40">
          <div className="animate-overlay-in absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={() => setPanelOpen(false)} />
          <div className="animate-panel-in absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
            <CreateTripPanel existing={trips} dbVehicles={dbVehicles} dbDrivers={dbDrivers} user={user} onCancel={() => setPanelOpen(false)} onSave={addTrip} />
          </div>
        </div>
      )}

      {/* trip detail slide-in with route map */}
      {viewingTrip && (
        <div className="fixed inset-0 z-40">
          <div className="animate-overlay-in absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={() => setViewingTrip(null)} />
          <div className="animate-panel-in absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl">
            <TripDetailPanel trip={viewingTrip} onClose={() => setViewingTrip(null)} />
          </div>
        </div>
      )}

      {completing && <CompleteModal trip={completing} onClose={() => setCompleting(null)} onComplete={(rev, fuelVol, fuelCst, dist) => { setStatus(completing.id, 'Completed', rev, fuelVol, fuelCst, dist); setCompleting(null) }} />}
      {cancelling && <CancelModal trip={cancelling} onClose={() => setCancelling(null)} onConfirm={() => { setStatus(cancelling.id, 'Cancelled'); setCancelling(null) }} />}
    </div>
  )
}
