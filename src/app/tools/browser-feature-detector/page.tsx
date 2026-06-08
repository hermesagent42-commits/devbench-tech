'use client';

import { useState, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Monitor, Check, X, Search, Copy, ChevronDown,
  Shield, Cpu, HardDrive, Wifi, Camera, Globe, RefreshCw,
  Image, Layers, PaintBucket, Gauge, Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface FeatureResult {
  name: string;
  supported: boolean;
  value?: string;
  detail?: string;
}

interface Category {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  features: FeatureResult[];
}

// ── Detection Logic ────────────────────────────────────────────────────────

function detectSupport(): Category[] {
  const results: Category[] = [];

  // Graphics & Rendering
  const graphicsFeatures: FeatureResult[] = [];
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  const glInfo = gl ? (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER) : 'Not supported';

  graphicsFeatures.push({ name: 'WebGL', supported: !!canvas.getContext('webgl'), detail: '3D graphics rendering API' });
  graphicsFeatures.push({ name: 'WebGL 2', supported: !!canvas.getContext('webgl2'), detail: 'Next-gen 3D graphics' });
  graphicsFeatures.push({ name: 'WebGPU', supported: 'gpu' in navigator, detail: 'Modern GPU compute & rendering' });
  graphicsFeatures.push({ name: 'Canvas 2D', supported: !!canvas.getContext('2d'), detail: '2D drawing surface' });
  graphicsFeatures.push({ name: 'OffscreenCanvas', supported: typeof OffscreenCanvas !== 'undefined', detail: 'Canvas rendering in workers' });
  graphicsFeatures.push({ name: 'ImageBitmap', supported: typeof createImageBitmap !== 'undefined', detail: 'Async image decoding' });
  graphicsFeatures.push({ name: 'GPU Renderer', supported: !!glInfo, value: glInfo, detail: 'Hardware GPU info' });

  results.push({ label: 'Graphics & Rendering', icon: Image, features: graphicsFeatures });

  // Storage
  const storageFeatures: FeatureResult[] = [];
  storageFeatures.push({ name: 'localStorage', supported: typeof localStorage !== 'undefined', detail: 'Persistent key-value storage' });
  storageFeatures.push({ name: 'sessionStorage', supported: typeof sessionStorage !== 'undefined', detail: 'Session-only storage' });
  storageFeatures.push({ name: 'IndexedDB', supported: 'indexedDB' in window, detail: 'Structured data storage' });
  storageFeatures.push({ name: 'Cache API', supported: 'caches' in window, detail: 'Request/response caching' });
  storageFeatures.push({ name: 'Cookie Store API', supported: 'cookieStore' in window, detail: 'Async cookie access' });

  results.push({ label: 'Storage', icon: HardDrive, features: storageFeatures });

  // Network & Connectivity
  const netFeatures: FeatureResult[] = [];
  netFeatures.push({ name: 'Fetch API', supported: typeof fetch !== 'undefined', detail: 'Modern HTTP requests' });
  netFeatures.push({ name: 'WebSocket', supported: 'WebSocket' in window, detail: 'Bidirectional communication' });
  netFeatures.push({ name: 'WebRTC', supported: 'RTCPeerConnection' in window, detail: 'Real-time peer-to-peer' });
  netFeatures.push({ name: 'EventSource (SSE)', supported: 'EventSource' in window, detail: 'Server-sent events' });
  netFeatures.push({ name: 'Beacon API', supported: 'sendBeacon' in navigator, detail: 'Background data sending' });
  netFeatures.push({ name: 'WebTransport', supported: 'WebTransport' in window, detail: 'Low-latency transport (QUIC/HTTP3)' });

  results.push({ label: 'Network & Connectivity', icon: Wifi, features: netFeatures });

  // Media
  const mediaFeatures: FeatureResult[] = [];
  const audio = document.createElement('audio');
  const video = document.createElement('video');

  mediaFeatures.push({ name: 'Audio API', supported: !!audio.canPlayType, detail: 'Audio playback support' });
  mediaFeatures.push({ name: 'Video API', supported: !!video.canPlayType, detail: 'Video playback support' });
  mediaFeatures.push({ name: 'Web Audio API', supported: 'AudioContext' in window || 'webkitAudioContext' in window, detail: 'Advanced audio processing' });
  mediaFeatures.push({ name: 'Speech Synthesis', supported: 'speechSynthesis' in window, detail: 'Text-to-speech output' });
  mediaFeatures.push({ name: 'Speech Recognition', supported: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window, detail: 'Voice input' });
  mediaFeatures.push({ name: 'Media Capture (camera/mic)', supported: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices, detail: 'Camera & microphone access' });
  mediaFeatures.push({ name: 'MediaRecorder', supported: typeof MediaRecorder !== 'undefined', detail: 'Record audio/video streams' });
  mediaFeatures.push({ name: 'Screen Capture', supported: 'mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices, detail: 'Screen sharing' });
  mediaFeatures.push({ name: 'Picture-in-Picture', supported: 'pictureInPictureEnabled' in document, detail: 'Floating video window' });

  results.push({ label: 'Media', icon: Camera, features: mediaFeatures });

  // Sensors & Hardware
  const sensorFeatures: FeatureResult[] = [];
  sensorFeatures.push({ name: 'Geolocation', supported: 'geolocation' in navigator, detail: 'GPS / location data' });
  sensorFeatures.push({ name: 'Device Orientation', supported: 'DeviceOrientationEvent' in window, detail: 'Tilt & rotation' });
  sensorFeatures.push({ name: 'Device Motion', supported: 'DeviceMotionEvent' in window, detail: 'Acceleration data' });
  sensorFeatures.push({ name: 'Battery Status', supported: 'getBattery' in navigator, detail: 'Battery level & charging' });
  sensorFeatures.push({ name: 'Vibration API', supported: 'vibrate' in navigator, detail: 'Haptic feedback' });
  sensorFeatures.push({ name: 'Gamepad API', supported: 'getGamepads' in navigator, detail: 'Controller support' });
  sensorFeatures.push({ name: 'Proximity Sensor', supported: 'ProximitySensor' in window, detail: 'Nearby object detection' });
  sensorFeatures.push({ name: 'Ambient Light Sensor', supported: 'AmbientLightSensor' in window, detail: 'Light level detection' });

  results.push({ label: 'Sensors & Hardware', icon: Cpu, features: sensorFeatures });

  // Security
  const securityFeatures: FeatureResult[] = [];
  securityFeatures.push({ name: 'Crypto API (Web Crypto)', supported: 'crypto' in window && 'subtle' in crypto, detail: 'Cryptographic operations' });
  securityFeatures.push({ name: 'HTTPS', supported: location.protocol === 'https:', detail: 'Secure connection' });
  securityFeatures.push({ name: 'Content Security Policy', supported: 'securityPolicyViolation' in window, detail: 'CSP reporting' });
  securityFeatures.push({ name: 'Permissions API', supported: 'permissions' in navigator, detail: 'Query permission state' });
  securityFeatures.push({ name: 'Credential Management', supported: 'PasswordCredential' in window || 'FederatedCredential' in window, detail: 'Password/passkey management' });
  securityFeatures.push({ name: 'WebAuthn (Passkeys)', supported: 'PublicKeyCredential' in window, detail: 'Hardware-backed authentication' });

  results.push({ label: 'Security', icon: Shield, features: securityFeatures });

  // Performance
  const perfFeatures: FeatureResult[] = [];
  perfFeatures.push({ name: 'Performance API', supported: 'performance' in window, detail: 'Timing & navigation metrics' });
  perfFeatures.push({ name: 'Performance Observer', supported: 'PerformanceObserver' in window, detail: 'Real-time perf monitoring' });
  perfFeatures.push({ name: 'Navigation Timing', supported: 'performance' in window && 'getEntriesByType' in performance, detail: 'Page load metrics' });
  perfFeatures.push({ name: 'Resource Timing', supported: 'performance' in window && 'getEntriesByType' in performance, detail: 'Network request timing' });
  perfFeatures.push({ name: 'User Timing (marks)', supported: 'performance' in window && 'mark' in performance, detail: 'Custom performance marks' });
  perfFeatures.push({ name: 'requestIdleCallback', supported: 'requestIdleCallback' in window, detail: 'Background task scheduling' });

  results.push({ label: 'Performance', icon: Gauge, features: perfFeatures });

  // UI & Input
  const uiFeatures: FeatureResult[] = [];
  uiFeatures.push({ name: 'Intersection Observer', supported: 'IntersectionObserver' in window, detail: 'Element visibility tracking' });
  uiFeatures.push({ name: 'Resize Observer', supported: 'ResizeObserver' in window, detail: 'Element size changes' });
  uiFeatures.push({ name: 'Mutation Observer', supported: 'MutationObserver' in window, detail: 'DOM change monitoring' });
  uiFeatures.push({ name: 'Fullscreen API', supported: 'fullscreenEnabled' in document, detail: 'Full-screen mode' });
  uiFeatures.push({ name: 'Clipboard API', supported: 'clipboard' in navigator, detail: 'Read/write clipboard async' });
  uiFeatures.push({ name: 'Notification API', supported: 'Notification' in window, detail: 'Desktop notifications' });
  uiFeatures.push({ name: 'Drag & Drop API', supported: 'ondrag' in document.createElement('div'), detail: 'Native drag-and-drop' });
  uiFeatures.push({ name: 'Pointer Events', supported: 'onpointerdown' in window, detail: 'Unified pointer input' });
  uiFeatures.push({ name: 'Touch Events', supported: 'ontouchstart' in window, detail: 'Multi-touch support' });
  uiFeatures.push({ name: 'Visual Viewport API', supported: 'visualViewport' in window, detail: 'Zoom & pinch tracking' });
  uiFeatures.push({ name: 'Popover API', supported: typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype, detail: 'Native popovers (Baseline 2024)' });

  results.push({ label: 'UI & Input', icon: Monitor, features: uiFeatures });

  // CSS Features
  const cssFeatures: FeatureResult[] = [];
  if (typeof CSS !== 'undefined' && CSS.supports) {
    cssFeatures.push({ name: 'CSS Grid', supported: CSS.supports('display', 'grid'), detail: 'Two-dimensional layout' });
    cssFeatures.push({ name: 'CSS Subgrid', supported: CSS.supports('grid-template-rows', 'subgrid'), detail: 'Nested grid alignment' });
    cssFeatures.push({ name: 'CSS Flexbox', supported: CSS.supports('display', 'flex'), detail: 'Flexible box layout' });
    cssFeatures.push({ name: 'CSS Container Queries', supported: CSS.supports('container-type', 'inline-size'), detail: 'Parent-based responsive' });
    cssFeatures.push({ name: 'CSS Nesting', supported: CSS.supports('selector(&)'), detail: 'Native CSS nesting' });
    cssFeatures.push({ name: 'CSS :has() selector', supported: CSS.supports('selector(:has(*))'), detail: 'Parent selector' });
    cssFeatures.push({ name: 'CSS Cascade Layers', supported: CSS.supports('@layer base'), detail: 'Explicit cascade control' });
    cssFeatures.push({ name: 'CSS Scroll-Driven Animations', supported: CSS.supports('animation-timeline: scroll()'), detail: 'Scroll-linked animations' });
    cssFeatures.push({ name: 'CSS View Transitions', supported: CSS.supports('view-transition-name', 'my-transition'), detail: 'Smooth page transitions' });
    cssFeatures.push({ name: 'CSS Anchor Positioning', supported: CSS.supports('anchor-name', '--my-anchor'), detail: 'Tethered element positioning' });
    cssFeatures.push({ name: 'CSS color-mix()', supported: CSS.supports('color', 'color-mix(in srgb, red, blue)'), detail: 'In-CSS color mixing' });
    cssFeatures.push({ name: 'CSS light-dark()', supported: CSS.supports('color', 'light-dark(#000, #fff)'), detail: 'Mode-aware colors' });
    cssFeatures.push({ name: 'CSS text-box-trim', supported: CSS.supports('text-box-trim', 'trim-both'), detail: 'Trim leading text spacing' });
    cssFeatures.push({ name: 'CSS field-sizing', supported: CSS.supports('field-sizing', 'content'), detail: 'Auto-sizing form inputs' });
  } else {
    cssFeatures.push({ name: 'CSS.supports()', supported: false, value: 'N/A', detail: 'CSS feature detection unavailable' });
  }

  results.push({ label: 'CSS Features', icon: PaintBucket, features: cssFeatures });

  // Workers & Concurrency
  const workerFeatures: FeatureResult[] = [];
  workerFeatures.push({ name: 'Web Workers', supported: typeof Worker !== 'undefined', detail: 'Background threads' });
  workerFeatures.push({ name: 'Service Workers', supported: 'serviceWorker' in navigator, detail: 'Offline/PWA support' });
  workerFeatures.push({ name: 'Shared Workers', supported: typeof SharedWorker !== 'undefined', detail: 'Shared across contexts' });
  workerFeatures.push({ name: 'Worklets', supported: 'worklet' in CSS && 'addModule' in (CSS as any).worklet, detail: 'Low-level rendering hooks' });

  results.push({ label: 'Workers & Concurrency', icon: Layers, features: workerFeatures });

  // PWA
  const pwaFeatures: FeatureResult[] = [];
  pwaFeatures.push({ name: 'Service Worker', supported: 'serviceWorker' in navigator, detail: 'Background sync & offline' });
  pwaFeatures.push({ name: 'Web App Manifest', supported: 'matchMedia' in window, detail: 'Installable web app' });
  pwaFeatures.push({ name: 'Push API', supported: 'PushManager' in window, detail: 'Push notifications' });
  pwaFeatures.push({ name: 'Background Sync', supported: 'SyncManager' in window, detail: 'Background data sync' });
  pwaFeatures.push({ name: 'Periodic Background Sync', supported: 'PeriodicSyncManager' in window, detail: 'Scheduled background sync' });
  pwaFeatures.push({ name: 'Web Share API', supported: 'share' in navigator, detail: 'System share dialog' });
  pwaFeatures.push({ name: 'File System Access', supported: 'showOpenFilePicker' in window, detail: 'Read/write local files' });
  pwaFeatures.push({ name: 'Badging API', supported: 'setAppBadge' in navigator, detail: 'App icon badge' });

  results.push({ label: 'PWA Capabilities', icon: Smartphone, features: pwaFeatures });

  // Browser Info
  const infoFeatures: FeatureResult[] = [];
  infoFeatures.push({ name: 'User Agent', supported: true, value: navigator.userAgent, detail: 'Browser identification string' });
  infoFeatures.push({ name: 'Platform', supported: true, value: navigator.platform, detail: 'OS platform' });
  infoFeatures.push({ name: 'Language', supported: true, value: navigator.language, detail: 'Preferred language' });
  infoFeatures.push({ name: 'Languages', supported: true, value: navigator.languages?.join(', '), detail: 'Accepted languages' });
  infoFeatures.push({ name: 'Cookies Enabled', supported: navigator.cookieEnabled, detail: 'Cookie permission' });
  infoFeatures.push({ name: 'OnLine', supported: navigator.onLine, detail: 'Network connectivity' });
  infoFeatures.push({ name: 'Do Not Track', supported: true, value: navigator.doNotTrack || 'unspecified', detail: 'Tracking preference' });
  infoFeatures.push({ name: 'Hardware Concurrency', supported: true, value: String(navigator.hardwareConcurrency || 'unknown'), detail: 'Logical CPU cores' });
  infoFeatures.push({ name: 'Max Touch Points', supported: true, value: String(navigator.maxTouchPoints || 0), detail: 'Touch screen support' });
  infoFeatures.push({ name: 'Device Memory', supported: 'deviceMemory' in navigator, value: ((navigator as any).deviceMemory || 'unknown') + ' GB', detail: 'RAM estimate' });
  infoFeatures.push({ name: 'PDF Viewer', supported: navigator.pdfViewerEnabled ?? true, detail: 'Inline PDF support' });
  infoFeatures.push({ name: 'Java Enabled', supported: !!(navigator as any).javaEnabled?.(), detail: 'Java plugin support' });

  results.push({ label: 'Browser Info', icon: Globe, features: infoFeatures });

  return results;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function countSupported(features: FeatureResult[]): number {
  return features.filter(f => f.supported).length;
}

function countTotal(features: FeatureResult[]): number {
  return features.length;
}

function pctStr(supported: number, total: number): string {
  if (total === 0) return 'N/A';
  return `${Math.round((supported / total) * 100)}%`;
}

// ── UI Components ───────────────────────────────────────────────────────────

function FeatureRow({ feature }: { feature: FeatureResult }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
      feature.supported 
        ? 'bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10' 
        : 'bg-red-500/5 border border-red-500/10 hover:bg-red-500/10'
    }`}>
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
        feature.supported ? 'bg-emerald-500/20' : 'bg-red-500/20'
      }`}>
        {feature.supported 
          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
          : <X className="w-3.5 h-3.5 text-red-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${feature.supported ? 'text-white' : 'text-slate-400'}`}>
            {feature.name}
          </span>
          {feature.value && (
            <code className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 font-mono truncate max-w-[200px]">
              {feature.value}
            </code>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{feature.detail}</p>
      </div>
    </div>
  );
}

function CategoryCard({ category, defaultOpen }: { category: Category; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = category.icon;
  const supported = countSupported(category.features);
  const total = countTotal(category.features);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-lighter/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold text-sm">{category.label}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{supported}/{total} supported</span>
              <div className="w-20 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: pctStr(supported, total) }}
                />
              </div>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5">
          {category.features.map((feature, i) => (
            <FeatureRow key={i} feature={feature} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryBar({ categories }: { categories: Category[] }) {
  const allFeatures = categories.flatMap(c => c.features);
  const supported = countSupported(allFeatures);
  const total = countTotal(allFeatures);
  const pct = Math.round((supported / total) * 100);

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">Feature Scan Results</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {supported} of {total} features supported in your browser
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-brand-400">{pct}%</div>
          <p className="text-[10px] text-slate-500">Compatibility score</p>
        </div>
      </div>
      <div className="mt-3 w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-700"
          style={{ 
            width: `${pct}%`,
            background: pct >= 90 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                       pct >= 70 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                       'linear-gradient(90deg, #ef4444, #f87171)'
          }}
        />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function BrowserFeatureDetector() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('');
  const [showOnlyUnsupported, setShowOnlyUnsupported] = useState(false);

  useEffect(() => {
    setCategories(detectSupport());
    setLoaded(true);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCopyReport = useCallback(() => {
    const lines: string[] = [];
    lines.push('=== Browser Feature Detection Report ===');
    lines.push('');
    categories.forEach(cat => {
      lines.push(`## ${cat.label} (${countSupported(cat.features)}/${countTotal(cat.features)})`);
      cat.features.forEach(f => {
        const icon = f.supported ? '[✓]' : '[✗]';
        const val = f.value ? ` — ${f.value}` : '';
        lines.push(`  ${icon} ${f.name}${val} — ${f.detail}`);
      });
      lines.push('');
    });
    
    const allFeatures = categories.flatMap(c => c.features);
    const supported = countSupported(allFeatures);
    const total = countTotal(allFeatures);
    lines.push(`Total: ${supported}/${total} (${Math.round((supported / total) * 100)}%)`);
    lines.push(`Browser: ${navigator.userAgent}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      toast.success('Report copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, [categories]);

  const filteredCategories = categories.map(cat => {
    let features = cat.features;
    if (filter) {
      const q = filter.toLowerCase();
      features = features.filter(f => f.name.toLowerCase().includes(q) || (f.detail || '').toLowerCase().includes(q));
    }
    if (showOnlyUnsupported) {
      features = features.filter(f => !f.supported);
    }
    return { ...cat, features };
  }).filter(cat => cat.features.length > 0);

  return (
    <ToolLayout
      title="Browser Feature Detector"
      description="Scan your browser for supported web platform features — CSS, JavaScript APIs, hardware sensors, PWA capabilities, and more. See exactly what your browser can do."
    >
      {!loaded ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-brand-400 animate-spin" />
          <p className="text-slate-400 text-sm">Detecting browser features...</p>
        </div>
      ) : (
        <>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search features..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-slate-600/50 text-white text-sm focus:outline-none focus:border-brand-500/50 placeholder-slate-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyUnsupported}
            onChange={e => setShowOnlyUnsupported(e.target.checked)}
            className="rounded bg-surface border-slate-600/50 accent-brand-500"
          />
          Show unsupported only
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleCopyReport}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-surface-lighter border border-slate-600/30 text-slate-300 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Report
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-surface-lighter border border-slate-600/30 text-slate-300 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <SummaryBar categories={categories} />

      {/* Categories */}
      <div className="space-y-3">
        {filteredCategories.map((cat, i) => (
          <CategoryCard key={i} category={cat} defaultOpen={i === 0} />
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm">No features match your search.</p>
        </div>
      )}
        </>
      )}
    </ToolLayout>
  );
}
