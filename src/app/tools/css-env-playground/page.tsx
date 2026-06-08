'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Smartphone, Tablet, Monitor, Info, Code2, Layout, Ruler } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type EnvVar = {
  name: string;
  description: string;
  category: 'safe-area' | 'titlebar' | 'keyboard' | 'viewport-segments' | 'experimental';
  default: string;
  min?: number;
  max?: number;
  unit: string;
};

type Device = 'iphone' | 'foldable' | 'desktop';

const ENV_VARS: EnvVar[] = [
  // Safe Area Insets
  { name: 'safe-area-inset-top', description: 'Top safe area inset (notch/status bar height)', category: 'safe-area', default: '20', min: 0, max: 60, unit: 'px' },
  { name: 'safe-area-inset-right', description: 'Right safe area inset', category: 'safe-area', default: '0', min: 0, max: 40, unit: 'px' },
  { name: 'safe-area-inset-bottom', description: 'Bottom safe area inset (home indicator)', category: 'safe-area', default: '34', min: 0, max: 60, unit: 'px' },
  { name: 'safe-area-inset-left', description: 'Left safe area inset', category: 'safe-area', default: '0', min: 0, max: 40, unit: 'px' },

  // Titlebar Area
  { name: 'titlebar-area-x', description: 'X position of the titlebar area', category: 'titlebar', default: '0', min: 0, max: 400, unit: 'px' },
  { name: 'titlebar-area-y', description: 'Y position of the titlebar area', category: 'titlebar', default: '0', min: 0, max: 200, unit: 'px' },
  { name: 'titlebar-area-width', description: 'Width of the titlebar area', category: 'titlebar', default: '400', min: 100, max: 1920, unit: 'px' },
  { name: 'titlebar-area-height', description: 'Height of the titlebar area', category: 'titlebar', default: '32', min: 20, max: 100, unit: 'px' },

  // Keyboard
  { name: 'keyboard-inset-top', description: 'Top edge of the virtual keyboard', category: 'keyboard', default: '0', min: 0, max: 800, unit: 'px' },
  { name: 'keyboard-inset-right', description: 'Right edge of the virtual keyboard', category: 'keyboard', default: '0', min: 0, max: 400, unit: 'px' },
  { name: 'keyboard-inset-bottom', description: 'Bottom edge of the virtual keyboard', category: 'keyboard', default: '0', min: 0, max: 400, unit: 'px' },
  { name: 'keyboard-inset-left', description: 'Left edge of the virtual keyboard', category: 'keyboard', default: '0', min: 0, max: 400, unit: 'px' },
  { name: 'keyboard-inset-width', description: 'Width of the virtual keyboard', category: 'keyboard', default: '0', min: 0, max: 1200, unit: 'px' },
  { name: 'keyboard-inset-height', description: 'Height of the virtual keyboard', category: 'keyboard', default: '0', min: 0, max: 400, unit: 'px' },
];

