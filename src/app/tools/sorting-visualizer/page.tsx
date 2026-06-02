'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play, Pause, RotateCcw, Shuffle, Zap, Snail,
  ChevronDown, BarChart3, AlignJustify, Copy, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Algorithm =
  | 'bubble'
  | 'selection'
  | 'insertion'
  | 'merge'
  | 'quick'
  | 'heap'
  | 'shell'
  | 'cocktail';

interface AlgorithmInfo {
  name: string;
  complexity: string;
  space: string;
  stable: boolean;
  description: string;
}

interface BarState {
  value: number;
  color: string;
}

type SortStatus = 'idle' | 'running' | 'paused' | 'done';

// ── Algorithm metadata ─────────────────────────────────────────────────────

const ALGORITHMS: Record<Algorithm, AlgorithmInfo> = {
  bubble: {
    name: 'Bubble Sort',
    complexity: 'O(n²)',
    space: 'O(1)',
    stable: true,
    description: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order. Simple but slow for large datasets.',
  },
  selection: {
    name: 'Selection Sort',
    complexity: 'O(n²)',
    space: 'O(1)',
    stable: false,
    description: 'Divides the input into a sorted and unsorted region, repeatedly selects the smallest from the unsorted region and moves it to the end of the sorted region.',
  },
  insertion: {
    name: 'Insertion Sort',
    complexity: 'O(n²)',
    space: 'O(1)',
    stable: true,
    description: 'Builds the final sorted array one item at a time. Efficient for small or nearly-sorted datasets — used by Timsort and introsort.',
  },
  merge: {
    name: 'Merge Sort',
    complexity: 'O(n log n)',
    space: 'O(n)',
    stable: true,
    description: 'Divide-and-conquer: splits the array in half, recursively sorts each half, then merges the sorted halves. Guaranteed O(n log n) performance.',
  },
  quick: {
    name: 'Quick Sort',
    complexity: 'O(n log n) avg / O(n²) worst',
    space: 'O(log n)',
    stable: false,
    description: 'Picks a pivot, partitions the array around it, then recursively sorts the partitions. Fast in practice — used in many standard libraries.',
  },
  heap: {
    name: 'Heap Sort',
    complexity: 'O(n log n)',
    space: 'O(1)',
    stable: false,
    description: 'Builds a max-heap from the data, then repeatedly extracts the maximum and places it at the end. In-place with guaranteed O(n log n).',
  },
  shell: {
    name: 'Shell Sort',
    complexity: 'O(n log² n) worst',
    space: 'O(1)',
    stable: false,
    description: 'Generalization of insertion sort that allows exchange of far-apart elements. Uses a gap sequence (Knuth: h = 3h + 1) to gradually sort the array.',
  },
  cocktail: {
    name: 'Cocktail Shaker Sort',
    complexity: 'O(n²)',
    space: 'O(1)',
    stable: true,
    description: 'Bidirectional bubble sort — passes from left to right, then right to left. Slightly better than bubble sort for certain distributions.',
  },
};

const ALGORITHM_LIST: Algorithm[] = ['bubble', 'selection', 'insertion', 'merge', 'quick', 'heap', 'shell', 'cocktail'];

// ── Colors ─────────────────────────────────────────────────────────────────

const DEFAULT_COLOR = '#6366f1';   // indigo-500
const COMPARE_COLOR = '#f59e0b';   // amber-500
const SWAP_COLOR = '#ef4444';      // red-500
const SORTED_COLOR = '#10b981';    // emerald-500
const PIVOT_COLOR = '#8b5cf6';     // violet-500
const MERGE_COLOR = '#06b6d4';     // cyan-500

// ── Generate random array ───────────────────────────────────────────────────

function generateArray(size: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < size; i++) {
    arr.push(Math.floor(Math.random() * 290) + 10); // 10–300
  }
  return arr;
}

// ── Sorting Generators ──────────────────────────────────────────────────────

interface Step {
  array: number[];
  compare?: [number, number];
  swap?: [number, number];
  pivot?: number;
  sorted?: number[];
  merging?: [number, number, number]; // [left, mid, right]
  done?: boolean;
}

// Bubble Sort
function* bubbleSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;
  const sorted: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      yield { array: [...a], compare: [j, j + 1], sorted: [...sorted] };
      if (a[j] > a[j + 1]) {
        yield { array: [...a], swap: [j, j + 1], sorted: [...sorted] };
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    sorted.push(n - i - 1);
    if (!swapped) {
      // Fill remaining as sorted
      for (let k = 0; k < n - i - 1; k++) {
        if (!sorted.includes(k)) sorted.push(k);
      }
      sorted.sort((a, b) => a - b);
      yield { array: [...a], sorted: [...sorted], done: true };
      return;
    }
  }
  sorted.push(0);
  sorted.sort((a, b) => a - b);
  yield { array: [...a], sorted, done: true };
}

