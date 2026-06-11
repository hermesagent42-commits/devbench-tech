'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, ArrowRight, FileCode, Check, RefreshCw, Braces } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Preset samples ──────────────────────────────────────────────────────────

const PRESETS: { name: string; html: string }[] = [
  {
    name: 'Simple Form',
    html: `<form class="login-form" onsubmit="return false">
  <label for="email">Email:</label>
  <input type="email" id="email" class="input-field" placeholder="you@example.com" />
  <br />
  <label for="password">Password:</label>
  <input type="password" id="password" class="input-field" />
  <br />
  <button type="submit" class="btn btn-primary" disabled>Sign In</button>
</form>`,
  },
  {
    name: 'Article with Inline Styles',
    html: `<article class="card" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
  <h2 style="font-size: 1.5rem; color: #111827;">Hello World</h2>
  <p class="text-gray-500" style="line-height: 1.6;">
    This is a <strong>paragraph</strong> with <a href="https://example.com" target="_blank" rel="noopener">a link</a>.
  </p>
  <img src="/hero.jpg" alt="Hero image" loading="lazy" />
</article>`,
  },
  {
    name: 'SVG Icon',
    html: `<svg class="icon icon-heart" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
</svg>`,
  },
  {
    name: 'HTML Comment & Data Attrs',
    html: `<div class="dashboard" data-user-id="42" data-role="admin" aria-label="User Dashboard">
  <!-- This is a HTML comment -->
  <table cellpadding="0" cellspacing="0" border="0">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="2">Loading...</td>
      </tr>
    </tbody>
  </table>
  <input type="checkbox" checked />
  <input type="radio" checked disabled />
</div>`,
  },
];

// ── HTML-to-JSX converter ───────────────────────────────────────────────────

