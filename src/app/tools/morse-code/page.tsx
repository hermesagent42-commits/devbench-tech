'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Volume2,
  Square,
  ArrowRightLeft,
  Clock,
  Trash2,
  Play,
  Pause,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Direction = 'text-to-morse' | 'morse-to-text';

interface HistoryEntry {
  input: string;
  output: string;
  direction: Direction;
  timestamp: number;
}

// ── Morse code maps ────────────────────────────────────────────────────────

const TEXT_TO_MORSE: Record<string, string> = {
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
  'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
  'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
  'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
  'Y': '-.--',  'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
  '!': '-.-.--', '/': '-..-.',  '(': '-.--.',  ')': '-.--.-',
  '&': '.-...', ':': '---...',  ';': '-.-.-.',  '=': '-...-',
  '+': '.-.-.',  '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '$': '...-..-','@': '.--.-.', ' ': '/',
};

const MORSE_TO_TEXT: Record<string, string> = {};
for (const [char, morse] of Object.entries(TEXT_TO_MORSE)) {
  if (char !== ' ') {
    MORSE_TO_TEXT[morse] = char;
  }
}
// Also add '/' as space for decode
MORSE_TO_TEXT['/'] = ' ';

// ── Audio configuration ────────────────────────────────────────────────────

const DOT_DURATION = 80;    // ms for a dot
const DASH_DURATION = 240;  // ms for a dash (3x dot)
const SYMBOL_GAP = 80;      // gap between dots/dashes
const LETTER_GAP = 240;     // gap between letters (3x dot)
const WORD_GAP = 560;       // gap between words (7x dot)
const FREQUENCY = 700;      // Hz

// ── Helpers ────────────────────────────────────────────────────────────────

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split('')
    .map((char) => TEXT_TO_MORSE[char] ?? (char === '\n' ? ' / ' : char))
    .join(' ')
    .replace(/\s{2,}/g, ' ');
}

function morseToText(morse: string): string {
  // Split by word gaps first
  const words = morse.trim().split(/\s\/\s|\s{3,}/);
  return words
    .map((word) =>
      word
        .split(/\s+/)
        .map((code) => MORSE_TO_TEXT[code] ?? (code === '/' ? ' ' : '?'))
        .join('')
    )
    .join(' ');
}

function isValidMorseInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return true;
  return /^[.\- /]+$/.test(trimmed);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MorseCodePage() {
  const [input, setInput] = useState('');
  const [direction, setDirection] = useState<Direction>('text-to-morse');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(-1); // index in output chars
  const [speedMultiplier, setSpeedMultiplier] = useState(1); // 0.5, 1, 1.5, 2
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isCancelledRef = useRef(false);

  // Derived state
  const output = useMemo(() => {
    if (!input.trim()) return '';
    if (direction === 'text-to-morse') {
      return textToMorse(input);
    }
    // morse-to-text: only convert if input looks valid
    if (isValidMorseInput(input)) {
      return morseToText(input);
    }
    return '⚠️ Invalid Morse code — use only dots (.), dashes (-), spaces, and / for word breaks';
  }, [input, direction]);

  const morseChars = useMemo(() => {
    if (direction === 'text-to-morse') {
      return output.split(' ');
    }
    return input.trim().split(/\s+/);
  }, [output, input, direction]);

  const hasError = !!(direction === 'morse-to-text' && input.trim() && !isValidMorseInput(input));

  // ── Audio playback ───────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    isCancelledRef.current = true;
    playTimeoutRef.current.forEach(clearTimeout);
    playTimeoutRef.current = [];
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    setPlayProgress(-1);
  }, []);

  const playMorse = useCallback(() => {
    const morseToPlay = direction === 'text-to-morse' ? output : input;
    if (!morseToPlay.trim() || hasError) return;

    // Stop any existing playback
    stopPlayback();
    isCancelledRef.current = false;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    // Parse morse into signal sequence
    const signals: Array<{ type: 'dot' | 'dash' | 'letter-gap' | 'word-gap'; char?: string }> = [];
    const parts = morseToPlay.split(/\s/);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '/') {
        // Word gap — but remove the last letter gap since we're adding word gap
        if (signals.length > 0 && signals[signals.length - 1].type === 'letter-gap') {
          signals.pop();
        }
        signals.push({ type: 'word-gap' });
      } else {
        for (const symbol of part) {
          if (symbol === '.') {
            signals.push({ type: 'dot' });
            signals.push({ type: 'letter-gap' }); // will be used as symbol gap
          } else if (symbol === '-') {
            signals.push({ type: 'dash' });
            signals.push({ type: 'letter-gap' }); // will be used as symbol gap
          }
        }
        // Replace last letter-gap with actual letter-gap
        if (signals.length > 0 && signals[signals.length - 1].type === 'letter-gap') {
          signals.pop();
          signals.push({ type: 'letter-gap' });
        }
      }
    }

    setIsPlaying(true);
    setPlayProgress(0);

    let time = 0;
    const factor = speedMultiplier;
    const delays: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, delay: number) => {
      const t = setTimeout(fn, time);
      delays.push(t);
      time += delay / factor;
    };

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      const idx = i;

      schedule(() => {
        if (isCancelledRef.current) return;
        setPlayProgress(idx);
      }, 0);

      if (signal.type === 'dot') {
        schedule(() => {
          if (isCancelledRef.current) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = FREQUENCY;
          gain.gain.value = 0.3;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + DOT_DURATION / 1000 / factor);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        }, 0);
        schedule(() => {}, DOT_DURATION); // silence during dot
      } else if (signal.type === 'dash') {
        schedule(() => {
          if (isCancelledRef.current) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = FREQUENCY;
          gain.gain.value = 0.3;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + DASH_DURATION / 1000 / factor);
          osc.onended = () => { osc.disconnect(); gain.disconnect(); };
        }, 0);
        schedule(() => {}, DASH_DURATION);
      } else if (signal.type === 'word-gap') {
        schedule(() => {}, WORD_GAP);
      } else if (signal.type === 'letter-gap') {
        schedule(() => {}, LETTER_GAP);
      }
    }

    // Mark as done
    schedule(() => {
      if (!isCancelledRef.current) {
        setIsPlaying(false);
        setPlayProgress(-1);
        ctx.close().catch(() => {});
        audioCtxRef.current = null;
      }
    }, 0);

    playTimeoutRef.current = delays;
  }, [output, input, direction, hasError, stopPlayback, speedMultiplier]);

  // ── Clipboard ────────────────────────────────────────────────────────────

  const copyOutput = useCallback(() => {
    if (!output) {
      toast.error('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [output]);

  const copyMorseChar = useCallback((char: string) => {
    navigator.clipboard.writeText(char).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy'),
    );
  }, []);

  // ── History ──────────────────────────────────────────────────────────────

  const addToHistory = useCallback(() => {
    if (!input.trim() || !output || hasError) return;
    const entry: HistoryEntry = {
      input: input.trim(),
      output,
      direction,
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const filtered = prev.filter(
        (e) => !(e.input === entry.input && e.direction === entry.direction)
      );
      return [entry, ...filtered].slice(0, 20);
    });
  }, [input, output, direction, hasError]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    setInput(entry.input);
    setDirection(entry.direction);
  }, []);

  // ── Swap direction ───────────────────────────────────────────────────────

  const swapDirection = useCallback(() => {
    if (isPlaying) stopPlayback();
    if (direction === 'text-to-morse') {
      setDirection('morse-to-text');
      setInput(output || input);
    } else {
      setDirection('text-to-morse');
      setInput(output || input);
    }
  }, [direction, output, input, isPlaying, stopPlayback]);

  // ── Clear ────────────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    if (isPlaying) stopPlayback();
    setInput('');
    setPlayProgress(-1);
  }, [isPlaying, stopPlayback]);

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderMorseVisual = () => {
    if (!output.trim() || hasError) return null;
    const parts = output.split(' ');
    return (
      <div className="mt-6 p-4 bg-surface-light rounded-xl border border-slate-700/50 overflow-x-auto">
        <div className="flex flex-wrap gap-3 items-center min-h-[48px]">
          {parts.map((symbol, i) => {
            const isPlayed = playProgress >= 0 && i <= playProgress;
            const isCurrent = playProgress >= 0 && i === playProgress;
            if (symbol === '/') {
              return (
                <span
                  key={i}
                  className={`text-lg font-bold px-1 transition-all duration-150 ${
                    isCurrent ? 'text-brand-400 scale-125' : isPlayed ? 'text-brand-500' : 'text-slate-500'
                  }`}
                >
                  /
                </span>
              );
            }
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-[2px] font-mono text-sm tracking-wider px-1.5 py-1 rounded transition-all duration-150 ${
                  isCurrent
                    ? 'bg-brand-500/20 text-brand-400 scale-110 ring-1 ring-brand-500/50'
                    : isPlayed
                    ? 'text-brand-500'
                    : 'text-slate-300'
                }`}
                onClick={() => copyMorseChar(symbol)}
                title="Click to copy"
              >
                {symbol.split('').map((c, j) => (
                  <span
                    key={j}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-sm text-xs font-bold ${
                      c === '.'
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {c === '.' ? '•' : '—'}
                  </span>
                ))}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Morse Code Encoder / Decoder"
      description="Translate text to Morse code and back. Live translation, audio playback with speed control, and visual dot/dash display — 100% client-side."
      controls={
        <div className="flex items-center gap-2 w-full flex-wrap">
          <button
            onClick={swapDirection}
            disabled={isPlaying}
            className="btn btn-sm flex items-center gap-1.5 bg-surface-lighter border border-slate-600 hover:border-slate-500 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Swap
          </button>

          {!isPlaying ? (
            <button
              onClick={playMorse}
              disabled={!output.trim() || hasError}
              className="btn btn-sm flex items-center gap-1.5 bg-brand-500/20 border border-brand-500/30 hover:bg-brand-500/30 text-brand-400 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Play
            </button>
          ) : (
            <button
              onClick={stopPlayback}
              className="btn btn-sm flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-500">Speed:</span>
            {[0.5, 0.75, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                disabled={isPlaying}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  speedMultiplier === s
                    ? 'bg-brand-500/30 text-brand-300 border border-brand-500/50'
                    : 'bg-surface-lighter text-slate-400 border border-slate-600 hover:border-slate-500'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      }
    >
      {/* Direction indicator */}
      <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-surface-light border border-slate-700/50">
        <span className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
          direction === 'text-to-morse' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500'
        }`}>
          Text → Morse
        </span>
        <button
          onClick={swapDirection}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Swap direction"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
        <span className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
          direction === 'morse-to-text' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500'
        }`}>
          Morse → Text
        </span>
      </div>

      {/* Input area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            {direction === 'text-to-morse' ? 'Text Input' : 'Morse Code Input'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              direction === 'text-to-morse'
                ? 'Enter text to convert to Morse code...'
                : 'Enter Morse code (use . for dot, - for dash, space between letters, / between words)...'
            }
            className="w-full h-48 bg-surface-light border border-slate-700 rounded-xl p-4 text-slate-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 placeholder:text-slate-600 transition-all"
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
              {direction === 'text-to-morse' ? 'Morse Code Output' : 'Text Output'}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={copyOutput}
                disabled={!output || hasError}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <button
                onClick={addToHistory}
                disabled={!output || hasError}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clock className="w-3 h-3" />
                Save
              </button>
            </div>
          </div>
          <div className={`w-full h-48 bg-surface-light border rounded-xl p-4 text-slate-200 font-mono text-sm overflow-auto transition-all ${
            hasError
              ? 'border-red-500/50 text-red-400'
              : output
              ? 'border-slate-700'
              : 'border-slate-700 text-slate-600'
          }`}>
            {hasError ? output : (output || (
              <span className="text-slate-600">
                {direction === 'text-to-morse'
                  ? 'Morse code will appear here...'
                  : 'Decoded text will appear here...'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Visual morse display */}
      {renderMorseVisual()}

      {/* Quick reference table */}
      <details className="mt-8 group">
        <summary className="text-sm font-medium text-slate-400 cursor-pointer hover:text-slate-300 transition-colors select-none">
          International Morse Code Reference
        </summary>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {Object.entries(TEXT_TO_MORSE)
            .filter(([char]) => /^[A-Z0-9]$/.test(char))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([char, morse]) => (
              <div
                key={char}
                className="flex items-center gap-2 p-2 rounded-lg bg-surface-light border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group/ref"
                onClick={() => {
                  setInput((prev) => prev + char);
                  setDirection('text-to-morse');
                }}
                title={`Click to add '${char}' to input`}
              >
                <span className="font-mono text-brand-400 font-bold text-sm w-6 text-center">
                  {char}
                </span>
                <span className="font-mono text-slate-400 text-xs tracking-wider">
                  {morse.replace(/\./g, '•').replace(/-/g, '—')}
                </span>
              </div>
            ))}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {Object.entries(TEXT_TO_MORSE)
            .filter(([char]) => !/^[A-Z0-9 ]$/.test(char))
            .map(([char, morse]) => (
              <div
                key={char}
                className="flex items-center gap-2 p-2 rounded-lg bg-surface-light border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group/ref"
                onClick={() => {
                  setInput((prev) => prev + char);
                  setDirection('text-to-morse');
                }}
                title={`Click to add '${char}' to input`}
              >
                <span className="font-mono text-amber-400 font-bold text-sm w-6 text-center">
                  {char === ' ' ? '␣' : char}
                </span>
                <span className="font-mono text-slate-500 text-xs tracking-wider">
                  {morse.replace(/\./g, '•').replace(/-/g, '—')}
                </span>
              </div>
            ))}
        </div>
      </details>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400">Recent Translations</h3>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear History
            </button>
          </div>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-light border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => loadHistoryEntry(entry)}
              >
                <span className="text-[10px] text-slate-500 font-mono uppercase px-1.5 py-0.5 rounded bg-surface-lighter">
                  {entry.direction === 'text-to-morse' ? '→' : '←'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-300 truncate">{entry.input}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">{entry.output}</div>
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
