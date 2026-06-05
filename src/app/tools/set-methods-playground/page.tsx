'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Shuffle,
  ArrowRightLeft,
  CircleDot,
  Layers,
  Combine,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface SetOperation {
  name: string;
  label: string;
  symbol: string;
  description: string;
  fn: <T>(a: Set<T>, b: Set<T>) => Set<T> | boolean;
  returnsSet: boolean;
}

interface Item {
  id: number;
  value: string;
}

// ── ES2024 Set methods (with polyfill) ─────────────────────────────────────

function setUnion<T>(a: Set<T>, b: Set<T>): Set<T> {
  try {
    return a.union(b);
  } catch {
    return new Set([...a, ...b]);
  }
}

function setIntersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  try {
    return a.intersection(b);
  } catch {
    return new Set([...a].filter((x) => b.has(x)));
  }
}

function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  try {
    return a.difference(b);
  } catch {
    return new Set([...a].filter((x) => !b.has(x)));
  }
}

function setSymmetricDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  try {
    return a.symmetricDifference(b);
  } catch {
    return new Set(
      [...a].filter((x) => !b.has(x)).concat([...b].filter((x) => !a.has(x)))
    );
  }
}

function setIsSubsetOf<T>(a: Set<T>, b: Set<T>): Set<T> | boolean {
  try {
    return a.isSubsetOf(b);
  } catch {
    return [...a].every((x) => b.has(x));
  }
}

function setIsSupersetOf<T>(a: Set<T>, b: Set<T>): Set<T> | boolean {
  try {
    return a.isSupersetOf(b);
  } catch {
    return [...b].every((x) => a.has(x));
  }
}

function setIsDisjointFrom<T>(a: Set<T>, b: Set<T>): Set<T> | boolean {
  try {
    return a.isDisjointFrom(b);
  } catch {
    return ![...a].some((x) => b.has(x));
  }
}

// ── Operations ──────────────────────────────────────────────────────────────

