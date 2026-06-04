'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Code,
  Eye,
  FileCode,
  Download,
  RotateCcw,
  RefreshCw,
  Check,
  Info,
  Maximize2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ExportMode = 'typescript' | 'javascript';
type ExportType = 'named' | 'default';

interface ConversionOptions {
  typescript: boolean;
  exportType: ExportType;
  addProps: boolean;
  propWidth: string;
  propHeight: string;
  propColor: string;
  componentName: string;
}

// ── SVG attribute name map (kebab → camelCase) ─────────────────────────────

const SVG_ATTR_MAP: Record<string, string> = {
  'accent-height': 'accentHeight',
  'alignment-baseline': 'alignmentBaseline',
  'arabic-form': 'arabicForm',
  'baseline-shift': 'baselineShift',
  'cap-height': 'capHeight',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'color-interpolation': 'colorInterpolation',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'color-profile': 'colorProfile',
  'color-rendering': 'colorRendering',
  'dominant-baseline': 'dominantBaseline',
  'enable-background': 'enableBackground',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-size-adjust': 'fontSizeAdjust',
  'font-stretch': 'fontStretch',
  'font-style': 'fontStyle',
  'font-variant': 'fontVariant',
  'font-weight': 'fontWeight',
  'glyph-name': 'glyphName',
  'glyph-orientation-horizontal': 'glyphOrientationHorizontal',
  'glyph-orientation-vertical': 'glyphOrientationVertical',
  'horiz-adv-x': 'horizAdvX',
  'horiz-origin-x': 'horizOriginX',
  'image-rendering': 'imageRendering',
  'letter-spacing': 'letterSpacing',
  'lighting-color': 'lightingColor',
  'marker-end': 'markerEnd',
  'marker-mid': 'markerMid',
  'marker-start': 'markerStart',
  'overline-position': 'overlinePosition',
  'overline-thickness': 'overlineThickness',
  'paint-order': 'paintOrder',
  'panose-1': 'panose1',
  'pointer-events': 'pointerEvents',
  'rendering-intent': 'renderingIntent',
  'shape-rendering': 'shapeRendering',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'strikethrough-position': 'strikethroughPosition',
  'strikethrough-thickness': 'strikethroughThickness',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'stroke-width': 'strokeWidth',
  'text-anchor': 'textAnchor',
  'text-decoration': 'textDecoration',
  'text-rendering': 'textRendering',
  'underline-position': 'underlinePosition',
  'underline-thickness': 'underlineThickness',
  'unicode-bidi': 'unicodeBidi',
  'unicode-range': 'unicodeRange',
  'units-per-em': 'unitsPerEm',
  'v-alphabetic': 'vAlphabetic',
  'v-hanging': 'vHanging',
  'v-ideographic': 'vIdeographic',
  'v-mathematical': 'vMathematical',
  'vector-effect': 'vectorEffect',
  'vert-adv-y': 'vertAdvY',
  'vert-origin-x': 'vertOriginX',
  'vert-origin-y': 'vertOriginY',
  'word-spacing': 'wordSpacing',
  'writing-mode': 'writingMode',
  'x-height': 'xHeight',
  'xlink:actuate': 'xlinkActuate',
  'xlink:arcrole': 'xlinkArcrole',
  'xlink:href': 'xlinkHref',
  'xlink:role': 'xlinkRole',
  'xlink:show': 'xlinkShow',
  'xlink:title': 'xlinkTitle',
  'xlink:type': 'xlinkType',
  'xml:base': 'xmlBase',
  'xml:lang': 'xmlLang',
  'xml:space': 'xmlSpace',
};

const SVG_SELF_CLOSING_TAGS = new Set([
  'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline',
  'rect', 'stop', 'use', 'image', 'animate', 'animateTransform',
  'set', 'animateMotion', 'mpath', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight',
  'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG',
  'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence',
]);

// Attributes that should always be kept as lowercase strings (not camelCase)
const LOWERCASE_ATTRS = new Set(['class', 'id', 'role', 'tabindex']);

// ── SVG → React conversion logic ───────────────────────────────────────────

