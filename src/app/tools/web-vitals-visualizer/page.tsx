'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Play, RotateCcw, Gauge, Image, Type, ArrowDown, Zap, MousePointer2, MoveVertical, Clock, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── LCP Demo ────────────────────────────────────────────────────────────────

type LCPElement = 'hero-image' | 'hero-heading' | 'body-text';

interface LCPDemoState {
  showImage: boolean;
  imageHeight: number;
  headingSize: number;
  textBlocks: number;
  currentElement: string;
  lcpElement: string;
}

const LCP_WEIGHTS: Record<LCPElement, { label: string; color: string }> = {
  'hero-image': { label: 'Hero Image', color: 'border-blue-500 bg-blue-500/20' },
  'hero-heading': { label: 'Hero Heading', color: 'border-purple-500 bg-purple-500/20' },
  'body-text': { label: 'Body Text', color: 'border-green-500 bg-green-500/20' },
};

function LCPSimulator() {
  const [state, setState] = useState<LCPDemoState>({
    showImage: true,
    imageHeight: 300,
    headingSize: 40,
    textBlocks: 3,
    currentElement: '',
    lcpElement: '',
  });
  const [running, setRunning] = useState(false);
  const [lcpTime, setLcpTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runLCP = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    setRunning(true);
    setState(s => ({ ...s, currentElement: '', lcpElement: '' }));
    setLcpTime(0);

    const start = performance.now();
    let largest = { element: '' as string, size: 0 };

    // Image loads
    if (state.showImage) {
      const imgTime = 400 + Math.random() * 200;
      timerRef.current.push(setTimeout(() => {
        const w = 600; const h = state.imageHeight;
        const size = w * h;
        if (size > largest.size) { largest = { element: 'hero-image', size }; }
        setState(s => ({ ...s, currentElement: 'hero-image' }));
      }, imgTime));
    }

    // Heading renders
    const headingTime = 200 + Math.random() * 100;
    timerRef.current.push(setTimeout(() => {
      const w = 600; const h = state.headingSize * 1.5;
      const size = w * h;
      if (size > largest.size) { largest = { element: 'hero-heading', size }; }
      setState(s => ({ ...s, currentElement: 'hero-heading' }));
    }, headingTime));

    // Text blocks render
    const textTime = 600 + Math.random() * 300;
    timerRef.current.push(setTimeout(() => {
      const w = 600; const h = state.textBlocks * 80;
      const size = w * h;
      if (size > largest.size) { largest = { element: 'body-text', size }; }
      setState(s => ({ ...s, currentElement: 'body-text' }));
    }, textTime));

    // Resolve LCP
    timerRef.current.push(setTimeout(() => {
      const end = performance.now();
      setLcpTime(Math.round(end - start));
      setState(s => ({ ...s, lcpElement: largest.element }));
      setRunning(false);
    }, 1200));
  }, [state]);

  useEffect(() => {
    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  const lcpScore = lcpTime <= 2500 ? 'good' : lcpTime <= 4000 ? 'needs-improvement' : 'poor';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        <Gauge className="w-5 h-5 text-brand-400" />
        Largest Contentful Paint (LCP)
      </h3>
      <p className="text-sm text-slate-400">
        LCP measures when the largest content element becomes visible. Target: <strong className="text-green-400">&lt; 2.5s</strong>.
      </p>

      {/* Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 rounded-lg border border-slate-800">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Hero Image</span>
          <button
            onClick={() => setState(s => ({ ...s, showImage: !s.showImage }))}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              state.showImage
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {state.showImage ? 'On' : 'Off'}
          </button>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Image Height: {state.imageHeight}px</span>
          <input
            type="range" min={100} max={500} step={10}
            value={state.imageHeight}
            onChange={e => setState(s => ({ ...s, imageHeight: Number(e.target.value) }))}
            className="accent-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Heading Size: {state.headingSize}px</span>
          <input
            type="range" min={20} max={64} step={2}
            value={state.headingSize}
            onChange={e => setState(s => ({ ...s, headingSize: Number(e.target.value) }))}
            className="accent-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Text Blocks: {state.textBlocks}</span>
          <input
            type="range" min={1} max={8} step={1}
            value={state.textBlocks}
            onChange={e => setState(s => ({ ...s, textBlocks: Number(e.target.value) }))}
            className="accent-brand-500"
          />
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={runLCP}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Play className="w-4 h-4" /> Simulate Page Load
        </button>
      </div>

      {/* Simulated Page */}
      <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs text-slate-400">Simulated Viewport (approx. mobile)</div>
        <div className="p-4 max-w-sm mx-auto space-y-3 min-h-[300px] relative">
          {/* Header bar */}
          <div className="h-6 bg-slate-800 rounded w-full" />

          {/* Hero Image */}
          {state.showImage && (
            <div
              className={`rounded-lg transition-all duration-700 flex items-center justify-center ${
                state.lcpElement === 'hero-image'
                  ? 'ring-2 ring-yellow-400 bg-yellow-400/10'
                  : 'bg-gradient-to-br from-slate-700 to-slate-800'
              }`}
              style={{ height: state.imageHeight }}
            >
              {state.lcpElement === 'hero-image' && (
                <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">🏆 LCP Element</span>
              )}
              {state.lcpElement !== 'hero-image' && (
                <div className="text-center">
                  <Image className="w-8 h-8 text-slate-600 mx-auto mb-1" />
                  <span className="text-xs text-slate-600">Hero Image</span>
                </div>
              )}
            </div>
          )}

          {/* Heading */}
          <div
            className={`transition-all duration-700 rounded ${
              state.lcpElement === 'hero-heading' ? 'ring-2 ring-yellow-400 bg-yellow-400/10' : ''
            }`}
          >
            {state.lcpElement === 'hero-heading' && (
              <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded inline-block mb-1">🏆 LCP Element</span>
            )}
            <div
              className="bg-slate-700 rounded transition-all duration-700"
              style={{ height: state.headingSize * 1.5, width: '100%' }}
            >
              <div className="flex items-center h-full px-3">
                <Type className="w-4 h-4 text-slate-500 mr-2" />
                <div
                  className="bg-gradient-to-r from-slate-500 to-transparent rounded transition-all"
                  style={{ height: Math.max(12, state.headingSize * 0.6), width: `${Math.min(70, state.headingSize * 1.8)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Body text blocks */}
          <div
            className={`transition-all duration-700 rounded ${
              state.lcpElement === 'body-text' ? 'ring-2 ring-yellow-400 bg-yellow-400/10 p-1' : ''
            }`}
          >
            {state.lcpElement === 'body-text' && (
              <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded inline-block mb-1">🏆 LCP Element</span>
            )}
            <div className="space-y-2">
              {Array.from({ length: state.textBlocks }).map((_, i) => (
                <div key={i} className="h-3 bg-slate-700 rounded transition-all duration-700" style={{ width: `${90 - i * 12}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {lcpTime > 0 && (
        <div className={`p-4 rounded-lg border ${
          lcpScore === 'good' ? 'bg-green-500/10 border-green-500/30' :
          lcpScore === 'needs-improvement' ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-2xl font-mono font-bold ${
              lcpScore === 'good' ? 'text-green-400' :
              lcpScore === 'needs-improvement' ? 'text-yellow-400' :
              'text-red-400'
            }`}>{lcpTime}ms</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              lcpScore === 'good' ? 'bg-green-500/20 text-green-400' :
              lcpScore === 'needs-improvement' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {lcpScore === 'good' ? '✅ Good' : lcpScore === 'needs-improvement' ? '⚠️ Needs Improvement' : '❌ Poor'}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            LCP element: <strong>{LCP_WEIGHTS[state.lcpElement as LCPElement]?.label || 'None'}</strong>.
            {lcpTime > 2500 && (
              <span> Consider optimizing <strong>{LCP_WEIGHTS[state.lcpElement as LCPElement]?.label || 'this element'}</strong> — use smaller images, lazy-load offscreen content, or use a CDN.</span>
            )}
          </p>
          <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="h-full flex">
              <div className="bg-green-500 h-full" style={{ width: '41.7%' }} />
              <div className="bg-yellow-500 h-full" style={{ width: '25%' }} />
              <div className="bg-red-500/30 h-full" style={{ width: '33.3%' }} />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0ms</span><span>2.5s</span><span>4s</span><span>6s</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CLS Demo ────────────────────────────────────────────────────────────────

function CLSSimulator() {
  const [clsScore, setClsScore] = useState(0);
  const [events, setEvents] = useState<{ id: number; desc: string; score: number }[]>([]);
  const [running, setRunning] = useState(false);

  const runCLS = useCallback(() => {
    setRunning(true);
    setClsScore(0);
    setEvents([]);

    let total = 0;
    const delays = [800, 1600, 2500, 3400];
    const shifts = [
      { desc: 'Third-party ad loads, pushing content down 120px', score: 0.18 },
      { desc: 'Lazy-loaded image renders without dimensions (100px shift)', score: 0.15 },
      { desc: 'Web font loads, changing text metrics (40px shift)', score: 0.06 },
      { desc: 'Consent banner injects at top (80px shift)', score: 0.12 },
    ];

    shifts.forEach((shift, i) => {
      setTimeout(() => {
        total = Math.min(total + shift.score, 1);
        setClsScore(Math.round(total * 1000) / 1000);
        setEvents(prev => [...prev, { id: i, desc: shift.desc, score: shift.score }]);
        if (i === shifts.length - 1) setRunning(false);
      }, delays[i]);
    });
  }, []);

  const cls = clsScore;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        <MoveVertical className="w-5 h-5 text-amber-400" />
        Cumulative Layout Shift (CLS)
      </h3>
      <p className="text-sm text-slate-400">
        CLS measures visual stability — how much the page layout unexpectedly shifts. Target: <strong className="text-green-400">&lt; 0.1</strong>.
      </p>

      <button
        onClick={runCLS}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Play className="w-4 h-4" /> Simulate Layout Shifts
      </button>

      {/* Animated page */}
      <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900 relative min-h-[300px]">
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs text-slate-400">Simulated Page</div>
        <div className="p-4 space-y-3 relative">
          {/* Nav */}
          <div className="h-8 bg-slate-700 rounded" />

          {/* Ad injection (event 0) */}
          {events.some(e => e.id >= 0) && (
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-2 text-center animate-bounce">
              <span className="text-xs text-amber-400">📢 Sponsored Ad</span>
            </div>
          )}

          {/* Hero */}
          <div className={`h-24 bg-slate-700 rounded flex items-center justify-center ${events.some(e => e.id >= 0) ? 'mt-0' : ''}`}>
            <span className="text-xs text-slate-500">Hero Section</span>
          </div>

          {/* Image (event 1) */}
          {events.some(e => e.id >= 1) && (
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4 animate-pulse">
              <Image className="w-6 h-6 text-blue-400 mx-auto mb-1" />
              <span className="text-xs text-blue-400 block text-center">Lazy-loaded Image</span>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            {['Content block 1', 'Content block 2'].map((t, i) => (
              <div
                key={i}
                className={`h-3 bg-slate-700 rounded ${
                  events.some(e => e.id >= 2) ? 'scale-y-110 origin-top transition-transform duration-500' : ''
                }`}
                style={{ width: `${80 - i * 10}%` }}
              />
            ))}
          </div>

          {/* Consent banner (event 3) */}
          {events.some(e => e.id >= 3) && (
            <div className="bg-purple-500/20 border border-purple-500/40 rounded-lg p-2 text-center animate-slide-up">
              <span className="text-xs text-purple-400">🍪 Cookie Consent Banner</span>
            </div>
          )}

          {/* Footer */}
          <div className="h-6 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Live score */}
      <div className={`p-4 rounded-lg border ${
        cls <= 0.1 ? 'bg-green-500/10 border-green-500/30' :
        cls <= 0.25 ? 'bg-yellow-500/10 border-yellow-500/30' :
        cls > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-2xl font-mono font-bold ${
            cls === 0 ? 'text-slate-500' :
            cls <= 0.1 ? 'text-green-400' :
            cls <= 0.25 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {cls === 0 ? '—' : cls.toFixed(3)}
          </span>
          {cls > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              cls <= 0.1 ? 'bg-green-500/20 text-green-400' :
              cls <= 0.25 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {cls <= 0.1 ? '✅ Good' : cls <= 0.25 ? '⚠️ Needs Improvement' : '❌ Poor'}
            </span>
          )}
        </div>

        {/* Shift events log */}
        {events.length > 0 && (
          <div className="mt-3 space-y-2">
            {events.map(e => (
              <div key={e.id} className="flex items-start gap-2 p-2 bg-slate-800 rounded border border-slate-700">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-300">{e.desc}</p>
                  <p className="text-xs text-slate-500">Shift score: +{e.score.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLS formula reference */}
      <div className="p-3 bg-slate-900 rounded border border-slate-800">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-400">CLS Formula:</strong> impact fraction × distance fraction = layout shift score.
          Impact = % of viewport affected. Distance = % of viewport the unstable element moved.
        </p>
      </div>
    </div>
  );
}

// ── INP Demo ────────────────────────────────────────────────────────────────

function INPSimulator() {
  const [delay, setDelay] = useState(20);
  const [lastINP, setLastINP] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const simulateClick = useCallback(() => {
    setClickCount(c => c + 1);
    setProcessing(true);

    // Simulate the specified delay
    const start = performance.now();
    setTimeout(() => {
      const actualDelay = performance.now() - start;
      const inp = Math.round(actualDelay);
      setLastINP(inp);
      setProcessing(false);
      setBusy(false);
    }, delay);
    setBusy(true);
  }, [delay]);

  const inpScore = lastINP === null ? null :
    lastINP <= 200 ? 'good' :
    lastINP <= 500 ? 'needs-improvement' : 'poor';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        <MousePointer2 className="w-5 h-5 text-rose-400" />
        Interaction to Next Paint (INP)
      </h3>
      <p className="text-sm text-slate-400">
        INP measures responsiveness — how long the page takes to respond to clicks, taps, and key presses. Target: <strong className="text-green-400">&lt; 200ms</strong>.
      </p>

      {/* Controls */}
      <div className="space-y-3 p-4 bg-slate-900 rounded-lg border border-slate-800">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Simulated Processing Delay: {delay}ms</span>
          <input
            type="range" min={10} max={1000} step={10}
            value={delay}
            onChange={e => setDelay(Number(e.target.value))}
            className="accent-brand-500"
          />
        </label>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-green-400">10ms</span>
          <ArrowDown className="w-3 h-3" />
          <span>Adjust to simulate heavy vs. light JS processing</span>
          <ArrowDown className="w-3 h-3" />
          <span className="text-red-400">1000ms</span>
        </div>
      </div>

      {/* Interactive button */}
      <div className="p-6 text-center">
        <button
          onClick={simulateClick}
          disabled={processing}
          className={`px-8 py-4 rounded-xl text-lg font-bold transition-all duration-200 ${
            processing
              ? 'bg-slate-800 text-slate-500 cursor-wait scale-95'
              : busy
              ? 'bg-brand-600 text-white cursor-pointer hover:bg-brand-500 hover:scale-105 active:scale-95'
              : 'bg-brand-600 text-white cursor-pointer hover:bg-brand-500 hover:scale-105 active:scale-95'
          }`}
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5 animate-spin" />
              Processing... {delay}ms
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Click Me! (INP Test)
            </span>
          )}
        </button>
      </div>

      {/* Results */}
      {lastINP !== null && (
        <div className={`p-4 rounded-lg border ${
          inpScore === 'good' ? 'bg-green-500/10 border-green-500/30' :
          inpScore === 'needs-improvement' ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-2xl font-mono font-bold ${
              inpScore === 'good' ? 'text-green-400' :
              inpScore === 'needs-improvement' ? 'text-yellow-400' :
              'text-red-400'
            }`}>{lastINP}ms</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              inpScore === 'good' ? 'bg-green-500/20 text-green-400' :
              inpScore === 'needs-improvement' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {inpScore === 'good' ? '✅ Good' : inpScore === 'needs-improvement' ? '⚠️ Needs Improvement' : '❌ Poor'}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Click #{clickCount}. {inpScore === 'good'
              ? 'Interaction responded quickly — under 200ms threshold!'
              : inpScore === 'needs-improvement'
              ? `Interaction took ${lastINP}ms. Consider: break up long tasks, use requestIdleCallback() or scheduler.yield().`
              : `Interaction took ${lastINP}ms (>500ms!). Urgent: offload heavy work to Web Workers, defer non-critical JS, use isInputPending().`
            }
          </p>
        </div>
      )}

      {clickCount === 0 && (
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-center">
          <Info className="w-5 h-5 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Click the button above to simulate an interaction and measure response time.</p>
        </div>
      )}

      {/* Multiple clicks summary */}
      {clickCount > 1 && (
        <div className="p-3 bg-slate-900 rounded border border-slate-800">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Tip:</strong> INP is measured as the <strong>75th percentile</strong> of all interactions.
            Try clicking with different delay settings to see how varying JS load affects your score. Real-world INP looks at
            the worst interaction in a session.
          </p>
        </div>
      )}

      {/* Quick reference thresholds */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Good', value: '≤ 200ms', color: 'bg-green-500/10 border-green-500/30 text-green-400' },
          { label: 'Needs Work', value: '200-500ms', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
          { label: 'Poor', value: '> 500ms', color: 'bg-red-500/10 border-red-500/30 text-red-400' },
        ].map(item => (
          <div key={item.label} className={`p-2 rounded border text-center ${item.color}`}>
            <div className="text-xs font-semibold">{item.label}</div>
            <div className="text-[10px] opacity-75">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function WebVitalsVisualizer() {
  const [tab, setTab] = useState<'lcp' | 'cls' | 'inp'>('lcp');

  const tabs = [
    { key: 'lcp' as const, label: 'LCP', desc: 'Largest Contentful Paint', icon: Gauge },
    { key: 'cls' as const, label: 'CLS', desc: 'Cumulative Layout Shift', icon: MoveVertical },
    { key: 'inp' as const, label: 'INP', desc: 'Interaction to Next Paint', icon: MousePointer2 },
  ];

  return (
    <ToolLayout
      title="Web Vitals Visualizer"
      description="Interactive demos for Core Web Vitals — LCP, CLS, and INP. Understand what they measure and how to optimize for them."
    >
      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-slate-900 rounded-lg p-1 border border-slate-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-slate-800 text-slate-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="text-xs opacity-70 hidden sm:inline">— {t.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {tab === 'lcp' && <LCPSimulator />}
        {tab === 'cls' && <CLSSimulator />}
        {tab === 'inp' && <INPSimulator />}
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-slate-900 rounded-lg border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">About Core Web Vitals</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Core Web Vitals are metrics defined by Google to measure real-world user experience. They&apos;re part of Google&apos;s
          ranking algorithm and are reported in tools like Lighthouse, PageSpeed Insights, Chrome User Experience Report (CrUX),
          and the Web Vitals JavaScript library. All three metrics (LCP, CLS, INP) must pass their thresholds for a site to be
          considered &ldquo;good.&rdquo;
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">web-vitals.js</span>
          <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">Lighthouse</span>
          <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">PageSpeed Insights</span>
          <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">CrUX Report</span>
          <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">RUM</span>
        </div>
      </div>
    </ToolLayout>
  );
}
