"""
One-shot test: sends a MatchRequest to the matcher agent and prints the response.
Run with both agents already running in separate terminals.
"""
import os
import sys
from dotenv import load_dotenv
from uagents import Agent, Context

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.models import MatchRequest, MatchResponse

load_dotenv()

MATCHER_ADDRESS = os.environ["MATCHER_AGENT_ADDRESS"]

tester = Agent(
    name="urgentmatch-tester",
    seed="urgentmatch-tester-seed",
    port=8002,
    endpoint=["http://localhost:8002/submit"],
    mailbox=True,
)

TEST_CASES = [
    ("orthopedic", 7, 34.09, -118.38),   # West Hollywood — twisted ankle
    ("pediatric",  5, 34.05, -118.24),   # Downtown LA   — sick child
    ("respiratory",6, 34.03, -118.49),   # Santa Monica  — cough/asthma
]
_pending = list(TEST_CASES)


@tester.on_event("startup")
async def send_requests(ctx: Context):
    for specialty, urgency, lat, lon in TEST_CASES:
        await ctx.send(
            MATCHER_ADDRESS,
            MatchRequest(
                session_id=f"test-{specialty}",
                specialty=specialty,
                urgency=urgency,
                user_lat=lat,
                user_lon=lon,
            ),
        )
        ctx.logger.info(f"Sent request: specialty={specialty}, urgency={urgency}")


@tester.on_message(MatchResponse)
async def handle_response(ctx: Context, sender: str, msg: MatchResponse):
    print(f"\n{'='*50}")
    print(f"Response for session: {msg.session_id}")
    if msg.error:
        print(f"  ERROR: {msg.error}")
    else:
        for i, c in enumerate(msg.clinics, 1):
            print(f"  {i}. {c.name}")
            print(f"     match={c.matchPercent}%  eta={c.etaMinutes}m  load={c.currentPatients}/{c.capacity}  doctors={c.doctorsOnDuty}")

    _pending.remove(next(t for t in _pending if t[0] == msg.session_id.replace("test-", "")))
    if not _pending:
        print("\nAll tests complete.")
        os._exit(0)


if __name__ == "__main__":
    print(f"Tester address: {tester.address}")
    print(f"Sending {len(TEST_CASES)} test requests to matcher...\n")
    tester.run()
