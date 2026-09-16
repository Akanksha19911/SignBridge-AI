"""Speech-to-text for uploaded audio/video using faster-whisper (reads mp4 directly)."""
from faster_whisper import WhisperModel

_model = None


def _get_model():
    global _model
    if _model is None:  # loads once, first call downloads the model (~500 MB)
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model


def transcribe(path: str, language: str = "en"):
    """Returns (full_text_in_english, segments). Hindi audio is translated to English."""
    model = _get_model()
    if language == "hi":
        segments, _ = model.transcribe(path, language="hi", task="translate")
    else:
        segments, _ = model.transcribe(path, language="en")
    segs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
            for s in segments]
    return " ".join(s["text"] for s in segs), segs
