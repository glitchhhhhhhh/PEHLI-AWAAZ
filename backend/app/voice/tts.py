"""
Text-to-Speech processor using Coqui TTS (local model).

Supports:
  - Text → WAV byte buffer
  - Text → streaming audio chunks (for WebSocket)
  - Configurable voice model

In production, swap to Google Cloud TTS, Azure TTS, or ElevenLabs for
multilingual (Hindi + English) support.
"""

from __future__ import annotations

import asyncio
import io
import logging
import tempfile
from pathlib import Path
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


class TTSProcessor:
    """Lazy-loaded Coqui TTS model for text-to-speech synthesis."""

    def __init__(self) -> None:
        self._tts = None
        self._settings = get_settings()
        self._lock = asyncio.Lock()

    async def _ensure_model(self) -> None:
        """Load the TTS model on first use."""
        if self._tts is not None:
            return

        async with self._lock:
            if self._tts is not None:
                return
            logger.info("Loading TTS model: %s", self._settings.TTS_MODEL)
            loop = asyncio.get_event_loop()
            self._tts = await loop.run_in_executor(None, self._load_model)
            logger.info("TTS model loaded successfully")

    def _load_model(self):
        """Synchronous TTS model loading."""
        try:
            from TTS.api import TTS as CoquiTTS
            tts = CoquiTTS(model_name=self._settings.TTS_MODEL, progress_bar=False)
            return tts
        except ImportError:
            logger.warning(
                "Coqui TTS not installed. TTS will use fallback mode. "
                "Install with: pip install TTS"
            )
            return None
        except Exception as e:
            logger.error("Failed to load TTS model: %s", e)
            return None

    async def synthesize(self, text: str) -> Optional[bytes]:
        """
        Convert text to speech and return WAV bytes.
        Uses ElevenLabs if API key is available, else falls back to Coqui.
        """
        if self._settings.ELEVENLABS_API_KEY:
            try:
                # Extract voice settings from metadata if provided
                v_settings = {}
                if isinstance(text, dict):
                    v_settings = text.get("voice_style", {})
                    text = text.get("text", "")
                
                return await self._synthesize_elevenlabs(text, v_settings)
            except Exception as e:
                logger.error(f"ElevenLabs TTS failed: {e}. Falling back to local model.")

        await self._ensure_model()

        if self._tts is None:
            return self._fallback_audio(text)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._tts.tts_to_file(
                    text=text,
                    file_path=tmp_path,
                ),
            )
            return Path(tmp_path).read_bytes()
        except Exception as e:
            logger.error("TTS synthesis failed: %s", e)
            return None
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    async def _synthesize_elevenlabs(self, text: str, voice_style: dict = None) -> Optional[bytes]:
        """Synthesize via ElevenLabs API."""
        import httpx
        voice_id = self._settings.ELEVENLABS_VOICE_ID
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": self._settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Map voice_style to ElevenLabs settings
        # Default settings
        stability = 0.5
        similarity_boost = 0.75
        style = 0.0
        
        if voice_style:
            pacing = voice_style.get("pacing", "normal")
            tone = voice_style.get("tone", "neutral")
            
            if tone == "enthusiastic":
                stability = 0.4
                similarity_boost = 0.85
                style = 0.5
            elif tone == "calm":
                stability = 0.7
                similarity_boost = 0.6
            elif tone == "persuasive":
                stability = 0.5
                similarity_boost = 0.9
                style = 0.3
            elif tone == "business-focused":
                stability = 0.8
                similarity_boost = 0.5
        
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "use_speaker_boost": True
            }
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            return response.content

    async def synthesize_streaming(self, text: str, chunk_size: int = 4096):
        """
        Generator that yields audio chunks for WebSocket streaming.

        Args:
            text: The text to synthesize.
            chunk_size: Size of each audio chunk in bytes.

        Yields:
            bytes: Audio chunks.
        """
        audio_bytes = await self.synthesize(text)
        if audio_bytes is None:
            return

        # Yield WAV header + data in chunks
        offset = 0
        while offset < len(audio_bytes):
            yield audio_bytes[offset : offset + chunk_size]
            offset += chunk_size
            # Small yield to prevent blocking
            await asyncio.sleep(0)

    def _fallback_audio(self, text: str) -> Optional[bytes]:
        """
        Generate a minimal silent WAV as fallback when TTS is unavailable.
        This allows the pipeline to continue functioning for testing.
        """
        try:
            import struct
            # Minimal WAV: 1 second of silence at 16kHz, 16-bit mono
            sample_rate = self._settings.VOICE_SAMPLE_RATE
            duration = 1  # seconds
            num_samples = sample_rate * duration
            data_size = num_samples * 2  # 16-bit = 2 bytes/sample

            wav = io.BytesIO()
            # RIFF header
            wav.write(b"RIFF")
            wav.write(struct.pack("<I", 36 + data_size))
            wav.write(b"WAVE")
            # fmt chunk
            wav.write(b"fmt ")
            wav.write(struct.pack("<I", 16))       # chunk size
            wav.write(struct.pack("<H", 1))        # PCM
            wav.write(struct.pack("<H", 1))        # mono
            wav.write(struct.pack("<I", sample_rate))
            wav.write(struct.pack("<I", sample_rate * 2))
            wav.write(struct.pack("<H", 2))        # block align
            wav.write(struct.pack("<H", 16))       # bits per sample
            # data chunk
            wav.write(b"data")
            wav.write(struct.pack("<I", data_size))
            wav.write(b"\x00" * data_size)

            logger.warning("TTS unavailable — returning silent WAV fallback")
            return wav.getvalue()
        except Exception:
            return None


# ── Singleton ────────────────────────────────────────────

_processor: Optional[TTSProcessor] = None


def get_tts_processor() -> TTSProcessor:
    global _processor
    if _processor is None:
        _processor = TTSProcessor()
    return _processor
