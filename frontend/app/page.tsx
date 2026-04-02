'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ClassifierPanel from '@/components/ClassifierPanel';
import FFTChart from '@/components/FFTChart';
import SignalControls from '@/components/SignalControls';
import TimeDomainPlot from '@/components/TimeDomainPlot';
import { computeFFT, type FFTResult } from '@/lib/fft';
import {
  applyLowPassFilter,
  generateSignal,
  NUM_SAMPLES,
  SAMPLE_RATE,
  type SignalType,
} from '@/lib/signals';

interface ClassProbs {
  sine: number;
  square: number;
  sawtooth: number;
  ecg: number;
}

const BACKEND = 'http://localhost:8000';

export default function Home() {
  // ── Controls ──────────────────────────────────────────────────────────────
  const [signalType,     setSignalType]     = useState<SignalType>('sine');
  const [frequency,      setFrequency]      = useState(5);
  const [noise,          setNoise]          = useState(0.05);
  const [filterEnabled,  setFilterEnabled]  = useState(false);

  // ── Live signal ───────────────────────────────────────────────────────────
  const [signal, setSignal] = useState<number[]>([]);

  // ── Analysis results ──────────────────────────────────────────────────────
  const [fftData,        setFftData]        = useState<FFTResult>({ frequencies: [], magnitudes: [] });
  const [fftFromBackend, setFftFromBackend] = useState(false);
  const [classProbs,     setClassProbs]     = useState<ClassProbs | null>(null);
  const [predictedClass, setPredictedClass] = useState('');
  const [isAnalyzing,    setIsAnalyzing]    = useState(false);
  const [backendOnline,  setBackendOnline]  = useState(false);

  // ── Animation refs ────────────────────────────────────────────────────────
  const offsetRef      = useRef(0);
  const rafRef         = useRef<number>(0);
  const signalRef      = useRef<number[]>([]);
  const analysisActive = useRef(false);

  // ── Signal generation loop (rAF, ~60 fps) ─────────────────────────────────
  const tick = useCallback(() => {
    offsetRef.current += 6;
    let sig = generateSignal(signalType, frequency, noise, offsetRef.current);
    if (filterEnabled) sig = applyLowPassFilter(sig);
    signalRef.current = sig;
    setSignal(sig);
    rafRef.current = requestAnimationFrame(tick);
  }, [signalType, frequency, noise, filterEnabled]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // ── Backend analysis loop (500 ms) ────────────────────────────────────────
  useEffect(() => {
    const analyse = async () => {
      const sig = signalRef.current;
      if (sig.length === 0 || analysisActive.current) return;

      analysisActive.current = true;
      setIsAnalyzing(true);

      const body    = JSON.stringify({ signal: sig, sample_rate: SAMPLE_RATE });
      const headers = { 'Content-Type': 'application/json' };

      try {
        const [fftRes, clsRes] = await Promise.all([
          fetch(`${BACKEND}/fft`,      { method: 'POST', headers, body }),
          fetch(`${BACKEND}/classify`, { method: 'POST', headers, body }),
        ]);

        if (fftRes.ok) {
          const d = await fftRes.json() as FFTResult;
          setFftData(d);
          setFftFromBackend(true);
          setBackendOnline(true);
        }
        if (clsRes.ok) {
          const d = await clsRes.json() as { probabilities: ClassProbs; predicted_class: string };
          setClassProbs(d.probabilities);
          setPredictedClass(d.predicted_class);
        }
      } catch {
        // Backend unavailable — fall back to client-side FFT
        setBackendOnline(false);
        setFftFromBackend(false);
        setFftData(computeFFT(sig, SAMPLE_RATE));
        setClassProbs(null);
        setPredictedClass('');
      } finally {
        analysisActive.current = false;
        setIsAnalyzing(false);
      }
    };

    const id = setInterval(analyse, 500);
    return () => clearInterval(id);
  }, []); // intentionally empty — reads signalRef so no stale closure

  return (
    <div className="min-h-screen bg-[#050a14] text-green-400 font-mono flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-green-900 bg-[#030810]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <h1 className="text-xl font-bold tracking-[0.25em]">
            SIGNAL<span className="text-cyan-400">MIND</span>
          </h1>
          <span className="hidden sm:inline text-[10px] text-green-800 tracking-[0.2em] ml-3">
            DSP + ML ANALYSIS SYSTEM v1.0
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-green-800 tracking-widest">
            {NUM_SAMPLES} pts · {SAMPLE_RATE} Hz
          </span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-green-400' : 'bg-red-600'}`} />
            <span className={backendOnline ? 'text-green-600' : 'text-red-800'}>
              {backendOnline ? 'BACKEND CONNECTED' : 'BACKEND OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-[220px_1fr_210px] gap-4 p-4 min-h-0">
        {/* Left: controls */}
        <SignalControls
          signalType={signalType}
          frequency={frequency}
          noise={noise}
          filterEnabled={filterEnabled}
          onSignalTypeChange={setSignalType}
          onFrequencyChange={setFrequency}
          onNoiseChange={setNoise}
          onFilterToggle={() => setFilterEnabled(f => !f)}
        />

        {/* Centre: plots */}
        <section className="flex flex-col gap-4 min-w-0">
          <TimeDomainPlot
            signal={signal}
            signalType={signalType}
            filterEnabled={filterEnabled}
          />
          <FFTChart
            frequencies={fftData.frequencies}
            magnitudes={fftData.magnitudes}
            sampleRate={SAMPLE_RATE}
            fromBackend={fftFromBackend}
          />

          {/* Status bar */}
          <div className="flex justify-between text-[9px] text-green-900 px-1">
            <span>
              SIG: {signalType.toUpperCase()} · {frequency.toFixed(1)} Hz ·
              NOISE: {(noise * 100).toFixed(0)}% ·
              LPF: {filterEnabled ? 'ON' : 'OFF'}
            </span>
            <span>
              {isAnalyzing ? '⟳ ANALYZING…' : '● LIVE'}
            </span>
          </div>
        </section>

        {/* Right: classifier */}
        <ClassifierPanel
          probabilities={classProbs}
          predictedClass={predictedClass}
          isAnalyzing={isAnalyzing}
          backendOnline={backendOnline}
        />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-5 py-2 border-t border-green-900 bg-[#030810] text-[9px] text-green-900 flex justify-between">
        <span>SIGNAL MIND · EE/CS SIGNAL PROCESSING LABORATORY</span>
        <span>Next.js 15 + FastAPI + scikit-learn</span>
      </footer>
    </div>
  );
}
