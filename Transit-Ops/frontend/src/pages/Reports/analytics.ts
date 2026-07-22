import { VEHICLES } from '../VehicleRegistry/data'
import { TRIPS } from '../TripManagement/data'
import { ENTRIES } from '../FuelExpense/data'
import { MAINT_RECORDS } from '../MaintenanceLog/data'
import { DRIVERS, licenseState, type LicenseState } from '../DriverManagement/data'

const REVENUE_PER_KM = 62 // ₹ notional freight revenue per km

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export type VehicleMetrics = {
  reg: string
  model: string
  distanceKm: number
  fuelL: number
  efficiency: number // km/L
  fuelCost: number
  maintCost: number
  otherCost: number
  totalCost: number
  revenue: number
  acquisition: number
  roi: number // percent
  daysActive: number
  daysIdle: number
  utilization: number // percent
  status: string
}

const WINDOW = 30

export const vehicleMetrics: VehicleMetrics[] = VEHICLES.map((v) => {
  const trips = TRIPS.filter((t) => t.vehicleReg === v.reg && t.status !== 'Cancelled')
  const distanceKm = trips.reduce((s, t) => s + t.distanceKm, 0)
  const fuelEntries = ENTRIES.filter((e) => e.vehicleReg === v.reg && e.kind === 'Fuel')
  const fuelL = fuelEntries.reduce((s, e) => s + (e.liters ?? 0), 0)
  const fuelCost = fuelEntries.reduce((s, e) => s + e.costInr, 0)
  const otherCost = ENTRIES.filter((e) => e.vehicleReg === v.reg && e.kind === 'Expense').reduce((s, e) => s + e.costInr, 0)
  const maintCost = MAINT_RECORDS.filter((m) => m.vehicleReg === v.reg).reduce((s, m) => s + m.costInr, 0)
  const totalCost = fuelCost + maintCost + otherCost
  const revenue = Math.round(distanceKm * REVENUE_PER_KM)
  const roi = v.costInr > 0 ? ((revenue - (maintCost + fuelCost)) / v.costInr) * 100 : 0

  const base = v.status === 'On Trip' ? 24 : v.status === 'Available' ? 16 : v.status === 'In Shop' ? 6 : 0
  const daysActive = v.status === 'Retired' ? 0 : Math.min(WINDOW, base + (hash(v.reg) % 5))
  const daysIdle = WINDOW - daysActive

  return {
    reg: v.reg,
    model: v.model,
    distanceKm,
    fuelL,
    efficiency: fuelL > 0 ? Math.round((distanceKm / fuelL) * 100) / 100 : 0,
    fuelCost,
    maintCost,
    otherCost,
    totalCost,
    revenue,
    acquisition: v.costInr,
    roi: Math.round(roi * 10) / 10,
    daysActive,
    daysIdle,
    utilization: Math.round((daysActive / WINDOW) * 100),
    status: v.status,
  }
})

/* ---------- fleet-level KPIs ---------- */

const withFuel = vehicleMetrics.filter((m) => m.fuelL > 0)
const nonRetired = vehicleMetrics.filter((m) => m.status !== 'Retired')

export const kpis = {
  avgEfficiency: withFuel.length ? Math.round((withFuel.reduce((s, m) => s + m.efficiency, 0) / withFuel.length) * 100) / 100 : 0,
  fleetUtilization: nonRetired.length ? Math.round(nonRetired.reduce((s, m) => s + m.utilization, 0) / nonRetired.length) : 0,
  totalOperationalCost: vehicleMetrics.reduce((s, m) => s + m.totalCost, 0),
  avgRoi: nonRetired.length ? Math.round((nonRetired.reduce((s, m) => s + m.roi, 0) / nonRetired.length) * 10) / 10 : 0,
}

/* ---------- fleet utilization breakdown (donut) ---------- */

const bucket = (s: string) => (s === 'On Trip' ? 'Active' : s === 'Available' ? 'Idle' : s)
export const fleetBreakdown = [
  { name: 'Active', color: '#3a6497' },
  { name: 'Idle', color: '#10b981' },
  { name: 'In Shop', color: '#f59e0b' },
  { name: 'Retired', color: '#94a3b8' },
].map((b) => ({ ...b, value: VEHICLES.filter((v) => bucket(v.status) === b.name).length })).filter((b) => b.value > 0)

/* ---------- combined 90-day trend (overview + utilization tabs) ---------- */

export type TrendPoint = { day: string; utilization: number; efficiency: number; costIndex: number }
export const combinedTrend: TrendPoint[] = Array.from({ length: 90 }, (_, i) => {
  const util = 62 + Math.sin(i / 6) * 8 + i * 0.12
  const eff = 6.4 + Math.cos(i / 7) * 0.8 + i * 0.006
  const cost = 70 + Math.sin(i / 4.5) * 14 + Math.cos(i / 9) * 6
  const d = new Date('2026-07-12')
  d.setDate(d.getDate() - (89 - i))
  return {
    day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    utilization: Math.round(Math.min(94, util) * 10) / 10,
    efficiency: Math.round(eff * 100) / 100,
    costIndex: Math.round(cost),
  }
})

/* ---------- compliance (safety officer) ---------- */

export type ComplianceRow = {
  name: string
  license: string
  licenseState: LicenseState
  expiry: string
  safety: number
  lastTrip: string
}

function lastTripFor(name: string): string {
  const dates = TRIPS.filter((t) => t.driverName === name).map((t) => t.date).sort()
  return dates.length ? dates[dates.length - 1] : '—'
}

export const complianceRows: ComplianceRow[] = DRIVERS.map((d) => ({
  name: d.name,
  license: d.license,
  licenseState: licenseState(d.expiry),
  expiry: d.expiry,
  safety: d.safety,
  lastTrip: lastTripFor(d.name),
})).sort((a, b) => a.safety - b.safety)

export const licenseWatch = complianceRows.filter((r) => r.licenseState !== 'Valid')

export const safetyDistribution = [
  { band: '90–100', min: 90, max: 100 },
  { band: '80–89', min: 80, max: 89 },
  { band: '70–79', min: 70, max: 79 },
  { band: '60–69', min: 60, max: 69 },
  { band: 'Below 60', min: 0, max: 59 },
].map((b) => ({ band: b.band, count: DRIVERS.filter((d) => d.safety >= b.min && d.safety <= b.max).length }))
