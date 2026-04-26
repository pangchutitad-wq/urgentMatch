import Link from 'next/link'

export const metadata = {
  title: 'Call 911 – UrgentLA',
}

export default function EmergencyPage() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-red-700 to-red-900 p-8 text-white">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-4xl backdrop-blur-sm">
        911
      </div>

      <h1 className="mb-3 text-center text-3xl font-bold tracking-tight">Call 911 now</h1>
      <p className="mb-10 max-w-md text-center text-lg leading-relaxed text-red-100">
        This may be a medical emergency. Do not drive yourself — get emergency help immediately.
      </p>

      <a
        href="tel:911"
        className="rounded-full bg-white px-12 py-4 text-lg font-bold text-red-700 shadow-xl transition hover:bg-red-50"
      >
        Call 911
      </a>

      <Link
        href="/"
        className="mt-6 flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>
    </div>
  )
}
