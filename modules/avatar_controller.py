# ============================================================
# SIGNBRIDGE AI - AVATAR CONTROLLER
# ============================================================

SIGN_LIBRARY = {

    "hello": {
        "label": "hello",
        "gloss": "HELLO",
        "animation": "HELLO",
        "expression": "happy"
    },

    "thank_you": {
        "label": "thank you",
        "gloss": "THANK-YOU",
        "animation": "THANK_YOU",
        "expression": "happy"
    },

    "please": {
        "label": "please",
        "gloss": "PLEASE",
        "animation": "PLEASE",
        "expression": "neutral"
    },

    "yes": {
        "label": "yes",
        "gloss": "YES",
        "animation": "YES",
        "expression": "happy"
    },

    "no": {
        "label": "no",
        "gloss": "NO",
        "animation": "NO",
        "expression": "neutral"
    },

    "where": {
        "label": "where",
        "gloss": "WHERE",
        "animation": "WHERE",
        "expression": "thinking"
    },
}

# Extra demo words used by text_to_sign.py (no dedicated animation yet)
for _key, _label in {
    "help": "help", "more": "more", "food": "food", "water": "water",
    "airport": "airport", "registration_desk": "registration desk",
    "goodbye": "goodbye", "thank_you_again": "thank you again",
    "doctor": "doctor", "desk": "desk", "registration": "registration",
    # Added for the demo vocabulary
    "hospital": "hospital", "medicine": "medicine", "pain": "pain",
    "name": "name", "sorry": "sorry", "wait": "wait", "today": "today",
    "tomorrow": "tomorrow", "time": "time", "ticket": "ticket",
    "train": "train", "station": "station", "school": "school",
    "teacher": "teacher", "student": "student", "money": "money",
    "toilet": "toilet", "emergency": "emergency", "family": "family",
    "good": "good", "bad": "bad", "understand": "understand",
}.items():
    SIGN_LIBRARY.setdefault(_key, {
        "label": _label,
        "gloss": _key.upper().replace("_", "-"),
        "animation": "IDLE",
        "expression": "neutral",
    })


SIGN_KEY_TO_GLOSS = {
    key: value["gloss"]
    for key, value in SIGN_LIBRARY.items()
}


GLOSS_TO_SIGN_KEY = {
    value["gloss"]: key
    for key, value in SIGN_LIBRARY.items()
}


SIGN_ANIMATIONS = {
    value["gloss"]: value["animation"]
    for value in SIGN_LIBRARY.values()
}


def get_expression(gloss):

    gloss = str(gloss).upper()

    if gloss == "WHERE":
        return "thinking"

    if gloss in [
        "HELLO",
        "THANK-YOU",
        "YES"
    ]:
        return "happy"

    return "neutral"


def create_avatar_sequence(gloss):

    sequence = []

    for word in gloss:

        word = str(word).upper()

        sequence.append({
            "gloss": word,
            "animation": SIGN_ANIMATIONS.get(
                word,
                "IDLE"
            ),
            "expression": get_expression(word)
        })

    return sequence


def all_signs_json():
    """Sign library as a list, for the /api/signs route."""
    return [
        {"key": key, **value}
        for key, value in SIGN_LIBRARY.items()
    ]
