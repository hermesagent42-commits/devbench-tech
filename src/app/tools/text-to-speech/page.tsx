'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play,
  Square,
  Pause,
  Volume2,
  Copy,
  Trash2,
  RefreshCw,
  Mic,
  ChevronDown,
  FastForward,
  Sliders,
  Download,
  Languages,
  Hash,
  TrendingUp,
  Waves,
  Gauge,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ───────── Types ───────── */

interface VoiceInfo {
  name: string;
  lang: string;
  default: boolean;
  voiceURI: string;
}

interface WordToken {
  word: string;
  startIndex: number;
  endIndex: number;
}

/* ───────── Presets ───────── */

interface Preset {
  label: string;
  text: string;
  icon: string;
}

const PRESETS: Preset[] = [
  {
    label: 'Welcome message',
    text: 'Welcome to DevBench, your ultimate developer toolkit. Explore over 170 free tools for web developers, designers, and engineers.',
    icon: '👋',
  },
  {
    label: 'Tongue twister',
    text: 'She sells seashells by the seashore. The shells she sells are surely seashells. So if she sells shells on the seashore, I\'m sure she sells seashore shells.',
    icon: '👅',
  },
  {
    label: 'Shakespeare',
    text: 'To be, or not to be, that is the question: Whether \'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles.',
    icon: '🎭',
  },
  {
    label: 'Tech quote',
    text: 'Any sufficiently advanced technology is indistinguishable from magic. — Arthur C. Clarke',
    icon: '✨',
  },
  {
    label: 'Lorem ipsum',
    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    icon: '📝',
  },
];

/* ───────── Tokenize text ───────── */

function tokenizeWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  // Split on whitespace/punctuation, keep words with any letter/digit
  const regex = /[A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u024F\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]+|\d+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return tokens;
}

/* ───────── Component ───────── */

