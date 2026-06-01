'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Grid3X3, Plus, Minus, RotateCcw, PaintBucket, Pencil, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Cell {
  row: number;
  col: number;
  area: string | null;
}

type PresetKey = 'holy-grail' | 'dashboard' | 'blog-layout' | 'gallery' | 'hero-split' | 'card-grid' | 'magazine';

// ── Constants ──────────────────────────────────────────────────────────────

const AREA_COLORS = [
  'bg-blue-500/30 border-blue-500/50 text-blue-200',
  'bg-emerald-500/30 border-emerald-500/50 text-emerald-200',
  'bg-amber-500/30 border-amber-500/50 text-amber-200',
  'bg-purple-500/30 border-purple-500/50 text-purple-200',
  'bg-rose-500/30 border-rose-500/50 text-rose-200',
  'bg-cyan-500/30 border-cyan-500/50 text-cyan-200',
  'bg-orange-500/30 border-orange-500/50 text-orange-200',
  'bg-teal-500/30 border-teal-500/50 text-teal-200',
  'bg-fuchsia-500/30 border-fuchsia-500/50 text-fuchsia-200',
  'bg-lime-500/30 border-lime-500/50 text-lime-200',
  'bg-sky-500/30 border-sky-500/50 text-sky-200',
  'bg-pink-500/30 border-pink-500/50 text-pink-200',
];

