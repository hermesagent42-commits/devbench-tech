'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Download, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface FilterState {
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
  filters: FilterState;
  description: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

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

const PRESETS: Preset[] = [
  { label: 'None', description: 'Original image', filters: { ...DEFAULTS } },
  { label: 'Vintage', description: 'Warm, faded film look', filters: { ...DEFAULTS, sepia: 60, contrast: 110, brightness: 95, saturate: 80 } },
  { label: 'Dramatic', description: 'High contrast B&W', filters: { ...DEFAULTS, grayscale: 100, contrast: 150, brightness: 105 } },
  { label: 'Blur Background', description: 'Soft focus / bokeh', filters: { ...DEFAULTS, blur: 8, brightness: 105, saturate: 120 } },
  { label: 'Cool Tone', description: 'Blue-tinted mood', filters: { ...DEFAULTS, hueRotate: 200, saturate: 80, brightness: 110 } },
  { label: 'Warm Glow', description: 'Golden hour look', filters: { ...DEFAULTS, hueRotate: 30, saturate: 130, brightness: 115, contrast: 105 } },
  { label: 'Invert Colors', description: 'Full color inversion', filters: { ...DEFAULTS, invert: 100 } },
  { label: 'Ghost', description: 'Faded semi-transparent', filters: { ...DEFAULTS, opacity: 50, brightness: 130, saturate: 60 } },
  { label: 'Cyberpunk', description: 'Neon, high contrast', filters: { ...DEFAULTS, contrast: 180, saturate: 200, brightness: 110, hueRotate: 270 } },
  { label: 'Retro', description: '70s film grain', filters: { ...DEFAULTS, sepia: 40, contrast: 120, saturate: 110, brightness: 95, hueRotate: -15 } },
  { label: 'Dark Mode', description: 'Dim and moody', filters: { ...DEFAULTS, brightness: 70, contrast: 130, saturate: 90 } },
  { label: 'Overexposed', description: 'Bright and washed out', filters: { ...DEFAULTS, brightness: 160, contrast: 80, saturate: 70 } },
];

const SAMPLE_IMAGES = [
  { label: '🌅 Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop' },
  { label: '🏔️ Mountains', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop' },
  { label: '🌆 City', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=400&fit=crop' },
  { label: '🌸 Flowers', url: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&h=400&fit=crop' },
];

// ── CSS Generation ─────────────────────────────────────────────────────────

function generateFilterCSS(filters: FilterState): string {
  const parts: string[] = [];

  if (filters.blur !== 0) parts.push(`blur(${filters.blur}px)`);
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.grayscale !== 0) parts.push(`grayscale(${filters.grayscale}%)`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.invert !== 0) parts.push(`invert(${filters.invert}%)`);
  if (filters.opacity !== 100) parts.push(`opacity(${filters.opacity}%)`);
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
  if (filters.sepia !== 0) parts.push(`sepia(${filters.sepia}%)`);

  if (parts.length === 0) return '/* No filters applied */\nfilter: none;';

  return `filter: ${parts.join(' ')};`;
}

function generateBackdropCSS(filters: FilterState): string {
  const parts: string[] = [];
  if (filters.blur !== 0) parts.push(`blur(${filters.blur}px)`);
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.grayscale !== 0) parts.push(`grayscale(${filters.grayscale}%)`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.invert !== 0) parts.push(`invert(${filters.invert}%)`);
  if (filters.opacity !== 100) parts.push(`opacity(${filters.opacity}%)`);
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
  if (filters.sepia !== 0) parts.push(`sepia(${filters.sepia}%)`);

  if (parts.length === 0) return '/* No backdrop filters applied */\nbackdrop-filter: none;';

  return `backdrop-filter: ${parts.join(' ')};`;
}

function filtersToCSS(filters: FilterState): string {
  const parts: string[] = [];
  if (filters.blur !== 0) parts.push(`blur(${filters.blur}px)`);
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.grayscale !== 0) parts.push(`grayscale(${filters.grayscale}%)`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.invert !== 0) parts.push(`invert(${filters.invert}%)`);
  if (filters.opacity !== 100) parts.push(`opacity(${filters.opacity}%)`);
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
  if (filters.sepia !== 0) parts.push(`sepia(${filters.sepia}%)`);
  return parts.length === 0 ? 'none' : parts.join(' ');
}

