from dotenv import load_dotenv
import os
from uagents import Context, Protocol, Agent
from models import MatchRequest, MatchResponse, ClinicResult
from lib.matcher import rank_clinics
from data.clinics import get_clinics
#import data clinics

#gets everything from .env
load_dotenv()

agent = Agent(
    name="matcher_agent", 
    seed=os.getenv("AGENT_SEED_MATCHER"), 
    port=8001, 
    endpoint=["http://127.0.0.1:8001/submit"],
)

protocol = Protocol()
@protocol.on_message(MatchRequest)
#sender = intake agent address
async def handle_match_request(ctx: Context, sender: str, msg: MatchRequest):
    clinics = get_clinics(); #list of clinics from data
    ranked = rank_clinics(clinics, msg.specialty, msg.user_lat, msg.user_lon)
    
    clinic_results = [
        ClinicResult(
            name=clinic.name,
            address=clinic.address,
            matchPercent=round(score * 100), #bc score is 0-1
            etaMinutes=clinic.eta_minutes,
            specialty=clinic.specialties[0]
            currentPatients=clinic.current_patients,
            capacity=clinic.capacity,
            rating=clinic.rating,
            openNow=clinic.open_now,
            mapsUrl=f"https://www.google.com/maps/place/?q=place_id:{clinic.place_id}" if clinic.place_id else ""
        )
        for score, clinic in ranked
    ]
    response = MatchResponse(
        session_id=msg.session_id,
        clinics=clinic_results
    )
    
    #send back to intake agent
    #await = wait until moving on, ctx = context (from agent toolbox)
    await ctx.send(sender, response)

#publish manifest - publish on agentverse for other agents to see
agent.include(protocol, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
    
