'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Sparkles, Eye, Layers, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

interface NeumorphConfig {
  bgColor: string;
  distance: number;
  blur: number;
  intensity: number;
  borderRadius: number;
  width: number;
  height: number;
  shape: 'convex' | 'concave' | 'flat' | 'pressed';
}

interface Preset {
  name: string;
  description: string;
  config: NeumorphConfig;
}

const PRESETS: Preset[] = [
  {
    name: 'Soft Card',
    description: 'Classic neumorphic card with gentle convex elevation',
    config: {
      bgColor: '#e0e5ec', distance: 8, blur: 16, intensity: 0.5,
      borderRadius: 24, width: 320, height: 220, shape: 'convex',
    },
  },
  {
    name: 'Dark Card',
    description: 'Dark mode neumorphic card — sleek and modern',
    config: {
      bgColor: '#1e1e2e', distance: 10, blur: 20, intensity: 0.4,
      borderRadius: 20, width: 320, height: 220, shape: 'convex',
    },
  },
  {
    name: 'Inset Button',
    description: 'Pressed/active button with concave depth',
    config: {
      bgColor: '#e0e5ec', distance: 4, blur: 8, intensity: 0.6,
      borderRadius: 16, width: 200, height: 56, shape: 'concave',
    },
  },
  {
    name: 'Text Input',
    description: 'Neumorphic input field — inset for data entry',
    config: {
      bgColor: '#e0e5ec', distance: 3, blur: 6, intensity: 0.4,
      borderRadius: 14, width: 300, height: 52, shape: 'concave',
    },
  },
  {
    name: 'Flat Plate',
    description: 'Subtle flat surface with barely-there edges',
    config: {
      bgColor: '#e0e5ec', distance: 2, blur: 10, intensity: 0.3,
      borderRadius: 20, width: 320, height: 220, shape: 'flat',
    },
  },
  {
    name: 'Bold Button',
    description: 'High-contrast raised button with strong shadows',
    config: {
      bgColor: '#e0e5ec', distance: 10, blur: 20, intensity: 0.7,
      borderRadius: 16, width: 200, height: 56, shape: 'convex',
    },
  },
  {
    name: 'Mint Neumorph',
    description: 'Fresh mint-green neumorphic surface',
    config: {
      bgColor: '#c8e6c9', distance: 8, blur: 16, intensity: 0.5,
      borderRadius: 24, width: 320, height: 220, shape: 'convex',
    },
  },
  {
    name: 'Lavender UI',
    description: 'Soft purple neumorphic panel',
    config: {
      bgColor: '#d1c4e9', distance: 8, blur: 16, intensity: 0.45,
      borderRadius: 22, width: 320, height: 220, shape: 'convex',
    },
  },
];

