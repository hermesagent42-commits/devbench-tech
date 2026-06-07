'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Trash2, FileCode, ArrowRightLeft, Zap, Minimize2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

type Language = 'css' | 'javascript' | 'html';

const LANGUAGES: { key: Language; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'css', label: 'CSS', icon: FileCode },
  { key: 'javascript', label: 'JavaScript', icon: FileCode },
  { key: 'html', label: 'HTML', icon: FileText },
];

// ── Minification Functions ──────────────────────────────────────────────────

function minifyCSS(code: string): string {
  let result = code;

  // Remove comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Collapse whitespace — but preserve inside quotes and data: URIs
  // Remove newlines, tabs, and multiple spaces
  result = result.replace(/\s+/g, ' ');

  // Remove spaces around selectors/operators
  result = result.replace(/\s*([{};:,>+~()])\s*/g, '$1');

  // Remove last semicolon before closing brace
  result = result.replace(/;}/g, '}');

  // Remove units on zero values
  result = result.replace(/(:|\s)0(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)/g, '$10');

  // Remove leading zeros from decimal values
  result = result.replace(/(:|\s)0\.(\d+)/g, '$1.$2');

  // Remove trailing semicolons after last property in a block
  result = result.replace(/;}/g, '}');

  // Remove spaces after opening brace and before closing
  result = result.replace(/\{ /g, '{');
  result = result.replace(/ \}/g, '}');

  // Remove spaces around commas in values
  result = result.replace(/,\s+/g, ',');

  // Trim whitespace
  result = result.trim();

  return result;
}

function minifyJS(code: string): string {
  let result = code;

  // Remove single-line comments (but not URLs with //)
  result = result.replace(/(?<!https?:)\/\/.*?$/gm, '');

  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove newlines and tabs
  result = result.replace(/\n/g, ' ');
  result = result.replace(/\t/g, ' ');

  // Collapse multiple spaces
  result = result.replace(/[ ]{2,}/g, ' ');

  // Remove spaces around operators and delimiters
  result = result.replace(/\s*([{}();,:+\-*/%=<>&|^!?~])\s*/g, '$1');

  // Restore spaces around keywords to prevent merging
  const keywords = ['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof',
    'in', 'of', 'class', 'extends', 'import', 'export', 'from', 'default',
    'throw', 'try', 'catch', 'finally', 'async', 'await', 'yield', 'delete'];
  keywords.forEach(kw => {
    const pattern = new RegExp(`([^a-zA-Z0-9_$])(${kw})([^a-zA-Z0-9_$])`, 'g');
    result = result.replace(pattern, '$1 $2 $3');
  });

  // Fix: add space after return/new/typeof/etc if directly followed by identifier
  result = result.replace(/(return|new|typeof|delete|void)([a-zA-Z_$])/g, '$1 $2');

  // Remove leading/trailing whitespace
  result = result.trim();

  return result;
}

