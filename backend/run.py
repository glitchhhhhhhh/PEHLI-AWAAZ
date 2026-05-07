"""
Entry point — run with: python run.py
Or:  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import uvicorn
from app.config import get_settings


def main():
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
        ws_ping_interval=30,
        ws_ping_timeout=30,
    )


if __name__ == "__main__":
    main()
