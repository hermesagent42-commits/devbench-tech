'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Palette,
  Copy,
  RefreshCw,
  Wand2,
  Check,
  PaintBucket,
  Download,
  Eye,
  Sun,
  Moon,
  Droplets,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ColorSwatch {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  label: string;
  contrastOnWhite: number;
  contrastOnBlack: number;
}

type ExportFormat = 'css' | 'tailwind' | 'json';

// ── Color Utilities ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(n => n.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function mixWith(rgb: [number, number, number], other: [number, number, number], ratio: number): [number, number, number] {
  return [
    Math.round(rgb[0] + (other[0] - rgb[0]) * ratio),
    Math.round(rgb[1] + (other[1] - rgb[1]) * ratio),
    Math.round(rgb[2] + (other[2] - rgb[2]) * ratio),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(...a);
  const l2 = relativeLuminance(...b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastLevel(ratio: number): { label: string; color: string; passes: string } {
  if (ratio >= 7) return { label: 'AAA', color: 'text-green-400', passes: 'AAA + AA' };
  if (ratio >= 4.5) return { label: 'AA', color: 'text-amber-400', passes: 'AA' };
  if (ratio >= 3) return { label: 'AA Large', color: 'text-orange-400', passes: 'AA (large text only)' };
  return { label: 'Fail', color: 'text-red-400', passes: '—' };
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { name: string; hex: string }[] = [
  { name: 'Tailwind Blue', hex: '#3B82F6' },
  { name: 'Tailwind Emerald', hex: '#10B981' },
  { name: 'Tailwind Rose', hex: '#F43F5E' },
  { name: 'Tailwind Violet', hex: '#8B5CF6' },
  { name: 'Tailwind Amber', hex: '#F59E0B' },
  { name: 'Material Red', hex: '#F44336' },
  { name: 'Material Teal', hex: '#009688' },
  { name: 'GitHub Purple', hex: '#6E40C9' },
  { name: 'Stripe Blue', hex: '#635BFF' },
  { name: 'Vercel Black', hex: '#171717' },
  { name: 'Discord Blurple', hex: '#5865F2' },
  { name: 'Spotify Green', hex: '#1DB954' },
];

// ── Generation helpers ──────────────────────────────────────────────────────

function generateTints(hex: string, count: number): ColorSwatch[] {
  const rgb = hexToRgb(hex);
  return Array.from({ length: count }, (_, i) => {
    const ratio = (i + 1) / count;
    const mixed = mixWith(rgb, [255, 255, 255], ratio);
    const h = rgbToHex(...mixed);
    return {
      hex: h,
      rgb: mixed,
      hsl: rgbToHsl(...mixed),
      label: `Tint ${Math.round(ratio * 100)}%`,
      contrastOnWhite: contrastRatio(mixed, [255, 255, 255]),
      contrastOnBlack: contrastRatio(mixed, [0, 0, 0]),
    };
  });
}

function generateShades(hex: string, count: number): ColorSwatch[] {
  const rgb = hexToRgb(hex);
  return Array.from({ length: count }, (_, i) => {
    const ratio = (i + 1) / count;
    const mixed = mixWith(rgb, [0, 0, 0], ratio);
    const h = rgbToHex(...mixed);
    return {
      hex: h,
      rgb: mixed,
      hsl: rgbToHsl(...mixed),
      label: `Shade ${Math.round(ratio * 100)}%`,
      contrastOnWhite: contrastRatio(mixed, [255, 255, 255]),
      contrastOnBlack: contrastRatio(mixed, [0, 0, 0]),
    };
  });
}

function generateTones(hex: string, count: number): ColorSwatch[] {
  const rgb = hexToRgb(hex);
  return Array.from({ length: count }, (_, i) => {
    const ratio = (i + 1) / count;
    const mixed = mixWith(rgb, [128, 128, 128], ratio);
    const h = rgbToHex(...mixed);
    return {
      hex: h,
      rgb: mixed,
      hsl: rgbToHsl(...mixed),
      label: `Tone ${Math.round(ratio * 100)}%`,
      contrastOnWhite: contrastRatio(mixed, [255, 255, 255]),
      contrastOnBlack: contrastRatio(mixed, [0, 0, 0]),
    };
  });
}

function generateTailwindScale(hex: string): ColorSwatch[] {
  const rgb = hexToRgb(hex);
  // Generate Tailwind-style 50-950 scale
  const steps: { label: string; ratio: number; target: [number, number, number] }[] = [
    { label: '50', ratio: 0.08, target: [255, 255, 255] },
    { label: '100', ratio: 0.16, target: [255, 255, 255] },
    { label: '200', ratio: 0.32, target: [255, 255, 255] },
    { label: '300', ratio: 0.52, target: [255, 255, 255] },
    { label: '400', ratio: 0.78, target: [255, 255, 255] },
    { label: '500', ratio: 0, target: [0, 0, 0] }, // base
    { label: '600', ratio: 0.15, target: [0, 0, 0] },
    { label: '700', ratio: 0.30, target: [0, 0, 0] },
    { label: '800', ratio: 0.50, target: [0, 0, 0] },
    { label: '900', ratio: 0.70, target: [0, 0, 0] },
    { label: '950', ratio: 0.85, target: [0, 0, 0] },
  ];

  return steps.map(({ label, ratio, target }) => {
    let mixed: [number, number, number];
    if (label === '500') {
      mixed = rgb;
    } else {
      mixed = mixWith(rgb, target, ratio);
    }
    const h = rgbToHex(...mixed);
    return {
      hex: h,
      rgb: mixed,
      hsl: rgbToHsl(...mixed),
      label,
      contrastOnWhite: contrastRatio(mixed, [255, 255, 255]),
      contrastOnBlack: contrastRatio(mixed, [0, 0, 0]),
    };
  });
}

// ── Export helpers ──────────────────────────────────────────────────────────

function exportAsCSS(swatches: ColorSwatch[], name: string): string {
  const baseName = name.toLowerCase().replace(/\s+/g, '-');
  return swatches.map(s => `  --${baseName}-${s.label.toLowerCase().replace(/\s+/g, '-')}: ${s.hex};`).join('\n');
}

function exportAsTailwind(swatches: ColorSwatch[], name: string): string {
  const baseName = name.toLowerCase().replace(/\s+/g, '-');
  let out = `'${baseName}': {\n`;
  out += swatches.map(s => `  '${s.label}': '${s.hex}',`).join('\n');
  out += '\n}';
  return out;
}

function exportAsJSON(swatches: ColorSwatch[], name: string): string {
  const baseName = name.toLowerCase().replace(/\s+/g, '-');
  const obj: Record<string, string> = {};
  swatches.forEach(s => { obj[s.label] = s.hex; });
  return JSON.stringify({ [baseName]: obj }, null, 2);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ColorShadesPage() {
  const [hex, setHex] = useState('#3B82F6');
  const [colorName, setColorName] = useState('brand');
  const [stepCount, setStepCount] = useState(10);
  const [showContrast, setShowContrast] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('css');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [mode, setMode] = useState<'tailwind' | 'tints' | 'shades' | 'tones' | 'all'>('tailwind');

  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = useMemo(() => rgbToHsl(...rgb), [rgb]);

  const swatches = useMemo(() => {
    switch (mode) {
      case 'tailwind':
        return generateTailwindScale(hex);
      case 'tints':
        return generateTints(hex, stepCount);
      case 'shades':
        return generateShades(hex, stepCount);
      case 'tones':
        return generateTones(hex, stepCount);
      case 'all':
        return [
          ...generateShades(hex, stepCount).reverse(),
          { hex, rgb, hsl: rgbToHsl(...rgb), label: 'Base', contrastOnWhite: contrastRatio(rgb, [255, 255, 255]), contrastOnBlack: contrastRatio(rgb, [0, 0, 0]) },
          ...generateTints(hex, stepCount),
        ];
    }
  }, [hex, stepCount, mode, rgb, hsl]);

  const exportCode = useMemo(() => {
    switch (exportFormat) {
      case 'css': return exportAsCSS(swatches, colorName);
      case 'tailwind': return exportAsTailwind(swatches, colorName);
      case 'json': return exportAsJSON(swatches, colorName);
    }
  }, [swatches, colorName, exportFormat]);

  const handleHexInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setHex(val.toLowerCase());
    } else if (val.length <= 7) {
      setHex(val);
    }
  }, []);

  const copySwatch = useCallback((swatchHex: string, label: string) => {
    navigator.clipboard.writeText(swatchHex).then(
      () => {
        setCopiedLabel(label);
        toast.success(`Copied ${swatchHex}`);
        setTimeout(() => setCopiedLabel(null), 1500);
      },
      () => toast.error('Failed to copy'),
    );
  }, []);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(exportCode).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Failed to copy'),
    );
  }, [exportCode]);

  const randomColor = useCallback(() => {
    const randomHex = '#' + Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setHex(randomHex);
    setColorName('random');
    toast.success('Randomized!');
  }, []);

  // Determine text color for the base color swatch
  const baseTextColor = useMemo(() => {
    const ratio = contrastRatio(rgb, [255, 255, 255]);
    return ratio >= 4.5 ? 'text-white' : 'text-slate-900';
  }, [rgb]);

  return (
    <ToolLayout
      title="Color Shade & Tint Generator"
      description="Generate tints, shades, and tones from any color. Build Tailwind-style color scales, design system palettes, and export to CSS, Tailwind config, or JSON — 100% client-side."
    >
      <div className="space-y-8">
        {/* ── Color Input ── */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <PaintBucket className="w-4 h-4" />
              Base Color
            </label>
            <div className="flex items-center gap-3 flex-1">
              <input
                type="color"
                value={hex.length === 7 ? hex : '#000000'}
                onChange={(e) => setHex(e.target.value.toLowerCase())}
                className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer bg-transparent p-0.5"
              />
              <input
                className="input-field flex-1 font-mono text-sm uppercase tracking-wider"
                value={hex}
                onChange={handleHexInput}
                placeholder="#3B82F6"
              />
              <input
                className="input-field w-28 text-sm"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="brand"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={randomColor} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Wand2 className="w-4 h-4" />
                Random
              </button>
            </div>
          </div>

          {/* Color info */}
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-400">
            <span className="px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700/50 font-mono">{hex.toUpperCase()}</span>
            <span className="px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700/50 font-mono">RGB({rgb.join(', ')})</span>
            <span className="px-2 py-1 rounded-md bg-slate-800/70 border border-slate-700/50 font-mono">HSL({hsl[0]}°, {hsl[1]}%, {hsl[2]}%)</span>
          </div>

          {/* Base color preview */}
          <div
            className="mt-4 h-20 rounded-xl border border-slate-700/50 flex items-center justify-center text-lg font-bold transition-colors"
            style={{ backgroundColor: hex.length === 7 ? hex : '#3B82F6' }}
          >
            <span className={baseTextColor}>Base Color</span>
          </div>
        </div>

        {/* ── Mode & Settings ── */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Mode</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'tailwind', label: 'Tailwind Scale', icon: Palette },
                  { key: 'all', label: 'Full Spectrum', icon: ArrowUpDown },
                  { key: 'shades', label: 'Shades Only', icon: Moon },
                  { key: 'tints', label: 'Tints Only', icon: Sun },
                  { key: 'tones', label: 'Tones Only', icon: Droplets },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                    mode === key
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode !== 'tailwind' && mode !== 'all' && (
            <div className="flex items-center gap-4 mt-4">
              <label className="text-xs text-slate-400">Steps:</label>
              <input
                type="range"
                min={4}
                max={20}
                value={stepCount}
                onChange={(e) => setStepCount(Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-xs text-slate-300 font-mono w-6 text-right">{stepCount}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setShowContrast(!showContrast)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                showContrast
                  ? 'bg-green-500/15 border-green-500/40 text-green-400'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              WCAG Contrast
            </button>
          </div>
        </div>

        {/* ── Presets ── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Presets</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.hex}
                onClick={() => { setHex(p.hex); setColorName(p.name.toLowerCase().replace(/\s+/g, '-')); }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all border ${
                  hex === p.hex ? 'border-brand-500 bg-brand-500/10' : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-md border border-slate-600/30 shadow-sm"
                  style={{ backgroundColor: p.hex }}
                />
                <span className="text-[10px] text-slate-400 leading-tight text-center">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Color Scale ── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            {mode === 'tailwind' ? 'Tailwind-Style Color Scale' :
             mode === 'all' ? 'Full Tint & Shade Spectrum' :
             mode === 'shades' ? 'Shades' :
             mode === 'tints' ? 'Tints' :
             'Tones'}
          </h2>
          <div className="space-y-2">
            {swatches.map((swatch) => {
              const wcagOnWhite = contrastLevel(swatch.contrastOnWhite);
              const wcagOnBlack = contrastLevel(swatch.contrastOnBlack);
              const textColor = swatch.contrastOnWhite >= 4.5 ? 'text-white' : 'text-slate-900';
              const isCopied = copiedLabel === swatch.label;

              return (
                <div
                  key={swatch.label}
                  className="group flex items-center gap-3 rounded-lg overflow-hidden border border-slate-700/30 hover:border-slate-600/50 transition-all cursor-pointer relative"
                  onClick={() => copySwatch(swatch.hex, swatch.label)}
                >
                  {/* Swatch bar */}
                  <div
                    className="flex-1 h-12 flex items-center justify-between px-4 min-w-0"
                    style={{ backgroundColor: swatch.hex }}
                  >
                    <span className={`text-sm font-semibold ${textColor}`}>{swatch.label}</span>
                    <div className="flex items-center gap-2">
                      {showContrast && (
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] ${textColor} opacity-70`}>on █:</span>
                          <span className={`text-[10px] font-mono font-bold ${textColor}`}>
                            {wcagOnWhite.label}
                          </span>
                        </div>
                      )}
                      <span className={`text-sm font-mono ${textColor} opacity-80`}>
                        {swatch.hex.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Copy indicator */}
                  <div className={`w-10 h-12 flex items-center justify-center ${isCopied ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'} group-hover:text-slate-300 transition-colors shrink-0`}>
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Export ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Export</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExportFormat('css')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  exportFormat === 'css' ? 'bg-brand-500/20 border-brand-500/50 text-brand-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                }`}
              >
                CSS Variables
              </button>
              <button
                onClick={() => setExportFormat('tailwind')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  exportFormat === 'tailwind' ? 'bg-brand-500/20 border-brand-500/50 text-brand-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                }`}
              >
                Tailwind
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  exportFormat === 'json' ? 'bg-brand-500/20 border-brand-500/50 text-brand-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                }`}
              >
                JSON
              </button>
            </div>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto border border-slate-700/50 max-h-64 overflow-y-auto">
              {exportCode}
            </pre>
            <button
              onClick={copyAll}
              className="absolute top-3 right-3 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              title="Copy export"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Usage Tips ── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">How to Use Color Scales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h3 className="text-slate-300 font-semibold mb-2">Tints (mix white)</h3>
              <p>Use for backgrounds, hover states, and accents — lighter variants of your brand color. Great for cards, badges, and subtle highlights.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h3 className="text-slate-300 font-semibold mb-2">Shades (mix black)</h3>
              <p>Use for text, icons, borders, and active states. Darker variants provide contrast, depth, and visual hierarchy.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h3 className="text-slate-300 font-semibold mb-2">Tones (mix gray)</h3>
              <p>Use for muted UI elements — disabled states, placeholder text, and secondary surfaces. Softer than pure shades.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
