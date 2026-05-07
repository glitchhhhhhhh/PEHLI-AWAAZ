"""
Voice REST API — audio upload endpoints.

POST /api/voice/upload    — Upload audio file, get transcript + AI response + audio
POST /api/voice/tts       — Convert text to speech (utility)
"""

from __future__ import annotations

import base64
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.conversation import get_conversation_handler
from app.models import Language, VoiceUploadResponse
from app.voice.stt import get_stt_processor
from app.voice.tts import get_tts_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice"])


@router.post("/upload", response_model=VoiceUploadResponse)
async def upload_voice(
    audio: UploadFile = File(..., description="Audio file (WAV, MP3, WebM, OGG)"),
    session_id: str = Form(default="", description="Session ID (auto-created if empty)"),
):
    """
    Upload an audio file for STT → AI → TTS pipeline.

    Returns the transcript, AI response text, state update,
    and optionally a base64-encoded audio response URL.
    """
    # Read audio bytes
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    if len(audio_bytes) > 25 * 1024 * 1024:  # 25MB limit
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    handler = get_conversation_handler()
    sid = session_id if session_id else None

    try:
        # First: STT to get the user's actual transcript
        stt = get_stt_processor()
        stt_result = await stt.transcribe_file(
            audio_bytes, audio.filename or "audio.wav"
        )
        user_transcript = stt_result["text"]
        detected_language = stt_result["language"]

        logger.info(
            "STT result: '%s' (lang=%s, conf=%.2f)",
            user_transcript,
            detected_language.value,
            stt_result["confidence"],
        )

        # Then: run the text pipeline with the transcript
        text_response = await handler.handle_text(
            session_id=sid,
            user_text=user_transcript,
            language=detected_language,
        )

        # Finally: TTS on the AI reply
        tts = get_tts_processor()
        audio_out = await tts.synthesize(text_response.ai_reply)
    except Exception as e:
        logger.error("Voice pipeline error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    # Encode audio response as base64 data URL
    audio_url = None
    if audio_out:
        b64 = base64.b64encode(audio_out).decode("ascii")
        audio_url = f"data:audio/wav;base64,{b64}"

    return VoiceUploadResponse(
        session_id=text_response.session_id,
        transcript=user_transcript,
        language=detected_language,
        ai_reply=text_response.ai_reply,
        state=text_response.state,
        audio_url=audio_url,
    )


@router.post("/tts")
async def text_to_speech(
    text: str = Form(..., description="Text to synthesize"),
):
    """
    Utility endpoint: convert text to speech audio (WAV).
    Returns raw WAV bytes.
    """
    tts = get_tts_processor()

    try:
        audio_bytes = await tts.synthesize(text)
    except Exception as e:
        logger.error("TTS error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    if audio_bytes is None:
        raise HTTPException(status_code=503, detail="TTS service unavailable")

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": 'inline; filename="response.wav"'},
    )
