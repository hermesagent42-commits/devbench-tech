'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, RotateCcw, Plus, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface KeyframeStop {
  id: string;
  percent: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotate: number;
  opacity: number;
  bgColor: string;
}

type TimingFunction = 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
type Direction = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
type FillMode = 'none' | 'forwards' | 'backwards' | 'both';

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `kf-${idCounter}`;
}

const TIMING_FUNCTIONS: { value: TimingFunction; label: string }[] = [
  { value: 'ease', label: 'Ease' },
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
];

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'alternate', label: 'Alternate' },
  { value: 'alternate-reverse', label: 'Alternate Reverse' },
];

const FILL_MODES: { value: FillMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'forwards', label: 'Forwards' },
  { value: 'backwards', label: 'Backwards' },
  { value: 'both', label: 'Both' },
];

const PRESETS: {
  name: string;
  timing: TimingFunction;
  duration: number;
  iteration: string;
  direction: Direction;
  stops: Omit<KeyframeStop, 'id'>[];
}[] = [
  {
    name: 'Bounce',
    timing: 'ease-out',
    duration: 0.8,
    iteration: 'infinite',
    direction: 'alternate',
    stops: [
      { percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#3b82f6' },
      { percent: 50, translateX: 0, translateY: -60, scale: 1.05, rotate: 0, opacity: 1, bgColor: '#6366f1' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#3b82f6' },
    ],
  },
  {
    name: 'Pulse',
    timing: 'ease-in-out',
    duration: 1.2,
    iteration: 'infinite',
    direction: 'normal',
    stops: [
      { percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#ec4899' },
      { percent: 50, translateX: 0, translateY: 0, scale: 1.15, rotate: 0, opacity: 0.8, bgColor: '#f43f5e' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#ec4899' },
    ],
  },
  {
    name: 'Shake',
    timing: 'ease-in-out',
    duration: 0.5,
    iteration: 'infinite',
    direction: 'normal',
    stops: [
      { percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#f59e0b' },
      { percent: 20, translateX: -8, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#f59e0b' },
      { percent: 40, translateX: 8, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#f59e0b' },
      { percent: 60, translateX: -6, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#f59e0b' },
      { percent: 80, translateX: 6, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#f59e0b' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#f59e0b' },
    ],
  },
  {
    name: 'Spin',
    timing: 'linear',
    duration: 1,
    iteration: 'infinite',
    direction: 'normal',
    stops: [
      { percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#10b981' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 360, opacity: 1, bgColor: '#10b981' },
    ],
  },
  {
    name: 'Fade & Slide Up',
    timing: 'ease-out',
    duration: 0.6,
    iteration: '1',
    direction: 'normal',
    stops: [
      { percent: 0, translateX: 0, translateY: 30, scale: 0.95, rotate: 0, opacity: 0, bgColor: '#8b5cf6' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#8b5cf6' },
    ],
  },
  {
    name: 'Wiggle',
    timing: 'ease-in-out',
    duration: 0.6,
    iteration: 'infinite',
    direction: 'normal',
    stops: [
      { percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#06b6d4' },
      { percent: 25, translateX: 0, translateY: 0, scale: 1, rotate: -5, opacity: 1, bgColor: '#06b6d4' },
      { percent: 75, translateX: 0, translateY: 0, scale: 1, rotate: 5, opacity: 1, bgColor: '#06b6d4' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#06b6d4' },
    ],
  },
  {
    name: 'Flip',
    timing: 'ease-in-out',
    duration: 0.7,
    iteration: 'infinite',
    direction: 'normal',
    stops: [
      { percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#f97316' },
      { percent: 50, translateX: 0, translateY: 0, scale: 0.3, rotate: 180, opacity: 0.5, bgColor: '#ef4444' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 360, opacity: 1, bgColor: '#f97316' },
    ],
  },
  {
    name: 'Blink',
    timing: 'ease-in-out',
    duration: 0.5,
    iteration: 'infinite',
    direction: 'normal',
    stops: [
      { percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#a78bfa' },
      { percent: 50, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 0.1, bgColor: '#a78bfa' },
      { percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#a78bfa' },
    ],
  },
];

function buildKeyframesCSS(
  stops: KeyframeStop[],
  timing: TimingFunction,
  duration: number,
  iteration: string,
  direction: string,
  fill: string
): string {
  const sorted = [...stops].sort((a, b) => a.percent - b.percent);

  const keyframeDecls = sorted
    .map((s) => {
      const props: string[] = [];
      if (s.translateX !== 0 || s.translateY !== 0)
        props.push(`    transform: translate(${s.translateX}px, ${s.translateY}px) scale(${s.scale}) rotate(${s.rotate}deg)`);
      else if (s.scale !== 1 || s.rotate !== 0)
        props.push(`    transform: scale(${s.scale}) rotate(${s.rotate}deg)`);
      if (s.opacity !== 1) props.push(`    opacity: ${s.opacity}`);
      if (s.bgColor !== '#3b82f6') props.push(`    background-color: ${s.bgColor}`);
      return `  ${s.percent}% {\n${props.join(';\n')}\n  }`;
    })
    .join('\n');

  return `@keyframes custom-animation {\n${keyframeDecls}\n}\n\n.element {\n  animation: custom-animation ${duration}s ${timing} ${iteration} ${direction} ${fill};\n}`;
}

export default function CSSAnimationBuilderPage() {
  const [stops, setStops] = useState<KeyframeStop[]>([
    { id: nextId(), percent: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1, bgColor: '#3b82f6' },
    { id: nextId(), percent: 100, translateX: 0, translateY: 0, scale: 1, rotate: 360, opacity: 1, bgColor: '#6366f1' },
  ]);
  const [timing, setTiming] = useState<TimingFunction>('ease');
  const [duration, setDuration] = useState(1);
  const [iteration, setIteration] = useState('infinite');
  const [direction, setDirection] = useState<Direction>('normal');
  const [fill, setFill] = useState<FillMode>('both');
  const [playing, setPlaying] = useState(true);
  const [activeStopId, setActiveStopId] = useState<string>(stops[0]?.id ?? '');

  const activeStop = stops.find((s) => s.id === activeStopId) ?? stops[0];

  const keyframesCSS = useMemo(
    () => buildKeyframesCSS(stops, timing, duration, iteration, direction, fill),
    [stops, timing, duration, iteration, direction, fill]
  );

  const updateStop = useCallback((id: string, field: keyof KeyframeStop, value: number | string) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }, []);

  const addStop = useCallback(
    (afterPercent: number) => {
      // find next stop percent, insert halfway
      const sorted = [...stops].sort((a, b) => a.percent - b.percent);
      const idx = sorted.findIndex((s) => s.percent >= afterPercent);
      let newPercent: number;
      if (idx === -1) {
        newPercent = Math.min(afterPercent + 25, 100);
      } else if (idx === 0) {
        newPercent = Math.max(Math.floor(afterPercent / 2), 1);
      } else {
        newPercent = Math.round((sorted[idx - 1].percent + sorted[idx].percent) / 2);
      }
      const id = nextId();
      const newStop: KeyframeStop = {
        id,
        percent: newPercent,
        translateX: 0,
        translateY: 0,
        scale: 1,
        rotate: 0,
        opacity: 1,
        bgColor: '#6366f1',
      };
      setStops((prev) => [...prev, newStop]);
      setActiveStopId(id);
    },
    [stops]
  );

  const removeStop = useCallback(
    (id: string) => {
      setStops((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (filtered.length < 2) return prev; // need at least 2 stops
        if (id === activeStopId) {
          setActiveStopId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeStopId]
  );

  const applyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      setStops(preset.stops.map((s) => ({ ...s, id: nextId() })));
      setTiming(preset.timing);
      setDuration(preset.duration);
      setIteration(preset.iteration);
      setDirection(preset.direction);
      setPlaying(true);
      setActiveStopId('');
    },
    []
  );

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(keyframesCSS).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [keyframesCSS]);

  // Build animation style for the preview element
  const sortedStops = useMemo(() => [...stops].sort((a, b) => a.percent - b.percent), [stops]);

  const buildTransform = (s: KeyframeStop) =>
    `translate(${s.translateX}px, ${s.translateY}px) scale(${s.scale}) rotate(${s.rotate}deg)`;

  // Build inline @keyframes via CSS-in-JS string for the preview
  const animName = useRef(`anim-${Date.now()}`);
  const animStyle = useMemo(() => {
    const uniqueName = `anim-${Date.now().toString(36)}`;
    const keyframeBlocks = sortedStops
      .map(
        (s) =>
          `${s.percent}% { transform: ${buildTransform(s)}; opacity: ${s.opacity}; background-color: ${s.bgColor}; }`
      )
      .join('\n');
    const fullCSS = `@keyframes ${uniqueName} { ${keyframeBlocks} }`;
    return { styleEl: fullCSS, name: uniqueName };
  }, [sortedStops]);

  // Inject keyframes into a <style> tag
  const styleString = useMemo(() => {
    const blocks = sortedStops
      .map(
        (s) =>
          `${s.percent}% { transform: ${buildTransform(s)}; opacity: ${s.opacity}; background-color: ${s.bgColor}; }`
      )
      .join('');
    return `@keyframes kf-preview { ${blocks} }`;
  }, [sortedStops]);

  const animConfig = useMemo(() => {
    return {
      animation: playing
        ? `kf-preview ${duration}s ${timing} ${iteration} ${direction} ${fill}`
        : 'none',
      width: '80px',
      height: '80px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: 600,
      color: '#fff',
      textAlign: 'center' as const,
    } as React.CSSProperties;
  }, [playing, duration, timing, iteration, direction, fill]);

  return (
    <ToolLayout
      title="CSS Animation Builder"
      description="Visually design CSS @keyframes animations with multiple stops, properties, and live preview. Copy the full CSS instantly."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={copyCSS} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
        </div>
      }
    >
      {/* Injected keyframes style */}
      <style dangerouslySetInnerHTML={{ __html: styleString }} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Presets
            </h2>
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

          {/* Animation Config */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm">Animation Settings</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Duration: <span className="text-brand-400 font-mono">{duration}s</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Iteration</label>
                <select
                  value={iteration}
                  onChange={(e) => setIteration(e.target.value)}
                  className="input-field w-full text-xs py-1.5"
                >
                  <option value="infinite">Infinite</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Timing</label>
                <select
                  value={timing}
                  onChange={(e) => setTiming(e.target.value as TimingFunction)}
                  className="input-field w-full text-xs py-1.5"
                >
                  {TIMING_FUNCTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as Direction)}
                  className="input-field w-full text-xs py-1.5"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fill Mode</label>
              <select
                value={fill}
                onChange={(e) => setFill(e.target.value as FillMode)}
                className="input-field w-full text-xs py-1.5"
              >
                {FILL_MODES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Keyframe Stops */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Keyframe Stops ({stops.length})</h2>
              <button
                onClick={() => addStop(50)}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stop
              </button>
            </div>

            {/* Stop selector pills */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {sortedStops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => setActiveStopId(stop.id)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    stop.id === activeStopId
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {stop.percent}%
                </button>
              ))}
            </div>

            {/* Active stop editor */}
            {activeStop && (
              <div className="space-y-4 pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium text-sm">Stop at {activeStop.percent}%</h3>
                  {stops.length > 2 && (
                    <button
                      onClick={() => removeStop(activeStop.id)}
                      className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>

                {/* Percent */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Position: <span className="text-brand-400 font-mono">{activeStop.percent}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={activeStop.percent}
                    onChange={(e) => updateStop(activeStop.id, 'percent', Number(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Translate X */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Translate X: <span className="text-brand-400 font-mono">{activeStop.translateX}px</span>
                    </label>
                    <input
                      type="range"
                      min={-150}
                      max={150}
                      value={activeStop.translateX}
                      onChange={(e) => updateStop(activeStop.id, 'translateX', Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  {/* Translate Y */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Translate Y: <span className="text-brand-400 font-mono">{activeStop.translateY}px</span>
                    </label>
                    <input
                      type="range"
                      min={-150}
                      max={150}
                      value={activeStop.translateY}
                      onChange={(e) => updateStop(activeStop.id, 'translateY', Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  {/* Scale */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Scale: <span className="text-brand-400 font-mono">{activeStop.scale.toFixed(2)}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={0.05}
                      value={activeStop.scale}
                      onChange={(e) => updateStop(activeStop.id, 'scale', Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  {/* Rotate */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Rotate: <span className="text-brand-400 font-mono">{activeStop.rotate}&deg;</span>
                    </label>
                    <input
                      type="range"
                      min={-360}
                      max={360}
                      step={5}
                      value={activeStop.rotate}
                      onChange={(e) => updateStop(activeStop.id, 'rotate', Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Opacity: <span className="text-brand-400 font-mono">{activeStop.opacity.toFixed(2)}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={activeStop.opacity}
                      onChange={(e) => updateStop(activeStop.id, 'opacity', Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  {/* Background */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">BG Color</label>
                    <input
                      type="color"
                      value={activeStop.bgColor}
                      onChange={(e) => updateStop(activeStop.id, 'bgColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-xs text-slate-300 font-mono">{activeStop.bgColor}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Live Preview</h2>
            <div className="flex items-center justify-center py-16 px-8 min-h-[260px] rounded-lg bg-[#0f172a] border border-slate-800">
              <div style={animConfig} />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Editing any property updates the animation live
            </p>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS Output</h2>
              <button
                onClick={copyCSS}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy All
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-72 overflow-y-auto whitespace-pre">
              {keyframesCSS}
            </pre>
          </div>

          {/* Timeline visualization */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Timeline</h2>
            <div className="relative h-12 bg-surface rounded-lg border border-slate-700/50 overflow-hidden px-2">
              {sortedStops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => setActiveStopId(stop.id)}
                  title={`${stop.percent}%`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                  style={{ left: `${stop.percent}%` }}
                >
                  <div
                    className={`w-3 h-3 rounded-full transition-all ${
                      stop.id === activeStopId
                        ? 'bg-brand-400 ring-2 ring-brand-400/50 scale-125'
                        : 'bg-slate-500 hover:bg-slate-400'
                    }`}
                  />
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 group-hover:text-slate-300 whitespace-nowrap">
                    {stop.percent}%
                  </span>
                </button>
              ))}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 -translate-y-1/2 -z-0" />
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
