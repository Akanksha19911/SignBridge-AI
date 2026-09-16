// ============================================================
// SIGNBRIDGE AI - SIMPLE GLB AVATAR VIEWER
// ============================================================

const MODEL_URL =
    "/static/avatar/signbridge_avatar.glb";

let modelViewer = null;


// ============================================================
// LOAD MODEL-VIEWER LIBRARY
// ============================================================

function loadModelViewer() {

    return new Promise((resolve, reject) => {

        if (
            customElements.get(
                "model-viewer"
            )
        ) {
            resolve();
            return;
        }


        const script =
            document.createElement(
                "script"
            );


        script.type =
            "module";


        script.src =
            "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";


        script.onload = () => {

            console.log(
                "✅ model-viewer loaded"
            );

            resolve();
        };


        script.onerror = () => {

            reject(
                new Error(
                    "model-viewer library failed to load"
                )
            );
        };


        document.head.appendChild(
            script
        );
    });
}


// ============================================================
// CREATE AVATAR
// ============================================================

async function initAvatar() {

    const container =
        document.getElementById(
            "avatar3d-container"
        );


    if (!container) {

        console.error(
            "❌ avatar3d-container not found"
        );

        return;
    }


    try {

        await loadModelViewer();


        // Clear old avatar
        container.innerHTML = "";


        // Create actual 3D model viewer
        modelViewer =
            document.createElement(
                "model-viewer"
            );


        modelViewer.setAttribute(
            "src",
            MODEL_URL
        );


        modelViewer.setAttribute(
            "camera-controls",
            ""
        );


        modelViewer.setAttribute(
            "auto-rotate",
            ""
        );


        modelViewer.setAttribute(
            "shadow-intensity",
            "1"
        );


        modelViewer.setAttribute(
            "exposure",
            "1"
        );


        modelViewer.setAttribute(
            "camera-orbit",
            "0deg 75deg 3m"
        );


        modelViewer.setAttribute(
            "field-of-view",
            "30deg"
        );


        modelViewer.setAttribute(
            "interaction-prompt",
            "none"
        );


        modelViewer.setAttribute(
            "touch-action",
            "pan-y"
        );


        // Try first embedded animation
        modelViewer.setAttribute(
            "autoplay",
            ""
        );


        modelViewer.setAttribute(
            "animation-loop",
            ""
        );


        // Size
        modelViewer.style.width =
            "100%";

        modelViewer.style.height =
            "100%";

        modelViewer.style.display =
            "block";

        modelViewer.style.background =
            "linear-gradient(180deg,#eaf2f8,#f8fafc)";


        container.appendChild(
            modelViewer
        );


        // ====================================================
        // LOAD SUCCESS
        // ====================================================

        modelViewer.addEventListener(
            "load",
            function() {

                console.log(
                    "================================"
                );

                console.log(
                    "✅✅✅ 3D GLB MODEL LOADED ✅✅✅"
                );

                console.log(
                    "Model:",
                    MODEL_URL
                );

                console.log(
                    "Animations:",
                    modelViewer.availableAnimations
                );

                console.log(
                    "================================"
                );


                updateStatus(
                    "READY",
                    "NEUTRAL"
                );


                // Try to find a wave / hello animation
                playHelloAnimation();
            }
        );


        // ====================================================
        // MODEL ERROR
        // ====================================================

        modelViewer.addEventListener(
            "error",
            function(event) {

                console.error(
                    "❌ GLB MODEL ERROR:",
                    event
                );


                container.innerHTML = `
                    <div style="
                        height:100%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        text-align:center;
                        font-family:Arial,sans-serif;
                    ">
                        <div>
                            <div style="
                                font-size:42px;
                                margin-bottom:12px;
                            ">
                                ⚠️
                            </div>

                            <strong>
                                3D model failed to load
                            </strong>

                            <div style="
                                margin-top:8px;
                                color:#64748b;
                            ">
                                Check browser Console
                            </div>
                        </div>
                    </div>
                `;
            }
        );


        // ====================================================
        // STATUS
        // ====================================================

        updateStatus(
            "LOADING",
            "NEUTRAL"
        );


    } catch (error) {

        console.error(
            "❌ Avatar initialization failed:",
            error
        );
    }
}


// ============================================================
// HELLO ANIMATION
// ============================================================

function playHelloAnimation() {

    if (!modelViewer) {
        return;
    }


    const animations =
        modelViewer.availableAnimations || [];


    console.log(
        "Available animations:",
        animations
    );


    if (
        animations.length === 0
    ) {

        console.log(
            "ℹ️ GLB has no embedded animation."
        );


        updateStatus(
            "READY",
            "NEUTRAL"
        );


        return;
    }


    let selected =
        animations.find(
            name =>
                name.toLowerCase().includes(
                    "hello"
                )
        );


    if (!selected) {

        selected =
            animations.find(
                name =>
                    name.toLowerCase().includes(
                        "wave"
                    )
            );
    }


    if (!selected) {

        selected =
            animations[0];
    }


    modelViewer.animationName =
        selected;


    modelViewer.play();


    console.log(
        "▶ Playing avatar animation:",
        selected
    );


    updateStatus(
        "HELLO",
        "HAPPY"
    );
}


// ============================================================
// BACKEND → AVATAR
// ============================================================

export async function playSignSequence(
    sequence
) {

    console.log(
        "Backend avatar sequence:",
        sequence
    );


    if (
        !sequence ||
        sequence.length === 0
    ) {
        return;
    }


    for (
        const step of sequence
    ) {

        const gloss =
            String(
                step.gloss ||
                "READY"
            ).toUpperCase();


        const expression =
            String(
                step.expression ||
                "neutral"
            ).toUpperCase();


        updateStatus(
            gloss,
            expression
        );


        if (
            gloss === "HELLO"
        ) {

            playHelloAnimation();

        } else {

            playAnimation(
                step.animation
            );
        }


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    3000
                )
        );
    }
}


// ============================================================
// PLAY SPECIFIC ANIMATION
// ============================================================

function playAnimation(
    animationName
) {

    if (
        !modelViewer
    ) {
        return;
    }


    const animations =
        modelViewer.availableAnimations || [];


    const requested =
        String(
            animationName ||
            ""
        ).toLowerCase();


    const found =
        animations.find(
            name =>
                name.toLowerCase() ===
                requested
        );


    if (!found) {

        console.log(
            "No matching animation:",
            animationName
        );

        return;
    }


    modelViewer.animationName =
        found;


    modelViewer.play();


    console.log(
        "▶ Playing:",
        found
    );
}


// ============================================================
// STATUS
// ============================================================

function updateStatus(
    sign,
    expression
) {

    const signElement =
        document.getElementById(
            "currentSign"
        );


    const expressionElement =
        document.getElementById(
            "currentExpression"
        );


    if (signElement) {

        signElement.textContent =
            String(
                sign
            ).toUpperCase();
    }


    if (expressionElement) {

        expressionElement.textContent =
            String(
                expression
            ).toUpperCase();
    }
}


// ============================================================
// START
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initAvatar
    );

} else {

    initAvatar();
}