const SELF_CLOSING_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Attributes to rename
const ATTR_MAP: Record<string, string> = {
  'class': 'className',
  'for': 'htmlFor',
  'tabindex': 'tabIndex',
  'viewbox': 'viewBox',
  'stroke-width': 'strokeWidth',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'text-anchor': 'textAnchor',
  'text-decoration': 'textDecoration',
  'text-rendering': 'textRendering',
  'letter-spacing': 'letterSpacing',
  'word-spacing': 'wordSpacing',
  'line-height': 'lineHeight',
  'background-color': 'backgroundColor',
  'border-radius': 'borderRadius',
  'border-color': 'borderColor',
  'border-width': 'borderWidth',
  'border-style': 'borderStyle',
  'margin-top': 'marginTop',
  'margin-right': 'marginRight',
  'margin-bottom': 'marginBottom',
  'margin-left': 'marginLeft',
  'padding-top': 'paddingTop',
  'padding-right': 'paddingRight',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
  'max-width': 'maxWidth',
  'max-height': 'maxHeight',
  'min-width': 'minWidth',
  'min-height': 'minHeight',
  'align-items': 'alignItems',
  'align-content': 'alignContent',
  'align-self': 'alignSelf',
  'justify-content': 'justifyContent',
  'justify-items': 'justifyItems',
  'justify-self': 'justifySelf',
  'flex-direction': 'flexDirection',
  'flex-wrap': 'flexWrap',
  'flex-flow': 'flexFlow',
  'flex-grow': 'flexGrow',
  'flex-shrink': 'flexShrink',
  'flex-basis': 'flexBasis',
  'grid-template-columns': 'gridTemplateColumns',
  'grid-template-rows': 'gridTemplateRows',
  'grid-template-areas': 'gridTemplateAreas',
  'grid-auto-columns': 'gridAutoColumns',
  'grid-auto-rows': 'gridAutoRows',
  'grid-auto-flow': 'gridAutoFlow',
  'grid-column': 'gridColumn',
  'grid-row': 'gridRow',
  'grid-column-start': 'gridColumnStart',
  'grid-column-end': 'gridColumnEnd',
  'grid-row-start': 'gridRowStart',
  'grid-row-end': 'gridRowEnd',
  'grid-gap': 'gridGap',
  'grid-column-gap': 'gridColumnGap',
  'grid-row-gap': 'gridRowGap',
  'gap': 'gap',
  'row-gap': 'rowGap',
  'column-gap': 'columnGap',
  'object-fit': 'objectFit',
  'object-position': 'objectPosition',
  'transform-origin': 'transformOrigin',
  'transform-style': 'transformStyle',
  'transition-duration': 'transitionDuration',
  'transition-delay': 'transitionDelay',
  'transition-property': 'transitionProperty',
  'transition-timing-function': 'transitionTimingFunction',
  'animation-duration': 'animationDuration',
  'animation-delay': 'animationDelay',
  'animation-name': 'animationName',
  'animation-timing-function': 'animationTimingFunction',
  'animation-fill-mode': 'animationFillMode',
  'animation-iteration-count': 'animationIterationCount',
  'animation-direction': 'animationDirection',
  'animation-play-state': 'animationPlayState',
  'z-index': 'zIndex',
  'box-shadow': 'boxShadow',
  'text-shadow': 'textShadow',
  'text-align': 'textAlign',
  'text-transform': 'textTransform',
  'text-overflow': 'textOverflow',
  'text-indent': 'textIndent',
  'white-space': 'whiteSpace',
  'word-break': 'wordBreak',
  'word-wrap': 'wordWrap',
  'overflow-wrap': 'overflowWrap',
  'overflow-x': 'overflowX',
  'overflow-y': 'overflowY',
  'border-top-left-radius': 'borderTopLeftRadius',
  'border-top-right-radius': 'borderTopRightRadius',
  'border-bottom-left-radius': 'borderBottomLeftRadius',
  'border-bottom-right-radius': 'borderBottomRightRadius',
  'border-collapse': 'borderCollapse',
  'border-spacing': 'borderSpacing',
  'table-layout': 'tableLayout',
  'caption-side': 'captionSide',
  'empty-cells': 'emptyCells',
  'list-style': 'listStyle',
  'list-style-type': 'listStyleType',
  'list-style-position': 'listStylePosition',
  'list-style-image': 'listStyleImage',
  'pointer-events': 'pointerEvents',
  'user-select': 'userSelect',
  'visibility': 'visibility',
  'outline-color': 'outlineColor',
  'outline-style': 'outlineStyle',
  'outline-width': 'outlineWidth',
  'outline-offset': 'outlineOffset',
  'scroll-behavior': 'scrollBehavior',
  'scroll-snap-type': 'scrollSnapType',
  'scroll-snap-align': 'scrollSnapAlign',
  'overscroll-behavior': 'overscrollBehavior',
  'overscroll-behavior-x': 'overscrollBehaviorX',
  'overscroll-behavior-y': 'overscrollBehaviorY',
  'touch-action': 'touchAction',
  'will-change': 'willChange',
  'caret-color': 'caretColor',
  'accent-color': 'accentColor',
  'aspect-ratio': 'aspectRatio',
  'backdrop-filter': 'backdropFilter',
  'backface-visibility': 'backfaceVisibility',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'color-interpolation': 'colorInterpolation',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'dominant-baseline': 'dominantBaseline',
  'enable-background': 'enableBackground',
  'fill-rule': 'fillRule',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'image-rendering': 'imageRendering',
  'lighting-color': 'lightingColor',
  'marker-end': 'markerEnd',
  'marker-mid': 'markerMid',
  'marker-start': 'markerStart',
  'mask-type': 'maskType',
  'mix-blend-mode': 'mixBlendMode',
  'paint-order': 'paintOrder',
  'shape-rendering': 'shapeRendering',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'vector-effect': 'vectorEffect',
  'writing-mode': 'writingMode',
  'xlink:href': 'xlinkHref',
  'xlink:show': 'xlinkShow',
  'xlink:title': 'xlinkTitle',
  'xlink:type': 'xlinkType',
  'xlink:actuate': 'xlinkActuate',
  'xlink:arcrole': 'xlinkArcrole',
  'xlink:role': 'xlinkRole',
  'xml:space': 'xmlSpace',
  'xml:lang': 'xmlLang',
  'xml:base': 'xmlBase',
  'cellpadding': 'cellPadding',
  'cellspacing': 'cellSpacing',
  'charset': 'charSet',
  'classid': 'classID',
  'colspan': 'colSpan',
  'contenteditable': 'contentEditable',
  'contextmenu': 'contextMenu',
  'crossorigin': 'crossOrigin',
  'datetime': 'dateTime',
  'enctype': 'encType',
  'formaction': 'formAction',
  'formenctype': 'formEncType',
  'formmethod': 'formMethod',
  'formnovalidate': 'formNoValidate',
  'formtarget': 'formTarget',
  'frameborder': 'frameBorder',
  'href': 'href',
  'hreflang': 'hrefLang',
  'http-equiv': 'httpEquiv',
  'inputmode': 'inputMode',
  'ismap': 'isMap',
  'itemid': 'itemID',
  'itemprop': 'itemProp',
  'itemref': 'itemRef',
  'itemscope': 'itemScope',
  'itemtype': 'itemType',
  'keytype': 'keyType',
  'marginheight': 'marginHeight',
  'marginwidth': 'marginWidth',
  'maxlength': 'maxLength',
  'mediagroup': 'mediaGroup',
  'minlength': 'minLength',
  'novalidate': 'noValidate',
  'playsinline': 'playsInline',
  'radiogroup': 'radioGroup',
  'readonly': 'readOnly',
  'referrerpolicy': 'referrerPolicy',
  'rowspan': 'rowSpan',
  'spellcheck': 'spellCheck',
  'srcdoc': 'srcDoc',
  'srclang': 'srcLang',
  'srcset': 'srcSet',
  'start': 'start',
  'usemap': 'useMap',
};

