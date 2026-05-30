'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { X, Copy, Code2, Sparkles, Plus, Trash2, Eye, PaintBucket, SearchCheck, Palette, Ruler } from 'lucide-react';
import toast from 'react-hot-toast';

interface HighlightGroup {
  id: number;
  name: string;
  color: string;
  textColor: string;
  thickness: number;
  ranges: Array<{ start: number; end: number }>;
  active: boolean;
}

const PRESET_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.35)', text: '#93c5fd' },
  { bg: 'rgba(239, 68, 68, 0.35)', text: '#fca5a5' },
  { bg: 'rgba(16, 185, 129, 0.35)', text: '#6ee7b7' },
  { bg: 'rgba(245, 158, 11, 0.35)', text: '#fcd34d' },
  { bg: 'rgba(139, 92, 246, 0.35)', text: '#c4b5fd' },
  { bg: 'rgba(236, 72, 153, 0.35)', text: '#f9a8d4' },
  { bg: 'rgba(20, 184, 166, 0.35)', text: '#5eead4' },
  { bg: 'rgba(251, 146, 60, 0.35)', text: '#fdba74' },
];

const DEFAULT_TEXT = `The CSS Custom Highlight API extends the concept of CSS pseudo-elements by enabling styling of arbitrary text ranges — not just the first line or first letter. Unlike ::selection, which only works on user-selected text, ::highlight() lets you programmatically style any part of the page.

Key benefits:
• Style text ranges without modifying the DOM
• Multiple simultaneous highlights with different styles
• Dynamic ranges that update in real-time
• No reflow — highlights are painted on top
• Works inside shadow DOM

This API is now Baseline 2026, supported in Chrome 105+, Safari 17.2+, and Firefox 132+. It powers rich text editors, search highlighting, grammar checkers, and collaborative editing features — all without touching the DOM.`;

