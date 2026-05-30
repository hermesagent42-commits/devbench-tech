'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play, Pause, RotateCcw, Copy, Check, Plus, Trash2, GripHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface KeyframeState {
  translateX: number;   // px
  translateY: number;   // px
  rotate: number;       // deg
  scale: number;        // multiplier
  opacity: number;      // 0-1
  backgroundColor: string;
}

interface PresetDef {
  name: string;
  label: string;
  description: string;
  stops: Record<number, Partial<KeyframeState>>;
  duration: number;
  timingFunction: string;
  iterationCount: string;
  direction: string;
}

const DEFAULT_STOP: KeyframeState = {
  translateX: 0, translateY: 0, rotate: 0,
  scale: 1, opacity: 1, backgroundColor: '#6366f1',
};

const PRESETS: PresetDef[] = [
  {
    name: 'fadeIn', label: 'Fade In', description: 'Smooth opacity transition from hidden to visible',
    stops: { 0: { opacity: 0 }, 100: { opacity: 1 } },
    duration: 1, timingFunction: 'ease', iterationCount: '1', direction: 'normal',
  },
  {
    name: 'slideInLeft', label: 'Slide In Left', description: 'Element slides in from the left',
    stops: { 0: { translateX: -100, opacity: 0 }, 100: { translateX: 0, opacity: 1 } },
    duration: 0.6, timingFunction: 'ease-out', iterationCount: '1', direction: 'normal',
  },
  {
    name: 'slideInRight', label: 'Slide In Right', description: 'Element slides in from the right',
    stops: { 0: { translateX: 100, opacity: 0 }, 100: { translateX: 0, opacity: 1 } },
    duration: 0.6, timingFunction: 'ease-out', iterationCount: '1', direction: 'normal',
  },
  {
    name: 'slideInUp', label: 'Slide In Up', description: 'Element slides in from below',
    stops: { 0: { translateY: 50, opacity: 0 }, 100: { translateY: 0, opacity: 1 } },
    duration: 0.5, timingFunction: 'ease-out', iterationCount: '1', direction: 'normal',
  },
  {
    name: 'bounce', label: 'Bounce', description: 'Classic bouncing effect',
    stops: {
      0: { translateY: 0 }, 20: { translateY: -40 }, 40: { translateY: 0 },
      60: { translateY: -20 }, 80: { translateY: 0 }, 100: { translateY: 0 },
    },
    duration: 1.2, timingFunction: 'ease', iterationCount: '1', direction: 'normal',
  },
  {
    name: 'pulse', label: 'Pulse', description: 'Gentle scaling pulse — great for attention',
    stops: {
      0: { scale: 1 }, 50: { scale: 1.08 }, 100: { scale: 1 },
    },
    duration: 1.5, timingFunction: 'ease-in-out', iterationCount: 'infinite', direction: 'normal',
  },
  {
    name: 'shake', label: 'Shake', description: 'Horizontal shake for error states',
    stops: {
      0: { translateX: 0 }, 10: { translateX: -10 }, 30: { translateX: 10 },
      50: { translateX: -10 }, 70: { translateX: 10 }, 90: { translateX: -5 }, 100: { translateX: 0 },
    },
    duration: 0.5, timingFunction: 'ease', iterationCount: '1', direction: 'normal',
  },
  {
    name: 'spin', label: 'Spin', description: 'Continuous rotation — perfect for loaders',
    stops: { 0: { rotate: 0 }, 100: { rotate: 360 } },
    duration: 1, timingFunction: 'linear', iterationCount: 'infinite', direction: 'normal',
  },
  {
    name: 'wiggle', label: 'Wiggle', description: 'Subtle rotational wiggle',
    stops: {
      0: { rotate: -6 }, 25: { rotate: 6 }, 50: { rotate: -4 },
      75: { rotate: 4 }, 100: { rotate: 0 },
    },
    duration: 0.8, timingFunction: 'ease-in-out', iterationCount: '1', direction: 'normal',
  },
  {
    name: 'flip', label: 'Flip', description: '3D card flip effect',
    stops: { 0: { rotate: 0 }, 50: { rotate: 180 }, 100: { rotate: 360 } },
    duration: 1.5, timingFunction: 'ease-in-out', iterationCount: '1', direction: 'normal',
  },
];

// ── Color presets for background ───────────────────────────────────────────

