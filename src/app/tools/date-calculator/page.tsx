'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Calendar, Clock, ArrowRight, Plus, Minus, Timer, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'diff' | 'addsub' | 'countdown';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function DateCalculatorPage() {
  const [tab, setTab] = useState<Tab>('diff');

  // Diff state
  const [date1, setDate1] = useState(formatDate(new Date()));
  const [date2, setDate2] = useState(formatDate(new Date()));
  const [diffUnit, setDiffUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');

  // Add/subtract state
  const [baseDate, setBaseDate] = useState(formatDate(new Date()));
  const [addAmount, setAddAmount] = useState(7);
  const [addUnit, setAddUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');

  // Countdown state
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return formatDate(d);
  });
  const [countdownLabel, setCountdownLabel] = useState('My Event');

  // ── Diff calculation ──────────────────────────────────────────────────────

  const diffResult = useMemo(() => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

    const msDiff = d2.getTime() - d1.getTime();
    const absMsDiff = Math.abs(msDiff);
    const sign = msDiff < 0 ? -1 : 1;

    const totalDays = absMsDiff / (1000 * 60 * 60 * 24);
    const totalWeeks = totalDays / 7;
    const totalMonths =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());
    const totalYears = (d2.getFullYear() - d1.getFullYear()) +
      (d2.getMonth() - d1.getMonth()) / 12 +
      (d2.getDate() - d1.getDate()) / 365.25;

    // Detailed breakdown
    let years = 0, months = 0, days = 0;

    if (d2 > d1) {
      years = d2.getFullYear() - d1.getFullYear();
      months = d2.getMonth() - d1.getMonth();
      days = d2.getDate() - d1.getDate();

      if (days < 0) {
        months--;
        const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
        days += daysInMonth(prevMonth.getFullYear(), prevMonth.getMonth());
      }
      if (months < 0) {
        years--;
        months += 12;
      }
    } else {
      years = d1.getFullYear() - d2.getFullYear();
      months = d1.getMonth() - d2.getMonth();
      days = d1.getDate() - d2.getDate();

      if (days < 0) {
        months--;
        const prevMonth = new Date(d1.getFullYear(), d1.getMonth(), 0);
        days += daysInMonth(prevMonth.getFullYear(), prevMonth.getMonth());
      }
      if (months < 0) {
        years--;
        months += 12;
      }
    }

    let unitValue: number;
    let unitLabel: string;
    switch (diffUnit) {
      case 'weeks':
        unitValue = Math.round(totalWeeks * 10) / 10;
        unitLabel = 'weeks';
        break;
      case 'months':
        unitValue = Math.round((totalMonths + (d2.getDate() - d1.getDate()) / 30.44) * 10) / 10;
        unitLabel = 'months';
        break;
      case 'years':
        unitValue = Math.round(totalYears * 100) / 100;
        unitLabel = 'years';
        break;
      default:
        unitValue = Math.round(totalDays);
        unitLabel = 'days';
    }

    return {
      msDiff,
      absMsDiff,
      sign,
      totalDays: Math.round(totalDays),
      totalWeeks: Math.round(totalWeeks * 10) / 10,
      totalMonths: Math.round(totalMonths * 10) / 10,
      totalYears: Math.round(totalYears * 100) / 100,
      breakdown: { years, months, days },
      unitValue,
      unitLabel,
      isPast: msDiff < 0,
    };
  }, [date1, date2, diffUnit]);

  // ── Add/subtract result ───────────────────────────────────────────────────

  const addSubResult = useMemo(() => {
    const base = new Date(baseDate);
    if (isNaN(base.getTime())) return null;

    const sign = operation === 'add' ? 1 : -1;
    const result = new Date(base);

    switch (addUnit) {
      case 'days':
        result.setDate(result.getDate() + sign * addAmount);
        break;
      case 'weeks':
        result.setDate(result.getDate() + sign * addAmount * 7);
        break;
      case 'months':
        result.setMonth(result.getMonth() + sign * addAmount);
        break;
      case 'years':
        result.setFullYear(result.getFullYear() + sign * addAmount);
        break;
    }

    const isWeekend = result.getDay() === 0 || result.getDay() === 6;
    const weekNumber = getWeekNumber(result);

    return {
      date: result,
      formatted: formatDisplay(result),
      iso: formatDate(result),
      dayOfWeek: result.toLocaleDateString('en-US', { weekday: 'long' }),
      isWeekend,
      weekNumber,
      isLeapYear: isLeapYear(result.getFullYear()),
      daysInMonth: daysInMonth(result.getFullYear(), result.getMonth()),
    };
  }, [baseDate, addAmount, addUnit, operation]);

  // ── Countdown ─────────────────────────────────────────────────────────────

  const [countdownNow, setCountdownNow] = useState<Date | null>(null);
  const countdownResult = useMemo(() => {
    const target = new Date(targetDate);
    const now = countdownNow || new Date();
    if (isNaN(target.getTime())) return null;

    const diff = target.getTime() - now.getTime();
    const isPast = diff <= 0;

    const days = isPast ? 0 : Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = isPast ? 0 : Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = isPast ? 0 : Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = isPast ? 0 : Math.floor((diff % (1000 * 60)) / 1000);
    const totalHours = isPast ? 0 : Math.floor(diff / (1000 * 60 * 60));
    const totalMinutes = isPast ? 0 : Math.floor(diff / (1000 * 60));
    const totalSeconds = isPast ? 0 : Math.floor(diff / 1000);

    return {
      isPast,
      label: countdownLabel,
      days,
      hours,
      minutes,
      seconds,
      totalHours,
      totalMinutes,
      totalSeconds,
    };
  }, [targetDate, countdownLabel, countdownNow]);

  // ── Quick presets ─────────────────────────────────────────────────────────

  const setQuickDiff = useCallback((preset: string) => {
    const d1 = new Date();
    const d2 = new Date();
    switch (preset) {
      case 'yesterday':
        d1.setDate(d2.getDate() - 1);
        setDate2(formatDate(d1));
        setDate1(formatDate(d2));
        break;
      case 'tomorrow':
        d2.setDate(d2.getDate() + 1);
        setDate1(formatDate(d1));
        setDate2(formatDate(d2));
        break;
      case 'last-week':
        d2.setDate(d2.getDate() - 7);
        setDate1(formatDate(d2));
        setDate2(formatDate(d1));
        break;
      case 'next-week':
        d1.setDate(d1.getDate() + 7);
        setDate2(formatDate(d1));
        setDate1(formatDate(d2));
        break;
      case 'last-month':
        d2.setMonth(d2.getMonth() - 1);
        setDate1(formatDate(d2));
        setDate2(formatDate(d1));
        break;
      case 'next-month':
        d1.setMonth(d1.getMonth() + 1);
        setDate2(formatDate(d1));
        setDate1(formatDate(d2));
        break;
    }
  }, []);

  const setQuickCountdown = useCallback((preset: string) => {
    const d = new Date();
    switch (preset) {
      case 'end-of-day':
        d.setHours(23, 59, 59, 999);
        setTargetDate(d.toISOString().slice(0, 16));
        setCountdownLabel('End of Day');
        break;
      case 'end-of-week':
        const daysUntilSunday = 7 - d.getDay();
        d.setDate(d.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
        d.setHours(23, 59, 59, 999);
        setTargetDate(d.toISOString().slice(0, 16));
        setCountdownLabel('End of Week');
        break;
      case 'new-year':
        d.setFullYear(d.getFullYear() + 1, 0, 1);
        d.setHours(0, 0, 0, 0);
        setTargetDate(d.toISOString().slice(0, 16));
        setCountdownLabel('New Year 🎉');
        break;
      case 'christmas':
        if (d.getMonth() === 11 && d.getDate() > 25) {
          d.setFullYear(d.getFullYear() + 1);
        }
        d.setMonth(11, 25);
        d.setHours(0, 0, 0, 0);
        setTargetDate(d.toISOString().slice(0, 16));
        setCountdownLabel('Christmas 🎄');
        break;
    }
  }, []);

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, []);

  return (
    <ToolLayout
      title="Date Calculator"
      description="Calculate date differences, add/subtract durations, and count down to events — all client-side."
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 p-1 rounded-lg bg-surface border border-slate-700/50 w-fit">
        {([
          ['diff', 'Date Difference', Calendar],
          ['addsub', 'Add / Subtract', Plus],
          ['countdown', 'Countdown', Timer],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === key
                ? 'bg-brand-500/20 text-brand-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Date Difference ────────────────────────────────────────────────── */}
      {tab === 'diff' && (
        <div className="space-y-6">
          {/* Quick presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              Quick Presets
            </h2>
            <div className="flex flex-wrap gap-2">
              {(['yesterday', 'tomorrow', 'last-week', 'next-week', 'last-month', 'next-month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setQuickDiff(p)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-brand-300 transition-all"
                >
                  {p.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date 1 */}
            <div className="card">
              <label className="text-xs text-slate-400 mb-2 block font-medium">Start Date</label>
              <input
                type="date"
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                className="input-field w-full font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">{date1 ? formatDisplay(new Date(date1)) : ''}</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400">
                <ArrowRight className="w-6 h-6" />
                <span className="text-sm font-mono">{diffResult?.isPast ? '→ past' : '→ future'}</span>
              </div>
            </div>

            {/* Date 2 */}
            <div className="card">
              <label className="text-xs text-slate-400 mb-2 block font-medium">End Date</label>
              <input
                type="date"
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                className="input-field w-full font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">{date2 ? formatDisplay(new Date(date2)) : ''}</p>
            </div>
          </div>

          {/* Unit selector + result */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h2 className="text-white font-semibold text-sm">Show difference in</h2>
              <div className="flex gap-1 bg-surface rounded-lg p-0.5 border border-slate-600/30">
                {(['days', 'weeks', 'months', 'years'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setDiffUnit(u)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      diffUnit === u
                        ? 'bg-brand-500/30 text-brand-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {diffResult ? (
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-lg p-6 border border-slate-700/50">
                  <div className="text-4xl font-bold text-white font-mono mb-2">
                    {diffResult.unitValue.toLocaleString()} <span className="text-xl text-slate-400">{diffResult.unitLabel}</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {diffResult.isPast ? 'Dates are in the past relative to start' : 'Dates are in the future relative to start'}
                  </p>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-light rounded-lg p-4 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-white font-mono">{diffResult.breakdown.years}</div>
                    <div className="text-xs text-slate-400 mt-1">Years</div>
                  </div>
                  <div className="bg-surface-light rounded-lg p-4 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-white font-mono">{diffResult.breakdown.months}</div>
                    <div className="text-xs text-slate-400 mt-1">Months</div>
                  </div>
                  <div className="bg-surface-light rounded-lg p-4 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-white font-mono">{diffResult.breakdown.days}</div>
                    <div className="text-xs text-slate-400 mt-1">Days</div>
                  </div>
                </div>

                {/* All formats */}
                <div className="bg-surface-light rounded-lg p-4 border border-slate-700/30">
                  <h3 className="text-xs font-medium text-slate-400 mb-3">All Conversions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      ['Total Days', `${diffResult.totalDays.toLocaleString()} d`],
                      ['Total Weeks', `${diffResult.totalWeeks.toLocaleString()} wk`],
                      ['Total Months', `${diffResult.totalMonths.toLocaleString()} mo`],
                      ['Total Years', `${diffResult.totalYears.toLocaleString()} yr`],
                    ].map(([label, value]) => (
                      <div key={label} className="text-center">
                        <div className="text-xl font-bold text-white font-mono">{value}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-6">Select two dates to calculate the difference</div>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Subtract ──────────────────────────────────────────────────── */}
      {tab === 'addsub' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input */}
            <div className="card space-y-5">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-brand-400" />
                Base Date
              </h2>

              <input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                className="input-field w-full font-mono text-sm"
              />
              <p className="text-xs text-slate-400">{baseDate ? formatDisplay(new Date(baseDate)) : ''}</p>

              <div>
                <label className="text-xs text-slate-400 mb-2 block font-medium">Operation</label>
                <div className="flex gap-1 bg-surface rounded-lg p-0.5 border border-slate-600/30">
                  <button
                    onClick={() => setOperation('add')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      operation === 'add'
                        ? 'bg-green-500/20 text-green-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                  <button
                    onClick={() => setOperation('subtract')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      operation === 'subtract'
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Minus className="w-4 h-4" /> Subtract
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-2 block font-medium">Amount</label>
                  <input
                    type="number"
                    min={0}
                    value={addAmount}
                    onChange={(e) => setAddAmount(Math.max(0, Math.min(9999, parseInt(e.target.value) || 0)))}
                    className="input-field w-full font-mono text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-2 block font-medium">Unit</label>
                  <select
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value as typeof addUnit)}
                    className="input-field w-full font-mono text-sm"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="card space-y-4">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                Result
              </h2>

              {addSubResult ? (
                <>
                  <div className="bg-slate-950 rounded-lg p-5 border border-slate-700/50 text-center">
                    <div className="text-3xl font-bold text-white font-mono mb-2">
                      {addSubResult.formatted}
                    </div>
                    <div className="text-sm text-slate-400">
                      {addSubResult.dayOfWeek}
                      {addSubResult.isWeekend && (
                        <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Weekend</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-light rounded-lg p-3 border border-slate-700/30 text-center">
                      <div className="text-sm font-mono text-brand-400">{addSubResult.iso}</div>
                      <div className="text-xs text-slate-500 mt-0.5">ISO 8601</div>
                    </div>
                    <div className="bg-surface-light rounded-lg p-3 border border-slate-700/30 text-center">
                      <div className="text-sm font-mono text-brand-400">Week {addSubResult.weekNumber}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Week Number</div>
                    </div>
                    <div className="bg-surface-light rounded-lg p-3 border border-slate-700/30 text-center">
                      <div className="text-sm font-mono text-brand-400">{addSubResult.isLeapYear ? 'Yes 🐸' : 'No'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Leap Year</div>
                    </div>
                    <div className="bg-surface-light rounded-lg p-3 border border-slate-700/30 text-center">
                      <div className="text-sm font-mono text-brand-400">{addSubResult.daysInMonth} days</div>
                      <div className="text-xs text-slate-500 mt-0.5">Days in Month</div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyText(addSubResult.iso)}
                    className="btn-primary w-full flex items-center justify-center gap-1.5 text-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy ISO Date
                  </button>
                </>
              ) : (
                <div className="text-slate-500 text-sm text-center py-10">Enter values to see the result</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Countdown ───────────────────────────────────────────────────────── */}
      {tab === 'countdown' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input */}
            <div className="card space-y-5">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-brand-400" />
                Countdown Target
              </h2>

              <div className="flex gap-2 flex-wrap">
                {(['end-of-day', 'end-of-week', 'new-year', 'christmas'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setQuickCountdown(preset)}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-brand-300 transition-all"
                  >
                    {preset.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block font-medium">Event Label</label>
                <input
                  type="text"
                  value={countdownLabel}
                  onChange={(e) => setCountdownLabel(e.target.value)}
                  placeholder="My Event"
                  className="input-field w-full font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block font-medium">Target Date & Time</label>
                <input
                  type="datetime-local"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="input-field w-full font-mono text-sm"
                />
              </div>

              <button
                onClick={() => setCountdownNow(new Date())}
                className="btn-secondary w-full flex items-center justify-center gap-1.5 text-sm"
              >
                <Clock className="w-3.5 h-3.5" />
                Refresh Countdown
              </button>
            </div>

            {/* Countdown Display */}
            <div className="card space-y-4">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-brand-400" />
                {countdownResult?.isPast ? 'Time since' : countdownResult ? 'Time remaining' : 'Countdown'}
              </h2>

              {countdownResult ? (
                countdownResult.isPast ? (
                  <div className="bg-amber-500/10 rounded-lg p-6 border border-amber-500/30 text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <div className="text-lg font-bold text-amber-400">
                      &quot;{countdownResult.label}&quot; has passed!
                    </div>
                    <p className="text-sm text-slate-400 mt-2">
                      Set a future date to start counting down.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        ['Days', countdownResult.days],
                        ['Hours', countdownResult.hours],
                        ['Minutes', countdownResult.minutes],
                        ['Seconds', countdownResult.seconds],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-slate-950 rounded-lg p-3 border border-slate-700/50 text-center">
                          <div className="text-2xl font-bold text-white font-mono">{value}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-surface-light rounded-lg p-4 border border-slate-700/30 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Total Hours</span>
                        <span className="text-sm font-mono text-white">{countdownResult.totalHours.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Total Minutes</span>
                        <span className="text-sm font-mono text-white">{countdownResult.totalMinutes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Total Seconds</span>
                        <span className="text-sm font-mono text-white">{countdownResult.totalSeconds.toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      Until: {new Date(targetDate).toLocaleString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long',
                        day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </>
                )
              ) : (
                <div className="text-slate-500 text-sm text-center py-10">
                  Set a target date and click Refresh to see the countdown
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
