'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Minimize2, ArrowLeftRight, FileCode, FileType, FileJson, Braces } from 'lucide-react';
import toast from 'react-hot-toast';

type Lang = 'css' | 'js' | 'html' | 'auto';

// ─── Minifiers ────────────────────────────────────────────────────

function minifyCSS(input: string): string {
  let output = input;
  // Remove comments
  output = output.replace(/\/\*[\s\S]*?\*\//g, '');
  // Collapse whitespace
  output = output.replace(/\s+/g, ' ');
  // Remove spaces around { } : ; ,
  output = output.replace(/\s*{\s*/g, '{');
  output = output.replace(/\s*}\s*/g, '}');
  output = output.replace(/\s*:\s*/g, ':');
  output = output.replace(/\s*;\s*/g, ';');
  output = output.replace(/\s*,\s*/g, ',');
  // Remove last semicolon in a rule block
  output = output.replace(/;\s*}/g, '}');
  // Remove leading/trailing whitespace
  output = output.trim();
  return output;
}

function minifyJS(input: string): string {
  let output = input;
  // Remove block comments
  output = output.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove line comments (but not URLs)
  output = output.replace(/\/\/(?!\/)[^\n]*/g, '');
  // Collapse whitespace (preserving newlines minimally)
  output = output.replace(/[ \t]+/g, ' ');
  // Remove spaces around operators (selective)
  output = output.replace(/\s*([{}();,:])\s*/g, '$1');
  output = output.replace(/\s*([=+\-*/%<>&|!^~?])\s*/g, '$1');
  // Clean up multiple newlines
  output = output.replace(/\n\s*\n/g, '\n');
  // Remove trailing semicolons before }
  output = output.replace(/;\s*}/g, '}');
  output = output.trim();
  return output;
}

function minifyHTML(input: string): string {
  let output = input;
  // Remove HTML comments (but not IE conditional)
  output = output.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
  // Collapse whitespace between tags
  output = output.replace(/>\s+</g, '><');
  // Collapse remaining whitespace
  output = output.replace(/\s{2,}/g, ' ');
  // Minify inline CSS in style tags
  output = output.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, css, close) => {
    return open + minifyCSS(css) + close;
  });
  // Minify inline JS in script tags (conservative)
  output = output.replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, js, close) => {
    return open + minifyJS(js) + close;
  });
  output = output.trim();
  return output;
}

