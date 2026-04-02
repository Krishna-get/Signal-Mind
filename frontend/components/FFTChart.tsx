'use client';

import { useEffect, useRef } from 'react';

interface Props {
  frequencies: number[];
  magnitudes: number[];
  sampleRate: number;
  fromBackend: boolean;
}

export default function FFTChart({ frequencies, magnitudes, sampleRate, fromBackend }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth  * dpr;
    const H   = canvas.offsetHeight * dpr;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W;
      canvas.height = H;
    }
    const w = W, h = H;

    // Background
    ctx.fillStyle = '#020811';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(0,20,40,0.8)';
    ctx.lineWidth   = 0.5 * dpr;
    for (let c = 0; c <= 10; c++) {
      const x = (c / 10) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let r = 0; r <= 4; r++) {
      const y = (r / 4) * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (magnitudes.length === 0) {
      ctx.fillStyle  = '#1a3a4a';
      ctx.font       = `${11 * dpr}px monospace`;
      ctx.textAlign  = 'center';
      ctx.fillText('AWAITING SPECTRUM DATA…', w / 2, h / 2);
      ctx.textAlign  = 'left';
      return;
    }

    const maxFreq = sampleRate / 2;
    const maxMag  = Math.max(...magnitudes, 1e-10);
    const pad     = 6 * dpr;                        // bottom label area
    const plotH   = h - pad;

    // Bars
    const barW = w / magnitudes.length;
    for (let i = 0; i < magnitudes.length; i++) {
      const norm = magnitudes[i] / maxMag;
      const barH = norm * plotH;
      const x    = i * barW;
      const y    = plotH - barH;

      // Gradient fill per bar
      const grad = ctx.createLinearGradient(0, y, 0, plotH);
      grad.addColorStop(0, `rgba(6,182,212,${0.5 + norm * 0.5})`);
      grad.addColorStop(1, `rgba(8,145,178,${0.2 + norm * 0.3})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, Math.max(1, barW - 0.5), barH);

      // Peak glow for dominant bins
      if (norm > 0.6) {
        ctx.fillStyle = `rgba(165,243,252,${(norm - 0.6) * 0.7})`;
        ctx.fillRect(x - 1, y - 2 * dpr, Math.max(3, barW + 1), 2 * dpr);
      }
    }

    // Frequency axis tick labels
    ctx.fillStyle = 'rgba(22,78,99,0.9)';
    ctx.font      = `${8 * dpr}px monospace`;
    for (let f = 0; f <= maxFreq; f += 50) {
      const x = (f / maxFreq) * w;
      ctx.fillText(`${f}`, x + 2, h - 1);
    }

    // Labels
    ctx.fillStyle = 'rgba(8,145,178,0.6)';
    ctx.font      = `${10 * dpr}px monospace`;
    ctx.fillText(
      fromBackend ? 'FFT SPECTRUM (server)' : 'FFT SPECTRUM (client)',
      8 * dpr,
      16 * dpr,
    );
    ctx.fillText(`0 – ${maxFreq} Hz`, w - 90 * dpr, 16 * dpr);

  }, [frequencies, magnitudes, sampleRate, fromBackend]);

  return (
    <div className="border border-cyan-900 rounded overflow-hidden crt">
      <div className="flex justify-between items-center px-2 py-1 border-b border-cyan-900 bg-[#02080d]">
        <span className="text-[10px] text-cyan-700 tracking-[0.2em]">FFT SPECTRUM</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className={fromBackend ? 'text-green-600' : 'text-amber-700'}>
            {fromBackend ? '● SERVER' : '● CLIENT FALLBACK'}
          </span>
          <span className="text-cyan-900">0 – {sampleRate / 2} Hz</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ height: '180px', background: '#020811' }}
      />
    </div>
  );
}
