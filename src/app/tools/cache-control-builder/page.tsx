'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, RefreshCw, Info, Shield, Globe, Server, Zap, Timer, BookOpen, AlertTriangle, ChevronDown, ChevronRight, Code2, FileText, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

interface Directive {
  key: string;
  label: string;
  description: string;
  category: 'duration' | 'scope' | 'validation' | 'special';
  hasValue: boolean;
  valueType?: 'seconds' | 'string';
  placeholder?: string;
  commonValues?: string[];
}

const DIRECTIVES: Directive[] = [
  {
    key: 'max-age',
    label: 'max-age',
    description: 'Maximum time in seconds a resource is considered fresh. After this, the cache must revalidate with the origin server.',
    category: 'duration',
    hasValue: true,
    valueType: 'seconds',
    placeholder: 'e.g. 3600 (1 hour)',
    commonValues: ['60', '300', '3600', '86400', '604800', '2592000', '31536000'],
  },
  {
    key: 's-maxage',
    label: 's-maxage',
    description: 'Like max-age, but only applies to shared caches (CDNs, proxies). Overrides max-age for shared caches when present.',
    category: 'duration',
    hasValue: true,
    valueType: 'seconds',
    placeholder: 'e.g. 86400 (1 day)',
    commonValues: ['60', '600', '3600', '86400', '604800'],
  },
  {
    key: 'stale-while-revalidate',
    label: 'stale-while-revalidate',
    description: 'Allow serving stale content while asynchronously revalidating in the background. Improves perceived performance.',
    category: 'duration',
    hasValue: true,
    valueType: 'seconds',
    placeholder: 'e.g. 60',
    commonValues: ['30', '60', '300', '86400'],
  },
  {
    key: 'stale-if-error',
    label: 'stale-if-error',
    description: 'Allow serving stale content if the origin server returns an error (5xx). Provides resilience during origin outages.',
    category: 'duration',
    hasValue: true,
    valueType: 'seconds',
    placeholder: 'e.g. 86400',
    commonValues: ['60', '300', '3600', '86400'],
  },
  {
    key: 'min-fresh',
    label: 'min-fresh',
    description: 'Client wants a response that will still be fresh for at least this many seconds. Used in request headers.',
    category: 'duration',
    hasValue: true,
    valueType: 'seconds',
    placeholder: 'e.g. 60',
    commonValues: ['60', '300'],
  },
  {
    key: 'public',
    label: 'public',
    description: 'Response may be cached by any cache \u2014 browser, CDN, proxy. Use for truly public, non-user-specific content.',
    category: 'scope',
    hasValue: false,
  },
  {
    key: 'private',
    label: 'private',
    description: 'Response is for a single user and must not be stored by shared caches (CDNs). Use for authenticated or user-specific content.',
    category: 'scope',
    hasValue: false,
  },
  {
    key: 'no-cache',
    label: 'no-cache',
    description: 'Cache may store the response but must revalidate with the origin server before each use. Content is cacheable but always checked.',
    category: 'validation',
    hasValue: false,
  },
  {
    key: 'must-revalidate',
    label: 'must-revalidate',
    description: 'Once a resource becomes stale, the cache must not serve it without successful revalidation with the origin.',
    category: 'validation',
    hasValue: false,
  },
  {
    key: 'proxy-revalidate',
    label: 'proxy-revalidate',
    description: 'Like must-revalidate, but only applies to shared caches (CDNs, proxies). Private browser caches are exempt.',
    category: 'validation',
    hasValue: false,
  },
  {
    key: 'must-understand',
    label: 'must-understand',
    description: 'Cache should only store the response if it understands the status code and caching requirements.',
    category: 'validation',
    hasValue: false,
  },
  {
    key: 'no-store',
    label: 'no-store',
    description: 'Response must not be stored in any cache. Every request goes to the origin. Use for sensitive data (banking, auth pages, PII).',
    category: 'special',
    hasValue: false,
  },
  {
    key: 'no-transform',
    label: 'no-transform',
    description: 'Intermediate proxies/CDNs must not modify the response body (e.g. image compression, minification).',
    category: 'special',
    hasValue: false,
  },
  {
    key: 'immutable',
    label: 'immutable',
    description: 'Response body will not change over time. Browsers skip revalidation even on reload. Use with long max-age and versioned filenames.',
    category: 'special',
    hasValue: false,
  },
];

