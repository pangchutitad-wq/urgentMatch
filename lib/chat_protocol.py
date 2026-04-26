"""
Agent Chat Protocol message models (Fetch Agentverse chat + uagents 0.2x, Python 3.9).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from uagents import Model

__all__ = [
    "TextContent",
    "ChatMessage",
    "ChatAcknowledgement",
    "StartSessionContent",
]


class TextContent(Model):
    type: str = "text"
    text: str


class ChatMessage(Model):
    timestamp: datetime
    msg_id: UUID
    content: List[Any]


class ChatAcknowledgement(Model):
    timestamp: datetime
    acknowledged_msg_id: UUID
    metadata: Optional[dict] = None

class StartSessionContent(Model):
    type: str = "start_session"
