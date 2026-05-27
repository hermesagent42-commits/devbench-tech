'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Palette,
  Copy,
  RefreshCw,
  Plus,
  Wand2,
  Check,
  Sun,
  Moon,
  PaintBucket,
  Download,
  Layers,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type HarmonyType =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'monochromatic'
  | 'split-complementary'
  | 'square';

interface ColorEntry {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
}

type ExportFormat = 'css' | 'tailwind' | 'json' | 'hex';

interface Preset {
  name: string;
  description: string;
  base: string;
  mode: HarmonyType;
}

// ── Color Conversion Utilities ─────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return [
    parseInt(full.substring(0, 2), 16),
    parseInt(full.substring(2, 4), 16),
    parseInt(full.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === nr) h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6;
    else if (max === ng) h = ((nb - nr) / d + 2) / 6;
    else h = ((nr - ng) / d + 4) / 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  const ns = s / 100;
  const nl = l / 100;
  const a = ns * Math.min(nl, 1 - nl);

  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return nl - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };

  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function createColor(hex: string): ColorEntry {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(...rgb);
  return { hex, rgb, hsl };
}

function adjustHue(h: number, delta: number): number {
  return ((h + delta) % 360 + 360) % 360;
}

// ── Harmony Generation ─────────────────────────────────────────────────────

function generateHarmony(
  baseHex: string,
  mode: HarmonyType,
  count: number,
  variationStrength: number,
): ColorEntry[] {
  const { hsl: [h, s, l] } = createColor(baseHex);
  const hues: number[] = [];

  switch (mode) {
    case 'complementary':
      hues.push(h, adjustHue(h, 180));
      break;
    case 'analogous':
      hues.push(adjustHue(h, -30), h, adjustHue(h, 30), adjustHue(h, 60));
      break;
    case 'triadic':
      hues.push(h, adjustHue(h, 120), adjustHue(h, 240));
      break;
    case 'tetradic':
      hues.push(h, adjustHue(h, 90), adjustHue(h, 180), adjustHue(h, 270));
      break;
    case 'monochromatic': {
      for (let i = 0; i < Math.max(count, 5); i++) {
        hues.push(h);
      }
      break;
    }
    case 'split-complementary':
      hues.push(h, adjustHue(h, 150), adjustHue(h, 210));
      break;
    case 'square':
      hues.push(h, adjustHue(h, 90), adjustHue(h, 180), adjustHue(h, 270));
      break;
  }

  const colors: ColorEntry[] = [];

  for (let i = 0; i < Math.min(count, hues.length * 2); i++) {
    const hueIdx = i % hues.length;
    const hue = hues[hueIdx];

    if (mode === 'monochromatic') {
      const lightnessStep = variationStrength / 100;
      const baseLightness = l - 30 + (i / (count - 1)) * 60;
      const sat = s - 15 + Math.random() * 30;
      const light = Math.max(5, Math.min(95, baseLightness + (Math.random() - 0.5) * lightnessStep * 40));
      colors.push(createColor(rgbToHex(...hslToRgb(hue, Math.max(5, Math.min(100, sat)), Math.max(5, Math.min(95, light))))));
    } else {
      const satJitter = (Math.random() - 0.5) * variationStrength * 0.4;
      const lightJitter = (Math.random() - 0.5) * variationStrength * 0.3;
      colors.push(
        createColor(
          rgbToHex(
            ...hslToRgb(
              hue,
              Math.max(5, Math.min(100, s + satJitter)),
              Math.max(8, Math.min(92, l + lightJitter)),
            ),
          ),
        ),
      );
    }
  }

  return colors;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Ocean Breeze',
    description: 'Calm, trustworthy blues with a pop of coral',
    base: '#2563eb',
    mode: 'split-complementary',
  },
  {
    name: 'Forest Canopy',
    description: 'Natural greens grounded with warm browns',
    base: '#16a34a',
    mode: 'analogous',
  },
  {
    name: 'Sunset Boulevard',
    description: 'Warm oranges and purples for vibrant brands',
    base: '#f97316',
    mode: 'complementary',
  },
  {
    name: 'Midnight Code',
    description: 'Dark mode developer aesthetic — deep purples and cyans',
    base: '#7c3aed',
    mode: 'triadic',
  },
  {
    name: 'Desert Rose',
    description: 'Earthy terracotta with soft sage accents',
    base: '#d97706',
    mode: 'analogous',
  },
  {
    name: 'Neon City',
    description: 'Electric cyberpunk palette — hot pink and cyan',
    base: '#ec4899',
    mode: 'complementary',
  },
  {
    name: 'Mint Chocolate',
    description: 'Fresh mint greens with dark chocolate browns',
    base: '#059669',
    mode: 'split-complementary',
  },
  {
    name: 'Lavender Fields',
    description: 'Soft purples with golden highlights',
    base: '#8b5cf6',
    mode: 'tetradic',
  },
];

