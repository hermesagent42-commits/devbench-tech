'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Clock, Link, ArrowUpDown, Minus, Underline, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

type Separator = '-' | '_' | '~' | '.';
type CaseMode = 'lowercase' | 'uppercase' | 'none';

interface HistoryEntry {
  slug: string;
  original: string;
  timestamp: number;
}

const HISTORY_KEY = 'slug-generator-history';
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch { /* quota exceeded, silently ignore */ }
}

function slugify(
  text: string,
  separator: Separator,
  caseMode: CaseMode,
  maxLength: number,
  stripSpecial: boolean,
): string {
  if (!text.trim()) return '';

  let slug = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .trim();

  if (stripSpecial) {
    // Replace special chars with separator, collapse, trim
    slug = slug
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .replace(/[\s_]+/g, separator)
      .replace(new RegExp(`${escapeRegExp(separator)}+`, 'g'), separator)
      .replace(new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, 'g'), '');
  } else {
    slug = slug
      .replace(/[\s_]+/g, separator)
      .replace(new RegExp(`${escapeRegExp(separator)}+`, 'g'), separator)
      .replace(new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, 'g'), '');
  }

  // Apply case
  if (caseMode === 'lowercase') slug = slug.toLowerCase();
  else if (caseMode === 'uppercase') slug = slug.toUpperCase();

  // Trim to max length
  if (maxLength > 0 && slug.length > maxLength) {
    // Try to cut at a separator boundary
    const cutoff = slug.lastIndexOf(separator, maxLength);
    if (cutoff > maxLength / 2) {
      slug = slug.substring(0, cutoff);
    } else {
      slug = slug.substring(0, maxLength);
    }
    // Clean trailing separator
    slug = slug.replace(new RegExp(`${escapeRegExp(separator)}$`), '');
  }

  return slug;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function SlugGeneratorPage() {
  const [input, setInput] = useState('');
  const [separator, setSeparator] = useState<Separator>('-');
  const [caseMode, setCaseMode] = useState<CaseMode>('lowercase');
  const [maxLength, setMaxLength] = useState(80);
  const [enableMaxLength, setEnableMaxLength] = useState(false);
  const [stripSpecial, setStripSpecial] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const slug = useMemo(
    () => slugify(input, separator, caseMode, enableMaxLength ? maxLength : 99999, stripSpecial),
    [input, separator, caseMode, maxLength, enableMaxLength, stripSpecial],
  );

  const wordCount = useMemo(
    () => (input.trim() ? input.trim().split(/\s+/).length : 0),
    [input],
  );

  const addToHistory = useCallback(() => {
    if (!slug || !input.trim()) return;
    const entry: HistoryEntry = { slug, original: input.trim(), timestamp: Date.now() };
    setHistory((prev) => {
      // Deduplicate
      const filtered = prev.filter((e) => e.slug !== slug);
      const updated = [entry, ...filtered];
      saveHistory(updated);
      return updated;
    });
  }, [slug, input]);

  const copySlug = useCallback(() => {
    if (!slug) return;
    navigator.clipboard.writeText(slug).then(
      () => {
        toast.success('Slug copied!');
        addToHistory();
      },
      () => toast.error('Failed to copy'),
    );
  }, [slug, addToHistory]);

  const clearAll = useCallback(() => {
    setInput('');
    setHistory([]);
    saveHistory([]);
  }, []);

  const removeFromHistory = useCallback((timestamp: number) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.timestamp !== timestamp);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const copyHistorySlug = useCallback((entry: HistoryEntry) => {
    navigator.clipboard.writeText(entry.slug).then(
      () => toast.success('Slug copied!'),
      () => toast.error('Failed to copy'),
    );
  }, []);

  const reuseHistoryEntry = useCallback((entry: HistoryEntry) => {
    setInput(entry.original);
  }, []);

  const separatorOptions: { value: Separator; label: string; icon: React.ReactNode }[] = [
    { value: '-', label: 'Dash (-)', icon: <Minus className="w-4 h-4" /> },
    { value: '_', label: 'Underscore (_)', icon: <Underline className="w-4 h-4" /> },
    { value: '~', label: 'Tilde (~)', icon: <ArrowUpDown className="w-4 h-4" /> },
    { value: '.', label: 'Dot (.)', icon: <Hash className="w-4 h-4" /> },
  ];

  const exampleUrl = slug ? `https://example.com/blog/${slug}` : '';

  return (
    <ToolLayout
      title="Slug Generator"
      description="Convert text into clean, URL-friendly slugs — perfect for blog posts, documentation, or any web content naming."
    >
      {/* Input */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Enter Text</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., 10 Tips for Better CSS in 2026"
          rows={3}
          className="w-full bg-surface border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-y"
        />
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>{input.length} characters</span>
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>
      </div>

      {/* Generated Slug */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Slug Preview</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-surface rounded-lg px-4 py-3 font-mono text-lg text-brand-400 break-all border border-slate-700/50 min-h-[52px] flex items-center">
            {slug || <span className="text-slate-500 font-sans text-sm">Start typing to generate a slug...</span>}
          </div>
          <button
            onClick={copySlug}
            disabled={!slug}
            className="btn-primary flex items-center gap-1.5 text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
        {exampleUrl && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 bg-surface rounded-lg px-4 py-2 border border-slate-700/30">
            <Link className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="font-mono text-xs break-all">{exampleUrl}</span>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Options</h2>

        {/* Separator */}
        <div className="mb-5">
          <label className="text-sm text-slate-300 block mb-2">Separator</label>
          <div className="flex flex-wrap gap-2">
            {separatorOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeparator(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  separator === opt.value
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/50'
                    : 'bg-surface text-slate-400 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Case */}
        <div className="mb-5">
          <label className="text-sm text-slate-300 block mb-2">Case</label>
          <div className="flex gap-2">
            {([
              { value: 'lowercase' as CaseMode, label: 'lowercase' },
              { value: 'uppercase' as CaseMode, label: 'UPPERCASE' },
              { value: 'none' as CaseMode, label: 'No Change' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCaseMode(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  caseMode === opt.value
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/50'
                    : 'bg-surface text-slate-400 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={stripSpecial}
              onChange={(e) => setStripSpecial(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-500"
            />
            <span className="text-sm text-slate-300">Strip special characters (only letters, numbers, spaces)</span>
          </label>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={enableMaxLength}
                onChange={(e) => setEnableMaxLength(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-slate-300">Max length:</span>
            </label>
            {enableMaxLength && (
              <input
                type="number"
                min={5}
                max={2000}
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
                className="input-field w-24 text-center text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {slug && (
        <div className="card mb-6">
          <h2 className="text-white font-semibold text-lg mb-4">Slug Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-lg p-3 text-center border border-slate-700/50">
              <div className="text-2xl font-mono font-bold text-brand-400">{slug.length}</div>
              <div className="text-xs text-slate-500 mt-1">Characters</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center border border-slate-700/50">
              <div className="text-2xl font-mono font-bold text-brand-400">
                {slug.split(separator).filter(Boolean).length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Segments</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center border border-slate-700/50">
              <div className="text-2xl font-mono font-bold text-brand-400">
                {slug.replace(new RegExp(`[^${escapeRegExp(separator)}]`, 'g'), '').length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Separators</div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Recent Slugs
            </h2>
            <button
              onClick={clearAll}
              className="text-sm text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
          <div className="space-y-0">
            {history.map((entry) => (
              <div
                key={entry.timestamp}
                className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-surface-light/50 transition-colors group border-b border-slate-800/50 last:border-0"
              >
                <button
                  onClick={() => reuseHistoryEntry(entry)}
                  className="flex-1 text-left font-mono text-sm text-brand-400 truncate hover:text-brand-300 cursor-pointer"
                  title={entry.slug}
                >
                  {entry.slug}
                </button>
                <span className="text-xs text-slate-600 shrink-0 hidden sm:inline">
                  {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => copyHistorySlug(entry)}
                  className="shrink-0 p-1 text-slate-600 hover:text-brand-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeFromHistory(entry.timestamp)}
                  className="shrink-0 p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
