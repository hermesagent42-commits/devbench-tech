'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Hash,
  Copy,
  Eye,
  EyeOff,
  Grid3X3,
  Plus,
  Minus,
  RefreshCw,
  Check,
  List,
  LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ───────── Types ───────── */

type SelectorType =
  | 'nth-child'
  | 'nth-last-child'
  | 'nth-of-type'
  | 'nth-last-of-type';

interface Preset {
  label: string;
  formula: string;
  description: string;
  selectorType: SelectorType;
}

/* ───────── Presets ───────── */

const PRESETS: Preset[] = [
  {
    label: 'Odd items',
    formula: 'odd',
    description: '1st, 3rd, 5th, 7th…',
    selectorType: 'nth-child',
  },
  {
    label: 'Even items',
    formula: 'even',
    description: '2nd, 4th, 6th, 8th…',
    selectorType: 'nth-child',
  },
  {
    label: 'First 5',
    formula: '-n+5',
    description: 'Items 1 through 5',
    selectorType: 'nth-child',
  },
  {
    label: 'Every 3rd',
    formula: '3n',
    description: '3rd, 6th, 9th, 12th…',
    selectorType: 'nth-child',
  },
  {
    label: 'Every 3rd starting at 2',
    formula: '3n+2',
    description: '2nd, 5th, 8th, 11th…',
    selectorType: 'nth-child',
  },
  {
    label: 'Last 3 (nth-last)',
    formula: '-n+3',
    description: 'Last 3 items',
    selectorType: 'nth-last-child',
  },
  {
    label: 'Skip first 2',
    formula: 'n+3',
    description: '3rd, 4th, 5th, 6th…',
    selectorType: 'nth-child',
  },
  {
    label: 'Every 4 starting at 1',
    formula: '4n+1',
    description: '1st, 5th, 9th, 13th…',
    selectorType: 'nth-child',
  },
];

/* ───────── Parsing ───────── */

function parseFormula(f: string): { a: number; b: number; valid: boolean } {
  if (f === 'odd') return { a: 2, b: 1, valid: true };
  if (f === 'even') return { a: 2, b: 0, valid: true };

  const trimmed = f.replace(/\s/g, '');
  const match = trimmed.match(/^(-?\d*)n([+-]\d+)?$/);
  if (!match) return { a: 0, b: 0, valid: false };

  let a: number;
  if (match[1] === '-') a = -1;
  else if (match[1] === '') a = 1;
  else a = parseInt(match[1], 10);

  const b = match[2] ? parseInt(match[2], 10) : 0;
  return { a, b, valid: true };
}

function evaluateNth(a: number, b: number, targetIndex: number): boolean {
  // For positive a: n = (targetIndex - b) / a must be non-negative integer
  if (a > 0) {
    const remainder = targetIndex - b;
    if (remainder < 0) return false;
    return remainder % a === 0;
  }
  // For negative a: evaluate until result <= 0
  for (let n = 0; n <= targetIndex + 10; n++) {
    const val = a * n + b;
    if (val <= 0) break;
    if (val === targetIndex) return true;
  }
  return false;
}

function matchesSelector(
  index: number,
  total: number,
  formula: string,
  selectorType: SelectorType,
): boolean {
  if (formula === '') return false;

  const parsed = parseFormula(formula);
  if (!parsed.valid) return false;

  const effectiveIndex =
    selectorType === 'nth-last-child' || selectorType === 'nth-last-of-type'
      ? total - index + 1
      : index;

  return evaluateNth(parsed.a, parsed.b, effectiveIndex);
}

function buildSelectorText(
  formula: string,
  selectorType: SelectorType,
  tag: string,
): string {
  const typeSuffix =
    selectorType === 'nth-of-type' || selectorType === 'nth-last-of-type'
      ? '-of-type'
      : '';

  const base =
    selectorType === 'nth-last-child' || selectorType === 'nth-last-of-type'
      ? 'nth-last-child'
      : 'nth-child';

  const display =
    formula === 'first-child'
      ? ':first-child'
      : formula === 'last-child'
        ? ':last-child'
        : `:${base}${typeSuffix}(${formula})`;

  return `${tag}${display}`;
}

/* ───────── Main Component ───────── */

