// ============================================================
// SIGNBRIDGE AI
// script.js
// ============================================================

import { playSignSequence } from "./avatar3d.js";


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let cameraStream = null;
let recognition = null;
let isListening = false;


// ============================================================
// FEATURE 1
// MEDIA → SIGN
// ============================================================

async function uploadMedia() {

    const fileInput =
        document.getElementById("mediaFile");

    const result =
        document.getElementById("mediaResult");


    if (!fileInput) {

        console.error(
            "mediaFile element not found."
        );

        return;
    }


    if (!result) {

        console.error(
            "mediaResult element not found."
        );

        return;
    }


    if (!fileInput.files.length) {

        result.innerHTML =
            "⚠️ Please select an audio or video file.";

        return;
    }


    const file =
        fileInput.files[0];


    const formData =
        new FormData();


    formData.append(
        "file",
        file
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


        if (!response.ok) {

            throw new Error(
                "Server returned " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "Upload response:",
            data
        );


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
                "❌ " +
                (
                    data.message ||
                    "Upload failed."
                );
        }


    } catch (error) {

        console.error(
            "Upload error:",
            error
        );


        result.innerHTML =
            "❌ Could not upload the file.";
    }
}


// ============================================================
// FEATURE 2
// CAMERA
// ============================================================

async function startCamera() {

    const video =
        document.getElementById(
            "camera"
        );


    const detectedSign =
        document.getElementById(
            "detectedSign"
        );


    if (!video) {

        console.error(
            "Camera video element not found."
        );

        return;
    }


    try {

        // Stop an existing stream
        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );
        }


        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({
                    video: {
                        facingMode: "user"
                    },
                    audio: false
                });


        video.srcObject =
            cameraStream;


        if (detectedSign) {

            detectedSign.innerText =
                "Camera active — waiting for AI sign detection...";
        }


        console.log(
            "Camera started."
        );


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        alert(
            "Camera permission was denied or the camera is unavailable."
        );
    }
}


// ============================================================
// STOP CAMERA
// ============================================================

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );


        cameraStream =
            null;
    }


    const video =
        document.getElementById(
            "camera"
        );


    if (video) {

        video.srcObject =
            null;
    }


    const detectedSign =
        document.getElementById(
            "detectedSign"
        );


    if (detectedSign) {

        detectedSign.innerText =
            "Camera stopped.";
    }


    console.log(
        "Camera stopped."
    );
}


// ============================================================
// SIGN → SPEECH
// ============================================================

function speakDetectedSign() {

    const detectedElement =
        document.getElementById(
            "detectedSign"
        );


    if (!detectedElement) {

        console.error(
            "detectedSign element not found."
        );

        return;
    }


    const text =
        detectedElement.innerText.trim();


    if (
        !text ||
        text.includes("Waiting") ||
        text.includes("Camera active") ||
        text.includes("Camera stopped") ||
        text.includes("No sign")
    ) {

        alert(
            "No sign has been detected yet."
        );

        return;
    }


    if (
        !("speechSynthesis" in window)
    ) {

        alert(
            "Text-to-speech is not supported in this browser."
        );

        return;
    }


    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.lang =
        "en-IN";


    speech.rate =
        0.9;


    speech.pitch =
        1;


    speech.volume =
        1;


    window.speechSynthesis.speak(
        speech
    );


    console.log(
        "Speaking:",
        text
    );
}


// ============================================================
// SPEECH RECOGNITION
// ============================================================

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


    // Prevent duplicate sessions
    if (isListening) {

        console.log(
            "Speech recognition is already running."
        );

        return;
    }


    recognition =
        new SpeechRecognition();


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.maxAlternatives =
        1;


    // ========================================================
    // LANGUAGE
    // ========================================================

    const languageElement =
        document.getElementById(
            "language"
        );


    const selectedLanguage =
        languageElement
            ? languageElement.value
            : "en";


    if (
        selectedLanguage === "hi"
    ) {

        recognition.lang =
            "hi-IN";

    } else {

        recognition.lang =
            "en-IN";
    }


    // ========================================================
    // START
    // ========================================================

    recognition.onstart =
        function () {

            isListening =
                true;


            const speechText =
                document.getElementById(
                    "speechText"
                );


            if (speechText) {

                speechText.value =
                    "Listening...";
            }


            console.log(
                "🎤 Speech recognition started."
            );
        };


    // ========================================================
    // RESULT
    // ========================================================

    recognition.onresult =
        function (event) {

            let transcript =
                "";


            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                if (
                    event.results[i].isFinal
                ) {

                    transcript +=
                        event.results[i][0]
                            .transcript;
                }
            }


            transcript =
                transcript.trim();


            const speechText =
                document.getElementById(
                    "speechText"
                );


            if (
                speechText &&
                transcript
            ) {

                speechText.value =
                    transcript;
            }


            console.log(
                "✅ Recognized:",
                transcript
            );
        };


    // ========================================================
    // ERROR
    // ========================================================

    recognition.onerror =
        function (event) {

            isListening =
                false;


            console.error(
                "Speech recognition error:",
                event.error
            );


            const speechText =
                document.getElementById(
                    "speechText"
                );


            if (
                speechText &&
                speechText.value ===
                    "Listening..."
            ) {

                speechText.value =
                    "";
            }


            switch (
                event.error
            ) {

                case "not-allowed":

                    alert(
                        "Microphone permission is blocked. Allow microphone access in Chrome."
                    );

                    break;


                case "no-speech":

                    alert(
                        "No speech was detected. Please speak clearly and try again."
                    );

                    break;


                case "audio-capture":

                    alert(
                        "No microphone was detected."
                    );

                    break;


                case "network":

                    alert(
                        "Speech recognition needs an internet connection."
                    );

                    break;


                case "aborted":

                    console.log(
                        "Speech recognition aborted."
                    );

                    break;


                default:

                    alert(
                        "Speech recognition error: " +
                        event.error
                    );
            }
        };


    // ========================================================
    // END
    // ========================================================

    recognition.onend =
        function () {

            isListening =
                false;


            console.log(
                "🎤 Speech recognition ended."
            );
        };


    // ========================================================
    // START RECOGNITION
    // ========================================================

    try {

        recognition.start();

    } catch (error) {

        isListening =
            false;


        console.error(
            "Could not start speech recognition:",
            error
        );
    }
}


