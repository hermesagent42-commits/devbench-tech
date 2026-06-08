'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Trash2, ArrowRightLeft, Volume2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────── NATO Phonetic Alphabet Map ─────────── */

const NATO: Record<string, string> = {
  'A': 'Alpha',    'B': 'Bravo',     'C': 'Charlie',
  'D': 'Delta',    'E': 'Echo',      'F': 'Foxtrot',
  'G': 'Golf',     'H': 'Hotel',     'I': 'India',
  'J': 'Juliet',   'K': 'Kilo',      'L': 'Lima',
  'M': 'Mike',     'N': 'November',  'O': 'Oscar',
  'P': 'Papa',     'Q': 'Quebec',    'R': 'Romeo',
  'S': 'Sierra',   'T': 'Tango',     'U': 'Uniform',
  'V': 'Victor',   'W': 'Whiskey',   'X': 'X-ray',
  'Y': 'Yankee',   'Z': 'Zulu',
  '0': 'Zero',     '1': 'One',       '2': 'Two',
  '3': 'Three',    '4': 'Four',      '5': 'Five',
  '6': 'Six',      '7': 'Seven',     '8': 'Eight',
  '9': 'Nine',
};

// Reverse map for decoding
const NATO_REVERSE: Record<string, string> = {};
for (const [char, word] of Object.entries(NATO)) {
  NATO_REVERSE[word.toLowerCase()] = char;
}

// IPA pronunciation guide
const NATO_PRONUNCIATION: Record<string, string> = {
  'A': 'AL-fah',       'B': 'BRAH-voh',      'C': 'CHAR-lee',
  'D': 'DELL-tah',     'E': 'ECK-oh',        'F': 'FOKS-trot',
  'G': 'GOLF',         'H': 'hoh-TEL',       'I': 'IN-dee-ah',
  'J': 'JEW-lee-ETT',  'K': 'KEY-loh',       'L': 'LEE-mah',
  'M': 'MIKE',         'N': 'no-VEM-ber',     'O': 'OSS-cah',
  'P': 'pah-PAH',      'Q': 'keh-BECK',      'R': 'ROW-me-oh',
  'S': 'see-AIR-rah',  'T': 'TANG-go',       'U': 'YOU-nee-form',
  'V': 'VIK-tah',      'W': 'WISS-key',      'X': 'ECKS-ray',
  'Y': 'YANG-key',     'Z': 'ZOO-loo',
};

