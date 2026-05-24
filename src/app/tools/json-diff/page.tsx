'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  ArrowLeftRight,
  Plus,
  Minus,
  Edit3,
  ChevronDown,
  ChevronRight,
  FileJson,
  AlertTriangle,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type DiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

interface DiffNode {
  path: string;
  kind: DiffKind;
  key: string;
  leftValue: unknown;
  rightValue: unknown;
  children: DiffNode[];
}

interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  total: number;
}

// ── Deep Diff Engine ───────────────────────────────────────────────────────

function deepDiff(
  left: unknown,
  right: unknown,
  basePath = ''
): DiffNode[] {
  const results: DiffNode[] = [];

  // Both primitives or null
  if (
    (typeof left !== 'object' || left === null) &&
    (typeof right !== 'object' || right === null)
  ) {
    if (left !== right) {
      results.push({
        path: basePath || '(root)',
        kind: 'changed',
        key: basePath || '(root)',
        leftValue: left,
        rightValue: right,
        children: [],
      });
    }
    return results;
  }

  // Type mismatch — one is object, other is primitive
  if (
    (typeof left !== 'object' || left === null) !==
    (typeof right !== 'object' || right === null)
  ) {
    results.push({
      path: basePath || '(root)',
      kind: 'changed',
      key: basePath || '(root)',
      leftValue: left,
      rightValue: right,
      children: [],
    });
    return results;
  }

  // Array vs Object mismatch
  if (Array.isArray(left) !== Array.isArray(right)) {
    results.push({
      path: basePath || '(root)',
      kind: 'changed',
      key: basePath || '(root)',
      leftValue: left,
      rightValue: right,
      children: [],
    });
    return results;
  }

  // Both arrays — compare by index
  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = basePath ? `${basePath}[${i}]` : `[${i}]`;
      if (i >= (left as unknown[]).length) {
        results.push({
          path: childPath,
          kind: 'added',
          key: `[${i}]`,
          leftValue: undefined,
          rightValue: (right as unknown[])[i],
          children: [],
        });
      } else if (i >= (right as unknown[]).length) {
        results.push({
          path: childPath,
          kind: 'removed',
          key: `[${i}]`,
          leftValue: (left as unknown[])[i],
          rightValue: undefined,
          children: [],
        });
      } else {
        const children = deepDiff(
          (left as unknown[])[i],
          (right as unknown[])[i],
          childPath
        );
        if (children.length > 0) {
          results.push(...children);
        }
      }
    }
    return results;
  }

  // Both objects — compare keys
  const leftObj = left as Record<string, unknown>;
  const rightObj = right as Record<string, unknown>;
  const allKeys = Array.from(new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]));

  for (const key of allKeys) {
    const childPath = basePath ? `${basePath}.${key}` : key;
    const hasLeft = key in leftObj;
    const hasRight = key in rightObj;

    if (!hasLeft) {
      results.push({
        path: childPath,
        kind: 'added',
        key,
        leftValue: undefined,
        rightValue: rightObj[key],
        children: [],
      });
    } else if (!hasRight) {
      results.push({
        path: childPath,
        kind: 'removed',
        key,
        leftValue: leftObj[key],
        rightValue: undefined,
        children: [],
      });
    } else {
      const children = deepDiff(leftObj[key], rightObj[key], childPath);
      if (children.length === 0) {
        // Totally unchanged — skip reporting (keep results clean)
        continue;
      }
      // Check if the root-level value itself changed (both primitives)
      if (
        typeof leftObj[key] !== 'object' ||
        leftObj[key] === null ||
        typeof rightObj[key] !== 'object' ||
        rightObj[key] === null
      ) {
        results.push({
          path: childPath,
          kind: 'changed',
          key,
          leftValue: leftObj[key],
          rightValue: rightObj[key],
          children: [],
        });
      } else {
        // Complex value with nested diffs
        results.push({
          path: childPath,
          kind: 'changed',
          key,
          leftValue: leftObj[key],
          rightValue: rightObj[key],
          children,
        });
      }
    }
  }

  return results;
}

