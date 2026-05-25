'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Zap, ChevronLeft, ChevronRight, ArrowUpDown, GripHorizontal, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type SnapType = 'x mandatory' | 'x proximity' | 'y mandatory' | 'y proximity' | 'both mandatory' | 'both proximity';
type SnapAlign = 'start' | 'center' | 'end';

interface Preset {
  name: string;
  snapType: SnapType;
  snapAlign: SnapAlign;
  snapStop: 'normal' | 'always';
  scrollPadding: number;
  gap: number;
  itemCount: number;
  itemWidth: number;
  itemHeight: number;
  direction: 'horizontal' | 'vertical' | 'grid';
}

// ── Constants ──────────────────────────────────────────────────────────────

const SNAP_TYPES: { value: SnapType; label: string; desc: string }[] = [
  { value: 'x mandatory', label: 'X Mandatory', desc: 'Horizontal — always snaps to a snap point' },
  { value: 'x proximity', label: 'X Proximity', desc: 'Horizontal — snaps only when close' },
  { value: 'y mandatory', label: 'Y Mandatory', desc: 'Vertical — always snaps to a snap point' },
  { value: 'y proximity', label: 'Y Proximity', desc: 'Vertical — snaps only when close' },
  { value: 'both mandatory', label: 'Both Mandatory', desc: 'Both axes — always snaps' },
  { value: 'both proximity', label: 'Both Proximity', desc: 'Both axes — snaps when close' },
];

const SNAP_ALIGNS: { value: SnapAlign; label: string }[] = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
];

const COLORS = [
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-blue-500 to-cyan-500',
  'bg-gradient-to-br from-emerald-500 to-teal-500',
  'bg-gradient-to-br from-amber-500 to-orange-500',
  'bg-gradient-to-br from-rose-500 to-pink-500',
  'bg-gradient-to-br from-indigo-500 to-blue-600',
  'bg-gradient-to-br from-green-500 to-emerald-600',
  'bg-gradient-to-br from-red-500 to-rose-600',
  'bg-gradient-to-br from-cyan-500 to-blue-500',
  'bg-gradient-to-br from-yellow-500 to-amber-600',
  'bg-gradient-to-br from-fuchsia-500 to-purple-600',
  'bg-gradient-to-br from-teal-500 to-green-500',
];

const PRESETS: Preset[] = [
  {
    name: 'Horizontal Carousel',
    snapType: 'x mandatory',
    snapAlign: 'center',
    snapStop: 'normal',
    scrollPadding: 16,
    gap: 16,
    itemCount: 8,
    itemWidth: 280,
    itemHeight: 200,
    direction: 'horizontal',
  },
  {
    name: 'Vertical Sections',
    snapType: 'y mandatory',
    snapAlign: 'start',
    snapStop: 'always',
    scrollPadding: 0,
    gap: 0,
    itemCount: 5,
    itemWidth: 800,
    itemHeight: 400,
    direction: 'vertical',
  },
  {
    name: 'Product Gallery',
    snapType: 'x mandatory',
    snapAlign: 'start',
    snapStop: 'normal',
    scrollPadding: 24,
    gap: 12,
    itemCount: 6,
    itemWidth: 240,
    itemHeight: 160,
    direction: 'horizontal',
  },
  {
    name: 'Onboarding Slides',
    snapType: 'both mandatory',
    snapAlign: 'center',
    snapStop: 'always',
    scrollPadding: 0,
    gap: 0,
    itemCount: 4,
    itemWidth: 600,
    itemHeight: 350,
    direction: 'vertical',
  },
];

// ── CSS Generator ──────────────────────────────────────────────────────────

