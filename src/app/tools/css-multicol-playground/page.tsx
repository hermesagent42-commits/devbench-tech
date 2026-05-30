'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Columns, GripHorizontal, Palette, Ruler, Sparkles, AlignJustify, FileText, Eye, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface MultiColConfig {
  columnCount: number;
  columnWidth: string;
  columnGap: number;
  ruleWidth: number;
  ruleStyle: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';
  ruleColor: string;
  spanMode: 'none' | 'all';
  fillMode: 'auto' | 'balance' | 'balance-all';
  textAlign: 'left' | 'center' | 'justify';
  previewWidth: number;
  gapUnit: 'px' | 'rem' | 'em';
  fontSize: number;
}

interface Preset {
  name: string;
  icon: string;
  description: string;
  config: MultiColConfig;
}

const UNIT_BASES: Record<string, number> = { px: 1, rem: 16, em: 16 };

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Newspaper',
    icon: '📰',
    description: 'Classic narrow columns, justified text, thin rules.',
    config: {
      columnCount: 3,
      columnWidth: 'auto',
      columnGap: 24,
      ruleWidth: 1,
      ruleStyle: 'solid',
      ruleColor: '#475569',
      spanMode: 'none',
      fillMode: 'balance',
      textAlign: 'justify',
      previewWidth: 800,
      gapUnit: 'px',
      fontSize: 14,
    },
  },
  {
    name: 'Magazine',
    icon: '📖',
    description: 'Two wide columns for feature articles, no rules.',
    config: {
      columnCount: 2,
      columnWidth: 'auto',
      columnGap: 40,
      ruleWidth: 0,
      ruleStyle: 'none',
      ruleColor: 'transparent',
      spanMode: 'all',
      fillMode: 'balance',
      textAlign: 'left',
      previewWidth: 750,
      gapUnit: 'px',
      fontSize: 15,
    },
  },
  {
    name: 'Dictionary',
    icon: '📚',
    description: 'Many narrow columns, tiny text — maximize density.',
    config: {
      columnCount: 4,
      columnWidth: 'auto',
      columnGap: 16,
      ruleWidth: 1,
      ruleStyle: 'solid',
      ruleColor: '#334155',
      spanMode: 'none',
      fillMode: 'auto',
      textAlign: 'left',
      previewWidth: 900,
      gapUnit: 'px',
      fontSize: 12,
    },
  },
  {
    name: 'Academic',
    icon: '🎓',
    description: 'Two-column justified layout with dotted rules.',
    config: {
      columnCount: 2,
      columnWidth: 'auto',
      columnGap: 32,
      ruleWidth: 2,
      ruleStyle: 'dotted',
      ruleColor: '#64748b',
      spanMode: 'all',
      fillMode: 'balance',
      textAlign: 'justify',
      previewWidth: 700,
      gapUnit: 'px',
      fontSize: 14,
    },
  },
  {
    name: 'Brochure',
    icon: '📄',
    description: 'Three equal columns split by decorative double rules.',
    config: {
      columnCount: 3,
      columnWidth: 'auto',
      columnGap: 28,
      ruleWidth: 3,
      ruleStyle: 'double',
      ruleColor: '#38bdf8',
      spanMode: 'none',
      fillMode: 'balance',
      textAlign: 'left',
      previewWidth: 820,
      gapUnit: 'px',
      fontSize: 14,
    },
  },
  {
    name: 'Triptych',
    icon: '🖼️',
    description: 'Three wide columns with large gaps for visual breathing room.',
    config: {
      columnCount: 3,
      columnWidth: 'auto',
      columnGap: 48,
      ruleWidth: 0,
      ruleStyle: 'none',
      ruleColor: 'transparent',
      spanMode: 'none',
      fillMode: 'balance',
      textAlign: 'left',
      previewWidth: 900,
      gapUnit: 'px',
      fontSize: 15,
    },
  },
];

// ── Sample Content ──────────────────────────────────────────────────────────

const SAMPLE_TITLE = 'The Art of CSS Multi-Column Layouts';

