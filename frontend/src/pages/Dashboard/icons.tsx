type P = { className?: string }
const base = (children: React.ReactNode, extra?: object) => (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden="true" {...extra}>
    {children}
  </svg>
)

const s = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const TruckIcon = base(
  <>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h8A1.5 1.5 0 0 1 14 6.5V16H3V6.5Z" {...s} />
    <path d="M14 9h3.6a1.5 1.5 0 0 1 1.24.66L21 12.9V16h-7V9Z" {...s} />
    <circle cx="7" cy="17.5" r="1.9" {...s} />
    <circle cx="17" cy="17.5" r="1.9" {...s} />
  </>,
)

export const CarIcon = base(
  <>
    <path d="M4 15v-2.2l1.7-4.2A2 2 0 0 1 7.5 7.4h9a2 2 0 0 1 1.86 1.2L20 12.8V15" {...s} />
    <path d="M3.5 15h17v2.5h-2V16H5.5v1.5h-2V15Z" {...s} />
    <path d="M6.5 12.5h11" {...s} />
  </>,
)

export const WrenchIcon = base(
  <path d="M14.7 6.3a3.6 3.6 0 0 0-4.9 4.2l-5 5a1.6 1.6 0 0 0 2.3 2.3l5-5a3.6 3.6 0 0 0 4.2-4.9l-2.1 2.1-1.7-.4-.4-1.7 2.6-1.6Z" {...s} />,
)

export const RouteIcon = base(
  <>
    <circle cx="6" cy="18" r="2.2" {...s} />
    <circle cx="18" cy="6" r="2.2" {...s} />
    <path d="M8 18h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h6" {...s} />
  </>,
)

export const ClockIcon = base(
  <>
    <circle cx="12" cy="12" r="8.5" {...s} />
    <path d="M12 7.5V12l3 2" {...s} />
  </>,
)

export const UsersIcon = base(
  <>
    <circle cx="9" cy="8.5" r="3" {...s} />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...s} />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.4 5.4 0 0 0-2.3-4.4" {...s} />
  </>,
)

export const GaugeIcon = base(
  <>
    <path d="M4 15a8 8 0 1 1 16 0" {...s} />
    <path d="M12 15l3.5-3.5" {...s} />
    <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
  </>,
)

export const FuelIcon = base(
  <>
    <path d="M5 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14M4 20h11" {...s} />
    <path d="M14 9h2.5A1.5 1.5 0 0 1 18 10.5V16a1.5 1.5 0 0 0 3 0V9l-2-2" {...s} />
    <path d="M7 8h5" {...s} />
  </>,
)

export const ShieldIcon = base(
  <>
    <path d="M12 3l7 2.5v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V5.5L12 3Z" {...s} />
    <path d="M9 12l2 2 4-4" {...s} />
  </>,
)

export const CoinIcon = base(
  <>
    <circle cx="12" cy="12" r="8.5" {...s} />
    <path d="M12 7.5v9M14.2 9.3c-.4-.8-1.3-1.2-2.5-1.2-1.6 0-2.4.8-2.4 1.8 0 2.6 5 1.2 5 3.8 0 1.1-.9 1.9-2.6 1.9-1.3 0-2.2-.5-2.6-1.3" {...s} />
  </>,
)

export const BellIcon = base(
  <>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.2 5.4 2 6.2H4c.8-.8 2-2.2 2-6.2Z" {...s} />
    <path d="M10 19a2 2 0 0 0 4 0" {...s} />
  </>,
)

export const ChevronDownIcon = base(<path d="M6 9l6 6 6-6" {...s} />)

export const PlusIcon = base(<path d="M12 5v14M5 12h14" {...s} />)

export const AlertIcon = base(
  <>
    <path d="M10.7 4.3 3 17.5A1.5 1.5 0 0 0 4.3 20h15.4a1.5 1.5 0 0 0 1.3-2.5L13.3 4.3a1.5 1.5 0 0 0-2.6 0Z" {...s} />
    <path d="M12 9.5v4M12 16.5v.1" {...s} />
  </>,
)

export const LogoutIcon = base(
  <>
    <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" {...s} />
    <path d="M10 12h10m0 0-3-3m3 3-3 3" {...s} />
  </>,
)

export const SearchIcon = base(
  <>
    <circle cx="11" cy="11" r="6.5" {...s} />
    <path d="m20 20-3.6-3.6" {...s} />
  </>,
)

export const EditIcon = base(
  <>
    <path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17v3Z" {...s} />
    <path d="m14.5 6.5 3 3" {...s} />
  </>,
)

export const HistoryIcon = base(
  <>
    <path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5H8.5" {...s} />
    <path d="M12 8v4l3 2" {...s} />
  </>,
)

export const XIcon = base(<path d="M6 6l12 12M18 6 6 18" {...s} />)

export const ArrowRightIcon = base(<path d="M4 12h15m0 0-6-6m6 6-6 6" {...s} />)

export const CheckIcon = base(<path d="M4.5 12.5 9 17l10.5-11" {...s} />)

export const ChevronLeftIcon = base(<path d="m15 6-6 6 6 6" {...s} />)
export const ChevronRightIcon = base(<path d="m9 6 6 6-6 6" {...s} />)

export const InboxIcon = base(
  <>
    <path d="M3 13.5 5.2 6a2 2 0 0 1 1.9-1.4h9.8A2 2 0 0 1 18.8 6L21 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-4.5Z" {...s} />
    <path d="M3 13.5h5a2 2 0 0 0 4 0h.5a2 2 0 0 0 4 0H21" {...s} />
  </>,
)

export const SettingsIcon = base(
  <>
    <circle cx="12" cy="12" r="3" {...s} />
    <path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3" {...s} />
  </>,
)

export const HomeIcon = base(
  <>
    <path d="M4 11.5 12 5l8 6.5" {...s} />
    <path d="M6 10.5V19h12v-8.5" {...s} />
    <path d="M10 19v-4.5h4V19" {...s} />
  </>,
)

export const ChartBarIcon = base(
  <>
    <path d="M4 20V4M4 20h16" {...s} />
    <path d="M8 20v-6M12.5 20V8M17 20v-9" {...s} />
  </>,
)

export const MenuIcon = base(<path d="M4 7h16M4 12h16M4 17h16" {...s} />)

export const PanelLeftIcon = base(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" {...s} />
    <path d="M9.5 4.5v15" {...s} />
  </>,
)
