'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

type FilterType = 'blur' | 'brightness' | 'contrast' | 'grayscale' | 'hue-rotate' | 'invert' | 'opacity' | 'saturate' | 'sepia';

interface FilterState {
  blur: number;
  brightness: number;
  contrast: number;
  grayscale: number;
  hueRotate: number;
  invert: number;
  opacity: number;
  saturate: number;
  sepia: number;
}

interface Preset {
  name: string;
  desc: string;
  filters: Partial<FilterState>;
  gradient: string;
}

const DEFAULTS: FilterState = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  opacity: 100,
  saturate: 100,
  sepia: 0,
};

const FILTERS: { key: keyof FilterState; label: string; unit: string; min: number; max: number; step: number; desc: string }[] = [
  { key: 'blur', label: 'Blur', unit: 'px', min: 0, max: 30, step: 0.5, desc: 'Gaussian blur — higher values create more blur' },
  { key: 'brightness', label: 'Brightness', unit: '%', min: 0, max: 300, step: 1, desc: '0% = black, 100% = normal, >100% = brighter' },
  { key: 'contrast', label: 'Contrast', unit: '%', min: 0, max: 300, step: 1, desc: '0% = gray, 100% = normal, >100% = more contrast' },
  { key: 'grayscale', label: 'Grayscale', unit: '%', min: 0, max: 100, step: 1, desc: 'Convert to grayscale — 100% = fully black & white' },
  { key: 'hueRotate', label: 'Hue Rotate', unit: 'deg', min: 0, max: 360, step: 1, desc: 'Rotate colors around the color wheel' },
  { key: 'invert', label: 'Invert', unit: '%', min: 0, max: 100, step: 1, desc: 'Invert colors — 100% = negative image' },
  { key: 'opacity', label: 'Opacity', unit: '%', min: 0, max: 100, step: 1, desc: 'Transparency — 0% = fully transparent' },
  { key: 'saturate', label: 'Saturate', unit: '%', min: 0, max: 300, step: 1, desc: '0% = grayscale, 100% = normal, >100% = oversaturated' },
  { key: 'sepia', label: 'Sepia', unit: '%', min: 0, max: 100, step: 1, desc: 'Sepia tone — 100% = vintage photograph look' },
];

const PRESETS: Preset[] = [
  {
    name: 'Frosted Glass',
    desc: 'Classic macOS/iOS frosted glass effect',
    filters: { blur: 12, brightness: 110, saturate: 180 },
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    name: 'Dark Mode Panel',
    desc: 'Subtle dark overlay with blur',
    filters: { blur: 8, brightness: 70, contrast: 110 },
    gradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
  },
  {
    name: 'Vibrant Frost',
    desc: 'High saturation with strong blur',
    filters: { blur: 16, brightness: 120, saturate: 250, contrast: 115 },
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%)',
  },
  {
    name: 'Retro Sepia',
    desc: 'Vintage photo filter',
    filters: { sepia: 70, contrast: 85, brightness: 90, saturate: 80 },
    gradient: 'linear-gradient(135deg, #d4a574 0%, #f4e4c1 50%, #c9a96e 100%)',
  },
  {
    name: 'High Contrast',
    desc: 'Dramatic black & white',
    filters: { grayscale: 100, contrast: 180, brightness: 110 },
    gradient: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
  },
  {
    name: 'Vivid Pop',
    desc: 'Oversaturated, punchy colors',
    filters: { saturate: 250, contrast: 120, brightness: 105 },
    gradient: 'linear-gradient(135deg, #ffe259 0%, #ffa751 100%)',
  },
  {
    name: 'Cool Blue Tint',
    desc: 'Hue shift into cool blues',
    filters: { hueRotate: 200, brightness: 105, saturate: 130 },
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  },
  {
    name: 'Warm Sunset',
    desc: 'Hue shift into warm oranges',
    filters: { hueRotate: 30, brightness: 110, saturate: 150, sepia: 20 },
    gradient: 'linear-gradient(135deg, #fa8231 0%, #f7b731 50%, #fc5c65 100%)',
  },
  {
    name: 'Inverted Night',
    desc: 'Full color inversion',
    filters: { invert: 100, brightness: 90, contrast: 110 },
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
  {
    name: 'Ghost Panel',
    desc: 'Very subtle overlay with low opacity',
    filters: { blur: 4, brightness: 100, opacity: 60, contrast: 95 },
    gradient: 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)',
  },
];

