'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Info, Check } from 'lucide-react';
import toast from 'react-hot-toast';

/* Color Utilities (zero-dependency) */

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  return { r, g, b };
}

function rgbToHsl(rgb: RGB): HSL {
  const { r, g, b } = rgb;
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;

  let h = 0;
  if (delta === 0) {
    h = 0;
  } else if (max === rf) {
    h = ((gf - bf) / delta) % 6;
  } else if (max === gf) {
    h = (bf - rf) / delta + 2;
  } else {
    h = (rf - gf) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;
  const sf = s / 100;
  const lf = l / 100;

  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;

  let rf = 0, gf = 0, bf = 0;
  if (h < 60) { rf = c; gf = x; }
  else if (h < 120) { rf = x; gf = c; }
  else if (h < 180) { gf = c; bf = x; }
  else if (h < 240) { gf = x; bf = c; }
  else if (h < 300) { rf = x; bf = c; }
  else { rf = c; bf = x; }

  return {
    r: Math.round((rf + m) * 255),
    g: Math.round((gf + m) * 255),
    b: Math.round((bf + m) * 255),
  };
}

function hslToHex(hsl: HSL): string {
  const { r, g, b } = hslToRgb(hsl);
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function rotateHue(h: number, deg: number): number {
  return ((h + deg) % 360 + 360) % 360;
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.5;
}

/* Harmony Types */

type HarmonyType =
  | 'analogous'
  | 'monochromatic'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic';

interface HarmonyInfo {
  id: HarmonyType;
  label: string;
  icon: string;
  description: string;
}

const HARMONIES: HarmonyInfo[] = [
  { id: 'complementary', label: 'Complementary', icon: '\u2B21', description: 'Colors directly opposite on the color wheel (180\u00b0 apart). Maximum contrast and visual tension \u2014 great for CTAs.' },
  { id: 'split-complementary', label: 'Split Complementary', icon: '\u25C8', description: 'Base + two colors adjacent to its complement (\u00b1150\u00b0). High contrast with more nuance than pure complementary.' },
  { id: 'analogous', label: 'Analogous', icon: '\u25C9', description: 'Colors that sit next to each other on the wheel. Creates serene, comfortable designs \u2014 found in nature.' },
  { id: 'triadic', label: 'Triadic', icon: '\u25B3', description: 'Three colors evenly spaced around the wheel (120\u00b0). Vibrant and balanced even with pale hues.' },
  { id: 'tetradic', label: 'Tetradic', icon: '\u25C7', description: 'Two complementary pairs forming a rectangle. Rich palette with lots of variety \u2014 use one dominant color.' },
  { id: 'monochromatic', label: 'Monochromatic', icon: '\u25D0', description: 'Variations in saturation and lightness of a single hue. Clean, elegant, and easy to balance.' },
];

function generateHarmony(
  baseHex: string,
  type: HarmonyType,
): { hex: string; hsl: HSL; isBase: boolean }[] {
  const rgb = hexToRgb(baseHex);
  if (!rgb) return [];
  const baseHsl = rgbToHsl(rgb);
  const colors: { hex: string; hsl: HSL; isBase: boolean }[] = [];

  const addColor = (hsl: HSL, isBase = false) => {
    colors.push({ hex: hslToHex(hsl), hsl, isBase });
  };

  switch (type) {
    case 'complementary':
      addColor(baseHsl, true);
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 180) });
      break;

    case 'split-complementary':
      addColor(baseHsl, true);
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 150) });
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 210) });
      break;

    case 'analogous':
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, -60) });
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, -30) });
      addColor(baseHsl, true);
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 30) });
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 60) });
      break;

    case 'triadic':
      addColor(baseHsl, true);
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 120) });
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 240) });
      break;

    case 'tetradic':
      addColor(baseHsl, true);
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 90) });
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 180) });
      addColor({ ...baseHsl, h: rotateHue(baseHsl.h, 270) });
      break;

    case 'monochromatic':
      addColor({ h: baseHsl.h, s: Math.min(baseHsl.s + 20, 100), l: Math.max(baseHsl.l - 20, 5) });
      addColor({ h: baseHsl.h, s: Math.min(baseHsl.s + 10, 100), l: Math.max(baseHsl.l - 10, 5) });
      addColor(baseHsl, true);
      addColor({ h: baseHsl.h, s: Math.max(baseHsl.s - 10, 0), l: Math.min(baseHsl.l + 10, 95) });
      addColor({ h: baseHsl.h, s: Math.max(baseHsl.s - 20, 0), l: Math.min(baseHsl.l + 20, 95) });
      break;
  }

  return colors;
}

/* React Component */

