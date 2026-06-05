'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Monitor,
  Smartphone,
  Globe,
  Cpu,
  Wifi,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  BatteryCharging,
  HardDrive,
  Palette,
  Layers,
  Clock,
  Shield,
  Eye,
  Hand,
  Mic,
  MapPin,
  Bell,
  Gamepad2,
  Languages,
  Clipboard,
  Database,
  Gauge,
  Touchpad,
  MousePointer2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Server,
  MemoryStick,
  MonitorCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface DeviceInfo {
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    devicePixelRatio: number;
    orientation: string;
    isPortrait: boolean;
    isLandscape: boolean;
    touchPoints: number;
  };
  viewport: {
    width: number;
    height: number;
    scrollWidth: number;
    scrollHeight: number;
  };
  browser: {
    userAgent: string;
    appVersion: string;
    vendor: string;
    vendorSub: string;
    product: string;
    productSub: string;
    platform: string;
    language: string;
    languages: string[];
    cookieEnabled: boolean;
    doNotTrack: string | null;
    onLine: boolean;
    pdfViewer: boolean;
  };
  hardware: {
    hardwareConcurrency: number;
    deviceMemory: string;
    maxTouchPoints: number;
    touchSupport: boolean;
  };
  network: {
    effectiveType: string;
    downlink: number;
    downlinkMax: number;
    rtt: number;
    saveData: boolean;
    type: string;
  };
  battery?: {
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
  };
  time: {
    timezone: string;
    timezoneOffset: number;
    locale: string;
    dateString: string;
    isoString: string;
    unixTimestamp: number;
  };
  storage: {
    localStorage: string;
    sessionStorage: string;
    indexedDB: string;
    quota: string;
    usage: string;
    persistent: string;
    temporary: string;
  };
  permissions: { name: string; state: string; icon: string }[];
  media: {
    audioInputs: number;
    videoInputs: number;
    audioOutputs: number;
    speechSynthesis: boolean;
    speechRecognition: boolean;
  };
  features: {
    webGL: boolean;
    webGL2: boolean;
    worker: boolean;
    sharedWorker: boolean;
    serviceWorker: boolean;
    indexedDB: boolean;
    webSocket: boolean;
    webRTC: boolean;
    geolocation: boolean;
    notification: boolean;
    bluetooth: boolean;
    usb: boolean;
    nfc: boolean;
    midi: boolean;
    gamepad: boolean;
    fetch: boolean;
    crypto: boolean;
    payment: boolean;
    credentials: boolean;
    clipboard: boolean;
    fileSystem: boolean;
    pictureInPicture: boolean;
  };
}