const COLOR_PRESETS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function valueToPercent(v: number, min: number, max: number) {
  return clamp(((v - min) / (max - min)) * 100, 0, 100);
}

function percentToValue(pct: number, min: number, max: number) {
  return min + (max - min) * (pct / 100);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssKeyframesBuilderPage() {
  const [keyframes, setKeyframes] = useState<Map<number, KeyframeState>>(() => {
    const m = new Map<number, KeyframeState>();
    m.set(0, { ...DEFAULT_STOP });
    m.set(100, { ...DEFAULT_STOP, translateX: 0 });
    return m;
  });
  const [selectedStop, setSelectedStop] = useState<number>(0);
  const [animationName, setAnimationName] = useState('myAnimation');
  const [duration, setDuration] = useState(1);
  const [timingFunction, setTimingFunction] = useState('ease');
  const [iterationCount, setIterationCount] = useState('1');
  const [direction, setDirection] = useState('normal');
  const [fillMode, setFillMode] = useState('none');
  const [delay, setDelay] = useState(0);
  const [previewRunning, setPreviewRunning] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');

  const timelineRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Sort stops ────────────────────────────────────────────────────────

  const sortedStops = useMemo(() => {
    return Array.from(keyframes.entries()).sort(([a], [b]) => a - b);
  }, [keyframes]);

  // ── Generate CSS ──────────────────────────────────────────────────────

  const generatedCSS = useMemo(() => {
    const lines: string[] = [];
    lines.push(`@keyframes ${animationName} {`);
    for (const [pct, state] of sortedStops) {
      const props: string[] = [];
      props.push(`    transform: translate(${state.translateX}px, ${state.translateY}px) rotate(${state.rotate}deg) scale(${state.scale.toFixed(2)});`);
      props.push(`    opacity: ${state.opacity.toFixed(2)};`);
      props.push(`    background-color: ${state.backgroundColor};`);
      lines.push(`  ${pct}% {`);
      lines.push(...props);
      lines.push(`  }`);
    }
    lines.push(`}`);
    lines.push(``);
    const animVal = `${animationName} ${duration}s ${timingFunction} ${delay}s ${iterationCount} ${direction} ${fillMode}`.replace(/\s+/g, ' ').trim();
    lines.push(`/* Usage: */`);
    lines.push(`.animated-element {`);
    lines.push(`  animation: ${animVal};`);
    lines.push(`}`);
    return lines.join('\n');
  }, [sortedStops, animationName, duration, timingFunction, delay, iterationCount, direction, fillMode]);

  // ── Selected stop state ───────────────────────────────────────────────

  const currentStop = keyframes.get(selectedStop) ?? DEFAULT_STOP;

  const updateSelected = useCallback((updates: Partial<KeyframeState>) => {
    setKeyframes(prev => {
      const next = new Map(prev);
      const existing = next.get(selectedStop) ?? DEFAULT_STOP;
      next.set(selectedStop, { ...existing, ...updates });
      return next;
    });
  }, [selectedStop]);

  // ── Add / remove stops ────────────────────────────────────────────────

  const addStop = useCallback((pct: number) => {
    const rounded = Math.round(clamp(pct, 0, 100));
    if (keyframes.has(rounded)) return;
    // Interpolate values from neighbors
    const before = sortedStops.filter(([p]) => p < rounded).pop();
    const after = sortedStops.find(([p]) => p > rounded);
    let interp: KeyframeState = { ...DEFAULT_STOP };
    if (before && after) {
      const ratio = (rounded - before[0]) / (after[0] - before[0]);
      interp = {
        translateX: before[1].translateX + (after[1].translateX - before[1].translateX) * ratio,
        translateY: before[1].translateY + (after[1].translateY - before[1].translateY) * ratio,
        rotate: before[1].rotate + (after[1].rotate - before[1].rotate) * ratio,
        scale: before[1].scale + (after[1].scale - before[1].scale) * ratio,
        opacity: before[1].opacity + (after[1].opacity - before[1].opacity) * ratio,
        backgroundColor: ratio < 0.5 ? before[1].backgroundColor : after[1].backgroundColor,
      };
    }
    setKeyframes(prev => {
      const next = new Map(prev);
      next.set(rounded, interp);
      return next;
    });
    setSelectedStop(rounded);
  }, [keyframes, sortedStops]);

  const removeStop = useCallback((pct: number) => {
    if (pct === 0 || pct === 100) return; // cannot remove endpoints
    setKeyframes(prev => {
      const next = new Map(prev);
      next.delete(pct);
      return next;
    });
    if (selectedStop === pct) setSelectedStop(0);
  }, [selectedStop]);

  // ── Timeline click ────────────────────────────────────────────────────

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.round((x / rect.width) * 100);
    if (keyframes.has(pct)) {
      setSelectedStop(pct);
    } else {
      addStop(pct);
    }
  }, [keyframes, addStop]);

  // ── Apply preset ──────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: PresetDef) => {
    const m = new Map<number, KeyframeState>();
    for (const [pct, partial] of Object.entries(preset.stops)) {
      m.set(Number(pct), { ...DEFAULT_STOP, ...partial });
    }
    setKeyframes(m);
    setSelectedStop(0);
    setDuration(preset.duration);
    setTimingFunction(preset.timingFunction);
    setIterationCount(preset.iterationCount);
    setDirection(preset.direction);
    setSelectedPreset(preset.name);
    setPreviewRunning(true);
  }, []);

  // ── Copy ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(generatedCSS);
    setCopied(true);
    toast.success('CSS copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCSS]);

  // ── Preview animation style ───────────────────────────────────────────

  const animVal = `${animationName} ${duration}s ${timingFunction} ${delay}s ${iterationCount} ${direction} ${fillMode}`.replace(/\s+/g, ' ').trim();

  // Inject keyframes style
  const styleContent = useMemo(() => {
    const lines = [`@keyframes ${animationName} {`];
    for (const [pct, state] of sortedStops) {
      lines.push(`${pct}% {`);
      lines.push(`  transform: translate(${state.translateX}px, ${state.translateY}px) rotate(${state.rotate}deg) scale(${state.scale.toFixed(2)});`);
      lines.push(`  opacity: ${state.opacity.toFixed(2)};`);
      lines.push(`  background-color: ${state.backgroundColor};`);
      lines.push(`}`);
    }
    lines.push(`}`);
    return lines.join('\n');
  }, [sortedStops, animationName]);

  // ── Compute transform string for preview ──────────────────────────────

  const previewTransform = useMemo(() => {
    const s = currentStop;
    return `translate(${s.translateX}px, ${s.translateY}px) rotate(${s.rotate}deg) scale(${s.scale.toFixed(2)})`;
  }, [currentStop]);

  return (
    <ToolLayout
      title="CSS Keyframes Builder"
      description="Visually design CSS @keyframes animations — add stops, tweak properties, and get production-ready CSS."
    >
      <style>{previewRunning ? styleContent : ''}</style>

      {/* ── Presets ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedPreset === p.name
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                  : 'bg-surface-light border border-slate-700/50 text-slate-300 hover:border-slate-600'
              }`}
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <div className="mb-6 p-4 rounded-xl bg-surface-light border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Timeline</span>
          <span className="text-xs text-slate-500">{sortedStops.length} stops</span>
        </div>
        <div
          ref={timelineRef}
          className="relative h-20 cursor-pointer rounded-lg bg-slate-800/50 border border-slate-700/30"
          onClick={handleTimelineClick}
        >
          {/* Track line */}
          <div className="absolute top-1/2 left-4 right-4 h-1 -translate-y-1/2 rounded-full bg-slate-700" />
          {/* Stop markers */}
          {sortedStops.map(([pct]) => {
            const isSelected = selectedStop === pct;
            const isEndpoint = pct === 0 || pct === 100;
            return (
              <div
                key={pct}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                  isSelected ? 'z-10' : 'z-0'
                }`}
                style={{ left: `${4 + (pct / 100) * (100 - 8)}%` }}
                onClick={(e) => { e.stopPropagation(); setSelectedStop(pct); }}
              >
                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                  isSelected
                    ? 'bg-brand-500 border-white shadow-lg shadow-brand-500/30 scale-125'
                    : 'bg-slate-600 border-slate-400 hover:border-slate-300'
                } ${isEndpoint ? 'ring-2 ring-slate-500/30' : ''}`} />
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-400 whitespace-nowrap">
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">Click on the timeline to add a stop. Click a marker to select it. Endpoints (0% &amp; 100%) cannot be removed.</p>
      </div>

      {/* ── Preview + Properties ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Preview */}
        <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Preview</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewRunning(!previewRunning)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                title={previewRunning ? 'Pause' : 'Play'}
              >
                {previewRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setPreviewRunning(false); setTimeout(() => setPreviewRunning(true), 10); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center h-48 rounded-lg bg-slate-800/60 border border-slate-700/30">
            <div
              ref={previewRef}
              className="w-20 h-20 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg"
              style={{
                animation: previewRunning ? animVal : 'none',
                transform: currentStop ? previewTransform : 'none',
                opacity: currentStop?.opacity ?? 1,
                backgroundColor: currentStop?.backgroundColor ?? '#6366f1',
                transition: previewRunning ? 'none' : 'transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease',
              }}
            >
              DB
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 text-center">
            {previewRunning ? 'Animation playing' : 'Showing selected stop static'}
          </div>
        </div>

        {/* Properties panel */}
        <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Stop Properties</span>
            <span className="text-xs text-brand-400 font-mono">{selectedStop}%</span>
          </div>
          <div className="space-y-3">
            {/* Translate X */}
            <PropertySlider
              label="Translate X"
              value={currentStop.translateX}
              min={-200} max={200} step={1}
              unit="px"
              onChange={v => updateSelected({ translateX: v })}
            />
            {/* Translate Y */}
            <PropertySlider
              label="Translate Y"
              value={currentStop.translateY}
              min={-200} max={200} step={1}
              unit="px"
              onChange={v => updateSelected({ translateY: v })}
            />
            {/* Rotate */}
            <PropertySlider
              label="Rotate"
              value={currentStop.rotate}
              min={-360} max={360} step={1}
              unit="deg"
              onChange={v => updateSelected({ rotate: v })}
            />
            {/* Scale */}
            <PropertySlider
              label="Scale"
              value={currentStop.scale}
              min={0} max={3} step={0.05}
              unit="×"
              onChange={v => updateSelected({ scale: v })}
            />
            {/* Opacity */}
            <PropertySlider
              label="Opacity"
              value={currentStop.opacity}
              min={0} max={1} step={0.01}
              unit=""
              onChange={v => updateSelected({ opacity: v })}
            />
            {/* Background Color */}
            <div>
              <label className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Background</span>
                <span className="font-mono text-slate-300">{currentStop.backgroundColor}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentStop.backgroundColor}
                  onChange={e => updateSelected({ backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
                />
                <div className="flex flex-wrap gap-1">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateSelected({ backgroundColor: c })}
                      className={`w-5 h-5 rounded transition-transform hover:scale-110 ${
                        currentStop.backgroundColor === c ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Remove button */}
            {selectedStop !== 0 && selectedStop !== 100 && (
              <button
                onClick={() => removeStop(selectedStop)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove this stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Animation Settings ────────────────────────────────────────── */}
      <div className="mb-6 p-4 rounded-xl bg-surface-light border border-slate-700/50">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-3">Animation Settings</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SettingField label="Name">
            <input
              type="text" value={animationName}
              onChange={e => setAnimationName(e.target.value || 'myAnimation')}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500"
            />
          </SettingField>
          <SettingField label="Duration (s)">
            <input
              type="number" value={duration} min={0.1} max={60} step={0.1}
              onChange={e => setDuration(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500"
            />
          </SettingField>
          <SettingField label="Delay (s)">
            <input
              type="number" value={delay} min={0} max={60} step={0.1}
              onChange={e => setDelay(Math.max(0, Number(e.target.value)))}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500"
            />
          </SettingField>
          <SettingField label="Easing">
            <select
              value={timingFunction}
              onChange={e => setTimingFunction(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
            >
              {['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Iterations">
            <select
              value={iterationCount}
              onChange={e => setIterationCount(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
            >
              {['1', '2', '3', '5', 'infinite'].map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Direction">
            <select
              value={direction}
              onChange={e => setDirection(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
            >
              {['normal', 'reverse', 'alternate', 'alternate-reverse'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </SettingField>
        </div>
      </div>

      {/* ── CSS Output ────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Generated CSS</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700/30 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto whitespace-pre max-h-80 overflow-y-auto">
{generatedCSS}</pre>
      </div>
    </ToolLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PropertySlider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-mono text-slate-300 tabular-nums">{value}{unit}</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-md"
        />
        <input
          type="number"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(clamp(Number(e.target.value), min, max))}
          className="w-16 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono text-right focus:outline-none focus:border-brand-500"
        />
      </div>
    </div>
  );
}

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
