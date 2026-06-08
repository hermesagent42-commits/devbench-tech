'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Code2, Copy, Globe, Play, Trash2, Plus, ArrowRight,
  FileJson, FileCode, Terminal, Braces, Binary, Key, Link
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type OutputLang = 'fetch' | 'axios' | 'curl' | 'go' | 'python' | 'rust';

interface Header {
  id: string;
  key: string;
  value: string;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const LANGS: { id: OutputLang; label: string; icon: React.ElementType }[] = [
  { id: 'fetch', label: 'JS fetch', icon: FileCode },
  { id: 'axios', label: 'Axios', icon: FileJson },
  { id: 'curl', label: 'cURL', icon: Terminal },
  { id: 'go', label: 'Go', icon: Play },
  { id: 'python', label: 'Python', icon: Braces },
  { id: 'rust', label: 'Rust', icon: Code2 },
];

const PRESETS = [
  { label: 'GET JSON', method: 'GET' as HttpMethod, url: 'https://api.github.com/repos/vercel/next.js', headers: [{ id: '1', key: 'Accept', value: 'application/json' }], body: '' },
  { label: 'POST JSON', method: 'POST' as HttpMethod, url: 'https://jsonplaceholder.typicode.com/posts', headers: [{ id: '1', key: 'Content-Type', value: 'application/json' }], body: '{\n  "title": "Hello",\n  "body": "World",\n  "userId": 1\n}' },
  { label: 'PUT with Auth', method: 'PUT' as HttpMethod, url: 'https://api.example.com/users/42', headers: [{ id: '1', key: 'Content-Type', value: 'application/json' }, { id: '2', key: 'Authorization', value: 'Bearer token123' }], body: '{"name": "Updated"}' },
  { label: 'DELETE', method: 'DELETE' as HttpMethod, url: 'https://api.example.com/items/99', headers: [], body: '' },
];

// ── Code generators ─────────────────────────────────────────────────────────

function generateFetch(method: string, url: string, headers: Header[], body: string): string {
  const hdrLines = headers.filter(h => h.key.trim())
    .map(h => `    "${h.key}": "${h.value}",`).join('\n');
  const hasHeaders = hdrLines.length > 0;
  const hasBody = body.trim() && method !== 'GET' && method !== 'HEAD';

  const options: string[] = [];
  options.push(`  method: "${method}",`);
  if (hasHeaders) options.push(`  headers: {\n${hdrLines}\n  },`);
  if (hasBody) options.push(`  body: ${body.trim().startsWith('{') ? `JSON.stringify(${body.trim()})` : `\`${body.trim()}\``},`);

  return `fetch("${url}", {\n${options.join('\n')}\n})\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
}

function generateAxios(method: string, url: string, headers: Header[], body: string): string {
  const hdrLines = headers.filter(h => h.key.trim())
    .map(h => `    "${h.key}": "${h.value}",`).join('\n');
  const hasHeaders = hdrLines.length > 0;
  const hasBody = body.trim() && method !== 'GET' && method !== 'HEAD';

  const config: string[] = [`  method: "${method.toLowerCase()}",`];
  if (hasHeaders) config.push(`  headers: {\n${hdrLines}\n  },`);
  if (hasBody) config.push(`  data: ${body.trim()},`);

  return `axios("${url}", {\n${config.join('\n')}\n})\n  .then(res => console.log(res.data))\n  .catch(err => console.error(err));`;
}

function escapeJson(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function generateCurl(method: string, url: string, headers: Header[], body: string): string {
  const parts: string[] = ['curl'];
  if (method !== 'GET') parts.push(`-X ${method}`);
  headers.filter(h => h.key.trim()).forEach(h => {
    parts.push(`-H "${h.key}: ${h.value}"`);
  });
  if (body.trim() && method !== 'GET' && method !== 'HEAD') {
    parts.push(`-d "${escapeJson(body.trim())}"`);
  }
  parts.push(`"${url}"`);
  return parts.join(' \\\n  ');
}

function generateGo(method: string, url: string, headers: Header[], body: string): string {
  let code = `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n\t"strings"\n)\n\nfunc main() {\n`;
  const hasBody = body.trim() && method !== 'GET' && method !== 'HEAD';
  
  if (hasBody) {
    code += `\tbody := strings.NewReader(\`${body.trim()}\`)\n`;
    code += `\treq, err := http.NewRequest("${method}", "${url}", body)\n`;
  } else {
    code += `\treq, err := http.NewRequest("${method}", "${url}", nil)\n`;
  }
  code += `\tif err != nil {\n\t\tpanic(err)\n\t}\n`;
  
  headers.filter(h => h.key.trim()).forEach(h => {
    code += `\treq.Header.Set("${h.key}", "${h.value}")\n`;
  });
  
  code += `\n\tclient := &http.Client{}\n\tresp, err := client.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer resp.Body.Close()\n\n\tdata, _ := io.ReadAll(resp.Body)\n\tfmt.Println(string(data))\n}`;
  return code;
}

function generatePython(method: string, url: string, headers: Header[], body: string): string {
  let code = `import requests\n\n`;
  const hdrDict = headers.filter(h => h.key.trim());
  const hasBody = body.trim() && method !== 'GET' && method !== 'HEAD';
  
  if (hdrDict.length > 0) {
    code += `headers = {\n${hdrDict.map(h => `    "${h.key}": "${h.value}",`).join('\n')}\n}\n\n`;
  }
  
  if (hasBody) {
    code += `data = ${body.trim()}\n\n`;
  }
  
  code += `response = requests.${method.toLowerCase()}("${url}"`;
  if (hdrDict.length > 0) code += `, headers=headers`;
  if (hasBody) {
    code += body.trim().startsWith('{') ? `, json=data` : `, data=data`;
  }
  code += `)\n\nprint(response.status_code)\nprint(response.json())`;
  return code;
}

function generateRust(method: string, url: string, headers: Header[], body: string): string {
  const hdrLines = headers.filter(h => h.key.trim());
  const hasBody = body.trim() && method !== 'GET' && method !== 'HEAD';
  
  let code = `use reqwest::header::HeaderMap;\n\n#[tokio::main]\nasync fn main() -> Result<(), reqwest::Error> {\n    let client = reqwest::Client::new();\n`;
  if (hdrLines.length > 0) {
    code += `    let mut headers = HeaderMap::new();\n`;
    hdrLines.forEach(h => {
      code += `    headers.insert("${h.key}", "${h.value}".parse().unwrap());\n`;
    });
  }
  
  code += `\n    let request = client.${method.toLowerCase()}("${url}")`;
  if (hdrLines.length > 0) code += `\n        .headers(headers)`;
  if (hasBody) code += `\n        .body(r#"${body.trim()}"#)`;
  
  code += `;\n\n    let response = request.send().await?\n        .text().await?;\n\n    println!("{}", response);\n    Ok(())\n}`;
  return code;
}

// ── Component ───────────────────────────────────────────────────────────────

let headerCounter = 0;
const nextHeaderId = () => `h-${++headerCounter}`;

export default function FetchCodeGeneratorPage() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://api.github.com/repos/vercel/next.js');
  const [headers, setHeaders] = useState<Header[]>([
    { id: nextHeaderId(), key: 'Accept', value: 'application/json' },
  ]);
  const [body, setBody] = useState('');
  const [lang, setLang] = useState<OutputLang>('fetch');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const code = useMemo(() => {
    if (!url.trim()) return '';
    switch (lang) {
      case 'fetch': return generateFetch(method, url, headers, body);
      case 'axios': return generateAxios(method, url, headers, body);
      case 'curl': return generateCurl(method, url, headers, body);
      case 'go': return generateGo(method, url, headers, body);
      case 'python': return generatePython(method, url, headers, body);
      case 'rust': return generateRust(method, url, headers, body);
    }
  }, [method, url, headers, body, lang]);

  const addHeader = useCallback(() => {
    setHeaders(prev => [...prev, { id: nextHeaderId(), key: '', value: '' }]);
  }, []);

  const updateHeader = useCallback((id: string, field: 'key' | 'value', val: string) => {
    setHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h));
  }, []);

  const removeHeader = useCallback((id: string) => {
    setHeaders(prev => prev.filter(h => h.id !== id));
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [code]);

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const hdrs: Record<string, string> = {};
      headers.forEach(h => { if (h.key.trim()) hdrs[h.key] = h.value; });
      
      const opts: RequestInit = { method, headers: hdrs };
      if (body.trim() && method !== 'GET' && method !== 'HEAD') {
        opts.body = body;
      }
      
      const res = await fetch(url, opts);
      const text = await res.text();
      const formatted = `Status: ${res.status} ${res.statusText}\n\nHeaders:\n${Array.from(res.headers.entries()).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n\nBody:\n${(() => { try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; } })()}`.slice(0, 5000);
      setResponse(formatted);
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [method, url, headers, body]);

  const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
    setMethod(preset.method);
    setUrl(preset.url);
    setHeaders(preset.headers);
    setBody(preset.body);
  }, []);

  const methodColor = (m: HttpMethod) => {
    switch (m) {
      case 'GET': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'POST': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'PUT': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'PATCH': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HEAD': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'OPTIONS': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <ToolLayout
      title="Fetch Code Generator"
      description="Build HTTP requests visually and generate ready-to-run code in JavaScript (fetch), Axios, cURL, Go, Python, and Rust."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Builder ────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-400" />
              Quick Presets
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-brand-300 transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Method + URL */}
          <div className="card space-y-4">
            <div className="flex gap-3">
              <div className="w-32">
                <label className="text-xs text-slate-400 mb-2 block font-medium">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className="input-field w-full cursor-pointer"
                >
                  {METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-2 block font-medium">URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>

          {/* Headers */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-brand-400" />
                Headers
              </h2>
              <button onClick={addHeader} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {headers.map(h => (
              <div key={h.id} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => updateHeader(h.id, 'key', e.target.value)}
                  placeholder="Key"
                  className="input-field flex-1 font-mono text-xs"
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => updateHeader(h.id, 'value', e.target.value)}
                  placeholder="Value"
                  className="input-field flex-[2] font-mono text-xs"
                />
                <button
                  onClick={() => removeHeader(h.id)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Body */}
          {method !== 'GET' && method !== 'HEAD' && (
            <div className="card space-y-2">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-brand-400" />
                Request Body
              </h2>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={6}
                className="input-field w-full font-mono text-xs resize-y"
              />
            </div>
          )}

          {/* Send button */}
          <button
            onClick={sendRequest}
            disabled={loading || !url.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
            ) : (
              <><Play className="w-4 h-4" /> Send Request</>
            )}
          </button>

          {/* Response */}
          {response && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-green-400" />
                  Response
                </h2>
                <button
                  onClick={() => { navigator.clipboard.writeText(response); toast.success('Copied!'); }}
                  className="text-xs text-slate-400 hover:text-brand-400 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="bg-slate-950 rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">{response}</pre>
            </div>
          )}
        </div>

        {/* ── Right: Code Output ───────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Lang selector */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-brand-400" />
                Generated Code
              </h2>
              <button onClick={copyCode} className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {LANGS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setLang(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                    lang === id
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <pre className="bg-slate-950 rounded-lg p-5 border border-slate-700/50 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed whitespace-pre">
              <code>{code || 'Enter a URL to generate code'}</code>
            </pre>
          </div>

          {/* Method badge visual */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Request Summary</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${methodColor(method)}`}>
                {method}
              </span>
              <span className="text-sm text-slate-300 font-mono truncate">{url || '(no URL)'}</span>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>{headers.filter(h => h.key.trim()).length} header(s)</div>
              {body.trim() && method !== 'GET' && method !== 'HEAD' && (
                <div>Body: {body.length} characters</div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-brand-400 mb-2">💡 Pro Tips</h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
              <li>Switch languages to see idiomatic code for each ecosystem</li>
              <li>Use the <strong className="text-slate-300">Send Request</strong> button to test your API live</li>
              <li>All code generation happens 100% client-side — nothing leaves your browser</li>
              <li>CORS may block some live requests — use browser devtools to inspect</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
