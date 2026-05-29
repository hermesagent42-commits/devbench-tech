'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Circle,
  Egg,
  Pentagon,
  Square,
  Copy,
  RefreshCw,
  ChevronDown,
  Code2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ShapeType = 'circle' | 'ellipse' | 'polygon' | 'inset' | 'url' | 'path';

interface ShapeParams {
  type: ShapeType;
  // circle
  circleRadius: number; // 10-200
  circlePosition: { x: number; y: number }; // 0-100%
  // ellipse
  ellipseRx: number; // 10-200
  ellipseRy: number; // 10-300
  ellipsePosition: { x: number; y: number };
  // polygon
  polygonSides: number; // 3-12
  polygonFill: 'nonzero' | 'evenodd';
  // inset
  insetTop: number; // 0-100
  insetRight: number;
  insetBottom: number;
  insetLeft: number;
  insetRound: number; // 0-100
  // url / path
  pathData: string;
  // shared
  float: 'left' | 'right';
  margin: number; // 0-60
  width: number; // 40-400
  height: number; // 40-400
  shapeMargin: number; // 0-60
  backgroundColor: string;
}

interface Preset {
  name: string;
  description: string;
  params: Partial<ShapeParams>;
}

// ── Defaults ───────────────────────────────────────────────────────────────

const defaultParams: ShapeParams = {
  type: 'circle',
  circleRadius: 70,
  circlePosition: { x: 50, y: 50 },
  ellipseRx: 80,
  ellipseRy: 120,
  ellipsePosition: { x: 50, y: 50 },
  polygonSides: 6,
  polygonFill: 'nonzero',
  insetTop: 20,
  insetRight: 20,
  insetBottom: 20,
  insetLeft: 20,
  insetRound: 30,
  pathData: 'M 50,0 C 80,0 100,30 100,60 C 100,90 80,100 50,100 C 20,100 0,80 0,60 C 0,30 20,0 50,0 Z',
  float: 'left',
  margin: 20,
  width: 200,
  height: 200,
  shapeMargin: 10,
  backgroundColor: '#6366f1',
};

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Circle Cutout',
    description: 'Text wraps around a circular image',
    params: { type: 'circle', circleRadius: 60, width: 150, height: 150 },
  },
  {
    name: 'Hexagon Honeycomb',
    description: 'Hexagonal shape for creative layouts',
    params: {
      type: 'polygon',
      polygonSides: 6,
      width: 180,
      height: 160,
    },
  },
  {
    name: 'Teardrop',
    description: 'Organic teardrop path shape',
    params: {
      type: 'path',
      pathData: 'M 50,10 C 50,10 90,40 90,70 C 90,100 70,100 50,100 C 30,100 50,100 10,70 C 10,40 50,10 50,10 Z',
      width: 160,
      height: 160,
    },
  },
  {
    name: 'Rounded Inset',
    description: 'Inset shape with rounded corners',
    params: {
      type: 'inset',
      insetTop: 15,
      insetRight: 15,
      insetBottom: 15,
      insetLeft: 15,
      insetRound: 40,
      width: 200,
      height: 200,
    },
  },
  {
    name: 'Star Polygon',
    description: '8-point star for editorial layouts',
    params: {
      type: 'polygon',
      polygonSides: 8,
      width: 200,
      height: 200,
    },
  },
  {
    name: 'Tall Ellipse',
    description: 'Vertical ellipse for portrait images',
    params: {
      type: 'ellipse',
      ellipseRx: 60,
      ellipseRy: 120,
      width: 150,
      height: 250,
    },
  },
  {
    name: 'Triangle Wedge',
    description: 'Triangular shape for angled text wraps',
    params: { type: 'polygon', polygonSides: 3, width: 200, height: 180 },
  },
  {
    name: 'Tight Inset Frame',
    description: 'Tight inset for magazine-style layouts',
    params: {
      type: 'inset',
      insetTop: 5,
      insetRight: 5,
      insetBottom: 5,
      insetLeft: 5,
      insetRound: 8,
      width: 200,
      height: 200,
    },
  },
];

// ── Polygon generator ──────────────────────────────────────────────────────

function generatePolygonPoints(sides: number, cx: number, cy: number, rx: number, ry: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    points.push(`${Math.round(x)},${Math.round(y)}`);
  }
  return points.join(' ');
}

