'use client'

import { Fragment, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { clinics } from '@/data/clinics'

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

const userIcon = L.divIcon({
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `
    <div style="position:relative;width:20px;height:20px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:rgba(59,130,246,0.35);
        animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;inset:3px;border-radius:50%;
        background:#3b82f6;
        border:2.5px solid #fff;
        box-shadow:0 1px 6px rgba(0,0,0,0.4);
      "></div>
    </div>
    <style>
      @keyframes ping {
        75%,100%{transform:scale(2);opacity:0}
      }
    </style>`,
})

const LA_FALLBACK: [number, number] = [34.02, -118.35]

function isValidCoord(lat: number, lng: number) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  )
}

function FlyTo({ highlighted }: { highlighted: number | null }) {
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

interface Props {
  highlighted: number | null
}

export default function LeafletMap({ highlighted }: Props) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (isValidCoord(lat, lng)) setUserPos([lat, lng])
      },
      () => {},
      { timeout: 8000 },
    )
  }, [])

  return (
    <MapContainer
      center={[34.02, -118.35]}
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

      <FlyTo highlighted={highlighted} />

      {userPos && isValidCoord(userPos[0], userPos[1]) && (
        <Fragment>
          <Circle
            center={userPos}
            radius={400}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1.5 }}
          />
          <Marker position={userPos} icon={userIcon}>
            <Popup>
              <div style={{ fontWeight: 700 }}>You are here</div>
            </Popup>
          </Marker>
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
  )
}
