import logging
import os
from typing import Optional
import sys
from datetime import datetime

import httpx
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.clinics import get_clinics

load_dotenv()

PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
_RADIUS_METERS = 24140  # 15 miles
_FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.regularOpeningHours",
    "places.currentOpeningHours",
])


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
        "hours_today": "",
        "busyness_score": _current_busyness({}),
    }


def _current_busyness(_place: dict) -> int:
    """Estimate busyness 0-100 from time of day — mirrors typical urgent care traffic."""
    now = datetime.now()
    hour = now.hour
    is_weekend = now.weekday() >= 5

    # Typical urgent care traffic curve (weekday baseline)
    hourly = {
        0: 5,  1: 5,  2: 5,  3: 5,  4: 5,  5: 10,
        6: 20, 7: 40, 8: 60, 9: 70, 10: 75, 11: 72,
        12: 68, 13: 65, 14: 70, 15: 75, 16: 85, 17: 90,
        18: 80, 19: 65, 20: 45, 21: 30, 22: 15, 23: 8,
    }
    score = hourly.get(hour, 50)
    if is_weekend:
        score = min(100, int(score * 1.2))  # weekends run ~20% busier
    return score


def _today_hours(hours_info: dict) -> str:
    descriptions = hours_info.get("weekdayDescriptions", [])
    if not descriptions:
        return ""
    # Python weekday(): Monday=0 … Sunday=6, same order as Google's weekdayDescriptions
    idx = datetime.now().weekday()
    if 0 <= idx < len(descriptions):
        desc = descriptions[idx]
        return desc.split(": ", 1)[1] if ": " in desc else desc
    return ""


def _parse_place(place: dict) -> Optional[dict]:
    loc = place.get("location", {})
    if not loc:
        return None

    hours_info = place.get("currentOpeningHours") or place.get("regularOpeningHours") or {}
    open_now = hours_info.get("openNow", True)
    hours_today = _today_hours(hours_info)

    return {
        "place_id": place.get("id", ""),
        "name": place.get("displayName", {}).get("text", ""),
        "address": place.get("formattedAddress", ""),
        "lat": loc["latitude"],
        "lon": loc["longitude"],
        "open_now": open_now,
        "rating": place.get("rating"),
        "review_count": place.get("userRatingCount"),
        "phone": None,
        "website": None,
        "hours_today": hours_today,
        "busyness_score": _current_busyness(place),
        # specialties/capacity/eta simulated by matcher agent
    }


async def fetch_nearby_urgent_care(lat: float, lon: float) -> list[dict]:
    fallback = [_clinic_to_dict(c) for c in get_clinics()]

    if not PLACES_API_KEY:
        return fallback

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": _FIELD_MASK,
    }
    body = {
        "textQuery": "urgent care",
        "maxResultCount": 20,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lon},
                "radius": float(_RADIUS_METERS),
            }
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(_SEARCH_URL, json=body, headers=headers)
            data = resp.json()
    except Exception as e:
        logger.warning(f"Places API request failed: {e} — using fallback")
        return fallback

    if "error" in data:
        logger.warning(f"Places API error: {data['error']} — using fallback")
        return fallback

    places = data.get("places", [])
    logger.info(f"Places API returned {len(places)} results for ({lat:.4f},{lon:.4f})")
    if not places:
        return fallback

    results = [_parse_place(p) for p in places]
    clinics = [c for c in results if c is not None]
    return clinics or fallback
