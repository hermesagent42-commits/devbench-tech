'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, RotateCcw, Sparkles, Code2, Plus, Trash2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PropertyDef {
  id: string;
  name: string;
  syntax: string;
  inherits: boolean;
  initialValue: string;
  startValue: string;
  endValue: string;
}

interface Preset {
  label: string;
  description: string;
  properties: Omit<PropertyDef, 'id'>[];
  html: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SYNTAX_OPTIONS = [
  '<color>',
  '<length>',
  '<percentage>',
  '<number>',
  '<integer>',
  '<angle>',
  '<time>',
  '<resolution>',
  '<transform-function>',
  '<transform-list>',
  '<custom-ident>',
  '<string>',
  '<url>',
  '<image>',
  '<length-percentage>',
  '<color> | <number>',
  '*',
];

const PRESETS: Preset[] = [
  {
    label: 'Smooth Color Morph',
    description: 'Transition between two colors — no more hard color flips on hover',
    properties: [
      {
        name: '--btn-bg',
        syntax: '<color>',
        inherits: false,
        initialValue: '#6366f1',
        startValue: '#6366f1',
        endValue: '#ec4899',
      },
    ],
    html: '<button class="demo-btn">Hover Me</button>',
  },
  {
    label: 'Gradient Shift',
    description: 'Animate background gradients — color stops transition smoothly',
    properties: [
      {
        name: '--grad-stop-1',
        syntax: '<color>',
        inherits: false,
        initialValue: '#06b6d4',
        startValue: '#06b6d4',
        endValue: '#8b5cf6',
      },
      {
        name: '--grad-stop-2',
        syntax: '<color>',
        inherits: false,
        initialValue: '#3b82f6',
        startValue: '#3b82f6',
        endValue: '#ec4899',
      },
    ],
    html: '<div class="demo-card">Gradient</div>',
  },
  {
    label: 'Size & Spacing',
    description: 'Animate width, height, padding with smooth numeric transitions',
    properties: [
      {
        name: '--box-size',
        syntax: '<length>',
        inherits: false,
        initialValue: '80px',
        startValue: '80px',
        endValue: '160px',
      },
      {
        name: '--box-radius',
        syntax: '<length>',
        inherits: false,
        initialValue: '8px',
        startValue: '8px',
        endValue: '50%',
      },
    ],
    html: '<div class="demo-box">Size</div>',
  },
  {
    label: 'Springy Number',
    description: 'Animate numeric properties — opacity, scale, font-weight',
    properties: [
      {
        name: '--card-opacity',
        syntax: '<number>',
        inherits: false,
        initialValue: '0.6',
        startValue: '0.6',
        endValue: '1',
      },
      {
        name: '--card-scale',
        syntax: '<number>',
        inherits: false,
        initialValue: '0.95',
        startValue: '0.95',
        endValue: '1.05',
      },
    ],
    html: '<div class="demo-card">Spring</div>',
  },
  {
    label: 'Angle Rotation',
    description: 'Smooth rotate animations with angle syntax — spin UI elements',
    properties: [
      {
        name: '--icon-rotate',
        syntax: '<angle>',
        inherits: false,
        initialValue: '0deg',
        startValue: '0deg',
        endValue: '360deg',
      },
    ],
    html: '<div class="demo-icon">↻</div>',
  },
  {
    label: 'Transform Chain',
    description: 'Animate transform functions — translate, scale, and rotate together',
    properties: [
      {
        name: '--card-transform',
        syntax: '<transform-function>',
        inherits: false,
        initialValue: 'scale(1)',
        startValue: 'scale(1)',
        endValue: 'scale(1.1) rotate(5deg)',
      },
    ],
    html: '<div class="demo-card">Transform</div>',
  },
  {
    label: 'Percentage Progress',
    description: 'Animate percentage values — progress bars, sliders, loading states',
    properties: [
      {
        name: '--progress',
        syntax: '<percentage>',
        inherits: false,
        initialValue: '0%',
        startValue: '0%',
        endValue: '100%',
      },
    ],
    html: '<div class="demo-progress"><div class="progress-fill"></div></div>',
  },
  {
    label: 'Number → Length Combo',
    description: 'Mix types with * syntax — animate opacity and width simultaneously',
    properties: [
      {
        name: '--bar-width',
        syntax: '*',
        inherits: false,
        initialValue: '100px',
        startValue: '100px',
        endValue: '300px',
      },
      {
        name: '--bar-opacity',
        syntax: '*',
        inherits: false,
        initialValue: '0.3',
        startValue: '0.3',
        endValue: '1',
      },
    ],
    html: '<div class="demo-bar"></div>',
  },
];

const DURATION_PRESETS = [0.5, 1, 2, 3, 5];
const EASING_PRESETS = ['ease', 'ease-in-out', 'cubic-bezier(0.34, 1.56, 0.64, 1)', 'linear', 'ease-out'];

// ── Helpers ────────────────────────────────────────────────────────────────

let idCounter = 0;
const uid = () => `p${++idCounter}`;

// ── Component ──────────────────────────────────────────────────────────────

export default function CSSAtPropertyPlayground() {
  const [properties, setProperties] = useState<PropertyDef[]>(() =>
    PRESETS[0].properties.map((p) => ({ ...p, id: uid(), startValue: p.startValue, endValue: p.endValue })),
  );
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [duration, setDuration] = useState(2);
  const [easing, setEasing] = useState('ease-in-out');
  const demoRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Apply active state
  useEffect(() => {
    const el = demoRef.current;
    if (!el) return;

    const state = animating ? 'animating' : 'idle';
    el.setAttribute('data-state', state);

    properties.forEach((p) => {
      el.style.setProperty(p.name, animating ? p.endValue : p.startValue);
    });
  }, [animating, properties]);

  // Register @property rules and inject styles
  useEffect(() => {
    // Remove previous style
    if (styleRef.current) {
      styleRef.current.remove();
    }

    const style = document.createElement('style');
    styleRef.current = style;
    document.head.appendChild(style);

    const rules: string[] = [];

    properties.forEach((p) => {
      rules.push(`@property ${p.name} {
  syntax: '${p.syntax}';
  inherits: ${p.inherits};
  initial-value: ${p.initialValue};
}`);
    });

    // Demo element styles
    const selector = `[data-css-at-property-demo]`;
    const baseStyles: string[] = [`${selector} {`];
    baseStyles.push(`  transition: all ${duration}s ${easing};`);

    const animStyles: string[] = [`${selector} {`];
    animStyles.push(`  transition: all ${duration}s ${easing};`);

    rules.push(baseStyles.join('\n') + '\n}');
    rules.push(animStyles.join('\n') + '\n}');

    style.textContent = rules.join('\n\n');
  }, [properties, duration, easing]);

  const toggleAnimation = useCallback(() => {
    setAnimating((prev) => !prev);
  }, []);

  const resetAnimation = useCallback(() => {
    setAnimating(false);
    // Force reflow
    setTimeout(() => {
      setAnimating(true);
    }, 50);
  }, []);

  const applyPreset = useCallback((idx: number) => {
    setAnimating(false);
    setSelectedPreset(idx);
    const preset = PRESETS[idx];
    setProperties(preset.properties.map((p) => ({ ...p, id: uid(), startValue: p.startValue, endValue: p.endValue })));
  }, []);

  const addProperty = useCallback(() => {
    setProperties((prev) => [
      ...prev,
      {
        id: uid(),
        name: `--new-prop-${prev.length + 1}`,
        syntax: '<color>',
        inherits: false,
        initialValue: '#3b82f6',
        startValue: '#3b82f6',
        endValue: '#f59e0b',
      },
    ]);
  }, []);

  const removeProperty = useCallback((id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateProperty = useCallback((id: string, field: keyof PropertyDef, value: string | boolean) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, []);

  const copyCSS = useCallback(() => {
    const lines: string[] = [];
    properties.forEach((p) => {
      lines.push(`@property ${p.name} {`);
      lines.push(`  syntax: '${p.syntax}';`);
      lines.push(`  inherits: ${p.inherits};`);
      lines.push(`  initial-value: ${p.initialValue};`);
      lines.push('}');
      lines.push('');
    });

    lines.push(`/* Usage: assign the custom property and transition it */`);
    lines.push(`.my-element {`);
    lines.push(`  ${properties.map((p) => `${p.name}: ${p.startValue};`).join('\n  ')}`);
    lines.push(`  transition: ${properties.map((p) => `${p.name} ${duration}s ${easing}`).join(', ')};`);
    lines.push('}');
    lines.push('');
    lines.push(`.my-element:hover {`);
    lines.push(`  ${properties.map((p) => `${p.name}: ${p.endValue};`).join('\n  ')}`);
    lines.push('}');

    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('CSS copied!');
  }, [properties, duration, easing]);

  const copySingleProperty = useCallback((p: PropertyDef) => {
    const lines = [
      `@property ${p.name} {`,
      `  syntax: '${p.syntax}';`,
      `  inherits: ${p.inherits};`,
      `  initial-value: ${p.initialValue};`,
      '}',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success(`@property ${p.name} copied!`);
  }, []);

  // Build the demo element styles dynamically
  const demoStyle = useMemo(() => {
    const preset = PRESETS[selectedPreset];
    const baseStyles: Record<string, string> = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '12px',
      fontSize: '18px',
      fontWeight: '600',
      cursor: 'pointer',
      userSelect: 'none',
      transition: `all ${duration}s ${easing}`,
      fontFamily: 'system-ui, sans-serif',
    };

    // Apply each property's start or end value
    properties.forEach((p) => {
      baseStyles[p.name as keyof typeof baseStyles] = animating ? p.endValue : p.startValue;
    });

    return baseStyles;
  }, [selectedPreset, properties, animating, duration, easing]);

  return (
    <ToolLayout
      title="CSS @property Playground"
      description="Define typed custom properties and see them animate smoothly — color, length, angle, number, and more. @property is Baseline 2026 across all browsers."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedPreset}
            onChange={(e) => applyPreset(Number(e.target.value))}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-400"
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="text-slate-500 text-sm">|</span>
          <label className="text-slate-400 text-xs flex items-center gap-1">
            Duration
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-brand-400"
            >
              {DURATION_PRESETS.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          </label>
          <label className="text-slate-400 text-xs flex items-center gap-1">
            Easing
            <select
              value={easing}
              onChange={(e) => setEasing(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-brand-400 max-w-[200px]"
            >
              {EASING_PRESETS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={toggleAnimation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500/20 transition-colors"
          >
            {animating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {animating ? 'Reset' : 'Animate'}
          </button>
          <button
            onClick={resetAnimation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>
          <button
            onClick={copyCSS}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-brand-400 border border-brand-500/30 hover:bg-slate-600 transition-colors ml-auto"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Properties Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-400" />
              @property Definitions
            </h3>
            <button
              onClick={addProperty}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500/20 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {properties.map((p) => (
              <div
                key={p.id}
                className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updateProperty(p.id, 'name', e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-sm font-mono text-brand-300 focus:outline-none focus:border-brand-400"
                    placeholder="--my-prop"
                  />
                  <button
                    onClick={() => removeProperty(p.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove property"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => copySingleProperty(p)}
                    className="p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                    title="Copy @property"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Syntax</span>
                    <select
                      value={p.syntax}
                      onChange={(e) => updateProperty(p.id, 'syntax', e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-brand-400"
                    >
                      {SYNTAX_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Initial Value</span>
                    <input
                      type="text"
                      value={p.initialValue}
                      onChange={(e) => updateProperty(p.id, 'initialValue', e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-400"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Start Value</span>
                    <div className="flex items-center gap-1.5">
                      {p.syntax === '<color>' && (
                        <input
                          type="color"
                          value={p.startValue}
                          onChange={(e) => updateProperty(p.id, 'startValue', e.target.value)}
                          className="w-6 h-6 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                        />
                      )}
                      <input
                        type="text"
                        value={p.startValue}
                        onChange={(e) => updateProperty(p.id, 'startValue', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-400"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">End Value</span>
                    <div className="flex items-center gap-1.5">
                      {p.syntax === '<color>' && (
                        <input
                          type="color"
                          value={p.endValue}
                          onChange={(e) => updateProperty(p.id, 'endValue', e.target.value)}
                          className="w-6 h-6 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                        />
                      )}
                      <input
                        type="text"
                        value={p.endValue}
                        onChange={(e) => updateProperty(p.id, 'endValue', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-400"
                      />
                    </div>
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.inherits}
                    onChange={(e) => updateProperty(p.id, 'inherits', e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-500/30"
                  />
                  <span className="text-xs text-slate-400">inherits: {String(p.inherits)}</span>
                </label>
              </div>
            ))}

            {properties.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No properties defined.</p>
                <p className="text-xs mt-1">Add one or select a preset above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            Live Preview
            <span className="text-xs font-normal text-slate-500 ml-auto">
              {animating ? (
                <span className="text-green-400 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Animating
                </span>
              ) : (
                <span className="text-slate-500">Idle — click Animate</span>
              )}
            </span>
          </h3>

          {/* Preview Card */}
          <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-8 flex items-center justify-center min-h-[280px]">
            <div
              ref={demoRef}
              data-css-at-property-demo
              data-state="idle"
              onClick={toggleAnimation}
              className="relative overflow-hidden"
              style={(() => {
                const boxSizeProp = properties.find((p) => p.name === '--box-size');
                const boxRadiusProp = properties.find((p) => p.name === '--box-radius');
                const opacityProp = properties.find((p) => p.name === '--card-opacity');
                const scaleProp = properties.find((p) => p.name === '--card-scale');
                const transformProp = properties.find((p) => p.name === '--card-transform');
                const grad1Prop = properties.find((p) => p.name === '--grad-stop-1');
                const grad2Prop = properties.find((p) => p.name === '--grad-stop-2');
                const btnBgProp = properties.find((p) => p.name === '--btn-bg' || p.name === '--box-bg');
                const computedWidth = animating
                  ? boxSizeProp?.endValue
                    ? String(parseInt(boxSizeProp.endValue || '80') * 1.5) + 'px'
                    : '220px'
                  : boxSizeProp?.startValue
                    ? String(parseInt(boxSizeProp.startValue || '80') * 1.5) + 'px'
                    : '220px';
                const computedRadius = animating ? boxRadiusProp?.endValue || '16px' : boxRadiusProp?.startValue || '16px';
                const computedOpacity = animating ? opacityProp?.endValue || '1' : opacityProp?.startValue || '1';
                const computedTransform = animating
                  ? scaleProp?.endValue
                    ? `scale(${scaleProp.endValue})`
                    : transformProp?.endValue || 'none'
                  : scaleProp?.startValue
                    ? `scale(${scaleProp.startValue})`
                    : transformProp?.startValue || 'none';
                const computedBgColor = btnBgProp
                  ? animating
                    ? btnBgProp.endValue || '#6366f1'
                    : btnBgProp.startValue || '#6366f1'
                  : undefined;
                const hasGradient = grad1Prop && grad2Prop;
                const computedBgImage = hasGradient
                  ? `linear-gradient(135deg, ${animating ? grad1Prop.endValue || '#6366f1' : grad1Prop.startValue || '#6366f1'}, ${animating ? grad2Prop.endValue || '#ec4899' : grad2Prop.startValue || '#ec4899'})`
                  : undefined;
                return {
                  width: computedWidth,
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: computedRadius,
                  fontSize: '20px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none' as const,
                  transition: `all ${duration}s ${easing}`,
                  fontFamily: 'system-ui, sans-serif',
                  background: computedBgImage || undefined,
                  backgroundImage: computedBgImage,
                  backgroundColor: hasGradient ? undefined : computedBgColor || '#6366f1',
                  color: '#fff',
                  border: '2px solid rgba(255,255,255,0.1)',
                  opacity: computedOpacity,
                  transform: computedTransform,
                  boxShadow:
                    animating && opacityProp
                      ? '0 20px 60px rgba(99, 102, 241, 0.3)'
                      : 'none',
                };
              })()}
            >
              <div
                style={{
                  transition: `all ${duration}s ${easing}`,
                  transform: animating
                    ? properties.find((p) => p.name === '--icon-rotate')?.endValue
                      ? `rotate(${properties.find((p) => p.name === '--icon-rotate')?.endValue})`
                      : 'none'
                    : properties.find((p) => p.name === '--icon-rotate')?.startValue
                      ? `rotate(${properties.find((p) => p.name === '--icon-rotate')?.startValue})`
                      : 'none',
                }}
              >
                {selectedPreset === 0 && (
                  <span className="text-lg tracking-wide">
                    {animating ? '✨ Hovering' : 'Hover Me ✨'}
                  </span>
                )}
                {selectedPreset === 1 && (
                  <span className="text-lg tracking-wide">{animating ? '🌈 Shifted' : 'Gradient'}</span>
                )}
                {selectedPreset === 2 && (
                  <span className="text-sm">{animating ? '⬜ Expanded' : '⬜ Size'}</span>
                )}
                {selectedPreset === 3 && (
                  <span className="text-lg tracking-wide">{animating ? '🌟 Full' : 'Spring'}</span>
                )}
                {selectedPreset === 4 && <span className="text-4xl">↻</span>}
                {selectedPreset === 5 && (
                  <span className="text-lg tracking-wide">{animating ? '🔄 Transformed' : 'Transform'}</span>
                )}
                {selectedPreset === 6 && (
                  <div className="w-full px-4">
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{
                          width: animating
                            ? properties.find((p) => p.name === '--progress')?.endValue || '0%'
                            : properties.find((p) => p.name === '--progress')?.startValue || '0%',
                          transition: `width ${duration}s ${easing}`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-center mt-2 text-white/70">
                      {animating
                        ? properties.find((p) => p.name === '--progress')?.endValue || '0%'
                        : properties.find((p) => p.name === '--progress')?.startValue || '0%'}
                    </div>
                  </div>
                )}
                {selectedPreset === 7 && (
                  <div className="w-full px-4 space-y-3">
                    <div
                      className="h-3 bg-white/30 rounded-full transition-all"
                      style={{
                        width: animating
                          ? properties.find((p) => p.name === '--bar-width')?.endValue
                            ? `${Math.min(parseInt(properties.find((p) => p.name === '--bar-width')?.endValue || '100') / 3, 100)}%`
                            : '33%'
                          : properties.find((p) => p.name === '--bar-width')?.startValue
                            ? `${Math.min(parseInt(properties.find((p) => p.name === '--bar-width')?.startValue || '100') / 3, 100)}%`
                            : '33%',
                        transition: `width ${duration}s ${easing}`,
                        opacity: animating
                          ? properties.find((p) => p.name === '--bar-opacity')?.endValue || '1'
                          : properties.find((p) => p.name === '--bar-opacity')?.startValue || '1',
                      }}
                    />
                    <div className="text-xs text-center text-white/60">Bar demo</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
              <h4 className="text-xs font-semibold text-brand-400 mb-2">What is @property?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The <code className="bg-slate-700/50 px-1 rounded text-slate-300">@property</code> CSS at-rule lets you
                define the <strong>type</strong> of a custom property. This tells the browser how to interpolate between
                values, enabling <strong>smooth transitions and animations</strong> on any custom property — no more
                hard color flips on hover.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
              <h4 className="text-xs font-semibold text-green-400 mb-2">Browser Support</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Baseline 2026</strong> — @property is now supported in Chrome 85+, Firefox 128+, Safari 15.4+,
                and Edge 85+. It&apos;s safe for production everywhere. Over <strong>96%</strong> global coverage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
