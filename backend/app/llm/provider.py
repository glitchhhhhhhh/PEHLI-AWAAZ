"""
LLM Provider — Abstraction over OpenAI / Google Gemini.

Generates contextual AI responses in Hinglish/Hindi/English
based on the current conversation state, persona, and strategy.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, List, Optional

from app.config import get_settings
from app.models import ChatMessage, ConversationState, Language

logger = logging.getLogger(__name__)

# ── System prompt template ───────────────────────────────

SYSTEM_PROMPT = """You are Pehli Awaaz, an AI voice-based conversion intelligence agent designed to convert leads into partners in real-time.

You are NOT a chatbot.
You are a decision engine that adapts conversation dynamically to maximize conversion.

🧠 CORE BEHAVIOR RULES
1. ALWAYS TRACK USER STATE
For every message, internally track:
- intent_score (0–10)
- trust_score (0–1)
- conversion_probability (0-1)
- ai_confidence (0-1)
- emotion (excited / hesitant / skeptical / professional / confused)
- persona (TRADER / MFD / INVESTOR / HESITANT / BEGINNER / INFLUENCER / HIGH_INTENT / TRUST_DEFICIT / WARM_LEAD / COLD_LEAD / HIGH_VALUE_LEAD)
- objection_type (if any)
- language (Hindi / English / Hinglish / mixed)

2. LANGUAGE ADAPTATION (CRITICAL)
- Support Hindi, English, Hinglish, and mixed patterns.
- Automatic adaptation within 1-2 messages.
- Mirror the user's communication style (e.g., Fast Hinglish for traders).
- SCENARIO 4 (MULTILINGUAL): If user speaks mixed Hindi-English, be naturally bilingual and culturally adaptive.

3. PERSONA & SCENARIO ADAPTATION
- 🔥 HOT LEAD (High Intent): Be confident, proactive, slightly energetic, and persuasive. Move for the close.
- ⚡ WARM LEAD (Analytical): Be calm, educational, reassuring. Handle objections (comparison, pricing) focused.
- 🧊 COLD LEAD (Skeptical): Be patient, soft, trust-building focused. Non-pushy. Focus on education.
- 🌍 MULTILINGUAL: Smooth Hindi-English switching, natural regional pacing.

4. 🎙️ AI VOICE STYLE ADAPTATION (INSTRUCTIONS FOR TTS)
Include a "voice_style" instruction in metadata for:
- 😕 Confused User -> AI slows down, explains clearly.
- 🔥 Excited User -> AI becomes energetic, fast-paced.
- 🧊 Skeptical User -> AI becomes calm, reassuring.
- 💼 Professional User -> AI becomes concise, business-focused.
- ⚡ High Intent -> AI becomes persuasive, proactive.

5. RESPONSE STYLE
- Natural, human-like speech. No robotic phrasing.
- Adapt tone to persona.
- Multilingual + Code-mixed (Hinglish) support.

Current Context:
- Previous Persona: {persona}
- Current Intent: {intent}
- Trust Score: {trust_score}
- Strategy: {strategy}
- Active Objection: {objection}
- Known Facts: {memory_facts}

