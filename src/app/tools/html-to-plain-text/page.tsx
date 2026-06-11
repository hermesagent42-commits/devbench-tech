'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, FileCode, FileText, Trash2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Sample HTML presets ──────────────────────────────────────────────────────

interface Preset {
  name: string;
  description: string;
  html: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Scraped Product Page',
    description: 'E-commerce product HTML with nested divs, spans, and scripts',
    html: `<div class="product-page">
  <header><h1>Wireless Bluetooth Headphones</h1></header>
  <div class="price">$79.99 <span class="original">$129.99</span></div>
  <div class="description">
    <p>Premium noise-cancelling headphones with 40-hour battery life.</p>
    <ul>
      <li>Active Noise Cancellation (ANC)</li>
      <li>Bluetooth 5.3 with multipoint connection</li>
      <li>40-hour battery with quick charge</li>
    </ul>
  </div>
  <script>console.log('tracker loaded')</script>
  <div class="reviews">
    <h2>Customer Reviews</h2>
    <p><strong>Alice:</strong> Best headphones I've ever owned!</p>
    <p><strong>Bob:</strong> Great battery life. <em>Highly recommended.</em></p>
  </div>
  <nav><a href="/related">See related items</a></nav>
</div>`,
  },
  {
    name: 'Email Newsletter',
    description: 'HTML email with tables, inline styles, and tracking pixels',
    html: `<html>
<body style="font-family: Arial;">
  <table width="600" align="center">
    <tr><td><h1 style="color:#333;">Weekly Digest</h1></td></tr>
    <tr><td><p>Here's what happened this week in tech:</p></td></tr>
    <tr><td>
      <h2>1. AI Advances</h2>
      <p>New models released with <strong>record-breaking</strong> benchmarks.</p>
    </td></tr>
    <tr><td>
      <h2>2. Web Platform</h2>
      <p>CSS gets <em>container queries</em> in all major browsers.</p>
      <a href="https://example.com/read-more">Read more on our blog</a>
    </td></tr>
    <tr><td><p style="color:#999; font-size:12px;">Unsubscribe | Privacy Policy</p></td></tr>
  </table>
  <img src="https://track.example.com/pixel.gif" width="1" height="1" alt="" />
</body>
</html>`,
  },
  {
    name: 'Wikipedia Article',
    description: 'Complex markup with citations, infoboxes, and nested sections',
    html: `<article>
  <h1>JavaScript</h1>
  <div class="infobox">
    <p><b>Paradigm:</b> Multi-paradigm</p>
    <p><b>Designed by:</b> Brendan Eich</p>
  </div>
  <p><b>JavaScript</b> (<span class="IPA">/ˈdʒɑːvəskrɪpt/</span>) is a <a href="/wiki/Programming_language">programming language</a> and core technology of the Web.</p>
  <h2>History</h2>
  <p>JavaScript was created in 1995 by Brendan Eich<sup><a href="#cite-1">[1]</a></sup> while at Netscape.</p>
  <h2>Features</h2>
  <ul>
    <li>Dynamic typing</li>
    <li>First-class functions</li>
    <li>Prototype-based inheritance</li>
  </ul>
  <h2>See Also</h2>
  <ul>
    <li><a href="/wiki/TypeScript">TypeScript</a></li>
    <li><a href="/wiki/ECMAScript">ECMAScript</a></li>
  </ul>
</article>`,
  },
];

// ── Options ───────────────────────────────────────────────────────────────────

interface Options {
  preserveNewlines: boolean;
  preserveLinks: boolean;
  decodeEntities: boolean;
  trimLines: boolean;
  removeEmptyLines: boolean;
}

const DEFAULT_OPTIONS: Options = {
  preserveNewlines: true,
  preserveLinks: true,
  decodeEntities: true,
  trimLines: true,
  removeEmptyLines: true,
};

// ── Core converter ────────────────────────────────────────────────────────────

