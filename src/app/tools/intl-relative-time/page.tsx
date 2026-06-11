'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Clock, Globe, Code2, Search, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type NumericMode = 'always' | 'auto';
type Style = 'long' | 'short' | 'narrow';
type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

interface FormatState {
  locale: string;
  value: number;
  unit: TimeUnit;
  style: Style;
  numeric: NumericMode;
}

interface Preset {
  label: string;
  description: string;
  state: FormatState;
}

// ── Constants ──────────────────────────────────────────────────────────────

const UNITS: { value: TimeUnit; label: string; singular: string; plural: string }[] = [
  { value: 'second', label: 'Seconds', singular: 'second', plural: 'seconds' },
  { value: 'minute', label: 'Minutes', singular: 'minute', plural: 'minutes' },
  { value: 'hour', label: 'Hours', singular: 'hour', plural: 'hours' },
  { value: 'day', label: 'Days', singular: 'day', plural: 'days' },
  { value: 'week', label: 'Weeks', singular: 'week', plural: 'weeks' },
  { value: 'month', label: 'Months', singular: 'month', plural: 'months' },
  { value: 'quarter', label: 'Quarters', singular: 'quarter', plural: 'quarters' },
  { value: 'year', label: 'Years', singular: 'year', plural: 'years' },
];

const POPULAR_LOCALES = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR',
  'zh-CN', 'zh-TW', 'pt-BR', 'pt-PT', 'it-IT', 'ru-RU', 'ar-SA', 'ar-EG',
  'hi-IN', 'bn-IN', 'th-TH', 'vi-VN', 'tr-TR', 'nl-NL', 'pl-PL', 'sv-SE',
  'da-DK', 'fi-FI', 'nb-NO', 'he-IL', 'id-ID', 'ms-MY', 'uk-UA', 'cs-CZ',
  'ro-RO', 'hu-HU', 'el-GR', 'sk-SK', 'bg-BG', 'hr-HR', 'lt-LT', 'lv-LV',
  'et-EE', 'sl-SI', 'sr-RS', 'fa-IR', 'ur-PK', 'ta-IN', 'te-IN', 'ml-IN',
];

