from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from uagents import Model


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


# for backend scoring logic
@dataclass
class Clinic:
    name: str
    address: str
    lat: float
    lon: float
    specialties: List[str]
    current_patients: int
    capacity: int
    eta_minutes: int


class MatchResponse(Model):
    session_id: str
    clinics: List[ClinicResult]
    error: Optional[str] = None
