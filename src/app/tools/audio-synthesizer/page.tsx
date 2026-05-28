'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play,
  Square,
  Volume2,
  Music,
  Copy,
  Waves,
  Zap,
  Radio,
  BarChart3,
  Keyboard,
} from 'lucide-react';
import toast from 'react-hot-toast';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

const WAVEFORM_COLORS: Record<OscillatorType, string> = {
  sine: '#a78bfa',
  square: '#34d399',
  sawtooth: '#fbbf24',
  triangle: '#f472b6',
};

const NOTES: { label: string; freq: number }[] = [
  { label: 'C3', freq: 130.81 }, { label: 'C#3', freq: 138.59 },
  { label: 'D3', freq: 146.83 }, { label: 'D#3', freq: 155.56 },
  { label: 'E3', freq: 164.81 }, { label: 'F3', freq: 174.61 },
  { label: 'F#3', freq: 185.0 }, { label: 'G3', freq: 196.0 },
  { label: 'G#3', freq: 207.65 }, { label: 'A3', freq: 220.0 },
  { label: 'A#3', freq: 233.08 }, { label: 'B3', freq: 246.94 },
  { label: 'C4', freq: 261.63 }, { label: 'C#4', freq: 277.18 },
  { label: 'D4', freq: 293.66 }, { label: 'D#4', freq: 311.13 },
  { label: 'E4', freq: 329.63 }, { label: 'F4', freq: 349.23 },
  { label: 'F#4', freq: 369.99 }, { label: 'G4', freq: 392.0 },
  { label: 'G#4', freq: 415.3 }, { label: 'A4', freq: 440.0 },
  { label: 'A#4', freq: 466.16 }, { label: 'B4', freq: 493.88 },
  { label: 'C5', freq: 523.25 }, { label: 'C#5', freq: 554.37 },
  { label: 'D5', freq: 587.33 }, { label: 'D#5', freq: 622.25 },
  { label: 'E5', freq: 659.25 }, { label: 'F5', freq: 698.46 },
  { label: 'F#5', freq: 739.99 }, { label: 'G5', freq: 783.99 },
  { label: 'G#5', freq: 830.61 }, { label: 'A5', freq: 880.0 },
  { label: 'A#5', freq: 932.33 }, { label: 'B5', freq: 987.77 },
];

const PRESETS: { name: string; type: OscillatorType; freq: number }[] = [
  { name: 'Bass Sine', type: 'sine', freq: 82 },
  { name: 'Lead Saw', type: 'sawtooth', freq: 440 },
  { name: 'Square Pad', type: 'square', freq: 261 },
  { name: 'Triangle Pluck', type: 'triangle', freq: 523 },
  { name: 'Sub Bass', type: 'sine', freq: 55 },
  { name: 'Retro Square', type: 'square', freq: 220 },
];

