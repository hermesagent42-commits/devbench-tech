'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, Keyboard, Monitor, ArrowDown, ArrowRight, Grid3X3, Columns } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type LayoutType = 'flex' | 'grid';
type ReadingFlowValue = 'normal' | 'flex-visual' | 'flex-flow' | 'grid-rows' | 'grid-columns' | 'grid-order';
type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';

interface ReadingFlowConfig {
  layoutType: LayoutType;
  readingFlow: ReadingFlowValue;
  flexDirection: FlexDirection;
  flexWrap: boolean;
  gridColumns: number;
  itemCount: number;
  showTabOrder: boolean;
}

interface Preset {
  name: string;
  description: string;
  config: ReadingFlowConfig;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Grid Rows',
    description: 'Grid layout, tab flows by rows (default)',
    config: { layoutType: 'grid', readingFlow: 'normal', flexDirection: 'row', flexWrap: true, gridColumns: 3, itemCount: 9, showTabOrder: true },
  },
  {
    name: 'Grid Columns',
    description: 'Grid with reading-flow: grid-columns — tabs flow down each column first',
    config: { layoutType: 'grid', readingFlow: 'grid-columns', flexDirection: 'row', flexWrap: true, gridColumns: 3, itemCount: 9, showTabOrder: true },
  },
  {
    name: 'Flex Visual',
    description: 'Flex row with reading-flow: flex-visual — tabs follow visual left-to-right',
    config: { layoutType: 'flex', readingFlow: 'normal', flexDirection: 'row', flexWrap: true, gridColumns: 3, itemCount: 6, showTabOrder: true },
  },
  {
    name: 'Flex Row-Reverse',
    description: 'Flex row-reverse — compare visual vs tab order with reading-flow',
    config: { layoutType: 'flex', readingFlow: 'flex-visual', flexDirection: 'row-reverse', flexWrap: true, gridColumns: 3, itemCount: 6, showTabOrder: true },
  },
  {
    name: 'Flex Column Visual',
    description: 'Flex column, tabs follow visual top-to-bottom order',
    config: { layoutType: 'flex', readingFlow: 'flex-visual', flexDirection: 'column', flexWrap: false, gridColumns: 1, itemCount: 5, showTabOrder: true },
  },
  {
    name: 'Grid Order (CSS)',
    description: 'Grid with reading-flow: grid-order — honors CSS order property',
    config: { layoutType: 'grid', readingFlow: 'grid-order', flexDirection: 'row', flexWrap: true, gridColumns: 3, itemCount: 6, showTabOrder: true },
  },
];

const READING_FLOW_OPTIONS: { value: ReadingFlowValue; label: string; description: string }[] = [
  { value: 'normal', label: 'normal', description: 'Browser default reading order (DOM order)' },
  { value: 'flex-visual', label: 'flex-visual', description: 'Follow visual order in flex layout' },
  { value: 'flex-flow', label: 'flex-flow', description: 'Follow flex-flow direction' },
  { value: 'grid-rows', label: 'grid-rows', description: 'Tab through grid by rows (left-to-right, top-to-bottom)' },
  { value: 'grid-columns', label: 'grid-columns', description: 'Tab through grid by columns (top-to-bottom, left-to-right)' },
  { value: 'grid-order', label: 'grid-order', description: 'Honor CSS order property for tab sequence' },
];