// Selection Sort
function* selectionSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;
  const sorted: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      yield { array: [...a], compare: [minIdx, j], sorted: [...sorted] };
      if (a[j] < a[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      yield { array: [...a], swap: [i, minIdx], sorted: [...sorted] };
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
    }
    sorted.push(i);
  }
  sorted.push(n - 1);
  sorted.sort((a, b) => a - b);
  yield { array: [...a], sorted, done: true };
}

// Insertion Sort
function* insertionSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    yield { array: [...a], compare: [j, i] };
    while (j >= 0 && a[j] > key) {
      yield { array: [...a], compare: [j, j + 1] };
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
    yield { array: [...a], swap: [j + 1, i] };
  }
  yield { array: [...a], sorted: Array.from({ length: n }, (_, i) => i), done: true };
}

// Merge Sort — iterative approach avoids nested yield*
function* mergeSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;

  // Bottom-up merge sort
  for (let width = 1; width < n; width *= 2) {
    for (let start = 0; start < n; start += 2 * width) {
      const mid = Math.min(start + width, n);
      const end = Math.min(start + 2 * width, n);
      if (mid >= end) continue;

      // Merge two sorted subarrays: a[start..mid-1] and a[mid..end-1]
      const left = a.slice(start, mid);
      const right = a.slice(mid, end);
      let i = 0, j = 0, k = start;

      while (i < left.length && j < right.length) {
        yield { array: [...a], compare: [start + i, mid + j], merging: [start, mid, end] };
        if (left[i] <= right[j]) {
          a[k] = left[i];
          i++;
        } else {
          a[k] = right[j];
          j++;
        }
        yield { array: [...a], swap: [k, k], merging: [start, mid, end] };
        k++;
      }
      while (i < left.length) {
        a[k] = left[i];
        yield { array: [...a], swap: [k, k], merging: [start, mid, end] };
        i++; k++;
      }
      while (j < right.length) {
        a[k] = right[j];
        yield { array: [...a], swap: [k, k], merging: [start, mid, end] };
        j++; k++;
      }
    }
  }

  yield { array: [...a], sorted: Array.from({ length: n }, (_, i) => i), done: true };
}

// Quick Sort
function* quickSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const sorted: Set<number> = new Set();

  function* quickSortImpl(lo: number, hi: number): Generator<Step> {
    if (lo >= hi) {
      sorted.add(lo);
      if (lo === 0 && hi === a.length - 1 || sorted.size === a.length) {
        yield { array: [...a], sorted: Array.from(sorted).sort((a, b) => a - b), done: sorted.size === a.length };
      }
      return;
    }
    const pivotIdx = hi;
    yield { array: [...a], pivot: pivotIdx, sorted: Array.from(sorted) };
    const pivot = a[pivotIdx];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      yield { array: [...a], compare: [j, pivotIdx], pivot: pivotIdx, sorted: Array.from(sorted) };
      if (a[j] <= pivot) {
        i++;
        if (i !== j) {
          yield { array: [...a], swap: [i, j], pivot: pivotIdx, sorted: Array.from(sorted) };
          [a[i], a[j]] = [a[j], a[i]];
        }
      }
    }
    if (i + 1 !== hi) {
      yield { array: [...a], swap: [i + 1, hi], pivot: pivotIdx };
      [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    }
    const newPivot = i + 1;
    sorted.add(newPivot);
    yield* quickSortImpl(lo, newPivot - 1);
    yield* quickSortImpl(newPivot + 1, hi);
  }

  yield* quickSortImpl(0, a.length - 1);
  yield { array: [...a], sorted: Array.from({ length: a.length }, (_, i) => i), done: true };
}

// Heap Sort
function* heapSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;

  function* heapify(size: number, root: number): Generator<Step> {
    let largest = root;
    const left = 2 * root + 1;
    const right = 2 * root + 2;
    if (left < size) {
      yield { array: [...a], compare: [largest, left] };
      if (a[left] > a[largest]) largest = left;
    }
    if (right < size) {
      yield { array: [...a], compare: [largest, right] };
      if (a[right] > a[largest]) largest = right;
    }
    if (largest !== root) {
      yield { array: [...a], swap: [root, largest] };
      [a[root], a[largest]] = [a[largest], a[root]];
      yield* heapify(size, largest);
    }
  }

  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }

  const sorted: number[] = [];
  for (let i = n - 1; i > 0; i--) {
    yield { array: [...a], swap: [0, i] };
    [a[0], a[i]] = [a[i], a[0]];
    sorted.unshift(i);
    yield* heapify(i, 0);
  }
  sorted.unshift(0);
  yield { array: [...a], sorted, done: true };
}

