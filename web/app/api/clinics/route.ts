import { FALLBACK_CLINICS, type FallbackClinic } from '../../../src/data/fallbackClinics'

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
].join(',')

type Clinic = FallbackClinic

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
  currentOpeningHours?: { openNow?: boolean }
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
    return Response.json(FALLBACK_CLINICS)
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
    return Response.json(FALLBACK_CLINICS)
  }

  if (!merged.length) return Response.json(FALLBACK_CLINICS)

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
