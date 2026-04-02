'use client';

import type { SignalType } from '@/lib/signals';

interface Props {
  signalType: SignalType;
  frequency: number;
  noise: number;
  filterEnabled: boolean;
  onSignalTypeChange: (t: SignalType) => void;
  onFrequencyChange: (f: number) => void;
  onNoiseChange: (n: number) => void;
  onFilterToggle: () => void;
}

const SIGNAL_TYPES: { id: SignalType; label: string; glyph: string; color: string }[] = [
  { id: 'sine',     label: 'SINE',     glyph: '∿', color: 'text-green-400 border-green-600' },
  { id: 'square',   label: 'SQUARE',   glyph: '⊓', color: 'text-blue-400 border-blue-600'  },
  { id: 'sawtooth', label: 'SAWTOOTH', glyph: '⋀', color: 'text-amber-400 border-amber-600' },
  { id: 'ecg',      label: 'ECG',      glyph: '♥', color: 'text-red-400 border-red-600'    },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-green-900 rounded bg-[#080f1e] p-3">
      <div className="text-[10px] text-green-700 tracking-[0.2em] mb-3">{title}</div>
      {children}
    </div>
  );
}

export default function SignalControls({
  signalType, frequency, noise, filterEnabled,
  onSignalTypeChange, onFrequencyChange, onNoiseChange, onFilterToggle,
}: Props) {
  return (
    <aside className="flex flex-col gap-3 h-full">
      {/* Signal type selector */}
      <Panel title="SIGNAL TYPE">
        <div className="grid grid-cols-2 gap-2">
          {SIGNAL_TYPES.map(({ id, label, glyph, color }) => (
            <button
              key={id}
              onClick={() => onSignalTypeChange(id)}
              className={`py-2 px-1 rounded border text-[10px] tracking-widest transition-all
                ${signalType === id
                  ? `${color} bg-green-950/30`
                  : 'text-green-900 border-green-900 hover:border-green-700 hover:text-green-700'
                }`}
            >
              <span className="block text-xl mb-0.5">{glyph}</span>
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {/* Frequency */}
      <Panel title="FREQUENCY">
        <div className="flex items-center gap-2">
          <input
            type="range" min={0.5} max={50} step={0.5} value={frequency}
            onChange={e => onFrequencyChange(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px]">
          <span className="text-green-800">0.5 Hz</span>
          <span className="text-green-400 font-bold">{frequency.toFixed(1)} Hz</span>
          <span className="text-green-800">50 Hz</span>
        </div>
      </Panel>

      {/* Noise level */}
      <Panel title="NOISE LEVEL (AWGN)">
        <div className="flex items-center gap-2">
          <input
            type="range" min={0} max={1} step={0.01} value={noise}
            onChange={e => onNoiseChange(Number(e.target.value))}
            className="flex-1 noise-slider"
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px]">
          <span className="text-amber-900">0%</span>
          <span className="text-amber-400 font-bold">{(noise * 100).toFixed(0)}%</span>
          <span className="text-amber-900">100%</span>
        </div>
      </Panel>

      {/* Low-pass filter */}
      <Panel title="DSP FILTER">
        <button
          onClick={onFilterToggle}
          className={`w-full rounded border py-2 text-[10px] tracking-widest transition-all
            ${filterEnabled
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/40'
              : 'border-green-900 text-green-800 hover:border-green-700 hover:text-green-600'
            }`}
        >
          <span className="block text-lg mb-0.5">{filterEnabled ? '⧗' : '◎'}</span>
          LOW-PASS FILTER: {filterEnabled ? 'ON' : 'OFF'}
        </button>
        {filterEnabled && (
          <p className="mt-2 text-center text-[9px] text-cyan-800 tracking-widest">
            fc ≈ 0.15 × Nyquist (IIR)
          </p>
        )}
      </Panel>

      {/* System info */}
      <Panel title="SYSTEM INFO">
        <dl className="text-[9px] space-y-1">
          {[
            ['SAMPLE RATE',  '500 Hz'],
            ['BUFFER',       '512 samples'],
            ['RESOLUTION',   '0.977 Hz/bin'],
            ['NYQUIST',      '250 Hz'],
            ['UPDATE RATE',  '60 fps (canvas)'],
            ['ANALYSIS',     '2 Hz (backend)'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-green-900">{k}</dt>
              <dd className="text-green-700">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </aside>
  );
}
