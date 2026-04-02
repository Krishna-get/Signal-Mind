'use client';

interface ClassProbs {
  sine: number;
  square: number;
  sawtooth: number;
  ecg: number;
}

interface Props {
  probabilities: ClassProbs | null;
  predictedClass: string;
  isAnalyzing: boolean;
  backendOnline: boolean;
}

const CLASS_META = {
  sine:     { glyph: '∿', label: 'SINE WAVE',   bar: 'bg-green-500',  glow: 'shadow-green-500' },
  square:   { glyph: '⊓', label: 'SQUARE WAVE', bar: 'bg-blue-500',   glow: 'shadow-blue-500'  },
  sawtooth: { glyph: '⋀', label: 'SAWTOOTH',    bar: 'bg-amber-500',  glow: 'shadow-amber-500' },
  ecg:      { glyph: '♥', label: 'ECG / BIO',   bar: 'bg-red-500',    glow: 'shadow-red-500'   },
} as const;

type ClsKey = keyof typeof CLASS_META;

function ConfidenceBar({ cls, prob, isPredicted }: {
  cls: ClsKey; prob: number; isPredicted: boolean;
}) {
  const { glyph, label, bar, glow } = CLASS_META[cls];
  const pct = (prob * 100).toFixed(1);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center text-[10px]">
        <span className={isPredicted ? 'text-white' : 'text-purple-800'}>
          {glyph} {label}
          {isPredicted && <span className="text-yellow-400 ml-1">◀ MATCH</span>}
        </span>
        <span className={`font-bold tabular-nums ${isPredicted ? 'text-white' : 'text-purple-700'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#12102a] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${bar} ${
            isPredicted ? `opacity-100 shadow-sm ${glow}` : 'opacity-30'
          }`}
          style={{ width: `${prob * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function ClassifierPanel({
  probabilities, predictedClass, isAnalyzing, backendOnline,
}: Props) {
  return (
    <aside className="flex flex-col gap-3">
      {/* Status header */}
      <div className="border border-purple-900 rounded bg-[#08081e] p-3">
        <div className="text-[10px] text-purple-700 tracking-[0.2em] mb-2">ML CLASSIFIER</div>
        <div className="text-[9px] text-purple-900 mb-2">Random Forest · 7 DSP features</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isAnalyzing
                ? 'bg-yellow-400 animate-pulse'
                : backendOnline
                ? 'bg-green-400'
                : 'bg-red-600'
            }`}
          />
          <span className="text-[10px] text-purple-700">
            {isAnalyzing
              ? 'ANALYZING…'
              : backendOnline
              ? 'BACKEND ONLINE'
              : 'BACKEND OFFLINE'}
          </span>
        </div>
      </div>

      {/* Confidence bars */}
      <div className="border border-purple-900 rounded bg-[#08081e] p-3 space-y-3">
        <div className="text-[10px] text-purple-700 tracking-[0.2em] mb-1">CLASS PROBABILITIES</div>
        {(Object.keys(CLASS_META) as ClsKey[]).map(cls => (
          <ConfidenceBar
            key={cls}
            cls={cls}
            prob={probabilities?.[cls] ?? 0}
            isPredicted={cls === predictedClass}
          />
        ))}
      </div>

      {/* Top prediction card */}
      {predictedClass && probabilities ? (
        <div className="border border-yellow-800 rounded bg-[#140e00] p-3 text-center">
          <div className="text-[9px] text-yellow-800 tracking-[0.2em] mb-1">PREDICTION</div>
          <div className="text-2xl text-yellow-300 font-bold mb-0.5">
            {CLASS_META[predictedClass as ClsKey]?.glyph}{' '}
            {predictedClass.toUpperCase()}
          </div>
          <div className="text-[10px] text-yellow-700">
            {((probabilities[predictedClass as ClsKey] ?? 0) * 100).toFixed(1)}% confidence
          </div>
        </div>
      ) : !backendOnline ? (
        <div className="border border-red-900 rounded bg-[#140404] p-3 text-center text-[10px] text-red-800">
          <div className="text-red-600 mb-1 tracking-widest">● OFFLINE</div>
          Start FastAPI on port 8000 to enable ML classification.
        </div>
      ) : null}

      {/* Feature vector legend */}
      <div className="border border-purple-900/40 rounded bg-[#08081e] p-3">
        <div className="text-[9px] text-purple-800 tracking-[0.2em] mb-2">FEATURE VECTOR</div>
        <dl className="text-[9px] space-y-1">
          {[
            ['f₁', 'RMS Energy'],
            ['f₂', 'Zero Crossing Rate'],
            ['f₃', 'Crest Factor'],
            ['f₄', 'Harmonic Ratio'],
            ['f₅', 'Spectral Centroid'],
            ['f₆', 'SNR (dB)'],
            ['f₇', 'Spectral Flatness'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-purple-600">{k}</dt>
              <dd className="text-purple-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
