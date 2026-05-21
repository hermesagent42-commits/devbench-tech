'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const commonPatterns: { label: string; pattern: string; flags: string }[] = [
  { label: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'gi' },
  { label: 'URL', pattern: 'https?://[^\\s/$.?#].[^\\s]*', flags: 'gi' },
  { label: 'Phone', pattern: '\\+?\\d{1,4}?[-.\\s]?\\(?\\d{1,3}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}', flags: 'gi' },
  { label: 'IPv4', pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b', flags: 'gi' },
];

interface MatchResult {
  index: number;
  match: string;
  groups: (string | undefined)[];
}

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const runRegex = useCallback(() => {
    setError(null);
    setMatches([]);

    if (!pattern.trim()) return;

    try {
      const regex = new RegExp(pattern, flags);
      const results: MatchResult[] = [];
      let match: RegExpExecArray | null;

      // Reset lastIndex for global regex
      regex.lastIndex = 0;

      while ((match = regex.exec(testString)) !== null) {
        results.push({
          index: match.index,
          match: match[0],
          groups: match.slice(1),
        });
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      setMatches(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  }, [pattern, flags, testString]);

  const highlightedText = useMemo(() => {
    if (matches.length === 0 || error) return testString;

    // Build highlighted version by inserting spans at match positions
    const parts: { text: string; highlight: boolean }[] = [];
    let lastIndex = 0;

    // Sort matches by index
    const sorted = [...matches].sort((a, b) => a.index - b.index);

    for (const m of sorted) {
      if (m.index > lastIndex) {
        parts.push({ text: testString.slice(lastIndex, m.index), highlight: false });
      }
      parts.push({ text: m.match, highlight: true });
      lastIndex = m.index + m.match.length;
    }

    if (lastIndex < testString.length) {
      parts.push({ text: testString.slice(lastIndex), highlight: false });
    }

    return parts;
  }, [testString, matches, error]);

  const setCommonPattern = useCallback((p: string, f: string) => {
    setPattern(p);
    setFlags(f);
    setError(null);
  }, []);

  const copyMatch = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, []);

  return (
    <ToolLayout
      title="Regex Tester"
      description="Test regular expressions with real-time match highlighting and capture group display."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pattern Input */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Pattern</label>
            <div className="flex items-center gap-0">
              <span className="text-slate-500 font-mono text-lg bg-surface-light rounded-l-lg px-3 py-2 border border-r-0 border-slate-600/50">
                /
              </span>
              <input
                type="text"
                className="input-field flex-1 rounded-none font-mono"
                placeholder="e.g. \\d+"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                spellCheck={false}
              />
              <span className="text-slate-500 font-mono text-lg bg-surface-light border border-l-0 border-slate-600/50 px-3 py-2">
                /
              </span>
              <input
                type="text"
                className="input-field w-16 rounded-l-none font-mono"
                placeholder="g"
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Common Patterns */}
          <div className="flex flex-wrap gap-2">
            {commonPatterns.map((cp) => (
              <button
                key={cp.label}
                onClick={() => setCommonPattern(cp.pattern, cp.flags)}
                className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors"
              >
                {cp.label}
              </button>
            ))}
          </div>

          <button onClick={runRegex} className="btn-primary text-sm">
            Test Regex
          </button>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm font-mono">{error}</p>
            </div>
          )}
        </div>

        {/* Match count */}
        <div className="card flex flex-col items-center justify-center text-center">
          <p className="text-slate-400 text-sm mb-2">Matches Found</p>
          <p className="text-4xl font-bold gradient-text">
            {error ? '—' : matches.length}
          </p>
          {matches.length > 0 && (
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-2" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test String */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-300">Test String</label>
          <textarea
            className="input-field flex-1 min-h-[200px] font-mono text-sm resize-y"
            placeholder="Enter text to test against your regex..."
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Highlighted Output */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-300">
            Highlighted Matches
          </label>
          <div className="card flex-1 min-h-[200px] overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {error ? (
              <p className="text-red-400">Fix the regex error to see results.</p>
            ) : Array.isArray(highlightedText) ? (
              highlightedText.map((part, i) =>
                part.highlight ? (
                  <mark
                    key={i}
                    className="bg-brand-500/30 text-white rounded-sm px-0.5"
                  >
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )
            ) : (
              <span className="text-slate-500">{testString || 'Matches will be highlighted here'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Capture Groups */}
      {matches.length > 0 && (
        <div className="mt-8">
          <h3 className="text-white font-semibold text-lg mb-4">
            Match Details ({matches.length} {matches.length === 1 ? 'match' : 'matches'})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {matches.map((m, i) => (
              <div key={i} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge-primary">Match {i + 1}</span>
                  <span className="text-slate-500 text-xs">Index: {m.index}</span>
                  <button
                    onClick={() => copyMatch(m.match)}
                    className="text-slate-500 hover:text-brand-400 transition-colors"
                    title="Copy match"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <code className="text-brand-400 font-mono text-sm break-all">
                  {m.match || '(empty)'}
                </code>
                {m.groups.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Capture Groups:</p>
                    <div className="flex flex-wrap gap-2">
                      {m.groups.map((g, gi) => (
                        <code
                          key={gi}
                          className="bg-surface rounded px-2 py-0.5 font-mono text-xs text-green-400"
                        >
                          ${gi + 1}: {g ?? '(undefined)'}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
