'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Moon,
  Sun,
  MonitorSmartphone,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Info,
  ExternalLink,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Code2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

interface WakeLockState {
  sentinel: WakeLockSentinel | null;
  type: 'screen' | 'system';
  status: 'idle' | 'active' | 'released' | 'error' | 'unsupported';
  errorMessage: string;
}

interface LogEntry {
  id: number;
  timestamp: Date;
  event: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// ── Constants ──────────────────────────────────────────────────────────────

const WAKE_LOCK_MDN_URL = 'https://developer.mozilla.org/en-US/docs/Web/API/WakeLock';
const CANIUSE_URL = 'https://caniuse.com/wake-lock';

const DEMO_CODE = `// Request a screen wake lock
try {
  const wakeLock = await navigator.wakeLock.request('screen');
  console.log('Wake Lock is active');

  // Listen for release
  wakeLock.addEventListener('release', () => {
    console.log('Wake Lock was released');
  });

  // Release manually when done
  await wakeLock.release();
} catch (err) {
  console.error(\`Wake Lock error: \${err.message}\`);
}`;

// ── Browser Support Check ───────────────────────────────────────────────────

function checkBrowserSupport(): {
  supported: boolean;
  details: Record<string, boolean>;
} {
  const details: Record<string, boolean> = {
    'WakeLock API': 'wakeLock' in navigator,
    'request() method': typeof (navigator as any).wakeLock?.request === 'function',
    'Screen lock type': true, // screen type is part of spec
    'Secure context': typeof window !== 'undefined' && window.isSecureContext,
    'Visibility API': typeof document !== 'undefined' && 'visibilityState' in document,
  };

  return {
    supported: details['WakeLock API'] && details['request() method'] && details['Secure context'],
    details,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WakeLockPlaygroundPage() {
  const [state, setState] = useState<WakeLockState>({
    sentinel: null,
    type: 'screen',
    status: 'idle',
    errorMessage: '',
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nextId, setNextId] = useState(0);
  const [showCode, setShowCode] = useState(false);

  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const support = checkBrowserSupport();

  // ── Logging ──────────────────────────────────────────────────────────────

  const addLog = useCallback(
    (event: string, type: LogEntry['type'] = 'info') => {
      setLogs((prev) => [
        {
          id: nextId,
          timestamp: new Date(),
          event,
          type,
        },
        ...prev.slice(0, 49), // keep last 50 entries
      ]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );

  // ── Re-acquire on visibility change ──────────────────────────────────────

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && sentinelRef.current) {
      // Check if we still have a lock — it might have been auto-released
      addLog('Page became visible — checking wake lock...', 'info');
    }
    if (document.visibilityState === 'hidden') {
      addLog('Page hidden — browser may auto-release wake lock', 'warning');
    }
  }, [addLog]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
      }
    };
  }, []);

  // ── Request wake lock ────────────────────────────────────────────────────

  const requestWakeLock = useCallback(async () => {
    if (!support.supported) {
      setState((s) => ({
        ...s,
        status: 'unsupported',
        errorMessage: 'Wake Lock API is not supported in this browser or context.',
      }));
      addLog('Wake Lock request failed: API not supported', 'error');
      return;
    }

    try {
      addLog(`Requesting ${state.type} wake lock...`, 'info');
      const wakeLock = await navigator.wakeLock.request(state.type as 'screen');
      sentinelRef.current = wakeLock;
      setState((s) => ({
        ...s,
        sentinel: wakeLock,
        status: 'active',
        errorMessage: '',
      }));
      addLog(`✅ ${state.type} wake lock acquired — screen will stay on`, 'success');
      toast.success('Wake lock active — screen will stay on');
      toast('Tab switching may release the lock', { icon: '⚠️', duration: 4000 });

      // Listen for release
      wakeLock.addEventListener('release', () => {
        sentinelRef.current = null;
        setState((s) => ({
          ...s,
          sentinel: null,
          status: 'released',
          errorMessage: '',
        }));
        addLog('Wake lock released — screen can now sleep', 'info');
        toast('Wake lock released', { icon: '🔓' });
      });
    } catch (err: any) {
      const message = err?.message || String(err);
      setState((s) => ({
        ...s,
        status: 'error',
        errorMessage: message,
      }));
      addLog(`❌ Wake Lock request failed: ${message}`, 'error');
      toast.error(`Failed: ${message}`);
    }
  }, [state.type, support.supported, addLog]);

  // ── Release wake lock ────────────────────────────────────────────────────

  const releaseWakeLock = useCallback(async () => {
    if (!sentinelRef.current) {
      addLog('No wake lock to release', 'warning');
      return;
    }

    try {
      addLog('Releasing wake lock...', 'info');
      await sentinelRef.current.release();
      sentinelRef.current = null;
      setState((s) => ({
        ...s,
        sentinel: null,
        status: 'released',
        errorMessage: '',
      }));
      addLog('✅ Wake lock released manually', 'success');
      toast.success('Wake lock released');
    } catch (err: any) {
      addLog(`❌ Release failed: ${err.message}`, 'error');
      toast.error(`Release failed: ${err.message}`);
    }
  }, [addLog]);

  // ── Status display helpers ────────────────────────────────────────────────

