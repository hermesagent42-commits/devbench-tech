'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, FileCode, Eye, Minimize2, Download, Sparkles, Pipette } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Preset icons ────────────────────────────────────────────────────────────

const presets: { label: string; svg: string }[] = [
  {
    label: 'Checkmark',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  },
  {
    label: 'Arrow Right',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  },
  {
    label: 'Heart',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  },
  {
    label: 'Star',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  },
  {
    label: 'Spinner',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  },
  {
    label: 'Menu (Hamburger)',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  },
];

// ── SVG processing ──────────────────────────────────────────────────────────

function svgToDataUri(svg: string, encoding: 'utf8' | 'base64', minify: boolean): string {
  let processed = svg.trim();

  if (minify) {
    // Remove comments
    processed = processed.replace(/<!--[\s\S]*?-->/g, '');
    // Collapse whitespace between tags
    processed = processed.replace(/>\s+</g, '><');
    // Collapse multiple spaces
    processed = processed.replace(/\s{2,}/g, ' ');
    // Remove leading/trailing whitespace within tags
    processed = processed.replace(/\s*=\s*/g, '=').replace(/\s*\/>/g, '/>');
  }

  if (encoding === 'base64') {
    const base64 = typeof window !== 'undefined'
      ? window.btoa(unescape(encodeURIComponent(processed)))
      : Buffer.from(processed).toString('base64');
    return `url("data:image/svg+xml;base64,${base64}")`;
  }

  // UTF-8 URL encoding
  const encoded = encodeURIComponent(processed)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
    .replace(/#/g, '%23')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
  return `url("data:image/svg+xml,${encoded}")`;
}

function buildCssRule(selector: string, dataUri: string, options: {
  size: string;
  repeat: string;
  position: string;
}): string {
  const rules: string[] = [];
  rules.push(`  background-image: ${dataUri};`);
  if (options.size !== 'auto') rules.push(`  background-size: ${options.size};`);
  if (options.repeat !== 'repeat') rules.push(`  background-repeat: ${options.repeat};`);
  if (options.position !== '0 0') rules.push(`  background-position: ${options.position};`);

  return `${selector} {\n${rules.join('\n')}\n}`;
}

// ── SVG validation ──────────────────────────────────────────────────────────

function validateSvg(svg: string): { valid: boolean; error?: string } {
  const trimmed = svg.trim();
  if (!trimmed) return { valid: false, error: 'SVG input is empty' };
  if (!trimmed.startsWith('<svg') && !trimmed.startsWith('<?xml')) {
    return { valid: false, error: 'Input must start with <svg> tag' };
  }
  if (!trimmed.includes('</svg>') && !trimmed.endsWith('/>')) {
    return { valid: false, error: 'Missing closing </svg> tag' };
  }
  return { valid: true };
}

// ── Preview component ───────────────────────────────────────────────────────

function PreviewPanel({ svg }: { svg: string }) {
  const validation = useMemo(() => validateSvg(svg), [svg]);

  if (!validation.valid) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        {validation.error || 'Invalid SVG'}
      </div>
    );
  }

  const dataUri = svgToDataUri(svg, 'utf8', false);

  return (
    <div
      className="w-full h-full transition-all duration-200 bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)_50%_center/16px_16px]"
    >
      <div
        className="w-full h-full"
        style={{
          backgroundImage: dataUri.replace(/^url\("|"\)$/g, ''),
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
        }}
      />
    </div>
  );
}

// ── Color picker for stroke/fill ────────────────────────────────────────────

const defaultColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

// ── Main page component ─────────────────────────────────────────────────────

