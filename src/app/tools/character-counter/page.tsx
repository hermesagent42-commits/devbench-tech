'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Trash2, Type, BarChart3, Binary, Code2, Hash,
  Upload, Download, Eye, Layers, FileText, TrendingUp, Info,
  AlignLeft, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface EncodingInfo {
  name: string;
  byteLength: number;
  hex: string;
  maxBytes: number;
  description: string;
  isVariable: boolean;
}

interface FreqEntry {
  char: string;
  display: string;
  count: number;
  codePoint: string;
  isSpecial: boolean;
}

interface SegmentStats {
  graphemes: number;
  words: number;
  sentences: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getUTF8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

function getUTF16Bytes(text: string): number {
  return text.length * 2;
}

function getUTF32Bytes(text: string): number {
  return [...text].reduce((sum, ch) => {
    const cp = ch.codePointAt(0)!;
    return sum + (cp > 0x10FFFF ? 2 : 1) * 4;
  }, 0);
}

function getHex(text: string, encoding: 'utf8' | 'utf16' | 'utf32'): string {
  if (encoding === 'utf8') {
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  }
  if (encoding === 'utf16') {
    return [...text].map(ch => {
      const code = ch.charCodeAt(0);
      if (code >= 0xD800 && code <= 0xDBFF) {
        return code.toString(16).padStart(4, '0').toUpperCase();
      }
      return code.toString(16).padStart(4, '0').toUpperCase();
    }).join(' ');
  }
  // utf32
  return [...text].map(ch => {
    const cp = ch.codePointAt(0) || 0;
    return cp.toString(16).padStart(8, '0').toUpperCase();
  }).join(' ');
}

function getGraphemeClusters(text: string): string[] {
  if (!text) return [];
  // Use Intl.Segmenter for proper grapheme cluster segmentation
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].map(s => s.segment);
  }
  // Fallback: spread operator handles surrogate pairs but not combining marks
  return [...text];
}

function getSegmentStats(text: string): SegmentStats {
  if (!text.trim()) {
    return { graphemes: 0, words: 0, sentences: 0 };
  }

  const graphemes = getGraphemeClusters(text).length;

  let words = 0;
  let sentences = 0;

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const wordSegmenter = new Intl.Segmenter('en', { granularity: 'word' });
      const wordSegments = [...wordSegmenter.segment(text)];
      words = wordSegments.filter(s => s.isWordLike).length;

      const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
      sentences = [...sentenceSegmenter.segment(text)].length;
    } catch {
      // Fallback
      words = text.trim().split(/\s+/).length;
      sentences = text.split(/[.!?]+[\s\n]|[.!?]+$/).filter(s => s.trim().length > 0).length;
    }
  } else {
    words = text.trim().split(/\s+/).length;
    sentences = text.split(/[.!?]+[\s\n]|[.!?]+$/).filter(s => s.trim().length > 0).length;
  }

  return { graphemes, words, sentences };
}

