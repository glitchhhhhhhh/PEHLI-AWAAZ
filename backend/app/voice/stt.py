"""
Speech-to-Text processor using OpenAI Whisper (local model).

Supports:
  - File upload transcription (WAV, MP3, WebM, OGG)
  - Streaming chunks via WebSocket (accumulate → transcribe)
  - Auto language detection (Hindi / English / Hinglish)

In production, swap to Whisper API or Deepgram/AssemblyAI for lower latency.
"""

from __future__ import annotations

import asyncio
import io
import logging
import tempfile
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.models import Language

logger = logging.getLogger(__name__)


class STTProcessor:
    """Lazy-loaded Whisper model for speech-to-text."""

    def __init__(self) -> None:
        self._model = None
        self._settings = get_settings()
        self._lock = asyncio.Lock()

    async def _ensure_model(self) -> None:
        """Load the Whisper model on first use (heavy, so lazy)."""
        if self._model is not None:
            return

        async with self._lock:
            if self._model is not None:
                return
            logger.info("Loading Whisper model: %s", self._settings.STT_MODEL)
            # Run in executor to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            self._model = await loop.run_in_executor(
                None, self._load_model
            )
            logger.info("Whisper model loaded successfully")

    def _load_model(self):
        """Synchronous model loading."""
        try:
            import whisper
            return whisper.load_model(self._settings.STT_MODEL)
        except ImportError:
            logger.warning(
                "OpenAI Whisper not installed. STT will use fallback mode. "
                "Install with: pip install openai-whisper"
            )
            return None
        except Exception as e:
            logger.error("Failed to load Whisper model: %s", e)
            return None

    async def transcribe_file(self, audio_bytes: bytes, filename: str = "audio.wav") -> dict:
        """
        Transcribe an uploaded audio file.
        Uses Deepgram if API key is available, else falls back to Whisper.
        """
        if self._settings.DEEPGRAM_API_KEY:
            try:
                return await self._transcribe_deepgram(audio_bytes)
            except Exception as e:
                logger.error(f"Deepgram STT failed: {e}. Falling back to Whisper.")

        await self._ensure_model()

        if self._model is None:
            return self._fallback_result()

        # Write to temp file (Whisper needs a file path)
        suffix = Path(filename).suffix or ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self._model.transcribe(
                    tmp_path,
                    language=None,  # Auto-detect
                    task="transcribe",
                    fp16=False,
                ),
            )
        finally:
            Path(tmp_path).unlink(missing_ok=True)

        detected_lang = result.get("language", "en")
        language = self._map_language(detected_lang)

        return {
            "text": result["text"].strip(),
            "language": language,
            "confidence": self._avg_confidence(result.get("segments", [])),
            "segments": [
                {
                    "start": s["start"],
                    "end": s["end"],
                    "text": s["text"],
                }
                for s in result.get("segments", [])
            ],
        }

    async def _transcribe_deepgram(self, audio_bytes: bytes) -> dict:
        """Transcribe via Deepgram API."""
        import httpx
        url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=hi&language=en"
        headers = {
            "Authorization": f"Token {self._settings.DEEPGRAM_API_KEY}",
            "Content-Type": "audio/wav"
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, content=audio_bytes)
            response.raise_for_status()
            data = response.json()
            
            transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
            confidence = data["results"]["channels"][0]["alternatives"][0]["confidence"]
            
            # Simple language detection from deepgram result if possible, or default to Hinglish
            return {
                "text": transcript,
                "language": Language.HINGLISH,
                "confidence": confidence,
                "segments": []
            }

    async def transcribe_chunks(self, chunks: list[bytes], sample_rate: int = 16000) -> dict:
        """
        Transcribe accumulated audio chunks (from WebSocket streaming).

        Args:
            chunks: List of raw PCM16 audio byte buffers.
            sample_rate: Sample rate of the audio.

        Returns:
            Same format as transcribe_file.
        """
        await self._ensure_model()

        if self._model is None:
            return self._fallback_result()

        # Concatenate chunks into single numpy array
        audio_data = b"".join(chunks)
        import numpy as np
        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._model.transcribe(
                audio_np,
                language=None,
                task="transcribe",
                fp16=False,
            ),
        )

        detected_lang = result.get("language", "en")
        language = self._map_language(detected_lang)

        return {
            "text": result["text"].strip(),
            "language": language,
            "confidence": self._avg_confidence(result.get("segments", [])),
            "segments": [],
        }

    def _map_language(self, whisper_lang: str) -> Language:
        """Map Whisper's language code to our Language enum."""
        if whisper_lang == "hi":
            return Language.HINDI
        elif whisper_lang == "en":
            return Language.ENGLISH
        # Whisper doesn't detect "Hinglish" — we'll refine this with the state engine
        return Language.HINGLISH

    def _avg_confidence(self, segments: list) -> float:
        """Compute average confidence across segments."""
        if not segments:
            return 0.0
        probs = [s.get("avg_logprob", -1.0) for s in segments]
        # Convert log probs to rough confidence (0–1)
        import math
        confidences = [math.exp(p) for p in probs if p > -10]
        return sum(confidences) / len(confidences) if confidences else 0.5

    def _fallback_result(self) -> dict:
        """Fallback when Whisper is not available."""
        return {
            "text": "[STT unavailable — Whisper model not loaded]",
            "language": Language.HINGLISH,
            "confidence": 0.0,
            "segments": [],
        }


# ── Singleton ────────────────────────────────────────────

_processor: Optional[STTProcessor] = None


def get_stt_processor() -> STTProcessor:
    global _processor
    if _processor is None:
        _processor = STTProcessor()
    return _processor
