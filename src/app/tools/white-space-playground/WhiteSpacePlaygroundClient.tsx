'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, ChevronDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type WhiteSpaceMode = 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces';

interface Preset {
  name: string;
  description: string;
  mode: WhiteSpaceMode;
  text: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const WHITE_SPACE_MODES: {
  value: WhiteSpaceMode;
  label: string;
  cssValue: string;
  icon: string;
}[] = [
  { value: 'normal', label: 'Normal', cssValue: 'normal', icon: '📄' },
  { value: 'nowrap', label: 'No Wrap', cssValue: 'nowrap', icon: '➡️' },
  { value: 'pre', label: 'Pre', cssValue: 'pre', icon: '💻' },
  { value: 'pre-wrap', label: 'Pre-Wrap', cssValue: 'pre-wrap', icon: '📝' },
  { value: 'pre-line', label: 'Pre-Line', cssValue: 'pre-line', icon: '↩️' },
  { value: 'break-spaces', label: 'Break Spaces', cssValue: 'break-spaces', icon: '🔲' },
];

const WHITE_SPACE_BEHAVIOR: Record<
  WhiteSpaceMode,
  {
    collapseSpaces: boolean;
    collapseTabs: boolean;
    wrap: boolean;
    preserveNewlines: boolean;
    hangSpaces: boolean;
  }
> = {
  normal: { collapseSpaces: true, collapseTabs: true, wrap: true, preserveNewlines: false, hangSpaces: false },
  nowrap: { collapseSpaces: true, collapseTabs: true, wrap: false, preserveNewlines: false, hangSpaces: false },
  pre: { collapseSpaces: false, collapseTabs: false, wrap: false, preserveNewlines: true, hangSpaces: false },
  'pre-wrap': { collapseSpaces: false, collapseTabs: false, wrap: true, preserveNewlines: true, hangSpaces: false },
  'pre-line': { collapseSpaces: true, collapseTabs: true, wrap: true, preserveNewlines: true, hangSpaces: false },
  'break-spaces': { collapseSpaces: false, collapseTabs: false, wrap: true, preserveNewlines: true, hangSpaces: true },
};

const DEFAULT_TEXT = `Hello,      World!

This is a demo of CSS white-space.     Multiple spaces,   tabs,\t\tand newlines behave differently depending on the mode you select.

Here's another paragraph with     extra    whitespace between words.

Watch how each mode transforms the same text.                    (lots of spaces here)

Special characters: \t → tab, \n → newline.`;

const CODE_TEXT = `function greet(name) {
    const message = "Hello, " + name;
    const greeting = message + "!";
    return greeting;
}

// Try pre or pre-wrap to preserve formatting
// Try normal to collapse everything`;

const POEM_TEXT = `The Road Not Taken
by Robert Frost

Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;

Then took the other, as just as fair`;

const TABLE_TEXT = `Name     Age    City         Role
Alice    28     New York     Engineer
Bob      34     London       Designer
Carol    22     Tokyo        Manager
Dave     41     Paris        Architect`;

const PRESETS: Preset[] = [
  {
    name: 'Collapsed Default',
    description: 'white-space: normal — spaces and tabs collapse, text wraps, newlines ignored',
    mode: 'normal',
    text: DEFAULT_TEXT,
  },
  {
    name: 'Code Block (Pre)',
    description: 'white-space: pre — preserves all whitespace, no wrapping, like <pre>',
    mode: 'pre',
    text: CODE_TEXT,
  },
  {
    name: 'Code with Wrapping',
    description: 'white-space: pre-wrap — preserves whitespace but allows text to wrap',
    mode: 'pre-wrap',
    text: CODE_TEXT,
  },
  {
    name: 'Poetry Preservation',
    description: 'white-space: pre-line — preserves newlines but collapses spaces, wraps',
    mode: 'pre-line',
    text: POEM_TEXT,
  },
  {
    name: 'Single-Line Overflow',
    description: 'white-space: nowrap — collapses spaces, no wrapping, all on one line',
    mode: 'nowrap',
    text: DEFAULT_TEXT,
  },
  {
    name: 'Tabular Data (Break Spaces)',
    description: 'white-space: break-spaces — preserves all whitespace with hanging break points',
    mode: 'break-spaces',
    text: TABLE_TEXT,
  },
  {
    name: 'Pre-Wrap + Poetry',
    description: 'white-space: pre-wrap — preserves spacing and newlines, wraps long lines',
    mode: 'pre-wrap',
    text: POEM_TEXT,
  },
];

// ── Behavior Table ─────────────────────────────────────────────────────────

function BehaviorTable({ mode }: { mode: WhiteSpaceMode }) {
  const b = WHITE_SPACE_BEHAVIOR[mode];
  const rows = [
    { label: 'Collapse spaces', value: b.collapseSpaces },
    { label: 'Collapse tabs', value: b.collapseTabs },
    { label: 'Text wraps', value: b.wrap },
    { label: 'Preserve newlines', value: b.preserveNewlines },
    { label: 'Hanging spaces', value: b.hangSpaces },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/50">
            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Behavior
            </th>
            <th className="text-center px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">
              Active
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-slate-800/50 last:border-0"
            >
              <td className="px-3 py-2 text-slate-300">{row.label}</td>
              <td className="px-3 py-2 text-center">
                {row.value ? (
                  <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    No
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mode Comparison Strip ──────────────────────────────────────────────────

function ModeComparisonStrip() {
  const compareText = 'Hello     beautiful      world!';

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Quick Compare: &ldquo;{compareText}&rdquo;
      </h4>
      {WHITE_SPACE_MODES.map((mode) => (
        <div
          key={mode.value}
          className="flex items-start gap-3 p-2 rounded border border-slate-800 bg-slate-900/30"
        >
          <span className="text-xs font-mono text-indigo-400 w-20 shrink-0 pt-0.5">
            {mode.cssValue}
          </span>
          <span
            className="text-sm text-slate-300 leading-relaxed flex-1"
            style={{ whiteSpace: mode.value }}
          >
            {compareText}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WhiteSpacePlaygroundClient() {
  const [selectedMode, setSelectedMode] = useState<WhiteSpaceMode>('normal');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [containerWidth, setContainerWidth] = useState(75); // percentage, 30-100
  const [showCss, setShowCss] = useState(true);
  const [showCompare, setShowCompare] = useState(false);

  const handlePreset = useCallback((preset: Preset) => {
    setSelectedMode(preset.mode);
    setText(preset.text);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedMode('normal');
    setText(DEFAULT_TEXT);
    setContainerWidth(75);
  }, []);

  const cssCode = useMemo(() => {
    return `.white-space-demo {\n  white-space: ${selectedMode};\n  width: ${containerWidth}%;\n}`;
  }, [selectedMode, containerWidth]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssCode);
    toast.success('CSS copied!');
  }, [cssCode]);

  const copyText = useCallback(() => {
    navigator.clipboard.writeText(text);
    toast.success('Text copied!');
  }, [text]);

  // Show literal whitespace rendering in the preview (visual indicators)
  const literalPreviewText = useMemo(() => {
    return text
      .replace(/ /g, '·')
      .replace(/\t/g, '→   ')
      .replace(/\n/g, '↵\n');
  }, [text]);

  const demoStyle = useMemo(
    () => ({
      whiteSpace: selectedMode,
      width: `${containerWidth}%`,
    }),
    [selectedMode, containerWidth],
  );

  return (
    <ToolLayout
      title="CSS white-space Playground"
      description="Experiment with white-space: normal, nowrap, pre, pre-wrap, pre-line, and break-spaces. See how whitespace collapsing, line breaks, and wrapping change in real-time."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Controls ─────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Mode selector */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              white-space Mode
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {WHITE_SPACE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setSelectedMode(mode.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedMode === mode.value
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="text-base">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Behavior table */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              How &ldquo;{WHITE_SPACE_MODES.find((m) => m.value === selectedMode)?.label}&rdquo; works
            </h3>
            <BehaviorTable mode={selectedMode} />
          </div>

          {/* Width control */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Container Width: {containerWidth}%
            </h3>
            <input
              type="range"
              min={30}
              max={100}
              value={containerWidth}
              onChange={(e) => setContainerWidth(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>30% — narrow</span>
              <span>100% — full</span>
            </div>
          </div>

          {/* Text input */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Input Text
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
              rows={8}
              className="input-field w-full text-sm resize-y font-mono"
              style={{ whiteSpace: 'pre-wrap', tabSize: 2 }}
              placeholder="Type or paste text to preview white-space behavior..."
              spellCheck={false}
            />
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Tabs and multiple spaces are preserved in the textarea. They&apos;ll render differently per mode.
            </p>
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
                white-space: {selectedMode}
              </span>
            </div>

            <div className="border border-slate-700 rounded-lg bg-slate-900/50 p-4 flex justify-center">
              <div
                style={demoStyle}
                className="bg-slate-800/80 rounded-lg p-5 border border-slate-700/50 max-w-full overflow-hidden"
              >
                <p className="text-slate-200 leading-relaxed text-[15px]">
                  {text}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-green-500/60" />
              <span>
                {selectedMode === 'nowrap' || selectedMode === 'pre'
                  ? 'This mode does not wrap — long lines overflow the container. Use the width slider to see overflow.'
                  : 'Resize width and watch wrapping change. Try different modes to see whitespace behavior.'}
              </span>
            </div>
          </div>

          {/* Whitespace visualization */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Whitespace Visualization
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  <span className="text-indigo-400">·</span> = space
                </span>
                <span>
                  <span className="text-indigo-400">→</span> = tab
                </span>
                <span>
                  <span className="text-indigo-400">↵</span> = newline
                </span>
              </div>
            </div>
            <pre className="bg-slate-950 rounded-lg p-4 text-sm font-mono text-slate-300 border border-slate-800 overflow-auto max-h-48">
              <code>{literalPreviewText}</code>
            </pre>
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

          {/* Comparison strip */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowCompare(!showCompare)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showCompare ? 'rotate-0' : '-rotate-90'}`}
                />
                All Modes Compared
              </button>
            </div>
            {showCompare && <ModeComparisonStrip />}
          </div>

          {/* Info card */}
          <div className="card border-indigo-500/20 bg-indigo-500/5">
            <h3 className="text-sm font-semibold text-indigo-300 mb-2">
              About white-space
            </h3>
            <ul className="text-xs text-slate-400 space-y-2">
              <li>
                <strong className="text-slate-300">normal</strong> — Sequences of whitespace collapse into one space.
                Text wraps. Newlines behave like spaces. The browser default.
              </li>
              <li>
                <strong className="text-slate-300">nowrap</strong> — Collapses whitespace like normal but never wraps.
                Overflow hidden unless you add overflow-x: auto or text-overflow: ellipsis.
              </li>
              <li>
                <strong className="text-slate-300">pre</strong> — Preserves all whitespace exactly. No wrapping.
                Behaves like the HTML <code className="text-indigo-300/80">&lt;pre&gt;</code> element.
              </li>
              <li>
                <strong className="text-slate-300">pre-wrap</strong> — Preserves whitespace and newlines but wraps long
                lines. Great for code blocks that need to fit responsive containers.
              </li>
              <li>
                <strong className="text-slate-300">pre-line</strong> — Collapses spaces and tabs but preserves
                newlines. Text wraps normally. Good for poetry or addresses.
              </li>
              <li>
                <strong className="text-slate-300">break-spaces</strong> — Same as pre-wrap but any sequence of spaces
                can be a line break opportunity. Spaces at the end of a line &ldquo;hang&rdquo; visually.
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              CSS 2.1/3 &middot; All browsers &middot; break-spaces: Chrome 76+, Firefox 69+, Safari 13.1+
            </p>
          </div>
        </div>
      </div>

      {/* Reset button */}
      <div className="mt-6 flex justify-end">
        <button onClick={handleReset} className="btn-secondary">
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset All
        </button>
      </div>
    </ToolLayout>
  );
}
