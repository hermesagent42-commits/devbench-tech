'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Eye, EyeOff, Zap, Layers, Gauge, RefreshCw, Info } from 'lucide-react';
import toast from 'react-hot-toast';

type CvMode = 'visible' | 'auto' | 'hidden';

interface Preset {
  name: string;
  desc: string;
  mode: CvMode;
  intrinsicSize: string;
  autoSize: string;
  cardCount: number;
}

const PRESETS: Preset[] = [
  {
    name: 'Long Feed (Default)',
    desc: '50 cards, auto skip — classic content-visibility use case',
    mode: 'auto',
    intrinsicSize: 'auto 400px',
    autoSize: '400px',
    cardCount: 50,
  },
  {
    name: 'Heavy Gallery',
    desc: '80 cards with large intrinsic sizes for image-heavy content',
    mode: 'auto',
    intrinsicSize: 'auto 500px',
    autoSize: '500px',
    cardCount: 80,
  },
  {
    name: 'Hidden Sections',
    desc: 'Use hidden to skip rendering while preserving layout space',
    mode: 'hidden',
    intrinsicSize: 'auto 300px',
    autoSize: '300px',
    cardCount: 30,
  },
  {
    name: 'No Optimization',
    desc: 'All cards visible — compare rendering cost',
    mode: 'visible',
    intrinsicSize: 'auto 300px',
    autoSize: '300px',
    cardCount: 50,
  },
  {
    name: 'Mixed Strategy',
    desc: 'Only first 10 cards visible, rest auto — real-world pattern',
    mode: 'auto',
    intrinsicSize: 'auto 350px',
    autoSize: '350px',
    cardCount: 60,
  },
];

const CARD_TITLES = [
  'Mountain Sunset', 'Ocean Breeze', 'Urban Skyline', 'Forest Trail',
  'Desert Dunes', 'Arctic Glacier', 'Tropical Reef', 'Autumn Leaves',
  'Cherry Blossom', 'Northern Lights', 'Canyon Vista', 'Rolling Hills',
  'Starry Night', 'Thunderstorm', 'Coral Garden', 'Alpine Meadow',
  'Volcanic Peak', 'River Rapids', 'Coastal Cliff', 'Bamboo Grove',
];

const CARD_COLORS = [
  'from-indigo-500 to-purple-600', 'from-teal-500 to-cyan-600',
  'from-orange-500 to-red-600', 'from-green-500 to-emerald-600',
  'from-amber-500 to-yellow-600', 'from-blue-500 to-indigo-600',
  'from-pink-500 to-rose-600', 'from-violet-500 to-fuchsia-600',
  'from-sky-500 to-blue-600', 'from-lime-500 to-green-600',
  'from-rose-500 to-pink-600', 'from-cyan-500 to-teal-600',
  'from-fuchsia-500 to-purple-600', 'from-emerald-500 to-green-600',
  'from-yellow-500 to-amber-600', 'from-red-500 to-orange-600',
  'from-purple-500 to-violet-600', 'from-neutral-500 to-slate-600',
  'from-stone-500 to-neutral-600', 'from-slate-500 to-gray-600',
];

