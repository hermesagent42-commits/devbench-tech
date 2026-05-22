'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, ArrowLeftRight, RefreshCw, GripVertical, Columns, AlignJustify, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  lineNumberLeft: number | null;
  lineNumberRight: number | null;
  content: string;
}

type ViewMode = 'side-by-side' | 'unified';

// ── Myers Diff Algorithm ───────────────────────────────────────────────────

interface DiffOp {
  type: 'ins' | 'del' | 'eq';
  line: string;
}

function myersDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;

  // v[k] stores the furthest x we can reach for diagonal k
  const v: number[] = new Array(2 * max + 1).fill(0);
  // Store the trace for backtracking
  const trace: number[][] = [];

  // Find the shortest edit script
  let d: number;
  for (d = 0; d <= max; d++) {
    const snapshot = v.slice();
    trace.push(snapshot);

    for (let k = -d; k <= d; k += 2) {
      // Determine whether to go down (insert) or right (delete)
      let x: number;
      if (k === -d || (k !== d && v[max + k - 1] < v[max + k + 1])) {
        x = v[max + k + 1]; // go down (from k+1)
      } else {
        x = v[max + k - 1] + 1; // go right (from k-1)
      }

      let y = x - k;

      // Follow diagonal (match)
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }

      v[max + k] = x;

      if (x >= n && y >= m) {
        // Found the solution, backtrack now
        return backtrack(trace, a, b, d, max);
      }
    }
  }

  // Fallback
  return [];
}

