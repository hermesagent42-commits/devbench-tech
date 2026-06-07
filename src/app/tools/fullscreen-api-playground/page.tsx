'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Maximize2, Minimize2, Copy, Check, Play, Image, Film, Square, Monitor,
  Navigation, Eye, EyeOff, Zap, Info, ChevronDown, Trash2, Clock,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface FullscreenEvent {
  id: number;
  time: string;
  type: 'fullscreenchange' | 'fullscreenerror';
  isFullscreen: boolean;
  elementTag: string;
  elementId: string;
}

type PresetKey = 'color-panel' | 'video' | 'image' | 'iframe' | 'document';

interface Preset {
  id: PresetKey;
  label: string;
  icon: typeof Maximize2;
  description: string;
  elementRef: React.RefObject<HTMLDivElement | null>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeNow(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getFullscreenElementTag(): string {
  if (typeof document === 'undefined') return 'none';
  const el = document.fullscreenElement;
  if (!el) return 'none';
  if (el === document.documentElement) return 'html';
  if (el === document.body) return 'body';
  return (el as HTMLElement).tagName.toLowerCase();
}

function getFullscreenElementId(): string {
  if (typeof document === 'undefined') return '';
  const el = document.fullscreenElement;
  if (!el || el === document.documentElement || el === document.body) return '';
  return (el as HTMLElement).id || '(no id)';
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRESET_COLORS: Record<string, { bg: string; text: string }> = {
  'color-panel': { bg: 'from-violet-600 to-fuchsia-600', text: 'Fullscreen Color Panel' },
  'video': { bg: 'from-slate-800 to-slate-900', text: 'Video Element' },
  'image': { bg: 'from-indigo-600 to-blue-700', text: 'Image Element' },
  'iframe': { bg: 'from-emerald-600 to-teal-700', text: 'iframe Content' },
  'document': { bg: 'from-slate-700 to-slate-800', text: 'Entire Document' },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function FullscreenAPIPlayground() {
  // Refs for each element that can be fullscreened
  const panelRef = useRef<HTMLDivElement>(null!);
  const videoRef = useRef<HTMLVideoElement>(null!);
  const imageRef = useRef<HTMLDivElement>(null!);
  const iframeRef = useRef<HTMLDivElement>(null!);

  const [events, setEvents] = useState<FullscreenEvent[]>([]);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNavUI, setShowNavUI] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Fullscreen API wrappers ──────────────────────────────────────────────

  const requestFullscreen = useCallback(async (el: HTMLElement) => {
    setErrorMsg(null);
    try {
      if (showNavUI) {
        await el.requestFullscreen({ navigationUI: 'show' });
      } else {
        await el.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch (err: any) {
      const msg = err?.message || 'Fullscreen request denied';
      setErrorMsg(msg);
      addEvent('fullscreenerror', false);
    }
  }, [showNavUI]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Exit fullscreen failed');
    }
  }, []);

  // ── Event management ─────────────────────────────────────────────────────

  const addEvent = useCallback((type: 'fullscreenchange' | 'fullscreenerror', fs: boolean) => {
    setEvents(prev => {
      const newEvent: FullscreenEvent = {
        id: Date.now(),
        time: timeNow(),
        type,
        isFullscreen: fs,
        elementTag: getFullscreenElementTag(),
        elementId: getFullscreenElementId(),
      };
      return [newEvent, ...prev].slice(0, 50); // keep last 50
    });
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  // ── Listen to fullscreen changes ─────────────────────────────────────────

  useEffect(() => {
    const handleChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      addEvent('fullscreenchange', fs);
      if (!fs) setActivePreset(null);
    };

    const handleError = () => {
      setIsFullscreen(false);
      addEvent('fullscreenerror', false);
      setErrorMsg('Fullscreen error occurred (check console for details)');
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('fullscreenerror', handleError);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('fullscreenerror', handleError);
    };
  }, [addEvent]);

  // ── Actions per preset ───────────────────────────────────────────────────

  const enterPreset = useCallback((key: PresetKey) => {
    setActivePreset(key);
    setErrorMsg(null);

    switch (key) {
      case 'color-panel':
        panelRef.current && requestFullscreen(panelRef.current);
        break;
      case 'video':
        videoRef.current && requestFullscreen(videoRef.current);
        break;
      case 'image':
        imageRef.current && requestFullscreen(imageRef.current);
        break;
      case 'iframe':
        iframeRef.current && requestFullscreen(iframeRef.current);
        break;
      case 'document':
        requestFullscreen(document.documentElement);
        break;
    }
  }, [requestFullscreen]);

  // ── Copy helper ──────────────────────────────────────────────────────────

  const copySnippet = useCallback((name: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSnippet(name);
      toast.success('Copied!');
      setTimeout(() => setCopiedSnippet(null), 2000);
    });
  }, []);

  // ── Code snippets ────────────────────────────────────────────────────────

  const snippets = {
    basic: `// Request fullscreen on an element
const el = document.getElementById('my-element');
await el.requestFullscreen();

// Exit fullscreen
await document.exitFullscreen();

// Check if fullscreen is active
if (document.fullscreenElement) {
  console.log('Fullscreen is active');
}`,
    withOptions: `// Fullscreen with navigation UI hidden
await el.requestFullscreen({ navigationUI: 'hide' });

// Fullscreen with navigation UI shown (default)
await el.requestFullscreen({ navigationUI: 'show' });`,
    events: `// Listen for fullscreen changes
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    console.log('Entered fullscreen:', document.fullscreenElement);
  } else {
    console.log('Exited fullscreen');
  }
});

// Listen for fullscreen errors
document.addEventListener('fullscreenerror', (event) => {
  console.error('Fullscreen error:', event);
});`,
  };

  const isSupported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Fullscreen API Playground"
      description="Test the browser Fullscreen API — enter fullscreen on different elements, log events, toggle navigation UI, and copy production-ready code snippets."
      controls={
        <div className="flex flex-wrap items-center gap-3">
          {isFullscreen ? (
            <button
              onClick={exitFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-sm font-medium transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              Exit Fullscreen (Esc)
            </button>
          ) : null}
          <button
            onClick={() => setShowNavUI(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showNavUI
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30 hover:bg-brand-500/20'
                : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700'
            }`}
          >
            {showNavUI ? <Navigation className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Nav UI: {showNavUI ? 'Show' : 'Hide'}
          </button>
          {errorMsg && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errorMsg}
            </span>
          )}
        </div>
      }
    >
      {!isSupported ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-amber-300 font-medium mb-1">Fullscreen API Not Supported</p>
          <p className="text-sm text-amber-400/80">Your browser does not support the Fullscreen API. Try Chrome, Firefox, or Edge.</p>
        </div>
      ) : (
        <>
          {/* ── Preset Cards ───────────────────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Test Elements</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {([
                { key: 'color-panel' as PresetKey, label: 'Color Panel', icon: Square, desc: 'A styled div' },
                { key: 'video' as PresetKey, label: 'Video', icon: Film, desc: 'HTML5 &lt;video&gt;' },
                { key: 'image' as PresetKey, label: 'Image', icon: Image, desc: 'A div with image' },
                { key: 'iframe' as PresetKey, label: 'iframe', icon: Monitor, desc: 'Embedded page' },
                { key: 'document' as PresetKey, label: 'Document', icon: Maximize2, desc: 'Whole page' },
              ] as const).map(p => (
                <button
                  key={p.key}
                  onClick={() => enterPreset(p.key)}
                  disabled={isFullscreen}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center ${
                    isFullscreen
                      ? 'border-slate-700/30 bg-slate-800/30 text-slate-600 cursor-not-allowed'
                      : activePreset === p.key
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-400 shadow-lg shadow-brand-500/10'
                      : 'border-slate-700/50 bg-surface-light hover:border-slate-600 hover:bg-surface text-slate-300'
                  }`}
                >
                  <p.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{p.label}</span>
                  <span className="text-[10px] text-slate-500">{p.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Demo Elements (hidden / fullscreen target) ────────────────── */}
          <div className="space-y-4 mb-8">
            {/* Color Panel */}
            <div
              ref={panelRef}
              id="fs-color-panel"
              className={`rounded-xl bg-gradient-to-br ${PRESET_COLORS['color-panel'].bg} p-8 text-center border border-slate-700/50 transition-all ${isFullscreen && document.fullscreenElement === panelRef.current ? 'fixed inset-0 z-50' : ''}`}
            >
              <div className="flex items-center justify-center gap-2 text-white/90 text-xl font-bold">
                <Square className="w-6 h-6" />
                {PRESET_COLORS['color-panel'].text}
              </div>
              <p className="text-white/70 text-sm mt-2">This is a styled &lt;div&gt; element</p>
              <button
                onClick={() => enterPreset('color-panel')}
                className="mt-4 px-4 py-1.5 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
              >
                <Maximize2 className="w-4 h-4 inline mr-1.5" />
                Fullscreen
              </button>
            </div>

            {/* Video */}
            <div className="rounded-xl border border-slate-700/50 bg-surface-light p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Video Element
              </h3>
              <video
                ref={videoRef}
                id="fs-video"
                controls
                className="w-full max-w-lg rounded-lg"
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect fill='%231e293b' width='640' height='360'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E🎬 Video Demo%3C/text%3E%3C/svg%3E"
              >
                <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <button
                onClick={() => enterPreset('video')}
                className="mt-3 px-4 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/30 text-sm font-medium hover:bg-brand-500/20 transition-colors"
              >
                <Maximize2 className="w-4 h-4 inline mr-1.5" />
                Fullscreen Video
              </button>
            </div>

            {/* Image */}
            <div
              ref={imageRef}
              id="fs-image"
              className="rounded-xl bg-gradient-to-br from-indigo-600/30 to-blue-700/30 border border-slate-700/50 p-4"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Image Element
              </h3>
              <div className="relative rounded-lg overflow-hidden max-w-md bg-slate-800">
                <svg viewBox="0 0 400 200" className="w-full">
                  <defs>
                    <linearGradient id="imgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <rect width="400" height="200" fill="url(#imgGrad)" />
                  <circle cx="200" cy="80" r="30" fill="rgba(255,255,255,0.2)" />
                  <polygon points="200,40 260,140 140,140" fill="rgba(255,255,255,0.15)" />
                  <rect x="100" y="140" width="200" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
                </svg>
              </div>
              <button
                onClick={() => enterPreset('image')}
                className="mt-3 px-4 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/30 text-sm font-medium hover:bg-brand-500/20 transition-colors"
              >
                <Maximize2 className="w-4 h-4 inline mr-1.5" />
                Fullscreen Image
              </button>
            </div>

            {/* iframe */}
            <div
              ref={iframeRef}
              id="fs-iframe"
              className="rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-700/30 border border-slate-700/50 p-4"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                iframe Content
              </h3>
              <div className="rounded-lg overflow-hidden border border-slate-600/50 max-w-lg bg-slate-800">
                <iframe
                  src="about:blank"
                  title="Demo iframe"
                  className="w-full h-32"
                  sandbox="allow-scripts"
                  srcDoc={`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100%;background:#0f172a;color:#94a3b8;font-family:sans-serif;font-size:18px;">🌐 Embedded Content</body></html>`}
                />
              </div>
              <button
                onClick={() => enterPreset('iframe')}
                className="mt-3 px-4 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/30 text-sm font-medium hover:bg-brand-500/20 transition-colors"
              >
                <Maximize2 className="w-4 h-4 inline mr-1.5" />
                Fullscreen iframe
              </button>
            </div>
          </div>

          {/* ── Event Log ──────────────────────────────────────────────────── */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Event Log
                {events.length > 0 && (
                  <span className="text-xs font-normal text-slate-500">({events.length} events)</span>
                )}
              </h2>
              {events.length > 0 && (
                <button
                  onClick={clearEvents}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {events.length === 0 ? (
              <div className="rounded-xl border border-slate-700/50 bg-surface-light p-6 text-center">
                <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No events yet. Click a preset to trigger fullscreen events.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800/95">
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-700/50">
                        <th className="px-4 py-2 font-medium">Time</th>
                        <th className="px-4 py-2 font-medium">Event</th>
                        <th className="px-4 py-2 font-medium">Fullscreen</th>
                        <th className="px-4 py-2 font-medium">Element</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(ev => (
                        <tr key={ev.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-2 text-slate-500 font-mono text-xs">{ev.time}</td>
                          <td className="px-4 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                              ev.type === 'fullscreenchange'
                                ? ev.isFullscreen
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {ev.type}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {ev.type === 'fullscreenchange' ? (
                              ev.isFullscreen
                                ? <span className="text-emerald-400 text-xs">✅ active</span>
                                : <span className="text-amber-400 text-xs">⬜ exited</span>
                            ) : (
                              <span className="text-red-400 text-xs">❌ error</span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-400">
                            &lt;{ev.elementTag}&gt; {ev.elementId ? `#${ev.elementId}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ── Code Snippets ──────────────────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" />
              Code Snippets
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(snippets).map(([name, code]) => (
                <div key={name} className="rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-800/50">
                    <span className="text-xs font-medium text-slate-400 capitalize">
                      {name === 'basic' ? 'Basic Usage' : name === 'withOptions' ? 'Navigation UI' : 'Event Listeners'}
                    </span>
                    <button
                      onClick={() => copySnippet(name, code)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                    >
                      {copiedSnippet === name ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">{code}</pre>
                </div>
              ))}
            </div>
          </section>

          {/* ── Info Panel ─────────────────────────────────────────────────── */}
          <section>
            <div className="rounded-xl border border-slate-700/50 bg-surface-light p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-400" />
                Fullscreen API Quick Reference
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-400">
                <div>
                  <p className="font-medium text-slate-300 mb-1">Enter Fullscreen</p>
                  <code className="text-brand-400 bg-slate-800/50 px-1 py-0.5 rounded">element.requestFullscreen()</code>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1">Exit Fullscreen</p>
                  <code className="text-brand-400 bg-slate-800/50 px-1 py-0.5 rounded">document.exitFullscreen()</code>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1">Current Element</p>
                  <code className="text-brand-400 bg-slate-800/50 px-1 py-0.5 rounded">document.fullscreenElement</code>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1">Is Enabled</p>
                  <code className="text-brand-400 bg-slate-800/50 px-1 py-0.5 rounded">document.fullscreenEnabled</code>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1">Change Event</p>
                  <code className="text-amber-400 bg-slate-800/50 px-1 py-0.5 rounded">fullscreenchange</code>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1">Error Event</p>
                  <code className="text-red-400 bg-slate-800/50 px-1 py-0.5 rounded">fullscreenerror</code>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1">Keyboard Shortcut</p>
                  <kbd className="text-slate-300 bg-slate-700/50 px-1 py-0.5 rounded border border-slate-600/50">Esc</kbd>
                  <span className="text-slate-600 ml-1">to exit</span>
                </div>
                <div>
                  <p className="font-medium text-slate-300 mb-1">Browser Support</p>
                  <span className="text-emerald-400">All modern browsers ✅</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </ToolLayout>
  );
}
