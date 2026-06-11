'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Check, Play, Pause, RotateCcw, Code2, Info,
  ChevronDown, ChevronRight, GripHorizontal, Columns,
  Maximize2, MoveHorizontal, ArrowDown, ArrowUp, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type SizeKeyword = 'auto' | 'max-content' | 'min-content' | 'fit-content' | 'stretch';
type Scenario = 'text-expand' | 'sidebar' | 'accordion' | 'grid-cell' | 'flex-item' | 'details-summary';

interface ScenarioDef {
  label: string;
  description: string;
  icon: string;
  keyword: SizeKeyword;
  fromSize: string;
  toSize: string;
  direction: 'horizontal' | 'vertical' | 'both';
  duration: string;
}

interface DemoState {
  expanded: boolean;
  useInterpolateSize: boolean;
  playing: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SCENARIOS: Record<Scenario, ScenarioDef> = {
  'text-expand': {
    label: 'Text Reveal',
    description: 'Smooth height: auto reveal — paragraphs, tooltips, card descriptions',
    icon: '📝',
    keyword: 'auto',
    fromSize: '0px',
    toSize: 'auto',
    direction: 'vertical',
    duration: '0.5s',
  },
  sidebar: {
    label: 'Collapsible Sidebar',
    description: 'Smooth width: auto for nav menus, side panels, drawers',
    icon: '📐',
    keyword: 'auto',
    fromSize: '0px',
    toSize: 'auto',
    direction: 'horizontal',
    duration: '0.4s',
  },
  accordion: {
    label: 'Accordion Panel',
    description: 'Smooth height animation for FAQ accordions, expandable lists',
    icon: '🎵',
    keyword: 'auto',
    fromSize: '0px',
    toSize: 'auto',
    direction: 'vertical',
    duration: '0.35s',
  },
  'grid-cell': {
    label: 'Grid Cell Resize',
    description: 'Animate grid tracks to/from max-content/min-content',
    icon: '🔲',
    keyword: 'max-content',
    fromSize: '100px',
    toSize: 'max-content',
    direction: 'both',
    duration: '0.5s',
  },
  'flex-item': {
    label: 'Flex Item Grow',
    description: 'Animate flex children to/from max-content',
    icon: '↔️',
    keyword: 'max-content',
    fromSize: '120px',
    toSize: 'max-content',
    direction: 'horizontal',
    duration: '0.4s',
  },
  'details-summary': {
    label: '<details>/<summary>',
    description: 'Replicate native details animation with interpolate-size',
    icon: '📋',
    keyword: 'auto',
    fromSize: '0px',
    toSize: 'auto',
    direction: 'vertical',
    duration: '0.3s',
  },
};

const KEYWORD_DESCRIPTIONS: Record<SizeKeyword, { label: string; desc: string }> = {
  auto: { label: 'auto', desc: 'The browser calculates the size based on content and container' },
  'max-content': { label: 'max-content', desc: 'The intrinsic preferred width/height — as wide as content needs without wrapping' },
  'min-content': { label: 'min-content', desc: 'The intrinsic minimum width/height — narrowest without overflow' },
  'fit-content': { label: 'fit-content', desc: 'min(max-content, max(min-content, available)) — uses available space but never less than min-content' },
  stretch: { label: 'stretch', desc: 'Fills the available space in the relevant axis (like flex: 1 or grid stretch)' },
};

// ── Demo Content ───────────────────────────────────────────────────────────

const ACCORDION_ITEMS = [
  { q: 'What is interpolate-size?', a: 'The CSS interpolate-size property enables smooth transitions and animations to/from intrinsic sizing keywords like auto, min-content, max-content, fit-content, and stretch. Without it, browsers cannot interpolate between a numeric value and a keyword because keywords have no intermediate values.' },
  { q: 'Why was it needed?', a: 'For decades, height: 0 → height: auto transitions were simply impossible in pure CSS. The only workarounds were max-height hacks with magic numbers, JavaScript getComputedStyle reads, or abandoning auto entirely. interpolate-size fixes this natively.' },
  { q: 'When should I use it?', a: 'Use interpolate-size: allow-keywords whenever you need smooth animation involving intrinsic sizes — accordions, collapsible sidebars, expanding text, responsive grid track animations, detail/summary transitions, and any layout that needs to animate to content-sized dimensions.' },
];

const SIDEBAR_LINKS = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Analytics', icon: '📈' },
  { label: 'Projects', icon: '📁' },
  { label: 'Team', icon: '👥' },
  { label: 'Settings', icon: '⚙️' },
  { label: 'Help', icon: '❓' },
];