export default function NthChildCalculatorPage() {
  const [count, setCount] = useState(12);
  const [formula, setFormula] = useState('2n+1');
  const [selectorType, setSelectorType] = useState<SelectorType>('nth-child');
  const [tag, setTag] = useState('li');
  const [showGrid, setShowGrid] = useState(true);
  const [copied, setCopied] = useState(false);

  const selectorText = useMemo(() => {
    return buildSelectorText(formula, selectorType, tag);
  }, [formula, selectorType, tag]);

  const matches = useMemo(() => {
    const results: boolean[] = [];
    for (let i = 1; i <= count; i++) {
      results.push(matchesSelector(i, count, formula, selectorType));
    }
    return results;
  }, [count, formula, selectorType]);

  const matchCount = matches.filter(Boolean).length;

  const applyPreset = useCallback((preset: Preset) => {
    setFormula(preset.formula);
    setSelectorType(preset.selectorType);
  }, []);

  const copySelector = useCallback(() => {
    navigator.clipboard.writeText(selectorText).then(
      () => {
        setCopied(true);
        toast.success('Selector copied!');
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error('Failed to copy'),
    );
  }, [selectorText]);

  const parsed = useMemo(() => parseFormula(formula), [formula]);

  /* ─── Colors for each item position ─── */
  const itemColors = [
    '#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6',
    '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#14b8a6',
    '#e11d48', '#0ea5e9', '#84cc16', '#a855f7', '#6b7280',
    '#d946ef', '#10b981', '#f43f5e', '#78716c', '#0284c7',
    '#65a30d', '#c026d3', '#0891b2', '#b45309', '#4f46e5',
    '#db2777', '#9333ea', '#059669', '#ea580c', '#2563eb',
  ];

  return (
    <ToolLayout
      title="CSS :nth-child() Calculator"
      description="Visually test and build :nth-child() selectors. See exactly which items match — no guessing."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Selector Type */}
          <div className="card space-y-3">
            <label className="text-white font-semibold text-sm block">
              Selector Type
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface-lighter">
              {(['nth-child', 'nth-last-child', 'nth-of-type', 'nth-last-of-type'] as SelectorType[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setSelectorType(t)}
                    className={`px-2.5 py-2 rounded-md text-xs font-medium transition-all text-left ${
                      selectorType === t
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    :{t}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Formula Input */}
          <div className="card space-y-3">
            <label className="text-white font-semibold text-sm block">
              Formula
            </label>
            <div className="relative">
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="input-field w-full font-mono text-lg py-2.5"
                placeholder="e.g. 2n+1, odd, -n+3"
                spellCheck={false}
              />
              {parsed.valid && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 font-mono bg-surface-lighter px-2 py-0.5 rounded">
                  a={parsed.a}, b={parsed.b}
                </span>
              )}
            </div>
            {!parsed.valid && formula !== '' && formula !== 'odd' && formula !== 'even' && (
              <p className="text-xs text-yellow-400">
                Format: an+b (e.g. 2n+1), odd, or even
              </p>
            )}

            {/* Tag input */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Element tag
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value || 'div')}
                className="input-field w-full font-mono text-sm py-2"
                placeholder="li"
              />
            </div>

            {/* Item Count */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Item count</label>
                <span className="text-xs text-slate-500">{count} items</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="btn-secondary p-1.5 rounded-md"
                  aria-label="Decrease count"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <button
                  onClick={() => setCount(Math.min(24, count + 1))}
                  className="btn-secondary p-1.5 rounded-md"
                  aria-label="Increase count"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Generated Selector */}
          <div className="card space-y-3">
            <label className="text-white font-semibold text-sm block">
              Generated CSS Selector
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 block p-3 rounded-lg bg-surface-lighter text-brand-400 font-mono text-sm break-all border border-slate-700/50">
                {selectorText}
              </code>
              <button
                onClick={copySelector}
                className="btn-secondary p-2 rounded-md flex-shrink-0"
                title="Copy selector"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {matchCount} of {count} items matched
              {matchCount > 0
                ? ` (${((matchCount / count) * 100).toFixed(0)}%)`
                : ''}
            </p>
          </div>
        </div>

        {/* Right Panel: Visual Preview */}
        <div className="lg:col-span-2 space-y-5">
          {/* View toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">
              Visual Preview
            </h3>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showGrid ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Compact view
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Grid view
                </>
              )}
            </button>
          </div>

          {/* Item Grid */}
          <div className="card">
            <div
              className={`gap-3 ${
                showGrid
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  : 'flex flex-col'
              }`}
            >
              {Array.from({ length: count }, (_, i) => {
                const idx = i + 1;
                const matched = matches[i];
                const color = itemColors[i % itemColors.length];
                return (
                  <div
                    key={idx}
                    className={`relative rounded-xl transition-all duration-200 ${
                      matched
                        ? 'ring-2 ring-offset-2 ring-offset-surface ring-brand-400/60'
                        : 'opacity-30 hover:opacity-50'
                    }`}
                    style={{
                      backgroundColor: matched ? `${color}18` : 'transparent',
                      border: `2px solid ${matched ? color : '#334155'}`,
                    }}
                  >
                    {/* Position indicator */}
                    <div
                      className="absolute -top-2.5 -left-2.5 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-lg"
                      style={{
                        backgroundColor: matched ? color : '#1e293b',
                        color: matched ? '#fff' : '#64748b',
                        border: `2px solid ${matched ? color : '#334155'}`,
                      }}
                    >
                      {idx}
                    </div>

                    {/* Content */}
                    <div className="p-4 pt-5 min-h-[70px] flex items-center justify-center">
                      <div className="text-center">
                        <div
                          className="w-6 h-6 rounded-md mx-auto mb-1.5"
                          style={{ backgroundColor: `${color}40` }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: matched ? color : '#475569',
                          }}
                        >
                          {matched ? `✓ Item ${idx}` : `Item ${idx}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-5 pt-4 border-t border-slate-700/50">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 rounded ring-2 ring-brand-400/60 bg-brand-500/10" />
                Matched ({matchCount})
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 rounded border-2 border-slate-600 opacity-30" />
                Not matched ({count - matchCount})
              </div>
            </div>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">
              Common Patterns
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`card p-3 text-left hover:border-brand-500/50 transition-all group ${
                    formula === preset.formula && selectorType === preset.selectorType
                      ? 'border-brand-400 bg-brand-500/5'
                      : 'border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">
                      {preset.label}
                    </span>
                    <code className="text-xs font-mono text-brand-400">
                      {preset.formula}
                    </code>
                  </div>
                  <p className="text-xs text-slate-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">
              How :nth-child(an+b) Works
            </h3>
            <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
              <p>
                The selector matches elements whose 1-based position satisfies{' '}
                <code className="text-brand-300 bg-surface-lighter px-1.5 py-0.5 rounded text-xs font-mono">
                  an+b
                </code>{' '}
                for some non-negative integer <code className="text-brand-300 bg-surface-lighter px-1 py-0.5 rounded text-xs font-mono">n</code>.
              </p>
              <div className="bg-surface-lighter rounded-lg p-4 space-y-2.5 font-mono text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-brand-400 font-bold w-4">a</span>
                  <span className="text-slate-400">Cycle size — how many items to skip between matches</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-400 font-bold w-4">b</span>
                  <span className="text-slate-400">Offset — the first position to match (when n=0)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-400 font-bold w-4">n</span>
                  <span className="text-slate-400">Counter: starts at 0, increments by 1 each iteration</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="bg-surface-lighter rounded-lg p-3">
                  <div className="text-brand-400 font-mono text-xs font-bold mb-1">
                    2n+1 (odd)
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    n=0→<span className="text-white">1</span>, n=1→<span className="text-white">3</span>, n=2→<span className="text-white">5</span>…
                  </div>
                </div>
                <div className="bg-surface-lighter rounded-lg p-3">
                  <div className="text-brand-400 font-mono text-xs font-bold mb-1">
                    2n (even)
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    n=0→0 (skip), n=1→<span className="text-white">2</span>, n=2→<span className="text-white">4</span>…
                  </div>
                </div>
                <div className="bg-surface-lighter rounded-lg p-3">
                  <div className="text-brand-400 font-mono text-xs font-bold mb-1">
                    -n+3
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    n=0→<span className="text-white">3</span>, n=1→<span className="text-white">2</span>, n=2→<span className="text-white">1</span> (first 3)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
