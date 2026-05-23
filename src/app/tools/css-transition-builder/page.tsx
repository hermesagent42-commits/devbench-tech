'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Trash2, Play, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

type TimingFunction = 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';

interface TransitionRule {
  id: string;
  property: string;
  duration: number;
  timing: TimingFunction;
  delay: number;
  cubicBezier: [number, number, number, number];
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `tr-${idCounter}`;
}

const PROPERTIES = [
  { value: 'all', label: 'All' },
  { value: 'background-color', label: 'Background Color' },
  { value: 'color', label: 'Text Color' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'transform', label: 'Transform' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'border-color', label: 'Border Color' },
  { value: 'box-shadow', label: 'Box Shadow' },
  { value: 'margin', label: 'Margin' },
  { value: 'padding', label: 'Padding' },
  { value: 'filter', label: 'Filter' },
  { value: 'border-radius', label: 'Border Radius' },
  { value: 'left', label: 'Left' },
  { value: 'top', label: 'Top' },
];

const TIMING_FUNCTIONS: { value: TimingFunction; label: string }[] = [
  { value: 'ease', label: 'Ease' },
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'cubic-bezier', label: 'Cubic Bezier' },
];

const PRESETS: { name: string; rules: Omit<TransitionRule, 'id'>[] }[] = [
  {
    name: 'Fade In',
    rules: [{
      property: 'opacity', duration: 0.4, timing: 'ease', delay: 0,
      cubicBezier: [0.25, 0.1, 0.25, 1],
    }],
  },
  {
    name: 'Slide Up',
    rules: [{
      property: 'all', duration: 0.4, timing: 'ease-out', delay: 0,
      cubicBezier: [0, 0, 0.2, 1],
    }],
  },
  {
    name: 'Scale Up',
    rules: [{
      property: 'all', duration: 0.35, timing: 'ease-out', delay: 0,
      cubicBezier: [0.34, 1.56, 0.64, 1],
    }],
  },
  {
    name: 'Color Shift',
    rules: [
      { property: 'background-color', duration: 0.5, timing: 'ease', delay: 0, cubicBezier: [0.25, 0.1, 0.25, 1] },
      { property: 'color', duration: 0.5, timing: 'ease', delay: 0, cubicBezier: [0.25, 0.1, 0.25, 1] },
    ],
  },
  {
    name: 'Bouncy Enter',
    rules: [{
      property: 'all', duration: 0.5, timing: 'cubic-bezier', delay: 0,
      cubicBezier: [0.34, 1.56, 0.64, 1],
    }],
  },
  {
    name: 'Smooth Reveal',
    rules: [
      { property: 'opacity', duration: 0.45, timing: 'ease', delay: 0, cubicBezier: [0.25, 0.1, 0.25, 1] },
      { property: 'transform', duration: 0.45, timing: 'ease', delay: 0, cubicBezier: [0.25, 0.1, 0.25, 1] },
    ],
  },
  {
    name: 'Elastic Stretch',
    rules: [{
      property: 'all', duration: 0.6, timing: 'cubic-bezier', delay: 0,
      cubicBezier: [0.68, -0.55, 0.265, 1.55],
    }],
  },
  {
    name: 'Snap',
    rules: [{
      property: 'all', duration: 0.15, timing: 'ease-out', delay: 0,
      cubicBezier: [0, 0, 0.2, 1],
    }],
  },
];

function formatTimingCSS(timing: TimingFunction, bezier: [number, number, number, number]): string {
  if (timing === 'cubic-bezier') {
    return `cubic-bezier(${bezier[0]}, ${bezier[1]}, ${bezier[2]}, ${bezier[3]})`;
  }
  return timing;
}

