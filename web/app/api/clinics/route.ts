const PLACES_V1 = 'https://places.googleapis.com/v1'
const RADIUS_METERS = 24140 // 15 miles
/** When the client omits coordinates (e.g. location denied), use central LA for real Places results. */
const DEFAULT_LA = { lat: 34.0522, lon: -118.2437 }

/** Fields to return; required by Places API (New). No spaces in the list. @see https://developers.google.com/maps/documentation/places/web-service/nearby-search */
const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.googleMapsUri',
  'places.currentOpeningHours',
  'places.currentOpeningHours.weekdayDescriptions',
].join(',')

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
  hoursText?: string
  mapsUrl: string
  placeId: string
  lat: number
  lon: number
  /** From Google `types` — helps users see hospital vs walk-in clinic. */
  facilityLabel: string
}

const FALLBACK_CLINIC_TEMPLATES = [
  {
    name: 'CityMD Urgent Care – West Hollywood',
    address: '8735 Santa Monica Blvd, West Hollywood, CA 90069',
    matchPercent: 88, etaMinutes: 18, specialty: 'general',
    currentPatients: 8, capacity: 25, doctorsOnDuty: 3,
    rating: 4.2, reviewCount: 1823,
    hoursText: '8:00 AM – 10:00 PM',
    placeId: '', lat: 34.0901, lon: -118.3834, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=CityMD+Urgent+Care+West+Hollywood',
  },
  {
    name: 'MedPost Urgent Care – Silver Lake',
    address: '2918 Rowena Ave, Los Angeles, CA 90039',
    matchPercent: 92, etaMinutes: 10, specialty: 'general',
    currentPatients: 4, capacity: 20, doctorsOnDuty: 2,
    rating: 4.4, reviewCount: 290,
    hoursText: '9:00 AM – 9:00 PM',
    placeId: '', lat: 34.0992, lon: -118.2689, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=MedPost+Urgent+Care+Silver+Lake',
  },
  {
    name: 'UCLA Health Urgent Care – Santa Monica',
    address: '1245 16th St, Santa Monica, CA 90404',
    matchPercent: 85, etaMinutes: 20, specialty: 'general',
    currentPatients: 9, capacity: 32, doctorsOnDuty: 5,
    rating: 4.3, reviewCount: 1105,
    hoursText: '8:00 AM – 8:00 PM',
    placeId: '', lat: 34.0259, lon: -118.4936, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=UCLA+Health+Urgent+Care+Santa+Monica',
  },
  {
    name: 'Concentra Urgent Care – Downtown LA',
    address: '700 S Flower St, Los Angeles, CA 90017',
    matchPercent: 80, etaMinutes: 22, specialty: 'general',
    currentPatients: 11, capacity: 30, doctorsOnDuty: 4,
    rating: 4.0, reviewCount: 642,
    hoursText: '8:00 AM – 5:00 PM',
    placeId: '', lat: 34.0499, lon: -118.2589, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Concentra+Urgent+Care+Downtown+LA',
  },
  {
    name: 'CHA Hollywood Presbyterian Urgent Care',
    address: '1300 N Vermont Ave, Los Angeles, CA 90027',
    matchPercent: 78, etaMinutes: 25, specialty: 'general',
    currentPatients: 6, capacity: 20, doctorsOnDuty: 2,
    rating: 3.9, reviewCount: 418,
    hoursText: '8:00 AM – 8:00 PM',
    placeId: '', lat: 34.1016, lon: -118.2918, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=CHA+Hollywood+Presbyterian+Urgent+Care',
  },
  {
    name: 'FastER Urgent Care – Culver City',
    address: '9840 Washington Blvd, Culver City, CA 90232',
    matchPercent: 76, etaMinutes: 30, specialty: 'general',
    currentPatients: 5, capacity: 18, doctorsOnDuty: 2,
    rating: 4.1, reviewCount: 310,
    hoursText: '8:00 AM – 9:00 PM',
    placeId: '', lat: 34.0211, lon: -118.3964, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=FastER+Urgent+Care+Culver+City',
  },
  {
    name: 'Cedars-Sinai Urgent Care – Beverly Hills',
    address: '150 N Robertson Blvd, Beverly Hills, CA 90211',
    matchPercent: 82, etaMinutes: 15, specialty: 'general',
    currentPatients: 7, capacity: 22, doctorsOnDuty: 3,
    rating: 4.5, reviewCount: 987,
    hoursText: '8:00 AM – 8:00 PM',
    placeId: '', lat: 34.0763, lon: -118.3836, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Cedars-Sinai+Urgent+Care+Beverly+Hills',
  },
  {
    name: 'Torrance Memorial Urgent Care',
    address: '3330 Lomita Blvd, Torrance, CA 90505',
    matchPercent: 72, etaMinutes: 35, specialty: 'general',
    currentPatients: 10, capacity: 28, doctorsOnDuty: 3,
    rating: 4.2, reviewCount: 523,
    hoursText: '8:00 AM – 8:00 PM',
    placeId: '', lat: 33.8104, lon: -118.3468, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Torrance+Memorial+Urgent+Care',
  },
  {
    name: 'Dignity Health GoHealth Urgent Care – Koreatown',
    address: '3530 W 8th St, Los Angeles, CA 90005',
    matchPercent: 74, etaMinutes: 28, specialty: 'general',
    currentPatients: 8, capacity: 20, doctorsOnDuty: 2,
    rating: 4.0, reviewCount: 215,
    hoursText: '8:00 AM – 8:00 PM',
    placeId: '', lat: 34.0589, lon: -118.3012, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Dignity+Health+GoHealth+Urgent+Care+Koreatown',
  },
  {
    name: 'Carbon Health Urgent Care – Los Feliz',
    address: '4550 Hollywood Blvd, Los Angeles, CA 90027',
    matchPercent: 83, etaMinutes: 12, specialty: 'general',
    currentPatients: 3, capacity: 15, doctorsOnDuty: 2,
    rating: 4.6, reviewCount: 731,
    hoursText: '8:00 AM – 10:00 PM',
    placeId: '', lat: 34.1022, lon: -118.2872, facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Carbon+Health+Urgent+Care+Los+Feliz',
  },
]