function htmlToPlainText(html: string, options: Options): string {
  if (typeof window === 'undefined') return '';

  // Use DOMParser for proper DOM parsing (handles malformed HTML, entities, etc.)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove non-content elements
  const removals = doc.querySelectorAll(
    'script, style, noscript, iframe, svg, template, [aria-hidden="true"], meta, link'
  );
  removals.forEach((el) => el.remove());

  // Handle <br> tags — replace with newlines
  const brs = doc.querySelectorAll('br');
  brs.forEach((br) => br.replaceWith('\n'));

  // Handle block-level elements — ensure they're separated by newlines
  const blockElements = doc.querySelectorAll(
    'p, div, h1, h2, h3, h4, h5, h6, li, tr, section, article, header, footer, nav, main, aside, blockquote, pre, hr, table, ul, ol, dl, figure, figcaption, form, fieldset'
  );

  // Walk the body and extract text
  function extractText(node: Node): string {
    const results: string[] = [];

    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];

      if (child.nodeType === Node.TEXT_NODE) {
        let text = child.textContent || '';
        if (options.decodeEntities) {
          // DOMParser already decodes entities, so textContent is clean
        }
        results.push(text);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // Skip hidden elements
        if (el.hasAttribute('hidden') || el.style.display === 'none') continue;

        // Handle links
        if (tagName === 'a' && options.preserveLinks) {
          const href = el.getAttribute('href') || '';
          const linkText = extractText(el).trim();
          if (href && linkText) {
            results.push(href.startsWith('http') ? `${linkText} (${href})` : linkText);
          } else {
            results.push(extractText(el));
          }
        } else {
          results.push(extractText(el));
        }

        // Add newlines after block-level elements
        const blockTags = new Set([
          'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'li', 'tr', 'section', 'article', 'header', 'footer',
          'nav', 'main', 'aside', 'blockquote', 'pre', 'hr',
          'table', 'ul', 'ol', 'dl', 'figure', 'figcaption',
          'form', 'fieldset', 'br',
        ]);

        if (options.preserveNewlines && blockTags.has(tagName)) {
          // Check if next sibling is also a block element (avoid double newlines)
          const next = child.nextSibling;
          if (next && next.nodeType === Node.ELEMENT_NODE) {
            const nextTag = (next as HTMLElement).tagName.toLowerCase();
            if (blockTags.has(nextTag)) {
              results.push('\n');
              continue;
            }
          }
          results.push('\n');
        }
      }
    }

    return results.join('');
  }

  const body = doc.body;
  let textOutput = extractText(body);

  // Post-processing
  if (options.trimLines) {
    textOutput = textOutput
      .split('\n')
      .map((line) => line.trim())
      .join('\n');
  }

  if (options.removeEmptyLines) {
    textOutput = textOutput
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
  }

  // Normalize multiple consecutive newlines to max 2
  textOutput = textOutput.replace(/\n{3,}/g, '\n\n');

  // Collapse multiple spaces (but keep newlines)
  textOutput = textOutput.replace(/[ \t]+/g, ' ');

  return textOutput.trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HtmlToPlainTextPage() {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const output = useMemo(() => {
    if (!input.trim()) return '';
    return htmlToPlainText(input, options);
  }, [input, options]);

  const stats = useMemo(() => {
    if (!output) return { chars: 0, words: 0, lines: 0, bytes: 0 };
    return {
      chars: output.length,
      words: output.split(/\s+/).filter(Boolean).length,
      lines: output.split('\n').length,
      bytes: new TextEncoder().encode(output).length,
    };
  }, [output]);

  const applyPreset = useCallback((name: string) => {
    const preset = PRESETS.find((p) => p.name === name);
    if (preset) {
      setInput(preset.html);
      setSelectedPreset(name);
    }
  }, []);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, [output]);

  const clear = useCallback(() => {
    setInput('');
    setSelectedPreset('');
  }, []);

  const toggleOption = useCallback(
    (key: keyof Options) => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  return (
    <ToolLayout
      title="HTML to Plain Text"
      description="Extract clean, readable text from HTML — strips tags, scripts, styles, and preserves structure intelligently"
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPreset}
            onChange={(e) => applyPreset(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">Load a sample...</option>
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={clear}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      }
    >
      {/* Options bar */}
      <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Options
          </span>
          {(
            [
              ['preserveNewlines', 'Line Breaks'],
              ['preserveLinks', 'Show URLs'],
              ['trimLines', 'Trim Lines'],
              ['removeEmptyLines', 'Skip Blanks'],
            ] as [keyof Options, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors"
            >
              <input
                type="checkbox"
                checked={options[key]}
                onChange={() => toggleOption(key)}
                className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-700 text-brand-500 focus:ring-brand-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <FileCode className="w-4 h-4" />
              <span>HTML Input</span>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setSelectedPreset('');
            }}
            placeholder="Paste HTML here..."
            className="w-full h-[420px] p-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 font-mono resize-y focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 placeholder-slate-500"
            spellCheck={false}
          />
        </div>

        {/* Output panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <FileText className="w-4 h-4" />
              <span>Plain Text Output</span>
              {output && (
                <span className="text-xs text-slate-500">
                  ({stats.chars} chars · {stats.words} words · {stats.lines} lines)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {output && (
                <button
                  onClick={copyOutput}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-300 hover:text-white hover:border-brand-500 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            {!input.trim() ? (
              <div className="w-full h-[420px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <ArrowRight className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    Paste HTML on the left to see extracted text here
                  </p>
                </div>
              </div>
            ) : (
              <pre className="w-full h-[420px] p-4 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-200 overflow-auto whitespace-pre-wrap font-sans leading-relaxed">
                {output || (
                  <span className="text-slate-500 italic">
                    No text content extracted — check your HTML
                  </span>
                )}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {output && (
        <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span>
              <strong className="text-slate-200">{stats.chars}</strong> characters
            </span>
            <span>
              <strong className="text-slate-200">{stats.words}</strong> words
            </span>
            <span>
              <strong className="text-slate-200">{stats.lines}</strong> lines
            </span>
            <span>
              <strong className="text-slate-200">{stats.bytes}</strong> bytes
            </span>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
