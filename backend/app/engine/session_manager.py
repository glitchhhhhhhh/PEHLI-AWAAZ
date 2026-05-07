"""
Session Manager — In-memory session store.

Manages conversation sessions with full message history and state.
In production, swap this for Redis / PostgreSQL-backed storage.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Dict, List, Optional

from app.models import ChatMessage, ConversationState, Session, SessionListItem


class SessionManager:
    """Thread-safe, async-friendly in-memory session store."""

    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}
        self._lock = asyncio.Lock()

    async def create_session(self, session_id: Optional[str] = None) -> Session:
        """Create a new empty session. Optionally specify an ID."""
        session = Session()
        if session_id:
            session.session_id = session_id

        async with self._lock:
            self._sessions[session.session_id] = session
        return session

    async def get_session(self, session_id: str) -> Optional[Session]:
        """Retrieve a session by ID."""
        return self._sessions.get(session_id)

    async def get_or_create(self, session_id: Optional[str] = None) -> Session:
        """Get existing session or create a new one."""
        if session_id and session_id in self._sessions:
            return self._sessions[session_id]
        return await self.create_session(session_id)

    async def add_message(self, session_id: str, message: ChatMessage) -> None:
        """Append a message to the session's history."""
        session = self._sessions.get(session_id)
        if session is None:
            session = await self.create_session(session_id)
        async with self._lock:
            session.messages.append(message)
            session.updated_at = datetime.utcnow()

    async def update_state(self, session_id: str, state: ConversationState) -> None:
        """Replace the session's conversation state."""
        session = self._sessions.get(session_id)
        if session is None:
            return
        async with self._lock:
            session.state = state
            session.updated_at = datetime.utcnow()

    async def get_messages(self, session_id: str, limit: int = 50) -> List[ChatMessage]:
        """Return the last `limit` messages from a session."""
        session = self._sessions.get(session_id)
        if session is None:
            return []
        return session.messages[-limit:]

    async def get_state(self, session_id: str) -> Optional[ConversationState]:
        """Return the current state for a session."""
        session = self._sessions.get(session_id)
        return session.state if session else None

    async def list_sessions(self) -> List[SessionListItem]:
        """Return a summary list of all active sessions."""
        items = []
        for s in self._sessions.values():
            items.append(
                SessionListItem(
                    session_id=s.session_id,
                    message_count=len(s.messages),
                    lead_class=s.state.lead_class,
                    persona=s.state.persona,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
            )
        return sorted(items, key=lambda x: x.updated_at, reverse=True)

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session. Returns True if it existed."""
        async with self._lock:
            return self._sessions.pop(session_id, None) is not None

    async def clear_all(self) -> int:
        """Clear all sessions. Returns count deleted."""
        async with self._lock:
            count = len(self._sessions)
            self._sessions.clear()
            return count

    @property
    def session_count(self) -> int:
        return len(self._sessions)


# ── Singleton ────────────────────────────────────────────

_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    global _manager
    if _manager is None:
        _manager = SessionManager()
    return _manager
