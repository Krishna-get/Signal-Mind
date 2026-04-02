'use client';

import { useEffect, useRef } from 'react';
import type { SignalType } from '@/lib/signals';

interface Props {
  signal: number[];
  signalType: SignalType;
  filterEnabled: boolean;
}

const TRACE_COLOR: Record<SignalType, [number, number, number]> = {
  sine:     [34,  197,  94],   // green-500
  square:   [59,  130, 246],   // blue-500
  sawtooth: [245, 158,  11],   // amber-500
  ecg:      [239,  68,  68],   // red-500
};

export default function TimeDomainPlot({ signal, signalType, filterEnabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || signal.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive sizing
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth  * dpr;
    const H   = canvas.offsetHeight * dpr;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W;
      canvas.height = H;
    }

    const w = W, h = H;

    // ── Background ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#020a04';
    ctx.fillRect(0, 0, w, h);

    // ── Vignette ───────────────────────────────────────────────────────────
    const vig = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.9);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // ── Grid ───────────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,40,0,0.6)';
    ctx.lineWidth   = 0.5 * dpr;
    const cols = 10, rows = 8;
    for (let c = 0; c <= cols; c++) {
      const x = (c / cols) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = (r / rows) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Centre line
    ctx.strokeStyle = 'rgba(0,60,0,0.9)';
    ctx.lineWidth   = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // ── Signal trace ───────────────────────────────────────────────────────
    const [r, g, b] = TRACE_COLOR[signalType];
    const amp = h * 0.38;          // max amplitude in px

    const buildPath = () => {
      ctx.beginPath();
      signal.forEach((v, i) => {
        const x = (i / (signal.length - 1)) * w;
        const y = h / 2 - v * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
    };

    // Outer glow passes
    const layers: [number, number, number][] = [
      [0.08, 14 * dpr, 24 * dpr],
      [0.18, 6  * dpr, 12 * dpr],
      [0.45, 3  * dpr,  6 * dpr],
      [0.85, 1.5* dpr,  3 * dpr],
      [1.00, 1  * dpr,  0       ],
    ];

    for (const [alpha, lineWidth, blur] of layers) {
      ctx.save();
      ctx.globalAlpha    = alpha;
      ctx.strokeStyle    = `rgb(${r},${g},${b})`;
      ctx.lineWidth      = lineWidth;
      ctx.shadowColor    = `rgb(${r},${g},${b})`;
      ctx.shadowBlur     = blur;
      ctx.lineJoin       = 'round';
      ctx.lineCap        = 'round';
      buildPath();
      ctx.stroke();
      ctx.restore();
    }

    // ── Labels ─────────────────────────────────────────────────────────────
    ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
    ctx.font      = `${10 * dpr}px monospace`;
    ctx.fillText(`${signalType.toUpperCase()} · TIME DOMAIN`, 8 * dpr, 16 * dpr);

    if (filterEnabled) {
      ctx.fillStyle = 'rgba(34,211,238,0.6)';
      ctx.fillText('LPF ON', w - 56 * dpr, 16 * dpr);
    }

    // Amplitude markers
    ctx.fillStyle = 'rgba(0,100,0,0.4)';
    ctx.font      = `${8 * dpr}px monospace`;
    ctx.fillText('+1', 2 * dpr, h / 2 - amp + 10 * dpr);
    ctx.fillText(' 0', 2 * dpr, h / 2 + 10 * dpr);
    ctx.fillText('-1', 2 * dpr, h / 2 + amp + 10 * dpr);

  }, [signal, signalType, filterEnabled]);

  return (
    <div className="border border-green-900 rounded overflow-hidden crt">
      <div className="flex justify-between items-center px-2 py-1 border-b border-green-900 bg-[#030d03]">
        <span className="text-[10px] text-green-700 tracking-[0.2em]">TIME DOMAIN</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-green-800">t: 0 — {(512/500).toFixed(2)} s</span>
          <span className="text-green-800">amp: ±1</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ height: '220px', background: '#020a04' }}
      />
    </div>
  );
}
