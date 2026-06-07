'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Trash2, RotateCcw, Play, Pause, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';

interface Stop {
  id: number;
  position: number; // 0–1
  value: number; // 0–1
}

interface Preset {
  name: string;
  description: string;
  stops: Omit<Stop, 'id'>[];
}

const PRESETS: Preset[] = [
  {
    name: 'linear',
    description: 'Straight line — constant speed throughout',
    stops: [{ position: 0, value: 0 }, { position: 1, value: 1 }],
  },
  {
    name: 'ease (approximation)',
    description: 'Gentle acceleration and deceleration — like CSS ease',
    stops: [
      { position: 0, value: 0 },
      { position: 0.25, value: 0.15 },
      { position: 0.5, value: 0.5 },
      { position: 0.75, value: 0.85 },
      { position: 1, value: 1 },
    ],
  },
  {
    name: 'ease-in (approximation)',
    description: 'Slow start, speeds up at the end',
    stops: [
      { position: 0, value: 0 },
      { position: 0.25, value: 0.05 },
      { position: 0.5, value: 0.2 },
      { position: 0.75, value: 0.55 },
      { position: 1, value: 1 },
    ],
  },
  {
    name: 'ease-out (approximation)',
    description: 'Fast start, then decelerates',
    stops: [
      { position: 0, value: 0 },
      { position: 0.25, value: 0.45 },
      { position: 0.5, value: 0.8 },
      { position: 0.75, value: 0.95 },
      { position: 1, value: 1 },
    ],
  },
  {
    name: 'Bouncy Spring',
    description: 'Overshoot + settle — bouncy elastic feel',
    stops: [
      { position: 0, value: 0 },
      { position: 0.3, value: 1.15 },
      { position: 0.45, value: 0.92 },
      { position: 0.6, value: 1.04 },
      { position: 0.75, value: 0.98 },
      { position: 0.9, value: 1.01 },
      { position: 1, value: 1 },
    ],
  },
  {
    name: 'Stutter / Stepped',
    description: 'Abrupt jumps — like a typewriter effect',
    stops: [
      { position: 0, value: 0 },
      { position: 0.2, value: 0 },
      { position: 0.2001, value: 0.25 },
      { position: 0.4, value: 0.25 },
      { position: 0.4001, value: 0.5 },
      { position: 0.6, value: 0.5 },
      { position: 0.6001, value: 0.75 },
      { position: 0.8, value: 0.75 },
      { position: 0.8001, value: 1 },
      { position: 1, value: 1 },
    ],
  },
  {
    name: 'Anticipation + Over',
    description: 'Backs up slightly, then overshoots — dramatic entrance',
    stops: [
      { position: 0, value: 0 },
      { position: 0.15, value: -0.1 },
      { position: 0.35, value: 1.15 },
      { position: 0.55, value: 0.9 },
      { position: 0.75, value: 1.02 },
      { position: 1, value: 1 },
    ],
  },
  {
    name: 'Quick Snap',
    description: 'Very fast initial motion, then settles quickly',
    stops: [
      { position: 0, value: 0 },
      { position: 0.15, value: 0.8 },
      { position: 0.3, value: 0.95 },
      { position: 0.5, value: 1.02 },
      { position: 1, value: 1 },
    ],
  },
];

let stopIdCounter = 100;

