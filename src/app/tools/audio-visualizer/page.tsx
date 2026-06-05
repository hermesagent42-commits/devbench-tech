'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Play,
  Square,
  Mic,
  MicOff,
  Volume2,
  BarChart3,
  Activity,
  Circle,
  Grid3X3,
  Download,
  Pause,
  Zap,
  Palette,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

type VizMode = 'waveform' | 'bars' | 'circular' | 'spectrogram' | 'particles';
type AudioState = 'idle' | 'active' | 'paused';

const MODES: { id: VizMode; label: string; icon: string }[] = [
  { id: 'waveform', label: 'Waveform', icon: 'Activity' },
  { id: 'bars', label: 'Bars', icon: 'BarChart3' },
  { id: 'circular', label: 'Circular', icon: 'Circle' },
  { id: 'spectrogram', label: 'Spectrogram', icon: 'Grid3X3' },
  { id: 'particles', label: 'Particles', icon: 'Zap' },
];

const COLOR_THEMES = [
  { name: 'Neon Cyan', primary: '#06b6d4', secondary: '#0891b2' },
  { name: 'Brand Blue', primary: '#38bdf8', secondary: '#0ea5e9' },
  { name: 'Purple Haze', primary: '#a78bfa', secondary: '#7c3aed' },
  { name: 'Emerald', primary: '#34d399', secondary: '#059669' },
  { name: 'Sunset', primary: '#f472b6', secondary: '#f97316' },
  { name: 'Rainbow', primary: '#f43f5e', secondary: '#8b5cf6' },
  { name: 'White', primary: '#f8fafc', secondary: '#94a3b8' },
  { name: 'Matrix', primary: '#4ade80', secondary: '#166534' },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity, BarChart3, Circle, Grid3X3, Zap,
};

