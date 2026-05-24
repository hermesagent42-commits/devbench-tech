'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, PaintBucket, Layers, Type, Square, Circle } from 'lucide-react';
import toast from 'react-hot-toast';

type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'darken' | 'lighten' | 'color-dodge' | 'color-burn'
  | 'hard-light' | 'soft-light' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

type BlendType = 'mix-blend-mode' | 'background-blend-mode';
type ShapeType = 'circle' | 'square' | 'text';

interface BlendInfo {
  label: string;
  category: string;
  description: string;
}

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay',
  'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity',
];

const BLEND_INFO: Record<BlendMode, BlendInfo> = {
  normal: { label: 'Normal', category: 'Basic', description: 'No blending — the foreground is fully opaque.' },
  multiply: { label: 'Multiply', category: 'Darken', description: 'Multiplies colors. Always produces a darker result. White becomes transparent.' },
  screen: { label: 'Screen', category: 'Lighten', description: 'Inverts, multiplies, then inverts again. Always produces a lighter result. Black becomes transparent.' },
  overlay: { label: 'Overlay', category: 'Contrast', description: 'Combines multiply and screen. Light parts get lighter, dark parts get darker.' },
  darken: { label: 'Darken', category: 'Darken', description: 'Keeps the darkest color per channel. Great for removing white backgrounds.' },
  lighten: { label: 'Lighten', category: 'Lighten', description: 'Keeps the lightest color per channel. Great for removing black backgrounds.' },
  'color-dodge': { label: 'Color Dodge', category: 'Lighten', description: 'Brightens the background to reflect the foreground. Produces high-contrast results.' },
  'color-burn': { label: 'Color Burn', category: 'Darken', description: 'Darkens the background to reflect the foreground. Produces deep, rich shadows.' },
  'hard-light': { label: 'Hard Light', category: 'Contrast', description: 'Like overlay but with foreground and background swapped. Harsh contrast effect.' },
  'soft-light': { label: 'Soft Light', category: 'Contrast', description: 'Like overlay but gentler. Subtle dodging and burning for a soft effect.' },
  difference: { label: 'Difference', category: 'Inversion', description: 'Subtracts the darker color from the lighter one. Inverts colors at midpoints.' },
  exclusion: { label: 'Exclusion', category: 'Inversion', description: 'Similar to difference but lower contrast. Gray (50%) has no effect.' },
  hue: { label: 'Hue', category: 'Component', description: 'Uses the foreground hue with background saturation and luminosity.' },
  saturation: { label: 'Saturation', category: 'Component', description: 'Uses the foreground saturation with background hue and luminosity.' },
  color: { label: 'Color', category: 'Component', description: 'Uses foreground hue and saturation with background luminosity. Preserves gray levels.' },
  luminosity: { label: 'Luminosity', category: 'Component', description: 'Uses foreground luminosity with background hue and saturation. Inverse of Color.' },
};

interface Preset {
  name: string;
  bg: string;
  fg: string;
  mode: BlendMode;
  shape: ShapeType;
}