// ============================================================
// STOP SPEECH RECOGNITION
// ============================================================

function stopSpeechRecognition() {

    if (recognition) {

        try {

            recognition.stop();

        } catch (error) {

            console.error(
                "Could not stop recognition:",
                error
            );
        }
    }


    isListening =
        false;


    console.log(
        "Speech recognition stopped."
    );
}


// ============================================================
// SPEECH → SIGN
// ============================================================

async function convertSpeechToSign() {

    const speechText =
        document.getElementById(
            "speechText"
        );


    const glossOutput =
        document.getElementById(
            "glossOutput"
        );


    const languageElement =
        document.getElementById(
            "language"
        );


    if (!speechText) {

        console.error(
            "speechText element not found."
        );

        return;
    }


    const text =
        speechText.value.trim();


    const language =
        languageElement
            ? languageElement.value
            : "en";


    // ========================================================
    // VALIDATE
    // ========================================================

    if (
        !text ||
        text === "Listening..."
    ) {

        alert(
            "Please speak something first."
        );

        return;
    }


    if (
        isListening
    ) {

        stopSpeechRecognition();
    }


    if (glossOutput) {

        glossOutput.innerText =
            "⏳ Converting...";
    }


    // ========================================================
    // SEND TO FLASK
    // ========================================================

    try {

        const response =
            await fetch(
                "/text-to-sign",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            text:
                                text,

                            language:
                                language
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                "Server returned HTTP " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "Text-to-sign response:",
            data
        );


        // ====================================================
        // SERVER ERROR
        // ====================================================

        if (!data.success) {

            if (glossOutput) {

                glossOutput.innerText =
                    "❌ " +
                    (
                        data.message ||
                        "Conversion failed."
                    );
            }

            return;
        }


        // ====================================================
        // DISPLAY GLOSS
        // ====================================================

        if (glossOutput) {

            if (
                data.gloss &&
                data.gloss.length
            ) {

                glossOutput.innerText =
                    data.gloss.join(
                        " → "
                    );

            } else {

                glossOutput.innerText =
                    "No gloss generated.";
            }
        }


        // ====================================================
        // AVATAR
        // ====================================================

        if (
            data.avatar &&
            data.avatar.length
        ) {

            console.log(
                "Sending sequence to avatar:",
                data.avatar
            );


            playSignSequence(
                data.avatar
            );

        } else {

            console.log(
                "No avatar sequence returned."
            );
        }


    } catch (error) {

        console.error(
            "Speech-to-sign error:",
            error
        );


        if (glossOutput) {

            glossOutput.innerText =
                "❌ Could not connect to SignBridge backend.";
        }


        alert(
            "Could not connect to the SignBridge backend."
        );
    }
}


// ============================================================
// OPTIONAL: ENTER KEY
// ============================================================

function setupKeyboardShortcut() {

    const speechText =
        document.getElementById(
            "speechText"
        );


    if (!speechText) {
        return;
    }


    speechText.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                event.ctrlKey
            ) {

                event.preventDefault();

                convertSpeechToSign();
            }
        }
    );
}


// ============================================================
// PAGE CLEANUP
// ============================================================

window.addEventListener(
    "beforeunload",
    function() {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );
        }


        if (
            recognition &&
            isListening
        ) {

            try {

                recognition.stop();

            } catch (error) {

                console.error(
                    error
                );
            }
        }


        if (
            "speechSynthesis" in window
        ) {

            window.speechSynthesis.cancel();
        }
    }
);


// ============================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ============================================================

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

window.stopSpeechRecognition =
    stopSpeechRecognition;

window.convertSpeechToSign =
    convertSpeechToSign;


// ============================================================
// INITIALIZE
// ============================================================

setupKeyboardShortcut();


console.log(
    "✅ SignBridge script.js loaded."
);