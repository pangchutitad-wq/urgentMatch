import Link from 'next/link'
import Image from 'next/image'


export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-white px-6">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <Image src="/logo.PNG" alt="UrgentMatch logo" width={180} height={180} priority />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Urgent LA</h1>
        <p className="text-gray-500 text-base mb-8 leading-relaxed">
          Describe your symptoms and we'll find the best urgent care clinic near you.
        </p>
        <Link
          href="/chat"
          className="inline-block bg-blue-500 text-white font-semibold rounded-full px-8 py-3 text-base hover:bg-blue-600 transition-colors"
        >
          Get Started
        </Link>
        <p className="mt-6 text-xs text-gray-400">
          Not a diagnostic tool. For emergencies, call 911.
        </p>
      </div>
    </div>
  )
}
