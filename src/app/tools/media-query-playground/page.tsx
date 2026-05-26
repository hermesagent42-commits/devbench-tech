'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Monitor,
  Smartphone,
  Tablet,
  Sun,
  Moon,
  MousePointer,
  Hand,
  Palette,
  Grid3X3,
  Maximize2,
  RotateCcw,
  Copy,
  Play,
  Check,
  X,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Info,
  Eye,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  category: string;
  query: string;
  description: string;
  icon: React.ReactNode;
}

interface SavedQuery {
  id: string;
  query: string;
  matches: boolean;
  timestamp: number;
}

interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: string;
  colorScheme: string;
  reducedMotion: boolean;
  hover: string;
  pointer: string;
}

// ── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  // ── Common Breakpoints ──────────────────────────────────────────────────
  {
    label: 'Mobile (sm)',
    category: 'Breakpoints',
    query: '(max-width: 640px)',
    description: 'Matches screens ≤ 640px wide (small phones)',
    icon: <Smartphone className="w-3.5 h-3.5" />,
  },
  {
    label: 'Tablet (md)',
    category: 'Breakpoints',
    query: '(min-width: 641px) and (max-width: 1024px)',
    description: 'Matches screens between 641px–1024px wide (tablets)',
    icon: <Tablet className="w-3.5 h-3.5" />,
  },
  {
    label: 'Desktop (lg)',
    category: 'Breakpoints',
    query: '(min-width: 1025px)',
    description: 'Matches screens ≥ 1025px wide (desktops)',
    icon: <Monitor className="w-3.5 h-3.5" />,
  },
  {
    label: 'Extra Large (xl)',
    category: 'Breakpoints',
    query: '(min-width: 1280px)',
    description: 'Matches screens ≥ 1280px wide',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
  },
  {
    label: '2XL',
    category: 'Breakpoints',
    query: '(min-width: 1536px)',
    description: 'Matches screens ≥ 1536px wide',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
  },

  // ── Orientation & Display ───────────────────────────────────────────────
  {
    label: 'Landscape',
    category: 'Orientation',
    query: '(orientation: landscape)',
    description: 'Matches when viewport width > height',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
  },
  {
    label: 'Portrait',
    category: 'Orientation',
    query: '(orientation: portrait)',
    description: 'Matches when viewport height > width',
    icon: <Smartphone className="w-3.5 h-3.5" />,
  },
  {
    label: 'Retina / HiDPI',
    category: 'Display',
    query: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
    description: 'Matches high-DPI / Retina displays',
    icon: <Eye className="w-3.5 h-3.5" />,
  },

  // ── User Preferences ────────────────────────────────────────────────────
  {
    label: 'Dark Mode',
    category: 'User Preferences',
    query: '(prefers-color-scheme: dark)',
    description: 'Matches when the user prefers a dark color scheme',
    icon: <Moon className="w-3.5 h-3.5" />,
  },
  {
    label: 'Light Mode',
    category: 'User Preferences',
    query: '(prefers-color-scheme: light)',
    description: 'Matches when the user prefers a light color scheme',
    icon: <Sun className="w-3.5 h-3.5" />,
  },
  {
    label: 'Reduced Motion',
    category: 'User Preferences',
    query: '(prefers-reduced-motion: reduce)',
    description: 'Matches when the user prefers minimal motion/animations',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    label: 'High Contrast',
    category: 'User Preferences',
    query: '(prefers-contrast: high)',
    description: 'Matches when the user prefers high contrast',
    icon: <Palette className="w-3.5 h-3.5" />,
  },
  {
    label: 'Reduced Data',
    category: 'User Preferences',
    query: '(prefers-reduced-data: reduce)',
    description: 'Matches when the user prefers reduced data usage',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    label: 'Reduced Transparency',
    category: 'User Preferences',
    query: '(prefers-reduced-transparency: reduce)',
    description: 'Matches when the user prefers reduced transparency',
    icon: <Eye className="w-3.5 h-3.5" />,
  },

  // ── Device Capabilities ─────────────────────────────────────────────────
  {
    label: 'Has Hover',
    category: 'Device Features',
    query: '(hover: hover)',
    description: 'Matches devices with a hover-capable pointer (mice, trackpads)',
    icon: <MousePointer className="w-3.5 h-3.5" />,
  },
  {
    label: 'No Hover',
    category: 'Device Features',
    query: '(hover: none)',
    description: 'Matches devices without hover (touch screens)',
    icon: <Hand className="w-3.5 h-3.5" />,
  },
  {
    label: 'Fine Pointer',
    category: 'Device Features',
    query: '(pointer: fine)',
    description: 'Matches devices with precise pointing (mouse, stylus)',
    icon: <MousePointer className="w-3.5 h-3.5" />,
  },
  {
    label: 'Coarse Pointer',
    category: 'Device Features',
    query: '(pointer: coarse)',
    description: 'Matches devices with limited accuracy (touch)',
    icon: <Hand className="w-3.5 h-3.5" />,
  },
  {
    label: 'P3 Color Gamut',
    category: 'Device Features',
    query: '(color-gamut: p3)',
    description: 'Matches devices supporting Display P3 wide color gamut',
    icon: <Palette className="w-3.5 h-3.5" />,
  },
  {
    label: 'SRGB Color',
    category: 'Device Features',
    query: '(color-gamut: srgb)',
    description: 'Matches devices with sRGB color support',
    icon: <Palette className="w-3.5 h-3.5" />,
  },
  {
    label: 'Dynamic Range: High',
    category: 'Device Features',
    query: '(dynamic-range: high)',
    description: 'Matches HDR-capable displays',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
];

