'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo } from 'react'
import { clinics, MatchResult } from '@/data/clinics'
import ClinicCard from '../../../urgent-care-finder/ClinicCard'

const SPECIALTY_LABELS: Record<string, string> = {
  general: 'General',
  orthopedic: 'Orthopedic',
  respiratory: 'Respiratory',
  gastrointestinal: 'Gastrointestinal',
  dermatology: 'Dermatology',
  pediatric: 'Pediatric',
}

const SPEC_HINTS: Record<string, string[]> = {
  general: ['General Care'],
  orthopedic: ['Fracture Care', 'Sports Medicine', 'X-Ray'],
  respiratory: ['Respiratory Care'],
  gastrointestinal: ['General Care', 'Lab Testing'],
  dermatology: ['General Care', 'Allergy Shots'],
  pediatric: ['Pediatrics'],
}

function mockMatch(clinic: (typeof clinics)[0], specialty: string, rank: number): MatchResult {
  const label = SPECIALTY_LABELS[specialty] ?? specialty
  const hints = SPEC_HINTS[specialty] ?? SPEC_HINTS.general
  const overlap = clinic.specializations.filter((s) => hints.some((h) => s.includes(h) || h.includes(s)))
  const score = Math.min(92, 78 + overlap.length * 8 - rank * 4)
  return {
    match_score: score,
    urgency_level: 'mild',
    match_reason:
      overlap.length > 0
        ? `Offers ${overlap.slice(0, 2).join(' & ')} — fits your ${label} intake.`
        : `General urgent care option while you seek ${label} follow-up if needed.`,
  }
}

function UrgencyBar({ urgency }: { urgency: number }) {
  const color =
    urgency >= 8 ? 'from-red-600 to-red-800' : urgency >= 5 ? 'from-amber-500 to-orange-600' : 'from-emerald-500 to-teal-600'
  const label =
    urgency >= 8 ? 'High urgency — be seen soon' : urgency >= 5 ? 'Moderate urgency' : 'Low urgency'
  return (
    <div className={`bg-gradient-to-r ${color} py-2.5 text-center text-sm font-semibold text-white shadow-sm`}>
      {label}
      <span className="font-normal opacity-90"> · urgency {urgency}/10</span>
    </div>
  )
}

function ResultsContent() {
  const params = useSearchParams()
  const specialty = params.get('specialty') ?? 'general'
  const urgency = Number(params.get('urgency') ?? 5)

  const topThree = useMemo(() => {
    return [...clinics].sort((a, b) => a.wait_time - b.wait_time).slice(0, 3)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Your top matches</p>
              <p className="text-xs text-slate-500">From your chat intake</p>
            </div>
          </div>
        </div>
      </header>

      <UrgencyBar urgency={urgency} />

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6">
        <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
          {SPECIALTY_LABELS[specialty] ?? specialty} care
        </span>
        <p className="mt-1 text-xs text-slate-500">Top 3 clinics by typical wait — tailored to your specialty.</p>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 pb-10 sm:px-6">
        {topThree.map((clinic, i) => (
          <ClinicCard key={clinic.id} clinic={clinic} rank={i + 1} matchResult={mockMatch(clinic, specialty, i)} />
        ))}
      </div>

      <p className="px-6 pb-6 text-center text-xs text-slate-500">Not a diagnostic tool. If symptoms worsen, call 911.</p>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading…</div>
      }
    >
      <ResultsContent />
    </Suspense>
  )
}
