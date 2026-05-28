'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PropertyDef {
  name: string;
  syntax: string;
  inherits: boolean;
  initialValue: string;
}

const PRESETS: { name: string; description: string; def: PropertyDef; usage: string }[] = [
  {
    name: 'Animated Gradient Angle',
    description: 'Smoothly animate gradient rotation',
    def: { name: '--gradient-angle', syntax: '<angle>', inherits: false, initialValue: '0deg' },
    usage: '.card { background: linear-gradient(var(--gradient-angle), #3b82f6, #8b5cf6); }\n.card:hover { --gradient-angle: 180deg; transition: --gradient-angle 0.8s; }',
  },
  {
    name: 'Color Theme',
    description: 'Animate between brand colors',
    def: { name: '--brand-color', syntax: '<color>', inherits: true, initialValue: '#3b82f6' },
    usage: '.theme-switch { color: var(--brand-color); transition: --brand-color 0.3s; }\n.dark { --brand-color: #f59e0b; }',
  },
  {
    name: 'Animated Number Counter',
    description: 'Animate numeric values',
    def: { name: '--counter', syntax: '<integer>', inherits: false, initialValue: '0' },
    usage: '.counter { counter-reset: count var(--counter); transition: --counter 2s; }\n.counter.loaded { --counter: 100; }',
  },
  {
    name: 'Fluid Spacing',
    description: 'Responsive spacing with percentage',
    def: { name: '--spacing', syntax: '<length-percentage>', inherits: false, initialValue: '1rem' },
    usage: '.container { padding: var(--spacing); }\n@media (min-width: 768px) { .container { --spacing: 2rem; } }',
  },
  {
    name: 'Dynamic Opacity',
    description: 'Fade based on a custom property',
    def: { name: '--fade', syntax: '<number>', inherits: false, initialValue: '1' },
    usage: '.overlay { opacity: var(--fade); transition: --fade 0.3s; }\n.overlay.hidden { --fade: 0; }',
  },
  {
    name: 'Progress Bar Width',
    description: 'Animate a progress bar with percentage',
    def: { name: '--progress', syntax: '<percentage>', inherits: false, initialValue: '0%' },
    usage: '.progress-bar { width: var(--progress); transition: --progress 1s ease-out; }\n.progress-bar.full { --progress: 100%; }',
  },
  {
    name: 'Transform Distance',
    description: 'Animate transforms with length values',
    def: { name: '--slide', syntax: '<length>', inherits: false, initialValue: '0px' },
    usage: '.card { transform: translateX(var(--slide)); transition: --slide 0.4s; }\n.card:hover { --slide: 8px; }',
  },
  {
    name: 'Text Shadow Color',
    description: 'Animate text shadow color on hover',
    def: { name: '--glow-color', syntax: '<color>', inherits: true, initialValue: 'transparent' },
    usage: '.glow { text-shadow: 0 0 20px var(--glow-color); transition: --glow-color 0.5s; }\n.glow:hover { --glow-color: #3b82f6; }',
  },
  {
    name: 'Border Width',
    description: 'Animate border thickness',
    def: { name: '--border-w', syntax: '<length>', inherits: false, initialValue: '2px' },
    usage: '.box { border: var(--border-w) solid #475569; transition: --border-w 0.3s; }\n.box:focus-within { --border-w: 4px; }',
  },
  {
    name: 'Shadow Elevation',
    description: 'Animate box-shadow spread',
    def: { name: '--elevation', syntax: '<length>', inherits: false, initialValue: '0px' },
    usage: '.card { box-shadow: 0 var(--elevation) calc(var(--elevation) * 2) rgba(0,0,0,0.3); transition: --elevation 0.3s; }\n.card:hover { --elevation: 8px; }',
  },
];

function generatePropertyCSS(def: PropertyDef): string {
  return `@property ${def.name} {
  syntax: '${def.syntax}';
  inherits: ${def.inherits};
  initial-value: ${def.initialValue};
}`;
}

export default function CssPropertyPlaygroundPage() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [def, setDef] = useState<PropertyDef>(PRESETS[0].def);

  const handlePresetChange = useCallback((index: number) => {
    setSelectedPreset(index);
    setDef({ ...PRESETS[index].def });
  }, []);

  const generatedCSS = generatePropertyCSS(def);
  const fullCSS = `${generatedCSS}\n\n${PRESETS[selectedPreset].usage}`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(fullCSS);
    toast.success('@property CSS copied!');
  }, [fullCSS]);

  const hasSupport = typeof CSS !== 'undefined' && 'registerProperty' in CSS;

  return (
    <ToolLayout
      title="CSS @property Playground"
      description="Experiment with typed custom properties — animate gradients, colors, numbers, and lengths with the CSS @property at-rule (Houdini)."
    >
      {!hasSupport && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          ⚠️ <code className="bg-amber-500/20 px-1 py-0.5 rounded">CSS.registerProperty()</code> is not available in your browser. @property is supported in Chrome 85+, Edge 85+, Safari 16.4+, Firefox 128+. The CSS output below is still valid — it just won&apos;t animate without native support.
        </div>
      )}

      {/* Presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Preset</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handlePresetChange(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPreset === i
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                  : 'bg-surface-light text-slate-300 border border-slate-700/50 hover:border-brand-500/30'
              }`}
              title={p.description}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Property Name</label>
            <input
              type="text"
              value={def.name}
              onChange={(e) => setDef((d) => ({ ...d, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-slate-700/50 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Syntax Type</label>
            <select
              value={def.syntax}
              onChange={(e) => setDef((d) => ({ ...d, syntax: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-slate-700/50 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50"
            >
              {[
                '<color>', '<length>', '<percentage>', '<length-percentage>',
                '<number>', '<integer>', '<angle>', '<time>', '<resolution>',
                '<transform-function>', '<transform-list>', '<custom-ident>',
              ].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Initial Value</label>
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={def.initialValue}
                onChange={(e) => setDef((d) => ({ ...d, initialValue: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-lg bg-surface border border-slate-700/50 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500/50"
              />
              {def.syntax === '<color>' && (
                <input
                  type="color"
                  value={def.initialValue.startsWith('#') ? def.initialValue : '#000000'}
                  onChange={(e) => setDef((d) => ({ ...d, initialValue: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-700/50 cursor-pointer bg-transparent"
                />
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={def.inherits}
                onChange={(e) => setDef((d) => ({ ...d, inherits: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-600 bg-surface text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-300">Inherits from parent element</span>
            </label>
          </div>

          <div className="p-4 rounded-lg bg-brand-500/5 border border-brand-500/20">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-brand-400">@property</strong> registers custom properties with a type, letting browsers animate them. Without it, custom properties are treated as strings and can&apos;t animate or transition.
            </p>
          </div>
        </div>

        {/* CSS Output */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Generated CSS</label>
            <div className="flex gap-2">
              <button
                onClick={() => handlePresetChange(selectedPreset)}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-surface-light border border-slate-700/50 text-slate-300 hover:border-brand-500/30 transition-all flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-all flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-surface overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700/50 bg-surface-light">
              <span className="text-xs text-slate-400 font-mono">@property definition</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto">
              {generatedCSS}
            </pre>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-surface overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700/50 bg-surface-light">
              <span className="text-xs text-slate-400 font-mono">Usage example</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto">
              {PRESETS[selectedPreset].usage}
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
