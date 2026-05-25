'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Search, Zap, BookOpen, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── JSONPath Evaluator (pure client-side, no dependencies) ───

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function parsePath(path: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < path.length) {
    if (path[i] === '$') {
      tokens.push('$');
      i++;
    } else if (path[i] === '.') {
      i++;
      if (path[i] === '.') {
        tokens.push('..');
        i++;
      } else {
        // Read property name: alphanumeric, _, -, $
        let name = '';
        while (i < path.length && /[a-zA-Z0-9_\-$]/.test(path[i])) {
          name += path[i];
          i++;
        }
        if (name) tokens.push('.' + name);
      }
    } else if (path[i] === '[') {
      i++;
      let bracket = '';
      let depth = 1;
      while (i < path.length && depth > 0) {
        if (path[i] === '[') depth++;
        if (path[i] === ']') depth--;
        if (depth > 0) bracket += path[i];
        i++;
      }
      tokens.push('[' + bracket + ']');
    } else if (path[i] === '*') {
      tokens.push('*');
      i++;
    } else {
      i++;
    }
  }

  return tokens;
}

function evaluateFilter(
  expr: string,
  current: JsonValue,
  root: JsonValue
): boolean {
  // Strip the leading ?(
  expr = expr.trim();
  if (expr.startsWith('?(') && expr.endsWith(')')) {
    expr = expr.slice(2, -1);
  }

  // Handle @.prop comparisons
  const compMatch = expr.match(
    /^@(\.([a-zA-Z0-9_\-$]+)|\[(['"])([^'"]*)\3\])\s*(==|!=|<=|>=|<|>|=~)\s*(.+)$/
  );

  if (compMatch) {
    const key = compMatch[2] || compMatch[4];
    const op = compMatch[5];
    const rightRaw = compMatch[6].trim();

    let right: JsonValue;
    if (rightRaw === 'true') right = true;
    else if (rightRaw === 'false') right = false;
    else if (rightRaw === 'null') right = null;
    else if (rightRaw.startsWith("'") || rightRaw.startsWith('"')) {
      right = rightRaw.slice(1, -1);
    } else if (!isNaN(Number(rightRaw))) {
      right = Number(rightRaw);
    } else {
      right = rightRaw;
    }

    const left =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, JsonValue>)[key]
        : undefined;

    return compareValues(left, op, right);
  }

  // Handle simple truthiness: @.key (checks existence/truthiness)
  const truthyMatch = expr.match(/^@(\.([a-zA-Z0-9_\-$]+)|\[(['"])([^'"]*)\3\])$/);
  if (truthyMatch) {
    const key = truthyMatch[2] || truthyMatch[4];
    const val =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, JsonValue>)[key]
        : undefined;
    return !!val;
  }

  return false;
}

function compareValues(left: JsonValue | undefined, op: string, right: JsonValue): boolean {
  if (left === undefined || left === null) {
    if (op === '==' && right === null) return true;
    if (op === '!=' && right !== null) return true;
    return false;
  }

  if (op === '=~' && typeof right === 'string') {
    try {
      const regex = new RegExp(right);
      return regex.test(String(left));
    } catch {
      return false;
    }
  }

  // Coerce numeric comparison
  const lNum = Number(left);
  const rNum = Number(right);
  if (!isNaN(lNum) && !isNaN(rNum)) {
    switch (op) {
      case '==': return lNum === rNum;
      case '!=': return lNum !== rNum;
      case '<': return lNum < rNum;
      case '>': return lNum > rNum;
      case '<=': return lNum <= rNum;
      case '>=': return lNum >= rNum;
      default: return false;
    }
  }

  switch (op) {
    case '==': return String(left) === String(right);
    case '!=': return String(left) !== String(right);
    default: return false;
  }
}

function walk(
  current: JsonValue,
  tokens: string[],
  index: number,
  root: JsonValue,
  results: JsonValue[]
): void {
  if (index >= tokens.length) {
    results.push(current);
    return;
  }

  const token = tokens[index];

  // $ — root
  if (token === '$') {
    walk(root, tokens, index + 1, root, results);
    return;
  }

  // .. — recursive descent
  if (token === '..') {
    // First: continue without consuming this token against descendants
    if (Array.isArray(current)) {
      for (const item of current) {
        walk(item, tokens, index, root, results);
      }
    } else if (current && typeof current === 'object') {
      for (const val of Object.values(current)) {
        walk(val, tokens, index, root, results);
      }
    }
    // Second: try to match the rest of the tokens from here
    walk(current, tokens, index + 1, root, results);
    return;
  }

  // * — wildcard
  if (token === '*') {
    if (Array.isArray(current)) {
      for (const item of current) {
        walk(item, tokens, index + 1, root, results);
      }
    } else if (current && typeof current === 'object') {
      for (const val of Object.values(current)) {
        walk(val, tokens, index + 1, root, results);
      }
    }
    return;
  }

  // .key — property access
  if (token.startsWith('.')) {
    const key = token.slice(1);
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const next = (current as Record<string, JsonValue>)[key];
      if (next !== undefined) {
        walk(next, tokens, index + 1, root, results);
      }
    }
    return;
  }

  // [something] — bracket access
  if (token.startsWith('[') && token.endsWith(']')) {
    const inner = token.slice(1, -1);

    // Filter expression [?(@...)]
    if (inner.startsWith('?(') && inner.endsWith(')')) {
      if (Array.isArray(current)) {
        for (const item of current) {
          if (evaluateFilter(inner, item, root)) {
            walk(item, tokens, index + 1, root, results);
          }
        }
      }
      return;
    }

    // Wildcard [*]
    if (inner === '*') {
      if (Array.isArray(current)) {
        for (const item of current) {
          walk(item, tokens, index + 1, root, results);
        }
      } else if (current && typeof current === 'object') {
        for (const val of Object.values(current)) {
          walk(val, tokens, index + 1, root, results);
        }
      }
      return;
    }

    // Slice [start:end:step] or [start:end]
    const sliceMatch = inner.match(/^(-?\d+)?:(-?\d+)?(?::(-?\d+))?$/);
    if (sliceMatch && Array.isArray(current)) {
      const start = sliceMatch[1] !== undefined ? parseInt(sliceMatch[1]) : 0;
      const end = sliceMatch[2] !== undefined ? parseInt(sliceMatch[2]) : current.length;
      const step = sliceMatch[3] !== undefined ? parseInt(sliceMatch[3]) : 1;

      // Normalize negative indices
      const len = current.length;
      const s = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
      const e = end < 0 ? Math.max(0, len + end) : Math.min(end, len);

      for (let idx = s; step > 0 ? idx < e : idx > e; idx += step) {
        walk(current[idx], tokens, index + 1, root, results);
      }
      return;
    }

    // Single index [n] or [-n]
    const indexMatch = inner.match(/^-?\d+$/);
    if (indexMatch && Array.isArray(current)) {
      let idx = parseInt(inner);
      if (idx < 0) idx = current.length + idx;
      if (idx >= 0 && idx < current.length) {
        walk(current[idx], tokens, index + 1, root, results);
      }
      return;
    }

    // Quoted key ['key'] or ["key"]
    const keyMatch = inner.match(/^['"](.+)['"]$/);
    if (keyMatch && current && typeof current === 'object' && !Array.isArray(current)) {
      const key = keyMatch[1];
      const next = (current as Record<string, JsonValue>)[key];
      if (next !== undefined) {
        walk(next, tokens, index + 1, root, results);
      }
      return;
    }

    return;
  }
}

function evaluateJsonPath(jsonStr: string, path: string): { results: JsonValue[]; error: string | null } {
  if (!jsonStr.trim()) return { results: [], error: 'Enter JSON data first.' };
  if (!path.trim()) return { results: [], error: 'Enter a JSONPath expression.' };

  let data: JsonValue;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { results: [], error: `Invalid JSON: ${(e as Error).message}` };
  }

  const tokens = parsePath(path);

  // If path doesn't start with $ or .., prepend $
  if (tokens.length === 0 || (tokens[0] !== '$' && tokens[0] !== '..')) {
    tokens.unshift('$');
  }

  const results: JsonValue[] = [];
  try {
    walk(data, tokens, 0, data, results);
    return { results, error: null };
  } catch (e) {
    return { results: [], error: `Evaluation error: ${(e as Error).message}` };
  }
}

function highlightJson(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'token-number';
        if (/^"/.test(match)) {
          cls = match.endsWith(':') ? 'token-key' : 'token-string';
        } else if (/^(true|false)$/.test(match)) {
          cls = 'token-boolean';
        } else if (match === 'null') {
          cls = 'token-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

// ─── Sample Data ───
const SAMPLE_JSON = `{
  "store": {
    "name": "Tech Books",
    "location": "San Francisco",
    "books": [
      {
        "title": "The Pragmatic Programmer",
        "author": "David Thomas",
        "price": 49.99,
        "category": "software",
        "inStock": true,
        "tags": ["coding", "best-practices"]
      },
      {
        "title": "Designing Data-Intensive Applications",
        "author": "Martin Kleppmann",
        "price": 39.99,
        "category": "data",
        "inStock": true,
        "tags": ["databases", "distributed-systems"]
      },
      {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "price": 44.99,
        "category": "software",
        "inStock": false,
        "tags": ["coding", "refactoring"]
      },
      {
        "title": "Site Reliability Engineering",
        "author": "Betsy Beyer",
        "price": 54.99,
        "category": "devops",
        "inStock": true,
        "tags": ["sre", "operations"]
      }
    ],
    "employees": ["Alice", "Bob", "Charlie"]
  }
}`;

const EXAMPLES = [
  { label: 'All book titles', path: '$.store.books[*].title' },
  { label: 'Books under $45', path: '$.store.books[?(@.price < 45)].title' },
  { label: 'All authors (recursive)', path: '$..author' },
  { label: 'First two books', path: '$.store.books[0:2].title' },
  { label: 'Last book', path: '$.store.books[-1].title' },
  { label: 'Everything (wildcard)', path: '$..*' },
  { label: 'In-stock books only', path: '$.store.books[?(@.inStock == true)].title' },
  { label: 'Software category books', path: '$.store.books[?(@.category == "software")].title' },
];

// ─── Component ───
export default function JsonPathEvaluatorPage() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [jsonPath, setJsonPath] = useState('$.store.books[*].title');
  const [compact, setCompact] = useState(false);

  const handleJsonChange = useCallback((val: string) => {
    setJsonInput(val);
  }, []);

  const handlePathChange = useCallback((val: string) => {
    setJsonPath(val);
  }, []);

  const clearAll = useCallback(() => {
    setJsonInput('');
    setJsonPath('');
  }, []);

  const { results, error } = useMemo(
    () => evaluateJsonPath(jsonInput, jsonPath),
    [jsonInput, jsonPath]
  );

  const formattedResults = useMemo(() => {
    if (results.length === 0) return '';
    if (results.length === 1) {
      return JSON.stringify(results[0], null, compact ? 0 : 2);
    }
    if (compact) {
      return JSON.stringify(results);
    }
    return JSON.stringify(results, null, 2);
  }, [results, compact]);

  const copyOutput = useCallback(() => {
    if (!formattedResults) return;
    navigator.clipboard.writeText(formattedResults).then(
      () => toast.success('Results copied!'),
      () => toast.error('Failed to copy')
    );
  }, [formattedResults]);

  const copyInput = useCallback(() => {
    if (!jsonInput) return;
    navigator.clipboard.writeText(jsonInput).then(
      () => toast.success('JSON copied!'),
      () => toast.error('Failed to copy')
    );
  }, [jsonInput]);

  const loadExample = useCallback((path: string) => {
    setJsonInput(SAMPLE_JSON);
    setJsonPath(path);
  }, []);

  const isValidJson = useMemo(() => {
    if (!jsonInput.trim()) return true;
    try {
      JSON.parse(jsonInput);
      return true;
    } catch {
      return false;
    }
  }, [jsonInput]);

  return (
    <ToolLayout
      title="JSON Path Evaluator"
      description="Query and extract data from JSON using JSONPath expressions — like jq for your browser. 100% client-side."
    >
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: JSON Input */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              JSON Input
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={copyInput}
                disabled={!jsonInput}
                className="text-slate-500 hover:text-brand-400 transition-colors disabled:opacity-30"
                title="Copy JSON"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={clearAll}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder="Paste your JSON here..."
            className="input-field w-full min-h-[420px] resize-y font-mono text-xs"
            spellCheck={false}
          />
          {!isValidJson && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              ⚠️ Invalid JSON — check syntax
            </p>
          )}
        </div>

        {/* Right: Results */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Results
            {results.length > 0 && (
              <span className="text-xs text-slate-500 font-normal ml-1">
                ({results.length} match{results.length !== 1 ? 'es' : ''})
              </span>
            )}
          </label>

          {error ? (
            <div className="card border-amber-500/30 bg-amber-500/5 flex-1 min-h-[420px] flex flex-col items-center justify-center text-center p-6">
              <Search className="w-10 h-10 text-amber-400 mb-3 opacity-60" />
              <p className="text-amber-300 font-semibold mb-1">{error}</p>
              <p className="text-slate-500 text-sm">
                Check your JSONPath syntax and that the JSON is valid.
              </p>
            </div>
          ) : results.length === 0 && jsonInput && jsonPath ? (
            <div className="card border-slate-700/50 bg-surface-lighter flex-1 min-h-[420px] flex flex-col items-center justify-center text-center p-6">
              <Search className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-semibold mb-1">No matches found</p>
              <p className="text-slate-500 text-sm">
                The path didn&apos;t match any values. Try adjusting your expression.
              </p>
            </div>
          ) : !jsonInput && !jsonPath ? (
            <div className="card border-slate-700/50 bg-surface-lighter flex-1 min-h-[420px] flex flex-col items-center justify-center text-center p-6">
              <Zap className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-semibold mb-1">Enter JSON and a path</p>
              <p className="text-slate-500 text-sm">
                Use $ for root, .key for properties, [*] for arrays, [?()] for filters.
              </p>
            </div>
          ) : (
            <div className="relative flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompact(false)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      !compact
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Pretty
                  </button>
                  <button
                    onClick={() => setCompact(true)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      compact
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Compact
                  </button>
                </div>
                <button
                  onClick={copyOutput}
                  disabled={!formattedResults}
                  className="btn-secondary flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
              <pre
                className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono overflow-x-auto max-h-[380px] overflow-y-auto"
                dangerouslySetInnerHTML={{
                  __html: highlightJson(formattedResults),
                }}
              />
              {results.length === 1 && typeof results[0] === 'string' && (
                <p className="text-brand-400 text-sm mt-3 font-mono bg-brand-500/5 border border-brand-500/20 rounded-lg p-3">
                  &ldquo;{results[0]}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Path Input & Examples */}
      <div className="mt-6 space-y-4">
        {/* Path Bar */}
        <div className="card">
          <label className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-brand-400" />
            JSONPath Expression
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 font-mono text-sm font-bold select-none">
                $
              </span>
              <input
                type="text"
                value={jsonPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder=".store.books[*].title"
                className="input-field w-full font-mono text-sm pl-8"
                spellCheck={false}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            <strong className="text-slate-400">Tip:</strong> You can type full paths like{' '}
            <code className="bg-brand-500/10 text-brand-400 px-1 rounded text-xs">
              $.store.books[?(@.price &lt; 45)].title
            </code>{' '}
            — the leading $ is optional.
          </p>
        </div>

        {/* Examples */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-fuchsia-400" />
            <h3 className="text-sm font-semibold text-white">Quick Examples</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.path}
                onClick={() => loadExample(ex.path)}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/40 hover:bg-surface-light transition-all text-left group"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0 group-hover:text-brand-400 transition-colors" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-300 font-medium truncate">{ex.label}</p>
                  <code className="text-[10px] text-brand-400 font-mono block truncate">
                    {ex.path}
                  </code>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">JSONPath Quick Reference</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {[
              { syntax: '$.key', desc: 'Access property by name', example: '$.store.name' },
              { syntax: '$.key[*]', desc: 'All items in an array', example: '$.books[*].title' },
              { syntax: '$..key', desc: 'Recursive descent (find all)', example: '$..author' },
              { syntax: '$.key[n]', desc: 'Nth item (0-indexed, -1 = last)', example: '$.books[0]' },
              { syntax: '$.key[s:e]', desc: 'Array slice [start:end]', example: '$.books[0:3]' },
              { syntax: '$..*', desc: 'All values (wildcard recursive)', example: '$..*' },
              { syntax: '[?(@.prop == v)]', desc: 'Filter by equality', example: '[?(@.price == 10)]' },
              { syntax: '[?(@.prop < v)]', desc: 'Filter by comparison', example: '[?(@.price < 50)]' },
              { syntax: "[?(@.prop =~ v)]", desc: 'Filter by regex match', example: "[?(@.title =~ 'Clean')]" },
            ].map((row, i) => (
              <div
                key={i}
                className="bg-surface rounded-lg p-3 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
              >
                <code className="text-xs text-brand-400 font-mono bg-brand-500/10 px-1.5 py-0.5 rounded">
                  {row.syntax}
                </code>
                <p className="text-xs text-slate-400 mt-1.5 mb-1">{row.desc}</p>
                {row.example && (
                  <code className="text-[10px] text-fuchsia-400 font-mono">{row.example}</code>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
