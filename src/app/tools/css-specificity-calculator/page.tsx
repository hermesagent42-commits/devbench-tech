'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, ArrowRightLeft, Layers, Zap, Info, AlertTriangle, CheckCircle2, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface SpecificityParts {
  ids: number;        // a — ID selectors
  classes: number;    // b — class, attribute, pseudo-class selectors
  elements: number;   // c — type (element) and pseudo-element selectors
}

interface TokenInfo {
  token: string;
  type: 'id' | 'class' | 'attribute' | 'pseudo-class' | 'pseudo-element' | 'type' | 'universal' | 'combinator';
  weight: SpecificityParts;
}

// ── Parser ─────────────────────────────────────────────────────────────────

// CSS pseudo-elements (spec)
const PSEUDO_ELEMENTS = new Set([
  'after', 'before', 'first-letter', 'first-line', 'selection',
  'backdrop', 'placeholder', 'marker', 'spelling-error', 'grammar-error',
  'cue', 'file-selector-button', 'part', 'slotted', 'target-text',
  'highlight', 'view-transition', 'view-transition-group', 'view-transition-image-pair',
  'view-transition-old', 'view-transition-new',
]);

// CSS pseudo-classes that are structural (not functional)
const PSEUDO_CLASSES_RAW = new Set([
  'hover', 'active', 'focus', 'visited', 'link', 'target', 'focus-visible',
  'focus-within', 'root', 'empty', 'blank', 'checked', 'enabled', 'disabled',
  'required', 'optional', 'valid', 'invalid', 'in-range', 'out-of-range',
  'read-only', 'read-write', 'default', 'indeterminate', 'only-child',
  'only-of-type', 'first-child', 'last-child', 'first-of-type', 'last-of-type',
  'defined', 'open', 'closed', 'popover-open', 'modal',
  'autofill', 'user-valid', 'user-invalid',
  'playing', 'paused', 'seeking',
  'buffering', 'stalled', 'muted', 'volume-locked',
  'picture-in-picture', 'fullscreen',
  'any-link', 'local-link', 'scope',
  'current', 'past', 'future',
  'target-within', 'playing', 'paused',
]);

function specificityWeight(tokenType: TokenInfo['type']): SpecificityParts {
  switch (tokenType) {
    case 'id':             return { ids: 1, classes: 0, elements: 0 };
    case 'class':
    case 'attribute':
    case 'pseudo-class':   return { ids: 0, classes: 1, elements: 0 };
    case 'type':
    case 'pseudo-element': return { ids: 0, classes: 0, elements: 1 };
    default:               return { ids: 0, classes: 0, elements: 0 };
  }
}

function classifyToken(token: string): TokenInfo['type'] {
  if (token.startsWith('#')) return 'id';
  if (token.startsWith('.')) return 'class';
  if (token.startsWith('[') && token.endsWith(']')) return 'attribute';

  // Pseudo elements start with ::
  if (token.startsWith('::')) {
    const name = token.slice(2).toLowerCase();
    if (PSEUDO_ELEMENTS.has(name)) return 'pseudo-element';
    // Some can be written as ::pseudo (e.g. ::before and :before are both valid)
    return 'pseudo-element';
  }

  // Pseudo-classes start with :
  if (token.startsWith(':')) {
    // Functional pseudo-classes like :not(), :has(), :is(), etc. — parse them
    const nameMatch = token.match(/^:([a-zA-Z-]+)/);
    if (nameMatch) {
      const name = nameMatch[1].toLowerCase();
      if (PSEUDO_ELEMENTS.has(name)) return 'pseudo-element';
      return 'pseudo-class';
    }
    return 'pseudo-class';
  }

  // Element type selectors
  if (/^[a-zA-Z_][\w-]*$/i.test(token)) return 'type';

  // Universal selector
  if (token === '*') return 'universal';

  return 'type'; // fallback
}

// ── Tokenizer ──────────────────────────────────────────────────────────────

