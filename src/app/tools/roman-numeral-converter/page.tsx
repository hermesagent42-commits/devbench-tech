'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, ArrowLeftRight, Hash, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Conversion utilities ────────────────────────────────────────────────────

const ROMAN_MAP: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'],
  [1, 'I'],
];

// Extended map with vinculum (overbar) for large numbers
const VINCULUM_MAP: [number, string][] = [
  [1_000_000, 'M̅'],
  [900_000, 'C̅M̅'],
  [500_000, 'D̅'],
  [400_000, 'C̅D̅'],
  [100_000, 'C̅'],
  [90_000, 'X̅C̅'],
  [50_000, 'L̅'],
  [40_000, 'X̅L̅'],
  [10_000, 'X̅'],
  [9_000, 'I̅X̅'],
  [5_000, 'V̅'],
  [4_000, 'I̅V̅'],
];

function arabicToRoman(num: number, extended: boolean): string {
  if (!Number.isInteger(num) || num <= 0) return '';
  if (!extended && num >= 4000) return '';

  let result = '';
  let remaining = num;

  if (extended && remaining >= 4000) {
    for (const [value, symbol] of VINCULUM_MAP) {
      while (remaining >= value) {
        result += symbol;
        remaining -= value;
      }
    }
  }

  for (const [value, symbol] of ROMAN_MAP) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }

  return result;
}

function romanToArabic(roman: string): number | null {
  const normalized = roman.trim().toUpperCase();
  if (!normalized) return null;

  // Validate characters
  const validChars = /^[IVXLCDM̅]+$/;
  if (!validChars.test(normalized)) return null;

  // Parse with proper subtractive handling
  const values: Record<string, number> = {
    I: 1, V: 5, X: 10, L: 50,
    C: 100, D: 500, M: 1000,
    V̅: 5000, X̅: 10000, L̅: 50000,
    C̅: 100000, D̅: 500000, M̅: 1000000,
  };

  // Normalize combining overbar characters
  const clean = normalized
    .replace(/I\u0305/g, 'I̅')
    .replace(/V\u0305/g, 'V̅')
    .replace(/X\u0305/g, 'X̅')
    .replace(/L\u0305/g, 'L̅')
    .replace(/C\u0305/g, 'C̅')
    .replace(/D\u0305/g, 'D̅')
    .replace(/M\u0305/g, 'M̅');

  let total = 0;
  let prev = 0;

  // Walk right to left
  for (let i = clean.length - 1; i >= 0; i--) {
    const char = clean[i];
    // Handle overbar characters (they're two Unicode code points)
    let curr: number;
    if (i > 0 && clean[i] === '\u0305') {
      const combined = clean[i - 1] + '\u0305';
      curr = values[combined];
      i--; // skip the base character
    } else {
      curr = values[char];
    }
    if (curr === undefined) return null;
    if (curr < prev) {
      total -= curr;
    } else {
      total += curr;
    }
    prev = curr;
  }

  return total;
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '4 (IV)', arabic: 4 },
  { label: '9 (IX)', arabic: 9 },
  { label: '42 (XLII)', arabic: 42 },
  { label: '99 (XCIX)', arabic: 99 },
  { label: '144 (CXLIV)', arabic: 144 },
  { label: '500 (D)', arabic: 500 },
  { label: '1999 (MCMXCIX)', arabic: 1999 },
  { label: '2024 (MMXXIV)', arabic: 2024 },
  { label: '2026 (MMXXVI)', arabic: 2026 },
  { label: '3888 (MMMDCCCLXXXVIII)', arabic: 3888 },
];

const EXTENDED_PRESETS = [
  { label: '4 (IV)', arabic: 4 },
  { label: '49 (XLIX)', arabic: 49 },
  { label: '144 (CXLIV)', arabic: 144 },
  { label: '1776 (MDCCLXXVI)', arabic: 1776 },
  { label: '2026 (MMXXVI)', arabic: 2026 },
  { label: '3999 (MMMCMXCIX)', arabic: 3999 },
  { label: '4000 (I̅V̅)', arabic: 4000 },
  { label: '10,000 (X̅)', arabic: 10000 },
  { label: '50,000 (L̅)', arabic: 50000 },
  { label: '100,000 (C̅)', arabic: 100000 },
];

type Direction = 'arabic-to-roman' | 'roman-to-arabic';

// ── Component ───────────────────────────────────────────────────────────────

