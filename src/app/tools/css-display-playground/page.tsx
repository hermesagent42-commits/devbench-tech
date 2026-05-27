'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, EyeOff, Grid3X3, Columns, Play, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type DisplayValue =
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'flex'
  | 'inline-flex'
  | 'grid'
  | 'inline-grid'
  | 'none'
  | 'contents'
  | 'flow-root'
  | 'list-item'
  | 'table';

type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
type AlignItems = 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline';
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

interface GridConfig {
  columns: string;
  rows: string;
  gap: number;
}

interface FlexConfig {
  direction: FlexDirection;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  wrap: FlexWrap;
  gap: number;
}

interface DisplayMode {
  value: DisplayValue;
  label: string;
  category: 'flow' | 'flex' | 'grid' | 'table' | 'special';
  description: string;
  icon: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DISPLAY_MODES: DisplayMode[] = [
  // Flow layout
  { value: 'block', label: 'block', category: 'flow', description: 'Takes full width, starts on new line. Default for <div>, <p>, <h1>.', icon: '▣' },
  { value: 'inline', label: 'inline', category: 'flow', description: 'Flows with text, width/height ignored. Default for <span>, <a>, <strong>.', icon: '→' },
  { value: 'inline-block', label: 'inline-block', category: 'flow', description: 'Flows inline but respects width/height. Like <img> or <button>.', icon: '▤' },
  { value: 'flow-root', label: 'flow-root', category: 'flow', description: 'Block box that creates a new BFC. Contains floats without clearfix hacks.', icon: '⬒' },
  { value: 'list-item', label: 'list-item', category: 'flow', description: 'Block box with a marker box. Default for <li>. Creates bullet/number.', icon: '•' },
  // Flex layout
  { value: 'flex', label: 'flex', category: 'flex', description: 'Block-level flex container. Children become flex items. One-dimensional layout.', icon: '⬌' },
  { value: 'inline-flex', label: 'inline-flex', category: 'flex', description: 'Inline-level flex container. Flexbox that flows with surrounding text.', icon: '⇉' },
  // Grid layout
  { value: 'grid', label: 'grid', category: 'grid', description: 'Block-level grid container. Children become grid items. Two-dimensional layout.', icon: '⊞' },
  { value: 'inline-grid', label: 'inline-grid', category: 'grid', description: 'Inline-level grid container. Grid that flows with surrounding text.', icon: '⊞' },
  // Table layout
  { value: 'table', label: 'table', category: 'table', description: 'Behaves like <table>. Children with table-row/table-cell display form a table.', icon: '⊟' },
  // Special
  { value: 'none', label: 'none', category: 'special', description: 'Removes the element from the layout entirely. Takes no space, not hidden — gone.', icon: '∅' },
  { value: 'contents', label: 'contents', category: 'special', description: 'Element disappears; its children act as direct children of the parent. Great for wrapper removal.', icon: '⊝' },
];

const DISPLAY_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'flow', label: 'Flow Layout', icon: '▣' },
  { key: 'flex', label: 'Flexbox', icon: '⬌' },
  { key: 'grid', label: 'Grid', icon: '⊞' },
  { key: 'table', label: 'Table', icon: '⊟' },
  { key: 'special', label: 'Special', icon: '∅' },
];

const FLEX_DIRECTIONS: { value: FlexDirection; label: string }[] = [
  { value: 'row', label: 'Row →' },
  { value: 'row-reverse', label: 'Row ←' },
  { value: 'column', label: 'Col ↓' },
  { value: 'column-reverse', label: 'Col ↑' },
];

