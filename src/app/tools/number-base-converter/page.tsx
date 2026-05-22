'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, RefreshCw, Hash, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Base = 2 | 8 | 10 | 16;

interface BaseConfig {
  label: string;
  base: Base;
  prefix: string;
  placeholder: string;
  chars: RegExp;
  groupSize: number;
}

const BASES: Record<string, BaseConfig> = {
  binary:     { label: 'Binary',      base: 2,  prefix: '0b',  placeholder: '1111 1111', chars: /^[01\s]*$/,    groupSize: 4 },
  octal:      { label: 'Octal',       base: 8,  prefix: '0o',  placeholder: '377',       chars: /^[0-7\s]*$/,   groupSize: 3 },
  decimal:    { label: 'Decimal',     base: 10, prefix: '',     placeholder: '255',       chars: /^[0-9\s]*$/,   groupSize: 3 },
  hex:        { label: 'Hexadecimal', base: 16, prefix: '0x',  placeholder: 'FF',        chars: /^[0-9a-fA-F\s]*$/, groupSize: 2 },
};

const COMMON_VALUES = [
  { label: 'Null byte',         decimal: 0 },
  { label: 'Tab',               decimal: 9 },
  { label: 'Newline (LF)',      decimal: 10 },
  { label: 'Carriage Return',   decimal: 13 },
  { label: 'Space',             decimal: 32 },
  { label: 'ASCII "0"',         decimal: 48 },
  { label: 'ASCII "A"',         decimal: 65 },
  { label: 'ASCII "a"',         decimal: 97 },
  { label: 'DEL',               decimal: 127 },
  { label: 'Max uint8',         decimal: 255 },
  { label: 'Max uint16',        decimal: 65535 },
  { label: 'Max int32',         decimal: 2147483647 },
  { label: 'IPv4 max',          decimal: 4294967295 },
  { label: 'Max safe int (JS)', decimal: 9007199254740991 },
];

// ── Formatting / Parsing ────────────────────────────────────────────────────

