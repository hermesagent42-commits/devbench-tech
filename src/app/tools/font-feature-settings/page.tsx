'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, EyeOff, Type } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface FeatureDef {
  key: string;
  tag: string;
  label: string;
  description: string;
  defaultOn: boolean;
  category: 'ligatures' | 'numbers' | 'letters' | 'styles' | 'positional';
}

interface Preset {
  name: string;
  description: string;
  features: Record<string, boolean>;
  sampleText: string;
}

// ── Feature definitions ────────────────────────────────────────────────────

const FEATURES: FeatureDef[] = [
  // Ligatures
  { key: 'liga', tag: 'liga', label: 'Standard Ligatures', description: 'Automatic ligatures like fi, fl, ffi', defaultOn: true, category: 'ligatures' },
  { key: 'dlig', tag: 'dlig', label: 'Discretionary Ligatures', description: 'Decorative ligatures like st, ct, sp', defaultOn: false, category: 'ligatures' },
  { key: 'clig', tag: 'clig', label: 'Contextual Ligatures', description: 'Context-sensitive ligature substitutions', defaultOn: true, category: 'ligatures' },
  { key: 'hlig', tag: 'hlig', label: 'Historical Ligatures', description: 'Archaic ligatures (long s forms)', defaultOn: false, category: 'ligatures' },

  // Numbers
  { key: 'tnum', tag: 'tnum', label: 'Tabular Numbers', description: 'Monospaced digits for table alignment', defaultOn: false, category: 'numbers' },
  { key: 'pnum', tag: 'pnum', label: 'Proportional Numbers', description: 'Variable-width digits', defaultOn: true, category: 'numbers' },
  { key: 'onum', tag: 'onum', label: 'Oldstyle Figures', description: 'Ascending/descending digits (like lowercase)', defaultOn: false, category: 'numbers' },
  { key: 'lnum', tag: 'lnum', label: 'Lining Figures', description: 'All digits align on baseline', defaultOn: true, category: 'numbers' },
  { key: 'zero', tag: 'zero', label: 'Slashed Zero', description: 'Zero with a slash to distinguish from O', defaultOn: false, category: 'numbers' },
  { key: 'frac', tag: 'frac', label: 'Fractions', description: 'Automatic fraction formatting (1/2 → ½)', defaultOn: false, category: 'numbers' },

  // Letters
  { key: 'smcp', tag: 'smcp', label: 'Small Caps', description: 'Lowercase → small capital letters', defaultOn: false, category: 'letters' },
  { key: 'c2sc', tag: 'c2sc', label: 'Caps to Small Caps', description: 'Uppercase → small capital letters', defaultOn: false, category: 'letters' },
  { key: 'unic', tag: 'unic', label: 'Unicase', description: 'Mixed-case design with uniform height', defaultOn: false, category: 'letters' },
  { key: 'calt', tag: 'calt', label: 'Contextual Alternates', description: 'Context-sensitive glyph alternates', defaultOn: true, category: 'letters' },
  { key: 'rand', tag: 'rand', label: 'Randomize', description: 'Random glyph variants (supported by few fonts)', defaultOn: false, category: 'letters' },

  // Stylistic sets
  { key: 'ss01', tag: 'ss01', label: 'Stylistic Set 01', description: 'Alternate glyph set #1 (font-specific)', defaultOn: false, category: 'styles' },
  { key: 'ss02', tag: 'ss02', label: 'Stylistic Set 02', description: 'Alternate glyph set #2 (font-specific)', defaultOn: false, category: 'styles' },
  { key: 'ss03', tag: 'ss03', label: 'Stylistic Set 03', description: 'Alternate glyph set #3 (font-specific)', defaultOn: false, category: 'styles' },
  { key: 'ss04', tag: 'ss04', label: 'Stylistic Set 04', description: 'Alternate glyph set #4 (font-specific)', defaultOn: false, category: 'styles' },
  { key: 'ss05', tag: 'ss05', label: 'Stylistic Set 05', description: 'Alternate glyph set #5 (font-specific)', defaultOn: false, category: 'styles' },
  { key: 'swsh', tag: 'swsh', label: 'Swash', description: 'Decorative swash variants on capitals', defaultOn: false, category: 'styles' },
  { key: 'hist', tag: 'hist', label: 'Historical Forms', description: 'Archaic glyph variants', defaultOn: false, category: 'styles' },
  { key: 'salt', tag: 'salt', label: 'Stylistic Alternates', description: 'General alternate glyph forms', defaultOn: false, category: 'styles' },

  // Positional
  { key: 'sups', tag: 'sups', label: 'Superscript', description: 'Raised glyphs (e.g., 1st, x²)', defaultOn: false, category: 'positional' },
  { key: 'subs', tag: 'subs', label: 'Subscript', description: 'Lowered glyphs (e.g., H₂O)', defaultOn: false, category: 'positional' },
  { key: 'ordn', tag: 'ordn', label: 'Ordinals', description: 'Ordinal indicators (1st, 2nd, 3rd)', defaultOn: false, category: 'positional' },
  { key: 'case', tag: 'case', label: 'Case-Sensitive Forms', description: 'Adjusted punctuation for all-caps', defaultOn: false, category: 'positional' },
];

