'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Hash, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type StyleType = 'decimal' | 'currency' | 'percent' | 'unit' | 'compact';

interface FormatOptions {
  locale: string;
  style: StyleType;
  currency: string;
  currencyDisplay: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  currencySign: 'standard' | 'accounting';
  unit: string;
  unitDisplay: 'long' | 'short' | 'narrow';
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  minimumIntegerDigits: number;
  minimumSignificantDigits: number;
  maximumSignificantDigits: number;
  notation: 'standard' | 'scientific' | 'engineering' | 'compact';
  compactDisplay: 'short' | 'long';
  signDisplay: 'auto' | 'always' | 'exceptZero' | 'negative' | 'never';
  roundingMode: string;
  trailingZeroDisplay: 'auto' | 'stripIfInteger';
  useGrouping: boolean | 'auto';
}

interface Preset {
  label: string;
  description: string;
  value: number;
  options: FormatOptions;
}

const DEFAULTS: FormatOptions = {
  locale: 'en-US',
  style: 'decimal',
  currency: 'USD',
  currencyDisplay: 'symbol',
  currencySign: 'standard',
  unit: 'kilometer',
  unitDisplay: 'short',
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
  minimumIntegerDigits: 1,
  minimumSignificantDigits: 0,
  maximumSignificantDigits: 0,
  notation: 'standard',
  compactDisplay: 'short',
  signDisplay: 'auto',
  roundingMode: 'halfExpand',
  trailingZeroDisplay: 'auto',
  useGrouping: true,
};

const PRESETS: Preset[] = [
  {
    label: 'US Dollar',
    description: '$1,234.56 with symbol',
    value: 1234.56,
    options: { ...DEFAULTS, style: 'currency', currency: 'USD', currencyDisplay: 'symbol' },
  },
  {
    label: 'Euro (accounting)',
    description: 'Accounting sign for negatives',
    value: -1234.56,
    options: { ...DEFAULTS, style: 'currency', currency: 'EUR', currencyDisplay: 'symbol', currencySign: 'accounting' },
  },
  {
    label: 'Japanese Yen',
    description: 'No decimal places',
    value: 1234.56,
    options: { ...DEFAULTS, locale: 'ja-JP', style: 'currency', currency: 'JPY', maximumFractionDigits: 0 },
  },
  {
    label: 'Percent (German)',
    description: '42 % with German locale',
    value: 0.42,
    options: { ...DEFAULTS, locale: 'de-DE', style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    label: 'Unit: Length',
    description: '5.3 km with unit display',
    value: 5.3,
    options: { ...DEFAULTS, style: 'unit', unit: 'kilometer', unitDisplay: 'long', maximumFractionDigits: 1 },
  },
  {
    label: 'Compact: Social',
    description: '1.2M / 12.3K popular on social media',
    value: 1234567,
    options: { ...DEFAULTS, notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 },
  },
  {
    label: 'Scientific',
    description: '1.235E3 notation',
    value: 1234.56,
    options: { ...DEFAULTS, notation: 'scientific', minimumFractionDigits: 3, maximumFractionDigits: 3 },
  },
  {
    label: 'Indian (INR)',
    description: 'Indian numbering (lakhs/crores)',
    value: 1234567.89,
    options: { ...DEFAULTS, locale: 'en-IN', style: 'currency', currency: 'INR', currencyDisplay: 'symbol', maximumFractionDigits: 2 },
  },
  {
    label: 'Always sign',
    description: 'Shows + for positive, minus for negative',
    value: 42,
    options: { ...DEFAULTS, signDisplay: 'always' },
  },
  {
    label: 'Pad integers',
    description: '001234 with min 6 integer digits',
    value: 1234,
    options: { ...DEFAULTS, minimumIntegerDigits: 6, useGrouping: false },
  },
  {
    label: 'Arabic locale',
    description: 'Eastern Arabic numerals',
    value: 1234.56,
    options: { ...DEFAULTS, locale: 'ar-SA', maximumFractionDigits: 2 },
  },
];

const TOP_LOCALES = [
  'en-US', 'en-GB', 'en-IN', 'en-CA', 'en-AU',
  'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR',
  'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW',
  'ar-SA', 'hi-IN', 'ru-RU', 'tr-TR', 'nl-NL', 'sv-SE',
  'pl-PL', 'th-TH', 'vi-VN', 'id-ID', 'ms-MY', 'sw-KE',
];

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'KRW', 'CAD', 'AUD', 'CHF',
  'BRL', 'RUB', 'TRY', 'NGN', 'MXN', 'SGD', 'HKD', 'SEK', 'NOK', 'DKK',
  'PLN', 'THB', 'VND', 'IDR', 'MYR', 'PHP', 'ZAR', 'AED', 'SAR', 'ARS',
];