const OPERATIONS: SetOperation[] = [
  {
    name: 'union',
    label: 'A ∪ B',
    symbol: '∪',
    description: 'All elements in A or B (or both)',
    fn: setUnion,
    returnsSet: true,
  },
  {
    name: 'intersection',
    label: 'A ∩ B',
    symbol: '∩',
    description: 'Elements in both A and B',
    fn: setIntersection,
    returnsSet: true,
  },
  {
    name: 'difference',
    label: 'A − B',
    symbol: '−',
    description: 'Elements in A but not in B',
    fn: setDifference,
    returnsSet: true,
  },
  {
    name: 'symmetricDifference',
    label: 'A △ B',
    symbol: '△',
    description: 'Elements in A or B but not both',
    fn: setSymmetricDifference,
    returnsSet: true,
  },
  {
    name: 'isSubsetOf',
    label: 'A ⊆ B',
    symbol: '⊆',
    description: 'Is A a subset of B?',
    fn: setIsSubsetOf,
    returnsSet: false,
  },
  {
    name: 'isSupersetOf',
    label: 'A ⊇ B',
    symbol: '⊇',
    description: 'Is A a superset of B?',
    fn: setIsSupersetOf,
    returnsSet: false,
  },
  {
    name: 'isDisjointFrom',
    label: 'A ⊥ B',
    symbol: '⊥',
    description: 'Do A and B have no elements in common?',
    fn: setIsDisjointFrom,
    returnsSet: false,
  },
];

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { name: string; setA: string[]; setB: string[] }[] = [
  {
    name: 'Programming Languages',
    setA: ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go'],
    setB: ['Python', 'Java', 'Rust', 'C++', 'TypeScript'],
  },
  {
    name: 'Fruits',
    setA: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
    setB: ['Cherry', 'Date', 'Fig', 'Grape', 'Apple'],
  },
  {
    name: 'Numbers',
    setA: ['1', '2', '3', '4', '5', '6'],
    setB: ['4', '5', '6', '7', '8', '9'],
  },
  {
    name: 'Frontend & Backend',
    setA: ['React', 'Vue', 'Svelte', 'Angular', 'Solid'],
    setB: ['Node.js', 'Deno', 'Bun', 'React', 'Vue'],
  },
  {
    name: 'Disjoint',
    setA: ['A', 'B', 'C'],
    setB: ['X', 'Y', 'Z'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

let _idCounter = 0;
function nextId(): number {
  _idCounter += 1;
  return _idCounter;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copied to clipboard!'),
    () => toast.error('Failed to copy')
  );
}

// ── Venn diagram ────────────────────────────────────────────────────────────
// Draws two overlapping circles with regions colored based on selected operation

function VennDiagram({
  setAValues,
  setBValues,
  selectedOp,
}: {
  setAValues: string[];
  setBValues: string[];
  selectedOp: string | null;
}) {
  const setA = useMemo(() => new Set(setAValues), [setAValues]);
  const setB = useMemo(() => new Set(setBValues), [setBValues]);

  const intersection = useMemo(
    () => [...setA].filter((x) => setB.has(x)),
    [setA, setB]
  );
  const onlyA = useMemo(
    () => [...setA].filter((x) => !setB.has(x)),
    [setA, setB]
  );
  const onlyB = useMemo(
    () => [...setB].filter((x) => !setA.has(x)),
    [setA, setB]
  );

  const total = setA.size + setB.size || 1;

  // Highlight logic based on selected operation
  const highlight = (region: 'onlyA' | 'onlyB' | 'intersection'): boolean => {
    if (!selectedOp) return false;
    switch (selectedOp) {
      case 'union':
        return true; // all regions
      case 'intersection':
        return region === 'intersection';
      case 'difference':
        return region === 'onlyA';
      case 'symmetricDifference':
        return region === 'onlyA' || region === 'onlyB';
      default:
        return false;
    }
  };

  const getOpacity = (region: 'onlyA' | 'onlyB' | 'intersection') => {
    if (!selectedOp) return 0.35;
    return highlight(region) ? 0.85 : 0.12;
  };

  // Circle positions for overlapping Venn
  const cxA = 36;
  const cxB = 64;
  const cy = 50;
  const r = 28;

  // Colors
  const colorA = '#6366f1'; // indigo
  const colorB = '#ec4899'; // pink
  const colorIntersection = '#a855f7'; // purple

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 100 80" className="w-full max-w-[300px]">
        <defs>
          <clipPath id="clipA">
            <circle cx={cxA} cy={cy} r={r} />
          </clipPath>
          <clipPath id="clipB">
            <circle cx={cxB} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* Circle A */}
        <circle
          cx={cxA}
          cy={cy}
          r={r}
          fill={colorA}
          opacity={getOpacity('onlyA')}
          stroke={colorA}
          strokeWidth="1.5"
          className="transition-all duration-300"
        />

        {/* Circle B */}
        <circle
          cx={cxB}
          cy={cy}
          r={r}
          fill={colorB}
          opacity={getOpacity('onlyB')}
          stroke={colorB}
          strokeWidth="1.5"
          className="transition-all duration-300"
        />

        {/* Intersection region — clip circle A to circle B */}
        <circle
          cx={cxA}
          cy={cy}
          r={r}
          fill={colorIntersection}
          opacity={getOpacity('intersection')}
          clipPath="url(#clipB)"
          className="transition-all duration-300"
        />

        {/* Labels */}
        <text
          x={cxA - 14}
          y={cy - 14}
          className="fill-slate-300 text-[8px] font-semibold"
        >
          A ({setA.size})
        </text>
        <text
          x={cxB + 4}
          y={cy - 14}
          className="fill-slate-300 text-[8px] font-semibold"
        >
          B ({setB.size})
        </text>

        {/* Intersection count */}
        {intersection.length > 0 && (
          <text
            x={(cxA + cxB) / 2}
            y={cy + 4}
            textAnchor="middle"
            className="fill-white text-[9px] font-bold"
          >
            {intersection.length}
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: colorA, opacity: 0.7 }}
          />
          A only: {onlyA.length}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: colorIntersection, opacity: 0.7 }}
          />
          Both: {intersection.length}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: colorB, opacity: 0.7 }}
          />
          B only: {onlyB.length}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SetMethodsPlaygroundPage() {
  const [itemsA, setItemsA] = useState<Item[]>([
    { id: nextId(), value: 'JavaScript' },
    { id: nextId(), value: 'TypeScript' },
    { id: nextId(), value: 'Python' },
    { id: nextId(), value: 'Rust' },
    { id: nextId(), value: 'Go' },
  ]);
  const [itemsB, setItemsB] = useState<Item[]>([
    { id: nextId(), value: 'Python' },
    { id: nextId(), value: 'Java' },
    { id: nextId(), value: 'Rust' },
    { id: nextId(), value: 'C++' },
    { id: nextId(), value: 'TypeScript' },
  ]);
  const [newAValue, setNewAValue] = useState('');
  const [newBValue, setNewBValue] = useState('');
  const [selectedOp, setSelectedOp] = useState<string>('union');
  const [result, setResult] = useState<string[] | null>(null);
  const [boolResult, setBoolResult] = useState<boolean | null>(null);
  const inputRefA = useRef<HTMLInputElement>(null);
  const inputRefB = useRef<HTMLInputElement>(null);

  const setAValues = useMemo(() => itemsA.map((i) => i.value), [itemsA]);
  const setBValues = useMemo(() => itemsB.map((i) => i.value), [itemsB]);
  const setA = useMemo(() => new Set(setAValues), [setAValues]);
  const setB = useMemo(() => new Set(setBValues), [setBValues]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const addToA = useCallback(() => {
    const val = newAValue.trim();
    if (!val || setA.has(val)) return;
    setItemsA((prev) => [...prev, { id: nextId(), value: val }]);
    setNewAValue('');
    inputRefA.current?.focus();
  }, [newAValue, setA]);

  const addToB = useCallback(() => {
    const val = newBValue.trim();
    if (!val || setB.has(val)) return;
    setItemsB((prev) => [...prev, { id: nextId(), value: val }]);
    setNewBValue('');
    inputRefB.current?.focus();
  }, [newBValue, setB]);

  const removeFromA = useCallback((id: number) => {
    setItemsA((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const removeFromB = useCallback((id: number) => {
    setItemsB((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const applyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      setItemsA(preset.setA.map((v) => ({ id: nextId(), value: v })));
      setItemsB(preset.setB.map((v) => ({ id: nextId(), value: v })));
      setResult(null);
      setBoolResult(null);
    },
    []
  );

  const clearAll = useCallback(() => {
    setItemsA([]);
    setItemsB([]);
    setResult(null);
    setBoolResult(null);
    setSelectedOp('union');
  }, []);

  const runOperation = useCallback(() => {
    const op = OPERATIONS.find((o) => o.name === selectedOp);
    if (!op) return;

    const output = op.fn(setA, setB);
    if (op.returnsSet) {
      setResult([...(output as Set<string>)]);
      setBoolResult(null);
    } else {
      setResult(null);
      setBoolResult(output as boolean);
    }
  }, [selectedOp, setA, setB]);

  const copyResult = useCallback(() => {
    if (result) {
      copyToClipboard(JSON.stringify(result, null, 2));
    } else if (boolResult !== null) {
      copyToClipboard(String(boolResult));
    }
  }, [result, boolResult]);

  // ── JS code snippet ───────────────────────────────────────────────────

  const codeSnippet = useMemo(() => {
    const op = OPERATIONS.find((o) => o.name === selectedOp);
    if (!op) return '';
    const aStr = JSON.stringify(setAValues);
    const bStr = JSON.stringify(setBValues);
    const methodName = op.name;
    const returnsSet = op.returnsSet;
    return `const A = new Set(${aStr});
const B = new Set(${bStr});

const result = A.${methodName}(B);
// → ${returnsSet ? '[...result]' : 'result'} ${
      returnsSet
        ? result
          ? JSON.stringify(result)
          : '[...]'
        : boolResult !== null
        ? boolResult
        : '...'
    }`;
  }, [selectedOp, setAValues, setBValues, result, boolResult]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Set Methods Playground"
      description="Explore ES2024 Set methods — union, intersection, difference, symmetricDifference, isSubsetOf, isSupersetOf, isDisjointFrom. Visual Venn diagrams, interactive sets, and ready-to-copy JavaScript code."
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left: Sets ──────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Set A */}
          <div className="bg-surface-dark border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                <CircleDot className="w-4 h-4" />
                Set A
              </h3>
              <span className="text-xs text-slate-500">{itemsA.length} items</span>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                ref={inputRefA}
                type="text"
                value={newAValue}
                onChange={(e) => setNewAValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToA()}
                placeholder="Add item..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={addToA}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                title="Add to Set A"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px]">
              {itemsA.length === 0 && (
                <span className="text-xs text-slate-600 italic">Empty set</span>
              )}
              {itemsA.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs text-indigo-300 group"
                >
                  {item.value}
                  <button
                    onClick={() => removeFromA(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  >
                    <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                const temp = itemsA;
                setItemsA(itemsB);
                setItemsB(temp);
                setResult(null);
                setBoolResult(null);
              }}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
              title="Swap sets"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Set B */}
          <div className="bg-surface-dark border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-pink-400 flex items-center gap-2">
                <CircleDot className="w-4 h-4" />
                Set B
              </h3>
              <span className="text-xs text-slate-500">{itemsB.length} items</span>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                ref={inputRefB}
                type="text"
                value={newBValue}
                onChange={(e) => setNewBValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToB()}
                placeholder="Add item..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button
                onClick={addToB}
                className="p-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white transition-colors"
                title="Add to Set B"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px]">
              {itemsB.length === 0 && (
                <span className="text-xs text-slate-600 italic">Empty set</span>
              )}
              {itemsB.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-xs text-pink-300 group"
                >
                  {item.value}
                  <button
                    onClick={() => removeFromB(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  >
                    <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div className="bg-surface-dark border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Presets
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-xs text-slate-300 hover:text-white transition-colors border border-slate-600/50"
                >
                  {preset.name}
                </button>
              ))}
              <button
                onClick={clearAll}
                className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-red-900/30 text-xs text-slate-300 hover:text-red-400 transition-colors border border-slate-600/50 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* ── Center: Operations & Results ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Venn Diagram */}
          <div className="bg-surface-dark border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Combine className="w-4 h-4" />
              Visual Diagram
            </h3>
            <VennDiagram
              setAValues={setAValues}
              setBValues={setBValues}
              selectedOp={selectedOp}
            />
          </div>

          {/* Operations */}
          <div className="bg-surface-dark border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              ES2024 Set Operations
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {OPERATIONS.map((op) => (
                <button
                  key={op.name}
                  onClick={() => {
                    setSelectedOp(op.name);
                    setResult(null);
                    setBoolResult(null);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedOp === op.name
                      ? 'bg-brand-500/10 border-brand-500/50 text-brand-300'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <div className="text-lg font-mono font-bold mb-0.5">{op.label}</div>
                  <div className="text-[11px] leading-tight opacity-70">{op.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={runOperation}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-colors"
            >
              Compute {OPERATIONS.find((o) => o.name === selectedOp)?.label}
            </button>
          </div>

          {/* Result */}
          <div className="bg-surface-dark border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                Result
              </h3>
              {(result !== null || boolResult !== null) && (
                <button
                  onClick={copyResult}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy result"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>

            {result === null && boolResult === null && (
              <p className="text-sm text-slate-600 italic">
                Select an operation and click &quot;Compute&quot; to see the result.
              </p>
            )}

            {result !== null && (
              <div>
                {result.length === 0 ? (
                  <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                    Empty set ∅
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {result.map((v, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-brand-500/15 border border-brand-500/30 rounded-full text-sm text-brand-300 font-mono"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  {result.length} element{result.length !== 1 ? 's' : ''} in result set
                </div>
              </div>
            )}

            {boolResult !== null && (
              <div
                className={`text-sm font-semibold rounded-lg px-3 py-2 inline-block ${
                  boolResult
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                {boolResult ? '✓ true' : '✗ false'}
              </div>
            )}
          </div>

          {/* Code Snippet */}
          <div className="bg-surface-dark border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                JavaScript Code
              </h3>
              <button
                onClick={() => copyToClipboard(codeSnippet)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 overflow-x-auto text-slate-300 font-mono leading-relaxed">
              <code>{codeSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
