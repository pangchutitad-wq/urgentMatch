# urgent-care-finder UI (vendored)

Location: **`web/src/urgent-care-finder/`** (inside the Next app). Imports use `@/urgent-care-finder/...` (`tsconfig.json`: `@/*` → `./src/*`).

**`ResultsView.tsx`** is forked for UrgentMatch: `POST /api/chat`, `POST /api/match`, and the full-screen 911 state. The marketing landing page was removed; `/` renders this flow directly.
