'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ShapeType = 'circle' | 'ellipse' | 'inset' | 'polygon-triangle' | 'polygon-diamond' | 'polygon-pentagon' | 'polygon-hexagon' | 'polygon-star' | 'polygon-cross' | 'polygon-arrow' | 'polygon-parallelogram' | 'polygon-message' | 'polygon-chevron' | 'polygon-trapezoid';

interface ShapePreset {
  name: string;
  type: ShapeType;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: ShapePreset[] = [
  { name: 'Circle', type: 'circle' },
  { name: 'Ellipse', type: 'ellipse' },
  { name: 'Inset (Rounded)', type: 'inset' },
  { name: 'Triangle', type: 'polygon-triangle' },
  { name: 'Diamond', type: 'polygon-diamond' },
  { name: 'Pentagon', type: 'polygon-pentagon' },
  { name: 'Hexagon', type: 'polygon-hexagon' },
  { name: 'Star', type: 'polygon-star' },
  { name: 'Cross', type: 'polygon-cross' },
  { name: 'Arrow', type: 'polygon-arrow' },
  { name: 'Parallelogram', type: 'polygon-parallelogram' },
  { name: 'Message', type: 'polygon-message' },
  { name: 'Chevron', type: 'polygon-chevron' },
  { name: 'Trapezoid', type: 'polygon-trapezoid' },
];

// ── Build CSS ───────────────────────────────────────────────────────────────

function buildClipPath(type: ShapeType, params: Record<string, number>): string {
  switch (type) {
    case 'circle':
      return `clip-path: circle(${params.circleRadius}% at ${params.circleCenterX}% ${params.circleCenterY}%);`;
    case 'ellipse':
      return `clip-path: ellipse(${params.ellipseRx}% ${params.ellipseRy}% at ${params.ellipseCx}% ${params.ellipseCy}%);`;
    case 'inset':
      return `clip-path: inset(${params.insetTop}% ${params.insetRight}% ${params.insetBottom}% ${params.insetLeft}% round ${params.insetRound}%);`;
    case 'polygon-triangle':
      return `clip-path: polygon(50% 0%, 0% 100%, 100% 100%);`;
    case 'polygon-diamond':
      return `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);`;
    case 'polygon-pentagon':
      return `clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);`;
    case 'polygon-hexagon':
      return `clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);`;
    case 'polygon-star': {
      const s = params.starSpikiness || 50;
      return `clip-path: polygon(50% 0%, ${61 + s * 0.14}% ${35 - s * 0.1}%, 100% ${38 - s * 0.1}%, ${67 + s * 0.13}% ${59 - s * 0.1}%, ${82 + s * 0.18}% 100%, 50% ${75 + s * 0.05}%, ${18 - s * 0.18}% 100%, ${33 - s * 0.13}% ${59 - s * 0.1}%, 0% ${38 - s * 0.1}%, ${39 - s * 0.14}% ${35 - s * 0.1}%);`;
    }
    case 'polygon-cross': {
      const t = params.crossThickness || 25;
      const g = 50 - t / 2;
      return `clip-path: polygon(${g}% 0%, ${g + t}% 0%, ${g + t}% ${g}%, 100% ${g}%, 100% ${g + t}%, ${g + t}% ${g + t}%, ${g + t}% 100%, ${g}% 100%, ${g}% ${g + t}%, 0% ${g + t}%, 0% ${g}%, ${g}% ${g}%);`;
    }
    case 'polygon-arrow': {
      const a = params.arrowWidth || 30;
      return `clip-path: polygon(${a}% 0%, 100% 0%, 100% 30%, ${a}% 30%, 0% 50%, ${a}% 70%, 100% 70%, 100% 100%, ${a}% 100%, ${a}% 70%, 0% 50%, ${a}% 30%);`;
    }
    case 'polygon-parallelogram': {
      const s = params.paraSkew || 15;
      return `clip-path: polygon(${s}% 0%, 100% 0%, ${100 - s}% 100%, 0% 100%);`;
    }
    case 'polygon-message':
      return `clip-path: polygon(0% 0%, 100% 0%, 100% 75%, 60% 75%, 50% 100%, 40% 75%, 0% 75%);`;
    case 'polygon-chevron': {
      const w = params.chevronWidth || 20;
      return `clip-path: polygon(${w}% 0%, 100% 0%, 100% 100%, ${w}% 100%, 0% 50%);`;
    }
    case 'polygon-trapezoid': {
      const s = params.trapSlope || 20;
      return `clip-path: polygon(${s}% 0%, ${100 - s}% 0%, 100% 100%, 0% 100%);`;
    }
    default:
      return 'clip-path: none;';
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  min = 0,
  max = 100,
  unit = '%',
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-300 font-mono tabular-nums w-14 text-right">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

// ── Polygon point editor ───────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
  id: number;
  locked?: boolean;
}

function PointEditor({
  points,
  onPointChange,
  width = 300,
  height = 300,
}: {
  points: Point[];
  onPointChange: (id: number, x: number, y: number) => void;
  width?: number;
  height?: number;
}) {
  const handleMouseDown = useCallback(
    (id: number) => (e: React.MouseEvent<SVGElement>) => {
      e.preventDefault();
      const svg = e.currentTarget.closest('svg')!;
      const pt = svg.createSVGPoint();

      const onMove = (ev: MouseEvent) => {
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        const cpt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
        const x = Math.round(Math.max(0, Math.min(100, (cpt.x / width) * 100)));
        const y = Math.round(Math.max(0, Math.min(100, (cpt.y / height) * 100)));
        onPointChange(id, x, y);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [onPointChange, width, height]
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full absolute inset-0"
    >
      {/* Grid */}
      <defs>
        <pattern id="pgrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#pgrid)" />

      {/* Polygon fill preview */}
      <polygon
        points={points.map((p) => `${(p.x / 100) * width},${(p.y / 100) * height}`).join(' ')}
        fill="rgba(99, 102, 241, 0.15)"
        stroke="rgba(99, 102, 241, 0.4)"
        strokeWidth="1.5"
      />

      {/* Lines between points */}
      {points.map((p, i) => {
        const next = points[(i + 1) % points.length];
        return (
          <line
            key={`line-${i}`}
            x1={(p.x / 100) * width}
            y1={(p.y / 100) * height}
            x2={(next.x / 100) * width}
            y2={(next.y / 100) * height}
            stroke="rgba(99, 102, 241, 0.3)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Handle points */}
      {points.map((p) => (
        <g key={p.id}>
          <circle
            cx={(p.x / 100) * width}
            cy={(p.y / 100) * height}
            r="7"
            fill="rgba(99, 102, 241, 0.3)"
            stroke="#818cf8"
            strokeWidth="2"
            className="cursor-grab hover:fill-brand-500/50 transition-colors"
            onMouseDown={handleMouseDown(p.id)}
          />
          <text
            x={(p.x / 100) * width}
            y={(p.y / 100) * height - 12}
            textAnchor="middle"
            fill="#a5b4fc"
            fontSize="10"
            fontFamily="monospace"
            pointerEvents="none"
          >
            {p.x}%,{p.y}%
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Freeform polygon points builder ───────────────────────────────────────

function polygonPointsToCSS(points: { x: number; y: number }[]): string {
  const pts = points.map((p) => `${p.x}% ${p.y}%`).join(', ');
  return `clip-path: polygon(${pts});`;
}

// ── Default params per type ────────────────────────────────────────────────

const DEFAULTS: Record<ShapeType, Record<string, number>> = {
  'circle': { circleRadius: 50, circleCenterX: 50, circleCenterY: 50 },
  'ellipse': { ellipseRx: 40, ellipseRy: 50, ellipseCx: 50, ellipseCy: 50 },
  'inset': { insetTop: 15, insetRight: 15, insetBottom: 15, insetLeft: 15, insetRound: 10 },
  'polygon-triangle': {},
  'polygon-diamond': {},
  'polygon-pentagon': {},
  'polygon-hexagon': {},
  'polygon-star': { starSpikiness: 50 },
  'polygon-cross': { crossThickness: 25 },
  'polygon-arrow': { arrowWidth: 30 },
  'polygon-parallelogram': { paraSkew: 15 },
  'polygon-message': {},
  'polygon-chevron': { chevronWidth: 20 },
  'polygon-trapezoid': { trapSlope: 20 },
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function ClipPathGeneratorPage() {
  const [shapeType, setShapeType] = useState<ShapeType>('circle');
  const [params, setParams] = useState<Record<string, number>>({ ...DEFAULTS.circle });
  const [bgMode, setBgMode] = useState<'gradient' | 'image' | 'checker'>('gradient');

  const clipCSS = useMemo(() => buildClipPath(shapeType, params), [shapeType, params]);

  const setParam = useCallback((key: string, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((type: ShapeType) => {
    setShapeType(type);
    setParams({ ...DEFAULTS[type] });
  }, []);

  const resetAll = useCallback(() => {
    setShapeType('circle');
    setParams({ ...DEFAULTS.circle });
    setBgMode('gradient');
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(clipCSS).then(
      () => toast.success('Clip-path CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [clipCSS]);

  // Build background
  const bgStyle: React.CSSProperties = useMemo(() => {
    switch (bgMode) {
      case 'gradient':
        return {
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 30%, #ec4899 70%, #f59e0b 100%)',
        };
      case 'image':
        return {
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%236366f1\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '60px 60px',
          backgroundColor: '#1e293b',
        };
      case 'checker':
        return {
          backgroundImage: `
            linear-gradient(45deg, #334155 25%, transparent 25%),
            linear-gradient(-45deg, #334155 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #334155 75%),
            linear-gradient(-45deg, transparent 75%, #334155 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          backgroundColor: '#1e293b',
        };
    }
  }, [bgMode]);

  // Render controls based on shape type
  const renderControls = () => {
    switch (shapeType) {
      case 'circle':
        return (
          <div className="space-y-3">
            <SliderControl label="Radius" value={params.circleRadius} max={80} onChange={(v) => setParam('circleRadius', v)} />
            <SliderControl label="Center X" value={params.circleCenterX} onChange={(v) => setParam('circleCenterX', v)} />
            <SliderControl label="Center Y" value={params.circleCenterY} onChange={(v) => setParam('circleCenterY', v)} />
          </div>
        );
      case 'ellipse':
        return (
          <div className="space-y-3">
            <SliderControl label="Radius X" value={params.ellipseRx} max={80} onChange={(v) => setParam('ellipseRx', v)} />
            <SliderControl label="Radius Y" value={params.ellipseRy} max={80} onChange={(v) => setParam('ellipseRy', v)} />
            <SliderControl label="Center X" value={params.ellipseCx} onChange={(v) => setParam('ellipseCx', v)} />
            <SliderControl label="Center Y" value={params.ellipseCy} onChange={(v) => setParam('ellipseCy', v)} />
          </div>
        );
      case 'inset':
        return (
          <div className="space-y-3">
            <SliderControl label="Top" value={params.insetTop} max={50} onChange={(v) => setParam('insetTop', v)} />
            <SliderControl label="Right" value={params.insetRight} max={50} onChange={(v) => setParam('insetRight', v)} />
            <SliderControl label="Bottom" value={params.insetBottom} max={50} onChange={(v) => setParam('insetBottom', v)} />
            <SliderControl label="Left" value={params.insetLeft} max={50} onChange={(v) => setParam('insetLeft', v)} />
            <SliderControl label="Round" value={params.insetRound} max={50} onChange={(v) => setParam('insetRound', v)} />
          </div>
        );
      case 'polygon-star':
        return (
          <div className="space-y-3">
            <SliderControl label="Spikiness" value={params.starSpikiness} max={100} onChange={(v) => setParam('starSpikiness', v)} />
          </div>
        );
      case 'polygon-cross':
        return (
          <div className="space-y-3">
            <SliderControl label="Thickness" value={params.crossThickness} min={5} max={45} onChange={(v) => setParam('crossThickness', v)} />
          </div>
        );
      case 'polygon-arrow':
        return (
          <div className="space-y-3">
            <SliderControl label="Tail Width" value={params.arrowWidth} min={10} max={50} onChange={(v) => setParam('arrowWidth', v)} />
          </div>
        );
      case 'polygon-parallelogram':
        return (
          <div className="space-y-3">
            <SliderControl label="Skew" value={params.paraSkew} min={0} max={45} onChange={(v) => setParam('paraSkew', v)} />
          </div>
        );
      case 'polygon-chevron':
        return (
          <div className="space-y-3">
            <SliderControl label="Width" value={params.chevronWidth} min={5} max={45} onChange={(v) => setParam('chevronWidth', v)} />
          </div>
        );
      case 'polygon-trapezoid':
        return (
          <div className="space-y-3">
            <SliderControl label="Slope" value={params.trapSlope} min={0} max={45} onChange={(v) => setParam('trapSlope', v)} />
          </div>
        );
      default:
        return (
          <p className="text-xs text-slate-500 italic">This shape uses fixed coordinates. Switch to a parametric shape for controls.</p>
        );
    }
  };

  return (
    <ToolLayout
      title="CSS Clip-Path Generator"
      description="Visually craft clip-paths for stunning shapes — circles, polygons, stars, arrows and more. Live preview on gradient/image/checker backgrounds, instant CSS copy, 100% client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Shape Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Shape</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => applyPreset(preset.type)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all flex items-center gap-2 ${
                    shapeType === preset.type
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                      : 'bg-surface border-slate-600/40 text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3 h-3 shrink-0" />
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Parameter Controls */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Parameters</h2>
            {renderControls()}
          </div>

          {/* Background Mode */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Background</h2>
            <div className="flex gap-2">
              {(['gradient', 'image', 'checker'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBgMode(mode)}
                  className={`px-3 py-1.5 text-xs rounded-md capitalize transition-all ${
                    bgMode === mode
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
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
            <h2 className="text-white font-semibold text-sm mb-4">Live Preview</h2>
            <div className="flex items-center justify-center py-8 min-h-[340px] rounded-lg relative bg-[#0f172a]">
              {/* Show the clipping shape */}
              <div className="relative">
                {/* Original (non-clipped) outline */}
                <div
                  className="absolute inset-0 border border-slate-600/30 rounded"
                  style={{ width: 280, height: 280 }}
                />
                {/* Clipped element */}
                <div
                  className="transition-all duration-150"
                  style={{
                    width: 280,
                    height: 280,
                    ...bgStyle,
                    clipPath: clipCSS.replace('clip-path: ', '').replace(';', ''),
                    boxShadow: '0 0 0 3px rgba(99,102,241,0.5)',
                  }}
                />
              </div>
              {/* Shape label */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
                  {PRESETS.find((p) => p.type === shapeType)?.name}
                </span>
              </div>
            </div>
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
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap break-all">
              {clipCSS}
            </pre>
          </div>

          {/* Usage example */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Usage</h2>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto">
              <code>{`.my-element {'\n'}  ${clipCSS.split(': ')[1].replace(';', ';\n}')}`}</code>
            </pre>
            <p className="text-xs text-slate-500 mt-2">
              Apply <code className="bg-slate-800 px-1 rounded">clip-path</code> to any element to clip it to a shape. Works on images, divs, and any HTML element.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
