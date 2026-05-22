'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, ArrowDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';

type CaseStyle =
  | 'lowercase'
  | 'uppercase'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'cobol'
  | 'spongebob'
  | 'dot-case'
  | 'path-case'
  | 'header'
  | 'train';
interface CaseOption {
  id: CaseStyle;
  label: string;
  example: string;
  section: 'basics' | 'programming' | 'fun';
}

const caseOptions: CaseOption[] = [
  { id: 'lowercase', label: 'lowercase', example: 'hello world', section: 'basics' },
  { id: 'uppercase', label: 'UPPERCASE', example: 'HELLO WORLD', section: 'basics' },
  { id: 'title', label: 'Title Case', example: 'Hello World', section: 'basics' },
  { id: 'sentence', label: 'Sentence case', example: 'Hello world', section: 'basics' },

  { id: 'camel', label: 'camelCase', example: 'helloWorld', section: 'programming' },
  { id: 'pascal', label: 'PascalCase', example: 'HelloWorld', section: 'programming' },
  { id: 'snake', label: 'snake_case', example: 'hello_world', section: 'programming' },
  { id: 'kebab', label: 'kebab-case', example: 'hello-world', section: 'programming' },
  { id: 'constant', label: 'CONSTANT_CASE', example: 'HELLO_WORLD', section: 'programming' },
  { id: 'cobol', label: 'COBOL-CASE', example: 'HELLO-WORLD', section: 'programming' },
  { id: 'train', label: 'Train-Case', example: 'Hello-World', section: 'programming' },
  { id: 'header', label: 'Header-Case', example: 'Hello-World', section: 'programming' },

  { id: 'dot-case', label: 'dot.case', example: 'hello.world', section: 'programming' },
  { id: 'path-case', label: 'path/case', example: 'hello/world', section: 'programming' },

  { id: 'spongebob', label: 'sPoNgEbOb', example: 'hElLo wOrLd', section: 'fun' },
];

