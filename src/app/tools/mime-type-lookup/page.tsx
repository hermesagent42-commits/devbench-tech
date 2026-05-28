'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, File, FileImage, FileAudio, FileVideo, FileCode, FileText, FileArchive, FileType, X, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface MimeEntry {
  extension: string;
  mime: string;
  category: Category;
}

type Category =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'application'
  | 'font'
  | 'model'
  | 'message';

interface CategoryInfo {
  label: string;
  icon: typeof File;
  color: string;
  bg: string;
}

// ── Data ───────────────────────────────────────────────────────────────────

const CATEGORIES: Record<Category, CategoryInfo> = {
  text: { label: 'Text', icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  image: { label: 'Image', icon: FileImage, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  audio: { label: 'Audio', icon: FileAudio, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  video: { label: 'Video', icon: FileVideo, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  application: { label: 'Application', icon: FileArchive, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  font: { label: 'Font', icon: FileType, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  model: { label: '3D Model', icon: FileCode, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  message: { label: 'Message', icon: Globe, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
};

const MIME_DATABASE: MimeEntry[] = [
  // ── Text ──
  { extension: '.html', mime: 'text/html', category: 'text' },
  { extension: '.htm', mime: 'text/html', category: 'text' },
  { extension: '.css', mime: 'text/css', category: 'text' },
  { extension: '.js', mime: 'text/javascript', category: 'text' },
  { extension: '.mjs', mime: 'text/javascript', category: 'text' },
  { extension: '.txt', mime: 'text/plain', category: 'text' },
  { extension: '.csv', mime: 'text/csv', category: 'text' },
  { extension: '.tsv', mime: 'text/tab-separated-values', category: 'text' },
  { extension: '.ics', mime: 'text/calendar', category: 'text' },
  { extension: '.vtt', mime: 'text/vtt', category: 'text' },
  { extension: '.srt', mime: 'text/plain', category: 'text' },
  { extension: '.xml', mime: 'text/xml', category: 'text' },
  { extension: '.sgml', mime: 'text/sgml', category: 'text' },
  { extension: '.yaml', mime: 'text/yaml', category: 'text' },
  { extension: '.yml', mime: 'text/yaml', category: 'text' },
  { extension: '.markdown', mime: 'text/markdown', category: 'text' },
  { extension: '.md', mime: 'text/markdown', category: 'text' },
  { extension: '.mdx', mime: 'text/markdown', category: 'text' },
  { extension: '.json', mime: 'application/json', category: 'application' },
  { extension: '.jsonld', mime: 'application/ld+json', category: 'application' },
  { extension: '.py', mime: 'text/x-python', category: 'text' },
  { extension: '.rb', mime: 'text/x-ruby', category: 'text' },
  { extension: '.go', mime: 'text/x-go', category: 'text' },
  { extension: '.rs', mime: 'text/x-rust', category: 'text' },
  { extension: '.java', mime: 'text/x-java', category: 'text' },
  { extension: '.kt', mime: 'text/x-kotlin', category: 'text' },
  { extension: '.swift', mime: 'text/x-swift', category: 'text' },
  { extension: '.tsx', mime: 'text/plain', category: 'text' },
  { extension: '.jsx', mime: 'text/plain', category: 'text' },
  { extension: '.vue', mime: 'text/plain', category: 'text' },
  { extension: '.svelte', mime: 'text/plain', category: 'text' },
  { extension: '.diff', mime: 'text/x-diff', category: 'text' },
  { extension: '.patch', mime: 'text/x-diff', category: 'text' },

  // ── Image ──
  { extension: '.png', mime: 'image/png', category: 'image' },
  { extension: '.jpg', mime: 'image/jpeg', category: 'image' },
  { extension: '.jpeg', mime: 'image/jpeg', category: 'image' },
  { extension: '.gif', mime: 'image/gif', category: 'image' },
  { extension: '.webp', mime: 'image/webp', category: 'image' },
  { extension: '.avif', mime: 'image/avif', category: 'image' },
  { extension: '.svg', mime: 'image/svg+xml', category: 'image' },
  { extension: '.ico', mime: 'image/x-icon', category: 'image' },
  { extension: '.bmp', mime: 'image/bmp', category: 'image' },
  { extension: '.tiff', mime: 'image/tiff', category: 'image' },
  { extension: '.tif', mime: 'image/tiff', category: 'image' },
  { extension: '.heic', mime: 'image/heic', category: 'image' },
  { extension: '.heif', mime: 'image/heif', category: 'image' },
  { extension: '.apng', mime: 'image/apng', category: 'image' },
  { extension: '.jp2', mime: 'image/jp2', category: 'image' },

  // ── Audio ──
  { extension: '.mp3', mime: 'audio/mpeg', category: 'audio' },
  { extension: '.wav', mime: 'audio/wav', category: 'audio' },
  { extension: '.ogg', mime: 'audio/ogg', category: 'audio' },
  { extension: '.opus', mime: 'audio/opus', category: 'audio' },
  { extension: '.aac', mime: 'audio/aac', category: 'audio' },
  { extension: '.flac', mime: 'audio/flac', category: 'audio' },
  { extension: '.mid', mime: 'audio/midi', category: 'audio' },
  { extension: '.midi', mime: 'audio/midi', category: 'audio' },
  { extension: '.m4a', mime: 'audio/mp4', category: 'audio' },
  { extension: '.weba', mime: 'audio/webm', category: 'audio' },

  // ── Video ──
  { extension: '.mp4', mime: 'video/mp4', category: 'video' },
  { extension: '.webm', mime: 'video/webm', category: 'video' },
  { extension: '.ogv', mime: 'video/ogg', category: 'video' },
  { extension: '.mov', mime: 'video/quicktime', category: 'video' },
  { extension: '.avi', mime: 'video/x-msvideo', category: 'video' },
  { extension: '.wmv', mime: 'video/x-ms-wmv', category: 'video' },
  { extension: '.flv', mime: 'video/x-flv', category: 'video' },
  { extension: '.mkv', mime: 'video/x-matroska', category: 'video' },
  { extension: '.m4v', mime: 'video/mp4', category: 'video' },
  { extension: '.mpeg', mime: 'video/mpeg', category: 'video' },
  { extension: '.mpg', mime: 'video/mpeg', category: 'video' },
  { extension: '.ts', mime: 'video/mp2t', category: 'video' },
  { extension: '.3gp', mime: 'video/3gpp', category: 'video' },
  { extension: '.3g2', mime: 'video/3gpp2', category: 'video' },

  // ── Application ──
  { extension: '.pdf', mime: 'application/pdf', category: 'application' },
  { extension: '.zip', mime: 'application/zip', category: 'application' },
  { extension: '.gz', mime: 'application/gzip', category: 'application' },
  { extension: '.tar', mime: 'application/x-tar', category: 'application' },
  { extension: '.bz2', mime: 'application/x-bzip2', category: 'application' },
  { extension: '.xz', mime: 'application/x-xz', category: 'application' },
  { extension: '.7z', mime: 'application/x-7z-compressed', category: 'application' },
  { extension: '.rar', mime: 'application/vnd.rar', category: 'application' },
  { extension: '.doc', mime: 'application/msword', category: 'application' },
  { extension: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'application' },
  { extension: '.xls', mime: 'application/vnd.ms-excel', category: 'application' },
  { extension: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'application' },
  { extension: '.ppt', mime: 'application/vnd.ms-powerpoint', category: 'application' },
  { extension: '.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'application' },
  { extension: '.epub', mime: 'application/epub+zip', category: 'application' },
  { extension: '.jar', mime: 'application/java-archive', category: 'application' },
  { extension: '.apk', mime: 'application/vnd.android.package-archive', category: 'application' },
  { extension: '.dmg', mime: 'application/x-apple-diskimage', category: 'application' },
  { extension: '.iso', mime: 'application/x-iso9660-image', category: 'application' },
  { extension: '.exe', mime: 'application/vnd.microsoft.portable-executable', category: 'application' },
  { extension: '.msi', mime: 'application/x-msdownload', category: 'application' },
  { extension: '.deb', mime: 'application/vnd.debian.binary-package', category: 'application' },
  { extension: '.rpm', mime: 'application/x-rpm', category: 'application' },
  { extension: '.wasm', mime: 'application/wasm', category: 'application' },
  { extension: '.bin', mime: 'application/octet-stream', category: 'application' },
  { extension: '.rtf', mime: 'application/rtf', category: 'application' },
  { extension: '.sh', mime: 'application/x-sh', category: 'application' },
  { extension: '.php', mime: 'application/x-httpd-php', category: 'application' },
  { extension: '.graphql', mime: 'application/graphql', category: 'application' },
  { extension: '.gql', mime: 'application/graphql', category: 'application' },
  { extension: '.toml', mime: 'application/toml', category: 'application' },
  { extension: '.map', mime: 'application/json', category: 'application' },
  { extension: '.zst', mime: 'application/zstd', category: 'application' },
  { extension: '.br', mime: 'application/brotli', category: 'application' },

  // ── Font ──
  { extension: '.woff', mime: 'font/woff', category: 'font' },
  { extension: '.woff2', mime: 'font/woff2', category: 'font' },
  { extension: '.ttf', mime: 'font/ttf', category: 'font' },
  { extension: '.otf', mime: 'font/otf', category: 'font' },
  { extension: '.eot', mime: 'application/vnd.ms-fontobject', category: 'font' },

  // ── Model (3D) ──
  { extension: '.gltf', mime: 'model/gltf+json', category: 'model' },
  { extension: '.glb', mime: 'model/gltf-binary', category: 'model' },
  { extension: '.obj', mime: 'model/obj', category: 'model' },
  { extension: '.stl', mime: 'model/stl', category: 'model' },
  { extension: '.usdz', mime: 'model/vnd.usdz+zip', category: 'model' },

  // ── Message ──
  { extension: '.eml', mime: 'message/rfc822', category: 'message' },
  { extension: '.mht', mime: 'message/rfc822', category: 'message' },
  { extension: '.mhtml', mime: 'multipart/related', category: 'message' },

  // ── Misc ──
  { extension: '.ini', mime: 'text/plain', category: 'text' },
  { extension: '.cfg', mime: 'text/plain', category: 'text' },
  { extension: '.env', mime: 'text/plain', category: 'text' },
  { extension: '.lock', mime: 'text/plain', category: 'text' },
  { extension: '.log', mime: 'text/plain', category: 'text' },
  { extension: '.sqlite', mime: 'application/vnd.sqlite3', category: 'application' },
  { extension: '.sqlite3', mime: 'application/vnd.sqlite3', category: 'application' },
];

const uniqueByExt = new Map<string, MimeEntry>();
for (const entry of MIME_DATABASE) {
  if (!uniqueByExt.has(entry.extension)) {
    uniqueByExt.set(entry.extension, entry);
  }
}
const MIME_ENTRIES = Array.from(uniqueByExt.values()).sort((a, b) =>
  a.extension.localeCompare(b.extension)
);

// ── Component ───────────────────────────────────────────────────────────────

export default function MimeTypeLookupPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reverseMode, setReverseMode] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let results = MIME_ENTRIES;

    if (activeCategory !== 'all') {
      results = results.filter((e) => e.category === activeCategory);
    }

    if (q) {
      results = results.filter(
        (e) =>
          e.extension.toLowerCase().includes(q) ||
          e.mime.toLowerCase().includes(q)
      );
    }

    return results;
  }, [search, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: MIME_ENTRIES.length };
    for (const cat of Object.keys(CATEGORIES) as Category[]) {
      counts[cat] = MIME_ENTRIES.filter((e) => e.category === cat).length;
    }
    return counts;
  }, []);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
  }, []);

  return (
    <ToolLayout
      title="MIME Type Lookup"
      description="Search and browse the complete list of MIME types by file extension or content type. Click any entry to copy."
      controls={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReverseMode(!reverseMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              reverseMode
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
            title="Toggle sort order"
          >
            {reverseMode ? 'Sort: MIME → Ext' : 'Sort: Ext → MIME'}
          </button>
        </div>
      }
    >
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={reverseMode ? 'Filter by MIME type…' : 'Filter by extension or MIME type…'}
          className="w-full pl-10 pr-10 py-3 bg-surface-light border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            activeCategory === 'all'
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
          }`}
        >
          All ({categoryCounts.all})
        </button>
        {(Object.entries(CATEGORIES) as [Category, CategoryInfo][]).map(([cat, info]) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all inline-flex items-center gap-1.5 ${
              activeCategory === cat
                ? `${info.bg} ${info.color}`
                : 'bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            <info.icon className="w-3 h-3" />
            {info.label} ({categoryCounts[cat]})
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No matching MIME types found</p>
          <p className="text-slate-600 text-xs mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-[140px_1fr_auto] gap-3 px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
            <span>Extension</span>
            <span>MIME Type</span>
            <span className="w-20 text-center">Category</span>
          </div>

          {filtered.map((entry) => {
            const catInfo = CATEGORIES[entry.category];
            const entryId = `${entry.extension}-${entry.mime}`;
            const isCopied = copiedId === entryId;

            return (
              <div
                key={entryId}
                className="grid grid-cols-[140px_1fr_auto] gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group border border-transparent hover:border-slate-700/50"
              >
                {/* Extension (click to copy) */}
                <button
                  onClick={() => copyToClipboard(entry.extension, entryId)}
                  className="text-left font-mono text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors truncate cursor-pointer"
                  title={`Click to copy: ${entry.extension}`}
                >
                  {entry.extension}
                </button>

                {/* MIME type (click to copy) */}
                <button
                  onClick={() => copyToClipboard(entry.mime, entryId)}
                  className="text-left font-mono text-sm text-slate-300 hover:text-white transition-colors truncate group-hover:text-slate-200 cursor-pointer"
                  title={`Click to copy: ${entry.mime}`}
                >
                  {entry.mime}
                </button>

                {/* Category badge + copy */}
                <div className="flex items-center gap-2 justify-end">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${catInfo.bg} ${catInfo.color} border-current/20 whitespace-nowrap`}
                  >
                    <catInfo.icon className="w-2.5 h-2.5" />
                    {catInfo.label}
                  </span>
                  <button
                    onClick={() => copyToClipboard(entry.mime, entryId)}
                    className={`p-1 rounded transition-all ${
                      isCopied
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100'
                    }`}
                    title="Copy MIME type"
                  >
                    {isCopied ? (
                      <span className="text-[10px] font-medium px-1">Copied!</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-8 pt-6 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing {filtered.length} of {MIME_ENTRIES.length} MIME types
        </span>
        <span className="inline-flex items-center gap-1">
          <File className="w-3 h-3" />
          Click any value to copy to clipboard
        </span>
      </div>
    </ToolLayout>
  );
}
