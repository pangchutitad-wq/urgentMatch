import os
import sys
import random
from dotenv import load_dotenv
from uagents import Agent, Context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.models import MatchRequest, MatchResponse, ClinicResult
from lib.matcher import rank_clinics
from data.clinics import get_clinics

load_dotenv()

MATCHER_SEED = os.getenv("MATCHER_SEED", "urgentmatch-matcher-seed")

agent = Agent(
    name="urgentmatch-matcher",
    seed=MATCHER_SEED,
    port=8001,
    endpoint=["http://localhost:8001/submit"],
    mailbox=True,
)


@agent.on_message(MatchRequest)
async def handle_match_request(ctx: Context, sender: str, msg: MatchRequest):
    try:
        # Get fresh clinic data with randomized simulated values
        all_clinics = get_clinics()
        
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
                    mapsUrl=f"https://maps.google.com/?q={clinic.address.replace(' ', '+')}",
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
    
