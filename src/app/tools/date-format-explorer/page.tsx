'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Clock, Globe, Calendar, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface FormatOptions {
  locale: string;
  dateStyle: '' | 'full' | 'long' | 'medium' | 'short';
  timeStyle: '' | 'full' | 'long' | 'medium' | 'short';
  weekday: '' | 'long' | 'short' | 'narrow';
  era: '' | 'long' | 'short' | 'narrow';
  year: '' | 'numeric' | '2-digit';
  month: '' | 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day: '' | 'numeric' | '2-digit';
  hour: '' | 'numeric' | '2-digit';
  minute: '' | 'numeric' | '2-digit';
  second: '' | 'numeric' | '2-digit';
  timeZoneName: '' | 'long' | 'short' | 'shortOffset' | 'longOffset' | 'shortGeneric' | 'longGeneric';
  hour12: '' | 'true' | 'false';
  hourCycle: '' | 'h11' | 'h12' | 'h23' | 'h24';
  timeZone: string;
}

interface Preset {
  label: string;
  description: string;
  options: FormatOptions;
}

type FormatMode = 'single' | 'compare';

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    label: 'ISO 8601',
    description: 'Machine-readable international standard',
    options: {
      locale: 'en-CA', dateStyle: '', timeStyle: '', weekday: '', era: '', year: 'numeric',
      month: '2-digit', day: '2-digit', hour: '', minute: '', second: '', timeZoneName: '',
      hour12: '', hourCycle: '', timeZone: 'UTC',
    },
  },
  {
    label: 'US Short',
    description: 'American MM/DD/YYYY with 12-hour time',
    options: {
      locale: 'en-US', dateStyle: '', timeStyle: '', weekday: '', era: '', year: 'numeric',
      month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '',
      timeZoneName: '', hour12: 'true', hourCycle: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  },
  {
    label: 'US Long',
    description: 'Full weekday, month name, day, year',
    options: {
      locale: 'en-US', dateStyle: 'full', timeStyle: '', weekday: '', era: '', year: '',
      month: '', day: '', hour: '', minute: '', second: '', timeZoneName: '',
      hour12: '', hourCycle: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  },
  {
    label: 'German',
    description: 'Deutsche Datumsformatierung DD.MM.YYYY',
    options: {
      locale: 'de-DE', dateStyle: '', timeStyle: '', weekday: '', era: '', year: 'numeric',
      month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', second: '',
      timeZoneName: '', hour12: '', hourCycle: '', timeZone: 'Europe/Berlin',
    },
  },
  {
    label: 'Japanese',
    description: 'Japanese era year (Reiwa) with kanji',
    options: {
      locale: 'ja-JP-u-ca-japanese', dateStyle: '', timeStyle: '', weekday: 'short', era: 'short',
      year: 'numeric', month: 'long', day: 'numeric', hour: '', minute: '', second: '',
      timeZoneName: '', hour12: '', hourCycle: '', timeZone: 'Asia/Tokyo',
    },
  },
  {
    label: 'Arabic',
    description: 'Eastern Arabic numerals, Hijri calendar',
    options: {
      locale: 'ar-SA', dateStyle: '', timeStyle: '', weekday: '', era: '', year: 'numeric',
      month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '',
      timeZoneName: '', hour12: 'true', hourCycle: '', timeZone: 'Asia/Riyadh',
    },
  },
  {
    label: 'Log Timestamp',
    description: 'Compact YYYY-MM-DD HH:MM:SS 24h for logs',
    options: {
      locale: 'en-CA', dateStyle: '', timeStyle: '', weekday: '', era: '', year: 'numeric',
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: '', hour12: 'false', hourCycle: 'h23', timeZone: 'UTC',
    },
  },
  {
    label: 'Verbose',
    description: 'Everything: weekday, date, time, timezone',
    options: {
      locale: 'en-US', dateStyle: '', timeStyle: '', weekday: 'long', era: 'short', year: 'numeric',
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'long', hour12: 'true', hourCycle: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  },
];

// ── Common locales ──────────────────────────────────────────────────────────

const TOP_LOCALES = [
  'en-US', 'en-GB', 'en-CA', 'en-AU',
  'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR',
  'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW',
  'ar-SA', 'hi-IN', 'ru-RU', 'tr-TR', 'nl-NL', 'sv-SE',
  'pl-PL', 'th-TH', 'vi-VN', 'id-ID', 'ms-MY',
];

const COMMON_TZ = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function optionsToIntl(opts: FormatOptions): Intl.DateTimeFormatOptions {
  const result: Intl.DateTimeFormatOptions = {};
  if (opts.dateStyle) result.dateStyle = opts.dateStyle;
  if (opts.timeStyle) result.timeStyle = opts.timeStyle;
  if (opts.weekday) result.weekday = opts.weekday;
  if (opts.era) result.era = opts.era;
  if (opts.year) result.year = opts.year;
  if (opts.month) result.month = opts.month;
  if (opts.day) result.day = opts.day;
  if (opts.hour) result.hour = opts.hour;
  if (opts.minute) result.minute = opts.minute;
  if (opts.second) result.second = opts.second;
  if (opts.timeZoneName) result.timeZoneName = opts.timeZoneName;
  if (opts.hour12 === 'true') result.hour12 = true;
  if (opts.hour12 === 'false') result.hour12 = false;
  if (opts.hourCycle) result.hourCycle = opts.hourCycle;
  if (opts.timeZone) result.timeZone = opts.timeZone;
  return result;
}

function generateCode(opts: FormatOptions): string {
  const intlOpts = optionsToIntl(opts);
  const optStr = JSON.stringify(intlOpts, null, 2).replace(/"([^"]+)"/g, (_, k) => {
    // Use unquoted keys for standard JS style
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)) return k;
    return `"${k}"`;
  });
  const tz = opts.timeZone;
  let locale = opts.locale;
  if (tz && tz !== 'UTC' && tz !== Intl.DateTimeFormat().resolvedOptions().timeZone) {
    return `new Intl.DateTimeFormat('${locale}', {\n  ...${optStr},\n  timeZone: '${tz}',\n}).format(new Date())`;
  }
  return `new Intl.DateTimeFormat('${locale}', ${optStr}).format(new Date())`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tryFormat(date: Date, opts: FormatOptions): { result: string; error: string | null } {
  try {
    const intlOpts = optionsToIntl(opts);
    const result = new Intl.DateTimeFormat(opts.locale, intlOpts).format(date);
    return { result, error: null };
  } catch (e: unknown) {
    return { result: '', error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Resolved options display ────────────────────────────────────────────────

function resolvedToString(resolved: Intl.ResolvedDateTimeFormatOptions): string {
  const lines: string[] = [];
  // Order by relevance
  const keys: (keyof Intl.ResolvedDateTimeFormatOptions)[] = [
    'locale', 'calendar', 'numberingSystem',
    'timeZone', 'hourCycle',
    'year', 'month', 'day', 'weekday', 'era',
    'hour', 'minute', 'second',
    'hour12', 'dateStyle', 'timeStyle', 'timeZoneName',
  ];
  for (const k of keys) {
    if (k in resolved) {
      const val = (resolved as unknown as Record<string, unknown>)[k];
      lines.push(`${k}: ${JSON.stringify(val)}`);
    }
  }
  return lines.join('\n');
}

// ── Component ───────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: FormatOptions = {
  locale: 'en-US',
  dateStyle: '',
  timeStyle: '',
  weekday: '',
  era: '',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '',
  minute: '',
  second: '',
  timeZoneName: '',
  hour12: '',
  hourCycle: '',
  timeZone: '',
};

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

export default function DateFormatExplorer() {
  const [mode, setMode] = useState<FormatMode>('single');
  const [opts, setOpts] = useState<FormatOptions>(DEFAULT_OPTIONS);
  const [compareOpts, setCompareOpts] = useState<FormatOptions>({
    ...DEFAULT_OPTIONS,
    locale: 'de-DE',
    timeZone: 'Europe/Berlin',
  });
  const [customDate, setCustomDate] = useState<string>('');
  const [now, setNow] = useState(new Date());

  // Update "now" every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const sampleDate = useMemo(() => {
    if (customDate) {
      const d = new Date(customDate);
      return isNaN(d.getTime()) ? now : d;
    }
    return now;
  }, [customDate, now]);

  const set = useCallback(<K extends keyof FormatOptions>(k: K, v: FormatOptions[K]) => {
    setOpts(prev => ({ ...prev, [k]: v }));
  }, []);

  const setCompare = useCallback(<K extends keyof FormatOptions>(k: K, v: FormatOptions[K]) => {
    setCompareOpts(prev => ({ ...prev, [k]: v }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setOpts(preset.options);
  }, []);

  const reset = useCallback(() => {
    setOpts(DEFAULT_OPTIONS);
  }, []);

  const primary = useMemo(() => tryFormat(sampleDate, opts), [sampleDate, opts]);
  const secondary = useMemo(() => tryFormat(sampleDate, compareOpts), [sampleDate, compareOpts]);
  const code = useMemo(() => generateCode(opts), [opts]);
  const compareCode = useMemo(() => generateCode(compareOpts), [compareOpts]);

  const resolvedPrimary = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat(opts.locale, optionsToIntl(opts));
      return resolvedToString(fmt.resolvedOptions());
    } catch {
      return 'Unable to resolve options';
    }
  }, [opts]);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  }, []);

  const hasDateStyle = opts.dateStyle !== '';
  const hasTimeStyle = opts.timeStyle !== '';

  return (
    <ToolLayout
      title="Date & Time Format Explorer"
      description="Explore JavaScript Intl.DateTimeFormat interactively. Tweak every option — locale, calendar, timezone, hour cycle — and see live formatted output with copyable code."
    >
      {/* Mode toggle & presets */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center bg-surface-light rounded-lg border border-slate-700/50 p-0.5">
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'single' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Single Format
          </button>
          <button
            onClick={() => setMode('compare')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'compare' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Compare
          </button>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 bg-surface-light border border-slate-700/50 rounded-md transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Presets */}
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

      {/* Live Preview */}
      <div className="mb-8 p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-brand-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            {customDate ? 'Custom Date' : 'Live Clock'}
          </span>
          <span className="text-xs text-slate-500 ml-auto">{now.toISOString()}</span>
        </div>
        {/* Primary result */}
        <div className="text-2xl sm:text-3xl font-mono text-slate-100 mb-1 break-all">
          {primary.error ? (
            <span className="text-red-400 text-base">{primary.error}</span>
          ) : (
            primary.result
          )}
        </div>
        {mode === 'compare' && !secondary.error && (
          <div className="text-2xl sm:text-3xl font-mono text-brand-300 break-all mt-2 border-t border-slate-700/40 pt-2">
            {secondary.result}
          </div>
        )}
        {/* Custom date picker */}
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-slate-500">
            <input
              type="checkbox"
              checked={!!customDate}
              onChange={e => {
                if (!e.target.checked) setCustomDate('');
                else setCustomDate(now.toISOString().slice(0, 16));
              }}
              className="mr-1.5 accent-brand-500"
            />
            Use custom date
          </label>
          {customDate && (
            <input
              type="datetime-local"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="input h-8 text-xs bg-surface-light border border-slate-700/60 rounded-md px-2 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none"
            />
          )}
        </div>
      </div>

      <div className={`grid gap-6 ${mode === 'compare' ? 'lg:grid-cols-2' : ''}`}>
        {/* Column A */}
        <FormatColumn
          title="Format A"
          opts={opts}
          setOpts={set}
          code={code}
          result={primary.result}
          onCopy={handleCopy}
          resolved={resolvedPrimary}
          showResolved={mode === 'single'}
        />
        {mode === 'compare' && (
          <FormatColumn
            title="Format B"
            opts={compareOpts}
            setOpts={setCompare}
            code={compareCode}
            result={secondary.result}
            onCopy={handleCopy}
            resolved={''}
            showResolved={false}
          />
        )}
      </div>
    </ToolLayout>
  );
}

