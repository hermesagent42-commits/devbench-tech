'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Trash2, Upload, FileText, Type, Hash, BookOpen,
  Clock, Mic, BarChart3, ListOrdered, AlignLeft, Check, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STOP_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at',
  'this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what',
  'so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take',
  'people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also',
  'back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us',
  'is','was','are','been','being','has','had','were','did','does','doing','each','few','more','must','own','same','too','very',
]);

interface Stats {
  words: number;
  charsWithSpaces: number;
  charsWithoutSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  uniqueWords: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  longestWord: string;
  avgWordLength: number;
}

interface KeywordEntry { word: string; count: number; percentage: number; }
interface CharFrequency { char: string; count: number; }

function countChineseChars(text: string): number {
  const m = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return m ? m.length : 0;
}
function countJapaneseChars(text: string): number {
  const m = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
  return m ? m.length : 0;
}
function countKoreanChars(text: string): number {
  const m = text.match(/[\uac00-\ud7af]/g);
  return m ? m.length : 0;
}

function computeStats(text: string): Stats {
  if (!text.trim()) {
    return { words: 0, charsWithSpaces: 0, charsWithoutSpaces: 0, sentences: 0,
      paragraphs: 0, lines: 0, uniqueWords: 0, readingTimeMinutes: 0,
      speakingTimeMinutes: 0, longestWord: '', avgWordLength: 0 };
  }
  const charsWithSpaces = text.length;
  const charsWithoutSpaces = text.replace(/\s/g, '').length;
  const lines = text.split('\n').filter(l => l.trim().length > 0).length;
  const sentences = text.split(/[.!?]+[\s\n]|[.!?]+$/).filter(s => s.trim().length > 0).length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const effectiveParagraphs = paragraphs > 1 ? paragraphs : (lines > 1 ? 1 : 0);
  const rawWords = text.trim().split(/\s+/);
  const words = rawWords.length;
  const lowerWords = rawWords.map(w => w.toLowerCase().replace(/^[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+|[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+$/gi, ''));
  const uniqueWords = new Set(lowerWords.filter(w => w.length > 0)).size;
  const longestWord = rawWords.reduce((longest, w) => {
    const cleaned = w.replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '');
    return cleaned.length > longest.length ? cleaned : longest;
  }, '');
  const totalWordChars = rawWords.reduce((sum, w) => sum + w.replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '').length, 0);
  const avgWordLength = words > 0 ? +(totalWordChars / words).toFixed(1) : 0;
  const cjkChars = countChineseChars(text) + countJapaneseChars(text) + countKoreanChars(text);
  const nonCjkWords = Math.max(0, words - Math.ceil(cjkChars / 2));
  const readingTimeMinutes = Math.max(1, Math.ceil((nonCjkWords / 238 + cjkChars / 500) * 60) / 60);
  const speakingTimeMinutes = Math.max(1, Math.ceil((nonCjkWords / 150 + cjkChars / 350) * 60) / 60);
  return { words, charsWithSpaces, charsWithoutSpaces, sentences,
    paragraphs: effectiveParagraphs, lines, uniqueWords,
    readingTimeMinutes, speakingTimeMinutes, longestWord, avgWordLength };
}

function computeKeywordDensity(text: string, limit = 15): KeywordEntry[] {
  if (!text.trim()) return [];
  const words = text.toLowerCase().match(/[\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+/g);
  if (!words || words.length === 0) return [];
  const total = words.length;
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (STOP_WORDS.has(w) && /^[a-z]+$/.test(w)) continue;
    if (w.length < 2) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([word, count]) => ({ word, count, percentage: +((count / total) * 100).toFixed(1) }));
}

function computeCharFrequency(text: string): CharFrequency[] {
  if (!text.trim()) return [];
  const chars = text.replace(/\s/g, '');
  if (chars.length === 0) return [];
  const freq: Record<string, number> = {};
  for (const ch of chars) freq[ch] = (freq[ch] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 26)
    .map(([char, count]) => ({ char, count }));
}

function formatTime(minutes: number): string {
  if (minutes < 1) return `${Math.ceil(minutes * 60)} sec`;
  if (minutes === 1) return '1 min';
  return `${Math.ceil(minutes)} min`;
}

