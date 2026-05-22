'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, ArrowRightLeft, Table2, FileJson, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Mode = 'json-to-csv' | 'csv-to-json';

interface ConversionResult {
  output: string;
  tableData: Record<string, string>[];
  headers: string[];
  error: string | null;
}

// ── CSV Utilities ──────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvParse(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return null;

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    if (parsed.length > 0 && parsed.some((c) => c !== '')) {
      rows.push(parsed);
    }
  }

  return { headers, rows };
}

// ── Flatten nested objects for CSV ─────────────────────────────────────────

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value === null || value === undefined ? '' : String(value);
    }
  }
  return result;
}

// ── Samples ────────────────────────────────────────────────────────────────

const JSON_SAMPLE = `[
  { "name": "Alice", "email": "alice@example.com", "role": "admin", "active": true },
  { "name": "Bob", "email": "bob@example.com", "role": "editor", "active": false },
  { "name": "Charlie", "email": "charlie@example.com", "role": "viewer", "active": true }
]`;

const CSV_SAMPLE = `name,email,role,active
Alice,alice@example.com,admin,true
Bob,bob@example.com,editor,false
Charlie,charlie@example.com,viewer,true`;

// ── Component ──────────────────────────────────────────────────────────────

export default function JsonCsvConverterPage() {
  const [mode, setMode] = useState<Mode>('json-to-csv');
  const [input, setInput] = useState(JSON_SAMPLE);
  const [copied, setCopied] = useState(false);

  // Parse and convert
  const result = useMemo((): ConversionResult => {
    if (!input.trim()) {
      return { output: '', tableData: [], headers: [], error: null };
    }

    if (mode === 'json-to-csv') {
      try {
        const parsed = JSON.parse(input.trim());
        if (!Array.isArray(parsed)) {
          return { output: '', tableData: [], headers: [], error: 'Input must be a JSON array of objects. Example: [{ "key": "value" }]' };
        }
        if (parsed.length === 0) {
          return { output: '', tableData: [], headers: [], error: 'Array is empty. Provide at least one object.' };
        }
        if (typeof parsed[0] !== 'object' || parsed[0] === null) {
          return { output: '', tableData: [], headers: [], error: 'Array must contain objects. Example: [{ "name": "Alice" }]' };
        }

        // Collect all keys from all objects (for sparse objects)
        const allKeys = new Set<string>();
        const flatRows = parsed.map((item) => {
          const flat = flattenObject(item as Record<string, unknown>);
          Object.keys(flat).forEach((k) => allKeys.add(k));
          return flat;
        });

        const headers = Array.from(allKeys);
        const csvLines = [headers.map(csvEscape).join(',')];
        for (const row of flatRows) {
          csvLines.push(headers.map((h) => csvEscape(row[h] ?? '')).join(','));
        }

        const tableData = flatRows.map((row) => {
          const obj: Record<string, string> = {};
          for (const h of headers) {
            obj[h] = row[h] ?? '';
          }
          return obj;
        });

        return { output: csvLines.join('\n'), tableData, headers, error: null };
      } catch (e) {
        const msg = e instanceof SyntaxError ? `Invalid JSON: ${e.message}` : 'Conversion error';
        return { output: '', tableData: [], headers: [], error: msg };
      }
    }

    // CSV → JSON
    const parsed = csvParse(input.trim());
    if (!parsed) {
      return { output: '', tableData: [], headers: [], error: 'Could not parse CSV. Ensure the first line contains headers.' };
    }

    const { headers, rows } = parsed;
    const jsonRows = rows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = i < row.length ? row[i] : '';
      });
      return obj;
    });

    try {
      return {
        output: JSON.stringify(jsonRows, null, 2),
        tableData: jsonRows,
        headers,
        error: null,
      };
    } catch (e) {
      return { output: '', tableData: [], headers: [], error: 'Failed to generate JSON output.' };
    }
  }, [input, mode]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [result.output]);

  const handleDownload = useCallback(() => {
    if (!result.output) return;
    const ext = mode === 'json-to-csv' ? 'csv' : 'json';
    const mime = mode === 'json-to-csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([result.output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded output.${ext}`);
  }, [result.output, mode]);

  const swapMode = useCallback(() => {
    const newMode: Mode = mode === 'json-to-csv' ? 'csv-to-json' : 'json-to-csv';
    if (newMode === 'csv-to-json') {
      setInput(CSV_SAMPLE);
    } else {
      setInput(JSON_SAMPLE);
    }
    setMode(newMode);
  }, [mode]);

  const loadSample = useCallback(() => {
    setInput(mode === 'json-to-csv' ? JSON_SAMPLE : CSV_SAMPLE);
  }, [mode]);

  const isEmpty = !input.trim();
  const stats = result.tableData.length > 0
    ? `${result.tableData.length} row${result.tableData.length !== 1 ? 's' : ''} × ${result.headers.length} column${result.headers.length !== 1 ? 's' : ''}`
    : null;

  return (
    <ToolLayout
      title="JSON ↔ CSV Converter"
      description="Convert between JSON and CSV formats bidirectionally. Table preview, CSV escaping, download, copy — all client-side."
    >
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => { setMode('json-to-csv'); setInput(JSON_SAMPLE); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-r border-slate-700/50 ${
              mode === 'json-to-csv' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-4 h-4" />
            JSON → CSV
          </button>
          <button
            onClick={() => { setMode('csv-to-json'); setInput(CSV_SAMPLE); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === 'csv-to-json' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV → JSON
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadSample} className="text-xs text-slate-400 hover:text-brand-400 transition-colors">
            Load sample
          </button>
          <button
            onClick={swapMode}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface border border-slate-700/50 transition-colors"
            title="Swap direction"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Swap
          </button>
        </div>
      </div>

      {/* Input + Output grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              {mode === 'json-to-csv' ? (
                <><FileJson className="w-4 h-4 text-brand-400" />Input JSON</>
              ) : (
                <><FileSpreadsheet className="w-4 h-4 text-green-400" />Input CSV</>
              )}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {input.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-64 bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 placeholder-slate-600"
            placeholder={mode === 'json-to-csv' ? 'Paste JSON array of objects...' : 'Paste CSV data with headers...'}
            spellCheck={false}
          />
          {result.error && (
            <div className="mt-3 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              {mode === 'json-to-csv' ? (
                <><FileSpreadsheet className="w-4 h-4 text-green-400" />Output CSV</>
              ) : (
                <><FileJson className="w-4 h-4 text-brand-400" />Output JSON</>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {stats && <span className="text-xs text-slate-500 font-mono mr-2">{stats}</span>}
              {result.output && (
                <>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                      copied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-surface border border-transparent'
                    }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-surface border border-transparent transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </>
              )}
            </div>
          </div>
          {isEmpty ? (
            <div className="w-full h-64 bg-surface border border-slate-700/50 rounded-lg flex items-center justify-center">
              <p className="text-slate-500 text-sm">Enter input to see output</p>
            </div>
          ) : result.error ? (
            <div className="w-full h-64 bg-surface border border-slate-700/50 rounded-lg flex items-center justify-center">
              <p className="text-slate-500 text-sm">Fix input errors to see output</p>
            </div>
          ) : (
            <pre className="w-full h-64 bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-auto whitespace-pre-wrap break-all">
              {result.output}
            </pre>
          )}
        </div>
      </div>

      {/* Table Preview */}
      {result.tableData.length > 0 && result.headers.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <Table2 className="w-4 h-4 text-brand-400" />
            Table Preview
            <span className="text-xs text-slate-500 font-normal ml-1">
              ({stats})
            </span>
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-lighter">
                  {result.headers.map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left font-semibold text-slate-300 whitespace-nowrap border-b border-slate-700/50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.tableData.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-700/30 ${
                      i % 2 === 0 ? 'bg-surface/50' : 'bg-surface'
                    } hover:bg-brand-500/5 transition-colors`}
                  >
                    {result.headers.map((h) => (
                      <td
                        key={h}
                        className="px-4 py-2 text-slate-400 whitespace-nowrap max-w-[300px] truncate font-mono"
                        title={row[h]}
                      >
                        {row[h] || <span className="text-slate-600 italic">empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage tips */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card border-l-4 border-l-brand-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">JSON → CSV</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Input must be a JSON array of objects</li>
            <li>• Nested objects are flattened with dot notation</li>
            <li>• All values are properly CSV-escaped (quotes, commas, newlines)</li>
            <li>• Sparse objects work — missing keys become empty cells</li>
          </ul>
        </div>
        <div className="card border-l-4 border-l-green-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">CSV → JSON</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• First row must contain column headers</li>
            <li>• Supports quoted fields and escaped quotes</li>
            <li>• Empty rows are skipped</li>
            <li>• Output is pretty-printed JSON with 2-space indent</li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
