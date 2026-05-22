'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Grid3X3, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

type GridFlow = 'row' | 'column' | 'row dense' | 'column dense';
type JustifyAlign = 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';

const GRID_COLORS = [
  'bg-red-500/20', 'bg-orange-500/20', 'bg-amber-500/20', 'bg-yellow-500/20',
  'bg-lime-500/20', 'bg-green-500/20', 'bg-emerald-500/20', 'bg-teal-500/20',
  'bg-cyan-500/20', 'bg-sky-500/20', 'bg-blue-500/20', 'bg-indigo-500/20',
  'bg-violet-500/20', 'bg-purple-500/20', 'bg-fuchsia-500/20', 'bg-pink-500/20',
  'bg-rose-500/20', 'bg-red-500/20', 'bg-orange-500/20', 'bg-amber-500/20',
];

const PRESETS: Record<string, { columns: number; rows: number; gap: number; colTemplate: string; rowTemplate: string; flow: GridFlow; label: string }> = {
  '3-column': { columns: 3, rows: 3, gap: 16, colTemplate: '1fr 1fr 1fr', rowTemplate: 'auto', flow: 'row', label: '3-Column Layout' },
  'holy-grail': { columns: 3, rows: 3, gap: 16, colTemplate: '200px 1fr 200px', rowTemplate: '80px 1fr 80px', flow: 'row', label: 'Holy Grail' },
  '12-col': { columns: 12, rows: 4, gap: 12, colTemplate: 'repeat(12, 1fr)', rowTemplate: 'auto', flow: 'row', label: '12-Column Grid' },
  'masonry-dense': { columns: 4, rows: 6, gap: 12, colTemplate: 'repeat(4, 1fr)', rowTemplate: 'auto', flow: 'row dense', label: 'Masonry (dense)' },
  'sidebar-main': { columns: 2, rows: 1, gap: 20, colTemplate: '280px 1fr', rowTemplate: 'auto', flow: 'row', label: 'Sidebar + Main' },
  'card-grid': { columns: 4, rows: 2, gap: 24, colTemplate: 'repeat(auto-fill, minmax(250px, 1fr))', rowTemplate: 'auto', flow: 'row', label: 'Auto-Fill Cards' },
  'hero-split': { columns: 2, rows: 1, gap: 0, colTemplate: '1fr 1fr', rowTemplate: '100%', flow: 'row', label: 'Hero Split' },
  'dashboard': { columns: 4, rows: 3, gap: 16, colTemplate: 'repeat(4, 1fr)', rowTemplate: 'auto auto auto', flow: 'row', label: 'Dashboard' },
};

