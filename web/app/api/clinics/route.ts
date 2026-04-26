const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
const RADIUS_METERS = 24140 // 15 miles

interface Clinic {
  name: string
  address: string
  matchPercent: number
  etaMinutes: number
  specialty: string
  currentPatients: number
  capacity: number
  doctorsOnDuty: number
  rating: number
  reviewCount: number
  openNow: boolean
  mapsUrl: string
}

const FALLBACK_CLINICS: Clinic[] = [
  {
    name: 'CityMD Urgent Care – West Hollywood',
    address: '8735 Santa Monica Blvd, West Hollywood, CA 90069',
    matchPercent: 88, etaMinutes: 18, specialty: 'general',
    currentPatients: 8, capacity: 25, doctorsOnDuty: 3,
    rating: 4.2, reviewCount: 1823, openNow: true,
    mapsUrl: 'https://maps.google.com/?q=CityMD+Urgent+Care+West+Hollywood',
  },
  {
    name: 'MedPost Urgent Care – Silver Lake',
    address: '2918 Rowena Ave, Los Angeles, CA 90039',
    matchPercent: 92, etaMinutes: 10, specialty: 'general',
    currentPatients: 4, capacity: 20, doctorsOnDuty: 2,
    rating: 4.4, reviewCount: 290, openNow: true,
    mapsUrl: 'https://maps.google.com/?q=MedPost+Urgent+Care+Silver+Lake',
  },
  {
    name: 'UCLA Health Urgent Care – Santa Monica',
    address: '1245 16th St, Santa Monica, CA 90404',
    matchPercent: 85, etaMinutes: 20, specialty: 'general',
    currentPatients: 9, capacity: 32, doctorsOnDuty: 5,
    rating: 4.3, reviewCount: 1105, openNow: true,
    mapsUrl: 'https://maps.google.com/?q=UCLA+Health+Urgent+Care+Santa+Monica',
  },
]

const NAME_KEYWORDS: Record<string, string[]> = {
  pediatric: ['pediatric', 'children', 'kids', 'child'],
  orthopedic: ['ortho', 'bone', 'spine', 'sports'],
  dermatology: ['derm', 'skin'],
  respiratory: ['pulm', 'lung', 'respiratory'],
  gastrointestinal: ['gastro', 'digestive'],
}

const RELATED: Record<string, string[]> = {
  respiratory: ['general'],
  gastrointestinal: ['general'],
  dermatology: ['general'],
  orthopedic: ['general'],
  pediatric: ['general'],
  general: ['respiratory', 'gastrointestinal', 'dermatology', 'orthopedic'],
}

function inferSpecialties(name: string): string[] {
  const n = name.toLowerCase()
  for (const [sp, kws] of Object.entries(NAME_KEYWORDS)) {
    if (kws.some((k) => n.includes(k))) return [sp, 'general']
  }
  return ['general']
}

function matchPercent(specialties: string[], requested: string, load: number): number {
  let base: number
  if (specialties.includes(requested)) {
    base = 85
  } else if (RELATED[requested]?.some((r) => specialties.includes(r))) {
    base = 62
  } else {
    base = 40
  }
  // Better score for lower load
  return Math.min(100, Math.round(base + (1 - load) * 10))
}

interface PlacesResult {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  user_ratings_total?: number
  opening_hours?: { open_now?: boolean }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const specialty = searchParams.get('specialty') ?? 'general'
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')
  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey || isNaN(lat) || isNaN(lon)) {
    return Response.json(FALLBACK_CLINICS)
  }

  const params = new URLSearchParams({
    location: `${lat},${lon}`,
    radius: String(RADIUS_METERS),
    keyword: 'urgent care',
    key: apiKey,
  })

  let rawResults: PlacesResult[] = []
  try {
    const res = await fetch(`${PLACES_URL}?${params}`)
    const data = (await res.json()) as { status: string; results: PlacesResult[] }
    if (data.status === 'OK') rawResults = data.results
  } catch {
    return Response.json(FALLBACK_CLINICS)
  }

  if (!rawResults.length) return Response.json(FALLBACK_CLINICS)

  // Assign stable simulated operational data per place_id using a simple hash
  const clinics: Clinic[] = rawResults.slice(0, 8).map((p) => {
    const seed = p.place_id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const capacity = 15 + (seed % 20)           // 15–34
    const currentPatients = (seed * 3) % capacity
    const etaMinutes = 5 + currentPatients * 2
    const doctorsOnDuty = 1 + (seed % 4)        // 1–4
    const load = currentPatients / capacity
    const specialties = inferSpecialties(p.name)

    return {
      name: p.name,
      address: p.vicinity ?? '',
      matchPercent: matchPercent(specialties, specialty, load),
      etaMinutes,
      specialty: specialties[0],
      currentPatients,
      capacity,
      doctorsOnDuty,
      rating: p.rating ?? 0,
      reviewCount: p.user_ratings_total ?? 0,
      openNow: p.opening_hours?.open_now ?? true,
      mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(p.name + ' ' + (p.vicinity ?? ''))}`,
    }
  })

  // Sort by matchPercent desc, return top 3
  clinics.sort((a, b) => b.matchPercent - a.matchPercent)
  return Response.json(clinics.slice(0, 3))
}
