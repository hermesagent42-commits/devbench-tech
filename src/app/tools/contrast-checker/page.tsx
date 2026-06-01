'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Palette, ArrowRightLeft, Copy, Check, Eye, EyeOff, RefreshCw,
  Type, Square, Shield, ShieldAlert, ShieldCheck, Info, Code2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number; }
interface WCAGResults {
  ratio: number;
  aa_normal: boolean;
  aa_large: boolean;
  aaa_normal: boolean;
  aaa_large: boolean;
  fg_luminance: number;
  bg_luminance: number;
}

interface Preset {
  label: string;
  fg: string;
  bg: string;
  description: string;
}

// ── WCAG 2.1 Contrast Calculation ─────────────────────────────────────────

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const expanded = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: RGB): number {
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function calculateWCAG(fgHex: string, bgHex: string): WCAGResults | null {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);
  if (!fgRgb || !bgRgb) return null;

  const fgLum = relativeLuminance(fgRgb);
  const bgLum = relativeLuminance(bgRgb);
  const ratio = contrastRatio(fgLum, bgLum);

  return {
    ratio: Math.round(ratio * 100) / 100,
    aa_normal: ratio >= 4.5,
    aa_large: ratio >= 3,
    aaa_normal: ratio >= 7,
    aaa_large: ratio >= 4.5,
    fg_luminance: Math.round(fgLum * 1000) / 1000,
    bg_luminance: Math.round(bgLum * 1000) / 1000,
  };
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { label: 'Black on White', fg: '#000000', bg: '#FFFFFF', description: 'Maximum contrast — passes every level.' },
  { label: 'White on Black', fg: '#FFFFFF', bg: '#000000', description: 'Inverted max contrast — great for dark mode.' },
  { label: 'Dark Gray on White', fg: '#333333', bg: '#FFFFFF', description: 'Common body text pattern — AA+ for normal text.' },
  { label: 'Mid Gray on White', fg: '#767676', bg: '#FFFFFF', description: 'Subtle text — fails AA for normal, passes for large.' },
  { label: 'Light Gray on White', fg: '#CCCCCC', bg: '#FFFFFF', description: 'Very low contrast — fails all WCAG levels. Avoid for text.' },
  { label: 'Navy on White', fg: '#1A365D', bg: '#FFFFFF', description: 'Sophisticated blue text — strong AA+ pass.' },
  { label: 'Green on White', fg: '#2D7A2D', bg: '#FFFFFF', description: 'Subtle green for success states — passes AA but not AAA.' },
  { label: 'Red on White', fg: '#CC0000', bg: '#FFFFFF', description: 'Warning/error red — passes AA for normal text.' },
  { label: 'Blue on Dark', fg: '#90CDF4', bg: '#1A202C', description: 'Dark mode accent — strong contrast.' },
  { label: 'Purple on Dark', fg: '#B794F4', bg: '#1A202C', description: 'Dark mode purple accent.' },
  { label: 'Orange on Navy', fg: '#ED8936', bg: '#1A365D', description: 'CTA button colors — good contrast for UI elements.' },
  { label: 'Yellow on White', fg: '#FFD700', bg: '#FFFFFF', description: '⚠️ Classic accessibility fail — barely visible.' },
];

// ── Rating Bar Visualization ───────────────────────────────────────────────

