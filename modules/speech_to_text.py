"""
Speech-to-text helper.

For the MVP, speech recognition is handled
by the browser using the Web Speech API.

This file is kept as a backend placeholder
for future Whisper integration.
"""


def clean_transcription(text: str) -> str:

    return (text or "").strip()
