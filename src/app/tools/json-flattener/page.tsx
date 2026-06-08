'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Check, RotateCcw, Download, ArrowDownToLine, ArrowUpFromLine,
  Info, Maximize2, Minimize2, Layers, GitBranch,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Flatten Logic ────────────────────────────────────────────────────────────

function flatten(
  obj: unknown,
  prefix = '',
  result: Record<string, unknown> = {},
  separator = '.',
  maxDepth = Infinity,
  currentDepth = 0,
  bracketArrays = false,
): Record<string, unknown> {
  if (currentDepth > maxDepth) {
    result[prefix] = obj;
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[prefix] = [];
      return result;
    }
    for (let i = 0; i < obj.length; i++) {
      const key = bracketArrays ? `${prefix}[${i}]` : (prefix ? `${prefix}[${i}]` : `[${i}]`);
      flatten(obj[i], key, result, separator, maxDepth, currentDepth + 1, bracketArrays);
    }
  } else if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>);
    if (keys.length === 0) {
      result[prefix] = {};
      return result;
    }
    for (const key of keys) {
      const newPrefix = prefix ? `${prefix}${separator}${key}` : key;
      flatten((obj as Record<string, unknown>)[key], newPrefix, result, separator, maxDepth, currentDepth + 1, bracketArrays);
    }
  } else {
    result[prefix] = obj;
  }
  return result;
}

function unflatten(
  flat: Record<string, unknown>,
  separator = '.',
): unknown {
  const result: Record<string, unknown> = {};

  const keys = Object.keys(flat).sort();
  for (const key of keys) {
    const parts = parseFlattenedKey(key, separator);
    setNestedValue(result, parts, flat[key]);
  }

  return result;
}

function parseFlattenedKey(key: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inBracket = false;

  for (let i = 0; i < key.length; i++) {
    const ch = key[i];
    if (ch === '[' && !inBracket) {
      if (current) {
        parts.push(current);
        current = '';
      }
      inBracket = true;
    } else if (ch === ']' && inBracket) {
      parts.push(current);
      current = '';
      inBracket = false;
    } else if (ch === separator && !inBracket) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current) {
    parts.push(current);
  }

  // Skip trailing empty from separator at end
  return parts.filter(p => p !== '');
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const nextKey = path[i + 1];
    const isNextNumeric = /^\d+$/.test(nextKey);

    if (!(key in current)) {
      current[key] = isNextNumeric ? [] : {};
    }

    const next = current[key];
    if (isNextNumeric && !Array.isArray(next)) {
      current[key] = [];
    } else if (!isNextNumeric && (next === null || typeof next !== 'object' || Array.isArray(next))) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  const lastKey = path[path.length - 1];
  if (/^\d+$/.test(lastKey)) {
    // Array index — put into array
    const parentArr = current as unknown as unknown[];
    const idx = parseInt(lastKey, 10);
    if (idx < parentArr.length) {
      parentArr[idx] = value;
    } else {
      parentArr[idx] = value;
    }
  } else {
    current[lastKey] = value;
  }
}

function getNestingDepth(obj: unknown): number {
  if (Array.isArray(obj)) {
    if (obj.length === 0) return 1;
    return 1 + Math.max(...obj.map(getNestingDepth));
  }
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>);
    if (keys.length === 0) return 1;
    return 1 + Math.max(...keys.map(k => getNestingDepth((obj as Record<string, unknown>)[k])));
  }
  return 0;
}

function countLeafKeys(obj: unknown): number {
  if (Array.isArray(obj)) {
    return obj.reduce((acc: number, item) => acc + countLeafKeys(item), 0);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).reduce(
      (acc: number, v) => acc + countLeafKeys(v), 0,
    );
  }
  return 1;
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
    geolocation: {
      lat: 37.7749,
      lng: -122.4194,
    },
  },
  hobbies: ['hiking', 'photography', 'cooking'],
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
  profile: {
    avatar: null,
    social: {
      twitter: '@alicej',
      github: 'alicecodes',
    },
  },
}, null, 2);

