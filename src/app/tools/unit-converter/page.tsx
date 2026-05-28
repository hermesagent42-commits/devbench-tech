'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Ruler,
  Weight,
  Thermometer,
  Maximize2,
  Droplets,
  Gauge,
  Clock,
  HardDrive,
  Waves,
  Zap,
  ArrowLeftRight,
  Copy,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
// Unit definitions — all conversions use SI base as intermediate
// ============================================================

interface UnitDef {
  name: string;
  symbol: string;
  /** Multiplier to get to SI base unit */
  toBase: number;
  /** Additive offset (for temperature) */
  offset?: number;
}

interface Category {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  baseUnit: string;
  units: UnitDef[];
}

const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: 'Length',
    icon: Ruler,
    baseUnit: 'meter',
    units: [
      { name: 'Kilometer', symbol: 'km', toBase: 1000 },
      { name: 'Meter', symbol: 'm', toBase: 1 },
      { name: 'Centimeter', symbol: 'cm', toBase: 0.01 },
      { name: 'Millimeter', symbol: 'mm', toBase: 0.001 },
      { name: 'Micrometer', symbol: 'µm', toBase: 1e-6 },
      { name: 'Nanometer', symbol: 'nm', toBase: 1e-9 },
      { name: 'Mile', symbol: 'mi', toBase: 1609.344 },
      { name: 'Yard', symbol: 'yd', toBase: 0.9144 },
      { name: 'Foot', symbol: 'ft', toBase: 0.3048 },
      { name: 'Inch', symbol: 'in', toBase: 0.0254 },
      { name: 'Nautical Mile', symbol: 'nmi', toBase: 1852 },
    ],
  },
  {
    id: 'mass',
    label: 'Mass / Weight',
    icon: Weight,
    baseUnit: 'kilogram',
    units: [
      { name: 'Metric Ton', symbol: 't', toBase: 1000 },
      { name: 'Kilogram', symbol: 'kg', toBase: 1 },
      { name: 'Gram', symbol: 'g', toBase: 0.001 },
      { name: 'Milligram', symbol: 'mg', toBase: 1e-6 },
      { name: 'Microgram', symbol: 'µg', toBase: 1e-9 },
      { name: 'Pound', symbol: 'lb', toBase: 0.45359237 },
      { name: 'Ounce', symbol: 'oz', toBase: 0.028349523125 },
      { name: 'Stone', symbol: 'st', toBase: 6.35029318 },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    icon: Thermometer,
    baseUnit: 'kelvin',
    units: [
      { name: 'Celsius', symbol: '°C', toBase: 1, offset: 273.15 },
      { name: 'Fahrenheit', symbol: '°F', toBase: 5 / 9, offset: 459.67 },
      { name: 'Kelvin', symbol: 'K', toBase: 1, offset: 0 },
    ],
  },
  {
    id: 'area',
    label: 'Area',
    icon: Maximize2,
    baseUnit: 'square meter',
    units: [
      { name: 'Square Kilometer', symbol: 'km²', toBase: 1e6 },
      { name: 'Hectare', symbol: 'ha', toBase: 10000 },
      { name: 'Square Meter', symbol: 'm²', toBase: 1 },
      { name: 'Square Centimeter', symbol: 'cm²', toBase: 0.0001 },
      { name: 'Square Mile', symbol: 'mi²', toBase: 2589988.110336 },
      { name: 'Acre', symbol: 'ac', toBase: 4046.8564224 },
      { name: 'Square Yard', symbol: 'yd²', toBase: 0.83612736 },
      { name: 'Square Foot', symbol: 'ft²', toBase: 0.09290304 },
      { name: 'Square Inch', symbol: 'in²', toBase: 0.00064516 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    icon: Droplets,
    baseUnit: 'liter',
    units: [
      { name: 'Cubic Meter', symbol: 'm³', toBase: 1000 },
      { name: 'Liter', symbol: 'L', toBase: 1 },
      { name: 'Milliliter', symbol: 'mL', toBase: 0.001 },
      { name: 'Gallon (US)', symbol: 'gal', toBase: 3.785411784 },
      { name: 'Quart (US)', symbol: 'qt', toBase: 0.946352946 },
      { name: 'Pint (US)', symbol: 'pt', toBase: 0.473176473 },
      { name: 'Cup (US)', symbol: 'cup', toBase: 0.2365882365 },
      { name: 'Fluid Ounce (US)', symbol: 'fl oz', toBase: 0.0295735295625 },
      { name: 'Tablespoon (US)', symbol: 'tbsp', toBase: 0.01478676478125 },
      { name: 'Teaspoon (US)', symbol: 'tsp', toBase: 0.00492892159375 },
      { name: 'Cubic Centimeter', symbol: 'cm³', toBase: 0.001 },
    ],
  },
  {
    id: 'speed',
    label: 'Speed',
    icon: Gauge,
    baseUnit: 'm/s',
    units: [
      { name: 'Meters per Second', symbol: 'm/s', toBase: 1 },
      { name: 'Kilometers per Hour', symbol: 'km/h', toBase: 1 / 3.6 },
      { name: 'Miles per Hour', symbol: 'mph', toBase: 0.44704 },
      { name: 'Knot', symbol: 'kn', toBase: 0.514444444 },
      { name: 'Feet per Second', symbol: 'ft/s', toBase: 0.3048 },
    ],
  },
  {
    id: 'time',
    label: 'Time',
    icon: Clock,
    baseUnit: 'second',
    units: [
      { name: 'Year', symbol: 'yr', toBase: 31557600 },
      { name: 'Month (avg)', symbol: 'mo', toBase: 2629800 },
      { name: 'Week', symbol: 'wk', toBase: 604800 },
      { name: 'Day', symbol: 'd', toBase: 86400 },
      { name: 'Hour', symbol: 'hr', toBase: 3600 },
      { name: 'Minute', symbol: 'min', toBase: 60 },
      { name: 'Second', symbol: 's', toBase: 1 },
      { name: 'Millisecond', symbol: 'ms', toBase: 0.001 },
      { name: 'Microsecond', symbol: 'µs', toBase: 1e-6 },
      { name: 'Nanosecond', symbol: 'ns', toBase: 1e-9 },
    ],
  },
  {
    id: 'digital',
    label: 'Digital Storage',
    icon: HardDrive,
    baseUnit: 'byte',
    units: [
      { name: 'Petabyte', symbol: 'PB', toBase: 1e15 },
      { name: 'Terabyte', symbol: 'TB', toBase: 1e12 },
      { name: 'Gigabyte', symbol: 'GB', toBase: 1e9 },
      { name: 'Megabyte', symbol: 'MB', toBase: 1e6 },
      { name: 'Kilobyte', symbol: 'KB', toBase: 1000 },
      { name: 'Byte', symbol: 'B', toBase: 1 },
      { name: 'Bit', symbol: 'bit', toBase: 0.125 },
      { name: 'Kibibyte', symbol: 'KiB', toBase: 1024 },
      { name: 'Mebibyte', symbol: 'MiB', toBase: 1048576 },
      { name: 'Gibibyte', symbol: 'GiB', toBase: 1073741824 },
    ],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    icon: Waves,
    baseUnit: 'pascal',
    units: [
      { name: 'Pascal', symbol: 'Pa', toBase: 1 },
      { name: 'Kilopascal', symbol: 'kPa', toBase: 1000 },
      { name: 'Bar', symbol: 'bar', toBase: 100000 },
      { name: 'PSI', symbol: 'psi', toBase: 6894.757293168 },
      { name: 'Atmosphere', symbol: 'atm', toBase: 101325 },
      { name: 'mmHg (Torr)', symbol: 'mmHg', toBase: 133.322368421 },
    ],
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: Zap,
    baseUnit: 'joule',
    units: [
      { name: 'Kilojoule', symbol: 'kJ', toBase: 1000 },
      { name: 'Joule', symbol: 'J', toBase: 1 },
      { name: 'Calorie', symbol: 'cal', toBase: 4.184 },
      { name: 'Kilocalorie', symbol: 'kcal', toBase: 4184 },
      { name: 'Watt-hour', symbol: 'Wh', toBase: 3600 },
      { name: 'Kilowatt-hour', symbol: 'kWh', toBase: 3600000 },
      { name: 'Electronvolt', symbol: 'eV', toBase: 1.602176634e-19 },
    ],
  },
];

function convert(
  value: number,
  from: UnitDef,
  to: UnitDef,
): number {
  if (from.offset !== undefined || to.offset !== undefined) {
    // Temperature: convert to Kelvin then to target
    const kelvin = value * from.toBase + (from.offset ?? 0);
    return (kelvin - (to.offset ?? 0)) / to.toBase;
  }
  const baseValue = value * from.toBase;
  return baseValue / to.toBase;
}

function formatResult(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs < 1e-15) return '0';
  if (abs < 0.000001) return value.toExponential(6);
  if (abs < 0.001) return value.toFixed(9).replace(/\.?0+$/, '');
  if (abs < 1) return value.toFixed(6).replace(/\.?0+$/, '');
  if (abs < 1000) return value.toFixed(4).replace(/\.?0+$/, '');
  if (abs < 1e6) return value.toFixed(2).replace(/\.?0+$/, '');
  return value.toExponential(6);
}

export default function UnitConverterPage() {
  const [categoryId, setCategoryId] = useState('length');
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(1);
  const [inputValue, setInputValue] = useState('1');

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId)!,
    [categoryId],
  );

  const fromUnit = category.units[fromIndex];
  const toUnit = category.units[toIndex];

  const parsedValue = parseFloat(inputValue);
  const isValid = inputValue !== '' && !isNaN(parsedValue);

  const result = useMemo(() => {
    if (!isValid) return '';
    return formatResult(convert(parsedValue, fromUnit, toUnit));
  }, [isValid, parsedValue, fromUnit, toUnit]);

  const swapUnits = useCallback(() => {
    setFromIndex(toIndex);
    setToIndex(fromIndex);
    if (isValid) {
      setInputValue(result || '');
    }
  }, [toIndex, fromIndex, isValid, result]);

  const handleCategoryChange = useCallback((catId: string) => {
    setCategoryId(catId);
    setFromIndex(0);
    setToIndex(1);
    setInputValue('1');
  }, []);

  const copyResult = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(
      () => toast.success('Result copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [result]);

  const reset = useCallback(() => {
    setInputValue('1');
    setFromIndex(0);
    setToIndex(1);
  }, []);

  return (
    <ToolLayout
      title="Unit Converter"
      description="Convert between hundreds of units across 10 categories — length, mass, temperature, area, volume, speed, time, digital storage, pressure, and energy. Live conversion, instant results."
    >
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = categoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-lighter'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Converter panel */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {/* From */}
        <div className="card space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            From
          </label>
          <select
            value={fromIndex}
            onChange={(e) => setFromIndex(Number(e.target.value))}
            className="input-field w-full"
          >
            {category.units.map((u, i) => (
              <option key={u.symbol} value={i}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-field w-full text-xl font-mono pr-16"
              placeholder="Enter value"
              spellCheck={false}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
              {fromUnit.symbol}
            </span>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center pt-8">
          <button
            onClick={swapUnits}
            className="p-2.5 rounded-full bg-surface-lighter border border-slate-700/50 hover:border-brand-400 hover:bg-brand-500/10 transition-all group"
            title="Swap units"
          >
            <ArrowLeftRight className="w-5 h-5 text-slate-400 group-hover:text-brand-400 transition-colors" />
          </button>
        </div>

        {/* To */}
        <div className="card space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            To
          </label>
          <select
            value={toIndex}
            onChange={(e) => setToIndex(Number(e.target.value))}
            className="input-field w-full"
          >
            {category.units.map((u, i) => (
              <option key={u.symbol} value={i}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={isValid ? result : inputValue === '' ? '' : 'Invalid input'}
              className="input-field w-full text-xl font-mono bg-surface-lighter text-brand-300 pr-16"
              placeholder="Result"
              spellCheck={false}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
              {toUnit.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={copyResult}
          disabled={!result}
          className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Copy className="w-4 h-4" />
          Copy Result
        </button>
        <button
          onClick={reset}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>

        {isValid && result && (
          <div className="ml-auto text-sm text-slate-500 font-mono bg-surface-lighter px-3 py-1.5 rounded-lg border border-slate-700/30">
            <span className="text-slate-400">{parsedValue}</span>{' '}
            <span className="text-slate-600">{fromUnit.symbol}</span>
            <span className="mx-2 text-slate-600">=</span>
            <span className="text-brand-300">{result}</span>{' '}
            <span className="text-slate-600">{toUnit.symbol}</span>
          </div>
        )}
      </div>

      {/* Quick conversions table */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">
          All {category.label} Conversions
        </h3>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {fromUnit.symbol}
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {category.units.map((u) => {
                  const converted = isValid
                    ? formatResult(convert(parsedValue, fromUnit, u))
                    : '—';
                  return (
                    <tr
                      key={u.symbol}
                      className="hover:bg-surface-lighter/50 transition-colors"
                    >
                      <td className="px-4 py-2 text-slate-400 font-mono">{u.symbol}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-brand-300">{converted}</span>
                        <span className="text-slate-600 ml-1.5">{u.name}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
