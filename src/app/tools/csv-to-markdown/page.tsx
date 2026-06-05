'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Download, Trash2, Table2, FileSpreadsheet,
  Upload, Settings2, AlignLeft, AlignCenter, AlignRight,
  Columns as ColumnsIcon, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Delimiter = ',' | '\t' | ';' | '|';
type ColumnAlign = 'left' | 'center' | 'right';

interface ParsedCSV {
  headers: string[];
  headersPresent: boolean;
  rows: string[][];
  error: string | null;
}

interface ConversionOptions {
  delimiter: Delimiter;
  hasHeader: boolean;
  columnAligns: ColumnAlign[];
  minify: boolean;
}

/* ─── Sample Data ────────────────────────────────────────────────────────── */

const SAMPLE_CSV = `Name,Role,Team,Location,Start Date
Alice Chen,Senior Engineer,Frontend,San Francisco,2023-03-15
Bob Müller,Design Lead,UX,Berlin,2022-11-01
Carol Smith,Product Manager,Product,New York,2023-01-10
Dave Patel,Backend Engineer,Platform,London,2022-08-22
Eve Johnson,DevOps Lead,Infra,Tokyo,2023-06-05`;

/* ─── CSV Parser ─────────────────────────────────────────────────────────── */

function parseCSV(input: string, delimiter: Delimiter): ParsedCSV {
  const empty = { headers: [], headersPresent: false, rows: [], error: null };

  if (!input.trim()) return empty;

  const lines = input.trim().split(/\r?\n/);
  if (lines.length === 0) return empty;

  const parsedLines: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const next = line[j + 1];

      if (inQuotes) {
        if (ch === '"') {
          if (next === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          row.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    row.push(current.trim());
    parsedLines.push(row);
  }

  if (parsedLines.length === 0) return empty;

  return {
    headers: parsedLines[0],
    headersPresent: true,
    rows: parsedLines.slice(1),
    error: null,
  };
}

/* ─── Markdown Generator ─────────────────────────────────────────────────── */

const ALIGN_MAP: Record<ColumnAlign, string> = {
  left: ':---',
  center: ':---:',
  right: '---:',
};

function mdEscape(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function csvToMarkdown(
  parsed: ParsedCSV,
  options: ConversionOptions,
): { markdown: string; headerRow: string[]; dataRows: string[][] } {
  const { hasHeader, columnAligns, minify } = options;

  if (parsed.error) {
    return { markdown: '', headerRow: [], dataRows: [] };
  }

  let allRows = parsed.headersPresent && hasHeader
    ? [parsed.headers, ...parsed.rows]
    : parsed.rows;

  if (allRows.length === 0) {
    return { markdown: '', headerRow: [], dataRows: [] };
  }

  const maxCols = allRows.reduce((max, row) => Math.max(max, row.length), 0);

  const normalizedRows = allRows.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('');
    return padded;
  });

  const headerRow = hasHeader && parsed.headersPresent
    ? parsed.headers
    : Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);

  const normalizedHeader = [...headerRow];
  while (normalizedHeader.length < maxCols) normalizedHeader.push('');

  const dataRows = hasHeader && parsed.headersPresent
    ? normalizedRows.slice(1)
    : normalizedRows;

  const mdLines: string[] = [];

  if (minify) {
    mdLines.push('|' + normalizedHeader.map((h) => mdEscape(h)).join('|') + '|');
    mdLines.push('|' + normalizedHeader.map((_, i) => {
      const align = columnAligns[i] || 'left';
      return ALIGN_MAP[align];
    }).join('|') + '|');
    for (const row of dataRows) {
      mdLines.push('|' + row.map((cell) => mdEscape(cell)).join('|') + '|');
    }
  } else {
    const colWidths = normalizedHeader.map((h, i) => {
      const allVals = [h, ...dataRows.map((r) => r[i] || '')];
      return Math.max(...allVals.map((v) => v.length), 3);
    });

    const padCell = (cell: string, width: number): string => {
      const escaped = mdEscape(cell);
      return ' ' + escaped + ' '.repeat(Math.max(0, width - cell.length)) + ' ';
    };

    mdLines.push('|' + normalizedHeader.map((h, i) => padCell(h, colWidths[i])).join('|') + '|');

    mdLines.push('|' + normalizedHeader.map((_, i) => {
      const align = columnAligns[i] || 'left';
      const alignStr = ALIGN_MAP[align];
      const width = colWidths[i];
      if (width <= 3) return alignStr;
      const extra = width - 3;
      return alignStr[0] + '-'.repeat(extra) + alignStr.slice(-1);
    }).join('|') + '|');

    for (const row of dataRows) {
      mdLines.push('|' + row.map((cell, i) => padCell(cell, colWidths[i])).join('|') + '|');
    }
  }

  return { markdown: mdLines.join('\n'), headerRow: normalizedHeader, dataRows };
}

