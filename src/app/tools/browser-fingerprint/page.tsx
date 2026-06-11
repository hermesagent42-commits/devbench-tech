'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Fingerprint, Shield, ShieldAlert, ShieldCheck, Eye, EyeOff,
  RefreshCw, Copy, ChevronDown, ChevronRight, AlertTriangle,
  Check, X, Hash, Type, Monitor, Clock, Languages, Cpu,
  Gauge, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface FingerprintCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FingerprintItem[];
  summary: string;
}

interface FingerprintItem {
  label: string;
  value: string;
  bits: number;
  detail?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function estimateBits(values: string[], uniqueness: number): number {
  return Math.round(Math.log2(uniqueness / Math.max(1, values.length > 0 ? values.length : 1))) || 0;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ── Canvas Fingerprint ─────────────────────────────────────────────────────

function getCanvasFingerprint(): { value: string; bits: number; detail: string } {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { value: 'Unavailable', bits: 0, detail: 'Browser does not support Canvas 2D' };

    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser Fingerprint! 👋 <canvas> 1.0 〰️', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser Fingerprint! 👋 <canvas> 2.0 〰️', 4, 45);

    // More detailed test with arcs, gradients
    ctx.beginPath();
    ctx.arc(50, 30, 20, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(200, 100, 50, 0.5)';
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ff00ff');
    gradient.addColorStop(1, '#00ffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(200, 10, 70, 40);

    const dataUrl = canvas.toDataURL();
    const hash = hashString(dataUrl);
    const bits = 15 + Math.floor(Math.random() * 5); // Canvas typically leaks ~15-20 bits
    return {
      value: hash,
      bits,
      detail: 'Canvas rendering differences across GPU/driver/OS create unique signatures. Anti-fingerprinting browsers add noise.',
    };
  } catch {
    return { value: 'Error', bits: 0, detail: 'Could not read canvas fingerprint' };
  }
}

// ── WebGL Fingerprint ──────────────────────────────────────────────────────

function getWebGLFingerprint(): { value: string; bits: number; detail: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return { value: 'Unavailable', bits: 0, detail: 'WebGL not supported' };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Hidden (privacy)';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Hidden (privacy)';
    const combined = `${vendor} | ${renderer}`;

    // Get max texture size
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

    const hash = hashString(`${combined}|${maxTexSize}|${maxViewport}`);
    const bits = debugInfo ? 20 : 8;
    return {
      value: debugInfo ? `${vendor} — ${renderer}` : 'Hidden by browser privacy settings',
      bits,
      detail: debugInfo
        ? `Max texture: ${maxTexSize}px, Max viewport: ${maxViewport[0]}×${maxViewport[1]}. Safari and privacy-focused browsers hide GPU vendor.`
        : `Max texture: ${maxTexSize}px. GPU vendor/renderer hidden — this is a privacy win.`,
    };
  } catch {
    return { value: 'Error', bits: 0, detail: 'Could not read WebGL fingerprint' };
  }
}

// ── AudioContext Fingerprint ───────────────────────────────────────────────

function getAudioFingerprint(): Promise<{ value: string; bits: number; detail: string }> {
  try {
    const OfflineContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineContext) return Promise.resolve({ value: 'Unavailable', bits: 0, detail: 'AudioContext not supported' });

    const ctx = new OfflineContext(1, 44100, 44100);
    const oscillator = ctx.createOscillator();
    const analyser = ctx.createAnalyser();
    const gain = ctx.createGain();
    const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);

    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;
    gain.gain.value = 0.1;
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(ctx.destination);
    oscillator.start(0);

    return new Promise<{ value: string; bits: number; detail: string }>((resolve) => {
      let done = false;
      scriptProcessor.onaudioprocess = (e) => {
        if (done) return;
        done = true;
        const output = e.outputBuffer.getChannelData(0);
        const data = Array.from(output.slice(0, 30));
        const fingerprint = data.map(v => v.toFixed(8)).join(',');
        const hash = hashString(fingerprint);
        oscillator.disconnect();
        resolve({
          value: hash,
          bits: 12 + Math.floor(Math.random() * 4),
          detail: 'Slight differences in audio DSP hardware/stack processing create unique signatures. Firefox applies AudioContext fingerprint protection.',
        });
      };
      ctx.startRendering().then(() => {
        if (!done) {
          done = true;
          resolve({ value: hashString('fallback'), bits: 4, detail: 'Render completed without processing' });
        }
      });
    });
  } catch {
    return Promise.resolve({ value: 'Error', bits: 0, detail: 'Could not read audio fingerprint' });
  }
}

// ── Font Detection ─────────────────────────────────────────────────────────

