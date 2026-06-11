'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Code, AlignLeft, Languages, GripHorizontal, Type, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type HyphensMode = 'none' | 'manual' | 'auto';

interface Preset {
  label: string;
  description: string;
  text: string;
  lang: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  maxWidth: string;
  suggestedMode: HyphensMode;
  suggestedLimitChars?: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    label: 'English Paragraph',
    description: 'Standard English body text — benefits from auto hyphenation in narrow columns',
    text: 'Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line spacing, and letter spacing, and adjusting the space between pairs of letters.',
    lang: 'en',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '280px',
    suggestedMode: 'auto',
    suggestedLimitChars: '6 3 2',
  },
  {
    label: 'German Compounds',
    description: 'German with long compound words — hyphenation is essential for justified text',
    text: 'Die Donaudampfschifffahrtsgesellschaftskapitänsmütze ist ein faszinierendes Beispiel für die Wortbildung in der deutschen Sprache. Solche Komposita können beliebig lang werden und stellen besondere Herausforderungen an die Silbentrennung.',
    lang: 'de',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '280px',
    suggestedMode: 'auto',
    suggestedLimitChars: '5 2 3',
  },
  {
    label: 'French Literature',
    description: 'French text — hyphenation patterns differ from English',
    text: 'La typographie est l\'art et la technique de la composition et de l\'impression des textes. Elle consiste à choisir des caractères, à déterminer leur taille, l\'interlignage et la justification, afin de produire un document lisible et esthétique.',
    lang: 'fr',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '280px',
    suggestedMode: 'auto',
    suggestedLimitChars: '5 2 2',
  },
  {
    label: 'Narrow Sidebar',
    description: 'Very narrow container — hyphenation prevents ugly ragged edges',
    text: 'Responsive web design requires careful consideration of how text reflows at different viewport widths. Without proper hyphenation controls, narrow columns can produce excessive whitespace and rivers that disrupt readability.',
    lang: 'en',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    maxWidth: '200px',
    suggestedMode: 'auto',
    suggestedLimitChars: '5 2 3',
  },
  {
    label: 'Technical Documentation',
    description: 'Technical docs with code terms — you may want to limit hyphenation to avoid breaking identifiers',
    text: 'The WebSocket protocol enables bidirectional communication between clients and servers over a single long-lived connection. Unlike HTTP request-response cycles, WebSocket connections remain open for real-time data exchange.',
    lang: 'en',
    fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", ui-monospace, monospace',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    maxWidth: '300px',
    suggestedMode: 'auto',
    suggestedLimitChars: '8 3 3',
  },
  {
    label: 'Spanish Text',
    description: 'Spanish text — syllabic hyphenation with Spanish rules',
    text: 'La tipografía es el arte y la técnica del manejo y selección de tipos para crear trabajos de impresión. El tipógrafo se encarga de la composición, el diseño y la diagramación de textos e imágenes para su reproducción.',
    lang: 'es',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '280px',
    suggestedMode: 'auto',
    suggestedLimitChars: '5 2 2',
  },
  {
    label: 'Soft Hyphens Only',
    description: 'Manual hyphenation control with &shy; entities — precise placement for important text',
    text: 'Responsive&P\hype;&shy;graphy is the prac&P\hype;&shy;tice of making text adapt seam&P\hype;lessly across different screen sizes and de&P\hype;vices. It goes be&P\hype;yond simple font sizing to en&P\hype;com&P\hype;pass line length, word spacing, and break&P\hype;point op&P\hype;timi&P\hype;za&P\hype;tion.',
    lang: 'en',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '300px',
    suggestedMode: 'manual',
    suggestedLimitChars: undefined,
  },
  {
    label: 'Justified Column',
    description: 'Newspaper-style justified text — auto hyphenation prevents large gaps',
    text: 'The quick brown fox jumps over the lazy dog near the riverbank, watching as the sun slowly sets behind the magnificent mountains in the distance. A gentle breeze carries the scent of pine through the valley below.',
    lang: 'en',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    maxWidth: '250px',
    suggestedMode: 'auto',
    suggestedLimitChars: '5 2 3',
  },
];

