'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Trash2, Link, Globe, Hash, Search, ChevronRight, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface QueryParam {
  id: number;
  key: string;
  value: string;
}

interface ParsedUrl {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  hash: string;
}

// ── Parse URL ──────────────────────────────────────────────────────────────

function parseUrl(url: string): { parts: ParsedUrl; params: QueryParam[]; error: string | null } {
  try {
    const u = new URL(url);
    const parts: ParsedUrl = {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      hash: u.hash.replace('#', ''),
    };

    let idCounter = 0;
    const params: QueryParam[] = [];
    u.searchParams.forEach((value, key) => {
      params.push({ id: ++idCounter, key, value });
    });

    return { parts, params, error: null };
  } catch {
    return {
      parts: { protocol: '', hostname: '', port: '', pathname: '', hash: '' },
      params: [],
      error: 'Invalid URL — check the format and try again',
    };
  }
}

// ── Rebuild URL ────────────────────────────────────────────────────────────

function buildUrl(parts: ParsedUrl, params: QueryParam[]): string {
  let base = '';
  if (parts.protocol) base += parts.protocol + '://';
  if (parts.hostname) base += parts.hostname;
  if (parts.port) base += ':' + parts.port;
  if (parts.pathname) base += parts.pathname.startsWith('/') ? parts.pathname : '/' + parts.pathname;

  const filteredParams = params.filter((p) => p.key.trim());
  if (filteredParams.length > 0) {
    const qs = filteredParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    base += '?' + qs;
  }

  if (parts.hash) base += '#' + parts.hash;
  return base;
}

// ── Samples ────────────────────────────────────────────────────────────────

const SAMPLES = [
  {
    label: 'REST API with filters',
    url: 'https://api.example.com/v2/users?page=1&limit=50&sort=name&order=asc&filter=active',
  },
  {
    label: 'GitHub search',
    url: 'https://github.com/search?q=react+hooks&type=repositories&language=typescript',
  },
  {
    label: 'Google Maps',
    url: 'https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z/data=!3m1!4b1',
  },
  {
    label: 'YouTube video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&index=1',
  },
  {
    label: 'WebSocket URL',
    url: 'wss://chat.example.com:8443/ws?token=abc123&room=general',
  },
];

// ── Component Parts ────────────────────────────────────────────────────────

interface EditableRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  onChange: (v: string) => void;
  color: string;
  placeholder: string;
}

