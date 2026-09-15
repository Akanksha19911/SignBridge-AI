"""
SignBridge AI
-------------
English/Hindi text → ISL-style gloss translator.

This is an MVP/demo translation system.
It converts normal sentences into a simplified
Indian Sign Language-style word order.
"""

import re


# ======================================================
# WH WORDS
# ======================================================

WH_WORDS = {
    "where",
    "what",
    "who",
    "when",
    "why",
    "how",
    "which",
    "whom"
}


# ======================================================
# WORDS TO REMOVE
# ======================================================

STOP_WORDS = {
    "is",
    "are",
    "am",
    "was",
    "were",

    "the",
    "a",
    "an",

    "do",
    "does",
    "did",

    "will",
    "shall",

    "can",
    "could",
    "should",
    "would",

    "has",
    "have",
    "had",

    "of",

    "please",
    "kindly"
}


# ======================================================
# HINDI → ENGLISH
# ======================================================

HINDI_TO_ENGLISH = {

    "डॉक्टर": "doctor",

    "कहाँ": "where",
    "कहां": "where",

    "है": "is",
    "हैं": "are",

    "मैं": "i",
    "मुझे": "i",

    "आप": "you",
    "तुम": "you",

    "क्या": "what",

    "कब": "when",

    "क्यों": "why",

    "कैसे": "how",

    "कौन": "who",

    "पंजीकरण": "registration",

    "डेस्क": "desk",

    "पानी": "water",

    "मदद": "help",

    "धन्यवाद": "thank you",

    "हाँ": "yes",
    "हां": "yes",

    "नहीं": "no",

    "दवा": "medicine",

    "अस्पताल": "hospital",

    "घर": "home",

    "स्कूल": "school",

    "कॉलेज": "college",

    "खाना": "food",

    "एयरपोर्ट": "airport",

    "हवाईअड्डा": "airport"
}


# ======================================================
# MULTI-WORD EXPRESSIONS
# ======================================================

MULTI_WORD = {

    "thank you":
        "THANK_YOU",

    "excuse me":
        "EXCUSE_ME",

    "good morning":
        "GOOD_MORNING",

    "good evening":
        "GOOD_EVENING",

    "nice to meet you":
        "NICE_TO_MEET_YOU",

    "good night":
        "GOOD_NIGHT"
}


# ======================================================
# HINDI TRANSLATION
# ======================================================

def _translate_hindi(text: str) -> str:

    words = text.split()

    translated = []


    for word in words:

        clean_word = word.strip(
            ".,!?;:"
        )

        translated.append(
            HINDI_TO_ENGLISH.get(
                clean_word,
                clean_word
            )
        )


    return " ".join(
        translated
    )


# ======================================================
# MULTI-WORD PROCESSING
# ======================================================

def _apply_multi_word(text: str) -> str:

    for phrase, token in MULTI_WORD.items():

        text = text.replace(
            phrase,
            token
        )

    return text


# ======================================================
# TEXT → ISL GLOSS
# ======================================================

def text_to_gloss(
    text: str,
    language: str = "en"
) -> list:

    # Clean input

    text = (
        text or ""
    ).strip().lower()


    # Remove punctuation

    text = re.sub(
        r"[?.!,;:]",
        "",
        text
    )


    # Hindi → English

    if language == "hi":

        text = _translate_hindi(
            text
        )


    # Replace common phrases

    text = _apply_multi_word(
        text
    )


    # Split into words

    tokens = text.split()


    multi_word_tokens = set(
        MULTI_WORD.values()
    )


    content = []

    wh = []


    # ==================================================
    # CREATE GLOSS
    # ==================================================

    for token in tokens:

        # Multi-word sign

        if token in multi_word_tokens:

            content.append(
                token
            )


        # Ignore grammar words

        elif token in STOP_WORDS:

            continue


        # WH words go to the end

        elif token in WH_WORDS:

            wh.append(
                token
            )


        # Normal content word

        else:

            content.append(
                token
            )


    # ISL-style order:
    #
    # CONTENT + WH WORD

    gloss = (
        content +
        wh
    )


    # Convert to uppercase

    return [
        word.upper()
        for word in gloss
    ]


# ======================================================
# GLOSS → ENGLISH
# ======================================================

def gloss_to_english(
    words: list
) -> str:

    if not words:

        return ""


    # Convert tokens

    tokens = [

        word.replace(
            "_",
            " "
        ).lower()

        for word in words

    ]


    # ==================================================
    # WH QUESTION
    # ==================================================

    if tokens[-1] in WH_WORDS:

        wh = tokens[-1]

        rest = " ".join(
            tokens[:-1]
        )


        if rest:

            sentence = (
                f"{wh.capitalize()} "
                f"is the {rest}?"
            )

        else:

            sentence = (
                f"{wh.capitalize()}?"
            )


    # ==================================================
    # NORMAL SENTENCE
    # ==================================================

    else:

        sentence = " ".join(
            tokens
        )


        if sentence:

            sentence = (
                sentence[0].upper()
                +
                sentence[1:]
                +
                "."
            )


    return sentence