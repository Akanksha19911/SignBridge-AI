"""SignBridge AI - Flask app.

Serves the frontend pages and the JSON API described in AGENTS.md.
Original routes (/text-to-sign, /sign-to-text, /upload) are kept for compatibility.
"""
import os
import uuid

from flask import Flask, jsonify, render_template, request

from modules import history
from modules.avatar_controller import all_signs_json, create_avatar_sequence
from modules.sign_recognition import FEATURES, SignRecognizer
from modules.text_to_sign import gloss_to_english, text_to_gloss

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
SIGN_DIR = os.path.join(BASE_DIR, "static", "signs")
ALLOWED_EXT = {"mp4", "mov", "avi", "mkv", "webm", "mp3", "wav", "m4a", "ogg"}
QUESTION_WORDS = {"what", "where", "when", "who", "why", "how", "which"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024
recognizer = SignRecognizer()


# ======================================================
# HELPERS
# ======================================================

SIGN_MEDIA = [(".mp4", "sign"), (".webm", "sign"), (".png", "image"), (".jpg", "image"), (".jpeg", "image")]


def gloss_to_clips(gloss):
    """One entry per gloss word. A word can be a video clip or a still picture
    (png/jpg); with neither, the frontend shows the 3D avatar with the word."""
    clips = []
    for word in gloss:
        name = str(word).lower().replace("-", "_")
        url, kind = "", "avatar"
        for ext, media in SIGN_MEDIA:
            if os.path.exists(os.path.join(SIGN_DIR, f"{name}{ext}")):
                url, kind = f"/static/signs/{name}{ext}", media
                break
        clips.append({"word": str(word).upper(), "type": kind, "url": url})
    return clips


def translate(text, language="en"):
    gloss = text_to_gloss(text, language)
    return {"gloss": gloss, "clips": gloss_to_clips(gloss), "avatar": create_avatar_sequence(gloss)}


def words_to_sentence(words):
    cleaned = []
    for w in words:
        w = str(w).lower().replace("-", " ").replace("_", " ").strip()
        if w and (not cleaned or cleaned[-1] != w):
            cleaned.append(w)
    if not cleaned:
        return ""
    if len(cleaned) > 1 and cleaned[-1] in QUESTION_WORDS:
        sentence = f"{cleaned[-1]} is the {' '.join(cleaned[:-1])}?"
    else:
        sentence = " ".join(cleaned) + "."
    return sentence[0].upper() + sentence[1:]


# ======================================================
# PAGES
# ======================================================

PAGES = {
    "/": "index.html",
    "/media": "media.html",
    "/speech-to-sign": "speech_to_sign.html",
    "/sign-to-speech": "sign_to_speech.html",
    "/conversation": "conversation.html",
    "/history": "history.html",
    "/settings": "settings.html",
}
for route, template in PAGES.items():
    app.add_url_rule(route, template, lambda t=template: render_template(t))


# ======================================================
# API (used by the frontend, see AGENTS.md)
# ======================================================

@app.get("/api/health")
def api_health():
    return jsonify({"status": "ok", "sign_model_loaded": recognizer.ready})


@app.get("/api/signs")
def api_signs():
    return jsonify(all_signs_json())


@app.post("/api/text-to-sign")
def api_text_to_sign():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    language = data.get("language", "en")
    if not text:
        return jsonify({"error": "text is required"}), 400
    return jsonify({"text": text, "language": language, **translate(text, language)})


@app.post("/api/sign/sentence")
def api_sign_sentence():
    words = (request.get_json(silent=True) or {}).get("words", [])
    return jsonify({"text": words_to_sentence(words)})


@app.post("/api/sign/predict")
def api_sign_predict():
    if not recognizer.ready:
        return jsonify({"error": "Sign model not trained yet"}), 503
    frames = (request.get_json(silent=True) or {}).get("landmarks")
    if not frames or any(len(f) != FEATURES for f in frames):
        return jsonify({"error": f"landmarks must be frames of {FEATURES} numbers"}), 400
    word, confidence = recognizer.predict(frames)
    return jsonify({"word": word.upper(), "confidence": round(confidence, 3)})


@app.post("/api/media/upload")
def api_media_upload():
    file = request.files.get("file")
    language = request.form.get("language", "en")
    if not file or "." not in file.filename:
        return jsonify({"error": "file is required"}), 400
    ext = file.filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify({"error": f"unsupported file type .{ext}"}), 400
    try:
        from modules.audio_processing import transcribe
    except ImportError:
        return jsonify({"error": "Media transcription is not installed. Run: pip install -r requirements-ml.txt"}), 501

    path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4().hex}.{ext}")
    file.save(path)
    try:
        transcript, segments = transcribe(path, language)
    except Exception as error:
        return jsonify({"error": f"Transcription failed: {error}"}), 500
    finally:
        if os.path.exists(path):
            os.remove(path)

    for seg in segments:
        seg.update(translate(seg["text"], "en"))
    return jsonify({"transcript": transcript, "segments": segments, **translate(transcript, "en")})


@app.route("/api/history", methods=["GET", "POST", "DELETE"])
def api_history():
    if request.method == "POST":
        return jsonify(history.add_entry(request.get_json(silent=True) or {})), 201
    if request.method == "DELETE":
        history.clear()
        return jsonify({"status": "ok"})
    return jsonify(list(reversed(history.list_entries())))


# ======================================================
# ORIGINAL ROUTES (kept for compatibility)
# ======================================================

@app.post("/text-to-sign")
def text_to_sign():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"success": False, "message": "Please enter some text."})
    result = translate(text, data.get("language", "en"))
    return jsonify({"success": True, "text": text, "gloss": result["gloss"], "avatar": result["avatar"]})


@app.post("/sign-to-text")
def sign_to_text():
    gloss = (request.get_json(silent=True) or {}).get("gloss", [])
    if not gloss:
        return jsonify({"success": False, "message": "No sign detected."})
    return jsonify({"success": True, "gloss": gloss, "text": gloss_to_english(gloss)})


@app.post("/upload")
def upload_file():
    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"success": False, "message": "No file uploaded."})
    file.save(os.path.join(UPLOAD_FOLDER, os.path.basename(file.filename)))
    return jsonify({"success": True, "filename": file.filename, "message": "File uploaded successfully."})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