const JUSTIFY_CONTENTS: { value: JustifyContent; label: string }[] = [
  { value: 'flex-start', label: 'Start' },
  { value: 'flex-end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'space-between', label: 'Space Between' },
  { value: 'space-around', label: 'Space Around' },
  { value: 'space-evenly', label: 'Space Evenly' },
];

const ALIGN_ITEMS: { value: AlignItems; label: string }[] = [
  { value: 'stretch', label: 'Stretch' },
  { value: 'flex-start', label: 'Start' },
  { value: 'flex-end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'baseline', label: 'Baseline' },
];

const FLEX_WRAPS: { value: FlexWrap; label: string }[] = [
  { value: 'nowrap', label: 'No Wrap' },
  { value: 'wrap', label: 'Wrap' },
  { value: 'wrap-reverse', label: 'Wrap Reverse' },
];

const DEMO_ITEMS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEMO_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500'];

// ── Component ──────────────────────────────────────────────────────────────

export default function CssDisplayPlayground() {
  const [selected, setSelected] = useState<DisplayValue>('block');
  const [category, setCategory] = useState<string>('flow');
  const [showHidden, setShowHidden] = useState(false);

  // Flex config
  const [flexConfig, setFlexConfig] = useState<FlexConfig>({
    direction: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    wrap: 'nowrap',
    gap: 8,
  });

  // Grid config
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    columns: 'repeat(3, 1fr)',
    rows: 'auto',
    gap: 8,
  });

  const filteredModes = useMemo(
    () => DISPLAY_MODES.filter((m) => m.category === category),
    [category],
  );

  const selectedMode = useMemo(
    () => DISPLAY_MODES.find((m) => m.value === selected)!,
    [selected],
  );

  const isFlex = selected === 'flex' || selected === 'inline-flex';
  const isGrid = selected === 'grid' || selected === 'inline-grid';

  const containerStyle: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      display: selected as React.CSSProperties['display'],
      minHeight: '120px',
      padding: '12px',
      borderRadius: '8px',
      background: 'rgba(30, 41, 59, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.3)',
    };

    if (isFlex) {
      base.flexDirection = flexConfig.direction;
      base.justifyContent = flexConfig.justifyContent;
      base.alignItems = flexConfig.alignItems;
      base.flexWrap = flexConfig.wrap;
      base.gap = `${flexConfig.gap}px`;
    }

    if (isGrid) {
      base.gridTemplateColumns = gridConfig.columns;
      base.gridTemplateRows = gridConfig.rows;
      base.gap = `${gridConfig.gap}px`;
    }

    return base;
  }, [selected, flexConfig, gridConfig, isFlex, isGrid]);

  const generatedCss = useMemo(() => {
    const rules: string[] = [];
    rules.push(`display: ${selected};`);
    if (!isFlex && !isGrid && selected !== 'none' && selected !== 'contents') {
      return `.element {\n  display: ${selected};\n}`;
    }
    if (isFlex) {
      rules.push(`flex-direction: ${flexConfig.direction};`);
      rules.push(`justify-content: ${flexConfig.justifyContent};`);
      rules.push(`align-items: ${flexConfig.alignItems};`);
      rules.push(`flex-wrap: ${flexConfig.wrap};`);
      rules.push(`gap: ${flexConfig.gap}px;`);
    }
    if (isGrid) {
      rules.push(`grid-template-columns: ${gridConfig.columns};`);
      rules.push(`grid-template-rows: ${gridConfig.rows};`);
      rules.push(`gap: ${gridConfig.gap}px;`);
    }
    return `.container {\n  ${rules.join('\n  ')}\n}`;
  }, [selected, flexConfig, gridConfig, isFlex, isGrid]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedCss);
    toast.success('CSS copied!');
  }, [generatedCss]);

  const handleReset = useCallback(() => {
    setFlexConfig({ direction: 'row', justifyContent: 'flex-start', alignItems: 'stretch', wrap: 'nowrap', gap: 8 });
    setGridConfig({ columns: 'repeat(3, 1fr)', rows: 'auto', gap: 8 });
    setSelected('block');
    setCategory('flow');
    toast.success('Reset to defaults');
  }, []);

  const demoItems = useMemo(() => {
    if (selected === 'list-item') return DEMO_ITEMS.slice(0, 4);
    if (isFlex || isGrid) return DEMO_ITEMS;
    return DEMO_ITEMS.slice(0, 3);
  }, [selected, isFlex, isGrid]);

  return (
    <ToolLayout
      title="CSS Display Playground"
      description="Explore every CSS display value with live visual previews. Understand block, inline, flex, grid, table, and more — see exactly how each one lays out elements."
      controls={
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button
            onClick={handleReset}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            {showHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showHidden ? 'Hide' : 'Show'} Borders
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Display Mode Selector */}
        <div className="lg:col-span-1 space-y-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            {DISPLAY_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  category === cat.key
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Display value cards */}
          <div className="space-y-2">
            {filteredModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setSelected(mode.value)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selected === mode.value
                    ? 'border-brand-400/60 bg-brand-500/10 ring-1 ring-brand-400/30'
                    : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-700/40 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{mode.icon}</span>
                  <code className={`text-sm font-mono font-semibold ${
                    selected === mode.value ? 'text-brand-300' : 'text-slate-200'
                  }`}>
                    {mode.label}
                  </code>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{mode.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Preview */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-400" />
                Live Preview
                <span className="text-xs text-slate-500 font-normal">
                  — {selectedMode.label} ({selectedMode.category})
                </span>
              </h3>
            </div>

            {/* Inline context for inline-* displays */}
            {(selected === 'inline' || selected === 'inline-block' || selected === 'inline-flex' || selected === 'inline-grid') && (
              <p className="text-xs text-slate-500 mb-3">
                Shown in inline context: <span className="text-slate-400">surrounding text</span> →
                the container <span className="text-slate-400">flows with text</span>.
              </p>
            )}

            {/* Preview area with inline context */}
            <div
              className={`rounded-lg p-3 bg-slate-950/60 border ${
                showHidden ? 'border-slate-600/60' : 'border-transparent'
              }`}
            >
              {(selected === 'inline' || selected === 'inline-block' || selected === 'inline-flex' || selected === 'inline-grid') && (
                <span className="text-slate-500 text-sm mr-1">Text before </span>
              )}

              {selected === 'list-item' && <span className="text-slate-500 text-sm mr-1">Text before</span>}

              {selected === 'none' ? (
                <div className="flex items-center gap-3">
                  <div
                    className="relative"
                    style={{
                      ...containerStyle,
                      display: 'none' as React.CSSProperties['display'],
                    }}
                  >
                    {demoItems.map((item, i) => (
                      <div key={i} className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold text-white ${DEMO_COLORS[i]}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                  <span className="text-slate-400 text-sm">← Element removed (display: none)</span>
                </div>
              ) : selected === 'contents' ? (
                <div
                  className="rounded-lg p-3 bg-slate-950/60"
                  style={{ border: showHidden ? '1px dashed rgba(148, 163, 184, 0.3)' : 'none' }}
                >
                  <div style={{ display: 'contents' as React.CSSProperties['display'] }}>
                    {demoItems.map((item, i) => (
                      <div key={i} className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold text-white ${DEMO_COLORS[i]}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    ↑ Children break out — parent wrapper is invisible to layout
                  </div>
                </div>
              ) : selected === 'table' ? (
                <div
                  style={{
                    display: 'table' as React.CSSProperties['display'],
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}
                >
                  <div style={{ display: 'table-row' as React.CSSProperties['display'] }}>
                    {['Name', 'Role', 'Score'].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'table-cell' as React.CSSProperties['display'],
                          padding: '8px 12px',
                          fontWeight: 600,
                          fontSize: '13px',
                          color: '#cbd5e1',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.3)',
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {demoItems.slice(0, 3).map((item, i) => (
                    <div key={i} style={{ display: 'table-row' as React.CSSProperties['display'] }}>
                      {[item, DEMO_COLORS[i].replace('bg-', '').replace('-500', ''), (i + 1) * 100].map((v, j) => (
                        <div
                          key={j}
                          style={{
                            display: 'table-cell' as React.CSSProperties['display'],
                            padding: '6px 12px',
                            fontSize: '13px',
                            color: '#94a3b8',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                          }}
                        >
                          {v}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={containerStyle}>
                  {demoItems.map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-md flex items-center justify-center text-sm font-bold text-white ${DEMO_COLORS[i]}`}
                      style={
                        selected === 'block'
                          ? { width: i === 0 ? '100%' : i === 1 ? '75%' : '50%', height: '36px', padding: '0 12px' }
                          : selected === 'inline' || selected === 'inline-block'
                          ? { display: 'inline-block', width: 'auto', height: '36px', padding: '0 12px', marginRight: '4px' }
                          : selected === 'flow-root'
                          ? { float: i === 0 ? 'left' : i === 1 ? 'right' : 'none' as any, width: i < 2 ? '80px' : '100%', height: '36px', padding: '0 12px' }
                          : selected === 'list-item'
                          ? { display: 'list-item' as React.CSSProperties['display'], listStylePosition: 'inside', height: '32px', padding: '0 12px' }
                          : { minWidth: '28px', minHeight: '28px', padding: '8px 12px' }
                      }
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {(selected === 'inline' || selected === 'inline-block' || selected === 'inline-flex' || selected === 'inline-grid') && (
                <span className="text-slate-500 text-sm ml-1"> text after</span>
              )}
            </div>
          </div>

          {/* Flex/Grid Controls */}
          {(isFlex || isGrid) && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                {isFlex ? <Columns className="w-4 h-4 text-brand-400" /> : <Grid3X3 className="w-4 h-4 text-brand-400" />}
                {isFlex ? 'Flexbox' : 'Grid'} Controls
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {isFlex && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Direction</label>
                      <select
                        value={flexConfig.direction}
                        onChange={(e) => setFlexConfig({ ...flexConfig, direction: e.target.value as FlexDirection })}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-slate-200"
                      >
                        {FLEX_DIRECTIONS.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Justify</label>
                      <select
                        value={flexConfig.justifyContent}
                        onChange={(e) => setFlexConfig({ ...flexConfig, justifyContent: e.target.value as JustifyContent })}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-slate-200"
                      >
                        {JUSTIFY_CONTENTS.map((j) => (
                          <option key={j.value} value={j.value}>{j.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Align</label>
                      <select
                        value={flexConfig.alignItems}
                        onChange={(e) => setFlexConfig({ ...flexConfig, alignItems: e.target.value as AlignItems })}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-slate-200"
                      >
                        {ALIGN_ITEMS.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Wrap</label>
                      <select
                        value={flexConfig.wrap}
                        onChange={(e) => setFlexConfig({ ...flexConfig, wrap: e.target.value as FlexWrap })}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-slate-200"
                      >
                        {FLEX_WRAPS.map((w) => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Gap: {flexConfig.gap}px</label>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        value={flexConfig.gap}
                        onChange={(e) => setFlexConfig({ ...flexConfig, gap: Number(e.target.value) })}
                        className="w-full accent-brand-500"
                      />
                    </div>
                  </>
                )}

                {isGrid && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Columns</label>
                      <select
                        value={gridConfig.columns}
                        onChange={(e) => setGridConfig({ ...gridConfig, columns: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-slate-200"
                      >
                        <option value="repeat(2, 1fr)">2 equal columns</option>
                        <option value="repeat(3, 1fr)">3 equal columns</option>
                        <option value="repeat(4, 1fr)">4 equal columns</option>
                        <option value="1fr 2fr">1fr + 2fr</option>
                        <option value="100px 1fr 100px">Sidebar layout</option>
                        <option value="repeat(auto-fill, minmax(80px, 1fr))">Auto-fill</option>
                        <option value="repeat(auto-fit, minmax(80px, 1fr))">Auto-fit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Rows</label>
                      <select
                        value={gridConfig.rows}
                        onChange={(e) => setGridConfig({ ...gridConfig, rows: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-slate-200"
                      >
                        <option value="auto">auto</option>
                        <option value="repeat(2, 1fr)">2 equal rows</option>
                        <option value="repeat(3, 1fr)">3 equal rows</option>
                        <option value="80px auto">Header + content</option>
                        <option value="auto 60px">Content + footer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Gap: {gridConfig.gap}px</label>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        value={gridConfig.gap}
                        onChange={(e) => setGridConfig({ ...gridConfig, gap: Number(e.target.value) })}
                        className="w-full accent-brand-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Generated CSS */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                Generated CSS
              </h3>
              <button
                onClick={handleCopy}
                className="text-xs text-slate-400 hover:text-brand-400 flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="bg-slate-950/80 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
              <code>{generatedCss}</code>
            </pre>
          </div>

          {/* Key behaviors */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Key Behaviors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <BehaviorCard
                label="Box Generation"
                value={
                  selected === 'none'
                    ? 'No box generated'
                    : selected === 'contents'
                    ? 'Box dissolved (children promoted)'
                    : selected.includes('inline')
                    ? 'Inline-level box'
                    : 'Block-level box'
                }
                good={selected !== 'none'}
              />
              <BehaviorCard
                label="New Line"
                value={
                  selected === 'none' || selected === 'contents'
                    ? 'N/A'
                    : selected.includes('inline') && !selected.includes('flex') && !selected.includes('grid')
                    ? 'Does NOT start new line'
                    : 'Starts on new line'
                }
                good={true}
              />
              <BehaviorCard
                label="Width/Height"
                value={
                  selected === 'none' || selected === 'contents'
                    ? 'N/A'
                    : selected === 'inline'
                    ? 'Ignored'
                    : 'Respected'
                }
                good={selected !== 'inline'}
              />
              <BehaviorCard
                label="Children Layout"
                value={
                  selected === 'none'
                    ? 'N/A'
                    : selected === 'contents'
                    ? 'Children flow into parent'
                    : isFlex
                    ? 'Flex items (1D)'
                    : isGrid
                    ? 'Grid items (2D)'
                    : selected === 'table'
                    ? 'Table formatting context'
                    : selected === 'flow-root'
                    ? 'New BFC (contains floats)'
                    : 'Normal flow'
                }
                good={true}
              />
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// ── Behavior Card ──────────────────────────────────────────────────────────

function BehaviorCard({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
      <div className="text-slate-500 mb-1">{label}</div>
      <div className={`font-medium text-sm ${good ? 'text-slate-200' : 'text-rose-400'}`}>{value}</div>
    </div>
  );
}
