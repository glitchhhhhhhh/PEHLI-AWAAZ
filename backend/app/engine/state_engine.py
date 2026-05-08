"""
State Engine — Computes real-time conversation state transitions.

This is the "brain" of the AI: it analyses each exchange and updates
intent, trust, engagement, persona, objection, strategy, and lead score.
The output mirrors the frontend Zustand `useStateStore` 1:1.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

from app.config import get_settings
from app.models import (
    ChatMessage,
    ConversationStage,
    ConversationState,
    IntentLevel,
    Language,
    LeadClass,
    Persona,
)


# ── Keyword lexicons ────────────────────────────────────

_OBJECTION_KEYWORDS: Dict[str, List[str]] = {
    "price": ["expensive", "costly", "mehnga", "fees", "charge", "paisa", "cost", "price"],
    "timing": ["busy", "baad mein", "later", "abhi nahi", "time nahi", "kal"],
    "competition": ["broker", "already", "existing", "dusra", "pehle se"],
    "trust": ["scam", "fraud", "dhoka", "trust nahi", "bharosa nahi", "fake"],
    "knowledge": ["samajh nahi", "pata nahi", "nahi aata", "complicated", "mushkil"],
}

_PERSONA_KEYWORDS: Dict[str, List[str]] = {
    "trader": ["trading", "broker", "shares", "stocks", "intraday", "F&O", "nifty", "sensex", "trade", "paisa", "ROI", "leverage"],
    "beginner": ["start karna", "shuru", "beginner", "naya", "pehli baar", "first time", "seekhna", "basics", "simple"],
    "MFD": ["MFD", "advisor", "distributor", "AUM", "clients", "commission", "SIP", "network", "sub-broker"],
    "investor": ["long term", "wealth", "compounding", "retirement", "goal", "portfolio", "safe", "stable"],
    "HNI": ["crore", "lakh", "portfolio", "wealth", "NRI", "offshore", "HNI", "large capital"],
    "salaried": ["salary", "naukri", "job", "monthly income", "EMI", "savings"],
    "influencer": ["audience", "followers", "content", "monetize", "reach", "community", "youtube", "social media"],
    "trust_deficit": ["scam", "fraud", "bharosa", "safe", "legal", "SEBI", "risk"],
    "hesitant": ["not sure", "sochna padega", "later", "baad mein", "maybe", "confused"],
}

_ENGAGEMENT_SIGNALS = [
    "haan", "yes", "sure", "bilkul", "accha", "theek", "okay", "batao", "samjhao",
    "kaise", "kya", "kitna", "interested", "start", "karna hai",
]

_TRUST_SIGNALS = ["accha lagta", "sahi", "bharosa", "trust", "theek hai", "samajh aaya"]

_HOT_SIGNALS = [
    "start karna hai", "sign up", "register", "account", "kholna", "ready",
    "haan chalega", "karo", "kar do", "invest karna hai",
]


# ── Core engine ──────────────────────────────────────────

class StateEngine:
    """
    Stateless calculator — takes current state + new message → new state.
    No side-effects; all mutations go through the returned ConversationState.
    """

    def __init__(self) -> None:
        self._settings = get_settings()

    def compute_next_state(
        self,
        current: ConversationState,
        user_message: str,
        ai_response: str,
        turn_number: int,
    ) -> Tuple[ConversationState, List[str]]:
        """
        Analyse the latest user message + AI response and return
        (updated_state, thinking_steps).
        """
        text_lower = user_message.lower()
        thinking: List[str] = []

        # ── 1. Language detection ────────────────────────
        lang = self._detect_language(user_message)
        thinking.append(f"Language: {lang.value} detected")

        # ── 2. Persona identification ────────────────────
        persona = self._detect_persona(text_lower, current.persona)
        if persona != current.persona:
            thinking.append(f"Persona: {persona.value} identified")

        # ── 3. Objection detection ───────────────────────
        objection = self._detect_objection(text_lower)
        if objection:
            thinking.append(f"⚠️ Objection detected: {objection.upper()}")
        elif current.objection:
            thinking.append("Objection resolved ✓")

        # ── 4. Engagement scoring ────────────────────────
        engagement_delta = self._compute_engagement_delta(text_lower, turn_number)
        new_engagement = min(10.0, max(0.0, current.engagement_score + engagement_delta))
        thinking.append(
            f"Engagement: {current.engagement_score:.1f} → {new_engagement:.1f} "
            f"({'↑' if engagement_delta > 0 else '↓'}{abs(engagement_delta):.1f})"
        )

        # ── 5. Trust scoring ─────────────────────────────
        trust_delta = self._compute_trust_delta(text_lower, objection, turn_number)
        new_trust = min(1.0, max(0.0, current.trust_score + trust_delta))
        thinking.append(
            f"Trust: {current.trust_score:.2f} → {new_trust:.2f} "
            f"({'↑' if trust_delta > 0 else '↓'}{abs(trust_delta):.2f})"
        )

        # ── 6. Lead scoring ──────────────────────────────
        new_lead_score = self._compute_lead_score(new_trust, new_engagement, objection)
        lead_class = self._classify_lead(new_lead_score)
        thinking.append(f"Lead score: {current.lead_score:.1f} → {new_lead_score:.1f} [{lead_class.value}]")

        # ── 7. Intent detection ──────────────────────────
        intent = self._detect_intent(text_lower, new_lead_score)
        if intent != current.intent:
            thinking.append(f"Intent shift: {current.intent.value} → {intent.value}")

        # ── 8. Strategy selection ────────────────────────
        strategy, reason = self._select_strategy(intent, persona, objection, new_engagement)
        if strategy != current.strategy:
            thinking.append(f"Strategy: switching to {strategy}")

        # ── 9. Conversation stage ────────────────────────
        stage = self._compute_stage(turn_number, intent, lead_class)

        # ── 10. Memory facts ─────────────────────────────
        new_facts = self._extract_memory_facts(text_lower, current.memory_facts)
        memory_triggered = len(new_facts) > len(current.memory_facts)
        if memory_triggered:
            thinking.append(f"🧠 Memory: {len(new_facts) - len(current.memory_facts)} new fact(s) stored")

        # ── 11. Emotion & Confidence ─────────────────────
        emotion = self._detect_emotion(text_lower, objection, new_trust)
        ai_confidence = self._compute_ai_confidence(turn_number, new_trust, persona)
        conversion_prob = self._compute_conversion_prob(new_lead_score, new_trust, stage)

        # ── Assemble ─────────────────────────────────────
        new_state = ConversationState(
            intent=intent,
            intent_score=new_lead_score,
            trust_score=round(new_trust, 2),
            persona=persona,
            objection=objection,
            engagement_score=round(new_engagement, 1),
            strategy=strategy,
            strategy_reason=reason,
            conversation_stage=stage,
            language=lang,
            lead_score=round(new_lead_score, 1),
            lead_class=lead_class,
            emotion=emotion,
            ai_confidence=round(ai_confidence, 2),
            conversion_probability=round(conversion_prob, 2),
            memory_facts=new_facts,
            thinking_steps=thinking,
            memory_triggered=memory_triggered,
        )

        return new_state, thinking

    # ── Private helpers ──────────────────────────────────

    def _detect_language(self, text: str) -> Language:
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        eng_words = len(re.findall(r'[a-zA-Z]{2,}', text))
        total = hindi_chars + eng_words
        if total == 0:
            return Language.HINGLISH
        ratio = hindi_chars / total
        if ratio > 0.7:
            return Language.HINDI
        elif ratio < 0.2:
            return Language.ENGLISH
        return Language.HINGLISH

    def _detect_persona(self, text: str, current: Persona) -> Persona:
        scores: Dict[str, int] = {}
        for persona, keywords in _PERSONA_KEYWORDS.items():
            hits = sum(1 for kw in keywords if kw.lower() in text)
            if hits:
                scores[persona] = hits
        if scores:
            best = max(scores, key=scores.get)  # type: ignore[arg-type]
            return Persona(best)
        return current

    def _detect_objection(self, text: str) -> Optional[str]:
        for obj_type, keywords in _OBJECTION_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return obj_type
        return None

    def _compute_engagement_delta(self, text: str, turn: int) -> float:
        delta = 0.0
        hits = sum(1 for sig in _ENGAGEMENT_SIGNALS if sig in text)
        delta += hits * 0.4
        # Question marks signal curiosity
        delta += text.count("?") * 0.3
        # Longer messages = more engaged
        word_count = len(text.split())
        if word_count > 15:
            delta += 0.5
        elif word_count < 3:
            delta -= 0.3
        # Base turn bonus (people who keep talking are engaging)
        delta += 0.2
        return round(min(delta, 2.5), 1)

    def _compute_trust_delta(self, text: str, objection: Optional[str], turn: int) -> float:
        delta = 0.0
        hits = sum(1 for sig in _TRUST_SIGNALS if sig in text)
        delta += hits * 0.05
        if objection == "trust":
            delta -= 0.15
        elif objection:
            delta -= 0.03
        # Staying in conversation builds implicit trust
        delta += 0.015
        return round(delta, 3)

    def _compute_lead_score(self, trust: float, engagement: float, objection: Optional[str]) -> float:
        score = (trust * 5.0) + (engagement * 0.5)
        if objection:
            score *= 0.85
        return round(min(10.0, max(0.0, score)), 1)

    def _classify_lead(self, score: float) -> LeadClass:
        s = self._settings
        if score >= s.LEAD_HOT_THRESHOLD:
            return LeadClass.HOT
        elif score >= s.LEAD_WARM_THRESHOLD:
            return LeadClass.WARM
        return LeadClass.COLD

    def _detect_intent(self, text: str, lead_score: float) -> IntentLevel:
        if any(sig in text for sig in _HOT_SIGNALS):
            return IntentLevel.HOT
        if lead_score >= self._settings.LEAD_HOT_THRESHOLD:
            return IntentLevel.HOT
        if lead_score >= self._settings.LEAD_WARM_THRESHOLD:
            return IntentLevel.WARM
        return IntentLevel.COLD

    def _select_strategy(
        self,
        intent: IntentLevel,
        persona: Persona,
        objection: Optional[str],
        engagement: float,
    ) -> Tuple[str, str]:
        # Objection-first strategies
        if objection == "price":
            return "roi_calculator_approach", "Price objection → showing concrete ROI"
        if objection == "timing":
            return "future_pacing_fomo", "User busy → creating urgency with value hook"
        if objection == "competition":
            return "competitive_comparison", "Existing competitor → differentiating"
        if objection == "trust":
            return "social_proof_authority", "Trust concern → building credibility"
        if objection == "knowledge":
            return "educational_storytelling", "Knowledge gap → simplifying concepts"

        # Intent-based strategies
        if intent == IntentLevel.HOT:
            return "direct_close_soft_ask", "High intent → transitioning to close"
        if intent == IntentLevel.WARM:
            if persona == Persona.BEGINNER:
                return "educational_storytelling", "Beginner showing interest → educating"
            if persona == Persona.TRADER:
                return "data_driven_proof", "Trader warming up → showing performance data"
            return "consultative_approach", "Warm lead → deepening relationship"

        # Default cold
        return "educational_storytelling", "Initial contact — building rapport"

    def _compute_stage(
        self, turn: int, intent: IntentLevel, lead_class: LeadClass,
    ) -> ConversationStage:
        if lead_class == LeadClass.HOT or intent == IntentLevel.HOT:
            return ConversationStage.CLOSING
        if turn <= 1:
            return ConversationStage.INTRO
        if turn <= 3:
            return ConversationStage.DISCOVERY
        return ConversationStage.PERSUASION

    def _extract_memory_facts(self, text: str, existing: List[str]) -> List[str]:
        facts = list(existing)
        patterns = {
            "Has existing broker": ["broker", "existing", "zerodha", "upstox", "groww", "angel", "icici"],
            "Active trader": ["trading", "trade", "intraday", "options", "f&o", "nifty", "bank nifty"],
            "Price sensitive": ["expensive", "mehnga", "cost", "fees", "charges", "paisa", "free"],
            "Beginner investor": ["start karna", "beginner", "pehli baar", "naya", "knowledge", "basics"],
            "Interested in mutual funds": ["mutual fund", "SIP", "MF", "elss", "index fund"],
            "Safety conscious": ["safe", "risk", "secure", "khatre", "loss", "sebi", "legal"],
            "Time constrained": ["busy", "time nahi", "baad mein", "meeting", "office", "kal"],
            "Ready to start investing": ["start karna hai", "ready", "chalega", "kar do", "sign up", "link"],
            "High net worth signals": ["crore", "lakh", "portfolio", "large capital", "wealth manager"],
            "Interested in diversification": ["gold", "real estate", "crypto", "diversify", "allocation"],
        }
        for fact, keywords in patterns.items():
            if fact not in facts and any(kw in text for kw in keywords):
                facts.append(fact)
        return facts

    def _detect_emotion(self, text: str, objection: Optional[str], trust: float) -> str:
        if objection == "trust": return "skeptical"
        if any(w in text for w in ["waah", "great", "awesome", "shandar", "badhiya", "interested"]): return "excited"
        if any(w in text for w in ["pata nahi", "confused", "kaise", "samajh nahi"]): return "confused"
        if any(w in text for w in ["sir", "aap", "professional", "details", "process"]): return "professional"
        if trust < 0.3: return "hesitant"
        if trust > 0.8: return "confident"
        return "neutral"

    def _compute_ai_confidence(self, turn: int, trust: float, persona: Persona) -> float:
        base = 0.7
        if trust > 0.7: base += 0.2
        if persona != Persona.UNKNOWN: base += 0.1
        if turn > 5: base -= 0.05 # Entropy increases in long conversations
        return min(1.0, max(0.0, base))

    def _compute_conversion_prob(self, lead_score: float, trust: float, stage: ConversationStage) -> float:
        prob = (lead_score / 10.0) * 0.6 + (trust * 0.4)
        if stage == ConversationStage.CLOSING: prob += 0.1
        if stage == ConversationStage.INTRO: prob -= 0.05
        return min(0.99, max(0.01, prob))


# ── Singleton ────────────────────────────────────────────

_engine: Optional[StateEngine] = None


def get_state_engine() -> StateEngine:
    global _engine
    if _engine is None:
        _engine = StateEngine()
    return _engine
