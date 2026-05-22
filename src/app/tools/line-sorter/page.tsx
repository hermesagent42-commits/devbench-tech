'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shuffle,
  ListFilter,
  ClipboardPaste,
  AlignJustify,
  Replace,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type SortMode =
  | 'alphabetical-asc'
  | 'alphabetical-desc'
  | 'numerical-asc'
  | 'numerical-desc'
  | 'random'
  | 'reverse'
  | 'natural-asc'
  | 'natural-desc';

interface SortOption {
  mode: SortMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ── Sort Options ───────────────────────────────────────────────────────────

const SORT_OPTIONS: SortOption[] = [
  {
    mode: 'alphabetical-asc',
    label: 'A → Z',
    icon: <ArrowUp className="w-4 h-4" />,
    description: 'Alphabetical ascending (A to Z)',
  },
  {
    mode: 'alphabetical-desc',
    label: 'Z → A',
    icon: <ArrowDown className="w-4 h-4" />,
    description: 'Alphabetical descending (Z to A)',
  },
  {
    mode: 'numerical-asc',
    label: '0 → 9',
    icon: <ArrowUp className="w-4 h-4" />,
    description: 'Numerical ascending (small to large)',
  },
  {
    mode: 'numerical-desc',
    label: '9 → 0',
    icon: <ArrowDown className="w-4 h-4" />,
    description: 'Numerical descending (large to small)',
  },
  {
    mode: 'natural-asc',
    label: 'Natural ↑',
    icon: <ArrowUp className="w-4 h-4" />,
    description: 'Natural sort ascending (file1, file2, file10)',
  },
  {
    mode: 'natural-desc',
    label: 'Natural ↓',
    icon: <ArrowDown className="w-4 h-4" />,
    description: 'Natural sort descending',
  },
  {
    mode: 'reverse',
    label: 'Reverse',
    icon: <ArrowUpDown className="w-4 h-4" />,
    description: 'Reverse the current line order',
  },
  {
    mode: 'random',
    label: 'Shuffle',
    icon: <Shuffle className="w-4 h-4" />,
    description: 'Randomize the line order (Fisher-Yates)',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const COLLATOR = new Intl.Collator('en', { numeric: false, sensitivity: 'base' });
const COLLATOR_CASE_SENSITIVE = new Intl.Collator('en', { numeric: false, sensitivity: 'variant' });
const NATURAL_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const NATURAL_COLLATOR_CS = new Intl.Collator('en', { numeric: true, sensitivity: 'variant' });

function naturalCompare(a: string, b: string, caseSensitive: boolean): number {
  return (caseSensitive ? NATURAL_COLLATOR_CS : NATURAL_COLLATOR).compare(a, b);
}

function alphaCompare(a: string, b: string, caseSensitive: boolean): number {
  return (caseSensitive ? COLLATOR_CASE_SENSITIVE : COLLATOR).compare(a, b);
}

function numericCompare(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  const aIsNum = !isNaN(na);
  const bIsNum = !isNaN(nb);

  if (aIsNum && bIsNum) return na - nb;
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  // Fall back to alphabetical for non-numbers
  return a.localeCompare(b);
}

function sortLines(
  lines: string[],
  mode: SortMode,
  caseSensitive: boolean,
  numericOnly: boolean,
): string[] {
  const arr = [...lines];

  switch (mode) {
    case 'alphabetical-asc':
      arr.sort((a, b) => alphaCompare(a, b, caseSensitive));
      break;
    case 'alphabetical-desc':
      arr.sort((a, b) => alphaCompare(b, a, caseSensitive));
      break;
    case 'numerical-asc':
      arr.sort((a, b) => {
        if (numericOnly) return numericCompare(a, b);
        // Hybrid: try numeric first, fall back to alpha
        const n = numericCompare(a, b);
        if (n !== 0) return n;
        return alphaCompare(a, b, caseSensitive);
      });
      break;
    case 'numerical-desc':
      arr.sort((a, b) => {
        if (numericOnly) return numericCompare(b, a);
        const n = numericCompare(b, a);
        if (n !== 0) return n;
        return alphaCompare(b, a, caseSensitive);
      });
      break;
    case 'natural-asc':
      arr.sort((a, b) => naturalCompare(a, b, caseSensitive));
      break;
    case 'natural-desc':
      arr.sort((a, b) => naturalCompare(b, a, caseSensitive));
      break;
    case 'reverse':
      arr.reverse();
      break;
    case 'random':
      // Fisher-Yates shuffle
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      break;
  }

  return arr;
}

function deduplicate(lines: string[], caseSensitive: boolean): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = caseSensitive ? line : line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLES: { label: string; text: string }[] = [
  {
    label: 'Fruits (messy)',
    text: `apple
Banana
APPLE
cherry
banana
Date
fig
Cherry
date
elderberry`,
  },
  {
    label: 'Numbers',
    text: `42
7
100
3.14
99
1
256
42
50
8`,
  },
  {
    label: 'Log entries (unsorted)',
    text: `[2024-12-05 14:23:01] ERROR Database connection timeout
[2024-12-01 09:15:42] INFO Server started on port 3000
[2024-12-03 11:30:18] WARN Memory usage above 80%
[2024-12-02 16:45:55] INFO User login: admin
[2024-12-05 14:23:01] ERROR Database connection timeout
[2024-12-04 08:00:00] INFO Scheduled backup completed`,
  },
  {
    label: 'Filenames with versions',
    text: `file2.txt
file10.txt
file1.txt
file20.txt
image-3.png
image-30.png
image-10.png
doc-v1.2.pdf
doc-v1.10.pdf
doc-v1.3.pdf`,
  },
  {
    label: 'Mixed content',
    text: `zebra
123
apple
42
APPLE
banana
9
ZEBRA
cherry
10 items`,
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function LineSorterPage() {
  const [input, setInput] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical-asc');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [skipEmptyLines, setSkipEmptyLines] = useState(true);
  const [dedupe, setDedupe] = useState(false);
  const [numericalOnly, setNumericalOnly] = useState(false);

  // Parse input into lines
  const parsedLines = useMemo(() => {
    let lines = input.split('\n');
    if (trimWhitespace) {
      lines = lines.map((l) => l.trim());
    }
    if (skipEmptyLines) {
      lines = lines.filter((l) => l !== '');
    }
    return lines;
  }, [input, trimWhitespace, skipEmptyLines]);

  // Apply dedup + sort
  const outputLines = useMemo(() => {
    let lines = dedupe ? deduplicate(parsedLines, caseSensitive) : [...parsedLines];
    lines = sortLines(lines, sortMode, caseSensitive, numericalOnly);
    return lines;
  }, [parsedLines, dedupe, sortMode, caseSensitive, numericalOnly]);

  const output = useMemo(() => outputLines.join('\n'), [outputLines]);

  // Stats
  const stats = useMemo(() => {
    const total = input === '' ? 0 : input.split('\n').length;
    const nonEmpty = input === '' ? 0 : input.split('\n').filter((l) => l.trim() !== '').length;
    return {
      totalLines: total,
      nonEmptyLines: nonEmpty,
      outputLines: outputLines.length,
      removedByDedup: dedupe ? parsedLines.length - outputLines.length : 0,
    };
  }, [input, outputLines, parsedLines, dedupe]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
      toast.success('Copied to clipboard');
    } else {
      toast.error('Nothing to copy');
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      toast.success('Pasted from clipboard');
    } catch {
      toast.error('Unable to paste. Try Ctrl+V in the textarea.');
    }
  }, []);

  const handleLoadSample = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleReplaceInput = useCallback(() => {
    if (output !== input) {
      setInput(output);
      toast.success('Replaced input with sorted output');
    }
  }, [output, input]);

  const isNumericalMode = sortMode === 'numerical-asc' || sortMode === 'numerical-desc';

  return (
    <ToolLayout
      title="Line Sorter"
      description="Sort, deduplicate, shuffle, and transform lines of text. Perfect for cleaning up data, organizing lists, sorting log entries, and more — all 100% client-side and private."
    >
      {/* Sort Mode Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-300 mb-3">
          Sort Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setSortMode(opt.mode)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                sortMode === opt.mode
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 shadow-lg shadow-brand-500/10'
                  : 'bg-slate-700/30 border-slate-700/50 text-slate-400 hover:bg-slate-600/30 hover:text-slate-200'
              }`}
              title={opt.description}
            >
              <span className={sortMode === opt.mode ? 'text-brand-400' : 'text-slate-500'}>
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
          />
          Case sensitive
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={trimWhitespace}
            onChange={(e) => setTrimWhitespace(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
          />
          Trim whitespace
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={skipEmptyLines}
            onChange={(e) => setSkipEmptyLines(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
          />
          Skip empty lines
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={dedupe}
            onChange={(e) => setDedupe(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
          />
          Deduplicate
        </label>

        {isNumericalMode && (
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={numericalOnly}
              onChange={(e) => setNumericalOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
            />
            Numbers only
          </label>
        )}
      </div>

      {/* Input / Output Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <AlignJustify className="w-3.5 h-3.5" />
              Input
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePaste}
                className="px-2 py-1 text-xs rounded bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-colors flex items-center gap-1"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-3 h-3" />
                Paste
              </button>
              <button
                onClick={handleClear}
                className="px-2 py-1 text-xs rounded bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-colors flex items-center gap-1"
                title="Clear input"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste or type your lines here...&#10;One line per entry"
            className="w-full h-64 lg:h-80 bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-sm font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-y"
            spellCheck={false}
          />
          <div className="mt-1 text-xs text-slate-500">
            {stats.totalLines > 0 ? `${stats.totalLines} total lines, ${stats.nonEmptyLines} non-empty` : 'No input yet'}
          </div>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5" />
              Output
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReplaceInput}
                disabled={output === input || !output}
                className="px-2 py-1 text-xs rounded bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Replace input with output"
              >
                <Replace className="w-3 h-3" />
                Replace
              </button>
              <button
                onClick={handleCopy}
                disabled={!output}
                className="px-2 py-1 text-xs rounded bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copy output"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            className="w-full h-64 lg:h-80 bg-slate-800/30 border border-brand-500/20 rounded-lg px-4 py-3 text-sm font-mono text-brand-300 placeholder-slate-500 outline-none resize-y"
            spellCheck={false}
          />
          <div className="mt-1 text-xs flex items-center gap-3">
            <span className="text-brand-400">
              {stats.outputLines} lines
            </span>
            {dedupe && stats.removedByDedup > 0 && (
              <span className="text-amber-400">
                {stats.removedByDedup} duplicates removed
              </span>
            )}
            {outputLines.length > 0 && (
              <span className="text-slate-500">
                {output.length.toLocaleString()} chars
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Samples */}
      <div className="mt-8">
        <label className="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
          Quick Samples
        </label>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => handleLoadSample(s.text)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-700/30 border border-slate-700/50 text-slate-400 hover:bg-brand-500/10 hover:border-brand-500/30 hover:text-brand-300 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 rounded-lg bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">💡 Tips</h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• <strong>Natural sort</strong> handles numeric sequences correctly — &ldquo;file10&rdquo; comes after &ldquo;file2&rdquo;, not before.</li>
          <li>• <strong>Deduplicate</strong> removes duplicate lines while preserving the first occurrence.</li>
          <li>• Use <strong>&ldquo;Replace&rdquo;</strong> to chain operations — sort, then reverse, then dedupe.</li>
          <li>• <strong>&ldquo;Numbers only&rdquo;</strong> (in numerical mode) skips the alphabetical fallback for mixed content.</li>
          <li>• All processing is done locally in your browser — your data never leaves your machine.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