  const statusConfig = {
    idle: {
      icon: Moon,
      color: 'text-slate-400',
      bg: 'bg-slate-700/20',
      border: 'border-slate-600/50',
      label: 'Idle',
      description: 'No wake lock active. Press "Acquire" to request one.',
      pulse: false,
    },
    active: {
      icon: Sun,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/50',
      label: 'Active',
      description: 'Wake lock is holding — screen will NOT sleep.',
      pulse: true,
    },
    released: {
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/50',
      label: 'Released',
      description: 'Wake lock was released — screen can now sleep.',
      pulse: false,
    },
    error: {
      icon: ShieldAlert,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      label: 'Error',
      description: 'Wake lock request failed.',
      pulse: false,
    },
    unsupported: {
      icon: ShieldOff,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/50',
      label: 'Unsupported',
      description: 'Wake Lock API is not available in this browser.',
      pulse: false,
    },
  };

  const config = statusConfig[state.status];
  const StatusIcon = config.icon;

  // ── Time since active ─────────────────────────────────────────────────────

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state.status !== 'active') {
      setElapsed(0);
      return;
    }

    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.status]);

  const formatElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m ${s}s`;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Wake Lock Playground"
      description="Explore the Wake Lock API — prevent your screen from dimming or sleeping. Perfect for recipe apps, presentations, fitness timers, and any long-running task."
    >
      {/* ── Browser Support Warning ── */}
      {!support.supported && (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-400 mb-1">Browser Support Issue</h3>
              <p className="text-amber-300/80 text-sm mb-2">
                The Wake Lock API requires a secure context (HTTPS or localhost) and a supporting browser.
                Try opening this page on localhost or in Chrome/Edge.
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                {Object.entries(support.details).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    {value ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={value ? 'text-emerald-300' : 'text-red-300'}>{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Status Card ── */}
      <div
        className={`mb-6 p-6 rounded-xl border-2 ${config.bg} ${config.border} transition-all duration-500`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${state.status === 'active' ? 'bg-amber-500/20' : 'bg-slate-700/40'}`}>
              <StatusIcon
                className={`w-8 h-8 ${config.color} ${state.status === 'active' ? 'animate-pulse' : ''}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-slate-200">{config.label}</h2>
                {state.status === 'active' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono">
                    <Clock className="w-3 h-3" />
                    {formatElapsed(elapsed)}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm max-w-md">
                {state.status === 'error' ? state.errorMessage : config.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {state.status !== 'active' ? (
              <button
                onClick={requestWakeLock}
                disabled={!support.supported}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
              >
                <Sun className="w-4 h-4" />
                Acquire Lock
              </button>
            ) : (
              <button
                onClick={releaseWakeLock}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-colors text-sm border border-red-500/30"
              >
                <Moon className="w-4 h-4" />
                Release Lock
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Info Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <MonitorSmartphone className="w-4 h-4" />
            Screen Wake Lock
          </div>
          <p className="text-xs text-slate-500">
            Keeps the entire screen on. The most common use case — great for cooking, presenting, or reading.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Activity className="w-4 h-4" />
            Auto-Releases
          </div>
          <p className="text-xs text-slate-500">
            Wake locks automatically release when the tab is hidden. You&rsquo;ll need to re-acquire on visibility change.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Info className="w-4 h-4" />
            Secure Context
          </div>
          <p className="text-xs text-slate-500">
            Wake Lock requires HTTPS or localhost. It won&rsquo;t work on plain HTTP due to browser security policies.
          </p>
        </div>
      </div>

      {/* ── Event Log ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-400" />
            Event Log
          </h3>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="rounded-lg bg-slate-900/80 border border-slate-700/50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No events yet. Acquire a wake lock to see activity.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 px-4 py-2 border-b border-slate-800/50 text-sm font-mono ${
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warning'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 shrink-0 w-16">
                    {log.timestamp.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span>{log.event}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Code Example ── */}
      <div className="mb-6">
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mb-3"
        >
          <Code2 className="w-4 h-4" />
          {showCode ? 'Hide' : 'Show'} Code Example
        </button>
        {showCode && (
          <div className="relative rounded-lg bg-slate-900/80 border border-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
              <span className="text-xs text-slate-500 font-mono">wake-lock-example.js</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(DEMO_CODE);
                  toast.success('Copied!');
                }}
                className="p-1 rounded hover:bg-slate-700/50 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm text-slate-300 font-mono leading-relaxed">
              <code>{DEMO_CODE}</code>
            </pre>
          </div>
        )}
      </div>

      {/* ── Browser Support Table ── */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4 text-brand-400" />
          Browser Support
        </h3>
        <div className="rounded-lg bg-surface-light border border-slate-700/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/40">
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Browser</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Version</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Chrome', version: '84+', supported: true },
                { name: 'Edge', version: '84+', supported: true },
                { name: 'Opera', version: '70+', supported: true },
                { name: 'Samsung Internet', version: '14+', supported: true },
                { name: 'Chrome Android', version: '84+', supported: true },
                { name: 'Firefox', version: '126+', supported: true },
                { name: 'Safari', version: '16.4+', supported: true },
              ].map((browser) => (
                <tr key={browser.name} className="border-b border-slate-800/50">
                  <td className="px-4 py-2 text-slate-300">{browser.name}</td>
                  <td className="px-4 py-2 text-slate-400 font-mono">{browser.version}</td>
                  <td className="px-4 py-2">
                    {browser.supported ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Supported
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                        <XCircle className="w-3 h-3" />
                        Not supported
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Learn More ── */}
      <div className="flex flex-wrap gap-3">
        <a
          href={WAKE_LOCK_MDN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
        >
          MDN Documentation <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a
          href={CANIUSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
        >
          Can I Use <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </ToolLayout>
  );
}
