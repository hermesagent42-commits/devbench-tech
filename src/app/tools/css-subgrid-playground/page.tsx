'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Grid3X3, GripHorizontal, AlignStartVertical, AlignCenterVertical, AlignEndVertical } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type SubgridAxis = 'none' | 'columns' | 'rows' | 'both';
type ColumnAlign = 'start' | 'center' | 'end' | 'stretch';
type RowAlign = 'start' | 'center' | 'end' | 'stretch';

interface SubgridConfig {
  parentColumns: number;
  parentRows: number;
  parentGap: number;
  subgridAxis: SubgridAxis;
  nestedChildCount: number;
  columnAlign: ColumnAlign;
  rowAlign: RowAlign;
  showTracks: boolean;
}

interface Preset {
  name: string;
  description: string;
  config: SubgridConfig;
}

// ── Constants ──────────────────────────────────────────────────────────────

const AXIS_OPTIONS: { value: SubgridAxis; label: string; description: string }[] = [
  { value: 'none', label: 'No Subgrid', description: 'Nested items manage their own tracks' },
  { value: 'columns', label: 'Column Subgrid', description: 'Nested columns align with parent columns' },
  { value: 'rows', label: 'Row Subgrid', description: 'Nested rows align with parent rows' },
  { value: 'both', label: 'Both Axes', description: 'Full alignment on both axes' },
];

const ALIGN_OPTIONS: { value: ColumnAlign; label: string }[] = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
];

const PARENT_CARD_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
];

const NESTED_CARD_COLORS = [
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #60a5fa, #2563eb)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #fbbf24, #b45309)',
];

const PRESETS: Preset[] = [
  {
    name: 'Card Grid (Cols)',
    description: 'Cards with matching column widths',
    config: { parentColumns: 3, parentRows: 1, parentGap: 16, subgridAxis: 'columns', nestedChildCount: 2, columnAlign: 'stretch', rowAlign: 'start', showTracks: true },
  },
  {
    name: 'Dashboard Layout',
    description: 'Multi-row dashboard with aligned widgets',
    config: { parentColumns: 4, parentRows: 2, parentGap: 12, subgridAxis: 'both', nestedChildCount: 3, columnAlign: 'stretch', rowAlign: 'stretch', showTracks: true },
  },
  {
    name: 'Blog Cards (Rows)',
    description: 'Cards where nested rows stay in sync',
    config: { parentColumns: 2, parentRows: 1, parentGap: 20, subgridAxis: 'rows', nestedChildCount: 3, columnAlign: 'stretch', rowAlign: 'start', showTracks: true },
  },
  {
    name: 'Photo Gallery',
    description: 'Image gallery with consistent gutters',
    config: { parentColumns: 4, parentRows: 1, parentGap: 8, subgridAxis: 'columns', nestedChildCount: 2, columnAlign: 'stretch', rowAlign: 'center', showTracks: false },
  },
  {
    name: 'Form Grid',
    description: 'Form fields aligned in a grid with labels',
    config: { parentColumns: 3, parentRows: 2, parentGap: 12, subgridAxis: 'both', nestedChildCount: 2, columnAlign: 'start', rowAlign: 'start', showTracks: true },
  },
  {
    name: 'Pricing Table',
    description: 'Pricing cards with feature rows aligned',
    config: { parentColumns: 3, parentRows: 1, parentGap: 16, subgridAxis: 'rows', nestedChildCount: 4, columnAlign: 'stretch', rowAlign: 'start', showTracks: true },
  },
];

