'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Clinic {
  name: string
  address: string
  rating: number
  reviewCount: number
  openNow: boolean
  mapsUrl: string
}

const CLINICS: Clinic[] = [
  {
    name: 'CityMD Urgent Care West Hollywood',
    address: '8735 Santa Monica Blvd, West Hollywood, CA 90069',
    rating: 4.2,
    reviewCount: 1823,
    openNow: true,
    mapsUrl: 'https://maps.google.com/?q=8735+Santa+Monica+Blvd+West+Hollywood+CA',
  },
  {
    name: 'Cedars-Sinai Urgent Care – Beverly Hills',
    address: '8733 Beverly Blvd, Los Angeles, CA 90048',
    rating: 4.1,
    reviewCount: 774,
    openNow: true,
    mapsUrl: 'https://maps.google.com/?q=8733+Beverly+Blvd+Los+Angeles+CA',
  },
  {
    name: 'MedPost Urgent Care – Silver Lake',
    address: '2918 Rowena Ave, Los Angeles, CA 90039',
    rating: 4.4,
    reviewCount: 290,
    openNow: true,
    mapsUrl: 'https://maps.google.com/?q=2918+Rowena+Ave+Los+Angeles+CA',
  },
  {
    name: 'NextCare Urgent Care – Mid-Wilshire',
    address: '5301 Wilshire Blvd, Los Angeles, CA 90036',
    rating: 4.0,
    reviewCount: 638,
    openNow: true,
    mapsUrl: 'https://maps.google.com/?q=5301+Wilshire+Blvd+Los+Angeles+CA',
  },
  {
    name: 'Concentra Urgent Care – Culver City',
    address: '10000 Washington Blvd, Culver City, CA 90232',
    rating: 3.9,
    reviewCount: 412,
    openNow: true,
    mapsUrl: 'https://maps.google.com/?q=10000+Washington+Blvd+Culver+City+CA',
  },
]

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
  const color =
    urgency >= 8 ? 'bg-red-500' : urgency >= 5 ? 'bg-orange-400' : 'bg-green-500'
  const label =
    urgency >= 8 ? 'High urgency — be seen soon' : urgency >= 5 ? 'Moderate urgency' : 'Low urgency'
  return (
    <div className={`${color} text-white text-center py-2 text-sm font-medium`}>
      {label} &nbsp;·&nbsp; urgency {urgency}/10
    </div>
  )
}

function ResultsContent() {
  const params = useSearchParams()
  const specialty = params.get('specialty') ?? 'general'
  const urgency = Number(params.get('urgency') ?? 5)

  const sorted = [...CLINICS].sort((a, b) => b.rating - a.rating).slice(0, 3)

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <a href="/chat" className="text-gray-400 hover:text-gray-600 text-lg">←</a>
        <span className="text-2xl">🏥</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">UrgentMatch</p>
          <p className="text-xs text-gray-400">Top clinics for you</p>
        </div>
      </div>

      <UrgencyBar urgency={urgency} />

      {/* Specialty badge */}
      <div className="px-4 pt-4 pb-2">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
          {SPECIALTY_LABELS[specialty] ?? specialty} care
        </span>
        <p className="text-gray-500 text-xs mt-1">Showing top 3 nearby urgent care clinics</p>
      </div>

      {/* Clinic cards */}
      <div className="px-4 space-y-3 pb-8">
        {sorted.map((clinic, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold text-gray-900 text-sm leading-snug flex-1 pr-2">
                {clinic.name}
              </p>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  clinic.openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {clinic.openNow ? 'Open' : 'Closed'}
              </span>
            </div>

            <p className="text-gray-500 text-xs mb-2">{clinic.address}</p>

            <div className="flex items-center gap-1 mb-3">
              <Stars rating={clinic.rating} />
              <span className="text-xs text-gray-500">
                {clinic.rating.toFixed(1)} ({clinic.reviewCount.toLocaleString()})
              </span>
            </div>

            <a
              href={clinic.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-xl transition-colors"
            >
              Get Directions
            </a>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <p className="text-center text-xs text-gray-400 px-6 pb-6">
        Not a diagnostic tool. If symptoms worsen, call 911.
      </p>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>}>
      <ResultsContent />
    </Suspense>
  )
}
