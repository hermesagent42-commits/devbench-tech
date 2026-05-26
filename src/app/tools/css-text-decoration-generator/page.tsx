'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type DecorationStyle = 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';
type SkipInk = 'auto' | 'none' | 'all';

interface LineOption {
  key: string;
  label: string;
  cssValue: string;
}

interface DecorationConfig {
  lines: Set<string>;           // which of 'underline' | 'overline' | 'line-through' are active
  style: DecorationStyle;
  color: string;
  thickness: number;
  thicknessUnit: 'px' | 'auto' | 'from-font';
  underlineOffset: number;
  skipInk: SkipInk;
  sampleText: string;
}

interface Preset {
  name: string;
  description: string;
  config: Partial<DecorationConfig>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LINE_OPTIONS: LineOption[] = [
  { key: 'underline', label: 'Underline', cssValue: 'underline' },
  { key: 'overline', label: 'Overline', cssValue: 'overline' },
  { key: 'line-through', label: 'Line-through', cssValue: 'line-through' },
];

const STYLES: { value: DecorationStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'double', label: 'Double' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'wavy', label: 'Wavy' },
];

const SKIP_INK_OPTIONS: { value: SkipInk; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto (default)', description: 'Skip descenders like g, j, p, q, y' },
  { value: 'none', label: 'None', description: 'Draw through descenders (solid line)' },
  { value: 'all', label: 'All', description: 'Skip all glyphs (gaps in underline)' },
];

const THICKNESS_UNITS: { value: 'px' | 'auto' | 'from-font'; label: string }[] = [
  { value: 'px', label: 'px' },
  { value: 'auto', label: 'auto' },
  { value: 'from-font', label: 'from-font' },
];

const PRESETS: Preset[] = [
  {
    name: 'Classic Link',
    description: 'Standard web link underline',
    config: { lines: new Set(['underline']), style: 'solid', color: '#6366f1', thickness: 1, thicknessUnit: 'px', underlineOffset: 3, skipInk: 'auto' },
  },
  {
    name: 'Magazine Heading',
    description: 'Bold double underline for headings',
    config: { lines: new Set(['underline']), style: 'double', color: '#f59e0b', thickness: 3, thicknessUnit: 'px', underlineOffset: 6, skipInk: 'auto' },
  },
  {
    name: 'Wavy Error',
    description: 'Wavy red underline like spellcheck',
    config: { lines: new Set(['underline']), style: 'wavy', color: '#ef4444', thickness: 2, thicknessUnit: 'px', underlineOffset: 2, skipInk: 'auto' },
  },
  {
    name: 'Strikethrough',
    description: 'Classic strikethrough text',
    config: { lines: new Set(['line-through']), style: 'solid', color: '#94a3b8', thickness: 1, thicknessUnit: 'px', underlineOffset: 3, skipInk: 'auto' },
  },
  {
    name: 'Highlight Effect',
    description: 'Thick semi-transparent underline like a highlighter',
    config: { lines: new Set(['underline']), style: 'solid', color: 'rgba(250, 204, 21, 0.5)', thickness: 8, thicknessUnit: 'px', underlineOffset: 1, skipInk: 'none' },
  },
  {
    name: 'Overline Title',
    description: 'Overline for decorative headings',
    config: { lines: new Set(['overline']), style: 'solid', color: '#06b6d4', thickness: 2, thicknessUnit: 'px', underlineOffset: 3, skipInk: 'auto' },
  },
  {
    name: 'Dashed Annotation',
    description: 'Dashed underline for editing/markup',
    config: { lines: new Set(['underline']), style: 'dashed', color: '#a855f7', thickness: 2, thicknessUnit: 'px', underlineOffset: 4, skipInk: 'auto' },
  },
  {
    name: 'Crossed Out',
    description: 'Line-through + overline for removed content',
    config: { lines: new Set(['line-through', 'overline']), style: 'solid', color: '#ef4444', thickness: 2, thicknessUnit: 'px', underlineOffset: 3, skipInk: 'auto' },
  },
  {
    name: 'Brand Underline',
    description: 'Gradient-like thick offset underline',
    config: { lines: new Set(['underline']), style: 'solid', color: '#10b981', thickness: 4, thicknessUnit: 'px', underlineOffset: 8, skipInk: 'auto' },
  },
  {
    name: 'Dotted Code',
    description: 'Dotted underline for code snippets',
    config: { lines: new Set(['underline']), style: 'dotted', color: '#22d3ee', thickness: 1, thicknessUnit: 'px', underlineOffset: 3, skipInk: 'auto' },
  },
];

