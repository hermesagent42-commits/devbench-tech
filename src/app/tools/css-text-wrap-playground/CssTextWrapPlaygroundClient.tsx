'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type WrapMode = 'wrap' | 'nowrap' | 'balance' | 'pretty' | 'stable';

interface Preset {
  name: string;
  description: string;
  mode: WrapMode;
  text: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const WRAP_MODES: { value: WrapMode; label: string; cssValue: string }[] = [
  { value: 'wrap', label: 'Wrap', cssValue: 'wrap' },
  { value: 'nowrap', label: 'No Wrap', cssValue: 'nowrap' },
  { value: 'balance', label: 'Balance', cssValue: 'balance' },
  { value: 'pretty', label: 'Pretty', cssValue: 'pretty' },
  { value: 'stable', label: 'Stable', cssValue: 'stable' },
];

const DEFAULT_TEXT = `The quick brown fox jumps over the lazy dog. This sentence demonstrates how the CSS text-wrap property affects line breaking and text flow within a constrained-width container. Different wrapping modes produce dramatically different visual results. Watch how lines break and balance as you adjust the container width.`;

const HEADING_TEXT = `Crafting Beautiful Typography with Modern CSS`;

const PARAGRAPH_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.`;

const PRESETS: Preset[] = [
  {
    name: 'Balanced Heading',
    description: 'text-wrap: balance on a heading — lines stay roughly equal length',
    mode: 'balance',
    text: HEADING_TEXT,
  },
  {
    name: 'Pretty Paragraphs',
    description: 'text-wrap: pretty prevents orphan words on the last line',
    mode: 'pretty',
    text: PARAGRAPH_TEXT,
  },
  {
    name: 'Default Wrap',
    description: 'Standard text-wrap: wrap — the browser default behavior',
    mode: 'wrap',
    text: DEFAULT_TEXT,
  },
  {
    name: 'No Wrap Overflow',
    description: 'text-wrap: nowrap — text stays on one line, may overflow',
    mode: 'nowrap',
    text: DEFAULT_TEXT,
  },
  {
    name: 'Stable Editing',
    description: 'text-wrap: stable prevents layout shift when text changes',
    mode: 'stable',
    text: PARAGRAPH_TEXT,
  },
  {
    name: 'Balance + Long Text',
    description: 'Balance on multi-line body text — first 4 lines only (balance cap)',
    mode: 'balance',
    text: PARAGRAPH_TEXT,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CssTextWrapPlaygroundClient() {
  const [selectedMode, setSelectedMode] = useState<WrapMode>('balance');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [containerWidth, setContainerWidth] = useState(60); // percentage, 20-100
  const [showCss, setShowCss] = useState(false);

  const handlePreset = useCallback((preset: Preset) => {
    setSelectedMode(preset.mode);
    setText(preset.text);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedMode('balance');
    setText(DEFAULT_TEXT);
    setContainerWidth(60);
  }, []);

  const cssCode = useMemo(() => {
    return `.text-wrap-demo {\n  text-wrap: ${selectedMode};\n  width: ${containerWidth}%;\n}`;
  }, [selectedMode, containerWidth]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const copyText = useCallback(() => {
    navigator.clipboard.writeText(text);
    toast.success('Text copied!');
  }, [text]);

  const demoStyle = useMemo(
    () => ({
      textWrap: selectedMode,
      width: `${containerWidth}%`,
    }),
    [selectedMode, containerWidth],
  );

  return (
    <ToolLayout
      title="CSS text-wrap Playground"
      description="Experiment with text-wrap: balance, pretty, stable, wrap, and nowrap — all new Baseline 2026 CSS features for professional typography."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Controls ─────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Mode selector */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              text-wrap Mode
            </h3>
            <div className="flex flex-wrap gap-2">
              {WRAP_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setSelectedMode(mode.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMode === mode.value
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Width control */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Container Width: {containerWidth}%
            </h3>
            <input
              type="range"
              min={20}
              max={100}
              value={containerWidth}
              onChange={(e) => setContainerWidth(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>20%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Text input */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Demo Text
              </h3>
              <button
                onClick={copyText}
                className="btn-secondary text-xs px-2 py-1"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="input-field w-full text-sm resize-y"
              placeholder="Type or paste text to preview text-wrap behavior..."
            />
          </div>

          {/* Presets */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Presets
            </h3>
            <div className="space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedMode === preset.mode && text === preset.text
                      ? 'border-indigo-500/40 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-200">
                    {preset.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {preset.description}
                  </div>
                  <div className="mt-1">
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      {preset.mode}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Preview + CSS ───────────────────────────────── */}
        <div className="space-y-6">
          {/* Live preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Live Preview
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                text-wrap: {selectedMode}
              </span>
            </div>

            <div className="border border-slate-700 rounded-lg bg-slate-900/50 p-4 flex justify-center">
              <div
                style={demoStyle}
                className="bg-slate-800/80 rounded-lg p-5 border border-slate-700/50"
              >
                <p className="text-slate-200 leading-relaxed text-[15px]">
                  {text}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-green-500/60" />
              <span>Resize the container width slider to see wrapping change in real-time</span>
            </div>
          </div>

          {/* CSS output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowCss(!showCss)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showCss ? 'rotate-0' : '-rotate-90'}`}
                />
                Generated CSS
              </button>
              <button
                onClick={copyCss}
                className="btn-secondary text-xs px-2 py-1"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy CSS
              </button>
            </div>

            {showCss && (
              <pre className="bg-slate-950 rounded-lg p-4 text-sm font-mono text-slate-300 border border-slate-800 overflow-x-auto">
                <code>{cssCode}</code>
              </pre>
            )}
          </div>

          {/* Info card */}
          <div className="card border-indigo-500/20 bg-indigo-500/5">
            <h3 className="text-sm font-semibold text-indigo-300 mb-2">
              About text-wrap
            </h3>
            <ul className="text-xs text-slate-400 space-y-2">
              <li>
                <strong className="text-slate-300">balance</strong> — Text wraps so each line has roughly the same length. Capped at ~4 lines (browser-defined). Ideal for headings.
              </li>
              <li>
                <strong className="text-slate-300">pretty</strong> — Prevents orphans (single words on the last line). Prioritizes visual quality over speed. Best for body text.
              </li>
              <li>
                <strong className="text-slate-300">stable</strong> — Prevents earlier lines from re-wrapping when you edit text later in the block. Great for live-editing experiences.
              </li>
              <li>
                <strong className="text-slate-300">wrap</strong> — Default browser behavior. Lines break wherever needed.
              </li>
              <li>
                <strong className="text-slate-300">nowrap</strong> — Text stays on a single line. Combine with overflow: hidden/ellipsis.
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              Baseline 2026 &middot; Chrome 114+ &middot; Firefox 121+ &middot; Safari 17.4+
            </p>
          </div>
        </div>
      </div>

      {/* Reset button */}
      <div className="mt-6 flex justify-end">
        <button onClick={handleReset} className="btn-secondary">
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </button>
      </div>
    </ToolLayout>
  );
}
