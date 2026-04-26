'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ResultsView from '../urgent-care-finder/ResultsView'

function CareInner() {
  const searchParams = useSearchParams()
  const prefill = searchParams.get('prefill') ?? ''
  const [query, setQuery] = useState('')
  return <ResultsView query={query} onSearch={setQuery} chatPrefill={prefill} />
}

export default function CareApp() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading…</div>
      }
    >
      <CareInner />
    </Suspense>
  )
}
