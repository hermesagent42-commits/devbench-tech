'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Trash2, Plus, Globe, FileText, ShoppingCart, BookOpen, GripVertical, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface URLEntry {
  id: string;
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

interface Preset {
  label: string;
  icon: React.ReactNode;
  entries: Omit<URLEntry, 'id'>[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHANGEFREQ_OPTIONS = [
  { value: '', label: '(none)' },
  { value: 'always', label: 'always' },
  { value: 'hourly', label: 'hourly' },
  { value: 'daily', label: 'daily' },
  { value: 'weekly', label: 'weekly' },
  { value: 'monthly', label: 'monthly' },
  { value: 'yearly', label: 'yearly' },
  { value: 'never', label: 'never' },
];

const PRESETS: Preset[] = [
  {
    label: 'Blog',
    icon: <FileText className="w-4 h-4" />,
    entries: [
      { loc: 'https://example.com/', lastmod: '2026-05-22', changefreq: 'daily', priority: 1.0 },
      { loc: 'https://example.com/blog', lastmod: '2026-05-22', changefreq: 'daily', priority: 0.9 },
      { loc: 'https://example.com/about', lastmod: '2026-05-01', changefreq: 'monthly', priority: 0.7 },
      { loc: 'https://example.com/contact', lastmod: '2026-05-01', changefreq: 'monthly', priority: 0.6 },
    ],
  },
  {
    label: 'E-Commerce',
    icon: <ShoppingCart className="w-4 h-4" />,
    entries: [
      { loc: 'https://example.com/', lastmod: '2026-05-22', changefreq: 'daily', priority: 1.0 },
      { loc: 'https://example.com/products', lastmod: '2026-05-22', changefreq: 'daily', priority: 0.9 },
      { loc: 'https://example.com/categories', lastmod: '2026-05-21', changefreq: 'weekly', priority: 0.8 },
      { loc: 'https://example.com/about', lastmod: '2026-05-01', changefreq: 'monthly', priority: 0.5 },
      { loc: 'https://example.com/contact', lastmod: '2026-05-01', changefreq: 'monthly', priority: 0.5 },
    ],
  },
  {
    label: 'Docs Site',
    icon: <BookOpen className="w-4 h-4" />,
    entries: [
      { loc: 'https://example.com/', lastmod: '2026-05-22', changefreq: 'weekly', priority: 1.0 },
      { loc: 'https://example.com/docs', lastmod: '2026-05-22', changefreq: 'weekly', priority: 0.9 },
      { loc: 'https://example.com/docs/getting-started', lastmod: '2026-05-20', changefreq: 'monthly', priority: 0.8 },
      { loc: 'https://example.com/docs/api-reference', lastmod: '2026-05-18', changefreq: 'monthly', priority: 0.8 },
    ],
  },
];

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `entry-${idCounter}`;
}

// ── XML helpers ────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function generateSitemap(entries: URLEntry[]): string {
  const filtered = entries.filter((e) => e.loc.trim() !== '');
  if (filtered.length === 0) return '';
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const entry of filtered) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(entry.loc.trim())}</loc>`);
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
}

// ── Initial demo entries ───────────────────────────────────────────────────

const INITIAL_ENTRIES: URLEntry[] = [
  { id: nextId(), loc: 'https://example.com/', lastmod: '2026-05-22', changefreq: 'daily', priority: 1.0 },
  { id: nextId(), loc: 'https://example.com/about', lastmod: '2026-05-15', changefreq: 'monthly', priority: 0.7 },
  { id: nextId(), loc: 'https://example.com/contact', lastmod: '2026-05-15', changefreq: 'monthly', priority: 0.6 },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function SitemapGeneratorPage() {
  const [entries, setEntries] = useState<URLEntry[]>(INITIAL_ENTRIES);
  const [batchInput, setBatchInput] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const xml = useMemo(() => generateSitemap(entries), [entries]);

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, { id: nextId(), loc: '', lastmod: '', changefreq: '', priority: 0.5 }]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEntry = useCallback((id: string, field: keyof URLEntry, value: string | number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return { ...e, [field]: value };
      }),
    );
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    const withIds: URLEntry[] = preset.entries.map((e) => ({ ...e, id: nextId() }));
    setEntries(withIds);
  }, []);

  const handleBatchAdd = useCallback(() => {
    const lines = batchInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) {
      toast.error('Enter at least one URL');
      return;
    }
    const newEntries: URLEntry[] = lines.map((loc) => ({
      id: nextId(),
      loc,
      lastmod: '',
      changefreq: '',
      priority: 0.5,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    setBatchInput('');
    toast.success(`Added ${lines.length} URL${lines.length > 1 ? 's' : ''}`);
  }, [batchInput]);

  const copyXml = useCallback(() => {
    if (!xml) {
      toast.error('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(xml).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Copy failed'),
    );
  }, [xml]);

  const downloadXml = useCallback(() => {
    if (!xml) {
      toast.error('Nothing to download');
      return;
    }
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded sitemap.xml');
  }, [xml]);

  // Drag & drop reorder
  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      setDragOverIdx(idx);
    },
    [],
  );

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) {
        setDragIdx(null);
        setDragOverIdx(null);
        return;
      }
      setEntries((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        return next;
      });
      setDragIdx(null);
      setDragOverIdx(null);
    },
    [dragIdx],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const entryCount = entries.filter((e) => e.loc.trim()).length;

  return (
    <ToolLayout
      title="Sitemap Generator"
      description="Build XML sitemaps for search engines. Add URLs, set priority and change frequency, and export as sitemap.xml — 100% client-side."
    >
      {/* ── Presets ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Quick Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-surface-light border border-slate-600 hover:border-brand-400 hover:text-brand-300 text-slate-300 transition-colors"
            >
              {preset.icon}
              {preset.label}
            </button>
          ))}
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* ── Batch Add ────────────────────────────────────────────── */}
      <div className="mb-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Batch Add URLs</p>
        <div className="flex gap-2">
          <textarea
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="https://example.com/page-1&#10;https://example.com/page-2&#10;https://example.com/page-3"
            rows={3}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-400 font-mono resize-none"
          />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleBatchAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add URLs
          </button>
          <span className="text-xs text-slate-500">Paste one URL per line — all get default priority (0.5)</span>
        </div>
      </div>

      {/* ── URL Entries ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            URLs <span className="text-slate-500">({entryCount} active)</span>
          </p>
          <button
            onClick={addEntry}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add URL
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
            No URLs added yet. Use presets, batch add, or click &quot;Add URL&quot; to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`flex flex-wrap items-start gap-2 p-3 rounded-lg border transition-colors ${
                  dragOverIdx === idx
                    ? 'border-brand-400 bg-brand-500/10'
                    : 'border-slate-700/50 bg-surface-light'
                } ${dragIdx === idx ? 'opacity-50' : ''}`}
              >
                {/* Drag handle */}
                <div className="flex items-center pt-1.5 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* URL */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">URL *</label>
                  <input
                    type="text"
                    value={entry.loc}
                    onChange={(e) => updateEntry(entry.id, 'loc', e.target.value)}
                    placeholder="https://example.com/page"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-400 font-mono"
                  />
                </div>

                {/* Last Modified */}
                <div className="w-[150px]">
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">Last Modified</label>
                  <input
                    type="date"
                    value={entry.lastmod}
                    onChange={(e) => updateEntry(entry.id, 'lastmod', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-400 scheme-dark"
                  />
                </div>

                {/* Change Frequency */}
                <div className="w-[130px]">
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">Change Freq</label>
                  <select
                    value={entry.changefreq}
                    onChange={(e) => updateEntry(entry.id, 'changefreq', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-400"
                  >
                    {CHANGEFREQ_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="w-[110px]">
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">
                    Priority <span className="text-slate-400">({entry.priority.toFixed(1)})</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={Math.round(entry.priority * 10)}
                    onChange={(e) => updateEntry(entry.id, 'priority', parseInt(e.target.value) / 10)}
                    className="w-full accent-brand-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 px-0.5">
                    <span>0.0</span>
                    <span>0.5</span>
                    <span>1.0</span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="mt-5 p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove URL"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── XML Preview ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Generated XML</p>
          <div className="flex items-center gap-2">
            <button
              onClick={copyXml}
              disabled={!xml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <button
              onClick={downloadXml}
              disabled={!xml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Download XML
            </button>
          </div>
        </div>

        <div className="relative">
          {!xml ? (
            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
              Add at least one URL to generate XML
            </div>
          ) : (
            <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed">
              {xml.split('\n').map((line, i) => {
                // Syntax highlighting for XML
                let highlighted;
                if (line.startsWith('<?xml')) {
                  highlighted = `<span class="text-purple-400">${escapeXml(line)}</span>`;
                } else if (line.startsWith('<urlset') || line.startsWith('</urlset')) {
                  highlighted = `<span class="text-blue-400">${escapeXml(line)}</span>`;
                } else if (line.includes('<url>') || line.includes('</url>')) {
                  highlighted = `<span class="text-yellow-400">${escapeXml(line)}</span>`;
                } else if (line.includes('<loc>') || line.includes('</loc>')) {
                  highlighted = `<span class="text-green-400">${escapeXml(line)}</span>`;
                } else if (line.includes('<lastmod>') || line.includes('</lastmod>')) {
                  highlighted = `<span class="text-cyan-400">${escapeXml(line)}</span>`;
                } else if (line.includes('<changefreq>') || line.includes('</changefreq>')) {
                  highlighted = `<span class="text-pink-400">${escapeXml(line)}</span>`;
                } else if (line.includes('<priority>') || line.includes('</priority>')) {
                  highlighted = `<span class="text-orange-400">${escapeXml(line)}</span>`;
                } else {
                  highlighted = escapeXml(line);
                }
                return (
                  <code
                    key={i}
                    className="block"
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                );
              })}
            </pre>
          )}
        </div>

        {/* ── Info Card ──────────────────────────────────────── */}
        <div className="mt-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-200 mb-1">What to do with this file</p>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Save as <code className="text-brand-300">sitemap.xml</code> in your website&apos;s root directory</li>
                <li>Submit it to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Google Search Console</a></li>
                <li>Reference it in your <code className="text-brand-300">robots.txt</code> with: <code className="text-brand-300">Sitemap: https://yoursite.com/sitemap.xml</code></li>
                <li>Keep it under 50,000 URLs or split into a sitemap index</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
