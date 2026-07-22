import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService } from '../../services/tripService'
import { dashboardService } from '../../services/dashboardService'
import { maintenanceService } from '../../services/maintenanceService'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { PlusIcon, AlertIcon, RouteIcon, WrenchIcon, UsersIcon, FuelIcon, ShieldIcon, ChevronDownIcon, ClockIcon, CoinIcon, GaugeIcon, TruckIcon, CarIcon } from './icons'
import {
  ROLES,
  ROLE_LABEL,
  roleTag,
  KPIS,
  utilizationTrend,
  vehicleStatus,
  costTrend,
  safetyScores,
  licenseAlerts,
  compliance,
  quickActions,
  activity,
  type RoleId,
  type Kpi,
} from './data'

const formatLargeCurrency = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

/* --------------------------------------------------------------- */

const accentMap: Record<Kpi['accent'], { fg: string; bg: string }> = {
  navy: { fg: 'text-navy-800', bg: 'bg-navy-50' },
  teal: { fg: 'text-teal-700', bg: 'bg-teal-50' },
  amber: { fg: 'text-amber-600', bg: 'bg-amber-50' },
  red: { fg: 'text-red-600', bg: 'bg-red-50' },
}

function RoleChip({ roles }: { roles: RoleId[] }) {
  return (
    <span className="rounded-full bg-navy-50 dark:bg-navy-800 px-2 py-0.5 font-mono text-[10px] font-medium tracking-tight text-navy-600 dark:text-navy-300">
      {roleTag(roles)}
    </span>
  )
}

function Card({
  title,
  roles,
  children,
  className = '',
  action,
}: {
  title?: string
  roles?: RoleId[]
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section className={`rounded-xl border border-slate-200/80 dark:border-navy-700 bg-white dark:bg-navy-800 p-5 shadow-sm shadow-navy-900/[0.04] dark:shadow-black/20 ${className}`}>
      {(title || roles) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-navy-900 dark:text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {action}
            {roles && <RoleChip roles={roles} />}
          </div>
        </header>
      )}
      {children}
    </section>
  )
}

