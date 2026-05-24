'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Sparkles, Droplets, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface GlassConfig {
  bgOpacity: number;
  blur: number;
  saturation: number;
  borderRadius: number;
  borderWidth: number;
  borderOpacity: number;
  tintColor: string;
  shadowIntensity: number;
  width: number;
  height: number;
}

interface Preset {
  name: string;
  description: string;
  config: GlassConfig;
}

const PRESETS: Preset[] = [
  {
    name: 'Frosted Glass',
    description: 'Classic frosted glass - clean and modern',
    config: {
      bgOpacity: 0.15, blur: 16, saturation: 1.8, borderRadius: 20, borderWidth: 1,
      borderOpacity: 0.2, tintColor: '#ffffff', shadowIntensity: 0.15, width: 360, height: 280,
    },
  },
  {
    name: 'Dark Glass',
    description: 'Dark mode glass panel - sleek and moody',
    config: {
      bgOpacity: 0.08, blur: 20, saturation: 1.2, borderRadius: 24, borderWidth: 1,
      borderOpacity: 0.1, tintColor: '#1a1a2e', shadowIntensity: 0.3, width: 360, height: 280,
    },
  },
  {
    name: 'Neon Glass',
    description: 'Vibrant neon-tinged glass - cyberpunk vibes',
    config: {
      bgOpacity: 0.12, blur: 14, saturation: 2.5, borderRadius: 20, borderWidth: 1.5,
      borderOpacity: 0.35, tintColor: '#ff2d95', shadowIntensity: 0.2, width: 360, height: 280,
    },
  },
  {
    name: 'Mint Glass',
    description: 'Fresh mint-tinted glass - clean and refreshing',
    config: {
      bgOpacity: 0.14, blur: 18, saturation: 1.6, borderRadius: 22, borderWidth: 1,
      borderOpacity: 0.25, tintColor: '#00f5a0', shadowIntensity: 0.12, width: 360, height: 280,
    },
  },
  {
    name: 'Lavender Glass',
    description: 'Soft lavender glass - gentle and elegant',
    config: {
      bgOpacity: 0.1, blur: 22, saturation: 1.4, borderRadius: 24, borderWidth: 1,
      borderOpacity: 0.3, tintColor: '#b388ff', shadowIntensity: 0.15, width: 360, height: 280,
    },
  },
  {
    name: 'Heavy Frost',
    description: 'Maximum blur, minimal transparency - privacy glass',
    config: {
      bgOpacity: 0.04, blur: 28, saturation: 2.0, borderRadius: 16, borderWidth: 1,
      borderOpacity: 0.4, tintColor: '#ffffff', shadowIntensity: 0.2, width: 360, height: 280,
    },
  },
  {
    name: 'Warm Glass',
    description: 'Warm amber-tinted glass for cozy UIs',
    config: {
      bgOpacity: 0.12, blur: 16, saturation: 1.5, borderRadius: 18, borderWidth: 1,
      borderOpacity: 0.25, tintColor: '#ff9f43', shadowIntensity: 0.15, width: 360, height: 280,
    },
  },
  {
    name: 'Ice Glass',
    description: 'Ultra-thin, almost crystal-clear glass',
    config: {
      bgOpacity: 0.25, blur: 8, saturation: 2.5, borderRadius: 20, borderWidth: 2,
      borderOpacity: 0.5, tintColor: '#ffffff', shadowIntensity: 0.1, width: 360, height: 280,
    },
  },
];

const DEFAULT: GlassConfig = {
  bgOpacity: 0.15,
  blur: 16,
  saturation: 1.8,
  borderRadius: 20,
  borderWidth: 1,
  borderOpacity: 0.2,
  tintColor: '#ffffff',
  shadowIntensity: 0.15,
  width: 360,
  height: 280,
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r + ', ' + g + ', ' + b;
}

function generateCSS(cfg: GlassConfig): string {
  const rgb = hexToRgb(cfg.tintColor);
  return [
    '.glass-container {',
    '  width: ' + cfg.width + 'px;',
    '  height: ' + cfg.height + 'px;',
    '  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);',
    '  /* Place on a colorful background for the effect to be visible */',
    '}',
    '',
    '.glass-panel {',
    '  background: rgba(' + rgb + ', ' + cfg.bgOpacity + ');',
    '  backdrop-filter: blur(' + cfg.blur + 'px) saturate(' + Math.round(cfg.saturation * 100) + '%);',
    '  -webkit-backdrop-filter: blur(' + cfg.blur + 'px) saturate(' + Math.round(cfg.saturation * 100) + '%);',
    '  border-radius: ' + cfg.borderRadius + 'px;',
    '  border: ' + cfg.borderWidth + 'px solid rgba(' + rgb + ', ' + cfg.borderOpacity + ');',
    '  box-shadow: 0 8px 32px rgba(0, 0, 0, ' + cfg.shadowIntensity + ');',
    '}',
  ].join('\n');
}