const HARMONY_LABELS: Record<HarmonyType, { label: string; description: string }> = {
  complementary: { label: 'Complementary', description: 'Two colors opposite on the wheel — high contrast, vibrant' },
  analogous: { label: 'Analogous', description: 'Colors next to each other — harmonious, serene' },
  triadic: { label: 'Triadic', description: 'Three evenly spaced — balanced, colorful' },
  tetradic: { label: 'Tetradic', description: 'Two complementary pairs — rich, complex' },
  monochromatic: { label: 'Monochromatic', description: 'One hue, varied lightness — cohesive, elegant' },
  'split-complementary': { label: 'Split Complementary', description: 'Base + two adjacent to complement — balanced contrast' },
  square: { label: 'Square', description: 'Four evenly spaced — bold, dynamic' },
};

// ── Helper: luminance for contrast ─────────────────────────────────────────

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Export Functions ───────────────────────────────────────────────────────

function exportPalette(colors: ColorEntry[], format: ExportFormat): string {
  const names = ['primary', 'secondary', 'accent', 'highlight', 'neutral', 'base', 'surface', 'muted'];
  switch (format) {
    case 'css':
      return `:root {\n${colors
        .map((c, i) => `  --${names[i] || `color-${i + 1}`}: ${c.hex};`)
        .join('\n')}\n}`;
    case 'tailwind':
      return colors
        .map(
          (c, i) =>
            `      '${names[i] || `color-${i + 1}`}': '${c.hex}',`,
        )
        .join('\n');
    case 'json':
      return JSON.stringify(
        colors.map((c, i) => ({
          name: names[i] || `color-${i + 1}`,
          hex: c.hex,
          rgb: `rgb(${c.rgb.join(', ')})`,
          hsl: `hsl(${c.hsl[0]}, ${c.hsl[1]}%, ${c.hsl[2]}%)`,
        })),
        null,
        2,
      );
    case 'hex':
      return colors.map((c) => c.hex).join('\n');
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ColorPaletteGeneratorPage() {
  const [baseColor, setBaseColor] = useState('#6366f1');
  const [mode, setMode] = useState<HarmonyType>('analogous');
  const [count, setCount] = useState(8);
  const [variation, setVariation] = useState(25);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const palette = useMemo(
    () => generateHarmony(baseColor, mode, count, variation),
    [baseColor, mode, count, variation],
  );

  const copyColor = useCallback(async (hex: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedIdx(idx);
      toast.success(`Copied ${hex}`);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      toast.error('Copy failed');
    }
  }, []);

  const copyExport = useCallback(
    async (format: ExportFormat) => {
      const text = exportPalette(palette, format);
      try {
        await navigator.clipboard.writeText(text);
        toast.success(`Copied as ${format.toUpperCase()}`);
      } catch {
        toast.error('Copy failed');
      }
    },
    [palette],
  );

  const randomize = useCallback(() => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    setBaseColor(rgbToHex(r, g, b));
  }, []);

  const modes = Object.keys(HARMONY_LABELS) as HarmonyType[];

  // Find the darkest color for the preview background
  const darkestColor = useMemo(() => {
    let minLum = Infinity;
    let darkest = '#1e293b';
    palette.forEach((c) => {
      const lum = getLuminance(...c.rgb);
      if (lum < minLum) {
        minLum = lum;
        darkest = c.hex;
      }
    });
    return darkest;
  }, [palette]);

  const lightestColor = useMemo(() => {
    let maxLum = 0;
    let lightest = '#f8fafc';
    palette.forEach((c) => {
      const lum = getLuminance(...c.rgb);
      if (lum > maxLum) {
        maxLum = lum;
        lightest = c.hex;
      }
    });
    return lightest;
  }, [palette]);

  return (
    <ToolLayout
      title="Color Palette Generator"
      description="Generate beautiful, harmonious color palettes using color theory — complementary, analogous, triadic, monochromatic, and more. Export as CSS variables, Tailwind config, or JSON."
    >
      <div className="space-y-6">
        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="card border border-slate-700/50 p-5 space-y-4">
          {/* Base color input */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Base Color
              </label>
              <div className="flex items-stretch gap-2">
                <div
                  className="w-10 h-10 rounded-lg border border-slate-600 shrink-0"
                  style={{ backgroundColor: baseColor }}
                />
                <input
                  type="text"
                  value={baseColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBaseColor(v);
                  }}
                  className="input-field flex-1 font-mono text-sm"
                  placeholder="#6366f1"
                />
                <button
                  onClick={randomize}
                  className="btn-icon p-2 rounded-lg bg-surface hover:bg-slate-700 transition-colors"
                  title="Random color"
                >
                  <Wand2 className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Harmony
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as HarmonyType)}
                className="input-field w-full text-sm"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {HARMONY_LABELS[m].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-[120px]">
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Colors
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="input-field w-full text-sm"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Variation: {variation}%
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={variation}
                onChange={(e) => setVariation(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          {/* Mode description */}
          <p className="text-slate-500 text-xs italic">
            {HARMONY_LABELS[mode].description}
          </p>
        </div>

        {/* ── Presets ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setBaseColor(preset.base);
                setMode(preset.mode);
              }}
              className="px-3 py-1.5 text-xs rounded-full border border-slate-700 hover:border-brand-500 hover:text-brand-300 text-slate-400 transition-all"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* ── Palette Display ───────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-white font-semibold text-sm">Generated Palette</h3>
            <span className="text-slate-500 text-xs">{palette.length} colors</span>
            <div className="flex-1" />
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1.5 rounded transition-colors ${
                showPreview ? 'text-brand-400 bg-brand-500/10' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle UI preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {palette.map((color, i) => {
              const isDark = getLuminance(...color.rgb) < 0.4;
              return (
                <div key={i} className="group relative">
                  <button
                    onClick={() => copyColor(color.hex, i)}
                    className="w-full rounded-xl overflow-hidden border border-slate-700/50 hover:border-brand-500/50 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <div
                      className="h-28 flex items-end p-3 relative"
                      style={{ backgroundColor: color.hex }}
                    >
                      {copiedIdx === i && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full bg-white/20 backdrop-blur-sm text-white font-medium">
                          <Check className="w-3 h-3 inline mr-1" />
                          Copied
                        </span>
                      )}
                    </div>
                    <div className="bg-[#0f172a] px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-mono font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {color.hex}
                        </span>
                        <Copy
                          className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isDark ? 'text-white/70' : 'text-slate-900'
                          }`}
                        />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-[10px] opacity-60 ${isDark ? 'text-white/70' : 'text-slate-900'}`}>
                          RGB({color.rgb.join(', ')})
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── UI Preview ────────────────────────────────────────── */}
        {showPreview && (
          <div className="card border border-slate-700/50 overflow-hidden">
            <div className="px-4 py-2 bg-surface border-b border-slate-700/50 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-white">Preview</span>
              <span className="text-slate-500 text-xs">Sample UI with your palette</span>
            </div>

            <div
              className="p-6 space-y-4"
              style={{ backgroundColor: darkestColor }}
            >
              {/* Navbar */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: palette[1]?.hex || darkestColor,
                  border: `1px solid ${palette[2]?.hex || '#334155'}`,
                }}
              >
                <span
                  className="font-bold text-sm"
                  style={{ color: getLuminance(...(palette[1]?.rgb || [30, 41, 59])) < 0.4 ? '#f8fafc' : '#0f172a' }}
                >
                  MyApp
                </span>
                <div className="flex gap-2">
                  {['Home', 'About', 'Contact'].map((label, j) => (
                    <span
                      key={label}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: j === 0 ? palette[3]?.hex + '40' : 'transparent',
                        color: getLuminance(...(palette[1]?.rgb || [30, 41, 59])) < 0.4 ? '#cbd5e1' : '#475569',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero card */}
              <div
                className="rounded-xl p-6 flex items-center gap-4"
                style={{
                  background: `linear-gradient(135deg, ${palette[3]?.hex || baseColor}, ${palette[0]?.hex || baseColor})`,
                }}
              >
                <div>
                  <h3 className="text-white text-lg font-bold">Build Something Great</h3>
                  <p className="text-white/70 text-xs mt-1">Your color palette in action on a sample dashboard.</p>
                  <button
                    className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: palette[4]?.hex || '#fff' }}
                  >
                    Get Started
                  </button>
                </div>
              </div>

              {/* Cards row */}
              <div className="grid grid-cols-3 gap-3">
                {[0, 2, 4].map((pi) => (
                  <div
                    key={pi}
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: palette[pi]?.hex || '#1e293b',
                      border: `1px solid ${palette[5]?.hex || '#334155'}40`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full mb-3"
                      style={{ backgroundColor: palette[(pi + 1) % palette.length]?.hex || '#475569' }}
                    />
                    <div
                      className="h-2 rounded w-2/3 mb-2"
                      style={{
                        backgroundColor:
                          getLuminance(...(palette[pi]?.rgb || [30, 41, 59])) < 0.4
                            ? 'rgba(255,255,255,0.3)'
                            : 'rgba(0,0,0,0.15)',
                      }}
                    />
                    <div
                      className="h-2 rounded w-1/2"
                      style={{
                        backgroundColor:
                          getLuminance(...(palette[pi]?.rgb || [30, 41, 59])) < 0.4
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,0,0,0.08)',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Bottom bar */}
              <div
                className="flex items-center justify-between px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: palette[palette.length - 1]?.hex || '#0f172a',
                }}
              >
                <span className="text-[10px] text-slate-400">Preview — palette applied to mock components</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: palette[0]?.hex + '50',
                    color: getLuminance(...(palette[0]?.rgb || [99, 102, 241])) < 0.4 ? '#e2e8f0' : '#334155',
                  }}
                >
                  {mode}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Export ────────────────────────────────────────────── */}
        <div className="card border border-slate-700/50 p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Export</h3>
          <div className="flex flex-wrap gap-2">
            {(['css', 'tailwind', 'json', 'hex'] as ExportFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => copyExport(fmt)}
                className="px-4 py-2 rounded-lg bg-surface hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Copy as {fmt === 'css' ? 'CSS Custom Properties' : fmt === 'tailwind' ? 'Tailwind Config' : fmt.toUpperCase()}
              </button>
            ))}
          </div>
          <pre className="mt-4 p-4 rounded-lg bg-[#0f172a] border border-slate-700/50 text-xs text-slate-300 font-mono overflow-x-auto max-h-48 overflow-y-auto">
            {exportPalette(palette, 'css')}
          </pre>
        </div>
      </div>
    </ToolLayout>
  );
}
