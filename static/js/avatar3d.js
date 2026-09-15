// ======================================================
// SignBridge AI - 3D Avatar Engine
// ======================================================

import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { OrbitControls } from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

import { GLTFLoader } from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";


// ------------------------------------------------------
// Scene
// ------------------------------------------------------

const scene = new THREE.Scene();

scene.background = new THREE.Color(0xf1f5f9);


// ------------------------------------------------------
// Camera
// ------------------------------------------------------

const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(0, 1.5, 4);


// ------------------------------------------------------
// Renderer
// ------------------------------------------------------

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setPixelRatio(window.devicePixelRatio);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.shadowMap.enabled = true;

document
    .getElementById("avatar3d-container")
    .appendChild(renderer.domElement);


// ------------------------------------------------------
// Lighting
// ------------------------------------------------------

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    2
);

scene.add(ambientLight);


const keyLight = new THREE.DirectionalLight(
    0xffffff,
    3
);

keyLight.position.set(2, 4, 3);

keyLight.castShadow = true;

scene.add(keyLight);


const fillLight = new THREE.DirectionalLight(
    0xffffff,
    1
);

fillLight.position.set(-3, 2, 2);

scene.add(fillLight);


// ------------------------------------------------------
// Avatar Controls
// ------------------------------------------------------

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.enablePan = false;

controls.minDistance = 2;

controls.maxDistance = 6;

controls.target.set(0, 1.3, 0);


// ------------------------------------------------------
// GLB Loader
// ------------------------------------------------------

const loader = new GLTFLoader();

let avatar = null;

let mixer = null;

let animations = {};


// ------------------------------------------------------
// Load SignBridge Avatar
// ------------------------------------------------------

loader.load(

    "/static/avatar/signbridge_avatar.glb",

    function (gltf) {

        avatar = gltf.scene;

        avatar.position.set(
            0,
            -1.4,
            0
        );

        avatar.scale.set(
            1,
            1,
            1
        );


        avatar.traverse(function (object) {

            if (object.isMesh) {

                object.castShadow = true;

                object.receiveShadow = true;

            }

        });


        scene.add(avatar);


        // ----------------------------------------------
        // Animation system
        // ----------------------------------------------

        if (gltf.animations &&
            gltf.animations.length > 0) {

            mixer = new THREE.AnimationMixer(
                avatar
            );

            gltf.animations.forEach(
                function (clip) {

                    animations[clip.name] =
                        mixer.clipAction(clip);

                }
            );

            console.log(
                "Avatar animations:",
                Object.keys(animations)
            );
        }

        console.log(
            "SignBridge 3D Avatar loaded."
        );
    },

    function (progress) {

        console.log(
            "Loading avatar:",
            (progress.loaded /
            progress.total * 100) + "%"
        );

    },

    function (error) {

        console.error(
            "Could not load SignBridge avatar:",
            error
        );

    }
);


// ------------------------------------------------------
// Play Animation
// ------------------------------------------------------

export function playAvatarAnimation(
    animationName
) {

    if (!mixer) {

        console.log(
            "Avatar animation system not ready."
        );

        return;
    }


    const action =
        animations[animationName];


    if (!action) {

        console.log(
            "Animation not found:",
            animationName
        );

        return;
    }


    // Stop current animations

    Object.values(animations).forEach(
        function (animation) {

            animation.stop();

        }
    );


    action.reset();

    action.fadeIn(0.2);

    action.play();


    console.log(
        "Playing:",
        animationName
    );
}


// ------------------------------------------------------
// Facial Expression
// ------------------------------------------------------

export function setExpression(
    expression
) {

    if (!avatar) {
        return;
    }


    console.log(
        "Expression:",
        expression
    );


    /*
       If your 3D model contains facial
       morph targets/blend shapes, we can
       control them here.

       Example:

       HAPPY
       SAD
       SURPRISED
       THINKING
       NEUTRAL
    */


    avatar.traverse(function (object) {

        if (!object.isMesh) {
            return;
        }


        if (!object.morphTargetDictionary) {
            return;
        }


        const dictionary =
            object.morphTargetDictionary;

        const influences =
            object.morphTargetInfluences;


        // Reset expressions

        for (
            const key in dictionary
        ) {

            influences[
                dictionary[key]
            ] = 0;

        }


        // Example mappings

        if (
            expression === "happy" &&
            dictionary["mouthSmile"]
        ) {

            influences[
                dictionary["mouthSmile"]
            ] = 1;

        }


        if (
            expression === "surprised" &&
            dictionary["jawOpen"]
        ) {

            influences[
                dictionary["jawOpen"]
            ] = 0.8;

        }

    });
}


// ------------------------------------------------------
// Animation Loop
// ------------------------------------------------------

const clock = new THREE.Clock();


function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        clock.getDelta();


    if (mixer) {

        mixer.update(delta);

    }


    controls.update();

    renderer.render(
        scene,
        camera
    );
}


animate();


// ------------------------------------------------------
// Responsive
// ------------------------------------------------------

window.addEventListener(
    "resize",
    function () {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);
export async function playSignSequence(
    sequence
) {

    if (!sequence) {
        return;
    }


    for (
        const step of sequence
    ) {

        document.getElementById(
            "currentSign"
        ).textContent =
            step.gloss;


        document.getElementById(
            "currentExpression"
        ).textContent =
            step.expression;


        setExpression(
            step.expression
        );


        playAvatarAnimation(
            step.animation
        );


        // Time for the avatar
        // to perform the sign

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1500
                )
        );

    }

}

