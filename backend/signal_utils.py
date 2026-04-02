"""DSP feature extraction utilities for Signal Mind classifier."""

import numpy as np
from scipy.fft import fft, fftfreq


def compute_rms(sig: np.ndarray) -> float:
    return float(np.sqrt(np.mean(sig ** 2)))


def compute_zcr(sig: np.ndarray) -> float:
    """Zero crossing rate — normalized count of sign changes."""
    return float(np.sum(np.diff(np.sign(sig)) != 0) / len(sig))


def compute_crest_factor(sig: np.ndarray) -> float:
    """Peak-to-RMS ratio. High for impulsive signals like ECG."""
    rms = compute_rms(sig)
    if rms < 1e-10:
        return 0.0
    return float(np.max(np.abs(sig)) / rms)


def compute_harmonic_ratio(sig: np.ndarray, fs: float) -> float:
    """Fraction of total spectral energy at harmonic multiples of the fundamental."""
    n = len(sig)
    freqs = fftfreq(n, 1.0 / fs)[:n // 2]
    mag = np.abs(fft(sig))[:n // 2]

    total_energy = float(np.sum(mag ** 2))
    if total_energy < 1e-10:
        return 0.0

    # Skip DC (index 0) when finding fundamental
    peak_idx = int(np.argmax(mag[1:])) + 1
    fund_freq = freqs[peak_idx]
    if fund_freq <= 0:
        return 0.0

    harmonic_energy = 0.0
    for h in range(1, 8):
        target = h * fund_freq
        if target > freqs[-1]:
            break
        idx = int(np.argmin(np.abs(freqs - target)))
        # Sum energy in a small window around each harmonic
        lo = max(0, idx - 2)
        hi = min(len(mag), idx + 3)
        harmonic_energy += float(np.sum(mag[lo:hi] ** 2))

    return float(harmonic_energy / total_energy)


def compute_spectral_centroid(sig: np.ndarray, fs: float) -> float:
    """Normalized spectral centroid (0–1, where 1 = Nyquist)."""
    n = len(sig)
    freqs = fftfreq(n, 1.0 / fs)[:n // 2]
    mag = np.abs(fft(sig))[:n // 2]

    total = float(np.sum(mag))
    if total < 1e-10:
        return 0.0
    return float(np.sum(freqs * mag) / total / (fs / 2.0))


def compute_snr(sig: np.ndarray, fs: float) -> float:
    """Spectral SNR estimate: ratio of top-5% bins to remaining bins (dB)."""
    n = len(sig)
    mag = np.abs(fft(sig))[:n // 2]

    sorted_mag = np.sort(mag)[::-1]
    k = max(1, len(sorted_mag) // 20)
    signal_power = float(np.sum(sorted_mag[:k] ** 2))
    noise_power = float(np.sum(sorted_mag[k:] ** 2))

    if noise_power < 1e-10:
        return 40.0
    return float(10.0 * np.log10(signal_power / noise_power))


def compute_spectral_flatness(sig: np.ndarray) -> float:
    """Wiener entropy: ratio of geometric to arithmetic mean of spectrum."""
    mag = np.abs(fft(sig))[:len(sig) // 2] + 1e-10
    log_mean = float(np.mean(np.log(mag)))
    arith_mean = float(np.mean(mag))
    return float(np.exp(log_mean) / arith_mean)


def extract_features(signal_array: list, fs: float = 500.0) -> np.ndarray:
    """Return the 7-element feature vector used by the classifier."""
    sig = np.array(signal_array, dtype=np.float64)
    return np.array([
        compute_rms(sig),
        compute_zcr(sig),
        compute_crest_factor(sig),
        compute_harmonic_ratio(sig, fs),
        compute_spectral_centroid(sig, fs),
        compute_snr(sig, fs),
        compute_spectral_flatness(sig),
    ], dtype=np.float64)
