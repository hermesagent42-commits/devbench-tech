'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Settings, Monitor, Type, Maximize, Ruler, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface CssUnit {
  symbol: string;
  label: string;
  category: 'absolute' | 'font-relative' | 'viewport';
  description: string;
  toPx: (value: number, config: ConverterConfig) => number;
  fromPx: (px: number, config: ConverterConfig) => number;
}

interface ConverterConfig {
  baseFontSize: number;
  viewportWidth: number;
  viewportHeight: number;
}

interface Result {
  symbol: string;
  label: string;
  category: string;
  description: string;
  value: number;
  formatted: string;
  isInput: boolean;
}

interface Preset {
  label: string;
  value: string;
  unit: string;
}

// ── Unit definitions ───────────────────────────────────────────────────────

const CSS_UNITS: CssUnit[] = [
  // Absolute units
  { symbol: 'px', label: 'Pixels', category: 'absolute', description: 'CSS pixel — device-independent dot', toPx: v => v, fromPx: v => v },
  { symbol: 'pt', label: 'Points', category: 'absolute', description: 'Print point: 1pt = 1/72 of an inch (≈1.333px)', toPx: v => v * (96 / 72), fromPx: v => v / (96 / 72) },
  { symbol: 'pc', label: 'Picas', category: 'absolute', description: 'Print pica: 1pc = 12pt = 16px', toPx: v => v * 16, fromPx: v => v / 16 },
  { symbol: 'cm', label: 'Centimeters', category: 'absolute', description: '1cm ≈ 37.795px @ 96dpi', toPx: v => v * 37.79527559, fromPx: v => v / 37.79527559 },
  { symbol: 'mm', label: 'Millimeters', category: 'absolute', description: '1mm ≈ 3.78px @ 96dpi', toPx: v => v * 3.779527559, fromPx: v => v / 3.779527559 },
  { symbol: 'in', label: 'Inches', category: 'absolute', description: '1in = 96px @ 96dpi standard screen', toPx: v => v * 96, fromPx: v => v / 96 },
  // Font-relative units
  { symbol: 'rem', label: 'Root EM', category: 'font-relative', description: 'Relative to root (<html>) font-size', toPx: (v, c) => v * c.baseFontSize, fromPx: (px, c) => px / c.baseFontSize },
  { symbol: 'em', label: 'EM', category: 'font-relative', description: 'Relative to parent element font-size', toPx: (v, c) => v * c.baseFontSize, fromPx: (px, c) => px / c.baseFontSize },
  { symbol: 'ex', label: 'EX (x-height)', category: 'font-relative', description: 'Height of lowercase "x" (~0.5em)', toPx: (v, c) => v * c.baseFontSize * 0.5, fromPx: (px, c) => px / (c.baseFontSize * 0.5) },
  { symbol: 'ch', label: 'CH (char width)', category: 'font-relative', description: 'Width of "0" character (~0.5em for monospace)', toPx: (v, c) => v * c.baseFontSize * 0.5, fromPx: (px, c) => px / (c.baseFontSize * 0.5) },
  { symbol: 'lh', label: 'Line Height', category: 'font-relative', description: 'Computed line-height of the element', toPx: (v, c) => v * c.baseFontSize * 1.5, fromPx: (px, c) => px / (c.baseFontSize * 1.5) },
  { symbol: 'rlh', label: 'Root LH', category: 'font-relative', description: 'Line-height of root element', toPx: (v, c) => v * c.baseFontSize * 1.5, fromPx: (px, c) => px / (c.baseFontSize * 1.5) },
  { symbol: 'rex', label: 'Root EX', category: 'font-relative', description: 'x-height of root element', toPx: (v, c) => v * c.baseFontSize * 0.5, fromPx: (px, c) => px / (c.baseFontSize * 0.5) },
  { symbol: 'rch', label: 'Root CH', category: 'font-relative', description: 'Character width of root element', toPx: (v, c) => v * c.baseFontSize * 0.5, fromPx: (px, c) => px / (c.baseFontSize * 0.5) },
  // Viewport units
  { symbol: 'vw', label: 'VW', category: 'viewport', description: '1% of viewport width', toPx: (v, c) => (v / 100) * c.viewportWidth, fromPx: (px, c) => (px / c.viewportWidth) * 100 },
  { symbol: 'vh', label: 'VH', category: 'viewport', description: '1% of viewport height', toPx: (v, c) => (v / 100) * c.viewportHeight, fromPx: (px, c) => (px / c.viewportHeight) * 100 },
  { symbol: 'vmin', label: 'Vmin', category: 'viewport', description: '1% of the smaller viewport dimension', toPx: (v, c) => (v / 100) * Math.min(c.viewportWidth, c.viewportHeight), fromPx: (px, c) => (px / Math.min(c.viewportWidth, c.viewportHeight)) * 100 },
  { symbol: 'vmax', label: 'Vmax', category: 'viewport', description: '1% of the larger viewport dimension', toPx: (v, c) => (v / 100) * Math.max(c.viewportWidth, c.viewportHeight), fromPx: (px, c) => (px / Math.max(c.viewportWidth, c.viewportHeight)) * 100 },
  { symbol: 'dvw', label: 'DVW (dynamic)', category: 'viewport', description: 'Dynamic viewport width (accounts for mobile UI)', toPx: (v, c) => (v / 100) * c.viewportWidth, fromPx: (px, c) => (px / c.viewportWidth) * 100 },
  { symbol: 'dvh', label: 'DVH (dynamic)', category: 'viewport', description: 'Dynamic viewport height (accounts for url bar)', toPx: (v, c) => (v / 100) * c.viewportHeight, fromPx: (px, c) => (px / c.viewportHeight) * 100 },
  { symbol: 'svw', label: 'SVW (small)', category: 'viewport', description: 'Smallest possible viewport width', toPx: (v, c) => (v / 100) * c.viewportWidth, fromPx: (px, c) => (px / c.viewportWidth) * 100 },
  { symbol: 'svh', label: 'SVH (small)', category: 'viewport', description: 'Smallest possible viewport height (url bar visible)', toPx: (v, c) => (v / 100) * c.viewportHeight, fromPx: (px, c) => (px / c.viewportHeight) * 100 },
  { symbol: 'lvw', label: 'LVW (large)', category: 'viewport', description: 'Largest possible viewport width', toPx: (v, c) => (v / 100) * c.viewportWidth, fromPx: (px, c) => (px / c.viewportWidth) * 100 },
  { symbol: 'lvh', label: 'LVH (large)', category: 'viewport', description: 'Largest possible viewport height (url bar hidden)', toPx: (v, c) => (v / 100) * c.viewportHeight, fromPx: (px, c) => (px / c.viewportHeight) * 100 },
];

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { label: 'Root font-size', value: '16', unit: 'px' },
  { label: 'Common body text', value: '18', unit: 'px' },
  { label: 'Large heading', value: '48', unit: 'px' },
  { label: 'Full viewport width', value: '100', unit: 'vw' },
  { label: 'Full viewport height', value: '100', unit: 'vh' },
  { label: 'Hero section height', value: '80', unit: 'vh' },
  { label: 'Half viewport width', value: '50', unit: 'vw' },
  { label: 'Mobile breakpoint', value: '768', unit: 'px' },
  { label: 'Desktop breakpoint', value: '1024', unit: 'px' },
  { label: 'Wide breakpoint', value: '1440', unit: 'px' },
  { label: 'Gap / spacing', value: '1', unit: 'rem' },
  { label: 'Border radius', value: '0.5', unit: 'rem' },
  { label: 'Container padding', value: '2', unit: 'rem' },
  { label: 'Icon size', value: '24', unit: 'px' },
];

