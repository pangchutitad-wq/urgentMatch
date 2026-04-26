import os
from typing import Optional
import sys

import httpx
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.clinics import get_clinics

load_dotenv()

PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
_RADIUS_METERS = 24140  # 15 miles


def _clinic_to_dict(clinic) -> dict:
    return {
        "place_id": clinic.place_id,
        "name": clinic.name,
        "address": clinic.address,
        "lat": clinic.lat,
        "lon": clinic.lon,
        "open_now": clinic.open_now,
        "rating": clinic.rating,
        "review_count": 0,
        "phone": None,
        "website": None,
        "specialties": clinic.specialties,
        "current_patients": clinic.current_patients,
        "capacity": clinic.capacity,
        "eta_minutes": clinic.eta_minutes,
    }


def _parse_place(place: dict) -> Optional[dict]:
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
        # specialties/capacity/eta added by matcher agent via infer_specialties
    }


async def fetch_nearby_urgent_care(lat: float, lon: float) -> list[dict]:
    fallback = [_clinic_to_dict(c) for c in get_clinics()]

    if not PLACES_API_KEY:
        return fallback

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
        return fallback

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        return fallback

    results = [_parse_place(p) for p in data.get("results", [])]
    clinics = [c for c in results if c is not None]
    return clinics or fallback
