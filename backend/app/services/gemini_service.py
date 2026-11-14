
import os
from datetime import datetime, timedelta, timezone

from google import genai
from google.genai import types


MODEL = "gemini-3.8-live"

SYSTEM_INSTRUCTION = """
You are the friendly voice assistant for Earth Jukebox.

Earth Jukebox transforms NASA climate data into music.

You help users:
- Understand temperature and rainfall data.
- Explain how climate data becomes music.
- Navigate Earth Jukebox.
- Learn about environmental changes.
- Use accessibility features.

Speak naturally, clearly, and concisely.
Never invent NASA measurements.
Never claim to control the app unless an available tool performs that action.
"""


def create_live_token():
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(api_version="v1alpha")
    )

    now = datetime.now(timezone.utc)

    token = client.auth_tokens.create(
        config=types.CreateAuthTokenConfig(
            uses=1,
            expire_time=now + timedelta(minutes=30),
            new_session_expire_time=now + timedelta(minutes=1),
            live_connect_constraints=types.LiveConnectConstraints(
                model=MODEL,
                config=types.LiveConnectConfig(
                    response_modalities=["AUDIO"],
                    system_instruction=SYSTEM_INSTRUCTION
                )
            )
        )
    )

    return {
        "token": token.name,
        "model": MODEL,
        "expires_in_minutes": 30
    }