function ContrastBar({ ratio }: { ratio: number }) {
  const clampedRatio = Math.min(ratio, 21);
  const pct = (clampedRatio / 21) * 100;

  let barColor = 'bg-red-500';
  if (ratio >= 7) barColor = 'bg-emerald-500';
  else if (ratio >= 4.5) barColor = 'bg-amber-500';
  else if (ratio >= 3) barColor = 'bg-orange-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-400">
        <span>1:1</span>
        <span className="font-mono font-bold text-sm text-slate-200">{ratio}:1</span>
        <span>21:1</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Markers */}
      <div className="relative h-4 mt-0.5">
        {[
          { at: (3 / 21) * 100, label: 'AA Large', ok: ratio >= 3 },
          { at: (4.5 / 21) * 100, label: 'AA', ok: ratio >= 4.5 },
          { at: (7 / 21) * 100, label: 'AAA', ok: ratio >= 7 },
        ].map(m => (
          <div
            key={m.label}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${m.at}%` }}
          >
            <div className={`w-0.5 h-2.5 ${m.ok ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            <span className={`text-[10px] font-medium mt-0.5 ${m.ok ? 'text-emerald-400' : 'text-slate-500'}`}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Checkmark badge ────────────────────────────────────────────────────────

function CheckBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
      pass ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
        'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      {pass ? <Check className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {label}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ContrastChecker() {
  const [fg, setFg] = useState('#333333');
  const [bg, setBg] = useState('#FFFFFF');
  const [fgInput, setFgInput] = useState('#333333');
  const [bgInput, setBgInput] = useState('#FFFFFF');
  const [swapColors, setSwapColors] = useState(false);
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog.');
  const [showLuminance, setShowLuminance] = useState(false);

  const effectiveFg = swapColors ? bg : fg;
  const effectiveBg = swapColors ? fg : bg;

  const results = useMemo(() => calculateWCAG(effectiveFg, effectiveBg), [effectiveFg, effectiveBg]);

  // Handle color picker changes
  const onFgChange = useCallback((value: string) => {
    const hex = value.startsWith('#') ? value : '#' + value;
    setFgInput(hex);
    if (hexToRgb(hex)) {
      setFg(hex);
    }
  }, []);

  const onBgChange = useCallback((value: string) => {
    const hex = value.startsWith('#') ? value : '#' + value;
    setBgInput(hex);
    if (hexToRgb(hex)) {
      setBg(hex);
    }
  }, []);

  const onFgBlur = useCallback(() => {
    const rgb = hexToRgb(fgInput);
    if (rgb) {
      setFg(rgbToHex(rgb.r, rgb.g, rgb.b));
      setFgInput(rgbToHex(rgb.r, rgb.g, rgb.b));
    } else {
      setFgInput(fg);
    }
  }, [fgInput, fg]);

  const onBgBlur = useCallback(() => {
    const rgb = hexToRgb(bgInput);
    if (rgb) {
      setBg(rgbToHex(rgb.r, rgb.g, rgb.b));
      setBgInput(rgbToHex(rgb.r, rgb.g, rgb.b));
    } else {
      setBgInput(bg);
    }
  }, [bgInput, bg]);

  const applyPreset = useCallback((preset: Preset) => {
    setFg(preset.fg);
    setBg(preset.bg);
    setFgInput(preset.fg);
    setBgInput(preset.bg);
    setSwapColors(false);
    toast.success(`Loaded: ${preset.label}`);
  }, []);

  const doSwap = useCallback(() => {
    setSwapColors(s => !s);
    setFgInput(effectiveBg);
    setBgInput(effectiveFg);
    setFg(effectiveBg);
    setBg(effectiveFg);
  }, [effectiveFg, effectiveBg]);

  const copyResults = useCallback(() => {
    if (!results) return;
    const text = [
      `Contrast Ratio: ${results.ratio}:1`,
      `AA Normal Text: ${results.aa_normal ? '✅ PASS' : '❌ FAIL'} (requires 4.5:1)`,
      `AA Large Text: ${results.aa_large ? '✅ PASS' : '❌ FAIL'} (requires 3:1)`,
      `AAA Normal Text: ${results.aaa_normal ? '✅ PASS' : '❌ FAIL'} (requires 7:1)`,
      `AAA Large Text: ${results.aaa_large ? '✅ PASS' : '❌ FAIL'} (requires 4.5:1)`,
      `Foreground: ${effectiveFg} | Background: ${effectiveBg}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Results copied!');
  }, [results, effectiveFg, effectiveBg]);

  // Score summary
  const scoreSummary = useMemo(() => {
    if (!results) return null;
    const passed = [results.aa_normal, results.aa_large, results.aaa_normal, results.aaa_large]
      .filter(Boolean).length;
    if (passed === 4) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: 'Passes all WCAG levels' };
    if (passed >= 3) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Passes AA (all) + AAA large' };
    if (passed >= 2) return { label: 'Passable', color: 'text-amber-400', bg: 'bg-amber-500/10', desc: 'Passes AA — standard for most sites' };
    if (passed >= 1) return { label: 'Poor', color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Only passes large text — insufficient for body copy' };
    return { label: 'Fail', color: 'text-red-400', bg: 'bg-red-500/10', desc: 'Fails all WCAG levels — unusable for text' };
  }, [results]);

  return (
    <ToolLayout
      title="WCAG Color Contrast Checker"
      description="Check color contrast against WCAG 2.1 guidelines. Verify your text meets AA and AAA accessibility standards — real-time calculation, visual preview, and 12 presets."
      controls={
        <div className="flex items-center gap-2 flex-wrap w-full">
          {scoreSummary && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${scoreSummary.bg} ${
              results?.aa_normal ? 'border-emerald-500/20' : 'border-red-500/20'
            }`}>
              <Shield className={`w-3.5 h-3.5 ${scoreSummary.color}`} />
              <span className={scoreSummary.color}>{scoreSummary.label}</span>
              <span className="text-slate-500 ml-1 hidden sm:inline">{scoreSummary.desc}</span>
            </div>
          )}
          <button
            onClick={copyResults}
            className="ml-auto px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Report
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Color Controls ──────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Color Pickers */}
          <div className="card grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Foreground (Text)</label>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={effectiveFg}
                    onChange={(e) => onFgChange(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  value={fgInput}
                  onChange={(e) => onFgChange(e.target.value)}
                  onBlur={onFgBlur}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                />
              </div>
              {fgInput !== effectiveFg && hexToRgb(fgInput) && (
                <p className="text-[10px] text-brand-400 mt-1 ml-1">Press Tab to apply</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Background</label>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={effectiveBg}
                    onChange={(e) => onBgChange(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  value={bgInput}
                  onChange={(e) => onBgChange(e.target.value)}
                  onBlur={onBgBlur}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                />
              </div>
              {bgInput !== effectiveBg && hexToRgb(bgInput) && (
                <p className="text-[10px] text-brand-400 mt-1 ml-1">Press Tab to apply</p>
              )}
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <button
              onClick={doSwap}
              className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Swap Colors
            </button>
          </div>

          {/* Contrast Ratio Display */}
          {results && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Contrast Ratio</h3>
                <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
                  {results.ratio}:1
                </span>
              </div>
              <ContrastBar ratio={results.ratio} />

              {/* WCAG Compliance Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50">
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">AA Compliance</p>
                  <div className="flex flex-wrap gap-1.5">
                    <CheckBadge pass={results.aa_normal} label="Normal (4.5:1)" />
                    <CheckBadge pass={results.aa_large} label="Large (3:1)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">AAA Compliance</p>
                  <div className="flex flex-wrap gap-1.5">
                    <CheckBadge pass={results.aaa_normal} label="Normal (7:1)" />
                    <CheckBadge pass={results.aaa_large} label="Large (4.5:1)" />
                  </div>
                </div>
              </div>

              {/* Luminance details */}
              <button
                onClick={() => setShowLuminance(!showLuminance)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showLuminance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showLuminance ? 'Hide' : 'Show'} relative luminance values
              </button>
              {showLuminance && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Foreground luminance</p>
                    <p className="text-sm font-mono text-slate-300">{results.fg_luminance}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Background luminance</p>
                    <p className="text-sm font-mono text-slate-300">{results.bg_luminance}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Presets */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Presets</h3>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {PRESETS.map((preset) => {
                const presetResult = calculateWCAG(preset.fg, preset.bg);
                return (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      effectiveFg === preset.fg && effectiveBg === preset.bg
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-slate-600 flex-shrink-0 flex items-center justify-center text-lg"
                        style={{ backgroundColor: preset.bg, color: preset.fg }}
                      >
                        Aa
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{preset.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{preset.description}</p>
                      </div>
                      {presetResult && (
                        <span className={`text-xs font-mono font-bold flex-shrink-0 ${
                          presetResult.aa_normal ? 'text-emerald-400' : 
                          presetResult.aa_large ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {presetResult.ratio}:1
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right: Visual Preview ──────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              Live Preview
            </h3>

            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors resize-none"
              placeholder="Edit preview text..."
            />

            {/* Large preview area */}
            <div
              className="rounded-xl border border-slate-700 min-h-[200px] flex flex-col items-center justify-center p-6 transition-colors duration-200"
              style={{ backgroundColor: effectiveBg, color: effectiveFg }}
            >
              <p className="text-3xl font-bold mb-3">{previewText}</p>
              <p className="text-base opacity-80 mb-4">
                This text demonstrates the contrast between foreground and background.
              </p>
              <p className="text-sm opacity-60">
                Small text • Secondary information • Captions & footnotes
              </p>
            </div>

            {/* Size samples */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { size: 'text-lg', label: 'Large', wcag: '≥18pt bold or ≥24pt' },
                { size: 'text-base', label: 'Body', wcag: 'Standard body text' },
                { size: 'text-xs', label: 'Small', wcag: 'Captions, labels, footnotes' },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-lg p-3 text-center border border-slate-700"
                  style={{ backgroundColor: effectiveBg, color: effectiveFg }}
                >
                  <p className={`${s.size} font-semibold mb-1`}>{s.label}</p>
                  <p className="text-[10px] opacity-60 leading-tight">{s.wcag}</p>
                  <p className="text-[11px] mt-1 opacity-70">Aa Bb Cc 123</p>
                </div>
              ))}
            </div>

            {/* UI Element Preview */}
            <div className="space-y-3 pt-3 border-t border-slate-700/50">
              <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Square className="w-3.5 h-3.5" />
                UI Element Preview
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {/* Button preview */}
                <div
                  className="rounded-lg px-4 py-2.5 text-center text-sm font-medium border"
                  style={{ backgroundColor: effectiveFg, color: effectiveBg, borderColor: effectiveFg }}
                >
                  Primary Button
                </div>
                {/* Outline button preview */}
                <div
                  className="rounded-lg px-4 py-2.5 text-center text-sm font-medium border"
                  style={{ backgroundColor: 'transparent', color: effectiveFg, borderColor: effectiveFg }}
                >
                  Outline Button
                </div>
              </div>

              {/* Input preview */}
              <div
                className="rounded-lg px-3 py-2 text-sm border flex items-center gap-2"
                style={{ backgroundColor: effectiveBg, borderColor: effectiveFg + '40' }}
              >
                <span style={{ color: effectiveFg, opacity: 0.6 }}>🔍</span>
                <span style={{ color: effectiveFg, opacity: 0.5 }}>Search input placeholder...</span>
              </div>

              {/* Badge preview */}
              <div className="flex gap-2">
                {['Success', 'Warning', 'Error'].map((label, i) => {
                  const colors = ['#2D7A2D', '#B7791F', '#CC0000'];
                  const bgColors = ['#C6F6D5', '#FEFCBF', '#FED7D7'];
                  return (
                    <span
                      key={label}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: effectiveBg === '#FFFFFF' ? bgColors[i] : colors[i] + '30',
                        color: effectiveBg === '#FFFFFF' ? colors[i] : colors[i],
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* WCAG Quick Reference */}
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              WCAG 2.1 Quick Reference
            </h3>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div>
                  <p className="font-medium text-emerald-400">AA Normal</p>
                  <p className="text-slate-500">4.5:1 minimum</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-400">AA Large</p>
                  <p className="text-slate-500">3:1 minimum</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div>
                  <p className="font-medium text-amber-400">AAA Normal</p>
                  <p className="text-slate-500">7:1 minimum</p>
                </div>
                <div>
                  <p className="font-medium text-amber-400">AAA Large</p>
                  <p className="text-slate-500">4.5:1 minimum</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              Large text = 18pt+ bold or 24pt+ regular. Non-text UI components and graphical objects need 3:1 minimum.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
