'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Download, ArrowRightLeft, FileCode, FileJson, FileType, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Language = 'css' | 'javascript' | 'html';

const LANGUAGES: { value: Language; label: string; icon: typeof FileCode; placeholder: string }[] = [
  {
    value: 'css',
    label: 'CSS',
    icon: FileCode,
    placeholder: `/* Paste your CSS here */\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  padding: 20px;\n}\n\n.button {\n  background: #3b82f6;\n  color: white;\n  border: none;\n  border-radius: 8px;\n  padding: 12px 24px;\n  font-size: 16px;\n}`,
  },
  {
    value: 'javascript',
    label: 'JavaScript',
    icon: FileJson,
    placeholder: `// Paste your JavaScript here\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst result = fibonacci(10);\nconsole.log('Result:', result);`,
  },
  {
    value: 'html',
    label: 'HTML',
    icon: FileType,
    placeholder: `<!-- Paste your HTML here -->\n<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <div class="container">\n      <h1>Hello World</h1>\n      <p>This is a paragraph.</p>\n    </div>\n  </body>\n</html>`,
  },
];

function minifyCSS(input: string): string {
  // Remove CSS comments
  let output = input.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove whitespace around special characters
  output = output
    .replace(/\s*([{};:,>+~()])\s*/g, '$1')
    // Remove semicolons before closing braces
    .replace(/;}/g, '}')
    // Collapse multiple spaces/newlines into single space
    .replace(/\s+/g, ' ')
    // Remove spaces before/after braces
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    // Remove last semicolon in a rule
    .replace(/;}/g, '}')
    // Remove leading/trailing whitespace
    .trim();

  return output;
}

function minifyJS(input: string): string {
  let output = input;

  // Protect strings (single-quoted, double-quoted, template literals)
  const strings: string[] = [];
  output = output.replace(/(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, (_match) => {
    strings.push(_match);
    return `\x00STRING${strings.length - 1}\x00`;
  });

  // Protect regex literals (simple heuristic)
  const regexes: string[] = [];
  output = output.replace(/\/(?:[^\/\n\\]|\\.)+\/[gimsuys]*/g, (_match) => {
    // Avoid mistaking division for regex — only after certain tokens
    regexes.push(_match);
    return `\x00REGEX${regexes.length - 1}\x00`;
  });

  // Remove single-line comments
  output = output.replace(/\/\/.*$/gm, '');

  // Remove multi-line comments
  output = output.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove whitespace around operators and punctuation
  output = output
    .replace(/\s*([=+\-*/%&|^<>!~?:;,{}()[\]])\s*/g, '$1')
    // Fix: preserve newlines as spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Restore strings
  output = output.replace(/\x00STRING(\d+)\x00/g, (_m, i) => strings[parseInt(i)]);

  // Restore regex
  output = output.replace(/\x00REGEX(\d+)\x00/g, (_m, i) => regexes[parseInt(i)]);

  return output;
}

function minifyHTML(input: string): string {
  let output = input;

  // Remove HTML comments (but not IE conditional comments)
  output = output.replace(/<!--(?!\[if\s)[\s\S]*?-->/g, '');

  // Collapse whitespace — but be careful around tags and text
  // Remove whitespace between tags
  output = output.replace(/>\s+</g, '><');
  // Collapse whitespace in text nodes
  output = output.replace(/\s{2,}/g, ' ');
  // Remove leading/trailing whitespace
  output = output.trim();

  return output;
}

function minify(input: string, language: Language): string {
  switch (language) {
    case 'css':
      return minifyCSS(input);
    case 'javascript':
      return minifyJS(input);
    case 'html':
      return minifyHTML(input);
    default:
      return input;
  }
}

export default function CodeMinifierPage() {
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('css');

  const current = LANGUAGES.find((l) => l.value === language)!;

  const output = useMemo(() => {
    if (!input.trim()) return '';
    return minify(input, language);
  }, [input, language]);

  const stats = useMemo(() => {
    const inputBytes = new TextEncoder().encode(input).length;
    const outputBytes = new TextEncoder().encode(output).length;
    const savingsPercent = inputBytes > 0 ? ((1 - outputBytes / inputBytes) * 100).toFixed(1) : '0.0';
    return {
      inputSize: inputBytes,
      outputSize: outputBytes,
      savingsPercent,
      linesBefore: input ? input.split('\n').length : 0,
      linesAfter: output ? output.split('\n').length : 0,
    };
  }, [input, output]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      toast.success('Minified code copied to clipboard');
    });
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  const handleDownload = useCallback(() => {
    const ext = language === 'javascript' ? '.min.js' : language === 'css' ? '.min.css' : '.min.html';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as output${ext}`);
  }, [output, language]);

  const placeholder = current.placeholder;

  const IconComponent = current.icon;

  // Calculate gauge width
  const gaugePercent = input.trim() ? Math.min(100, parseFloat(stats.savingsPercent)) : 0;

  return (
    <ToolLayout
      title="Code Minifier"
      description="Minify CSS, JavaScript, and HTML — strip comments, whitespace, and shrink your code. 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap w-full">
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  language === lang.value
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <lang.icon className="w-4 h-4" />
                {lang.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="text-xs text-slate-500">
            {gaugePercent > 0 && (
              <span className="text-brand-400">{stats.savingsPercent}% smaller</span>
            )}
          </div>
        </div>
      }
    >
      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input pane */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-4 h-4" />
              Input
            </label>
            <span className="text-xs text-slate-500">
              {input.length > 0 ? `${input.split('\n').length} lines · ${stats.inputSize.toLocaleString()} B` : 'Empty'}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className="w-full h-[420px] bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 resize-none"
          />
        </div>

        {/* Output pane */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-4 h-4" />
              Minified
            </label>
            <span className="text-xs text-slate-500">
              {output.length > 0
                ? `${output.split('\n').length} lines · ${stats.outputSize.toLocaleString()} B`
                : 'Empty'}
            </span>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Minified output appears here..."
            spellCheck={false}
            className="w-full h-[420px] bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 resize-none"
          />
        </div>
      </div>

      {/* Stats bar */}
      {input.trim() && output && (
        <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Size</span>
              <span className="text-sm font-mono text-slate-300">
                {stats.inputSize.toLocaleString()} B
              </span>
              <ArrowRightLeft className="w-3 h-3 text-slate-600" />
              <span className="text-sm font-mono text-brand-400">
                {stats.outputSize.toLocaleString()} B
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Saved</span>
              <span className="text-sm font-mono text-brand-400">
                {(stats.inputSize - stats.outputSize).toLocaleString()} B ({stats.savingsPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Lines</span>
              <span className="text-sm font-mono text-slate-300">
                {stats.linesBefore.toLocaleString()}
              </span>
              <ArrowRightLeft className="w-3 h-3 text-slate-600" />
              <span className="text-sm font-mono text-brand-400">
                {stats.linesAfter.toLocaleString()}
              </span>
            </div>
            {/* Compression gauge */}
            <div className="flex-1 min-w-[120px]">
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${gaugePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleCopy}
          disabled={!output}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Copy className="w-4 h-4" />
          Copy Minified
        </button>
        <button
          onClick={handleDownload}
          disabled={!output}
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={handleClear}
          disabled={!input}
          className="btn-ghost inline-flex items-center gap-2 text-sm text-slate-400 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>
    </ToolLayout>
  );
}