function camelCaseAttr(name: string): string {
  if (LOWERCASE_ATTRS.has(name)) return name;
  if (name.startsWith('aria-')) return 'aria-' + name.slice(5).split('-').map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
  if (name.startsWith('data-')) return name; // Keep data-* as-is
  return SVG_ATTR_MAP[name] || name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function convertAttrValue(name: string, value: string): string {
  // 'class' → 'className'
  if (name === 'class') return 'className';
  // style strings: convert to JSX object style
  return `"${value.replace(/"/g, '&quot;')}"`;
}

function convertSVGtoReact(svgString: string, opts: ConversionOptions): string {
  try {
    // Parse SVG string into a rough structure
    const cleaned = svgString
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\n\s*\n/g, '\n')       // Collapse blank lines
      .trim();

    // Extract the <svg> tag and its contents
    const svgMatch = cleaned.match(/<svg([^>]*)>([\s\S]*)<\/svg\s*>/i);
    if (!svgMatch) {
      return '// Error: Could not parse SVG. Make sure it has a valid <svg>...</svg> structure.';
    }

    let svgAttrs = svgMatch[1];
    const innerContent = svgMatch[2];

    // Parse SVG attributes
    const attrPattern = /([a-zA-Z][\w-]*(?::[\w-]+)?)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrPattern.exec(svgAttrs)) !== null) {
      const name = attrMatch[1];
      const value = attrMatch[3] || attrMatch[4] || attrMatch[5] || '';
      attrs[name] = value;
    }

    // Convert inner content: replace attribute names
    let convertedInner = innerContent;

    // Process all kebab-case attributes in content
    const allAttrRegex = /([a-zA-Z][\w-]*(?::[\w-]+)?)\s*=\s*("([^"]*)"|'([^']*)'|\{([^}]*)\})/g;
    convertedInner = convertedInner.replace(allAttrRegex, (match, name, value) => {
      const camelName = camelCaseAttr(name);
      let val = value;

      // Handle style attributes specially
      if (name === 'style') {
        return `style={{${convertStyleString(value)}}}`;
      }

      // class → className
      if (camelName === 'className') {
        // If the value is inside quotes, keep it as a string
        if (val.startsWith('"') || val.startsWith("'")) {
          const inner = val.slice(1, -1);
          return `className="${inner}"`;
        }
        return `className=${val}`;
      }

      return `${camelName}=${val}`;
    });

    // Close self-closing tags (SVG style → JSX style)
    convertedInner = convertedInner.replace(/<(\w+)([^>]*?)\/>/g, (match, tag, tagAttrs) => {
      if (SVG_SELF_CLOSING_TAGS.has(tag.toLowerCase())) {
        return `<${tag}${tagAttrs} />`;
      }
      return match;
    });

    // Generate the component
    const componentName = opts.componentName || 'Icon';
    const isTS = opts.typescript;

    let propsInterface = '';
    let propsDestructure = '';

    if (opts.addProps) {
      if (isTS) {
        propsInterface = `interface ${componentName}Props {\n  size?: number;\n  color?: string;\n  className?: string;\n}`;
      } else {
        propsInterface = '';
      }
    }

    // Build the SVG opening tag with dynamic props
    const width = attrs.width || '24';
    const height = attrs.height || '24';
    const viewBox = attrs.viewBox || '0 0 24 24';
    const fill = attrs.fill || 'none';
    const stroke = attrs.stroke || 'currentColor';
    const strokeWidth = attrs['stroke-width'] || attrs.strokeWidth || '2';
    const strokeLinecap = attrs['stroke-linecap'] || attrs.strokeLinecap || 'round';
    const strokeLinejoin = attrs['stroke-linejoin'] || attrs.strokeLinejoin || 'round';

    let jsxSvgAttrs = '';
    if (opts.addProps) {
      jsxSvgAttrs = `\n    width={size}\n    height={size}\n    viewBox="${viewBox}"\n    fill="${fill}"\n    stroke={color}\n    strokeWidth={${strokeWidth}}\n    strokeLinecap="${strokeLinecap}"\n    strokeLinejoin="${strokeLinejoin}"\n    className={className}`;
      propsDestructure = `{ size = ${width}, color = 'currentColor', className = '' }`;
    } else {
      // Static version
      jsxSvgAttrs = `\n    width="${width}"\n    height="${height}"\n    viewBox="${viewBox}"\n    fill="${fill}"\n    stroke="${stroke}"\n    strokeWidth="${strokeWidth}"\n    strokeLinecap="${strokeLinecap}"\n    strokeLinejoin="${strokeLinejoin}"`;
    }

    // Build the export
    let exportLine = '';
    if (opts.exportType === 'named') {
      exportLine = `export function ${componentName}(${propsDestructure}) {`;
    } else {
      exportLine = `export default function ${componentName}(${propsDestructure}) {`;
    }

    let code = '';

    if (isTS && opts.addProps) {
      code += `${propsInterface}\n\n`;
    }

    code += `${exportLine}\n`;
    code += `  return (\n`;
    code += `    <svg${jsxSvgAttrs}\n    >\n`;
    code += `      ${convertedInner.split('\n').join('\n      ')}\n`;
    code += `    </svg>\n`;
    code += `  );\n`;
    code += `}`;

    return code;
  } catch (err) {
    return `// Error converting SVG: ${(err as Error).message}`;
  }
}

