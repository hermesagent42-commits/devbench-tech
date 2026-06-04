'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  History,
  Loader2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

interface Header {
  id: number;
  key: string;
  value: string;
}

interface RequestRecord {
  id: number;
  timestamp: number;
  method: HttpMethod;
  url: string;
}

interface ResponseData {
  status: number | null;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  sizeBytes: number;
  error: string | null;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-green-600',
  POST: 'bg-blue-600',
  PUT: 'bg-amber-600',
  PATCH: 'bg-orange-600',
  DELETE: 'bg-red-600',
  HEAD: 'bg-purple-600',
  OPTIONS: 'bg-teal-600',
};

const BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

interface Preset {
  label: string;
  method: HttpMethod;
  url: string;
  headers?: Header[];
  body?: string;
  bodyType?: string;
}

const PRESETS: Preset[] = [
  {
    label: 'JSONPlaceholder — Get Posts',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
  },
  {
    label: 'JSONPlaceholder — Create Post',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: [{ id: -1, key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }, null, 2),
    bodyType: 'json',
  },
  {
    label: 'JSONPlaceholder — Get Post #1',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
  },
  {
    label: 'HTTPBin — GET',
    method: 'GET',
    url: 'https://httpbin.org/get',
  },
  {
    label: 'HTTPBin — POST JSON',
    method: 'POST',
    url: 'https://httpbin.org/post',
    headers: [{ id: -2, key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({ hello: 'world' }, null, 2),
    bodyType: 'json',
  },
  {
    label: 'GitHub API — Octocat User',
    method: 'GET',
    url: 'https://api.github.com/users/octocat',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-blue-400';
  if (status >= 400 && status < 500) return 'text-amber-400';
  if (status >= 500) return 'text-red-400';
  return 'text-slate-400';
}

function prettyPrintBody(body: string, contentType: string): string {
  if (contentType.includes('application/json') || body.trim().startsWith('{') || body.trim().startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function RestApiClient() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts');
  const [headers, setHeaders] = useState<Header[]>([]);
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState('json');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [history, setHistory] = useState<RequestRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bodyCollapsed, setBodyCollapsed] = useState(false);
  const [headersCollapsed, setHeadersCollapsed] = useState(false);
  const [showHeadersSection, setShowHeadersSection] = useState(false);

  const headerIdRef = useRef(0);
  const historyIdRef = useRef(0);

  // ── Header management ─────────────────────────────────────────────────────

  const addHeader = useCallback(() => {
    headerIdRef.current += 1;
    setHeaders((prev) => [...prev, { id: headerIdRef.current, key: '', value: '' }]);
  }, []);

  const updateHeader = useCallback((id: number, field: 'key' | 'value', val: string) => {
    setHeaders((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
  }, []);

  const removeHeader = useCallback((id: number) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── Presets ──────────────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: Preset) => {
    setMethod(preset.method);
    setUrl(preset.url);
    headerIdRef.current = 0;
    if (preset.headers) {
      setHeaders(preset.headers.map((h, i) => ({ ...h, id: i + 1 })));
      headerIdRef.current = preset.headers.length;
    } else {
      setHeaders([]);
    }
    setBody(preset.body || '');
    setBodyType(preset.bodyType || 'json');
    setResponse(null);
    toast.success(`Loaded: ${preset.label}`);
  }, []);

  // ── Copy ─────────────────────────────────────────────────────────────────

  const copyText = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied!');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  // ── Send request ─────────────────────────────────────────────────────────

  const sendRequest = useCallback(async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Try to normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setLoading(true);
    setResponse(null);

    const requestHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) {
        requestHeaders[h.key.trim()] = h.value;
      }
    });

    // If body is set and no Content-Type, add one based on bodyType
    if (BODY_METHODS.includes(method) && body.trim() && !requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
      if (bodyType === 'json') requestHeaders['Content-Type'] = 'application/json';
      else if (bodyType === 'form') requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      else requestHeaders['Content-Type'] = 'text/plain';
    }

    const startTime = performance.now();

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (BODY_METHODS.includes(method) && body.trim()) {
        fetchOptions.body = body;
      }

      const res = await fetch(targetUrl, fetchOptions);
      const endTime = performance.now();
      const timeMs = Math.round(endTime - startTime);

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: string;
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await res.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await res.text();
        // If it parses as JSON anyway, pretty-print it
        try {
          const json = JSON.parse(responseBody);
          responseBody = JSON.stringify(json, null, 2);
        } catch {
          // Keep as raw text
        }
      }

      const sizeBytes = new Blob([responseBody]).size;

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        timeMs,
        sizeBytes,
        error: null,
      });

      // Add to history
      historyIdRef.current += 1;
      setHistory((prev) => {
        const next = [{ id: historyIdRef.current, timestamp: Date.now(), method, url: targetUrl }, ...prev];
        return next.slice(0, 50);
      });

      // Reset collapse states for new response
      setBodyCollapsed(false);
      setHeadersCollapsed(false);
    } catch (err) {
      const endTime = performance.now();
      const timeMs = Math.round(endTime - startTime);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      setResponse({
        status: null,
        statusText: '',
        headers: {},
        body: '',
        timeMs,
        sizeBytes: 0,
        error: errorMsg.includes('Failed to fetch')
          ? 'Network error — the request could not be completed. This may be due to CORS restrictions, an invalid URL, or the server being unreachable. For APIs that don\'t support CORS, try using a CORS proxy or test from your own backend.'
          : errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [method, url, headers, body, bodyType]);

  // ── Keyboard shortcut ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendRequest();
      }
    },
    [sendRequest]
  );

  // ── History click ────────────────────────────────────────────────────────

  const loadFromHistory = useCallback((record: RequestRecord) => {
    setMethod(record.method);
    setUrl(record.url);
    setShowHistory(false);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="REST API Client"
      description="Test HTTP APIs right in your browser. Send GET, POST, PUT, DELETE requests with custom headers and body — inspect responses with syntax highlighting."
    >
      <div className="space-y-6">
        {/* ── Presets ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* ── Request Bar ───────────────────────────────────────────────── */}
        <div className="flex items-stretch gap-2">
          {/* Method selector */}
          <div className="relative group">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={`appearance-none h-full px-3 pr-7 rounded-lg text-sm font-bold text-white border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 ${METHOD_COLORS[method]}`}
            >
              {METHODS.map((m) => (
                <option key={m} value={m} className="bg-slate-800 text-white">
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />
          </div>

          {/* URL input */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 h-[42px] px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />

          {/* Send button */}
          <button
            onClick={sendRequest}
            disabled={loading}
            className="h-[42px] px-5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 -mt-4">Ctrl+Enter to send</p>

        {/* ── Headers & Body Toggles ────────────────────────────────────── */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowHeadersSection(!showHeadersSection)}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {showHeadersSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Headers {headers.length > 0 && `(${headers.length})`}
          </button>
          {BODY_METHODS.includes(method) && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400">Body</span>
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="json">JSON</option>
                <option value="form">Form</option>
                <option value="raw">Raw</option>
              </select>
            </div>
          )}
        </div>

        {/* ── Headers Editor ────────────────────────────────────────────── */}
        {showHeadersSection && (
          <div className="space-y-2">
            {headers.map((header) => (
              <div key={header.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                  placeholder="Header name"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-[2] px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <button
                  onClick={() => removeHeader(header.id)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addHeader}
              className="flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Header
            </button>
          </div>
        )}

        {/* ── Body Editor ───────────────────────────────────────────────── */}
        {BODY_METHODS.includes(method) && (
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                bodyType === 'json'
                  ? '{\n  "key": "value"\n}'
                  : bodyType === 'form'
                  ? 'key1=value1&key2=value2'
                  : 'Raw request body...'
              }
              rows={8}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-y"
            />
          </div>
        )}

        {/* ── Response ──────────────────────────────────────────────────── */}
        {response && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-800/80">
              {response.status ? (
                <span className={`text-sm font-bold ${getStatusColor(response.status)}`}>
                  {response.status} {response.statusText}
                </span>
              ) : (
                <span className="text-sm font-bold text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </span>
              )}
              {response.status && (
                <>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {response.timeMs}ms
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatBytes(response.sizeBytes)}
                  </span>
                </>
              )}
              <div className="flex-1" />
              {response.body && (
                <button
                  onClick={() => copyText(response.body, 'body')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {copiedField === 'body' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              )}
              <button
                onClick={() => setResponse(null)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>

            {/* Error message */}
            {response.error && (
              <div className="px-4 py-3 text-sm text-red-300 bg-red-900/20 border-b border-red-900/30">
                {response.error}
              </div>
            )}

            {/* Response headers */}
            {Object.keys(response.headers).length > 0 && (
              <>
                <button
                  onClick={() => setHeadersCollapsed(!headersCollapsed)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                  {headersCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Response Headers ({Object.keys(response.headers).length})
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const headerText = Object.entries(response.headers)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n');
                      copyText(headerText, 'headers');
                    }}
                    className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedField === 'headers' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    Copy All
                  </button>
                </button>
                {!headersCollapsed && (
                  <div className="px-4 pb-3 space-y-1 max-h-64 overflow-y-auto">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-xs group">
                        <span className="font-mono font-semibold text-sky-400 whitespace-nowrap">{key}:</span>
                        <span className="font-mono text-slate-400 truncate">{value}</span>
                        <button
                          onClick={() => copyText(`${key}: ${value}`, `header-${key}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0"
                        >
                          {copiedField === `header-${key}` ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500 hover:text-white" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Response body */}
            {response.body && (
              <>
                <button
                  onClick={() => setBodyCollapsed(!bodyCollapsed)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors border-t border-slate-700"
                >
                  {bodyCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Response Body
                </button>
                {!bodyCollapsed && (
                  <div className="px-4 pb-4">
                    <pre className="text-sm font-mono text-slate-300 bg-slate-900/50 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                      {response.body}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Loading state ─────────────────────────────────────────────── */}
        {loading && !response && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Sending request...
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!loading && !response && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Zap className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">Enter a URL and click Send to test an API</p>
            <p className="text-xs mt-1 opacity-70">Try the presets above or paste your own endpoint</p>
          </div>
        )}

        {/* ── History ───────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <History className="w-4 h-4" />
              History ({history.length})
              {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {history.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => loadFromHistory(record)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-left transition-colors group"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${METHOD_COLORS[record.method]}`}>
                      {record.method}
                    </span>
                    <span className="text-xs text-slate-400 font-mono truncate flex-1">{record.url}</span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
