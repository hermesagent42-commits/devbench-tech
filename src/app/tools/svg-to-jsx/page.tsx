'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, FileCode, Eye, RefreshCw, Code2, Brackets } from 'lucide-react';
import toast from 'react-hot-toast';

// ── SVG Attribute → JSX mapping ─────────────────────────────────────────

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
  'fill-rule': 'fillRule',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'color-interpolation': 'colorInterpolation',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'color-rendering': 'colorRendering',
  'enable-background': 'enableBackground',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-size-adjust': 'fontSizeAdjust',
  'font-stretch': 'fontStretch',
  'font-style': 'fontStyle',
  'font-variant': 'fontVariant',
  'font-weight': 'fontWeight',
  'glyph-orientation-horizontal': 'glyphOrientationHorizontal',
  'glyph-orientation-vertical': 'glyphOrientationVertical',
  'image-rendering': 'imageRendering',
  'letter-spacing': 'letterSpacing',
  'lighting-color': 'lightingColor',
  'marker-end': 'markerEnd',
  'marker-mid': 'markerMid',
  'marker-start': 'markerStart',
  'overflow-wrap': 'overflowWrap',
  'paint-order': 'paintOrder',
  'pointer-events': 'pointerEvents',
  'shape-rendering': 'shapeRendering',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'stroke': 'stroke',
  'text-anchor': 'textAnchor',
  'text-decoration': 'textDecoration',
  'text-rendering': 'textRendering',
  'transform-origin': 'transformOrigin',
  'unicode-bidi': 'unicodeBidi',
  'vector-effect': 'vectorEffect',
  'visibility': 'visibility',
  'word-spacing': 'wordSpacing',
  'writing-mode': 'writingMode',
  'xml:space': 'xmlSpace',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
  'xlink:title': 'xlinkTitle',
  'xlink:show': 'xlinkShow',
  'xlink:actuate': 'xlinkActuate',
};

