"""Train the sign classifier. Run from the project root:  python models/train_model.py"""
import os
import sys

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
from modules.sign_recognition import MODEL_PATH, prepare_sequence  # noqa: E402

DATA_DIR = os.path.join(BASE_DIR, "data", "signs")


def main():
    X, y = [], []
    labels = sorted(d for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d)))
    for label in labels:
        for fname in os.listdir(os.path.join(DATA_DIR, label)):
            if fname.endswith(".npy"):
                X.append(prepare_sequence(np.load(os.path.join(DATA_DIR, label, fname))))
                y.append(labels.index(label))
    X, y = np.array(X), np.array(y)
    print(f"{len(X)} samples, {len(labels)} signs")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = RandomForestClassifier(n_estimators=300, random_state=42)
    model.fit(X_train, y_train)
    print(classification_report(y_test, model.predict(X_test), target_names=labels))

    joblib.dump({"model": model, "labels": labels}, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
