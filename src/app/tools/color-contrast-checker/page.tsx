'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowUpDown, RefreshCw, Check, X, Eye, Droplets, History, Trash2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface ContrastResult {
  ratio: number;
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
}

interface HistoryEntry {
  fg: string;
  bg: string;
  ratio: number;
  timestamp: number;
}

interface Preset {
  label: string;
  fg: string;
  bg: string;
}

// ── Color Utilities ────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === nr) h = ((ng - nb) / delta + (ng < nb ? 6 : 0)) * 60;
    else if (max === ng) h = ((nb - nr) / delta + 2) * 60;
    else h = ((nr - ng) / delta + 4) * 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(fg: string, bg: string): number {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return 1;
  const l1 = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function analyzeContrast(ratio: number): ContrastResult {
  return {
    ratio,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { label: 'White on Black', fg: '#ffffff', bg: '#000000' },
  { label: 'Black on White', fg: '#000000', bg: '#ffffff' },
  { label: 'Navy on White', fg: '#1e3a5f', bg: '#ffffff' },
  { label: 'White on Brand Blue', fg: '#ffffff', bg: '#0ea5e9' },
  { label: 'Dark on Light Gray', fg: '#1a1a2e', bg: '#f1f5f9' },
  { label: 'Gray on White', fg: '#94a3b8', bg: '#ffffff' },
  { label: 'White on Red', fg: '#ffffff', bg: '#dc2626' },
  { label: 'Dark Green on White', fg: '#166534', bg: '#ffffff' },
  { label: 'Purple on Yellow', fg: '#6b21a8', bg: '#fef08a' },
  { label: 'Dark on Cream', fg: '#1e293b', bg: '#fef3c7' },
  { label: 'Slate on White', fg: '#64748b', bg: '#ffffff' },
  { label: 'Amber on Dark', fg: '#f59e0b', bg: '#0f172a' },
];

// ── Components ──────────────────────────────────────────────────────────────

function ContrastBadge({ result }: { result: ContrastResult }) {
  const ratio = result.ratio.toFixed(2);

  if (result.aaa) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
        <Check className="w-5 h-5 text-green-400" />
        <div>
          <p className="text-green-400 font-semibold text-sm">AAA — Excellent</p>
          <p className="text-green-500/70 text-xs">Ratio: {ratio}:1</p>
        </div>
      </div>
    );
  }

  if (result.aa) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <Check className="w-5 h-5 text-yellow-400" />
        <div>
          <p className="text-yellow-400 font-semibold text-sm">AA — Passes</p>
          <p className="text-yellow-500/70 text-xs">Ratio: {ratio}:1</p>
        </div>
      </div>
    );
  }

  if (result.aaLarge) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
        <Check className="w-5 h-5 text-orange-400" />
        <div>
          <p className="text-orange-400 font-semibold text-sm">AA Large — Large text only</p>
          <p className="text-orange-500/70 text-xs">Ratio: {ratio}:1</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
      <X className="w-5 h-5 text-red-400" />
      <div>
        <p className="text-red-400 font-semibold text-sm">Fail</p>
        <p className="text-red-500/70 text-xs">Ratio: {ratio}:1</p>
      </div>
    </div>
  );
}

function ScoreCircle({ label, passes, ratio, threshold }: { label: string; passes: boolean; ratio: number; threshold: number }) {
  const pct = Math.min(100, (ratio / threshold) * 100);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90">
          <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-700" />
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={passes ? 'text-green-400' : ratio >= threshold * 0.7 ? 'text-yellow-400' : 'text-red-400'}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {passes ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <X className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg border-2 border-slate-600 shadow-inner shrink-0"
        style={{ backgroundColor: value }}
      />
      <div className="flex-1">
        <label className="block text-xs text-slate-500 mb-1">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') {
                onChange(v.startsWith('#') ? v : '#' + v);
              }
            }}
            placeholder="#000000"
            maxLength={7}
            className="w-28 px-3 py-2 bg-surface border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:border-brand-500 transition-colors"
          />
          <input
            type="color"
            value={value.length === 7 ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-slate-600"
          />
        </div>
      </div>
    </div>
  );
}

