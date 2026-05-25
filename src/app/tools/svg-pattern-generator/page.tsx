'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, Grid3X3, PaintBucket } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type PatternType =
  | 'dots'
  | 'grid'
  | 'crosshatch'
  | 'hexagons'
  | 'waves'
  | 'zigzag'
  | 'triangles'
  | 'circles'
  | 'diamonds'
  | 'diagonal-lines'
  | 'polka-dots'
  | 'checkerboard';

interface PatternConfig {
  type: PatternType;
  fgColor: string;
  bgColor: string;
  size: number;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  spacing: number;
}

interface Preset {
  name: string;
  description: string;
  config: PatternConfig;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Subtle Dots',
    description: 'Clean dot grid — perfect for SaaS landing pages',
    config: { type: 'dots', fgColor: '#ffffff', bgColor: '#0f172a', size: 2, strokeWidth: 1, opacity: 0.08, rotation: 0, spacing: 24 },
  },
  {
    name: 'Blueprint Grid',
    description: 'Engineering feel with thin crosshatch lines',
    config: { type: 'grid', fgColor: '#3b82f6', bgColor: '#0b1120', size: 4, strokeWidth: 0.5, opacity: 0.15, rotation: 0, spacing: 20 },
  },
  {
    name: 'Diagonal Stripe',
    description: 'Sporty diagonal lines — great for hero sections',
    config: { type: 'diagonal-lines', fgColor: '#ffffff', bgColor: '#1e293b', size: 8, strokeWidth: 2, opacity: 0.06, rotation: 0, spacing: 0 },
  },
  {
    name: 'Hexagon Mesh',
    description: 'Geometric honeycomb — data viz or tech pages',
    config: { type: 'hexagons', fgColor: '#6366f1', bgColor: '#0f172a', size: 28, strokeWidth: 1, opacity: 0.12, rotation: 0, spacing: 0 },
  },
  {
    name: 'Chevron Wave',
    description: 'Zigzag pattern with energy — banners and CTA sections',
    config: { type: 'zigzag', fgColor: '#22d3ee', bgColor: '#0c1a2e', size: 32, strokeWidth: 1.5, opacity: 0.2, rotation: 0, spacing: 0 },
  },
  {
    name: 'Polka Party',
    description: 'Playful staggered dots — creative portfolios',
    config: { type: 'polka-dots', fgColor: '#f472b6', bgColor: '#1e1b4b', size: 10, strokeWidth: 1, opacity: 0.25, rotation: 0, spacing: 0 },
  },
  {
    name: 'Checkerboard',
    description: 'Classic checkerboard — retro or game vibes',
    config: { type: 'checkerboard', fgColor: '#a78bfa', bgColor: '#0f0a1e', size: 16, strokeWidth: 1, opacity: 0.15, rotation: 0, spacing: 0 },
  },
  {
    name: 'Circuit Traces',
    description: 'Thin horizontal lines with breaks — tech minimalism',
    config: { type: 'waves', fgColor: '#10b981', bgColor: '#0a1a14', size: 40, strokeWidth: 0.5, opacity: 0.18, rotation: 0, spacing: 0 },
  },
  {
    name: 'Diamond Tiles',
    description: 'Elegant diamond repeats — luxury/real estate',
    config: { type: 'diamonds', fgColor: '#fbbf24', bgColor: '#1c1917', size: 36, strokeWidth: 1, opacity: 0.1, rotation: 0, spacing: 0 },
  },
  {
    name: 'Crosshatch Fabric',
    description: 'Dense fabric texture — editorial/print feel',
    config: { type: 'crosshatch', fgColor: '#ffffff', bgColor: '#18181b', size: 12, strokeWidth: 0.5, opacity: 0.08, rotation: 0, spacing: 0 },
  },
  {
    name: 'Concentric Circles',
    description: 'Overlapping circle ripples — audio/tech brands',
    config: { type: 'circles', fgColor: '#ec4899', bgColor: '#0f0a18', size: 48, strokeWidth: 1, opacity: 0.1, rotation: 0, spacing: 0 },
  },
  {
    name: 'Triangles Mesh',
    description: 'Dense triangular tessellation — gaming/cyberpunk',
    config: { type: 'triangles', fgColor: '#06b6d4', bgColor: '#0a1628', size: 30, strokeWidth: 0.5, opacity: 0.18, rotation: 0, spacing: 0 },
  },
];

