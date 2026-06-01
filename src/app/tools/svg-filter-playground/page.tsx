'use client';

import { useState, useMemo, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, SlidersHorizontal, Eye, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface FilterParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

interface FilterPreset {
  id: string;
  label: string;
  description: string;
  params: FilterParam[];
  buildFilter: (values: Record<string, number>) => string;
  defaultValues: Record<string, number>;
}

// ── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: FilterPreset[] = [
  {
    id: 'blur',
    label: 'Gaussian Blur',
    description: 'Soft blur effect — great for frosted glass backgrounds and depth-of-field.',
    params: [
      { key: 'stdDeviation', label: 'Blur Radius', min: 0, max: 20, step: 0.1, default: 4, unit: 'px' },
    ],
    defaultValues: { stdDeviation: 4 },
    buildFilter: (v) => `<filter id="gaussian-blur">
  <feGaussianBlur stdDeviation="${v.stdDeviation}" />
</filter>`,
  },
  {
    id: 'drop-shadow',
    label: 'Drop Shadow',
    description: 'Cast shadows that follow the alpha channel — unlike box-shadow, respects transparency.',
    params: [
      { key: 'dx', label: 'Offset X', min: -30, max: 30, step: 1, default: 4, unit: 'px' },
      { key: 'dy', label: 'Offset Y', min: -30, max: 30, step: 1, default: 6, unit: 'px' },
      { key: 'stdDeviation', label: 'Blur', min: 0, max: 20, step: 0.5, default: 5, unit: 'px' },
      { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05, default: 0.4, unit: '' },
    ],
    defaultValues: { dx: 4, dy: 6, stdDeviation: 5, opacity: 0.4 },
    buildFilter: (v) => `<filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="${v.dx}" dy="${v.dy}" stdDeviation="${v.stdDeviation}" flood-opacity="${v.opacity}" />
</filter>`,
  },
  {
    id: 'noise',
    label: 'Noise / Grain Texture',
    description: 'Procedural noise texture using feTurbulence — perfect for grainy backgrounds and film effects.',
    params: [
      { key: 'baseFrequency', label: 'Frequency', min: 0.01, max: 0.5, step: 0.01, default: 0.05, unit: '' },
      { key: 'numOctaves', label: 'Octaves (detail)', min: 1, max: 6, step: 1, default: 3, unit: '' },
      { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05, default: 0.15, unit: '' },
    ],
    defaultValues: { baseFrequency: 0.05, numOctaves: 3, opacity: 0.15 },
    buildFilter: (v) => `<filter id="noise">
  <feTurbulence type="fractalNoise" baseFrequency="${v.baseFrequency}" numOctaves="${Math.round(v.numOctaves)}" />
  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${v.opacity} 0" />
</filter>`,
  },
  {
    id: 'duotone',
    label: 'Duotone / Color Matrix',
    description: 'Map colors to a two-tone palette using feColorMatrix — achieve Spotify-style duotone effects.',
    params: [
      { key: 'r', label: 'Red Channel', min: 0, max: 1, step: 0.01, default: 1, unit: '' },
      { key: 'g', label: 'Green Channel', min: 0, max: 1, step: 0.01, default: 0.2, unit: '' },
      { key: 'b', label: 'Blue Channel', min: 0, max: 1, step: 0.01, default: 0, unit: '' },
    ],
    defaultValues: { r: 1, g: 0.2, b: 0 },
    buildFilter: (v) => `<filter id="duotone">
  <feColorMatrix type="matrix" values="
    0.33 0.33 0.33 0 0
    0.33 0.33 0.33 0 0
    0.33 0.33 0.33 0 0
    0    0    0    1 0
  " />
  <feComponentTransfer>
    <feFuncR type="linear" slope="${v.r}" />
    <feFuncG type="linear" slope="${v.g}" />
    <feFuncB type="linear" slope="${v.b}" />
  </feComponentTransfer>
</filter>`,
  },
  {
    id: 'gooey',
    label: 'Gooey / Morphology',
    description: 'Organic gooey blob effect via dilation + blur + threshold — used for liquid morphing UI animations.',
    params: [
      { key: 'radius', label: 'Gooey Strength', min: 3, max: 20, step: 0.5, default: 8, unit: 'px' },
      { key: 'blur', label: 'Blur', min: 1, max: 15, step: 0.5, default: 5, unit: 'px' },
    ],
    defaultValues: { radius: 8, blur: 5 },
    buildFilter: (v) => `<filter id="gooey">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${v.blur}" result="blur" />
  <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${Math.max(10, 25 - v.radius)} -${Math.max(5, v.radius * 1.5)}" result="goo" />
  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
</filter>`,
  },
  {
    id: 'glow',
    label: 'Neon Glow',
    description: 'Vibrant neon glow effect — blur the source, intensify colors, composite over original.',
    params: [
      { key: 'stdDeviation', label: 'Glow Spread', min: 1, max: 15, step: 0.5, default: 5, unit: 'px' },
      { key: 'r', label: 'Glow Red', min: 0, max: 1, step: 0.05, default: 0.2, unit: '' },
      { key: 'g', label: 'Glow Green', min: 0, max: 1, step: 0.05, default: 0.6, unit: '' },
      { key: 'b', label: 'Glow Blue', min: 0, max: 1, step: 0.05, default: 1, unit: '' },
    ],
    defaultValues: { stdDeviation: 5, r: 0.2, g: 0.6, b: 1 },
    buildFilter: (v) => `<filter id="neon-glow">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${v.stdDeviation}" result="blur1" />
  <feGaussianBlur in="SourceGraphic" stdDeviation="${(v.stdDeviation * 2).toFixed(1)}" result="blur2" />
  <feMerge>
    <feMergeNode in="blur2" />
    <feMergeNode in="blur1" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
  <feColorMatrix type="matrix" values="
    ${v.r} 0 0 0 0
    0 ${v.g} 0 0 0
    0 0 ${v.b} 0 0
    0 0 0 1 0
  " />
</filter>`,
  },
  {
    id: 'displacement',
    label: 'Displacement Map',
    description: 'Distort elements with a turbulence-driven displacement map — wavy, liquid, or glitch effects.',
    params: [
      { key: 'baseFrequency', label: 'Frequency', min: 0.005, max: 0.1, step: 0.005, default: 0.02, unit: '' },
      { key: 'scale', label: 'Distortion Amount', min: 0, max: 60, step: 1, default: 20, unit: 'px' },
      { key: 'numOctaves', label: 'Detail (octaves)', min: 1, max: 5, step: 1, default: 2, unit: '' },
    ],
    defaultValues: { baseFrequency: 0.02, scale: 20, numOctaves: 2 },
    buildFilter: (v) => `<filter id="displacement">
  <feTurbulence type="turbulence" baseFrequency="${v.baseFrequency}" numOctaves="${Math.round(v.numOctaves)}" result="turbulence" />
  <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${v.scale}" xChannelSelector="R" yChannelSelector="G" />
</filter>`,
  },
  {
    id: 'outline',
    label: 'Text Outline / Stroke',
    description: 'Add a colored outline around text or shapes — dilate, color, then composite behind the original.',
    params: [
      { key: 'radius', label: 'Outline Width', min: 1, max: 10, step: 0.5, default: 3, unit: 'px' },
      { key: 'r', label: 'Outline Red', min: 0, max: 255, step: 1, default: 0, unit: '' },
      { key: 'g', label: 'Outline Green', min: 0, max: 255, step: 1, default: 0, unit: '' },
      { key: 'b', label: 'Outline Blue', min: 0, max: 255, step: 1, default: 0, unit: '' },
    ],
    defaultValues: { radius: 3, r: 0, g: 0, b: 0 },
    buildFilter: (v) => `<filter id="outline">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${v.radius}" result="dilated" />
  <feFlood flood-color="rgb(${Math.round(v.r)},${Math.round(v.g)},${Math.round(v.b)})" result="color" />
  <feComposite in="color" in2="dilated" operator="in" result="outline" />
  <feMerge>
    <feMergeNode in="outline" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>`,
  },
];

