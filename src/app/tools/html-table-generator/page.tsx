'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Plus, Minus, RotateCcw, AlignLeft, AlignCenter, AlignRight, Heading, Code2, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type CellAlign = 'left' | 'center' | 'right';
type CellTag = 'td' | 'th';

interface Cell {
  value: string;
  tag: CellTag;
  align: CellAlign;
}

interface TableOptions {
  bordered: boolean;
  striped: boolean;
  hover: boolean;
  compact: boolean;
  responsive: boolean;
  firstRowHeader: boolean;
  firstColHeader: boolean;
}

const DEFAULT_OPTIONS: TableOptions = {
  bordered: true,
  striped: true,
  hover: true,
  compact: false,
  responsive: true,
  firstRowHeader: true,
  firstColHeader: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function createEmptyGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      value: '',
      tag: 'td' as CellTag,
      align: 'left' as CellAlign,
    }))
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateHtml(grid: Cell[][], options: TableOptions): string {
  if (grid.length === 0 || grid[0].length === 0) return '';

  const tableClasses: string[] = [];
  if (options.bordered) tableClasses.push('table-bordered');
  if (options.striped) tableClasses.push('table-striped');
  if (options.hover) tableClasses.push('table-hover');
  if (options.compact) tableClasses.push('table-compact');

  const classAttr = tableClasses.length > 0 ? ` class="${tableClasses.join(' ')}"` : '';

  let html = `<table${classAttr}>\n`;

  // Check if first row should be thead
  const hasHeaderRow = options.firstRowHeader && grid.length > 0;
  const bodyStartRow = hasHeaderRow ? 1 : 0;

  if (hasHeaderRow) {
    html += '  <thead>\n    <tr>\n';
    for (let c = 0; c < grid[0].length; c++) {
      const cell = grid[0][c];
      const alignAttr = cell.align !== 'left' ? ` style="text-align: ${cell.align};"` : '';
      html += `      <th${alignAttr}>${escapeHtml(cell.value) || '&nbsp;'}</th>\n`;
    }
    html += '    </tr>\n  </thead>\n';
  }

  if (bodyStartRow < grid.length) {
    html += '  <tbody>\n';
    for (let r = bodyStartRow; r < grid.length; r++) {
      html += '    <tr>\n';
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        const isFirstCol = c === 0 && options.firstColHeader && !hasHeaderRow;
        const tag = isFirstCol ? 'th' : cell.tag;
        const scopeAttr = isFirstCol ? ' scope="row"' : '';
        const alignAttr = cell.align !== 'left' ? ` style="text-align: ${cell.align};"` : '';
        html += `      <${tag}${scopeAttr}${alignAttr}>${escapeHtml(cell.value) || '&nbsp;'}</${tag}>\n`;
      }
      html += '    </tr>\n';
    }
    html += '  </tbody>\n';
  }

  html += '</table>';

  if (options.responsive) {
    html = `<div class="table-responsive">\n  ${html.replace(/\n/g, '\n  ')}\n</div>`;
  }

  return html;
}