const DEFAULT: PatternConfig = {
  type: 'dots',
  fgColor: '#ffffff',
  bgColor: '#0f172a',
  size: 2,
  strokeWidth: 1,
  opacity: 0.08,
  rotation: 0,
  spacing: 24,
};

const PATTERN_LABELS: Record<PatternType, string> = {
  dots: 'Dots',
  grid: 'Grid',
  crosshatch: 'Crosshatch',
  hexagons: 'Hexagons',
  waves: 'Waves',
  zigzag: 'Zigzag',
  triangles: 'Triangles',
  circles: 'Circles',
  diamonds: 'Diamonds',
  'diagonal-lines': 'Diagonal Lines',
  'polka-dots': 'Polka Dots',
  checkerboard: 'Checkerboard',
};

// ── SVG Pattern Generators ─────────────────────────────────────────────────

function generatePatternSVG(cfg: PatternConfig): string {
  const { type, fgColor, bgColor, size, strokeWidth, opacity, rotation, spacing: sp } = cfg;
  const halfSize = size / 2;
  const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
  const fg = fgColor + opacityHex;
  const sw = strokeWidth;

  let svgContent = '';

  // Compute actual pattern dimensions based on type
  let pw = size;
  let ph = size;

  switch (type) {
    case 'dots': {
      pw = sp || size;
      ph = sp || size;
      svgContent = `<circle cx="${pw / 2}" cy="${ph / 2}" r="${halfSize}" fill="${fg}"/>`;
      break;
    }
    case 'grid': {
      pw = sp || size;
      ph = sp || size;
      const halfPw = pw / 2;
      const halfPh = ph / 2;
      svgContent = `<rect x="0" y="0" width="${pw}" height="${ph}" fill="none" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'crosshatch': {
      const gap = sp || size;
      pw = gap;
      ph = gap;
      svgContent = `<line x1="0" y1="0" x2="${pw}" y2="${ph}" stroke="${fg}" stroke-width="${sw}"/><line x1="${pw}" y1="0" x2="0" y2="${ph}" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'hexagons': {
      const hexH = size * Math.sqrt(3);
      const hexW = size * 2;
      pw = hexW;
      ph = hexH;
      const cx = hexW / 2;
      const cy = hexH / 2;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
      }
      svgContent = `<polygon points="${pts.join(' ')}" fill="none" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'waves': {
      pw = size;
      ph = size;
      const amp = halfSize;
      const midY = ph / 2;
      svgContent = `<path d="M0,${midY} Q${pw * 0.25},${midY - amp} ${pw * 0.5},${midY} Q${pw * 0.75},${midY + amp} ${pw},${midY}" fill="none" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'zigzag': {
      pw = size;
      ph = size;
      const segW = pw / 4;
      const amp = halfSize;
      const midY = ph / 2;
      svgContent = `<polyline points="0,${midY + amp} ${segW},${midY - amp} ${segW * 2},${midY + amp} ${segW * 3},${midY - amp} ${pw},${midY + amp}" fill="none" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'triangles': {
      const triH = size * (Math.sqrt(3) / 2);
      pw = size;
      ph = triH;
      svgContent = `<polygon points="${pw / 2},0 ${pw},${ph} 0,${ph}" fill="none" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'circles': {
      pw = size;
      ph = size;
      const cx = pw / 2;
      const cy = ph / 2;
      svgContent = `<circle cx="${cx}" cy="${cy}" r="${halfSize - sw}" fill="none" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'diamonds': {
      pw = size;
      ph = size;
      svgContent = `<polygon points="${pw / 2},0 ${pw},${ph / 2} ${pw / 2},${ph} 0,${ph / 2}" fill="none" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'diagonal-lines': {
      const gap = sp || size;
      pw = gap;
      ph = gap;
      svgContent = `<line x1="0" y1="0" x2="${pw}" y2="${ph}" stroke="${fg}" stroke-width="${sw}"/>`;
      break;
    }
    case 'polka-dots': {
      pw = size * 2;
      ph = size * 2;
      const r = size / 2;
      svgContent = `<circle cx="${r}" cy="${r}" r="${r}" fill="${fg}"/><circle cx="${pw}" cy="${ph}" r="${r}" fill="${fg}"/><circle cx="${pw}" cy="0" r="${r}" fill="${fg}"/><circle cx="0" cy="${ph}" r="${r}" fill="${fg}"/>`;
      break;
    }
    case 'checkerboard': {
      pw = size * 2;
      ph = size * 2;
      svgContent = `<rect x="0" y="0" width="${size}" height="${size}" fill="${fg}"/><rect x="${size}" y="${size}" width="${size}" height="${size}" fill="${fg}"/>`;
      break;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}">${svgContent}</svg>`;

  if (rotation !== 0) {
    const rotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><g transform="rotate(${rotation}, ${pw / 2}, ${ph / 2})">${svgContent}</g></svg>`;
    return rotSvg;
  }

  return svg;
}

function svgToDataUri(svg: string): string {
  const encoded = svg
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/{/g, '%7B')
    .replace(/}/g, '%7D')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ');
  return `url("data:image/svg+xml,${encoded}")`;
}

function generateCSS(cfg: PatternConfig): string {
  const svg = generatePatternSVG(cfg);
  const dataUri = svgToDataUri(svg);
  return [
    `.pattern-bg {`,
    `  background-color: ${cfg.bgColor};`,
    `  background-image: ${dataUri};`,
    `  background-size: auto;`,
    `}`,
  ].join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SvgPatternGeneratorPage() {
  const [cfg, setConfig] = useState<PatternConfig>(DEFAULT);
  const [activePreset, setActivePreset] = useState<string>('Subtle Dots');

  const update = useCallback(
    <K extends keyof PatternConfig>(key: K, value: PatternConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setActivePreset('');
    },
    []
  );

  const applyPreset = useCallback((preset: Preset) => {
    setConfig(preset.config);
    setActivePreset(preset.name);
    toast.success('Applied: ' + preset.name);
  }, []);

  const resetAll = useCallback(() => {
    setConfig({ ...DEFAULT });
    setActivePreset('Subtle Dots');
    toast.success('Reset to defaults');
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generateCSS(cfg)).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cfg]);

  const copySVG = useCallback(() => {
    navigator.clipboard.writeText(generatePatternSVG(cfg)).then(
      () => toast.success('SVG copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cfg]);

  const css = useMemo(() => generateCSS(cfg), [cfg]);
  const svgCode = useMemo(() => generatePatternSVG(cfg), [cfg]);
  const dataUri = useMemo(
    () => `data:image/svg+xml,${svgCode.replace(/"/g, "'").replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ')}`,
    [svgCode]
  );

  const showSpacingControl = cfg.type === 'dots' || cfg.type === 'grid' || cfg.type === 'crosshatch' || cfg.type === 'diagonal-lines';

  return (
    <ToolLayout
      title="SVG Background Pattern Generator"
      description="Create lightweight, scalable CSS background patterns with zero external dependencies. Tweak colors, spacing, opacity, and rotation — instant SVG + CSS output."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <PaintBucket className="w-4 h-4 text-brand-400" />
              Presets
            </h2>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    activePreset === p.name
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-200'
                  }`}
                  title={p.description}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pattern Type */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-brand-400" />
              Pattern Type
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(PATTERN_LABELS) as [PatternType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => update('type', type)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    cfg.type === type
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                      : 'border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Colors</h2>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1.5">Foreground Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={cfg.fgColor}
                    onChange={(e) => update('fgColor', e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-600/50 cursor-pointer bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg.fgColor}
                    onChange={(e) => update('fgColor', e.target.value)}
                    className="input-field flex-1 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1.5">Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={cfg.bgColor}
                    onChange={(e) => update('bgColor', e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-600/50 cursor-pointer bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg.bgColor}
                    onChange={(e) => update('bgColor', e.target.value)}
                    className="input-field flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">Pattern Scale</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="2"
                max="80"
                step="1"
                value={cfg.size}
                onChange={(e) => update('size', parseInt(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-14 text-right">{cfg.size}px</span>
            </div>
          </div>

          {/* Spacing (conditional) */}
          {showSpacingControl && (
            <div className="card">
              <label className="text-white font-semibold text-sm block mb-2">Spacing (pattern repeat)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="4"
                  max="120"
                  step="1"
                  value={cfg.spacing || cfg.size}
                  onChange={(e) => update('spacing', parseInt(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-white font-mono text-sm w-14 text-right">{cfg.spacing || cfg.size}px</span>
              </div>
            </div>
          )}

          {/* Stroke Width */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">Stroke Width</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.25"
                max="6"
                step="0.25"
                value={cfg.strokeWidth}
                onChange={(e) => update('strokeWidth', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-14 text-right">{cfg.strokeWidth}px</span>
            </div>
          </div>

          {/* Opacity */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">Opacity</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.02"
                max="1"
                step="0.01"
                value={cfg.opacity}
                onChange={(e) => update('opacity', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-14 text-right">{Math.round(cfg.opacity * 100)}%</span>
            </div>
          </div>

          {/* Rotation */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">Rotation</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={cfg.rotation}
                onChange={(e) => update('rotation', parseInt(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-14 text-right">{cfg.rotation}°</span>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Preview + Output Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Live Preview
            </h2>

            <div
              className="rounded-xl overflow-hidden border border-slate-700/30 min-h-[280px] flex items-center justify-center relative"
              style={{
                backgroundColor: cfg.bgColor,
                backgroundImage: `url("${dataUri}")`,
              }}
            >
              {/* Preview overlay content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-6 py-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
                  <p className="text-white/80 text-sm font-medium">Pattern Preview</p>
                  <p className="text-white/40 text-xs mt-1">{PATTERN_LABELS[cfg.type]} • {cfg.size}px • {Math.round(cfg.opacity * 100)}% opacity</p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Type', value: PATTERN_LABELS[cfg.type] },
                { label: 'Scale', value: cfg.size + 'px' },
                { label: 'Opacity', value: Math.round(cfg.opacity * 100) + '%' },
                { label: 'Rotation', value: cfg.rotation + '°' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-surface rounded-lg px-3 py-2 border border-slate-700/50 text-center"
                >
                  <div className="text-slate-500 text-[10px] uppercase tracking-wide">{s.label}</div>
                  <div className="text-white font-mono text-sm mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">CSS Output</h2>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-sm transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto max-h-44 overflow-y-auto leading-relaxed">
              <code>{css}</code>
            </pre>
          </div>

          {/* SVG Source */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">SVG Source</h2>
              <button
                onClick={copySVG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600/50 text-sm transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy SVG
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-400 overflow-x-auto max-h-44 overflow-y-auto leading-relaxed">
              <code>{svgCode}</code>
            </pre>
          </div>

          {/* How to Use */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">How to Use</h2>
            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
              <li>Choose a pattern type and tweak the controls until you like how it looks.</li>
              <li>Copy the CSS output and paste into your stylesheet — the pattern is embedded as a <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">data:image/svg+xml</code> URI.</li>
              <li>No external images, no additional HTTP requests. The entire pattern weighs just a few hundred bytes.</li>
              <li>Use as a <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">background-image</code> on any element — hero sections, cards, footers, or even <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">::before</code> pseudo-elements.</li>
              <li>All patterns repeat seamlessly (tile) in both directions. Scale adjusts the pattern density without breaking tiling.</li>
            </ol>
          </div>

          {/* Use Cases */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Common Use Cases</h2>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="bg-surface rounded-lg px-3 py-2.5 border border-slate-700/50">
                <span className="text-white font-medium">Hero Sections</span>
                <p className="mt-1">Subtle dot or grid pattern behind headline text for depth without distraction.</p>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2.5 border border-slate-700/50">
                <span className="text-white font-medium">Card Backgrounds</span>
                <p className="mt-1">Light geometric pattern on cards to break up flat color without adding weight.</p>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2.5 border border-slate-700/50">
                <span className="text-white font-medium">Dark Mode Depth</span>
                <p className="mt-1">Dark backgrounds benefit from subtle patterns to avoid looking flat and empty.</p>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2.5 border border-slate-700/50">
                <span className="text-white font-medium">Print-Style Layouts</span>
                <p className="mt-1">Crosshatch or fabric patterns for editorial, magazine-style designs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