const SUBGRID_TIPS = [
  'Subgrid inherits the parent grid\'s track sizes — no need to redefine columns/rows for nested items.',
  'Use grid-template-columns: subgrid to align nested item columns with the parent grid.',
  'Use grid-template-rows: subgrid to make nested rows match the parent\'s row sizes.',
  'Combine subgrid on both axes for perfect alignment of deeply nested content.',
  'The gap value is inherited from the parent grid when using subgrid — you can override it with a new gap on the child.',
  'Subgrid works with auto-fill/auto-fit on the parent — nested items will match the implicit tracks.',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function generateCSS(config: SubgridConfig): string {
  const lines: string[] = [];

  lines.push('/* Parent Grid Container */');
  lines.push('.parent-grid {');
  lines.push(`  display: grid;`);
  lines.push(`  grid-template-columns: repeat(${config.parentColumns}, 1fr);`);
  if (config.parentRows > 1) {
    lines.push(`  grid-template-rows: repeat(${config.parentRows}, auto);`);
  }
  lines.push(`  gap: ${config.parentGap}px;`);
  lines.push('}');
  lines.push('');

  lines.push('/* Nested Subgrid Item */');
  lines.push('.nested-subgrid {');
  lines.push('  display: grid;');

  if (config.subgridAxis === 'columns' || config.subgridAxis === 'both') {
    lines.push('  grid-template-columns: subgrid;');
  } else {
    lines.push(`  grid-template-columns: repeat(${config.nestedChildCount}, 1fr);`);
  }

  if (config.subgridAxis === 'rows' || config.subgridAxis === 'both') {
    lines.push('  grid-template-rows: subgrid;');
  }

  if (config.subgridAxis === 'both') {
    lines.push(`  /* Nested items span 1 column each;`);
    lines.push(`     rows align with parent's row grid */`);
  } else if (config.subgridAxis === 'columns') {
    lines.push(`  grid-template-rows: auto;`);
    lines.push(`  /* Column tracks match the parent grid */`);
  } else if (config.subgridAxis === 'rows') {
    lines.push(`  grid-template-columns: repeat(${config.nestedChildCount}, 1fr);`);
    lines.push(`  /* Row tracks match the parent grid */`);
  }

  if (config.subgridAxis === 'columns' || config.subgridAxis === 'both') {
    lines.push(`  /* Nested items align to parent column tracks */`);
  }
  if (config.subgridAxis === 'rows' || config.subgridAxis === 'both') {
    lines.push(`  /* Nested items align to parent row tracks */`);
  }

  lines.push('}');

  return lines.join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CSSSubgridPlayground() {
  const [config, setConfig] = useState<SubgridConfig>(PRESETS[0].config);
  const [activePreset, setActivePreset] = useState<string>(PRESETS[0].name);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const handlePreset = useCallback((preset: Preset) => {
    setActivePreset(preset.name);
    setConfig({ ...preset.config });
  }, []);

  const handleReset = useCallback(() => {
    setActivePreset(PRESETS[0].name);
    setConfig({ ...PRESETS[0].config });
  }, []);

  const updateConfig = useCallback(<K extends keyof SubgridConfig>(key: K, value: SubgridConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const cssOutput = useMemo(() => generateCSS(config), [config]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(cssOutput);
    toast.success('CSS copied to clipboard!');
  }, [cssOutput]);

  const parentGridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${config.parentColumns}, 1fr)`,
    gridTemplateRows: config.parentRows > 1 ? `repeat(${config.parentRows}, auto)` : 'auto',
    gap: `${config.parentGap}px`,
  }), [config.parentColumns, config.parentRows, config.parentGap]);

  const nestedGridStyle = useMemo(() => {
    const style: React.CSSProperties = {
      display: 'grid',
      gap: `${config.parentGap}px`,
    };

    if (config.subgridAxis === 'columns' || config.subgridAxis === 'both') {
      style.gridTemplateColumns = 'subgrid';
    } else {
      style.gridTemplateColumns = `repeat(${config.nestedChildCount}, 1fr)`;
    }

    if (config.subgridAxis === 'rows' || config.subgridAxis === 'both') {
      style.gridTemplateRows = 'subgrid';
    }

    return style;
  }, [config.subgridAxis, config.nestedChildCount, config.parentGap]);

  const nestedChildStyle = useMemo(() => ({
    display: 'flex',
    alignItems: config.rowAlign === 'center' ? 'center' : config.rowAlign === 'end' ? 'flex-end' : 'flex-start',
    justifyContent: config.columnAlign === 'center' ? 'center' : config.columnAlign === 'end' ? 'flex-end' : 'flex-start',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#cbd5e1',
    minHeight: '36px',
    wordBreak: 'break-all' as const,
  }), [config.columnAlign, config.rowAlign]);

  const totalParentCells = config.parentColumns * Math.max(1, config.parentRows);
  const parentCellColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i < totalParentCells; i++) {
      colors.push(PARENT_CARD_COLORS[i % PARENT_CARD_COLORS.length]);
    }
    return colors;
  }, [totalParentCells]);

  const tipIndex = useMemo(() => {
    let idx = 0;
    if (config.subgridAxis === 'columns') idx = 1;
    else if (config.subgridAxis === 'rows') idx = 2;
    else if (config.subgridAxis === 'both') idx = 3;
    return idx;
  }, [config.subgridAxis]);

  return (
    <ToolLayout
      title="CSS Subgrid Playground"
      description="Visually build and test CSS subgrid layouts — align nested grid items to parent tracks. Live preview, 6 presets, instant CSS copy."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Controls Panel ────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    activePreset === preset.name
                      ? 'bg-brand-500/20 border border-brand-400/40 text-brand-300'
                      : 'bg-slate-800 border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  <div className="font-medium truncate">{preset.name}</div>
                  <div className="text-[10px] opacity-60 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Parent Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Parent Grid
            </label>
            <div className="space-y-3">
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Columns</span>
                  <span className="font-mono text-brand-400">{config.parentColumns}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={config.parentColumns}
                  onChange={(e) => updateConfig('parentColumns', parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Rows</span>
                  <span className="font-mono text-brand-400">{config.parentRows}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={config.parentRows}
                  onChange={(e) => updateConfig('parentRows', parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Gap</span>
                  <span className="font-mono text-brand-400">{config.parentGap}px</span>
                </label>
                <input
                  type="range"
                  min={4}
                  max={48}
                  step={4}
                  value={config.parentGap}
                  onChange={(e) => updateConfig('parentGap', parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Subgrid Axis */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Subgrid Axis
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {AXIS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfig('subgridAxis', opt.value)}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    config.subgridAxis === opt.value
                      ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                      : 'bg-slate-800 border border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
                  }`}
                  title={opt.description}
                >
                  <div className="font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nested Children (only when not using column subgrid) */}
          {(config.subgridAxis !== 'columns' && config.subgridAxis !== 'both') && (
            <div>
              <label className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Nested Children</span>
                <span className="font-mono text-brand-400">{config.nestedChildCount}</span>
              </label>
              <input
                type="range"
                min={1}
                max={6}
                value={config.nestedChildCount}
                onChange={(e) => updateConfig('nestedChildCount', parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          )}

          {/* Alignment */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Nested Item Alignment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Column</label>
                <select
                  value={config.columnAlign}
                  onChange={(e) => updateConfig('columnAlign', e.target.value as ColumnAlign)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300"
                >
                  {ALIGN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Row</label>
                <select
                  value={config.rowAlign}
                  onChange={(e) => updateConfig('rowAlign', e.target.value as RowAlign)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300"
                >
                  {ALIGN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Track visibility toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showTracks}
                onChange={(e) => updateConfig('showTracks', e.target.checked)}
                className="rounded accent-brand-500"
              />
              <span className="text-xs text-slate-400">Show grid track lines</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* ── Preview + CSS ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-brand-400" />
                Live Preview
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Parent: {config.parentColumns}×{config.parentRows} | Subgrid: {AXIS_OPTIONS.find(a => a.value === config.subgridAxis)?.label}
              </span>
            </div>

            <div
              className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-6 overflow-x-auto"
              style={{ minHeight: '200px' }}
            >
              <div style={parentGridStyle}>
                {Array.from({ length: totalParentCells }).map((_, parentIdx) => {
                  const colSpan = config.subgridAxis === 'columns' || config.subgridAxis === 'both'
                    ? config.nestedChildCount
                    : 1;
                  const isNested = parentIdx < Math.max(1, config.parentRows) &&
                    (parentIdx % config.parentColumns) === 0;
                  const gridColumn = config.subgridAxis === 'columns' || config.subgridAxis === 'both'
                    ? `span ${colSpan}`
                    : undefined;

                  return (
                    <div
                      key={parentIdx}
                      style={{
                        background: isNested ? 'transparent' : parentCellColors[parentIdx],
                        borderRadius: '10px',
                        padding: isNested ? '0' : '16px',
                        color: isNested ? undefined : '#fff',
                        fontSize: isNested ? undefined : '12px',
                        fontWeight: isNested ? undefined : 600,
                        display: 'flex',
                        alignItems: isNested ? undefined : 'center',
                        justifyContent: isNested ? undefined : 'center',
                        minHeight: isNested ? undefined : '60px',
                        gridColumn,
                        border: config.showTracks ? '1px dashed rgba(99,102,241,0.3)' : 'none',
                      }}
                    >
                      {isNested ? (
                        <div
                          style={{
                            ...nestedGridStyle,
                            padding: '8px',
                            borderRadius: '10px',
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.25)',
                            position: 'relative',
                          }}
                          onMouseEnter={() => setHoveredCell(`nested-${parentIdx}`)}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {config.subgridAxis !== 'rows' && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '4px',
                                fontSize: '9px',
                                fontFamily: 'monospace',
                                color: '#818cf8',
                                background: 'rgba(99,102,241,0.15)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              grid-template-columns: subgrid
                            </div>
                          )}
                          {config.subgridAxis === 'rows' && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '4px',
                                fontSize: '9px',
                                fontFamily: 'monospace',
                                color: '#34d399',
                                background: 'rgba(52,211,153,0.15)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              grid-template-rows: subgrid
                            </div>
                          )}
                          {config.subgridAxis === 'both' && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '4px',
                                fontSize: '9px',
                                fontFamily: 'monospace',
                                color: '#fbbf24',
                                background: 'rgba(251,191,36,0.15)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              columns + rows: subgrid
                            </div>
                          )}
                          {Array.from({ length: config.nestedChildCount }).map((_, childIdx) => (
                            <div
                              key={childIdx}
                              style={{
                                ...nestedChildStyle,
                                background: NESTED_CARD_COLORS[childIdx % NESTED_CARD_COLORS.length],
                                border: config.showTracks ? '1px dashed rgba(255,255,255,0.25)' : 'none',
                              }}
                            >
                              {String.fromCharCode(65 + parentIdx * config.nestedChildCount + childIdx)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span>Parent Cell {parentIdx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300">Generated CSS</h3>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] rounded-md transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="p-4 bg-slate-950 border border-slate-700/60 rounded-xl overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
              <code>{cssOutput}</code>
            </pre>
          </div>

          {/* Tip */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-300">
              <span className="font-semibold">💡 Tip:</span>{' '}
              {SUBGRID_TIPS[tipIndex]}
            </p>
          </div>

          {/* Reference */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/40 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Browser Support — Baseline 2024
            </h4>
            <div className="flex gap-3 flex-wrap">
              {['Chrome 117+', 'Firefox 71+', 'Safari 16+', 'Edge 117+'].map((browser) => (
                <span
                  key={browser}
                  className="px-2 py-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-medium rounded-md border border-emerald-500/20"
                >
                  ✅ {browser}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
