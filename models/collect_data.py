"""Record training samples from the webcam.
Run from the project root:  python models/collect_data.py
Press SPACE to record one sample (30 frames), Q to move to the next sign.
"""
import os
import sys

import cv2
import mediapipe as mp
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
from modules.sign_recognition import FEATURES, SEQ_LEN  # noqa: E402

SIGNS = ["hello", "thank_you", "help", "water", "doctor", "where", "registration", "desk", "yes", "no"]
SAMPLES_PER_SIGN = 40
DATA_DIR = os.path.join(BASE_DIR, "data", "signs")


def frame_features(results):
    hands = []
    if results.multi_hand_landmarks:
        for hand in results.multi_hand_landmarks:
            hands.append([[lm.x, lm.y, lm.z] for lm in hand.landmark])
    hands.sort(key=lambda h: h[0][0])  # sort by wrist x
    vec = np.zeros(FEATURES, dtype=np.float32)
    for i, hand in enumerate(hands[:2]):
        vec[i * 63:(i + 1) * 63] = np.array(hand).flatten()
    return vec


def main():
    cap = cv2.VideoCapture(0)
    with mp.solutions.hands.Hands(max_num_hands=2, min_detection_confidence=0.5) as hands:
        for sign in SIGNS:
            os.makedirs(os.path.join(DATA_DIR, sign), exist_ok=True)
            count = len(os.listdir(os.path.join(DATA_DIR, sign)))
            while count < SAMPLES_PER_SIGN:
                ok, img = cap.read()
                if not ok:
                    continue
                img = cv2.flip(img, 1)
                cv2.putText(img, f"{sign}: {count}/{SAMPLES_PER_SIGN}  SPACE=record Q=next",
                            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.imshow("collect", img)
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q"):
                    break
                if key == ord(" "):
                    seq = []
                    while len(seq) < SEQ_LEN:
                        ok, img = cap.read()
                        if not ok:
                            continue
                        img = cv2.flip(img, 1)
                        res = hands.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
                        seq.append(frame_features(res))
                        cv2.putText(img, "RECORDING", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                        cv2.imshow("collect", img)
                        cv2.waitKey(1)
                    np.save(os.path.join(DATA_DIR, sign, f"{count}.npy"), np.array(seq))
                    count += 1
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
