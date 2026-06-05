'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Search, Copy, Check, FileText, Image, Film, Code, File, Music, Archive, Database, Globe, FileSpreadsheet, Terminal, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

// ── MIME Type Database ───────────────────────────────────────────────────────

interface MimeType {
  type: string;
  name: string;
  extension: string;
  summary: string;
  category: string;
}

interface Category {
  title: string;
  icon: typeof File;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  types: MimeType[];
}

const rawTypes: MimeType[] = [
  // ── Text ──
  { type: 'text/plain', name: 'Plain Text', extension: '.txt', summary: 'Unformatted text. The simplest and most universal content type.', category: 'text' },
  { type: 'text/html', name: 'HTML', extension: '.html', summary: 'HyperText Markup Language — the standard web page format.', category: 'text' },
  { type: 'text/css', name: 'CSS', extension: '.css', summary: 'Cascading Style Sheets — styles for HTML documents.', category: 'text' },
  { type: 'text/javascript', name: 'JavaScript', extension: '.js', summary: 'JavaScript source code (deprecated; use application/javascript).', category: 'text' },
  { type: 'text/csv', name: 'CSV', extension: '.csv', summary: 'Comma-Separated Values — tabular data as plain text.', category: 'text' },
  { type: 'text/markdown', name: 'Markdown', extension: '.md', summary: 'Markdown formatted text — used in READMEs, docs, forums.', category: 'text' },
  { type: 'text/xml', name: 'XML', extension: '.xml', summary: 'Extensible Markup Language — structured data interchange.', category: 'text' },
  { type: 'text/calendar', name: 'iCalendar', extension: '.ics', summary: 'iCalendar format — calendar events, to-do items, meeting requests.', category: 'text' },
  { type: 'text/vcard', name: 'vCard', extension: '.vcf', summary: 'Electronic business card — contact information.', category: 'text' },
  { type: 'text/yaml', name: 'YAML', extension: '.yaml', summary: 'YAML Ain\'t Markup Language — human-readable config/data.', category: 'text' },
  { type: 'text/tab-separated-values', name: 'TSV', extension: '.tsv', summary: 'Tab-Separated Values — alternative to CSV with tab delimiter.', category: 'text' },
  { type: 'text/rtf', name: 'Rich Text Format', extension: '.rtf', summary: 'Rich Text Format — formatted text with basic styling.', category: 'text' },

  // ── Application ──
  { type: 'application/json', name: 'JSON', extension: '.json', summary: 'JavaScript Object Notation — the universal API data format.', category: 'application' },
  { type: 'application/javascript', name: 'JavaScript', extension: '.js', summary: 'JavaScript source code (preferred over text/javascript).', category: 'application' },
  { type: 'application/typescript', name: 'TypeScript', extension: '.ts', summary: 'TypeScript source code — typed superset of JavaScript.', category: 'application' },
  { type: 'application/pdf', name: 'PDF', extension: '.pdf', summary: 'Portable Document Format — universal document sharing.', category: 'application' },
  { type: 'application/zip', name: 'ZIP Archive', extension: '.zip', summary: 'ZIP compressed archive — the most common archive format.', category: 'application' },
  { type: 'application/gzip', name: 'GZIP', extension: '.gz', summary: 'GNU Zip compressed file — single-file compression.', category: 'application' },
  { type: 'application/x-7z-compressed', name: '7-Zip', extension: '.7z', summary: '7-Zip compressed archive — high compression ratio.', category: 'application' },
  { type: 'application/x-tar', name: 'TAR Archive', extension: '.tar', summary: 'Tape Archive — commonly used with gzip (.tar.gz) or bzip2.', category: 'application' },
  { type: 'application/x-bzip2', name: 'Bzip2', extension: '.bz2', summary: 'Bzip2 compressed file — better compression than gzip.', category: 'application' },
  { type: 'application/x-rar-compressed', name: 'RAR Archive', extension: '.rar', summary: 'RAR compressed archive — proprietary archive format.', category: 'application' },
  { type: 'application/wasm', name: 'WebAssembly', extension: '.wasm', summary: 'WebAssembly binary — low-level bytecode for browsers.', category: 'application' },
  { type: 'application/octet-stream', name: 'Binary Data', extension: '*', summary: 'Generic binary data — catch-all for unknown formats. Triggers download in browsers.', category: 'application' },
  { type: 'application/xml', name: 'XML', extension: '.xml', summary: 'XML data (preferred over text/xml for data interchange).', category: 'application' },
  { type: 'application/x-www-form-urlencoded', name: 'URL-Encoded Form', extension: '-', summary: 'Default HTML form encoding. key=value&key2=value2 format in the request body.', category: 'application' },
  { type: 'application/graphql', name: 'GraphQL', extension: '.graphql', summary: 'GraphQL query or schema document.', category: 'application' },
  { type: 'application/ld+json', name: 'JSON-LD', extension: '.jsonld', summary: 'JSON for Linked Data — structured data for SEO (Schema.org).', category: 'application' },
  { type: 'application/rtf', name: 'Rich Text Format', extension: '.rtf', summary: 'Rich Text Format (application variant).', category: 'application' },
  { type: 'application/x-sh', name: 'Shell Script', extension: '.sh', summary: 'Unix shell script — bash, sh, zsh.', category: 'application' },
  { type: 'application/x-httpd-php', name: 'PHP', extension: '.php', summary: 'PHP source code — server-side scripting.', category: 'application' },
  { type: 'application/x-python-code', name: 'Python', extension: '.py', summary: 'Python source code.', category: 'application' },
  { type: 'application/x-yaml', name: 'YAML', extension: '.yaml', summary: 'YAML data (application variant).', category: 'application' },
  { type: 'application/vnd.api+json', name: 'JSON:API', extension: '.json', summary: 'JSON:API — a specification for building APIs in JSON.', category: 'application' },
  { type: 'application/problem+json', name: 'Problem JSON', extension: '.json', summary: 'RFC 7807 Problem Details — standard API error responses.', category: 'application' },
  { type: 'application/x-ndjson', name: 'NDJSON', extension: '.ndjson', summary: 'Newline Delimited JSON — one JSON object per line. Used for streaming.', category: 'application' },

  // ── Image ──
  { type: 'image/jpeg', name: 'JPEG', extension: '.jpg', summary: 'JPEG image — lossy compression, best for photos.', category: 'image' },
  { type: 'image/png', name: 'PNG', extension: '.png', summary: 'PNG image — lossless compression, supports transparency.', category: 'image' },
  { type: 'image/gif', name: 'GIF', extension: '.gif', summary: 'GIF image — animation support, limited to 256 colors.', category: 'image' },
  { type: 'image/webp', name: 'WebP', extension: '.webp', summary: 'WebP — Google\'s modern format. Lossy/lossless, transparency, animation.', category: 'image' },
  { type: 'image/avif', name: 'AVIF', extension: '.avif', summary: 'AVIF — next-gen format based on AV1. Best compression, HDR support.', category: 'image' },
  { type: 'image/svg+xml', name: 'SVG', extension: '.svg', summary: 'Scalable Vector Graphics — resolution-independent vector images.', category: 'image' },
  { type: 'image/bmp', name: 'BMP', extension: '.bmp', summary: 'Windows Bitmap — uncompressed raster image.', category: 'image' },
  { type: 'image/tiff', name: 'TIFF', extension: '.tiff', summary: 'Tagged Image File Format — high quality, used in print/scanning.', category: 'image' },
  { type: 'image/x-icon', name: 'Icon', extension: '.ico', summary: 'Windows icon file — used for favicons.', category: 'image' },
  { type: 'image/heic', name: 'HEIC', extension: '.heic', summary: 'High Efficiency Image Format — Apple\'s photo format.', category: 'image' },
  { type: 'image/jxl', name: 'JPEG XL', extension: '.jxl', summary: 'JPEG XL — next-gen format. Lossless JPEG recompression, HDR, animation.', category: 'image' },

  // ── Audio ──
  { type: 'audio/mpeg', name: 'MP3', extension: '.mp3', summary: 'MPEG Audio Layer III — the most popular audio format.', category: 'audio' },
  { type: 'audio/mp4', name: 'AAC/MP4 Audio', extension: '.m4a', summary: 'Audio in MP4 container — typically AAC encoding, Apple\'s preferred format.', category: 'audio' },
  { type: 'audio/ogg', name: 'OGG Audio', extension: '.ogg', summary: 'OGG container with Vorbis or Opus codec — open format.', category: 'audio' },
  { type: 'audio/wav', name: 'WAV', extension: '.wav', summary: 'Waveform Audio — uncompressed PCM audio, CD quality.', category: 'audio' },
  { type: 'audio/webm', name: 'WebM Audio', extension: '.weba', summary: 'WebM container with Opus or Vorbis — open web audio format.', category: 'audio' },
  { type: 'audio/flac', name: 'FLAC', extension: '.flac', summary: 'Free Lossless Audio Codec — lossless compression for audiophiles.', category: 'audio' },
  { type: 'audio/aac', name: 'AAC', extension: '.aac', summary: 'Advanced Audio Coding — successor to MP3, better quality at same bitrate.', category: 'audio' },
  { type: 'audio/midi', name: 'MIDI', extension: '.mid', summary: 'Musical Instrument Digital Interface — not audio, but performance data.', category: 'audio' },

  // ── Video ──
  { type: 'video/mp4', name: 'MP4 Video', extension: '.mp4', summary: 'MPEG-4 video — the most widely supported video format. Usually H.264 + AAC.', category: 'video' },
  { type: 'video/webm', name: 'WebM Video', extension: '.webm', summary: 'WebM video — open format, VP8/VP9 codec, royalty-free.', category: 'video' },
  { type: 'video/ogg', name: 'OGG Video', extension: '.ogv', summary: 'OGG video container — open format, Theora codec.', category: 'video' },
  { type: 'video/quicktime', name: 'QuickTime', extension: '.mov', summary: 'Apple QuickTime movie — legacy format.', category: 'video' },
  { type: 'video/x-msvideo', name: 'AVI', extension: '.avi', summary: 'Audio Video Interleave — Microsoft container format.', category: 'video' },
  { type: 'video/x-matroska', name: 'Matroska', extension: '.mkv', summary: 'Matroska multimedia container — flexible, open standard.', category: 'video' },
  { type: 'video/MP2T', name: 'MPEG-TS', extension: '.ts', summary: 'MPEG Transport Stream — used for live streaming and broadcast.', category: 'video' },

  // ── Font ──
  { type: 'font/woff', name: 'WOFF', extension: '.woff', summary: 'Web Open Font Format — compressed, with metadata.', category: 'font' },
  { type: 'font/woff2', name: 'WOFF2', extension: '.woff2', summary: 'WOFF 2.0 — 30% better compression. The web font standard.', category: 'font' },
  { type: 'font/ttf', name: 'TrueType', extension: '.ttf', summary: 'TrueType Font — the original scalable font format.', category: 'font' },
  { type: 'font/otf', name: 'OpenType', extension: '.otf', summary: 'OpenType Font — PostScript outlines, advanced typography features.', category: 'font' },
  { type: 'font/collection', name: 'Font Collection', extension: '.ttc', summary: 'TrueType/OpenType Collection — multiple fonts in one file.', category: 'font' },

  // ── Multipart ──
  { type: 'multipart/form-data', name: 'Form Data', extension: '-', summary: 'HTML form submission with file uploads. Each field is a separate part.', category: 'multipart' },
  { type: 'multipart/alternative', name: 'Alternative', extension: '-', summary: 'Same content in multiple formats — used for emails (text + HTML).', category: 'multipart' },
  { type: 'multipart/mixed', name: 'Mixed', extension: '-', summary: 'Multiple unrelated parts — email with attachments.', category: 'multipart' },
  { type: 'multipart/related', name: 'Related', extension: '-', summary: 'Related parts — HTML email with inline images.', category: 'multipart' },
  { type: 'multipart/byteranges', name: 'Byte Ranges', extension: '-', summary: 'HTTP 206 Partial Content — multiple byte ranges in one response.', category: 'multipart' },
];

