'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play, Square, Trash2, Copy, Gauge,
  BarChart3, Activity, ChevronDown, ChevronRight,
  Zap, Timer
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type EntryType = 'navigation' | 'paint' | 'resource' | 'layout-shift' | 'largest-contentful-paint' | 'longtask' | 'element' | 'mark' | 'measure';

interface ObserverOption {
  type: EntryType;
  label: string;
  icon: string;
  enabled: boolean;
  description: string;
}

interface CollectedEntry {
  id: string;
  type: EntryType;
  name: string;
  startTime: number;
  duration: number;
  timestamp: number;
  details: Record<string, unknown>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const OBSERVER_OPTIONS: ObserverOption[] = [
  { type: 'navigation', label: 'Navigation', icon: '🧭', enabled: true, description: 'Navigation timing — DNS, TLS, TTFB, DOM load' },
  { type: 'paint', label: 'Paint', icon: '🎨', enabled: true, description: 'First Paint (FP) and First Contentful Paint (FCP)' },
  { type: 'resource', label: 'Resources', icon: '📦', enabled: true, description: 'All resource loads — scripts, styles, images, fonts' },
  { type: 'largest-contentful-paint', label: 'LCP', icon: '🖼️', enabled: true, description: 'Largest Contentful Paint — when the biggest element renders' },
  { type: 'layout-shift', label: 'Layout Shifts', icon: '📐', enabled: true, description: 'Cumulative Layout Shift — visual stability metric' },
  { type: 'longtask', label: 'Long Tasks', icon: '🐌', enabled: true, description: 'Tasks that blocked the main thread for >50ms' },
  { type: 'element', label: 'Element', icon: '🏷️', enabled: false, description: 'Element timing — observe specific elements' },
  { type: 'mark', label: 'Marks', icon: '📌', enabled: true, description: 'User timing marks added via performance.mark()' },
  { type: 'measure', label: 'Measures', icon: '📏', enabled: true, description: 'User timing measures created via performance.measure()' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMs(value: number): string {
  if (value < 1) return (value * 1000).toFixed(1) + ' µs';
  if (value < 1000) return value.toFixed(2) + ' ms';
  return (value / 1000).toFixed(2) + ' s';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function extractNavigationDetails(entry: PerformanceNavigationTiming): Record<string, unknown> {
  return {
    'DNS Lookup': formatMs(entry.domainLookupEnd - entry.domainLookupStart),
    'TLS Handshake': entry.secureConnectionStart > 0
      ? formatMs(entry.connectEnd - entry.secureConnectionStart)
      : 'N/A (non-HTTPS)',
    'TCP Connection': formatMs(entry.connectEnd - entry.connectStart),
    'TTFB': formatMs(entry.responseStart - entry.requestStart),
    'Download': formatMs(entry.responseEnd - entry.responseStart),
    'DOM Interactive': formatMs(entry.domInteractive - entry.fetchStart),
    'DOM Content Loaded': formatMs(entry.domContentLoadedEventEnd - entry.fetchStart),
    'Load Complete': formatMs(entry.loadEventEnd - entry.fetchStart),
    'Total Redirects': entry.redirectCount,
    'Transfer Size': formatBytes(entry.transferSize),
    'Protocol': entry.nextHopProtocol,
    'Type': entry.type,
  };
}

function extractResourceDetails(entry: PerformanceResourceTiming): Record<string, unknown> {
  return {
    'DNS': formatMs(entry.domainLookupEnd - entry.domainLookupStart),
    'TCP': formatMs(entry.connectEnd - entry.connectStart),
    'TLS': entry.secureConnectionStart > 0
      ? formatMs(entry.connectEnd - entry.secureConnectionStart)
      : '-',
    'Request': formatMs(entry.responseStart - entry.requestStart),
    'Response': formatMs(entry.responseEnd - entry.responseStart),
    'Total': formatMs(entry.duration),
    'Transfer Size': formatBytes(entry.transferSize),
    'Status': `${entry.responseStatus}`,
    'Protocol': entry.nextHopProtocol,
    'Initiator': entry.initiatorType,
    'Cache': entry.transferSize === 0 ? 'Cached' : 'Network',
  };
}

function extractLCPDetails(entry: any): Record<string, unknown> {
  return {
    'Render Time': formatMs(entry.renderTime || entry.startTime),
    'Load Time': formatMs(entry.loadTime || 0),
    'Size': `${entry.size} px²`,
    'Element': entry.element?.tagName || 'unknown',
    'URL': entry.url || '-',
  };
}

function extractLayoutShiftDetails(entry: any): Record<string, unknown> {
  const sources = entry.sources?.map((s: any) =>
    `[${s.node?.nodeName || 'unknown'}] ${s.currentRect?.width}x${s.currentRect?.height}`
  ) || [];
  return {
    'Value': entry.value.toFixed(4),
    'Had Recent Input': entry.hadRecentInput ? 'Yes' : 'No',
    'Sources': sources.join(', ') || 'None',
  };
}

function extractLongTaskDetails(entry: PerformanceEntry): Record<string, unknown> {
  const lt = entry as any;
  const attribution = lt.attribution?.[0] || {};
  return {
    'Duration': formatMs(entry.duration),
    'Blocking': formatMs(entry.duration - 50),
    'Script URL': attribution.containerSrc || attribution.sourceURL || attribution.containerId || 'Unknown',
    'Script Name': attribution.name || '-',
    'Container Type': attribution.containerType || '-',
  };
}

function formatEntry(
  entry: PerformanceEntry,
  type: EntryType,
): { name: string; details: Record<string, unknown> } {
  switch (type) {
    case 'navigation': {
      const navEntry = entry as PerformanceNavigationTiming;
      return {
        name: navEntry.name || document.location.href,
        details: extractNavigationDetails(navEntry),
      };
    }
    case 'paint':
      return {
        name: entry.name,
        details: { 'Paint Timing': formatMs(entry.startTime), 'Type': entry.name },
      };
    case 'resource': {
      const resEntry = entry as PerformanceResourceTiming;
      return {
        name: resEntry.name,
        details: extractResourceDetails(resEntry),
      };
    }
    case 'largest-contentful-paint': {
      const lcpEntry = entry as any;
      return {
        name: `LCP #${entry.startTime}`,
        details: extractLCPDetails(lcpEntry),
      };
    }
    case 'layout-shift': {
      const lsEntry = entry as any;
      return {
        name: `Layout Shift @ ${formatMs(entry.startTime)}`,
        details: extractLayoutShiftDetails(lsEntry),
      };
    }
    case 'longtask':
      return {
        name: `Long Task @ ${formatMs(entry.startTime)}`,
        details: extractLongTaskDetails(entry),
      };
    case 'element':
      return {
        name: entry.name,
        details: { 'Timing': formatMs(entry.startTime), 'Identifier': entry.name },
      };
    case 'mark':
      return {
        name: entry.name,
        details: { 'Time': formatMs(entry.startTime), 'Detail': JSON.stringify((entry as any).detail || {}) },
      };
    case 'measure':
      return {
        name: entry.name,
        details: { 'Start': formatMs(entry.startTime), 'Duration': formatMs(entry.duration) },
      };
    default:
      return { name: entry.name, details: { 'Start Time': formatMs(entry.startTime), 'Duration': formatMs(entry.duration) } };
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PerformanceObserverPage() {
  const [options, setOptions] = useState<ObserverOption[]>(OBSERVER_OPTIONS);
  const [isObserving, setIsObserving] = useState(false);
  const [entries, setEntries] = useState<CollectedEntry[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<EntryType | 'all'>('all');
  const [summary, setSummary] = useState<Record<string, number>>({});

  const observersRef = useRef<PerformanceObserver[]>([]);
  const entryCounterRef = useRef(0);

  const toggleOption = useCallback((type: EntryType) => {
    setOptions(prev =>
      prev.map(o => (o.type === type ? { ...o, enabled: !o.enabled } : o))
    );
  }, []);

  const startObserving = useCallback(() => {
    observersRef.current.forEach(obs => obs.disconnect());
    observersRef.current = [];

    const enabledTypes = options.filter(o => o.enabled);

    for (const opt of enabledTypes) {
      try {
        const observer = new PerformanceObserver((list) => {
          const newEntries: CollectedEntry[] = [];
          list.getEntries().forEach((entry) => {
            const formatted = formatEntry(entry, opt.type);
            entryCounterRef.current++;
            newEntries.push({
              id: `${opt.type}-${entryCounterRef.current}-${entry.startTime}`,
              type: opt.type,
              name: formatted.name,
              startTime: entry.startTime,
              duration: entry.duration,
              timestamp: Date.now(),
              details: formatted.details,
            });
          });
          if (newEntries.length > 0) {
            setEntries(prev => [...newEntries, ...prev].slice(0, 500));
          }
        });

        const bufferedTypes: EntryType[] = ['navigation', 'paint', 'resource', 'largest-contentful-paint', 'layout-shift', 'element'];
        observer.observe({
          type: opt.type as any,
          buffered: bufferedTypes.includes(opt.type),
        });

        observersRef.current.push(observer);
      } catch {
        toast.error(`"${opt.label}" observer not supported in this browser`);
      }
    }

    if (observersRef.current.length > 0) {
      setIsObserving(true);
      toast.success(`Observing ${observersRef.current.length} performance metrics`);

      if (enabledTypes.some(o => o.type === 'mark' || o.type === 'measure')) {
        try {
          performance.mark('observer-started');
          setTimeout(() => {
            performance.mark('observer-5s');
            try {
              performance.measure('start-to-5s', 'observer-started', 'observer-5s');
            } catch { /* noop */ }
          }, 5000);
        } catch { /* noop */ }
      }
    } else {
      toast.error('Select at least one metric type to observe');
    }
  }, [options]);

  const stopObserving = useCallback(() => {
    observersRef.current.forEach(obs => obs.disconnect());
    observersRef.current = [];
    setIsObserving(false);
    toast.success('Stopped observing all performance metrics');
    try {
      performance.mark('observer-stopped');
    } catch { /* noop */ }
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
    entryCounterRef.current = 0;
    setExpandedEntries(new Set());
  }, []);

  const copySummary = useCallback(() => {
    const text = entries
      .map(e => `[${e.type}] ${e.name}: ${formatMs(e.startTime)}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Summary copied to clipboard'),
      () => toast.error('Failed to copy')
    );
  }, [entries]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredEntries = useMemo(() => {
    if (filterType === 'all') return entries;
    return entries.filter(e => e.type === filterType);
  }, [entries, filterType]);

  useEffect(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    setSummary(counts);
  }, [entries]);

  useEffect(() => {
    return () => {
      observersRef.current.forEach(obs => obs.disconnect());
    };
  }, []);

  return (
    <ToolLayout
      title="Performance Observer Playground"
      description="Observe real-time performance metrics — navigation timing, paint events, resource loads, LCP, layout shifts, long tasks, and user timings."
    >
      {/* Observer Configuration */}
      <div className="card mb-6">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-400" />
          Observer Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {options.map(opt => (
            <button
              key={opt.type}
              onClick={() => toggleOption(opt.type)}
              disabled={isObserving}
              className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all border ${
                opt.enabled
                  ? 'bg-brand-500/10 border-brand-500/30 text-slate-200'
                  : 'bg-surface border-slate-700/50 text-slate-500'
              } ${isObserving ? 'opacity-75 cursor-not-allowed' : 'hover:border-brand-500/40'}`}
            >
              <span className="text-lg mt-0.5 flex-shrink-0">{opt.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isObserving ? (
            <button
              onClick={startObserving}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Observing
            </button>
          ) : (
            <button
              onClick={stopObserving}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop Observing
            </button>
          )}
          <button
            onClick={clearEntries}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 bg-surface-lighter border border-slate-600/50 hover:border-red-500/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
          {entries.length > 0 && (
            <button
              onClick={copySummary}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-brand-400 bg-surface-lighter border border-slate-600/50 hover:border-brand-500/30 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Summary
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isObserving ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}
            />
            <span className="text-xs text-slate-400">
              {isObserving ? 'Observing' : 'Idle'}
            </span>
            {entries.length > 0 && (
              <span className="text-xs text-slate-500 ml-2">
                {entries.length} entries
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Dashboard */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {Object.entries(summary).map(([type, count]) => {
            const opt = options.find(o => o.type === type);
            return (
              <button
                key={type}
                onClick={() => setFilterType(filterType === type ? 'all' : type as EntryType)}
                className={`card p-4 text-left transition-all ${
                  filterType === type ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{opt?.icon}</span>
                  <span className="text-xs text-slate-400">{opt?.label || type}</span>
                </div>
                <div className="text-2xl font-bold text-white">{count}</div>
              </button>
            );
          })}
          <button
            onClick={() => setFilterType('all')}
            className={`card p-4 text-left transition-all ${
              filterType === 'all' ? 'ring-2 ring-brand-500' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-slate-400">Total</span>
            </div>
            <div className="text-2xl font-bold text-white">{entries.length}</div>
          </button>
        </div>
      )}

      {/* Entries List */}
      {entries.length > 0 ? (
        <div className="space-y-2">
          {filteredEntries.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-slate-500">No entries for selected filter. Try All.</p>
            </div>
          ) : (
            filteredEntries.map(entry => {
              const isExpanded = expandedEntries.has(entry.id);
              const opt = options.find(o => o.type === entry.type);
              const detailEntries = Object.entries(entry.details);

              return (
                <div key={entry.id} className="card p-0 overflow-hidden">
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="text-lg flex-shrink-0">{opt?.icon || '📊'}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${
                        isExpanded ? '' : '-rotate-90'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                          {opt?.label || entry.type}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {entry.type === 'layout-shift' ? entry.duration.toFixed(4) : formatMs(entry.duration || entry.startTime)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300 truncate mt-0.5">{entry.name}</div>
                    </div>
                    <span className="text-xs text-slate-600 flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-700/50 bg-surface px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {detailEntries.map(([key, value]) => (
                          <div key={key} className="flex flex-col gap-0.5">
                            <span className="text-xs text-slate-500">{key}</span>
                            <span className="text-sm text-slate-200 font-mono break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="card text-center py-16">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Ready to observe</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            Select which performance metrics to track above, then click{' '}
            <strong className="text-green-400">Start Observing</strong>.
            Interact with the page, navigate around, or open the DevTools Performance panel
            to generate timing data.
          </p>
          <div className="mt-6 inline-flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              Tip: Open a new tab and come back to trigger paint events
            </span>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="card mt-6">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          About Performance Observers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
          <div>
            <h4 className="text-slate-300 font-medium mb-2">What this playground does</h4>
            <ul className="space-y-1.5">
              <li>• Uses the browser&apos;s <code className="text-brand-400 bg-slate-800 px-1 rounded">PerformanceObserver</code> API</li>
              <li>• Captures real performance data from your browser in real time</li>
              <li>• Shows navigation timing (TTFB, DNS, TCP, TLS, DOM events)</li>
              <li>• Tracks paint timing (FP, FCP), LCP, and layout shifts (CLS)</li>
              <li>• Monitors long tasks, resource loads, and user timing marks</li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium mb-2">Core Web Vitals</h4>
            <ul className="space-y-1.5">
              <li>• <strong className="text-slate-300">LCP</strong> — Good: &lt; 2.5s, Needs improvement: &lt; 4s</li>
              <li>• <strong className="text-slate-300">FCP</strong> — Good: &lt; 1.8s, Needs improvement: &lt; 3s</li>
              <li>• <strong className="text-slate-300">CLS</strong> — Good: &lt; 0.1, Needs improvement: &lt; 0.25</li>
              <li>• <strong className="text-slate-300">TTFB</strong> — Good: &lt; 800ms, Needs improvement: &lt; 1.8s</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
          <strong>Browser support:</strong> PerformanceObserver is supported in all modern browsers.
          Some entry types (longtask, layout-shift, element) require Chrome/Edge. Buffered entries
          (navigation, paint, resource) capture data from page load when you start observing.
        </div>
      </div>
    </ToolLayout>
  );
}