const SAMPLE_PARAGRAPHS = [
  `For centuries, the multi-column format has been the gold standard of readable typography. Newspapers, magazines, and academic journals all use columns to present text in digestible, scannable chunks. The human eye tracks best across lines of roughly 45–75 characters, and columns help constrain line length naturally.`,

  `CSS Multi-column Layout — the "multicol" module — brings this typographic tradition to the web. With just a handful of properties, you can transform any block of content into a newspaper-style layout that flows text automatically across columns, balancing between them intelligently.`,

  `The core properties are column-count and column-width. Setting column-count: 3 splits the content into three columns; setting column-width: 250px tells the browser "make as many 250px-wide columns as fit." Combining both gives you a responsive sweet spot: the browser creates columns of at least the specified width, up to the specified count.`,

  `Between columns, you can place rules — decorative lines using column-rule-width, column-rule-style, and column-rule-color. These are shorthand-friendly (column-rule: 2px solid #ccc) and behave exactly like borders, supporting solid, dashed, dotted, double, groove, ridge, inset, and outset styles.`,

  `The column-gap property controls the space between columns. Unlike old CSS that used a separate column-gap property in the multicol spec, modern CSS unifies gaps with the gap shorthand that also works in Grid and Flexbox. The browser default is typically 1em.`,

  `For special content like headings or images that should stretch across all columns, column-span: all does exactly that. This creates a natural break in the column flow — the spanned element occupies the full width before columns resume below it.`,

  `Column balancing is controlled by column-fill. The default auto fills columns sequentially until they overflow, which can leave the last column shorter. Setting column-fill: balance distributes content evenly across all columns — a feature Firefox pioneered and Chrome later adopted.`,

  `Fragmentation within columns is subtle. The browser decides where to break content between columns, but you can influence it with break-inside: avoid on elements that should stay together. Widows and orphans control how many lines can be left dangling at column boundaries.`,

  `In responsive design, columns shine. On wide screens, you get 3–4 columns for comfortable reading; on tablets, 2 columns; on phones, a single column. All from the same CSS — no media queries needed when using column-width.`,

  `Performance-wise, multicol layout is highly optimized. The browser's layout engine handles column balancing and fragmentation natively, without the overhead of JavaScript-based column polyfills. It's hardware-accelerated and works seamlessly with other CSS features like transforms, filters, and backdrop-filter.`,

  `Browser support for CSS multi-column is excellent. Every modern browser — Chrome, Firefox, Safari, and Edge — fully supports the multicol spec. Even IE 10+ had basic support. There's no reason not to use it in production today.`,

  `The most common pitfall is overflow. If a single word is wider than a column, it'll poke out. Fix this with overflow-wrap: break-word or word-break: break-all on the container. Similarly, images wider than their column need max-width: 100%.`,

  `For print stylesheets, multi-column layout truly shines. Print media loves columns — think of any newspaper or magazine. Combined with @page rules and page-break controls, CSS multicol in print produces professional results that rival desktop publishing tools.`,

  `Design systems benefit from multi-column utilities. A .multicol-2, .multicol-3 class approach lets teams apply columns consistently. Combined with CSS custom properties, you can theme column gaps, rule colors, and break behavior across an entire application.`,

  `The future of multicol is even brighter. The CSS Working Group is exploring column-span: all but-first/last for spanning only certain rows, and more granular fragmentation controls. The gap between web layout and print layout continues to narrow.`,

  `In short: CSS multi-column layout is one of the most underused yet powerful tools in the web platform. It's standards-track, universally supported, performant, and trivially easy to implement. If you're not using it somewhere in your projects, you're leaving beautiful typography on the table.`,
];

const RULE_STYLES: MultiColConfig['ruleStyle'][] = [
  'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset',
];

const RULE_STYLE_LABELS: Record<string, string> = {
  none: 'None',
  solid: 'Solid',
  dashed: 'Dashed',
  dotted: 'Dotted',
  double: 'Double',
  groove: 'Groove',
  ridge: 'Ridge',
  inset: 'Inset',
  outset: 'Outset',
};

// ── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: MultiColConfig = {
  columnCount: 3,
  columnWidth: 'auto',
  columnGap: 24,
  ruleWidth: 1,
  ruleStyle: 'solid',
  ruleColor: '#475569',
  spanMode: 'all',
  fillMode: 'balance',
  textAlign: 'left',
  previewWidth: 800,
  gapUnit: 'px',
  fontSize: 14,
};

// ── Component ───────────────────────────────────────────────────────────────

