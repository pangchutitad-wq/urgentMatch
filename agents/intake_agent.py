import asyncio
import json
import os
import random
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from dotenv import load_dotenv
# import anthropic
from openai import OpenAI
from uagents import Agent, Context, Model, Protocol

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)

chat_proto = Protocol(spec=chat_protocol_spec)

from lib.models import Clinic, MatchRequest, MatchResponse
from lib.matcher import rank_clinics
from lib.places import fetch_nearby_urgent_care
from lib.wait_time import estimate_wait
from lib.specialty import infer_clinic_specialties


def _infer_specialties(name: str) -> list[str]:
    return infer_clinic_specialties(name)


class ChatRESTRequest(Model):
    messages: List[Dict[str, Any]]
    session_id: str = ""
    image_base64: Optional[str] = None


class ChatRESTResponse(Model):
    type: str
    text: Optional[str] = None
    specialty: Optional[str] = None
    urgency: Optional[int] = None
    redFlag: Optional[bool] = None
    clinics: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

load_dotenv()

# ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
ASI1_API_KEY = os.environ["ASI1_API_KEY"]
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
MATCHER_AGENT_ADDRESS = os.getenv("MATCHER_AGENT_ADDRESS", "")
INTAKE_SEED = os.getenv("INTAKE_SEED", "urgentmatch-intake-seed")

FALLBACK_LAT = 34.0522  # downtown LA — only used if geocoding fails
FALLBACK_LON = -118.2437

