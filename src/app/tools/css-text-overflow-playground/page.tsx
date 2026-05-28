'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Type, Columns } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type TruncationMode = 'single-line' | 'multi-line';

interface Controls {
  mode: TruncationMode;
  textOverflow: 'ellipsis' | 'clip' | 'string';
  truncateString: string;
  maxLines: number;
  overflowWrap: 'normal' | 'break-word' | 'anywhere';
  wordBreak: 'normal' | 'break-all' | 'keep-all' | 'break-word';
  hyphens: 'none' | 'manual' | 'auto';
  whiteSpace: 'nowrap' | 'normal';
  containerWidth: number;
  fontSize: number;
  showOverflow: boolean;
}

interface Preset {
  name: string;
  description: string;
  controls: Partial<Controls>;
  sampleText: string;
}

const DEFAULT_TEXT = `The quick brown fox jumps over the lazy dog. This sentence demonstrates how text overflow and line clamping work in CSS — two essential patterns every frontend developer should master. When content exceeds its container, we need strategies to handle the overflow gracefully without breaking layouts or confusing users. CSS gives us text-overflow for single-line truncation and -webkit-line-clamp (with its standardized counterpart, the line-clamp property) for multi-line clamping. Combined with overflow-wrap, word-break, and hyphens, we can create polished text truncation for any scenario.`;

const PRESETS: Preset[] = [
  {
    name: 'Card Title',
    description: 'Single-line truncation for card headings',
    controls: { mode: 'single-line', textOverflow: 'ellipsis', whiteSpace: 'nowrap', containerWidth: 260, fontSize: 18 },
    sampleText: 'This Is a Very Long Product Title That Should Be Truncated in a Card Layout',
  },
  {
    name: 'Description Clamp',
    description: 'Multi-line clamp for product descriptions',
    controls: { mode: 'multi-line', maxLines: 3, containerWidth: 320, fontSize: 14 },
    sampleText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.',
  },
  {
    name: 'Email Subject',
    description: 'Single-line clip for email subject lines',
    controls: { mode: 'single-line', textOverflow: 'clip', whiteSpace: 'nowrap', containerWidth: 280, fontSize: 13 },
    sampleText: 'RE: Q4 Budget Review — Updated Figures & Projections for the Board Meeting Next Thursday at 2:00 PM',
  },
  {
    name: 'Testimonial Clamp',
    description: '4-line clamp with hyphenation for testimonials',
    controls: { mode: 'multi-line', maxLines: 4, hyphens: 'auto', containerWidth: 340, fontSize: 15 },
    sampleText: 'DevBench has completely revolutionized our development workflow. The CSS tools are incredibly comprehensive, the blog content is top-notch, and the entire platform has become an indispensable part of our daily development process. Highly recommended for any serious web developer.',
  },
  {
    name: 'Filename Truncation',
    description: 'Single-line ellipsis for long filenames',
    controls: { mode: 'single-line', textOverflow: 'ellipsis', whiteSpace: 'nowrap', containerWidth: 200, fontSize: 12 },
    sampleText: 'Q4_2026_Marketing_Strategy_And_Budget_Allocation_Final_Version_v3_Approved.pdf',
  },
  {
    name: 'Blog Excerpt',
    description: '2-line clamp for blog post previews',
    controls: { mode: 'multi-line', maxLines: 2, containerWidth: 380, fontSize: 16 },
    sampleText: 'CSS container queries are finally here, and they change everything about how we think about responsive design. Instead of querying the viewport, we can now query the size of a parent element.',
  },
  {
    name: 'URL Truncation',
    description: 'Single-line with word-break for long URLs',
    controls: { mode: 'single-line', textOverflow: 'ellipsis', whiteSpace: 'nowrap', wordBreak: 'break-all', containerWidth: 240, fontSize: 12 },
    sampleText: 'https://devbench-roan.vercel.app/blog/css-container-queries-comprehensive-guide-with-real-world-patterns',
  },
  {
    name: 'Long Word Stress',
    description: 'Test word-break strategies on supercalifragilisticexpialidocious',
    controls: { mode: 'multi-line', maxLines: 2, overflowWrap: 'break-word', wordBreak: 'normal', containerWidth: 300, fontSize: 16 },
    sampleText: 'Testing supercalifragilisticexpialidocious and antidisestablishmentarianism in a constrained container with word-breaking enabled to see how browsers handle extremely long unbroken strings of text that would otherwise overflow their parent element and cause horizontal scrollbars or layout breakage.',
  },
];

const DEFAULTS: Controls = {
  mode: 'multi-line',
  textOverflow: 'ellipsis',
  truncateString: '...',
  maxLines: 3,
  overflowWrap: 'normal',
  wordBreak: 'normal',
  hyphens: 'none',
  whiteSpace: 'normal',
  containerWidth: 360,
  fontSize: 15,
  showOverflow: false,
};

