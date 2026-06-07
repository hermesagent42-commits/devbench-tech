'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Pipette, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';

type ColorSpace = 'srgb' | 'oklch' | 'oklab' | 'hsl' | 'hwb' | 'lab' | 'lch' | 'xyz';

interface Preset {
  name: string;
  color1: string;
  color2: string;
  ratio: number;
  space: ColorSpace;
}

const PRESETS: Preset[] = [
  { name: 'Blue + Red = Purple', color1: '#3b82f6', color2: '#ef4444', ratio: 50, space: 'srgb' },
  { name: 'Yellow + Blue = Green', color1: '#eab308', color2: '#3b82f6', ratio: 50, space: 'oklch' },
  { name: 'Primary Button Hover', color1: '#6366f1', color2: '#ffffff', ratio: 12, space: 'srgb' },
  { name: 'Darken with Black (OKLCH)', color1: '#f59e0b', color2: '#000000', ratio: 30, space: 'oklch' },
  { name: 'Coral + Teal (HSL)', color1: '#f97316', color2: '#14b8a6', ratio: 45, space: 'hsl' },
  { name: 'Pink Transparency', color1: '#ec4899', color2: 'transparent', ratio: 65, space: 'srgb' },
  { name: 'Brand Neutral Tint (LAB)', color1: '#10b981', color2: '#78716c', ratio: 20, space: 'lab' },
  { name: 'Mint + Lavender', color1: '#06b6d4', color2: '#a855f7', ratio: 40, space: 'oklch' },
];

