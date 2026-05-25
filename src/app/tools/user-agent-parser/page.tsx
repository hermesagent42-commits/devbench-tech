'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Monitor, Smartphone, Tablet, Globe, Cpu, Box, Search, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface UaResult {
  raw: string;
  browser: { name: string; version: string };
  os: { name: string; version: string };
  engine: { name: string; version: string };
  device: { type: string; model: string };
  cpu: string;
}

// ── Sample User Agent Strings ──────────────────────────────────────────────

const SAMPLES: { label: string; ua: string }[] = [
  {
    label: 'Chrome (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
  {
    label: 'Chrome (macOS)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
  {
    label: 'Firefox (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  },
  {
    label: 'Firefox (Linux)',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  },
  {
    label: 'Safari (macOS)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  },
  {
    label: 'Edge (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  },
  {
    label: 'Safari (iPhone)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Chrome (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36',
  },
  {
    label: 'Safari (iPad)',
    ua: 'Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Brave (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
  {
    label: 'Opera (Windows)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0',
  },
  {
    label: 'Samsung Internet (Android)',
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/131.0.0.0 Mobile Safari/537.36',
  },
  {
    label: 'Chrome (ChromeOS)',
    ua: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
  {
    label: 'curl',
    ua: 'curl/8.7.1',
  },
  {
    label: 'Python Requests',
    ua: 'python-requests/2.32.3',
  },
];

// ── Parser ─────────────────────────────────────────────────────────────────

function parseUA(ua: string): UaResult {
  const result: UaResult = {
    raw: ua,
    browser: { name: 'Unknown', version: '' },
    os: { name: 'Unknown', version: '' },
    engine: { name: 'Unknown', version: '' },
    device: { type: 'Desktop', model: '' },
    cpu: 'Unknown',
  };

  if (!ua) return result;

  // ── Browser Detection ──────────────────────────────────────────────────

  // Edge (must check before Chrome since Edge contains "Chrome" too)
  const edgeMatch = ua.match(/Edg\/([\d.]+)/i);
  if (edgeMatch) {
    result.browser = { name: 'Microsoft Edge', version: edgeMatch[1] };
  }
  // Opera
  else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    const m = ua.match(/(?:OPR|Opera)\/([\d.]+)/i);
    result.browser = { name: 'Opera', version: m?.[1] || '' };
  }
  // Brave (detected by presence in some builds, but Chrome-based without Edg/OPR)
  else if (ua.includes('Brave') || ua.includes('brave')) {
    const m = ua.match(/Brave(?: Chrome)?\/([\d.]+)/i) || ua.match(/Chrome\/([\d.]+)/);
    result.browser = { name: 'Brave', version: m?.[1] || '' };
  }
  // Vivaldi
  else if (ua.includes('Vivaldi')) {
    const m = ua.match(/Vivaldi\/([\d.]+)/i);
    result.browser = { name: 'Vivaldi', version: m?.[1] || '' };
  }
  // Samsung Internet
  else if (ua.includes('SamsungBrowser')) {
    const m = ua.match(/SamsungBrowser\/([\d.]+)/i);
    result.browser = { name: 'Samsung Internet', version: m?.[1] || '' };
  }
  // Firefox-based (IceCat, IceWeasel, Waterfox, etc.)
  else if (ua.includes('Firefox/') || ua.includes('FxiOS/')) {
    const m = ua.match(/(?:Firefox|FxiOS)\/([\d.]+)/i);
    result.browser = { name: 'Firefox', version: m?.[1] || '' };
    // Check for Firefox mobile variants
    if (ua.includes('FxiOS')) result.browser.name = 'Firefox iOS';
  }
  // Safari (must check before Chrome since Safari contains "Safari" but not "Chrome/")
  else if (ua.includes('Safari/') && !ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    const m = ua.match(/Version\/([\d.]+)/);
    result.browser = { name: 'Safari', version: m?.[1] || '' };
    if (ua.includes('Mobile/') || ua.includes('iPhone') || ua.includes('iPad')) {
      result.browser.name = 'Mobile Safari';
    }
  }
  // Chrome-based (generic)
  else if (ua.includes('Chrome/') || ua.includes('Chromium/')) {
    const m = ua.match(/(?:Chrome|Chromium)\/([\d.]+)/);
    result.browser = { name: 'Chrome', version: m?.[1] || '' };
    if (ua.includes('Chromium')) result.browser.name = 'Chromium';
  }
  // Internet Explorer
  else if (ua.includes('MSIE ') || ua.includes('Trident/')) {
    const m = ua.match(/MSIE ([\d.]+)/) || ua.match(/rv:([\d.]+)/);
    result.browser = { name: 'Internet Explorer', version: m?.[1] || '' };
  }
  // Curl
  else if (ua.startsWith('curl/')) {
    const m = ua.match(/curl\/([\d.]+)/);
    result.browser = { name: 'curl', version: m?.[1] || '' };
  }
  // Python requests
  else if (ua.includes('python-requests')) {
    const m = ua.match(/python-requests\/([\d.]+)/);
    result.browser = { name: 'Python Requests', version: m?.[1] || '' };
  }
  // Googlebot
  else if (ua.includes('Googlebot')) {
    const m = ua.match(/Googlebot\/([\d.]+)/);
    result.browser = { name: 'Googlebot', version: m?.[1] || '' };
  }
  // Generic: try to extract from the beginning (like "AppName/1.2.3")
  else {
    const m = ua.match(/^([\w-]+)\/([\d.]+)/);
    if (m) {
      result.browser = { name: m[1], version: m[2] };
    }
  }

  // ── OS Detection ───────────────────────────────────────────────────────

  // Windows
  const winMatch = ua.match(/Windows NT (\d+\.\d+)/);
  if (winMatch) {
    const winMap: Record<string, string> = {
      '10.0': ua.includes('WOW64') || ua.includes('Win64') ? 'Windows 10/11' : 'Windows 10',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7',
      '6.0': 'Windows Vista',
      '5.2': 'Windows XP x64',
      '5.1': 'Windows XP',
    };
    result.os = { name: winMap[winMatch[1]] || `Windows NT ${winMatch[1]}`, version: winMatch[1] };
  }
  // macOS
  else if (ua.includes('Mac OS X')) {
    const m = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
    let version = m?.[1]?.replace(/_/g, '.') || '';
    const verMap: Record<string, string> = {
      '15': 'Sequoia',
      '14': 'Sonoma',
      '13': 'Ventura',
      '12': 'Monterey',
      '11': 'Big Sur',
      '10.15': 'Catalina',
      '10.14': 'Mojave',
      '10.13': 'High Sierra',
    };
    const major = version.split('.')[0];
    const minor = version.split('.')[1];
    const codename = verMap[major] || verMap[`${major}.${minor}`];
    result.os = { name: codename ? `macOS ${codename}` : `macOS ${version}`, version };
  }
  // iOS / iPadOS
  else if (ua.includes('like Mac OS X')) {
    const m = ua.match(/OS (\d+[._]\d+(?:[._]\d+)?)/);
    const version = m?.[1]?.replace(/_/g, '.') || '';
    if (ua.includes('iPad')) {
      result.os = { name: `iPadOS ${version}`, version };
    } else {
      result.os = { name: `iOS ${version}`, version };
    }
  }
  // Android
  else if (ua.includes('Android')) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/);
    result.os = { name: `Android ${m?.[1] || ''}`, version: m?.[1] || '' };
  }
  // ChromeOS
  else if (ua.includes('CrOS')) {
    const m = ua.match(/CrOS [^\s]+ ([\d.]+)/);
    result.os = { name: 'ChromeOS', version: m?.[1] || '' };
  }
  // Linux
  else if (ua.includes('Linux')) {
    const m = ua.match(/Linux ([\w._-]+)/);
    result.os = { name: 'Linux', version: m?.[1] || '' };
  }

  // ── Engine Detection ───────────────────────────────────────────────────

  if (ua.includes('AppleWebKit')) {
    const m = ua.match(/AppleWebKit\/([\d.]+)/);
    const ver = m?.[1] || '';
    // Chrome/Edge/Opera use Blink (fork of WebKit)
    if (ua.includes('Chrome/') || ua.includes('Chromium/') || ua.includes('Edg/') || ua.includes('OPR/')) {
      result.engine = { name: 'Blink', version: ver };
    } else {
      result.engine = { name: 'WebKit', version: ver };
    }
  } else if (ua.includes('Gecko/')) {
    const m = ua.match(/Gecko\/([\d.]+)/);
    result.engine = { name: 'Gecko', version: m?.[1] || '' };
  } else if (ua.includes('Trident/')) {
    const m = ua.match(/Trident\/([\d.]+)/);
    result.engine = { name: 'Trident', version: m?.[1] || '' };
  }

  // ── Device Type Detection ──────────────────────────────────────────────

  if (ua.includes('iPad') || ua.includes('Tablet') || (ua.includes('Android') && !ua.includes('Mobile'))) {
    result.device.type = 'Tablet';
  } else if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) {
    result.device.type = 'Mobile';
  } else {
    result.device.type = 'Desktop';
  }

  // Device model (Android phones)
  const androidModel = ua.match(/Android \d+(?:\.\d+)?; ([^;)]+)\s*(?:Build|Chrome|AppleWebKit|;|\))/);
  if (androidModel) {
    result.device.model = androidModel[1].trim();
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    result.device.model = ua.includes('iPad') ? 'iPad' : 'iPhone';
  }

  // ── CPU Architecture ───────────────────────────────────────────────────

  if (ua.includes('x86_64') || ua.includes('x64') || ua.includes('Win64') || ua.includes('WOW64') || ua.includes('amd64')) {
    result.cpu = 'x86-64 (64-bit)';
  } else if (ua.includes('i686') || ua.includes('i386') || ua.includes('x86')) {
    result.cpu = 'x86 (32-bit)';
  } else if (ua.includes('aarch64') || ua.includes('arm64') || ua.includes('ARM64') || ua.includes('armv8')) {
    result.cpu = 'ARM64 (64-bit)';
  } else if (ua.includes('armv7') || ua.includes('arm')) {
    result.cpu = 'ARM (32-bit)';
  } else if (ua.includes('Intel')) {
    result.cpu = 'Intel';
  } else if (ua.includes('PPC')) {
    result.cpu = 'PowerPC';
  } else if (ua.includes('CPU OS') || ua.includes('CPU iPhone OS')) {
    result.cpu = 'Apple Silicon / ARM';
  }

  return result;
}

// ── Helper ─────────────────────────────────────────────────────────────────

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-brand-400" />
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
    <span className="text-xs text-slate-400">{label}</span>
    <span className={`text-sm font-medium text-slate-200 ${mono ? 'font-mono' : ''}`}>
      {value || <span className="text-slate-500 italic">—</span>}
    </span>
  </div>
);

