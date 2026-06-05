'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Database,
  HardDrive,
  FolderOpen,
  Table,
  Trash2,
  Copy,
  Download,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  FileJson,
  AlertTriangle,
  Info,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldQuestion,
  X,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface IDBDatabaseMeta {
  name: string;
  version: number;
  objectStores: string[];
}

interface IDBStoreSchema {
  name: string;
  keyPath: string | null;
  autoIncrement: boolean;
  indexes: string[];
}

interface IDBRecord {
  key: IDBValidKey;
  value: unknown;
}

interface BrowseState {
  dbName: string;
  storeName: string;
  records: IDBRecord[];
  recordCount: number;
  filterText: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatValue(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function truncate(str: string, maxLen = 60): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function getTypeBadge(val: unknown): { label: string; color: string } {
  if (val === null) return { label: 'null', color: 'bg-slate-600 text-slate-300' };
  if (Array.isArray(val)) return { label: 'array', color: 'bg-purple-900/50 text-purple-300 border border-purple-700/50' };
  const t = typeof val;
  switch (t) {
    case 'string': return { label: 'string', color: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' };
    case 'number': return { label: 'number', color: 'bg-blue-900/50 text-blue-300 border border-blue-700/50' };
    case 'boolean': return { label: 'boolean', color: 'bg-amber-900/50 text-amber-300 border border-amber-700/50' };
    case 'object': return { label: 'object', color: 'bg-pink-900/50 text-pink-300 border border-pink-700/50' };
    default: return { label: t, color: 'bg-slate-600 text-slate-300' };
  }
}

// ── IndexedDB Operations ───────────────────────────────────────────────────

async function getDatabases(): Promise<IDBDatabaseMeta[]> {
  if (!('indexedDB' in globalThis)) return [];
  try {
    const dbs = await indexedDB.databases();
    return dbs
      .filter((d): d is { name: string; version: number } => d.name !== undefined)
      .map((d) => ({
        name: d.name,
        version: d.version ?? 1,
        objectStores: [],
      }));
  } catch {
    return [];
  }
}

async function getObjectStores(dbName: string): Promise<IDBStoreSchema[]> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => {
      const db = req.result;
      const stores: IDBStoreSchema[] = [];
      for (let i = 0; i < db.objectStoreNames.length; i++) {
        const name = db.objectStoreNames[i];
        const tx = db.transaction(name, 'readonly');
        const store = tx.objectStore(name);
        stores.push({
          name,
          keyPath: store.keyPath !== undefined ? (typeof store.keyPath === 'string' ? store.keyPath : JSON.stringify(store.keyPath)) : null,
          autoIncrement: store.autoIncrement,
          indexes: Array.from(store.indexNames),
        });
      }
      db.close();
      resolve(stores);
    };
    req.onerror = () => resolve([]);
    req.onblocked = () => resolve([]);
  });
}

async function readAllRecords(
  dbName: string,
  storeName: string,
): Promise<{ records: IDBRecord[]; count: number }> {
  return new Promise((resolve) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const cursorReq = store.openCursor();
      const records: IDBRecord[] = [];

      cursorReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          records.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve({ records, count: records.length });
      };

      tx.onerror = () => {
        db.close();
        resolve({ records: [], count: 0 });
      };
    };
    req.onerror = () => resolve({ records: [], count: 0 });
    req.onblocked = () => resolve({ records: [], count: 0 });
  });
}

