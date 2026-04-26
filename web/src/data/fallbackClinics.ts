export interface FallbackClinic {
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
  placeId: string
  lat: number
  lon: number
  facilityLabel: string
}

export const FALLBACK_CLINICS: FallbackClinic[] = [
  {
    name: 'CityMD Urgent Care – West Hollywood',
    address: '8735 Santa Monica Blvd, West Hollywood, CA 90069',
    matchPercent: 88, etaMinutes: 18, specialty: 'general',
    currentPatients: 8, capacity: 25, doctorsOnDuty: 3,
    rating: 4.2, reviewCount: 1823, openNow: true,
    placeId: '',
    lat: 34.0901,
    lon: -118.3834,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=CityMD+Urgent+Care+West+Hollywood',
  },
  {
    name: 'MedPost Urgent Care – Silver Lake',
    address: '2918 Rowena Ave, Los Angeles, CA 90039',
    matchPercent: 92, etaMinutes: 10, specialty: 'general',
    currentPatients: 4, capacity: 20, doctorsOnDuty: 2,
    rating: 4.4, reviewCount: 290, openNow: true,
    placeId: '',
    lat: 34.0992,
    lon: -118.2689,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=MedPost+Urgent+Care+Silver+Lake',
  },
  {
    name: 'Cedars-Sinai Urgent Care – Beverly Hills',
    address: '8733 Beverly Blvd, Los Angeles, CA 90048',
    matchPercent: 86, etaMinutes: 16, specialty: 'general',
    currentPatients: 6, capacity: 22, doctorsOnDuty: 3,
    rating: 4.1, reviewCount: 774, openNow: true,
    placeId: '',
    lat: 34.076,
    lon: -118.377,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Cedars-Sinai+Urgent+Care+Beverly+Hills',
  },
  {
    name: 'UCLA Health Urgent Care – Santa Monica',
    address: '2428 Santa Monica Blvd, Santa Monica, CA 90404',
    matchPercent: 85, etaMinutes: 20, specialty: 'general',
    currentPatients: 9, capacity: 32, doctorsOnDuty: 5,
    rating: 4.3, reviewCount: 456, openNow: true,
    placeId: '',
    lat: 34.033,
    lon: -118.477,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=UCLA+Health+Urgent+Care+Santa+Monica',
  },
  {
    name: 'Providence Urgent Care – Burbank',
    address: '191 S Buena Vista St, Burbank, CA 91505',
    matchPercent: 84, etaMinutes: 22, specialty: 'general',
    currentPatients: 7, capacity: 24, doctorsOnDuty: 3,
    rating: 4.0, reviewCount: 312, openNow: true,
    placeId: '',
    lat: 34.1808,
    lon: -118.329,
    facilityLabel: 'Hospital',
    mapsUrl: 'https://maps.google.com/?q=Providence+Urgent+Care+Burbank',
  },
  {
    name: 'Adventist Health Urgent Care – Glendale',
    address: '1509 Wilson Terrace, Glendale, CA 91206',
    matchPercent: 83, etaMinutes: 19, specialty: 'general',
    currentPatients: 5, capacity: 20, doctorsOnDuty: 2,
    rating: 4.2, reviewCount: 589, openNow: true,
    placeId: '',
    lat: 34.1625,
    lon: -118.2556,
    facilityLabel: 'Hospital',
    mapsUrl: 'https://maps.google.com/?q=Adventist+Health+Urgent+Care+Glendale',
  },
  {
    name: 'Carbon Health Urgent Care – Los Angeles',
    address: '1245 Wilshire Blvd, Los Angeles, CA 90017',
    matchPercent: 90, etaMinutes: 14, specialty: 'general',
    currentPatients: 4, capacity: 18, doctorsOnDuty: 2,
    rating: 4.5, reviewCount: 1120, openNow: true,
    placeId: '',
    lat: 34.0497,
    lon: -118.2661,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Carbon+Health+Urgent+Care+Los+Angeles',
  },
  {
    name: 'Healthway Medical – Koreatown',
    address: '3580 Wilshire Blvd #100, Los Angeles, CA 90010',
    matchPercent: 81, etaMinutes: 24, specialty: 'general',
    currentPatients: 10, capacity: 28, doctorsOnDuty: 4,
    rating: 3.9, reviewCount: 267, openNow: true,
    placeId: '',
    lat: 34.0617,
    lon: -118.3095,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Healthway+Medical+Koreatown',
  },
  {
    name: 'Exer Urgent Care – Pasadena',
    address: '960 E Green St, Pasadena, CA 91106',
    matchPercent: 87, etaMinutes: 17, specialty: 'general',
    currentPatients: 5, capacity: 20, doctorsOnDuty: 2,
    rating: 4.3, reviewCount: 401, openNow: true,
    placeId: '',
    lat: 34.1455,
    lon: -118.1287,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=Exer+Urgent+Care+Pasadena',
  },
  {
    name: 'GoHealth Urgent Care – Culver City',
    address: '6000 Sepulveda Blvd, Culver City, CA 90230',
    matchPercent: 88, etaMinutes: 15, specialty: 'general',
    currentPatients: 6, capacity: 22, doctorsOnDuty: 3,
    rating: 4.4, reviewCount: 512, openNow: true,
    placeId: '',
    lat: 33.9968,
    lon: -118.3951,
    facilityLabel: 'Urgent care',
    mapsUrl: 'https://maps.google.com/?q=GoHealth+Urgent+Care+Culver+City',
  },
]
