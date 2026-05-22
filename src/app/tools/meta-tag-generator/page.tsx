'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Globe, Share2, RefreshCw, Image, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'standard' | 'og' | 'twitter' | 'all';

interface MetaField {
  key: string;
  value: string;
}

interface FormData {
  title: string;
  description: string;
  keywords: string;
  author: string;
  canonicalUrl: string;
  robots: string;
  viewport: string;
  charset: string;
  language: string;
  themeColor: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  ogSiteName: string;
  ogLocale: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterSite: string;
  twitterCreator: string;
}

const ROBOTS_OPTIONS = [
  { value: 'index, follow', label: 'Index, Follow' },
  { value: 'noindex, follow', label: 'No Index, Follow' },
  { value: 'index, nofollow', label: 'Index, No Follow' },
  { value: 'noindex, nofollow', label: 'No Index, No Follow' },
  { value: 'noarchive', label: 'No Archive' },
  { value: 'nosnippet', label: 'No Snippet' },
  { value: 'noimageindex', label: 'No Image Index' },
];

const OG_TYPES = [
  'website', 'article', 'book', 'profile',
  'music.song', 'music.album', 'music.playlist', 'music.radio_station',
  'video.movie', 'video.episode', 'video.tv_show', 'video.other',
];

const TWITTER_CARDS = ['summary', 'summary_large_image', 'app', 'player'];

const DEFAULT_FORM: FormData = {
  title: '', description: '', keywords: '', author: '', canonicalUrl: '',
  robots: 'index, follow', viewport: 'width=device-width, initial-scale=1.0',
  charset: 'UTF-8', language: 'en', themeColor: '#0ea5e9',
  ogTitle: '', ogDescription: '', ogImage: '', ogUrl: '', ogType: 'website',
  ogSiteName: '', ogLocale: 'en_US',
  twitterCard: 'summary_large_image', twitterTitle: '', twitterDescription: '',
  twitterImage: '', twitterSite: '', twitterCreator: '',
};

