import { useEffect, useRef, useState } from 'react'
import type { Trip, TripStatus } from '../pages/TripManagement/data'
import { TRIP_STATUS_STYLES, formatTripDate } from '../pages/TripManagement/data'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* ─── Status-aware styles ────────────────────────────── */

const ROUTE_COLORS: Record<TripStatus, string> = {
  Draft: '#0d9488',      // teal-600
  Dispatched: '#0d9488', // teal-600
  Completed: '#059669',  // emerald-600
  Cancelled: '#94a3b8',  // slate-400
}

const STATUS_TAG: Partial<Record<TripStatus, { label: string; cls: string }>> = {
  Completed: { label: '✓ Completed', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
  Cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-400/20' },
}

/* ─── Custom marker icon SVGs (inline, no external assets) ── */

function createMarkerIcon(color: string, glyph: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="7" fill="#fff"/>
      <text x="14" y="18" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}">${glyph}</text>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '', // no default leaflet styles
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  })
}

const SOURCE_ICON = createMarkerIcon('#0d9488', 'A')   // teal
const DEST_ICON = createMarkerIcon('#ea580c', 'B')     // orange-600

/* ─── Status pill (reused from TripManagement but self-contained) ── */

function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${TRIP_STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  )
}

/* ─── Map component ──────────────────────────────────── */

function RouteMap({ trip }: { trip: Trip }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  const hasCoords =
    trip.sourceLat != null &&
    trip.sourceLng != null &&
    trip.destLat != null &&
    trip.destLng != null

  useEffect(() => {
    if (!hasCoords || !mapRef.current) return
    if (mapInstance.current) return // already initialized

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map)

    const src: [number, number] = [trip.sourceLat!, trip.sourceLng!]
    const dst: [number, number] = [trip.destLat!, trip.destLng!]

    // Markers
    L.marker(src, { icon: SOURCE_ICON }).addTo(map).bindPopup(`<b>Source</b><br/>${trip.source}`)
    L.marker(dst, { icon: DEST_ICON }).addTo(map).bindPopup(`<b>Destination</b><br/>${trip.destination}`)

    // Route polyline
    const isCancelled = trip.status === 'Cancelled'
    L.polyline([src, dst], {
      color: ROUTE_COLORS[trip.status],
      weight: 3,
      opacity: isCancelled ? 0.5 : 0.85,
      dashArray: isCancelled ? '8 6' : undefined,
    }).addTo(map)

    // Fit bounds with padding
    const bounds = L.latLngBounds([src, dst])
    map.fitBounds(bounds, { padding: [40, 40] })

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [hasCoords, trip])

  if (!hasCoords) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
        <svg className="mb-2 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
        <p className="text-[13px] font-medium text-slate-500">Route preview unavailable for this trip.</p>
        <p className="mt-1 text-[11.5px] text-slate-400">Coordinates could not be resolved for these locations.</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm" style={{ height: 280 }}>
      {/* Map container */}
      <div ref={mapRef} className="h-full w-full" />

      {/* Info card overlay – top-left */}
      <div className="absolute left-3 top-3 z-[1000] rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-navy-900">{trip.id}</span>
          <StatusBadge status={trip.status} />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {trip.distanceKm ? `${trip.distanceKm.toLocaleString()} km planned` : 'Distance N/A'}
        </p>
      </div>

      {/* Status tag for completed/cancelled – bottom-right */}
      {STATUS_TAG[trip.status] && (
        <div className={`absolute bottom-3 right-3 z-[1000] rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TAG[trip.status]!.cls}`}>
          {STATUS_TAG[trip.status]!.label}
        </div>
      )}
    </div>
  )
}

/* ─── Main Detail Panel ──────────────────────────────── */

export default function TripDetailPanel({
  trip,
  onClose,
  vehicleLabel,
  driverLabel,
}: {
  trip: Trip
  onClose: () => void
  vehicleLabel?: string
  driverLabel?: string
}) {
  const details = [
    ['Source', trip.source],
    ['Destination', trip.destination],
    ['Vehicle', vehicleLabel || trip.vehicleReg],
    ['Driver', driverLabel || trip.driverName],
    ['Cargo Weight', `${(trip.cargoKg || 0).toLocaleString()} kg`],
    ['Planned Distance', `${(trip.distanceKm || 0).toLocaleString()} km`],
    ['Scheduled Date', formatTripDate(trip.date)],
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-mono text-[17px] font-semibold text-navy-950">{trip.id}</h2>
            <StatusBadge status={trip.status} />
          </div>
          <p className="mt-1 text-[13px] text-slate-500">Trip Details</p>
        </div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Trip info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-navy-50/60 p-3">
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="mt-1 text-[13.5px] font-semibold text-navy-900">{value}</p>
            </div>
          ))}
          <div className="rounded-lg bg-navy-50/60 p-3">
            <p className="text-[11px] text-slate-500">Status</p>
            <div className="mt-1">
              <StatusBadge status={trip.status} />
            </div>
          </div>
        </div>

        {/* Route Map Widget */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
            <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            Route Preview
          </h3>

          <RouteMap trip={trip} />

          {/* Fallback text labels below the map */}
          <div className="mt-2.5 flex items-start gap-4 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span className="text-slate-500">Source:</span>
              <span className="font-medium text-navy-800">{trip.source}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-500">Destination:</span>
              <span className="font-medium text-navy-800">{trip.destination}</span>
            </div>
          </div>
        </section>

        {/* Non-feature disclaimer */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <p className="text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-600">ℹ Note:</span>{' '}
            This is a static route preview based on trip source/destination data — NOT live GPS vehicle tracking. No real-time vehicle position is shown.
          </p>
        </div>
      </div>
    </div>
  )
}