// ── Categories ──────────────────────────────────────────────────────────────

const CATEGORIES: { key: FeatureDef['category']; label: string; description: string }[] = [
  { key: 'ligatures', label: 'Ligatures', description: 'Glyph combinations that replace individual letter pairs' },
  { key: 'numbers', label: 'Number Styles', description: 'Digit formatting, alignment, and figure styles' },
  { key: 'letters', label: 'Letter Variants', description: 'Small caps, unicase, contextual alternates' },
  { key: 'styles', label: 'Stylistic Sets', description: 'Font-specific alternate glyph sets and swashes' },
  { key: 'positional', label: 'Positional Variants', description: 'Superscript, subscript, and case-sensitive forms' },
];

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Default Text',
    description: 'Standard ligatures and contextual alternates — the default for most browsers',
    features: {},
    sampleText: 'The quick brown fox jumps over the lazy dog. 1st, 2nd, 3rd — 0123456789. ff fi fl ffi ffl st ct.',
  },
  {
    name: 'Data Table Ready',
    description: 'Tabular numbers + slashed zero — perfect for financial tables and code',
    features: { tnum: true, zero: true, lnum: true },
    sampleText: '| $1,234.50 | $56,789.00 | $0.99 |\n| $3,333.33 | $44,444.00 | $10.00 |\n| $2,222.22 | $987,654.00 | $5.50 |',
  },
  {
    name: 'Elegant Editorial',
    description: 'Oldstyle figures + discretionary ligatures + small caps — book-like typography',
    features: { onum: true, dlig: true, smcp: true, pnum: true },
    sampleText: 'CHAPTER ONE: The First Fleet\n\nIn the year 1588, a fleet of 132 ships sailed into the Channel. The finest officers of the Spanish Armada had prepared for this moment since childhood.\n\n"Fire!" cried Captain Alvarez. The first shot echoed across the water at exactly 3:47 PM.',
  },
  {
    name: 'Decorative Heading',
    description: 'Swash capitals + discretionary ligatures + stylistic alternates — ornate display text',
    features: { swsh: true, dlig: true, salt: true, ss01: true },
    sampleText: 'Wedding Invitation\nSaturday, the Fourteenth of June\nTwo Thousand & Twenty-Six\n\nCordially invites you to celebrate\nan evening of fine dining & dancing',
  },
  {
    name: 'Scientific Notation',
    description: 'Superscript + subscript + fractions — for formulas and measurements',
    features: { sups: true, subs: true, frac: true },
    sampleText: 'E = mc²    H₂O    CO₂ + H₂O → C₆H₁₂O₆ + O₂\n\n1/2 cup + 3/4 cup = 1 1/4 cups\nx² + y² = r²    42nd annual meeting',
  },
  {
    name: 'Historical Manuscript',
    description: 'Historical ligatures + historical forms + oldstyle — antique look',
    features: { hlig: true, hist: true, onum: true },
    sampleText: 'To the Right Honourable the Lords Spiritual and Temporal in Parliament assembled.\n\nThe humble Petition of the Citizens of London,\nSheweth, That your Petitioners have long suffered under the weight of excessive taxation.',
  },
  {
    name: 'Classy Caps',
    description: 'Small caps + case-sensitive punctuation — refined all-caps typography',
    features: { c2sc: true, case: true, smcp: true },
    sampleText: 'THE ANNUAL REPORT OF THE SOCIETY\nFOR THE ADVANCEMENT OF TYPOGRAPHY\n(ESTABLISHED 1847)\n\n"Our mission is clear: to elevate the craft of the written word."',
  },
  {
    name: 'All Features On',
    description: 'Every feature enabled — see what your font supports!',
    features: Object.fromEntries(FEATURES.filter(f => !['pnum','lnum'].includes(f.key)).map(f => [f.key, true])),
    sampleText: 'The quick brown fox jumps over the lazy dog. 1st, 2nd, 3rd — 0123456789. ff fi fl ffi ffl st ct. H₂O, x². (C)2026.',
  },
];