const DEVICES: { id: Device; label: string; icon: React.ElementType; width: number; height: number }[] = [
  { id: 'iphone', label: 'iPhone 15 Pro', icon: Smartphone, width: 393, height: 852 },
  { id: 'foldable', label: 'Foldable (Surface Duo)', icon: Tablet, width: 720, height: 540 },
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: 1200, height: 700 },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function CSSEnvPlaygroundPage() {
  const [device, setDevice] = useState<Device>('iphone');
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    ENV_VARS.forEach(v => { init[v.name] = parseInt(v.default) || 0; });
    return init;
  });
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const deviceConfig = DEVICES.find(d => d.id === device)!;

  const updateValue = useCallback((name: string, val: number) => {
    setValues(prev => ({ ...prev, [name]: val }));
  }, []);

  const resetAll = useCallback(() => {
    const defaults: Record<string, number> = {};
    ENV_VARS.forEach(v => { defaults[v.name] = parseInt(v.default) || 0; });
    setValues(defaults);
  }, []);

  // Generate CSS
  const generateCSS = useCallback(() => {
    const declarations = ENV_VARS
      .filter(v => values[v.name] !== parseInt(v.default))
      .map(v => `  ${v.name.replace(/-/g, '_')}: env(${v.name}, ${values[v.name]}${v.unit});`);
    
    if (declarations.length === 0) return '/* All values are at defaults — nothing to override */';
    return `/* CSS env() variable overrides */\n:root {\n${declarations.join('\n')}\n}`;
  }, [values]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generateCSS()).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [generateCSS]);

  // Demo preview styles
  const previewStyles: Record<string, string> = {};
  
  // Apply safe area insets as padding on preview device
  const safeTop = values['safe-area-inset-top'] || 20;
  const safeRight = values['safe-area-inset-right'] || 0;
  const safeBottom = values['safe-area-inset-bottom'] || 34;
  const safeLeft = values['safe-area-inset-left'] || 0;

  const kbHeight = values['keyboard-inset-height'] || 0;
  const keyboardVisible = kbHeight > 10;

  const titleH = values['titlebar-area-height'] || 32;
  const titleW = values['titlebar-area-width'] || 400;

  const categories = ['all', ...new Set(ENV_VARS.map(v => v.category))] as const;
  const filteredVars = activeCategory === 'all' 
    ? ENV_VARS 
    : ENV_VARS.filter(v => v.category === activeCategory);

  const categoryColors: Record<string, string> = {
    'safe-area': 'bg-green-500/10 text-green-400 border-green-500/20',
    'titlebar': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'keyboard': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'viewport-segments': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'experimental': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  };

  const categoryLabels: Record<string, string> = {
    'safe-area': 'Safe Area',
    'titlebar': 'Titlebar',
    'keyboard': 'Keyboard',
    'viewport-segments': 'Viewport Segments',
    'experimental': 'Experimental',
  };

  return (
    <ToolLayout
      title="CSS env() Playground"
      description="Interactively explore CSS environment variables (env()) — safe-area-inset, titlebar-area, keyboard-inset. Visualize how they affect layouts on notched phones, foldables, and PWA environments."
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ── Left: Controls ───────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Device selector */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-brand-400" />
              Device Preview
            </h2>
            <div className="flex gap-2">
              {DEVICES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    device === d.id
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                      : 'text-slate-400 border-slate-600/30 hover:text-slate-200 hover:border-slate-500/30'
                  }`}
                >
                  <d.icon className="w-4 h-4" />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  activeCategory === cat
                    ? cat === 'all'
                      ? 'bg-slate-500/20 text-slate-200 border-slate-500/30'
                      : categoryColors[cat]
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {cat === 'all' ? 'All' : categoryLabels[cat]}
              </button>
            ))}
          </div>

          {/* Variable sliders */}
          <div className="space-y-3">
            {filteredVars.map(v => (
              <div key={v.name} className="card py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded">
                      env({v.name})
                    </code>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${categoryColors[v.category]}`}>
                      {categoryLabels[v.category]}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-white font-bold">
                    {values[v.name]}{v.unit}
                  </div>
                </div>
                
                {v.min !== undefined && v.max !== undefined ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={v.min}
                      max={v.max}
                      value={values[v.name]}
                      onChange={(e) => updateValue(v.name, parseInt(e.target.value))}
                      className="flex-1 accent-brand-500 h-1.5"
                    />
                    <input
                      type="number"
                      value={values[v.name]}
                      onChange={(e) => {
                        const val = Math.max(v.min ?? 0, Math.min(v.max ?? 0, parseInt(e.target.value) || 0));
                        updateValue(v.name, val);
                      }}
                      className="w-16 input-field text-xs text-center py-1"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    value={values[v.name]}
                    onChange={(e) => updateValue(v.name, parseInt(e.target.value) || 0)}
                    className="w-full input-field text-xs py-1"
                  />
                )}

                <p className="text-[11px] text-slate-500 mt-2">{v.description}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={resetAll} className="btn-secondary text-sm flex-1">
              Reset to Defaults
            </button>
            <button onClick={copyCSS} className="btn-primary text-sm flex-1 flex items-center justify-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy CSS
            </button>
          </div>
        </div>

        {/* ── Right: Preview + Code ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Device preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-brand-400" />
              Live Preview
            </h2>

            <div className="flex justify-center">
              <div
                className="relative border-2 border-slate-600 rounded-2xl overflow-hidden bg-white shadow-2xl transition-all duration-300"
                style={{
                  width: Math.min(deviceConfig.width, 600),
                  height: Math.min(deviceConfig.height, 500),
                  maxWidth: '100%',
                }}
              >
                {/* Safe area top (notch / status bar) */}
                {device !== 'desktop' && (
                  <>
                    <div
                      className="absolute top-0 left-0 right-0 bg-black/50 z-20 flex items-center justify-center transition-all duration-200"
                      style={{ height: `${safeTop}px` }}
                    >
                      <span className="text-[9px] text-white/70 font-mono hidden sm:block">safe-area-inset-top ({safeTop}px)</span>
                    </div>
                    {/* Safe area bottom (home indicator) */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-black/50 z-20 flex items-center justify-center transition-all duration-200"
                      style={{ height: `${safeBottom}px` }}
                    >
                      {safeBottom > 15 && <div className="w-24 h-1 bg-white/40 rounded-full" />}
                      <span className="text-[9px] text-white/70 font-mono absolute hidden sm:block">safe-area-inset-bottom ({safeBottom}px)</span>
                    </div>
                    {/* Safe area left */}
                    {safeLeft > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-black/30 z-20 flex items-center justify-center transition-all duration-200"
                        style={{ width: `${safeLeft}px` }}
                      >
                        <span className="text-[8px] text-white/50 font-mono rotate-90 whitespace-nowrap">{safeLeft}px</span>
                      </div>
                    )}
                    {/* Safe area right */}
                    {safeRight > 0 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-black/30 z-20 flex items-center justify-center transition-all duration-200"
                        style={{ width: `${safeRight}px` }}
                      >
                        <span className="text-[8px] text-white/50 font-mono -rotate-90 whitespace-nowrap">{safeRight}px</span>
                      </div>
                    )}
                  </>
                )}

                {/* Titlebar area (PWAs) */}
                {device !== 'desktop' && (
                  <div
                    className="absolute bg-purple-500/20 border-b border-purple-500/30 z-10 flex items-center px-2 transition-all duration-200"
                    style={{
                      top: `${safeTop}px`,
                      left: `${safeLeft}px`,
                      width: `calc(100% - ${safeLeft + safeRight}px)`,
                      height: `${titleH}px`,
                    }}
                  >
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-400/60" />
                      <div className="w-2 h-2 rounded-full bg-purple-400/40" />
                      <div className="w-2 h-2 rounded-full bg-purple-400/20" />
                    </div>
                  </div>
                )}

                {/* Content area */}
                <div
                  className="h-full flex flex-col transition-all duration-200"
                  style={{
                    paddingTop: `${(device !== 'desktop' ? safeTop + titleH : 0)}px`,
                    paddingBottom: `${(device !== 'desktop' ? safeBottom : 0)}px`,
                    paddingLeft: `${safeLeft}px`,
                    paddingRight: `${safeRight}px`,
                  }}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-white/30 flex-shrink-0" />
                    <div>
                      <div className="h-2.5 bg-white/30 rounded w-24" />
                      <div className="h-1.5 bg-white/20 rounded w-16 mt-1" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white rounded-md shadow-sm p-2 flex gap-2">
                        <div className="w-8 h-8 rounded bg-slate-200 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="h-2 bg-slate-200 rounded w-3/4" />
                          <div className="h-1.5 bg-slate-100 rounded w-full mt-1" />
                          <div className="h-1.5 bg-slate-100 rounded w-1/2 mt-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Keyboard overlay */}
                  {keyboardVisible && (
                    <div
                      className="bg-gray-800 border-t border-gray-700 flex-shrink-0 transition-all duration-300"
                      style={{ height: `${kbHeight}px` }}
                    >
                      <div className="h-full p-1.5">
                        <div className="grid grid-cols-10 gap-0.5 h-full">
                          {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i} className="bg-gray-600 rounded flex items-center justify-center text-[8px] text-gray-400">
                              {String.fromCharCode(65 + i)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Generated CSS */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-brand-400" />
                Generated CSS
              </h2>
              <button onClick={copyCSS} className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre">
              <code>{generateCSS()}</code>
            </pre>
          </div>

          {/* Key insight */}
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-brand-400 mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> About CSS env()
            </h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
              <li><strong className="text-slate-300">env()</strong> lets you access browser-defined environment variables in CSS</li>
              <li>Unlike <strong className="text-slate-300">var()</strong>, these are set by the browser/OS, not in your CSS</li>
              <li>Essential for notched phones (iPhone), foldables, and PWAs with titlebar controls</li>
              <li>Use with <code className="text-brand-400 text-[11px]">padding: env(safe-area-inset-top)</code> to avoid UI behind notches</li>
              <li>Fallback syntax: <code className="text-brand-400 text-[11px]">env(safe-area-inset-top, 20px)</code> where &quot;20px&quot; is your fallback</li>
              <li>Supported in Chrome, Safari, Firefox, and Edge — <strong className="text-green-400">92%+ global coverage</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