const UNITS = [
  'millimeter', 'centimeter', 'meter', 'kilometer', 'mile',
  'gram', 'kilogram', 'ounce', 'pound',
  'milliliter', 'liter', 'gallon',
  'square-meter', 'hectare', 'acre',
  'kilometer-per-hour', 'mile-per-hour',
  'celsius', 'fahrenheit',
  'byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte',
  'second', 'minute', 'hour', 'day', 'week', 'month', 'year',
];

const ROUNDING_MODES = [
  { value: 'ceil', label: 'ceil - round toward +infinity' },
  { value: 'floor', label: 'floor - round toward -infinity' },
  { value: 'expand', label: 'expand - round away from 0' },
  { value: 'trunc', label: 'trunc - round toward 0' },
  { value: 'halfCeil', label: 'halfCeil - ties toward +infinity' },
  { value: 'halfFloor', label: 'halfFloor - ties toward -infinity' },
  { value: 'halfExpand', label: 'halfExpand - ties away from 0 (default)' },
  { value: 'halfTrunc', label: 'halfTrunc - ties toward 0' },
  { value: 'halfEven', label: 'halfEven - ties toward even' },
];

function buildIntlOptions(opts: FormatOptions): Intl.NumberFormatOptions {
  const o: Intl.NumberFormatOptions = {
    style: opts.style === 'compact' ? 'decimal' : opts.style,
  };

  if (opts.currency && opts.style === 'currency') {
    o.currency = opts.currency;
    o.currencyDisplay = opts.currencyDisplay;
    o.currencySign = opts.currencySign;
  }
  if (opts.unit && opts.style === 'unit') {
    o.unit = opts.unit;
    o.unitDisplay = opts.unitDisplay;
  }
  if (opts.notation && opts.notation !== 'standard') {
    o.notation = opts.notation;
    if (opts.notation === 'compact') o.compactDisplay = opts.compactDisplay;
  }
  if (opts.minimumSignificantDigits > 0) {
    o.minimumSignificantDigits = opts.minimumSignificantDigits;
    o.maximumSignificantDigits = opts.maximumSignificantDigits || opts.minimumSignificantDigits;
  } else {
    o.minimumFractionDigits = opts.minimumFractionDigits;
    o.maximumFractionDigits = opts.maximumFractionDigits;
  }
  if (opts.minimumIntegerDigits > 1) o.minimumIntegerDigits = opts.minimumIntegerDigits;
  if (opts.signDisplay !== 'auto') o.signDisplay = opts.signDisplay;
  if (opts.roundingMode !== 'halfExpand') o.roundingMode = opts.roundingMode as Intl.NumberFormatOptions['roundingMode'];
  if (opts.trailingZeroDisplay !== 'auto') o.trailingZeroDisplay = opts.trailingZeroDisplay;
  if (opts.useGrouping !== 'auto' && typeof opts.useGrouping === 'boolean' && !opts.useGrouping) {
    o.useGrouping = false;
  }

  return o;
}

function tryFormat(value: number, opts: FormatOptions): { result: string; error: string | null } {
  try {
    const intlOpts = buildIntlOptions(opts);
    const result = new Intl.NumberFormat(opts.locale, intlOpts).format(value);
    return { result, error: null };
  } catch (e: unknown) {
    return { result: '', error: e instanceof Error ? e.message : String(e) };
  }
}

function generateCode(value: number, opts: FormatOptions): string {
  const intlOpts = buildIntlOptions(opts);
  const optStr = JSON.stringify(intlOpts, null, 2);
  const formatted = optStr.replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, '$1:');
  return `new Intl.NumberFormat('${opts.locale}', ${formatted}).format(${value})`;
}

function resolvedToString(resolved: Intl.ResolvedNumberFormatOptions): string {
  const keys: (keyof Intl.ResolvedNumberFormatOptions)[] = [
    'locale', 'numberingSystem',
    'style', 'currency', 'currencyDisplay', 'currencySign',
    'unit', 'unitDisplay',
    'notation', 'compactDisplay',
    'minimumIntegerDigits', 'minimumFractionDigits', 'maximumFractionDigits',
    'minimumSignificantDigits', 'maximumSignificantDigits',
    'signDisplay', 'roundingMode', 'trailingZeroDisplay',
    'useGrouping',
  ];
  return keys
    .filter(k => k in resolved)
    .map(k => `${k}: ${JSON.stringify((resolved as unknown as Record<string, unknown>)[k])}`)
    .join('\n');
}

function SelectControl({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input h-9 text-sm bg-surface-light border border-slate-700/60 rounded-md px-2 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="input h-9 text-sm bg-surface-light border border-slate-700/60 rounded-md px-3 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none font-mono"
      />
    </div>
  );
}