const DEFAULT: NeumorphConfig = {
  bgColor: '#e0e5ec',
  distance: 8,
  blur: 16,
  intensity: 0.5,
  borderRadius: 24,
  width: 320,
  height: 220,
  shape: 'convex',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 224, g: 229, b: 236 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function adjustColor(rgb: { r: number; g: number; b: number }, amount: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(rgb.r + amount);
  const g = clamp(rgb.g + amount);
  const b = clamp(rgb.b + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function generateNeumorphShadows(cfg: NeumorphConfig): { dark: string; light: string; combined: string } {
  const rgb = hexToRgb(cfg.bgColor);
  const darkAmount = Math.round(cfg.intensity * 60);
  const lightAmount = Math.round(cfg.intensity * 80);
  const darkColor = adjustColor(rgb, -darkAmount);
  const lightColor = adjustColor(rgb, lightAmount);

  let darkShadow: string;
  let lightShadow: string;

  switch (cfg.shape) {
    case 'convex':
      darkShadow = `${cfg.distance}px ${cfg.distance}px ${cfg.blur}px ${darkColor}`;
      lightShadow = `${-cfg.distance}px ${-cfg.distance}px ${cfg.blur}px ${lightColor}`;
      break;
    case 'concave':
      darkShadow = `inset ${cfg.distance}px ${cfg.distance}px ${cfg.blur}px ${darkColor}`;
      lightShadow = `inset ${-cfg.distance}px ${-cfg.distance}px ${cfg.blur}px ${lightColor}`;
      break;
    case 'pressed':
      darkShadow = `inset ${cfg.distance / 2}px ${cfg.distance / 2}px ${cfg.blur}px ${darkColor}`;
      lightShadow = `inset ${-(cfg.distance / 2)}px ${-(cfg.distance / 2)}px ${cfg.blur}px ${lightColor}`;
      break;
    case 'flat':
    default:
      darkShadow = `${cfg.distance / 2}px ${cfg.distance / 2}px ${cfg.blur / 2}px ${darkColor}`;
      lightShadow = `${-(cfg.distance / 2)}px ${-(cfg.distance / 2)}px ${cfg.blur / 2}px ${lightColor}`;
      break;
  }

  return {
    dark: darkShadow,
    light: lightShadow,
    combined: `${darkShadow}, ${lightShadow}`,
  };
}

function generateCSS(cfg: NeumorphConfig): string {
  const shadows = generateNeumorphShadows(cfg);
  return [
    '.neumorph-element {',
    `  width: ${cfg.width}px;`,
    `  height: ${cfg.height}px;`,
    `  background: ${cfg.bgColor};`,
    `  border-radius: ${cfg.borderRadius}px;`,
    `  box-shadow: ${shadows.combined};`,
    '  transition: box-shadow 0.3s ease;',
    '}',
    '',
    '/* Parent container must have the same background */',
    '.parent {',
    `  background: ${cfg.bgColor};`,
    '  padding: 3rem;',
    '}',
  ].join('\n');
}

function generateTailwind(cfg: NeumorphConfig): string {
  const shadows = generateNeumorphShadows(cfg);
  return [
    `<!-- Parent container -->`,
    `<div class="p-12" style="background: ${cfg.bgColor};">`,
    `  <!-- Neumorphic element -->`,
    `  <div class="w-[${cfg.width}px] h-[${cfg.height}px]"`,
    `       style="background: ${cfg.bgColor};`,
    `              border-radius: ${cfg.borderRadius}px;`,
    `              box-shadow: ${shadows.combined};">`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}

export default function NeumorphismGeneratorPage() {
  const [cfg, setCfg] = useState<NeumorphConfig>(DEFAULT);
  const [activePreset, setActivePreset] = useState<string>('Soft Card');
  const [cssMode, setCssMode] = useState<'css' | 'tailwind'>('css');

  const update = useCallback((key: keyof NeumorphConfig, value: number | string) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setActivePreset('');
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setCfg(preset.config);
    setActivePreset(preset.name);
    toast.success('Applied: ' + preset.name);
  }, []);

  const resetAll = useCallback(() => {
    setCfg({ ...DEFAULT });
    setActivePreset('Soft Card');
    toast.success('Reset to defaults');
  }, []);

  const copyCode = useCallback(() => {
    const code = cssMode === 'css' ? generateCSS(cfg) : generateTailwind(cfg);
    navigator.clipboard.writeText(code).then(
      () => toast.success(cssMode === 'css' ? 'CSS copied!' : 'Tailwind copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cfg, cssMode]);

  const shadows = useMemo(() => generateNeumorphShadows(cfg), [cfg]);
  const css = useMemo(() => generateCSS(cfg), [cfg]);
  const tailwind = useMemo(() => generateTailwind(cfg), [cfg]);
  const displayCode = cssMode === 'css' ? css : tailwind;

  const rgb = useMemo(() => hexToRgb(cfg.bgColor), [cfg.bgColor]);
  const isDark = (rgb.r + rgb.g + rgb.b) / 3 < 128;

  return (
    <ToolLayout
      title="Neumorphism Generator"
      description="Design soft UI (neumorphism) elements with dual box-shadows. Adjust elevation, blur, intensity, and shape — live preview with CSS and Tailwind output."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Presets
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                    activePreset === p.name
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-200'
                  }`}
                  title={p.description}
                >
                  <div className="font-medium">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              Background Color
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cfg.bgColor}
                onChange={(e) => update('bgColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600/50 cursor-pointer bg-transparent p-0.5 flex-shrink-0"
              />
              <input
                type="text"
                value={cfg.bgColor}
                onChange={(e) => update('bgColor', e.target.value)}
                className="input-field flex-1 font-mono text-xs"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Use muted mid-tone colors for best results (not pure white or black).
            </p>
          </div>

          {/* Shape */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Shape</h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'convex' as const, label: 'Convex', desc: 'Raised / elevated' },
                { value: 'concave' as const, label: 'Concave', desc: 'Inset / sunken' },
                { value: 'flat' as const, label: 'Flat', desc: 'Subtle edge' },
                { value: 'pressed' as const, label: 'Pressed', desc: 'Pushed in' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('shape', opt.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    cfg.shape === opt.value
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Distance (elevation)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={cfg.distance}
                onChange={(e) => update('distance', parseInt(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.distance}px
              </span>
            </div>
          </div>

          {/* Blur */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Blur (softness)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="2"
                max="40"
                step="1"
                value={cfg.blur}
                onChange={(e) => update('blur', parseInt(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.blur}px
              </span>
            </div>
          </div>

          {/* Intensity */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Intensity (contrast)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={cfg.intensity}
                onChange={(e) => update('intensity', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.intensity.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Border Radius */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Border Radius
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={cfg.borderRadius}
                onChange={(e) => update('borderRadius', parseInt(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.borderRadius}px
              </span>
            </div>
          </div>

          {/* Dimensions */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Dimensions</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Width (px)</label>
                <input
                  type="number"
                  min="80"
                  max="600"
                  value={cfg.width}
                  onChange={(e) => update('width', parseInt(e.target.value) || 320)}
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Height (px)</label>
                <input
                  type="number"
                  min="40"
                  max="500"
                  value={cfg.height}
                  onChange={(e) => update('height', parseInt(e.target.value) || 220)}
                  className="input-field w-full text-sm"
                />
              </div>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Preview + Code */}
        <div className="lg:col-span-3 space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Live Preview
            </h2>

            <div
              className="rounded-xl flex items-center justify-center py-16 relative"
              style={{ background: cfg.bgColor }}
            >
              {/* Decorative neumorphic circles in background */}
              <div
                className="absolute rounded-full opacity-25 pointer-events-none"
                style={{
                  width: 60,
                  height: 60,
                  top: '15%',
                  left: '10%',
                  boxShadow: generateNeumorphShadows({
                    ...cfg, distance: 4, blur: 10, shape: 'convex',
                  }).combined,
                  background: cfg.bgColor,
                }}
              />
              <div
                className="absolute rounded-full opacity-20 pointer-events-none"
                style={{
                  width: 40,
                  height: 40,
                  bottom: '12%',
                  right: '12%',
                  boxShadow: generateNeumorphShadows({
                    ...cfg, distance: 3, blur: 8, shape: 'concave',
                  }).combined,
                  background: cfg.bgColor,
                }}
              />

              {/* Main neumorphic element */}
              <div
                className="relative flex flex-col items-center justify-center p-6 z-10"
                style={{
                  width: cfg.width,
                  height: cfg.height,
                  background: cfg.bgColor,
                  borderRadius: cfg.borderRadius,
                  boxShadow: shadows.combined,
                }}
              >
                <div
                  className="mb-3 rounded-full flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    background: cfg.bgColor,
                    borderRadius: '50%',
                    boxShadow: generateNeumorphShadows({
                      ...cfg,
                      distance: cfg.shape === 'convex' ? 4 : 3,
                      blur: 10,
                      shape: cfg.shape,
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                    }).combined,
                  }}
                >
                  <Sparkles
                    className="w-5 h-5"
                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }}
                  />
                </div>
                <h3
                  className="text-lg font-bold mb-1"
                  style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }}
                >
                  Neumorphic Panel
                </h3>
                <p
                  className="text-xs text-center max-w-[200px]"
                  style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}
                >
                  Soft shadows create the illusion of depth from the background surface.
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Shape', value: cfg.shape.charAt(0).toUpperCase() + cfg.shape.slice(1) },
                { label: 'Distance', value: cfg.distance + 'px' },
                { label: 'Blur', value: cfg.blur + 'px' },
                { label: 'Radius', value: cfg.borderRadius + 'px' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-surface rounded-lg px-3 py-2 border border-slate-700/50 text-center"
                >
                  <div className="text-slate-500 text-[10px] uppercase tracking-wide">{s.label}</div>
                  <div className="text-white font-mono text-sm mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Shadow Breakdown */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-surface rounded-lg px-3 py-2.5 border border-slate-700/50">
                <div className="text-slate-500 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Sun className="w-3 h-3" /> Light Shadow
                </div>
                <code className="text-green-400 text-[10px] font-mono break-all">{shadows.light}</code>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2.5 border border-slate-700/50">
                <div className="text-slate-500 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Moon className="w-3 h-3" /> Dark Shadow
                </div>
                <code className="text-orange-400 text-[10px] font-mono break-all">{shadows.dark}</code>
              </div>
            </div>
          </div>

          {/* Code Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-semibold text-base">Code Output</h2>
                <div className="flex rounded-lg border border-slate-700/50 overflow-hidden">
                  <button
                    onClick={() => setCssMode('css')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      cssMode === 'css'
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    CSS
                  </button>
                  <button
                    onClick={() => setCssMode('tailwind')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      cssMode === 'tailwind'
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Tailwind
                  </button>
                </div>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-sm transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
              <code>{displayCode}</code>
            </pre>
          </div>

          {/* How to Use */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">How to Use Neumorphism</h2>
            <ol className="text-sm text-slate-400 space-y-2.5 list-decimal list-inside">
              <li>
                Set the parent container background to{' '}
                <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">{cfg.bgColor}</code>{' '}
                — the element must match the background.
              </li>
              <li>
                <strong className="text-slate-300">Convex</strong> (raised) — best for cards and buttons in their default state.
              </li>
              <li>
                <strong className="text-slate-300">Concave</strong> (sunken) — use for input fields and pressed/active states.
              </li>
              <li>
                Use <strong className="text-slate-300">muted mid-tone colors</strong> — the effect fails on pure white (#fff) or pure black (#000) backgrounds because shadows cannot be lighter or darker.
              </li>
              <li>
                For <strong className="text-slate-300">accessibility</strong>, always add hover/active states with higher contrast or color changes — neumorphism alone can be hard to distinguish.
              </li>
              <li>
                Pair with the{' '}
                <a href="/tools/glassmorphism-generator" className="text-brand-400 hover:underline">Glassmorphism Generator</a>{' '}
                for mixed-design UIs — neumorphism for interactive elements, glassmorphism for overlays.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
