'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Plus, Trash2, ChevronDown, ChevronUp, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type FontDisplay =
  | 'auto'
  | 'block'
  | 'swap'
  | 'fallback'
  | 'optional';

type FontStyle = 'normal' | 'italic' | 'oblique';

interface FontSource {
  url: string;
  format: string;
  priority: number;
}

interface FontFaceConfig {
  fontFamily: string;
  fontWeight: number;
  fontStyle: FontStyle;
  fontDisplay: FontDisplay;
  fontStretch: string;
  unicodeRange: string;
  sources: FontSource[];
}

interface Preset {
  name: string;
  description: string;
  config: FontFaceConfig;
  sampleText: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Google Fonts (Inter)',
    description: 'Typical Google Fonts setup with woff2 priority',
    sampleText: 'The quick brown fox jumps over the lazy dog.',
    config: {
      fontFamily: 'Inter',
      fontWeight: 400,
      fontStyle: 'normal',
      fontDisplay: 'swap',
      fontStretch: 'normal',
      unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
      sources: [
        { url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf', format: 'woff2', priority: 1 },
      ],
    },
  },
  {
    name: 'Self-Hosted (Full Stack)',
    description: 'Self-hosted with multiple formats for broad support',
    sampleText: 'Custom typefaces make brands unforgettable.',
    config: {
      fontFamily: 'BrandFont',
      fontWeight: 700,
      fontStyle: 'normal',
      fontDisplay: 'block',
      fontStretch: 'normal',
      unicodeRange: '',
      sources: [
        { url: '/fonts/brand-bold.woff2', format: 'woff2', priority: 1 },
        { url: '/fonts/brand-bold.woff', format: 'woff', priority: 2 },
        { url: '/fonts/brand-bold.ttf', format: 'truetype', priority: 3 },
      ],
    },
  },
  {
    name: 'Variable Font',
    description: 'Variable font with weight range',
    sampleText: 'Variable fonts — one file, infinite possibilities.',
    config: {
      fontFamily: 'Recursive',
      fontWeight: 300,
      fontStyle: 'normal',
      fontDisplay: 'swap',
      fontStretch: '75% 125%',
      unicodeRange: '',
      sources: [
        { url: '/fonts/recursive.woff2', format: 'woff2-variations', priority: 1 },
      ],
    },
  },
  {
    name: 'Icon Font',
    description: 'Icon font with font-display: block',
    sampleText: '★ ☆ ♥ ♠ ♦ ♣ ✓ ✗ → ← ↑ ↓',
    config: {
      fontFamily: 'Material Icons',
      fontWeight: 400,
      fontStyle: 'normal',
      fontDisplay: 'block',
      fontStretch: 'normal',
      unicodeRange: '',
      sources: [
        { url: '/fonts/material-icons.woff2', format: 'woff2', priority: 1 },
      ],
    },
  },
  {
    name: 'Italic Variant',
    description: 'Italic style with oblique fallback',
    sampleText: 'A gentle italic whisper carries weight.',
    config: {
      fontFamily: 'Merriweather',
      fontWeight: 400,
      fontStyle: 'italic',
      fontDisplay: 'swap',
      fontStretch: 'normal',
      unicodeRange: '',
      sources: [
        { url: '/fonts/merriweather-italic.woff2', format: 'woff2', priority: 1 },
        { url: '/fonts/merriweather-italic.woff', format: 'woff', priority: 2 },
      ],
    },
  },
  {
    name: 'Performance (optional)',
    description: 'font-display: optional — fastest load, may not show custom font',
    sampleText: 'Speed matters. Render fast, enhance when ready.',
    config: {
      fontFamily: 'JetBrains Mono',
      fontWeight: 400,
      fontStyle: 'normal',
      fontDisplay: 'optional',
      fontStretch: 'normal',
      unicodeRange: '',
      sources: [
        { url: '/fonts/jetbrains-mono.woff2', format: 'woff2', priority: 1 },
      ],
    },
  },
  {
    name: 'Bold + Normal Pair',
    description: 'Bold weight with normal style — common body text',
    sampleText: 'Headings demand attention. Body text invites reading.',
    config: {
      fontFamily: 'Open Sans',
      fontWeight: 700,
      fontStyle: 'normal',
      fontDisplay: 'swap',
      fontStretch: 'normal',
      unicodeRange: '',
      sources: [
        { url: '/fonts/open-sans-bold.woff2', format: 'woff2', priority: 1 },
      ],
    },
  },
  {
    name: 'Extended Unicode',
    description: 'Full Latin + Cyrillic + Greek character coverage',
    sampleText: 'Hello • Привет • Γεια σας • 你好 — one font, many scripts.',
    config: {
      fontFamily: 'Noto Sans',
      fontWeight: 400,
      fontStyle: 'normal',
      fontDisplay: 'swap',
      fontStretch: 'normal',
      unicodeRange: 'U+0000-00FF, U+0100-024F, U+0370-03FF, U+0400-04FF, U+2000-206F, U+2070-209F, U+20A0-20CF, U+2100-214F, U+2150-218F, U+2190-21FF, U+2200-22FF, U+2300-23FF',
      sources: [
        { url: '/fonts/noto-sans.woff2', format: 'woff2', priority: 1 },
      ],
    },
  },
];