export default function AudioSynthesizerPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequency] = useState(440);
  const [detune, setDetune] = useState(0);
  const [oscType, setOscType] = useState<OscillatorType>('sine');
  const [gain, setGain] = useState(0.5);
  const [attack, setAttack] = useState(0.1);
  const [decay, setDecay] = useState(0.2);
  const [sustain, setSustain] = useState(0.6);
  const [release, setRelease] = useState(0.5);
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.gain.value = gain;
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, [gain]);

  const startOsc = useCallback(
    (freq: number, det: number) => {
      ensureCtx();
      const ctx = audioCtxRef.current!;
      const now = ctx.currentTime;

      if (oscRef.current) {
        try { oscRef.current.stop(now); } catch (_) {}
        oscRef.current.disconnect();
      }

      const osc = ctx.createOscillator();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(det, now);

      const envNode = ctx.createGain();
      envNode.gain.setValueAtTime(0, now);
      envNode.gain.linearRampToValueAtTime(gain, now + attack);
      envNode.gain.linearRampToValueAtTime(gain * sustain, now + attack + decay);

      osc.connect(envNode);
      envNode.connect(gainNodeRef.current!);
      osc.start(now);

      oscRef.current = osc;
      (oscRef as any)._envNode = envNode;
    },
    [ensureCtx, oscType, gain, attack, decay, sustain]
  );

  const stopOsc = useCallback(() => {
    if (!oscRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const envNode = (oscRef as any)._envNode as GainNode;

    if (envNode) {
      envNode.gain.cancelScheduledValues(now);
      envNode.gain.setValueAtTime(envNode.gain.value, now);
      envNode.gain.linearRampToValueAtTime(0, now + release);
      oscRef.current.stop(now + release + 0.01);
    } else {
      try { oscRef.current.stop(now); } catch (_) {}
    }

    const t = (release + 0.02) * 1000;
    const ref = oscRef.current;
    setTimeout(() => {
      try { ref.disconnect(); } catch (_) {}
    }, t);

    oscRef.current = null;
  }, [release]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopOsc();
      setIsPlaying(false);
      setActiveNote(null);
    } else {
      startOsc(frequency, detune);
      setIsPlaying(true);
    }
  }, [isPlaying, startOsc, stopOsc, frequency, detune]);

  const playNote = useCallback(
    (noteLabel: string, freq: number) => {
      stopOsc();
      startOsc(freq, detune);
      setIsPlaying(true);
      setActiveNote(noteLabel);
    },
    [stopOsc, startOsc, detune]
  );

  const releaseNote = useCallback(() => {
    stopOsc();
    setIsPlaying(false);
    setActiveNote(null);
  }, [stopOsc]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getFloatTimeDomainData(dataArray);

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 8; i++) {
        const y = (h / 8) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let i = 0; i < 16; i++) {
        const x = (w / 16) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }

      // Center line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      // Waveform
      const color = WAVEFORM_COLORS[oscType];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] * 0.8;
        const y = (h / 2) + (v * h / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(frequency + ' Hz', 8, 18);
      ctx.fillText(oscType.toUpperCase(), 8, 34);
    };
    draw();
  }, [oscType, frequency]);

  useEffect(() => {
    if (isPlaying || activeNote) drawWaveform();
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, activeNote, drawWaveform]);

  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = gain;
  }, [gain]);

  useEffect(() => {
    return () => {
      stopOsc();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stopOsc]);

  // Keyboard input
  useEffect(() => {
    const keyMap: Record<string, number> = {
      a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7,
      y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15,
      ';': 16, "'": 17,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined && idx < NOTES.length) {
        e.preventDefault();
        playNote(NOTES[idx].label, NOTES[idx].freq);
      }
      if (e.key === ' ' && !activeNote) {
        e.preventDefault();
        togglePlay();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keyMap[e.key.toLowerCase()] !== undefined) {
        e.preventDefault();
        releaseNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playNote, releaseNote, togglePlay, activeNote]);

  const copyToClipboard = useCallback(() => {
    const code = [
      '// Web Audio API Synthesizer Config',
      'const ctx = new AudioContext();',
      'const osc = ctx.createOscillator();',
      'const gainNode = ctx.createGain();',
      '',
      "osc.type = '" + oscType + "';",
      'osc.frequency.setValueAtTime(' + frequency + ', ctx.currentTime);',
      'osc.detune.setValueAtTime(' + detune + ', ctx.currentTime);',
      '',
      '// ADSR Envelope',
      'const now = ctx.currentTime;',
      'gainNode.gain.setValueAtTime(0, now);',
      'gainNode.gain.linearRampToValueAtTime(' + gain + ', now + ' + attack + ');',
      'gainNode.gain.linearRampToValueAtTime(' + (gain * sustain).toFixed(2) + ', now + ' + (attack + decay).toFixed(2) + ');',
      '',
      'osc.connect(gainNode);',
      'gainNode.connect(ctx.destination);',
      'osc.start();'
    ].join('\\n');
    navigator.clipboard.writeText(code).then(() => {
      toast.success('AudioContext code copied!');
    });
  }, [oscType, frequency, detune, gain, attack, decay, sustain]);

  const waveformButtons: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

  return (
    <>
      <title>Web Audio Synthesizer — DevBench</title>
      <ToolLayout
        title="Web Audio Synthesizer"
        description="Interactive browser-based synthesizer with multiple waveforms, ADSR envelope, real-time visualization, and keyboard input. No installation required."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-1 space-y-5">
            {/* Waveform Selector */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4 text-brand-400" />
                Waveform
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {waveformButtons.map((type) => (
                  <button
                    key={type}
                    onClick={() => setOscType(type)}
                    className={'px-3 py-2 rounded-lg text-sm font-medium transition-all border ' + (
                      oscType === type
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300 shadow-lg shadow-brand-500/10'
                        : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    )}
                    style={oscType === type ? { borderColor: WAVEFORM_COLORS[type], color: WAVEFORM_COLORS[type] } : {}}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4 text-brand-400" />
                Frequency
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="range"
                  min={20}
                  max={2000}
                  step={1}
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none bg-slate-700 cursor-pointer accent-brand-500"
                />
                <span className="text-sm font-mono text-slate-200 min-w-[4.5rem] text-right">
                  {frequency} Hz
                </span>
              </div>
              <input
                type="number"
                value={frequency}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 20 && v <= 20000) setFrequency(v);
                }}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono text-slate-200 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Detune */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-400" />
                Detune
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="range"
                  min={-1200}
                  max={1200}
                  step={1}
                  value={detune}
                  onChange={(e) => setDetune(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none bg-slate-700 cursor-pointer accent-brand-500"
                />
                <span className="text-sm font-mono text-slate-200 min-w-[4rem] text-right">
                  {detune > 0 ? '+' : ''}{detune} &#162;
                </span>
              </div>
            </div>

            {/* Volume */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-brand-400" />
                Volume
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none bg-slate-700 cursor-pointer accent-brand-500"
                />
                <span className="text-sm font-mono text-slate-200 min-w-[3rem] text-right">
                  {Math.round(gain * 100)}%
                </span>
              </div>
            </div>

            {/* ADSR */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                ADSR Envelope
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Attack', value: attack, set: setAttack, max: 2, step: 0.01, unit: 's' },
                  { label: 'Decay', value: decay, set: setDecay, max: 2, step: 0.01, unit: 's' },
                  { label: 'Sustain', value: sustain, set: setSustain, max: 1, step: 0.01, unit: '' },
                  { label: 'Release', value: release, set: setRelease, max: 2, step: 0.01, unit: 's' },
                ].map(({ label, value, set, max, step, unit }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 min-w-[3.5rem]">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={max}
                      step={step}
                      value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="flex-1 h-1.5 rounded-lg appearance-none bg-slate-700 cursor-pointer accent-brand-500"
                    />
                    <span className="text-xs font-mono text-slate-300 min-w-[3rem] text-right">
                      {value.toFixed(2)}{unit}
                    </span>
                  </div>
                ))}
              </div>
              {/* ADSR Viz */}
              <div className="mt-3 h-12 bg-slate-900 rounded-lg relative overflow-hidden border border-slate-700/50">
                <svg viewBox="0 0 200 48" className="w-full h-full">
                  <polyline
                    points={[
                      '10,44',
                      (10 + attack * 60).toFixed(0) + ',8',
                      (10 + attack * 60 + decay * 60).toFixed(0) + ',' + (44 - sustain * 36).toFixed(0),
                      (10 + attack * 60 + decay * 60 + 80).toFixed(0) + ',' + (44 - sustain * 36).toFixed(0),
                      (10 + attack * 60 + decay * 60 + 80 + release * 60).toFixed(0) + ',44'
                    ].join(' ')}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Play / Stop */}
            <div className="flex gap-2">
              <button
                onClick={togglePlay}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20"
              >
                {isPlaying ? (
                  <><Square className="w-4 h-4" /> Stop</>
                ) : (
                  <><Play className="w-4 h-4" /> Play ({frequency} Hz)</>
                )}
              </button>
              <button
                onClick={copyToClipboard}
                className="px-4 py-3 rounded-xl border border-slate-600 text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-all"
                title="Copy AudioContext code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right side */}
          <div className="lg:col-span-2 space-y-5">
            {/* Waveform Canvas */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4 text-brand-400" />
                Live Waveform {isPlaying && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block ml-1" />}
              </h3>
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full rounded-lg border border-slate-700/50"
              />
            </div>

            {/* Presets */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Music className="w-4 h-4 text-brand-400" />
                Presets
              </h3>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setOscType(preset.type);
                      setFrequency(preset.freq);
                      stopOsc();
                      startOsc(preset.freq, detune);
                      setIsPlaying(true);
                      setActiveNote(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700/50 text-slate-300 hover:border-brand-500 hover:text-brand-300 hover:bg-brand-500/5 transition-all"
                  >
                    {preset.name}
                    <span className="ml-1.5 text-slate-500 font-mono">{preset.freq}Hz</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Keyboard */}
            <div className="bg-surface-light border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-brand-400" />
                Keyboard <span className="text-xs text-slate-500 font-normal">(press keys or click)</span>
              </h3>
              <div className="flex flex-wrap gap-1">
                {NOTES.map((note, idx) => {
                  const isSharp = note.label.includes('#');
                  const isActive = activeNote === note.label;
                  const keyLabels = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K', 'O', 'L', 'P', ';', "'"];
                  let btnClass = 'relative rounded-b-md transition-all select-none ';
                  btnClass += isSharp ? 'w-8 h-20 -mx-2 z-10 ' : 'w-11 h-28 ';
                  if (isActive) {
                    btnClass += isSharp
                      ? 'bg-brand-500 shadow-lg shadow-brand-500/40 translate-y-0.5'
                      : 'bg-brand-400/30 border-brand-500 shadow-lg shadow-brand-500/20 translate-y-0.5';
                  } else {
                    btnClass += isSharp
                      ? 'bg-slate-800 hover:bg-slate-700'
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-700/50';
                  }
                  return (
                    <button
                      key={note.label}
                      onMouseDown={() => playNote(note.label, note.freq)}
                      onMouseUp={releaseNote}
                      onMouseLeave={releaseNote}
                      onTouchStart={() => playNote(note.label, note.freq)}
                      onTouchEnd={releaseNote}
                      className={btnClass}
                    >
                      <span className={'absolute bottom-2 inset-x-0 text-center text-[10px] font-mono ' +
                        (isSharp ? 'text-slate-300' : isActive ? 'text-brand-200' : 'text-slate-400')}>
                        {idx < keyLabels.length ? keyLabels[idx] : ''}
                      </span>
                      <span className={'absolute top-1.5 inset-x-0 text-center text-[9px] font-mono ' +
                        (isSharp ? 'text-slate-500' : isActive ? 'text-brand-300' : 'text-slate-500')}>
                        {note.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ToolLayout>
    </>
  );
}
