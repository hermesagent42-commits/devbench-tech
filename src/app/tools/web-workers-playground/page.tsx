'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play, Square, Send, Trash2, Copy, Check, Zap, Clock,
  Cpu, Activity, Plus, RefreshCw, Code, ChevronDown,
  Gauge, Layers, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface WorkerLog {
  id: number;
  type: 'send' | 'receive' | 'error' | 'info';
  timestamp: number;
  content: string;
}

interface Preset {
  name: string;
  label: string;
  description: string;
  workerCode: string;
  inputData: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'prime',
    label: 'Prime Calculator',
    description: 'Find all primes up to N using the Sieve of Eratosthenes — heavy CPU work offloaded to a worker.',
    workerCode: `
self.onmessage = (e) => {
  const limit = e.data;
  const start = performance.now();
  const sieve = new Uint8Array(limit + 1).fill(1);
  sieve[0] = sieve[1] = 0;
  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= limit; j += i) {
        sieve[j] = 0;
      }
    }
  }
  const primes = [];
  for (let i = 2; i <= limit; i++) {
    if (sieve[i]) primes.push(i);
  }
  const elapsed = (performance.now() - start).toFixed(2);
  self.postMessage({ primes: primes.slice(0, 20), total: primes.length, elapsed });
};
`.trim(),
    inputData: '1000000',
  },
  {
    name: 'fibonacci',
    label: 'Fibonacci (recursive)',
    description: 'Compute Fibonacci numbers recursively — demonstrates why heavy recursion belongs in a worker.',
    workerCode: `
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
self.onmessage = (e) => {
  const n = e.data;
  const start = performance.now();
  const result = fib(n);
  const elapsed = (performance.now() - start).toFixed(2);
  self.postMessage({ result, elapsed, input: n });
};
`.trim(),
    inputData: '42',
  },
  {
    name: 'sort',
    label: 'Large Array Sort',
    description: 'Sort 1 million random numbers — compare main thread vs worker thread performance.',
    workerCode: `
self.onmessage = (e) => {
  const size = e.data;
  const start = performance.now();
  const arr = new Float64Array(size);
  for (let i = 0; i < size; i++) arr[i] = Math.random();
  const sorted = Array.from(arr).sort((a, b) => a - b);
  const elapsed = (performance.now() - start).toFixed(2);
  self.postMessage({ first: sorted.slice(0, 5), last: sorted.slice(-5), length: sorted.length, elapsed });
};
`.trim(),
    inputData: '500000',
  },
  {
    name: 'hash',
    label: 'SHA-256 Simulation',
    description: 'Simulate cryptographic hashing with many iterations — CPU-intensive loop in a worker.',
    workerCode: `
self.onmessage = (e) => {
  const iterations = e.data;
  const start = performance.now();
  // Simulate hash rounds with bitwise ops
  let hash = 0x6a09e667;
  for (let i = 0; i < iterations; i++) {
    hash = ((hash ^ (hash >>> 13)) * 0x5bd1e995) >>> 0;
    hash = ((hash ^ (hash >>> 17)) * 0x5bd1e995) >>> 0;
    hash = (hash ^ (hash >>> 5)) >>> 0;
  }
  const elapsed = (performance.now() - start).toFixed(2);
  self.postMessage({ hash: hash.toString(16).padStart(8, '0'), iterations, elapsed });
};
`.trim(),
    inputData: '5000000',
  },
  {
    name: 'matrix',
    label: 'Matrix Multiply',
    description: 'Multiply two square matrices of configurable size — demonstrates parallel computation potential.',
    workerCode: `
self.onmessage = (e) => {
  const n = e.data;
  const start = performance.now();
  // Generate random matrices
  const a = new Float64Array(n * n);
  const b = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) {
    a[i] = Math.random();
    b[i] = Math.random();
  }
  // Naive O(n^3) multiplication
  const c = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const aik = a[i * n + k];
      for (let j = 0; j < n; j++) {
        c[i * n + j] += aik * b[k * n + j];
      }
    }
  }
  const elapsed = (performance.now() - start).toFixed(2);
  self.postMessage({
    size: n,
    elapsed,
    sample: Array.from(c.slice(0, 4)).map(v => v.toFixed(4))
  });
};
`.trim(),
    inputData: '200',
  },
  {
    name: 'json',
    label: 'JSON Parse Heavy',
    description: 'Parse and stringify a large nested JSON structure repeatedly — serialization offloaded.',
    workerCode: `
self.onmessage = (e) => {
  const rounds = e.data;
  const start = performance.now();
  // Build a deeply nested object
  const data = { items: [] };
  for (let i = 0; i < 500; i++) {
    data.items.push({
      id: i,
      name: \`Item \${i}\`,
      nested: { a: Math.random(), b: Math.random(), c: [1, 2, 3, 4, 5] },
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      timestamp: Date.now() + i
    });
  }
  let str = '';
  let parsed = null;
  for (let r = 0; r < rounds; r++) {
    str = JSON.stringify(data);
    parsed = JSON.parse(str);
  }
  const elapsed = (performance.now() - start).toFixed(2);
  self.postMessage({ rounds, elapsed, itemCount: parsed.items.length, strLen: str.length });
};
`.trim(),
    inputData: '50',
  },
];

