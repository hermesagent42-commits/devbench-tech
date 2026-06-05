'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Palette, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PaletteColor {
  index: number;
  color: string;
  label: string;
}

type Preset = {
  name: string;
  description: string;
  basePalette: number;
  overrides: PaletteColor[];
};

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_OVERRIDES: PaletteColor[] = [
  { index: 0, color: '#ff6b35', label: 'Foreground' },
  { index: 1, color: '#ffd166', label: 'Highlight 1' },
  { index: 2, color: '#06d6a0', label: 'Highlight 2' },
  { index: 3, color: '#118ab2', label: 'Midtone 1' },
  { index: 4, color: '#073b4c', label: 'Midtone 2' },
  { index: 5, color: '#ef476f', label: 'Accent 1' },
  { index: 6, color: '#ffd166', label: 'Accent 2' },
  { index: 7, color: '#8338ec', label: 'Shadow 1' },
  { index: 8, color: '#3a86ff', label: 'Shadow 2' },
];

const PRESETS: Preset[] = [
  {
    name: 'Sunset',
    description: 'Warm oranges and deep purples',
    basePalette: 0,
    overrides: [
      { index: 0, color: '#ff6b35', label: 'Fg' },
      { index: 1, color: '#f7c948', label: 'H1' },
      { index: 2, color: '#f2a65a', label: 'H2' },
      { index: 3, color: '#c44569', label: 'M1' },
      { index: 4, color: '#6c2d5b', label: 'M2' },
      { index: 5, color: '#e94f37', label: 'A1' },
      { index: 6, color: '#f6ae2d', label: 'A2' },
      { index: 7, color: '#2d1b3d', label: 'S1' },
      { index: 8, color: '#8b3a62', label: 'S2' },
    ],
  },
  {
    name: 'Ocean',
    description: 'Blues, teals, and sandy highlights',
    basePalette: 0,
    overrides: [
      { index: 0, color: '#0077b6', label: 'Fg' },
      { index: 1, color: '#00b4d8', label: 'H1' },
      { index: 2, color: '#90e0ef', label: 'H2' },
      { index: 3, color: '#023e8a', label: 'M1' },
      { index: 4, color: '#03045e', label: 'M2' },
      { index: 5, color: '#48cae4', label: 'A1' },
      { index: 6, color: '#caf0f8', label: 'A2' },
      { index: 7, color: '#001d3d', label: 'S1' },
      { index: 8, color: '#0096c7', label: 'S2' },
    ],
  },
  {
    name: 'Forest',
    description: 'Greens, browns, and earthy tones',
    basePalette: 0,
    overrides: [
      { index: 0, color: '#2d6a4f', label: 'Fg' },
      { index: 1, color: '#52b788', label: 'H1' },
      { index: 2, color: '#95d5b2', label: 'H2' },
      { index: 3, color: '#1b4332', label: 'M1' },
      { index: 4, color: '#081c15', label: 'M2' },
      { index: 5, color: '#40916c', label: 'A1' },
      { index: 6, color: '#b7e4c7', label: 'A2' },
      { index: 7, color: '#2d1a04', label: 'S1' },
      { index: 8, color: '#7c6a0a', label: 'S2' },
    ],
  },
  {
    name: 'Neon Pop',
    description: 'Bright electric colors on a dark stage',
    basePalette: 0,
    overrides: [
      { index: 0, color: '#ff0055', label: 'Fg' },
      { index: 1, color: '#ffbd00', label: 'H1' },
      { index: 2, color: '#00ff88', label: 'H2' },
      { index: 3, color: '#7000ff', label: 'M1' },
      { index: 4, color: '#000022', label: 'M2' },
      { index: 5, color: '#ff00aa', label: 'A1' },
      { index: 6, color: '#00ddff', label: 'A2' },
      { index: 7, color: '#110022', label: 'S1' },
      { index: 8, color: '#4400cc', label: 'S2' },
    ],
  },
  {
    name: 'Monochrome',
    description: 'Grayscale with a single accent',
    basePalette: 0,
    overrides: [
      { index: 0, color: '#1a1a2e', label: 'Fg' },
      { index: 1, color: '#52527a', label: 'H1' },
      { index: 2, color: '#8d8db8', label: 'H2' },
      { index: 3, color: '#3a3a5c', label: 'M1' },
      { index: 4, color: '#0f0f1a', label: 'M2' },
      { index: 5, color: '#e94560', label: 'A1' },
      { index: 6, color: '#c4c4d4', label: 'A2' },
      { index: 7, color: '#050510', label: 'S1' },
      { index: 8, color: '#666680', label: 'S2' },
    ],
  },
  {
    name: 'Candy',
    description: 'Pastel pinks, purples, and blues',
    basePalette: 0,
    overrides: [
      { index: 0, color: '#ff9ff3', label: 'Fg' },
      { index: 1, color: '#feca57', label: 'H1' },
      { index: 2, color: '#54a0ff', label: 'H2' },
      { index: 3, color: '#5f27cd', label: 'M1' },
      { index: 4, color: '#341f97', label: 'M2' },
      { index: 5, color: '#ff6b6b', label: 'A1' },
      { index: 6, color: '#c8d6e5', label: 'A2' },
      { index: 7, color: '#222f3e', label: 'S1' },
      { index: 8, color: '#8395a7', label: 'S2' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildCSS(name: string, basePalette: number, overrides: PaletteColor[]) {
  const active = overrides.filter((o) => o.color);
  const colorLines = active.map((o) => `    ${o.index}: ${o.color};`).join('\n');

  const fontPaletteValues = `@font-palette-values --${name} {
  font-family: "Nabla";
  base-palette: ${basePalette};${colorLines ? '\n  override-colors:\n' + colorLines : ''}
}`;

  return fontPaletteValues;
}

function buildStyleContent(name: string, basePalette: number, overrides: PaletteColor[]) {
  const active = overrides.filter((o) => o.color);
  const colorLines = active.map((o) => `    ${o.index}: ${o.color};`).join('\n');

  return `@font-palette-values --${name} {
  font-family: "Nabla";
  base-palette: ${basePalette};${colorLines ? '\n  override-colors:\n' + colorLines : ''}
}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function FontPalettePlayground() {
  const [demoText, setDemoText] = useState('DevBench');
  const [paletteName, setPaletteName] = useState('my-palette');
  const [basePalette, setBasePalette] = useState(0);
  const [overrides, setOverrides] = useState<PaletteColor[]>(DEFAULT_OVERRIDES);
  const [showGrid, setShowGrid] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Manage a dynamic <style> element
  useEffect(() => {
    setMounted(true);
    const el = document.createElement('style');
    el.id = 'font-palette-dynamic';
    el.textContent = buildStyleContent('my-palette', 0, DEFAULT_OVERRIDES);
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  // Update style when config changes
  useEffect(() => {
    if (!mounted) return;
    const el = document.getElementById('font-palette-dynamic') as HTMLStyleElement;
    if (el) {
      el.textContent = buildStyleContent(paletteName, basePalette, overrides);
    }
  }, [mounted, paletteName, basePalette, overrides]);

  const handlePresetApply = useCallback((preset: Preset) => {
    const name = preset.name.toLowerCase().replace(/\s+/g, '-');
    setPaletteName(name);
    setBasePalette(preset.basePalette);
    setOverrides(preset.overrides);
  }, []);

  const handleColorChange = useCallback(
    (index: number, color: string) => {
      setOverrides((prev) => prev.map((o) => (o.index === index ? { ...o, color } : o)));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setPaletteName('my-palette');
    setBasePalette(0);
    setOverrides(DEFAULT_OVERRIDES);
  }, []);

  const fontPaletteValues = buildCSS(paletteName, basePalette, overrides);

  const handleCopyCSS = useCallback(() => {
    navigator.clipboard.writeText(fontPaletteValues);
    toast.success('@font-palette-values copied!');
  }, [fontPaletteValues]);

  const handleCopyFull = useCallback(() => {
    const html = `<style>
@import url('https://fonts.googleapis.com/css2?family=Nabla&display=swap');

${fontPaletteValues}
</style>

<h1 style="font-family: 'Nabla', sans-serif; font-size: 4rem; font-palette: --${paletteName};">
  ${demoText || 'Nabla'}
</h1>`;
    navigator.clipboard.writeText(html);
    toast.success('Full HTML + CSS copied!');
  }, [fontPaletteValues, paletteName, demoText]);

  const activeCount = overrides.filter((o) => o.color).length;

  return (
    <ToolLayout
      title="CSS Font Palette Playground"
      description="Customize color font palettes with @font-palette-values — override COLRv1 font colors visually, live."
    >
      {/* Google Font — Nabla COLRv1 */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Nabla&display=swap"
      />

      {/* ── Live Preview ───────────────────────────────────────────────────── */}
      <div className="mb-8 p-6 rounded-xl bg-surface-light border border-slate-700/50">
        <div className="text-center">
          <div
            style={{
              fontFamily: "'Nabla', sans-serif",
              fontSize: 'clamp(3rem, 10vw, 6rem)',
              fontPalette: `--${paletteName}`,
              lineHeight: 1.2,
              padding: '1rem',
              background: showGrid
                ? 'repeating-linear-gradient(45deg, #1e293b, #1e293b 10px, #334155 10px, #334155 20px)'
                : 'transparent',
              borderRadius: '12px',
              transition: 'background 0.3s',
            }}
          >
            {demoText || 'Nabla'}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 justify-center">
          <input
            type="text"
            value={demoText}
            onChange={(e) => setDemoText(e.target.value)}
            placeholder="Type text to preview..."
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-40 text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showGrid
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>
        </div>
      </div>

      {/* ── Presets ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetApply(preset)}
              title={preset.description}
              className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-brand-500/50 hover:bg-slate-750 transition-all text-left group"
            >
              <div className="flex gap-1 mb-1.5">
                {preset.overrides.slice(0, 5).map((o) => (
                  <div
                    key={o.index}
                    className="w-3.5 h-3.5 rounded-full border border-white/10"
                    style={{ backgroundColor: o.color }}
                  />
                ))}
              </div>
              <div className="text-xs font-medium text-slate-300 group-hover:text-brand-300 transition-colors">
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Controls / Actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Palette Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Palette Name</label>
              <input
                type="text"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Base Palette:{' '}
                <span className="text-brand-300 font-mono">{basePalette}</span>
              </label>
              <input
                type="range"
                min={0}
                max={3}
                value={basePalette}
                onChange={(e) => setBasePalette(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 flex flex-col justify-center gap-3">
          <button
            onClick={handleCopyCSS}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy @font-palette-values
          </button>
          <button
            onClick={handleCopyFull}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 transition-colors border border-slate-600"
          >
            <Copy className="w-4 h-4" />
            Copy Full HTML + CSS
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm font-medium hover:bg-slate-700 hover:text-slate-300 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>
      </div>

      {/* ── Color Overrides ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Color Overrides ({activeCount}/9 active)
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {overrides.map((oc) => (
            <div
              key={oc.index}
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 flex flex-col items-center gap-1.5"
            >
              <label className="text-[10px] text-slate-500 font-mono">
                #{oc.index} {oc.label}
              </label>
              <input
                type="color"
                value={oc.color}
                onChange={(e) => handleColorChange(oc.index, e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                title={`Override color index ${oc.index}`}
              />
              <span className="text-[10px] text-slate-400 font-mono truncate w-full text-center">
                {oc.color}
              </span>
              <button
                onClick={() => handleColorChange(oc.index, '')}
                className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
              >
                clear
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Generated CSS ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Generated CSS</h3>
        <div className="relative">
          <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-300 overflow-x-auto font-mono leading-relaxed">
            <code>{fontPaletteValues}</code>
          </pre>
          <button
            onClick={handleCopyCSS}
            className="absolute top-2 right-2 p-1.5 rounded bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600 transition-colors"
            title="Copy CSS"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Usage ──────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Usage</h3>
        <pre className="text-xs text-slate-400 font-mono leading-relaxed overflow-x-auto">
          <code>{`/* Apply to any element using the Nabla font */
h1 {
  font-family: 'Nabla', sans-serif;
  font-size: 4rem;
  font-palette: --${paletteName};
}`}</code>
        </pre>
      </div>

      {/* ── Info ──────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-lg bg-brand-500/5 border border-brand-500/20">
        <div className="flex items-start gap-2">
          <Palette className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-brand-300 mb-1">
              About @font-palette-values
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Color fonts (COLRv1) like Nabla, Noto Color Emoji, and Rocher contain multiple
              built-in color palettes. The{' '}
              <code className="text-brand-300 bg-brand-500/10 px-1 rounded">
                @font-palette-values
              </code>{' '}
              at-rule lets you define custom palettes by overriding specific color indices from any
              base palette. This tool uses{' '}
              <a
                href="https://fonts.google.com/specimen/Nabla"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 underline underline-offset-2"
              >
                Nabla
              </a>
              , a COLRv1 color font by Google. Browser support: Chrome 101+, Safari 15.4+, Edge
              101+, Firefox 128+.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
