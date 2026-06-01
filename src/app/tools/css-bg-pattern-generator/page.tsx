'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Shuffle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PatternConfig {
  name: string;
  css: (size: number, color1: string, color2: string, opacity: number) => string;
}

// ── Pattern Definitions ────────────────────────────────────────────────────

const PATTERNS: PatternConfig[] = [
  {
    name: 'Dots',
    css: (s, c1, c2, o) =>
      `radial-gradient(circle, ${hexToRgba(c1, o)} 25%, transparent 26%) 0 0 / ${s}px ${s}px, radial-gradient(circle, ${hexToRgba(c2, o)} 25%, transparent 26%) ${s / 2}px ${s / 2}px / ${s}px ${s}px`,
  },
  {
    name: 'Grid',
    css: (s, c1, c2, o) =>
      `linear-gradient(${hexToRgba(c1, o)} 1px, transparent 1px) 0 0 / ${s}px ${s}px, linear-gradient(90deg, ${hexToRgba(c2, o)} 1px, transparent 1px) 0 0 / ${s}px ${s}px`,
  },
  {
    name: 'Stripes',
    css: (s, c1, c2, o) =>
      `repeating-linear-gradient(45deg, ${hexToRgba(c1, o)} 0, ${hexToRgba(c1, o)} ${s / 2}px, ${hexToRgba(c2, o)} ${s / 2}px, ${hexToRgba(c2, o)} ${s}px)`,
  },
  {
    name: 'Checkerboard',
    css: (s, c1, c2, o) =>
      `conic-gradient(${hexToRgba(c1, o)} 0 90deg, ${hexToRgba(c2, o)} 90deg 180deg, ${hexToRgba(c1, o)} 180deg 270deg, ${hexToRgba(c2, o)} 270deg 360deg) 0 0 / ${s * 2}px ${s * 2}px`,
  },
  {
    name: 'Zigzag',
    css: (s, c1, c2, o) =>
      `linear-gradient(135deg, ${hexToRgba(c1, o)} 25%, transparent 25%) 0 -${s}px, linear-gradient(225deg, ${hexToRgba(c2, o)} 25%, transparent 25%) 0 -${s}px, linear-gradient(315deg, ${hexToRgba(c1, o)} 25%, transparent 25%), linear-gradient(45deg, ${hexToRgba(c2, o)} 25%, transparent 25%)`,
  },
  {
    name: 'Triangles',
    css: (s, c1, c2, o) =>
      `conic-gradient(from 30deg at 50% 33%, ${hexToRgba(c1, o)} 0 60deg, transparent 60deg 120deg, ${hexToRgba(c2, o)} 120deg 180deg, transparent 180deg 240deg, ${hexToRgba(c1, o)} 240deg 300deg, transparent 300deg 360deg) 0 0 / ${s * 1.5}px ${s * 1.3}px`,
  },
  {
    name: 'Diamonds',
    css: (s, c1, c2, o) =>
      `linear-gradient(45deg, ${hexToRgba(c1, o)} 25%, transparent 26%, transparent 75%, ${hexToRgba(c1, o)} 76%) -${s / 2}px -${s / 2}px / ${s}px ${s}px, linear-gradient(135deg, ${hexToRgba(c2, o)} 25%, transparent 26%, transparent 75%, ${hexToRgba(c2, o)} 76%) 0 0 / ${s}px ${s}px`,
  },
  {
    name: 'Bricks',
    css: (s, c1, c2, o) =>
      `linear-gradient(${hexToRgba(c1, o)} 40%, transparent 40%) 0 0 / ${s}px ${s}px, linear-gradient(90deg, ${hexToRgba(c2, o)} 2px, transparent 2px) 0 0 / ${s}px ${s / 2}px, linear-gradient(90deg, ${hexToRgba(c2, o)} 2px, transparent 2px) ${s / 2}px ${s / 2}px / ${s}px ${s / 2}px`,
  },
  {
    name: 'Herringbone',
    css: (s, c1, c2, o) =>
      `conic-gradient(from 45deg at 0 0, ${hexToRgba(c1, o)} 0 90deg, transparent 90deg 180deg, ${hexToRgba(c2, o)} 180deg 270deg, transparent 270deg 360deg) 0 0 / ${s * 2}px ${s * 2}px`,
  },
  {
    name: 'Moire',
    css: (s, c1, c2, o) =>
      `radial-gradient(circle at 0 0, ${hexToRgba(c1, o)} 9%, transparent 10%), radial-gradient(circle at ${s}px ${s}px, ${hexToRgba(c2, o)} 9%, transparent 10%) 0 0 / ${s}px ${s}px`,
  },
  {
    name: 'Crosshatch',
    css: (s, c1, c2, o) =>
      `repeating-linear-gradient(0deg, ${hexToRgba(c1, o)} 0, ${hexToRgba(c1, o)} 1px, transparent 1px, transparent ${s}px), repeating-linear-gradient(90deg, ${hexToRgba(c1, o)} 0, ${hexToRgba(c1, o)} 1px, transparent 1px, transparent ${s}px), repeating-linear-gradient(45deg, ${hexToRgba(c2, o)} 0, ${hexToRgba(c2, o)} 1px, transparent 1px, transparent ${s * 1.5}px), repeating-linear-gradient(-45deg, ${hexToRgba(c2, o)} 0, ${hexToRgba(c2, o)} 1px, transparent 1px, transparent ${s * 1.5}px)`,
  },
  {
    name: 'Polka',
    css: (s, c1, c2, o) =>
      `radial-gradient(circle, ${hexToRgba(c1, o)} 20%, transparent 21%) 0 0 / ${s}px ${s}px, radial-gradient(circle, ${hexToRgba(c2, o)} 15%, transparent 16%) ${s / 2}px ${s / 2}px / ${s}px ${s}px`,
  },
  {
    name: 'Waves',
    css: (s, c1, c2, o) =>
      `repeating-radial-gradient(circle at 50% ${s * 2}px, ${hexToRgba(c1, o)} 0 ${s * 0.15}px, transparent ${s * 0.15}px ${s}px), repeating-radial-gradient(circle at 50% 0, ${hexToRgba(c2, o)} 0 ${s * 0.15}px, transparent ${s * 0.15}px ${s}px)`,
  },
  {
    name: 'Hexagons',
    css: (s, c1, c2, o) =>
      `repeating-linear-gradient(60deg, ${hexToRgba(c1, o)} 0, ${hexToRgba(c1, o)} 1px, transparent 1px, transparent ${s}px), repeating-linear-gradient(-60deg, ${hexToRgba(c2, o)} 0, ${hexToRgba(c2, o)} 1px, transparent 1px, transparent ${s}px)`,
  },
  {
    name: 'Circuit',
    css: (s, c1, c2, o) =>
      `linear-gradient(${hexToRgba(c1, o)} 2px, transparent 2px) 0 0 / ${s}px ${s / 2}px, linear-gradient(90deg, ${hexToRgba(c1, o)} 2px, transparent 2px) 0 0 / ${s / 2}px ${s}px, radial-gradient(circle, ${hexToRgba(c2, o)} 20%, transparent 21%) 0 0 / ${s}px ${s}px`,
  },
  {
    name: 'Paper',
    css: (s, c1, c2, o) =>
      `repeating-linear-gradient(0deg, ${hexToRgba(c1, o)} 0, ${hexToRgba(c1, o)} 1px, transparent 1px, transparent ${s}px), linear-gradient(90deg, ${hexToRgba(c2, o)} 1px, transparent 1px) 0 0 / ${s * 4}px 100%`,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace(/^#/, '');
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function isValidHex(hex: string): boolean {
  return /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(hex);
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESET_THEMES = [
  { c1: '#6366f1', c2: '#86efac' },
  { c1: '#f43f5e', c2: '#fbbf24' },
  { c1: '#06b6d4', c2: '#8b5cf6' },
  { c1: '#22c55e', c2: '#3b82f6' },
  { c1: '#ec4899', c2: '#14b8a6' },
  { c1: '#f97316', c2: '#a855f7' },
  { c1: '#64748b', c2: '#38bdf8' },
  { c1: '#334155', c2: '#e2e8f0' },
];

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSSBgPatternGeneratorPage() {
  const [patternIndex, setPatternIndex] = useState(0);
  const [size, setSize] = useState(24);
  const [color1, setColor1] = useState('#6366f1');
  const [color2, setColor2] = useState('#86efac');
  const [opacity, setOpacity] = useState(0.3);
  const [bgColor, setBgColor] = useState('#0f172a');
  const [copied, setCopied] = useState(false);

  const pattern = PATTERNS[patternIndex];

  // Generate CSS code
  const cssCode = useMemo(() => {
    const bg = `background-color: ${bgColor};\n  `;
    const p = `background-image: ${pattern.css(size, color1, color2, opacity)};\n  `;
    const bs = `background-size: ${size}px ${size}px;`;
    return `${bg}${p}${bs}`;
  }, [pattern, size, color1, color2, opacity, bgColor]);

  // Live background style
  const bgStyle = useMemo(() => ({
    backgroundColor: bgColor,
    backgroundImage: pattern.css(size, color1, color2, opacity),
    backgroundSize: `${size}px ${size}px`,
  }), [pattern, size, color1, color2, opacity, bgColor]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      toast.success('CSS copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [cssCode]);

  const handleDownload = useCallback(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 4}" height="${size * 4}">
  <defs>
    <style>.bg{fill:${bgColor};}</style>
  </defs>
  <rect width="100%" height="100%" class="bg" />
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern-${pattern.name.toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SVG downloaded!');
  }, [pattern, size, bgColor]);

  const handleRandomize = useCallback(() => {
    setPatternIndex(Math.floor(Math.random() * PATTERNS.length));
    setColor1(randomHex());
    setColor2(randomHex());
    setSize(Math.floor(Math.random() * 40) + 10);
    setOpacity(Math.random() * 0.5 + 0.1);
  }, []);

  const handlePreset = useCallback(
    (c1: string, c2: string) => {
      setColor1(c1);
      setColor2(c2);
    },
    [],
  );

  return (
    <ToolLayout
      title="CSS Background Pattern Generator"
      description="Generate beautiful CSS-only background patterns for your next project. Choose from 16 patterns, tweak colors and scale, and grab the CSS."
    >
      {/* Pattern Grid */}
      <div className="card mb-6">
        <h3 className="text-white font-semibold text-sm mb-4">Pattern</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2">
          {PATTERNS.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setPatternIndex(i)}
              className={`group relative p-3 rounded-lg border transition-all duration-200 text-center ${
                i === patternIndex
                  ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30'
                  : 'border-slate-700/50 bg-surface hover:border-slate-600'
              }`}
              style={{
                backgroundImage: p.css(8, color1, color2, 0.4),
                backgroundSize: '8px 8px',
                minHeight: '48px',
              }}
            >
              <span
                className={`relative z-10 text-xs font-semibold px-1.5 py-0.5 rounded ${
                  i === patternIndex
                    ? 'bg-brand-500/30 text-brand-300'
                    : 'bg-slate-900/80 text-slate-300 group-hover:text-white'
                }`}
              >
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Controls */}
        <div className="lg:col-span-2 card space-y-5">
          <h3 className="text-white font-semibold text-sm">Settings</h3>

          {/* Size */}
          <div>
            <label className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Size</span>
              <span className="font-mono">{size}px</span>
            </label>
            <input
              type="range"
              min={4}
              max={80}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Opacity</span>
              <span className="font-mono">{Math.round(opacity * 100)}%</span>
            </label>
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => setOpacity(parseInt(e.target.value) / 100)}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Color 1 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Color 1</label>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 rounded border-2 border-slate-600/50"
                  style={{ backgroundColor: color1 }}
                />
              </div>
              <input
                type="text"
                value={color1}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isValidHex(v)) setColor1(v.startsWith('#') ? v : '#' + v);
                  else setColor1(v);
                }}
                className="input-field flex-1 font-mono text-sm"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Color 2 */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Color 2</label>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 rounded border-2 border-slate-600/50"
                  style={{ backgroundColor: color2 }}
                />
              </div>
              <input
                type="text"
                value={color2}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isValidHex(v)) setColor2(v.startsWith('#') ? v : '#' + v);
                  else setColor2(v);
                }}
                className="input-field flex-1 font-mono text-sm"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Background Color</label>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 rounded border-2 border-slate-600/50"
                  style={{ backgroundColor: bgColor }}
                />
              </div>
              <input
                type="text"
                value={bgColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isValidHex(v)) setBgColor(v.startsWith('#') ? v : '#' + v);
                  else setBgColor(v);
                }}
                className="input-field flex-1 font-mono text-sm"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleRandomize}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Shuffle className="w-4 h-4" />
              Randomize
            </button>
            <button
              onClick={handleDownload}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Download className="w-4 h-4" />
              SVG
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div
            className="card flex-1 min-h-[320px] rounded-xl border border-slate-700/50 flex items-center justify-center relative overflow-hidden"
            style={bgStyle}
          >
            {/* Pattern name overlay */}
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/50">
              <span className="text-sm font-semibold text-white">{pattern.name}</span>
              <span className="text-xs text-slate-400 ml-2">{size}px</span>
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">CSS Code</h3>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-surface-lighter text-slate-300 hover:text-white border border-slate-600/50 hover:border-brand-500/30'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 text-sm font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
              <code>{cssCode}</code>
            </pre>
            <p className="text-xs text-slate-500 mt-2">
              Apply to any element with <code className="text-slate-400 bg-slate-800 px-1 rounded">background-image</code>
            </p>
          </div>
        </div>
      </div>

      {/* Color Presets */}
      <div className="card">
        <h3 className="text-white font-semibold text-sm mb-4">Color Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESET_THEMES.map((preset, i) => (
            <button
              key={i}
              onClick={() => handlePreset(preset.c1, preset.c2)}
              className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div
                className="w-5 h-5 rounded-full ring-1 ring-white/10"
                style={{ backgroundColor: preset.c1 }}
              />
              <div
                className="w-5 h-5 rounded-full ring-1 ring-white/10 -ml-2"
                style={{ backgroundColor: preset.c2 }}
              />
              <span className="text-xs text-slate-400 ml-1">{preset.c1}</span>
              <span className="text-xs text-slate-500">+</span>
              <span className="text-xs text-slate-400">{preset.c2}</span>
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