export default function CSSTransitionBuilderPage() {
  const [rules, setRules] = useState<TransitionRule[]>([
    { id: nextId(), property: 'all', duration: 0.3, timing: 'ease', delay: 0, cubicBezier: [0.25, 0.1, 0.25, 1] },
  ]);
  const [triggered, setTriggered] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeTimingRule, setActiveTimingRule] = useState<string | null>(rules[0]?.id ?? null);

  const updateRule = useCallback((id: string, field: keyof TransitionRule, value: unknown) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const addRule = useCallback(() => {
    const id = nextId();
    setRules((prev) => [
      ...prev,
      { id, property: 'opacity', duration: 0.3, timing: 'ease', delay: 0, cubicBezier: [0.25, 0.1, 0.25, 1] },
    ]);
    setActiveTimingRule(id);
  }, []);

  const removeRule = useCallback(
    (id: string) => {
      setRules((prev) => {
        const filtered = prev.filter((r) => r.id !== id);
        if (activeTimingRule === id && filtered.length > 0) {
          setActiveTimingRule(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeTimingRule]
  );

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    setRules(preset.rules.map((r) => ({ ...r, id: nextId() })));
    setTimeout(() => setTriggered(true), 50);
  }, []);

  const trigger = useCallback(() => {
    setTriggered(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTriggered(true);
      });
    });
  }, []);

  const transitionCSS = useMemo(() => {
    return rules
      .map((r) => `${r.property} ${r.duration}s ${formatTimingCSS(r.timing, r.cubicBezier)} ${r.delay}s`)
      .join(', ');
  }, [rules]);

  const activeRule = useMemo(() => {
    return rules.find((r) => r.id === activeTimingRule) ?? rules[0];
  }, [rules, activeTimingRule]);

  const curvePath = useMemo(() => {
    if (!activeRule) return '';
    const [x1, y1, x2, y2] = activeRule.cubicBezier;
    const margin = 10;
    const scale = 120;
    const w = scale;
    const h = scale;
    return `M${margin},${margin + h} C${margin + x1 * w},${margin + h - y1 * h} ${margin + x2 * w},${margin + h - y2 * h} ${margin + w},${margin}`;
  }, [activeRule]);

  const copyCSS = useCallback(() => {
    const css = `.element {\n  transition: ${transitionCSS};\n}\n`;
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Copy failed')
    );
  }, [transitionCSS]);

  const demoStyle = useMemo((): React.CSSProperties => {
    const style: React.CSSProperties = { transition: transitionCSS };
    if (triggered) {
      Object.assign(style, {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        borderColor: '#60a5fa',
        transform: 'scale(1.05)',
        opacity: '1',
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
      });
    } else {
      Object.assign(style, {
        backgroundColor: '#1e293b',
        color: '#cbd5e1',
        borderColor: '#475569',
        transform: 'scale(1)',
        opacity: '0.75',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      });
    }
    return style;
  }, [transitionCSS, triggered]);

  return (
    <ToolLayout
      title="CSS Transition Builder"
      description="Visually build CSS transition rules — duration, timing functions, delays, and cubic-bezier curves. Live preview, presets, instant CSS copy."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={trigger} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Play className="w-3.5 h-3.5" />
            Trigger Animation
          </button>
          <button onClick={copyCSS} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
        </div>
      }
    >
      {/* Live Preview */}
      <div className="card mb-8">
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">Live Preview</h3>
        <div className="flex items-center justify-center py-12 px-4 bg-surface rounded-lg border border-slate-700/50 min-h-[160px]">
          <div
            style={demoStyle}
            onClick={trigger}
            className="w-40 h-20 rounded-xl border-2 flex items-center justify-center cursor-pointer font-medium text-sm select-none"
          >
            {triggered ? 'Active \u2728' : 'Click Me'}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Click the box or press &quot;Trigger Animation&quot; to replay
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transition Rules */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm">Transition Rules</h3>
            <button onClick={addRule} className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </button>
          </div>

          {rules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => setActiveTimingRule(rule.id)}
              className={`card cursor-pointer transition-colors ${
                activeTimingRule === rule.id ? 'border-brand-500/50 bg-brand-500/5' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="badge-primary text-xs">{rule.property}</span>
                  <span className="text-xs text-slate-400 font-mono">{rule.duration}s</span>
                  <span className="text-xs text-slate-500">{rule.timing}</span>
                </div>
                {rules.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRule(rule.id);
                    }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Property */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Property</label>
                  <select
                    value={rule.property}
                    onChange={(e) => updateRule(rule.id, 'property', e.target.value)}
                    className="input-field w-full text-xs py-1.5"
                  >
                    {PROPERTIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Duration: <span className="text-brand-400 font-mono">{rule.duration}s</span>
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="3"
                    step="0.05"
                    value={rule.duration}
                    onChange={(e) => updateRule(rule.id, 'duration', parseFloat(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                    <span>0.05s</span>
                    <span>3s</span>
                  </div>
                </div>

                {/* Timing Function */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Timing Function</label>
                  <select
                    value={rule.timing}
                    onChange={(e) => updateRule(rule.id, 'timing', e.target.value as TimingFunction)}
                    className="input-field w-full text-xs py-1.5"
                  >
                    {TIMING_FUNCTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delay */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Delay: <span className="text-brand-400 font-mono">{rule.delay}s</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={rule.delay}
                    onChange={(e) => updateRule(rule.id, 'delay', parseFloat(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                    <span>0s</span>
                    <span>2s</span>
                  </div>
                </div>

                {/* Cubic Bezier controls */}
                {rule.timing === 'cubic-bezier' && (
                  <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['x1', 'y1', 'x2', 'y2'] as const).map((param, i) => (
                      <div key={param}>
                        <label className="text-xs text-slate-400 mb-1 block font-mono">{param}</label>
                        <input
                          type="number"
                          min={param.startsWith('x') ? 0 : -3}
                          max={param.startsWith('x') ? 1 : 4}
                          step={0.01}
                          value={rule.cubicBezier[i]}
                          onChange={(e) => {
                            const bezier: [number, number, number, number] = [...rule.cubicBezier];
                            bezier[i] = parseFloat(e.target.value) || 0;
                            updateRule(rule.id, 'cubicBezier', bezier);
                          }}
                          className="input-field w-full text-xs py-1.5 font-mono"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Output Panel */}
        <div className="space-y-4">
          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Generated CSS</h3>
              <button onClick={copyCSS} className="text-slate-500 hover:text-brand-400 transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <code className="block bg-surface rounded-lg px-3 py-2 font-mono text-xs text-green-400 border border-slate-700/50 leading-relaxed whitespace-pre-wrap break-all">
              transition: {transitionCSS};
            </code>
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="text-xs text-slate-500 mb-2">Breakdown:</div>
              {rules.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 text-xs font-mono mb-1">
                  <span className="text-sky-400">{r.property}</span>
                  <span className="text-slate-600">&rarr;</span>
                  <span className="text-yellow-400">{r.duration}s</span>
                  <span className="text-purple-400">{formatTimingCSS(r.timing, r.cubicBezier)}</span>
                  {r.delay > 0 && <span className="text-slate-500">+{r.delay}s</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Timing Curve Visualization */}
          {activeRule && (
            <div className="card">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                Timing Curve &mdash; {formatTimingCSS(activeRule.timing, activeRule.cubicBezier)}
              </h3>
              <div className="flex justify-center">
                <svg ref={svgRef} viewBox="0 0 140 140" className="w-full max-w-[200px] h-auto">
                  {[0, 25, 50, 75, 100].map((pct) => {
                    const x = 10 + (pct / 100) * 120;
                    const y = 10 + (pct / 100) * 120;
                    return (
                      <g key={pct}>
                        <line x1={x} y1={10} x2={x} y2={130} stroke="#334155" strokeWidth="0.5" />
                        <line x1={10} y1={y} x2={130} y2={y} stroke="#334155" strokeWidth="0.5" />
                      </g>
                    );
                  })}
                  <line x1={10} y1={130} x2={130} y2={10} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                  <path d={curvePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                  {activeRule.timing === 'cubic-bezier' && (
                    <>
                      <line
                        x1={10} y1={130}
                        x2={10 + activeRule.cubicBezier[0] * 120}
                        y2={130 - activeRule.cubicBezier[1] * 120}
                        stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="2,2"
                      />
                      <line
                        x1={130} y1={10}
                        x2={10 + activeRule.cubicBezier[2] * 120}
                        y2={130 - activeRule.cubicBezier[3] * 120}
                        stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="2,2"
                      />
                      <circle cx={10 + activeRule.cubicBezier[0] * 120} cy={130 - activeRule.cubicBezier[1] * 120} r="2.5" fill="#fbbf24" />
                      <circle cx={10 + activeRule.cubicBezier[2] * 120} cy={130 - activeRule.cubicBezier[3] * 120} r="2.5" fill="#fbbf24" />
                    </>
                  )}
                  <text x={5} y={75} fill="#475569" fontSize="7" textAnchor="middle" transform="rotate(-90, 5, 75)">Progress</text>
                  <text x={70} y={138} fill="#475569" fontSize="7" textAnchor="middle">Time</text>
                </svg>
              </div>
            </div>
          )}

          {/* Presets */}
          <div className="card">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              <Zap className="w-3 h-3 inline mr-1" />
              Presets
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="text-left p-2 rounded-lg border border-slate-700/50 bg-surface hover:border-brand-500/30 hover:bg-brand-500/5 transition-colors text-xs"
                >
                  <div className="text-white font-medium text-xs">{preset.name}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    {preset.rules.length} rule{preset.rules.length > 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Learning tips */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">Understanding CSS Transitions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-400">
          <div>
            <p className="text-slate-300 font-medium mb-1">Property</p>
            <p>Which CSS property to animate. Use <code className="text-brand-400">all</code> to transition every animatable property at once.</p>
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">Duration</p>
            <p>How long the transition takes. Shorter durations feel snappy; longer ones feel smooth. Start with 0.2&ndash;0.5s for UI elements.</p>
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">Timing Function</p>
            <p>Controls the acceleration curve. <code className="text-brand-400">ease-out</code> is great for entering elements; <code className="text-brand-400">ease-in</code> for exiting.</p>
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">Delay</p>
            <p>Wait before starting the transition. Use staggered delays for cascading animations on lists or grids.</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
