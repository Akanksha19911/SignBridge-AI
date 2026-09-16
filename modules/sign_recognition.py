"""Landmark sequence -> predicted sign word.

Frame format (shared by frontend and collect_data.py):
  126 numbers = 2 hands x 21 landmarks x (x, y, z).
  Hands sorted by wrist x (left of image first). One hand -> slot 0, slot 1 all zeros.
  No hand -> 126 zeros. A sequence is 30 frames.
"""
import os
import joblib
import numpy as np

SEQ_LEN = 30
FEATURES = 126
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "sign_model.pkl")


def normalize_frame(frame) -> np.ndarray:
    arr = np.asarray(frame, dtype=np.float32).reshape(2, 21, 3).copy()
    for h in range(2):
        if np.any(arr[h]):
            arr[h] -= arr[h, 0]  # make landmarks relative to the wrist
    return arr.flatten()


def prepare_sequence(frames) -> np.ndarray:
    frames = list(frames)[-SEQ_LEN:]
    while len(frames) < SEQ_LEN:
        frames.insert(0, [0.0] * FEATURES)
    return np.stack([normalize_frame(f) for f in frames]).flatten()


class SignRecognizer:
    def __init__(self, path: str = MODEL_PATH):
        self.model, self.labels = None, []
        if os.path.exists(path):
            bundle = joblib.load(path)
            self.model, self.labels = bundle["model"], bundle["labels"]

    @property
    def ready(self) -> bool:
        return self.model is not None

    def predict(self, frames):
        x = prepare_sequence(frames).reshape(1, -1)
        probs = self.model.predict_proba(x)[0]
        idx = int(np.argmax(probs))
        return self.labels[idx], float(probs[idx])
