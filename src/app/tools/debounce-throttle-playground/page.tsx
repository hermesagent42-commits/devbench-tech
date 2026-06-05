'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play,
  RotateCcw,
  Zap,
  Timer,
  MousePointerClick,
  ArrowDownToLine,
  Code2,
  Gauge,
  BarChart3,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Strategy = 'raw' | 'debounce' | 'throttle';

interface TimelineEvent {
  id: number;
  timestamp: number;
  strategy: Strategy;
  label: string;
}

interface Preset {
  name: string;
  description: string;
  delay: number;
  strategy: Strategy;
  autoInterval: number;
  autoCount: number;
}

const PRESETS: Preset[] = [
  {
    name: 'Search Input',
    description: 'Debounce 300ms — fires after user stops typing',
    delay: 300,
    strategy: 'debounce',
    autoInterval: 80,
    autoCount: 8,
  },
  {
    name: 'Scroll Handler',
    description: 'Throttle 200ms — at most once every 200ms',
    delay: 200,
    strategy: 'throttle',
    autoInterval: 30,
    autoCount: 20,
  },
  {
    name: 'Window Resize',
    description: 'Throttle 150ms — layout recalc at most every 150ms',
    delay: 150,
    strategy: 'throttle',
    autoInterval: 25,
    autoCount: 15,
  },
  {
    name: 'Button Spam',
    description: 'Debounce 500ms — prevent double submissions',
    delay: 500,
    strategy: 'debounce',
    autoInterval: 100,
    autoCount: 5,
  },
  {
    name: 'Cursor Tracking',
    description: 'Throttle 50ms — smooth mouse tracking',
    delay: 50,
    strategy: 'throttle',
    autoInterval: 16,
    autoCount: 30,
  },
  {
    name: 'Live Collab',
    description: 'Throttle 100ms — cursor position updates',
    delay: 100,
    strategy: 'throttle',
    autoInterval: 20,
    autoCount: 25,
  },
];

function makeDebounce(
  fn: (...args: string[]) => void,
  delay: number
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    invoke(...args: string[]) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn(...args); }, delay);
    },
    cancel() {
      if (timer !== null) { clearTimeout(timer); timer = null; }
    },
  };
}

function makeThrottle(
  fn: (...args: string[]) => void,
  delay: number
) {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    invoke(...args: string[]) {
      const now = Date.now();
      const remaining = delay - (now - lastTime);
      if (remaining <= 0) {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        lastTime = now;
        fn(...args);
      } else if (timer === null) {
        timer = setTimeout(() => {
          timer = null;
          lastTime = Date.now();
          fn(...args);
        }, remaining);
      }
    },
    cancel() {
      if (timer !== null) { clearTimeout(timer); timer = null; }
    },
  };
}