function detectLanguage(input: string): Lang {
  const trimmed = input.trim();
  if (trimmed.startsWith('<')) return 'html';
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('@import') || trimmed.includes('@media') || /[.#]\w+\s*\{/.test(trimmed)) return 'css';
  // If starts with import/const/let/var/function/class or has common JS patterns
  if (/^(import|export|const|let|var|function|class|async|await|if|for|while|switch|return|try|throw|debugger)\b/.test(trimmed)) return 'js';
  if (trimmed.includes('{') && /:\s*[\w"'(<]/.test(trimmed)) return 'css';
  return 'js';
}

// ─── Component ────────────────────────────────────────────────────

const LANG_OPTIONS: { value: Lang; label: string; icon: typeof FileCode }[] = [
  { value: 'auto', label: 'Auto', icon: Braces },
  { value: 'css', label: 'CSS', icon: FileType },
  { value: 'js', label: 'JavaScript', icon: FileJson },
  { value: 'html', label: 'HTML', icon: FileCode },
];

export default function CodeMinifierPage() {
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<Lang>('auto');
  const [detected, setDetected] = useState<Lang | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveLang = useMemo<Lang>(() => {
    if (lang !== 'auto') return lang;
    if (!input.trim()) return 'css';
    const d = detectLanguage(input);
    setDetected(d);
    return d;
  }, [input, lang]);

  const output = useMemo(() => {
    setError(null);
    if (!input.trim()) return '';
    try {
      switch (effectiveLang) {
        case 'css': return minifyCSS(input);
        case 'js': return minifyJS(input);
        case 'html': return minifyHTML(input);
        default: return '';
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Minification error');
      return '';
    }
  }, [input, effectiveLang]);

  const stats = useMemo(() => {
    if (!output) return null;
    const inBytes = new TextEncoder().encode(input).length;
    const outBytes = new TextEncoder().encode(output).length;
    const saved = inBytes - outBytes;
    const pct = inBytes > 0 ? Math.round((saved / inBytes) * 100) : 0;
    return { inBytes, outBytes, saved, pct };
  }, [input, output]);

  const clear = useCallback(() => {
    setInput('');
    setError(null);
  }, []);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied minified code'),
      () => toast.error('Copy failed')
    );
  }, [output]);

  const swap = useCallback(() => {
    if (!output) return;
    setInput(output);
  }, [output]);

  return (
    <ToolLayout
      title="Code Minifier"
      description="Minify CSS, JavaScript, and HTML — strip whitespace, comments, and redundancy. Auto-detects language, shows size savings, 100% client-side."
    >
      <div className="space-y-6">
        {/* Language selector + stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-slate-700/50">
            {LANG_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = lang === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {lang === 'auto' && input.trim() && detected && (
            <span className="text-xs text-slate-500">
              Detected: <span className="text-brand-400 font-medium">{detected.toUpperCase()}</span>
            </span>
          )}
        </div>

        {/* Input */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-400" />
              Input
            </h2>
            <button
              onClick={clear}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-surface transition-colors"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste ${effectiveLang === 'auto' ? 'CSS, JS, or HTML' : effectiveLang.toUpperCase()} code to minify...`}
            className="input-field w-full h-48 resize-y font-mono text-sm"
            spellCheck={false}
          />
        </div>

        {/* Minify action */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => {}} // output is computed automatically
            disabled={!input.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Minimize2 className="w-4 h-4" />
            Minify
          </button>
        </div>

        {/* Output */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-green-400" />
              Minified Output
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={swap}
                disabled={!output}
                className="p-1.5 rounded-md text-slate-500 hover:text-blue-400 hover:bg-surface transition-colors disabled:opacity-30"
                title="Use as input"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <button
                onClick={copyOutput}
                disabled={!output}
                className="p-1.5 rounded-md text-slate-500 hover:text-brand-400 hover:bg-surface transition-colors disabled:opacity-30"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              {error}
            </div>
          ) : output ? (
            <pre className="bg-surface rounded-lg p-3 border border-slate-700/50 font-mono text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
              <code>{output}</code>
            </pre>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Minimize2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Minified output will appear here
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4">Size Savings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-surface-light border border-slate-700/50">
                <div className="text-2xl font-bold text-white font-mono">{stats.inBytes.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Original (bytes)</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-surface-light border border-slate-700/50">
                <div className="text-2xl font-bold text-white font-mono">{stats.outBytes.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Minified (bytes)</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-surface-light border border-slate-700/50">
                <div className="text-2xl font-bold text-green-400 font-mono">{stats.saved.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Saved (bytes)</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-surface-light border border-slate-700/50">
                <div className="text-2xl font-bold text-green-400 font-mono">{stats.pct}%</div>
                <div className="text-xs text-slate-500 mt-1">Reduction</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>0%</span>
                <span>Reduction: {stats.pct}%</span>
                <span>100%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-green-400 transition-all duration-500"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <h3 className="text-white font-medium text-sm mb-3">About Code Minification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
            <div>
              <h4 className="text-slate-300 font-medium text-xs mb-1">CSS Minification</h4>
              <p>Removes comments, collapses whitespace, strips unnecessary semicolons, and removes spaces around braces, colons, and commas.</p>
            </div>
            <div>
              <h4 className="text-slate-300 font-medium text-xs mb-1">JavaScript Minification</h4>
              <p>Strips comments (both line and block), collapses spaces, removes spacing around operators, and cleans up unnecessary semicolons.</p>
            </div>
            <div>
              <h4 className="text-slate-300 font-medium text-xs mb-1">HTML Minification</h4>
              <p>Removes HTML comments, collapses whitespace between tags, and minifies embedded CSS and JavaScript in <code className="text-brand-400">&lt;style&gt;</code> and <code className="text-brand-400">&lt;script&gt;</code> tags.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
