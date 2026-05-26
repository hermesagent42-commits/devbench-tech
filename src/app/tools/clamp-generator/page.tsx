'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Ruler, ArrowUpDown, Gauge, Sparkles, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClampConfig {
  minValue: number;
  maxValue: number;
  minViewport: number;
  maxViewport: number;
  unit: string;
}

interface Preset {
  name: string;
  description: string;
  config: ClampConfig;
}

const PRESETS: Preset[] = [
  {
    name: 'Body Text',
    description: 'Fluid paragraph text — 16px on mobile, 20px on desktop',
    config: { minValue: 16, maxValue: 20, minViewport: 360, maxViewport: 1440, unit: 'px' },
  },
  {
    name: 'Hero Heading',
    description: 'Large responsive heading — 32px mobile, 72px desktop',
    config: { minValue: 32, maxValue: 72, minViewport: 360, maxViewport: 1440, unit: 'px' },
  },
  {
    name: 'Section Spacing',
    description: 'Vertical rhythm — 40px padding on mobile, 120px on desktop',
    config: { minValue: 40, maxValue: 120, minViewport: 360, maxViewport: 1440, unit: 'px' },
  },
  {
    name: 'Card Padding',
    description: 'Responsive card padding — 16px on mobile, 32px on desktop',
    config: { minValue: 16, maxValue: 32, minViewport: 360, maxViewport: 1440, unit: 'px' },
  },
  {
    name: 'Container Width',
    description: 'Fluid container — 90% on mobile, but capped at 1200px on desktop',
    config: { minValue: 340, maxValue: 1200, minViewport: 360, maxViewport: 1440, unit: 'px' },
  },
  {
    name: 'Small Heading (rem)',
    description: 'Fluid h2 — 1.5rem mobile, 2.5rem desktop',
    config: { minValue: 1.5, maxValue: 2.5, minViewport: 360, maxViewport: 1440, unit: 'rem' },
  },
  {
    name: 'Gap / Gutter',
    description: 'Fluid grid gap — 12px on mobile, 32px on desktop',
    config: { minValue: 12, maxValue: 32, minViewport: 360, maxViewport: 1440, unit: 'px' },
  },
  {
    name: 'Border Radius',
    description: 'Fluid rounding — 4px on mobile, 16px on desktop',
    config: { minValue: 4, maxValue: 16, minViewport: 360, maxViewport: 1440, unit: 'px' },
  },
];

const UNITS = ['px', 'rem', 'em', 'vw', 'vh', 'vmin', 'vmax', '%', 'ch', 'ex', 'pt', 'cm', 'mm'];

const DEFAULT: ClampConfig = {
  minValue: 16,
  maxValue: 48,
  minViewport: 360,
  maxViewport: 1440,
  unit: 'px',
};

function clampCss(config: ClampConfig): string {
  const { minValue, maxValue, minViewport, maxViewport, unit } = config;

  // Compute the preferred value: slope * 100vw + intercept
  const slope = (maxValue - minValue) / (maxViewport - minViewport);
  const intercept = minValue - slope * minViewport;

  const slopeRounded = Math.round(slope * 1_000_000) / 1_000_000;
  const interceptRounded = Math.round(intercept * 1000) / 1000;

  const slopeUnit = slopeRounded * 100;
  const slopeRoundedPct = Math.round(slopeUnit * 10000) / 10000;

  return `clamp(${minValue}${unit}, ${slopeRoundedPct}vw + ${interceptRounded}${unit}, ${maxValue}${unit})`;
}

function valueAtViewport(config: ClampConfig, viewport: number): number {
  const { minValue, maxValue, minViewport, maxViewport } = config;
  if (viewport <= minViewport) return minValue;
  if (viewport >= maxViewport) return maxValue;
  const t = (viewport - minViewport) / (maxViewport - minViewport);
  return minValue + t * (maxValue - minValue);
}

function formatNumber(n: number, precision: number = 2): string {
  if (Math.abs(n) < 0.01 && n !== 0) return n.toExponential(2);
  return n.toFixed(precision);
}

