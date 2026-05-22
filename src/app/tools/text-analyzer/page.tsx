'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, BarChart3, Clock, FileText, Hash, Type, AlignLeft, BookOpen, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface Stats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTimeMin: number;
  readingTimeSec: number;
  speakingTimeMin: number;
  speakingTimeSec: number;
  avgWordLength: number;
  uniqueWords: number;
  longestWord: string;
}

interface Keyword {
  word: string;
  count: number;
  percentage: string;
}

const STOP_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','her','she',
  'or','an','will','my','one','all','would','there','their','what','so','up','out',
  'if','about','who','get','which','go','me','when','make','can','like','time','no',
  'just','him','know','take','people','into','year','your','good','some','could',
  'them','see','other','than','then','now','look','only','come','its','over','think',
  'also','back','after','use','two','how','our','work','first','well','way','even',
  'new','want','because','any','these','give','day','most','us','is','are','was',
  'were','been','being','has','had','having','does','did','doing','should','may',
  'might','must','shall','will','would','can','could',
]);

function analyzeText(text: string): Stats {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const trimmed = text.trim();
  
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const wordList = trimmed ? trimmed.split(/\s+/).filter(w => w.length > 0) : [];
  
  const sentences = trimmed ? (trimmed.match(/[.!?]+(?=\s|$)/g) || []).length : 0;
  const paragraphs = trimmed ? (trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0).length) : 0;
  const lines = text ? text.split('\n').length : 0;
  
  // Reading time: average 238 words per minute
  const readingMinutes = words / 238;
  const readingTimeMin = Math.floor(readingMinutes);
  const readingTimeSec = Math.round((readingMinutes - readingTimeMin) * 60);
  
  // Speaking time: average 150 words per minute
  const speakingMinutes = words / 150;
  const speakingTimeMin = Math.floor(speakingMinutes);
  const speakingTimeSec = Math.round((speakingMinutes - speakingTimeMin) * 60);
  
  const totalWordLength = wordList.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = words > 0 ? +(totalWordLength / words).toFixed(1) : 0;
  
  const lowerWords = wordList.map(w => w.toLowerCase());
  const uniqueWords = new Set(lowerWords).size;
  
  const longestWord = wordList.reduce((longest, w) => w.length > longest.length ? w : longest, '');
  
  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    lines,
    readingTimeMin,
    readingTimeSec,
    speakingTimeMin,
    speakingTimeSec,
    avgWordLength,
    uniqueWords,
    longestWord,
  };
}

function getKeywordDensity(text: string): Keyword[] {
  const words = text.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  if (words.length === 0) return [];
  
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({
      word,
      count,
      percentage: ((count / words.length) * 100).toFixed(1) + '%',
    }));
}

