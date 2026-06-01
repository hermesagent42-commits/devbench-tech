'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Layers, Eye, ArrowUpDown, Crosshair, Move } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type PositionValue = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

interface PositionConfig {
  position: PositionValue;
  top: number;
  right: number;
  bottom: number;
  left: number;
  zIndex: number;
}

interface Preset {
  name: string;
  description: string;
  config: PositionConfig;
  html: string;
  containerCss: string;
  tooltip: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Static (Default)',
    description: 'Element flows normally in document. Offsets & z-index have no effect.',
    config: { position: 'static', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 },
    html: 'I am static',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 24px; height: 200px;',
    tooltip: 'position: static is the default for every element. Top/right/bottom/left and z-index are ignored.',
  },
  {
    name: 'Relative Offset',
    description: 'Element stays in flow but offsets from its original position. Other elements still "see" the original spot.',
    config: { position: 'relative', top: -20, right: 0, bottom: 0, left: 40, zIndex: 1 },
    html: 'relative →',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 24px; height: 200px;',
    tooltip: 'position: relative offsets the element from its normal position without affecting surrounding layout. The space it would occupy is preserved.',
  },
  {
    name: 'Absolute Anchored',
    description: 'Removed from flow, positioned relative to nearest positioned ancestor (the dashed container).',
    config: { position: 'absolute', top: 16, right: 16, bottom: 0, left: 0, zIndex: 2 },
    html: 'ABS',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 24px; height: 200px;',
    tooltip: 'position: absolute removes the element from the normal flow. It positions relative to the nearest positioned ancestor (position ≠ static). The container here has position: relative — so the box anchors to it.',
  },
  {
    name: 'Absolute Centered',
    description: 'The classic centering trick — all edges at 0 + margin auto on a sized element.',
    config: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 2 },
    html: 'CENTER',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 24px; height: 200px;',
    tooltip: 'Setting all four sides to 0 and then using margin: auto centers absolutely positioned elements of known dimensions. A classic CSS centering pattern.',
  },
  {
    name: 'Fixed Badge',
    description: 'Fixed to the viewport — scrolls with the user. Perfect for cookie notices, chat widgets, or nav.',
    config: { position: 'fixed', top: 16, right: 16, bottom: 0, left: 0, zIndex: 100 },
    html: '🔔',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 24px; height: 200px; overflow-y: auto;',
    tooltip: 'position: fixed removes the element from flow and positions it relative to the browser viewport. It stays in place even when the page scrolls.',
  },
  {
    name: 'Sticky Header',
    description: 'Scrolls normally until reaching the edge, then "sticks." Essential for sticky headers.',
    config: { position: 'sticky', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 },
    html: '📌 Sticky! Scroll the container ↓',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 0; height: 200px; overflow-y: auto;',
    tooltip: 'position: sticky toggles between relative and fixed based on scroll position. The element scrolls normally until it hits the defined edge, then sticks. Requires a scrollable ancestor.',
  },
  {
    name: 'Overlapping Cards',
    description: 'Use relative + z-index to layer elements — each card offset slightly from the last.',
    config: { position: 'relative', top: -10, right: 0, bottom: 0, left: 20, zIndex: 5 },
    html: 'Card →',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 24px; height: 200px; display: flex; align-items: center; gap: 8px;',
    tooltip: 'Combining relative positioning with z-index lets you create layered, overlapping interfaces — cards, avatars, or timelines.',
  },
  {
    name: 'Tooltip / Popover',
    description: 'Absolute child inside a relative parent — the go-to pattern for tooltips, dropdowns, and popovers.',
    config: { position: 'absolute', top: -8, right: -8, bottom: 0, left: 0, zIndex: 50 },
    html: '💡',
    containerCss: 'position: relative; border: 2px dashed #64748b; padding: 24px; height: 200px;',
    tooltip: 'Place a relative container, then put an absolute child inside it. Offsets are relative to the container — this is how every tooltip library works under the hood.',
  },
];

// ── Offset slider component ────────────────────────────────────────────────

function OffsetSlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-slate-400 w-10 text-right">{label}</span>
      <input
        type="range"
        min={-200}
        max={200}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-400 [&::-webkit-slider-thumb]:cursor-pointer
          disabled:[&::-webkit-slider-thumb]:cursor-not-allowed"
      />
      <span className="text-xs font-mono text-slate-300 w-10">{value}px</span>
    </div>
  );
}

// ── Z-index slider ─────────────────────────────────────────────────────────

function ZIndexSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-slate-400 w-12">z-index</span>
      <input
        type="range"
        min={-10}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer
          disabled:[&::-webkit-slider-thumb]:cursor-not-allowed"
      />
      <span className="text-xs font-mono text-slate-300 w-8">{value}</span>
    </div>
  );
}

// ── Position button ────────────────────────────────────────────────────────

const POSITIONS: { value: PositionValue; label: string; icon: string }[] = [
  { value: 'static', label: 'Static', icon: '⬜' },
  { value: 'relative', label: 'Relative', icon: '↔️' },
  { value: 'absolute', label: 'Absolute', icon: '🎯' },
  { value: 'fixed', label: 'Fixed', icon: '📌' },
  { value: 'sticky', label: 'Sticky', icon: '🧲' },
];

// ── CSS Generator ──────────────────────────────────────────────────────────