// ── Font suggestions ───────────────────────────────────────────────────────

const FONT_SUGGESTIONS = [
  { name: 'Inter (system)', css: "'Inter', system-ui, sans-serif", hasFeatures: 'liga, tnum, zero, salt, ss01-ss03, case, frac' },
  { name: 'Georgia (system)', css: "Georgia, 'Times New Roman', serif", hasFeatures: 'liga, dlig, onum, smcp, sups, subs, frac' },
  { name: 'EB Garamond', css: "'EB Garamond', Georgia, serif", hasFeatures: 'liga, dlig, hlig, onum, smcp, swsh, hist, sups, subs' },
  { name: 'Fira Code', css: "'Fira Code', 'Cascadia Code', monospace", hasFeatures: 'liga, dlig, calt, zero' },
  { name: 'Playfair Display', css: "'Playfair Display', Georgia, serif", hasFeatures: 'liga, dlig, smcp, swsh, onum, tnum' },
  { name: 'Lato', css: "'Lato', system-ui, sans-serif", hasFeatures: 'liga, tnum, onum, smcp' },
  { name: 'Source Serif 4', css: "'Source Serif 4', Georgia, serif", hasFeatures: 'liga, dlig, onum, tnum, smcp, sups, subs, frac, ordn, case, zero' },
  { name: 'Recursive', css: "'Recursive', system-ui, sans-serif", hasFeatures: 'liga, dlig, tnum, onum, zero, smcp, ss01-ss05, case' },
];

// ── Build CSS ───────────────────────────────────────────────────────────────

function buildFontFeatureSettings(features: Record<string, boolean>): string {
  const onFeatures: string[] = [];
  const offFeatures: string[] = [];

  for (const f of FEATURES) {
    const isOn = features[f.key] ?? f.defaultOn;
    if (isOn !== f.defaultOn) {
      if (isOn) {
        onFeatures.push(`"${f.tag}" 1`);
      } else {
        offFeatures.push(`"${f.tag}" 0`);
      }
    }
  }

  // If nothing changed from defaults, return 'normal'
  const allChanges = [...onFeatures, ...offFeatures];
  if (allChanges.length === 0) return 'normal';

  // Group: explicit ons first, then explicit offs
  return allChanges.join(', ');
}