export default function TextAnalyzerPage() {
  const [input, setInput] = useState('');
  const [showKeywords, setShowKeywords] = useState(true);
  
  const stats = useMemo(() => analyzeText(input), [input]);
  const keywords = useMemo(() => getKeywordDensity(input), [input]);
  
  const clear = useCallback(() => setInput(''), []);
  
  const copyStats = useCallback(() => {
    const s = stats;
    const report = [
      '=== Text Analysis Report ===',
      '',
      `Characters:           ${s.characters.toLocaleString()}`,
      `Characters (no space): ${s.charactersNoSpaces.toLocaleString()}`,
      `Words:                ${s.words.toLocaleString()}`,
      `Sentences:            ${s.sentences.toLocaleString()}`,
      `Paragraphs:           ${s.paragraphs.toLocaleString()}`,
      `Lines:                ${s.lines.toLocaleString()}`,
      '',
      `Reading Time:         ${s.readingTimeMin}m ${s.readingTimeSec}s`,
      `Speaking Time:        ${s.speakingTimeMin}m ${s.speakingTimeSec}s`,
      '',
      `Avg Word Length:      ${s.avgWordLength} chars`,
      `Unique Words:         ${s.uniqueWords.toLocaleString()}`,
      `Longest Word:         "${s.longestWord}"`,
      '',
      '=== Top Keywords ===',
      ...keywords.slice(0, 10).map(k => `${k.word}: ${k.count} (${k.percentage})`),
    ].join('\n');
    
    navigator.clipboard.writeText(report).then(
      () => toast.success('Analysis copied!'),
      () => toast.error('Copy failed')
    );
  }, [stats, keywords]);
  
  const downloadReport = useCallback(() => {
    const s = stats;
    const report = [
      '=== Text Analysis Report ===',
      '',
      `Characters:           ${s.characters.toLocaleString()}`,
      `Characters (no space): ${s.charactersNoSpaces.toLocaleString()}`,
      `Words:                ${s.words.toLocaleString()}`,
      `Sentences:            ${s.sentences.toLocaleString()}`,
      `Paragraphs:           ${s.paragraphs.toLocaleString()}`,
      `Lines:                ${s.lines.toLocaleString()}`,
      '',
      `Reading Time:         ${s.readingTimeMin}m ${s.readingTimeSec}s`,
      `Speaking Time:        ${s.speakingTimeMin}m ${s.speakingTimeSec}s`,
      '',
      `Avg Word Length:      ${s.avgWordLength} chars`,
      `Unique Words:         ${s.uniqueWords.toLocaleString()}`,
      `Longest Word:         "${s.longestWord}"`,
      '',
      '=== Top Keywords ===',
      ...keywords.slice(0, 20).map(k => `${k.word}: ${k.count} (${k.percentage})`),
    ].join('\n');
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text-analysis-report.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  }, [stats, keywords]);
  
  const statCards = [
    { label: 'Characters', value: stats.characters.toLocaleString(), icon: Type, suffix: null },
    { label: 'Characters (no spaces)', value: stats.charactersNoSpaces.toLocaleString(), icon: AlignLeft, suffix: null },
    { label: 'Words', value: stats.words.toLocaleString(), icon: FileText, suffix: null },
    { label: 'Sentences', value: stats.sentences.toLocaleString(), icon: BookOpen, suffix: null },
    { label: 'Paragraphs', value: stats.paragraphs.toLocaleString(), icon: BarChart3, suffix: null },
    { label: 'Lines', value: stats.lines.toLocaleString(), icon: Hash, suffix: null },
    {
      label: 'Reading Time',
      value: stats.readingTimeMin > 0 ? `${stats.readingTimeMin}m ${stats.readingTimeSec}s` : '< 1m',
      icon: Clock,
      suffix: stats.words > 0 ? `(${stats.words} words @ 238 wpm)` : null,
    },
    {
      label: 'Speaking Time',
      value: stats.speakingTimeMin > 0 ? `${stats.speakingTimeMin}m ${stats.speakingTimeSec}s` : '< 1m',
      icon: Clock,
      suffix: stats.words > 0 ? `(${stats.words} words @ 150 wpm)` : null,
    },
    { label: 'Avg Word Length', value: stats.avgWordLength.toString(), icon: Type, suffix: 'chars' },
    { label: 'Unique Words', value: stats.uniqueWords.toLocaleString(), icon: BarChart3, suffix: null },
    { label: 'Longest Word', value: stats.longestWord ? `"${stats.longestWord}"` : '—', icon: FileText, suffix: stats.longestWord ? `${stats.longestWord.length} chars` : null },
  ];
  
  return (
    <ToolLayout
      title="Text Analyzer"
      description="Analyze text with word count, character count, reading time, keyword density, and more. Paste, type, or load a file — updates live."
    >
      {/* Input area */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Input Text</h2>
          <div className="flex items-center gap-2">
            <label className="btn-secondary flex items-center gap-1.5 text-xs cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Load File
              <input
                type="file"
                accept=".txt,.md,.csv,.json,.html,.css,.js,.ts,.tsx,.jsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const content = ev.target?.result;
                    if (typeof content === 'string') {
                      setInput(content);
                      toast.success(`Loaded ${file.name}`);
                    }
                  };
                  reader.onerror = () => toast.error('Failed to read file');
                  reader.readAsText(file);
                }}
              />
            </label>
            <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Clear">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste or type your text here to analyze...&#10;&#10;This tool counts words, characters, sentences, and more.&#10;It also estimates reading time and shows keyword density."
          className="input-field w-full h-56 resize-y font-mono text-sm"
          spellCheck={false}
        />
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Tip: You can also paste text from anywhere or load a text file.</span>
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-slate-400">{card.label}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">
              {card.value}
            </div>
            {card.suffix && (
              <div className="text-[10px] text-slate-500 mt-0.5">{card.suffix}</div>
            )}
          </div>
        ))}
      </div>
      
      {/* Actions */}
      {input.trim() && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={copyStats} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Copy className="w-4 h-4" />
            Copy Report
          </button>
          <button onClick={downloadReport} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      )}
      
      {/* Keyword density */}
      {keywords.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              Keyword Density
            </h2>
            <button
              onClick={() => setShowKeywords(!showKeywords)}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              {showKeywords ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showKeywords && (
            <div className="space-y-1.5">
              {keywords.map((kw) => (
                <div key={kw.word} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 font-mono w-28 truncate" title={kw.word}>
                    {kw.word}
                  </span>
                  <div className="flex-1 h-6 bg-surface rounded overflow-hidden">
                    <div
                      className="h-full bg-brand-500/60 rounded transition-all duration-300"
                      style={{ width: kw.percentage }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-10 text-right">
                    {kw.count}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums w-12 text-right">
                    {kw.percentage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Usage tips */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-400" />
          How to use the Text Analyzer
        </h3>
        <ul className="text-sm text-slate-400 space-y-1.5 list-disc pl-5">
          <li><strong className="text-slate-300">Reading Time:</strong> Based on 238 words per minute — the average adult reading speed.</li>
          <li><strong className="text-slate-300">Speaking Time:</strong> Based on 150 words per minute — typical presentation/speech pace.</li>
          <li><strong className="text-slate-300">Keyword Density:</strong> Top 20 keywords excluding common stop words. Useful for SEO analysis.</li>
          <li><strong className="text-slate-300">File Loading:</strong> Supports .txt, .md, .csv, .json, .html, .css, .js, .ts files.</li>
          <li><strong className="text-slate-300">Privacy:</strong> All analysis runs in your browser — no data is ever sent anywhere.</li>
          <li><strong className="text-slate-300">Copy/Download:</strong> Save a full report as text for sharing or documentation.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
