'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Fingerprint,
  Monitor,
  Globe,
  Layers,
  Shield,
  Wifi,
  HardDrive,
  BatteryFull,
  Palette,
  AlertTriangle,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types

interface FingerprintData {
  userAgent: string;
  platform: string;
  vendor: string;
  language: string;
  languages: readonly string[];
  timezone: string;
  timezoneOffset: number;
  screenResolution: string;
  screenSize: string;
  colorDepth: number;
  pixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory: string;
  touchPoints: number;
  touchSupport: boolean;
  cookiesEnabled: boolean;
  doNotTrack: string;
  plugins: string[];
  canvasHash: string;
  webglRenderer: string;
  webglVendor: string;
  audioFingerprint: string;
  fonts: string[];
  connectionType: string;
  connectionDownlink: string;
  connectionRtt: string;
  batteryLevel: string;
  batteryCharging: string;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  oscpu: string;
  productSub: string;
  buildID: string;
  pdfViewer: boolean;
  adBlocker: boolean;
  privateMode: boolean | null;
}

// ── Helpers

function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unsupported';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser Fingerprint 12345', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser Fingerprint 12345', 4, 17);

    ctx.beginPath();
    ctx.arc(150, 45, 10, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fillStyle = '#f0f';
    ctx.fill();

    return hashString(canvas.toDataURL());
  } catch {
    return 'blocked';
  }
}

function getWebGLInfo(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { renderer: 'unsupported', vendor: 'unsupported' };

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return {
        renderer: debugInfo.getParameter((gl as any).UNMASKED_RENDERER_WEBGL || 0x9246),
        vendor: debugInfo.getParameter((gl as any).UNMASKED_VENDOR_WEBGL || 0x9245),
      };
    }
    return { renderer: 'masked', vendor: 'masked' };
  } catch {
    return { renderer: 'error', vendor: 'error' };
  }
}

async function getAudioFingerprint(): Promise<string> {
  try {
    const ctx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100, 44100);
    const oscillator = ctx.createOscillator();
    const compressor = ctx.createDynamicsCompressor();
    const analyser = ctx.createAnalyser();

    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;
    analyser.fftSize = 256;

    oscillator.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(ctx.destination);

    oscillator.start(0);

    const buffer = await ctx.startRendering();
    const data = new Float32Array(buffer.length);
    buffer.copyFromChannel(data, 0);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += Math.abs(data[i]);
    }

    return hashString(sum.toFixed(10));
  } catch {
    return 'blocked';
  }
}

async function detectFonts(): Promise<string[]> {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Comic Sans MS', 'Trebuchet MS', 'Impact', 'Helvetica', 'Tahoma',
    'Palatino Linotype', 'Lucida Console', 'Consolas', 'Monaco',
    'Segoe UI', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Source Code Pro', 'Fira Code', 'JetBrains Mono', 'Cascadia Code',
    'SF Mono', 'Menlo', 'DejaVu Sans Mono', 'Liberation Mono',
    'Noto Sans', 'Ubuntu', 'Droid Sans',
  ];

  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.font = '12px serif';
  const baseWidth = ctx.measureText('mmmmmmmmmmmmmmmm').width;

  const detected: string[] = [];

  for (const font of testFonts) {
    for (const baseFont of baseFonts) {
      ctx.font = `12px '${font}', ${baseFont}`;
      const width = ctx.measureText('mmmmmmmmmmmmmmmm').width;
      if (width !== baseWidth) {
        detected.push(font);
        break;
      }
    }
  }

  return detected;
}

function getPlugins(): string[] {
  const plugins: string[] = [];
  const nav = navigator as any;

  if (nav.plugins) {
    for (let i = 0; i < nav.plugins.length; i++) {
      const name = nav.plugins[i].name;
      if (name) plugins.push(name);
    }
  }

  return plugins;
}