function minifyHTML(code: string): string {
  let result = code;

  // Remove HTML comments (but not conditional comments for IE)
  result = result.replace(/<!--(?!\[if\s)[\s\S]*?-->/g, '');

  // Collapse whitespace — reduce to single spaces
  result = result.replace(/\s+/g, ' ');

  // Remove spaces between HTML tags
  result = result.replace(/>\s+</g, '><');

  // Remove spaces after opening tag name and before attributes
  // <div   class="foo"   >  →  <div class="foo">
  result = result.replace(/<\s+/g, '<');
  result = result.replace(/\s+>/g, '>');

  // Remove spaces around = in attributes
  result = result.replace(/\s*=\s*/g, '=');

  // Remove whitespace-only content between block tags (but preserve in inline)
  result = result.replace(/>\s+</g, '><');

  // Remove spaces after < and before > in self-closing tags
  result = result.replace(/<\s+/g, '<');
  result = result.replace(/\s+\/?>/g, (match: string) => {
    return match.replace(/\s+/g, '');
  });

  // Trim
  result = result.trim();

  return result;
}

function minifyCode(code: string, language: Language): string {
  switch (language) {
    case 'css': return minifyCSS(code);
    case 'javascript': return minifyJS(code);
    case 'html': return minifyHTML(code);
  }
}

// ── Stats ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CodeMinifierPage() {
  const [language, setLanguage] = useState<Language>('css');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoMinify, setAutoMinify] = useState(true);

  const output = useMemo(() => {
    if (!input.trim()) return '';
    return minifyCode(input, language);
  }, [input, language]);

  const inputSize = useMemo(() => new Blob([input]).size, [input]);
  const outputSize = useMemo(() => new Blob([output]).size, [output]);
  const reduction = useMemo(() => {
    if (inputSize === 0) return 0;
    return ((1 - outputSize / inputSize) * 100);
  }, [inputSize, outputSize]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Minified code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  const LanguageIcon = LANGUAGES.find(l => l.key === language)?.icon ?? FileCode;

  return (
    <ToolLayout
      title="Code Minifier"
      description={`Minify CSS, JavaScript, and HTML — strip comments, collapse whitespace, and reduce file size. ${autoMinify ? 'Real-time' : 'On demand'} — entirely client-side.`}
    >
      {/* Language Selector */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-sm mb-3">Language</h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.key}
              onClick={() => setLanguage(lang.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                language === lang.key
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40 shadow-sm shadow-brand-500/10'
                  : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <lang.icon className="w-4 h-4" />
              {lang.label}
            </button>
          ))}
        </div>

        {/* Quick examples */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setLanguage('css');
              setInput(`/* Button Component Styles */\n.button {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.75rem 1.5rem;\n  border-radius: 8px;\n  font-weight: 600;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n  transition: all 0.2s ease;\n  cursor: pointer;\n}\n\n.button:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);\n}\n\n/* Large variant */\n.button--large {\n  padding: 1rem 2rem;\n  font-size: 1.125rem;\n}`);}}
            className="px-3 py-1.5 rounded-lg text-xs bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            CSS Button Styles
          </button>
          <button
            onClick={() => {
              setLanguage('javascript');
              setInput(`/**\n * Deep clone utility\n * Handles objects, arrays, dates, and primitives\n */\nfunction deepClone(obj) {\n  // Handle null and primitives\n  if (obj === null || typeof obj !== 'object') {\n    return obj;\n  }\n\n  // Handle Date\n  if (obj instanceof Date) {\n    return new Date(obj.getTime());\n  }\n\n  // Handle Array\n  if (Array.isArray(obj)) {\n    return obj.map(item => deepClone(item));\n  }\n\n  // Handle Object\n  const cloned = {};\n  for (const key of Object.keys(obj)) {\n    cloned[key] = deepClone(obj[key]);\n  }\n  return cloned;\n}`);}}
            className="px-3 py-1.5 rounded-lg text-xs bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            JS deepClone
          </button>
          <button
            onClick={() => {
              setLanguage('html');
              setInput(`<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <!-- Header Section -->\n  <header>\n    <nav>\n      <ul>\n        <li><a href="/">Home</a></li>\n        <li><a href="/about">About</a></li>\n        <li><a href="/contact">Contact</a></li>\n      </ul>\n    </nav>\n  </header>\n\n  <!-- Main Content -->\n  <main>\n    <h1>Welcome</h1>\n    <p>This is a sample page.</p>\n  </main>\n\n  <script src="app.js"></script>\n</body>\n</html>`);}}
            className="px-3 py-1.5 rounded-lg text-xs bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            HTML Template
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <LanguageIcon className="w-4 h-4 text-brand-400" />
            Input ({language.toUpperCase()})
          </h2>
          <div className="flex items-center gap-2">
            {input && (
              <span className="text-xs text-slate-500 font-mono bg-surface border border-slate-700/50 px-2 py-1 rounded">
                {formatBytes(inputSize)}
              </span>
            )}
            {input && (
              <button
                onClick={handleClear}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Clear"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste your ${language.toUpperCase()} code here...`}
          className="input-field w-full h-64 resize-y font-mono text-xs"
          spellCheck={false}
        />
      </div>

      {/* Arrow + Stats */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-4 px-6 py-3 rounded-lg bg-surface border border-slate-700/50">
          <Zap className="w-4 h-4 text-amber-400" />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              <span className="text-white font-semibold">{formatBytes(inputSize)}</span>
            </span>
            <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            <span className="text-slate-400">
              <span className="text-green-400 font-semibold">{formatBytes(outputSize)}</span>
            </span>
            {inputSize > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                reduction >= 20 ? 'bg-green-500/20 text-green-400' :
                reduction > 0 ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-700/50 text-slate-500'
              }`}>
                {reduction >= 0 ? '-' : '+'}{Math.abs(reduction).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-green-400" />
            Minified Output
          </h2>
          {output && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono bg-surface border border-slate-700/50 px-2 py-1 rounded">
                {formatBytes(outputSize)}
              </span>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {output ? (
          <pre className="bg-surface rounded-lg border border-slate-700/50 p-4 overflow-auto max-h-96">
            <code className="font-mono text-xs text-green-300 whitespace-pre-wrap break-all">{output}</code>
          </pre>
        ) : (
          <div className="bg-surface rounded-lg border border-slate-700/50 p-8 text-center">
            <Minimize2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Paste code above to see minified output.
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
