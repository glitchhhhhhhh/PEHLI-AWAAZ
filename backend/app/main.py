"""
FastAPI application factory — assembles all routes, middleware, and lifecycle hooks.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.middleware import register_middleware
from app.routes import chat, sessions, voice, websocket

# ── Logging ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("pehli_awaaz")


# ── Lifespan ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info("═" * 60)
    logger.info("  🎙️  PEHLI AWAAZ — Backend v%s", __version__)
    logger.info("  🔧  LLM Provider: %s", settings.LLM_PROVIDER)
    logger.info("  🗣️  STT Model:    %s", settings.STT_MODEL)
    logger.info("  🔊  TTS Model:    %s", settings.TTS_MODEL)
    logger.info("  🌐  CORS Origins: %s", settings.CORS_ORIGINS)
    logger.info("═" * 60)
    yield
    logger.info("Shutting down Pehli Awaaz backend...")


# ── App Factory ──────────────────────────────────────────

def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Pehli Awaaz API",
        description=(
            "AI-powered multilingual sales conversation engine for Indian fintech. "
            "Supports real-time voice (STT + TTS), text chat, and WebSocket streaming."
        ),
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS ─────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Middleware (logging, rate limiting, error handling) ──
    register_middleware(app)

    # ── Routes ───────────────────────────────────────
    app.include_router(chat.router)
    app.include_router(voice.router)
    app.include_router(sessions.router)
    app.include_router(websocket.router)

    # ── Static Frontend ──────────────────────────────
    import os
    from fastapi.staticfiles import StaticFiles
    
    # In production, we serve the 'public' directory (built from Vite)
    static_path = "public"
    if os.path.exists(static_path):
        app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

    # ── Health check ─────────────────────────────────
    @app.get("/health", tags=["System"])
    async def health():
        """Health check endpoint."""
        from app.engine.session_manager import get_session_manager
        return {
            "status": "healthy",
            "version": __version__,
            "active_sessions": get_session_manager().session_count,
        }

    @app.get("/", tags=["System"])
    async def root():
        """API root — redirects to docs."""
        return {
            "name": "Pehli Awaaz API",
            "version": __version__,
            "docs": "/docs",
            "health": "/health",
        }

    return app


# ── Module-level app instance for uvicorn ────────────────
app = create_app()