const TEXT_REVEAL_CONTENT = `Smooth height transitions to auto have been the holy grail of CSS animation. For over 20 years, developers resorted to max-height hacks, JavaScript DOM measurement, or simply abandoning auto. The CSS interpolate-size property — now Baseline across all major browsers — lets you animate to and from intrinsic sizing keywords natively. No hacks. No JS. No magic numbers. Just add interpolate-size: allow-keywords and transition height.`;

const FLEX_ITEMS = [
  { label: 'Dashboard', desc: 'Overview & metrics' },
  { label: 'Analytics', desc: 'Deep dive into your data' },
  { label: 'Reports', desc: 'Generate and export reports' },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CSSInterpolateSizePlayground() {
  // Scenario state
  const [scenario, setScenario] = useState<Scenario>('accordion');
  const [expanded, setExpanded] = useState(false);
  const [useInterpolateSize, setUseInterpolateSize] = useState(true);
  const [accordionOpen, setAccordionOpen] = useState<number | null>(null);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [showSideBySide, setShowSideBySide] = useState(true);

  // For the side-by-side demo
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const sc = SCENARIOS[scenario];

  const copyCode = useCallback(() => {
    const code = `.element {\n  /* The magic line — allows smooth animation to/from intrinsic sizes */\n  interpolate-size: allow-keywords;\n\n  /* Transition the property */\n  transition: ${sc.direction === 'horizontal' ? 'width' : sc.direction === 'both' ? 'width, height' : 'height'} ${sc.duration} ease;\n\n  /* When collapsed */\n  ${sc.direction === 'horizontal' || sc.direction === 'both' ? `width: ${sc.fromSize};` : `height: ${sc.fromSize};`}\n  ${sc.direction === 'vertical' || sc.direction === 'both' ? `height: ${sc.fromSize};` : ''}\n  overflow: hidden;\n}\n\n.element.expanded {\n  ${sc.direction === 'horizontal' || sc.direction === 'both' ? `width: ${sc.toSize};` : `height: ${sc.toSize};`}\n  ${sc.direction === 'vertical' || sc.direction === 'both' ? `height: ${sc.toSize};` : ''}\n}`;
    navigator.clipboard.writeText(code);
    toast.success('CSS copied to clipboard!');
  }, [sc]);

  const resetDemo = useCallback(() => {
    setLeftExpanded(false);
    setRightExpanded(false);
  }, []);

  const toggleBoth = useCallback(() => {
    setLeftExpanded((p) => !p);
    setRightExpanded((p) => !p);
  }, []);

  // ── Compute generated CSS ────────────────────────────────────────────

  const generatedCSS = `.demo-${sc.keyword} {
  interpolate-size: allow-keywords;
  transition: ${sc.direction === 'horizontal' ? 'width' : sc.direction === 'both' ? 'width, height' : 'height'} ${sc.duration} ease;
  ${sc.direction === 'horizontal' || sc.direction === 'both' ? `width: ${sc.fromSize};` : `height: ${sc.fromSize};`}
  ${sc.direction === 'vertical' || sc.direction === 'both' ? `height: ${sc.fromSize};` : ''}
  overflow: hidden;
}

.demo-${sc.keyword}.open {
  ${sc.direction === 'horizontal' || sc.direction === 'both' ? `width: ${sc.toSize};` : `height: ${sc.toSize};`}
  ${sc.direction === 'vertical' || sc.direction === 'both' ? `height: ${sc.toSize};` : ''}
}`;

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS interpolate-size Playground"
      description="Animate to and from auto, max-content, min-content, fit-content, and stretch — the CSS property that finally makes intrinsic size animations work natively. Side-by-side comparison to show why interpolate-size: allow-keywords is essential."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Scenario selector */}
          <select
            value={scenario}
            onChange={(e) => { setScenario(e.target.value as Scenario); resetDemo(); }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-400"
          >
            {Object.entries(SCENARIOS).map(([key, def]) => (
              <option key={key} value={key}>{def.icon} {def.label}</option>
            ))}
          </select>

          <div className="h-6 w-px bg-slate-600" />

          {/* Toggle buttons */}
          <button
            onClick={toggleBoth}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-400 transition-colors"
          >
            <Play className="w-4 h-4" />
            Animate All
          </button>

          <button
            onClick={resetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          <div className="h-6 w-px bg-slate-600" />

          {/* Side-by-side toggle */}
          <button
            onClick={() => setShowSideBySide(!showSideBySide)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showSideBySide ? 'bg-brand-500/10 text-brand-400 border-brand-500/30' : 'bg-slate-800 text-slate-400 border-slate-600'
            }`}
          >
            <Columns className="w-4 h-4" />
            Side-by-side
          </button>

          {/* Code panel toggle */}
          <button
            onClick={() => setShowCodePanel(!showCodePanel)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showCodePanel ? 'bg-brand-500/10 text-brand-400 border-brand-500/30' : 'bg-slate-800 text-slate-400 border-slate-600'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Code
          </button>

          {/* Explanation toggle */}
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-colors"
          >
            <Info className="w-4 h-4" />
            How it works
          </button>

          <button
            onClick={copyCode}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-colors ml-auto"
          >
            <Copy className="w-4 h-4" />
            Copy CSS
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Explanation Panel ────────────────────────────────────────── */}
        {showExplanation && (
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-fade-in">
            <h3 className="text-lg font-semibold text-white mb-3">Why interpolate-size Exists</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="space-y-2">
                <p>
                  <strong className="text-red-400">Without interpolate-size:</strong> Browsers cannot animate between a numeric value (like <code className="text-brand-400 bg-brand-500/10 px-1 rounded">0px</code>) and an intrinsic keyword (like <code className="text-brand-400 bg-brand-500/10 px-1 rounded">auto</code>) because keywords have no intermediate steps. The element jumps instantly — no smooth animation.
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <strong className="text-green-400">With interpolate-size: allow-keywords:</strong> The browser <em>calculates</em> the final keyword-based size first, then animates between the start numeric value and that calculated size. The keyword acts as an animation <em>target</em> — the browser resolves it to a pixel value and interpolates smoothly.
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700/30">
              <p className="text-xs text-slate-500 mb-2">Browser Support — Baseline 2025</p>
              <div className="flex items-center gap-2">
                {['Chrome 129+', 'Firefox 132+', 'Safari 18.2+', 'Edge 129+'].map((b) => (
                  <span key={b} className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">{b}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Scenario Info ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <span className="text-2xl">{sc.icon}</span>
          <div>
            <p className="text-white font-medium text-sm">{sc.label}</p>
            <p className="text-slate-400 text-xs">{sc.description}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-xs font-mono border border-purple-500/20">
              {sc.fromSize} → {sc.toSize}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-xs font-mono border border-brand-500/20">
              {sc.direction}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 text-xs font-mono border border-slate-600">
              {sc.duration}
            </span>
          </div>
        </div>

        {/* ── Side-by-Side Demo ────────────────────────────────────────── */}
        {showSideBySide ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: WITHOUT interpolate-size */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border-b border-red-500/20">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-red-400">Without interpolate-size</span>
                <span className="text-xs text-red-400/60 ml-auto">Snaps — no animation</span>
              </div>
              <div className="p-4">
                <button
                  onClick={() => setLeftExpanded(!leftExpanded)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors mb-3"
                >
                  {leftExpanded ? '⬆ Collapse' : '⬇ Expand'} (no interpolate-size)
                </button>
                <div
                  className="rounded-lg bg-slate-800/50 border border-slate-700/30 overflow-hidden"
                  style={{
                    transition: `${sc.direction === 'horizontal' ? 'width' : sc.direction === 'both' ? 'width, height' : 'height'} ${sc.duration} ease`,
                    ...(sc.direction === 'horizontal' || sc.direction === 'both' ? { width: leftExpanded ? 'auto' : sc.fromSize, minWidth: 0 } : {}),
                    ...(sc.direction === 'vertical' || sc.direction === 'both' ? { height: leftExpanded ? 'auto' : sc.fromSize } : {}),
                  }}
                >
                  <DemoContent scenario={scenario} expanded={leftExpanded} accordionOpen={accordionOpen} setAccordionOpen={setAccordionOpen} />
                </div>
              </div>
            </div>

            {/* Right: WITH interpolate-size */}
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border-b border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-green-400">With interpolate-size: allow-keywords</span>
                <span className="text-xs text-green-400/60 ml-auto">Smooth animation ✨</span>
              </div>
              <div className="p-4">
                <button
                  onClick={() => setRightExpanded(!rightExpanded)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors mb-3"
                >
                  {rightExpanded ? '⬆ Collapse' : '⬇ Expand'} (with interpolate-size)
                </button>
                <div
                  className="rounded-lg bg-slate-800/50 border border-slate-700/30 overflow-hidden"
                  style={{
                    interpolateSize: 'allow-keywords',
                    transition: `${sc.direction === 'horizontal' ? 'width' : sc.direction === 'both' ? 'width, height' : 'height'} ${sc.duration} ease`,
                    ...(sc.direction === 'horizontal' || sc.direction === 'both' ? { width: rightExpanded ? 'auto' : sc.fromSize, minWidth: 0 } : {}),
                    ...(sc.direction === 'vertical' || sc.direction === 'both' ? { height: rightExpanded ? 'auto' : sc.fromSize } : {}),
                  }}
                >
                  <DemoContent scenario={scenario} expanded={rightExpanded} accordionOpen={accordionOpen} setAccordionOpen={setAccordionOpen} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ═══ Single (non-side-by-side) demo ═══ */
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-brand-500/10 border-b border-brand-500/20">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              <span className="text-sm font-medium text-brand-400">
                interpolate-size: {useInterpolateSize ? 'allow-keywords' : 'numeric-only'}
              </span>
              <label className="ml-auto flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <span>interpolate-size</span>
                <button
                  onClick={() => setUseInterpolateSize(!useInterpolateSize)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    useInterpolateSize ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      useInterpolateSize ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            </div>
            <div className="p-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors mb-3"
              >
                {expanded ? '⬆ Collapse' : '⬇ Expand'}
              </button>
              <div
                className="rounded-lg bg-slate-800/50 border border-slate-700/30 overflow-hidden"
                style={{
                  interpolateSize: useInterpolateSize ? 'allow-keywords' : 'numeric-only',
                  transition: `${sc.direction === 'horizontal' ? 'width' : sc.direction === 'both' ? 'width, height' : 'height'} ${sc.duration} ease`,
                  ...(sc.direction === 'horizontal' || sc.direction === 'both' ? { width: expanded ? 'auto' : sc.fromSize, minWidth: 0 } : {}),
                  ...(sc.direction === 'vertical' || sc.direction === 'both' ? { height: expanded ? 'auto' : sc.fromSize } : {}),
                }}
              >
                <DemoContent scenario={scenario} expanded={expanded} accordionOpen={accordionOpen} setAccordionOpen={setAccordionOpen} />
              </div>
            </div>
          </div>
        )}

        {/* ── Code Panel ────────────────────────────────────────────────── */}
        {showCodePanel && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700/50">
              <span className="text-sm font-medium text-slate-300">Generated CSS</span>
              <button
                onClick={() => { navigator.clipboard.writeText(generatedCSS); toast.success('Copied!'); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="p-4 text-sm font-mono text-slate-300 overflow-x-auto">
              <code>{generatedCSS}</code>
            </pre>
          </div>
        )}

        {/* ── Intrinsic Sizing Keywords Reference ──────────────────────── */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800 border-b border-slate-700/50">
            <span className="text-sm font-medium text-slate-300">🔄 Intrinsic Sizing Keywords Supported by interpolate-size</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.entries(KEYWORD_DESCRIPTIONS) as [SizeKeyword, { label: string; desc: string }][]).map(([key, { label, desc }]) => (
              <div
                key={key}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  sc.keyword === key
                    ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                    : 'bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600'
                }`}
                onClick={() => {
                  // Find a scenario that uses this keyword
                  const match = (Object.entries(SCENARIOS) as [Scenario, ScenarioDef][]).find(([, d]) => d.keyword === key);
                  if (match) { setScenario(match[0]); resetDemo(); }
                }}
              >
                <code className="text-xs font-mono font-semibold block mb-1">{label}</code>
                <p className="text-xs leading-relaxed opacity-80">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Takeaways ────────────────────────────────────────────── */}
        <div className="p-5 rounded-xl bg-gradient-to-r from-brand-500/5 to-purple-500/5 border border-brand-500/10">
          <h3 className="text-sm font-semibold text-white mb-3">💡 Key Takeaways</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="flex gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span><strong className="text-slate-300">One line:</strong> Add <code className="text-brand-400 bg-brand-500/10 px-1 rounded">interpolate-size: allow-keywords</code> to any element that transitions to/from an intrinsic size.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span><strong className="text-slate-300">Works everywhere:</strong> Transitions, CSS animations, Web Animations API, and View Transitions all respect interpolate-size.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span><strong className="text-slate-300">No more hacks:</strong> Replace max-height: 9999px and JS height-measurement with pure CSS interpolate-size.</span>
            </div>
          </div>
        </div>

      </div>
    </ToolLayout>
  );
}

