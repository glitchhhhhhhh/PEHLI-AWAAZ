"""
conftest.py — Shared fixtures for the test suite.
"""

import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app
from app.engine.session_manager import SessionManager


@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for all tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def app():
    """Create a fresh FastAPI application for testing."""
    return create_app()


@pytest.fixture
async def client(app):
    """Async test client using httpx."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def session_manager():
    """Fresh session manager for unit tests (not the global singleton)."""
    return SessionManager()
