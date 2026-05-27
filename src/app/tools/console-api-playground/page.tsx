'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Play, Copy, Trash2, Terminal, Code2, Search, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConsoleEntry {
  id: number;
  type: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'table' | 'result';
  message: string;
  timestamp: number;
}

interface DemoMethod {
  name: string;
  description: string;
  category: string;
  signature: string;
}

const CONSOLE_METHODS: DemoMethod[] = [
  { name: 'console.log', description: 'Output a message to the console', category: 'Output', signature: 'log(...data)' },
  { name: 'console.debug', description: 'Output a debug-level message', category: 'Output', signature: 'debug(...data)' },
  { name: 'console.info', description: 'Output an informational message', category: 'Output', signature: 'info(...data)' },
  { name: 'console.warn', description: 'Output a warning message (yellow icon)', category: 'Output', signature: 'warn(...data)' },
  { name: 'console.error', description: 'Output an error message (red icon)', category: 'Output', signature: 'error(...data)' },
  { name: 'console.assert', description: 'Log message if assertion is falsy', category: 'Output', signature: 'assert(condition, ...data)' },
  { name: 'console.clear', description: 'Clear the console', category: 'Utility', signature: 'clear()' },
  { name: 'console.count', description: 'Log number of times this line has been called', category: 'Counting', signature: 'count(label?)' },
  { name: 'console.countReset', description: 'Reset the counter', category: 'Counting', signature: 'countReset(label?)' },
  { name: 'console.dir', description: 'Interactive listing of object properties', category: 'Inspection', signature: 'dir(object)' },
  { name: 'console.dirxml', description: 'Interactive XML/HTML tree of an element', category: 'Inspection', signature: 'dirxml(node)' },
  { name: 'console.group', description: 'Create a new inline group, indenting subsequent output', category: 'Grouping', signature: 'group(label?)' },
  { name: 'console.groupCollapsed', description: 'Same as group(), but collapsed by default', category: 'Grouping', signature: 'groupCollapsed(label?)' },
  { name: 'console.groupEnd', description: 'Exit the current inline group', category: 'Grouping', signature: 'groupEnd()' },
  { name: 'console.table', description: 'Display tabular data as a table', category: 'Inspection', signature: 'table(data, columns?)' },
  { name: 'console.time', description: 'Start a timer with a given label', category: 'Timing', signature: 'time(label?)' },
  { name: 'console.timeEnd', description: 'Stop the timer and log elapsed time', category: 'Timing', signature: 'timeEnd(label?)' },
  { name: 'console.timeLog', description: 'Log the current timer value without stopping', category: 'Timing', signature: 'timeLog(label?, ...data)' },
  { name: 'console.trace', description: 'Output a stack trace', category: 'Debugging', signature: 'trace(...data)' },
  { name: 'console.profile', description: 'Start the browser profiler', category: 'Profiling', signature: 'profile(label?)' },
  { name: 'console.profileEnd', description: 'Stop the browser profiler', category: 'Profiling', signature: 'profileEnd(label?)' },
  { name: 'console.memory', description: 'Memory usage stats (Chrome-only)', category: 'Profiling', signature: 'memory' },
];