export default function CssGridGeneratorPage() {
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(3);
  const [gap, setGap] = useState(16);
  const [colTemplateMode, setColTemplateMode] = useState<'equal' | 'custom' | 'auto-fill' | 'auto-fit'>('equal');
  const [customColTemplate, setCustomColTemplate] = useState('200px 1fr 1fr 200px');
  const [autoFillMin, setAutoFillMin] = useState(250);
  const [rowTemplateMode, setRowTemplateMode] = useState<'auto' | 'custom'>('auto');
  const [customRowTemplate, setCustomRowTemplate] = useState('100px auto 100px');
  const [gridFlow, setGridFlow] = useState<GridFlow>('row');
  const [justifyItems, setJustifyItems] = useState<JustifyAlign>('stretch');
  const [alignItems, setAlignItems] = useState<JustifyAlign>('stretch');
  const [justifyContent, setJustifyContent] = useState<JustifyAlign>('start');
  const [alignContent, setAlignContent] = useState<JustifyAlign>('start');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [individualGaps, setIndividualGaps] = useState(false);
  const [columnGap, setColumnGap] = useState(16);
  const [rowGap, setRowGap] = useState(16);

  const cssOutput = useMemo(() => {
    const lines: string[] = ['.grid-container {', '  display: grid;'];

    if (colTemplateMode === 'equal') {
      lines.push(`  grid-template-columns: repeat(${columns}, 1fr);`);
    } else if (colTemplateMode === 'custom') {
      lines.push(`  grid-template-columns: ${customColTemplate};`);
    } else if (colTemplateMode === 'auto-fill') {
      lines.push(`  grid-template-columns: repeat(auto-fill, minmax(${autoFillMin}px, 1fr));`);
    } else if (colTemplateMode === 'auto-fit') {
      lines.push(`  grid-template-columns: repeat(auto-fit, minmax(${autoFillMin}px, 1fr));`);
    }

    if (rowTemplateMode === 'auto') {
      lines.push(`  grid-template-rows: auto;`);
    } else {
      lines.push(`  grid-template-rows: ${customRowTemplate};`);
    }

    if (individualGaps) {
      lines.push(`  column-gap: ${columnGap}px;`);
      lines.push(`  row-gap: ${rowGap}px;`);
    } else {
      if (gap > 0) lines.push(`  gap: ${gap}px;`);
    }

    if (gridFlow !== 'row') lines.push(`  grid-auto-flow: ${gridFlow};`);
    if (justifyItems !== 'stretch') lines.push(`  justify-items: ${justifyItems};`);
    if (alignItems !== 'stretch') lines.push(`  align-items: ${alignItems};`);
    if (justifyContent !== 'start') lines.push(`  justify-content: ${justifyContent};`);
    if (alignContent !== 'start') lines.push(`  align-content: ${alignContent};`);

    lines.push('}');
    lines.push('');
    lines.push('/* Grid items */');
    lines.push('.grid-item {');
    lines.push('  padding: 1rem;');
    lines.push('  border-radius: 0.5rem;');
    lines.push('  background: rgba(255, 255, 255, 0.05);');
    lines.push('}');

    return lines.join('\n');
  }, [columns, customColTemplate, autoFillMin, customRowTemplate, gap, colTemplateMode, rowTemplateMode, gridFlow, justifyItems, alignItems, justifyContent, alignContent, individualGaps, columnGap, rowGap]);

  const previewStyle = useMemo(() => {
    const style: Record<string, string> = {};

    if (colTemplateMode === 'equal') {
      style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    } else if (colTemplateMode === 'custom') {
      style.gridTemplateColumns = customColTemplate;
    } else if (colTemplateMode === 'auto-fill') {
      style.gridTemplateColumns = `repeat(auto-fill, minmax(${autoFillMin}px, 1fr))`;
    } else if (colTemplateMode === 'auto-fit') {
      style.gridTemplateColumns = `repeat(auto-fit, minmax(${autoFillMin}px, 1fr))`;
    }

    if (rowTemplateMode === 'auto') {
      style.gridTemplateRows = 'auto';
    } else {
      style.gridTemplateRows = customRowTemplate;
    }

    if (individualGaps) {
      style.columnGap = `${columnGap}px`;
      style.rowGap = `${rowGap}px`;
    } else {
      style.gap = `${gap}px`;
    }

    style.gridAutoFlow = gridFlow;
    style.justifyItems = justifyItems;
    style.alignItems = alignItems;
    style.justifyContent = justifyContent;
    style.alignContent = alignContent;

    return style;
  }, [columns, gap, colTemplateMode, customColTemplate, autoFillMin, rowTemplateMode, customRowTemplate, gridFlow, justifyItems, alignItems, justifyContent, alignContent, individualGaps, columnGap, rowGap]);

  const totalCells = columns * rows;

  const applyPreset = useCallback((key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setColumns(preset.columns);
    setRows(preset.rows);
    if (!individualGaps) setGap(preset.gap);
    setGridFlow(preset.flow);
    if (preset.colTemplate.includes('repeat')) {
      if (preset.colTemplate.includes('auto-fill')) {
        setColTemplateMode('auto-fill');
      } else if (preset.colTemplate.includes('auto-fit')) {
        setColTemplateMode('auto-fit');
      } else {
        setColTemplateMode('equal');
      }
    } else {
      setColTemplateMode('custom');
      setCustomColTemplate(preset.colTemplate);
    }
    if (preset.rowTemplate === 'auto') {
      setRowTemplateMode('auto');
    } else if (preset.rowTemplate === 'masonry') {
      setRowTemplateMode('auto');
      setGridFlow('row dense');
    } else {
      setRowTemplateMode('custom');
      setCustomRowTemplate(preset.rowTemplate);
    }
  }, [individualGaps]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [cssOutput]);

  const resetAll = useCallback(() => {
    setColumns(4);
    setRows(3);
    setGap(16);
    setColTemplateMode('equal');
    setCustomColTemplate('200px 1fr 1fr 200px');
    setAutoFillMin(250);
    setRowTemplateMode('auto');
    setCustomRowTemplate('100px auto 100px');
    setGridFlow('row');
    setJustifyItems('stretch');
    setAlignItems('stretch');
    setJustifyContent('start');
    setAlignContent('start');
    setIndividualGaps(false);
    setColumnGap(16);
    setRowGap(16);
  }, []);

  return (
    <ToolLayout
      title="CSS Grid Generator"
      description="Visually build CSS Grid layouts — adjust columns, rows, gaps, and alignment. Copy the generated CSS instantly."
    >
      {/* Presets */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-brand-400" />
          Layout Presets
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 hover:border-brand-500/50 hover:text-brand-400 text-slate-300 transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Live Preview</h2>
          <span className="text-xs text-slate-500 font-mono">{totalCells} cells</span>
        </div>
        <div
          className="bg-surface rounded-lg border border-slate-700/50 p-4 min-h-[200px] overflow-auto"
          style={{
            display: 'grid',
            ...previewStyle,
          }}
        >
          {Array.from({ length: totalCells }).map((_, i) => (
            <div
              key={i}
              className={`${GRID_COLORS[i % GRID_COLORS.length]} rounded-lg border border-slate-600/40 flex items-center justify-center text-xs font-mono text-slate-400 min-h-[40px] transition-all`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Grid Controls */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Grid Definition</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Columns */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Columns</label>
            <div className="flex gap-2 mb-3">
              {(['equal', 'custom', 'auto-fill', 'auto-fit'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setColTemplateMode(mode)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    colTemplateMode === mode
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {mode === 'auto-fill' ? 'auto-fill' : mode === 'auto-fit' ? 'auto-fit' : mode}
                </button>
              ))}
            </div>
            {colTemplateMode === 'equal' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-sm font-mono text-brand-400 w-8 text-right">{columns}</span>
              </div>
            )}
            {colTemplateMode === 'custom' && (
              <input
                type="text"
                value={customColTemplate}
                onChange={(e) => setCustomColTemplate(e.target.value)}
                placeholder="e.g. 200px 1fr 1fr"
                className="input-field w-full font-mono text-sm"
              />
            )}
            {(colTemplateMode === 'auto-fill' || colTemplateMode === 'auto-fit') && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">minmax(</span>
                <input
                  type="number"
                  value={autoFillMin}
                  onChange={(e) => setAutoFillMin(Math.max(100, Math.min(800, Number(e.target.value))))}
                  className="input-field w-20 text-center font-mono text-sm"
                />
                <span className="text-xs text-slate-500">px, 1fr)</span>
              </div>
            )}
          </div>

          {/* Rows */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Rows</label>
            <div className="flex gap-2 mb-3">
              {(['auto', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRowTemplateMode(mode)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    rowTemplateMode === mode
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            {rowTemplateMode === 'auto' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-sm font-mono text-brand-400 w-8 text-right">{rows}</span>
              </div>
            )}
            {rowTemplateMode === 'custom' && (
              <input
                type="text"
                value={customRowTemplate}
                onChange={(e) => setCustomRowTemplate(e.target.value)}
                placeholder="e.g. 100px auto 100px"
                className="input-field w-full font-mono text-sm"
              />
            )}
          </div>
        </div>

        {/* Gap Control */}
        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-slate-300">Gap</label>
            <button
              onClick={() => setIndividualGaps(!individualGaps)}
              className={`text-xs px-2 py-0.5 rounded transition-all ${
                individualGaps ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Individual gaps
            </button>
          </div>
          {!individualGaps ? (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={80}
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-sm font-mono text-brand-400 w-14 text-right">{gap}px</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Column Gap</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={columnGap}
                    onChange={(e) => setColumnGap(Number(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-xs font-mono text-brand-400 w-12 text-right">{columnGap}px</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Row Gap</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={rowGap}
                    onChange={(e) => setRowGap(Number(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-xs font-mono text-brand-400 w-12 text-right">{rowGap}px</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grid Auto Flow */}
        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <label className="text-sm text-slate-300 block mb-3">Grid Auto Flow</label>
          <div className="flex flex-wrap gap-2">
            {(['row', 'column', 'row dense', 'column dense'] as GridFlow[]).map((flow) => (
              <button
                key={flow}
                onClick={() => setGridFlow(flow)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  gridFlow === flow
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {flow}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alignment Controls */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Alignment</h2>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAdvanced ? 'Less' : 'Advanced'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Justify Items */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">justify-items</label>
            <div className="flex flex-wrap gap-1.5">
              {(['stretch', 'start', 'center', 'end'] as JustifyAlign[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setJustifyItems(v)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    justifyItems === v
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Align Items */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">align-items</label>
            <div className="flex flex-wrap gap-1.5">
              {(['stretch', 'start', 'center', 'end'] as JustifyAlign[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setAlignItems(v)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    alignItems === v
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700/50">
            {/* Justify Content */}
            <div>
              <label className="text-xs text-slate-500 block mb-2">justify-content</label>
              <div className="flex flex-wrap gap-1.5">
                {(['start', 'center', 'end', 'stretch', 'space-between', 'space-around', 'space-evenly'] as JustifyAlign[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setJustifyContent(v)}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      justifyContent === v
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Align Content */}
            <div>
              <label className="text-xs text-slate-500 block mb-2">align-content</label>
              <div className="flex flex-wrap gap-1.5">
                {(['start', 'center', 'end', 'stretch', 'space-between', 'space-around', 'space-evenly'] as JustifyAlign[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setAlignContent(v)}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      alignContent === v
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Output */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-lg">Generated CSS</h2>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-slate-500 hover:text-slate-300 transition-colors" title="Reset all">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={copyCss} className="btn-primary flex items-center gap-1.5 text-sm">
              <Copy className="w-4 h-4" />
              Copy CSS
            </button>
          </div>
        </div>
        <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-sm font-mono text-slate-300 overflow-x-auto max-h-80 overflow-y-auto">
          {cssOutput}
        </pre>
      </div>
    </ToolLayout>
  );
}