export default function AudioVisualizerPage() {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [mode, setMode] = useState<VizMode>('bars');
  const [themeIdx, setThemeIdx] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [volume, setVolume] = useState(0);
  const [peak, setPeak] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const peakRef = useRef(0);

  const theme = COLOR_THEMES[themeIdx];

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.5;
      src.connect(analyser);
      analyserRef.current = analyser;
      sourceRef.current = src;
      setAudioState('active');
      peakRef.current = 0;
      draw();
    } catch {
      toast.error('Microphone access denied. Please allow mic access.');
    }
  }, []);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    setAudioState('idle');
    setVolume(0);
    setPeak(0);
    peakRef.current = 0;
  }, []);

  const pauseResume = useCallback(() => {
    if (audioState === 'active') {
      cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.suspend();
      setAudioState('paused');
    } else if (audioState === 'paused') {
      audioCtxRef.current?.resume();
      draw();
      setAudioState('active');
    }
  }, [audioState]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    const bufferLen = analyser.frequencyBinCount;

    const timeData = new Uint8Array(bufferLen);
    analyser.getByteTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < bufferLen; i++) {
      const v = (timeData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / bufferLen);
    const vol = Math.min(rms * sensitivity * 3, 1);
    setVolume(vol);
    peakRef.current = Math.max(peakRef.current, vol);
    setPeak(peakRef.current);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const freqData = new Uint8Array(bufferLen);
    analyser.getByteFrequencyData(freqData);

    switch (mode) {
      case 'waveform': drawWaveform(ctx, timeData, W, H, theme); break;
      case 'bars': drawBars(ctx, freqData, W, H, theme, bufferLen); break;
      case 'circular': drawCircular(ctx, freqData, W, H, theme, bufferLen, vol); break;
      case 'spectrogram': drawSpectrogram(ctx, freqData, W, H, theme, bufferLen); break;
      case 'particles': drawParticles(ctx, freqData, W, H, theme, bufferLen, vol); break;
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [mode, sensitivity, theme]);

  useEffect(() => {
    if (audioState === 'active') {
      cancelAnimationFrame(animFrameRef.current);
      draw();
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mode, themeIdx, sensitivity]);

  useEffect(() => () => {
    cancelAnimationFrame(animFrameRef.current);
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const takeScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `audio-visualizer-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Screenshot saved!');
  }, []);

  return (
    <ToolLayout
      title="Audio Visualizer"
      description="Real-time microphone audio visualization — waveform, frequency bars, circular, spectrogram, and particles. See your sound come alive."
    >
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 mb-6">
        {audioState === 'idle' ? (
          <button onClick={startMic} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
            <Mic className="w-4 h-4" /> Start Microphone
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={pauseResume} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
              {audioState === 'paused' ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
            </button>
            <button onClick={stopMic} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
              <Square className="w-4 h-4" /> Stop
            </button>
            <button onClick={takeScreenshot} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
              <Download className="w-4 h-4" /> Screenshot
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 bg-surface-light rounded-lg p-1">
          {MODES.map((m) => {
            const IconComp = iconMap[m.icon];
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === m.id ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white hover:bg-surface-lighter'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-slate-400" />
          <select value={themeIdx} onChange={(e) => setThemeIdx(Number(e.target.value))}
            className="bg-surface-light text-slate-200 text-xs rounded-lg border border-slate-600 px-3 py-2 focus:outline-none focus:border-brand-500">
            {COLOR_THEMES.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <input type="range" min="0.1" max="3" step="0.1" value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))} className="w-20 accent-brand-500" />
          <span className="text-xs text-slate-400 w-8">{sensitivity.toFixed(1)}x</span>
        </div>
      </div>

      {audioState !== 'idle' && (
        <div className="flex items-center gap-3 mb-4">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-75" style={{
              width: `${volume * 100}%`,
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
            }} />
          </div>
          <span className="text-xs text-slate-400 tabular-nums w-12 text-right">{Math.round(volume * 100)}%</span>
          <span className="text-xs text-slate-500">Peak: {Math.round(peak * 100)}%</span>
        </div>
      )}

      {audioState === 'idle' ? (
        <div className="w-full aspect-[21/9] rounded-xl border border-slate-700/50 bg-[#0f172a] flex flex-col items-center justify-center gap-4">
          <Mic className="w-12 h-12 text-slate-600" />
          <p className="text-slate-500 text-sm">Click &quot;Start Microphone&quot; to visualize audio</p>
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full rounded-xl border border-slate-700/50 bg-[#0f172a]" style={{ aspectRatio: '21/9' }} />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Mode: <span className="text-slate-300 capitalize">{mode}</span></span>
        <span className="flex items-center gap-1"><Grid3X3 className="w-3.5 h-3.5" /> FFT: <span className="text-slate-300">2048</span></span>
        <span className="flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Theme: <span className="text-slate-300">{theme.name}</span></span>
      </div>
    </ToolLayout>
  );
}

function drawWaveform(ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, theme: { primary: string; secondary: string }) {
  ctx.beginPath(); ctx.lineWidth = 2;
  const sw = W / data.length; let x = 0;
  for (let i = 0; i < data.length; i++) {
    const y = (data[i] / 128.0 * H) / 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += sw;
  }
  ctx.strokeStyle = theme.primary; ctx.globalAlpha = 0.5; ctx.stroke();
  ctx.beginPath(); ctx.globalAlpha = 0.8; ctx.strokeStyle = theme.secondary;
  x = 0;
  for (let i = 0; i < data.length; i++) {
    const y = (data[i] / 128.0 * H) / 2 + H * 0.005 * Math.sin((i / data.length) * Math.PI * 12);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += sw;
  }
  ctx.stroke(); ctx.globalAlpha = 1;
}

function drawBars(ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, theme: { primary: string; secondary: string }, bufferLen: number) {
  const n = 64; const step = Math.floor(bufferLen / n); const bw = (W / n) * 0.8; const gap = (W / n) * 0.2;
  for (let i = 0; i < n; i++) {
    let s = 0; for (let j = 0; j < step; j++) s += data[i * step + j] || 0;
    const v = s / step / 255; const bh = v * H * 0.85;
    const x = i * (bw + gap);
    const grad = ctx.createLinearGradient(x, H, x, H - bh);
    grad.addColorStop(0, theme.primary); grad.addColorStop(1, theme.secondary);
    ctx.fillStyle = grad; ctx.fillRect(x, H - bh, bw, bh);
    ctx.fillStyle = theme.primary; ctx.fillRect(x, H - bh - 2, bw, 4);
  }
}

function drawCircular(ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, theme: { primary: string; secondary: string }, bufferLen: number, vol: number) {
  const cx = W / 2, cy = H / 2, maxR = Math.min(cx, cy) * 0.8;
  const n = 72; const step = Math.floor(bufferLen / n);
  for (let ring = 0; ring < 3; ring++) {
    const rr = maxR * (0.4 + ring * 0.2);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      let s = 0; for (let j = 0; j < step; j++) s += data[(i * step + j + ring * n / 3) % bufferLen] || 0;
      const v = s / step / 255; const bl = v * maxR * 0.25;
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * (rr + bl), y = cy + Math.sin(a) * (rr + bl);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.strokeStyle = ring === 0 ? theme.primary : ring === 1 ? theme.secondary : theme.primary;
    ctx.globalAlpha = 0.3 + ring * 0.2; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const ps = maxR * 0.15 * (1 + vol * 0.5);
  ctx.beginPath(); ctx.arc(cx, cy, ps, 0, Math.PI * 2); ctx.fillStyle = theme.primary; ctx.globalAlpha = 0.6; ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSpectrogram(ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, theme: { primary: string; secondary: string }, bufferLen: number) {
  const n = 128; const step = Math.floor(bufferLen / n); const rh = 2;
  const imgData = ctx.createImageData(n, 1);
  for (let i = 0; i < n; i++) {
    let s = 0; for (let j = 0; j < step; j++) s += data[i * step + j] || 0;
    const v = s / step;
    imgData.data[i * 4] = Math.round(v * 0.6);
    imgData.data[i * 4 + 1] = Math.round(v * 0.9);
    imgData.data[i * 4 + 2] = Math.round(v);
    imgData.data[i * 4 + 3] = 255;
  }
  const existing = ctx.getImageData(0, 0, W, H);
  ctx.putImageData(existing, 0, -rh);
  const tmp = document.createElement('canvas'); tmp.width = n; tmp.height = 1;
  const tCtx = tmp.getContext('2d')!; tCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(tmp, 0, 0, n, 1, 0, 0, W, rh);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, rh, W, 1);
}

function drawParticles(ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, theme: { primary: string; secondary: string }, bufferLen: number, vol: number) {
  const cx = W / 2, cy = H / 2, n = 36, step = Math.floor(bufferLen / n), maxR = Math.min(cx, cy) * 0.75;
  const t = Date.now() * 0.0003;
  let prevX = 0, prevY = 0;
  for (let i = 0; i < n; i++) {
    let s = 0; for (let j = 0; j < step; j++) s += data[i * step + j] || 0;
    const v = s / step / 255;
    const a = (i / n) * Math.PI * 2 + t;
    const r = maxR * (0.3 + v * 0.7);
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    const sz = 2 + v * 6;
    ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? theme.primary : theme.secondary;
    ctx.globalAlpha = 0.4 + v * 0.6; ctx.fill();
    if (i > 0) { ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(px, py); ctx.strokeStyle = theme.primary; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.stroke(); }
    prevX = px; prevY = py;
  }
  ctx.globalAlpha = 1;
  const orb = 10 + vol * 30;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orb);
  grad.addColorStop(0, theme.primary); grad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, orb, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
}
