'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Trash2, Eye, Code, FileJson, Table2, Settings2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ConversionResult {
  html: string;
  headers: string[];
  rows: string[][];
  error: string | null;
}

interface Options {
  striped: boolean;
  hoverable: boolean;
  bordered: boolean;
  compact: boolean;
  responsive: boolean;
  alignHeader: 'left' | 'center' | 'right';
  alignCell: 'left' | 'center' | 'right';
}

// ── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_JSON = JSON.stringify([
  { name: 'Alice Chen', role: 'Senior Engineer', team: 'Frontend', location: 'NYC', startDate: '2024-03-15' },
  { name: 'Bob Martinez', role: 'Design Lead', team: 'UX', location: 'London', startDate: '2023-11-01' },
  { name: 'Carol Park', role: 'Product Manager', team: 'Product', location: 'Berlin', startDate: '2025-01-10' },
  { name: 'Dave Kim', role: 'Engineer', team: 'Backend', location: 'Tokyo', startDate: '2024-08-22' },
  { name: 'Eve Johansson', role: 'Engineering Manager', team: 'Platform', location: 'Stockholm', startDate: '2023-06-05' },
], null, 2);

// ── Conversion Logic ───────────────────────────────────────────────────────

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonToHtml(input: string, opts: Options): ConversionResult {
  const empty = { html: '', headers: [], rows: [], error: null };

  if (!input.trim()) return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { ...empty, error: 'Invalid JSON — check your syntax.' };
  }

  if (!Array.isArray(parsed)) {
    return { ...empty, error: 'Input must be a JSON array of objects.' };
  }

  if (parsed.length === 0) {
    return { ...empty, error: 'JSON array is empty — nothing to convert.' };
  }

  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i] === null || typeof parsed[i] !== 'object' || Array.isArray(parsed[i])) {
      return { ...empty, error: `Item at index ${i} is not a plain object. All items must be objects.` };
    }
  }

  const items = parsed as Record<string, unknown>[];

  // Collect union of all keys (preserving insertion order is nice-to-have, but Set for dedup)
  const keySet = new Set<string>();
  for (const item of items) {
    Object.keys(item).forEach((k) => keySet.add(k));
  }
  const headers = Array.from(keySet);

  if (headers.length === 0) {
    return { ...empty, error: 'Objects have no properties — nothing to tabulate.' };
  }

  // Build rows
  const rows: string[][] = [];
  for (const item of items) {
    const row: string[] = [];
    for (const h of headers) {
      const val = item[h];
      if (val === null || val === undefined) {
        row.push('');
      } else if (typeof val === 'object') {
        row.push(JSON.stringify(val));
      } else {
        row.push(String(val));
      }
    }
    rows.push(row);
  }

  // ── Build CSS classes ──────────────────────────────────────────────────

  const tableClasses: string[] = [];
  tableClasses.push('devbench-table');

  if (opts.striped) tableClasses.push('devbench-table--striped');
  if (opts.hoverable) tableClasses.push('devbench-table--hoverable');
  if (opts.bordered) tableClasses.push('devbench-table--bordered');
  if (opts.compact) tableClasses.push('devbench-table--compact');

  const thAlign = opts.alignHeader !== 'left' ? ` style="text-align:${opts.alignHeader}"` : '';
  const tdAlign = opts.alignCell !== 'left' ? ` style="text-align:${opts.alignCell}"` : '';

  // ── Build embedded CSS ─────────────────────────────────────────────────

  const cssLines: string[] = [];
  cssLines.push('.devbench-table { width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; }');
  cssLines.push('.devbench-table th { padding: 10px 14px; text-align: left; font-weight: 600; background: #1e293b; color: #e2e8f0; border-bottom: 2px solid #475569; white-space: nowrap; }');
  cssLines.push('.devbench-table td { padding: 9px 14px; text-align: left; color: #cbd5e1; border-bottom: 1px solid #334155; }');

  if (opts.striped) {
    cssLines.push('.devbench-table--striped tbody tr:nth-child(even) td { background: rgba(30, 41, 59, 0.5); }');
  }

  if (opts.hoverable) {
    cssLines.push('.devbench-table--hoverable tbody tr:hover td { background: rgba(59, 130, 246, 0.1); }');
  }

  if (opts.bordered) {
    cssLines.push('.devbench-table--bordered th, .devbench-table--bordered td { border: 1px solid #475569; }');
  }

  if (opts.compact) {
    cssLines.push('.devbench-table--compact th { padding: 6px 10px; font-size: 13px; }');
    cssLines.push('.devbench-table--compact td { padding: 5px 10px; font-size: 13px; }');
  }

  if (opts.responsive) {
    cssLines.push('.devbench-table-wrapper { overflow-x: auto; max-width: 100%; }');
    cssLines.push('.devbench-table-wrapper .devbench-table { min-width: 600px; }');
  }

  // ── Build HTML ─────────────────────────────────────────────────────────

  const htmlParts: string[] = [];

  // Embedded style
  htmlParts.push('<style>');
  htmlParts.push(...cssLines);
  htmlParts.push('</style>');

  // Optional responsive wrapper
  if (opts.responsive) {
    htmlParts.push('<div class="devbench-table-wrapper">');
  }

  htmlParts.push(`<table class="${tableClasses.join(' ')}">`);

  // Thead
  htmlParts.push('  <thead>');
  htmlParts.push('    <tr>');
  for (const h of headers) {
    htmlParts.push(`      <th${thAlign}>${htmlEscape(h)}</th>`);
  }
  htmlParts.push('    </tr>');
  htmlParts.push('  </thead>');

  // Tbody
  htmlParts.push('  <tbody>');
  for (const row of rows) {
    htmlParts.push('    <tr>');
    for (const cell of row) {
      htmlParts.push(`      <td${tdAlign}>${htmlEscape(cell)}</td>`);
    }
    htmlParts.push('    </tr>');
  }
  htmlParts.push('  </tbody>');

  htmlParts.push('</table>');

  if (opts.responsive) {
    htmlParts.push('</div>');
  }

  const html = htmlParts.join('\n');

  return { html, headers, rows, error: null };
}

