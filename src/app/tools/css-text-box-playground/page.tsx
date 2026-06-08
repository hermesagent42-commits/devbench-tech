'use client';

import { useState, useMemo, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, RefreshCw, Code, Eye, EyeOff, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type TrimValue = 'none' | 'trim-start' | 'trim-end' | 'trim-both';
type EdgeValue = 'text' | 'cap' | 'ex' | 'ideographic' | 'ideographic-ink';
type UnderEdgeValue = 'text' | 'alphabetic' | 'ideographic' | 'ideographic-ink';

interface Preset {
  label: string;
  description: string;
  trim: TrimValue;
  over: EdgeValue;
  under: UnderEdgeValue;
  padding: string;
  fontSize: string;
  lineHeight: string;
  text: string;
  fontFamily: string;
  width: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    label: 'Perfect Button',
    description: 'Dead-center button label alignment',
    trim: 'trim-both',
    over: 'cap',
    under: 'alphabetic',
    padding: '0.5em 1em',
    fontSize: '1rem',
    lineHeight: '1',
    text: 'Click Me',
    fontFamily: 'system-ui, sans-serif',
    width: 'auto',
  },
  {
    label: 'Badge / Tag',
    description: 'Tiny badges with exact dimensions',
    trim: 'trim-both',
    over: 'cap',
    under: 'alphabetic',
    padding: '0.125em 0.5em',
    fontSize: '0.75rem',
    lineHeight: '1',
    text: 'New',
    fontFamily: 'system-ui, sans-serif',
    width: 'auto',
  },
  {
    label: 'Icon + Text',
    description: 'Text perfectly aligned with an icon',
    trim: 'trim-both',
    over: 'cap',
    under: 'alphabetic',
    padding: '0.25em 0.5em',
    fontSize: '1rem',
    lineHeight: '1',
    text: 'Settings',
    fontFamily: 'system-ui, sans-serif',
    width: 'auto',
  },
  {
    label: 'Input Field',
    description: 'Form inputs with predictable height',
    trim: 'trim-both',
    over: 'cap',
    under: 'alphabetic',
    padding: '0.5em 0.75em',
    fontSize: '1rem',
    lineHeight: '1',
    text: 'Type something...',
    fontFamily: 'system-ui, sans-serif',
    width: '220px',
  },
  {
    label: 'Large Heading',
    description: 'h1 with no ghost space above',
    trim: 'trim-both',
    over: 'cap',
    under: 'alphabetic',
    padding: '0.25em 0',
    fontSize: '2.5rem',
    lineHeight: '1.1',
    text: 'Hello World',
    fontFamily: 'system-ui, sans-serif',
    width: 'auto',
  },
  {
    label: 'CJK Text',
    description: 'Trimming for ideographic text',
    trim: 'trim-both',
    over: 'ideographic',
    under: 'ideographic',
    padding: '0.25em 0.5em',
    fontSize: '1.25rem',
    lineHeight: '1.2',
    text: 'こんにちは世界',
    fontFamily: 'system-ui, sans-serif',
    width: 'auto',
  },
  {
    label: 'Cap-to-x-height',
    description: 'Trim top to cap, bottom to x-height',
    trim: 'trim-both',
    over: 'cap',
    under: 'ex' as UnderEdgeValue,
    padding: '0.25em 0.5em',
    fontSize: '1rem',
    lineHeight: '1',
    text: 'Precision',
    fontFamily: 'system-ui, sans-serif',
    width: 'auto',
  },
];

// ── Main ────────────────────────────────────────────────────────────────────