const SPACES: { value: ColorSpace; label: string; description: string }[] = [
  { value: 'srgb', label: 'sRGB', description: 'Standard RGB — simplest, most compatible' },
  { value: 'oklch', label: 'OKLCH', description: 'Perceptual — smooth blends without gray dead zones' },
  { value: 'oklab', label: 'OKLab', description: 'Perceptual uniformity, linear color-mixing' },
  { value: 'hsl', label: 'HSL', description: 'Hue/Saturation/Lightness — intuitive but not perceptual' },
  { value: 'hwb', label: 'HWB', description: 'Hue/Whiteness/Blackness — easy to reason about' },
  { value: 'lab', label: 'Lab (CIE)', description: 'Device-independent, perceptually uniform' },
  { value: 'lch', label: 'LCH', description: 'Lightness/Chroma/Hue — like HSL but perceptual' },
  { value: 'xyz', label: 'XYZ (CIE)', description: 'Absolute reference space — precise but unintuitive' },
];

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function hexToOklch(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return 'oklch(0.5 0.2 260)';
  // Simplified approximation — in reality we'd do full conversion
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l2 = Math.cbrt(l), m2 = Math.cbrt(m), s2 = Math.cbrt(s);
  const okL = 0.2104542553 * l2 + 0.7936177850 * m2 - 0.0040720468 * s2;
  const a = 1.9779984951 * l2 - 2.4285922050 * m2 + 0.4505937099 * s2;
  const b2 = 0.0259040371 * l2 + 0.7827717662 * m2 - 0.8086757660 * s2;
  const C = Math.sqrt(a * a + b2 * b2);
  let H = (Math.atan2(b2, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `oklch(${(okL * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(0)})`;
}

export default function CssColorMixPlaygroundPage() {
  const [color1, setColor1] = useState('#3b82f6');
  const [color2, setColor2] = useState('#ef4444');
  const [ratio, setRatio] = useState(50);
  const [space, setSpace] = useState<ColorSpace>('srgb');

  const applyPreset = useCallback((p: Preset) => {
    setColor1(p.color1);
    setColor2(p.color2);
    setRatio(p.ratio);
    setSpace(p.space);
  }, []);

  const cssValue = useMemo(() => {
    const pct1 = ratio;
    const pct2 = 100 - ratio;
    // Omit second percentage if it's the default
    if (pct2 === 50 && pct1 === 50) return `color-mix(in ${space}, ${color1}, ${color2})`;
    if (pct2 === 100 - pct1) return `color-mix(in ${space}, ${color1} ${pct1}%, ${color2})`;
    return `color-mix(in ${space}, ${color1} ${pct1}%, ${color2} ${pct2}%)`;
  }, [color1, color2, ratio, space]);

  const tailwindValue = useMemo(() => {
    const pct1 = ratio;
    return `bg-[color-mix(in_${space},_${color1}_${pct1}%,_${color2})]`;
  }, [color1, color2, ratio, space]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  }, []);

  const previewStyle = useMemo(() => {
    return { background: cssValue } as React.CSSProperties;
  }, [cssValue]);

  // Build a gradient strip showing the blend spectrum
  const spectrumStops = useMemo(() => {
    const stops: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const p = i * 10;
      stops.push(`color-mix(in ${space}, ${color1} ${p}%, ${color2})`);
    }
    return stops;
  }, [color1, color2, space]);

  return (
    <ToolLayout
      title="CSS color-mix() Playground"
      description="Interactively blend colors with the CSS color-mix() function. Pick two colors, choose a color space, adjust the ratio, and get copy-ready CSS. Supports all 8 color spaces: sRGB, OKLCH, OKLab, HSL, HWB, Lab, LCH, and XYZ."
      controls={
        <>
          <Droplets className="w-4 h-4 text-brand-400" />
          <span className="text-sm text-slate-300 font-medium">Experiment with color-mix() — Baseline 2026, 95%+ global support</span>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Color 1 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color 1</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-600 bg-transparent"
              />
              <input
                type="text"
                value={color1}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setColor1(e.target.value);
                }}
                placeholder="#000000"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:border-brand-500"
              />
              {color1 !== 'transparent' && (
                <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1.5 rounded min-w-[100px]">
                  {hexToOklch(color1)}
                </span>
              )}
            </div>
          </div>

          {/* Color 2 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color 2</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color2 === 'transparent' ? '#000000' : color2}
                onChange={(e) => setColor2(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-600 bg-transparent"
              />
              <input
                type="text"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
                placeholder="transparent"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={() => setColor2(color2 === 'transparent' ? '#000000' : 'transparent')}
                className={`px-2 py-1.5 text-xs rounded font-mono transition-colors ${
                  color2 === 'transparent'
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'bg-slate-700 text-slate-400 border border-slate-600 hover:text-slate-200'
                }`}
              >
                transparent
              </button>
            </div>
          </div>

          {/* Ratio Slider */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mix Ratio — {ratio}% {color1} / {100 - ratio}% {color2}
            </label>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={100}
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{color1}</span>
                <span>{color2}</span>
              </div>
            </div>
          </div>

          {/* Color Space Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color Space</label>
            <div className="grid grid-cols-2 gap-2">
              {SPACES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpace(s.value)}
                  title={s.description}
                  className={`px-3 py-2 text-sm rounded-lg text-left transition-all ${
                    space === s.value
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 font-semibold'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="font-mono">{s.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => { setColor1('#3b82f6'); setColor2('#ef4444'); setRatio(50); setSpace('srgb'); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Right: Preview & Output */}
        <div className="space-y-6">
          {/* Big Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Live Preview</label>
            <div
              className="w-full h-40 rounded-xl border-2 border-slate-600 shadow-lg transition-all duration-200 flex items-center justify-center"
              style={previewStyle}
            >
              <span className="text-white text-xl font-bold drop-shadow-lg mix-blend-difference">
                {cssValue}
              </span>
            </div>
          </div>

          {/* Blend Spectrum */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Blend Spectrum (0% → 100%)</label>
            <div className="h-10 rounded-lg overflow-hidden flex border border-slate-600">
              {spectrumStops.map((stop, i) => (
                <div
                  key={i}
                  className="flex-1 h-full flex items-center justify-center"
                  style={{ background: stop }}
                >
                  {i === 5 && (
                    <span className="text-[10px] font-bold mix-blend-difference text-white">50%</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>100% {color1}</span>
              <span>100% {color2}</span>
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">CSS</label>
            <div className="relative">
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap break-all">
                {cssValue}
              </pre>
              <button
                onClick={() => copyToClipboard(cssValue, 'CSS')}
                className="absolute top-2 right-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
                aria-label="Copy CSS"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Tailwind */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tailwind Arbitrary Value</label>
            <div className="relative">
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap break-all">
                {tailwindValue}
              </pre>
              <button
                onClick={() => copyToClipboard(tailwindValue, 'Tailwind')}
                className="absolute top-2 right-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
                aria-label="Copy Tailwind"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Presets Section */}
      <div className="mt-10 pt-8 border-t border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Pipette className="w-5 h-5 text-brand-400" />
          Preset Blends
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="p-3 rounded-xl border border-slate-700 hover:border-brand-500/50 hover:bg-slate-800/50 transition-all group text-left"
            >
              <div
                className="w-full h-12 rounded-lg mb-2 border border-slate-600/50 shadow-inner transition-transform group-hover:scale-105"
                style={{
                  background: `color-mix(in ${p.space}, ${p.color1} ${p.ratio}%, ${p.color2})`,
                }}
              />
              <div className="text-xs font-medium text-slate-300 truncate">{p.name}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.space} · {p.ratio}%</div>
            </button>
          ))}
        </div>
      </div>

      {/* Docs Section */}
      <div className="mt-10 pt-8 border-t border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">About CSS color-mix()</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">Syntax</h4>
            <pre className="text-xs font-mono text-slate-300 bg-slate-900 p-3 rounded overflow-x-auto">
{`color-mix(in <color-space>,
  <color> [<percentage>],
  <color> [<percentage>]
)`}</pre>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">Browser Support</h4>
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Baseline 2026</strong> — Chrome 111+, Firefox 113+, Safari 16.2+, Edge 111+.
              Over 95% global coverage. Can be used in production today.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">Use Cases</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Generate hover/focus states without extra color variables</li>
              <li>Create opacity-like effects in OKLCH (cleaner than rgba)</li>
              <li>Build dynamic theme systems with CSS custom properties</li>
              <li>Blend brand colors for tints and shades</li>
              <li>Accessible contrast adjustments</li>
            </ul>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-brand-400 mb-2">Pro Tip: OKLCH vs sRGB</h4>
            <p className="text-xs text-slate-400">
              Always use <code className="text-brand-300 bg-slate-900 px-1 rounded">in oklch</code> for smooth,
              perceptually-uniform blends. sRGB blending can create muddy gray dead zones between complementary colors.
              OKLCH preserves hue and chroma through the entire blend.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
