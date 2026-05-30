'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Layers, Copy, ArrowRight, HelpCircle, Medal } from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
// CSS Specificity Calculator
// ============================================================

const ID_WEIGHT = 100;
const CLASS_WEIGHT = 10;
const ELEMENT_WEIGHT = 1;

interface Specificity {
  ids: number;
  classes: number;
  elements: number;
  score: number;
}

function parseSpecificity(selector: string): Specificity {
  let ids = 0;
  let classes = 0;
  let elements = 0;

  // Handle inline styles first
  const trimmed = selector.trim();
  if (!trimmed) return { ids: 0, classes: 0, elements: 0, score: 0 };

  // Remove pseudo-elements to count them separately
  const pseudoElements = trimmed.match(/::[a-zA-Z-]+/g);
  if (pseudoElements) {
    elements += pseudoElements.length;
  }

  // Strip pseudo-elements for main parsing
  let clean = trimmed.replace(/::[a-zA-Z-]+/g, '');

  // Handle :not(), :is(), :where() by extracting inner selectors
  // :where() has zero specificity — skip its contents entirely
  clean = clean.replace(/:where\([^)]+\)/g, '');

  // :not() and :is() take the specificity of their most specific argument
  const notIsMatches = clean.match(/:(?:not|is)\(([^)]+)\)/g);
  if (notIsMatches) {
    for (const match of notIsMatches) {
      const inner = match.slice(match.indexOf('(') + 1, match.lastIndexOf(')'));
      const innerSpec = parseSpecificity(inner);
      ids += innerSpec.ids;
      classes += innerSpec.classes;
      elements += innerSpec.elements;
      // Remove the :not/:is wrapper but keep the processed count
      clean = clean.replace(match, '');
    }
  }

  // Handle :has() — same as :is() specificity
  const hasMatches = clean.match(/:has\(([^)]+)\)/g);
  if (hasMatches) {
    for (const match of hasMatches) {
      const inner = match.slice(match.indexOf('(') + 1, match.lastIndexOf(')'));
      const innerSpec = parseSpecificity(inner);
      ids += innerSpec.ids;
      classes += innerSpec.classes;
      elements += innerSpec.elements;
      clean = clean.replace(match, '');
    }
  }

  // Handle :nth-child(), :nth-of-type(), etc. (these contain parentheses but aren't functional selectors with their own specificity)
  // We need to preserve them as pseudo-classes

  // Count IDs
  const idMatches = clean.match(/#[a-zA-Z_][a-zA-Z0-9_-]*/g);
  if (idMatches) {
    ids += idMatches.length;
    clean = clean.replace(/#[a-zA-Z_][a-zA-Z0-9_-]*/g, '');
  }

  // Count classes
  const classMatches = clean.match(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g);
  if (classMatches) {
    classes += classMatches.length;
    // Don't remove dots yet — they might conflict with attribute selectors
    clean = clean.replace(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g, '');
  }

  // Count attribute selectors
  const attrMatches = clean.match(/\[[^\]]+\]/g);
  if (attrMatches) {
    classes += attrMatches.length;
    clean = clean.replace(/\[[^\]]+\]/g, '');
  }

  // Count pseudo-classes (non-functional)
  const pcMatches = clean.match(/:(?!(?:not|is|where|has|nth)-)[a-zA-Z-]+/g);
  if (pcMatches) {
    classes += pcMatches.length;
    clean = clean.replace(/:(?!(?:not|is|where|has|nth)-)[a-zA-Z-]+/g, '');
  }

  // Count functional pseudo-classes like :nth-child(2n+1), :lang(en), etc.
  const fpcMatches = clean.match(/:(?:nth-child|nth-of-type|nth-last-child|nth-last-of-type|lang|dir|host-context)\([^)]+\)/g);
  if (fpcMatches) {
    classes += fpcMatches.length;
    clean = clean.replace(/:(?:nth-child|nth-of-type|nth-last-child|nth-last-of-type|lang|dir|host-context)\([^)]+\)/g, '');
  }

  // Count element selectors (non-special tokens)
  // Remove combinators and universal selectors, then count remaining tokens
  clean = clean.replace(/[>+~]/g, ' ').trim();

  if (clean) {
    const tokens = clean.split(/\s+/).filter(t => t && t !== '*' && t !== '');
    elements += tokens.length;
  }

  const score = ids * ID_WEIGHT + classes * CLASS_WEIGHT + elements * ELEMENT_WEIGHT;

  return { ids, classes, elements, score };
}

