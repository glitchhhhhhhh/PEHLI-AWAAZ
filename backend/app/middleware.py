"""
Middleware — request logging, error handling, and rate limiting.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from typing import Callable, Dict, Tuple

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


# ── Request Logging Middleware ───────────────────────────

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request with method, path, status, and duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
            duration = (time.perf_counter() - start) * 1000
            logger.info(
                "%s %s → %d (%.1fms)",
                method, path, response.status_code, duration,
            )
            response.headers["X-Process-Time-Ms"] = f"{duration:.1f}"
            return response
        except Exception as e:
            duration = (time.perf_counter() - start) * 1000
            logger.error(
                "%s %s → 500 (%.1fms) ERROR: %s",
                method, path, duration, e,
            )
            raise


# ── Rate Limiter Middleware ──────────────────────────────

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter per client IP.

    Defaults: 60 requests per 60 seconds per IP.
    In production, replace with Redis-backed rate limiting.
    """

    def __init__(
        self,
        app: FastAPI,
        max_requests: int = 60,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and docs
        if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json", "/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        async with self._lock:
            # Clean old entries
            self._requests[client_ip] = [
                t for t in self._requests[client_ip]
                if now - t < self.window_seconds
            ]

            if len(self._requests[client_ip]) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please slow down.",
                        "retry_after": self.window_seconds,
                    },
                    headers={"Retry-After": str(self.window_seconds)},
                )

            self._requests[client_ip].append(now)

        return await call_next(request)


# ── Global Exception Handler ────────────────────────────

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unhandled exceptions — returns a clean JSON error."""
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": type(exc).__name__,
        },
    )


# ── Registration helper ─────────────────────────────────

def register_middleware(app: FastAPI) -> None:
    """Attach all middleware and exception handlers to the app."""
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimiterMiddleware, max_requests=120, window_seconds=60)
    app.add_exception_handler(Exception, global_exception_handler)
