'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Trash2, Plus, ChevronDown, Terminal, Globe, Key,
  FileText, ListTree, Settings, Play, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
type AuthType = 'none' | 'basic' | 'bearer';

interface KeyValue {
  id: number;
  key: string;
  value: string;
}

interface Preset {
  name: string;
  method: Method;
  url: string;
  headers: { key: string; value: string }[];
  body: string;
  bodyType: BodyType;
  authType: AuthType;
  authUsername?: string;
  authPassword?: string;
  authToken?: string;
  options: string[];
  description: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

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

const BODY_METHODS: Method[] = ['POST', 'PUT', 'PATCH'];

const PRESETS: Preset[] = [
  {
    name: 'GET JSON API',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: [{ key: 'Accept', value: 'application/json' }],
    body: '',
    bodyType: 'none',
    authType: 'none',
    options: [],
    description: 'Fetch posts from JSONPlaceholder',
  },
  {
    name: 'POST JSON',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Accept', value: 'application/json' },
    ],
    body: '{"title":"foo","body":"bar","userId":1}',
    bodyType: 'json',
    authType: 'none',
    options: [],
    description: 'Create a post with JSON body',
  },
  {
    name: 'Bearer Auth',
    method: 'GET',
    url: 'https://api.github.com/user/repos',
    headers: [
      { key: 'Accept', value: 'application/vnd.github+json' },
    ],
    body: '',
    bodyType: 'none',
    authType: 'bearer',
    authToken: 'ghp_yourTokenHere',
    options: ['-L'],
    description: 'GitHub API with Bearer token',
  },
  {
    name: 'Basic Auth',
    method: 'GET',
    url: 'https://httpbin.org/basic-auth/user/pass',
    headers: [],
    body: '',
    bodyType: 'none',
    authType: 'basic',
    authUsername: 'user',
    authPassword: 'pass',
    options: [],
    description: 'httpbin with Basic auth',
  },
  {
    name: 'Form Data POST',
    method: 'POST',
    url: 'https://httpbin.org/post',
    headers: [{ key: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
    body: 'name=John+Doe&email=john%40example.com',
    bodyType: 'x-www-form-urlencoded',
    authType: 'none',
    options: [],
    description: 'POST form-encoded data',
  },
  {
    name: 'Verbose DELETE',
    method: 'DELETE',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: [],
    body: '',
    bodyType: 'none',
    authType: 'none',
    options: ['-v'],
    description: 'DELETE with verbose output',
  },
  {
    name: 'Upload File',
    method: 'POST',
    url: 'https://httpbin.org/post',
    headers: [],
    body: '',
    bodyType: 'none',
    authType: 'none',
    options: ['-F', 'file=@/path/to/file.png'],
    description: 'Upload a file via multipart',
  },
  {
    name: 'Download with Follow',
    method: 'GET',
    url: 'https://github.com',
    headers: [],
    body: '',
    bodyType: 'none',
    authType: 'none',
    options: ['-L', '-O'],
    description: 'Follow redirects and download',
  },
];

const ALL_OPTIONS = [
  { flag: '-L', label: 'Follow redirects', description: 'Follow HTTP 3xx redirects' },
  { flag: '-v', label: 'Verbose', description: 'Show request/response headers' },
  { flag: '-i', label: 'Include headers', description: 'Include response headers in output' },
  { flag: '-k', label: 'Insecure (SSL)', description: 'Skip SSL certificate verification' },
  { flag: '--compressed', label: 'Compressed', description: 'Request compressed response' },
  { flag: '-s', label: 'Silent', description: 'Suppress progress meter and errors' },
  { flag: '-S', label: 'Show errors', description: 'Show errors even with -s' },
];

let idCounter = 0;
const nextId = () => ++idCounter;

// ── Escape helper ─────────────────────────────────────────────────────────

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CurlBuilderPage() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts');
  const [queryParams, setQueryParams] = useState<KeyValue[]>([]);
  const [headers, setHeaders] = useState<KeyValue[]>([
    { id: nextId(), key: 'Accept', value: 'application/json' },
  ]);
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [body, setBody] = useState('');
  const [authType, setAuthType] = useState<AuthType>('none');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [options, setOptions] = useState<string[]>([]);

  // ── Query param handlers ───────────────────────────────────────────────

  const addQueryParam = useCallback(() => {
    setQueryParams(prev => [...prev, { id: nextId(), key: '', value: '' }]);
  }, []);

  const updateQueryParam = useCallback((id: number, field: 'key' | 'value', val: string) => {
    setQueryParams(prev => prev.map(p => (p.id === id ? { ...p, [field]: val } : p)));
  }, []);

  const removeQueryParam = useCallback((id: number) => {
    setQueryParams(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Header handlers ────────────────────────────────────────────────────

  const addHeader = useCallback(() => {
    setHeaders(prev => [...prev, { id: nextId(), key: '', value: '' }]);
  }, []);

  const updateHeader = useCallback((id: number, field: 'key' | 'value', val: string) => {
    setHeaders(prev => prev.map(h => (h.id === id ? { ...h, [field]: val } : h)));
  }, []);

  const removeHeader = useCallback((id: number) => {
    setHeaders(prev => prev.filter(h => h.id !== id));
  }, []);

  // ── Options toggler ────────────────────────────────────────────────────

  const toggleOption = useCallback((flag: string) => {
    setOptions(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  }, []);

  // ── Preset loader ──────────────────────────────────────────────────────

  const loadPreset = useCallback((preset: Preset) => {
    setMethod(preset.method);
    setUrl(preset.url);
    setQueryParams([]);
    setHeaders(preset.headers.map(h => ({ id: nextId(), ...h })));
    setBodyType(preset.bodyType);
    setBody(preset.body);
    setAuthType(preset.authType);
    setAuthUsername(preset.authUsername || '');
    setAuthPassword(preset.authPassword || '');
    setAuthToken(preset.authToken || '');
    setOptions(preset.options);
  }, []);

  // ── Build the cURL command ─────────────────────────────────────────────

  const curlCommand = useMemo(() => {
    const parts: string[] = ['curl'];

    // Method
    if (method !== 'GET') {
      parts.push('-X', method);
    }

    // URL with query params
    let fullUrl = url;
    const activeParams = queryParams.filter(p => p.key.trim());
    if (activeParams.length > 0) {
      const urlObj = (() => { try { return new URL(url); } catch { return null; } })();
      if (urlObj) {
        activeParams.forEach(p => {
          urlObj.searchParams.set(p.key, p.value);
        });
        fullUrl = urlObj.toString();
      } else {
        const qs = activeParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        fullUrl = url + (url.includes('?') ? '&' : '?') + qs;
      }
    }

    if (options.includes('-L') || options.includes('-v') || options.includes('-i') ||
        options.includes('-k') || options.includes('-s') || options.includes('-S') ||
        options.includes('--compressed')) {
      // Options go before URL
      options.forEach(opt => {
        if (opt !== '-F' && opt !== '-O') {
          parts.push(opt);
        }
      });
    }

    parts.push(escapeShellArg(fullUrl));

    // File upload option at end
    if (options.includes('-F')) {
      parts.push('-F', options[options.indexOf('-F') + 1] || '"file=@path"');
    }
    if (options.includes('-O')) {
      parts.push('-O');
    }

    // Headers
    headers.forEach(h => {
      if (h.key.trim()) {
        parts.push('-H', escapeShellArg(`${h.key}: ${h.value}`));
      }
    });

    // Auth
    if (authType === 'basic' && authUsername) {
      parts.push('-u', escapeShellArg(`${authUsername}:${authPassword}`));
    } else if (authType === 'bearer' && authToken) {
      parts.push('-H', escapeShellArg(`Authorization: Bearer ${authToken}`));
    }

    // Body
    if (BODY_METHODS.includes(method) && bodyType !== 'none' && body.trim()) {
      parts.push('-d', escapeShellArg(body));
    }

    return parts.join(' ');
  }, [method, url, queryParams, headers, body, bodyType, authType, authUsername, authPassword, authToken, options]);

  // ── Copy handler ───────────────────────────────────────────────────────

  const copyCommand = useCallback(() => {
    navigator.clipboard.writeText(curlCommand).then(
      () => toast.success('cURL command copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [curlCommand]);

  // ── Reset handler ──────────────────────────────────────────────────────

  const resetAll = useCallback(() => {
    setMethod('GET');
    setUrl('');
    setQueryParams([]);
    setHeaders([{ id: nextId(), key: 'Accept', value: 'application/json' }]);
    setBodyType('none');
    setBody('');
    setAuthType('none');
    setAuthUsername('');
    setAuthPassword('');
    setAuthToken('');
    setOptions([]);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="cURL Command Builder"
      description="Visually construct cURL commands — method, headers, query params, auth, body, and options. Copy the command ready to paste in your terminal."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-5">
          {/* Method + URL */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select
                value={method}
                onChange={e => setMethod(e.target.value as Method)}
                className="appearance-none bg-surface-light border border-slate-700/50 rounded-lg px-4 py-2.5 pr-10 text-sm font-semibold text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                {METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="flex-1 bg-surface-light border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Query Parameters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-brand-400" />
                Query Parameters
              </h3>
              <button
                onClick={addQueryParam}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {queryParams.length === 0 && (
              <p className="text-xs text-slate-500 py-2">No query parameters. Click &ldquo;Add&rdquo; to add one.</p>
            )}
            {queryParams.map(param => (
              <div key={param.id} className="flex gap-2">
                <input
                  type="text"
                  value={param.key}
                  onChange={e => updateQueryParam(param.id, 'key', e.target.value)}
                  placeholder="key"
                  className="flex-1 bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <input
                  type="text"
                  value={param.value}
                  onChange={e => updateQueryParam(param.id, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <button
                  onClick={() => removeQueryParam(param.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                Headers
              </h3>
              <button
                onClick={addHeader}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {headers.map(header => (
              <div key={header.id} className="flex gap-2">
                <input
                  type="text"
                  value={header.key}
                  onChange={e => updateHeader(header.id, 'key', e.target.value)}
                  placeholder="Header name"
                  className="flex-1 bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={e => updateHeader(header.id, 'value', e.target.value)}
                  placeholder="Header value"
                  className="flex-1 bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <button
                  onClick={() => removeHeader(header.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Auth */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-400" />
              Authentication
            </h3>
            <div className="flex gap-2">
              {(['none', 'basic', 'bearer'] as AuthType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setAuthType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    authType === type
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                      : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  {type === 'none' ? 'None' : type === 'basic' ? 'Basic Auth' : 'Bearer Token'}
                </button>
              ))}
            </div>
            {authType === 'basic' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={authUsername}
                  onChange={e => setAuthUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1 bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="flex-1 bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            )}
            {authType === 'bearer' && (
              <input
                type="text"
                value={authToken}
                onChange={e => setAuthToken(e.target.value)}
                placeholder="Bearer token (e.g. ghp_xxx...)"
                className="w-full bg-surface-light border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            )}
          </div>

          {/* Body (only for POST/PUT/PATCH) */}
          {BODY_METHODS.includes(method) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-400" />
                Request Body
              </h3>
              <div className="flex gap-2 flex-wrap">
                {(['none', 'json', 'x-www-form-urlencoded', 'raw'] as BodyType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setBodyType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      bodyType === type
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                        : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-300'
                    }`}
                  >
                    {type === 'none' ? 'None' : type === 'json' ? 'JSON' : type === 'x-www-form-urlencoded' ? 'Form URL-Encoded' : 'Raw Text'}
                  </button>
                ))}
              </div>
              {bodyType !== 'none' && (
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={6}
                  placeholder={
                    bodyType === 'json'
                      ? '{"key": "value"}'
                      : bodyType === 'x-www-form-urlencoded'
                      ? 'key1=value1&key2=value2'
                      : 'Raw body content...'
                  }
                  className="w-full bg-surface-light border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-y"
                />
              )}
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-400" />
              cURL Options
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_OPTIONS.map(opt => (
                <label
                  key={opt.flag}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    options.includes(opt.flag)
                      ? 'bg-brand-500/10 border-brand-500/30'
                      : 'bg-surface-light border-slate-700/50 hover:border-slate-600/70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={options.includes(opt.flag)}
                    onChange={() => toggleOption(opt.flag)}
                    className="mt-0.5 accent-brand-500"
                  />
                  <div>
                    <div className="text-xs font-mono text-white">{opt.flag}</div>
                    <div className="text-xs text-slate-500">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset all fields
          </button>
        </div>

        {/* Right: Command preview + Presets */}
        <div className="space-y-5">
          {/* Command Preview */}
          <div className="bg-surface-light border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-slate-300">cURL Command</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">{curlCommand.length} chars</span>
                <button
                  onClick={copyCommand}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-lighter hover:bg-slate-600 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>
            <div className="p-4">
              <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap break-all leading-relaxed">
                {curlCommand || <span className="text-slate-500 italic">Enter a URL to see the command...</span>}
              </pre>
            </div>
          </div>

          {/* Presets */}
          <div className="bg-surface-light border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-300">Presets</span>
              </div>
            </div>
            <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
              {PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(preset)}
                  className="w-full text-left px-4 py-3 hover:bg-brand-500/5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${METHOD_COLORS[preset.method]}`}>
                      {preset.method}
                    </span>
                    <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                      {preset.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{preset.url}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