function SpecificityBar({
  label,
  count,
  color,
  total,
}: {
  label: string;
  count: number;
  color: string;
  total: number;
}) {
  const max = total || 1;
  const pct = Math.min(100, (count / max) * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider w-24 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-5 bg-surface border border-slate-700 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-bold text-slate-200 w-8 text-right">
        {count}
      </span>
    </div>
  );
}

const PRESETS = [
  { label: 'Element', selector: 'div' },
  { label: 'Class', selector: '.button' },
  { label: 'Two classes', selector: '.btn.primary' },
  { label: 'ID', selector: '#header' },
  { label: 'ID + class', selector: '#nav .item' },
  { label: 'Element + class', selector: 'a.active' },
  { label: 'Attribute', selector: '[type="submit"]' },
  { label: 'Pseudo-class', selector: 'li:first-child' },
  { label: 'Descendant (3 deep)', selector: 'nav ul li a' },
  { label: 'ID + class + element', selector: '#sidebar .widget h2' },
  { label: ':not() specificity', selector: 'div:not(.exclude)' },
  { label: ':is() specificity', selector: ':is(#main, .content) p' },
  { label: ':where() (zero specificity)', selector: ':where(.theme-dark) a' },
  { label: 'Complex', selector: '#main > article.post h2.title span' },
  { label: 'Attribute + pseudo', selector: 'input[type="text"]:focus' },
  { label: 'Nth-child', selector: 'tr:nth-child(odd)' },
  { label: ':has()', selector: '.card:has(img)' },
];

const REFERENCE = [
  { selector: '* (universal)', ids: 0, classes: 0, elements: 0, note: 'Zero specificity' },
  { selector: 'div', ids: 0, classes: 0, elements: 1, note: 'Element / pseudo-element' },
  { selector: '.card', ids: 0, classes: 1, elements: 0, note: 'Class / attribute / pseudo-class' },
  { selector: '#app', ids: 1, classes: 0, elements: 0, note: 'ID selector' },
  { selector: 'style=""', ids: 0, classes: 0, elements: 0, note: 'Inline style — always wins (1,0,0,0)' },
  { selector: '!important', ids: 0, classes: 0, elements: 0, note: 'Overrides everything except another !important' },
];

function ScoreCard({ specificity, label }: { specificity: Specificity; label?: string }) {
  return (
    <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
      {label && (
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      )}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-white font-mono">{specificity.score}</span>
        <span className="text-xs text-slate-500">total</span>
      </div>
      <div className="space-y-1.5">
        <SpecificityBar
          label="IDs"
          count={specificity.ids}
          color="bg-red-500"
          total={Math.max(specificity.ids, specificity.classes, specificity.elements, 1)}
        />
        <SpecificityBar
          label="Classes/Attrs/Pseudo"
          count={specificity.classes}
          color="bg-amber-500"
          total={Math.max(specificity.ids, specificity.classes, specificity.elements, 1)}
        />
        <SpecificityBar
          label="Elements/Pseudo-el"
          count={specificity.elements}
          color="bg-emerald-500"
          total={Math.max(specificity.ids, specificity.classes, specificity.elements, 1)}
        />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <code className="text-xs text-slate-400 font-mono">
          ({specificity.ids},{specificity.classes},{specificity.elements})
        </code>
      </div>
    </div>
  );
}

