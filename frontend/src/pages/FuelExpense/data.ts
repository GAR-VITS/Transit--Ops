export type EntryKind = 'Fuel' | 'Expense'
export type ExpenseType = 'Toll' | 'Parking' | 'Fine' | 'Other'
export type EntryType = 'Fuel' | ExpenseType | 'Maintenance-linked'

export type Entry = {
  id: string
  date: string // ISO
  vehicleReg: string
  kind: EntryKind
  type: EntryType
  liters?: number // fuel only
  description?: string // expense only
  costInr: number
  loggedBy: string
  ownedBySelf?: boolean // logged by the current driver
  proofImage?: string // base64 image data
  source?: string // e.g. 'Auto-logged from Trip #abc123' for auto-generated entries
}

export const EXPENSE_TYPES: ExpenseType[] = ['Toll', 'Parking', 'Fine', 'Other']
export const ENTRY_TYPE_FILTERS = ['All', 'Fuel', 'Toll', 'Maintenance-linked', 'Other'] as const

// Tag colours: Blue (Fuel), Orange (Toll), Grey (everything else).
export const TYPE_TAG_STYLES: Record<string, string> = {
  Fuel: 'bg-navy-100 text-navy-800 ring-navy-700/20',
  Toll: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  default: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}
export const tagStyle = (type: EntryType) => TYPE_TAG_STYLES[type] ?? TYPE_TAG_STYLES.default

// The logged-in driver (matches Marco Vidal in dashboard/drivers data).
export const SELF_USER = 'Marco Vidal'

export const ENTRIES: Entry[] = [
  { id: 'E-820', date: '2026-07-11', vehicleReg: 'MH-12-CX-9087', kind: 'Fuel', type: 'Fuel', liters: 62, costInr: 6510, loggedBy: 'Marco Vidal', ownedBySelf: true },
  { id: 'E-818', date: '2026-07-11', vehicleReg: 'MH-04-CT-1102', kind: 'Fuel', type: 'Fuel', liters: 88, costInr: 9240, loggedBy: 'Ops Desk' },
  { id: 'E-815', date: '2026-07-10', vehicleReg: 'HR-26-TX-9981', kind: 'Fuel', type: 'Fuel', liters: 140, costInr: 14700, loggedBy: 'Ops Desk' },
  { id: 'E-812', date: '2026-07-10', vehicleReg: 'MH-12-CX-9087', kind: 'Expense', type: 'Toll', description: 'NH-48 toll plaza — Region B corridor', costInr: 640, loggedBy: 'Marco Vidal', ownedBySelf: true },
  { id: 'E-809', date: '2026-07-09', vehicleReg: 'KA-05-MN-4412', kind: 'Expense', type: 'Maintenance-linked', description: 'Water pump repair (Ref M-412)', costInr: 42800, loggedBy: 'R. Menon' },
  { id: 'E-805', date: '2026-07-08', vehicleReg: 'DL-01-PA-7765', kind: 'Fuel', type: 'Fuel', liters: 75, costInr: 7875, loggedBy: 'Ops Desk' },
  { id: 'E-802', date: '2026-07-08', vehicleReg: 'RJ-14-AB-1234', kind: 'Fuel', type: 'Fuel', liters: 34, costInr: 3570, loggedBy: 'Marco Vidal', ownedBySelf: true },
  { id: 'E-799', date: '2026-07-07', vehicleReg: 'GJ-18-TR-5540', kind: 'Expense', type: 'Toll', description: 'Inter-state permit + toll — Port Gateway run', costInr: 2150, loggedBy: 'Ops Desk' },
  { id: 'E-795', date: '2026-07-06', vehicleReg: 'MH-04-CT-1102', kind: 'Expense', type: 'Parking', description: 'Overnight yard parking — Region A', costInr: 300, loggedBy: 'Aisha Khan' },
  { id: 'E-791', date: '2026-07-05', vehicleReg: 'HR-26-TX-9981', kind: 'Expense', type: 'Fine', description: 'Overload penalty — corrected at weighbridge', costInr: 5000, loggedBy: 'Ops Desk' },
  { id: 'E-788', date: '2026-07-05', vehicleReg: 'DL-08-CA-3320', kind: 'Fuel', type: 'Fuel', liters: 0, description: 'EV charge — 41 kWh', costInr: 410, loggedBy: 'Ops Desk' },
  { id: 'E-784', date: '2026-07-04', vehicleReg: 'TN-22-BK-3391', kind: 'Fuel', type: 'Fuel', liters: 0, description: 'E-bike charge', costInr: 60, loggedBy: 'Marco Vidal', ownedBySelf: true },
  { id: 'E-780', date: '2026-07-03', vehicleReg: 'GJ-18-TR-5540', kind: 'Fuel', type: 'Fuel', liters: 210, costInr: 22050, loggedBy: 'Ops Desk' },
  { id: 'E-776', date: '2026-07-02', vehicleReg: 'KA-05-MN-4412', kind: 'Fuel', type: 'Fuel', liters: 96, costInr: 10080, loggedBy: 'Ops Desk' },
  { id: 'E-772', date: '2026-07-01', vehicleReg: 'MH-12-CX-9087', kind: 'Expense', type: 'Other', description: 'Windshield washer + AdBlue top-up', costInr: 480, loggedBy: 'Marco Vidal', ownedBySelf: true },
]

export function nextEntryId(existing: Entry[]): string {
  const max = existing.reduce((m, e) => {
    const n = parseInt(e.id.replace('E-', ''), 10)
    return Number.isNaN(n) ? m : Math.max(m, n)
  }, 700)
  return `E-${max + 1}`
}

export function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Detail cell text: fuel shows liters/charge, expense shows its description.
export function entryDetail(e: Entry): string {
  if (e.kind === 'Fuel') return e.liters && e.liters > 0 ? `${e.liters} liters` : e.description || 'Charge'
  return e.description || e.type
}