export default function CssTextBoxPlaygroundPage() {
  const [trim, setTrim] = useState<TrimValue>('trim-both');
  const [overEdge, setOverEdge] = useState<EdgeValue>('cap');
  const [underEdge, setUnderEdge] = useState<UnderEdgeValue>('alphabetic');
  const [fontSize, setFontSize] = useState('1rem');
  const [lineHeight, setLineHeight] = useState('1');
  const [padding, setPadding] = useState('0.5em 1em');
  const [text, setText] = useState('Click Me');
  const [fontFamily, setFontFamily] = useState('system-ui, sans-serif');
  const [bgColor, setBgColor] = useState('#3b82f6');
  const [textColor, setTextColor] = useState('#ffffff');
  const [borderRadius, setBorderRadius] = useState('0.5rem');
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [copied, setCopied] = useState(false);

  // ── CSS Generation ────────────────────────────────────────────────────────

  const textBoxShorthand = useMemo(() => {
    return `text-box: ${trim} ${overEdge} ${underEdge};`;
  }, [trim, overEdge, underEdge]);

  const longform = useMemo(() => {
    return `text-box-trim: ${trim};
text-box-edge: ${overEdge} ${underEdge};`;
  }, [trim, overEdge, underEdge]);

  const fullCSS = useMemo(() => {
    return `.trimmed {
  ${textBoxShorthand}
  font-size: ${fontSize};
  line-height: ${lineHeight};
  padding: ${padding};
  font-family: ${fontFamily};
  background: ${bgColor};
  color: ${textColor};
  border-radius: ${borderRadius};
  border: none;
  display: inline-flex;
  align-items: center;
}`;
  }, [textBoxShorthand, fontSize, lineHeight, padding, fontFamily, bgColor, textColor, borderRadius]);

  // ── Trimmed style object ──────────────────────────────────────────────────

  const trimmedStyle = useMemo(() => {
    const styles: Record<string, string> = {
      fontSize,
      lineHeight,
      padding,
      fontFamily,
      background: bgColor,
      color: textColor,
      borderRadius,
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'default',
      userSelect: 'none',
    };
    if (trim !== 'none') {
      styles.textBox = `${trim} ${overEdge} ${underEdge}`;
    }
    return styles;
  }, [trim, overEdge, underEdge, fontSize, lineHeight, padding, fontFamily, bgColor, textColor, borderRadius]);

  const untrimmedStyle = useMemo(() => {
    const styles: Record<string, string> = {
      fontSize,
      lineHeight,
      padding,
      fontFamily,
      background: bgColor,
      color: textColor,
      borderRadius,
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'default',
      userSelect: 'none',
    };
    styles.textBox = 'none';
    return styles;
  }, [fontSize, lineHeight, padding, fontFamily, bgColor, textColor, borderRadius]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: Preset) => {
    setTrim(preset.trim);
    setOverEdge(preset.over);
    setUnderEdge(preset.under);
    setFontSize(preset.fontSize);
    setLineHeight(preset.lineHeight);
    setPadding(preset.padding);
    setText(preset.text);
    setFontFamily(preset.fontFamily);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(fullCSS);
    setCopied(true);
    toast.success('CSS copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [fullCSS]);

  // ── Edge descriptions ─────────────────────────────────────────────────────

  const overEdgeLabels: Record<EdgeValue, string> = {
    text: 'text — top of tallest glyph',
    cap: 'cap — top of capital letters (H, M)',
    ex: 'ex — top of x-height (lowercase x)',
    ideographic: 'ideographic — top of CJK characters',
    'ideographic-ink': 'ideographic-ink — top of CJK ink',
  };

  const underEdgeLabels: Record<UnderEdgeValue, string> = {
    text: 'text — bottom of lowest descender',
    alphabetic: 'alphabetic — baseline where letters sit',
    ideographic: 'ideographic — bottom of CJK characters',
    'ideographic-ink': 'ideographic-ink — bottom of CJK ink',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS text-box Playground"
      description="Experiment with text-box-trim and text-box-edge — the new CSS Baseline 2026 properties for killing half-leading and achieving perfect vertical text alignment."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="text-left px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700/50 hover:border-brand-500/50 hover:bg-slate-800 transition-all text-xs group"
                >
                  <div className="font-medium text-slate-200 group-hover:text-brand-400">
                    {preset.label}
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* text-box-trim */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              text-box-trim
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['none', 'trim-start', 'trim-end', 'trim-both'] as TrimValue[]).map(
                (v) => (
                  <button
                    key={v}
                    onClick={() => setTrim(v)}
                    className={`px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
                      trim === v
                        ? 'bg-brand-600/20 border-brand-500/60 text-brand-300'
                        : 'bg-slate-800/70 border-slate-700/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {v}
                  </button>
                )
              )}
            </div>
          </div>

          {/* text-box-edge: over */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              text-box-edge (over — top)
            </label>
            <div className="flex flex-wrap gap-2">
              {(['text', 'cap', 'ex', 'ideographic', 'ideographic-ink'] as EdgeValue[]).map(
                (v) => (
                  <button
                    key={v}
                    onClick={() => setOverEdge(v)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      overEdge === v
                        ? 'bg-purple-600/20 border-purple-500/60 text-purple-300'
                        : 'bg-slate-800/70 border-slate-700/50 text-slate-400 hover:border-slate-600'
                    }`}
                    title={overEdgeLabels[v]}
                  >
                    {v}
                  </button>
                )
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{overEdgeLabels[overEdge]}</p>
          </div>

          {/* text-box-edge: under */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              text-box-edge (under — bottom)
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                ['text', 'alphabetic', 'ideographic', 'ideographic-ink'] as UnderEdgeValue[]
              ).map((v) => (
                <button
                  key={v}
                  onClick={() => setUnderEdge(v)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    underEdge === v
                      ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-800/70 border-slate-700/50 text-slate-400 hover:border-slate-600'
                  }`}
                  title={underEdgeLabels[v]}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{underEdgeLabels[underEdge]}</p>
          </div>

          {/* Text properties */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Text Properties</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Text Content</label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Font Size</label>
                <input
                  type="text"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Line Height</label>
                <input
                  type="text"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Padding</label>
                <input
                  type="text"
                  value={padding}
                  onChange={(e) => setPadding(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none"
                >
                  <option value="system-ui, sans-serif">System UI</option>
                  <option value="'Inter', sans-serif">Inter</option>
                  <option value="'Georgia', serif">Georgia (serif)</option>
                  <option value="'Courier New', monospace">Courier New (mono)</option>
                  <option value="'Playfair Display', serif">Playfair Display</option>
                  <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Border Radius</label>
                <input
                  type="text"
                  value={borderRadius}
                  onChange={(e) => setBorderRadius(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Background</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Text Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-brand-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-6">
          {/* Toggle switches */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setShowBoundingBox(!showBoundingBox)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                showBoundingBox
                  ? 'bg-brand-600/20 border-brand-500/60 text-brand-300'
                  : 'bg-slate-800/70 border-slate-700/50 text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Bounding Boxes
            </button>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                showComparison
                  ? 'bg-brand-600/20 border-brand-500/60 text-brand-300'
                  : 'bg-slate-800/70 border-slate-700/50 text-slate-400'
              }`}
            >
              <GripHorizontal className="w-3.5 h-3.5" />
              Comparison View
            </button>
          </div>

          {/* CSS shorthand display */}
          <div className="p-4 rounded-lg bg-slate-800/70 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Generated CSS</span>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="space-y-2">
              <div className="p-2 rounded bg-brand-600/10 border border-brand-500/30">
                <code className="text-sm text-brand-300 font-mono">{textBoxShorthand}</code>
                <p className="text-[10px] text-brand-400/60 mt-1">Shorthand (recommended)</p>
              </div>
              <div className="p-2 rounded bg-slate-900/50 border border-slate-700/30">
                <code className="text-sm text-slate-400 font-mono whitespace-pre-wrap">{longform}</code>
                <p className="text-[10px] text-slate-500 mt-1">Longform (equivalent)</p>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Live Preview
            </h3>

            {showComparison ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Trimmed */}
                <div
                  className={`p-6 rounded-xl flex items-center justify-center min-h-[120px] ${
                    showBoundingBox ? 'bg-slate-800/30' : 'bg-transparent'
                  }`}
                  style={{ border: showBoundingBox ? '1px dashed #475569' : '1px solid transparent' }}
                >
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 mb-2 font-mono">
                      with text-box-trim
                    </p>
                    <div className="inline-flex flex-col items-center">
                      <span style={trimmedStyle}>{text}</span>
                      {showBoundingBox && (
                        <div className="mt-2 text-[9px] text-emerald-400/70 font-mono text-center">
                          trimmed
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Untrimmed */}
                <div
                  className={`p-6 rounded-xl flex items-center justify-center min-h-[120px] ${
                    showBoundingBox ? 'bg-slate-800/30' : 'bg-transparent'
                  }`}
                  style={{ border: showBoundingBox ? '1px dashed #475569' : '1px solid transparent' }}
                >
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 mb-2 font-mono">
                      without (default)
                    </p>
                    <div className="inline-flex flex-col items-center">
                      <span style={untrimmedStyle}>{text}</span>
                      {showBoundingBox && (
                        <div className="mt-2 text-[9px] text-rose-400/70 font-mono text-center">
                          half-leading visible
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`p-6 rounded-xl flex items-center justify-center min-h-[120px] ${
                  showBoundingBox ? 'bg-slate-800/30' : 'bg-transparent'
                }`}
                style={{ border: showBoundingBox ? '1px dashed #475569' : '1px solid transparent' }}
              >
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-2 font-mono">
                    {trim === 'none' ? 'Default (no trim)' : `text-box: ${trim} ${overEdge} ${underEdge}`}
                  </p>
                  <span style={trimmedStyle}>{text}</span>
                </div>
              </div>
            )}
          </div>

          {/* Full CSS output */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Code className="w-3.5 h-3.5" />
              Full CSS
            </h3>
            <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {fullCSS}
            </pre>
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="mt-12 p-6 rounded-xl bg-slate-800/50 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">What is text-box-trim?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div>
            <h4 className="font-medium text-slate-300 mb-1">The Problem</h4>
            <p>
              Every font ships with built-in half-leading — invisible space above and below text. 
              Even with <code className="bg-slate-700 px-1 rounded text-slate-300">line-height: 1</code>, 
              text sits slightly wrong in buttons, badges, and headings.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-1">The Solution</h4>
            <p>
              <code className="bg-slate-700 px-1 rounded text-slate-300">text-box-trim</code> removes 
              that space. Combine with <code className="bg-slate-700 px-1 rounded text-slate-300">text-box-edge</code> to 
              specify which font metrics to trim to: cap-height, alphabetic baseline, x-height, or ideographic edges.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-1">Browser Support</h4>
            <p>
              <strong className="text-emerald-400">Baseline 2026</strong> — Chrome 133+, Firefox 137+, 
              Safari 18.4+. Safe to use everywhere without fallbacks. 
              Degrades gracefully in older browsers.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