// ── LOREM TEXT ─────────────────────────────────────────────────────────────

const SAMPLE_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.';

// ── CSS Generator ──────────────────────────────────────────────────────────

function generateCSS(p: ShapeParams): string {
  let shapeOutside: string;
  const containerW = p.width;
  const containerH = p.height;

  switch (p.type) {
    case 'circle':
      shapeOutside = `circle(${p.circleRadius}px at ${p.circlePosition.x}% ${p.circlePosition.y}%)`;
      break;
    case 'ellipse':
      shapeOutside = `ellipse(${p.ellipseRx}px ${p.ellipseRy}px at ${p.ellipsePosition.x}% ${p.ellipsePosition.y}%)`;
      break;
    case 'polygon': {
      const pts = generatePolygonPoints(
        p.polygonSides,
        containerW / 2,
        containerH / 2,
        containerW / 2,
        containerH / 2,
      );
      const fill = p.polygonFill !== 'nonzero' ? ` ${p.polygonFill}` : '';
      shapeOutside = `polygon(${pts}${fill})`;
      break;
    }
    case 'inset':
      shapeOutside = `inset(${p.insetTop}% ${p.insetRight}% ${p.insetBottom}% ${p.insetLeft}% round ${p.insetRound}px)`;
      break;
    case 'path':
      shapeOutside = `path('${p.pathData}')`;
      break;
    case 'url':
      shapeOutside = `url('image.png')`;
      break;
    default:
      shapeOutside = 'none';
  }

  const css: string[] = [];
  css.push('.shape-wrap {');
  css.push(`  float: ${p.float};`);
  if (p.type !== 'url') {
    css.push(`  width: ${p.width}px;`);
    css.push(`  height: ${p.height}px;`);
  }
  if (p.shapeMargin > 0) css.push(`  shape-margin: ${p.shapeMargin}px;`);
  if (p.margin > 0) css.push(`  margin-${p.float === 'left' ? 'right' : 'left'}: ${p.margin}px;`);
  css.push(`  shape-outside: ${shapeOutside};`);
  if (p.type !== 'url') {
    css.push(`  background: ${p.backgroundColor};`);
    css.push(`  border-radius: ${p.type === 'circle' ? '50%' : '4px'};`);
  }
  css.push('}');
  return css.join('\n');
}

// ── Shape type icons ───────────────────────────────────────────────────────

const shapeIcons: Record<ShapeType, React.ReactNode> = {
  circle: <Circle className="w-4 h-4" />,
  ellipse: <Egg className="w-4 h-4" />,
  polygon: <Pentagon className="w-4 h-4" />,
  inset: <Square className="w-4 h-4" />,
  url: <Code2 className="w-4 h-4" />,
  path: <Code2 className="w-4 h-4" />,
};