const FONT_DISPLAY_OPTIONS: { value: FontDisplay; label: string; tooltip: string }[] = [
  { value: 'auto', label: 'auto', tooltip: 'Browser default — usually "block"' },
  { value: 'block', label: 'block', tooltip: 'Invisible text until font loads (up to 3s), then fallback' },
  { value: 'swap', label: 'swap', tooltip: 'Fallback text immediately, swap when font loads — best UX' },
  { value: 'fallback', label: 'fallback', tooltip: 'Invisible for ~100ms, then fallback, no swap after load' },
  { value: 'optional', label: 'optional', tooltip: 'Invisible for ~100ms, then fallback — font may never load if slow' },
];

const FONT_WEIGHT_PRESETS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const FORMAT_OPTIONS = [
  'woff2',
  'woff2-variations',
  'woff',
  'truetype',
  'opentype',
  'opentype-variations',
  'embedded-opentype',
  'svg',
];

// ── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: FontFaceConfig = {
  fontFamily: 'MyCustomFont',
  fontWeight: 400,
  fontStyle: 'normal',
  fontDisplay: 'swap',
  fontStretch: 'normal',
  unicodeRange: '',
  sources: [
    { url: '/fonts/my-font.woff2', format: 'woff2', priority: 1 },
    { url: '/fonts/my-font.woff', format: 'woff', priority: 2 },
  ],
};

const DEFAULT_SAMPLE = 'Pack my box with five dozen liquor jugs.';

// ── Utilities ──────────────────────────────────────────────────────────────

function buildFontFaceCSS(config: FontFaceConfig): string {
  const lines: string[] = ['@font-face {'];

  lines.push(`  font-family: '${config.fontFamily}';`);
  lines.push(`  font-weight: ${config.fontWeight};`);
  lines.push(`  font-style: ${config.fontStyle};`);
  lines.push(`  font-display: ${config.fontDisplay};`);

  if (config.fontStretch !== 'normal') {
    lines.push(`  font-stretch: ${config.fontStretch};`);
  }

  if (config.unicodeRange.trim()) {
    lines.push(`  unicode-range: ${config.unicodeRange.trim()};`);
  }

  // Sort sources by priority
  const sorted = [...config.sources].sort((a, b) => a.priority - b.priority);
  if (sorted.length === 1) {
    lines.push(`  src: url('${sorted[0].url}') format('${sorted[0].format}');`);
  } else {
    const srcLines = sorted.map(
      (s, i) => `       url('${s.url}') format('${s.format}')${i < sorted.length - 1 ? ',' : ';'}`
    );
    lines.push(`  src: ${srcLines[0]}`);
    srcLines.slice(1).forEach((l) => lines.push(`       ${l}`));
  }

  lines.push('}');
  return lines.join('\n');
}

