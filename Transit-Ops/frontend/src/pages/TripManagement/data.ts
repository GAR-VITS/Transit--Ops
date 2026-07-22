export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled'

export type Trip = {
  id: string // e.g. #1023
  source: string
  destination: string
  vehicleReg: string
  driverName: string
  cargoKg: number
  distanceKm: number
  status: TripStatus
  date: string // planned date, ISO
  time?: string // planned time, e.g. "09:00"
  ownedBySelf?: boolean // created by / assigned to the logged-in driver
  sourceLat?: number | null
  sourceLng?: number | null
  destLat?: number | null
  destLng?: number | null
}


export const TRIP_STATUS_STYLES: Record<TripStatus, string> = {
  Draft: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  Dispatched: 'bg-navy-100 text-navy-800 ring-navy-700/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Cancelled: 'bg-red-50 text-red-600 ring-red-600/20',
}

export const TRIP_STATUSES: TripStatus[] = ['Draft', 'Dispatched', 'Completed', 'Cancelled']

export const TRIPS: Trip[] = [
  { id: '#1042', source: 'Depot North', destination: 'Region B Hub', vehicleReg: 'MH-12-CX-9087', driverName: 'Marco Vidal', cargoKg: 980, distanceKm: 342, status: 'Dispatched', date: '2026-07-11', ownedBySelf: true },
  { id: '#1041', source: 'Depot East', destination: 'Region A Yard', vehicleReg: 'MH-04-CT-1102', driverName: 'Aisha Khan', cargoKg: 4200, distanceKm: 128, status: 'Dispatched', date: '2026-07-11' },
  { id: '#1039', source: 'Region C Depot', destination: 'Port Gateway', vehicleReg: 'HR-26-TX-9981', driverName: 'Priya Suresh', cargoKg: 9800, distanceKm: 511, status: 'Dispatched', date: '2026-07-10' },
  { id: '#1036', source: 'Depot North', destination: 'Region D Center', vehicleReg: 'RJ-14-AB-1234', driverName: 'Marco Vidal', cargoKg: 620, distanceKm: 205, status: 'Draft', date: '2026-07-12', ownedBySelf: true },
  { id: '#1035', source: 'Depot South', destination: 'Region B Hub', vehicleReg: 'DL-01-PA-7765', driverName: 'Lena Osei', cargoKg: 6800, distanceKm: 289, status: 'Draft', date: '2026-07-12' },
  { id: '#1030', source: 'Region A Yard', destination: 'Depot East', vehicleReg: 'RJ-14-AB-8890', driverName: 'Sofia Alvarez', cargoKg: 1150, distanceKm: 96, status: 'Completed', date: '2026-07-08' },
  { id: '#1028', source: 'Depot North', destination: 'Region C Depot', vehicleReg: 'DL-08-CA-3320', driverName: 'Nadia Patel', cargoKg: 320, distanceKm: 174, status: 'Completed', date: '2026-07-07' },
  { id: '#1024', source: 'Port Gateway', destination: 'Depot South', vehicleReg: 'GJ-18-TR-5540', driverName: 'Priya Suresh', cargoKg: 24500, distanceKm: 402, status: 'Completed', date: '2026-07-05' },
  { id: '#1021', source: 'Depot East', destination: 'Region D Center', vehicleReg: 'TN-22-BK-3391', driverName: 'Marco Vidal', cargoKg: 80, distanceKm: 44, status: 'Cancelled', date: '2026-07-04', ownedBySelf: true },
  { id: '#1018', source: 'Region B Hub', destination: 'Depot North', vehicleReg: 'MH-04-CT-1102', driverName: 'Aisha Khan', cargoKg: 3900, distanceKm: 231, status: 'Completed', date: '2026-07-02' },
]

export function nextTripId(existing: Trip[]): string {
  const max = existing.reduce((m, t) => {
    const n = parseInt(t.id.replace('#', ''), 10)
    return Number.isNaN(n) ? m : Math.max(m, n)
  }, 1000)
  return `#${max + 1}`
}

export function formatTripDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
