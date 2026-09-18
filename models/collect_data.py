"""Record sign training samples from the webcam.

Run from the project root:   python models/collect_data.py
SPACE records one sample (30 frames). Q moves to the next sign. ESC quits.

Works with both MediaPipe versions:
  - old (0.10.14 and similar): mediapipe.solutions.hands
  - new (0.10.30+ and 1.x): the Tasks HandLandmarker API
"""
import os
import sys
import urllib.request

import cv2
import mediapipe as mp
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
from modules.sign_recognition import FEATURES, SEQ_LEN  # noqa: E402

SIGNS = ["hello", "thank_you", "please", "yes", "no", "where", "help", "water"]
SAMPLES_PER_SIGN = 40
DATA_DIR = os.path.join(BASE_DIR, "data", "signs")

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
MODEL_CANDIDATES = [
    os.path.join(BASE_DIR, "static", "vendor", "hand_landmarker.task"),
    os.path.join(BASE_DIR, "static", "vendor", "mediapipe", "hand_landmarker.task"),
    os.path.join(BASE_DIR, "models", "hand_landmarker.task"),
]


# ----------------------------------------------------------------------
# DETECTOR (old or new MediaPipe)
# ----------------------------------------------------------------------

def find_or_download_model():
    for path in MODEL_CANDIDATES:
        if os.path.exists(path):
            return path
    target = MODEL_CANDIDATES[-1]
    os.makedirs(os.path.dirname(target), exist_ok=True)
    print("Downloading hand landmark model (about 8 MB)...")
    urllib.request.urlretrieve(MODEL_URL, target)
    return target


class HandDetector:
    """Returns a list of hands, each a list of 21 (x, y, z) landmarks."""

    def __init__(self):
        self.legacy = hasattr(mp, "solutions")
        if self.legacy:
            self.hands = mp.solutions.hands.Hands(max_num_hands=2, min_detection_confidence=0.5)
            print("Using MediaPipe solutions API")
        else:
            from mediapipe.tasks.python import BaseOptions
            from mediapipe.tasks.python import vision

            model_path = find_or_download_model()
            options = vision.HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=model_path),
                running_mode=vision.RunningMode.VIDEO,
                num_hands=2,
            )
            self.landmarker = vision.HandLandmarker.create_from_options(options)
            self.timestamp = 0
            print("Using MediaPipe Tasks API")

    def detect(self, bgr_image):
        rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
        hands = []
        if self.legacy:
            result = self.hands.process(rgb)
            if result.multi_hand_landmarks:
                for hand in result.multi_hand_landmarks:
                    hands.append([[lm.x, lm.y, lm.z] for lm in hand.landmark])
        else:
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            self.timestamp += 33
            result = self.landmarker.detect_for_video(image, self.timestamp)
            for hand in result.hand_landmarks:
                hands.append([[lm.x, lm.y, lm.z] for lm in hand])
        return hands

    def close(self):
        if self.legacy:
            self.hands.close()
        else:
            self.landmarker.close()


# ----------------------------------------------------------------------
# FRAME FORMAT (must match modules/sign_recognition.py and the frontend)
# ----------------------------------------------------------------------

def frame_features(hands):
    hands = sorted(hands, key=lambda h: h[0][0])  # sort by wrist x
    vector = np.zeros(FEATURES, dtype=np.float32)
    for index, hand in enumerate(hands[:2]):
        vector[index * 63:(index + 1) * 63] = np.array(hand, dtype=np.float32).flatten()
    return vector


def draw_hands(image, hands):
    height, width = image.shape[:2]
    for hand in hands:
        for point in hand:
            cv2.circle(image, (int(point[0] * width), int(point[1] * height)), 4, (0, 255, 0), -1)


# ----------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------

def main():
    detector = HandDetector()
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        print("Could not open the camera. Check camera permissions and try again.")
        return

    try:
        for sign in SIGNS:
            folder = os.path.join(DATA_DIR, sign)
            os.makedirs(folder, exist_ok=True)
            count = len([f for f in os.listdir(folder) if f.endswith(".npy")])

            while count < SAMPLES_PER_SIGN:
                ok, image = camera.read()
                if not ok:
                    continue
                image = cv2.flip(image, 1)
                hands = detector.detect(image)
                draw_hands(image, hands)
                cv2.putText(image, f"{sign}: {count}/{SAMPLES_PER_SIGN}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(image, "SPACE = record   Q = next sign   ESC = quit", (10, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(image, f"hands: {len(hands)}", (10, 90),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                cv2.imshow("SignBridge: record signs", image)

                key = cv2.waitKey(1) & 0xFF
                if key == 27:
                    return
                if key == ord("q"):
                    break
                if key == ord(" "):
                    sequence = []
                    while len(sequence) < SEQ_LEN:
                        ok, image = camera.read()
                        if not ok:
                            continue
                        image = cv2.flip(image, 1)
                        hands = detector.detect(image)
                        sequence.append(frame_features(hands))
                        draw_hands(image, hands)
                        cv2.putText(image, "RECORDING", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)
                        cv2.imshow("SignBridge: record signs", image)
                        cv2.waitKey(1)
                    np.save(os.path.join(folder, f"{count}.npy"), np.array(sequence))
                    count += 1
                    print(f"{sign}: {count}/{SAMPLES_PER_SIGN}")
    finally:
        camera.release()
        cv2.destroyAllWindows()
        detector.close()
        print("Done. Samples are in data/signs/")


if __name__ == "__main__":
    main()
