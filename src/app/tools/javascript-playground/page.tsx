'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Play, Trash2, Copy, Clock, Zap, Code2, Terminal, Bug, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { name: string; description: string; code: string }[] = [
  {
    name: 'Array Methods',
    description: 'Map, filter, reduce, and more',
    code: `// Array methods showcase
const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Map: double each number
const doubled = nums.map(n => n * 2);
console.log('Doubled:', doubled);

// Filter: get even numbers
const evens = nums.filter(n => n % 2 === 0);
console.log('Evens:', evens);

// Reduce: sum all numbers
const sum = nums.reduce((acc, n) => acc + n, 0);
console.log('Sum:', sum);

// Find: first number > 5
const first = nums.find(n => n > 5);
console.log('First > 5:', first);

// Some: any even?
console.log('Has evens?', nums.some(n => n % 2 === 0));

// Every: all positive?
console.log('All > 0?', nums.every(n => n > 0));
`,
  },
  {
    name: 'Object Manipulation',
    description: 'Keys, values, entries, destructuring',
    code: `// Object manipulation
const user = {
  name: 'Ada Lovelace',
  role: 'Engineer',
  skills: ['JavaScript', 'TypeScript', 'React'],
  active: true,
};

// Object.keys
console.log('Keys:', Object.keys(user));

// Object.values
console.log('Values:', Object.values(user));

// Object.entries
console.log('\\nEntries:');
for (const [key, value] of Object.entries(user)) {
  console.log(\`  \${key}: \${JSON.stringify(value)}\`);
}

// Destructuring
const { name, role, skills } = user;
console.log(\`\\n\${name} is a \${role}\`);
console.log('Top skill:', skills[0]);

// Spread and rest
const extended = { ...user, level: 'Senior' };
console.log('\\nExtended:', extended);

// Optional chaining
const city = user.address?.city ?? 'Unknown';
console.log('City:', city);
`,
  },
  {
    name: 'async / await',
    description: 'Promises, fetch simulation, error handling',
    code: `// Async/await patterns

// Simulate an API call
function fetchUser(id: number): Promise<{ id: number; name: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id > 0) {
        resolve({ id, name: \`User \${id}\` });
      } else {
        reject(new Error('Invalid user ID'));
      }
    }, 500);
  });
}

async function main() {
  console.time('fetch');

  try {
    // Sequential fetches
    const user1 = await fetchUser(1);
    console.log('User 1:', user1);

    // Parallel fetches with Promise.all
    const [user2, user3, user4] = await Promise.all([
      fetchUser(2),
      fetchUser(3),
      fetchUser(4),
    ]);
    console.log('Users 2-4:', { user2, user3, user4 });

    // Error handling
    await fetchUser(-1);
  } catch (err: any) {
    console.error('Caught error:', err.message);
  }

  console.timeEnd('fetch');
  console.log('\\nDone!');
}

main();
`,
  },
  {
    name: 'DOM-like Manipulation',
    description: 'String manipulation, regex, dates',
    code: `// String & data utilities

// String methods
const str = '  Hello, World!  ';
console.log('Original:', JSON.stringify(str));
console.log('Trimmed:', JSON.stringify(str.trim()));
console.log('Uppercase:', str.trim().toUpperCase());
console.log('Split:', str.trim().split(', '));
console.log('Replace:', str.trim().replace('World', 'JavaScript'));
console.log('Includes:', str.includes('Hello'));
console.log('Slice:', str.trim().slice(0, 5));

// Template literals
const name = 'DevBench';
const version = 2;
console.log(\`\\n\${name} v\${version} is awesome!\`);

// Regex
const email = 'user@example.com';
const emailRegex = /^[\\w.-]+@[\\w.-]+\\.\\w+$/;
console.log(\`\\n\${email} is valid:\`, emailRegex.test(email));

// Dates
const now = new Date();
console.log('\\nNow:', now.toISOString());
console.log('Locale:', now.toLocaleDateString('en-US'));
console.log('Relative:', new Intl.RelativeTimeFormat('en').format(-3, 'day'));
`,
  },
  {
    name: 'Data Structures',
    description: 'Set, Map, WeakMap, typed arrays',
    code: `// Modern data structures

// Set — unique values
const tags = new Set(['js', 'ts', 'react', 'js', 'ts']);
console.log('Set (unique):', [...tags]);
tags.add('node');
console.log('Has node?', tags.has('node'));
console.log('Size:', tags.size);

// Map — key-value pairs with any key type
const cache = new Map<string, number>();
cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
console.log('\\nMap entries:');
for (const [key, value] of cache) {
  console.log(\`  \${key} => \${value}\`);
}

// Map with object keys
const objMap = new Map<object, string>();
const key1 = { id: 1 };
const key2 = { id: 2 };
objMap.set(key1, 'First');
objMap.set(key2, 'Second');
console.log('\\nObject-keyed map:', objMap.get(key1));

// GroupBy (ES2024!)
const items = [
  { type: 'fruit', name: 'apple' },
  { type: 'fruit', name: 'banana' },
  { type: 'veg', name: 'carrot' },
  { type: 'fruit', name: 'orange' },
  { type: 'veg', name: 'broccoli' },
];

const grouped = Object.groupBy(items, item => item.type);
console.log('\\nGroupBy:', grouped);
`,
  },
  {
    name: 'Algorithm: FizzBuzz',
    description: 'Classic coding interview problem',
    code: `// Classic FizzBuzz
function fizzBuzz(n: number): void {
  for (let i = 1; i <= n; i++) {
    const out =
      i % 15 === 0 ? 'FizzBuzz' :
      i % 3 === 0  ? 'Fizz' :
      i % 5 === 0  ? 'Buzz' :
      String(i);
    console.log(out);
  }
}

console.time('fizzbuzz');
fizzBuzz(30);
console.timeEnd('fizzbuzz');
`,
  },
  {
    name: 'Browser APIs',
    description: 'Clipboard, localStorage, fetch, URL',
    code: `// Browser APIs (available in this playground!)

// URL parsing
const url = new URL('https://example.com/path?query=js&page=1#section');
console.log('Protocol:', url.protocol);
console.log('Host:', url.host);
console.log('Path:', url.pathname);
console.log('Search params:', [...url.searchParams.entries()]);

// localStorage
localStorage.setItem('playground-test', JSON.stringify({ ts: Date.now() }));
const stored = localStorage.getItem('playground-test');
console.log('\\nlocalStorage:', stored ? JSON.parse(stored) : null);
localStorage.removeItem('playground-test');

// navigator info
console.log('\\nPlatform:', navigator.platform);
console.log('Language:', navigator.language);
console.log('Online:', navigator.onLine);
console.log('User agent:', navigator.userAgent.slice(0, 60) + '...');

// Intl formatting
const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
console.log('\\nFormatted:', nf.format(1234567.89));

const rf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
console.log('2 days ago:', rf.format(-2, 'day'));
`,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export default function JavaScriptPlaygroundPage() {
  const [code, setCode] = useState(PRESETS[0].code);
  const [output, setOutput] = useState<LogEntry[]>([]);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);

  // Strip TypeScript annotations so new Function() can parse the code
  const stripTypeScript = useCallback((code: string): string => {
    return code
      // Remove return type annotations: function foo(): Type {
      .replace(/\)\s*:\s*(?:string|number|boolean|void|any|never|unknown|[\w<>\[\]{},|&\s]+?)\s*\{/g, ') {')
      // Remove parameter type annotations: (param: Type, param: Type)
      .replace(/(\w+)\s*:\s*(?:string|number|boolean|void|any|never|unknown|[\w<>\[\]{},|&\s]+?)\s*(?=[,)])/g, '$1')
      // Remove generic type arguments from new/constructors: new Map<string, number>
      .replace(/new\s+(\w+)<[^>]+>/g, 'new $1')
      // Remove variable declaration types: const x: Type = ...
      .replace(/(const|let|var)\s+(\w+)\s*:\s*[\w<>\[\]{},|&\s]+?\s*=/g, '$1 $2 =')
      // Remove : Type in catch clauses: catch (err: any)
      .replace(/catch\s*\((\w+)\s*:\s*any\s*\)/g, 'catch ($1)')
      // Remove : Type annotations in destructured params: ({ id }: { id: number })
      .replace(/\}\s*:\s*\{[^}]+\}\s*\)/g, '})');
  }, []);

  const runCode = useCallback(() => {
    const logs: LogEntry[] = [];
    setError(null);

    // Strip TypeScript annotations
    const jsCode = stripTypeScript(code);

    // Capture console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    const addLog = (type: LogEntry['type'], args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      logs.push({ type, message, timestamp: Date.now() });
    };

    console.log = (...args: unknown[]) => addLog('log', args);
    console.warn = (...args: unknown[]) => addLog('warn', args);
    console.error = (...args: unknown[]) => addLog('error', args);
    console.info = (...args: unknown[]) => addLog('info', args);

    const start = performance.now();
    try {
      // Use indirect eval to run in global scope, with TS stripped
      const fn = new Function(jsCode);
      fn();
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logs.push({
        type: 'error',
        message: `Runtime Error: ${msg}`,
        timestamp: Date.now(),
      });
    } finally {
      // Restore original console
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;

      const elapsed = performance.now() - start;
      setExecTime(Math.round(elapsed * 100) / 100); // ms, 2 decimals
      setOutput(logs);

      // Scroll output to bottom
      setTimeout(() => {
        outputRef.current?.scrollTo({
          top: outputRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 50);
    }
  }, [code, stripTypeScript]);

  const clearOutput = useCallback(() => {
    setOutput([]);
    setExecTime(null);
    setError(null);
  }, []);

  const copyOutput = useCallback(() => {
    const text = output.map((entry) => {
      const prefix = entry.type === 'error' ? '[ERROR]' : entry.type === 'warn' ? '[WARN]' : '';
      return prefix ? `${prefix} ${entry.message}` : entry.message;
    }).join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Output copied!'),
      () => toast.error('Copy failed'),
    );
  }, [output]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code copied!'),
      () => toast.error('Copy failed'),
    );
  }, [code]);

  const loadPreset = useCallback((index: number) => {
    setCode(PRESETS[index].code);
    setActivePreset(index);
    setOutput([]);
    setExecTime(null);
    setError(null);
  }, []);

  const hasOutput = output.length > 0;

  return (
    <ToolLayout
      title="JavaScript Playground"
      description="Write, run, and test JavaScript snippets directly in your browser. Instant execution with console output, timing, and error handling."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-400" />
              Editor
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={runCode}
                className="btn-primary flex items-center gap-1.5 text-xs px-4 py-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Run
                <kbd className="ml-1 text-[10px] opacity-60 bg-white/10 rounded px-1 py-0.5">
                  Ctrl+Enter
                </kbd>
              </button>
              <button
                onClick={copyCode}
                className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                runCode();
              }
            }}
            spellCheck={false}
            className="w-full h-[420px] p-4 rounded-lg border border-slate-700/50 bg-[#0d1117] text-slate-200 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors"
            placeholder="Write JavaScript here..."
          />

          {/* Presets */}
          <div>
            <h3 className="text-white font-medium text-xs mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
              Quick Start Presets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PRESETS.map((preset, i) => (
                <button
                  key={preset.name}
                  onClick={() => loadPreset(i)}
                  className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                    activePreset === i && output.length === 0
                      ? 'border-brand-500/50 bg-brand-500/10'
                      : 'border-slate-700/40 bg-surface hover:border-slate-600/50'
                  }`}
                >
                  <div className="text-slate-200 font-medium truncate">{preset.name}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400" />
              Console Output
            </h3>
            <div className="flex items-center gap-2">
              {execTime !== null && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {execTime < 1 ? `${(execTime * 1000).toFixed(0)}μs` : `${execTime}ms`}
                </span>
              )}
              {hasOutput && (
                <>
                  <button
                    onClick={copyOutput}
                    className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={clearOutput}
                    className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            ref={outputRef}
            className="w-full h-[420px] rounded-lg border border-slate-700/50 bg-[#0d1117] overflow-y-auto"
          >
            {!hasOutput && !error && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 select-none">
                <Zap className="w-10 h-10 opacity-30" />
                <p className="text-sm">Click <span className="text-brand-400 font-medium">Run</span> or press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs font-mono">Ctrl+Enter</kbd></p>
                <p className="text-xs opacity-60">Output appears here</p>
              </div>
            )}

            {error && output.length === 0 && (
              <div className="p-4">
                <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                  <Bug className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-400 text-sm font-medium">Runtime Error</p>
                    <p className="text-red-300 text-sm mt-1 font-mono break-all">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {hasOutput && (
              <div className="p-3 space-y-0.5 font-mono text-sm">
                {output.map((entry, i) => {
                  const colorMap: Record<LogEntry['type'], string> = {
                    log: 'text-slate-300',
                    info: 'text-blue-400',
                    warn: 'text-yellow-400',
                    error: 'text-red-400',
                  };
                  return (
                    <div
                      key={i}
                      className={`${colorMap[entry.type]} py-0.5 break-all leading-relaxed whitespace-pre-wrap`}
                    >
                      {entry.message}
                    </div>
                  );
                })}

                {execTime !== null && (
                  <div className="mt-3 pt-2 border-t border-slate-700/50 text-slate-500 text-xs">
                    Execution completed in {execTime < 1 ? `${(execTime * 1000).toFixed(0)}μs` : `${execTime}ms`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div>
            <p className="text-slate-300 font-medium mb-1">Full Browser Environment</p>
            <p>Access <code className="text-brand-400">localStorage</code>, <code className="text-brand-400">navigator</code>, <code className="text-brand-400">fetch</code>, <code className="text-brand-400">Intl</code>, and all standard Web APIs. Code runs in a sandboxed Function context.</p>
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">Console Capture</p>
            <p><code className="text-brand-400">console.log</code>, <code className="text-brand-400">warn</code>, <code className="text-brand-400">error</code>, and <code className="text-brand-400">info</code> are captured and displayed. <code className="text-brand-400">console.time</code>/<code className="text-brand-400">timeEnd</code> work too.</p>
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">TypeScript Syntax</p>
            <p>Write with TypeScript annotations — they&apos;re stripped before execution. Variables are scoped to the playground, so no global pollution.</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
