'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play,
  RotateCcw,
  Copy,
  Plus,
  Trash2,
  Timer,
  Clock4,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hourglass,
  GanttChart,
  Code2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Combinator = 'all' | 'allSettled' | 'any' | 'race';

interface PromiseTask {
  id: number;
  label: string;
  delayMs: number;
  resolves: boolean;
  value: string;
}

interface TimelineEvent {
  id: number;
  label: string;
  startedAt: number;
  finishedAt: number;
  resolved: boolean;
  value: string;
}

interface RunResult {
  events: TimelineEvent[];
  totalTime: number;
  output: string;
  error?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const COMBINATORS: { key: Combinator; label: string; desc: string; icon: typeof Play }[] = [
  { key: 'all', label: 'Promise.all', desc: 'Resolves when ALL resolve. Rejects immediately if ANY reject.', icon: CheckCircle2 },
  { key: 'allSettled', label: 'Promise.allSettled', desc: 'Waits for ALL to settle (resolve or reject). Never short-circuits.', icon: Hourglass },
  { key: 'any', label: 'Promise.any', desc: 'Resolves with the FIRST to resolve. If ALL reject, rejects with AggregateError.', icon: Timer },
  { key: 'race', label: 'Promise.race', desc: 'Settles with the FIRST to settle (resolve or reject).', icon: Clock4 },
];

const PRESETS: { name: string; tasks: Omit<PromiseTask, 'id'>[] }[] = [
  {
    name: 'All Succeed (all)',
    tasks: [
      { label: 'fetchUsers', delayMs: 800, resolves: true, value: '[{id:1,name:"Alice"},{id:2,name:"Bob"}]' },
      { label: 'fetchPosts', delayMs: 1200, resolves: true, value: '[{id:1,title:"Hello"},{id:2,title:"World"}]' },
      { label: 'fetchConfig', delayMs: 400, resolves: true, value: '{theme:"dark",lang:"en"}' },
    ],
  },
  {
    name: 'One Fails (all vs allSettled)',
    tasks: [
      { label: 'validateEmail', delayMs: 600, resolves: true, value: 'ok' },
      { label: 'validatePhone', delayMs: 1000, resolves: false, value: 'Invalid phone format' },
      { label: 'validateAddress', delayMs: 300, resolves: true, value: 'ok' },
    ],
  },
  {
    name: 'Fastest Wins (race/any)',
    tasks: [
      { label: 'primaryCDN', delayMs: 2000, resolves: true, value: 'data from primary' },
      { label: 'fallbackCDN', delayMs: 800, resolves: true, value: 'data from fallback' },
      { label: 'localCache', delayMs: 150, resolves: true, value: 'data from cache' },
    ],
  },
  {
    name: 'All Reject (any)',
    tasks: [
      { label: 'dbPrimary', delayMs: 500, resolves: false, value: 'Connection refused' },
      { label: 'dbReplica1', delayMs: 700, resolves: false, value: 'Timeout' },
      { label: 'dbReplica2', delayMs: 400, resolves: false, value: 'Auth error' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateCode(combinator: Combinator, tasks: PromiseTask[]): string {
  const taskDefs = tasks
    .map(t => {
      const fn = t.resolves
        ? `new Promise(resolve => setTimeout(() => resolve(${t.value}), ${t.delayMs}))`
        : `new Promise((_, reject) => setTimeout(() => reject(${t.value}), ${t.delayMs}))`;
      return `  const ${t.label || `p${t.id}`} = ${fn};`;
    })
    .join('\n');

  const names = tasks.map(t => t.label || `p${t.id}`).join(', ');
  const method = `Promise.${combinator}`;

  return `// ${COMBINATORS.find(c => c.key === combinator)?.label}
${taskDefs}

const results = await ${method}([${names}]);`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function PromiseVisualizerPage() {
  const [tasks, setTasks] = useState<PromiseTask[]>([
    { id: 1, label: 'fetchUsers', delayMs: 800, resolves: true, value: '"users data"' },
    { id: 2, label: 'fetchPosts', delayMs: 1200, resolves: true, value: '"posts data"' },
    { id: 3, label: 'fetchConfig', delayMs: 400, resolves: true, value: '"config data"' },
  ]);
  const [nextId, setNextId] = useState(4);
  const [combinator, setCombinator] = useState<Combinator>('all');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const runRef = useRef<AbortController | null>(null);

  const maxDelay = useMemo(() => Math.max(...tasks.map(t => t.delayMs), 100), [tasks]);
  const totalBarWidth = useMemo(() => Math.max(maxDelay + 200, 400), [maxDelay]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const addTask = useCallback(() => {
    setTasks(prev => [
      ...prev,
      { id: nextId, label: `task${nextId}`, delayMs: 1000, resolves: true, value: '"ok"' },
    ]);
    setNextId(n => n + 1);
  }, [nextId]);

  const removeTask = useCallback((id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTask = useCallback((id: number, patch: Partial<PromiseTask>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const applyPreset = useCallback((presetIndex: number) => {
    const preset = PRESETS[presetIndex];
    const newTasks = preset.tasks.map((t, i) => ({ ...t, id: i + 1 }));
    setTasks(newTasks);
    setNextId(newTasks.length + 1);
    setResult(null);
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setResult(null);
    setElapsedMs(0);

    const controller = new AbortController();
    runRef.current = controller;

    const startTime = performance.now();
    const tickInterval = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startTime));
    }, 50);

    const events: TimelineEvent[] = [];
    const wrappedTasks = tasks.map(t => ({
      ...t,
      promise: new Promise<{ id: number; value: string }>((resolve, reject) => {
        const startedAt = performance.now() - startTime;
        setTimeout(() => {
          const finishedAt = performance.now() - startTime;
          events.push({
            id: t.id,
            label: t.label,
            startedAt,
            finishedAt,
            resolved: t.resolves,
            value: t.value,
          });
          if (t.resolves) resolve({ id: t.id, value: t.value });
          else reject({ id: t.id, value: t.value });
        }, t.delayMs);
      }),
    }));

    const promises = wrappedTasks.map(t => t.promise);

    let output = '';
    let error = '';

    try {
      if (combinator === 'all') {
        const vals = await Promise.all(promises);
        output = JSON.stringify(vals, null, 2);
      } else if (combinator === 'allSettled') {
        const vals = await Promise.allSettled(promises);
        output = JSON.stringify(
          vals.map(v =>
            v.status === 'fulfilled'
              ? { status: 'fulfilled', value: v.value }
              : { status: 'rejected', reason: (v.reason as { value: string }).value }
          ),
          null,
          2
        );
      } else if (combinator === 'any') {
        const val = await Promise.any(promises);
        output = JSON.stringify(val, null, 2);
      } else if (combinator === 'race') {
        const val = await Promise.race(promises);
        output = JSON.stringify(val, null, 2);
      }
    } catch (err: any) {
      error = err?.value || err?.message || String(err);
    }

    clearInterval(tickInterval);
    const totalTime = Math.round(performance.now() - startTime);

    setResult({
      events: events.sort((a, b) => a.finishedAt - b.finishedAt),
      totalTime,
      output,
      error: error || undefined,
    });
    setElapsedMs(totalTime);
    setRunning(false);
  }, [tasks, combinator]);

  const reset = useCallback(() => {
    if (runRef.current) runRef.current.abort();
    setResult(null);
    setElapsedMs(0);
    setRunning(false);
  }, []);

  const copyCode = useCallback(() => {
    const code = generateCode(combinator, tasks);
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code copied!'),
      () => toast.error('Failed to copy')
    );
  }, [combinator, tasks]);

  // ── Bar width calculation ─────────────────────────────────────────────────

  const getBarStyle = useCallback(
    (event: TimelineEvent): React.CSSProperties => {
      const leftPct = (event.startedAt / totalBarWidth) * 100;
      const widthPct = ((event.finishedAt - event.startedAt) / totalBarWidth) * 100;
      return {
        left: `${Math.max(leftPct, 0)}%`,
        width: `${Math.max(widthPct, 2)}%`,
        background: event.resolved
          ? 'linear-gradient(90deg, #059669, #34d399)'
          : 'linear-gradient(90deg, #dc2626, #f87171)',
      };
    },
    [totalBarWidth]
  );

  const getEventColor = useCallback((resolved: boolean) => {
    return resolved ? 'text-emerald-400' : 'text-red-400';
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="JS Promise Visualizer"
      description="Visualize Promise.all, allSettled, any, and race with live timelines. Add tasks with configurable delays and values to see how each combinator behaves."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          {COMBINATORS.map(c => (
            <button
              key={c.key}
              onClick={() => { setCombinator(c.key); setResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                combinator === c.key
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <c.icon className="w-3.5 h-3.5" />
              {c.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Combinator Description */}
        <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {(() => {
                const c = COMBINATORS.find(c => c.key === combinator)!;
                const Icon = c.icon;
                return <Icon className="w-5 h-5 text-brand-400" />;
              })()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                {COMBINATORS.find(c => c.key === combinator)?.label}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {COMBINATORS.find(c => c.key === combinator)?.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Presets</h4>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => applyPreset(i)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-brand-500/30 hover:text-brand-300 transition-all"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Task Editor */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Promise Tasks ({tasks.length})
          </h4>
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 group"
              >
                {/* Label */}
                <input
                  type="text"
                  value={task.label}
                  onChange={e => updateTask(task.id, { label: e.target.value })}
                  className="w-32 bg-transparent text-sm text-slate-200 font-mono border-b border-transparent hover:border-slate-600 focus:border-brand-500 outline-none px-1"
                  placeholder="label"
                />

                {/* Delay */}
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="number"
                    value={task.delayMs}
                    onChange={e => {
                      const v = Math.max(10, Math.min(10000, parseInt(e.target.value) || 100));
                      updateTask(task.id, { delayMs: v });
                    }}
                    className="w-16 bg-slate-800 text-sm text-slate-200 font-mono rounded px-2 py-1 border border-slate-700/50 focus:border-brand-500 outline-none text-center"
                    min={10}
                    max={10000}
                  />
                  <span className="text-xs text-slate-500">ms</span>
                </div>

                {/* Value */}
                <input
                  type="text"
                  value={task.value}
                  onChange={e => updateTask(task.id, { value: e.target.value })}
                  className="flex-1 bg-transparent text-sm text-slate-300 font-mono border-b border-transparent hover:border-slate-600 focus:border-brand-500 outline-none px-1"
                  placeholder="value"
                />

                {/* Resolve/Reject toggle */}
                <button
                  onClick={() => updateTask(task.id, { resolves: !task.resolves })}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    task.resolves
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}
                >
                  {task.resolves ? 'resolve' : 'reject'}
                </button>

                {/* Remove */}
                {tasks.length > 1 && (
                  <button
                    onClick={() => removeTask(task.id)}
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addTask}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add promise task
          </button>
        </div>

        {/* Run Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-sm transition-all active:scale-95"
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running... {elapsedMs}ms
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              showCode ? 'text-brand-400 bg-brand-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Code
          </button>
        </div>

        {/* Code Output */}
        {showCode && (
          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-700/50 text-xs text-slate-300 font-mono overflow-x-auto">
              <code>{generateCode(combinator, tasks)}</code>
            </pre>
            <button
              onClick={copyCode}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Timeline Visualization */}
        {(result || running) && (
          <div className="space-y-3 p-5 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                <GanttChart className="w-4 h-4" />
                Timeline
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                {running ? `${elapsedMs}ms elapsed` : `Total: ${result?.totalTime}ms`}
              </span>
            </div>

            {/* Timeline bars */}
            <div className="space-y-2">
              {/* Scale bar */}
              <div className="relative h-5 mb-1">
                {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                  <div
                    key={pct}
                    className="absolute -top-0 text-[10px] text-slate-600 font-mono"
                    style={{ left: `${pct * 100}%`, transform: 'translateX(-50%)' }}
                  >
                    {Math.round(totalBarWidth * pct)}ms
                  </div>
                ))}
                <div className="absolute top-5 left-0 right-0 h-[1px] bg-slate-800" />
              </div>

              {/* Task bars */}
              {(result?.events ?? tasks.map(t => ({ id: t.id, label: t.label, startedAt: 0, finishedAt: t.delayMs, resolved: t.resolves, value: t.value }))).map(event => (
                <div key={event.id} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-slate-400 font-mono truncate flex-shrink-0" title={event.label}>
                    {event.label}
                  </span>
                  <div className="flex-1 relative h-6 bg-slate-800/50 rounded-full overflow-hidden">
                    {/* Expected bar (preview) */}
                    {!result && (
                      <div
                        className="absolute top-0 h-full rounded-full opacity-30"
                        style={getBarStyle({ ...event, startedAt: 0, finishedAt: event.finishedAt, resolved: event.resolved })}
                      />
                    )}
                    {/* Actual bar */}
                    {result && (
                      <div
                        className="absolute top-0 h-full rounded-full transition-all duration-300"
                        style={getBarStyle(event)}
                      />
                    )}
                    {/* Dot at end */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-slate-900 shadow transition-all duration-300"
                      style={{
                        left: `${((result ? event.finishedAt : event.finishedAt) / totalBarWidth) * 100}%`,
                        background: event.resolved ? '#34d399' : '#f87171',
                      }}
                    />
                  </div>
                  <span className={`w-12 text-xs font-mono flex-shrink-0 text-right ${
                    running ? 'text-slate-600' : getEventColor(event.resolved)
                  }`}>
                    {result ? `${Math.round(event.finishedAt)}ms` : `${event.finishedAt}ms`}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-500">resolve</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-[10px] text-slate-500">reject</span>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Result</h4>

            {/* Success */}
            {!result.error && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">
                    {combinator === 'all' && 'All promises resolved'}
                    {combinator === 'allSettled' && 'All promises settled'}
                    {combinator === 'any' && 'First resolved (any)'}
                    {combinator === 'race' && 'First settled (race)'}
                  </span>
                  <span className="text-xs text-slate-500 ml-auto font-mono">{result.totalTime}ms</span>
                </div>
                <pre className="text-xs text-slate-300 font-mono overflow-x-auto bg-slate-950/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {result.output}
                </pre>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400 font-medium">Error</span>
                  <span className="text-xs text-slate-500 ml-auto font-mono">{result.totalTime}ms</span>
                </div>
                <pre className="text-xs text-red-300 font-mono mt-2 overflow-x-auto bg-slate-950/50 rounded-lg p-3">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Event log */}
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-400">Event log ({result.events.length})</summary>
              <div className="mt-2 space-y-1">
                {result.events.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-400">
                    <span className="font-mono text-slate-600">[{Math.round(e.finishedAt)}ms]</span>
                    <span className={`${e.resolved ? 'text-emerald-400' : 'text-red-400'}`}>
                      {e.resolved ? '\u2713' : '\u2717'}
                    </span>
                    <span className="font-mono">{e.label}</span>
                    <span className="text-slate-600">{'\u2192'} {e.value}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
