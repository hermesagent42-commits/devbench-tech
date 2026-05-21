'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Palette, ArrowRightLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

type ColorMode = 'hex' | 'rgb' | 'hsl';

// ── Conversion utilities ───────────────────────────────────────────────────

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return {
    r: parseInt(expanded.substring(0, 2), 16),
    g: parseInt(expanded.substring(2, 4), 16),
    b: parseInt(expanded.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
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

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const ns = s / 100;
  const nl = l / 100;
  const a = ns * Math.min(nl, 1 - nl);

  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return nl - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };

  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseRgbString(input: string): RGB | null {
  // Match "123, 45, 67" or "123 45 67" or "rgb(123, 45, 67)"
  const m = input.replace(/^rgb\(\s*/, '').replace(/\s*\)$/, '').match(/^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/);
  if (!m) return null;
  const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b };
}

function parseHslString(input: string): HSL | null {
  // Match "200, 80%, 50%" or "200 80% 50%" or "hsl(200, 80%, 50%)"
  const m = input.replace(/^hsl\(\s*/, '').replace(/\s*\)$/, '').match(/^(\d{1,3})[\s,]+(\d{1,3})%?[\s,]+(\d{1,3})%?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10), s = parseInt(m[2], 10), l = parseInt(m[3], 10);
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
  return { h, s, l };
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Brand Sky', value: '#38bdf8' },
  { name: 'Coral', value: '#ff6b6b' },
  { name: 'Mint', value: '#51cf66' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Slate', value: '#64748b' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function ColorConverterPage() {
  const [mode, setMode] = useState<ColorMode>('hex');
  const [input, setInput] = useState('#38bdf8');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parse input → RGB
  const rgb: RGB | null = useMemo(() => {
    if (!input.trim()) return null;
    switch (mode) {
      case 'hex':
        return hexToRgb(input.trim());
      case 'rgb':
        return parseRgbString(input.trim());
      case 'hsl': {
        const parsed = parseHslString(input.trim());
        return parsed ? hslToRgb(parsed.h, parsed.s, parsed.l) : null;
      }
    }
  }, [input, mode]);

  // Derived values
  const hex = useMemo(() => (rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : null), [rgb]);
  const hsl = useMemo(() => (rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null), [rgb]);

  const isValid = rgb !== null;
  const colorString = hex ?? '#000000';

  // Copy handler
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

  // Mode switch preserving color
  const switchMode = useCallback((newMode: ColorMode) => {
    if (!rgb) {
      setMode(newMode);
      setInput('');
      return;
    }
    switch (newMode) {
      case 'hex':
        setInput(rgbToHex(rgb.r, rgb.g, rgb.b));
        break;
      case 'rgb':
        setInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
        break;
      case 'hsl': {
        const h = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setInput(`${h.h}, ${h.s}%, ${h.l}%`);
        break;
      }
    }
    setMode(newMode);
  }, [rgb]);

  // Color picker
  const handlePickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value; // #rrggbb
    if (mode === 'hex') {
      setInput(picked);
    } else {
      const parsed = hexToRgb(picked);
      if (parsed) {
        switch (mode) {
          case 'rgb':
            setInput(`${parsed.r}, ${parsed.g}, ${parsed.b}`);
            break;
          case 'hsl': {
            const h = rgbToHsl(parsed.r, parsed.g, parsed.b);
            setInput(`${h.h}, ${h.s}%, ${h.l}%`);
            break;
          }
        }
      }
    }
  }, [mode]);

  // Preset handler
  const handlePreset = useCallback((value: string) => {
    const parsed = hexToRgb(value);
    if (!parsed) return;
    switch (mode) {
      case 'hex':
        setInput(value);
        break;
      case 'rgb':
        setInput(`${parsed.r}, ${parsed.g}, ${parsed.b}`);
        break;
      case 'hsl': {
        const h = rgbToHsl(parsed.r, parsed.g, parsed.b);
        setInput(`${h.h}, ${h.s}%, ${h.l}%`);
        break;
      }
    }
  }, [mode]);

  // Placeholder per mode
  const placeholder =
    mode === 'hex' ? '#38bdf8 or 38bdf8' :
    mode === 'rgb' ? '56, 189, 248' :
    '200, 92%, 60%';

  // Get the CSS string for the current color
  const cssColor = hex ?? '#000000';

  return (
    <ToolLayout
      title="Color Converter"
      description="Convert colors between HEX, RGB, and HSL in real-time. Live preview, color picker, and one-click copy."
    >
      {/* Mode + Input */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Mode tabs */}
          <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden shrink-0">
            {(['hex', 'rgb', 'hsl'] as ColorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-4 py-2 text-sm font-mono font-semibold transition-colors ${
                  mode === m
                    ? 'bg-brand-500/20 text-brand-400 border-r border-slate-700/50 last:border-r-0'
                    : 'text-slate-400 hover:text-white border-r border-slate-700/50 last:border-r-0'
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="input-field flex-1 font-mono text-sm"
              spellCheck={false}
            />
            {/* Color picker */}
            <div className="relative shrink-0">
              <input
                type="color"
                value={cssColor}
                onChange={handlePickerChange}
                className="absolute inset-0 w-10 h-10 opacity-0 cursor-pointer"
                title="Pick a color"
              />
              <div
                className="w-10 h-10 rounded-lg border-2 border-slate-600/50 cursor-pointer hover:border-brand-400/50 transition-colors"
                style={{ backgroundColor: cssColor }}
              />
            </div>
          </div>
        </div>

        {/* Validation */}
        {!isValid && input.trim() && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Invalid {mode.toUpperCase()} value. {mode === 'hex' ? 'Use formats like #ff0000 or ff0000.' : mode === 'rgb' ? 'Use format: 255, 0, 0' : 'Use format: 0, 100%, 50%'}
          </div>
        )}
      </div>

      {/* Color preview + output cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Large preview */}
        <div
          className="card flex flex-col items-center justify-center min-h-[220px] transition-all duration-300"
          style={{ backgroundColor: cssColor }}
        >
          {isValid && (
            <>
              <span
                className="text-4xl font-bold drop-shadow-lg"
                style={{ color: hsl ? (hsl.l > 65 ? '#0f172a' : '#ffffff') : '#ffffff' }}
              >
                {hex?.toUpperCase()}
              </span>
              <span
                className="text-sm mt-2 opacity-70 drop-shadow"
                style={{ color: hsl ? (hsl.l > 65 ? '#0f172a' : '#ffffff') : '#ffffff' }}
              >
                {rgb && `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}
              </span>
            </>
          )}
          {!isValid && (
            <div className="text-center">
              <Palette className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Enter a valid color to see preview</p>
            </div>
          )}
        </div>

        {/* Format cards */}
        <div className="flex flex-col gap-3">
          {[
            { label: 'HEX', value: hex?.toUpperCase() ?? '—', format: 'hex' },
            { label: 'RGB', value: rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '—', format: 'rgb' },
            { label: 'HSL', value: hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : '—', format: 'hsl' },
          ].map(({ label, value, format }) => (
            <div key={label} className="flex items-center justify-between bg-surface rounded-lg border border-slate-700/50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-semibold text-slate-500 w-8 shrink-0">{label}</span>
                <span className="font-mono text-sm text-slate-200 truncate select-all">{value}</span>
              </div>
              <button
                onClick={() => handleCopy(value, format)}
                disabled={!isValid}
                className={`ml-3 shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                  copiedField === format
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-transparent'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {copiedField === format ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedField === format ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="card">
        <h3 className="text-white font-semibold text-sm mb-4">Quick Colors</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePreset(preset.value)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div
                className="w-10 h-10 rounded-lg ring-1 ring-slate-600/30 shadow-sm"
                style={{ backgroundColor: preset.value }}
              />
              <span className="text-xs text-slate-400 truncate w-full text-center">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