// ── Worker factory helper ───────────────────────────────────────────────────

function createWorkerBlob(code: string): Worker {
  const blob = new Blob([code], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // Clean up the blob URL once the worker is created
  URL.revokeObjectURL(url);
  return worker;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function WebWorkersPlayground() {
  const [logs, setLogs] = useState<WorkerLog[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [workerCode, setWorkerCode] = useState(PRESETS[0].workerCode);
  const [inputData, setInputData] = useState(PRESETS[0].inputData);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [mainThreadResult, setMainThreadResult] = useState<string | null>(null);
  const [mainThreadTime, setMainThreadTime] = useState<number | null>(null);
  const [showWorkerCode, setShowWorkerCode] = useState(false);
  const [logsVisible, setLogsVisible] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const logIdRef = useRef(0);

  // ── Add log ─────────────────────────────────────────────────────────────

  const addLog = useCallback((type: WorkerLog['type'], content: string) => {
    logIdRef.current += 1;
    setLogs(prev => {
      const next = [...prev, { id: logIdRef.current, type, timestamp: Date.now(), content }];
      return next.slice(-200); // keep last 200
    });
  }, []);

  // ── Kill worker cleanup ───────────────────────────────────────────────

  const killWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setWorkerRunning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  // ── Spawn worker ───────────────────────────────────────────────────────

  const spawnWorker = useCallback((code: string, input: string) => {
    killWorker();

    try {
      const worker = createWorkerBlob(code);
      workerRef.current = worker;

      worker.onmessage = (e) => {
        addLog('receive', JSON.stringify(e.data, null, 2));
        setWorkerRunning(false);
      };

      worker.onerror = (e) => {
        addLog('error', e.message);
        setWorkerRunning(false);
      };

      // Parse input: try number first, then string
      let parsedInput: any = input.trim();
      if (/^\d+(\.\d+)?$/.test(parsedInput)) {
        parsedInput = Number(parsedInput);
      }

      addLog('send', `Posting: ${typeof parsedInput === 'number' ? parsedInput : JSON.stringify(parsedInput)}`);
      worker.postMessage(parsedInput);
      setWorkerRunning(true);
    } catch (err: any) {
      addLog('error', `Failed to create worker: ${err.message}`);
    }
  }, [killWorker, addLog]);

  // ── Run on main thread for comparison ──────────────────────────────────

  const runOnMainThread = useCallback(() => {
    const input = inputData.trim();
    const parsedInput = /^\d+(\.\d+)?$/.test(input) ? Number(input) : input;

    const fib = function fib(n: number): number {
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
    };

    if (selectedPreset.name === 'prime') {
      const limit = Number(parsedInput);
      const start = performance.now();
      const sieve = new Uint8Array(limit + 1).fill(1);
      sieve[0] = sieve[1] = 0;
      for (let i = 2; i * i <= limit; i++) {
        if (sieve[i]) {
          for (let j = i * i; j <= limit; j += i) sieve[j] = 0;
        }
      }
      let count = 0;
      for (let i = 2; i <= limit; i++) if (sieve[i]) count++;
      const elapsed = performance.now() - start;
      setMainThreadResult(`Found ${count.toLocaleString()} primes up to ${limit.toLocaleString()}`);
      setMainThreadTime(elapsed);
    } else if (selectedPreset.name === 'fibonacci') {
      const n = Number(parsedInput);
      const start = performance.now();
      const result = fib(n);
      const elapsed = performance.now() - start;
      setMainThreadResult(`fib(${n}) = ${result.toLocaleString()}`);
      setMainThreadTime(elapsed);
    } else if (selectedPreset.name === 'sort') {
      const size = Number(parsedInput);
      const start = performance.now();
      const arr = new Float64Array(size);
      for (let i = 0; i < size; i++) arr[i] = Math.random();
      Array.from(arr).sort((a, b) => a - b);
      const elapsed = performance.now() - start;
      setMainThreadResult(`Sorted ${size.toLocaleString()} numbers`);
      setMainThreadTime(elapsed);
    } else if (selectedPreset.name === 'hash') {
      const iterations = Number(parsedInput);
      const start = performance.now();
      let hash = 0x6a09e667;
      for (let i = 0; i < iterations; i++) {
        hash = ((hash ^ (hash >>> 13)) * 0x5bd1e995) >>> 0;
        hash = ((hash ^ (hash >>> 17)) * 0x5bd1e995) >>> 0;
        hash = (hash ^ (hash >>> 5)) >>> 0;
      }
      const elapsed = performance.now() - start;
      setMainThreadResult(`Hash: ${hash.toString(16).padStart(8, '0')} after ${iterations.toLocaleString()} iterations`);
      setMainThreadTime(elapsed);
    } else if (selectedPreset.name === 'matrix') {
      const n = Number(parsedInput);
      const start = performance.now();
      const a = new Float64Array(n * n);
      const b = new Float64Array(n * n);
      for (let i = 0; i < n * n; i++) { a[i] = Math.random(); b[i] = Math.random(); }
      const c = new Float64Array(n * n);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < n; k++) {
          const aik = a[i * n + k];
          for (let j = 0; j < n; j++) c[i * n + j] += aik * b[k * n + j];
        }
      }
      const elapsed = performance.now() - start;
      setMainThreadResult(`Multiplied ${n}×${n} matrices`);
      setMainThreadTime(elapsed);
    } else if (selectedPreset.name === 'json') {
      const rounds = Number(parsedInput);
      const start = performance.now();
      const data: any = { items: [] };
      for (let i = 0; i < 500; i++) {
        data.items.push({
          id: i, name: `Item ${i}`,
          nested: { a: Math.random(), b: Math.random(), c: [1, 2, 3, 4, 5] },
          tags: ['tag1', 'tag2', 'tag3', 'tag4'],
          timestamp: Date.now() + i
        });
      }
      for (let r = 0; r < rounds; r++) {
        const str = JSON.stringify(data);
        JSON.parse(str);
      }
      const elapsed = performance.now() - start;
      setMainThreadResult(`Parsed/stringified ${rounds} times`);
      setMainThreadTime(elapsed);
    }
  }, [inputData, selectedPreset]);

  // ── Handle preset change ───────────────────────────────────────────────

  const handlePresetChange = useCallback((preset: Preset) => {
    killWorker();
    setSelectedPreset(preset);
    setWorkerCode(preset.workerCode);
    setInputData(preset.inputData);
    setLogs([]);
    setMainThreadResult(null);
    setMainThreadTime(null);
  }, [killWorker]);

  // ── Copy code ─────────────────────────────────────────────────────────

  const [copiedCode, setCopiedCode] = useState(false);
  const copyWorkerCode = useCallback(() => {
    navigator.clipboard.writeText(workerCode).then(() => {
      setCopiedCode(true);
      toast.success('Worker code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }, [workerCode]);

  // ── Log type styling ──────────────────────────────────────────────────

  const logTypeStyle = (type: WorkerLog['type']) => {
    switch (type) {
      case 'send': return 'text-blue-400';
      case 'receive': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-slate-400';
    }
  };

  return (
    <ToolLayout
      title="Web Workers Playground"
      description="Explore the Web Workers API — offload heavy computation to background threads and keep the UI responsive. Send messages, compare performance, and inspect the worker lifecycle."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            <Layers className="w-4 h-4 inline mr-1" />
            Presets
          </span>
          <select
            value={selectedPreset.name}
            onChange={(e) => {
              const preset = PRESETS.find(p => p.name === e.target.value);
              if (preset) handlePresetChange(preset);
            }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 flex-1 min-w-0 sm:flex-none"
          >
            {PRESETS.map(p => (
              <option key={p.name} value={p.name}>{p.label}</option>
            ))}
          </select>
          <span className="h-5 w-px bg-slate-700 hidden sm:block" />
          <button
            onClick={() => setShowWorkerCode(!showWorkerCode)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            {showWorkerCode ? 'Hide' : 'Show'} Worker Code
            <ChevronDown className={`w-3 h-3 transition-transform ${showWorkerCode ? 'rotate-180' : ''}`} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Preset description ────────────────────────────────────── */}
        <div className="p-4 rounded-lg bg-brand-500/10 border border-brand-500/20">
          <p className="text-sm text-slate-300 leading-relaxed">
            <Zap className="w-4 h-4 inline mr-1.5 text-brand-400 align-text-bottom" />
            {selectedPreset.description}
          </p>
        </div>

        {/* ── Worker Code (collapsible) ─────────────────────────────── */}
        {showWorkerCode && (
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Worker Script
              </span>
              <button
                onClick={copyWorkerCode}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed max-h-64 overflow-y-auto">
              {workerCode}
            </pre>
          </div>
        )}

        {/* ── Input and controls ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Input Data
            </label>
            <input
              type="text"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              placeholder="Enter input for worker..."
            />
          </div>
          <button
            onClick={() => spawnWorker(workerCode, inputData)}
            disabled={workerRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
          >
            <Play className="w-4 h-4" />
            Run Worker
          </button>
          <button
            onClick={runOnMainThread}
            disabled={workerRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
          >
            <Monitor className="w-4 h-4" />
            Run Main Thread
          </button>
          <button
            onClick={killWorker}
            disabled={!workerRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              bg-red-900/50 text-red-400 hover:bg-red-900/80 border border-red-800 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]"
          >
            <Square className="w-4 h-4" />
            Terminate
          </button>
        </div>

        {/* ── Status badge ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            workerRunning
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${workerRunning ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            Worker {workerRunning ? 'Running' : 'Idle'}
          </span>
          {mainThreadTime !== null && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border bg-slate-800 text-slate-400 border-slate-700">
              <Cpu className="w-3 h-3" />
              Main thread: <span className="font-mono text-brand-400">{mainThreadTime.toFixed(0)}ms</span>
            </span>
          )}
        </div>

        {/* ── Performance comparison ─────────────────────────────────── */}
        {mainThreadResult !== null && (
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Main Thread Result (UI blocked during execution)
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">{mainThreadResult}</p>
              {mainThreadTime !== null && (
                <p className="text-xs text-slate-500">
                  The browser&apos;s main thread was frozen for {mainThreadTime.toFixed(0)}ms during this computation.
                  Scroll, clicks, and animations would be unresponsive.
                  Now run the same task in the worker and notice — the UI stays fluid.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Message log ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Message Log
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({logs.length} entries)
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogsVisible(!logsVisible)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {logsVisible ? 'Hide' : 'Show'} Log
              </button>
              <button
                onClick={() => setLogs([])}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {logsVisible && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-center py-6">
                  No messages yet. Run the worker to see postMessage communication.
                </p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-2 py-0.5 border-b border-slate-800 last:border-0">
                    <span className="text-slate-600 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`shrink-0 uppercase font-semibold ${logTypeStyle(log.type)}`}>
                      {log.type === 'send' ? '→ SEND' : log.type === 'receive' ? '← RECV' : log.type === 'error' ? '✕ ERR' : 'i INFO'}
                    </span>
                    <span className={`break-all ${
                      log.type === 'error' ? 'text-red-300' :
                      log.type === 'send' ? 'text-slate-400' :
                      'text-slate-300'
                    }`}>
                      {log.content.length > 300 ? log.content.slice(0, 300) + '…' : log.content}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── How it works ────────────────────────────────────────────── */}
        <div className="p-5 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Code className="w-4 h-4 text-brand-400" />
            How Web Workers Work
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
            <div className="space-y-1.5">
              <span className="text-slate-200 font-semibold block">1. Offloaded Thread</span>
              <p>The worker runs in a separate OS thread — it never blocks the main UI thread. You can scroll, click, and interact while computation happens in the background.</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-slate-200 font-semibold block">2. Message Passing</span>
              <p>Communication is via structured cloning (not shared memory). <code className="text-brand-400 bg-slate-800 px-1 rounded">postMessage()</code> sends data; <code className="text-brand-400 bg-slate-800 px-1 rounded">onmessage</code> receives it.</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-slate-200 font-semibold block">3. No DOM Access</span>
              <p>Workers can&apos;t access the DOM, <code className="text-slate-400 bg-slate-800 px-1 rounded">window</code>, or <code className="text-slate-400 bg-slate-800 px-1 rounded">document</code>. They DO have <code className="text-brand-400 bg-slate-800 px-1 rounded">fetch</code>, <code className="text-brand-400 bg-slate-800 px-1 rounded">IndexedDB</code>, and WebSockets.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
