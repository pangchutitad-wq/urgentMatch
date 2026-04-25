# 🏥 UrgentLA

> AI-powered urgent care routing — match your symptoms to the right clinic, right now.

UrgentLA is a multi-agent AI system built on Fetch.ai's Agentverse that helps patients find the best urgent care clinic for their symptoms. A Claude-powered intake agent collects symptoms through natural conversation (via text, voice, or photo), maps them to a medical specialty, and hands off to a matcher agent that ranks nearby clinics by specialist availability, current load, and estimated wait time.

**⚠️ Disclaimer:** UrgentLA is not a diagnostic tool. It never tells you what is wrong with you. It only helps you choose a clinic. Always follow the advice of a licensed medical professional. In an emergency, call 911.

---

## 🏆 Built For

- **LA Hacks 2026**
- **Track:** Catalyst for Care (Healthcare)
- **Prize Target:** Fetch.ai Agentverse — Search & Discovery of Agents ($2,500 first prize)

---

## ✨ Features

### 🤖 AI Symptom Intake
- Claude Sonnet 4-powered chat collects symptoms conversationally
- Asks about complaint, duration, severity (1–10), and age range
- One question at a time — empathetic, never diagnostic
- Returns structured output: `{ specialty, urgency, symptomSummary, redFlag }`

### 🚨 Red Flag Detection
- Runs on every Claude reply, not just the final one
- Triggers on: chest pain, difficulty breathing, stroke signs, severe head injury, uncontrolled bleeding, suicidal thoughts, severe allergic reaction, sepsis
- Shows full-screen red banner with a **"Call 911"** button

### 🎙️ Voice Input
- Speak your symptoms instead of typing
- Powered by the browser's Web Speech API — no extra setup

### 📸 Photo Upload
- Upload a photo of a rash, wound, or swelling
- Claude Vision analyzes the image and factors it into the specialty match
- Photo thumbnail shown inline in the chat

### 📍 Real Clinic Data
- Finds real urgent care clinics near you via **Google Places API**
- Real data: name, address, phone, lat/lng, open now, hours, rating, review count, photos, website
- Real drive time ETA via **Google Routes API**
- Estimated data (no public API exists): current busyness, wait time, doctors on duty — refreshed every 30s and labeled **"Estimated"**

### 🧮 Matching Algorithm
- Scores and ranks clinics using a weighted formula (see below)
- Filters out clinics beyond 15 miles
- Returns a ranked list with match %

### 🗺️ Results — List + Map View
- Toggle between list and map view
- List: ranked clinic cards with match %, distance, open now badge, rating, ETA
- Best match card shows a score breakdown (3 horizontal bars)
- Map: color-coded pins — green ≥80%, yellow 60–79%, red <60%
- Tap a pin to see a clinic summary panel

### 📋 Clinic Detail Page
- All real + estimated data in one view
- Score breakdown explaining why this clinic ranked here
- Tappable phone number
- "Open in Google Maps" button

### 🤖 Fetch.ai Agents
- Intake Agent + Matcher Agent registered on Agentverse
- Discoverable and demoable via ASI:One
- Chat Protocol implemented (mandatory for Fetch.ai prize eligibility)

---

## 🤖 How It Works

```
User (web app or ASI:One)
      │
      ▼
┌──────────────────────────┐
│      Intake Agent         │  ← Registered on Agentverse
│  (Claude Sonnet 4)        │     Text / voice / photo input
│                           │     Outputs: specialty, urgency, redFlag
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│      Matcher Agent        │  ← Registered on Agentverse
│  (Scoring Formula)        │     Google Places + Routes API
│                           │     Returns: ranked clinics + scores
└──────────────────────────┘
```

---

## 📐 Matching Formula

```
score = (specialtyMatch × 0.4) + ((1 - loadFactor) × 0.3) + ((1 - normalizedETA) × 0.3)
matchPercent = Math.round(score × 100)
```

- `specialtyMatch` — 1.0 exact match · 0.5 related specialty · 0.0 none
- `loadFactor` — currentPatients / capacity, clamped [0, 1]
- `normalizedETA` — driveMinutes / 90, clamped [0, 1]
- Distance is a **filter**, not a score — clinics beyond 15 miles are excluded

### Specialty Categories

| Specialty | Example Symptoms |
|---|---|
| `general` | cold, fever, fatigue, mild illness |
| `orthopedic` | sprains, fractures, joint pain, back injury |
| `respiratory` | cough, asthma, shortness of breath |
| `gastrointestinal` | stomach pain, nausea, vomiting, diarrhea |
| `dermatology` | rashes, skin infections, allergic reactions |
| `pediatric` | any complaint where patient is a child |

