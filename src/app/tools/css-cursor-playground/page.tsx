'use client';

import { useState, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, MousePointer2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Cursor categories ───────────────────────────────────────────────────────

interface CursorItem {
  value: string;
  label: string;
  category: string;
  description: string;
}

const CURSORS: CursorItem[] = [
  // General
  { value: 'auto', label: 'auto', category: 'General', description: 'Browser determines the cursor based on context.' },
  { value: 'default', label: 'default', category: 'General', description: 'The platform-dependent default cursor (usually an arrow).' },
  { value: 'none', label: 'none', category: 'General', description: 'No cursor is rendered.' },

  // Links & Status
  { value: 'pointer', label: 'pointer', category: 'Links & Status', description: 'A pointing hand — used for links and clickable elements.' },
  { value: 'context-menu', label: 'context-menu', category: 'Links & Status', description: 'A cursor indicating a context menu is available.' },
  { value: 'help', label: 'help', category: 'Links & Status', description: 'Indicates help information is available (often a question mark).' },
  { value: 'progress', label: 'progress', category: 'Links & Status', description: 'Program is busy in the background but still interactive.' },
  { value: 'wait', label: 'wait', category: 'Links & Status', description: 'Program is busy and the user should wait (hourglass/spinner).' },

  // Selection
  { value: 'text', label: 'text', category: 'Selection', description: 'Text selection cursor (I-beam).' },
  { value: 'crosshair', label: 'crosshair', category: 'Selection', description: 'Crosshair cursor for precise positioning.' },
  { value: 'cell', label: 'cell', category: 'Selection', description: 'Indicates a cell or set of cells can be selected (spreadsheet).' },
  { value: 'vertical-text', label: 'vertical-text', category: 'Selection', description: 'Indicates vertical text selection.' },

  // Resize & Scroll
  { value: 'e-resize', label: 'e-resize', category: 'Resize & Scroll', description: 'Eastward resize (right edge).' },
  { value: 'w-resize', label: 'w-resize', category: 'Resize & Scroll', description: 'Westward resize (left edge).' },
  { value: 'n-resize', label: 'n-resize', category: 'Resize & Scroll', description: 'Northward resize (top edge).' },
  { value: 's-resize', label: 's-resize', category: 'Resize & Scroll', description: 'Southward resize (bottom edge).' },
  { value: 'ne-resize', label: 'ne-resize', category: 'Resize & Scroll', description: 'Northeast resize (top-right corner).' },
  { value: 'nw-resize', label: 'nw-resize', category: 'Resize & Scroll', description: 'Northwest resize (top-left corner).' },
  { value: 'se-resize', label: 'se-resize', category: 'Resize & Scroll', description: 'Southeast resize (bottom-right corner).' },
  { value: 'sw-resize', label: 'sw-resize', category: 'Resize & Scroll', description: 'Southwest resize (bottom-left corner).' },
  { value: 'ew-resize', label: 'ew-resize', category: 'Resize & Scroll', description: 'East-west bidirectional resize.' },
  { value: 'ns-resize', label: 'ns-resize', category: 'Resize & Scroll', description: 'North-south bidirectional resize.' },
  { value: 'nesw-resize', label: 'nesw-resize', category: 'Resize & Scroll', description: 'Northeast-southwest bidirectional resize.' },
  { value: 'nwse-resize', label: 'nwse-resize', category: 'Resize & Scroll', description: 'Northwest-southeast bidirectional resize.' },
  { value: 'col-resize', label: 'col-resize', category: 'Resize & Scroll', description: 'Indicates a column can be resized horizontally.' },
  { value: 'row-resize', label: 'row-resize', category: 'Resize & Scroll', description: 'Indicates a row can be resized vertically.' },
  { value: 'all-scroll', label: 'all-scroll', category: 'Resize & Scroll', description: 'Indicates something can be scrolled in any direction.' },

  // Drag & Drop
  { value: 'move', label: 'move', category: 'Drag & Drop', description: 'Indicates something can be moved.' },
  { value: 'grab', label: 'grab', category: 'Drag & Drop', description: 'Indicates something can be grabbed (open hand).' },
  { value: 'grabbing', label: 'grabbing', category: 'Drag & Drop', description: 'Indicates something is being grabbed (closed hand).' },
  { value: 'copy', label: 'copy', category: 'Drag & Drop', description: 'Indicates something can be copied.' },
  { value: 'alias', label: 'alias', category: 'Drag & Drop', description: 'Indicates an alias or shortcut will be created.' },
  { value: 'no-drop', label: 'no-drop', category: 'Drag & Drop', description: 'Indicates the dragged item cannot be dropped here.' },
  { value: 'not-allowed', label: 'not-allowed', category: 'Drag & Drop', description: 'The requested action cannot be performed.' },

  // Zoom
  { value: 'zoom-in', label: 'zoom-in', category: 'Zoom', description: 'Indicates something can be zoomed in.' },
  { value: 'zoom-out', label: 'zoom-out', category: 'Zoom', description: 'Indicates something can be zoomed out.' },
];

const CATEGORIES = Array.from(new Set(CURSORS.map((c) => c.category)));

// ── Component ───────────────────────────────────────────────────────────────

export default function CssCursorPlaygroundPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = CURSORS;
    if (activeCategory) {
      results = results.filter((c) => c.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (c) =>
          c.value.toLowerCase().includes(q) ||
          c.label.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      );
    }
    return results;
  }, [search, activeCategory]);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(`cursor: ${value};`).then(
      () => {
        setCopiedValue(value);
        toast.success(`Copied: cursor: ${value};`);
        setTimeout(() => setCopiedValue(null), 1500);
      },
      () => toast.error('Failed to copy'),
    );
  };

  return (
    <ToolLayout
      title="CSS Cursor Playground"
      description="Explore all 36 CSS cursor values. Hover each card to see the cursor in action, filter by category, and copy production-ready CSS with one click."
    >
      <div className="space-y-6">
        {/* ── Search & Filter ── */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input-field pl-10 w-full"
                placeholder="Search cursors (e.g. grab, resize, pointer)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              All ({CURSORS.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = CURSORS.filter((c) => c.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Cursor Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((cursor) => (
            <div
              key={cursor.value}
              className="card p-4 group transition-all duration-200 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5 cursor-[var(--cursor-value)]"
              style={{ '--cursor-value': cursor.value } as React.CSSProperties}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MousePointer2 className="w-4 h-4 text-brand-400" />
                  <code className="text-sm font-mono text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded">
                    {cursor.value}
                  </code>
                </div>
                <button
                  onClick={() => handleCopy(cursor.value)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700"
                  title="Copy CSS"
                >
                  {copiedValue === cursor.value ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{cursor.description}</p>

              {/* Preview box */}
              <div
                className="mt-3 h-12 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center transition-colors group-hover:border-brand-500/30"
                style={{ cursor: cursor.value }}
              >
                <span className="text-[10px] text-slate-500 font-mono">
                  cursor: {cursor.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <MousePointer2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No cursors match your search.</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory(null); }}
              className="text-brand-400 text-sm mt-1 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Quick Reference Footer ── */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Quick Reference</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1.5">
            {CURSORS.map((c) => (
              <button
                key={c.value}
                className="text-left text-xs font-mono text-slate-400 hover:text-brand-300 transition-colors py-0.5"
                style={{ cursor: c.value }}
                onClick={() => handleCopy(c.value)}
                title={`cursor: ${c.value} — ${c.description}`}
              >
                {c.value}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
