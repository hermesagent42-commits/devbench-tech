'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Download, Eye, Sparkles, Maximize2, Minimize2, Code2, Info, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── SVG Optimizer (pure JS, no deps) ───────────────────────────────────────

interface OptimizeStats {
  originalSize: number;
  optimizedSize: number;
  savingsPercent: number;
  savingsBytes: number;
}

function optimizeSVG(svg: string): { optimized: string; stats: OptimizeStats } {
  const originalSize = new Blob([svg]).size;

  let optimized = svg;

  // Remove HTML comments
  optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');

  // Collapse whitespace between tags
  optimized = optimized.replace(/>\s+</g, '><');

  // Collapse multiple whitespace chars into single space
  optimized = optimized.replace(/\s{2,}/g, ' ');

  // Remove whitespace around = in attributes
  optimized = optimized.replace(/\s*=\s*/g, '=');

  // Remove unnecessary attributes that match defaults
  // xmlns:xlink is often unneeded in modern SVG
  // Remove empty style attributes
  optimized = optimized.replace(/\s*style\s*=\s*["']\s*["']/g, '');

  // Remove trailing whitespace in attribute values
  optimized = optimized.replace(/(["'])\s+(?=[^"']*["'])/g, '$1');

  // Remove leading/trailing whitespace on lines
  optimized = optimized.replace(/^\s+|\s+$/gm, '');

  // Remove empty lines
  optimized = optimized.replace(/\n\s*\n/g, '\n');

  // Trim overall
  optimized = optimized.trim();

  const optimizedSize = new Blob([optimized]).size;
  const savingsBytes = originalSize - optimizedSize;
  const savingsPercent = originalSize > 0 ? Math.round((savingsBytes / originalSize) * 1000) / 10 : 0;

  return {
    optimized,
    stats: {
      originalSize,
      optimizedSize,
      savingsPercent,
      savingsBytes,
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ── SVG Validation ─────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: { line: number; message: string }[];
  warnings: { line: number; message: string }[];
}

function validateSVG(svg: string): ValidationResult {
  const errors: { line: number; message: string }[] = [];
  const warnings: { line: number; message: string }[] = [];

  if (!svg.trim()) {
    errors.push({ line: 0, message: 'SVG is empty' });
    return { valid: false, errors, warnings };
  }

  const trimmed = svg.trim();

  // Check for <svg> tag
  if (!/<\s*svg[\s>]/i.test(trimmed) && !/<\s*svg\s/i.test(trimmed)) {
    errors.push({ line: 1, message: 'No <svg> opening tag found' });
  }
  if (!/<\/\s*svg\s*>/i.test(trimmed)) {
    errors.push({ line: 1, message: 'No </svg> closing tag found' });
  }

  // Check for balanced tags (basic)
  const openTags = (trimmed.match(/<(?!\/)\w+/g) || []).length;
  const closeTags = (trimmed.match(/<\/\w+/g) || []).length;
  const selfClosing = (trimmed.match(/<[^>]+\/\s*>/g) || []).length;

  if (openTags !== closeTags + selfClosing && openTags > 0) {
    warnings.push({ line: 1, message: `Tag mismatch: ${openTags} opening tags vs ${closeTags} closing + ${selfClosing} self-closing` });
  }

  // Check for XML declaration
  if (trimmed.startsWith('<?xml')) {
    warnings.push({ line: 1, message: 'XML declaration is optional for inline/modern SVG' });
  }

  // Check for common pitfalls
  if (/<\s*!DOCTYPE/i.test(trimmed)) {
    warnings.push({ line: 1, message: 'DOCTYPE declaration is not needed for SVG files' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Sample SVGs ────────────────────────────────────────────────────────────

const SAMPLES: { name: string; icon: string; svg: string }[] = [
  {
    name: 'Simple Star',
    icon: '⭐',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100" height="100">
  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFD700" stroke="#DAA520" stroke-width="1"/>
</svg>`,
  },
  {
    name: 'Play Button',
    icon: '▶️',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100" height="100">
  <circle cx="12" cy="12" r="10" fill="#10b981" />
  <polygon points="10,7 10,17 17,12" fill="white" />
</svg>`,
  },
  {
    name: 'Heart',
    icon: '❤️',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100" height="100">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ef4444" />
</svg>`,
  },
  {
    name: 'Check Circle',
    icon: '✅',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100" height="100">
  <circle cx="12" cy="12" r="10" fill="#8b5cf6" />
  <polyline points="7,12 10.5,15.5 17,9" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
  },
  {
    name: 'Gradient Spiral',
    icon: '🌀',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#a855f7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <path d="M100,10 A90,90 0 1,1 100,190 A90,90 0 1,1 100,10 Z M100,40 A60,60 0 1,0 100,160 A60,60 0 1,0 100,40 Z M100,70 A30,30 0 1,1 100,130 A30,30 0 1,1 100,70 Z" fill="url(#grad1)" />
</svg>`,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function SvgPreviewerPage() {
  const [input, setInput] = useState('');
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
  const [optimized, setOptimized] = useState('');
  const [stats, setStats] = useState<OptimizeStats | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showOptimized, setShowOptimized] = useState(false);
  const [svgError, setSvgError] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [darkBg, setDarkBg] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleInput = useCallback((value: string) => {
    setInput(value);
    setOptimized('');
    setStats(null);
    setSvgError(false);
    setValidation(null);
  }, []);

  const optimize = useCallback(() => {
    if (!input.trim()) {
      toast.error('No SVG to optimize');
      return;
    }
    const result = optimizeSVG(input);
    setOptimized(result.optimized);
    setStats(result.stats);
    setShowOptimized(true);
    toast.success(`Optimized — saved ${formatBytes(result.stats.savingsBytes)}`);
  }, [input]);

  const validate = useCallback(() => {
    const result = validateSVG(input);
    setValidation(result);
    setShowValidation(true);
    if (result.valid) {
      toast.success('SVG is valid!');
    } else {
      toast.error(`${result.errors.length} error(s) found`);
    }
  }, [input]);

  const copySvg = useCallback((svg: string) => {
    navigator.clipboard.writeText(svg).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, []);

  const downloadSvg = useCallback((svg: string, filename: string) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, []);

  const clear = useCallback(() => {
    setInput('');
    setOptimized('');
    setStats(null);
    setValidation(null);
    setSvgError(false);
    setShowOptimized(false);
    setShowValidation(false);
  }, []);

  const loadSample = useCallback((svg: string) => {
    setInput(svg.trim());
    setOptimized('');
    setStats(null);
    setValidation(null);
    setSvgError(false);
    setShowOptimized(false);
  }, []);

  const onPreviewError = useCallback(() => {
    setSvgError(true);
  }, []);

  const onPreviewLoad = useCallback(() => {
    setSvgError(false);
  }, []);

  // Memoize the preview HTML to avoid unnecessary re-renders
  const previewSvg = useMemo(() => {
    if (!input.trim()) return null;
    return showOptimized && optimized ? optimized : input;
  }, [input, showOptimized, optimized]);

  return (
    <ToolLayout
      title="SVG Previewer & Optimizer"
      description="Paste SVG code to preview, validate, and optimize. Strip whitespace, comments, and unnecessary attributes — see instant size savings."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Sample dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-slate-300 hover:bg-surface-light border border-slate-700/50 transition-colors">
              <Code2 className="w-3.5 h-3.5" />
              Samples
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute top-full left-0 mt-1 w-56 rounded-lg bg-surface-light border border-slate-700/50 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              {SAMPLES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => loadSample(s.svg)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-brand-500/10 hover:text-white first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 transition-colors"
                >
                  <span>{s.icon}</span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700/50" />

          <button
            onClick={optimize}
            disabled={!input.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-brand-500/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Optimize
          </button>

          <button
            onClick={validate}
            disabled={!input.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-500/20 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Validate
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setDarkBg(!darkBg)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              darkBg
                ? 'bg-slate-800 text-white border-slate-600'
                : 'bg-surface text-slate-300 border-slate-700/50 hover:bg-surface-light'
            }`}
            title="Toggle preview background"
          >
            {darkBg ? 'Dark BG' : 'Light BG'}
          </button>

          <button
            onClick={clear}
            disabled={!input.trim()}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-400" />
              SVG Code
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {input.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="#6366f1" />\n</svg>`}
            className="flex-1 min-h-[360px] w-full bg-slate-900/80 text-slate-300 font-mono text-sm p-4 rounded-lg border border-slate-700/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 outline-none resize-none placeholder:text-slate-600"
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  previewMode === 'preview'
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-surface text-slate-400 hover:text-slate-300 border border-slate-700/50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={() => setPreviewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  previewMode === 'code'
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-surface text-slate-400 hover:text-slate-300 border border-slate-700/50'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            </div>
            {previewSvg && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copySvg(previewSvg)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
                <button
                  onClick={() => downloadSvg(previewSvg, 'output.svg')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            )}
          </div>

          {previewMode === 'preview' ? (
            <div
              ref={previewRef}
              className={`flex-1 min-h-[360px] rounded-lg border border-slate-700/50 flex items-center justify-center p-4 overflow-auto ${
                darkBg ? 'bg-[#1a1a2e]' : 'bg-white'
              }`}
            >
              {previewSvg ? (
                <div
                  className="svg-preview-container"
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              ) : (
                <div className="text-center text-slate-500">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Paste SVG code to see a live preview</p>
                  <p className="text-xs mt-1 opacity-60">
                    Try one of the samples from the dropdown above
                  </p>
                </div>
              )}
            </div>
          ) : (
            <pre className="flex-1 min-h-[360px] w-full bg-slate-900/80 text-slate-300 font-mono text-sm p-4 rounded-lg border border-slate-700/50 overflow-auto whitespace-pre-wrap break-all">
              {previewSvg || (
                <span className="text-slate-600">SVG code will appear here...</span>
              )}
            </pre>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="mt-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Original</span>
              <span className="text-sm text-white font-mono">{formatBytes(stats.originalSize)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Optimized</span>
              <span className="text-sm text-brand-400 font-mono">{formatBytes(stats.optimizedSize)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Saved</span>
              <span className="text-sm text-green-400 font-mono">
                {formatBytes(stats.savingsBytes)} ({stats.savingsPercent}%)
              </span>
            </div>
            <div className="h-4 w-0.5 bg-slate-700/50" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden w-32">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.savingsPercent, 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => copySvg(optimized)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20 transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy Optimized
            </button>
          </div>
        </div>
      )}

      {/* Validation results */}
      {validation && (
        <div className={`mt-6 p-4 rounded-lg border ${validation.valid ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-amber-950/20 border-amber-500/30'}`}>
          <div className="flex items-center gap-2 mb-3">
            {validation.valid ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <h3 className={`font-semibold text-sm ${validation.valid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {validation.valid ? 'SVG is Valid' : `${validation.errors.length} Error(s), ${validation.warnings.length} Warning(s)`}
            </h3>
          </div>
          {validation.errors.map((err, i) => (
            <div key={`err-${i}`} className="flex items-start gap-2 py-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span className="text-red-300">{err.message}</span>
            </div>
          ))}
          {validation.warnings.map((warn, i) => (
            <div key={`warn-${i}`} className="flex items-start gap-2 py-1.5 text-sm">
              <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-amber-300">{warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tips section */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-400" />
          Tips
        </h3>
        <ul className="space-y-1.5 text-sm text-slate-400">
          <li>• <strong className="text-slate-300">Inline SVG</strong> — works directly; use the <code className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">viewBox</code> attribute for responsive sizing</li>
          <li>• <strong className="text-slate-300">Optimize</strong> — strips whitespace, comments, and redundant attributes for smaller files</li>
          <li>• <strong className="text-slate-300">Toggle BG</strong> — switch between light and dark backgrounds to test visibility</li>
          <li>• <strong className="text-slate-300">Validate</strong> — checks for common issues like missing <code className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">&lt;svg&gt;</code> tags and unbalanced elements</li>
          <li>• <strong className="text-slate-300">Downloads</strong> — the optimized SVG is saved as <code className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">output.svg</code></li>
          <li>• <strong className="text-slate-300">Security Note</strong> — SVG preview uses <code className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">dangerouslySetInnerHTML</code> for rendering. Only paste SVG from trusted sources.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
