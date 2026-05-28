'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Play, Eye, Plus, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface CounterStyle {
  id: number;
  name: string;
  system: 'cyclic' | 'fixed' | 'symbolic' | 'alphabetic' | 'numeric' | 'additive' | 'extends';
  symbols: string;
  additiveSymbols: string;
  suffix: string;
  prefix: string;
  pad: string;
  negative: string;
  range: string;
  fallback: string;
  speakAs: string;
  extendsName: string;
}

const SYSTEMS = [
  { value: 'cyclic', label: 'Cyclic — cycle through symbols repeatedly', example: '★ → ★, ★, ★ for all values (symbols cycled)' },
  { value: 'fixed', label: 'Fixed — one symbol per value, fallback after', example: '① ② → ①, ②, 3, 4 (fallback to decimal)' },
  { value: 'symbolic', label: 'Symbolic — repeat symbol for magnitude', example: '* → *, **, *** (repeats like footnote markers)' },
  { value: 'alphabetic', label: 'Alphabetic — positional system (like letters)', example: 'A → A, B, C, …, Z, AA, AB' },
  { value: 'numeric', label: 'Numeric — positional with zero (like decimal)', example: '0-9 → 1, 2, …, 9, 10, 11' },
  { value: 'additive', label: 'Additive — sum of weighted symbols', example: '50=L, 10=X, 1=I → I, II, …, L' },
  { value: 'extends', label: 'Extends — inherit from existing counter', example: 'Extend decimal with different suffix' },
];

const SPEAK_AS_OPTIONS = [
  { value: 'auto', label: 'Auto (browser default)' },
  { value: 'bullets', label: 'Bullets — read as unordered list' },
  { value: 'numbers', label: 'Numbers — read numeric value' },
  { value: 'words', label: 'Words — spell as words' },
  { value: 'spell-out', label: 'Spell Out — read letter by letter' },
];

type Preset = {
  label: string;
  config: Omit<CounterStyle, 'id'>;
};

const PRESETS: Preset[] = [
  {
    label: '★ Star Ratings',
    config: {
      name: 'star-rating',
      system: 'cyclic',
      symbols: '\\2605  \\2606',
      additiveSymbols: '',
      suffix: ' ',
      prefix: '',
      pad: '',
      negative: '',
      range: '',
      fallback: '',
      speakAs: 'bullets',
      extendsName: '',
    },
  },
  {
    label: '⓵ Circled Numbers',
    config: {
      name: 'circled-numbers',
      system: 'fixed',
      symbols: '\\24F5  \\24F6  \\24F7  \\24F8  \\24F9  \\24FA  \\24FB  \\24FC  \\24FD  \\24FE',
      additiveSymbols: '',
      suffix: ' ',
      prefix: '',
      pad: '',
      negative: '',
      range: '',
      fallback: '',
      speakAs: 'numbers',
      extendsName: '',
    },
  },
  {
    label: 'Footnote Markers (*, †, ‡)',
    config: {
      name: 'footnote-symbolic',
      system: 'symbolic',
      symbols: '\\002A  \\2020  \\2021  \\00A7  \\00B6',
      additiveSymbols: '',
      suffix: ' ',
      prefix: '',
      pad: '',
      negative: '',
      range: '',
      fallback: '',
      speakAs: 'bullets',
      extendsName: '',
    },
  },
  {
    label: 'A-Z / AA-ZZ Alpha',
    config: {
      name: 'upper-alpha-ext',
      system: 'alphabetic',
      symbols: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
      additiveSymbols: '',
      suffix: '. ',
      prefix: '',
      pad: '',
      negative: '',
      range: '',
      fallback: '',
      speakAs: 'spell-out',
      extendsName: '',
    },
  },
  {
    label: 'Hex Numbers (0-F)',
    config: {
      name: 'hex-counter',
      system: 'numeric',
      symbols: '0 1 2 3 4 5 6 7 8 9 A B C D E F',
      additiveSymbols: '',
      suffix: ') ',
      prefix: '',
      pad: '2 "0"',
      negative: '',
      range: '',
      fallback: '',
      speakAs: 'numbers',
      extendsName: '',
    },
  },
  {
    label: 'Roman Numerals (I, II, III...)',
    config: {
      name: 'roman-additive',
      system: 'additive',
      symbols: '',
      additiveSymbols: '1000 M, 900 CM, 500 D, 400 CD, 100 C, 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 I',
      suffix: '. ',
      prefix: '',
      pad: '',
      negative: '',
      range: '1 3999',
      fallback: '',
      speakAs: 'numbers',
      extendsName: '',
    },
  },
  {
    label: '😀 Emoji Counters',
    config: {
      name: 'emoji-counter',
      system: 'cyclic',
      symbols: '\\01F600  \\01F60E  \\01F92F  \\01F525  \\01F44D  \\01F389  \\01F4A1  \\02B50',
      additiveSymbols: '',
      suffix: ' ',
      prefix: '',
      pad: '',
      negative: '',
      range: '',
      fallback: '',
      speakAs: 'bullets',
      extendsName: '',
    },
  },
  {
    label: 'Bullet Hierarchy',
    config: {
      name: 'bullet-hierarchy',
      system: 'fixed',
      symbols: '\\25C9  \\25CB  \\25A0  \\25A1  \\25B6  \\25B7  \\2726  \\2727',
      additiveSymbols: '',
      suffix: ' ',
      prefix: '',
      pad: '',
      negative: '',
      range: '',
      fallback: '',
      speakAs: 'bullets',
      extendsName: '',
    },
  },
];

