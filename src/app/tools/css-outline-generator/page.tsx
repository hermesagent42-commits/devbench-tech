'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type OutlineStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'inset'
  | 'outset'
  | 'none';

interface OutlineConfig {
  width: number;
  style: OutlineStyle;
  color: string;
  offset: number;
}

interface Preset {
  name: string;
  description: string;
  config: OutlineConfig;
}

// ── Constants ──────────────────────────────────────────────────────────────

const OUTLINE_STYLES: { value: OutlineStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
  { value: 'groove', label: 'Groove' },
  { value: 'ridge', label: 'Ridge' },
  { value: 'inset', label: 'Inset' },
  { value: 'outset', label: 'Outset' },
  { value: 'none', label: 'None' },
];

const PRESETS: Preset[] = [
  {
    name: 'Focus Ring',
    description: 'Accessible focus indicator for keyboard nav',
    config: {
      width: 3,
      style: 'solid',
      color: '#6366f1',
      offset: 2,
    },
  },
  {
    name: 'Debug Outline',
    description: 'Bright red outline for layout debugging',
    config: {
      width: 2,
      style: 'solid',
      color: '#ef4444',
      offset: 0,
    },
  },
  {
    name: 'Subtle Border',
    description: 'Thin, understated outline',
    config: {
      width: 1,
      style: 'solid',
      color: '#94a3b8',
      offset: 0,
    },
  },
  {
    name: 'Retro Double',
    description: 'Double outline reminiscent of classic UIs',
    config: {
      width: 4,
      style: 'double',
      color: '#f59e0b',
      offset: 2,
    },
  },
  {
    name: 'Inset Glow',
    description: 'Inset outline creates a recessed look',
    config: {
      width: 3,
      style: 'inset',
      color: '#10b981',
      offset: 4,
    },
  },
  {
    name: 'Dashed Guide',
    description: 'Dashed outline for design mockups',
    config: {
      width: 2,
      style: 'dashed',
      color: '#06b6d4',
      offset: 2,
    },
  },
  {
    name: 'Dotted Tag',
    description: 'Dotted outline for tag/chip elements',
    config: {
      width: 2,
      style: 'dotted',
      color: '#a855f7',
      offset: 1,
    },
  },
  {
    name: 'Thick Groove',
    description: 'Groove style for 3D embossed effect',
    config: {
      width: 5,
      style: 'groove',
      color: '#e2e8f0',
      offset: 0,
    },
  },
  {
    name: 'Ridge Frame',
    description: 'Ridge style for raised 3D effect',
    config: {
      width: 4,
      style: 'ridge',
      color: '#cbd5e1',
      offset: 1,
    },
  },
  {
    name: 'Negative Offset',
    description: 'Inward offset for inner highlight',
    config: {
      width: 2,
      style: 'solid',
      color: '#22d3ee',
      offset: -4,
    },
  },
];