// ── Predefined font-size presets ───────────────────────────────────────────

const FONT_SIZE_PRESETS = [
  { label: 'Browser default', value: 16 },
  { label: '10px (62.5%)', value: 10 },
  { label: '14px', value: 14 },
  { label: '18px', value: 18 },
  { label: '20px', value: 20 },
];

const VIEWPORT_PRESETS = [
  { label: 'Desktop (1920×1080)', w: 1920, h: 1080 },
  { label: 'Laptop (1440×900)', w: 1440, h: 900 },
  { label: 'Tablet (768×1024)', w: 768, h: 1024 },
  { label: 'Mobile (375×812)', w: 375, h: 812 },
  { label: 'Mobile S (320×568)', w: 320, h: 568 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (Math.abs(n) < 0.001) return '0';
  if (Math.abs(n) < 0.01) return n.toFixed(4);
  if (Math.abs(n) < 1) return n.toFixed(3);
  if (Math.abs(n) < 100) return n.toFixed(2);
  if (Math.abs(n) < 1000) return n.toFixed(1);
  return Math.round(n).toLocaleString();
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssUnitConverterPage() {
  const [inputValue, setInputValue] = useState('16');
  const [inputUnit, setInputUnit] = useState('px');
  const [baseFontSize, setBaseFontSize] = useState(16);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [showConfig, setShowConfig] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Auto-detect viewport dimensions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    }
  }, []);

  const config: ConverterConfig = useMemo(() => ({
    baseFontSize,
    viewportWidth,
    viewportHeight,
  }), [baseFontSize, viewportWidth, viewportHeight]);

  const parsedValue = useMemo(() => parseFloat(inputValue), [inputValue]);
  const isValid = !isNaN(parsedValue) && parsedValue >= 0;

  const results: Result[] = useMemo(() => {
    if (!isValid) return [];

    const inputUnitDef = CSS_UNITS.find(u => u.symbol === inputUnit);
    if (!inputUnitDef) return [];

    const pxValue = inputUnitDef.toPx(parsedValue, config);

    return CSS_UNITS.map(unit => ({
      symbol: unit.symbol,
      label: unit.label,
      category: unit.category,
      description: unit.description,
      value: unit.fromPx(pxValue, config),
      formatted: formatNumber(unit.fromPx(pxValue, config)),
      isInput: unit.symbol === inputUnit,
    }));
  }, [isValid, inputUnit, config, parsedValue]);

  const pxValue = useMemo(() => {
    if (!isValid) return null;
    const inputUnitDef = CSS_UNITS.find(u => u.symbol === inputUnit);
    if (!inputUnitDef) return null;
    return inputUnitDef.toPx(parsedValue, config);
  }, [isValid, inputUnit, parsedValue, config]);

  const copyValue = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Copied: ${text}`),
      () => toast.error('Failed to copy')
    );
  }, []);

  const categoryGroups = useMemo(() => {
    return [
      { id: 'absolute', label: 'Absolute', icon: Ruler, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
      { id: 'font-relative', label: 'Font-Relative', icon: Type, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
      { id: 'viewport', label: 'Viewport', icon: Monitor, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    ];
  }, []);

  return (
    <ToolLayout
      title="CSS Unit Converter"
      description="Convert between px, rem, em, vw, vh, and every CSS unit — with configurable font size and viewport dimensions. All in the browser, no backend needed."
    >
      {/* Input Section */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              min={0}
              step="any"
              placeholder="Enter value..."
              className="input-field flex-1 text-lg font-mono"
            />
            <select
              value={inputUnit}
              onChange={(e) => setInputUnit(e.target.value)}
              className="input-field w-28 font-mono"
            >
              {CSS_UNITS.map(unit => (
                <option key={unit.symbol} value={unit.symbol}>{unit.symbol}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`btn-secondary flex items-center gap-1.5 text-sm shrink-0 ${showConfig ? 'bg-brand-400/10 border-brand-400/30' : ''}`}
          >
            <Settings className="w-4 h-4" />
            {showConfig ? 'Hide Config' : 'Configure'}
          </button>
        </div>

        {/* Presets */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => { setInputValue(preset.value); setInputUnit(preset.unit); }}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                inputValue === preset.value && inputUnit === preset.unit
                  ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-slate-500/50 hover:text-slate-300'
              }`}
            >
              {preset.value}{preset.unit}: {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="card mb-6 border-brand-400/20">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-400" />
            Conversion Settings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Base Font Size */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                Root Font Size (rem/em)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={baseFontSize}
                  onChange={(e) => setBaseFontSize(Number(e.target.value) || 16)}
                  className="input-field w-20 text-center font-mono"
                />
                <span className="text-slate-400 text-sm">px</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {FONT_SIZE_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setBaseFontSize(p.value)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      baseFontSize === p.value
                        ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50 hover:text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport Width */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <Maximize className="w-3.5 h-3.5" />
                Viewport Width (vw)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={100}
                  max={7680}
                  value={viewportWidth}
                  onChange={(e) => setViewportWidth(Number(e.target.value) || 1440)}
                  className="input-field w-24 text-center font-mono"
                />
                <span className="text-slate-400 text-sm">px</span>
              </div>
            </div>

            {/* Viewport Height */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <Maximize className="w-3.5 h-3.5 rotate-90" />
                Viewport Height (vh)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={100}
                  max={4320}
                  value={viewportHeight}
                  onChange={(e) => setViewportHeight(Number(e.target.value) || 900)}
                  className="input-field w-24 text-center font-mono"
                />
                <span className="text-slate-400 text-sm">px</span>
              </div>
            </div>
          </div>

          {/* Viewport Presets */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {VIEWPORT_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setViewportWidth(p.w); setViewportHeight(p.h); }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  viewportWidth === p.w && viewportHeight === p.h
                    ? 'bg-purple-400/20 text-purple-400 border border-purple-400/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50 hover:text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversion Summary */}
      {isValid && pxValue !== null && (
        <div className="card mb-6 bg-brand-400/5 border-brand-400/20">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-brand-400 shrink-0" />
            <div className="text-sm">
              <span className="font-mono font-bold text-white">
                {parsedValue}{inputUnit}
              </span>
              <span className="text-slate-400 mx-2">=</span>
              <span className="font-mono font-bold text-brand-400">
                {formatNumber(pxValue)}px
              </span>
            </div>
            <button
              onClick={() => copyValue(`${formatNumber(pxValue)}px`)}
              className="btn-secondary flex items-center gap-1 text-xs py-1 px-2 ml-auto"
            >
              <Copy className="w-3 h-3" />
              Copy px
            </button>
          </div>
        </div>
      )}

      {/* Results by Category */}
      <div className="space-y-6">
        {categoryGroups.map(group => {
          const groupResults = results.filter(r => r.category === group.id);
          if (groupResults.length === 0) return null;
          const GroupIcon = group.icon;

          return (
            <div key={group.id} className="card">
              <button
                onClick={() => setActiveCategory(activeCategory === group.id ? null : group.id)}
                className="flex items-center gap-2 w-full text-left mb-1"
              >
                <div className={`p-1.5 rounded-md ${group.bg}`}>
                  <GroupIcon className={`w-4 h-4 ${group.color}`} />
                </div>
                <h3 className="text-white font-semibold text-sm">{group.label}</h3>
                <span className="text-xs text-slate-500 ml-2">{groupResults.length} units</span>
                <span className="ml-auto text-slate-500 text-xs">
                  {activeCategory === group.id ? 'Hide' : 'Show'}
                </span>
              </button>

              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 ${
                activeCategory === group.id ? '' : 'hidden'
              }`}>
                {groupResults.map(result => (
                  <button
                    key={result.symbol}
                    onClick={() => copyValue(`${result.formatted}${result.symbol}`)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left group ${
                      result.isInput
                        ? 'bg-brand-400/10 border-brand-400/30 cursor-default'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-500/50 cursor-pointer'
                    }`}
                    title={result.description}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-white truncate">
                        {result.formatted}
                        <span className={`${result.isInput ? 'text-brand-400' : 'text-slate-500'}`}>
                          {result.symbol}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {result.label}
                        {result.isInput && (
                          <span className="text-brand-400 ml-1">(input)</span>
                        )}
                      </div>
                    </div>
                    {!result.isInput && (
                      <Copy className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!isValid && inputValue !== '' && (
        <div className="card border-red-400/20 bg-red-400/5">
          <p className="text-red-400 text-sm">Please enter a valid non-negative number.</p>
        </div>
      )}

      {isValid && (
        <div className="mt-8 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">About CSS Units</h3>
          <div className="text-xs text-slate-500 space-y-1">
            <p><strong>Absolute</strong> — Fixed sizes regardless of context: px, pt, pc, cm, mm, in. Use px for precise control, in/cm for print stylesheets.</p>
            <p><strong>Font-relative</strong> — Scale with font-size: rem (root em), em (parent em), ex/ch (glyph metrics), lh/rlh (line height). Prefer rem for consistent spacing.</p>
            <p><strong>Viewport</strong> — Scale with browser window: vw/vh (percentage of viewport), vmin/vmax (min/max dimension), dynamic units (dvw/dvh/svw/svh/lvw/lvh) for mobile-friendly layouts.</p>
            <p><strong>Pro tip:</strong> Use <code className="text-brand-400 bg-brand-400/10 px-1 rounded">rem</code> for most sizing so everything scales when users change their default font size.</p>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