function getCharFrequency(text: string): FreqEntry[] {
  const graphemes = getGraphemeClusters(text);
  const freq: Record<string, number> = {};

  for (const g of graphemes) {
    if (g === '\n' || g === '\r' || g === '\t') continue;
    freq[g] = (freq[g] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([char, count]) => {
      const cp = char.codePointAt(0);
      const codePoint = cp ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : 'N/A';
      const isSpecial = char === ' ' || (cp !== undefined && cp < 32);
      return {
        char,
        display: isSpecial
          ? char === ' '
            ? '␣ (space)'
            : char === '\n'
              ? '↵ (newline)'
              : char === '\t'
                ? '⇥ (tab)'
                : `\\x${(cp || 0).toString(16).padStart(2, '0')}`
          : char,
        count,
        codePoint,
        isSpecial,
      };
    });
}

function isEmoji(str: string): boolean {
  const cp = str.codePointAt(0);
  if (!cp) return false;
  // Emoji ranges (simplified but covers most common cases)
  return (
    (cp >= 0x1F600 && cp <= 0x1F64F) || // Emoticons
    (cp >= 0x1F300 && cp <= 0x1F5FF) || // Misc Symbols and Pictographs
    (cp >= 0x1F680 && cp <= 0x1F6FF) || // Transport and Map
    (cp >= 0x1F1E6 && cp <= 0x1F1FF) || // Flags
    (cp >= 0x2600 && cp <= 0x26FF)   || // Misc symbols
    (cp >= 0x2700 && cp <= 0x27BF)   || // Dingbats
    (cp >= 0x1F900 && cp <= 0x1F9FF) || // Supplemental Symbols and Pictographs
    (cp >= 0x1FA00 && cp <= 0x1FA6F) || // Chess Symbols
    (cp >= 0x1FA70 && cp <= 0x1FAFF) || // Symbols and Pictographs Extended-A
    (cp === 0x200D)                     // Zero Width Joiner (emoji sequences)
  );
}

function getCategoryBreakdown(text: string) {
  if (!text) return [];
  let letters = 0, digits = 0, punctuation = 0, whitespace = 0, symbols = 0, emoji = 0, cjk = 0;

  const graphemes = getGraphemeClusters(text);
  for (const g of graphemes) {
    const cp = g.codePointAt(0);
    if (!cp) continue;

    if (isEmoji(g)) {
      emoji++;
    } else if (/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(g)) {
      cjk++;
    } else if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122) || (cp >= 0xC0 && cp <= 0x2AF) || (cp >= 0x370 && cp <= 0x1FFF && cp !== 0x200D)) {
      letters++;
    } else if (cp >= 48 && cp <= 57) {
      digits++;
    } else if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) {
      punctuation++;
    } else if (cp === 32 || cp === 9 || cp === 10 || cp === 13 || cp === 160) {
      whitespace++;
    } else {
      symbols++;
    }
  }

  const total = graphemes.length || 1;
  return [
    { category: 'Letters', count: letters, pct: Math.round(letters / total * 100), color: 'bg-blue-500' },
    { category: 'Digits', count: digits, pct: Math.round(digits / total * 100), color: 'bg-emerald-500' },
    { category: 'CJK', count: cjk, pct: Math.round(cjk / total * 100), color: 'bg-purple-500' },
    { category: 'Emoji', count: emoji, pct: Math.round(emoji / total * 100), color: 'bg-amber-500' },
    { category: 'Punctuation', count: punctuation, pct: Math.round(punctuation / total * 100), color: 'bg-pink-500' },
    { category: 'Whitespace', count: whitespace, pct: Math.round(whitespace / total * 100), color: 'bg-slate-500' },
    { category: 'Symbols', count: symbols, pct: Math.round(symbols / total * 100), color: 'bg-orange-500' },
  ].filter(c => c.count > 0);
}

// ── Quick examples ──────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    label: 'Hello World',
    text: 'Hello, World! \nThis is a test. 😊🚀',
  },
  {
    label: 'Complex Emoji',
    text: '👨‍👩‍👧‍👦🏳️‍🌈👩🏽‍🚀🧑‍💻🇺🇳 — family, pride flag, astronaut, technologist',
  },
  {
    label: 'Multilingual',
    text: 'Hello! 你好！こんにちは！안녕하세요! Привет! مرحبا! नमस्ते!',
  },
];

