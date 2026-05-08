
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.conversation import get_conversation_handler
from app.models import Language

async def test():
    handler = get_conversation_handler()
    session_id = "test_session"
    
    print("--- Testing handle_text_stream ---")
    async for event in handler.handle_text_stream(session_id, "hello", Language.HINGLISH):
        event_type = event.get("event")
        if event_type == "ai_token":
            print(f"Token: {event.get('token')}", end="", flush=True)
        elif event_type == "ai_complete":
            print(f"\nAI Complete: {event.get('text')}")
        elif event_type == "state_update":
            print(f"\nState Update: {event.get('state').keys()}")
        elif event_type == "thinking":
            print(f"Thinking: {event.get('step')}")
        elif event_type == "done":
            print("\nDone")

if __name__ == "__main__":
    asyncio.run(test())
