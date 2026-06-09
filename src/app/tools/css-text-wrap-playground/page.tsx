'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Code, Eye, EyeOff, RefreshCw, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type TextWrapMode = 'wrap' | 'balance' | 'pretty' | 'stable';

interface Preset {
  label: string;
  description: string;
  text: string;
  suggestedMode: TextWrapMode;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  maxWidth: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    label: 'Hero Headline',
    description: 'A bold headline that benefits from balanced wrapping',
    text: 'Build Better Web Apps with Modern Platform APIs',
    suggestedMode: 'balance',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '2.25rem',
    lineHeight: '1.2',
    maxWidth: '500px',
  },
  {
    label: 'Product Description',
    description: 'A paragraph where pretty wrapping avoids orphans',
    text: 'DevBench is the ultimate developer toolkit. Format JSON, encode Base64, generate UUIDs, test regex, build CSS gradients, and so much more — all right in your browser with zero data sent to any server.',
    suggestedMode: 'pretty',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '450px',
  },
  {
    label: 'Caption / Badge Text',
    description: 'Short caption with balanced multi-line wrapping',
    text: 'This item is currently out of stock but will be available again next week.',
    suggestedMode: 'balance',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '0.8rem',
    lineHeight: '1.4',
    maxWidth: '260px',
  },
  {
    label: 'Code Comment',
    description: 'A longer comment where stable wrapping avoids reflow',
    text: '// TODO: Refactor this section to use the new streaming API once the backend team ships the v2 endpoint. Currently using polling which is fine for MVP but will not scale to 10k concurrent users.',
    suggestedMode: 'stable',
    fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    maxWidth: '380px',
  },
  {
    label: 'Notification Toast',
    description: 'Short notification text balanced for compact display',
    text: 'Your changes have been saved successfully. Refresh to see the latest version.',
    suggestedMode: 'balance',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '0.875rem',
    lineHeight: '1.4',
    maxWidth: '280px',
  },
  {
    label: 'Blog Intro',
    description: 'A compelling intro paragraph with pretty wrapping',
    text: 'The web platform is evolving faster than ever. From CSS nesting to the View Transitions API, browser vendors are shipping features that eliminate entire categories of JavaScript dependencies. Here is what you need to know.',
    suggestedMode: 'pretty',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1.125rem',
    lineHeight: '1.7',
    maxWidth: '420px',
  },
  {
    label: 'Empty State',
    description: 'Centered empty-state message balanced across lines',
    text: 'No items found. Try adjusting your filters or create a new project to get started.',
    suggestedMode: 'balance',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    maxWidth: '300px',
  },
];

// ── Mode descriptions ──────────────────────────────────────────────────────

