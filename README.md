# Signal Mind

An interactive Signal Processing + Machine Learning web application for EE/CS students.
Explore real-time waveforms, FFT spectra, digital filters, and ML-based signal classification — all in a dark oscilloscope-style HUD.

---

## Architecture

```
signal-mind/
├── frontend/        Next.js 15 + TypeScript + Tailwind CSS
│   ├── app/         Next.js app router (layout, page)
│   ├── components/  SignalControls, TimeDomainPlot, FFTChart, ClassifierPanel
│   └── lib/         Signal generators, client-side FFT
└── backend/         Python FastAPI + scikit-learn
    ├── main.py      /fft, /classify, /filter endpoints
    ├── classifier.py  Random Forest training & inference
    └── signal_utils.py  DSP feature extraction
```

---

## Quick Start

### 1 — Backend (Python ≥ 3.10)

```bash
cd signal-mind/backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The Random Forest classifier trains automatically on first launch (~5–10 seconds).
A cached model (`signal_classifier.pkl`) is saved for subsequent runs.

API docs: http://localhost:8000/docs

### 2 — Frontend (Node.js ≥ 18)

```bash
cd signal-mind/frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Features

| Panel | Description |
|-------|-------------|
| **Signal Generator** | Sine, Square, Sawtooth, ECG — adjustable frequency (0.5–50 Hz) and AWGN noise |
| **Time Domain Plot** | 60 fps canvas oscilloscope with CRT glow + scan-line overlay |
| **FFT Spectrum** | Server-computed FFT (falls back to client-side Cooley-Tukey when offline) |
| **Low-Pass Filter** | 1st-order IIR toggle (client) or 4th-order Butterworth via `/filter` endpoint |
| **ML Classifier** | Real-time confidence bars from a 200-tree Random Forest trained on DSP features |

---

## DSP Feature Vector (7 dimensions)

| # | Feature | Description |
|---|---------|-------------|
| f₁ | RMS Energy | Root-mean-square signal amplitude |
| f₂ | Zero Crossing Rate | Normalised sign-change frequency |
| f₃ | Crest Factor | Peak-to-RMS ratio (high for ECG) |
| f₄ | Harmonic Ratio | Energy fraction at harmonic multiples |
| f₅ | Spectral Centroid | Normalised frequency-of-mass-center |
| f₆ | SNR | Top-5% spectral bins vs. remainder (dB) |
| f₇ | Spectral Flatness | Geometric/arithmetic mean ratio of spectrum |

---

## API Reference

### `POST /fft`
```json
{ "signal": [0.1, 0.3, ...], "sample_rate": 500.0 }
```
Returns `{ frequencies: [...], magnitudes: [...] }` — one-sided magnitude spectrum.

### `POST /classify`
```json
{ "signal": [0.1, 0.3, ...], "sample_rate": 500.0 }
```
Returns `{ probabilities: { sine, square, sawtooth, ecg }, predicted_class, confidence }`.

### `POST /filter?cutoff=40`
```json
{ "signal": [...], "sample_rate": 500.0 }
```
Returns `{ filtered: [...] }` — 4th-order Butterworth low-pass output.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 3, Canvas API |
| Backend | FastAPI, scikit-learn, NumPy, SciPy, Pydantic v2 |
| ML Model | Random Forest (200 trees), StandardScaler pipeline |
| Fonts | JetBrains Mono (via next/font) |