function tokenizeSelector(selector: string): string[] {
  // Normalize whitespace
  const s = selector.replace(/\s+/g, ' ').trim();
  const tokens: string[] = [];
  let i = 0;

  while (i < s.length) {
    // Skip whitespace (combinator)
    if (s[i] === ' ') {
      // We group combinators as whitespace tokens for clarity but don't
      // count them in specificity. Skip for now, add as token.
      tokens.push(' ');
      i++;
      continue;
    }

    // Combinators: >, +, ~
    if ('>+~'.includes(s[i])) {
      tokens.push(s[i]);
      i++;
      continue;
    }

    // ID selector: #...
    if (s[i] === '#') {
      let j = i + 1;
      // Valid ID chars: alphanumeric, hyphen, underscore, plus unicode escapes
      while (j < s.length && /[a-zA-Z0-9_-]/.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }

    // Class selector: .name
    if (s[i] === '.') {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9_-]/.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }

    // Attribute selector: [attr] / [attr=val] / [attr^=val] etc.
    if (s[i] === '[') {
      let j = i + 1;
      let depth = 1;
      while (j < s.length && depth > 0) {
        if (s[j] === '[') depth++;
        if (s[j] === ']') depth--;
        if (s[j] === '"' || s[j] === "'") {
          const quote = s[j];
          j++;
          while (j < s.length && s[j] !== quote) j++;
        }
        j++;
      }
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }

    // Pseudo-element (::) or pseudo-class (:)
    if (s[i] === ':') {
      // Check for double colon
      const isDouble = s[i + 1] === ':';
      let j = isDouble ? i + 2 : i + 1;

      // Parse the name (letters and hyphens)
      while (j < s.length && /[a-zA-Z-]/.test(s[j])) j++;

      // Check for parentheses — functional pseudo-class like :not(...), :has(...), :is(...)
      if (j < s.length && s[j] === '(') {
        let depth = 1;
        j++;
        while (j < s.length && depth > 0) {
          if (s[j] === '(') depth++;
          if (s[j] === ')') depth--;
          if (s[j] === '"' || s[j] === "'") {
            const quote = s[j];
            j++;
            while (j < s.length && s[j] !== quote) j++;
          }
          j++;
        }
      }

      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }

    // Type selector or universal
    if (/[a-zA-Z*]/.test(s[i])) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9_-]/.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }

    // Fallback — skip unknown character
    i++;
  }

  return tokens;
}

// ── Specificity calculator ─────────────────────────────────────────────────

function calculateSpecificity(selector: string): {
  tokens: TokenInfo[];
  parts: SpecificityParts;
  formatted: string;
  score: number;
} {
  const rawTokens = tokenizeSelector(selector);
  const tokens: TokenInfo[] = [];
  const parts: SpecificityParts = { ids: 0, classes: 0, elements: 0 };

  for (const raw of rawTokens) {
    const type = classifyToken(raw);
    const weight = specificityWeight(type);

    // Functional pseudo-classes like :not(), :has(), :is(), :where()
    // :where() contributes 0 specificity
    // :is() and :not() take the specificity of their most specific argument
    // :has() takes the specificity of its most specific argument
    const funcMatch = raw.match(/^:(not|has|is|where)\((.+)\)$/i);
    if (funcMatch) {
      const funcName = funcMatch[1].toLowerCase();
      const innerSelector = funcMatch[2];

      if (funcName === 'where') {
        // :where() adds 0 specificity — just record the token
        tokens.push({ token: raw, type: 'pseudo-class', weight: { ids: 0, classes: 0, elements: 0 } });
        continue;
      }

      // :not(), :has(), :is() — compute inner specificity and add it
      const innerResult = calculateSpecificity(innerSelector);
      const innerWeight = innerResult.parts;

      // For :not(), :is(), :has(): the pseudo-class itself contributes
      // class-level weight PLUS the inner specificity
      tokens.push({
        token: raw,
        type: 'pseudo-class',
        weight: {
          ids: innerWeight.ids,
          classes: innerWeight.classes + 1, // +1 for the pseudo-class itself
          elements: innerWeight.elements,
        },
      });

      parts.ids += innerWeight.ids;
      parts.classes += innerWeight.classes + 1;
      parts.elements += innerWeight.elements;
      continue;
    }

    tokens.push({ token: raw, type, weight });
    parts.ids += weight.ids;
    parts.classes += weight.classes;
    parts.elements += weight.elements;
  }

  const score = parts.ids * 10000 + parts.classes * 100 + parts.elements;
  const formatted = `${parts.ids},${parts.classes},${parts.elements}`;

  return { tokens, parts, formatted, score };
}

// ── Color helpers ──────────────────────────────────────────────────────────

function typeColor(type: TokenInfo['type']): string {
  switch (type) {
    case 'id':             return 'text-amber-400';
    case 'class':
    case 'attribute':
    case 'pseudo-class':   return 'text-cyan-400';
    case 'type':
    case 'pseudo-element': return 'text-emerald-400';
    case 'combinator':     return 'text-slate-500';
    case 'universal':      return 'text-slate-500';
    default:               return 'text-slate-400';
  }
}

function typeBg(type: TokenInfo['type']): string {
  switch (type) {
    case 'id':             return 'bg-amber-500/10 border-amber-500/30';
    case 'class':
    case 'attribute':
    case 'pseudo-class':   return 'bg-cyan-500/10 border-cyan-500/30';
    case 'type':
    case 'pseudo-element': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'combinator':     return 'bg-slate-500/10 border-slate-500/30';
    case 'universal':      return 'bg-slate-500/10 border-slate-500/30';
    default:               return 'bg-slate-500/10 border-slate-500/30';
  }
}