export default function CSSTextOverflowPlayground() {
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const [text, setText] = useState(DEFAULT_TEXT);

  const update = useCallback((partial: Partial<Controls>) => {
    setControls((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setControls({ ...DEFAULTS, ...preset.controls } as Controls);
    setText(preset.sampleText);
  }, []);

  const reset = useCallback(() => {
    setControls(DEFAULTS);
    setText(DEFAULT_TEXT);
  }, []);

  const cssOutput = useMemo(() => {
    const lines: string[] = [];
    lines.push('.text-truncate {');

    if (controls.mode === 'single-line') {
      lines.push('  overflow: hidden;');
      lines.push(`  white-space: ${controls.whiteSpace};`);
      if (controls.textOverflow === 'string' && controls.truncateString) {
        lines.push(`  text-overflow: "${controls.truncateString}";`);
      } else {
        lines.push(`  text-overflow: ${controls.textOverflow};`);
      }
    } else {
      lines.push('  display: -webkit-box;');
      lines.push('  -webkit-box-orient: vertical;');
      lines.push(`  -webkit-line-clamp: ${controls.maxLines};`);
      lines.push(`  line-clamp: ${controls.maxLines};`);
      lines.push('  overflow: hidden;');
    }

    if (controls.overflowWrap !== 'normal') {
      lines.push(`  overflow-wrap: ${controls.overflowWrap};`);
    }
    if (controls.wordBreak !== 'normal') {
      lines.push(`  word-break: ${controls.wordBreak};`);
    }
    if (controls.hyphens !== 'none') {
      lines.push(`  hyphens: ${controls.hyphens};`);
    }
    if (controls.fontSize !== 16) {
      lines.push(`  font-size: ${controls.fontSize}px;`);
    }
    lines.push(`  width: ${controls.containerWidth}px;`);
    lines.push('}');

    return lines.join('\n');
  }, [controls.mode, controls.textOverflow, controls.truncateString, controls.maxLines, controls.overflowWrap, controls.wordBreak, controls.hyphens, controls.whiteSpace, controls.containerWidth, controls.fontSize]);

  const previewStyle = useMemo(() => {
    const style: React.CSSProperties = {
      width: `${controls.containerWidth}px`,
      fontSize: `${controls.fontSize}px`,
      overflowWrap: controls.overflowWrap,
      wordBreak: controls.wordBreak,
      hyphens: controls.hyphens,
      overflowY: controls.showOverflow ? 'visible' : undefined,
      transition: 'all 0.2s ease',
    };

    if (controls.mode === 'single-line') {
      style.whiteSpace = controls.whiteSpace;
      style.overflow = controls.showOverflow ? 'visible' : 'hidden';
      style.textOverflow = controls.textOverflow;
    } else {
      style.display = '-webkit-box';
      style.WebkitBoxOrient = 'vertical';
      style.WebkitLineClamp = controls.maxLines;
      style.lineClamp = `${controls.maxLines}`;
      style.overflow = controls.showOverflow ? 'visible' : 'hidden';
    }

    return style;
  }, [controls]);

  const tailwindEquiv = useMemo(() => {
    const classes: string[] = [];

    if (controls.mode === 'single-line') {
      classes.push('truncate');
    } else {
      classes.push(`line-clamp-${controls.maxLines}`);
    }

    if (controls.overflowWrap === 'break-word') classes.push('break-words');
    else if (controls.overflowWrap === 'anywhere') classes.push('break-words');

    if (controls.wordBreak === 'break-all') classes.push('break-all');
    if (controls.wordBreak === 'keep-all') classes.push('break-keep');

    if (controls.hyphens === 'auto') classes.push('hyphens-auto');
    else if (controls.hyphens === 'manual') classes.push('hyphens-manual');

    return classes.join(' ');
  }, [controls]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(() => {
      toast.success('CSS copied to clipboard');
    });
  }, [cssOutput]);

  const copyTailwind = useCallback(() => {
    navigator.clipboard.writeText(tailwindEquiv).then(() => {
      toast.success('Tailwind classes copied to clipboard');
    });
  }, [tailwindEquiv]);

  return (
    <ToolLayout
      title="CSS Text Overflow & Clamp Playground"
      description="Experiment with text-truncation and line-clamp — single-line ellipsis, multi-line clamp, word-break, overflow-wrap, and hyphens. Live preview, instant CSS + Tailwind output."
      controls={
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Truncation Mode
            </label>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {(['single-line', 'multi-line'] as TruncationMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => update({ mode: m, whiteSpace: m === 'single-line' ? 'nowrap' : 'normal' })}
                  className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                    controls.mode === m
                      ? 'bg-brand-500/20 text-brand-400 font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'single-line' ? 'Single Line' : 'Multi-Line'}
                </button>
              ))}
            </div>
          </div>

          {controls.mode === 'single-line' && (
            <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                text-overflow
              </label>
              <div className="space-y-2">
                {(['ellipsis', 'clip', 'string'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="text-overflow"
                      checked={controls.textOverflow === v}
                      onChange={() => update({ textOverflow: v })}
                      className="text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-slate-300 font-mono">{v}</span>
                  </label>
                ))}
              </div>
              {controls.textOverflow === 'string' && (
                <input
                  type="text"
                  value={controls.truncateString}
                  onChange={(e) => update({ truncateString: e.target.value })}
                  className="mt-2 w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white font-mono"
                  placeholder="custom string"
                  maxLength={10}
                />
              )}
            </div>
          )}

          {controls.mode === 'multi-line' && (
            <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Max Lines: <span className="text-brand-400 font-mono">{controls.maxLines}</span>
              </label>
              <input
                type="range"
                min={1}
                max={8}
                value={controls.maxLines}
                onChange={(e) => update({ maxLines: parseInt(e.target.value) })}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1</span>
                <span>8</span>
              </div>
            </div>
          )}

          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              <Columns className="w-3.5 h-3.5 inline mr-1.5" />
              Container Width: <span className="text-brand-400 font-mono">{controls.containerWidth}px</span>
            </label>
            <input
              type="range"
              min={120}
              max={700}
              step={10}
              value={controls.containerWidth}
              onChange={(e) => update({ containerWidth: parseInt(e.target.value) })}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>120px</span>
              <span>700px</span>
            </div>
          </div>

          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              <Type className="w-3.5 h-3.5 inline mr-1.5" />
              Font Size: <span className="text-brand-400 font-mono">{controls.fontSize}px</span>
            </label>
            <input
              type="range"
              min={10}
              max={32}
              value={controls.fontSize}
              onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>10px</span>
              <span>32px</span>
            </div>
          </div>

          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Word Breaking
            </label>
            <div className="mb-3">
              <span className="text-xs text-slate-500 mb-1.5 block">overflow-wrap</span>
              <select
                value={controls.overflowWrap}
                onChange={(e) => update({ overflowWrap: e.target.value as Controls['overflowWrap'] })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white"
              >
                <option value="normal">normal</option>
                <option value="break-word">break-word</option>
                <option value="anywhere">anywhere</option>
              </select>
            </div>
            <div>
              <span className="text-xs text-slate-500 mb-1.5 block">word-break</span>
              <select
                value={controls.wordBreak}
                onChange={(e) => update({ wordBreak: e.target.value as Controls['wordBreak'] })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white"
              >
                <option value="normal">normal</option>
                <option value="break-all">break-all</option>
                <option value="keep-all">keep-all</option>
                <option value="break-word">break-word</option>
              </select>
            </div>
          </div>

          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Hyphens
            </label>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {(['none', 'manual', 'auto'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => update({ hyphens: h })}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                    controls.hyphens === h
                      ? 'bg-brand-500/20 text-brand-400 font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            {controls.hyphens === 'manual' && (
              <p className="text-xs text-slate-500 mt-2">
                Use <code className="text-yellow-400">&amp;shy;</code> in text for manual hyphens.
              </p>
            )}
          </div>

          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={controls.showOverflow}
                onChange={(e) => update({ showOverflow: e.target.checked })}
                className="rounded text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-300">Show overflow content</span>
            </label>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/50 hover:border-brand-500/30"
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Sample Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 font-sans resize-y focus:outline-none focus:border-brand-500/50"
              placeholder="Type or paste your text here..."
            />
          </div>

          <div className="bg-surface-light border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Live Preview
              </label>
              <span className="text-xs text-slate-500">
                {controls.showOverflow ? '(overflow visible)' : '(overflow hidden)'}
              </span>
            </div>
            <div className="flex justify-center">
              <div
                className={`p-4 rounded-lg ${
                  controls.showOverflow
                    ? 'bg-slate-800/50 border-2 border-dashed border-amber-500/30'
                    : 'bg-slate-800 border border-slate-700'
                }`}
                style={{ minWidth: controls.containerWidth + 32, maxWidth: '100%' }}
              >
                <div
                  className="text-slate-200 leading-relaxed"
                  style={previewStyle}
                >
                  {text}
                </div>
              </div>
            </div>
            {controls.showOverflow && (
              <p className="text-xs text-amber-400 mt-2 text-center">
                Dashed border shows container bounds — text may overflow beyond it
              </p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Generated CSS
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyTailwind}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Tailwind: <code className="text-cyan-400">{tailwindEquiv || 'none'}</code>
                </button>
                <button
                  onClick={copyCSS}
                  className="px-3 py-1.5 text-xs bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy CSS
                </button>
              </div>
            </div>
            <pre className="text-sm text-slate-300 font-mono bg-slate-950 p-4 rounded overflow-x-auto">
              <code>{cssOutput}</code>
            </pre>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-slate-400">
            <strong className="text-amber-400">Browser Support:</strong>{' '}
            <code className="text-yellow-400">text-overflow</code> — all browsers (Baseline).{' '}
            <code className="text-yellow-400">-webkit-line-clamp</code> — all browsers (Baseline).{' '}
            <code className="text-yellow-400">line-clamp</code> — Baseline 2024.{' '}
            <code className="text-yellow-400">overflow-wrap: anywhere</code> — Chrome 80+, Firefox 65+, Safari 15.4+.{' '}
            <code className="text-yellow-400">hyphens: auto</code> — needs <code className="text-yellow-400">lang</code> attribute.
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
