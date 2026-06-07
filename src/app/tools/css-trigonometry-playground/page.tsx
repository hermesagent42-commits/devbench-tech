'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type TrigFunction = 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan' | 'atan2';

interface Preset {
  name: string;
  description: string;
  angle: number;
  fn: TrigFunction;
  scaleX: number;
  scaleY: number;
  useCase: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { name: 'Smooth Oscillation (sin)', description: 'Sine wave animation', angle: 180, fn: 'sin', scaleX: 200, scaleY: 100, useCase: 'translateX: calc(sin(var(--angle)) * 200px)' },
  { name: 'Heartbeat Scale (cos)', description: 'Pulsing scale with cos', angle: 360, fn: 'cos', scaleX: 1, scaleY: 0.5, useCase: 'scale: calc(1 + cos(var(--angle)) * 0.5)' },
  { name: 'Skew Wave (tan)', description: 'Progressive skew with tan', angle: 30, fn: 'tan', scaleX: 30, scaleY: 0, useCase: 'transform: skew(calc(tan(var(--angle)) * 30deg))' },
  { name: 'Circular Motion', description: 'sin + cos for perfect circle', angle: 360, fn: 'sin', scaleX: 150, scaleY: 150, useCase: 'x: calc(sin(angle) * 150px), y: calc(cos(angle) * 150px)' },
  { name: 'Width Modulation', description: 'Dynamic width via sin', angle: 180, fn: 'sin', scaleX: 150, scaleY: 0, useCase: 'width: calc(sin(var(--angle)) * 150px + 150px)' },
  { name: 'Parallax Depth', description: 'Cos for depth illusion', angle: 360, fn: 'cos', scaleX: 100, scaleY: 50, useCase: 'translateZ: calc(cos(var(--angle)) * 100px)' },
  { name: 'Arcsin Clamp', description: 'Inverse trig for clamping', angle: 45, fn: 'asin', scaleX: 100, scaleY: 0, useCase: 'opacity: calc(asin(0.5) * var(--multiplier))' },
  { name: 'Atan2 Follow', description: 'Follow cursor angle', angle: 180, fn: 'atan2', scaleX: 100, scaleY: 100, useCase: 'rotate: calc(inverse-tangent(var(--y), var(--x)) * 1deg)' },
];

const TRIG_FUNCTIONS: { id: TrigFunction; label: string; cssName: string; inputs: string; category: string }[] = [
  { id: 'sin', label: 'sin()', cssName: 'sin()', inputs: 'angle', category: 'Standard' },
  { id: 'cos', label: 'cos()', cssName: 'cos()', inputs: 'angle', category: 'Standard' },
  { id: 'tan', label: 'tan()', cssName: 'tan()', inputs: 'angle', category: 'Standard' },
  { id: 'asin', label: 'asin()', cssName: 'asin()', inputs: 'value (-1 to 1)', category: 'Inverse' },
  { id: 'acos', label: 'acos()', cssName: 'acos()', inputs: 'value (-1 to 1)', category: 'Inverse' },
  { id: 'atan', label: 'atan()', cssName: 'atan()', inputs: 'value', category: 'Inverse' },
  { id: 'atan2', label: 'atan2()', cssName: 'atan2()', inputs: 'y, x', category: '2-Argument' },
];

// ── Math Helpers ───────────────────────────────────────────────────────────

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function computeTrigValue(fn: TrigFunction, angleDeg: number, param2?: number): number {
  const rad = degToRad(angleDeg);
  switch (fn) {
    case 'sin': return Math.sin(rad);
    case 'cos': return Math.cos(rad);
    case 'tan': return Math.abs(angleDeg % 180) < 89 ? Math.tan(rad) : (angleDeg % 180 < 0 ? -Infinity : Infinity);
    case 'asin': return Math.asin(Math.min(1, Math.max(-1, Math.sin(rad))));
    case 'acos': return Math.acos(Math.min(1, Math.max(-1, Math.cos(rad))));
    case 'atan': return Math.atan(Math.tan(rad));
    case 'atan2': {
      const y = Math.sin(rad);
      const x = Math.cos(rad);
      return Math.atan2(y, x);
    }
  }
}

