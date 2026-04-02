export type SignalType = 'sine' | 'square' | 'sawtooth' | 'ecg';

export const SAMPLE_RATE = 500; // Hz
export const NUM_SAMPLES = 512;

/** Generate one ECG sample at time t (seconds) for a given heart-rate freq (Hz). */
function ecgSample(t: number, freq: number): number {
  const period = 1.0 / freq;
  const tMod = ((t % period) + period) % period;

  // P wave
  let v = 0.25 * Math.exp(-((tMod - 0.10 * period) ** 2) / (2 * (0.018 * period) ** 2));
  // Q dip
  v -= 0.10 * Math.exp(-((tMod - 0.18 * period) ** 2) / (2 * (0.008 * period) ** 2));
  // R peak
  v += 1.50 * Math.exp(-((tMod - 0.20 * period) ** 2) / (2 * (0.006 * period) ** 2));
  // S dip
  v -= 0.30 * Math.exp(-((tMod - 0.23 * period) ** 2) / (2 * (0.008 * period) ** 2));
  // T wave
  v += 0.40 * Math.exp(-((tMod - 0.36 * period) ** 2) / (2 * (0.040 * period) ** 2));
  return v;
}

/** Sawtooth sample in [-1, 1]. */
function sawtooth(t: number, freq: number): number {
  return 2 * (t * freq - Math.floor(t * freq + 0.5));
}

/**
 * Generate a signal buffer.
 * @param offset  Animation phase offset (integer sample ticks).
 */
export function generateSignal(
  type: SignalType,
  frequency: number,
  noiseLevel: number,
  offset: number
): number[] {
  const out = new Array<number>(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = (i + offset) / SAMPLE_RATE;
    let s: number;
    switch (type) {
      case 'sine':
        s = Math.sin(2 * Math.PI * frequency * t);
        break;
      case 'square':
        s = Math.sign(Math.sin(2 * Math.PI * frequency * t));
        break;
      case 'sawtooth':
        s = sawtooth(t, frequency);
        break;
      case 'ecg':
        s = ecgSample(t, frequency);
        break;
    }
    out[i] = s + (Math.random() * 2 - 1) * noiseLevel;
  }
  return out;
}

/**
 * 1st-order IIR low-pass filter.
 * alpha = fc / (fc + 1), with fc as normalised cutoff (0–1).
 */
export function applyLowPassFilter(signal: number[], normalizedCutoff = 0.15): number[] {
  const alpha = normalizedCutoff / (normalizedCutoff + 1);
  const out = new Array<number>(signal.length);
  out[0] = signal[0];
  for (let i = 1; i < signal.length; i++) {
    out[i] = alpha * signal[i] + (1 - alpha) * out[i - 1];
  }
  return out;
}