/* ─── Markdown Table → HTML Renderer ─────────────────────────────────────── */

function renderMarkdownTable(markdown: string): string {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return '';

  const headerMatch = lines[0].match(/^\|(.+)\|$/);
  if (!headerMatch) return '';
  const headers = headerMatch[1].split('|').map((h) => h.trim());

  const separatorMatch = lines[1]?.match(/^\|(.+)\|$/);
  const alignments: string[] = [];
  if (separatorMatch) {
    alignments.push(
      ...separatorMatch[1].split('|').map((s) => {
        s = s.trim();
        if (s.startsWith(':') && s.endsWith(':')) return 'center';
        if (s.endsWith(':')) return 'right';
        return 'left';
      })
    );
  }

  let html = '<table class="w-full text-sm border-collapse"><thead><tr>';
  for (let i = 0; i < headers.length; i++) {
    const alignClass = `text-${alignments[i] || 'left'}`;
    html += `<th class="px-3 py-2 font-semibold text-slate-200 bg-slate-800 border-b border-slate-600 ${alignClass}">${escapeHtml(headers[i])}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 2; i < lines.length; i++) {
    const rowMatch = lines[i].match(/^\|(.+)\|$/);
    if (!rowMatch) continue;
    const cells = rowMatch[1].split('|').map((c) => c.trim().replace(/\\\|/g, '|'));
    const rowClass = (i - 2) % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/50';
    html += `<tr class="${rowClass} hover:bg-brand-500/10">`;
    for (let j = 0; j < cells.length; j++) {
      const escaped = escapeHtml(cells[j]).replace(/<br>/g, '<br>');
      const alignClass = `text-${alignments[j] || 'left'}`;
      const title = cells[j].replace(/"/g, '&quot;');
      html += `<td class="px-3 py-2 text-slate-300 border-b border-slate-700/50 max-w-[400px] truncate ${alignClass}" title="${title}">${escaped || '<span class="text-slate-600 italic">&mdash;</span>'}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DELIMITER_OPTIONS: { value: Delimiter; label: string; char: string }[] = [
  { value: ',', label: 'Comma', char: ',' },
  { value: '\t', label: 'Tab', char: '\\t' },
  { value: ';', label: 'Semicolon', char: ';' },
  { value: '|', label: 'Pipe', char: '|' },
];

const ALIGN_ICONS: Record<ColumnAlign, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

const ALIGN_LABELS: Record<ColumnAlign, string> = {
  left: 'Left',
  center: 'Center',
  right: 'Right',
};

/* ─── Page Component ─────────────────────────────────────────────────────── */

export default function CSVToMarkdownPage() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  const [hasHeader, setHasHeader] = useState(true);
  const [minify, setMinify] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo((): ParsedCSV => parseCSV(input, delimiter), [input, delimiter]);

  const [columnAligns, setColumnAligns] = useState<ColumnAlign[]>([]);

  const maxCols = useMemo(() => {
    const allRows = parsed.headersPresent && hasHeader
      ? [parsed.headers, ...parsed.rows]
      : parsed.rows;
    return allRows.reduce((max, row) => Math.max(max, row.length), 0);
  }, [parsed, hasHeader]);

  useMemo(() => {
    if (columnAligns.length !== maxCols) {
      if (maxCols === 0) {
        setColumnAligns([]);
      } else if (columnAligns.length < maxCols) {
        setColumnAligns((prev) => [...prev, ...Array(maxCols - prev.length).fill('left' as ColumnAlign)]);
      } else {
        setColumnAligns((prev) => prev.slice(0, maxCols));
      }
    }
  }, [maxCols, columnAligns.length]);

  const options: ConversionOptions = { delimiter, hasHeader, columnAligns: columnAligns.slice(0, maxCols), minify };

  const result = useMemo(
    () => csvToMarkdown(parsed, options),
    [parsed, options],
  );

  const renderedHtml = useMemo(() => {
    if (parsed.error || !result.markdown) return '';
    return renderMarkdownTable(result.markdown);
  }, [result.markdown, parsed.error]);

  const stats = useMemo(() => {
    if (parsed.error || result.dataRows.length === 0 && result.headerRow.length === 0) return null;
    const colCount = result.headerRow.length;
    const rowCount = result.dataRows.length;
    return `${rowCount} row${rowCount !== 1 ? 's' : ''} &times; ${colCount} column${colCount !== 1 ? 's' : ''}`;
  }, [result, parsed.error]);

  const handleCopy = useCallback(() => {
    if (!result.markdown) return;
    navigator.clipboard.writeText(result.markdown).then(
      () => toast.success('Markdown table copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [result.markdown]);

  const handleDownload = useCallback(() => {
    if (!result.markdown) return;
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded table.md');
  }, [result.markdown]);

  const handleClear = useCallback(() => setInput(''), []);
  const handleLoadSample = useCallback(() => setInput(SAMPLE_CSV), []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'tsv') setDelimiter('\t');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setInput(reader.result);
        toast.success(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsText(file);
  }, []);

  const handleCopyRendered = useCallback(() => {
    if (!renderedHtml) return;
    navigator.clipboard.writeText(renderedHtml).then(
      () => toast.success('HTML table copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [renderedHtml]);

  const setColumnAlign = useCallback((colIndex: number, align: ColumnAlign) => {
    setColumnAligns((prev) => {
      const next = [...prev];
      next[colIndex] = align;
      return next;
    });
  }, []);

  const displayHeaders = result.headerRow;
  const hasData = result.headerRow.length > 0;

  return (
    <ToolLayout
      title="CSV to Markdown Table"
      description="Paste or upload CSV data and instantly convert it to a formatted Markdown table — perfect for READMEs, GitHub issues, and documentation."
    >
      {/* Mode toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">CSV</span>
        </div>
        <span className="text-slate-500 mx-1">&rarr;</span>
        <Table2 className="w-4 h-4 text-brand-400" />
        <span className="text-sm font-medium text-brand-400">Markdown Table</span>
        <div className="flex-1" />
        {hasData && (
          <div className="flex items-center rounded-lg bg-slate-800 border border-slate-700 p-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                viewMode === 'raw'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw Markdown
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">CSV Input</label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Load sample
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
              disabled={!input}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your CSV data here..."
          className="w-full h-48 p-4 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 font-mono text-sm resize-y focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors"
          spellCheck={false}
        />
      </div>

      {/* Options bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-lg bg-surface-light border border-slate-700/50">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Delimiter:</label>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as Delimiter)}
            className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-brand-500/50"
          >
            {DELIMITER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.char})
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 accent-brand-500"
          />
          <span className="text-xs text-slate-400">First row is header</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={minify}
            onChange={(e) => setMinify(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 accent-brand-500"
          />
          <span className="text-xs text-slate-400">Compact (no padding)</span>
        </label>

        {hasData && displayHeaders.length > 0 && (
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
              showColumnSettings
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Column Alignments
            <ChevronDown className={`w-3 h-3 transition-transform ${showColumnSettings ? 'rotate-180' : ''}`} />
          </button>
        )}

        <div className="flex-1" />

        {result.markdown && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-brand-500/20 text-brand-400 rounded hover:bg-brand-500/30 transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download .md
            </button>
          </div>
        )}
      </div>

      {/* Column alignment settings panel */}
      {showColumnSettings && displayHeaders.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-slate-900 border border-slate-700/50">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Column Alignments
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayHeaders.map((header, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 truncate" title={header}>
                  {header || `Col ${i + 1}`}
                </span>
                <div className="flex rounded bg-slate-800 border border-slate-700 overflow-hidden">
                  {(['left', 'center', 'right'] as ColumnAlign[]).map((align) => {
                    const Icon = ALIGN_ICONS[align];
                    const isActive = (columnAligns[i] || 'left') === align;
                    return (
                      <button
                        key={align}
                        onClick={() => setColumnAlign(i, align)}
                        className={`flex-1 flex items-center justify-center py-1.5 transition-colors ${
                          isActive
                            ? 'bg-brand-500/30 text-brand-400'
                            : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700'
                        }`}
                        title={`${ALIGN_LABELS[align]} align`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {parsed.error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {parsed.error}
        </div>
      )}

      {/* Output */}
      {stats && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-slate-400">
            <ColumnsIcon className="w-3 h-3 inline mr-1" />
            {stats}
          </span>
        </div>
      )}

      {viewMode === 'raw' && result.markdown && (
        <div className="relative">
          <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono text-sm overflow-x-auto whitespace-pre leading-relaxed">
            <code>{result.markdown}</code>
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy markdown"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {viewMode === 'preview' && renderedHtml && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">Live Preview</span>
            <button
              onClick={handleCopyRendered}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy HTML
            </button>
          </div>
          <div
            className="p-1 rounded-lg bg-slate-900 border border-slate-700 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      )}

      {/* Empty state */}
      {!input.trim() && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-slate-400 font-medium mb-2">No CSV data yet</h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Paste CSV data above, upload a .csv file, or load the sample to get started.
            Supports commas, tabs, semicolons, and pipes as delimiters.
          </p>
        </div>
      )}

      {input.trim() && !result.markdown && !parsed.error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
            <Table2 className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-slate-400 font-medium mb-2">Nothing to convert</h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            The CSV data contains no rows to display. Add some data above.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}