function generateCSS(config: PositionConfig, html: string): string {
  const lines: string[] = [];
  lines.push('.positioned-box {');
  lines.push(`  position: ${config.position};`);
  if (config.position !== 'static') {
    if (config.top !== 0) lines.push(`  top: ${config.top}px;`);
    if (config.right !== 0) lines.push(`  right: ${config.right}px;`);
    if (config.bottom !== 0) lines.push(`  bottom: ${config.bottom}px;`);
    if (config.left !== 0) lines.push(`  left: ${config.left}px;`);
    if (config.zIndex !== 0) lines.push(`  z-index: ${config.zIndex};`);
  }
  lines.push('}');
  if (config.position === 'absolute' && config.top === 0 && config.right === 0 && config.bottom === 0 && config.left === 0) {
    lines.push('');
    lines.push('/* Classic centering trick — add to .positioned-box: */');
    lines.push('/* margin: auto; */');
    lines.push('/* width: fit-content; */');
    lines.push('/* height: fit-content; */');
  }
  return lines.join('\n');
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CSSPositionPlayground() {
  const [config, setConfig] = useState<PositionConfig>(PRESETS[0].config);
  const [html, setHtml] = useState(PRESETS[0].html);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [cssView, setCssView] = useState(false);
  const [tooltip, setTooltip] = useState(PRESETS[0].tooltip);

  const isStatic = config.position === 'static';

  const updateConfig = useCallback((partial: Partial<PositionConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...partial,
      ...(partial.position === 'static' ? { top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 } : {}),
    }));
  }, []);

  const applyPreset = useCallback((idx: number) => {
    const preset = PRESETS[idx];
    setConfig(preset.config);
    setHtml(preset.html);
    setSelectedPreset(idx);
    setTooltip(preset.tooltip);
  }, []);

  const reset = useCallback(() => {
    applyPreset(0);
  }, [applyPreset]);

  const cssOutput = useMemo(() => generateCSS(config, html), [config, html]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cssOutput);
    toast.success('CSS copied!');
  }, [cssOutput]);

  // ── Box display styles ───────────────────────────────────────────────────
  const isSmallBox = html === '🔔' || html === '💡';
  const boxSize = config.position === 'absolute' && config.top === 0 && config.right === 0 && config.bottom === 0 && config.left === 0
    ? { width: 'fit-content' as const, height: 'fit-content' as const, margin: 'auto' as const }
    : isSmallBox
      ? { width: '36px' as const, height: '36px' as const }
      : { width: 'auto' as const, height: 'auto' as const };

  return (
    <ToolLayout
      title="CSS Position Playground"
      description="Visually learn and experiment with all 5 CSS position values — static, relative, absolute, fixed, and sticky. Adjust offsets, z-index, and see exactly how each value changes layout behavior."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Position selector */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Move className="w-4 h-4 text-brand-400" />
              Position Value
            </div>
            <div className="grid grid-cols-2 gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => updateConfig({ position: pos.value })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    config.position === pos.value
                      ? 'bg-brand-500/10 border-brand-400/30 text-brand-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <span>{pos.icon}</span>
                  <span>{pos.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Offsets */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Crosshair className="w-4 h-4 text-brand-400" />
              Offsets
              {isStatic && (
                <span className="text-xs text-amber-400 ml-auto">disabled for static</span>
              )}
            </div>
            <div className="space-y-2.5">
              <OffsetSlider label="top" value={config.top} onChange={(v) => updateConfig({ top: v })} disabled={isStatic} />
              <OffsetSlider label="right" value={config.right} onChange={(v) => updateConfig({ right: v })} disabled={isStatic} />
              <OffsetSlider label="bottom" value={config.bottom} onChange={(v) => updateConfig({ bottom: v })} disabled={isStatic} />
              <OffsetSlider label="left" value={config.left} onChange={(v) => updateConfig({ left: v })} disabled={isStatic} />
            </div>
          </div>

          {/* Z-index */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Layers className="w-4 h-4 text-amber-400" />
              Z-Index
              {isStatic && (
                <span className="text-xs text-amber-400 ml-auto">disabled for static</span>
              )}
            </div>
            <ZIndexSlider value={config.zIndex} onChange={(v) => updateConfig({ zIndex: v })} disabled={isStatic} />
            {!isStatic && (
              <p className="text-xs text-slate-500">
                {config.zIndex < 0
                  ? 'Negative z-index places element behind stacking context'
                  : config.zIndex === 0
                  ? 'Default stacking level (auto)'
                  : `Stacked above elements with z-index < ${config.zIndex}`}
              </p>
            )}
          </div>

          {/* Html label */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Eye className="w-4 h-4 text-brand-400" />
              Box Label
            </div>
            <input
              type="text"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-400/50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* CSS Output */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Generated CSS</span>
              <button
                onClick={() => setCssView(!cssView)}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {cssView ? 'Hide' : 'Show'}
              </button>
            </div>
            {cssView && (
              <pre className="text-xs text-slate-300 font-mono bg-slate-950 rounded-lg p-3 overflow-x-auto">
                {cssOutput}
              </pre>
            )}
          </div>
        </div>

        {/* ── Preview ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tooltip / explainer */}
          <div className="bg-brand-500/5 border border-brand-400/20 rounded-xl p-4">
            <p className="text-sm text-slate-300 leading-relaxed">{tooltip}</p>
          </div>

          {/* Live preview */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Preview</span>
              <span className="text-xs text-slate-500 font-mono">
                {config.position === 'static' ? 'Static — offsets & z-index ignored' : `${config.position}, z: ${config.zIndex}`}
              </span>
            </div>

            {/* Preview container with relative positioning context */}
            <div
              className="rounded-xl overflow-hidden relative"
              style={{
                position: 'relative',
                border: '2px dashed #475569',
                padding: config.position === 'sticky' ? '0' : '24px',
                height: config.position === 'sticky' ? '200px' : '240px',
                overflowY: config.position === 'sticky' || config.position === 'fixed' ? 'auto' : 'visible',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(71,85,105,0.15) 39px, rgba(71,85,105,0.15) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(71,85,105,0.15) 39px, rgba(71,85,105,0.15) 40px)',
              }}
            >
              {/* Ghost — shows original position for relative */}
              {config.position === 'relative' && (
                <div
                  className="absolute rounded-lg border border-dashed border-amber-500/30 flex items-center justify-center pointer-events-none"
                  style={{
                    top: 24,
                    left: 24,
                    width: 'fit-content',
                    height: 'auto',
                    padding: '16px 20px',
                    fontSize: '14px',
                  }}
                >
                  <span className="text-amber-400/40 text-xs font-mono">original position</span>
                </div>
              )}

              {/* Anchor indicator for absolute */}
              {config.position === 'absolute' && (
                <div className="absolute top-3 right-3 text-[10px] font-mono text-brand-400/60 pointer-events-none">
                  ← positioned ancestor
                </div>
              )}

              {/* Extra elements to show layering context */}
              {!isStatic && (
                <>
                  <div className="absolute top-4 left-4 w-16 h-16 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs text-purple-400/50 z-0 pointer-events-none">
                    z:0
                  </div>
                  <div className="absolute top-8 left-8 w-16 h-16 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs text-blue-400/50 z-0 pointer-events-none">
                    z:0
                  </div>
                </>
              )}

              {/* Sticky content area — extra scrollable content */}
              {config.position === 'sticky' && (
                <div className="min-h-[300px] space-y-3 p-6">
                  <p className="text-xs text-slate-500 text-center">↑ Scroll the container to see sticky behavior ↑</p>
                  {/* Sticky element rendered below */}
                  {(() => {
                    const stickyStyle: React.CSSProperties = {
                      position: 'sticky',
                      top: `${config.top}px`,
                      zIndex: config.zIndex || 1,
                      background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.15))',
                      border: '2px solid rgba(14,165,233,0.4)',
                      color: '#e2e8f0',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'inline-block',
                    };
                    return <div style={stickyStyle}>{html}</div>;
                  })()}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <p key={i} className="text-xs text-slate-600">
                      Scrollable content line {i + 1} — keep scrolling to see the sticky element detach and stick to the top.
                    </p>
                  ))}
                </div>
              )}

              {/* The positioned box (non-sticky) */}
              {config.position !== 'sticky' && (
                <div
                  className="rounded-lg flex items-center justify-center font-semibold select-none transition-all duration-150"
                  style={{
                    position: config.position,
                    top: config.position !== 'static' ? `${config.top}px` : undefined,
                    right: config.position !== 'static' ? `${config.right}px` : undefined,
                    bottom: config.position !== 'static' ? `${config.bottom}px` : undefined,
                    left: config.position !== 'static' ? `${24 + config.left}px` : undefined,
                    zIndex: config.position !== 'static' ? config.zIndex : undefined,
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.15))',
                    border: `2px solid ${config.position === 'fixed' ? 'rgba(239,68,68,0.5)' : 'rgba(14,165,233,0.4)'}`,
                    color: '#e2e8f0',
                    padding: '16px 20px',
                    fontSize: isSmallBox ? '18px' : '14px',
                    width: boxSize.width,
                    height: boxSize.height,
                    boxShadow: config.position !== 'static'
                      ? '0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(14,165,233,0.1)'
                      : undefined,
                  }}
                >
                  {html}
                </div>
              )}

              {/* Fixed position indicator */}
              {config.position === 'fixed' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-mono text-red-400/40 bg-slate-900/80 px-2 py-0.5 rounded">
                    viewport-relative
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Presets */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Presets</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(idx)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedPreset === idx
                      ? 'bg-brand-500/10 border-brand-400/30'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className={`text-xs font-medium ${selectedPreset === idx ? 'text-brand-400' : 'text-slate-300'}`}>
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reference table */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Quick Reference</span>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Value</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">In Flow?</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Offsets Work?</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Z-index Works?</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Relative To</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 px-3 font-mono text-brand-400">static</td>
                    <td className="py-2 px-3">✅</td>
                    <td className="py-2 px-3 text-slate-500">❌</td>
                    <td className="py-2 px-3 text-slate-500">❌</td>
                    <td className="py-2 px-3 text-slate-500">N/A</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 px-3 font-mono text-green-400">relative</td>
                    <td className="py-2 px-3">✅</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3">Its normal position</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 px-3 font-mono text-amber-400">absolute</td>
                    <td className="py-2 px-3 text-slate-500">❌</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3">Nearest positioned ancestor</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 px-3 font-mono text-red-400">fixed</td>
                    <td className="py-2 px-3 text-slate-500">❌</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3">Browser viewport</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-purple-400">sticky</td>
                    <td className="py-2 px-3">✅ (until stuck)</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3 text-green-400">✅</td>
                    <td className="py-2 px-3">Nearest scrolling ancestor</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
