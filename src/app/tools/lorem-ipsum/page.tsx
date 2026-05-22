'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea',
  'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla',
  'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
  'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est',
  'laborum', 'perspiciatis', 'unde', 'omnis', 'iste', 'natus', 'error', 'sit',
  'voluptatem', 'accusantium', 'doloremque', 'laudantium', 'totam', 'rem',
  'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo', 'inventore', 'veritatis',
  'et', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta', 'sunt', 'explicabo',
  'nemo', 'ipsam', 'voluptatem', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
  'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'qui', 'ratione',
  'voluptatem', 'sequi', 'nesciunt', 'neque', 'porro', 'quisquam', 'est',
];

function generateLorem(paras: number, sentencesPerPara: number, startsWithLorem: boolean): string {
  const seed = Date.now();
  // Use a simple seeded random
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };

  const pickWord = (exclude: string[] = []): string => {
    let w: string;
    do {
      w = WORDS[Math.floor(rand() * WORDS.length)];
    } while (exclude.includes(w) && exclude.length < WORDS.length);
    return w;
  };

  const makeSentence = (words: number): string => {
    const w: string[] = [];
    for (let i = 0; i < words; i++) {
      w.push(pickWord(i === 0 ? [] : [w[w.length - 1]]));
    }
    let result = w.join(' ');
    result = result.charAt(0).toUpperCase() + result.slice(1) + '.';
    return result;
  };

  const paragraphs: string[] = [];
  for (let p = 0; p < paras; p++) {
    const sentences: string[] = [];
    for (let s = 0; s < sentencesPerPara; s++) {
      const wordCount = 5 + Math.floor(rand() * 12);
      sentences.push(makeSentence(wordCount));
    }
    if (startsWithLorem && p === 0) {
      sentences[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
    }
    paragraphs.push(sentences.join(' '));
  }

  return paragraphs.join('\n\n');
}

export default function LoremIpsumPage() {
  const [paras, setParas] = useState(3);
  const [sentences, setSentences] = useState(4);
  const [startLorem, setStartLorem] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState('');

  // Defer generation to client-side only
  useMemo(() => {
    if (typeof window !== 'undefined' && !mounted) {
      setMounted(true);
      setText(generateLorem(paras, sentences, startLorem));
    }
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = useCallback(() => {
    setText(generateLorem(paras, sentences, startLorem));
  }, [paras, sentences, startLorem]);

  const copyText = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, [text]);

  const stats = useMemo(() => {
    if (!text) return { words: 0, chars: 0, bytes: 0 };
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const bytes = new Blob([text]).size;
    return { words, chars, bytes };
  }, [text]);

  return (
    <ToolLayout
      title="Lorem Ipsum Generator"
      description="Generate placeholder text for mockups, designs, and prototypes. Customize paragraphs, sentence count, and classic opening."
    >
      {/* Controls */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Paragraphs</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={20}
                value={paras}
                onChange={(e) => setParas(Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-8 text-right">{paras}</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Sentences per paragraph</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={15}
                value={sentences}
                onChange={(e) => setSentences(Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-white font-mono text-sm w-8 text-right">{sentences}</span>
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={startLorem}
                onChange={(e) => setStartLorem(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-slate-300">Start with &ldquo;Lorem ipsum dolor sit amet...&rdquo;</span>
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={generate} className="btn-primary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-4 h-4" />
            Generate
          </button>
          {text && (
            <button onClick={copyText} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Copy className="w-4 h-4" />
              Copy All
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {text && (
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <AlignLeft className="w-3 h-3" />
            {stats.words.toLocaleString()} words
          </span>
          <span>{stats.chars.toLocaleString()} characters</span>
          <span>{stats.bytes.toLocaleString()} bytes</span>
          <span>{paras} paragraph{paras !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Output */}
      <div className="card">
        <div className="bg-surface rounded-lg p-6 border border-slate-700/50 max-h-96 overflow-y-auto">
          {text ? (
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-serif">
              {text}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">
              Click &ldquo;Generate&rdquo; to create placeholder text
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
