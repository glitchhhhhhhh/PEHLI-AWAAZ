"""
Integration tests for the REST API endpoints.

Tests the full HTTP request/response cycle using httpx + ASGI transport.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app


@pytest.fixture
async def client():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoints:
    @pytest.mark.asyncio
    async def test_root(self, client):
        r = await client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Pehli Awaaz API"
        assert "version" in data

    @pytest.mark.asyncio
    async def test_health(self, client):
        r = await client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert "active_sessions" in data


class TestChatAPI:
    @pytest.mark.asyncio
    async def test_send_message(self, client):
        r = await client.post("/api/chat/", json={
            "text": "Hello, mujhe investing mein interest hai",
            "language": "hinglish",
        })
        assert r.status_code == 200
        data = r.json()
        assert "session_id" in data
        assert "ai_reply" in data
        assert len(data["ai_reply"]) > 0
        assert "state" in data
        assert "thinking_steps" in data

    @pytest.mark.asyncio
    async def test_send_message_with_session(self, client):
        # First message — create session
        r1 = await client.post("/api/chat/", json={
            "text": "Hello",
            "language": "hinglish",
        })
        sid = r1.json()["session_id"]

        # Second message — same session
        r2 = await client.post("/api/chat/", json={
            "text": "Mujhe mutual funds ke baare mein batao",
            "session_id": sid,
            "language": "hinglish",
        })
        assert r2.status_code == 200
        assert r2.json()["session_id"] == sid

    @pytest.mark.asyncio
    async def test_get_messages(self, client):
        # Create a conversation
        r = await client.post("/api/chat/", json={"text": "Hi"})
        sid = r.json()["session_id"]

        # Get messages
        r2 = await client.get(f"/api/chat/{sid}/messages")
        assert r2.status_code == 200
        data = r2.json()
        assert data["count"] >= 2  # user + AI

    @pytest.mark.asyncio
    async def test_get_state(self, client):
        r = await client.post("/api/chat/", json={"text": "Haan interested hoon"})
        sid = r.json()["session_id"]

        r2 = await client.get(f"/api/chat/{sid}/state")
        assert r2.status_code == 200
        assert "state" in r2.json()

    @pytest.mark.asyncio
    async def test_delete_session(self, client):
        r = await client.post("/api/chat/", json={"text": "Test"})
        sid = r.json()["session_id"]

        r2 = await client.delete(f"/api/chat/{sid}")
        assert r2.status_code == 200

        r3 = await client.get(f"/api/chat/{sid}/state")
        assert r3.status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_session_messages(self, client):
        r = await client.get("/api/chat/fake-id/messages")
        assert r.status_code == 404


class TestSessionAPI:
    @pytest.mark.asyncio
    async def test_create_session(self, client):
        r = await client.post("/api/sessions/")
        assert r.status_code == 200
        data = r.json()
        assert "session_id" in data
        assert "state" in data

    @pytest.mark.asyncio
    async def test_list_sessions(self, client):
        # Create a couple of sessions
        await client.post("/api/sessions/")
        await client.post("/api/sessions/")

        r = await client.get("/api/sessions/")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 2

    @pytest.mark.asyncio
    async def test_get_session_details(self, client):
        r1 = await client.post("/api/sessions/")
        sid = r1.json()["session_id"]

        r2 = await client.get(f"/api/sessions/{sid}")
        assert r2.status_code == 200
        data = r2.json()
        assert data["session_id"] == sid
        assert "messages" in data
        assert "state" in data

    @pytest.mark.asyncio
    async def test_clear_all_sessions(self, client):
        await client.post("/api/sessions/")
        r = await client.delete("/api/sessions/")
        assert r.status_code == 200
        assert r.json()["status"] == "cleared"


class TestVoiceTTSEndpoint:
    @pytest.mark.asyncio
    async def test_tts_returns_audio(self, client):
        r = await client.post(
            "/api/voice/tts",
            data={"text": "Hello world"},
        )
        # Should return 200 with WAV audio (even in fallback mode)
        assert r.status_code in (200, 503)
        if r.status_code == 200:
            assert r.headers["content-type"] == "audio/wav"
            assert len(r.content) > 0
