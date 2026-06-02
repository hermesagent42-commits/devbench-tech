'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Type, Eye, Palette, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type CaretShape = 'auto' | 'block' | 'underscore';

interface Preset {
  name: string;
  color: string;
  shape: CaretShape;
  description: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Default',
    color: '#000000',
    shape: 'auto',
    description: 'Browser default — thin vertical bar',
  },
  {
    name: 'Brand Blue',
    color: '#3b82f6',
    shape: 'auto',
    description: 'Matches common brand/primary colors',
  },
  {
    name: 'Neon Green',
    color: '#22c55e',
    shape: 'auto',
    description: 'High visibility on dark backgrounds',
  },
  {
    name: 'Warm Amber',
    color: '#f59e0b',
    shape: 'auto',
    description: 'Soft, accessible contrast',
  },
  {
    name: 'Underscore Style',
    color: '#3b82f6',
    shape: 'underscore',
    description: 'Terminal-style underscore cursor',
  },
  {
    name: 'Block Cursor',
    color: '#8b5cf6',
    shape: 'block',
    description: 'Solid block — like vim insert mode',
  },
  {
    name: 'High Contrast',
    color: '#ef4444',
    shape: 'block',
    description: 'Maximum visibility for accessibility',
  },
  {
    name: 'Subtle Slate',
    color: '#94a3b8',
    shape: 'auto',
    description: 'Low-profile cursor for minimal UIs',
  },
];

