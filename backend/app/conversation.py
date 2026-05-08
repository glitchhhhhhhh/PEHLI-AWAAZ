"""
Conversation Handler — Orchestrates the full conversation pipeline.

    user text/audio → STT → LLM → State Engine → TTS → response

This is the single entry point that the API routes call.
"""

from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator, Dict, List, Optional, Tuple

from app.engine.session_manager import get_session_manager
from app.engine.state_engine import get_state_engine
from app.llm.provider import get_llm_provider
from app.models import ChatMessage, ConversationState, Language, TextResponse
# Voice processors imported lazily to avoid startup crash when ML deps missing

logger = logging.getLogger(__name__)


class ConversationHandler:
    """
    Stateless orchestrator — each method takes a session_id and performs
    the full pipeline, updating the session store as a side-effect.
    """

    def __init__(self) -> None:
        self._sessions = get_session_manager()
        self._state_engine = get_state_engine()
        self._llm = get_llm_provider()
        self._stt = None
        self._tts = None

    @property
    def stt(self):
        if self._stt is None:
            from app.voice.stt import get_stt_processor
            self._stt = get_stt_processor()
        return self._stt

    @property
    def tts(self):
        if self._tts is None:
            from app.voice.tts import get_tts_processor
            self._tts = get_tts_processor()
        return self._tts

    async def handle_text(
        self,
        session_id: Optional[str],
        user_text: str,
        language: Language = Language.HINGLISH,
    ) -> TextResponse:
        """
        Full text pipeline:
        1. Get/create session
        2. Add user message
        3. Generate AI response via LLM (JSON format)
        4. Parse response and metadata
        5. Compute state transition (merging LLM metadata)
        6. Store everything
        7. Return response + state
        """
        # 1. Session
        session = await self._sessions.get_or_create(session_id)
        sid = session.session_id

        # 2. Add user message
        user_msg = ChatMessage(role="user", text=user_text, language=language)
        await self._sessions.add_message(sid, user_msg)

        # 3. Get history for context
        history = await self._sessions.get_messages(sid)
        current_state = session.state

        # 4. Generate AI response
        raw_ai_response = await self._llm.generate(user_text, current_state, history)
        
        # Parse JSON response
        spoken_response = raw_ai_response
        llm_metadata = {}
        try:
            import json
            # Handle possible markdown blocks
            clean_json = raw_ai_response.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif clean_json.startswith("```"):
                clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
            data = json.loads(clean_json)
            spoken_response = data.get("spoken_response", raw_ai_response)
            llm_metadata = data.get("metadata", {})
        except Exception as e:
            logger.warning(f"Failed to parse LLM JSON: {e}. Raw: {raw_ai_response[:100]}...")

        # 5. Compute state transition
        turn_number = len([m for m in history if m.role == "user"])
        new_state, thinking_steps = self._state_engine.compute_next_state(
            current=current_state,
            user_message=user_text,
            ai_response=spoken_response,
            turn_number=turn_number,
        )

        # 6. Merge LLM metadata into state if available
        if llm_metadata:
            if "intent_score" in llm_metadata:
                score = float(llm_metadata["intent_score"])
                new_state.intent_score = score
                if score >= 7.5: new_state.intent = "hot"
                elif score >= 4.0: new_state.intent = "warm"
                else: new_state.intent = "cold"
            
            if "trust_score" in llm_metadata:
                new_state.trust_score = float(llm_metadata["trust_score"])
            
            if "persona" in llm_metadata:
                p = llm_metadata["persona"].lower()
                valid_personas = [v.value for v in Persona]
                if p in valid_personas:
                    new_state.persona = Persona(p)
            
            if "secondary_persona" in llm_metadata:
                sp = llm_metadata["secondary_persona"].lower()
                if sp in [v.value for v in Persona]:
                    new_state.secondary_persona = Persona(sp)
            
            if "persona_confidence" in llm_metadata:
                new_state.persona_confidence = float(llm_metadata["persona_confidence"])

            if "lead_category" in llm_metadata:
                new_state.lead_category = llm_metadata["lead_category"]
            
            if "communication_style" in llm_metadata:
                new_state.communication_style = llm_metadata["communication_style"]

            if "emotion" in llm_metadata:
                new_state.emotion = llm_metadata["emotion"]
            
            if "ai_confidence" in llm_metadata:
                new_state.ai_confidence = float(llm_metadata["ai_confidence"])
            
            if "conversion_probability" in llm_metadata:
                new_state.conversion_probability = float(llm_metadata["conversion_probability"])
            
            if "voice_style" in llm_metadata:
                # We can store this in ChatMessage metadata for the TTS to use
                pass

        # 7. Store AI message + updated state
        ai_msg = ChatMessage(role="ai", text=spoken_response, language=new_state.language)
        await self._sessions.add_message(sid, ai_msg)
        await self._sessions.update_state(sid, new_state)

        return TextResponse(
            session_id=sid,
            ai_reply=spoken_response,
            state=new_state,
            thinking_steps=thinking_steps,
        )

    async def handle_text_stream(
        self,
        session_id: Optional[str],
        user_text: str,
        language: Language = Language.HINGLISH,
    ) -> AsyncGenerator[Dict, None]:
        """
        Streaming text pipeline for WebSocket:
        Yields events as they happen for real-time UI updates.
        Now handles JSON-formatted LLM responses by extracting the spoken part.
        """
        # 1. Session
        session = await self._sessions.get_or_create(session_id)
        sid = session.session_id
        yield {"event": "session", "payload": {"session_id": sid}}

        # 2. Add user message
        user_msg = ChatMessage(role="user", text=user_text, language=language)
        await self._sessions.add_message(sid, user_msg)

        # 3. Get context
        history = await self._sessions.get_messages(sid)
        current_state = session.state

        # 4. Compute initial state (to inform the LLM)
        turn_number = len([m for m in history if m.role == "user"])
        new_state, thinking_steps = self._state_engine.compute_next_state(
            current=current_state,
            user_message=user_text,
            ai_response="",
            turn_number=turn_number,
        )

        # 5. Stream thinking steps
        for step in thinking_steps:
            yield {"event": "thinking", "payload": {"step": step}}
            await asyncio.sleep(0.1)

        # 6. Emit initial state update
        yield {"event": "state_update", "payload": {"state": new_state.model_dump(mode="json", by_alias=True)}}

        # 7. Stream AI response tokens
        full_raw_response = ""
        spoken_buffer = ""
        llm_metadata = {}
        
        # We use a state machine approach to extract "spoken_response" content
        in_spoken_response = False
        is_json_response = None  # None: undetermined, True: JSON, False: Plain text
        
        async for token in self._llm.generate_stream(user_text, new_state, history):
            full_raw_response += token
            
            # Determine if it's JSON or plain text based on the first few characters
            if is_json_response is None:
                stripped = full_raw_response.strip()
                if stripped:
                    if stripped.startswith('{') or stripped.startswith('```'):
                        is_json_response = True
                        logger.debug("Detected JSON-formatted response stream")
                    else:
                        is_json_response = False
                        logger.debug("Detected plain-text response stream")
            
            if is_json_response is False:
                # Direct streaming for plain text
                yield {"event": "ai_token", "payload": {"token": token}}
                spoken_buffer += token
            else:
                # Heuristic for JSON extraction
                if not in_spoken_response:
                    if '"spoken_response"' in full_raw_response:
                        search_area = full_raw_response.split('"spoken_response"', 1)[1]
                        if ':' in search_area:
                            value_part = search_area.split(':', 1)[1].lstrip()
                            if value_part.startswith('"'):
                                in_spoken_response = True
                                current_content = value_part[1:]
                                if current_content:
                                    yield {"event": "ai_token", "payload": {"token": current_content}}
                                    spoken_buffer += current_content
                else:
                    # Inside the spoken response. Stop at unescaped "
                    if token == '"' and not spoken_buffer.endswith('\\'):
                        in_spoken_response = False
                        # Once spoken response is done, we might have metadata coming
                    else:
                        yield {"event": "ai_token", "payload": {"token": token}}
                        spoken_buffer += token

        # Final Fallback & Metadata Extraction
        try:
            import json
            # Handle possible markdown blocks
            clean_json = full_raw_response.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
            # Find the actual JSON object if there's surrounding text
            if "{" in clean_json and "}" in clean_json:
                start = clean_json.find("{")
                end = clean_json.rfind("}") + 1
                clean_json = clean_json[start:end]
            
            data = json.loads(clean_json)
            if not spoken_buffer:
                spoken_buffer = data.get("spoken_response", full_raw_response)
            llm_metadata = data.get("metadata", {})
        except Exception as e:
            if not spoken_buffer:
                spoken_buffer = full_raw_response
            logger.warning(f"Metadata extraction failed: {e}")

        # 8. Apply metadata to state and Emit Final Update
        if llm_metadata:
            # Update state properties based on LLM metadata
            if "intent_score" in llm_metadata:
                new_state.intent_score = float(llm_metadata["intent_score"])
                if new_state.intent_score >= 7.5: new_state.intent = Persona.TRADER # Mapping hot to persona
            if "trust_score" in llm_metadata:
                new_state.trust_score = float(llm_metadata["trust_score"])
            if "conversion_probability" in llm_metadata:
                new_state.conversion_probability = float(llm_metadata["conversion_probability"])
            if "ai_confidence" in llm_metadata:
                new_state.ai_confidence = float(llm_metadata["ai_confidence"])
            if "emotion" in llm_metadata:
                new_state.emotion = llm_metadata["emotion"]
            if "lead_category" in llm_metadata:
                new_state.lead_category = llm_metadata["lead_category"]
            if "persona" in llm_metadata:
                try:
                    new_state.persona = Persona(llm_metadata["persona"].lower())
                except: pass

        yield {"event": "ai_complete", "payload": {"text": spoken_buffer}}
        yield {"event": "state_update", "payload": {"state": new_state.model_dump(mode="json", by_alias=True)}}

        # 9. Store results
        ai_msg = ChatMessage(role="ai", text=spoken_buffer, language=new_state.language)
        await self._sessions.add_message(sid, ai_msg)
        await self._sessions.update_state(sid, new_state)

        # 10. Stream TTS
        if spoken_buffer:
            # Prepare voice settings based on metadata or state
            voice_style = llm_metadata.get("voice_style", {"tone": new_state.emotion})
            tts_input = {"text": spoken_buffer, "voice_style": voice_style}
            
            async for chunk in self.tts.synthesize_streaming(tts_input):
                yield {"event": "tts_chunk", "audio": chunk}
            yield {"event": "tts_complete", "payload": {}}

        yield {"event": "done", "payload": {}}

    async def handle_voice(
        self,
        session_id: Optional[str],
        audio_bytes: bytes,
        filename: str = "audio.wav",
    ) -> Tuple[TextResponse, Optional[bytes]]:
        """
        Full voice pipeline:
        1. STT: audio → text
        2. Full text pipeline
        3. TTS: AI response → audio
        4. Return text response + audio bytes
        """
        # 1. STT
        stt_result = await self.stt.transcribe_file(audio_bytes, filename)
        user_text = stt_result["text"]
        language = stt_result["language"]

        logger.info("STT result: '%s' (lang=%s, conf=%.2f)",
                     user_text, language.value, stt_result["confidence"])

        # 2. Text pipeline
        response = await self.handle_text(session_id, user_text, language)

        # 3. TTS
        audio_out = await self.tts.synthesize(response.ai_reply)

        return response, audio_out

    async def handle_voice_stream(
        self,
        session_id: Optional[str],
        audio_bytes: bytes,
        filename: str = "audio.wav",
    ) -> AsyncGenerator[Dict, None]:
        """
        Streaming voice pipeline for WebSocket:

        Events:
          {"event": "stt_result", "text": str, "language": str}
          ... all text_stream events ...
          {"event": "tts_chunk", "audio": bytes}  (binary frame)
          {"event": "tts_complete"}
        """
        # 1. STT
        stt_result = await self.stt.transcribe_file(audio_bytes, filename)
        yield {
            "event": "stt_result",
            "text": stt_result["text"],
            "language": stt_result["language"].value,
            "confidence": stt_result["confidence"],
        }

        # 2. Stream text pipeline
        full_ai_text = ""
        current_voice_style = None
        
        async for event in self.handle_text_stream(
            session_id, stt_result["text"], stt_result["language"]
        ):
            if event["event"] == "ai_complete":
                full_ai_text = event["text"]
            elif event["event"] == "state_update":
                # Check for voice_style in the updated state if needed
                pass
            yield event

        # 3. Stream TTS
        if full_ai_text:
            # We'll use the final state to get the voice style
            session = await self._sessions.get(session_id)
            tts_input = full_ai_text
            # Note: We could have a more sophisticated way to get the style
            # For now, we'll just synthesize the full response
            async for chunk in self.tts.synthesize_streaming(tts_input):
                yield {"event": "tts_chunk", "audio": chunk}
            yield {"event": "tts_complete"}


    async def handle_scenario_start(
        self,
        session_id: str,
        scenario_id: str,
    ) -> AsyncGenerator[Dict, None]:
        """
        Starts a cinematic preset scenario for judging.
        Sets initial state and generates an AI greeting.
        """
        # 1. Get/Create Session
        session = await self._sessions.get_or_create(session_id)
        sid = session.session_id
        
        # 2. Configure State based on Scenario
        state = session.state
        greeting_instruction = ""
        
        if scenario_id == "hot":
            state.intent = IntentLevel.HOT
            state.intent_score = 8.5
            state.trust_score = 0.8
            state.persona = Persona.HIGH_INTENT
            state.lead_class = LeadClass.HOT
            state.emotion = "excited"
            state.conversion_probability = 0.85
            greeting_instruction = "Give a high-energy, confident welcome to a hot lead who is ready to invest."
        
        elif scenario_id == "warm":
            state.intent = IntentLevel.WARM
            state.intent_score = 5.5
            state.trust_score = 0.5
            state.persona = Persona.BEGINNER
            state.lead_class = LeadClass.WARM
            state.emotion = "neutral"
            state.conversion_probability = 0.4
            greeting_instruction = "Give a helpful, reassuring welcome to a warm lead who has some questions."
            
        elif scenario_id == "cold":
            state.intent = IntentLevel.COLD
            state.intent_score = 2.0
            state.trust_score = 0.3
            state.persona = Persona.HESITANT
            state.lead_class = LeadClass.COLD
            state.emotion = "skeptical"
            state.conversion_probability = 0.1
            greeting_instruction = "Give a calm, trust-building welcome to a skeptical cold lead."
            
        elif scenario_id == "multi":
            state.intent = IntentLevel.WARM
            state.language = Language.HINGLISH
            state.persona = Persona.TRADER
            state.emotion = "professional"
            greeting_instruction = "Give a professional greeting in natural mixed Hindi-English (Hinglish)."

        await self._sessions.update_state(sid, state)
        
        # 3. Emit initial state
        yield {"event": "state_update", "payload": {"state": state.model_dump(mode="json", by_alias=True)}}
        
        # 4. Generate AI Greeting
        prompt = f"[SYSTEM: SCENARIO {scenario_id.upper()}] {greeting_instruction}"
        
        # We use handle_text_stream with a special prompt to generate the greeting
        # but since we want it to be a greeting, we pass it as a user message 
        # but we'll mark it as a system-triggered start.
        async for event in self.handle_text_stream(sid, prompt, state.language):
            yield event


# ── Singleton ────────────────────────────────────────────

_handler: Optional[ConversationHandler] = None


def get_conversation_handler() -> ConversationHandler:
    global _handler
    if _handler is None:
        _handler = ConversationHandler()
    return _handler
