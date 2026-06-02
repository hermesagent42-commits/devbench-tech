'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, CalendarClock, Clock, History, Trash2, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type FieldValue = string;

interface Preset {
  label: string;
  expression: string;
  description: string;
}

interface HistoryEntry {
  expression: string;
  timestamp: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const FIELD_CONFIG = [
  { name: 'Minute', short: 'min', range: '0–59', placeholder: '*', max: 59 },
  { name: 'Hour', short: 'hour', range: '0–23', placeholder: '*', max: 23 },
  { name: 'Day of Month', short: 'dom', range: '1–31', placeholder: '*', max: 31 },
  { name: 'Month', short: 'month', range: '1–12', placeholder: '*', max: 12 },
  { name: 'Day of Week', short: 'dow', range: '0–7', placeholder: '*', max: 7 },
] as const;

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRESETS: Preset[] = [
  { label: 'Every minute', expression: '* * * * *', description: 'Runs every single minute, day and night' },
  { label: 'Every 5 minutes', expression: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', expression: '*/15 * * * *', description: 'Runs every 15 minutes (quarter-hourly)' },
  { label: 'Every 30 minutes', expression: '*/30 * * * *', description: 'Runs every 30 minutes (twice per hour)' },
  { label: 'Every hour', expression: '0 * * * *', description: 'Runs at the top of every hour' },
  { label: 'Every 3 hours', expression: '0 */3 * * *', description: 'Runs every 3 hours, on the hour' },
  { label: 'Every 6 hours', expression: '0 */6 * * *', description: 'Runs every 6 hours (00:00, 06:00, 12:00, 18:00)' },
  { label: 'Every 12 hours', expression: '0 */12 * * *', description: 'Runs twice a day at midnight and noon' },
  { label: 'Daily at midnight', expression: '0 0 * * *', description: 'Runs once per day at midnight' },
  { label: 'Daily at 3 AM', expression: '0 3 * * *', description: 'Runs once per day at 3:00 AM — common for backups' },
  { label: 'Daily at 6 AM', expression: '0 6 * * *', description: 'Runs once per day at 6:00 AM' },
  { label: 'Weekdays at 9 AM', expression: '0 9 * * 1-5', description: 'Runs Monday through Friday at 9:00 AM' },
  { label: 'Weekdays at 5 PM', expression: '0 17 * * 1-5', description: 'Runs Monday through Friday at 5:00 PM' },
  { label: 'Weekends at noon', expression: '0 12 * * 0,6', description: 'Runs Saturday and Sunday at noon' },
  { label: 'Weekly on Monday', expression: '0 0 * * 1', description: 'Runs every Monday at midnight' },
  { label: 'Monthly (1st)', expression: '0 0 1 * *', description: 'Runs on the 1st of every month at midnight' },
  { label: 'Monthly (15th)', expression: '0 0 15 * *', description: 'Runs on the 15th of every month at midnight' },
  { label: 'Quarterly', expression: '0 0 1 1,4,7,10 *', description: 'Runs on Jan 1, Apr 1, Jul 1, Oct 1 at midnight' },
  { label: 'Yearly', expression: '0 0 1 1 *', description: 'Runs once per year on January 1st at midnight' },
  { label: 'Every 30 seconds', expression: '* * * * *', description: 'Runs every minute (cron minimum is 1 minute)' },
];

const COMMON_EXAMPLES = [
  { label: 'Every 2 hours on weekdays', expression: '0 */2 * * 1-5' },
  { label: '10:30 PM end of month', expression: '30 22 28-31 * *' },
  { label: 'Tue/Thu at 2 PM', expression: '0 14 * * 2,4' },
  { label: 'Every 30 min, 9-5, weekdays', expression: '*/30 9-17 * * 1-5' },
  { label: 'At 12:00 and 18:00 daily', expression: '0 12,18 * * *' },
  { label: 'First day of each quarter at 1 AM', expression: '0 1 1 1,4,7,10 *' },
];

// ── Parser / Validator ─────────────────────────────────────────────────────

function isValidCronField(value: string): boolean {
  if (!value || value.trim() === '') return false;
  const parts = value.split(',');
  const allowed = /^(\*|(\d{1,2}(-\d{1,2})?)(\/\d{1,2})?)$/;
  for (let i = 0; i < parts.length; i++) {
    if (!allowed.test(parts[i].trim())) return false;
  }
  return true;
}

function isValidCron(parts: string[]): boolean {
  if (parts.length !== 5) return false;
  return parts.every((p) => isValidCronField(p));
}

// ── Human-readable description ─────────────────────────────────────────────

function describeCron(parts: string[]): string {
  if (parts.length !== 5) return 'Invalid expression';

  const joined = parts.join(' ');
  if (joined === '* * * * *') return 'Every minute';
  if (joined === '0 * * * *') return 'At minute 0 of every hour';
  if (joined === '0 0 * * *') return 'At midnight every day';
  if (joined === '0 0 * * 0') return 'At midnight every Sunday';
  if (joined === '0 0 1 * *') return 'At midnight on the 1st of every month';
  if (joined === '0 0 1 1 *') return 'At midnight on January 1st';

  const minute = parts[0];
  const hour = parts[1];
  const dom = parts[2];
  const month = parts[3];
  const dow = parts[4];

  const desc: string[] = [];

  if (minute === '*') desc.push('every minute');
  else if (minute.startsWith('*/')) desc.push('every ' + minute.slice(2) + ' minutes');
  else if (minute.indexOf(',') !== -1) desc.push('at minutes ' + minute.replace(/,/g, ', '));
  else if (minute.indexOf('-') !== -1) desc.push('minutes ' + minute.replace(/-/g, ' through '));
  else desc.push('at minute ' + minute);

  if (hour === '*') desc.push('');
  else if (hour.startsWith('*/')) desc.push('every ' + hour.slice(2) + ' hours');
  else if (hour.indexOf(',') !== -1) {
    const hours = hour.split(',').map(function(h) { return h + ':00'; });
    desc.push('at ' + hours.join(', '));
  } else if (hour.indexOf('-') !== -1) {
    const parts2 = hour.split('-');
    desc.push('from ' + parts2[0] + ':00 to ' + parts2[1] + ':00');
  } else {
    desc.push('at ' + hour + ':00');
  }

  if (dom !== '*') {
    if (dom.startsWith('*/')) desc.push('every ' + dom.slice(2) + ' days');
    else if (dom.indexOf(',') !== -1) desc.push('on days ' + dom.replace(/,/g, ', '));
    else if (dom.indexOf('-') !== -1) desc.push('from day ' + dom.replace(/-/g, ' through '));
    else desc.push('on day ' + dom);
  }

  if (month !== '*') {
    if (month.indexOf(',') !== -1) {
      const months = month.split(',').map(function(m) { return MONTH_NAMES[parseInt(m)]; });
      desc.push('in ' + months.join(', '));
    } else if (month.indexOf('-') !== -1) {
      const se = month.split('-').map(Number);
      desc.push('from ' + MONTH_NAMES[se[0]] + ' to ' + MONTH_NAMES[se[1]]);
    } else {
      desc.push('in ' + MONTH_NAMES[parseInt(month)]);
    }
  }

  if (dow !== '*') {
    if (dow.indexOf(',') !== -1) {
      const days = dow.split(',').map(function(d) { return DOW_NAMES[parseInt(d)]; });
      desc.push('on ' + days.join(', '));
    } else if (dow.indexOf('-') !== -1) {
      const se = dow.split('-').map(Number);
      desc.push(DOW_NAMES[se[0]] + ' through ' + DOW_NAMES[se[1]]);
    } else {
      desc.push('on ' + DOW_NAMES[parseInt(dow)]);
    }
  }

  const result = desc.filter(Boolean).join(' ');
  return result || 'Every minute';
}

// ── Next Run Calculator ────────────────────────────────────────────────────

function expandField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    const arr: number[] = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
  }