// Shell Sort
function* shellSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;
  // Generate Knuth gap sequence
  const gaps: number[] = [];
  let h = 1;
  while (h < n) {
    gaps.push(h);
    h = 3 * h + 1;
  }
  gaps.reverse();

  for (const gap of gaps) {
    for (let i = gap; i < n; i++) {
      const temp = a[i];
      let j = i;
      yield { array: [...a], compare: [j - gap, j] };
      while (j >= gap && a[j - gap] > temp) {
        yield { array: [...a], swap: [j, j - gap] };
        a[j] = a[j - gap];
        j -= gap;
      }
      a[j] = temp;
    }
  }
  yield { array: [...a], sorted: Array.from({ length: n }, (_, i) => i), done: true };
}

// Cocktail Shaker Sort
function* cocktailSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;
  const sorted: number[] = [];
  let start = 0;
  let end = n - 1;
  let swapped = true;

  while (swapped) {
    swapped = false;
    // Forward pass
    for (let i = start; i < end; i++) {
      yield { array: [...a], compare: [i, i + 1], sorted: [...sorted] };
      if (a[i] > a[i + 1]) {
        yield { array: [...a], swap: [i, i + 1], sorted: [...sorted] };
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
      }
    }
    sorted.push(end);
    end--;
    if (!swapped) break;

    swapped = false;
    // Backward pass
    for (let i = end; i > start; i--) {
      yield { array: [...a], compare: [i, i - 1], sorted: [...sorted] };
      if (a[i] < a[i - 1]) {
        yield { array: [...a], swap: [i, i - 1], sorted: [...sorted] };
        [a[i], a[i - 1]] = [a[i - 1], a[i]];
        swapped = true;
      }
    }
    sorted.push(start);
    start++;
  }
  sorted.sort((a, b) => a - b);
  yield { array: [...a], sorted, done: true };
}

// ── Generator map ───────────────────────────────────────────────────────────

const SORT_GENERATORS: Record<Algorithm, (arr: number[]) => Generator<Step>> = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
  heap: heapSort,
  shell: shellSort,
  cocktail: cocktailSort,
};

// ── Speed presets (ms delay between steps) ──────────────────────────────────

