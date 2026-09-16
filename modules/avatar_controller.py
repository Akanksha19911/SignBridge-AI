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
    }
}


SIGN_KEY_TO_GLOSS = {
    key: value["gloss"]
    for key, value in SIGN_LIBRARY.items()
}


GLOSS_TO_SIGN_KEY = {
    value["gloss"]: key
    for key, value in SIGN_LIBRARY.items()
}


SIGN_ANIMATIONS = {
    "HELLO": "HELLO",
    "THANK-YOU": "THANK_YOU",
    "PLEASE": "PLEASE",
    "YES": "YES",
    "NO": "NO",
    "WHERE": "WHERE"
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