function buildCssBlock(features: Record<string, boolean>, fontFamily: string, sampleText: string): string {
  const ff = buildFontFeatureSettings(features);
  if (ff === 'normal') {
    return `/* Using default browser font-feature-settings */
font-family: ${fontFamily};`;
  }

  return `.sample-text {
  font-family: ${fontFamily};
  font-feature-settings: ${ff};
  -webkit-font-feature-settings: ${ff};
  -moz-font-feature-settings: ${ff};
}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function FontFeatureSettingsPlaygroundPage() {
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const f of FEATURES) initial[f.key] = f.defaultOn;
    return initial;
  });
  const [sampleText, setSampleText] = useState(
    'The quick brown fox jumps over the lazy dog.\n1st, 2nd, 3rd — 0123456789\nff fi fl ffi ffl st ct sp\nH₂O  E=mc²  1/2 + 3/4 = 1¼\n\nHello, World! Welcome to fine typography.'
  );
  const [fontFamily, setFontFamily] = useState("Georgia, 'Times New Roman', serif");
  const [activeCategory, setActiveCategory] = useState<FeatureDef['category'] | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hidePreview, setHidePreview] = useState(false);

  const toggle = useCallback((key: string) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    const newFeatures: Record<string, boolean> = {};
    for (const f of FEATURES) {
      newFeatures[f.key] = preset.features[f.key] ?? f.defaultOn;
    }
    setFeatures(newFeatures);
    setSampleText(preset.sampleText);
    toast.success(`Applied: ${preset.name}`);
  }, []);

  const reset = useCallback(() => {
    const defaults: Record<string, boolean> = {};
    for (const f of FEATURES) defaults[f.key] = f.defaultOn;
    setFeatures(defaults);
    toast.success('Reset to browser defaults');
  }, []);

  const copyCss = useCallback(() => {
    const css = buildCssBlock(features, fontFamily, sampleText);
    navigator.clipboard.writeText(css);
    toast.success('CSS copied!');
  }, [features, fontFamily, sampleText]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const fontFeatureSettingsValue = buildFontFeatureSettings(features);
  const isDefault = fontFeatureSettingsValue === 'normal';

  // Count how many features are different from defaults
  const changedCount = FEATURES.filter(f => (features[f.key] ?? f.defaultOn) !== f.defaultOn).length;

  const filteredFeatures = activeCategory === 'all'
    ? FEATURES
    : FEATURES.filter(f => f.category === activeCategory);

  return (
    <ToolLayout
      title="CSS Font Feature Settings Playground"
      description="Explore OpenType font features — ligatures, number styles, small caps, stylistic sets, and more. See what your fonts can do, visually toggle features, and copy the resulting CSS."
      controls={
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={() => setHidePreview(p => !p)}
            className="px-3 py-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
          >
            {hidePreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {hidePreview ? 'Show' : 'Hide'} Preview
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Presets ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-400" />
            Quick Presets
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="text-left p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-brand-500/30 hover:bg-slate-700/50 transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-brand-400 transition-colors">
                  {preset.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Font picker & text input ────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Font Family</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {FONT_SUGGESTIONS.map(font => (
                <button
                  key={font.name}
                  onClick={() => setFontFamily(font.css)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    fontFamily === font.css
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:border-slate-600'
                  }`}
                  title={`Supports: ${font.hasFeatures}`}
                >
                  {font.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:border-brand-500/50 focus:outline-none"
              placeholder="e.g. 'Georgia', serif"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Preview Text
            </label>
            <textarea
              value={sampleText}
              onChange={e => setSampleText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:border-brand-500/50 focus:outline-none resize-y"
              rows={4}
              placeholder="Type or paste text to preview..."
            />
          </div>
        </div>

        {/* ── Feature toggles ─────────────────────────────────────────── */}
        <div>
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:border-slate-600'
              }`}
            >
              All ({changedCount} changed)
            </button>
            {CATEGORIES.map(cat => {
              const catChanged = FEATURES.filter(
                f => f.category === cat.key && (features[f.key] ?? f.defaultOn) !== f.defaultOn
              ).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  {cat.label}
                  {catChanged > 0 && (
                    <span className="ml-1 px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px]">
                      {catChanged}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feature grid */}
          <div className="card p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredFeatures.map(feature => {
                const isOn = features[feature.key] ?? feature.defaultOn;
                const isChanged = isOn !== feature.defaultOn;
                return (
                  <button
                    key={feature.key}
                    onClick={() => toggle(feature.key)}
                    className={`text-left p-3 rounded-lg border transition-all group ${
                      isOn
                        ? 'bg-brand-500/10 border-brand-500/30 hover:border-brand-500/50'
                        : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-600 text-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={`text-xs font-semibold ${isOn ? 'text-brand-300' : 'text-slate-500'}`}>
                          {feature.label}
                          {feature.defaultOn && (
                            <span className="ml-1.5 text-[10px] text-slate-600 font-normal">
                              (default on)
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] mt-0.5 leading-tight ${isOn ? 'text-slate-400' : 'text-slate-600'}`}>
                          {feature.description}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 transition-colors ${
                          isOn
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-700 text-slate-500'
                        }`}
                      >
                        {isOn ? 'ON' : 'OFF'}
                      </div>
                    </div>
                    {isChanged && (
                      <div className="mt-1.5 text-[10px] text-amber-400 font-medium">
                        Changed from default
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Live Preview ────────────────────────────────────────────── */}
        {!hidePreview && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Live Preview
            </h3>
            <div
              className="p-5 rounded-lg bg-slate-900 border border-slate-700 min-h-[120px] whitespace-pre-wrap leading-relaxed text-slate-200"
              style={{
                fontFamily: fontFamily,
                fontFeatureSettings: fontFeatureSettingsValue,
                WebkitFontFeatureSettings: fontFeatureSettingsValue,
                MozFontFeatureSettings: fontFeatureSettingsValue,
                fontSize: '18px',
                lineHeight: 1.6,
              }}
            >
              {sampleText}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-600 font-mono">
                font-size: 18px; line-height: 1.6;
              </span>
              {fontFeatureSettingsValue !== 'normal' && (
                <span className="text-[10px] text-brand-400 font-mono">
                  font-feature-settings: {fontFeatureSettingsValue};
                </span>
              )}
              {fontFeatureSettingsValue === 'normal' && (
                <span className="text-[10px] text-slate-500 font-mono">
                  font-feature-settings: normal (browser defaults)
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Generated CSS ───────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Copy className="w-4 h-4 text-brand-400" />
              Generated CSS
            </h3>
            <button
              onClick={copyCss}
              className="px-3 py-1.5 rounded-md bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
          </div>
          <pre className="bg-slate-950 rounded-lg p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed border border-slate-800">
            {buildCssBlock(features, fontFamily, sampleText)}
          </pre>
          {isDefault && (
            <p className="mt-2 text-xs text-slate-500">
              💡 All features are at their browser defaults — try toggling some checkboxes to see the CSS change.
            </p>
          )}
        </div>

        {/* ── Feature Reference Table ─────────────────────────────────── */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-400" />
            OpenType Feature Reference
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/70">
                  <th className="text-left py-2 px-2 text-slate-400 font-semibold">Tag</th>
                  <th className="text-left py-2 px-2 text-slate-400 font-semibold">Feature</th>
                  <th className="text-left py-2 px-2 text-slate-400 font-semibold">Category</th>
                  <th className="text-left py-2 px-2 text-slate-400 font-semibold hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(f => (
                  <tr key={f.key} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-1.5 px-2 font-mono text-brand-400">{f.tag}</td>
                    <td className="py-1.5 px-2 text-slate-300">{f.label}</td>
                    <td className="py-1.5 px-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-400">
                        {CATEGORIES.find(c => c.key === f.category)?.label || f.category}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 hidden sm:table-cell">{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Browser Support Note ────────────────────────────────────── */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 text-xs text-slate-500">
          <strong className="text-amber-400">⚠️ Font-Dependent:</strong> Many features require a font that supports them.
          Georgia, EB Garamond, Source Serif, and Fira Code have rich OpenType feature sets.
          System fonts like Arial and Helvetica support only basic ligatures. Results vary by font and browser.
        </div>
      </div>
    </ToolLayout>
  );
}
