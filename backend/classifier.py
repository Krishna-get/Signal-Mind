"""Trains (or loads) the signal-type Random Forest classifier."""

import os
import numpy as np
from scipy import signal as sp_signal
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib

from signal_utils import extract_features

CLASSES = ["sine", "square", "sawtooth", "ecg"]
FS = 500.0
N_POINTS = 512
MODEL_PATH = os.path.join(os.path.dirname(__file__), "signal_classifier.pkl")


# ---------------------------------------------------------------------------
# Synthetic signal generators
# ---------------------------------------------------------------------------

def _sine(t: np.ndarray, freq: float, noise: float) -> np.ndarray:
    return np.sin(2 * np.pi * freq * t) + np.random.normal(0, noise, len(t))


def _square(t: np.ndarray, freq: float, noise: float) -> np.ndarray:
    return sp_signal.square(2 * np.pi * freq * t) + np.random.normal(0, noise, len(t))


def _sawtooth(t: np.ndarray, freq: float, noise: float) -> np.ndarray:
    return sp_signal.sawtooth(2 * np.pi * freq * t) + np.random.normal(0, noise, len(t))


def _ecg(n: int, heart_rate: float, noise: float) -> np.ndarray:
    """Simplified P-QRS-T synthetic ECG."""
    t = np.linspace(0, n / FS, n)
    period = 1.0 / heart_rate
    sig = np.zeros(n)

    for beat_t in np.arange(0, t[-1], period):
        p = beat_t + 0.10 * period
        q = beat_t + 0.18 * period
        r = beat_t + 0.20 * period
        s = beat_t + 0.23 * period
        tw = beat_t + 0.36 * period

        sig += 0.25  * np.exp(-((t - p)  ** 2) / (2 * (0.018 * period) ** 2))
        sig -= 0.10  * np.exp(-((t - q)  ** 2) / (2 * (0.008 * period) ** 2))
        sig += 1.50  * np.exp(-((t - r)  ** 2) / (2 * (0.006 * period) ** 2))
        sig -= 0.30  * np.exp(-((t - s)  ** 2) / (2 * (0.008 * period) ** 2))
        sig += 0.40  * np.exp(-((t - tw) ** 2) / (2 * (0.040 * period) ** 2))

    return sig + np.random.normal(0, noise, n)


# ---------------------------------------------------------------------------
# Training data generation
# ---------------------------------------------------------------------------

def _generate_training_data(n_per_class: int = 600):
    X, y = [], []
    t = np.linspace(0, N_POINTS / FS, N_POINTS)

    rng = np.random.default_rng(42)

    for _ in range(n_per_class):
        freq  = rng.uniform(1.0, 40.0)
        noise = rng.uniform(0.0, 0.35)

        for cls_idx, gen in enumerate([
            lambda f, n: _sine(t, f, n),
            lambda f, n: _square(t, f, n),
            lambda f, n: _sawtooth(t, f, n),
            lambda f, n: _ecg(N_POINTS, rng.uniform(0.8, 2.8), n),
        ]):
            sig = gen(freq, noise)
            X.append(extract_features(sig.tolist(), FS))
            y.append(cls_idx)

    return np.array(X, dtype=np.float64), np.array(y)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def train_or_load_model() -> Pipeline:
    if os.path.exists(MODEL_PATH):
        print("[Signal Mind] Loading cached classifier …")
        return joblib.load(MODEL_PATH)

    print("[Signal Mind] Training Random Forest classifier (first run) …")
    X, y = _generate_training_data(600)

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )),
    ])
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    print("[Signal Mind] Classifier ready.")
    return model
