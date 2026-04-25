import json
import os
import re
import sys
from typing import Optional
from uuid import uuid4

from dotenv import load_dotenv
# import anthropic
from openai import OpenAI
from uagents import Agent, Context
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
    chat_proto,
)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.models import MatchRequest, MatchResponse

load_dotenv()

# ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
ASI1_API_KEY = os.environ["ASI1_API_KEY"]
MATCHER_AGENT_ADDRESS = os.environ["MATCHER_AGENT_ADDRESS"]
INTAKE_SEED = os.getenv("INTAKE_SEED", "urgentmatch-intake-seed")

DEFAULT_LA_LAT = 34.0522
DEFAULT_LA_LON = -118.2437

SYSTEM_PROMPT = """\
You are a medical intake assistant for UrgentMatch — NOT a diagnostic tool.
Your only job is to identify which clinic type the patient needs, not what is wrong with them.
Ask 1-2 short clarifying questions to understand the symptoms and situation.

When you have enough information, output ONLY valid JSON with no other text:
{"specialty": "<general|orthopedic|respiratory|gastrointestinal|dermatology|pediatric>", "urgency": <1-10>, "redFlag": <true|false>}

Specialty guidelines:
- general: cold, fever, fatigue, mild illness, minor infections
- orthopedic: sprains, fractures, joint pain, back injury
- respiratory: cough, asthma, shortness of breath (non-emergency)
- gastrointestinal: stomach pain, nausea, vomiting, diarrhea
- dermatology: rashes, skin infections, allergic reactions (skin)
- pediatric: any complaint where the patient is a child (under 18)

Set redFlag=true ONLY for life-threatening symptoms: crushing chest pain or pressure,
stroke signs (face drooping, arm weakness, speech trouble), severe difficulty breathing,
loss of consciousness, uncontrolled severe bleeding.

Rules:
- NEVER diagnose or explain what might be wrong
- NEVER suggest treatments or medications
- Only route to the right clinic type
- If patient is a child, always use pediatric regardless of symptom type\
"""

# claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
asi_client = OpenAI(api_key=ASI1_API_KEY, base_url="https://api.asi1.ai/v1")

agent = Agent(
    name="urgentmatch-intake",
    seed=INTAKE_SEED,
    port=8000,
    endpoint=["http://localhost:8000/submit"],
)

# Per-sender conversation history: sender_address -> list of {role, content} dicts
sessions: dict[str, list[dict]] = {}


def _extract_text(msg: ChatMessage) -> str:
    for part in msg.content:
        if isinstance(part, TextContent):
            return part.text
    return ""


def _try_parse_routing(text: str) -> Optional[dict]:
    """Return parsed routing dict if Claude output is a valid routing decision, else None."""
    stripped = text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, re.DOTALL)
    if match:
        stripped = match.group(1)
    try:
        data = json.loads(stripped)
        if all(k in data for k in ("specialty", "urgency", "redFlag")):
            return data
    except (json.JSONDecodeError, ValueError):
        pass
    return None


def _format_clinic_list(clinics: list) -> str:
    lines = ["Here are the best urgent care options nearby:\n"]
    for i, c in enumerate(clinics, 1):
        lines.append(
            f"{i}. **{c.name}** — {c.matchPercent}% match\n"
            f"   {c.address}\n"
            f"   Estimated wait: ~{c.etaMinutes} min"
        )
    return "\n".join(lines)


@chat_proto.on_message(ChatMessage)
async def handle_user_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=msg.msg_id))

    user_text = _extract_text(msg)
    if not user_text:
        return

    history = sessions.setdefault(sender, [])
    history.append({"role": "user", "content": user_text})

    # response = claude.messages.create(
    #     model="claude-sonnet-4-6",
    #     max_tokens=512,
    #     system=SYSTEM_PROMPT,
    #     messages=history,
    # )
    # reply_text = response.content[0].text
    response = asi_client.chat.completions.create(
        model="asi1-mini",
        max_tokens=512,
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, *history],
    )
    reply_text = response.choices[0].message.content

    routing = _try_parse_routing(reply_text)

    if routing:
        sessions.pop(sender, None)

        if routing["redFlag"]:
            await ctx.send(
                sender,
                ChatMessage(
                    msg_id=uuid4(),
                    content=[TextContent(
                        text="🚨 This sounds like a medical emergency. Call 911 immediately — do not drive to urgent care."
                    )],
                ),
            )
            return

        await ctx.send(
            MATCHER_AGENT_ADDRESS,
            MatchRequest(
                session_id=sender,
                specialty=routing["specialty"],
                urgency=int(routing["urgency"]),
                user_lat=DEFAULT_LA_LAT,
                user_lon=DEFAULT_LA_LON,
            ),
        )
    else:
        history.append({"role": "assistant", "content": reply_text})
        await ctx.send(
            sender,
            ChatMessage(
                msg_id=uuid4(),
                content=[TextContent(text=reply_text)],
            ),
        )


@agent.on_message(MatchResponse)
async def handle_match_response(ctx: Context, sender: str, msg: MatchResponse):
    if msg.error:
        reply = f"Sorry, I couldn't find any clinics nearby: {msg.error}"
    elif not msg.clinics:
        reply = "Sorry, there are no urgent care clinics within 15 miles of your location right now."
    else:
        reply = _format_clinic_list(msg.clinics)

    await ctx.send(
        msg.session_id,
        ChatMessage(
            msg_id=uuid4(),
            content=[TextContent(text=reply)],
        ),
    )


agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
