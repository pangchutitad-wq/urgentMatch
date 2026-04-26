export type UrgencyLevel = 'mild' | 'moderate' | 'severe'

export interface MatchResult {
  match_score: number
  urgency_level: UrgencyLevel
  match_reason: string
}

export interface Doctor {
  name: string
  specialty: string
}

export interface Clinic {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  wait_time: number
  specializations: string[]
  doctors: Doctor[]
  phone: string
  hours: string
}

export const clinics: Clinic[] = [
  {
    id: 1,
    name: 'CityMed Urgent Care',
    address: '8920 Wilshire Blvd, Beverly Hills, CA 90211',
    lat: 34.0696,
    lng: -118.3956,
    wait_time: 12,
    specializations: ['General Care', 'X-Ray', 'Pediatrics', 'Wound Care'],
    doctors: [
      { name: 'Dr. Sarah Chen', specialty: 'Emergency Medicine' },
      { name: 'Dr. Marcus Webb', specialty: 'Family Medicine' },
    ],
    phone: '(310) 555-0142',
    hours: '7am – 10pm daily',
  },
  {
    id: 2,
    name: 'Westside Quick Care',
    address: '11340 Santa Monica Blvd, Los Angeles, CA 90025',
    lat: 34.0481,
    lng: -118.4572,
    wait_time: 28,
    specializations: ['Occupational Health', 'Sports Medicine', 'Lab Testing', 'IV Therapy'],
    doctors: [
      { name: 'Dr. Priya Nair', specialty: 'Internal Medicine' },
      { name: 'Dr. James Okafor', specialty: 'Sports Medicine' },
      { name: 'Dr. Linda Torres', specialty: 'Occupational Medicine' },
    ],
    phone: '(310) 555-0387',
    hours: '8am – 9pm daily',
  },
  {
    id: 3,
    name: 'Hollywood Urgent Care Center',
    address: '6360 Hollywood Blvd, Los Angeles, CA 90028',
    lat: 34.1017,
    lng: -118.3275,
    wait_time: 5,
    specializations: ['STI Testing', 'Travel Medicine', 'Minor Surgery', 'Allergy Shots'],
    doctors: [
      { name: 'Dr. Aaron Blake', specialty: 'Emergency Medicine' },
      { name: 'Dr. Mei Zhang', specialty: 'Infectious Disease' },
    ],
    phone: '(323) 555-0219',
    hours: 'Open 24 hours',
  },
  {
    id: 4,
    name: 'South Bay MedExpress',
    address: '24520 Hawthorne Blvd, Torrance, CA 90505',
    lat: 33.8031,
    lng: -118.3676,
    wait_time: 40,
    specializations: ['Pediatrics', 'Fracture Care', 'EKG', 'Respiratory Care'],
    doctors: [
      { name: 'Dr. Rachel Kim', specialty: 'Pediatrics' },
      { name: 'Dr. David Flores', specialty: 'Family Medicine' },
    ],
    phone: '(310) 555-0564',
    hours: '8am – 8pm daily',
  },
  {
    id: 5,
    name: 'Downtown LA Urgent Care',
    address: '700 W 7th St, Los Angeles, CA 90017',
    lat: 34.0474,
    lng: -118.2578,
    wait_time: 18,
    specializations: ['General Care', 'Mental Health', 'Pharmacy', 'Lab Testing'],
    doctors: [
      { name: 'Dr. Elena Vasquez', specialty: 'Family Medicine' },
      { name: 'Dr. Thomas Grant', specialty: 'Psychiatry' },
      { name: 'Dr. Aisha Patel', specialty: 'Internal Medicine' },
    ],
    phone: '(213) 555-0731',
    hours: '7am – 11pm daily',
  },
]

export const symptoms = [
  'Fever',
  'Cough',
  'Sore throat',
  'Ear pain',
  'Eye infection',
  'Rash',
  'Cuts & wounds',
  'Broken bone',
  'Headache',
  'Chest pain',
  'Stomach pain',
  'UTI',
  'Allergic reaction',
  'Back pain',
  'Nausea',
]
