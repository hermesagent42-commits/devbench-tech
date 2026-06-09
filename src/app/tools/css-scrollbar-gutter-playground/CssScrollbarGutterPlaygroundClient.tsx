'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Columns, Minimize2, AlignStartVertical, AlignCenterVertical, Eye, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type GutterValue = 'auto' | 'stable' | 'stable both-edges';

interface Preset {
  name: string;
  description: string;
  value: GutterValue;
  containerHeight: number;
  sideBySide: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const GUTTER_VALUES: { value: GutterValue; label: string; desc: string }[] = [
  { value: 'auto', label: 'auto', desc: 'Gutter appears only when overflow causes a scrollbar (default). Content shifts when scrollbar appears.' },
  { value: 'stable', label: 'stable', desc: 'Browser reserves space for the scrollbar even when not needed. Content does NOT shift.' },
  { value: 'stable both-edges', label: 'stable both-edges', desc: 'Reserves space on BOTH sides — perfect for centered layouts. Zero layout shift.' },
];

const PRESETS: Preset[] = [
  { name: 'Modal Dialog', description: 'Prevent the body from shifting when opening a full-screen modal', value: 'stable both-edges', containerHeight: 200, sideBySide: false },
  { name: 'Nav Sidebar', description: 'Keep navigation width stable when content overflows', value: 'stable', containerHeight: 220, sideBySide: false },
  { name: 'Data Table', description: 'Prevent column width jumps when rows exceed container', value: 'stable', containerHeight: 200, sideBySide: false },
  { name: 'Chat List', description: 'Stable gutter so messages don\'t jump when chat history grows', value: 'stable', containerHeight: 200, sideBySide: false },
  { name: 'Centered Layout', description: 'Reserve both gutters — perfect for centered page layouts', value: 'stable both-edges', containerHeight: 200, sideBySide: false },
  { name: 'Default (auto)', description: 'See the default browser behavior — layout shift on scroll', value: 'auto', containerHeight: 200, sideBySide: false },
];

const SAMPLE_ITEMS = [
  'Dashboard overview', 'User management', 'Analytics reports', 'Payment history',
  'API documentation', 'Team settings', 'Audit logs', 'Notification preferences',
  'Billing & invoices', 'Security settings', 'Integrations hub', 'Activity feed',
];

const SHORT_ITEMS = [
  'Dashboard overview', 'User management',
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CssScrollbarGutterPlaygroundClient() {
  const [gutterValue, setGutterValue] = useState<GutterValue>('stable');
  const [containerHeight, setContainerHeight] = useState(180);
  const [useLongContent, setUseLongContent] = useState(true);
  const [sideBySide, setSideBySide] = useState(false);

  const items = useLongContent ? SAMPLE_ITEMS : SHORT_ITEMS;

  const applyPreset = useCallback((preset: Preset) => {
    setGutterValue(preset.value);
    setContainerHeight(preset.containerHeight);
    setSideBySide(preset.sideBySide);
  }, []);

  const copyCSS = useCallback(() => {
    const css = `/* Prevent layout shift when scrollbar appears */
html,
body,
.scrollable-container {
  scrollbar-gutter: ${gutterValue};
  overflow-y: auto;
  /* Optional: always show a scrollbar for consistent width */
  ${gutterValue === 'stable both-edges' ? 'overflow-y: scroll;' : ''}
}`;
    navigator.clipboard.writeText(css);
    toast.success('CSS copied!');
  }, [gutterValue]);

  const resetAll = useCallback(() => {
    setGutterValue('stable');
    setContainerHeight(180);
    setUseLongContent(true);
    setSideBySide(false);
  }, []);

  // CSS rule for the preview container
  const containerStyle: React.CSSProperties = {
    height: `${containerHeight}px`,
    overflowY: gutterValue.includes('stable') ? 'scroll' : 'auto',
    scrollbarGutter: gutterValue,
  };

  const resetContainerStyle: React.CSSProperties = {
    height: `${containerHeight}px`,
    overflowY: 'auto',
    scrollbarGutter: 'auto',
  };

  // Which gutter values to show in side-by-side
  const visibleGutters: GutterValue[] = sideBySide
    ? ['auto', 'stable', 'stable both-edges']
    : [gutterValue];

  return (
    <ToolLayout
      title="CSS scrollbar-gutter Playground"
      description="Prevent layout shift when scrollbars appear — test auto, stable, and stable both-edges live. Compare side-by-side, toggle content length, 6 presets, instant CSS output."
      controls={
        <>
          <button onClick={copyCSS} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button onClick={resetAll} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </>
      }
    >
      <div className="space-y-8">
        {/* ── Info Banner ─────────────────────────────────────────────────── */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-blue-300">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">What does scrollbar-gutter do?</p>
              <p className="text-blue-400/80 text-xs leading-relaxed">
                When content overflows, a scrollbar appears — and unless you handle it, the content shifts left by the scrollbar width (usually 15–17px). This causes <strong>cumulative layout shift (CLS)</strong> — one of Google&apos;s Core Web Vitals. <code className="bg-blue-500/20 px-1 py-0.5 rounded text-[11px]">scrollbar-gutter: stable</code> reserves scrollbar space even when the scrollbar is hidden, so content never jumps.
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Left Panel: Controls ─────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Gutter Value Picker */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3">scrollbar-gutter Value</h3>
              <div className="space-y-2">
                {GUTTER_VALUES.map((gv) => (
                  <button
                    key={gv.value}
                    onClick={() => { setGutterValue(gv.value); setSideBySide(false); }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      gutterValue === gv.value && !sideBySide
                        ? 'bg-brand-500/10 border-brand-500/50 text-brand-300'
                        : 'bg-surface-light border-slate-700/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-semibold">{gv.value}</code>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{gv.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Side-by-side toggle */}
            <button
              onClick={() => setSideBySide(!sideBySide)}
              className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-2 ${
                sideBySide
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                  : 'bg-surface-light border-slate-700/50 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="text-xs font-medium">Compare All Three Side-by-Side</span>
            </button>

            {/* Content Toggle */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Content Length</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setUseLongContent(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    useLongContent
                      ? 'bg-brand-500/10 border-brand-500/50 text-brand-300'
                      : 'bg-surface-light border-slate-700/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  Overflowing (12 items)
                </button>
                <button
                  onClick={() => setUseLongContent(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    !useLongContent
                      ? 'bg-brand-500/10 border-brand-500/50 text-brand-300'
                      : 'bg-surface-light border-slate-700/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  Short (2 items)
                </button>
              </div>
            </div>

            {/* Container Height */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-200">Container Height</h3>
                <span className="text-xs text-slate-400 font-mono">{containerHeight}px</span>
              </div>
              <input
                type="range"
                value={containerHeight}
                onChange={(e) => setContainerHeight(Number(e.target.value))}
                min={100}
                max={360}
                step={10}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Presets */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Presets</h3>
              <div className="space-y-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="w-full text-left p-2.5 rounded-lg bg-surface-light border border-slate-700/50 hover:border-brand-500/50 transition-colors"
                    title={p.description}
                  >
                    <div className="text-xs font-medium text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Live Previews ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Live Preview</h3>

            <div className={`grid ${visibleGutters.length === 3 ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
              {visibleGutters.map((gv) => {
                const isActive = gv === gutterValue && !sideBySide;
                return (
                  <div key={gv}>
                    {/* Label */}
                    <div className={`text-xs font-mono font-semibold mb-2 px-2 py-1 rounded inline-flex items-center gap-1.5 ${
                      isActive ? 'text-brand-300 bg-brand-500/10' : 'text-slate-400 bg-slate-800/50'
                    }`}>
                      {gv === 'auto' ? <Minimize2 className="w-3 h-3" /> : gv === 'stable' ? <AlignStartVertical className="w-3 h-3" /> : <AlignCenterVertical className="w-3 h-3" />}
                      {gv}
                    </div>

                    {/* The container */}
                    <div
                      className="rounded-lg border border-slate-700/50 bg-slate-800/30"
                      style={gv === gutterValue && !sideBySide ? containerStyle : resetContainerStyle}
                    >
                      {gv === gutterValue && !sideBySide ? (
                        <div className="p-3 space-y-1.5">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 text-xs text-slate-300">
                              <div className="w-5 h-5 rounded bg-slate-500/30 shrink-0 flex items-center justify-center text-[10px] font-mono text-slate-400">
                                {i + 1}
                              </div>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 space-y-1.5" style={{ overflowY: gv.includes('stable') ? 'scroll' : 'auto', scrollbarGutter: gv, height: `${containerHeight}px` }}>
                          {items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 text-xs text-slate-300">
                              <div className="w-5 h-5 rounded bg-slate-500/30 shrink-0 flex items-center justify-center text-[10px] font-mono text-slate-400">
                                {i + 1}
                              </div>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Shifting indicator */}
                    {gv === 'auto' && (
                      <p className="text-[11px] text-amber-400/70 mt-1.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Content shifts when scrollbar appears/disappears
                      </p>
                    )}
                    {gv === 'stable' && (
                      <p className="text-[11px] text-emerald-400/70 mt-1.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Space reserved — no layout shift
                      </p>
                    )}
                    {gv === 'stable both-edges' && (
                      <p className="text-[11px] text-emerald-400/70 mt-1.5 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Space on both sides — centered content stays centered
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Generated CSS */}
            <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-300">Generated CSS</h3>
                <button onClick={copyCSS} className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
              <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-900/60 rounded p-3 border border-slate-700/30">
{`/* Prevent layout shift when scrollbar appears */
html,
body,
.scrollable-container {
  scrollbar-gutter: ${gutterValue};
  overflow-y: auto;
  ${gutterValue === 'stable both-edges' ? 'overflow-y: scroll;  /* force both gutters visible */' : ''}
}`}
              </pre>
            </div>

            {/* Usage tips */}
            <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-300 mb-3">Usage Tips</h3>
              <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-brand-400 shrink-0">▸</span>
                  <span><strong>Apply to <code className="bg-slate-700 px-1 py-0.5 rounded text-[10px]">html</code> or <code className="bg-slate-700 px-1 py-0.5 rounded text-[10px]">body</code></strong> — one rule prevents layout shift site-wide. No per-component CSS needed.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 shrink-0">▸</span>
                  <span><strong>Use <code className="bg-slate-700 px-1 py-0.5 rounded text-[10px]">stable both-edges</code> for centered layouts</strong> — when you use <code className="bg-slate-700 px-1 py-0.5 rounded text-[10px]">margin: 0 auto</code>, the content stays perfectly centered even with a scrollbar.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 shrink-0">▸</span>
                  <span><strong>Combine with <code className="bg-slate-700 px-1 py-0.5 rounded text-[10px]">overflow-y: auto</code></strong> — the gutter only works with scrollable elements. Without overflow, nothing happens.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 shrink-0">▸</span>
                  <span><strong>Browser support</strong> — Baseline 2024. Works in Chrome 94+, Firefox 97+, Safari 15.4+, Edge 94+. Safe to use everywhere today.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-400 shrink-0">▸</span>
                  <span><strong>Compare to <code className="bg-slate-700 px-1 py-0.5 rounded text-[10px]">overflow-y: scroll</code></strong> — that forces a visible scrollbar (ugly when not needed). scrollbar-gutter: stable reserves invisible space (cleaner).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
