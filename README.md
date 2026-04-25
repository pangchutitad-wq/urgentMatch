# 🏥 UrgentMatch

> AI-powered urgent care routing — match your symptoms to the right clinic, right now.

UrgentMatch is a multi-agent AI system built on Fetch.ai's Agentverse that helps patients find the best urgent care clinic for their symptoms. A Claude-powered intake agent collects symptoms through natural conversation, maps them to a medical specialty, and hands off to a matcher agent that ranks nearby clinics by specialist availability, current load, and estimated wait time.

**⚠️ Disclaimer:** UrgentMatch is not a diagnostic tool. It never tells you what is wrong with you. It only helps you choose a clinic. Always follow the advice of a licensed medical professional. In an emergency, call 911.

---

## 🏆 Built For

- **LA Hacks 2026**
- **Track:** Catalyst for Care (Healthcare)
- **Prize Target:** Fetch.ai Agentverse — Search & Discovery of Agents ($2,500 first prize)

---

## 🤖 How It Works

```
User (via ASI:One)
      │
      ▼
┌─────────────────────┐
│    Intake Agent      │  ← Registered on Agentverse
│  (Claude Sonnet 4)   │     Collects symptoms via Chat Protocol
│                      │     Outputs: specialty, urgency, redFlag
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Matcher Agent      │  ← Registered on Agentverse
│  (Scoring Formula)   │     Ranks clinics by match %, load, ETA
│                      │     Returns: top 3 ranked clinics
└─────────────────────┘
```

### Matching Formula

```
score = (specialtyMatch × 0.4) + ((1 - loadFactor) × 0.3) + ((1 - normalizedETA) × 0.3)
matchPercent = Math.round(score × 100)
```

- `specialtyMatch` — 1.0 exact match · 0.5 related specialty · 0.0 none
- `loadFactor` — currentPatients / capacity, clamped [0, 1]
- `normalizedETA` — etaMinutes / 90, clamped [0, 1]
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
| Agent Framework | Fetch.ai uAgents (Python) |
| AI | Anthropic Claude Sonnet 4 |
| Language | Python 3.11+ |
| Registered On | Fetch.ai Agentverse |
| Demo Interface | ASI:One |

---

## 📁 File Structure

```
urgent-match/
├── README.md
├── requirements.txt
├── .env.example
├── .env                        # Never committed
├── agents/
│   ├── intake_agent.py         # Claude-powered symptom intake
│   └── matcher_agent.py        # Clinic scoring + ranking
├── data/
│   └── clinics.py              # 8 mock LA-area urgent care clinics
└── lib/
    ├── matcher.py              # Scoring formula
    ├── distance.py             # Haversine distance calculation
    └── specialty.py            # Keyword → specialty fallback
```

---

## 🚀 Setup & Running

### 1. Clone the repo

```bash
git clone https://github.com/your-team/urgent-match.git
cd urgent-match
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
ANTHROPIC_API_KEY=sk-ant-...
AGENTVERSE_API_KEY=...         # From agentverse.ai
```

### 4. Run the agents

In two separate terminals:

```bash
# Terminal 1
python agents/intake_agent.py

# Terminal 2
python agents/matcher_agent.py
```

### 5. Demo via ASI:One

1. Go to [asi1.ai](https://asi1.ai)
2. Search for **UrgentMatch** or find the agent by address
3. Start chatting — describe your symptoms

---

## 🧪 Test Scenarios

| Scenario | Expected Result |
|---|---|
| "I twisted my ankle, it's swollen, 6/10 pain" | orthopedic · top clinic has ortho doc |
| "I have crushing chest pain and shortness of breath" | 🚨 Red flag — call 911 immediately |
| "My 4-year-old has a 102 fever and won't stop coughing" | pediatric · respiratory fallback |
| User located 50+ miles from all clinics | Friendly empty state — no crash |

---

## 🔐 API Keys & Security

- `ANTHROPIC_API_KEY` — kept server-side in `.env`, never exposed
- `AGENTVERSE_API_KEY` — kept server-side in `.env`, never exposed
- `.env` is in `.gitignore` — never committed

---

## ⚠️ Hackathon Disclaimer

This project was built in ~20 hours at LA Hacks 2026. It is **not production-ready**:

- Clinic data is mocked — not real-time
- Location is approximated — not GPS-precise
- No HIPAA compliance — do not use with real patient data
- This is a proof of concept only

---

## 👥 Team

Built with Isabella Li, Connor Mao, Chutitad Singkarin, Michelle Zhu at LA Hacks 2026