function ColorDetails({ hex }: { hex: string }) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div>
        <span className="text-slate-500">HEX: </span>
        <span className="font-mono text-slate-300">{hex}</span>
      </div>
      <div>
        <span className="text-slate-500">RGB: </span>
        <span className="font-mono text-slate-300">rgb({rgb.r}, {rgb.g}, {rgb.b})</span>
      </div>
      <div>
        <span className="text-slate-500">HSL: </span>
        <span className="font-mono text-slate-300">hsl({hsl.h}, {hsl.s}%, {hsl.l}%)</span>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ColorContrastCheckerPage() {
  const [fg, setFg] = useState('#0ea5e9');
  const [bg, setBg] = useState('#0f172a');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // Load history
  useEffect(() => {
    try {
      const stored = localStorage.getItem('contrast-checker-history');
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveToHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 20);
      try { localStorage.setItem('contrast-checker-history', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem('contrast-checker-history'); } catch { /* ignore */ }
    toast.success('History cleared');
  }, []);

  const ratio = useMemo(() => getContrastRatio(fg, bg), [fg, bg]);
  const result = useMemo(() => analyzeContrast(ratio), [ratio]);
  const fgRgb = useMemo(() => hexToRgb(fg), [fg]);
  const bgRgb = useMemo(() => hexToRgb(bg), [bg]);

  // Save current check
  const recordCheck = useCallback(() => {
    saveToHistory({ fg, bg, ratio, timestamp: Date.now() });
  }, [fg, bg, ratio, saveToHistory]);

  const swap = useCallback(() => {
    setFg(bg);
    setBg(fg);
  }, [fg, bg]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 2000);
      toast.success('Copied!');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  return (
    <ToolLayout
      title="Color Contrast Checker"
      description="Check color contrast ratios for WCAG 2.1 accessibility compliance. Test foreground/background combos for AA and AAA conformance — 100% client-side."
    >
      {/* ── Color Inputs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Droplets className="w-4 h-4 text-brand-400" />
            Foreground (Text)
          </h3>
          <ColorInput label="Text color" value={fg} onChange={(v) => { setFg(v); recordCheck(); }} />
          {fgRgb && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <ColorDetails hex={fg} />
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Droplets className="w-4 h-4 text-purple-400" />
            Background
          </h3>
          <ColorInput label="Background color" value={bg} onChange={(v) => { setBg(v); recordCheck(); }} />
          {bgRgb && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <ColorDetails hex={bg} />
            </div>
          )}
        </div>
      </div>

      {/* ── Preview ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-8 mb-8 border-2 border-slate-700/50 transition-all duration-300"
        style={{ backgroundColor: bg, color: fg }}
      >
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <p className="text-3xl font-bold mb-1">Sample Heading</p>
            <p className="text-lg opacity-80">This is a large text sample (18pt+) demonstrating the color pairing.</p>
          </div>
          <div>
            <p className="text-base leading-relaxed mb-3">
              The quick brown fox jumps over the lazy dog. This paragraph uses normal body text (16px) to showcase how
              readable the foreground/background combination is for regular content.
            </p>
            <p className="text-sm leading-relaxed opacity-75">
              Small text (14px) — this shows how the colors perform for captions, footnotes, and UI microcopy.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium text-sm border transition-colors"
              style={{ backgroundColor: fg, color: bg, borderColor: fg }}
            >
              Primary Button
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium text-sm border transition-colors"
              style={{ backgroundColor: 'transparent', color: fg, borderColor: fg }}
            >
              Outline Button
            </button>
          </div>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Overall Result */}
        <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Overall Rating</h3>
          <ContrastBadge result={result} />
          <p className="mt-3 text-3xl font-bold font-mono text-white">{ratio.toFixed(2)}<span className="text-slate-500 text-lg">:1</span></p>
          <p className="text-xs text-slate-500 mt-1">contrast ratio</p>
        </div>

        {/* WCAG Scores */}
        <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider text-center">Normal Text</h3>
          <div className="flex justify-center gap-6">
            <ScoreCircle label="AA (4.5:1)" passes={result.aa} ratio={ratio} threshold={4.5} />
            <ScoreCircle label="AAA (7:1)" passes={result.aaa} ratio={ratio} threshold={7} />
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Normal text: &lt;18pt or &lt;14pt bold
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider text-center">Large Text</h3>
          <div className="flex justify-center gap-6">
            <ScoreCircle label="AA (3:1)" passes={result.aaLarge} ratio={ratio} threshold={3} />
            <ScoreCircle label="AAA (4.5:1)" passes={ratio >= 4.5} ratio={ratio} threshold={4.5} />
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Large text: ≥18pt or ≥14pt bold
          </p>
        </div>
      </div>

      {/* ── Compliance Table ─────────────────────────────────────────── */}
      <div className="mb-8 p-5 rounded-xl border border-slate-700/50 bg-surface-light">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4" />
          WCAG 2.1 Compliance Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase">Level</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase">Text Size</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase">Min Ratio</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase">Your Ratio</th>
                <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              <tr>
                <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">AA</span></td>
                <td className="py-3 px-3 text-slate-300">Normal</td>
                <td className="py-3 px-3 font-mono text-slate-400">4.5:1</td>
                <td className="py-3 px-3 font-mono text-slate-200">{ratio.toFixed(2)}:1</td>
                <td className="py-3 px-3 text-center">
                  {result.aa ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">AA</span></td>
                <td className="py-3 px-3 text-slate-300">Large</td>
                <td className="py-3 px-3 font-mono text-slate-400">3:1</td>
                <td className="py-3 px-3 font-mono text-slate-200">{ratio.toFixed(2)}:1</td>
                <td className="py-3 px-3 text-center">
                  {result.aaLarge ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400">AAA</span></td>
                <td className="py-3 px-3 text-slate-300">Normal</td>
                <td className="py-3 px-3 font-mono text-slate-400">7:1</td>
                <td className="py-3 px-3 font-mono text-slate-200">{ratio.toFixed(2)}:1</td>
                <td className="py-3 px-3 text-center">
                  {result.aaa ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400">AAA</span></td>
                <td className="py-3 px-3 text-slate-300">Large</td>
                <td className="py-3 px-3 font-mono text-slate-400">4.5:1</td>
                <td className="py-3 px-3 font-mono text-slate-200">{ratio.toFixed(2)}:1</td>
                <td className="py-3 px-3 text-center">
                  {result.aaaLarge ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">UI</span></td>
                <td className="py-3 px-3 text-slate-300">Components</td>
                <td className="py-3 px-3 font-mono text-slate-400">3:1</td>
                <td className="py-3 px-3 font-mono text-slate-200">{ratio.toFixed(2)}:1</td>
                <td className="py-3 px-3 text-center">
                  {ratio >= 3 ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Actions Row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={swap}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-light border border-slate-700 rounded-lg text-slate-300 hover:border-brand-500/50 hover:text-white transition-all text-sm font-medium"
        >
          <ArrowUpDown className="w-4 h-4" />
          Swap Colors
        </button>
        <button
          onClick={() => {
            const text = `Contrast Ratio: ${ratio.toFixed(2)}:1\nForeground: ${fg}\nBackground: ${bg}\nWCAG AA Normal: ${result.aa ? 'PASS' : 'FAIL'}\nWCAG AA Large: ${result.aaLarge ? 'PASS' : 'FAIL'}\nWCAG AAA Normal: ${result.aaa ? 'PASS' : 'FAIL'}`;
            copyToClipboard(text, 'report');
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-light border border-slate-700 rounded-lg text-slate-300 hover:border-brand-500/50 hover:text-white transition-all text-sm font-medium"
        >
          {copiedLabel === 'report' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copiedLabel === 'report' ? 'Copied' : 'Copy Report'}
        </button>
      </div>

      {/* ── Presets ──────────────────────────────────────────────────── */}
      <div className="mb-8 p-5 rounded-xl border border-slate-700/50 bg-surface-light">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preset Color Pairs
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {PRESETS.map((preset) => {
            const r = getContrastRatio(preset.fg, preset.bg);
            return (
              <button
                key={preset.label}
                onClick={() => { setFg(preset.fg); setBg(preset.bg); }}
                className="group relative rounded-lg border border-slate-700 hover:border-brand-500/50 transition-all overflow-hidden"
                style={{ backgroundColor: preset.bg, minHeight: '80px' }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                  <span className="text-sm font-medium text-center" style={{ color: preset.fg }}>
                    {preset.label}
                  </span>
                  <span className="text-xs mt-1 opacity-70 font-mono" style={{ color: preset.fg }}>
                    {r.toFixed(1)}:1
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── History ──────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="pt-8 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Checks
            </h3>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 12).map((entry, i) => (
              <button
                key={i}
                onClick={() => { setFg(entry.fg); setBg(entry.bg); }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg transition-all group"
                title={`${entry.fg} on ${entry.bg} — ${entry.ratio.toFixed(2)}:1`}
              >
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: entry.fg }} />
                  <span className="text-slate-600 text-xs">/</span>
                  <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: entry.bg }} />
                </div>
                <span className="font-mono text-xs text-slate-400 group-hover:text-brand-400 transition-colors">
                  {entry.ratio.toFixed(1)}:1
                </span>
                <span className="text-xs text-slate-600">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Info Footer ─────────────────────────────────────────────── */}
      <div className="mt-10 pt-8 border-t border-slate-700/50">
        <div className="flex items-start gap-3 text-sm text-slate-500">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Calculations follow{' '}
            <a
              href="https://www.w3.org/TR/WCAG21/#contrast-minimum"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:underline"
            >
              WCAG 2.1 contrast ratio formula
            </a>
            {' '}using relative luminance. All processing is done locally in your browser — no data is ever sent anywhere.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