export default function CssContentVisibilityPlayground() {
  const [mode, setMode] = useState<CvMode>('auto');
  const [intrinsicWidth, setIntrinsicWidth] = useState('auto');
  const [intrinsicHeight, setIntrinsicHeight] = useState('400px');
  const [autoHeight, setAutoHeight] = useState('400px');
  const [cardCount, setCardCount] = useState(50);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(600);
  const [showComparison, setShowComparison] = useState(true);
  const [copiedCss, setCopiedCss] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>('Long Feed (Default)');

  const scrollRef = useRef<HTMLDivElement>(null);

  const cards = useMemo(() => {
    return Array.from({ length: cardCount }, (_, i) => ({
      id: i,
      title: CARD_TITLES[i % CARD_TITLES.length],
      color: CARD_COLORS[i % CARD_COLORS.length],
      index: i + 1,
    }));
  }, [cardCount]);

  const cardHeight = autoHeight === 'auto' ? 300 : parseInt(autoHeight) || 300;
  const estimatedVisible = useMemo(() => {
    if (mode === 'hidden') return 0;
    if (mode === 'visible') return cardCount;
    return Math.min(cardCount, Math.ceil(viewHeight / cardHeight) + 4);
  }, [mode, cardCount, viewHeight, cardHeight]);

  const estimatedSkipped = cardCount - estimatedVisible;

  const cssCode = useMemo(() => {
    const lines: string[] = [];
    lines.push('/* Apply to each card/item in the feed */');
    lines.push('.card {');
    lines.push(`  content-visibility: ${mode};`);
    if (mode === 'auto' || mode === 'hidden') {
      lines.push(`  contain-intrinsic-size: ${intrinsicWidth} ${intrinsicHeight};`);
    }
    lines.push('}');
    lines.push('');
    if (mode === 'auto') {
      lines.push('/* With "auto", the browser automatically:');
      lines.push(' *  - Skips rendering for off-screen elements');
      lines.push(' *  - Preserves layout space via contain-intrinsic-size');
      lines.push(' *  - Renders elements as they scroll into view');
      lines.push(` *  - Result: only ~${estimatedVisible}/${cardCount} cards rendered at a time`);
      lines.push(' */');
    }
    return lines.join('\n');
  }, [mode, intrinsicWidth, intrinsicHeight, estimatedVisible, cardCount]);

  const handleCopyCss = useCallback(async () => {
    await navigator.clipboard.writeText(cssCode);
    setCopiedCss(true);
    toast.success('CSS copied!');
    setTimeout(() => setCopiedCss(false), 2000);
  }, [cssCode]);

  const handlePreset = useCallback((preset: Preset) => {
    setMode(preset.mode);
    const [w, h] = preset.intrinsicSize.split(' ');
    setIntrinsicWidth(w);
    setIntrinsicHeight(h);
    setAutoHeight(preset.autoSize);
    setCardCount(preset.cardCount);
    setActivePreset(preset.name);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setScrollTop(el.scrollTop);
      setViewHeight(el.clientHeight);
    };
    setViewHeight(el.clientHeight);
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const visibleRange = useMemo(() => {
    if (mode === 'visible') return { start: 0, end: cardCount };
    if (mode === 'hidden') return { start: -1, end: -1 };
    const buffer = 2;
    const start = Math.max(0, Math.floor(scrollTop / cardHeight) - buffer);
    const end = Math.min(cardCount, Math.ceil((scrollTop + viewHeight) / cardHeight) + buffer);
    return { start, end };
  }, [mode, scrollTop, viewHeight, cardCount, cardHeight]);

  const isCardRendered = useCallback(
    (index: number): boolean => {
      if (mode === 'visible') return true;
      if (mode === 'hidden') return false;
      return index >= visibleRange.start && index < visibleRange.end;
    },
    [mode, visibleRange]
  );

  const CardItem = useCallback(
    ({ card, isActive }: { card: { id: number; title: string; color: string; index: number }; isActive: boolean }) => (
      <div
        className="rounded-xl overflow-hidden border border-slate-700/50 transition-all duration-300"
        style={{ minHeight: cardHeight, height: 'auto' }}
      >
        <div className={`h-32 bg-gradient-to-br ${card.color} flex items-end p-4`}>
          <span className="text-white/90 font-bold text-lg drop-shadow-md">
            {card.title}
          </span>
        </div>
        <div className="p-4 bg-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isActive
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}
              />
              {isActive ? 'Rendered' : 'Skipped'}
            </span>
            <span className="text-[10px] text-slate-500">Card #{card.index}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isActive
              ? 'This card is being rendered by the browser — it is within or near the viewport.'
              : 'Optimized out by content-visibility: auto — the browser skips its paint & layout.'}
          </p>
          <div className="mt-3 flex gap-2">
            <div className="h-2 flex-1 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-green-500 w-full' : 'bg-slate-600 w-0'}`}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{isActive ? '100%' : '0%'}</span>
          </div>
        </div>
      </div>
    ),
    [cardHeight]
  );

  return (
    <ToolLayout
      title="CSS content-visibility Playground"
      description="Explore content-visibility — the Baseline 2026 CSS property that skips rendering for off-screen elements. Compare auto vs visible modes, configure contain-intrinsic-size, and see real rendering estimates."
      controls={
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Mode:</span>
          {([
            { value: 'visible' as CvMode, label: 'visible', icon: Eye },
            { value: 'auto' as CvMode, label: 'auto', icon: Zap },
            { value: 'hidden' as CvMode, label: 'hidden', icon: EyeOff },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                mode === opt.value
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
          <span className="text-slate-600 mx-1">|</span>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="accent-brand-500 rounded"
            />
            Side-by-side comparison
          </label>
        </div>
      }
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Cards', value: cardCount, icon: Layers, color: 'text-slate-400' },
          { label: 'Est. Rendered', value: estimatedVisible, icon: Eye, color: 'text-green-400' },
          { label: 'Optimized Out', value: estimatedSkipped, icon: Zap, color: 'text-amber-400' },
          {
            label: 'Render Reduction',
            value: cardCount > 0 ? `${Math.round(((cardCount - estimatedVisible) / cardCount) * 100)}%` : '0%',
            icon: Gauge,
            color: 'text-brand-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-xl bg-slate-900 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <stat.icon className="w-3 h-3" />
              {stat.label}
            </div>
            <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Live Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Live Preview — Scroll to See content-visibility in Action
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            Scroll: {scrollTop}px · Viewport: {viewHeight}px
          </span>
        </div>

        {showComparison ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Without */}
            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-3 py-2 bg-slate-800 border-b border-slate-700/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  Without content-visibility
                </span>
                <span className="text-[10px] text-slate-500 font-mono">All {cardCount} rendered</span>
              </div>
              <div className="h-[500px] overflow-y-auto bg-slate-950/50">
                <div className="p-3 space-y-3">
                  {cards.map((card) => (
                    <CardItem key={`left-${card.id}`} card={card} isActive={true} />
                  ))}
                </div>
              </div>
            </div>
            {/* With */}
            <div className="rounded-xl border border-brand-500/30 overflow-hidden ring-1 ring-brand-500/10">
              <div className="px-3 py-2 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  content-visibility: {mode}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ~{estimatedVisible}/{cardCount} rendered
                </span>
              </div>
              <div className="h-[500px] overflow-y-auto bg-slate-950/50" ref={scrollRef}>
                <div className="p-3 space-y-3">
                  {cards.map((card) => (
                    <CardItem key={`right-${card.id}`} card={card} isActive={isCardRendered(card.id)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-brand-500/30 overflow-hidden ring-1 ring-brand-500/10">
            <div className="px-3 py-2 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                content-visibility: {mode}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ~{estimatedVisible}/{cardCount} rendered
              </span>
            </div>
            <div className="h-[500px] overflow-y-auto bg-slate-950/50" ref={scrollRef}>
              <div className="p-3 space-y-3">
                {cards.map((card) => (
                  <CardItem key={card.id} card={card} isActive={isCardRendered(card.id)} />
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">
          ↓ Scroll the preview to see cards toggle between &quot;Rendered&quot; and &quot;Skipped&quot; in real time
        </p>
      </div>

      {/* Configuration + CSS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Configuration</h3>
          <div className="space-y-4 p-4 bg-slate-900 border border-slate-700/30 rounded-xl">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Card Count: <span className="font-mono text-brand-400">{cardCount}</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={cardCount}
                onChange={(e) => { setCardCount(Number(e.target.value)); setActivePreset(null); }}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>10</span><span>100</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">contain-intrinsic-size</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Width</span>
                  <input
                    type="text"
                    value={intrinsicWidth}
                    onChange={(e) => { setIntrinsicWidth(e.target.value); setActivePreset(null); }}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Height</span>
                  <input
                    type="text"
                    value={intrinsicHeight}
                    onChange={(e) => { setIntrinsicHeight(e.target.value); setAutoHeight(e.target.value === 'auto' ? '300px' : e.target.value); setActivePreset(null); }}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Acts as placeholder size so the page doesn&apos;t jump when elements render
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">Presets</label>
              <div className="space-y-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePreset(preset)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                      activePreset === preset.name
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-slate-700/30 bg-slate-800/30 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200">{preset.name}</span>
                      <span className="text-[10px] font-mono text-brand-400">{preset.mode}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {preset.cardCount} cards · intrinsic: {preset.intrinsicSize}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Generated CSS</h3>
              <button
                onClick={handleCopyCss}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors text-xs text-slate-300"
              >
                {copiedCss ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
            <pre className="p-4 bg-slate-900 border border-slate-700/30 rounded-xl overflow-x-auto">
              <code className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                {cssCode.split('\n').map((line, i) => {
                  if (line.trim().startsWith('/*') || line.trim().startsWith('*')) {
                    return <span key={i} className="text-slate-600 block">{line}</span>;
                  }
                  if (line.trim().startsWith('.')) {
                    return <span key={i} className="text-yellow-400 block">{line}</span>;
                  }
                  if (line.includes(':')) {
                    const [prop, val] = line.split(':');
                    return (
                      <span key={i} className="block">
                        <span className="text-cyan-400">{prop}</span>
                        <span className="text-slate-500">:</span>
                        <span className="text-green-400">{val}</span>
                      </span>
                    );
                  }
                  return <span key={i} className="block">{line}</span>;
                })}
              </code>
            </pre>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-700/30 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-400" />
              How content-visibility Works
            </h4>
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <div>
                <span className="font-mono text-purple-400 font-semibold">visible</span>
                <span className="text-slate-600"> (default)</span> — Normal rendering. Every element is painted and laid out, even if off-screen.
              </div>
              <div>
                <span className="font-mono text-green-400 font-semibold">auto</span>
                <span className="text-slate-600"> ✦ Baseline 2026</span> — Browser skips rendering for elements outside the viewport. When the element scrolls near the viewport, it renders automatically. Use <span className="font-mono text-amber-400">contain-intrinsic-size</span> to reserve space and prevent layout shifts.
              </div>
              <div>
                <span className="font-mono text-red-400 font-semibold">hidden</span> — Never rendered (like <span className="font-mono text-slate-500">display: none</span>), but preserves layout space. Useful for hiding sections while keeping page structure.
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/30">
                <p className="font-semibold text-slate-300 mb-1">Performance Impact</p>
                <p>
                  On a page with 100+ items, <span className="text-green-400 font-mono">content-visibility: auto</span> can
                  reduce initial layout/paint work by <span className="text-brand-400 font-bold">60-90%</span>.
                  The browser only renders what the user can see — the rest is deferred until scroll.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-700/30">
                <p className="font-semibold text-slate-300 mb-1">Browser Support</p>
                <div className="flex gap-2 flex-wrap">
                  {['Chrome 85+', 'Edge 85+', 'Firefox 125+', 'Safari 18+', 'Opera 71+'].map((browser) => (
                    <span key={browser} className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-medium">
                      ✓ {browser}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
