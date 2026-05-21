'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'timestamp-to-date' | 'date-to-timestamp';

interface FormatEntry {
  label: string;
  value: string;
  description: string;
}

const COMMON_TIMESTAMPS = [
  { label: 'Unix epoch', value: 0 },
  { label: 'Y2K', value: 946684800 },
  { label: 'iPhone launch', value: 1183132800 },
  { label: 'Bitcoin genesis', value: 1231006505 },
  { label: 'COVID declared pandemic', value: 1583884800 },
];

const TIMEZONES = [
  { label: 'UTC', offset: 'UTC' },
  { label: 'US Eastern (ET)', offset: 'America/New_York' },
  { label: 'US Central (CT)', offset: 'America/Chicago' },
  { label: 'US Mountain (MT)', offset: 'America/Denver' },
  { label: 'US Pacific (PT)', offset: 'America/Los_Angeles' },
  { label: 'London (GMT/BST)', offset: 'Europe/London' },
  { label: 'Berlin (CET/CEST)', offset: 'Europe/Berlin' },
  { label: 'Tokyo (JST)', offset: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', offset: 'Australia/Sydney' },
  { label: 'India (IST)', offset: 'Asia/Kolkata' },
  { label: 'Dubai (GST)', offset: 'Asia/Dubai' },
  { label: 'São Paulo (BRT)', offset: 'America/Sao_Paulo' },
];

function formatDate(date: Date, tz: string): FormatEntry[] {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  const parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const h = get('hour');
  const min = get('minute');
  const s = get('second');

  const iso = `${y}-${m}-${d}T${h}:${min}:${s}`;

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Build a date in the target timezone for weekday/month names
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const wd = weekdays[tzDate.getDay()];
  const mn = months[tzDate.getMonth()];

  const rfc2822 = `${wd.slice(0, 3)}, ${d} ${mn.slice(0, 3)} ${y} ${h}:${min}:${s} ${tz === 'UTC' ? '+0000' : ''}`;
  const friendly = `${wd}, ${mn} ${parseInt(d)}, ${y} at ${h}:${min}:${s}`;
  const unixSeconds = Math.floor(date.getTime() / 1000);
  const unixMillis = date.getTime();

  return [
    { label: 'ISO 8601', value: iso, description: 'Standard machine-readable format' },
    { label: 'RFC 2822', value: rfc2822, description: 'Email/HTTP date format' },
    { label: 'UNIX (seconds)', value: String(unixSeconds), description: 'Seconds since epoch' },
    { label: 'UNIX (milliseconds)', value: String(unixMillis), description: 'Milliseconds since epoch' },
    { label: 'Human-readable', value: friendly, description: 'Full date with weekday' },
  ];
}

function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const abs = Math.abs(diff);

  const seconds = Math.floor(abs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  const prefix = diff >= 0 ? '' : 'in ';

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${prefix}${seconds} second${seconds !== 1 ? 's' : ''} ${diff >= 0 ? 'ago' : ''}`;
  if (minutes < 60) return `${prefix}${minutes} minute${minutes !== 1 ? 's' : ''} ${diff >= 0 ? 'ago' : ''}`;
  if (hours < 24) return `${prefix}${hours} hour${hours !== 1 ? 's' : ''} ${diff >= 0 ? 'ago' : ''}`;
  if (days < 7) return `${prefix}${days} day${days !== 1 ? 's' : ''} ${diff >= 0 ? 'ago' : ''}`;
  if (weeks < 5) return `${prefix}${weeks} week${weeks !== 1 ? 's' : ''} ${diff >= 0 ? 'ago' : ''}`;
  if (months < 12) return `${prefix}${months} month${months !== 1 ? 's' : ''} ${diff >= 0 ? 'ago' : ''}`;
  return `${prefix}${years} year${years !== 1 ? 's' : ''} ${diff >= 0 ? 'ago' : ''}`;
}

export default function TimestampConverterPage() {
  const [tab, setTab] = useState<Tab>('timestamp-to-date');
  const [tsInput, setTsInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [tsUnit, setTsUnit] = useState<'seconds' | 'milliseconds'>('seconds');
  const [tsError, setTsError] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [now, setNow] = useState(Date.now());
  const [liveMode, setLiveMode] = useState(true);
  const [showCommonTs, setShowCommonTs] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [liveMode]);

  // Parse timestamp input
  const parsedDate = useMemo(() => {
    setTsError(null);
    const trimmed = tsInput.trim();
    if (!trimmed) return null;

    let ms: number;
    if (tsUnit === 'seconds') {
      const s = Number(trimmed);
      if (!Number.isFinite(s) || !/^-?\d+$/.test(trimmed)) {
        setTsError('Invalid timestamp — must be an integer');
        return null;
      }
      ms = s * 1000;
    } else {
      const m = Number(trimmed);
      if (!Number.isFinite(m) || !/^-?\d+$/.test(trimmed)) {
        setTsError('Invalid timestamp — must be an integer');
        return null;
      }
      ms = m;
    }

    const d = new Date(ms);
    if (isNaN(d.getTime())) {
      setTsError('Invalid timestamp — out of range');
      return null;
    }

    // Range check
    if (ms < -8640000000000000 || ms > 8640000000000000) {
      setTsError('Timestamp out of valid Date range (±275,760 years)');
      return null;
    }

    return d;
  }, [tsInput, tsUnit]);

  // Parse date input for date-to-timestamp
  const dateTimestamp = useMemo(() => {
    if (!dateInput) return null;
    const dtStr = timeInput ? `${dateInput}T${timeInput}` : `${dateInput}T00:00:00`;
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return null;

    // If timezone selected, we need to interpret the input in that tz
    if (timezone !== 'UTC') {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(d);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
      const isoStr = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
      const utcDate = new Date(isoStr + 'Z');
      if (!isNaN(utcDate.getTime())) return utcDate;
    }

    return d;
  }, [dateInput, timeInput, timezone]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setShowCopyFeedback(label);
        setTimeout(() => setShowCopyFeedback(null), 1500);
        toast.success('Copied!');
      },
      () => toast.error('Failed to copy'),
    );
  }, []);

  const setToNow = useCallback(() => {
    if (tsUnit === 'seconds') {
      setTsInput(String(Math.floor(Date.now() / 1000)));
    } else {
      setTsInput(String(Date.now()));
    }
    setLiveMode(true);
  }, [tsUnit]);

  const setCommonTs = useCallback((ts: number) => {
    setTsInput(String(tsUnit === 'seconds' ? ts : ts * 1000));
    setShowCommonTs(false);
  }, [tsUnit]);

  const setDateToNow = useCallback(() => {
    const d = new Date();
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    const [dt, tm] = localISO.split('T');
    setDateInput(dt);
    setTimeInput(tm);
  }, []);

  const formats = parsedDate ? formatDate(parsedDate, timezone) : [];
  const nowFormats = formatDate(new Date(now), timezone);
  const relTime = parsedDate ? relativeTime(parsedDate.getTime()) : null;

  return (
    <ToolLayout
      title="Timestamp Converter"
      description="Convert between UNIX timestamps and human-readable dates. Supports seconds and milliseconds, timezones, relative time, and multiple output formats."
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-surface-lighter inline-flex">
        <button
          onClick={() => { setTab('timestamp-to-date'); setLiveMode(true); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'timestamp-to-date'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Timestamp → Date
        </button>
        <button
          onClick={() => setTab('date-to-timestamp')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'date-to-timestamp'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Date → Timestamp
        </button>
      </div>

      {tab === 'timestamp-to-date' && (
        <div className="space-y-6">
          {/* Input section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-slate-300">UNIX Timestamp</label>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-surface-lighter p-0.5">
                  <button
                    onClick={() => {
                      setTsUnit('seconds');
                      if (tsInput && !isNaN(Number(tsInput))) {
                        setTsInput(String(Math.floor(Number(tsInput) / 1000)));
                      }
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      tsUnit === 'seconds'
                        ? 'bg-brand-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Seconds
                  </button>
                  <button
                    onClick={() => {
                      setTsUnit('milliseconds');
                      if (tsInput && !isNaN(Number(tsInput))) {
                        setTsInput(String(Number(tsInput) * 1000));
                      }
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      tsUnit === 'milliseconds'
                        ? 'bg-brand-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Milliseconds
                  </button>
                </div>
                <button
                  onClick={setToNow}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-surface text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 border border-slate-700/50 transition-colors"
                  title="Set to current timestamp"
                >
                  <RefreshCw className="w-3 h-3" />
                  Now
                </button>
              </div>
            </div>

            <input
              type="text"
              value={tsInput}
              onChange={(e) => {
                setTsInput(e.target.value);
                setLiveMode(false);
              }}
              placeholder={tsUnit === 'seconds' ? 'e.g. 1716278400' : 'e.g. 1716278400000'}
              className="input-field w-full font-mono text-lg"
            />

            {tsError && (
              <p className="text-red-400 text-sm mt-2">{tsError}</p>
            )}

            {/* Common timestamps */}
            <div className="mt-3">
              <button
                onClick={() => setShowCommonTs(!showCommonTs)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showCommonTs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Common timestamps
              </button>
              {showCommonTs && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_TIMESTAMPS.map((ct) => (
                    <button
                      key={ct.label}
                      onClick={() => setCommonTs(ct.value)}
                      className="px-2.5 py-1 text-xs rounded-md bg-surface text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 border border-slate-700/50 transition-colors"
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timezone selector */}
          <div className="card">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Output Timezone
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.offset}
                  onClick={() => setTimezone(tz.offset)}
                  className={`px-3 py-1.5 text-xs rounded-md font-mono transition-colors ${
                    timezone === tz.offset
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
                  }`}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Output */}
          {parsedDate && !tsError && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider">
                  Converted Date
                </h3>
                {relTime && (
                  <span className="text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
                    {relTime}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {formats.map((fmt) => (
                  <div
                    key={fmt.label}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface border border-slate-700/30 hover:border-slate-600/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500 mb-0.5">{fmt.label}</div>
                      <div className="font-mono text-sm text-slate-200 truncate select-all">
                        {fmt.value}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(fmt.value, fmt.label)}
                      className={`ml-3 flex-shrink-0 p-1.5 rounded-md transition-colors ${
                        showCopyFeedback === fmt.label
                          ? 'bg-green-500/20 text-green-400'
                          : 'text-slate-500 hover:text-brand-400 hover:bg-brand-500/10'
                      }`}
                      title={`Copy ${fmt.label}`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'date-to-timestamp' && (
        <div className="space-y-6">
          {/* Date/Time Input */}
          <div className="card">
            <label className="text-sm font-medium text-slate-300 mb-3 block">
              Select Date & Time
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Date</label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="input-field w-full font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Time (24h)</label>
                <input
                  type="time"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="input-field w-full font-mono"
                />
              </div>
            </div>
            <button
              onClick={setDateToNow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-surface text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 border border-slate-700/50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Set to Now
            </button>
          </div>

          {/* Timezone selector */}
          <div className="card">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Input Timezone
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Select the timezone of your input date/time. The tool will convert to UTC for the timestamp.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.offset}
                  onClick={() => setTimezone(tz.offset)}
                  className={`px-3 py-1.5 text-xs rounded-md font-mono transition-colors ${
                    timezone === tz.offset
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
                  }`}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Output */}
          {dateTimestamp && (
            <div className="card">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                UNIX Timestamp
              </h3>

              <div className="space-y-2">
                {[
                  {
                    label: 'Seconds',
                    value: String(Math.floor(dateTimestamp.getTime() / 1000)),
                    description: 'Standard UNIX timestamp',
                  },
                  {
                    label: 'Milliseconds',
                    value: String(dateTimestamp.getTime()),
                    description: 'JavaScript Date.now() format',
                  },
                  {
                    label: 'ISO 8601 (UTC)',
                    value: dateTimestamp.toISOString(),
                    description: 'UTC representation',
                  },
                ].map((fmt) => (
                  <div
                    key={fmt.label}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface border border-slate-700/30 hover:border-slate-600/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500 mb-0.5">{fmt.label}</div>
                      <div className="font-mono text-sm text-slate-200 truncate select-all">
                        {fmt.value}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(fmt.value, fmt.label)}
                      className={`ml-3 flex-shrink-0 p-1.5 rounded-md transition-colors ${
                        showCopyFeedback === fmt.label
                          ? 'bg-green-500/20 text-green-400'
                          : 'text-slate-500 hover:text-brand-400 hover:bg-brand-500/10'
                      }`}
                      title={`Copy ${fmt.label}`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Clock */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Live Clock
          </h3>
          <button
            onClick={() => setLiveMode(!liveMode)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              liveMode
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-surface text-slate-400 border border-slate-700/30 hover:text-slate-200'
            }`}
          >
            {liveMode ? 'Live' : 'Paused'}
          </button>
        </div>

        <div className="space-y-2">
          {nowFormats.map((fmt) => (
            <div
              key={fmt.label}
              className="flex items-center justify-between p-3 rounded-lg bg-surface border border-slate-700/30 group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-0.5">{fmt.label}</div>
                <div className="font-mono text-sm text-slate-200 truncate select-all">
                  {fmt.value}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(fmt.value, fmt.label)}
                className={`ml-3 flex-shrink-0 p-1.5 rounded-md transition-colors ${
                  showCopyFeedback === fmt.label
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-slate-500 hover:text-brand-400 hover:bg-brand-500/10'
                }`}
                title={`Copy ${fmt.label}`}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3 text-center">
          All times shown in {TIMEZONES.find(t => t.offset === timezone)?.label ?? timezone}
        </p>
      </div>
    </ToolLayout>
  );
}