// ── Format Column ───────────────────────────────────────────────────────────

function FormatColumn({
  title,
  opts,
  setOpts,
  code,
  result,
  onCopy,
  resolved,
  showResolved,
}: {
  title: string;
  opts: FormatOptions;
  setOpts: <K extends keyof FormatOptions>(k: K, v: FormatOptions[K]) => void;
  code: string;
  result: string;
  onCopy: (text: string, label: string) => void;
  resolved: string;
  showResolved: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Globe className="w-4 h-4 text-brand-400" />
        {title}
      </h3>

      {/* Locale & Timezone row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Locale</label>
          <input
            type="text"
            value={opts.locale}
            onChange={e => setOpts('locale', e.target.value)}
            list="locales-list"
            className="input h-9 text-sm bg-surface-light border border-slate-700/60 rounded-md px-3 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none font-mono"
          />
          <datalist id="locales-list">
            {TOP_LOCALES.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Time Zone</label>
          <input
            type="text"
            value={opts.timeZone}
            onChange={e => setOpts('timeZone', e.target.value)}
            placeholder="Browser default"
            list="tz-list"
            className="input h-9 text-sm bg-surface-light border border-slate-700/60 rounded-md px-3 py-1 text-slate-200 focus:border-brand-400/50 focus:outline-none font-mono"
          />
          <datalist id="tz-list">
            {COMMON_TZ.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>

      {/* Date/Time Styles */}
      <fieldset className="border border-slate-700/40 rounded-lg p-3">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Date/Time Styles (top-level)</legend>
        <div className="grid grid-cols-2 gap-3">
          <SelectControl label="dateStyle" value={opts.dateStyle} onChange={v => setOpts('dateStyle', v as FormatOptions['dateStyle'])}
            options={[
              { value: '', label: '(none)' },
              { value: 'full', label: 'full — "Tuesday, June 3, 2026"' },
              { value: 'long', label: 'long — "June 3, 2026"' },
              { value: 'medium', label: 'medium — "Jun 3, 2026"' },
              { value: 'short', label: 'short — "6/3/26"' },
            ]}
          />
          <SelectControl label="timeStyle" value={opts.timeStyle} onChange={v => setOpts('timeStyle', v as FormatOptions['timeStyle'])}
            options={[
              { value: '', label: '(none)' },
              { value: 'full', label: 'full — "2:15:30 PM EST"' },
              { value: 'long', label: 'long — "2:15:30 PM EST"' },
              { value: 'medium', label: 'medium — "2:15:30 PM"' },
              { value: 'short', label: 'short — "2:15 PM"' },
            ]}
          />
        </div>
      </fieldset>

      {/* Component-level options */}
      <fieldset className="border border-slate-700/40 rounded-lg p-3">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Component Options (granular)</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <SelectControl label="weekday" value={opts.weekday} onChange={v => setOpts('weekday', v as FormatOptions['weekday'])}
            options={[{ value: '', label: '(none)' }, { value: 'long', label: 'long' }, { value: 'short', label: 'short' }, { value: 'narrow', label: 'narrow' }]}
          />
          <SelectControl label="era" value={opts.era} onChange={v => setOpts('era', v as FormatOptions['era'])}
            options={[{ value: '', label: '(none)' }, { value: 'long', label: 'long' }, { value: 'short', label: 'short' }, { value: 'narrow', label: 'narrow' }]}
          />
          <SelectControl label="year" value={opts.year} onChange={v => setOpts('year', v as FormatOptions['year'])}
            options={[{ value: '', label: '(none)' }, { value: 'numeric', label: 'numeric' }, { value: '2-digit', label: '2-digit' }]}
          />
          <SelectControl label="month" value={opts.month} onChange={v => setOpts('month', v as FormatOptions['month'])}
            options={[
              { value: '', label: '(none)' }, { value: 'numeric', label: 'numeric' },
              { value: '2-digit', label: '2-digit' }, { value: 'long', label: 'long' },
              { value: 'short', label: 'short' }, { value: 'narrow', label: 'narrow' },
            ]}
          />
          <SelectControl label="day" value={opts.day} onChange={v => setOpts('day', v as FormatOptions['day'])}
            options={[{ value: '', label: '(none)' }, { value: 'numeric', label: 'numeric' }, { value: '2-digit', label: '2-digit' }]}
          />
          <SelectControl label="hour" value={opts.hour} onChange={v => setOpts('hour', v as FormatOptions['hour'])}
            options={[{ value: '', label: '(none)' }, { value: 'numeric', label: 'numeric' }, { value: '2-digit', label: '2-digit' }]}
          />
          <SelectControl label="minute" value={opts.minute} onChange={v => setOpts('minute', v as FormatOptions['minute'])}
            options={[{ value: '', label: '(none)' }, { value: 'numeric', label: 'numeric' }, { value: '2-digit', label: '2-digit' }]}
          />
          <SelectControl label="second" value={opts.second} onChange={v => setOpts('second', v as FormatOptions['second'])}
            options={[{ value: '', label: '(none)' }, { value: 'numeric', label: 'numeric' }, { value: '2-digit', label: '2-digit' }]}
          />
          <SelectControl label="timeZoneName" value={opts.timeZoneName} onChange={v => setOpts('timeZoneName', v as FormatOptions['timeZoneName'])}
            options={[
              { value: '', label: '(none)' }, { value: 'short', label: 'short' },
              { value: 'long', label: 'long' },
              { value: 'shortOffset', label: 'shortOffset' }, { value: 'longOffset', label: 'longOffset' },
              { value: 'shortGeneric', label: 'shortGeneric' }, { value: 'longGeneric', label: 'longGeneric' },
            ]}
          />
          <SelectControl label="hourCycle" value={opts.hourCycle} onChange={v => setOpts('hourCycle', v as FormatOptions['hourCycle'])}
            options={[
              { value: '', label: '(default)' },
              { value: 'h11', label: 'h11 (0-11)' },
              { value: 'h12', label: 'h12 (1-12)' },
              { value: 'h23', label: 'h23 (0-23)' },
              { value: 'h24', label: 'h24 (1-24)' },
            ]}
          />
          <SelectControl label="hour12" value={opts.hour12} onChange={v => setOpts('hour12', v as FormatOptions['hour12'])}
            options={[
              { value: '', label: '(default)' },
              { value: 'true', label: 'true (12h)' },
              { value: 'false', label: 'false (24h)' },
            ]}
          />
        </div>
      </fieldset>

      {/* Code snippet */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Generated Code
          </span>
          <button
            onClick={() => onCopy(code, 'Code')}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 hover:text-brand-300 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 font-mono border border-slate-800 overflow-x-auto">
{escapeHtml(code)}
        </pre>
      </div>

      {/* Copy formatted result */}
      {result && (
        <button
          onClick={() => onCopy(result, 'Formatted date')}
          className="flex items-center gap-1.5 w-full justify-center px-3 py-2 text-sm bg-brand-500/10 text-brand-300 border border-brand-500/30 rounded-md hover:bg-brand-500/20 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy Formatted Output: &ldquo;{result}&rdquo;
        </button>
      )}

      {/* Resolved options (single mode only) */}
      {showResolved && resolved && (
        <div>
          <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Resolved Options</h4>
          <pre className="p-3 bg-slate-950/50 rounded-lg text-xs text-slate-400 font-mono border border-slate-800 overflow-x-auto">
{resolved}
          </pre>
        </div>
      )}
    </div>
  );
}
