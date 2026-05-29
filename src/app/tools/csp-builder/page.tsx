'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Shield, Plus, X, ChevronDown, ChevronRight, Check, RefreshCw, Info, AlertTriangle, FileText, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

// CSP directives grouped by category
interface DirectiveDef {
  key: string;
  label: string;
  description: string;
  category: 'fetch' | 'document' | 'navigation' | 'reporting' | 'other';
  commonValues: string[];
}

const DIRECTIVES: DirectiveDef[] = [
  // Fetch directives
  { key: 'default-src', label: 'default-src', description: 'Fallback for all fetch directives. If a specific directive is not set, this one applies.', category: 'fetch', commonValues: ["'self'", "'none'", '*'] },
  { key: 'script-src', label: 'script-src', description: 'Valid sources for JavaScript.', category: 'fetch', commonValues: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", "'nonce-...'", 'https://cdn.example.com'] },
  { key: 'style-src', label: 'style-src', description: 'Valid sources for CSS stylesheets and inline styles.', category: 'fetch', commonValues: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'] },
  { key: 'img-src', label: 'img-src', description: 'Valid sources for images and favicons.', category: 'fetch', commonValues: ["'self'", 'data:', 'https:', 'https://images.example.com'] },
  { key: 'font-src', label: 'font-src', description: 'Valid sources for @font-face loaded fonts.', category: 'fetch', commonValues: ["'self'", 'https://fonts.gstatic.com', 'data:'] },
  { key: 'media-src', label: 'media-src', description: 'Valid sources for <audio>, <video>, and <track> elements.', category: 'fetch', commonValues: ["'self'", 'https://media.example.com'] },
  { key: 'frame-src', label: 'frame-src', description: 'Valid sources for <frame> and <iframe> elements.', category: 'fetch', commonValues: ["'self'", 'https://www.youtube.com', 'https://player.vimeo.com'] },
  { key: 'child-src', label: 'child-src', description: 'Valid sources for web workers and nested browsing contexts. Deprecated in favor of frame-src and worker-src.', category: 'fetch', commonValues: ["'self'"] },
  { key: 'worker-src', label: 'worker-src', description: 'Valid sources for Worker, SharedWorker, and ServiceWorker scripts.', category: 'fetch', commonValues: ["'self'", 'blob:'] },
  { key: 'connect-src', label: 'connect-src', description: 'Valid targets for fetch(), XMLHttpRequest, WebSocket, and EventSource.', category: 'fetch', commonValues: ["'self'", 'https://api.example.com', 'wss://ws.example.com'] },
  { key: 'object-src', label: 'object-src', description: 'Valid sources for <object>, <embed>, and <applet> elements.', category: 'fetch', commonValues: ["'none'", "'self'"] },
  { key: 'manifest-src', label: 'manifest-src', description: 'Valid sources for web app manifest files.', category: 'fetch', commonValues: ["'self'"] },

  // Document directives
  { key: 'base-uri', label: 'base-uri', description: 'Restricts the URLs that can appear in a <base> element.', category: 'document', commonValues: ["'self'", "'none'"] },
  { key: 'sandbox', label: 'sandbox', description: 'Enables a sandbox for the requested resource similar to the <iframe> sandbox attribute.', category: 'document', commonValues: ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups', ''] },

  // Navigation directives
  { key: 'form-action', label: 'form-action', description: 'Restricts URLs that can be used as targets in form submissions.', category: 'navigation', commonValues: ["'self'", 'https://submit.example.com'] },
  { key: 'frame-ancestors', label: 'frame-ancestors', description: 'Valid parents that may embed the page. Use this to prevent clickjacking.', category: 'navigation', commonValues: ["'self'", "'none'", 'https://trusted.example.com'] },
  { key: 'navigate-to', label: 'navigate-to', description: 'Restricts URLs the document can navigate to. Experimental.', category: 'navigation', commonValues: ["'self'", 'https://example.com'] },

  // Reporting directives
  { key: 'report-uri', label: 'report-uri', description: 'URL where the browser sends violation reports. Deprecated in favor of report-to.', category: 'reporting', commonValues: ['https://example.com/csp-report'] },
  { key: 'report-to', label: 'report-to', description: 'Specifies a reporting group defined in a Report-To header.', category: 'reporting', commonValues: ['csp-endpoint'] },

  // Other directives
  { key: 'upgrade-insecure-requests', label: 'upgrade-insecure-requests', description: 'Instructs the browser to rewrite HTTP URLs to HTTPS. No value needed.', category: 'other', commonValues: [] },
  { key: 'block-all-mixed-content', label: 'block-all-mixed-content', description: 'Prevents loading any assets over HTTP when the page is loaded over HTTPS. Deprecated in favor of upgrade-insecure-requests.', category: 'other', commonValues: [] },
  { key: 'trusted-types', label: 'trusted-types', description: 'Restricts the creation of Trusted Types policies to prevent DOM XSS.', category: 'other', commonValues: ["'none'", 'default', 'dompurify'] },
  { key: 'require-trusted-types-for', label: 'require-trusted-types-for', description: 'Requires Trusted Types for specific sink groups (e.g., \'script\').', category: 'other', commonValues: ["'script'"] },
];

interface ActiveDirective {
  key: string;
  values: string;
}

interface Preset {
  name: string;
  description: string;
  directives: Record<string, string | null>;
}

const PRESETS: Preset[] = [
  {
    name: 'Strict Baseline',
    description: 'Maximum security with hash/nonce-based scripts. Blocks everything by default.',
    directives: {
      'default-src': "'self'",
      'script-src': "'self'",
      'style-src': "'self'",
      'img-src': "'self'",
      'font-src': "'self'",
      'connect-src': "'self'",
      'media-src': "'self'",
      'frame-src': "'self'",
      'object-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'",
      'frame-ancestors': "'self'",
      'upgrade-insecure-requests': null,
    },
  },
  {
    name: 'Google APIs + CDN',
    description: 'Allow Google Fonts, Analytics, and a CDN for scripts.',
    directives: {
      'default-src': "'self'",
      'script-src': "'self' https://www.googletagmanager.com https://cdn.jsdelivr.net",
      'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
      'img-src': "'self' data: https:",
      'font-src': "'self' https://fonts.gstatic.com",
      'connect-src': "'self' https://www.google-analytics.com",
      'frame-src': "'self'",
      'object-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'",
      'frame-ancestors': "'self'",
      'upgrade-insecure-requests': null,
    },
  },
  {
    name: 'Full Lockdown (Report-Only)',
    description: 'Most restrictive policy — great for testing via Report-Only mode.',
    directives: {
      'default-src': "'none'",
      'script-src': "'self'",
      'style-src': "'self'",
      'img-src': "'self'",
      'font-src': "'self'",
      'connect-src': "'self'",
      'media-src': "'self'",
      'frame-src': "'none'",
      'object-src': "'none'",
      'base-uri': "'none'",
      'form-action': "'none'",
      'frame-ancestors': "'none'",
      'upgrade-insecure-requests': null,
    },
  },
  {
    name: 'YouTube Embeds',
    description: 'Allow self-hosted content plus YouTube iframe embeds.',
    directives: {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline'",
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: https:",
      'font-src': "'self'",
      'connect-src': "'self'",
      'media-src': "'self'",
      'frame-src': "'self' https://www.youtube.com https://player.vimeo.com",
      'object-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'",
      'frame-ancestors': "'self'",
    },
  },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildPolicy(directives: ActiveDirective[]): string {
  return directives
    .filter((d) => {
      if (['upgrade-insecure-requests', 'block-all-mixed-content'].includes(d.key)) {
        // Flag directives: include if added at all (even with empty value)
        return true;
      }
      return d.values.trim().length > 0;
    })
    .map((d) => {
      const trimmed = d.values.trim();
      if (['upgrade-insecure-requests', 'block-all-mixed-content'].includes(d.key)) {
        return d.key;
      }
      return `${d.key} ${trimmed};`;
    })
    .join(' ');
}

function buildMetaTag(directives: ActiveDirective[]): string {
  const policy = buildPolicy(directives);
  return `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy)}">`;
}

export default function CspBuilderPage() {
  const [directives, setDirectives] = useState<ActiveDirective[]>(() =>
    PRESETS[0].directives
      ? Object.entries(PRESETS[0].directives).map(([key, val]) => ({
          key,
          values: val ?? '',
        }))
      : []
  );
  const [showDirectivePicker, setShowDirectivePicker] = useState(false);
  const [directiveSearch, setDirectiveSearch] = useState('');
  const [reportOnly, setReportOnly] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fetch: true,
    document: false,
    navigation: false,
    reporting: false,
    other: false,
  });

  const addedKeys = useMemo(() => new Set(directives.map((d) => d.key)), [directives]);
  const availableDirectives = useMemo(
    () => DIRECTIVES.filter((d) => !addedKeys.has(d.key) && d.key.toLowerCase().includes(directiveSearch.toLowerCase())),
    [addedKeys, directiveSearch]
  );

  const groupedAvailable = useMemo(() => {
    const groups: Record<string, DirectiveDef[]> = {};
    availableDirectives.forEach((d) => {
      if (!groups[d.category]) groups[d.category] = [];
      groups[d.category].push(d);
    });
    return groups;
  }, [availableDirectives]);

  const policy = useMemo(() => buildPolicy(directives), [directives]);
  const metaTag = useMemo(() => buildMetaTag(directives), [directives]);
  const headerName = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  const addDirective = useCallback((def: DirectiveDef) => {
    setDirectives((prev) => [...prev, { key: def.key, values: def.commonValues[0] ?? '' }]);
    setShowDirectivePicker(false);
    setDirectiveSearch('');
  }, []);

  const removeDirective = useCallback((key: string) => {
    setDirectives((prev) => prev.filter((d) => d.key !== key));
  }, []);

  const updateValues = useCallback((key: string, values: string) => {
    setDirectives((prev) => prev.map((d) => (d.key === key ? { ...d, values } : d)));
  }, []);

  const loadPreset = useCallback((preset: Preset) => {
    const newDirectives: ActiveDirective[] = Object.entries(preset.directives).map(([key, val]) => ({
      key,
      values: val ?? '',
    }));
    setDirectives(newDirectives);
    toast.success(`Loaded "${preset.name}" preset`);
  }, []);

  const clearAll = useCallback(() => {
    setDirectives([]);
    toast.success('All directives cleared');
  }, []);

  const copyPolicy = useCallback(() => {
    navigator.clipboard.writeText(policy).then(
      () => toast.success('Policy copied!'),
      () => toast.error('Copy failed')
    );
  }, [policy]);

  const copyHeader = useCallback(() => {
    navigator.clipboard.writeText(`${headerName}: ${policy}`).then(
      () => toast.success('Header copied!'),
      () => toast.error('Copy failed')
    );
  }, [policy, headerName]);

  const copyMeta = useCallback(() => {
    navigator.clipboard.writeText(metaTag).then(
      () => toast.success('Meta tag copied!'),
      () => toast.error('Copy failed')
    );
  }, [metaTag]);

  // Get definition for a directive key
  const getDef = useCallback(
    (key: string) => DIRECTIVES.find((d) => d.key === key),
    []
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const categoryOrder = ['fetch', 'document', 'navigation', 'reporting', 'other'];

  return (
    <ToolLayout
      title="CSP Builder"
      description="Build Content-Security-Policy headers interactively. Add directives, set allowed sources, and export as HTTP header or meta tag. 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap w-full">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reportOnly}
              onChange={(e) => setReportOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/30"
            />
            <span className="text-xs text-slate-400">
              Report-Only mode{' '}
              <span className="text-amber-400 font-medium">(testing)</span>
            </span>
          </label>
          <div className="flex-1" />
          <span className="text-xs text-slate-500">
            {directives.length} directive{directives.length !== 1 ? 's' : ''}
          </span>
        </div>
      }
    >
      {/* Presets */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Quick Presets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className="card p-3 text-left hover:border-brand-500/50 transition-all group"
            >
              <div className="text-sm font-medium text-slate-200 group-hover:text-brand-400 transition-colors">
                {preset.name}
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active directives */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-400" />
            Active Directives
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDirectivePicker(!showDirectivePicker)}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Directive
            </button>
            {directives.length > 0 && (
              <button
                onClick={clearAll}
                className="btn-ghost text-xs text-slate-400 hover:text-red-400 py-1.5 px-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Directive picker dropdown */}
        {showDirectivePicker && (
          <div className="card mb-4 p-3 animate-in fade-in">
            <input
              type="text"
              value={directiveSearch}
              onChange={(e) => setDirectiveSearch(e.target.value)}
              placeholder="Search directives..."
              className="input-field w-full mb-3 text-sm py-2"
              autoFocus
            />
            {availableDirectives.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                {directives.length === DIRECTIVES.length
                  ? 'All directives added!'
                  : 'No matching directives found.'}
              </p>
            ) : (
              categoryOrder.map((cat) => {
                const catDirs = groupedAvailable[cat];
                if (!catDirs || catDirs.length === 0) return null;
                return (
                  <div key={cat} className="mb-3 last:mb-0">
                    <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 px-1">
                      {cat}
                    </h3>
                    <div className="space-y-1">
                      {catDirs.map((def) => (
                        <button
                          key={def.key}
                          onClick={() => addDirective(def)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-brand-500/10 hover:text-brand-400 transition-all group flex items-start gap-2"
                        >
                          <code className="text-xs font-mono text-sky-400 group-hover:text-brand-400 shrink-0">
                            {def.key}
                          </code>
                          <span className="text-xs text-slate-400 group-hover:text-slate-300 leading-snug">
                            {def.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Directive cards */}
        {directives.length === 0 ? (
          <div className="card p-8 text-center">
            <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No directives added yet.</p>
            <p className="text-slate-500 text-xs mt-1">
              Load a preset or click &ldquo;Add Directive&rdquo; to start building your CSP.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {directives.map((d) => {
              const def = getDef(d.key);
              const isFlag = ['upgrade-insecure-requests', 'block-all-mixed-content'].includes(d.key);
              return (
                <div key={d.key} className="card p-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-sky-400">{d.key}</code>
                        {def && (
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">
                            {def.category}
                          </span>
                        )}
                      </div>
                      {def && (
                        <p className="text-xs text-slate-500 leading-relaxed mb-2">
                          {def.description}
                        </p>
                      )}

                      {isFlag ? (
                        <p className="text-xs text-slate-400 italic">
                          This directive requires no value — it&apos;s a flag.
                        </p>
                      ) : (
                        <div>
                          <input
                            type="text"
                            value={d.values}
                            onChange={(e) => updateValues(d.key, e.target.value)}
                            placeholder="e.g., 'self' https://cdn.example.com"
                            className="input-field w-full text-sm font-mono py-2"
                            spellCheck={false}
                          />
                          {def && def.commonValues.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {def.commonValues.map((val) => (
                                <button
                                  key={val}
                                  onClick={() => {
                                    const current = d.values.trim();
                                    const newVal = val === '' ? '' : val;
                                    if (!current) {
                                      updateValues(d.key, newVal);
                                    } else {
                                      // Toggle: if value is already there, remove it; else append
                                      const parts = current.split(/\s+/);
                                      if (parts.includes(newVal)) {
                                        updateValues(d.key, parts.filter((p) => p !== newVal).join(' '));
                                      } else {
                                        updateValues(d.key, `${current} ${newVal}`);
                                      }
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                                    d.values.includes(val)
                                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                                  }`}
                                >
                                  {val || '(empty)'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeDirective(d.key)}
                      className="shrink-0 text-slate-600 hover:text-red-400 transition-colors mt-1"
                      title={`Remove ${d.key}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Output */}
      {policy && (
        <>
          {/* Generated Header */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Generated Header
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyPolicy}
                  className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy Policy
                </button>
                <button
                  onClick={copyHeader}
                  className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy Header
                </button>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm font-mono text-slate-200 leading-relaxed break-all">
                <span className="text-emerald-400">{headerName}:</span>{' '}
                <span className="text-sky-300">{policy}</span>
              </code>
            </div>
          </div>

          {/* Meta tag version */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                HTML Meta Tag
              </h2>
              <button
                onClick={copyMeta}
                className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy Meta Tag
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm font-mono text-slate-200 leading-relaxed break-all">
                {metaTag}
              </code>
            </div>
          </div>

          {/* Quick Reference */}
          <details className="card group">
            <summary className="cursor-pointer list-none flex items-center justify-between p-4">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                Common Source Values Reference
              </h2>
              <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-4 pb-4 border-t border-slate-700/50 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">&apos;self&apos;</code>
                  <span className="text-slate-400">Same origin as the document.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">&apos;none&apos;</code>
                  <span className="text-slate-400">Block all sources. Most restrictive.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">&apos;unsafe-inline&apos;</code>
                  <span className="text-slate-400">Allow inline scripts/styles. Avoid if possible.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">&apos;unsafe-eval&apos;</code>
                  <span className="text-slate-400">Allow eval() and Function constructor.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">&apos;strict-dynamic&apos;</code>
                  <span className="text-slate-400">Trust scripts loaded by trusted scripts.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">&apos;nonce-...&apos;</code>
                  <span className="text-slate-400">Allow script/style with matching nonce attr.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">&apos;sha256-...&apos;</code>
                  <span className="text-slate-400">Allow inline if it matches this hash.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">data:</code>
                  <span className="text-slate-400">Allow data: URIs (e.g., inline images).</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">https:</code>
                  <span className="text-slate-400">Allow any HTTPS source.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">blob:</code>
                  <span className="text-slate-400">Allow blob: URLs (e.g., web workers).</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">*</code>
                  <span className="text-slate-400">Allow any source. Very permissive.</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-sky-400 shrink-0">wss:</code>
                  <span className="text-slate-400">Allow secure WebSocket connections.</span>
                </div>
              </div>
            </div>
          </details>

          {/* Tips */}
          <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Tips for a Strong CSP
            </h3>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>• Start with <strong>Report-Only</strong> mode to monitor violations without breaking your site.</li>
              <li>• Avoid <code>&apos;unsafe-inline&apos;</code> — use nonces or hashes instead for inline scripts/styles.</li>
              <li>• Set <code>object-src &apos;none&apos;</code> to block legacy plugin vectors (Flash, Java).</li>
              <li>• Use <code>frame-ancestors &apos;self&apos;</code> to prevent clickjacking (replaces X-Frame-Options).</li>
              <li>• After testing, switch to enforcing mode by unchecking Report-Only.</li>
              <li>• Test your policy with{' '}
                <a href="https://csp-evaluator.withgoogle.com/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                  Google&apos;s CSP Evaluator
                </a>{' '}
                before deploying.
              </li>
            </ul>
          </div>
        </>
      )}
    </ToolLayout>
  );
}

// Zap icon component inline
function Zap({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