interface Preset {
  name: string;
  description: string;
  icon: string;
  directives: Record<string, string | null>;
}

const PRESETS: Preset[] = [
  {
    name: 'Static Assets (CDN)',
    description: 'Long-lived, versioned assets. Immutable with 1-year max-age.',
    icon: '\u{1F4E6}',
    directives: { public: null, 'max-age': '31536000', immutable: null, 'stale-while-revalidate': '86400' },
  },
  {
    name: 'HTML Pages',
    description: 'Short-lived HTML with background revalidation. Serves stale while fetching fresh.',
    icon: '\u{1F4C4}',
    directives: { public: null, 'max-age': '60', 'stale-while-revalidate': '300', 'must-revalidate': null },
  },
  {
    name: 'API Responses',
    description: 'Medium-lived API. CDN caches 5 min, serves stale up to 1 hour on error.',
    icon: '\u{1F50C}',
    directives: { public: null, 'max-age': '300', 'stale-while-revalidate': '60', 'stale-if-error': '3600' },
  },
  {
    name: 'Authenticated / Private',
    description: 'User-specific data. Never shared, always revalidated.',
    icon: '\u{1F512}',
    directives: { private: null, 'no-cache': null, 'must-revalidate': null },
  },
  {
    name: 'Never Cache',
    description: 'Sensitive data. Full no-store, no exceptions.',
    icon: '\u{1F6AB}',
    directives: { 'no-store': null, 'no-cache': null, 'must-revalidate': null, private: null },
  },
  {
    name: 'CDN Edge Cache',
    description: 'Browser gets short cache, CDN gets long cache. Best of both worlds.',
    icon: '\u{1F30D}',
    directives: { public: null, 'max-age': '60', 's-maxage': '86400', 'stale-while-revalidate': '3600', 'must-revalidate': null },
  },
  {
    name: 'Images / Media',
    description: 'Long-lived media with error resilience.',
    icon: '\u{1F5BC}',
    directives: { public: null, 'max-age': '604800', 'stale-while-revalidate': '86400', 'stale-if-error': '604800', immutable: null },
  },
];

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d < 30) return `${d}d${h > 0 ? ` ${h}h` : ''}`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  return `${Math.floor(d / 365)}y`;
}

function resolveConflicts(directives: Record<string, string | null>): string[] {
  const warnings: string[] = [];
  if (directives['no-store'] !== undefined) {
    if (directives['max-age'] !== undefined) warnings.push('no-store overrides max-age \u2014 max-age has no effect.');
    if (directives['s-maxage'] !== undefined) warnings.push('no-store overrides s-maxage \u2014 s-maxage has no effect.');
    if (directives['stale-while-revalidate'] !== undefined) warnings.push('no-store overrides stale-while-revalidate.');
    if (directives['stale-if-error'] !== undefined) warnings.push('no-store overrides stale-if-error.');
    if (directives['immutable'] !== undefined) warnings.push('no-store overrides immutable \u2014 nothing is stored.');
  }
  if (directives['no-cache'] !== undefined && directives['max-age'] !== undefined) {
    warnings.push('no-cache with max-age: cached but always revalidated before use.');
  }
  if (directives['public'] !== undefined && directives['private'] !== undefined) {
    warnings.push('public and private conflict \u2014 private takes precedence (more restrictive).');
  }
  if (directives['immutable'] !== undefined && directives['max-age'] === undefined) {
    warnings.push('immutable without max-age is unusual \u2014 set a long max-age for best effect.');
  }
  return warnings;
}

function buildHeader(directives: Record<string, string | null>): string {
  const parts: string[] = [];
  for (const dir of DIRECTIVES) {
    if (directives[dir.key] !== undefined) {
      if (dir.hasValue && directives[dir.key] !== null) {
        parts.push(`${dir.key}=${directives[dir.key]}`);
      } else {
        parts.push(dir.key);
      }
    }
  }
  return parts.length > 0 ? parts.join(', ') : '';
}