export default function RomanNumeralConverter() {
  const [direction, setDirection] = useState<Direction>('arabic-to-roman');
  const [arabicInput, setArabicInput] = useState('');
  const [romanInput, setRomanInput] = useState('');
  const [extended, setExtended] = useState(false);

  const result = useMemo(() => {
    if (direction === 'arabic-to-roman') {
      const num = parseInt(arabicInput, 10);
      if (isNaN(num)) return { value: '', error: '' };
      if (num <= 0) return { value: '', error: 'Enter a positive integer' };
      if (!extended && num >= 4000) return { value: '', error: 'Standard Roman numerals go up to 3,999. Enable extended mode for larger numbers.' };
      if (extended && num >= 4_000_000) return { value: '', error: 'Extended mode supports up to 3,999,999' };
      if (!Number.isInteger(num)) return { value: '', error: 'Enter a whole number' };
      return { value: arabicToRoman(num, extended), error: '' };
    } else {
      if (!romanInput.trim()) return { value: '', error: '' };
      const num = romanToArabic(romanInput);
      if (num === null) return { value: '', error: 'Invalid Roman numeral. Use I, V, X, L, C, D, M (and overbar for thousands).' };
      if (num >= 4_000_000) return { value: '', error: 'Result is too large' };
      return { value: num.toLocaleString(), error: '' };
    }
  }, [direction, arabicInput, romanInput, extended]);

  const presets = extended ? EXTENDED_PRESETS : PRESETS;

  const handlePreset = useCallback((preset: typeof presets[0]) => {
    if (direction === 'arabic-to-roman') {
      setArabicInput(String(preset.arabic));
    } else {
      setRomanInput(arabicToRoman(preset.arabic, extended));
    }
  }, [direction, extended]);

  const handleSwap = useCallback(() => {
    setDirection((d) => (d === 'arabic-to-roman' ? 'roman-to-arabic' : 'arabic-to-roman'));
    setArabicInput('');
    setRomanInput('');
  }, []);

  const handleClear = useCallback(() => {
    setArabicInput('');
    setRomanInput('');
  }, []);

  const handleCopy = useCallback(() => {
    if (!result.value || result.error) return;
    navigator.clipboard.writeText(result.value).then(() => {
      toast.success('Copied to clipboard');
    });
  }, [result]);

  return (
    <ToolLayout
      title="Roman Numeral Converter"
      description="Convert between Arabic numbers and Roman numerals in real-time. Supports standard (1–3,999) and extended format with vinculum for large numbers."
    >
      <div className="space-y-6">
        {/* Direction toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSwap}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              title="Swap direction"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Swap
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={extended}
              onChange={(e) => setExtended(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            Extended mode (overbar / vinculum)
            <span title="Supports numbers up to 3,999,999 using vinculum notation — an overbar multiplies by 1,000">
              <Info className="w-4 h-4 text-slate-500" />
            </span>
          </label>
        </div>

        <div className="flex justify-center text-sm font-semibold text-blue-400 tracking-wide">
          {direction === 'arabic-to-roman' ? 'Arabic → Roman' : 'Roman → Arabic'}
        </div>

        {/* Input */}
        {direction === 'arabic-to-roman' ? (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Arabic Number
            </label>
            <input
              type="number"
              value={arabicInput}
              onChange={(e) => setArabicInput(e.target.value)}
              placeholder="e.g. 2026"
              min={1}
              max={extended ? 3_999_999 : 3_999}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-lg font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Range: {extended ? '1–3,999,999' : '1–3,999'}
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Roman Numeral
            </label>
            <input
              type="text"
              value={romanInput}
              onChange={(e) => setRomanInput(e.target.value)}
              placeholder="e.g. MMXXVI"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-lg font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase tracking-widest"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Valid characters: I, V, X, L, C, D, M (and overbar for thousands)
            </p>
          </div>
        )}

        {/* Result */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {direction === 'arabic-to-roman' ? 'Roman Numeral' : 'Arabic Number'}
          </label>
          <div className={`w-full min-h-[52px] px-4 py-3 rounded-lg border font-mono text-lg transition-all flex items-center justify-between ${
            result.error
              ? 'bg-red-900/30 border-red-700 text-red-400'
              : result.value
                ? 'bg-slate-800 border-slate-700 text-green-400'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-600'
          }`}>
            <span className="tracking-widest">
              {result.error || result.value || (direction === 'arabic-to-roman' ? 'MMXXVI' : '2,026')}
              <span className="text-slate-600"> — {result.error ? 'error' : result.value ? '' : 'waiting for input'}</span>
            </span>
            {result.value && !result.error && (
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Copy result"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Presets */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Presets</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.arabic}
                onClick={() => handlePreset(preset)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference table */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Roman Numeral Reference
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {ROMAN_MAP.filter(([v]) => v >= 1 && v <= 1000).sort((a, b) => b[0] - a[0]).map(([value, symbol]) => (
              <div key={value} className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-center">
                <span className="text-blue-400 font-bold font-mono">{symbol}</span>
                <span className="text-slate-500 text-xs ml-1.5">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500 space-y-1">
            <p>• <strong>Subtractive notation:</strong> IV = 4, IX = 9, XL = 40, XC = 90, CD = 400, CM = 900</p>
            <p>• <strong>No more than 3 identical symbols in a row:</strong> 4 is IV, not IIII</p>
            <p>• <strong>Extended mode:</strong> An overbar (vinculum) multiplies by 1,000 — V̅ = 5,000, X̅ = 10,000</p>
            <p>• The Romans didn&apos;t have a symbol for zero — it was <em>nulla</em> (&quot;none&quot;)</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
