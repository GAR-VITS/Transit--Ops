import type { RoleId } from '../dashboard/data'

export type AccountRole = 'unassigned' | RoleId

export type User = {
  id: string
  name: string
  email: string
  role: AccountRole
  joined: string // ISO
  active: boolean
}

export const ROLE_OPTIONS: { id: AccountRole; label: string }[] = [
  { id: 'unassigned', label: 'Unassigned (Employee)' },
  { id: 'fleet_manager', label: 'Fleet Manager' },
  { id: 'driver', label: 'Driver' },
  { id: 'safety_officer', label: 'Safety Officer' },
  { id: 'financial_analyst', label: 'Financial Analyst' },
  { id: 'admin', label: 'Admin' },
]

export const ACCOUNT_ROLE_LABEL: Record<AccountRole, string> = {
  unassigned: 'Unassigned',
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
  admin: 'Admin',
}

// Distinct colour per role for quick scanning.
export const ROLE_PILL_STYLES: Record<AccountRole, string> = {
  unassigned: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  driver: 'bg-navy-100 text-navy-800 ring-navy-700/20',
  fleet_manager: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  safety_officer: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  financial_analyst: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  admin: 'bg-red-50 text-red-600 ring-red-600/20',
}

export const USERS: User[] = [
  { id: 'u1', name: 'Alex Reyes', email: 'alex.reyes@transitops.com', role: 'fleet_manager', joined: '2025-02-14', active: true },
  { id: 'u2', name: 'Marco Vidal', email: 'marco.vidal@transitops.com', role: 'driver', joined: '2025-04-02', active: true },
  { id: 'u3', name: 'Priya Nair', email: 'priya.nair@transitops.com', role: 'safety_officer', joined: '2025-03-21', active: true },
  { id: 'u4', name: 'Dana Kwon', email: 'dana.kwon@transitops.com', role: 'financial_analyst', joined: '2025-05-11', active: true },
  { id: 'u5', name: 'Sam Okafor', email: 'admin@transitops.com', role: 'admin', joined: '2024-11-30', active: true },
  { id: 'u6', name: 'Lena Osei', email: 'lena.osei@transitops.com', role: 'driver', joined: '2025-06-08', active: true },
  { id: 'u7', name: 'Ravi Menon', email: 'ravi.menon@transitops.com', role: 'driver', joined: '2025-06-19', active: false },
  { id: 'u8', name: 'Sofia Alvarez', email: 'sofia.alvarez@transitops.com', role: 'fleet_manager', joined: '2025-05-27', active: true },
  { id: 'u9', name: 'Nadia Patel', email: 'nadia.patel@transitops.com', role: 'unassigned', joined: '2026-07-09', active: true },
  { id: 'u10', name: 'Tomás Reyes', email: 'tomas.reyes@transitops.com', role: 'unassigned', joined: '2026-07-10', active: true },
  { id: 'u11', name: 'Jonas Berg', email: 'jonas.berg@transitops.com', role: 'unassigned', joined: '2026-07-11', active: true },
  { id: 'u12', name: 'Aisha Khan', email: 'aisha.khan@transitops.com', role: 'safety_officer', joined: '2025-07-15', active: true },
  { id: 'u13', name: 'Priya Suresh', email: 'priya.suresh@transitops.com', role: 'financial_analyst', joined: '2025-08-01', active: false },
  { id: 'u14', name: 'Kabir Rao', email: 'kabir.rao@transitops.com', role: 'unassigned', joined: '2026-07-12', active: true },
]

export type AuditEntry = { id: string; text: string; time: string; kind: 'role' | 'status' }

export const INITIAL_AUDIT: AuditEntry[] = [
  { id: 'a1', text: "Assigned 'Fleet Manager' role to Sofia Alvarez", time: '2 hours ago', kind: 'role' },
  { id: 'a2', text: "Deactivated Ravi Menon's account", time: '1 day ago', kind: 'status' },
  { id: 'a3', text: "Changed Dana Kwon's role to Financial Analyst", time: '3 days ago', kind: 'role' },
  { id: 'a4', text: "Deactivated Priya Suresh's account", time: '4 days ago', kind: 'status' },
  { id: 'a5', text: "Assigned 'Driver' role to Lena Osei", time: '6 days ago', kind: 'role' },
]

export function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
