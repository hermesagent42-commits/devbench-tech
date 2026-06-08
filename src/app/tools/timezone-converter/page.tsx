'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Clock, Globe, Calendar, Users, ArrowRightLeft, RefreshCw, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface TimezoneEntry {
  code: string;
  city: string;
  region: string;
  offset: string;
}

type Tab = 'converter' | 'world-clock' | 'meeting-planner';

// ── Comprehensive timezone list ────────────────────────────────────────────

const TIMEZONES: TimezoneEntry[] = [
  { code: 'Pacific/Midway', city: 'Midway Island', region: 'Pacific', offset: '-11:00' },
  { code: 'Pacific/Honolulu', city: 'Honolulu', region: 'North America', offset: '-10:00' },
  { code: 'America/Anchorage', city: 'Anchorage', region: 'North America', offset: '-08:00' },
  { code: 'America/Los_Angeles', city: 'Los Angeles', region: 'North America', offset: '-07:00' },
  { code: 'America/Denver', city: 'Denver', region: 'North America', offset: '-06:00' },
  { code: 'America/Chicago', city: 'Chicago', region: 'North America', offset: '-05:00' },
  { code: 'America/New_York', city: 'New York', region: 'North America', offset: '-04:00' },
  { code: 'America/Sao_Paulo', city: 'São Paulo', region: 'South America', offset: '-03:00' },
  { code: 'Atlantic/South_Georgia', city: 'South Georgia', region: 'Atlantic', offset: '-02:00' },
  { code: 'Atlantic/Azores', city: 'Azores', region: 'Atlantic', offset: '+00:00' },
  { code: 'Europe/London', city: 'London', region: 'Europe', offset: '+01:00' },
  { code: 'Europe/Paris', city: 'Paris', region: 'Europe', offset: '+02:00' },
  { code: 'Europe/Berlin', city: 'Berlin', region: 'Europe', offset: '+02:00' },
  { code: 'Europe/Moscow', city: 'Moscow', region: 'Europe', offset: '+03:00' },
  { code: 'Asia/Dubai', city: 'Dubai', region: 'Middle East', offset: '+04:00' },
  { code: 'Asia/Karachi', city: 'Karachi', region: 'Asia', offset: '+05:00' },
  { code: 'Asia/Kolkata', city: 'Mumbai', region: 'Asia', offset: '+05:30' },
  { code: 'Asia/Kathmandu', city: 'Kathmandu', region: 'Asia', offset: '+05:45' },
  { code: 'Asia/Dhaka', city: 'Dhaka', region: 'Asia', offset: '+06:00' },
  { code: 'Asia/Bangkok', city: 'Bangkok', region: 'Asia', offset: '+07:00' },
  { code: 'Asia/Shanghai', city: 'Shanghai', region: 'Asia', offset: '+08:00' },
  { code: 'Asia/Tokyo', city: 'Tokyo', region: 'Asia', offset: '+09:00' },
  { code: 'Australia/Sydney', city: 'Sydney', region: 'Australia', offset: '+10:00' },
  { code: 'Pacific/Noumea', city: 'Noumea', region: 'Pacific', offset: '+11:00' },
  { code: 'Pacific/Auckland', city: 'Auckland', region: 'Pacific', offset: '+12:00' },
  { code: 'Pacific/Kiritimati', city: 'Kiritimati', region: 'Pacific', offset: '+14:00' },
  { code: 'America/Toronto', city: 'Toronto', region: 'North America', offset: '-04:00' },
  { code: 'America/Mexico_City', city: 'Mexico City', region: 'North America', offset: '-06:00' },
  { code: 'America/Bogota', city: 'Bogotá', region: 'South America', offset: '-05:00' },
  { code: 'America/Lima', city: 'Lima', region: 'South America', offset: '-05:00' },
  { code: 'America/Buenos_Aires', city: 'Buenos Aires', region: 'South America', offset: '-03:00' },
  { code: 'Atlantic/Cape_Verde', city: 'Cape Verde', region: 'Atlantic', offset: '-01:00' },
  { code: 'Africa/Casablanca', city: 'Casablanca', region: 'Africa', offset: '+01:00' },
  { code: 'Africa/Lagos', city: 'Lagos', region: 'Africa', offset: '+01:00' },
  { code: 'Africa/Johannesburg', city: 'Johannesburg', region: 'Africa', offset: '+02:00' },
  { code: 'Africa/Cairo', city: 'Cairo', region: 'Africa', offset: '+03:00' },
  { code: 'Africa/Nairobi', city: 'Nairobi', region: 'Africa', offset: '+03:00' },
  { code: 'Europe/Madrid', city: 'Madrid', region: 'Europe', offset: '+02:00' },
  { code: 'Europe/Rome', city: 'Rome', region: 'Europe', offset: '+02:00' },
  { code: 'Europe/Amsterdam', city: 'Amsterdam', region: 'Europe', offset: '+02:00' },
  { code: 'Europe/Stockholm', city: 'Stockholm', region: 'Europe', offset: '+02:00' },
  { code: 'Europe/Warsaw', city: 'Warsaw', region: 'Europe', offset: '+02:00' },
  { code: 'Europe/Istanbul', city: 'Istanbul', region: 'Europe', offset: '+03:00' },
  { code: 'Asia/Tehran', city: 'Tehran', region: 'Middle East', offset: '+03:30' },
  { code: 'Asia/Tashkent', city: 'Tashkent', region: 'Asia', offset: '+05:00' },
  { code: 'Asia/Yangon', city: 'Yangon', region: 'Asia', offset: '+06:30' },
  { code: 'Asia/Jakarta', city: 'Jakarta', region: 'Asia', offset: '+07:00' },
  { code: 'Asia/Singapore', city: 'Singapore', region: 'Asia', offset: '+08:00' },
  { code: 'Asia/Taipei', city: 'Taipei', region: 'Asia', offset: '+08:00' },
  { code: 'Asia/Seoul', city: 'Seoul', region: 'Asia', offset: '+09:00' },
  { code: 'Australia/Perth', city: 'Perth', region: 'Australia', offset: '+08:00' },
  { code: 'Australia/Adelaide', city: 'Adelaide', region: 'Australia', offset: '+09:30' },
  { code: 'Pacific/Fiji', city: 'Suva', region: 'Pacific', offset: '+12:00' },
  { code: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur', region: 'Asia', offset: '+08:00' },
  { code: 'Asia/Manila', city: 'Manila', region: 'Asia', offset: '+08:00' },
  { code: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh', region: 'Asia', offset: '+07:00' },
  { code: 'Atlantic/Canary', city: 'Canary Islands', region: 'Atlantic', offset: '+01:00' },
  { code: 'Europe/Dublin', city: 'Dublin', region: 'Europe', offset: '+01:00' },
  { code: 'Europe/Lisbon', city: 'Lisbon', region: 'Europe', offset: '+01:00' },
  { code: 'America/Vancouver', city: 'Vancouver', region: 'North America', offset: '-07:00' },
  { code: 'America/Phoenix', city: 'Phoenix', region: 'North America', offset: '-07:00' },
  { code: 'America/Edmonton', city: 'Edmonton', region: 'North America', offset: '-06:00' },
  { code: 'America/Winnipeg', city: 'Winnipeg', region: 'North America', offset: '-05:00' },
  { code: 'America/Havana', city: 'Havana', region: 'Caribbean', offset: '-04:00' },
  { code: 'America/Santiago', city: 'Santiago', region: 'South America', offset: '-04:00' },
];

// World clock cities (subset for quick view)
const WORLD_CLOCK_CITIES = [
  TIMEZONES[4],   // Los Angeles
  TIMEZONES[6],   // New York
  TIMEZONES[10],  // London
  TIMEZONES[11],  // Paris
  TIMEZONES[13],  // Moscow
  TIMEZONES[14],  // Dubai
  TIMEZONES[16],  // Mumbai
  TIMEZONES[20],  // Shanghai
  TIMEZONES[21],  // Tokyo
  TIMEZONES[22],  // Sydney
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentTimeInTz(tz: string): Date {
  // Returns the current moment interpreted in the given timezone using Intl
  const now = new Date();
  const str = now.toLocaleString('en-US', { timeZone: tz });
  return new Date(str);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatFull(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

function getOffsetDisplay(tz: string): string {
  const now = new Date();
  const str = now.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'short' });
  // Extract offset from timeZoneName (e.g. "GMT-4" or "PDT")
  const parts = str.split(' ');
  const tzName = parts[parts.length - 1];
  if (tzName.startsWith('GMT')) return tzName;
  return tzName;
}

// ── Components ──────────────────────────────────────────────────────────────

function TimezoneConverter() {
  const [fromTz, setFromTz] = useState('America/New_York');
  const [toTz, setToTz] = useState('Asia/Tokyo');
  const [dateTime, setDateTime] = useState(() => {
    // Default to now in fromTz
    const now = new Date();
    const str = now.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).replace(' ', 'T').slice(0, 16);
    return str;
  });

  const converted = useMemo(() => {
    // Parse the input datetime as a time in the source timezone
    const [datePart, timePart] = dateTime.split('T');
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = timePart.split(':').map(Number);
    // Create date as if it's in the source timezone
    // We construct a naive date string and interpret it in source tz
    const naiveStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    const fromDate = new Date(naiveStr + getOffsetForConstructor(fromTz, new Date(naiveStr)));
    const toStr = fromDate.toLocaleString('en-US', { timeZone: toTz });
    const toDate = new Date(toStr);
    return {
      fromDisplay: fromDate.toLocaleString('en-US', {
        timeZone: fromTz,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
      toDisplay: toDate.toLocaleString('en-US', {
        timeZone: toTz,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
      fromOffset: getOffsetDisplay(fromTz),
      toOffset: getOffsetDisplay(toTz),
      diff: computeDiff(fromTz, toTz, fromDate),
    };
  }, [fromTz, toTz, dateTime]);

  const swap = useCallback(() => {
    setFromTz(toTz);
    setToTz(fromTz);
  }, [fromTz, toTz]);

  const setToNow = useCallback(() => {
    const now = new Date();
    const str = now.toLocaleString('sv-SE', { timeZone: fromTz }).replace(' ', 'T').slice(0, 16);
    setDateTime(str);
  }, [fromTz]);

  return (
    <div className="space-y-6">
      {/* Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ArrowRightLeft className="w-4 h-4 text-brand-400" />
            From Timezone
          </div>
          <select
            value={fromTz}
            onChange={(e) => setFromTz(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.code} value={tz.code}>
                {tz.city} ({tz.region}) — {tz.offset}
              </option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Date & Time</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button
                onClick={setToNow}
                className="px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-300 hover:text-brand-400 hover:border-brand-500/50 text-sm transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                Now
              </button>
            </div>
          </div>
        </div>

        {/* Target */}
        <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Globe className="w-4 h-4 text-green-400" />
              To Timezone
            </div>
            <button
              onClick={swap}
              className="p-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-300 hover:text-brand-400 hover:border-brand-500/50 transition-colors"
              title="Swap timezones"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
          <select
            value={toTz}
            onChange={(e) => setToTz(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.code} value={tz.code}>
                {tz.city} ({tz.region}) — {tz.offset}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      {converted && (
        <div className="rounded-xl border border-slate-700/50 bg-gradient-to-r from-surface-light to-slate-800/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Source ({converted.fromOffset})</div>
              <div className="text-xl font-mono text-slate-100">{converted.fromDisplay}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Converted ({converted.toOffset})</div>
              <div className="text-xl font-mono text-brand-300">{converted.toDisplay}</div>
            </div>
          </div>
          {converted.diff && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <span className="text-sm text-slate-400">
                Time difference: <span className="text-slate-200 font-semibold">{converted.diff}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getOffsetForConstructor(tz: string, refDate: Date): string {
  // Get the timezone offset at refDate for constructing dates
  const parts = refDate.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).split(' ');
  const offsetStr = parts[parts.length - 1]; // e.g. "GMT-04:00" or "GMT+05:30"
  if (offsetStr.startsWith('GMT')) {
    return offsetStr.replace('GMT', '');
  }
  return '';
}

function computeDiff(fromTz: string, toTz: string, fromDate: Date): string {
  const fromStr = fromDate.toLocaleString('en-US', { timeZone: fromTz });
  const toStr = fromDate.toLocaleString('en-US', { timeZone: toTz });
  const fromD = new Date(fromStr);
  const toD = new Date(toStr);
  const diffMs = toD.getTime() - fromD.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH === 0) return 'Same time';
  const sign = diffH > 0 ? '+' : '';
  if (Number.isInteger(diffH)) return `${sign}${diffH}h`;
  const h = Math.floor(Math.abs(diffH));
  const m = Math.round((Math.abs(diffH) - h) * 60);
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

// ── World Clock ─────────────────────────────────────────────────────────────

function WorldClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cityTimes = useMemo(() => {
    const currentTime = new Date(now);
    return WORLD_CLOCK_CITIES.map((tz) => ({
      ...tz,
      time: getCurrentTimeInTz(tz.code),
      _rendered: currentTime.getTime(),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.getTime()]);

  const localTime = useMemo(() => formatTime(now), [now]);
  const localDate = useMemo(() => formatDate(now), [now]);

  return (
    <div className="space-y-6">
      {/* Local time highlight */}
      <div className="p-5 rounded-xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-slate-800/50 text-center">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Your Local Time</div>
        <div className="text-4xl font-mono font-bold text-slate-100">{localTime}</div>
        <div className="text-sm text-slate-400 mt-1">{localDate}</div>
      </div>

      {/* World cities grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cityTimes.map((city) => {
          const hour = city.time.getHours();
          const isNight = hour < 6 || hour >= 20;
          const isEvening = hour >= 17 && hour < 20;
          return (
            <div
              key={city.code}
              className="p-4 rounded-xl border border-slate-700/50 bg-surface-light hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isNight ? (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  ) : isEvening ? (
                    <Sun className="w-4 h-4 text-amber-400/60" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-200">{city.city}</span>
                </div>
                <span className="text-xs text-slate-500">{city.region}</span>
              </div>
              <div className="text-2xl font-mono text-slate-100">{formatTime(city.time)}</div>
              <div className="text-xs text-slate-500 mt-0.5">{formatDate(city.time)}</div>
              <div className="mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isNight ? 'bg-indigo-500/20 text-indigo-300' :
                  isEvening ? 'bg-amber-500/20 text-amber-300' :
                  'bg-amber-500/20 text-amber-300'
                }`}>
                  {isNight ? 'Night' : isEvening ? 'Evening' : 'Daytime'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-slate-500">
        Updates every second — all times calculated in your browser
      </div>
    </div>
  );
}

// ── Meeting Planner ─────────────────────────────────────────────────────────

function MeetingPlanner() {
  const [locations, setLocations] = useState<string[]>([
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
  ]);
  const [newTz, setNewTz] = useState('Asia/Kolkata');
  const [baseTime, setBaseTime] = useState(() => {
    const now = new Date();
    // Round to next hour
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return now.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).replace(' ', 'T').slice(0, 16);
  });

  const addLocation = useCallback(() => {
    if (!locations.includes(newTz)) {
      setLocations((prev) => [...prev, newTz]);
    }
  }, [newTz, locations]);

  const removeLocation = useCallback((tz: string) => {
    setLocations((prev) => prev.filter((t) => t !== tz));
  }, []);

  // Generate time slots around base time
  const timeSlots = useMemo(() => {
    const [datePart, timePart] = baseTime.split('T');
    if (!datePart || !timePart) return [];
    const [y, m, d] = datePart.split('-').map(Number);
    const [h] = timePart.split(':').map(Number);
    const naiveBase = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00`;

    const slots = [];
    for (let offset = -4; offset <= 8; offset++) {
      const slotH = h + offset;
      // Clamp to valid hours 0-23
      if (slotH < 0 || slotH > 23) continue;
      const slotStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(slotH).padStart(2, '0')}:00:00`;
      const slotDate = new Date(slotStr + getOffsetForConstructor(locations[0], new Date(slotStr)));

      const times: Record<string, string> = {};
      let allBusinessHours = true;
      let allAwake = true;

      for (const tz of locations) {
        const local = slotDate.toLocaleString('en-US', { timeZone: tz });
        const localDate = new Date(local);
        const lh = localDate.getHours();
        times[tz] = localDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: tz,
        });
        if (lh < 9 || lh >= 17) allBusinessHours = false;
        if (lh < 6 || lh >= 22) allAwake = false;
      }

      slots.push({
        baseTime: String(slotH).padStart(2, '0') + ':00',
        times,
        allBusinessHours,
        allAwake,
      });
    }
    return slots;
  }, [baseTime, locations]);

  const locationEntries = useMemo(() => {
    return locations.map((tz) => TIMEZONES.find((t) => t.code === tz) || { code: tz, city: tz, region: '', offset: '' });
  }, [locations]);

  return (
    <div className="space-y-6">
      {/* Location picker */}
      <div className="p-5 rounded-xl border border-slate-700/50 bg-surface-light space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Users className="w-4 h-4 text-purple-400" />
          Meeting Participants
        </div>

        {/* Selected locations */}
        <div className="flex flex-wrap gap-2">
          {locationEntries.map((loc) => (
            <span
              key={loc.code}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-sm text-slate-200"
            >
              {loc.city}
              <button
                onClick={() => removeLocation(loc.code)}
                className="text-slate-500 hover:text-red-400 transition-colors"
                disabled={locations.length <= 1}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add location */}
        <div className="flex gap-2">
          <select
            value={newTz}
            onChange={(e) => setNewTz(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.code} value={tz.code} disabled={locations.includes(tz.code)}>
                {tz.city} ({tz.region}) — {tz.offset}
              </option>
            ))}
          </select>
          <button
            onClick={addLocation}
            disabled={locations.includes(newTz)}
            className="px-4 py-2 rounded-lg bg-brand-500/20 text-brand-300 text-sm font-medium hover:bg-brand-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>

        {/* Base time */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 whitespace-nowrap">Starting at:</label>
          <input
            type="datetime-local"
            value={baseTime}
            onChange={(e) => setBaseTime(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>
      </div>

      {/* Time slot grid */}
      {timeSlots.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Time (first location)</th>
                  {locationEntries.map((loc) => (
                    <th key={loc.code} className="text-left px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      {loc.city}
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, i) => (
                  <tr
                    key={i}
                    className={`border-t border-slate-700/50 ${
                      slot.allBusinessHours
                        ? 'bg-green-500/5 hover:bg-green-500/10'
                        : slot.allAwake
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : 'hover:bg-slate-800/30'
                    } transition-colors`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-200">{slot.baseTime}</td>
                    {locations.map((tz) => (
                      <td key={tz} className="px-4 py-3 font-mono text-slate-300">
                        {slot.times[tz]}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      {slot.allBusinessHours ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
                          <Sun className="w-3 h-3" /> All business hours
                        </span>
                      ) : slot.allAwake ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                          <Sun className="w-3 h-3" /> All awake
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Conflicts</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500 text-center">
        🟢 Green = everyone&apos;s in business hours (9 AM–5 PM) · 🟡 Yellow = everyone&apos;s awake (6 AM–10 PM) · Conflicts outside these ranges
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function TimezoneConverterPage() {
  const [tab, setTab] = useState<Tab>('converter');

  const tabs = [
    { id: 'converter' as Tab, label: 'Time Converter', icon: ArrowRightLeft },
    { id: 'world-clock' as Tab, label: 'World Clock', icon: Globe },
    { id: 'meeting-planner' as Tab, label: 'Meeting Planner', icon: Users },
  ];

  return (
    <ToolLayout
      title="Timezone Converter & World Clock"
      description="Convert times between any two timezones, track world clocks in real-time, and find optimal meeting times across multiple locations — 100% client-side."
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'converter' && <TimezoneConverter />}
      {tab === 'world-clock' && <WorldClock />}
      {tab === 'meeting-planner' && <MeetingPlanner />}
    </ToolLayout>
  );
}