export default function NatoPhoneticPage() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text-to-nato' | 'nato-to-text'>('text-to-nato');

  // Derive output
  const output = useMemo(() => {
    if (!input.trim()) return '';
    if (mode === 'text-to-nato') {
      return input.split('').map((char) => {
        const upper = char.toUpperCase();
        if (NATO[upper]) return NATO[upper];
        if (char === ' ') return ' ';
        if (char === '-') return '-';
        if (char === '_') return '_';
        if (char === '.') return '.';
        return char; // pass through unknown chars
      }).join(' ');
    } else {
      // NATO → text: expect space-separated NATO words
      return input.split(/\s+/).map((word) => {
        const lower = word.toLowerCase();
        if (NATO_REVERSE[lower]) return NATO_REVERSE[lower];
        // Also try matching first letter if it was abbreviated
        const upperFirst = word.charAt(0).toUpperCase();
        if (NATO[upperFirst] && NATO[upperFirst].toLowerCase().startsWith(lower)) {
          return upperFirst;
        }
        if (word === 'space' || word === 'Space') return ' ';
        return '?';
      }).join('');
    }
  }, [input, mode]);

  // Tokenize output for visual display
  const tokens = useMemo(() => {
    if (!output) return [];
    if (mode === 'text-to-nato') {
      return output.split(' ').map((w, i) => ({ word: w, char: input[i] || '', isPunct: /^[ .\-_]$/.test(w) }));
    }
    return [];
  }, [output, mode, input]);

  // Copy handlers
  const copyOutput = useCallback(() => {
    if (!output) { toast.error('Nothing to copy'); return; }
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [output]);

  const copyDashed = useCallback(() => {
    if (!output) { toast.error('Nothing to copy'); return; }
    const dashed = output.replace(/\s+/g, '-');
    navigator.clipboard.writeText(dashed).then(
      () => toast.success('Copied dashed format!'),
      () => toast.error('Failed to copy'),
    );
  }, [output]);

  // Swap direction
  const swapDirection = useCallback(() => {
    if (mode === 'text-to-nato') {
      setMode('nato-to-text');
      setInput(output || input);
    } else {
      setMode('text-to-nato');
      setInput(output || input);
    }
  }, [mode, output, input]);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  // Add a quick tile click
  const addChar = useCallback((char: string) => {
    setInput((prev) => prev + char);
    setMode('text-to-nato');
  }, []);

  // Detect if output is valid (for nato-to-text error handling)
  const hasError = useMemo(() => {
    if (mode !== 'nato-to-text' || !input.trim()) return false;
    const words = input.trim().split(/\s+/);
    return words.some((w) => {
      const lower = w.toLowerCase();
      if (lower === 'space' || lower === '') return false;
      if (NATO_REVERSE[lower]) return false;
      // check for partial match
      const upperFirst = w.charAt(0).toUpperCase();
      return !NATO[upperFirst];
    });
  }, [mode, input]);

  return (
    <ToolLayout
      title="NATO Phonetic Alphabet Translator"
      description="Translate text to the NATO phonetic alphabet (Alpha, Bravo, Charlie...) and decode back. Perfect for reading codes, tokens, or hostnames over the phone."
      controls={
        <div className="flex items-center gap-2 w-full flex-wrap">
          <button
            onClick={swapDirection}
            className="btn btn-sm flex items-center gap-1.5 bg-surface-lighter border border-slate-600 hover:border-slate-500 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Swap Direction
          </button>
        </div>
      }
    >
      {/* Direction toggle */}
      <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-surface-light border border-slate-700/50">
        <span className={`text-sm font-medium px-3 py-1 rounded-full transition-colors cursor-pointer ${
          mode === 'text-to-nato' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'
        }`} onClick={() => setMode('text-to-nato')}>
          Text → NATO
        </span>
        <button
          onClick={swapDirection}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Swap direction"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
        <span className={`text-sm font-medium px-3 py-1 rounded-full transition-colors cursor-pointer ${
          mode === 'nato-to-text' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'
        }`} onClick={() => setMode('nato-to-text')}>
          NATO → Text
        </span>
      </div>

      {/* Input / Output grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            {mode === 'text-to-nato' ? 'Text Input' : 'NATO Phonetic Input'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'text-to-nato'
                ? 'Type text, codes, or hostnames — e.g. "API-KEY-42X"...'
                : 'Type NATO words separated by spaces — e.g. "Alpha Bravo Charlie"...'
            }
            className="w-full h-40 bg-surface-light border border-slate-700 rounded-xl p-4 text-slate-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 placeholder:text-slate-600 transition-all"
            spellCheck={false}
          />
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-slate-500">
              {input.length} character{input.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1" />
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-400">
              {mode === 'text-to-nato' ? 'NATO Phonetic Output' : 'Decoded Text'}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={copyOutput}
                disabled={!output}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              {mode === 'text-to-nato' && (
                <button
                  onClick={copyDashed}
                  disabled={!output}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3 h-3" />
                  Copy dashed
                </button>
              )}
            </div>
          </div>
          <div className={`w-full h-40 bg-surface-light border rounded-xl p-4 text-slate-200 font-mono text-sm overflow-auto transition-all ${
            hasError
              ? 'border-red-500/50 text-red-400'
              : output
              ? 'border-slate-700'
              : 'border-slate-700 text-slate-600'
          }`}>
            {hasError
              ? '⚠️ Some words are not valid NATO codewords. Use full words like "Alpha", "Bravo", etc.'
              : output || (
              <span className="text-slate-600">
                {mode === 'text-to-nato'
                  ? 'NATO phonetic output will appear here...'
                  : 'Decoded text will appear here...'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual NATO cards (only in text-to-nato mode) */}
      {mode === 'text-to-nato' && tokens.length > 0 && (
        <div className="card mb-8">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-brand-400" />
            Phonetic Breakdown
          </h3>
          <div className="flex flex-wrap gap-2">
            {tokens.map((token, i) => (
              <div
                key={i}
                className={`inline-flex flex-col items-center rounded-lg border transition-all min-w-[70px] ${
                  token.isPunct
                    ? 'bg-surface-lighter border-slate-700/30 py-2 px-3'
                    : 'bg-surface-light border-brand-500/20 hover:border-brand-500/40 py-3 px-4'
                }`}
              >
                <span className={`text-lg font-bold ${
                  token.isPunct ? 'text-slate-400' : 'text-brand-400'
                }`}>
                  {token.isPunct
                    ? token.word === ' ' ? '␣' : token.word
                    : token.word}
                </span>
                {!token.isPunct && token.char && (
                  <span className="text-[10px] uppercase text-slate-500 mt-1 font-mono">
                    {token.char}
                  </span>
                )}
                {!token.isPunct && NATO_PRONUNCIATION[token.char.toUpperCase()] && (
                  <span className="text-[10px] text-slate-600 mt-0.5 italic">
                    {NATO_PRONUNCIATION[token.char.toUpperCase()]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NATO reference table */}
      <details className="group">
        <summary className="text-sm font-medium text-slate-400 cursor-pointer hover:text-slate-300 transition-colors select-none mb-4">
          NATO Phonetic Alphabet Reference Table
        </summary>
        
        {/* Letters */}
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Letters A–Z</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-6">
          {Object.entries(NATO)
            .filter(([char]) => /^[A-Z]$/.test(char))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([char, word]) => (
              <div
                key={char}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-light border border-slate-700/50 hover:border-brand-500/30 transition-colors cursor-pointer group/ref"
                onClick={() => addChar(char)}
                title={`Click to add '${char}' to input`}
              >
                <span className="w-7 h-7 rounded-md bg-brand-500/20 text-brand-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {char}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-slate-200 font-medium truncate">{word}</span>
                  <span className="text-[10px] text-slate-500 italic truncate">{NATO_PRONUNCIATION[char]}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Numbers */}
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Numbers 0–9</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {Object.entries(NATO)
            .filter(([char]) => /^[0-9]$/.test(char))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([char, word]) => (
              <div
                key={char}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-light border border-slate-700/50 hover:border-brand-500/30 transition-colors cursor-pointer group/ref"
                onClick={() => addChar(char)}
                title={`Click to add '${char}' to input`}
              >
                <span className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {char}
                </span>
                <span className="text-sm text-slate-200 font-medium">{word}</span>
              </div>
            ))}
        </div>
      </details>

      {/* Usage tips */}
      <div className="mt-8 p-4 rounded-xl bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">💡 Pro Tips</h3>
        <ul className="space-y-1.5 text-sm text-slate-400">
          <li>
            <span className="font-mono text-brand-400">NATO Phonetic</span> is the international standard (ICAO, ITU, NATO) — widely used in aviation, military, and IT support.
          </li>
          <li>
            Use <span className="text-slate-300 font-mono">Copy dashed</span> to get kebab-case output like <span className="text-slate-300 font-mono">Alpha-Bravo-Charlie</span> — great for filenames or identifiers.
          </li>
          <li>
            Click any letter/number in the reference table to add it to your input — each card shows the <span className="text-slate-500 italic">pronunciation</span> too.
          </li>
          <li>
            The <span className="text-slate-300">Swap Direction</span> button lets you decode NATO words back to text — useful when someone spells something phonetically at you.
          </li>
        </ul>
      </div>
    </ToolLayout>
  );
}
