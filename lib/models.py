from dataclasses import dataclass, field
from typing import Optional, List

from uagents import Model

#inheriting from model 
class MatchRequest(Model):
    session_id: str
    specialty: str
    urgency: int
    user_lat: float
    user_lon: float


# what gets sent to the frontend
class ClinicResult(Model):
    name: str
    address: str
    matchPercent: int
    etaMinutes: int
    specialty: str
    currentPatients: int
    capacity: int
    doctorsOnDuty: int = 0
    rating: float = 0.0
    reviewCount: int = 0
    openNow: bool = True
    mapsUrl: str = ""
    hoursText: str = ""

#for backend scoring logic
@dataclass
class Clinic:
    name: str
    address: str
    lat: float
    lon: float
    specialties: list[str]
    current_patients: int
    capacity: int
    eta_minutes: int
    rating: float = 0.0
    open_now: bool = True
    place_id: str = ""
    hours_today: str = ""
    busyness_score: Optional[int] = None

class MatchResponse(Model):
    session_id: str
    clinics: list[ClinicResult]
    error: Optional[str] = None