  const results: number[] = [];
  const parts = field.split(',');

  for (let j = 0; j < parts.length; j++) {
    const part = parts[j];
    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2), 10);
      for (let i = min; i <= max; i += step) {
        results.push(i);
      }
    } else if (part.indexOf('-') !== -1) {
      if (part.indexOf('/') !== -1) {
        // Range with step: e.g. 1-30/5
        const slashIdx = part.indexOf('/');
        const range = part.substring(0, slashIdx);
        const step = parseInt(part.substring(slashIdx + 1), 10);
        const dashIdx = range.indexOf('-');
        const rs = parseInt(range.substring(0, dashIdx), 10);
        const re = parseInt(range.substring(dashIdx + 1), 10);
        for (let i = rs; i <= re; i += step) {
          results.push(i);
        }
      } else {
        const dashIdx = part.indexOf('-');
        const start = parseInt(part.substring(0, dashIdx), 10);
        const end = parseInt(part.substring(dashIdx + 1), 10);
        for (let i = start; i <= end; i++) {
          results.push(i);
        }
      }
    } else {
      results.push(parseInt(part, 10));
    }
  }

  // Deduplicate
  const unique: number[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (unique.indexOf(r) === -1) unique.push(r);
  }
  unique.sort(function(a, b) { return a - b; });
  return unique;
}