const shapeLabels: Record<ShapeType, string> = {
  circle: 'Circle',
  ellipse: 'Ellipse',
  polygon: 'Polygon',
  inset: 'Inset',
  url: 'URL / Image',
  path: 'SVG Path',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function ShapeOutsidePlayground() {
  const [params, setParams] = useState<ShapeParams>(defaultParams);
  const [selectedTab, setSelectedTab] = useState<'preview' | 'css'>('preview');

  const update = useCallback(
    (patch: Partial<ShapeParams>) => setParams((p) => ({ ...p, ...patch })),
    [],
  );

  const cssOutput = useMemo(() => generateCSS(params), [params]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cssOutput]);

  const reset = useCallback(() => {
    setParams(defaultParams);
    toast.success('Reset to defaults');
  }, []);

  // Build shape-outside value for CSS generation
  const shapeOutsideValue = useMemo(() => {
    switch (params.type) {
      case 'circle':
        return `circle(${params.circleRadius}px at ${params.circlePosition.x}% ${params.circlePosition.y}%)`;
      case 'ellipse':
        return `ellipse(${params.ellipseRx}px ${params.ellipseRy}px at ${params.ellipsePosition.x}% ${params.ellipsePosition.y}%)`;
      case 'polygon': {
        const pts = generatePolygonPoints(
          params.polygonSides,
          params.width / 2,
          params.height / 2,
          params.width / 2,
          params.height / 2,
        );
        return `polygon(${pts}${params.polygonFill !== 'nonzero' ? ' ' + params.polygonFill : ''})`;
      }
      case 'inset':
        return `inset(${params.insetTop}% ${params.insetRight}% ${params.insetBottom}% ${params.insetLeft}% round ${params.insetRound}px)`;
      case 'path':
        return `path('${params.pathData}')`;
      case 'url':
        return `url('image.png')`;
      default:
        return 'none';
    }
  }, [params]);

  // Build clip-path for preview (same polygon for visual)
  const clipPathValue = useMemo(() => {
    if (params.type === 'polygon') {
      const pts = generatePolygonPoints(
        params.polygonSides,
        params.width / 2,
        params.height / 2,
        params.width / 2,
        params.height / 2,
      );
      return `polygon(${pts})`;
    }
    if (params.type === 'inset') {
      return `inset(${params.insetTop}% ${params.insetRight}% ${params.insetBottom}% ${params.insetLeft}% round ${params.insetRound}px)`;
    }
    if (params.type === 'path') {
      return `path('${params.pathData}')`;
    }
    return undefined;
  }, [params]);

  const shapeStyle: React.CSSProperties = {
    float: params.float,
    width: params.width,
    height: params.height,
    shapeOutside: shapeOutsideValue,
    shapeMargin: params.shapeMargin,
    marginRight: params.float === 'left' ? params.margin : 0,
    marginLeft: params.float === 'right' ? params.margin : 0,
    marginBottom: params.margin / 2,
    ...(params.type === 'circle' ? { borderRadius: '50%' } : {}),
    background: params.type !== 'url' ? params.backgroundColor : 'none',
    clipPath: clipPathValue,
  };

  // ── Render helpers ─────────────────────────────────────────────────────

  const Slider = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = 'px',
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (v: number) => void;
  }) => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500"
      />
    </div>
  );

  const PercentSlider = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500"
      />
    </div>
  );

  const presetApplied = useCallback((preset: Preset) => {
    setParams({ ...defaultParams, ...preset.params } as ShapeParams);
    toast.success(`Loaded: ${preset.name}`);
  }, []);

  return (
    <ToolLayout
      title="CSS shape-outside Playground"
      description="Visually build CSS shape-outside layouts — wrap text around circles, ellipses, polygons, and custom paths. Live preview, 8 presets, instant CSS copy."
    >
      {/* ── Presets ────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Presets
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => presetApplied(preset)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-brand-500/50 hover:text-brand-300 transition-all"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Controls Panel ──────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Shape type */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Shape Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(shapeLabels) as ShapeType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => update({ type })}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    params.type === type
                      ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {shapeIcons[type]}
                  {shapeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Size &amp; Position
            </span>
            <Slider
              label="Width"
              value={params.width}
              min={40}
              max={400}
              onChange={(v) => update({ width: v })}
            />
            <Slider
              label="Height"
              value={params.height}
              min={40}
              max={400}
              onChange={(v) => update({ height: v })}
            />
            <Slider
              label="Shape Margin"
              value={params.shapeMargin}
              min={0}
              max={60}
              onChange={(v) => update({ shapeMargin: v })}
            />
            <Slider
              label="Text Margin"
              value={params.margin}
              min={0}
              max={60}
              onChange={(v) => update({ margin: v })}
            />

            {/* Float */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Float:</span>
              <button
                onClick={() => update({ float: 'left' })}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  params.float === 'left'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                Left
              </button>
              <button
                onClick={() => update({ float: 'right' })}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  params.float === 'right'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                Right
              </button>
            </div>
          </div>

          {/* Shape-specific controls */}
          {params.type === 'circle' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Circle
              </span>
              <Slider
                label="Radius"
                value={params.circleRadius}
                min={10}
                max={200}
                onChange={(v) => update({ circleRadius: v })}
              />
              <PercentSlider
                label="Center X"
                value={params.circlePosition.x}
                onChange={(v) => update({ circlePosition: { ...params.circlePosition, x: v } })}
              />
              <PercentSlider
                label="Center Y"
                value={params.circlePosition.y}
                onChange={(v) => update({ circlePosition: { ...params.circlePosition, y: v } })}
              />
            </div>
          )}

          {params.type === 'ellipse' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ellipse
              </span>
              <Slider
                label="Radius X"
                value={params.ellipseRx}
                min={10}
                max={200}
                onChange={(v) => update({ ellipseRx: v })}
              />
              <Slider
                label="Radius Y"
                value={params.ellipseRy}
                min={10}
                max={300}
                onChange={(v) => update({ ellipseRy: v })}
              />
              <PercentSlider
                label="Center X"
                value={params.ellipsePosition.x}
                onChange={(v) =>
                  update({ ellipsePosition: { ...params.ellipsePosition, x: v } })
                }
              />
              <PercentSlider
                label="Center Y"
                value={params.ellipsePosition.y}
                onChange={(v) =>
                  update({ ellipsePosition: { ...params.ellipsePosition, y: v } })
                }
              />
            </div>
          )}

          {params.type === 'polygon' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Polygon
              </span>
              <Slider
                label="Sides"
                value={params.polygonSides}
                min={3}
                max={12}
                onChange={(v) => update({ polygonSides: v })}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Fill Rule:</span>
                <button
                  onClick={() => update({ polygonFill: 'nonzero' })}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    params.polygonFill === 'nonzero'
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  Nonzero
                </button>
                <button
                  onClick={() => update({ polygonFill: 'evenodd' })}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    params.polygonFill === 'evenodd'
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  Evenodd
                </button>
              </div>
            </div>
          )}

          {params.type === 'inset' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Inset
              </span>
              <PercentSlider
                label="Top"
                value={params.insetTop}
                onChange={(v) => update({ insetTop: v })}
              />
              <PercentSlider
                label="Right"
                value={params.insetRight}
                onChange={(v) => update({ insetRight: v })}
              />
              <PercentSlider
                label="Bottom"
                value={params.insetBottom}
                onChange={(v) => update({ insetBottom: v })}
              />
              <PercentSlider
                label="Left"
                value={params.insetLeft}
                onChange={(v) => update({ insetLeft: v })}
              />
              <Slider
                label="Border Radius"
                value={params.insetRound}
                min={0}
                max={100}
                onChange={(v) => update({ insetRound: v })}
              />
            </div>
          )}

          {params.type === 'path' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                SVG Path Data
              </span>
              <textarea
                value={params.pathData}
                onChange={(e) => update({ pathData: e.target.value })}
                className="w-full h-24 px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                placeholder="M 50,0 C 80,0 ..."
              />
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter SVG path data. The path is scaled to fit the shape box (0-100 coordinate
                space).
              </p>
            </div>
          )}

          {params.type === 'url' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Image URL
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Use <code className="text-brand-400">shape-outside: url(&apos;image.png&apos;)</code>{' '}
                with an image that has an alpha channel. The alpha channel defines the shape. Paste
                an image URL or select a file to upload — preview shows the image.
              </p>
            </div>
          )}

          {/* Color picker */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Shape Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={params.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent p-0.5"
              />
              <input
                type="text"
                value={params.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* ── Preview + CSS Panel ────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800 border border-slate-700 w-fit">
            <button
              onClick={() => setSelectedTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedTab === 'preview'
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </button>
            <button
              onClick={() => setSelectedTab('css')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedTab === 'css'
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              CSS Output
            </button>
          </div>

          {selectedTab === 'preview' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50 min-h-[300px]">
              <div className="text-sm text-slate-200 leading-relaxed" style={{ textAlign: 'justify' }}>
                <div style={shapeStyle} />
                {SAMPLE_TEXT}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold">Current shape-outside:</span>
                  <code className="px-2 py-0.5 rounded bg-slate-800 text-brand-300 font-mono text-xs break-all">
                    {shapeOutsideValue}
                  </code>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'css' && (
            <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Generated CSS
                </span>
                <button
                  onClick={copyCSS}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-all border border-brand-500/30"
                >
                  <Copy className="w-3 h-3" />
                  Copy CSS
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 font-mono overflow-x-auto">
                <code>{cssOutput}</code>
              </pre>
            </div>
          )}

          {/* Quick info card */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              About shape-outside
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              <code className="text-brand-400">shape-outside</code> defines a shape around which
              adjacent inline content wraps. It only works on floated elements. Combined with{' '}
              <code className="text-brand-400">clip-path</code>, you can create complex text-wrapping
              effects — magazine-style layouts, creative pull quotes, and organic text flows. Browser
              support: all modern browsers (96%+).
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
