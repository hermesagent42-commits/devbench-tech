'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowRightLeft, RotateCcw, Code2, Settings2, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── HTML attribute → JSX attribute mapping ──────────────────────────────
const ATTR_MAP: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  accesskey: 'accessKey',
  autofocus: 'autoFocus',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  colspan: 'colSpan',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  enctype: 'encType',
  formaction: 'formAction',
  formenctype: 'formEncType',
  formmethod: 'formMethod',
  formnovalidate: 'formNoValidate',
  formtarget: 'formTarget',
  frameborder: 'frameBorder',
  hreflang: 'hrefLang',
  htmlfor: 'htmlFor',
  inputmode: 'inputMode',
  marginheight: 'marginHeight',
  marginwidth: 'marginWidth',
  maxlength: 'maxLength',
  mediagroup: 'mediaGroup',
  minlength: 'minLength',
  novalidate: 'noValidate',
  readonly: 'readOnly',
  rowspan: 'rowSpan',
  spellcheck: 'spellCheck',
  srcdoc: 'srcDoc',
  srclang: 'srcLang',
  srcset: 'srcSet',
  usemap: 'useMap',
  // SVG
  'clip-path': 'clipPath',
  'fill-opacity': 'fillOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-opacity': 'strokeOpacity',
  'stroke-width': 'strokeWidth',
  'text-anchor': 'textAnchor',
  'xml:space': 'xmlSpace',
  // ARIA
  'aria-activedescendant': 'aria-activedescendant',
  'aria-atomic': 'aria-atomic',
  'aria-autocomplete': 'aria-autocomplete',
  'aria-busy': 'aria-busy',
  'aria-checked': 'aria-checked',
  'aria-colcount': 'aria-colcount',
  'aria-colindex': 'aria-colindex',
  'aria-colspan': 'aria-colspan',
  'aria-controls': 'aria-controls',
  'aria-current': 'aria-current',
  'aria-describedby': 'aria-describedby',
  'aria-details': 'aria-details',
  'aria-disabled': 'aria-disabled',
  'aria-dropeffect': 'aria-dropeffect',
  'aria-errormessage': 'aria-errormessage',
  'aria-expanded': 'aria-expanded',
  'aria-flowto': 'aria-flowto',
  'aria-grabbed': 'aria-grabbed',
  'aria-haspopup': 'aria-haspopup',
  'aria-hidden': 'aria-hidden',
  'aria-invalid': 'aria-invalid',
  'aria-keyshortcuts': 'aria-keyshortcuts',
  'aria-label': 'aria-label',
  'aria-labelledby': 'aria-labelledby',
  'aria-level': 'aria-level',
  'aria-live': 'aria-live',
  'aria-modal': 'aria-modal',
  'aria-multiline': 'aria-multiline',
  'aria-multiselectable': 'aria-multiselectable',
  'aria-orientation': 'aria-orientation',
  'aria-owns': 'aria-owns',
  'aria-placeholder': 'aria-placeholder',
  'aria-posinset': 'aria-posinset',
  'aria-pressed': 'aria-pressed',
  'aria-readonly': 'aria-readonly',
  'aria-relevant': 'aria-relevant',
  'aria-required': 'aria-required',
  'aria-roledescription': 'aria-roledescription',
  'aria-rowcount': 'aria-rowcount',
  'aria-rowindex': 'aria-rowindex',
  'aria-rowspan': 'aria-rowspan',
  'aria-selected': 'aria-selected',
  'aria-setsize': 'aria-setsize',
  'aria-sort': 'aria-sort',
  'aria-valuemax': 'aria-valuemax',
  'aria-valuemin': 'aria-valuemin',
  'aria-valuenow': 'aria-valuenow',
  'aria-valuetext': 'aria-valuetext',
};

// Void (self-closing) HTML elements
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Boolean HTML attributes (just their presence matters)
const BOOLEAN_ATTRS = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked',
  'controls', 'default', 'defer', 'disabled', 'formnovalidate',
  'hidden', 'ismap', 'loop', 'multiple', 'muted', 'novalidate',
  'open', 'readonly', 'required', 'reversed', 'selected',
]);

interface Options {
  selfCloseVoid: boolean;
  convertStyles: boolean;
  removeDataReactRoot: boolean;
  wrapFragment: boolean;
  indentSize: number;
  removeComments: boolean;
}

const SAMPLE_HTML = `<div class="container">
  <h1 class="title" style="font-size: 24px; color: #333;">
    Hello, World!
  </h1>
  <img src="photo.jpg" alt="A beautiful photo" class="hero-image">
  <br>
  <input type="text" placeholder="Your name" tabindex="1" readonly>
  <label for="email">Email:</label>
  <input type="email" id="email" required>
  <hr>
  <!-- This is a comment -->
  <svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill-opacity="0.3" />
  </svg>
</div>`;

