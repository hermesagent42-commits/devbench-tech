'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Bell, BellOff, Send, RotateCcw, Copy, Trash2, AlertTriangle,
  ShieldAlert, ShieldCheck, Clock, Info, Layers, Plus, Minus, Code2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface NotificationPreset {
  title: string;
  label: string;
  description: string;
  options: {
    title: string;
    body: string;
    icon: string;
    tag: string;
    requireInteraction: boolean;
    silent: boolean;
    data: Record<string, unknown>;
  };
}

interface NotificationLog {
  id: number;
  timestamp: number;
  title: string;
  body: string;
  tag: string;
  icon: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: NotificationPreset[] = [
  {
    title: '📬 New Message',
    label: 'message',
    description: 'A classic messaging notification with an icon. Good for showing incoming messages in a chat app.',
    options: {
      title: 'New Message',
      body: 'Alice: Hey! Are you free for lunch today? 🍕',
      icon: '📬',
      tag: 'chat-message',
      requireInteraction: false,
      silent: false,
      data: { type: 'message', conversationId: 'alice-42' },
    },
  },
  {
    title: '📅 Reminder',
    label: 'reminder',
    description: 'A sticky notification that stays until dismissed. Perfect for calendar events and reminders.',
    options: {
      title: 'Meeting in 10 minutes',
      body: 'Sprint Planning — Conference Room B • 2:00 PM today',
      icon: '📅',
      tag: 'calendar-reminder',
      requireInteraction: true,
      silent: false,
      data: { type: 'reminder', eventId: 'sprint-2026-05' },
    },
  },
  {
    title: '🔔 Silent Alert',
    label: 'silent',
    description: 'A silent notification — no sound, no vibration. Great for background sync, data updates, or low-priority info.',
    options: {
      title: 'Sync Complete',
      body: 'All 142 tasks synced successfully. 3 conflicts resolved automatically.',
      icon: '🔄',
      tag: 'sync-status',
      requireInteraction: false,
      silent: true,
      data: { type: 'sync', tasksCount: 142 },
    },
  },
  {
    title: '🏆 Achievement',
    label: 'achievement',
    description: 'A celebratory notification with emoji. Use for gamification, milestones, and positive feedback.',
    options: {
      title: '🏆 Achievement Unlocked!',
      body: 'You completed 100 days of coding! Your streak is legendary. 🔥',
      icon: '🏆',
      tag: 'achievement',
      requireInteraction: false,
      silent: false,
      data: { type: 'achievement', badge: '100-day-streak' },
    },
  },
  {
    title: '🛒 E-Commerce Sale',
    label: 'commerce',
    description: 'A promotional notification. Good for flash sales, price drops, and abandoned cart reminders.',
    options: {
      title: 'Flash Sale — 40% Off! ⚡',
      body: 'Your wishlist item "Ultra HD Monitor" just dropped to $299. Sale ends in 3 hours.',
      icon: '💰',
      tag: 'price-alert',
      requireInteraction: false,
      silent: false,
      data: { type: 'sale', productId: 'monitor-uhd', discount: 40 },
    },
  },
  {
    title: '🔐 Security Alert',
    label: 'security',
    description: 'A persistent security notification. Ideal for suspicious login attempts, password changes, or 2FA prompts.',
    options: {
      title: '🔐 New Login Detected',
      body: 'A sign-in from Chrome on Windows • San Francisco, CA. If this wasn\'t you, change your password immediately.',
      icon: '🔐',
      tag: 'security-alert',
      requireInteraction: true,
      silent: false,
      data: { type: 'security', location: 'San Francisco, CA', device: 'Chrome/Windows' },
    },
  },
  {
    title: '📊 Report Ready',
    label: 'report',
    description: 'Notification for generated content. Use when a background task completes and produces a downloadable result.',
    options: {
      title: '📊 Monthly Report Ready',
      body: 'Your June analytics report has been generated. 12,847 page views • +23% from last month.',
      icon: '📊',
      tag: 'report-ready',
      requireInteraction: false,
      silent: false,
      data: { type: 'report', reportUrl: '/reports/june-2026' },
    },
  },
  {
    title: '🤝 Collaboration',
    label: 'collaboration',
    description: 'A team-oriented notification with mention-style formatting. Good for CRMs, project management, and collaborative tools.',
    options: {
      title: 'Sarah mentioned you',
      body: 'Sarah: "@you can you review the PR for the auth refactor? It\'s ready for QA."',
      icon: '💬',
      tag: 'collab-mention',
      requireInteraction: false,
      silent: false,
      data: { type: 'mention', author: 'Sarah', prId: 'auth-refactor-v3' },
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function checkSupport(): PermissionState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as PermissionState;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}


// ── Component ──────────────────────────────────────────────────────────────

export default function NotificationPlayground() {
  // Permission
  const [permission, setPermission] = useState<PermissionState>('default');
  const [supportChecked, setSupportChecked] = useState(false);

  // Form state
  const [title, setTitle] = useState('Hello from DevBench!');
  const [body, setBody] = useState('This is a test notification from the Notification API Playground.');
  const [icon, setIcon] = useState('🔔');
  const [tag, setTag] = useState('');
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [silent, setSilent] = useState(false);

  // Log
  const [log, setLog] = useState<NotificationLog[]>([]);
  const [showLog, setShowLog] = useState(true);
  const [showPresets, setShowPresets] = useState(true);

  // Check support on mount
  useEffect(() => {
    const state = checkSupport();
    setPermission(state);
    setSupportChecked(true);
  }, []);

  // Re-check permission periodically (user may change in browser settings)
  useEffect(() => {
    const interval = setInterval(() => {
      const state = checkSupport();
      if (state !== permission) {
        setPermission(state);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [permission]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Notification API not supported in this browser.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === 'granted') {
        toast.success('Permission granted! 🎉');
      } else if (result === 'denied') {
        toast.error('Permission denied. You can reset this in browser settings.');
      }
    } catch {
      toast.error('Failed to request permission.');
    }
  }, []);

  const sendNotification = useCallback(() => {
    if (!('Notification' in window)) {
      toast.error('Notification API not supported.');
      return;
    }
    if (Notification.permission !== 'granted') {
      toast.error('Permission not granted. Click "Request Permission" first.');
      return;
    }

    const options: NotificationOptions = {
      body: body || 'Test notification body',
      icon: icon || undefined,
      tag: tag || undefined,
      requireInteraction,
      silent,
      data: { sentAt: Date.now(), type: 'custom' },
    };

    try {
      const notif = new Notification(title || 'DevBench Notification', options);

      notif.onclick = () => {
        window.focus();
        notif.close();
        toast('Notification clicked!', { icon: '👆' });
      };

      notif.onclose = () => {
        // tracked in log
      };

      notif.onshow = () => {
        setLog((prev) => [
          {
            id: Date.now(),
            timestamp: Date.now(),
            title: title || 'DevBench Notification',
            body: body || 'Test notification body',
            tag: tag || '(no tag)',
            icon: icon || '🔔',
          },
          ...prev.slice(0, 99), // keep last 100
        ]);
      };

      notif.onerror = () => {
        toast.error('Notification error — check browser settings.');
      };

      toast.success('Notification sent!');
    } catch (err) {
      toast.error(`Failed to send: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [title, body, icon, tag, requireInteraction, silent]);

  const applyPreset = useCallback((preset: NotificationPreset) => {
    setTitle(preset.options.title);
    setBody(preset.options.body);
    setIcon(preset.options.icon);
    setTag(preset.options.tag);
    setRequireInteraction(preset.options.requireInteraction);
    setSilent(preset.options.silent);
    toast.success(`Loaded preset: ${preset.title}`);
  }, []);

  const resetForm = useCallback(() => {
    setTitle('Hello from DevBench!');
    setBody('This is a test notification from the Notification API Playground.');
    setIcon('🔔');
    setTag('');
    setRequireInteraction(false);
    setSilent(false);
    toast.success('Form reset');
  }, []);

  const clearLog = useCallback(() => {
    setLog([]);
    toast.success('Log cleared');
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  const canSend = permission === 'granted' && title.trim().length > 0 && supportChecked;

  const permissionBadge = useMemo(() => {
    switch (permission) {
      case 'granted':
        return { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Granted' };
      case 'denied':
        return { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Denied' };
      case 'unsupported':
        return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Unsupported' };
      default:
        return { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Default' };
    }
  }, [permission]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Notification API Playground"
      description="Explore the browser Notification API — test permissions, try presets, configure every option, and see your notification history. 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap w-full">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${permissionBadge.bg} ${permissionBadge.border}`}>
            <permissionBadge.icon className={`w-4 h-4 ${permissionBadge.color}`} />
            <span className={permissionBadge.color}>{permissionBadge.label}</span>
          </div>

          {permission !== 'unsupported' && permission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium hover:bg-brand-500/20 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              Request Permission
            </button>
          )}

          {permission === 'denied' && (
            <button
              onClick={requestPermission}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Request
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column: Builder ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Title */}
          <div className="card">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          {/* Body */}
          <div className="card">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Body Text
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notification body text..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors resize-none"
            />
          </div>

          {/* Icon */}
          <div className="card">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Icon (emoji or URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🔔 or https://..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
              />
              <div className="flex gap-1">
                {['🔔', '📬', '📅', '🏆', '💰', '🔐'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-colors ${
                      icon === emoji
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tag */}
          <div className="card">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Tag <span className="text-slate-600">(replaces previous notification with same tag)</span>
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., chat-message (optional)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          {/* Options */}
          <div className="card space-y-3">
            <h3 className="text-xs font-medium text-slate-400">Options</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors relative ${
                requireInteraction ? 'bg-brand-500' : 'bg-slate-700'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                  requireInteraction ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <input
                type="checkbox"
                checked={requireInteraction}
                onChange={(e) => setRequireInteraction(e.target.checked)}
                className="sr-only"
              />
              <div>
                <span className="text-sm text-slate-300">Require Interaction</span>
                <p className="text-[10px] text-slate-500">Notification stays until user clicks or dismisses it</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors relative ${
                silent ? 'bg-brand-500' : 'bg-slate-700'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                  silent ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <input
                type="checkbox"
                checked={silent}
                onChange={(e) => setSilent(e.target.checked)}
                className="sr-only"
              />
              <div>
                <span className="text-sm text-slate-300">Silent</span>
                <p className="text-[10px] text-slate-500">No sound or vibration — appears quietly</p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={sendNotification}
              disabled={!canSend}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                canSend
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              Send Notification
            </button>

            <button
              onClick={resetForm}
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 text-sm hover:border-slate-600 hover:text-slate-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={clearLog}
              title="Clear log"
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 text-sm hover:border-slate-600 hover:text-slate-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Right Column: Presets & Log ──────────────────────────────────── */}
        <div className="space-y-5">
          {/* Presets */}
          <div className="card">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Presets ({PRESETS.length})
              </h3>
              <span className="text-slate-600">
                {showPresets ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showPresets && (
              <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className="w-full text-left p-3 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:border-brand-500/30 hover:bg-slate-800 transition-all group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg shrink-0">{preset.options.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 group-hover:text-brand-400 transition-colors">
                            {preset.title}
                          </span>
                          {preset.options.requireInteraction && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                              Sticky
                            </span>
                          )}
                          {preset.options.silent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              Silent
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                          {preset.description}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1 truncate">
                          &quot;{preset.options.body.slice(0, 60)}...&quot;
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Log */}
          <div className="card">
            <button
              onClick={() => setShowLog(!showLog)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Notification Log ({log.length})
              </h3>
              <span className="text-slate-600">
                {showLog ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showLog && (
              <div className="mt-3">
                {log.length === 0 ? (
                  <div className="text-center py-8">
                    <BellOff className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-600">No notifications sent yet. Use the builder to send one!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {log.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg border border-slate-700/30 bg-slate-800/30"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0">{entry.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-300">
                                {entry.title}
                              </span>
                              <span className="text-[10px] text-slate-600">
                                {formatTime(entry.timestamp)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                              {entry.body}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-600 bg-slate-700/50 px-1.5 py-0.5 rounded">
                                Tag: {entry.tag}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* API Info */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
            <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-400" />
              Notification API Facts
            </h4>
            <ul className="space-y-1.5 text-[10px] text-slate-500">
              <li>• <strong className="text-slate-400">Secure Context:</strong> Requires HTTPS (or localhost)</li>
              <li>• <strong className="text-slate-400">Permission:</strong> Must be explicitly granted by the user</li>
              <li>• <strong className="text-slate-400">Tags:</strong> Replace earlier notifications with the same tag</li>
              <li>• <strong className="text-slate-400">Silent:</strong> No sound/vibration — requires <code className="text-slate-400 bg-slate-700 px-1 rounded">silent</code> permission grant</li>
              <li>• <strong className="text-slate-400">Actions:</strong> Up to 2 buttons (Chrome/Edge only)</li>
              <li>• <strong className="text-slate-400">requireInteraction:</strong> Keeps notification visible until user dismisses</li>
              <li>• <strong className="text-slate-400">Service Workers:</strong> Enable notifications even when page is closed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Code example */}
      <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Generated JavaScript
          </h4>
          <button
            onClick={() => {
              const code = `// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  new Notification(${JSON.stringify(title)}, {
    body: ${JSON.stringify(body)},
    icon: ${JSON.stringify(icon)}${tag ? `,\n    tag: ${JSON.stringify(tag)}` : ''}${requireInteraction ? ',\n    requireInteraction: true' : ''}${silent ? ',\n    silent: true' : ''}
  });
}`;
              navigator.clipboard.writeText(code);
              toast.success('JavaScript copied!');
            }}
            className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-300 text-xs transition-colors flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
        <pre className="text-xs font-mono text-slate-400 overflow-x-auto">
          <code>{`// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  new Notification(${JSON.stringify(title)}, {
    body: ${JSON.stringify(body)},
    icon: ${JSON.stringify(icon)}${tag ? `,\n    tag: ${JSON.stringify(tag)}` : ''}${requireInteraction ? ',\n    requireInteraction: true' : ''}${silent ? ',\n    silent: true' : ''
          }
  });
}`}</code>
        </pre>
      </div>

      {/* Unsupported fallback */}
      {permission === 'unsupported' && (
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-400">Notification API Not Available</h4>
            <p className="text-xs text-amber-400/70 mt-1">
              This browser does not support the Notification API. Try Chrome, Edge, Firefox, or Safari. 
              The API requires a secure context (HTTPS or localhost).
            </p>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