// ── Preview shapes ──────────────────────────────────────────────────────────

const PREVIEW_ITEMS = [
  { id: 'text', label: 'Text', content: 'SVG\nFilters' },
  { id: 'circle', label: 'Circle', content: 'circle' },
  { id: 'rect', label: 'Rectangle', content: 'rect' },
  { id: 'gear', label: 'Gear Icon', content: 'gear' },
  { id: 'wave', label: 'Waves', content: 'wave' },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function SvgFilterPlaygroundPage() {
  const [activePreset, setActivePreset] = useState<string>('blur');
  const [values, setValues] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    for (const p of PRESETS) {
      init[p.id] = { ...p.defaultValues };
    }
    return init;
  });
  const [previewType, setPreviewType] = useState('text');
  const [copied, setCopied] = useState(false);

  const preset = PRESETS.find((p) => p.id === activePreset)!;
  const currentValues = values[activePreset] || preset.defaultValues;
  const filterId = `filter-${activePreset}`;

  const filterSvg = useMemo(() => preset.buildFilter(currentValues), [preset, currentValues]);
  const cssCode = useMemo(() => `filter: url(#${filterId});`, [filterId]);

  const setValue = useCallback(
    (key: string, value: number) => {
      setValues((prev) => ({
        ...prev,
        [activePreset]: { ...prev[activePreset], [key]: value },
      }));
    },
    [activePreset],
  );

  const resetPreset = useCallback(() => {
    setValues((prev) => ({
      ...prev,
      [activePreset]: { ...preset.defaultValues },
    }));
  }, [activePreset, preset]);

  const copyFilter = useCallback(() => {
    navigator.clipboard.writeText(filterSvg).then(() => {
      setCopied(true);
      toast.success('SVG filter copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [filterSvg]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssCode).then(() => {
      setCopied(true);
      toast.success('CSS copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cssCode]);

  // ── Render preview ────────────────────────────────────────────────────────

  const renderPreviewShape = () => {
    switch (previewType) {
      case 'circle':
        return <circle cx="150" cy="125" r="70" fill="url(#previewGradient)" />;
      case 'rect':
        return <rect x="60" y="50" width="180" height="150" rx="16" fill="url(#previewGradient)" />;
      case 'gear': {
        // Simple gear-like shape using polygon
        const cx = 150, cy = 125, outerR = 65, innerR = 50;
        const teeth = 8;
        const points: string[] = [];
        for (let i = 0; i < teeth * 2; i++) {
          const angle = (Math.PI * i) / teeth - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
        }
        return (
          <>
            <polygon points={points.join(' ')} fill="url(#previewGradient)" />
            <circle cx={cx} cy={cy} r={innerR * 0.55} fill="#1e293b" />
          </>
        );
      }
      case 'wave': {
        const pathD = 'M 30 140 Q 60 60 90 140 T 150 140 T 210 140 T 270 140';
        return (
          <>
            <path d={pathD} stroke="url(#previewGradient)" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M 30 140 Q 60 100 90 140 T 150 140 T 210 140 T 270 140" stroke="url(#previewGradient)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4" />
          </>
        );
      }
      default: // text
        return (
          <>
            <text x="150" y="115" textAnchor="middle" dominantBaseline="middle" fill="url(#previewGradient)" fontSize="42" fontWeight="800" fontFamily="system-ui, sans-serif">
              SVG
            </text>
            <text x="150" y="165" textAnchor="middle" dominantBaseline="middle" fill="url(#previewGradient)" fontSize="42" fontWeight="300" fontFamily="system-ui, sans-serif">
              Filters
            </text>
          </>
        );
    }
  };

  return (
    <ToolLayout
      title="SVG Filter Playground"
      description="Visually build SVG filter effects — blur, shadows, noise, duotone, gooey morph, neon glow, displacement, and text outlines. Apply them to any HTML element with CSS filter: url()."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Preset selector + params ──────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Preset picker */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Filter Type</h3>
            <div className="space-y-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePreset(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activePreset === p.id
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Parameters</h3>
              <button
                onClick={resetPreset}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="space-y-4">
              {preset.params.map((param) => (
                <div key={param.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-400">{param.label}</label>
                    <span className="text-xs tabular-nums text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded">
                      {currentValues[param.key]}
                      {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={currentValues[param.key]}
                    onChange={(e) => setValue(param.key, parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={copyFilter}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy SVG
            </button>
            <button
              onClick={copyCSS}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              Copy CSS
            </button>
          </div>
        </div>

        {/* ── Right: Preview + Code ───────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview type picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">Preview:</span>
            {PREVIEW_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setPreviewType(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  previewType === item.id
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Live Preview */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/30">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Live Preview
              </span>
              <span className="text-xs text-slate-600 font-mono">{cssCode}</span>
            </div>
            <div className="p-8 flex items-center justify-center min-h-[320px] bg-[radial-gradient(circle_at_center,#1e293b_0%,#0f172a_100%)]">
              <svg
                viewBox="0 0 300 250"
                width="300"
                height="250"
                className="max-w-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="previewGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <filter id={filterId} dangerouslySetInnerHTML={{ __html: filterSvg.replace(/<filter[^>]*>/, '').replace('</filter>', '') }} />
                </defs>
                <g filter={`url(#${filterId})`}>
                  {renderPreviewShape()}
                </g>
              </svg>
            </div>
          </div>

          {/* Code output */}
          <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/30">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3 h-3" />
                SVG Filter Code
              </span>
              <button
                onClick={copyFilter}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="p-4 text-xs text-slate-300 bg-slate-950 overflow-x-auto font-mono leading-relaxed">
              <code>{filterSvg}</code>
            </pre>
          </div>

          {/* Usage instructions */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">How to Use</h4>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Copy the SVG filter code above</li>
              <li>Paste it inside an <code className="text-slate-400 bg-slate-800 px-1 rounded">&lt;svg&gt;&lt;defs&gt;</code> block in your HTML</li>
              <li>Apply to any element with <code className="text-slate-400 bg-slate-800 px-1 rounded">filter: url(#filter-{activePreset});</code></li>
              <li>Works on images, text, divs — anything! All browser-native, zero dependencies.</li>
            </ol>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
