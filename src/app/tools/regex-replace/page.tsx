'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Info, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    label: 'Anonymize Emails',
    pattern: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
    flags: 'gi',
    replacement: '***@$2',
    input: 'Contact alice@example.com or bob@company.org for details.',
    description: 'Replace email usernames with *** while keeping the domain',
  },
  {
    label: 'Format US Phone Numbers',
    pattern: '(\\d{3})(\\d{3})(\\d{4})',
    flags: 'g',
    replacement: '($1) $2-$3',
    input: 'Call 5551234567 or 8009876543 today.',
    description: 'Convert 10-digit numbers to (XXX) XXX-XXXX format',
  },
  {
    label: 'Reformat Dates (YYYY-MM-DD → DD/MM/YYYY)',
    pattern: '(\\d{4})-(\\d{2})-(\\d{2})',
    flags: 'g',
    replacement: '$3/$2/$1',
    input: 'Events on 2024-03-15, 2025-12-25, and 2026-01-01.',
    description: 'Convert ISO dates to DD/MM/YYYY format',
  },
  {
    label: 'Remove HTML Tags',
    pattern: '<[^>]*>',
    flags: 'gi',
    replacement: '',
    input: '<p>Hello <strong>world</strong></p><br/>How are you?',
    description: 'Strip all HTML tags, leaving only the text content',
  },
  {
    label: 'Swap First & Last Name',
    pattern: '(\\w+),\\s*(\\w+)',
    flags: 'g',
    replacement: '$2 $1',
    input: 'Doe, John\nSmith, Jane\nBrown, Charlie',
    description: 'Convert "Last, First" to "First Last" format',
  },
  {
    label: 'Pad Single Digits',
    pattern: '\\b(\\d)\\b',
    flags: 'g',
    replacement: '0$1',
    input: 'Version 3.1.4 — items 5, 8, 2 and 12.',
    description: 'Add leading zero to single-digit numbers',
  },
  {
    label: 'Markdown Link → URL Only',
    pattern: '\\[([^\\]]+)\\]\\(([^)]+)\\)',
    flags: 'g',
    replacement: '$2',
    input: 'See [Google](https://google.com) and [GitHub](https://github.com) for more.',
    description: 'Extract just the URLs from Markdown links',
  },
  {
    label: 'Mask Credit Card Numbers',
    pattern: '(\\d{4})\\s?(\\d{4})\\s?(\\d{4})\\s?(\\d{4})',
    flags: 'g',
    replacement: '**** **** **** $4',
    input: 'Card: 4111 1111 1111 1111 and 5500 0000 0000 0004',
    description: 'Mask first 12 digits, show only last 4',
  },
];

// ─── Capture Group Counter ────────────────────────────────────────────────────