async function deleteDatabase(dbName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

async function deleteRecord(
  dbName: string,
  storeName: string,
  key: IDBValidKey,
): Promise<boolean> {
  return new Promise((resolve) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    };
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

async function clearStore(dbName: string, storeName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    };
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IndexedDBExplorer() {
  const [databases, setDatabases] = useState<IDBDatabaseMeta[]>([]);
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set());
  const [stores, setStores] = useState<Record<string, IDBStoreSchema[]>>({});
  const [loadingDbs, setLoadingDbs] = useState<Set<string>>(new Set());
  const [browse, setBrowse] = useState<BrowseState | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<IDBRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [featureSupport, setFeatureSupport] = useState<{
    databases: boolean;
    indexedDB: boolean;
    error: string | null;
  }>({ databases: false, indexedDB: false, error: null });

  // Detect feature support on mount
  useEffect(() => {
    const hasIDB = typeof indexedDB !== 'undefined';
    let hasDbs: boolean;
    try {
      hasDbs = hasIDB && typeof indexedDB.databases === 'function';
    } catch {
      hasDbs = false;
    }
    setFeatureSupport({ databases: hasDbs, indexedDB: hasIDB, error: null });
    if (hasDbs) refreshDatabases();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  const refreshDatabases = useCallback(async () => {
    setLoading(true);
    const dbs = await getDatabases();
    setDatabases(dbs);
    setLoading(false);
  }, []);

  const toggleExpand = useCallback(
    async (dbName: string) => {
      const next = new Set(expandedDbs);
      if (next.has(dbName)) {
        next.delete(dbName);
        setExpandedDbs(next);
      } else {
        next.add(dbName);
        setExpandedDbs(next);

        // Fetch object stores on expand
        if (!stores[dbName]) {
          setLoadingDbs((prev) => new Set(prev).add(dbName));
          const schema = await getObjectStores(dbName);
          setStores((prev) => ({ ...prev, [dbName]: schema }));
          setLoadingDbs((prev) => {
            const nextSet = new Set(prev);
            nextSet.delete(dbName);
            return nextSet;
          });
        }
      }
    },
    [expandedDbs, stores],
  );

  const browseStore = useCallback(async (dbName: string, storeName: string) => {
    setLoading(true);
    const { records, count: recordCount } = await readAllRecords(dbName, storeName);
    setBrowse({ dbName, storeName, records, recordCount, filterText: '' });
    setSelectedRecord(null);
    setLoading(false);
  }, []);

  const handleDeleteDb = useCallback(
    async (dbName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm(`Delete database "${dbName}" and all its data? This cannot be undone.`)) return;
      const ok = await deleteDatabase(dbName);
      if (ok) {
        toast.success(`Deleted "${dbName}"`);
        setExpandedDbs((prev) => {
          const next = new Set(prev);
          next.delete(dbName);
          return next;
        });
        setStores((prev) => {
          const next = { ...prev };
          delete next[dbName];
          return next;
        });
        refreshDatabases();
      } else {
        toast.error(`Could not delete "${dbName}"`);
      }
    },
    [refreshDatabases],
  );

  const handleDeleteRecord = useCallback(
    async (key: IDBValidKey) => {
      if (!browse) return;
      if (!confirm(`Delete record with key "${formatValue(key)}"?`)) return;
      const ok = await deleteRecord(browse.dbName, browse.storeName, key);
      if (ok) {
        toast.success('Record deleted');
        setSelectedRecord(null);
        browseStore(browse.dbName, browse.storeName);
      } else {
        toast.error('Could not delete record');
      }
    },
    [browse, browseStore],
  );

  const handleClearStore = useCallback(async () => {
    if (!browse) return;
    if (!confirm(`Delete ALL records from "${browse.dbName}" / "${browse.storeName}"?`)) return;
    const ok = await clearStore(browse.dbName, browse.storeName);
    if (ok) {
      toast.success('Store cleared');
      browseStore(browse.dbName, browse.storeName);
    } else {
      toast.error('Could not clear store');
    }
  }, [browse, browseStore]);

  const handleExport = useCallback(
    (format: 'json' | 'csv') => {
      if (!browse) return;
      let content: string;
      let filename: string;
      let mime: string;

      if (format === 'json') {
        const data = browse.records.map((r) => ({ key: r.key, value: r.value }));
        content = JSON.stringify(data, null, 2);
        filename = `${browse.dbName}-${browse.storeName}.json`;
        mime = 'application/json';
      } else {
        // CSV: keys as first column
        const headers = ['_idb_key'];
        // Collect all value keys from the first object-like record
        const firstObj = browse.records.find(
          (r) => r.value !== null && typeof r.value === 'object',
        );
        if (firstObj && !Array.isArray(firstObj.value)) {
          headers.push(...Object.keys(firstObj.value as object));
        } else {
          headers.push('_value');
        }
        const rows = browse.records.map((r) => {
          const row: string[] = [formatValue(r.key)];
          if (
            r.value !== null &&
            typeof r.value === 'object' &&
            !Array.isArray(r.value)
          ) {
            headers.slice(1).forEach((h) => {
              row.push(formatValue((r.value as Record<string, unknown>)[h] ?? ''));
            });
          } else {
            row.push(formatValue(r.value));
          }
          return row.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
        });
        content = [headers.join(','), ...rows].join('\n');
        filename = `${browse.dbName}-${browse.storeName}.csv`;
        mime = 'text/csv';
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    },
    [browse],
  );

  const copyRecord = useCallback((record: IDBRecord) => {
    const str = JSON.stringify({ key: record.key, value: record.value }, null, 2);
    navigator.clipboard.writeText(str).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Failed to copy'),
    );
  }, []);

  // ── Filter ───────────────────────────────────────────────────────────────

  const filteredRecords = useMemo(() => {
    if (!browse || !browse.filterText) return browse?.records ?? [];
    const q = browse.filterText.toLowerCase();
    return browse.records.filter((r) => {
      const keyStr = formatValue(r.key).toLowerCase();
      const valStr = formatValue(r.value).toLowerCase();
      return keyStr.includes(q) || valStr.includes(q);
    });
  }, [browse]);

  // ── Feature unavailable ──────────────────────────────────────────────────

  if (!featureSupport.indexedDB) {
    return (
      <ToolLayout
        title="IndexedDB Explorer"
        description="Inspect, browse, and export IndexedDB databases on the current origin."
      >
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-400" />
          <h2 className="text-xl font-semibold text-white">IndexedDB Not Available</h2>
          <p className="text-center max-w-md">
            Your browser does not support IndexedDB, or it is disabled. IndexedDB
            is available in all modern browsers (Chrome, Firefox, Safari, Edge).
          </p>
        </div>
      </ToolLayout>
    );
  }

  if (!featureSupport.databases) {
    return (
      <ToolLayout
        title="IndexedDB Explorer"
        description="Inspect, browse, and export IndexedDB databases on the current origin."
      >
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <ShieldQuestion className="w-12 h-12 text-amber-400" />
          <h2 className="text-xl font-semibold text-white">indexedDB.databases() Not Available</h2>
          <p className="text-center max-w-md">
            Your browser does not expose the <code className="text-brand-400">indexedDB.databases()</code>{' '}
            API, which is required to discover databases. This API is available in
            Chrome 76+, Edge 79+, and Firefox 117+.
          </p>
        </div>
      </ToolLayout>
    );
  }

  // ── Browse mode (records view) ───────────────────────────────────────────

  if (browse) {
    return (
      <ToolLayout
        title="IndexedDB Explorer"
        description={`Browsing ${browse.dbName} → ${browse.storeName} (${browse.recordCount} records)`}
        controls={
          <>
            <button
              onClick={() => { setBrowse(null); setSelectedRecord(null); }}
              className="btn btn-ghost text-sm"
            >
              ← Back
            </button>
            <span className="text-slate-500 text-sm">
              {browse.dbName} / {browse.storeName}
            </span>
            <span className="text-slate-600 text-xs ml-auto">
              {filteredRecords.length} of {browse.recordCount} records
            </span>
          </>
        }
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Search filter */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter records by key or value…"
              value={browse.filterText}
              onChange={(e) =>
                setBrowse({ ...browse, filterText: e.target.value })
              }
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            onClick={() => browseStore(browse.dbName, browse.storeName)}
            className="btn btn-ghost text-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleExport('json')}
            className="btn btn-ghost text-sm"
            title="Export as JSON"
          >
            <Download className="w-4 h-4 mr-1" /> JSON
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="btn btn-ghost text-sm"
            title="Export as CSV"
          >
            <Download className="w-4 h-4 mr-1" /> CSV
          </button>

          <button
            onClick={handleClearStore}
            className="btn btn-ghost text-sm text-red-400 hover:text-red-300"
            title="Delete all records in this store"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Clear
          </button>
        </div>

        {/* Main layout: table + detail panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Records table */}
          <div className="lg:col-span-2 border border-slate-700 rounded-lg overflow-hidden">
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                {browse.recordCount === 0
                  ? 'No records in this store.'
                  : 'No records match the filter.'}
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr className="border-b border-slate-700 text-slate-400 text-left">
                      <th className="px-4 py-2 font-medium w-[40%]">Key</th>
                      <th className="px-4 py-2 font-medium w-[20%]">Type</th>
                      <th className="px-4 py-2 font-medium w-[30%]">Value Preview</th>
                      <th className="px-4 py-2 font-medium w-[10%]" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, i) => {
                      const keyStr = formatValue(record.key);
                      const valStr = formatValue(record.value);
                      const type = getTypeBadge(record.value);
                      const isSelected =
                        selectedRecord &&
                        formatValue(selectedRecord.key) === keyStr;

                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedRecord(record)}
                          className={`border-b border-slate-800 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-brand-900/20'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="px-4 py-2 font-mono text-xs text-white truncate max-w-[200px]">
                            {truncate(keyStr, 40)}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${type.color}`}
                            >
                              {type.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-400 text-xs truncate max-w-[180px]">
                            {truncate(
                              record.value === null
                                ? 'null'
                                : typeof record.value === 'object'
                                  ? JSON.stringify(record.value)
                                  : String(record.value),
                              45,
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyRecord(record);
                                }}
                                className="p-1 hover:text-brand-400 text-slate-500"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRecord(record.key);
                                }}
                                className="p-1 hover:text-red-400 text-slate-500"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
            {selectedRecord ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-brand-400" />
                    Record Detail
                  </h3>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Key */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      Key
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <code className="text-sm text-white break-all">
                        {formatValue(selectedRecord.key)}
                      </code>
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      Type
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono ${
                        getTypeBadge(selectedRecord.value).color
                      }`}
                    >
                      {getTypeBadge(selectedRecord.value).label}
                    </span>
                  </div>

                  {/* Value */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      Value
                    </div>
                    <pre className="text-xs text-slate-300 bg-slate-800 rounded p-3 overflow-auto max-h-[400px] font-mono leading-relaxed">
                      {formatValue(selectedRecord.value)}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => copyRecord(selectedRecord)}
                      className="btn btn-ghost text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(selectedRecord.key)}
                      className="btn btn-ghost text-xs text-red-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <Eye className="w-8 h-8" />
                <p className="text-sm text-center">
                  Click a row to view record details
                </p>
              </div>
            )}
          </div>
        </div>
      </ToolLayout>
    );
  }

  // ── Database list view ───────────────────────────────────────────────────

  return (
    <ToolLayout
      title="IndexedDB Explorer"
      description="Inspect, browse, and export IndexedDB databases on the current origin."
      controls={
        <button
          onClick={refreshDatabases}
          className="btn btn-ghost text-sm flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      {databases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <Database className="w-12 h-12 text-slate-600" />
          <h2 className="text-xl font-semibold text-white">No Databases Found</h2>
          <p className="text-center max-w-md text-sm">
            There are no IndexedDB databases on this origin (
            <span className="text-brand-400 font-mono text-xs">
              {typeof window !== 'undefined' ? window.location.origin : 'unknown'}
            </span>
            ). Create one with{' '}
            <code className="text-brand-400">indexedDB.open(&apos;name&apos;, version)</code>{' '}
            or use an app that stores data locally.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 mb-3">
            {databases.length} database{databases.length !== 1 ? 's' : ''} on{' '}
            <span className="text-brand-400 font-mono">
              {typeof window !== 'undefined' ? window.location.origin : '…'}
            </span>
          </div>
          {databases.map((db) => {
            const isExpanded = expandedDbs.has(db.name);
            const isLoading = loadingDbs.has(db.name);
            const schema = stores[db.name] ?? [];

            return (
              <div
                key={db.name}
                className="border border-slate-700 rounded-lg overflow-hidden"
              >
                {/* DB Header */}
                <button
                  onClick={() => toggleExpand(db.name)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <Database className="w-4 h-4 text-brand-400" />
                  <span className="text-white font-medium text-sm">{db.name}</span>
                  <span className="text-slate-500 text-xs ml-auto">
                    v{db.version}
                  </span>
                  <button
                    onClick={(e) => handleDeleteDb(db.name, e)}
                    className="p-1 hover:text-red-400 text-slate-600 hover:bg-slate-700/50 rounded"
                    title="Delete database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>

                {/* Expanded: Object Stores */}
                {isExpanded && (
                  <div className="border-t border-slate-700 bg-slate-900/30">
                    {isLoading ? (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                        Loading schema…
                      </div>
                    ) : schema.length === 0 ? (
                      <div className="px-4 py-4 text-center text-slate-500 text-xs">
                        No object stores found.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {schema.map((store) => (
                          <div
                            key={store.name}
                            className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-800/50 transition-colors"
                          >
                            <Table className="w-3.5 h-3.5 text-slate-400" />
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => browseStore(db.name, store.name)}
                                className="text-sm text-white hover:text-brand-400 transition-colors text-left font-mono truncate block w-full"
                              >
                                {store.name}
                              </button>
                              <div className="flex items-center gap-2 mt-0.5">
                                {store.keyPath && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    keyPath:{' '}
                                    <span className="text-slate-400">
                                      {store.keyPath}
                                    </span>
                                  </span>
                                )}
                                {store.autoIncrement && (
                                  <span className="text-[10px] text-amber-400">
                                    auto-increment
                                  </span>
                                )}
                                {store.indexes.length > 0 && (
                                  <span className="text-[10px] text-slate-500">
                                    indexes:{' '}
                                    <span className="text-slate-400">
                                      {store.indexes.join(', ')}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => browseStore(db.name, store.name)}
                              className="btn btn-ghost text-xs px-2 py-1"
                            >
                              Browse
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex items-start gap-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-400 space-y-1">
          <p>
            This tool lists all IndexedDB databases on{' '}
            <span className="text-brand-400 font-mono">
              {typeof window !== 'undefined' ? window.location.origin : 'current origin'}
            </span>
            . Each origin has its own isolated storage.
          </p>
          <p>
            <strong>Storage quota:</strong>{' '}
            {typeof navigator !== 'undefined' && 'storage' in navigator
              ? 'Use the Storage API to check usage and quota.'
              : 'Browsers typically allow 50-80% of disk space.'}
          </p>
          <p className="text-amber-400/80">
            ⚠ Deleting a database is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