const DEFAULT_CONFIG: OutlineConfig = {
  width: 3,
  style: 'solid',
  color: '#6366f1',
  offset: 2,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function buildCSS(config: OutlineConfig): string {
  const lines: string[] = [];
  lines.push(`outline: ${config.width}px ${config.style} ${config.color};`);
  if (config.offset !== 0) {
    lines.push(`outline-offset: ${config.offset}px;`);
  }
  return lines.join('\n');
}

function buildFocusCSS(config: OutlineConfig): string {
  const lines: string[] = [];
  lines.push(':focus-visible {');
  lines.push(`  outline: ${config.width}px ${config.style} ${config.color};`);
  if (config.offset !== 0) {
    lines.push(`  outline-offset: ${config.offset}px;`);
  }
  lines.push('}');
  return lines.join('\n');
}

// ── Helper: render style preview in chips ──────────────────────────────────

function stylePreview(style: OutlineStyle, colorHex: string, width: number): React.CSSProperties {
  const borderStyle = style === 'none' ? 'solid' : style;
  return {
    width: '100%',
    height: '4px',
    borderTop: `${width > 4 ? 3 : 2}px ${borderStyle} ${colorHex}`,
    marginTop: '2px',
    borderRadius: style === 'none' ? '0' : '1px',
  };
}

// ── Slider sub-component ───────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  min = 0,
  max = 20,
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

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSSOutlineGeneratorPage() {
  const [config, setConfig] = useState<OutlineConfig>({ ...DEFAULT_CONFIG });
  const [showOutline, setShowOutline] = useState(true);

  const css = useMemo(() => buildCSS(config), [config]);
  const focusCSS = useMemo(() => buildFocusCSS(config), [config]);

  const update = useCallback(<K extends keyof OutlineConfig>(key: K, value: OutlineConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setConfig({ ...preset.config });
  }, []);

  const reset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG });
    setShowOutline(true);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [css]);

  const copyFocusCSS = useCallback(() => {
    navigator.clipboard.writeText(focusCSS).then(
      () => toast.success('Focus CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [focusCSS]);

  const previewOutlineStyle: React.CSSProperties = showOutline
    ? {
        outline: `${config.width}px ${config.style} ${config.color}`,
        outlineOffset: `${config.offset}px`,
      }
    : {};

  return (
    <ToolLayout
      title="CSS Outline Generator"
      description="Design accessible focus rings, debug outlines, and decorative borders. Customize width, style, color, and offset — copy ready-to-use CSS."
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

          {/* Outline Width */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Width</h2>
            <SliderControl
              label="Outline Width"
              value={config.width}
              min={0}
              max={20}
              onChange={(v) => update('width', v)}
            />
          </div>

          {/* Outline Style */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Style</h2>
            <div className="grid grid-cols-3 gap-2">
              {OUTLINE_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => update('style', s.value)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-md text-xs transition-all ${
                    config.style === s.value
                      ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200 hover:border-slate-500/50'
                  }`}
                >
                  <div
                    className="w-full max-w-[48px]"
                    style={stylePreview(s.value, config.color, config.width)}
                  />
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
                  value={config.color}
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

          {/* Offset */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Offset</h2>
            <SliderControl
              label="Outline Offset"
              value={config.offset}
              min={-10}
              max={20}
              onChange={(v) => update('offset', v)}
            />
            <p className="text-xs text-slate-500 mt-2">
              Negative values draw the outline inward, positive values push it outward.
            </p>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Preview</h2>
              <button
                onClick={() => setShowOutline((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${
                  showOutline
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                {showOutline ? (
                  <>
                    <Eye className="w-3 h-3" /> Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" /> Hidden
                  </>
                )}
              </button>
            </div>
            <div
              className="flex items-center justify-center py-12 min-h-[220px] rounded-lg relative"
              style={{ background: '#0f172a' }}
            >
              {/* Grid background */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
              {/* Preview box */}
              <div
                className="transition-all duration-150 relative flex items-center justify-center"
                style={{
                  width: '200px',
                  height: '140px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
                  ...previewOutlineStyle,
                }}
              >
                <span className="text-slate-300 text-sm font-medium">Sample Element</span>

                {/* Offset indicator when offset is non-zero */}
                {showOutline && config.offset !== 0 && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: config.offset > 0
                        ? `${-config.offset - config.width - 6}px`
                        : `${-config.width - 6}px`,
                      border: '1px dashed rgba(99, 102, 241, 0.25)',
                      borderRadius: `${12 + Math.max(0, config.offset) + config.width + 6}px`,
                    }}
                  >
                    <span
                      className="absolute text-[10px] font-mono text-brand-400/60"
                      style={
                        config.offset > 0
                          ? { top: -16, left: 4 }
                          : { top: 4, right: -32 }
                      }
                    >
                      {config.offset > 0 ? `${config.offset}px offset` : `${Math.abs(config.offset)}px inward`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CSS Output - element */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS</h2>
              <button
                onClick={copyCSS}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto">
              {css}
            </pre>
          </div>

          {/* CSS Output - focus-visible */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">
                <code className="text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded text-xs">
                  :focus-visible
                </code>{' '}
                Snippet
              </h2>
              <button
                onClick={copyFocusCSS}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-32 overflow-y-auto">
              {focusCSS}
            </pre>
          </div>

          {/* Info card */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">About Outline</h2>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p>
                Unlike <code className="text-brand-300 bg-brand-500/10 px-1 py-0.5 rounded">border</code>,
                <code className="text-brand-300 bg-brand-500/10 px-1 py-0.5 rounded">outline</code> is drawn{' '}
                <strong className="text-slate-300">outside</strong> the element and does not affect layout or
                size. It does not participate in the box model.
              </p>
              <p>
                Outlines are essential for <strong className="text-slate-300">accessibility</strong> &mdash;
                they provide visual feedback for keyboard navigation. Use{' '}
                <code className="text-brand-300 bg-brand-500/10 px-1 py-0.5 rounded">:focus-visible</code>
                {' '}to show outlines only when the user is navigating by keyboard.
              </p>
              <p>
                <code className="text-brand-300 bg-brand-500/10 px-1 py-0.5 rounded">outline-offset</code> controls
                the gap between the outline and the element&apos;s border edge. Negative values pull the outline inward.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