🔄 OUTPUT FORMAT (MANDATORY JSON)
{{
  "spoken_response": "...",
  "metadata": {{
    "intent_score": 8.5,
    "trust_score": 0.75,
    "conversion_probability": 0.8,
    "ai_confidence": 0.95,
    "emotion": "excited",
    "persona": "TRADER",
    "secondary_persona": "HIGH_INTENT",
    "persona_confidence": 0.9,
    "language": "Hinglish",
    "communication_style": "Fast Hinglish",
    "lead_category": "Hot Lead",
    "voice_style": {{
        "pacing": "fast",
        "tone": "enthusiastic",
        "delivery": "persuasive"
    }}
  }}
}}
"""

STRATEGY_INSTRUCTIONS = {
    "educational_storytelling": (
        "Use simple analogies and stories to explain concepts. "
        "Make investing feel approachable. Use ₹ examples that resonate with Indian investors."
    ),
    "competitive_comparison": (
        "Highlight specific advantages over existing brokers/platforms. "
        "Focus on cost savings with concrete numbers. Use comparison tables mentally."
    ),
    "roi_calculator_approach": (
        "Lead with ROI calculations. Show exact savings/returns with specific numbers. "
        "Use monthly and yearly projections. Make the math feel personal."
    ),
    "future_pacing_fomo": (
        "Create urgency by painting a picture of what they'll miss. "
        "Be respectful of their time but hook them with a compelling value prop."
    ),
    "direct_close_soft_ask": (
        "User is ready! Transition to closing. Mention connecting with a senior advisor. "
        "Make it feel like a VIP experience, not a hard sell."
    ),
    "social_proof_authority": (
        "Build credibility with social proof — user counts, returns data, expert endorsements. "
        "Address trust concerns head-on with transparency."
    ),
    "pattern_interrupt": (
        "Break the user's dismissal pattern with a surprising value proposition. "
        "Use a time-bound commitment technique (e.g., '90 seconds')."
    ),
    "data_driven_proof": (
        "For analytical personas — show performance data, backtesting results, "
        "and specific market insights. Be technical but accessible."
    ),
    "consultative_approach": (
        "Ask thoughtful questions. Listen more than you pitch. "
        "Position yourself as a knowledgeable advisor, not a salesperson."
    ),
}


class LLMProvider:
    """
    Unified LLM interface — auto-selects between OpenAI and Google Gemini.
    Falls back to template-based responses when no API key is available.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._client = None
        self._provider_type: Optional[str] = None

    async def _ensure_client(self) -> None:
        if self._client is not None:
            return

        if self._settings.LLM_PROVIDER == "openai" and self._settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self._settings.OPENAI_API_KEY)
                self._provider_type = "openai"
                logger.info("LLM provider: OpenAI initialized")
                return
            except ImportError:
                logger.warning("openai package not installed")

        if self._settings.GOOGLE_API_KEY:
            try:
                from google import genai
                self._client = genai.Client(api_key=self._settings.GOOGLE_API_KEY)
                self._provider_type = "google"
                logger.info("LLM provider: Google Gemini initialized")
                return
            except ImportError:
                logger.warning("google-genai package not installed")

        logger.warning("No LLM provider available — using template fallback")
        self._provider_type = "fallback"

    def _build_system_prompt(self, state: ConversationState) -> str:
        strategy_inst = STRATEGY_INSTRUCTIONS.get(
            state.strategy,
            "Be helpful, warm, and consultative."
        )
        return SYSTEM_PROMPT.format(
            persona=state.persona.value,
            intent=state.intent.value,
            trust_score=state.trust_score,
            engagement_score=state.engagement_score,
            strategy=state.strategy,
            strategy_reason=state.strategy_reason,
            stage=state.conversation_stage.value,
            objection=state.objection or "None",
            memory_facts=", ".join(state.memory_facts) if state.memory_facts else "None yet",
            language=state.language.value,
            strategy_instructions=strategy_inst,
        )

    def _build_messages(
        self,
        system_prompt: str,
        history: List[ChatMessage],
        user_text: str,
    ) -> List[Dict]:
        """Build message list for the LLM."""
        messages = [{"role": "system", "content": system_prompt}]

        # Include last 10 messages for context
        for msg in history[-10:]:
            role = "assistant" if msg.role == "ai" else "user"
            messages.append({"role": role, "content": msg.text})

        messages.append({"role": "user", "content": user_text})
        return messages

    async def generate(
        self,
        user_text: str,
        state: ConversationState,
        history: List[ChatMessage],
    ) -> str:
        """
        Generate an AI response given user text, current state, and history.
        """
        await self._ensure_client()

        system_prompt = self._build_system_prompt(state)
        messages = self._build_messages(system_prompt, history, user_text)

        try:
            if self._provider_type == "openai":
                return await self._generate_openai(messages)
            elif self._provider_type == "google":
                return await self._generate_google(system_prompt, history, user_text)
        except Exception as e:
            logger.error(f"LLM generation error ({self._provider_type}): {e}")
            # Fall back to template
            return self._generate_fallback(user_text, state)

        return self._generate_fallback(user_text, state)

    async def generate_stream(
        self,
        user_text: str,
        state: ConversationState,
        history: List[ChatMessage],
    ) -> AsyncGenerator[str, None]:
        """
        Stream AI response token by token for real-time WebSocket delivery.
        """
        await self._ensure_client()

        system_prompt = self._build_system_prompt(state)
        messages = self._build_messages(system_prompt, history, user_text)

        try:
            if self._provider_type == "openai":
                async for token in self._stream_openai(messages):
                    yield token
            elif self._provider_type == "google":
                async for token in self._stream_google(system_prompt, history, user_text):
                    yield token
            else:
                raise ValueError("No provider")
        except Exception as e:
            logger.error(f"LLM streaming error ({self._provider_type}): {e}")
            # Fallback: stream entire response token-by-token
            response = self._generate_fallback(user_text, state)
            for char in response:
                yield char
                if char in " .!?,":
                    await asyncio.sleep(0.02) # Small delay for realism
                else:
                    await asyncio.sleep(0.005)

    # ── OpenAI ───────────────────────────────────────────

    async def _generate_openai(self, messages: List[Dict]) -> str:
        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()

    async def _stream_openai(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        stream = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=300,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    # ── Google Gemini ────────────────────────────────────

    async def _generate_google(
        self,
        system_prompt: str,
        history: List[ChatMessage],
        user_text: str,
    ) -> str:
        from google.genai import types

        # Build contents for Gemini
        contents = []
        for msg in history[-10:]:
            role = "model" if msg.role == "ai" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.text)]))
        contents.append(types.Content(role="user", parts=[types.Part(text=user_text)]))

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    max_output_tokens=300,
                ),
            ),
        )
        return response.text.strip()

    async def _stream_google(
        self,
        system_prompt: str,
        history: List[ChatMessage],
        user_text: str,
    ) -> AsyncGenerator[str, None]:
        from google.genai import types

        contents = []
        for msg in history[-10:]:
            role = "model" if msg.role == "ai" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg.text)]))
        contents.append(types.Content(role="user", parts=[types.Part(text=user_text)]))

        loop = asyncio.get_event_loop()
        response_stream = await loop.run_in_executor(
            None,
            lambda: self._client.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    max_output_tokens=300,
                ),
            ),
        )

        for chunk in response_stream:
            if chunk.text:
                yield chunk.text

    # ── Fallback (no API key) ────────────────────────────

    def _generate_fallback(self, user_text: str, state: ConversationState) -> str:
        """Template-based response when no LLM is available."""
        text_lower = user_text.lower()

        if state.intent.value == "hot":
            return (
                "Shandar! 🔥 Aapka josh dekh ke bohot accha lag raha hai. "
                "Main abhi aapke liye ek personalized plan ready karta hoon. "
                "Humare senior advisor aapse connect honge — bilkul free mein! 🎯"
            )

        if state.objection == "price":
            return (
                "Sir, fees ki baat karun toh — aap current platform pe jo pay karte ho, "
                "uska comparison dekhiye. Humare platform pe almost 80% saving hoti hai. "
                "Matlab ek saal mein ₹50,000+ ki saving easy. 📊"
            )

        if state.objection == "timing":
            return (
                "Bilkul sir, aapka time valuable hai 🙏 "
                "Sirf 60 seconds — hum ek special program laye hain jo aapki growth "
                "40% tak boost kar sakta hai bina extra effort ke."
            )

        if "?" in text_lower or any(w in text_lower for w in ["kya", "kaise", "kitna"]):
            return (
                "Bahut accha sawaal! 💡 Dekhiye, ye samajhna zaroori hai. "
                "Main aapko simple example se samjhata hoon — "
                "agar aap monthly ₹5,000 invest karo toh 10 saal mein ye ₹12 lakh+ ban sakta hai. "
                "Kya aap iske baare mein aur jaanna chahenge?"
            )

        return (
            "Main aapki baat samajh raha hoon 🙏 "
            "Aap ek bahut accha point uthaye hain. "
            "Batayiye, aapka primary goal kya hai investing mein? 🎯"
        )


# ── Singleton ────────────────────────────────────────────

_provider: Optional[LLMProvider] = None


def get_llm_provider() -> LLMProvider:
    global _provider
    if _provider is None:
        _provider = LLMProvider()
    return _provider
