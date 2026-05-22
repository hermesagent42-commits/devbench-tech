'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowLeftRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Unit {
  symbol: string;
  label: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
  formatInput?: (v: string) => string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  units: Unit[];
}

// ── Unit definitions ───────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: 'Length',
    icon: '📏',
    units: [
      { symbol: 'm', label: 'Meters', toBase: v => v, fromBase: v => v },
      { symbol: 'km', label: 'Kilometers', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { symbol: 'cm', label: 'Centimeters', toBase: v => v / 100, fromBase: v => v * 100 },
      { symbol: 'mm', label: 'Millimeters', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { symbol: 'mi', label: 'Miles', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
      { symbol: 'yd', label: 'Yards', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
      { symbol: 'ft', label: 'Feet', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      { symbol: 'in', label: 'Inches', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      { symbol: 'nmi', label: 'Nautical Miles', toBase: v => v * 1852, fromBase: v => v / 1852 },
    ],
  },
  {
    id: 'area',
    label: 'Area',
    icon: '📐',
    units: [
      { symbol: 'm²', label: 'Square Meters', toBase: v => v, fromBase: v => v },
      { symbol: 'km²', label: 'Square Kilometers', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
      { symbol: 'cm²', label: 'Square Centimeters', toBase: v => v / 10000, fromBase: v => v * 10000 },
      { symbol: 'ha', label: 'Hectares', toBase: v => v * 10000, fromBase: v => v / 10000 },
      { symbol: 'acre', label: 'Acres', toBase: v => v * 4046.8564224, fromBase: v => v / 4046.8564224 },
      { symbol: 'ft²', label: 'Square Feet', toBase: v => v * 0.09290304, fromBase: v => v / 0.09290304 },
      { symbol: 'in²', label: 'Square Inches', toBase: v => v * 0.00064516, fromBase: v => v / 0.00064516 },
      { symbol: 'mi²', label: 'Square Miles', toBase: v => v * 2589988.110336, fromBase: v => v / 2589988.110336 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    icon: '🧪',
    units: [
      { symbol: 'L', label: 'Liters', toBase: v => v, fromBase: v => v },
      { symbol: 'mL', label: 'Milliliters', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { symbol: 'm³', label: 'Cubic Meters', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { symbol: 'gal (US)', label: 'Gallons (US)', toBase: v => v * 3.785411784, fromBase: v => v / 3.785411784 },
      { symbol: 'qt (US)', label: 'Quarts (US)', toBase: v => v * 0.946352946, fromBase: v => v / 0.946352946 },
      { symbol: 'pt (US)', label: 'Pints (US)', toBase: v => v * 0.473176473, fromBase: v => v / 0.473176473 },
      { symbol: 'cup (US)', label: 'Cups (US)', toBase: v => v * 0.2365882365, fromBase: v => v / 0.2365882365 },
      { symbol: 'fl oz (US)', label: 'Fluid Ounces (US)', toBase: v => v * 0.0295735295625, fromBase: v => v / 0.0295735295625 },
      { symbol: 'tbsp (US)', label: 'Tablespoons (US)', toBase: v => v * 0.01478676478125, fromBase: v => v / 0.01478676478125 },
      { symbol: 'tsp (US)', label: 'Teaspoons (US)', toBase: v => v * 0.00492892159375, fromBase: v => v / 0.00492892159375 },
    ],
  },
  {
    id: 'mass',
    label: 'Mass',
    icon: '⚖️',
    units: [
      { symbol: 'kg', label: 'Kilograms', toBase: v => v, fromBase: v => v },
      { symbol: 'g', label: 'Grams', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { symbol: 'mg', label: 'Milligrams', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
      { symbol: 't', label: 'Metric Tonnes', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { symbol: 'lb', label: 'Pounds', toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
      { symbol: 'oz', label: 'Ounces', toBase: v => v * 0.028349523125, fromBase: v => v / 0.028349523125 },
      { symbol: 'st', label: 'Stone', toBase: v => v * 6.35029318, fromBase: v => v / 6.35029318 },
      { symbol: 'gr', label: 'Grains', toBase: v => v * 0.00006479891, fromBase: v => v / 0.00006479891 },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    icon: '🌡️',
    units: [
      { symbol: '°C', label: 'Celsius', toBase: v => v + 273.15, fromBase: v => v - 273.15 },
      { symbol: '°F', label: 'Fahrenheit', toBase: v => (v - 32) * 5 / 9 + 273.15, fromBase: v => (v - 273.15) * 9 / 5 + 32 },
      { symbol: 'K', label: 'Kelvin', toBase: v => v, fromBase: v => v },
    ],
  },
  {
    id: 'speed',
    label: 'Speed',
    icon: '🚀',
    units: [
      { symbol: 'm/s', label: 'Meters/sec', toBase: v => v, fromBase: v => v },
      { symbol: 'km/h', label: 'Kilometers/hour', toBase: v => v / 3.6, fromBase: v => v * 3.6 },
      { symbol: 'mph', label: 'Miles/hour', toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
      { symbol: 'kn', label: 'Knots', toBase: v => v * 0.514444, fromBase: v => v / 0.514444 },
      { symbol: 'ft/s', label: 'Feet/sec', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    ],
  },
  {
    id: 'time',
    label: 'Time',
    icon: '⏱️',
    units: [
      { symbol: 's', label: 'Seconds', toBase: v => v, fromBase: v => v },
      { symbol: 'ms', label: 'Milliseconds', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { symbol: 'min', label: 'Minutes', toBase: v => v * 60, fromBase: v => v / 60 },
      { symbol: 'hr', label: 'Hours', toBase: v => v * 3600, fromBase: v => v / 3600 },
      { symbol: 'day', label: 'Days', toBase: v => v * 86400, fromBase: v => v / 86400 },
      { symbol: 'week', label: 'Weeks', toBase: v => v * 604800, fromBase: v => v / 604800 },
      { symbol: 'mo', label: 'Months (avg)', toBase: v => v * 2629800, fromBase: v => v / 2629800 },
      { symbol: 'yr', label: 'Years (avg)', toBase: v => v * 31557600, fromBase: v => v / 31557600 },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    icon: '💾',
    units: [
      { symbol: 'bit', label: 'Bits', toBase: v => v / 8, fromBase: v => v * 8 },
      { symbol: 'B', label: 'Bytes', toBase: v => v, fromBase: v => v },
      { symbol: 'KB', label: 'Kilobytes (10³)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { symbol: 'MB', label: 'Megabytes (10⁶)', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
      { symbol: 'GB', label: 'Gigabytes (10⁹)', toBase: v => v * 1e9, fromBase: v => v / 1e9 },
      { symbol: 'TB', label: 'Terabytes (10¹²)', toBase: v => v * 1e12, fromBase: v => v / 1e12 },
      { symbol: 'KiB', label: 'Kibibytes (2¹⁰)', toBase: v => v * 1024, fromBase: v => v / 1024 },
      { symbol: 'MiB', label: 'Mebibytes (2²⁰)', toBase: v => v * 1048576, fromBase: v => v / 1048576 },
      { symbol: 'GiB', label: 'Gibibytes (2³⁰)', toBase: v => v * 1073741824, fromBase: v => v / 1073741824 },
      { symbol: 'TiB', label: 'Tebibytes (2⁴⁰)', toBase: v => v * 1099511627776, fromBase: v => v / 1099511627776 },
    ],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    icon: '💨',
    units: [
      { symbol: 'Pa', label: 'Pascals', toBase: v => v, fromBase: v => v },
      { symbol: 'kPa', label: 'Kilopascals', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { symbol: 'bar', label: 'Bar', toBase: v => v * 100000, fromBase: v => v / 100000 },
      { symbol: 'atm', label: 'Atmospheres', toBase: v => v * 101325, fromBase: v => v / 101325 },
      { symbol: 'psi', label: 'PSI (lb/in²)', toBase: v => v * 6894.757293168, fromBase: v => v / 6894.757293168 },
      { symbol: 'mmHg', label: 'mmHg', toBase: v => v * 133.322368421, fromBase: v => v / 133.322368421 },
      { symbol: 'torr', label: 'Torr', toBase: v => v * 133.322368421, fromBase: v => v / 133.322368421 },
    ],
  },
  {
    id: 'angle',
    label: 'Angle',
    icon: '📐',
    units: [
      { symbol: '°', label: 'Degrees', toBase: v => v * Math.PI / 180, fromBase: v => v * 180 / Math.PI },
      { symbol: 'rad', label: 'Radians', toBase: v => v, fromBase: v => v },
      { symbol: 'grad', label: 'Gradians', toBase: v => v * Math.PI / 200, fromBase: v => v * 200 / Math.PI },
      { symbol: 'arcmin', label: 'Arcminutes', toBase: v => v * Math.PI / 10800, fromBase: v => v * 10800 / Math.PI },
    ],
  },
  {
    id: 'frequency',
    label: 'Frequency',
    icon: '〰️',
    units: [
      { symbol: 'Hz', label: 'Hertz', toBase: v => v, fromBase: v => v },
      { symbol: 'kHz', label: 'Kilohertz', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { symbol: 'MHz', label: 'Megahertz', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
      { symbol: 'GHz', label: 'Gigahertz', toBase: v => v * 1e9, fromBase: v => v / 1e9 },
      { symbol: 'THz', label: 'Terahertz', toBase: v => v * 1e12, fromBase: v => v / 1e12 },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number, precision: number = 12): string {
  if (n === 0) return '0';
  if (Math.abs(n) < 1e-16) return '0';

  // Use toPrecision for small numbers
  if (Math.abs(n) < 0.000001 || Math.abs(n) >= 1e15) {
    const exp = n.toExponential(precision - 1);
    // Remove trailing zeros from coefficient: 1.20000000000e+5 → 1.2e+5
    return exp.replace(/\.?0+e/, 'e').replace(/(\.[^e]*)0+e/, '$1e');
  }

  // Format with appropriate decimals
  const absN = Math.abs(n);
  let decimals: number;
  if (absN < 0.001) decimals = 8;
  else if (absN < 0.01) decimals = 6;
  else if (absN < 1) decimals = 5;
  else if (absN < 100) decimals = 4;
  else if (absN < 10000) decimals = 2;
  else decimals = 1;

  // Strip trailing zeros
  let formatted = n.toFixed(decimals);
  if (formatted.includes('.')) {
    formatted = formatted.replace(/0+$/, '').replace(/\.$/, '');
  }
  return formatted;
}

function safeParse(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (isNaN(n) || !isFinite(n)) return null;
  return n;
}

// ── Quick Presets (category → preset values) ───────────────────────────────

const PRESETS: Record<string, { label: string; from: string; to: string; fromVal: string; toVal: string }[]> = {
  length: [
    { label: '1 mile → km', from: 'mi', to: 'km', fromVal: '1', toVal: '1.609344' },
    { label: '6 ft → cm', from: 'ft', to: 'cm', fromVal: '6', toVal: '182.88' },
    { label: '1 m → inches', from: 'm', to: 'in', fromVal: '1', toVal: '39.37' },
  ],
  temperature: [
    { label: '32°F → °C', from: '°F', to: '°C', fromVal: '32', toVal: '0' },
    { label: '100°C → °F', from: '°C', to: '°F', fromVal: '100', toVal: '212' },
    { label: '0K → °C', from: 'K', to: '°C', fromVal: '0', toVal: '-273.15' },
  ],
  mass: [
    { label: '1 lb → kg', from: 'lb', to: 'kg', fromVal: '1', toVal: '0.45359237' },
    { label: '1 kg → lb', from: 'kg', to: 'lb', fromVal: '1', toVal: '2.20462262' },
    { label: '1 st → lb', from: 'st', to: 'lb', fromVal: '1', toVal: '14' },
  ],
  data: [
    { label: '1 GB → MB', from: 'GB', to: 'MB', fromVal: '1', toVal: '1000' },
    { label: '1 GiB → MiB', from: 'GiB', to: 'MiB', fromVal: '1', toVal: '1024' },
    { label: '1 TB → GiB', from: 'TB', to: 'GiB', fromVal: '1', toVal: '931.323' },
  ],
  speed: [
    { label: '100 km/h → mph', from: 'km/h', to: 'mph', fromVal: '100', toVal: '62.14' },
    { label: '60 mph → km/h', from: 'mph', to: 'km/h', fromVal: '60', toVal: '96.56' },
    { label: '1 knot → km/h', from: 'kn', to: 'km/h', fromVal: '1', toVal: '1.852' },
  ],
  time: [
    { label: '1 day → seconds', from: 'day', to: 's', fromVal: '1', toVal: '86400' },
    { label: '1 week → hours', from: 'week', to: 'hr', fromVal: '1', toVal: '168' },
    { label: '1 year → days', from: 'yr', to: 'day', fromVal: '1', toVal: '365.25' },
  ],
  pressure: [
    { label: '1 atm → psi', from: 'atm', to: 'psi', fromVal: '1', toVal: '14.6959' },
    { label: '1 bar → Pa', from: 'bar', to: 'Pa', fromVal: '1', toVal: '100000' },
  ],
};

// ── Component ───────────────────────────────────────────────────────────────

export default function UnitConverterPage() {
  const [categoryId, setCategoryId] = useState('length');
  const [fromUnitIdx, setFromUnitIdx] = useState(0);
  const [toUnitIdx, setToUnitIdx] = useState(1);
  const [fromValue, setFromValue] = useState('1');

  const category = useMemo(() => CATEGORIES.find(c => c.id === categoryId)!, [categoryId]);

  // When we change category, reset unit indices
  const handleCategoryChange = useCallback((id: string) => {
    setCategoryId(id);
    setFromUnitIdx(0);
    setToUnitIdx(1);
    setFromValue('1');
  }, []);

  const fromUnit = category.units[fromUnitIdx]!;
  const toUnit = category.units[toUnitIdx]!;

  const parsed = safeParse(fromValue);

  const toValue = useMemo(() => {
    if (parsed === null) return '';
    try {
      const base = fromUnit.toBase(parsed);
      const result = toUnit.fromBase(base);
      return formatNumber(result);
    } catch {
      return '';
    }
  }, [parsed, fromUnit, toUnit]);

  // When fromUnitIdx changes, clear the input so stale values don't carry over.
  const handleFromUnitChange = useCallback((idx: number) => {
    setFromUnitIdx(idx);
  }, []);

  const handleToUnitChange = useCallback((idx: number) => {
    setToUnitIdx(idx);
  }, []);

  const handleSwap = useCallback(() => {
    if (parsed !== null && toValue !== '') {
      setFromValue(toValue);
    }
    setFromUnitIdx(toUnitIdx);
    setToUnitIdx(fromUnitIdx);
  }, [fromUnitIdx, toUnitIdx, parsed, toValue]);

  const handleClear = useCallback(() => {
    setFromValue('');
  }, []);

  const handleCopy = useCallback(async () => {
    if (toValue !== '') {
      await navigator.clipboard.writeText(toValue);
      toast.success('Result copied');
    }
  }, [toValue]);

  const handlePreset = useCallback((preset: typeof PRESETS[string][0]) => {
    // Find units in current category
    const fromIdx = category.units.findIndex(u => u.symbol === preset.from);
    const toIdx = category.units.findIndex(u => u.symbol === preset.to);
    if (fromIdx >= 0) setFromUnitIdx(fromIdx);
    if (toIdx >= 0) setToUnitIdx(toIdx);
    setFromValue(preset.fromVal);
  }, [category]);

  const presets = PRESETS[categoryId] || [];

  return (
    <ToolLayout
      title="Unit Converter"
      description="Convert between hundreds of units across 11 categories — length, area, volume, mass, temperature, speed, time, data, pressure, angle, and frequency. All 100% private, client-side."
    >
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              categoryId === cat.id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {/* From */}
        <div className="p-5 rounded-xl border-2 border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">From</span>
          </div>

          <div className="mb-3">
            <select
              value={fromUnitIdx}
              onChange={(e) => handleFromUnitChange(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            >
              {category.units.map((u, i) => (
                <option key={u.symbol} value={i}>
                  {u.label} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            inputMode="decimal"
            value={fromValue}
            onChange={(e) => setFromValue(e.target.value)}
            placeholder="Enter value"
            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-2xl font-mono font-bold text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center py-4 lg:py-12">
          <button
            onClick={handleSwap}
            className="p-3 rounded-full bg-slate-700/50 border border-slate-600 hover:bg-slate-600/50 hover:border-brand-500/50 text-slate-300 hover:text-brand-400 transition-all"
            title="Swap units"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>

        {/* To */}
        <div className="p-5 rounded-xl border-2 border-slate-700/50 bg-surface-light">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">To</span>
          </div>

          <div className="mb-3">
            <select
              value={toUnitIdx}
              onChange={(e) => handleToUnitChange(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            >
              {category.units.map((u, i) => (
                <option key={u.symbol} value={i}>
                  {u.label} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="w-full bg-slate-800/30 border border-slate-600 rounded-lg px-4 py-3 text-2xl font-mono font-bold text-brand-300 min-h-[3.25rem] flex items-center">
              {toValue || <span className="text-slate-500 text-lg font-normal">Result</span>}
            </div>
            {toValue && (
              <button
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-brand-400 transition-colors"
                title="Copy result"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Conversion rate */}
          {parsed !== null && (
            <p className="mt-2 text-xs text-slate-500">
              1 {fromUnit.symbol} = {formatNumber(toUnit.fromBase(fromUnit.toBase(1)))} {toUnit.symbol}
            </p>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Quick Presets */}
      {presets.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Common Conversions
          </h3>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePreset(p)}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-700/30 border border-slate-700/50 text-slate-300 hover:bg-brand-500/10 hover:border-brand-500/30 hover:text-brand-300 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All units quick-glance table */}
      {parsed !== null && (
        <div className="mt-8 rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300">
              All {category.label} Conversions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-500">
                  <th className="text-left px-5 py-2 font-medium">Unit</th>
                  <th className="text-right px-5 py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {category.units.map((u) => {
                  try {
                    const base = fromUnit.toBase(parsed);
                    const val = u.fromBase(base);
                    return (
                      <tr key={u.symbol} className="border-b border-slate-700/30">
                        <td className="px-5 py-2.5 text-slate-300">
                          {u.label} <span className="text-slate-500">({u.symbol})</span>
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-brand-300">
                          {formatNumber(val)}
                        </td>
                      </tr>
                    );
                  } catch {
                    return null;
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