let nextId = 1;

function createStyle(): CounterStyle {
  return {
    id: nextId++,
    name: '',
    system: 'cyclic',
    symbols: '',
    additiveSymbols: '',
    suffix: ' ',
    prefix: '',
    pad: '',
    negative: '',
    range: '',
    fallback: '',
    speakAs: 'auto',
    extendsName: '',
  };
}

function generateCounterCSS(style: CounterStyle): string {
  if (!style.name.trim()) return '/* Name your counter style above to see CSS */';

  let css = `@counter-style ${style.name.trim()} {\n`;
  css += `  system: ${style.system}`;

  if (style.system === 'extends') {
    css += ` ${style.extendsName.trim() || 'decimal'}`;
  }
  css += ';\n';

  if (style.system === 'additive') {
    if (style.additiveSymbols.trim()) {
      css += `  additive-symbols: ${style.additiveSymbols.trim()};\n`;
    }
  } else if (style.system !== 'extends') {
    if (style.symbols.trim()) {
      css += `  symbols: ${style.symbols.trim()};\n`;
    }
  }

  if (style.suffix) css += `  suffix: "${style.suffix.replace(/"/g, '\\"')}";\n`;
  if (style.prefix) css += `  prefix: "${style.prefix.replace(/"/g, '\\"')}";\n`;
  if (style.pad) css += `  pad: ${style.pad};\n`;
  if (style.negative) css += `  negative: "${style.negative.replace(/"/g, '\\"')}";\n`;
  if (style.range) css += `  range: ${style.range};\n`;
  if (style.fallback) css += `  fallback: ${style.fallback.trim()};\n`;
  if (style.speakAs && style.speakAs !== 'auto') css += `  speak-as: ${style.speakAs};\n`;

  css += '}';
  return css;
}

function generateUsageCSS(style: CounterStyle): string {
  if (!style.name.trim()) return '';
  return `ol.custom-list {
  list-style: ${style.name.trim()};
}

/* Or per-element: */
li.special {
  list-style-type: ${style.name.trim()};
}`;
}

