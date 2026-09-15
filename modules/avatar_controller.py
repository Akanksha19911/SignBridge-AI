SIGN_ANIMATIONS = {

    "HELLO": "HELLO",

    "THANK_YOU": "THANK_YOU",

    "PLEASE": "PLEASE",

    "YES": "YES",

    "NO": "NO",

    "WHERE": "WHERE",

    "HELP": "HELP",

    "MORE": "MORE",

    "FOOD": "FOOD",

    "WATER": "WATER",

    "AIRPORT": "AIRPORT",

    "REGISTRATION": "REGISTRATION",

    "DESK": "DESK",

    "GOODBYE": "GOODBYE"
}


def get_expression(gloss):

    gloss = gloss.upper()


    if gloss in [
        "WHERE",
        "WHAT",
        "WHY",
        "WHO",
        "WHEN",
        "HOW"
    ]:

        return "thinking"


    if gloss in [
        "HELLO",
        "GOODBYE",
        "THANK_YOU"
    ]:

        return "happy"


    if gloss == "HELP":

        return "concerned"


    if gloss == "YES":

        return "happy"


    if gloss == "NO":

        return "neutral"


    return "neutral"


def create_avatar_sequence(gloss):

    sequence = []


    for word in gloss:

        word = word.upper()


        if word in SIGN_ANIMATIONS:

            sequence.append({

                "gloss": word,

                "animation":
                    SIGN_ANIMATIONS[word],

                "expression":
                    get_expression(word)

            })


    return sequence
SIGN_ANIMATIONS = {

    "HELLO": "HELLO",

    "THANK_YOU": "THANK_YOU",

    "PLEASE": "PLEASE",

    "YES": "YES",

    "NO": "NO",

    "WHERE": "WHERE",

    "HELP": "HELP",

    "MORE": "MORE",

    "FOOD": "FOOD",

    "WATER": "WATER",

    "AIRPORT": "AIRPORT",

    "REGISTRATION": "REGISTRATION",

    "DESK": "DESK",

    "GOODBYE": "GOODBYE"
}


def get_expression(gloss):

    gloss = gloss.upper()


    if gloss in [
        "WHERE",
        "WHAT",
        "WHY",
        "WHO",
        "WHEN",
        "HOW"
    ]:

        return "thinking"


    if gloss in [
        "HELLO",
        "GOODBYE",
        "THANK_YOU"
    ]:

        return "happy"


    if gloss == "HELP":

        return "concerned"


    if gloss == "YES":

        return "happy"


    if gloss == "NO":

        return "neutral"


    return "neutral"


def create_avatar_sequence(gloss):

    sequence = []


    for word in gloss:

        word = word.upper()


        if word in SIGN_ANIMATIONS:

            sequence.append({

                "gloss": word,

                "animation":
                    SIGN_ANIMATIONS[word],

                "expression":
                    get_expression(word)

            })


    return sequence