export default function ColorHarmonyPage() {
  const [baseColor, setBaseColor] = useState('#6366f1');
  const [hexInput, setHexInput] = useState('6366f1');
  const [activeHarmony, setActiveHarmony] = useState<HarmonyType>('complementary');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const palette = useMemo(
    () => generateHarmony(baseColor, activeHarmony),
    [baseColor, activeHarmony],
  );

  const activeInfo = useMemo(
    () => HARMONIES.find(h => h.id === activeHarmony)!,
    [activeHarmony],
  );

  const validateAndSetHex = useCallback((val: string) => {
    const clean = val.replace('#', '').trim();
    setHexInput(clean);
    if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) {
      const full = clean.length === 3
        ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
        : clean;
      setBaseColor('#' + full.toLowerCase());
    }
  }, []);

  const handleColorPicker = useCallback((val: string) => {
    setBaseColor(val);
    setHexInput(val.replace('#', ''));
  }, []);

  const setSwatchAsBase = useCallback((hex: string) => {
    setBaseColor(hex);
    setHexInput(hex.replace('#', ''));
  }, []);

  const copyColor = useCallback((hex: string, idx: number) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedIdx(idx);
      toast.success(hex + ' copied!');
      setTimeout(() => setCopiedIdx(null), 1500);
    }).catch(() => toast.error('Failed to copy'));
  }, []);

  const copyPalette = useCallback(() => {
    const hexes = palette.map(c => c.hex).join(', ');
    navigator.clipboard.writeText(hexes).then(
      () => toast.success('Palette copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [palette]);

  const reset = useCallback(() => {
    setBaseColor('#6366f1');
    setHexInput('6366f1');
    setActiveHarmony('complementary');
  }, []);

  return (
    <ToolLayout
      title="Color Harmony Generator"
      description="Generate beautiful color palettes using color theory — complementary, triadic, analogous, and more. Click any swatch to make it the new base color."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-5">
          <div className="card space-y-4">
            <label className="text-white font-semibold text-sm block">Base Color</label>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border-2 border-slate-600 shadow-inner flex-shrink-0 relative overflow-hidden"
                style={{ backgroundColor: baseColor }}
              >
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => handleColorPicker(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">#</span>
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => validateAndSetHex(e.target.value)}
                  className="input-field w-full pl-8 font-mono text-sm"
                  placeholder="6366f1"
                  maxLength={6}
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#64748b'].map(c => (
                <button
                  key={c}
                  onClick={() => { setBaseColor(c); setHexInput(c.replace('#', '')); }}
                  className="w-7 h-7 rounded-md border border-slate-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="text-white font-semibold text-sm">Harmony Type</h3>
            <div className="space-y-1">
              {HARMONIES.map(h => (
                <button
                  key={h.id}
                  onClick={() => setActiveHarmony(h.id)}
                  className={'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ' +
                    (activeHarmony === h.id
                      ? 'bg-brand-500/10 border border-brand-500/40 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-lighter border border-transparent')}
                >
                  <span className="text-lg">{h.icon}</span>
                  <span className="font-medium">{h.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card bg-brand-500/5 border border-brand-500/20">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-brand-200 font-medium">{activeInfo.label}</p>
                <p className="text-xs text-brand-300/70 mt-1">{activeInfo.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Swatches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">
                {activeInfo.label} Palette ({palette.length} colors)
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={copyPalette} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </button>
                <button onClick={reset} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div className={
              palette.length <= 3 ? 'grid grid-cols-3 gap-3' :
              palette.length === 4 ? 'grid grid-cols-2 sm:grid-cols-4 gap-3' :
              'grid grid-cols-2 sm:grid-cols-5 gap-3'
            }>
              {palette.map((color, idx) => {
                const isLight = isLightColor(color.hex);
                return (
                  <div key={idx} className="flex flex-col">
                    <button
                      onClick={() => setSwatchAsBase(color.hex)}
                      className="w-full aspect-square rounded-xl border-2 transition-all hover:scale-[1.03] hover:shadow-lg cursor-pointer relative group"
                      style={{
                        backgroundColor: color.hex,
                        borderColor: color.isBase ? '#818cf8' : 'transparent',
                        boxShadow: color.isBase ? '0 0 0 3px rgba(99,102,241,0.4)' : undefined,
                      }}
                      title="Click to set as base color"
                    >
                      {color.isBase && (
                        <span className={'absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded ' + (isLight ? 'bg-black/20 text-black' : 'bg-white/20 text-white')}>
                          BASE
                        </span>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/15 rounded-xl">
                        <span className={'text-[11px] font-medium px-2 py-1 rounded-md ' + (isLight ? 'bg-black/40 text-black' : 'bg-white/40 text-white')}>
                          Use as base
                        </span>
                      </div>
                    </button>
                    <div className="mt-2 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-300 font-medium">{color.hex.toUpperCase()}</span>
                        <button
                          onClick={() => copyColor(color.hex, idx)}
                          className="text-slate-500 hover:text-brand-400 transition-colors p-0.5"
                          title="Copy hex"
                        >
                          {copiedIdx === idx ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        HSL({color.hsl.h}&deg;, {color.hsl.s}%, {color.hsl.l}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gradient strip */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4">Gradient Preview</h3>
            <div
              className="w-full h-16 rounded-xl border border-slate-700"
              style={{ background: 'linear-gradient(to right, ' + palette.map(c => c.hex).join(', ') + ')' }}
            />
            <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-mono">
              {palette.map((c, i) => (
                <span key={i} className="text-center">{c.hex.toUpperCase()}</span>
              ))}
            </div>
          </div>

          {/* Data table */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Color Values</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                    <th className="text-left py-2 pr-4">Swatch</th>
                    <th className="text-left py-2 pr-4">HEX</th>
                    <th className="text-left py-2 pr-4">HSL</th>
                    <th className="text-left py-2">RGB</th>
                  </tr>
                </thead>
                <tbody>
                  {palette.map((color, idx) => {
                    const rgb = hexToRgb(color.hex)!;
                    return (
                      <tr key={idx} className="border-b border-slate-700/30 last:border-0">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border border-slate-600 flex-shrink-0" style={{ backgroundColor: color.hex }} />
                            {color.isBase && <span className="text-[10px] font-bold text-brand-400">BASE</span>}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-slate-200 text-xs">{color.hex.toUpperCase()}</td>
                        <td className="py-2.5 pr-4 font-mono text-slate-400 text-xs">hsl({color.hsl.h}&deg;, {color.hsl.s}%, {color.hsl.l}%)</td>
                        <td className="py-2.5 font-mono text-slate-400 text-xs">rgb({rgb.r}, {rgb.g}, {rgb.b})</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
