"""
Session management REST API.

GET    /api/sessions        — List all active sessions
POST   /api/sessions        — Create a new empty session
DELETE /api/sessions        — Clear all sessions
GET    /api/sessions/{id}   — Get full session details
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.engine.session_manager import get_session_manager

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


@router.get("/")
async def list_sessions():
    """List all active conversation sessions."""
    sessions = get_session_manager()
    items = await sessions.list_sessions()
    return {
        "sessions": [s.model_dump(mode="json") for s in items],
        "total": len(items),
    }


@router.post("/")
async def create_session():
    """Create a new empty conversation session."""
    sessions = get_session_manager()
    session = await sessions.create_session()
    return {
        "session_id": session.session_id,
        "state": session.state.model_dump(mode="json"),
        "created_at": session.created_at.isoformat(),
    }


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get full details of a specific session."""
    sessions = get_session_manager()
    session = await sessions.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session.session_id,
        "messages": [m.model_dump(mode="json") for m in session.messages],
        "state": session.state.model_dump(mode="json"),
        "message_count": len(session.messages),
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


@router.get("/{session_id}/summary")
async def get_session_summary(session_id: str):
    """Generate RM handoff summary for a specific session."""
    sessions = get_session_manager()
    session = await sessions.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    state = session.state
    
    # Dynamic RM summary logic
    summary = {
        "persona": state.persona,
        "trust_level": "High" if state.trust_score > 0.7 else "Medium" if state.trust_score > 0.4 else "Low",
        "intent_score": state.intent_score,
        "lead_category": state.lead_category,
        "language_preference": state.language,
        "key_objections": [state.objection] if state.objection else [],
        "suggested_opening_line": f"Hi {state.persona.value}, I saw you were interested in our ROI benefits...",
        "key_quotes": state.key_quotes,
        "recommended_next_action": state.strategy,
    }
    
    return summary


@router.delete("/")
async def clear_all_sessions():
    """Delete ALL conversation sessions."""
    sessions = get_session_manager()
    count = await sessions.clear_all()
    return {"status": "cleared", "deleted_count": count}