// ── Slider Config ──────────────────────────────────────────────────────────

interface SliderConfig {
  key: keyof FilterState;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultVal: number;
  description: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 20, step: 0.1, unit: 'px', defaultVal: 0, description: 'Gaussian blur radius' },
  { key: 'brightness', label: 'Brightness', min: 0, max: 300, step: 1, unit: '%', defaultVal: 100, description: '0% = black, 100% = normal, >100% = brighter' },
  { key: 'contrast', label: 'Contrast', min: 0, max: 300, step: 1, unit: '%', defaultVal: 100, description: '0% = flat gray, 100% = normal, >100% = more contrast' },
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, step: 1, unit: '%', defaultVal: 0, description: '100% = completely desaturated' },
  { key: 'hueRotate', label: 'Hue Rotate', min: 0, max: 360, step: 1, unit: 'deg', defaultVal: 0, description: 'Rotates hues around the color wheel' },
  { key: 'invert', label: 'Invert', min: 0, max: 100, step: 1, unit: '%', defaultVal: 0, description: '100% = full color inversion (like a negative)' },
  { key: 'opacity', label: 'Opacity', min: 0, max: 100, step: 1, unit: '%', defaultVal: 100, description: '0% = fully transparent, 100% = fully opaque' },
  { key: 'saturate', label: 'Saturate', min: 0, max: 300, step: 1, unit: '%', defaultVal: 100, description: '0% = grayscale, 100% = normal, >100% = oversaturated' },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, step: 1, unit: '%', defaultVal: 0, description: '100% = full sepia / vintage look' },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CssFilterPlaygroundPage() {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULTS });
  const [activePreset, setActivePreset] = useState<string>('None');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [sampleImageUrl, setSampleImageUrl] = useState<string>(SAMPLE_IMAGES[0].url);
  const [sampleImageLabel, setSampleImageLabel] = useState<string>(SAMPLE_IMAGES[0].label);
  const [showBackdropCode, setShowBackdropCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = customImage || sampleImageUrl;

  const filterCSSValue = useMemo(() => filtersToCSS(filters), [filters]);
  const filterCSS = useMemo(() => generateFilterCSS(filters), [filters]);
  const backdropCSS = useMemo(() => generateBackdropCSS(filters), [filters]);

  const handleSliderChange = useCallback((key: keyof FilterState, value: number) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Check if it matches a preset
      const matching = PRESETS.find((p) =>
        SLIDERS.every((s) => p.filters[s.key] === next[s.key])
      );
      setActivePreset(matching ? matching.label : 'Custom');
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setFilters({ ...preset.filters });
    setActivePreset(preset.label);
  }, []);

  const resetAll = useCallback(() => {
    setFilters({ ...DEFAULTS });
    setActivePreset('None');
  }, []);

  const copyCSS = useCallback(() => {
    const css = showBackdropCode ? backdropCSS : filterCSS;
    navigator.clipboard.writeText(css).then(
      () => toast.success(showBackdropCode ? 'backdrop-filter CSS copied!' : 'filter CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [filterCSS, backdropCSS, showBackdropCode]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(reader.result as string);
      setSampleImageLabel('Custom Image');
    };
    reader.readAsDataURL(file);
    // Reset input so re-upload works
    e.target.value = '';
  }, []);

  const activeFilterCount = useMemo(
    () => SLIDERS.filter((s) => filters[s.key] !== s.defaultVal).length,
    [filters]
  );

  return (
    <ToolLayout
      title="CSS Filter Playground"
      description="Visually build CSS filter effects — blur, brightness, contrast, grayscale, hue-rotate, and more. 12 presets, live image preview, instant CSS generation. Also generates backdrop-filter CSS for glassmorphism effects."
    >
      {/* Presets row */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === preset.label
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-surface-lighter text-slate-400 hover:text-slate-200 hover:bg-surface-light border border-slate-700/50'
              }`}
            >
              {preset.label}
            </button>
          ))}
          {activeFilterCount > 0 && activePreset === 'Custom' && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Custom ({activeFilterCount} active)
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {PRESETS.find((p) => p.label === activePreset)?.description || 'Custom filter combination'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-300">Preview — {sampleImageLabel}</label>
            <div className="flex gap-1.5">
              {SAMPLE_IMAGES.map((img) => (
                <button
                  key={img.label}
                  onClick={() => {
                    setCustomImage(null);
                    setSampleImageUrl(img.url);
                    setSampleImageLabel(img.label);
                  }}
                  className={`text-xs px-2 py-1 rounded-md transition-all ${
                    !customImage && sampleImageUrl === img.url
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                  title={img.label}
                >
                  {img.label}
                </button>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`text-xs px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                  customImage
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
                title="Upload your own image"
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50 min-h-[300px] flex items-center justify-center">
            {/* Checkerboard for opacity visualization */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(45deg, #1e293b 25%, transparent 25%),
                linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #1e293b 75%),
                linear-gradient(-45deg, transparent 75%, #1e293b 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }} />
            <img
              src={displayImage}
              alt="Filter preview"
              className="relative z-10 w-full h-auto max-h-[450px] object-cover transition-all duration-200"
              style={{ filter: filterCSSValue }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                toast.error('Failed to load image');
              }}
            />
          </div>

          {/* Filter badge */}
          {filterCSSValue !== 'none' && (
            <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <code className="text-xs text-brand-300 font-mono">{filterCSSValue}</code>
            </div>
          )}
        </div>

        {/* Controls + CSS */}
        <div className="flex flex-col gap-4">
          {/* Sliders */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
            {SLIDERS.map((slider) => {
              const isModified = filters[slider.key] !== slider.defaultVal;
              return (
                <div key={slider.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium flex items-center gap-1.5 ${isModified ? 'text-brand-300' : 'text-slate-400'}`}>
                      {slider.label}
                      {isModified && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                    </label>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-mono tabular-nums ${isModified ? 'text-amber-300' : 'text-slate-500'}`}>
                        {slider.key === 'blur' ? filters[slider.key].toFixed(1) : filters[slider.key]}{slider.unit}
                      </span>
                      {isModified && (
                        <button
                          onClick={() => handleSliderChange(slider.key, slider.defaultVal)}
                          className="text-slate-600 hover:text-slate-400"
                          title={`Reset ${slider.label}`}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={filters[slider.key]}
                    onChange={(e) => handleSliderChange(slider.key, Number(e.target.value))}
                    className={`w-full accent-brand-500 h-1.5 ${isModified ? 'opacity-100' : 'opacity-60'}`}
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                    <span>{slider.min}{slider.unit}</span>
                    <span className={filters[slider.key] === slider.defaultVal ? 'text-slate-700' : 'text-amber-500/60 font-medium'}>
                      default: {slider.defaultVal}{slider.unit}
                    </span>
                    <span>{slider.max}{slider.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CSS Output */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBackdropCode(false)}
                  className={`text-xs px-2 py-0.5 rounded ${!showBackdropCode ? 'bg-brand-500/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  filter
                </button>
                <button
                  onClick={() => setShowBackdropCode(true)}
                  className={`text-xs px-2 py-0.5 rounded ${showBackdropCode ? 'bg-brand-500/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  backdrop-filter
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetAll}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset All
                </button>
                <button
                  onClick={copyCSS}
                  className="btn-secondary flex items-center gap-1 text-xs py-1 px-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy CSS
                </button>
              </div>
            </div>
            <pre className="card bg-slate-950 border-slate-700/50 p-3 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto min-h-[60px]">
              {showBackdropCode ? backdropCSS : filterCSS}
            </pre>
          </div>

          {/* Info card */}
          <div className="card border-brand-500/20 bg-brand-500/5 p-3">
            <div className="flex items-start gap-2">
              <Camera className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-xs font-semibold text-brand-400">CSS Filter Support</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  CSS <code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">filter</code> is supported in all modern browsers.
                  Use <code className="text-brand-300 bg-brand-500/10 px-1 rounded text-[10px]">backdrop-filter</code> for glassmorphism effects — it applies filters to the area behind an element.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