---

## 🛠️ Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + TypeScript |
| AI | Anthropic Claude Sonnet 4 (chat + vision) |
| Agents | Fetch.ai uAgents (Python) |
| Clinic Data | Google Places API (real) |
| Drive Time | Google Routes API (real) |
| Maps | Google Maps JS API |
| Voice Input | Web Speech API (browser-native) |
| Location | Browser `navigator.geolocation` |
| Agent Registry | Fetch.ai Agentverse |
| Demo Interface | ASI:One |

---

## 📁 File Structure

```
urgent-match/
├── README.md
├── requirements.txt
├── package.json
├── .env.example
├── .env                             # Never committed
├── agents/
│   ├── intake_agent.py              # Claude-powered symptom intake
│   └── matcher_agent.py             # Clinic scoring + ranking
├── lib/
│   ├── matcher.py                   # Scoring formula
│   ├── distance.py                  # Haversine distance calculation
│   └── specialty.py                 # Keyword → specialty fallback
└── src/
    ├── types.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                 # Welcome screen
    │   ├── chat/page.tsx            # Chat screen
    │   ├── results/page.tsx         # Results list + map toggle
    │   ├── clinic/[id]/page.tsx     # Clinic detail
    │   └── api/
    │       ├── chat/route.ts        # Claude API proxy (server-side)
    │       └── clinics/route.ts     # Google Places + Routes proxy
    └── components/
        ├── ChatBubble.tsx
        ├── ClinicCard.tsx
        ├── ScoreBreakdown.tsx
        ├── EmergencyBanner.tsx
        ├── MapView.tsx
        ├── VoiceInput.tsx           # Web Speech API
        └── PhotoUpload.tsx          # Claude Vision
```

---

## 🚀 Setup & Running

### 1. Clone the repo

```bash
git clone https://github.com/your-team/urgent-match.git
cd urgent-match
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Install JS dependencies

```bash
npm install
```

### 4. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...   # Enable Places API + Routes API + Maps JS API in Google Cloud Console
AGENTVERSE_API_KEY=...                # From agentverse.ai
```

### 5. Run the web app

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Run the agents (two separate terminals)

```bash
# Terminal 1
python agents/intake_agent.py

# Terminal 2
python agents/matcher_agent.py
```

### 7. Demo via ASI:One (for Fetch.ai prize)

1. Go to [asi1.ai](https://asi1.ai)
2. Search for **UrgentLA** or find the agent by address
3. Start chatting — describe your symptoms

---

## 🧪 Test Scenarios

| Scenario | Expected Result |
|---|---|
| "I twisted my ankle, it's swollen, 6/10 pain" | orthopedic · top clinic has ortho doc |
| "I have crushing chest pain and shortness of breath" | 🚨 Red flag — call 911 immediately |
| "My 4-year-old has a 102 fever and won't stop coughing" | pediatric · respiratory fallback |
| Upload photo of a rash | dermatology specialty detected via Claude Vision |
| Speak symptoms via mic | Voice transcribed and processed identically to text |
| User located 50+ miles from all clinics | Friendly empty state — no crash |
| Location permission denied | Falls back to default LA coordinates (34.0522, -118.2437) |

---

## 📊 Data Sources

| Data | Source |
|---|---|
| Clinic name, address, phone, hours, rating, photos | ✅ Real — Google Places API |
| Drive time ETA to clinic | ✅ Real — Google Routes API |
| Open right now | ✅ Real — Google Places API |
| Current busyness / wait time | 🔄 Estimated — simulated, refreshed every 30s |
| Doctors on duty + specialty | 🔄 Estimated — simulated |

---

## 🔐 API Keys & Security

- `ANTHROPIC_API_KEY` — server-side only via Next.js API route, never exposed to client
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — domain-restricted, safe for client-side Maps use
- `AGENTVERSE_API_KEY` — server-side only in `.env`
- `.env` and `.env.local` are in `.gitignore` — never committed

---

## ⚠️ Hackathon Disclaimer

This project was built in ~20 hours at LA Hacks 2026. It is **not production-ready**:

- Wait time and doctor data are simulated — not from real clinic systems
- No HIPAA compliance — do not use with real patient data
- Client-side API key handling is simplified for demo purposes
- This is a proof of concept only

---

## 👥 Team

Built with ❤️ by Isabella Li, Connor Mao, Chutitad Singkarin, Michelle Zhu at LA Hacks 2026