import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UrgentLA – Find Urgent Care Near You',
  description: 'Find urgent care clinics in Los Angeles with live wait times and on-site doctors.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-50 text-slate-900`}>
        <div className="flex min-h-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <footer className="shrink-0 border-t border-slate-200 bg-white py-2.5 text-center text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Medical emergency?</span>{' '}
            <a href="tel:911" className="font-semibold text-red-700 underline-offset-2 hover:underline">
              Call 911
            </a>
            . UrgentLA is not for life-threatening emergencies.
          </footer>
        </div>
      </body>
    </html>
  )
}