SYSTEM_PROMPT = """\
You are a medical intake assistant for UrgentMatch — NOT a diagnostic tool.
Your only job is to identify which clinic type the patient needs, not what is wrong with them.
Ask 1-2 short clarifying questions to understand the symptoms and situation.
Also ask where the patient is located (city, neighborhood, or zip code) so you can find nearby clinics.

When you have enough information, output ONLY valid JSON with no other text:
{"specialty": "<general|orthopedic|respiratory|gastrointestinal|dermatology|pediatric>", "urgency": <1-10>, "redFlag": <true|false>, "location": "<city and state or zip code the user provided, or null if not given>"}

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
asi_client = OpenAI(api_key=ASI1_API_KEY, base_url="https://api.asi1.ai/v1", timeout=30.0)

agent = Agent(
    name="urgentmatch-intake",
    seed=INTAKE_SEED,
    port=8000,
    mailbox=True,
)

# Per-sender conversation history: sender_address -> list of {role, content} dicts
sessions: dict[str, list[dict]] = {}


def _make_chat(text: str) -> ChatMessage:
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=text)],
    )


def _extract_text(msg: ChatMessage) -> str:
    for part in msg.content:
        if isinstance(part, TextContent):
            return part.text
        if isinstance(part, dict) and part.get("type") == "text":
            return str(part.get("text", ""))
    return ""


def _try_parse_routing(text: str) -> Optional[dict]:
    if not text:
        return None
    # Try code block first, then bare JSON object anywhere in the text
    for pattern in (
        r"```(?:json)?\s*(\{[\s\S]*?\})\s*```",
        r"(\{[\s\S]*?\})",
    ):
        m = re.search(pattern, text)
        if m:
            try:
                data = json.loads(m.group(1))
                if all(k in data for k in ("specialty", "urgency", "redFlag")):
                    return data
            except (json.JSONDecodeError, ValueError):
                continue
    return None


async def _geocode(location_str: str) -> tuple[float, float]:
    if not GOOGLE_PLACES_API_KEY or not location_str:
        return FALLBACK_LAT, FALLBACK_LON
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": location_str, "key": GOOGLE_PLACES_API_KEY},
            )
            data = resp.json()
        if data.get("status") == "OK" and data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return loc["lat"], loc["lng"]
    except Exception:
        pass
    return FALLBACK_LAT, FALLBACK_LON


def _format_clinic_list(clinics: list) -> str:
    lines = ["Here are the best urgent care options nearby:\n"]
    for i, c in enumerate(clinics, 1):
        hours_line = f"\n   🕐 Today's hours: {c.hoursText}" if c.hoursText else ""
        open_status = "Open now" if c.openNow else "Closed"
        lines.append(
            f"{i}. **{c.name}**\n"
            f"   {c.address}\n"
            f"   {open_status}{hours_line}\n"
            f"   ⏱️ Estimated wait: ~{c.etaMinutes} min\n"
            f"   👥 Patient load: {c.currentPatients}/{c.capacity}\n"
            f"   👨‍⚕️ Doctors on duty: {c.doctorsOnDuty}"
        )
    return "\n".join(lines)


@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


@chat_proto.on_message(ChatMessage)
async def handle_user_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc),
        acknowledged_msg_id=msg.msg_id,
    ))

    user_text = ""
    for item in msg.content:
        if isinstance(item, StartSessionContent):
            ctx.logger.info(f"Session started by {sender[:16]}…")
            await ctx.send(sender, _make_chat(
                "Hi! I'm here to help you find the right urgent care. What's bringing you in today?"
            ))
            return
        elif isinstance(item, TextContent):
            user_text = item.text
        else:
            ctx.logger.info(f"Unexpected content type: {type(item)}")

    if not user_text:
        return

    ctx.storage.set(str(ctx.session), sender)
    history = sessions.setdefault(sender, [])
    history.append({"role": "user", "content": user_text})

    ctx.logger.info(f"Calling ASI1 for sender {sender[:16]}… message: {user_text[:60]}")
    try:
        response = await asyncio.to_thread(
            asi_client.chat.completions.create,
            model="asi1-mini",
            max_tokens=512,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, *history],
        )
        reply_text = response.choices[0].message.content or ""
        ctx.logger.info(f"ASI1 replied: {reply_text[:80]}")
    except Exception as exc:
        ctx.logger.error(f"ASI1 API error: {exc}")
        await ctx.send(sender, _make_chat("Sorry, I'm having trouble connecting. Please try again."))
        return

    routing = _try_parse_routing(reply_text)

    if routing:
        sessions.pop(sender, None)

        if routing["redFlag"]:
            await ctx.send(sender, _make_chat("🚨 This sounds like a medical emergency. Call 911 immediately — do not drive to urgent care."))
            return

        user_lat, user_lon = await _geocode(routing.get("location") or "")

        if not MATCHER_AGENT_ADDRESS:
            ctx.logger.warning("MATCHER_AGENT_ADDRESS not set — skipping clinic lookup")
            await ctx.send(sender, _make_chat(f"[dev] Routing complete: specialty={routing['specialty']}, urgency={routing['urgency']}, location=({user_lat:.4f},{user_lon:.4f}). Matcher not connected yet."))
            return

        await ctx.send(
            MATCHER_AGENT_ADDRESS,
            MatchRequest(
                session_id=sender,
                specialty=routing["specialty"],
                urgency=int(routing["urgency"]),
                user_lat=user_lat,
                user_lon=user_lon,
            ),
        )
    else:
        history.append({"role": "assistant", "content": reply_text})
        await ctx.send(sender, _make_chat(reply_text))


@agent.on_message(MatchResponse)
async def handle_match_response(ctx: Context, sender: str, msg: MatchResponse):
    if msg.error:
        reply = f"Sorry, I couldn't find any clinics nearby: {msg.error}"
    elif not msg.clinics:
        reply = "Sorry, there are no urgent care clinics within 15 miles of your location right now."
    else:
        reply = _format_clinic_list(msg.clinics)

    await ctx.send(msg.session_id, _make_chat(reply))


@agent.on_rest_post("/chat", ChatRESTRequest, ChatRESTResponse)
async def handle_rest_chat(ctx: Context, req: ChatRESTRequest) -> ChatRESTResponse:
    """HTTP endpoint for the Next.js web app — keeps the full agent pipeline active."""
    history: List[Dict[str, Any]] = list(req.messages)

    # ASI1 requires conversations to start with a user turn — drop any leading assistant messages
    while history and history[0].get("role") != "user":
        history.pop(0)

    if not history:
        return ChatRESTResponse(
            type="message",
            text="Hi! I'm here to help you find the right urgent care. What's bringing you in today?",
        )

    # Attach image to the last user message if provided
    if req.image_base64 and history and history[-1].get("role") == "user":
        last = history[-1]
        history[-1] = {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": req.image_base64}},
                {"type": "text", "text": last.get("content", "") or "See the image above."},
            ],
        }

    try:
        response = await asyncio.to_thread(
            asi_client.chat.completions.create,
            model="asi1-mini",
            max_tokens=512,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, *history],
        )
        reply_text = response.choices[0].message.content or ""
        ctx.logger.info(f"ASI1 REST reply: {reply_text[:80]}")
    except Exception as exc:
        ctx.logger.error(f"ASI1 API error (REST): {exc}")
        return ChatRESTResponse(type="error", error=str(exc))

    routing = _try_parse_routing(reply_text)
    if not routing:
        return ChatRESTResponse(type="message", text=reply_text)

    if routing.get("redFlag"):
        return ChatRESTResponse(type="redFlag")

    # Geocode and run clinic matching in-process (synchronous for the web request)
    user_lat, user_lon = await _geocode(routing.get("location") or "")
    specialty = str(routing.get("specialty", "general"))
    urgency = int(routing.get("urgency", 5))

    try:
        clinic_dicts = await fetch_nearby_urgent_care(user_lat, user_lon)
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
                    hours_today=d.get("hours_today", ""),
                    busyness_score=d.get("busyness_score"),
                )
            )
        ranked = rank_clinics(all_clinics, specialty, user_lat, user_lon)
        clinics_out = []
        for score, clinic in ranked:
            doctor_count = random.randint(2, 4)
            display_specialty = specialty if specialty in clinic.specialties else (
                "general" if "general" in clinic.specialties else clinic.specialties[0]
            )
            clinics_out.append({
                "name": clinic.name,
                "address": clinic.address,
                "lat": clinic.lat,
                "lon": clinic.lon,
                "matchPercent": int(score * 100),
                "etaMinutes": estimate_wait(clinic.busyness_score, doctor_count) or random.randint(10, 70),
                "specialty": display_specialty,
                "specialties": clinic.specialties,
                "currentPatients": clinic.current_patients,
                "capacity": clinic.capacity,
                "doctorsOnDuty": doctor_count,
                "rating": clinic.rating,
                "reviewCount": 0,
                "openNow": clinic.open_now,
                "mapsUrl": (
                    f"https://www.google.com/maps/place/?q=place_id:{clinic.place_id}"
                    if clinic.place_id
                    else f"https://maps.google.com/?q={clinic.address.replace(' ', '+')}"
                ),
                "hoursText": clinic.hours_today,
            })
    except Exception as exc:
        ctx.logger.error(f"Clinic matching error (REST): {exc}")
        return ChatRESTResponse(
            type="routing",
            specialty=specialty,
            urgency=urgency,
            redFlag=False,
        )

    return ChatRESTResponse(
        type="results",
        specialty=specialty,
        urgency=urgency,
        redFlag=False,
        clinics=clinics_out,
    )


agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
