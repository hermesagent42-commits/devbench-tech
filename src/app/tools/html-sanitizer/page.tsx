'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Eye, Code, AlertTriangle, Check, Shield, Trash2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ViewMode = 'code' | 'preview';

interface Preset {
  label: string;
  allowedTags: Set<string>;
  allowedAttrs: Set<string>;
  allowUrls: boolean;
  allowDataUri: boolean;
  stripComments: boolean;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Record<string, Preset> = {
  strict: {
    label: 'Strict',
    allowedTags: new Set(['b', 'i', 'strong', 'em', 'a', 'code', 'pre', 'br', 'p']),
    allowedAttrs: new Set(['href', 'title', 'target', 'rel']),
    allowUrls: true,
    allowDataUri: false,
    stripComments: true,
  },
  relaxed: {
    label: 'Relaxed',
    allowedTags: new Set([
      'div', 'span', 'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
      'a', 'img', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'figure', 'figcaption',
    ]),
    allowedAttrs: new Set([
      'href', 'title', 'target', 'rel',
      'src', 'alt', 'width', 'height', 'loading',
      'class', 'id', 'style',
      'colspan', 'rowspan', 'scope',
    ]),
    allowUrls: true,
    allowDataUri: false,
    stripComments: true,
  },
  markdownLike: {
    label: 'Markdown-like',
    allowedTags: new Set([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br',
      'strong', 'em', 'del', 'code', 'pre',
      'a', 'img',
      'ul', 'ol', 'li',
      'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr',
    ]),
    allowedAttrs: new Set(['href', 'title', 'target', 'rel', 'src', 'alt']),
    allowUrls: true,
    allowDataUri: false,
    stripComments: true,
  },
  emailSafe: {
    label: 'Email-safe',
    allowedTags: new Set([
      'p', 'br',
      'b', 'i', 'u', 'strong', 'em',
      'a',
      'ul', 'ol', 'li',
      'table', 'tr', 'td', 'th', 'thead', 'tbody',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'div', 'span',
    ]),
    allowedAttrs: new Set([
      'href', 'title', 'target',
      'src', 'alt', 'width', 'height',
      'style',
    ]),
    allowUrls: true,
    allowDataUri: false,
    stripComments: true,
  },
  forum: {
    label: 'Forum',
    allowedTags: new Set([
      'b', 'i', 'u', 's',
      'strong', 'em', 'mark',
      'a', 'img',
      'code', 'pre',
      'ul', 'ol', 'li',
      'blockquote',
      'p', 'br',
      'h2', 'h3', 'h4',
      'table', 'tr', 'td', 'th',
    ]),
    allowedAttrs: new Set(['href', 'title', 'src', 'alt', 'width', 'height']),
    allowUrls: true,
    allowDataUri: false,
    stripComments: true,
  },
  none: {
    label: 'Custom',
    allowedTags: new Set(),
    allowedAttrs: new Set(),
    allowUrls: true,
    allowDataUri: false,
    stripComments: true,
  },
};

// ── Sanitization Engine ────────────────────────────────────────────────────

function isSafeUrl(url: string, allowDataUri: boolean): boolean {
  if (!url) return true;
  const trimmed = url.trim().toLowerCase();

  // Allow relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) return true;
  if (trimmed.startsWith('#')) return true;

  // Check protocol
  const allowed = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'];
  if (allowDataUri) allowed.push('data:');

  for (const proto of allowed) {
    if (trimmed.startsWith(proto)) return true;
  }

  // Protocol-relative URLs
  if (trimmed.startsWith('//')) return true;

  return false;
}

interface SanitizeResult {
  html: string;
  stripped: string[];
  originalSize: number;
  sanitizedSize: number;
}

function sanitizeHtml(
  input: string,
  preset: Preset,
): SanitizeResult {
  const stripped: string[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');

  function cleanNode(node: Node): string {
    // Text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    // Comment nodes
    if (node.nodeType === Node.COMMENT_NODE) {
      if (preset.stripComments) {
        stripped.push(`<!-- Comment removed -->`);
        return '';
      }
      return `<!--${node.textContent}-->`;
    }

    // Element nodes
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    // Check if tag is allowed
    if (!preset.allowedTags.has(tagName)) {
      stripped.push(`<${tagName}> removed`);
      // Still process children
      let children = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        children += cleanNode(el.childNodes[i]);
      }
      return children;
    }

    // Build tag with allowed attributes
    let attrs = '';
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const attrName = attr.name.toLowerCase();

      if (!preset.allowedAttrs.has(attrName)) {
        stripped.push(`[${attrName}] removed from <${tagName}>`);
        continue;
      }

      // Special handling for URL attributes
      if (['href', 'src', 'action', 'formaction', 'data'].includes(attrName)) {
        if (!isSafeUrl(attr.value, preset.allowDataUri)) {
          stripped.push(`Unsafe ${attrName} removed from <${tagName}>: ${attr.value.substring(0, 40)}...`);
          continue;
        }
      }

      attrs += ` ${attrName}="${escapeAttr(attr.value)}"`;
    }

    // Self-closing tags
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
      'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
    ]);

    if (voidElements.has(tagName)) {
      return `<${tagName}${attrs} />`;
    }

    // Process children
    let children = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      children += cleanNode(el.childNodes[i]);
    }

    return `<${tagName}${attrs}>${children}</${tagName}>`;
  }

  let result = '';
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    result += cleanNode(doc.body.childNodes[i]);
  }

  return {
    html: result.trim(),
    stripped,
    originalSize: input.length,
    sanitizedSize: result.length,
  };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Samples ────────────────────────────────────────────────────────────────