// Boolean attributes in React (value is the attribute name itself)
const BOOL_ATTRS = new Set([
  'checked', 'disabled', 'selected', 'readOnly', 'required',
  'multiple', 'autoFocus', 'autoPlay', 'controls', 'loop',
  'muted', 'playsInline', 'noValidate', 'defaultChecked',
  'default', 'defer', 'async', 'hidden', 'open', 'ismap',
  'itemScope', 'capture', 'formNoValidate', 'indeterminate',
]);

function convertStyleString(styleStr: string): string {
  if (!styleStr.trim()) return '';
  const props = styleStr.split(';').filter(s => s.trim());
  if (props.length === 0) return '';

  const jsxProps: string[] = [];
  for (const prop of props) {
    const colonIdx = prop.indexOf(':');
    if (colonIdx === -1) continue;
    const key = prop.substring(0, colonIdx).trim();
    let value = prop.substring(colonIdx + 1).trim();
    // Convert CSS property to camelCase
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    // Quote values that aren't numbers
    const isNumeric = /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms|deg|rad)?$/.test(value);
    if (isNumeric) {
      jsxProps.push(`${camelKey}: ${JSON.stringify(value)}`);
    } else {
      jsxProps.push(`${camelKey}: "${value.replace(/"/g, '\\"')}"`);
    }
  }
  return `{${'{'} ${jsxProps.join(', ')} ${'}'}}`;
}

function convertAttribute(name: string, value: string): string {
  // Handle event handlers
  if (name.startsWith('on')) {
    // onsubmit -> onSubmit, onclick -> onClick, etc.
    const camelName = 'on' + name[2].toUpperCase() + name.slice(3);
    return `${camelName}={${'{'}${value}${'}'}}`;
  }

  // Handle className
  if (name === 'class') {
    return `className="${value}"`;
  }

  // Handle htmlFor
  if (name === 'for') {
    return `htmlFor="${value}"`;
  }

  // Handle style attribute separately
  if (name === 'style') {
    const jsxStyle = convertStyleString(value);
    return jsxStyle ? `style=${jsxStyle}` : '';
  }

  // Handle boolean attributes
  if (BOOL_ATTRS.has(name) && (value === '' || value === name)) {
    return `${name}={${'{'}true${'}'}}`;
  }

  // Handle data-* and aria-* (keep as-is)
  if (name.startsWith('data-') || name.startsWith('aria-')) {
    return `${name}="${value.replace(/"/g, '&quot;')}"`;
  }

  // Convert to camelCase if in map
  const camelName = ATTR_MAP[name] || name;
  return `${camelName}="${value.replace(/"/g, '&quot;')}"`;
}