function TimelineTrack({
  label,
  color,
  events,
  totalDuration,
  icon: Icon,
}: {
  label: string;
  color: string;
  events: TimelineEvent[];
  totalDuration: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const barColor = color.replace('text-', 'bg-');
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-32 shrink-0 flex items-center gap-2 text-sm text-slate-300">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex-1 h-10 bg-slate-800/60 rounded-lg relative overflow-hidden border border-slate-700/50">
        {totalDuration > 0 && events.map((evt) => {
          const leftPct = (evt.timestamp / totalDuration) * 100;
          return (
            <div
              key={evt.id}
              className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-6 rounded ${barColor}`}
              style={{ left: `${Math.min(leftPct, 99)}%` }}
              title={`${evt.label} @ ${evt.timestamp}ms`}
            />
          );
        })}
        {totalDuration > 0 && [0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <div
            key={pct}
            className="absolute top-0 bottom-0 w-px bg-slate-600/40"
            style={{ left: `${pct * 100}%` }}
          />
        ))}
      </div>
      <span className="w-10 text-right text-xs text-slate-500 font-mono">{events.length}</span>
    </div>
  );
}

function CodeSnippet({ code }: { code: string }) {
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  }, [code]);
  return (
    <div className="relative group">
      <pre className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={copyCode}
        className="absolute top-2 right-2 p-1.5 rounded bg-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-600/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DebounceThrottlePlaygroundPage() {
  const [delay, setDelay] = useState(300);
  const [strategy, setStrategy] = useState<Strategy>('debounce');
  const [rawEvents, setRawEvents] = useState<TimelineEvent[]>([]);
  const [debouncedEvents, setDebouncedEvents] = useState<TimelineEvent[]>([]);
  const [throttledEvents, setThrottledEvents] = useState<TimelineEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [eventIdCounter, setEventIdCounter] = useState(0);
  const [autoInterval, setAutoInterval] = useState(80);
  const [autoCount, setAutoCount] = useState(8);
  const [autoRemaining, setAutoRemaining] = useState(0);

  const debouncerRef = useRef<ReturnType<typeof makeDebounce> | null>(null);
  const throttlerRef = useRef<ReturnType<typeof makeThrottle> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const totalDuration = useMemo(() => {
    const all = [...rawEvents, ...debouncedEvents, ...throttledEvents];
    if (all.length === 0) return 500;
    return Math.max(Math.max(...all.map((e) => e.timestamp)) + delay, 500);
  }, [rawEvents, debouncedEvents, throttledEvents, delay]);

  useEffect(() => {
    debouncerRef.current = makeDebounce((label: string) => {
      if (startTimeRef.current === null) return;
      const ts = Date.now() - startTimeRef.current;
      setDebouncedEvents((prev) => [...prev, { id: Date.now(), timestamp: ts, strategy: 'debounce', label }]);
    }, delay);

    throttlerRef.current = makeThrottle((label: string) => {
      if (startTimeRef.current === null) return;
      const ts = Date.now() - startTimeRef.current;
      setThrottledEvents((prev) => [...prev, { id: Date.now(), timestamp: ts, strategy: 'throttle', label }]);
    }, delay);

    return () => {
      debouncerRef.current?.cancel();
      throttlerRef.current?.cancel();
    };
  }, [delay]);

  useEffect(() => {
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, []);

  const fireEvent = useCallback(() => {
    if (startTimeRef.current === null) return;
    const ts = Date.now() - startTimeRef.current;
    const label = `Event #${eventIdCounter + 1}`;
    setEventIdCounter((c) => c + 1);
    setRawEvents((prev) => [...prev, { id: Date.now() + Math.random(), timestamp: ts, strategy: 'raw', label }]);
    debouncerRef.current?.invoke(label);
    throttlerRef.current?.invoke(label);
  }, [eventIdCounter]);

  useEffect(() => {
    if (running && autoRemaining > 0) {
      autoTimerRef.current = setInterval(() => {
        fireEvent();
        setAutoRemaining((r) => {
          if (r <= 1) {
            if (autoTimerRef.current) clearInterval(autoTimerRef.current);
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, autoInterval);
      return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
    } else if (running && autoRemaining === 0) {
      setRunning(false);
    }
  }, [running, autoRemaining, autoInterval, fireEvent]);

  const handleManualFire = useCallback(() => {
    if (startTimeRef.current === null) {
      const now = Date.now();
      startTimeRef.current = now;
    }
    fireEvent();
    setRunning(true);
  }, [fireEvent]);

  const handleReset = useCallback(() => {
    debouncerRef.current?.cancel();
    throttlerRef.current?.cancel();
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    setRawEvents([]);
    setDebouncedEvents([]);
    setThrottledEvents([]);
    startTimeRef.current = null;
    setEventIdCounter(0);
    setRunning(false);
    setAutoRemaining(0);
  }, []);

  const handleAutoFire = useCallback(() => {
    handleReset();
    const now = Date.now();
    startTimeRef.current = now;
    setAutoRemaining(autoCount);
    setRunning(true);
  }, [autoCount, handleReset]);

  const handlePreset = useCallback((preset: Preset) => {
    handleReset();
    setDelay(preset.delay);
    setStrategy(preset.strategy);
    setAutoInterval(preset.autoInterval);
    setAutoCount(preset.autoCount);
  }, [handleReset]);

  const stats = useMemo(() => {
    const raw = rawEvents.length;
    const deb = debouncedEvents.length;
    const thr = throttledEvents.length;
    return {
      raw,
      debounced: deb,
      throttled: thr,
      debSavings: raw > 0 ? Math.round((1 - deb / raw) * 100) : 0,
      thrSavings: raw > 0 ? Math.round((1 - thr / raw) * 100) : 0,
    };
  }, [rawEvents, debouncedEvents, throttledEvents]);

  const debounceCode = `function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Usage — search input
const search = debounce((query) => {
  fetch('/api/search?q=' + query);
}, ${delay});

input.addEventListener('input', (e) => {
  search(e.target.value);
});`;

  const throttleCode = `function throttle(fn, delay) {
  let lastTime = 0;
  let timer;
  return (...args) => {
    const now = Date.now();
    const remaining = delay - (now - lastTime);
    if (remaining <= 0) {
      clearTimeout(timer);
      lastTime = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        lastTime = Date.now();
        fn(...args);
      }, remaining);
    }
  };
}

// Usage — scroll handler
const onScroll = throttle(() => {
  console.log('scrolled!');
}, ${delay});

window.addEventListener('scroll', onScroll);`;

  const leadingThrottleCode = `// Leading-edge throttle (fire immediately, then wait)
function throttleLeading(fn, delay) {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
}`;

  return (
    <ToolLayout
      title="Debounce & Throttle Playground"
      description="Visually compare debounce, throttle, and raw event handling. Fire events, watch timelines, and understand exactly how these patterns control function execution."
    >
      {/* Presets */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Scenarios
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className={`text-left p-3 rounded-lg border text-xs transition-all ${
                delay === preset.delay && strategy === preset.strategy
                  ? 'border-brand-400/60 bg-brand-500/10'
                  : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/60'
              }`}
            >
              <div className="font-medium text-slate-200 mb-0.5">{preset.name}</div>
              <div className="text-slate-500">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Delay (ms): <span className="text-brand-400 font-mono font-bold">{delay}</span>
          </label>
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>10ms</span>
            <span>1000ms</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Strategy Focus</label>
          <div className="flex gap-1">
            {(['debounce', 'throttle'] as Strategy[]).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-all ${
                  strategy === s
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-400/40'
                    : 'bg-slate-700/40 text-slate-400 border border-slate-600/40 hover:border-slate-500/60'
                }`}
              >
                {s === 'debounce' ? 'Debounce' : 'Throttle'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Interval: <span className="text-brand-400 font-mono">{autoInterval}ms</span>
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={autoInterval}
            onChange={(e) => setAutoInterval(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Count: <span className="text-brand-400 font-mono">{autoCount}</span>
          </label>
          <input
            type="range"
            min={3}
            max={40}
            step={1}
            value={autoCount}
            onChange={(e) => setAutoCount(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleManualFire}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 border border-brand-400/40 text-brand-300 text-sm font-medium hover:bg-brand-500/30 transition-colors"
        >
          <MousePointerClick className="w-4 h-4" />
          Fire Event
        </button>
        <button
          onClick={handleAutoFire}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
        >
          <Play className="w-4 h-4" />
          Auto-Fire {autoCount} Events
        </button>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-300 text-sm font-medium hover:bg-slate-600/40 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        {running && (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-yellow-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Running... {autoRemaining} left
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-8 p-5 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Event Timeline ({totalDuration}ms window)
        </h3>
        <TimelineTrack label="Raw Events" color="text-slate-400" events={rawEvents} totalDuration={totalDuration} icon={ArrowDownToLine} />
        <TimelineTrack label="Debounced" color="text-orange-400" events={debouncedEvents} totalDuration={totalDuration} icon={Timer} />
        <TimelineTrack label="Throttled" color="text-emerald-400" events={throttledEvents} totalDuration={totalDuration} icon={Gauge} />
        <div className="flex gap-5 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-400" /> Raw</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400" /> Debounce (fire after {delay}ms silence)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400" /> Throttle (at most every {delay}ms)</span>
        </div>
      </div>

      {/* Stats */}
      {rawEvents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-slate-300 font-mono">{stats.raw}</div>
            <div className="text-xs text-slate-500">Raw Events</div>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
            <div className="text-2xl font-bold text-orange-400 font-mono">{stats.debounced}</div>
            <div className="text-xs text-orange-400/60">Debounced ({stats.debSavings}% fewer)</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-2xl font-bold text-emerald-400 font-mono">{stats.throttled}</div>
            <div className="text-xs text-emerald-400/60">Throttled ({stats.thrSavings}% fewer)</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center">
            <div className="text-2xl font-bold text-brand-400 font-mono">{delay}ms</div>
            <div className="text-xs text-slate-500">Delay</div>
          </div>
        </div>
      )}

      {/* Code Section */}
      <div className="mb-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-purple-400" />
          How {strategy === 'debounce' ? 'Debounce' : 'Throttle'} Works
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          {strategy === 'debounce'
            ? `Debounce waits until events stop firing for ${delay}ms, then executes once. Every new event resets the timer. Perfect for search inputs, form submissions, and auto-save — you only care about the final state.`
            : `Throttle ensures the handler fires at most once every ${delay}ms, regardless of how many events occur. The first event fires immediately, then subsequent events within the window are queued. Perfect for scroll, resize, and real-time tracking — you want regular updates but not every single event.`}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-orange-400 font-medium mb-1.5">Debounce</div>
            <CodeSnippet code={debounceCode} />
          </div>
          <div>
            <div className="text-xs text-emerald-400 font-medium mb-1.5">Throttle (trailing edge)</div>
            <CodeSnippet code={throttleCode} />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs text-yellow-400 font-medium mb-1.5">Throttle (leading edge — fire immediately)</div>
          <CodeSnippet code={leadingThrottleCode} />
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="py-3 px-4 text-slate-400 font-medium">Property</th>
              <th className="py-3 px-4 text-slate-400 font-medium">
                <span className="text-orange-400">Debounce</span>
              </th>
              <th className="py-3 px-4 text-slate-400 font-medium">
                <span className="text-emerald-400">Throttle</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-500">
            <tr className="border-b border-slate-700/30">
              <td className="py-2.5 px-4 text-slate-400">Execution</td>
              <td className="py-2.5 px-4">After inactivity</td>
              <td className="py-2.5 px-4">At regular intervals</td>
            </tr>
            <tr className="border-b border-slate-700/30">
              <td className="py-2.5 px-4 text-slate-400">Timer resets?</td>
              <td className="py-2.5 px-4">Yes — on each event</td>
              <td className="py-2.5 px-4">No — keeps counting</td>
            </tr>
            <tr className="border-b border-slate-700/30">
              <td className="py-2.5 px-4 text-slate-400">First event fires?</td>
              <td className="py-2.5 px-4">No — waits for silence</td>
              <td className="py-2.5 px-4">Yes — immediately</td>
            </tr>
            <tr className="border-b border-slate-700/30">
              <td className="py-2.5 px-4 text-slate-400">Last event fires?</td>
              <td className="py-2.5 px-4">Yes — after delay</td>
              <td className="py-2.5 px-4">Yes — within window</td>
            </tr>
            <tr className="border-b border-slate-700/30">
              <td className="py-2.5 px-4 text-slate-400">Best for</td>
              <td className="py-2.5 px-4">Final state (search, save)</td>
              <td className="py-2.5 px-4">Continuous (scroll, resize)</td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 text-slate-400">Max calls in 1s burst</td>
              <td className="py-2.5 px-4">1 (after last + delay)</td>
              <td className="py-2.5 px-4">{Math.floor(1000 / delay)} (1000ms / {delay}ms)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Event Log */}
      {rawEvents.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Event Log</h3>
          <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
            {rawEvents.map((evt, i) => {
              const debMatch = debouncedEvents.find((d) => d.label === evt.label);
              const thrMatch = throttledEvents.find((t) => t.label === evt.label);
              return (
                <div key={evt.id} className="flex items-center gap-3 px-2 py-1 rounded hover:bg-slate-700/30">
                  <span className="text-slate-600 w-8 text-right">#{i + 1}</span>
                  <span className="text-slate-400 w-14">+{evt.timestamp}ms</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${debMatch ? 'bg-orange-400' : 'bg-slate-700'}`} />
                    <span className={debMatch ? 'text-orange-400' : 'text-slate-600'}>
                      {debMatch ? `@ +${debMatch.timestamp}ms` : '\u2014'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${thrMatch ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    <span className={thrMatch ? 'text-emerald-400' : 'text-slate-600'}>
                      {thrMatch ? `@ +${thrMatch.timestamp}ms` : '\u2014'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
