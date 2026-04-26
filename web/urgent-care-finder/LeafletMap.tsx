'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Clinic } from '@/data/clinics'

function waitColor(minutes: number) {
  if (minutes <= 15) return '#22c55e'
  if (minutes <= 30) return '#f59e0b'
  return '#ef4444'
}

function makeIcon(clinic: { wait_time: number }, highlighted: boolean) {
  const color = waitColor(clinic.wait_time)
  const scale = highlighted ? 1.25 : 1
  return L.divIcon({
    className: '',
    iconSize: [56, 26],
    iconAnchor: [28, 13],
    html: `
      <div style="
        display:inline-flex;
        align-items:center;
        gap:5px;
        background:${color};
        color:#fff;
        padding:3px 9px;
        border-radius:999px;
        font:bold ${highlighted ? 12 : 10}px Inter,Arial,sans-serif;
        white-space:nowrap;
        box-shadow:0 2px 8px rgba(0,0,0,0.45);
        border:2px solid rgba(255,255,255,0.9);
        transform:scale(${scale});
        transform-origin:center;
      ">
        <span style="
          width:6px;height:6px;border-radius:50%;
          background:rgba(255,255,255,0.85);
          display:inline-block;flex-shrink:0;
        "></span>
        ${clinic.wait_time}m
      </div>`,
  })
}

// No module-scope icon needed — user position uses CircleMarker (pure SVG).

const LA_FALLBACK: [number, number] = [34.02, -118.35]

function isValidCoord(lat: number, lng: number) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  )
}

function FlyTo({ highlighted, clinics }: { highlighted: number | null; clinics: Clinic[] }) {
  const map = useMap()
  useEffect(() => {
    const id = highlighted != null && Number.isFinite(highlighted) ? highlighted : null
    const c = id != null ? clinics.find((cl) => cl.id === id) : null
    const target: [number, number] =
      c && isValidCoord(c.lat, c.lng) ? [c.lat, c.lng] : LA_FALLBACK
    const zoom = c && isValidCoord(c.lat, c.lng) ? 14 : 11

    const run = () => {
      if (!map || typeof map.flyTo !== 'function') return
      map.flyTo(target, zoom, { duration: 0.7, easeLinearity: 0.5 })
    }

    if (map?.whenReady) {
      map.whenReady(run)
    } else {
      run()
    }
  }, [highlighted, map])
  return null
}

/** Flies to the user's position exactly once, the first time a GPS fix arrives. */
function FlyToUser({ userPos }: { userPos: [number, number] | null }) {
  const map = useMap()
  const hasFlewRef = useRef(false)

  useEffect(() => {
    if (!userPos || hasFlewRef.current) return
    hasFlewRef.current = true
    map.flyTo(userPos, 14, { duration: 1.2, easeLinearity: 0.4 })
  }, [userPos, map])

  return null
}

interface Props {
  highlighted: number | null
  clinics: Clinic[]
}

type LocationStatus = 'locating' | 'active' | 'denied' | 'unavailable'

export default function LeafletMap({ highlighted, clinics }: Props) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [locStatus, setLocStatus] = useState<LocationStatus>('locating')
  const watchIdRef = useRef<number | null>(null)

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocStatus('unavailable')
      return
    }
    setLocStatus('locating')

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords
      if (isValidCoord(lat, lng)) {
        setUserPos([lat, lng])
        setLocStatus('active')
      }
    }

    const handleError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setLocStatus('denied')
      } else {
        setLocStatus('unavailable')
      }
    }

    const opts: PositionOptions = { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, opts)
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, opts)
  }

  useEffect(() => {
    startTracking()
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* Location error banner — only shown when geolocation fails */}
      {(locStatus === 'denied' || locStatus === 'unavailable') && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[1000] flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-amber-100 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <svg className="h-4 w-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-slate-700">
              {locStatus === 'denied' ? (
                <>Location blocked. <button type="button" onClick={startTracking} className="font-semibold text-blue-600 underline-offset-2 hover:underline">Try again</button> or enable in browser settings.</>
              ) : (
                <>Location unavailable. On Mac: <strong>System Settings → Privacy → Location Services</strong> → enable for your browser.</>
              )}
            </span>
          </div>
        </div>
      )}

      <MapContainer
        center={LA_FALLBACK}
        zoom={11}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: '#e8e0d8' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />

        <FlyTo highlighted={highlighted} clinics={clinics} />
        <FlyToUser userPos={userPos} />

        {userPos && isValidCoord(userPos[0], userPos[1]) && (
          <Fragment>
            {/* accuracy halo */}
            <Circle
              center={userPos}
              radius={400}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.12, weight: 1 }}
            />
            {/* outer ring — CircleMarker is pure SVG, no icon/CSS loading needed */}
            <CircleMarker
              center={userPos}
              radius={14}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.25, weight: 0 }}
            />
            {/* solid blue dot */}
            <CircleMarker
              center={userPos}
              radius={8}
              pathOptions={{ color: '#ffffff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2.5 }}
            >
              <Popup>
                <div style={{ fontWeight: 700 }}>You are here</div>
              </Popup>
            </CircleMarker>
          </Fragment>
        )}

        {clinics.filter((c) => isValidCoord(c.lat, c.lng)).map((c) => {
          const color = waitColor(c.wait_time)
          const isHL = highlighted === c.id

          return (
            <Fragment key={c.id}>
              <Circle
                center={[c.lat, c.lng]}
                radius={isHL ? 900 : 600}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isHL ? 0.38 : 0.22,
                  weight: 0,
                }}
              />

              <Marker position={[c.lat, c.lng]} icon={makeIcon(c, isHL)}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>{c.name}</p>
                    <p style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>{c.address}</p>
                    <p style={{ fontWeight: 600, color, fontSize: 13 }}>{c.wait_time} min wait</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.hours}</p>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}
