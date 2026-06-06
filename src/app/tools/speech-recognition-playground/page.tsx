'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Mic, MicOff, Copy, Trash2, Volume2, Languages, AlertCircle, Info, CheckCircle2, Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

interface TranscriptEntry {
  id: number;
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
}

interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'tr-TR', name: 'Turkish' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'sv-SE', name: 'Swedish' },
];

const MDN_URL = 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API';
const W3C_URL = 'https://webaudio.github.io/web-speech-api/';

// ── Detection ───────────────────────────────────────────────────────────────

function checkSupport(): { supported: boolean; reason: string } {
  if (typeof window === 'undefined') return { supported: false, reason: 'SSR — browser only' };
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return { supported: false, reason: 'Browser does not support SpeechRecognition API' };
  }
  return { supported: true, reason: '' };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function SpeechRecognitionPlayground() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [continuous, setContinuous] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [supportCheck] = useState(() => checkSupport());

  const recognitionRef = useRef<any>(null);
  const idCounter = useRef(1);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new entries arrive
  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [entries, interimText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let newInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          setEntries(prev => [
            ...prev,
            {
              id: idCounter.current++,
              text: transcript.trim(),
              confidence,
              isFinal: true,
              timestamp: new Date(),
            },
          ]);
        } else {
          newInterim += transcript;
        }
      }

      setInterimText(newInterim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Silent — no speech detected is normal
      } else if (event.error === 'aborted') {
        // Normal stop
      } else {
        toast.error(`Recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // If continuous and not manually stopped, restart
      if (continuous && recognitionRef.current === recognition) {
        try {
          recognition.start();
          setIsListening(true);
        } catch {
          // Browser may throttle restarts
        }
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      toast.success('Listening... Speak now!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start recognition');
    }
  }, [language, continuous]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    // Move interim to final
    if (interimText.trim()) {
      setEntries(prev => [
        ...prev,
        {
          id: idCounter.current++,
          text: interimText.trim(),
          confidence: 0,
          isFinal: true,
          timestamp: new Date(),
        },
      ]);
      setInterimText('');
    }
    toast.success('Stopped listening');
  }, [interimText]);

  const clearAll = useCallback(() => {
    setEntries([]);
    setInterimText('');
    toast.success('Cleared all transcripts');
  }, []);

  const copyAll = useCallback(async () => {
    const allText = [
      ...entries.map(e => e.text),
      interimText,
    ].filter(Boolean).join('\n\n');
    if (!allText) {
      toast.error('Nothing to copy');
      return;
    }
    await navigator.clipboard.writeText(allText);
    toast.success('Copied all transcripts');
  }, [entries, interimText]);

  const copyEntry = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!supportCheck.supported) {
    return (
      <ToolLayout
        title="Speech Recognition Playground"
        description="Convert speech to text in real-time using the Web Speech API — 20+ languages, continuous mode, live confidence scores."
      >
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-200 mb-2">Not Supported</h2>
          <p className="text-slate-400 max-w-md">{supportCheck.reason}</p>
          <p className="text-sm text-slate-500 mt-4">
            The Web Speech API is available in Chrome, Edge, Safari, and Samsung Internet.
          </p>
          <a
            href={MDN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-brand-400 hover:text-brand-300 text-sm underline"
          >
            Learn more on MDN →
          </a>
        </div>
      </ToolLayout>
    );
  }

  return (
    <ToolLayout
      title="Speech Recognition Playground"
      description="Convert speech to text in real-time using the Web Speech API. 20+ languages, continuous mode, live confidence scores — 100% client-side, no servers."
      controls={
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:border-brand-500 outline-none"
            disabled={isListening}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={continuous}
              onChange={(e) => setContinuous(e.target.checked)}
              className="accent-brand-500"
              disabled={isListening}
            />
            Continuous
          </label>
        </div>
      }
    >
      {/* Info Banner */}
      <div className="mb-6 p-4 bg-brand-500/10 border border-brand-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-brand-300 mb-1">How It Works</h3>
            <p className="text-sm text-slate-300">
              This tool uses the browser&apos;s built-in <code className="px-1.5 py-0.5 bg-brand-500/20 rounded text-brand-300 text-xs">SpeechRecognition</code> API.
              Speech is processed locally or via the browser&apos;s speech service. No audio is sent to our servers.
              Grant microphone permission when prompted.
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3 mb-6">
        {!isListening ? (
          <button
            onClick={startListening}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
          >
            <Mic className="w-4 h-4" />
            Start Listening
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop Listening
          </button>
        )}

        <button
          onClick={copyAll}
          disabled={entries.length === 0 && !interimText}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
        >
          <Copy className="w-4 h-4" />
          Copy All
        </button>

        <button
          onClick={clearAll}
          disabled={entries.length === 0 && !interimText}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>

        {isListening && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-sm text-red-400 font-medium">Recording</span>
          </div>
        )}
      </div>

      {/* Language indicator */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Languages className="w-3 h-3" />
          {LANGUAGES.find(l => l.code === language)?.name || language}
        </span>
        <span>Mode: {continuous ? 'Continuous' : 'Single utterance'}</span>
      </div>

      {/* Transcript Display */}
      <div
        ref={resultsRef}
        className="bg-slate-900 border border-slate-700 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3"
      >
        {entries.length === 0 && !interimText && !isListening && (
          <div className="flex flex-col items-center justify-center h-[250px] text-slate-600">
            <Mic className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Click &quot;Start Listening&quot; and begin speaking</p>
            <p className="text-xs mt-1">Your transcript will appear here in real-time</p>
          </div>
        )}

        {entries.length === 0 && !interimText && isListening && (
          <div className="flex flex-col items-center justify-center h-[250px] text-slate-500">
            <Mic className="w-12 h-12 mb-3 text-brand-500 animate-pulse" />
            <p className="text-sm">Listening...</p>
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm text-slate-200 leading-relaxed">{entry.text}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-slate-500">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                {entry.confidence > 0 && (
                  <span className={`text-xs font-mono ${entry.confidence > 0.9 ? 'text-green-400' : entry.confidence > 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(entry.confidence * 100).toFixed(0)}% confidence
                  </span>
                )}
                <span className="text-xs text-brand-400/70 font-medium">Final</span>
              </div>
            </div>
            <button
              onClick={() => copyEntry(entry.text)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-700 rounded"
              title="Copy"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ))}

        {/* Interim result (live) */}
        {interimText && (
          <div className="flex items-start gap-3 p-3 bg-brand-500/5 rounded-lg border border-brand-500/20">
            <div className="flex-1">
              <p className="text-sm text-brand-300 italic leading-relaxed">{interimText}</p>
              <span className="text-xs text-brand-400/60 mt-1 inline-block">Listening...</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span>{entries.length} utterances</span>
          <span>{entries.reduce((sum, e) => sum + e.text.split(/\s+/).filter(Boolean).length, 0)} words</span>
          <span>{entries.reduce((sum, e) => sum + e.text.length, 0)} characters</span>
        </div>
      )}

      {/* API Reference Section */}
      <div className="mt-12">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm text-slate-400 hover:text-brand-400 transition-colors underline"
        >
          {showInfo ? 'Hide API Reference' : 'Show API Reference'}
        </button>

        {showInfo && (
          <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Web Speech API Usage</h3>
            <div>
              <p className="text-xs text-slate-400 mb-2">Basic setup:</p>
              <pre className="bg-slate-900 p-3 rounded text-xs text-slate-300 overflow-x-auto">
{`const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = (event) => {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const { transcript, confidence } = event.results[i][0];
    if (event.results[i].isFinal) {
      console.log('Final:', transcript, confidence);
    } else {
      console.log('Interim:', transcript);
    }
  }
};

recognition.onerror = (event) => console.error(event.error);
recognition.start();`}
              </pre>
            </div>
            <div className="text-xs text-slate-400">
              <p><strong>Browser support:</strong> Chrome, Edge, Safari 14.1+, Samsung Internet. Not available in Firefox.</p>
              <p className="mt-1"><strong>Privacy:</strong> Speech may be processed by browser vendor servers. Check the <code className="px-1 bg-slate-700 rounded">localService</code> voice property.</p>
              <div className="flex gap-3 mt-2">
                <a href={MDN_URL} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">MDN Docs →</a>
                <a href={W3C_URL} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">W3C Spec →</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