const PERMISSION_ICONS: Record<string, string> = {
  camera: 'camera',
  microphone: 'mic',
  geolocation: 'pin',
  notifications: 'bell',
  'midi-sysex': 'music',
  'persistent-storage': 'hard-drive',
  clipboard: 'clipboard',
  'accelerometer': 'gauge',
  'gyroscope': 'layers',
  'magnetometer': 'compass',
  'ambient-light-sensor': 'sun',
  'background-sync': 'sync',
  'payment-handler': 'credit-card',
  bluetooth: 'bluetooth',
  usb: 'usb',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getBatteryIcon(info: DeviceInfo['battery']): React.ReactNode {
  if (!info) return <BatteryWarning className="w-4 h-4 text-slate-500" />;
  const pct = Math.round(info.level * 100);
  if (info.charging) return <BatteryCharging className="w-4 h-4 text-green-400" />;
  if (pct > 75) return <BatteryFull className="w-4 h-4 text-green-400" />;
  if (pct > 40) return <BatteryMedium className="w-4 h-4 text-yellow-400" />;
  if (pct > 15) return <BatteryLow className="w-4 h-4 text-orange-400" />;
  return <BatteryWarning className="w-4 h-4 text-red-400" />;
}

function getConnectionIcon(effectiveType: string): React.ReactNode {
  switch (effectiveType) {
    case 'slow-2g': return <Wifi className="w-4 h-4 text-red-400" />;
    case '2g': return <Wifi className="w-4 h-4 text-orange-400" />;
    case '3g': return <Wifi className="w-4 h-4 text-yellow-400" />;
    case '4g': return <Wifi className="w-4 h-4 text-green-400" />;
    case '5g': return <Wifi className="w-4 h-4 text-brand-400" />;
    default: return <Wifi className="w-4 h-4 text-slate-400" />;
  }
}

// ── Section Component ───────────────────────────────────────────────────────

function InfoSection({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-surface-light border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <Icon className="w-5 h-5 text-brand-400 flex-shrink-0" />
        <span className="font-semibold text-slate-200 flex-1">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string | React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-700/30 last:border-b-0">
      <span className="text-sm text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-sm text-slate-200 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DeviceInfoPage() {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedAll, setCollapsedAll] = useState(false);

  const collectInfo = useCallback(async () => {
    setError(null);
    const data: Partial<DeviceInfo> = {};

    try {
      // Screen
      data.screen = {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation: screen.orientation?.type || 'unknown',
        isPortrait: screen.orientation?.type?.includes('portrait') ?? screen.width < screen.height,
        isLandscape: screen.orientation?.type?.includes('landscape') ?? screen.width >= screen.height,
        touchPoints: navigator.maxTouchPoints || 0,
      };

      // Viewport
      data.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      };

      // Browser
      data.browser = {
        userAgent: navigator.userAgent,
        appVersion: navigator.appVersion,
        vendor: navigator.vendor || 'unknown',
        vendorSub: navigator.vendorSub || '',
        product: navigator.product || '',
        productSub: navigator.productSub || '',
        platform: navigator.platform || 'unknown',
        language: navigator.language || 'unknown',
        languages: Array.from(navigator.languages || []),
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || null,
        onLine: navigator.onLine,
        pdfViewer: navigator.pdfViewerEnabled ?? true,
      };

      // Hardware
      data.hardware = {
        hardwareConcurrency: navigator.hardwareConcurrency || 1,
        deviceMemory: (navigator as any).deviceMemory
          ? `${(navigator as any).deviceMemory} GB`
          : 'Unknown',
        maxTouchPoints: navigator.maxTouchPoints || 0,
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      };

      // Network
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      data.network = {
        effectiveType: conn?.effectiveType || 'unknown',
        downlink: conn?.downlink ?? 0,
        downlinkMax: conn?.downlinkMax ?? 0,
        rtt: conn?.rtt ?? 0,
        saveData: conn?.saveData ?? false,
        type: conn?.type || 'unknown',
      };

      // Battery
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          data.battery = {
            charging: battery.charging,
            level: battery.level,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
          };
        } catch { /* ignore */ }
      }

      // Time
      const now = new Date();
      data.time = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: now.getTimezoneOffset(),
        locale: navigator.language,
        dateString: now.toString(),
        isoString: now.toISOString(),
        unixTimestamp: Math.floor(now.getTime() / 1000),
      };

      // Storage estimates
      try {
        if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
          const estimate = await (navigator as any).storage.estimate();
          data.storage = {
            localStorage: formatBytes(new Blob([JSON.stringify(localStorage)]).size),
            sessionStorage: formatBytes(new Blob([JSON.stringify(sessionStorage)]).size),
            indexedDB: 'Available',
            quota: formatBytes(estimate.quota || 0),
            usage: formatBytes(estimate.usage || 0),
            persistent: 'persist' in (navigator as any).storage ? 'Supported' : 'Not supported',
            temporary: 'Supported',
          };
        } else {
          data.storage = {
            localStorage: formatBytes(new Blob([JSON.stringify(localStorage)]).size),
            sessionStorage: formatBytes(new Blob([JSON.stringify(sessionStorage)]).size),
            indexedDB: 'indexedDB' in window ? 'Available' : 'Not supported',
            quota: 'Not available',
            usage: 'Not available',
            persistent: 'Not supported',
            temporary: 'Not available',
          };
        }
      } catch {
        data.storage = {
          localStorage: 'Available',
          sessionStorage: 'Available',
          indexedDB: 'indexedDB' in window ? 'Available' : 'Not supported',
          quota: 'Unknown',
          usage: 'Unknown',
          persistent: 'Unknown',
          temporary: 'Unknown',
        };
      }

      // Permissions
      const permissionNames = [
        'camera', 'microphone', 'geolocation', 'notifications',
        'clipboard-read', 'clipboard-write', 'accelerometer', 'gyroscope',
        'magnetometer', 'ambient-light-sensor', 'midi',
        'persistent-storage', 'background-sync', 'payment-handler',
        'bluetooth', 'usb',
      ];

      if ('permissions' in navigator) {
        const permResults = await Promise.allSettled(
          permissionNames.map(async (name) => {
            try {
              const result = await navigator.permissions.query({ name: name as PermissionName });
              return { name, state: result.state, icon: PERMISSION_ICONS[name] || 'shield' };
            } catch {
              return { name, state: 'unsupported', icon: PERMISSION_ICONS[name] || 'shield' };
            }
          })
        );
        data.permissions = permResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { name: '', state: 'error', icon: 'shield' }
        ).filter(p => p.name);
      } else {
        data.permissions = permissionNames.map((name) => ({
          name,
          state: 'unsupported',
          icon: PERMISSION_ICONS[name] || 'shield',
        }));
      }

      // Media devices
      try {
        if ('mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          data.media = {
            audioInputs: devices.filter((d) => d.kind === 'audioinput').length,
            videoInputs: devices.filter((d) => d.kind === 'videoinput').length,
            audioOutputs: devices.filter((d) => d.kind === 'audiooutput').length,
            speechSynthesis: 'speechSynthesis' in window,
            speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
          };
        }
      } catch {
        data.media = {
          audioInputs: -1,
          videoInputs: -1,
          audioOutputs: -1,
          speechSynthesis: 'speechSynthesis' in window,
          speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
        };
      }

      // Feature detection
      data.features = {
        webGL: (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch { return false; } })(),
        webGL2: (() => { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; } })(),
        worker: 'Worker' in window,
        sharedWorker: 'SharedWorker' in window,
        serviceWorker: 'serviceWorker' in navigator,
        indexedDB: 'indexedDB' in window,
        webSocket: 'WebSocket' in window,
        webRTC: 'RTCPeerConnection' in window,
        geolocation: 'geolocation' in navigator,
        notification: 'Notification' in window,
        bluetooth: 'bluetooth' in navigator,
        usb: 'usb' in navigator,
        nfc: 'NDEFReader' in window,
        midi: 'requestMIDIAccess' in navigator,
        gamepad: 'getGamepads' in navigator,
        fetch: 'fetch' in window,
        crypto: 'crypto' in window && 'randomUUID' in crypto,
        payment: 'PaymentRequest' in window,
        credentials: 'credentials' in navigator,
        clipboard: 'clipboard' in navigator,
        fileSystem: 'showOpenFilePicker' in window,
        pictureInPicture: 'pictureInPictureEnabled' in document,
      };

      setInfo(data as DeviceInfo);
    } catch (err: any) {
      setError(err.message || 'Failed to collect device information');
    }
  }, []);

  useEffect(() => {
    collectInfo();
  }, [collectInfo]);

  const exportJSON = useCallback(() => {
    if (!info) return;
    const blob = new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-info-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Device info exported as JSON');
  }, [info]);

  const copyJSON = useCallback(() => {
    if (!info) return;
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    toast.success('Device info copied to clipboard');
  }, [info]);

  if (error) {
    return (
      <ToolLayout
        title="Device Info"
        description="Comprehensive diagnostic dashboard showing everything about your device, browser, hardware, and network."
      >
        <div className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={collectInfo}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </ToolLayout>
    );
  }

  if (!info) {
    return (
      <ToolLayout
        title="Device Info"
        description="Comprehensive diagnostic dashboard showing everything about your device, browser, hardware, and network."
      >
        <div className="p-8 text-center">
          <RefreshCw className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-400">Collecting device information...</p>
        </div>
      </ToolLayout>
    );
  }

  const batteryPct = info.battery ? Math.round(info.battery.level * 100) : null;
  const rttMs = info.network.rtt ? `${info.network.rtt} ms` : 'Unknown';
  const downSpeed = info.network.downlink ? `${info.network.downlink.toFixed(1)} Mbps` : 'Unknown';

  return (
    <ToolLayout
      title="Device Info"
      description="Comprehensive diagnostic dashboard showing everything about your device, browser, hardware, and network."
    >
      {/* Action bar */}
      <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-surface-light border border-slate-700/50">
        <Monitor className="w-4 h-4 text-brand-400" />
        <span className="text-sm text-slate-400 font-medium">
          {info.hardware.hardwareConcurrency} core{info.hardware.hardwareConcurrency !== 1 ? 's' : ''}
          {' · '}
          {info.hardware.deviceMemory !== 'Unknown' ? `${info.hardware.deviceMemory} RAM · ` : ''}
          {info.screen.width}×{info.screen.height}
          {' · '}
          {batteryPct !== null ? `Battery ${batteryPct}%` : ''}
        </span>
        <div className="flex-1" />
        <button
          onClick={collectInfo}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <button
          onClick={copyJSON}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy JSON
        </button>
        <button
          onClick={exportJSON}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </button>
      </div>

      <div className="space-y-3">
        {/* Screen — always open */}
        <InfoSection icon={Monitor} title="Screen &amp; Viewport" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">Display</h4>
              <InfoRow label="Resolution" value={`${info.screen.width} × ${info.screen.height}`} />
              <InfoRow label="Available" value={`${info.screen.availWidth} × ${info.screen.availHeight}`} />
              <InfoRow label="Pixel Ratio" value={`${info.screen.devicePixelRatio}x`} />
              <InfoRow label="Color Depth" value={`${info.screen.colorDepth}-bit`} />
              <InfoRow label="Orientation" value={info.screen.orientation} />
              {info.screen.touchPoints > 0 && (
                <InfoRow label="Touch Points" value={`${info.screen.touchPoints}`} />
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">Viewport</h4>
              <InfoRow label="Window" value={`${info.viewport.width} × ${info.viewport.height}`} />
              <InfoRow label="Document" value={`${info.viewport.scrollWidth} × ${info.viewport.scrollHeight}`} />
            </div>
          </div>
        </InfoSection>

        {/* Browser */}
        <InfoSection icon={Globe} title="Browser">
          <InfoRow label="User Agent" value={info.browser.userAgent} mono />
          <InfoRow label="Platform" value={info.browser.platform} />
          <InfoRow label="Vendor" value={info.browser.vendor} />
          <InfoRow label="Language" value={info.browser.language} />
          {info.browser.languages.length > 1 && (
            <InfoRow label="Languages" value={info.browser.languages.join(', ')} />
          )}
          <InfoRow label="Cookies" value={info.browser.cookieEnabled ? 'Enabled' : 'Disabled'} />
          <InfoRow label="DNT" value={info.browser.doNotTrack || 'Not set'} />
          <InfoRow label="PDF Viewer" value={info.browser.pdfViewer ? 'Supported' : 'Not supported'} />
          <InfoRow
            label="Online"
            value={
              <span className={info.browser.onLine ? 'text-green-400' : 'text-red-400'}>
                {info.browser.onLine ? 'Online' : 'Offline'}
              </span>
            }
          />
        </InfoSection>

        {/* Hardware */}
        <InfoSection icon={Cpu} title="Hardware">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <InfoRow label="CPU Cores" value={`${info.hardware.hardwareConcurrency} logical`} />
              <InfoRow label="Device Memory" value={info.hardware.deviceMemory} />
            </div>
            <div>
              <InfoRow label="Max Touch Points" value={`${info.hardware.maxTouchPoints}`} />
              <InfoRow
                label="Touch Support"
                value={
                  <span className={info.hardware.touchSupport ? 'text-green-400' : 'text-slate-500'}>
                    {info.hardware.touchSupport ? 'Yes' : 'No'}
                  </span>
                }
              />
            </div>
          </div>
        </InfoSection>

        {/* Battery */}
        {info.battery && (
          <InfoSection icon={getBatteryIcon(info.battery) as any} title="Battery">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
              <div>
                <InfoRow
                  label="Level"
                  value={
                    <span className={batteryPct! > 20 ? 'text-green-400' : 'text-red-400'}>
                      {batteryPct}%
                    </span>
                  }
                />
                <InfoRow label="Charging" value={info.battery.charging ? 'Yes ⚡' : 'No'} />
              </div>
              <div>
                {info.battery.charging && info.battery.chargingTime !== Infinity && (
                  <InfoRow label="Time to full" value={`${Math.round(info.battery.chargingTime / 60)} min`} />
                )}
                {!info.battery.charging && info.battery.dischargingTime !== Infinity && (
                  <InfoRow label="Time remaining" value={`${Math.round(info.battery.dischargingTime / 60)} min`} />
                )}
              </div>
            </div>
          </InfoSection>
        )}

        {/* Network */}
        <InfoSection icon={getConnectionIcon(info.network.effectiveType) as any} title="Network">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <InfoRow label="Type" value={info.network.type || 'Unknown'} />
              <InfoRow label="Effective Type" value={info.network.effectiveType} />
              <InfoRow label="Downlink" value={downSpeed} />
            </div>
            <div>
              <InfoRow label="RTT" value={rttMs} />
              <InfoRow label="Max Downlink" value={info.network.downlinkMax ? `${info.network.downlinkMax} Mbps` : 'Unknown'} />
              <InfoRow
                label="Data Saver"
                value={
                  <span className={info.network.saveData ? 'text-yellow-400' : 'text-green-400'}>
                    {info.network.saveData ? 'On' : 'Off'}
                  </span>
                }
              />
            </div>
          </div>
        </InfoSection>

        {/* Time */}
        <InfoSection icon={Clock} title="Time &amp; Locale">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <InfoRow label="Timezone" value={info.time.timezone} />
              <InfoRow label="Offset" value={`UTC${info.time.timezoneOffset <= 0 ? '+' : ''}${-info.time.timezoneOffset / 60}h`} />
              <InfoRow label="Locale" value={info.time.locale} />
            </div>
            <div>
              <InfoRow label="Local Time" value={info.time.dateString} mono />
              <InfoRow label="ISO" value={info.time.isoString} mono />
              <InfoRow label="UNIX" value={`${info.time.unixTimestamp}`} mono />
            </div>
          </div>
        </InfoSection>

        {/* Storage */}
        <InfoSection icon={Database} title="Storage">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <InfoRow label="localStorage" value={info.storage.localStorage} />
              <InfoRow label="sessionStorage" value={info.storage.sessionStorage} />
              <InfoRow label="IndexedDB" value={info.storage.indexedDB} />
            </div>
            <div>
              <InfoRow label="Storage Quota" value={info.storage.quota} />
              <InfoRow label="Current Usage" value={info.storage.usage} />
              <InfoRow label="Persistent Storage" value={info.storage.persistent} />
            </div>
          </div>
        </InfoSection>

        {/* Permissions */}
        <InfoSection icon={Shield} title="Permissions" defaultOpen={false}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
            {info.permissions.map((perm) => (
              <div
                key={perm.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                  perm.state === 'granted'
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : perm.state === 'denied'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : perm.state === 'prompt'
                    ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                    : 'border-slate-600/30 bg-slate-800/30 text-slate-500'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                <span className="truncate">{perm.name.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        </InfoSection>

        {/* Media */}
        <InfoSection icon={Mic} title="Media &amp; Devices" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <InfoRow label="Audio Inputs" value={info.media.audioInputs >= 0 ? `${info.media.audioInputs}` : 'Permission needed'} />
              <InfoRow label="Video Inputs" value={info.media.videoInputs >= 0 ? `${info.media.videoInputs}` : 'Permission needed'} />
              <InfoRow label="Audio Outputs" value={info.media.audioOutputs >= 0 ? `${info.media.audioOutputs}` : 'Permission needed'} />
            </div>
            <div>
              <InfoRow label="Speech Synthesis" value={info.media.speechSynthesis ? 'Supported' : 'Not supported'} />
              <InfoRow label="Speech Recognition" value={info.media.speechRecognition ? 'Supported' : 'Not supported'} />
            </div>
          </div>
        </InfoSection>

        {/* Feature Detection */}
        <InfoSection icon={Layers} title="Feature Detection" defaultOpen={false}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
            {Object.entries(info.features).map(([key, supported]) => (
              <div
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                  supported
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-slate-600/30 bg-slate-800/30 text-slate-600'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${supported ? 'bg-green-400' : 'bg-slate-600'} flex-shrink-0`} />
                <span className="truncate">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</span>
              </div>
            ))}
          </div>
        </InfoSection>
      </div>
    </ToolLayout>
  );
}
