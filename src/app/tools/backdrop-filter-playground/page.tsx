'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, SlidersHorizontal, ImageIcon, Layers, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface BackdropFilterState {
  blur: number;       // px
  brightness: number; // %
  contrast: number;   // %
  grayscale: number;  // %
  hueRotate: number;  // deg
  invert: number;     // %
  opacity: number;    // %
  saturate: number;   // %
  sepia: number;      // %
}

interface Preset {
  label: string;
  icon: string;
  filters: BackdropFilterState;
  description: string;
}

// ── Background Images ──────────────────────────────────────────────────────

const BACKGROUNDS = [
  {
    label: 'Gradient',
    src: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    type: 'gradient' as const,
  },
  {
    label: 'Sunset',
    src: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    type: 'gradient' as const,
  },
  {
    label: 'Ocean',
    src: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    type: 'gradient' as const,
  },
  {
    label: 'Forest',
    src: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    type: 'gradient' as const,
  },
  {
    label: 'Sunset Photo',
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    type: 'image' as const,
  },
  {
    label: 'Cityscape',
    src: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    type: 'image' as const,
  },
  {
    label: 'Pattern',
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
    type: 'image' as const,
  },
  {
    label: 'Checkerboard',
    src: `repeating-conic-gradient(#6366f1 0% 25%, #818cf8 0% 50%) 50% / 40px 40px`,
    type: 'gradient' as const,
  },
];

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULTS: BackdropFilterState = {
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

const PRESETS: Preset[] = [
  {
    label: 'Frosted Glass',
    icon: '🧊',
    filters: { blur: 10, brightness: 110, contrast: 90, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 120, sepia: 0 },
    description: 'Classic macOS-style frosted glass. Subtle blur with a slight brightness bump.',
  },
  {
    label: 'Heavy Blur',
    icon: '🌫️',
    filters: { blur: 20, brightness: 100, contrast: 100, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 100, sepia: 0 },
    description: 'Maximum privacy blur. Great for overlays and modals.',
  },
  {
    label: 'Dark Tint',
    icon: '🕶️',
    filters: { blur: 8, brightness: 40, contrast: 110, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 50, sepia: 0 },
    description: 'Darkened backdrop for light text overlays. High readability.',
  },
  {
    label: 'Light Tint',
    icon: '☁️',
    filters: { blur: 8, brightness: 160, contrast: 80, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 50, sepia: 0 },
    description: 'Brightened backdrop for dark text overlays. Airy and soft.',
  },
  {
    label: 'Duotone',
    icon: '🎨',
    filters: { blur: 4, brightness: 100, contrast: 150, grayscale: 100, hueRotate: 0, invert: 0, opacity: 100, saturate: 200, sepia: 0 },
    description: 'High contrast black & white with saturation for color separation.',
  },
  {
    label: 'Hue Shift',
    icon: '🌈',
    filters: { blur: 3, brightness: 100, contrast: 100, grayscale: 0, hueRotate: 180, invert: 0, opacity: 100, saturate: 150, sepia: 0 },
    description: 'Shift the color wheel 180° for a psychedelic effect.',
  },
  {
    label: 'Noir',
    icon: '🎬',
    filters: { blur: 2, brightness: 80, contrast: 140, grayscale: 100, hueRotate: 0, invert: 0, opacity: 100, saturate: 0, sepia: 0 },
    description: 'Film noir aesthetic — high contrast grayscale with slight blur.',
  },
  {
    label: 'Sepia Glass',
    icon: '📜',
    filters: { blur: 6, brightness: 100, contrast: 90, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 80, sepia: 60 },
    description: 'Warm vintage sepia tone with soft blur. Nostalgic feel.',
  },
  {
    label: 'Vivid Pop',
    icon: '💥',
    filters: { blur: 0, brightness: 120, contrast: 130, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 200, sepia: 0 },
    description: 'Over-saturated, high contrast pop — no blur, pure color intensity.',
  },
  {
    label: 'Invert Mirror',
    icon: '🪞',
    filters: { blur: 5, brightness: 100, contrast: 100, grayscale: 0, hueRotate: 0, invert: 100, opacity: 100, saturate: 100, sepia: 0 },
    description: 'Inverted colors with blur — creates a surreal mirror effect.',
  },
];

// ── Helper to build the CSS backdrop-filter string ──────────────────────────

function buildFilterString(filters: BackdropFilterState): string {
  const parts: string[] = [];
  if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.grayscale > 0) parts.push(`grayscale(${filters.grayscale}%)`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.invert > 0) parts.push(`invert(${filters.invert}%)`);
  if (filters.opacity !== 100) parts.push(`opacity(${filters.opacity}%)`);
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
  if (filters.sepia > 0) parts.push(`sepia(${filters.sepia}%)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

// ── Slider Component ───────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  defaultValue: number;
  onChange: (v: number) => void;
}

function FilterSlider({ label, value, min, max, unit, defaultValue, onChange }: SliderProps) {
  const isModified = value !== defaultValue;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </label>
        <span className={`text-xs font-mono tabular-nums ${isModified ? 'text-brand-400' : 'text-slate-500'}`}>
          {value}{unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:hover:bg-brand-400 [&::-webkit-slider-thumb]:transition-colors"
        />
        {isModified && (
          <button
            onClick={() => onChange(defaultValue)}
            className="flex-shrink-0 p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-slate-800 transition-colors"
            title={`Reset ${label} to default`}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BackdropFilterPlayground() {
  const [filters, setFilters] = useState<BackdropFilterState>(PRESETS[0].filters);
  const [backgroundIdx, setBackgroundIdx] = useState(0);
  const [overlayText, setOverlayText] = useState('backdrop-filter');
  const [overlayOpacity, setOverlayOpacity] = useState(20);
  const [copied, setCopied] = useState(false);

  const background = BACKGROUNDS[backgroundIdx];
  const filterString = useMemo(() => buildFilterString(filters), [filters]);

  const applyPreset = useCallback((preset: Preset) => {
    setFilters({ ...preset.filters });
  }, []);

  const resetAll = useCallback(() => {
    setFilters({ ...DEFAULTS });
  }, []);

  const copyCSS = useCallback(() => {
    const css = `backdrop-filter: ${filterString};`;
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true);
      toast.success('CSS copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [filterString]);

  const updateFilter = useCallback((key: keyof BackdropFilterState, value: number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.blur > 0) count++;
    if (filters.brightness !== 100) count++;
    if (filters.contrast !== 100) count++;
    if (filters.grayscale > 0) count++;
    if (filters.hueRotate !== 0) count++;
    if (filters.invert > 0) count++;
    if (filters.opacity !== 100) count++;
    if (filters.saturate !== 100) count++;
    if (filters.sepia > 0) count++;
    return count;
  }, [filters]);

  const backgroundStyle = background.type === 'gradient'
    ? { background: background.src }
    : { backgroundImage: `url(${background.src})`, backgroundSize: 'cover', backgroundPosition: 'center' };

  return (
    <ToolLayout
      title="CSS Backdrop-Filter Playground"
      description="Apply filters to the area behind an element — blur, brightness, contrast, hue-rotate, and more. Build frosted glass, dark tints, and creative overlays with live preview."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Controls ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active filters badge */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-light border border-slate-700/50">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-400" />
              <span className="text-sm text-slate-300">
                {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
              </span>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetAll}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset all
              </button>
            )}
          </div>

          {/* Sliders */}
          <div className="space-y-4 p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              Filter Functions
            </h3>
            <FilterSlider label="Blur" value={filters.blur} min={0} max={50} unit="px" defaultValue={0} onChange={(v) => updateFilter('blur', v)} />
            <FilterSlider label="Brightness" value={filters.brightness} min={0} max={300} unit="%" defaultValue={100} onChange={(v) => updateFilter('brightness', v)} />
            <FilterSlider label="Contrast" value={filters.contrast} min={0} max={300} unit="%" defaultValue={100} onChange={(v) => updateFilter('contrast', v)} />
            <FilterSlider label="Grayscale" value={filters.grayscale} min={0} max={100} unit="%" defaultValue={0} onChange={(v) => updateFilter('grayscale', v)} />
            <FilterSlider label="Hue Rotate" value={filters.hueRotate} min={0} max={360} unit="deg" defaultValue={0} onChange={(v) => updateFilter('hueRotate', v)} />
            <FilterSlider label="Invert" value={filters.invert} min={0} max={100} unit="%" defaultValue={0} onChange={(v) => updateFilter('invert', v)} />
            <FilterSlider label="Opacity" value={filters.opacity} min={0} max={100} unit="%" defaultValue={100} onChange={(v) => updateFilter('opacity', v)} />
            <FilterSlider label="Saturate" value={filters.saturate} min={0} max={300} unit="%" defaultValue={100} onChange={(v) => updateFilter('saturate', v)} />
            <FilterSlider label="Sepia" value={filters.sepia} min={0} max={100} unit="%" defaultValue={0} onChange={(v) => updateFilter('sepia', v)} />
          </div>
        </div>

        {/* ── Right: Preview & Output ─────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-700/50">
            {/* Preview header */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface-light border-b border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</span>
              <div className="flex items-center gap-2">
                {/* Background selector */}
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-slate-500" />
                  <select
                    value={backgroundIdx}
                    onChange={(e) => setBackgroundIdx(Number(e.target.value))}
                    className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-brand-500"
                  >
                    {BACKGROUNDS.map((bg, i) => (
                      <option key={i} value={i}>{bg.label}</option>
                    ))}
                  </select>
                </div>
                {/* Overlay opacity */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Overlay</span>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-16 h-1 rounded-full appearance-none bg-slate-700 cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500
                      [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 w-8">{overlayOpacity}%</span>
                </div>
              </div>
            </div>
            {/* Preview area */}
            <div
              className="relative h-72 flex items-center justify-center"
              style={backgroundStyle}
            >
              {/* The backdrop-filter overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  backgroundColor: `rgba(15, 23, 42, ${overlayOpacity / 100})`,
                  backdropFilter: filterString,
                  WebkitBackdropFilter: filterString,
                }}
              >
                <div className="text-center select-none">
                  <input
                    type="text"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    className="bg-transparent text-center text-4xl font-bold text-white outline-none border-none placeholder-white/50"
                    placeholder="Type something..."
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                  />
                  <p className="text-white/60 text-sm mt-2 font-mono">
                    backdrop-filter: {filterString};
                  </p>
                </div>
              </div>
              {/* "Before" label in corner */}
              <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider text-white/40 bg-black/30 px-2 py-1 rounded">
                background
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Generated CSS</h3>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-brand-500/10 text-brand-400 border border-brand-500/20
                  hover:bg-brand-500/20 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-700/50 overflow-x-auto">
              <code className="text-sm text-brand-300 font-mono">
                backdrop-filter: {filterString};
              </code>
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              Paste this into any CSS rule. Combine with <code className="text-brand-400/70">background-color: rgba(...)</code> for tinted glass effects.
            </p>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-700/50
                bg-surface-light hover:border-brand-500/50 hover:bg-slate-800/60
                transition-all text-left group"
            >
              <span className="text-2xl">{preset.icon}</span>
              <span className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                {preset.label}
              </span>
              <span className="text-[11px] text-slate-500 leading-tight text-center">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-10 p-5 rounded-xl bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">How backdrop-filter works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
            <div className="text-xs font-semibold text-brand-400 mb-1">1. Layers Below</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The browser rasterizes everything <em>behind</em> the element, then applies the filter functions to that snapshot.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
            <div className="text-xs font-semibold text-brand-400 mb-1">2. Multiple Functions</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chain filters together: <code className="text-brand-300/70">blur(10px) brightness(1.2)</code>. Order matters — they apply left to right.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
            <div className="text-xs font-semibold text-brand-400 mb-1">3. Real-World Uses</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Navigation bars, modals, tooltips, card overlays, and notification toasts — anywhere you want context to show through.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
