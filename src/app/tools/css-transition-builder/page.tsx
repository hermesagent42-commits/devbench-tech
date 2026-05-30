'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play, RotateCcw, Copy, Check, Plus, Trash2, Timer,
  Gauge, Zap, ChevronDown, Palette, Maximize2, Move,
  Type, Eye, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Transition {
  id: string;
  property: string;
  duration: number;
  timingFn: string;
  delay: number;
}

type TimingMode = 'preset' | 'cubic-bezier' | 'steps';

// ── Constants ──────────────────────────────────────────────────────────────

const PROPERTIES = [
  { value: 'all', label: 'All Properties' },
  { value: 'background-color', label: 'Background Color' },
  { value: 'color', label: 'Text Color' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'transform', label: 'Transform' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'border-radius', label: 'Border Radius' },
  { value: 'box-shadow', label: 'Box Shadow' },
  { value: 'margin', label: 'Margin' },
  { value: 'padding', label: 'Padding' },
  { value: 'font-size', label: 'Font Size' },
  { value: 'letter-spacing', label: 'Letter Spacing' },
  { value: 'filter', label: 'Filter' },
  { value: 'border-color', label: 'Border Color' },
  { value: 'border-width', label: 'Border Width' },
  { value: 'outline-color', label: 'Outline Color' },
  { value: 'outline-width', label: 'Outline Width' },
];

const TIMING_PRESETS = [
  { value: 'ease', label: 'ease (default)', description: 'Slow start, fast middle, slow end' },
  { value: 'ease-in', label: 'ease-in', description: 'Slow start' },
  { value: 'ease-out', label: 'ease-out', description: 'Slow end' },
  { value: 'ease-in-out', label: 'ease-in-out', description: 'Slow start and end' },
  { value: 'linear', label: 'linear', description: 'Constant speed' },
  { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'easeOutBack', description: 'Overshoot then settle' },
  { value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'easeInOutBack', description: 'Back and forth' },
  { value: 'cubic-bezier(0.25, 0.1, 0.25, 1)', label: 'ease (CSS default)' },
  { value: 'steps(5, end)', label: 'steps(5)', description: '5 discrete steps' },
  { value: 'steps(10, start)', label: 'steps(10)', description: '10 jittery steps' },
];

const DEMO_STATES = {
  'background-color': { default: '#6366f1', toggled: '#f43f5e' },
  'color': { default: '#e2e8f0', toggled: '#fbbf24' },
  'opacity': { default: '1', toggled: '0.3' },
  'transform': { default: 'none', toggled: 'rotate(15deg) scale(1.15)' },
  'width': { default: '160px', toggled: '280px' },
  'height': { default: '120px', toggled: '180px' },
  'border-radius': { default: '12px', toggled: '50%' },
  'box-shadow': { default: '0 4px 6px -1px rgba(0,0,0,0.3)', toggled: '0 20px 40px -5px rgba(99,102,241,0.5)' },
  'margin': { default: '0px', toggled: '24px' },
  'padding': { default: '16px', toggled: '40px' },
  'font-size': { default: '16px', toggled: '24px' },
  'letter-spacing': { default: 'normal', toggled: '4px' },
  'filter': { default: 'none', toggled: 'blur(2px) brightness(1.3)' },
  'border-color': { default: '#475569', toggled: '#fbbf24' },
  'border-width': { default: '2px', toggled: '6px' },
  'outline-color': { default: 'transparent', toggled: '#22d3ee' },
  'outline-width': { default: '0px', toggled: '4px' },
};

const CATEGORY_COLORS: Record<string, string> = {
  'background-color': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  'color': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'opacity': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'transform': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'width': 'bg-green-500/10 text-green-400 border-green-500/30',
  'height': 'bg-green-500/10 text-green-400 border-green-500/30',
  'border-radius': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'box-shadow': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'margin': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  'padding': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  'font-size': 'bg-red-500/10 text-red-400 border-red-500/30',
  'letter-spacing': 'bg-red-500/10 text-red-400 border-red-500/30',
  'filter': 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  'border-color': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'border-width': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'outline-color': 'bg-lime-500/10 text-lime-400 border-lime-500/30',
  'outline-width': 'bg-lime-500/10 text-lime-400 border-lime-500/30',
  'all': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
};