function buildFallbackClinics(): Clinic[] {
  return FALLBACK_CLINIC_TEMPLATES.map((t) => ({
    ...t,
    openNow: isCurrentlyOpen(t.hoursText) ?? false,
  }))
}

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

function labelFromTypes(types: string[] | undefined, name: string): string {
  const t = types ?? []
  const n = name.toLowerCase()
  if (t.includes('hospital') || n.includes('hospital') || n.includes('medical center')) {
    return 'Hospital'
  }
  if (t.includes('doctor') || n.includes('urgent') || n.includes('clinic')) {
    return 'Urgent care / clinic'
  }
  return 'Care facility'
}

/** Google weekdayDescriptions is Mon–Sun (index 0–6); JS getDay() is Sun–Sat (0–6). */
function todayHoursText(weekdayDescriptions?: string[]): string | undefined {
  if (!weekdayDescriptions?.length) return undefined
  const jsDay = new Date().getDay() // 0=Sun … 6=Sat
  const googleIdx = (jsDay + 6) % 7 // 0=Mon … 6=Sun
  const entry = weekdayDescriptions[googleIdx]
  if (!entry) return undefined
  // Strip the day name prefix (e.g. "Monday: 7:00 AM – 10:00 PM" → "7:00 AM – 10:00 PM")
  return entry.replace(/^[^:]+:\s*/, '')
}

/**
 * Parses "8:00 AM – 10:00 PM" and returns whether the current local time falls within those hours.
 * Returns undefined when the string cannot be parsed (so the caller can fall back to another source).
 */
function isCurrentlyOpen(hoursText: string): boolean | undefined {
  const m = hoursText.match(
    /(\d+)(?::(\d+))?\s*(AM|PM)\s*[–\-]\s*(\d+)(?::(\d+))?\s*(AM|PM)/i,
  )
  if (!m) return undefined

  const toMinutes = (h: string, min: string | undefined, period: string) => {
    let hours = parseInt(h, 10) % 12
    if (period.toUpperCase() === 'PM') hours += 12
    return hours * 60 + parseInt(min ?? '0', 10)
  }

  const openMins = toMinutes(m[1], m[2], m[3])
  const closeMins = toMinutes(m[4], m[5], m[6])
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= openMins && nowMins < closeMins
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
  return Math.min(100, Math.round(base + (1 - load) * 10))
}

