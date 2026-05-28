'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Image, Sliders, Grid3X3, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type RepeatMode = 'stretch' | 'repeat' | 'round' | 'space';
type PatternType = 'linear' | 'repeating-linear' | 'radial' | 'conic' | 'repeating-conic' | 'linear-cross';

interface Preset {
  name: string;
  description: string;
  pattern: PatternType;
  color1: string;
  color2: string;
  color3: string;
  angle: number;
  slice: number;
  width: number;
  outset: number;
  repeat: RepeatMode;
  fill: boolean;
}

interface GridCell {
  region: string;
  pos: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const REPEAT_MODES: { value: RepeatMode; label: string; description: string }[] = [
  { value: 'stretch', label: 'Stretch', description: 'Stretches image to fill the region (default)' },
  { value: 'repeat', label: 'Repeat', description: 'Tiles image, may clip at edges' },
  { value: 'round', label: 'Round', description: 'Tiles and scales so whole tiles fit' },
  { value: 'space', label: 'Space', description: 'Tiles with even spacing, no clipping' },
];

const PATTERNS: { value: PatternType; label: string; icon: string }[] = [
  { value: 'linear', label: 'Linear Gradient', icon: '↗' },
  { value: 'repeating-linear', label: 'Repeating Stripes', icon: '≡' },
  { value: 'radial', label: 'Radial Gradient', icon: '◎' },
  { value: 'conic', label: 'Conic Gradient', icon: '◈' },
  { value: 'repeating-conic', label: 'Sawtooth', icon: '✧' },
  { value: 'linear-cross', label: 'Cross Gradient', icon: '⊞' },
];

const PRESETS: Preset[] = [
  {
    name: 'Gold Frame',
    description: 'Elegant diagonal gold gradient frame',
    pattern: 'linear',
    color1: '#fbbf24',
    color2: '#d97706',
    color3: '#92400e',
    angle: 45,
    slice: 30,
    width: 12,
    outset: 0,
    repeat: 'stretch',
    fill: false,
  },
  {
    name: 'Neon Stripe',
    description: 'Bold repeating neon stripes',
    pattern: 'repeating-linear',
    color1: '#06b6d4',
    color2: '#ec4899',
    color3: '#8b5cf6',
    angle: 45,
    slice: 20,
    width: 10,
    outset: 0,
    repeat: 'round',
    fill: false,
  },
  {
    name: 'Vignette',
    description: 'Soft radial vignette that darkens edges',
    pattern: 'radial',
    color1: '#6366f1',
    color2: '#312e81',
    color3: '#1e1b4b',
    angle: 0,
    slice: 35,
    width: 20,
    outset: 0,
    repeat: 'stretch',
    fill: false,
  },
  {
    name: 'Conic Corners',
    description: 'Checkerboard conic pattern at corners',
    pattern: 'conic',
    color1: '#f97316',
    color2: '#3b82f6',
    color3: '#ffffff',
    angle: 0,
    slice: 25,
    width: 15,
    outset: 0,
    repeat: 'round',
    fill: false,
  },
  {
    name: 'Retro Sawtooth',
    description: 'Sawtooth zigzag border — 80s vibes',
    pattern: 'repeating-conic',
    color1: '#ec4899',
    color2: '#fbbf24',
    color3: '#ec4899',
    angle: 0,
    slice: 15,
    width: 14,
    outset: 3,
    repeat: 'repeat',
    fill: true,
  },
  {
    name: 'Crosshatch',
    description: 'Crisscross gradient frame with filled center',
    pattern: 'linear-cross',
    color1: '#10b981',
    color2: '#059669',
    color3: '#064e3b',
    angle: 30,
    slice: 25,
    width: 12,
    outset: 0,
    repeat: 'round',
    fill: false,
  },
  {
    name: 'Tech Frame',
    description: 'Sharp angled tech border',
    pattern: 'linear',
    color1: '#22d3ee',
    color2: '#2563eb',
    color3: '#1e3a5f',
    angle: 135,
    slice: 22,
    width: 8,
    outset: 0,
    repeat: 'stretch',
    fill: false,
  },
  {
    name: 'Sunset Border',
    description: 'Warm sunset gradient repeating tiles',
    pattern: 'repeating-linear',
    color1: '#f97316',
    color2: '#eab308',
    color3: '#dc2626',
    angle: 90,
    slice: 18,
    width: 16,
    outset: 2,
    repeat: 'round',
    fill: true,
  },
];

const GRID_CELLS: GridCell[] = [
  { region: 'top-left', pos: 'row-start-1 col-start-1' },
  { region: 'top', pos: 'row-start-1 col-start-2' },
  { region: 'top-right', pos: 'row-start-1 col-start-3' },
  { region: 'left', pos: 'row-start-2 col-start-1' },
  { region: 'center', pos: 'row-start-2 col-start-2' },
  { region: 'right', pos: 'row-start-2 col-start-3' },
  { region: 'bottom-left', pos: 'row-start-3 col-start-1' },
  { region: 'bottom', pos: 'row-start-3 col-start-2' },
  { region: 'bottom-right', pos: 'row-start-3 col-start-3' },
];

// ── Gradient Source Builder ────────────────────────────────────────────────

function buildGradientSource(pattern: PatternType, c1: string, c2: string, c3: string, angle: number): string {
  const deg = `${angle}deg`;
  switch (pattern) {
    case 'linear':
      return `linear-gradient(${deg}, ${c1}, ${c2}, ${c3})`;
    case 'repeating-linear':
      return `repeating-linear-gradient(${deg}, ${c1} 0px, ${c2} 10px, ${c3} 20px)`;
    case 'radial':
      return `radial-gradient(circle, ${c1} 30%, ${c2} 60%, ${c3} 100%)`;
    case 'conic':
      return `conic-gradient(from ${deg}, ${c1}, ${c2}, ${c3}, ${c1})`;
    case 'repeating-conic':
      return `repeating-conic-gradient(from ${deg}, ${c1} 0deg, ${c2} 20deg, ${c3} 40deg)`;
    case 'linear-cross':
      return `linear-gradient(${deg}, ${c1}, ${c2}), linear-gradient(${angle + 90}deg, ${c2}, ${c3})`;
    default:
      return `linear-gradient(${deg}, ${c1}, ${c2})`;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssBorderImageGeneratorPage() {
  const [pattern, setPattern] = useState<PatternType>('linear');
  const [color1, setColor1] = useState('#6366f1');
  const [color2, setColor2] = useState('#a855f7');
  const [color3, setColor3] = useState('#ec4899');
  const [angle, setAngle] = useState(45);
  const [slice, setSlice] = useState(30);
  const [width, setWidth] = useState(12);
  const [outset, setOutset] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>('stretch');
  const [fill, setFill] = useState(false);
  const [showGridOverlay, setShowGridOverlay] = useState(false);

  const gradientSource = useMemo(
    () => buildGradientSource(pattern, color1, color2, color3, angle),
    [pattern, color1, color2, color3, angle],
  );

  const cssOutput = useMemo(() => {
    const lines: string[] = [];
    lines.push('.border-image-element {');
    lines.push(`  border-image-source: ${gradientSource.replace(/, linear-gradient/g, ',\n    linear-gradient')};`);
    lines.push(`  border-image-slice: ${slice};`);
    lines.push(`  border-image-width: ${width}px;`);
    if (outset > 0) {
      lines.push(`  border-image-outset: ${outset}px;`);
    }
    lines.push(`  border-image-repeat: ${repeat};`);
    if (fill) {
      lines.push(`  border-image-fill: fill;`);
    }
    lines.push('}');
    lines.push('');
    lines.push('/* Shorthand: */');
    const shorthand = `border-image: ${gradientSource} ${slice} ${fill ? 'fill ' : ''}/${width}px${outset > 0 ? ` / ${outset}px` : ''} ${repeat};`;
    lines.push(shorthand);
    return lines;
  }, [gradientSource, slice, width, outset, repeat, fill]);

  const shorthandCss = useMemo(() => {
    return `border-image: ${gradientSource} ${slice} ${fill ? 'fill ' : ''}/${width}px${outset > 0 ? ` / ${outset}px` : ''} ${repeat};`;
  }, [gradientSource, slice, width, outset, repeat, fill]);

  const applyPreset = useCallback((p: Preset) => {
    setPattern(p.pattern);
    setColor1(p.color1);
    setColor2(p.color2);
    setColor3(p.color3);
    setAngle(p.angle);
    setSlice(p.slice);
    setWidth(p.width);
    setOutset(p.outset);
    setRepeat(p.repeat);
    setFill(p.fill);
  }, []);

  const handleReset = useCallback(() => {
    setPattern('linear');
    setColor1('#6366f1');
    setColor2('#a855f7');
    setColor3('#ec4899');
    setAngle(45);
    setSlice(30);
    setWidth(12);
    setOutset(0);
    setRepeat('stretch');
    setFill(false);
  }, []);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied!`);
    });
  }, []);

  // Build border-image shorthand
  const borderImageStyle = useMemo(() => {
    return shorthandCss;
  }, [shorthandCss]);

  return (
    <ToolLayout
      title="CSS border-image Generator"
      description="Visually build CSS border-image — slice images into 9 regions, control repeat modes, and create decorative borders with gradients. Instantly copy production-ready CSS."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── LEFT: Preview ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Presets</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-left px-3 py-2 rounded-lg border border-slate-700 bg-surface-light hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-xs"
                >
                  <div className="font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-slate-500 truncate text-[10px] mt-0.5">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Live Preview</label>
              <button
                onClick={() => setShowGridOverlay(!showGridOverlay)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
                  showGridOverlay
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-surface-light text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                9-Slice Grid
              </button>
            </div>

            {/* 9-slice grid overlay */}
            {showGridOverlay && (
              <div className="mb-3 p-3 rounded-lg bg-surface-light border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">
                  The <strong className="text-slate-300">border-image</strong> property slices the source image into 9 regions:
                </p>
                <div className="grid grid-cols-3 grid-rows-3 gap-0.5 max-w-[200px] mx-auto">
                  {GRID_CELLS.map((cell) => (
                    <div
                      key={cell.region}
                      className={`text-[9px] leading-tight p-1.5 text-center rounded ${
                        cell.region === 'center'
                          ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                          : cell.region.includes('corner') || cell.region === 'top-left' || cell.region === 'top-right' || cell.region === 'bottom-left' || cell.region === 'bottom-right'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {cell.region}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-slate-500 justify-center">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" /> Corners</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500/30 border border-blue-500/50" /> Edges</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500/30 border border-orange-500/50" /> Center</span>
                </div>
              </div>
            )}

            {/* Main preview box */}
            <div className="relative">
              <div
                className="w-full aspect-[4/3] rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  border: 'none',
                  borderImage: gradientSource,
                  borderImageSlice: slice,
                  borderImageWidth: `${width}px`,
                  borderImageOutset: `${outset}px`,
                  borderImageRepeat: repeat,
                  ...(fill ? { borderImageFill: 'fill' } : {}),
                } as React.CSSProperties}
              >
                <div className="text-center px-6">
                  <div className="text-sm font-medium text-slate-300 mb-1">border-image</div>
                  <div className="text-xs text-slate-500 font-mono break-all line-clamp-2">
                    {shorthandCss.substring(0, 60)}...
                  </div>
                </div>
              </div>

