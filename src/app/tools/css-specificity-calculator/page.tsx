'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { ArrowLeftRight, Trash2, Info, Star, Layers, AlertTriangle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface SpecificityScore {
  a: number; // Inline styles (1 or 0)
  b: number; // IDs
  c: number; // Classes, attributes, pseudo-classes
  d: number; // Elements, pseudo-elements
}

interface SelectorPart {
  part: string;
  type: 'id' | 'class' | 'attr' | 'pseudo-class' | 'pseudo-element' | 'element' | 'universal' | 'combinator' | 'inline' | 'important';
  score: SpecificityScore;
  weight: 'high' | 'medium' | 'low' | 'none';
}

interface ParsedSelector {
  raw: string;
  parts: SelectorPart[];
  total: SpecificityScore;
  inline: boolean;
  important: boolean;
}

// ── Specificity Engine ─────────────────────────────────────────────────────

/** Match a single piece of a selector: IDs, classes, attributes, pseudo-*, elements */
const SELECTOR_TOKEN_RE = /([#.][\w-]+|\[[^\]]+\]|::?[\w-]+|[\w-]+|\*|[+>~]\s*|::?\s*|\(|\))/g;
const ID_RE = /^#[\w-]+$/;
const CLASS_RE = /^\.[\w-]+$/;
const ATTR_RE = /^\[.+\]$/;
const PSEUDO_CLASS_RE = /^:(?:(?:not|is|has|where|nth-child|nth-of-type|nth-last-child|nth-last-of-type|first-child|last-child|only-child|first-of-type|last-of-type|only-of-type|empty|root|target|enabled|disabled|checked|indeterminate|default|required|optional|valid|invalid|in-range|out-of-range|read-only|read-write|focus|focus-within|focus-visible|hover|active|visited|link|any-link|local-link|lang|dir|scope|current|past|future|playing|paused|seeking|buffering|stalled|muted|volume-locked|picture-in-picture|fullscreen|modal|popover-open|defined|host|host-context)\(.*\)|:(?!:)[\w-]+)$/;
const PSEUDO_ELEMENT_RE = /^::[\w-]+$/;
const UNIVERSAL_RE = /^\*$/;
const COMBINATOR_RE = /^[+>~]$/;
const IMPORTANT_RE = /!important/i;

/** Zero-weight pseudo-classes: :where() and :is() — these contribute the highest selector inside, but :where() always contributes zero */
function parseToken(token: string): SelectorPart | null {
  const clean = token.trim().replace(/\s+/g, '');
  if (!clean) return null;

  // Combinators
  if (COMBINATOR_RE.test(clean)) {
    return { part: clean, type: 'combinator', score: { a: 0, b: 0, c: 0, d: 0 }, weight: 'none' };
  }

  // :where() — always contributes 0 specificity
  if (/^:where\(/i.test(clean)) {
    return { part: clean, type: 'pseudo-class', score: { a: 0, b: 0, c: 0, d: 0 }, weight: 'none' };
  }

  // ID
  if (ID_RE.test(clean)) {
    return { part: clean, type: 'id', score: { a: 0, b: 1, c: 0, d: 0 }, weight: 'high' };
  }

  // Class
  if (CLASS_RE.test(clean)) {
    return { part: clean, type: 'class', score: { a: 0, b: 0, c: 1, d: 0 }, weight: 'medium' };
  }

  // Attribute selectors
  if (ATTR_RE.test(clean)) {
    return { part: clean, type: 'attr', score: { a: 0, b: 0, c: 1, d: 0 }, weight: 'medium' };
  }

  // Pseudo-class
  if (PSEUDO_CLASS_RE.test(clean)) {
    return { part: clean, type: 'pseudo-class', score: { a: 0, b: 0, c: 1, d: 0 }, weight: 'medium' };
  }

  // Pseudo-element
  if (PSEUDO_ELEMENT_RE.test(clean)) {
    return { part: clean, type: 'pseudo-element', score: { a: 0, b: 0, c: 0, d: 1 }, weight: 'low' };
  }

  // Universal selector
  if (UNIVERSAL_RE.test(clean)) {
    return { part: clean, type: 'universal', score: { a: 0, b: 0, c: 0, d: 0 }, weight: 'none' };
  }

  // Element / type selector
  if (/^[a-zA-Z_][\w-]*$/.test(clean)) {
    return { part: clean, type: 'element', score: { a: 0, b: 0, c: 0, d: 1 }, weight: 'low' };
  }

  // Unknown — treat as element
  return { part: clean, type: 'element', score: { a: 0, b: 0, c: 0, d: 1 }, weight: 'low' };
}

function parseSelector(raw: string): ParsedSelector {
  const trimmed = raw.trim();
  const important = IMPORTANT_RE.test(trimmed);
  const cleaned = trimmed.replace(IMPORTANT_RE, '').trim();

  // Check for inline hint — if it starts with "style=" or contains property:value
  const inline = /^style\s*=/i.test(cleaned);

  const tokens = cleaned.match(SELECTOR_TOKEN_RE) || [];
  const parts: SelectorPart[] = [];

  for (const token of tokens) {
    const parsed = parseToken(token);
    if (parsed) parts.push(parsed);
  }

  const total: SpecificityScore = { a: 0, b: 0, c: 0, d: 0 };
  for (const p of parts) {
    total.b += p.score.b;
    total.c += p.score.c;
    total.d += p.score.d;
  }

  // Inline styles get a=1
  if (inline) total.a = 1;

  // If there are no parts but the string is non-empty, treat as element
  if (parts.length === 0 && cleaned.length > 0) {
    const p = parseToken(cleaned);
    if (p) {
      parts.push(p);
      total.b += p.score.b;
      total.c += p.score.c;
      total.d += p.score.d;
    }
  }

  return { raw: trimmed, parts, total, inline, important };
}

function scoreToString(s: SpecificityScore): string {
  return `${s.a},${s.b},${s.c},${s.d}`;
}

function compareScore(a: SpecificityScore, b: SpecificityScore): number {
  if (a.a !== b.a) return a.a - b.a;
  if (a.b !== b.b) return a.b - b.b;
  if (a.c !== b.c) return a.c - b.c;
  return a.d - b.d;
}

function explainScore(s: SpecificityScore): string {
  const parts: string[] = [];
  if (s.a > 0) parts.push(`${s.a} from inline styles`);
  if (s.b > 0) parts.push(`${s.b} from ID selectors`);
  if (s.c > 0) parts.push(`${s.c} from classes/attributes/pseudo-classes`);
  if (s.d > 0) parts.push(`${s.d} from elements/pseudo-elements`);
  return parts.length > 0 ? `Specificity: ${parts.join(', ')}` : 'No specificity (universal/combinator)';
}

// ── Color mapping for specificity columns ──────────────────────────────────

function columnColor(col: 'a' | 'b' | 'c' | 'd', val: number): string {
  if (val === 0) return 'text-slate-500';
  const colors: Record<string, string> = {
    a: 'text-red-400',
    b: 'text-amber-400',
    c: 'text-brand-400',
    d: 'text-green-400',
  };
  return colors[col];
}

// ── Part badge colors ──────────────────────────────────────────────────────

const PART_COLORS: Record<string, { bg: string; text: string }> = {
  id: { bg: 'bg-amber-500/15', text: 'text-amber-300' },
  class: { bg: 'bg-brand-500/15', text: 'text-brand-300' },
  attr: { bg: 'bg-purple-500/15', text: 'text-purple-300' },
  'pseudo-class': { bg: 'bg-cyan-500/15', text: 'text-cyan-300' },
  'pseudo-element': { bg: 'bg-green-500/15', text: 'text-green-300' },
  element: { bg: 'bg-slate-500/15', text: 'text-slate-300' },
  universal: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
  combinator: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
  inline: { bg: 'bg-red-500/20', text: 'text-red-300' },
  important: { bg: 'bg-red-500/30', text: 'text-red-200' },
};

const PART_LABELS: Record<string, string> = {
  id: 'ID',
  class: 'Class',
  attr: 'Attribute',
  'pseudo-class': 'Pseudo-class',
  'pseudo-element': 'Pseudo-element',
  element: 'Element',
  universal: 'Universal',
  combinator: 'Combinator',
  inline: 'Inline',
  important: '!important',
};

// ── Sample selectors ───────────────────────────────────────────────────────

const SAMPLES = [
  {
    label: 'Complex form selector',
    selector1: '#login-form input[type="email"]:focus',
    selector2: '.form-input.error',
  },
  {
    label: 'ID vs. many classes',
    selector1: '#header',
    selector2: '.nav.menu.primary.fixed.top-level',
  },
  {
    label: 'Nested specificity',
    selector1: 'nav ul li a.active',
    selector2: '.nav-link',
  },
  {
    label: 'Inline vs selector',
    selector1: 'style="color: red"',
    selector2: 'div#main .highlight',
  },
  {
    label: 'Pseudo-class vs element',
    selector1: 'li:last-child',
    selector2: 'ul li',
  },
  {
    label: ':where() vs. :is()',
    selector1: ':is(#main, .header) a',
    selector2: ':where(#main, .header) a',
  },
  {
    label: 'Attribute selectors',
    selector1: 'a[href^="https"][rel~="noopener"]',
    selector2: 'a.external',
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function CSSSpecificityCalculatorPage() {
  const [selector1, setSelector1] = useState('#login-form .input-group input[type="text"]:focus');
  const [selector2, setSelector2] = useState('.form-field input.error');
  const [showInline, setShowInline] = useState(false);

  const parsed1 = useMemo(() => parseSelector(selector1), [selector1]);
  const parsed2 = useMemo(() => parseSelector(selector2), [selector2]);

  const winner = useMemo(() => {
    // !important overrides everything
    if (parsed1.important && !parsed2.important) return 1;
    if (parsed2.important && !parsed1.important) return 2;
    // Both important or neither — compare scores
    const cmp = compareScore(parsed1.total, parsed2.total);
    if (cmp > 0) return 1;
    if (cmp < 0) return 2;
    // Equal specificity — source order wins (later = selector2)
    return 2;
  }, [parsed1, parsed2]);

  const loadSample = useCallback((sample: (typeof SAMPLES)[0]) => {
    setSelector1(sample.selector1);
    setSelector2(sample.selector2);
    setShowInline(false);
  }, []);

  const clear = useCallback(() => {
    setSelector1('');
    setSelector2('');
    setShowInline(false);
  }, []);

  return (
    <ToolLayout
      title="CSS Specificity Calculator"
      description="Paste any CSS selector to see its specificity score broken down by IDs, classes, and elements. Compare two selectors to see which wins — understand cascade resolution visually."
    >
      {/* Sample presets */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Sample Comparisons
        </h3>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => loadSample(s)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-700/40 border border-slate-600/50 text-slate-300 hover:bg-brand-500/10 hover:border-brand-500/30 hover:text-brand-300 transition-all"
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={clear}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-700/40 border border-slate-600/50 text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Two-panel selector input & analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selector 1 */}
        <SelectorPanel
          label="Selector 1"
          value={selector1}
          onChange={setSelector1}
          parsed={parsed1}
          showInline={showInline}
        />

        {/* Selector 2 */}
        <SelectorPanel
          label="Selector 2"
          value={selector2}
          onChange={setSelector2}
          parsed={parsed2}
          showInline={showInline}
        />
      </div>

      {/* !important and inline toggle */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showInline}
            onChange={(e) => setShowInline(e.target.checked)}
            className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
          />
          Show inline style hints
        </label>
      </div>

      {/* Winner banner */}
      {selector1 && selector2 && (
        <div className="mt-6 p-4 rounded-xl border-2 border-slate-700/50 bg-surface-light">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-brand-400" />
            <div>
              <p className="text-sm font-medium text-white">
                {parsed1.important && parsed2.important
                  ? 'Both have !important — '
                  : parsed1.important
                  ? 'Selector 1 has !important — '
                  : parsed2.important
                  ? 'Selector 2 has !important — '
                  : ''}
                <span className="text-brand-400">
                  {winner === 1 ? 'Selector 1 wins' : 'Selector 2 wins'}
                </span>
                {!parsed1.important && !parsed2.important && parsed1.total.a > 0 && ' (inline style)'}
                {!parsed1.important && !parsed2.important && parsed2.total.a > 0 && ' (inline style)'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {compareScore(parsed1.total, parsed2.total) === 0 && !parsed1.important && !parsed2.important
                  ? 'Equal specificity — the later rule in the stylesheet wins (source order).'
                  : compareScore(parsed1.total, parsed2.total) === 0 && parsed1.important && parsed2.important
                  ? 'Both !important with equal specificity — source order determines the winner.'
                  : `Specificity ${scoreToString(parsed1.total)} vs ${scoreToString(parsed2.total)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Specificity reference */}
      <div className="mt-10 rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">Specificity Reference</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                The Hierarchy (highest to lowest)
              </h4>
              <ol className="space-y-1.5 text-sm text-slate-300 list-decimal list-inside">
                <li>
                  <span className="font-mono text-red-400">!important</span> — overrides everything (use sparingly)
                </li>
                <li>
                  <span className="font-mono text-red-400">Inline styles</span> — <code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs">(a,0,0,0)</code>
                </li>
                <li>
                  <span className="font-mono text-amber-400">#id</span> — ID selectors count toward column <strong>b</strong>
                </li>
                <li>
                  <span className="font-mono text-brand-400">.class</span>, <span className="font-mono text-purple-400">[attr]</span>, <span className="font-mono text-cyan-400">:pseudo-class</span> — column <strong>c</strong>
                </li>
                <li>
                  <span className="font-mono text-green-400">element</span>, <span className="font-mono text-green-400">::pseudo-element</span> — column <strong>d</strong>
                </li>
              </ol>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Special Rules
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span><code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs text-slate-300">:where()</code> always contributes <strong>0</strong> specificity — useful for establishing a low-specificity base</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span><code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs text-slate-300">:is()</code> and <code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs text-slate-300">:not()</code> take the specificity of their <strong>most specific</strong> argument</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span><code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs text-slate-300">:has()</code> specificity = its most specific argument (like :is())</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Combinators (<code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs">&gt;</code>, <code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs">+</code>, <code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs">~</code>, <code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs">&nbsp;</code>) and universal <code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs">*</code> contribute <strong>0</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span>Specificity is per-selector — a selector list like <code className="px-1 py-0.5 rounded bg-slate-700/50 text-xs">a, .b, #c</code> has three independent specificities</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Score Format
            </h4>
            <p className="text-sm text-slate-400">
              Specificity is written as <span className="font-mono text-white">(a, b, c, d)</span> where:
              <span className="ml-2 text-red-400">a</span> = inline,
              <span className="ml-2 text-amber-400">b</span> = IDs,
              <span className="ml-2 text-brand-400">c</span> = classes/attrs/pseudo-classes,
              <span className="ml-2 text-green-400">d</span> = elements/pseudo-elements.
              Compare left-to-right: a higher number in the leftmost column wins.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// ── Selector Panel Sub-component ────────────────────────────────────────────

function SelectorPanel({
  label,
  value,
  onChange,
  parsed,
  showInline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  parsed: ParsedSelector;
  showInline: boolean;
}) {
  return (
    <div className="p-5 rounded-xl border-2 border-slate-700/50 bg-surface-light">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-brand-400" />
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
          {label}
        </span>
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. #main .card:hover, style=color:red"
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 font-mono text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 mb-4"
        spellCheck={false}
        autoComplete="off"
      />

      {/* Score display */}
      <div className="mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Score
          </span>
          <div className="flex items-center gap-1.5 font-mono text-lg font-bold">
            <span className="text-slate-500">(</span>
            <span className={columnColor('a', parsed.total.a)}>{parsed.total.a}</span>
            <span className="text-slate-600">,</span>
            <span className={columnColor('b', parsed.total.b)}>{parsed.total.b}</span>
            <span className="text-slate-600">,</span>
            <span className={columnColor('c', parsed.total.c)}>{parsed.total.c}</span>
            <span className="text-slate-600">,</span>
            <span className={columnColor('d', parsed.total.d)}>{parsed.total.d}</span>
            <span className="text-slate-500">)</span>
          </div>
          {parsed.important && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
              !important
            </span>
          )}
          {parsed.inline && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
              inline
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">{explainScore(parsed.total)}</p>
      </div>

      {/* Parts breakdown */}
      {parsed.parts.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
            Selector Breakdown
          </span>
          <div className="flex flex-wrap gap-1.5">
            {parsed.parts.map((part, i) => {
              const colors = PART_COLORS[part.type] || PART_COLORS.element;
              return (
                <div
                  key={i}
                  className={`group relative px-2.5 py-1 rounded-md text-xs font-mono cursor-default ${colors.bg} ${colors.text} border border-current/10 transition-colors`}
                >
                  <span className="truncate max-w-[150px] inline-block">{part.part}</span>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-slate-900 text-[10px] text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-700">
                    {PART_LABELS[part.type]} — {scoreToString(part.score)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {parsed.parts.length === 0 && value.trim() && (
        <p className="text-xs text-slate-500 italic">No parseable selector parts found.</p>
      )}
    </div>
  );
}