function generateCSS(
  snapType: SnapType,
  snapAlign: SnapAlign,
  snapStop: string,
  scrollPadding: number,
  gap: number,
  itemWidth: number,
  itemHeight: number,
  direction: string,
): string {
  const [axis] = snapType.split(' ');
  const isX = axis === 'x' || axis === 'both';
  const isY = axis === 'y' || axis === 'both';

  const rules: string[] = [];

  // Container
  rules.push('.scroll-container {');
  if (isX && isY) {
    rules.push('  display: grid;');
    rules.push(`  grid-template-columns: repeat(auto-fill, ${itemWidth}px);`);
    rules.push(`  gap: ${gap}px;`);
    rules.push('  overflow: auto;');
  } else if (isX) {
    rules.push('  display: flex;');
    rules.push(`  gap: ${gap}px;`);
    rules.push('  overflow-x: auto;');
    rules.push('  scroll-snap-type: x mandatory;');
  } else {
    rules.push('  overflow-y: auto;');
    rules.push(`  height: ${itemHeight}px;`);
    rules.push('  scroll-snap-type: y mandatory;');
  }

  rules.push(`  scroll-snap-type: ${snapType};`);
  if (scrollPadding > 0) {
    rules.push(`  scroll-padding: ${scrollPadding}px;`);
  }
  rules.push('  scroll-behavior: smooth;');
  rules.push('  -webkit-overflow-scrolling: touch;');
  rules.push('}');
  rules.push('');

  // Items
  rules.push('.scroll-item {');
  rules.push(`  scroll-snap-align: ${snapAlign};`);
  if (snapStop === 'always') {
    rules.push('  scroll-snap-stop: always;');
  }
  if (direction === 'horizontal' || direction === 'grid') {
    rules.push(`  flex: 0 0 ${itemWidth}px;`);
  }
  if (direction === 'vertical') {
    rules.push(`  height: ${itemHeight}px;`);
  }
  rules.push('}');

  return rules.join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssScrollSnapPlaygroundPage() {
  const [snapType, setSnapType] = useState<SnapType>('x mandatory');
  const [snapAlign, setSnapAlign] = useState<SnapAlign>('center');
  const [snapStop, setSnapStop] = useState<'normal' | 'always'>('normal');
  const [scrollPadding, setScrollPadding] = useState(16);
  const [gap, setGap] = useState(16);
  const [itemCount, setItemCount] = useState(8);
  const [itemWidth, setItemWidth] = useState(280);
  const [itemHeight, setItemHeight] = useState(200);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const axis = snapType.split(' ')[0] as 'x' | 'y' | 'both';
  const isMandatory = snapType.includes('mandatory');

  const isHorizontal = axis === 'x';
  const isVertical = axis === 'y';
  const isBoth = axis === 'both';

  const direction = isBoth ? 'grid' : isHorizontal ? 'horizontal' : 'vertical';

  // Track which item is in the snap position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const children = Array.from(el.children) as HTMLElement[];
      let closestIdx: number | null = null;
      let closestDist = Infinity;

      children.forEach((child, i) => {
        const childRect = child.getBoundingClientRect();
        let dist: number;

        if (isHorizontal || isBoth) {
          const snapPoint = rect.left + scrollPadding;
          const childEdge = snapAlign === 'start' ? childRect.left : snapAlign === 'center' ? childRect.left + childRect.width / 2 : childRect.right;
          dist = Math.abs(childEdge - snapPoint);
        } else {
          const snapPoint = rect.top + scrollPadding;
          const childEdge = snapAlign === 'start' ? childRect.top : snapAlign === 'center' ? childRect.top + childRect.height / 2 : childRect.bottom;
          dist = Math.abs(childEdge - snapPoint);
        }

        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });

      setActiveItem(closestIdx);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => el.removeEventListener('scroll', handleScroll);
  }, [snapType, snapAlign, scrollPadding, isHorizontal, isBoth]);

  const css = useMemo(
    () => generateCSS(snapType, snapAlign, snapStop, scrollPadding, gap, itemWidth, itemHeight, direction),
    [snapType, snapAlign, snapStop, scrollPadding, gap, itemWidth, itemHeight, direction],
  );

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Copy failed'),
    );
  }, [css]);

  const applyPreset = useCallback((preset: Preset) => {
    setSnapType(preset.snapType);
    setSnapAlign(preset.snapAlign);
    setSnapStop(preset.snapStop);
    setScrollPadding(preset.scrollPadding);
    setGap(preset.gap);
    setItemCount(preset.itemCount);
    setItemWidth(preset.itemWidth);
    setItemHeight(preset.itemHeight);
    toast.success(`Loaded "${preset.name}" preset`);
  }, []);

  const reset = useCallback(() => {
    applyPreset(PRESETS[0]);
  }, [applyPreset]);

  // Generate items for preview
  const items = useMemo(() => {
    return Array.from({ length: itemCount }, (_, i) => ({
      id: i,
      label: `Item ${i + 1}`,
      color: COLORS[i % COLORS.length],
    }));
  }, [itemCount]);

  const containerStyle: React.CSSProperties = {
    scrollSnapType: snapType,
    scrollPadding: scrollPadding,
    gap: gap,
    scrollBehavior: 'smooth',
  };

  const itemStyle: React.CSSProperties = {
    scrollSnapAlign: snapAlign,
    scrollSnapStop: snapStop,
    ...(direction === 'horizontal' ? { flex: `0 0 ${itemWidth}px`, height: itemHeight } : {}),
    ...(direction === 'vertical' ? { height: itemHeight } : {}),
  };

  return (
    <ToolLayout
      title="CSS Scroll Snap Playground"
      description="Visually build CSS scroll-snap layouts — carousels, galleries, onboarding slides. Configure snap-type, alignment, padding, and stop behavior. Live preview, 4 presets, instant CSS copy."
    >
      {/* Controls */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-400" />
          Configuration
        </h2>

        {/* Presets */}
        <div className="mb-4">
          <label className="text-xs text-slate-400 block mb-2">Presets</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 text-xs rounded-md bg-surface-light border border-slate-600 text-slate-300 hover:border-brand-400 hover:text-brand-300 transition-colors"
              >
                {preset.name}
              </button>
            ))}
            <button
              onClick={reset}
              className="px-3 py-1.5 text-xs rounded-md bg-surface-light border border-slate-600 text-slate-400 hover:border-slate-500 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* snap-type */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">scroll-snap-type</label>
            <select
              value={snapType}
              onChange={(e) => setSnapType(e.target.value as SnapType)}
              className="input-field w-full text-sm py-1.5"
            >
              {SNAP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {SNAP_TYPES.find((t) => t.value === snapType)?.desc}
            </p>
          </div>

          {/* snap-align */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">scroll-snap-align</label>
            <div className="flex gap-1">
              {SNAP_ALIGNS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setSnapAlign(a.value)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    snapAlign === a.value
                      ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                      : 'bg-surface-light border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* snap-stop */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">scroll-snap-stop</label>
            <div className="flex gap-1">
              <button
                onClick={() => setSnapStop('normal')}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  snapStop === 'normal'
                    ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                    : 'bg-surface-light border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setSnapStop('always')}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  snapStop === 'always'
                    ? 'bg-brand-500/20 border-brand-400 text-brand-300'
                    : 'bg-surface-light border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                Always
              </button>
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">
              scroll-padding: <span className="text-brand-400">{scrollPadding}px</span>
            </label>
            <input
              type="range"
              min={0}
              max={80}
              value={scrollPadding}
              onChange={(e) => setScrollPadding(Number(e.target.value))}
              className="w-full accent-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">
              Gap: <span className="text-brand-400">{gap}px</span>
            </label>
            <input
              type="range"
              min={0}
              max={48}
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              className="w-full accent-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">
              Item Width: <span className="text-brand-400">{itemWidth}px</span>
            </label>
            <input
              type="range"
              min={100}
              max={600}
              step={10}
              value={itemWidth}
              onChange={(e) => setItemWidth(Number(e.target.value))}
              className="w-full accent-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">
              Item Count: <span className="text-brand-400">{itemCount}</span>
            </label>
            <input
              type="range"
              min={3}
              max={15}
              value={itemCount}
              onChange={(e) => setItemCount(Number(e.target.value))}
              className="w-full accent-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <EyeIcon />
            Live Preview
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isHorizontal && <ChevronLeft className="w-3.5 h-3.5" />}
            <span>Scroll here</span>
            {isHorizontal && <ChevronRight className="w-3.5 h-3.5" />}
            {(isVertical || isBoth) && <ArrowUpDown className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Preview container */}
        <div
          ref={scrollRef}
          className={`relative rounded-lg border border-slate-600/50 bg-slate-900/60 ${
            isVertical || isBoth ? '' : ''
          }`}
          style={{
            display: isBoth ? 'grid' : isHorizontal ? 'flex' : 'block',
            gridTemplateColumns: isBoth ? `repeat(auto-fill, ${itemWidth}px)` : undefined,
            overflowX: isHorizontal ? 'auto' : isBoth ? 'auto' : 'hidden',
            overflowY: isVertical ? 'auto' : isBoth ? 'auto' : 'hidden',
            height: isVertical ? Math.min(itemHeight + scrollPadding * 2 + 80, 420) : isBoth ? 'auto' : itemHeight + scrollPadding * 2 + 4,
            maxHeight: isBoth ? 400 : undefined,
            ...containerStyle,
            scrollSnapType: snapType,
          }}
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`${item.color} rounded-lg flex flex-col items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 relative transition-transform duration-200`}
              style={{
                ...itemStyle,
                minWidth: isBoth ? 0 : undefined,
                margin: direction === 'vertical' && i < items.length - 1 ? `0 0 ${gap}px 0` : undefined,
                transform: activeItem === i ? 'scale(1.02)' : 'scale(0.95)',
                opacity: activeItem === i ? 1 : 0.65,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
              }}
            >
              <span className="text-3xl mb-1 opacity-80">{i + 1}</span>
              <span className="text-sm opacity-60">{item.label}</span>
              {activeItem === i && (
                <div className="absolute top-2 right-2 bg-black/40 rounded-full px-2 py-0.5 text-xs text-white/80">
                  snapped
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Active item indicator */}
        {activeItem !== null && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-brand-400" />
            Currently snapped: <span className="text-brand-300 font-mono">Item {activeItem + 1}</span>
            {(snapStop === 'always') && (
              <span className="text-amber-400 ml-1">(snap-stop: always — single scroll = single snap)</span>
            )}
          </div>
        )}

        {/* Scroll hint */}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-brand-400/40" /> 
            <span>snap-align: {snapAlign}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded border border-slate-500" />
            <span>type: {snapType}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-slate-600/50" />
            <span>padding: {scrollPadding}px</span>
          </div>
        </div>
      </div>

      {/* CSS output */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Generated CSS</h2>
          <button onClick={copyCSS} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
        </div>
        <pre className="bg-surface p-4 rounded-lg text-sm text-slate-300 font-mono overflow-x-auto whitespace-pre">
          <code>{css}</code>
        </pre>
      </div>

      {/* How it works */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-400" />
          How CSS Scroll Snap Works
        </h3>
        <ul className="text-sm text-slate-400 space-y-1.5 list-disc pl-5">
          <li>
            <strong className="text-slate-300">scroll-snap-type:</strong> Set on the container. <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">mandatory</code> always snaps; <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">proximity</code> snaps only when the scroll ends near a snap point.
          </li>
          <li>
            <strong className="text-slate-300">scroll-snap-align:</strong> Set on each item. Defines which part of the item aligns with the container&apos;s snap position — <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">start</code>, <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">center</code>, or <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">end</code>.
          </li>
          <li>
            <strong className="text-slate-300">scroll-snap-stop:</strong> <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">always</code> forces the scroll to stop at each item — one snap per scroll gesture. <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">normal</code> allows momentum to skip items.
          </li>
          <li>
            <strong className="text-slate-300">scroll-padding:</strong> Offsets the snap area from the container edges — useful for fixed headers or sidebars.
          </li>
          <li>
            <strong className="text-slate-300">Browser Support:</strong> Baseline since 2021 — all modern browsers support scroll-snap. Use <code className="text-brand-400 bg-brand-400/10 px-1 rounded text-xs">-webkit-overflow-scrolling: touch</code> for smooth iOS momentum.
          </li>
        </ul>
      </div>
    </ToolLayout>
  );
}

// Inline EyeIcon as a simple SVG since we don't want to import another icon
function EyeIcon() {
  return (
    <svg className="w-4 h-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
