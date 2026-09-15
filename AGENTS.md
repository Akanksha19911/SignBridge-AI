# SignBridge AI - Agent Instructions

## Project

SignBridge AI is a hackathon web app for Indian Sign Language (ISL) translation. It has four modes:

1. Translate Media: upload audio/video -> transcript -> ISL sign clips (avatar)
2. Live Sign Translator: webcam sign -> text -> speech
3. Live Sign Interpreter: microphone speech -> text -> ISL sign clips
4. Conversation Mode: two-way, combining modes 2 and 3
   Plus History and Settings pages.

## Stack and boundaries

- Backend is Flask (app.py, modules/, models/). It is owned by another teammate. NEVER edit app.py, modules/, models/, data/ or requirements.txt.
- Frontend is Jinja2 templates in templates/ and plain JavaScript (ES modules) and CSS in static/js/ and static/css/. No React, no build step, no npm.
- Every page extends templates/base.html. Load static files with {{ url\_for('static', filename='...') }}.
- Target browser: Google Chrome (desktop). App runs at [http://127.0.0.1:5000](http://127.0.0.1:5000).
- External libraries only from CDN: @mediapipe/tasks-vision from cdn.jsdelivr.net. Icons as inline SVG.

## Page routes (served by Flask)

/ -> templates/index.html
/media -> templates/media.html
/sign-to-speech -> templates/sign\_to\_speech.html
/speech-to-sign -> templates/speech\_to\_sign.html
/conversation -> templates/conversation.html
/history -> templates/history.html
/settings -> templates/settings.html

## API contract (do not change names or shapes)

GET /api/health -> {status, sign\_model\_loaded}
POST /api/text-to-sign  JSON {text, language: "en"|"hi"} -> {text, gloss: [string], clips: [Clip]}
POST /api/media/upload  multipart form-data: file, language -> {transcript, segments: [{start, end, text, gloss, clips}], gloss, clips}
POST /api/sign/predict  JSON {landmarks: 30 frames, each exactly 126 numbers} -> {word, confidence}   (503 if model not trained)
POST /api/sign/sentence JSON {words: [string]} -> {text}
GET /api/history -> [entry]; POST /api/history JSON {mode, input, output} -> entry; DELETE /api/history -> {status}
Clip = {word, type: "sign"|"letter", url, letter?}
Errors come back as {error} with status 400/500/503.

## Landmark frame format (must match the trained model exactly)

One frame = 126 numbers = 2 hands x 21 landmarks x (x, y, z), raw MediaPipe normalized values.

- Mirror x to match the selfie-flipped training data: use x = 1 - landmark.x (y and z unchanged).
- Sort detected hands by the mirrored wrist x (landmark 0), smallest first.
- First hand fills numbers 0-62, second hand 63-125. Missing hand = zeros. No hands = 126 zeros.
- A sequence sent to /api/sign/predict is the latest 30 frames.

## Code rules

- All API calls go through static/js/api.js. It has a MOCK flag: when true, return realistic fake responses in the shapes above (with a 600 ms delay) so pages work without the backend.
- Shared sign clip player lives in static/js/clip-player.js. Reuse it; do not duplicate.
- User settings are read with static/js/settings.js (localStorage, wrapped in try/catch, with defaults).
- Show friendly error messages in the UI (toast), never only console errors.
- Accessible: large readable text, visible focus states, aria-labels on icon buttons, captions always visible. Must work at 1366x768 and on a 400px wide phone screen.
- Keep code simple and commented. Hackathon demo reliability matters more than cleverness.
