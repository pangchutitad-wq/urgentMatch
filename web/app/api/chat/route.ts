const INTAKE_URL = process.env.INTAKE_HTTP_URL ?? 'http://localhost:8000'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentResponse {
  type: string
  text?: string
  specialty?: string
  urgency?: number
  redFlag?: boolean
  clinics?: Record<string, unknown>[]
  error?: string
}

export async function POST(request: Request) {
  const { messages, imageBase64 } = (await request.json()) as {
    messages: Message[]
    imageBase64?: string
  }

  let res: Response
  try {
    res = await fetch(`${INTAKE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        session_id: '',
        image_base64: imageBase64 ?? null,
      }),
    })
  } catch (err) {
    return Response.json(
      { error: `Cannot reach intake agent at ${INTAKE_URL}. Is it running? (${err})` },
      { status: 502 },
    )
  }

  if (!res.ok) {
    const body = await res.text()
    return Response.json({ error: body }, { status: res.status })
  }

  const data = (await res.json()) as AgentResponse

  if (data.type === 'error') {
    return Response.json({ error: data.error }, { status: 500 })
  }

  if (data.type === 'redFlag') {
    return Response.json({ type: 'routing', specialty: 'general', urgency: 10, redFlag: true })
  }

  if (data.type === 'results') {
    return Response.json({
      type: 'results',
      specialty: data.specialty,
      urgency: data.urgency,
      clinics: data.clinics ?? [],
    })
  }

  if (data.type === 'routing') {
    return Response.json({
      type: 'routing',
      specialty: data.specialty,
      urgency: data.urgency,
      redFlag: data.redFlag ?? false,
    })
  }

  return Response.json({ type: 'message', text: data.text ?? '' })
}
