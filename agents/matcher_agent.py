import os
import sys
import random
from dotenv import load_dotenv
from uagents import Agent, Context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.models import MatchRequest, MatchResponse, ClinicResult, Clinic
from lib.matcher import rank_clinics
from lib.places import fetch_nearby_urgent_care

load_dotenv()

MATCHER_SEED = os.getenv("MATCHER_SEED", "urgentmatch-matcher-seed")

def _infer_specialties(name: str) -> list[str]:
    n = name.lower()
    specialties = ["general"]
    if any(k in n for k in ("ortho", "bone", "joint", "spine")):
        specialties.append("orthopedic")
    if any(k in n for k in ("respir", "pulmon", "lung")):
        specialties.append("respiratory")
    if any(k in n for k in ("gastro", "digest")):
        specialties.append("gastrointestinal")
    if any(k in n for k in ("dermat", "skin")):
        specialties.append("dermatology")
    if any(k in n for k in ("pediatr", "child", "kid")):
        specialties.append("pediatric")
    return specialties


agent = Agent(
    name="urgentmatch-matcher",
    seed=MATCHER_SEED,
    port=8001,
    mailbox=True,
)


@agent.on_message(MatchRequest)
async def handle_match_request(ctx: Context, sender: str, msg: MatchRequest):
    try:
        # Fetch real nearby urgent care clinics (falls back to mock data if no API key)
        clinic_dicts = await fetch_nearby_urgent_care(msg.user_lat, msg.user_lon)

        all_clinics = []
        for d in clinic_dicts:
            specialties = d.get("specialties") or _infer_specialties(d["name"])
            all_clinics.append(
                Clinic(
                    name=d["name"],
                    address=d["address"],
                    lat=d["lat"],
                    lon=d["lon"],
                    specialties=specialties,
                    current_patients=d.get("current_patients") or random.randint(5, 20),
                    capacity=d.get("capacity") or 20,
                    eta_minutes=d.get("eta_minutes") or random.randint(10, 70),
                    rating=d.get("rating") or 0.0,
                    open_now=d.get("open_now", True),
                    place_id=d.get("place_id", ""),
                )
            )

        # Rank clinics based on specialty, distance, load, and ETA
        ranked = rank_clinics(all_clinics, msg.specialty, msg.user_lat, msg.user_lon)
        
        if not ranked:
            await ctx.send(
                sender,
                MatchResponse(
                    session_id=msg.session_id,
                    clinics=[],
                    error="No clinics found within 15 miles",
                ),
            )
            return
        
        # Convert to ClinicResult format for frontend with all simulated data
        results = []
        for score, clinic in ranked:
            match_percent = int(score * 100)
            
            # Determine primary specialty for display
            if msg.specialty in clinic.specialties:
                display_specialty = msg.specialty
            elif "general" in clinic.specialties:
                display_specialty = "general"
            else:
                display_specialty = clinic.specialties[0]
            
            results.append(
                ClinicResult(
                    name=clinic.name,
                    address=clinic.address,
                    matchPercent=match_percent,
                    etaMinutes=clinic.eta_minutes,
                    specialty=display_specialty,
                    currentPatients=clinic.current_patients,
                    capacity=clinic.capacity,
                    doctorsOnDuty=random.randint(2, 4),  # Randomized per request
                    rating=clinic.rating,
                    reviewCount=0,
                    openNow=clinic.open_now,
                    mapsUrl=(
                        f"https://www.google.com/maps/place/?q=place_id:{clinic.place_id}"
                        if clinic.place_id
                        else f"https://maps.google.com/?q={clinic.address.replace(' ', '+')}"
                    ),
                )
            )
        
        await ctx.send(
            sender,
            MatchResponse(
                session_id=msg.session_id,
                clinics=results,
                error=None,
            ),
        )
        
    except Exception as e:
        ctx.logger.error(f"Error matching clinics: {e}")
        await ctx.send(
            sender,
            MatchResponse(
                session_id=msg.session_id,
                clinics=[],
                error=str(e),
            ),
        )

if __name__ == "__main__":
    agent.run()
    