function countCaptureGroups(pattern: string): number {
  let count = 0;
  let i = 0;
  let inClass = false;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '\\') {
      i += 2; // skip escaped char
      continue;
    }
    if (ch === '[') {
      inClass = true;
      i++;
      continue;
    }
    if (ch === ']') {
      inClass = false;
      i++;
      continue;
    }
    if (!inClass && ch === '(' && pattern[i + 1] !== '?') {
      count++;
    }
    i++;
  }
  return count;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegexReplacePage() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [replacement, setReplacement] = useState('');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [highlightedPreview, setHighlightedPreview] = useState('');
  const [activeTab, setActiveTab] = useState<'output' | 'preview'>('output');

  const groupCount = useMemo(() => countCaptureGroups(pattern), [pattern]);

  const runReplace = useCallback(() => {
    setError(null);
    setMatchCount(0);
    setOutputText('');
    setHighlightedPreview('');

    if (!pattern.trim() || !inputText) {
      if (!inputText) setOutputText('');
      return;
    }

    try {
      const regex = new RegExp(pattern, flags);

      // Count matches for preview
      const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
      const matches = Array.from(inputText.matchAll(globalRegex));
      setMatchCount(matches.length);

      // Build highlighted preview
      let highlighted = '';
      let lastIndex = 0;
      for (const m of matches) {
        highlighted += escapeHtml(inputText.slice(lastIndex, m.index!));
        highlighted += `<mark class="bg-yellow-500/30 text-yellow-200 rounded-sm px-0.5">${escapeHtml(m[0])}</mark>`;
        lastIndex = m.index! + m[0].length;
      }
      highlighted += escapeHtml(inputText.slice(lastIndex));
      setHighlightedPreview(highlighted);

      // Perform replacement
      const result = inputText.replace(regex, replacement);
      setOutputText(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  }, [pattern, flags, replacement, inputText]);

  // Auto-run on change
  useEffect(() => {
    const timer = setTimeout(runReplace, 200);
    return () => clearTimeout(timer);
  }, [runReplace]);

  const copyOutput = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    toast.success('Output copied to clipboard');
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setReplacement(preset.replacement);
    setInputText(preset.input);
    setActiveTab('output');
  };

  const flagOptions = [
    { flag: 'g', label: 'Global', desc: 'Replace all matches' },
    { flag: 'i', label: 'Ignore case', desc: 'Case-insensitive' },
    { flag: 'm', label: 'Multiline', desc: '^ and $ match line boundaries' },
    { flag: 's', label: 'Dotall', desc: '. matches newlines too' },
  ];

  return (
    <ToolLayout
      title="Regex Replace / Substitution"
      description="Test regex find-and-replace with capture group references ($1, $2, …). See matches highlighted, try 8 real-world presets, and copy the result — all client-side."
    >
      {/* Presets */}
      <details className="mb-8">
        <summary className="text-sm font-medium text-slate-400 cursor-pointer hover:text-brand-400 select-none">
          <Zap className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Presets ({PRESETS.length})
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="text-left p-3 rounded-lg border border-slate-700/60 bg-surface-light hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors group"
            >
              <div className="text-sm font-medium text-slate-200 group-hover:text-brand-300">{p.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
            </button>
          ))}
        </div>
      </details>

      {/* Pattern + Flags row */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full sm:w-auto">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Pattern
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-mono select-none">/</span>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="(\\w+)@(\\w+\\.\\w+)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-7 pr-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-colors"
                spellCheck={false}
              />
              <span className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-mono select-none">/</span>
              <input
                type="text"
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                placeholder="g"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 bg-transparent border-0 text-sm font-mono text-brand-400 focus:outline-none"
                spellCheck={false}
              />
            </div>
            {/* Flag toggles */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {flagOptions.map((f) => (
                <button
                  key={f.flag}
                  onClick={() => {
                    setFlags((prev) =>
                      prev.includes(f.flag) ? prev.replaceAll(f.flag, '') : prev + f.flag,
                    );
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium font-mono border transition-colors ${
                    flags.includes(f.flag)
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-slate-800 text-slate-500 border-slate-700/50 hover:border-slate-600'
                  }`}
                  title={f.desc}
                >
                  /{f.flag} {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full sm:w-auto">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Replacement
            </label>
            <input
              type="text"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="***@$2"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-sm font-mono text-emerald-300 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-colors"
              spellCheck={false}
            />
            {groupCount > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                {groupCount} capture group{groupCount > 1 ? 's' : ''} detected. Use{' '}
                {Array.from({ length: groupCount }, (_, i) => (
                  <code key={i} className="bg-slate-800 px-1 py-0.5 rounded text-brand-400 text-[10px] font-mono">
                    ${i + 1}
                  </code>
                )).reduce((prev, curr) => <>{prev}{prev && ', '}{curr}</> as never)}
              </p>
            )}
          </div>
        </div>

        {/* Input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Input Text
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your text here…"
            rows={6}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-colors resize-y"
            spellCheck={false}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300 font-mono">{error}</p>
          </div>
        )}

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Result
            </label>
            <div className="flex items-center gap-2">
              {!error && pattern.trim() && inputText && (
                <span className={`text-xs font-mono ${matchCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {matchCount} match{matchCount !== 1 ? 'es' : ''}
                  {matchCount > 0 && replacement && ' → replaced'}
                </span>
              )}
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab('output')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'output' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Output
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'preview' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Match Preview
                </button>
              </div>
              <button
                onClick={copyOutput}
                disabled={!outputText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>

          {activeTab === 'output' ? (
            <div className={`relative rounded-lg border overflow-hidden transition-colors ${
              outputText ? 'border-slate-700 bg-slate-800/60' : 'border-slate-700/40 bg-slate-800/30'
            }`}>
              {outputText ? (
                <pre className="p-4 text-sm font-mono text-slate-200 whitespace-pre-wrap break-words min-h-[6rem] max-h-96 overflow-y-auto">
                  {outputText}
                </pre>
              ) : (
                <div className="p-4 text-sm text-slate-600 min-h-[6rem] flex items-center">
                  {pattern.trim() && inputText
                    ? 'No matches found with current pattern.'
                    : 'Enter a pattern, replacement, and input text to see the result.'}
                </div>
              )}
            </div>
          ) : (
            <div className={`relative rounded-lg border overflow-hidden ${
              highlightedPreview ? 'border-slate-700 bg-slate-800/60' : 'border-slate-700/40 bg-slate-800/30'
            }`}>
              {highlightedPreview ? (
                <div
                  className="p-4 text-sm font-mono text-slate-200 whitespace-pre-wrap break-words min-h-[6rem] max-h-96 overflow-y-auto [&_mark]:bg-yellow-500/25 [&_mark]:text-yellow-200 [&_mark]:rounded-sm [&_mark]:px-0.5"
                  dangerouslySetInnerHTML={{ __html: highlightedPreview }}
                />
              ) : (
                <div className="p-4 text-sm text-slate-600 min-h-[6rem] flex items-center">
                  Enter text and pattern to see matches highlighted.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="mt-8 p-4 rounded-lg bg-slate-800/50 border border-slate-700/40">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
          <div className="text-xs text-slate-400 leading-relaxed">
            <p className="font-medium text-slate-300 mb-1">Replacement syntax reference</p>
            <ul className="space-y-1">
              <li>
                <code className="bg-slate-700/60 px-1 py-0.5 rounded text-brand-300">$1, $2, …</code> — back-reference to capture group N
              </li>
              <li>
                <code className="bg-slate-700/60 px-1 py-0.5 rounded text-brand-300">$&</code> — the entire matched substring
              </li>
              <li>
                <code className="bg-slate-700/60 px-1 py-0.5 rounded text-brand-300">$`</code> — text before the match
              </li>
              <li>
                <code className="bg-slate-700/60 px-1 py-0.5 rounded text-brand-300">{`$'`}</code> — text after the match
              </li>
              <li>
                <code className="bg-slate-700/60 px-1 py-0.5 rounded text-brand-300">$$</code> — literal $ character
              </li>
              <li>
                <code className="bg-slate-700/60 px-1 py-0.5 rounded text-brand-300">$&#123;name&#125;</code> — named capture group reference
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