// Void SVG elements (self-closing)
const VOID_ELEMENTS = new Set([
  'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect',
  'stop', 'use', 'image', 'animate', 'animateMotion', 'animateTransform',
  'set', 'mpath', 'view', 'feBlend', 'feColorMatrix', 'feComponentTransfer',
  'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG',
  'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence',
]);

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function attrNameToJSX(name: string): string {
  // Check the direct map first
  if (ATTR_MAP[name]) return ATTR_MAP[name];

  // Data attributes: keep as-is
  if (name.startsWith('data-')) return name;

  // aria attributes: keep as-is
  if (name.startsWith('aria-')) return name;

  // xmlns:* → xmlns*
  if (name.startsWith('xmlns:')) {
    const suffix = name.slice(6);
    return `xmlns${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;
  }

  // Generic kebab → camelCase
  return kebabToCamel(name);
}

function convertStyleStringToJSX(styleStr: string): string {
  const rules = styleStr.split(';').filter(Boolean).map((r) => r.trim());
  if (rules.length === 0) return '{{}}';

  const props = rules.map((rule) => {
    const colonIdx = rule.indexOf(':');
    if (colonIdx === -1) return null;
    const key = kebabToCamel(rule.slice(0, colonIdx).trim());
    const value = rule.slice(colonIdx + 1).trim();
    // Numeric values (no unit or px-only) can be bare numbers
    const isNumeric = /^\d+(\.\d+)?$/.test(value) || /^\d+(\.\d+)?px$/.test(value);
    if (isNumeric) {
      const num = parseFloat(value);
      return `  ${key}: ${num}`;
    }
    return `  ${key}: "${value}"`;
  }).filter(Boolean);

  if (props.length === 0) return '{{}}';
  return `{{\n${props.join(',\n')}\n}}`;
}

// ── SVG → JSX converter ────────────────────────────────────────────────

interface ConversionResult {
  jsx: string;
  stats: {
    attrCount: number;
    camelCaseCount: number;
    styleConverted: boolean;
    sizeReduction: string;
  };
}

function svgToJSX(svg: string): ConversionResult | null {
  if (!svg.trim()) return null;

  const originalSize = svg.length;
  let attrCount = 0;
  let camelCaseCount = 0;
  let styleConverted = false;

  // Normalize line endings
  let result = svg.replace(/\r\n/g, '\n');

  // Convert attributes: attribute="value" → JSX attribute={value} or attribute="value"
  // We need to handle different patterns: name="val", name='val', name={val}, name
  result = result.replace(
    /(\s+)([a-zA-Z][\w:.-]*)(?:=)(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})?/g,
    (full, space, attrName, doubleQuoted, singleQuoted, braced) => {
      attrCount++;
      const jsxName = attrNameToJSX(attrName.toLowerCase());
      if (jsxName !== attrName) camelCaseCount++;

      const value = doubleQuoted ?? singleQuoted ?? braced ?? null;

      // Handle style attribute specially
      if (attrName.toLowerCase() === 'style' && value) {
        styleConverted = true;
        const jsxStyle = convertStyleStringToJSX(value);
        return `${space}style=${jsxStyle}`;
      }

      // Boolean attributes (no value)
      if (value === null || value === '') {
        // Some attributes in SVG are truly boolean-like when empty
        return `${space}${jsxName}`;
      }

      // Check if value is numeric or a JS expression
      const isNumeric = /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|deg|rad)?$/.test(value);
      if (isNumeric) {
        const numVal = parseFloat(value);
        // Only use bare numbers for actual numbers without units
        if (/^-?\d+(\.\d+)?$/.test(value)) {
          return `${space}${jsxName}={${numVal}}`;
        }
        return `${space}${jsxName}="${value}"`;
      }

      // URL references like url(#id)
      if (value.startsWith('url(')) {
        return `${space}${jsxName}="${value}"`;
      }

      // Everything else: keep as string
      return `${space}${jsxName}="${value}"`;
    }
  );

  // Self-close void elements: <circle ...>  → <circle ... />
  // Need to handle both opening tags with closing tags and standalone void elements
  for (const el of VOID_ELEMENTS) {
    // Match: <el ...>  that are NOT followed by </el> — meaning they're void
    const regex = new RegExp(`<(${el})([^>]*?)>`, 'gi');
    result = result.replace(regex, (match, tag, attrs) => {
      // Check if this has a closing tag later — if so leave it
      const closeRegex = new RegExp(`</${tag}\\s*>`, 'i');
      const afterMatch = result.slice(result.indexOf(match) + match.length);
      if (closeRegex.test(afterMatch)) {
        return match; // Has closing tag, keep as-is
      }
      return `<${tag}${attrs} />`;
    });
  }

  // Remove XML declaration
  result = result.replace(/<\?xml[^?]*\?>\s*/i, '');

  // Remove DOCTYPE
  result = result.replace(/<!DOCTYPE[^>]*>\s*/i, '');

  // Remove SVG comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Collapse multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Trim
  result = result.trim();

  const sizeReduction = originalSize > 0
    ? `${Math.max(0, Math.round((1 - result.length / originalSize) * 100))}%`
    : '0%';

  return {
    jsx: result,
    stats: {
      attrCount,
      camelCaseCount,
      styleConverted,
      sizeReduction,
    },
  };
}

// ── Presets ─────────────────────────────────────────────────────────────

const PRESETS = [
  {
    name: 'Simple Icon',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10" />
  <path d="M8 12l2 2 4-4" />
</svg>`,
  },
  {
    name: 'Heart Icon',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
</svg>`,
  },
  {
    name: 'Styled SVG',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" rx="12" fill="#6366f1" />
  <text x="50" y="58" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="white">JSX</text>
  <circle cx="70" cy="24" r="14" fill="#f43f5e" stroke="white" stroke-width="2" />
  <text x="70" y="29" text-anchor="middle" font-size="14" font-weight="bold" fill="white">✓</text>
</svg>`,
  },
  {
    name: 'Gradient Logo',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#g)" />
  <path d="M20 38l8-6-8-6" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M32 42V22" stroke="white" stroke-width="3" stroke-linecap="round" />
  <path d="M44 38l-8-6 8-6" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
  },
];

// ── Main Component ──────────────────────────────────────────────────────

