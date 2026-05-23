'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Plus,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Code,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Alignment = 'left' | 'center' | 'right';

const ALIGN_ICONS: Record<Alignment, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

const ALIGN_NEXT: Record<Alignment, Alignment> = {
  left: 'center',
  center: 'right',
  right: 'left',
};

const INITIAL_ROWS = 4;
const INITIAL_COLS = 3;
const INITIAL_ALIGNS: Alignment[] = Array(INITIAL_COLS).fill('left');

function generateMarkdown(headers: string[], rows: string[][], aligns: Alignment[]): string {
  if (headers.length === 0) return '';

  const headerRow = '| ' + headers.map((h) => h || ' ').join(' | ') + ' |';

  const sepRow =
    '| ' +
    aligns
      .map((a) => {
        if (a === 'left') return ':---';
        if (a === 'center') return ':---:';
        return '---:';
      })
      .join(' | ') +
    ' |';

  const dataRows = rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => '| ' + row.map((c) => c || ' ').join(' | ') + ' |');

  return [headerRow, sepRow, ...dataRows].join('\n');
}

function renderRowHtml(cells: string[], tag: 'th' | 'td', aligns: Alignment[]): string {
  return (
    '<tr>' +
    cells
      .map((c, i) => {
        const align = aligns[i] || 'left';
        return `<${tag} style="text-align:${align};padding:8px 12px;border:1px solid #334155">${escapeHtml(c || ' ')}</${tag}>`;
      })
      .join('') +
    '</tr>'
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderTableHtml(headers: string[], rows: string[][], aligns: Alignment[]): string {
  if (headers.length === 0) return '';
  const headerHtml = renderRowHtml(headers, 'th', aligns);
  const bodyHtml = rows
    .filter((row) => row.some((c) => c.trim()))
    .map((row) => renderRowHtml(row, 'td', aligns))
    .join('');
  return `<table style="border-collapse:collapse;width:100%;font-family:monospace;font-size:14px">\n  <thead>${headerHtml}</thead>\n  <tbody>${bodyHtml}</tbody>\n</table>`;
}

export default function MarkdownTableGeneratorPage() {
  const [headers, setHeaders] = useState<string[]>(Array(INITIAL_COLS).fill(''));
  const [rows, setRows] = useState<string[][]>(
    Array.from({ length: INITIAL_ROWS }, () => Array(INITIAL_COLS).fill(''))
  );
  const [aligns, setAligns] = useState<Alignment[]>(INITIAL_ALIGNS);
  const [viewMode, setViewMode] = useState<'split' | 'code' | 'preview'>('split');

  const markdown = useMemo(() => generateMarkdown(headers, rows, aligns), [headers, rows, aligns]);
  const tableHtml = useMemo(
    () => renderTableHtml(headers, rows, aligns),
    [headers, rows, aligns]
  );

  const updateHeader = useCallback((colIdx: number, value: string) => {
    setHeaders((prev) => {
      const next = [...prev];
      next[colIdx] = value;
      return next;
    });
  }, []);

  const updateCell = useCallback((rowIdx: number, colIdx: number, value: string) => {
    setRows((prev) => {
      const next = prev.map((r) => [...r]);
      next[rowIdx][colIdx] = value;
      return next;
    });
  }, []);

  const addColumn = useCallback(() => {
    setHeaders((prev) => [...prev, '']);
    setRows((prev) => prev.map((r) => [...r, '']));
    setAligns((prev) => [...prev, 'left']);
  }, []);

  const removeColumn = useCallback(
    (colIdx: number) => {
      if (headers.length <= 1) return;
      setHeaders((prev) => prev.filter((_, i) => i !== colIdx));
      setRows((prev) => prev.map((r) => r.filter((_, i) => i !== colIdx)));
      setAligns((prev) => prev.filter((_, i) => i !== colIdx));
    },
    [headers.length]
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, Array(headers.length).fill('')]);
  }, [headers.length]);

  const removeRow = useCallback((rowIdx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  }, []);

  const toggleAlign = useCallback((colIdx: number) => {
    setAligns((prev) => {
      const next = [...prev];
      next[colIdx] = ALIGN_NEXT[next[colIdx]];
      return next;
    });
  }, []);

  const copyMarkdown = useCallback(() => {
    if (!markdown) {
      toast.error('Table is empty');
      return;
    }
    navigator.clipboard.writeText(markdown).then(
      () => toast.success('Markdown copied!'),
      () => toast.error('Failed to copy')
    );
  }, [markdown]);

  const reset = useCallback(() => {
    setHeaders(Array(INITIAL_COLS).fill(''));
    setRows(Array.from({ length: INITIAL_ROWS }, () => Array(INITIAL_COLS).fill('')));
    setAligns(INITIAL_ALIGNS);
    setViewMode('split');
    toast.success('Table reset');
  }, []);

  const hasContent = headers.some((h) => h.trim()) || rows.some((r) => r.some((c) => c.trim()));

  return (
    <ToolLayout
      title="Markdown Table Generator"
      description="Build Markdown tables visually — add rows & columns, set alignment, and copy ready-to-use Markdown or HTML."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={addColumn} className="btn-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Column
          </button>
          <button onClick={addRow} className="btn-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
          <button onClick={reset} className="btn-sm bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 flex items-center gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      {/* Table Editor */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Edit Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="w-10 p-1" />
                {headers.map((header, ci) => (
                  <th key={ci} className="p-1">
                    <div className="flex items-center gap-1">
                      <input
                        value={header}
                        onChange={(e) => updateHeader(ci, e.target.value)}
                        placeholder={`Header ${ci + 1}`}
                        className="input-field w-full font-semibold text-center text-xs py-1.5"
                        spellCheck={false}
                      />
                      <button
                        onClick={() => toggleAlign(ci)}
                        className="p-1 rounded hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-brand-400"
                        title={`Align: ${aligns[ci]} (click to cycle)`}
                      >
                        {(() => {
                          const Icon = ALIGN_ICONS[aligns[ci]];
                          return <Icon className="w-3.5 h-3.5" />;
                        })()}
                      </button>
                      {headers.length > 1 && (
                        <button
                          onClick={() => removeColumn(ci)}
                          className="p-1 rounded hover:bg-red-500/20 transition-colors text-slate-500 hover:text-red-400"
                          title="Remove column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  <td className="p-1 text-center">
                    <button
                      onClick={() => removeRow(ri)}
                      className="p-1 rounded hover:bg-red-500/20 transition-colors text-slate-500 hover:text-red-400 inline-flex"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-1">
                      <input
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        placeholder="..."
                        className="input-field w-full text-xs py-1.5"
                        spellCheck={false}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Output Section */}
      {hasContent && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Output</h2>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-surface border border-slate-700/50 rounded-lg p-0.5">
                {(['split', 'code', 'preview'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'split' && 'Split'}
                    {mode === 'code' && <Code className="w-3.5 h-3.5 inline mr-1" />}
                    {mode === 'code' && 'Markdown'}
                    {mode === 'preview' && <Eye className="w-3.5 h-3.5 inline mr-1" />}
                    {mode === 'preview' && 'Preview'}
                  </button>
                ))}
              </div>
              <button
                onClick={copyMarkdown}
                className="btn-sm bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 flex items-center gap-1.5 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Markdown
              </button>
            </div>
          </div>

          {viewMode === 'code' && (
            <div>
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Markdown</h3>
              <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap text-slate-300">
                {markdown || '// Add some headers and data above to see the output'}
              </pre>
            </div>
          )}

          {viewMode === 'preview' && (
            <div>
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Rendered Table</h3>
              <div
                className="bg-surface rounded-lg p-4 border border-slate-700/50 overflow-x-auto max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: tableHtml }}
              />
            </div>
          )}

          {viewMode === 'split' && (
            <div className="lg:grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Markdown</h3>
                <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap text-slate-300">
                  {markdown || '// Add some headers and data above to see the output'}
                </pre>
              </div>
              <div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Rendered Table</h3>
                <div
                  className="bg-surface rounded-lg p-4 border border-slate-700/50 overflow-x-auto max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: tableHtml }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasContent && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Generate Your Table</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Add rows and columns using the buttons above, fill in your headers and data, then copy the Markdown. Click the alignment icon next to each header to cycle through left, center, and right alignment.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}