export default function CacheControlBuilderPage() {
  const [activeDirectives, setActiveDirectives] = useState<Record<string, string | null>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    duration: true,
    scope: true,
    validation: true,
    special: true,
  });

  const header = useMemo(() => buildHeader(activeDirectives), [activeDirectives]);
  const warnings = useMemo(() => resolveConflicts(activeDirectives), [activeDirectives]);

  const toggleSection = (cat: string) => {
    setExpandedSections(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleDirective = useCallback((key: string, hasValue: boolean) => {
    setActiveDirectives(prev => {
      const next = { ...prev };
      if (next[key] !== undefined) {
        delete next[key];
      } else {
        next[key] = hasValue ? '' : null;
      }
      return next;
    });
  }, []);

  const updateValue = useCallback((key: string, value: string) => {
    setActiveDirectives(prev => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setCustomValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setActiveDirectives({ ...preset.directives });
    setCustomValues({});
    toast.success(`Applied "${preset.name}" preset`);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!header) return;
    const fullHeader = `Cache-Control: ${header}`;
    try {
      await navigator.clipboard.writeText(fullHeader);
      setCopied(true);
      toast.success('Header copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [header]);

  const handleReset = useCallback(() => {
    setActiveDirectives({});
    setCustomValues({});
    toast.success('Cleared all directives');
  }, []);

  const categories = useMemo(() => {
    const grouped: Record<string, Directive[]> = {};
    for (const dir of DIRECTIVES) {
      if (!grouped[dir.category]) grouped[dir.category] = [];
      grouped[dir.category].push(dir);
    }
    return grouped;
  }, []);

  const activeCount = Object.keys(activeDirectives).length;

  const activeDirectivesWithInfo = useMemo(() => {
    return Object.entries(activeDirectives)
      .map(([key]) => DIRECTIVES.find(d => d.key === key)!)
      .filter(Boolean);
  }, [activeDirectives]);

  const categoryIcons: Record<string, React.ReactNode> = {
    duration: <Timer className="w-4 h-4 text-blue-400" />,
    scope: <Globe className="w-4 h-4 text-purple-400" />,
    validation: <Shield className="w-4 h-4 text-amber-400" />,
    special: <Zap className="w-4 h-4 text-red-400" />,
  };

  const categoryLabels: Record<string, string> = {
    duration: 'Duration',
    scope: 'Scope',
    validation: 'Validation',
    special: 'Special',
  };

  return (
    <ToolLayout
      title="Cache-Control Header Builder"
      description="Visually construct Cache-Control HTTP headers. Toggle directives, set durations, apply presets, and copy the result \u2014 understanding caching has never been easier."
    >
      {/* Header Preview */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-400" />
            Generated Header
          </h2>
          <span className="text-xs text-slate-500">
            {activeCount} directive{activeCount !== 1 ? 's' : ''} active
          </span>
        </div>

        <div className="relative">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm break-all">
            {header ? (
              <>
                <span className="text-slate-500">Cache-Control: </span>
                <span className="text-green-400">{header}</span>
              </>
            ) : (
              <span className="text-slate-600 italic">Select directives below to build your header...</span>
            )}
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {header && (
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded transition-all ${
                  copied ? 'text-green-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Copy header to clipboard"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            {activeCount > 0 && (
              <button
                onClick={handleReset}
                className="p-1.5 rounded text-slate-400 hover:text-red-400 transition-colors"
                title="Clear all directives"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300"
              >
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {activeDirectivesWithInfo.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeDirectivesWithInfo.map(dir => (
              <span
                key={dir.key}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20"
              >
                {dir.label}
                {dir.hasValue && activeDirectives[dir.key] && (
                  <span className="text-brand-400/70">={activeDirectives[dir.key]}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-yellow-400" />
          Presets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESETS.map(preset => {
            const presetKeys = Object.keys(preset.directives);
            const isActive = presetKeys.length > 0 && presetKeys.every(
              k => activeDirectives[k] !== undefined
            ) && Object.keys(activeDirectives).length === presetKeys.length;
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'border-brand-500/50 bg-brand-500/10'
                    : 'border-slate-700/50 bg-surface hover:border-slate-600/50 hover:bg-surface-lighter'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-sm font-medium text-white">{preset.name}</span>
                </div>
                <p className="text-xs text-slate-500">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Directive builder */}
      <div className="space-y-3">
        {(Object.entries(categories) as [string, Directive[]][]).map(([category, dirs]) => (
          <div key={category} className="card">
            <button
              onClick={() => toggleSection(category)}
              className="w-full flex items-center justify-between group"
            >
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                {categoryIcons[category]}
                {categoryLabels[category]}
                <span className="text-xs text-slate-500 font-normal">
                  ({dirs.length} directives)
                </span>
              </h3>
              {expandedSections[category] ? (
                <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              )}
            </button>

            {expandedSections[category] && (
              <div className="mt-4 space-y-3">
                {dirs.map(dir => {
                  const isActive = activeDirectives[dir.key] !== undefined;
                  return (
                    <div
                      key={dir.key}
                      className={`p-3 rounded-lg border transition-all ${
                        isActive
                          ? 'border-brand-500/30 bg-brand-500/5'
                          : 'border-slate-700/30 bg-surface hover:border-slate-600/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleDirective(dir.key, dir.hasValue)}
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                            isActive
                              ? 'bg-brand-500 border-brand-500'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label
                              onClick={() => toggleDirective(dir.key, dir.hasValue)}
                              className="font-mono text-sm text-white cursor-pointer select-none"
                            >
                              {dir.label}
                            </label>
                            {dir.hasValue && <span className="text-xs text-slate-500">=</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{dir.description}</p>

                          {isActive && dir.hasValue && dir.valueType === 'seconds' && dir.commonValues && (
                            <div className="mt-2 space-y-2">
                              <input
                                type="number"
                                min="0"
                                value={customValues[dir.key] || ''}
                                onChange={(e) => updateValue(dir.key, e.target.value)}
                                placeholder={dir.placeholder || 'Seconds'}
                                className="input-field w-full sm:w-48 text-sm font-mono"
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {dir.commonValues.map(val => {
                                  const isSelected = activeDirectives[dir.key] === val;
                                  return (
                                    <button
                                      key={val}
                                      onClick={() => updateValue(dir.key, val)}
                                      className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                                        isSelected
                                          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                                      }`}
                                    >
                                      {val}
                                      <span className="ml-1 text-slate-600">
                                        ({formatSeconds(parseInt(val))})
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Usage examples */}
      {header && (
        <div className="card mt-6">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            Usage Examples
          </h2>
          <div className="space-y-3">
            {[
              {
                label: 'Nginx',
                code: `add_header Cache-Control "${header}";`,
              },
              {
                label: 'Express.js (Node)',
                code: `res.set('Cache-Control', '${header}');`,
              },
              {
                label: 'Next.js (App Router)',
                code: `const response = NextResponse.next();\nresponse.headers.set('Cache-Control', '${header}');\nreturn response;`,
              },
              {
                label: 'Cloudflare Worker',
                code: `const response = await fetch(request);\nresponse.headers.set('Cache-Control', '${header}');\nreturn response;`,
              },
              {
                label: 'Apache (.htaccess)',
                code: `Header set Cache-Control "${header}"`,
              },
            ].map(ex => (
              <div key={ex.label}>
                <p className="text-xs text-slate-500 mb-1">{ex.label}</p>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-green-400 overflow-x-auto">
                  {ex.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Guide */}
      <div className="card mt-6">
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Caching Strategy Guide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="font-medium text-slate-300 mb-1">max-age vs s-maxage</p>
            <p>max-age applies to ALL caches (browser + CDN). s-maxage overrides it for shared caches only. Use s-maxage to give CDNs a longer cache than browsers.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="font-medium text-slate-300 mb-1">no-cache vs no-store</p>
            <p>no-cache = cached but always revalidated. no-store = never cached at all. Most &quot;don&apos;t cache&quot; needs are actually no-cache. True no-store is rare (banking, PII).</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="font-medium text-slate-300 mb-1">stale-while-revalidate</p>
            <p>Serve stale instantly, update in background. Perfect when showing something fast matters more than perfect freshness: max-age=60, stale-while-revalidate=3600.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="font-medium text-slate-300 mb-1">immutable Pattern</p>
            <p>Use with versioned/hashed filenames (app.abc123.js). With max-age=31536000, the browser skips revalidation entirely on reload.</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
