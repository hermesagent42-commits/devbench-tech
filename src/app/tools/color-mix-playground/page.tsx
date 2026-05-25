'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, PaintBucket, FlaskConical, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ColorSpace =
  | 'srgb' | 'srgb-linear' | 'display-p3' | 'a98-rgb'
  | 'prophoto-rgb' | 'rec2020'
  | 'lab' | 'oklab' | 'xyz' | 'xyz-d50' | 'xyz-d65'
  | 'hsl' | 'hwb' | 'lch' | 'oklch';

interface ColorSpaceInfo {
  label: string;
  category: string;
  description: string;
  baseline: string;
}

interface Preset {
  name: string;
  colorA: string;
  colorB: string;
  space: ColorSpace;
  percentage: number;
}

// ── Color space definitions ─────────────────────────────────────────────────

const COLOR_SPACES: ColorSpace[] = [
  'srgb', 'srgb-linear', 'display-p3', 'a98-rgb',
  'prophoto-rgb', 'rec2020',
  'lab', 'oklab', 'xyz', 'xyz-d50', 'xyz-d65',
  'hsl', 'hwb', 'lch', 'oklch',
];

const COLOR_SPACE_INFO: Record<ColorSpace, ColorSpaceInfo> = {
  'srgb':          { label: 'sRGB',          category: 'RGB Spaces', description: 'Standard RGB. Default web color space. Perceptually non-uniform.', baseline: 'Baseline' },
  'srgb-linear':   { label: 'sRGB Linear',   category: 'RGB Spaces', description: 'Linear-light sRGB without gamma. Physically accurate mixing.', baseline: 'Baseline' },
  'display-p3':    { label: 'Display P3',    category: 'RGB Spaces', description: 'Wider gamut than sRGB. Used by modern Apple displays.', baseline: 'Newly available' },
  'a98-rgb':       { label: 'A98 RGB',       category: 'RGB Spaces', description: 'Adobe RGB compatible. Wide gamut for print workflows.', baseline: 'Limited' },
  'prophoto-rgb':  { label: 'ProPhoto RGB',  category: 'RGB Spaces', description: 'Very wide gamut. Used in professional photography.', baseline: 'Limited' },
  'rec2020':       { label: 'Rec. 2020',     category: 'RGB Spaces', description: 'Ultra-wide gamut for HDR and 4K/8K video standards.', baseline: 'Limited' },
  'lab':           { label: 'Lab',           category: 'CIE Spaces',  description: 'Device-independent CIE Lab. Perceptually uniform.', baseline: 'Baseline' },
  'oklab':         { label: 'Oklab',         category: 'CIE Spaces',  description: 'Improved perceptual uniformity. Better hue linearity than Lab.', baseline: 'Baseline' },
  'xyz':           { label: 'XYZ',           category: 'CIE Spaces',  description: 'CIE 1931 XYZ. The foundation of all color science.', baseline: 'Limited' },
  'xyz-d50':       { label: 'XYZ D50',       category: 'CIE Spaces',  description: 'XYZ with D50 white point. Used in ICC profiles.', baseline: 'Limited' },
  'xyz-d65':       { label: 'XYZ D65',       category: 'CIE Spaces',  description: 'XYZ with D65 white point. Standard for sRGB reference.', baseline: 'Limited' },
  'hsl':           { label: 'HSL',           category: 'Cylindrical', description: 'Hue, Saturation, Lightness. Intuitive but not perceptually uniform.', baseline: 'Baseline' },
  'hwb':           { label: 'HWB',           category: 'Cylindrical', description: 'Hue, Whiteness, Blackness. Intuitive tinting/shading.', baseline: 'Baseline' },
  'lch':           { label: 'LCH',           category: 'Cylindrical', description: 'Lightness, Chroma, Hue. Cylindrical Lab — great for gradients.', baseline: 'Baseline' },
  'oklch':         { label: 'Oklch',         category: 'Cylindrical', description: 'Modern LCH. Best perceptual uniformity. Ideal for color mixing.', baseline: 'Baseline' },
};