const DEFAULT_CONFIG: DecorationConfig = {
  lines: new Set(['underline']),
  style: 'solid',
  color: '#6366f1',
  thickness: 2,
  thicknessUnit: 'px',
  underlineOffset: 3,
  skipInk: 'auto',
  sampleText: 'The quick brown fox jumps over the lazy dog.',
};

// ── Style Preview Helper ──────────────────────────────────────────────────

function stylePreviewBar(style: DecorationStyle, color: string): React.CSSProperties {
  const pattern = style === 'wavy'
    ? undefined
    : style === 'dotted'
      ? 'dotted'
      : style === 'dashed'
        ? 'dashed'
        : 'solid';

  if (style === 'wavy') {
    return {
      width: '100%',
      height: '8px',
      background: `repeating-linear-gradient(45deg, transparent, transparent 3px, ${color} 3px, ${color} 4px, transparent 4px, transparent 7px, transparent, transparent 8px, ${color} 8px, ${color} 9px, transparent 9px, transparent 10px)`,
      borderRadius: '2px',
    };
  }

  return {
    width: '100%',
    height: style === 'double' ? '5px' : '3px',
    borderTop: pattern ? `2px ${pattern} ${color}` : 'none',
    background: style === 'double'
      ? `linear-gradient(${color} 0%, ${color} 2px, transparent 2px, transparent 3px, ${color} 3px, ${color} 5px)`
      : style === 'solid'
        ? color
        : undefined,
    borderRadius: '1px',
  };
}

// ── Toggle Line Button ────────────────────────────────────────────────────

