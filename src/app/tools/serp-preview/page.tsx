'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Globe, Search, Monitor, ExternalLink, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
// Search engine configs — title/description max pixel widths
// are approximate but widely accepted best-practice limits.
// ============================================================

interface SearchEngine {
  id: 'google' | 'bing' | 'duckduckgo';
  name: string;
  color: string;
  // character limits before truncation (approximate)
  titleMaxChars: number;
  descMaxChars: number;
  // favicon shown?
  showFavicon: boolean;
  // site name shown?
  showSiteName: boolean;
  // URL breadcrumb?
  showBreadcrumb: boolean;
}

const ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    color: '#4285F4',
    titleMaxChars: 60,
    descMaxChars: 155,
    showFavicon: true,
    showSiteName: true,
    showBreadcrumb: true,
  },
  {
    id: 'bing',
    name: 'Bing',
    color: '#00809D',
    titleMaxChars: 65,
    descMaxChars: 160,
    showFavicon: false,
    showSiteName: false,
    showBreadcrumb: false,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    color: '#DE5833',
    titleMaxChars: 65,
    descMaxChars: 155,
    showFavicon: true,
    showSiteName: false,
    showBreadcrumb: true,
  },
];

// ============================================================
// Default preview data — realistic sample
// ============================================================
const DEFAULTS = {
  title: 'DevBench — Free Developer Tools, Calculators & Benchmarks',
  url: 'https://devbench-roan.vercel.app',
  description:
    'DevBench is a collection of free online developer tools — JSON formatter, Base64 encoder, regex tester, CSS playgrounds, benchmarks, and more. No sign-up. No ads.',
  siteName: 'DevBench',
  faviconUrl: '/favicon.ico',
};

function truncateText(text: string, maxChars: number): { display: string; truncated: boolean } {
  if (text.length <= maxChars) return { display: text, truncated: false };
  return {
    display: text.slice(0, maxChars - 3) + '…',
    truncated: true,
  };
}

function extractDisplayUrl(url: string): { displayUrl: string; breadcrumbs: string[] } {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = u.hostname.replace(/^www\./, '');
    const parts = u.pathname.split('/').filter(Boolean);
    const breadcrumbs = [hostname, ...parts.map((p) => p.replace(/-/g, ' '))];

    // display URL: hostname › path segments
    const displayUrl = breadcrumbs.join(' › ');
    return { displayUrl, breadcrumbs };
  } catch {
    return { displayUrl: url, breadcrumbs: [url] };
  }
}