export default function CssMulticolPlayground() {
  const [config, setConfig] = useState<MultiColConfig>(DEFAULT_CONFIG);

  const updateConfig = useCallback(
    (patch: Partial<MultiColConfig>) => setConfig((prev) => ({ ...prev, ...patch })),
    [],
  );

  const reset = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  const applyPreset = useCallback((preset: Preset) => setConfig({ ...preset.config }), []);

  // ── CSS Generation ────────────────────────────────────────────────────────

  const generatedCSS = useMemo(() => {
    const lines: string[] = [];
    lines.push('.multicol-container {');

    if (config.columnWidth === 'auto' || !config.columnWidth) {
      lines.push(`  column-count: ${config.columnCount};`);
    } else {
      lines.push(`  column-width: ${config.columnWidth};`);
    }

    const gapVal = config.columnGap + config.gapUnit;
    lines.push(`  column-gap: ${gapVal};`);
    lines.push(`  column-fill: ${config.fillMode};`);

    if (config.ruleStyle !== 'none' && config.ruleWidth > 0) {
      const ruleWidth = config.ruleWidth + 'px';
      lines.push(`  column-rule: ${ruleWidth} ${config.ruleStyle} ${config.ruleColor};`);
    }

    if (config.textAlign !== 'left') {
      lines.push(`  text-align: ${config.textAlign};`);
    }

    if (config.fontSize !== 16) {
      lines.push(`  font-size: ${config.fontSize}px;`);
    }

    lines.push('}');

    if (config.spanMode === 'all') {
      lines.push('');
      lines.push('.multicol-container h2,');
      lines.push('.multicol-container .span-all {');
      lines.push('  column-span: all;');
      lines.push('}');
    }

    return lines.join('\n');
  }, [config]);

  const tailwindCSS = useMemo(() => {
    const classes: string[] = [];
    if (config.columnWidth === 'auto' || !config.columnWidth) {
      // Tailwind doesn't have column-count utilities natively,
      // but you can use arbitrary values
      classes.push(`[column-count:${config.columnCount}]`);
    } else {
      classes.push(`[column-width:${config.columnWidth}]`);
    }
    const gapVal = config.columnGap + config.gapUnit;
    classes.push(`[column-gap:${gapVal}]`);
    classes.push(`[column-fill:${config.fillMode}]`);

    if (config.ruleStyle !== 'none' && config.ruleWidth > 0) {
      classes.push(`[column-rule:${config.ruleWidth}px_${config.ruleStyle}_${config.ruleColor.replace('#', '%23')}]`);
    }

    if (config.textAlign !== 'left') {
      classes.push(`text-${config.textAlign}`);
    }

    return classes.join(' ');
  }, [config]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS).then(
      () => toast.success('CSS copied to clipboard!'),
      () => toast.error('Failed to copy'),
    );
  }, [generatedCSS]);

  const copyTailwind = useCallback(() => {
    navigator.clipboard.writeText(tailwindCSS).then(
      () => toast.success('Tailwind classes copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [tailwindCSS]);

  // ── Preview Style ─────────────────────────────────────────────────────────

  const previewStyle = useMemo((): React.CSSProperties => {
    const style: React.CSSProperties = {
      maxWidth: config.previewWidth + 'px',
      fontSize: config.fontSize + 'px',
      textAlign: config.textAlign,
      columnFill: config.fillMode as any,
      columnGap: config.columnGap + config.gapUnit,
    };

    if (config.columnWidth === 'auto' || !config.columnWidth) {
      style.columnCount = config.columnCount;
    } else {
      style.columnWidth = config.columnWidth;
    }

    if (config.ruleStyle !== 'none' && config.ruleWidth > 0) {
      style.columnRule = `${config.ruleWidth}px ${config.ruleStyle} ${config.ruleColor}`;
    }

    return style;
  }, [config]);

  // ── Preview scaling ───────────────────────────────────────────────────────

  const scale = useMemo(() => {
    if (config.previewWidth <= 600) return 1;
    if (config.previewWidth <= 750) return Math.min(1, 700 / config.previewWidth);
    return Math.min(1, 750 / config.previewWidth);
  }, [config.previewWidth]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Multi-Column Layout Playground"
      description="Visually explore column-count, column-width, column-gap, column-rule, column-span, and column-fill. Build newspaper, magazine, and dictionary layouts with live preview and instant CSS output."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              updateConfig({ columnCount: Math.max(1, config.columnCount - 1) })
            }
            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            title="Fewer columns"
          >
            <Columns className="w-4 h-4 rotate-90" />
          </button>
          <span className="text-sm text-slate-300 font-mono min-w-[3ch] text-center">
            {config.columnCount}
          </span>
          <button
            onClick={() => updateConfig({ columnCount: Math.min(6, config.columnCount + 1) })}
            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            title="More columns"
          >
            <Columns className="w-4 h-4 -rotate-90" />
          </button>
          <div className="w-px h-6 bg-slate-600 mx-1" />
          <button onClick={reset} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300" title="Reset to defaults">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* ── Presets ──────────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            Presets
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRESETS.map((preset) => {
              const isActive =
                config.columnCount === preset.config.columnCount &&
                config.columnGap === preset.config.columnGap &&
                config.ruleStyle === preset.config.ruleStyle &&
                config.ruleWidth === preset.config.ruleWidth &&
                config.spanMode === preset.config.spanMode &&
                config.textAlign === preset.config.textAlign;
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isActive
                      ? 'border-brand-400 bg-brand-400/10 text-brand-300'
                      : 'border-slate-700 bg-surface-light hover:border-slate-600 text-slate-300'
                  }`}
                  title={preset.description}
                >
                  <div className="text-lg mb-1">{preset.icon}</div>
                  <div className="text-xs font-semibold">{preset.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{preset.description}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Live Preview ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-400" />
            Live Preview
            <span className="text-xs font-normal text-slate-500 ml-auto">
              {config.previewWidth}px container
            </span>
          </h3>
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 overflow-x-auto">
            <div className="flex justify-center">
              <div
                className="rounded-lg border border-slate-600/50 bg-[#0f1117] p-6"
                style={{
                  width: config.previewWidth + 'px',
                  transform: scale < 1 ? `scale(${scale})` : undefined,
                  transformOrigin: 'top center',
                }}
              >
                <div style={previewStyle} className="preview-content">
                  <h2
                    style={{
                      fontSize: config.fontSize * 1.6 + 'px',
                      fontWeight: 700,
                      marginBottom: '0.75em',
                      lineHeight: 1.2,
                      color: '#e2e8f0',
                      columnSpan: config.spanMode === 'all' ? 'all' : 'none',
                    }}
                  >
                    {SAMPLE_TITLE}
                  </h2>
                  {SAMPLE_PARAGRAPHS.map((text, i) => (
                    <p
                      key={i}
                      style={{
                        marginBottom: '0.75em',
                        lineHeight: 1.65,
                        color: '#94a3b8',
                        orphans: 2,
                        widows: 2,
                      }}
                    >
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Controls Grid ────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-400" />
            Controls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Column Count */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <Columns className="w-3.5 h-3.5" />
                column-count
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={config.columnCount}
                  onChange={(e) => updateConfig({ columnCount: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-400"
                />
                <span className="text-sm font-mono text-slate-200 w-6 text-right">{config.columnCount}</span>
              </div>
            </div>

            {/* Column Gap */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <GripHorizontal className="w-3.5 h-3.5" />
                column-gap
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={4}
                  max={80}
                  value={config.columnGap}
                  onChange={(e) => updateConfig({ columnGap: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-400"
                />
                <select
                  value={config.gapUnit}
                  onChange={(e) => updateConfig({ gapUnit: e.target.value as 'px' | 'rem' | 'em' })}
                  className="text-xs bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-slate-300"
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                </select>
                <span className="text-sm font-mono text-slate-200 w-16 text-right">
                  {config.columnGap}{config.gapUnit}
                </span>
              </div>
            </div>

            {/* Rule Style */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                column-rule-style
              </label>
              <select
                value={config.ruleStyle}
                onChange={(e) => updateConfig({ ruleStyle: e.target.value as MultiColConfig['ruleStyle'] })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
              >
                {RULE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {RULE_STYLE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Rule Width + Color (only if not none) */}
            {config.ruleStyle !== 'none' && (
              <>
                <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
                  <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" />
                    column-rule-width
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={config.ruleWidth}
                      onChange={(e) => updateConfig({ ruleWidth: parseInt(e.target.value) })}
                      className="flex-1 accent-brand-400"
                    />
                    <span className="text-sm font-mono text-slate-200 w-8 text-right">{config.ruleWidth}px</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
                  <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    column-rule-color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.ruleColor}
                      onChange={(e) => updateConfig({ ruleColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.ruleColor}
                      onChange={(e) => updateConfig({ ruleColor: e.target.value })}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm font-mono text-slate-200"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Fill Mode */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <AlignJustify className="w-3.5 h-3.5" />
                column-fill
              </label>
              <select
                value={config.fillMode}
                onChange={(e) => updateConfig({ fillMode: e.target.value as MultiColConfig['fillMode'] })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="auto">auto — fill sequentially</option>
                <option value="balance">balance — distribute evenly</option>
                <option value="balance-all">balance-all — balance all fragments</option>
              </select>
            </div>

            {/* span mode */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <Columns className="w-3.5 h-3.5" />
                column-span (heading)
              </label>
              <select
                value={config.spanMode}
                onChange={(e) => updateConfig({ spanMode: e.target.value as 'none' | 'all' })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="none">none — heading in first column</option>
                <option value="all">all — heading spans all columns</option>
              </select>
            </div>

            {/* Text Align */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                text-align
              </label>
              <select
                value={config.textAlign}
                onChange={(e) => updateConfig({ textAlign: e.target.value as MultiColConfig['textAlign'] })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="justify">Justify</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                font-size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={22}
                  value={config.fontSize}
                  onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-400"
                />
                <span className="text-sm font-mono text-slate-200 w-10 text-right">{config.fontSize}px</span>
              </div>
            </div>

            {/* Preview Width */}
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" />
                container width
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={400}
                  max={1200}
                  step={25}
                  value={config.previewWidth}
                  onChange={(e) => updateConfig({ previewWidth: parseInt(e.target.value) })}
                  className="flex-1 accent-brand-400"
                />
                <span className="text-sm font-mono text-slate-200 w-12 text-right">{config.previewWidth}px</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CSS Output ───────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Copy className="w-4 h-4 text-brand-400" />
            Generated CSS
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Standard CSS */}
            <div className="rounded-lg border border-slate-700 bg-[#0d1117] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CSS</span>
                <button
                  onClick={copyCSS}
                  className="px-3 py-1 rounded text-xs bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-300 overflow-x-auto font-mono leading-relaxed">
                <code>{generatedCSS}</code>
              </pre>
            </div>
            {/* Tailwind */}
            <div className="rounded-lg border border-slate-700 bg-[#0d1117] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tailwind CSS (arbitrary values)</span>
                <button
                  onClick={copyTailwind}
                  className="px-3 py-1 rounded text-xs bg-cyan-600 hover:bg-cyan-700 text-white transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-300 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
                <code>{tailwindCSS}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* ── Quick Reference ───────────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Reference</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 text-left">
                  <th className="px-4 py-2 text-slate-400 font-semibold">Property</th>
                  <th className="px-4 py-2 text-slate-400 font-semibold">Values</th>
                  <th className="px-4 py-2 text-slate-400 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {[
                  ['column-count', '<integer> | auto', 'Number of columns to create'],
                  ['column-width', '<length> | auto', 'Minimum column width; browser creates as many as fit'],
                  ['column-gap', '<length> | normal', 'Space between columns (also works with gap shorthand)'],
                  ['column-rule', '<width> <style> <color>', 'Shorthand for rule-width, rule-style, rule-color'],
                  ['column-rule-style', 'solid | dashed | dotted | double | groove | ridge | inset | outset | none', 'Line style between columns'],
                  ['column-span', 'none | all', 'Whether an element spans across all columns'],
                  ['column-fill', 'auto | balance | balance-all', 'How content is distributed across columns'],
                  ['break-inside', 'auto | avoid', 'Prevent column breaks inside an element'],
                  ['orphans', '<integer>', 'Minimum lines at the bottom of a column (default: 2)'],
                  ['widows', '<integer>', 'Minimum lines at the top of a column (default: 2)'],
                ].map(([prop, values, desc]) => (
                  <tr key={prop} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-brand-300 whitespace-nowrap">{prop}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{values}</td>
                    <td className="px-4 py-2.5 text-slate-300">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ToolLayout>
  );
}