const ICONS: Record<string, React.ReactNode> = {
  'all': <Zap className="w-3.5 h-3.5" />,
  'background-color': <Palette className="w-3.5 h-3.5" />,
  'color': <Type className="w-3.5 h-3.5" />,
  'opacity': <Eye className="w-3.5 h-3.5" />,
  'transform': <Move className="w-3.5 h-3.5" />,
  'width': <Maximize2 className="w-3.5 h-3.5" />,
  'height': <Maximize2 className="w-3.5 h-3.5" />,
  'border-radius': <ArrowUpRight className="w-3.5 h-3.5" />,
};

let idCounter = 0;
function nextId(): string {
  return `t${++idCounter}-${Date.now()}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CSSTransitionBuilder() {
  const [transitions, setTransitions] = useState<Transition[]>([
    { id: nextId(), property: 'background-color', duration: 0.4, timingFn: 'ease-in-out', delay: 0 },
    { id: nextId(), property: 'transform', duration: 0.3, timingFn: 'ease-out', delay: 0 },
  ]);
  const [toggled, setToggled] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable cubic-bezier params per transition
  const [bezierParams, setBezierParams] = useState<Record<string, { x1: number; y1: number; x2: number; y2: number }>>({});
  const [stepParams, setStepParams] = useState<Record<string, { count: number; direction: 'start' | 'end' }>>({});
  const [timingMode, setTimingMode] = useState<Record<string, TimingMode>>({});

  const getTimingMode = useCallback((t: Transition): TimingMode => {
    return timingMode[t.id] || 'preset';
  }, [timingMode]);

  const setTransitionTimingMode = useCallback((id: string, mode: TimingMode) => {
    setTimingMode(prev => ({ ...prev, [id]: mode }));
  }, []);

  const updateTransition = useCallback((id: string, field: keyof Transition, value: string | number) => {
    setTransitions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }, []);

  const addTransition = useCallback(() => {
    const used = new Set(transitions.map(t => t.property));
    const available = PROPERTIES.find(p => !used.has(p.value)) || PROPERTIES[0];
    setTransitions(prev => [...prev, {
      id: nextId(),
      property: available.value,
      duration: 0.3,
      timingFn: 'ease',
      delay: 0,
    }]);
  }, [transitions]);

  const removeTransition = useCallback((id: string) => {
    setTransitions(prev => prev.filter(t => t.id !== id));
    setBezierParams(prev => { const n = { ...prev }; delete n[id]; return n; });
    setStepParams(prev => { const n = { ...prev }; delete n[id]; return n; });
    setTimingMode(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  // ── Compute the effective timing function ────────────────────────────────

  const getEffectiveTiming = useCallback((t: Transition): string => {
    const mode = getTimingMode(t);
    if (mode === 'cubic-bezier') {
      const bp = bezierParams[t.id] || { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };
      return `cubic-bezier(${bp.x1.toFixed(2)}, ${bp.y1.toFixed(2)}, ${bp.x2.toFixed(2)}, ${bp.y2.toFixed(2)})`;
    }
    if (mode === 'steps') {
      const sp = stepParams[t.id] || { count: 5, direction: 'end' };
      return `steps(${sp.count}, ${sp.direction})`;
    }
    return t.timingFn;
  }, [getTimingMode, bezierParams, stepParams]);

  // ── Build CSS string ────────────────────────────────────────────────────

  const transitionCSS = useMemo(() => {
    if (transitions.length === 0) return '/* No transitions defined */';
    return transitions.map(t => {
      const timing = getEffectiveTiming(t);
      return `  ${t.property} ${t.duration}s ${timing}${t.delay > 0 ? ` ${t.delay}s` : ''}`;
    }).join(',\n');
  }, [transitions, getEffectiveTiming]);

  const fullCSS = useMemo(() => {
    return `.element {\n${transitionCSS}\n}`;
  }, [transitionCSS]);

  // ── Demo element style ──────────────────────────────────────────────────

  const demoStyle = useMemo(() => {
    const style: Record<string, string> = {
      transition: transitions.map(t => {
        const timing = getEffectiveTiming(t);
        return `${t.property} ${t.duration}s ${timing}${t.delay > 0 ? ` ${t.delay}s` : ''}`;
      }).join(', '),
    };

    // Apply toggled values
    for (const t of transitions) {
      const state = DEMO_STATES[t.property as keyof typeof DEMO_STATES];
      if (state) {
        style[t.property] = toggled ? state.toggled : state.default;
      }
    }

    return style;
  }, [transitions, toggled, getEffectiveTiming]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(fullCSS);
    setCopied(true);
    toast.success('CSS copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [fullCSS]);

  const handleReset = useCallback(() => {
    setToggled(false);
  }, []);

  // ── Cubic Bezier preview curve ──────────────────────────────────────────

  const BezierPreview = useCallback(({ id }: { id: string }) => {
    const bp = bezierParams[id] || { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };
    const path = `M 0,50 C ${bp.x1 * 50},${50 - bp.y1 * 50} ${bp.x2 * 50},${50 - bp.y2 * 50} 50,0`;
    return (
      <svg viewBox="0 0 50 50" className="w-24 h-24 border border-slate-600 rounded bg-slate-900" aria-label="Cubic bezier curve preview">
        <line x1="0" y1="50" x2="50" y2="0" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
        <path d={path} fill="none" stroke="#818cf8" strokeWidth="1.5" />
        <circle cx={bp.x1 * 50} cy={50 - bp.y1 * 50} r="2" fill="#f472b6" />
        <circle cx={bp.x2 * 50} cy={50 - bp.y2 * 50} r="2" fill="#f472b6" />
        <line x1="0" y1="50" x2={bp.x1 * 50} y2={50 - bp.y1 * 50} stroke="#475569" strokeWidth="0.5" strokeDasharray="2 1" />
        <line x1="50" y1="0" x2={bp.x2 * 50} y2={50 - bp.y2 * 50} stroke="#475569" strokeWidth="0.5" strokeDasharray="2 1" />
      </svg>
    );
  }, [bezierParams]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Transition Builder"
      description="Build production-ready CSS transition properties — multiple properties, duration, timing functions (cubic-bezier, steps), and delay. Live preview, instant CSS copy."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── LEFT: Controls ─── */}
        <div className="space-y-6">
          {/* Transitions list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Transitions</h3>
              <button
                onClick={addTransition}
                disabled={transitions.length >= PROPERTIES.length}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-brand-500/10 text-brand-400 border border-brand-500/30
                  hover:bg-brand-500/20 transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Property
              </button>
            </div>

            {transitions.map((t, i) => {
              const mode = getTimingMode(t);
              return (
                <div key={t.id} className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${CATEGORY_COLORS[t.property] || 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                        {ICONS[t.property]}
                        {PROPERTIES.find(p => p.value === t.property)?.label || t.property}
                      </span>
                    </div>
                    {transitions.length > 1 && (
                      <button
                        onClick={() => removeTransition(t.id)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Remove transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Property selector */}
                  <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 block">Property</label>
                    <select
                      value={t.property}
                      onChange={e => updateTransition(t.id, 'property', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm
                        focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                    >
                      {PROPERTIES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration + Delay row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        Duration: <span className="text-brand-400 font-mono">{t.duration.toFixed(2)}s</span>
                      </label>
                      <input
                        type="range"
                        min="0.05"
                        max="3"
                        step="0.05"
                        value={t.duration}
                        onChange={e => updateTransition(t.id, 'duration', parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full bg-slate-700 appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500
                          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        Delay: <span className="text-cyan-400 font-mono">{t.delay.toFixed(2)}s</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={t.delay}
                        onChange={e => updateTransition(t.id, 'delay', parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full bg-slate-700 appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500
                          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                      />
                    </div>
                  </div>

                  {/* Timing function */}
                  <div>
                    <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      Timing Function
                    </label>

                    {/* Mode tabs */}
                    <div className="flex items-center gap-1 mb-2 p-0.5 rounded-lg bg-slate-800 border border-slate-700">
                      {(['preset', 'cubic-bezier', 'steps'] as TimingMode[]).map(m => (
                        <button
                          key={m}
                          onClick={() => setTransitionTimingMode(t.id, m)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            mode === m
                              ? 'bg-brand-500/20 text-brand-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {m === 'preset' ? 'Presets' : m === 'cubic-bezier' ? 'Cubic Bezier' : 'Steps'}
                        </button>
                      ))}
                    </div>

                    {mode === 'preset' && (
                      <select
                        value={t.timingFn}
                        onChange={e => updateTransition(t.id, 'timingFn', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm
                          focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                      >
                        {TIMING_PRESETS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    )}

                    {mode === 'cubic-bezier' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {(['x1', 'y1', 'x2', 'y2'] as const).map(param => (
                            <div key={param}>
                              <label className="text-[10px] text-slate-500 uppercase block mb-0.5">{param}</label>
                              <input
                                type="range"
                                min={param === 'x1' || param === 'x2' ? '0' : '-0.5'}
                                max={param === 'x1' || param === 'x2' ? '1' : '1.5'}
                                step="0.01"
                                value={bezierParams[t.id]?.[param] ?? (param === 'x2' ? 0.25 : param === 'y1' ? 0.1 : param === 'y2' ? 1 : 0.25)}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setBezierParams(prev => ({
                                    ...prev,
                                    [t.id]: { ...(prev[t.id] || { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 }), [param]: val }
                                  }));
                                }}
                                className="w-full h-1 rounded-full bg-slate-700 appearance-none cursor-pointer
                                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500
                                  [&::-webkit-slider-thumb]:cursor-pointer"
                              />
                              <span className="text-[10px] text-slate-500 font-mono">
                                {(bezierParams[t.id]?.[param] ?? (param === 'x2' ? 0.25 : param === 'y1' ? 0.1 : param === 'y2' ? 1 : 0.25)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <BezierPreview id={t.id} />
                      </div>
                    )}

                    {mode === 'steps' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Count</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={stepParams[t.id]?.count ?? 5}
                              onChange={e => {
                                setStepParams(prev => ({
                                  ...prev,
                                  [t.id]: { ...(prev[t.id] || { count: 5, direction: 'end' }), count: Math.max(1, parseInt(e.target.value) || 1) }
                                }));
                              }}
                              className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 text-sm text-center
                                focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Direction</label>
                            <select
                              value={stepParams[t.id]?.direction ?? 'end'}
                              onChange={e => {
                                setStepParams(prev => ({
                                  ...prev,
                                  [t.id]: { ...(prev[t.id] || { count: 5, direction: 'end' }), direction: e.target.value as 'start' | 'end' }
                                }));
                              }}
                              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 text-sm
                                focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                            >
                              <option value="end">end</option>
                              <option value="start">start</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT: Preview + CSS ─── */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="p-6 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Live Preview</h3>

            <div className="flex flex-col items-center gap-6">
              {/* Demo element */}
              <div className="flex items-center justify-center min-h-[200px] w-full bg-slate-900/50 rounded-lg border border-slate-700/30 p-6">
                <div
                  style={demoStyle}
                  className="flex items-center justify-center select-none"
                >
                  <div
                    className="flex items-center justify-center rounded-xl border-2 border-slate-600/50 bg-slate-800/80 text-sm text-slate-300 px-4 py-3 cursor-pointer select-none"
                    style={{ fontSize: 'inherit', minWidth: '120px' }}
                  >
                    {toggled ? '✨ Active' : '🎯 Hover Me'}
                  </div>
                </div>
              </div>

              {/* Trigger button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setToggled(t => !t)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all
                    ${toggled
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
                    }`}
                >
                  <Play className="w-4 h-4" />
                  {toggled ? 'Reset' : 'Trigger Transition'}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                  aria-label="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Auto-play hint */}
              <p className="text-[11px] text-slate-600">
                Click &quot;Trigger&quot; to see the transition, or hover the demo element
              </p>
            </div>
          </div>

          {/* CSS Output */}
          <div className="p-6 rounded-xl bg-surface-light border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Generated CSS</h3>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-500 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <pre className="p-4 rounded-lg bg-slate-900 text-sm font-mono text-slate-300 overflow-x-auto border border-slate-700/50">
              <code>{fullCSS}</code>
            </pre>

            {/* Shorthand hint */}
            {transitions.length > 1 && (
              <details className="mt-3">
                <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-400">
                  Show shorthand alternatives
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-700/50 text-xs font-mono text-slate-400 space-y-2">
                  <p className="text-slate-500">Single transition shorthand:</p>
                  {transitions.map(t => {
                    const timing = getEffectiveTiming(t);
                    return (
                      <code key={t.id} className="block text-slate-300">
                        transition: {t.property} {t.duration}s {timing}{t.delay > 0 ? ` ${t.delay}s` : ''};
                      </code>
                    );
                  })}
                  <p className="text-slate-500 mt-2">All-in-one shorthand:</p>
                  <code className="block text-slate-300">
                    {`transition: ${transitionCSS.replace(/\n\s\s/g, ' ')};`}
                  </code>
                </div>
              </details>
            )}
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Pro Tips</h4>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Use <code className="text-amber-400 bg-amber-500/10 px-1 rounded">all</code> sparingly — it can hurt performance</li>
              <li>Prefer <code className="text-amber-400 bg-amber-500/10 px-1 rounded">transform</code> and <code className="text-amber-400 bg-amber-500/10 px-1 rounded">opacity</code> for smooth 60fps animations</li>
              <li>Keep durations between <code className="text-amber-400 bg-amber-500/10 px-1 rounded">100-500ms</code> for UI interactions</li>
              <li>Combine with <code className="text-amber-400 bg-amber-500/10 px-1 rounded">will-change</code> for complex transitions</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
