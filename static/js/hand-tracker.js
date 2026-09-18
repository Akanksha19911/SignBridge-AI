import { HandLandmarker, FilesetResolver } from "/static/vendor/mediapipe/vision_bundle.mjs";

const WASM_URL = "/static/vendor/mediapipe/wasm";
const MODEL_URL = "/static/vendor/models/hand_landmarker.task";
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

let sharedFileset = null;

export function buildFrame(result) {
  const frame = new Array(126).fill(0);
  const hands = (result?.landmarks || [])
    .slice(0, 2)
    .map((landmarks) => ({
      landmarks,
      mirroredWristX: landmarks?.[0] ? 1 - landmarks[0].x : 1,
    }))
    .sort((a, b) => a.mirroredWristX - b.mirroredWristX);

  hands.forEach((hand, handIndex) => {
    const offset = handIndex * 63;
    for (let landmarkIndex = 0; landmarkIndex < 21; landmarkIndex += 1) {
      const landmark = hand.landmarks[landmarkIndex];
      if (!landmark) {
        continue;
      }
      const pointOffset = offset + landmarkIndex * 3;
      frame[pointOffset] = 1 - landmark.x;
      frame[pointOffset + 1] = landmark.y;
      frame[pointOffset + 2] = landmark.z;
    }
  });

  return frame;
}

export class HandTracker {
  constructor({ onFrame, onError } = {}) {
    this.onFrame = onFrame || (() => {});
    this.onError = onError || (() => {});
    this.landmarker = null;
    this.stream = null;
    this.videoEl = null;
    this.canvasEl = null;
    this.ctx = null;
    this.rafId = 0;
    this.running = false;
    this.buffer = [];
    this.handHistory = [];
  }

  async start(videoEl, canvasEl) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.buffer = [];
    this.handHistory = [];

    this.landmarker = this.landmarker || await createLandmarker();
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    videoEl.srcObject = this.stream;
    await videoEl.play();

    this.syncCanvasSize();
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
    }

    if (this.ctx && this.canvasEl) {
      this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    }
  }

  getBuffer() {
    return this.buffer.map((frame) => [...frame]);
  }

  getRecentHandsDetectedCount() {
    return this.handHistory.filter(Boolean).length;
  }

  loop() {
    if (!this.running) {
      return;
    }

    if (this.videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        const result = this.landmarker.detectForVideo(this.videoEl, performance.now());
        const frame = buildFrame(result);
        const handsDetected = Boolean(result.landmarks?.length);
        this.pushFrame(frame, handsDetected);
        this.draw(result);
        this.onFrame({ frame, handsDetected });
      } catch (error) {
        this.onError(error);
      }
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  pushFrame(frame, handsDetected) {
    this.buffer.push(frame);
    this.handHistory.push(handsDetected);
    if (this.buffer.length > 30) {
      this.buffer.shift();
      this.handHistory.shift();
    }
  }

  syncCanvasSize() {
    const width = this.videoEl.videoWidth || 640;
    const height = this.videoEl.videoHeight || 480;
    this.canvasEl.width = width;
    this.canvasEl.height = height;
  }

  draw(result) {
    this.syncCanvasSize();
    const { width, height } = this.canvasEl;
    this.ctx.clearRect(0, 0, width, height);

    (result.landmarks || []).forEach((landmarks) => {
      const styles = getComputedStyle(this.canvasEl);
      const rootStyles = getComputedStyle(document.documentElement);
      const lineColor = styles.getPropertyValue("--landmark-line").trim()
        || rootStyles.getPropertyValue("--accent").trim()
        || "CanvasText";
      const dotColor = styles.getPropertyValue("--landmark-dot").trim()
        || rootStyles.getPropertyValue("--coral").trim()
        || "CanvasText";
      this.ctx.strokeStyle = lineColor;
      this.ctx.lineWidth = 3;
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const a = landmarks[start];
        const b = landmarks[end];
        if (!a || !b) {
          return;
        }
        this.ctx.beginPath();
        this.ctx.moveTo(a.x * width, a.y * height);
        this.ctx.lineTo(b.x * width, b.y * height);
        this.ctx.stroke();
      });

      this.ctx.fillStyle = dotColor;
      landmarks.forEach((landmark) => {
        this.ctx.beginPath();
        this.ctx.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2);
        this.ctx.fill();
      });
    });
  }
}

async function createLandmarker() {
  sharedFileset = sharedFileset || await FilesetResolver.forVisionTasks(WASM_URL);
  try {
    return await createWithDelegate("GPU");
  } catch (gpuError) {
    return createWithDelegate("CPU");
  }
}

function createWithDelegate(delegate) {
  return HandLandmarker.createFromOptions(sharedFileset, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}
