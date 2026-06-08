'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Sun, Moon, Monitor, Eye, Info, Columns } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ColorScheme = 'normal' | 'light' | 'dark' | 'light dark';

interface Preset {
  name: string;
  scheme: ColorScheme;
  description: string;
  icon: typeof Sun;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Default',
    scheme: 'normal',
    description: 'No color-scheme — follows browser/user preference',
    icon: Monitor,
  },
  {
    name: 'Light Only',
    scheme: 'light',
    description: 'Force light scheme — scrollbars & controls adapt',
    icon: Sun,
  },
  {
    name: 'Dark Only',
    scheme: 'dark',
    description: 'Force dark scheme — native dark scrollbars, inputs',
    icon: Moon,
  },
  {
    name: 'Light + Dark',
    scheme: 'light dark',
    description: 'Advertises support for both, browser picks based on user preference',
    icon: Monitor,
  },
];

const BG_COLORS = ['#ffffff', '#f8fafc', '#1e293b', '#0f172a', '#18181b'];

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog.
0123456789 !@#$%^&*()_+-=[]{}|;':",./<>?

Select me to see selection colors.
Try editing this text directly.`;

// ── Component ──────────────────────────────────────────────────────────────

export default function CssColorSchemePlayground() {
  const [scheme, setScheme] = useState<ColorScheme>('normal');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#1e293b');
  const [compareMode, setCompareMode] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const applyPreset = useCallback((preset: Preset) => {
    setScheme(preset.scheme);
    if (preset.scheme === 'dark') {
      setBgColor('#0f172a');
      setTextColor('#e2e8f0');
    } else if (preset.scheme === 'light') {
      setBgColor('#ffffff');
      setTextColor('#1e293b');
    }
  }, []);

  const containerStyle: React.CSSProperties = {
    colorScheme: scheme === 'normal' ? undefined : scheme,
    backgroundColor: bgColor,
    color: textColor,
  };

  const cssCode = useMemo(() => {
    const lines: string[] = [];
    if (scheme !== 'normal') {
      lines.push(`color-scheme: ${scheme};`);
    }
    lines.push(`background-color: ${bgColor};`);
    lines.push(`color: ${textColor};`);
    return lines.join('\n');
  }, [scheme, bgColor, textColor]);

  const htmlCode = useMemo(() => {
    const styleParts: string[] = [];
    if (scheme !== 'normal') styleParts.push(`  color-scheme: ${scheme};`);
    styleParts.push(`  background-color: ${bgColor};`);
    styleParts.push(`  color: ${textColor};`);
    return `<style>
  :root {
${styleParts.join('\n')}
  }
