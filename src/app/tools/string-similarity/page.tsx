'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, ArrowLeftRight, Gauge, Ruler, ListOrdered, AlignLeft, Check, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Algorithms ─────────────────────────────────────────────────────────────

/** Classic Levenshtein distance (insert, delete, substitute) */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Damerau-Levenshtein distance (allows transpositions) */
function damerauLevenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[m][n];
}

/** Longest Common Substring length */
function longestCommonSubstring(a: string, b: string): number {
  const m = a.length, n = b.length;
  let maxLen = 0;
  let prev = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        maxLen = Math.max(maxLen, curr[j]);
      }
    }
    prev = curr;
  }
  return maxLen;
}

/** Longest Common Subsequence length */
function longestCommonSubsequence(a: string, b: string): number {
  const m = a.length, n = b.length;
  let prev = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    prev = curr;
  }
  return prev[n];
}

/** Jaro-Winkler similarity (0–1) */
function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1.0;
  const aLen = a.length, bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(aLen, bLen) / 2) - 1;
  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);
  let matches = 0;

  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(bLen - 1, i + matchDistance);
    for (let j = start; j <= end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions = Math.floor(transpositions / 2);

  const jaro = (matches / aLen + matches / bLen + (matches - transpositions) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, aLen, bLen); i++) {
    if (a[i] === b[i]) prefix++; else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/** Visual character-level diff */
interface DiffChar {
  char: string;
  type: 'same' | 'added' | 'removed' | 'changed';
}

function visualCharDiff(a: string, b: string): { aDiff: DiffChar[], bDiff: DiffChar[] } {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  const aResult: DiffChar[] = [];
  const bResult: DiffChar[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] === b[j - 1]) {
        aResult.unshift({ char: a[i - 1], type: 'same' });
        bResult.unshift({ char: b[j - 1], type: 'same' });
      } else {
        aResult.unshift({ char: a[i - 1], type: 'changed' });
        bResult.unshift({ char: b[j - 1], type: 'changed' });
      }
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      aResult.unshift({ char: a[i - 1], type: 'removed' });
      bResult.unshift({ char: ' ', type: 'removed' });
      i--;
    } else {
      aResult.unshift({ char: ' ', type: 'added' });
      bResult.unshift({ char: b[j - 1], type: 'added' });
      j--;
    }
  }

  return { aDiff: aResult, bDiff: bResult };
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Misspelling', a: 'recieve', b: 'receive' },
  { label: 'Camel vs Snake', a: 'userProfileData', b: 'user_profile_data' },
  { label: 'Extra word', a: 'the quick brown fox', b: 'quick brown fox' },
  { label: 'JSON keys', a: '{"name":"Alice","age":30}', b: '{"name":"Bob","age":30}' },
  { label: 'URL diff', a: 'https://example.com/users?id=123', b: 'https://example.com/articles?id=123' },
  { label: 'Typos', a: 'Hello wrold!', b: 'Hello world!' },
  { label: 'Empty one', a: 'Hello world', b: '' },
  { label: 'Case swap', a: 'HELLO WORLD', b: 'hello world' },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function StringSimilarityPage() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');

  const metrics = useMemo(() => {
    if (!left && !right) {
      return null;
    }

    const levDist = levenshtein(left, right);
    const damLevDist = damerauLevenshtein(left, right);
    const maxLen = Math.max(left.length, right.length);
    const normalizedSim = maxLen > 0 ? Math.round((1 - levDist / maxLen) * 10000) / 100 : 100;
    const lcsLen = longestCommonSubstring(left, right);
    const lcsLenPercent = maxLen > 0 ? Math.round((lcsLen / maxLen) * 10000) / 100 : 0;
    const lcsSeqLen = longestCommonSubsequence(left, right);
    const lcsSeqPercent = maxLen > 0 ? Math.round((lcsSeqLen / maxLen) * 10000) / 100 : 0;
    const jw = jaroWinkler(left, right);
    const jwPercent = Math.round(jw * 10000) / 100;
    const exact = left === right;

    const { aDiff, bDiff } = left && right ? visualCharDiff(left, right) : { aDiff: [], bDiff: [] };

    return {
      levDist, damLevDist, normalizedSim, lcsLen, lcsLenPercent,
      lcsSeqLen, lcsSeqPercent, jwPercent, exact, aDiff, bDiff, maxLen,
    };
  }, [left, right]);

  const handleCopy = useCallback((text: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, []);

  const handleClear = useCallback((side: 'left' | 'right') => {
    if (side === 'left') setLeft('');
    else setRight('');
  }, []);

  const handleSwap = useCallback(() => {
    setLeft(right);
    setRight(left);
  }, [left, right]);

  const handlePreset = useCallback((preset: typeof PRESETS[number]) => {
    setLeft(preset.a);
    setRight(preset.b);
  }, []);

  const getSimColor = (pct: number) => {
    if (pct >= 90) return 'text-green-400';
    if (pct >= 60) return 'text-yellow-400';
    if (pct >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <ToolLayout
      title="String Similarity Checker"
      description="Compare two strings with Levenshtein, Damerau-Levenshtein, Jaro-Winkler, and visual character-level diff — perfect for fuzzy matching, spell checking, and dedup."
      controls={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <button
            onClick={handleSwap}
            disabled={!left && !right}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap
          </button>
          <span className="text-slate-500 text-sm ml-auto">Presets:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-brand-400 text-xs transition-colors border border-slate-700"
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-400">String A</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">{left.length} chars</span>
              <button
                onClick={() => handleCopy(left)}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-brand-400 transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleClear('left')}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                title="Clear"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            placeholder="Paste first string here..."
            className="w-full h-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-400">String B</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">{right.length} chars</span>
              <button
                onClick={() => handleCopy(right)}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-brand-400 transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleClear('right')}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                title="Clear"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            placeholder="Paste second string here..."
            className="w-full h-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
          />
        </div>
      </div>

      {/* Results */}
      {metrics ? (
        <>
          {metrics.exact ? (
            <div className="mb-6 p-4 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center gap-3">
              <Check className="w-5 h-5 text-brand-400" />
              <div>
                <p className="text-brand-300 font-semibold">Exact Match</p>
                <p className="text-sm text-slate-400">The two strings are identical.</p>
              </div>
            </div>
          ) : null}

          {/* Similarity Score */}
          <div className="mb-6 p-4 rounded-lg border flex items-center justify-between flex-wrap gap-4" style={{ borderColor: 'var(--brand-border, #4f46e5)' }}>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Similarity Score</h3>
              <p className="text-sm text-slate-400">Normalized Levenshtein similarity</p>
            </div>
            <div className={`text-3xl font-bold ${getSimColor(metrics.normalizedSim)}`}>
              {metrics.normalizedSim}%
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Ruler className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-xs text-slate-500">Levenshtein Dist.</span>
              </div>
              <p className="text-xl font-bold text-slate-100">{metrics.levDist}</p>
              <p className="text-xs text-slate-500">edits needed</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs text-slate-500">Damerau-Lev.</span>
              </div>
              <p className="text-xl font-bold text-slate-100">{metrics.damLevDist}</p>
              <p className="text-xs text-slate-500">incl. transpositions</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Gauge className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs text-slate-500">Jaro-Winkler</span>
              </div>
              <p className="text-xl font-bold text-slate-100">{metrics.jwPercent}%</p>
              <p className="text-xs text-slate-500">prefix-weighted</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-1">
                <AlignLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-slate-500">L.C. Substring</span>
              </div>
              <p className="text-xl font-bold text-slate-100">{metrics.lcsLen}</p>
              <p className="text-xs text-slate-500">{metrics.lcsLenPercent}% of max len</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-1">
                <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-500">L.C. Subsequence</span>
              </div>
              <p className="text-xl font-bold text-slate-100">{metrics.lcsSeqLen}</p>
              <p className="text-xs text-slate-500">{metrics.lcsSeqPercent}% of max len</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-xs text-slate-500">Max Length</span>
              </div>
              <p className="text-xl font-bold text-slate-100">{metrics.maxLen}</p>
              <p className="text-xs text-slate-500">characters</p>
            </div>
          </div>

          {/* Visual Character Diff */}
          {left && right && metrics.aDiff.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                Character-Level Diff
                <span className="text-xs text-slate-500 font-normal ml-2">
                  <span className="text-green-400">■</span> same
                  <span className="text-red-400 ml-2">■</span> changed
                  <span className="text-orange-400 ml-2">■</span> added
                  <span className="text-blue-400 ml-2">■</span> removed
                </span>
              </h3>

              <div className="mb-2">
                <p className="text-xs text-slate-500 mb-1 font-medium">String A</p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm leading-relaxed break-all">
                  {metrics.aDiff.map((ch, i) => (
                    <span
                      key={i}
                      className={
                        ch.type === 'same'
                          ? 'text-green-300 bg-green-500/10'
                          : ch.type === 'changed'
                          ? 'text-red-300 bg-red-500/10 underline decoration-red-500/50'
                          : ch.type === 'removed'
                          ? 'text-blue-300 bg-blue-500/10'
                          : 'opacity-30'
                      }
                    >
                      {ch.char === ' ' ? '\u00A0' : ch.char}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">String B</p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm leading-relaxed break-all">
                  {metrics.bDiff.map((ch, i) => (
                    <span
                      key={i}
                      className={
                        ch.type === 'same'
                          ? 'text-green-300 bg-green-500/10'
                          : ch.type === 'changed'
                          ? 'text-red-300 bg-red-500/10 underline decoration-red-500/50'
                          : ch.type === 'added'
                          ? 'text-orange-300 bg-orange-500/10'
                          : 'opacity-30'
                      }
                    >
                      {ch.char === ' ' ? '\u00A0' : ch.char}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">About These Metrics</h4>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li><span className="text-brand-400 font-medium">Levenshtein Distance:</span> Minimum number of single-character edits (insert, delete, substitute) to transform A to B.</li>
              <li><span className="text-cyan-400 font-medium">Damerau-Levenshtein:</span> Like Levenshtein, but also counts adjacent character transpositions as a single edit.</li>
              <li><span className="text-purple-400 font-medium">Jaro-Winkler:</span> String similarity metric (0-1) weighted toward matching prefixes. Great for names and short strings.</li>
              <li><span className="text-emerald-400 font-medium">L.C. Substring:</span> Length of the longest contiguous sequence of characters present in both strings.</li>
              <li><span className="text-amber-400 font-medium">L.C. Subsequence:</span> Length of the longest sequence of characters that appear in order in both strings (not necessarily contiguous).</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Enter two strings to compare</p>
          <p className="text-slate-500 text-sm mt-1">Or pick a preset above to get started</p>
        </div>
      )}
    </ToolLayout>
  );
}
