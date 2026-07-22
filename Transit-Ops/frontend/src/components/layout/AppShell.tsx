import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import NotificationDropdown from '../common/NotificationDropdown'
import {
  TruckIcon,
  BellIcon,
  ChevronDownIcon,
  LogoutIcon,
  SettingsIcon,
  MenuIcon,
  PanelLeftIcon,
  XIcon,
} from '../../pages/Dashboard/icons'
import type { RoleId } from './nav'
import { navFor, PAGE_TITLE, type NavItem, type Page } from './nav'

export default function AppShell() {
  const { user, logout } = useAuth()
  const role = user?.isApproved ? user?.role?.toUpperCase() as RoleId : 'UNASSIGNED'
  const navigate = useNavigate()
  const location = useLocation()

  if (role === 'DRIVER' && !user?.driverProfile) {
    return <Navigate to="/driver-onboarding" replace />;
  }

  
  const pathMap: Record<string, Page> = {
    '/dashboard': 'dashboard',
    '/vehicles': 'vehicles',
    '/drivers': 'drivers',
    '/trips': 'trips',
    '/maintenance': 'maintenance',
    '/fuel-expenses': 'fuel',
    '/reports': 'reports',
    '/users': 'admin',
  }
  const page = pathMap[location.pathname] || 'dashboard'
  
  const setPage = (p: Page) => {
    const route = Object.keys(pathMap).find(k => pathMap[k] === p) || '/dashboard'
    navigate(route)
  }
  const onLogout = logout

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const items = navFor(role)

  function go(p: Page) {
    setPage(p)
    setDrawerOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-navy-950">
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-navy-900 text-slate-300 transition-[width] duration-200 md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarInner
          role={role}
          page={page}
          items={items}
          collapsed={collapsed}
          onNavigate={go}
          onToggle={() => setCollapsed((c) => !c)}
          onLogout={onLogout}
        />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden">
          <div
            className="animate-overlay-in fixed inset-0 z-40 bg-navy-900/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="animate-panel-in fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-slate-300">
            <SidebarInner
              role={role}
              page={page}
              items={items}
              collapsed={false}
              onNavigate={go}
              onClose={() => setDrawerOpen(false)}
              onLogout={onLogout}
            />
          </aside>
        </div>
      )}

      {/* ── Content column ──────────────────────────────────────────── */}
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? 'md:pl-16' : 'md:pl-60'}`}>
        <Header
          role={role}
          
          page={page}
          onOpenDrawer={() => setDrawerOpen(true)}
          onLogout={onLogout}
        />
        <main className="flex-1"><Outlet /></main>
      </div>
    </div>
  )
}

/* ── Sidebar body (shared by desktop rail + mobile drawer) ─────────── */
function SidebarInner({
  role,
  page,
  items,
  collapsed,
  onNavigate,
  onToggle,
  onClose,
  onLogout,
}: {
  role: RoleId
  page: Page
  items: NavItem[]
  collapsed: boolean
  onNavigate: (p: Page) => void
  onToggle?: () => void
  onClose?: () => void
  onLogout?: () => void
}) {
  const { user } = useAuth()
  const displayUser = { name: user?.name || 'User', label: user?.role || 'Role' }
  const primary = items.filter((i) => !i.admin)
  const adminItems = items.filter((i) => i.admin)

  return (
    <>
      {/* brand */}
      <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'}`}>
        <img src="/logo.jpeg" alt="Logo" className={`${collapsed ? 'h-9 w-9 rounded-lg' : 'h-8 rounded'} object-contain bg-white`} />
        {!collapsed && (
          <span className="font-mono text-[15px] font-bold tracking-tight text-white ml-2">TransitOps</span>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* primary nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
        {primary.map((item) => (
          <NavButton key={item.id} item={item} active={page === item.id} collapsed={collapsed} onClick={() => onNavigate(item.id)} />
        ))}

        {adminItems.length > 0 && (
          <div className="pt-3">
            <div className={`mb-1 border-t border-white/10 pt-3 ${collapsed ? '' : 'px-2'}`}>
              {!collapsed && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Administration</p>
              )}
            </div>
            {adminItems.map((item) => (
              <NavButton key={item.id} item={item} active={page === item.id} collapsed={collapsed} onClick={() => onNavigate(item.id)} />
            ))}
          </div>
        )}
      </nav>

      {/* profile card + logout */}
      <div className="border-t border-white/10 p-2.5">
        <div className={`flex items-center rounded-xl bg-white/5 ${collapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-700 text-[13px] font-semibold text-white">
            {displayUser.name.split(' ').map((n) => n[0]).join('')}
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-white">{displayUser.name}</span>
              <span className="block truncate text-[11px] text-teal-400">{displayUser.label}</span>
            </span>
          )}
        </div>
        <button
          onClick={onLogout}
          className={`mt-1.5 flex w-full items-center rounded-lg py-2 text-[13px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-white ${
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
          }`}
        >
          <LogoutIcon className="h-5 w-5 shrink-0" />
          {!collapsed && 'Log out'}
        </button>
      </div>

      {/* collapse toggle (desktop only) */}
      {onToggle && (
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center border-t border-white/10 py-2.5 text-[12px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-white ${
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'
          }`}
        >
          <PanelLeftIcon className="h-5 w-5 shrink-0" />
          {!collapsed && 'Collapse'}
        </button>
      )}
    </>
  )
}

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`relative flex w-full items-center rounded-lg py-2.5 text-[13px] font-medium transition ${
        collapsed ? 'justify-center px-0' : 'gap-3 px-3'
      } ${
        active
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-teal-400" />}
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-teal-400' : ''}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  )
}

/* ── Top header bar ────────────────────────────────────────────────── */
function Header({
  role,
  setRole,
  page,
  onOpenDrawer,
  onLogout,
}: {
  role: RoleId
  setRole?: any
  page: Page
  onOpenDrawer: () => void
  onLogout?: () => void
}) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const displayUser = { name: user?.name || 'User', label: user?.role || 'Role' }

  const [isDark, setIsDark] = useState(() => {
    return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    }
  }, [isDark])

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-navy-800 bg-white/90 dark:bg-navy-900/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onOpenDrawer}
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-navy-800 dark:hover:text-white md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {/* breadcrumb / title */}
        <div className="min-w-0 leading-tight">
          <p className="hidden text-[11px] font-medium text-slate-400 dark:text-slate-500 sm:block">TransitOps</p>
          <h1 className="truncate text-[15px] font-semibold text-navy-900 dark:text-white">{PAGE_TITLE[page]}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-navy-800 dark:hover:text-white"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <NotificationDropdown />

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 py-1.5 pl-1.5 pr-2.5 transition hover:border-slate-300 dark:hover:border-navy-600 hover:bg-slate-50 dark:hover:bg-navy-700"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-800 dark:bg-navy-900 text-[13px] font-semibold text-white">
                {displayUser.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-[13px] font-semibold text-navy-900 dark:text-white">{displayUser.name}</span>
                <span className="block text-[11px] text-teal-700 dark:text-teal-400">{displayUser.label}</span>
              </span>
              <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="animate-form-in absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 shadow-xl shadow-navy-900/10 dark:shadow-black/20">
                  <div className="py-1">
                    <button className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-navy-700">
                      <SettingsIcon className="h-4 w-4" /> Settings
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onLogout?.()
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogoutIcon className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
