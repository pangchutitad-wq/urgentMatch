import { NextRequest, NextResponse } from 'next/server'

type UrgencyLevel = 'mild' | 'moderate' | 'severe'

interface ClinicMatch {
  id: number
  match_score: number
  urgency_level: UrgencyLevel
  match_reason: string
}

const CLINIC_SPECS: Record<number, string[]> = {
  1: ['General Care', 'X-Ray', 'Pediatrics', 'Wound Care'],
  2: ['Occupational Health', 'Sports Medicine', 'Lab Testing', 'IV Therapy'],
  3: ['STI Testing', 'Travel Medicine', 'Minor Surgery', 'Allergy Shots'],
  4: ['Pediatrics', 'Fracture Care', 'EKG', 'Respiratory Care'],
  5: ['General Care', 'Mental Health', 'Pharmacy', 'Lab Testing'],
}

const CLINIC_WAITS: Record<number, number> = { 1: 12, 2: 28, 3: 5, 4: 40, 5: 18 }

const CLINIC_NAMES: Record<number, string> = {
  1: 'CityMed Urgent Care',
  2: 'Westside Quick Care',
  3: 'Hollywood Urgent Care Center',
  4: 'South Bay MedExpress',
  5: 'Downtown LA Urgent Care',
}

const SYMPTOM_MAP: Record<string, string[]> = {
  fever: ['General Care', 'Respiratory Care'],
  cough: ['General Care', 'Respiratory Care'],
  throat: ['General Care'],
  flu: ['General Care'],
  sick: ['General Care'],
  cold: ['General Care'],
  broken: ['Fracture Care', 'X-Ray'],
  fracture: ['Fracture Care', 'X-Ray'],
  bone: ['Fracture Care', 'X-Ray'],
  sprain: ['Sports Medicine', 'Fracture Care'],
  ankle: ['Sports Medicine', 'Fracture Care'],
  knee: ['Sports Medicine'],
  sports: ['Sports Medicine'],
  child: ['Pediatrics'],
  kid: ['Pediatrics'],
  baby: ['Pediatrics'],
  pediatric: ['Pediatrics'],
  cut: ['Wound Care', 'Minor Surgery'],
  wound: ['Wound Care'],
  bleeding: ['Wound Care', 'Minor Surgery'],
  laceration: ['Wound Care', 'Minor Surgery'],
  sti: ['STI Testing'],
  sexual: ['STI Testing'],
  anxiety: ['Mental Health'],
  mental: ['Mental Health'],
  depression: ['Mental Health'],
  stress: ['Mental Health'],
  travel: ['Travel Medicine'],
  allergy: ['Allergy Shots'],
  allergic: ['Allergy Shots'],
  ekg: ['EKG'],
  heart: ['EKG'],
  breathing: ['Respiratory Care'],
  asthma: ['Respiratory Care'],
  iv: ['IV Therapy'],
  rash: ['General Care', 'Allergy Shots'],
  skin: ['General Care'],
  infection: ['General Care', 'Lab Testing'],
  uti: ['General Care', 'Lab Testing'],
  headache: ['General Care'],
  nausea: ['General Care'],
}

function getUrgency(symptoms: string): UrgencyLevel {
  const q = symptoms.toLowerCase()
  if (q.match(/chest pain|can.t breathe|unconscious|stroke|heart attack|severe bleeding|emergency/)) {
    return 'severe'
  }
  if (q.match(/fracture|broken|high fever|severe|vomiting|head injury|deep cut|difficulty breath/)) {
    return 'moderate'
  }
  return 'mild'
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { symptoms: string }
  const symptoms = body.symptoms ?? ''
  const q = symptoms.toLowerCase()
  const urgency = getUrgency(symptoms)

  const relevantSpecs = new Set<string>()
  Object.entries(SYMPTOM_MAP).forEach(([kw, specs]) => {
    if (q.includes(kw)) specs.forEach((s) => relevantSpecs.add(s))
  })
  if (relevantSpecs.size === 0) relevantSpecs.add('General Care')

  const matches: ClinicMatch[] = Object.entries(CLINIC_SPECS).map(([idStr, specs]) => {
    const id = Number(idStr)
    const hits = specs.filter((s) => relevantSpecs.has(s))
    const specScore =
      hits.length > 0 ? Math.round((hits.length / Math.max(relevantSpecs.size, 1)) * 65) : 0
    const waitBonus = Math.max(0, 30 - Math.round(CLINIC_WAITS[id] * 0.75))
    const score = Math.min(specScore + waitBonus, 100)

    const matchReason =
      hits.length > 0
        ? `Specializes in ${hits.join(' & ')} — directly relevant to your symptoms`
        : 'Walk-in general care available, though no specialist match for your symptoms'

    return { id, match_score: score, urgency_level: urgency, match_reason: matchReason }
  })

  matches.sort((a, b) => b.match_score - a.match_score)

  const top = matches[0]
  const urgencyPrefix =
    urgency === 'severe'
      ? "⚠️ Your symptoms may need emergency care — call 911 if they worsen. I've still ranked clinics below:"
      : urgency === 'moderate'
        ? "Your symptoms need prompt attention. I've ranked clinics by match:"
        : 'Got it. Here are the best-matched clinics for your symptoms:'

  const bot_message = `${urgencyPrefix}\n\n**Best match: ${CLINIC_NAMES[top.id]}** (${top.match_score}/100) — ${top.match_reason}.\n\nClinic cards are now re-sorted by AI match score.`

  await new Promise((r) => setTimeout(r, 800))

  return NextResponse.json({ clinics: matches, bot_message })
}
