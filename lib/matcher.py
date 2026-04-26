from lib.models import Clinic
from lib.distance import haversine

MAX_DISTANCE = 15   # miles
MAX_ETA = 90        # minutes — anything at or above scores 0 on wait

def score_clinic(clinic: Clinic, specialty: str, user_lat: float, user_lon: float) -> float | None:
    distance = haversine(user_lat, user_lon, clinic.lat, clinic.lon)
    if distance > MAX_DISTANCE:
        return None

    # 40% — exact specialty match; 0 if no match
    specialty_score = 1.0 if specialty in clinic.specialties else 0.0

    # 30% — proximity (closer is better, capped at MAX_DISTANCE)
    proximity_score = 1.0 - min(distance / MAX_DISTANCE, 1.0)

    # 20% — wait time (shorter is better)
    wait_score = 1.0 - min(clinic.eta_minutes / MAX_ETA, 1.0)

    # 10% — open now bonus
    open_score = 1.0 if clinic.open_now else 0.0

    return specialty_score * 0.35 + proximity_score * 0.3 + wait_score * 0.2 + open_score * 0.15

def rank_clinics(clinics: list[Clinic], specialty: str, user_lat: float, user_lon: float) -> list[tuple[float, Clinic]]:
    results = [
        (score, clinic)
        for clinic in clinics
        if (score := score_clinic(clinic, specialty, user_lat, user_lon)) is not None
    ]
    results.sort(key=lambda x: x[0], reverse=True)
    return results[:5]
