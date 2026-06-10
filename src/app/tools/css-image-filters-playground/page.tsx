'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Upload, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface FilterValues {
  blur: number;          // 0-20 px
  brightness: number;    // 0-300%
  contrast: number;      // 0-300%
  grayscale: number;     // 0-100%
  hueRotate: number;     // 0-360 deg
  invert: number;        // 0-100%
  opacity: number;       // 0-100%
  saturate: number;      // 0-300%
  sepia: number;         // 0-100%
}

interface DropShadow {
  enabled: boolean;
  offsetX: number;  // -50 to 50 px
  offsetY: number;  // -50 to 50 px
  blur: number;     // 0-50 px
  color: string;
}

interface Preset {
  name: string;
  description: string;
  filters: FilterValues;
  dropShadow: DropShadow;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULTS: FilterValues = {
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

const SHADOW_DEFAULTS: DropShadow = {
  enabled: false,
  offsetX: 0,
  offsetY: 4,
  blur: 8,
  color: '#000000',
};

const PRESETS: Preset[] = [
  {
    name: 'Vintage',
    description: 'Warm, faded film look',
    filters: { blur: 0, brightness: 110, contrast: 90, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 80, sepia: 40 },
    dropShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
  },
  {
    name: 'Dramatic',
    description: 'High contrast, intense colors',
    filters: { blur: 0, brightness: 110, contrast: 150, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 140, sepia: 0 },
    dropShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
  },
  {
    name: 'Grainy Film',
    description: 'High grain, desaturated vintage feel',
    filters: { blur: 0.5, brightness: 95, contrast: 110, grayscale: 30, hueRotate: 0, invert: 0, opacity: 100, saturate: 50, sepia: 20 },
    dropShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
  },
  {
    name: 'Bleached',
    description: 'Overexposed, brightened, soft',
    filters: { blur: 0, brightness: 150, contrast: 70, grayscale: 10, hueRotate: 0, invert: 0, opacity: 100, saturate: 30, sepia: 0 },
    dropShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
  },
  {
    name: 'Noir',
    description: 'Full black & white with heavy contrast',
    filters: { blur: 0, brightness: 100, contrast: 140, grayscale: 100, hueRotate: 0, invert: 0, opacity: 100, saturate: 0, sepia: 0 },
    dropShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
  },
  {
    name: 'Cyberpunk',
    description: 'Inverted blues, high saturation, neon glow',
    filters: { blur: 0, brightness: 100, contrast: 130, grayscale: 0, hueRotate: 210, invert: 5, opacity: 100, saturate: 200, sepia: 0 },
    dropShadow: { enabled: true, offsetX: 0, offsetY: 0, blur: 20, color: '#00ffff' },
  },
  {
    name: 'Warm Sunset',
    description: 'Golden hour glow effect',
    filters: { blur: 0, brightness: 115, contrast: 110, grayscale: 0, hueRotate: 30, invert: 0, opacity: 100, saturate: 130, sepia: 15 },
    dropShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
  },
  {
    name: 'Frosted Glass',
    description: 'Soft blur, muted colors',
    filters: { blur: 4, brightness: 120, contrast: 80, grayscale: 10, hueRotate: 0, invert: 0, opacity: 90, saturate: 50, sepia: 0 },
    dropShadow: { enabled: true, offsetX: 0, offsetY: 8, blur: 16, color: '#00000044' },
  },
  {
    name: 'Infrared',
    description: 'Inverted colors, surreal look',
    filters: { blur: 0, brightness: 110, contrast: 130, grayscale: 0, hueRotate: 180, invert: 85, opacity: 100, saturate: 120, sepia: 0 },
    dropShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '#000000' },
  },
  {
    name: 'Lomo',
    description: 'Vignette, saturated, punchy colors',
    filters: { blur: 0, brightness: 105, contrast: 120, grayscale: 0, hueRotate: 0, invert: 0, opacity: 100, saturate: 150, sepia: 10 },
    dropShadow: { enabled: true, offsetX: 0, offsetY: 4, blur: 8, color: '#00000060' },
  },
];

const DEMO_IMAGE = '/tools/css-image-filters-playground/demo.jpg';

// ── Slider Config ─────────────────────────────────────────────────────────

interface SliderConfig {
  key: keyof FilterValues;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultVal: number;
}

const SLIDERS: SliderConfig[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 20, step: 0.1, unit: 'px', defaultVal: 0 },
  { key: 'brightness', label: 'Brightness', min: 0, max: 300, step: 1, unit: '%', defaultVal: 100 },
  { key: 'contrast', label: 'Contrast', min: 0, max: 300, step: 1, unit: '%', defaultVal: 100 },
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, step: 1, unit: '%', defaultVal: 0 },
  { key: 'hueRotate', label: 'Hue Rotate', min: 0, max: 360, step: 1, unit: 'deg', defaultVal: 0 },
  { key: 'invert', label: 'Invert', min: 0, max: 100, step: 1, unit: '%', defaultVal: 0 },
  { key: 'opacity', label: 'Opacity', min: 0, max: 100, step: 1, unit: '%', defaultVal: 100 },
  { key: 'saturate', label: 'Saturate', min: 0, max: 300, step: 1, unit: '%', defaultVal: 100 },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, step: 1, unit: '%', defaultVal: 0 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function buildFilterCSS(filters: FilterValues, dropShadow: DropShadow): string {
  const parts: string[] = [];
  
  if (filters.blur !== 0) parts.push(`blur(${filters.blur.toFixed(1)}px)`);
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.grayscale !== 0) parts.push(`grayscale(${filters.grayscale}%)`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.invert !== 0) parts.push(`invert(${filters.invert}%)`);
  if (filters.opacity !== 100) parts.push(`opacity(${filters.opacity}%)`);
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
  if (filters.sepia !== 0) parts.push(`sepia(${filters.sepia}%)`);
  if (dropShadow.enabled) {
    parts.push(`drop-shadow(${dropShadow.offsetX}px ${dropShadow.offsetY}px ${dropShadow.blur}px ${dropShadow.color})`);
  }
  
  return parts.length > 0 ? parts.join(' ') : 'none';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CSSImageFiltersPlayground() {
  const [filters, setFilters] = useState<FilterValues>(DEFAULTS);
  const [dropShadow, setDropShadow] = useState<DropShadow>(SHADOW_DEFAULTS);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const filterCSS = useMemo(() => buildFilterCSS(filters, dropShadow), [filters, dropShadow]);

  const setFilter = useCallback((key: keyof FilterValues, value: number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setFilters(preset.filters);
    setDropShadow(preset.dropShadow);
    toast.success(`Applied "${preset.name}" preset`);
  }, []);

  const reset = useCallback(() => {
    setFilters(DEFAULTS);
    setDropShadow(SHADOW_DEFAULTS);
    toast.success('Filters reset');
  }, []);

  const copyCSS = useCallback(() => {
    const css = `filter: ${filterCSS};`;
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true);
      toast.success('CSS copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [filterCSS]);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomImage(e.target?.result as string);
      setImageError(false);
      toast.success('Image loaded!');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const clearImage = useCallback(() => {
    setCustomImage(null);
    setImageError(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const src = customImage || '/globe.svg';
  const hasCustomImage = !!customImage;

  return (
    <ToolLayout
      title="CSS Image Filters Playground"
      description="Visually explore every CSS filter: blur, brightness, contrast, grayscale, hue-rotate, invert, opacity, saturate, sepia, and drop-shadow. Instant CSS output, 10 presets, and custom image upload."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Preview Panel ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Preview</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  hasCustomImage
                    ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                    : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <Upload className="w-3 h-3 inline mr-1" />
                {hasCustomImage ? 'Custom' : 'Upload'}
              </button>
              {hasCustomImage && (
                <button
                  onClick={clearImage}
                  className="text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  Reset Image
                </button>
              )}
            </div>
          </div>

          {/* Drop zone */}
          {showUpload && (
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-brand-500 bg-brand-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <p className="text-sm text-slate-400 mb-1">Drop an image here or click to browse</p>
                <p className="text-xs text-slate-600">PNG, JPG, WebP, SVG supported</p>
              </label>
            </div>
          )}

          {/* Image Preview */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900/50 border border-slate-800 min-h-[300px] flex items-center justify-center">
            {/* Checkerboard for transparent images */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `linear-gradient(45deg, #64748b 25%, transparent 25%),
                  linear-gradient(-45deg, #64748b 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #64748b 75%),
                  linear-gradient(-45deg, transparent 75%, #64748b 75%)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            />
            {imageError ? (
              <div className="relative z-10 text-center p-8">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-500">Failed to load image</p>
                <p className="text-xs text-slate-600 mt-1">Try uploading a custom image</p>
              </div>
            ) : (
              <img
                key={src}
                src={src}
                alt="Filter preview"
                className="relative z-10 max-w-full max-h-[400px] object-contain transition-all duration-200"
                style={{ filter: filterCSS }}
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            )}
          </div>

          {/* CSS Output */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CSS Output</span>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <code className="block text-sm text-green-400 font-mono bg-slate-950 rounded-md p-3 overflow-x-auto">
              filter: {filterCSS};
            </code>
          </div>
        </div>

        {/* ── Controls Panel ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Presets
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="text-left px-3 py-2 rounded-lg text-xs border border-slate-800 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all group"
                  title={preset.description}
                >
                  <div className="font-medium text-slate-300 group-hover:text-white">{preset.name}</div>
                  <div className="text-slate-600 mt-0.5 leading-tight">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Sliders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Filters</h3>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="space-y-3">
              {SLIDERS.map((slider) => {
                const value = filters[slider.key];
                const isDefault = value === slider.defaultVal;
                return (
                  <div key={slider.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs ${isDefault ? 'text-slate-500' : 'text-brand-400'}`}>
                        {slider.label}
                      </label>
                      <span className={`text-xs font-mono tabular-nums ${isDefault ? 'text-slate-600' : 'text-slate-300'}`}>
                        {slider.key === 'blur' ? value.toFixed(1) : value}{slider.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      step={slider.step}
                      value={value}
                      onChange={(e) => setFilter(slider.key, parseFloat(e.target.value))}
                      className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
                        isDefault
                          ? 'bg-slate-700 [&::-webkit-slider-thumb]:bg-slate-500'
                          : 'bg-brand-500/30 [&::-webkit-slider-thumb]:bg-brand-500'
                      } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drop Shadow */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Drop Shadow</h3>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dropShadow.enabled}
                onChange={(e) => setDropShadow((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="rounded bg-slate-800 border-slate-600 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-400">Enable drop-shadow</span>
            </label>

            {dropShadow.enabled && (
              <div className="space-y-3 pl-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Offset X</label>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={dropShadow.offsetX}
                      onChange={(e) => setDropShadow((prev) => ({ ...prev, offsetX: parseInt(e.target.value) }))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-brand-500/30 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <span className="text-xs text-slate-400 font-mono">{dropShadow.offsetX}px</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Offset Y</label>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={dropShadow.offsetY}
                      onChange={(e) => setDropShadow((prev) => ({ ...prev, offsetY: parseInt(e.target.value) }))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-brand-500/30 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <span className="text-xs text-slate-400 font-mono">{dropShadow.offsetY}px</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Blur</label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={dropShadow.blur}
                    onChange={(e) => setDropShadow((prev) => ({ ...prev, blur: parseInt(e.target.value) }))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-brand-500/30 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-xs text-slate-400 font-mono">{dropShadow.blur}px</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={dropShadow.color}
                      onChange={(e) => setDropShadow((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded-md cursor-pointer border-0 bg-transparent"
                    />
                    <code className="text-xs text-slate-400 font-mono">{dropShadow.color}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
