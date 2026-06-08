'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  ArrowLeftRight, Copy, RefreshCw, Ruler, Weight, Thermometer, Gauge,
  Clock, HardDrive, Waves, Zap, Maximize, Move3d, ChevronDown,
  Check, RotateCw, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface UnitDef {
  symbol: string;
  label: string;
  factor: number; // multiplier to get to base unit (or special for temperature)
  offset?: number; // for temperature
}

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  baseUnit: string;
  units: UnitDef[];
  presets: { label: string; from: number; fromUnit: string; toUnit: string }[];
}

// ── Categories ─────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: 'Length',
    icon: <Ruler className="w-4 h-4" />,
    baseUnit: 'm',
    units: [
      { symbol: 'mm', label: 'Millimeter', factor: 1000 },
      { symbol: 'cm', label: 'Centimeter', factor: 100 },
      { symbol: 'm', label: 'Meter', factor: 1 },
      { symbol: 'km', label: 'Kilometer', factor: 0.001 },
      { symbol: 'in', label: 'Inch', factor: 39.37007874 },
      { symbol: 'ft', label: 'Foot', factor: 3.280839895 },
      { symbol: 'yd', label: 'Yard', factor: 1.0936132983 },
      { symbol: 'mi', label: 'Mile', factor: 0.00062137119224 },
      { symbol: 'nmi', label: 'Nautical Mile', factor: 0.00053995680346 },
      { symbol: 'au', label: 'Astronomical Unit', factor: 6.6845871227e-12 },
      { symbol: 'ly', label: 'Light Year', factor: 1.057000834e-16 },
    ],
    presets: [
      { label: '5 km to miles', from: 5, fromUnit: 'km', toUnit: 'mi' },
      { label: '6 feet to cm', from: 6, fromUnit: 'ft', toUnit: 'cm' },
      { label: '100 yards to m', from: 100, fromUnit: 'yd', toUnit: 'm' },
    ],
  },
  {
    id: 'weight',
    label: 'Weight / Mass',
    icon: <Weight className="w-4 h-4" />,
    baseUnit: 'kg',
    units: [
      { symbol: 'mg', label: 'Milligram', factor: 1_000_000 },
      { symbol: 'g', label: 'Gram', factor: 1000 },
      { symbol: 'kg', label: 'Kilogram', factor: 1 },
      { symbol: 't', label: 'Metric Ton', factor: 0.001 },
      { symbol: 'oz', label: 'Ounce', factor: 35.27396195 },
      { symbol: 'lb', label: 'Pound', factor: 2.2046226218 },
      { symbol: 'st', label: 'Stone', factor: 0.15747304442 },
      { symbol: 'us_ton', label: 'US Ton', factor: 0.0011023113109 },
      { symbol: 'imp_ton', label: 'Imperial Ton', factor: 0.00098420652761 },
    ],
    presets: [
      { label: '150 lb to kg', from: 150, fromUnit: 'lb', toUnit: 'kg' },
      { label: '1 kg to lb', from: 1, fromUnit: 'kg', toUnit: 'lb' },
      { label: '500 g to oz', from: 500, fromUnit: 'g', toUnit: 'oz' },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    icon: <Thermometer className="w-4 h-4" />,
    baseUnit: 'K',
    units: [
      { symbol: '°C', label: 'Celsius', factor: 1, offset: 273.15 },
      { symbol: '°F', label: 'Fahrenheit', factor: 5 / 9, offset: 459.67 },
      { symbol: 'K', label: 'Kelvin', factor: 1, offset: 0 },
    ],
    presets: [
      { label: '100°C to °F', from: 100, fromUnit: '°C', toUnit: '°F' },
      { label: '0°C to °F', from: 0, fromUnit: '°C', toUnit: '°F' },
      { label: '98.6°F to °C', from: 98.6, fromUnit: '°F', toUnit: '°C' },
    ],
  },
  {
    id: 'area',
    label: 'Area',
    icon: <Maximize className="w-4 h-4" />,
    baseUnit: 'm2',
    units: [
      { symbol: 'mm²', label: 'Square Millimeter', factor: 1_000_000 },
      { symbol: 'cm²', label: 'Square Centimeter', factor: 10_000 },
      { symbol: 'm²', label: 'Square Meter', factor: 1 },
      { symbol: 'ha', label: 'Hectare', factor: 0.0001 },
      { symbol: 'km²', label: 'Square Kilometer', factor: 1e-6 },
      { symbol: 'in²', label: 'Square Inch', factor: 1550.0031 },
      { symbol: 'ft²', label: 'Square Foot', factor: 10.763910417 },
      { symbol: 'yd²', label: 'Square Yard', factor: 1.1959900463 },
      { symbol: 'ac', label: 'Acre', factor: 0.00024710538147 },
      { symbol: 'mi²', label: 'Square Mile', factor: 3.8610215854e-7 },
    ],
    presets: [
      { label: '1 acre to m²', from: 1, fromUnit: 'ac', toUnit: 'm²' },
      { label: '1000 ft² to m²', from: 1000, fromUnit: 'ft²', toUnit: 'm²' },
      { label: '1 km² to mi²', from: 1, fromUnit: 'km²', toUnit: 'mi²' },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    icon: <Waves className="w-4 h-4" />,
    baseUnit: 'l',
    units: [
      { symbol: 'ml', label: 'Milliliter', factor: 1000 },
      { symbol: 'cl', label: 'Centiliter', factor: 100 },
      { symbol: 'l', label: 'Liter', factor: 1 },
      { symbol: 'm³', label: 'Cubic Meter', factor: 0.001 },
      { symbol: 'tsp', label: 'Teaspoon (US)', factor: 202.88413621 },
      { symbol: 'tbsp', label: 'Tablespoon (US)', factor: 67.628045404 },
      { symbol: 'fl_oz', label: 'Fluid Ounce (US)', factor: 33.814022702 },
      { symbol: 'cup', label: 'Cup (US)', factor: 4.2267528377 },
      { symbol: 'pt', label: 'Pint (US)', factor: 2.1133764189 },
      { symbol: 'qt', label: 'Quart (US)', factor: 1.0566882094 },
      { symbol: 'gal', label: 'Gallon (US)', factor: 0.26417205236 },
      { symbol: 'imp_gal', label: 'Gallon (UK)', factor: 0.2199692483 },
    ],
    presets: [
      { label: '1 gal to l', from: 1, fromUnit: 'gal', toUnit: 'l' },
      { label: '500 ml to cups', from: 500, fromUnit: 'ml', toUnit: 'cup' },
      { label: '3 tsp to ml', from: 3, fromUnit: 'tsp', toUnit: 'ml' },
    ],
  },
  {
    id: 'speed',
    label: 'Speed',
    icon: <Gauge className="w-4 h-4" />,
    baseUnit: 'm_s',
    units: [
      { symbol: 'm/s', label: 'Meters per Second', factor: 1 },
      { symbol: 'km/h', label: 'Kilometers per Hour', factor: 3.6 },
      { symbol: 'mph', label: 'Miles per Hour', factor: 2.2369362921 },
      { symbol: 'kn', label: 'Knot', factor: 1.9438444924 },
      { symbol: 'ft/s', label: 'Feet per Second', factor: 3.280839895 },
      { symbol: 'Mach', label: 'Mach (sea level)', factor: 0.002938669958 },
    ],
    presets: [
      { label: '100 km/h to mph', from: 100, fromUnit: 'km/h', toUnit: 'mph' },
      { label: '60 mph to km/h', from: 60, fromUnit: 'mph', toUnit: 'km/h' },
      { label: 'Mach 1 to km/h', from: 1, fromUnit: 'Mach', toUnit: 'km/h' },
    ],
  },
  {
    id: 'time',
    label: 'Time',
    icon: <Clock className="w-4 h-4" />,
    baseUnit: 's',
    units: [
      { symbol: 'ns', label: 'Nanosecond', factor: 1_000_000_000 },
      { symbol: 'μs', label: 'Microsecond', factor: 1_000_000 },
      { symbol: 'ms', label: 'Millisecond', factor: 1000 },
      { symbol: 's', label: 'Second', factor: 1 },
      { symbol: 'min', label: 'Minute', factor: 1 / 60 },
      { symbol: 'hr', label: 'Hour', factor: 1 / 3600 },
      { symbol: 'day', label: 'Day', factor: 1 / 86400 },
      { symbol: 'wk', label: 'Week', factor: 1 / 604800 },
      { symbol: 'mo', label: 'Month (avg)', factor: 1 / 2629800 },
      { symbol: 'yr', label: 'Year (365d)', factor: 1 / 31557600 },
      { symbol: 'dec', label: 'Decade', factor: 1 / 315576000 },
      { symbol: 'cent', label: 'Century', factor: 1 / 3155760000 },
    ],
    presets: [
      { label: '1 year to days', from: 1, fromUnit: 'yr', toUnit: 'day' },
      { label: '3600 s to hr', from: 3600, fromUnit: 's', toUnit: 'hr' },
      { label: '1 week to hr', from: 1, fromUnit: 'wk', toUnit: 'hr' },
    ],
  },
  {
    id: 'data',
    label: 'Data Storage',
    icon: <HardDrive className="w-4 h-4" />,
    baseUnit: 'B',
    units: [
      { symbol: 'bit', label: 'Bit', factor: 8 },
      { symbol: 'B', label: 'Byte', factor: 1 },
      { symbol: 'KB', label: 'Kilobyte (SI)', factor: 1e-3 },
      { symbol: 'MB', label: 'Megabyte (SI)', factor: 1e-6 },
      { symbol: 'GB', label: 'Gigabyte (SI)', factor: 1e-9 },
      { symbol: 'TB', label: 'Terabyte (SI)', factor: 1e-12 },
      { symbol: 'PB', label: 'Petabyte (SI)', factor: 1e-15 },
      { symbol: 'KiB', label: 'Kibibyte (binary)', factor: 1 / 1024 },
      { symbol: 'MiB', label: 'Mebibyte (binary)', factor: 1 / 1048576 },
      { symbol: 'GiB', label: 'Gibibyte (binary)', factor: 1 / 1073741824 },
      { symbol: 'TiB', label: 'Tebibyte (binary)', factor: 1 / 1099511627776 },
    ],
    presets: [
      { label: '1 GB to MB', from: 1, fromUnit: 'GB', toUnit: 'MB' },
      { label: '1 GiB to MiB', from: 1, fromUnit: 'GiB', toUnit: 'MiB' },
      { label: '500 GB to TiB', from: 500, fromUnit: 'GB', toUnit: 'TiB' },
    ],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    icon: <Move3d className="w-4 h-4" />,
    baseUnit: 'Pa',
    units: [
      { symbol: 'Pa', label: 'Pascal', factor: 1 },
      { symbol: 'kPa', label: 'Kilopascal', factor: 0.001 },
      { symbol: 'MPa', label: 'Megapascal', factor: 1e-6 },
      { symbol: 'bar', label: 'Bar', factor: 1e-5 },
      { symbol: 'atm', label: 'Atmosphere', factor: 9.8692326672e-6 },
      { symbol: 'psi', label: 'PSI', factor: 0.00014503773773 },
      { symbol: 'torr', label: 'Torr', factor: 0.007500616827 },
      { symbol: 'mmHg', label: 'mmHg', factor: 0.007500616827 },
      { symbol: 'inHg', label: 'inHg', factor: 0.00029529983071 },
    ],
    presets: [
      { label: '1 atm to psi', from: 1, fromUnit: 'atm', toUnit: 'psi' },
      { label: '100 kPa to bar', from: 100, fromUnit: 'kPa', toUnit: 'bar' },
      { label: '30 psi to kPa', from: 30, fromUnit: 'psi', toUnit: 'kPa' },
    ],
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: <Zap className="w-4 h-4" />,
    baseUnit: 'J',
    units: [
      { symbol: 'J', label: 'Joule', factor: 1 },
      { symbol: 'kJ', label: 'Kilojoule', factor: 0.001 },
      { symbol: 'cal', label: 'Calorie', factor: 0.23900573614 },
      { symbol: 'kcal', label: 'Kilocalorie', factor: 0.00023900573614 },
      { symbol: 'Wh', label: 'Watt-hour', factor: 1 / 3600 },
      { symbol: 'kWh', label: 'Kilowatt-hour', factor: 1 / 3600000 },
      { symbol: 'eV', label: 'Electronvolt', factor: 6.2415090745e18 },
      { symbol: 'BTU', label: 'BTU', factor: 0.00094781712031 },
    ],
    presets: [
      { label: '1 kWh to J', from: 1, fromUnit: 'kWh', toUnit: 'J' },
      { label: '2000 cal to kJ', from: 2000, fromUnit: 'cal', toUnit: 'kJ' },
      { label: '1 eV to J', from: 1, fromUnit: 'eV', toUnit: 'J' },
    ],
  },
  {
    id: 'frequency',
    label: 'Frequency',
    icon: <Waves className="w-4 h-4" />,
    baseUnit: 'Hz',
    units: [
      { symbol: 'Hz', label: 'Hertz', factor: 1 },
      { symbol: 'kHz', label: 'Kilohertz', factor: 0.001 },
      { symbol: 'MHz', label: 'Megahertz', factor: 1e-6 },
      { symbol: 'GHz', label: 'Gigahertz', factor: 1e-9 },
      { symbol: 'rpm', label: 'RPM', factor: 60 },
    ],
    presets: [
      { label: '3 GHz to MHz', from: 3, fromUnit: 'GHz', toUnit: 'MHz' },
      { label: '440 Hz to kHz', from: 440, fromUnit: 'Hz', toUnit: 'kHz' },
      { label: '7200 rpm to Hz', from: 7200, fromUnit: 'rpm', toUnit: 'Hz' },
    ],
  },
  {
    id: 'angle',
    label: 'Angle',
    icon: <RotateCw className="w-4 h-4" />,
    baseUnit: 'rad',
    units: [
      { symbol: '°', label: 'Degree', factor: 57.295779513 },
      { symbol: 'rad', label: 'Radian', factor: 1 },
      { symbol: 'grad', label: 'Gradian', factor: 63.661977237 },
      { symbol: 'arcmin', label: 'Arcminute', factor: 3437.7467708 },
      { symbol: 'arcsec', label: 'Arcsecond', factor: 206264.80625 },
      { symbol: 'turn', label: 'Turn (revolution)', factor: 0.159154943 },
    ],
    presets: [
      { label: '180° to rad', from: 180, fromUnit: '°', toUnit: 'rad' },
      { label: 'π/2 rad to °', from: Math.PI / 2, fromUnit: 'rad', toUnit: '°' },
      { label: '1 turn to °', from: 1, fromUnit: 'turn', toUnit: '°' },
    ],
  },
];

// ── Conversion logic ────────────────────────────────────────────────────────

function toBaseUnit(value: number, unit: UnitDef): number {
  if (unit.offset !== undefined) {
    // Temperature: (value - offset) * factor
    // e.g., °C -> K: (C + 273.15) ... wait, for Celsius we store offset=273.15, factor=1
    // To base: (value + offset)  for °C? Let's think:
    // K = °C + 273.15 → so offset is what we ADD to get to base
    // °F: K = (°F + 459.67) * 5/9 → factor=5/9, offset=459.67
    // To base: (value + offset) * factor
    return (value + unit.offset) * unit.factor;
  }
  // Regular: go to base by dividing by factor (factor = units per base)
  return value / unit.factor;
}

function fromBaseUnit(baseValue: number, unit: UnitDef): number {
  if (unit.offset !== undefined) {
    // From base to unit: baseValue / factor - offset
    return baseValue / unit.factor - unit.offset;
  }
  // From base: multiply by factor
  return baseValue * unit.factor;
}

function convert(value: number, fromUnit: UnitDef, toUnit: UnitDef): number {
  if (fromUnit.symbol === toUnit.symbol) return value;
  // Special case: both are temperature
  if (fromUnit.offset !== undefined && toUnit.offset !== undefined) {
    // Go via base (Kelvin for temp categories)
    const base = toBaseUnit(value, fromUnit);
    return fromBaseUnit(base, toUnit);
  }
  const base = toBaseUnit(value, fromUnit);
  return fromBaseUnit(base, toUnit);
}

function formatNumber(value: number, maxDecimals: number = 10): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 1e-15) return '0';
  if (Math.abs(value) > 1e15) return value.toExponential(6);

  // Find the right number of decimal places
  for (let decimals = 0; decimals <= maxDecimals; decimals++) {
    const formatted = value.toFixed(decimals);
    const parsed = parseFloat(formatted);
    // If the relative error is tiny, use this
    if (Math.abs(parsed - value) < Math.abs(value) * 1e-12) {
      return formatWithCommas(parsed, decimals);
    }
  }
  return formatWithCommas(value, maxDecimals);
}

