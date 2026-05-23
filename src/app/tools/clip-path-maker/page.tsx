'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

type ShapeType =
  | 'circle'
  | 'ellipse'
  | 'inset'
  | 'polygon-triangle'
  | 'polygon-pentagon'
  | 'polygon-hexagon'
  | 'polygon-octagon'
  | 'polygon-star'
  | 'polygon-arrow'
  | 'polygon-check'
  | 'polygon-parallelogram'
  | 'polygon-rhombus'
  | 'polygon-trapezoid'
  | 'polygon-custom';

interface ShapeDef {
  label: string;
  icon: string;
  category: 'basic' | 'polygon';
}

const SHAPES: Record<ShapeType, ShapeDef> = {
  circle: { label: 'Circle', icon: '⬤', category: 'basic' },
  ellipse: { label: 'Ellipse', icon: '⬬', category: 'basic' },
  inset: { label: 'Inset', icon: '▣', category: 'basic' },
  'polygon-triangle': { label: 'Triangle', icon: '▲', category: 'polygon' },
  'polygon-pentagon': { label: 'Pentagon', icon: '⬠', category: 'polygon' },
  'polygon-hexagon': { label: 'Hexagon', icon: '⬡', category: 'polygon' },
  'polygon-octagon': { label: 'Octagon', icon: '⯃', category: 'polygon' },
  'polygon-star': { label: 'Star', icon: '★', category: 'polygon' },
  'polygon-arrow': { label: 'Arrow', icon: '➤', category: 'polygon' },
  'polygon-check': { label: 'Check Mark', icon: '✓', category: 'polygon' },
  'polygon-parallelogram': { label: 'Parallelogram', icon: '▱', category: 'polygon' },
  'polygon-rhombus': { label: 'Rhombus', icon: '◇', category: 'polygon' },
  'polygon-trapezoid': { label: 'Trapezoid', icon: '⏢', category: 'polygon' },
  'polygon-custom': { label: 'Custom Polygon', icon: '✂', category: 'polygon' },
};

// --- Polygon point generators (percentage-based) ---

function circle(): string {
  return 'circle(50% at 50% 50%)';
}

function ellipse(): string {
  return 'ellipse(50% 50% at 50% 50%)';
}

function inset(r: number): string {
  return `inset(${10 + r * 30}% round ${r * 10}px)`;
}

function polygonTriangle(): string {
  return 'polygon(50% 0%, 0% 100%, 100% 100%)';
}

function polygonPentagon(): string {
  return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
}

function polygonHexagon(): string {
  return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
}

function polygonOctagon(): string {
  return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
}

function polygonStar(points: number = 5, innerR: number = 40): string {
  const coords: string[] = [];
  const outerR = 50;
  const cx = 50;
  const cy = 50;
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    coords.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }
  return `polygon(${coords.join(', ')})`;
}

function polygonArrow(): string {
  return 'polygon(40% 0%, 60% 0%, 100% 50%, 60% 100%, 40% 100%, 0% 50%)';
}

function polygonCheck(): string {
  return 'polygon(85% 20%, 95% 30%, 45% 80%, 10% 50%, 20% 40%, 45% 65%)';
}

function polygonParallelogram(skew: number): string {
  return `polygon(${skew}% 0%, 100% 0%, ${100 - skew}% 100%, 0% 100%)`;
}

function polygonRhombus(): string {
  return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
}

function polygonTrapezoid(ratio: number): string {
  return `polygon(${ratio}% 0%, ${100 - ratio}% 0%, 100% 100%, 0% 100%)`;
}

function generateShape(type: ShapeType, params: Record<string, number>): string {
  switch (type) {
    case 'circle':
      return circle();
    case 'ellipse':
      return ellipse();
    case 'inset':
      return inset(params.inset ?? 3);
    case 'polygon-triangle':
      return polygonTriangle();
    case 'polygon-pentagon':
      return polygonPentagon();
    case 'polygon-hexagon':
      return polygonHexagon();
    case 'polygon-octagon':
      return polygonOctagon();
    case 'polygon-star':
      return polygonStar(params.points ?? 5, params.innerRadius ?? 40);
    case 'polygon-arrow':
      return polygonArrow();
    case 'polygon-check':
      return polygonCheck();
    case 'polygon-parallelogram':
      return polygonParallelogram(params.skew ?? 20);
    case 'polygon-rhombus':
      return polygonRhombus();
    case 'polygon-trapezoid':
      return polygonTrapezoid(params.ratio ?? 15);
    case 'polygon-custom':
      return params.customPolygon
        ? `polygon(${(params as any).customPolygon as string})`
        : 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    default:
      return circle();
  }
}