const CATEGORIES: Record<string, { title: string; icon: typeof File; color: string; bgColor: string; borderColor: string; textColor: string }> = {
  text: { title: 'Text', icon: FileText, color: '#38bdf8', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/30', textColor: 'text-sky-400' },
  application: { title: 'Application', icon: Terminal, color: '#a78bfa', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', textColor: 'text-violet-400' },
  image: { title: 'Image', icon: Image, color: '#34d399', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400' },
  audio: { title: 'Audio', icon: Music, color: '#fbbf24', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', textColor: 'text-amber-400' },
  video: { title: 'Video', icon: Film, color: '#f472b6', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30', textColor: 'text-pink-400' },
  font: { title: 'Font', icon: FileText, color: '#fb923c', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', textColor: 'text-orange-400' },
  multipart: { title: 'Multipart', icon: Archive, color: '#94a3b8', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', textColor: 'text-slate-400' },
} as const;

// ── Build categories ────────────────────────────────────────────────────

function buildCategories(): Category[] {
  const map = new Map<string, MimeType[]>();
  for (const t of rawTypes) {
    const list = map.get(t.category) || [];
    list.push(t);
    map.set(t.category, list);
  }
  return Array.from(map.entries()).map(([cat, types]) => ({
    title: CATEGORIES[cat]?.title || cat,
    icon: CATEGORIES[cat]?.icon || File,
    color: CATEGORIES[cat]?.color || '#94a3b8',
    bgColor: CATEGORIES[cat]?.bgColor || 'bg-slate-500/10',
    borderColor: CATEGORIES[cat]?.borderColor || 'border-slate-500/30',
    textColor: CATEGORIES[cat]?.textColor || 'text-slate-400',
    types: types.sort((a, b) => a.type.localeCompare(b.type)),
  }));
}

// ── Component ───────────────────────────────────────────────────────────

export default function MimeTypeReferencePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const categories = useMemo(() => buildCategories(), []);

  const filteredCategories = useMemo(() => {
    let cats = categories;
    if (selectedCategory) {
      cats = cats.filter((c) => c.title.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      cats = cats.map((c) => ({
        ...c,
        types: c.types.filter(
          (t) =>
            t.type.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.extension.toLowerCase().includes(q) ||
            t.summary.toLowerCase().includes(q)
        ),
      })).filter((c) => c.types.length > 0);
    }
    return cats;
  }, [categories, search, selectedCategory]);

  const copyType = useCallback(async (type: string) => {
    await navigator.clipboard.writeText(type);
    setCopiedType(type);
    toast.success('MIME type copied!');
    setTimeout(() => setCopiedType(null), 2000);
  }, []);

  return (
    <ToolLayout
      title="MIME Type Reference"
      description="Complete reference of 70+ MIME types organized by category. Search, filter, and copy content-type strings for HTTP headers, form uploads, and API responses."
    >
      <div className="space-y-6">
        {/* Search & filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by type, name, or extension..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
            />
          </div>
          {Object.values(CATEGORIES).map((cat) => (
            <button
              key={cat.title}
              onClick={() => setSelectedCategory(selectedCategory === cat.title ? null : cat.title)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                selectedCategory === cat.title
                  ? `${cat.bgColor} ${cat.borderColor} ${cat.textColor}`
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.title} ({rawTypes.filter((t) => t.category === cat.title.toLowerCase()).length})
            </button>
          ))}
        </div>

        {/* Results */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No MIME types found matching your search.</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.title} className="rounded-xl border border-slate-700/50 overflow-hidden">
              <div className={`px-4 py-2.5 ${category.bgColor} border-b ${category.borderColor}`}>
                <div className="flex items-center gap-2">
                  <category.icon className={`w-4 h-4 ${category.textColor}`} />
                  <h3 className={`text-sm font-semibold ${category.textColor}`}>{category.title}</h3>
                  <span className="text-xs text-slate-500">({category.types.length} types)</span>
                </div>
              </div>
              <div className="divide-y divide-slate-700/30">
                {category.types.map((t) => (
                  <div
                    key={t.type}
                    className="px-4 py-3 hover:bg-slate-800/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-brand-400">{t.type}</span>
                          {t.extension !== '-' && t.extension !== '*' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 font-mono">
                              {t.extension}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">{t.name}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{t.summary}</p>
                      </div>
                      <button
                        onClick={() => copyType(t.type)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-brand-400 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Copy MIME type"
                      >
                        {copiedType === t.type ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Quick reference */}
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Quick Reference: Common HTTP Content-Type Headers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { label: 'JSON API response', header: 'Content-Type: application/json' },
              { label: 'HTML page', header: 'Content-Type: text/html; charset=utf-8' },
              { label: 'Form POST (no files)', header: 'Content-Type: application/x-www-form-urlencoded' },
              { label: 'Form POST with files', header: 'Content-Type: multipart/form-data' },
              { label: 'Plain text', header: 'Content-Type: text/plain; charset=utf-8' },
              { label: 'JavaScript bundle', header: 'Content-Type: application/javascript' },
              { label: 'CSS stylesheet', header: 'Content-Type: text/css' },
              { label: 'PNG image', header: 'Content-Type: image/png' },
              { label: 'SVG vector', header: 'Content-Type: image/svg+xml' },
              { label: 'Generic binary download', header: 'Content-Type: application/octet-stream' },
              { label: 'GraphQL request', header: 'Content-Type: application/json' },
              { label: 'Server-Sent Events', header: 'Content-Type: text/event-stream' },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => {
                  navigator.clipboard.writeText(item.header);
                  toast.success('Header copied!');
                }}
                className="group flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30 cursor-pointer hover:border-brand-500/30 transition-colors"
              >
                <span className="text-xs text-slate-400">{item.label}</span>
                <span className="text-xs font-mono text-slate-300 group-hover:text-brand-400 transition-colors">
                  {item.header.replace('Content-Type: ', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