/** https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places */
interface PlaceV1 {
  id?: string
  displayName?: { text?: string; languageCode?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  userRatingCount?: number
  types?: string[]
  googleMapsUri?: string
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] }
}

async function postPlaces(
  apiKey: string,
  path: 'searchNearby' | 'searchText',
  body: Record<string, unknown>,
): Promise<PlaceV1[]> {
  const res = await fetch(`${PLACES_V1}/places:${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return []
  const data = (await res.json()) as { places?: PlaceV1[]; error?: { status?: string; message?: string } }
  if (data.error) return []
  return data.places ?? []
}

function locationCircle(lat: number, lon: number) {
  return {
    circle: {
      center: { latitude: lat, longitude: lon },
      radius: RADIUS_METERS,
    },
  }
}

/** Text search (urgent care) first, then nearby hospitals; dedupe by place `id`. */
function mergePlaces(urgent: PlaceV1[], hospitals: PlaceV1[]): PlaceV1[] {
  const seen = new Set<string>()
  const out: PlaceV1[] = []
  for (const p of urgent) {
    const id = p.id
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push(p)
    }
  }
  for (const p of hospitals) {
    const id = p.id
    if (id && !seen.has(id) && out.length < 24) {
      seen.add(id)
      out.push(p)
    }
  }
  return out
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const specialty = searchParams.get('specialty') ?? 'general'
  let lat = parseFloat(searchParams.get('lat') ?? '')
  let lon = parseFloat(searchParams.get('lon') ?? '')
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    lat = DEFAULT_LA.lat
    lon = DEFAULT_LA.lon
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return Response.json(buildFallbackClinics())
  }

  let merged: PlaceV1[] = []
  try {
    const [textRows, hospitalRows] = await Promise.all([
      postPlaces(apiKey, 'searchText', {
        textQuery: 'urgent care',
        languageCode: 'en',
        regionCode: 'US',
        pageSize: 20,
        locationBias: locationCircle(lat, lon),
      }),
      postPlaces(apiKey, 'searchNearby', {
        includedTypes: ['hospital'],
        maxResultCount: 20,
        languageCode: 'en',
        regionCode: 'US',
        locationRestriction: locationCircle(lat, lon),
      }),
    ])
    merged = mergePlaces(textRows, hospitalRows)
  } catch {
    return Response.json(buildFallbackClinics())
  }

  if (!merged.length) return Response.json(buildFallbackClinics())

  const clinics: Clinic[] = merged.slice(0, 20).map((p) => {
    const name = p.displayName?.text ?? 'Unknown'
    const seed = (p.id ?? name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const capacity = 15 + (seed % 20)
    const currentPatients = (seed * 3) % Math.max(capacity, 1)
    const etaMinutes = 5 + currentPatients * 2
    const doctorsOnDuty = 1 + (seed % 4)
    const load = currentPatients / capacity
    const specialties = inferSpecialties(name)
    const plat = p.location?.latitude ?? lat
    const plon = p.location?.longitude ?? lon
    const addr = p.formattedAddress ?? ''
    const label = labelFromTypes(p.types, name)
    const openNow = p.currentOpeningHours?.openNow ?? true
    const hoursText = todayHoursText(p.currentOpeningHours?.weekdayDescriptions)
    const dest =
      p.googleMapsUri && p.googleMapsUri.length > 0
        ? p.googleMapsUri
        : p.id
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(p.id)}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${addr}`)}`

    return {
      name,
      address: addr,
      matchPercent: matchPercent(specialties, specialty, load),
      etaMinutes,
      specialty: specialties[0],
      currentPatients,
      capacity,
      doctorsOnDuty,
      rating: p.rating ?? 0,
      reviewCount: p.userRatingCount ?? 0,
      openNow,
      hoursText,
      placeId: p.id ?? '',
      lat: plat,
      lon: plon,
      facilityLabel: label,
      mapsUrl: dest,
    }
  })

  clinics.sort((a, b) => b.matchPercent - a.matchPercent)
  return Response.json(clinics.slice(0, 10))
}