function LineToggle({
  option,
  active,
  onToggle,
}: {
  option: LineOption;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
        active
          ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
          : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200 hover:border-slate-500/50'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-brand-400' : 'bg-slate-600'}`} />
      {option.label}
    </button>
  );
}

// ── Slider Control ────────────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  min = 0,
  max = 30,
  step = 1,
  unit = 'px',
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-300 font-mono tabular-nums min-w-[3rem] text-right">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

// ── Build CSS ─────────────────────────────────────────────────────────────

function buildDecorationCSS(config: DecorationConfig): string {
  const line = Array.from(config.lines).join(' ');
  if (!line) return '/* No decoration lines selected */';
  const parts: string[] = [];
  parts.push(`text-decoration-line: ${line};`);
  parts.push(`text-decoration-style: ${config.style};`);
  parts.push(`text-decoration-color: ${config.color};`);
  if (config.thicknessUnit === 'px') {
    parts.push(`text-decoration-thickness: ${config.thickness}px;`);
  } else {
    parts.push(`text-decoration-thickness: ${config.thicknessUnit};`);
  }
  if (config.lines.has('underline')) {
    parts.push(`text-underline-offset: ${config.underlineOffset}px;`);
  }
  if (config.skipInk !== 'auto') {
    parts.push(`text-decoration-skip-ink: ${config.skipInk};`);
  }
  return parts.join('\n');
}

function buildShorthandCSS(config: DecorationConfig): string {
  const line = Array.from(config.lines).join(' ');
  if (!line) return '/* No decoration lines selected */';
  const thicknessVal = config.thicknessUnit === 'px' ? `${config.thickness}px` : config.thicknessUnit;
  let shorthand = `text-decoration: ${line} ${config.style} ${thicknessVal} ${config.color}`;
  if (config.lines.has('underline') && config.underlineOffset !== 0) {
    shorthand += `;\ntext-underline-offset: ${config.underlineOffset}px`;
  }
  if (config.skipInk !== 'auto') {
    shorthand += `;\ntext-decoration-skip-ink: ${config.skipInk}`;
  }
  return shorthand + ';';
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSSTextDecorationGeneratorPage() {
  const [config, setConfig] = useState<DecorationConfig>({ ...DEFAULT_CONFIG, lines: new Set(DEFAULT_CONFIG.lines) });

  const toggleLine = useCallback((key: string) => {
    setConfig((prev) => {
      const next = new Set(prev.lines);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return { ...prev, lines: next };
    });
  }, []);

  const update = useCallback(<K extends keyof DecorationConfig>(key: K, value: DecorationConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setConfig((prev) => ({
      ...prev,
      lines: preset.config.lines ?? prev.lines,
      style: preset.config.style ?? prev.style,
      color: preset.config.color ?? prev.color,
      thickness: preset.config.thickness ?? prev.thickness,
      thicknessUnit: preset.config.thicknessUnit ?? prev.thicknessUnit,
      underlineOffset: preset.config.underlineOffset ?? prev.underlineOffset,
      skipInk: preset.config.skipInk ?? prev.skipInk,
    }));
  }, []);

  const reset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG, lines: new Set(DEFAULT_CONFIG.lines) });
  }, []);

  const longhandCSS = useMemo(() => buildDecorationCSS(config), [config]);
  const shorthandCSS = useMemo(() => buildShorthandCSS(config), [config]);

  const copy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied!`),
      () => toast.error('Failed to copy')
    );
  }, []);

  // Build inline decoration style for preview
  const previewStyle: React.CSSProperties = useMemo(() => {
    const line = Array.from(config.lines).join(' ');
    if (!line) return {};
    const thicknessVal = config.thicknessUnit === 'px' ? `${config.thickness}px` : config.thicknessUnit;
    const style: React.CSSProperties = {
      textDecorationLine: line as any,
      textDecorationStyle: config.style,
      textDecorationColor: config.color,
      textDecorationThickness: thicknessVal,
    };
    if (config.lines.has('underline')) {
      (style as any).textUnderlineOffset = `${config.underlineOffset}px`;
    }
    if (config.skipInk !== 'auto') {
      (style as any).textDecorationSkipInk = config.skipInk;
    }
    return style;
  }, [config]);

  return (
    <ToolLayout
      title="CSS Text Decoration Generator"
      description="Design text decorations — underline, overline, line-through with wavy, dotted, dashed styles. Control color, thickness, offset, and skip-ink. Copy ready-to-use CSS."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Presets</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lines */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Decoration Line</h2>
            <div className="flex flex-wrap gap-2">
              {LINE_OPTIONS.map((opt) => (
                <LineToggle
                  key={opt.key}
                  option={opt}
                  active={config.lines.has(opt.key)}
                  onToggle={() => toggleLine(opt.key)}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              You can combine multiple lines. At least one must remain active.
            </p>
          </div>

          {/* Style */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Style</h2>
            <div className="grid grid-cols-5 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => update('style', s.value)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-md text-xs transition-all ${
                    config.style === s.value
                      ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200 hover:border-slate-500/50'
                  }`}
                >
                  <div className="w-full max-w-[40px]">
                    <div style={stylePreviewBar(s.value, config.color)} />
                  </div>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Color</h2>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-600/50 shrink-0">
                <div
                  className="w-full h-full rounded-lg"
                  style={{ backgroundColor: config.color }}
                />
                <input
                  type="color"
                  value={config.color.startsWith('#') ? config.color : '#6366f1'}
                  onChange={(e) => update('color', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <input
                type="text"
                value={config.color}
                onChange={(e) => update('color', e.target.value)}
                className="input-field flex-1 text-sm font-mono"
                placeholder="#6366f1"
              />
            </div>
          </div>

          {/* Thickness */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Thickness</h2>
            <div className="flex gap-2 mb-3">
              {THICKNESS_UNITS.map((u) => (
                <button
                  key={u.value}
                  onClick={() => update('thicknessUnit', u.value)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                    config.thicknessUnit === u.value
                      ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
            {config.thicknessUnit === 'px' && (
              <SliderControl
                label="Thickness"
                value={config.thickness}
                min={1}
                max={20}
                onChange={(v) => update('thickness', v)}
              />
            )}
            {config.thicknessUnit === 'auto' && (
              <p className="text-xs text-slate-500">Uses the browser&apos;s default thickness based on the font.</p>
            )}
            {config.thicknessUnit === 'from-font' && (
              <p className="text-xs text-slate-500">Uses the thickness specified in the font file, if available.</p>
            )}
          </div>

          {/* Underline Offset (only when underline is active) */}
          {config.lines.has('underline') && (
            <div className="card space-y-3">
              <h2 className="text-white font-semibold text-sm">Underline Offset</h2>
              <SliderControl
                label="Offset"
                value={config.underlineOffset}
                min={-5}
                max={30}
                onChange={(v) => update('underlineOffset', v)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Distance between the text baseline and the underline. Negative values draw through the text.
              </p>
            </div>
          )}

          {/* Skip Ink */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Skip Ink</h2>
            <div className="space-y-2">
              {SKIP_INK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('skipInk', opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all ${
                    config.skipInk === opt.value
                      ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200 hover:border-slate-500/50'
                  }`}
                >
                  <span className="font-medium block">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all
          </button>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Live Preview</h2>
            <div
              className="flex items-center justify-center py-16 min-h-[200px] rounded-lg bg-[#0f172a]"
            >
              <div className="text-center max-w-md px-6">
                <p
                  className="text-2xl sm:text-3xl font-bold text-white leading-relaxed transition-all duration-150"
                  style={previewStyle}
                >
                  {config.sampleText}
                </p>
                <p className="text-xs text-slate-600 mt-6 font-mono">
                  font-size: 1.875rem &middot; font-weight: 700
                </p>
              </div>
            </div>
          </div>

          {/* Sample Text */}
          <div className="card space-y-2">
            <h2 className="text-white font-semibold text-sm">Sample Text</h2>
            <input
              type="text"
              value={config.sampleText}
              onChange={(e) => update('sampleText', e.target.value)}
              className="input-field w-full text-sm"
              placeholder="Enter sample text..."
            />
          </div>

          {/* CSS Output – Longhand */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS (Longhand)</h2>
              <button
                onClick={() => copy(longhandCSS, 'CSS')}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto">
              {longhandCSS || '/* No lines selected */'}
            </pre>
          </div>

          {/* CSS Output – Shorthand */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">
                CSS{' '}
                <code className="text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded text-xs">
                  shorthand
                </code>
              </h2>
              <button
                onClick={() => copy(shorthandCSS, 'Shorthand')}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto">
              {shorthandCSS || '/* No lines selected */'}
            </pre>
          </div>

          {/* Quick Reference */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Quick Reference</h2>
            <div className="text-xs text-slate-400 space-y-1.5 font-mono">
              <p><span className="text-slate-500">text-decoration-line:</span> <span className="text-green-400">underline</span> | <span className="text-green-400">overline</span> | <span className="text-green-400">line-through</span></p>
              <p><span className="text-slate-500">text-decoration-style:</span> <span className="text-green-400">solid</span> | <span className="text-green-400">double</span> | <span className="text-green-400">dotted</span> | <span className="text-green-400">dashed</span> | <span className="text-green-400">wavy</span></p>
              <p><span className="text-slate-500">text-decoration-color:</span> <span className="text-green-400">&lt;color&gt;</span></p>
              <p><span className="text-slate-500">text-decoration-thickness:</span> <span className="text-green-400">auto</span> | <span className="text-green-400">from-font</span> | <span className="text-green-400">&lt;length&gt;</span></p>
              <p><span className="text-slate-500">text-underline-offset:</span> <span className="text-green-400">&lt;length&gt;</span></p>
              <p><span className="text-slate-500">text-decoration-skip-ink:</span> <span className="text-green-400">auto</span> | <span className="text-green-400">none</span> | <span className="text-green-400">all</span></p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