const SORTED_SPACES: [string, ColorSpaceInfo[]][] = (() => {
  const groups = new Map<string, ColorSpaceInfo[]>();
  for (const space of COLOR_SPACES) {
    const info = COLOR_SPACE_INFO[space];
    const existing = groups.get(info.category);
    if (existing) {
      existing.push(info);
    } else {
      groups.set(info.category, [info]);
    }
  }
  const result: [string, ColorSpaceInfo[]][] = [];
  groups.forEach((infos, category) => {
    result.push([category, infos]);
  });
  return result;
})();

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { name: 'Sunset Blend', colorA: '#ff6b6b', colorB: '#ffd93d', space: 'oklch', percentage: 50 },
  { name: 'Ocean Gradient', colorA: '#0ea5e9', colorB: '#06d6a0', space: 'oklch', percentage: 40 },
  { name: 'Purple Haze', colorA: '#6366f1', colorB: '#a855f7', space: 'srgb', percentage: 60 },
  { name: 'Retro Pop', colorA: '#f43f5e', colorB: '#fbbf24', space: 'lch', percentage: 35 },
  { name: 'Forest Mist', colorA: '#166534', colorB: '#94a3b8', space: 'lab', percentage: 45 },
  { name: 'Neon Glow', colorA: '#06b6d4', colorB: '#d946ef', space: 'hsl', percentage: 50 },
  { name: 'Adobe Warmth', colorA: '#d97706', colorB: '#dc2626', space: 'display-p3', percentage: 55 },
  { name: 'Arctic Frost', colorA: '#e0f2fe', colorB: '#38bdf8', space: 'oklch', percentage: 30 },
  { name: 'Cinematic Teal', colorA: '#064e3b', colorB: '#eab308', space: 'oklch', percentage: 25 },
  { name: 'Vapor Pink', colorA: '#831843', colorB: '#ec4899', space: 'srgb-linear', percentage: 65 },
  { name: 'Golden Hour', colorA: '#92400e', colorB: '#f59e0b', space: 'lch', percentage: 50 },
  { name: 'Dark Academia', colorA: '#1a1a2e', colorB: '#5c4033', space: 'lab', percentage: 40 },
];

