'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Columns, Rows, GripHorizontal, Palette, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type LayoutType = 'grid' | 'flex';
type ColumnRuleStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'none';
type RowRuleStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'none';

interface GapConfig {
  layoutType: LayoutType;
  columns: number;
  gap: number;
  columnRuleStyle: ColumnRuleStyle;
  columnRuleWidth: number;
  columnRuleColor: string;
  rowRuleStyle: RowRuleStyle;
  rowRuleWidth: number;
  rowRuleColor: string;
  itemCount: number;
}

interface Preset {
  name: string;
  description: string;
  config: GapConfig;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Default Grid',
    description: 'Simple solid grid lines',
    config: { layoutType: 'grid', columns: 3, gap: 20, columnRuleStyle: 'solid', columnRuleWidth: 2, columnRuleColor: '#6366f1', rowRuleStyle: 'solid', rowRuleWidth: 2, rowRuleColor: '#6366f1', itemCount: 6 },
  },
  {
    name: 'Dashed Flex',
    description: 'Dashed dividers in flex layout',
    config: { layoutType: 'flex', columns: 3, gap: 16, columnRuleStyle: 'dashed', columnRuleWidth: 2, columnRuleColor: '#22d3ee', rowRuleStyle: 'none', rowRuleWidth: 0, rowRuleColor: '#22d3ee', itemCount: 5 },
  },
  {
    name: 'Dotted Mosaic',
    description: 'Dotted rules with warm colors',
    config: { layoutType: 'grid', columns: 3, gap: 24, columnRuleStyle: 'dotted', columnRuleWidth: 3, columnRuleColor: '#f59e0b', rowRuleStyle: 'dotted', rowRuleWidth: 3, rowRuleColor: '#f59e0b', itemCount: 9 },
  },
  {
    name: 'Double Divider',
    description: 'Double-line rules with contrast',
    config: { layoutType: 'grid', columns: 2, gap: 32, columnRuleStyle: 'double', columnRuleWidth: 6, columnRuleColor: '#ec4899', rowRuleStyle: 'double', rowRuleWidth: 6, rowRuleColor: '#ec4899', itemCount: 4 },
  },
  {
    name: 'Grid with Row-only',
    description: 'Horizontal rules only, clean columns',
    config: { layoutType: 'grid', columns: 4, gap: 24, columnRuleStyle: 'none', columnRuleWidth: 0, columnRuleColor: '#94a3b8', rowRuleStyle: 'solid', rowRuleWidth: 2, rowRuleColor: '#38bdf8', itemCount: 8 },
  },
  {
    name: 'Column-only Flex',
    description: 'Vertical dividers in a flex row',
    config: { layoutType: 'flex', columns: 0, gap: 20, columnRuleStyle: 'solid', columnRuleWidth: 2, columnRuleColor: '#a78bfa', rowRuleStyle: 'none', rowRuleWidth: 0, rowRuleColor: '#a78bfa', itemCount: 4 },
  },
];

const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'flex', label: 'Flexbox' },
];

const STYLE_OPTIONS: { value: ColumnRuleStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
  { value: 'groove', label: 'Groove' },
  { value: 'ridge', label: 'Ridge' },
  { value: 'none', label: 'None' },
];