export default function CSSCounterStylePlayground() {
  const [styles, setStyles] = useState<CounterStyle[]>([{ ...PRESETS[0].config, id: nextId++ }]);
  const [activeStyleId, setActiveStyleId] = useState<number>(styles[0]?.id || 0);
  const [previewCount, setPreviewCount] = useState(15);
  const [showCSS, setShowCSS] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const activeStyle = styles.find((s) => s.id === activeStyleId) || styles[0];

  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'counter-style-preview';
      document.head.appendChild(styleRef.current);
    }

    const cssParts: string[] = [];
    for (const s of styles) {
      if (!s.name.trim()) continue;
      const counterCSS = generateCounterCSS(s);
      cssParts.push(counterCSS);
    }

    if (activeStyle?.name.trim()) {
      cssParts.push(`.counter-preview-list { list-style: ${activeStyle.name.trim()}; }`);
    }

    styleRef.current.textContent = cssParts.join('\n\n');

    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [styles, activeStyle]);

  const updateStyle = useCallback(
    (field: keyof CounterStyle, value: string | 'cyclic' | 'fixed' | 'symbolic' | 'alphabetic' | 'numeric' | 'additive' | 'extends') => {
      setStyles((prev) =>
        prev.map((s) => (s.id === activeStyleId ? { ...s, [field]: value } : s))
      );
    },
    [activeStyleId]
  );

  const addStyle = useCallback(() => {
    const newStyle = createStyle();
    setStyles((prev) => [...prev, newStyle]);
    setActiveStyleId(newStyle.id);
  }, []);

  const removeStyle = useCallback(
    (id: number) => {
      setStyles((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          const fallback = createStyle();
          setActiveStyleId(fallback.id);
          return [fallback];
        }
        if (activeStyleId === id) {
          setActiveStyleId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeStyleId]
  );

  const applyPreset = useCallback((preset: Preset) => {
    setStyles((prev) =>
      prev.map((s) => (s.id === activeStyleId ? { ...preset.config, id: s.id } : s))
    );
    setShowPresets(false);
  }, [activeStyleId]);

  const copyCSS = useCallback(() => {
    const css = generateCounterCSS(activeStyle);
    navigator.clipboard.writeText(css).then(() => {
      toast.success('CSS copied!');
    });
  }, [activeStyle]);

  const copyUsage = useCallback(() => {
    const css = generateUsageCSS(activeStyle);
    navigator.clipboard.writeText(css).then(() => {
      toast.success('Usage CSS copied!');
    });
  }, [activeStyle]);

  const resetStyle = useCallback(() => {
    setStyles((prev) =>
      prev.map((s) => (s.id === activeStyleId ? { ...createStyle(), id: s.id } : s))
    );
  }, [activeStyleId]);

  if (!activeStyle) return null;

  const counterCSS = generateCounterCSS(activeStyle);
  const usageCSS = generateUsageCSS(activeStyle);

  return (
    <ToolLayout
      title="CSS @counter-style Playground"
      description="Define custom list counters visually — star ratings, circled numbers, roman numerals, emoji bullets, and more. Live preview and generated CSS with zero dependencies."
      controls={
        <div className="flex items-center gap-2 flex-wrap w-full">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {styles.map((s) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => setActiveStyleId(s.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    s.id === activeStyleId
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {s.name || `Style ${s.id}`}
                </button>
                {styles.length > 1 && (
                  <button
                    onClick={() => removeStyle(s.id)}
                    className="ml-0.5 p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove style"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addStyle}
            className="px-2 py-1.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-3 space-y-5">
          {/* Presets */}
          <div>
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 mb-2 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
              Presets ({PRESETS.length})
            </button>
            {showPresets && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className="text-left px-3 py-2 rounded bg-slate-800/50 border border-slate-700 hover:border-brand-500/50 text-xs text-slate-300 hover:text-slate-100 transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Counter Name</label>
            <input
              type="text"
              value={activeStyle.name}
              onChange={(e) => updateStyle('name', e.target.value)}
              placeholder="e.g. star-rating"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50"
            />
          </div>

          {/* System */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">System</label>
            <select
              value={activeStyle.system}
              onChange={(e) => updateStyle('system', e.target.value as CounterStyle['system'])}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50"
            >
              {SYSTEMS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Symbols */}
          {activeStyle.system !== 'extends' && activeStyle.system !== 'additive' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Symbols{' '}
                <span className="text-slate-500">
                  (space-separated, use \hhhh for Unicode)
                </span>
              </label>
              <textarea
                value={activeStyle.symbols}
                onChange={(e) => updateStyle('symbols', e.target.value)}
                placeholder={activeStyle.system === 'numeric' ? '0 1 2 3 4 5 6 7 8 9' : '\\2605  \\2606'}
                rows={2}
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Tip: Use Unicode escapes like \2605 for ★, or paste emoji directly: 😀 🔥 ⭐
              </p>
            </div>
          )}

          {/* Additive Symbols */}
          {activeStyle.system === 'additive' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Additive Symbols{' '}
                <span className="text-slate-500">
                  (weight symbol, comma-separated)
                </span>
              </label>
              <textarea
                value={activeStyle.additiveSymbols}
                onChange={(e) => updateStyle('additiveSymbols', e.target.value)}
                placeholder="1000 M, 900 CM, 500 D, 400 CD, 100 C, 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 I"
                rows={3}
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
          )}

          {/* Extends */}
          {activeStyle.system === 'extends' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Extends (base counter style)</label>
              <input
                type="text"
                value={activeStyle.extendsName}
                onChange={(e) => updateStyle('extendsName', e.target.value)}
                placeholder="decimal"
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
          )}

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Suffix</label>
              <input
                type="text"
                value={activeStyle.suffix}
                onChange={(e) => updateStyle('suffix', e.target.value)}
                placeholder=". "
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Prefix</label>
              <input
                type="text"
                value={activeStyle.prefix}
                onChange={(e) => updateStyle('prefix', e.target.value)}
                placeholder='e.g. "Chapter "'
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Pad</label>
              <input
                type="text"
                value={activeStyle.pad}
                onChange={(e) => updateStyle('pad', e.target.value)}
                placeholder='e.g. 2 "0" for 01, 02...'
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Range</label>
              <input
                type="text"
                value={activeStyle.range}
                onChange={(e) => updateStyle('range', e.target.value)}
                placeholder="1 infinite"
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Fallback</label>
              <input
                type="text"
                value={activeStyle.fallback}
                onChange={(e) => updateStyle('fallback', e.target.value)}
                placeholder="decimal"
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Speak-As</label>
              <select
                value={activeStyle.speakAs}
                onChange={(e) => updateStyle('speakAs', e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50"
              >
                {SPEAK_AS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Negative */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Negative</label>
            <input
              type="text"
              value={activeStyle.negative}
              onChange={(e) => updateStyle('negative', e.target.value)}
              placeholder='e.g. "(" ")" for (1), (2)...'
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-brand-500/50 font-mono"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={copyCSS}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy CSS
            </button>
            <button
              onClick={copyUsage}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Usage
            </button>
            <button
              onClick={resetStyle}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm font-medium transition-colors flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Preview */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-400" />
                <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Live Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Items:</span>
                <select
                  value={previewCount}
                  onChange={(e) => setPreviewCount(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-slate-700 border border-slate-600 text-slate-200 text-xs focus:outline-none"
                >
                  {[5, 10, 15, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 max-h-[400px] overflow-y-auto">
              <ol className="counter-preview-list space-y-1 pl-6">
                {Array.from({ length: previewCount }, (_, i) => (
                  <li key={i} className="text-sm text-slate-300 leading-relaxed py-0.5">
                    List item #{i + 1}
                  </li>
                ))}
              </ol>
            </div>
            {!activeStyle.name.trim() && (
              <p className="text-xs text-amber-400 mt-2">
                Name your counter style above to see the live preview render.
              </p>
            )}
          </div>

          {/* Generated CSS */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-400" />
                <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Generated CSS</span>
              </div>
              <button
                onClick={() => setShowCSS(!showCSS)}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {showCSS ? 'Hide Usage' : 'Show Usage CSS'}
              </button>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto border border-slate-700/50 whitespace-pre-wrap">
              <code>{counterCSS}</code>
            </pre>

            {showCSS && usageCSS && (
              <div className="mt-3">
                <span className="text-xs font-medium text-slate-400 mb-2 block">Usage:</span>
                <pre className="bg-slate-950 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto border border-slate-700/50 whitespace-pre-wrap">
                  <code>{usageCSS}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="p-3 rounded-lg bg-brand-600/5 border border-brand-500/10">
            <p className="text-xs text-slate-400">
              <strong className="text-brand-400">@counter-style</strong> is part of{' '}
              <a
                href="https://www.w3.org/TR/css-counter-styles-3/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:underline"
              >
                CSS Counter Styles Level 3
              </a>{' '}
              — define custom list markers with cyclic, fixed, symbolic, alphabetic, numeric, additive, and extends systems.
              Firefox has full support; provide a <code className="text-slate-300 bg-slate-800 px-1 rounded">fallback: decimal</code> for cross-browser use.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
