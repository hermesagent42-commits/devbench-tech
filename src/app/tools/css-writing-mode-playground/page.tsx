'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, ChevronDown, Info, Type, AlignJustify } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type WritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr' | 'sideways-rl' | 'sideways-lr';
type TextOrientation = 'mixed' | 'upright' | 'sideways';

interface Preset {
  name: string;
  description: string;
  mode: WritingMode;
  orientation: TextOrientation;
  text: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const WRITING_MODES: { value: WritingMode; label: string; css: string; emoji: string; description: string }[] = [
  { value: 'horizontal-tb', label: 'Horizontal (TB)', css: 'horizontal-tb', emoji: '📖', description: 'Default — left-to-right, top-to-bottom. Standard Western text flow.' },
  { value: 'vertical-rl', label: 'Vertical (RL)', css: 'vertical-rl', emoji: '📜', description: 'Top-to-bottom, right-to-left. Traditional East Asian (Japanese, Chinese).' },
  { value: 'vertical-lr', label: 'Vertical (LR)', css: 'vertical-lr', emoji: '📋', description: 'Top-to-bottom, left-to-right. Mongolian script, some CJK layouts.' },
  { value: 'sideways-rl', label: 'Sideways (RL)', css: 'sideways-rl', emoji: '🔄', description: 'All characters rotated 90° clockwise, RTL block flow. Experimental.' },
  { value: 'sideways-lr', label: 'Sideways (LR)', css: 'sideways-lr', emoji: '🔃', description: 'All characters rotated 90° clockwise, LTR block flow. Experimental.' },
];

const TEXT_ORIENTATIONS: { value: TextOrientation; label: string; css: string; description: string }[] = [
  { value: 'mixed', label: 'Mixed', css: 'mixed', description: 'Horizontal scripts rotate 90°; vertical scripts (CJK, Mongolian) stay upright. Default for vertical modes.' },
  { value: 'upright', label: 'Upright', css: 'upright', description: 'All characters remain upright, including Latin letters. Useful for vertical signage.' },
  { value: 'sideways', label: 'Sideways', css: 'sideways', description: 'All characters rotated 90° clockwise. Good for rotated column headers.' },
];

const DEFAULT_TEXT_EN = `The quick brown fox jumps over the lazy dog. CSS Writing Modes unlock vertical text layouts for multilingual typography and creative web design.

This playground lets you experiment with writing-mode and text-orientation in real-time. Try different modes to see how block flow and inline flow change.`;

const DEFAULT_TEXT_JA = `CSS Writing Modes（書字方向）は、多言語対応のWebデザインに不可欠です。

縦書きは日本の伝統的な書字方向で、小説や新聞で今も広く使われています。このプレイグラウンドで色々なモードを試してみましょう。

「吾輩は猫である。名前はまだ無い。」——夏目漱石`;

const DEFAULT_TEXT_MIXED = `English + 日本語 Mixed Text

This is a mixed-language test: 「縦書き」means "vertical writing" in Japanese.

CSS writing-mode: vertical-rl with text-orientation: mixed keeps CJK characters upright while rotating Latin text. これは美しいタイポグラフィです。`;

const PRESETS: Preset[] = [
  {
    name: 'Japanese Vertical (RL)',
    description: 'Traditional Japanese vertical text — writing-mode: vertical-rl with text-orientation: mixed',
    mode: 'vertical-rl',
    orientation: 'mixed',
    text: DEFAULT_TEXT_JA,
  },
  {
    name: 'Mixed Japanese + English',
    description: 'Vertical RL with mixed orientation — CJK stays upright, Latin rotates',
    mode: 'vertical-rl',
    orientation: 'mixed',
    text: DEFAULT_TEXT_MIXED,
  },
  {
    name: 'Vertical Upright Latin',
    description: 'Vertical RL with upright — all characters stay upright, useful for signs',
    mode: 'vertical-rl',
    orientation: 'upright',
    text: DEFAULT_TEXT_EN,
  },
  {
    name: 'Sideways Column Headers',
    description: 'Sideways RL — all text rotated 90°, used in table headers or narrow labels',
    mode: 'sideways-rl',
    orientation: 'sideways',
    text: 'Quarter 1  |  Quarter 2  |  Quarter 3  |  Quarter 4\nRevenue    |  Growth     |  Margins    |  Forecast',
  },
  {
    name: 'Horizontal Default',
    description: 'Standard horizontal-tb — the browser default, for comparison',
    mode: 'horizontal-tb',
    orientation: 'mixed',
    text: DEFAULT_TEXT_EN,
  },
  {
    name: 'Vertical Left-to-Right',
    description: 'Vertical LR — used for Mongolian script, top-to-bottom flowing left-to-right',
    mode: 'vertical-lr',
    orientation: 'mixed',
    text: DEFAULT_TEXT_EN,
  },
  {
    name: 'Sideways Left-to-Right',
    description: 'Sideways LR — all characters rotated, LTR block direction',
    mode: 'sideways-lr',
    orientation: 'sideways',
    text: 'SIDEWAYS HEADER  |  DATA COLUMN  |  VALUE  |  STATUS',
  },
];

// ── Browser Support ────────────────────────────────────────────────────────

const BROWSER_SUPPORT: Record<WritingMode, { chrome: string; firefox: string; safari: string; note: string }> = {
  'horizontal-tb': { chrome: 'All', firefox: 'All', safari: 'All', note: 'Fully supported everywhere since CSS 2.1.' },
  'vertical-rl': { chrome: 'All', firefox: 'All', safari: 'All', note: 'Well-supported. Use for Japanese/Chinese vertical text.' },
  'vertical-lr': { chrome: 'All', firefox: 'All', safari: 'All', note: 'Supported. Primarily for Mongolian script layouts.' },
  'sideways-rl': { chrome: '🟡 Flag', firefox: '✅ 43+', safari: '❌ None', note: 'Experimental. Firefox-only without flag. Use transform as fallback.' },
  'sideways-lr': { chrome: '🟡 Flag', firefox: '✅ 43+', safari: '❌ None', note: 'Experimental. Firefox-only without flag. Use transform as fallback.' },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function BrowserSupportTable({ mode }: { mode: WritingMode }) {
  const support = BROWSER_SUPPORT[mode];
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/50">
            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Browser</th>
            <th className="text-center px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Support</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: 'Chrome / Edge', status: support.chrome },
            { name: 'Firefox', status: support.firefox },
            { name: 'Safari', status: support.safari },
          ].map((b) => (
            <tr key={b.name} className="border-b border-slate-800/50 last:border-0">
              <td className="px-3 py-2 text-slate-300">{b.name}</td>
              <td className="px-3 py-2 text-center">
                <span className={`text-xs font-mono font-medium ${
                  b.status.startsWith('✅') || b.status === 'All'
                    ? 'text-green-400'
                    : b.status.startsWith('🟡')
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {b.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 bg-slate-800/30 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">{support.note}</p>
      </div>
    </div>
  );
}

function QuickCompareStrip() {
  const compareText = 'Hello World!';
  const compareTextJa = 'こんにちは世界';
  return (
    <div className="space-y-2">
      {WRITING_MODES.filter(m => m.value !== 'horizontal-tb').map((mode) => (
        <div key={mode.value} className="flex items-start gap-3 p-2.5 rounded border border-slate-800 bg-slate-900/30">
          <span className="text-xs font-mono text-indigo-400 w-28 shrink-0 pt-0.5">{mode.css}</span>
          <div
            className="text-sm text-slate-300 leading-relaxed flex-1 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/30"
            style={{
              writingMode: mode.value,
              textOrientation: 'mixed',
              maxHeight: mode.value.startsWith('vertical') || mode.value.startsWith('sideways') ? '200px' : 'auto',
            }}
          >
            {compareText} — {compareTextJa}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSSWritingModePlayground() {
  const [writingMode, setWritingMode] = useState<WritingMode>('horizontal-tb');
  const [textOrientation, setTextOrientation] = useState<TextOrientation>('mixed');
  const [text, setText] = useState(DEFAULT_TEXT_EN);
  const [maxHeight, setMaxHeight] = useState(400);
  const [showCss, setShowCss] = useState(true);
  const [showBrowserSupport, setShowBrowserSupport] = useState(false);
  const [showQuickCompare, setShowQuickCompare] = useState(false);

  const handlePreset = useCallback((preset: Preset) => {
    setWritingMode(preset.mode);
    setTextOrientation(preset.orientation);
    setText(preset.text);
    toast.success(`Loaded: ${preset.name}`);
  }, []);

  const handleReset = useCallback(() => {
    setWritingMode('horizontal-tb');
    setTextOrientation('mixed');
    setText(DEFAULT_TEXT_EN);
    setMaxHeight(400);
  }, []);

  const cssCode = useMemo(() => {
    const lines = [`.writing-mode-demo {`];
    lines.push(`  writing-mode: ${writingMode};`);
    if (writingMode !== 'horizontal-tb') {
      lines.push(`  text-orientation: ${textOrientation};`);
    }
    if (writingMode.startsWith('vertical') || writingMode.startsWith('sideways')) {
      lines.push(`  max-height: ${maxHeight}px;`);
    } else {
      lines.push(`  /* max-width controls horizontal overflow */`);
    }
    lines.push(`}`);
    return lines.join('\n');
  }, [writingMode, textOrientation, maxHeight]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const copyText = useCallback(() => {
    navigator.clipboard.writeText(text);
    toast.success('Text copied!');
  }, [text]);

  const isVertical = writingMode.startsWith('vertical');
  const isSideways = writingMode.startsWith('sideways');

  const showTextOrientation = writingMode !== 'horizontal-tb';

  // Determine preview container dimensions
  const previewStyle = useMemo(() => {
    const style: React.CSSProperties = {
      writingMode: writingMode as React.CSSProperties['writingMode'],
    };
    if (writingMode !== 'horizontal-tb') {
      style.textOrientation = textOrientation as React.CSSProperties['textOrientation'];
    }
    if (isVertical || isSideways) {
      style.maxHeight = `${maxHeight}px`;
      style.minHeight = '200px';
    }
    return style;
  }, [writingMode, textOrientation, maxHeight, isVertical, isSideways]);

  return (
    <ToolLayout
      title="CSS Writing Mode Playground"
      description="Experiment with CSS writing-mode and text-orientation. Preview vertical Japanese text, sideways headers, mixed-language layouts, and more — 100% client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Controls ─────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Writing Mode Selector */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              writing-mode
            </h3>
            <div className="space-y-2">
              {WRITING_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setWritingMode(mode.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    writingMode === mode.value
                      ? 'border-indigo-500/40 bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{mode.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{mode.label}</div>
                      <div className="text-xs text-slate-500 font-mono">{mode.css}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 ml-7">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Text Orientation (only for non-horizontal modes) */}
          {showTextOrientation && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                text-orientation
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {TEXT_ORIENTATIONS.map((orient) => (
                  <button
                    key={orient.value}
                    onClick={() => setTextOrientation(orient.value)}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      textOrientation === orient.value
                        ? 'border-emerald-500/40 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-200">{orient.label}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{orient.css}</div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{orient.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Container Size */}
          {(isVertical || isSideways) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Max Height: {maxHeight}px
              </h3>
              <input
                type="range"
                min={150}
                max={800}
                step={10}
                value={maxHeight}
                onChange={(e) => setMaxHeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>150px</span>
                <span>800px</span>
              </div>
            </div>
          )}

          {/* Text Input */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Text Content
              </h3>
              <button onClick={copyText} className="btn-secondary text-xs px-2 py-1">
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="input-field w-full text-sm resize-y font-mono"
              placeholder="Type or paste text to preview in different writing modes..."
              spellCheck={false}
            />
          </div>

          {/* Presets */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Presets
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    writingMode === preset.mode && textOrientation === preset.orientation && text === preset.text
                      ? 'border-indigo-500/40 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-200">{preset.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
                  <div className="mt-1.5 flex gap-1.5">
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      {preset.mode}
                    </span>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      {preset.orientation}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Preview + Info ──────────────────────────────── */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Live Preview
              </h3>
              <div className="flex gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  {writingMode}
                </span>
                {showTextOrientation && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {textOrientation}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-700 rounded-lg bg-white/5 p-4 flex justify-center min-h-[250px]">
              <div
                className="bg-slate-800/80 rounded-lg p-5 border border-slate-700/50 overflow-auto"
                style={previewStyle}
              >
                <p className="text-slate-200 leading-relaxed text-[15px]">{text}</p>
              </div>
            </div>

            {/* Direction indicator */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              {writingMode === 'horizontal-tb' && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">→</span> inline (left → right)
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">↓</span> block (top → bottom)
                  </span>
                </>
              )}
              {writingMode === 'vertical-rl' && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">↓</span> inline (top → bottom)
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">←</span> block (right → left)
                  </span>
                </>
              )}
              {writingMode === 'vertical-lr' && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">↓</span> inline (top → bottom)
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">→</span> block (left → right)
                  </span>
                </>
              )}
              {writingMode.startsWith('sideways') && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">↻</span> All characters rotated 90° clockwise
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-indigo-400">
                      {writingMode === 'sideways-rl' ? '←' : '→'}
                    </span>
                    {' '}block flow
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Generated CSS */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowCss(!showCss)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showCss ? '' : '-rotate-90'}`} />
                Generated CSS
              </button>
              <button onClick={copyCss} className="btn-secondary text-xs px-2 py-1">
                <Copy className="w-3 h-3 mr-1" /> Copy CSS
              </button>
            </div>
            {showCss && (
              <pre className="bg-slate-950 rounded-lg p-4 text-sm font-mono text-slate-300 border border-slate-800 overflow-x-auto">
                <code>{cssCode}</code>
              </pre>
            )}
          </div>

          {/* Browser Support */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowBrowserSupport(!showBrowserSupport)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showBrowserSupport ? '' : '-rotate-90'}`} />
                Browser Support for &ldquo;{writingMode}&rdquo;
              </button>
            </div>
            {showBrowserSupport && <BrowserSupportTable mode={writingMode} />}
          </div>

          {/* Quick Compare */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowQuickCompare(!showQuickCompare)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showQuickCompare ? '' : '-rotate-90'}`} />
                Quick Compare: All Vertical Modes
              </button>
            </div>
            {showQuickCompare && <QuickCompareStrip />}
          </div>

          {/* Info card */}
          <div className="card border-indigo-500/20 bg-indigo-500/5">
            <h3 className="text-sm font-semibold text-indigo-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              About CSS Writing Modes
            </h3>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>
                <strong className="text-slate-300">writing-mode</strong> defines the <em>block flow direction</em> and
                {' '}<em>inline flow direction</em>. It flips the entire layout model.
              </li>
              <li>
                <strong className="text-slate-300">text-orientation</strong> only applies in vertical writing modes
                and controls how individual characters are rotated.
              </li>
              <li>
                <strong className="text-slate-300">horizontal-tb</strong> is the default — inline flows left→right,
                block flows top→bottom. This is what most of the web uses.
              </li>
              <li>
                <strong className="text-slate-300">vertical-rl</strong> is used for Japanese, Chinese, and Korean
                vertical text. Block flows right→left, so columns stack from right to left.
              </li>
              <li>
                <strong className="text-slate-300">sideways-*</strong> values are only supported in Firefox.
                For cross-browser sideways text, use{' '}
                <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">transform: rotate(90deg)</code> as a fallback.
              </li>
              <li>
                CSS Logical Properties (<code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">margin-block-start</code>,
                {' '}<code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">padding-inline-end</code>, etc.)
                pair perfectly with writing modes for truly international layouts.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
