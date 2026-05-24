'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Presets ────────────────────────────────────────────────────────────────

interface Preset {
  name: string;
  label: string;
  description: string;
  html: string;
  selector: string;
}

const PRESETS: Preset[] = [
  {
    name: 'parent-of-active',
    label: 'Parent of .active',
    description: 'Style a list item when it contains an .active child element',
    html: `<ul>
  <li>Home</li>
  <li class="has-active">Products <span class="active">(current)</span></li>
  <li>About</li>
  <li class="has-active">Blog <span class="active">(new!)</span></li>
</ul>`,
    selector: 'li:has(.active)',
  },
  {
    name: 'card-with-image',
    label: 'Card with image',
    description: 'Style a card differently when it contains an image',
    html: `<div class="grid">
  <div class="card">
    <h3>Text-only card</h3>
    <p>No image here.</p>
  </div>
  <div class="card card-with-image">
    <img src="/placeholder.jpg" alt="placeholder" />
    <h3>Card with image</h3>
    <p>Layout adjusts automatically.</p>
  </div>
  <div class="card card-with-image">
    <img src="/placeholder.jpg" alt="placeholder" />
    <h3>Another image card</h3>
    <p>Flexbox swap works.</p>
  </div>
</div>`,
    selector: '.card:has(img)',
  },
  {
    name: 'form-invalid',
    label: 'Form with invalid input',
    description: 'Highlight the field wrapper when input is :invalid',
    html: `<form>
  <div class="field">
    <label>Email</label>
    <input type="email" value="user@example.com" />
  </div>
  <div class="field field-invalid">
    <label>Name</label>
    <input type="text" required value="" />
  </div>
  <div class="field field-invalid">
    <label>Age</label>
    <input type="number" min="18" value="12" />
  </div>
  <div class="field">
    <label>Comment</label>
    <textarea>Looks good</textarea>
  </div>
</form>`,
    selector: '.field:has(input:invalid)',
  },
  {
    name: 'heading-followed-by-list',
    label: 'Heading followed by list',
    description: 'Add spacing after headings that are directly followed by lists',
    html: `<article>
  <h2>Introduction</h2>
  <p>Some text here.</p>
  <h2>Key Points</h2>
  <ul>
    <li>Point one</li>
    <li>Point two</li>
  </ul>
  <h2>More Details</h2>
  <ul>
    <li>Detail A</li>
    <li>Detail B</li>
    <li>Detail C</li>
  </ul>
</article>`,
    selector: 'h2:has(+ ul)',
  },
  {
    name: 'empty-state',
    label: 'Empty container',
    description: 'Detect containers that have no visible children',
    html: `<div class="section">
  <p>This section has content.</p>
</div>
<div class="section section-empty">
  <!-- nothing here -->
</div>
<div class="section">
  <p>Another section with text.</p>
</div>
<div class="section section-empty">
</div>`,
    selector: '.section:not(:has(*))',
  },
  {
    name: 'figure-with-caption',
    label: 'Figure with caption',
    description: 'Style figures that include a figcaption element',
    html: `<figure>
  <img src="/img1.jpg" alt="image 1" />
</figure>
<figure class="with-caption">
  <img src="/img2.jpg" alt="image 2" />
  <figcaption>A beautiful sunset</figcaption>
</figure>
<figure>
  <img src="/img3.jpg" alt="image 3" />
</figure>
<figure class="with-caption">
  <img src="/img4.jpg" alt="image 4" />
  <figcaption>City skyline at night</figcaption>
</figure>`,
    selector: 'figure:has(figcaption)',
  },
  {
    name: 'dropdown-open',
    label: 'Open dropdown',
    description: 'Detect dropdowns that are currently expanded',
    html: `<nav>
  <div class="dropdown">
    <button>Products ▾</button>
    <ul class="menu">
      <li><a href="#">Widget A</a></li>
      <li><a href="#">Widget B</a></li>
    </ul>
  </div>
  <div class="dropdown dropdown-open">
    <button>Services ▾</button>
    <ul class="menu">
      <li><a href="#">Consulting</a></li>
      <li><a href="#">Support</a></li>
    </ul>
  </div>
  <div class="dropdown">
    <button>About ▾</button>
    <ul class="menu" style="display:none">
      <li><a href="#">Team</a></li>
    </ul>
  </div>
</nav>`,
    selector: '.dropdown:has(.menu:not([style*="display:none"]))',
  },
];

// ── Default HTML ───────────────────────────────────────────────────────────

const DEFAULT_HTML = `<div class="container">
  <div class="card">
    <img src="/avatar.jpg" alt="Avatar" />
    <h3>Alice</h3>
    <p>Frontend developer</p>
  </div>
  <div class="card">
    <h3>Bob</h3>
    <p>Backend developer</p>
    <span class="badge">New</span>
  </div>
  <div class="card">
    <img src="/avatar2.jpg" alt="Avatar" />
    <h3>Carol</h3>
    <p>Designer</p>
  </div>
</div>`;

const DEFAULT_SELECTOR = '.card:has(img)';

// ── Types ──────────────────────────────────────────────────────────────────