const CARD_COLORS = [
  'linear-gradient(135deg, #6366f1, #818cf8)',
  'linear-gradient(135deg, #06b6d4, #22d3ee)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #ef4444, #f87171)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  'linear-gradient(135deg, #14b8a6, #2dd4bf)',
  'linear-gradient(135deg, #f97316, #fb923c)',
  'linear-gradient(135deg, #3b82f6, #60a5fa)',
  'linear-gradient(135deg, #84cc16, #a3e635)',
  'linear-gradient(135deg, #a855f7, #c084fc)',
];

// ── CSS Generation ─────────────────────────────────────────────────────────

function generateGapCSS(config: GapConfig): string {
  const lines: string[] = [];
  lines.push('.gap-container {');
  lines.push(`  display: ${config.layoutType};`);
  if (config.layoutType === 'grid') {
    lines.push(`  grid-template-columns: repeat(${config.columns}, 1fr);`);
  } else {
    lines.push(`  flex-wrap: wrap;`);
  }
  lines.push(`  gap: ${config.gap}px;`);

  if (config.columnRuleStyle !== 'none') {
    lines.push(`  column-rule: ${config.columnRuleWidth}px ${config.columnRuleStyle} ${config.columnRuleColor};`);
  }
  if (config.rowRuleStyle !== 'none') {
    lines.push(`  row-rule: ${config.rowRuleWidth}px ${config.rowRuleStyle} ${config.rowRuleColor};`);
  }
  lines.push('}');
  lines.push('');
  lines.push('.gap-item {');
  lines.push('  /* Your item styles here */');
  lines.push('}');
  lines.push('');
  lines.push('/* Chrome 149+ (June 2026), Firefox TBD, Safari TBD */');
  lines.push('/* CSS Gap Decorations Module — style gaps like column-rule in multi-col! */');

  return lines.join('\n');
}

// ── Support Detection ──────────────────────────────────────────────────────

function detectSupport(): { columnRule: boolean; rowRule: boolean } {
  if (typeof CSS === 'undefined') return { columnRule: false, rowRule: false };
  return {
    columnRule: CSS.supports('column-rule', '1px solid red'),
    rowRule: CSS.supports('row-rule', '1px solid red'),
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssGapDecorationsPlaygroundPage() {
  const [config, setConfig] = useState<GapConfig>(PRESETS[0].config);
  const [activePreset, setActivePreset] = useState(0);

  const support = useMemo(() => detectSupport(), []);

  const generatedCSS = useMemo(() => generateGapCSS(config), [config]);

  const applyPreset = useCallback((index: number) => {
    setActivePreset(index);
    setConfig(PRESETS[index].config);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS).then(() => {
      toast.success('CSS copied!');
    }).catch(() => toast.error('Failed to copy'));
  }, [generatedCSS]);

  const reset = useCallback(() => {
    applyPreset(0);
  }, [applyPreset]);

  const update = useCallback(<K extends keyof GapConfig>(key: K, value: GapConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setActivePreset(-1);
  }, []);

  // Build inline styles for the preview
  const previewStyle: React.CSSProperties = {
    display: config.layoutType,
    gap: `${config.gap}px`,
    ...(config.layoutType === 'grid' ? { gridTemplateColumns: `repeat(${config.columns}, 1fr)` } : { flexWrap: 'wrap' }),
    // Apply column-rule and row-rule via style property (for browsers that support it)
    ...(config.columnRuleStyle !== 'none' ? { columnRule: `${config.columnRuleWidth}px ${config.columnRuleStyle} ${config.columnRuleColor}` } : {}),
    ...(config.rowRuleStyle !== 'none' ? { rowRule: `${config.rowRuleWidth}px ${config.rowRuleStyle} ${config.rowRuleColor}` } : {}),
  } as React.CSSProperties;

  return (
    <ToolLayout
      title="CSS Gap Decorations Playground"
      description="Style the gaps in grid and flex layouts with column-rule and row-rule — brand new in Chrome 149 (June 2026)! No more extra DOM elements or pseudo-element hacks."
    >
      {/* Support Banner */}
      {(!support.columnRule || !support.rowRule) && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-amber-400 text-sm font-medium mb-1">Limited Browser Support</p>
          <p className="text-slate-400 text-xs">
            {!support.columnRule && !support.rowRule
              ? 'column-rule and row-rule are not yet supported in this browser. The preview shows the fallback layout. Try Chrome 149+.'
              : !support.columnRule
                ? 'column-rule is not supported. row-rule is available. Try Chrome 149+.'
                : 'row-rule is not supported. column-rule is available. Try Chrome 149+.'}
          </p>
        </div>
      )}

      {/* Presets */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.name}
              onClick={() => applyPreset(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePreset === i
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-5 bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Layout Type</label>
            <div className="flex gap-1 bg-slate-900 rounded-lg p-1">
              {LAYOUT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => update('layoutType', o.value)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    config.layoutType === o.value
                      ? 'bg-indigo-500/30 text-indigo-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {config.layoutType === 'grid' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Columns: {config.columns}
              </label>
              <input
                type="range"
                min={1}
                max={6}
                value={config.columns}
                onChange={e => update('columns', Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Gap: {config.gap}px
            </label>
            <input
              type="range"
              min={4}
              max={64}
              value={config.gap}
              onChange={e => update('gap', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Items: {config.itemCount}
            </label>
            <input
              type="range"
              min={1}
              max={12}
              value={config.itemCount}
              onChange={e => update('itemCount', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Column Rule */}
          <div className="pt-3 border-t border-slate-700/50">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Columns size={14} /> Column Rule
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Style</label>
                <select
                  value={config.columnRuleStyle}
                  onChange={e => update('columnRuleStyle', e.target.value as ColumnRuleStyle)}
                  className="w-full bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 px-3 py-2"
                >
                  {STYLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {config.columnRuleStyle !== 'none' && (
                <>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Width: {config.columnRuleWidth}px</label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={config.columnRuleWidth}
                      onChange={e => update('columnRuleWidth', Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={config.columnRuleColor}
                        onChange={e => update('columnRuleColor', e.target.value)}
                        className="w-8 h-8 rounded-md border border-slate-600 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={config.columnRuleColor}
                        onChange={e => update('columnRuleColor', e.target.value)}
                        className="flex-1 bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 px-3 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row Rule */}
          <div className="pt-3 border-t border-slate-700/50">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Rows size={14} /> Row Rule
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Style</label>
                <select
                  value={config.rowRuleStyle}
                  onChange={e => update('rowRuleStyle', e.target.value as RowRuleStyle)}
                  className="w-full bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 px-3 py-2"
                >
                  {STYLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {config.rowRuleStyle !== 'none' && (
                <>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Width: {config.rowRuleWidth}px</label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={config.rowRuleWidth}
                      onChange={e => update('rowRuleWidth', Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={config.rowRuleColor}
                        onChange={e => update('rowRuleColor', e.target.value)}
                        className="w-8 h-8 rounded-md border border-slate-600 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={config.rowRuleColor}
                        onChange={e => update('rowRuleColor', e.target.value)}
                        className="flex-1 bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 px-3 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 rounded-lg border border-slate-700 hover:border-slate-600 hover:text-slate-300 transition-all text-xs font-medium"
          >
            <RotateCcw size={14} /> Reset to Default
          </button>
        </div>

        {/* Preview + CSS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Preview */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</p>
              <span className="text-[10px] text-slate-500">
                {config.layoutType === 'grid' ? `Grid ${config.columns}x${Math.ceil(config.itemCount / config.columns)}` : `Flex wrap`}
              </span>
            </div>
            <div
              className="rounded-lg overflow-hidden border border-slate-700/30 min-h-[180px]"
              style={{
                ...(config.layoutType === 'grid' ? previewStyle : {
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: `${config.gap}px`,
                }),
                // Apply column-rule and row-rule directly
                ...(config.columnRuleStyle !== 'none' ? { columnRule: `${config.columnRuleWidth}px ${config.columnRuleStyle} ${config.columnRuleColor}` } : {}),
                ...(config.rowRuleStyle !== 'none' ? { rowRule: `${config.rowRuleWidth}px ${config.rowRuleStyle} ${config.rowRuleColor}` } : {}),
              } as React.CSSProperties}
            >
              {Array.from({ length: config.itemCount }, (_, i) => (
                <div
                  key={i}
                  style={{
                    ...(config.layoutType === 'grid'
                      ? {}
                      : { flex: `0 0 calc(${100 / (config.columns || 2)}% - ${config.gap}px + ${config.gap / (config.columns || 2)}px)`, minWidth: '80px' }
                    ),
                    background: CARD_COLORS[i % CARD_COLORS.length],
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 12px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    minHeight: '60px',
                  }}
                >
                  Item {i + 1}
                </div>
              ))}
            </div>
            {(!support.columnRule && !support.rowRule) && (
              <p className="text-[10px] text-amber-500/70 mt-2 italic">
                Rules may not render in this browser. The layout still shows correctly.
              </p>
            )}
          </div>

          {/* Generated CSS */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Generated CSS</p>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/30 transition-all text-xs font-medium"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {generatedCSS}
            </pre>
          </div>

          {/* Info box */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-400 font-semibold mb-1">What are CSS Gap Decorations?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              CSS Gap Decorations let you style the gaps between items in grid and flexbox layouts using <code className="text-blue-400 bg-blue-500/10 px-1 rounded">column-rule</code> and <code className="text-blue-400 bg-blue-500/10 px-1 rounded">row-rule</code> — 
              just like <code className="text-blue-400 bg-blue-500/10 px-1 rounded">column-rule</code> in multi-column layout. Draw lines, dashes, dots, or double-lines 
              between grid tracks and flex items without adding extra DOM elements. 
              Shipped in <strong>Chrome 149</strong> (June 2, 2026).
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