const FLEX_DIRECTION_OPTIONS: { value: FlexDirection; label: string }[] = [
  { value: 'row', label: 'row' },
  { value: 'row-reverse', label: 'row-reverse' },
  { value: 'column', label: 'column' },
  { value: 'column-reverse', label: 'column-reverse' },
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

function generateReadingFlowCSS(config: ReadingFlowConfig): string {
  const lines: string[] = [];
  lines.push('.reading-container {');
  lines.push(`  display: ${config.layoutType};`);
  if (config.layoutType === 'flex') {
    lines.push(`  flex-direction: ${config.flexDirection};`);
    lines.push(`  flex-wrap: ${config.flexWrap ? 'wrap' : 'nowrap'};`);
  } else {
    lines.push(`  grid-template-columns: repeat(${config.gridColumns}, 1fr);`);
  }
  lines.push(`  gap: 12px;`);
  lines.push(`  reading-flow: ${config.readingFlow};`);
  lines.push('}');
  lines.push('');
  lines.push('.reading-item {');
  lines.push('  /* Your item styles */');
  lines.push('}');
  lines.push('');
  lines.push('/* Chrome 149+ (June 2026), Firefox TBD, Safari TBD */');
  lines.push('/* CSS Display Level 4: reading-flow controls tab and screen reader order */');
  lines.push('/* Use with reading-order for per-item overrides */');

  return lines.join('\n');
}

// ── Compute tab order ──────────────────────────────────────────────────────

function computeTabOrder(config: ReadingFlowConfig): number[] {
  const indices = Array.from({ length: config.itemCount }, (_, i) => i + 1);
  const n = config.itemCount;

  if (config.layoutType === 'grid') {
    if (config.readingFlow === 'grid-columns' || config.readingFlow === 'normal') {
      // Default for many browsers is grid-rows. But for educational purpose:
      if (config.readingFlow === 'grid-columns') {
        // Column-major: go down each column first
        const cols = config.gridColumns;
        const rows = Math.ceil(n / cols);
        const result: number[] = [];
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const idx = r * cols + c;
            if (idx < n) result.push(idx + 1);
          }
        }
        return result;
      }
      // grid-rows / normal: row-major (DOM order)
      return indices;
    }
    if (config.readingFlow === 'grid-order') {
      // Simulate CSS order: items placed in a scrambled order
      // Use a deterministic shuffle based on item count for demo
      const shuffled = [...indices];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = ((i * 7 + 3) % (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    // grid-rows
    return indices;
  }

  // Flex layout
  if (config.flexDirection === 'row-reverse') {
    // Visual: right-to-left, items reversed
    const reversed = [...indices].reverse();
    if (config.readingFlow === 'flex-visual') {
      return reversed; // follow visual
    }
    return indices; // normal: DOM order (left-to-right)
  }
  if (config.flexDirection === 'column-reverse') {
    // Visual: bottom-to-top
    const reversed = [...indices].reverse();
    if (config.readingFlow === 'flex-visual') {
      return reversed; // follow visual
    }
    return indices; // normal: DOM order
  }
  if (config.flexDirection === 'column') {
    // Visual: top-to-bottom
    return indices;
  }
  // row: left-to-right visual = DOM order
  return indices;
}

// ── Support Detection ──────────────────────────────────────────────────────

function detectSupport(): boolean {
  if (typeof CSS === 'undefined') return false;
  return CSS.supports('reading-flow', 'flex-visual');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssReadingFlowPlaygroundPage() {
  const [config, setConfig] = useState<ReadingFlowConfig>(PRESETS[0].config);
  const [activePreset, setActivePreset] = useState(0);

  const hasSupport = useMemo(() => detectSupport(), []);
  const generatedCSS = useMemo(() => generateReadingFlowCSS(config), [config]);
  const tabOrder = useMemo(() => computeTabOrder(config), [config]);

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

  const update = useCallback(<K extends keyof ReadingFlowConfig>(key: K, value: ReadingFlowConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setActivePreset(-1);
  }, []);

  // Build preview style
  const previewContainerStyle: React.CSSProperties = {
    display: config.layoutType,
    gap: '12px',
    ...(config.layoutType === 'flex'
      ? { flexDirection: config.flexDirection as React.CSSProperties['flexDirection'], flexWrap: config.flexWrap ? 'wrap' : 'nowrap' }
      : { gridTemplateColumns: `repeat(${config.gridColumns}, minmax(0, 1fr))` }
    ),
  };

  return (
    <ToolLayout
      title="CSS Reading Flow Playground"
      description="Control the tab and screen reader navigation order of flex and grid layouts with the reading-flow CSS property (CSS Display Level 4). Design for accessibility without touching DOM order."
    >
      {/* Support Banner */}
      {!hasSupport && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-amber-400 text-sm font-medium mb-1">Limited Browser Support</p>
          <p className="text-slate-400 text-xs">
            reading-flow is not yet supported in this browser. The preview shows the layout but tab-order simulation 
            is educational only. Try Chrome 149+ for native support.
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
              {(['flex', 'grid'] as LayoutType[]).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    update('layoutType', t);
                    update('readingFlow', t === 'grid' ? 'normal' : 'flex-visual');
                  }}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    config.layoutType === t
                      ? 'bg-indigo-500/30 text-indigo-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'grid' ? 'Grid' : 'Flexbox'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">reading-flow</label>
            <select
              value={config.readingFlow}
              onChange={e => update('readingFlow', e.target.value as ReadingFlowValue)}
              className="w-full bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 px-3 py-2"
            >
              {READING_FLOW_OPTIONS.filter(o => {
                if (config.layoutType === 'grid') return o.value.startsWith('grid') || o.value === 'normal';
                return o.value.startsWith('flex') || o.value === 'normal';
              }).map(o => (
                <option key={o.value} value={o.value}>{o.label} &mdash; {o.description.toLowerCase()}</option>
              ))}
              {READING_FLOW_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {READING_FLOW_OPTIONS.find(o => o.value === config.readingFlow)?.description}
            </p>
          </div>

          {config.layoutType === 'flex' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">flex-direction</label>
                <select
                  value={config.flexDirection}
                  onChange={e => update('flexDirection', e.target.value as FlexDirection)}
                  className="w-full bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700 px-3 py-2"
                >
                  {FLEX_DIRECTION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.flexWrap}
                    onChange={e => update('flexWrap', e.target.checked)}
                    className="accent-indigo-500"
                  />
                  flex-wrap: wrap
                </label>
              </div>
            </>
          )}

          {config.layoutType === 'grid' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Grid Columns: {config.gridColumns}
              </label>
              <input
                type="range"
                min={2}
                max={5}
                value={config.gridColumns}
                onChange={e => update('gridColumns', Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Items: {config.itemCount}
            </label>
            <input
              type="range"
              min={3}
              max={12}
              value={config.itemCount}
              onChange={e => update('itemCount', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showTabOrder}
                onChange={e => update('showTabOrder', e.target.checked)}
                className="accent-indigo-500"
              />
              Show simulated tab order
            </label>
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
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Layout</p>
                {config.showTabOrder && (
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Keyboard size={10} /> Tab Order: {tabOrder.join(' → ')}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                {config.layoutType === 'grid'
                  ? `CSS Grid ${config.gridColumns} columns`
                  : `Flex ${config.flexDirection}${config.flexWrap ? ' wrap' : ''}`}
              </span>
            </div>

            <div
              className="rounded-lg overflow-hidden border border-slate-700/30 min-h-[200px] p-4 bg-slate-950/50"
              style={previewContainerStyle}
            >
              {Array.from({ length: config.itemCount }, (_, i) => {
                const tabIdx = tabOrder.indexOf(i + 1) + 1;
                const orderValue = config.layoutType === 'grid' && config.readingFlow === 'grid-order'
                  ? tabOrder[i]
                  : undefined;

                return (
                  <div
                    key={i}
                    style={{
                      ...(config.layoutType === 'flex' && !config.flexWrap
                        ? {}
                        : config.layoutType === 'flex'
                          ? { flex: '0 0 calc(33.333% - 8px)', minWidth: '80px' }
                          : {}
                      ),
                      ...(orderValue !== undefined ? { order: orderValue } : {}),
                      background: CARD_COLORS[i % CARD_COLORS.length],
                      borderRadius: '8px',
                      padding: '20px 12px',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '13px',
                      minHeight: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      outline: 'none',
                    }}
                    tabIndex={config.showTabOrder ? tabIdx : undefined}
                  >
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>Item {i + 1}</span>
                    {config.showTabOrder && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {tabIdx}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Keyboard size={10} /> Numbers = Tab order
              </span>
              <span className="flex items-center gap-1">
                <Eye size={10} /> DOM order: {Array.from({ length: config.itemCount }, (_, i) => i + 1).join(', ')}
              </span>
            </div>
            {!hasSupport && (
              <p className="text-[10px] text-amber-500/70 mt-2 italic">
                reading-flow simulation is approximate. Native support provides true keyboard/screen-reader ordering.
              </p>
            )}
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">DOM Order (Source)</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: config.itemCount }, (_, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded text-[10px] font-mono font-bold"
                    style={{ background: CARD_COLORS[i % CARD_COLORS.length], color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tab / Reading Order</p>
              <div className="flex flex-wrap gap-1.5">
                {tabOrder.map((n, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1"
                    style={{ background: CARD_COLORS[(n - 1) % CARD_COLORS.length], color: '#fff' }}
                  >
                    {n}
                    <span className="opacity-60 text-[8px]">→</span>
                  </span>
                ))}
              </div>
            </div>
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
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-400 font-semibold mb-1">Why reading-flow matters</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Without <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded">reading-flow</code>, keyboard tab and screen reader navigation 
              always follow DOM source order — even when CSS visually rearranges items. This means a flex row-reverse 
              layout would have users tabbing left-to-right while the visual order is right-to-left. 
              <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded">reading-flow</code> lets you align the 
              accessibility tree with the visual layout without changing your HTML. Part of CSS Display Level 4.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
