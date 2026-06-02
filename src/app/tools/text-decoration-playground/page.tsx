'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Code2, Type, Underline, Strikethrough, PaintBucket, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

type DecorationLine = 'underline' | 'overline' | 'line-through' | 'underline overline' | 'underline line-through';
type DecorationStyle = 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';
type SkipInk = 'auto' | 'none' | 'all';

interface Preset {
  name: string;
  line: DecorationLine;
  style: DecorationStyle;
  color: string;
  thickness: string;
  offset: string;
  skipInk: SkipInk;
  sampleText: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Classic Link',
    line: 'underline',
    style: 'solid',
    color: '#60a5fa',
    thickness: '2px',
    offset: '3px',
    skipInk: 'auto',
    sampleText: 'Click here to learn more about CSS text-decoration',
  },
  {
    name: 'Wavy Error',
    line: 'underline',
    style: 'wavy',
    color: '#ef4444',
    thickness: 'auto',
    offset: '2px',
    skipInk: 'auto',
    sampleText: 'This text has a misspeling error underneath it.',
  },
  {
    name: 'Double Emphasis',
    line: 'underline',
    style: 'double',
    color: '#a78bfa',
    thickness: '3px',
    offset: '5px',
    skipInk: 'auto',
    sampleText: 'IMPORTANT: Read this section carefully.',
  },
  {
    name: 'Dotted Annotation',
    line: 'underline',
    style: 'dotted',
    color: '#34d399',
    thickness: '2px',
    offset: '4px',
    skipInk: 'auto',
    sampleText: 'This term has a dotted tooltip annotation.',
  },
  {
    name: 'Strikethrough',
    line: 'line-through',
    style: 'solid',
    color: '#f87171',
    thickness: '2px',
    offset: 'auto',
    skipInk: 'auto',
    sampleText: 'This text has been deprecated and removed.',
  },
  {
    name: 'Overline Heading',
    line: 'overline',
    style: 'solid',
    color: '#fb923c',
    thickness: '3px',
    offset: '8px',
    skipInk: 'auto',
    sampleText: 'Section Title with Overline',
  },
  {
    name: 'Dashed Highlight',
    line: 'underline',
    style: 'dashed',
    color: '#fbbf24',
    thickness: '2px',
    offset: '2px',
    skipInk: 'auto',
    sampleText: 'This phrase is highlighted with a dashed underline.',
  },
  {
    name: 'Thick Brand',
    line: 'underline',
    style: 'solid',
    color: '#2dd4bf',
    thickness: '4px',
    offset: '6px',
    skipInk: 'none',
    sampleText: 'Brand Heading with Thick Underline',
  },
];

const LINE_OPTIONS: { value: DecorationLine; label: string }[] = [
  { value: 'underline', label: 'Underline' },
  { value: 'overline', label: 'Overline' },
  { value: 'line-through', label: 'Line-through' },
  { value: 'underline overline', label: 'Under + Over' },
  { value: 'underline line-through', label: 'Under + Through' },
];

const STYLE_OPTIONS: { value: DecorationStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'double', label: 'Double' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'wavy', label: 'Wavy' },
];

const SKIP_INK_OPTIONS: { value: SkipInk; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Skip descenders (g, j, p, q, y)' },
  { value: 'none', label: 'None', desc: 'Draw through all glyphs' },
  { value: 'all', label: 'All', desc: 'Skip all glyph ink (only gap between chars)' },
];

