"""
Centralised settings — loaded once from .env and cached.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List, Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Server ──────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── LLM ─────────────────────────────────────
    LLM_PROVIDER: Literal["openai", "google"] = "google"
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # ── Voice Pipeline ──────────────────────────
    STT_MODEL: str = "base"
    TTS_MODEL: str = "tts_models/en/ljspeech/tacotron2-DDC"
    VOICE_SAMPLE_RATE: int = 16000
    
    DEEPGRAM_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "pNInz6obpg8nEByWvBy3" # George or similar

    # ── State Engine ────────────────────────────
    LEAD_HOT_THRESHOLD: float = 7.5
    LEAD_WARM_THRESHOLD: float = 4.0

    model_config = {
        "env_file": str(Path(__file__).resolve().parent.parent / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
