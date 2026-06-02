'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Play,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Eye,
  BookOpen,
  Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface CloneResult {
  /** Whether structuredClone() succeeded */
  success: boolean;
  /** The cloned value (stringified) */
  value: string | null;
  /** Error message if cloning failed */
  error: string | null;
  /** Size of the clone in JSON bytes */
  size: number;
}

interface SupportedType {
  type: string;
  supported: boolean;
  note: string;
  example: string;
}

// ── Sample Inputs ──────────────────────────────────────────────────────────

interface Sample {
  name: string;
  description: string;
  code: string;
}

const SAMPLES: Sample[] = [
  {
    name: 'Simple Object',
    description: 'A basic nested object with primitives',
    code: `{
  "name": "Alice",
  "age": 30,
  "address": {
    "city": "San Francisco",
    "zip": 94107
  },
  "hobbies": ["coding", "hiking", "music"]
}`,
  },
  {
    name: 'Date Object',
    description: 'Dates are fully supported',
    code: `{
  "created": "2026-06-02T17:00:00.000Z",
  "__hint": "Dates serialize to ISO string in JSON. To test real Date objects, use the Custom JS mode."
}`,
  },
  {
    name: 'Map and Set',
    description: 'Maps and Sets work with structuredClone() but NOT with JSON',
    code: `{
  "__mode": "js",
  "__js": "const m = new Map([['key', 'value'], ['nested', new Set([1,2,3])]]); m.set('date', new Date()); m"
}`,
  },
  {
    name: 'Circular Reference',
    description: 'structuredClone handles circular references',
    code: `{
  "__mode": "js",
  "__js": "const obj = { name: 'circular' }; obj.self = obj; obj"
}`,
  },
  {
    name: 'ArrayBuffer',
    description: 'Binary data like ArrayBuffer is supported',
    code: `{
  "__mode": "js",
  "__js": "const buf = new ArrayBuffer(8); new Uint8Array(buf).set([1,2,3,4,5,6,7,8]); ({ buffer: buf, view: new Uint8Array(buf) })"
}`,
  },
  {
    name: 'Unsupported: Function',
    description: 'Functions cannot be cloned — will fail',
    code: `{
  "__mode": "js",
  "__js": "({ name: 'bad', fn: function() { return 'hello'; } })"
}`,
  },
  {
    name: 'Unsupported: DOM Node',
    description: 'DOM nodes cannot be cloned — will fail',
    code: `{
  "__mode": "js",
  "__js": "try { ({ el: document.createElement('div') }) } catch(e) { ({ error: e.message }) }"
}`,
  },
  {
    name: 'Blob',
    description: 'Blobs are fully supported',
    code: `{
  "__mode": "js",
  "__js": "new Blob(['Hello World'], { type: 'text/plain' })"
}`,
  },
];

// ── Type Reference ─────────────────────────────────────────────────────────

const SUPPORTED_TYPES: SupportedType[] = [
  { type: 'Primitives', supported: true, note: 'string, number, bigint, boolean, null, undefined', example: '"hello", 42, true, null' },
  { type: 'Plain Objects', supported: true, note: 'Nested object literals', example: '{ a: 1, b: { c: 2 } }' },
  { type: 'Arrays', supported: true, note: 'Including sparse and typed arrays', example: '[1, 2, 3]' },
  { type: 'Date', supported: true, note: 'Preserved as Date instances', example: 'new Date()' },
  { type: 'Map', supported: true, note: 'Any key type (objects too)', example: 'new Map([["k", "v"]])' },
  { type: 'Set', supported: true, note: 'Any value type', example: 'new Set([1, 2, 3])' },
  { type: 'RegExp', supported: true, note: 'Flags and lastIndex preserved', example: '/test/gi' },
  { type: 'ArrayBuffer', supported: true, note: 'Fixed-length binary buffer', example: 'new ArrayBuffer(8)' },
  { type: 'TypedArrays', supported: true, note: 'Uint8Array, Int32Array, Float64Array, etc.', example: 'new Uint8Array([1,2,3])' },
  { type: 'DataView', supported: true, note: 'View over an ArrayBuffer', example: 'new DataView(buf)' },
  { type: 'Blob', supported: true, note: 'Immutable raw binary data', example: 'new Blob(["hello"])' },
  { type: 'File', supported: true, note: 'Subclass of Blob with name/lastModified', example: 'new File(["x"], "f.txt")' },
  { type: 'ImageData', supported: true, note: 'Canvas pixel data', example: 'new ImageData(100, 100)' },
  { type: 'ImageBitmap', supported: true, note: 'Bitmap image for canvas', example: '...' },
  { type: 'Error objects', supported: true, note: 'Error, TypeError, RangeError, etc.', example: 'new Error("msg")' },
  { type: 'Circular References', supported: true, note: 'Handled automatically', example: 'obj.self = obj' },
  { type: 'Functions', supported: false, note: '❌ Throws DataCloneError', example: '() => {}' },
  { type: 'DOM Nodes', supported: false, note: '❌ Throws DataCloneError', example: 'document.body' },
  { type: 'Symbols', supported: false, note: '❌ Throws DataCloneError', example: 'Symbol("x")' },
  { type: 'WeakMap / WeakSet', supported: false, note: '❌ Not cloneable', example: 'new WeakMap()' },
  { type: 'Proxies', supported: false, note: '❌ Not cloneable', example: 'new Proxy({}, {})' },
];