function typeLabel(type: TokenInfo['type']): string {
  switch (type) {
    case 'id':             return 'ID';
    case 'class':          return 'Class';
    case 'attribute':      return 'Attr';
    case 'pseudo-class':   return 'Pseudo-class';
    case 'pseudo-element': return 'Pseudo-el';
    case 'type':           return 'Element';
    case 'combinator':     return 'Combinator';
    case 'universal':      return 'Universal';
    default:               return type;
  }
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Simple element', selector: 'div' },
  { label: 'Element + class', selector: 'div.container' },
  { label: 'Nested classes', selector: '.nav .item.active' },
  { label: 'ID selector', selector: '#main' },
  { label: 'ID + class + element', selector: 'div#main.container' },
  { label: 'Attribute selector', selector: 'input[type="text"]' },
  { label: 'Pseudo-class', selector: 'a:hover' },
  { label: 'Pseudo-element', selector: 'p::first-line' },
  { label: 'Child combinator', selector: 'ul > li' },
  { label: ':not() with class', selector: 'div:not(.excluded)' },
  { label: ':is() selector', selector: ':is(h1, h2, h3).title' },
  { label: ':has() selector', selector: 'article:has(img)' },
  { label: ':where() (0 specificity)', selector: ':where(.theme-dark) .button' },
  { label: '10 classes', selector: '.a.b.c.d.e.f.g.h.i.j' },
  { label: 'Complex real-world', selector: '#content article.post:not(.draft) > h2.title' },
  { label: 'Attribute wildcard', selector: '[class^="prefix-"]' },
  { label: 'Adjacent sibling', selector: 'h2 + p' },
  { label: '::slotted()', selector: '::slotted(div.active)' },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CssSpecificityCalculator() {
  const [selectorA, setSelectorA] = useState('.nav .item.active');
  const [selectorB, setSelectorB] = useState('#sidebar .item');

  const resultA = useMemo(() => {
    try { return calculateSpecificity(selectorA); }
    catch { return null; }
  }, [selectorA]);

  const resultB = useMemo(() => {
    try { return calculateSpecificity(selectorB); }
    catch { return null; }
  }, [selectorB]);

  const comparison = useMemo(() => {
    if (!resultA || !resultB) return null;
    if (resultA.score > resultB.score) return 'a';
    if (resultB.score > resultA.score) return 'b';
    return 'tie';
  }, [resultA, resultB]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  }, []);

  const handleReset = useCallback(() => {
    setSelectorA('.nav .item.active');
    setSelectorB('#sidebar .item');
  }, []);

  const applyPresetLeft = useCallback((sel: string) => setSelectorA(sel), []);
  const applyPresetRight = useCallback((sel: string) => setSelectorB(sel), []);

  return (
    <ToolLayout
      title="CSS Specificity Calculator"
      description="Parse CSS selectors, visualize their specificity, and compare two selectors side-by-side to understand which wins the cascade."
    >
      <div className="space-y-8">
        {/* ── Inputs ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selector A */}
          <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-brand-400" />
              Selector A
            </label>
            <input
              type="text"
              value={selectorA}
              onChange={(e) => setSelectorA(e.target.value)}
              placeholder=".class #id element"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand-400 placeholder-slate-500"
            />
          </div>

          {/* Selector B */}
          <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              Selector B
            </label>
            <input
              type="text"
              value={selectorB}
              onChange={(e) => setSelectorB(e.target.value)}
              placeholder=".class #id element"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 font-mono text-sm focus:outline-none focus:border-purple-400 placeholder-slate-500"
            />
          </div>
        </div>

        {/* ── Comparison Bar ────────────────────────────────────────── */}
        {resultA && resultB && (
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-400 font-mono">{resultA.formatted}</div>
                <div className="text-xs text-slate-400 mt-0.5">Score: {resultA.score.toLocaleString()}</div>
              </div>

              <div className="flex flex-col items-center gap-1">
                {comparison === 'a' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-sm font-semibold">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    A wins
                  </div>
                )}
                {comparison === 'b' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-semibold">
                    <ArrowRightLeft className="w-3.5 h-3.5 rotate-180" />
                    B wins
                  </div>
                )}
                {comparison === 'tie' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-300 text-sm font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    Tie — order in source wins
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 font-mono">{resultB.formatted}</div>
                <div className="text-xs text-slate-400 mt-0.5">Score: {resultB.score.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Breakdown panels ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* A breakdown */}
          {resultA && (
            <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/30 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-400" />
                Selector A Breakdown
              </h3>

              {/* Specificity bars */}
              <div className="space-y-2">
                <SpecificityRow label="IDs" value={resultA.parts.ids} color="bg-amber-500" />
                <SpecificityRow label="Classes, Attrs, Pseudo-classes" value={resultA.parts.classes} color="bg-cyan-500" />
                <SpecificityRow label="Elements, Pseudo-elements" value={resultA.parts.elements} color="bg-emerald-500" />
              </div>

              {/* Tokens */}
              <div className="flex flex-wrap gap-1.5">
                {resultA.tokens.map((t, i) => (
                  <TokenBadge key={i} token={t} />
                ))}
              </div>

              <button
                onClick={() => handleCopy(`${selectorA} → (${resultA.formatted}) score: ${resultA.score}`)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy specificity
              </button>
            </div>
          )}

          {/* B breakdown */}
          {resultB && (
            <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/30 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                Selector B Breakdown
              </h3>

              <div className="space-y-2">
                <SpecificityRow label="IDs" value={resultB.parts.ids} color="bg-amber-500" />
                <SpecificityRow label="Classes, Attrs, Pseudo-classes" value={resultB.parts.classes} color="bg-cyan-500" />
                <SpecificityRow label="Elements, Pseudo-elements" value={resultB.parts.elements} color="bg-emerald-500" />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {resultB.tokens.map((t, i) => (
                  <TokenBadge key={i} token={t} />
                ))}
              </div>

              <button
                onClick={() => handleCopy(`${selectorB} → (${resultB.formatted}) score: ${resultB.score}`)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-purple-400 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy specificity
              </button>
            </div>
          )}
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <span className="text-xs text-slate-500">Try different selectors above or pick from the presets below.</span>
        </div>

        {/* ── Presets ───────────────────────────────────────────────── */}
        <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/30 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Presets — click to load
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRESETS.map((p) => (
              <div key={p.label} className="space-y-1">
                <div className="text-[11px] text-slate-500 truncate">{p.label}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => applyPresetLeft(p.selector)}
                    className="flex-1 px-2 py-1.5 rounded text-xs font-mono bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 transition-colors truncate"
                    title={`Load "${p.selector}" as Selector A`}
                  >
                    {p.selector}
                  </button>
                  <button
                    onClick={() => applyPresetRight(p.selector)}
                    className="flex-1 px-2 py-1.5 rounded text-xs font-mono bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors truncate"
                    title={`Load "${p.selector}" as Selector B`}
                  >
                    {p.selector}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Reference / Rules ──────────────────────────────────────── */}
        <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/30 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-400" />
            How Specificity Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <RuleCard
              icon={<Gauge className="w-4 h-4 text-amber-400" />}
              title="Calculated as (a, b, c)"
              description={
                <>
                  <strong className="text-amber-400">a:</strong> Count of ID selectors<br />
                  <strong className="text-cyan-400">b:</strong> Count of class, attribute, and pseudo-class selectors<br />
                  <strong className="text-emerald-400">c:</strong> Count of element type and pseudo-element selectors
                </>
              }
            />
            <RuleCard
              icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
              title="Special Cases"
              description={
                <>
                  <strong>:where()</strong> always contributes 0 specificity.<br />
                  <strong>:is()</strong> and <strong>:not()</strong> take the specificity of their <em>most specific</em> argument.
                </>
              }
            />
            <RuleCard
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              title="Important Notes"
              description={
                <>
                  Universal selector (<code className="text-slate-400">*</code>) and combinators add 0 specificity.<br />
                  <code className="text-slate-400">!important</code> overrides everything regardless of specificity.
                </>
              }
            />
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SpecificityRow({ label, value, color }: { label: string; value: number; color: string }) {
  const max = 15;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-48 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-bold text-slate-200 w-6 text-right">{value}</span>
    </div>
  );
}

function TokenBadge({ token }: { token: TokenInfo }) {
  if (token.type === 'combinator' || token.type === 'universal') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${typeBg(token.type)} ${typeColor(token.type)}`}
        title={`${typeLabel(token.type)} — contributes 0 specificity`}
      >
        {token.token === ' ' ? '␣' : token.token}
        <span className="text-[10px] text-slate-500">(0,0,0)</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono border ${typeBg(token.type)} ${typeColor(token.type)}`}
      title={`${typeLabel(token.type)} → (${token.weight.ids},${token.weight.classes},${token.weight.elements})`}
    >
      {token.token.length > 30 ? token.token.slice(0, 28) + '…' : token.token}
      <span className="text-[10px] opacity-70">
        ({token.weight.ids},{token.weight.classes},{token.weight.elements})
      </span>
    </span>
  );
}

function RuleCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/30 space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-slate-200">{title}</span>
      </div>
      <div className="text-xs text-slate-400 leading-relaxed">{description}</div>
    </div>
  );
}
