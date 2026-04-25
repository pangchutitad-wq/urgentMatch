# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

UrgentMatch — AI-powered urgent care routing built for LA Hacks 2026. A multi-agent system on Fetch.ai Agentverse: a Claude-powered intake agent collects symptoms and routes to a matcher agent that ranks nearby clinics.

**Not a diagnostic tool.** Never tell users what is wrong with them. Only help choose a clinic.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in ANTHROPIC_API_KEY and AGENTVERSE_API_KEY
```

## Running

```bash
# Run both agents in separate terminals
python agents/intake_agent.py
python agents/matcher_agent.py
```

Demo interface: ASI:One (asi1.ai) — search for UrgentMatch and chat with symptoms.

## Architecture

Two cooperating uAgents registered on Fetch.ai Agentverse:

**`agents/intake_agent.py`** — Claude Sonnet 4 powered. Receives user messages via Chat Protocol, extracts `specialty`, `urgency`, and `redFlag` through conversation, then forwards a structured request to the matcher agent.

**`agents/matcher_agent.py`** — Scores and ranks clinics. Receives the structured request from intake, filters by distance (≤15 miles via Haversine), scores each clinic, and returns the top 3.

**Scoring formula** (`lib/matcher.py`):
```
score = (specialtyMatch × 0.4) + ((1 - loadFactor) × 0.3) + ((1 - normalizedETA) × 0.3)
```
- `specialtyMatch`: 1.0 exact · 0.5 related · 0.0 none
- `loadFactor`: currentPatients / capacity, clamped [0,1]
- `normalizedETA`: etaMinutes / 90, clamped [0,1]

**`data/clinics.py`** — 8 mock LA-area urgent care clinics (not real-time data).

**`lib/specialty.py`** — Keyword → specialty fallback mapping (general, orthopedic, respiratory, gastrointestinal, dermatology, pediatric).

**`lib/distance.py`** — Haversine distance calculation.

## Red Flag Handling

If `redFlag` is true (e.g., chest pain, difficulty breathing, stroke symptoms), the intake agent must respond immediately with a 911 directive and stop the matching flow entirely.

## Environment Variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API access (intake agent) |
| `AGENTVERSE_API_KEY` | Fetch.ai Agentverse registration |
