"""
Chat REST API — text-based conversation endpoints.

POST /api/chat          — Send text, get AI response + state
GET  /api/chat/{id}     — Get message history for a session
DELETE /api/chat/{id}   — Clear a session
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.conversation import get_conversation_handler
from app.engine.session_manager import get_session_manager
from app.models import (
    ChatMessage,
    ConversationState,
    StateResponse,
    TextRequest,
    TextResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/", response_model=TextResponse)
async def send_message(req: TextRequest):
    """
    Send a user message and receive an AI response with updated state.

    The session is auto-created if `session_id` is not provided.
    """
    handler = get_conversation_handler()

    try:
        response = await handler.handle_text(
            session_id=req.session_id,
            user_text=req.text,
            language=req.language,
        )
        return response
    except Exception as e:
        logger.error("Chat error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/messages")
async def get_messages(session_id: str, limit: int = 50):
    """Retrieve the message history for a session."""
    sessions = get_session_manager()
    messages = await sessions.get_messages(session_id, limit)

    if not messages:
        session = await sessions.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "messages": [m.model_dump(mode="json") for m in messages],
        "count": len(messages),
    }


@router.get("/{session_id}/state", response_model=StateResponse)
async def get_state(session_id: str):
    """Get the current AI brain state for a session."""
    sessions = get_session_manager()
    state = await sessions.get_state(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return StateResponse(session_id=session_id, state=state)


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a conversation session."""
    sessions = get_session_manager()
    deleted = await sessions.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "deleted", "session_id": session_id}
