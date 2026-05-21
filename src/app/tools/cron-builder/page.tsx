'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Clock, Check, ChevronDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface CronFields {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

type CronField = keyof CronFields;

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: { name: string; description: string; fields: CronFields }[] = [
  {
    name: 'Every Minute',
    description: 'Runs at the start of every minute',
    fields: { minute: '*', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    name: 'Every 15 Minutes',
    description: 'Runs at :00, :15, :30, :45 past each hour',
    fields: { minute: '*/15', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    name: 'Every Hour',
    description: 'Runs at the start of every hour',
    fields: { minute: '0', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    name: 'Daily at Midnight',
    description: 'Runs once a day at 12:00 AM',
    fields: { minute: '0', hour: '0', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    name: 'Daily at Noon',
    description: 'Runs once a day at 12:00 PM',
    fields: { minute: '0', hour: '12', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    name: 'Weekdays at 9 AM',
    description: 'Runs Monday-Friday at 9:00 AM',
    fields: { minute: '0', hour: '9', dayOfMonth: '*', month: '*', dayOfWeek: '1-5' },
  },
  {
    name: 'Weekends at 10 AM',
    description: 'Runs Saturday and Sunday at 10:00 AM',
    fields: { minute: '0', hour: '10', dayOfMonth: '*', month: '*', dayOfWeek: '6,0' },
  },
  {
    name: 'First of Month',
    description: 'Runs at midnight on the 1st of every month',
    fields: { minute: '0', hour: '0', dayOfMonth: '1', month: '*', dayOfWeek: '*' },
  },
  {
    name: 'Every 30 Seconds',
    description: 'Runs every 30 seconds (some systems)',
    fields: { minute: '*', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
];

// ── Field descriptions ─────────────────────────────────────────────────────

const FIELD_META: Record<CronField, { label: string; range: string; examples: string[] }> = {
  minute: {
    label: 'Minute',
    range: '0–59',
    examples: ['*', '0', '*/15', '0,30', '10-30'],
  },
  hour: {
    label: 'Hour',
    range: '0–23',
    examples: ['*', '9', '*/2', '9-17', '9,12,18'],
  },
  dayOfMonth: {
    label: 'Day of Month',
    range: '1–31',
    examples: ['*', '1', '*/2', '1-15', '1,15'],
  },
  month: {
    label: 'Month',
    range: '1–12 (or JAN-DEC)',
    examples: ['*', '1', '*/3', '1-6', '1,6,12'],
  },
  dayOfWeek: {
    label: 'Day of Week',
    range: '0–6 (0=Sun) or SUN-SAT',
    examples: ['*', '1', '1-5', '1,3,5', 'MON-FRI'],
  },
};

// ── Parsing & description ─────────────────────────────────────────────────

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseCronField(value: string, min: number, max: number): number[] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  // */step
  const stepMatch = trimmed.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[1], 10);
    if (step < 1 || step > max) return null;
    const result: number[] = [];
    for (let i = min; i <= max; i += step) result.push(i);
    return result;
  }
  // comma list
  const parts = trimmed.split(',');
  const result: number[] = [];
  for (const part of parts) {
    // range: a-b
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      if (a < min || b > max || a > b) return null;
      for (let i = a; i <= b; i++) result.push(i);
      continue;
    }
    // single value
    const num = parseInt(part, 10);
    if (isNaN(num) || num < min || num > max) return null;
    result.push(num);
  }
  return result.length > 0 ? result : null;
}

function describeField(label: string, values: number[] | null, max: number): string {
  if (!values || values.length === 0) return `invalid ${label.toLowerCase()}`;
  if (values.length === max + 1) return `every ${label.toLowerCase()}`;
  if (values.length === 1) return `${label.toLowerCase()} ${values[0]}`;
  // Check for step pattern
  if (values.length >= 3) {
    const step = values[1] - values[0];
    if (step > 0 && values.every((v, i) => v === values[0] + i * step)) {
      return `every ${step} ${label.toLowerCase()}s starting at ${values[0]}`;
    }
  }
  // Check for contiguous range
  if (values.length >= 2 && values[values.length - 1] - values[0] === values.length - 1) {
    return `${label.toLowerCase()}s ${values[0]} through ${values[values.length - 1]}`;
  }
  return `${label.toLowerCase()}s ${values.join(', ')}`;
}

function humanReadable(fields: CronFields): string {
  const minute = parseCronField(fields.minute, 0, 59);
  const hour = parseCronField(fields.hour, 0, 23);
  const dayOfMonth = parseCronField(fields.dayOfMonth, 1, 31);
  const month = parseCronField(fields.month, 1, 12);
  const dayOfWeek = parseCronField(fields.dayOfWeek, 0, 6);

  // Check for exact time
  if (minute && minute.length === 1 && hour && hour.length === 1 &&
      dayOfMonth && dayOfMonth.length === 31 && month && month.length === 12 && dayOfWeek && dayOfWeek.length === 7) {
    const h = hour[0];
    const m = minute[0];
    const ampm = h < 12 ? 'AM' : 'PM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `At ${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // Every minute
  if (minute && minute.length === 60 && hour && hour.length === 24 &&
      dayOfMonth && dayOfMonth.length === 31 && month && month.length === 12 && dayOfWeek && dayOfWeek.length === 7) {
    return 'Every minute';
  }

  // Every hour at specific minute
  if (minute && minute.length === 1 && hour && hour.length === 24) {
    return `At minute ${minute[0]} of every hour`;
  }

  // Daily at specific time
  if (minute && minute.length === 1 && hour && hour.length === 1 &&
      dayOfMonth && dayOfMonth.length === 31 && month && month.length === 12 && dayOfWeek && dayOfWeek.length === 7) {
    const h = hour[0];
    const m = minute[0];
    const ampm = h < 12 ? 'AM' : 'PM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `Every day at ${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // Weekdays
  if (dayOfWeek && dayOfWeek.sort().join(',') === '1,2,3,4,5') {
    const timePart = minute && hour ? describeTime(minute, hour) : '';
    return timePart ? `${timePart}, Monday through Friday` : 'Monday through Friday';
  }

  // Month-specific
  const parts: string[] = [];

  if (minute && hour) {
    const t = describeTime(minute, hour);
    if (t) parts.push(t);
  }

  if (dayOfWeek && dayOfWeek.length < 7) {
    const names = dayOfWeek.sort((a, b) => a - b).map(d => DAY_NAMES_FULL[d]);
    parts.push(`on ${names.join(', ')}`);
  }

  if (dayOfMonth && dayOfMonth.length < 31) {
    parts.push(`on day${dayOfMonth.length > 1 ? 's' : ''} ${dayOfMonth.join(', ')}`);
  }

  if (month && month.length < 12) {
    const names = month.sort((a, b) => a - b).map(m => MONTH_NAMES[m - 1]);
    parts.push(`in ${names.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Custom schedule';
}

function describeTime(minute: number[] | null, hour: number[] | null): string {
  if (!minute || !hour || minute.length === 0 || hour.length === 0) return '';
  if (minute.length === 1 && hour.length === 1) {
    const h = hour[0];
    const m = minute[0];
    const ampm = h < 12 ? 'AM' : 'PM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `At ${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  if (minute.length === 1 && hour.length === 24) {
    return `At minute ${minute[0]} of every hour`;
  }
  return '';
}

// ── Next execution ─────────────────────────────────────────────────────────

function getNextExecutions(expr: string, count: number = 5): string[] {
  const parts = expr.split(/\s+/);
  if (parts.length !== 5) return [];

  const [minF, hourF, domF, monF, dowF] = parts;

  const now = new Date();
  // Start from next minute
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const results: string[] = [];
  const maxIterations = 365 * 24 * 60; // 1 year of minutes
  let current = new Date(start);
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    const min = current.getMinutes();
    const hour = current.getHours();
    const dom = current.getDate();
    const mon = current.getMonth() + 1;
    const dow = current.getDay();

    if (
      matchesField(minF, min, 0, 59) &&
      matchesField(hourF, hour, 0, 23) &&
      matchesField(domF, dom, 1, 31) &&
      matchesField(monF, mon, 1, 12) &&
      matchesField(dowF, dow, 0, 6)
    ) {
      results.push(formatDateTime(current));
    }

    current = new Date(current.getTime() + 60000); // +1 minute
    iterations++;
  }

  return results;
}

function matchesField(field: string, value: number, min: number, max: number): boolean {
  const trimmed = field.trim();
  if (trimmed === '*') return true;

  // */step
  const stepMatch = trimmed.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[1], 10);
    return (value - min) % step === 0;
  }

  // comma-separated list
  const parts = trimmed.split(',');
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      if (value >= a && value <= b) return true;
      continue;
    }
    if (parseInt(part, 10) === value) return true;
  }

  return false;
}

function formatDateTime(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${displayH}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

// ── Main component ─────────────────────────────────────────────────────────

const DEFAULT_FIELDS: CronFields = {
  minute: '0',
  hour: '0',
  dayOfMonth: '*',
  month: '*',
  dayOfWeek: '*',
};

export default function CronBuilderPage() {
  const [fields, setFields] = useState<CronFields>(DEFAULT_FIELDS);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const expression = useMemo(
    () => `${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`,
    [fields]
  );

  const description = useMemo(() => humanReadable(fields), [fields]);

  const nextExecutions = useMemo(() => getNextExecutions(expression, 5), [expression]);

  const updateField = useCallback(
    (field: CronField, value: string) => {
      setFields((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    setFields({ ...preset.fields });
  }, []);

  const handleCopy = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedField(label);
        toast.success(`${label} copied!`);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        toast.error('Failed to copy');
      }
    },
    []
  );

  const isEveryMinute =
    fields.minute === '*' &&
    fields.hour === '*' &&
    fields.dayOfMonth === '*' &&
    fields.month === '*' &&
    fields.dayOfWeek === '*';

  return (
    <ToolLayout
      title="Cron Expression Builder"
      description="Build, understand, and validate cron expressions. See human-readable descriptions and next execution times — all client-side."
    >
      {/* Presets */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-sm mb-3">Common Presets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="text-left px-3 py-2 rounded-lg bg-surface border border-slate-700/50 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all group"
              title={preset.description}
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-brand-300 transition-colors">
                {preset.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                {`${preset.fields.minute} ${preset.fields.hour} ${preset.fields.dayOfMonth} ${preset.fields.month} ${preset.fields.dayOfWeek}`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Field Editors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {(Object.keys(FIELD_META) as CronField[]).map((field) => {
          const meta = FIELD_META[field];
          const value = fields[field];
          return (
            <div key={field} className="card">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">{meta.label}</label>
                <span className="text-[10px] text-slate-500 font-mono">{meta.range}</span>
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => updateField(field, e.target.value)}
                className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm font-mono text-green-400 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {meta.examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => updateField(field, ex)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-all ${
                      value === ex
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-surface-lighter text-slate-500 border border-slate-700/30 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expression Output */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Cron Expression
          </h2>
          <button
            onClick={() => handleCopy(expression, 'cron')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              copiedField === 'cron'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'text-slate-400 hover:text-white hover:bg-surface-lighter border border-transparent'
            }`}
          >
            {copiedField === 'cron' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedField === 'cron' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="bg-surface rounded-lg border border-slate-700/50 p-4">
          <code className="text-xl font-mono text-green-400 tracking-wider select-all">
            {expression}
          </code>
        </div>
      </div>

      {/* Description + Next Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Human-Readable */}
        <div className="card">
          <h2 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            What this means
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
        </div>

        {/* Next Executions */}
        <div className="card">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Next {nextExecutions.length} Executions
          </h2>
          {isEveryMinute ? (
            <div className="space-y-2">
              {nextExecutions.map((time, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm font-mono text-slate-300 bg-surface rounded-md px-3 py-2 border border-slate-700/30"
                >
                  <span className="text-[10px] text-slate-500 w-6">{i + 1}.</span>
                  {time}
                </div>
              ))}
            </div>
          ) : nextExecutions.length > 0 ? (
            <div className="space-y-2">
              {nextExecutions.map((time, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm font-mono text-slate-300 bg-surface rounded-md px-3 py-2 border border-slate-700/30"
                >
                  <span className="text-[10px] text-slate-500 w-6">{i + 1}.</span>
                  {time}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No upcoming executions found in the next year. Check your expression.</p>
          )}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="card mt-6">
        <h2 className="text-white font-semibold text-sm mb-3">Quick Reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="bg-surface rounded-lg p-3 border border-slate-700/30">
            <code className="text-green-400 font-mono">*</code>
            <span className="text-slate-400 ml-2">Any value (wildcard)</span>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-slate-700/30">
            <code className="text-green-400 font-mono">*/5</code>
            <span className="text-slate-400 ml-2">Every 5 units (step)</span>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-slate-700/30">
            <code className="text-green-400 font-mono">1,3,5</code>
            <span className="text-slate-400 ml-2">Specific values (list)</span>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-slate-700/30">
            <code className="text-green-400 font-mono">1-5</code>
            <span className="text-slate-400 ml-2">Range of values</span>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-slate-700/30">
            <code className="text-green-400 font-mono">MON-FRI</code>
            <span className="text-slate-400 ml-2">Day names (some systems)</span>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-slate-700/30">
            <code className="text-green-400 font-mono">@daily</code>
            <span className="text-slate-400 ml-2">Shortcut: 0 0 * * *</span>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
