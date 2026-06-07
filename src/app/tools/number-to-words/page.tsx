'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];

function numberToWordsChunk(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundreds > 0) {
    parts.push(ONES[hundreds] + ' hundred');
  }
  if (remainder > 0) {
    if (remainder < 10) {
      parts.push(ONES[remainder]);
    } else if (remainder < 20) {
      parts.push(TEENS[remainder - 10]);
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      if (ones > 0) {
        parts.push(TENS[tens] + '-' + ONES[ones]);
      } else {
        parts.push(TENS[tens]);
      }
    }
  }
  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'zero';
  const isNegative = n < 0;
  let num = Math.abs(n);
  const parts: string[] = [];
  let scaleIndex = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const chunkWords = numberToWordsChunk(chunk);
      const prefix = scaleIndex > 0 ? chunkWords + ' ' + SCALES[scaleIndex] : chunkWords;
      parts.unshift(prefix);
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }
  let result = parts.join(', ');
  if (isNegative) {
    result = 'negative ' + result;
  }
  return result;
}

function numberToWords(num: number): string {
  if (!Number.isFinite(num)) return 'Infinity';
  if (Number.isInteger(num)) return integerToWords(num);
  const str = num.toString();
  const [intPart, fracPart] = str.split('.');
  const intWords = integerToWords(parseInt(intPart, 10));
  if (!fracPart || fracPart === '0') return intWords;
  const fracDigits = fracPart.split('');
  const fracWords = fracDigits
    .map((d) => ONES[parseInt(d, 10)])
    .filter(Boolean)
    .join(' ');
  return intWords + ' point ' + fracWords;
}

function numberToCurrency(n: number): string {
  if (!Number.isFinite(n)) return 'Infinity';
  const isNegative = n < 0;
  const absNum = Math.abs(n);
  const dollars = Math.floor(absNum);
  const cents = Math.round((absNum - dollars) * 100);
  const dollarWords = integerToWords(dollars);
  const dollarLabel = dollars === 1 ? 'dollar' : 'dollars';
  let result = dollarWords + ' ' + dollarLabel;
  if (cents > 0) {
    const centWords = integerToWords(cents);
    const centLabel = cents === 1 ? 'cent' : 'cents';
    result += ' and ' + centWords + ' ' + centLabel;
  }
  if (isNegative) {
    result = 'negative ' + result;
  }
  return result;
}

function numberToOrdinal(n: number): string {
  if (!Number.isInteger(n) || !Number.isFinite(n)) return 'Not an integer';
  const absN = Math.abs(n);
  const words = integerToWords(absN);
  const lastWord = words.split(' ').pop() || '';
  const penultimateWord = words.split(' ').slice(-2, -1)[0] || '';
  let ordinal = words;
  if (lastWord === 'one') ordinal = words.replace(/\bone$/, 'first');
  else if (lastWord === 'two') ordinal = words.replace(/\btwo$/, 'second');
  else if (lastWord === 'three') ordinal = words.replace(/\bthree$/, 'third');
  else if (lastWord === 'five') ordinal = words.replace(/\bfive$/, 'fifth');
  else if (lastWord === 'eight') ordinal = words.replace(/\beight$/, 'eighth');
  else if (lastWord === 'nine') ordinal = words.replace(/\bnine$/, 'ninth');
  else if (lastWord === 'twelve') ordinal = words.replace(/\btwelve$/, 'twelfth');
  else if (penultimateWord === 'twenty' && lastWord === 'one') ordinal = words.replace(/\btwenty-one$/, 'twenty-first');
  else if (penultimateWord === 'twenty' && lastWord === 'two') ordinal = words.replace(/\btwenty-two$/, 'twenty-second');
  else if (penultimateWord === 'twenty' && lastWord === 'three') ordinal = words.replace(/\btwenty-three$/, 'twenty-third');
  else if (penultimateWord === 'twenty' && lastWord === 'five') ordinal = words.replace(/\btwenty-five$/, 'twenty-fifth');
  else if (penultimateWord === 'twenty' && lastWord === 'eight') ordinal = words.replace(/\btwenty-eight$/, 'twenty-eighth');
  else if (penultimateWord === 'twenty' && lastWord === 'nine') ordinal = words.replace(/\btwenty-nine$/, 'twenty-ninth');
  else if (lastWord === 'y' || lastWord.endsWith('y')) {
    ordinal = words.slice(0, -1) + 'ieth';
  } else {
    ordinal = words + 'th';
  }
  if (n < 0) {
    ordinal = 'negative ' + ordinal;
  }
  return ordinal;
}