export default function SvgToCssPage() {
  const [svgInput, setSvgInput] = useState('');
  const [encoding, setEncoding] = useState<'utf8' | 'base64'>('utf8');
  const [minify, setMinify] = useState(true);
  const [selector, setSelector] = useState('.my-icon');
  const [bgSize, setBgSize] = useState('contain');
  const [bgRepeat, setBgRepeat] = useState('no-repeat');
  const [bgPosition, setBgPosition] = useState('center');
  const [activeTab, setActiveTab] = useState<'editor' | 'output'>('editor');
  const [replacedColor, setReplacedColor] = useState('#6366f1');
  const [colorMode, setColorMode] = useState<'none' | 'stroke' | 'fill' | 'both'>('none');

  const validation = useMemo(() => validateSvg(svgInput), [svgInput]);

  const processedSvg = useMemo(() => {
    if (!svgInput.trim() || colorMode === 'none') return svgInput;

    let result = svgInput;

    // Replace currentColor with the chosen color
    const colorReplace = new RegExp('currentColor', 'gi');

    if (colorMode === 'fill') {
      // Add fill attribute if not present, replace currentColor in fills
      result = result.replace(/fill="currentColor"/gi, `fill="${replacedColor}"`);
      // If there's no fill at all on elements, can't easily inject — just replace currentColor
      result = result.replace(colorReplace, replacedColor);
    } else if (colorMode === 'stroke') {
      result = result.replace(/stroke="currentColor"/gi, `stroke="${replacedColor}"`);
      result = result.replace(colorReplace, replacedColor);
    } else if (colorMode === 'both') {
      result = result.replace(colorReplace, replacedColor);
    }

    return result;
  }, [svgInput, colorMode, replacedColor]);

  const dataUri = useMemo(
    () => (validation.valid ? svgToDataUri(processedSvg, encoding, minify) : ''),
    [processedSvg, encoding, minify, validation.valid]
  );

  const cssRule = useMemo(
    () =>
      validation.valid
        ? buildCssRule(selector, dataUri, { size: bgSize, repeat: bgRepeat, position: bgPosition })
        : '',
    [selector, dataUri, bgSize, bgRepeat, bgPosition, validation.valid]
  );

  const copyDataUri = useCallback(() => {
    if (!dataUri) return;
    navigator.clipboard.writeText(dataUri).then(
      () => toast.success('Data URI copied!'),
      () => toast.error('Failed to copy')
    );
  }, [dataUri]);

  const copyCssRule = useCallback(() => {
    if (!cssRule) return;
    navigator.clipboard.writeText(cssRule).then(
      () => toast.success('CSS rule copied!'),
      () => toast.error('Failed to copy')
    );
  }, [cssRule]);

  const copyBoth = useCallback(() => {
    if (!dataUri && !cssRule) return;
    const text = [
      '/* SVG Data URI */',
      dataUri,
      '',
      '/* CSS Rule */',
      cssRule,
    ].join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Both copied!'),
      () => toast.error('Failed to copy')
    );
  }, [dataUri, cssRule]);

  const loadPreset = useCallback((preset: (typeof presets)[0]) => {
    setSvgInput(preset.svg);
    setColorMode('none');
  }, []);

  const refreshSvg = useCallback(() => {
    setSvgInput('');
    setColorMode('none');
  }, []);

  return (
    <ToolLayout
      title="SVG to CSS Background"
      description="Convert any SVG into a CSS background-image data URI. Live preview, URL-encoded or Base64 output, and ready-to-use CSS rules."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Input ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'editor'
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-4 h-4 inline-block mr-1.5" />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('output')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'output'
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4 inline-block mr-1.5" />
              Output
            </button>
          </div>

          {activeTab === 'editor' ? (
            <>
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => loadPreset(preset)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700/50 bg-surface-light text-slate-300 hover:border-brand-400/50 hover:text-brand-400 transition-all"
                  >
                    <Sparkles className="w-3 h-3 inline-block mr-1" />
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={refreshSvg}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700/50 bg-surface-light text-slate-400 hover:text-slate-200 transition-all"
                >
                  <RefreshCw className="w-3 h-3 inline-block mr-1" />
                  Clear
                </button>
              </div>

              {/* Color replacer */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-surface-light border border-slate-700/50">
                <span className="text-xs text-slate-400 font-medium">Color:</span>
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as typeof colorMode)}
                  className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-400"
                >
                  <option value="none">None (keep currentColor)</option>
                  <option value="stroke">Replace stroke</option>
                  <option value="fill">Replace fill</option>
                  <option value="both">Replace both</option>
                </select>
                {colorMode !== 'none' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={replacedColor}
                      onChange={(e) => setReplacedColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent"
                    />
                    <input
                      type="text"
                      value={replacedColor}
                      onChange={(e) => setReplacedColor(e.target.value)}
                      className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1.5 w-20 font-mono focus:outline-none focus:border-brand-400"
                    />
                    {defaultColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setReplacedColor(c)}
                        className="w-5 h-5 rounded-full border transition-transform hover:scale-125"
                        style={{ backgroundColor: c, borderColor: c === replacedColor ? '#fff' : 'transparent' }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* SVG textarea */}
              <textarea
                value={svgInput}
                onChange={(e) => setSvgInput(e.target.value)}
                placeholder={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/>
  <path d="M8 12l3 3 5-5"/>
</svg>`}
                className="w-full h-[280px] bg-slate-900 border border-slate-700/50 rounded-xl p-4 text-slate-200 font-mono text-sm resize-none focus:outline-none focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/20 placeholder:text-slate-600"
                spellCheck={false}
              />
              {!validation.valid && svgInput.trim() && (
                <p className="text-red-400 text-xs flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                  {validation.error}
                </p>
              )}
            </>
          ) : (
            <>
              {/* Output view */}
              {/* CSS selector + properties */}
              <div className="space-y-3 p-3 rounded-lg bg-surface-light border border-slate-700/50">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Selector</label>
                    <input
                      type="text"
                      value={selector}
                      onChange={(e) => setSelector(e.target.value)}
                      className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 w-28 font-mono focus:outline-none focus:border-brand-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Size</label>
                    <select
                      value={bgSize}
                      onChange={(e) => setBgSize(e.target.value)}
                      className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-400"
                    >
                      <option value="contain">contain</option>
                      <option value="cover">cover</option>
                      <option value="auto">auto</option>
                      <option value="20px">20px</option>
                      <option value="24px">24px</option>
                      <option value="32px">32px</option>
                      <option value="48px">48px</option>
                      <option value="64px">64px</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Repeat</label>
                    <select
                      value={bgRepeat}
                      onChange={(e) => setBgRepeat(e.target.value)}
                      className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-400"
                    >
                      <option value="no-repeat">no-repeat</option>
                      <option value="repeat">repeat</option>
                      <option value="repeat-x">repeat-x</option>
                      <option value="repeat-y">repeat-y</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-medium">Position</label>
                    <select
                      value={bgPosition}
                      onChange={(e) => setBgPosition(e.target.value)}
                      className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-400"
                    >
                      <option value="center">center</option>
                      <option value="0 0">top left</option>
                      <option value="top right">top right</option>
                      <option value="bottom center">bottom center</option>
                      <option value="left center">left center</option>
                      <option value="right center">right center</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Encoding toggle */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="encoding"
                    checked={encoding === 'utf8'}
                    onChange={() => setEncoding('utf8')}
                    className="text-brand-400 focus:ring-brand-400/30"
                  />
                  <span className="text-sm text-slate-300">URL-encoded (UTF-8)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="encoding"
                    checked={encoding === 'base64'}
                    onChange={() => setEncoding('base64')}
                    className="text-brand-400 focus:ring-brand-400/30"
                  />
                  <span className="text-sm text-slate-300">Base64</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={minify}
                    onChange={(e) => setMinify(e.target.checked)}
                    className="text-brand-400 focus:ring-brand-400/30 rounded"
                  />
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Minimize2 className="w-3 h-3" />
                    Minify
                  </span>
                </label>
              </div>

              {/* Data URI output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Data URI
                  </h3>
                  <button
                    onClick={copyDataUri}
                    disabled={!dataUri}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-3 max-h-[120px] overflow-y-auto">
                  <code className="text-sm text-green-400 break-all font-mono">
                    {dataUri || (
                      <span className="text-slate-600">Enter valid SVG to generate data URI...</span>
                    )}
                  </code>
                </div>
              </div>

              {/* CSS Rule output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    CSS Rule
                  </h3>
                  <button
                    onClick={copyCssRule}
                    disabled={!cssRule}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 overflow-y-auto max-h-[180px]">
                  <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                    {cssRule || (
                      <span className="text-slate-600">Enter valid SVG to generate CSS rule...</span>
                    )}
                  </pre>
                </div>
              </div>

              {/* Copy both */}
              <button
                onClick={copyBoth}
                disabled={!dataUri}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Copy Data URI + CSS Rule
              </button>
            </>
          )}
        </div>

        {/* ── Right: Live Preview ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </h3>

          {/* Large preview */}
          <div className="h-[340px] rounded-xl border border-slate-700/50 overflow-hidden bg-slate-900">
            <PreviewPanel svg={processedSvg} />
          </div>

          {/* Preview at multiple sizes */}
          {validation.valid && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">Preview at different sizes</p>
              <div className="flex items-end gap-3">
                {[16, 24, 32, 48, 64].map((size) => {
                  const uri = dataUri.replace(/^url\("|"\)$/g, '');
                  return (
                    <div key={size} className="flex flex-col items-center gap-1.5">
                      <div
                        className="rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center"
                        style={{ width: size + 16, height: size + 16 }}
                      >
                        <div
                          style={{
                            width: size,
                            height: size,
                            backgroundImage: uri,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundSize: 'contain',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{size}px</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          {validation.valid && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50 text-center">
                <p className="text-xs text-slate-500 font-medium mb-0.5">Input</p>
                <p className="text-lg font-bold text-white font-mono">{(svgInput.length / 1024).toFixed(1)} KB</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50 text-center">
                <p className="text-xs text-slate-500 font-medium mb-0.5">Data URI</p>
                <p className="text-lg font-bold text-green-400 font-mono">{(dataUri.length / 1024).toFixed(1)} KB</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50 text-center">
                <p className="text-xs text-slate-500 font-medium mb-0.5">
                  {encoding === 'base64' ? 'Base64' : 'UTF-8'}
                </p>
                <p className="text-lg font-bold text-brand-400 font-mono">
                  {encoding === 'base64'
                    ? `${((dataUri.length - 37) * 0.75).toFixed(0)}B`
                    : `${(svgInput.length * (minify ? 0.7 : 1)).toFixed(0)}B`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