function generateCss(options: TableOptions): string {
  const lines: string[] = [];

  lines.push('table {');
  lines.push('  width: 100%;');
  lines.push('  border-collapse: collapse;');
  lines.push('  font-family: system-ui, -apple-system, sans-serif;');
  lines.push('}');
  lines.push('');

  lines.push('th, td {');
  if (options.compact) {
    lines.push('  padding: 6px 10px;');
  } else {
    lines.push('  padding: 10px 14px;');
  }
  if (options.bordered) {
    lines.push('  border: 1px solid #e2e8f0;');
  }
  lines.push('}');
  lines.push('');

  lines.push('th {');
  lines.push('  background-color: #f8fafc;');
  lines.push('  font-weight: 600;');
  lines.push('  text-align: left;');
  lines.push('}');
  lines.push('');

  if (options.striped) {
    lines.push('tbody tr:nth-child(even) {');
    lines.push('  background-color: #f8fafc;');
    lines.push('}');
    lines.push('');
  }

  if (options.hover) {
    lines.push('tbody tr:hover {');
    lines.push('  background-color: #e2e8f0;');
    lines.push('}');
    lines.push('');
  }

  if (options.responsive) {
    lines.push('.table-responsive {');
    lines.push('  overflow-x: auto;');
    lines.push('  -webkit-overflow-scrolling: touch;');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function generateFullHtml(grid: Cell[][], options: TableOptions): string {
  const tableHtml = generateHtml(grid, options);
  const css = generateCss(options);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table</title>
  <style>
${css.split('\n').map(l => '    ' + l).join('\n')}
  </style>
</head>
<body>
  ${tableHtml.replace(/\n/g, '\n  ')}
</body>
</html>`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HtmlTableGeneratorPage() {
  const [grid, setGrid] = useState<Cell[][]>(() => createEmptyGrid(4, 4));
  const [options, setOptions] = useState<TableOptions>(DEFAULT_OPTIONS);
  const [showPreview, setShowPreview] = useState(true);
  const [tab, setTab] = useState<'html' | 'css' | 'full'>('html');

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const addRow = useCallback(() => {
    setGrid(prev => [...prev, Array.from({ length: prev[0].length }, () => ({
      value: '',
      tag: 'td' as CellTag,
      align: 'left' as CellAlign,
    }))]);
  }, []);

  const removeRow = useCallback(() => {
    setGrid(prev => (prev.length <= 1 ? prev : prev.slice(0, -1)));
  }, []);

  const addCol = useCallback(() => {
    setGrid(prev => prev.map(row => [...row, { value: '', tag: 'td' as CellTag, align: 'left' as CellAlign }]));
  }, []);

  const removeCol = useCallback(() => {
    setGrid(prev => (prev[0].length <= 1 ? prev : prev.map(row => row.slice(0, -1))));
  }, []);

  const updateCell = useCallback((r: number, c: number, value: string) => {
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].value = value;
      return next;
    });
  }, []);

  const toggleCellTag = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].tag = next[r][c].tag === 'th' ? 'td' : 'th';
      return next;
    });
  }, []);

  const setCellAlign = useCallback((r: number, c: number, align: CellAlign) => {
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].align = align;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setGrid(createEmptyGrid(4, 4));
    setOptions(DEFAULT_OPTIONS);
  }, []);

  const toggleOption = useCallback((key: keyof TableOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Derived outputs
  const htmlOutput = useMemo(() => generateHtml(grid, options), [grid, options]);
  const cssOutput = useMemo(() => generateCss(options), [options]);
  const fullOutput = useMemo(() => generateFullHtml(grid, options), [grid, options]);

  const currentOutput = tab === 'html' ? htmlOutput : tab === 'css' ? cssOutput : fullOutput;

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(currentOutput).then(
      () => toast.success(`${tab === 'html' ? 'HTML' : tab === 'css' ? 'CSS' : 'Full page'} copied!`),
      () => toast.error('Failed to copy'),
    );
  }, [currentOutput, tab]);

  const downloadOutput = useCallback(() => {
    const ext = tab === 'full' ? 'html' : tab === 'css' ? 'css' : 'html';
    const mime = tab === 'full' ? 'text/html' : tab === 'css' ? 'text/css' : 'text/html';
    const blob = new Blob([currentOutput], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded table.${ext}`);
  }, [currentOutput, tab]);

  return (
    <ToolLayout
      title="HTML Table Generator"
      description="Build HTML tables visually — add rows/columns, style cells, set headers, and export clean HTML + CSS."
    >
      {/* Table Options */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-white font-semibold text-sm mr-2">Table Style:</span>
          {([
            ['bordered', 'Bordered'],
            ['striped', 'Striped'],
            ['hover', 'Hover'],
            ['compact', 'Compact'],
            ['responsive', 'Responsive'],
            ['firstRowHeader', 'Header Row'],
            ['firstColHeader', 'Header Col'],
          ] as [keyof TableOptions, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleOption(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                options[key]
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-600/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Size controls */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-white font-semibold text-sm">Size:</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs w-6">Rows</span>
            <button
              onClick={removeRow}
              disabled={rows <= 1}
              className="p-1.5 rounded-md bg-surface-lighter text-slate-300 hover:bg-slate-600 disabled:opacity-30 transition-colors"
              title="Remove row"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-white text-sm font-mono min-w-[2ch] text-center">{rows}</span>
            <button
              onClick={addRow}
              disabled={rows >= 30}
              className="p-1.5 rounded-md bg-surface-lighter text-slate-300 hover:bg-slate-600 disabled:opacity-30 transition-colors"
              title="Add row"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs w-6">Cols</span>
            <button
              onClick={removeCol}
              disabled={cols <= 1}
              className="p-1.5 rounded-md bg-surface-lighter text-slate-300 hover:bg-slate-600 disabled:opacity-30 transition-colors"
              title="Remove column"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-white text-sm font-mono min-w-[2ch] text-center">{cols}</span>
            <button
              onClick={addCol}
              disabled={cols >= 20}
              className="p-1.5 rounded-md bg-surface-lighter text-slate-300 hover:bg-slate-600 disabled:opacity-30 transition-colors"
              title="Add column"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1" />

          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-400 transition-colors bg-surface-lighter border border-slate-600/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              showPreview ? 'bg-brand-500 text-white' : 'bg-surface-lighter text-slate-400 border border-slate-600/50'
            }`}
          >
            {showPreview ? <Table2 className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
            {showPreview ? 'Preview' : 'Code'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor */}
        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-3">Edit Table</h3>
          <p className="text-slate-500 text-xs mb-3">
            Click any cell to edit. Use buttons below each cell to toggle header (&lt;th&gt;) and alignment.
          </p>
          <div className="overflow-x-auto border border-slate-700/50 rounded-lg">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {grid.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`p-0 border border-slate-700/30 align-top ${cell.tag === 'th' ? 'bg-blue-900/20' : ''}`}
                        style={{ minWidth: '120px' }}
                      >
                        <div className="flex flex-col">
                          <input
                            type="text"
                            value={cell.value}
                            onChange={(e) => updateCell(r, c, e.target.value)}
                            placeholder={cell.tag === 'th' ? 'Header...' : 'Cell...'}
                            className={`w-full px-2 py-1.5 bg-transparent text-slate-200 text-xs outline-none border-b border-slate-700/30 placeholder-slate-600 ${
                              cell.tag === 'th' ? 'font-semibold' : ''
                            }`}
                          />
                          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-surface-lighter">
                            <button
                              onClick={() => toggleCellTag(r, c)}
                              className={`p-0.5 rounded text-[10px] transition-colors ${
                                cell.tag === 'th'
                                  ? 'text-cyan-400 bg-cyan-500/10'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                              title="Toggle header"
                            >
                              <Heading className="w-3 h-3" />
                            </button>
                            <div className="w-px h-3 bg-slate-700/50 mx-0.5" />
                            {(['left', 'center', 'right'] as CellAlign[]).map((align) => (
                              <button
                                key={align}
                                onClick={() => setCellAlign(r, c, align)}
                                className={`p-0.5 rounded text-[10px] transition-colors ${
                                  cell.align === align
                                    ? 'text-brand-400 bg-brand-500/10'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                                title={`Align ${align}`}
                              >
                                {align === 'left' ? <AlignLeft className="w-3 h-3" /> :
                                 align === 'center' ? <AlignCenter className="w-3 h-3" /> :
                                 <AlignRight className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview / Code Output */}
        {showPreview && (
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Preview</h3>
            {grid.length > 0 && grid[0].length > 0 ? (
              <div className={options.responsive ? 'overflow-x-auto' : ''}>
                <style>{`
                  .devbench-preview-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-family: system-ui, -apple-system, sans-serif;
                  }
                  .devbench-preview-table th,
                  .devbench-preview-table td {
                    padding: ${options.compact ? '6px 10px' : '10px 14px'};
                    ${options.bordered ? 'border: 1px solid #475569;' : ''}
                  }
                  .devbench-preview-table th {
                    background-color: #1e293b;
                    font-weight: 600;
                    text-align: left;
                  }
                  ${options.striped ? `.devbench-preview-table tbody tr:nth-child(even) { background-color: #1e293b40; }` : ''}
                  ${options.hover ? `.devbench-preview-table tbody tr:hover { background-color: #334155; }` : ''}
                `}</style>
                <table className="devbench-preview-table text-slate-200 text-xs">
                  {options.firstRowHeader && grid.length > 0 ? (
                    <thead>
                      <tr>
                        {grid[0].map((cell, c) => (
                          <th key={c} style={{ textAlign: cell.align }}>
                            {cell.value || <>&nbsp;</>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {(options.firstRowHeader ? grid.slice(1) : grid).map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => {
                          const isFirstColHeader = c === 0 && options.firstColHeader && !options.firstRowHeader;
                          const Tag = isFirstColHeader ? 'th' : 'td';
                          return (
                            <Tag key={c} style={{ textAlign: cell.align }}>
                              {cell.value || <>&nbsp;</>}
                            </Tag>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                Add rows and columns to preview
              </div>
            )}
          </div>
        )}
      </div>

      {/* Code output */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {(['html', 'css', 'full'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === t
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-lighter text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'full' ? 'Full Page' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-brand-400 transition-colors bg-surface-lighter border border-slate-600/50"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <button
              onClick={downloadOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-brand-400 transition-colors bg-surface-lighter border border-slate-600/50"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>
        <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre">
          {currentOutput || <span className="text-slate-600">Add data to generate output...</span>}
        </pre>
      </div>

      {/* Info */}
      <div className="card mt-6">
        <h3 className="text-white font-semibold text-sm mb-2">How to use</h3>
        <ul className="text-slate-400 text-sm space-y-1.5">
          <li>• <strong className="text-slate-300">Edit cells:</strong> Click any cell and type directly — the preview updates live.</li>
          <li>• <strong className="text-slate-300">Toggle header:</strong> Click the <span className="text-cyan-400">H</span> icon below a cell to make it a <code className="text-xs bg-slate-700 px-1 rounded">&lt;th&gt;</code> — useful for row headers.</li>
          <li>• <strong className="text-slate-300">Alignment:</strong> Use the alignment buttons (left/center/right) per cell — adds <code className="text-xs bg-slate-700 px-1 rounded">style=&quot;text-align: ...&quot;</code>.</li>
          <li>• <strong className="text-slate-300">Header Row:</strong> Enable to wrap the first row in <code className="text-xs bg-slate-700 px-1 rounded">&lt;thead&gt;</code>.</li>
          <li>• <strong className="text-slate-300">Export:</strong> Copy raw HTML, CSS, or a full standalone page — or download as a file.</li>
          <li>• <strong className="text-slate-300">Privacy:</strong> Everything runs in your browser — no data leaves your machine.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