/** Tokenize text into words, preserving numbers and special chars intelligently */
function tokenizeWords(input: string): string[] {
  if (!input.trim()) return [];
  // Split on word boundaries: spaces, underscores, hyphens, dots, slashes, camelCase transitions, digits, and other separators
  // First, replace common separators with spaces
  const withSpaces = input
    .replace(/[_\-.\\/:;,@&|#~*+]+/g, ' ')
    // Split camelCase: lowercase followed by uppercase, or uppercase followed by uppercase+lowercase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  // Split by whitespace and filter empties
  return withSpaces.split(/\s+/).filter(w => w.length > 0);
}

function convertCase(input: string, style: CaseStyle): string {
  if (!input.trim()) return '';

  const words = tokenizeWords(input);

  switch (style) {
    case 'lowercase':
      return words.map(w => w.toLowerCase()).join(' ');

    case 'uppercase':
      return words.map(w => w.toUpperCase()).join(' ');

    case 'title':
      return words
        .map((w, i) => {
          const lower = w.toLowerCase();
          // Skip minor words in title case (except first and last)
          const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'in', 'of', 'so', 'yet']);
          if (i > 0 && i < words.length - 1 && minorWords.has(lower) && lower.length <= 3) {
            return lower;
          }
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');

    case 'sentence': {
      const text = words.map(w => w.toLowerCase()).join(' ');
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    case 'camel':
      return words
        .map((w, i) => {
          const lower = w.toLowerCase();
          if (i === 0) return lower;
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('');

    case 'pascal':
      return words
        .map(w => {
          const lower = w.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('');

    case 'snake':
      return words.map(w => w.toLowerCase()).join('_');

    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-');

    case 'constant':
      return words.map(w => w.toUpperCase()).join('_');

    case 'cobol':
      return words.map(w => w.toUpperCase()).join('-');

    case 'train':
      return words
        .map(w => {
          const lower = w.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('-');

    case 'header':
      return words
        .map(w => {
          const lower = w.toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('-');

    case 'dot-case':
      return words.map(w => w.toLowerCase()).join('.');

    case 'path-case':
      return words.map(w => w.toLowerCase()).join('/');

    case 'spongebob':
      return words
        .map(w =>
          w
            .split('')
            .map((ch, i) => (i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase()))
            .join('')
        )
        .join(' ');

    default:
      return input;
  }
}

export default function TextCaseConverterPage() {
  const [input, setInput] = useState('');
  const [selectedCase, setSelectedCase] = useState<CaseStyle>('camel');
  const [copiedCase, setCopiedCase] = useState<CaseStyle | null>(null);

  const output = useMemo(() => convertCase(input, selectedCase), [input, selectedCase]);

  const clear = useCallback(() => {
    setInput('');
  }, []);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopiedCase(selectedCase);
      toast.success(`Copied ${selectedCase} result!`);
      setTimeout(() => setCopiedCase(null), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [output, selectedCase]);

  const copySpecific = useCallback(async (style: CaseStyle) => {
    const result = convertCase(input, style);
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopiedCase(style);
      toast.success(`Copied ${style} result!`);
      setTimeout(() => setCopiedCase(null), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [input]);

  const basicCases = caseOptions.filter(c => c.section === 'basics');
  const programmingCases = caseOptions.filter(c => c.section === 'programming');
  const funCases = caseOptions.filter(c => c.section === 'fun');

  return (
    <ToolLayout
      title="Text Case Converter"
      description="Convert text between 15 case styles — camelCase, snake_case, kebab-case, CONSTANT_CASE, and more. Smart word detection handles mixed input formats."
    >
      {/* Input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Input Text</h2>
          <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste text here...&#10;&#10;Handles mixed formats: hello_world, hello-world, HelloWorld, helloWorld, etc."
          className="input-field w-full h-36 resize-y font-mono text-sm"
          spellCheck={false}
        />
      </div>

      {/* Single case converter (selected) */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold text-sm">Convert to</h2>
            <select
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value as CaseStyle)}
              className="bg-surface border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-white font-mono outline-none focus:border-brand-500"
            >
              <optgroup label="Basic">
                {basicCases.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
              <optgroup label="Programming">
                {programmingCases.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
              <optgroup label="Fun">
                {funCases.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
          {output && (
            <button onClick={copyOutput} className="btn-primary flex items-center gap-1.5 text-sm" title="Copy">
              {copiedCase === selectedCase ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy
            </button>
          )}
        </div>
        {input.trim() ? (
          <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 min-h-[3rem] flex items-center font-mono text-lg text-brand-400 whitespace-pre-wrap break-all">
            {output}
          </pre>
        ) : (
          <div className="bg-surface rounded-lg p-4 border border-slate-700/50 min-h-[3rem] flex items-center text-slate-500 text-sm">
            Enter some text above to see the conversion
          </div>
        )}
      </div>

      {/* All cases grid */}
      <div>
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <ArrowDown className="w-4 h-4 text-brand-400" />
          All Case Conversions
        </h2>

        {/* Basic section */}
        <div className="mb-4">
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Basic Cases</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {basicCases.map((c) => {
              const result = convertCase(input, c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => copySpecific(c.id)}
                  disabled={!input.trim()}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-surface hover:bg-surface-light transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <div>
                    <div className="text-white text-sm font-mono">{c.label}</div>
                    {input.trim() && (
                      <div className="text-brand-400 text-xs font-mono mt-0.5 truncate max-w-[240px]">
                        {result}
                      </div>
                    )}
                  </div>
                  <span className="text-slate-600 group-hover:text-brand-400 group-disabled:text-slate-600 transition-colors shrink-0">
                    {copiedCase === c.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Programming section */}
        <div className="mb-4">
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Programming Cases</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {programmingCases.map((c) => {
              const result = convertCase(input, c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => copySpecific(c.id)}
                  disabled={!input.trim()}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-surface hover:bg-surface-light transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <div>
                    <div className="text-white text-sm font-mono">{c.label}</div>
                    {input.trim() && (
                      <div className="text-brand-400 text-xs font-mono mt-0.5 truncate max-w-[200px]">
                        {result}
                      </div>
                    )}
                  </div>
                  <span className="text-slate-600 group-hover:text-brand-400 group-disabled:text-slate-600 transition-colors shrink-0">
                    {copiedCase === c.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fun section */}
        <div>
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Fun</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {funCases.map((c) => {
              const result = convertCase(input, c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => copySpecific(c.id)}
                  disabled={!input.trim()}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-surface hover:bg-surface-light transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <div>
                    <div className="text-white text-sm font-mono">{c.label}</div>
                    {input.trim() && (
                      <div className="text-brand-400 text-xs font-mono mt-0.5 truncate max-w-[240px]">
                        {result}
                      </div>
                    )}
                  </div>
                  <span className="text-slate-600 group-hover:text-brand-400 group-disabled:text-slate-600 transition-colors shrink-0">
                    {copiedCase === c.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">Smart Word Detection</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          The converter intelligently detects word boundaries across mixed formats —
          it handles <code className="text-brand-400 text-xs">camelCase</code>, <code className="text-brand-400 text-xs">snake_case</code>, <code className="text-brand-400 text-xs">kebab-case</code>,
          <code className="text-brand-400 text-xs"> PascalCase</code>, and <code className="text-brand-400 text-xs">CONSTANT_CASE</code> input equally well.
          Just paste any text and convert to your preferred style.
        </p>
      </div>
    </ToolLayout>
  );
}