function htmlToJsx(html: string): string {
  if (!html.trim()) return '';

  // Step 1: Remove HTML comments and convert to JSX comments
  // Use [\s\S] instead of /s flag for ES2017 compatibility
  let result = html.replace(/<!--([\s\S]*?)-->/g, (_, content) => {
    return `{/*${content}*/}`;
  });

  // Step 2: Process tags using a simple regex-based parser
  // Match tags (opening, self-closing, closing)
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g;

  result = result.replace(tagRegex, (match, tagName, attrsStr, selfClose) => {
    const isClosing = match.startsWith('</');
    const isSelfClosing = selfClose === '/' || SELF_CLOSING_TAGS.has(tagName.toLowerCase());

    // Closing tag: just return lowercased
    if (isClosing) {
      return `</${tagName}>`;
    }

    // Parse attributes
    const attrs: string[] = [];
    if (attrsStr.trim()) {
      // Match attributes: name="value" or name='value' or name or name={...}
      const attrRegex = /([a-zA-Z][a-zA-Z0-9-:]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\{[^}]*\})))?/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        const name = attrMatch[1].toLowerCase();
        const value = attrMatch[2] !== undefined ? attrMatch[2] :
                     attrMatch[3] !== undefined ? attrMatch[3] :
                     attrMatch[4] !== undefined ? attrMatch[4] : '';
        const converted = convertAttribute(name, value);
        if (converted) attrs.push(converted);
      }
    }

    const attrsString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    if (isSelfClosing) {
      return `<${tagName}${attrsString} />`;
    }
    return `<${tagName}${attrsString}>`;
  });

  // Step 3: Clean up escaped quotes in JSX comments
  result = result.replace(/\{&quot;\/*/g, '{/*');
  result = result.replace(/\*&quot;\}/g, '*/}');

  // Step 4: Fix self-closing tags that the regex might miss
  const selfClosingRegex = new RegExp(
    `<(${[...SELF_CLOSING_TAGS].join('|')})([^>]*?)>`,
    'gi'
  );
  result = result.replace(selfClosingRegex, (match, tag, attrs) => {
    if (match.endsWith('/>')) return match;
    return `<${tag}${attrs} />`;
  });

  return result;
}

