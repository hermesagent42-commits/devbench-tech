'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, Play, CheckCircle2, X, Filter, Code2, ArrowRight, Hash, ListOrdered, GitMerge, Eye, Scissors, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ArrayMethod {
  name: string;
  signature: string;
  description: string;
  category: string;
  mutates: boolean;
  returns: string;
  example: string;
  output: string;
}

const ARRAY_METHODS: ArrayMethod[] = [
  // ── Creation ──
  { name: 'Array.from()', signature: 'Array.from(arrayLike, mapFn?, thisArg?)', description: 'Creates a new Array from an array-like or iterable object. Useful for converting NodeLists, Sets, Maps, and strings.', category: 'Creation', mutates: false, returns: 'Array', example: "Array.from('hello')", output: "['h', 'e', 'l', 'l', 'o']" },
  { name: 'Array.from() with map', signature: 'Array.from(arrayLike, mapFn)', description: 'Creates an array and transforms each element in a single pass — more efficient than .map() after creation.', category: 'Creation', mutates: false, returns: 'Array', example: 'Array.from([1, 2, 3], x => x * 2)', output: '[2, 4, 6]' },
  { name: 'Array.fromAsync()', signature: 'Array.fromAsync(asyncIterable, mapFn?)', description: 'Creates an array from an async iterable — handles streams, paginated APIs, and async generators. ES2024.', category: 'Creation', mutates: false, returns: 'Promise<Array>', example: 'await Array.fromAsync(asyncGen)', output: '[resolved, values]' },
  { name: 'Array.of()', signature: 'Array.of(...items)', description: 'Creates an array from arguments. Unlike the Array() constructor, a single number argument creates a one-element array, not a sparse array.', category: 'Creation', mutates: false, returns: 'Array', example: 'Array.of(7)', output: '[7]' },
  { name: 'Array() constructor', signature: 'new Array(length) or Array(...items)', description: 'Creates an array. With a single number, creates a sparse array of that length. With multiple args or non-number, creates with those elements.', category: 'Creation', mutates: false, returns: 'Array', example: 'new Array(3).fill(0)', output: '[0, 0, 0]' },

  // ── Access / Search ──
  { name: 'at()', signature: 'arr.at(index)', description: 'Returns the element at the given index. Accepts negative indices (counts from the end). Cleaner than arr[arr.length - 1].', category: 'Access & Search', mutates: false, returns: 'Element | undefined', example: "['a','b','c'].at(-1)", output: "'c'" },
  { name: 'find()', signature: 'arr.find(callback, thisArg?)', description: 'Returns the first element that satisfies the testing function. Returns undefined if none match. Stops iterating after the first match.', category: 'Access & Search', mutates: false, returns: 'Element | undefined', example: '[10, 25, 30].find(n => n > 20)', output: '25' },
  { name: 'findLast()', signature: 'arr.findLast(callback, thisArg?)', description: 'Returns the last element that satisfies the testing function. Searches from right to left. ES2023.', category: 'Access & Search', mutates: false, returns: 'Element | undefined', example: '[10, 25, 30].findLast(n => n > 20)', output: '30' },
  { name: 'findIndex()', signature: 'arr.findIndex(callback, thisArg?)', description: 'Returns the index of the first element that satisfies the testing function. Returns -1 if none match.', category: 'Access & Search', mutates: false, returns: 'number', example: '[10, 25, 30].findIndex(n => n > 20)', output: '1' },
  { name: 'findLastIndex()', signature: 'arr.findLastIndex(callback, thisArg?)', description: 'Returns the index of the last element satisfying the test. Searches right to left. ES2023.', category: 'Access & Search', mutates: false, returns: 'number', example: '[10, 25, 30].findLastIndex(n => n > 20)', output: '2' },
  { name: 'indexOf()', signature: 'arr.indexOf(searchElement, fromIndex?)', description: 'Returns the first index of a value using strict equality (===). Returns -1 if not found. Use fromIndex to start from a specific position.', category: 'Access & Search', mutates: false, returns: 'number', example: "['a','b','c','b'].indexOf('b')", output: '1' },
  { name: 'lastIndexOf()', signature: 'arr.lastIndexOf(searchElement, fromIndex?)', description: 'Returns the last index of a value using strict equality. Searches from right to left. Returns -1 if not found.', category: 'Access & Search', mutates: false, returns: 'number', example: "['a','b','c','b'].lastIndexOf('b')", output: '3' },
  { name: 'includes()', signature: 'arr.includes(searchElement, fromIndex?)', description: 'Returns true if the array contains the value (strict equality). Cleaner than indexOf() !== -1. Works with NaN.', category: 'Access & Search', mutates: false, returns: 'boolean', example: "[1, 2, NaN].includes(NaN)", output: 'true' },
  { name: 'some()', signature: 'arr.some(callback, thisArg?)', description: 'Returns true if at least one element passes the test. Returns false for empty arrays. Short-circuits on first match.', category: 'Access & Search', mutates: false, returns: 'boolean', example: '[1, 3, 5].some(n => n % 2 === 0)', output: 'false' },

  // ── Add / Remove ──
  { name: 'push()', signature: 'arr.push(...items)', description: 'Adds elements to the end of the array and returns the new length. Most common way to append.', category: 'Add & Remove', mutates: true, returns: 'number (new length)', example: "let a = [1]; a.push(2, 3); a", output: '[1, 2, 3]' },
  { name: 'pop()', signature: 'arr.pop()', description: 'Removes and returns the last element. Returns undefined for empty arrays. Classic stack operation.', category: 'Add & Remove', mutates: true, returns: 'Element | undefined', example: "let a = [1,2,3]; a.pop(); a", output: '[1, 2]' },
  { name: 'unshift()', signature: 'arr.unshift(...items)', description: 'Adds elements to the beginning and returns new length. Shifts all existing elements right. O(n) — slower than push().', category: 'Add & Remove', mutates: true, returns: 'number (new length)', example: "let a = [3]; a.unshift(1,2); a", output: '[1, 2, 3]' },
  { name: 'shift()', signature: 'arr.shift()', description: 'Removes and returns the first element. Shifts all remaining elements left. O(n) — slower than pop().', category: 'Add & Remove', mutates: true, returns: 'Element | undefined', example: "let a = [1,2,3]; a.shift(); a", output: '[2, 3]' },
  { name: 'splice()', signature: 'arr.splice(start, deleteCount?, ...items?)', description: 'Adds, removes, or replaces elements at any position. Returns removed elements. The Swiss Army knife of array mutation.', category: 'Add & Remove', mutates: true, returns: 'Array (removed)', example: "let a=[1,5]; a.splice(1,0,2,3,4); a", output: '[1, 2, 3, 4, 5]' },
  { name: 'toSpliced()', signature: 'arr.toSpliced(start, deleteCount?, ...items?)', description: 'Immutable splice — returns a new array with changes. The original is unchanged. ES2023.', category: 'Add & Remove', mutates: false, returns: 'Array (new)', example: "[1,2,3].toSpliced(1, 1, 'x')", output: "[1, 'x', 3]" },
  { name: 'with()', signature: 'arr.with(index, value)', description: 'Immutable element replacement — returns a new array with the element at index replaced. Supports negative indices. ES2023.', category: 'Add & Remove', mutates: false, returns: 'Array (new)', example: "[10,20,30].with(1, 99)", output: '[10, 99, 30]' },

  // ── Transform ──
  { name: 'map()', signature: 'arr.map(callback, thisArg?)', description: 'Creates a new array by applying a function to every element. Returns an array of the same length. Pure — does not mutate.', category: 'Transform', mutates: false, returns: 'Array (same length)', example: '[1,2,3].map(n => n * n)', output: '[1, 4, 9]' },
  { name: 'filter()', signature: 'arr.filter(callback, thisArg?)', description: 'Creates a new array with elements that pass the test. Returns a subset — length may be smaller or zero.', category: 'Transform', mutates: false, returns: 'Array (possibly shorter)', example: '[1,2,3,4].filter(n => n % 2 === 0)', output: '[2, 4]' },
  { name: 'reduce()', signature: 'arr.reduce(callback, initialValue?)', description: 'Reduces array to a single value by accumulating results. The callback receives (accumulator, currentValue, index, array). Without initialValue, uses first element as accumulator and starts from index 1.', category: 'Transform', mutates: false, returns: 'any (accumulated)', example: '[1,2,3,4].reduce((sum, n) => sum + n, 0)', output: '10' },
  { name: 'reduceRight()', signature: 'arr.reduceRight(callback, initialValue?)', description: 'Like reduce() but processes elements right-to-left. Useful when order matters (e.g., composing functions).', category: 'Transform', mutates: false, returns: 'any (accumulated)', example: "['a','b','c'].reduceRight((s,c) => s + c, '')", output: "'cba'" },
  { name: 'flatMap()', signature: 'arr.flatMap(callback, thisArg?)', description: 'Maps each element, then flattens the result by one level. More efficient than .map().flat() — done in a single pass.', category: 'Transform', mutates: false, returns: 'Array (flattened)', example: "['hi','bye'].flatMap(w => w.split(''))", output: "['h','i','b','y','e']" },
  { name: 'group()', signature: 'arr.group(callback)', description: 'Groups elements into an object by the callback return value. No prototype pollution — uses null-prototype object. ES2024.', category: 'Transform', mutates: false, returns: 'Object (null prototype)', example: "[1,2,3,4,5].group(n => n % 2 === 0 ? 'even' : 'odd')", output: "{ odd: [1,3,5], even: [2,4] }" },
  { name: 'groupToMap()', signature: 'arr.groupToMap(callback)', description: 'Like group() but returns a Map instead of an object. Better for non-string keys. ES2024.', category: 'Transform', mutates: false, returns: 'Map', example: "[1,2,3,4,5].groupToMap(n => n % 2 === 0 ? 'even' : 'odd')", output: "Map(2) {'odd'=>[1,3,5], 'even'=>[2,4]}" },

  // ── Reorder ──
  { name: 'sort()', signature: 'arr.sort(compareFn?)', description: 'Sorts elements in-place. Default sorts as strings (lexicographic). Pass a compare function: (a, b) => a - b for numeric ascending.', category: 'Reorder', mutates: true, returns: 'Array (same reference)', example: '[3,1,4,1,5].sort((a,b) => a-b)', output: '[1, 1, 3, 4, 5]' },
  { name: 'toSorted()', signature: 'arr.toSorted(compareFn?)', description: 'Immutable sort — returns a new sorted array. Original is unchanged. ES2023.', category: 'Reorder', mutates: false, returns: 'Array (new)', example: '[3,1,2].toSorted()', output: '[1, 2, 3]' },
  { name: 'reverse()', signature: 'arr.reverse()', description: 'Reverses elements in-place and returns the same reference. For immutable reverse, use toReversed() or [...arr].reverse().', category: 'Reorder', mutates: true, returns: 'Array (same reference)', example: "[1,2,3].reverse()", output: '[3, 2, 1]' },
  { name: 'toReversed()', signature: 'arr.toReversed()', description: 'Immutable reverse — returns a new reversed array. Original is unchanged. ES2023.', category: 'Reorder', mutates: false, returns: 'Array (new)', example: '[1,2,3].toReversed()', output: '[3, 2, 1]' },

  // ── Subset / Slice ──
  { name: 'slice()', signature: 'arr.slice(start?, end?)', description: 'Returns a shallow copy of a portion of the array. Does not mutate. Negative indices count from the end. end is exclusive.', category: 'Subset & Slice', mutates: false, returns: 'Array (new)', example: "['a','b','c','d'].slice(1, 3)", output: "['b', 'c']" },
  { name: 'copyWithin()', signature: 'arr.copyWithin(target, start, end?)', description: 'Copies a sequence of elements within the array, overwriting at the target position. Mutates in-place without changing length.', category: 'Subset & Slice', mutates: true, returns: 'Array (same reference)', example: '[1,2,3,4,5].copyWithin(0, 3)', output: '[4, 5, 3, 4, 5]' },
  { name: 'fill()', signature: 'arr.fill(value, start?, end?)', description: 'Fills all or part of the array with a static value. Mutates in-place. Great for initializing typed arrays.', category: 'Subset & Slice', mutates: true, returns: 'Array (same reference)', example: 'new Array(5).fill(0)', output: '[0, 0, 0, 0, 0]' },

  // ── Flatten ──
  { name: 'flat()', signature: 'arr.flat(depth?)', description: 'Flattens nested arrays up to the given depth. Default depth is 1. Use Infinity to fully flatten any depth.', category: 'Flatten', mutates: false, returns: 'Array (flattened)', example: '[1,[2,[3]]].flat(2)', output: '[1, 2, 3]' },
  { name: 'flat() deep', signature: 'arr.flat(Infinity)', description: 'Fully flattens an array of any nesting depth. Equivalent to recursive flatten. Use sparingly on untrusted data.', category: 'Flatten', mutates: false, returns: 'Array (fully flat)', example: '[1,[2,[3,[4]]]].flat(Infinity)', output: '[1, 2, 3, 4]' },

  // ── Join / Convert ──
  { name: 'join()', signature: 'arr.join(separator?)', description: 'Joins all elements into a string. Default separator is comma. Returns empty string for empty arrays. null/undefined become empty strings.', category: 'Join & Convert', mutates: false, returns: 'string', example: "['a','b','c'].join(' - ')", output: "'a - b - c'" },
  { name: 'toString()', signature: 'arr.toString()', description: 'Returns a comma-separated string. Equivalent to join() with no argument. Nested arrays are flattened first.', category: 'Join & Convert', mutates: false, returns: 'string', example: '[1,2,3].toString()', output: "'1,2,3'" },
  { name: 'toLocaleString()', signature: 'arr.toLocaleString(locales?, options?)', description: 'Returns a locale-aware string. Each element\'s toLocaleString is called. Useful for dates and numbers.', category: 'Join & Convert', mutates: false, returns: 'string', example: '[1234.56].toLocaleString("de-DE")', output: "'1.234,56'" },

  // ── Iteration ──
  { name: 'forEach()', signature: 'arr.forEach(callback, thisArg?)', description: 'Executes a function for each element. Cannot break or continue (use for...of for that). Returns undefined. Not chainable.', category: 'Iteration', mutates: false, returns: 'undefined', example: "let sum=0; [1,2,3].forEach(n => sum+=n); sum", output: '6' },
  { name: 'keys()', signature: 'arr.keys()', description: 'Returns an iterator of array indices (0, 1, 2, ...). Use with for...of or spread. Does not include sparse holes.', category: 'Iteration', mutates: false, returns: 'Array Iterator', example: '[...[10,20,30].keys()]', output: '[0, 1, 2]' },
  { name: 'values()', signature: 'arr.values()', description: 'Returns an iterator of array values. This is the default iterator for arrays — you can use for...of directly on arrays.', category: 'Iteration', mutates: false, returns: 'Array Iterator', example: '[...[10,20,30].values()]', output: '[10, 20, 30]' },
  { name: 'entries()', signature: 'arr.entries()', description: 'Returns an iterator of [index, value] pairs. Powerful with for...of destructuring.', category: 'Iteration', mutates: false, returns: 'Array Iterator', example: '[...[10,20,30].entries()]', output: '[[0,10], [1,20], [2,30]]' },

  // ── Predicate ──
  { name: 'every()', signature: 'arr.every(callback, thisArg?)', description: 'Returns true if ALL elements pass the test. Returns true for empty arrays (vacuous truth). Short-circuits on first failure.', category: 'Predicate', mutates: false, returns: 'boolean', example: '[2,4,6].every(n => n % 2 === 0)', output: 'true' },
];