// ── Hex parsing utilities ──────────────────────────────────────────────────

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const expanded = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  return {
    r: parseInt(expanded.substring(0, 2), 16),
    g: parseInt(expanded.substring(2, 4), 16),
    b: parseInt(expanded.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('');
}

// ── Perceptual brightness ──────────────────────────────────────────────────

function luminance(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// ── CSS color-mix() string generator ───────────────────────────────────────

function makeColorMixCss(colorA: string, colorB: string, space: ColorSpace, percentage: number): string {
  const pctStr = `${percentage}%`;
  const spacesWithPercent = ['hsl', 'hwb', 'lch', 'oklch'];
  const needsPercent = spacesWithPercent.includes(space);
  const spaceStr = needsPercent ? `${space} hue` : space;
  return `color-mix(in ${spaceStr}, ${colorA} ${pctStr}, ${colorB})`;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ColorMixPlaygroundPage() {
  const [colorA, setColorA] = useState('#6366f1');
  const [colorB, setColorB] = useState('#f43f5e');
  const [colorSpace, setColorSpace] = useState<ColorSpace>('oklch');
  const [percentage, setPercentage] = useState(50);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const parsedA = useMemo(() => parseHex(colorA), [colorA]);
  const parsedB = useMemo(() => parseHex(colorB), [colorB]);

  const cssCode = useMemo(() =>
    makeColorMixCss(colorA, colorB, colorSpace, percentage),
  [colorA, colorB, colorSpace, percentage]);

  const fullCss = useMemo(() => `.mixed-element {\n  color: ${cssCode};\n  /* or use background-color */\n  background-color: ${cssCode};\n}`, [cssCode]);

  const mixPreviewStyle = useMemo(() => ({
    background: `linear-gradient(to right, ${colorA} ${percentage}%, ${colorB} ${percentage}%)`,
  }), [colorA, colorB, percentage]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied!`);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setColorA(preset.colorA);
    setColorB(preset.colorB);
    setColorSpace(preset.space);
    setPercentage(preset.percentage);
    setActivePreset(preset.name);
  }, []);

  const briA = parsedA ? luminance(parsedA.r, parsedA.g, parsedA.b) : 0;
  const briB = parsedB ? luminance(parsedB.r, parsedB.g, parsedB.b) : 0;

  return (
    <ToolLayout
      title="CSS color-mix() Playground"
      description="Explore CSS color-mix() — the native way to mix colors in any color space. Pick two colors, choose a mixing space, and generate production-ready CSS."
    >
      <div className="space-y-8">
        {/* ── Presets ─────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Presets
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  activePreset === preset.name
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/30'
                    : 'border-slate-700/50 bg-slate-800/50 text-slate-300 hover:border-slate-600/50'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ background: `linear-gradient(to right, ${preset.colorA}, ${preset.colorB})` }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Two-color inputs ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Color A
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={colorA}
                  onChange={(e) => { setColorA(e.target.value); setActivePreset(null); }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-12 h-12"
                />
                <div
                  className="w-12 h-12 rounded-xl border-2 border-slate-700"
                  style={{ backgroundColor: colorA }}
                />
              </div>
              <input
                type="text"
                value={colorA}
                onChange={(e) => { setColorA(e.target.value); setActivePreset(null); }}
                className="input-field font-mono flex-1"
                placeholder="#6366f1"
              />
            </div>
            {parsedA && (
              <div className="mt-2 text-xs text-slate-500 font-mono">
                rgb({parsedA.r}, {parsedA.g}, {parsedA.b})
              </div>
            )}
            {!parsedA && (
              <div className="mt-2 text-xs text-red-400">Invalid hex color</div>
            )}
          </div>

          <div className="card">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Color B
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={colorB}
                  onChange={(e) => { setColorB(e.target.value); setActivePreset(null); }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-12 h-12"
                />
                <div
                  className="w-12 h-12 rounded-xl border-2 border-slate-700"
                  style={{ backgroundColor: colorB }}
                />
              </div>
              <input
                type="text"
                value={colorB}
                onChange={(e) => { setColorB(e.target.value); setActivePreset(null); }}
                className="input-field font-mono flex-1"
                placeholder="#f43f5e"
              />
            </div>
            {parsedB && (
              <div className="mt-2 text-xs text-slate-500 font-mono">
                rgb({parsedB.r}, {parsedB.g}, {parsedB.b})
              </div>
            )}
            {!parsedB && (
              <div className="mt-2 text-xs text-red-400">Invalid hex color</div>
            )}
          </div>
        </div>

        {/* ── Mix ratio slider ───────────────────────────────────── */}
        <div className="card">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
            Mix Ratio — {percentage}% A / {100 - percentage}% B
          </label>

          {/* Visual mix preview bar */}
          <div
            className="w-full h-10 rounded-lg mb-3 border border-slate-700/50 overflow-hidden"
            style={mixPreviewStyle}
          />

          <input
            type="range"
            min={0}
            max={100}
            value={percentage}
            onChange={(e) => { setPercentage(Number(e.target.value)); setActivePreset(null); }}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
          />

          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500 font-mono">{colorA}</span>
            <span className="text-xs text-slate-500 font-mono">{colorB}</span>
          </div>
        </div>

        {/* ── Color space selector ───────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Color Space
          </h3>
          <div className="space-y-4">
            {SORTED_SPACES.map(([category, spaces]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {spaces.map((info) => (
                    <button
                      key={info.label}
                      onClick={() => { setColorSpace(COLOR_SPACES.find(s => COLOR_SPACE_INFO[s].label === info.label) as ColorSpace); setActivePreset(null); }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        colorSpace === COLOR_SPACES.find(s => COLOR_SPACE_INFO[s].label === info.label)
                          ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/30'
                          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
                      }`}
                    >
                      <div className="font-mono text-xs font-semibold text-white">
                        {info.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        {info.baseline}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Current space info ─────────────────────────────────── */}
        {colorSpace && (
          <div className="card border-brand-500/20 bg-brand-500/5">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-semibold text-brand-400">
                {COLOR_SPACE_INFO[colorSpace].label}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                {COLOR_SPACE_INFO[colorSpace].baseline}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {COLOR_SPACE_INFO[colorSpace].description}
            </p>
          </div>
        )}

        {/* ── Live Preview ───────────────────────────────────────── */}
        {parsedA && parsedB && (
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              Live Preview
            </h3>

            {/* The actual color-mix() preview */}
            <div
              className="w-full h-48 rounded-xl border-2 border-slate-700/50 flex items-center justify-center overflow-hidden relative"
              style={{
                backgroundColor: cssCode,
              }}
            >
              <span
                className="text-lg font-bold font-mono"
                style={{
                  color: luminance(
                    parsedA.r + (parsedB.r - parsedA.r) * (percentage / 100),
                    parsedA.g + (parsedB.g - parsedA.g) * (percentage / 100),
                    parsedA.b + (parsedB.b - parsedA.b) * (percentage / 100),
                  ) > 128 ? '#1e293b' : '#f8fafc',
                }}
              >
                color-mix(in {colorSpace}, {colorA}, {colorB})
              </span>
            </div>

            {/* Mini comparison strips */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <div className="h-8 rounded-md border border-slate-700/30" style={{ backgroundColor: colorA }} />
                <div className="text-[10px] text-slate-500 font-mono mt-1 text-center">{colorA}</div>
              </div>
              <div>
                <div className="h-8 rounded-md border-2 border-brand-500/50" style={{ backgroundColor: cssCode }} />
                <div className="text-[10px] text-brand-400 font-mono mt-1 text-center">Mixed</div>
              </div>
              <div>
                <div className="h-8 rounded-md border border-slate-700/30" style={{ backgroundColor: colorB }} />
                <div className="text-[10px] text-slate-500 font-mono mt-1 text-center">{colorB}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Generated CSS ──────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Generated CSS
            </h3>
            <button
              onClick={() => copyToClipboard(fullCss, 'CSS')}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
          </div>
          <pre className="bg-slate-950 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300 border border-slate-800">
            <code>{fullCss}</code>
          </pre>
          <p className="text-xs text-slate-500 mt-2">
            The <code className="text-brand-400 bg-brand-500/10 px-1 rounded">color-mix()</code> function is supported in all modern browsers (Baseline 2025).
            The color space determines HOW the two colors blend — <code className="text-brand-400 bg-brand-500/10 px-1 rounded">oklch</code> gives the most perceptually pleasing results.
          </p>
        </div>

        {/* ── Tips ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card border-slate-700/30 bg-slate-800/20">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              💡 Why color-mix()?
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>&bull; <strong className="text-slate-300">No JavaScript needed</strong> — CSS handles interpolation</li>
              <li>&bull; <strong className="text-slate-300">Respects color space</strong> — mix in perceptually uniform spaces like Oklch</li>
              <li>&bull; <strong className="text-slate-300">Works with custom properties</strong> — <code className="text-brand-400 bg-brand-500/10 px-1 rounded">var(&#8209;&#8209;brand)</code></li>
              <li>&bull; <strong className="text-slate-300">Animatable</strong> — transition the percentage for smooth effects</li>
            </ul>
          </div>
          <div className="card border-slate-700/30 bg-slate-800/20">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              🎨 When to use each space
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>&bull; <strong className="text-slate-300">oklch / oklab</strong> — best perceptual results, modern default</li>
              <li>&bull; <strong className="text-slate-300">srgb</strong> — legacy default, matches most screens</li>
              <li>&bull; <strong className="text-slate-300">lch / lab</strong> — good gradients, wide browser support</li>
              <li>&bull; <strong className="text-slate-300">display-p3</strong> — HDR displays, wider color gamut</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
