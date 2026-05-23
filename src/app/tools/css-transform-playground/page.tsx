'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Move, Scaling, RotateCw, AlignStartVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface TransformState {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  skewX: number;
  skewY: number;
  originX: number;
  originY: number;
}

const PRESETS: { name: string; values: TransformState }[] = [
  {
    name: 'Center & Grow',
    values: {
      translateX: 0, translateY: 0,
      scaleX: 1.3, scaleY: 1.3,
      rotate: 0,
      skewX: 0, skewY: 0,
      originX: 50, originY: 50,
    },
  },
  {
    name: 'Tilt Card',
    values: {
      translateX: 0, translateY: 0,
      scaleX: 1.05, scaleY: 1.05,
      rotate: -5,
      skewX: 0, skewY: 0,
      originX: 50, originY: 50,
    },
  },
  {
    name: 'Skewed Panel',
    values: {
      translateX: 0, translateY: 0,
      scaleX: 1, scaleY: 1,
      rotate: 0,
      skewX: -8, skewY: -4,
      originX: 50, originY: 50,
    },
  },
  {
    name: 'Corner Pivot',
    values: {
      translateX: 0, translateY: 0,
      scaleX: 1.2, scaleY: 1.2,
      rotate: 15,
      skewX: 0, skewY: 0,
      originX: 0, originY: 0,
    },
  },
  {
    name: 'Slide Up',
    values: {
      translateX: 0, translateY: -20,
      scaleX: 1, scaleY: 1,
      rotate: 0,
      skewX: 0, skewY: 0,
      originX: 50, originY: 100,
    },
  },
  {
    name: 'Diamond Twist',
    values: {
      translateX: 0, translateY: 0,
      scaleX: 0.85, scaleY: 0.85,
      rotate: 45,
      skewX: 0, skewY: 0,
      originX: 50, originY: 50,
    },
  },
];

const DEFAULT_STATE: TransformState = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  skewX: 0,
  skewY: 0,
  originX: 50,
  originY: 50,
};

function buildTransformCSS(state: TransformState): string {
  const transforms: string[] = [];

  if (state.translateX !== 0 || state.translateY !== 0) {
    transforms.push(`translate(${state.translateX}px, ${state.translateY}px)`);
  }
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    if (state.scaleX === state.scaleY) {
      transforms.push(`scale(${state.scaleX.toFixed(2)})`);
    } else {
      transforms.push(`scale(${state.scaleX.toFixed(2)}, ${state.scaleY.toFixed(2)})`);
    }
  }
  if (state.rotate !== 0) {
    transforms.push(`rotate(${state.rotate}deg)`);
  }
  if (state.skewX !== 0 || state.skewY !== 0) {
    transforms.push(`skew(${state.skewX}deg, ${state.skewY}deg)`);
  }

  const transformValue = transforms.length > 0 ? transforms.join(' ') : 'none';
  const originValue = (state.originX !== 50 || state.originY !== 50)
    ? `\ntransform-origin: ${state.originX}% ${state.originY}%;`
    : '';

  return `transform: ${transformValue};${originValue}`;
}

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-300 font-mono">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