function generateCSS(angle: number, fn: TrigFunction, scaleX: number, scaleY: number, animate: boolean): string {
  const angleVal = animate ? 'var(--angle)' : `${angle}deg`;
  const isInverse = ['asin', 'acos', 'atan', 'atan2'].includes(fn);

  if (isInverse) {
    const sinRad = Math.sin(degToRad(angle));
    const cosRad = Math.cos(degToRad(angle));
    const xVal = cosRad.toFixed(3);
    const yVal = sinRad.toFixed(3);

    const lines: string[] = [];
    lines.push('/* CSS Trigonometric Functions — Inverse */');
    lines.push('');

    if (fn === 'asin') {
      lines.push(`/* asin() takes a value between -1 and 1 */`);
      lines.push(`--input-value: ${sinRad.toFixed(3)};`);
      lines.push(`--result: asin(${sinRad.toFixed(3)}); /* ${radToDeg(Math.asin(sinRad)).toFixed(1)}deg in radians */`);
    } else if (fn === 'acos') {
      lines.push(`/* acos() takes a value between -1 and 1 */`);
      lines.push(`--input-value: ${cosRad.toFixed(3)};`);
      lines.push(`--result: acos(${cosRad.toFixed(3)}); /* ${radToDeg(Math.acos(cosRad)).toFixed(1)}deg in radians */`);
    } else if (fn === 'atan') {
      lines.push(`/* atan() returns the arctangent in radians */`);
      lines.push(`--input-value: ${sinRad.toFixed(3)};`);
      lines.push(`--result: atan(${sinRad.toFixed(3)}); /* ${radToDeg(Math.atan(sinRad)).toFixed(1)}deg in radians */`);
    } else if (fn === 'atan2') {
      lines.push(`/* atan2(y, x) — 2-argument arctangent */`);
      lines.push(`--x: ${xVal};`);
      lines.push(`--y: ${yVal};`);
      lines.push(`--angle: atan2(${yVal}, ${xVal}); /* ${radToDeg(Math.atan2(sinRad, cosRad)).toFixed(1)}deg */`);
    }

    lines.push(`--scale-x: ${scaleX}px;`);
    lines.push(`--scale-y: ${scaleY}px;`);
    lines.push('');
    lines.push('.example {');
    if (scaleX > 0) lines.push(`  width: var(--scale-x);`);
    if (scaleY > 0) lines.push(`  height: var(--scale-y);`);
    lines.push('}');

    return lines.join('\n');
  }

  const lines: string[] = [];
  lines.push('/* CSS Trigonometric Functions */');
  if (animate) {
    lines.push('/* Toggle angle animation to see live changes */');
    lines.push('@property --angle {');
    lines.push('  syntax: "<angle>";');
    lines.push('  initial-value: 0deg;');
    lines.push('  inherits: false;');
    lines.push('}');
    lines.push('');
    lines.push('@keyframes rotate-angle {');
    lines.push('  from { --angle: 0deg; }');
    lines.push('  to { --angle: 360deg; }');
    lines.push('}');
    lines.push('');
    lines.push(':root {');
    lines.push(`  animation: rotate-angle 8s linear infinite;`);
    lines.push('}');
    lines.push('');
  }
  lines.push('/* Computed with current angle */');
  lines.push(`--angle: ${angleVal};`);
  lines.push(`--sin-value: ${fn === 'sin' ? computeTrigValue('sin', angle).toFixed(3) : 'sin(var(--angle))'};`);
  lines.push(`--cos-value: ${fn === 'cos' ? computeTrigValue('cos', angle).toFixed(3) : 'cos(var(--angle))'};`);
  lines.push(`--tan-value: ${fn === 'tan' ? computeTrigValue('tan', angle).toFixed(3) : 'tan(var(--angle))'};`);
  lines.push('');
  lines.push('.animated-element {');
  if (scaleX > 0 && scaleY > 0) {
    lines.push(`  left: calc(50% + ${fn}(var(--angle)) * ${scaleX}px);`);
    lines.push(`  top: calc(50% + cos(var(--angle)) * ${scaleY}px);`);
  } else if (scaleX > 0) {
    lines.push(`  left: calc(50% + ${fn}(var(--angle)) * ${scaleX}px);`);
  } else if (scaleY > 0) {
    lines.push(`  top: calc(50% + ${fn}(var(--angle)) * ${scaleY}px);`);
  }
  if (fn === 'cos' || fn === 'sin') {
    lines.push(`  transform: translate(-50%, -50%) scale(calc(0.5 + ${fn}(var(--angle)) * 0.5 + 0.5));`);
  } else {
    lines.push('  transform: translate(-50%, -50%);');
  }
  lines.push('}');

  return lines.join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssTrigonometryPlaygroundPage() {
  const [angle, setAngle] = useState(90);
  const [activeFn, setActiveFn] = useState<TrigFunction>('sin');
  const [activePreset, setActivePreset] = useState<string>('Circular Motion');
  const [scaleX, setScaleX] = useState(150);
  const [scaleY, setScaleY] = useState(150);
  const [animate, setAnimate] = useState(false);
  const animationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const trigValue = useMemo(() => computeTrigValue(activeFn, angle), [activeFn, angle]);
  const sinValue = useMemo(() => Math.sin(degToRad(angle)), [angle]);
  const cosValue = useMemo(() => Math.cos(degToRad(angle)), [angle]);
  const tanValue = useMemo(() => {
    if (Math.abs(angle % 180) < 89) return Math.tan(degToRad(angle));
    return 0;
  }, [angle]);

  const cssOutput = useMemo(() => generateCSS(angle, activeFn, scaleX, scaleY, animate), [angle, activeFn, scaleX, scaleY, animate]);

  // Canvas unit circle drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r - 15, cy);
    ctx.lineTo(cx + r + 15, cy);
    ctx.moveTo(cx, cy - r - 15);
    ctx.lineTo(cx, cy + r + 15);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('x', cx + r + 22, cy + 4);
    ctx.fillText('y', cx, cy - r - 22);

    // Unit circle
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Angles at 0, 30, 45, 60, 90, 120, 135, 150, 180...
    const refAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
    for (const a of refAngles) {
      const rad = degToRad(a);
      const ex = cx + Math.cos(rad) * r;
      const ey = cy - Math.sin(rad) * r;
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Current angle line
    const rad = degToRad(angle);
    const ex = cx + Math.cos(rad) * r;
    const ey = cy - Math.sin(rad) * r;
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Point on circle
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Sine line (vertical)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ex, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cosine line (horizontal)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, ey);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sine value text
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`sin: ${sinValue.toFixed(3)}`, cx + r + 40, cy - 25);

    // Cosine value text
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`cos: ${cosValue.toFixed(3)}`, cx + r + 40, cy - 10);

    // Tan value text
    ctx.fillStyle = '#eab308';
    ctx.fillText(`tan: ${Math.abs(tanValue) > 1000 ? '±∞' : tanValue.toFixed(3)}`, cx + r + 40, cy + 5);

    // Angle text
    ctx.fillStyle = '#6366f1';
    ctx.fillText(`θ: ${angle}°`, cx + r + 40, cy + 20);

    // Angle arc
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, -Math.PI / 2, -Math.PI / 2 - rad, angle > 0);
    ctx.stroke();
  }, [angle, sinValue, cosValue, tanValue]);

  // Animation loop
  useEffect(() => {
    if (!animate) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    let lastTime = 0;
    const loop = (time: number) => {
      if (lastTime > 0) {
        const delta = (time - lastTime) / 1000;
        setAngle((prev) => ((prev + delta * 45) % 360 + 360) % 360);
      }
      lastTime = time;
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  const handleAngleInput = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(360, val));
    setAngle(clamped);
    setActivePreset('Custom');
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setActiveFn(preset.fn);
    setScaleX(preset.scaleX);
    setScaleY(preset.scaleY);
    setAngle(preset.angle);
    setActivePreset(preset.name);
    setAnimate(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [cssOutput]);

  const resetAll = useCallback(() => {
    setAngle(90);
    setActiveFn('sin');
    setScaleX(150);
    setScaleY(150);
    setActivePreset('Custom');
    setAnimate(false);
  }, []);

  const canvasSize = 320;

  const isInverse = ['asin', 'acos', 'atan', 'atan2'].includes(activeFn);

  // Build animated example style
  const exampleStyle = useMemo(() => {
    const rad = degToRad(angle);
    const sv = Math.sin(rad);
    const cv = Math.cos(rad);

    let left = 50;
    let top = 50;
    let scale = 1;

    if (scaleX > 0 && scaleY > 0) {
      if (!isInverse) {
        const fnVal = activeFn === 'sin' ? sv : activeFn === 'cos' ? cv : activeFn === 'tan' ? sv / cv : sv;
        left = 50 + fnVal * (scaleX / 3);
        top = 50 - cv * (scaleY / 3);
        scale = 0.5 + (activeFn === 'cos' || activeFn === 'sin' ? (activeFn === 'cos' ? cv : sv) : 0) * 0.5 + 0.5;
      } else {
        left = 50 + sv * (scaleX / 3);
        top = 50 - cv * (scaleY / 3);
      }
    } else if (scaleX > 0) {
      if (!isInverse) {
        const fnVal = activeFn === 'sin' ? sv : activeFn === 'cos' ? cv : activeFn === 'tan' ? sv / cv : sv;
        left = 50 + fnVal * (scaleX / 3);
      } else {
        left = 50 + sv * (scaleX / 3);
      }
    } else if (scaleY > 0) {
      if (!isInverse) {
        const fnVal = activeFn === 'sin' ? sv : activeFn === 'cos' ? cv : activeFn === 'tan' ? sv / cv : sv;
        top = 50 - fnVal * (scaleY / 3);
      } else {
        top = 50 - cv * (scaleY / 3);
      }
    }

    return {
      left: `${Math.max(5, Math.min(95, left))}%`,
      top: `${Math.max(5, Math.min(95, top))}%`,
      transform: `translate(-50%, -50%) scale(${Math.max(0.3, Math.min(2, scale))})`,
    };
  }, [angle, activeFn, scaleX, scaleY, isInverse]);

  const inputLabel = isInverse ? 'Input value (mapped from sin/cos of angle)' : 'Angle (degrees)';
  const displayVal = isInverse
    ? (activeFn === 'asin' ? sinValue : activeFn === 'acos' ? cosValue : sinValue).toFixed(3)
    : `${angle}°`;

  return (
    <ToolLayout
      title="CSS Trigonometry Playground"
      description="Interactively explore CSS trigonometric functions — sin(), cos(), tan(), asin(), acos(), atan(), and atan2(). See them on a unit circle, generate live CSS, and watch the animation. Built for the CSS Trigonometric Functions spec."
    >
      {/* Presets */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-300 mb-2 block">Quick Presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === preset.name
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-surface-lighter text-slate-400 hover:text-slate-200 hover:bg-surface-light border border-slate-700/50'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {activePreset === 'Custom' && (
          <p className="text-xs text-amber-400/70 mt-1.5">Custom configuration</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Unit Circle Canvas + Controls */}
        <div>
          {/* Canvas */}
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-300">Unit Circle</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnimate(!animate)}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  animate
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border-slate-700/50'
                }`}
              >
                {animate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {animate ? 'Pause' : 'Animate'}
              </button>
              <button
                onClick={resetAll}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="rounded-xl border border-slate-700/50 w-full max-w-[320px] mx-auto block"
          />

          {/* Angle Slider */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-medium ${activePreset === 'Custom' ? 'text-brand-300' : 'text-slate-400'}`}>
                {inputLabel}
              </label>
              <span className="text-xs font-mono tabular-nums text-amber-300">{displayVal}</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={0.5}
              value={angle}
              onChange={(e) => handleAngleInput(Number(e.target.value))}
              className="w-full accent-brand-500 h-1.5"
              disabled={animate}
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>0°</span>
              <span className="text-slate-700">360°</span>
              <span>360°</span>
            </div>

            {/* Angle quick jumps */}
            <div className="flex flex-wrap gap-1">
              {[0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map((a) => (
                <button
                  key={a}
                  onClick={() => handleAngleInput(a)}
                  className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                    Math.abs(angle - a) < 0.5
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                      : 'bg-surface-lighter text-slate-500 hover:text-slate-300 border-slate-700/50'
                  }`}
                  disabled={animate}
                >
                  {a}°
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Point</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 inline-block" /> Angle</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-green-500 inline-block w-4" /> sin(θ)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-500 inline-block w-4" /> cos(θ)</span>
            </div>
          </div>
        </div>

        {/* Right: Function Selection + CSS Output + Preview */}
        <div className="flex flex-col gap-4">
          {/* Function picker */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Function</label>
            <div className="flex flex-wrap gap-1.5">
              {TRIG_FUNCTIONS.map((tf) => {
                const isActive = activeFn === tf.id;
                return (
                  <button
                    key={tf.id}
                    onClick={() => { setActiveFn(tf.id); setActivePreset('Custom'); }}
                    title={`${tf.cssName} — ${tf.inputs}`}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      isActive
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-surface-lighter text-slate-400 hover:text-slate-200 hover:bg-surface-light border-slate-700/50'
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {TRIG_FUNCTIONS.find((t) => t.id === activeFn)?.cssName} accepts {TRIG_FUNCTIONS.find((t) => t.id === activeFn)?.inputs}
            </p>
          </div>

          {/* Scale controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Scale X (px)</label>
              <input
                type="number"
                min={0}
                max={500}
                step={10}
                value={scaleX}
                onChange={(e) => { setScaleX(Math.max(0, Number(e.target.value))); setActivePreset('Custom'); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Scale Y (px)</label>
              <input
                type="number"
                min={0}
                max={500}
                step={10}
                value={scaleY}
                onChange={(e) => { setScaleY(Math.max(0, Number(e.target.value))); setActivePreset('Custom'); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Live element preview */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Live Element Preview</label>
            <div className="relative rounded-xl border border-slate-700/50 bg-slate-900/50 h-[180px] overflow-hidden">
              {/* Grid */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(71,85,105,0.15) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(71,85,105,0.15) 1px, transparent 1px)
                  `,
                  backgroundSize: '30px 30px',
                }}
              />
              {/* Crosshair center */}
              <div className="absolute left-1/2 top-1/2 w-px h-full bg-slate-700/40" />
              <div className="absolute top-1/2 left-0 w-full h-px bg-slate-700/40" />
              {/* Animated element */}
              <div
                className="absolute w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 shadow-lg shadow-rose-500/20 transition-[left,top,transform] duration-100"
                style={exampleStyle}
              />
              {/* Trail dots to show path for non-inverse functions */}
              {!isInverse && scaleX > 0 && scaleY > 0 && (
                <>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const a = (i / 12) * 360;
                    const r = degToRad(a);
                    const sv = Math.sin(r);
                    const cv = Math.cos(r);
                    const fnVal = activeFn === 'sin' ? sv : activeFn === 'cos' ? cv : activeFn === 'tan' ? (Math.abs(a % 180) < 89 ? sv / cv : 0) : sv;
                    const l = 50 + fnVal * (scaleX / 3);
                    const t = 50 - cv * (scaleY / 3);
                    return (
                      <div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full bg-slate-600/50"
                        style={{
                          left: `${Math.max(1, Math.min(99, l))}%`,
                          top: `${Math.max(1, Math.min(99, t))}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    );
                  })}
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Element position driven by {activeFn}() — green dots show path
            </p>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Generated CSS</label>
              <button
                onClick={copyCSS}
                className="btn-secondary flex items-center gap-1 text-xs py-1 px-2"
              >
                <Copy className="w-3 h-3" />
                Copy CSS
              </button>
            </div>
            <pre className="card bg-slate-950 border-slate-700/50 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-[250px] overflow-y-auto whitespace-pre">
              {cssOutput}
            </pre>
          </div>

          {/* Value table */}
          <div className="card bg-slate-800/50 border-slate-700/50 p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Current Function Values</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">sin({angle}°)</span>
                <span className="font-mono text-green-400">{sinValue.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">cos({angle}°)</span>
                <span className="font-mono text-blue-400">{cosValue.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">tan({angle}°)</span>
                <span className="font-mono text-amber-400">{Math.abs(tanValue) > 1000 ? '±∞' : tanValue.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">radians</span>
                <span className="font-mono text-slate-300">{degToRad(angle).toFixed(4)}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              CSS trigonometric functions accept angles in degrees (deg), radians (rad), gradians (grad), or turns.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
