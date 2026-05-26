'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, Eye, EyeOff, Settings, ChevronDown, Code, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ObserverState {
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRectReadOnly | null;
  intersectionRect: DOMRectReadOnly | null;
  rootBounds: DOMRectReadOnly | null;
  time: number;
  entryCount: number;
}

interface Preset {
  name: string;
  description: string;
  threshold: number;
  rootMargin: string;
  thresholdArray: number[];
  targetStyle: string;
  containerContent: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Lazy Loading Image',
    description: 'Load images when they\'re 200px from viewport',
    threshold: 0,
    rootMargin: '200px',
    thresholdArray: [0],
    targetStyle: 'bg-slate-700',
    containerContent: 'Scroll slowly — the observer triggers 200px before the target enters the viewport. Perfect for lazy loading images before they become visible.',
  },
  {
    name: 'Infinite Scroll Sentinel',
    description: 'Trigger data fetch when sentinel is 100px from viewport',
    threshold: 0,
    rootMargin: '100px',
    thresholdArray: [0],
    targetStyle: 'bg-amber-600',
    containerContent: 'This is the "sentinel" element placed at the bottom of your content. When it gets close to the viewport, you fetch more items. The observer fires 100px early so users never see a loading state.',
  },
  {
    name: 'Scroll-Triggered Animation',
    description: 'Animate element as it scrolls into view (50% visibility)',
    threshold: 0.5,
    rootMargin: '0px',
    thresholdArray: [0, 0.25, 0.5, 0.75, 1],
    targetStyle: 'bg-indigo-600',
    containerContent: 'As you scroll, the target box enters the viewport. The animation triggers at different visibility thresholds (0%, 25%, 50%, 75%, 100%). Watch the intersection ratio change smoothly.',
  },
  {
    name: 'Ad Viewability',
    description: 'Track how much of an ad is visible (50% for 1s = viewable)',
    threshold: 0.5,
    rootMargin: '0px',
    thresholdArray: [0, 0.25, 0.5, 0.75, 1],
    targetStyle: 'bg-emerald-600',
    containerContent: 'IAB standards define an ad as "viewable" when 50% is visible for at least 1 second. Use IntersectionObserver to track this — the multi-threshold array gives you granular visibility data.',
  },
  {
    name: 'Sticky Header Reveal',
    description: 'Show/hide sticky header based on scroll direction',
    threshold: 0,
    rootMargin: '0px',
    thresholdArray: [0, 1],
    targetStyle: 'bg-rose-600',
    containerContent: 'A sentinel element at the top of the page. When it leaves the viewport, reveal the sticky header. When it re-enters, hide it. Watch the binary intersecting state toggle.',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatRect(rect: DOMRectReadOnly | null): string {
  if (!rect) return 'N/A';
  return `{ x: ${Math.round(rect.x)}, y: ${Math.round(rect.y)}, w: ${Math.round(rect.width)}, h: ${Math.round(rect.height)} }`;
}

function formatTime(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
}

function generateCode(threshold: number, rootMargin: string, thresholdArray: number[]): string {
  const threshStr = thresholdArray.length > 1
    ? `[${thresholdArray.join(', ')}]`
    : String(threshold);
  return `const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      // entry.isIntersecting — boolean
      // entry.intersectionRatio — 0.0 to 1.0
      // entry.boundingClientRect
      // entry.intersectionRect
      // entry.rootBounds
      // entry.target — the observed element
      // entry.time — timestamp

      if (entry.isIntersecting) {
        // Element is visible
        console.log('Visible:', entry.intersectionRatio);
      } else {
        // Element is not visible
        console.log('Hidden');
      }
    });
  },
  {
    threshold: ${threshStr},
    rootMargin: '${rootMargin}',
    ${thresholdArray.length > 1 ? '// Multiple thresholds for granular visibility\n    ' : ''}}
);

observer.observe(document.querySelector('#target'));`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function IntersectionObserverPlaygroundPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>('Lazy Loading Image');
  const [threshold, setThreshold] = useState(0);
  const [rootMarginTop, setRootMarginTop] = useState(200);
  const [rootMarginRight, setRootMarginRight] = useState(0);
  const [rootMarginBottom, setRootMarginBottom] = useState(0);
  const [rootMarginLeft, setRootMarginLeft] = useState(0);
  const [thresholdArray, setThresholdArray] = useState<number[]>([0]);
  const [customThresholdInput, setCustomThresholdInput] = useState('');
  const [state, setState] = useState<ObserverState>({
    isIntersecting: false,
    intersectionRatio: 0,
    boundingClientRect: null,
    intersectionRect: null,
    rootBounds: null,
    time: 0,
    entryCount: 0,
  });
  const [isObserving, setIsObserving] = useState(false);
  const [copied, setCopied] = useState<'js' | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const entryCountRef = useRef(0);

  const activePreset = useMemo(() => PRESETS.find(p => p.name === selectedPreset)!, [selectedPreset]);

  const rootMargin = useMemo(() =>
    `${rootMarginTop}px ${rootMarginRight}px ${rootMarginBottom}px ${rootMarginLeft}px`,
    [rootMarginTop, rootMarginRight, rootMarginBottom, rootMarginLeft]
  );

  const jsCode = useMemo(() =>
    generateCode(threshold, rootMargin, thresholdArray),
    [threshold, rootMargin, thresholdArray]
  );

  // ── Apply preset ─────────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset.name);
    setThreshold(preset.threshold);
    setThresholdArray([...preset.thresholdArray]);
    const parts = preset.rootMargin.replace(/px/g, '').split(' ');
    const vals = parts.map(Number);
    if (vals.length === 1) {
      setRootMarginTop(vals[0]); setRootMarginRight(vals[0]);
      setRootMarginBottom(vals[0]); setRootMarginLeft(vals[0]);
    } else if (vals.length === 2) {
      setRootMarginTop(vals[0]); setRootMarginBottom(vals[0]);
      setRootMarginRight(vals[1]); setRootMarginLeft(vals[1]);
    } else if (vals.length === 4) {
      setRootMarginTop(vals[0]); setRootMarginRight(vals[1]);
      setRootMarginBottom(vals[2]); setRootMarginLeft(vals[3]);
    }
    stopObserving();
    setState({
      isIntersecting: false,
      intersectionRatio: 0,
      boundingClientRect: null,
      intersectionRect: null,
      rootBounds: null,
      time: 0,
      entryCount: 0,
    });
    entryCountRef.current = 0;
  }, []);

  // ── Custom threshold input ───────────────────────────────────────────────

  const applyCustomThresholds = useCallback(() => {
    const parsed = customThresholdInput
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n) && n >= 0 && n <= 1);
    if (parsed.length === 0) {
      toast.error('Enter valid numbers between 0 and 1 (e.g., 0, 0.5, 1)');
      return;
    }
    setThresholdArray(parsed);
    setThreshold(parsed.length === 1 ? parsed[0] : 0);
    stopObserving();
    setState({
      isIntersecting: false,
      intersectionRatio: 0,
      boundingClientRect: null,
      intersectionRect: null,
      rootBounds: null,
      time: 0,
      entryCount: 0,
    });
    entryCountRef.current = 0;
  }, [customThresholdInput]);

  // ── Start / Stop observer ────────────────────────────────────────────────

  const startObserving = useCallback(() => {
    if (!targetRef.current || !scrollContainerRef.current) return;

    stopObserving();

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        entryCountRef.current += 1;
        setState({
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          boundingClientRect: entry.boundingClientRect,
          intersectionRect: entry.intersectionRect,
          rootBounds: entry.rootBounds,
          time: entry.time,
          entryCount: entryCountRef.current,
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin,
        threshold: thresholdArray,
      }
    );

    observer.observe(targetRef.current);
    observerRef.current = observer;
    setIsObserving(true);
  }, [rootMargin, thresholdArray]);

  const stopObserving = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    setIsObserving(false);
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // ── Copy ─────────────────────────────────────────────────────────────────

  const handleCopyJs = useCallback(() => {
    navigator.clipboard.writeText(jsCode);
    setCopied('js');
    setTimeout(() => setCopied(null), 2000);
    toast.success('JavaScript copied!');
  }, [jsCode]);

  return (
    <ToolLayout
      title="Intersection Observer Playground"
      description="Visualize and interact with the Intersection Observer API in real time — configure thresholds, root margins, and see exactly what the browser reports."
    >
      {/* ── Presets ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedPreset === preset.name
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/50'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{activePreset.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Configuration Panel ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-surface-light border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-brand-400" />
              Observer Configuration
            </h3>

            {/* Threshold */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Threshold Array</label>
                <span className="font-mono text-xs text-brand-400">
                  [{thresholdArray.join(', ')}]
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customThresholdInput}
                  onChange={(e) => setCustomThresholdInput(e.target.value)}
                  placeholder="0, 0.5, 1"
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors placeholder:text-slate-600"
                />
                <button
                  onClick={applyCustomThresholds}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Manual threshold slider */}
            {thresholdArray.length === 1 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-400">Threshold</label>
                  <span className="font-mono text-xs text-brand-400">{threshold}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setThreshold(v);
                    setThresholdArray([v]);
                    stopObserving();
                    setState({ isIntersecting: false, intersectionRatio: 0, boundingClientRect: null, intersectionRect: null, rootBounds: null, time: 0, entryCount: 0 });
                    entryCountRef.current = 0;
                  }}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-0.5">
                  <span>0 (any pixel)</span>
                  <span>0.5 (50%)</span>
                  <span>1 (fully visible)</span>
                </div>
              </div>
            )}

            {/* Root Margin */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1.5">Root Margin (px)</label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Top</label>
                  <input
                    type="number"
                    value={rootMarginTop}
                    onChange={(e) => { setRootMarginTop(Number(e.target.value)); stopObserving(); }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Right</label>
                  <input
                    type="number"
                    value={rootMarginRight}
                    onChange={(e) => { setRootMarginRight(Number(e.target.value)); stopObserving(); }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Bottom</label>
                  <input
                    type="number"
                    value={rootMarginBottom}
                    onChange={(e) => { setRootMarginBottom(Number(e.target.value)); stopObserving(); }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Left</label>
                  <input
                    type="number"
                    value={rootMarginLeft}
                    onChange={(e) => { setRootMarginLeft(Number(e.target.value)); stopObserving(); }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">{rootMargin}</p>
            </div>

            {/* Observe button */}
            <div className="flex gap-2">
              <button
                onClick={startObserving}
                disabled={isObserving}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isObserving
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                }`}
              >
                <Play className="w-4 h-4" />
                Start Observing
              </button>
              <button
                onClick={stopObserving}
                disabled={!isObserving}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isObserving
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25'
                }`}
              >
                <Pause className="w-4 h-4" />
                Stop
              </button>
            </div>
          </div>

          {/* ── Live Intersection State ────────────────────────────────────── */}
          <div className="bg-surface-light border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-brand-400" />
              Live Intersection State
            </h3>

            {/* Is Intersecting */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${state.isIntersecting ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-slate-600'}`} />
              <span className="text-sm text-slate-300">
                {state.isIntersecting ? 'Intersecting' : 'Not Intersecting'}
              </span>
            </div>

            {/* Intersection Ratio Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Intersection Ratio</span>
                <span className="font-mono text-xs text-brand-400">
                  {(state.intersectionRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-150"
                  style={{ width: `${state.intersectionRatio * 100}%` }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-slate-800/50 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Entries Fired</span>
                <p className="text-sm font-mono text-slate-200">{state.entryCount}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Last Event</span>
                <p className="text-sm font-mono text-slate-200">{state.time ? formatTime(state.time) : '—'}</p>
              </div>
            </div>

            {/* Rect Details */}
            <div className="mt-3 space-y-1.5">
              <div className="text-xs">
                <span className="text-slate-500">boundingClientRect: </span>
                <span className="font-mono text-slate-400">{formatRect(state.boundingClientRect)}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">intersectionRect: </span>
                <span className="font-mono text-slate-400">{formatRect(state.intersectionRect)}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">rootBounds: </span>
                <span className="font-mono text-slate-400">{formatRect(state.rootBounds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Scroll Preview + JS Code ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Scroll Container */}
          <div className="bg-surface-light border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-brand-400" />
              Scroll Preview
            </h3>

            <div
              ref={scrollContainerRef}
              className="relative h-72 bg-slate-900 rounded-lg border border-slate-700 overflow-y-auto"
            >
              {/* Root margin indicator bars */}
              {isObserving && (
                <>
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-10 border-t border-dashed border-brand-400/30"
                    style={{ top: -rootMarginTop }}
                  />
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-10 border-b border-dashed border-brand-400/30"
                    style={{ bottom: -rootMarginBottom }}
                  />
                </>
              )}

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="text-xs text-slate-400 leading-relaxed">
                  {activePreset.containerContent}
                </div>

                {/* Extra filler to make scrolling meaningful */}
                <div className="h-20 flex items-center justify-center text-xs text-slate-600">
                  ↕ Scroll down to see the target ↓
                </div>
              </div>

              {/* Target element */}
              <div className="flex items-center justify-center py-6 px-4 mb-4">
                <div
                  ref={targetRef}
                  className={`
                    w-40 h-40 rounded-xl flex items-center justify-center
                    transition-all duration-300
                    ${activePreset.targetStyle}
                    ${state.isIntersecting ? 'ring-4 ring-emerald-400/50 scale-105 shadow-xl shadow-emerald-400/20' : 'ring-2 ring-slate-600/50 opacity-70'}
                  `}
                >
                  <div className="text-center">
                    <Eye className={`w-6 h-6 mx-auto mb-1 ${state.isIntersecting ? 'text-white' : 'text-slate-400'}`} />
                    <span className={`text-xs font-semibold ${state.isIntersecting ? 'text-white' : 'text-slate-400'}`}>
                      Target
                    </span>
                    {state.isIntersecting && (
                      <span className="block text-[10px] text-white/60 mt-0.5">
                        {(state.intersectionRatio * 100).toFixed(0)}% visible
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom filler */}
              <div className="p-4">
                <div className="h-20 flex items-center justify-center text-xs text-slate-600">
                  ↑ Scroll up to see the target appear ↑
                </div>
              </div>
            </div>
          </div>

          {/* ── Generated JavaScript ───────────────────────────────────────── */}
          <div className="bg-surface-light border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Code className="w-4 h-4 text-brand-400" />
                Generated JavaScript
              </h3>
              <button
                onClick={handleCopyJs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied === 'js' ? 'Copied!' : 'Copy JS'}
              </button>
            </div>
            <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed border border-slate-700/50">
              <code>{jsCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
