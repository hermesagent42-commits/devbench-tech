'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, RotateCcw, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ControlPoint {
  x: number; // 0-1
  y: number; // 0-1 (can exceed for overshoot effects)
}

interface Preset {
  name: string;
  label: string;
  p1: ControlPoint;
  p2: ControlPoint;
  description: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'ease',
    label: 'Ease',
    p1: { x: 0.25, y: 0.1 },
    p2: { x: 0.25, y: 1 },
    description: 'Default CSS easing — gentle acceleration and deceleration',
  },
  {
    name: 'ease-in',
    label: 'Ease In',
    p1: { x: 0.42, y: 0 },
    p2: { x: 1, y: 1 },
    description: 'Starts slow, accelerates towards the end',
  },
  {
    name: 'ease-out',
    label: 'Ease Out',
    p1: { x: 0, y: 0 },
    p2: { x: 0.58, y: 1 },
    description: 'Starts fast, decelerates towards the end',
  },
  {
    name: 'ease-in-out',
    label: 'Ease In Out',
    p1: { x: 0.42, y: 0 },
    p2: { x: 0.58, y: 1 },
    description: 'Slow start and end, faster in the middle',
  },
  {
    name: 'linear',
    label: 'Linear',
    p1: { x: 0, y: 0 },
    p2: { x: 1, y: 1 },
    description: 'Constant speed throughout the animation',
  },
  {
    name: 'bounce',
    label: 'Bounce',
    p1: { x: 0.68, y: -0.55 },
    p2: { x: 0.27, y: 1.55 },
    description: 'Bouncy, overshooting effect — popular in UI animations',
  },
  {
    name: 'snappy',
    label: 'Snappy',
    p1: { x: 0.1, y: 0.75 },
    p2: { x: 0.25, y: 1 },
    description: 'Quick, responsive feeling — great for hover transitions',
  },
  {
    name: 'elastic',
    label: 'Elastic',
    p1: { x: 0.68, y: -0.65 },
    p2: { x: 0.27, y: 1.65 },
    description: 'Springy elastic effect with strong overshoot',
  },
  {
    name: 'anticipate',
    label: 'Anticipate',
    p1: { x: 0.42, y: -0.3 },
    p2: { x: 0.58, y: 1.3 },
    description: 'Pulls back before launching forward',
  },
  {
    name: 'slow-mo',
    label: 'Slow Mo',
    p1: { x: 0.75, y: 0.05 },
    p2: { x: 0.9, y: 0.25 },
    description: 'Very slow start with a fast finish — cinematic feel',
  },
];

// ── Canvas constants ───────────────────────────────────────────────────────

const CANVAS_SIZE = 340;
const PADDING = 30;
const GRAPH_SIZE = CANVAS_SIZE - PADDING * 2;
const POINT_RADIUS = 10;
const GRID_STEP = 0.25; // 25% grid lines

// ── Cubic-bezier evaluation ────────────────────────────────────────────────

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function findYForX(x: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  // Newton-Raphson to find t for a given x
  let t = x;
  for (let i = 0; i < 8; i++) {
    const xt = cubicBezier(t, 0, p1x, p2x, 1);
    const dxdt = 3 * (1 - t) * (1 - t) * (p1x - 0) + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
    if (Math.abs(dxdt) < 1e-7) break;
    t -= (xt - x) / dxdt;
    t = Math.max(0, Math.min(1, t));
  }
  return cubicBezier(t, 0, p1y, p2y, 1);
}

// ── Format helper ──────────────────────────────────────────────────────────

