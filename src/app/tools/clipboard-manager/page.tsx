'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Clipboard, ClipboardType, Copy, Check, Trash2, Search,
  Pin, PinOff, Play, Pause, History, AlertTriangle,
  X, Clock, FileText, Hash, ImageIcon, Code, Link, Type,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ClipboardEntry {
  id: string;
  text: string;
  timestamp: number;
  pinned: boolean;
  type: 'text' | 'url' | 'code' | 'number' | 'empty' | 'multiline';
}

// ── Helpers ────────────────────────────────────────────────────────────────

function detectType(text: string): ClipboardEntry['type'] {
  if (!text.trim()) return 'empty';
  if (/^\d+(\.\d+)?$/.test(text.trim())) return 'number';
  if (/^https?:\/\/\S+$/.test(text.trim())) return 'url';
  if (/[\{\}\[\];]/.test(text) && /\n/.test(text)) return 'code';
  if (/\n/.test(text)) return 'multiline';
  return 'text';
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function truncateText(text: string, maxLen = 120): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

const STORAGE_KEY = 'devbench-clipboard-history';
const MAX_HISTORY = 100;
const POLL_INTERVAL = 750;

const typeIcons: Record<ClipboardEntry['type'], typeof Type> = {
  text: Type,
  url: Link,
  code: Code,
  number: Hash,
  empty: FileText,
  multiline: FileText,
};

const typeColors: Record<ClipboardEntry['type'], string> = {
  text: 'text-slate-400',
  url: 'text-blue-400',
  code: 'text-amber-400',
  number: 'text-green-400',
  empty: 'text-slate-600',
  multiline: 'text-purple-400',
};

export default function ClipboardManagerPage() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [monitoring, setMonitoring] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ClipboardEntry[] = JSON.parse(saved);
        setEntries(parsed);
      }
    } catch { }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
        .then(result => {
          setPermissionState(result.state as 'granted' | 'denied' | 'prompt');
        })
        .catch(() => {
          setPermissionState('unsupported');
        });
    } else {
      setPermissionState('unsupported');
    }
  }, []);

  useEffect(() => {
    if (!monitoring) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let lastValue = '';

    const poll = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastValue) {
          lastValue = text;
          const newEntry: ClipboardEntry = {
            id: generateId(),
            text,
            timestamp: Date.now(),
            pinned: false,
            type: detectType(text),
          };

          setEntries(prev => {
            if (prev.length > 0 && prev[0].text === text) return prev;
            const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch { }
            return updated;
          });
          setLastChecked(new Date().toLocaleTimeString());
        }
      } catch { }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [monitoring]);

  const copyToClipboard = useCallback(async (entry: ClipboardEntry) => {
    try {
      await navigator.clipboard.writeText(entry.text);
      setCopiedId(entry.id);
      toast.success('Copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const togglePin = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.map(e =>
        e.id === id ? { ...e, pinned: !e.pinned } : e
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch { }
      return updated;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch { }
      return updated;
    });
    toast.success('Entry deleted');
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { }
    setShowClearConfirm(false);
    toast.success('History cleared');
  }, []);

  const clearUnpinned = useCallback(() => {
    setEntries(prev => {
      const updated = prev.filter(e => e.pinned);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch { }
      return updated;
    });
    toast.success('Unpinned entries cleared');
  }, []);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e => e.text.toLowerCase().includes(q));
  }, [entries, search]);

  const stats = useMemo(() => {
    const pinned = entries.filter(e => e.pinned).length;
    return { total: entries.length, pinned };
  }, [entries]);

  function TypeIcon({ type }: { type: ClipboardEntry['type'] }) {
    const Icon = typeIcons[type];
    return <Icon className={`w-3.5 h-3.5 ${typeColors[type]}`} />;
  }

  return (
    <ToolLayout
      title="Clipboard Manager"
      description="Track everything you copy — a persistent clipboard history that survives page reloads. Search, pin, and re-copy with one click."
    >
      {permissionState === 'denied' && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <strong>Clipboard read permission denied.</strong> Enable clipboard access in your browser settings to auto-capture copies. You can still paste manually below.
          </div>
        </div>
      )}

      {permissionState === 'unsupported' && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <strong>Clipboard monitoring not available.</strong> This browser doesn&apos;t support the Clipboard API. Paste text manually below to add entries.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setMonitoring(!monitoring)}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            monitoring
              ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
              : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
          }`}
        >
          {monitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {monitoring ? 'Monitoring' : 'Start Monitoring'}
        </button>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clipboard history…"
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {entries.filter(e => !e.pinned).length > 0 && (
          <button
            onClick={clearUnpinned}
            className="px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-surface border border-slate-700/50 rounded-lg transition-colors"
          >
            Clear unpinned
          </button>
        )}

        {entries.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-surface border border-slate-700/50 rounded-lg transition-colors"
          >
            Clear all
          </button>
        )}

        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                const newEntry: ClipboardEntry = {
                  id: generateId(),
                  text,
                  timestamp: Date.now(),
                  pinned: false,
                  type: detectType(text),
                };
                setEntries(prev => {
                  if (prev.length > 0 && prev[0].text === text) return prev;
                  const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                  } catch { }
                  return updated;
                });
                toast.success('Pasted from clipboard!');
              }
            } catch {
              toast.error('Could not read clipboard');
            }
          }}
          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-2"
        >
          <ClipboardType className="w-4 h-4" />
          Capture Now
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          <span>{stats.total} entries</span>
        </div>
        {stats.pinned > 0 && (
          <div className="flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-brand-400" />
            <span>{stats.pinned} pinned</span>
          </div>
        )}
        {lastChecked && monitoring && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>Last check: {lastChecked}</span>
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-light border border-slate-700/50 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Clear all history?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will permanently delete {entries.length} clipboard entries. Pinned entries will also be removed. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-surface border border-slate-700/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      {!monitoring && entries.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-slate-500">
          <Clipboard className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm font-medium">No clipboard history yet</p>
          <p className="text-xs mt-1">Start monitoring or press &quot;Capture Now&quot; to add your first entry.</p>
          <button
            onClick={() => setMonitoring(true)}
            className="mt-4 px-4 py-2 text-sm font-medium text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Monitoring
          </button>
        </div>
      )}

      {monitoring && entries.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-slate-500">
          <Clipboard className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm font-medium">Listening for clipboard copies…</p>
          <p className="text-xs mt-1">
            Copy anything (<kbd className="px-1.5 py-0.5 text-xs bg-surface-lighter border border-slate-600/50 rounded text-slate-400">Ctrl+C</kbd>) and it&apos;ll appear here automatically.
          </p>
        </div>
      )}

      {filteredEntries.length > 0 && (
        <div className="space-y-2">
          {filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={`card !p-0 group transition-all ${
                entry.pinned ? 'border-brand-500/30 shadow-brand-500/5' : ''
              }`}
            >
              <div className="flex items-start gap-3 p-3">
                <div className="mt-0.5 shrink-0">
                  <TypeIcon type={entry.type} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                      {entry.type}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {formatTime(entry.timestamp)}
                    </span>
                    {entry.pinned && (
                      <Pin className="w-3 h-3 text-brand-400" />
                    )}
                  </div>
                  <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {truncateText(entry.text)}
                  </pre>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyToClipboard(entry)}
                    className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => togglePin(entry.id)}
                    className={`p-1.5 rounded-md hover:bg-slate-700/50 transition-colors ${
                      entry.pinned ? 'text-brand-400' : 'text-slate-500 hover:text-white'
                    }`}
                    title={entry.pinned ? 'Unpin' : 'Pin'}
                  >
                    {entry.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {entry.text.length > 120 && (
                <details className="border-t border-slate-700/30">
                  <summary className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 cursor-pointer select-none">
                    Show full text ({entry.text.length} chars)
                  </summary>
                  <pre className="px-4 pb-4 text-sm text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed overflow-x-auto">
                    {entry.text}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {search && filteredEntries.length === 0 && entries.length > 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-slate-500">
          <Search className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No entries match &quot;{search}&quot;</p>
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/30 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">How it works</p>
        <p>• This tool polls your clipboard <strong>every {POLL_INTERVAL}ms</strong> while monitoring is active</p>
        <p>• All history is stored in your browser&apos;s <strong>localStorage</strong> — nothing leaves your machine</p>
        <p>• Maximum <strong>{MAX_HISTORY}</strong> entries are kept; oldest are automatically removed</p>
        <p>• <strong>Pin</strong> entries to protect them from automatic cleanup</p>
        <p>• Clipboard monitoring requires the browser&apos;s clipboard-read permission</p>
      </div>
    </ToolLayout>
  );
}