const SPEED_PRESETS = [
  { label: '1x', value: 50 },
  { label: '2x', value: 20 },
  { label: '4x', value: 8 },
  { label: '8x', value: 3 },
  { label: '16x', value: 1 },
  { label: '32x', value: 0 },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function SortingVisualizerPage() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('quick');
  const [arraySize, setArraySize] = useState(50);
  const [speedIdx, setSpeedIdx] = useState(1); // 2x default
  const [status, setStatus] = useState<SortStatus>('idle');
  const [data, setData] = useState<number[]>(() => generateArray(50));
  const [step, setStep] = useState<Step | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [showAlgorithmDropdown, setShowAlgorithmDropdown] = useState(false);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generatorRef = useRef<Generator<Step> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<SortStatus>('idle');
  const dataRef = useRef<number[]>([]);

  // Keep refs in sync
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { dataRef.current = data; }, [data]);

  const algo = ALGORITHMS[algorithm];
  const speed = SPEED_PRESETS[speedIdx].value;

  // ── Canvas rendering ──────────────────────────────────────────────────────

  const render = useCallback((stepData: Step | null, arr: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const maxVal = 300; // max possible value

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    if (!arr.length) return;

    const barWidth = Math.max(3, (w - (arr.length + 1) * 1) / arr.length);
    const totalGapSpace = w - barWidth * arr.length;
    const gap = arr.length > 1 ? totalGapSpace / (arr.length + 1) : (w - barWidth) / 2;

    // Draw bars
    for (let i = 0; i < arr.length; i++) {
      const value = arr[i];
      const barH = (value / maxVal) * (h - 40);
      const x = gap + i * (barWidth + gap);
      const y = h - 20 - barH;

      let color = DEFAULT_COLOR;

      if (stepData) {
        // Sorted bars
        if (stepData.sorted?.includes(i)) {
          color = stepData.done ? SORTED_COLOR : SORTED_COLOR + 'cc';
        }
        // Pivot
        else if (stepData.pivot === i) {
          color = PIVOT_COLOR;
        }
        // Currently comparing
        else if (stepData.compare?.includes(i)) {
          color = COMPARE_COLOR;
        }
        // Currently swapping
        else if (stepData.swap?.includes(i)) {
          color = SWAP_COLOR;
        }
        // Merge range
        else if (stepData.merging && i >= stepData.merging[0] && i <= stepData.merging[2]) {
          color = MERGE_COLOR + '88';
        }

        // Done
        if (stepData.done) {
          color = SORTED_COLOR;
        }
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barH);

      // Subtle top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, y, barWidth, 2);
    }
  }, []);

  // Re-render on step/data/size changes
  useEffect(() => {
    render(step, data);
    const handleResize = () => render(step, dataRef.current);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [step, data, render]);

  // ── Tick function ─────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    const gen = generatorRef.current;
    if (!gen) return;

    const result = gen.next();
    if (result.done) {
      setStatus('done');
      setStep((prev) => prev ? { ...prev, done: true } : null);
      generatorRef.current = null;
      toast.success(`${ALGORITHMS[algorithm].name} complete!`, { icon: '✅' });
      return;
    }

    const stepData = result.value;
    setStep(stepData);
    setStepCount((c) => c + 1);
    setData(stepData.array);

    if (stepData.done) {
      setStatus('done');
      generatorRef.current = null;
      toast.success(`${ALGORITHMS[algorithm].name} complete!`, { icon: '✅' });
      return;
    }

    // Schedule next step
    if (statusRef.current === 'running') {
      timerRef.current = setTimeout(tick, speed);
    }
  }, [speed, algorithm]);

  // ── Start / Resume ────────────────────────────────────────────────────────

  const startSort = useCallback(() => {
    if (status === 'done') {
      // Reset and start
      const arr = generateArray(arraySize);
      setData(arr);
      setStepCount(0);
      setStep(null);
      const gen = SORT_GENERATORS[algorithm](arr);
      generatorRef.current = gen;
      setStatus('running');
      statusRef.current = 'running';
      timerRef.current = setTimeout(tick, speed);
    } else if (status === 'paused') {
      setStatus('running');
      statusRef.current = 'running';
      timerRef.current = setTimeout(tick, speed);
    } else {
      // Idle start
      const arr = [...data];
      setStepCount(0);
      setStep(null);
      const gen = SORT_GENERATORS[algorithm](arr);
      generatorRef.current = gen;
      setStatus('running');
      statusRef.current = 'running';
      timerRef.current = setTimeout(tick, speed);
    }
  }, [status, algorithm, data, arraySize, speed, tick]);

  // ── Pause ─────────────────────────────────────────────────────────────────

  const pauseSort = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('paused');
    statusRef.current = 'paused';
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetSort = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    generatorRef.current = null;
    const arr = generateArray(arraySize);
    setData(arr);
    setStep(null);
    setStepCount(0);
    setStatus('idle');
    statusRef.current = 'idle';
  }, [arraySize]);

  // ── Shuffle (new random array) ────────────────────────────────────────────

  const shuffleArray = useCallback(() => {
    if (status === 'running') {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    generatorRef.current = null;
    const arr = generateArray(arraySize);
    setData(arr);
    setStep(null);
    setStepCount(0);
    setStatus('idle');
    statusRef.current = 'idle';
  }, [arraySize, status]);

  // ── Change algorithm ──────────────────────────────────────────────────────

  const changeAlgorithm = useCallback((alg: Algorithm) => {
    setAlgorithm(alg);
    setShowAlgorithmDropdown(false);
    resetSort();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    generatorRef.current = null;
  }, [resetSort]);

  // ── Change array size ─────────────────────────────────────────────────────

  const changeSize = useCallback((size: number) => {
    if (status === 'running' || status === 'paused') {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    generatorRef.current = null;
    setArraySize(size);
    const arr = generateArray(size);
    setData(arr);
    setStep(null);
    setStepCount(0);
    setStatus('idle');
    statusRef.current = 'idle';
  }, [status]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Copy algorithm info ───────────────────────────────────────────────────

  const copyAlgoInfo = useCallback(() => {
    const text = `${algo.name}\nTime: ${algo.complexity}\nSpace: ${algo.space}\nStable: ${algo.stable ? 'Yes' : 'No'}\n${algo.description}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Algorithm info copied!');
    });
  }, [algo]);

  // ── Progress percentage ───────────────────────────────────────────────────

  const progressPct = useMemo(() => {
    if (!step) return 0;
    if (step.done) return 100;
    const totalSorted = step.sorted?.length ?? 0;
    return Math.min(99, Math.round((totalSorted / data.length) * 100));
  }, [step, data.length]);

  // ── Bar value counts for stats ────────────────────────────────────────────

  const isSorted = useMemo(() => {
    if (!step?.done && status !== 'done') return false;
    for (let i = 1; i < data.length; i++) {
      if (data[i] < data[i - 1]) return false;
    }
    return true;
  }, [data, step, status]);

  return (
    <ToolLayout
      title="Sorting Algorithm Visualizer"
      description="Watch sorting algorithms in action — bubble, selection, insertion, merge, quick, heap, shell, and cocktail shaker. Adjust speed and array size in real time."
      controls={
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Algorithm dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowAlgorithmDropdown(!showAlgorithmDropdown); setShowSpeedDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">{algo.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
            {showAlgorithmDropdown && (
              <div className="absolute top-full mt-1 left-0 z-50 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                {ALGORITHM_LIST.map((a) => (
                  <button
                    key={a}
                    onClick={() => changeAlgorithm(a)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                      a === algorithm
                        ? 'bg-brand-500/10 text-brand-300'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{ALGORITHMS[a].name}</span>
                    <span className="text-xs text-slate-500 font-mono">{ALGORITHMS[a].complexity}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Array size */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <AlignJustify className="w-3.5 h-3.5" />
            <input
              type="range"
              min={10}
              max={200}
              value={arraySize}
              onChange={(e) => changeSize(Number(e.target.value))}
              className="w-20 accent-brand-500"
              disabled={status === 'running'}
            />
            <span className="font-mono w-8">{arraySize}</span>
          </div>

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => { setShowSpeedDropdown(!showSpeedDropdown); setShowAlgorithmDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-600 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono">{SPEED_PRESETS[speedIdx].label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
            {showSpeedDropdown && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                {SPEED_PRESETS.map((sp, idx) => (
                  <button
                    key={sp.label}
                    onClick={() => { setSpeedIdx(idx); setShowSpeedDropdown(false); }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      idx === speedIdx
                        ? 'bg-brand-500/10 text-brand-300'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    {sp.label} <span className="text-xs text-slate-500">({sp.value}ms)</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Play / Pause / Reset */}
          <div className="flex items-center gap-1">
            <button
              onClick={shuffleArray}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              title="New random array"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            {status === 'running' ? (
              <button
                onClick={pauseSort}
                className="p-1.5 rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={startSort}
                className="p-1.5 rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                title={status === 'paused' ? 'Resume' : 'Start'}
                disabled={isSorted && status === 'done'}
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={resetSort}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Canvas */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-80"
            style={{ display: 'block' }}
          />
        </div>

        {/* Progress bar */}
        {(status === 'running' || status === 'paused' || status === 'done') && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: status === 'done' ? SORTED_COLOR : COMPARE_COLOR,
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
              {status === 'done' ? '✓ Done' : `${progressPct}%`}
              <span className="ml-2 text-slate-600">{stepCount} steps</span>
            </span>
          </div>
        )}

        {/* Algorithm info card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">Algorithm</div>
            <div className="text-sm font-semibold text-slate-200">{algo.name}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">Time Complexity</div>
            <div className="text-sm font-semibold font-mono text-amber-400">{algo.complexity}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">Space</div>
            <div className="text-sm font-semibold font-mono text-emerald-400">{algo.space}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-xs text-slate-500 mb-1">Stable</div>
            <div className="text-sm font-semibold text-slate-200">
              <span className={algo.stable ? 'text-emerald-400' : 'text-red-400'}>
                {algo.stable ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
          <div className="flex items-start justify-between">
            <p className="text-sm text-slate-400 leading-relaxed">{algo.description}</p>
            <button
              onClick={copyAlgoInfo}
              className="ml-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors flex-shrink-0"
              title="Copy algorithm info"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Color legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: DEFAULT_COLOR }} />
            Default
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COMPARE_COLOR }} />
            Comparing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SWAP_COLOR }} />
            Swapping
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIVOT_COLOR }} />
            Pivot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: MERGE_COLOR }} />
            Merging
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SORTED_COLOR }} />
            Sorted
          </span>
        </div>

        {/* Click-outside handlers for dropdowns */}
        {showAlgorithmDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowAlgorithmDropdown(false)}
          />
        )}
        {showSpeedDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSpeedDropdown(false)}
          />
        )}
      </div>
    </ToolLayout>
  );
}
