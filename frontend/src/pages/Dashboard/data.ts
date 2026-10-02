import type { ComponentType } from 'react'
import {
  TruckIcon,
  CarIcon,
  WrenchIcon,
  RouteIcon,
  ClockIcon,
  UsersIcon,
  GaugeIcon,
  FuelIcon,
  CoinIcon,
} from './icons'

export type RoleId = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST' | 'UNASSIGNED'

export const ROLES: { id: RoleId; name: string; label: string }[] = [
  { id: 'ADMIN', name: 'Sam Okafor', label: 'Admin' },
  { id: 'MANAGER', name: 'Alex Reyes', label: 'Fleet Manager' },
  { id: 'DRIVER', name: 'Marco Vidal', label: 'Driver' },
  { id: 'SAFETY_OFFICER', name: 'Sarah Chen', label: 'Safety Officer' },
  { id: 'FINANCIAL_ANALYST', name: 'James Wilson', label: 'Financial Analyst' },
]

export const ROLE_LABEL: Record<RoleId, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
  UNASSIGNED: 'Unassigned',
}

// Short annotation tag describing which roles see a widget
export function roleTag(roles: RoleId[]): string {
  if (roles.length === 3) return 'All roles'
  return roles
    .map((r) => ROLE_LABEL[r]?.split(' ')[0] || r)
    .join(' + ') // "Fleet + Financial"
}

export type Kpi = {
  key: string
  label: string
  value: string
  trend: number // percent, sign matters
  trendGood?: boolean // whether positive is good (default true)
  icon: ComponentType<{ className?: string }>
  roles: RoleId[]
  accent: 'navy' | 'teal' | 'amber' | 'red'
}

export const KPIS: Kpi[] = [
  { key: 'active_vehicles', label: 'Active Vehicles', value: '1,842', trend: 3.4, icon: TruckIcon, roles: ['ADMIN', 'MANAGER'], accent: 'navy' },
  { key: 'available_vehicles', label: 'Available Vehicles', value: '612', trend: 1.2, icon: CarIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' },
  { key: 'maintenance', label: 'Vehicles in Maintenance', value: '84', trend: 6.1, trendGood: false, icon: WrenchIcon, roles: ['ADMIN', 'MANAGER'], accent: 'amber' },
  { key: 'active_trips', label: 'Active Trips', value: '327', trend: 4.8, icon: RouteIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER'], accent: 'navy' },
  { key: 'pending_trips', label: 'Pending Trips', value: '41', trend: -2.3, trendGood: false, icon: ClockIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER'], accent: 'amber' },
  { key: 'drivers_on_duty', label: 'Drivers On Duty', value: '486', trend: 2.0, icon: UsersIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' },
  { key: 'utilization', label: 'Fleet Utilization', value: '78.4%', trend: 5.2, icon: GaugeIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' },
  // financial-only cost KPIs
  { key: 'fuel_cost', label: 'Monthly Fuel Cost', value: '₹248.6K', trend: -4.1, trendGood: false, icon: FuelIcon, roles: ['ADMIN', 'MANAGER'], accent: 'navy' },
  { key: 'maint_spend', label: 'Maintenance Spend', value: '₹91.2K', trend: 2.7, trendGood: false, icon: WrenchIcon, roles: ['ADMIN', 'MANAGER'], accent: 'amber' },
  { key: 'cost_per_km', label: 'Cost per Km', value: '₹0.42', trend: -1.8, icon: CoinIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' },
]

// 30-day utilization trend
export const utilizationTrend = Array.from({ length: 30 }, (_, i) => {
  const base = 68 + Math.sin(i / 3.2) * 6 + i * 0.28
  return {
    day: `${i + 1}`,
    date: `Jun ${i + 1}`,
    utilization: Math.round(Math.min(92, base) * 10) / 10,
  }
})

export const vehicleStatus = [
  { name: 'Available', value: 612, color: '#10b981' },
  { name: 'On Trip', value: 327, color: '#3a6497' },
  { name: 'In Shop', value: 84, color: '#f59e0b' },
  { name: 'Retired', value: 61, color: '#94a3b8' },
]

export const costTrend = [
  { week: 'W1', fuel: 58, maintenance: 22 },
  { week: 'W2', fuel: 62, maintenance: 19 },
  { week: 'W3', fuel: 55, maintenance: 28 },
  { week: 'W4', fuel: 64, maintenance: 24 },
  { week: 'W5', fuel: 60, maintenance: 31 },
  { week: 'W6', fuel: 57, maintenance: 18 },
]

export const safetyScores = [
  { name: 'Lena Osei', score: 98 },
  { name: 'Marco Vidal', score: 95 },
  { name: 'Sofia Alvarez', score: 91 },
  { name: 'Tomás Reyes', score: 74 },
  { name: 'Ravi Menon', score: 68 },
  { name: 'Jonas Berg', score: 61 },
]

export type LicenseAlert = { name: string; id: string; days: number }
export const licenseAlerts: LicenseAlert[] = [
  { name: 'Jonas Berg', id: 'DRV-2214', days: 4 },
  { name: 'Ravi Menon', id: 'DRV-1180', days: 9 },
  { name: 'Aisha Khan', id: 'DRV-3302', days: 16 },
  { name: 'Tomás Reyes', id: 'DRV-0471', days: 23 },
  { name: 'Nadia Patel', id: 'DRV-2890', days: 28 },
]

// Driver compliance widget (Safety Officer)
export const compliance = [
  { label: 'License Valid', value: 94 },
  { label: 'Medical Cleared', value: 88 },
  { label: 'Training Current', value: 76 },
  { label: 'Rest-Hours Compliant', value: 91 },
]

export type QuickAction = { key: string; label: string; roles: RoleId[] }
export const quickActions: QuickAction[] = [
  { key: 'reg_vehicle', label: 'Register Vehicle', roles: ['ADMIN', 'MANAGER'] },
  { key: 'reg_driver', label: 'Register Driver', roles: ['ADMIN', 'MANAGER'] },
  { key: 'create_trip', label: 'Create Trip', roles: ['ADMIN', 'MANAGER', 'DRIVER'] },
  { key: 'log_maint', label: 'Log Maintenance', roles: ['ADMIN', 'MANAGER'] },
  { key: 'log_fuel', label: 'Log Fuel / Expense', roles: ['ADMIN', 'MANAGER'] },
]

export type Activity = { id: string; type: 'trip' | 'shop' | 'license' | 'driver' | 'fuel'; text: string; time: string }
export const activity: Activity[] = [
  { id: 'a1', type: 'trip', text: 'Trip #1023 dispatched to Region B', time: '12 min ago' },
  { id: 'a2', type: 'shop', text: 'Van-05 marked In Shop for brake service', time: '48 min ago' },
  { id: 'a3', type: 'license', text: 'Driver Jonas Berg — license expiring in 4 days', time: '2 hours ago' },
  { id: 'a4', type: 'driver', text: 'Lena Osei clocked on duty (Depot North)', time: '3 hours ago' },
  { id: 'a5', type: 'fuel', text: 'Fuel expense logged for Truck-118 — ₹214', time: '5 hours ago' },
  { id: 'a6', type: 'trip', text: 'Trip #1019 completed — 342 km, on time', time: '6 hours ago' },
  { id: 'a7', type: 'shop', text: 'Truck-092 returned to service', time: '8 hours ago' },
]
