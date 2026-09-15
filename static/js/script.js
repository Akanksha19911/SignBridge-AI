// ============================================
// SIGNBRIDGE AI JAVASCRIPT
// ============================================

import { playSignSequence } from "./avatar3d.js";


// ============================================
// FEATURE 1
// MEDIA → SIGN
// ============================================

async function uploadMedia() {

    const fileInput =
        document.getElementById("mediaFile");

    const result =
        document.getElementById("mediaResult");


    if (!fileInput.files.length) {

        result.innerHTML =
            "⚠️ Please select an audio or video file.";

        return;
    }


    const formData =
        new FormData();

    formData.append(
        "file",
        fileInput.files[0]
    );


    result.innerHTML =
        "⏳ Uploading file...";


    try {

        const response =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (data.success) {

            result.innerHTML =
                `
                ✅ File uploaded successfully!
                <br><br>
                <strong>${data.filename}</strong>
                <br><br>
                AI processing pipeline ready.
                `;

        } else {

            result.innerHTML =
                "❌ " + data.message;

        }

    } catch (error) {

        result.innerHTML =
            "❌ Upload failed.";

        console.error(error);

    }

}


// ============================================
// FEATURE 2
// CAMERA
// ============================================

let cameraStream = null;


async function startCamera() {

    const video =
        document.getElementById("camera");


    try {

        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({
                    video: true,
                    audio: false
                });


        video.srcObject =
            cameraStream;


        document.getElementById(
            "detectedSign"
        ).innerText =
            "Camera active — waiting for AI sign detection...";


    } catch (error) {

        alert(
            "Camera permission was denied or unavailable."
        );

        console.error(error);

    }

}


function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );


        cameraStream = null;


        document.getElementById(
            "camera"
        ).srcObject = null;


        document.getElementById(
            "detectedSign"
        ).innerText =
            "Camera stopped.";

    }

}


// ============================================
// SIGN → SPEECH
// ============================================

function speakDetectedSign() {

    const text =
        document.getElementById(
            "detectedSign"
        ).innerText;


    if (
        !text ||
        text.includes("Waiting") ||
        text.includes("Camera active") ||
        text.includes("Camera stopped")
    ) {

        alert(
            "No sign has been detected yet."
        );

        return;
    }


    const speech =
        new SpeechSynthesisUtterance(text);


    window.speechSynthesis.speak(
        speech
    );

}


// ============================================
// FEATURE 3
// SPEECH → TEXT
// ============================================

let recognition = null;


function startSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Speech recognition is not supported in this browser. Please use Google Chrome."
        );

        return;
    }


    recognition =
        new SpeechRecognition();


    recognition.continuous = false;

    recognition.interimResults = false;


    const language =
        document.getElementById(
            "language"
        ).value;


    if (language === "hi") {

        recognition.lang =
            "hi-IN";

    } else {

        recognition.lang =
            "en-IN";

    }


    recognition.onstart =
        function () {

            document.getElementById(
                "speechText"
            ).value =
                "🎤 Listening...";

        };


    recognition.onresult =
        function (event) {

            const transcript =
                event.results[0][0].transcript;


            document.getElementById(
                "speechText"
            ).value =
                transcript;

        };


    recognition.onerror =
        function (event) {

            console.error(
                "Speech recognition error:",
                event.error
            );

            alert(
                "Speech recognition error: "
                + event.error
            );

        };


    recognition.start();

}


// ============================================
// SPEECH → SIGN
// ============================================

async function convertSpeechToSign() {

    const text =
        document.getElementById(
            "speechText"
        ).value;


    const language =
        document.getElementById(
            "language"
        ).value;


    if (
        !text ||
        text === "🎤 Listening..."
    ) {

        alert(
            "Please speak something first."
        );

        return;
    }


    try {

        // ----------------------------------------
        // SEND TEXT TO FLASK
        // ----------------------------------------

        const response =
            await fetch(
                "/text-to-sign",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        text: text,

                        language: language

                    })

                }
            );


        // ----------------------------------------
        // GET JSON RESPONSE
        // ----------------------------------------

        const data =
            await response.json();


        // ----------------------------------------
        // SUCCESS
        // ----------------------------------------

        if (data.success) {

            // Show ISL gloss

            document.getElementById(
                "glossOutput"
            ).innerText =
                data.gloss.join(" → ");


            // ------------------------------------
            // START 3D AVATAR
            // ------------------------------------

            if (data.avatar) {

                playSignSequence(
                    data.avatar
                );

            }

        } else {

            alert(
                data.message
            );

        }


    } catch (error) {

        console.error(
            "Speech to sign error:",
            error
        );


        alert(
            "Could not connect to the server."
        );

    }

}


// ============================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ============================================
//
// Because script.js is a JavaScript MODULE,
// functions are not automatically global.
//
// Your HTML uses:
// onclick="uploadMedia()"
// onclick="startCamera()"
// etc.
//
// Therefore we expose them through window.
// ============================================

window.uploadMedia =
    uploadMedia;

window.startCamera =
    startCamera;

window.stopCamera =
    stopCamera;

window.speakDetectedSign =
    speakDetectedSign;

window.startSpeechRecognition =
    startSpeechRecognition;

window.convertSpeechToSign =
    convertSpeechToSign;

    