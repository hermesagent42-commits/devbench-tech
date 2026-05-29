'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Palette, Check, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const COLOR_PRESETS = [
  { name: 'Ocean Blue', color: '#0077b6' },
  { name: 'Forest Green', color: '#2d6a4f' },
  { name: 'Coral', color: '#ff6b6b' },
  { name: 'Purple', color: '#7b2ff7' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Rose', color: '#e63946' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Lime', color: '#65a30d' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Orange', color: '#ea580c' },
];

const FORM_ELEMENTS = [
  {
    name: 'Checkbox',
    render: (color: string) => (
      <div className="flex items-center gap-3">
        <input type="checkbox" defaultChecked style={{ accentColor: color, width: 20, height: 20 }}
          className="cursor-pointer" />
        <span className="text-slate-300 text-sm">Option A</span>
      </div>
    ),
  },
  {
    name: 'Radio',
    render: (color: string) => (
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="accentDemo" defaultChecked style={{ accentColor: color, width: 18, height: 18 }} />
          <span className="text-slate-300 text-sm">Option 1</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="accentDemo" style={{ accentColor: color, width: 18, height: 18 }} />
          <span className="text-slate-300 text-sm">Option 2</span>
        </label>
      </div>
    ),
  },
  {
    name: 'Range Slider',
    render: (color: string) => (
      <div className="space-y-1">
        <input type="range" defaultValue={60} min={0} max={100} style={{ accentColor: color }}
          className="w-full cursor-pointer h-2" />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0</span><span>50</span><span>100</span>
        </div>
      </div>
    ),
  },
  {
    name: 'Progress Bar',
    render: (color: string) => (
      <div>
        <progress value={72} max={100} style={{ accentColor: color }}
          className="w-full h-3 rounded-full [&::-webkit-progress-bar]:bg-slate-700 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full" />
        <p className="text-xs text-slate-500 mt-1">72% complete</p>
      </div>
    ),
  },
  {
    name: 'Select Dropdown',
    render: (color: string) => (
      <div>
        <select style={{ accentColor: color }}
          className="bg-surface border border-slate-600/50 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 w-full cursor-pointer"
          defaultValue="apple">
          <option value="apple">🍎 Apple</option>
          <option value="banana">🍌 Banana</option>
          <option value="cherry">🍒 Cherry</option>
        </select>
      </div>
    ),
  },
];

const TEXT_COLORS = [
  { label: 'Default (white) on dark', bg: 'bg-slate-600', border: 'border-slate-500/30' },
  { label: 'Light mode (white bg)', bg: 'bg-white', border: 'border-slate-200' },
];

export default function CssAccentColorPage() {
  const [color, setColor] = useState('#0077b6');
  const [copied, setCopied] = useState(false);

  const cssCode = useMemo(() => `accent-color: ${color};`, [color]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      toast.success('accent-color copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy'); }
  }, [cssCode]);

  return (
    <ToolLayout
      title="CSS accent-color Playground"
      description="Style native form controls with a single CSS property — checkboxes, radio buttons, range sliders, progress bars, and selects. Live preview, color presets, and instant CSS output."
    >
      {/* Color Picker + Presets */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="text-white font-semibold text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand-400" />
            Pick Accent Color
          </label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-10 h-10 rounded border border-slate-600/50 bg-surface cursor-pointer" />
            <input type="text" value={color} onChange={e => setColor(e.target.value)}
              className="w-28 bg-surface rounded-md border border-slate-600/50 px-3 py-1.5 text-sm font-mono text-green-400 focus:outline-none focus:border-brand-500/50" />
          </div>
          <button onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-slate-700/30'
            }`}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy CSS'}
          </button>
        </div>

        <label className="text-xs text-slate-500 mb-2 block">Presets</label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map(p => (
            <button key={p.name} onClick={() => setColor(p.color)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                color === p.color
                  ? 'bg-brand-500/10 text-brand-300 border-brand-500/30'
                  : 'bg-surface text-slate-400 border-slate-700/30 hover:border-slate-500 hover:text-slate-200'
              }`}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-400" />
          Live Preview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FORM_ELEMENTS.map(el => (
            <div key={el.name} className="bg-surface-lighter rounded-lg border border-slate-700/30 p-4">
              <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">{el.name}</p>
              {el.render(color)}
            </div>
          ))}
        </div>
      </div>

      {/* What accent-color styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            What It Controls
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <div><span className="text-slate-200 font-medium">Checkbox</span> <span className="text-slate-400">— background when checked, border color</span></div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <div><span className="text-slate-200 font-medium">Radio button</span> <span className="text-slate-400">— fill color when selected</span></div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <div><span className="text-slate-200 font-medium">Range slider</span> <span className="text-slate-400">— track fill and thumb</span></div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <div><span className="text-slate-200 font-medium">Progress bar</span> <span className="text-slate-400">— filled portion</span></div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <div><span className="text-slate-200 font-medium">Select dropdown</span> <span className="text-slate-400">— focus ring color</span></div>
            </li>
          </ul>
        </div>
        <div className="card">
          <h2 className="text-white font-semibold text-sm mb-3">CSS Output</h2>
          <pre className="bg-[#0d1117] rounded-lg border border-slate-700/50 p-4 text-sm font-mono text-emerald-400">
{`/* Apply globally via :root */
:root {
  accent-color: ${color};
}

/* Or target specific elements */
input[type="checkbox"],
input[type="radio"],
input[type="range"],
progress {
  accent-color: ${color};
}`}
          </pre>
          <p className="text-xs text-slate-500 mt-2">
            Browser support: Chromium 93+, Firefox 92+, Safari 15.4+ (Baseline 2022)
          </p>
        </div>
      </div>

      {/* Color Variations Grid */}
      <div className="card">
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-brand-400" />
          Compare with Variations
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          See how accent-color renders across different form elements at once — compare side by side.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {COLOR_PRESETS.map(p => (
            <button key={p.name} onClick={() => setColor(p.color)}
              className={`p-3 rounded-lg border transition-all ${
                color === p.color ? 'border-brand-500/40 bg-brand-500/5' : 'border-slate-700/30 bg-surface hover:border-slate-500'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-4 rounded-full border border-slate-500/20" style={{ backgroundColor: p.color }} />
                <span className="text-[10px] text-slate-400 font-medium truncate">{p.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="checkbox" defaultChecked style={{ accentColor: p.color, width: 12, height: 12 }}
                  className="cursor-pointer" />
                <input type="radio" style={{ accentColor: p.color, width: 10, height: 10 }}
                  className="cursor-pointer" />
                <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: p.color }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