const CATEGORIES = Array.from(new Set(ARRAY_METHODS.map(m => m.category)));

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Creation': <Plus className="w-4 h-4" />,
  'Access & Search': <Search className="w-4 h-4" />,
  'Add & Remove': <Trash2 className="w-4 h-4" />,
  'Transform': <ArrowRight className="w-4 h-4" />,
  'Reorder': <ListOrdered className="w-4 h-4" />,
  'Subset & Slice': <Scissors className="w-4 h-4" />,
  'Flatten': <Hash className="w-4 h-4" />,
  'Join & Convert': <GitMerge className="w-4 h-4" />,
  'Iteration': <Eye className="w-4 h-4" />,
  'Predicate': <CheckCircle2 className="w-4 h-4" />,
};

const MUTATE_BADGE = 'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider';

export default function JsArrayMethodsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return ARRAY_METHODS.filter((m) => {
      if (activeCategory && m.category !== activeCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.signature.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const toggleCard = useCallback((name: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const totalCount = ARRAY_METHODS.length;
  const filteredCount = filtered.length;

  return (
    <ToolLayout
      title="JavaScript Array Methods"
      description="Interactive reference for 40+ JavaScript array methods — creation, search, transform, reorder, flatten, and more. Search, filter by category, copy code snippets. 100% client-side."
    >
      {/* Search + Filter Bar */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 40+ array methods..."
              className="input-field w-full pl-10 pr-8 text-sm"
              spellCheck={false}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 hidden sm:block" />
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeCategory === null
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1 ${
                  activeCategory === cat
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {CATEGORY_ICONS[cat]}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>
            Showing <span className="text-slate-300 font-semibold">{filteredCount}</span> of{' '}
            <span className="text-slate-300 font-semibold">{totalCount}</span> methods
          </span>
          {(search || activeCategory) && (
            <button
              onClick={() => { setSearch(''); setActiveCategory(null); }}
              className="text-brand-400 hover:text-brand-300 transition-colors ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Methods List */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <Code2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium mb-1">No methods found</p>
          <p className="text-slate-500 text-sm">Try a different search term or clear the category filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((method) => {
            const isExpanded = expandedCards.has(method.name);

            return (
              <div
                key={method.name}
                className="card group hover:border-slate-600/50 transition-all cursor-pointer"
                onClick={() => toggleCard(method.name)}
              >
                {/* Header — always visible */}
                <div className="flex items-start gap-3">
                  {/* Category icon */}
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-surface border border-slate-700/50 flex items-center justify-center text-brand-400">
                    {CATEGORY_ICONS[method.category]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm font-bold text-white font-mono">
                            {method.name}
                          </code>
                          {/* Mutation badge */}
                          <span
                            className={`${MUTATE_BADGE} ${
                              method.mutates
                                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            }`}
                          >
                            {method.mutates ? 'Mutates' : 'Pure'}
                          </span>
                          {/* Category pill */}
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-800/50 border border-slate-700/30 hidden sm:inline">
                            {method.category}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                          {method.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-slate-600 hidden sm:inline font-mono">
                          → {method.returns}
                        </span>
                        <div className={`w-5 h-5 rounded-full border transition-colors flex items-center justify-center flex-shrink-0 ${
                          isExpanded ? 'bg-brand-500/30 border-brand-400 text-brand-300' : 'border-slate-600 text-slate-500'
                        }`}>
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            {isExpanded ? (
                              <path d="M2 6h8" />
                            ) : (
                              <path d="M6 2v8M2 6h8" />
                            )}
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    className="mt-4 pt-4 border-t border-slate-700/50 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Signature */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                          Signature
                        </span>
                        <button
                          onClick={() => handleCopy(method.signature, method.name)}
                          className="text-slate-500 hover:text-brand-400 transition-colors"
                          title="Copy signature"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <code className="block bg-surface rounded-lg border border-slate-700/50 px-3 py-2 text-xs text-brand-300 font-mono break-all">
                        {method.signature}
                      </code>
                    </div>

                    {/* Example — Code + Output */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                          Example
                        </span>
                        <button
                          onClick={() => handleCopy(method.example, `${method.name}-example`)}
                          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                      {/* Code block */}
                      <div className="bg-[#0d1117] rounded-lg border border-slate-700/50 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 border-b border-slate-700/30">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                          </div>
                          <span className="text-[10px] text-slate-500">JavaScript</span>
                        </div>
                        <pre className="px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto">
                          <code>{method.example}</code>
                        </pre>
                      </div>
                      {/* Output */}
                      <div className="mt-2 bg-surface rounded-lg border border-slate-700/50 px-3 py-2 flex items-start gap-2">
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 mt-0.5">
                          →
                        </span>
                        <code className="text-xs text-amber-300 font-mono break-all">
                          {method.output}
                        </code>
                      </div>
                    </div>

                    {/* Returns + mutation info */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Returns:</span>
                      <code className="text-slate-400 font-mono bg-surface rounded px-1.5 py-0.5 border border-slate-700/50">
                        {method.returns}
                      </code>
                      <span className="text-slate-600">|</span>
                      <span className={method.mutates ? 'text-amber-400' : 'text-emerald-400'}>
                        {method.mutates ? '⚠ Mutates original' : '✓ Does not mutate'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-8 p-4 rounded-xl bg-surface border border-slate-700/50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{ARRAY_METHODS.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Methods</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{CATEGORIES.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Categories</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">
              {ARRAY_METHODS.filter(m => !m.mutates).length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Pure Methods</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">
              {ARRAY_METHODS.filter(m => m.mutates).length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Mutating Methods</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