const PRESETS = [
  {
    name: 'Basic Logging',
    description: 'Strings, numbers, objects, and arrays',
    code: 'console.log("Hello, DevBench!");\nconsole.log({ user: "alice", role: "admin" });\nconsole.log(["apple", "banana", "cherry"]);\nconsole.info("This is info");\nconsole.warn("This is a warning");\nconsole.error("This is an error");',
  },
  {
    name: 'Styled Output',
    description: 'CSS-styled console messages with %c',
    code: 'console.log("%cBig Blue Text", "font-size: 24px; font-weight: bold; color: #3b82f6;");\nconsole.log("%cSuccess", "color: #22c55e; font-weight: bold; padding: 4px 8px; background: #052e16; border-radius: 4px;");\nconsole.log("%cWarning%c - disk space low", "color: #f59e0b; font-weight: bold;", "color: #cbd5e1;");\nconsole.warn("%cCritical Error", "font-size: 18px; color: #ef4444; font-weight: bold; background: #450a0a; padding: 8px; border-radius: 6px;");',
  },
  {
    name: 'Console.table()',
    description: 'Tabular data display',
    code: 'const users = [\n  { name: "Alice", age: 28, city: "NYC" },\n  { name: "Bob", age: 34, city: "SF" },\n  { name: "Carol", age: 22, city: "Austin" },\n];\nconsole.table(users);\nconsole.table(users, ["name", "age"]);',
  },
  {
    name: 'Timing & Counting',
    description: 'Measure performance with time/timeEnd and count',
    code: 'console.time("loop");\nlet sum = 0;\nfor (let i = 0; i < 1e6; i++) { sum += i; }\nconsole.timeEnd("loop");\n\nconsole.count("render");\nconsole.count("render");\nconsole.count("render");\nconsole.countReset("render");\nconsole.count("render");',
  },
  {
    name: 'Grouping',
    description: 'Hierarchical log groups',
    code: 'console.group("API Response");\nconsole.log("Status: 200 OK");\nconsole.groupCollapsed("Headers");\nconsole.log("Content-Type: application/json");\nconsole.log("X-Request-Id: abc-123");\nconsole.groupEnd();\nconsole.group("Body");\nconsole.log({ id: 42, name: "Nexus" });\nconsole.groupEnd();\nconsole.groupEnd();',
  },
  {
    name: 'Assertions',
    description: 'Conditional error logging',
    code: 'console.assert(true, "This won\'t show");\nconsole.assert(false, "Assertion failed: expected 5, got 3");\nconsole.assert(1 === 2, "Math broke!");\n\nconst user = { role: "viewer" };\nconsole.assert(user.role === "admin", "Access denied for role: " + user.role);',
  },
  {
    name: 'Trace & Inspection',
    description: 'Stack traces and object inspection',
    code: 'function level3() { console.trace("Trace from level3"); }\nfunction level2() { level3(); }\nfunction level1() { level2(); }\nlevel1();\n\nconst complex = { deep: { nested: { value: "found" } } };\nconsole.dir(complex);\nconsole.log("Document title: " + document.title);',
  },
  {
    name: 'Template Strings',
    description: 'Interpolation and string formatting',
    code: 'const env = "production";\nconst load = 0.87;\nconst users = 1247;\n\nconsole.log("App running in %c" + env + "%c mode", "color: #3b82f6; font-weight: bold;", "");\nconsole.log("Server load: " + (load * 100).toFixed(0) + "% | Active users: " + users);\nconsole.log("%cMetrics", "font-weight: bold; font-size: 16px;");\nconsole.log("  CPU: " + (load * 100).toFixed(1) + "%");\nconsole.log("  Memory: " + (0.62 * 100).toFixed(1) + "%");',
  },
];

const CATEGORIES = ['All', 'Output', 'Inspection', 'Grouping', 'Timing', 'Counting', 'Debugging', 'Profiling', 'Utility'];