export default function MetaTagGeneratorPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [outputFormat, setOutputFormat] = useState<'html' | 'jsx'>('html');

  const update = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    toast.success('Form reset');
  }, []);

  const fillDemo = useCallback(() => {
    setForm({
      title: 'My Awesome Web App',
      description: 'A modern web application built with the latest technologies. Fast, responsive, and beautiful.',
      keywords: 'web app, modern, responsive, fast, developer tools',
      author: 'Jane Developer',
      canonicalUrl: 'https://example.com',
      robots: 'index, follow',
      viewport: 'width=device-width, initial-scale=1.0',
      charset: 'UTF-8',
      language: 'en',
      themeColor: '#6366f1',
      ogTitle: 'My Awesome Web App — Modern Developer Tools',
      ogDescription: 'A modern web application built with the latest technologies. Fast, responsive, and beautiful.',
      ogImage: 'https://example.com/og-image.png',
      ogUrl: 'https://example.com',
      ogType: 'website',
      ogSiteName: 'My Awesome Web App',
      ogLocale: 'en_US',
      twitterCard: 'summary_large_image',
      twitterTitle: 'My Awesome Web App',
      twitterDescription: 'A modern web application built with the latest technologies.',
      twitterImage: 'https://example.com/twitter-card.png',
      twitterSite: '@myawesomeapp',
      twitterCreator: '@janedeveloper',
    });
    toast.success('Demo data loaded');
  }, []);

  const allTags = useMemo<MetaField[]>(() => {
    const tags: MetaField[] = [];
    if (form.charset) tags.push({ key: '<meta charset>', value: '<meta charset="' + e(form.charset) + '">' });
    if (form.viewport) tags.push({ key: 'viewport', value: '<meta name="viewport" content="' + e(form.viewport) + '">' });
    if (form.title) tags.push({ key: '<title>', value: '<title>' + e(form.title) + '</title>' });
    if (form.description) tags.push({ key: 'description', value: '<meta name="description" content="' + e(form.description) + '">' });
    if (form.keywords) tags.push({ key: 'keywords', value: '<meta name="keywords" content="' + e(form.keywords) + '">' });
    if (form.author) tags.push({ key: 'author', value: '<meta name="author" content="' + e(form.author) + '">' });
    if (form.canonicalUrl) tags.push({ key: 'canonical', value: '<link rel="canonical" href="' + e(form.canonicalUrl) + '">' });
    if (form.robots) tags.push({ key: 'robots', value: '<meta name="robots" content="' + e(form.robots) + '">' });
    tags.push({ key: 'language', value: '<meta http-equiv="Content-Language" content="' + e(form.language) + '">' });
    if (form.themeColor) tags.push({ key: 'theme-color', value: '<meta name="theme-color" content="' + e(form.themeColor) + '">' });

    if (form.ogTitle || form.title) tags.push({ key: 'og:title', value: '<meta property="og:title" content="' + e(form.ogTitle || form.title) + '">' });
    if (form.ogDescription || form.description) tags.push({ key: 'og:description', value: '<meta property="og:description" content="' + e(form.ogDescription || form.description) + '">' });
    if (form.ogImage) tags.push({ key: 'og:image', value: '<meta property="og:image" content="' + e(form.ogImage) + '">' });
    if (form.ogUrl || form.canonicalUrl) tags.push({ key: 'og:url', value: '<meta property="og:url" content="' + e(form.ogUrl || form.canonicalUrl) + '">' });
    if (form.ogType) tags.push({ key: 'og:type', value: '<meta property="og:type" content="' + e(form.ogType) + '">' });
    if (form.ogSiteName || form.title) tags.push({ key: 'og:site_name', value: '<meta property="og:site_name" content="' + e(form.ogSiteName || form.title) + '">' });
    if (form.ogLocale) tags.push({ key: 'og:locale', value: '<meta property="og:locale" content="' + e(form.ogLocale) + '">' });

    if (form.twitterCard) tags.push({ key: 'twitter:card', value: '<meta name="twitter:card" content="' + e(form.twitterCard) + '">' });
    if (form.twitterTitle || form.ogTitle || form.title) tags.push({ key: 'twitter:title', value: '<meta name="twitter:title" content="' + e(form.twitterTitle || form.ogTitle || form.title) + '">' });
    if (form.twitterDescription || form.ogDescription || form.description) tags.push({ key: 'twitter:description', value: '<meta name="twitter:description" content="' + e(form.twitterDescription || form.ogDescription || form.description) + '">' });
    if (form.twitterImage || form.ogImage) tags.push({ key: 'twitter:image', value: '<meta name="twitter:image" content="' + e(form.twitterImage || form.ogImage) + '">' });
    if (form.twitterSite) tags.push({ key: 'twitter:site', value: '<meta name="twitter:site" content="' + e(form.twitterSite) + '">' });
    if (form.twitterCreator) tags.push({ key: 'twitter:creator', value: '<meta name="twitter:creator" content="' + e(form.twitterCreator) + '">' });

    return tags;
  }, [form]);

  const filteredTags = useMemo(() => {
    if (tab === 'all') return allTags;
    if (tab === 'og') return allTags.filter((t) => t.key.startsWith('og:'));
    if (tab === 'twitter') return allTags.filter((t) => t.key.startsWith('twitter:'));
    return allTags.filter((t) => !t.key.startsWith('og:') && !t.key.startsWith('twitter:'));
  }, [allTags, tab]);

  const tagCounts = useMemo(() => ({
    all: allTags.length,
    standard: allTags.filter((t) => !t.key.startsWith('og:') && !t.key.startsWith('twitter:')).length,
    og: allTags.filter((t) => t.key.startsWith('og:')).length,
    twitter: allTags.filter((t) => t.key.startsWith('twitter:')).length,
  }), [allTags]);

  const outputHtml = useMemo(() => {
    const lines = allTags.map((t) => t.value);
    if (outputFormat === 'jsx') {
      return lines.map((line) => line.replace(/<meta /g, '<meta ').replace(/>$/, ' />').replace(/<link /g, '<link ')).join('\n');
    }
    return lines.join('\n');
  }, [allTags, outputFormat]);

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(outputHtml).then(
      () => toast.success('Meta tags copied!'),
      () => toast.error('Failed to copy')
    );
  }, [outputHtml]);

  const previewTitle = form.ogTitle || form.title || 'Page Title';
  const previewDesc = form.ogDescription || form.description || 'Page description will appear here...';
  const previewUrl = form.canonicalUrl || 'example.com';
  const isLargeCard = form.twitterCard === 'summary_large_image';

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono text-sm transition-colors";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <ToolLayout
      title="Meta Tag Generator"
      description="Generate complete HTML meta tags for SEO, Open Graph, and Twitter Cards. Fill in the form and get production-ready code — 100% client-side."
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={fillDemo} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" />
          Load Demo Data
        </button>
        <button onClick={reset} className="btn-secondary flex items-center gap-1.5 text-sm text-slate-400">
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* LEFT: FORM */}
        <div className="space-y-6">
          {/* Standard Meta */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white mb-4">
              <Globe className="w-5 h-5 text-brand-400" />
              Standard Meta Tags
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Page Title</label>
                <input className={inputClass} placeholder="My Website" value={form.title} onChange={(e) => update('title', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Meta Description</label>
                <textarea className={inputClass + " resize-none h-20"} placeholder="A brief description of your page (150-160 chars recommended)" value={form.description} onChange={(e) => update('description', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Keywords (comma-separated)</label>
                <input className={inputClass} placeholder="keyword1, keyword2, keyword3" value={form.keywords} onChange={(e) => update('keywords', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Author</label>
                <input className={inputClass} placeholder="Your Name" value={form.author} onChange={(e) => update('author', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Canonical URL</label>
                <input className={inputClass} placeholder="https://example.com/page" value={form.canonicalUrl} onChange={(e) => update('canonicalUrl', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Robots</label>
                  <select className={inputClass} value={form.robots} onChange={(e) => update('robots', e.target.value)}>
                    {ROBOTS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Language</label>
                  <input className={inputClass} placeholder="en" value={form.language} onChange={(e) => update('language', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Theme Color</label>
                <div className="flex gap-3 items-center">
                  <input type="color" value={form.themeColor} onChange={(e) => update('themeColor', e.target.value)} className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-surface" />
                  <input className={inputClass + " flex-1"} placeholder="#0ea5e9" value={form.themeColor} onChange={(e) => update('themeColor', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Charset</label>
                  <input className={inputClass} placeholder="UTF-8" value={form.charset} onChange={(e) => update('charset', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Viewport</label>
                  <input className={inputClass} placeholder="width=device-width, initial-scale=1.0" value={form.viewport} onChange={(e) => update('viewport', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Open Graph */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white mb-4">
              <Share2 className="w-5 h-5 text-blue-400" />
              Open Graph (Facebook, LinkedIn, Discord)
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>OG Title</label>
                <input className={inputClass} placeholder="Same as page title" value={form.ogTitle} onChange={(e) => update('ogTitle', e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Falls back to page title if empty.</p>
              </div>
              <div>
                <label className={labelClass}>OG Description</label>
                <textarea className={inputClass + " resize-none h-16"} placeholder="Social media description" value={form.ogDescription} onChange={(e) => update('ogDescription', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>OG Image URL</label>
                <input className={inputClass} placeholder="https://example.com/og-image.png (1200x630 recommended)" value={form.ogImage} onChange={(e) => update('ogImage', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>OG Type</label>
                  <select className={inputClass} value={form.ogType} onChange={(e) => update('ogType', e.target.value)}>
                    {OG_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>OG Locale</label>
                  <input className={inputClass} placeholder="en_US" value={form.ogLocale} onChange={(e) => update('ogLocale', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Site Name</label>
                <input className={inputClass} placeholder="My Website" value={form.ogSiteName} onChange={(e) => update('ogSiteName', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Twitter Card */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white mb-4">
              <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Twitter / X Card
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Card Type</label>
                <div className="flex gap-2">
                  {TWITTER_CARDS.map((card) => (
                    <button
                      key={card}
                      onClick={() => update('twitterCard', card)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.twitterCard === card
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      {card.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Twitter Title</label>
                <input className={inputClass} placeholder="Falls back to OG title" value={form.twitterTitle} onChange={(e) => update('twitterTitle', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Twitter Description</label>
                <textarea className={inputClass + " resize-none h-16"} placeholder="Falls back to OG description" value={form.twitterDescription} onChange={(e) => update('twitterDescription', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Twitter Image</label>
                <input className={inputClass} placeholder="Falls back to OG image" value={form.twitterImage} onChange={(e) => update('twitterImage', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Site @handle</label>
                  <input className={inputClass} placeholder="@myapp" value={form.twitterSite} onChange={(e) => update('twitterSite', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Creator @handle</label>
                  <input className={inputClass} placeholder="@username" value={form.twitterCreator} onChange={(e) => update('twitterCreator', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW + OUTPUT */}
        <div className="space-y-6">
          {/* Social Preview */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white mb-4">
              <Image className="w-5 h-5 text-brand-400" />
              Social Preview
            </h3>
            <p className="text-xs text-slate-500 mb-4">How your link will look when shared</p>

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Twitter / X</p>
              <div className={`border border-slate-700 rounded-xl overflow-hidden bg-slate-900 ${isLargeCard ? '' : 'flex'}`}>
                {isLargeCard && form.ogImage && (
                  <div className="h-40 bg-slate-800 flex items-center justify-center">
                    <Image className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <div className={`p-3 ${isLargeCard ? '' : 'flex-1'}`}>
                  <p className="text-xs text-slate-500 font-mono">{previewUrl}</p>
                  <p className="text-sm font-semibold text-white mt-0.5 line-clamp-1">{previewTitle}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{previewDesc}</p>
                </div>
                {!isLargeCard && form.ogImage && (
                  <div className="w-24 bg-slate-800 flex items-center justify-center shrink-0">
                    <Image className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Facebook / LinkedIn</p>
              <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900">
                {form.ogImage && (
                  <div className="h-36 bg-slate-800 flex items-center justify-center">
                    <Image className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs text-slate-500 uppercase font-mono">{previewUrl}</p>
                  <p className="text-sm font-semibold text-white mt-0.5 line-clamp-2">{previewTitle}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{previewDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                <FileCode className="w-5 h-5 text-brand-400" />
                Generated Tags
              </h3>
              <div className="flex gap-1 p-0.5 rounded-lg bg-surface-lighter">
                <button
                  onClick={() => setOutputFormat('html')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    outputFormat === 'html' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >HTML</button>
                <button
                  onClick={() => setOutputFormat('jsx')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    outputFormat === 'jsx' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >JSX</button>
              </div>
            </div>

            {/* Tab filters */}
            <div className="flex gap-2 mb-4">
              {(['all', 'standard', 'og', 'twitter'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tab === t
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-surface-lighter text-slate-400 border border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'standard' ? 'Standard' : t === 'og' ? 'Open Graph' : 'Twitter'}
                  <span className="ml-1.5 opacity-60">({tagCounts[t]})</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-950 rounded-lg border border-slate-700/50 p-4 max-h-[500px] overflow-y-auto">
              {filteredTags.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Fill in the form to generate meta tags.</p>
              ) : (
                <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {filteredTags.map((tag, i) => (
                    <div key={i} className="group flex items-start gap-3 py-1 hover:bg-slate-800/30 px-1 rounded">
                      <span className="text-xs text-slate-600 mt-0.5 w-5 shrink-0 text-right">{i + 1}</span>
                      <code className="text-slate-300 flex-1">{tag.value}</code>
                    </div>
                  ))}
                </pre>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={copyOutput} className="btn-primary flex items-center gap-1.5 text-sm">
                <Copy className="w-4 h-4" />
                Copy All Tags
              </button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

function e(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