function shapeHasParams(type: ShapeType): string[] {
  switch (type) {
    case 'inset':
      return ['inset'];
    case 'polygon-star':
      return ['points', 'innerRadius'];
    case 'polygon-parallelogram':
      return ['skew'];
    case 'polygon-trapezoid':
      return ['ratio'];
    case 'polygon-custom':
      return ['customPolygon'];
    default:
      return [];
  }
}

const DEFAULT_PARAMS: Record<string, number> = {
  inset: 3,
  points: 5,
  innerRadius: 40,
  skew: 20,
  ratio: 15,
};

export default function ClipPathMakerPage() {
  const [shapeType, setShapeType] = useState<ShapeType>('polygon-hexagon');
  const [params, setParams] = useState<Record<string, number>>({ ...DEFAULT_PARAMS });
  const [customPoints, setCustomPoints] = useState('50% 0%, 100% 50%, 50% 100%, 0% 50%');
  const [imageUrl, setImageUrl] = useState('');
  const [useImage, setUseImage] = useState(false);

  const clipPath = useMemo(() => {
    if (shapeType === 'polygon-custom') {
      return `polygon(${customPoints})`;
    }
    return generateShape(shapeType, params);
  }, [shapeType, params, customPoints]);

  const updateParam = useCallback((key: string, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCopy = useCallback(() => {
    const css = `.clipped {\n  clip-path: ${clipPath};\n}\n`;
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Copy failed')
    );
  }, [clipPath]);

  const handleReset = useCallback(() => {
    setShapeType('polygon-hexagon');
    setParams({ ...DEFAULT_PARAMS });
    setCustomPoints('50% 0%, 100% 50%, 50% 100%, 0% 50%');
    setUseImage(false);
    setImageUrl('');
  }, []);

  const paramNames = shapeHasParams(shapeType);

  // Background for the demo area
  const demoBackground = useImage && imageUrl
    ? `url(${imageUrl}) center/cover no-repeat`
    : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 30%, #06b6d4 60%, #a855f7 100%)';

  return (
    <ToolLayout
      title="CSS Clip-Path Maker"
      description="Visually build CSS clip-path shapes — 14 presets, parameter sliders, custom polygon editor, and live preview. Copy instantly, zero dependencies."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleCopy} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Shape Picker + Parameters */}
        <div className="space-y-5">
          {/* Shape Picker */}
          <div className="card">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              Shape
            </h3>
            <div className="space-y-3">
              {/* Basic shapes */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5 font-medium">Basic</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(SHAPES)
                    .filter(([, v]) => v.category === 'basic')
                    .map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setShapeType(key as ShapeType)}
                        className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          shapeType === key
                            ? 'border-brand-500/50 bg-brand-500/10 text-white'
                            : 'border-slate-700/50 bg-surface hover:border-slate-600 text-slate-400'
                        }`}
                      >
                        <span className="mr-1">{val.icon}</span>
                        {val.label}
                      </button>
                    ))}
                </div>
              </div>
              {/* Polygon shapes */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5 font-medium">Polygons</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(SHAPES)
                    .filter(([, v]) => v.category === 'polygon')
                    .map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setShapeType(key as ShapeType)}
                        className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          shapeType === key
                            ? 'border-brand-500/50 bg-brand-500/10 text-white'
                            : 'border-slate-700/50 bg-surface hover:border-slate-600 text-slate-400'
                        }`}
                      >
                        <span className="mr-1">{val.icon}</span>
                        {val.label}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Parameters */}
          {paramNames.length > 0 && (
            <div className="card">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                Parameters
              </h3>
              <div className="space-y-3">
                {paramNames.includes('inset') && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Inset: <span className="text-brand-400 font-mono">{params.inset != null ? 10 + params.inset * 30 : 100}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={params.inset ?? 3}
                      onChange={(e) => updateParam('inset', parseFloat(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                )}
                {paramNames.includes('points') && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Points: <span className="text-brand-400 font-mono">{params.points ?? 5}</span>
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={12}
                      step={1}
                      value={params.points ?? 5}
                      onChange={(e) => updateParam('points', parseInt(e.target.value, 10))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                )}
                {paramNames.includes('innerRadius') && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Inner Radius: <span className="text-brand-400 font-mono">{params.innerRadius ?? 40}%</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={45}
                      step={1}
                      value={params.innerRadius ?? 40}
                      onChange={(e) => updateParam('innerRadius', parseInt(e.target.value, 10))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                )}
                {paramNames.includes('skew') && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Skew: <span className="text-brand-400 font-mono">{params.skew ?? 20}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={45}
                      step={1}
                      value={params.skew ?? 20}
                      onChange={(e) => updateParam('skew', parseInt(e.target.value, 10))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                )}
                {paramNames.includes('ratio') && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Top Ratio: <span className="text-brand-400 font-mono">{params.ratio ?? 15}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={params.ratio ?? 15}
                      onChange={(e) => updateParam('ratio', parseInt(e.target.value, 10))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                )}
                {paramNames.includes('customPolygon') && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Polygon Points (%)
                    </label>
                    <input
                      type="text"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(e.target.value)}
                      placeholder="50% 0%, 100% 50%, 50% 100%, 0% 50%"
                      className="input-field w-full text-xs py-1.5"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Format: &quot;x% y%, x% y%, ...&quot; (comma-separated pairs)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image toggle */}
          <div className="card">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              Preview Settings
            </h3>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={useImage}
                onChange={(e) => setUseImage(e.target.checked)}
                className="rounded bg-surface border-slate-600 accent-brand-500"
              />
              <span className="text-xs text-slate-300">Clip an image instead of gradient</span>
            </label>
            {useImage && (
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input-field w-full text-xs py-1.5"
              />
            )}
          </div>
        </div>

        {/* Center/Right: Preview + CSS Output */}
        <div className="lg:col-span-2 space-y-5">
          {/* Live preview */}
          <div className="card">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
              Live Preview
            </h3>
            <div className="flex items-center justify-center min-h-[320px] bg-surface rounded-lg border border-slate-700/50 p-4">
              <div
                style={{
                  width: '280px',
                  height: '280px',
                  background: demoBackground,
                  clipPath: clipPath,
                  transition: 'clip-path 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                Generated CSS
              </h3>
              <button
                onClick={handleCopy}
                className="text-slate-500 hover:text-brand-400 transition-colors"
                title="Copy CSS"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <code className="block bg-surface rounded-lg px-3 py-2.5 font-mono text-xs text-green-400 border border-slate-700/50 leading-relaxed whitespace-pre-wrap break-all">
              {`.clipped {\n  clip-path: ${clipPath};\n}`}
            </code>
          </div>

          {/* Shape info */}
          <div className="card">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              How to Use clip-path
            </h3>
            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                <strong className="text-slate-300">clip-path</strong> clips an element to a specific shape. Everything
                outside the shape becomes invisible, but the element still occupies its original space in the layout.
              </p>
              <p>
                <span className="text-brand-400">Percentage values</span> are relative to the element&apos;s own
                bounding box — great for responsive designs. Combine with{' '}
                <code className="text-yellow-400">transition</code> to animate between shapes!
              </p>
              <p>
                <span className="text-amber-400">Browser support:</span> All modern browsers.{' '}
                <code className="text-yellow-400">clip-path</code> works in Chrome, Firefox, Safari, and Edge.
                Add <code className="text-purple-400">-webkit-clip-path</code> for older Safari.
              </p>
            </div>
          </div>

          {/* Quick tips */}
          <div className="mt-4 p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-white font-medium text-sm mb-2">Pro Tips</h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Animate clip-path with <code className="text-brand-400">transition: clip-path 0.4s ease</code></li>
              <li>Use custom polygons to create unique image masks</li>
              <li>Combine with <code className="text-brand-400">shape-outside</code> for text wrapping</li>
              <li>Try the gradient preview to see how clip-path affects backgrounds</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