// ============================================================
// Google SERP Card Component
// ============================================================
function GooglePreview(props: {
  title: string;
  url: string;
  description: string;
  siteName: string;
  faviconUrl: string;
}) {
  const titleResult = truncateText(props.title, 60);
  const descResult = truncateText(props.description, 155);
  const { displayUrl, breadcrumbs } = extractDisplayUrl(props.url);

  return (
    <div
      className="bg-white rounded-lg p-4 border border-slate-200 max-w-[600px] font-sans"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* URL line with favicon + site name */}
      <div className="flex items-center gap-1.5 mb-1">
        {props.faviconUrl && (
          <img
            src={props.faviconUrl}
            alt=""
            className="w-4 h-4 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <span className="text-xs text-[#202124] leading-none">{props.siteName}</span>
        <span className="text-xs text-[#5f6368] mx-0.5">›</span>
        <span className="text-xs text-[#202124] leading-none">{displayUrl.split(' › ').slice(1).join(' › ')}</span>
        <span className="text-[10px] text-[#5f6368] ml-1 cursor-pointer">▼</span>
      </div>

      {/* Title link */}
      <a
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xl leading-[1.3] text-[#1a0dab] hover:underline cursor-pointer mb-0.5"
      >
        {titleResult.display}
      </a>

      {/* Description */}
      <p className="text-sm leading-[1.58] text-[#4d5156] -mt-0.5">
        {descResult.display}
      </p>

      {/* Truncation warnings */}
      {(titleResult.truncated || descResult.truncated) && (
        <div className="mt-1.5 flex gap-2">
          {titleResult.truncated && (
            <span className="text-[10px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded">
              Title truncated ({props.title.length}/60)
            </span>
          )}
          {descResult.truncated && (
            <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
              Description truncated ({props.description.length}/155)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Bing SERP Card Component
// ============================================================
function BingPreview(props: {
  title: string;
  url: string;
  description: string;
}) {
  const titleResult = truncateText(props.title, 65);
  const descResult = truncateText(props.description, 160);
  const { displayUrl } = extractDisplayUrl(props.url);

  return (
    <div className="bg-white rounded-lg p-4 max-w-[600px]" style={{ fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      {/* URL */}
      <cite className="not-italic text-sm text-[#006d21] block mb-0.5 leading-[1.3]">
        {props.url}
      </cite>

      {/* Title */}
      <a
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-xl leading-[1.3] text-[#4007a2] hover:underline cursor-pointer mb-1"
      >
        {titleResult.display}
      </a>

      {/* Description */}
      <p className="text-sm leading-[1.4] text-[#444]">
        {descResult.display}
      </p>

      {(titleResult.truncated || descResult.truncated) && (
        <div className="mt-1.5 flex gap-2">
          {titleResult.truncated && (
            <span className="text-[10px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded">
              Title truncated ({props.title.length}/65)
            </span>
          )}
          {descResult.truncated && (
            <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
              Description truncated ({props.description.length}/160)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DuckDuckGo SERP Card Component
// ============================================================
function DuckDuckGoPreview(props: {
  title: string;
  url: string;
  description: string;
  faviconUrl: string;
}) {
  const titleResult = truncateText(props.title, 65);
  const descResult = truncateText(props.description, 155);
  const { displayUrl } = extractDisplayUrl(props.url);

  return (
    <div className="bg-[#1e1e1e] rounded-lg p-4 max-w-[600px]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* URL + favicon */}
      <div className="flex items-center gap-1.5 mb-0.5">
        {props.faviconUrl && (
          <img
            src={props.faviconUrl}
            alt=""
            className="w-4 h-4 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <span className="text-xs text-[#989898]">{displayUrl}</span>
      </div>

      {/* Title */}
      <a
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-lg leading-[1.3] text-[#729fcf] hover:underline cursor-pointer mb-1"
      >
        {titleResult.display}
      </a>

      {/* Description */}
      <p className="text-sm leading-[1.4] text-[#c4c4c4]">
        {descResult.display}
      </p>

      {(titleResult.truncated || descResult.truncated) && (
        <div className="mt-1.5 flex gap-2">
          {titleResult.truncated && (
            <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
              Title truncated ({props.title.length}/65)
            </span>
          )}
          {descResult.truncated && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Description truncated ({props.description.length}/155)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SEO scoring
// ============================================================
interface SeoScore {
  label: string;
  score: 'good' | 'warn' | 'bad';
  message: string;
}

function computeScores(title: string, description: string): SeoScore[] {
  const scores: SeoScore[] = [];

  // Title length
  if (title.length < 30) {
    scores.push({ label: 'Title Too Short', score: 'warn', message: `${title.length} chars — aim for 50–60 chars. Short titles waste SERP real estate.` });
  } else if (title.length > 60) {
    scores.push({ label: 'Title Too Long', score: 'bad', message: `${title.length} chars — Google truncates at ~60 chars. Front-load keywords.` });
  } else if (title.length >= 50) {
    scores.push({ label: 'Title Length', score: 'good', message: `${title.length} chars — perfect. Using full SERP width.` });
  } else {
    scores.push({ label: 'Title Length', score: 'good', message: `${title.length} chars — decent. Could go a bit longer for keyword coverage.` });
  }

  // Description length
  if (description.length < 100) {
    scores.push({ label: 'Description Too Short', score: 'warn', message: `${description.length} chars — aim for 120–155 chars for a compelling snippet.` });
  } else if (description.length > 160) {
    scores.push({ label: 'Description Too Long', score: 'bad', message: `${description.length} chars — Google truncates at ~155–160 chars.` });
  } else if (description.length >= 120) {
    scores.push({ label: 'Description Length', score: 'good', message: `${description.length} chars — great. Fills the SERP snippet fully.` });
  } else {
    scores.push({ label: 'Description Length', score: 'good', message: `${description.length} chars — decent. Aim for 155 for full snippet.` });
  }

  // Title has keywords?
  if (!/[A-Z]/.test(title)) {
    scores.push({ label: 'No Capital Letters', score: 'warn', message: 'Title is all lowercase. Use Title Case for readability and CTR.' });
  }

  // Description readability
  const sentences = description.split(/[.!?]+/).filter(Boolean);
  if (sentences.length < 2) {
    scores.push({ label: 'Single Sentence', score: 'warn', message: 'Description has only 1 sentence. Use 2–3 sentences with a call-to-action.' });
  }

  // Title uniqueness warning
  if (title.length <= 20) {
    scores.push({ label: 'Generic Title', score: 'warn', message: 'Very short title may not stand out in SERPs. Include your value proposition or brand.' });
  }

  return scores;
}

// ============================================================
// Main Page Component
// ============================================================
export default function SerpPreviewPage() {
  const [title, setTitle] = useState(DEFAULTS.title);
  const [url, setUrl] = useState(DEFAULTS.url);
  const [description, setDescription] = useState(DEFAULTS.description);
  const [siteName, setSiteName] = useState(DEFAULTS.siteName);
  const [faviconUrl, setFaviconUrl] = useState(DEFAULTS.faviconUrl);
  const [activeEngine, setActiveEngine] = useState<SearchEngine['id']>('google');

  const scores = useMemo(() => computeScores(title, description), [title, description]);

  const reset = useCallback(() => {
    setTitle(DEFAULTS.title);
    setUrl(DEFAULTS.url);
    setDescription(DEFAULTS.description);
    setSiteName(DEFAULTS.siteName);
    setFaviconUrl(DEFAULTS.faviconUrl);
    toast.success('Reset to defaults');
  }, []);

  const copyAll = useCallback(() => {
    const text = [
      `=== SERP Preview ===`,
      ``,
      `Title:        ${title}`,
      `URL:          ${url}`,
      `Description:  ${description}`,
      `Site Name:    ${siteName}`,
      ``,
      `Character Counts:`,
      `  Title:       ${title.length} chars (Google max ~60)`,
      `  Description: ${description.length} chars (max ~155)`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('SERP data copied!'),
      () => toast.error('Failed to copy')
    );
  }, [title, url, description, siteName]);

  const engine = ENGINES.find((e) => e.id === activeEngine)!;

  return (
    <ToolLayout
      title="SERP Preview"
      description="Preview how your page title, meta description, and URL appear in Google, Bing, and DuckDuckGo search results. Perfect for SEO optimization — 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={reset} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button onClick={copyAll} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy Data
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Input Form */}
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-400" />
              Page Metadata
            </h2>

            {/* URL */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Page URL <span className="text-slate-500">(including https://)</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="input-field w-full text-sm py-2 font-mono"
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Meta Title / {'<title>'}
                <span className={`ml-2 text-xs ${
                  title.length > 60 ? 'text-red-400' : title.length >= 50 ? 'text-green-400' : 'text-amber-400'
                }`}>
                  ({title.length}/60)
                </span>
              </label>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title for search results"
                rows={3}
                spellCheck={false}
                className="input-field w-full text-sm font-mono resize-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Meta Description
                <span className={`ml-2 text-xs ${
                  description.length > 155 ? 'text-red-400' : description.length >= 120 ? 'text-green-400' : 'text-amber-400'
                }`}>
                  ({description.length}/155)
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Meta description for search snippets"
                rows={4}
                spellCheck={false}
                className="input-field w-full text-sm font-mono resize-none"
              />
            </div>

            {/* Site Name + Favicon (Google-specific) */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Site Name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Your Site"
                  className="input-field w-full text-sm py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Favicon URL</label>
                <input
                  type="text"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="/favicon.ico"
                  className="input-field w-full text-sm py-2 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SEO Score Card */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-brand-400" />
              SEO Checklist
            </h2>
            <div className="space-y-1.5">
              {scores.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 ${
                    s.score === 'good'
                      ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                      : s.score === 'warn'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'bg-red-500/10 text-red-300 border border-red-500/20'
                  }`}
                >
                  <span className="mt-0.5 flex-shrink-0">
                    {s.score === 'good' ? '✅' : s.score === 'warn' ? '⚠️' : '❌'}
                  </span>
                  <span>{s.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Previews */}
        <div className="space-y-6">
          {/* Engine Selector */}
          <div className="flex gap-2">
            {ENGINES.map((e) => (
              <button
                key={e.id}
                onClick={() => setActiveEngine(e.id)}
                className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-all ${
                  activeEngine === e.id
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                    : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: e.color }}
                  />
                  {e.name}
                </div>
              </button>
            ))}
          </div>

          {/* Preview Cards */}
          <div className="space-y-4">
            {/* Google Preview (default shown, others conditional) */}
            {(activeEngine === 'google' || true) && (
              <div className={activeEngine !== 'google' ? 'hidden' : ''}>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4285F4' }} />
                  <span className="text-xs text-slate-400 font-medium">Google</span>
                </div>
                <div className="bg-[#f8f9fa] p-6 rounded-xl border border-slate-200/50 shadow-sm">
                  <GooglePreview
                    title={title}
                    url={url}
                    description={description}
                    siteName={siteName}
                    faviconUrl={faviconUrl}
                  />
                </div>
              </div>
            )}

            {/* Bing Preview */}
            {(activeEngine === 'bing' || true) && (
              <div className={activeEngine !== 'bing' ? 'hidden' : ''}>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00809D' }} />
                  <span className="text-xs text-slate-400 font-medium">Bing</span>
                </div>
                <div className="bg-[#f8f9fa] p-6 rounded-xl border border-slate-200/50 shadow-sm">
                  <BingPreview
                    title={title}
                    url={url}
                    description={description}
                  />
                </div>
              </div>
            )}

            {/* DuckDuckGo Preview */}
            {(activeEngine === 'duckduckgo' || true) && (
              <div className={activeEngine !== 'duckduckgo' ? 'hidden' : ''}>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#DE5833' }} />
                  <span className="text-xs text-slate-400 font-medium">DuckDuckGo</span>
                </div>
                <DuckDuckGoPreview
                  title={title}
                  url={url}
                  description={description}
                  faviconUrl={faviconUrl}
                />
              </div>
            )}
          </div>

          {/* Tip card */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-400" />
              SEO Best Practices
            </h2>
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>• <strong className="text-slate-300">Title:</strong> 50–60 chars. Place primary keyword near the beginning. End with brand name.</li>
              <li>• <strong className="text-slate-300">Description:</strong> 120–155 chars. Write 2–3 compelling sentences with a clear call-to-action.</li>
              <li>• <strong className="text-slate-300">URL:</strong> Short, readable, with keywords. Avoid parameters and session IDs.</li>
              <li>• <strong className="text-slate-300">Google</strong> shows site name + favicon + breadcrumb for branded sites.</li>
              <li>• <strong className="text-slate-300">Bing</strong> shows full URL in green above the title.</li>
              <li>• <strong className="text-slate-300">DuckDuckGo</strong> uses a dark theme with favicon + URL line.</li>
              <li>• All processing happens in your browser — no data sent anywhere.</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