export default function TextDecorationPlayground() {
  const [line, setLine] = useState<DecorationLine>('underline');
  const [style, setStyle] = useState<DecorationStyle>('solid');
  const [color, setColor] = useState('#60a5fa');
  const [thickness, setThickness] = useState('2px');
  const [offset, setOffset] = useState('3px');
  const [skipInk, setSkipInk] = useState<SkipInk>('auto');
  const [sampleText, setSampleText] = useState('Click here to learn more about CSS text-decoration');
  const [copied, setCopied] = useState(false);
  const [copiedShorthand, setCopiedShorthand] = useState(false);

  const handlePreset = useCallback((preset: Preset) => {
    setLine(preset.line);
    setStyle(preset.style);
    setColor(preset.color);
    setThickness(preset.thickness);
    setOffset(preset.offset);
    setSkipInk(preset.skipInk);
    setSampleText(preset.sampleText);
  }, []);

  const decorationStyle = useMemo(() => ({
    textDecorationLine: line,
    textDecorationStyle: style,
    textDecorationColor: color,
    textDecorationThickness: thickness === 'auto' ? 'auto' : thickness,
    textUnderlineOffset: offset === 'auto' ? undefined : offset,
    textDecorationSkipInk: skipInk,
  }), [line, style, color, thickness, offset, skipInk]);

  const longhandCss = useMemo(() => {
    const lines: string[] = [];
    lines.push(`text-decoration-line: ${line};`);
    lines.push(`text-decoration-style: ${style};`);
    lines.push(`text-decoration-color: ${color};`);
    if (thickness !== 'auto') lines.push(`text-decoration-thickness: ${thickness};`);
    if (offset !== 'auto') lines.push(`text-underline-offset: ${offset};`);
    if (skipInk !== 'auto') lines.push(`text-decoration-skip-ink: ${skipInk};`);
    return lines.join('\n');
  }, [line, style, color, thickness, offset, skipInk]);

  const shorthandCss = useMemo(() => {
    let shorthand = `text-decoration: ${line} ${style} ${color}`;
    if (thickness !== 'auto') shorthand += ` ${thickness}`;
    shorthand += ';';
    const extra: string[] = [];
    if (offset !== 'auto') extra.push(`text-underline-offset: ${offset};`);
    if (skipInk !== 'auto') extra.push(`text-decoration-skip-ink: ${skipInk};`);
    return [shorthand, ...extra].join('\n');
  }, [line, style, color, thickness, offset, skipInk]);

  const copyLonghand = useCallback(() => {
    navigator.clipboard.writeText(longhandCss);
    setCopied(true);
    toast.success('Longhand CSS copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [longhandCss]);

  const copyShorthand = useCallback(() => {
    navigator.clipboard.writeText(shorthandCss);
    setCopiedShorthand(true);
    toast.success('Shorthand CSS copied!');
    setTimeout(() => setCopiedShorthand(false), 2000);
  }, [shorthandCss]);

  return (
    <ToolLayout
      title="CSS Text Decoration Playground"
      description="Visually design text decorations — underline, overline, line-through with solid, double, dotted, dashed, and wavy styles. Control color, thickness, offset, and skip-ink. Live preview, longhand + shorthand CSS output."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">PRESETS:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className="px-2.5 py-1 text-xs rounded-full border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-5">
          {/* Line type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Underline className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
              Line Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLine(opt.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    line === opt.value
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <PaintBucket className="w-3.5 h-3.5 inline mr-1.5 text-purple-400" />
              Decoration Style
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStyle(opt.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    style === opt.value
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <PaintBucket className="w-3.5 h-3.5 inline mr-1.5 text-pink-400" />
              Line Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600 bg-slate-800 cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 font-mono focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
              />
              <div className="flex gap-1">
                {['#60a5fa', '#ef4444', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#2dd4bf', '#f472b6'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full border border-slate-500 hover:scale-110 transition-transform"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Thickness */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <GripHorizontal className="w-3.5 h-3.5 inline mr-1.5 text-yellow-400" />
              Thickness
            </label>
            <div className="flex items-center gap-2">
              <select
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-brand-500/50 outline-none"
              >
                <option value="auto">auto (from font)</option>
                <option value="1px">1px</option>
                <option value="2px">2px</option>
                <option value="3px">3px</option>
                <option value="4px">4px</option>
                <option value="0.1em">0.1em</option>
                <option value="0.15em">0.15em</option>
                <option value="0.2em">0.2em</option>
                <option value="from-font">from-font</option>
              </select>
              {thickness !== 'auto' && thickness !== 'from-font' && (
                <input
                  type="text"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  className="w-20 px-2.5 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 font-mono focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
                />
              )}
            </div>
          </div>

          {/* Offset */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Underline Offset (distance from text)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-5"
                max="20"
                step="1"
                value={offset === 'auto' ? 3 : parseInt(offset) || 3}
                onChange={(e) => setOffset(`${e.target.value}px`)}
                className="flex-1 accent-brand-500"
              />
              <select
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-brand-500/50 outline-none min-w-[90px]"
              >
                <option value="auto">auto</option>
                <option value="-4px">-4px</option>
                <option value="-2px">-2px</option>
                <option value="0px">0px</option>
                <option value="2px">2px</option>
                <option value="3px">3px</option>
                <option value="4px">4px</option>
                <option value="6px">6px</option>
                <option value="8px">8px</option>
                <option value="10px">10px</option>
                <option value="12px">12px</option>
                <option value="16px">16px</option>
                <option value="20px">20px</option>
              </select>
            </div>
          </div>

          {/* skip-ink */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Skip Ink (glyph descender handling)
            </label>
            <div className="flex flex-wrap gap-2">
              {SKIP_INK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSkipInk(opt.value)}
                  title={opt.desc}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    skipInk === opt.value
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Controls whether underlines skip around glyph descenders (the tails on g, j, p, q, y).
            </p>
          </div>

          {/* Sample text */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Type className="w-3.5 h-3.5 inline mr-1.5 text-green-400" />
              Sample Text
            </label>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none resize-y"
            />
          </div>
        </div>

        {/* Right: Preview + CSS */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <EyeIcon className="w-3.5 h-3.5 inline mr-1.5 text-yellow-400" />
              Live Preview
            </label>
            <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center min-h-[120px]">
              <p
                className="text-xl font-medium text-center leading-relaxed max-w-md"
                style={decorationStyle as React.CSSProperties}
              >
                {sampleText}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1 text-center">
              The preview uses your browser engine&apos;s native text-decoration rendering.
            </p>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                <Code2 className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
                Longhand CSS (individual properties)
              </label>
              <button
                onClick={copyLonghand}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-xs text-green-300 font-mono overflow-x-auto">
              {longhandCss}
            </pre>
          </div>

          {/* Shorthand CSS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                <Code2 className="w-3.5 h-3.5 inline mr-1.5 text-orange-400" />
                Shorthand CSS
              </label>
              <button
                onClick={copyShorthand}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {copiedShorthand ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedShorthand ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-xs text-orange-300 font-mono overflow-x-auto">
              {shorthandCss}
            </pre>
          </div>
        </div>
      </div>

      {/* Property Reference */}
      <div className="mt-10 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <h3 className="text-base font-semibold text-slate-200 mb-3">Text Decoration Properties Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-brand-300 mb-1">text-decoration-line</h4>
            <p className="text-xs text-slate-400">
              <code className="text-brand-400 bg-slate-800 px-1 rounded">underline</code>,{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">overline</code>,{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">line-through</code>, or combinations.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-purple-300 mb-1">text-decoration-style</h4>
            <p className="text-xs text-slate-400">
              <code className="text-brand-400 bg-slate-800 px-1 rounded">solid</code>,{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">double</code>,{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">dotted</code>,{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">dashed</code>,{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">wavy</code>
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-pink-300 mb-1">text-decoration-color</h4>
            <p className="text-xs text-slate-400">
              Any CSS color value. Different from <code className="text-brand-400 bg-slate-800 px-1 rounded">color</code> —
              the line can have a different color than the text.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-300 mb-1">text-decoration-thickness</h4>
            <p className="text-xs text-slate-400">
              <code className="text-brand-400 bg-slate-800 px-1 rounded">auto</code>,{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">from-font</code>, or explicit{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">px</code> /{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">em</code> values.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-green-300 mb-1">text-underline-offset</h4>
            <p className="text-xs text-slate-400">
              Distance between text baseline and the underline. Can use negative values to draw above descenders.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-orange-300 mb-1">text-decoration-skip-ink</h4>
            <p className="text-xs text-slate-400">
              <code className="text-brand-400 bg-slate-800 px-1 rounded">auto</code> skips glyph descenders;{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">none</code> draws through all characters.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// Simple inline Eye icon to avoid extra import
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
