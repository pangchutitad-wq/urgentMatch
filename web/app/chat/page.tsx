'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface Message {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help you find the right urgent care. What's bringing you in today?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending')

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLocationStatus('granted')
      },
      (err) => {
        // 1 = permission denied, 2 = unavailable, 3 = timeout
        if (err.code === 1) {
          setLocationStatus('denied')
        }
        // for unavailable/timeout leave as 'pending' — coords just won't be sent
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }, [])

  const toggleVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      alert('Voice input is not supported in this browser. Try Chrome.')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const send = async () => {
    if (!input.trim() && !image) return

    const userMsg: Message = { role: 'user', content: input.trim(), imageUrl: image ?? undefined }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setImage(null)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          imageBase64: userMsg.imageUrl,
        }),
      })

      const data = (await res.json()) as
        | { type: 'routing'; specialty: string; urgency: number; redFlag: boolean }
        | { type: 'message'; text: string }

      if (data.type === 'routing') {
        if (data.redFlag) {
          setEmergency(true)
          return
        }
        const geo = coords ? `&lat=${coords.lat}&lon=${coords.lon}` : ''
        window.location.href = `/results?specialty=${data.specialty}&urgency=${data.urgency}${geo}`
        return
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.text }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (emergency) {
    return (
      <div className="fixed inset-0 bg-red-600 flex flex-col items-center justify-center text-white p-8 z-50">
        <div className="text-6xl mb-4">🚨</div>
        <h1 className="text-3xl font-bold mb-2">Call 911 Now</h1>
        <p className="text-center text-lg mb-8 opacity-90 leading-relaxed">
          This sounds like a medical emergency.
          <br />
          Do not drive to urgent care.
        </p>
        <a
          href="tel:911"
          className="bg-white text-red-600 font-bold text-xl px-10 py-4 rounded-full shadow-lg"
        >
          Call 911
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Image
          src="/logo.PNG"
          alt="UrgentMatch logo"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          priority
        />
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">UrgentMatch</p>
          <p className="text-xs text-gray-400">Finding the right care for you</p>
        </div>
        {locationStatus === 'pending' && (
          <span className="text-xs text-gray-400 animate-pulse">📍 locating…</span>
        )}
        {locationStatus === 'granted' && (
          <span className="text-xs text-green-600">📍 location on</span>
        )}
        {locationStatus === 'denied' && (
          <span className="text-xs text-gray-400" title="Enable location for nearby results">📍 off</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-white shadow-sm text-gray-800 rounded-bl-sm'
              }`}
            >
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="uploaded" className="rounded-lg mb-2 max-h-36 object-cover" />
              )}
              <p>{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm px-4 py-2.5 rounded-2xl rounded-bl-sm">
              <span className="text-gray-400 text-sm">●●●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {image && (
        <div className="px-4 pb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="preview" className="h-12 w-12 rounded-lg object-cover border" />
          <button onClick={() => setImage(null)} className="text-xs text-gray-400 hover:text-gray-600">
            Remove
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t px-3 py-3 flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
          title="Upload photo"
        >
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Describe your symptoms..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          disabled={loading}
        />

        <button
          onClick={toggleVoice}
          className={`p-2 rounded-full transition-colors ${
            listening
              ? 'bg-red-100 text-red-500 animate-pulse'
              : 'text-gray-400 hover:text-blue-500'
          }`}
          title={listening ? 'Stop recording' : 'Speak your symptoms'}
        >
          🎙️
        </button>

        <button
          onClick={send}
          disabled={loading || (!input.trim() && !image)}
          className="bg-blue-500 text-white rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
