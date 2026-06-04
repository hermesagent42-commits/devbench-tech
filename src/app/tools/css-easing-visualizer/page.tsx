'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, RotateCcw, Gauge, Move, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  description: string;
  css: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { label: 'ease', description: 'Standard CSS ease — gentle acceleration and deceleration', css: 'cubic-bezier(0.25, 0.1, 0.25, 1)', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  { label: 'ease-in', description: 'Slow start, then speeds up — great for exit animations', css: 'cubic-bezier(0.42, 0, 1, 1)', x1: 0.42, y1: 0, x2: 1, y2: 1 },
  { label: 'ease-out', description: 'Fast start, then slows down — great for entrance animations', css: 'cubic-bezier(0, 0, 0.58, 1)', x1: 0, y1: 0, x2: 0.58, y2: 1 },
  { label: 'ease-in-out', description: 'Smooth symmetrical acceleration and deceleration', css: 'cubic-bezier(0.42, 0, 0.58, 1)', x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  { label: 'linear', description: 'Constant speed — no acceleration at all', css: 'cubic-bezier(0, 0, 1, 1)', x1: 0, y1: 0, x2: 1, y2: 1 },
  { label: 'Bounce In', description: 'Energetic entrance with spring-like bounce effect', css: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', x1: 0.68, y1: -0.55, x2: 0.265, y2: 1.55 },
  { label: 'Bounce Out', description: 'Overshoot at the end for playful exit animations', css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
  { label: 'Anticipate', description: 'Slight reverse motion before moving forward', css: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)', x1: 0.68, y1: -0.6, x2: 0.32, y2: 1.6 },
  { label: 'Sharp', description: 'Abrupt stop — good for UI elements that snap into place', css: 'cubic-bezier(0.4, 0, 0.2, 1)', x1: 0.4, y1: 0, x2: 0.2, y2: 1 },
  { label: 'Smooth', description: 'Buttery smooth Apple-style easing curve', css: 'cubic-bezier(0.22, 0.61, 0.36, 1)', x1: 0.22, y1: 0.61, x2: 0.36, y2: 1 },
  { label: 'Ease In Back', description: 'Retreats slightly before moving forward', css: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)', x1: 0.6, y1: -0.28, x2: 0.735, y2: 0.045 },
  { label: 'Custom Elastic', description: 'Elastic spring effect with visible oscillation', css: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', x1: 0.175, y1: 0.885, x2: 0.32, y2: 1.275 },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function CssEasingVisualizerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [x1, setX1] = useState(0.25);
  const [y1, setY1] = useState(0.1);
  const [x2, setX2] = useState(0.25);
  const [y2, setY2] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [activePoint, setActivePoint] = useState<'p1' | 'p2' | null>(null);
  const [dragging, setDragging] = useState(false);

  const cssValue = useMemo(() => {
    const p1 = [x1, y1].map(v => +v.toFixed(3));
    const p2 = [x2, y2].map(v => +v.toFixed(3));
    return `cubic-bezier(${p1[0]}, ${p1[1]}, ${p2[0]}, ${p2[1]})`;
  }, [x1, y1, x2, y2]);

  const tailwindValue = useMemo(() => {
    return `ease-[${cssValue}]`;
  }, [cssValue]);

  // ── Canvas Drawing ────────────────────────────────────────────────────────

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Store as const so TypeScript narrows within nested functions
    const c: CanvasRenderingContext2D = ctx;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    c.scale(dpr, dpr);

    const pad = 30;
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
      c.beginPath();
      c.moveTo(x, pad);
      c.lineTo(x, pad + gh);
      c.stroke();
      c.beginPath();
      c.moveTo(pad, y);
      c.lineTo(pad + gw, y);
      c.stroke();
    }

    // Diagonal reference line
    c.strokeStyle = '#334155';
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(pad, pad + gh);
    c.lineTo(pad + gw, pad);
    c.stroke();
    c.setLineDash([]);

    // Axes labels
    c.fillStyle = '#64748b';
    c.font = '11px monospace';
    c.textAlign = 'center';
    c.fillText('Time →', pad + gw / 2, h - 6);
    c.save();
    c.translate(10, pad + gh / 2);
    c.rotate(-Math.PI / 2);
    c.fillText('Progress →', 0, 0);
    c.restore();

    // Curve
    const cp1x = pad + x1 * gw;
    const cp1y = pad + gh - y1 * gh;
    const cp2x = pad + x2 * gw;
    const cp2y = pad + gh - y2 * gh;
    const startX = pad;
    const startY = pad + gh;
    const endX = pad + gw;
    const endY = pad;

    c.strokeStyle = '#818cf8';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(startX, startY);
    c.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    c.stroke();

    // Control lines
    c.strokeStyle = '#475569';
    c.lineWidth = 1;
    c.setLineDash([3, 3]);
    // P1 line
    c.beginPath();
    c.moveTo(startX, startY);
    c.lineTo(cp1x, cp1y);
    c.stroke();
    // P2 line
    c.beginPath();
    c.moveTo(endX, endY);
    c.lineTo(cp2x, cp2y);
    c.stroke();
    c.setLineDash([]);

    // Control points
    function drawPoint(px: number, py: number, color: string, label: string) {
      c.beginPath();
      c.arc(px, py, 7, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = '#0f172a';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = '#f8fafc';
      c.font = '10px monospace';
      c.textAlign = 'center';
      c.fillText(label, px, py - 14);
    }

    drawPoint(startX, startY, '#64748b', '(0,0)');
    drawPoint(endX, endY, '#64748b', '(1,1)');
    drawPoint(cp1x, cp1y, '#f97316', `(${x1.toFixed(2)}, ${y1.toFixed(2)})`);
    drawPoint(cp2x, cp2y, '#22c55e', `(${x2.toFixed(2)}, ${y2.toFixed(2)})`);
  }, [x1, y1, x2, y2]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ── Canvas Interaction ────────────────────────────────────────────────────

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const pad = 30;
      const gw = rect.width - pad * 2;
      const gh = rect.height - pad * 2;
      const mx = (clientX - rect.left - pad) / gw;
      const my = 1 - (clientY - rect.top - pad) / gh;
      return { x: Math.max(0, Math.min(1, mx)), y: Math.max(0, Math.min(2, my)) };
    },
    [],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;

      const d1 = Math.hypot(coords.x - x1, coords.y - y1);
      const d2 = Math.hypot(coords.x - x2, coords.y - y2);

      if (d1 < 0.08) {
        setActivePoint('p1');
        setDragging(true);
      } else if (d2 < 0.08) {
        setActivePoint('p2');
        setDragging(true);
      }
    },
    [x1, y1, x2, y2, getCanvasCoords],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !activePoint) return;
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;

      if (activePoint === 'p1') {
        setX1(coords.x);
        setY1(coords.y);
      } else {
        setX2(coords.x);
        setY2(coords.y);
      }
    },
    [dragging, activePoint, getCanvasCoords],
  );

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(false);
    setActivePoint(null);
  }, []);

  // ── Animation Preview ─────────────────────────────────────────────────────

  const toggleAnimation = useCallback(() => {
    setAnimating((prev) => !prev);
  }, []);

  const setPreset = useCallback((preset: Preset) => {
    setX1(preset.x1);
    setY1(preset.y1);
    setX2(preset.x2);
    setY2(preset.y2);
  }, []);

  const resetCustom = useCallback(() => {
    setX1(0.25);
    setY1(0.1);
    setX2(0.25);
    setY2(1);
  }, []);

  // ── Copy ──────────────────────────────────────────────────────────────────

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssValue);
    toast.success('CSS easing copied!');
  }, [cssValue]);

  const copyTailwind = useCallback(() => {
    navigator.clipboard.writeText(tailwindValue);
    toast.success('Tailwind easing copied!');
  }, [tailwindValue]);

  return (
    <ToolLayout title="CSS Easing Visualizer" description="Design custom cubic-bezier() easing curves. Drag the control points on the canvas, preview the animation, and copy ready-to-use CSS or Tailwind.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Canvas + Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Canvas */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full aspect-[1.6/1] cursor-crosshair touch-none"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          </div>

          {/* Animation Preview */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAnimation}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {animating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {animating ? 'Stop' : 'Preview'} Animation
            </button>
            <span className="text-xs text-slate-400">Drag the orange (P1) and green (P2) points on the canvas</span>
          </div>

          <div className="relative h-16 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-brand-500 rounded-full ${animating ? '' : 'left-2'}`}
              style={
                animating
                  ? {
                      animation: `easingPreview 2s ${cssValue} infinite alternate`,
                    }
                  : { left: '8px' }
              }
            />
            <style jsx>{`
              @keyframes easingPreview {
                from { left: 8px; }
                to { left: calc(100% - 40px); }
              }
            `}</style>
          </div>

          {/* Code Output */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">CSS Output</h3>
              <div className="flex gap-2">
                <button onClick={copyCss} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors">
                  <Copy className="w-3 h-3" /> CSS
                </button>
                <button onClick={copyTailwind} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors">
                  <Copy className="w-3 h-3" /> Tailwind
                </button>
              </div>
            </div>
            <code className="block text-sm font-mono text-brand-400 bg-slate-950 rounded p-3">
              {cssValue}
            </code>
          </div>
        </div>

        {/* Right: Controls + Presets */}
        <div className="space-y-4">
          {/* Sliders */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <Move className="w-4 h-4 text-orange-400" /> Control Points
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>P1 X</span>
                  <span className="text-orange-400 font-mono">{x1.toFixed(3)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.001" value={x1} onChange={(e) => setX1(+e.target.value)} className="w-full accent-orange-400" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>P1 Y</span>
                  <span className="text-orange-400 font-mono">{y1.toFixed(3)}</span>
                </div>
                <input type="range" min="-0.5" max="2" step="0.001" value={y1} onChange={(e) => setY1(+e.target.value)} className="w-full accent-orange-400" />
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>P2 X</span>
                  <span className="text-green-400 font-mono">{x2.toFixed(3)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.001" value={x2} onChange={(e) => setX2(+e.target.value)} className="w-full accent-green-400" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>P2 Y</span>
                  <span className="text-green-400 font-mono">{y2.toFixed(3)}</span>
                </div>
                <input type="range" min="-0.5" max="2" step="0.001" value={y2} onChange={(e) => setY2(+e.target.value)} className="w-full accent-green-400" />
              </div>
            </div>
            <button onClick={resetCustom} className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset to Default
            </button>
          </div>

          {/* Presets */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" /> Presets
            </h3>
            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setPreset(preset)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                    cssValue === preset.css
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{preset.description}</div>
                  <div className="text-brand-400/70 font-mono text-[11px] mt-0.5">{preset.css}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
