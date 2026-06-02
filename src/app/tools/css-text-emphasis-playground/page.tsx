'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type EmphasisStyle = 'dot' | 'circle' | 'double-circle' | 'triangle' | 'sesame' | 'custom';
type EmphasisFill = 'filled' | 'open';
type EmphasisPosition = 'over' | 'under';

interface EmphasisConfig {
  style: EmphasisStyle;
  fill: EmphasisFill;
  color: string;
  position: EmphasisPosition;
  customChar: string;
  sampleText: string;
}

interface Preset {
  name: string;
  description: string;
  config: Partial<EmphasisConfig>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const FILLED_STYLES: { value: EmphasisStyle; label: string; char: string }[] = [
  { value: 'dot', label: 'Dot', char: '•' },
  { value: 'circle', label: 'Circle', char: '●' },
  { value: 'double-circle', label: 'Double Circle', char: '◉' },
  { value: 'triangle', label: 'Triangle', char: '▲' },
  { value: 'sesame', label: 'Sesame', char: '﹡' },
];

const OPEN_STYLES: { value: EmphasisStyle; label: string; char: string }[] = [
  { value: 'dot', label: 'Open Dot', char: '◦' },
  { value: 'circle', label: 'Open Circle', char: '○' },
  { value: 'double-circle', label: 'Open Double Circle', char: '◎' },
  { value: 'triangle', label: 'Open Triangle', char: '△' },
  { value: 'sesame', label: 'Open Sesame', char: '﹆' },
];

const COLORS = [
  '#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653',
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9',
  '#8b5cf6', '#f43f5e',
];

const SAMPLE_TEXTS = [
  'Emphasis marks draw attention to important text in East Asian typography.',
  'The quick brown fox jumps over the lazy dog.',
  'CSS text-emphasis brings typographic richness to the web.',
  '重要文本 ・ 强调标记 ・ タイポグラフィ',
  'Design with dots, circles, triangles, and sesame marks.',
];

const PRESETS: Preset[] = [
  {
    name: 'Japanese Reading',
    description: 'Traditional filled sesame marks above each character',
    config: { style: 'sesame', fill: 'filled', color: '#264653', position: 'over', sampleText: '重要なお知らせがあります。よく読んでください。' },
  },
  {
    name: 'Attention Grabber',
    description: 'Red filled dots for maximum impact',
    config: { style: 'dot', fill: 'filled', color: '#e63946', position: 'over', sampleText: 'URGENT: Please review this document immediately.' },
  },
  {
    name: 'Subtle Highlights',
    description: 'Open circles below text for a refined look',
    config: { style: 'circle', fill: 'open', color: '#6366f1', position: 'under', sampleText: 'The gentle emphasis draws your eye without screaming.' },
  },
  {
    name: 'Gold Medals',
    description: 'Gold triangles crowning each character',
    config: { style: 'triangle', fill: 'filled', color: '#f59e0b', position: 'over', sampleText: 'CHAMPIONSHIP WINNERS 2026' },
  },
  {
    name: 'Double Circle Ceremony',
    description: 'Double circle marks for ceremonial emphasis',
    config: { style: 'double-circle', fill: 'filled', color: '#8b5cf6', position: 'over', sampleText: 'Congratulations — you completed the course!' },
  },
  {
    name: 'Ruby Text Style',
    description: 'Open sesame marks above CJK text',
    config: { style: 'sesame', fill: 'open', color: '#2a9d8f', position: 'over', sampleText: '東京では桜が満開です。春の訪れを感じます。' },
  },
  {
    name: 'Underline Companion',
    description: 'Filled dots below for secondary emphasis',
    config: { style: 'dot', fill: 'filled', color: '#10b981', position: 'under', sampleText: 'These key points deserve your full attention.' },
  },
  {
    name: 'Custom Star',
    description: 'Custom character (★) as an emphasis mark',
    config: { style: 'custom', fill: 'filled', color: '#ec4899', position: 'over', customChar: '★', sampleText: 'Five-star reviews from our customers!' },
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CSSTextEmphasisPlayground() {
  const [config, setConfig] = useState<EmphasisConfig>({
    style: 'sesame',
    fill: 'filled',
    color: '#264653',
    position: 'over',
    customChar: '★',
    sampleText: SAMPLE_TEXTS[0],
  });

  const [activePreset, setActivePreset] = useState<string | null>(null);

  const stylesForDisplay = config.fill === 'filled' ? FILLED_STYLES : OPEN_STYLES;
  const currentStyle = stylesForDisplay.find(s => s.value === config.style);

  const buildCssValue = useCallback((): string => {
    const colorPart = config.color || 'currentColor';

    if (config.style === 'custom' && config.customChar) {
      return `${config.customChar} ${colorPart}`;
    }

    const fillPart = config.fill === 'open' ? 'open ' : '';
    return `${fillPart}${config.style} ${colorPart}`;
  }, [config]);

  const cssValue = useMemo(() => buildCssValue(), [buildCssValue]);

  const emphasisStyle: React.CSSProperties = useMemo(() => {
    const style: React.CSSProperties = {
      WebkitTextEmphasis: `${cssValue} ${config.position}`,
      textEmphasis: `${cssValue} ${config.position}`,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans JP", "Noto Sans SC", sans-serif',
    };
    return style;
  }, [cssValue, config.position]);

  const copyCss = useCallback(() => {
    const css = `selector {\n  -webkit-text-emphasis: ${cssValue} ${config.position};\n  text-emphasis: ${cssValue} ${config.position};\n}`;
    navigator.clipboard.writeText(css).then(() => toast.success('CSS copied!'));
  }, [cssValue, config.position]);

  const applyPreset = useCallback((preset: Preset) => {
    setConfig(prev => ({ ...prev, ...preset.config }));
    setActivePreset(preset.name);
  }, []);

  const reset = useCallback(() => {
    setConfig({
      style: 'sesame',
      fill: 'filled',
      color: '#264653',
      position: 'over',
      customChar: '★',
      sampleText: SAMPLE_TEXTS[0],
    });
    setActivePreset(null);
  }, []);

  return (
    <ToolLayout
      title="CSS text-emphasis Playground"
      description="Build and preview text-emphasis marks — dots, circles, triangles, sesame, and custom characters above or below text. A powerful CSS property for East Asian typography and visual emphasis."
    >
      <div className="space-y-8">
        {/* ── Live Preview ── */}
        <div className="bg-surface/60 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Preview</span>
          </div>
          <div className="p-8 md:p-12 flex items-center justify-center min-h-[160px]">
            <p
              className="text-3xl md:text-4xl leading-relaxed text-center text-slate-100 max-w-2xl"
              style={emphasisStyle}
            >
              {config.sampleText || 'Type something...'}
            </p>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Emphasis Style</label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => {
                  setConfig(prev => ({ ...prev, fill: 'filled' }));
                  setActivePreset(null);
                }}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  config.fill === 'filled'
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                }`}
              >
                Filled
              </button>
              <button
                onClick={() => {
                  setConfig(prev => ({ ...prev, fill: 'open' }));
                  setActivePreset(null);
                }}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  config.fill === 'open'
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                }`}
              >
                Open
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {stylesForDisplay.map(s => (
                <button
                  key={s.value}
                  onClick={() => {
                    setConfig(prev => ({ ...prev, style: s.value }));
                    setActivePreset(null);
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                    config.style === s.value
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400 shadow-sm shadow-brand-500/10'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg">{s.char}</span>
                  <span className="text-[10px] leading-tight text-center">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Custom character */}
            <div className="mt-3">
              <button
                onClick={() => {
                  setConfig(prev => ({ ...prev, style: 'custom' }));
                  setActivePreset(null);
                }}
                className={`w-full flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  config.style === 'custom'
                    ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                    : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium">Custom Character</span>
              </button>
              {config.style === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    maxLength={1}
                    value={config.customChar}
                    onChange={e => setConfig(prev => ({ ...prev, customChar: e.target.value || '★' }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 text-center text-xl"
                    placeholder="★"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 text-center">Type any single character</p>
                </div>
              )}
            </div>
          </div>

          {/* Color & Position */}
          <div className="space-y-4">
            {/* Color */}
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Color</label>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="color"
                  value={config.color}
                  onChange={e => {
                    setConfig(prev => ({ ...prev, color: e.target.value }));
                    setActivePreset(null);
                  }}
                  className="w-10 h-10 rounded-lg border border-slate-600/50 cursor-pointer bg-transparent p-1"
                />
                <input
                  type="text"
                  value={config.color}
                  onChange={e => setConfig(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setConfig(prev => ({ ...prev, color: c }));
                      setActivePreset(null);
                    }}
                    className={`w-7 h-7 rounded-md border-2 transition-all ${
                      config.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Position</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfig(prev => ({ ...prev, position: 'over' }));
                    setActivePreset(null);
                  }}
                  className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-all ${
                    config.position === 'over'
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-lg mb-0.5">⬆</div>
                  Over text
                </button>
                <button
                  onClick={() => {
                    setConfig(prev => ({ ...prev, position: 'under' }));
                    setActivePreset(null);
                  }}
                  className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-all ${
                    config.position === 'under'
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-lg mb-0.5">⬇</div>
                  Under text
                </button>
              </div>
            </div>

            {/* Display current style */}
            <div className="bg-slate-800/60 rounded-lg border border-slate-700/50 p-3">
              <div className="text-xs text-slate-500 mb-1">Current emphasis</div>
              <div className="flex items-center gap-2">
                {currentStyle && (
                  <span className="text-xl text-slate-300">{currentStyle.char}</span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  {config.fill === 'filled' ? 'Filled' : 'Open'} {config.style === 'custom' ? `"${config.customChar}"` : config.style} · {config.position}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sample Text ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 block">Sample Text</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SAMPLE_TEXTS.map((text, i) => (
              <button
                key={i}
                onClick={() => setConfig(prev => ({ ...prev, sampleText: text }))}
                className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                  config.sampleText === text
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
          <textarea
            value={config.sampleText}
            onChange={e => setConfig(prev => ({ ...prev, sampleText: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500/50 resize-none h-20 font-sans"
            placeholder="Type your own text to preview..."
          />
        </div>

        {/* ── Presets ── */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Presets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  activePreset === preset.name
                    ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/20'
                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-medium text-slate-200">{preset.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── CSS Output ── */}
        <div className="bg-surface/60 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Generated CSS</span>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-md transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={copyCss}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 rounded-md transition-colors border border-brand-500/30"
              >
                <Copy className="w-3 h-3" />
                Copy CSS
              </button>
            </div>
          </div>
          <div className="p-5">
            <pre className="text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto">
              <code>{`selector {
  -webkit-text-emphasis: ${cssValue} ${config.position};
  text-emphasis: ${cssValue} ${config.position};
}`}</code>
            </pre>
          </div>
        </div>

        {/* ── Reference Table ── */}
        <div className="bg-surface/60 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Quick Reference</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400">Property</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400">Values</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                <tr>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">text-emphasis-style</td>
                  <td className="px-5 py-2.5 text-xs text-slate-400">none | [ filled | open ] || [ dot | circle | double-circle | triangle | sesame ] | &lt;string&gt;</td>
                  <td className="px-5 py-2.5 text-xs text-slate-500">The shape of the emphasis mark</td>
                </tr>
                <tr>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">text-emphasis-color</td>
                  <td className="px-5 py-2.5 text-xs text-slate-400">&lt;color&gt;</td>
                  <td className="px-5 py-2.5 text-xs text-slate-500">Color of the emphasis marks (defaults to currentColor)</td>
                </tr>
                <tr>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">text-emphasis-position</td>
                  <td className="px-5 py-2.5 text-xs text-slate-400">over | under</td>
                  <td className="px-5 py-2.5 text-xs text-slate-500">Placement relative to the text</td>
                </tr>
                <tr>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">text-emphasis (shorthand)</td>
                  <td className="px-5 py-2.5 text-xs text-slate-400">&lt;style&gt; &lt;color&gt;</td>
                  <td className="px-5 py-2.5 text-xs text-slate-500">Combined shorthand for style + color</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
