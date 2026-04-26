'use client'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { clinics, MatchResult } from '@/data/clinics'
import type { Clinic } from '@/data/clinics'
import ClinicCard from './ClinicCard'

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-[#0d1117]" />,
})

interface Props {
  query: string
  onSearch: (q: string) => void
  /** Optional `?prefill=` from the home URL. */
  chatPrefill?: string
}

interface Message {
  role: 'user' | 'bot'
  text: string
}

type MatchMap = Record<number, MatchResult>



const LA_DEFAULT = { lat: 34.0607, lng: -118.3 }

interface ChatBoxProps {
  onMatchUpdate: (map: MatchMap) => void
  onMatchClear: () => void
  onClinicUpdate: (clinics: Clinic[]) => void
  onEmergency: () => void
  openNowOnly: boolean
  onOpenNowToggle: () => void
  chatPrefill?: string
}

function ChatBox({ onMatchUpdate, onMatchClear, onClinicUpdate, onEmergency, openNowOnly, onOpenNowToggle, chatPrefill }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: "Hi! I'm your UrgentLA assistant. Describe your symptoms and I'll rank clinics by AI match score — or tap a quick option below.",
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [userLoc, setUserLoc] = useState(LA_DEFAULT)
  const [locLabel, setLocLabel] = useState('Central LA')

  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatPrefill) setInput(chatPrefill)
  }, [chatPrefill])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLabel('your location')
      },
      () => {},
      { timeout: 5000 },
    )
  }, [])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, thinking])

  const send = async (text?: string) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || thinking) return
    setInput('')
    const userTurn: Message = { role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userTurn])

    setThinking(true)
    try {
      const historyForApi = [...messages, userTurn].map((m) => ({
        role: (m.role === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.text,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi }),
      })

      const data = (await res.json()) as Record<string, unknown>

      if (typeof data.error === 'string' && data.error) {
        setMessages((prev) => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }])
        return
      }

      if (data.type === 'routing' && Boolean(data.redFlag)) {
        onEmergency()
        return
      }

      if (data.type === 'results') {
        const agentClinics = (data.clinics as Array<Record<string, unknown>>) ?? []
        const mapped: Clinic[] = agentClinics.map((c, i) => ({
          id: i + 1,
          name: String(c.name ?? ''),
          address: String(c.address ?? ''),
          lat: Number(c.lat ?? 0),
          lng: Number(c.lon ?? 0),
          wait_time: Number(c.etaMinutes ?? 20),
          specializations: Array.isArray(c.specialties) && c.specialties.length > 0
            ? (c.specialties as string[])
            : [String(c.specialty ?? 'general')],
          doctors: [],
          phone: '',
          openNow: Boolean(c.openNow),
          hours: c.hoursText
            ? `${c.openNow ? 'Open' : 'Closed'} · ${String(c.hoursText)}`
            : (c.openNow ? 'Open now' : 'Closed'),
        }))
        const map: MatchMap = {}
        agentClinics.forEach((c, i) => {
          map[i + 1] = {
            match_score: Number(c.matchPercent ?? 0),
            urgency_level: 'mild',
            match_reason: c.openNow ? 'Open now' : 'May be closed',
          }
        })
        onClinicUpdate(mapped)
        onMatchUpdate(map)
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: `Found ${mapped.length} nearby clinics, sorted by AI match score.` },
        ])
        return
      }

      if (data.type === 'routing') {
        const specialty = String(data.specialty ?? 'general')
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: `Routing to ${specialty} care. Check the clinic list.` },
        ])
        return
      }

      const replyText = data.text
      if (data.type !== 'message' || typeof replyText !== 'string') {
        setMessages((prev) => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }])
        return
      }

      setMessages((prev) => [...prev, { role: 'bot', text: replyText }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: "Sorry, I couldn't analyse your symptoms. Please try again." },
      ])
    } finally {
      setThinking(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  function renderText(text: string) {
    return text.split(/\*\*(.*?)\*\*/g).map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))
  }

  const chatChips = ['Shortest time to doctor', 'Fracture care', 'Pediatrics']

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">UrgentLA Assistant</p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="truncate text-[10px] text-blue-200">Using {locLabel}</span>
          </div>
        </div>
      </div>

      <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'bot' && (
              <div className="mr-2 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line ${
                m.role === 'user'
                  ? 'rounded-br-sm bg-blue-600 text-white'
                  : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 shadow-sm'
              }`}
            >
              {renderText(m.text)}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
        {chatChips.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void send(s)}
            disabled={thinking}
            className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenNowToggle}
          className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            openNowOnly
              ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
              : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          Open now
        </button>
      </div>

      <div className="flex gap-2 border-t border-slate-100 bg-white px-3 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={thinking}
          placeholder={thinking ? 'Analysing symptoms…' : 'Describe symptoms or ask a question…'}
          className="flex-1 rounded-xl bg-slate-100 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!input.trim() || thinking}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
        >
          <svg className="h-4 w-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ResultsView({ query, onSearch, chatPrefill }: Props) {
  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [draft, setDraft] = useState(query)
  const [matchMap, setMatchMap] = useState<MatchMap | null>(null)
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [openNowOnly, setOpenNowOnly] = useState(false)
  useEffect(() => {
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((data) => {
        const mapped: Clinic[] = data.map((c: any, i: number) => ({
          id: i + 1,
          name: c.name,
          address: c.address,
          lat: c.lat,
          lng: c.lon,
          wait_time: c.etaMinutes,
          specializations: [],
          doctors: [],
          phone: "",
          openNow: Boolean(c.openNow),
          hours: c.openNow ? "Open now" : "Closed",
        }))
        setClinics(mapped)
      })
  }, [])

  useEffect(() => {
    setDraft(query)
  }, [query])

  const filtered = openNowOnly ? clinics.filter((c) => c.openNow) : clinics
  const sorted = matchMap
    ? [...filtered].sort((a, b) => (matchMap[b.id]?.match_score ?? 0) - (matchMap[a.id]?.match_score ?? 0))
    : [...filtered].sort((a, b) => a.wait_time - b.wait_time)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(draft)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="hidden text-base font-bold text-slate-900 sm:inline">UrgentLA</span>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex max-w-lg flex-1 items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2">
              <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Filter by symptom…"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
              />
              {draft && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('')
                    onSearch('')
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="flex-shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Search
            </button>
          </form>

          <div className="hidden flex-shrink-0 items-center gap-2 sm:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-500">Live data</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[460px_1fr]">
        <div className="flex flex-col gap-6">
          <div className="h-[360px]">
            <ChatBox
              onMatchUpdate={(map) => setMatchMap(map)}
              onMatchClear={() => setMatchMap(null)}
              onClinicUpdate={(c) => setClinics(c)}
              onEmergency={() => router.push('/emergency')}
              openNowOnly={openNowOnly}
              onOpenNowToggle={() => setOpenNowOnly((prev) => !prev)}
              chatPrefill={chatPrefill}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {sorted.length} {openNowOnly ? 'open ' : ''}clinic{sorted.length !== 1 ? 's' : ''} found
                </h2>
                {matchMap ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-blue-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Sorted by AI match score
                  </p>
                ) : query ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Results for &ldquo;<span className="font-medium text-blue-600">{query}</span>&rdquo;
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> {"<15 min"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> {"15–30 min"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400" /> {">30 min"}
              </span>
            </div>
          </div>

          {matchMap && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Based on your symptoms, we recommend seeing a doctor soon.</p>
                <p className="mt-0.5 text-sm text-blue-600">Here are the best matched clinics for you.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {sorted.map((clinic, i) => (
              <div
                key={clinic.id}
                onMouseEnter={() => setHoveredId(clinic.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <ClinicCard clinic={clinic} rank={i + 1} matchResult={matchMap?.[clinic.id]} />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-[73px]" style={{ height: 'calc(100vh - 100px)' }}>
          <LeafletMap highlighted={hoveredId} clinics={clinics} />
        </div>
      </div>
    </div>
  )
}
