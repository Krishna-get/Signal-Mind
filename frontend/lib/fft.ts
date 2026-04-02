/**
 * Cooley-Tukey radix-2 in-place FFT (client-side fallback).
 * Input length must be a power of two.
 */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // Butterfly passes
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const ang = (2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = -Math.sin(ang);

    for (let i = 0; i < n; i += len) {
      let uRe = 1.0;
      let uIm = 0.0;
      for (let j = 0; j < halfLen; j++) {
        const vRe = re[i + j + halfLen] * uRe - im[i + j + halfLen] * uIm;
        const vIm = re[i + j + halfLen] * uIm + im[i + j + halfLen] * uRe;
        re[i + j + halfLen] = re[i + j] - vRe;
        im[i + j + halfLen] = im[i + j] - vIm;
        re[i + j] += vRe;
        im[i + j] += vIm;
        const nextURe = uRe * wRe - uIm * wIm;
        uIm = uRe * wIm + uIm * wRe;
        uRe = nextURe;
      }
    }
  }
}

export interface FFTResult {
  frequencies: number[];
  magnitudes: number[];
}

/** Compute FFT magnitude spectrum for a real signal. */
export function computeFFT(signal: number[], sampleRate: number): FFTResult {
  // Pad or truncate to nearest power of two
  let n = 1;
  while (n < signal.length) n <<= 1;
  n = Math.min(n, signal.length); // don't pad beyond signal length

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = signal[i] ?? 0;

  fftInPlace(re, im);

  const half = n >> 1;
  const frequencies: number[] = new Array(half);
  const magnitudes: number[] = new Array(half);
  for (let k = 0; k < half; k++) {
    frequencies[k] = (k * sampleRate) / n;
    magnitudes[k] = (2 / n) * Math.sqrt(re[k] ** 2 + im[k] ** 2);
  }
  return { frequencies, magnitudes };
}
