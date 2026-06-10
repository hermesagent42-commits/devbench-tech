'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Zap, Play, Plus, Trash2, RotateCcw, Gauge, Timer, BarChart3,
  TrendingUp, Code2, ListOrdered, Info, AlertTriangle, Copy,
  ChevronDown, ChevronRight, Trophy, Clock, Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TestCase {
  id: string;
  name: string;
  code: string;
}

interface BenchmarkResult {
  id: string;
  name: string;
  opsPerSec: number;
  totalTimeMs: number;
  iterations: number;
  relativeSpeed: number;
  error?: string;
}

type RunState = 'idle' | 'running' | 'done';

const PRESETS: { label: string; tests: { name: string; code: string }[] }[] = [
  {
    label: 'Array Iteration',
    tests: [
      { name: 'for loop', code: 'for (let i = 0; i < arr.length; i++) { sum += arr[i]; }' },
      { name: 'for...of', code: 'for (const v of arr) { sum += v; }' },
      { name: 'forEach', code: 'arr.forEach(v => { sum += v; });' },
      { name: 'reduce', code: 'sum = arr.reduce((a, b) => a + b, 0);' },
    ],
  },
  {
    label: 'Object Creation',
    tests: [
      { name: 'Literal', code: 'let o = { a: 1, b: "hello", c: true };' },
      { name: 'Object.create', code: 'let o = Object.create(null); o.a = 1; o.b = "hello"; o.c = true;' },
      { name: 'new Object()', code: 'let o = new Object(); o.a = 1; o.b = "hello"; o.c = true;' },
      { name: 'Class instance', code: 'let o = new C();' },
    ],
  },
  {
    label: 'String Concat',
    tests: [
      { name: '+ operator', code: 'let r = ""; for (let i = 0; i < 100; i++) r += "x";' },
      { name: 'Template literal', code: 'let r = ""; for (let i = 0; i < 100; i++) r = `${r}x`;' },
      { name: 'Array join', code: 'let a = []; for (let i = 0; i < 100; i++) a.push("x"); let r = a.join("");' },
      { name: '.concat()', code: 'let r = ""; for (let i = 0; i < 100; i++) r = r.concat("x");' },
    ],
  },
  {
    label: 'Map vs Object',
    tests: [
      { name: 'Map.set', code: 'for (let i = 0; i < 1000; i++) m.set(i, i * 2);' },
      { name: 'Object[key]', code: 'for (let i = 0; i < 1000; i++) o[i] = i * 2;' },
      { name: 'Map.get', code: 'let s = 0; for (let i = 0; i < 1000; i++) s += m.get(i);' },
      { name: 'Object[key] get', code: 'let s = 0; for (let i = 0; i < 1000; i++) s += o[i];' },
    ],
  },
  {
    label: 'Array Filter',
    tests: [
      { name: '.filter()', code: 'let r = arr.filter(v => v % 2 === 0);' },
      { name: 'for + push', code: 'let r = []; for (let i = 0; i < arr.length; i++) { if (arr[i] % 2 === 0) r.push(arr[i]); }' },
      { name: 'for...of + push', code: 'let r = []; for (const v of arr) { if (v % 2 === 0) r.push(v); }' },
      { name: 'reduce', code: 'let r = arr.reduce((a, v) => { if (v % 2 === 0) a.push(v); return a; }, []);' },
    ],
  },
  {
    label: 'Spread vs Push',
    tests: [
      { name: '.push(...arr)', code: 'dest.push(...src);' },
      { name: 'for + push', code: 'for (let i = 0; i < src.length; i++) dest.push(src[i]);' },
      { name: '.concat()', code: 'dest = dest.concat(src);' },
      { name: 'spread literal', code: 'dest = [...dest, ...src];' },
    ],
  },
];

let counter = 0;
function uid(): string {
  return `tc_${++counter}_${Math.random().toString(36).slice(2, 8)}`;
}

const TIMEOUT_MS = 5000; // per-test timeout

function formatOps(ops: number): string {
  if (ops >= 1_000_000_000) return `${(ops / 1_000_000_000).toFixed(2)}B`;
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(2)}M`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(2)}K`;
  return ops.toFixed(2);
}

function formatTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(2)}ms`;
}

function getColor(index: number, total: number): string {
  const colors = [
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-emerald-500 to-teal-400',
    'from-amber-500 to-orange-400',
    'from-rose-500 to-red-400',
    'from-indigo-500 to-violet-400',
  ];
  return colors[index % colors.length];
}

function getBadgeColor(index: number): string {
  const colors = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  ];
  return colors[index % colors.length];
}

export default function JsBenchmarkPage() {
  const [tests, setTests] = useState<TestCase[]>([
    { id: uid(), name: 'Test A', code: 'let s = 0; for (let i = 0; i < 1000; i++) s += Math.sqrt(i);' },
    { id: uid(), name: 'Test B', code: 'let s = 0; for (let i = 0; i < 1000; i++) s += i ** 0.5;' },
  ]);
  const [iterations, setIterations] = useState(100_000);
  const [warmupRuns, setWarmupRuns] = useState(1);
  const [runState, setRunState] = useState<RunState>('idle');
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const addTest = useCallback(() => {
    const idx = tests.length + 1;
    setTests(prev => [...prev, { id: uid(), name: `Test ${idx}`, code: '' }]);
  }, [tests.length]);

  const removeTest = useCallback((id: string) => {
    setTests(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTest = useCallback((id: string, field: 'name' | 'code', value: string) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
    setTests(preset.tests.map(t => ({ id: uid(), name: t.name, code: t.code })));
    setShowPresets(false);
    setRunState('idle');
    setResults([]);
  }, []);

  const runBenchmark = useCallback(async () => {
    const validTests = tests.filter(t => t.code.trim());
    if (validTests.length < 2) {
      toast.error('Need at least 2 tests with code to compare');
      return;
    }
    abortRef.current = false;
    setRunState('running');
    setProgress(0);
    setResults([]);

    const newResults: BenchmarkResult[] = [];
    const totalTests = validTests.length;

    // Compute the test preparation code once
    // For presets that need setup (like Map vs Object), we detect and inject
    const needsMapObject = validTests.some(t => t.code.includes('m.') || t.code.includes('m.'));
    const needsClass = validTests.some(t => t.code.includes('new C()'));
    const needsArray = validTests.some(t => t.code.includes('arr.'));
    const needsSpread = validTests.some(t => t.code.includes('src') || t.code.includes('dest'));

    for (let ti = 0; ti < totalTests; ti++) {
      if (abortRef.current) break;
      const test = validTests[ti];
      setProgress(Math.round((ti / totalTests) * 100));

      try {
        // Build the benchmark function
        const setupLines: string[] = [];
        if (needsArray) setupLines.push('const arr = Array.from({ length: 10000 }, (_, i) => i); let sum = 0;');
        if (needsMapObject) setupLines.push('const m = new Map(); const o = {};');
        if (needsClass) setupLines.push('class C { constructor() { this.a = 1; this.b = "hello"; this.c = true; } }');
        if (needsSpread) setupLines.push('let src = [1,2,3,4,5,6,7,8,9,10]; let dest = [];');
        // Generic sum variable
        const codeSnippet = test.code;
        if (!setupLines.some(l => l.includes('let sum') || l.includes('var sum') || l.includes('const sum'))
            && codeSnippet.includes('sum')) {
          setupLines.push('let sum = 0;');
        }

        const fullSetup = setupLines.join('\n');
        const wrappedCode = `
          ${fullSetup}
          var __start = performance.now();
          var __end;
          try {
            for (var __i = 0; __i < ${iterations}; __i++) {
              ${test.code}
            }
            __end = performance.now();
          } catch(e) {
            throw e;
          }
        `;

        // Warmup
        for (let w = 0; w < warmupRuns; w++) {
          try {
            new Function(wrappedCode)();
          } catch (e) {
            // Warmup failures are fine
          }
        }

        // Timed run with timeout
        const result = await new Promise<{ totalMs: number; error?: string }>((resolve) => {
          const workerCode = `
            const iterations = ${iterations};
            ${fullSetup}
            const start = performance.now();
            try {
              for (let i = 0; i < iterations; i++) {
                ${test.code}
              }
              const end = performance.now();
              self.postMessage({ totalMs: end - start });
            } catch(e) {
              self.postMessage({ error: e.message || String(e) });
            }
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          const worker = new Worker(url);
          const timeout = setTimeout(() => {
            worker.terminate();
            URL.revokeObjectURL(url);
            resolve({ totalMs: -1, error: `Timed out after ${TIMEOUT_MS / 1000}s` });
          }, TIMEOUT_MS);

          worker.onmessage = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            URL.revokeObjectURL(url);
            resolve(e.data);
          };
          worker.onerror = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            URL.revokeObjectURL(url);
            resolve({ totalMs: -1, error: e.message || 'Unknown worker error' });
          };
        });

        if (result.error) {
          newResults.push({
            id: test.id,
            name: test.name,
            opsPerSec: 0,
            totalTimeMs: 0,
            iterations,
            relativeSpeed: 0,
            error: result.error,
          });
        } else {
          const opsPerSec = result.totalMs > 0 ? (iterations / result.totalMs) * 1000 : 0;
          newResults.push({
            id: test.id,
            name: test.name,
            opsPerSec,
            totalTimeMs: result.totalMs,
            iterations,
            relativeSpeed: 0,
          });
        }
      } catch (e: any) {
        newResults.push({
          id: test.id,
          name: test.name,
          opsPerSec: 0,
          totalTimeMs: 0,
          iterations,
          relativeSpeed: 0,
          error: e.message || String(e),
        });
      }
    }

    // Calculate relative speeds (fastest = 1.0x)
    if (!abortRef.current && newResults.length > 0) {
      const validResults = newResults.filter(r => !r.error && r.opsPerSec > 0);
      const maxOps = validResults.length > 0 ? Math.max(...validResults.map(r => r.opsPerSec)) : 0;
      for (const r of newResults) {
        if (!r.error && maxOps > 0) {
          r.relativeSpeed = +(r.opsPerSec / maxOps).toFixed(3);
        }
      }
      setResults(newResults);
      setRunState('done');
    } else if (abortRef.current) {
      setRunState('idle');
    } else {
      // All errored
      setResults(newResults);
      setRunState('done');
    }
    setProgress(100);
  }, [tests, iterations, warmupRuns]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setRunState('idle');
    setResults([]);
    setProgress(0);
  }, []);

  const copyResults = useCallback(async () => {
    if (results.length === 0) return;
    const lines = ['JS Benchmark Results', '='.repeat(40), ''];
    const fastest = results.filter(r => !r.error).sort((a, b) => b.opsPerSec - a.opsPerSec);
    fastest.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.name}`);
      lines.push(`   ${formatOps(r.opsPerSec)} ops/sec — ${formatTime(r.totalTimeMs)} total`);
      if (r.relativeSpeed < 1) {
        lines.push(`   ${r.relativeSpeed.toFixed(2)}x slower than fastest`);
      } else {
        lines.push('   🏆 Fastest');
      }
      lines.push('');
    });
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      lines.push('Errors:');
      errors.forEach(r => lines.push(`  ${r.name}: ${r.error}`));
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Results copied!');
    } catch { toast.error('Failed to copy'); }
  }, [results]);

  const fastestOps = useMemo(() => {
    const valid = results.filter(r => !r.error && r.opsPerSec > 0);
    return valid.length > 0 ? Math.max(...valid.map(r => r.opsPerSec)) : 1;
  }, [results]);

  const hasErrors = results.some(r => r.error);
  const allEmpty = tests.every(t => !t.code.trim());

  return (
    <ToolLayout
      title="JavaScript Benchmark"
      description="Compare JavaScript code performance — test array iteration, object creation, string ops, and more. jsPerf-style, 100% client-side with Web Workers."
    >
      {/* Presets */}
      <div className="mb-6">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          {showPresets ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <ListOrdered className="w-4 h-4 text-brand-400" />
          Benchmark Presets
          <span className="text-xs text-slate-600 ml-1">({PRESETS.length})</span>
        </button>
        {showPresets && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="bg-surface border border-slate-700/50 rounded-lg p-3 text-left hover:border-brand-500/40 hover:bg-brand-500/5 transition-all"
              >
                <p className="text-white text-sm font-medium mb-1">{preset.label}</p>
                <p className="text-xs text-slate-500">
                  {preset.tests.map(t => t.name).join(' vs ')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Test Cases */}
      <div className="space-y-4 mb-6">
        {tests.map((test, idx) => (
          <div key={test.id} className="card group">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getBadgeColor(idx)}`}>
                #{idx + 1}
              </span>
              <input
                type="text"
                value={test.name}
                onChange={(e) => updateTest(test.id, 'name', e.target.value)}
                placeholder="Test name"
                className="bg-transparent text-white font-semibold text-sm border-b border-transparent hover:border-slate-600 focus:border-brand-500 outline-none flex-1 px-1 py-0.5 transition-colors"
              />
              {tests.length > 2 && (
                <button
                  onClick={() => removeTest(test.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove test"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <textarea
              value={test.code}
              onChange={(e) => updateTest(test.id, 'code', e.target.value)}
              placeholder="// JavaScript code to benchmark\nlet s = 0;\nfor (let i = 0; i < 1000; i++) s += i;"
              className="input-field w-full h-24 resize-y font-mono text-sm"
              spellCheck={false}
            />
          </div>
        ))}
      </div>

      {/* Add test button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={addTest}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-brand-400 transition-colors border border-dashed border-slate-700 rounded-lg px-4 py-2 hover:border-brand-500/40"
        >
          <Plus className="w-4 h-4" />
          Add Test Case
        </button>
      </div>

      {/* Configuration */}
      <div className="card mb-6">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-brand-400" />
          Run Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">Iterations per test</label>
            <select
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="input-field w-full"
            >
              <option value={1000}>1,000</option>
              <option value={10000}>10,000</option>
              <option value={100000}>100,000</option>
              <option value={500000}>500,000</option>
              <option value={1000000}>1,000,000</option>
              <option value={5000000}>5,000,000</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1.5">Warmup runs</label>
            <select
              value={warmupRuns}
              onChange={(e) => setWarmupRuns(Number(e.target.value))}
              className="input-field w-full"
            >
              <option value={0}>0 (cold start)</option>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>
        </div>
      </div>

      {/* Run button */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={runState === 'running' ? undefined : (runState === 'done' ? reset : runBenchmark)}
          disabled={allEmpty || tests.length < 2}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            runState === 'running'
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : runState === 'done'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {runState === 'running' ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Running... {progress}%
            </>
          ) : runState === 'done' ? (
            <>
              <RotateCcw className="w-4 h-4" />
              Run Again
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Benchmark
            </>
          )}
        </button>
        {runState === 'running' && (
          <button onClick={reset} className="text-sm text-slate-400 hover:text-red-400 transition-colors">
            Cancel
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && runState === 'done' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              Results
              <span className="text-slate-500 font-normal">
                — {iterations.toLocaleString()} iterations
              </span>
            </h3>
            <button
              onClick={copyResults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Results
            </button>
          </div>

          {/* Overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.filter(r => !r.error).sort((a, b) => b.opsPerSec - a.opsPerSec).map((r, idx) => (
              <div
                key={r.id}
                className={`card relative overflow-hidden ${
                  idx === 0 ? 'ring-1 ring-amber-500/30' : ''
                }`}
              >
                {idx === 0 && (
                  <div className="absolute top-2 right-2 text-amber-400">
                    <Trophy className="w-4 h-4" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${getColor(idx, results.length)}`} />
                  <span className="text-white font-semibold text-sm">{r.name}</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono mb-1">
                  {formatOps(r.opsPerSec)}
                  <span className="text-sm text-slate-500 font-normal ml-1">ops/sec</span>
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {formatTime(r.totalTimeMs)}
                  </span>
                  {r.relativeSpeed < 1 && (
                    <span className="text-slate-500">
                      {r.relativeSpeed.toFixed(2)}× of fastest
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Visual bar chart */}
          <div className="card">
            <h4 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              Relative Performance
            </h4>
            <div className="space-y-3">
              {results.filter(r => !r.error).sort((a, b) => b.opsPerSec - a.opsPerSec).map((r, idx) => {
                const pct = Math.round((r.opsPerSec / fastestOps) * 100);
                return (
                  <div key={r.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${getColor(idx, results.length)}`} />
                        <span className="text-sm text-slate-300 font-medium">{r.name}</span>
                      </div>
                      <span className="text-sm font-mono text-white">{formatOps(r.opsPerSec)} ops/sec</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-6 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getColor(idx, results.length)} transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                        style={{ width: `${Math.max(1, pct)}%` }}
                      >
                        {pct >= 15 && (
                          <span className="text-xs text-white font-bold drop-shadow">{pct}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Errors */}
          {hasErrors && (
            <div className="card border-red-500/20 bg-red-500/5">
              <h4 className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Errors
              </h4>
              {results.filter(r => r.error).map(r => (
                <div key={r.id} className="flex items-start gap-2 text-sm mb-2">
                  <span className="text-red-400 font-medium">{r.name}:</span>
                  <span className="text-red-300 font-mono text-xs">{r.error}</span>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="card border-slate-700/30">
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p>Each test runs in its own Web Worker to avoid blocking the UI. Tests have a {TIMEOUT_MS / 1000}s timeout. Results can vary between runs — run multiple times for reliable data. Higher ops/sec is better.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && runState === 'idle' && (
        <div className="card">
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 text-sm mb-2">
              Add test cases, pick a preset, or modify the defaults above.
            </p>
            <p className="text-slate-600 text-xs">
              Each test runs in a Web Worker with {iterations.toLocaleString()} iterations.
              Higher ops/sec wins!
            </p>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