async function collectFingerprint(): Promise<FingerprintData> {
  const nav = navigator as any;
  const scr = screen;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  let localStorageOk = false;
  let sessionStorageOk = false;
  let indexedDBOk = false;
  try { localStorageOk = !!window.localStorage; } catch { /* */ }
  try { sessionStorageOk = !!window.sessionStorage; } catch { /* */ }
  try { indexedDBOk = !!window.indexedDB; } catch { /* */ }

  let adBlocker = false;
  try {
    const test = document.createElement('div');
    test.innerHTML = '&nbsp;';
    test.className = 'adsbox';
    test.style.position = 'absolute';
    test.style.top = '-100px';
    document.body.appendChild(test);
    await new Promise(r => requestAnimationFrame(r));
    adBlocker = test.offsetHeight === 0 || test.offsetParent === null;
    document.body.removeChild(test);
  } catch { /* */ }

  let privateMode: boolean | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('__fp_test__');
      req.onsuccess = () => { req.result.close(); indexedDB.deleteDatabase('__fp_test__'); resolve(); };
      req.onerror = () => reject();
      setTimeout(() => reject(), 100);
    });
    privateMode = false;
  } catch {
    try {
      localStorage.setItem('__fp_test__', '1');
      localStorage.removeItem('__fp_test__');
      privateMode = false;
    } catch {
      privateMode = true;
    }
  }

  let batteryLevel = 'unavailable';
  let batteryCharging = 'unavailable';
  try {
    const battery = await (nav.getBattery?.());
    if (battery) {
      batteryLevel = `${Math.round(battery.level * 100)}%`;
      batteryCharging = battery.charging ? 'yes' : 'no';
    }
  } catch { /* */ }

  let deviceMemory = 'unknown';
  try { deviceMemory = nav.deviceMemory ? `${nav.deviceMemory} GB` : 'unknown'; } catch { /* */ }

  const canvasHash = await getCanvasFingerprint();
  const webgl = getWebGLInfo();
  const audioHash = await getAudioFingerprint();
  const fonts = await detectFonts();

  return {
    userAgent: nav.userAgent,
    platform: nav.platform || 'unknown',
    vendor: nav.vendor || 'unknown',
    language: nav.language || 'unknown',
    languages: nav.languages || [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    screenResolution: `${scr.width}x${scr.height}`,
    screenSize: `${scr.availWidth}x${scr.availHeight}`,
    colorDepth: scr.colorDepth,
    pixelRatio: window.devicePixelRatio,
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    deviceMemory,
    touchPoints: nav.maxTouchPoints || 0,
    touchSupport: 'ontouchstart' in window,
    cookiesEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack || nav.msDoNotTrack || (window as any).doNotTrack || 'unspecified',
    plugins: getPlugins(),
    canvasHash,
    webglRenderer: webgl.renderer,
    webglVendor: webgl.vendor,
    audioFingerprint: audioHash,
    fonts,
    connectionType: conn?.effectiveType || 'unknown',
    connectionDownlink: conn ? `${conn.downlink} Mbps` : 'unknown',
    connectionRtt: conn ? `${conn.rtt}ms` : 'unknown',
    batteryLevel,
    batteryCharging,
    localStorage: localStorageOk,
    sessionStorage: sessionStorageOk,
    indexedDB: indexedDBOk,
    oscpu: nav.oscpu || 'unknown',
    productSub: nav.productSub || 'unknown',
    buildID: nav.buildID || 'unknown',
    pdfViewer: !!nav.pdfViewerEnabled,
    adBlocker,
    privateMode,
  };
}

function computeEntropy(data: FingerprintData): number {
  let score = 0;
  const uaEntropy = Math.min(data.userAgent.length * 2, 100);
  score += uaEntropy;

  const [w, h] = data.screenResolution.split('x').map(Number);
  score += Math.min((w * h) / 50000, 40);

  score += 15;
  score += Math.min(data.languages.length * 8, 24);
  score += data.hardwareConcurrency > 0 ? 12 : 0;
  score += data.deviceMemory !== 'unknown' ? 12 : 0;
  score += data.canvasHash !== 'unsupported' && data.canvasHash !== 'blocked' ? 25 : 0;
  score += data.audioFingerprint !== 'unsupported' && data.audioFingerprint !== 'blocked' ? 25 : 0;
  score += data.webglRenderer !== 'unsupported' && data.webglRenderer !== 'masked' ? 20 : 0;
  score += Math.min(data.fonts.length * 3, 45);
  score += Math.min(data.plugins.length * 4, 20);
  score += data.connectionType !== 'unknown' ? 8 : 0;
  score += data.batteryLevel !== 'unavailable' ? 8 : 0;
  score += data.touchSupport ? 5 : 0;
  score += data.touchPoints * 2;

  const uniqueStr = `${data.canvasHash}-${data.audioFingerprint}-${data.webglRenderer}-${data.fonts.length}-${data.screenResolution}-${data.timezone}`;
  score += hashString(uniqueStr).length * 0.5;

  return Math.min(Math.round(score), 100);
}

function getPrivacyScore(entropy: number) {
  if (entropy < 30) return { label: 'Very Private', color: 'text-green-400' };
  if (entropy < 50) return { label: 'Private', color: 'text-green-300' };
  if (entropy < 65) return { label: 'Moderately Identifiable', color: 'text-yellow-400' };
  if (entropy < 80) return { label: 'Identifiable', color: 'text-orange-400' };
  return { label: 'Highly Unique', color: 'text-red-400' };
}

const ENTROPY_COLORS: Record<string, string> = {
  'Very Private': 'text-green-400 bg-green-500',
  'Private': 'text-green-300 bg-green-400',
  'Moderately Identifiable': 'text-yellow-400 bg-yellow-500',
  'Identifiable': 'text-orange-400 bg-orange-500',
  'Highly Unique': 'text-red-400 bg-red-500',
};