function TrendPill({ trend, good = true }: { trend: number; good?: boolean }) {
  const positive = trend >= 0
  const isGood = positive === good
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        isGood ? 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' : 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'
      }`}
    >
      <span className="text-[9px]">{positive ? '▲' : '▼'}</span>
      {Math.abs(trend)}%
    </span>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 pl-3 pr-8 text-[13px] font-medium text-navy-900 dark:text-white outline-none transition hover:border-slate-400 dark:hover:border-navy-500 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 sm:w-40"
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  )
}

function ChartTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 dark:border-navy-600 bg-white dark:bg-navy-800 px-3 py-2 text-[12px] shadow-lg dark:shadow-black/20">
      <p className="mb-1 font-semibold text-navy-900 dark:text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold text-navy-900 dark:text-white">
            {p.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- */

const activityIcon: Record<string, { icon: typeof RouteIcon; cls: string }> = {
  trip: { icon: RouteIcon, cls: 'bg-navy-50 text-navy-700' },
  shop: { icon: WrenchIcon, cls: 'bg-amber-50 text-amber-600' },
  license: { icon: AlertIcon, cls: 'bg-red-50 text-red-600' },
  driver: { icon: UsersIcon, cls: 'bg-teal-50 text-teal-700' },
  fuel: { icon: FuelIcon, cls: 'bg-navy-50 text-navy-700' },
}

/* --------------------------------------------------------------- */

import useAuth from '../../hooks/useAuth'

function DriverDashboard({ user }: { user: any }) {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchTrips() {
    try {
      const res = await tripService.getAll()
      setTrips(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [])

  async function acceptTrip(id: string) {
    try {
      await tripService.update(id, { driverId: user.id, status: 'SCHEDULED' })
      fetchTrips()
    } catch (err) {
      console.error(err)
      alert('Failed to accept trip.')
    }
  }

  async function completeTrip(id: string) {
    try {
      await tripService.update(id, { status: 'COMPLETED' })
      fetchTrips()
    } catch (err) {
      console.error(err)
      alert('Failed to mark trip as completed.')
    }
  }

  const myTrips = trips.filter((t) => t.driverId === user.id)
  const openTrips = trips.filter((t) => t.driverId === null && t.status === 'DRAFT')

  const activeTrips = myTrips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'SCHEDULED')
  const pendingTrips = myTrips.filter((t) => t.status === 'DRAFT')
  
  const currentActiveTrip = myTrips.find((t) => t.status === 'IN_PROGRESS' || t.status === 'SCHEDULED')
  
  const recentActivity = [...myTrips].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4)

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>

  return (
    <div className="font-sans text-navy-950">
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <p className="text-[12px] font-medium text-amber-600 bg-amber-50 rounded-full px-3 py-1 inline-block">
            Driver Dashboard — all data below is scoped to the logged-in driver only, except the Open Trips pool which is shared across all drivers.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {currentActiveTrip && (
          <div className="mb-6 animate-form-in rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-teal-800">Currently on</p>
              <h2 className="mt-1 text-[18px] font-bold text-teal-950">Trip #{currentActiveTrip.id.slice(0, 6)} &rarr; {currentActiveTrip.origin} to {currentActiveTrip.destination}</h2>
            </div>
            <button
              onClick={() => completeTrip(currentActiveTrip.id)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Mark as Completed
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-50 text-navy-700">
                <RouteIcon className="h-5 w-5" />
              </span>
              <p className="text-[12.5px] font-medium text-slate-500">My Active Trips <span className="ml-1 text-[10px] text-slate-400 font-normal">(Scoped to current driver)</span></p>
            </div>
            <p className="text-[28px] font-bold text-navy-950">{activeTrips.length}</p>
          </div>
          
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <ClockIcon className="h-5 w-5" />
              </span>
              <p className="text-[12.5px] font-medium text-slate-500">My Pending Trips <span className="ml-1 text-[10px] text-slate-400 font-normal">(Scoped to current driver)</span></p>
            </div>
            <p className="text-[28px] font-bold text-navy-950">{pendingTrips.length}</p>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] font-bold text-navy-900">🚚 Open Trips</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{openTrips.length} available</span>
            </div>
          </header>
          <div className="p-5">
            {openTrips.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No open trips right now. Check back soon or create your own trip.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openTrips.map(t => (
                  <div key={t.id} className="rounded-lg border border-slate-200 p-4 shadow-sm bg-slate-50/50 flex flex-col justify-between gap-4">
                    <div>
                      <p className="font-semibold text-navy-900 mb-1">{t.origin} &rarr; {t.destination}</p>
                      <p className="text-[12px] text-slate-500">Cargo: {t.cargoWeight ? `${t.cargoWeight} kg` : 'N/A'}</p>
                      <p className="text-[12px] text-slate-500">Distance: {t.distance ? `${t.distance} km` : 'N/A'}</p>
                    </div>
                    <button onClick={() => acceptTrip(t.id)} className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white py-2 text-[13px] font-semibold transition">
                      Accept Trip
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11.5px] text-slate-400 italic text-center">
              Shared across all Drivers — first to click 'Accept' claims it. Accepting a trip assigns you and locks in your availability.
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-[15px] font-semibold text-navy-900">Quick Actions</h2>
          <button onClick={() => navigate('/trips')} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-navy-900">
            <PlusIcon className="h-4 w-4 text-teal-400" />
            Create Trip
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-navy-900">My Recent Activity <span className="ml-1 text-[11px] font-normal text-slate-400">(Scoped to current driver only)</span></h2>
          </header>
          <div className="p-5">
            {recentActivity.length === 0 ? (
              <p className="text-[13px] text-slate-500">No recent activity yet.</p>
            ) : (
              <ul className="space-y-4">
                {recentActivity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-navy-50 text-navy-700">
                      <RouteIcon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-medium text-navy-900">You updated Trip #{a.id.slice(0, 6)}</p>
                      <p className="text-[12px] text-slate-500">Status is now {a.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function FinancialAnalystDashboard({ user }: { user: any }) {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('This Month')
  
  async function fetchData() {
    setLoading(true)
    try {
      const today = new Date()
      let start = new Date()
      let end = new Date()
      
      if (dateRange === 'This Month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1)
      } else if (dateRange === 'Last Month') {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
      } else if (dateRange === 'This Quarter') {
        const quarter = Math.floor(today.getMonth() / 3)
        start = new Date(today.getFullYear(), quarter * 3, 1)
      } else if (dateRange === 'Custom Range') {
        // Mock custom range as last 30 days
        start = new Date(today.setDate(today.getDate() - 30))
      }
      
      const startStr = start.toISOString()
      const endStr = end.toISOString()
      
      const res = await dashboardService.getFinancial(startStr, endStr)
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange])

  if (loading && !data) return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>

  return (
    <div className="font-sans text-navy-950">
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1440px] flex items-center justify-between">
          <p className="text-[12px] font-medium text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 inline-block">
            Financial Analyst Dashboard — cost and profitability focused view, no operational/dispatch actions available
          </p>
          <div className="w-48">
            <Select
              label="Date Range"
              value={dateRange}
              onChange={setDateRange}
              options={['This Month', 'Last Month', 'This Quarter', 'Custom Range']}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* --- Left column --- */}
          <div className="flex flex-col gap-6">
            
            {/* KPI grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-50 text-navy-800">
                    <CoinIcon className="h-5 w-5" />
                  </span>
                  <TrendPill trend={Number(data?.costTrend?.toFixed(1) || 0)} good={false} />
                </div>
                <p className="text-[28px] font-bold text-navy-950 truncate" title={String(data?.totalOperationalCost || 0)}>{formatLargeCurrency(data?.totalOperationalCost || 0)}</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500 truncate" title="Total Operational Cost">Total Operational Cost</p>
              </div>

              <div className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
                    <FuelIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-[28px] font-bold text-navy-950 truncate" title={String(data?.avgFuelCost || 0)}>{formatLargeCurrency(data?.avgFuelCost || 0)}</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500 truncate" title="Avg Fuel Cost / Vehicle">Avg Fuel Cost / Vehicle</p>
              </div>

              <div className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <RouteIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className={`text-[28px] font-bold truncate ${data?.averageROI >= 0 ? 'text-teal-600' : 'text-red-600'}`} title={String((data?.averageROI || 0).toFixed(2)) + '%'}>{(data?.averageROI || 0).toFixed(2)}%</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500 truncate" title="Avg Vehicle ROI">Avg Vehicle ROI</p>
              </div>

              <div className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <GaugeIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-[28px] font-bold text-navy-950 truncate" title={String((data?.fleetUtilization || 0).toFixed(1)) + '%'}>{(data?.fleetUtilization || 0).toFixed(1)}%</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500 truncate" title="Fleet Utilization">Fleet Utilization</p>
              </div>
            </div>

            {/* Quick Actions */}
            <Card title="Quick Actions">
               <button onClick={() => navigate('/reports')} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-navy-900">
                  View Full Reports &rarr;
               </button>
            </Card>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Operational Cost Trend (Fuel vs Maintenance)" className="lg:col-span-2">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.costTrendData || []} margin={{ top: 6, right: 8, left: -20, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="fuel" name="Fuel Cost" fill="#1e3a5f" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="maintenance" name="Maintenance Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Top 5 Vehicles by ROI">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.topVehiclesByROI || []} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="roi" name="ROI" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Bottom 5 Vehicles by ROI">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.bottomVehiclesByROI || []} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="roi" name="ROI" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

          </div>

          {/* --- Right sidebar: activity feed --- */}
          <Card title="Recent Financial Activity" className="h-fit xl:sticky xl:top-24">
             <p className="text-[11px] text-slate-400 mb-4 pb-2 border-b border-slate-100">Scoped to cost/expense events only — excludes trip dispatch, driver duty, and license activity shown to other roles</p>
            <ul className="space-y-1">
              {!data?.activity || data.activity.length === 0 ? (
                <li className="text-[12.5px] text-slate-500 py-2">No recent financial activity.</li>
              ) : (
                data.activity.map((ev: any) => {
                  const Icon = ev.type === 'fuel' ? FuelIcon : WrenchIcon;
                  const cls = ev.type === 'fuel' ? 'bg-navy-50 text-navy-700' : 'bg-amber-50 text-amber-600';
                  return (
                    <li key={ev.id} className="flex gap-3 rounded-lg p-2 transition hover:bg-slate-50">
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cls}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] leading-snug text-navy-800">{ev.text}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{new Date(ev.time).toLocaleString()}</span>
                      </span>
                    </li>
                  )
                })
              )}
            </ul>
          </Card>
        </div>
      </main>
    </div>
  )
}

function SafetyOfficerDashboard({ user }: { user: any }) {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [licenseStatus, setLicenseStatus] = useState('All')
  
  async function fetchData() {
    setLoading(true)
    try {
      const statusMap: Record<string, string> = {
        'All': 'all',
        'Valid': 'valid',
        'Expiring Soon': 'expiring_soon',
        'Expired': 'expired'
      }
      const res = await dashboardService.getSafety(statusMap[licenseStatus])
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [licenseStatus])

  if (loading && !data) return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>

  // Create combined chart data
  const chartData: any[] = []
  if (data) {
    data.topPerformers.forEach((d: any) => chartData.push({ ...d, group: 'Top Performers' }))
    data.bottomPerformers.forEach((d: any) => chartData.push({ ...d, group: 'Needs Attention' }))
  }

  return (
    <div className="font-sans text-navy-950">
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-[1440px] flex items-center justify-between">
          <p className="text-[12px] font-medium text-purple-700 bg-purple-50 rounded-full px-3 py-1 inline-block">
            Safety Officer Dashboard — driver compliance and safety focused view, no vehicle/dispatch operational actions available
          </p>
          <div className="w-48">
            <Select
              label="License Status"
              value={licenseStatus}
              onChange={setLicenseStatus}
              options={['All', 'Valid', 'Expiring Soon', 'Expired']}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* --- Left column --- */}
          <div className="flex flex-col gap-6">
            
            {/* KPI grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <UsersIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-[28px] font-bold text-navy-950">{data?.driversOnDuty || 0}</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500">Drivers On Duty</p>
              </div>

              <div className="group rounded-xl border-l-4 border-l-amber-500 border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
                    <AlertIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-[28px] font-bold text-navy-950">{data?.licensesExpiringSoon || 0}</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500">Licenses Expiring Soon</p>
              </div>

              <div className="group rounded-xl border-l-4 border-l-red-500 border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-600">
                    <ShieldIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-[28px] font-bold text-navy-950">{data?.expiredLicenses || 0}</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500">Expired Licenses</p>
              </div>

              <div className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-50 text-navy-800">
                    <ShieldIcon className="h-5 w-5" />
                  </span>
                  <TrendPill trend={Number(data?.safetyScoreTrend?.toFixed(1) || 0)} good={true} />
                </div>
                <p className="text-[28px] font-bold text-navy-950">{data?.averageSafetyScore?.toFixed(1) || 0}</p>
                <p className="mt-2 text-[12.5px] font-medium text-slate-500">Average Safety Score</p>
              </div>
            </div>

            {/* License Expiry Alert Widget */}
            <Card title={`⚠️ License Expiry Alerts (${data?.alertDrivers?.length || 0})`}>
               {data?.alertDrivers?.length === 0 ? (
                 <div className="py-8 text-center text-slate-500">
                   <p className="text-[14px]">No license expiry concerns at this time. ✅</p>
                 </div>
               ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full min-w-[600px] text-left text-[13px]">
                     <thead>
                       <tr className="border-b border-slate-200 text-slate-500">
                         <th className="pb-2 font-medium">Driver Name</th>
                         <th className="pb-2 font-medium">License Number</th>
                         <th className="pb-2 font-medium">Expiry Date</th>
                         <th className="pb-2 font-medium">Days Remaining</th>
                         <th className="pb-2 font-medium">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {data?.alertDrivers?.map((d: any) => {
                         let rowClass = ''
                         if (d.status === 'Expired') rowClass = 'bg-red-50/50 text-red-900'
                         else if (d.daysRemaining <= 7) rowClass = 'bg-orange-50 text-orange-900'
                         else if (d.status === 'Expiring Soon') rowClass = 'bg-yellow-50 text-yellow-900'
                         
                         let badgeClass = 'bg-slate-100 text-slate-600'
                         if (d.status === 'Expired') badgeClass = 'bg-red-100 text-red-700'
                         else if (d.status === 'Expiring Soon') badgeClass = 'bg-amber-100 text-amber-700'
                         else if (d.status === 'Valid') badgeClass = 'bg-teal-100 text-teal-700'

                         return (
                           <tr key={d.id} className={`${rowClass} transition hover:opacity-90`}>
                             <td className="py-2.5 font-medium">{d.name}</td>
                             <td className="py-2.5">{d.licenseNumber}</td>
                             <td className="py-2.5">{new Date(d.expiryDate).toLocaleDateString()}</td>
                             <td className="py-2.5 font-medium">{d.daysRemaining}</td>
                             <td className="py-2.5">
                               <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}`}>{d.status}</span>
                             </td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                 </div>
               )}
               <div className="mt-4 border-t border-slate-100 pt-3">
                 <button onClick={() => navigate('/drivers')} className="text-[13px] font-medium text-navy-600 hover:text-navy-800 transition">
                   View All in Driver Management &rarr;
                 </button>
               </div>
            </Card>

            {/* Safety Score Chart */}
            <Card title="Safety Score Overview">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                      {
                        chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.group === 'Top Performers' ? '#10b981' : '#ef4444'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
               <div className="flex gap-4">
                 <button onClick={() => navigate('/drivers')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-navy-700 shadow-sm transition hover:bg-slate-50">
                    View Driver Management &rarr;
                 </button>
                 <button onClick={() => navigate('/reports?tab=compliance')} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-navy-900">
                    View Compliance Report &rarr;
                 </button>
               </div>
            </Card>

          </div>

          {/* --- Right sidebar: activity feed --- */}
          <Card title="Recent Compliance Activity" className="h-fit xl:sticky xl:top-24">
             <p className="text-[11px] text-slate-400 mb-4 pb-2 border-b border-slate-100">Scoped to compliance/safety events only — excludes trip dispatch, fuel, and maintenance activity shown to other roles</p>
            <ul className="space-y-1">
              {!data?.activity || data.activity.length === 0 ? (
                <li className="text-[12.5px] text-slate-500 py-2">No recent compliance activity.</li>
              ) : (
                data.activity.map((ev: any) => {
                  let Icon = ShieldIcon;
                  let cls = 'bg-slate-50 text-slate-600';
                  if (ev.type === 'critical') { Icon = AlertIcon; cls = 'bg-red-50 text-red-600'; }
                  if (ev.type === 'warning') { Icon = AlertIcon; cls = 'bg-amber-50 text-amber-600'; }
                  if (ev.type === 'check') { Icon = ShieldIcon; cls = 'bg-teal-50 text-teal-600'; }
                  
                  return (
                    <li key={ev.id} className="flex gap-3 rounded-lg p-2 transition hover:bg-slate-50">
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cls}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] leading-snug text-navy-800">{ev.text}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{new Date(ev.time).toLocaleString()}</span>
                      </span>
                    </li>
                  )
                })
              )}
            </ul>
          </Card>
        </div>
      </main>
    </div>
  )
}