const MODE_INFO: Record<TextWrapMode, { label: string; css: string; description: string; support: string }> = {
  wrap: {
    label: 'wrap (default)',
    css: 'text-wrap: wrap;',
    description: 'Standard text wrapping — fills each line to the container edge, then breaks. Lines can be very uneven in length.',
    support: 'Everywhere since CSS 2.1',
  },
  balance: {
    label: 'balance',
    css: 'text-wrap: balance;',
    description: 'Balances line lengths so each line is roughly the same width. Especially effective for headings and short blocks of text. Limited to 6 lines maximum — beyond that, falls back to normal wrapping.',
    support: 'Chrome 114+, Firefox 121+, Safari 17.5+ — Baseline 2024',
  },
  pretty: {
    label: 'pretty',
    css: 'text-wrap: pretty;',
    description: 'Prevents orphans — single words dangling on the last line. Optimizes for typographic quality rather than line-length evenness. Ideal for body text and paragraphs.',
    support: 'Chrome 117+, Firefox 130+, Safari 18.0+ — Baseline 2025',
  },
  stable: {
    label: 'stable',
    css: 'text-wrap: stable;',
    description: 'Prevents content reflow when text is edited — lines stay in their original positions even as surrounding text changes. Essential for live-editing UIs, chat, and collaborative documents.',
    support: 'Chrome 133+ only — not yet Baseline',
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function CssTextWrapPlaygroundPage() {
  const [text, setText] = useState(PRESETS[0].text);
  const [mode, setMode] = useState<TextWrapMode>(PRESETS[0].suggestedMode);
  const [fontFamily, setFontFamily] = useState(PRESETS[0].fontFamily);
  const [fontSize, setFontSize] = useState(PRESETS[0].fontSize);
  const [lineHeight, setLineHeight] = useState(PRESETS[0].lineHeight);
  const [maxWidth, setMaxWidth] = useState(PRESETS[0].maxWidth);
  const [showComparison, setShowComparison] = useState(true);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [activePreset, setActivePreset] = useState(0);

  const applyPreset = useCallback((preset: Preset, idx: number) => {
    setText(preset.text);
    setMode(preset.suggestedMode);
    setFontFamily(preset.fontFamily);
    setFontSize(preset.fontSize);
    setLineHeight(preset.lineHeight);
    setMaxWidth(preset.maxWidth);
    setActivePreset(idx);
  }, []);

  const resetToDefault = useCallback(() => {
    applyPreset(PRESETS[0], 0);
  }, [applyPreset]);

  // Build CSS output
  const cssOutput = `.text-wrap-demo {
  text-wrap: ${mode};
  font-family: ${fontFamily};
  font-size: ${fontSize};
  line-height: ${lineHeight};
  max-width: ${maxWidth};
}`;

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput);
    toast.success('CSS copied!');
  }, [cssOutput]);

  // Style for the preview element
  const previewStyle: React.CSSProperties = {
    textWrap: mode,
    fontFamily,
    fontSize,
    lineHeight,
    maxWidth,
    wordBreak: 'break-word',
  };

  // Default mode for comparison (always 'wrap')
  const comparisonStyle: React.CSSProperties = {
    textWrap: 'wrap',
    fontFamily,
    fontSize,
    lineHeight,
    maxWidth,
    wordBreak: 'break-word',
  };

  // Count lines for comparison metrics
  const countLines = useCallback((t: string, width: string): number => {
    // Rough estimate: measure average chars per line
    const widthPx = parseInt(width) || 400;
    const fontSizePx = parseFloat(fontSize) * 16; // assume 1rem = 16px base
    const avgCharWidth = fontSizePx * 0.55; // rough monospace equivalent
    const charsPerLine = Math.max(1, Math.floor(widthPx / avgCharWidth));
    return Math.ceil(t.length / charsPerLine);
  }, [fontSize]);

  const modeInfo = MODE_INFO[mode];

  return (
    <ToolLayout
      title="CSS text-wrap Playground"
      description="Explore text-wrap: balance, pretty, and stable — the new CSS features that eliminate ragged edges, orphans, and unwanted reflows. Compare modes side-by-side and get production-ready CSS."
    >
      <div className="space-y-10">
        {/* Presets */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Presets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset, idx)}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-all border ${
                  activePreset === idx
                    ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                    : 'bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/60 hover:text-slate-300'
                }`}
              >
                <div className="font-medium text-[11px]">{preset.label}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Text Editor */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5" />
              Text
            </h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700/50 text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 resize-y"
              placeholder="Type or paste your text here..."
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {text.length} characters — edit freely to test wrapping behavior
            </p>
          </div>

          {/* Mode Picker + Parameters */}
          <div className="space-y-3">
            {/* Mode */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">text-wrap Mode</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(MODE_INFO) as TextWrapMode[]).map((m) => {
                  const info = MODE_INFO[m];
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        mode === m
                          ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                          : 'bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/60 hover:text-slate-300'
                      }`}
                    >
                      {info.label}
                    </button>
                  );
                })}
              </div>
              {/* Mode explanation */}
              <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-mono text-brand-400">{modeInfo.css}</code>
                </div>
                <p className="text-xs text-slate-400">{modeInfo.description}</p>
                <p className="text-[10px] text-slate-500 mt-1">Support: {modeInfo.support}</p>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">font-size</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700/50 text-xs text-slate-300 focus:outline-none focus:border-brand-500/50"
                >
                  <option value="0.75rem">0.75rem (12px)</option>
                  <option value="0.875rem">0.875rem (14px)</option>
                  <option value="1rem">1rem (16px)</option>
                  <option value="1.125rem">1.125rem (18px)</option>
                  <option value="1.5rem">1.5rem (24px)</option>
                  <option value="2rem">2rem (32px)</option>
                  <option value="2.25rem">2.25rem (36px)</option>
                  <option value="3rem">3rem (48px)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">line-height</label>
                <select
                  value={lineHeight}
                  onChange={(e) => setLineHeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700/50 text-xs text-slate-300 focus:outline-none focus:border-brand-500/50"
                >
                  <option value="1">1 (tight)</option>
                  <option value="1.2">1.2</option>
                  <option value="1.4">1.4</option>
                  <option value="1.5">1.5</option>
                  <option value="1.6">1.6</option>
                  <option value="1.7">1.7 (comfortable)</option>
                  <option value="2">2 (loose)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">max-width</label>
                <select
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700/50 text-xs text-slate-300 focus:outline-none focus:border-brand-500/50"
                >
                  <option value="200px">200px</option>
                  <option value="260px">260px</option>
                  <option value="300px">300px</option>
                  <option value="350px">350px</option>
                  <option value="400px">400px</option>
                  <option value="450px">450px</option>
                  <option value="500px">500px</option>
                  <option value="600px">600px</option>
                  <option value="700px">700px</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">font-family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700/50 text-xs text-slate-300 focus:outline-none focus:border-brand-500/50"
                >
                  <option value='system-ui, -apple-system, sans-serif'>System UI / sans-serif</option>
                  <option value='Georgia, "Times New Roman", serif'>Georgia / serif</option>
                  <option value='"Fira Code", "Cascadia Code", monospace'>Monospace / code</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Toggles */}
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showComparison
                ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                : 'bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/60'
            }`}
          >
            {showComparison ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Side-by-side comparison
          </button>
          <button
            onClick={() => setShowBoundingBox(!showBoundingBox)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showBoundingBox
                ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                : 'bg-slate-800/50 border-slate-700/30 text-slate-400 hover:border-slate-600/60'
            }`}
          >
            <Eye className="w-3 h-3" />
            Bounding boxes
          </button>
          <button
            onClick={resetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700/30 bg-slate-800/50 text-slate-400 hover:border-slate-600/60 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Live Preview */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Live Preview</h3>

          {showComparison ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selected mode */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-brand-500/15 text-brand-300 border border-brand-500/30">
                    text-wrap: {mode}
                  </span>
                  <span className="text-[10px] text-slate-500">selected mode</span>
                </div>
                <div
                  className={`p-6 rounded-xl flex items-start min-h-[160px] ${
                    showBoundingBox ? 'bg-slate-800/30' : 'bg-transparent'
                  }`}
                  style={{ border: showBoundingBox ? '1px dashed #475569' : '1px solid transparent' }}
                >
                  <div className="w-full">
                    <p style={previewStyle}>{text}</p>
                  </div>
                </div>
              </div>

              {/* Default wrap */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-700/50 text-slate-400 border border-slate-600/40">
                    text-wrap: wrap (default)
                  </span>
                  <span className="text-[10px] text-slate-500">comparison</span>
                </div>
                <div
                  className={`p-6 rounded-xl flex items-start min-h-[160px] ${
                    showBoundingBox ? 'bg-slate-800/30' : 'bg-transparent'
                  }`}
                  style={{ border: showBoundingBox ? '1px dashed #475569' : '1px solid transparent' }}
                >
                  <div className="w-full">
                    <p style={comparisonStyle}>{text}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`p-6 rounded-xl flex items-start min-h-[160px] ${
                showBoundingBox ? 'bg-slate-800/30' : 'bg-transparent'
              }`}
              style={{ border: showBoundingBox ? '1px dashed #475569' : '1px solid transparent' }}
            >
              <div className="w-full">
                <p style={previewStyle}>{text}</p>
              </div>
            </div>
          )}
        </div>

        {/* CSS Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Code className="w-3.5 h-3.5" />
              CSS Output
            </h3>
            <button
              onClick={copyCSS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700/30 bg-slate-800/50 text-slate-400 hover:border-slate-600/60 transition-all"
            >
              <Copy className="w-3 h-3" />
              Copy CSS
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
{cssOutput}
          </pre>
        </div>
      </div>

      {/* Info section */}
      <div className="mt-12 p-6 rounded-xl bg-slate-800/50 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">When to use each mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div>
            <h4 className="font-medium text-slate-300 mb-1">
              <code className="bg-slate-700 px-1 rounded text-brand-400">balance</code>
            </h4>
            <p>
              Use for <strong>headings, hero text, and short blocks</strong> (6 lines or fewer). It makes 
              each line roughly equal width for a polished, professional look. Beyond 6 lines it degrades 
              gracefully to standard wrapping — no layout breakage.
            </p>
            <div className="mt-2 p-2 rounded bg-slate-900/50 border border-slate-700/30">
              <span className="text-[10px] text-slate-500">Best for: headings, banners, CTAs, card titles, empty states</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-1">
              <code className="bg-slate-700 px-1 rounded text-brand-400">pretty</code>
            </h4>
            <p>
              Use for <strong>body text and paragraphs</strong> of any length. It prevents orphans 
              (lone words on the last line) by adjusting line breaks for optimal typographic quality. 
              A subtle improvement that makes text look more professional.
            </p>
            <div className="mt-2 p-2 rounded bg-slate-900/50 border border-slate-700/30">
              <span className="text-[10px] text-slate-500">Best for: blog posts, product descriptions, about pages, documentation</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-1">
              <code className="bg-slate-700 px-1 rounded text-brand-400">stable</code>
            </h4>
            <p>
              Use for <strong>live-editing UIs</strong> where you don&apos;t want lines to reflow as the 
              user types. Lines stay fixed in their positions — only newly typed content creates new lines. 
              Chrome-only as of 2026.
            </p>
            <div className="mt-2 p-2 rounded bg-slate-900/50 border border-slate-700/30">
              <span className="text-[10px] text-slate-500">Best for: chat UIs, collaborative docs, live previews, code editors</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-700/30">
          <h4 className="text-xs font-medium text-slate-300 mb-2">Browser Support</h4>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <code className="text-slate-300">balance</code>: Chrome 114+, Firefox 121+, Safari 17.5+ — <strong className="text-emerald-400">Baseline 2024</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <code className="text-slate-300">pretty</code>: Chrome 117+, Firefox 130+, Safari 18.0+ — <strong className="text-emerald-400">Baseline 2025</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <code className="text-slate-300">stable</code>: Chrome 133+ only — <strong className="text-amber-400">not yet Baseline</strong> (limited availability)
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            All modes degrade gracefully — unsupported browsers fall back to standard wrapping. Safe to use 
            as a progressive enhancement today with no polyfills or JavaScript required.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