export default function SpecificityCalculatorPage() {
  const [selector, setSelector] = useState('#main .post h2.title');
  const [compareSelector, setCompareSelector] = useState('.post h2');
  const [showCompare, setShowCompare] = useState(false);

  const spec = useMemo(() => parseSpecificity(selector), [selector]);
  const compareSpec = useMemo(() => parseSpecificity(compareSelector), [compareSelector]);

  const handlePreset = useCallback((sel: string) => {
    setSelector(sel);
  }, []);

  const winner = useMemo(() => {
    if (spec.score > compareSpec.score) return 'first';
    if (compareSpec.score > spec.score) return 'second';
    return 'tie';
  }, [spec.score, compareSpec.score]);

  return (
    <ToolLayout
      title="CSS Specificity Calculator"
      description="Instantly calculate and visualize the specificity of any CSS selector. Compare selectors to understand which rule wins."
      controls={
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" />
          <span className="text-xs text-slate-400">
            ID weight: {ID_WEIGHT} &middot; Class/Attr/Pseudo: {CLASS_WEIGHT} &middot; Element/Pseudo-el: {ELEMENT_WEIGHT}
          </span>
        </div>
      }
    >
      {/* Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          CSS Selector
        </label>
        <input
          type="text"
          value={selector}
          onChange={e => setSelector(e.target.value)}
          placeholder="e.g., #main .post h2.title"
          className="w-full px-4 py-3 rounded-lg bg-surface border border-slate-600 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors placeholder:text-slate-500"
        />
      </div>

      {/* Main result */}
      <div className="mb-8">
        <ScoreCard specificity={spec} />
      </div>

      {/* Compare mode */}
      <div className="mb-8">
        {!showCompare ? (
          <button
            onClick={() => setShowCompare(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-medium hover:bg-brand-500/20 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Compare with another selector
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Selector Comparison</h3>
              <button
                onClick={() => setShowCompare(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Hide comparison
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={compareSelector}
                onChange={e => setCompareSelector(e.target.value)}
                placeholder="e.g., .post h2"
                className="w-full px-4 py-3 rounded-lg bg-surface border border-slate-600 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <ScoreCard specificity={spec} label="Selector 1" />
              <ScoreCard specificity={compareSpec} label="Selector 2" />
            </div>

            {/* Winner badge */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20 text-center">
              {winner === 'first' && (
                <div className="flex items-center justify-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">
                    Selector 1 wins — specificity {spec.score} &gt; {compareSpec.score}
                  </span>
                </div>
              )}
              {winner === 'second' && (
                <div className="flex items-center justify-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">
                    Selector 2 wins — specificity {compareSpec.score} &gt; {spec.score}
                  </span>
                </div>
              )}
              {winner === 'tie' && (
                <div className="flex items-center justify-center gap-2">
                  <HelpCircle className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-400">
                    Equal specificity ({spec.score}) — the last rule in source order wins
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="mb-8">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          Common Selectors
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.selector}
              onClick={() => handlePreset(p.selector)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                selector === p.selector
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                  : 'bg-surface-light border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <span className="text-slate-500 text-[10px] mr-1.5">{p.label}</span>
              {p.selector}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-8 p-5 rounded-xl bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">How Specificity Works</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          Specificity is a weight applied to CSS declarations, determined by the number of each
          selector type in the matching selector. It&apos;s calculated as a three-part value:
          <span className="font-mono text-slate-300"> (IDs, Classes, Elements)</span>.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
            <div>
              <span className="text-slate-300 font-medium">IDs</span>
              <span className="text-slate-500"> — each ID adds </span>
              <code className="text-xs bg-surface px-1.5 py-0.5 rounded text-slate-300">{ID_WEIGHT}</code>
              <span className="text-slate-500"> to the score</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 shrink-0" />
            <div>
              <span className="text-slate-300 font-medium">Classes, Attributes, Pseudo-classes</span>
              <span className="text-slate-500"> — each adds </span>
              <code className="text-xs bg-surface px-1.5 py-0.5 rounded text-slate-300">{CLASS_WEIGHT}</code>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0" />
            <div>
              <span className="text-slate-300 font-medium">Elements, Pseudo-elements</span>
              <span className="text-slate-500"> — each adds </span>
              <code className="text-xs bg-surface px-1.5 py-0.5 rounded text-slate-300">{ELEMENT_WEIGHT}</code>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-300">
            <strong>Note:</strong> The universal selector (<code className="text-xs bg-surface px-1 py-0.5 rounded">*</code>),
            combinators (<code className="text-xs bg-surface px-1 py-0.5 rounded">&gt;</code>,{' '}
            <code className="text-xs bg-surface px-1 py-0.5 rounded">+</code>,{' '}
            <code className="text-xs bg-surface px-1 py-0.5 rounded">~</code>,{' '}
            <code className="text-xs bg-surface px-1 py-0.5 rounded"> </code>), and{' '}
            <code className="text-xs bg-surface px-1 py-0.5 rounded">:where()</code> add no specificity.
            <code className="text-xs bg-surface px-1 py-0.5 rounded">:not()</code> and{' '}
            <code className="text-xs bg-surface px-1 py-0.5 rounded">:is()</code> take the
            specificity of their most specific argument.
          </p>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Reference</h3>
        <div className="overflow-hidden rounded-xl border border-slate-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-light">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Selector
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  IDs
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Classes
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Elements
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Score
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {REFERENCE.map(ref => {
                const score = ref.ids * ID_WEIGHT + ref.classes * CLASS_WEIGHT + ref.elements * ELEMENT_WEIGHT;
                return (
                  <tr key={ref.selector} className="hover:bg-surface-light/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <code className="text-xs text-slate-200 font-mono">{ref.selector}</code>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-mono text-slate-400">{ref.ids}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-mono text-slate-400">{ref.classes}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-mono text-slate-400">{ref.elements}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-mono text-brand-400 font-semibold">{score}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{ref.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ToolLayout>
  );
}
