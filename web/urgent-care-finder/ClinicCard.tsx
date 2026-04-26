'use client'

import { Clinic, MatchResult } from '@/data/clinics'

interface Props {
  clinic: Clinic
  rank: number
  matchResult?: MatchResult
}

function WaitBadge({ minutes }: { minutes: number }) {
  const color =
    minutes <= 15
      ? 'bg-emerald-100 text-emerald-700'
      : minutes <= 30
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'
  const dot = minutes <= 15 ? 'bg-emerald-500' : minutes <= 30 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dot}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {minutes} min wait
    </span>
  )
}

function MatchScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-blue-500' : score >= 40 ? 'bg-blue-400' : 'bg-slate-300'
  return (
    <div className="px-5 pb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">AI Match</span>
        <span className="text-xs font-bold text-blue-600">{score}/100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export default function ClinicCard({ clinic, rank, matchResult }: Props) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
            {rank}
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight text-slate-900 transition-colors group-hover:text-blue-700">
              {clinic.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {clinic.address}
            </p>
          </div>
        </div>

        <WaitBadge minutes={clinic.wait_time} />
      </div>

      {matchResult && <MatchScoreBar score={matchResult.match_score} />}

      {matchResult && (
        <div className="mx-5 mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-blue-700">
            <span className="font-semibold">Why this clinic: </span>
            {matchResult.match_reason}
          </p>
        </div>
      )}

      <div className="px-5 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {clinic.specializations.map((s) => (
            <span
              key={s}
              className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 pb-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">On-site physicians</p>
        <div className="flex flex-col gap-1">
          {clinic.doctors.map((doc) => (
            <div key={doc.name} className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <span className="text-sm text-slate-700">{doc.name}</span>
              <span className="text-xs text-slate-400">· {doc.specialty}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-3 text-xs text-slate-500">
           
          <a href="tel:+16232932226" className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            {clinic.phone}
          </a>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {clinic.hours}
          </span>
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
        >
          Get directions →
        </a>
      </div>
    </div>
  )
}