const SAMPLES: { label: string; html: string }[] = [
  {
    label: 'XSS Attack',
    html: `<div>Hello world</div>
<script>alert('XSS!')</script>
<img src="x" onerror="alert('pwned')" />
<a href="javascript:void(0)" onclick="steal()">Click me</a>
<p style="background: url(&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1))">CSS XSS</p>`,
  },
  {
    label: 'Markdown Export',
    html: `<h1>My Blog Post</h1>
<p>This is a <strong>great</strong> article about <em>web security</em>.</p>
<blockquote>Security is not a product, but a process.</blockquote>
<ul>
  <li>Sanitize user input</li>
  <li>Use CSP headers</li>
  <li>Escape output</li>
</ul>
<p><img src="https://example.com/hero.jpg" alt="Hero" width="800" height="400" /></p>
<a href="https://owasp.org">Learn more at OWASP</a>`,
  },
  {
    label: 'Rich Paste',
    html: `<div style="font-family: Arial; color: #333;">
  <h2>Meeting Notes <span style="font-size: 12px; color: #999;">June 2026</span></h2>
  <p><strong>Attendees:</strong> Alice, Bob, Charlie</p>
  <table border="1" cellpadding="8">
    <thead><tr><th>Topic</th><th>Decision</th></tr></thead>
    <tbody>
      <tr><td>Security review</td><td>Schedule for Q3</td></tr>
      <tr><td>New hire</td><td>Approved</td></tr>
    </tbody>
  </table>
  <p style="margin-top: 16px;"><em>Next meeting: July 15</em></p>
  <!-- Internal note: follow up with legal -->
</div>`,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function HtmlSanitizerPage() {
  const [input, setInput] = useState('');
  const [presetKey, setPresetKey] = useState('relaxed');
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [customTags, setCustomTags] = useState('');
  const [customAttrs, setCustomAttrs] = useState('');
  const [customAllowUrls, setCustomAllowUrls] = useState(true);
  const [customAllowDataUri, setCustomAllowDataUri] = useState(false);
  const [customStripComments, setCustomStripComments] = useState(true);

  const activePreset = useMemo(() => {
    if (presetKey === 'none') {
      return {
        label: 'Custom',
        allowedTags: new Set(
          customTags
            .split(/[,\s]+/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
        ),
        allowedAttrs: new Set(
          customAttrs
            .split(/[,\s]+/)
            .map((a) => a.trim().toLowerCase())
            .filter(Boolean),
        ),
        allowUrls: customAllowUrls,
        allowDataUri: customAllowDataUri,
        stripComments: customStripComments,
      };
    }
    return PRESETS[presetKey];
  }, [presetKey, customTags, customAttrs, customAllowUrls, customAllowDataUri, customStripComments]);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    return sanitizeHtml(input, activePreset);
  }, [input, activePreset]);

  const handleCopy = useCallback(() => {
    if (!result?.html) return;
    navigator.clipboard.writeText(result.html);
    toast.success('Sanitized HTML copied!');
  }, [result]);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  const handleUseSample = useCallback((sample: (typeof SAMPLES)[0]) => {
    setInput(sample.html);
  }, []);

  const reductionPercent = useMemo(() => {
    if (!result || result.originalSize === 0) return 0;
    return Math.round(((result.originalSize - result.sanitizedSize) / result.originalSize) * 100);
  }, [result]);

  return (
    <ToolLayout
      title="HTML Sanitizer"
      description="Sanitize user-submitted HTML to prevent XSS attacks. Strip scripts, event handlers, and unsafe URLs while preserving allowed markup."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Input Panel ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium text-sm">Input HTML</h2>
            <div className="flex items-center gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleUseSample(s)}
                  className="px-2 py-1 text-xs rounded bg-surface-light border border-slate-600/50 text-slate-300 hover:bg-slate-700/70 hover:text-white transition-colors"
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={handleClear}
                disabled={!input}
                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`<h1>Hello!</h1>\n<p>Paste your <strong>HTML</strong> here to sanitize it...</p>\n<script>alert('This will be removed')</script>`}
            className="w-full h-80 px-4 py-3 bg-surface border border-slate-700 rounded-lg font-mono text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 resize-y"
          />

          {/* Preset Picker */}
          <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
            <label className="text-xs text-slate-400 font-medium mb-2 block">
              <Shield className="w-3 h-3 inline mr-1" />
              Sanitization Profile
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setPresetKey(key)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    presetKey === key
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom config */}
            {presetKey === 'none' && (
              <div className="mt-3 space-y-3 pt-3 border-t border-slate-700/50">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Allowed Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={customTags}
                    onChange={(e) => setCustomTags(e.target.value)}
                    placeholder="div, span, p, a, img..."
                    className="w-full px-3 py-1.5 bg-surface border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Allowed Attributes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={customAttrs}
                    onChange={(e) => setCustomAttrs(e.target.value)}
                    placeholder="href, src, alt, class, id..."
                    className="w-full px-3 py-1.5 bg-surface border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={customAllowUrls}
                      onChange={(e) => setCustomAllowUrls(e.target.checked)}
                      className="rounded"
                    />
                    Allow URLs
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={customAllowDataUri}
                      onChange={(e) => setCustomAllowDataUri(e.target.checked)}
                      className="rounded"
                    />
                    Allow data: URIs
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={customStripComments}
                      onChange={(e) => setCustomStripComments(e.target.checked)}
                      className="rounded"
                    />
                    Strip comments
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          {input && (
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Input: <strong className="text-slate-300">{input.length.toLocaleString()}</strong> chars</span>
              {result && (
                <>
                  <span>→</span>
                  <span>Output: <strong className="text-slate-300">{result.sanitizedSize.toLocaleString()}</strong> chars</span>
                  <span className={reductionPercent > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    ({reductionPercent > 0 ? '-' : '+'}{reductionPercent}%)
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Output Panel ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium text-sm">Sanitized Output</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('code')}
                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                  viewMode === 'code'
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Code
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={handleCopy}
                disabled={!result?.html}
                className="p-1.5 rounded text-xs flex items-center gap-1 text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors disabled:opacity-30"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>

          {!result ? (
            <div className="h-80 flex items-center justify-center bg-surface rounded-lg border border-slate-700">
              <div className="text-center">
                <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Enter HTML on the left to see sanitized output</p>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'code' ? (
                <div className="h-80 overflow-auto rounded-lg bg-surface border border-slate-700">
                  <pre className="p-4 font-mono text-sm text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
                    {result.html || (
                      <span className="text-slate-500 italic">All content was stripped</span>
                    )}
                  </pre>
                </div>
              ) : (
                <div className="h-80 overflow-auto rounded-lg bg-white border border-slate-700">
                  <div
                    className="p-4 prose prose-sm max-w-none text-gray-900"
                    dangerouslySetInnerHTML={{ __html: result.html || '<p class="text-gray-400 italic">All content was stripped</p>' }}
                  />
                </div>
              )}
            </>
          )}

          {/* Stripped log */}
          {result && result.stripped.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-300">
                  {result.stripped.length} element{result.stripped.length !== 1 ? 's' : ''} removed
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {result.stripped.map((item, i) => (
                  <div key={i} className="text-xs text-amber-400/70 font-mono">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && result.stripped.length === 0 && result.html && (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">
                  No elements removed — all content passed sanitization
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 space-y-1">
            <p>
              <strong className="text-slate-300">How it works:</strong> The input is parsed with the browser&apos;s
              native <code className="text-brand-400/80">DOMParser</code>, then reconstructed using only allowed
              tags and attributes. Script elements, event handlers (<code className="text-brand-400/80">onclick</code>,
              <code className="text-brand-400/80">onerror</code>, etc.), and dangerous URL schemes
              (<code className="text-brand-400/80">javascript:</code>, <code className="text-brand-400/80">data:</code>)
              are stripped.
            </p>
            <p>
              <strong className="text-slate-300">For production use:</strong> Always combine client-side sanitization
              with server-side validation. Use CSP headers (Content-Security-Policy) as defense-in-depth. This tool
              demonstrates the concept — production apps should use hardened libraries like DOMPurify or sanitize-html.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