function formatWithCommas(value: number, decimals: number): string {
  // Don't add commas to decimals > 14 to avoid issues
  if (decimals > 14) return value.toFixed(decimals);
  const parts = value.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// ── Component ───────────────────────────────────────────────────────────────

export default function UnitConverterPage() {
  const [categoryId, setCategoryId] = useState<string>('length');
  const [fromUnitIdx, setFromUnitIdx] = useState(0);
  const [toUnitIdx, setToUnitIdx] = useState(2); // default to 3rd unit
  const [fromValue, setFromValue] = useState<string>('1');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const category = useMemo(() => CATEGORIES.find((c) => c.id === categoryId)!, [categoryId]);
  const fromUnit = category.units[fromUnitIdx];
  const toUnit = category.units[toUnitIdx];

  const fromNum = useMemo(() => {
    const parsed = parseFloat(fromValue);
    return isNaN(parsed) ? 0 : parsed;
  }, [fromValue]);

  const toValue = useMemo(() => {
    if (fromValue === '' || isNaN(fromNum)) return '';
    const result = convert(fromNum, fromUnit, toUnit);
    return formatNumber(result);
  }, [fromNum, fromUnit, toUnit, fromValue]);

  const handleCategoryChange = useCallback((newCategoryId: string) => {
    setCategoryId(newCategoryId);
    setFromUnitIdx(0);
    const cat = CATEGORIES.find((c) => c.id === newCategoryId)!;
    setToUnitIdx(Math.min(2, cat.units.length - 1));
  }, []);

  const handleSwap = useCallback(() => {
    setFromUnitIdx(toUnitIdx);
    setToUnitIdx(fromUnitIdx);
    // Also set the "from value" to the converted result
    if (toValue) {
      setFromValue(toValue.replace(/,/g, ''));
    }
  }, [fromUnitIdx, toUnitIdx, toValue]);

  const handleCopy = useCallback(async () => {
    if (!toValue) return;
    const raw = toValue.replace(/,/g, '');
    await navigator.clipboard.writeText(raw);
    setCopiedKey('result');
    toast.success('Result copied');
    setTimeout(() => setCopiedKey(null), 2000);
  }, [toValue]);

  const handlePreset = useCallback((preset: (typeof category.presets)[0]) => {
    const fromIdx = category.units.findIndex((u) => u.symbol === preset.fromUnit);
    const toIdx = category.units.findIndex((u) => u.symbol === preset.toUnit);
    if (fromIdx >= 0) setFromUnitIdx(fromIdx);
    if (toIdx >= 0) setToUnitIdx(toIdx);
    setFromValue(String(preset.from));
  }, [category]);

  const handleFromInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow numbers, decimal point, negative sign, scientific notation
    if (val === '' || val === '-' || /^-?\d*\.?\d*(e-?\d*)?$/i.test(val)) {
      setFromValue(val);
    }
  }, []);

  return (
    <ToolLayout
      title="Unit Converter"
      description="Convert between hundreds of units across 11 categories — length, weight, temperature, speed, data storage, and more. All calculations run 100% client-side with instant results."
    >
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              categoryId === cat.id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-slate-700/50'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Converter card */}
      <div className="rounded-2xl border border-slate-700/50 bg-surface-light p-6 sm:p-8">
        {/* From row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              From
            </label>
            <input
              type="text"
              value={fromValue}
              onChange={handleFromInput}
              placeholder="Enter value"
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-white placeholder-slate-600 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="sm:w-48">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Unit
            </label>
            <div className="relative">
              <select
                value={fromUnitIdx}
                onChange={(e) => setFromUnitIdx(Number(e.target.value))}
                className="w-full appearance-none bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-brand-500/50 cursor-pointer pr-10 transition-all"
              >
                {category.units.map((unit, idx) => (
                  <option key={unit.symbol} value={idx}>
                    {unit.symbol} — {unit.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center my-2">
          <button
            onClick={handleSwap}
            className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-brand-500/20 text-slate-400 hover:text-brand-400 border border-slate-700/50 hover:border-brand-500/30 transition-all group"
            title="Swap units and carry over result"
          >
            <ArrowLeftRight className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>

        {/* To row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              To
            </label>
            <div className="relative">
              <div className="w-full bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-emerald-400 min-h-[3.25rem] flex items-center">
                {toValue || <span className="text-slate-600">—</span>}
              </div>
              <button
                onClick={handleCopy}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-colors"
                title="Copy result"
              >
                {copiedKey === 'result' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="sm:w-48">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Unit
            </label>
            <div className="relative">
              <select
                value={toUnitIdx}
                onChange={(e) => setToUnitIdx(Number(e.target.value))}
                className="w-full appearance-none bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-3 text-sm font-medium text-emerald-400 outline-none focus:border-emerald-500/50 cursor-pointer pr-10 transition-all"
              >
                {category.units.map((unit, idx) => (
                  <option key={unit.symbol} value={idx}>
                    {unit.symbol} — {unit.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Conversion formula info */}
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5" />
            <span>
              1 {fromUnit.symbol} = {formatNumber(convert(1, fromUnit, toUnit), 8)} {toUnit.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-slate-400" />
          Quick Conversions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {category.presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePreset(preset)}
              className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all text-left group"
            >
              <p className="text-sm font-medium text-slate-300 group-hover:text-white">
                {preset.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {preset.from} {preset.fromUnit} → {preset.toUnit}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Reference table */}
      <div className="mt-8 rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300">
            All {category.label} Units
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500">
                <th className="text-left px-5 py-2 font-medium">Symbol</th>
                <th className="text-left px-5 py-2 font-medium">Name</th>
                <th className="text-right px-5 py-2 font-medium">Equals</th>
              </tr>
            </thead>
            <tbody>
              {category.units.map((unit) => {
                const baseUnit = category.units.find((u) => u.symbol === category.baseUnit)!;
                const oneInBase = convert(1, unit, baseUnit);
                return (
                  <tr
                    key={unit.symbol}
                    className="border-b border-slate-700/30 hover:bg-brand-500/5 cursor-pointer transition-colors"
                    onClick={() => {
                      const idx = category.units.findIndex((u) => u.symbol === unit.symbol);
                      setFromUnitIdx(idx);
                      setFromValue('1');
                    }}
                  >
                    <td className="px-5 py-2.5 font-mono text-brand-400">
                      {unit.symbol}
                    </td>
                    <td className="px-5 py-2.5 text-slate-300">{unit.label}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-400">
                      1 {unit.symbol} = {formatNumber(oneInBase, 6)} {category.baseUnit}
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
