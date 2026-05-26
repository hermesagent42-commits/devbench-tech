'use client';

import { useState, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  RefreshCw,
  Image,
  Globe,
  Twitter,
  Linkedin,
  MessageCircle,
  ExternalLink,
  Check,
  Info,
  Eye,
  Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Platform = 'twitter' | 'facebook' | 'linkedin' | 'discord';

interface PlatformConfig {
  name: string;
  icon: typeof Twitter;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const PLATFORMS: Record<Platform, PlatformConfig> = {
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    bgColor: '#15202b',
    textColor: '#e7e9ea',
    borderColor: '#2f3336',
  },
  facebook: {
    name: 'Facebook',
    icon: Globe,
    bgColor: '#242526',
    textColor: '#e4e6eb',
    borderColor: '#3e4042',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    bgColor: '#1d2226',
    textColor: '#c4c7cc',
    borderColor: '#38444d',
  },
  discord: {
    name: 'Discord',
    icon: MessageCircle,
    bgColor: '#2b2d31',
    textColor: '#dbdee1',
    borderColor: '#1e1f22',
  },
};

interface CardData {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  siteName: string;
  twitterHandle: string;
  twitterCard: 'summary' | 'summary_large_image';
  faviconUrl: string;
}

const DEFAULT_DATA: CardData = {
  title: 'DevBench — Free Developer Tools Online',
  description: 'A curated collection of developer tools, benchmarks, and calculators. JSON formatter, Base64 encoder, regex tester, and 100+ more — all free and private.',
  url: 'https://devbench-roan.vercel.app',
  imageUrl: 'https://devbench-roan.vercel.app/og-image.png',
  siteName: 'DevBench',
  twitterHandle: '',
  twitterCard: 'summary_large_image',
  faviconUrl: '',
};

const PRESETS: { name: string; data: Partial<CardData> }[] = [
  {
    name: 'Blog Post',
    data: {
      title: 'CSS Anchor Positioning Is Baseline — The End of JavaScript Tooltip Libraries',
      description: 'CSS Anchor Positioning just hit Baseline across all browsers. No more Floating UI, Popper, or Tippy.js — the browser now natively tethers elements with zero JavaScript.',
      url: 'https://devbench-roan.vercel.app/blog/css-anchor-positioning-guide',
      siteName: 'DevBench Blog',
      twitterCard: 'summary_large_image',
      twitterHandle: '@devbench',
    },
  },
  {
    name: 'Product Page',
    data: {
      title: 'DevBench Pro — Advanced Developer Tools for Teams',
      description: 'Unlock team workspaces, API access, custom themes, priority support, and 50+ exclusive tools. Start your 14-day free trial.',
      url: 'https://devbench-roan.vercel.app/pro',
      siteName: 'DevBench',
      twitterCard: 'summary_large_image',
      twitterHandle: '@devbench',
    },
  },
  {
    name: 'Documentation',
    data: {
      title: 'Getting Started with the DevBench CLI',
      description: 'Install, configure, and run DevBench CLI commands to manage your project benchmarks, run tests, and generate reports from the terminal.',
      url: 'https://devbench-roan.vercel.app/docs/cli',
      siteName: 'DevBench Docs',
      twitterCard: 'summary',
      twitterHandle: '',
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return url;
  }
}

function generateMetaTags(data: CardData): string {
  const tags: string[] = [];

  // Primary
  tags.push(`<meta property="og:title" content="${data.title}" />`);
  tags.push(`<meta property="og:description" content="${data.description}" />`);
  tags.push(`<meta property="og:url" content="${data.url}" />`);
  tags.push(`<meta property="og:type" content="website" />`);

  if (data.imageUrl) {
    tags.push(`<meta property="og:image" content="${data.imageUrl}" />`);
    tags.push(`<meta property="og:image:width" content="1200" />`);
    tags.push(`<meta property="og:image:height" content="630" />`);
  }
  if (data.siteName) {
    tags.push(`<meta property="og:site_name" content="${data.siteName}" />`);
  }

  // Twitter
  tags.push(`<meta name="twitter:card" content="${data.twitterCard}" />`);
  tags.push(`<meta name="twitter:title" content="${data.title}" />`);
  tags.push(`<meta name="twitter:description" content="${data.description}" />`);
  if (data.imageUrl) {
    tags.push(`<meta name="twitter:image" content="${data.imageUrl}" />`);
  }
  if (data.twitterHandle) {
    const handle = data.twitterHandle.startsWith('@')
      ? data.twitterHandle
      : `@${data.twitterHandle}`;
    tags.push(`<meta name="twitter:site" content="${handle}" />`);
    tags.push(`<meta name="twitter:creator" content="${handle}" />`);
  }

  // Discord / oEmbed
  tags.push(`<meta name="theme-color" content="#6366f1" />`);

  return tags.join('\n');
}

// ── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
      {children}
    </h3>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  hint,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  hint?: string;
  rows?: number;
}) {
  const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="mb-3">
      <label
        htmlFor={inputId}
        className="block text-xs font-medium text-slate-400 mb-1"
      >
        {label}
      </label>
      {rows ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 resize-y"
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 ${
            mono ? 'font-mono text-xs' : ''
          }`}
        />
      )}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ── Platform Preview Components ────────────────────────────────────────────

function TwitterCardPreview({ data }: { data: CardData }) {
  const hasLargeImage = data.twitterCard === 'summary_large_image' && data.imageUrl;

  return (
    <div
      style={{ backgroundColor: '#15202b', borderColor: '#2f3336' }}
      className="rounded-2xl border overflow-hidden max-w-md font-sans mx-auto"
    >
      {/* Summary large image */}
      {hasLargeImage && (
        <div className="w-full aspect-[2/1] bg-slate-700 overflow-hidden relative">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-700">
              <Image className="w-8 h-8 text-slate-500" />
            </div>
          )}
        </div>
      )}

      {/* Summary card (small image on right) */}
      {!hasLargeImage && data.twitterCard === 'summary' && (
        <div className="flex">
          <div className="flex-1 p-3">
            <p className="text-xs text-slate-500 mb-1" style={{ color: '#71767b' }}>
              {data.siteName || getDomain(data.url)}
            </p>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: '#e7e9ea' }}
            >
              {truncate(data.title, 70)}
            </p>
            <p className="text-xs" style={{ color: '#71767b' }}>
              {truncate(data.description, 100)}
            </p>
          </div>
          {data.imageUrl && (
            <div className="w-20 h-20 flex-shrink-0 m-2 rounded-lg overflow-hidden bg-slate-700">
              <img
                src={data.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Text content for large image card */}
      {hasLargeImage && (
        <div className="p-3">
          <p
            className="text-xs mb-1"
            style={{ color: '#71767b' }}
          >
            {getDomain(data.url)}
          </p>
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: '#e7e9ea' }}
          >
            {truncate(data.title, 70)}
          </p>
          <p className="text-xs" style={{ color: '#71767b' }}>
            {truncate(data.description, 120)}
          </p>
        </div>
      )}

      {/* No image fallback */}
      {!data.imageUrl && (
        <div className="p-3">
          <p
            className="text-xs mb-1"
            style={{ color: '#71767b' }}
          >
            {getDomain(data.url)}
          </p>
          <p
            className="text-sm font-semibold mb-1"
            style={{ color: '#e7e9ea' }}
          >
            {truncate(data.title, 70)}
          </p>
          <p className="text-xs" style={{ color: '#71767b' }}>
            {truncate(data.description, 120)}
          </p>
        </div>
      )}
    </div>
  );
}

function FacebookCardPreview({ data }: { data: CardData }) {
  return (
    <div
      style={{ backgroundColor: '#242526', borderColor: '#3e4042' }}
      className="rounded-lg border overflow-hidden max-w-md font-sans mx-auto"
    >
      {data.imageUrl && (
        <div className="w-full aspect-[1.91/1] bg-slate-700 overflow-hidden relative">
          <img
            src={data.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      {!data.imageUrl && (
        <div className="w-full aspect-[1.91/1] bg-slate-700 flex items-center justify-center">
          <Image className="w-8 h-8 text-slate-500" />
        </div>
      )}

      <div className="p-3 bg-[#3a3b3c]">
        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#b0b3b8' }}>
          {data.siteName || getDomain(data.url).toUpperCase()}
        </p>
        <p className="text-sm font-semibold mb-1" style={{ color: '#e4e6eb' }}>
          {truncate(data.title, 80)}
        </p>
        <p className="text-xs" style={{ color: '#b0b3b8' }}>
          {truncate(data.description, 110)}
        </p>
      </div>
    </div>
  );
}

function LinkedInCardPreview({ data }: { data: CardData }) {
  return (
    <div
      style={{ backgroundColor: '#1d2226', borderColor: '#38444d' }}
      className="rounded-lg border overflow-hidden max-w-md font-sans mx-auto"
    >
      {data.imageUrl && (
        <div className="w-full aspect-[1.91/1] bg-slate-700 overflow-hidden relative">
          <img
            src={data.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      {!data.imageUrl && (
        <div className="w-full aspect-[1.91/1] bg-slate-700 flex items-center justify-center">
          <Image className="w-8 h-8 text-slate-500" />
        </div>
      )}

      <div className="p-4">
        <p className="text-sm font-semibold mb-1" style={{ color: '#c4c7cc' }}>
          {truncate(data.title, 70)}
        </p>
        <p className="text-xs mb-2" style={{ color: '#9dabb8' }}>
          {truncate(data.url, 40)}
        </p>
        <p className="text-xs" style={{ color: '#6d7580' }}>
          {truncate(data.description, 100)}
        </p>
      </div>
    </div>
  );
}

function DiscordCardPreview({ data }: { data: CardData }) {
  const domain = getDomain(data.url);
  const base = getBaseUrl(data.url);

  return (
    <div
      style={{
        backgroundColor: '#2b2d31',
        borderColor: '#1e1f22',
        borderLeftColor: '#6366f1',
      }}
      className="rounded border-l-4 overflow-hidden max-w-sm font-sans mx-auto"
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {data.faviconUrl ? (
            <img
              src={data.faviconUrl}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-4 h-4 rounded bg-slate-600 flex items-center justify-center">
              <Globe className="w-2.5 h-2.5 text-slate-400" />
            </div>
          )}
          <span className="text-xs font-medium" style={{ color: '#00a8fc' }}>
            {data.siteName || domain}
          </span>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: '#00a8fc' }}>
          {truncate(data.title, 80)}
        </p>
        <p className="text-xs mb-2" style={{ color: '#dbdee1' }}>
          {truncate(data.description, 120)}
        </p>
        {data.imageUrl && (
          <div className="w-full aspect-[2/1] rounded-md overflow-hidden bg-slate-700 mt-2">
            <img
              src={data.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        {!data.imageUrl && (
          <div className="w-full aspect-[2/1] rounded-md bg-slate-700 flex items-center justify-center mt-2">
            <Image className="w-6 h-6 text-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SocialCardPreviewPage() {
  const [data, setData] = useState<CardData>(DEFAULT_DATA);
  const [activePlatform, setActivePlatform] = useState<Platform>('twitter');
  const [showMetaTags, setShowMetaTags] = useState(false);

  const update = (key: keyof CardData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const metaTags = useMemo(() => generateMetaTags(data), [data]);

  const handleCopyMeta = () => {
    navigator.clipboard.writeText(metaTags);
    toast.success('Meta tags copied!');
  };

  const handleReset = () => {
    setData(DEFAULT_DATA);
    toast.success('Reset to default');
  };

  const PlatformIcon = PLATFORMS[activePlatform].icon;

  return (
    <ToolLayout
      title="Social Card Preview"
      description="Preview how your meta tags render on Twitter/X, Facebook, LinkedIn, and Discord. Edit title, description, image, and more — see exactly what your users will see when they share your links."
      controls={
        <div className="flex flex-wrap items-center gap-2 w-full">
          {(Object.entries(PLATFORMS) as [Platform, PlatformConfig][]).map(
            ([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActivePlatform(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activePlatform === key
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.name}
                </button>
              );
            }
          )}

          <div className="flex-1" />

          <button
            onClick={() => setShowMetaTags(!showMetaTags)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-brand-400 border border-slate-700 hover:border-brand-500/50 transition-colors"
          >
            <Hash className="w-3.5 h-3.5" />
            {showMetaTags ? 'Hide Meta' : 'Show Meta'}
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Inputs ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <SectionHeader>
              <Info className="w-3.5 h-3.5" />
              Presets
            </SectionHeader>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() =>
                    setData((prev) => ({ ...prev, ...preset.data }))
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:border-brand-500/50 hover:text-brand-400 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Basic fields */}
          <div>
            <SectionHeader>
              <Eye className="w-3.5 h-3.5" />
              Content
            </SectionHeader>
            <InputField
              label="Title (og:title)"
              value={data.title}
              onChange={(v) => update('title', v)}
              placeholder="Your page title"
              hint={`${data.title.length} chars — recommended: 55-65`}
            />
            <InputField
              label="Description (og:description)"
              value={data.description}
              onChange={(v) => update('description', v)}
              placeholder="A compelling description of your page"
              rows={3}
              hint={`${data.description.length} chars — recommended: 150-160`}
            />
            <InputField
              label="URL (og:url)"
              value={data.url}
              onChange={(v) => update('url', v)}
              placeholder="https://example.com/page"
              mono
            />
            <InputField
              label="Image URL (og:image)"
              value={data.imageUrl}
              onChange={(v) => update('imageUrl', v)}
              placeholder="https://example.com/og-image.png"
              mono
              hint="Recommended: 1200×630px, < 5MB"
            />
            <InputField
              label="Site Name (og:site_name)"
              value={data.siteName}
              onChange={(v) => update('siteName', v)}
              placeholder="My Site"
            />
          </div>

          {/* Twitter-specific */}
          <div>
            <SectionHeader>
              <Twitter className="w-3.5 h-3.5" />
              Twitter / X
            </SectionHeader>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Card Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => update('twitterCard', 'summary_large_image')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    data.twitterCard === 'summary_large_image'
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Large Image
                </button>
                <button
                  onClick={() => update('twitterCard', 'summary')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    data.twitterCard === 'summary'
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Summary
                </button>
              </div>
            </div>
            <InputField
              label="Twitter Handle (@site)"
              value={data.twitterHandle}
              onChange={(v) => update('twitterHandle', v)}
              placeholder="@yourhandle"
            />
          </div>

          {/* Discord */}
          <div>
            <SectionHeader>
              <MessageCircle className="w-3.5 h-3.5" />
              Discord Embed
            </SectionHeader>
            <InputField
              label="Favicon URL"
              value={data.faviconUrl}
              onChange={(v) => update('faviconUrl', v)}
              placeholder="https://example.com/favicon.ico"
              mono
              hint="Shown next to site name in Discord embeds"
            />
          </div>
        </div>

        {/* ── Right: Preview ───────────────────────────────────────────── */}
        <div className="sticky top-24 space-y-6">
          {/* Platform label */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <PlatformIcon className="w-4 h-4" />
            <span>{PLATFORMS[activePlatform].name} Preview</span>
          </div>

          {/* Live platform preview */}
          {activePlatform === 'twitter' && <TwitterCardPreview data={data} />}
          {activePlatform === 'facebook' && <FacebookCardPreview data={data} />}
          {activePlatform === 'linkedin' && <LinkedInCardPreview data={data} />}
          {activePlatform === 'discord' && <DiscordCardPreview data={data} />}

          {/* Meta tag output */}
          {showMetaTags && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3 h-3" />
                  Generated Meta Tags
                </h4>
                <button
                  onClick={handleCopyMeta}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy All
                </button>
              </div>
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                {metaTags}
              </pre>
            </div>
          )}

          {/* Info panel */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              How to use these tags
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Copy the generated meta tags into your page&apos;s{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">&lt;head&gt;</code>.
              Each platform scrapes different tags:
              Twitter uses <code className="text-brand-400 bg-slate-800 px-1 rounded">twitter:*</code>,
              Facebook & LinkedIn use <code className="text-brand-400 bg-slate-800 px-1 rounded">og:*</code>,
              and Discord primarily uses Open Graph.{' '}
              <a
                href="https://www.opengraph.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:underline"
              >
                Validate with opengraph.xyz
              </a>{' '}
              or use platform-specific debuggers to test your live URLs.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
