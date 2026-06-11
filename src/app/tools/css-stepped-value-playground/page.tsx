'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Calculator, ArrowUp, ArrowDown, Minus, Divide, GripHorizontal, Code2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type RoundStrategy = 'nearest' | 'up' | 'down' | 'to-zero';
type Tab = 'round' | 'mod' | 'rem';

interface RoundState {
  strategy: RoundStrategy;
  a: number;
  b: number;
}

interface ModState {
  a: number;
  b: number;
}

interface RemState {
  a: number;
  b: number;
}

interface Preset {
  name: string;
  description: string;
  tab: Tab;
  roundState?: RoundState;
  modState?: ModState;
  remState?: RemState;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STRATEGIES: { value: RoundStrategy; label: string; description: string; icon: typeof ArrowUp }[] = [
  { value: 'nearest', label: 'nearest', description: 'Round to the nearest multiple of B (ties go up)', icon: GripHorizontal },
  { value: 'up', label: 'up', description: 'Always round up to the next multiple (ceiling)', icon: ArrowUp },
  { value: 'down', label: 'down', description: 'Always round down to the previous multiple (floor)', icon: ArrowDown },
  { value: 'to-zero', label: 'to-zero', description: 'Round toward zero (truncate toward zero)', icon: Minus },
];

const PRESETS: Preset[] = [
  {
    name: 'Snap to 8px Grid',
    description: 'Round any pixel value to the nearest 8px grid unit',
    tab: 'round',
    roundState: { strategy: 'nearest', a: 37, b: 8 },
  },
  {
    name: 'Ceiling to 10',
    description: 'Always round up to the next multiple of 10',
    tab: 'round',
    roundState: { strategy: 'up', a: 23, b: 10 },
  },
  {
    name: 'Floor to 5',
    description: 'Always round down to the previous multiple of 5',
    tab: 'round',
    roundState: { strategy: 'down', a: 18, b: 5 },
  },
  {
    name: 'Truncate to 3',
    description: 'Round toward zero in steps of 3',
    tab: 'round',
    roundState: { strategy: 'to-zero', a: -7, b: 3 },
  },
  {
    name: 'Zebra Stripes',
    description: 'mod(n, 2) — alternate rows with remainder 0 or 1',
    tab: 'mod',
    modState: { a: 7, b: 2 },
  },
  {
    name: 'Cyclic Animation',
    description: 'mod(time, 360) — keep an angle in [0, 360)',
    tab: 'mod',
    modState: { a: 400, b: 360 },
  },
  {
    name: 'Negative Mod',
    description: 'mod(-10, 3) = 2 — remainder takes sign of divisor',
    tab: 'mod',
    modState: { a: -10, b: 3 },
  },
  {
    name: 'rem() Sign Demo',
    description: 'rem(-10, 3) = -1 — remainder takes sign of dividend',
    tab: 'rem',
    remState: { a: -10, b: 3 },
  },
  {
    name: 'rem() vs mod()',
    description: 'Compare rem(10, -3) = 1 vs mod(10, -3) = -2',
    tab: 'rem',
    remState: { a: 10, b: -3 },
  },
  {
    name: 'Color Wheel Wrap',
    description: 'rem(hue, 360) — wrap hue values to [0, 360)',
    tab: 'rem',
    remState: { a: 420, b: 360 },
  },
];

// ── Math helpers ────────────────────────────────────────────────────────────

function cssRound(strategy: RoundStrategy, a: number, b: number): number {
  if (b === 0) return NaN;
  const quotient = a / b;
  switch (strategy) {
    case 'nearest': {
      // CSS spec: ties round away from zero (up for positive, down for negative)
      const floor = Math.floor(quotient);
      const ceil = Math.ceil(quotient);
      const floorDist = Math.abs(quotient - floor);
      const ceilDist = Math.abs(quotient - ceil);
      if (floorDist < ceilDist) return floor * b;
      if (ceilDist < floorDist) return ceil * b;
      // Tie: round away from zero
      return quotient >= 0 ? ceil * b : floor * b;
    }
    case 'up':
      return Math.ceil(quotient) * b;
    case 'down':
      return Math.floor(quotient) * b;
    case 'to-zero':
      return (quotient >= 0 ? Math.floor(quotient) : Math.ceil(quotient)) * b;
  }
}

function cssMod(a: number, b: number): number {
  if (b === 0) return NaN;
  // CSS mod: remainder has sign of divisor (B)
  const r = a % b;
  // In JS, % gives remainder with sign of dividend
  // CSS mod: if r and b have different signs, add b
  if ((r > 0 && b < 0) || (r < 0 && b > 0)) {
    return r + b;
  }
  return r;
}

function cssRem(a: number, b: number): number {
  if (b === 0) return NaN;
  // CSS rem: remainder has sign of dividend (A) — same as JS %
  return a % b;
}

// ── Number line visualization ──────────────────────────────────────────────

function NumberLineViz({ a, b, result, strategy, mode }: {
  a: number;
  b: number;
  result: number;
  strategy?: RoundStrategy;
  mode: 'round' | 'mod' | 'rem';
}) {
  if (b === 0 || isNaN(result)) return null;

  // Determine range to show
  const absB = Math.abs(b);
  const center = mode === 'round' ? result : a;
  const range = Math.max(absB * 4, Math.abs(a - result) * 1.5, 20);
  const min = center - range;
  const max = center + range;

  // Generate tick marks at multiples of b
  const ticks: number[] = [];
  const startTick = Math.floor(min / absB) * absB;
  for (let t = startTick; t <= max; t += absB) {
    ticks.push(t);
  }

  const totalRange = max - min;

  return (
    <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <div className="text-xs text-slate-500 mb-3 font-mono">Number Line Visualization</div>
      <div className="relative h-16">
        {/* Tick marks */}
        {ticks.map((tick) => {
          const pos = ((tick - min) / totalRange) * 100;
          return (
            <div
              key={tick}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="h-3 w-px bg-slate-600" />
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">{tick}</span>
            </div>
          );
        })}

        {/* A marker */}
        {(() => {
          const aPos = ((a - min) / totalRange) * 100;
          return (
            <div
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${aPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-blue-400/30" />
              <span className="text-[10px] text-blue-400 font-mono mt-0.5">A={a}</span>
            </div>
          );
        })()}

        {/* Result marker */}
        {(() => {
          const rPos = ((result - min) / totalRange) * 100;
          return (
            <div
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${rPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" style={{ marginTop: mode === 'round' ? 0 : 20 }} />
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5">
                {mode === 'round' ? `round(${strategy}, ${a}, ${b}) = ${result}` : `${mode}(${a}, ${b}) = ${result}`}
              </span>
            </div>
          );
        })()}

        {/* Base line */}
        <div className="absolute bottom-6 left-0 right-0 h-px bg-slate-600" />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CSSSteppedValuePlaygroundPage() {
  const [tab, setTab] = useState<Tab>('round');

  // Round state
  const [roundStrategy, setRoundStrategy] = useState<RoundStrategy>('nearest');
  const [roundA, setRoundA] = useState(37);
  const [roundB, setRoundB] = useState(8);

  // Mod state
  const [modA, setModA] = useState(7);
  const [modB, setModB] = useState(2);

  // Rem state
  const [remA, setRemA] = useState(10);
  const [remB, setRemB] = useState(-3);

  // ── Results ───────────────────────────────────────────────────────────────

  const roundResult = useMemo(() => cssRound(roundStrategy, roundA, roundB), [roundStrategy, roundA, roundB]);
  const modResult = useMemo(() => cssMod(modA, modB), [modA, modB]);
  const remResult = useMemo(() => cssRem(remA, remB), [remA, remB]);

  // ── CSS output ────────────────────────────────────────────────────────────

  const cssOutput = useMemo(() => {
    switch (tab) {
      case 'round':
        return `round(${roundStrategy}, ${roundA}, ${roundB})`;
      case 'mod':
        return `mod(${modA}, ${modB})`;
      case 'rem':
        return `rem(${remA}, ${remB})`;
    }
  }, [tab, roundStrategy, roundA, roundB, modA, modB, remA, remB]);

  const fullCSSExample = useMemo(() => {
    switch (tab) {
      case 'round':
        return `/* Snap element width to nearest 8px grid unit */\n.element {\n  width: round(nearest, var(--desired-width), 8px);\n}`;
      case 'mod':
        return `/* Zebra-stripe table rows using mod() */\ntr:nth-child(1n of :not([hidden])) {\n  background: hsl(mod(var(--index), 2) * 180, 50%, 90%);\n}`;
      case 'rem':
        return `/* Wrap hue angle to [0, 360) */\n.element {\n  --hue: rem(var(--raw-angle), 360deg);\n  background: hsl(var(--hue), 70%, 50%);\n}`;
    }
  }, [tab]);

  // ── Copy handlers ─────────────────────────────────────────────────────────

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Copy failed'),
    );
  }, [cssOutput]);

  const copyExample = useCallback(() => {
    navigator.clipboard.writeText(fullCSSExample).then(
      () => toast.success('Example copied!'),
      () => toast.error('Copy failed'),
    );
  }, [fullCSSExample]);

  const applyPreset = useCallback((preset: Preset) => {
    setTab(preset.tab);
    if (preset.roundState) {
      setRoundStrategy(preset.roundState.strategy);
      setRoundA(preset.roundState.a);
      setRoundB(preset.roundState.b);
    }
    if (preset.modState) {
      setModA(preset.modState.a);
      setModB(preset.modState.b);
    }
    if (preset.remState) {
      setRemA(preset.remState.a);
      setRemB(preset.remState.b);
    }
  }, []);

  const reset = useCallback(() => {
    setRoundStrategy('nearest');
    setRoundA(37);
    setRoundB(8);
    setModA(7);
    setModB(2);
    setRemA(10);
    setRemB(-3);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS round() / mod() / rem() Playground"
      description="Explore CSS stepped value functions interactively — snap to multiples, compute remainders, and visualize the math. All three went Baseline in 2024."
      controls={
        <button onClick={reset} className="btn-ghost text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
        {(['round', 'mod', 'rem'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-brand-500/20 text-brand-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}()
          </button>
        ))}
      </div>

      {/* ── round() tab ──────────────────────────────────────────────────── */}
      {tab === 'round' && (
        <div className="space-y-6">
          {/* Strategy selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rounding Strategy</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STRATEGIES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    onClick={() => setRoundStrategy(s.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      roundStrategy === s.value
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                        : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-mono font-semibold">{s.value}</span>
                    </div>
                    <p className="text-[11px] leading-tight opacity-70">{s.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                A <span className="text-slate-500 font-normal">(value to round)</span>
              </label>
              <input
                type="number"
                value={roundA}
                onChange={(e) => setRoundA(Number(e.target.value))}
                className="input w-full font-mono"
                step="any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                B <span className="text-slate-500 font-normal">(step size)</span>
              </label>
              <input
                type="number"
                value={roundB}
                onChange={(e) => setRoundB(Number(e.target.value))}
                className="input w-full font-mono"
                step="any"
              />
            </div>
          </div>

          {/* Result */}
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 mb-1">Result</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">
                  {isNaN(roundResult) ? '—' : roundResult}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  round({roundStrategy}, {roundA}, {roundB}) = {isNaN(roundResult) ? 'undefined (B cannot be 0)' : roundResult}
                </div>
              </div>
              <button onClick={copyCSS} className="btn-ghost text-xs">
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
          </div>

          {/* Number line */}
          <NumberLineViz a={roundA} b={roundB} result={roundResult} strategy={roundStrategy} mode="round" />

          {/* Example */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-500 font-mono">Example Usage</div>
              <button onClick={copyExample} className="btn-ghost text-xs">
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="text-sm text-slate-300 font-mono whitespace-pre overflow-x-auto">
              {fullCSSExample}
            </pre>
          </div>
        </div>
      )}

      {/* ── mod() tab ─────────────────────────────────────────────────────── */}
      {tab === 'mod' && (
        <div className="space-y-6">
          {/* Sign rule callout */}
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <Calculator className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-amber-300">mod(A, B) — remainder takes sign of B (divisor)</div>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  Unlike JavaScript&rsquo;s <code className="text-amber-300">%</code> operator, CSS <code className="text-amber-300">mod()</code> always returns a value with the same sign as B.
                  This makes it perfect for cyclic values that should stay positive.
                </p>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                A <span className="text-slate-500 font-normal">(dividend)</span>
              </label>
              <input
                type="number"
                value={modA}
                onChange={(e) => setModA(Number(e.target.value))}
                className="input w-full font-mono"
                step="any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                B <span className="text-slate-500 font-normal">(divisor)</span>
              </label>
              <input
                type="number"
                value={modB}
                onChange={(e) => setModB(Number(e.target.value))}
                className="input w-full font-mono"
                step="any"
              />
            </div>
          </div>

          {/* Result */}
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 mb-1">Result</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">
                  {isNaN(modResult) ? '—' : modResult}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  mod({modA}, {modB}) = {isNaN(modResult) ? 'undefined (B cannot be 0)' : modResult}
                </div>
                {!isNaN(modResult) && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    JS <code className="text-slate-400">%</code> would give: {modA % modB}
                    {modA % modB !== modResult && (
                      <span className="text-amber-400 ml-1">← different! CSS mod() uses sign of B</span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={copyCSS} className="btn-ghost text-xs">
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
          </div>

          {/* Number line */}
          <NumberLineViz a={modA} b={modB} result={modResult} mode="mod" />

          {/* Example */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-500 font-mono">Example Usage</div>
              <button onClick={copyExample} className="btn-ghost text-xs">
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="text-sm text-slate-300 font-mono whitespace-pre overflow-x-auto">
              {fullCSSExample}
            </pre>
          </div>
        </div>
      )}

      {/* ── rem() tab ─────────────────────────────────────────────────────── */}
      {tab === 'rem' && (
        <div className="space-y-6">
          {/* Sign rule callout */}
          <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
            <div className="flex items-start gap-2">
              <Calculator className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-violet-300">rem(A, B) — remainder takes sign of A (dividend)</div>
                <p className="text-xs text-violet-400/70 mt-0.5">
                  CSS <code className="text-violet-300">rem()</code> behaves like JavaScript&rsquo;s <code className="text-violet-300">%</code> operator.
                  The remainder always has the same sign as A. Use this when you want the remainder to reflect the sign of the input.
                </p>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                A <span className="text-slate-500 font-normal">(dividend)</span>
              </label>
              <input
                type="number"
                value={remA}
                onChange={(e) => setRemA(Number(e.target.value))}
                className="input w-full font-mono"
                step="any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                B <span className="text-slate-500 font-normal">(divisor)</span>
              </label>
              <input
                type="number"
                value={remB}
                onChange={(e) => setRemB(Number(e.target.value))}
                className="input w-full font-mono"
                step="any"
              />
            </div>
          </div>

          {/* Result */}
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 mb-1">Result</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">
                  {isNaN(remResult) ? '—' : remResult}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  rem({remA}, {remB}) = {isNaN(remResult) ? 'undefined (B cannot be 0)' : remResult}
                </div>
                {!isNaN(remResult) && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    JS <code className="text-slate-400">%</code> would give: {remA % remB}
                    <span className="text-violet-400 ml-1">← same! CSS rem() = JS %</span>
                  </div>
                )}
              </div>
              <button onClick={copyCSS} className="btn-ghost text-xs">
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
          </div>

          {/* Number line */}
          <NumberLineViz a={remA} b={remB} result={remResult} mode="rem" />

          {/* Example */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-500 font-mono">Example Usage</div>
              <button onClick={copyExample} className="btn-ghost text-xs">
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="text-sm text-slate-300 font-mono whitespace-pre overflow-x-auto">
              {fullCSSExample}
            </pre>
          </div>
        </div>
      )}

      {/* ── Presets ────────────────────────────────────────────────────────── */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                (preset.tab === tab &&
                  (preset.tab === 'round'
                    ? preset.roundState?.strategy === roundStrategy && preset.roundState?.a === roundA && preset.roundState?.b === roundB
                    : preset.tab === 'mod'
                    ? preset.modState?.a === modA && preset.modState?.b === modB
                    : preset.remState?.a === remA && preset.remState?.b === remB))
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  preset.tab === 'round' ? 'bg-blue-500/20 text-blue-400' :
                  preset.tab === 'mod' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-violet-500/20 text-violet-400'
                }`}>
                  {preset.tab}()
                </span>
                <span className="text-sm font-medium text-slate-200">{preset.name}</span>
              </div>
              <p className="text-xs text-slate-500">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Reference table ────────────────────────────────────────────────── */}
      <div className="mt-8 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Function</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Signature</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Sign Rule</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Use Case</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 font-mono">
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-3 text-blue-400">round()</td>
                <td className="py-2 px-3 text-xs">round(strategy, A, B)</td>
                <td className="py-2 px-3 text-xs">N/A — rounds to multiple</td>
                <td className="py-2 px-3 text-xs">Snap to grid, quantize values</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-2 px-3 text-amber-400">mod()</td>
                <td className="py-2 px-3 text-xs">mod(A, B)</td>
                <td className="py-2 px-3 text-xs">Sign of B (divisor)</td>
                <td className="py-2 px-3 text-xs">Cyclic values, zebra striping</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-violet-400">rem()</td>
                <td className="py-2 px-3 text-xs">rem(A, B)</td>
                <td className="py-2 px-3 text-xs">Sign of A (dividend)</td>
                <td className="py-2 px-3 text-xs">JS-compatible remainder, hue wrap</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ToolLayout>
  );
}
