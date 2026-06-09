'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, ArrowRightLeft, HardDrive, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Unit = {
  name: string;
  label: string;
  bytes: number;
  system: 'SI' | 'IEC';
};

const UNITS: Unit[] = [
  { name: 'bits', label: 'bits (b)', bytes: 1 / 8, system: 'SI' },
  { name: 'bytes', label: 'Bytes (B)', bytes: 1, system: 'SI' },
  { name: 'KB', label: 'Kilobytes (KB)', bytes: 1_000, system: 'SI' },
  { name: 'MB', label: 'Megabytes (MB)', bytes: 1_000_000, system: 'SI' },
  { name: 'GB', label: 'Gigabytes (GB)', bytes: 1_000_000_000, system: 'SI' },
  { name: 'TB', label: 'Terabytes (TB)', bytes: 1_000_000_000_000, system: 'SI' },
  { name: 'PB', label: 'Petabytes (PB)', bytes: 1_000_000_000_000_000, system: 'SI' },
  { name: 'KiB', label: 'Kibibytes (KiB)', bytes: 1024, system: 'IEC' },
  { name: 'MiB', label: 'Mebibytes (MiB)', bytes: 1024 ** 2, system: 'IEC' },
  { name: 'GiB', label: 'Gibibytes (GiB)', bytes: 1024 ** 3, system: 'IEC' },
  { name: 'TiB', label: 'Tebibytes (TiB)', bytes: 1024 ** 4, system: 'IEC' },
  { name: 'PiB', label: 'Pebibytes (PiB)', bytes: 1024 ** 5, system: 'IEC' },
];

const PRESETS = [
  { label: '1 KB', value: '1000', unit: 'KB' },
  { label: '1 KiB', value: '1024', unit: 'KiB' },
  { label: '1 MB', value: '1000000', unit: 'MB' },
  { label: '1 MiB', value: '1048576', unit: 'MiB' },
  { label: '1 GB', value: '1000000000', unit: 'GB' },
  { label: '1 GiB', value: '1073741824', unit: 'GiB' },
  { label: '4 GiB (Max 32-bit)', value: '4294967296', unit: 'GiB' },
  { label: '16 GiB (RAM)', value: '17179869184', unit: 'GiB' },
];

// ── Formatters ─────────────────────────────────────────────────────────────

function formatBytes(bytes: number, unit: Unit): string {
  const value = bytes / unit.bytes;
  if (value === 0) return '0';
  if (Math.abs(value) < 0.000001) return value.toExponential(4);
  if (Math.abs(value) < 1) return value.toFixed(6).replace(/\.?0+$/, '');
  if (Math.abs(value) < 1000) return value.toFixed(4).replace(/\.?0+$/, '');
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatBits(bytes: number): string {
  const bits = bytes * 8;
  return bits.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DataSizeConverterPage() {
  const [inputValue, setInputValue] = useState('1000000');
  const [inputUnit, setInputUnit] = useState('MB');
  const [displayMode, setDisplayMode] = useState<'all' | 'si' | 'iec'>('all');

  const inputBytes = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val < 0) return 0;
    const unit = UNITS.find(u => u.name === inputUnit);
    return unit ? val * unit.bytes : 0;
  }, [inputValue, inputUnit]);

  const results = useMemo(() => {
    const all = UNITS.map(unit => ({
      unit,
      value: formatBytes(inputBytes, unit),
      rawValue: inputBytes / unit.bytes,
    }));

    let filtered = all;
    if (displayMode === 'si') filtered = all.filter(r => r.unit.system === 'SI');
    if (displayMode === 'iec') filtered = all.filter(r => r.unit.system === 'IEC');

    return filtered;
  }, [inputBytes, displayMode]);

  const handlePreset = useCallback((preset: typeof PRESETS[0]) => {
    setInputValue(preset.value);
    setInputUnit(preset.unit);
  }, []);

  const copyAll = useCallback(() => {
    const text = results
      .map(r => `${r.value} ${r.unit.label.split(' (')[0]}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('All conversions copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [results]);

  const copyValue = useCallback((value: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy'),
    );
  }, []);

  const swapToBytes = useCallback(() => {
    setInputUnit('bytes');
    setInputValue(inputBytes.toString());
  }, [inputBytes]);

  const reset = useCallback(() => {
    setInputValue('1000000');
    setInputUnit('MB');
    setDisplayMode('all');
  }, []);

  return (
    <ToolLayout
      title="Data Size Converter"
      description="Convert between bits, bytes, KB, MB, GB, TB, KiB, MiB, GiB, TiB — both SI (decimal) and IEC (binary) units. Understand the difference between megabytes and mebibytes."
    >
      {/* Input */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Value
            </label>
            <input
              type="number"
              min="0"
              value={inputValue}
              onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setInputValue(v); }}
              className="w-full bg-surface-light border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              placeholder="Enter value..."
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Unit
            </label>
            <select
              value={inputUnit}
              onChange={e => setInputUnit(e.target.value)}
              className="w-full bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              {UNITS.map(u => (
                <option key={u.name} value={u.name}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              inputValue === p.value && inputUnit === p.unit
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Display mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden">
          {(['all', 'si', 'iec'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-slate-700/50 last:border-r-0 ${
                displayMode === mode ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'all' ? 'All Units' : mode === 'si' ? 'SI (Decimal)' : 'IEC (Binary)'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={swapToBytes}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-surface-light border border-slate-700/50 hover:text-white hover:border-slate-600 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            To Bytes
          </button>
          <button
            onClick={copyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-surface-light border border-slate-700/50 hover:text-white hover:border-slate-600 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy All
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-surface-light border border-slate-700/50 hover:text-white hover:border-slate-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {results.map(r => {
          const isInput = r.unit.name === inputUnit;
          const systemColor = r.unit.system === 'SI' ? 'text-emerald-400' : 'text-purple-400';
          return (
            <button
              key={r.unit.name}
              onClick={() => copyValue(r.value)}
              className={`relative card cursor-pointer hover:border-brand-500/30 transition-all group ${
                isInput ? 'ring-1 ring-brand-500/40' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-semibold uppercase ${systemColor}`}>
                  {r.unit.system}
                </span>
                {isInput && (
                  <span className="text-[10px] font-medium text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                    INPUT
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-white font-mono tracking-tight truncate" title={r.value}>
                {r.value}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {r.unit.label}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-brand-400" />
          SI vs IEC — Know the difference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400 leading-relaxed">
          <div>
            <p className="flex items-center gap-1.5 mb-2">
              <span className="text-emerald-400 font-semibold">SI (Decimal)</span>
              <span className="text-xs text-slate-500">— HDD/SDD marketing</span>
            </p>
            <ul className="space-y-1 text-xs font-mono">
              <li>1 KB = 1,000 bytes</li>
              <li>1 MB = 1,000,000 bytes</li>
              <li>1 GB = 1,000,000,000 bytes</li>
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-1.5 mb-2">
              <span className="text-purple-400 font-semibold">IEC (Binary)</span>
              <span className="text-xs text-slate-500">— RAM, file systems</span>
            </p>
            <ul className="space-y-1 text-xs font-mono">
              <li>1 KiB = 1,024 bytes</li>
              <li>1 MiB = 1,048,576 bytes</li>
              <li>1 GiB = 1,073,741,824 bytes</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            <strong className="text-slate-300">Tip:</strong> Hard drive manufacturers use SI (1 TB = 1 trillion bytes), but your OS reports in IEC. 
            That&apos;s why a &quot;1 TB&quot; drive shows ~931 GiB — it&apos;s {((1_000_000_000_000 / 1024**3)).toFixed(0)} GiB.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