function getNextRuns(expression: string, count: number): Date[] {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return [];

  const expanded: number[][] = [];
  expanded.push(expandField(parts[0], 0, 59));
  expanded.push(expandField(parts[1], 0, 23));
  expanded.push(expandField(parts[2], 1, 31));
  expanded.push(expandField(parts[3], 1, 12));
  expanded.push(expandField(parts[4], 0, 7));

  const results: Date[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const maxIterations = 525600;
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;
    const m = cursor.getMinutes();
    const h = cursor.getHours();
    const d = cursor.getDate();
    const mo = cursor.getMonth() + 1;
    const dow = cursor.getDay();

    const minuteMatch = expanded[0].indexOf(m) !== -1;
    const hourMatch = expanded[1].indexOf(h) !== -1;
    const domMatch = expanded[2].indexOf(d) !== -1;
    const monthMatch = expanded[3].indexOf(mo) !== -1;
    const dowMatch = expanded[4].indexOf(dow) !== -1;

    const domSpecified = parts[2] !== '*';
    const dowSpecified = parts[4] !== '*';

    let dayMatches: boolean;
    if (domSpecified && dowSpecified) {
      dayMatches = domMatch || dowMatch;
    } else if (domSpecified) {
      dayMatches = domMatch;
    } else if (dowSpecified) {
      dayMatches = dowMatch;
    } else {
      dayMatches = true;
    }

    if (minuteMatch && hourMatch && dayMatches && monthMatch) {
      results.push(new Date(cursor));
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return results;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatRelative(d: Date): string {
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return 'in ' + diffMins + ' min';
  if (diffHours < 24) return 'in ' + diffHours + 'h';
  return 'in ' + diffDays + 'd';
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CronBuilderPage() {
  const [fields, setFields] = useState<FieldValue[]>(['*', '*', '*', '*', '*']);
  const [focusedField, setFocusedField] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(function() {
    try {
      const stored = localStorage.getItem('cron-builder-history');
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const expression = useMemo(function() { return fields.join(' '); }, [fields]);
  const valid = useMemo(function() { return isValidCron(fields); }, [fields]);
  const humanDescription = useMemo(function() { return describeCron(fields); }, [fields]);
  const nextRuns = useMemo(function() {
    if (!valid) return [];
    return getNextRuns(expression, 5);
  }, [expression, valid]);

  const updateField = useCallback(function(index: number, value: string) {
    setFields(function(prev) {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  }, []);

  const setExpression = useCallback(function(expr: string) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length === 5) {
      setFields(parts);
    }
  }, []);

  const saveToHistory = useCallback(function() {
    if (!valid) return;
    setHistory(function(prev) {
      const entry: HistoryEntry = { expression: expression, timestamp: Date.now() };
      const updated = [entry].concat(prev.filter(function(e) { return e.expression !== expression; })).slice(0, 20);
      try { localStorage.setItem('cron-builder-history', JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    toast.success('Saved to history');
  }, [expression, valid]);

  const copyExpression = useCallback(async function() {
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [expression]);

  const clearHistory = useCallback(function() {
    setHistory([]);
    try { localStorage.removeItem('cron-builder-history'); } catch { /* ignore */ }
    toast.success('History cleared');
  }, []);

  return (
    <ToolLayout
      title="Cron Expression Builder"
      description="Build, test, and understand cron schedule expressions. Visually construct cron syntax with field-by-field input, presets, next-run preview, and plain-English descriptions."
    >
      {/* ── Expression Builder ──────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-brand-400" />
          Build Your Expression
        </h2>

        {/* Field inputs */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {FIELD_CONFIG.map(function(field, i) {
            const fieldValid = isValidCronField(fields[i]);
            return (
              <div key={field.short}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  {field.short}
                </label>
                <input
                  type="text"
                  value={fields[i]}
                  onChange={function(e) { updateField(i, e.target.value); }}
                  onFocus={function() { setFocusedField(i); }}
                  onBlur={function() { setFocusedField(null); }}
                  className={'w-full px-3 py-2.5 bg-surface border rounded-lg text-center font-mono text-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 ' +
                    (focusedField === i
                      ? 'border-brand-500 text-brand-300'
                      : fieldValid ? 'border-slate-700 text-slate-200' : 'border-red-500/50 text-red-400')}
                  spellCheck={false}
                />
                <p className="text-[10px] text-slate-600 text-center mt-1">{field.range}</p>
              </div>
            );
          })}
        </div>

        {/* Result expression bar */}
        <div className={'flex items-center gap-3 p-4 rounded-lg border ' +
          (valid ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30')}>
          <div className="flex-1">
            <code className={'text-lg font-mono ' + (valid ? 'text-green-400' : 'text-red-400')}>
              {expression}
            </code>
            {!valid && (
              <p className="text-xs text-red-400/80 mt-1">
                Invalid cron expression — check each field&apos;s range
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveToHistory}
              disabled={!valid}
              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-brand-400 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Save to history"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={copyExpression}
              disabled={!valid}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Plain-English description */}
        {valid && (
          <div className="mt-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/40">
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="first-letter:uppercase">{humanDescription}</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Next Runs ───────────────────────────────────────────────── */}
      {valid && nextRuns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Next 5 Scheduled Runs
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider w-12">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Date & Time</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {nextRuns.map(function(run, i) {
                  return (
                    <tr key={i} className={'hover:bg-slate-800/30 transition-colors ' + (i === 0 ? 'bg-brand-500/5' : '')}>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-200">{formatDate(run)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={'text-xs font-medium px-2 py-0.5 rounded ' +
                          (i === 0 ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500')}>
                          {formatRelative(run)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Presets ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Common Presets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESETS.map(function(preset) {
            return (
              <button
                key={preset.label}
                onClick={function() { setExpression(preset.expression); }}
                className={'text-left p-3 rounded-lg border transition-all hover:border-brand-500/40 hover:bg-slate-800/50 ' +
                  (expression === preset.expression
                    ? 'border-brand-500/60 bg-brand-500/10'
                    : 'border-slate-700/50 bg-slate-800/20')}
              >
                <p className="font-mono text-xs text-brand-400 mb-1">{preset.expression}</p>
                <p className="text-sm text-slate-300 font-medium">{preset.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Common Examples ─────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          More Examples
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMMON_EXAMPLES.map(function(example) {
            return (
              <button
                key={example.expression}
                onClick={function() { setExpression(example.expression); }}
                className={'text-left p-3 rounded-lg border transition-all hover:border-brand-500/40 hover:bg-slate-800/50 ' +
                  (expression === example.expression
                    ? 'border-brand-500/60 bg-brand-500/10'
                    : 'border-slate-700/50 bg-slate-800/20')}
              >
                <p className="font-mono text-xs text-brand-400 mb-1">{example.expression}</p>
                <p className="text-sm text-slate-300">{example.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quick Reference ─────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Cron Syntax Quick Reference
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Symbol</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Meaning</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {[
                { sym: '*', meaning: 'Any value (wildcard)', example: '* * * * * → every minute' },
                { sym: ',', meaning: 'Value list separator', example: '0,15,30,45 → at 0, 15, 30, 45' },
                { sym: '-', meaning: 'Range of values', example: '9-17 → 9 through 17' },
                { sym: '/', meaning: 'Step values', example: '*/15 → every 15 (0, 15, 30, 45)' },
                { sym: 'L', meaning: 'Last (not standard)', example: 'Not supported in standard cron' },
                { sym: '?', meaning: 'No specific value', example: 'Not supported in standard cron' },
                { sym: '#', meaning: 'Nth weekday', example: 'Not supported in standard cron' },
                { sym: 'W', meaning: 'Nearest weekday', example: 'Not supported in standard cron' },
              ].map(function(row) {
                return (
                  <tr key={row.sym} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-brand-400 font-semibold">{row.sym}</td>
                    <td className="px-4 py-2.5 text-slate-300">{row.meaning}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{row.example}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          DevBench uses the standard Unix cron format (5 fields). Quartz-style extended syntax (L, ?, #, W) is not supported here.
        </p>
      </div>

      {/* ── History ─────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Expressions
            </h2>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 12).map(function(entry, i) {
              return (
                <button
                  key={i}
                  onClick={function() { setExpression(entry.expression); }}
                  className={'group flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-700/50 border rounded-lg text-sm transition-all ' +
                    (expression === entry.expression
                      ? 'border-brand-500/60 bg-brand-500/10'
                      : 'border-slate-700/50')}
                >
                  <span className="font-mono text-xs text-brand-400">{entry.expression}</span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