export default function GlassmorphismGeneratorPage() {
  const [cfg, setCfg] = useState<GlassConfig>(DEFAULT);
  const [activePreset, setActivePreset] = useState<string>('Frosted Glass');

  const update = useCallback((key: keyof GlassConfig, value: number | string) => {
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
    setActivePreset('Frosted Glass');
    toast.success('Reset to defaults');
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generateCSS(cfg)).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [cfg]);

  const css = generateCSS(cfg);
  const rgb = hexToRgb(cfg.tintColor);

  return (
    <ToolLayout
      title="Glassmorphism Generator"
      description="Design beautiful frosted-glass panels. Adjust blur, transparency, tint, and more - instant CSS output."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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

          {/* Tint Color */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-brand-400" />
              Tint Color
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cfg.tintColor}
                onChange={(e) => update('tintColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600/50 cursor-pointer bg-transparent p-0.5"
              />
              <input
                type="text"
                value={cfg.tintColor}
                onChange={(e) => update('tintColor', e.target.value)}
                className="input-field flex-1 font-mono text-xs"
              />
            </div>
          </div>

          {/* Background Opacity */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Background Opacity
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={cfg.bgOpacity}
                onChange={(e) => update('bgOpacity', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.bgOpacity.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Blur */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Blur Radius
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="40"
                step="0.5"
                value={cfg.blur}
                onChange={(e) => update('blur', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-14 text-right">
                {cfg.blur}px
              </span>
            </div>
          </div>

          {/* Saturation */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Saturation
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={cfg.saturation}
                onChange={(e) => update('saturation', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.saturation.toFixed(1)}x
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
                max="48"
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

          {/* Border Width */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Border Width
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="4"
                step="0.5"
                value={cfg.borderWidth}
                onChange={(e) => update('borderWidth', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.borderWidth}px
              </span>
            </div>
          </div>

          {/* Border Opacity */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Border Opacity
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={cfg.borderOpacity}
                onChange={(e) => update('borderOpacity', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.borderOpacity.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Shadow Intensity */}
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-2">
              Shadow Intensity
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={cfg.shadowIntensity}
                onChange={(e) => update('shadowIntensity', parseFloat(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-12 text-right">
                {cfg.shadowIntensity.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Width and Height */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">Dimensions</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Width (px)</label>
                <input
                  type="number"
                  min="100"
                  max="800"
                  value={cfg.width}
                  onChange={(e) => update('width', parseInt(e.target.value) || 360)}
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Height (px)</label>
                <input
                  type="number"
                  min="80"
                  max="600"
                  value={cfg.height}
                  onChange={(e) => update('height', parseInt(e.target.value) || 280)}
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

        {/* Preview + CSS */}
        <div className="lg:col-span-3 space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Live Preview
            </h2>

            <div
              className="relative overflow-hidden rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                minHeight: Math.min(cfg.height + 80, 420),
              }}
            >
              {/* Decorative shapes behind glass */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 160, height: 160,
                  background: 'linear-gradient(135deg, #ff6fd8, #3813c2)',
                  top: '15%', left: '10%',
                  opacity: 0.5, filter: 'blur(30px)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: 140, height: 140,
                  background: 'linear-gradient(135deg, #00f5a0, #00d9f5)',
                  bottom: '10%', right: '8%',
                  opacity: 0.4, filter: 'blur(28px)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: 100, height: 100,
                  background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                  top: '55%', left: '60%',
                  opacity: 0.35, filter: 'blur(24px)',
                }}
              />

              {/* The glass panel */}
              <div
                className="relative flex flex-col items-center justify-center p-6 z-10"
                style={{
                  width: cfg.width,
                  height: cfg.height,
                  background: 'rgba(' + rgb + ', ' + cfg.bgOpacity + ')',
                  backdropFilter: 'blur(' + cfg.blur + 'px) saturate(' + Math.round(cfg.saturation * 100) + '%)',
                  WebkitBackdropFilter: 'blur(' + cfg.blur + 'px) saturate(' + Math.round(cfg.saturation * 100) + '%)',
                  borderRadius: cfg.borderRadius,
                  border: cfg.borderWidth + 'px solid rgba(' + rgb + ', ' + cfg.borderOpacity + ')',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, ' + cfg.shadowIntensity + ')',
                }}
              >
                <div className="text-center text-white">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white/90" />
                  </div>
                  <h3 className="text-lg font-bold mb-1 text-white/90">Glass Panel</h3>
                  <p className="text-xs text-white/60 max-w-[200px]">
                    Content behind this panel is blurred and saturated by the glass effect.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Blur', value: cfg.blur + 'px' },
                { label: 'Opacity', value: (cfg.bgOpacity * 100).toFixed(0) + '%' },
                { label: 'Saturation', value: cfg.saturation.toFixed(1) + 'x' },
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
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">CSS Output</h2>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-sm transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
              <code>{css}</code>
            </pre>
          </div>

          {/* How to use */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">How to Use</h2>
            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
              <li>Place the <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">.glass-panel</code> element on a background with colors, gradients, or images behind it.</li>
              <li>The <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">backdrop-filter</code> blurs and saturates content <em>behind</em> the panel - not inside it.</li>
              <li>Adjust the background opacity and tint to match your design system.</li>
              <li>For Safari support, the <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">-webkit-backdrop-filter</code> prefix is included automatically.</li>
              <li>Works best on animated or colorful backgrounds - static flat colors will just look translucent.</li>
            </ol>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
