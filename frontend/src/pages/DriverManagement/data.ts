export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'
export type LicenseCategory = 'LMV' | 'HMV' | 'MCWG' | 'Trailer'
export type LicenseState = 'Valid' | 'Expiring Soon' | 'Expired'

export type Driver = {
  id: string
  name: string
  license: string
  category: LicenseCategory
  expiry: string // ISO yyyy-mm-dd
  contact: string
  safety: number // 0-100
  status: DriverStatus
  self?: boolean // the logged-in driver's own record
}

export const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'On Trip': 'bg-navy-100 text-navy-800 ring-navy-700/20',
  'Off Duty': 'bg-slate-100 text-slate-500 ring-slate-500/20',
  Suspended: 'bg-red-50 text-red-600 ring-red-600/20',
}

export const DRIVER_STATUSES: DriverStatus[] = ['Available', 'On Trip', 'Off Duty', 'Suspended']
export const LICENSE_CATEGORIES: LicenseCategory[] = ['LMV', 'HMV', 'MCWG', 'Trailer']

// App "today" — matches the environment date so expiry math is stable.
export const TODAY = new Date('2026-07-12')

export function daysToExpiry(iso: string): number {
  const d = new Date(iso)
  return Math.round((d.getTime() - TODAY.getTime()) / 86_400_000)
}

export function licenseState(iso: string): LicenseState {
  const d = daysToExpiry(iso)
  if (d < 0) return 'Expired'
  if (d <= 30) return 'Expiring Soon'
  return 'Valid'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const DRIVERS: Driver[] = [
  { id: 'd1', name: 'Marco Vidal', license: 'DL-0420110149646', category: 'HMV', expiry: '2027-03-18', contact: '+91 98200 11234', safety: 95, status: 'On Trip', self: true },
  { id: 'd2', name: 'Lena Osei', license: 'MH-1220090034512', category: 'HMV', expiry: '2028-01-09', contact: '+91 99870 55420', safety: 98, status: 'Available' },
  { id: 'd3', name: 'Jonas Berg', license: 'KA-0520120078841', category: 'Trailer', expiry: '2026-07-16', contact: '+91 90080 22119', safety: 61, status: 'Available' },
  { id: 'd4', name: 'Ravi Menon', license: 'TN-2220110045590', category: 'HMV', expiry: '2026-07-21', contact: '+91 97410 88203', safety: 68, status: 'Off Duty' },
  { id: 'd5', name: 'Sofia Alvarez', license: 'DL-0120150091120', category: 'LMV', expiry: '2027-11-02', contact: '+91 98111 30945', safety: 91, status: 'Available' },
  { id: 'd6', name: 'Tomás Reyes', license: 'GJ-1820100067730', category: 'HMV', expiry: '2026-06-28', contact: '+91 90990 44521', safety: 74, status: 'Suspended' },
  { id: 'd7', name: 'Aisha Khan', license: 'UP-3220130052218', category: 'LMV', expiry: '2026-07-28', contact: '+91 96500 77340', safety: 83, status: 'On Trip' },
  { id: 'd8', name: 'Nadia Patel', license: 'RJ-1420140088890', category: 'MCWG', expiry: '2026-08-09', contact: '+91 98290 61200', safety: 79, status: 'Available' },
  { id: 'd9', name: 'Jonas Berg Jr.', license: 'MH-0420160011021', category: 'LMV', expiry: '2025-12-30', contact: '+91 90040 33110', safety: 47, status: 'Off Duty' },
  { id: 'd10', name: 'Priya Suresh', license: 'KA-5120170066740', category: 'HMV', expiry: '2029-04-14', contact: '+91 90190 12233', safety: 88, status: 'Available' },
]

export const driverTrips = [
  { id: 'T-1042', route: 'Depot North → Region B', date: 'Jul 09', km: 342 },
  { id: 'T-1018', route: 'Region A → Depot East', date: 'Jul 05', km: 128 },
  { id: 'T-0987', route: 'Depot North → Region D', date: 'Jul 01', km: 511 },
]

// 8-week safety score trend per driver (deterministic from base score)
export function safetyTrend(base: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const wobble = Math.round(Math.sin(i * 1.3) * 4 + (i - 3.5) * 0.6)
    return { week: `W${i + 1}`, score: Math.max(30, Math.min(100, base - 6 + i + wobble)) }
  })
}
