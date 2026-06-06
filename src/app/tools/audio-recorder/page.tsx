'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Mic, MicOff, Play, Square, Pause, Download, Trash2,
  Volume2, Clock, Radio, Waves, Activity, Zap, BarChart3,
  FileAudio, ListMusic, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecordingEntry {
  id: string;
  blob: Blob;
  url: string;
  timestamp: number;
  duration: number;
  format: 'wav' | 'webm';
  name: string;
}

type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused';

// ─── Audio helpers ──────────────────────────────────────────────────────────

function floatTo16BitPCM(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function buildWav(samples: Float32Array, sampleRate: number): Blob {
  const pcmData = floatTo16BitPCM(samples);
  const headerBuffer = new ArrayBuffer(44);
  const view = new DataView(headerBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);             // PCM
  view.setUint16(22, 1, true);             // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);             // block align
  view.setUint16(34, 16, true);            // bits per sample
  writeString(36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  return new Blob([headerBuffer, pcmData], { type: 'audio/wav' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AudioRecorderPage() {
  // Core state
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [history, setHistory] = useState<RecordingEntry[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [mimeType, setMimeType] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  // Waveform data for live visualization
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pauseElapsedRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────

  const isIdle = recorderState === 'idle';
  const isRecording = recorderState === 'recording';
  const isPaused = recorderState === 'paused';
  const isActive = isRecording || isPaused;
  const supportsWav = typeof AudioContext !== 'undefined';

  // ── Enumerate devices ────────────────────────────────────────────────────

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !audioInputs.find(d => d.deviceId === selectedDevice)) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch {
      // Silently ignore — permissions may not be granted yet
    }
  }, [selectedDevice]);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
      history.forEach(entry => URL.revokeObjectURL(entry.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Waveform Canvas Drawing ─────────────────────────────────────────────

  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barWidth = 2;
    const gap = 1;
    const maxBars = Math.floor(width / (barWidth + gap));
    const data = waveformData.slice(-maxBars);
    if (data.length === 0) return;

    // Gradient
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#a78bfa');
    gradient.addColorStop(1, '#f472b6');
    ctx.fillStyle = gradient;

    const centerY = height / 2;
    for (let i = 0; i < data.length; i++) {
      const barHeight = data[i] * (height / 2 - 4);
      const x = i * (barWidth + gap);
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
    }
  }, [waveformData]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // ── Audio level monitoring ──────────────────────────────────────────────

  const startLevelMonitor = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);
      // Compute RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setAudioLevel(rms);
      setWaveformData(prev => [...prev.slice(-200), rms]);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  // ── Start recording ─────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      setRecorderState('requesting');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDevice !== 'default'
          ? { deviceId: { exact: selectedDevice } }
          : true,
      });
      streamRef.current = stream;

      // Audio context for analysis
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine supported mime type
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      let selectedType = '';
      for (const t of preferredTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          selectedType = t;
          break;
        }
      }
      setMimeType(selectedType || 'audio/webm');

      const recorder = new MediaRecorder(stream, selectedType ? { mimeType: selectedType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const entry: RecordingEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          blob,
          url,
          timestamp: Date.now(),
          duration: elapsed,
          format: 'webm',
          name: `Recording ${new Date().toLocaleTimeString()}`,
        };
        setHistory(prev => [entry, ...prev]);
        setRecorderState('idle');
        if (timerRef.current) clearInterval(timerRef.current);
        setElapsed(0);
      };

      recorder.start(250);
      startTimeRef.current = Date.now();
      pauseElapsedRef.current = 0;

      // Start timer
      const start = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const ms = pauseElapsedRef.current + (now - start);
        setElapsed(ms / 1000);
      }, 100);

      startLevelMonitor();
      setRecorderState('recording');
      toast.success('Recording started');
    } catch (err: any) {
      setRecorderState('idle');
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else {
        toast.error('Could not start recording: ' + (err.message || 'Unknown error'));
      }
    }
  }, [selectedDevice, startLevelMonitor, elapsed]);

  // ── Pause / Resume ──────────────────────────────────────────────────────

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    pauseElapsedRef.current = elapsed;
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setRecorderState('paused');
    toast('Recording paused', { icon: '⏸️' });
  }, [elapsed]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
    startTimeRef.current = Date.now();
    const pauseOffset = pauseElapsedRef.current;
    const resumeStart = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setElapsed(pauseOffset + (now - resumeStart) / 1000);
    }, 100);
    startLevelMonitor();
    setRecorderState('recording');
    toast.success('Recording resumed');
  }, [startLevelMonitor]);

  // ── Stop recording ──────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  // ── Playback ────────────────────────────────────────────────────────────

  const playRecording = useCallback((entry: RecordingEntry) => {
    if (playingId === entry.id) {
      audioElRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
    }

    const audio = new Audio(entry.url);
    audioElRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlayProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      setPlayingId(null);
      setPlayProgress(0);
      audioElRef.current = null;
    };

    audio.onerror = () => {
      toast.error('Failed to play recording');
      setPlayingId(null);
      setPlayProgress(0);
      audioElRef.current = null;
    };

    audio.play();
    setPlayingId(entry.id);
    setPlayProgress(0);
  }, [playingId]);

  // ── Download ────────────────────────────────────────────────────────────

  const downloadRecording = useCallback((entry: RecordingEntry) => {
    const a = document.createElement('a');
    a.href = entry.url;
    a.download = `${entry.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${entry.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download started');
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────

  const deleteRecording = useCallback((entry: RecordingEntry) => {
    if (playingId === entry.id) {
      audioElRef.current?.pause();
      setPlayingId(null);
    }
    URL.revokeObjectURL(entry.url);
    setHistory(prev => prev.filter(e => e.id !== entry.id));
    toast.success('Recording deleted');
  }, [playingId]);

  // ── Clear all ───────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    if (isActive) return;
    audioElRef.current?.pause();
    setPlayingId(null);
    history.forEach(entry => URL.revokeObjectURL(entry.url));
    setHistory([]);
    toast.success('All recordings cleared');
  }, [history, isActive]);

  // ── Level bar color ─────────────────────────────────────────────────────

  const levelColor = useMemo(() => {
    if (audioLevel < 0.1) return 'bg-brand-400';
    if (audioLevel < 0.3) return 'bg-brand-400';
    if (audioLevel < 0.6) return 'bg-yellow-400';
    return 'bg-red-400';
  }, [audioLevel]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Audio Recorder"
      description="Record audio from your microphone — live waveform visualization, playback, and WAV/WebM download. 100% client-side."
      controls={
        <div className="flex items-center gap-3 flex-wrap">
          {devices.length > 1 && (
            <select
              value={selectedDevice}
              onChange={e => setSelectedDevice(e.target.value)}
              disabled={isActive}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-400 disabled:opacity-50"
            >
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          )}
          {history.length > 0 && isIdle && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      }
    >
      {/* ── Main recorder section ─────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-6">
        {/* Waveform Canvas */}
        <div className="mb-6">
          <canvas
            ref={waveformCanvasRef}
            width={800}
            height={160}
            className="w-full h-40 rounded-xl bg-slate-950/60 border border-slate-800/50"
          />
        </div>

        {/* Level meter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              Audio Level
            </span>
            <span className="text-xs text-slate-500">
              {(audioLevel * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${levelColor}`}
              style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Timer + controls */}
        <div className="flex flex-col items-center gap-4">
          {/* Timer display */}
          <div className="text-4xl font-mono font-bold text-slate-200 tabular-nums">
            {formatDuration(elapsed)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {isIdle && (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 transition-all shadow-lg shadow-red-500/25"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>
            )}

            {isRecording && (
              <>
                <button
                  onClick={pauseRecording}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/25 animate-pulse"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button
                  onClick={resumeRecording}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold bg-brand-500 hover:bg-brand-400 transition-colors"
                >
                  <Mic className="w-5 h-5" />
                  Resume
                </button>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold bg-red-600 hover:bg-red-500 transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
              </>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Recording
              </span>
            )}
            {isPaused && (
              <span className="flex items-center gap-1.5 text-sm text-yellow-400">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Paused
              </span>
            )}
            {isIdle && history.length === 0 && (
              <span className="text-sm text-slate-500 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Ready — click to record
              </span>
            )}
            {isIdle && history.length > 0 && (
              <span className="text-sm text-slate-500">
                {history.length} recording{history.length !== 1 ? 's' : ''} saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Recording history ─────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-brand-400" />
            Recordings
            <span className="text-sm text-slate-500 font-normal ml-1">
              ({history.length})
            </span>
          </h2>

          <div className="space-y-2">
            {history.map(entry => {
              const isPlaying = playingId === entry.id;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    isPlaying
                      ? 'border-brand-500/50 bg-brand-500/5'
                      : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50'
                  }`}
                >
                  {/* Play button */}
                  <button
                    onClick={() => playRecording(entry)}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isPlaying
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {entry.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.duration)}
                      </span>
                      <span className="text-xs text-slate-600">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-slate-600 uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                        {entry.format}
                      </span>
                    </div>

                    {/* Playback progress bar */}
                    {isPlaying && (
                      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-400 rounded-full transition-all duration-100"
                          style={{ width: `${playProgress * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => downloadRecording(entry)}
                      className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-700/50 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRecording(entry)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats summary */}
          <div className="mt-6 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">{history.length}</div>
              <div className="text-xs text-slate-500">Recordings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">
                {formatDuration(history.reduce((sum, e) => sum + e.duration, 0))}
              </div>
              <div className="text-xs text-slate-500">Total Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">
                {(history.reduce((sum, e) => sum + e.blob.size, 0) / 1024 / 1024).toFixed(1)} MB
              </div>
              <div className="text-xs text-slate-500">Total Size</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Browser compatibility note ────────────────────────────────── */}
      <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-500 space-y-1">
            <p><strong>Browser Support:</strong> Works in Chrome, Edge, Firefox, and Safari. MediaRecorder API must be available.</p>
            <p><strong>Permissions:</strong> Microphone access is required. Your browser will ask for permission the first time.</p>
            <p><strong>Privacy:</strong> All recording happens locally in your browser. No audio data is ever uploaded — fully client-side.</p>
            <p><strong>Format:</strong> Recordings are saved as WebM audio. {supportsWav ? 'WAV export supported.' : ''}</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