// ── Core conversion logic ───────────────────────────────────────────────

function convertAttrName(name: string): string {
  const lower = name.toLowerCase();
  if (ATTR_MAP[lower]) return ATTR_MAP[lower];
  // Handle data-* attributes (keep as-is)
  if (lower.startsWith('data-') || lower.startsWith('aria-')) return lower;
  return lower;
}

function convertStyleString(styleStr: string): string {
  if (!styleStr.trim()) return '{{}}';
  const entries: string[] = [];
  const parts = styleStr.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (!prop || !value) continue;
    // Convert CSS property to camelCase
    const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    // If the value is numeric with units, quote it; otherwise quote it too
    const quotedValue = value.includes("'") ? `"${value}"` : `'${value}'`;
    entries.push(`${camelProp}: ${quotedValue}`);
  }
  return entries.length > 0 ? `{{ ${entries.join(', ')} }}` : '{{}}';
}

function convertHtmlToJsx(
  html: string,
  opts: Options
): { jsx: string; warnings: string[] } {
  const warnings: string[] = [];

  // Simple parser: tokenize by tags and text
  // We'll use a regex-based approach for robustness without a full parser

  let result = '';
  let pos = 0;
  let indentLevel = 0;
  const indent = ' '.repeat(opts.indentSize);
  let lineStart = true;
  let prevWasNewline = false;

  // Remove HTML comments if configured
  if (opts.removeComments) {
    html = html.replace(/<!--[\s\S]*?-->/g, '');
  }

  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s[\s\S]*?)?)(\s*\/?)>/g;
  // Also handle comments
  const commentRegex = /<!--[\s\S]*?-->/g;

  // We'll process the HTML character by character but use regex for tag boundaries
  // Better approach: split by tags and process pieces

  const pieces: { type: 'text' | 'tag' | 'comment'; content: string; fullMatch: string }[] = [];
  let lastIdx = 0;

  // Collect all matches
  const allMatches: { index: number; length: number; type: 'tag' | 'comment'; match: string }[] = [];

  // Find tags
  tagRegex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(html)) !== null) {
    allMatches.push({ index: m.index, length: m[0].length, type: 'tag', match: m[0] });
  }

  // Find comments
  if (!opts.removeComments) {
    commentRegex.lastIndex = 0;
    while ((m = commentRegex.exec(html)) !== null) {
      allMatches.push({ index: m.index, length: m[0].length, type: 'comment', match: m[0] });
    }
  }

  // Sort by index
  allMatches.sort((a, b) => a.index - b.index);

  for (const match of allMatches) {
    // Text before this match
    if (match.index > lastIdx) {
      const text = html.slice(lastIdx, match.index);
      pieces.push({ type: 'text', content: text, fullMatch: text });
    }

    if (match.type === 'comment') {
      // Convert HTML comment to JSX comment: <!-- ... --> → {/* ... */}
      const inner = match.match.slice(4, -3); // strip <!-- and -->
      pieces.push({ type: 'comment', content: inner.trim(), fullMatch: match.match });
    } else {
      // Tag
      pieces.push({ type: 'tag', content: match.match, fullMatch: match.match });
    }

    lastIdx = match.index + match.length;
  }

  // Trailing text
  if (lastIdx < html.length) {
    const text = html.slice(lastIdx);
    pieces.push({ type: 'text', content: text, fullMatch: text });
  }

  // Now process pieces
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];

    if (piece.type === 'text') {
      let text = piece.content;
      // Trim leading whitespace at line starts, preserve meaningful whitespace
      if (!text.trim()) {
        // Pure whitespace between elements — preserve if between inline elements, collapse otherwise
        if (text.includes('\n')) {
          // Keep newlines for formatting
          const newlineCount = (text.match(/\n/g) || []).length;
          result += '\n'.repeat(Math.min(newlineCount, 1));
          prevWasNewline = true;
        }
        continue;
      }

      // Trim excess whitespace but preserve single spaces
      text = text.replace(/\s+/g, ' ');
      text = text.trim();

      if (!text) continue;

      // Wrap text in quotes if it looks like JSX text content
      // Escape curly braces in text content
      text = text.replace(/\{/g, '{"{"}');
      text = text.replace(/\}/g, '{"}"}');

      result += text;
      prevWasNewline = false;
      continue;
    }

    if (piece.type === 'comment') {
      result += `{/* ${piece.content} */}`;
      prevWasNewline = false;
      continue;
    }

    // piece.type === 'tag'
    const tagMatch = piece.content.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s[\s\S]*?)?)(\s*\/?)>$/);
    if (!tagMatch) {
      // Fallback: just output as-is
      result += piece.content;
      continue;
    }

    const [, slash, tagName, attrsStr, selfClose] = tagMatch;
    const lowerTag = tagName.toLowerCase();
    const isClosing = slash === '/';
    const isVoid = VOID_ELEMENTS.has(lowerTag);
    const isSelfClosing = selfClose.trim() === '/' || (isVoid && !isClosing);

    if (isClosing) {
      result += `</${lowerTag}>`;
      if (lowerTag !== 'br' && lowerTag !== 'hr' && lowerTag !== 'img' && lowerTag !== 'input') {
        // Could adjust indent but keep simple
      }
      prevWasNewline = false;
      continue;
    }

    // Opening tag
    let jsxAttrs = '';

    if (attrsStr && attrsStr.trim()) {
      // Parse attributes
      const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|([^\s>]+)))?/g;
      let attrMatch: RegExpExecArray | null;
      const attrs: string[] = [];

      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        const attrName = attrMatch[1];
        const dqValue = attrMatch[2];
        const sqValue = attrMatch[3];
        const braceValue = attrMatch[4];
        const rawValue = attrMatch[5];

        if (!attrName) continue;

        const jsxName = convertAttrName(attrName);

        // Boolean attributes — just the name is enough
        if (dqValue === undefined && sqValue === undefined && braceValue === undefined && rawValue === undefined) {
          if (BOOLEAN_ATTRS.has(attrName.toLowerCase())) {
            attrs.push(jsxName);
          } else {
            // Empty attribute like "disabled" — treat as boolean
            attrs.push(jsxName);
          }
          continue;
        }

        const rawVal = dqValue ?? sqValue ?? braceValue ?? rawValue ?? '';

        // Special handling for style attribute
        if (attrName.toLowerCase() === 'style' && opts.convertStyles) {
          const styleObj = convertStyleString(rawVal);
          attrs.push(`style=${styleObj}`);
          continue;
        }

        // Check for potential JSX expression in value (e.g. {variable})
        if (rawVal.includes('{') && rawVal.includes('}')) {
          warnings.push(`Found expression-like value in "${attrName}". Ensure it's wrapped in braces in JSX: ${attrName}={${rawVal}}`);
          attrs.push(`${jsxName}={${rawVal}}`);
          continue;
        }

        // Regular attribute
        attrs.push(`${jsxName}="${rawVal}"`);
      }

      if (attrs.length > 0) {
        jsxAttrs = ' ' + attrs.join(' ');
      }
    }

    if (isSelfClosing && opts.selfCloseVoid) {
      result += `<${lowerTag}${jsxAttrs} />`;
    } else {
      result += `<${lowerTag}${jsxAttrs}>`;
    }

    prevWasNewline = false;
  }

  // Clean up: collapse multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Wrap in fragment if configured
  if (opts.wrapFragment) {
    result = `<>\n${result.trim()}\n</>`;
  }

  return { jsx: result.trim(), warnings };
}