function formatCubicBezier(p1: ControlPoint, p2: ControlPoint): string {
  return `cubic-bezier(${p1.x.toFixed(2)}, ${p1.y.toFixed(2)}, ${p2.x.toFixed(2)}, ${p2.y.toFixed(2)})`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssEasingPlaygroundPage() {
  const [p1, setP1] = useState<ControlPoint>({ x: 0.25, y: 0.1 });
  const [p2, setP2] = useState<ControlPoint>({ x: 0.25, y: 1 });
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('ease');

  const canvasRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const animStartRef = useRef<number>(0);
  const DURATION = 2000; // ms for preview

  const cssValue = useMemo(() => formatCubicBezier(p1, p2), [p1, p2]);

  // ── Preview animation ───────────────────────────────────────────────────

  const runPreview = useCallback(() => {
    setPreviewRunning(true);
    setPreviewProgress(0);
    animStartRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - animStartRef.current;
      const rawProgress = elapsed / DURATION;
      if (rawProgress >= 1) {
        setPreviewProgress(1);
        // Wait a moment, then reset
        setTimeout(() => {
          setPreviewRunning(false);
          setPreviewProgress(0);
        }, 400);
        return;
      }
      setPreviewProgress(rawProgress);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  }, []);

  const stopPreview = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setPreviewRunning(false);
    setPreviewProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Ease the progress through the cubic-bezier
  const easedProgress = useMemo(() => {
    return findYForX(previewProgress, p1.x, p1.y, p2.x, p2.y);
  }, [previewProgress, p1, p2]);

  // Sample points for the curve
  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = cubicBezier(t, 0, p1.x, p2.x, 1);
      const y = cubicBezier(t, 0, p1.y, p2.y, 1);
      pts.push({ x, y });
    }
    return pts;
  }, [p1, p2]);

  // ── Mouse handlers ──────────────────────────────────────────────────────

  const clientToGraph = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const rawX = clientX - rect.left - PADDING;
    const rawY = clientY - rect.top - PADDING;
    const x = Math.max(0, Math.min(1, rawX / GRAPH_SIZE));
    const y = 1 - rawY / GRAPH_SIZE; // invert: SVG y goes down
    return { x, y };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pt = clientToGraph(e.clientX, e.clientY);
      if (!pt) return;

      const distToP1 = Math.hypot(pt.x - p1.x, pt.y - p1.y);
      const distToP2 = Math.hypot(pt.x - p2.x, pt.y - p2.y);

      if (distToP1 < 0.08) {
        setDragging('p1');
        e.preventDefault();
      } else if (distToP2 < 0.08) {
        setDragging('p2');
        e.preventDefault();
      }
    },
    [clientToGraph, p1, p2]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const pt = clientToGraph(e.clientX, e.clientY);
      if (!pt) return;
      const clamped: ControlPoint = {
        x: Math.max(0, Math.min(1, pt.x)),
        y: Math.max(-2, Math.min(3, pt.y)), // allow overshoot
      };
      if (dragging === 'p1') {
        setP1(clamped);
        setSelectedPreset('custom');
      } else {
        setP2(clamped);
        setSelectedPreset('custom');
      }
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, clientToGraph]);

  // ── Touch handlers for mobile ───────────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const pt = clientToGraph(touch.clientX, touch.clientY);
      if (!pt) return;

      const distToP1 = Math.hypot(pt.x - p1.x, pt.y - p1.y);
      const distToP2 = Math.hypot(pt.x - p2.x, pt.y - p2.y);

      if (distToP1 < 0.1) {
        setDragging('p1');
      } else if (distToP2 < 0.1) {
        setDragging('p2');
      }
    },
    [clientToGraph, p1, p2]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const pt = clientToGraph(touch.clientX, touch.clientY);
      if (!pt) return;
      const clamped: ControlPoint = {
        x: Math.max(0, Math.min(1, pt.x)),
        y: Math.max(-2, Math.min(3, pt.y)),
      };
      if (dragging === 'p1') {
        setP1(clamped);
        setSelectedPreset('custom');
      } else {
        setP2(clamped);
        setSelectedPreset('custom');
      }
    },
    [dragging, clientToGraph]
  );

  // ── Apply preset ────────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: Preset) => {
    setP1({ ...preset.p1 });
    setP2({ ...preset.p2 });
    setSelectedPreset(preset.name);
    stopPreview();
  }, [stopPreview]);

  // ── Copy ────────────────────────────────────────────────────────────────

  const copyCSS = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssValue);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [cssValue]);

  // ── Render helpers ──────────────────────────────────────────────────────

  const toCanvasX = (nx: number) => PADDING + nx * GRAPH_SIZE;
  const toCanvasY = (ny: number) => PADDING + (1 - ny) * GRAPH_SIZE;

  // Build SVG path for curve
  const curvePathD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    return curvePoints
      .map((pt, i) => {
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.y);
        return i === 0 ? `M ${cx} ${cy}` : `L ${cx} ${cy}`;
      })
      .join(' ');
  }, [curvePoints]);

  // Build handle lines from (0,0) to p1 and (1,1) to p2
  const handleLine1 = `M ${toCanvasX(0)} ${toCanvasY(0)} L ${toCanvasX(p1.x)} ${toCanvasY(p1.y)}`;
  const handleLine2 = `M ${toCanvasX(1)} ${toCanvasY(1)} L ${toCanvasX(p2.x)} ${toCanvasY(p2.y)}`;

  // Progress dot position
  const progressDotX = toCanvasX(previewProgress);
  const progressDotY = toCanvasY(easedProgress);

  return (
    <ToolLayout
      title="CSS Easing Playground"
      description="Design and preview cubic-bezier() easing curves with a visual editor. Drag control points, pick from 10 presets, and see your animation in action — all client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Canvas ────────────────────────────────────────────────────── */}
        <div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Curve Editor</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={previewRunning ? stopPreview : runPreview}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    previewRunning
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                      : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
                  }`}
                >
                  {previewRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Preview
                    </>
                  )}
                </button>
                <button
                  onClick={stopPreview}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-light transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={canvasRef}
              className="relative select-none touch-none mx-auto"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <svg
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                className="block"
              >
                {/* Background */}
                <rect
                  x={PADDING}
                  y={PADDING}
                  width={GRAPH_SIZE}
                  height={GRAPH_SIZE}
                  fill="#0f172a"
                  rx={4}
                />

                {/* Grid lines */}
                {[GRID_STEP, GRID_STEP * 2, GRID_STEP * 3].map((val) => (
                  <line
                    key={`gv-${val}`}
                    x1={toCanvasX(val)}
                    y1={PADDING}
                    x2={toCanvasX(val)}
                    y2={CANVAS_SIZE - PADDING}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                ))}
                {[GRID_STEP, GRID_STEP * 2, GRID_STEP * 3].map((val) => (
                  <line
                    key={`gh-${val}`}
                    x1={PADDING}
                    y1={toCanvasY(val)}
                    x2={CANVAS_SIZE - PADDING}
                    y2={toCanvasY(val)}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                ))}

                {/* Diagonal reference line (linear) */}
                <line
                  x1={PADDING}
                  y1={CANVAS_SIZE - PADDING}
                  x2={CANVAS_SIZE - PADDING}
                  y2={PADDING}
                  stroke="#334155"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />

                {/* Handle lines */}
                <line
                  x1={toCanvasX(0)}
                  y1={toCanvasY(0)}
                  x2={toCanvasX(p1.x)}
                  y2={toCanvasY(p1.y)}
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
                <line
                  x1={toCanvasX(1)}
                  y1={toCanvasY(1)}
                  x2={toCanvasX(p2.x)}
                  y2={toCanvasY(p2.y)}
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />

                {/* Curve */}
                <path
                  d={curvePathD}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />

                {/* Control points */}
                <circle
                  cx={toCanvasX(p1.x)}
                  cy={toCanvasY(p1.y)}
                  r={POINT_RADIUS}
                  fill={dragging === 'p1' ? '#a78bfa' : '#6366f1'}
                  stroke="#c7d2fe"
                  strokeWidth={2}
                  style={{ cursor: 'grab' }}
                />
                <circle
                  cx={toCanvasX(p2.x)}
                  cy={toCanvasY(p2.y)}
                  r={POINT_RADIUS}
                  fill={dragging === 'p2' ? '#a78bfa' : '#6366f1'}
                  stroke="#c7d2fe"
                  strokeWidth={2}
                  style={{ cursor: 'grab' }}
                />

                {/* Fixed endpoints */}
                <circle
                  cx={toCanvasX(0)}
                  cy={toCanvasY(0)}
                  r={4}
                  fill="#475569"
                />
                <circle
                  cx={toCanvasX(1)}
                  cy={toCanvasY(1)}
                  r={4}
                  fill="#475569"
                />

                {/* Progress dot (animated) */}
                {previewRunning && progressDotY && (
                  <circle
                    cx={progressDotX}
                    cy={progressDotY}
                    r={6}
                    fill="#f59e0b"
                    stroke="#fef3c7"
                    strokeWidth={2}
                  />
                )}
              </svg>
            </div>

            {/* Axis labels */}
            <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
              <span>0</span>
              <span>Time →</span>
              <span>1</span>
            </div>
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS Output</h2>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 font-mono text-lg text-brand-400 overflow-x-auto">
              {cssValue}
            </pre>
            <p className="text-slate-500 text-xs mt-2">
              Use this in <code className="text-slate-400">transition-timing-function</code> or{' '}
              <code className="text-slate-400">animation-timing-function</code>.
            </p>
          </div>

          {/* Live Coordinates */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Control Points</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                <div className="text-slate-500 text-xs mb-1">P1</div>
                <div className="font-mono text-white text-sm">
                  ({p1.x.toFixed(2)}, {p1.y.toFixed(2)})
                </div>
              </div>
              <div className="bg-surface rounded-lg p-3 border border-slate-700/50">
                <div className="text-slate-500 text-xs mb-1">P2</div>
                <div className="font-mono text-white text-sm">
                  ({p2.x.toFixed(2)}, {p2.y.toFixed(2)})
                </div>
              </div>
            </div>
          </div>

          {/* Animation Preview Box */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Live Preview</h2>
            <div className="bg-surface rounded-lg p-4 border border-slate-700/50">
              <div className="relative h-16 bg-slate-800 rounded-lg overflow-hidden">
                {/* Track line */}
                <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-slate-600 -translate-y-1/2" />
                {/* Moving ball */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full transition-none"
                  style={{
                    left: `${previewRunning ? 12 + easedProgress * (100 - 24) : 12}%`,
                    transform: `translate(-50%, -50%) scale(${1 + easedProgress * 0.4})`,
                    background: `radial-gradient(circle at 40% 40%, #818cf8, #4f46e5)`,
                    boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>0s</span>
                <span>{previewRunning ? `${(previewProgress * 2).toFixed(1)}s` : '2.0s'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Presets ───────────────────────────────────────────────────────── */}
      <div className="card mt-6">
        <h2 className="text-white font-semibold text-sm mb-4">Presets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedPreset === preset.name
                  ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30'
                  : 'border-slate-700/50 bg-surface hover:border-slate-600 hover:bg-surface-light'
              }`}
            >
              {/* Mini curve preview */}
              <svg width="100%" height="36" viewBox="0 0 80 36" className="mb-1.5">
                {/* Diagonal reference */}
                <line x1="4" y1="30" x2="76" y2="6" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
                {/* Mini curve */}
                <path
                  d={`M 4 30 ${preset.p1.x === 0 && preset.p1.y === 0 && preset.p2.x === 1 && preset.p2.y === 1 ? 'L 76 6' : `C ${4 + preset.p1.x * 72} ${30 - preset.p1.y * 24}, ${4 + preset.p2.x * 72} ${30 - preset.p2.y * 24}, 76 6`}`}
                  fill="none"
                  stroke={selectedPreset === preset.name ? '#818cf8' : '#475569'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-white text-xs font-medium">{preset.label}</div>
              <div className="text-slate-500 text-[10px] mt-0.5 leading-tight">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Code examples ─────────────────────────────────────────────────── */}
      <div className="card mt-6">
        <h2 className="text-white font-semibold text-sm mb-4">Usage Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              CSS Transition
            </h3>
            <pre className="bg-surface rounded-lg p-3 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto">
              <code>{`.element {
  transition: transform 300ms ${cssValue};
}
.element:hover {
  transform: scale(1.1);
}`}</code>
            </pre>
          </div>
          <div>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              CSS Animation
            </h3>
            <pre className="bg-surface rounded-lg p-3 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto">
              <code>{`@keyframes slide-in {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
.element {
  animation: slide-in 500ms ${cssValue};
}`}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* ── Info ──────────────────────────────────────────────────────────── */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">About Cubic Bezier Easing</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          Cubic bezier curves define animation acceleration. The x-axis represents time (0 to 1)
          and the y-axis represents progress. Drag the control points to shape the curve.
          Points outside the 0-1 y-range create overshoot/anticipation effects.
          For precise input, the numeric values update in real-time as you drag.
        </p>
      </div>
    </ToolLayout>
  );
}