export default function TextToSpeechPage() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [charCount, setCharCount] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis>(null!);
  const wordTokens = useMemo(() => tokenizeWords(text), [text]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      synthRef.current = synth;
      const availableVoices = synth.getVoices();
      const mapped: VoiceInfo[] = availableVoices
        .filter((v) => v.lang.startsWith('en') || v.default)
        .map((v) => ({
          name: v.name,
          lang: v.lang,
          default: v.default,
          voiceURI: v.voiceURI,
        }));

      setVoices(mapped);

      // Auto-select default English voice
      if (!selectedVoice && mapped.length > 0) {
        const defaultVoice = mapped.find((v) => v.default) || mapped[0];
        setSelectedVoice(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Ensure voices are available on some browsers where onvoiceschanged fires early
    setTimeout(() => {
      if (voices.length === 0) loadVoices();
    }, 500);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Estimate duration (rough: ~150 words per minute at rate 1.0)
  useEffect(() => {
    const wordCount = wordTokens.length;
    const baseSeconds = wordCount / 2.5; // ~150 wpm
    const adjustedSeconds = baseSeconds / rate;
    setEstimatedDuration(Math.max(0.5, Math.round(adjustedSeconds)));
  }, [wordTokens.length, rate]);

  // Track char count
  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  const findVoice = useCallback((): SpeechSynthesisVoice | null => {
    const synth = synthRef.current;
    if (!synth) return null;
    const allVoices = synth.getVoices();
    return allVoices.find((v) => v.voiceURI === selectedVoice) || null;
  }, [selectedVoice]);

  const stopSpeech = useCallback(() => {
    const synth = synthRef.current;
    if (synth) {
      synth.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
  }, []);

  const createUtterance = useCallback((): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    const voice = findVoice();
    if (voice) utterance.voice = voice;

    // Track word boundaries
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        // Find which word token this character belongs to
        const tokenIdx = wordTokens.findIndex(
          (t) => charIdx >= t.startIndex && charIdx < t.endIndex,
        );
        if (tokenIdx >= 0) {
          setCurrentWordIndex(tokenIdx);
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
    };

    return utterance;
  }, [text, rate, pitch, volume, findVoice, wordTokens]);

  const speak = useCallback(() => {
    if (!text.trim()) {
      toast.error('Enter some text first');
      return;
    }

    const synth = synthRef.current;
    if (!synth) {
      toast.error('Speech synthesis not supported in this browser');
      return;
    }

    synth.cancel();
    const utterance = createUtterance();
    utteranceRef.current = utterance;
    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  }, [text, createUtterance]);

  const pauseSpeech = useCallback(() => {
    const synth = synthRef.current;
    if (synth && isPlaying) {
      synth.pause();
      setIsPaused(true);
    }
  }, [isPlaying]);

  const resumeSpeech = useCallback(() => {
    const synth = synthRef.current;
    if (synth && isPaused) {
      synth.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const copyText = useCallback(() => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Text copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [text]);

  const clearText = useCallback(() => {
    stopSpeech();
    setText('');
  }, [stopSpeech]);

  const applyPreset = useCallback(
    (preset: Preset) => {
      stopSpeech();
      setText(preset.text);
    },
    [stopSpeech],
  );

  // Render highlighted text
  const renderHighlightedText = () => {
    if (!text || currentWordIndex < 0 || !isPlaying) {
      return text || '';
    }

    const token = wordTokens[currentWordIndex];
    if (!token) return text;

    const before = text.slice(0, token.startIndex);
    const word = text.slice(token.startIndex, token.endIndex);
    const after = text.slice(token.endIndex);

    return (
      <>
        <span>{before}</span>
        <mark
          className="bg-brand-500/40 text-brand-200 rounded-sm px-0.5 animate-pulse"
          style={{ animationDuration: '0.6s' }}
        >
          {word}
        </mark>
        <span>{after}</span>
      </>
    );
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  /* ─── Voice display name ─── */

  const selectedVoiceName = useMemo(() => {
    const v = voices.find((v) => v.voiceURI === selectedVoice);
    if (!v) return 'Select voice...';
    const langLabel =
      v.lang === 'en-US'
        ? 'US'
        : v.lang === 'en-GB'
          ? 'UK'
          : v.lang === 'en-AU'
            ? 'AU'
            : v.lang.split('-')[1] || v.lang;
    return `${v.name} (${langLabel})`;
  }, [voices, selectedVoice]);

  const voiceOptions = useMemo(() => {
    // Deduplicate by name+lang
    const seen = new Set<string>();
    return voices.filter((v) => {
      const key = `${v.name}|${v.lang}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [voices]);

  return (
    <ToolLayout
      title="Text to Speech"
      description="Convert text into natural-sounding speech using the browser's built-in speech synthesis engine. Choose voices, adjust rate, pitch, and volume."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Voice Selector */}
          <div className="card space-y-3">
            <label className="text-white font-semibold text-sm flex items-center gap-2">
              <Mic className="w-4 h-4 text-brand-400" />
              Voice
            </label>
            <div className="relative">
              <select
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  if (isPlaying) {
                    stopSpeech();
                  }
                }}
                className="input-field w-full appearance-none pr-10 py-2.5 text-sm"
              >
                {voiceOptions.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}){v.default ? ' ★' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {voices.length === 0 && (
              <p className="text-xs text-yellow-400">
                Loading voices… This may take a moment on some browsers.
              </p>
            )}
          </div>

          {/* Rate */}
          <div className="card space-y-3">
            <label className="text-white font-semibold text-sm flex items-center gap-2">
              <FastForward className="w-4 h-4 text-amber-400" />
              Speed: {rate.toFixed(1)}x
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-8 text-right">0.5x</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-xs text-slate-500 w-8">2.0x</span>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setRate(0.75)}
                className={`text-xs px-2 py-1 rounded ${
                  rate === 0.75
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Slow
              </button>
              <button
                onClick={() => setRate(1)}
                className={`text-xs px-2 py-1 rounded ${
                  rate === 1
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setRate(1.25)}
                className={`text-xs px-2 py-1 rounded ${
                  rate === 1.25
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Fast
              </button>
              <button
                onClick={() => setRate(1.5)}
                className={`text-xs px-2 py-1 rounded ${
                  rate === 1.5
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                1.5x
              </button>
            </div>
          </div>

          {/* Pitch */}
          <div className="card space-y-3">
            <label className="text-white font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Pitch: {pitch.toFixed(1)}
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-8 text-right">0.5</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-xs text-slate-500 w-8">2.0</span>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setPitch(0.75)}
                className={`text-xs px-2 py-1 rounded ${
                  pitch === 0.75
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Deep
              </button>
              <button
                onClick={() => setPitch(1)}
                className={`text-xs px-2 py-1 rounded ${
                  pitch === 1
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setPitch(1.5)}
                className={`text-xs px-2 py-1 rounded ${
                  pitch === 1.5
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                High
              </button>
            </div>
          </div>

          {/* Volume */}
          <div className="card space-y-3">
            <label className="text-white font-semibold text-sm flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              Volume: {Math.round(volume * 100)}%
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">0%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-slate-500">100%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="card space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-lighter rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">
                  {wordTokens.length}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">words</div>
              </div>
              <div className="bg-surface-lighter rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{charCount}</div>
                <div className="text-xs text-slate-400 mt-0.5">chars</div>
              </div>
              <div className="bg-surface-lighter rounded-lg p-3 text-center col-span-2">
                <div className="text-lg font-bold text-brand-400">
                  ~{formatDuration(estimatedDuration)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  estimated duration
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Text + Preview */}
        <div className="lg:col-span-2 space-y-5">
          {/* Playback Controls */}
          <div className="card">
            <div className="flex items-center gap-3">
              {!isPlaying ? (
                <button
                  onClick={speak}
                  className="btn-primary flex items-center gap-2 px-6 py-3 text-base"
                  disabled={!text.trim()}
                >
                  <Play className="w-5 h-5" />
                  Speak
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={resumeSpeech}
                      className="btn-primary flex items-center gap-2 px-6 py-3 text-base"
                    >
                      <Play className="w-5 h-5" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={pauseSpeech}
                      className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2 text-base"
                    >
                      <Pause className="w-5 h-5" />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={stopSpeech}
                    className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2 text-base"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                </>
              )}

              <div className="flex-1" />

              <button
                onClick={copyText}
                className="btn-secondary p-2.5 rounded-lg"
                title="Copy text"
                disabled={!text}
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={clearText}
                className="btn-secondary p-2.5 rounded-lg"
                title="Clear text"
                disabled={!text}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Active voice indicator */}
            {isPlaying && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                </span>
                <span className="text-brand-300 text-xs">
                  Speaking — {selectedVoiceName} at {rate.toFixed(1)}x
                </span>
                {currentWordIndex >= 0 && (
                  <span className="text-slate-400 text-xs">
                    · Word {currentWordIndex + 1}/{wordTokens.length}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              <label className="text-white font-semibold text-sm">
                Text to speak
              </label>
            </div>

            {/* Highlighted display while speaking */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="input-field w-full min-h-[200px] p-4 font-sans text-base leading-relaxed resize-y"
                placeholder="Type or paste text to convert to speech…"
                spellCheck={false}
              />

              {/* Overlaid highlighting during playback */}
              {isPlaying && currentWordIndex >= 0 && (
                <div
                  className="absolute inset-0 pointer-events-none p-4 font-sans text-base leading-relaxed overflow-hidden"
                  style={{
                    color: 'rgba(148, 163, 184, 0.7)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit',
                    lineHeight: 'inherit',
                  }}
                >
                  {renderHighlightedText()}
                </div>
              )}

              {/* Char count */}
              <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                {charCount} chars
              </div>
            </div>
          </div>

          {/* Word-by-word display during playback */}
          {isPlaying && wordTokens.length > 0 && (
            <div className="card">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4 text-brand-400" />
                Word Flow
              </h3>
              <div className="bg-surface-lighter rounded-lg p-4 max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {wordTokens.map((token, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                        i === currentWordIndex
                          ? 'bg-brand-500 text-white scale-110 shadow-lg shadow-brand-500/30'
                          : i < currentWordIndex
                            ? 'bg-slate-700/30 text-slate-600'
                            : 'bg-slate-700/20 text-slate-400'
                      }`}
                    >
                      {token.word}
                    </span>
                  ))}
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-400 h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${wordTokens.length > 0 ? ((currentWordIndex + 1) / wordTokens.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                <span>Word {currentWordIndex + 1 > 0 ? currentWordIndex + 1 : 0} of {wordTokens.length}</span>
                <span>
                  {wordTokens.length > 0
                    ? `${Math.round(((currentWordIndex + 1) / wordTokens.length) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          )}

          {/* Presets */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Languages className="w-4 h-4 text-slate-400" />
              Sample Texts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="card p-3 text-left hover:border-brand-500/50 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">
                      {preset.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {preset.text}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Browser compatibility note */}
          <div className="card border-brand-500/20 bg-brand-500/3">
            <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-brand-400" />
              About Speech Synthesis
            </h3>
            <div className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <p>
                This tool uses the{' '}
                <code className="text-brand-300 bg-surface-lighter px-1 py-0.5 rounded text-xs">
                  Web Speech API
                </code>{' '}
                built into your browser — no data is sent to any server.
              </p>
              <p>
                Voice quality and available voices depend on your OS and browser.
                Chrome and Edge have the widest selection; Firefox has fewer voices.
                Safari provides high-quality Apple voices on macOS.
              </p>
              <p>
                For the best experience, use a recent version of Chrome or Edge
                on a desktop.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
