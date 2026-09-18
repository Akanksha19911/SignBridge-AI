"""
text_to_sign.py
----------------
    text_to_gloss(text, language)  -- used by app.py's /text-to-sign route
    gloss_to_english(gloss)        -- used by app.py's /sign-to-text route

Matching strategy: normalize the text, match the longest known phrase first
("thank you again" before "thank you"), convert matches to ISL-style gloss
tokens (HELLO, THANK-YOU, ...). Unmatched words are still emitted (as their
own uppercase token) so nothing silently disappears -- the avatar controller
will just mark them found=False.
"""

import re
import unicodedata
from modules.avatar_controller import SIGN_KEY_TO_GLOSS, GLOSS_TO_SIGN_KEY

# phrase -> sign_key (add synonyms here as you grow the sign set)
PHRASE_ALIASES = {
    "hello": "hello",
    "hi": "hello",
    "thank you again": "thank_you_again",
    "thank you": "thank_you",
    "thanks": "thank_you",
    "please": "please",
    "yes": "yes",
    "no": "no",
    "where": "where",
    "help": "help",
    "more": "more",
    "food": "food",
    "hungry": "food",
    "water": "water",
    "thirsty": "water",
    "airport": "airport",
    "registration desk": "registration_desk",
    "registration": "registration_desk",
    "goodbye": "goodbye",
    "bye": "goodbye",
    "doctor": "doctor",
    "desk": "desk",
    # Added for the demo vocabulary
    "hospital": "hospital",
    "clinic": "hospital",
    "medicine": "medicine",
    "tablet": "medicine",
    "pain": "pain",
    "hurts": "pain",
    "name": "name",
    "sorry": "sorry",
    "wait": "wait",
    "today": "today",
    "tomorrow": "tomorrow",
    "time": "time",
    "ticket": "ticket",
    "train": "train",
    "station": "station",
    "school": "school",
    "college": "school",
    "teacher": "teacher",
    "student": "student",
    "money": "money",
    "toilet": "toilet",
    "washroom": "toilet",
    "emergency": "emergency",
    "family": "family",
    "good": "good",
    "fine": "good",
    "bad": "bad",
    "understand": "understand",
}
_SORTED_PHRASES = sorted(PHRASE_ALIASES.keys(), key=len, reverse=True)

# Small stopword list so gloss output doesn't get cluttered with "the", "is", etc.
STOPWORDS = {"a", "an", "the", "is", "are", "am", "to", "of", "my", "your"}


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


# Small Hindi -> English dictionary so hi-IN speech input still maps to signs.
HINDI_TO_ENGLISH = {
    "नमस्ते": "hello", "धन्यवाद": "thank you", "शुक्रिया": "thank you",
    "कृपया": "please", "हाँ": "yes", "हां": "yes", "नहीं": "no",
    "कहाँ": "where", "कहां": "where", "मदद": "help", "पानी": "water",
    "खाना": "food", "डॉक्टर": "doctor", "अलविदा": "goodbye",
    # Added for the demo vocabulary
    "अस्पताल": "hospital", "दवाई": "medicine", "दवा": "medicine",
    "दर्द": "pain", "नाम": "name", "माफ": "sorry", "रुको": "wait",
    "समय": "time", "आज": "today", "कल": "tomorrow", "टिकट": "ticket",
    "ट्रेन": "train", "स्टेशन": "station", "स्कूल": "school",
    "शिक्षक": "teacher", "छात्र": "student", "पैसा": "money",
    "शौचालय": "toilet", "आपातकाल": "emergency", "परिवार": "family",
    "अच्छा": "good", "बुरा": "bad", "समझ": "understand",
    "पंजीकरण": "registration",
}


# Hindi text can arrive in different Unicode forms; compare in a single normal form.
_HINDI_NORMALIZED = {
    unicodedata.normalize("NFC", key): value
    for key, value in HINDI_TO_ENGLISH.items()
}


def text_to_gloss(text: str, language: str = "en"):
    """
    Convert a sentence into a list of ISL-style gloss tokens, e.g.
        "thank you please" -> ["THANK-YOU", "PLEASE"]
        "where is the registration desk" -> ["WHERE", "REGISTRATION-DESK"]

    `language` is accepted for forward-compatibility (e.g. if you later add
    translation before gloss matching); the current matcher is English-only.
    """
    if language == "hi":
        words = []
        for word in str(text).split():
            key = unicodedata.normalize("NFC", word.strip("।?!,.\u200c\u200d"))
            words.append(_HINDI_NORMALIZED.get(key, word))
        text = " ".join(words)
    normalized = _normalize(text)
    if not normalized:
        return []

    padded = f" {normalized} "
    matches = []  # (start, phrase, sign_key)
    for phrase in _SORTED_PHRASES:
        pattern = f" {re.escape(phrase)} "
        for m in re.finditer(pattern, padded):
            matches.append((m.start(), phrase, PHRASE_ALIASES[phrase]))

    matches.sort(key=lambda m: (m[0], -len(m[1])))
    used_spans = []
    final = []
    for start, phrase, sign_key in matches:
        end = start + len(phrase) + 1
        if any(not (end <= s or start >= e) for s, e in used_spans):
            continue
        used_spans.append((start, end))
        final.append((start, phrase, sign_key))
    final.sort(key=lambda m: m[0])

    gloss = [
        SIGN_KEY_TO_GLOSS.get(sign_key, sign_key.upper().replace("_", "-"))
        for _, _, sign_key in final
    ]

    # Blank out matched spans, then keep any leftover non-stopword tokens
    # so the gloss output still reflects the full sentence.
    chars = list(padded)
    for start, end in used_spans:
        for i in range(start, end):
            if 0 <= i < len(chars) and chars[i] != " ":
                chars[i] = " "
    for word in "".join(chars).split():
        if word not in STOPWORDS:
            gloss.append(word.upper())

    # ISL puts question words at the end: "WHERE REGISTRATION-DESK" -> "REGISTRATION-DESK WHERE"
    questions = [g for g in gloss if g in QUESTION_GLOSS]
    return [g for g in gloss if g not in QUESTION_GLOSS] + questions


QUESTION_GLOSS = {"WHERE", "WHAT", "WHEN", "WHO", "WHY", "HOW", "WHICH"}


def gloss_to_english(gloss):
    """
    Reconstruct a rough English sentence from a list of gloss tokens, e.g.
        ["THANK-YOU", "PLEASE"] -> "thank you please"
    Known gloss tokens map back to their natural label; unknown tokens are
    lowercased as-is.
    """
    words = []
    for token in gloss:
        key = GLOSS_TO_SIGN_KEY.get(str(token).upper())
        if key:
            from modules.avatar_controller import SIGN_LIBRARY
            words.append(SIGN_LIBRARY[key]["label"].lower())
        else:
            words.append(str(token).replace("-", " ").lower())
    return " ".join(words)