export default function NumberToWordsPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'cardinal' | 'currency' | 'ordinal'>('cardinal');
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(() => {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) {
      setOutput('');
      return;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      setError('Please enter a valid number (e.g., 42, 3.14, -100)');
      setOutput('');
      return;
    }
    if (mode === 'ordinal' && (!Number.isInteger(num) || !Number.isFinite(num))) {
      setError('Ordinal numbers must be integers (e.g., 1, 42, -7)');
      setOutput('');
      return;
    }
    try {
      switch (mode) {
        case 'cardinal':
          setOutput(numberToWords(num));
          break;
        case 'currency':
          setOutput(numberToCurrency(num));
          break;
        case 'ordinal':
          setOutput(numberToOrdinal(num));
          break;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Conversion error';
      setError(message);
      setOutput('');
    }
  }, [input, mode]);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, [output]);

  const clear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
  }, []);

  const tryExample = useCallback((example: string) => {
    setInput(example);
    setError(null);
    setOutput('');
  }, []);

  return (
    <ToolLayout
      title="Number to Words Converter"
      description="Convert numbers to English words — cardinal, ordinal, and currency (dollars). Supports negative numbers, decimals, and numbers up to quadrillions."
    >
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { id: 'cardinal' as const, label: 'Cardinal', desc: 'one, two, three...' },
          { id: 'currency' as const, label: 'Currency', desc: 'dollars and cents' },
          { id: 'ordinal' as const, label: 'Ordinal', desc: 'first, second, third...' },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setOutput(''); setError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m.id
                ? 'bg-brand-500 text-white'
                : 'bg-surface text-slate-300 hover:bg-surface-light border border-slate-700/50'
            }`}
          >
            <div>{m.label}</div>
            <div className="text-[10px] opacity-60 font-mono">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Enter a Number</h2>
          <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOutput(''); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') convert(); }}
          placeholder="e.g., 1234567, 3.14, -42, 1999"
          className="input-field w-full text-lg"
          spellCheck={false}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={convert} className="btn-primary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-4 h-4" />
            Convert
          </button>
          <span className="text-xs text-slate-500">Press Enter to convert</span>
        </div>
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Output */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Result</h2>
          {output && (
            <button onClick={copyOutput} className="text-slate-400 hover:text-brand-400 transition-colors" title="Copy">
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
        {output ? (
          <p className="text-xl font-medium text-brand-300 capitalize leading-relaxed">
            {output}
          </p>
        ) : (
          <p className="text-slate-500 text-sm">
            Enter a number and click Convert to see the word form
          </p>
        )}
      </div>

      {/* Examples */}
      <div className="card">
        <h3 className="text-white font-semibold text-sm mb-3">Try an Example</h3>
        <div className="flex flex-wrap gap-2">
          {mode === 'cardinal' && (
            <>
              <button onClick={() => tryExample('42')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">42</button>
              <button onClick={() => tryExample('1000')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">1,000</button>
              <button onClick={() => tryExample('1234567')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">1,234,567</button>
              <button onClick={() => tryExample('-273')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">-273</button>
              <button onClick={() => tryExample('3.14159')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">3.14159</button>
              <button onClick={() => tryExample('0.5')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">0.5</button>
              <button onClick={() => tryExample('1000000000')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">1,000,000,000</button>
            </>
          )}
          {mode === 'currency' && (
            <>
              <button onClick={() => tryExample('42.99')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">42.99</button>
              <button onClick={() => tryExample('1000')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">1,000.00</button>
              <button onClick={() => tryExample('-19.50')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">-19.50</button>
              <button onClick={() => tryExample('0.05')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">0.05</button>
              <button onClick={() => tryExample('999999.99')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">999,999.99</button>
            </>
          )}
          {mode === 'ordinal' && (
            <>
              <button onClick={() => tryExample('1')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">1st</button>
              <button onClick={() => tryExample('42')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">42nd</button>
              <button onClick={() => tryExample('100')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">100th</button>
              <button onClick={() => tryExample('2026')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">2026th</button>
              <button onClick={() => tryExample('3')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">3rd</button>
              <button onClick={() => tryExample('21')} className="badge-secondary cursor-pointer hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/30 transition-colors">21st</button>
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