export default function CssLinearEasingBuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [stops, setStops] = useState<Stop[]>([
    { id: 1, position: 0, value: 0 },
    { id: 2, position: 0.3, value: 0.1 },
    { id: 3, position: 0.7, value: 0.9 },
    { id: 4, position: 1, value: 1 },
  ]);
  const [animating, setAnimating] = useState(false);
  const animFrameRef = useRef<number>(0);

  const sortedStops = useMemo(() => [...stops].sort((a, b) => a.position - b.position), [stops]);

  const cssValue = useMemo(() => {
    const parts = sortedStops.map(s => `${(s.value * 100).toFixed(1)}% ${(s.position * 100).toFixed(1)}%`);
    return `linear(${parts.join(', ')})`;
  }, [sortedStops]);

  const tailwindValue = useMemo(() => `ease-[${cssValue}]`, [cssValue]);

  const addStop = useCallback(() => {
    const id = ++stopIdCounter;
    // Insert roughly in the middle
    const pos = stops.length >= 2
      ? (stops[0].position + stops[stops.length - 1].position) / 2
      : 0.5;
    setStops(prev => [...prev, { id, position: Math.round(pos * 100) / 100, value: 0.5 }]);
  }, [stops]);

  const removeStop = useCallback((id: number) => {
    if (stops.length <= 2) return; // Need at least 2 stops
    setStops(prev => prev.filter(s => s.id !== id));
  }, [stops.length]);

  const updateStop = useCallback((id: number, field: 'position' | 'value', val: number) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: Math.max(0, Math.min(1, val)) } : s));
  }, []);

  const applyPreset = useCallback((p: Preset) => {
    stopIdCounter += 50;
    setStops(p.stops.map((s, i) => ({ id: stopIdCounter + i, position: s.position, value: s.value })));
  }, []);

  // Canvas drawing
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const c: CanvasRenderingContext2D = ctx;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    c.scale(dpr, dpr);

    const pad = 25;
    const gw = w - pad * 2;
    const gh = h - pad * 2;

    // Background
    c.fillStyle = '#0f172a';
    c.fillRect(0, 0, w, h);

    // Grid
    c.strokeStyle = '#1e293b';
    c.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = pad + (gw * i) / 4;
      const y = pad + (gh * i) / 4;
      c.beginPath(); c.moveTo(x, pad); c.lineTo(x, pad + gh); c.stroke();
      c.beginPath(); c.moveTo(pad, y); c.lineTo(pad + gw, y); c.stroke();
    }

    // Labels
    c.fillStyle = '#64748b';
    c.font = '10px monospace';
    c.textAlign = 'center';
    c.fillText('Time →', pad + gw / 2, h - 4);
    c.save();
    c.translate(8, pad + gh / 2);
    c.rotate(-Math.PI / 2);
    c.fillText('Value →', 0, 0);
    c.restore();

    // Draw the piecewise-linear curve
    if (sortedStops.length >= 2) {
      c.strokeStyle = '#818cf8';
      c.lineWidth = 2.5;
      c.lineJoin = 'round';
      c.beginPath();
      const sx = pad + sortedStops[0].position * gw;
      const sy = pad + gh - sortedStops[0].value * gh;
      c.moveTo(sx, sy);
      for (let i = 1; i < sortedStops.length; i++) {
        const x = pad + sortedStops[i].position * gw;
        const y = pad + gh - sortedStops[i].value * gh;
        c.lineTo(x, y);
      }
      c.stroke();
    }

    // Draw stop points
    sortedStops.forEach((s) => {
      const x = pad + s.position * gw;
      const y = pad + gh - s.value * gh;
      c.beginPath();
      c.arc(x, y, 5, 0, Math.PI * 2);
      c.fillStyle = '#818cf8';
      c.fill();
      c.strokeStyle = '#0f172a';
      c.lineWidth = 1.5;
      c.stroke();
    });
  }, [sortedStops]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // Animation
  const startAnimation = useCallback(() => {
    setAnimating(true);
    const start = performance.now();
    const duration = 2000;
    const el = previewRef.current;
    if (!el) return;

    // Pre-compute the linear() function by sampling
    const sampleAt = (t: number): number => {
      if (t <= sortedStops[0].position) return sortedStops[0].value;
      if (t >= sortedStops[sortedStops.length - 1].position) return sortedStops[sortedStops.length - 1].value;
      for (let i = 0; i < sortedStops.length - 1; i++) {
        const a = sortedStops[i];
        const b = sortedStops[i + 1];
        if (t >= a.position && t <= b.position) {
          const frac = (t - a.position) / (b.position - a.position);
          return a.value + (b.value - a.value) * frac;
        }
      }
      return 0;
    };

    function frame() {
      const elapsed = performance.now() - start;
      const raw = (elapsed % duration) / duration;
      const t = sampleAt(raw);
      if (el) {
        el.style.transform = `translateX(${t * 100}%) scale(${1 + t * 0.2})`;
        el.style.opacity = String(0.3 + t * 0.7);
      }
      animFrameRef.current = requestAnimationFrame(frame);
    }
    animFrameRef.current = requestAnimationFrame(frame);
  }, [sortedStops]);

  const stopAnimation = useCallback(() => {
    setAnimating(false);
    cancelAnimationFrame(animFrameRef.current);
    if (previewRef.current) {
      previewRef.current.style.transform = 'translateX(0%) scale(1)';
      previewRef.current.style.opacity = '1';
    }
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  }, []);

  const stopCount = stops.length;

  return (
    <ToolLayout
      title="CSS linear() Easing Builder"
      description="Build multi-stop linear() easing curves — a superset of cubic-bezier() with unlimited control points. Create bounce, spring, anticipation, stepped, and custom easing profiles with a visual curve editor."
      controls={
        <>
          <Gauge className="w-4 h-4 text-brand-400" />
          <span className="text-sm text-slate-300 font-medium">
            {stopCount} stop{stopCount !== 1 ? 's' : ''} — CSS linear() is Baseline 2025+, all modern browsers
          </span>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Canvas */}
        <div className="space-y-4">
          <canvas
            ref={canvasRef}
            className="w-full aspect-[16/10] rounded-xl border border-slate-700 bg-slate-950 cursor-crosshair"
          />

          {/* Animation Preview */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">Animation Preview</span>
              <div className="flex gap-2">
                {!animating ? (
                  <button
                    onClick={startAnimation}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 text-brand-400 border border-brand-500/30 rounded-lg text-sm hover:bg-brand-600/30 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                ) : (
                  <button
                    onClick={stopAnimation}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" /> Stop
                  </button>
                )}
              </div>
            </div>
            <div className="h-12 bg-slate-900 rounded-lg relative overflow-hidden">
              <div
                ref={previewRef}
                className="absolute top-2 left-0 w-8 h-8 bg-brand-500 rounded-full shadow-lg shadow-brand-500/30 transition-none"
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1.5">
              <span>0%</span>
              <span>easing: {cssValue}</span>
              <span>100%</span>
            </div>
          </div>

          {/* Stops Editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Control Points</h3>
              <button
                onClick={addStop}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stop
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sortedStops.map((stop) => (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs text-slate-400 w-12">Time</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(stop.position * 100)}
                      onChange={(e) => updateStop(stop.id, 'position', Number(e.target.value) / 100)}
                      className="flex-1 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-brand-500"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(stop.position * 100)}
                      onChange={(e) => updateStop(stop.id, 'position', Number(e.target.value) / 100)}
                      className="w-14 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono text-slate-300 text-center focus:outline-none focus:border-brand-500"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs text-slate-400 w-12">Value</label>
                    <input
                      type="range"
                      min={-20}
                      max={120}
                      value={Math.round(stop.value * 100)}
                      onChange={(e) => updateStop(stop.id, 'value', Number(e.target.value) / 100)}
                      className="flex-1 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
                    />
                    <input
                      type="number"
                      min={-20}
                      max={120}
                      value={Math.round(stop.value * 100)}
                      onChange={(e) => updateStop(stop.id, 'value', Number(e.target.value) / 100)}
                      className="w-14 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono text-slate-300 text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                  <button
                    onClick={() => removeStop(stop.id)}
                    disabled={stops.length <= 2}
                    className="p-1.5 rounded-md hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove stop"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="space-y-6">
          {/* CSS */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">CSS</label>
            <div className="relative">
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap break-all">
                {cssValue}
              </pre>
              <button
                onClick={() => copyToClipboard(cssValue, 'CSS')}
                className="absolute top-2 right-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Usage example */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Usage</label>
            <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto">
{`.my-element {
  animation: slide 2s ${cssValue} infinite;
  transition: transform 0.3s ${cssValue};
}`}</pre>
          </div>

          {/* Tailwind */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tailwind</label>
            <div className="relative">
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap break-all">
                {tailwindValue}
              </pre>
              <button
                onClick={() => copyToClipboard(tailwindValue, 'Tailwind')}
                className="absolute top-2 right-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => setStops([{ id: 1, position: 0, value: 0 }, { id: 2, position: 0.25, value: 0.15 }, { id: 3, position: 0.5, value: 0.5 }, { id: 4, position: 0.75, value: 0.85 }, { id: 5, position: 1, value: 1 }])}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>

          {/* Presets */}
          <div className="pt-4 border-t border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-2 text-left bg-slate-800 border border-slate-700 rounded-lg hover:border-brand-500/40 hover:bg-slate-800/80 transition-all text-sm group"
                >
                  <div className="font-medium text-slate-300">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Docs */}
      <div className="mt-10 pt-8 border-t border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">About CSS linear() Easing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">What is linear()?</h4>
            <p className="text-xs text-slate-400">
              The <code className="text-brand-300 bg-slate-900 px-1 rounded">linear()</code> CSS easing function lets you
              define a piecewise-linear easing curve with any number of stops. Unlike <code className="text-brand-300 bg-slate-900 px-1 rounded">cubic-bezier()</code> (4 control points),
              linear() has no limit — you can model any easing profile exactly.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">Browser Support</h4>
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Baseline 2025</strong> — Chrome 113+, Firefox 112+, Safari 17.2+, Edge 113+.
              Over 93% of global users. Can be used in production today.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">linear() vs cubic-bezier()</h4>
            <table className="w-full text-xs text-slate-400">
              <thead>
                <tr className="text-slate-300">
                  <th className="text-left py-1 pr-2">Feature</th>
                  <th className="text-left py-1">cubic-bezier()</th>
                  <th className="text-left py-1">linear()</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-1 pr-2">Control points</td><td>4 fixed</td><td>Unlimited</td></tr>
                <tr><td className="py-1 pr-2">Bounce/Spring</td><td>Limited</td><td>Exact model</td></tr>
                <tr><td className="py-1 pr-2">Stepped easing</td><td>With steps()</td><td>Native via stops</td></tr>
                <tr><td className="py-1 pr-2">Overshoot</td><td>Possible</td><td>Full control</td></tr>
              </tbody>
            </table>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">Pro Tips</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Values can exceed 0–1 for overshoot/bounce effects</li>
              <li>Use <code className="text-brand-300 bg-slate-900 px-1 rounded">linear(0%, 0% 50%, 100% 50%, 100%)</code> for stepped</li>
              <li>More stops = smoother curves at the cost of CSS size</li>
              <li>Great for complex choreographed keyframe timing</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