const ENCODINGS: { key: 'utf8' | 'utf16' | 'utf32'; name: string; maxBytes: number; description: string; isVariable: boolean; color: string }[] = [
  { key: 'utf8', name: 'UTF-8', maxBytes: 4, description: 'Variable-width (1-4 bytes). ASCII-safe, web standard.', isVariable: true, color: 'text-emerald-400' },
  { key: 'utf16', name: 'UTF-16', maxBytes: 4, description: 'Variable-width (2 or 4 bytes). JavaScript internal encoding.', isVariable: true, color: 'text-sky-400' },
  { key: 'utf32', name: 'UTF-32', maxBytes: 4, description: 'Fixed-width (4 bytes). Rarely used, but simple to process.', isVariable: false, color: 'text-violet-400' },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function CharacterCounterPage() {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHex, setShowHex] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const stats = useMemo(() => getSegmentStats(input), [input]);
  const encodingInfos = useMemo(() =>
    ENCODINGS.map(e => {
      const byteLength = e.key === 'utf8' ? getUTF8Bytes(input)
        : e.key === 'utf16' ? getUTF16Bytes(input)
        : getUTF32Bytes(input);
      const hex = getHex(input, e.key);
      return { ...e, byteLength, hex };
    }),
    [input]
  );

  const frequency = useMemo(() => getCharFrequency(input), [input]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(input), [input]);
  const graphemeClusters = useMemo(() => getGraphemeClusters(input), [input]);

  // ── Actions ────────────────────────────────────────────────────────────

  const clear = useCallback(() => setInput(''), []);

  const copyText = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Copied ${label}`),
      () => toast.error('Copy failed')
    );
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInput(reader.result as string);
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([input], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character-counter-output.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [input]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInput(prev => prev + text);
    } catch {
      toast.error('Clipboard access denied. Paste manually.');
    }
  }, []);

  const charWithSpaces = input.length;
  const charWithoutSpaces = input.replace(/\s/g, '').length;
  const lines = input.split('\n').length;
  const nonEmptyLines = input.split('\n').filter(l => l.trim().length > 0).length;
  const paragraphs = input.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

  return (
    <ToolLayout
      title="Character Counter"
      description="Analyze text with proper grapheme cluster counting — emoji sequences, flags, combined characters. UTF-8/16/32 byte sizes, character frequency, category breakdown, and encoding hex preview. All client-side via Intl.Segmenter."
    >
      {/* Input */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-400" />
            Input Text
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePaste}
              className="p-1.5 rounded-md text-slate-500 hover:text-brand-400 hover:bg-surface transition-colors"
              title="Paste from clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-surface transition-colors"
              title="Upload text file"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              disabled={!input}
              className="p-1.5 rounded-md text-slate-500 hover:text-sky-400 hover:bg-surface transition-colors disabled:opacity-30"
              title="Download as .txt"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clear}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-surface transition-colors"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.md,.json,.xml,.html,.css,.js,.ts"
          onChange={handleFileUpload}
          className="hidden"
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste text here… try emoji sequences like 👨‍👩‍👧‍👦 or 🏳️‍🌈"
          className="input-field w-full h-40 resize-y font-mono text-sm"
          spellCheck={false}
        />

        {/* Quick examples */}
        {!input && (
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setInput(ex.text)}
                className="px-2.5 py-1 text-xs rounded-md bg-surface text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 border border-slate-700/50 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {input && (
        <>
          {/* Main stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Characters', value: charWithSpaces.toLocaleString(), icon: Type, color: 'text-brand-400' },
              { label: 'No Spaces', value: charWithoutSpaces.toLocaleString(), icon: AlignLeft, color: 'text-sky-400' },
              { label: 'Graphemes', value: stats.graphemes.toLocaleString(), icon: Eye, color: 'text-violet-400' },
              { label: 'Words', value: stats.words.toLocaleString(), icon: FileText, color: 'text-emerald-400' },
              { label: 'Sentences', value: stats.sentences.toLocaleString(), icon: Layers, color: 'text-amber-400' },
              { label: 'Lines', value: lines.toLocaleString(), icon: Hash, color: 'text-pink-400' },
              { label: 'Paragraphs', value: paragraphs.toLocaleString(), icon: BarChart3, color: 'text-orange-400' },
            ].map((stat, i) => (
              <div key={i} className="card text-center py-4">
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Grapheme vs. char.js length */}
          {stats.graphemes !== charWithSpaces && (
            <div className="card mb-6 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <strong>Grapheme clusters detected:</strong> This text has {stats.graphemes.toLocaleString()} graphemes
                  but {charWithSpaces.toLocaleString()} UTF-16 code units (JavaScript <code className="text-amber-400 bg-amber-500/10 px-1 rounded">.length</code>).
                  The difference comes from emoji sequences, combining characters, and surrogate pairs — exactly what <code className="text-amber-400 bg-amber-500/10 px-1 rounded">Intl.Segmenter</code> handles.
                </div>
              </div>
            </div>
          )}

          {/* Encoding byte sizes */}
          <div className="card mb-6">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Binary className="w-4 h-4 text-brand-400" />
              Byte Size by Encoding
            </h3>
            <div className="space-y-3">
              {encodingInfos.map((enc) => (
                <div key={enc.key} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <span className={`font-mono font-semibold text-sm ${enc.color}`}>{enc.name}</span>
                    <span className="ml-1 text-xs text-slate-600">{enc.isVariable ? '1-4B' : '4B'}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500/60 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (enc.byteLength / Math.max(...encodingInfos.map(e => e.byteLength), 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm text-white w-16 text-right font-semibold">
                      {enc.byteLength.toLocaleString()} B
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:block w-48">{enc.description}</span>
                </div>
              ))}
            </div>
            {/* Toggle hex view */}
            <div className="mt-4">
              <button
                onClick={() => setShowHex(!showHex)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showHex ? 'Hide' : 'Show'} hex encoding preview
              </button>
              {showHex && (
                <div className="mt-3 space-y-2">
                  {encodingInfos.map((enc) => (
                    <div key={enc.key}>
                      <div className="text-xs text-slate-500 mb-1 font-mono">{enc.name}:</div>
                      <pre className="p-3 rounded-lg bg-slate-900 border border-slate-700/50 text-xs font-mono text-slate-400 overflow-x-auto break-all max-h-24 overflow-y-auto">
                        {enc.hex || '(empty)'}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card mb-6">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              Character Category Breakdown
            </h3>
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-mono text-slate-400 shrink-0">{cat.category}</span>
                    <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${cat.color}`}
                        style={{ width: `${cat.pct}%`, minWidth: cat.count > 0 ? '12px' : '0' }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-10 text-right">{cat.pct}%</span>
                    <span className="text-xs font-mono text-slate-500 w-12 text-right">{cat.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No character categories detected. Type some text above.</p>
            )}
          </div>

          {/* Character Frequency Table */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                Character Frequency
              </h3>
              <span className="text-xs text-slate-500">{frequency.length} unique chars (top 30)</span>
            </div>
            {frequency.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Char</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Code Point</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Count</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequency.map((entry, i) => (
                      <tr key={i} className="border-b border-slate-700/30 hover:bg-surface-light/50 transition-colors group">
                        <td className="py-2 px-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span className={`font-mono ${entry.isSpecial ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                            {entry.display}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-xs hidden sm:table-cell">
                          {entry.codePoint}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300 font-semibold">
                          {entry.count.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500/50 rounded-full transition-all"
                                style={{ width: `${(entry.count / frequency[0].count) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 font-mono w-12 text-right">
                              {((entry.count / (graphemeClusters.length || 1)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No text to analyze.</p>
            )}
          </div>

          {/* Grapheme clusters display */}
          {graphemeClusters.length > 0 && graphemeClusters.length <= 200 && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-400" />
                  Grapheme Clusters
                </h3>
                <button
                  onClick={() => copyText(graphemeClusters.map((g, i) => `[${i}] ${g}`).join('\n'), 'grapheme list')}
                  className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy list
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {graphemeClusters.map((g, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-1 rounded-md bg-slate-800 border border-slate-700/50 text-sm text-slate-300 font-mono hover:border-brand-500/40 hover:bg-brand-500/5 transition-all cursor-default"
                    title={`Cluster ${i}: ${g}${g.codePointAt(0) ? ` (U+${g.codePointAt(0)!.toString(16).toUpperCase()})` : ''}`}
                  >
                    {g === ' ' ? '␣' : g === '\n' ? '↵' : g === '\t' ? '⇥' : g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!input && (
        <div className="card text-center py-12">
          <Type className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-400 font-medium mb-2">Character Counter &amp; Encoding Explorer</h3>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Type or paste text above to see precise grapheme cluster counts, byte sizes across UTF-8/16/32,
            character category breakdowns, frequency analysis, and hex encoding previews.
            Unlike <code className="text-brand-400">.length</code>, this tool uses{' '}
            <code className="text-brand-400">Intl.Segmenter</code> to correctly count emoji sequences,
            flags, and combining characters.
          </p>
        </div>
      )}

      {/* Info section */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-400" />
          About Character Counting
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
          <div>
            <h4 className="text-slate-300 font-medium text-xs mb-1">Graphemes vs. Code Units</h4>
            <p>
              JavaScript <code className="text-brand-400">.length</code> counts UTF-16 code units, not visible characters.
              The emoji 👨‍👩‍👧‍👦 is <strong>1 grapheme</strong> (1 visible character) but <code className="text-brand-400">.length</code> returns{' '}
              <strong>11</strong>. This tool uses <code className="text-brand-400">Intl.Segmenter</code> for accurate counting.
            </p>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium text-xs mb-1">UTF-8 Encoding</h4>
            <p>
              UTF-8 is the dominant web encoding. It uses 1 byte for ASCII, 2-4 for other characters.
              All browser APIs (<code className="text-brand-400">TextEncoder</code>, <code className="text-brand-400">fetch</code>) default to UTF-8.
              This tool shows exact byte counts via <code className="text-brand-400">TextEncoder</code>.
            </p>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium text-xs mb-1">Category Detection</h4>
            <p>
              Characters are classified using Unicode codepoint ranges: emoji ranges (U+1F600-U+1F6FF, U+2600-U+27BF, flag sequences),{' '}
              letter ranges (A-Z, a-z, Latin Extended), digit ranges (0-9), punctuation, whitespace, and symbols.
              CJK ranges are detected separately for Chinese, Japanese, and Korean scripts.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
