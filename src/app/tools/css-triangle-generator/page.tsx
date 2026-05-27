'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

type Direction = 'up' | 'down' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type Method = 'border' | 'clip-path';

interface Preset {
  label: string;
  direction: Direction;
  method: Method;
  w: number;
  h: number;
  color: string;
}

const PRESETS: Preset[] = [
  { label: 'Tooltip ▲', direction: 'up', method: 'border', w: 16, h: 12, color: '#334155' },
  { label: 'Dropdown ▼', direction: 'down', method: 'border', w: 16, h: 12, color: '#334155' },
  { label: 'Arrow ▶', direction: 'right', method: 'border', w: 16, h: 24, color: '#3b82f6' },
  { label: 'Back ◀', direction: 'left', method: 'border', w: 16, h: 24, color: '#3b82f6' },
  { label: 'Corner ◤', direction: 'top-left', method: 'border', w: 40, h: 40, color: '#ef4444' },
  { label: 'Ribbon ◥', direction: 'top-right', method: 'border', w: 60, h: 60, color: '#22c55e' },
  { label: 'Play ▶', direction: 'right', method: 'clip-path', w: 40, h: 40, color: '#a855f7' },
  { label: 'Warning ▲', direction: 'up', method: 'clip-path', w: 48, h: 48, color: '#f59e0b' },
];

const DIRECTIONS: { value: Direction; label: string; icon: string }[] = [
  { value: 'up', label: 'Up', icon: '▲' },
  { value: 'down', label: 'Down', icon: '▼' },
  { value: 'left', label: 'Left', icon: '◀' },
  { value: 'right', label: 'Right', icon: '▶' },
  { value: 'top-left', label: 'Top-Left', icon: '◤' },
  { value: 'top-right', label: 'Top-Right', icon: '◥' },
  { value: 'bottom-left', label: 'Bottom-Left', icon: '◣' },
  { value: 'bottom-right', label: 'Bottom-Right', icon: '◢' },
];