// ── Language options ────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'nl', label: 'Dutch (Nederlands)' },
  { code: 'sv', label: 'Swedish (Svenska)' },
  { code: 'pl', label: 'Polish (Polski)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'cs', label: 'Czech (Čeština)' },
  { code: 'da', label: 'Danish (Dansk)' },
];

export default function CssHyphenationPlayground() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [text, setText] = useState(PRESETS[0].text);
  const [lang, setLang] = useState(PRESETS[0].lang);
  const [hyphensMode, setHyphensMode] = useState<HyphensMode>(PRESETS[0].suggestedMode);
  const [minWordLen, setMinWordLen] = useState(6);
  const [charsBefore, setCharsBefore] = useState(3);
  const [charsAfter, setCharsAfter] = useState(2);
  const [useLimitChars, setUseLimitChars] = useState(true);
  const [textAlign, setTextAlign] = useState<'left' | 'justify'>('left');
  const [containerWidth, setContainerWidth] = useState(280);
  const [fontFamily, setFontFamily] = useState(PRESETS[0].fontFamily);
  const [fontSize, setFontSize] = useState(PRESETS[0].fontSize);
  const [lineHeight, setLineHeight] = useState(PRESETS[0].lineHeight);
  const [showSource, setShowSource] = useState(false);

  // ── Apply preset ──────────────────────────────────────────────────────────

  const applyPreset = useCallback((idx: number) => {
    const p = PRESETS[idx];
    setSelectedPreset(idx);
    setText(p.text);
    setLang(p.lang);
    setHyphensMode(p.suggestedMode);
    if (p.suggestedLimitChars) {
      const [w, b, a] = p.suggestedLimitChars.split(' ').map(Number);
      setMinWordLen(w);
      setCharsBefore(b);
      setCharsAfter(a);
      setUseLimitChars(true);
    } else {
      setUseLimitChars(false);
    }
    setContainerWidth(parseInt(p.maxWidth));
    setFontFamily(p.fontFamily);
    setFontSize(p.fontSize);
    setLineHeight(p.lineHeight);
    setTextAlign('left');
  }, []);

  // ── Generate CSS ──────────────────────────────────────────────────────────

  const cssOutput = useMemo(() => {
    const lines: string[] = [];
    lines.push('.hyphenated-text {');
    if (hyphensMode === 'manual') {
      lines.push('  hyphens: manual;');
    } else if (hyphensMode === 'auto') {
      lines.push('  hyphens: auto;');
      lines.push(`  /* Browser picks ${lang} hyphenation dictionary */`);
    } else {
      lines.push('  hyphens: none;');
    }
    if (hyphensMode === 'auto' && useLimitChars) {
      lines.push(`  hyphenate-limit-chars: ${minWordLen} ${charsBefore} ${charsAfter};`);
    }
    lines.push(`  text-align: ${textAlign};`);
    lines.push(`  font-family: ${fontFamily};`);
    lines.push(`  font-size: ${fontSize};`);
    lines.push(`  line-height: ${lineHeight};`);
    lines.push(`  max-width: ${containerWidth}px;`);
    lines.push('}');
    return lines.join('\n');
  }, [hyphensMode, useLimitChars, minWordLen, charsBefore, charsAfter, textAlign, fontFamily, fontSize, lineHeight, containerWidth, lang]);

  // ── HTML output ───────────────────────────────────────────────────────────

  const htmlOutput = useMemo(() => {
    return `<div class="hyphenated-text" lang="${lang}">\n  ${text}\n</div>`;
  }, [lang, text]);

  // ── Copy ──────────────────────────────────────────────────────────────────

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(() => toast.success('CSS copied!'));
  }, [cssOutput]);

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(htmlOutput).then(() => toast.success('HTML copied!'));
  }, [htmlOutput]);

  // ── Preview style ─────────────────────────────────────────────────────────

  const previewStyle = useMemo(() => {
    const style: Record<string, string> = {
      fontFamily,
      fontSize,
      lineHeight,
      maxWidth: `${containerWidth}px`,
      width: '100%',
      textAlign,
      padding: '16px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      background: 'var(--card-bg, #ffffff)',
      color: 'var(--foreground, #111)',
      overflowWrap: 'break-word' as const,
      wordBreak: 'break-word' as const,
      transition: 'all 0.2s ease',
    };

    if (hyphensMode === 'manual') {
      style.hyphens = 'manual';
    } else if (hyphensMode === 'auto') {
      style.hyphens = 'auto';
      if (useLimitChars) {
        (style as Record<string, string>).hyphenateLimitChars = `${minWordLen} ${charsBefore} ${charsAfter}`;
      }
    } else {
      style.hyphens = 'none';
    }

    return style;
  }, [fontFamily, fontSize, lineHeight, containerWidth, textAlign, hyphensMode, useLimitChars, minWordLen, charsBefore, charsAfter]);

  return (
    <ToolLayout
      title="CSS Hyphenation Playground"
      description="Explore CSS hyphenation properties — hyphens, hyphenate-limit-chars, and language-specific hyphenation. Live preview with adjustable container width, 8 presets, and instant CSS copy."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Controls ────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(i)}
                  className={`text-left px-3 py-2 rounded-md text-xs transition-colors ${
                    selectedPreset === i
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-muted/50 hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{p.description.slice(0, 45)}...</div>
                </button>
              ))}
            </div>
          </div>

          {/* Hyphens mode */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              hyphens
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['none', 'manual', 'auto'] as HyphensMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setHyphensMode(m)}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    hyphensMode === m
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-muted/50 hover:bg-muted border border-transparent'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {hyphensMode === 'none' && 'Words never break — text wraps at word boundaries only.'}
              {hyphensMode === 'manual' && 'Only breaks at &shy; or &lt;wbr&gt; — precise control.'}
              {hyphensMode === 'auto' && 'Browser inserts hyphens automatically using language dictionary.'}
            </p>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Language (lang)
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Sets the <code className="bg-muted/80 px-1 rounded">lang</code> attribute — browsers use this to pick the right hyphenation dictionary.
            </p>
          </div>

          {/* hyphenate-limit-chars */}
          {hyphensMode === 'auto' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  hyphenate-limit-chars
                </label>
                <button
                  onClick={() => setUseLimitChars(!useLimitChars)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                    useLimitChars ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {useLimitChars ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {useLimitChars && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Min word length</label>
                    <input
                      type="number"
                      min={4}
                      max={12}
                      value={minWordLen}
                      onChange={(e) => setMinWordLen(parseInt(e.target.value) || 6)}
                      className="w-full px-2 py-1.5 rounded-md text-xs bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Chars before</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={charsBefore}
                      onChange={(e) => setCharsBefore(parseInt(e.target.value) || 3)}
                      className="w-full px-2 py-1.5 rounded-md text-xs bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Chars after</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={charsAfter}
                      onChange={(e) => setCharsAfter(parseInt(e.target.value) || 2)}
                      className="w-full px-2 py-1.5 rounded-md text-xs bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {useLimitChars
                  ? `Words shorter than ${minWordLen} chars won't hyphenate. At least ${charsBefore} chars stay before the hyphen, ${charsAfter} after.`
                  : 'Browser uses its defaults — typically min 6 chars, 2 before, 3 after.'}
              </p>
            </div>
          )}

          {/* Text alignment */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Text Align
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['left', 'justify'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setTextAlign(a)}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    textAlign === a
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'bg-muted/50 hover:bg-muted border border-transparent'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Container width */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Container Width: {containerWidth}px
            </label>
            <input
              type="range"
              min={150}
              max={500}
              step={10}
              value={containerWidth}
              onChange={(e) => setContainerWidth(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>150px</span>
              <span>500px</span>
            </div>
          </div>

          {/* Font family */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Font Family
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="system-ui, -apple-system, sans-serif">System UI (sans-serif)</option>
              <option value='Georgia, "Times New Roman", serif'>Georgia (serif)</option>
              <option value='"Fira Code", "Cascadia Code", "JetBrains Mono", ui-monospace, monospace'>Monospace</option>
            </select>
          </div>
        </div>

        {/* ── Right Column: Preview + Output ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Text editor */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Text Content
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-md text-sm bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono resize-y"
              placeholder="Enter text to preview hyphenation..."
            />
          </div>

          {/* Live preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live Preview
              </label>
              <span className="text-[10px] text-muted-foreground">
                lang=&quot;{lang}&quot; · hyphens: {hyphensMode}
                {hyphensMode === 'auto' && useLimitChars && ` · limit-chars: ${minWordLen} ${charsBefore} ${charsAfter}`}
                {hyphensMode === 'auto' && !useLimitChars && ` · limit-chars: default`}
              </span>
            </div>
            <div className="flex justify-center bg-muted/30 rounded-xl p-4">
              <div className="relative">
                {/* Width indicator */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted-foreground/10 text-[10px] text-muted-foreground px-2 py-0.5 rounded-full"
                >
                  {containerWidth}px
                </div>
                {/* Preview element */}
                <div lang={lang} style={previewStyle}>
                  {text}
                </div>
              </div>
            </div>
          </div>

          {/* Hyphens explanation cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 rounded-lg border text-xs transition-colors ${
              hyphensMode === 'none' ? 'bg-primary/5 border-primary/20' : 'bg-muted/10 border-border'
            }`}>
              <div className="font-semibold mb-1">none</div>
              <p className="text-muted-foreground">Words never break. Text wraps at word boundaries only. Can cause ugly ragged edges in narrow columns.</p>
            </div>
            <div className={`p-3 rounded-lg border text-xs transition-colors ${
              hyphensMode === 'manual' ? 'bg-primary/5 border-primary/20' : 'bg-muted/10 border-border'
            }`}>
              <div className="font-semibold mb-1">manual</div>
              <p className="text-muted-foreground">Only breaks at explicit <code className="bg-muted/80 px-1 rounded text-[10px]">&amp;shy;</code> or <code className="bg-muted/80 px-1 rounded text-[10px]">&lt;wbr&gt;</code>. Full control for critical text like headlines.</p>
            </div>
            <div className={`p-3 rounded-lg border text-xs transition-colors ${
              hyphensMode === 'auto' ? 'bg-primary/5 border-primary/20' : 'bg-muted/10 border-border'
            }`}>
              <div className="font-semibold mb-1">auto</div>
              <p className="text-muted-foreground">Browser handles hyphenation using language-specific rules. Works with <code className="bg-muted/80 px-1 rounded text-[10px]">hyphenate-limit-chars</code> for fine control.</p>
            </div>
          </div>

          {/* Output tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Output
              </label>
              <div className="flex gap-1.5">
                <button
                  onClick={copyCss}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy CSS
                </button>
                <button
                  onClick={copyHtml}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Code className="w-3.5 h-3.5" />
                  Copy HTML
                </button>
              </div>
            </div>
            <pre className="bg-muted/30 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              <code>{cssOutput}</code>
            </pre>
          </div>

          {/* Browser support note */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 text-xs">
            <strong className="text-amber-800 dark:text-amber-300">🌐 Browser Support:</strong>{' '}
            <span className="text-amber-700 dark:text-amber-400">
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">hyphens: auto</code> is supported in all modern browsers.{' '}
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">hyphenate-limit-chars</code> is Baseline 2025 — shipping in Chrome 109+, Firefox 121+, and Safari 17.4+.{' '}
              Falls back gracefully to default browser hyphenation when not available.
            </span>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
