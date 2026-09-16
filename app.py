from flask import (
    Flask,
    render_template,
    request,
    jsonify
)

from modules.text_to_sign import (
    text_to_gloss,
    gloss_to_english
)

from modules.avatar_controller import (
    create_avatar_sequence
)

import os


# ======================================================
# FLASK APPLICATION
# ======================================================

app = Flask(__name__)


# ======================================================
# UPLOAD FOLDER
# ======================================================

UPLOAD_FOLDER = "uploads"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)

app.config[
    "UPLOAD_FOLDER"
] = UPLOAD_FOLDER


# ======================================================
# HOME PAGE
# ======================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# ======================================================
# TEXT → SIGN
# ======================================================

@app.route(
    "/text-to-sign",
    methods=["POST"]
)
def text_to_sign():

    try:

        data = request.get_json()


        # Get text

        text = data.get(
            "text",
            ""
        )


        # Get language

        language = data.get(
            "language",
            "en"
        )


        # Check empty input

        if not text:

            return jsonify({

                "success": False,

                "message":
                    "Please enter some text."

            })


        # ----------------------------------------------
        # TEXT → ISL GLOSS
        # ----------------------------------------------

        gloss = text_to_gloss(
            text,
            language
        )


        # ----------------------------------------------
        # GLOSS → AVATAR SEQUENCE
        # ----------------------------------------------

        avatar_sequence = (
            create_avatar_sequence(
                gloss
            )
        )


        # ----------------------------------------------
        # SEND RESPONSE
        # ----------------------------------------------

        return jsonify({

            "success": True,

            "text": text,

            "gloss": gloss,

            "avatar": avatar_sequence

        })


    except Exception as error:

        print(
            "Text-to-sign error:",
            error
        )


        return jsonify({

            "success": False,

            "message":
                "An error occurred while processing the text."

        }), 500


# ======================================================
# SIGN → TEXT
# ======================================================

@app.route(
    "/sign-to-text",
    methods=["POST"]
)
def sign_to_text():

    try:

        data = request.get_json()


        gloss = data.get(
            "gloss",
            []
        )


        if not gloss:

            return jsonify({

                "success": False,

                "message":
                    "No sign detected."

            })


        # ----------------------------------------------
        # GLOSS → ENGLISH
        # ----------------------------------------------

        english = gloss_to_english(
            gloss
        )


        return jsonify({

            "success": True,

            "gloss": gloss,

            "text": english

        })


    except Exception as error:

        print(
            "Sign-to-text error:",
            error
        )


        return jsonify({

            "success": False,

            "message":
                "Could not process sign."

        }), 500


# ======================================================
# FILE UPLOAD
# ======================================================

@app.route(
    "/upload",
    methods=["POST"]
)
def upload_file():

    try:

        # Check whether file exists

        if "file" not in request.files:

            return jsonify({

                "success": False,

                "message":
                    "No file uploaded."

            })


        file = request.files[
            "file"
        ]


        # Check filename

        if file.filename == "":

            return jsonify({

                "success": False,

                "message":
                    "No file selected."

            })


        # Create filepath

        filepath = os.path.join(

            app.config[
                "UPLOAD_FOLDER"
            ],

            file.filename

        )


        # Save file

        file.save(
            filepath
        )


        return jsonify({

            "success": True,

            "filename":
                file.filename,

            "message":
                "File uploaded successfully."

        })


    except Exception as error:

        print(
            "Upload error:",
            error
        )


        return jsonify({

            "success": False,

            "message":
                "File upload failed."

        }), 500


# ======================================================
# RUN APPLICATION
# ======================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )

from modules.avatar_controller import all_signs_json  # add to your existing import

# ...

# ======================================================
# SIGN LIBRARY (for the 3D avatar's "Quick Signs" panel)
# ======================================================

@app.route("/api/signs", methods=["GET"])
def api_signs():
    return jsonify(all_signs_json())