export default function CSSTransformPlaygroundPage() {
  const [state, setState] = useState<TransformState>({ ...DEFAULT_STATE });
  const [uniformScale, setUniformScale] = useState(true);

  const css = useMemo(() => buildTransformCSS(state), [state]);

  const set = useCallback(<K extends keyof TransformState>(key: K, value: TransformState[K]) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      if (uniformScale && (key === 'scaleX' || key === 'scaleY')) {
        next.scaleX = value as number;
        next.scaleY = value as number;
      }
      return next;
    });
  }, [uniformScale]);

  const reset = useCallback(() => {
    setState({ ...DEFAULT_STATE });
    setUniformScale(true);
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setState({ ...preset.values });
  }, []);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [css]);

  const transformStyle: React.CSSProperties = {
    transform: [
      state.translateX !== 0 || state.translateY !== 0
        ? `translate(${state.translateX}px, ${state.translateY}px)` : '',
      state.scaleX !== 1 || state.scaleY !== 1
        ? `scale(${state.scaleX.toFixed(2)}, ${state.scaleY.toFixed(2)})` : '',
      state.rotate !== 0 ? `rotate(${state.rotate}deg)` : '',
      state.skewX !== 0 || state.skewY !== 0
        ? `skew(${state.skewX}deg, ${state.skewY}deg)` : '',
    ].filter(Boolean).join(' '),
    transformOrigin: `${state.originX}% ${state.originY}%`,
  };

  return (
    <ToolLayout
      title="CSS Transform Playground"
      description="Visually build CSS transforms — translate, scale, rotate, skew, and set transform-origin. Live preview and instant CSS copy."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Presets</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Translate */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Move className="w-4 h-4 text-brand-400" />
              Translate
            </h2>
            <SliderControl
              label="Translate X"
              value={state.translateX}
              min={-200}
              max={200}
              unit="px"
              onChange={(v) => set('translateX', v)}
            />
            <SliderControl
              label="Translate Y"
              value={state.translateY}
              min={-200}
              max={200}
              unit="px"
              onChange={(v) => set('translateY', v)}
            />
          </div>

          {/* Scale */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Scaling className="w-4 h-4 text-brand-400" />
                Scale
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uniformScale}
                  onChange={(e) => setUniformScale(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-brand-500"
                />
                <span className="text-xs text-slate-400">Uniform</span>
              </label>
            </div>
            <SliderControl
              label="Scale X"
              value={state.scaleX}
              min={0.1}
              max={3}
              step={0.05}
              onChange={(v) => set('scaleX', v)}
            />
            {!uniformScale && (
              <SliderControl
                label="Scale Y"
                value={state.scaleY}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(v) => set('scaleY', v)}
              />
            )}
          </div>

          {/* Rotate */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-brand-400" />
              Rotate
            </h2>
            <SliderControl
              label="Rotate"
              value={state.rotate}
              min={-360}
              max={360}
              unit="°"
              onChange={(v) => set('rotate', v)}
            />
          </div>

          {/* Skew */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <AlignStartVertical className="w-4 h-4 text-brand-400" />
              Skew
            </h2>
            <SliderControl
              label="Skew X"
              value={state.skewX}
              min={-80}
              max={80}
              unit="°"
              onChange={(v) => set('skewX', v)}
            />
            <SliderControl
              label="Skew Y"
              value={state.skewY}
              min={-80}
              max={80}
              unit="°"
              onChange={(v) => set('skewY', v)}
            />
          </div>

          {/* Transform Origin */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm mb-3">Transform Origin</h2>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {[
                { label: '↖', x: 0, y: 0 },
                { label: '↑', x: 50, y: 0 },
                { label: '↗', x: 100, y: 0 },
                { label: '←', x: 0, y: 50 },
                { label: '●', x: 50, y: 50 },
                { label: '→', x: 100, y: 50 },
                { label: '↙', x: 0, y: 100 },
                { label: '↓', x: 50, y: 100 },
                { label: '↘', x: 100, y: 100 },
              ].map((pt) => (
                <button
                  key={`${pt.x}-${pt.y}`}
                  onClick={() => {
                    set('originX', pt.x);
                    set('originY', pt.y);
                  }}
                  className={`py-2 text-xs rounded-md transition-all ${
                    state.originX === pt.x && state.originY === pt.y
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400">
              Origin: <span className="text-slate-300 font-mono">{state.originX}% {state.originY}%</span>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all
          </button>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Preview</h2>
            <div className="flex items-center justify-center py-20 px-8 min-h-[320px] rounded-lg relative overflow-hidden" style={{ background: '#0f172a' }}>
              {/* Grid for visual reference */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
              {/* Ghost starting position */}
              <div
                className="absolute w-28 h-28 rounded-xl border-2 border-dashed border-slate-600/50"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: '-56px',
                  marginTop: '-56px',
                }}
              />
              {/* Transformed element */}
              <div
                className="w-28 h-28 rounded-xl flex items-center justify-center text-4xl transition-all duration-150 relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                  ...transformStyle,
                }}
              >
                <span className="text-white/90 select-none pointer-events-none">✦</span>
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS Output</h2>
              <button
                onClick={copyCss}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-32 overflow-y-auto">
              {css}
            </pre>
          </div>

          {/* Active Transforms */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Active Transforms</h2>
            <div className="space-y-1.5">
              {(state.translateX !== 0 || state.translateY !== 0) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-400 font-mono w-20">translate</span>
                  <span className="text-slate-400 font-mono">
                    ({state.translateX}px, {state.translateY}px)
                  </span>
                </div>
              )}
              {(state.scaleX !== 1 || state.scaleY !== 1) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-400 font-mono w-20">scale</span>
                  <span className="text-slate-400 font-mono">
                    ({state.scaleX.toFixed(2)}, {state.scaleY.toFixed(2)})
                  </span>
                </div>
              )}
              {state.rotate !== 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-400 font-mono w-20">rotate</span>
                  <span className="text-slate-400 font-mono">
                    ({state.rotate}deg)
                  </span>
                </div>
              )}
              {(state.skewX !== 0 || state.skewY !== 0) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-400 font-mono w-20">skew</span>
                  <span className="text-slate-400 font-mono">
                    ({state.skewX}deg, {state.skewY}deg)
                  </span>
                </div>
              )}
              {(state.originX !== 50 || state.originY !== 50) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-400 font-mono w-20">origin</span>
                  <span className="text-slate-400 font-mono">
                    {state.originX}% {state.originY}%
                  </span>
                </div>
              )}
              {state.translateX === 0 && state.translateY === 0 &&
               state.scaleX === 1 && state.scaleY === 1 &&
               state.rotate === 0 && state.skewX === 0 && state.skewY === 0 &&
               state.originX === 50 && state.originY === 50 && (
                <span className="text-xs text-slate-500">No transforms applied — try a preset!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
