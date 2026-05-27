'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── CSV Parser (RFC 4180, zero deps) ───────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else if (ch === '\r') {
        if (next === '\n') continue;
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += ch;
      }
    }
  }

  currentRow.push(currentField);
  if (currentRow.length > 0 && !(currentRow.length === 1 && currentField === '')) {
    rows.push(currentRow);
  }

  if (rows.length > 0) {
    const maxCols = Math.max(...rows.map((r) => r.length));
    for (const row of rows) {
      while (row.length < maxCols) row.push('');
    }
  }

  return rows;
}

function toCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(','),
    )
    .join('\n');
}

function toMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  const [header, ...body] = rows;
  const sep = `| ${header.map(() => '---').join(' | ')} |`;
  const headerLine = `| ${header.join(' | ')} |`;
  const bodyLines = body.map((row) => `| ${row.join(' | ')} |`);
  return [headerLine, sep, ...bodyLines].join('\n');
}

function toTSV(rows: string[][]): string {
  return rows.map((row) => row.join('\t')).join('\n');
}

// ── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_CSV = `Name,Email,Role,Department,Salary,Start Date
Alice Chen,alice@acme.com,Engineer,Engineering,95000,2024-01-15
Bob Martinez,bob@acme.com,Designer,Design,82000,2023-06-01
Carol Nguyen,carol@acme.com,Manager,Engineering,125000,2022-03-10
Dave Okafor,dave@acme.com,Engineer,Engineering,90000,2024-02-20
Eva Johansson,eva@acme.com,Analyst,Analytics,78000,2023-09-05
Frank Tanaka,frank@acme.com,Engineer,Engineering,105000,2022-11-18
Grace Williams,grace@acme.com,Designer,Design,85000,2024-04-01
Hassan Ali,hassan@acme.com,Manager,Analytics,130000,2021-07-22`;

// ── Column stats ───────────────────────────────────────────────────────────

function colStats(col: string[]): { count: number; numeric: boolean; min?: number; max?: number; avg?: number; sum?: number } {
  const count = col.length;
  const allNums: number[] = [];
  for (const v of col) {
    const n = Number(v);
    if (!isNaN(n) && String(n) === v.trim()) allNums.push(n);
  }
  const numeric = allNums.length > count / 2;
  if (!numeric) return { count, numeric: false };
  const min = Math.min(...allNums);
  const max = Math.max(...allNums);
  const sum = allNums.reduce((a, b) => a + b, 0);
  const avg = sum / allNums.length;
  return { count, numeric: true, min, max, avg, sum };
}

// ── Utility ────────────────────────────────────────────────────────────────

function columnLetter(index: number): string {
  let letters = '';
  let n = index;
  while (n >= 0) {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

// ── Editable Cell ──────────────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  isHeader,
}: {
  value: string;
  onChange: (v: string) => void;
  isHeader?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(() => {
    onChange(draft);
    setEditing(false);
  }, [draft, onChange]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            commit();
          }
        }}
        autoFocus
        className={`w-full bg-slate-700 border border-brand-500 rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 outline-none ${
          isHeader ? 'font-semibold' : ''
        }`}
      />
    );
  }

  return (
    <div
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`cursor-text px-1.5 py-0.5 min-h-[24px] text-xs font-mono truncate ${
        isHeader ? 'font-semibold text-slate-200' : 'text-slate-300'
      }`}
      title={value}
    >
      {value || '\u00A0'}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSVViewerPage() {
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const [rows, setRows] = useState<string[][]>(() => parseCSV(SAMPLE_CSV));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const rowsPerPage = 25;

  const handleParse = useCallback(() => {
    setRows(parseCSV(csvInput));
    setSortColumn(null);
    setPage(0);
    setSearchQuery('');
  }, [csvInput]);

  const updateCell = useCallback((rowIdx: number, colIdx: number, value: string) => {
    setRows((prev) => {
      const next = prev.map((r) => [...r]);
      if (rowIdx < next.length && colIdx < next[rowIdx].length) {
        next[rowIdx][colIdx] = value;
      }
      return next;
    });
  }, []);

  const handleSort = useCallback(
    (colIdx: number) => {
      if (sortColumn === colIdx) {
        if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else {
          setSortColumn(null);
          setSortDirection('asc');
        }
      } else {
        setSortColumn(colIdx);
        setSortDirection('asc');
      }
    },
    [sortColumn, sortDirection],
  );

  const addRow = useCallback(() => {
    setRows((prev) => {
      if (prev.length === 0) return [['']];
      const colCount = prev[0].length;
      return [...prev, Array(colCount).fill('')];
    });
    setPage(Math.floor(rows.length / rowsPerPage));
  }, [rows.length]);

  const removeRow = useCallback(() => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const addColumn = useCallback(() => {
    setRows((prev) => {
      if (prev.length === 0) return [['']];
      return prev.map((row) => [...row, '']);
    });
  }, []);

  const removeColumn = useCallback(() => {
    setRows((prev) => {
      if (prev.length === 0 || prev[0].length <= 1) return prev;
      return prev.map((row) => row.slice(0, -1));
    });
  }, []);

  const copyCSV = useCallback(() => {
    navigator.clipboard.writeText(toCSV(rows));
    toast.success('CSV copied to clipboard!');
  }, [rows]);

  const copyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(toMarkdownTable(rows));
    toast.success('Markdown table copied!');
  }, [rows]);

  const copyTSV = useCallback(() => {
    navigator.clipboard.writeText(toTSV(rows));
    toast.success('TSV copied!');
  }, [rows]);

  const downloadCSV = useCallback(() => {
    const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  }, [rows]);

  const reset = useCallback(() => {
    setCsvInput(SAMPLE_CSV);
    setRows(parseCSV(SAMPLE_CSV));
    setSearchQuery('');
    setSortColumn(null);
    setSortDirection('asc');
    setPage(0);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────

  const hasHeader = rows.length > 0;
  const headerRow = hasHeader ? rows[0] : [];
  const dataRows = hasHeader ? rows.slice(1) : [];

  const filteredDataRows = useMemo(() => {
    if (!searchQuery.trim()) return dataRows;
    const q = searchQuery.toLowerCase();
    return dataRows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
  }, [dataRows, searchQuery]);

  const sortedDataRows = useMemo(() => {
    if (sortColumn === null) return filteredDataRows;
    const sorted = [...filteredDataRows];
    sorted.sort((a, b) => {
      const va = a[sortColumn] ?? '';
      const vb = b[sortColumn] ?? '';
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return sortDirection === 'asc' ? na - nb : nb - na;
      }
      return sortDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return sorted;
  }, [filteredDataRows, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedDataRows.length / rowsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = sortedDataRows.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

  const stats = useMemo(() => {
    if (!hasHeader) return [];
    const colCount = headerRow.length;
    return Array.from({ length: colCount }, (_, ci) => {
      const col = dataRows.map((r) => r[ci] ?? '');
      return colStats(col);
    });
  }, [headerRow.length, dataRows, hasHeader]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSV Viewer & Editor"
      description="Paste CSV data, view as an interactive table, edit cells inline, sort by column, filter rows, and export to CSV/TSV/Markdown. 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyCSV} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy CSV
          </button>
          <button onClick={copyTSV} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy TSV
          </button>
          <button onClick={copyMarkdown} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy MD
          </button>
          <button onClick={downloadCSV} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button onClick={reset} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-200">CSV Input</label>
            <button
              onClick={handleParse}
              className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded font-medium transition-colors"
            >
              Parse CSV
            </button>
          </div>
          <textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            rows={6}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500 resize-y"
            placeholder="Paste CSV data here..."
            spellCheck={false}
          />
        </div>

        {/* Toolbar */}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Filter rows..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
              {searchQuery && (
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {filteredDataRows.length} of {dataRows.length} rows
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={addRow} className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1" title="Add row">
                <Plus className="w-3 h-3" /> Row
              </button>
              <button onClick={removeRow} className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1" title="Remove last row">
                <Trash2 className="w-3 h-3" /> Row
              </button>
              <button onClick={addColumn} className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1" title="Add column">
                <Plus className="w-3 h-3" /> Col
              </button>
              <button onClick={removeColumn} className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1" title="Remove last column">
                <Trash2 className="w-3 h-3" /> Col
              </button>
              <button
                onClick={() => setShowStats(!showStats)}
                className={`btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1 ${showStats ? '!border-brand-500/40 !bg-brand-500/10' : ''}`}
                title="Toggle column stats"
              >
                <BarChart3 className="w-3 h-3" />
                Stats
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {rows.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <div className="min-w-max">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="sticky left-0 bg-slate-800 px-2 py-1.5 text-[10px] text-slate-500 font-medium border-b border-slate-700/50 w-8 text-center">
                        #
                      </th>
                      {headerRow.map((cell, ci) => (
                        <th
                          key={ci}
                          className="px-1 py-1 border-b border-slate-700/50 cursor-pointer select-none hover:bg-slate-700/50 transition-colors group min-w-[80px] max-w-[200px]"
                          onClick={() => handleSort(ci)}
                          title={`Sort by column ${columnLetter(ci)}`}
                        >
                          <div className="flex items-center gap-1 px-1.5">
                            <EditableCell
                              value={cell}
                              onChange={(v) => updateCell(0, ci, v)}
                              isHeader
                            />
                            <span className="text-slate-600 shrink-0">
                              {sortColumn === ci ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="w-3 h-3 text-brand-400" />
                                ) : (
                                  <ArrowDown className="w-3 h-3 text-brand-400" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-600 px-1.5">{columnLetter(ci)}</div>
                        </th>
                      ))}
                    </tr>
                    {showStats && (
                      <tr className="bg-slate-800/50">
                        <th className="sticky left-0 bg-slate-800/50 px-2 py-1 border-b border-slate-700/50" />
                        {stats.map((stat, ci) => (
                          <th key={ci} className="px-2 py-1 border-b border-slate-700/50 text-[10px] text-slate-500 font-normal">
                            {stat.numeric ? (
                              <div className="space-y-0.5">
                                <div className="flex gap-2">
                                  <span>Min: <span className="text-slate-300 font-mono">{stat.min}</span></span>
                                  <span>Max: <span className="text-slate-300 font-mono">{stat.max}</span></span>
                                </div>
                                <div className="flex gap-2">
                                  <span>Avg: <span className="text-slate-300 font-mono">{stat.avg?.toFixed(1)}</span></span>
                                  <span>Sum: <span className="text-slate-300 font-mono">{stat.sum}</span></span>
                                </div>
                              </div>
                            ) : (
                              <span>{stat.count} values</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>

                  <tbody>
                    {paginatedRows.map((row, ri) => {
                      const globalIdx = safePage * rowsPerPage + ri + 1;
                      return (
                        <tr
                          key={ri}
                          className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="sticky left-0 bg-slate-900 px-2 py-1 text-[10px] text-slate-500 font-mono text-center border-r border-slate-700/30">
                            {globalIdx}
                          </td>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="px-1 py-0.5 border-r border-slate-700/20 min-w-[80px] max-w-[200px]"
                            >
                              <EditableCell
                                value={cell}
                                onChange={(v) => updateCell(globalIdx, ci, v)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-xs text-slate-400">
                  Page {safePage + 1} of {totalPages}
                  <span className="text-slate-600 ml-1">({sortedDataRows.length} rows)</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Summary */}
            <div className="text-xs text-slate-500 text-center">
              {rows.length > 0 && (
                <>
                  {rows[0].length} columns × {rows.length - 1} rows{searchQuery ? ` (filtered: ${filteredDataRows.length})` : ''}
                  {sortColumn !== null && ` · sorted by column ${columnLetter(sortColumn)} ${sortDirection === 'asc' ? '↑' : '↓'}`}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No data yet. Paste CSV and click Parse.</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
