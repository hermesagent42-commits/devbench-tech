'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Scissors, Circle, Square, Diamond, Star, Hexagon, Cloud, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ShapeType = 'circle' | 'ellipse' | 'inset' | 'polygon';

interface ClipShape {
  type: ShapeType;
  // circle
  circleRadius: number;    // percentage 0-100
  circleX: number;         // percentage 0-100
  circleY: number;         // percentage 0-100
  // ellipse
  ellipseRx: number;       // percentage 0-100
  ellipseRy: number;       // percentage 0-100
  ellipseX: number;
  ellipseY: number;
  // inset
  insetTop: number;        // percentage 0-100
  insetRight: number;
  insetBottom: number;
  insetLeft: number;
  insetRound: number;      // px 0-100
  // polygon
  polygonPoints: string;   // e.g. "50% 0%, 100% 100%, 0% 100%"
}

interface Preset {
  name: string;
  description: string;
  shape: ClipShape;
  icon?: React.ReactNode;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Circle Center',
    description: 'Perfect centered circle',
    shape: { type: 'circle', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 40, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 100% 100%, 0% 100%' },
  },
  {
    name: 'Circle Top-Left',
    description: 'Circle anchored top-left',
    shape: { type: 'circle', circleRadius: 40, circleX: 30, circleY: 30, ellipseRx: 50, ellipseRy: 40, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 100% 100%, 0% 100%' },
  },
  {
    name: 'Ellipse Center',
    description: 'Oval centered',
    shape: { type: 'ellipse', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 100% 100%, 0% 100%' },
  },
  {
    name: 'Ellipse Wide',
    description: 'Wide horizontal oval',
    shape: { type: 'ellipse', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 60, ellipseRy: 25, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 100% 100%, 0% 100%' },
  },
  {
    name: 'Inset Rounded',
    description: 'Rounded inner rectangle',
    shape: { type: 'inset', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 10, insetRight: 10, insetBottom: 10, insetLeft: 10, insetRound: 20, polygonPoints: '50% 0%, 100% 100%, 0% 100%' },
  },
  {
    name: 'Inset Window',
    description: 'Window-like cutout',
    shape: { type: 'inset', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 5, insetRight: 5, insetBottom: 25, insetLeft: 5, insetRound: 8, polygonPoints: '50% 0%, 100% 100%, 0% 100%' },
  },
  {
    name: 'Triangle Up',
    description: 'Upward-pointing triangle',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 0% 100%, 100% 100%' },
  },
  {
    name: 'Triangle Down',
    description: 'Downward-pointing triangle',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '0% 0%, 100% 0%, 50% 100%' },
  },
  {
    name: 'Triangle Left',
    description: 'Left-pointing triangle',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '0% 50%, 100% 0%, 100% 100%' },
  },
  {
    name: 'Triangle Right',
    description: 'Right-pointing triangle',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '0% 0%, 100% 50%, 0% 100%' },
  },
  {
    name: 'Diamond',
    description: 'Classic rhombus shape',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 100% 50%, 50% 100%, 0% 50%' },
  },
  {
    name: 'Pentagon',
    description: 'Five-sided polygon',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%' },
  },
  {
    name: 'Hexagon',
    description: 'Six-sided hexagon',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%' },
  },
  {
    name: 'Star (5-point)',
    description: 'Five-pointed star',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%' },
  },
  {
    name: 'Parallelogram',
    description: 'Slanted rectangle',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '25% 0%, 100% 0%, 75% 100%, 0% 100%' },
  },
  {
    name: 'Trapezoid',
    description: 'Tapered trapezoid shape',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '20% 0%, 80% 0%, 100% 100%, 0% 100%' },
  },
  {
    name: 'Arrow Right',
    description: 'Right-pointing arrow',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%' },
  },
  {
    name: 'Chevron',
    description: 'V-shaped chevron',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '0% 0%, 50% 50%, 100% 0%, 100% 30%, 50% 80%, 0% 30%' },
  },
  {
    name: 'Rhombus Tall',
    description: 'Tall narrow diamond',
    shape: { type: 'polygon', circleRadius: 50, circleX: 50, circleY: 50, ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50, insetTop: 0, insetRight: 0, insetBottom: 0, insetLeft: 0, insetRound: 0, polygonPoints: '50% 0%, 100% 100%, 50% 100%, 0% 100%' },
  },
];