const DEMO_IMAGES = [
  { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="100%" style="stop-color:#764ba2"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="150" cy="120" r="40" fill="white" opacity="0.3"/><circle cx="260" cy="180" r="60" fill="white" opacity="0.2"/><text x="200" y="160" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif" font-weight="bold">Backdrop</text><text x="200" y="190" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif" opacity="0.8">Filter Playground</text></svg>'), label: 'Gradient' },
  { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#0f172a"/><rect x="20" y="20" width="80" height="80" rx="12" fill="#3b82f6" opacity="0.8"/><rect x="120" y="20" width="80" height="80" rx="12" fill="#ef4444" opacity="0.8"/><rect x="220" y="20" width="80" height="80" rx="12" fill="#10b981" opacity="0.8"/><rect x="320" y="20" width="60" height="80" rx="12" fill="#f59e0b" opacity="0.8"/><rect x="70" y="120" width="120" height="60" rx="8" fill="#8b5cf6" opacity="0.6"/><rect x="220" y="120" width="140" height="60" rx="8" fill="#ec4899" opacity="0.6"/><circle cx="200" cy="240" r="30" fill="#06b6d4" opacity="0.4"/></svg>'), label: 'UI Mockup' },
  { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#0a0a1a"/><g transform="translate(200,150)"><circle cx="0" cy="0" r="5" fill="#3b82f6"/><circle cx="-20" cy="-10" r="3" fill="#10b981"/><circle cx="25" cy="-5" r="4" fill="#f59e0b"/><circle cx="-10" cy="15" r="3" fill="#ef4444"/><circle cx="15" cy="12" r="4" fill="#8b5cf6"/><circle cx="-30" cy="5" r="2" fill="#ec4899"/><circle cx="30" cy="-18" r="2" fill="#06b6d4"/><circle cx="-15" cy="-25" r="3" fill="#14b8a6"/><circle cx="5" cy="-20" r="2" fill="#a855f7"/><circle cx="-5" cy="25" r="2" fill="#eab308"/><circle cx="20" cy="-15" r="3" fill="#6366f1"/><circle cx="-25" cy="-20" r="2" fill="#f43f5e"/></g></svg>'), label: 'Dark Mode' },
  { url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#1a1a2e"/><text x="200" y="140" text-anchor="middle" fill="white" font-size="48" font-family="sans-serif" font-weight="900" opacity="0.3">DEV</text><text x="200" y="180" text-anchor="middle" fill="#38bdf8" font-size="18" font-family="monospace" opacity="0.6">console.log(&#x27;hello world&#x27;);</text></svg>'), label: 'Code Terminal' },
];

export default function CssBackdropFilterPage() {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULTS });
  const [activeImage, setActiveImage] = useState(0);
  const [showBackdrop, setShowBackdrop] = useState(true);
  const [outputMode, setOutputMode] = useState<'backdrop' | 'filter'>('backdrop');

  const update = useCallback((key: keyof FilterState, value: number) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setFilters({ ...DEFAULTS, ...preset.filters });
  }, []);

  const reset = useCallback(() => {
    setFilters({ ...DEFAULTS });
  }, []);

  const cssValue = useMemo(() => {
    const parts: string[] = [];
    FILTERS.forEach((f) => {
      const val = filters[f.key];
      if (f.key === 'hueRotate') {
        if (val !== 0) parts.push(`hue-rotate(${val}deg)`);
      } else if (val !== DEFAULTS[f.key]) {
        parts.push(`${f.key.replace(/([A-Z])/g, '-$1').toLowerCase()}(${val}${f.unit === 'deg' ? 'deg' : f.unit})`);
      }
    });
    return parts.length > 0 ? parts.join(' ') : 'none';
  }, [filters]);

  const copyCss = useCallback(() => {
    const property = outputMode === 'backdrop' ? 'backdrop-filter' : 'filter';
    const css = `${property}: ${cssValue};\n-webkit-${property}: ${cssValue};`;
    navigator.clipboard.writeText(css).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, [cssValue, outputMode]);

  const modifiedFilters = FILTERS.filter((f) => {
    const val = filters[f.key];
    if (f.key === 'hueRotate') return val !== 0;
    return val !== DEFAULTS[f.key];
  });

  return (
    <ToolLayout
      title="CSS Backdrop Filter Playground"
      description="Experiment with CSS backdrop-filter effects — blur, brightness, contrast, hue-rotate, and more. Build frosted glass, overlays, and image effects with live preview."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Preview */}
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center justify-between">
            <div className="flex rounded-lg bg-surface p-0.5">
              <button
                onClick={() => setOutputMode('backdrop')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  outputMode === 'backdrop' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                backdrop-filter
              </button>
              <button
                onClick={() => setOutputMode('filter')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  outputMode === 'filter' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                filter
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBackdrop}
                  onChange={(e) => setShowBackdrop(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-brand-500"
                />
                Show overlay
              </label>
            </div>
          </div>

          {/* Demo area */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700/50" style={{ height: 320 }}>
            {/* Background layer */}
            <div
              className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/20 select-none"
              style={{
                background: PRESETS.find((p) => {
                  const match = FILTERS.filter((f) => {
                    if (f.key === 'hueRotate') return filters[f.key] !== 0;
                    return Math.abs(filters[f.key] - DEFAULTS[f.key]) > 0.5;
                  });
                  if (!p.filters) return false;
                  const fkeys = Object.keys(p.filters) as (keyof FilterState)[];
                  return fkeys.length === match.length;
                })?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              }}
            >
              <img
                src={DEMO_IMAGES[activeImage].url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="relative z-10">★ ✦ ◆ ●</span>
            </div>

            {/* Backdrop overlay */}
            {showBackdrop && (
              <div
                className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                style={{
                  backdropFilter: outputMode === 'backdrop' ? cssValue : 'none',
                  WebkitBackdropFilter: outputMode === 'backdrop' ? cssValue : 'none',
                  filter: outputMode === 'filter' ? cssValue : 'none',
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                <div className="text-center">
                  <div
                    className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center border border-white/20"
                    style={{
                      background: outputMode === 'backdrop' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <Palette className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white/80 text-sm mt-3 font-medium">
                    {outputMode === 'backdrop' ? 'Backdrop Filter' : 'Filter'} Overlay
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Image selector */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Background Image</label>
            <div className="flex gap-1.5">
              {DEMO_IMAGES.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    activeImage === i
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 bg-surface text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>

          {/* CSS output */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">Generated CSS</h3>
              <button onClick={copyCss} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-3 font-mono text-xs text-slate-300 border border-slate-700/50 overflow-x-auto">
              <code>
                <span className="text-sky-400">{outputMode === 'backdrop' ? 'backdrop-filter' : 'filter'}</span>: {cssValue || <span className="text-slate-500">none</span>};
                <br />
                <span className="text-sky-400">-webkit-{outputMode === 'backdrop' ? 'backdrop-filter' : 'filter'}</span>: {cssValue || <span className="text-slate-500">none</span>};
              </code>
            </pre>
            {modifiedFilters.length === 0 && <p className="text-xs text-slate-500 mt-1">Adjust sliders below to build your effect</p>}
            {modifiedFilters.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {modifiedFilters.map((f) => (
                  <span key={f.key} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls + Presets */}
        <div className="space-y-4">
          {/* Presets */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="text-left p-2.5 rounded-lg border border-slate-700/50 bg-surface hover:border-slate-600/50 hover:bg-surface-light transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full shrink-0 border border-white/20"
                      style={{ background: preset.gradient }}
                    />
                    <div>
                      <div className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">{preset.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Filters</h3>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div className="space-y-4">
              {FILTERS.map((f) => {
                const val = filters[f.key];
                const isDefault = f.key === 'hueRotate' ? val === 0 : val === DEFAULTS[f.key];
                return (
                  <div key={f.key} className={`transition-opacity ${isDefault ? 'opacity-60' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-400">{f.label}</label>
                      <div className="flex items-center gap-2">
                        {!isDefault && <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                        <span className="text-xs font-mono text-slate-300 tabular-nums w-14 text-right">
                          {val}{f.unit}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={val}
                      onChange={(e) => update(f.key, Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer accent-brand-500"
                    />
                    <p className="text-[10px] text-slate-600 mt-0.5">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">About Backdrop Filters</h3>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li><strong>backdrop-filter</strong> applies effects to the area <em>behind</em> an element — it affects what&#39;s underneath, not the element itself.</li>
          <li><strong>filter</strong> applies effects directly to the element and its children.</li>
          <li>Backdrop filters are great for creating frosted glass, modal overlays, and header blur effects — without JavaScript.</li>
          <li>Browser support: All modern browsers (Chrome 76+, Safari 9+ with -webkit-, Firefox 103+, Edge 79+).</li>
          <li>Always include the <code className="text-brand-400">-webkit-backdrop-filter</code> prefix for Safari compatibility.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
