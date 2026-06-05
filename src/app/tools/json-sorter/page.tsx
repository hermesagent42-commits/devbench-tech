'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, SortAsc, SortDesc, RotateCcw, Download, Minimize2, Maximize2, Check, Info, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Sorting Logic ───────────────────────────────────────────────────────────

type SortDirection = 'asc' | 'desc';
type SortMode = 'keys' | 'keys-recursive' | 'values';

function sortJsonKeys(obj: unknown, direction: SortDirection, recursive: boolean): unknown {
  if (Array.isArray(obj)) {
    return recursive ? obj.map((item) => sortJsonKeys(item, direction, recursive)) : obj;
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort((a, b) => {
      return direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    });
    for (const key of keys) {
      sorted[key] = recursive
        ? sortJsonKeys((obj as Record<string, unknown>)[key], direction, recursive)
        : (obj as Record<string, unknown>)[key];
    }
    return sorted;
  }
  return obj;
}

function sortJsonValues(obj: unknown, direction: SortDirection): unknown {
  if (Array.isArray(obj)) {
    const sorted = [...(obj as unknown[])].sort((a, b) => {
      const sa = typeof a === 'string' ? a : JSON.stringify(a);
      const sb = typeof b === 'string' ? b : JSON.stringify(b);
      const cmp = sa.localeCompare(sb);
      return direction === 'asc' ? cmp : -cmp;
    });
    return sorted.map((item) => sortJsonValues(item, direction));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sortJsonValues(value, direction);
    }
    return result;
  }
  return obj;
}

function formatJson(str: string, indent: number): string {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, indent);
  } catch {
    return str;
  }
}

function minifyJson(str: string): string {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed);
  } catch {
    return str;
  }
}

// ── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_JSON = JSON.stringify({
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 31,
  address: {
    street: '456 Oak Avenue',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
  },
  hobbies: ['hiking', 'photography', 'cooking', 'coding'],
  settings: {
    theme: 'dark',
    notifications: {
      email: true,
      push: false,
      sms: true,
    },
    language: 'en-US',
  },
  tags: ['developer', 'design', 'javascript'],
  joined: '2023-01-15',
  active: true,
}, null, 2);

// ── Component ───────────────────────────────────────────────────────────────

export default function JsonSorterPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [output, setOutput] = useState('');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [mode, setMode] = useState<SortMode>('keys');
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ keyCount: 0, inputSize: 0, outputSize: 0 });
  const [copied, setCopied] = useState(false);

  const process = useCallback(() => {
    setError('');
    try {
      const parsed = JSON.parse(input);
      let result: unknown;

      switch (mode) {
        case 'keys':
          result = sortJsonKeys(parsed, direction, false);
          break;
        case 'keys-recursive':
          result = sortJsonKeys(parsed, direction, true);
          break;
        case 'values':
          result = sortJsonValues(parsed, direction);
          break;
      }

      const formatted = JSON.stringify(result, null, indent);
      setOutput(formatted);

      // Count keys
      let keyCount = 0;
      (function countKeys(obj: unknown): void {
        if (Array.isArray(obj)) { obj.forEach(countKeys); }
        else if (obj !== null && typeof obj === 'object') {
          keyCount += Object.keys(obj as Record<string, unknown>).length;
          Object.values(obj as Record<string, unknown>).forEach(countKeys);
        }
      })(result);
      setStats({
        keyCount,
        inputSize: input.length,
        outputSize: formatted.length,
      });
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  }, [input, direction, mode, indent]);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const downloadOutput = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sorted.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [output]);

  const reset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOutput('');
    setError('');
    setStats({ keyCount: 0, inputSize: 0, outputSize: 0 });
  }, []);

  return (
    <ToolLayout
      title="JSON Sorter"
      description="Sort JSON object keys alphabetically (ascending or descending), recursively or top-level only. Clean up messy JSON, make diffs readable, and enforce consistent key ordering."
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          {/* Sort mode */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Sort:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SortMode)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="keys">Keys (Top-Level)</option>
              <option value="keys-recursive">Keys (Recursive)</option>
              <option value="values">Values (Arrays)</option>
            </select>
          </div>

          {/* Direction */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDirection('asc')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                direction === 'asc'
                  ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                  : 'bg-slate-700/50 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <SortAsc className="w-4 h-4" /> A→Z
            </button>
            <button
              onClick={() => setDirection('desc')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                direction === 'desc'
                  ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                  : 'bg-slate-700/50 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <SortDesc className="w-4 h-4" /> Z→A
            </button>
          </div>

          {/* Indent */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Indent:</label>
            <select
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              <option value={0}>0 (Compact)</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={process}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" /> Sort JSON
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Input JSON</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-64 bg-slate-900 border border-slate-600 rounded-xl p-4 font-mono text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 resize-y"
            placeholder="Paste your JSON here..."
            spellCheck={false}
          />
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Output */}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Sorted Output</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {stats.keyCount} keys sorted · {stats.outputSize} chars
                  {stats.outputSize !== stats.inputSize && (
                    <span className="text-slate-500"> ({((stats.outputSize / stats.inputSize - 1) * 100).toFixed(1)}% size change)</span>
                  )}
                </span>
                <button
                  onClick={copyOutput}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={downloadOutput}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>
            <pre className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 font-mono text-sm text-slate-200 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre">
              <code>{output}</code>
            </pre>
          </div>
        )}

        {/* Info */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-400" />
            Why Sort JSON?
          </h3>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li><strong>Consistent diffs</strong> — git diffs become meaningful when keys are in a predictable order</li>
            <li><strong>Translation files</strong> — sorting i18n JSON files prevents merge conflicts and keeps them organized</li>
            <li><strong>API responses</strong> — consistent key ordering makes responses easier to debug and test</li>
            <li><strong>Code review</strong> — sorted JSON is faster to scan and review in PRs</li>
            <li><strong>Configuration files</strong> — package.json, tsconfig, ESLint configs are more readable when keys are alphabetized</li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