function parseInput(raw: string, baseKey: string): bigint | null {
  const config = BASES[baseKey];
  const cleaned = raw.replace(/\s/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  // Handle negative for decimal only
  if (baseKey === 'decimal' && cleaned.startsWith('-')) {
    try {
      return BigInt(cleaned);
    } catch { return null; }
  }
  if (!config.chars.test(cleaned)) return null;
  try {
    return BigInt(`0${raw.includes('0x') ? '' : config.prefix}${cleaned}`);
  } catch {
    return null;
  }
}

function formatValue(value: bigint, baseKey: string): string {
  const config = BASES[baseKey];
  const base = config.base;

  if (baseKey === 'decimal') {
    const str = value.toString();
    // Group by 3 from right
    if (config.groupSize > 0) {
      return str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    return str;
  }

  let str: string;
  if (base === 16) {
    str = value.toString(16).toUpperCase();
  } else {
    str = value.toString(base);
  }

  // Pad binary to multiples of groupSize
  if (base === 2 && str.length % config.groupSize !== 0) {
    str = str.padStart(Math.ceil(str.length / config.groupSize) * config.groupSize, '0');
  }

  // Group digits
  if (config.groupSize > 0) {
    const parts: string[] = [];
    for (let i = str.length; i > 0; i -= config.groupSize) {
      parts.unshift(str.substring(Math.max(0, i - config.groupSize), i));
    }
    str = parts.join(' ');
  }

  return str;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function NumberBaseConverterPage() {
  const [activeBase, setActiveBase] = useState<string>('decimal');
  const [rawValues, setRawValues] = useState<Record<string, string>>({
    binary: '',
    octal: '',
    decimal: '255',
    hex: '',
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  // Parse active base's raw value to get the current number
  const currentValue = useMemo(() => {
    return parseInput(rawValues[activeBase], activeBase);
  }, [rawValues, activeBase]);

  // Compute all formatted values
  const formattedValues = useMemo(() => {
    if (currentValue === null) {
      const empty: Record<string, string> = {};
      for (const key of Object.keys(BASES)) empty[key] = '';
      return empty;
    }

    const result: Record<string, string> = {};
    for (const key of Object.keys(BASES)) {
      result[key] = formatValue(currentValue, key);
    }
    return result;
  }, [currentValue]);

  // Stats
  const stats = useMemo(() => {
    if (currentValue === null) return null;
    const bits = currentValue.toString(2).length;
    const bytes = Math.ceil(bits / 8);
    const nibbles = Math.ceil(bits / 4);
    let ascii = '';
    try {
      const val = Number(currentValue);
      if (val >= 0 && val <= 0x10FFFF) {
        ascii = String.fromCodePoint(val);
        if (val < 32 || (val >= 127 && val <= 159)) {
          ascii = '[control char]';
        }
      } else {
        ascii = '[out of range]';
      }
    } catch {
      ascii = '[out of range]';
    }
    return { bits, bytes, nibbles, ascii };
  }, [currentValue]);

  const handleInputChange = useCallback((baseKey: string, value: string) => {
    setActiveBase(baseKey);
    setRawValues((prev) => {
      const next = { ...prev };
      next[baseKey] = value;
      return next;
    });
  }, []);

  // When active base changes, compute raw for others
  const syncValues = useCallback(() => {
    if (currentValue === null) return;
    const updated: Record<string, string> = {};
    for (const key of Object.keys(BASES)) {
      updated[key] = formatValue(currentValue, key);
    }
    setRawValues(updated);
  }, [currentValue]);

  const handleCopy = useCallback(async (key: string) => {
    const raw = formattedValues[key].replace(/\s/g, '');
    await navigator.clipboard.writeText(raw);
    setCopiedKey(key);
    toast.success(`${BASES[key].label} copied`);
    setTimeout(() => setCopiedKey(null), 2000);
  }, [formattedValues]);

  const handleClear = useCallback(() => {
    setRawValues({ binary: '', octal: '', decimal: '', hex: '' });
    setActiveBase('decimal');
  }, []);

  const handleCommonValue = useCallback((decimalValue: number | bigint) => {
    const val = typeof decimalValue === 'number' ? BigInt(decimalValue) : decimalValue;
    const updated: Record<string, string> = {};
    for (const key of Object.keys(BASES)) {
      updated[key] = formatValue(val, key);
    }
    setRawValues(updated);
    setActiveBase('decimal');
  }, []);

  return (
    <ToolLayout
      title="Number Base Converter"
      description="Convert between binary, octal, decimal, and hexadecimal in real-time. Essential for systems programming, embedded development, and debugging."
    >
      {/* Main converter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(BASES).map(([key, config]) => (
          <div
            key={key}
            className={`p-5 rounded-xl border-2 transition-all ${
              activeBase === key
                ? 'border-brand-500 bg-brand-500/5 shadow-lg shadow-brand-500/10'
                : 'border-slate-700/50 bg-surface-light hover:border-slate-600/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Hash className="w-3.5 h-3.5" />
                {config.label}
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(key)}
                  className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-brand-400 transition-colors"
                  title={`Copy ${config.label}`}
                >
                  {copiedKey === key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config.prefix && (
                <span className="text-sm font-mono text-slate-500 select-none shrink-0">
                  {config.prefix}
                </span>
              )}
              <input
                type="text"
                value={rawValues[key]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                onFocus={() => setActiveBase(key)}
                onBlur={syncValues}
                placeholder={config.placeholder}
                className="w-full bg-transparent font-mono text-2xl font-bold text-white placeholder-slate-600 outline-none"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            {activeBase === key && formattedValues[key] && (
              <p className="mt-1 text-xs text-slate-500 font-mono">
                Raw: {formattedValues[key].replace(/\s/g, '')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Clear
        </button>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={signed}
            onChange={(e) => setSigned(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-brand-500 focus:ring-brand-500"
          />
          Signed (two&apos;s complement)
        </label>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Bits', value: stats.bits },
            { label: 'Bytes', value: stats.bytes },
            { label: 'Nibbles', value: stats.nibbles },
            { label: 'ASCII / Unicode', value: stats.ascii },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-lg bg-surface-light border border-slate-700/50 text-center"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-sm font-mono font-semibold text-white break-all">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Common values quick reference */}
      <div className="rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300">Common Reference Values</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500">
                <th className="text-left px-5 py-2 font-medium">Description</th>
                <th className="text-right px-5 py-2 font-medium">Decimal</th>
                <th className="text-right px-5 py-2 font-medium">Hex</th>
                <th className="text-right px-5 py-2 font-medium">Binary</th>
                <th className="text-right px-5 py-2 font-medium">Octal</th>
              </tr>
            </thead>
            <tbody>
              {COMMON_VALUES.map((item) => {
                const val = BigInt(item.decimal);
                return (
                  <tr
                    key={item.decimal}
                    onClick={() => handleCommonValue(item.decimal)}
                    className="border-b border-slate-700/30 hover:bg-brand-500/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-2.5 text-slate-300 group-hover:text-white">
                      {item.label}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-400">
                      {item.decimal.toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-brand-400">
                      {val.toString(16).toUpperCase()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-400 text-xs">
                      {val.toString(2)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-400">
                      {val.toString(8)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ToolLayout>
  );
}
