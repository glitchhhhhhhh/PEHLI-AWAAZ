"""
voice package — STT + TTS pipeline.
Processors are lazily instantiated to avoid import failures
when optional ML dependencies (whisper, TTS) are not installed.
"""


def get_stt_processor():
    from app.voice.stt import get_stt_processor as _get
    return _get()


def get_tts_processor():
    from app.voice.tts import get_tts_processor as _get
    return _get()


__all__ = ["get_stt_processor", "get_tts_processor"]