interface MatchResult {
  element: Element;
  selector: string;
  children: Element[];
  text: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function tryQuerySelectorAll(root: Document | Element, selector: string): Element[] {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function getElementSummary(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? `.${el.className.trim().split(/\s+/).join('.')}`
    : '';
  const text = el.textContent?.trim().slice(0, 40) || '';
  return `<${tag}${id}${classes}> "${text}"`;
}

// ── Syntax highlighting for HTML preview ───────────────────────────────────

const HL_COLORS: Record<string, string> = {
  tag: '#38bdf8',
  attr: '#a78bfa',
  value: '#fbbf24',
  comment: '#6b7280',
  text: '#cbd5e1',
  punct: '#64748b',
};

function highlightHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, `<span style="color:${HL_COLORS.comment};font-style:italic">$1</span>`)
    .replace(/(&lt;\/?)([\w-]+)([\s\S]*?)(\/?&gt;)/g, (_m: string, open: string, tag: string, attrs: string, close: string) => {
      const coloredAttrs = attrs.replace(
        /([\w-]+)(=)("[^"]*"|'[^']*')/g,
        (_am: string, an: string, eq: string, av: string) =>
          `<span style="color:${HL_COLORS.attr}">${an}</span><span style="color:${HL_COLORS.punct}">${eq}</span><span style="color:${HL_COLORS.value}">${av}</span>`
      );
      return `<span style="color:${HL_COLORS.punct}">${open}</span><span style="color:${HL_COLORS.tag}">${tag}</span>${coloredAttrs}<span style="color:${HL_COLORS.punct}">${close}</span>`;
    });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssHasPlaygroundClient() {
  const [htmlInput, setHtmlInput] = useState(DEFAULT_HTML);
  const [selectorInput, setSelectorInput] = useState(DEFAULT_SELECTOR);
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(new Set());
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Parse and query ─────────────────────────────────────────────────────

  const parsed = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlInput, 'text/html');
    return doc;
  }, [htmlInput]);

  const matches: MatchResult[] = useMemo(() => {
    const results: MatchResult[] = [];
    if (!selectorInput.trim()) return results;

    const matchedElements = tryQuerySelectorAll(parsed.body, selectorInput);

    for (const el of matchedElements) {
      results.push({
        element: el,
        selector: selectorInput.trim(),
        children: Array.from(el.children),
        text: el.textContent?.trim().slice(0, 60) || '(empty)',
      });
    }

    return results;
  }, [parsed, selectorInput]);

  // ── Highlight matched elements in the preview ───────────────────────────

  useEffect(() => {
    if (!previewRef.current || viewMode !== 'preview') return;

    const container = previewRef.current;
    container.querySelectorAll('[data-has-match]').forEach(el => {
      delete (el as HTMLElement).dataset.hasMatch;
    });

    if (!selectorInput.trim()) return;

    try {
      const matched = container.querySelectorAll(selectorInput);
      matched.forEach(el => {
        (el as HTMLElement).dataset.hasMatch = 'true';
      });
    } catch {
      // invalid selector — ignore
    }
  }, [htmlInput, selectorInput, viewMode]);

  // ── Apply preset ────────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: Preset) => {
    setHtmlInput(preset.html);
    setSelectorInput(preset.selector);
    setSelectedPreset(preset.name);
    setExpandedMatches(new Set());
  }, []);

  const reset = useCallback(() => {
    setHtmlInput(DEFAULT_HTML);
    setSelectorInput(DEFAULT_SELECTOR);
    setSelectedPreset('custom');
    setExpandedMatches(new Set());
  }, []);

  // ── Copy ────────────────────────────────────────────────────────────────

  const copySelector = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectorInput);
      setCopied(true);
      toast.success('Selector copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [selectorInput]);

  // ── Toggle match expansion ──────────────────────────────────────────────

  const toggleMatch = useCallback((idx: number) => {
    setExpandedMatches(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── Generate CSS snippet ────────────────────────────────────────────────

  const cssSnippet = useMemo(() => {
    if (!selectorInput.trim()) return '/* Enter a :has() selector */';
    return `${selectorInput.trim()} {\n  /* Your styles here */\n  outline: 2px solid #22c55e;\n  outline-offset: 2px;\n}`;
  }, [selectorInput]);

  const copyCSS = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssSnippet);
      toast.success('CSS copied!');
    } catch {
      toast.error('Copy failed');
    }
  }, [cssSnippet]);

  // ── Render highlighted HTML source ──────────────────────────────────────

  const numberedHTML = useMemo(() => {
    const lines = htmlInput.split('\n');
    return lines.map((line, i) => ({
      num: i + 1,
      html: highlightHTML(line),
    }));
  }, [htmlInput]);

  return (
    <ToolLayout
      title="CSS :has() Selector Playground"
      description="Experiment with the CSS :has() relational pseudo-class — now Baseline across all browsers. Write HTML, compose :has() selectors, and see live matches with highlighted elements."
    >
      {/* ── Presets ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedPreset === preset.name
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 border border-slate-700/50 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: HTML + Selector Input ──────────────────────────────── */}
        <div className="space-y-4">
          {/* HTML Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">HTML</label>
              <span className="text-xs text-slate-500">
                {htmlInput.split('\n').length} lines
              </span>
            </div>
            <textarea
              value={htmlInput}
              onChange={(e) => {
                setHtmlInput(e.target.value);
                setSelectedPreset('custom');
              }}
              spellCheck={false}
              className="w-full h-52 px-4 py-3 bg-surface-dark border border-slate-700 rounded-lg text-sm font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-y"
              placeholder="<div>Your HTML here...</div>"
            />
          </div>

          {/* Selector Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                CSS :has() Selector
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={copySelector}
                  className={`p-1.5 rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-surface-light'
                  }`}
                  title="Copy selector"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={selectorInput}
                onChange={(e) => {
                  setSelectorInput(e.target.value);
                  setSelectedPreset('custom');
                }}
                spellCheck={false}
                className="w-full px-4 py-2.5 bg-surface-dark border border-slate-700 rounded-lg text-sm font-mono text-brand-300 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                placeholder=".card:has(img)"
              />
              {selectorInput && !selectorInput.includes(':has(') && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">
                  Tip: use :has() for relational matching
                </span>
              )}
            </div>
          </div>

          {/* Match Summary */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-white">Match Results</h3>
            </div>

            {!selectorInput.trim() ? (
              <p className="text-sm text-slate-500">Enter a CSS selector above to see matches.</p>
            ) : matches.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <X className="w-4 h-4 text-red-400" />
                No elements match <code className="text-brand-300 text-xs bg-surface-dark px-1.5 py-0.5 rounded">{selectorInput}</code>
              </div>
            ) : (
              <div>
                <p className="text-sm text-green-400 mb-3">
                  <Check className="w-3.5 h-3.5 inline mr-1" />
                  {matches.length} element{matches.length !== 1 ? 's' : ''} matched
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {matches.map((match, i) => (
                    <div key={i} className="border border-slate-700/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleMatch(i)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-light transition-colors"
                      >
                        {expandedMatches.has(i) ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="text-slate-400 flex-shrink-0">#{i + 1}</span>
                        <code className="text-brand-300 text-xs flex-1 truncate">
                          {getElementSummary(match.element)}
                        </code>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {match.children.length} children
                        </span>
                      </button>
                      {expandedMatches.has(i) && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-700/30 bg-surface-dark">
                          <p className="text-xs text-slate-400 mb-2">
                            Matched by: <code className="text-brand-300">{match.selector}</code>
                          </p>
                          <p className="text-xs text-slate-500 mb-2">
                            Tag: <code className="text-brand-200">{match.element.tagName.toLowerCase()}</code>
                            {match.element.className && (
                              <> · Classes: <code className="text-brand-200">{match.element.className}</code></>
                            )}
                            {match.element.id && (
                              <> · ID: <code className="text-brand-200">{match.element.id}</code></>
                            )}
                          </p>
                          <p className="text-xs text-slate-600 mb-2">
                            Text content: &ldquo;{match.text}&rdquo;
                          </p>
                          {match.children.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Direct children ({match.children.length}):
                              </p>
                              <div className="space-y-1">
                                {match.children.map((child, ci) => (
                                  <div
                                    key={ci}
                                    className="text-xs text-slate-400 font-mono bg-surface-light rounded px-2 py-1"
                                  >
                                    {getElementSummary(child)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Generated CSS */}
                <div className="mt-4 p-3 bg-surface-dark rounded-lg border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Generated CSS</span>
                    <button
                      onClick={copyCSS}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{cssSnippet}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Live Preview ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Live Preview</label>
            <div className="flex items-center gap-1 bg-surface-dark rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Rendered
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'code'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Source
              </button>
            </div>
          </div>

          <div className="border border-slate-700 rounded-lg bg-[#0f172a] min-h-[420px] overflow-auto">
            {viewMode === 'preview' ? (
              <>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `[data-has-match] { outline: 2px solid #22c55e; outline-offset: 2px; border-radius: 4px; position: relative; }
[data-has-match]::after { content: '✓ :has() match'; position: absolute; top: -22px; left: 0; font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #22c55e; background: #0f172a; padding: 2px 6px; border-radius: 3px; white-space: nowrap; z-index: 10; }`,
                  }}
                />
                <div
                  ref={previewRef}
                  className="p-6 text-slate-300 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: htmlInput }}
                />
              </>
            ) : (
              <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                {numberedHTML.map((line) => (
                  <div key={line.num} className="flex hover:bg-white/[0.02]">
                    <span className="w-10 flex-shrink-0 text-right pr-3 text-slate-600 select-none border-r border-slate-800 mr-3">
                      {line.num}
                    </span>
                    <span
                      className="whitespace-pre"
                      dangerouslySetInnerHTML={{ __html: line.html || ' ' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Match count badge */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-slate-500">
              <span className="text-slate-300 font-mono">{htmlInput.split('\n').length}</span> lines of HTML
            </span>
            {selectorInput.trim() && (
              <span className={`font-mono ${matches.length > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                {matches.length} match{matches.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