export default function WordCounterPage() {
  const [input, setInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'keywords' | 'chars'>('stats');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => computeStats(input), [input]);
  const keywords = useMemo(() => computeKeywordDensity(input), [input]);
  const charFrequency = useMemo(() => computeCharFrequency(input), [input]);

  const handleClear = useCallback(() => { setInput(''); setFileName(null); }, []);

  const handleCopyStats = useCallback(async () => {
    const text = [
      'Text Statistics',
      '----------------',
      `Words:              ${stats.words.toLocaleString()}`,
      `Characters (all):   ${stats.charsWithSpaces.toLocaleString()}`,
      `Characters (no ws): ${stats.charsWithoutSpaces.toLocaleString()}`,
      `Sentences:          ${stats.sentences.toLocaleString()}`,
      `Paragraphs:         ${stats.paragraphs.toLocaleString()}`,
      `Lines:              ${stats.lines.toLocaleString()}`,
      `Unique words:       ${stats.uniqueWords.toLocaleString()}`,
      `Avg word length:    ${stats.avgWordLength}`,
      `Longest word:       "${stats.longestWord}"`,
      `Reading time:       ${formatTime(stats.readingTimeMinutes)}`,
      `Speaking time:      ${formatTime(stats.speakingTimeMinutes)}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Stats copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy'); }
  }, [stats]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => { setInput(evt.target?.result as string); };
    reader.onerror = () => { toast.error('Failed to read file'); };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => { setInput(evt.target?.result as string); };
    reader.onerror = () => { toast.error('Failed to read file'); };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const hasContent = input.trim().length > 0;
  const maxCharFreq = charFrequency.length > 0 ? Math.max(...charFrequency.map(c => c.count)) : 1;

  const StatCard = ({ icon: Icon, label, value, color = 'text-brand-400' }: {
    icon: React.ElementType; label: string; value: string | number; color?: string;
  }) => (
    <div className="bg-surface rounded-lg border border-slate-700/50 p-4 flex items-center gap-3 hover:border-slate-600 transition-colors">
      <div className={`w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-white font-mono">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Word Counter"
      description="Real-time word, character, sentence & paragraph counts with reading time, keyword density, and character frequency."
    >
      <div className="card mb-6" onDrop={handleDrop} onDragOver={handleDragOver}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-white font-semibold text-sm flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-400" />Text Input
          </label>
          <div className="flex items-center gap-2">
            {input.length > 0 && <span className="text-xs text-slate-500 font-mono">{input.length.toLocaleString()} chars</span>}
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1" title="Upload file">
              <Upload className="w-3.5 h-3.5" />Upload
            </button>
            {hasContent && (
              <button onClick={handleClear} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {fileName && (
          <div className="mb-3 bg-brand-500/10 border border-brand-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-brand-400" />
            <span className="text-brand-300">{fileName}</span>
            <button onClick={() => { setFileName(null); fileInputRef.current?.click(); }} className="ml-auto text-xs text-brand-400 hover:text-brand-300">Change</button>
          </div>
        )}
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Paste or type your text here...&#10;&#10;Or drag & drop a file."
          className="input-field w-full h-52 resize-y font-mono text-sm" spellCheck={false} />
        <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden"
          accept=".txt,.md,.csv,.json,.html,.css,.js,.ts,.jsx,.tsx,.py,.rs,.go,.rb,.java,.c,.cpp,.h,.xml,.yaml,.yml,.toml,.log,.env,.sh,.bash,.sql,.graphql" />
      </div>

      {hasContent && (<>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {(['stats','keywords','chars'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'bg-surface text-slate-400 border border-slate-700/50 hover:text-white'}`}>
                {tab === 'stats' && <><BarChart3 className="w-3.5 h-3.5 inline mr-1" />Overview</>}
                {tab === 'keywords' && <><TrendingUp className="w-3.5 h-3.5 inline mr-1" />Keywords</>}
                {tab === 'chars' && <><ListOrdered className="w-3.5 h-3.5 inline mr-1" />Characters</>}
              </button>
            ))}
          </div>
          {activeTab === 'stats' && (
            <button onClick={handleCopyStats} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20'}`}>
              {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy Stats</>}
            </button>
          )}
        </div>

        {activeTab === 'stats' && (<>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Hash} label="Words" value={stats.words} color="text-blue-400" />
            <StatCard icon={Type} label="Characters" value={stats.charsWithSpaces} color="text-purple-400" />
            <StatCard icon={AlignLeft} label="Chars (no spaces)" value={stats.charsWithoutSpaces} color="text-purple-300" />
            <StatCard icon={BookOpen} label="Sentences" value={stats.sentences} color="text-emerald-400" />
            <StatCard icon={FileText} label="Paragraphs" value={stats.paragraphs} color="text-amber-400" />
            <StatCard icon={ListOrdered} label="Lines" value={stats.lines} color="text-cyan-400" />
            <StatCard icon={Clock} label="Reading time" value={formatTime(stats.readingTimeMinutes)} color="text-rose-400" />
            <StatCard icon={Mic} label="Speaking time" value={formatTime(stats.speakingTimeMinutes)} color="text-pink-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-brand-400" />Word Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Unique words</span><span className="text-white font-mono text-sm font-semibold">{stats.uniqueWords.toLocaleString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Avg word length</span><span className="text-white font-mono text-sm font-semibold">{stats.avgWordLength} chars</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Longest word</span><span className="text-brand-300 font-mono text-sm font-semibold max-w-[200px] truncate" title={stats.longestWord}>&ldquo;{stats.longestWord}&rdquo; ({stats.longestWord.length} chars)</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Lexical diversity</span><span className="text-white font-mono text-sm font-semibold">{stats.words > 0 ? ((stats.uniqueWords / stats.words) * 100).toFixed(1) : 0}%</span></div>
              </div>
            </div>
            <div className="card">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-400" />Time Estimates</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1"><span className="text-slate-400 text-sm">Reading (238 wpm)</span><span className="text-white font-mono text-sm font-semibold">{formatTime(stats.readingTimeMinutes)}</span></div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.readingTimeMinutes * 20)}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1"><span className="text-slate-400 text-sm">Speaking (150 wpm)</span><span className="text-white font-mono text-sm font-semibold">{formatTime(stats.speakingTimeMinutes)}</span></div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.speakingTimeMinutes * 20)}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </>)}

        {activeTab === 'keywords' && (
          <div className="card mb-6">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-400" />Keyword Density <span className="text-slate-500 font-normal text-xs">(top 15, stop words filtered)</span></h3>
            {keywords.length > 0 ? (
              <div className="space-y-1">
                {keywords.map((kw, i) => (
                  <div key={kw.word} className="flex items-center gap-3 group">
                    <span className="text-xs text-slate-500 font-mono w-6 text-right">{i + 1}</span>
                    <span className="text-sm text-slate-300 font-mono w-28 truncate" title={kw.word}>{kw.word}</span>
                    <div className="flex-1 bg-slate-700/50 rounded-full h-4 overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, kw.percentage * 5)}%`, background: `linear-gradient(90deg, #38bdf8, #818cf8)` }} /></div>
                    <span className="text-xs text-slate-400 font-mono w-8 text-right">{kw.count}</span>
                    <span className="text-xs text-slate-500 font-mono w-12 text-right">{kw.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (<div className="text-center py-8 text-slate-500 text-sm">No keywords to display. Add more content to see keyword density.</div>)}
          </div>
        )}

        {activeTab === 'chars' && (
          <div className="card mb-6">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2"><ListOrdered className="w-4 h-4 text-brand-400" />Character Frequency <span className="text-slate-500 font-normal text-xs">(excluding whitespace, top 26)</span></h3>
            {charFrequency.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {charFrequency.map((cf) => (
                  <div key={cf.char} className="bg-surface rounded-lg border border-slate-700/50 p-3 hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg font-mono font-bold text-white">{cf.char}</span>
                      <span className="text-xs font-mono text-slate-400">{cf.count}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-purple-400 transition-all duration-300" style={{ width: `${(cf.count / maxCharFreq) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : (<div className="text-center py-8 text-slate-500 text-sm">No characters to display. Add more content.</div>)}
          </div>
        )}
      </>)}

      {!hasContent && (
        <div className="card">
          <div className="text-center py-16">
            <Hash className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 text-sm mb-2">Enter or paste text above to see real-time statistics.</p>
            <p className="text-slate-600 text-xs">Word count, character count, reading time, keyword density, and more.</p>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