export default function ConsoleAPIPlaygroundPage() {
  const [code, setCode] = useState(PRESETS[0].code);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<DemoMethod | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const nextId = useRef(1);
  const codeRef = useRef(code);
  const countMapRef = useRef<Record<string, number>>({});
  const timeMapRef = useRef<Record<string, number>>({});

  useEffect(() => { codeRef.current = code; }, [code]);

  const runCode = useCallback(() => {
    const collected: ConsoleEntry[] = [];
    let entryId = 0;
    countMapRef.current = {};
    timeMapRef.current = {};

    const fc = {
      log: (...a: unknown[]) => { collected.push({ id: entryId++, type: 'log', message: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), timestamp: Date.now() }); },
      info: (...a: unknown[]) => { collected.push({ id: entryId++, type: 'info', message: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), timestamp: Date.now() }); },
      warn: (...a: unknown[]) => { collected.push({ id: entryId++, type: 'warn', message: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), timestamp: Date.now() }); },
      error: (...a: unknown[]) => { collected.push({ id: entryId++, type: 'error', message: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), timestamp: Date.now() }); },
      debug: (...a: unknown[]) => { collected.push({ id: entryId++, type: 'debug', message: a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '), timestamp: Date.now() }); },
      table: (data: unknown, columns?: string[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const cols = columns || Object.keys(data[0] as Record<string, unknown>);
          const cw = 8;
          const pad = (s: string) => s.substring(0, cw).padEnd(cw);
          const sep = '+' + cols.map(() => '-'.repeat(cw + 2)).join('+') + '+';
          const header = '| ' + cols.map(c => pad(c)).join(' | ') + ' |';
          const rows = data.slice(0, 15).map((row: unknown) => {
            const r = row as Record<string, unknown>;
            return '| ' + cols.map(c => pad(String(r[c] || ''))).join(' | ') + ' |';
          }).join('\n');
          collected.push({ id: entryId++, type: 'table', message: sep + '\n' + header + '\n' + sep + '\n' + rows + '\n' + sep, timestamp: Date.now() });
        } else {
          collected.push({ id: entryId++, type: 'table', message: '(empty table)', timestamp: Date.now() });
        }
      },
      assert: (condition: boolean, ...a: unknown[]) => { if (!condition) collected.push({ id: entryId++, type: 'error', message: 'Assertion failed: ' + a.map(x => String(x)).join(' '), timestamp: Date.now() }); },
      clear: () => { collected.length = 0; collected.push({ id: entryId++, type: 'info', message: 'Console was cleared', timestamp: Date.now() }); },
      count: (label: string = 'default') => { countMapRef.current[label] = (countMapRef.current[label] || 0) + 1; collected.push({ id: entryId++, type: 'log', message: label + ': ' + countMapRef.current[label], timestamp: Date.now() }); },
      countReset: (label: string = 'default') => { countMapRef.current[label] = 0; collected.push({ id: entryId++, type: 'debug', message: 'Counter "' + label + '" reset', timestamp: Date.now() }); },
      dir: (obj: unknown) => { collected.push({ id: entryId++, type: 'log', message: JSON.stringify(obj, null, 2), timestamp: Date.now() }); },
      dirxml: (node: unknown) => { const n = node as { nodeName?: string }; collected.push({ id: entryId++, type: 'log', message: n.nodeName ? '<' + n.nodeName.toLowerCase() + '>' : String(node), timestamp: Date.now() }); },
      group: (label?: string) => { collected.push({ id: entryId++, type: 'log', message: '\u25b6 ' + (label || 'group'), timestamp: Date.now() }); },
      groupCollapsed: (label?: string) => { collected.push({ id: entryId++, type: 'log', message: '\u25b8 ' + (label || 'group'), timestamp: Date.now() }); },
      groupEnd: () => { collected.push({ id: entryId++, type: 'debug', message: '\u2500\u2500 group end \u2500\u2500', timestamp: Date.now() }); },
      time: (label: string = 'default') => { timeMapRef.current[label] = performance.now(); },
      timeEnd: (label: string = 'default') => {
        const start = timeMapRef.current[label];
        if (start !== undefined) {
          const elapsed = performance.now() - start;
          collected.push({ id: entryId++, type: 'log', message: label + ': ' + elapsed.toFixed(2) + 'ms', timestamp: Date.now() });
          delete timeMapRef.current[label];
        } else {
          collected.push({ id: entryId++, type: 'warn', message: 'Timer "' + label + '" does not exist', timestamp: Date.now() });
        }
      },
      timeLog: (label: string = 'default', ...a: unknown[]) => {
        const start = timeMapRef.current[label];
        if (start !== undefined) {
          const elapsed = performance.now() - start;
          collected.push({ id: entryId++, type: 'log', message: label + ': ' + elapsed.toFixed(2) + 'ms', timestamp: Date.now() });
        }
      },
      trace: (...a: unknown[]) => {
        const msg = a.map(x => String(x)).join(' ');
        collected.push({ id: entryId++, type: 'log', message: (msg || 'console.trace') + '\n    at <sandbox>:1:1\n    at eval', timestamp: Date.now() });
      },
      profile: (label?: string) => { collected.push({ id: entryId++, type: 'info', message: 'Profiler "' + (label || 'default') + '" started', timestamp: Date.now() }); },
      profileEnd: (label?: string) => { collected.push({ id: entryId++, type: 'info', message: 'Profiler "' + (label || 'default') + '" stopped', timestamp: Date.now() }); },
      memory: { jsHeapSizeLimit: 2172649472, totalJSHeapSize: 42000000, usedJSHeapSize: 38000000 },
    };

    try {
      const fn = new Function('console', codeRef.current);
      fn(fc);
    } catch (err) {
      collected.push({ id: entryId++, type: 'error', message: err instanceof Error ? err.name + ': ' + err.message : String(err), timestamp: Date.now() });
    }

    if (collected.length > 0) {
      setEntries(prev => {
        const merged = [...prev, ...collected.map(e => ({ ...e, id: nextId.current++ }))];
        return merged.slice(-50);
      });
    }
  }, []);

  const clearEntries = useCallback(() => { setEntries([]); nextId.current = 1; toast.success('Console cleared'); }, []);
  const copyCode = useCallback(() => { navigator.clipboard.writeText(code).then(() => toast.success('Copied to clipboard')); }, [code]);
  const copyAll = useCallback(() => {
    const text = entries.map(e => {
      const p = { log: '>', info: 'i', warn: '!', error: 'X', debug: '~', table: 'T', result: '=' }[e.type] || '?';
      return '[' + p + '] ' + e.message;
    }).join('\n');
    navigator.clipboard.writeText(text).then(() => toast.success('Console output copied'));
  }, [entries]);

  useEffect(() => { if (autoRun) { const t = setTimeout(runCode, 600); return () => clearTimeout(t); } }, [code, autoRun, runCode]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [runCode]);

  const filteredMethods = useMemo(() => {
    let m = CONSOLE_METHODS;
    if (activeCategory !== 'All') m = m.filter(x => x.category === activeCategory);
    if (searchQuery) { const q = searchQuery.toLowerCase(); m = m.filter(x => x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)); }
    return m;
  }, [activeCategory, searchQuery]);

  const borderStyles: Record<string, string> = { log: 'border-l-slate-600', info: 'border-l-blue-500', warn: 'border-l-yellow-500', error: 'border-l-red-500', debug: 'border-l-purple-500', table: 'border-l-emerald-500', result: 'border-l-green-500' };
  const textStyles: Record<string, string> = { log: 'text-slate-300', info: 'text-blue-300', warn: 'text-yellow-300', error: 'text-red-300', debug: 'text-purple-300', table: 'text-emerald-300', result: 'text-green-300' };
  const labels: Record<string, string> = { log: 'LOG', info: 'INF', warn: 'WRN', error: 'ERR', debug: 'DBG', table: 'TBL', result: 'OUT' };

  return (
    <ToolLayout
      title="Console API Playground"
      description="Explore every browser console method — log, table, time, trace, group, and more. Write code snippets, run them, and see the output in a realistic browser console."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Reference Panel */}
        <div className="lg:col-span-1">
          <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4 sticky top-24">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-400" />
              Console API Reference
            </h3>
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search methods..."
                className="w-full bg-slate-800 border border-slate-700 rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="space-y-0.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredMethods.map(method => (
                <button
                  key={method.name}
                  onClick={() => setSelectedMethod(selectedMethod && selectedMethod.name === method.name ? null : method)}
                  className={`w-full text-left px-2.5 py-2 rounded-md transition-colors ${
                    selectedMethod && selectedMethod.name === method.name
                      ? 'bg-brand-500/10 border border-brand-500/20'
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-brand-400">{method.name}</span>
                    <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">{method.category}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{method.description}</div>
                  {selectedMethod && selectedMethod.name === method.name && (
                    <div className="mt-1.5 p-2 bg-slate-800/80 rounded text-[11px] font-mono text-slate-300 border border-slate-700">
                      {method.signature}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Editor & Console */}
        <div className="lg:col-span-2 space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => setCode(preset.code)}
                title={preset.description}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  code === preset.code
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Code Editor */}
          <div className="bg-[#0d1117] border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] text-slate-400 font-mono">script.js</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRun}
                    onChange={e => setAutoRun(e.target.checked)}
                    className="w-3 h-3 rounded border-slate-600 bg-slate-800 accent-brand-500"
                  />
                  Auto-run
                </label>
                <span className="text-[10px] text-slate-600">{code.split('\n').length} lines</span>
              </div>
            </div>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              rows={10}
              className="w-full bg-transparent text-sm font-mono text-slate-200 p-4 resize-none focus:outline-none leading-relaxed"
              placeholder="Write JavaScript using console methods..."
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700/50 bg-slate-800/40">
              <div className="flex items-center gap-2">
                <button
                  onClick={runCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 border border-brand-500/30 text-xs font-medium transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run
                </button>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-700 hover:border-slate-600 text-[11px] transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <span className="text-[10px] text-slate-600">Ctrl+Enter to run</span>
            </div>
          </div>

          {/* Console Output */}
          <div className="bg-[#0d1117] border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] text-slate-400 font-mono">Console Output</span>
                <span className="text-[10px] text-slate-600">({entries.length} entries)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAll}
                  disabled={entries.length === 0}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy all
                </button>
                <button
                  onClick={clearEntries}
                  disabled={entries.length === 0}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>
            <div className="p-3 min-h-[220px] max-h-[420px] overflow-y-auto font-mono text-xs leading-relaxed">
              {entries.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-slate-600">
                  <div className="text-center">
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      Write code and press{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[11px] border border-slate-700">
                        Run
                      </kbd>{' '}
                      to see output
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {entries.map(entry => (
                    <div
                      key={entry.id}
                      className={`pl-3 border-l-2 py-0.5 ${borderStyles[entry.type] || 'border-l-slate-600'}`}
                    >
                      <span className="text-[10px] text-slate-600 mr-2 select-none">
                        {labels[entry.type] || entry.type.toUpperCase()}
                      </span>
                      {entry.type === 'table' ? (
                        <pre className={`text-[10px] leading-snug mt-0.5 whitespace-pre ${textStyles[entry.type]}`}>
                          {entry.message}
                        </pre>
                      ) : (
                        <span className={`whitespace-pre-wrap break-all ${textStyles[entry.type] || 'text-slate-400'}`}>
                          {entry.message}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
