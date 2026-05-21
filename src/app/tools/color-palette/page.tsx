'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface HSL {
  h: number;
  s: number;
  l: number;
}

type Harmony =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split-complementary'
  | 'monochromatic'
  | 'random';

type ExportFormat = 'hex-array' | 'css-vars' | 'tailwind';

// ── Color utilities ────────────────────────────────────────────────────────

function hexToHsl(hex: string): HSL | null {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const ns = s / 100;
  const nl = l / 100;
  const a = ns * Math.min(nl, 1 - nl);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return nl - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (
    '#' +
    [clamp(f(0)), clamp(f(8)), clamp(f(4))]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

function getContrastColor(hex: string): string {
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
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1e293b' : '#ffffff';
}

function isValidHex(hex: string): boolean {
  return /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(hex);
}

// ── Palette generation ─────────────────────────────────────────────────────

function generatePalette(baseHex: string, harmony: Harmony): string[] {
  const hsl = hexToHsl(baseHex);
  if (!hsl) return [];
  const { h, s, l } = hsl;
  const wrapHue = (deg: number) => ((deg % 360) + 360) % 360;

  switch (harmony) {
    case 'complementary':
      return [baseHex, hslToHex(wrapHue(h + 180), s, l)];

    case 'split-complementary':
      return [
        baseHex,
        hslToHex(wrapHue(h + 150), s, l),
        hslToHex(wrapHue(h + 210), s, l),
      ];

    case 'triadic':
      return [
        baseHex,
        hslToHex(wrapHue(h + 120), s, l),
        hslToHex(wrapHue(h + 240), s, l),
      ];

    case 'tetradic':
      return [
        baseHex,
        hslToHex(wrapHue(h + 90), s, l),
        hslToHex(wrapHue(h + 180), s, l),
        hslToHex(wrapHue(h + 270), s, l),
      ];

    case 'analogous':
      return [
        hslToHex(wrapHue(h - 30), s, l),
        hslToHex(wrapHue(h - 15), s, l),
        baseHex,
        hslToHex(wrapHue(h + 15), s, l),
        hslToHex(wrapHue(h + 30), s, l),
      ];

    case 'monochromatic': {
      const shades: string[] = [];
      const step = Math.min(14, Math.floor(70 / 6));
      for (let i = 0; i < 6; i++) {
        shades.push(
          hslToHex(h, s, Math.min(95, Math.max(5, l - 35 + i * step)))
        );
      }
      return shades;
    }

    case 'random': {
      const colors = [baseHex];
      for (let i = 0; i < 4; i++) {
        colors.push(
          hslToHex(
            Math.floor(Math.random() * 360),
            40 + Math.floor(Math.random() * 40),
            30 + Math.floor(Math.random() * 40)
          )
        );
      }
      return colors;
    }

    default:
      return [baseHex];
  }
}

// ── Harmony configurations ─────────────────────────────────────────────────

const HARMONIES: { value: Harmony; label: string; description: string }[] = [
  {
    value: 'complementary',
    label: 'Complementary',
    description: 'Two colors opposite on the color wheel',
  },
  {
    value: 'split-complementary',
    label: 'Split Complementary',
    description: 'Base + two colors adjacent to its complement',
  },
  {
    value: 'analogous',
    label: 'Analogous',
    description: 'Colors side by side on the wheel',
  },
  {
    value: 'triadic',
    label: 'Triadic',
    description: 'Three colors evenly spaced (120° apart)',
  },
  {
    value: 'tetradic',
    label: 'Tetradic',
    description: 'Four colors in a square (90° apart)',
  },
  {
    value: 'monochromatic',
    label: 'Monochromatic',
    description: 'Variations in lightness of a single hue',
  },
  {
    value: 'random',
    label: 'Random',
    description: 'Random base with harmonious companions',
  },
];

// ── Naming helpers ─────────────────────────────────────────────────────────

const DEFAULT_NAMES = [
  'primary',
  'secondary',
  'accent',
  'neutral',
  'info',
  'success',
];

function getExportCode(palette: string[], format: ExportFormat): string {
  switch (format) {
    case 'hex-array':
      return JSON.stringify(palette, null, 2);

    case 'css-vars':
      return `:root {\n${palette
        .map(
          (c, i) =>
            `  --color-${DEFAULT_NAMES[i] || `palette-${i + 1}`}: ${c};`
        )
        .join('\n')}\n}`;

    case 'tailwind':
      return (
        `// tailwind.config.js\n` +
        `module.exports = {\n` +
        `  theme: {\n` +
        `    extend: {\n` +
        `      colors: {\n${palette
          .map(
            (c, i) =>
              `        '${DEFAULT_NAMES[i] || `palette-${i + 1}`}': '${c}',`
          )
          .join('\n')}\n` +
        `      }\n` +
        `    }\n` +
        `  }\n` +
        `}`
      );

    default:
      return '';
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ColorPaletteGeneratorPage() {
  const [baseColor, setBaseColor] = useState('#8b5cf6');
  const [harmony, setHarmony] = useState<Harmony>('analogous');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('css-vars');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);

  const inputHex = baseColor.startsWith('#') ? baseColor : '#' + baseColor;
  const isValid = isValidHex(baseColor);

  const palette = useMemo(
    () => generatePalette(baseColor, harmony),
    [baseColor, harmony]
  );

  const exportCode = useMemo(
    () => getExportCode(palette, exportFormat),
    [palette, exportFormat]
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async (color: string, index: number) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedIndex(index);
      toast.success(`${color} copied!`);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const handleCopyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopiedExport(true);
      toast.success('Code copied!');
      setTimeout(() => setCopiedExport(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [exportCode]);

  const handleRandomBase = useCallback(() => {
    const randomHex = hslToHex(
      Math.floor(Math.random() * 360),
      50 + Math.floor(Math.random() * 30),
      40 + Math.floor(Math.random() * 30)
    );
    setBaseColor(randomHex);
  }, []);

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBaseColor(e.target.value);
    },
    []
  );

  const handleHexInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBaseColor(e.target.value);
    },
    []
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Color Palette Generator"
      description="Generate beautiful color palettes using harmony rules. Pick a base color, explore complementary, analogous, triadic, and more — then export as CSS variables or Tailwind config."
    >
      {/* ── Base Color Input ────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <input
                type="color"
                value={isValid ? inputHex : '#8b5cf6'}
                onChange={handlePickerChange}
                className="absolute inset-0 w-12 h-12 opacity-0 cursor-pointer"
                title="Pick base color"
              />
              <div
                className="w-12 h-12 rounded-xl border-2 border-slate-600/50 cursor-pointer shadow-lg transition-shadow hover:shadow-xl"
                style={{
                  backgroundColor: isValid ? inputHex : '#8b5cf6',
                }}
              />
            </div>
            <input
              type="text"
              value={baseColor}
              onChange={handleHexInput}
              placeholder="#8b5cf6"
              className="input-field w-28 font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <button
            onClick={handleRandomBase}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Random Base
          </button>

          {!isValid && baseColor.trim() && (
            <span className="text-red-400 text-xs ml-2">
              Invalid hex — use #rrggbb or #rgb format
            </span>
          )}
        </div>
      </div>

      {/* ── Harmony Selector ────────────────────────────────────────────── */}
      <div className="card mb-6">
        <h3 className="text-white font-semibold text-sm mb-3">
          Harmony Type
        </h3>
        <div className="flex flex-wrap gap-2">
          {HARMONIES.map((h) => (
            <button
              key={h.value}
              onClick={() => setHarmony(h.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                harmony === h.value
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600/50'
              }`}
              title={h.description}
            >
              {h.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          {HARMONIES.find((h) => h.value === harmony)?.description}
        </p>
      </div>

      {/* ── Generated Palette ───────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">
            Generated Palette
          </h3>
          <span className="text-xs text-slate-500">
            {palette.length} colors — click to copy
          </span>
        </div>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(
              palette.length,
              6
            )}, minmax(0, 1fr))`,
          }}
        >
          {palette.map((color, i) => (
            <div key={`${color}-${i}`} className="flex flex-col gap-2">
              <button
                onClick={() => handleCopy(color, i)}
                className="group relative w-full aspect-square rounded-xl border-2 border-slate-700/50 hover:border-brand-400/30 hover:scale-105 transition-all duration-200 shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400/40"
                style={{ backgroundColor: color }}
                title={`Click to copy ${color}`}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
                  {copiedIndex === i ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <Copy className="w-6 h-6 text-white" />
                  )}
                </div>

                {/* Color label overlay */}
                <span
                  className="absolute bottom-2 left-2 right-2 text-center text-[10px] font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: getContrastColor(color) }}
                >
                  {DEFAULT_NAMES[i] || `Color ${i + 1}`}
                </span>
              </button>
              <span
                className="font-mono text-xs text-slate-400 text-center cursor-pointer hover:text-white select-all transition-colors"
                onClick={() => handleCopy(color, i)}
              >
                {color.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live Preview ────────────────────────────────────────────────── */}
      {palette.length >= 3 && (
        <div className="card mb-6 overflow-hidden">
          <h3 className="text-white font-semibold text-sm mb-4">
            Live Preview
          </h3>
          <div
            className="rounded-xl overflow-hidden border border-slate-700/50"
            style={{
              backgroundColor:
                palette[4] || palette[palette.length - 1] || palette[0],
            }}
          >
            {/* Header bar */}
            <div
              className="h-14 flex items-center px-4 gap-3"
              style={{ backgroundColor: palette[0] }}
            >
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/30" />
                <div className="w-3 h-3 rounded-full bg-white/30" />
                <div className="w-3 h-3 rounded-full bg-white/30" />
              </div>
              <span
                className="ml-2 text-sm font-medium"
                style={{ color: getContrastColor(palette[0]) }}
              >
                App Header
              </span>
            </div>

            <div className="p-6">
              <h4
                className="text-xl font-bold mb-2"
                style={{ color: palette[0] }}
              >
                Welcome to Your App
              </h4>
              <p
                className="text-sm mb-5 leading-relaxed"
                style={{ color: palette[1] || palette[0] }}
              >
                This is how your palette looks in a real interface. Cards,
                text, and UI elements all use your generated colors.
              </p>

              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105"
                  style={{
                    backgroundColor: palette[0],
                    color: getContrastColor(palette[0]),
                  }}
                >
                  Primary Action
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
                  style={{
                    borderColor: palette[1] || palette[0],
                    color: palette[1] || palette[0],
                  }}
                >
                  Secondary
                </button>
                {palette[2] && (
                  <span
                    className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: palette[2] + '20',
                      color: palette[2],
                    }}
                  >
                    Accent Tag
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor:
                      (palette[3] || palette[0]) + '15',
                  }}
                >
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: palette[3] || palette[0] }}
                  >
                    Card Title
                  </p>
                  <p
                    className="text-xs opacity-70 leading-relaxed"
                    style={{ color: palette[3] || palette[0] }}
                  >
                    Supporting content that shows how text contrasts on a
                    subtle background tint.
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor:
                      (palette[2] || palette[0]) + '15',
                  }}
                >
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: palette[2] || palette[0] }}
                  >
                    Metric
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: palette[0] }}
                  >
                    42
                  </p>
                  <p
                    className="text-xs mt-1 opacity-60"
                    style={{ color: palette[2] || palette[0] }}
                  >
                    ▲ 12% from last week
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Export ──────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-white font-semibold text-sm">Export</h3>
          <div className="flex items-center gap-2">
            {(
              ['hex-array', 'css-vars', 'tailwind'] as ExportFormat[]
            ).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                  exportFormat === fmt
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-surface text-slate-400 border border-slate-700/50 hover:text-white'
                }`}
              >
                {fmt === 'hex-array'
                  ? 'Hex Array'
                  : fmt === 'css-vars'
                  ? 'CSS Vars'
                  : 'Tailwind'}
              </button>
            ))}
            <button
              onClick={handleCopyExport}
              className={`ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                copiedExport
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-surface text-slate-400 border border-slate-700/50 hover:text-white'
              }`}
            >
              {copiedExport ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copiedExport ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <pre className="bg-surface rounded-lg border border-slate-700/50 p-4 overflow-x-auto">
          <code className="text-sm text-slate-300 font-mono whitespace-pre">
            {exportCode}
          </code>
        </pre>
      </div>
    </ToolLayout>
  );
}
