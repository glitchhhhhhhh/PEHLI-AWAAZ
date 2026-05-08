"""
Pydantic schemas — shared by API, state engine, and voice pipeline.
Mirrors the frontend Zustand store shape for 1:1 state sync.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


# ── Enums ───────────────────────────────────────────────

class IntentLevel(str, Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"


class LeadClass(str, Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"


class ConversationStage(str, Enum):
    INTRO = "intro"
    DISCOVERY = "discovery"
    PERSUASION = "persuasion"
    CLOSING = "closing"
    HANDOFF = "handoff"


class Persona(str, Enum):
    UNKNOWN = "unknown"
    TRADER = "trader"
    MFD = "MFD"
    INVESTOR = "investor"
    HESITANT = "hesitant"
    BEGINNER = "beginner"
    INFLUENCER = "influencer"
    HIGH_INTENT = "high_intent"
    TRUST_DEFICIT = "trust_deficit"
    WARM_LEAD = "warm_lead"
    COLD_LEAD = "cold_lead"
    HIGH_VALUE_LEAD = "high_value_lead"
    SALARIED = "salaried"
    HNI = "HNI"


class Language(str, Enum):
    HINGLISH = "hinglish"
    HINDI = "hindi"
    ENGLISH = "english"
    MIXED = "mixed"


# ── Chat Messages ───────────────────────────────────────

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    role: Literal["user", "ai", "system"]
    text: str
    language: Language = Language.HINGLISH
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    memory_highlight: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ── Conversation State (mirrors Zustand useStateStore) ──

class ConversationState(BaseModel):
    """Full AI brain state — kept in sync with the frontend dashboard."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    intent: IntentLevel = IntentLevel.COLD
    intent_score: float = 0.0          # 0-10 scale
    trust_score: float = 0.5           # 0-1 scale (user requested 0-1)
    persona: Persona = Persona.UNKNOWN
    secondary_persona: Optional[Persona] = None
    persona_confidence: float = 0.0
    
    objection: Optional[str] = None
    objection_history: List[str] = Field(default_factory=list)
    
    engagement_score: float = 1.0      # 0-10 scale
    strategy: str = "educational_storytelling"
    strategy_reason: str = "Initial contact — building rapport"
    conversation_stage: ConversationStage = ConversationStage.INTRO
    
    language: Language = Language.HINGLISH
    communication_style: str = "Natural Hinglish"
    
    lead_score: float = 1.5            # 0-10 scale
    lead_class: LeadClass = LeadClass.COLD
    lead_category: str = "New Prospect"
    
    # New metrics for Real-Time Sales Demo
    emotion: str = "neutral"           # e.g., excited, hesitant, skeptical, professional
    ai_confidence: float = 0.8         # 0-1 scale
    conversion_probability: float = 0.1 # 0-1 scale
    
    memory_facts: List[str] = Field(default_factory=list)
    key_quotes: List[str] = Field(default_factory=list)
    
    thinking_steps: List[str] = Field(default_factory=list)
    memory_triggered: bool = False
    
    last_updated: datetime = Field(default_factory=datetime.utcnow)


# ── Session ─────────────────────────────────────────────

class Session(BaseModel):
    """A full conversation session."""
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    messages: List[ChatMessage] = Field(default_factory=list)
    state: ConversationState = Field(default_factory=ConversationState)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ── API Request / Response ──────────────────────────────

class TextRequest(BaseModel):
    session_id: Optional[str] = None
    text: str
    language: Language = Language.HINGLISH


class VoiceUploadResponse(BaseModel):
    session_id: str
    transcript: str
    language: Language
    ai_reply: str
    state: ConversationState
    audio_url: Optional[str] = None


class TextResponse(BaseModel):
    session_id: str
    ai_reply: str
    state: ConversationState
    thinking_steps: List[str] = Field(default_factory=list)


class StateResponse(BaseModel):
    session_id: str
    state: ConversationState


class SessionListItem(BaseModel):
    session_id: str
    message_count: int
    lead_class: LeadClass
    persona: Persona
    created_at: datetime
    updated_at: datetime


# ── WebSocket Frames ────────────────────────────────────

class WSFrame(BaseModel):
    """Bidirectional WebSocket message envelope."""
    event: str                       # e.g. "user_text", "ai_reply", "state_update", "thinking", "audio_chunk"
    payload: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None