export default function NumberFormatExplorer() {
  const [opts, setOpts] = useState<FormatOptions>(DEFAULTS);
  const [value, setValue] = useState('1234.56');

  const numericValue = useMemo(() => {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  }, [value]);

  const set = useCallback(<K extends keyof FormatOptions>(k: K, v: FormatOptions[K]) => {
    setOpts(prev => ({ ...prev, [k]: v }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setOpts(preset.options);
    setValue(String(preset.value));
  }, []);

  const reset = useCallback(() => {
    setOpts(DEFAULTS);
    setValue('1234.56');
  }, []);

  const { result, error } = useMemo(
    () => tryFormat(numericValue, opts),
    [numericValue, opts],
  );

  const code = useMemo(() => generateCode(numericValue, opts), [numericValue, opts]);

  const resolved = useMemo(() => {
    try {
      const fmt = new Intl.NumberFormat(opts.locale, buildIntlOptions(opts));
      return resolvedToString(fmt.resolvedOptions());
    } catch {
      return 'Unable to resolve options';
    }
  }, [opts]);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  }, []);

  return (
    <ToolLayout
      title="Number Format Explorer"
      description="Explore JavaScript Intl.NumberFormat interactively. Format numbers as currency, percent, units, scientific, or compact notation across any locale."
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Number</label>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Enter a number"
            className="input h-9 w-40 text-sm bg-surface-light border border-slate-700/60 rounded-md px-3 py-1 text-slate-200 font-mono focus:border-brand-400/50 focus:outline-none"
          />
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 bg-surface-light border border-slate-700/50 rounded-md transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Presets</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              title={p.description}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface-light border border-slate-700/50 text-slate-300 hover:border-brand-400/40 hover:text-brand-300 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-brand-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Formatted Output</span>
        </div>
        {error ? (
          <div className="text-base text-red-400 font-mono">{error}</div>
        ) : (
          <div className="text-3xl sm:text-4xl font-mono text-slate-100 break-all">
            {result}
          </div>
        )}
        {result && (
          <button
            onClick={() => handleCopy(result, 'Formatted output')}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-500/10 text-brand-300 border border-brand-500/30 rounded-md hover:bg-brand-500/20 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy: {result}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-400" />
            Locale and Style
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Locale (BCP 47 tag)</label>
            <input
              type="text"
              value={opts.locale}
              onChange={e => set('locale', e.target.value)}
              list="nf-locales"
              className="input h-9 text-sm bg-surface-light border border-slate-700/60 rounded-md px-3 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none font-mono"
            />
            <datalist id="nf-locales">
              {TOP_LOCALES.map(l => <option key={l} value={l} />)}
            </datalist>
          </div>

          <SelectControl
            label="Style"
            value={opts.style}
            onChange={v => set('style', v as StyleType)}
            options={[
              { value: 'decimal', label: 'decimal - plain number' },
              { value: 'currency', label: 'currency - money' },
              { value: 'percent', label: 'percent - 0.5 becomes 50%' },
              { value: 'unit', label: 'unit - 5 km' },
              { value: 'compact', label: 'compact (via notation)' },
            ]}
          />

          {opts.style === 'currency' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-brand-500/20 bg-brand-500/5">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Currency (ISO 4217)</label>
                <input
                  type="text"
                  value={opts.currency}
                  onChange={e => set('currency', e.target.value)}
                  list="nf-currencies"
                  className="input h-9 text-sm bg-surface-light border border-slate-700/60 rounded-md px-3 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none font-mono"
                />
                <datalist id="nf-currencies">
                  {CURRENCIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <SelectControl
                label="Currency Display"
                value={opts.currencyDisplay}
                onChange={v => set('currencyDisplay', v as FormatOptions['currencyDisplay'])}
                options={[
                  { value: 'symbol', label: 'symbol ($)' },
                  { value: 'narrowSymbol', label: 'narrowSymbol' },
                  { value: 'code', label: 'code (USD)' },
                  { value: 'name', label: 'name (US dollars)' },
                ]}
              />
              <SelectControl
                label="Currency Sign"
                value={opts.currencySign}
                onChange={v => set('currencySign', v as FormatOptions['currencySign'])}
                options={[
                  { value: 'standard', label: 'standard' },
                  { value: 'accounting', label: 'accounting' },
                ]}
              />
            </div>
          )}

          {opts.style === 'unit' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-brand-500/20 bg-brand-500/5">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Unit</label>
                <input
                  type="text"
                  value={opts.unit}
                  onChange={e => set('unit', e.target.value)}
                  list="nf-units"
                  className="input h-9 text-sm bg-surface-light border border-slate-700/60 rounded-md px-3 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none font-mono"
                />
                <datalist id="nf-units">
                  {UNITS.map(u => <option key={u} value={u} />)}
                </datalist>
              </div>
              <SelectControl
                label="Unit Display"
                value={opts.unitDisplay}
                onChange={v => set('unitDisplay', v as FormatOptions['unitDisplay'])}
                options={[
                  { value: 'long', label: 'long (kilometers)' },
                  { value: 'short', label: 'short (km)' },
                  { value: 'narrow', label: 'narrow (km)' },
                ]}
              />
            </div>
          )}

          <SelectControl
            label="Notation"
            value={opts.notation}
            onChange={v => set('notation', v as FormatOptions['notation'])}
            options={[
              { value: 'standard', label: 'standard' },
              { value: 'scientific', label: 'scientific (1.235E3)' },
              { value: 'engineering', label: 'engineering (1.235E3)' },
              { value: 'compact', label: 'compact (1.2K)' },
            ]}
          />

          {opts.notation === 'compact' && (
            <SelectControl
              label="Compact Display"
              value={opts.compactDisplay}
              onChange={v => set('compactDisplay', v as FormatOptions['compactDisplay'])}
              options={[
                { value: 'short', label: 'short (1.2K)' },
                { value: 'long', label: 'long (1.2 thousand)' },
              ]}
            />
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-brand-400" />
            Digits and Precision
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Min Fraction Digits" value={opts.minimumFractionDigits} min={0} max={20} onChange={v => set('minimumFractionDigits', v)} />
            <NumberInput label="Max Fraction Digits" value={opts.maximumFractionDigits} min={0} max={20} onChange={v => set('maximumFractionDigits', v)} />
            <NumberInput label="Min Integer Digits" value={opts.minimumIntegerDigits} min={1} max={21} onChange={v => set('minimumIntegerDigits', v)} />
            <NumberInput label="Min Sig. Digits" value={opts.minimumSignificantDigits} min={0} max={21} onChange={v => set('minimumSignificantDigits', v)} />
            <NumberInput label="Max Sig. Digits" value={opts.maximumSignificantDigits} min={0} max={21} onChange={v => set('maximumSignificantDigits', v)} />
          </div>

          <SelectControl
            label="Sign Display"
            value={opts.signDisplay}
            onChange={v => set('signDisplay', v as FormatOptions['signDisplay'])}
            options={[
              { value: 'auto', label: 'auto - sign only for negative' },
              { value: 'always', label: 'always - +42, -7' },
              { value: 'exceptZero', label: 'exceptZero - +42, 0' },
              { value: 'negative', label: 'negative - -7, 42' },
              { value: 'never', label: 'never - no sign at all' },
            ]}
          />

          <SelectControl
            label="Rounding Mode"
            value={opts.roundingMode}
            onChange={v => set('roundingMode', v)}
            options={ROUNDING_MODES}
          />

          <SelectControl
            label="Trailing Zero Display"
            value={opts.trailingZeroDisplay}
            onChange={v => set('trailingZeroDisplay', v as FormatOptions['trailingZeroDisplay'])}
            options={[
              { value: 'auto', label: 'auto - keep trailing zeros' },
              { value: 'stripIfInteger', label: 'stripIfInteger' },
            ]}
          />

          <SelectControl
            label="Grouping"
            value={String(opts.useGrouping)}
            onChange={v =>
              set('useGrouping', v === 'true' ? true as const : v === 'false' ? false as const : 'auto' as const)
            }
            options={[
              { value: 'auto', label: 'auto (locale default)' },
              { value: 'true', label: 'true (force separator)' },
              { value: 'false', label: 'false (no separator)' },
            ]}
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Generated JavaScript
          </span>
          <button
            onClick={() => handleCopy(code, 'Code')}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 hover:text-brand-300 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 font-mono border border-slate-800 overflow-x-auto">
          {code}
        </pre>
      </div>

      {resolved && (
        <div className="mt-6">
          <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Resolved Options (browser)</h4>
          <pre className="p-3 bg-slate-950/50 rounded-lg text-xs text-slate-400 font-mono border border-slate-800 overflow-x-auto">
            {resolved}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50 text-sm text-slate-400">
        <p className="font-medium text-slate-300 mb-1">About Intl.NumberFormat</p>
        <p>
          The <code className="text-brand-300 bg-brand-500/10 px-1 rounded text-xs">Intl.NumberFormat</code> API is a built-in browser feature that formats numbers
          according to locale-specific conventions. It handles currency, percentages, units, grouping separators,
          decimal marks, and more — no libraries needed. Supported in all modern browsers since 2016.
        </p>
      </div>
    </ToolLayout>
  );
}
