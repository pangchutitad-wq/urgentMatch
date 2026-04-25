from typing import Optional
from uagents import Model


class MatchRequest(Model):
    session_id: str
    specialty: str
    urgency: int
    user_lat: float
    user_lon: float


class ClinicResult(Model):
    name: str
    address: str
    matchPercent: int
    etaMinutes: int
    specialty: str


class MatchResponse(Model):
    session_id: str
    clinics: list[ClinicResult]
    error: Optional[str] = None