export default function ClampGeneratorPage() {
  const [config, setConfig] = useState<ClampConfig>(DEFAULT);
  const [previewVp, setPreviewVp] = useState(800);
  const [showFormula, setShowFormula] = useState(false);

  const cssValue = useMemo(() => clampCss(config), [config]);
  const currentValue = useMemo(() => valueAtViewport(config, previewVp), [config, previewVp]);

  const handlePreset = useCallback((preset: Preset) => {
    setConfig({ ...preset.config });
    setPreviewVp(Math.round((preset.config.minViewport + preset.config.maxViewport) / 2));
    toast.success(`Loaded "${preset.name}" preset`);
  }, []);

  const handleReset = useCallback(() => {
    setConfig(DEFAULT);
    setPreviewVp(800);
    toast.success('Reset to defaults');
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(cssValue);
    toast.success('Copied!');
  }, [cssValue]);

  const updateConfig = useCallback((key: keyof ClampConfig, value: number | string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Derived values for display
  const slope = useMemo(() => {
    const { minValue, maxValue, minViewport, maxViewport } = config;
    return (maxValue - minValue) / (maxViewport - minViewport);
  }, [config]);

  const slopePctUnit = useMemo(() => Math.round(slope * 100 * 10000) / 10000, [slope]);
  const interceptVal = useMemo(() => {
    const { minValue, minViewport } = config;
    return Math.round((minValue - slope * minViewport) * 1000) / 1000;
  }, [config, slope]);

  const vpMid = Math.round((config.minViewport + config.maxViewport) / 2);
  const vpRange = config.maxViewport - config.minViewport;

  // Generate preview data points
  const previewPoints = useMemo(() => {
    const points: { vp: number; val: number }[] = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const vp = Math.round(config.minViewport + (vpRange * i) / steps);
      points.push({ vp, val: valueAtViewport(config, vp) });
    }
    return points;
  }, [config, vpRange]);

  // Scale for SVG
  const chartW = 600;
  const chartH = 200;
  const padX = 50;
  const padY = 20;

  const chartPoints = useMemo(() => {
    if (previewPoints.length < 2) return '';
    const xScale = (chartW - padX * 2) / (vpRange || 1);
    const yMin = config.minValue;
    const yMax = config.maxValue;
    const yRange = yMax - yMin || 1;
    const yScale = (chartH - padY * 2) / yRange;

    return previewPoints
      .map((p) => {
        const x = padX + (p.vp - config.minViewport) * xScale;
        const y = chartH - padY - (p.val - yMin) * yScale;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [previewPoints, config, chartW, chartH, padX, padY, vpRange]);

  const sliderPct = useMemo(() => {
    return ((previewVp - config.minViewport) / (vpRange || 1)) * 100;
  }, [previewVp, config.minViewport, vpRange]);

  // Common viewport width breakpoints for quick jumps
  const quickVps = useMemo(() => {
    const common = [360, 480, 768, 1024, 1280, 1440];
    return common.filter(
      (vp) => vp >= config.minViewport - 100 && vp <= config.maxViewport + 100
    );
  }, [config.minViewport, config.maxViewport]);

  return (
    <ToolLayout
      title="CSS clamp() Generator"
      description="Build fluid responsive values with clamp() — no more media queries for typography, spacing, or sizing. Visual preview, curve chart, one-click copy."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Quick load:</span>
          {PRESETS.slice(0, 5).map((p) => (
            <button
              key={p.name}
              onClick={() => handlePreset(p)}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 transition-colors border border-slate-600/30"
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="ml-auto px-2.5 py-1 text-xs rounded-md bg-slate-700/60 hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors border border-slate-600/30 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Config Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Min Value
            </label>
            <input
              type="number"
              value={config.minValue}
              onChange={(e) => updateConfig('minValue', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              step="any"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Max Value
            </label>
            <input
              type="number"
              value={config.maxValue}
              onChange={(e) => updateConfig('maxValue', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              step="any"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Min Viewport (px)
            </label>
            <input
              type="number"
              value={config.minViewport}
              onChange={(e) => updateConfig('minViewport', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              min={100}
              max={config.maxViewport - 100}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Max Viewport (px)
            </label>
            <input
              type="number"
              value={config.maxViewport}
              onChange={(e) => updateConfig('maxViewport', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              min={config.minViewport + 100}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 font-medium">Unit</label>
            <select
              value={config.unit}
              onChange={(e) => updateConfig('unit', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generated CSS */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Generated CSS
            </h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/30 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <code className="block font-mono text-base text-brand-300 bg-slate-900/60 rounded-lg px-4 py-3 break-all">
            {cssValue}
          </code>
          <p className="mt-2 text-xs text-slate-500">
            Tip: Use this for <code className="text-slate-400">font-size</code>, <code className="text-slate-400">padding</code>, <code className="text-slate-400">margin</code>, <code className="text-slate-400">gap</code>, <code className="text-slate-400">width</code>, or any numeric CSS property.
          </p>
        </div>

        {/* Interactive Preview */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            Live Preview — Drag the slider to see the value at any viewport width
          </h3>

          {/* Visual bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{config.minViewport}px</span>
              <span className="text-slate-400 font-medium">
                Current: <span className="text-emerald-400">{previewVp}px</span> →{' '}
                <span className="text-brand-400 font-bold text-sm">
                  {formatNumber(currentValue)}
                  {config.unit}
                </span>
              </span>
              <span>{config.maxViewport}px</span>
            </div>

            <div className="relative">
              {/* Gradient bar showing the range */}
              <div
                className="h-3 rounded-full"
                style={{
                  background: `linear-gradient(to right, #6366f1, #a855f7, #ec4899)`,
                }}
              />
              {/* Slider */}
              <input
                type="range"
                min={config.minViewport}
                max={config.maxViewport}
                value={previewVp}
                onChange={(e) => setPreviewVp(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
                style={{ WebkitAppearance: 'none', appearance: 'none' }}
              />
              {/* Thumb indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-brand-500 pointer-events-none transition-all"
                style={{ left: `calc(${sliderPct}% - 10px)` }}
              />
            </div>
          </div>

          {/* Quick jump viewports */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs text-slate-500">Jump to:</span>
            {quickVps.map((vp) => (
              <button
                key={vp}
                onClick={() => setPreviewVp(vp)}
                className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                  previewVp === vp
                    ? 'bg-brand-600/30 border-brand-500 text-brand-300'
                    : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {vp}px
              </button>
            ))}
          </div>

          {/* Visual demo — text that scales */}
          <div className="bg-slate-900/80 rounded-lg p-6 flex flex-col items-center justify-center min-h-[120px]">
            <div className="text-center">
              <p className="text-slate-500 text-xs mb-2">Preview text at {config.unit}</p>
              <p
                className="font-bold text-white transition-all duration-75"
                style={{ fontSize: `${currentValue}${config.unit}` }}
              >
                Fluid Text
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-auto max-w-full"
              style={{ minHeight: chartH }}
            >
              {/* Grid lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = padY + ((chartH - padY * 2) * i) / 4;
                const val = config.maxValue - ((config.maxValue - config.minValue) * i) / 4;
                return (
                  <g key={i}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={chartW - padX}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="0.5"
                      strokeDasharray="4,4"
                    />
                    <text x={padX - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#64748b">
                      {formatNumber(val)}
                    </text>
                  </g>
                );
              })}
              {/* Chart line */}
              {chartPoints && (
                <polyline
                  points={chartPoints}
                  fill="none"
                  stroke="url(#clampGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Gradient definition */}
              <defs>
                <linearGradient id="clampGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              {/* X axis labels */}
              <text x={padX} y={chartH - 2} textAnchor="middle" fill="#64748b" fontSize="10">
                {config.minViewport}px
              </text>
              <text x={chartW - padX} y={chartH - 2} textAnchor="middle" fill="#64748b" fontSize="10">
                {config.maxViewport}px
              </text>
              <text x={chartW / 2} y={chartH - 2} textAnchor="middle" fill="#475569" fontSize="10">
                Viewport Width
              </text>
              {/* Y axis label */}
              <text
                x={12}
                y={chartH / 2}
                textAnchor="middle"
                fill="#475569"
                fontSize="10"
                transform={`rotate(-90, 12, ${chartH / 2})`}
              >
                Value ({config.unit})
              </text>
            </svg>
          </div>
        </div>

        {/* Formula Explanation */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
          >
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              How the Math Works
            </h3>
            <span className="text-xs text-slate-500">
              {showFormula ? 'Hide' : 'Show'} explanation
            </span>
          </button>

          {showFormula && (
            <div className="px-5 pb-5 space-y-4 text-sm text-slate-400 border-t border-slate-700/50 pt-4">
              <p>
                The <code className="text-slate-300">clamp()</code> function takes three arguments:{' '}
                <code className="text-brand-300">clamp(MIN, PREFERRED, MAX)</code>. The browser uses the
                preferred value, but clamps it between MIN and MAX.
              </p>

              <div className="space-y-2">
                <div className="bg-slate-900/60 rounded-lg p-3 text-xs font-mono">
                  <p className="text-slate-400 mb-1">Step 1 — Calculate the slope:</p>
                  <p className="text-brand-300">
                    slope = ({config.maxValue} - {config.minValue}) / ({config.maxViewport} -{' '}
                    {config.minViewport}) = {formatNumber(slope, 6)}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-3 text-xs font-mono">
                  <p className="text-slate-400 mb-1">Step 2 — Calculate the intercept:</p>
                  <p className="text-brand-300">
                    intercept = {config.minValue} - ({formatNumber(slope, 6)} × {config.minViewport}) ={' '}
                    {formatNumber(interceptVal)}
                    {config.unit}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-3 text-xs font-mono">
                  <p className="text-slate-400 mb-1">Step 3 — Convert slope to vw units:</p>
                  <p className="text-brand-300">
                    preferred = ({formatNumber(slope, 6)} × 100)vw + {formatNumber(interceptVal)}
                    {config.unit}
                    <br />
                    <span className="text-slate-500">= {formatNumber(slopePctUnit)}vw + {formatNumber(interceptVal)}{config.unit}</span>
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-3 text-xs font-mono">
                  <p className="text-slate-400 mb-1">Step 4 — Assemble:</p>
                  <p className="text-emerald-400 break-all">{cssValue}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                At {config.minViewport}px viewport, the value is clamped to the minimum (
                {config.minValue}
                {config.unit}). At {config.maxViewport}px, it&apos;s capped at{' '}
                {config.maxValue}
                {config.unit}. Between those widths, it scales linearly.
              </p>
            </div>
          )}
        </div>

        {/* Presets full grid */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-400" />
            All Presets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handlePreset(p)}
                className="text-left p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-brand-500/40 hover:bg-slate-700/30 transition-all group"
              >
                <p className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                <p className="text-xs font-mono text-slate-600 mt-1">
                  {p.config.minValue} → {p.config.maxValue}
                  {p.config.unit}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