function getFontList(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Comic Sans MS', 'Trebuchet MS', 'Impact', 'Lucida Console',
    'Tahoma', 'Palatino Linotype', 'Lucida Sans Unicode',
    'MS Sans Serif', 'MS Serif', 'Symbol', 'Webdings', 'Wingdings',
    'Helvetica', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Ubuntu', 'Fira Code', 'JetBrains Mono', 'Cascadia Code',
    'Consolas', 'Menlo', 'Monaco', 'SF Mono',
    'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
    'Noto Sans', 'Noto Serif', 'PT Sans', 'PT Serif', 'Playfair Display',
    'Merriweather', 'Fira Sans', 'Source Sans Pro', 'Source Serif Pro',
    'IBMPlexSans', 'IBMPlexMono', 'Liberation Sans', 'Liberation Serif',
    'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif',
    'Nimbus Sans', 'Nimbus Roman',
    'Inter', 'Manrope', 'Poppins', 'Raleway',
    'Segoe UI', 'Segoe Print', 'Segoe Script',
    'Brush Script MT', 'Copperplate', 'Papyrus', 'Chalkduster',
    'Gill Sans', 'Optima', 'Futura', 'Baskerville',
    'Book Antiqua', 'Century Gothic', 'Franklin Gothic Medium',
    'Garamond', 'Rockwell', 'Calibri', 'Cambria', 'Candara',
    'Constantia', 'Corbel',
  ];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  canvas.width = 100;
  canvas.height = 100;
  ctx.textBaseline = 'top';
  ctx.font = '72px monospace';

  const detected: string[] = [];
  for (const font of testFonts) {
    for (const baseFont of baseFonts) {
      ctx.font = `72px '${font}', ${baseFont}`;
      const metrics = ctx.measureText('mmmmmmmmmmlli');
      // Check if this font differs from the base font alone
      ctx.font = `72px ${baseFont}`;
      const baseMetrics = ctx.measureText('mmmmmmmmmmlli');
      if (metrics.width !== baseMetrics.width) {
        detected.push(font);
        break;
      }
    }
  }
  detected.sort();
  return detected;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function BrowserFingerprintPage() {
  const [categories, setCategories] = useState<FingerprintCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [privacyScore, setPrivacyScore] = useState<number>(0);
  const [totalBits, setTotalBits] = useState(0);
  const [overallHash, setOverallHash] = useState('');

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyAll = useCallback(() => {
    const text = categories
      .map((c) => `## ${c.label}\n${c.items.map((i) => `${i.label}: ${i.value}`).join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Full fingerprint data copied to clipboard'),
      () => toast.error('Failed to copy'),
    );
  }, [categories]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      // Canvas
      const canvasFP = getCanvasFingerprint();

      // WebGL
      const webglFP = getWebGLFingerprint();

      // Audio (async)
      const audioFP = await getAudioFingerprint();

      // Navigator properties
      const navItems: FingerprintItem[] = [
        { label: 'User Agent', value: navigator.userAgent, bits: 10, detail: 'Combines browser, OS, and engine versions. Can uniquely identify ~1 in 1,500–10,000 browsers.' },
        { label: 'Platform', value: navigator.platform || 'Unknown', bits: 2, detail: 'OS platform (e.g., MacIntel, Win32, Linux x86_64).' },
        { label: 'Language', value: navigator.language, bits: 5, detail: 'Primary language preference. Combined with secondary languages, highly identifying.' },
        { label: 'Languages', value: [...navigator.languages].join(', '), bits: 8, detail: 'Accept-Language list — very unique combination in multilingual users.' },
        { label: 'Hardware Concurrency', value: `${navigator.hardwareConcurrency || 'Unknown'} cores`, bits: 4, detail: 'Logical CPU cores. Reveals CPU tier (e.g., 8 cores = recent laptop, 4 = older, 16+ = workstation).' },
        { label: 'Device Memory', value: `${(navigator as any).deviceMemory || 'Unknown'} GB`, bits: 3, detail: 'RAM reported to browser. 4 common values = ~2 bits of entropy.' },
        { label: 'Max Touch Points', value: `${navigator.maxTouchPoints}`, bits: 2, detail: '> 0 typically means a touchscreen device. 0 = desktop.' },
        { label: 'Cookie Enabled', value: navigator.cookieEnabled ? 'Yes' : 'No', bits: 0, detail: 'Nearly always true; negligible entropy.' },
        { label: 'Do Not Track', value: navigator.doNotTrack || 'Not set', bits: 2, detail: 'DNT header. ~10-20% of users have it set, mainly in privacy-conscious browsers.' },
        { label: 'Vendor', value: navigator.vendor || 'Unknown', bits: 2, detail: 'Browser vendor string (e.g., Google Inc., Apple Computer).' },
      ];

      // Screen
      const screenItems: FingerprintItem[] = [
        { label: 'Screen Resolution', value: `${screen.width}×${screen.height}`, bits: 4, detail: 'Total screen size (not viewport). Common resolutions cluster, but combined with other factors adds bits.' },
        { label: 'Available Screen', value: `${screen.availWidth}×${screen.availHeight}`, bits: 3, detail: 'Screen minus OS taskbar/dock — reveals OS configuration.' },
        { label: 'Color Depth', value: `${screen.colorDepth}-bit`, bits: 1, detail: 'Typically 24 or 30. Minor entropy.' },
        { label: 'Pixel Ratio', value: `${window.devicePixelRatio}`, bits: 3, detail: '1 = standard, 2 = Retina/HiDPI, 3 = high-end mobile. Reveals display class.' },
      ];

      // Time & Locale
      const timeItems: FingerprintItem[] = [
        { label: 'Timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone, bits: 6, detail: 'IANA timezone. ~400 zones = ~8 bits theoretical, ~6 practical (clusters).' },
        { label: 'Timezone Offset', value: `${new Date().getTimezoneOffset()} minutes`, bits: 5, detail: 'UTC offset. Combined with timezone, can reveal DST observance.' },
        { label: 'Calendar', value: new Intl.DateTimeFormat().resolvedOptions().calendar, bits: 1, detail: 'Usually gregorian. Persian, Buddhist, etc. are very identifying.' },
        { label: 'Number Format', value: new Intl.NumberFormat().resolvedOptions().locale, bits: 5, detail: 'Locale for number formatting (thousands separator, decimal).' },
      ];

      // Fonts
      const fontList = getFontList();
      const fontItems: FingerprintItem[] = [
        { label: 'Detected Fonts', value: `${fontList.length} fonts detected`, bits: Math.min(20, Math.round(fontList.length * 0.3)),
          detail: `Detected: ${fontList.slice(0, 30).join(', ')}${fontList.length > 30 ? `... and ${fontList.length - 30} more` : ''}` },
        { label: 'System Font Stack', value: fontList.filter(f => ['Segoe UI', 'SF Pro', 'Helvetica', 'Cantarell', 'DejaVu Sans'].some(s => f.includes(s))).join(', ') || 'Custom/None detected', bits: 3,
          detail: 'Presence of OS-specific fonts reveals your operating system.' },
      ];

      // Canvas & Audio
      const canvasItems: FingerprintItem[] = [
        { label: 'Canvas Hash', value: canvasFP.value, bits: canvasFP.bits, detail: canvasFP.detail },
      ];

      const audioItems: FingerprintItem[] = [
        { label: 'AudioContext Hash', value: audioFP.value, bits: audioFP.bits, detail: audioFP.detail },
      ];

      const webglItems: FingerprintItem[] = [
        { label: 'WebGL Renderer', value: webglFP.value, bits: webglFP.bits, detail: webglFP.detail },
      ];

      const allCategories: FingerprintCategory[] = [
        { id: 'navigator', label: 'Navigator Properties', icon: Cpu, items: navItems, summary: 'Core browser identity fields sent with every request.' },
        { id: 'screen', label: 'Screen & Display', icon: Monitor, items: screenItems, summary: 'Screen dimensions reveal display configuration and OS chrome.' },
        { id: 'time', label: 'Time & Locale', icon: Clock, items: timeItems, summary: 'Timezone, locale, and calendar preferences uniquely identify geographic/linguistic groups.' },
        { id: 'fonts', label: 'Font Enumeration', icon: Type, items: fontItems, summary: 'The list of installed fonts is one of the most identifying browser signals.' },
        { id: 'canvas', label: 'Canvas Fingerprint', icon: Hash, items: canvasItems, summary: 'Slight rendering differences from GPU/driver/OS produce a unique image hash.' },
        { id: 'webgl', label: 'WebGL Fingerprint', icon: Gauge, items: webglItems, summary: 'GPU vendor, renderer, and capabilities exposed through WebGL — often uniquely identifying.' },
        { id: 'audio', label: 'Audio Context', icon: Gauge, items: audioItems, summary: 'Audio DSP processing differences create a unique signature from oscillator output.' },
      ];

      // Calculate totals
      let bits = 0;
      allCategories.forEach((c) => {
        c.items.forEach((i) => bits += i.bits);
      });

      // Privacy score: invert bits (fewer bits = better privacy)
      // Max theoretical ~100 bits; score 0-100 where 100 = best privacy
      const score = Math.max(0, Math.min(100, Math.round(100 - bits)));

      // Overall hash: combine all unique values
      const allValues = allCategories.flatMap(c => c.items.map(i => i.value));
      const oh = hashString(allValues.join('||'));

      setCategories(allCategories);
      setTotalBits(bits);
      setPrivacyScore(score);
      setOverallHash(oh);
      setLoading(false);

      // Expand all by default
      setExpandedSections(new Set(allCategories.map(c => c.id)));
    };

    run();
  }, []);

  // ── Score color ──────────────────────────────────────────────────────────

  const scoreColor = privacyScore >= 80
    ? 'text-emerald-400'
    : privacyScore >= 50
    ? 'text-amber-400'
    : 'text-red-400';

  const scoreBg = privacyScore >= 80
    ? 'bg-emerald-400/10 border-emerald-400/30'
    : privacyScore >= 50
    ? 'bg-amber-400/10 border-amber-400/30'
    : 'bg-red-400/10 border-red-400/30';

  const ScoreIcon = privacyScore >= 80 ? ShieldCheck : privacyScore >= 50 ? ShieldAlert : AlertTriangle;

  return (
    <ToolLayout
      title="Browser Fingerprint Analyzer"
      description="Discover what makes your browser uniquely identifiable — canvas, WebGL, fonts, audio, and navigator signals. Understand your digital fingerprint and learn how tracking works."
    >
      <div className="space-y-6">
        {/* Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`rounded-xl border p-5 flex items-center gap-4 ${scoreBg}`}>
            <ScoreIcon className={`w-8 h-8 ${scoreColor} shrink-0`} />
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Privacy Score</div>
              <div className={`text-2xl font-bold ${scoreColor}`}>{privacyScore}<span className="text-sm">/100</span></div>
              <div className="text-xs text-slate-400 mt-0.5">
                {privacyScore >= 80 ? 'Excellent privacy' : privacyScore >= 50 ? 'Moderate exposure' : 'Highly identifiable'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 flex items-center gap-4">
            <Fingerprint className="w-8 h-8 text-brand-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Identifying Bits</div>
              <div className="text-2xl font-bold text-white">{totalBits}</div>
              <div className="text-xs text-slate-400 mt-0.5">1 in ~{Math.pow(2, totalBits).toLocaleString(undefined, { maximumFractionDigits: 0 })} uniqueness</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 flex items-center gap-4">
            <Hash className="w-8 h-8 text-purple-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Your Fingerprint</div>
              <div className="text-lg font-bold text-white font-mono">{overallHash.slice(0, 12)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Unique session hash</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-brand-400" />
            <h2 className="font-semibold text-white">Understanding Browser Fingerprinting</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every browser leaves a unique trail of characteristics — screen size, installed fonts, GPU model,
            timezone, language settings, and subtle rendering artifacts. Combined, these signals can identify
            you among millions of users without cookies or IP addresses. This tool reveals exactly what your
            browser exposes. <span className="text-brand-400">Everything runs client-side — no data is ever collected.</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-purple-400/10 text-purple-300 border border-purple-400/20">
              Canvas &amp; WebGL: GPU/driver artifacts
            </span>
            <span className="px-2 py-1 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
              Fonts: OS &amp; app fingerprint
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Navigator: Browser identity
            </span>
            <span className="px-2 py-1 rounded-full bg-rose-400/10 text-rose-300 border border-rose-400/20">
              Audio: DSP stack signature
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600/50 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Analysis
          </button>
          <button
            onClick={copyAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/10 border border-brand-500/30 text-sm text-brand-300 hover:bg-brand-500/20 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Full Report
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {categories.map((category) => {
            const isOpen = expandedSections.has(category.id);
            const Icon = category.icon;
            const catBits = category.items.reduce((s, i) => s + i.bits, 0);
            const catPercent = totalBits > 0 ? Math.round((catBits / totalBits) * 100) : 0;

            return (
              <div key={category.id} className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
                <button
                  onClick={() => toggleSection(category.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-700/30 transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">{category.label}</span>
                      <span className="text-xs text-slate-500">{catBits} bits ({catPercent}%)</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{category.summary}</p>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="px-5 py-3 hover:bg-slate-700/20 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white">{item.label}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.detail}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
                              ~{item.bits} bits
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <code className="block w-full px-3 py-2 rounded-lg bg-slate-900/50 text-xs text-slate-300 font-mono break-all border border-slate-700/30">
                            {item.value}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Privacy Tips */}
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white">How to Reduce Your Fingerprint</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Brave Browser</strong> — Built-in fingerprint randomization for Canvas, WebGL, and AudioContext. Most effective out of the box.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Firefox + ResistFingerprinting</strong> — Set <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">privacy.resistFingerprinting</code> to <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">true</code> in about:config.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Tor Browser</strong> — Standardizes fingerprinting vectors across all users. All Tor users have identical canvas and font fingerprints.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Disable JavaScript</strong> — The nuclear option. No JS = no canvas/WebGL/audio fingerprinting, but breaks most sites.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Canvas Blocker extensions</strong> — Inject noise into canvas/WebGL reads. Available for Chrome and Firefox.</span>
            </li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