function backtrack(trace: number[][], a: string[], b: string[], d: number, max: number): DiffOp[] {
  const ops: DiffOp[] = [];
  let x = a.length;
  let y = b.length;

  for (let i = d; i >= 0; i--) {
    const v = trace[i];
    const k = x - y;

    // Determine which v index we used
    let prevK: number;
    if (k === -i || (k !== i && v[max + k - 1] < v[max + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[max + prevK];
    const prevY = prevX - prevK;

    // Follow diagonal matches backwards
    while (x > prevX && y > prevY) {
      x--;
      y--;
      ops.unshift({ type: 'eq', line: a[x] });
    }

    if (i > 0) {
      if (x === prevX) {
        // Insert
        y--;
        ops.unshift({ type: 'ins', line: b[y] });
      } else {
        // Delete
        x--;
        ops.unshift({ type: 'del', line: a[x] });
      }
    }
  }

  return ops;
}

function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const ops = myersDiff(leftLines, rightLines);

  let leftNum = 1;
  let rightNum = 1;
  const result: DiffLine[] = [];

  for (const op of ops) {
    switch (op.type) {
      case 'eq':
        result.push({
          type: 'unchanged',
          lineNumberLeft: leftNum++,
          lineNumberRight: rightNum++,
          content: op.line,
        });
        break;
      case 'del':
        result.push({
          type: 'removed',
          lineNumberLeft: leftNum++,
          lineNumberRight: null,
          content: op.line,
        });
        break;
      case 'ins':
        result.push({
          type: 'added',
          lineNumberLeft: null,
          lineNumberRight: rightNum++,
          content: op.line,
        });
        break;
    }
  }

  return result;
}

// ── Sample data ────────────────────────────────────────────────────────────

const SAMPLE_OLD = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

const users = ["Alice", "Bob", "Charlie"];
const activeUsers = [];

for (let i = 0; i < users.length; i++) {
  if (users[i] !== "Bob") {
    activeUsers.push(users[i]);
  }
}

console.log(activeUsers);`;

const SAMPLE_NEW = `function greet(name: string): boolean {
  console.log(\`Hello, \${name}!\`);
  return true;
}

const users = ["Alice", "Bob", "Charlie", "Diana"];
const activeUsers: string[] = [];

for (const user of users) {
  if (user !== "Bob") {
    activeUsers.push(user);
  }
}

console.log(\`Active users: \${activeUsers.length}\`);
console.log(activeUsers);`;

// ── Inline diff for character-level highlighting ───────────────────────────

interface CharDiff {
  char: string;
  type: 'same' | 'added' | 'removed';
}

function computeCharDiff(oldStr: string, newStr: string): CharDiff[] {
  const result: CharDiff[] = [];
  let i = 0, j = 0;

  while (i < oldStr.length && j < newStr.length) {
    if (oldStr[i] === newStr[j]) {
      result.push({ char: newStr[j], type: 'same' });
      i++;
      j++;
    } else {
      // Find where they re-align
      let found = false;
      for (let lookAhead = 1; lookAhead < 10 && i + lookAhead < oldStr.length; lookAhead++) {
        if (oldStr[i + lookAhead] === newStr[j]) {
          for (let k = 0; k < lookAhead; k++) {
            result.push({ char: oldStr[i + k], type: 'removed' });
          }
          i += lookAhead;
          found = true;
          break;
        }
      }
      if (!found) {
        for (let lookAhead = 1; lookAhead < 10 && j + lookAhead < newStr.length; lookAhead++) {
          if (newStr[j + lookAhead] === oldStr[i]) {
            for (let k = 0; k < lookAhead; k++) {
              result.push({ char: newStr[j + k], type: 'added' });
            }
            j += lookAhead;
            found = true;
            break;
          }
        }
      }
      if (!found) {
        result.push({ char: oldStr[i], type: 'removed' });
        result.push({ char: newStr[j], type: 'added' });
        i++;
        j++;
      }
    }
  }

  while (i < oldStr.length) {
    result.push({ char: oldStr[i], type: 'removed' });
    i++;
  }
  while (j < newStr.length) {
    result.push({ char: newStr[j], type: 'added' });
    j++;
  }

  return result;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DiffCheckerPage() {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [syncScroll, setSyncScroll] = useState(true);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const unifiedScrollRef = useRef<HTMLDivElement>(null);

  // Process text for comparison
  const processText = useCallback((text: string) => {
    if (ignoreWhitespace) {
      return text.split('\n').map(line => line.trimEnd()).join('\n');
    }
    return text;
  }, [ignoreWhitespace]);

  // Compute diff
  const diffLines = useMemo(() => {
    const left = processText(leftText);
    const right = processText(rightText);
    if (!left && !right) return [];
    return computeDiff(left, right);
  }, [leftText, rightText, processText]);

  // Stats
  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length;
    return { added, removed, unchanged, total: diffLines.length };
  }, [diffLines]);

  // Sync scroll
  const handleLeftScroll = useCallback(() => {
    if (!syncScroll || !rightScrollRef.current || !leftScrollRef.current) return;
    rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
  }, [syncScroll]);

  const handleRightScroll = useCallback(() => {
    if (!syncScroll || !leftScrollRef.current || !rightScrollRef.current) return;
    leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
  }, [syncScroll]);

  // Load sample
  const loadSample = useCallback(() => {
    setLeftText(SAMPLE_OLD);
    setRightText(SAMPLE_NEW);
  }, []);

  // Clear
  const clearAll = useCallback(() => {
    setLeftText('');
    setRightText('');
  }, []);

  // Swap
  const swapTexts = useCallback(() => {
    setLeftText(rightText);
    setRightText(leftText);
  }, [leftText, rightText]);

  // Copy unified diff
  const copyUnified = useCallback(async () => {
    const lines: string[] = [];
    for (const dl of diffLines) {
      switch (dl.type) {
        case 'unchanged': lines.push(`  ${dl.content}`); break;
        case 'added': lines.push(`+ ${dl.content}`); break;
        case 'removed': lines.push(`- ${dl.content}`); break;
      }
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField('unified');
      toast.success('Diff copied!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [diffLines]);

  // Download diff
  const downloadDiff = useCallback(() => {
    const lines: string[] = ['--- Original', '+++ Modified'];
    let leftLineNum = 1;
    let rightLineNum = 1;
    for (const dl of diffLines) {
      switch (dl.type) {
        case 'unchanged':
          lines.push(`  ${dl.content}`);
          leftLineNum++; rightLineNum++;
          break;
        case 'added':
          lines.push(`+ ${dl.content}`);
          rightLineNum++;
          break;
        case 'removed':
          lines.push(`- ${dl.content}`);
          leftLineNum++;
          break;
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.patch';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Diff downloaded!');
  }, [diffLines]);

  // Compute char-level diffs for changed lines (used in unified view for inline diffs)
  const enrichedDiff = useMemo(() => {
    // For side-by-side: pair adjacent removed/added lines for inline diff
    const enriched: (DiffLine & { charDiffs?: CharDiff[], pairedContent?: string })[] = [];
    let i = 0;

    while (i < diffLines.length) {
      const current = diffLines[i];
      // Look for removed followed by added (potential change)
      if (current.type === 'removed' && i + 1 < diffLines.length && diffLines[i + 1].type === 'added') {
        const next = diffLines[i + 1];
        const charDiff = computeCharDiff(current.content, next.content);
        enriched.push({ ...current, charDiffs: charDiff, pairedContent: next.content });
        enriched.push({ ...next, charDiffs: charDiff, pairedContent: current.content });
        i += 2;
      } else {
        enriched.push({ ...current });
        i++;
      }
    }

    return enriched;
  }, [diffLines]);

  const hasContent = leftText.trim() || rightText.trim();

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderCharDiffs = (charDiffs: CharDiff[], side: 'left' | 'right') => {
    return charDiffs.map((cd, idx) => {
      if (cd.type === 'same') {
        return <span key={idx}>{cd.char}</span>;
      }
      const isVisible = (side === 'left' && cd.type === 'removed') || (side === 'right' && cd.type === 'added');
      if (isVisible) {
        return (
          <span
            key={idx}
            className={cd.type === 'added' ? 'diff-added-inline' : 'diff-removed-inline'}
          >
            {cd.char}
          </span>
        );
      }
      return null;
    });
  };

  const lineStyle = 'font-mono text-[13px] leading-6 whitespace-pre';

  return (
    <ToolLayout
      title="Diff Checker"
      description="Compare two text blocks side-by-side with line-level diffing. Paste code, configs, or any text to see differences instantly."
    >
      <style jsx>{`
        .diff-added-inline {
          background: rgba(52, 211, 153, 0.35);
          border-radius: 2px;
          color: #bbf7d0;
        }
        .diff-removed-inline {
          background: rgba(248, 113, 113, 0.35);
          border-radius: 2px;
          color: #fecaca;
        }
        .diff-line-added {
          background: rgba(52, 211, 153, 0.12);
        }
        .diff-line-removed {
          background: rgba(248, 113, 113, 0.12);
        }
        .diff-line-added:hover, .diff-line-removed:hover, .diff-line-unchanged:hover {
          filter: brightness(1.1);
        }
      `}</style>

      {/* Input Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Left input */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Original</label>
            <span className="text-xs text-slate-500">{leftText.split('\n').length} lines</span>
          </div>
          <textarea
            value={leftText}
            onChange={(e) => setLeftText(e.target.value)}
            placeholder="Paste original text here..."
            className="w-full h-48 bg-surface border border-slate-700/50 rounded-lg p-3 font-mono text-[13px] leading-relaxed text-slate-200 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 resize-vertical placeholder:text-slate-600"
            spellCheck={false}
          />
        </div>

        {/* Right input */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modified</label>
            <span className="text-xs text-slate-500">{rightText.split('\n').length} lines</span>
          </div>
          <textarea
            value={rightText}
            onChange={(e) => setRightText(e.target.value)}
            placeholder="Paste modified text here..."
            className="w-full h-48 bg-surface border border-slate-700/50 rounded-lg p-3 font-mono text-[13px] leading-relaxed text-slate-200 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 resize-vertical placeholder:text-slate-600"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* View mode toggle */}
        <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors border-r border-slate-700/50 ${
              viewMode === 'side-by-side' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Side by side
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
              viewMode === 'unified' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
            Unified
          </button>
        </div>

        <div className="w-px h-6 bg-slate-700/50 mx-1" />

        <button
          onClick={loadSample}
          className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-lighter rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sample
        </button>

        <button
          onClick={swapTexts}
          disabled={!hasContent}
          className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-lighter rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Swap
        </button>

        <button
          onClick={clearAll}
          disabled={!hasContent}
          className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-lighter rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear
        </button>

        <label className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={syncScroll}
            onChange={(e) => setSyncScroll(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-600 bg-surface text-brand-500 focus:ring-brand-500/30"
          />
          Sync scroll
        </label>

        <label className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ignoreWhitespace}
            onChange={(e) => setIgnoreWhitespace(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-600 bg-surface text-brand-500 focus:ring-brand-500/30"
          />
          Ignore trailing whitespace
        </label>

        <div className="flex-1" />

        {/* Stats */}
        {hasContent && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="text-green-400">+{stats.added}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="text-red-400">-{stats.removed}</span>
            </span>
            <span className="text-slate-500">~{stats.unchanged}</span>
          </div>
        )}

        {hasContent && (
          <>
            <button
              onClick={copyUnified}
              className="px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600"
            >
              {copiedField === 'unified' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copy diff
            </button>
            <button
              onClick={downloadDiff}
              className="px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </>
        )}
      </div>

      {/* Diff output */}
      {!hasContent && (
        <div className="card flex flex-col items-center justify-center py-20 text-slate-500">
          <ArrowLeftRight className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">Paste or type text in both panels to see the diff</p>
          <button
            onClick={loadSample}
            className="mt-3 px-4 py-2 text-xs font-medium text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
          >
            Load sample diff
          </button>
        </div>
      )}

      {hasContent && diffLines.length > 0 && viewMode === 'side-by-side' && (
        <div className="card overflow-hidden !p-0">
          {/* Headers */}
          <div className="grid grid-cols-2 border-b border-slate-700/50 bg-surface-lighter">
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 border-r border-slate-700/50">Original</div>
            <div className="px-4 py-2 text-xs font-semibold text-slate-400">Modified</div>
          </div>
          {/* Content */}
          <div className="grid grid-cols-2">
            {/* Left side */}
            <div
              ref={leftScrollRef}
              onScroll={handleLeftScroll}
              className="max-h-[500px] overflow-auto border-r border-slate-700/50"
            >
              {enrichedDiff.map((line, idx) => (
                <div
                  key={`l-${idx}`}
                  className={`flex ${lineStyle} ${
                    line.type === 'removed' ? 'diff-line-removed' :
                    line.type === 'added' ? 'invisible h-0 overflow-hidden' : ''
                  }`}
                >
                  <span className="w-12 shrink-0 text-right pr-3 text-slate-600 select-none text-[11px] leading-6">
                    {line.lineNumberLeft ?? ''}
                  </span>
                  <span className={`flex-1 pr-3 ${line.type === 'removed' ? 'text-red-200' : 'text-slate-300'}`}>
                    {line.charDiffs && line.type === 'removed'
                      ? renderCharDiffs(line.charDiffs, 'left')
                      : line.content || '\u00A0'}
                  </span>
                </div>
              ))}
            </div>
            {/* Right side */}
            <div
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              className="max-h-[500px] overflow-auto"
            >
              {enrichedDiff.map((line, idx) => (
                <div
                  key={`r-${idx}`}
                  className={`flex ${lineStyle} ${
                    line.type === 'added' ? 'diff-line-added' :
                    line.type === 'removed' ? 'invisible h-0 overflow-hidden' : ''
                  }`}
                >
                  <span className="w-12 shrink-0 text-right pr-3 text-slate-600 select-none text-[11px] leading-6">
                    {line.lineNumberRight ?? ''}
                  </span>
                  <span className={`flex-1 pr-3 ${line.type === 'added' ? 'text-green-200' : 'text-slate-300'}`}>
                    {line.charDiffs && line.type === 'added'
                      ? renderCharDiffs(line.charDiffs, 'right')
                      : line.content || '\u00A0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasContent && diffLines.length > 0 && viewMode === 'unified' && (
        <div className="card overflow-hidden !p-0" ref={unifiedScrollRef}>
          <div className="max-h-[500px] overflow-auto">
            {enrichedDiff.map((line, idx) => (
              <div
                key={`u-${idx}`}
                className={`flex ${lineStyle} ${
                  line.type === 'added' ? 'diff-line-added' :
                  line.type === 'removed' ? 'diff-line-removed' : ''
                }`}
              >
                <span className="w-12 shrink-0 text-right pr-3 text-slate-600 select-none text-[11px] leading-6">
                  {line.lineNumberLeft ?? line.lineNumberRight ?? ''}
                </span>
                <span className="w-12 shrink-0 text-right pr-3 text-slate-600 select-none text-[11px] leading-6">
                  {line.type === 'unchanged'
                    ? line.lineNumberRight
                    : line.type === 'added'
                    ? line.lineNumberRight
                    : ''}
                </span>
                <span className="w-6 shrink-0 text-center select-none text-[11px] leading-6 font-bold">
                  {line.type === 'added' ? (
                    <span className="text-green-400">+</span>
                  ) : line.type === 'removed' ? (
                    <span className="text-red-400">-</span>
                  ) : (
                    <span className="text-slate-600"> </span>
                  )}
                </span>
                <span className={`flex-1 pr-3 ${
                  line.type === 'added' ? 'text-green-200' :
                  line.type === 'removed' ? 'text-red-200' :
                  'text-slate-300'
                }`}>
                  {line.charDiffs && line.type === 'added'
                    ? renderCharDiffs(line.charDiffs, 'right')
                    : line.charDiffs && line.type === 'removed'
                    ? renderCharDiffs(line.charDiffs, 'left')
                    : line.content || '\u00A0'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasContent && diffLines.length === 0 && leftText === rightText && (
        <div className="card flex flex-col items-center justify-center py-16 text-slate-500">
          <Check className="w-10 h-10 mb-3 text-green-500/60" />
          <p className="text-sm">Texts are identical — no differences found.</p>
        </div>
      )}
    </ToolLayout>
  );
}