              {/* Slice measurements */}
              {slice > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Visual slice indicators */}
                  <div className="absolute top-0 left-0" style={{ width: `${Math.min(slice * 2, 60)}px`, height: `${Math.min(slice * 2, 60)}px`, borderRight: '1px dashed rgba(99,102,241,0.3)', borderBottom: '1px dashed rgba(99,102,241,0.3)' }}>
                    <span className="absolute top-1 left-1 text-[9px] text-indigo-400/60 font-mono">{slice}</span>
                  </div>
                  <div className="absolute top-0 right-0" style={{ width: `${Math.min(slice * 2, 60)}px`, height: `${Math.min(slice * 2, 60)}px`, borderLeft: '1px dashed rgba(99,102,241,0.3)', borderBottom: '1px dashed rgba(99,102,241,0.3)' }}>
                    <span className="absolute top-1 right-1 text-[9px] text-indigo-400/60 font-mono">{slice}</span>
                  </div>
                  <div className="absolute bottom-0 left-0" style={{ width: `${Math.min(slice * 2, 60)}px`, height: `${Math.min(slice * 2, 60)}px`, borderRight: '1px dashed rgba(99,102,241,0.3)', borderTop: '1px dashed rgba(99,102,241,0.3)' }}>
                    <span className="absolute bottom-1 left-1 text-[9px] text-indigo-400/60 font-mono">{slice}</span>
                  </div>
                  <div className="absolute bottom-0 right-0" style={{ width: `${Math.min(slice * 2, 60)}px`, height: `${Math.min(slice * 2, 60)}px`, borderLeft: '1px dashed rgba(99,102,241,0.3)', borderTop: '1px dashed rgba(99,102,241,0.3)' }}>
                    <span className="absolute bottom-1 right-1 text-[9px] text-indigo-400/60 font-mono">{slice}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gradient source preview */}
            <div className="mt-3">
              <label className="block text-xs text-slate-500 mb-1.5">Source Gradient</label>
              <div
                className="w-full h-10 rounded-lg border border-slate-700"
                style={{ background: gradientSource }}
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Controls ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Pattern Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Gradient Pattern</label>
            <div className="grid grid-cols-3 gap-2">
              {PATTERNS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPattern(p.value)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs transition-all ${
                    pattern === p.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-slate-700 bg-surface-light text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="leading-tight text-center">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Colors</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Color 1', value: color1, setter: setColor1 },
                { label: 'Color 2', value: color2, setter: setColor2 },
                { label: 'Color 3', value: color3, setter: setColor3 },
              ].map((c) => (
                <div key={c.label}>
                  <label className="block text-[10px] text-slate-500 mb-1">{c.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={c.value}
                      onChange={(e) => c.setter(e.target.value)}
                      className="w-8 h-8 rounded-md border border-slate-600 cursor-pointer bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={c.value}
                      onChange={(e) => c.setter(e.target.value)}
                      className="flex-1 bg-surface-light border border-slate-700 rounded-md px-2 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Angle */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-slate-300">Angle</label>
              <span className="text-xs font-mono text-brand-400">{angle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
              <span>0°</span>
              <span>90°</span>
              <span>180°</span>
              <span>270°</span>
              <span>360°</span>
            </div>
          </div>

          {/* Slice */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-slate-300">Slice</label>
              <span className="text-xs font-mono text-brand-400">{slice}</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={slice}
              onChange={(e) => setSlice(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              How far from the edges to slice the source image. Higher = more of the center used for edges.
            </p>
          </div>

          {/* Width */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-slate-300">Width</label>
              <span className="text-xs font-mono text-brand-400">{width}px</span>
            </div>
            <input
              type="range"
              min={2}
              max={60}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Outset */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-slate-300">Outset</label>
              <span className="text-xs font-mono text-brand-400">{outset}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={outset}
              onChange={(e) => setOutset(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              How far the border extends past the element&apos;s border box.
            </p>
          </div>

          {/* Repeat Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Repeat Mode</label>
            <div className="grid grid-cols-4 gap-1.5">
              {REPEAT_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setRepeat(m.value)}
                  className={`px-2 py-2 rounded-lg border text-xs transition-all ${
                    repeat === m.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-slate-700 bg-surface-light text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                  title={m.description}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fill toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                onClick={() => setFill(!fill)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  fill ? 'bg-brand-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    fill ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-slate-300">Fill Center</span>
                <p className="text-[10px] text-slate-500">
                  Apply the center slice of the image as a background across the element.
                </p>
              </div>
            </label>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">CSS Output</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(cssOutput.join('\n'), 'CSS')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs hover:bg-brand-500/20 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-light border border-slate-700 text-slate-400 text-xs hover:text-slate-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
            <pre className="bg-[#0d1117] border border-slate-700 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>
                {cssOutput.map((line, i) => (
                  <div key={i} className={line.startsWith('/*') ? 'text-slate-600 italic' : line.includes('Shorthand') || line.startsWith('border-image:') ? 'text-emerald-400' : ''}>
                    {line || '\u00A0'}
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