// ── Evaluation Helpers ─────────────────────────────────────────────────────

function safeStringify(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeLabel(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (value instanceof Date) return 'Date';
  if (value instanceof RegExp) return 'RegExp';
  if (value instanceof ArrayBuffer) return `ArrayBuffer(${value.byteLength})`;
  if (value instanceof Blob) return `Blob(${value.size}B)`;
  if (value instanceof Error) return value.constructor.name;
  if (ArrayBuffer.isView(value)) return `${value.constructor.name}(${value.byteLength})`;
  return typeof value;
}

function evalJS(code: string): unknown {
  const fn = new Function(`"use strict"; return (${code})`);
  return fn();
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function StructuredClonePlaygroundPage() {
  const [input, setInput] = useState(SAMPLES[0].code);
  const [result, setResult] = useState<CloneResult | null>(null);
  const [showJSON, setShowJSON] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'samples' | 'reference'>('input');

  const runClone = useCallback(() => {
    try {
      let parsed: unknown;

      // Detect special __mode: "js"
      if (input.trim().startsWith('{') || input.trim().startsWith('[')) {
        try {
          const obj = JSON.parse(input);
          if (obj !== null && typeof obj === 'object' && (obj as Record<string, unknown>).__mode === 'js') {
            const jsCode = (obj as Record<string, string>).__js;
            if (jsCode) {
              parsed = evalJS(jsCode);
            } else {
              parsed = obj;
            }
          } else {
            parsed = obj;
          }
        } catch {
          // Try eval as JS expression
          try {
            parsed = evalJS(input);
          } catch {
            throw new Error('Invalid input: not valid JSON or JavaScript');
          }
        }
      } else {
        // Not object/array — try JS
        try {
          parsed = evalJS(input);
        } catch {
          throw new Error('Invalid input: not valid JSON or JavaScript');
        }
      }

      const start = performance.now();
      const cloned = structuredClone(parsed);
      const elapsed = performance.now() - start;

      const stringified = safeStringify(cloned);
      const size = new Blob([stringified]).size;

      setResult({
        success: true,
        value: stringified,
        error: null,
        size,
      });

      toast.success(`Cloned ${typeLabel(parsed)} in ${elapsed.toFixed(1)}ms (${formatBytes(size)})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({
        success: false,
        value: null,
        error: message,
        size: 0,
      });
      toast.error('Clone failed');
    }
  }, [input]);

  const clearAll = useCallback(() => {
    setInput('');
    setResult(null);
    toast.success('Cleared');
  }, []);

  const loadSample = useCallback((sample: Sample) => {
    setInput(sample.code);
    setResult(null);
    setActiveTab('input');
  }, []);

  const copyResult = useCallback(async () => {
    if (!result?.value) return;
    try {
      await navigator.clipboard.writeText(result.value);
      toast.success('Copied clone result');
    } catch {
      toast.error('Failed to copy');
    }
  }, [result]);

  const copyInput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(input);
      toast.success('Copied input');
    } catch {
      toast.error('Failed to copy');
    }
  }, [input]);

  return (
    <ToolLayout
      title="StructuredClone Playground"
      description="Test JavaScript's structuredClone() API — verify what can be deep-cloned, debug DataCloneErrors, and explore supported types."
      controls={
        <div className="flex items-center gap-3 flex-wrap w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={runClone}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-600 text-white hover:bg-brand-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!input.trim()}
            >
              <Play className="w-4 h-4" />
              Clone It
            </button>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <Wrench className="w-3.5 h-3.5" />
            <span>100% client-side — no data leaves your browser</span>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left Column: Input + Samples ────────────────────────────────── */}
        <div>
          {/* Tab switcher */}
          <div className="flex items-center gap-1 mb-4">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'input'
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Input
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'samples'
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Samples
            </button>
            <button
              onClick={() => setActiveTab('reference')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'reference'
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Reference
            </button>
          </div>

          {/* Input Tab */}
          {activeTab === 'input' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400">
                  Paste JSON or JavaScript expression (expressions prefixed with {'{ "__mode": "js", … }'} run directly)
                </label>
                <button
                  onClick={copyInput}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setResult(null);
                }}
                placeholder='{ "key": "value" } // or JSON or JS expression'
                className="w-full h-64 p-4 font-mono text-sm bg-slate-950 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/50 resize-y transition-colors"
                spellCheck={false}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Supports JSON objects/arrays, or JavaScript expressions via {'{ "__mode": "js", "__js": "..." }'}. For direct JS, try: new Map(), new Date(), new Set([1,2,3])
              </p>
            </div>
          )}

          {/* Samples Tab */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Click a sample to load it into the input area.
              </p>
              {SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => loadSample(sample)}
                  className="w-full text-left p-4 rounded-xl bg-surface-light border border-slate-700/50 hover:border-brand-600/30 hover:bg-slate-800/80 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Info className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                        {sample.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{sample.description}</p>
                      <pre className="mt-2 p-2 rounded-md bg-slate-950/80 border border-slate-700/30 text-[11px] text-slate-500 font-mono overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {sample.code}
                      </pre>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Reference Tab */}
          {activeTab === 'reference' && (
            <div className="rounded-xl bg-surface-light border border-slate-700/50 overflow-hidden">
              <div className="p-4 border-b border-slate-700/30">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-400" />
                  structuredClone() Type Support
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The structured clone algorithm supports most built-in types. Here&apos;s the full breakdown.
                </p>
              </div>
              <div className="divide-y divide-slate-700/30 max-h-96 overflow-y-auto">
                {SUPPORTED_TYPES.map((t, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-3 flex items-start gap-3 ${
                      t.supported ? 'hover:bg-slate-800/50' : 'hover:bg-red-950/20'
                    } transition-colors`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {t.supported ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{t.type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400">
                          {t.supported ? 'SUPPORTED' : 'UNSUPPORTED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{t.note}</p>
                      {t.example && (
                        <code className="mt-1 block text-[11px] text-slate-500 font-mono">{t.example}</code>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Output ───────────────────────────────────────── */}
        <div>
          {!result ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-700/50 bg-slate-900/50">
              <Play className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Paste some data and click &quot;Clone It&quot;</p>
              <p className="text-xs text-slate-600 mt-1">Everything runs in your browser</p>
            </div>
          ) : result.success ? (
            <div className="space-y-4 animate-fade-in">
              {/* Success banner */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-300">Clone Successful</p>
                  <p className="text-xs text-emerald-500/80 mt-0.5">
                    Size: {formatBytes(result.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={copyResult}
                    className="p-1.5 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                    title="Copy result"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowJSON(!showJSON)}
                    className={`p-1.5 rounded-md transition-colors ${
                      showJSON
                        ? 'text-emerald-300 bg-emerald-900/50'
                        : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/50'
                    }`}
                    title={showJSON ? 'Show pretty' : 'Show JSON'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Clone output */}
              <div className="rounded-xl bg-surface-light border border-slate-700/50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-700/30 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Clone Result</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatBytes(result.size)}
                  </span>
                </div>
                <pre className="p-4 text-sm font-mono text-slate-300 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-all">
                  {showJSON ? result.value : result.value}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Error banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/40">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-300">DataCloneError</p>
                  <p className="text-xs text-red-400/80 mt-1 font-mono break-all">
                    {result.error}
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-xl bg-surface-light border border-slate-700/50 p-4">
                <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-brand-400" />
                  Common Fixes
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  <li>• Remove functions — serialize data only or convert to a string</li>
                  <li>• Replace DOM nodes with IDs or data attributes</li>
                  <li>• Convert Symbols to strings with .toString() or .description</li>
                  <li>• Use Map/Set instead of WeakMap/WeakSet for clonable data</li>
                  <li>• Proxy objects must be unwrapped before cloning</li>
                  <li>• For unsupported types, implement a custom .toJSON() or manual serialization</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