function AdminManagerDashboard({ user }: { user: any }) {
  const navigate = useNavigate()
  const role = user?.role as RoleId
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [vehicleType, setVehicleType] = useState('All Vehicle Types')
  const [status, setStatus] = useState('All Statuses')
  const [region, setRegion] = useState('All Regions')

  const [riskScores, setRiskScores] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, riskRes] = await Promise.all([
          dashboardService.getAdmin(),
          maintenanceService.getRiskScores(),
        ])
        setData(dashRes.data)
        setRiskScores(riskRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const actions = useMemo(() => quickActions.filter((a) => a.roles.includes(role)), [role])

  const highRisk = riskScores.filter((v: any) => v.riskBand === 'High')
  const mediumRisk = riskScores.filter((v: any) => v.riskBand === 'Medium')
  const topRiskVehicles = riskScores.slice(0, 5)

  if (loading && !data) return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>

  // Create kpis dynamically from data
  const dynamicKpis = [
    { key: 'active_vehicles', label: 'Active Vehicles', value: data?.activeVehicles?.toLocaleString('en-IN') || '0', trend: 3.4, icon: TruckIcon, roles: ['ADMIN', 'MANAGER'], accent: 'navy' as const },
    { key: 'available_vehicles', label: 'Available Vehicles', value: data?.availableVehicles?.toLocaleString('en-IN') || '0', trend: 1.2, icon: CarIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' as const },
    { key: 'maintenance', label: 'Vehicles in Maintenance', value: data?.maintenanceVehicles?.toLocaleString('en-IN') || '0', trend: 6.1, trendGood: false, icon: WrenchIcon, roles: ['ADMIN', 'MANAGER'], accent: 'amber' as const },
    { key: 'active_trips', label: 'Active Trips', value: data?.activeTrips?.toLocaleString('en-IN') || '0', trend: 4.8, icon: RouteIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER'], accent: 'navy' as const },
    { key: 'pending_trips', label: 'Pending Trips', value: data?.pendingTrips?.toLocaleString('en-IN') || '0', trend: -2.3, trendGood: false, icon: ClockIcon, roles: ['ADMIN', 'MANAGER', 'DRIVER'], accent: 'amber' as const },
    { key: 'drivers_on_duty', label: 'Drivers On Duty', value: data?.driversOnDuty?.toLocaleString('en-IN') || '0', trend: 2.0, icon: UsersIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' as const },
    { key: 'utilization', label: 'Fleet Utilization', value: `${(data?.fleetUtilization || 0).toFixed(1)}%`, trend: 5.2, icon: GaugeIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' as const },
    { key: 'fuel_cost', label: 'Monthly Fuel & Expenses', value: formatLargeCurrency(data?.fuelCost || 0), trend: -4.1, trendGood: false, icon: FuelIcon, roles: ['ADMIN', 'MANAGER'], accent: 'navy' as const },
    { key: 'maint_spend', label: 'Maintenance Spend', value: formatLargeCurrency(data?.maintCost || 0), trend: 2.7, trendGood: false, icon: WrenchIcon, roles: ['ADMIN', 'MANAGER'], accent: 'amber' as const },
    { key: 'cost_per_km', label: 'Cost per Km', value: `₹${(data?.costPerKm || 0).toFixed(2)}`, trend: -1.8, icon: CoinIcon, roles: ['ADMIN', 'MANAGER'], accent: 'teal' as const },
  ].filter(k => k.roles.includes(role))


  return (
    <div className="font-sans text-navy-950 dark:text-slate-200">
      <div className="border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-end gap-3 px-4 py-3 sm:px-6">
          <Select
            label="Vehicle Type"
            value={vehicleType}
            onChange={setVehicleType}
            options={['All Vehicle Types', 'Truck', 'Van', 'Bike', 'Car']}
          />
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={['All Statuses', 'Available', 'On Trip', 'In Shop', 'Retired']}
          />
          <Select
            label="Region"
            value={region}
            onChange={setRegion}
            options={['All Regions', 'Region A', 'Region B', 'Region C', 'Region D']}
          />
          <p className="ml-auto self-center text-[12px] text-slate-400 dark:text-slate-500">
            Viewing as <span className="font-semibold text-navy-700 dark:text-navy-300">{ROLE_LABEL[role]}</span> · sections adapt to role
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {dynamicKpis.map((k) => {
                const a = accentMap[k.accent]
                const Icon = k.icon
                return (
                  <div
                    key={k.key}
                    className="group rounded-xl border border-slate-200/80 dark:border-navy-700 bg-white dark:bg-navy-800 p-5 shadow-sm shadow-navy-900/[0.04] dark:shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy-900/[0.08] dark:hover:shadow-black/40"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`grid h-9 w-9 place-items-center rounded-lg ${a.bg} ${a.fg}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <TrendPill trend={k.trend} good={k.trendGood ?? true} />
                    </div>
                    <p className="text-[28px] font-bold leading-none tracking-tight text-navy-950 dark:text-white truncate" title={String(k.value)}>{k.value}</p>
                    <p className="mt-2 text-[12.5px] font-medium text-slate-500 dark:text-slate-400 truncate" title={k.label}>{k.label}</p>
                  </div>
                )
              })}
            </div>

            {actions.length > 0 && (
              <Card title="Quick Actions" roles={quickActions.flatMap((a) => a.roles).filter((v, i, s) => s.indexOf(v) === i)}>
                <div className="flex flex-wrap gap-2.5">
                  {actions.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => {
                        if (a.key === 'create_trip') navigate('/trips')
                        else if (a.key === 'reg_driver') navigate('/drivers')
                        else if (a.key === 'reg_vehicle') navigate('/registry')
                        else if (a.key === 'log_maint') navigate('/maintenance')
                        else if (a.key === 'log_fuel') navigate('/fuel')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-navy-900 focus-visible:ring-4 focus-visible:ring-navy-800/25"
                    >
                      <PlusIcon className="h-4 w-4 text-teal-400" />
                      {a.label}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* ── 🔧 Maintenance Risk Alerts ──────────────────────── */}
            <Card title="🔧 Maintenance Risk Alerts" roles={['ADMIN', 'MANAGER']}>
              {highRisk.length === 0 && mediumRisk.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg bg-teal-50 dark:bg-teal-900/30 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 dark:bg-teal-800 text-teal-600 dark:text-teal-400">
                    <ShieldIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-teal-800 dark:text-teal-300">All vehicles are currently low risk ✅</p>
                    <p className="text-[12px] text-teal-600 dark:text-teal-400">No vehicles require urgent maintenance attention.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-3">
                    {highRisk.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-[13px] font-semibold text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-200 dark:ring-red-800">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {highRisk.length} High Risk
                      </span>
                    )}
                    {mediumRisk.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 text-[13px] font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-200 dark:ring-amber-800">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        {mediumRisk.length} Medium Risk
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {topRiskVehicles.map((v: any) => {
                      const bandColor =
                        v.riskBand === 'High'
                          ? 'bg-red-500'
                          : v.riskBand === 'Medium'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      const bandTextColor =
                        v.riskBand === 'High'
                          ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 ring-red-200 dark:ring-red-800'
                          : v.riskBand === 'Medium'
                          ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 ring-amber-200 dark:ring-amber-800'
                          : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 ring-emerald-200 dark:ring-emerald-800'
                      return (
                        <li
                          key={v.vehicleId}
                          className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-navy-700 p-3 transition hover:bg-slate-50 dark:hover:bg-navy-700/50"
                        >
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${bandColor}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-navy-900 dark:text-white">
                              {v.registrationNo}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {v.make} {v.model}
                            </span>
                          </span>
                          <span className="text-[18px] font-bold tabular-nums text-navy-900 dark:text-white">
                            {v.riskScore}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${bandTextColor}`}
                          >
                            {v.riskBand}
                          </span>
                          <button
                            onClick={() => navigate('/vehicles')}
                            className="shrink-0 text-[12px] font-semibold text-teal-700 dark:text-teal-400 transition hover:text-teal-900 dark:hover:text-teal-300"
                          >
                            View →
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Fleet Utilization — Last 30 Days" roles={['ADMIN', 'MANAGER']} className="lg:col-span-2">
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.utilizationTrend || []} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="utilFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={4} />
                        <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip content={<ChartTooltip unit="%" />} />
                        <Area type="monotone" dataKey="utilization" stroke="#0d9488" strokeWidth={2.5} fill="url(#utilFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card title="Vehicle Status Breakdown" roles={['ADMIN', 'MANAGER']}>
                  <div className="flex items-center gap-4">
                    <div className="h-[180px] w-[180px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data?.vehicleStatus || []} dataKey="value" innerRadius={54} outerRadius={80} paddingAngle={2} stroke="none">
                            {(data?.vehicleStatus || []).map((s: any) => (
                              <Cell key={s.name} fill={s.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="flex-1 space-y-2.5">
                      {(data?.vehicleStatus || []).map((s: any) => (
                        <li key={s.name} className="flex items-center gap-2 text-[13px]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                          <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                          <span className="ml-auto font-semibold text-navy-900 dark:text-white">{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>

                <Card
                  title="Operational Cost — Fuel vs Maintenance"
                  roles={['ADMIN', 'MANAGER']}
                  className=""
                >
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.costTrend || []} margin={{ top: 6, right: 8, left: -20, bottom: 0 }} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="k" />
                        <Tooltip content={<ChartTooltip unit="k" />} cursor={{ fill: '#f1f5f9' }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="fuel" name="Fuel" fill="#1e3a5f" radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="maintenance" name="Maintenance" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card title="Driver Safety Scores" roles={['ADMIN', 'MANAGER']}>
                  <ul className="space-y-3">
                    {(data?.safetyScores || []).map((d: any) => {
                      const tone = d.score >= 90 ? '#0d9488' : d.score >= 75 ? '#f59e0b' : '#ef4444'
                      return (
                        <li key={d.name} className="flex items-center gap-3 text-[13px]">
                          <span className="w-28 shrink-0 truncate text-slate-600 dark:text-slate-400">{d.name}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-900">
                            <span className="block h-full rounded-full" style={{ width: `${d.score}%`, background: tone }} />
                          </span>
                          <span className="w-8 text-right font-semibold text-navy-900 dark:text-white">{d.score}</span>
                        </li>
                      )
                    })}
                  </ul>
                </Card>

                <Card title="Driver Compliance" roles={['ADMIN', 'MANAGER']} action={<ShieldIcon className="h-4 w-4 text-teal-600" />}>
                  <div className="grid grid-cols-2 gap-4">
                    {(data?.compliance || []).map((c: any) => (
                      <div key={c.label} className="rounded-lg bg-navy-50/60 dark:bg-navy-900/40 p-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[22px] font-bold text-navy-900 dark:text-white">{c.value}</span>
                          <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">%</span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{c.label}</p>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-900">
                          <span
                            className="block h-full rounded-full bg-teal-600"
                            style={{ width: `${c.value}%` }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
            </div>
          </div>

          <Card title="Recent Activity" roles={ROLES.map((r) => r.id)} className="h-fit xl:sticky xl:top-24">
            <ul className="space-y-1">
              {(data?.activity || []).map((ev: any) => {
                const conf = activityIcon[ev.type]
                const Icon = conf.icon
                return (
                  <li key={ev.id} className="flex gap-3 rounded-lg p-2 transition hover:bg-slate-50 dark:hover:bg-navy-800">
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${conf.cls} dark:opacity-80`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] leading-snug text-navy-800 dark:text-slate-200">{ev.text}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">{new Date(ev.time).toLocaleString()}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </main>
    </div>
  )
}


export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role as RoleId

  if (role === 'DRIVER') {
    return <DriverDashboard user={user} />
  }

  if (role === 'FINANCIAL_ANALYST') {
    return <FinancialAnalystDashboard user={user} />
  }

  if (role === 'SAFETY_OFFICER') {
    return <SafetyOfficerDashboard user={user} />
  }

  if (role === 'UNASSIGNED') {
    return (
      <div className="font-sans text-navy-950 mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-500">
            <AlertIcon className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-navy-900">Account Pending Approval</h2>
          <p className="mt-2 text-[14px] text-slate-500">Your account is currently under review by an administrator. You will gain access to the dashboard once a role is assigned.</p>
        </div>
      </div>
    )
  }

  // Admin and Manager
  return <AdminManagerDashboard user={user} />
}
