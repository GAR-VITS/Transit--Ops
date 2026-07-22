export type MaintStatus = 'Active' | 'Closed'

export type ServiceType =
  | 'Oil Change'
  | 'Tire Replacement'
  | 'Brake Service'
  | 'Engine Repair'
  | 'General Inspection'
  | 'Other'

export type MaintRecord = {
  id: string
  vehicleReg: string
  service: ServiceType
  description: string
  costInr: number
  date: string // ISO, date created
  status: MaintStatus
  closedNotes?: string
}

export const SERVICE_TYPES: ServiceType[] = [
  'Oil Change',
  'Tire Replacement',
  'Brake Service',
  'Engine Repair',
  'General Inspection',
  'Other',
]

export const MAINT_STATUS_STYLES: Record<MaintStatus, string> = {
  Active: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Closed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

// Active records reference vehicles currently 'In Shop' in vehicles/data
// (v3 KA-05-MN-4412, v10 KA-51-BZ-6674) so the status linkage reads true.
export const MAINT_RECORDS: MaintRecord[] = [
  { id: 'M-412', vehicleReg: 'KA-05-MN-4412', service: 'Engine Repair', description: 'Coolant leak from water pump; overheating on long hauls.', costInr: 42800, date: '2026-07-09', status: 'Active' },
  { id: 'M-409', vehicleReg: 'KA-51-BZ-6674', service: 'Brake Service', description: 'Rear disc brake pads worn past service limit.', costInr: 5600, date: '2026-07-08', status: 'Active' },
  { id: 'M-401', vehicleReg: 'MH-04-CT-1102', service: 'Tire Replacement', description: 'Front pair replaced — uneven tread wear.', costInr: 18400, date: '2026-07-05', status: 'Closed', closedNotes: 'Wheel alignment corrected. Cleared for dispatch.' },
  { id: 'M-397', vehicleReg: 'RJ-14-AB-1234', service: 'Oil Change', description: 'Scheduled 48k km service — engine oil + filter.', costInr: 3200, date: '2026-07-03', status: 'Closed', closedNotes: 'Routine service completed.' },
  { id: 'M-390', vehicleReg: 'DL-01-PA-7765', service: 'General Inspection', description: 'Pre-monsoon fitness inspection.', costInr: 2100, date: '2026-06-28', status: 'Closed', closedNotes: 'Passed. No action required.' },
  { id: 'M-384', vehicleReg: 'KA-05-MN-4412', service: 'Brake Service', description: 'Air brake chamber replacement.', costInr: 11500, date: '2026-06-22', status: 'Closed', closedNotes: 'Brake test passed.' },
  { id: 'M-379', vehicleReg: 'GJ-18-TR-5540', service: 'Tire Replacement', description: 'Two trailer tyres replaced after puncture damage.', costInr: 26800, date: '2026-06-18', status: 'Closed', closedNotes: 'Restored to service.' },
  { id: 'M-371', vehicleReg: 'RJ-14-AB-8890', service: 'Oil Change', description: 'Engine oil, oil filter, air filter.', costInr: 3900, date: '2026-06-11', status: 'Closed', closedNotes: 'Done.' },
  { id: 'M-366', vehicleReg: 'MH-12-CX-9087', service: 'Engine Repair', description: 'Turbocharger actuator fault fixed.', costInr: 33400, date: '2026-06-04', status: 'Closed', closedNotes: 'Test drive OK.' },
  { id: 'M-358', vehicleReg: 'HR-26-TX-9981', service: 'General Inspection', description: 'Annual roadworthiness inspection.', costInr: 2400, date: '2026-05-29', status: 'Closed', closedNotes: 'Certificate issued.' },
  { id: 'M-351', vehicleReg: 'KA-51-BZ-6674', service: 'Other', description: 'Battery pack diagnostics and firmware update.', costInr: 1800, date: '2026-05-20', status: 'Closed', closedNotes: 'Firmware updated.' },
  { id: 'M-344', vehicleReg: 'DL-08-CA-3320', service: 'Oil Change', description: 'EV coolant top-up and brake fluid check.', costInr: 1500, date: '2026-05-12', status: 'Closed', closedNotes: 'Complete.' },
]

export function nextMaintId(existing: MaintRecord[]): string {
  const max = existing.reduce((m, r) => {
    const n = parseInt(r.id.replace('M-', ''), 10)
    return Number.isNaN(n) ? m : Math.max(m, n)
  }, 300)
  return `M-${max + 1}`
}

export function formatMaintDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