function countChanges(original: string, converted: string): { classToClassName: number; styleConversions: number; attrRenames: number; commentConversions: number; selfClosing: number; boolAttrs: number } {
  const classCount = (original.match(/\sclass=/g) || []).length;
  const styleCount = (original.match(/\sstyle=/g) || []).length;
  const attrCount = (original.match(/\s(tabindex|for|cellpadding|cellspacing|colspan|rowspan|contenteditable|spellcheck|readonly|maxlength|frameborder|enctype|novalidate|datetime|formaction|playsinline|referrerpolicy|srcdoc|srcset|usemap|hreflang|inputmode|crossorigin)=/gi) || []).length;
  const commentCount = (original.match(/<!--/g) || []).length;
  const selfCloseCount = (original.match(/<(img|input|br|hr|meta|link|source|area|base|col|embed|track|wbr)\b[^>]*?(?<!\/)>/gi) || []).length;
  const boolCount = (original.match(/\s(checked|disabled|selected|required|multiple|autofocus|autoplay|controls|loop|muted|hidden|open|async|defer|default)(?:\s*=\s*(?:"\1"|'\1'|\1)|\s*)(?=[\s/>])/gi) || []).length;

  return {
    classToClassName: classCount,
    styleConversions: styleCount,
    attrRenames: attrCount,
    commentConversions: commentCount,
    selfClosing: selfCloseCount,
    boolAttrs: boolCount,
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function HtmlToJsxPage() {
  const [input, setInput] = useState('');
  const [converted, setConverted] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [stats, setStats] = useState<ReturnType<typeof countChanges> | null>(null);

  const convert = useCallback((html: string) => {
    if (!html.trim()) {
      setConverted('');
      setStats(null);
      return;
    }
    const jsx = htmlToJsx(html);
    setConverted(jsx);
    setStats(countChanges(html, jsx));
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    convert(val);
    if (val !== selectedPreset) setSelectedPreset('');
  }, [convert, selectedPreset]);

  const handlePreset = useCallback((name: string, html: string) => {
    setSelectedPreset(name);
    setInput(html);
    convert(html);
  }, [convert]);

  const handleClear = useCallback(() => {
    setInput('');
    setConverted('');
    setStats(null);
    setSelectedPreset('');
  }, []);

  const handleCopy = useCallback(async () => {
    if (!converted) return;
    try {
      await navigator.clipboard.writeText(converted);
      toast.success('JSX copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [converted]);

  const totalChanges = stats
    ? stats.classToClassName + stats.styleConversions + stats.attrRenames +
      stats.commentConversions + stats.selfClosing + stats.boolAttrs
    : 0;

  return (
    <ToolLayout
      title="HTML to JSX Converter"
      description="Convert HTML markup to valid JSX syntax — transform class to className, style strings to objects, self-close void elements, and more."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Presets:</span>
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => handlePreset(p.html, p.html)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedPreset === p.html
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-orange-400" />
              HTML Input
            </label>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder={`Paste HTML here...\n\nExample:\n<div class="container">\n  <label for="email">Email</label>\n  <input type="text" id="email" />\n</div>`}
            className="w-full h-[420px] p-4 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Braces className="w-4 h-4 text-blue-400" />
              JSX Output
            </label>
            <button
              onClick={handleCopy}
              disabled={!converted}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded-lg border border-brand-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Copy className="w-3 h-3" />
              Copy JSX
            </button>
          </div>
          <pre className="w-full h-[420px] p-4 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 overflow-auto whitespace-pre-wrap break-all">
            {converted || (
              <span className="text-slate-600">JSX output will appear here...</span>
            )}
          </pre>
        </div>
      </div>

      {/* Stats */}
      {converted && stats && (
        <div className="mt-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Conversion Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {stats.classToClassName > 0 && (
              <div className="flex flex-col items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-lg font-bold text-orange-400">{stats.classToClassName}</span>
                <span className="text-[11px] text-slate-500 text-center">class → className</span>
              </div>
            )}
            {stats.styleConversions > 0 && (
              <div className="flex flex-col items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-lg font-bold text-purple-400">{stats.styleConversions}</span>
                <span className="text-[11px] text-slate-500 text-center">style → object</span>
              </div>
            )}
            {stats.attrRenames > 0 && (
              <div className="flex flex-col items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-lg font-bold text-blue-400">{stats.attrRenames}</span>
                <span className="text-[11px] text-slate-500 text-center">attr renames</span>
              </div>
            )}
            {stats.commentConversions > 0 && (
              <div className="flex flex-col items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-lg font-bold text-green-400">{stats.commentConversions}</span>
                <span className="text-[11px] text-slate-500 text-center">{'<!-- --> → {/* */}'}</span>
              </div>
            )}
            {stats.selfClosing > 0 && (
              <div className="flex flex-col items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-lg font-bold text-yellow-400">{stats.selfClosing}</span>
                <span className="text-[11px] text-slate-500 text-center">self-closing</span>
              </div>
            )}
            {stats.boolAttrs > 0 && (
              <div className="flex flex-col items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-lg font-bold text-cyan-400">{stats.boolAttrs}</span>
                <span className="text-[11px] text-slate-500 text-center">boolean attrs</span>
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500 text-center">
            <span className="font-medium text-slate-300">{totalChanges}</span> total conversions applied
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
