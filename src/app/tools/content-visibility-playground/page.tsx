'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Code2, Zap, Gauge, Eye, EyeOff, Timer, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

type VisibilityMode = 'visible' | 'auto' | 'hidden';

interface CardData {
  id: number;
  title: string;
  body: string;
  color: string;
}

const MOCK_CARDS: CardData[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  title: `Card ${i + 1}`,
  body: `This is card number ${i + 1}. It contains some sample content that would normally require layout and paint work by the browser. The content-visibility CSS property lets the browser skip this work entirely when the card is off-screen.`,
  color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#84cc16'][i % 8],
}));

const INTRINSIC_SIZES = [
  { label: 'auto', value: 'auto' },
  { label: '200px', value: '200px' },
  { label: '300px', value: '300px' },
  { label: '400px', value: '400px' },
  { label: '500px', value: '500px' },
];

export default function ContentVisibilityPlayground() {
  const [mode, setMode] = useState<VisibilityMode>('auto');
  const [intrinsicSize, setIntrinsicSize] = useState('300px');
  const [cardCount, setCardCount] = useState(50);
  const [showPerformance, setShowPerformance] = useState(true);
  const [copied, setCopied] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [comparisonData, setComparisonData] = useState<{
    with: number;
    without: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  // Measure render performance
  const runBenchmark = useCallback(() => {
    // Simple: measure how many cards we can see vs total
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('[data-card]');
      let visible = 0;
      const rect = containerRef.current.getBoundingClientRect();
      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        if (cardRect.top < rect.bottom && cardRect.bottom > rect.top) {
          visible++;
        }
      });
      setVisibleCount(visible);
    }
  }, []);

  useEffect(() => {
    runBenchmark();
    const handleScroll = () => runBenchmark();
    const el = containerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [runBenchmark, cardCount, mode]);

  // Measure initial render with a simple timing
  useEffect(() => {
    const start = performance.now();
    requestAnimationFrame(() => {
      const end = performance.now();
      setRenderTime(Math.round((end - start) * 100) / 100);
    });
  }, [mode, cardCount]);

  const cards = useMemo(() => MOCK_CARDS.slice(0, cardCount), [cardCount]);

  const generatedCss = useMemo(() => {
    const lines: string[] = [];
    if (mode !== 'visible') {
      lines.push(`.card {`);
      lines.push(`  content-visibility: ${mode};`);
      if (intrinsicSize !== 'auto') {
        lines.push(`  contain-intrinsic-size: ${intrinsicSize} ${intrinsicSize};`);
      }
      lines.push(`}`);
    }

    if (mode === 'auto') {
      lines.push('');
      lines.push('/* Browser skips rendering work for off-screen cards */');
      lines.push('/* Cards render on-demand as they scroll into view */');
    } else if (mode === 'hidden') {
      lines.push('');
      lines.push('/* Cards are hidden from rendering entirely */');
      lines.push('/* Use this with JavaScript to toggle visibility */');
    }

    return lines.join('\n');
  }, [mode, intrinsicSize]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(generatedCss);
    setCopied(true);
    toast.success('CSS copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCss]);

  return (
    <ToolLayout
      title="CSS content-visibility Playground"
      description="Explore the performance-boosting content-visibility CSS property — skip rendering off-screen elements, reduce initial layout cost, and speed up pages with large DOM trees. Live scroll test with 50 cards and real-time visibility tracking."
      controls={
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">CARDS:</span>
          {[10, 25, 50, 100, 200].map((n) => (
            <button
              key={n}
              onClick={() => setCardCount(n)}
              className={`px-2 py-1 rounded border transition-all ${
                cardCount === n
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                  : 'border-slate-600 text-slate-400 hover:text-slate-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
        <p className="text-sm text-green-300">
          <strong>⚡ Performance Tip:</strong> <code className="text-green-400 bg-green-500/10 px-1 rounded">content-visibility: auto</code> tells
          the browser it can skip layout and paint for off-screen elements. On pages with thousands of DOM nodes, this
          can reduce initial rendering time by 50-90%. Supported in Chrome 85+, Edge 85+, Firefox 125+, Safari 18+.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Zap className="w-3.5 h-3.5 inline mr-1.5 text-yellow-400" />
              content-visibility Mode
            </label>
            <div className="space-y-2">
              {[
                {
                  value: 'visible' as VisibilityMode,
                  label: 'visible (off)',
                  desc: 'No skipping — render everything normally',
                  color: 'slate',
                },
                {
                  value: 'auto' as VisibilityMode,
                  label: 'auto (recommended)',
                  desc: 'Skip rendering off-screen elements automatically',
                  color: 'green',
                },
                {
                  value: 'hidden' as VisibilityMode,
                  label: 'hidden',
                  desc: 'Skip rendering entirely (like display:none but preserves size)',
                  color: 'red',
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    mode === opt.value
                      ? `bg-${opt.color}-500/20 border-${opt.color}-500/50 text-${opt.color}-300`
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                  }`}
                  style={
                    mode === opt.value
                      ? {
                          background:
                            opt.color === 'green'
                              ? 'rgba(34,197,94,0.15)'
                              : opt.color === 'red'
                              ? 'rgba(239,68,68,0.15)'
                              : 'rgba(148,163,184,0.1)',
                          borderColor:
                            opt.color === 'green'
                              ? 'rgba(34,197,94,0.4)'
                              : opt.color === 'red'
                              ? 'rgba(239,68,68,0.4)'
                              : 'rgba(148,163,184,0.2)',
                          color:
                            opt.color === 'green'
                              ? 'rgb(134,239,172)'
                              : opt.color === 'red'
                              ? 'rgb(252,165,165)'
                              : 'rgb(203,213,225)',
                        }
                      : {}
                  }
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs opacity-75 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Intrinsic Size */}
          {mode !== 'visible' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Gauge className="w-3.5 h-3.5 inline mr-1.5 text-blue-400" />
                contain-intrinsic-size
              </label>
              <div className="flex flex-wrap gap-2">
                {INTRINSIC_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setIntrinsicSize(size.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      intrinsicSize === size.value
                        ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Placeholder size for off-screen elements — prevents layout shifts when they scroll into view.
              </p>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              Performance Metrics
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total cards:</span>
                <span className="text-slate-200 font-mono">{cardCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Visible in viewport:</span>
                <span className="text-slate-200 font-mono">{visibleCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Off-screen (may be skipped):</span>
                <span className="text-slate-200 font-mono">
                  {mode === 'visible' ? 'N/A (all rendered)' : cardCount - visibleCount}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Render time:</span>
                <span className="text-slate-200 font-mono">{renderTime ? `${renderTime}ms` : '...'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Mode:</span>
                <span
                  className={`font-mono ${
                    mode === 'auto' ? 'text-green-300' : mode === 'hidden' ? 'text-red-300' : 'text-slate-300'
                  }`}
                >
                  {mode}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 italic">
              ℹ️ Render time is approximate — real savings come from deferred layout/paint, not JS execution time.
            </p>
          </div>

          {/* Generated CSS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                <Code2 className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
                Generated CSS
              </label>
              <button
                onClick={copyCss}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-green-300 font-mono overflow-x-auto max-h-48 overflow-y-auto">
              {generatedCss || '/* No CSS needed — all cards render normally */'}
            </pre>
          </div>
        </div>

        {/* Right: Scrollable Card List */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Eye className="w-3.5 h-3.5 inline mr-1.5 text-yellow-400" />
            Scroll Test — {cardCount} Cards
          </label>
          <div
            ref={containerRef}
            className="border border-slate-700 rounded-lg bg-slate-900 overflow-y-auto"
            style={{ maxHeight: '550px' }}
          >
            <div className="p-3">
              {mode === 'visible' && (
                <div className="mb-2 px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 text-center">
                  All {cardCount} cards are rendering normally — no content-visibility optimization applied.
                </div>
              )}
              {mode === 'auto' && (
                <div className="mb-2 px-2 py-1 bg-green-500/10 rounded text-xs text-green-300 text-center">
                  content-visibility: auto — off-screen cards are skipped by the browser. Scroll down to trigger rendering.
                </div>
              )}
              {mode === 'hidden' && (
                <div className="mb-2 px-2 py-1 bg-red-500/10 rounded text-xs text-red-300 text-center">
                  content-visibility: hidden — off-screen cards are hidden. The browser preserves their size via contain-intrinsic-size.
                </div>
              )}
              {cards.map((card) => (
                <div
                  key={card.id}
                  data-card={card.id}
                  className="mb-3 p-4 rounded-xl border border-slate-700/50"
                  style={
                    mode !== 'visible'
                      ? {
                          contentVisibility: mode,
                          containIntrinsicSize: intrinsicSize === 'auto' ? 'auto' : `${intrinsicSize} ${intrinsicSize}`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: card.color }}
                    >
                      {card.id}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200">{card.title}</h4>
                    <span className="ml-auto text-[10px] text-slate-500 font-mono">
                      {mode === 'auto' ? 'lazy' : mode === 'hidden' ? 'hidden' : 'rendered'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.body}</p>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 border border-slate-700/50"
                      >
                        tag-{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            ↕️ Scroll to see how cards render as they enter the viewport. Switch to <code className="text-brand-400 bg-slate-800 px-1 rounded">auto</code> mode
            to see content-visibility in action.
          </p>
        </div>
      </div>

      {/* Educational Section */}
      <div className="mt-10 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <h3 className="text-base font-semibold text-slate-200 mb-3">When to Use content-visibility</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-green-300 mb-1">✅ Long Lists / Feeds</h4>
            <p className="text-xs text-slate-400">
              News feeds, search results, product grids — any page with 50+ repeating content blocks. Add{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">content-visibility: auto;</code> to each item.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-green-300 mb-1">✅ Below-the-Fold Content</h4>
            <p className="text-xs text-slate-400">
              Sections that users need to scroll to see. Apply to{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">{'<section>'}</code> elements
              outside the initial viewport.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-green-300 mb-1">✅ Tab/Slider Panels</h4>
            <p className="text-xs text-slate-400">
              Hidden tab contents and carousel slides — skip their rendering until the user activates them.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-300 mb-1">⚠️ Small Pages</h4>
            <p className="text-xs text-slate-400">
              Don&apos;t bother on pages with fewer than 20 elements — the optimization overhead can outweigh the benefit.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-300 mb-1">⚠️ Critical Above-Fold</h4>
            <p className="text-xs text-slate-400">
              Don&apos;t apply to hero sections or content in the initial viewport — it delays rendering when used on visible elements.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-red-300 mb-1">🚫 Interactive Widgets</h4>
            <p className="text-xs text-slate-400">
              Avoid on elements with complex JavaScript interactions, form fields, or focusable content that the user needs immediately.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
