'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Video,
  Square,
  Play,
  Pause,
  Download,
  Mic,
  MicOff,
  Monitor,
  RefreshCw,
  AlertTriangle,
  Clock,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped';

interface RecordingInfo {
  blob: Blob;
  url: string;
  duration: number;
  size: number;
  startedAt: number;
  mimeType: string;
  withAudio: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function getBestMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ScreenRecorderPage() {
  const [state, setState] = useState<RecorderState>('idle');
  const [includeAudio, setIncludeAudio] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<RecordingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (state === 'recording') {
      const start = Date.now() - elapsed;
      startTimeRef.current = start;
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup ────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // ── Start Recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);
    setState('requesting');

    try {
      // Check support
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen capture is not supported in this browser. Try Chrome, Edge, or Firefox.');
      }
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not supported in this browser.');
      }

      // Get display media
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // @ts-expect-error - cursor is widely supported
          cursor: 'always',
        },
        audio: includeAudio ? true : false,
      });

      let combinedStream: MediaStream;

      if (includeAudio) {
        // Try to get microphone audio
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });

          // Combine display stream + mic stream
          const ctx = new AudioContext();
          const dest = ctx.createMediaStreamDestination();

          // Display audio
          if (displayStream.getAudioTracks().length > 0) {
            const displaySource = ctx.createMediaStreamSource(displayStream);
            displaySource.connect(dest);
          }

          // Mic audio
          const micSource = ctx.createMediaStreamSource(micStream);
          micSource.connect(dest);

          // Combined tracks: video from display, audio from mixed destination
          const mixedTracks = [
            ...displayStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ];
          combinedStream = new MediaStream(mixedTracks);
        } catch {
          // If mic permission denied, just use display stream
          combinedStream = displayStream;
        }
      } else {
        combinedStream = displayStream;
      }

      streamRef.current = combinedStream;

      // Show preview
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = combinedStream;
      }

      const mimeType = getBestMimeType();
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const info: RecordingInfo = {
          blob,
          url,
          duration: Date.now() - startTimeRef.current,
          size: blob.size,
          startedAt: startTimeRef.current,
          mimeType: mimeType || 'video/webm',
          withAudio: includeAudio,
        };
        setRecording(info);

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = null;
          previewVideoRef.current.src = url;
        }
      };

      // Stop recording if user clicks "Stop sharing" in browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setState('stopped');
        }
      };

      recorder.onerror = () => {
        setError('An error occurred while recording.');
        setState('idle');
        cleanup();
      };

      recorder.start(1000); // save chunks every second
      mediaRecorderRef.current = recorder;

      setElapsed(0);
      setRecording(null);
      setState('recording');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start screen recording';
      if (msg.includes('Permission denied') || msg.includes('cancelled')) {
        setState('idle');
        return;
      }
      setError(msg);
      setState('idle');
    }
  }, [includeAudio, cleanup]);

  // ── Pause / Resume ─────────────────────────────────────────────────────────

  const pauseRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== 'recording') return;
    rec.pause();
    setState('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== 'paused') return;
    rec.resume();
    setState('recording');
  }, []);

  // ── Stop ───────────────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
    cleanup();
    setState('stopped');
  }, [cleanup]);

  // ── Download ───────────────────────────────────────────────────────────────

  const downloadRecording = useCallback(() => {
    if (!recording) return;
    const a = document.createElement('a');
    const ext = recording.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const ts = formatTimestamp(new Date(recording.startedAt));
    a.href = recording.url;
    a.download = `screen-recording-${ts}.${ext}`;
    a.click();
    toast.success('Download started');
  }, [recording]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setElapsed(0);
    setError(null);
    setState('idle');
  }, [recording]);

  // ── Keyboard shortcut ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state === 'recording' || state === 'paused') {
          stopRecording();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, stopRecording]);

  // ── Calculate size estimate ────────────────────────────────────────────────

  const estimatedSize = elapsed > 0
    ? formatBytes((elapsed / 1000) * 2_500_000 / 8)
    : null;

  return (
    <ToolLayout
      title="Screen Recorder"
      description="Record your screen, window, or browser tab. Pure client-side — no uploads, no servers. Press Esc to stop."
    >
      <div className="space-y-6">
        {/* ── Error Banner ─────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-medium">Error</p>
              <p className="text-red-200/80 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Main Card ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-700/50 bg-surface-light overflow-hidden">
          {/* Preview area */}
          <div className="relative bg-slate-900/80 min-h-[360px] flex items-center justify-center">
            {state === 'idle' && !recording && (
              <div className="text-center p-8">
                <Monitor className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg font-medium">
                  Ready to record
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Click &quot;Start Recording&quot; and choose what to share
                </p>
              </div>
            )}

            {state === 'requesting' && (
              <div className="text-center p-8">
                <div className="w-12 h-12 border-4 border-brand-400/30 border-t-brand-400 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-lg">
                  Choose a screen, window, or tab to share...
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  A browser share dialog should appear
                </p>
              </div>
            )}

            {/* Live preview during recording */}
            {(state === 'recording' || state === 'paused') && (
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain max-h-[480px]"
              />
            )}

            {/* Playback after recording */}
            {state === 'stopped' && recording && (
              <video
                ref={previewVideoRef}
                controls
                playsInline
                className="w-full h-full object-contain max-h-[480px]"
              />
            )}

            {/* Recording indicator */}
            {(state === 'recording' || state === 'paused') && (
              <div className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-medium ${
                state === 'recording'
                  ? 'bg-red-500/90 text-white'
                  : 'bg-amber-500/90 text-white'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  state === 'recording' ? 'bg-white animate-pulse' : 'bg-white'
                }`} />
                {state === 'recording' ? 'REC' : 'PAUSED'}
                <span className="ml-1 tabular-nums">{formatDuration(elapsed)}</span>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-3">
              {/* Start button */}
              {(state === 'idle' || state === 'stopped') && (
                <>
                  <button
                    onClick={state === 'stopped' ? reset : startRecording}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Start Recording
                  </button>

                  {/* Audio toggle */}
                  {state === 'idle' && (
                    <button
                      onClick={() => setIncludeAudio(!includeAudio)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        includeAudio
                          ? 'bg-brand-500/10 border-brand-500/40 text-brand-300'
                          : 'border-slate-700 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {includeAudio ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <MicOff className="w-4 h-4" />
                      )}
                      {includeAudio ? 'Audio On' : 'Audio Off'}
                    </button>
                  )}
                </>
              )}

              {/* Recording controls */}
              {(state === 'recording' || state === 'paused') && (
                <>
                  {state === 'recording' ? (
                    <button
                      onClick={pauseRecording}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeRecording}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </button>
                  )}

                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white transition-colors border border-slate-600"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>

                  {/* Estimated size */}
                  {estimatedSize && (
                    <span className="text-slate-500 text-xs font-mono ml-2">
                      ~{estimatedSize}
                    </span>
                  )}
                </>
              )}

              {/* Download / Re-record */}
              {state === 'stopped' && recording && (
                <>
                  <button
                    onClick={downloadRecording}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download ({formatBytes(recording.size)})
                  </button>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Record Again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Recording Tips ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-slate-700/50 bg-surface-light">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">Choose Source</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can record your entire screen, a specific application window, or a single browser tab.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-700/50 bg-surface-light">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">No Time Limit</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Record as long as you want. Output is WebM format — great balance of quality and file size.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-700/50 bg-surface-light">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">100% Private</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Everything stays on your device. No uploads, no servers involved. Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-700 rounded font-mono">Esc</kbd> to stop.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