export default function HtmlToJsxConverterPage() {
  const [htmlInput, setHtmlInput] = useState(SAMPLE_HTML);
  const [options, setOptions] = useState<Options>({
    selfCloseVoid: true,
    convertStyles: true,
    removeDataReactRoot: false,
    wrapFragment: false,
    indentSize: 2,
    removeComments: false,
  });
  const [output, setOutput] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const convert = useCallback(
    (input: string, opts: Options) => {
      if (!input.trim()) {
        setOutput('');
        setWarnings([]);
        return;
      }
      const result = convertHtmlToJsx(input, opts);
      setOutput(result.jsx);
      setWarnings(result.warnings);
    },
    []
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setHtmlInput(value);
      convert(value, options);
    },
    [options, convert]
  );

  const updateOption = useCallback(
    <K extends keyof Options>(key: K, value: Options[K]) => {
      const newOptions = { ...options, [key]: value };
      setOptions(newOptions);
      convert(htmlInput, newOptions);
    },
    [htmlInput, options, convert]
  );

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('JSX copied!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const reset = useCallback(() => {
    setHtmlInput(SAMPLE_HTML);
    const defaultOpts: Options = {
      selfCloseVoid: true,
      convertStyles: true,
      removeDataReactRoot: false,
      wrapFragment: false,
      indentSize: 2,
      removeComments: false,
    };
    setOptions(defaultOpts);
    const result = convertHtmlToJsx(SAMPLE_HTML, defaultOpts);
    setOutput(result.jsx);
    setWarnings(result.warnings);
  }, []);

  // Swap input/output
  const swap = useCallback(() => {
    if (!output) return;
    setHtmlInput(output);
    convert(output, options);
  }, [output, options, convert]);

  const conversionCount = useMemo((): { tags: number; attrs: number } => {
    if (!htmlInput.trim()) return { tags: 0, attrs: 0 };
    const tagCount = (htmlInput.match(/<\/?[a-zA-Z][a-zA-Z0-9-]*/g) || []).length;
    const attrCount = (htmlInput.match(/\s[a-zA-Z-]+=/g) || []).length;
    return { tags: tagCount, attrs: attrCount };
  }, [htmlInput]);

  return (
    <ToolLayout
      title="HTML to JSX Converter"
      description="Convert raw HTML into valid JSX syntax. Automatically converts attributes (class → className), self-closes void elements, transforms inline styles, and handles SVG/ARIA attributes — 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={reset} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button onClick={swap} disabled={!output} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Swap
          </button>
          <button onClick={copyOutput} disabled={!output} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy JSX
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: HTML Input + Options */}
        <div className="space-y-6">
          {/* Input */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-brand-400" />
              HTML Input
            </h2>
            <textarea
              value={htmlInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Paste HTML here..."
              spellCheck={false}
              className="input-field w-full h-80 font-mono text-sm resize-none"
            />
            {conversionCount.tags > 0 && (
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span>{conversionCount.tags} tags detected</span>
                <span>{conversionCount.attrs} attributes to convert</span>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="card space-y-5">
            <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-brand-400" />
              Conversion Options
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.selfCloseVoid}
                  onChange={(e) => updateOption('selfCloseVoid', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Self-close void elements (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">&lt;br /&gt;</code>, <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">&lt;img /&gt;</code>)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.convertStyles}
                  onChange={(e) => updateOption('convertStyles', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Convert inline styles to JS objects (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">style={'{{}}'}</code>)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.wrapFragment}
                  onChange={(e) => updateOption('wrapFragment', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Wrap in fragment (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">&lt;&gt;...&lt;/&gt;</code>)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.removeComments}
                  onChange={(e) => updateOption('removeComments', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Remove HTML comments
                </span>
              </label>
            </div>
          </div>

          {/* Attribute Reference */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Attribute Conversions</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {[
                ['class', 'className'],
                ['for', 'htmlFor'],
                ['tabindex', 'tabIndex'],
                ['readonly', 'readOnly'],
                ['maxlength', 'maxLength'],
                ['colspan', 'colSpan'],
                ['rowspan', 'rowSpan'],
                ['contenteditable', 'contentEditable'],
                ['spellcheck', 'spellCheck'],
                ['autofocus', 'autoFocus'],
                ['cellpadding', 'cellPadding'],
                ['cellspacing', 'cellSpacing'],
                ['enctype', 'encType'],
                ['novalidate', 'noValidate'],
                ['frameborder', 'frameBorder'],
                ['fill-opacity', 'fillOpacity'],
                ['stroke-width', 'strokeWidth'],
                ['clip-path', 'clipPath'],
                ['font-family', 'fontFamily'],
                ['font-size', 'fontSize'],
              ].map(([html, jsx]) => (
                <div key={html} className="flex items-center justify-between py-1">
                  <code className="text-slate-500 font-mono">{html}</code>
                  <span className="text-slate-600 mx-1">→</span>
                  <code className="text-brand-400 font-mono">{jsx}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: JSX Output */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-brand-400" />
              JSX Output
            </h2>
            {output ? (
              <pre className="bg-slate-950 rounded-lg p-4 overflow-auto max-h-[500px] border border-slate-700/50">
                <code className="text-sm font-mono text-slate-200 whitespace-pre">{output}</code>
              </pre>
            ) : (
              <div className="bg-slate-950 rounded-lg p-8 border border-slate-700/50 text-center">
                <p className="text-slate-500 text-sm">Enter HTML to see the JSX conversion</p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="card border-yellow-500/30 bg-yellow-500/5">
              <h2 className="text-yellow-400 font-semibold text-sm mb-2">
                ⚠ {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
              </h2>
              <ul className="text-xs text-yellow-300/80 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="font-mono">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* How it works */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">How it works</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>• <strong className="text-slate-300">Attribute mapping</strong> — converts 70+ HTML attributes to their JSX equivalents (camelCase)</li>
              <li>• <strong className="text-slate-300">Void elements</strong> — self-closes <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">&lt;br&gt;</code>, <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">&lt;img&gt;</code>, <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">&lt;input&gt;</code> and more</li>
              <li>• <strong className="text-slate-300">Inline styles</strong> — converts CSS strings to JSX style objects</li>
              <li>• <strong className="text-slate-300">SVG + ARIA</strong> — handles SVG presentation attributes and ARIA properties</li>
              <li>• <strong className="text-slate-300">Comments</strong> — converts HTML comments to JSX comments (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">{'{/* ... */}'}</code>)</li>
              <li>• <strong className="text-slate-300">100% client-side</strong> — no data sent anywhere, instant conversion</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
