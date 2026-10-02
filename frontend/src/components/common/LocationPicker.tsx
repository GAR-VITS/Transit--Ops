import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../services/api'

type LatLng = { lat: number; lng: number }
type Suggestion = {
  displayName: string
  lat: number
  lng: number
}

type LocationPickerProps = {
  source: string
  destination: string
  onSourceChange: (text: string, coords?: LatLng) => void
  onDestinationChange: (text: string, coords?: LatLng) => void
  onRouteCalculated: (distanceKm: number, durationMinutes: number) => void
  onRouteFailed: () => void
}

function createIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color}; border: 3px solid white;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })
}
const SOURCE_ICON = createIcon('#16a34a')
const DEST_ICON = createIcon('#dc2626')

function useDebounce(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export default function LocationPicker({
  source,
  destination,
  onSourceChange,
  onDestinationChange,
  onRouteCalculated,
  onRouteFailed,
}: LocationPickerProps) {
  const [activeField, setActiveField] = useState<'source' | 'destination' | null>(null)
  const [sourceSuggestions, setSourceSuggestions] = useState<Suggestion[]>([])
  const [destSuggestions, setDestSuggestions] = useState<Suggestion[]>([])
  const [sourceCoords, setSourceCoords] = useState<LatLng | null>(null)
  const [destCoords, setDestCoords] = useState<LatLng | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const debouncedSource = useDebounce(source, 400)
  const debouncedDest = useDebounce(destination, 400)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const sourceMarkerRef = useRef<L.Marker | null>(null)
  const destMarkerRef = useRef<L.Marker | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const activeFieldRef = useRef(activeField)
  activeFieldRef.current = activeField

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map)

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      const field = activeFieldRef.current
      if (!field) return

      try {
        const { data } = await api.get('/geocode/reverse', { params: { lat, lng } })
        if (data.displayName) {
          if (field === 'source') {
            onSourceChange(data.displayName, { lat: data.lat, lng: data.lng })
            setSourceCoords({ lat: data.lat, lng: data.lng })
          } else {
            onDestinationChange(data.displayName, { lat: data.lat, lng: data.lng })
            setDestCoords({ lat: data.lat, lng: data.lng })
          }
        }
      } catch (err) {
        console.error('Reverse geocoding failed:', err)
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!debouncedSource || debouncedSource.length < 2) {
      setSourceSuggestions([])
      return
    }
    if (sourceCoords) return

    const controller = new AbortController()
    api
      .get('/geocode/search', { params: { query: debouncedSource }, signal: controller.signal })
      .then(({ data }) => setSourceSuggestions(data))
      .catch(() => {})
    return () => controller.abort()
  }, [debouncedSource])

  useEffect(() => {
    if (!debouncedDest || debouncedDest.length < 2) {
      setDestSuggestions([])
      return
    }
    if (destCoords) return

    const controller = new AbortController()
    api
      .get('/geocode/search', { params: { query: debouncedDest }, signal: controller.signal })
      .then(({ data }) => setDestSuggestions(data))
      .catch(() => {})
    return () => controller.abort()
  }, [debouncedDest])

  useEffect(() => {
    if (!mapRef.current) return

    if (sourceCoords) {
      if (sourceMarkerRef.current) {
        sourceMarkerRef.current.setLatLng([sourceCoords.lat, sourceCoords.lng])
      } else {
        sourceMarkerRef.current = L.marker([sourceCoords.lat, sourceCoords.lng], { icon: SOURCE_ICON }).addTo(mapRef.current)
      }
    }

    if (destCoords) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destCoords.lat, destCoords.lng])
      } else {
        destMarkerRef.current = L.marker([destCoords.lat, destCoords.lng], { icon: DEST_ICON }).addTo(mapRef.current)
      }
    }

    if (sourceCoords && destCoords) {
      const bounds = L.latLngBounds(
        [sourceCoords.lat, sourceCoords.lng],
        [destCoords.lat, destCoords.lng]
      )
      mapRef.current.fitBounds(bounds, { padding: [40, 40] })
    } else if (sourceCoords) {
      mapRef.current.setView([sourceCoords.lat, sourceCoords.lng], 10)
    } else if (destCoords) {
      mapRef.current.setView([destCoords.lat, destCoords.lng], 10)
    }
  }, [sourceCoords, destCoords])

  useEffect(() => {
    if (!sourceCoords || !destCoords) return

    setIsCalculating(true)

    api
      .post('/geocode/route', {
        sourceLat: sourceCoords.lat,
        sourceLng: sourceCoords.lng,
        destLat: destCoords.lat,
        destLng: destCoords.lng,
      })
      .then(({ data }) => {
        onRouteCalculated(data.distanceKm, data.durationMinutes)

        if (mapRef.current && data.routeGeoJson) {
          if (routeLineRef.current) {
            mapRef.current.removeLayer(routeLineRef.current)
          }
          const coords = data.routeGeoJson.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          )
          routeLineRef.current = L.polyline(coords, {
            color: '#0d9488',
            weight: 4,
            opacity: 0.8,
          }).addTo(mapRef.current)

          mapRef.current.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] })
        }
      })
      .catch(() => {
        onRouteFailed()
      })
      .finally(() => setIsCalculating(false))
  }, [sourceCoords, destCoords])

  const selectSourceSuggestion = useCallback(
    (s: Suggestion) => {
      onSourceChange(s.displayName, { lat: s.lat, lng: s.lng })
      setSourceCoords({ lat: s.lat, lng: s.lng })
      setSourceSuggestions([])
    },
    [onSourceChange]
  )

  const selectDestSuggestion = useCallback(
    (s: Suggestion) => {
      onDestinationChange(s.displayName, { lat: s.lat, lng: s.lng })
      setDestCoords({ lat: s.lat, lng: s.lng })
      setDestSuggestions([])
    },
    [onDestinationChange]
  )

  const handleSourceType = (val: string) => {
    setSourceCoords(null)
    setSourceSuggestions([])
    if (routeLineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }
    onSourceChange(val)
  }

  const handleDestType = (val: string) => {
    setDestCoords(null)
    setDestSuggestions([])
    if (routeLineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }
    onDestinationChange(val)
  }

  const sourceInputRef = useRef<HTMLDivElement>(null)
  const destInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (sourceInputRef.current && !sourceInputRef.current.contains(e.target as Node)) {
        setSourceSuggestions([])
      }
      if (destInputRef.current && !destInputRef.current.contains(e.target as Node)) {
        setDestSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div className="space-y-3">
      <div ref={sourceInputRef} className="relative">
        <label className="text-[13px] font-medium text-navy-900 mb-1.5 block">Source</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500 ring-2 ring-green-200" />
          </span>
          <input
            className="h-11 w-full rounded-lg border bg-white pl-9 pr-3.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
            placeholder="Search starting point or tap on map…"
            value={source}
            onChange={(e) => handleSourceType(e.target.value)}
            onFocus={() => setActiveField('source')}
          />
          {sourceCoords && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            </span>
          )}
        </div>
        {sourceSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            {sourceSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-[13px] text-slate-700 transition hover:bg-slate-50"
                onClick={() => selectSourceSuggestion(s)}
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                <span className="line-clamp-2">{s.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={destInputRef} className="relative">
        <label className="text-[13px] font-medium text-navy-900 mb-1.5 block">Destination</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-200" />
          </span>
          <input
            className="h-11 w-full rounded-lg border bg-white pl-9 pr-3.5 text-[14px] text-navy-950 outline-none transition placeholder:text-slate-400 border-slate-300 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
            placeholder="Search destination or tap on map…"
            value={destination}
            onChange={(e) => handleDestType(e.target.value)}
            onFocus={() => setActiveField('destination')}
          />
          {destCoords && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            </span>
          )}
        </div>
        {destSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            {destSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-[13px] text-slate-700 transition hover:bg-slate-50"
                onClick={() => selectDestSuggestion(s)}
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                <span className="line-clamp-2">{s.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={mapContainerRef}
          className="h-[220px] w-full rounded-xl border border-slate-200 overflow-hidden"
          style={{ zIndex: 0 }}
        />
        {!activeField && !sourceCoords && !destCoords && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl bg-slate-50/60">
            <p className="text-[12px] text-slate-400 font-medium">Click a field above, then tap the map to set a pin</p>
          </div>
        )}
        {isCalculating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[13px] text-teal-700 font-medium">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Calculating route…
            </div>
          </div>
        )}
      </div>

      {activeField && (
        <p className="text-[11px] text-teal-700 font-medium">
          🗺️ Tap the map to set the <strong>{activeField === 'source' ? 'pickup' : 'drop-off'}</strong> point
        </p>
      )}
    </div>
  )
}