function buildStyleTag(config: FontFaceConfig): string {
  return `<style>\n${buildFontFaceCSS(config)}\n</style>`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FontFaceGenerator() {
  const [config, setConfig] = useState<FontFaceConfig>(DEFAULT_CONFIG);
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE);
  const [expanded, setExpanded] = useState(false);

  const generatedCSS = useMemo(() => buildFontFaceCSS(config), [config]);

  const update = useCallback(
    (patch: Partial<FontFaceConfig>) => setConfig((c) => ({ ...c, ...patch })),
    []
  );

  const updateSource = useCallback(
    (idx: number, patch: Partial<FontSource>) =>
      setConfig((c) => ({
        ...c,
        sources: c.sources.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      })),
    []
  );

  const addSource = useCallback(() => {
    setConfig((c) => ({
      ...c,
      sources: [
        ...c.sources,
        {
          url: '/fonts/extra-font.woff2',
          format: 'woff2',
          priority: c.sources.length + 1,
        },
      ],
    }));
  }, []);

  const removeSource = useCallback(
    (idx: number) =>
      setConfig((c) => ({
        ...c,
        sources: c.sources
          .filter((_, i) => i !== idx)
          .map((s, i) => ({ ...s, priority: i + 1 })),
      })),
    []
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      setConfig(preset.config);
      setSampleText(preset.sampleText);
    },
    []
  );

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setSampleText(DEFAULT_SAMPLE);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS);
    toast.success('CSS copied to clipboard!');
  }, [generatedCSS]);

  const copyHTML = useCallback(() => {
    navigator.clipboard.writeText(buildStyleTag(config));
    toast.success('HTML <style> tag copied!');
  }, [config]);

  const downloadCSS = useCallback(() => {
    const blob = new Blob([generatedCSS], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'font-face.css';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('font-face.css downloaded!');
  }, [generatedCSS]);

  const previewStyle = useMemo(
    () => ({
      fontFamily: `'${config.fontFamily}', sans-serif`,
      fontWeight: config.fontWeight,
      fontStyle: config.fontStyle,
      fontDisplay: config.fontDisplay,
    }),
    [config]
  );

  return (
    <ToolLayout
      title="CSS @font-face Generator"
      description="Build production-ready @font-face declarations. Configure font family, weight, style, display strategy, and source URLs — then copy, download, or embed."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyCSS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button
            onClick={copyHTML}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Copy &lt;style&gt;
          </button>
          <button
            onClick={downloadCSS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSS
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left Column: Configuration ────────────────────────────────── */}
        <div className="space-y-6">
          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Font Family
            </label>
            <input
              type="text"
              value={config.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              placeholder="Inter"
            />
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Weight: <span className="text-brand-400">{config.fontWeight}</span>
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {FONT_WEIGHT_PRESETS.map((w) => (
                <button
                  key={w}
                  onClick={() => update({ fontWeight: w })}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    config.fontWeight === w
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Style
            </label>
            <div className="flex items-center gap-2">
              {(['normal', 'italic', 'oblique'] as FontStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => update({ fontStyle: style })}
                  className={`px-4 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                    config.fontStyle === style
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Font Display */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Display
            </label>
            <div className="space-y-1.5">
              {FONT_DISPLAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ fontDisplay: opt.value })}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    config.fontDisplay === opt.value
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-slate-900 px-1.5 py-0.5 rounded">{opt.value}</code>
                    <span className="text-sm">{opt.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 ml-0.5">{opt.tooltip}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Font Stretch */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Font Stretch
            </label>
            <input
              type="text"
              value={config.fontStretch}
              onChange={(e) => update({ fontStretch: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              placeholder="normal"
            />
            <p className="text-xs text-slate-500 mt-1">
              e.g. &apos;normal&apos;, &apos;75%&apos;, &apos;100% 200%&apos; (for variable fonts)
            </p>
          </div>

          {/* Unicode Range */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Unicode Range{' '}
              <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={config.unicodeRange}
              onChange={(e) => update({ unicodeRange: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              placeholder="U+0000-00FF"
            />
            <p className="text-xs text-slate-500 mt-1">
              Comma-separated Unicode code points or ranges
            </p>
          </div>

          {/* Sources */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Font Sources</label>
              <button
                onClick={addSource}
                className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Source
              </button>
            </div>
            <div className="space-y-2">
              {config.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg"
                >
                  <span className="text-xs text-slate-500 font-mono w-4">#{src.priority}</span>
                  <input
                    type="text"
                    value={src.url}
                    onChange={(e) => updateSource(idx, { url: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    placeholder="/fonts/my-font.woff2"
                  />
                  <select
                    value={src.format}
                    onChange={(e) => updateSource(idx, { format: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  {config.sources.length > 1 && (
                    <button
                      onClick={() => removeSource(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                      title="Remove source"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Output & Preview ─────────────────────────────── */}
        <div className="space-y-6">
          {/* Generated CSS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Generated CSS</label>
              <button
                onClick={copyCSS}
                className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm text-green-300 font-mono whitespace-pre">
                {generatedCSS}
              </code>
            </pre>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Live Preview
            </label>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-300 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              placeholder="Enter preview text..."
            />
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 min-h-[100px] flex items-center justify-center">
              <p
                style={previewStyle}
                className="text-slate-100 text-2xl text-center leading-relaxed"
              >
                {sampleText}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>font-family: &apos;{config.fontFamily}&apos;</span>
              <span>·</span>
              <span>weight: {config.fontWeight}</span>
              <span>·</span>
              <span>style: {config.fontStyle}</span>
              <span>·</span>
              <span>display: {config.fontDisplay}</span>
              {config.unicodeRange && (
                <>
                  <span>·</span>
                  <span className="text-slate-400 truncate max-w-[200px]">
                    unicode-range: {config.unicodeRange.slice(0, 40)}...
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Presets */}
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors mb-2"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Presets ({PRESETS.length})
            </button>
            {expanded && (
              <div className="grid grid-cols-1 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="text-left p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-brand-500/40 transition-colors group"
                  >
                    <div className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                      {p.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                    <div className="text-xs text-slate-600 mt-1 font-mono truncate">
                      {p.sampleText}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pro Tips */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2">💡 Pro Tips</h3>
            <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
              <li>Always include <code className="text-xs bg-slate-900 px-1 rounded">woff2</code> first — it&apos;s 30% smaller than woff.</li>
              <li>Use <code className="text-xs bg-slate-900 px-1 rounded">font-display: swap</code> for the best UX — text appears immediately.</li>
              <li>For icon fonts, use <code className="text-xs bg-slate-900 px-1 rounded">font-display: block</code> to prevent FOUC.</li>
              <li>Add <code className="text-xs bg-slate-900 px-1 rounded">unicode-range</code> to split fonts across character sets — faster page loads.</li>
              <li>Match font-weight exactly to the weight in the font file — don&apos;t use 700 if the file is 400.</li>
              <li>For variable fonts, set a weight <em>range</em> using the paired @font-face pattern.</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