function convertStyleString(styleStr: string): string {
  // Strip quotes from style value
  const raw = styleStr.replace(/^["']|["']$/g, '');
  const pairs = raw.split(';').filter(s => s.trim());
  return pairs.map(pair => {
    const [prop, val] = pair.split(':').map(s => s.trim());
    if (!prop || !val) return '';
    const jsProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return `${jsProp}: '${val}'`;
  }).filter(Boolean).join(', ');
}

// ── Sample SVGs ────────────────────────────────────────────────────────────

const SAMPLE_SVGS: Record<string, { name: string; svg: string }> = {
  heart: {
    name: 'Heart Icon',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  },
  spinner: {
    name: 'Spinner',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  },
  settings: {
    name: 'Settings Gear',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
  arrowRight: {
    name: 'Arrow Right',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function SvgToReactPage() {
  const [svgInput, setSvgInput] = useState(SAMPLE_SVGS.heart.svg);
  const [componentName, setComponentName] = useState('HeartIcon');
  const [typescript, setTypescript] = useState<boolean>(true);
  const [addProps, setAddProps] = useState<boolean>(true);
  const [exportType, setExportType] = useState<ExportType>('named');
  const [activeSample, setActiveSample] = useState<string>('heart');
  const [showPreview, setShowPreview] = useState(true);

  const opts: ConversionOptions = useMemo(() => ({
    typescript,
    exportType,
    addProps,
    propWidth: '24',
    propHeight: '24',
    propColor: 'currentColor',
    componentName: componentName || 'SvgIcon',
  }), [typescript, exportType, addProps, componentName]);

  const reactCode = useMemo(() => {
    if (!svgInput.trim()) return '';
    return convertSVGtoReact(svgInput, opts);
  }, [svgInput, opts]);

  const handleSampleSelect = useCallback((key: string) => {
    const sample = SAMPLE_SVGS[key];
    if (!sample) return;
    setActiveSample(key);
    setSvgInput(sample.svg);
    setComponentName(key.charAt(0).toUpperCase() + key.slice(1) + 'Icon');
    toast.success(`Loaded: ${sample.name}`);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(reactCode);
    toast.success('Copied to clipboard!');
  }, [reactCode]);

  const handleDownload = useCallback(() => {
    const ext = typescript ? 'tsx' : 'jsx';
    const blob = new Blob([reactCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentName || 'Icon'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${componentName || 'Icon'}.${ext}`);
  }, [reactCode, typescript, componentName]);

  const handleReset = useCallback(() => {
    setSvgInput(SAMPLE_SVGS.heart.svg);
    setComponentName('HeartIcon');
    setTypescript(true);
    setAddProps(true);
    setExportType('named');
    setActiveSample('heart');
    toast.success('Reset to defaults');
  }, []);

  return (
    <ToolLayout
      title="SVG → React Converter"
      description="Convert any raw SVG into a clean, production-ready React component. Choose TypeScript or JavaScript, add customizable props, and preview instantly — all 100% client-side."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Sample presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Samples:</span>
            {Object.entries(SAMPLE_SVGS).map(([key, sample]) => (
              <button
                key={key}
                onClick={() => handleSampleSelect(key)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeSample === key
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {sample.name}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      {/* Options Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-4 bg-surface-light border border-slate-700/50 rounded-lg">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Component Name</label>
          <input
            type="text"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            placeholder="MyIcon"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Language</label>
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setTypescript(true)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typescript
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TypeScript
            </button>
            <button
              onClick={() => setTypescript(false)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                !typescript
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JavaScript
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Export</label>
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setExportType('named')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                exportType === 'named'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Named
            </button>
            <button
              onClick={() => setExportType('default')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                exportType === 'default'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Default
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Props</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addProps}
              onChange={(e) => setAddProps(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-300">
              Add <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">size</code>,{' '}
              <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">color</code>,{' '}
              <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">className</code>
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SVG Input */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Code className="w-4 h-4 text-orange-400" />
              SVG Input
            </label>
            <span className="text-xs text-slate-500">
              {svgInput.length} chars
            </span>
          </div>
          <textarea
            value={svgInput}
            onChange={(e) => setSvgInput(e.target.value)}
            placeholder="Paste your SVG here..."
            className="flex-1 min-h-[380px] w-full bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 resize-y focus:outline-none focus:border-brand-500/50 placeholder:text-slate-600"
            spellCheck={false}
          />

          {/* Live SVG preview */}
          {showPreview && svgInput && (
            <div className="mt-3 p-3 bg-slate-900 border border-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Live SVG Preview
                </span>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div
                className="flex items-center justify-center p-4 bg-slate-800/50 rounded-md min-h-[80px]"
                dangerouslySetInnerHTML={{ __html: svgInput }}
              />
            </div>
          )}
          {!showPreview && (
            <button
              onClick={() => setShowPreview(true)}
              className="mt-3 text-xs text-slate-500 hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> Show Preview
            </button>
          )}
        </div>

        {/* React Output */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              React Component
            </label>
            <span className="text-xs text-slate-500">
              {typescript ? '.tsx' : '.jsx'}
            </span>
          </div>
          <div className="relative flex-1 min-h-[380px]">
            <pre className="h-full w-full bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-auto whitespace-pre">
              <code>{reactCode || <span className="text-slate-600 italic">Paste an SVG to see the React component...</span>}</code>
            </pre>

            {reactCode && (
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-md bg-slate-800/90 text-slate-400 hover:text-brand-400 hover:bg-slate-700/90 transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-md bg-slate-800/90 text-slate-400 hover:text-brand-400 hover:bg-slate-700/90 transition-colors"
                  title="Download .tsx/.jsx file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          {reactCode && (
            <div className="mt-3 flex gap-3 text-xs text-slate-500">
              <span>{reactCode.split('\n').length} lines</span>
              <span>{reactCode.length} chars</span>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 p-4 bg-surface-light border border-slate-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-400" />
          Tips &amp; How It Works
        </h3>
        <ul className="text-xs text-slate-400 space-y-1.5">
          <li>• All <strong>kebab-case attributes</strong> (e.g. <code className="text-brand-400">stroke-width</code>) are auto-converted to <strong>camelCase</strong> (<code className="text-brand-400">strokeWidth</code>) for JSX compatibility.</li>
          <li>• The <code className="text-brand-400">class</code> attribute is replaced with <code className="text-brand-400">className</code>.</li>
          <li>• SVG self-closing tags (like <code className="text-brand-400">&lt;path /&gt;</code>, <code className="text-brand-400">&lt;circle /&gt;</code>, <code className="text-brand-400">&lt;rect /&gt;</code>) are preserved with correct JSX syntax.</li>
          <li>• With <strong>Props</strong> enabled, the component accepts <code className="text-brand-400">size</code>, <code className="text-brand-400">color</code>, and <code className="text-brand-400">className</code> — making it a proper icon component.</li>
          <li>• All conversion happens <strong>entirely in your browser</strong> — no server, no uploads, no telemetry.</li>
          <li>• Paste SVGs from Heroicons, Lucide, Feather, Figma, or any SVG export — the converter handles them all.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