// ── Section Component

function FPSection({
  icon: Icon,
  title,
  items,
}: {
  icon: any;
  title: string;
  items: { label: string; value: string; mono?: boolean; highlight?: boolean }[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card border border-slate-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-brand-400" />
          <h3 className="text-white font-semibold text-sm">{title}</h3>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-0.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between py-2 px-3 rounded hover:bg-surface/50 transition-colors gap-4">
              <span className="text-slate-400 text-sm shrink-0">{item.label}</span>
              <span
                className={`text-sm text-right break-all ${
                  item.highlight
                    ? 'text-brand-300 font-mono font-semibold'
                    : item.mono
                    ? 'text-slate-300 font-mono'
                    : 'text-slate-200'
                }`}
              >
                {item.value || <span className="text-slate-600 italic">unknown</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component

export default function BrowserFingerprintPage() {
  const [data, setData] = useState<FingerprintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fp = await collectFingerprint();
      setData(fp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Collection error');
      toast.error('Fingerprint collection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    collect();
  }, [collect]);

  const entropy = useMemo(() => (data ? computeEntropy(data) : 0), [data]);
  const privacyScore = useMemo(() => getPrivacyScore(entropy), [entropy]);
  const barColor = ENTROPY_COLORS[privacyScore.label]?.split(' ')[1] || 'bg-green-500';

  const copyReport = useCallback(async () => {
    if (!data) return;
    const lines = [
      '=== Browser Fingerprint Report ===',
      '',
      '-- System --',
      `User Agent: ${data.userAgent}`,
      `Platform: ${data.platform}`,
      `CPU: ${data.oscpu}`,
      `Cores: ${data.hardwareConcurrency}`,
      `Memory: ${data.deviceMemory}`,
      '',
      '-- Display --',
      `Resolution: ${data.screenResolution}`,
      `Available: ${data.screenSize}`,
      `Color Depth: ${data.colorDepth}`,
      `Pixel Ratio: ${data.pixelRatio}`,
      '',
      '-- Locale --',
      `Timezone: ${data.timezone} (GMT${data.timezoneOffset > 0 ? '-' : '+'}${Math.abs(data.timezoneOffset) / 60})`,
      `Language: ${data.language}`,
      `Languages: ${data.languages.join(', ')}`,
      '',
      '-- Fingerprints --',
      `Canvas: ${data.canvasHash}`,
      `Audio: ${data.audioFingerprint}`,
      `WebGL Renderer: ${data.webglRenderer}`,
      `WebGL Vendor: ${data.webglVendor}`,
      '',
      '-- Privacy --',
      `Do Not Track: ${data.doNotTrack}`,
      `Ad Blocker: ${data.adBlocker ? 'Yes' : 'No'}`,
      `Private Mode: ${data.privateMode === null ? 'Unknown' : data.privateMode ? 'Likely' : 'Unlikely'}`,
      `Privacy Score: ${entropy}/100 - ${privacyScore.label}`,
      '',
      `Fonts: ${data.fonts.length} detected`,
      `Plugins: ${data.plugins.length} found`,
      '',
      'Generated by DevBench Browser Fingerprint',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Report copied!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [data, entropy, privacyScore]);

  if (loading && !data) {
    return (
      <ToolLayout
        title="Browser Fingerprint"
        description="See what data your browser exposes — canvas hash, audio fingerprint, WebGL info, fonts, and more."
      >
        <div className="py-24 text-center">
          <Fingerprint className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400 text-sm">Collecting fingerprint data...</p>
        </div>
      </ToolLayout>
    );
  }

  return (
    <ToolLayout
      title="Browser Fingerprint"
      description="See what data your browser exposes — canvas hash, audio fingerprint, WebGL info, fonts, and more. Understand your digital fingerprint and privacy exposure."
    >
      {/* Score Banner */}
      {data && (
        <div className="mb-8">
          <div className="card border border-slate-700/50 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-700" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${entropy} 100`}
                      className={privacyScore.color.replace('text-', 'text-').replace('400', '400').replace('300', '300')}
                      style={{ color: entropy < 30 ? '#4ade80' : entropy < 50 ? '#86efac' : entropy < 65 ? '#facc15' : entropy < 80 ? '#fb923c' : '#f87171' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold font-mono text-white">{entropy}</span>
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Fingerprint className={`w-5 h-5 ${privacyScore.color}`} />
                    <span className={privacyScore.color}>{privacyScore.label}</span>
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">Uniqueness score: {entropy}/100</p>
                  <p className="text-slate-500 text-xs mt-1">Higher = more identifiable across sites</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={collect} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface border border-slate-700/50 transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <button onClick={copyReport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30 transition-colors">
                  <Copy className="w-4 h-4" /> Copy Report
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Anonymous</span><span>Unique</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${entropy}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card border border-red-500/30 bg-red-500/5 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-medium">Collection Error</p>
              <p className="text-red-300/70 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <FPSection icon={Monitor} title="System & Hardware" items={[
            { label: 'User Agent', value: data.userAgent, mono: true, highlight: true },
            { label: 'Platform', value: data.platform, mono: true },
            { label: 'OS CPU', value: data.oscpu, mono: true },
            { label: 'Vendor', value: data.vendor },
            { label: 'CPU Cores', value: data.hardwareConcurrency ? String(data.hardwareConcurrency) : 'unknown' },
            { label: 'Memory', value: data.deviceMemory },
          ]} />

          <FPSection icon={Layers} title="Display & Rendering" items={[
            { label: 'Resolution', value: data.screenResolution },
            { label: 'Available Area', value: data.screenSize },
            { label: 'Color Depth', value: `${data.colorDepth}-bit` },
            { label: 'Pixel Ratio', value: String(data.pixelRatio) },
            { label: 'Touch Support', value: data.touchSupport ? `${data.touchPoints} points` : 'None' },
          ]} />

          <FPSection icon={Globe} title="Locale & Time" items={[
            { label: 'Timezone', value: data.timezone },
            { label: 'UTC Offset', value: `GMT${data.timezoneOffset > 0 ? '-' : '+'}${Math.abs(data.timezoneOffset) / 60}` },
            { label: 'Primary Language', value: data.language },
            { label: 'All Languages', value: data.languages.join(', ') || '—' },
          ]} />

          <FPSection icon={Fingerprint} title="Digital Fingerprints" items={[
            { label: 'Canvas Hash', value: data.canvasHash, mono: true, highlight: true },
            { label: 'Audio Fingerprint', value: data.audioFingerprint, mono: true, highlight: true },
            { label: 'WebGL Renderer', value: data.webglRenderer, mono: true, highlight: true },
            { label: 'WebGL Vendor', value: data.webglVendor, mono: true },
          ]} />

          <FPSection icon={Palette} title="Fonts Detected" items={[
            { label: 'Count', value: `${data.fonts.length} fonts` },
            { label: 'List', value: data.fonts.length > 0 ? data.fonts.slice(0, 25).join(', ') + (data.fonts.length > 25 ? ` +${data.fonts.length - 25} more` : '') : 'None detected' },
          ]} />

          <FPSection icon={Wifi} title="Network & Connection" items={[
            { label: 'Connection Type', value: data.connectionType },
            { label: 'Downlink', value: data.connectionDownlink },
            { label: 'RTT', value: data.connectionRtt },
            { label: 'Cookies', value: data.cookiesEnabled ? 'Enabled' : 'Disabled' },
          ]} />

          <FPSection icon={Shield} title="Privacy Signals" items={[
            { label: 'Do Not Track', value: data.doNotTrack },
            { label: 'Ad Blocker', value: data.adBlocker ? 'Detected' : 'Not detected' },
            { label: 'Private Mode', value: data.privateMode === null ? 'Unknown' : data.privateMode ? 'Likely' : 'Unlikely' },
            { label: 'PDF Viewer', value: data.pdfViewer ? 'Enabled' : 'Disabled' },
          ]} />

          <FPSection icon={HardDrive} title="Storage APIs" items={[
            { label: 'localStorage', value: data.localStorage ? 'Available' : 'Blocked' },
            { label: 'sessionStorage', value: data.sessionStorage ? 'Available' : 'Blocked' },
            { label: 'IndexedDB', value: data.indexedDB ? 'Available' : 'Blocked' },
          ]} />

          {data.batteryLevel !== 'unavailable' && (
            <FPSection icon={BatteryFull} title="Battery" items={[
              { label: 'Level', value: data.batteryLevel },
              { label: 'Charging', value: data.batteryCharging },
            ]} />
          )}

          {data.plugins.length > 0 && (
            <FPSection icon={Layers} title="Browser Plugins" items={
              data.plugins.slice(0, 20).map(n => ({ label: '', value: n, mono: true }))
            } />
          )}
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-blue-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Why This Matters</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unlike cookies, browser fingerprinting is passive and hard to block. Canvas hash,
            fonts, and WebGL can uniquely identify you even in incognito mode.
          </p>
        </div>
        <div className="card border-l-4 border-l-green-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Reduce Exposure</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Brave, Tor, or Firefox with resistFingerprinting reduce entropy. Disable WebGL,
            limit font access, or use randomized fingerprint extensions.
          </p>
        </div>
        <div className="card border-l-4 border-l-yellow-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">100% Client-Side</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All collection happens in your browser. Nothing is sent to any server —
            this demonstrates what any website can silently collect.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