// ── Component ──────────────────────────────────────────────────────────────

export default function UserAgentParserPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<UaResult | null>(null);

  const parse = useCallback((ua: string) => {
    if (!ua.trim()) {
      setResult(null);
      return;
    }
    setResult(parseUA(ua.trim()));
  }, []);

  const handleDetect = useCallback(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      setInput(ua);
      parse(ua);
    }
  }, [parse]);

  const handleCopy = useCallback((text: string, label: string) => {
    if (!navigator.clipboard) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } else {
      navigator.clipboard.writeText(text);
    }
    toast.success(`${label} copied`);
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Mobile': return Smartphone;
      case 'Tablet': return Tablet;
      default: return Monitor;
    }
  };

  return (
    <ToolLayout
      title="User Agent Parser"
      description="Parse any user agent string into its components — browser, operating system, rendering engine, device type, and CPU architecture. Auto-detect your current browser or analyze a pasted string."
    >
      {/* Input Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          User Agent String
        </label>
        <div className="flex gap-2 mb-3">
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); parse(e.target.value); }}
            placeholder="Paste a user agent string or click 'Detect Mine'..."
            rows={3}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 resize-none"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDetect}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600/20 text-brand-400 border border-brand-600/30 hover:bg-brand-600/30 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Detect Mine
          </button>
          <button
            onClick={() => { setInput(''); setResult(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Sample Buttons */}
      <div className="mb-8">
        <p className="text-xs text-slate-500 mb-2">Sample user agents:</p>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => { setInput(s.ua); parse(s.ua); }}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Raw UA */}
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Raw String</span>
              <button
                onClick={() => handleCopy(result.raw, 'User agent string')}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-400 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-300 font-mono break-all leading-relaxed">{result.raw}</p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Browser */}
            <Section icon={Globe} title="Browser">
              <Field label="Name" value={result.browser.name} />
              <Field label="Version" value={result.browser.version} mono />
            </Section>

            {/* Operating System */}
            <Section icon={Box} title="Operating System">
              <Field label="Name" value={result.os.name} />
              <Field label="Version" value={result.os.version} mono />
            </Section>

            {/* Rendering Engine */}
            <Section icon={Cpu} title="Engine">
              <Field label="Name" value={result.engine.name} />
              <Field label="Version" value={result.engine.version} mono />
            </Section>

            {/* Device */}
            <Section icon={getDeviceIcon(result.device.type)} title="Device">
              <Field label="Type" value={result.device.type} />
              <Field label="Model" value={result.device.model} />
            </Section>

            {/* CPU Architecture — full width */}
            <div className="sm:col-span-2">
              <Section icon={Cpu} title="CPU Architecture">
                <Field label="Architecture" value={result.cpu} />
              </Section>
            </div>
          </div>

          {/* Summary Badge */}
          <div className="flex items-center gap-3 p-4 bg-brand-600/5 rounded-xl border border-brand-600/20">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-brand-400 font-semibold">{result.browser.name}</span>
              {result.browser.version && (
                <span className="text-slate-400 font-mono text-xs">{result.browser.version}</span>
              )}
              <span className="text-slate-600">on</span>
              <span className="text-brand-400 font-semibold">{result.os.name}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 text-xs">{result.device.type}</span>
              {result.device.model && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 text-xs">{result.device.model}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <Globe className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-slate-500 text-sm">Paste a user agent string or click <span className="text-brand-400">Detect Mine</span> to parse it.</p>
          <p className="text-slate-600 text-xs mt-1">All parsing is done in your browser — no data is sent anywhere.</p>
        </div>
      )}
    </ToolLayout>
  );
}