const SAMPLE_FLAT = `name: Alice Johnson
email: alice@example.com
age: 31
address.street: 456 Oak Avenue
address.city: San Francisco
address.state: CA
address.zip: 94105
address.geolocation.lat: 37.7749
address.geolocation.lng: -122.4194
hobbies[0]: hiking
hobbies[1]: photography
hobbies[2]: cooking
settings.theme: dark
settings.notifications.email: true
settings.notifications.push: false
settings.notifications.sms: true
settings.language: en-US
tags[0]: developer
tags[1]: design
tags[2]: javascript
joined: 2023-01-15
active: true
profile.avatar: null
profile.social.twitter: "@alicej"
profile.social.github: alicecodes`;

function parseFlatText(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Try to parse JSON values
    if (value === 'null') {
      result[key] = null;
    } else if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      result[key] = Number(value);
    } else if (/^"(.*)"$/.test(value)) {
      result[key] = value.slice(1, -1);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function flatToText(flat: Record<string, unknown>): string {
  return Object.entries(flat)
    .map(([key, value]) => {
      if (value === null) return `${key}: null`;
      if (typeof value === 'string') return `${key}: ${value}`;
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join('\n');
}

// ── Component ───────────────────────────────────────────────────────────────

type Mode = 'flatten' | 'unflatten';

export default function JsonFlattenerPage() {
  const [mode, setMode] = useState<Mode>('flatten');
  const [input, setInput] = useState(SAMPLE_JSON);
  const [output, setOutput] = useState('');
  const [separator, setSeparator] = useState('.');
  const [maxDepth, setMaxDepth] = useState(0); // 0 = no limit
  const [bracketArrays, setBracketArrays] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ keyCount: number; depth: number; inputSize: number; outputSize: number; error: string }>({
    keyCount: 0, depth: 0, inputSize: 0, outputSize: 0, error: '',
  });

  const process = useCallback(() => {
    try {
      if (mode === 'flatten') {
        const parsed = JSON.parse(input);
        const flat = flatten(parsed, '', {}, separator, maxDepth === 0 ? Infinity : maxDepth, 0, bracketArrays);
        const flatText = flatToText(flat);
        setOutput(flatText);
        setStats({
          keyCount: Object.keys(flat).length,
          depth: getNestingDepth(parsed),
          inputSize: input.length,
          outputSize: flatText.length,
          error: '',
        });
      } else {
        const flat = parseFlatText(input);
        const nested = unflatten(flat, separator);
        const formatted = JSON.stringify(nested, null, 2);
        setOutput(formatted);
        setStats({
          keyCount: countLeafKeys(nested),
          depth: getNestingDepth(nested),
          inputSize: input.length,
          outputSize: formatted.length,
          error: '',
        });
      }
    } catch (e) {
      setOutput('');
      setStats({
        keyCount: 0, depth: 0, inputSize: 0, outputSize: 0,
        error: (e as Error).message,
      });
    }
  }, [input, mode, separator, maxDepth, bracketArrays]);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const downloadOutput = useCallback(() => {
    if (!output) return;
    const ext = mode === 'flatten' ? 'txt' : 'json';
    const mime = mode === 'flatten' ? 'text/plain' : 'application/json';
    const blob = new Blob([output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [output, mode]);

  const swapMode = useCallback(() => {
    const newMode = mode === 'flatten' ? 'unflatten' : 'flatten';
    if (newMode === 'flatten') {
      setInput(SAMPLE_JSON);
    } else {
      setInput(SAMPLE_FLAT);
    }
    setMode(newMode);
    setOutput('');
    setStats({ keyCount: 0, depth: 0, inputSize: 0, outputSize: 0, error: '' });
  }, [mode]);

  const reset = useCallback(() => {
    if (mode === 'flatten') {
      setInput(SAMPLE_JSON);
    } else {
      setInput(SAMPLE_FLAT);
    }
    setOutput('');
    setStats({ keyCount: 0, depth: 0, inputSize: 0, outputSize: 0, error: '' });
  }, [mode]);

  const depthOptions = useMemo(() => {
    const depths = [0, 1, 2, 3, 4, 5];
    return depths.map(d => ({
      value: d,
      label: d === 0 ? 'All (no limit)' : `Max ${d} level${d > 1 ? 's' : ''}`,
    }));
  }, []);

  return (
    <ToolLayout
      title="JSON Flattener / Unflattener"
      description="Flatten nested JSON into dot-notation key-value pairs and unflatten them back. Perfect for MongoDB documents, CSV preprocessing, log analysis, and data pipeline work."
    >
      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
            <button
              onClick={() => { setMode('flatten'); setInput(SAMPLE_JSON); setOutput(''); setStats({ keyCount: 0, depth: 0, inputSize: 0, outputSize: 0, error: '' }); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'flatten'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              Flatten JSON
            </button>
            <button
              onClick={() => { setMode('unflatten'); setInput(SAMPLE_FLAT); setOutput(''); setStats({ keyCount: 0, depth: 0, inputSize: 0, outputSize: 0, error: '' }); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'unflatten'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Unflatten → JSON
            </button>
          </div>

          {/* Separator (only in flatten mode) */}
          {mode === 'flatten' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Separator:</label>
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-brand-500/50"
                >
                  <option value=".">Dot ( . )</option>
                  <option value="_">Underscore ( _ )</option>
                  <option value=">">Arrow ( &gt; )</option>
                  <option value="/">Slash ( / )</option>
                </select>
              </div>

              {/* Max Depth */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Depth:</label>
                <select
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                >
                  {depthOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Array brackets toggle */}
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={bracketArrays}
                  onChange={(e) => setBracketArrays(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-brand-500 focus:ring-brand-500"
                />
                Array indices [0]
              </label>
            </>
          )}

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
              {mode === 'flatten' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
              {mode === 'flatten' ? 'Flatten' : 'Unflatten'}
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            {mode === 'flatten' ? 'Nested JSON Input' : 'Flat Key-Value Input'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-64 bg-slate-900 border border-slate-600 rounded-xl p-4 font-mono text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 resize-y"
            placeholder={mode === 'flatten' ? 'Paste nested JSON here...' : 'Paste flat key: value pairs here...'}
            spellCheck={false}
          />
          {stats.error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
              ⚠ {stats.error}
            </p>
          )}
        </div>

        {/* Output */}
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                {mode === 'flatten' ? 'Flattened Output' : 'Nested JSON Output'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {stats.keyCount} leaf keys · depth {stats.depth} · {stats.outputSize} chars
                  {(stats.inputSize > 0 && stats.outputSize !== stats.inputSize) && (
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
            When to Use JSON Flattening
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <Layers className="w-4 h-4 text-brand-400 mb-1" />
              <h4 className="text-xs font-semibold text-slate-300">MongoDB / NoSQL</h4>
              <p className="text-xs text-slate-500 mt-1">Transform deeply nested documents into flat key-value pairs for ETL pipelines and data warehouse ingestion.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <Maximize2 className="w-4 h-4 text-brand-400 mb-1" />
              <h4 className="text-xs font-semibold text-slate-300">CSV / Spreadsheet Prep</h4>
              <p className="text-xs text-slate-500 mt-1">Flatten JSON arrays of objects to prepare for CSV export. Each nested key becomes its own column header.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <GitBranch className="w-4 h-4 text-brand-400 mb-1" />
              <h4 className="text-xs font-semibold text-slate-300">Log Analysis</h4>
              <p className="text-xs text-slate-500 mt-1">Flatten structured log events into key=value formats for grep-ability. Perfect for log aggregation systems.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