// ── Inline HTML Preview Renderer ──────────────────────────────────────────

function renderHtmlPreview(html: string): string {
  // Strip <style> from preview — let the page CSS handle it
  return html.replace(/<style>[\s\S]*?<\/style>\n?/g, '');
}

// ── Options Panel Component ────────────────────────────────────────────────

function OptionsPanel({ opts, onChange }: { opts: Options; onChange: (o: Options) => void }) {
  const toggle = (key: keyof Options) => {
    if (typeof opts[key] === 'boolean') {
      onChange({ ...opts, [key]: !opts[key] });
    }
  };

  return (
    <details className="card mb-6 group">
      <summary className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-300 hover:text-slate-100">
        <Settings2 className="w-4 h-4 text-brand-400" />
        <span>Table Options</span>
        <ChevronDown className="w-4 h-4 ml-auto transition-transform group-open:rotate-180 text-slate-500" />
      </summary>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toggles */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={opts.striped}
            onChange={() => toggle('striped')}
            className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-300">Striped rows</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={opts.hoverable}
            onChange={() => toggle('hoverable')}
            className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-300">Hover effect</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={opts.bordered}
            onChange={() => toggle('bordered')}
            className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-300">Cell borders</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={opts.compact}
            onChange={() => toggle('compact')}
            className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-300">Compact mode</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={opts.responsive}
            onChange={() => toggle('responsive')}
            className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-300">Responsive wrapper</span>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Header alignment */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Header alignment</label>
          <select
            value={opts.alignHeader}
            onChange={(e) => onChange({ ...opts, alignHeader: e.target.value as Options['alignHeader'] })}
            className="w-full rounded-lg bg-surface border border-slate-700 text-sm text-slate-200 px-3 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        {/* Cell alignment */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Cell alignment</label>
          <select
            value={opts.alignCell}
            onChange={(e) => onChange({ ...opts, alignCell: e.target.value as Options['alignCell'] })}
            className="w-full rounded-lg bg-surface border border-slate-700 text-sm text-slate-200 px-3 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    </details>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────

export default function JsonHtmlTablePage() {
  const [input, setInput] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [opts, setOpts] = useState<Options>({
    striped: true,
    hoverable: true,
    bordered: false,
    compact: false,
    responsive: true,
    alignHeader: 'left',
    alignCell: 'left',
  });

  const result = useMemo((): ConversionResult => jsonToHtml(input, opts), [input, opts]);

  const stats = useMemo(() => {
    if (result.error || !result.headers.length) return null;
    const rowCount = result.rows.length;
    const colCount = result.headers.length;
    const htmlSize = new Blob([result.html]).size;
    const sizeStr = htmlSize < 1024 ? `${htmlSize} B` : `${(htmlSize / 1024).toFixed(1)} KB`;
    return `${rowCount} row${rowCount !== 1 ? 's' : ''} × ${colCount} column${colCount !== 1 ? 's' : ''} · ${sizeStr}`;
  }, [result]);

  const renderedPreview = useMemo(() => {
    if (result.error || !result.html) return '';
    return renderHtmlPreview(result.html);
  }, [result.html, result.error]);

  const handleCopy = useCallback(() => {
    if (!result.html) return;
    navigator.clipboard.writeText(result.html).then(
      () => toast.success('HTML table copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [result.html]);

  const handleDownload = useCallback(() => {
    if (!result.html) return;
    const blob = new Blob(['<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Table</title>\n', result.html, '\n</head>\n<body>\n</body>\n</html>\n'], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded table.html');
  }, [result.html]);

  const handleClear = useCallback(() => setInput(''), []);
  const handleLoadSample = useCallback(() => setInput(SAMPLE_JSON), []);

  return (
    <ToolLayout
      title="JSON to HTML Table"
      description="Convert a JSON array of objects into a clean, styled HTML table — embedded CSS, customizable options, and instant preview."
    >
      {/* Mode toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium text-brand-400">JSON</span>
        </div>
        <span className="text-slate-500 mx-1">&rarr;</span>
        <Table2 className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-400">HTML Table</span>
        <div className="flex-1" />
        <button
          onClick={handleLoadSample}
          className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
        >
          Load sample
        </button>
      </div>

      {/* Options */}
      <OptionsPanel opts={opts} onChange={setOpts} />

      {/* Input */}
      <div className="card">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste a JSON array of objects here...\n\nExample:\n[\n  { "name": "Alice", "role": "Engineer" },\n  { "name": "Bob", "role": "Designer" }\n]`}
          className="input-field min-h-[220px] font-mono text-sm"
          spellCheck={false}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-500">{input.length.toLocaleString()} characters</span>
          <button onClick={handleClear} className="btn-secondary text-xs px-3 py-1.5">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </button>
        </div>
      </div>

      {/* Output */}
      {result.error ? (
        <div className="card border-red-500/30 bg-red-500/5 mt-6">
          <div className="flex items-center gap-2 text-red-400">
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-sm text-red-300 mt-1">{result.error}</p>
        </div>
      ) : result.html ? (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === 'raw'
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" /> Raw HTML
                </button>
              </div>
              {stats && (
                <span className="text-xs text-slate-500">{stats}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="btn-secondary text-xs px-3 py-1.5">
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </button>
              <button onClick={handleDownload} className="btn-secondary text-xs px-3 py-1.5">
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </button>
            </div>
          </div>

          {viewMode === 'preview' ? (
            <div
              className="overflow-x-auto rounded-lg border border-slate-700/50"
              style={{ background: '#0f172a', padding: '0' }}
              dangerouslySetInnerHTML={{ __html: renderedPreview }}
            />
          ) : (
            <pre className="bg-surface-dark rounded-lg p-4 overflow-x-auto border border-slate-700/50 text-sm font-mono text-slate-300 whitespace-pre">
              <code>{result.html}</code>
            </pre>
          )}
        </div>
      ) : (
        <div className="card mt-6 border-dashed border-slate-700/50">
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Table2 className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Paste JSON above to see the HTML table here</p>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="card border-l-4 border-l-brand-500/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Input format</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>&bull; Must be a JSON array of objects</li>
            <li>&bull; Nested objects are serialized with <code className="text-brand-400 bg-brand-500/10 px-1 rounded">JSON.stringify()</code></li>
            <li>&bull; Missing keys appear as empty cells</li>
            <li>&bull; HTML entities in values are auto-escaped</li>
          </ul>
        </div>
        <div className="card border-l-4 border-l-amber-500/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Output features</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>&bull; Self-contained with embedded CSS — no dependencies</li>
            <li>&bull; Toggle striped rows, hover effects, borders, compact mode</li>
            <li>&bull; Responsive wrapper for mobile-friendly tables</li>
            <li>&bull; Download as standalone <code className="text-amber-400 bg-amber-500/10 px-1 rounded">table.html</code></li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
