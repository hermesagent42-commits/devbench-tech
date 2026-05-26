'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Plus, Trash2, Sparkles, Type, Palette, GripHorizontal, Sun } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type GradientType = 'linear' | 'radial' | 'conic';

interface ColorStop {
  id: string;
  color: string;
  position: number;
}

interface Preset {
  name: string;
  type: GradientType;
  angle: number;
  stops: Omit<ColorStop, 'id'>[];
  textShadow?: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
}

let stopIdCounter = 0;
function nextStopId(): string {
  stopIdCounter += 1;
  return `stop-${stopIdCounter}`;
}

function createStop(overrides: Partial<ColorStop> = {}): ColorStop {
  return {
    id: nextStopId(),
    color: '#6366f1',
    position: 50,
    ...overrides,
  };
}

const PRESETS: Preset[] = [
  {
    name: 'Neon Pink',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#ff0080', position: 0 },
      { color: '#ff8c00', position: 50 },
      { color: '#ff0080', position: 100 },
    ],
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Ocean Blue',
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#00c6ff', position: 0 },
      { color: '#0072ff', position: 100 },
    ],
    textShadow: '0 2px 10px rgba(0, 114, 255, 0.4)',
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Sunset',
    type: 'linear',
    angle: 45,
    stops: [
      { color: '#f97316', position: 0 },
      { color: '#ec4899', position: 50 },
      { color: '#8b5cf6', position: 100 },
    ],
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Aurora',
    type: 'linear',
    angle: 160,
    stops: [
      { color: '#10b981', position: 0 },
      { color: '#06b6d4', position: 40 },
      { color: '#8b5cf6', position: 70 },
      { color: '#ec4899', position: 100 },
    ],
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Fire',
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#fffb00', position: 0 },
      { color: '#ff6a00', position: 40 },
      { color: '#ee0000', position: 100 },
    ],
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Purple Haze',
    type: 'linear',
    angle: 270,
    stops: [
      { color: '#7c3aed', position: 0 },
      { color: '#d946ef', position: 100 },
    ],
    textShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Radial Glow',
    type: 'radial',
    angle: 0,
    stops: [
      { color: '#fbbf24', position: 0 },
      { color: '#f97316', position: 100 },
    ],
    textShadow: '0 0 30px rgba(251, 191, 36, 0.6)',
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Conic Rainbow',
    type: 'conic',
    angle: 0,
    stops: [
      { color: '#ff0000', position: 0 },
      { color: '#ff8800', position: 16 },
      { color: '#ffff00', position: 33 },
      { color: '#00ff00', position: 50 },
      { color: '#0088ff', position: 66 },
      { color: '#8800ff', position: 83 },
      { color: '#ff0000', position: 100 },
    ],
    fontWeight: 800,
    fontStyle: 'normal',
  },
  {
    name: 'Midnight',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#1e293b', position: 0 },
      { color: '#64748b', position: 100 },
    ],
    fontWeight: 700,
    fontStyle: 'italic',
  },
  {
    name: 'Retro Wave',
    type: 'linear',
    angle: 0,
    stops: [
      { color: '#ff00cc', position: 0 },
      { color: '#3333ff', position: 100 },
    ],
    textShadow: '0 0 15px rgba(255, 0, 204, 0.5), 0 0 30px rgba(51, 51, 255, 0.3)',
    fontWeight: 800,
    fontStyle: 'normal',
  },
];

// ── CSS Generation ─────────────────────────────────────────────────────────

function generateGradientCSS(
  type: GradientType,
  angle: number,
  stops: ColorStop[],
  textShadow: string,
): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const stopList = sorted.map((s) => `${s.color} ${s.position}%`).join(', ');

  let gradientFn = '';
  switch (type) {
    case 'linear':
      gradientFn = `linear-gradient(${angle}deg, ${stopList})`;
      break;
    case 'radial':
      gradientFn = `radial-gradient(circle, ${stopList})`;
      break;
    case 'conic':
      gradientFn = `conic-gradient(from ${angle}deg, ${stopList})`;
      break;
  }

  const css = [
    `background: ${gradientFn};`,
    `-webkit-background-clip: text;`,
    `background-clip: text;`,
    `-webkit-text-fill-color: transparent;`,
  ];

  if (textShadow.trim()) {
    css.push(`text-shadow: ${textShadow};`);
  }

  return css.join('\n');
}

