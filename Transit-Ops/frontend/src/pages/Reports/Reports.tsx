import { useMemo, useState, type ReactNode } from 'react'
import useAuth from '../../hooks/useAuth'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts'
import { ChevronDownIcon, GaugeIcon, FuelIcon, CoinIcon, RouteIcon, ShieldIcon } from '../Dashboard/icons'
import { type RoleId } from '../Dashboard/data'
import { VEHICLES, inr } from '../VehicleRegistry/data'
import { formatDate } from '../DriverManagement/data'
import { vehicleMetrics, kpis, fleetBreakdown, combinedTrend, complianceRows, licenseWatch, safetyDistribution } from './analytics'

const NAVY = '#3a6497'
const TEAL = '#0d9488'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const RED = '#ef4444'
const GREY = '#94a3b8'

const inrK = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : `₹${n}`)

/* ---------- tabs ---------- */

type TabId = 'overview' | 'fuel' | 'utilization' | 'cost' | 'roi' | 'compliance'
const TABS: { id: TabId; label: string; roles: RoleId[]; note?: string }[] = [
  { id: 'overview', label: 'Overview', roles: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST', 'SAFETY_OFFICER'] },
  { id: 'fuel', label: 'Fuel Efficiency', roles: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST'] },
  { id: 'utilization', label: 'Fleet Utilization', roles: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST'] },
  { id: 'cost', label: 'Operational Cost', roles: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST'] },
  { id: 'roi', label: 'Vehicle ROI', roles: ['ADMIN', 'MANAGER', 'FINANCIAL_ANALYST'] },
  { id: 'compliance', label: 'Compliance', roles: ['ADMIN', 'MANAGER', 'SAFETY_OFFICER'], note: 'Safety Officer' },
]

/* ---------- shared UI ---------- */

function Panel({ title, subtitle, children, right }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-navy-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  )
}

function StatCard({ label, value, icon: Icon, fg, bg }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; fg: string; bg: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-navy-900/[0.04]">
      <div className="mb-3 flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${bg} ${fg}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-[26px] font-bold leading-none tracking-tight text-navy-950">{value}</p>
      <p className="mt-2 text-[12.5px] font-medium text-slate-500">{label}</p>
    </div>
  )
}

const shortReg = (reg: string) => reg.split('-').slice(-2).join('-')

function DataTable({ head, rows, aligns }: { head: string[]; rows: (string | number)[][]; aligns?: ('left' | 'right')[] }) {
  const align = (i: number) => (aligns?.[i] === 'right' ? 'text-right tabular-nums' : 'text-left')
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {head.map((h, i) => (
              <th key={h} className={`px-3.5 py-2.5 ${align(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[12.5px]">
          {rows.map((r, ri) => (
            <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
              {r.map((c, ci) => (
                <td key={ci} className={`px-3.5 py-2.5 ${ci === 0 ? 'font-medium text-navy-900' : 'text-slate-600'} ${align(ci)}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }

/* ---------- filter bar ---------- */

const DATE_PRESETS = ['Last 7 Days', 'Last 30 Days', 'This Quarter', 'Custom'] as const
const MODULES = ['All Modules', 'Vehicle', 'Driver', 'Trip', 'Maintenance', 'Fuel']
const REGIONS = ['All Regions', 'North', 'South', 'East', 'West']

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-[13px] font-medium text-navy-900 outline-none transition hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15">
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  )
}

/* ---------- Page ---------- */

export default function Reports() {
  const { user } = useAuth()
  const role = user?.role as RoleId
  const isSafety = role === 'MANAGER'
  const canExport = role === 'MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const visibleTabs = TABS.filter((t) => t.roles.includes(role))

  const [tab, setTab] = useState<TabId>(isSafety ? 'compliance' : 'overview')
  const [region, setRegion] = useState('All Regions')
  const [preset, setPreset] = useState<(typeof DATE_PRESETS)[number]>('Last 30 Days')
  const [module, setModule] = useState('All Modules')
  const [driverFilter, setDriverFilter] = useState('All Drivers')
  const [vehicleFilter, setVehicleFilter] = useState('All Vehicles')
  const [exportOpen, setExportOpen] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(false)

  const trendWindow = preset === 'This Quarter' ? 90 : preset === 'Last 7 Days' ? 7 : 30
  const trend = useMemo(() => combinedTrend.slice(-trendWindow), [trendWindow])

  const metrics = useMemo(
    () => (vehicleFilter === 'All Vehicles' ? vehicleMetrics : vehicleMetrics.filter((m) => m.reg === vehicleFilter)),
    [vehicleFilter],
  )
  const compRows = useMemo(
    () => (driverFilter === 'All Drivers' ? complianceRows : complianceRows.filter((r) => r.name === driverFilter)),
    [driverFilter],
  )

  function resetFilters() {
    setRegion('All Regions')
    setPreset('Last 30 Days')
    setModule('All Modules')
    setDriverFilter('All Drivers')
    setVehicleFilter('All Vehicles')
  }

  function exportCsv() {
    let head: string[] = []
    let body: (string | number)[][] = []
    if (tab === 'fuel') {
      head = ['Vehicle', 'Total Distance (km)', 'Total Fuel (L)', 'Efficiency (km/L)']
      body = fuelRows.map((m) => [m.reg, m.distanceKm, m.fuelL, m.efficiency])
    } else if (tab === 'utilization') {
      head = ['Vehicle', 'Days Active', 'Days Idle', 'Utilization %']
      body = metrics.map((m) => [m.reg, m.daysActive, m.daysIdle, m.utilization])
    } else if (tab === 'cost') {
      head = ['Vehicle', 'Fuel Cost', 'Maintenance Cost', 'Other', 'Total Cost']
      body = metrics.map((m) => [m.reg, m.fuelCost, m.maintCost, m.otherCost, m.totalCost])
    } else if (tab === 'roi') {
      head = ['Vehicle', 'Revenue', 'Maintenance+Fuel', 'Acquisition Cost', 'ROI %']
      body = metrics.map((m) => [m.reg, m.revenue, m.maintCost + m.fuelCost, m.acquisition, m.roi])
    } else if (tab === 'compliance') {
      head = ['Driver', 'License Status', 'Safety Score', 'Last Trip']
      body = compRows.map((r) => [r.name, r.licenseState, r.safety, r.lastTrip === '—' ? '—' : r.lastTrip])
    } else {
      head = ['Metric', 'Value']
      body = [
        ['Avg Fuel Efficiency (km/L)', kpis.avgEfficiency],
        ['Fleet Utilization %', kpis.fleetUtilization],
        ['Total Operational Cost', kpis.totalOperationalCost],
        ['Avg Vehicle ROI %', kpis.avgRoi],
      ]
    }
    const csv = [head, ...body].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transitops-report-${tab}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  const fuelRows = useMemo(() => metrics.filter((m) => m.efficiency > 0).sort((a, b) => b.efficiency - a.efficiency), [metrics])
  const costRows = useMemo(() => metrics.filter((m) => m.totalCost > 0).sort((a, b) => b.totalCost - a.totalCost), [metrics])
  const roiRows = useMemo(() => [...metrics].sort((a, b) => b.roi - a.roi), [metrics])

  return (
    <div className="font-sans text-navy-950">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {/* header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-navy-950">Reports &amp; Analytics</h1>
              <span className="rounded-full bg-navy-50 px-2.5 py-1 font-mono text-[10.5px] font-medium text-navy-600">
                Fleet Manager · Financial Analyst · Safety Officer (Compliance tab only) — not visible to Driver
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              {isSafety ? 'Compliance reporting view' : 'Operational & financial reporting'}
            </p>
          </div>

          {canExport && (
            <div className="relative">
              <button onClick={() => setExportOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-navy-900">
                Export
                <ChevronDownIcon className={`h-4 w-4 text-teal-300 transition ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="animate-form-in absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-navy-900/10">
                    <button onClick={exportCsv} className="flex w-full items-center px-3.5 py-2.5 text-left text-[13px] font-medium text-navy-800 transition hover:bg-slate-50">
                      Export as CSV
                    </button>
                    <div className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] text-slate-400">
                      Export as PDF
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Coming Soon</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium transition ${
                tab === t.id ? 'text-navy-900' : 'text-slate-500 hover:text-navy-700'
              }`}
            >
              {t.label}
              {t.note && <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-teal-700">{t.note}</span>}
              {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal-600" />}
            </button>
          ))}
        </div>

        {/* global filter bar */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect label="Region" value={region} options={REGIONS} onChange={setRegion} />
            <FilterSelect label="Date Range" value={preset} options={[...DATE_PRESETS]} onChange={(v) => setPreset(v as (typeof DATE_PRESETS)[number])} />
            <FilterSelect label="Module" value={module} options={MODULES} onChange={setModule} />
            <FilterSelect label="Driver" value={driverFilter} options={['All Drivers', ...complianceRows.map((r) => r.name)]} onChange={setDriverFilter} />
            <FilterSelect label="Vehicle" value={vehicleFilter} options={['All Vehicles', ...vehicleMetrics.map((m) => m.reg)]} onChange={setVehicleFilter} />
            <div className="flex items-center gap-3 pb-0.5">
              <button className="h-10 rounded-lg bg-teal-600 px-4 text-[13px] font-semibold text-white transition hover:bg-teal-700">Apply Filters</button>
              <button onClick={resetFilters} className="text-[13px] font-medium text-slate-500 transition hover:text-navy-800 hover:underline">
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ---------------- OVERVIEW ---------------- */}
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Avg Fuel Efficiency (km/L)" value={String(kpis.avgEfficiency)} icon={FuelIcon} fg="text-navy-800" bg="bg-navy-50" />
              <StatCard label="Fleet Utilization" value={`${kpis.fleetUtilization}%`} icon={GaugeIcon} fg="text-teal-700" bg="bg-teal-50" />
              <StatCard label="Total Operational Cost" value={inr(kpis.totalOperationalCost)} icon={CoinIcon} fg="text-amber-600" bg="bg-amber-50" />
              <StatCard label="Avg Vehicle ROI" value={`${kpis.avgRoi}%`} icon={RouteIcon} fg="text-navy-800" bg="bg-navy-50" />
            </div>
            <Panel title="Combined Performance Trend" subtitle={`Utilization %, efficiency (km/L) & cost index — ${preset.toLowerCase()}`}>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                    <YAxis tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="utilization" name="Utilization %" stroke={NAVY} strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="costIndex" name="Cost Index" stroke={AMBER} strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="efficiency" name="Efficiency (km/L)" stroke={TEAL} strokeWidth={2.2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        )}

        {/* ---------------- FUEL EFFICIENCY ---------------- */}
        {tab === 'fuel' && (
          <Panel title="Fuel Efficiency by Vehicle" subtitle="Distance / fuel ratio (km per litre), best to worst">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelRows.map((m) => ({ reg: shortReg(m.reg), efficiency: m.efficiency }))} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="reg" tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} km/L`, 'Efficiency']} />
                  <Bar dataKey="efficiency" fill={TEAL} radius={[5, 5, 0, 0]} maxBarSize={46}>
                    <LabelList dataKey="efficiency" position="top" style={{ fontSize: 10, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              head={['Vehicle', 'Total Distance', 'Total Fuel', 'Efficiency (km/L)']}
              aligns={['left', 'right', 'right', 'right']}
              rows={fuelRows.map((m) => [m.reg, `${m.distanceKm.toLocaleString('en-IN')} km`, `${m.fuelL} L`, m.efficiency])}
            />
          </Panel>
        )}

        {/* ---------------- FLEET UTILIZATION ---------------- */}
        {tab === 'utilization' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title="Fleet Composition" subtitle="Active vs Idle vs In Shop vs Retired">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2}>
                      {fleetBreakdown.map((b) => (
                        <Cell key={b.name} fill={b.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Utilization Trend" subtitle={`Fleet utilization % — ${preset.toLowerCase()}`}>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                    <YAxis tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} domain={[40, 100]} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Utilization']} />
                    <Line type="monotone" dataKey="utilization" stroke={NAVY} strokeWidth={2.4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <div className="lg:col-span-2">
              <Panel title="Per-Vehicle Utilization" subtitle="Active vs idle days over the last 30 days">
                <DataTable
                  head={['Vehicle', 'Days Active', 'Days Idle', 'Utilization %']}
                  aligns={['left', 'right', 'right', 'right']}
                  rows={metrics.map((m) => [m.reg, m.daysActive, m.daysIdle, `${m.utilization}%`])}
                />
              </Panel>
            </div>
          </div>
        )}

        {/* ---------------- OPERATIONAL COST ---------------- */}
        {tab === 'cost' && (
          <Panel title="Operational Cost Breakdown" subtitle="Fuel vs maintenance vs other expenses, per vehicle">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costRows.map((m) => ({ reg: shortReg(m.reg), Fuel: m.fuelCost, Maintenance: m.maintCost, Other: m.otherCost }))} margin={{ top: 12, right: 12, bottom: 0, left: -4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="reg" tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} tickFormatter={(v) => inrK(Number(v))} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Fuel" stackId="c" fill={NAVY} maxBarSize={46} />
                  <Bar dataKey="Maintenance" stackId="c" fill={AMBER} maxBarSize={46} />
                  <Bar dataKey="Other" stackId="c" fill={TEAL} radius={[5, 5, 0, 0]} maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              head={['Vehicle', 'Fuel Cost', 'Maintenance Cost', 'Other', 'Total Cost']}
              aligns={['left', 'right', 'right', 'right', 'right']}
              rows={costRows.map((m) => [m.reg, inr(m.fuelCost), inr(m.maintCost), inr(m.otherCost), inr(m.totalCost)])}
            />
          </Panel>
        )}

        {/* ---------------- VEHICLE ROI ---------------- */}
        {tab === 'roi' && (
          <Panel title="Vehicle ROI" subtitle="(Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiRows.map((m) => ({ reg: shortReg(m.reg), roi: m.roi }))} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="reg" tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'ROI']} />
                  <Bar dataKey="roi" radius={[5, 5, 0, 0]} maxBarSize={46}>
                    {roiRows.map((m) => (
                      <Cell key={m.reg} fill={m.roi >= 0 ? GREEN : RED} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              head={['Vehicle', 'Revenue', 'Maintenance + Fuel', 'Acquisition Cost', 'ROI %']}
              aligns={['left', 'right', 'right', 'right', 'right']}
              rows={roiRows.map((m) => [m.reg, inr(m.revenue), inr(m.maintCost + m.fuelCost), inr(m.acquisition), `${m.roi}%`])}
            />
          </Panel>
        )}

        {/* ---------------- COMPLIANCE ---------------- */}
        {tab === 'compliance' && (
          <div className="space-y-5">
            <Panel title="License Watch" subtitle="Drivers with expiring or expired licenses" right={<ShieldIcon className="h-5 w-5 text-teal-600" />}>
              {licenseWatch.length === 0 ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">All driver licenses are currently valid.</p>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {licenseWatch.map((r) => (
                    <div
                      key={r.name}
                      className={`rounded-lg border px-3.5 py-2.5 ${r.licenseState === 'Expired' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                    >
                      <p className="text-[13px] font-semibold text-navy-900">{r.name}</p>
                      <p className={`text-[11.5px] font-medium ${r.licenseState === 'Expired' ? 'text-red-600' : 'text-amber-700'}`}>
                        {r.licenseState} · {formatDate(r.expiry)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Safety Score Distribution" subtitle="Number of drivers per score band">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={safetyDistribution} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="band" tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: GREY }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} drivers`, 'Count']} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={54}>
                      {safetyDistribution.map((b, i) => (
                        <Cell key={b.band} fill={i === 0 ? GREEN : i === 1 ? TEAL : i === 2 ? NAVY : i === 3 ? AMBER : RED} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Driver Compliance Detail" subtitle="License status, safety score & most recent trip">
              <DataTable
                head={['Driver', 'License Status', 'Safety Score', 'Last Trip Date']}
                aligns={['left', 'left', 'right', 'left']}
                rows={compRows.map((r) => [r.name, r.licenseState, r.safety, r.lastTrip === '—' ? '—' : formatDate(r.lastTrip)])}
              />
            </Panel>
          </div>
        )}

        {/* ---------------- CUSTOM REPORT BUILDER ---------------- */}
        {canExport && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-navy-900/[0.04]">
            <button onClick={() => setBuilderOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50">
              <div>
                <h3 className="text-[15px] font-semibold text-navy-900">Build Custom Report</h3>
                <p className="mt-0.5 text-[12.5px] text-slate-500">Combine dimensions and preview results before exporting.</p>
              </div>
              <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition ${builderOpen ? 'rotate-180' : ''}`} />
            </button>
            {builderOpen && (
              <div className="border-t border-slate-100 p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <FilterSelect label="Department" value={region} options={REGIONS} onChange={setRegion} />
                  <FilterSelect label="Date Range" value={preset} options={[...DATE_PRESETS]} onChange={(v) => setPreset(v as (typeof DATE_PRESETS)[number])} />
                  <FilterSelect label="Module" value={module} options={MODULES} onChange={setModule} />
                  <FilterSelect label="Employee" value={driverFilter} options={['All Drivers', ...complianceRows.map((r) => r.name)]} onChange={setDriverFilter} />
                  <FilterSelect label="Vehicle" value={vehicleFilter} options={['All Vehicles', ...vehicleMetrics.map((m) => m.reg)]} onChange={setVehicleFilter} />
                  <FilterSelect label="Category" value={module} options={['All', 'Fuel', 'Maintenance', 'Toll', 'Other']} onChange={setModule} />
                </div>

                <p className="mb-2 mt-5 text-[12px] font-medium text-slate-500">Live preview</p>
                <DataTable
                  head={['Vehicle', 'Total Cost', 'Distance', 'Efficiency', 'ROI %']}
                  aligns={['left', 'right', 'right', 'right', 'right']}
                  rows={metrics.map((m) => [m.reg, inr(m.totalCost), `${m.distanceKm.toLocaleString('en-IN')} km`, m.efficiency, `${m.roi}%`])}
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button onClick={exportCsv} className="h-10 rounded-lg bg-teal-600 px-4 text-[13px] font-semibold text-white transition hover:bg-teal-700">
                    Export as CSV
                  </button>
                  <button disabled className="flex h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-[13px] font-semibold text-slate-400">
                    Export as PDF
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">Bonus</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
