'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Download,
  FileCode,
  Eye,
  Minimize2,
  Image,
  Code2,
  FileImage,
  Wand2,
  ClipboardCopy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type EncodeMode = 'base64' | 'urlencode';
type OutputFormat = 'data-uri' | 'css-bg' | 'html-img' | 'markdown' | 'js-const';

interface SvgStats {
  originalBytes: number;
  optimizedBytes: number;
  savingsPercent: number;
}

// ── SVG Utilities ──────────────────────────────────────────────────────────

function minifySvg(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*\/>/g, '/>')
    .replace(/\s*>/g, '>')
    .replace(/<\s+/g, '<')
    .replace(/\s+"/g, '"')
    .replace(/"\s+/g, '"')
    .replace(/;\s+/g, ';')
    .replace(/:\s+/g, ':')
    .trim();
}

function base64Encode(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function urlEncode(svg: string): string {
  return encodeURIComponent(svg)
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/')
    .replace(/%3C/g, '<')
    .replace(/%3E/g, '>')
    .replace(/%22/g, "'")
    .replace(/%23/g, '#')
    .replace(/%7B/g, '{')
    .replace(/%7D/g, '}')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%3B/g, ';');
}

function buildDataUri(svg: string, mode: EncodeMode, includeCharset: boolean): string {
  const prefix = includeCharset ? 'data:image/svg+xml;charset=utf-8,' : 'data:image/svg+xml,';
  if (mode === 'base64') {
    return prefix.replace(',', ';base64,') + base64Encode(svg);
  }
  return prefix + urlEncode(svg);
}

// ── Placeholder SVG ────────────────────────────────────────────────────────

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#g)"/>
  <text x="50" y="58" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif" font-weight="bold">DB</text>
</svg>`;

// ── Output formatters ──────────────────────────────────────────────────────

function formatOutput(dataUri: string, format: OutputFormat): string {
  switch (format) {
    case 'css-bg':
      return `.icon {\n  background-image: url("${dataUri}");\n  background-size: contain;\n  background-repeat: no-repeat;\n  width: 100px;\n  height: 100px;\n}`;
    case 'html-img':
      return `<img src="${dataUri}" alt="SVG icon" width="100" height="100" />`;
    case 'markdown':
      return `![SVG icon](${dataUri})`;
    case 'js-const':
      return `const svgDataUri = \`${dataUri}\`;\n\ndocument.querySelector('.icon').style.backgroundImage = \`url($\{svgDataUri})\`;`;
    default:
      return dataUri;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SvgToDataUri() {
  const [svgInput, setSvgInput] = useState(PLACEHOLDER_SVG);
  const [encodeMode, setEncodeMode] = useState<EncodeMode>('urlencode');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('data-uri');
  const [includeCharset, setIncludeCharset] = useState(true);
  const [minify, setMinify] = useState(true);
  const [copied, setCopied] = useState(false);

  const processedSvg = useMemo(() => {
    if (!svgInput.trim()) return '';
    return minify ? minifySvg(svgInput) : svgInput;
  }, [svgInput, minify]);

  const dataUri = useMemo(() => {
    if (!processedSvg) return '';
    try {
      return buildDataUri(processedSvg, encodeMode, includeCharset);
    } catch {
      return '';
    }
  }, [processedSvg, encodeMode, includeCharset]);

  const formattedOutput = useMemo(() => {
    if (!dataUri) return '';
    return formatOutput(dataUri, outputFormat);
  }, [dataUri, outputFormat]);

  const stats = useMemo((): SvgStats | null => {
    if (!svgInput.trim()) return null;
    const original = new TextEncoder().encode(svgInput).length;
    const processed = new TextEncoder().encode(processedSvg).length;
    return {
      originalBytes: original,
      optimizedBytes: processed,
      savingsPercent: original > 0 ? Math.round(((original - processed) / original) * 100) : 0,
    };
  }, [svgInput, processedSvg]);

  const copyOutput = useCallback(async () => {
    if (!formattedOutput) return;
    await navigator.clipboard.writeText(formattedOutput);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [formattedOutput]);

  const downloadFile = useCallback(() => {
    if (!formattedOutput) return;
    const blob = new Blob([formattedOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = outputFormat === 'css-bg' ? '.css' : outputFormat === 'html-img' ? '.html' : outputFormat === 'js-const' ? '.js' : '.txt';
    a.download = `svg-output${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [formattedOutput, outputFormat]);

  const loadExample = useCallback((svg: string) => {
    setSvgInput(svg);
  }, []);

  const hasError = useMemo(() => {
    if (!svgInput.trim()) return false;
    const trimmed = svgInput.trim();
    return !trimmed.startsWith('<svg') || !trimmed.endsWith('</svg>');
  }, [svgInput]);

  const formatOptions: { value: OutputFormat; label: string; icon: React.ReactNode }[] = [
    { value: 'data-uri', label: 'Data URI', icon: <FileCode className="w-3.5 h-3.5" /> },
    { value: 'css-bg', label: 'CSS Background', icon: <FileCode className="w-3.5 h-3.5" /> },
    { value: 'html-img', label: 'HTML img', icon: <Code2 className="w-3.5 h-3.5" /> },
    { value: 'markdown', label: 'Markdown', icon: <FileImage className="w-3.5 h-3.5" /> },
    { value: 'js-const', label: 'JavaScript', icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <ToolLayout
      title="SVG to Data URI Converter"
      description="Convert SVG markup to optimized data URIs for inlining in CSS, HTML, JS, and Markdown. Supports base64 and URL encoding with live preview."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Input Panel ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-400" />
              SVG Input
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadExample(PLACEHOLDER_SVG)}
                className="text-xs text-slate-400 hover:text-brand-400 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
              >
                Reset
              </button>
              <button
                onClick={() => setSvgInput('')}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={svgInput}
            onChange={(e) => setSvgInput(e.target.value)}
            className="w-full h-72 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 resize-y transition-colors"
            placeholder="Paste your SVG markup here..."
            spellCheck={false}
          />

          {hasError && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                Input does not appear to be valid SVG. Make sure it starts with <code className="text-amber-200 bg-amber-500/10 px-1 rounded">&lt;svg</code> and ends with <code className="text-amber-200 bg-amber-500/10 px-1 rounded">&lt;/svg&gt;</code>.
              </p>
            </div>
          )}

          {stats && (
            <div className="flex items-center gap-4 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Original:</span>
                <span className="text-xs font-mono text-slate-300">
                  {stats.originalBytes >= 1024
                    ? `${(stats.originalBytes / 1024).toFixed(1)} KB`
                    : `${stats.originalBytes} B`}
                </span>
              </div>
              {minify && stats.savingsPercent > 0 && (
                <>
                  <div className="w-px h-4 bg-slate-600" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Optimized:</span>
                    <span className="text-xs font-mono text-slate-300">
                      {stats.optimizedBytes >= 1024
                        ? `${(stats.optimizedBytes / 1024).toFixed(1)} KB`
                        : `${stats.optimizedBytes} B`}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-slate-600" />
                  <div className="flex items-center gap-1">
                    <Minimize2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">
                      {stats.savingsPercent}% smaller
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Output Panel ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            {/* Encoding mode toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-16 shrink-0">Encode:</span>
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setEncodeMode('urlencode')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    encodeMode === 'urlencode'
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  URL Encoded
                </button>
                <button
                  onClick={() => setEncodeMode('base64')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    encodeMode === 'base64'
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Base64
                </button>
              </div>
            </div>

            {/* Output format selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-16 shrink-0">Format:</span>
              <div className="flex bg-slate-800 rounded-lg p-0.5 flex-wrap">
                {formatOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOutputFormat(opt.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all ${
                      outputFormat === opt.value
                        ? 'bg-brand-500/20 text-brand-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Options row */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={minify}
                  onChange={(e) => setMinify(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500/50 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                  <Wand2 className="w-3 h-3" />
                  Minify
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeCharset}
                  onChange={(e) => setIncludeCharset(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500/50 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  Include charset=utf-8
                </span>
              </label>
            </div>
          </div>

          {/* Output textarea */}
          <div className="relative">
            <textarea
              value={formattedOutput}
              readOnly
              className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 resize-y transition-colors cursor-default"
              placeholder="Output will appear here..."
              spellCheck={false}
            />
            {formattedOutput && (
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <button
                  onClick={copyOutput}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={downloadFile}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview Panel ────────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-400" />
            Live Preview
          </h3>
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
          {svgInput.trim() && !hasError ? (
            <div
              className="max-w-full max-h-[300px] flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: processedSvg }}
            />
          ) : hasError ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <AlertTriangle className="w-8 h-8" />
              <span className="text-sm">Cannot render preview — invalid SVG</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Image className="w-8 h-8" />
              <span className="text-sm">Paste SVG above to see preview</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Usage Tips ───────────────────────────────────────────────────── */}
      <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-slate-300 mb-3">When to use Data URIs for SVGs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-300 font-medium">CSS background-images</p>
              <p className="text-xs text-slate-500">No extra HTTP request for small decorative SVGs.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-300 font-medium">Favicons</p>
              <p className="text-xs text-slate-500">Inline favicon SVGs work in all modern browsers.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-300 font-medium">JS-driven icon injection</p>
              <p className="text-xs text-slate-500">Dynamically inject SVG icons via JS without asset loading.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-300 font-medium">Self-contained HTML</p>
              <p className="text-xs text-slate-500">Single-file demos or emails with embedded SVG icons.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
