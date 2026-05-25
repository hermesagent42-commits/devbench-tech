'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Trash2, Eye, Code, FileJson, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ConversionResult {
  markdown: string;
  headers: string[];
  rows: string[][];
  error: string | null;
}

// ── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_JSON = JSON.stringify([
  { name: 'Alice', role: 'Engineer', team: 'Frontend', location: 'NYC' },
  { name: 'Bob', role: 'Designer', team: 'UX', location: 'London' },
  { name: 'Carol', role: 'PM', team: 'Product', location: 'Berlin' },
  { name: 'Dave', role: 'Engineer', team: 'Backend', location: 'Tokyo' },
], null, 2);

// ── Conversion Logic ───────────────────────────────────────────────────────

function mdEscape(value: string): string {
  // Escape pipe characters in cell values
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function jsonToMarkdown(input: string): ConversionResult {
  const empty = { markdown: '', headers: [], rows: [], error: null };

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

  // Validate all items are objects
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i] === null || typeof parsed[i] !== 'object' || Array.isArray(parsed[i])) {
      return { ...empty, error: `Item at index ${i} is not a plain object. All items must be objects.` };
    }
  }

  const items = parsed as Record<string, unknown>[];

  // Collect union of all keys
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

  // Build markdown table
  const mdRows: string[] = [];

  // Header row
  mdRows.push('| ' + headers.map((h) => mdEscape(h)).join(' | ') + ' |');

  // Separator row (all left-aligned by default)
  mdRows.push('| ' + headers.map(() => '---').join(' | ') + ' |');

  // Data rows
  for (const row of rows) {
    mdRows.push('| ' + row.map((cell) => mdEscape(cell)).join(' | ') + ' |');
  }

  const markdown = mdRows.join('\n');

  return { markdown, headers, rows, error: null };
}

// ── Simple Markdown Table → HTML Renderer ──────────────────────────────────

function renderMarkdownTable(markdown: string): string {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return '';

  // Parse header row
  const headerMatch = lines[0].match(/^\|(.+)\|$/);
  if (!headerMatch) return '';
  const headers = headerMatch[1].split('|').map((h) => h.trim());

  // Skip separator row (line 1)
  let html = '<table class="w-full text-sm border-collapse"><thead><tr>';
  for (const h of headers) {
    html += `<th class="px-3 py-2 text-left font-semibold text-slate-200 bg-slate-800 border-b border-slate-600">${h.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 2; i < lines.length; i++) {
    const rowMatch = lines[i].match(/^\|(.+)\|$/);
    if (!rowMatch) continue;
    const cells = rowMatch[1].split('|').map((c) => c.trim().replace(/\\\|/g, '|'));
    const rowClass = (i - 2) % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/50';
    html += `<tr class="${rowClass} hover:bg-brand-500/10">`;
    for (const cell of cells) {
      const escaped = cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/<br>/g, '<br>');
      html += `<td class="px-3 py-2 text-slate-300 border-b border-slate-700/50 max-w-[400px] truncate" title="${cell.replace(/"/g, '&quot;')}">${escaped || '<span class="text-slate-600 italic">—</span>'}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

// ── Page Component ─────────────────────────────────────────────────────────

export default function JsonToMarkdownTablePage() {
  const [input, setInput] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  const result = useMemo((): ConversionResult => jsonToMarkdown(input), [input]);

  const stats = useMemo(() => {
    if (result.error || !result.headers.length) return null;
    const rowCount = result.rows.length;
    const colCount = result.headers.length;
    return `${rowCount} row${rowCount !== 1 ? 's' : ''} &times; ${colCount} column${colCount !== 1 ? 's' : ''}`;
  }, [result]);

  const renderedHtml = useMemo(() => {
    if (result.error || !result.markdown) return '';
    return renderMarkdownTable(result.markdown);
  }, [result.markdown, result.error]);

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
  const handleLoadSample = useCallback(() => setInput(SAMPLE_JSON), []);

  return (
    <ToolLayout
      title="JSON to Markdown Table"
      description="Convert a JSON array of objects into a formatted Markdown table — perfect for READMEs, docs, and PR descriptions."
    >
      {/* Mode toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium text-brand-400">JSON</span>
        </div>
        <span className="text-slate-500 mx-1">&rarr;</span>
        <Table2 className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-400">Markdown Table</span>
        <div className="flex-1" />
        <button
          onClick={handleLoadSample}
          className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
        >
          Load sample
        </button>
      </div>

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
      ) : result.markdown ? (
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
                  <Code className="w-3.5 h-3.5" /> Raw Markdown
                </button>
              </div>
              {stats && (
                <span className="text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: stats }} />
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
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <pre className="bg-surface-dark rounded-lg p-4 overflow-x-auto border border-slate-700/50 text-sm font-mono text-slate-300 whitespace-pre">
              <code>{result.markdown}</code>
            </pre>
          )}
        </div>
      ) : (
        <div className="card mt-6 border-dashed border-slate-700/50">
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Table2 className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Paste JSON on the left to see the Markdown table here</p>
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
            <li>&bull; Pipe (<code className="text-brand-400 bg-brand-500/10 px-1 rounded">|</code>) characters in values are escaped</li>
          </ul>
        </div>
        <div className="card border-l-4 border-l-green-500/50">
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Output format</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>&bull; Standard GitHub-Flavored Markdown table</li>
            <li>&bull; All columns left-aligned by default</li>
            <li>&bull; Use the <strong>Preview</strong> tab to see rendered output</li>
            <li>&bull; Copy raw Markdown or download as <code className="text-green-400 bg-green-500/10 px-1 rounded">table.md</code></li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