const PRESETS: Preset[] = [
  {
    label: 'Yesterday',
    description: '"1 day ago" — short, auto',
    state: { locale: 'en-US', value: -1, unit: 'day', style: 'short', numeric: 'auto' },
  },
  {
    label: 'Next Week',
    description: '"in 1 week" — long, always',
    state: { locale: 'en-US', value: 1, unit: 'week', style: 'long', numeric: 'always' },
  },
  {
    label: 'Three Hours Ago',
    description: '"vor 3 Stunden" — German',
    state: { locale: 'de-DE', value: -3, unit: 'hour', style: 'long', numeric: 'always' },
  },
  {
    label: 'Japanese Auto',
    description: '"昨日" (auto-numeric) — Japanese',
    state: { locale: 'ja-JP', value: -1, unit: 'day', style: 'long', numeric: 'auto' },
  },
  {
    label: 'Spanish Narrow',
    description: '"dentro de 5 min." — narrow style',
    state: { locale: 'es-ES', value: 5, unit: 'minute', style: 'narrow', numeric: 'always' },
  },
  {
    label: 'Two Months Ago',
    description: '"il y a 2 mois" — French short',
    state: { locale: 'fr-FR', value: -2, unit: 'month', style: 'short', numeric: 'always' },
  },
  {
    label: 'Arabic Future',
    description: '"بعد ١٠ سنوات" — Arabic long',
    state: { locale: 'ar-SA', value: 10, unit: 'year', style: 'long', numeric: 'always' },
  },
  {
    label: 'Korean Short',
    description: '"30초 전" — Korean short, auto',
    state: { locale: 'ko-KR', value: -30, unit: 'second', style: 'short', numeric: 'auto' },
  },
  {
    label: 'Russian Auto',
    description: '"на прошлой неделе" — auto-numeric',
    state: { locale: 'ru-RU', value: -1, unit: 'week', style: 'long', numeric: 'auto' },
  },
  {
    label: 'Italian Narrows',
    description: '"10 s fa" — Italian narrow seconds',
    state: { locale: 'it-IT', value: -10, unit: 'second', style: 'narrow', numeric: 'always' },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function getUnitLabel(unit: TimeUnit, value: number): string {
  const entry = UNITS.find(u => u.value === unit);
  if (!entry) return unit;
  return Math.abs(value) === 1 ? entry.singular : entry.plural;
}

function buildIntlOptions(state: FormatState): Intl.RelativeTimeFormatOptions {
  return {
    localeMatcher: 'best fit',
    numeric: state.numeric,
    style: state.style,
  };
}

function formatRelative(state: FormatState): string {
  try {
    const rtf = new Intl.RelativeTimeFormat(state.locale, buildIntlOptions(state));
    return rtf.format(state.value, state.unit);
  } catch {
    return `(Invalid locale: ${state.locale})`;
  }
}

function formatToParts(state: FormatState): Intl.RelativeTimeFormatPart[] {
  try {
    const rtf = new Intl.RelativeTimeFormat(state.locale, buildIntlOptions(state));
    return rtf.formatToParts(state.value, state.unit);
  } catch {
    return [];
  }
}

function generateCode(state: FormatState): string {
  const opts = buildIntlOptions(state);
  const optStr = JSON.stringify(opts, null, 2)
    .replace(/"([^"]+)"/g, (_, k) => {
      // Unquote simple keys
      return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
    });
  return `const rtf = new Intl.RelativeTimeFormat('${state.locale}', ${optStr});

// Format relative time
console.log(rtf.format(${state.value}, '${state.unit}'));
// → "${formatRelative(state)}"

// Inspect parts
console.log(rtf.formatToParts(${state.value}, '${state.unit}'));
// → ${JSON.stringify(formatToParts(state))}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IntlRelativeTimePage() {
  const [state, setState] = useState<FormatState>({
    locale: 'en-US',
    value: -3,
    unit: 'day',
    style: 'long',
    numeric: 'always',
  });
  const [localeSearch, setLocaleSearch] = useState('');
  const [showAllLocales, setShowAllLocales] = useState(false);

  const update = useCallback(<K extends keyof FormatState>(key: K, value: FormatState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const formatted = useMemo(() => formatRelative(state), [state]);
  const parts = useMemo(() => formatToParts(state), [state]);
  const codeStr = useMemo(() => generateCode(state), [state]);

  const filteredLocales = useMemo(() => {
    if (!localeSearch.trim()) return POPULAR_LOCALES;
    const q = localeSearch.toLowerCase();
    return POPULAR_LOCALES.filter(l => l.toLowerCase().includes(q));
  }, [localeSearch]);

  const copyFormatted = () => {
    navigator.clipboard.writeText(formatted);
    toast.success('Formatted text copied!');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeStr);
    toast.success('JavaScript code copied!');
  };

  const reset = () => {
    setState({ locale: 'en-US', value: -3, unit: 'day', style: 'long', numeric: 'always' });
  };

  const applyPreset = (preset: Preset) => {
    setState({ ...preset.state });
  };

  return (
    <ToolLayout
      title="Intl.RelativeTimeFormat Playground"
      description="Explore JavaScript's Intl.RelativeTimeFormat API — format relative times like '3 days ago' or 'in 2 hours' in any locale. Tweak style, numeric mode, and locale to see how every language handles relative time formatting."
      controls={
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            Copy JS Code
          </button>
        </div>
      }
    >
      {/* ── Presets ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="text-left p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-brand-500/30 transition-all group"
            >
              <div className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                {preset.label}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Locale */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Globe className="w-3.5 h-3.5" />
              Locale
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={localeSearch}
                onChange={(e) => setLocaleSearch(e.target.value)}
                placeholder="Search locales..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <div className={`grid grid-cols-3 sm:grid-cols-4 gap-1 mt-2 ${showAllLocales || localeSearch ? '' : 'max-h-[120px]'} overflow-y-auto`}>
              {(showAllLocales || localeSearch ? filteredLocales : POPULAR_LOCALES.slice(0, 16)).map((loc) => (
                <button
                  key={loc}
                  onClick={() => { update('locale', loc); setLocaleSearch(''); }}
                  className={`px-2 py-1.5 text-xs rounded-md transition-all ${
                    state.locale === loc
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            {!showAllLocales && !localeSearch && (
              <button
                onClick={() => setShowAllLocales(true)}
                className="text-xs text-brand-400 hover:text-brand-300 mt-1.5 transition-colors"
              >
                Show all {POPULAR_LOCALES.length} locales →
              </button>
            )}
          </div>

          {/* Value */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <GripHorizontal className="w-3.5 h-3.5" />
              Value
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-100}
                max={100}
                value={state.value}
                onChange={(e) => update('value', parseInt(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <input
                type="number"
                value={state.value}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= -999 && v <= 999) update('value', v);
                }}
                className="w-20 px-2 py-1.5 text-sm text-center bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-600">-100</span>
              <span className="text-[10px] text-slate-600">0</span>
              <span className="text-[10px] text-slate-600">+100</span>
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5" />
              Unit
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {UNITS.map((unit) => (
                <button
                  key={unit.value}
                  onClick={() => update('unit', unit.value)}
                  className={`px-2 py-2 text-xs rounded-lg transition-all ${
                    state.unit === unit.value
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium">{unit.label}</div>
                  <div className="text-[10px] opacity-60">{unit.singular}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Style
            </label>
            <div className="flex gap-1.5">
              {(['long', 'short', 'narrow'] as Style[]).map((s) => (
                <button
                  key={s}
                  onClick={() => update('style', s)}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all capitalize ${
                    state.style === s
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Numeric Mode
            </label>
            <div className="flex gap-1.5">
              {(['always', 'auto'] as NumericMode[]).map((n) => (
                <button
                  key={n}
                  onClick={() => update('numeric', n)}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all ${
                    state.numeric === n
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium">{n}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">
                    {n === 'auto' ? '"yesterday" instead of "1 day ago"' : 'always uses numbers'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Output ───────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Formatted Result */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Formatted Output
            </label>
            <div className="relative group">
              <div className="w-full min-h-[120px] p-6 rounded-xl bg-slate-900 border-2 border-brand-500/30 flex items-center justify-center">
                <span className="text-3xl font-semibold text-white text-center leading-relaxed">
                  {formatted}
                </span>
              </div>
              <button
                onClick={copyFormatted}
                className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all opacity-0 group-hover:opacity-100"
                title="Copy formatted text"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Parts Breakdown */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              formatToParts() Breakdown
            </label>
            <div className="flex flex-wrap gap-1.5 bg-slate-900 rounded-xl border border-slate-700/50 p-4 min-h-[60px]">
              {parts.map((part, i) => (
                <div
                  key={i}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono ${
                    part.type === 'literal'
                      ? 'bg-slate-700/50 text-slate-300'
                      : part.type === 'integer'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                  title={`type: ${part.type}, value: ${part.value}`}
                >
                  <span className="text-[10px] uppercase opacity-60 mr-1">{part.type}</span>
                  &ldquo;{part.value}&rdquo;
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              <code className="bg-slate-800 px-1 rounded">formatToParts()</code> returns an array
              of typed segments — useful for building custom UI with highlighted numbers.
            </p>
          </div>

          {/* JavaScript Code */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              JavaScript Code
            </label>
            <div className="relative group">
              <pre className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700/50 text-sm text-slate-300 font-mono leading-relaxed overflow-x-auto">
                <code>{codeStr}</code>
              </pre>
              <button
                onClick={copyCode}
                className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all opacity-0 group-hover:opacity-100"
                title="Copy JavaScript code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Documentation ───────────────────────────────────────────────────── */}
      <div className="mt-12 p-6 rounded-xl bg-slate-800/40 border border-slate-700/30">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">
          About Intl.RelativeTimeFormat
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-400 leading-relaxed">
          <div className="space-y-3">
            <p>
              <code className="text-brand-400 bg-brand-500/10 px-1 rounded">Intl.RelativeTimeFormat</code>{' '}
              is a built-in JavaScript API for formatting relative time expressions like
              &ldquo;3 days ago&rdquo; or &ldquo;in 2 hours.&rdquo; It handles all the
              locale-specific grammar and pluralization rules automatically.
            </p>
            <p>
              <strong className="text-slate-300">Browser Support:</strong> Baseline since 2021 —
              Chrome 71+, Firefox 65+, Safari 14+, Edge 79+. Over 97% global coverage.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <strong className="text-slate-300">Style options:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code className="text-brand-400 bg-brand-500/10 px-1 rounded text-xs">long</code> — &ldquo;3 days ago&rdquo;</li>
                <li><code className="text-brand-400 bg-brand-500/10 px-1 rounded text-xs">short</code> — &ldquo;3 days ago&rdquo;</li>
                <li><code className="text-brand-400 bg-brand-500/10 px-1 rounded text-xs">narrow</code> — &ldquo;3d ago&rdquo; (locale dependent)</li>
              </ul>
            </div>
            <div>
              <strong className="text-slate-300">Numeric modes:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code className="text-brand-400 bg-brand-500/10 px-1 rounded text-xs">always</code> — always uses numbers (&ldquo;1 day ago&rdquo;)</li>
                <li><code className="text-brand-400 bg-brand-500/10 px-1 rounded text-xs">auto</code> — may use words (&ldquo;yesterday&rdquo;)</li>
              </ul>
            </div>
            <div>
              <strong className="text-slate-300">Common use cases:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Social media timestamps (&ldquo;posted 2 hours ago&rdquo;)</li>
                <li>Countdown displays (&ldquo;3 days until launch&rdquo;)</li>
                <li>Chat message aging (&ldquo;sent 5 minutes ago&rdquo;)</li>
                <li>Subscription renewal notices (&ldquo;renews in 1 month&rdquo;)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
