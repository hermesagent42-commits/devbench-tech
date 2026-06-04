'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Globe, FileCode, Link2, Shield, Upload, Trash2, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

type HashAlgo = 'SHA-256' | 'SHA-384' | 'SHA-512';

const PRESETS = [
  { name: 'React 18 (UMD)', url: 'https://unpkg.com/react@18/umd/react.production.min.js', label: 'React 18 Production' },
  { name: 'React DOM 18 (UMD)', url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', label: 'ReactDOM 18 Production' },
  { name: 'Vue 3 (Global)', url: 'https://unpkg.com/vue@3/dist/vue.global.prod.js', label: 'Vue 3 Production' },
  { name: 'Alpine.js', url: 'https://unpkg.com/alpinejs@3/dist/cdn.min.js', label: 'Alpine.js' },
  { name: 'jQuery 3', url: 'https://code.jquery.com/jquery-3.7.1.min.js', label: 'jQuery 3.7' },
  { name: 'Lodash', url: 'https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js', label: 'Lodash 4' },
  { name: 'D3.js', url: 'https://d3js.org/d3.v7.min.js', label: 'D3.js v7' },
  { name: 'Chart.js', url: 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js', label: 'Chart.js 4' },
  { name: 'Three.js', url: 'https://unpkg.com/three@0.160/build/three.min.js', label: 'Three.js' },
  { name: 'Tailwind CDN', url: 'https://cdn.tailwindcss.com', label: 'Tailwind Play CDN' },
  { name: 'Bootstrap 5 CSS', url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3/dist/css/bootstrap.min.css', label: 'Bootstrap 5 CSS' },
  { name: 'Font Awesome 6', url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css', label: 'Font Awesome 6 CSS' },
  { name: 'normalize.css', url: 'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css', label: 'normalize.css 8' },
  { name: 'Axios', url: 'https://unpkg.com/axios@1/dist/axios.min.js', label: 'Axios' },
  { name: 'Day.js', url: 'https://unpkg.com/dayjs@1/dayjs.min.js', label: 'Day.js' },
];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function SRIHashGenerator() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Record<HashAlgo, string>>({ 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
  const [loading, setLoading] = useState(false);
  const [fetchedUrl, setFetchedUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [resourceType, setResourceType] = useState<'script' | 'link'>('script');
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const computeHashes = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResults({ 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
      return;
    }
    setLoading(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const algos: HashAlgo[] = ['SHA-256', 'SHA-384', 'SHA-512'];
      const newResults: Record<string, string> = {};
      for (const algo of algos) {
        const hashBuffer = await crypto.subtle.digest(algo, data);
        const base64 = arrayBufferToBase64(hashBuffer);
        newResults[algo] = `${algo.toLowerCase()}-${base64}`;
      }
      setResults(newResults as Record<HashAlgo, string>);
    } catch {
      toast.error('Failed to compute hash');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFetchUrl = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('Please enter a valid HTTP/HTTPS URL');
      return;
    }
    setFetching(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        toast.error(`Failed to fetch: ${resp.status} ${resp.statusText}`);
        return;
      }
      const text = await resp.text();
      setInput(text);
      setFetchedUrl(url);
      await computeHashes(text);
      toast.success(`Fetched ${(text.length / 1024).toFixed(1)} KB from CDN`);
    } catch (err: any) {
      if (err.message?.includes('CORS') || err.message?.includes('fetch')) {
        toast.error('CORS blocked. Try pasting the file content directly, or use a CORS-enabled CDN.');
      } else {
        toast.error('Failed to fetch. Check the URL or paste content manually.');
      }
    } finally {
      setFetching(false);
    }
  }, [urlInput, computeHashes]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInput(text);
      setFetchedUrl('');
      computeHashes(text);
      toast.success(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  }, [computeHashes]);

  const handlePreset = useCallback(async (preset: { url: string; name: string }) => {
    setUrlInput(preset.url);
    setFetching(true);
    try {
      const resp = await fetch(preset.url);
      if (!resp.ok) {
        toast.error(`Failed: ${resp.status}`);
        setFetching(false);
        return;
      }
      const text = await resp.text();
      setInput(text);
      setFetchedUrl(preset.url);
      await computeHashes(text);
      toast.success(`Loaded ${preset.name} (${(text.length / 1024).toFixed(1)} KB)`);
    } catch {
      toast.error('CORS blocked for this preset. Try pasting content directly.');
    } finally {
      setFetching(false);
    }
  }, [computeHashes]);

  const handleTextCompute = useCallback(() => {
    setFetchedUrl('');
    computeHashes(input);
  }, [input, computeHashes]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(prev => ({ ...prev, [label]: true }));
      toast.success('Copied!');
      setTimeout(() => setCopied(prev => ({ ...prev, [label]: false })), 2000);
    });
  }, []);

  const generatedTag = useMemo(() => {
    const algo: HashAlgo = 'SHA-384'; // Most commonly recommended
    if (!results[algo]) return '';
    if (resourceType === 'script') {
      return `<script src="${fetchedUrl || 'YOUR_CDN_URL'}" \n  integrity="${results[algo]}"\n  crossorigin="anonymous"></script>`;
    } else {
      return `<link rel="stylesheet" href="${fetchedUrl || 'YOUR_CDN_URL'}" \n  integrity="${results[algo]}"\n  crossorigin="anonymous">`;
    }
  }, [results, resourceType, fetchedUrl]);

  const hasResults = results['SHA-256'] !== '';

  return (
    <ToolLayout
      title="SRI Hash Generator"
      description="Generate Subresource Integrity (SRI) hashes for CDN-hosted scripts and stylesheets. Fetch from a URL, upload a file, or paste content — get SHA-256, SHA-384, and SHA-512 integrity attributes for secure third-party resource loading."
    >
      <div className="space-y-6">
        {/* Input Section */}
        <div className="card border border-slate-700/50 p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <FileCode className="w-4 h-4 text-brand-400" />
            Source Content
          </h3>

          {/* URL Fetch */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                className="input-field w-full pl-10 font-mono text-sm"
                placeholder="https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
              />
            </div>
            <button
              onClick={handleFetchUrl}
              disabled={fetching || !urlInput.trim()}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {fetching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Fetching...</>
              ) : (
                <><Link2 className="w-4 h-4" /> Fetch</>
              )}
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload File (.js / .css)
              <input type="file" className="hidden" accept=".js,.css,.txt,.html,.mjs" onChange={handleFileUpload} />
            </label>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
              Or paste content directly
              {fetchedUrl && (
                <span className="text-brand-400 ml-2 normal-case tracking-normal">
                  — from: <span className="font-mono text-xs">{fetchedUrl}</span>
                </span>
              )}
            </label>
            <textarea
              className="input-field w-full font-mono text-xs min-h-[120px] resize-y"
              placeholder="Paste the contents of a JavaScript or CSS file here..."
              value={input}
              onChange={e => { setInput(e.target.value); setFetchedUrl(''); }}
            />
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={handleTextCompute}
                disabled={!input.trim() || loading}
                className="btn-primary px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Computing...</>
                ) : (
                  <><Shield className="w-4 h-4" /> Compute Hashes</>
                )}
              </button>
              {input && (
                <button
                  onClick={() => { setInput(''); setResults({ 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' }); setFetchedUrl(''); }}
                  className="text-slate-500 hover:text-red-400 text-sm flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Presets */}
        <div>
          <h3 className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Popular CDN Presets</h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset)}
                disabled={fetching}
                className="px-3 py-1.5 text-xs rounded-full border border-slate-700 hover:border-brand-500 hover:text-brand-300 text-slate-400 transition-all disabled:opacity-40"
                title={preset.url}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {hasResults && (
          <>
            <div className="card border border-slate-700/50 p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Integrity Hashes
              </h3>
              {(['SHA-256', 'SHA-384', 'SHA-512'] as HashAlgo[]).map(algo => (
                <div key={algo} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-[72px]">{algo}</span>
                    <code className="flex-1 px-3 py-2 bg-[#0f172a] border border-slate-700/50 rounded-lg text-xs font-mono text-emerald-400 break-all">
                      {results[algo]}
                    </code>
                    <button
                      onClick={() => copyToClipboard(results[algo], algo)}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors shrink-0"
                      title={`Copy ${algo} hash`}
                    >
                      {copied[algo] ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Generated Tag */}
            <div className="card border border-slate-700/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Generated HTML Tag</h3>
                <div className="flex items-center gap-1 bg-[#0f172a] rounded-lg p-0.5 border border-slate-700/50">
                  <button
                    onClick={() => setResourceType('script')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${resourceType === 'script' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    &lt;script&gt;
                  </button>
                  <button
                    onClick={() => setResourceType('link')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${resourceType === 'link' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    &lt;link&gt;
                  </button>
                </div>
              </div>
              <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg p-4 overflow-x-auto relative group">
                <button
                  onClick={() => copyToClipboard(generatedTag, 'tag')}
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied['tag'] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                </button>
                <pre className="text-xs text-slate-300 font-mono leading-relaxed">{generatedTag}</pre>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Best practice: Use SHA-384</p>
                  <p className="text-blue-400/70">
                    SHA-384 provides the best balance of security and performance. The <code className="text-blue-300 bg-blue-500/10 px-1 py-0.5 rounded">crossorigin=&quot;anonymous&quot;</code> attribute is required even for same-origin CDN resources.
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Instructions */}
            <div className="card border border-slate-700/50 p-5 space-y-2">
              <h3 className="text-white font-semibold text-sm">How to Use</h3>
              <ol className="text-sm text-slate-400 space-y-1.5 list-decimal list-inside">
                <li>Copy the generated <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">&lt;script&gt;</code> or <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-xs">&lt;link&gt;</code> tag above.</li>
                <li>Replace any existing CDN reference in your HTML with the new tag.</li>
                <li>The browser will verify the file hash matches before executing it — preventing supply chain attacks.</li>
                <li>If the CDN file changes legitimately, regenerate the hash.</li>
              </ol>
              <p className="text-xs text-slate-500 mt-2">
                Learn more: <a href="https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">MDN: Subresource Integrity</a>
              </p>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
