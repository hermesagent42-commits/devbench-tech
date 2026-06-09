'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Play, StopCircle, Trash2, Copy, Clock, Globe, Zap, Wifi, Gauge, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Method = 'GET' | 'HEAD' | 'OPTIONS';

interface TimingResult {
  dnsLookup: number;
  tcpConnect: number;
  tlsHandshake: number;
  ttfb: number;
  contentDownload: number;
  totalTime: number;
  statusCode: number;
  statusText: string;
  responseSize: number;
  responseHeaders: Record<string, string>;
  timestamp: number;
}

interface LatencyRecord {
  id: number;
  url: string;
  method: Method;
  result: TimingResult;
}

const PRESET_URLS = [
  { label: 'Google', url: 'https://www.google.com', method: 'HEAD' as Method },
  { label: 'GitHub API', url: 'https://api.github.com', method: 'GET' as Method },
  { label: 'Cloudflare', url: 'https://www.cloudflare.com', method: 'HEAD' as Method },
  { label: 'JSONPlaceholder', url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' as Method },
  { label: 'httpbin', url: 'https://httpbin.org/get', method: 'GET' as Method },
  { label: 'npm Registry', url: 'https://registry.npmjs.org/react', method: 'HEAD' as Method },
];

const METHODS: Method[] = ['GET', 'HEAD', 'OPTIONS'];

let idCounter = 0;
const nextId = () => ++idCounter;

// ── Performance timing helper ──────────────────────────────────────────────

function parseTiming(entry: PerformanceResourceTiming): Partial<TimingResult> {
  return {
    dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
    tcpConnect: entry.connectEnd - entry.connectStart,
    tlsHandshake: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
    ttfb: entry.responseStart - entry.requestStart,
    contentDownload: entry.responseEnd - entry.responseStart,
    totalTime: entry.responseEnd - entry.requestStart,
  };
}

function formatMs(ms: number): string {
  if (ms === 0) return '—';
  if (ms < 1) return `${(ms * 1000).toFixed(1)} μs`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPerformanceBar(ms: number, maxMs: number): string {
  if (maxMs === 0) return '0%';
  const pct = Math.min((ms / maxMs) * 100, 100);
  return `${pct}%`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ApiLatencyTesterPage() {
  const [url, setUrl] = useState('https://api.github.com');
  const [method, setMethod] = useState<Method>('GET');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<LatencyRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<TimingResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runTest = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      setUrl(targetUrl);
    }

    setLoading(true);
    setError(null);
    setCurrentResult(null);

    // Use Performance API for precise timing
    const startTime = performance.now();
    abortRef.current = new AbortController();

    try {
      // Clear any previous resource entries for this URL
      performance.clearResourceTimings();

      const response = await fetch(targetUrl, {
        method,
        signal: abortRef.current.signal,
        headers: { 'Accept': '*/*' },
      });

      const endTime = performance.now();

      // Read response body for size measurement
      const responseBuffer = await response.arrayBuffer();
      const responseSize = responseBuffer.byteLength;

      // Get detailed timing from Performance API
      const entries = performance.getEntriesByName(targetUrl, 'resource') as PerformanceResourceTiming[];
      const timing = entries.length > 0 ? parseTiming(entries[0]) : {};

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const result: TimingResult = {
        dnsLookup: timing.dnsLookup ?? 0,
        tcpConnect: timing.tcpConnect ?? 0,
        tlsHandshake: timing.tlsHandshake ?? 0,
        ttfb: timing.ttfb ?? (endTime - startTime) * 0.6,
        contentDownload: timing.contentDownload ?? (endTime - startTime) * 0.4,
        totalTime: endTime - startTime,
        statusCode: response.status,
        statusText: response.statusText,
        responseSize,
        responseHeaders,
        timestamp: Date.now(),
      };

      setCurrentResult(result);
      setRecords(prev => [{
        id: nextId(),
        url: targetUrl,
        method,
        result,
      }, ...prev].slice(0, 50));

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request cancelled');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Network error — the URL may be unreachable (CORS, timeout, or offline). Try a different URL or check your connection.');
      } else {
        setError(`Request failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [url, method]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadPreset = useCallback((preset: typeof PRESET_URLS[0]) => {
    setUrl(preset.url);
    setMethod(preset.method);
  }, []);

  const clearHistory = useCallback(() => {
    setRecords([]);
    setCurrentResult(null);
    setError(null);
  }, []);

  const copyReport = useCallback((record: LatencyRecord) => {
    const r = record.result;
    const text = [
      `URL: ${record.url}`,
      `Method: ${record.method}`,
      `Status: ${r.statusCode} ${r.statusText}`,
      `Total Time: ${formatMs(r.totalTime)}`,
      `DNS Lookup: ${formatMs(r.dnsLookup)}`,
      `TCP Connect: ${formatMs(r.tcpConnect)}`,
      `TLS Handshake: ${formatMs(r.tlsHandshake)}`,
      `TTFB: ${formatMs(r.ttfb)}`,
      `Download: ${formatMs(r.contentDownload)}`,
      `Response Size: ${formatBytes(r.responseSize)}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Report copied!'),
      () => toast.error('Failed to copy'),
    );
  }, []);

  const maxTime = currentResult ? Math.max(
    currentResult.dnsLookup,
    currentResult.tcpConnect,
    currentResult.tlsHandshake,
    currentResult.ttfb,
    currentResult.contentDownload,
    1
  ) : 1;

  return (
    <ToolLayout
      title="API Latency Tester"
      description="Measure request latency with detailed timing breakdown — DNS lookup, TCP connection, TLS handshake, TTFB, and download time. Compare different endpoints and see exactly where time goes."
    >
      {/* Input */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runTest()}
              placeholder="https://api.example.com/endpoint"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-light border border-slate-700/50 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <select
            value={method}
            onChange={e => setMethod(e.target.value as Method)}
            className="bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            {METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {loading ? (
            <button
              onClick={abort}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Cancel
            </button>
          ) : (
            <button
              onClick={runTest}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              Test
            </button>
          )}
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PRESET_URLS.map(p => (
          <button
            key={p.url}
            onClick={() => loadPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              url === p.url
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300">{error}</p>
              <p className="text-xs text-slate-500 mt-1">
                Note: Some URLs may block cross-origin requests (CORS), causing this test to fail even when the server is reachable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current result — timing waterfall */}
      {currentResult && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              Request Timing Breakdown
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className={`flex items-center gap-1 font-semibold ${
                currentResult.statusCode < 400 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {currentResult.statusCode < 400 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {currentResult.statusCode} {currentResult.statusText}
              </span>
              <span className="text-slate-500">{formatBytes(currentResult.responseSize)}</span>
            </div>
          </div>

          {/* Waterfall chart */}
          <div className="space-y-2 mb-4">
            {([
              { label: 'DNS Lookup', value: currentResult.dnsLookup, icon: Wifi, color: 'bg-cyan-500' },
              { label: 'TCP Connect', value: currentResult.tcpConnect, icon: Zap, color: 'bg-blue-500' },
              { label: 'TLS Handshake', value: currentResult.tlsHandshake, icon: Gauge, color: 'bg-purple-500' },
              { label: 'TTFB', value: currentResult.ttfb, icon: Clock, color: 'bg-amber-500' },
              { label: 'Download', value: currentResult.contentDownload, icon: Globe, color: 'bg-emerald-500' },
            ] as const).map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32 flex-shrink-0">
                  <item.icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400">{item.label}</span>
                </div>
                <div className="flex-1 h-6 bg-surface-light rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                    style={{ width: getPerformanceBar(item.value, maxTime) }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-mono text-slate-300">
                  {formatMs(item.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-lg font-bold text-white font-mono">
              {formatMs(currentResult.totalTime)}
            </span>
          </div>
        </div>
      )}

      {/* Response headers */}
      {currentResult && Object.keys(currentResult.responseHeaders).length > 0 && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Response Headers</h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {Object.entries(currentResult.responseHeaders).map(([key, value]) => (
              <div key={key} className="flex gap-3 text-xs font-mono py-1 border-b border-slate-800 last:border-0">
                <span className="text-brand-400 w-48 flex-shrink-0">{key}:</span>
                <span className="text-slate-400 break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {records.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              History ({records.length})
            </h3>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {records.map(record => (
              <div
                key={record.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-light border border-slate-700/30 hover:border-slate-600 transition-colors group"
              >
                <span className={`w-14 text-xs font-semibold font-mono ${
                  record.result.statusCode < 400 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {record.result.statusCode}
                </span>
                <span className="flex-1 text-xs font-mono text-slate-300 truncate">
                  {record.url}
                </span>
                <span className="text-xs font-mono text-slate-400 w-20 text-right">
                  {formatMs(record.result.totalTime)}
                </span>
                <span className="text-xs text-slate-500">{record.method}</span>
                <button
                  onClick={() => copyReport(record)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