function borderTrickCSS(dir: Direction, w: number, h: number, color: string): string {
  const halfW = Math.round(w / 2);
  const halfH = Math.round(h / 2);
  const transparent = 'transparent';

  switch (dir) {
    case 'up':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-left: ${halfW}px solid ${transparent};\n  border-right: ${halfW}px solid ${transparent};\n  border-bottom: ${h}px solid ${color};\n}`;
    case 'down':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-left: ${halfW}px solid ${transparent};\n  border-right: ${halfW}px solid ${transparent};\n  border-top: ${h}px solid ${color};\n}`;
    case 'left':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-top: ${halfH}px solid ${transparent};\n  border-bottom: ${halfH}px solid ${transparent};\n  border-right: ${w}px solid ${color};\n}`;
    case 'right':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-top: ${halfH}px solid ${transparent};\n  border-bottom: ${halfH}px solid ${transparent};\n  border-left: ${w}px solid ${color};\n}`;
    case 'top-left':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-top: ${h}px solid ${color};\n  border-right: ${w}px solid ${transparent};\n}`;
    case 'top-right':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-top: ${h}px solid ${color};\n  border-left: ${w}px solid ${transparent};\n}`;
    case 'bottom-left':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-bottom: ${h}px solid ${color};\n  border-right: ${w}px solid ${transparent};\n}`;
    case 'bottom-right':
      return `.triangle {\n  width: 0;\n  height: 0;\n  border-bottom: ${h}px solid ${color};\n  border-left: ${w}px solid ${transparent};\n}`;
  }
}

function clipPathCSS(dir: Direction, w: number, h: number, color: string): string {
  let clipPath: string;
  switch (dir) {
    case 'up': clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'; break;
    case 'down': clipPath = 'polygon(0% 0%, 100% 0%, 50% 100%)'; break;
    case 'left': clipPath = 'polygon(100% 0%, 0% 50%, 100% 100%)'; break;
    case 'right': clipPath = 'polygon(0% 0%, 0% 100%, 100% 50%)'; break;
    case 'top-left': clipPath = 'polygon(0% 0%, 0% 100%, 100% 0%)'; break;
    case 'top-right': clipPath = 'polygon(100% 0%, 0% 0%, 100% 100%)'; break;
    case 'bottom-left': clipPath = 'polygon(0% 0%, 0% 100%, 100% 100%)'; break;
    case 'bottom-right': clipPath = 'polygon(100% 0%, 0% 100%, 100% 100%)'; break;
  }
  return `.triangle {\n  width: ${w}px;\n  height: ${h}px;\n  background: ${color};\n  clip-path: ${clipPath};\n}`;
}

function generateCSS(dir: Direction, w: number, h: number, color: string, method: Method): string {
  return method === 'border' ? borderTrickCSS(dir, w, h, color) : clipPathCSS(dir, w, h, color);
}

function getPreviewStyle(dir: Direction, w: number, h: number, color: string, method: Method): React.CSSProperties {
  const halfW = Math.round(w / 2);
  const halfH = Math.round(h / 2);

  if (method === 'border') {
    const base: React.CSSProperties = { width: 0, height: 0 };
    switch (dir) {
      case 'up': return { ...base, borderLeft: `${halfW}px solid transparent`, borderRight: `${halfW}px solid transparent`, borderBottom: `${h}px solid ${color}` };
      case 'down': return { ...base, borderLeft: `${halfW}px solid transparent`, borderRight: `${halfW}px solid transparent`, borderTop: `${h}px solid ${color}` };
      case 'left': return { ...base, borderTop: `${halfH}px solid transparent`, borderBottom: `${halfH}px solid transparent`, borderRight: `${w}px solid ${color}` };
      case 'right': return { ...base, borderTop: `${halfH}px solid transparent`, borderBottom: `${halfH}px solid transparent`, borderLeft: `${w}px solid ${color}` };
      case 'top-left': return { ...base, borderTop: `${h}px solid ${color}`, borderRight: `${w}px solid transparent` };
      case 'top-right': return { ...base, borderTop: `${h}px solid ${color}`, borderLeft: `${w}px solid transparent` };
      case 'bottom-left': return { ...base, borderBottom: `${h}px solid ${color}`, borderRight: `${w}px solid transparent` };
      case 'bottom-right': return { ...base, borderBottom: `${h}px solid ${color}`, borderLeft: `${w}px solid transparent` };
    }
  }

  const clips: Record<Direction, string> = {
    up: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    down: 'polygon(0% 0%, 100% 0%, 50% 100%)',
    left: 'polygon(100% 0%, 0% 50%, 100% 100%)',
    right: 'polygon(0% 0%, 0% 100%, 100% 50%)',
    'top-left': 'polygon(0% 0%, 0% 100%, 100% 0%)',
    'top-right': 'polygon(100% 0%, 0% 0%, 100% 100%)',
    'bottom-left': 'polygon(0% 0%, 0% 100%, 100% 100%)',
    'bottom-right': 'polygon(100% 0%, 0% 100%, 100% 100%)',
  };
  return { width: `${w}px`, height: `${h}px`, background: color, clipPath: clips[dir] };
}

export default function CssTriangleGeneratorPage() {
  const [direction, setDirection] = useState<Direction>('up');
  const [method, setMethod] = useState<Method>('border');
  const [width, setWidth] = useState(40);
  const [height, setHeight] = useState(40);
  const [color, setColor] = useState('#3b82f6');

  const cssOutput = useMemo(() => generateCSS(direction, width, height, color, method), [direction, width, height, color, method]);
  const previewStyle = useMemo(() => getPreviewStyle(direction, width, height, color, method), [direction, width, height, color, method]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [cssOutput]);

  const reset = useCallback(() => {
    setDirection('up');
    setMethod('border');
    setWidth(40);
    setHeight(40);
    setColor('#3b82f6');
  }, []);

  const applyPreset = useCallback((p: Preset) => {
    setDirection(p.direction);
    setMethod(p.method);
    setWidth(p.w);
    setHeight(p.h);
    setColor(p.color);
  }, []);

  return (
    <ToolLayout
      title="CSS Triangle Generator"
      description="Generate pure-CSS directional triangles using the border trick or clip-path — live preview, copy-ready code."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Direction */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Direction</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDirection(d.value)}
                  className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                    direction === d.value
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                      : 'bg-surface-lighter text-slate-400 hover:bg-slate-600 border border-slate-600/50'
                  }`}
                  title={d.label}
                >
                  <span className="text-lg block">{d.icon}</span>
                  <span className="block mt-0.5">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Method */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Method</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMethod('border')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  method === 'border' ? 'bg-brand-500 text-white' : 'bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50'
                }`}
              >
                Border Trick
              </button>
              <button
                onClick={() => setMethod('clip-path')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  method === 'clip-path' ? 'bg-brand-500 text-white' : 'bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50'
                }`}
              >
                Clip-Path
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {method === 'border'
                ? 'Zero-size element with colored + transparent borders. Works everywhere, back to IE6.'
                : 'Modern approach using clip-path polygon(). Cleaner CSS, requires modern browser.'}
            </p>
          </div>

          {/* Size */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Size</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Width</label>
                  <span className="text-xs text-brand-400 font-mono">{width}px</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={300}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Height</label>
                  <span className="text-xs text-brand-400 font-mono">{height}px</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={300}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Color</h3>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input-field flex-1 font-mono text-sm"
                placeholder="#3b82f6"
              />
            </div>
            {/* Quick color swatches */}
            <div className="flex gap-1.5 mt-3">
              {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#334155'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded border-2 transition-all hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent' }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Presets */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Presets</h3>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 transition-all hover:text-white"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 transition-colors bg-surface-lighter border border-slate-600/50 hover:border-red-500/30"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        </div>

        {/* Preview + Code */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Live Preview</h3>
            <div
              className="bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_25%_50%)] bg-[length:20px_20px] rounded-lg border border-slate-700/50 min-h-[280px] flex items-center justify-center relative overflow-hidden"
            >
              {/* Grid pattern label */}
              <span className="absolute top-3 left-3 text-[10px] text-slate-600 font-mono uppercase tracking-wider">Checkerboard bg</span>
              <div
                style={previewStyle}
                className="transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span>{method === 'border' ? 'Border trick' : 'Clip-path'} · {width}×{height}px · {color}</span>
              <span className="text-slate-600">{DIRECTIONS.find(d => d.value === direction)?.label}</span>
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Generated CSS</h3>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
            <pre className="bg-[#0d1117] rounded-lg p-4 border border-slate-700/50 text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
              {cssOutput}
            </pre>
          </div>

          {/* Explanation */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">How it works</h3>
            {method === 'border' ? (
              <div className="text-slate-400 text-sm space-y-2">
                <p>
                  The <strong className="text-slate-300">border trick</strong> exploits how CSS renders borders at corners.
                  When an element has zero width and height, its borders meet at a point — making four triangles.
                  By making three borders transparent and one colored, you isolate a single triangle pointing in any direction.
                </p>
                <p>
                  <strong className="text-slate-300">Corner triangles</strong> (top-left, top-right, etc.) use only two borders — one colored, one transparent — creating right-angle triangles perfect for ribbons, stickers, and decorative corners.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Browser support: IE6+ · Perfect for tooltips, dropdown arrows, chat bubbles, and navigation indicators.
                </p>
              </div>
            ) : (
              <div className="text-slate-400 text-sm space-y-2">
                <p>
                  The <strong className="text-slate-300">clip-path method</strong> uses the CSS <code className="text-brand-400">clip-path: polygon()</code> property to mask a colored rectangle into a triangle shape.
                  It&apos;s cleaner — only one CSS property — and works great with backgrounds, gradients, and images inside.
                </p>
                <p>
                  For the <strong className="text-slate-300">border trick</strong>, you can&apos;t have gradients or shadows on the triangle itself. Clip-path handles those naturally and also supports box-shadow, making it the better choice for modern projects.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Browser support: Chrome 24+, Firefox 3.5+, Safari 7+, Edge 12+ · Use border trick if you need IE support.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