export default function CssHighlightApiPage() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [groups, setGroups] = useState<HighlightGroup[]>([
    {
      id: 1,
      name: 'Search Matches',
      color: 'rgba(239, 68, 68, 0.35)',
      textColor: '#fca5a5',
      thickness: 2,
      ranges: [
        { start: 0, end: 5 },
        { start: 168, end: 174 },
      ],
      active: true,
    },
    {
      id: 2,
      name: 'Key Concepts',
      color: 'rgba(59, 130, 246, 0.35)',
      textColor: '#93c5fd',
      thickness: 3,
      ranges: [
        { start: 11, end: 37 },
        { start: 247, end: 260 },
      ],
      active: true,
    },
  ]);
  const [activeGroup, setActiveGroup] = useState<number>(1);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [idCounter, setIdCounter] = useState(3);
  const [apiSupported, setApiSupported] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Check API support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // @ts-ignore — CSS Custom Highlight API is a browser global
    const supported = !!(window.CSS && window.CSS.highlights);
    setApiSupported(supported);
  }, []);

  // Apply highlights
  useEffect(() => {
    const container = textContainerRef.current;
    if (!container || typeof window === 'undefined') return;
    // @ts-ignore — CSS Custom Highlight API is a browser global
    const CSS = window.CSS;
    if (!CSS || !CSS.highlights) return;

    // Clear existing highlights
    CSS.highlights.clear();

    for (const group of groups) {
      if (!group.active || group.ranges.length === 0) continue;

      const ranges = group.ranges
        .map((r) => {
          try {
            const range = new Range();
            const textNode = container.firstChild;
            if (!textNode) return null;
            const safeStart = Math.min(r.start, textNode.textContent?.length || 0);
            const safeEnd = Math.min(r.end, textNode.textContent?.length || 0);
            range.setStart(textNode, safeStart);
            range.setEnd(textNode, safeEnd);
            return range;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Range[];

      if (ranges.length > 0) {
        try {
          CSS.highlights.set(`highlight-group-${group.id}`, new Highlight(...ranges));
        } catch {
          // API may not be supported
        }
      }
    }

    return () => {
      CSS.highlights.clear();
    };
  }, [groups, text]);

  const generateCSS = useCallback(() => {
    const rules = groups.filter(g => g.active).map((g) =>
      `::highlight(highlight-group-${g.id}) {
  background-color: ${g.color};
  color: ${g.textColor};
  text-decoration: underline;
  text-decoration-color: ${g.textColor};
  text-decoration-thickness: ${g.thickness}px;
  text-underline-offset: 2px;
  border-radius: 2px;
}`
    ).join('\n\n');

    return rules;
  }, [groups]);

  const generateJS = useCallback(() => {
    const groupDefs = groups.filter(g => g.active).map((g) => {
      const rangeDefs = g.ranges.map((r) =>
        `    new Range().setStartAndEnd(textNode, ${r.start}, ${r.end})`
      ).join(',\n');
      return `  CSS.highlights.set('highlight-group-${g.id}', new Highlight(
${rangeDefs}
  ));`;
    }).join('\n\n');

    return `// Create a Range for each highlighted span
const textNode = document.querySelector('.content').firstChild;

${groupDefs}

// Clear all highlights
// CSS.highlights.clear();`;
  }, [groups]);

  const copyCode = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success(`${label} copied!`),
      () => toast.error('Copy failed')
    );
  }, []);

  const addGroup = useCallback(() => {
    const newGroup: HighlightGroup = {
      id: idCounter,
      name: `Highlight ${idCounter}`,
      color: PRESET_COLORS[(idCounter - 1) % PRESET_COLORS.length].bg,
      textColor: PRESET_COLORS[(idCounter - 1) % PRESET_COLORS.length].text,
      thickness: 2,
      ranges: [],
      active: true,
    };
    setGroups((prev) => [...prev, newGroup]);
    setActiveGroup(newGroup.id);
    setIdCounter((c) => c + 1);
  }, [idCounter]);

  const removeGroup = useCallback((id: number) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (activeGroup === id) {
      setActiveGroup(groups[0]?.id || 0);
    }
  }, [activeGroup, groups]);

  const toggleGroup = useCallback((id: number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, active: !g.active } : g))
    );
  }, []);

  const updateGroup = useCallback((id: number, field: string, value: any) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  }, []);

  const addRange = useCallback((groupId: number) => {
    if (mode === 'auto') {
      // Find all occurrences of the search term
      const currentGroup = groups.find(g => g.id === groupId);
      if (!currentGroup) return;

      const searchTerm = (document.querySelector('#search-term-input') as HTMLInputElement)?.value;
      if (!searchTerm) return;

      const newRanges: Array<{ start: number; end: number }> = [];
      let idx = text.indexOf(searchTerm);
      while (idx !== -1) {
        newRanges.push({ start: idx, end: idx + searchTerm.length });
        idx = text.indexOf(searchTerm, idx + 1);
      }

      if (newRanges.length === 0) {
        toast.error('No matches found');
        return;
      }

      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, ranges: newRanges } : g))
      );
      toast.success(`Found ${newRanges.length} occurrence${newRanges.length !== 1 ? 's' : ''}!`);
    } else {
      // Manual mode
      const start = parseInt(manualStart);
      const end = parseInt(manualEnd);
      if (isNaN(start) || isNaN(end) || start < 0 || end > text.length || start >= end) {
        toast.error('Invalid range — must be valid numbers within text bounds');
        return;
      }
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, ranges: [...g.ranges, { start, end }] } : g
        )
      );
      setManualStart('');
      setManualEnd('');
      toast.success('Range added!');
    }
  }, [mode, text, groups, manualStart, manualEnd]);

  const clearRanges = useCallback((groupId: number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ranges: [] } : g))
    );
  }, []);

  const currentGroup = groups.find((g) => g.id === activeGroup) || groups[0];

  return (
    <ToolLayout
      title="CSS Highlight API Playground"
      description="Explore the CSS Custom Highlight API — programmatically style arbitrary text ranges with ::highlight() pseudo-elements. No DOM modification, no reflow. Baseline 2026."
    >
      <style>{`
        .highlight-container::highlight(highlight-group-1) {
          background-color: rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          text-decoration: underline;
          text-decoration-color: #fca5a5;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
          border-radius: 2px;
        }
        ${groups.filter(g => g.active).map(g => `
        .highlight-container::highlight(highlight-group-${g.id}) {
          background-color: ${g.color};
          color: ${g.textColor};
          text-decoration: underline;
          text-decoration-color: ${g.textColor};
          text-decoration-thickness: ${g.thickness}px;
          text-underline-offset: 2px;
          border-radius: 2px;
        }
        `).join('\n')}
      `}</style>

      {/* Group Management */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            Highlight Groups
          </h3>
          <button
            onClick={addGroup}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Group
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition-all ${
                activeGroup === group.id
                  ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
                  : 'border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span>{group.name}</span>
              <span className="text-[10px] text-slate-600">
                ({group.ranges.length})
              </span>
              {!group.active && (
                <span className="text-[10px] text-slate-600">(off)</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeGroup(group.id); }}
                className="text-slate-600 hover:text-red-400 ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Active Group Editor */}
      {currentGroup && (
        <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Group Name</label>
              <input
                type="text"
                value={currentGroup.name}
                onChange={(e) => updateGroup(currentGroup.id, 'name', e.target.value)}
                className="w-full bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Background Color</label>
              <input
                type="text"
                value={currentGroup.color}
                onChange={(e) => updateGroup(currentGroup.id, 'color', e.target.value)}
                className="w-full bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Underline Thickness: <span className="text-brand-400">{currentGroup.thickness}px</span>
              </label>
              <input
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={currentGroup.thickness}
                onChange={(e) => updateGroup(currentGroup.id, 'thickness', parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PRESET_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => updateGroup(currentGroup.id, 'color', c.bg)}
                className={`p-2 rounded-lg border text-xs transition-all ${
                  currentGroup.color === c.bg
                    ? 'border-white/30 ring-1 ring-white/20'
                    : 'border-transparent hover:border-slate-600'
                }`}
                style={{ backgroundColor: c.bg }}
              >
                <span style={{ color: c.text }}>Color {i + 1}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={currentGroup.active}
                onChange={() => toggleGroup(currentGroup.id)}
                className="accent-brand-500 rounded"
              />
              Active
            </label>
            <button
              onClick={() => clearRanges(currentGroup.id)}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear {currentGroup.ranges.length} range{currentGroup.ranges.length !== 1 ? 's' : ''}
            </button>
          </div>

          {/* Range Adder */}
          <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">Add ranges by:</span>
              <button
                onClick={() => setMode('auto')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  mode === 'auto'
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                    : 'border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <SearchCheck className="w-3.5 h-3.5 inline mr-1" />
                Auto (Search Text)
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  mode === 'manual'
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                    : 'border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 inline mr-1" />
                Manual (Char Range)
              </button>
            </div>

            {mode === 'auto' ? (
              <div className="flex gap-2">
                <input
                  id="search-term-input"
                  type="text"
                  placeholder="Search term to highlight..."
                  className="flex-1 bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addRange(currentGroup.id);
                  }}
                />
                <button
                  onClick={() => addRange(currentGroup.id)}
                  className="px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 transition-colors text-sm"
                >
                  Find All
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  placeholder="Start (0-based)"
                  min="0"
                  max={text.length}
                  className="flex-1 bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60 font-mono"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="number"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  placeholder="End"
                  min="0"
                  max={text.length}
                  className="flex-1 bg-slate-800/70 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-brand-500/60 font-mono"
                />
                <button
                  onClick={() => addRange(currentGroup.id)}
                  className="px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 transition-colors text-sm"
                >
                  Add Range
                </button>
              </div>
            )}

            {/* Existing ranges for this group */}
            {currentGroup.ranges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {currentGroup.ranges.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700/50"
                  >
                    [{r.start}–{r.end}]
                    <button
                      onClick={() => {
                        setGroups((prev) =>
                          prev.map((g) =>
                            g.id === currentGroup.id
                              ? { ...g, ranges: g.ranges.filter((_, idx) => idx !== i) }
                              : g
                          )
                        );
                      }}
                      className="text-slate-600 hover:text-red-400 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Preview */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-400" />
          Live Preview
        </h3>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/40 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Using CSS Custom Highlight API (::highlight)</span>
            <span className="text-[10px] text-slate-500">
              {apiSupported ? '✓ API Supported' : '✕ API Not Supported'}
            </span>
          </div>
          <div
            ref={textContainerRef}
            className="highlight-container text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto p-3 rounded-lg bg-slate-950/50 border border-slate-800"
          >
            {text}
          </div>
        </div>
      </div>

      {/* Edit Text */}
      <details className="mb-6">
        <summary className="text-sm font-medium text-slate-400 hover:text-slate-300 cursor-pointer py-1">
          Edit Source Text
        </summary>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="mt-2 w-full bg-slate-800/70 text-slate-200 text-sm rounded-xl p-4 border border-slate-700 focus:outline-none focus:border-brand-500/60 font-mono leading-relaxed resize-y"
        />
      </details>

      {/* Generated Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* CSS */}
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              Generated CSS
            </h3>
            <button
              onClick={() => copyCode(generateCSS(), 'CSS')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <pre className="text-xs text-slate-300 bg-slate-900/60 rounded-lg p-3 border border-slate-700/30 overflow-x-auto font-mono leading-relaxed max-h-[400px] overflow-y-auto">
            <code>{generateCSS() || '// No active highlight groups'}</code>
          </pre>
        </div>

        {/* JS */}
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              Generated JavaScript
            </h3>
            <button
              onClick={() => copyCode(generateJS(), 'JavaScript')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <pre className="text-xs text-slate-300 bg-slate-900/60 rounded-lg p-3 border border-slate-700/30 overflow-x-auto font-mono leading-relaxed max-h-[400px] overflow-y-auto">
            <code>{generateJS() || '// No active highlight groups'}</code>
          </pre>
        </div>
      </div>

      {/* API Info */}
      <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          About the CSS Custom Highlight API
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-1">🌐 Browser Support (Baseline 2026)</div>
            <p>Chrome 105+, Safari 17.2+, Firefox 132+. All major browsers ship this API.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-1">✨ Why It Matters</div>
            <p>Style text ranges without DOM mutation. Highlights paint on top of existing rendering — no reflow, no layout shift. Multiple independent highlights coexist on the same text.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-1">🎯 Use Cases</div>
            <p>Search-in-page highlighting, grammar/spell-check underlines, collaborative editing cursors, code editor syntax errors, rich text annotations.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-1">📋 Key APIs</div>
            <p><code className="text-brand-400">new Highlight(...ranges)</code>, <code className="text-brand-400">CSS.highlights.set()</code>, <code className="text-brand-400">::highlight(name)</code> pseudo-element, <code className="text-brand-400">HighlightRegistry</code></p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Read the full spec on{' '}
          <a href="https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">MDN</a>.
        </p>
      </div>
    </ToolLayout>
  );
}
