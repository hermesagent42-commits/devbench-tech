'use client';

import { useState, useMemo, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Move, Anchor, Layout, Eye, EyeOff, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Axis = 'block' | 'inline';
type Edge = 'start' | 'center' | 'end';
type PositionArea = `${Axis}-${Edge}` | 'center';

interface AnchorPreset {
  label: string;
  description: string;
  positionArea: string;
  margin: string;
  icon: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: AnchorPreset[] = [
  { label: 'Tooltip Below', description: 'Centered tooltip positioned below the anchor', positionArea: 'block-end center', margin: '8px', icon: '↓' },
  { label: 'Tooltip Above', description: 'Centered tooltip positioned above the anchor', positionArea: 'block-start center', margin: '8px', icon: '↑' },
  { label: 'Dropdown Menu', description: 'Dropdown aligned to the bottom-start edge', positionArea: 'block-end inline-start', margin: '4px', icon: '↘' },
  { label: 'Context Menu', description: 'Pops up to the right, vertically centered', positionArea: 'center inline-end', margin: '4px', icon: '→' },
  { label: 'Left Panel', description: 'Side panel anchored to the left, top-aligned', positionArea: 'block-start inline-start', margin: '8px', icon: '↖' },
  { label: 'Badge Top-Right', description: 'Notification badge at the top-end corner', positionArea: 'block-start inline-end', margin: '-6px', icon: '↗' },
  { label: 'Autocomplete', description: 'Suggestions list below, full-width', positionArea: 'block-end span-inline', margin: '4px', icon: '↙' },
  { label: 'Popover Center', description: 'Centered popover on top of the anchor', positionArea: 'center center', margin: '0', icon: '⊙' },
];

// ── 3x3 Grid Positions ─────────────────────────────────────────────────────

const POSITION_GRID = [
  ['block-start inline-start', 'block-start center', 'block-start inline-end'],
  ['center inline-start', 'center center', 'center inline-end'],
  ['block-end inline-start', 'block-end center', 'block-end inline-end'],
] as const;

const GRID_LABELS = [
  ['↖ top-start', '↑ top', '↗ top-end'],
  ['← left', '⊙ center', '→ right'],
  ['↙ bottom-start', '↓ bottom', '↘ bottom-end'],
];

// ── Component ───────────────────────────────────────────────────────────────

export default function AnchorPositioningPlaygroundPage() {
  const [gridPos, setGridPos] = useState<[number, number]>([2, 1]); // bottom center
  const [margin, setMargin] = useState('8px');
  const [showPopup, setShowPopup] = useState(true);
  const [showCode, setShowCode] = useState(true);

  const positionArea = POSITION_GRID[gridPos[0]][gridPos[1]];

  const cssCode = useMemo(() => {
    let marginBlock = margin;
    let marginInline = margin;

    if (positionArea.includes('block-start')) marginBlock = margin;
    else if (positionArea.includes('block-end')) marginBlock = margin;

    const lines = [
      '/* Anchor element */',
      '.anchor {',
      '  anchor-name: --my-anchor;',
      '}',
      '',
      '/* Positioned element */',
      '.popup {',
      '  position: absolute;',
      '  position-anchor: --my-anchor;',
      `  position-area: ${positionArea};`,
    ];
    if (margin !== '0') {
      lines.push(`  margin: ${margin};`);
    }
    lines.push('}');
    return lines.join('\n');
  }, [positionArea, margin]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const applyPreset = useCallback(
    (preset: AnchorPreset) => {
      setMargin(preset.margin);
      // Parse positionArea from preset
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (POSITION_GRID[row][col] === preset.positionArea) {
            setGridPos([row, col]);
            return;
          }
        }
      }
      // Handle span cases by setting to closest non-span
      if (preset.positionArea.includes('span-inline')) {
        setGridPos([2, 0]); // bottom-start (closest match)
      }
      if (preset.positionArea.includes('span-block')) {
        setGridPos([0, 1]); // top-center
      }
    },
    [],
  );

  // Compute popup style
  const popupStyle = useMemo(() => {
    const style: Record<string, string> = {
      position: 'absolute',
    };
    if (margin !== '0') {
      style.margin = margin;
    }

    // Map position-area to the closest CSS approximate
    // In a real browser with anchor positioning, this would use:
    // position-anchor: --my-anchor; position-area: ...;
    // Here we approximate with absolute positioning for the demo preview
    const row = gridPos[0];
    const col = gridPos[1];

    if (row === 0) style.top = margin !== '0' ? `-${margin}` : '0';
    else if (row === 1) style.top = '50%';
    else style.bottom = '0';

    if (col === 0) style.left = '0';
    else if (col === 1) style.left = '50%';
    else style.right = '0';

    if (row === 1) style.transform = col === 1 ? 'translate(-50%, -50%)' : `translateY(-50%)`;
    else if (col === 1) style.transform = 'translateX(-50%)';

    return style;
  }, [gridPos, margin]);

  return (
    <ToolLayout title="CSS Anchor Positioning Playground" description="Visually build CSS Anchor Positioning layouts — the native way to tether elements without JavaScript. Supports all 3×3 position-area values, live preview, and CSS output.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area: Visual preview + grid selector */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Preview */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-400" /> Live Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCode((v) => !v)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    showCode ? 'bg-slate-700 text-slate-300' : 'text-slate-500'
                  }`}
                >
                  CSS
                </button>
                <button
                  onClick={() => setShowPopup((v) => !v)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    showPopup ? 'bg-slate-700 text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Popup
                </button>
              </div>
            </div>

            {/* Preview Area */}
            <div className="relative h-80 bg-slate-950 border border-slate-700 rounded-lg flex items-center justify-center">
              {/* Anchor Element */}
              <div className="w-20 h-12 bg-brand-600 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-lg z-10 relative">
                <span className="flex items-center gap-1.5">
                  <Anchor className="w-4 h-4" /> Anchor
                </span>
              </div>

              {/* Popup */}
              {showPopup && (
                <div
                  className="absolute bg-slate-800 border border-brand-400/30 rounded-lg px-4 py-2.5 shadow-xl z-20 pointer-events-none"
                  style={popupStyle}
                >
                  <div className="text-xs text-brand-300 font-medium whitespace-nowrap">Popover</div>
                  <div className="text-[10px] text-slate-500 whitespace-nowrap">{GRID_LABELS[gridPos[0]][gridPos[1]]}</div>
                </div>
              )}
            </div>

            <div className="mt-2 text-center text-xs text-slate-500">
              This preview approximates CSS Anchor Positioning. In a supporting browser, the popup would use <code className="text-brand-400">position-anchor</code> and <code className="text-brand-400">position-area</code>.
            </div>
          </div>

          {/* Code Output */}
          {showCode && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-300">CSS Output</h3>
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors">
                  <Copy className="w-3 h-3" /> Copy CSS
                </button>
              </div>
              <pre className="text-xs font-mono text-brand-400 bg-slate-950 rounded p-3 overflow-x-auto">
                <code>{cssCode}</code>
              </pre>
              <div className="mt-3 text-xs text-slate-500">
                ⚡ Works in Chrome 125+, Safari 26+, Firefox 147+. Use{' '}
                <code className="text-amber-400">@supports (anchor-name: --x)</code> for progressive enhancement.
              </div>
            </div>
          )}

          {/* Position Grid Selector */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Layout className="w-4 h-4 text-brand-400" /> Position-Area Grid
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Click a cell to set <code className="text-brand-400">position-area</code>. The grid uses logical properties
              — <code className="text-brand-400">block</code> (vertical) and <code className="text-brand-400">inline</code> (horizontal).
            </p>
            <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto">
              {GRID_LABELS.map((row, ri) =>
                row.map((label, ci) => (
                  <button
                    key={`${ri}-${ci}`}
                    onClick={() => setGridPos([ri, ci])}
                    className={`aspect-square rounded text-[10px] leading-tight transition-all ${
                      gridPos[0] === ri && gridPos[1] === ci
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20 scale-105'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                )),
              )}
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs font-mono text-brand-400 bg-brand-600/10 px-2 py-1 rounded">
                position-area: {positionArea};
              </span>
            </div>
          </div>

          {/* Margin Control */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Move className="w-4 h-4 text-brand-400" /> Margin (Gap)
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="40"
                value={parseInt(margin.replace('px', '')) || 0}
                onChange={(e) => setMargin(`${e.target.value}px`)}
                className="flex-1 accent-brand-400"
              />
              <span className="text-sm font-mono text-brand-400 bg-slate-800 px-2 py-1 rounded min-w-[60px] text-center">
                {margin}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {['0', '4px', '8px', '12px', '16px', '24px'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMargin(m)}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${
                    margin === m
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Presets + Info */}
        <div className="space-y-4">
          {/* Presets */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Layout Presets</h3>
            <div className="space-y-1">
              {PRESETS.map((preset) => {
                const isActive = positionArea === preset.positionArea && margin === preset.margin;
                return (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                      isActive
                        ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-brand-400">{preset.icon}</span>
                      <span className="font-medium">{preset.label}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5 ml-6 text-[11px]">{preset.description}</div>
                    <div className="text-brand-400/60 font-mono text-[10px] mt-0.5 ml-6">
                      area: {preset.positionArea}, margin: {preset.margin}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Browser Support */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Browser Support</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chrome</span>
                <span className="text-green-400">125+ ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Safari</span>
                <span className="text-green-400">26+ ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Firefox</span>
                <span className="text-green-400">147+ ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Edge</span>
                <span className="text-green-400">125+ ✓</span>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-500">
              CSS Anchor Positioning is <span className="text-brand-400 font-medium">Baseline</span> as of March 2026.
              No JavaScript libraries needed for tooltips, dropdowns, or popovers.
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