// ── Demo Content Component ──────────────────────────────────────────────────

function DemoContent({
  scenario,
  expanded,
  accordionOpen,
  setAccordionOpen,
}: {
  scenario: Scenario;
  expanded: boolean;
  accordionOpen: number | null;
  setAccordionOpen: (n: number | null) => void;
}) {
  switch (scenario) {
    case 'accordion':
      return (
        <div className="divide-y divide-slate-700/30">
          {ACCORDION_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setAccordionOpen(accordionOpen === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-white hover:bg-slate-700/30 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    accordionOpen === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {accordionOpen === i && (
                <div className="px-4 py-3 text-sm text-slate-400 bg-slate-700/20">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      );

    case 'sidebar':
      return (
        <div className="min-h-[200px]">
          {SIDEBAR_LINKS.map((link, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </div>
          ))}
        </div>
      );

    case 'text-expand':
      return (
        <div className="p-4">
          <p className="text-sm text-slate-300 leading-relaxed">{TEXT_REVEAL_CONTENT}</p>
        </div>
      );

    case 'grid-cell':
      return (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {['Analytics', 'Reports', 'Settings', 'Users'].map((item) => (
              <div key={item} className="p-3 rounded bg-slate-700/30 border border-slate-600/30 text-center text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      );

    case 'flex-item':
      return (
        <div className="p-3 flex gap-3">
          {FLEX_ITEMS.map((item) => (
            <div key={item.label} className="flex-1 p-3 rounded bg-slate-700/30 border border-slate-600/30">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      );

    case 'details-summary':
      return (
        <div>
          <div className="px-4 py-3 text-sm font-medium text-white bg-slate-700/30 border-b border-slate-700/20">
            ▶ Summary (click to toggle)
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              This replicates the native <code className="text-brand-400 bg-brand-500/10 px-1 rounded">&lt;details&gt;</code> / <code className="text-brand-400 bg-brand-500/10 px-1 rounded">&lt;summary&gt;</code> behavior but with full CSS animation control via interpolate-size.
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="p-4 text-sm text-slate-400 text-center">
          Select a scenario to preview
        </div>
      );
  }
}
