'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Layers,
  ListOrdered,
  Timer,
  Globe,
  MessageSquare,
  ChevronRight,
  Zap,
} from 'lucide-react';

type TaskType = 'sync' | 'microtask' | 'macrotask' | 'webapi';

interface QueuedTask {
  id: string;
  label: string;
  type: TaskType;
  delayMs?: number;
  delayRemaining?: number;
}

interface StepState {
  description: string;
  callStack: string[];
  microtaskQueue: QueuedTask[];
  macrotaskQueue: QueuedTask[];
  webApis: QueuedTask[];
  consoleOutput: string[];
  highlightIds: string[];
}

interface Scenario {
  name: string;
  description: string;
  steps: StepState[];
}

function buildScenario1(): Scenario {
  const t1: QueuedTask = { id: 'timeout1', label: 'setTimeout callback', type: 'macrotask', delayMs: 0 };
  const steps: StepState[] = [
    { description: 'Script starts executing. The call stack is empty.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: [], highlightIds: [] },
    { description: 'console.log("Start") is pushed onto the call stack.', callStack: ['console.log("Start")'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: [], highlightIds: ['console-log-start'] },
    { description: '"Start" is logged to the console, then popped off the stack.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start'], highlightIds: [] },
    { description: 'setTimeout(cb, 0) is called — the callback is handed to the Web APIs.', callStack: ['setTimeout(cb, 0)'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start'], highlightIds: ['settimeout-call'] },
    { description: 'setTimeout returns immediately. The timer starts in Web APIs (0ms → fires instantly).', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start'], highlightIds: ['timeout1'] },
    { description: 'console.log("End") is pushed onto the call stack.', callStack: ['console.log("End")'], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start'], highlightIds: ['console-log-end'] },
    { description: '"End" is logged, then popped. Synchronous code is done.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start', 'End'], highlightIds: [] },
    { description: 'The 0ms timer fires — the callback moves to the macrotask queue.', callStack: [], microtaskQueue: [], macrotaskQueue: [{ ...t1 }], webApis: [], consoleOutput: ['Start', 'End'], highlightIds: ['timeout1'] },
    { description: 'Event loop: call stack is empty, so the macrotask callback is pushed onto the stack.', callStack: ['setTimeout callback'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'End'], highlightIds: ['timeout-cb'] },
    { description: 'The callback runs. "Timeout" is logged, then popped.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'End', 'Timeout'], highlightIds: [] },
    { description: '✅ Done! Call stack, microtask queue, and macrotask queue are all empty.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'End', 'Timeout'], highlightIds: [] },
  ];
  return { name: 'setTimeout Basics', description: 'Understand how setTimeout interacts with synchronous code.', steps };
}

function buildScenario2(): Scenario {
  const t1: QueuedTask = { id: 'timeout1', label: 'setTimeout cb', type: 'macrotask', delayMs: 0 };
  const p1: QueuedTask = { id: 'promise1', label: 'Promise.then cb', type: 'microtask' };
  const steps: StepState[] = [
    { description: 'Script starts.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: [], highlightIds: [] },
    { description: 'console.log("Start") executes.', callStack: ['console.log("Start")'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: [], highlightIds: [] },
    { description: '"Start" logged.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start'], highlightIds: [] },
    { description: 'setTimeout(cb, 0) registers a timer in Web APIs.', callStack: ['setTimeout(cb, 0)'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start'], highlightIds: [] },
    { description: 'Timer registered in Web APIs.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start'], highlightIds: ['timeout1'] },
    { description: 'Promise.resolve().then(cb) — the .then callback is queued as a microtask.', callStack: ['Promise.resolve().then(cb)'], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start'], highlightIds: [] },
    { description: 'Microtask queued. setTimeout callback still in Web APIs.', callStack: [], microtaskQueue: [{ ...p1 }], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start'], highlightIds: ['promise1'] },
    { description: 'console.log("End") executes.', callStack: ['console.log("End")'], microtaskQueue: [{ ...p1 }], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start'], highlightIds: [] },
    { description: '"End" logged. Sync code done. Now: microtask queue first!', callStack: [], microtaskQueue: [{ ...p1 }], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start', 'End'], highlightIds: ['promise1'] },
    { description: 'Event loop checks microtask queue first — runs Promise.then callback.', callStack: ['Promise.then callback'], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start', 'End'], highlightIds: ['promise-cb'] },
    { description: '"Promise" logged. Microtask queue empty.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t1, delayRemaining: 0 }], consoleOutput: ['Start', 'End', 'Promise'], highlightIds: [] },
    { description: '0ms timer fires. Callback moves to macrotask queue.', callStack: [], microtaskQueue: [], macrotaskQueue: [{ ...t1 }], webApis: [], consoleOutput: ['Start', 'End', 'Promise'], highlightIds: ['timeout1'] },
    { description: 'Macrotask callback runs.', callStack: ['setTimeout cb'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'End', 'Promise'], highlightIds: [] },
    { description: '"Timeout" logged.\n\n🔑 Key takeaway: Microtasks ALWAYS run before the next macrotask!', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'End', 'Promise', 'Timeout'], highlightIds: [] },
  ];
  return { name: 'Promise vs setTimeout', description: 'The classic interview question — why Promise callbacks run before setTimeout.', steps };
}

function buildScenario3(): Scenario {
  const p1: QueuedTask = { id: 'p1', label: 'outer .then', type: 'microtask' };
  const p2: QueuedTask = { id: 'p2', label: 'inner .then', type: 'microtask' };
  const steps: StepState[] = [
    { description: 'Script begins.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: [], highlightIds: [] },
    { description: 'Promise.resolve().then(() => { queueMicrotask(...) }) registers outer .then as a microtask.', callStack: [], microtaskQueue: [{ ...p1 }], macrotaskQueue: [], webApis: [], consoleOutput: ['Start'], highlightIds: ['p1'] },
    { description: 'Sync code done. Event loop processes microtask queue — runs outer .then.', callStack: ['outer .then'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start'], highlightIds: ['outer-then'] },
    { description: 'During outer .then execution, queueMicrotask adds inner .then to the microtask queue.', callStack: ['outer .then'], microtaskQueue: [{ ...p2 }], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'Outer'], highlightIds: ['p2'] },
    { description: 'Outer .then finishes. But microtask queue is NOT empty — inner .then is waiting!', callStack: [], microtaskQueue: [{ ...p2 }], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'Outer'], highlightIds: ['p2'] },
    { description: 'Event loop processes inner .then BEFORE checking macrotask queue.\n\n⚠️ Danger: nesting microtasks can starve the macrotask queue!', callStack: ['inner .then'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'Outer'], highlightIds: ['inner-then'] },
    { description: '✅ "Inner" logged. All queues empty.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Start', 'Outer', 'Inner'], highlightIds: [] },
  ];
  return { name: 'Nested Microtasks', description: 'See how microtasks can chain and potentially starve the macrotask queue.', steps };
}

function buildScenario4(): Scenario {
  const p1: QueuedTask = { id: 'p1', label: 'await continuation', type: 'microtask' };
  const steps: StepState[] = [
    { description: 'An async function is called. It runs synchronously until the first await.', callStack: ['asyncFn()'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: [], highlightIds: ['asyncfn'] },
    { description: '"Before await" is logged.', callStack: ['asyncFn()'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Before await'], highlightIds: [] },
    { description: 'await pauses execution. The rest of the function is queued as a microtask.', callStack: [], microtaskQueue: [{ ...p1 }], macrotaskQueue: [], webApis: [], consoleOutput: ['Before await'], highlightIds: ['p1'] },
    { description: 'console.log("After async call") runs synchronously.', callStack: ['console.log("After async call")'], microtaskQueue: [{ ...p1 }], macrotaskQueue: [], webApis: [], consoleOutput: ['Before await'], highlightIds: [] },
    { description: '"After async call" logged. Sync code done.', callStack: [], microtaskQueue: [{ ...p1 }], macrotaskQueue: [], webApis: [], consoleOutput: ['Before await', 'After async call'], highlightIds: ['p1'] },
    { description: 'The await continuation runs as a microtask.', callStack: ['await continuation'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Before await', 'After async call'], highlightIds: ['await-cont'] },
    { description: '✅ "After await" logged. async/await is syntactic sugar over Promises + microtasks.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Before await', 'After async call', 'After await'], highlightIds: [] },
  ];
  return { name: 'async/await', description: 'Understand how async/await works under the hood.', steps };
}

function buildScenario5(): Scenario {
  const t100: QueuedTask = { id: 't100', label: 'setTimeout(100ms)', type: 'macrotask', delayMs: 100 };
  const t0: QueuedTask = { id: 't0', label: 'setTimeout(0ms)', type: 'macrotask', delayMs: 0 };
  const pm: QueuedTask = { id: 'pm', label: 'Promise.then', type: 'microtask' };
  const steps: StepState[] = [
    { description: 'A complex script starts: sync code, two setTimeouts (0ms and 100ms), and a Promise.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: [], highlightIds: [] },
    { description: 'setTimeout(cb, 0) and setTimeout(cb, 100) are both registered in Web APIs.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t0, delayRemaining: 0 }, { ...t100, delayRemaining: 100 }], consoleOutput: ['Script start'], highlightIds: ['t0', 't100'] },
    { description: 'Promise.resolve().then(cb) — callback queued as a microtask.', callStack: [], microtaskQueue: [{ ...pm }], macrotaskQueue: [], webApis: [{ ...t0, delayRemaining: 0 }, { ...t100, delayRemaining: 100 }], consoleOutput: ['Script start'], highlightIds: ['pm'] },
    { description: 'Sync code finishes. Microtask queue has one item. 0ms timer is also ready.\n\nPriority: Microtasks FIRST!', callStack: [], microtaskQueue: [{ ...pm }], macrotaskQueue: [], webApis: [{ ...t0, delayRemaining: 0 }, { ...t100, delayRemaining: 100 }], consoleOutput: ['Script start', 'Script end'], highlightIds: ['pm'] },
    { description: 'Promise.then callback runs.', callStack: ['Promise.then'], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t0, delayRemaining: 0 }, { ...t100, delayRemaining: 100 }], consoleOutput: ['Script start', 'Script end'], highlightIds: ['promise-then'] },
    { description: 'Microtask queue empty. 0ms timer fires → macrotask queue.', callStack: [], microtaskQueue: [], macrotaskQueue: [{ ...t0 }], webApis: [{ ...t100, delayRemaining: 100 }], consoleOutput: ['Script start', 'Script end', 'Promise'], highlightIds: ['t0'] },
    { description: 'setTimeout(0ms) callback runs.', callStack: ['setTimeout(0ms)'], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t100, delayRemaining: 100 }], consoleOutput: ['Script start', 'Script end', 'Promise'], highlightIds: ['timeout0'] },
    { description: '0ms callback done. 100ms timer still counting down.', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [{ ...t100, delayRemaining: 100 }], consoleOutput: ['Script start', 'Script end', 'Promise', 'Timeout 0ms'], highlightIds: ['t100'] },
    { description: 'After 100ms, the timer fires → macrotask queue.', callStack: [], microtaskQueue: [], macrotaskQueue: [{ ...t100 }], webApis: [], consoleOutput: ['Script start', 'Script end', 'Promise', 'Timeout 0ms'], highlightIds: ['t100'] },
    { description: 'setTimeout(100ms) callback runs.', callStack: ['setTimeout(100ms)'], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Script start', 'Script end', 'Promise', 'Timeout 0ms'], highlightIds: [] },
    { description: '✅ All done!\n\n📋 Execution order: sync → microtasks → macrotasks (in timer order).', callStack: [], microtaskQueue: [], macrotaskQueue: [], webApis: [], consoleOutput: ['Script start', 'Script end', 'Promise', 'Timeout 0ms', 'Timeout 100ms'], highlightIds: [] },
  ];
  return { name: 'Full Event Loop', description: 'A complete walkthrough mixing sync code, multiple timers, and Promises.', steps };
}

const SCENARIOS: Scenario[] = [
  buildScenario1(),
  buildScenario2(),
  buildScenario3(),
  buildScenario4(),
  buildScenario5(),
];

/* ────────────── Visual Components ────────────── */

function queueItemClass(highlighted: boolean, type: TaskType) {
  const base = 'px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-all duration-300 flex items-center gap-2';
  const colors: Record<TaskType, string> = {
    sync: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
    microtask: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    macrotask: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    webapi: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  };
  return `${base} ${colors[type]} ${highlighted ? 'ring-2 ring-brand-400 scale-105 shadow-lg shadow-brand-500/20' : ''}`;
}

function CallStackVisual({ stack, highlightIds }: { stack: string[]; highlightIds: string[] }) {
  return (
    <div className="card">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-sky-400" />
        Call Stack
        <span className="text-slate-500 text-xs font-normal">({stack.length})</span>
      </h3>
      <div className="space-y-1.5 min-h-[60px]">
        {stack.length === 0 ? (
          <p className="text-slate-600 text-xs italic py-2">(empty)</p>
        ) : (
          [...stack].reverse().map((item, i) => (
            <div
              key={`${item}-${i}`}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-all duration-300 bg-sky-500/10 border-sky-500/30 text-sky-300 flex items-center gap-2 ${
                highlightIds.some((id) => item.toLowerCase().includes(id.toLowerCase())) ? 'ring-2 ring-brand-400 scale-105 shadow-lg shadow-brand-500/20' : ''
              }`}
            >
              <ChevronRight className="w-3 h-3 text-sky-400 shrink-0" />
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QueueVisual({
  title, icon: Icon, colorClass, queue, highlightIds, emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  queue: QueuedTask[];
  highlightIds: string[];
  emptyLabel: string;
}) {
  return (
    <div className="card">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        {title}
        <span className="text-slate-500 text-xs font-normal">({queue.length})</span>
      </h3>
      <div className="space-y-1.5 min-h-[60px]">
        {queue.length === 0 ? (
          <p className="text-slate-600 text-xs italic py-2">{emptyLabel}</p>
        ) : (
          queue.map((task) => (
            <div key={task.id} className={queueItemClass(highlightIds.includes(task.id), task.type)}>
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span>{task.label}</span>
              {task.delayRemaining !== undefined && task.delayRemaining > 0 && (
                <span className="ml-auto text-[10px] opacity-70">{task.delayRemaining}ms</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ConsoleVisual({ output }: { output: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [output]);
  return (
    <div className="card">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        Console Output
      </h3>
      <div ref={ref} className="bg-[#0d1117] rounded-lg p-3 border border-slate-700/50 font-mono text-xs min-h-[80px] max-h-[160px] overflow-y-auto">
        {output.length === 0 ? (
          <p className="text-slate-600 italic">(no output yet)</p>
        ) : (
          output.map((line, i) => (
            <div key={i} className="text-slate-300 py-0.5">
              <span className="text-slate-500 mr-2">{'>'}</span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ────────────── Main Component ────────────── */

export default function EventLoopVisualizerPage() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = SCENARIOS[scenarioIdx];
  const step = scenario.steps[stepIdx];
  const isLastStep = stepIdx >= scenario.steps.length - 1;
  const isFirstStep = stepIdx === 0;

  useEffect(() => {
    if (autoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setStepIdx((prev) => {
          const next = prev + 1;
          if (next >= SCENARIOS[scenarioIdx].steps.length) {
            setAutoPlaying(false);
            return prev;
          }
          return next;
        });
      }, 1200);
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlaying, scenarioIdx]);

  const selectScenario = useCallback((idx: number) => {
    setAutoPlaying(false);
    setScenarioIdx(idx);
    setStepIdx(0);
  }, []);

  const stepForward = useCallback(() => {
    if (!isLastStep) setStepIdx((p) => p + 1);
  }, [isLastStep]);

  const stepBack = useCallback(() => {
    if (!isFirstStep) setStepIdx((p) => p - 1);
  }, [isFirstStep]);

  const reset = useCallback(() => {
    setAutoPlaying(false);
    setStepIdx(0);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    if (isLastStep) {
      reset();
      setTimeout(() => setAutoPlaying(true), 50);
      return;
    }
    setAutoPlaying((p) => !p);
  }, [isLastStep, reset]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') stepForward();
      if (e.key === 'ArrowLeft') stepBack();
      if (e.key === ' ') { e.preventDefault(); toggleAutoPlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stepForward, stepBack, toggleAutoPlay]);

  return (
    <ToolLayout
      title="JavaScript Event Loop Visualizer"
      description="Step through the JavaScript event loop — see the call stack, microtask queue, macrotask queue, and Web APIs in action. Understand async execution order interactively."
    >
      {/* Scenario tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => selectScenario(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              i === scenarioIdx
                ? 'bg-brand-500/10 border-brand-500/50 text-brand-400'
                : 'bg-surface border-slate-700/50 text-slate-400 hover:border-slate-500/50 hover:text-slate-300'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Step description */}
      <div className="card mb-6">
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{step.description}</p>
      </div>

      {/* Visualization grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <CallStackVisual stack={step.callStack} highlightIds={step.highlightIds} />
        <QueueVisual
          title="Microtask Queue" icon={ListOrdered} colorClass="text-emerald-400"
          queue={step.microtaskQueue} highlightIds={step.highlightIds}
          emptyLabel="(empty — no Promise callbacks, queueMicrotask, or MutationObserver waiting)"
        />
        <QueueVisual
          title="Macrotask Queue" icon={Timer} colorClass="text-amber-400"
          queue={step.macrotaskQueue} highlightIds={step.highlightIds}
          emptyLabel="(empty — no setTimeout, setInterval, or I/O callbacks waiting)"
        />
        <QueueVisual
          title="Web APIs / Timer Pool" icon={Globe} colorClass="text-purple-400"
          queue={step.webApis} highlightIds={step.highlightIds}
          emptyLabel="(empty — no timers or async operations pending)"
        />
      </div>

      <ConsoleVisual output={step.consoleOutput} />

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={reset} className="px-3 py-2 rounded-lg text-xs font-medium bg-surface border border-slate-700/50 text-slate-300 hover:bg-surface-light hover:border-slate-500/50 transition-all flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        <button onClick={stepBack} disabled={isFirstStep} className="px-3 py-2 rounded-lg text-xs font-medium bg-surface border border-slate-700/50 text-slate-300 hover:bg-surface-light hover:border-slate-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2">
          <SkipForward className="w-3.5 h-3.5 rotate-180" /> Previous
        </button>
        <button onClick={stepForward} disabled={isLastStep} className="px-3 py-2 rounded-lg text-xs font-medium bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2">
          <SkipForward className="w-3.5 h-3.5" /> Next Step
        </button>
        <button onClick={toggleAutoPlay} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
          autoPlaying ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' : 'bg-surface border-slate-700/50 text-slate-300 hover:bg-surface-light hover:border-slate-500/50'
        }`}>
          {autoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {autoPlaying ? 'Pause' : 'Auto-Play'}
        </button>
        <span className="text-xs text-slate-500 ml-auto">Step {stepIdx + 1} / {scenario.steps.length}</span>
      </div>

      <p className="text-xs text-slate-600 mt-3 text-center">
        💡 <kbd className="px-1.5 py-0.5 rounded bg-surface border border-slate-700/50 text-slate-400">←</kbd>{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-surface border border-slate-700/50 text-slate-400">→</kbd> arrow keys to step ·{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-surface border border-slate-700/50 text-slate-400">Space</kbd> to auto-play
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-500/30 border border-sky-500/50" /> Call Stack</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" /> Microtask</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" /> Macrotask</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50" /> Web API</span>
      </div>

      {/* Educational footer */}
      <div className="mt-8 p-5 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-400" />
          How the Event Loop Works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-400">
          <div>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Execute synchronous code on the call stack until it&apos;s empty.</li>
              <li><strong className="text-emerald-300">Microtask checkpoint:</strong> Process ALL microtasks (Promise.then, queueMicrotask, MutationObserver). If a microtask spawns more microtasks, process those too — until the microtask queue is completely empty.</li>
              <li><strong className="text-amber-300">Macrotask:</strong> Dequeue ONE macrotask (setTimeout, setInterval, I/O, UI events) and run it.</li>
              <li>Repeat from step 2.</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-slate-300">Key Rules</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Microtasks always run before the next macrotask.</li>
              <li>• Microtasks execute to completion — the queue must be empty before rendering or macrotasks.</li>
              <li>• setTimeout(fn, 0) doesn&apos;t run immediately — it waits for the current execution to finish plus all pending microtasks.</li>
              <li>• requestAnimationFrame runs before the next paint, between microtask checkpoints.</li>
              <li>• Long-running microtasks can block the UI (no rendering between microtasks).</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