function EditableRow({ label, value, icon, onChange, color, placeholder }: EditableRowProps) {
  return (
    <div className="flex items-center gap-3 group">
      <div className={`flex items-center gap-1.5 w-28 shrink-0 ${color}`}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 
                   focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 
                   placeholder-slate-500 transition-colors font-mono"
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function UrlParserPage() {
  const [rawUrl, setRawUrl] = useState('');
  const [parts, setParts] = useState<ParsedUrl>({
    protocol: '',
    hostname: '',
    port: '',
    pathname: '',
    hash: '',
  });
  const [params, setParams] = useState<QueryParam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [idCounter, setIdCounter] = useState(1);

  const rebuildUrl = useMemo(() => buildUrl(parts, params), [parts, params]);

  const handleParse = useCallback(
    (url: string) => {
      setRawUrl(url);
      if (!url.trim()) {
        setParts({ protocol: '', hostname: '', port: '', pathname: '', hash: '' });
        setParams([]);
        setError(null);
        return;
      }
      const result = parseUrl(url);
      setParts(result.parts);
      setParams(result.params);
      setError(result.error);
      setIdCounter(result.params.length);
    },
    []
  );

  const updatePart = useCallback(
    (key: keyof ParsedUrl, value: string) => {
      setParts((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const addParam = useCallback(() => {
    const newId = idCounter + 1;
    setIdCounter(newId);
    setParams((prev) => [...prev, { id: newId, key: '', value: '' }]);
  }, [idCounter]);

  const updateParamKey = useCallback((id: number, key: string) => {
    setParams((prev) => prev.map((p) => (p.id === id ? { ...p, key } : p)));
  }, []);

  const updateParamValue = useCallback((id: number, value: string) => {
    setParams((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
  }, []);

  const removeParam = useCallback((id: number) => {
    setParams((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRawUrl('');
    setParts({ protocol: '', hostname: '', port: '', pathname: '', hash: '' });
    setParams([]);
    setError(null);
  }, []);

  const copyUrl = useCallback(() => {
    if (!rebuildUrl) return;
    navigator.clipboard.writeText(rebuildUrl).then(
      () => toast.success('URL copied!'),
      () => toast.error('Copy failed')
    );
  }, [rebuildUrl]);

  const validParams = useMemo(() => params.filter((p) => p.key.trim()), [params]);

  return (
    <ToolLayout
      title="URL Parser & Visualizer"
      description="Break down any URL into its structural components — protocol, hostname, path, query parameters, and hash. Edit every piece interactively and rebuild the URL in real-time."
    >
      <style>{`
        .url-visual {
          word-break: break-all;
          font-size: 0.875rem;
          line-height: 2;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          background: #0f172a;
          border: 1px solid #334155;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          overflow-x: auto;
        }
        .url-visual .protocol { color: #c084fc; }
        .url-visual .separator { color: #64748b; }
        .url-visual .hostname { color: #fbbf24; }
        .url-visual .port { color: #f87171; }
        .url-visual .path { color: #60a5fa; }
        .url-visual .query { color: #34d399; }
        .url-visual .hash { color: #fb923c; }
      `}</style>

      {/* URL Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Paste a URL to parse
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={rawUrl}
            onChange={(e) => handleParse(e.target.value)}
            placeholder="https://example.com/api/users?page=1&sort=name#section"
            className="flex-1 bg-slate-800/70 text-slate-200 text-sm rounded-lg px-4 py-2.5 border border-slate-700 
                       focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 
                       placeholder-slate-500 transition-colors font-mono"
          />
          <button
            onClick={clearAll}
            className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 
                       hover:border-slate-600 transition-colors text-sm"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Sample URLs */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => handleParse(s.url)}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/50 
                         hover:text-brand-400 hover:border-brand-500/40 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {rawUrl.trim() && !error && (
        <>
          {/* Visual URL with color coding */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Visual Breakdown
            </h3>
            <div className="url-visual">
              {parts.protocol && (
                <>
                  <span className="protocol">{parts.protocol}</span>
                  <span className="separator">://</span>
                </>
              )}
              {parts.hostname && <span className="hostname">{parts.hostname}</span>}
              {parts.port && (
                <>
                  <span className="separator">:</span>
                  <span className="port">{parts.port}</span>
                </>
              )}
              {parts.pathname && (
                <span className="path">{parts.pathname}</span>
              )}
              {validParams.length > 0 && (
                <>
                  <span className="separator">?</span>
                  {validParams.map((p, i) => (
                    <span key={p.id}>
                      <span className="query">{p.key}</span>
                      <span className="separator">=</span>
                      <span className="query">{p.value}</span>
                      {i < validParams.length - 1 && <span className="separator">&amp;</span>}
                    </span>
                  ))}
                </>
              )}
              {parts.hash && (
                <>
                  <span className="separator">#</span>
                  <span className="hash">{parts.hash}</span>
                </>
              )}
            </div>
          </div>

          {/* Editable Sections */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Link className="w-4 h-4 text-brand-400" />
              Edit Components
            </h3>

            <EditableRow
              label="Protocol"
              value={parts.protocol}
              onChange={(v) => updatePart('protocol', v)}
              icon={<Globe className="w-3.5 h-3.5" />}
              color="text-purple-400"
              placeholder="https"
            />
            <EditableRow
              label="Hostname"
              value={parts.hostname}
              onChange={(v) => updatePart('hostname', v)}
              icon={<Globe className="w-3.5 h-3.5" />}
              color="text-amber-400"
              placeholder="example.com"
            />
            <EditableRow
              label="Port"
              value={parts.port}
              onChange={(v) => updatePart('port', v)}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
              color="text-red-400"
              placeholder="443"
            />
            <EditableRow
              label="Path"
              value={parts.pathname}
              onChange={(v) => updatePart('pathname', v)}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
              color="text-blue-400"
              placeholder="/api/users"
            />
            <EditableRow
              label="Hash"
              value={parts.hash}
              onChange={(v) => updatePart('hash', v)}
              icon={<Hash className="w-3.5 h-3.5" />}
              color="text-orange-400"
              placeholder="section-name"
            />

            {/* Query Parameters */}
            <div className="pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" />
                  Query Parameters
                  {validParams.length > 0 && (
                    <span className="text-xs text-slate-500 font-normal">
                      ({validParams.length} {validParams.length === 1 ? 'param' : 'params'})
                    </span>
                  )}
                </h3>
                <button
                  onClick={addParam}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 
                             border border-brand-500/20 hover:bg-brand-500/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Param
                </button>
              </div>

              {params.length === 0 && (
                <p className="text-sm text-slate-500 py-4 text-center">
                  No query parameters found. Click &quot;Add Param&quot; to add one.
                </p>
              )}

              {params.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-2 mb-2 group">
                  <span className="text-xs text-slate-600 w-5 shrink-0 font-mono">{idx + 1}.</span>
                  <input
                    type="text"
                    value={p.key}
                    onChange={(e) => updateParamKey(p.id, e.target.value)}
                    placeholder="key"
                    className="flex-1 bg-slate-800/70 text-emerald-400 text-sm rounded-lg px-3 py-2 border border-slate-700 
                               focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 
                               placeholder-slate-600 transition-colors font-mono"
                  />
                  <span className="text-slate-600 text-sm">=</span>
                  <input
                    type="text"
                    value={p.value}
                    onChange={(e) => updateParamValue(p.id, e.target.value)}
                    placeholder="value"
                    className="flex-[2] bg-slate-800/70 text-emerald-300 text-sm rounded-lg px-3 py-2 border border-slate-700 
                               focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 
                               placeholder-slate-600 transition-colors font-mono"
                  />
                  <button
                    onClick={() => removeParam(p.id)}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 
                               opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rebuilt URL Output */}
          <div className="mt-8 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-brand-400" />
                Rebuilt URL
              </h3>
              <button
                onClick={copyUrl}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 
                           border border-slate-600/30 hover:bg-slate-700 hover:text-slate-100 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <code className="block text-sm text-slate-200 break-all font-mono bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
              {rebuildUrl || (
                <span className="text-slate-500">Start typing or paste a URL above...</span>
              )}
            </code>
          </div>
        </>
      )}

      {!rawUrl.trim() && (
        <div className="text-center py-16">
          <Link className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            Paste a URL above or click a sample to get started.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Supports http, https, ws, wss, ftp, and custom protocols.
          </p>
        </div>
      )}
    </ToolLayout>
  );
}