const PRESETS: Preset[] = [
  { name: 'Duotone Glow', bg: '#1a1a2e', fg: '#e94560', mode: 'screen', shape: 'circle' },
  { name: 'Vaporwave', bg: '#ff6b6b', fg: '#4ecdc4', mode: 'overlay', shape: 'square' },
  { name: 'Photo Multiply', bg: '#ffd166', fg: '#06d6a0', mode: 'multiply', shape: 'circle' },
  { name: 'Neon Subtract', bg: '#0f0f23', fg: '#00ff88', mode: 'difference', shape: 'text' },
  { name: 'Soft Portrait', bg: '#f4a261', fg: '#e76f51', mode: 'soft-light', shape: 'circle' },
  { name: 'Invert Pop', bg: '#264653', fg: '#e9c46a', mode: 'exclusion', shape: 'square' },
  { name: 'Lens Flare', bg: '#2b2d42', fg: '#8d99ae', mode: 'color-dodge', shape: 'circle' },
  { name: 'Burn Shadow', bg: '#fefae0', fg: '#d4a373', mode: 'color-burn', shape: 'square' },
  { name: 'Hue Shift', bg: '#8338ec', fg: '#ff006e', mode: 'hue', shape: 'circle' },
  { name: 'Luma Mask', bg: '#ffbe0b', fg: '#fb5607', mode: 'luminosity', shape: 'text' },
  { name: 'Hard Edge', bg: '#03045e', fg: '#00b4d8', mode: 'hard-light', shape: 'square' },
  { name: 'Color Wash', bg: '#606c38', fg: '#fefae0', mode: 'color', shape: 'circle' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map(c => parseInt(c + c, 16));
    return { r, g, b };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToString(r: number, g: number, b: number): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function blendChannel(back: number, fore: number, mode: BlendMode): number {
  const b = back / 255;
  const f = fore / 255;

  let result: number;
  switch (mode) {
    case 'normal': result = f; break;
    case 'multiply': result = b * f; break;
    case 'screen': result = 1 - (1 - b) * (1 - f); break;
    case 'overlay': result = b < 0.5 ? 2 * b * f : 1 - 2 * (1 - b) * (1 - f); break;
    case 'darken': result = Math.min(b, f); break;
    case 'lighten': result = Math.max(b, f); break;
    case 'color-dodge': result = f === 1 ? 1 : Math.min(1, b / (1 - f)); break;
    case 'color-burn': result = f === 0 ? 0 : 1 - Math.min(1, (1 - b) / f); break;
    case 'hard-light': result = f < 0.5 ? 2 * b * f : 1 - 2 * (1 - b) * (1 - f); break;
    case 'soft-light': {
      if (f < 0.5) result = b - (1 - 2 * f) * b * (1 - b);
      else result = b + (2 * f - 1) * (Math.sqrt(b) - b);
      break;
    }
    case 'difference': result = Math.abs(b - f); break;
    case 'exclusion': result = b + f - 2 * b * f; break;
    default: result = f;
  }

  return Math.round(Math.max(0, Math.min(1, result)) * 255);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb), min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === nr) h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6;
    else if (max === ng) h = ((nb - nr) / d + 2) / 6;
    else h = ((nr - ng) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const ns = s / 100, nl = l / 100;
  const a = ns * Math.min(nl, 1 - nl);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return nl - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

function blendComponent(back: number, fore: number, blendType: BlendMode): number {
  if (blendType === 'normal') return fore;
  if (['multiply', 'screen', 'overlay', 'darken', 'lighten',
       'color-dodge', 'color-burn', 'hard-light', 'soft-light',
       'difference', 'exclusion'].includes(blendType)) {
    return blendChannel(back, fore, blendType as BlendMode);
  }
  return fore;
}

function blendRgb(bgRgb: { r: number; g: number; b: number }, fgRgb: { r: number; g: number; b: number }, mode: BlendMode): { r: number; g: number; b: number } {
  if (mode === 'hue' || mode === 'saturation' || mode === 'color' || mode === 'luminosity') {
    const bgHsl = rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
    const fgHsl = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);

    let h: number, s: number, l: number;
    switch (mode) {
      case 'hue': h = fgHsl.h; s = bgHsl.s; l = bgHsl.l; break;
      case 'saturation': h = bgHsl.h; s = fgHsl.s; l = bgHsl.l; break;
      case 'color': h = fgHsl.h; s = fgHsl.s; l = bgHsl.l; break;
      case 'luminosity': h = bgHsl.h; s = bgHsl.s; l = fgHsl.l; break;
      default: h = fgHsl.h; s = fgHsl.s; l = fgHsl.l;
    }
    return hslToRgb(h, s, l);
  }

  return {
    r: blendComponent(bgRgb.r, fgRgb.r, mode),
    g: blendComponent(bgRgb.g, fgRgb.g, mode),
    b: blendComponent(bgRgb.b, fgRgb.b, mode),
  };
}

export default function CssBlendPlaygroundPage() {
  const [bgColor, setBgColor] = useState('#1a1a2e');
  const [fgColor, setFgColor] = useState('#e94560');
  const [blendMode, setBlendMode] = useState<BlendMode>('screen');
  const [blendType, setBlendType] = useState<BlendType>('mix-blend-mode');
  const [shape, setShape] = useState<ShapeType>('circle');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const bgRgb = useMemo(() => hexToRgb(bgColor), [bgColor]);
  const fgRgb = useMemo(() => hexToRgb(fgColor), [fgColor]);

  const blended = useMemo(() => blendRgb(bgRgb, fgRgb, blendMode), [bgRgb, fgRgb, blendMode]);
  const blendedRgb = `rgb(${blended.r}, ${blended.g}, ${blended.b})`;
  const blendedHex = '#' + [blended.r, blended.g, blended.b].map(c => c.toString(16).padStart(2, '0')).join('');

  const handleCopy = useCallback(async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(`${field} copied!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setBgColor(preset.bg);
    setFgColor(preset.fg);
    setBlendMode(preset.mode);
    setShape(preset.shape);
  }, []);

  const cssCode = useMemo(() => {
    if (blendType === 'mix-blend-mode') {
      return `.blend-target {
  mix-blend-mode: ${blendMode};
  background-color: ${fgColor};
}
.background {
  background-color: ${bgColor};
}`;
    }
    return `.blended-background {
  background-color: ${bgColor};
  background-image: linear-gradient(${fgColor}, ${fgColor});
  background-blend-mode: ${blendMode};
}`;
  }, [blendMode, blendType, bgColor, fgColor]);

  const categories = useMemo(() => {
    const cats = new Map<string, BlendMode[]>();
    BLEND_MODES.forEach(m => {
      const cat = BLEND_INFO[m].category;
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(m);
    });
    const result: [string, BlendMode[]][] = [];
    cats.forEach((modes, cat) => result.push([cat, modes]));
    return result;
  }, []);

  const blendInfo = BLEND_INFO[blendMode];

  // Determine text color for readability on dark/light backgrounds
  const previewLabelColor = useMemo(() => {
    const bgLum = (bgRgb.r * 299 + bgRgb.g * 587 + bgRgb.b * 114) / 1000;
    return bgLum > 128 ? '#1a1a2e' : '#ffffff';
  }, [bgRgb]);

  return (
    <ToolLayout
      title="CSS Blend Mode Playground"
      description="Experiment with all 16 CSS blend modes. Compare mix-blend-mode and background-blend-mode with real-time previews and computed color values."
    >
      {/* Color pickers row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <label className="block text-white font-semibold text-sm mb-3">Background Color</label>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <input
                type="color"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                className="absolute inset-0 w-12 h-12 opacity-0 cursor-pointer"
              />
              <div
                className="w-12 h-12 rounded-xl border-2 border-slate-600/50 cursor-pointer hover:border-brand-400/50 transition-colors"
                style={{ backgroundColor: bgColor }}
              />
            </div>
            <input
              type="text"
              value={bgColor}
              onChange={e => setBgColor(e.target.value)}
              className="input-field flex-1 font-mono text-sm"
              spellCheck={false}
              placeholder="#1a1a2e"
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{rgbToString(bgRgb.r, bgRgb.g, bgRgb.b)}</span>
          </div>
        </div>

        <div className="card">
          <label className="block text-white font-semibold text-sm mb-3">Foreground Color</label>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <input
                type="color"
                value={fgColor}
                onChange={e => setFgColor(e.target.value)}
                className="absolute inset-0 w-12 h-12 opacity-0 cursor-pointer"
              />
              <div
                className="w-12 h-12 rounded-xl border-2 border-slate-600/50 cursor-pointer hover:border-brand-400/50 transition-colors"
                style={{ backgroundColor: fgColor }}
              />
            </div>
            <input
              type="text"
              value={fgColor}
              onChange={e => setFgColor(e.target.value)}
              className="input-field flex-1 font-mono text-sm"
              spellCheck={false}
              placeholder="#e94560"
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{rgbToString(fgRgb.r, fgRgb.g, fgRgb.b)}</span>
          </div>
        </div>
      </div>

      {/* Blend type toggle + shape selector */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Property:</span>
            <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
              {(['mix-blend-mode', 'background-blend-mode'] as BlendType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setBlendType(t)}
                  className={`px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
                    blendType === t
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-slate-400 hover:text-white'
                  } ${t === 'mix-blend-mode' ? 'border-r border-slate-700/50' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shape:</span>
            <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
              {([
                { s: 'circle' as ShapeType, icon: Circle },
                { s: 'square' as ShapeType, icon: Square },
                { s: 'text' as ShapeType, icon: Type },
              ]).map(({ s, icon: Icon }) => (
                <button
                  key={s}
                  onClick={() => setShape(s)}
                  className={`p-2 transition-colors ${
                    shape === s
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-slate-400 hover:text-white'
                  } border-r border-slate-700/50 last:border-r-0`}
                  title={s.charAt(0).toUpperCase() + s.slice(1)}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="card mb-6 overflow-hidden">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <PaintBucket className="w-4 h-4 text-brand-400" />
          Live Preview
        </h3>
        <div
          className="relative w-full rounded-lg overflow-hidden"
          style={{
            backgroundColor: bgColor,
            minHeight: '320px',
            backgroundImage: blendType === 'background-blend-mode' ?
              `linear-gradient(${fgColor}, ${fgColor})` : undefined,
            backgroundBlendMode: blendType === 'background-blend-mode' ? blendMode : undefined,
          }}
        >
          {blendType === 'mix-blend-mode' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                mixBlendMode: blendMode,
                backgroundColor: fgColor,
              }}
            >
              {shape === 'circle' && (
                <div
                  className="rounded-full"
                  style={{
                    width: '200px',
                    height: '200px',
                    backgroundColor: fgColor,
                    mixBlendMode: 'normal',
                  }}
                />
              )}
              {shape === 'square' && (
                <div
                  className="rounded-xl"
                  style={{
                    width: '200px',
                    height: '200px',
                    backgroundColor: fgColor,
                    mixBlendMode: 'normal',
                  }}
                />
              )}
              {shape === 'text' && (
                <span
                  className="text-7xl font-black select-none"
                  style={{ color: fgColor, mixBlendMode: 'normal' }}
                >
                  BLEND
                </span>
              )}
            </div>
          )}

          {blendType === 'background-blend-mode' && (
            <div className="absolute inset-0 flex items-center justify-center">
              {shape === 'circle' && (
                <div
                  className="w-[200px] h-[200px] rounded-full"
                  style={{
                    backgroundColor: 'transparent',
                    border: '3px solid rgba(255,255,255,0.3)',
                  }}
                />
              )}
              {shape === 'square' && (
                <div
                  className="w-[200px] h-[200px] rounded-xl"
                  style={{
                    backgroundColor: 'transparent',
                    border: '3px solid rgba(255,255,255,0.3)',
                  }}
                />
              )}
              {shape === 'text' && (
                <span className="text-7xl font-black select-none" style={{ color: previewLabelColor, opacity: 0.4 }}>
                  BLEND
                </span>
              )}
            </div>
          )}

          {/* Label */}
          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <span className="text-xs font-mono" style={{ color: previewLabelColor }}>
              {blendMode} on {shape}
            </span>
          </div>
        </div>
      </div>

      {/* Blend mode grid */}
      <div className="mb-6">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" />
          Blend Mode
        </h3>
        <div className="space-y-4">
          {categories.map(([category, modes]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{category}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {modes.map(mode => (
                  <button
                    key={mode}
                    onClick={() => setBlendMode(mode)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      blendMode === mode
                        ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/20'
                        : 'border-slate-700/50 bg-surface hover:border-slate-600/50'
                    }`}
                  >
                    {/* Mini preview swatch */}
                    <div
                      className="w-full h-8 rounded mb-2"
                      style={{
                        background: blendType === 'background-blend-mode'
                          ? `${bgColor} linear-gradient(to right, ${fgColor}, ${fgColor})` as string
                          : `linear-gradient(to right, ${bgColor} 50%, ${fgColor} 50%)` as string,
                        backgroundBlendMode: blendType === 'background-blend-mode' ? mode : undefined,
                      }}
                    />
                    <div className="font-mono text-xs text-white font-semibold truncate">
                      {BLEND_INFO[mode].label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description of current blend mode */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-semibold text-sm">{blendInfo.label}</h3>
          <span className="text-xs text-slate-500">{blendInfo.category}</span>
        </div>
        <p className="text-slate-400 text-sm mb-4">{blendInfo.description}</p>
        <button
          onClick={() => setShowFormulas(!showFormulas)}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          {showFormulas ? 'Hide' : 'Show'} math formula →
        </button>
        {showFormulas && (
          <div className="mt-3 p-3 bg-surface rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              {blendMode === 'multiply' && 'R = S × D (source × destination, per channel)'}
              {blendMode === 'screen' && 'R = 1 - (1 - S) × (1 - D) (inverse multiply)'}
              {blendMode === 'overlay' && 'R = D < 0.5 ? 2SD : 1 - 2(1 - S)(1 - D) (multiply or screen based on destination)'}
              {blendMode === 'darken' && 'R = min(S, D) per channel'}
              {blendMode === 'lighten' && 'R = max(S, D) per channel'}
              {blendMode === 'color-dodge' && 'R = D / (1 - S) (unless S = 1, then R = 1)'}
              {blendMode === 'color-burn' && 'R = 1 - (1 - D) / S (unless S = 0, then R = 0)'}
              {blendMode === 'hard-light' && 'R = S < 0.5 ? 2SD : 1 - 2(1 - S)(1 - D) (like overlay with S/D swapped)'}
              {blendMode === 'soft-light' && 'R = S < 0.5 ? D - (1 - 2S)D(1 - D) : D + (2S - 1)(√D - D)'}
              {blendMode === 'difference' && 'R = |D - S| per channel'}
              {blendMode === 'exclusion' && 'R = D + S - 2DS (lower contrast difference)'}
              {blendMode === 'hue' && 'R = HSL(S_h, D_s, D_l) — foreground hue, background saturation/luminosity'}
              {blendMode === 'saturation' && 'R = HSL(D_h, S_s, D_l) — foreground saturation'}
              {blendMode === 'color' && 'R = HSL(S_h, S_s, D_l) — foreground hue+saturation, background luminosity'}
              {blendMode === 'luminosity' && 'R = HSL(D_h, D_s, S_l) — foreground luminosity'}
              {blendMode === 'normal' && 'R = S (no blending, source replaces destination)'}
            </p>
          </div>
        )}
      </div>

      {/* Computed result */}
      <div className="card mb-6">
        <h3 className="text-white font-semibold text-sm mb-4">
          Computed Blend Result
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface rounded-lg border border-slate-700/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Blended Color</span>
              <button
                onClick={() => handleCopy(blendedHex, 'blended hex')}
                className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  copiedField === 'blended hex'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-transparent'
                }`}
              >
                {copiedField === 'blended hex' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg ring-1 ring-slate-600/30"
                style={{ backgroundColor: blendedHex }}
              />
              <div>
                <div className="font-mono text-sm text-white">{blendedHex.toUpperCase()}</div>
                <div className="text-xs text-slate-500 font-mono">{blendedRgb}</div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-slate-700/50 p-3">
            <span className="text-xs text-slate-500">Background</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-5 h-5 rounded ring-1 ring-slate-600/30 shrink-0" style={{ backgroundColor: bgColor }} />
              <span className="font-mono text-sm text-white">{bgColor}</span>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-slate-700/50 p-3">
            <span className="text-xs text-slate-500">Foreground</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-5 h-5 rounded ring-1 ring-slate-600/30 shrink-0" style={{ backgroundColor: fgColor }} />
              <span className="font-mono text-sm text-white">{fgColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Output */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">CSS Output</h3>
          <button
            onClick={() => handleCopy(cssCode, 'CSS')}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              copiedField === 'CSS'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-transparent'
            }`}
          >
            {copiedField === 'CSS' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedField === 'CSS' ? 'Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {cssCode}
        </pre>
      </div>

      {/* Presets */}
      <div className="card">
        <h3 className="text-white font-semibold text-sm mb-4">Inspiration Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PRESETS.map(preset => {
            const isActive = bgColor === preset.bg && fgColor === preset.fg && blendMode === preset.mode && shape === preset.shape;
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/20'
                    : 'border-slate-700/50 bg-surface hover:border-slate-600/50'
                }`}
              >
                <div
                  className="w-full h-12 rounded-lg mb-2 relative overflow-hidden"
                  style={{ backgroundColor: preset.bg }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ mixBlendMode: preset.mode, backgroundColor: preset.fg }}
                  >
                    {preset.shape === 'circle' && (
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.fg }} />
                    )}
                    {preset.shape === 'square' && (
                      <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: preset.fg }} />
                    )}
                    {preset.shape === 'text' && (
                      <span className="text-[10px] font-black" style={{ color: preset.fg }}>
                        Aa
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-white font-semibold truncate">{preset.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{BLEND_INFO[preset.mode].label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </ToolLayout>
  );
}
