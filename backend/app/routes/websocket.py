"""
WebSocket endpoint — Real-time bidirectional communication.

ws://localhost:8000/ws/{session_id}

Supports:
  - Text messages (JSON frames)
  - Audio streaming (binary frames → STT → AI → TTS → binary frames)
  - Real-time state updates
  - Thinking step streaming
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.conversation import get_conversation_handler
from app.engine.session_manager import get_session_manager
from app.models import Language, WSFrame

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

# Track active connections for broadcasting
_active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Real-time conversation WebSocket.

    ## Incoming JSON frames:
    ```json
    {"event": "user_text", "payload": {"text": "...", "language": "hinglish"}}
    {"event": "ping"}
    ```

    ## Incoming binary frames:
    Raw audio bytes (PCM16 or WebM) for STT processing.

    ## Outgoing JSON frames:
    ```json
    {"event": "session", "payload": {"session_id": "..."}}
    {"event": "thinking", "payload": {"step": "..."}}
    {"event": "state_update", "payload": {"state": {...}}}
    {"event": "ai_token", "payload": {"token": "..."}}
    {"event": "ai_complete", "payload": {"text": "..."}}
    {"event": "stt_result", "payload": {"text": "...", "language": "...", "confidence": 0.95}}
    {"event": "tts_complete", "payload": {}}
    {"event": "error", "payload": {"detail": "..."}}
    {"event": "pong"}
    ```

    ## Outgoing binary frames:
    TTS audio chunks (WAV).
    """
    await websocket.accept()

    # Register connection
    if session_id not in _active_connections:
        _active_connections[session_id] = []
    _active_connections[session_id].append(websocket)

    # Ensure session exists
    sessions = get_session_manager()
    session = await sessions.get_or_create(session_id)
    actual_sid = session.session_id

    # Send session confirmation
    await _send_json(websocket, "session", {"session_id": actual_sid})

    # Send current state
    await _send_json(websocket, "state_update", {
        "state": session.state.model_dump(mode="json", by_alias=True),
    })

    handler = get_conversation_handler()
    audio_buffer: list[bytes] = []

    try:
        while True:
            message = await websocket.receive()
            logger.debug("Received message: %s", message.get("type"))

            if "text" in message:
                # ── JSON frame ──
                await _handle_text_frame(
                    websocket, message["text"], actual_sid, handler
                )

            elif "bytes" in message:
                # ── Binary frame (audio) ──
                await _handle_audio_frame(
                    websocket, message["bytes"], actual_sid, handler, audio_buffer
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected gracefully: session=%s", actual_sid)
    except Exception as e:
        logger.exception("WebSocket error: %s", e)
        try:
            await _send_json(websocket, "error", {"detail": str(e)})
        except:
            pass
    finally:
        # Cleanup
        if session_id in _active_connections:
            conns = _active_connections[session_id]
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                del _active_connections[session_id]


async def _handle_text_frame(
    ws: WebSocket,
    raw: str,
    session_id: str,
    handler,
):
    """Process an incoming JSON text frame."""
    try:
        frame = json.loads(raw)
    except json.JSONDecodeError:
        await _send_json(ws, "error", {"detail": "Invalid JSON"})
        return

    event = frame.get("event", "")
    payload = frame.get("payload", {})

    if event == "ping":
        await _send_json(ws, "pong", {})
        return

    if event == "user_text":
        text = payload.get("text", "").strip()
        if not text:
            await _send_json(ws, "error", {"detail": "Empty text"})
            return

        language = Language(payload.get("language", "hinglish"))

        # Stream the full pipeline
        async for evt in handler.handle_text_stream(session_id, text, language):
            event_type = evt.get("event", "")

            if event_type == "tts_chunk":
                # Send binary audio frames
                await ws.send_bytes(evt["audio"])
            else:
                await _send_json(ws, event_type, evt)

    elif event == "start_scenario":
        scenario_id = payload.get("scenario_id", "hot")
        async for evt in handler.handle_scenario_start(session_id, scenario_id):
            event_type = evt.get("event", "")
            if event_type == "tts_chunk":
                await ws.send_bytes(evt["audio"])
            else:
                await _send_json(ws, event_type, evt)

    else:
        await _send_json(ws, "error", {"detail": f"Unknown event: {event}"})


async def _handle_audio_frame(
    ws: WebSocket,
    audio_bytes: bytes,
    session_id: str,
    handler,
    audio_buffer: list[bytes],
):
    """
    Process an incoming binary audio frame.

    Audio accumulates in `audio_buffer`. When a silence marker (empty bytes)
    or a special end-of-audio signal is received, transcription begins.
    """
    if len(audio_bytes) == 0:
        # Empty frame = end-of-audio signal → process buffer
        if not audio_buffer:
            return

        full_audio = b"".join(audio_buffer)
        audio_buffer.clear()

        # Stream the full voice pipeline
        async for evt in handler.handle_voice_stream(session_id, full_audio):
            event_type = evt.get("event", "")

            if event_type == "tts_chunk":
                await ws.send_bytes(evt["audio"])
            else:
                await _send_json(ws, event_type, evt)
    else:
        # Accumulate audio chunks
        audio_buffer.append(audio_bytes)


async def _send_json(ws: WebSocket, event: str, payload: dict):
    """
    Send a JSON frame to the WebSocket.
    Avoids double-nesting if payload already contains the target structure.
    """
    try:
        # If payload already has the event key, it's a pre-built frame
        if "event" in payload and payload["event"] == event:
            # Check if it has a 'payload' or 'data' key to unwrap if necessary
            # For simplicity, we assume the handler yields the inner payload directly
            # OR the handler yields the full frame.
            # Let's standardize: handlers yield the full frame.
            await ws.send_json(payload)
        else:
            await ws.send_json({"event": event, "payload": payload})
    except Exception:
        pass  # Connection may have closed


# ── Broadcasting utility ─────────────────────────────────

async def broadcast_to_session(session_id: str, event: str, payload: dict):
    """Broadcast an event to all WebSocket connections for a session."""
    connections = _active_connections.get(session_id, [])
    for ws in connections:
        await _send_json(ws, event, payload)