function buildTree(diffs: DiffNode[]): DiffNode[] {
  // diffs are already flat with paths; group by top-level key
  const groups: Record<string, DiffNode[]> = {};

  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i];
    const topKey = d.path.split('.')[0].split('[')[0];
    if (!groups[topKey]) groups[topKey] = [];
    groups[topKey].push(d);
  }

  // Reconstruct tree
  const result: DiffNode[] = [];
  const keys = Object.keys(groups);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const nodes = groups[key];
    // If it's a single node with no nested path (just key)
    if (nodes.length === 1 && nodes[0].path === key) {
      result.push(nodes[0]);
    } else {
      // Group has multiple nodes — create a parent
      result.push({
        path: key,
        kind: 'changed',
        key,
        leftValue: '(object)',
        rightValue: '(object)',
        children: nodes.map((n) => ({
          ...n,
          // Strip the top-level prefix from children paths
          path: n.path.slice(key.length + 1) || n.path,
        })),
      });
    }
  }

  return result;
}

function summarizeDiff(diffs: DiffNode[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let changed = 0;

  function count(nodes: DiffNode[]) {
    for (const n of nodes) {
      if (n.kind === 'added') added++;
      else if (n.kind === 'removed') removed++;
      else if (n.kind === 'changed') changed++;
      if (n.children.length > 0) count(n.children);
    }
  }

  count(diffs);

  return { added, removed, changed, total: added + removed + changed };
}

function valueToDisplay(val: unknown): string {
  if (val === undefined) return '—';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'object') return JSON.stringify(val, null, 1);
  return String(val);
}

// ── Samples ────────────────────────────────────────────────────────────────

const LEFT_SAMPLE = `{
  "name": "API v2",
  "version": "1.0.0",
  "debug": true,
  "database": {
    "host": "localhost",
    "port": 5432,
    "ssl": false
  },
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "editor" }
  ],
  "rateLimit": 100,
  "features": {
    "darkMode": true,
    "notifications": true
  }
}`;

const RIGHT_SAMPLE = `{
  "name": "API v2",
  "version": "2.0.0",
  "debug": false,
  "database": {
    "host": "db.example.com",
    "port": 5432,
    "ssl": true,
    "poolSize": 20
  },
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "viewer" },
    { "id": 3, "name": "Charlie", "role": "editor" }
  ],
  "rateLimit": 200,
  "features": {
    "darkMode": true,
    "notifications": false,
    "billing": true
  }
}`;

// ── Diff Node Viewer (recursive) ───────────────────────────────────────────

function DiffTree({ nodes, depth = 0 }: { nodes: DiffNode[]; depth?: number }) {
  const grouped = nodes.filter((n) => n.children.length > 0 && n.kind !== 'removed' && n.kind !== 'added');
  const leaves = nodes.filter((n) => n.children.length === 0 || n.kind === 'removed' || n.kind === 'added');
  const sorted = [...leaves, ...grouped];

  return (
    <div className="space-y-0.5">
      {sorted.map((node, i) => (
        <DiffNodeView key={`${node.path}-${i}`} node={node} depth={depth} />
      ))}
    </div>
  );
}

