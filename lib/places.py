import os

import httpx
from dotenv import load_dotenv

load_dotenv()

PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
_RADIUS_METERS = 24140  # 15 miles

_FALLBACK_CLINICS: list[dict] = [
    {
        "place_id": "mock_1",
        "name": "CityMD Urgent Care West Hollywood",
        "address": "8735 Santa Monica Blvd, West Hollywood, CA 90069",
        "lat": 34.0882, "lon": -118.3769,
        "open_now": True, "rating": 4.2, "review_count": 1823,
        "phone": None, "website": None,
    },
    {
        "place_id": "mock_2",
        "name": "Concentra Urgent Care – Culver City",
        "address": "10000 Washington Blvd, Culver City, CA 90232",
        "lat": 34.0195, "lon": -118.3965,
        "open_now": True, "rating": 3.9, "review_count": 412,
        "phone": None, "website": None,
    },
    {
        "place_id": "mock_3",
        "name": "NextCare Urgent Care – Mid-Wilshire",
        "address": "5301 Wilshire Blvd, Los Angeles, CA 90036",
        "lat": 34.0622, "lon": -118.3440,
        "open_now": True, "rating": 4.0, "review_count": 638,
        "phone": None, "website": None,
    },
    {
        "place_id": "mock_4",
        "name": "MedPost Urgent Care – Silver Lake",
        "address": "2918 Rowena Ave, Los Angeles, CA 90039",
        "lat": 34.0934, "lon": -118.2631,
        "open_now": True, "rating": 4.4, "review_count": 290,
        "phone": None, "website": None,
    },
    {
        "place_id": "mock_5",
        "name": "Cedars-Sinai Urgent Care – Beverly Hills",
        "address": "8733 Beverly Blvd, Los Angeles, CA 90048",
        "lat": 34.0767, "lon": -118.3795,
        "open_now": True, "rating": 4.1, "review_count": 774,
        "phone": None, "website": None,
    },
]


def _parse_place(place: dict) -> dict | None:
    loc = place.get("geometry", {}).get("location", {})
    if not loc:
        return None
    return {
        "place_id": place.get("place_id", ""),
        "name": place.get("name", ""),
        "address": place.get("vicinity", ""),
        "lat": loc["lat"],
        "lon": loc["lng"],
        "open_now": place.get("opening_hours", {}).get("open_now", True),
        "rating": place.get("rating"),
        "review_count": place.get("user_ratings_total"),
        "phone": None,
        "website": None,
    }


async def fetch_nearby_urgent_care(lat: float, lon: float) -> list[dict]:
    if not PLACES_API_KEY:
        return _FALLBACK_CLINICS

    params = {
        "location": f"{lat},{lon}",
        "radius": _RADIUS_METERS,
        "keyword": "urgent care",
        "key": PLACES_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(_NEARBY_URL, params=params)
            data = resp.json()
    except Exception:
        return _FALLBACK_CLINICS

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        return _FALLBACK_CLINICS

    results = [_parse_place(p) for p in data.get("results", [])]
    clinics = [c for c in results if c is not None]
    return clinics or _FALLBACK_CLINICS
