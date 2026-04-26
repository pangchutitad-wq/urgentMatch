'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import { FALLBACK_CLINICS } from '@/data/fallbackClinics'

interface Clinic {
  name: string
  address: string
  matchPercent: number
  etaMinutes: number
  specialty: string
  currentPatients: number
  capacity: number
  doctorsOnDuty: number
  rating: number
  reviewCount: number
  openNow: boolean
  mapsUrl: string
  placeId?: string
  lat?: number
  lon?: number
  facilityLabel?: string
}

const SPECIALTY_LABELS: Record<string, string> = {
  general: 'General',
  orthopedic: 'Orthopedic',
  respiratory: 'Respiratory',
  gastrointestinal: 'Gastrointestinal',
  dermatology: 'Dermatology',
  pediatric: 'Pediatric',
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  )
}

function UrgencyBar({ urgency }: { urgency: number }) {
  const color = urgency >= 8 ? 'bg-red-500' : urgency >= 5 ? 'bg-orange-400' : 'bg-green-500'
  const label =
    urgency >= 8 ? 'High urgency — be seen soon' : urgency >= 5 ? 'Moderate urgency' : 'Low urgency'
  return (
    <div className={`${color} text-white text-center py-2 text-sm font-medium`}>
      {label} &nbsp;·&nbsp; urgency {urgency}/10
    </div>
  )
}

function LoadBar({ current, capacity }: { current: number; capacity: number }) {
  const pct = Math.min(Math.round((current / capacity) * 100), 100)
  const color = pct >= 70 ? 'bg-red-400' : pct >= 40 ? 'bg-orange-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs text-gray-500 w-16 shrink-0">Patient load</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{current}/{capacity}</span>
    </div>
  )
}

function ClinicSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-3 bg-gray-100 rounded w-full mb-1" />
      <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
      <div className="h-9 bg-gray-200 rounded-xl" />
    </div>
  )
}

function ResultsContent() {
  const params = useSearchParams()
  const specialty = params.get('specialty') ?? 'general'
  const urgency = Number(params.get('urgency') ?? 5)
  const lat = params.get('lat')
  const lon = params.get('lon')

  const [clinics, setClinics] = useState<Clinic[] | null>(null)

  useEffect(() => {
    const q = new URLSearchParams({ specialty, urgency: String(urgency) })
    if (lat) q.set('lat', lat)
    if (lon) q.set('lon', lon)
    fetch(`/api/clinics?${q}`)
      .then((r) => r.json())
      .then((data: Clinic[]) => setClinics(data.length ? data : [...FALLBACK_CLINICS]))
      .catch(() => setClinics([...FALLBACK_CLINICS]))
  }, [specialty, urgency, lat, lon])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <a href="/chat" className="text-gray-400 hover:text-gray-600 text-lg">←</a>
        <span className="text-2xl">🏥</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">UrgentMatch</p>
          <p className="text-xs text-gray-400">Top clinics for you</p>
        </div>
      </div>

      <UrgencyBar urgency={urgency} />

      <div className="px-4 pt-4 pb-2">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
          {SPECIALTY_LABELS[specialty] ?? specialty} care
        </span>
        <p className="text-gray-500 text-xs mt-1">
          {lat
            ? 'Nearby places from Google Maps (urgent care + hospitals), ranked by match'
            : 'LA-area places from Google Maps (downtown default), ranked by match'}
        </p>
      </div>

      <div className="px-4 space-y-3 pb-8">
        {clinics === null ? (
          <><ClinicSkeleton /><ClinicSkeleton /><ClinicSkeleton /></>
        ) : (
          clinics.map((clinic, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4">
              {/* Name + open badge */}
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-gray-900 text-sm leading-snug flex-1 pr-2">
                  {clinic.name}
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  clinic.openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {clinic.openNow ? 'Open' : 'Closed'}
                </span>
              </div>

              {clinic.facilityLabel && (
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 font-medium">
                  {clinic.facilityLabel}
                </p>
              )}

              <p className="text-gray-500 text-xs mb-2">{clinic.address}</p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-3">
                <Stars rating={clinic.rating} />
                <span className="text-xs text-gray-500">
                  {clinic.rating.toFixed(1)}
                  {clinic.reviewCount > 0 && ` (${clinic.reviewCount.toLocaleString()})`}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1 bg-blue-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">{clinic.matchPercent}%</p>
                  <p className="text-xs text-gray-500">match</p>
                </div>
                <div className="flex-1 bg-orange-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-bold text-orange-500">~{clinic.etaMinutes}m</p>
                  <p className="text-xs text-gray-500">wait</p>
                </div>
                <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-bold text-green-600">{clinic.doctorsOnDuty}</p>
                  <p className="text-xs text-gray-500">doctors</p>
                </div>
              </div>

              {/* Load bar */}
              <LoadBar current={clinic.currentPatients} capacity={clinic.capacity} />

              <a
                href={clinic.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full text-center bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-xl transition-colors"
              >
                Get Directions
              </a>
            </div>
          ))
        )}
      </div>

      <p className="text-center text-xs text-gray-400 px-6 pb-6">
        Not a diagnostic tool. If symptoms worsen, call 911.
      </p>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