function DiffNodeView({ node, depth }: { node: DiffNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  const kindClasses: Record<DiffKind, string> = {
    added: 'border-l-green-500/50 bg-green-500/5',
    removed: 'border-l-red-500/50 bg-red-500/5',
    changed: 'border-l-yellow-500/50 bg-yellow-500/5',
    unchanged: 'border-l-slate-600',
  };

  const kindIcons: Record<DiffKind, typeof Plus> = {
    added: Plus,
    removed: Minus,
    changed: Edit3,
    unchanged: Edit3,
  };

  const kindTextColors: Record<DiffKind, string> = {
    added: 'text-green-400',
    removed: 'text-red-400',
    changed: 'text-yellow-400',
    unchanged: 'text-slate-400',
  };

  const KindIcon = kindIcons[node.kind];

  return (
    <div>
      <div
        className={`flex items-start gap-2 py-1.5 px-3 rounded border-l-2 ${kindClasses[node.kind]} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <KindIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${kindTextColors[node.kind]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-white">
              {node.key}
            </span>
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${kindTextColors[node.kind]}`}>
              {node.kind}
            </span>
            {hasChildren && (
              <span className="text-[10px] text-slate-500">
                {node.children.length} change{node.children.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Show values for leaf nodes */}
          {!hasChildren && node.kind !== 'unchanged' && (
            <div className="mt-1 space-y-0.5">
              {node.kind === 'changed' && (
                <>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-red-400/60 font-mono shrink-0 w-6">−</span>
                    <span className="font-mono text-red-300/80 break-all">
                      {valueToDisplay(node.leftValue)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-green-400/60 font-mono shrink-0 w-6">+</span>
                    <span className="font-mono text-green-300/80 break-all">
                      {valueToDisplay(node.rightValue)}
                    </span>
                  </div>
                </>
              )}
              {node.kind === 'removed' && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-red-400/60 font-mono shrink-0 w-6">−</span>
                  <span className="font-mono text-red-300/80 break-all">
                    {valueToDisplay(node.leftValue)}
                  </span>
                </div>
              )}
              {node.kind === 'added' && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-green-400/60 font-mono shrink-0 w-6">+</span>
                  <span className="font-mono text-green-300/80 break-all">
                    {valueToDisplay(node.rightValue)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <DiffTree nodes={node.children} depth={depth + 1} />
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function JsonDiffPage() {
  const [leftInput, setLeftInput] = useState(LEFT_SAMPLE);
  const [rightInput, setRightInput] = useState(RIGHT_SAMPLE);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Parse and diff
  const result = useMemo(() => {
    const trimmedLeft = leftInput.trim();
    const trimmedRight = rightInput.trim();

    if (!trimmedLeft && !trimmedRight) {
      return {
        diffs: [] as DiffNode[],
        summary: { added: 0, removed: 0, changed: 0, total: 0 } as DiffSummary,
        errors: [] as string[],
        identical: false,
      };
    }

    const errors: string[] = [];

    let leftParsed: unknown;
    let rightParsed: unknown;

    try {
      leftParsed = JSON.parse(trimmedLeft || 'null');
    } catch (e) {
      errors.push(`Left JSON: ${e instanceof SyntaxError ? e.message : 'Parse error'}`);
    }

    try {
      rightParsed = JSON.parse(trimmedRight || 'null');
    } catch (e) {
      errors.push(`Right JSON: ${e instanceof SyntaxError ? e.message : 'Parse error'}`);
    }

    if (errors.length > 0 || leftParsed === undefined || rightParsed === undefined) {
      return {
        diffs: [] as DiffNode[],
        summary: { added: 0, removed: 0, changed: 0, total: 0 },
        errors,
        identical: false,
      };
    }

    const flatDiffs = deepDiff(leftParsed, rightParsed);
    const tree = buildTree(flatDiffs);
    const summary = summarizeDiff(tree);
    const identical = summary.total === 0;

    return { diffs: tree, summary, errors, identical };
  }, [leftInput, rightInput]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    const report = result.diffs
      .map((d) => {
        const prefix = d.kind === 'added' ? '+' : d.kind === 'removed' ? '−' : '~';
        return `${prefix} ${d.path}: ${valueToDisplay(d.kind === 'removed' ? d.leftValue : d.rightValue)}`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(report || 'No differences found.');
      setCopied(true);
      toast.success('Copied diff report!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [result.diffs]);

  const swapSides = useCallback(() => {
    setLeftInput(rightInput);
    setRightInput(leftInput);
  }, [leftInput, rightInput]);

  const loadSamples = useCallback(() => {
    setLeftInput(LEFT_SAMPLE);
    setRightInput(RIGHT_SAMPLE);
  }, []);

  const clearAll = useCallback(() => {
    setLeftInput('');
    setRightInput('');
  }, []);

  const hasContent = leftInput.trim() || rightInput.trim();
  const hasErrors = result.errors.length > 0;

  return (
    <ToolLayout
      title="JSON Diff Checker"
      description="Compare two JSON documents structurally — see added, removed, and changed keys at any nesting level. Color-coded tree view with expand/collapse. 100% client-side."
    >
      {/* Controls */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={swapSides}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface border border-slate-700/50 transition-colors"
            title="Swap sides"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap
          </button>
          <button
            onClick={loadSamples}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-brand-400 hover:bg-surface border border-slate-700/50 transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Sample
          </button>
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface border border-slate-700/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            Left: {leftInput.length.toLocaleString()} chars
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-500 font-mono">
            Right: {rightInput.length.toLocaleString()} chars
          </span>
        </div>
      </div>

      {/* Input Panels */}
      <div className={`grid gap-6 mb-6 ${fullscreen ? 'hidden' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Left */}
        <div className="card">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Original (Left)
          </h3>
          <textarea
            value={leftInput}
            onChange={(e) => setLeftInput(e.target.value)}
            className="w-full h-72 bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 placeholder-slate-600"
            placeholder="Paste original JSON..."
            spellCheck={false}
          />
        </div>

        {/* Right */}
        <div className="card">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Modified (Right)
          </h3>
          <textarea
            value={rightInput}
            onChange={(e) => setRightInput(e.target.value)}
            className="w-full h-72 bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 placeholder-slate-600"
            placeholder="Paste modified JSON..."
            spellCheck={false}
          />
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-brand-400" />
            Diff Results
          </h3>
          <div className="flex items-center gap-2">
            {hasContent && !hasErrors && (
              <div className="flex items-center gap-3 mr-2">
                {result.summary.added > 0 && (
                  <span className="text-xs text-green-400 font-mono flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    {result.summary.added} added
                  </span>
                )}
                {result.summary.removed > 0 && (
                  <span className="text-xs text-red-400 font-mono flex items-center gap-1">
                    <Minus className="w-3 h-3" />
                    {result.summary.removed} removed
                  </span>
                )}
                {result.summary.changed > 0 && (
                  <span className="text-xs text-yellow-400 font-mono flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    {result.summary.changed} changed
                  </span>
                )}
                {result.summary.total > 0 && (
                  <span className="text-xs text-slate-400 font-mono ml-1">
                    ({result.summary.total} total)
                  </span>
                )}
              </div>
            )}
            {result.diffs.length > 0 && (
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-surface border border-transparent'
                }`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Report'}
              </button>
            )}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-surface border border-transparent transition-colors"
            >
              {fullscreen ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Error states */}
        {hasErrors && (
          <div className="space-y-2 mb-4">
            {result.errors.map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasContent && (
          <div className="py-16 text-center">
            <ArrowLeftRight className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Paste JSON in both panels to see the structural diff
            </p>
          </div>
        )}

        {/* Identical */}
        {hasContent && !hasErrors && result.identical && (
          <div className="py-12 text-center">
            <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-green-400 text-sm font-medium">Both documents are identical</p>
            <p className="text-slate-500 text-xs mt-1">No structural differences found</p>
          </div>
        )}

        {/* Diff tree */}
        {hasContent && !hasErrors && result.diffs.length > 0 && (
          <div className="bg-surface border border-slate-700/50 rounded-lg p-4 max-h-[600px] overflow-auto">
            <DiffTree nodes={result.diffs} />
          </div>
        )}
      </div>

      {/* Usage tips */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-blue-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Structural Comparison</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Compares JSON structures deeply — not line-by-line text. Identical documents
            report zero differences regardless of whitespace or key ordering.
          </p>
        </div>
        <div className="card border-l-4 border-l-green-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Nested Objects &amp; Arrays</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Handles nested objects, arrays of objects, and mixed types. Array elements
            are compared by index. Deeply nested changes are expandable.
          </p>
        </div>
        <div className="card border-l-4 border-l-yellow-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Compare Anything</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Perfect for comparing API responses, config files, feature flags,
            database schemas, or any structured JSON data. Copy the diff report
            as a text summary.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