export default function SvgToJsxPage() {
  const [input, setInput] = useState(PRESETS[0].svg);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState(0);

  const result = useMemo(() => svgToJSX(input), [input]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.jsx);
      setCopied(true);
      toast.success('JSX copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [result]);

  const handlePreset = useCallback((index: number) => {
    setInput(PRESETS[index].svg);
    setActivePreset(index);
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setActivePreset(-1);
  }, []);

  const charCount = input.length;
  const lineCount = input ? input.split('\n').length : 0;

  return (
    <ToolLayout
      title="SVG → JSX Converter"
      description="Convert SVG markup to JSX for React and JSX-based frameworks. CamelCase attributes, self-closing void elements, style-to-object conversion — zero dependencies."
    >
      {/* Preset bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.name}
            onClick={() => handlePreset(i)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activePreset === i
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            {preset.name}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all ml-auto"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: SVG Input */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="w-4 h-4 text-brand-400" />
            <h3 className="text-white font-semibold text-sm">SVG Markup</h3>
            <span className="text-xs text-slate-500 ml-auto">
              {lineCount} line{lineCount !== 1 ? 's' : ''} · {charCount.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setActivePreset(-1);
            }}
            placeholder="Paste your SVG markup here..."
            className="w-full h-[420px] bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 resize-y"
            spellCheck={false}
          />
        </div>

        {/* Right: JSX Output */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brackets className="w-4 h-4 text-brand-400" />
            <h3 className="text-white font-semibold text-sm">JSX Output</h3>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleCopy}
                disabled={!result}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy JSX'}
              </button>
            </div>
          </div>
          <div className="w-full h-[420px] bg-surface border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-auto whitespace-pre resize-y">
            {result ? (
              <code>{result.jsx}</code>
            ) : input.trim() ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-slate-600 mx-auto mb-3 animate-spin" />
                  <p className="text-slate-500 text-sm">Converting...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Code2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Paste SVG markup on the left to see the JSX output</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      {result && (
        <div className="mt-6 card">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-brand-400" />
            <h3 className="text-white font-semibold text-sm">Conversion Stats</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className="text-2xl font-bold text-brand-400">{result.stats.attrCount}</div>
              <div className="text-xs text-slate-500 mt-1">Attributes Processed</div>
            </div>
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{result.stats.camelCaseCount}</div>
              <div className="text-xs text-slate-500 mt-1">CamelCase Conversions</div>
            </div>
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {result.stats.styleConverted ? 'Yes' : 'No'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Style → Object</div>
            </div>
            <div className="bg-surface rounded-lg border border-slate-700/50 p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{result.stats.sizeReduction}</div>
              <div className="text-xs text-slate-500 mt-1">Size Change</div>
            </div>
          </div>
        </div>
      )}

      {/* SVG Preview */}
      {input.trim() && (
        <div className="mt-6 card">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-brand-400" />
            <h3 className="text-white font-semibold text-sm">Live SVG Preview</h3>
          </div>
          <div className="bg-white/5 rounded-lg border border-slate-700/50 p-6 flex items-center justify-center min-h-[200px]">
            <div
              dangerouslySetInnerHTML={{ __html: input }}
              className="[&>svg]:max-w-full [&>svg]:max-h-[300px]"
            />
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 card">
        <h3 className="text-white font-semibold text-sm mb-3">What gets converted</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { from: 'class', to: 'className', desc: 'CSS class attribute' },
            { from: 'stroke-width', to: 'strokeWidth', desc: 'Kebab-case → camelCase' },
            { from: 'stroke-linecap', to: 'strokeLinecap', desc: 'All dashed SVG attrs' },
            { from: 'style="color:red"', to: 'style={{ color: "red" }}', desc: 'Style string → JSX object' },
            { from: 'fill-rule', to: 'fillRule', desc: 'Even long names like fillOpacity' },
            { from: 'xlink:href', to: 'xlinkHref', desc: 'Namespace-prefixed attrs' },
            { from: '<circle ...>', to: '<circle ... />', desc: 'Self-closing void elements' },
            { from: '<rect ...>', to: '<rect ... />', desc: 'All SVG shape elements' },
            { from: 'font-family', to: 'fontFamily', desc: 'Typography attributes' },
            { from: 'text-anchor', to: 'textAnchor', desc: 'Text alignment attrs' },
            { from: 'data-*', to: 'data-*', desc: 'Kept as-is (HTML standard)' },
            { from: 'aria-*', to: 'aria-*', desc: 'Kept as-is (WAI-ARIA)' },
          ].map(({ from, to, desc }) => (
            <div key={from} className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-slate-700/30">
              <div className="shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-brand-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <code className="text-xs font-mono text-slate-500 line-through">{from}</code>
                  <span className="text-slate-600">→</span>
                  <code className="text-xs font-mono text-brand-400">{to}</code>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
