import { useState, useMemo, useEffect } from 'react'
import { SearchIcon, InboxIcon, AlertIcon, UsersIcon, ShieldIcon, XIcon, HistoryIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '../Dashboard/icons'
import useAuth from '../../hooks/useAuth'
import { userService } from '../../services/userService'
import {
  ROLE_OPTIONS,
  ROLE_PILL_STYLES,
  ACCOUNT_ROLE_LABEL,
  INITIAL_AUDIT,
  formatJoined,
  type User,
  type AccountRole,
  type AuditEntry,
} from './data'

const PAGE_SIZE = 8

/* ---------- small pieces ---------- */

function RolePill({ role }: { role: AccountRole }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${ROLE_PILL_STYLES[role]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {ACCOUNT_ROLE_LABEL[role]}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('')
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-800 text-[12px] font-semibold text-white">{initials}</span>
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${on ? 'bg-teal-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-[13px] font-medium text-navy-900 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 sm:w-44">
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  )
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="animate-overlay-in absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="animate-modal-in relative w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">{children}</div>
    </div>
  )
}

/* ---------- Assign/Change Role modal ---------- */

function RoleModal({ user, onClose, onConfirm }: { user: User; onClose: () => void; onConfirm: (role: AccountRole) => void }) {
  const [role, setRole] = useState<AccountRole>(user.role)
  const [adminConfirmed, setAdminConfirmed] = useState(false)
  const wasAssigned = user.role !== 'unassigned'
  const changed = role !== user.role
  const promotingAdmin = role === 'admin' && user.role !== 'admin'
  const blocked = !changed || (promotingAdmin && !adminConfirmed)

  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-[17px] font-bold text-navy-950">{wasAssigned ? 'Change Role' : 'Assign Role'}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* user header */}
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-navy-900">{user.name}</p>
            <p className="truncate text-[12.5px] text-slate-500">{user.email}</p>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-navy-900">Role</span>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as AccountRole)
                setAdminConfirmed(false)
              }}
              className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 pr-9 text-[14px] text-navy-950 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        {/* admin confirmation */}
        {promotingAdmin && (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
            <input type="checkbox" checked={adminConfirmed} onChange={(e) => setAdminConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
            <span className="text-[12.5px] font-medium text-red-700">I confirm this user should have full Admin privileges.</span>
          </label>
        )}

        {/* change warning */}
        {wasAssigned && changed && !promotingAdmin && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            Changing this user's role will immediately update their access permissions on next login.
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(role)}
            disabled={blocked}
            className="h-11 flex-1 rounded-lg bg-teal-600 text-[14px] font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 focus-visible:ring-4 focus-visible:ring-teal-500/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            Confirm Role Change
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ---------- Deactivate modal ---------- */

function DeactivateModal({ user, onClose, onConfirm }: { user: User; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertIcon className="h-5 w-5" />
          </span>
          <h2 className="text-[17px] font-bold text-navy-950">Deactivate account?</h2>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          Deactivate <span className="font-semibold text-navy-900">{user.name}</span>'s account? They will be unable to log in until reactivated.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white text-[14px] font-semibold text-navy-800 transition hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-11 flex-1 rounded-lg bg-red-600 text-[14px] font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 focus-visible:ring-4 focus-visible:ring-red-500/30">
            Confirm Deactivate
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ---------- summary cards ---------- */

function SummaryCards({ users }: { users: User[] }) {
  const total = users.length
  const unassigned = users.filter((u) => u.role === 'unassigned').length
  const activeCount = users.filter((u) => u.active).length
  const deactivated = total - activeCount
  const cards = [
    { label: 'Total Users', value: total, fg: 'text-navy-800', bg: 'bg-navy-50', icon: UsersIcon },
    { label: 'Unassigned (pending)', value: unassigned, fg: 'text-amber-600', bg: 'bg-amber-50', icon: AlertIcon },
    { label: 'Active Users', value: activeCount, fg: 'text-teal-700', bg: 'bg-teal-50', icon: ShieldIcon },
    { label: 'Deactivated Users', value: deactivated, fg: 'text-red-600', bg: 'bg-red-50', icon: XIcon },
  ]
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04]">
            <div className="mb-3 flex items-center justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${c.bg} ${c.fg}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="text-[28px] font-bold leading-none tracking-tight text-navy-950">{c.value}</p>
            <p className="mt-2 text-[12.5px] font-medium text-slate-500">{c.label}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Page ---------- */

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const { user: currentUser } = useAuth()
  const role = currentUser?.role

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll()
      setUsers(res.data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.isApproved ? (u.role === 'ADMIN' ? 'admin' : u.role === 'MANAGER' ? 'fleet_manager' : u.role === 'SAFETY_OFFICER' ? 'safety_officer' : u.role === 'FINANCIAL_ANALYST' ? 'financial_analyst' : u.role === 'DRIVER' ? 'driver' : 'unassigned') : 'unassigned',
        active: u.isActive,
        joined: u.createdAt
      })))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])
  const [audit, setAudit] = useState<AuditEntry[]>(INITIAL_AUDIT)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [roleModal, setRoleModal] = useState<User | null>(null)
  const [deactivating, setDeactivating] = useState<User | null>(null)

  const roleFilterOptions = ['All', 'Unassigned', 'Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst', 'Admin']

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users
      .filter((u) => (q ? u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) : true))
      .filter((u) => (roleFilter === 'All' ? true : ACCOUNT_ROLE_LABEL[u.role] === roleFilter))
      .filter((u) => (statusFilter === 'All' ? true : statusFilter === 'Active' ? u.active : !u.active))
  }, [users, query, roleFilter, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const to = Math.min(current * PAGE_SIZE, filtered.length)
  const resetPage = () => setPage(1)

  function logAudit(text: string, kind: AuditEntry['kind']) {
    setAudit((a) => [{ id: `a${Date.now()}`, text, time: 'Just now', kind }, ...a])
  }

  async function changeRole(role: AccountRole) {
    if (!roleModal) return
    try {
      const dbRole = role === 'admin' ? 'ADMIN' : role === 'fleet_manager' ? 'MANAGER' : role === 'safety_officer' ? 'SAFETY_OFFICER' : role === 'financial_analyst' ? 'FINANCIAL_ANALYST' : 'DRIVER'
      await userService.update(roleModal.id, { role: dbRole, isApproved: true })
      logAudit(`Assigned '${ACCOUNT_ROLE_LABEL[role]}' role to ${roleModal.name}`, 'role')
      fetchUsers()
      setRoleModal(null)
    } catch (err) {
      console.error(err)
      alert("Failed to change role")
    }
  }

  function confirmDeactivate() {
    if (!deactivating) return
    logAudit(`Deactivated ${deactivating.name}'s account`, 'status')
    setUsers((list) => list.map((u) => (u.id === deactivating.id ? { ...u, active: false } : u)))
    setDeactivating(null)
  }

  return (
    <div className="font-sans text-navy-950">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-bold tracking-tight text-navy-950">User &amp; Role Management</h1>
            <span className="rounded-full bg-red-50 px-2.5 py-1 font-mono text-[10.5px] font-medium text-red-600">
              Admin only — all other roles are redirected away from this page
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-slate-500">
            Assign roles to registered employees. New sign-ups default to "Employee" with no system access until a role is assigned.
          </p>
        </div>

        {/* summary cards */}
        <SummaryCards users={users} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* main column */}
          <div>
            {/* search + filters */}
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">Search</span>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      resetPage()
                    }}
                    placeholder="Search by name or email…"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-navy-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
                  />
                </div>
              </label>
              <Dropdown label="Role" value={roleFilter} onChange={(v) => { setRoleFilter(v); resetPage() }} options={roleFilterOptions} />
              <Dropdown label="Account Status" value={statusFilter} onChange={(v) => { setStatusFilter(v); resetPage() }} options={['All', 'Active', 'Deactivated']} />
            </div>

            {/* table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-navy-900/[0.04]">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-50 text-navy-400">
                    <InboxIcon className="h-7 w-7" />
                  </span>
                  <p className="text-[15px] font-semibold text-navy-900">No users found</p>
                  <p className="max-w-xs text-[13px] text-slate-500">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Current Role</th>
                        <th className="px-4 py-3">Date Joined</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13px]">
                      {rows.map((u, i) => {
                        const unassigned = u.role === 'unassigned'
                        return (
                          <tr
                            key={u.id}
                            className={`border-b border-slate-100 transition last:border-0 ${
                              unassigned ? 'bg-amber-50/60 hover:bg-amber-50' : i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                            } ${!u.active ? 'opacity-60' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={u.name} />
                                <span className="font-semibold text-navy-900">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{u.email}</td>
                            <td className="px-4 py-3">
                              <RolePill role={u.role} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatJoined(u.joined)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Toggle on={u.active} onChange={() => toggleStatus(u)} label={`Toggle ${u.name} account`} />
                                <span className={`text-[12px] font-medium ${u.active ? 'text-teal-700' : 'text-slate-400'}`}>{u.active ? 'Active' : 'Deactivated'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setRoleModal(u)}
                                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                                  unassigned ? 'bg-navy-800 text-white hover:bg-navy-900' : 'border border-slate-300 text-navy-800 hover:bg-slate-50'
                                }`}
                              >
                                {unassigned ? 'Assign Role' : 'Change Role'}
                              </button>
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

          {/* activity log sidebar */}
          <aside className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04] xl:sticky xl:top-24 xl:h-fit">
            <header className="mb-4 flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-teal-600" />
              <h3 className="text-[14px] font-semibold text-navy-900">Activity Log</h3>
            </header>
            <ol className="relative space-y-4 border-l border-slate-200 pl-4">
              {audit.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${e.kind === 'role' ? 'bg-teal-500' : 'bg-amber-500'}`} />
                  <p className="text-[12.5px] leading-snug text-navy-800">{e.text}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{e.time}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>

      {roleModal && <RoleModal user={roleModal} onClose={() => setRoleModal(null)} onConfirm={changeRole} />}
      {deactivating && <DeactivateModal user={deactivating} onClose={() => setDeactivating(null)} onConfirm={confirmDeactivate} />}
    </div>
  )
}
