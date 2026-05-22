'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Plus, Trash2, RotateCcw, Check, FileText, Globe, Clock, MapPin, Bot, ShieldBan } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PathRule {
  id: string;
  directive: 'Allow' | 'Disallow';
  path: string;
}

interface Preset {
  label: string;
  userAgents: string[];
  rules: PathRule[];
  crawlDelay: string;
  icon: React.ReactNode;
}

// ── Constants ──────────────────────────────────────────────────────────────

const COMMON_USER_AGENTS = [
  { value: '*', label: 'All Crawlers' },
  { value: 'Googlebot', label: 'Googlebot' },
  { value: 'Googlebot-Image', label: 'Googlebot Image' },
  { value: 'Googlebot-News', label: 'Googlebot News' },
  { value: 'Bingbot', label: 'Bingbot' },
  { value: 'Slurp', label: 'Yahoo Slurp' },
  { value: 'DuckDuckBot', label: 'DuckDuckBot' },
  { value: 'Baiduspider', label: 'Baiduspider' },
  { value: 'YandexBot', label: 'YandexBot' },
  { value: 'facebot', label: 'Facebook Crawler' },
  { value: 'Twitterbot', label: 'Twitterbot' },
  { value: 'Applebot', label: 'Applebot' },
  { value: 'GPTBot', label: 'GPTBot (OpenAI)' },
  { value: 'CCBot', label: 'CCBot (Common Crawl)' },
  { value: 'anthropic-ai', label: 'Anthropic AI' },
  { value: 'Bytespider', label: 'Bytespider (TikTok)' },
];

const PRESETS: Preset[] = [
  {
    label: 'Allow All',
    userAgents: ['*'],
    rules: [],
    crawlDelay: '',
    icon: <Globe className="w-4 h-4" />,
  },
  {
    label: 'Block All',
    userAgents: ['*'],
    rules: [{ id: '1', directive: 'Disallow', path: '/' }],
    crawlDelay: '',
    icon: <ShieldBan className="w-4 h-4" />,
  },
  {
    label: 'Block AI Crawlers',
    userAgents: ['GPTBot', 'CCBot', 'anthropic-ai', 'Bytespider'],
    rules: [{ id: '1', directive: 'Disallow', path: '/' }],
    crawlDelay: '',
    icon: <Bot className="w-4 h-4" />,
  },
  {
    label: 'SEO Friendly',
    userAgents: ['*'],
    rules: [
      { id: '1', directive: 'Disallow', path: '/api/' },
      { id: '2', directive: 'Disallow', path: '/admin/' },
      { id: '3', directive: 'Disallow', path: '/*.json$' },
      { id: '4', directive: 'Allow', path: '/' },
    ],
    crawlDelay: '10',
    icon: <FileText className="w-4 h-4" />,
  },
];

let ruleIdCounter = 1;

