'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Database,
  Trash2,
  Copy,
  Download,
  Upload,
  Plus,
  Search,
  RefreshCw,
  HardDrive,
  Archive,
  Edit3,
  Check,
  X,
  AlertTriangle,
  FileJson,
  Key,
  Hash,
  Type,
  GripHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type StorageType = 'localStorage' | 'sessionStorage';

interface StorageEntry {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'unknown';
  size: number;
  parsed: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function detectType(raw: string): StorageEntry['type'] {
  if (raw === 'null') return 'null';
  if (raw === 'true' || raw === 'false') return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(raw)) return 'number';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return 'array';
    if (parsed !== null && typeof parsed === 'object') return 'object';
  } catch {
    // not JSON
  }
  return 'string';
}

function parseValue(raw: string): unknown {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function getByteSize(str: string): number {
  return new Blob([str]).size;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getTypeColor(type: StorageEntry['type']): string {
  const map: Record<StorageEntry['type'], string> = {
    string: 'text-emerald-400',
    number: 'text-amber-400',
    boolean: 'text-purple-400',
    object: 'text-blue-400',
    array: 'text-cyan-400',
    null: 'text-slate-500',
    unknown: 'text-slate-400',
  };
  return map[type];
}

function getTypeBg(type: StorageEntry['type']): string {
  const map: Record<StorageEntry['type'], string> = {
    string: 'bg-emerald-500/10',
    number: 'bg-amber-500/10',
    boolean: 'bg-purple-500/10',
    object: 'bg-blue-500/10',
    array: 'bg-cyan-500/10',
    null: 'bg-slate-500/10',
    unknown: 'bg-slate-500/10',
  };
  return map[type];
}

function getTypeIcon(type: StorageEntry['type']) {
  switch (type) {
    case 'string': return Type;
    case 'number': return Hash;
    case 'boolean': return Check;
    case 'object': return Database;
    case 'array': return GripHorizontal;
    case 'null': return X;
    default: return Key;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function BrowserStorageExplorer() {
  const [storageType, setStorageType] = useState<StorageType>('localStorage');
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showRawValue, setShowRawValue] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Load storage ──────────────────────────────────────────────────────────

  const loadStorage = useCallback(() => {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      const result: StorageEntry[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)!;
        const raw = storage.getItem(key)!;
        result.push({
          key,
          value: raw,
          type: detectType(raw),
          size: getByteSize(raw),
          parsed: parseValue(raw),
        });
      }
      setEntries(result);
    } catch (err) {
      toast.error('Could not access storage — may be blocked by browser settings');
    }
  }, [storageType]);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  // ── Filtered entries ──────────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const typeCounts: Record<string, number> = {};
    entries.forEach((e) => {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    });
    return { totalSize, count: entries.length, typeCounts };
  }, [entries]);

  const storageLimit = useMemo(() => {
    // ~5MB is typical for localStorage, sessionStorage can vary
    return storageType === 'localStorage' ? 5 * 1024 * 1024 : 5 * 1024 * 1024;
  }, [storageType]);

  const usagePercent = useMemo(() => {
    return Math.min((stats.totalSize / storageLimit) * 100, 100);
  }, [stats.totalSize, storageLimit]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const deleteKey = useCallback(
    (key: string) => {
      try {
        const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
        storage.removeItem(key);
        toast.success(`Deleted "${key}"`);
        loadStorage();
      } catch {
        toast.error('Failed to delete');
      }
    },
    [storageType, loadStorage]
  );

  const saveEdit = useCallback(
    (key: string) => {
      try {
        const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem(key, editValue);
        toast.success(`Updated "${key}"`);
        setEditingKey(null);
        loadStorage();
      } catch {
        toast.error('Failed to save — may exceed quota');
      }
    },
    [storageType, editValue, loadStorage]
  );

  const addEntry = useCallback(() => {
    if (!newKey.trim()) {
      toast.error('Key is required');
      return;
    }
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      storage.setItem(newKey.trim(), newValue);
      toast.success(`Added "${newKey.trim()}"`);
      setNewKey('');
      setNewValue('');
      setShowAddForm(false);
      loadStorage();
    } catch {
      toast.error('Failed to add — may exceed quota');
    }
  }, [storageType, newKey, newValue, loadStorage]);

  const clearAll = useCallback(() => {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      storage.clear();
      toast.success(`Cleared all ${storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'}`);
      setConfirmClear(false);
      loadStorage();
    } catch {
      toast.error('Failed to clear');
    }
  }, [storageType, loadStorage]);

  const exportJSON = useCallback(() => {
    const obj: Record<string, unknown> = {};
    entries.forEach((e) => {
      obj[e.key] = e.parsed;
    });
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storageType}-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported storage as JSON');
  }, [entries, storageType]);

  const importJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
        let count = 0;
        for (const [key, value] of Object.entries(obj)) {
          storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          count++;
        }
        toast.success(`Imported ${count} keys`);
        loadStorage();
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    input.click();
  }, [storageType, loadStorage]);

  const copyValue = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  }, []);

  const copyKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Key copied');
  }, []);

  // ── Truncate for display ──────────────────────────────────────────────────

  const truncateValue = (value: string, maxLen = 100) => {
    if (value.length <= maxLen) return value;
    return value.slice(0, maxLen) + '…';
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Browser Storage Explorer"
      description="Inspect, edit, and manage localStorage and sessionStorage. Export, import, and debug your web storage."
    >
      {/* ── Header Controls ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
          <button
            onClick={() => setStorageType('localStorage')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              storageType === 'localStorage'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            localStorage
          </button>
          <button
            onClick={() => setStorageType('sessionStorage')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              storageType === 'sessionStorage'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            sessionStorage
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportJSON}
            disabled={entries.length === 0}
            className="px-3 py-1.5 text-xs rounded-md bg-slate-800/70 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={importJSON}
            className="px-3 py-1.5 text-xs rounded-md bg-slate-800/70 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600/50 transition-all flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 text-xs rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Key
          </button>
          <button
            onClick={loadStorage}
            className="px-3 py-1.5 text-xs rounded-md bg-slate-800/70 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600/50 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Usage Bar ──────────────────────────────────────────────────────── */}
      <div className="mb-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3 h-3" />
            Storage usage
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {formatBytes(stats.totalSize)} / ~{formatBytes(storageLimit)}
          </span>
        </div>
        <div className="h-2 bg-slate-700/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usagePercent > 90
                ? 'bg-red-500'
                : usagePercent > 70
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(usagePercent, 0.5)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-500">
            {stats.count} key{stats.count !== 1 ? 's' : ''}
          </span>
          {Object.entries(stats.typeCounts).length > 0 && (
            <div className="flex items-center gap-2">
              {Object.entries(stats.typeCounts).map(([type, count]) => (
                <span key={type} className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${getTypeBg(type as StorageEntry['type'])}`} />
                  {type}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keys and values…"
          className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
      </div>

      {/* ── Add Form ───────────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-indigo-300">Add New Key</span>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Key name"
              className="px-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
              autoFocus
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="px-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
            <button
              onClick={addEntry}
              disabled={!newKey.trim()}
              className="px-4 py-2 bg-indigo-500/30 text-indigo-200 text-sm font-medium rounded-lg hover:bg-indigo-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* ── Clear All ──────────────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="mb-4 flex justify-end">
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1.5 text-xs rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Delete all {stats.count} keys?
              </span>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-md bg-red-500/30 text-red-200 hover:bg-red-500/40 transition-all"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 text-xs rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Entries List ───────────────────────────────────────────────────── */}
      {filteredEntries.length === 0 && !search && (
        <div className="text-center py-16">
          <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-1">No data in {storageType}</h3>
          <p className="text-sm text-slate-500">
            {storageType === 'localStorage'
              ? 'localStorage persists across browser sessions.'
              : 'sessionStorage is cleared when the tab closes.'}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-4 py-2 text-sm rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add your first key
          </button>
        </div>
      )}

      {filteredEntries.length === 0 && search && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No keys matching &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {filteredEntries.length > 0 && (
        <div className="space-y-2">
          {filteredEntries.map((entry) => (
            <div
              key={`${storageType}-${entry.key}`}
              className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all"
            >
              {/* ── Key Row ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => copyKey(entry.key)}
                    className="text-slate-300 hover:text-white font-mono text-sm truncate max-w-[200px] sm:max-w-[300px] transition-colors"
                    title={`Click to copy: ${entry.key}`}
                  >
                    {entry.key}
                  </button>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getTypeBg(
                      entry.type
                    )} ${getTypeColor(entry.type)}`}
                  >
                    {entry.type}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    {formatBytes(entry.size)}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyValue(entry.value)}
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-md transition-all"
                    title="Copy value"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (editingKey === entry.key) {
                        setEditingKey(null);
                      } else {
                        setEditingKey(entry.key);
                        setEditValue(entry.value);
                      }
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      editingKey === entry.key
                        ? 'text-indigo-300 bg-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                    }`}
                    title="Edit value"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteKey(entry.key)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                    title="Delete key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Value Preview ──────────────────────────────────────────── */}
              <div className="px-4 pb-3">
                {editingKey === entry.key ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900/80 border border-indigo-500/30 rounded-lg text-sm text-slate-200 font-mono resize-y min-h-[60px] max-h-[300px] focus:outline-none focus:border-indigo-500/50 transition-all"
                      autoFocus
                      rows={editValue.split('\n').length > 5 ? 5 : editValue.split('\n').length || 1}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(entry.key)}
                        className="px-3 py-1.5 text-xs rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        className="px-3 py-1.5 text-xs rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      onClick={() =>
                        setShowRawValue(showRawValue === entry.key ? null : entry.key)
                      }
                      className="text-sm text-slate-400 font-mono bg-slate-900/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-900/80 transition-all break-all whitespace-pre-wrap max-h-[72px] overflow-hidden relative group"
                    >
                      {truncateValue(entry.value, 200)}
                      {entry.value.length > 200 && (
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900/80 to-transparent" />
                      )}
                      {entry.value.length > 200 && (
                        <span className="absolute bottom-1 right-3 text-[10px] text-indigo-400">
                          Click to expand ({entry.value.length} chars)
                        </span>
                      )}
                    </div>
                    {showRawValue === entry.key && entry.value.length > 200 && (
                      <div className="mt-2 bg-slate-900/80 rounded-lg p-3 border border-slate-700/50">
                        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all max-h-[400px] overflow-auto">
                          {entry.value}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Info Footer ────────────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <div className="flex items-start gap-3">
            <FileJson className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-1">
                About {storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {storageType === 'localStorage'
                  ? 'Data persists indefinitely across browser sessions. Origin-limited to ~5MB. Synchronous API — avoid storing large blobs.'
                  : 'Data is cleared when the page session ends (tab/window closed). Same ~5MB origin limit. Ideal for temporary state.'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-slate-600">Storage event:</span>
                <code className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                  window.addEventListener(&apos;storage&apos;, ...)
                </code>
                <span className="text-[10px] text-slate-600">
                  {' '}
                  fires on{' '}
                  {storageType === 'localStorage' ? 'other tabs' : 'same tab'} only
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
