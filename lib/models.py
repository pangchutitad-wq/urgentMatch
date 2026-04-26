from typing import Optional, List, Tuple
from dataclasses import dataclass
from uagents import Model

#inheriting from model 
class MatchRequest(Model):
    session_id: str
    specialty: str
    urgency: int
    user_lat: float
    user_lon: float

#what gets sent to the frontend
class ClinicResult(Model):
    name: str
    address: str
    matchPercent: int
    etaMinutes: int
    specialty: str

#for backend scoring logic
@dataclass
class Clinic:
    name: str 
    address: str
    lat: float
    lon: float
    specialties: List[str] #clinic specialties 
    current_patients: int
    capacity: int
    eta_minutes: int #wait time

class MatchResponse(Model):
    session_id: str
    clinics: List[ClinicResult]
    error: Optional[str] = None