function makeRuleId(): string {
  return String(++ruleIdCounter);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function RobotsTxtGeneratorPage() {
  const [userAgents, setUserAgents] = useState<string[]>(['*']);
  const [rules, setRules] = useState<PathRule[]>([
    { id: '1', directive: 'Disallow', path: '/api/' },
  ]);
  const [crawlDelay, setCrawlDelay] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Add / Remove agents ──────────────────────────────────────────

  const addUserAgent = useCallback((agent: string) => {
    setUserAgents((prev) => {
      if (prev.includes(agent)) return prev;
      return [...prev, agent];
    });
  }, []);

  const removeUserAgent = useCallback((agent: string) => {
    setUserAgents((prev) => prev.filter((a) => a !== agent));
  }, []);

  // ── Add / Remove / Update rules ──────────────────────────────────

  const addRule = useCallback(() => {
    setRules((prev) => [...prev, { id: makeRuleId(), directive: 'Disallow', path: '/' }]);
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRule = useCallback((id: string, field: 'directive' | 'path', value: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  // ── Presets ──────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: Preset) => {
    setUserAgents([...preset.userAgents]);
    setRules(preset.rules.map((r, i) => ({ ...r, id: String(i + 1) })));
    setCrawlDelay(preset.crawlDelay);
    ruleIdCounter = preset.rules.length;
  }, []);

  // ── Reset ────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setUserAgents(['*']);
    setRules([]);
    setCrawlDelay('');
    setSitemapUrl('');
    ruleIdCounter = 0;
  }, []);

  // ── Generate robots.txt ──────────────────────────────────────────

  const robotsTxt = useMemo(() => {
    const lines: string[] = [];

    // Group by user-agent
    for (const agent of userAgents) {
      lines.push(`User-agent: ${agent}`);
    }

    // Add rules
    if (rules.length === 0) {
      lines.push('Allow: /');
    } else {
      // Sort: Disallow first, then Allow (common convention)
      const sorted = [...rules].sort((a, b) => {
        if (a.directive === 'Disallow' && b.directive === 'Allow') return -1;
        if (a.directive === 'Allow' && b.directive === 'Disallow') return 1;
        return 0;
      });
      for (const rule of sorted) {
        lines.push(`${rule.directive}: ${rule.path}`);
      }
    }

    if (crawlDelay && crawlDelay.trim()) {
      lines.push(`Crawl-delay: ${crawlDelay.trim()}`);
    }

    if (sitemapUrl && sitemapUrl.trim()) {
      lines.push(`Sitemap: ${sitemapUrl.trim()}`);
    }

    return lines.join('\n');
  }, [userAgents, rules, crawlDelay, sitemapUrl]);

  // ── Copy ─────────────────────────────────────────────────────────

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(robotsTxt);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [robotsTxt]);

  // ── Download ─────────────────────────────────────────────────────

  const downloadFile = useCallback(() => {
    const blob = new Blob([robotsTxt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('robots.txt downloaded');
  }, [robotsTxt]);

  // ── Render ───────────────────────────────────────────────────────

  const availableAgents = COMMON_USER_AGENTS.filter((a) => !userAgents.includes(a.value));

  return (
    <ToolLayout
      title="Robots.txt Generator"
      description="Build robots.txt files interactively. Choose which crawlers to target, set allow/disallow rules, add crawl delays and sitemap URLs — 100% client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Configuration ──────────────────────────────── */}
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white transition-all"
                >
                  {preset.icon}
                  {preset.label}
                </button>
              ))}
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/50 hover:bg-red-900/20 border border-slate-700/50 rounded-lg text-sm text-slate-400 hover:text-red-400 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* User-Agents */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              User-Agents
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[36px] p-2 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              {userAgents.length === 0 && (
                <span className="text-slate-600 text-sm px-1 py-1">Select at least one user-agent</span>
              )}
              {userAgents.map((agent) => {
                const info = COMMON_USER_AGENTS.find((a) => a.value === agent);
                return (
                  <span
                    key={agent}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-500/20 border border-brand-500/30 rounded-full text-xs font-mono text-brand-300"
                  >
                    {info?.label || agent}
                    <button
                      onClick={() => removeUserAgent(agent)}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            {/* Dropdown to add */}
            {availableAgents.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableAgents.map((agent) => (
                  <button
                    key={agent.value}
                    onClick={() => addUserAgent(agent.value)}
                    className="px-2.5 py-1.5 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-all font-mono"
                  >
                    + {agent.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Path Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Allow / Disallow Rules
              </label>
              <button
                onClick={addRule}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-600/30 rounded-lg text-xs text-brand-400 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Rule
              </button>
            </div>

            {rules.length === 0 && (
              <div className="text-center py-8 bg-slate-800/20 rounded-lg border border-dashed border-slate-700/50">
                <p className="text-slate-500 text-sm">No rules defined. <span className="text-slate-400">Allow: /</span> is implied.</p>
                <p className="text-slate-600 text-xs mt-1">Click &ldquo;Add Rule&rdquo; to restrict crawling.</p>
              </div>
            )}

            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <select
                    value={rule.directive}
                    onChange={(e) => updateRule(rule.id, 'directive', e.target.value)}
                    className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-colors shrink-0"
                  >
                    <option value="Disallow">Disallow</option>
                    <option value="Allow">Allow</option>
                  </select>
                  <input
                    type="text"
                    value={rule.path}
                    onChange={(e) => updateRule(rule.id, 'path', e.target.value)}
                    placeholder="/path or /*.ext$"
                    className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                    title="Remove rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Crawl Delay & Sitemap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                Crawl Delay (seconds)
              </label>
              <input
                type="number"
                min="0"
                value={crawlDelay}
                onChange={(e) => setCrawlDelay(e.target.value)}
                placeholder="e.g. 10"
                className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <p className="text-xs text-slate-600 mt-1">Seconds between requests. Leave empty for none.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
                Sitemap URL
              </label>
              <input
                type="text"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <p className="text-xs text-slate-600 mt-1">Absolute URL to your XML sitemap.</p>
            </div>
          </div>
        </div>

        {/* ── Right: Preview ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Live Preview — robots.txt
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={copyText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-lg text-xs text-slate-300 hover:text-white transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={downloadFile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-600/30 rounded-lg text-xs text-brand-400 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-5 bg-slate-900/80 border border-slate-700/50 rounded-lg text-sm font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre min-h-[300px]">
              {/* Syntax highlighting */}
              {robotsTxt.split('\n').map((line, i) => {
                let highlighted = line;
                if (line.startsWith('User-agent:')) {
                  highlighted = `<span class="text-brand-400">User-agent:</span> <span class="text-slate-300">${line.slice(12)}</span>`;
                } else if (line.startsWith('Disallow:')) {
                  highlighted = `<span class="text-red-400">Disallow:</span> <span class="text-slate-400">${line.slice(10)}</span>`;
                } else if (line.startsWith('Allow:')) {
                  highlighted = `<span class="text-green-400">Allow:</span> <span class="text-slate-400">${line.slice(7)}</span>`;
                } else if (line.startsWith('Crawl-delay:')) {
                  highlighted = `<span class="text-yellow-400">Crawl-delay:</span> <span class="text-slate-400">${line.slice(13)}</span>`;
                } else if (line.startsWith('Sitemap:')) {
                  highlighted = `<span class="text-blue-400">Sitemap:</span> <span class="text-slate-400">${line.slice(9)}</span>`;
                }
                return (
                  <div key={i} dangerouslySetInnerHTML={{ __html: highlighted }} />
                );
              })}
              {robotsTxt.length === 0 && (
                <span className="text-slate-600">Start configuring your robots.txt above...</span>
              )}
            </pre>
          </div>

          {/* Line count and info */}
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>{robotsTxt.split('\n').filter(Boolean).length} lines</span>
            <span>{robotsTxt.length} characters</span>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-slate-800/30 border border-slate-700/30 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Tips</h4>
            <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
              <li>Use <code className="text-slate-400 font-mono">$</code> to match end of URL (e.g., <code className="text-slate-400 font-mono">{'/*.pdf$'}</code>)</li>
              <li><code className="text-slate-400 font-mono">*</code> matches any sequence of characters</li>
              <li>More specific rules take precedence over general ones</li>
              <li>Place robots.txt at the root of your domain</li>
              <li>Test with Google&apos;s <a href="https://search.google.com/search-console/robots-testing-tool" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Robots Testing Tool</a></li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