// ── Shape Type Icons ───────────────────────────────────────────────────────

const SHAPE_TYPE_ICONS: Record<ShapeType, React.ReactNode> = {
  circle: <Circle className="w-4 h-4" />,
  ellipse: <Circle className="w-4 h-4 opacity-70" />,
  inset: <Square className="w-4 h-4" />,
  polygon: <Diamond className="w-4 h-4" />,
};

const SHAPE_TYPE_LABEL: Record<ShapeType, string> = {
  circle: 'Circle',
  ellipse: 'Ellipse',
  inset: 'Inset',
  polygon: 'Polygon',
};

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_SHAPE: ClipShape = {
  type: 'circle',
  circleRadius: 50,
  circleX: 50,
  circleY: 50,
  ellipseRx: 50,
  ellipseRy: 35,
  ellipseX: 50,
  ellipseY: 50,
  insetTop: 10,
  insetRight: 10,
  insetBottom: 10,
  insetLeft: 10,
  insetRound: 15,
  polygonPoints: '50% 0%, 100% 100%, 0% 100%',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function buildClipPath(shape: ClipShape): string {
  switch (shape.type) {
    case 'circle':
      return `circle(${shape.circleRadius}% at ${shape.circleX}% ${shape.circleY}%)`;
    case 'ellipse':
      return `ellipse(${shape.ellipseRx}% ${shape.ellipseRy}% at ${shape.ellipseX}% ${shape.ellipseY}%)`;
    case 'inset':
      return `inset(${shape.insetTop}% ${shape.insetRight}% ${shape.insetBottom}% ${shape.insetLeft}% round ${shape.insetRound}px)`;
    case 'polygon':
      return `polygon(${shape.polygonPoints})`;
    default:
      return 'none';
  }
}

function presetToCSS(preset: Preset): string {
  return `clip-path: ${buildClipPath(preset.shape)};`;
}

// ── Slider Control ─────────────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '%',
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 font-medium">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={Math.round(value * (step < 1 ? 100 : 1)) / (step < 1 ? 100 : 1)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            min={min}
            max={max}
            step={step}
            className="w-16 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-slate-200 text-right font-mono focus:outline-none focus:border-brand-500"
          />
          <span className="text-xs text-slate-500 w-6">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

// ── Polygon Point Editor ──────────────────────────────────────────────────

function PolygonEditor({
  points,
  onChange,
}: {
  points: string;
  onChange: (pts: string) => void;
}) {
  const parsed = useMemo(() => {
    return points
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [points]);

  const updatePoint = useCallback(
    (idx: number, value: string) => {
      const next = [...parsed];
      next[idx] = value;
      onChange(next.join(', '));
    },
    [parsed, onChange],
  );

  const addPoint = useCallback(() => {
    onChange(points + (points ? ', 50% 50%' : '50% 50%'));
  }, [points, onChange]);

  const removePoint = useCallback(
    (idx: number) => {
      const next = parsed.filter((_, i) => i !== idx);
      onChange(next.join(', '));
    },
    [parsed, onChange],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-400 font-medium">Points ({parsed.length})</label>
        <button
          onClick={addPoint}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          + Add Point
        </button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
        {parsed.map((pt, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono w-5 text-right">{i + 1}</span>
            <input
              type="text"
              value={pt}
              onChange={(e) => updatePoint(i, e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              placeholder="X% Y%"
            />
            {parsed.length > 3 && (
              <button
                onClick={() => removePoint(i)}
                className="text-slate-500 hover:text-red-400 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSSClipPathGenerator() {
  const [shape, setShape] = useState<ClipShape>({ ...DEFAULT_SHAPE });
  const [previewBg, setPreviewBg] = useState('#0f172a');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const clipPathCSS = useMemo(() => buildClipPath(shape), [shape]);

  const updateShape = useCallback((patch: Partial<ClipShape>) => {
    setShape((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setShape({ ...preset.shape });
  }, []);

  const resetAll = useCallback(() => {
    setShape({ ...DEFAULT_SHAPE });
    setPreviewBg('#0f172a');
    setPreviewImage(null);
  }, []);

  const copyCSS = useCallback(() => {
    const css = `clip-path: ${clipPathCSS};`;
    navigator.clipboard.writeText(css);
    toast.success('CSS copied!');
  }, [clipPathCSS]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Generate a CSS gradient pattern for default preview
  const previewStyle = useMemo(() => {
    if (previewImage) {
      return {
        backgroundImage: `url(${previewImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    // Generate a nice gradient pattern
    return {
      background: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 25%, #a855f7 50%, #d946ef 75%, #ec4899 100%)`,
    };
  }, [previewImage]);

  return (
    <ToolLayout
      title="CSS Clip-Path Generator"
      description="Visually design CSS clip-path shapes — circle, ellipse, inset, and polygon. 20 presets, live preview with image upload, one-click CSS copy."
      controls={
        <>
          <button onClick={copyCSS} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button onClick={resetAll} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Shape Type & Presets ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* Shape Type Picker */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Shape Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SHAPE_TYPE_LABEL) as ShapeType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => updateShape({
                    type,
                    ...(type === 'circle' ? { circleRadius: 50, circleX: 50, circleY: 50 } : {}),
                    ...(type === 'ellipse' ? { ellipseRx: 50, ellipseRy: 35, ellipseX: 50, ellipseY: 50 } : {}),
                    ...(type === 'inset' ? { insetTop: 10, insetRight: 10, insetBottom: 10, insetLeft: 10, insetRound: 15 } : {}),
                    ...(type === 'polygon' ? { polygonPoints: '50% 0%, 100% 100%, 0% 100%' } : {}),
                  })}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                    shape.type === type
                      ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                      : 'bg-surface-light border-slate-700/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className={shape.type === type ? 'text-brand-400' : 'text-slate-400'}>
                    {SHAPE_TYPE_ICONS[type]}
                  </span>
                  <span className="text-xs font-medium">{SHAPE_TYPE_LABEL[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-1.5 max-h-[500px] overflow-y-auto pr-1">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-left p-2 rounded-lg bg-surface-light border border-slate-700/50 hover:border-brand-500/50 transition-colors"
                  title={p.description}
                >
                  <div className="text-[11px] font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">CSS Output</h3>
            <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700/30">
              <pre className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                clip-path: {clipPathCSS};
              </pre>
            </div>
          </div>
        </div>

        {/* ── Center/Right: Preview & Controls ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Preview</h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-500">BG Color:</label>
                <input
                  type="color"
                  value={previewBg}
                  onChange={(e) => setPreviewBg(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <label className="text-[10px] text-brand-400 cursor-pointer hover:text-brand-300 transition-colors">
                  📷 Upload Image
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {previewImage && (
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div
              className="h-72 rounded-lg flex items-center justify-center transition-colors relative overflow-hidden"
              style={{ backgroundColor: previewBg }}
            >
              {/* Clip-path preview element */}
              <div
                className="w-56 h-56 transition-all duration-200"
                style={{
                  ...previewStyle,
                  clipPath: clipPathCSS,
                }}
              />
              {/* Grid overlay for position reference */}
              <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="absolute top-0 left-1/2 w-px h-full bg-white" />
                <div className="absolute top-1/2 left-0 h-px w-full bg-white" />
                <div className="absolute top-0 left-1/4 w-px h-full bg-white" />
                <div className="absolute top-0 left-3/4 w-px h-full bg-white" />
                <div className="absolute top-1/4 left-0 h-px w-full bg-white" />
                <div className="absolute top-3/4 left-0 h-px w-full bg-white" />
              </div>
            </div>
          </div>

          {/* Shape Controls */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              {SHAPE_TYPE_ICONS[shape.type]}
              {SHAPE_TYPE_LABEL[shape.type]} Controls
            </h3>

            {shape.type === 'circle' && (
              <div className="space-y-3">
                <SliderControl label="Radius" value={shape.circleRadius} min={1} max={100} onChange={(v) => updateShape({ circleRadius: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <SliderControl label="Center X" value={shape.circleX} min={0} max={100} onChange={(v) => updateShape({ circleX: v })} />
                  <SliderControl label="Center Y" value={shape.circleY} min={0} max={100} onChange={(v) => updateShape({ circleY: v })} />
                </div>
              </div>
            )}

            {shape.type === 'ellipse' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SliderControl label="Radius X" value={shape.ellipseRx} min={1} max={100} onChange={(v) => updateShape({ ellipseRx: v })} />
                  <SliderControl label="Radius Y" value={shape.ellipseRy} min={1} max={100} onChange={(v) => updateShape({ ellipseRy: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SliderControl label="Center X" value={shape.ellipseX} min={0} max={100} onChange={(v) => updateShape({ ellipseX: v })} />
                  <SliderControl label="Center Y" value={shape.ellipseY} min={0} max={100} onChange={(v) => updateShape({ ellipseY: v })} />
                </div>
              </div>
            )}

            {shape.type === 'inset' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SliderControl label="Top" value={shape.insetTop} min={0} max={50} onChange={(v) => updateShape({ insetTop: v })} />
                  <SliderControl label="Right" value={shape.insetRight} min={0} max={50} onChange={(v) => updateShape({ insetRight: v })} />
                  <SliderControl label="Bottom" value={shape.insetBottom} min={0} max={50} onChange={(v) => updateShape({ insetBottom: v })} />
                  <SliderControl label="Left" value={shape.insetLeft} min={0} max={50} onChange={(v) => updateShape({ insetLeft: v })} />
                </div>
                <SliderControl label="Round" value={shape.insetRound} min={0} max={100} unit="px" onChange={(v) => updateShape({ insetRound: v })} />
              </div>
            )}

            {shape.type === 'polygon' && (
              <PolygonEditor
                points={shape.polygonPoints}
                onChange={(pts) => updateShape({ polygonPoints: pts })}
              />
            )}
          </div>

          {/* Info Card */}
          <details className="group rounded-xl border border-slate-700/50 overflow-hidden">
            <summary className="px-5 py-3 bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-medium text-slate-300 select-none">
              <Scissors className="w-4 h-4 text-slate-400" />
              About CSS clip-path
            </summary>
            <div className="px-5 py-4 space-y-3 text-sm bg-slate-800/20 text-slate-400">
              <p>
                <strong className="text-slate-200">clip-path</strong> creates a clipping region that determines what part of an element is visible.
                It&apos;s supported in all modern browsers (Baseline: Widely available since 2016–2020).
              </p>
              <div>
                <h4 className="font-semibold text-slate-200 mb-1">Basic Shapes</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li><code className="text-brand-300 bg-slate-700/50 px-1 rounded text-xs">circle()</code> — Circular clip with radius and center position</li>
                  <li><code className="text-brand-300 bg-slate-700/50 px-1 rounded text-xs">ellipse()</code> — Elliptical clip with x/y radii and center</li>
                  <li><code className="text-brand-300 bg-slate-700/50 px-1 rounded text-xs">inset()</code> — Rectangular clip with optional rounded corners</li>
                  <li><code className="text-brand-300 bg-slate-700/50 px-1 rounded text-xs">polygon()</code> — Free-form polygon with any number of points</li>
                </ul>
              </div>
              <p>
                Tip: Use with <code className="text-slate-300 bg-slate-700/50 px-1 rounded text-xs">transition</code> or <code className="text-slate-300 bg-slate-700/50 px-1 rounded text-xs">@keyframes</code> to animate between shapes with the same number of vertices!
              </p>
            </div>
          </details>
        </div>
      </div>
    </ToolLayout>
  );
}
