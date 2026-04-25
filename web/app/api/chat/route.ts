// import Anthropic from '@anthropic-ai/sdk'
// const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ASI1_BASE = 'https://api.asi1.ai/v1'
const ASI1_MODEL = 'asi1-mini'

const SYSTEM_PROMPT = `You are a medical intake assistant for UrgentMatch — NOT a diagnostic tool.
Your only job is to identify which clinic type the patient needs, not what is wrong with them.
Ask 1-2 short clarifying questions to understand the symptoms and situation.

When you have enough information, output ONLY valid JSON with no other text:
{"specialty": "<general|orthopedic|respiratory|gastrointestinal|dermatology|pediatric>", "urgency": <1-10>, "redFlag": <true|false>}

Specialty guidelines:
- general: cold, fever, fatigue, mild illness, minor infections
- orthopedic: sprains, fractures, joint pain, back injury
- respiratory: cough, asthma, shortness of breath (non-emergency)
- gastrointestinal: stomach pain, nausea, vomiting, diarrhea
- dermatology: rashes, skin infections, allergic reactions (skin)
- pediatric: any complaint where the patient is a child (under 18)

Set redFlag=true ONLY for life-threatening symptoms: crushing chest pain or pressure,
stroke signs (face drooping, arm weakness, speech trouble), severe difficulty breathing,
loss of consciousness, uncontrolled severe bleeding.

Rules:
- NEVER diagnose or explain what might be wrong
- NEVER suggest treatments or medications
- Only route to the right clinic type
- If patient is a child, always use pediatric regardless of symptom type`

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

function isSupportedMediaType(s: string): s is SupportedMediaType {
  return SUPPORTED_MEDIA_TYPES.includes(s as SupportedMediaType)
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | OpenAIContentPart[]
}

function tryParseRouting(text: string) {
  const stripped = text.trim()
  const match = stripped.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  const jsonStr = match ? match[1] : stripped
  try {
    const data = JSON.parse(jsonStr) as Record<string, unknown>
    if ('specialty' in data && 'urgency' in data && 'redFlag' in data) return data
  } catch {
    // not JSON
  }
  return null
}

export async function POST(request: Request) {
  const { messages, imageBase64 } = (await request.json()) as {
    messages: Message[]
    imageBase64?: string
  }

  const apiKey = process.env.ASI1_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ASI1_API_KEY not configured' }, { status: 500 })
  }

  const lastMessage = messages[messages.length - 1]
  const prior = messages.slice(0, -1)

  const lastContent: OpenAIContentPart[] = []

  if (imageBase64) {
    const [header] = imageBase64.split(',')
    const rawMediaType = header.split(':')[1]?.split(';')[0] ?? ''
    if (isSupportedMediaType(rawMediaType)) {
      lastContent.push({ type: 'image_url', image_url: { url: imageBase64 } })
    }
  }

  lastContent.push({ type: 'text', text: lastMessage.content || 'See the image above.' })

  const openAIMessages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...prior.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: lastContent.length === 1 ? lastMessage.content || 'See the image above.' : lastContent },
  ]

  const res = await fetch(`${ASI1_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ASI1_MODEL,
      max_tokens: 512,
      messages: openAIMessages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return Response.json({ error: err }, { status: res.status })
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
  }

  const text = data.choices[0]?.message?.content ?? ''
  const routing = tryParseRouting(text)

  if (routing) {
    return Response.json({ type: 'routing', ...routing })
  }

  return Response.json({ type: 'message', text })
}
