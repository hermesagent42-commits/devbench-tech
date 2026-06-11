'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Grid3X3, Columns as ColumnsIcon, Layout, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

type MasonryMethod = 'grid-masonry' | 'css-columns' | 'flexbox-columns';

interface MasonryConfig {
  method: MasonryMethod;
  columnCount: number;
  gap: number;
  itemCount: number;
  minItemHeight: number;
  maxItemHeight: number;
  borderRadius: number;
  shadow: boolean;
}

// ── Colors for items ───────────────────────────────────────────────────────

const ITEM_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #ef4444, #ec4899)',
  'linear-gradient(135deg, #8b5cf6, #d946ef)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
  'linear-gradient(135deg, #f43f5e, #fb7185)',
  'linear-gradient(135deg, #0ea5e9, #6366f1)',
  'linear-gradient(135deg, #84cc16, #22c55e)',
  'linear-gradient(135deg, #a855f7, #7c3aed)',
  'linear-gradient(135deg, #eab308, #f97316)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #22d3ee, #0ea5e9)',
  'linear-gradient(135deg, #fb923c, #ef4444)',
];

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { name: string; config: Partial<MasonryConfig> }[] = [
  {
    name: 'Classic Pinterest',
    config: { method: 'css-columns', columnCount: 4, gap: 12 },
  },
  {
    name: '3-Column Gallery',
    config: { method: 'css-columns', columnCount: 3, gap: 16 },
  },
  {
    name: '2-Column Portrait',
    config: { method: 'css-columns', columnCount: 2, gap: 20 },
  },
  {
    name: 'Flexbox Columns',
    config: { method: 'flexbox-columns', columnCount: 4, gap: 12 },
  },
  {
    name: 'Wide Cards (5-col)',
    config: { method: 'css-columns', columnCount: 5, gap: 8 },
  },
];

const METHOD_LABELS: Record<MasonryMethod, { label: string; desc: string; support: string }> = {
  'css-columns': {
    label: 'CSS Columns',
    desc: 'Uses column-count + break-inside: avoid. Works in all browsers. Most reliable for masonry.',
    support: '✅ All browsers',
  },
  'flexbox-columns': {
    label: 'Flexbox Columns',
    desc: 'Uses flex-direction: column with fixed height. Good when you know the container height.',
    support: '✅ All browsers',
  },
  'grid-masonry': {
    label: 'Grid masonry',
    desc: 'Uses grid-template-rows: masonry (CSS Grid Level 3). Only works in Firefox with flag.',
    support: '🔬 Firefox (flag)',
  },
};

// ── Generate random items ──────────────────────────────────────────────────

