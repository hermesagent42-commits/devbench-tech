'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Trash2, ChevronDown, ChevronRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

interface Header {
  key: string;
  value: string;
  id: number;
}

interface Response {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  error?: string;
}

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<Method, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  HEAD: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  OPTIONS: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const SAMPLE_REQUESTS = [
  { method: 'GET' as Method, url: 'https://jsonplaceholder.typicode.com/posts/1', label: 'JSONPlaceholder Post' },
  { method: 'GET' as Method, url: 'https://jsonplaceholder.typicode.com/users', label: 'JSONPlaceholder Users' },
  { method: 'GET' as Method, url: 'https://api.github.com/users/vercel/repos', label: 'GitHub API: Vercel Repos' },
  { method: 'POST' as Method, url: 'https://jsonplaceholder.typicode.com/posts', label: 'JSONPlaceholder POST', body: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }, null, 2) },
  { method: 'GET' as Method, url: 'https://httpbin.org/get', label: 'HTTPBin GET' },
];

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-amber-400';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'text-sky-400' : 'text-emerald-400';
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-400';
        } else if (/null/.test(match)) {
          cls = 'text-slate-500';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

export default function ApiTesterPage() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [headers, setHeaders] = useState<Header[]>([{ key: 'Content-Type', value: 'application/json', id: 1 }]);
  const [nextId, setNextId] = useState(2);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<Response | null>(null);
  const [showHeaders, setShowHeaders] = useState(false);

  const addHeader = useCallback(() => {
    setHeaders((h) => [...h, { key: '', value: '', id: nextId }]);
    setNextId((n) => n + 1);
  }, [nextId]);

  const removeHeader = useCallback((id: number) => {
    setHeaders((h) => h.filter((x) => x.id !== id));
  }, []);

  const updateHeader = useCallback((id: number, field: 'key' | 'value', val: string) => {
    setHeaders((h) => h.map((x) => (x.id === id ? { ...x, [field]: val } : x)));
  }, []);

  const sendRequest = useCallback(async () => {
    if (!url.trim()) {
      toast.error('Enter a URL');
      return;
    }

    setLoading(true);
    setResponse(null);
    const start = performance.now();

    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key.trim()) headerObj[h.key.trim()] = h.value;
      });

      const opts: RequestInit = {
        method,
        headers: headerObj,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        opts.body = body;
      }

      const res = await fetch(url.trim(), opts);
      const elapsed = Math.round(performance.now() - start);
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      let resBody = '';
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        resBody = formatJson(await res.text());
      } else {
        resBody = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        time: elapsed,
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: '',
        time: elapsed,
        error: (err as Error).message,
      });
    }

    setLoading(false);
  }, [url, method, body, headers]);

  const applySample = useCallback((sample: (typeof SAMPLE_REQUESTS)[number]) => {
    setMethod(sample.method);
    setUrl(sample.url);
    setBody(sample.body || '');
    setHeaders([{ key: 'Content-Type', value: 'application/json', id: 1 }]);
    setNextId(2);
  }, []);

  const copyResponse = useCallback(() => {
    if (response) {
      navigator.clipboard.writeText(response.body).then(
        () => toast.success('Copied!'),
        () => toast.error('Copy failed')
      );
    }
  }, [response]);

  const clearResponse = useCallback(() => {
    setResponse(null);
  }, []);

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-red-400 bg-red-500/10';
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-500/10';
    if (status >= 300 && status < 400) return 'text-amber-400 bg-amber-500/10';
    if (status >= 400 && status < 500) return 'text-orange-400 bg-orange-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const canSend = url.trim().length > 0;
  const responseBodyHtml = useMemo(() => {
    if (!response?.body) return '';
    try {
      JSON.parse(response.body);
      return syntaxHighlight(response.body);
    } catch {
      return response.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [response]);

  return (
    <ToolLayout
      title="API Tester"
      description="Test REST API endpoints directly in the browser. Supports all HTTP methods, custom headers, request body, and response inspection with syntax highlighting."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Request builder */}
        <div className="space-y-4">
          {/* Method + URL */}
          <div className="card">
            <label className="text-sm font-medium text-slate-300 mb-2 block">Request</label>
            <div className="flex gap-2 mb-3">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className="bg-surface border border-slate-600 text-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-brand-500"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="flex-1 bg-surface-light border border-slate-600 text-slate-200 rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <button
                onClick={sendRequest}
                disabled={!canSend || loading}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  canSend && !loading
                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Send
              </button>
            </div>

            {/* Headers */}
            <div>
              <label className="text-xs text-slate-500 font-medium mb-2 block">Headers</label>
              <div className="space-y-1.5 mb-2">
                {headers.map((h) => (
                  <div key={h.id} className="flex gap-1.5">
                    <input
                      type="text"
                      value={h.key}
                      onChange={(e) => updateHeader(h.id, 'key', e.target.value)}
                      placeholder="Header name"
                      className="flex-1 bg-surface-light border border-slate-600 text-slate-300 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-brand-500"
                    />
                    <input
                      type="text"
                      value={h.value}
                      onChange={(e) => updateHeader(h.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-[2] bg-surface-light border border-slate-600 text-slate-300 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={() => removeHeader(h.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove header"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addHeader}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                + Add header
              </button>
            </div>
          </div>

          {/* Body */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div className="card">
              <label className="text-sm font-medium text-slate-300 mb-2 block">Request Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={8}
                className="w-full bg-surface-light border border-slate-600 text-slate-200 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-y"
              />
            </div>
          )}

          {/* Samples */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Sample Requests</h3>
            <div className="space-y-1">
              {SAMPLE_REQUESTS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySample(s)}
                  className="w-full text-left px-3 py-2 rounded-md bg-surface hover:bg-surface-light border border-slate-700/50 hover:border-slate-600/50 transition-colors flex items-center gap-2.5 group"
                >
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${METHOD_COLORS[s.method]}`}>
                    {s.method}
                  </span>
                  <span className="text-sm text-slate-300 truncate flex-1">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Response */}
        <div className="space-y-4">
          {response && (
            <>
              {/* Status bar */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {response.error ? (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    ) : response.status >= 200 && response.status < 300 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getStatusColor(response.status)}`}>
                      {response.status || 'ERR'} {response.statusText}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {response.time}ms
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copyResponse}
                      className="p-1.5 rounded-md text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                      title="Copy response body"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearResponse}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Clear response"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {response.error && (
                  <p className="mt-2 text-sm text-red-400 bg-red-500/5 rounded-lg p-3">{response.error}</p>
                )}
              </div>

              {/* Response headers */}
              <div className="card">
                <button
                  onClick={() => setShowHeaders(!showHeaders)}
                  className="flex items-center gap-1.5 text-sm text-slate-300 font-medium w-full text-left"
                >
                  {showHeaders ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Response Headers ({Object.keys(response.headers).length})
                </button>
                {showHeaders && (
                  <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex items-baseline gap-2 text-xs py-1 px-2 rounded hover:bg-slate-800/50">
                        <span className="text-sky-400 font-mono shrink-0">{key}:</span>
                        <span className="text-slate-300 font-mono break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Response body */}
              <div className="card">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Response Body</h3>
                <pre className="bg-surface rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto max-h-96 text-slate-300 border border-slate-700/50">
                  <code dangerouslySetInnerHTML={{ __html: responseBodyHtml || '<span class="text-slate-500">(empty)</span>' }} />
                </pre>
              </div>
            </>
          )}

          {!response && !loading && (
            <div className="card flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-slate-600 mb-2">
                  <Play className="w-10 h-10 mx-auto" />
                </div>
                <p className="text-slate-500 text-sm">Send a request to see the response</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="card flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-t-transparent border-brand-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Sending request...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">Notes</h3>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li>Requests are sent from your browser — CORS policies apply. Most public APIs allow cross-origin requests.</li>
          <li>For APIs that don&#39;t allow CORS, use the response is shown for successful requests only.</li>
          <li>All processing happens client-side. Your requests are never logged or stored.</li>
          <li>JSON responses are auto-formatted and syntax-highlighted for readability.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
