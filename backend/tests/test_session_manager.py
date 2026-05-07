"""
Tests for the Session Manager — in-memory session store.
"""

import pytest
from app.engine.session_manager import SessionManager
from app.models import ChatMessage, ConversationState, Language, Persona


@pytest.fixture
def mgr():
    return SessionManager()


class TestSessionCreation:
    @pytest.mark.asyncio
    async def test_create_session(self, mgr):
        session = await mgr.create_session()
        assert session.session_id
        assert len(session.messages) == 0
        assert session.state.intent.value == "cold"

    @pytest.mark.asyncio
    async def test_create_with_custom_id(self, mgr):
        session = await mgr.create_session("test-session-1")
        assert session.session_id == "test-session-1"

    @pytest.mark.asyncio
    async def test_get_or_create_new(self, mgr):
        session = await mgr.get_or_create("new-session")
        assert session.session_id == "new-session"

    @pytest.mark.asyncio
    async def test_get_or_create_existing(self, mgr):
        s1 = await mgr.create_session("existing")
        s2 = await mgr.get_or_create("existing")
        assert s1.session_id == s2.session_id


class TestMessageManagement:
    @pytest.mark.asyncio
    async def test_add_message(self, mgr):
        session = await mgr.create_session("msg-test")
        msg = ChatMessage(role="user", text="Hello", language=Language.HINGLISH)
        await mgr.add_message("msg-test", msg)
        messages = await mgr.get_messages("msg-test")
        assert len(messages) == 1
        assert messages[0].text == "Hello"

    @pytest.mark.asyncio
    async def test_message_limit(self, mgr):
        session = await mgr.create_session("limit-test")
        for i in range(60):
            msg = ChatMessage(role="user", text=f"Message {i}")
            await mgr.add_message("limit-test", msg)
        messages = await mgr.get_messages("limit-test", limit=10)
        assert len(messages) == 10
        assert messages[0].text == "Message 50"

    @pytest.mark.asyncio
    async def test_empty_session_messages(self, mgr):
        messages = await mgr.get_messages("nonexistent")
        assert messages == []


class TestStateManagement:
    @pytest.mark.asyncio
    async def test_update_state(self, mgr):
        await mgr.create_session("state-test")
        new_state = ConversationState(trust_score=5.0, persona=Persona.TRADER)
        await mgr.update_state("state-test", new_state)
        state = await mgr.get_state("state-test")
        assert state.trust_score == 5.0
        assert state.persona == Persona.TRADER

    @pytest.mark.asyncio
    async def test_get_state_nonexistent(self, mgr):
        state = await mgr.get_state("nonexistent")
        assert state is None


class TestSessionLifecycle:
    @pytest.mark.asyncio
    async def test_delete_session(self, mgr):
        await mgr.create_session("del-test")
        assert await mgr.delete_session("del-test") is True
        assert await mgr.get_session("del-test") is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, mgr):
        assert await mgr.delete_session("nope") is False

    @pytest.mark.asyncio
    async def test_clear_all(self, mgr):
        await mgr.create_session("a")
        await mgr.create_session("b")
        await mgr.create_session("c")
        count = await mgr.clear_all()
        assert count == 3
        assert mgr.session_count == 0

    @pytest.mark.asyncio
    async def test_list_sessions(self, mgr):
        await mgr.create_session("list-1")
        await mgr.create_session("list-2")
        items = await mgr.list_sessions()
        assert len(items) == 2

    @pytest.mark.asyncio
    async def test_session_count(self, mgr):
        assert mgr.session_count == 0
        await mgr.create_session()
        assert mgr.session_count == 1