// ── Utility ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return null;
  let h = match[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssCaretPlayground() {
  const [caretColor, setCaretColor] = useState('#3b82f6');
  const [caretShape, setCaretShape] = useState<CaretShape>('auto');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#1e293b');
  const [sampleText, setSampleText] = useState('Click here and start typing\nto test your caret style.');
  const [showAccessibility, setShowAccessibility] = useState(false);

  const contrast = useMemo(() => {
    const ratio = contrastRatio(caretColor, bgColor);
    return {
      ratio: parseFloat(ratio.toFixed(2)),
      aa: ratio >= 3,
      aaa: ratio >= 4.5,
    };
  }, [caretColor, bgColor]);

  const cssCode = useMemo(() => {
    const lines: string[] = [];
    lines.push(`caret-color: ${caretColor};`);
    if (caretShape !== 'auto') {
      lines.push(`caret-shape: ${caretShape};`);
    }
    return lines.join('\n');
  }, [caretColor, caretShape]);

  const htmlCode = useMemo(() => {
    return `<style>
  textarea {
    caret-color: ${caretColor};
    ${caretShape !== 'auto' ? `caret-shape: ${caretShape};` : ''}
    background: ${bgColor};
    color: ${textColor};
  }
</style>`.trim();
  }, [caretColor, caretShape, bgColor, textColor]);

  const applyPreset = useCallback((preset: Preset) => {
    setCaretColor(preset.color);
    setCaretShape(preset.shape);
  }, []);

  const copyCode = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${label} copied!`);
  }, []);

  return (
    <ToolLayout
      title="CSS Caret Playground"
      description="Design accessible text cursors with caret-color and caret-shape. Preview in real-time, check WCAG contrast, and copy production-ready CSS."
    >
      {/* ── Presets ──────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Presets
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/50 bg-surface-light hover:bg-slate-800/60 transition-colors text-left group"
              title={preset.description}
            >
              <span
                className="w-5 h-5 rounded flex-shrink-0 border border-slate-600"
                style={{ backgroundColor: preset.color }}
              />
              <span className="text-xs text-slate-300 group-hover:text-white truncate">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Main Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Controls */}
        <div className="space-y-5">
          {/* Color picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Palette className="w-4 h-4" />
              Caret Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={caretColor}
                onChange={(e) => setCaretColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={caretColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCaretColor(v);
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/50"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Shape selector */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Type className="w-4 h-4" />
              Caret Shape
            </label>
            <div className="flex gap-2">
              {(['auto', 'block', 'underscore'] as CaretShape[]).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setCaretShape(shape)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    caretShape === shape
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="mb-1 text-lg leading-none">
                    {shape === 'auto' && '▎'}
                    {shape === 'block' && '█'}
                    {shape === 'underscore' && '▁'}
                  </div>
                  {shape}
                </button>
              ))}
            </div>
          </div>

          {/* Background color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              Background
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
              />
              <div className="flex gap-1">
                {['#ffffff', '#1e293b', '#0f172a', '#18181b'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className={`w-7 h-7 rounded border-2 transition-colors ${
                      bgColor === c ? 'border-brand-400' : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <input
                type="text"
                value={bgColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBgColor(v);
                }}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          </div>

          {/* Text color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setTextColor(v);
                }}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500/50"
              />
            </div>
          </div>

          {/* Accessibility info */}
          <div>
            <button
              onClick={() => setShowAccessibility(!showAccessibility)}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Accessibility Check
              <span className={`text-xs ml-1 px-1.5 py-0.5 rounded ${contrast.aaa ? 'bg-emerald-500/20 text-emerald-400' : contrast.aa ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                {contrast.aaa ? 'AAA ✓' : contrast.aa ? 'AA ✓' : 'FAIL'}
              </span>
            </button>
            {showAccessibility && (
              <div className="mt-2 p-3 rounded-lg bg-slate-900/80 border border-slate-700/50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Contrast ratio:</span>
                  <span className="font-mono text-slate-200">{contrast.ratio}:1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WCAG AA (3:1):</span>
                  <span className={contrast.aa ? 'text-emerald-400' : 'text-red-400'}>
                    {contrast.aa ? 'Passes ✓' : 'Fails ✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WCAG AAA (4.5:1):</span>
                  <span className={contrast.aaa ? 'text-emerald-400' : 'text-red-400'}>
                    {contrast.aaa ? 'Passes ✓' : 'Fails ✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Browser support:</span>
                  <span className="text-emerald-400">All modern browsers</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Type className="w-4 h-4" />
            Live Preview
          </label>
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            className="w-full h-48 p-4 rounded-xl border border-slate-700 font-mono text-sm leading-relaxed resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            style={{
              caretColor,
              caretShape: caretShape === 'auto' ? undefined : caretShape,
              backgroundColor: bgColor,
              color: textColor,
            }}
            // Cast to work with React's style types
            {...({} as Record<string, unknown>)}
          />
          <p className="text-xs text-slate-500 mt-2">
            Click inside the textarea and type to test the caret appearance.
          </p>
        </div>
      </div>

      {/* ── Code Output ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Generated Code
        </h2>

        {/* CSS */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">CSS</span>
            <button
              onClick={() => copyCode(cssCode, 'CSS')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 overflow-x-auto">
            <code>{cssCode}</code>
          </pre>
        </div>

        {/* Full HTML + CSS */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">HTML + CSS</span>
            <button
              onClick={() => copyCode(htmlCode, 'HTML+CSS')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 overflow-x-auto">
            <code>{htmlCode}</code>
          </pre>
        </div>
      </section>

      {/* ── Info Section ──────────────────────────────────────────────── */}
      <section className="mt-10 p-4 rounded-xl bg-slate-900/60 border border-slate-700/30">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">caret-color</code> is
              supported in all modern browsers (Chrome 57+, Firefox 53+, Safari 12+, Edge 79+).
              It inherits from <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">color</code> by default.
            </p>
            <p>
              <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">caret-shape</code> is
              a newer CSS property (Chrome 123+, Firefox 125+) that lets you switch between
              block and underscore cursor styles. Falls back gracefully to the default bar.
            </p>
            <p>
              For accessibility: the caret should always have at least 3:1 contrast
              with the input background (WCAG AA). Dark backgrounds need brighter carets.
            </p>
          </div>
        </div>
      </section>
    </ToolLayout>
  );
}
