"""Signal Mind — FastAPI backend."""

from contextlib import asynccontextmanager
from typing import List

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.fft import fft, fftfreq
from scipy.signal import butter, lfilter

from classifier import CLASSES, train_or_load_model
from signal_utils import extract_features


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    _model = train_or_load_model()
    yield


app = FastAPI(title="Signal Mind API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SignalRequest(BaseModel):
    signal: List[float]
    sample_rate: float = 500.0


class ClassifyResponse(BaseModel):
    probabilities: dict
    predicted_class: str
    confidence: float


class FFTResponse(BaseModel):
    frequencies: List[float]
    magnitudes: List[float]


class FilterResponse(BaseModel):
    filtered: List[float]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.post("/fft", response_model=FFTResponse)
async def compute_fft(req: SignalRequest):
    if len(req.signal) < 8:
        raise HTTPException(400, "Signal must have at least 8 samples.")

    sig = np.array(req.signal, dtype=np.float64)
    n = len(sig)
    freqs = fftfreq(n, d=1.0 / req.sample_rate)[: n // 2]
    mags = (2.0 / n) * np.abs(fft(sig))[: n // 2]

    return FFTResponse(frequencies=freqs.tolist(), magnitudes=mags.tolist())


@app.post("/classify", response_model=ClassifyResponse)
async def classify_signal(req: SignalRequest):
    if _model is None:
        raise HTTPException(503, "Classifier not initialised yet.")
    if len(req.signal) < 64:
        raise HTTPException(400, "Signal must have at least 64 samples.")

    feats = extract_features(req.signal, req.sample_rate).reshape(1, -1)
    probs: np.ndarray = _model.predict_proba(feats)[0]

    best_idx = int(np.argmax(probs))
    return ClassifyResponse(
        probabilities={cls: float(p) for cls, p in zip(CLASSES, probs)},
        predicted_class=CLASSES[best_idx],
        confidence=float(probs[best_idx]),
    )


@app.post("/filter", response_model=FilterResponse)
async def low_pass_filter(req: SignalRequest, cutoff: float = 40.0):
    """Apply a 4th-order Butterworth low-pass filter."""
    nyq = req.sample_rate / 2.0
    if cutoff >= nyq:
        return FilterResponse(filtered=req.signal)

    b, a = butter(4, cutoff / nyq, btype="low")
    sig = np.array(req.signal, dtype=np.float64)
    filtered = lfilter(b, a, sig)
    return FilterResponse(filtered=filtered.tolist())
