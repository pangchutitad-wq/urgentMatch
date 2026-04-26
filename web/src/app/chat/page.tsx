import { redirect } from 'next/navigation'

/** Old `/chat` links forward to `/` (same UI). */
export default async function ChatRedirect({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const sp = await searchParams
  const prefill = sp.prefill
  if (typeof prefill === 'string' && prefill.length > 0) {
    redirect(`/?prefill=${encodeURIComponent(prefill)}`)
  }
  redirect('/')
}