</style>`.trim();
  }, [scheme, bgColor, textColor]);

  const copyCode = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${label} copied!`);
  }, []);

  const schemeLabel = useMemo(() => {
    switch (scheme) {
      case 'normal': return 'Browser default — no color-scheme set';
      case 'light': return 'Light scheme — native light appearance';
      case 'dark': return 'Dark scheme — native dark appearance';
      case 'light dark': return 'Both supported — browser picks by user preference';
    }
  }, [scheme]);

  return (
    <ToolLayout
      title="CSS color-scheme Playground"
      description="Explore the CSS color-scheme property — control how native form controls, scrollbars, and UI elements render in light or dark mode. Live preview, side-by-side comparison, and instant CSS output."
    >
      {/* ── Presets ──────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Presets
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left group ${
                scheme === preset.scheme
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                  : 'border-slate-700/50 bg-surface-light hover:bg-slate-800/60 text-slate-300'
              }`}
              title={preset.description}
            >
              <preset.icon className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{preset.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-5">
          {/* Scheme selector */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Monitor className="w-4 h-4" />
              color-scheme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['normal', 'light', 'dark', 'light dark'] as ColorScheme[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScheme(s)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    scheme === s
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {s === 'normal' && 'normal (unset)'}
                  {s === 'light' && 'light'}
                  {s === 'dark' && 'dark'}
                  {s === 'light dark' && 'light dark'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{schemeLabel}</p>
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
                className="w-10 h-10 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
              />
              <div className="flex gap-1">
                {BG_COLORS.map((c) => (
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

          {/* Compare toggle */}
          <div>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                compareMode
                  ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300'
              }`}
            >
              <Columns className="w-4 h-4" />
              {compareMode ? 'Comparison Mode: ON' : 'Enable Side-by-Side Comparison'}
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </label>

          {compareMode ? (
            /* Side-by-side comparison */
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-slate-500 mb-1 text-center uppercase tracking-wider">
                  Without color-scheme
                </div>
                <div
                  className="rounded-xl border border-slate-700 p-4 space-y-3 min-h-[320px]"
                  style={{ backgroundColor: bgColor, color: textColor }}
                >
                  <FormControlsPreview />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-1 text-center uppercase tracking-wider">
                  With color-scheme: {scheme}
                </div>
                <div
                  className="rounded-xl border border-brand-500/30 p-4 space-y-3 min-h-[320px]"
                  style={containerStyle}
                >
                  <FormControlsPreview />
                </div>
              </div>
            </div>
          ) : (
            /* Single preview */
            <div
              className="rounded-xl border border-slate-700 p-4 space-y-3 min-h-[320px] overflow-y-auto"
              style={containerStyle}
            >
              <FormControlsPreview />
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">
            {compareMode
              ? 'Notice how native form controls, scrollbars, and selection colors change between schemes.'
              : 'Interact with the controls to see how color-scheme affects their appearance.'}
          </p>
        </div>
      </div>

      {/* ── Code Output ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Generated Code
        </h2>
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
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">HTML + CSS (full)</span>
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
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors w-full"
        >
          <Info className="w-4 h-4 text-brand-400" />
          About color-scheme
          <span className="text-xs text-slate-500 ml-auto">{showInfo ? '▲' : '▼'}</span>
        </button>
        {showInfo && (
          <div className="mt-3 text-sm text-slate-400 space-y-2 ml-6">
            <p>
              <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">color-scheme</code> tells
              the browser which color schemes an element supports. This affects the rendering of
              native UI elements like form controls, scrollbars, and system colors.
            </p>
            <p>
              <strong className="text-slate-300">Why it matters:</strong> Without <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">color-scheme</code>,
              form controls and scrollbars always render in the browser&apos;s default (usually light) appearance,
              even when your CSS gives the page a dark background. Setting <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">color-scheme: dark</code> makes
              these native elements match your dark theme.
            </p>
            <p>
              <strong className="text-slate-300">Common usage:</strong> Set <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">color-scheme: light dark</code> on
              <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">:root</code> to tell the browser your site supports both schemes.
              The browser then renders native controls to match the user&apos;s <code className="text-brand-400 bg-slate-800 px-1 py-0.5 rounded text-xs">prefers-color-scheme</code> preference.
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                ✓ Chrome 81+
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                ✓ Firefox 96+
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                ✓ Safari 13+
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                ✓ Edge 81+
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                ✓ Baseline since 2021
              </span>
            </div>
          </div>
        )}
      </section>
    </ToolLayout>
  );
}

// ── Form Controls Preview ──────────────────────────────────────────────────

function FormControlsPreview() {
  return (
    <>
      {/* Text input */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Text Input</label>
        <input
          type="text"
          defaultValue="Type something here..."
          className="w-full px-3 py-2 rounded-md border text-sm"
          style={{
            backgroundColor: 'inherit',
            color: 'inherit',
            borderColor: 'ButtonBorder',
          }}
        />
      </div>

      {/* Select */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Select</label>
        <select
          className="w-full px-3 py-2 rounded-md border text-sm"
          style={{
            backgroundColor: 'inherit',
            color: 'inherit',
            borderColor: 'ButtonBorder',
          }}
        >
          <option>Option Alpha</option>
          <option>Option Beta</option>
          <option>Option Gamma</option>
        </select>
      </div>

      {/* Checkboxes & Radios */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Checkboxes &amp; Radios</label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" defaultChecked />
            <span>Checked</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" />
            <span>Unchecked</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" name="demo" defaultChecked />
            <span>Radio A</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" name="demo" />
            <span>Radio B</span>
          </label>
        </div>
      </div>

      {/* Range slider */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Range Slider</label>
        <input type="range" defaultValue={60} className="w-full" />
      </div>

      {/* Date picker */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Date Picker</label>
        <input
          type="date"
          defaultValue="2026-06-08"
          className="px-3 py-2 rounded-md border text-sm"
          style={{
            backgroundColor: 'inherit',
            color: 'inherit',
            borderColor: 'ButtonBorder',
          }}
        />
      </div>

      {/* Buttons */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Buttons</label>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-md border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'ButtonFace',
              color: 'ButtonText',
              borderColor: 'ButtonBorder',
            }}
          >
            Default
          </button>
          <button
            className="px-4 py-2 rounded-md border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'Highlight',
              color: 'HighlightText',
              borderColor: 'Highlight',
            }}
          >
            Primary
          </button>
          <button
            className="px-4 py-2 rounded-md border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color: 'inherit',
              borderColor: 'ButtonBorder',
            }}
          >
            Outline
          </button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Progress Bar</label>
        <progress value={65} max={100} className="w-full h-2 rounded" />
      </div>

      {/* Meter */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Meter</label>
        <meter value={0.7} className="w-full h-2 rounded" />
      </div>

      {/* Scrollbar demo */}
      <div
        className="h-24 overflow-y-auto rounded-md border p-3 text-sm leading-relaxed"
        style={{ borderColor: 'ButtonBorder' }}
      >
        <p className="opacity-80">Scrollbar demo area.</p>
        <p className="opacity-80">Line 1 — notice the scrollbar appearance.</p>
        <p className="opacity-80">Line 2 — it matches the color-scheme.</p>
        <p className="opacity-80">Line 3 — native dark scrollbars look great.</p>
        <p className="opacity-80">Line 4 — more content to scroll through.</p>
        <p className="opacity-80">Line 5 — keep going to see the scrollbar.</p>
        <p className="opacity-80">Line 6 — almost at the end now.</p>
        <p className="opacity-80">Line 7 — one more for good measure.</p>
      </div>

      {/* Color input */}
      <div>
        <label className="text-xs font-medium opacity-70 block mb-1">Color Picker</label>
        <input type="color" defaultValue="#6366f1" className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0.5" />
      </div>
    </>
  );
}
