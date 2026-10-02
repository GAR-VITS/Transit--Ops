import type { ComponentType } from 'react'
import {
  HomeIcon,
  TruckIcon,
  UsersIcon,
  RouteIcon,
  WrenchIcon,
  FuelIcon,
  ChartBarIcon,
  SettingsIcon,
} from '../../pages/Dashboard/icons'
export type RoleId = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST' | 'UNASSIGNED'

export type Page = 'dashboard' | 'vehicles' | 'drivers' | 'trips' | 'maintenance' | 'fuel' | 'reports' | 'admin'

export type NavItem = {
  id: Page
  label: string
  icon: ComponentType<{ className?: string }>
  roles?: RoleId[]
  admin?: boolean
}

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'vehicles', label: 'Vehicle Registry', icon: TruckIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
  { id: 'drivers', label: 'Driver Management', icon: UsersIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER', 'SAFETY_OFFICER'] },
  { id: 'trips', label: 'Trip Management', icon: RouteIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER', 'SAFETY_OFFICER'] },
  { id: 'maintenance', label: 'Maintenance Log', icon: WrenchIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER', 'FINANCIAL_ANALYST'] },
  { id: 'fuel', label: 'Fuel & Expense', icon: FuelIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER', 'FINANCIAL_ANALYST'] },
  { id: 'reports', label: 'Reports & Analytics', icon: ChartBarIcon, roles: ['ADMIN', 'MANAGER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
  { id: 'admin', label: 'User Management', icon: SettingsIcon, roles: ['ADMIN'], admin: true },
]

export const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicle Registry',
  drivers: 'Driver Management',
  trips: 'Trip Management',
  maintenance: 'Maintenance Log',
  fuel: 'Fuel & Expense Tracking',
  reports: 'Reports & Analytics',
  admin: 'User & Role Management',
}

export function canAccess(page: Page, role: RoleId): boolean {
  const item = NAV.find((n) => n.id === page)
  return !item?.roles || item.roles.includes(role)
}

export function firstPageFor(role: RoleId): Page {
  return NAV.find((n) => !n.roles || n.roles.includes(role))?.id ?? 'dashboard'
}

export function navFor(role: RoleId): NavItem[] {
  return NAV.filter((n) => !n.roles || n.roles.includes(role))
}