function generateFullCSS(
  type: GradientType,
  angle: number,
  stops: ColorStop[],
  textShadow: string,
  fontSize: number,
  fontWeight: number,
  fontStyle: string,
): string {
  const gradientCSS = generateGradientCSS(type, angle, stops, textShadow);
  return `.gradient-text {\n` +
    `  font-size: ${fontSize}px;\n` +
    `  font-weight: ${fontWeight};\n` +
    (fontStyle === 'italic' ? `  font-style: italic;\n` : '') +
    `  ${gradientCSS.replace(/\n/g, '\n  ')}\n` +
    `}`;
}

function generateGradientStyle(
  type: GradientType,
  angle: number,
  stops: ColorStop[],
): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const stopList = sorted.map((s) => `${s.color} ${s.position}%`).join(', ');

  switch (type) {
    case 'linear':
      return `linear-gradient(${angle}deg, ${stopList})`;
    case 'radial':
      return `radial-gradient(circle, ${stopList})`;
    case 'conic':
      return `conic-gradient(from ${angle}deg, ${stopList})`;
  }
}

// ── Page Component ─────────────────────────────────────────────────────────

export default function GradientTextGeneratorPage() {
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(90);
  const [stops, setStops] = useState<ColorStop[]>([
    createStop({ color: '#6366f1', position: 0, id: nextStopId() }),
    createStop({ color: '#ec4899', position: 50, id: nextStopId() }),
    createStop({ color: '#f97316', position: 100, id: nextStopId() }),
  ]);
  const [sampleText, setSampleText] = useState('Gradient Text');
  const [fontSize, setFontSize] = useState(72);
  const [fontWeight, setFontWeight] = useState(800);
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [textShadow, setTextShadow] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [cssMode, setCssMode] = useState<'gradient-only' | 'full-rule'>('gradient-only');

  const gradientStyle = useMemo(
    () => generateGradientStyle(gradientType, angle, stops),
    [gradientType, angle, stops],
  );

  const cssOutput = useMemo(
    () =>
      cssMode === 'gradient-only'
        ? generateGradientCSS(gradientType, angle, stops, textShadow)
        : generateFullCSS(gradientType, angle, stops, textShadow, fontSize, fontWeight, fontStyle),
    [gradientType, angle, stops, textShadow, fontSize, fontWeight, fontStyle, cssMode],
  );

  const handleApplyPreset = useCallback((preset: Preset) => {
    stopIdCounter = 0;
    setGradientType(preset.type);
    setAngle(preset.angle);
    setStops(preset.stops.map((s) => createStop({ color: s.color, position: s.position })));
    setTextShadow(preset.textShadow || '');
    setFontWeight(preset.fontWeight);
    setFontStyle(preset.fontStyle);
    setShowPresets(false);
    toast.success(`Applied "${preset.name}" preset`);
  }, []);

  const addStop = useCallback(() => {
    setStops((prev) => {
      if (prev.length >= 8) {
        toast.error('Maximum 8 color stops');
        return prev;
      }
      // Insert at midpoint of widest gap
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      let bestPos = 50;
      let bestGap = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].position - sorted[i].position;
        if (gap > bestGap) {
          bestGap = gap;
          bestPos = Math.round(sorted[i].position + gap / 2);
        }
      }
      if (bestGap === 0 && prev.length > 0) {
        bestPos = Math.min((prev[prev.length - 1].position || 0) + 20, 100);
      }
      return [...prev, createStop({ color: '#a855f7', position: bestPos })];
    });
  }, []);

  const removeStop = useCallback((id: string) => {
    setStops((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const updateStop = useCallback(
    (id: string, field: 'color' | 'position', value: string | number) => {
      setStops((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, [field]: field === 'position' ? Math.max(0, Math.min(100, Number(value))) : value }
            : s,
        ),
      );
    },
    [],
  );

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cssOutput]);

  const resetAll = useCallback(() => {
    stopIdCounter = 0;
    setGradientType('linear');
    setAngle(90);
    setStops([
      createStop({ color: '#6366f1', position: 0 }),
      createStop({ color: '#ec4899', position: 50 }),
      createStop({ color: '#f97316', position: 100 }),
    ]);
    setSampleText('Gradient Text');
    setFontSize(72);
    setFontWeight(800);
    setFontStyle('normal');
    setTextShadow('');
    toast.success('Reset to defaults');
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Gradient Text Generator"
      description="Build stunning gradient text effects using CSS background-clip. Linear, radial, and conic gradients with live preview, 10 presets, glow effects, and one-click CSS copy."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Controls ── */}
        <div className="space-y-5">
          {/* Gradient Type */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <Palette className="w-3.5 h-3.5 inline mr-1.5" />
              Gradient Type
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['linear', 'radial', 'conic'] as GradientType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setGradientType(t)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all capitalize ${
                    gradientType === t
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-semibold'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Angle */}
          {(gradientType === 'linear' || gradientType === 'conic') && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                <Sun className="w-3.5 h-3.5 inline mr-1.5" />
                Angle: {angle}°
              </h3>
              <input
                type="range"
                min={0}
                max={360}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between mt-1">
                {[0, 90, 180, 270, 360].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAngle(v)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      angle === v
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {v}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Stops */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <GripHorizontal className="w-3.5 h-3.5 inline mr-1.5" />
                Color Stops ({stops.length})
              </h3>
              <button
                onClick={addStop}
                className="btn-secondary text-xs flex items-center gap-1 py-1 px-2"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2.5">
              {[...stops]
                .sort((a, b) => a.position - b.position)
                .map((stop, i) => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) => updateStop(stop.id, 'color', e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={stop.color}
                      onChange={(e) => updateStop(stop.id, 'color', e.target.value)}
                      className="input-field flex-1 font-mono text-xs py-1"
                      placeholder="#000000"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={(e) => updateStop(stop.id, 'position', e.target.value)}
                        className="input-field w-14 font-mono text-xs py-1 text-center"
                      />
                      <span className="text-[10px] text-slate-500">%</span>
                    </div>
                    {stops.length > 2 && (
                      <button
                        onClick={() => removeStop(stop.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                        title="Remove stop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {/* Gradient preview bar */}
            <div
              className="mt-3 h-3 rounded-full"
              style={{
                background: generateGradientStyle(gradientType, angle, stops),
              }}
            />
          </div>

          {/* Text Properties */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <Type className="w-3.5 h-3.5 inline mr-1.5" />
              Text Properties
            </h3>

            <div className="space-y-3">
              {/* Sample Text */}
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Sample Text</label>
                <input
                  type="text"
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  className="input-field w-full text-sm"
                  placeholder="Type something..."
                  maxLength={60}
                />
              </div>

              {/* Font Size */}
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Font Size: {fontSize}px
                </label>
                <input
                  type="range"
                  min={16}
                  max={160}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Font Weight */}
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Font Weight: {fontWeight}
                </label>
                <div className="flex gap-1.5">
                  {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                    <button
                      key={w}
                      onClick={() => setFontWeight(w)}
                      className={`flex-1 py-1 text-xs rounded border transition-all ${
                        fontWeight === w
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-slate-700 text-slate-500 hover:border-slate-600'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Style */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-500">Style:</label>
                <button
                  onClick={() => setFontStyle('normal')}
                  className={`px-3 py-1 text-xs rounded border transition-all ${
                    fontStyle === 'normal'
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700 text-slate-500'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setFontStyle('italic')}
                  className={`px-3 py-1 text-xs rounded border italic transition-all ${
                    fontStyle === 'italic'
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700 text-slate-500'
                  }`}
                >
                  Italic
                </button>
              </div>

              {/* Text Shadow */}
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Text Shadow (for glow effects)
                </label>
                <input
                  type="text"
                  value={textShadow}
                  onChange={(e) => setTextShadow(e.target.value)}
                  className="input-field w-full font-mono text-xs"
                  placeholder='e.g. 0 0 20px rgba(99,102,241,0.5)'
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                Presets
              </h3>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="btn-secondary text-xs py-1 px-2"
              >
                {showPresets ? 'Hide' : 'Show'} ({PRESETS.length})
              </button>
              <button onClick={resetAll} className="btn-secondary text-xs flex items-center gap-1 py-1 px-2">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {showPresets && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyPreset(preset)}
                    className="text-left px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/50 hover:border-slate-500 transition-all group"
                  >
                    <div className="text-xs font-semibold text-slate-300 group-hover:text-white">
                      {preset.name}
                    </div>
                    <div
                      className="mt-1 h-2 rounded-full"
                      style={{
                        background: (() => {
                          const sorted = [...preset.stops].sort((a, b) => a.position - b.position);
                          const stopList = sorted.map((s) => `${s.color} ${s.position}%`).join(', ');
                          switch (preset.type) {
                            case 'linear':
                              return `linear-gradient(${preset.angle}deg, ${stopList})`;
                            case 'radial':
                              return `radial-gradient(circle, ${stopList})`;
                            case 'conic':
                              return `conic-gradient(from ${preset.angle}deg, ${stopList})`;
                          }
                        })(),
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Preview & Output ── */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Live Preview
            </h3>
            <div className="flex items-center justify-center min-h-[200px] rounded-xl bg-slate-900/80 border border-slate-700/50 p-6">
              <div
                className="text-center break-words max-w-full leading-tight select-none"
                style={{
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  fontStyle,
                  background: gradientStyle,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: textShadow || undefined,
                }}
              >
                {sampleText || 'Gradient Text'}
              </div>
            </div>
          </div>

          {/* Dark / Light Background Toggle Preview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3">
              <span className="text-[10px] text-slate-500 block mb-2">Dark Background</span>
              <div className="flex items-center justify-center h-16 rounded-lg bg-slate-900">
                <div
                  className="text-center truncate px-2"
                  style={{
                    fontSize: '24px',
                    fontWeight,
                    fontStyle,
                    background: gradientStyle,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: textShadow || undefined,
                  }}
                >
                  {sampleText || 'Gradient Text'}
                </div>
              </div>
            </div>
            <div className="card p-3">
              <span className="text-[10px] text-slate-500 block mb-2">Light Background</span>
              <div className="flex items-center justify-center h-16 rounded-lg bg-white">
                <div
                  className="text-center truncate px-2"
                  style={{
                    fontSize: '24px',
                    fontWeight,
                    fontStyle,
                    background: gradientStyle,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: textShadow || undefined,
                  }}
                >
                  {sampleText || 'Gradient Text'}
                </div>
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                CSS Output
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={cssMode}
                  onChange={(e) => setCssMode(e.target.value as 'gradient-only' | 'full-rule')}
                  className="input-field text-xs py-1"
                >
                  <option value="gradient-only">Gradient Only</option>
                  <option value="full-rule">Full Rule</option>
                </select>
                <button
                  onClick={copyCSS}
                  className="btn-secondary text-xs flex items-center gap-1 py-1 px-2"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            </div>
            <pre className="bg-slate-950 text-slate-300 text-xs font-mono p-4 rounded-lg overflow-x-auto border border-slate-700/50 whitespace-pre-wrap">
              <code>{cssOutput}</code>
            </pre>
          </div>

          {/* How to Use */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              How to Use
            </h3>
            <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
              <li>Choose a gradient type, colors, and angle above</li>
              <li>Adjust font size, weight, and add glow (text-shadow)</li>
              <li>Copy the CSS and apply to any text element</li>
              <li>
                Ensure the element has <code className="bg-slate-800 px-1 rounded">display: inline</code> or{' '}
                <code className="bg-slate-800 px-1 rounded">display: inline-block</code> for best results
              </li>
            </ol>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