function generateItems(count: number, minH: number, maxH: number): number[] {
  // Use a stable seed based on count so same count = same heights
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    const seed = (i * 137 + 42) % 256;
    const t = seed / 255;
    heights.push(Math.round(minH + t * (maxH - minH)));
  }
  return heights;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CssMasonryPlayground() {
  const [config, setConfig] = useState<MasonryConfig>({
    method: 'css-columns',
    columnCount: 4,
    gap: 12,
    itemCount: 16,
    minItemHeight: 120,
    maxItemHeight: 320,
    borderRadius: 12,
    shadow: true,
  });
  const [key, setKey] = useState(0);

  const items = useMemo(() => generateItems(config.itemCount, config.minItemHeight, config.maxItemHeight), [
    config.itemCount, config.minItemHeight, config.maxItemHeight, key,
  ]);

  const set = useCallback(<K extends keyof MasonryConfig>(k: K, v: MasonryConfig[K]) => {
    setConfig((prev) => ({ ...prev, [k]: v }));
  }, []);

  const randomize = useCallback(() => {
    setKey((k) => k + 1);
  }, []);

  // ── CSS Generation ───────────────────────────────────────────────────────

  const cssOutput = useMemo(() => {
    const { method, columnCount, gap, borderRadius, shadow } = config;
    const lines: string[] = [];

    if (method === 'css-columns') {
      lines.push('.masonry-container {');
      lines.push(`  column-count: ${columnCount};`);
      if (gap > 0) lines.push(`  column-gap: ${gap}px;`);
      lines.push('}');
      lines.push('');
      lines.push('.masonry-item {');
      lines.push('  break-inside: avoid;');
      lines.push('  margin-bottom: ' + gap + 'px;');
      if (borderRadius > 0) lines.push(`  border-radius: ${borderRadius}px;`);
      if (shadow) lines.push('  box-shadow: 0 2px 8px rgba(0,0,0,0.15);');
      lines.push('}');
    } else if (method === 'flexbox-columns') {
      lines.push('.masonry-container {');
      lines.push('  display: flex;');
      lines.push('  flex-direction: column;');
      lines.push('  flex-wrap: wrap;');
      lines.push(`  height: calc((100vw / ${columnCount}) * 4); /* adjust */`);
      if (gap > 0) lines.push(`  gap: ${gap}px;`);
      lines.push('}');
      lines.push('');
      lines.push('.masonry-item {');
      lines.push(`  width: calc((100% - ${(columnCount - 1) * gap}px) / ${columnCount});`);
      if (borderRadius > 0) lines.push(`  border-radius: ${borderRadius}px;`);
      if (shadow) lines.push('  box-shadow: 0 2px 8px rgba(0,0,0,0.15);');
      lines.push('}');
    } else {
      // grid-masonry
      lines.push('.masonry-container {');
      lines.push('  display: grid;');
      if (gap > 0) lines.push(`  gap: ${gap}px;`);
      lines.push('  grid-template-columns: ' + `repeat(${columnCount}, 1fr);`);
      lines.push('  grid-template-rows: masonry;');
      lines.push('}');
      lines.push('');
      lines.push('/* grid-template-rows: masonry requires FF with');
      lines.push('   layout.css.grid-template-masonry-value.enabled = true */');
    }

    return lines.join('\n');
  }, [config]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(() => {
      toast.success('CSS copied!');
    });
  }, [cssOutput]);

  // ── Preview container style ──────────────────────────────────────────────

  const containerStyle: React.CSSProperties = useMemo(() => {
    const { method, columnCount, gap } = config;
    const style: React.CSSProperties = {};

    if (method === 'css-columns') {
      style.columnCount = columnCount;
      style.columnGap = `${gap}px`;
    } else if (method === 'flexbox-columns') {
      style.display = 'flex';
      style.flexDirection = 'column';
      style.flexWrap = 'wrap';
      style.gap = `${gap}px`;
    } else {
      style.display = 'grid';
      style.gap = `${gap}px`;
      style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
      // grid-template-rows: masonry is not widely supported;
      // we simulate it with dense auto-flow
      style.gridAutoFlow = 'row dense';
    }

    return style;
  }, [config]);

  return (
    <ToolLayout
      title="CSS Masonry Layout Playground"
      description="Build Pinterest-style masonry layouts with 3 approaches — CSS Columns (cross-browser), Flexbox Columns, and the experimental grid masonry. Live preview, item size variation, and copy-ready CSS."
    >
      <div className="space-y-6">
        {/* ── Method tabs ── */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
          {(Object.keys(METHOD_LABELS) as MasonryMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => set('method', method)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                config.method === method
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {METHOD_LABELS[method].label}
            </button>
          ))}
        </div>

        {/* ── Method description + support banner ── */}
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-4">
          <p className="text-sm text-slate-300">{METHOD_LABELS[config.method].desc}</p>
          <p className="text-xs text-slate-500 mt-1">
            Browser support: {METHOD_LABELS[config.method].support}
          </p>
        </div>

        {/* ── Controls ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Column count */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Columns</label>
            <input
              type="range"
              min={2}
              max={6}
              value={config.columnCount}
              onChange={(e) => set('columnCount', Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <span className="text-xs text-slate-300 font-mono">{config.columnCount}</span>
          </div>

          {/* Gap */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Gap (px)</label>
            <input
              type="range"
              min={0}
              max={40}
              step={2}
              value={config.gap}
              onChange={(e) => set('gap', Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <span className="text-xs text-slate-300 font-mono">{config.gap}px</span>
          </div>

          {/* Item count */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Items</label>
            <input
              type="range"
              min={6}
              max={36}
              step={2}
              value={config.itemCount}
              onChange={(e) => set('itemCount', Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <span className="text-xs text-slate-300 font-mono">{config.itemCount}</span>
          </div>

          {/* Min height */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Min H (px)</label>
            <input
              type="range"
              min={60}
              max={200}
              step={10}
              value={config.minItemHeight}
              onChange={(e) => set('minItemHeight', Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <span className="text-xs text-slate-300 font-mono">{config.minItemHeight}px</span>
          </div>

          {/* Max height */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Max H (px)</label>
            <input
              type="range"
              min={140}
              max={500}
              step={10}
              value={config.maxItemHeight}
              onChange={(e) => set('maxItemHeight', Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <span className="text-xs text-slate-300 font-mono">{config.maxItemHeight}px</span>
          </div>
        </div>

        {/* ── Secondary controls row ── */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Border radius */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Border radius</label>
            <input
              type="range"
              min={0}
              max={24}
              value={config.borderRadius}
              onChange={(e) => set('borderRadius', Number(e.target.value))}
              className="w-32 accent-brand-500"
            />
            <span className="text-xs text-slate-300 font-mono ml-2">{config.borderRadius}px</span>
          </div>

          {/* Shadow toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
            <input
              type="checkbox"
              checked={config.shadow}
              onChange={(e) => set('shadow', e.target.checked)}
              className="accent-brand-500"
            />
            Box shadow
          </label>

          {/* Randomize */}
          <button
            onClick={randomize}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Randomize sizes
          </button>

          {/* Copy CSS */}
          <button
            onClick={copyCSS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
        </div>

        {/* ── Presets row ── */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setConfig((prev) => ({ ...prev, ...preset.config }));
              }}
              className="px-3 py-1.5 text-xs rounded-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* ── Live Preview ── */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-3">
            Live Preview
          </label>
          <div
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 min-h-[300px] overflow-auto"
          >
            <div
              style={{
                ...containerStyle,
                ...(config.method === 'flexbox-columns'
                  ? {
                      height: Math.min(
                        800,
                        Math.ceil(config.itemCount / config.columnCount) *
                          ((config.minItemHeight + config.maxItemHeight) / 2 + config.gap)
                      ),
                    }
                  : {}),
              }}
            >
              {items.map((h, i) => (
                <div
                  key={i}
                  style={{
                    background: ITEM_COLORS[i % ITEM_COLORS.length],
                    height: `${h}px`,
                    borderRadius: `${config.borderRadius}px`,
                    boxShadow: config.shadow ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    ...(config.method === 'css-columns'
                      ? {
                          breakInside: 'avoid',
                          marginBottom: `${config.gap}px`,
                        }
                      : {}),
                    ...(config.method === 'flexbox-columns'
                      ? {
                          width: `calc((100% - ${(config.columnCount - 1) * config.gap}px) / ${config.columnCount})`,
                        }
                      : {}),
                  }}
                  className="flex items-center justify-center font-bold text-white/80 text-xs shadow-lg"
                >
                  <span className="drop-shadow-sm">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CSS Output ── */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
            Generated CSS
          </label>
          <pre className="bg-slate-950/70 border border-slate-700/50 rounded-lg p-4 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
            <code>{cssOutput}</code>
          </pre>
        </div>

        {/* ── Info Box ── */}
        <div className="bg-amber-900/10 border border-amber-600/20 rounded-lg p-4 text-sm text-slate-300">
          <p>
            <strong>⚡ Pro tip:</strong> For production, use{' '}
            <code className="text-amber-400 bg-slate-800 px-1 rounded">CSS Columns</code> — it&apos;s
            supported everywhere. The <code className="text-amber-400 bg-slate-800 px-1 rounded">
            grid-template-rows: masonry</code> approach is experimental and only available in
            Firefox with the{' '}
            <code className="text-amber-400 bg-slate-800 px-1 rounded">
              layout.css.grid-template-masonry-value.enabled
            </code>{' '}
            flag set to true. For responsive masonry, use CSS Columns and adjust{' '}
            <code className="text-amber-400 bg-slate-800 px-1 rounded">column-count</code> with
            media queries — no JavaScript needed.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