const CATEGORIES = ['All', 'Breakpoints', 'Orientation', 'Display', 'User Preferences', 'Device Features'];

// ── Utility ─────────────────────────────────────────────────────────────────

function testQuery(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function getViewportInfo(): ViewportInfo {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    orientation: window.innerWidth > window.innerHeight ? 'Landscape' : 'Portrait',
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hover: window.matchMedia('(hover: hover)').matches ? 'Hover supported' : 'No hover (touch)',
    pointer: window.matchMedia('(pointer: fine)').matches ? 'Fine (mouse/stylus)' : 'Coarse (touch)',
  };
}

function generateMediaCSS(query: string): string {
  return `@media ${query} {\n  /* Your styles here */\n}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function MediaQueryPlaygroundPage() {
  const [query, setQuery] = useState('(min-width: 1025px)');
  const [matches, setMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    devicePixelRatio: 1,
    orientation: 'Landscape',
    colorScheme: 'Light',
    reducedMotion: false,
    hover: 'Unknown',
    pointer: 'Unknown',
  });
  const [activeCategory, setActiveCategory] = useState('All');
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [searchPresets, setSearchPresets] = useState('');
  const queryInputRef = useRef<HTMLInputElement>(null);

  // Evaluate media query
  const evaluate = useCallback((mq: string) => {
    const trimmed = mq.trim();
    if (!trimmed) {
      setMatches(false);
      setError(null);
      return;
    }
    try {
      const result = testQuery(trimmed);
      setMatches(result);
      setError(null);
    } catch (e) {
      setMatches(false);
      setError((e as Error).message || 'Invalid media query');
    }
  }, []);

  // Update viewport info and re-evaluate
  useEffect(() => {
    const update = () => {
      setViewport(getViewportInfo());
      evaluate(query);
    };
    update();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(update, 100);
    };

    window.addEventListener('resize', handleResize);
    // Also listen for orientationchange
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [query, evaluate]);

  // Copy helpers
  const copyCSS = useCallback(() => {
    const css = generateMediaCSS(query);
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [query]);

  const copyQuery = useCallback(() => {
    navigator.clipboard.writeText(query).then(
      () => toast.success('Query copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [query]);

  // Save current query
  const saveQuery = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSavedQueries((prev) => {
      const exists = prev.some((s) => s.query === trimmed);
      if (exists) return prev;
      return [
        { id: Date.now().toString(), query: trimmed, matches, timestamp: Date.now() },
        ...prev.slice(0, 19),
      ];
    });
    toast.success('Query saved!');
  }, [query, matches]);

  const removeSaved = useCallback((id: string) => {
    setSavedQueries((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const loadSaved = useCallback((saved: SavedQuery) => {
    setQuery(saved.query);
    queryInputRef.current?.focus();
  }, []);

  const filteredPresets = PRESETS.filter((p) => {
    const catMatch = activeCategory === 'All' || p.category === activeCategory;
    const searchMatch = !searchPresets || p.label.toLowerCase().includes(searchPresets.toLowerCase()) || p.description.toLowerCase().includes(searchPresets.toLowerCase());
    return catMatch && searchMatch;
  });

  return (
    <ToolLayout
      title="Media Query Playground"
      description="Test CSS media queries against your live viewport — breakpoints, user preferences, device features, and more. Real-time results that update on resize."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Panel: Query Editor + Results ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Viewport Info Bar */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-brand-400" />
              <h2 className="text-white font-semibold text-sm">Live Viewport</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Width', value: `${viewport.width}px` },
                { label: 'Height', value: `${viewport.height}px` },
                { label: 'DPR', value: `${viewport.devicePixelRatio}x` },
                { label: 'Orientation', value: viewport.orientation },
                { label: 'Color Scheme', value: viewport.colorScheme },
                { label: 'Reduced Motion', value: viewport.reducedMotion ? 'Yes' : 'No' },
                { label: 'Hover', value: viewport.hover },
                { label: 'Pointer', value: viewport.pointer },
              ].map((item) => (
                <div key={item.label} className="bg-surface border border-slate-600/30 rounded-md px-3 py-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
                  <div className="text-xs text-slate-200 font-mono mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Resize your browser to see viewport changes in real-time
            </p>
          </div>

          {/* Query Input */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-brand-400" />
              <h2 className="text-white font-semibold text-sm">Media Query</h2>
            </div>

            <div className="flex gap-2">
              <input
                ref={queryInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. (min-width: 1025px) or (prefers-color-scheme: dark)"
                className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-slate-600/50 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50 placeholder:text-slate-500"
              />
              <button
                onClick={saveQuery}
                className="px-3 py-2 rounded-lg bg-surface border border-slate-600/50 text-slate-400 hover:text-white hover:border-brand-500/50 transition-all"
                title="Save query"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Result */}
            <div className={`p-4 rounded-lg border flex items-center gap-3 transition-all ${
              error
                ? 'border-red-500/30 bg-red-500/5'
                : matches
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-slate-600/30 bg-slate-500/5'
            }`}>
              {error ? (
                <>
                  <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-300">Invalid Query</div>
                    <div className="text-xs text-red-400/70 font-mono mt-0.5">{error}</div>
                  </div>
                </>
              ) : (
                <>
                  {matches ? (
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className={`text-sm font-medium ${matches ? 'text-green-300' : 'text-slate-300'}`}>
                      {matches ? '✅ Media query matches' : '❌ Media query does NOT match'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {matches
                        ? 'The current viewport satisfies this media query.'
                        : 'The current viewport does not satisfy this media query.'}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Generated CSS */}
            <div className="bg-[#0d1117] rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
                <span className="text-xs text-slate-400 font-mono">Generated CSS</span>
                <button
                  onClick={copyCSS}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy CSS
                </button>
              </div>
              <pre className="p-4 text-sm font-mono text-slate-300 overflow-x-auto">
                <code>{generateMediaCSS(query)}</code>
              </pre>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={copyQuery} className="btn-secondary text-xs flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                Copy Query
              </button>
              <button onClick={copyCSS} className="btn-secondary text-xs flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                Copy CSS Block
              </button>
            </div>
          </div>

          {/* Saved Queries */}
          {savedQueries.length > 0 && (
            <div className="card space-y-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Saved Queries ({savedQueries.length})
              </h2>
              <div className="space-y-1.5">
                {savedQueries.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-slate-600/30 hover:border-brand-500/30 transition-all group"
                  >
                    {saved.matches ? (
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    )}
                    <button
                      onClick={() => loadSaved(saved)}
                      className="flex-1 text-left text-xs font-mono text-slate-300 truncate hover:text-white"
                    >
                      {saved.query}
                    </button>
                    <button
                      onClick={() => removeSaved(saved.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: Presets ── */}
        <div className="space-y-5">
          {/* Category Tabs */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-brand-400" />
              Presets
            </h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchPresets}
                onChange={(e) => setSearchPresets(e.target.value)}
                placeholder="Search presets..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-surface border border-slate-600/50 text-white text-xs focus:outline-none focus:border-brand-500/50 placeholder:text-slate-500"
              />
            </div>

            {/* Category Chips */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Preset Cards */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredPresets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No presets match your search.</p>
              ) : (
                filteredPresets.map((preset) => {
                  const isActive = query === preset.query;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setQuery(preset.query);
                        queryInputRef.current?.focus();
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isActive
                          ? 'border-brand-500/40 bg-brand-500/10'
                          : 'border-slate-600/30 bg-surface hover:border-brand-500/30 hover:bg-surface-light'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-slate-400">{preset.icon}</span>
                        <span className={`text-xs font-semibold ${isActive ? 'text-brand-300' : 'text-white'}`}>
                          {preset.label}
                        </span>
                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-700/40">
                          {preset.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mb-1">{preset.query}</div>
                      <div className="text-[11px] text-slate-500">{preset.description}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Reference */}
          <div className="card space-y-2">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-400" />
              Syntax Reference
            </h2>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <code className="text-brand-300 font-mono text-[11px] bg-brand-500/10 px-1.5 py-0.5 rounded">@media</code>
                <span>At-rule that applies styles conditionally</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-green-300 font-mono text-[11px] bg-green-500/10 px-1.5 py-0.5 rounded">and</code>
                <span>Combine multiple conditions (all must match)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-yellow-300 font-mono text-[11px] bg-yellow-500/10 px-1.5 py-0.5 rounded">,</code>
                <span>OR operator — match any condition separated by commas</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-purple-300 font-mono text-[11px] bg-purple-500/10 px-1.5 py-0.5 rounded">not</code>
                <span>Negate a media query</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-pink-300 font-mono text-[11px] bg-pink-500/10 px-1.5 py-0.5 rounded">only</code>
                <span>Hide from legacy browsers (rarely needed)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