const PRESETS: Record<PresetKey, { label: string; columns: number; rows: number; gap: number; areas: string[][] }> = {
  'holy-grail': {
    label: 'Holy Grail',
    columns: 3,
    rows: 3,
    gap: 16,
    areas: [
      ['header', 'header', 'header'],
      ['sidebar', 'main', 'aside'],
      ['footer', 'footer', 'footer'],
    ],
  },
  'dashboard': {
    label: 'Dashboard',
    columns: 4,
    rows: 4,
    gap: 16,
    areas: [
      ['header', 'header', 'header', 'header'],
      ['sidebar', 'stat-a', 'stat-b', 'stat-c'],
      ['sidebar', 'chart', 'chart', 'recent'],
      ['sidebar', 'chart', 'chart', 'recent'],
    ],
  },
  'blog-layout': {
    label: 'Blog Layout',
    columns: 3,
    rows: 3,
    gap: 20,
    areas: [
      ['header', 'header', 'header'],
      ['content', 'content', 'sidebar'],
      ['footer', 'footer', 'footer'],
    ],
  },
  'gallery': {
    label: 'Image Gallery',
    columns: 4,
    rows: 3,
    gap: 12,
    areas: [
      ['hero', 'hero', 'thumb-1', 'thumb-2'],
      ['hero', 'hero', 'thumb-3', 'thumb-4'],
      ['thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'],
    ],
  },
  'hero-split': {
    label: 'Hero + Features',
    columns: 3,
    rows: 3,
    gap: 16,
    areas: [
      ['hero', 'hero', 'hero'],
      ['feature-1', 'feature-2', 'feature-3'],
      ['cta', 'cta', 'cta'],
    ],
  },
  'card-grid': {
    label: 'Card Grid',
    columns: 3,
    rows: 2,
    gap: 20,
    areas: [
      ['card-1', 'card-2', 'card-3'],
      ['card-4', 'card-5', 'card-6'],
    ],
  },
  'magazine': {
    label: 'Magazine',
    columns: 4,
    rows: 4,
    gap: 12,
    areas: [
      ['feature', 'feature', 'sidebar', 'sidebar'],
      ['feature', 'feature', 'article-1', 'article-2'],
      ['article-3', 'article-4', 'article-5', 'article-6'],
      ['footer', 'footer', 'footer', 'footer'],
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getAreaColor(areaName: string): string {
  let hash = 0;
  for (let i = 0; i < areaName.length; i++) {
    hash = areaName.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const idx = Math.abs(hash) % AREA_COLORS.length;
  return AREA_COLORS[idx];
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssGridAreasPage() {
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(3);
  const [gap, setGap] = useState(16);
  const [areas, setAreas] = useState<string[][]>([
    ['header', 'header', 'header'],
    ['main', 'main', 'sidebar'],
    ['footer', 'footer', 'footer'],
  ]);
  const [selectedArea, setSelectedArea] = useState<string>('header');
  const [newAreaName, setNewAreaName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // ── Resize grid preserving areas ──────────────────────────────────────
  const resizeGrid = useCallback((newCols: number, newRows: number) => {
    setAreas((prev) => {
      const result: string[][] = [];
      for (let r = 0; r < newRows; r++) {
        const row: string[] = [];
        for (let c = 0; c < newCols; c++) {
          if (r < prev.length && c < prev[r].length) {
            row.push(prev[r][c]);
          } else {
            row.push('');
          }
        }
        result.push(row);
      }
      return result;
    });
  }, []);

  const handleColumnsUp = useCallback(() => {
    if (columns < 8) {
      const newCols = columns + 1;
      setColumns(newCols);
      resizeGrid(newCols, rows);
    }
  }, [columns, rows, resizeGrid]);

  const handleColumnsDown = useCallback(() => {
    if (columns > 1) {
      const newCols = columns - 1;
      setColumns(newCols);
      resizeGrid(newCols, rows);
    }
  }, [columns, rows, resizeGrid]);

  const handleRowsUp = useCallback(() => {
    if (rows < 8) {
      const newRows = rows + 1;
      setRows(newRows);
      resizeGrid(columns, newRows);
    }
  }, [columns, rows, resizeGrid]);

  const handleRowsDown = useCallback(() => {
    if (rows > 1) {
      const newRows = rows - 1;
      setRows(newRows);
      resizeGrid(columns, newRows);
    }
  }, [columns, rows, resizeGrid]);

  // ── Cell interaction ──────────────────────────────────────────────────
  const handleCellClick = useCallback((row: number, col: number) => {
    const currentArea = areas[row][col];
    if (currentArea) {
      setSelectedArea(currentArea);
    }
    setEditingCell({ row, col });
  }, [areas]);

  const handleAssignArea = useCallback((areaName: string) => {
    if (!editingCell) return;
    const trimmed = areaName.trim();
    setAreas((prev) => {
      const next = prev.map((r) => [...r]);
      next[editingCell.row][editingCell.col] = trimmed || '';
      return next;
    });
    if (trimmed) setSelectedArea(trimmed);
    setEditingCell(null);
    setNewAreaName('');
  }, [editingCell]);

  const handleClearCell = useCallback(() => {
    if (!editingCell) return;
    setAreas((prev) => {
      const next = prev.map((r) => [...r]);
      next[editingCell.row][editingCell.col] = '';
      return next;
    });
    setEditingCell(null);
  }, [editingCell]);

  // ── Fill / clear selected area ────────────────────────────────────────
  const handleFillArea = useCallback(() => {
    if (!selectedArea) return;
    setAreas((prev) =>
      prev.map((row) => row.map((cell) => (cell === selectedArea ? selectedArea : cell)))
    );
  }, [selectedArea]);

  const handleClearArea = useCallback(() => {
    if (!selectedArea) return;
    setAreas((prev) =>
      prev.map((row) => row.map((cell) => (cell === selectedArea ? '' : cell)))
    );
  }, [selectedArea]);

  // ── Unique areas ──────────────────────────────────────────────────────
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    areas.forEach((row) => row.forEach((cell) => { if (cell) set.add(cell); }));
    return Array.from(set).filter(Boolean);
  }, [areas]);

  // ── Apply preset ──────────────────────────────────────────────────────
  const applyPreset = useCallback((key: PresetKey) => {
    const preset = PRESETS[key];
    setColumns(preset.columns);
    setRows(preset.rows);
    setGap(preset.gap);
    setAreas(preset.areas.map((r) => [...r]));
    // Select the first area found
    const first = preset.areas.flat().find(Boolean) || '';
    setSelectedArea(first);
    setShowPresets(false);
    toast.success(`Applied: ${preset.label}`);
  }, []);

  // ── CSS output ────────────────────────────────────────────────────────
  const cssOutput = useMemo(() => {
    const areaRows = areas.map((row) =>
      '"' + row.map((cell) => cell || '.').join(' ') + '"'
    );

    const lines: string[] = [
      '.grid-container {',
      '  display: grid;',
      `  grid-template-columns: repeat(${columns}, 1fr);`,
      `  grid-template-rows: auto;`,
      gap > 0 ? `  gap: ${gap}px;` : '',
      `  grid-template-areas:`,
      areaRows.map((r, i) => `    ${r}${i < areaRows.length - 1 ? ',' : ';'}`).join('\n'),
      '}',
    ];

    // Add grid-area rules for each named area
    if (uniqueAreas.length > 0) {
      lines.push('');
      uniqueAreas.forEach((name) => {
        lines.push(`.${name} {`);
        lines.push(`  grid-area: ${name};`);
        lines.push('}');
        lines.push('');
      });
    }

    return lines.filter(Boolean).join('\n');
  }, [areas, columns, gap, uniqueAreas]);

  const tailwindOutput = useMemo(() => {
    const areaDef = areas.map((row) =>
      `[${row.map((cell) => cell || '_').join('_')}]`
    ).join('_');

    const lines: string[] = [
      `{/* Parent container */}`,
      `<div className="grid grid-cols-${columns} gap-${Math.round(gap / 4)}"`,
      `  style={{ gridTemplateAreas: '${areas.map((row) => '"' + row.map((cell) => cell || '.').join(' ') + '"').join(' ')}' }}`,
      `>`,
    ];

    uniqueAreas.forEach((name) => {
      lines.push(`  <div style={{ gridArea: '${name}' }}>{/* ${name} content */}</div>`);
    });

    lines.push(`</div>`);

    return lines.join('\n');
  }, [areas, columns, gap, uniqueAreas]);

  // ── Copy ──────────────────────────────────────────────────────────────
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput);
    toast.success('CSS copied!');
  }, [cssOutput]);

  const copyTailwind = useCallback(() => {
    navigator.clipboard.writeText(tailwindOutput);
    toast.success('JSX copied!');
  }, [tailwindOutput]);

  const reset = useCallback(() => {
    setColumns(3);
    setRows(3);
    setGap(16);
    setAreas([
      ['header', 'header', 'header'],
      ['main', 'main', 'sidebar'],
      ['footer', 'footer', 'footer'],
    ]);
    setSelectedArea('header');
    setEditingCell(null);
    toast.success('Reset to default');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Grid Template Areas Builder"
      description="Visually design named grid areas — header, sidebar, main, footer — and see the live preview with instant CSS output."
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Columns */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700/50 px-2 py-1">
          <span className="text-xs text-slate-400 mr-1">Cols</span>
          <button
            onClick={handleColumnsDown}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Decrease columns"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-mono text-white w-6 text-center">{columns}</span>
          <button
            onClick={handleColumnsUp}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Increase columns"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Rows */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700/50 px-2 py-1">
          <span className="text-xs text-slate-400 mr-1">Rows</span>
          <button
            onClick={handleRowsDown}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Decrease rows"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-mono text-white w-6 text-center">{rows}</span>
          <button
            onClick={handleRowsUp}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Increase rows"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Gap */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-slate-700/50 px-3 py-1">
          <span className="text-xs text-slate-400">Gap</span>
          <input
            type="range"
            min="0"
            max="80"
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            className="w-20 h-1 accent-brand-500"
          />
          <span className="text-xs font-mono text-white w-8">{gap}px</span>
        </div>

        {/* Presets dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Presets
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showPresets && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
              <div className="absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[200px]">
                {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {PRESETS[key].label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Reset */}
        <button
          onClick={reset}
          className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Area palette + live preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Preview */}
        <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Live Preview</h3>
          <div
            className="border border-slate-600/50 rounded-lg overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: `${gap}px`,
            }}
          >
            {areas.map((row, ri) =>
              row.map((cell, ci) => {
                const isEditing = editingCell?.row === ri && editingCell?.col === ci;
                const colorClass = cell ? getAreaColor(cell) : 'bg-transparent border-slate-700/30 text-slate-600';
                return (
                  <button
                    key={`${ri}-${ci}`}
                    onClick={() => handleCellClick(ri, ci)}
                    className={`
                      relative flex items-center justify-center min-h-[60px] px-2 py-3 rounded-md
                      border transition-all duration-150 cursor-pointer
                      ${isEditing ? 'ring-2 ring-brand-400 ring-offset-1 ring-offset-slate-900 z-10' : ''}
                      ${cell ? colorClass : 'border border-dashed border-slate-700/30 hover:border-slate-600/50'}
                    `}
                  >
                    <span className="text-xs font-mono font-medium truncate max-w-full">
                      {cell || (
                        <span className="text-slate-600">empty</span>
                      )}
                    </span>

                    {/* Edit popover */}
                    {isEditing && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setEditingCell(null); }} />
                        <div
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-3 min-w-[180px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={newAreaName}
                              onChange={(e) => setNewAreaName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAssignArea(newAreaName);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              placeholder={cell || 'area-name'}
                              className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            {uniqueAreas.map((a) => (
                              <button
                                key={a}
                                onClick={() => handleAssignArea(a)}
                                className={`px-2 py-0.5 rounded text-xs border transition-colors ${getAreaColor(a)} hover:opacity-80`}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAssignArea(newAreaName)}
                              className="flex-1 px-3 py-1 bg-brand-500 text-white rounded text-xs font-medium hover:bg-brand-600 transition-colors"
                            >
                              Apply
                            </button>
                            {cell && (
                              <button
                                onClick={handleClearCell}
                                className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-xs font-medium hover:bg-red-500/30 transition-colors"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">Click any cell to assign or change its named area.</p>
        </div>

        {/* Area Palette */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <PaintBucket className="w-3.5 h-3.5" />
              Named Areas ({uniqueAreas.length})
            </h3>
            {uniqueAreas.length === 0 && (
              <p className="text-xs text-slate-500">No named areas yet. Click cells to create them.</p>
            )}
            <div className="space-y-1">
              {uniqueAreas.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedArea(name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                    selectedArea === name
                      ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                      : `${getAreaColor(name)} border hover:opacity-90`
                  }`}
                >
                  <span className="font-mono font-medium truncate">{name}</span>
                  {selectedArea === name && (
                    <span className="text-xs text-brand-300 ml-2 shrink-0">selected</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedArea && (
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 space-y-2">
              <h4 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Pencil className="w-3 h-3" />
                Actions for &quot;{selectedArea}&quot;
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleFillArea}
                  className="flex-1 px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-colors"
                >
                  Fill All
                </button>
                <button
                  onClick={handleClearArea}
                  className="flex-1 px-2 py-1 bg-red-500/10 text-red-300 rounded text-xs hover:bg-red-500/20 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <p className="text-xs text-slate-500">
                &quot;Fill All&quot; assigns this area to every cell with the same name. &quot;Clear All&quot; removes it from the grid.
              </p>
            </div>
          )}

          {/* Quick add */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3">
            <h4 className="text-xs font-medium text-slate-400 mb-2">Quick Create</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAreaName.trim() && editingCell) {
                    handleAssignArea(newAreaName);
                  }
                }}
                placeholder="New area name"
                className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={() => {
                  if (newAreaName.trim() && editingCell) {
                    handleAssignArea(newAreaName);
                  } else if (newAreaName.trim()) {
                    setAreas((prev) => {
                      const next = prev.map((r) => [...r]);
                      // Find first empty cell
                      for (let ri = 0; ri < next.length; ri++) {
                        for (let ci = 0; ci < next[ri].length; ci++) {
                          if (!next[ri][ci]) {
                            next[ri][ci] = newAreaName.trim();
                            setSelectedArea(newAreaName.trim());
                            setNewAreaName('');
                            toast.success(`Created "${newAreaName.trim()}"`);
                            return next;
                          }
                        }
                      }
                      toast.error('No empty cells available');
                      return prev;
                    });
                    setNewAreaName('');
                  }
                }}
                disabled={!newAreaName.trim()}
                className="px-3 py-1 bg-brand-500 text-white rounded text-xs font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Output */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">Generated CSS</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={copyTailwind}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy JSX
            </button>
            <button
              onClick={copyCSS}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
          </div>
        </div>
        <pre className="bg-slate-900 rounded-lg p-4 overflow-auto text-sm font-mono text-slate-300 leading-relaxed">
          <code>{cssOutput}</code>
        </pre>
      </div>

      {/* How it works */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-5">
        <h3 className="text-sm font-medium text-slate-300 mb-2">How Grid Template Areas Work</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          CSS Grid Template Areas let you name regions of a grid with <code className="text-brand-400 bg-brand-400/10 px-1 rounded">grid-template-areas</code>.
          Each row is a string of named areas (or <code className="text-slate-500 bg-slate-700 px-1 rounded">.</code> for empty cells), and child elements use <code className="text-brand-400 bg-brand-400/10 px-1 rounded">grid-area: name</code> to
          claim a position. This is the most readable way to define complex layouts — the CSS literally looks like the layout you see on screen.
        </p>
      </div>

      {/* Empty state: hide when there are areas */}
    </ToolLayout>
  );
}
