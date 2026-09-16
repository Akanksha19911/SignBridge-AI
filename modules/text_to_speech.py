"""
Text-to-Speech helper.

The actual speech generation is handled by
the browser's built-in SpeechSynthesis API.
"""

def prepare_text_for_speech(text: str) -> str:

    return (text or "").strip()
