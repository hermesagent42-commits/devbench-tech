'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Plus, Trash2, Edit3, Copy, RotateCcw,
  FileText, Code2, Check, X, Info, FolderUp, Image,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FormEntry {
  id: number;
  key: string;
  value: string;
  type: 'text' | 'file';
  file?: { name: string; size: number; type: string; lastModified: number; dataUrl: string | null; };
}

type ActiveView = 'entries' | 'keys' | 'values';

interface MethodResult { method: string; args: string; result: string; }

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FormDataExplorerPage() {
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('entries');
  const [methodLog, setMethodLog] = useState<MethodResult[]>([]);
  const [methodQueryKey, setMethodQueryKey] = useState('');
  const [methodQueryValue, setMethodQueryValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const liveFormData = useMemo((): FormData => {
    const fd = new FormData();
    for (const entry of entries) {
      if (entry.type === 'file' && entry.file) {
        const blob = new Blob([''], { type: entry.file.type || 'application/octet-stream' });
        fd.append(entry.key, blob, entry.file.name);
      } else {
        fd.append(entry.key, entry.value);
      }
    }
    return fd;
  }, [entries]);

  const entryArray = useMemo(() => {
    const result: { key: string; value: string }[] = [];
    liveFormData.forEach((value, key) => {
      result.push({ key, value: value instanceof File ? `[File: ${value.name}]` : String(value) });
    });
    return result;
  }, [liveFormData]);

  const keyArray = useMemo(() => {
    const keys: string[] = [];
    for (const k of liveFormData.keys()) keys.push(k);
    return keys;
  }, [liveFormData]);

  const valueArray = useMemo(() => {
    const vals: string[] = [];
    for (const v of liveFormData.values()) vals.push(v instanceof File ? `[File: ${v.name}]` : v);
    return vals;
  }, [liveFormData]);

  const addEntry = useCallback(() => {
    const key = (editId !== null ? editKey : newKey).trim();
    if (!key) { toast.error('Key is required'); return; }
    if (editId !== null) {
      setEntries(prev => prev.map(e => e.id === editId ? { ...e, key: editKey.trim() || e.key, value: editValue } : e));
      setEditId(null); setEditKey(''); setEditValue('');
      toast.success('Entry updated');
    } else {
      setEntries(prev => [...prev, { id: nextId.current++, key, value: newValue, type: 'text' }]);
      setNewKey(''); setNewValue('');
    }
  }, [newKey, newValue, editId, editKey, editValue]);

  const startEdit = useCallback((entry: FormEntry) => {
    setEditId(entry.id); setEditKey(entry.key); setEditValue(entry.value);
    setNewKey(entry.key); setNewValue(entry.value);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditId(null); setNewKey(''); setNewValue(''); setEditKey(''); setEditValue('');
  }, []);

  const deleteEntry = useCallback((id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (editId === id) cancelEdit();
  }, [editId, cancelEdit]);

  const clearAll = useCallback(() => {
    setEntries([]); setMethodLog([]); setEditId(null);
    setNewKey(''); setNewValue(''); setEditKey(''); setEditValue('');
    toast.success('All entries cleared');
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const key = file.name.replace(/\.[^.]+$/, '') || `file-${nextId.current}`;
        setEntries(prev => [...prev, {
          id: nextId.current++, key, value: file.name, type: 'file',
          file: { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified, dataUrl: file.type.startsWith('image/') ? (reader.result as string) : null },
        }]);
      };
      if (file.type.startsWith('image/')) reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(`${files.length} file(s) added`);
  }, []);

  const runMethodTest = useCallback((method: string) => {
    const key = methodQueryKey.trim();
    const logEntry: MethodResult = { method, args: '', result: '' };
    try {
      switch (method) {
        case 'has': logEntry.args = JSON.stringify(key); logEntry.result = key ? String(liveFormData.has(key)) : '(key required)'; break;
        case 'get': {
          logEntry.args = JSON.stringify(key); if (!key) { logEntry.result = '(key required)'; break; }
          const val = liveFormData.get(key);
          logEntry.result = val instanceof File ? `[File: ${val.name}]` : val === null ? 'null' : JSON.stringify(val);
          break;
        }
        case 'getAll': {
          logEntry.args = JSON.stringify(key); if (!key) { logEntry.result = '(key required)'; break; }
          logEntry.result = JSON.stringify(liveFormData.getAll(key).map(v => v instanceof File ? `[File: ${v.name}]` : v));
          break;
        }
        case 'set': {
          logEntry.args = `(${JSON.stringify(key)}, ${JSON.stringify(methodQueryValue)})`; if (!key) { logEntry.result = '(key required)'; break; }
          const testFd = new FormData();
          entries.forEach(e => { if (e.type === 'file' && e.file) testFd.append(e.key, new Blob(), e.file.name); else testFd.append(e.key, e.value); });
          testFd.set(key, methodQueryValue);
          const after: string[] = []; testFd.forEach((v, k) => after.push(`${k}=${v}`));
          logEntry.result = `Set ${JSON.stringify(key)} -> ${JSON.stringify(methodQueryValue)}. After: [${after.join(', ')}]`;
          break;
        }
        case 'delete': {
          logEntry.args = JSON.stringify(key); if (!key) { logEntry.result = '(key required)'; break; }
          const testFd = new FormData();
          entries.forEach(e => { if (e.type === 'file' && e.file) testFd.append(e.key, new Blob(), e.file.name); else testFd.append(e.key, e.value); });
          testFd.delete(key);
          const after: string[] = []; testFd.forEach((v, k) => after.push(`${k}=${v}`));
          logEntry.result = `Deleted ${JSON.stringify(key)}. After: [${after.join(', ')}]`;
          break;
        }
        case 'forEach': {
          const pairs: string[] = []; liveFormData.forEach((v, k) => pairs.push(`${k} = ${v instanceof File ? `File(${v.name})` : v}`));
          logEntry.result = `Iterated ${pairs.length} entries: ${pairs.join(' | ')}`;
          break;
        }
        case 'entries': {
          const eArr: string[] = [];
          for (const [k, v] of liveFormData.entries()) eArr.push(`[${JSON.stringify(k)}, ${v instanceof File ? `File(${JSON.stringify(v.name)})` : JSON.stringify(v)}]`);
          logEntry.result = `[${eArr.join(', ')}]`;
          break;
        }
        case 'keys': logEntry.result = `[${[...liveFormData.keys()].map(k => JSON.stringify(k)).join(', ')}]`; break;
        case 'values': logEntry.result = `[${[...liveFormData.values()].map(v => v instanceof File ? `File(${JSON.stringify(v.name)})` : JSON.stringify(v)).join(', ')}]`; break;
      }
    } catch (err: any) { logEntry.result = `Error: ${err.message}`; }
    setMethodLog(prev => [logEntry, ...prev.slice(0, 49)]);
  }, [methodQueryKey, methodQueryValue, liveFormData, entries]);

  const copyEntries = useCallback(() => {
    navigator.clipboard.writeText(entryArray.map(e => `${e.key}: ${e.value}`).join('\n')).then(
      () => toast.success('Copied to clipboard'), () => toast.error('Failed to copy'));
  }, [entryArray]);

  const fileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4 text-emerald-400" />;
    if (type.startsWith('text/')) return <FileText className="w-4 h-4 text-blue-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const entryCount = entries.length;

  return (
    <ToolLayout
      title="FormData Explorer"
      description="Construct, inspect, and debug FormData objects. Add text and file entries, test every FormData method, and see real-time iteration results — all in your browser."
      controls={
        <div className="flex items-center gap-4 flex-wrap w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input type="text" placeholder="Key"
              value={editId !== null ? editKey : newKey}
              onChange={e => editId !== null ? setEditKey(e.target.value) : setNewKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              className="w-1/3 bg-surface border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-400 transition-colors" />
            <input type="text" placeholder="Value"
              value={editId !== null ? editValue : newValue}
              onChange={e => editId !== null ? setEditValue(e.target.value) : setNewValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              className="w-1/3 bg-surface border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-400 transition-colors" />
            <button onClick={addEntry} className="btn-primary shrink-0 flex items-center gap-1.5 text-sm">
              {editId !== null ? <><Check className="w-4 h-4" /> Save</> : <><Plus className="w-4 h-4" /> Add</>}
            </button>
            {editId !== null && <button onClick={cancelEdit} className="text-slate-400 hover:text-white transition-colors shrink-0"><X className="w-4 h-4" /></button>}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-surface-light border border-slate-600 rounded-lg text-slate-300 hover:border-brand-400 hover:text-white transition-all shrink-0">
            <FolderUp className="w-4 h-4" /> Add Files
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
          {entryCount > 0 && <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors shrink-0"><RotateCcw className="w-4 h-4" /> Clear</button>}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg">Entries <span className="text-slate-500 text-sm font-normal">({entryCount})</span></h2>
            {entryCount > 0 && <button onClick={copyEntries} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"><Copy className="w-3.5 h-3.5" /> Copy All</button>}
          </div>
          {entryCount === 0 ? (
            <div className="card border-slate-600/50 text-center py-12">
              <Info className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No entries yet. Add a key-value pair or upload files above.</p>
              <p className="text-slate-600 text-xs mt-2">Try: name &rarr; Alice, email &rarr; alice@example.com, then upload an image.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {entries.map(entry => (
                <div key={entry.id} className="card p-3 flex items-center gap-3 group hover:bg-surface-lighter/50 transition-colors">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                    {entry.type === 'file' ? (entry.file ? fileTypeIcon(entry.file.type) : <FileText className="w-4 h-4 text-slate-400" />) : <Code2 className="w-4 h-4 text-brand-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-brand-300 font-mono text-sm font-medium truncate">{entry.key}</span>
                      <span className="text-slate-600 text-xs shrink-0">{entry.type === 'file' ? 'FILE' : 'TEXT'}</span>
                    </div>
                    <div className="text-slate-400 text-xs font-mono truncate mt-0.5">
                      {entry.type === 'file' && entry.file ? `${entry.file.name} &middot; ${formatBytes(entry.file.size)} &middot; ${entry.file.type || 'unknown'}` : entry.value || <span className="text-slate-600 italic">empty</span>}
                    </div>
                    {entry.type === 'file' && entry.file?.dataUrl && <img src={entry.file.dataUrl} alt={entry.file.name} className="mt-2 max-h-20 rounded border border-slate-700" />}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => startEdit(entry)} className="p-1.5 text-slate-500 hover:text-brand-400 transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg mb-3">Inspect FormData</h2>
            <div className="flex items-center gap-1 bg-surface border border-slate-700/50 rounded-lg p-1">
              {(['entries', 'keys', 'values'] as ActiveView[]).map(view => (
                <button key={view} onClick={() => setActiveView(view)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${activeView === view ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-white'}`}>
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="card p-4 min-h-[200px] max-h-[300px] overflow-y-auto bg-surface">
            {entryCount === 0 ? <p className="text-slate-500 text-sm text-center py-8">Add entries to see iteration results</p> : (
              <div className="space-y-1 font-mono text-xs">
                {activeView === 'entries' && entryArray.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 py-0.5 border-b border-slate-800/50 last:border-0">
                    <span className="text-slate-500 shrink-0">{i}:</span> <span className="text-brand-300">&ldquo;{e.key}&rdquo;</span> <span className="text-slate-500">&rarr;</span> <span className="text-emerald-400 truncate">{e.value}</span>
                  </div>
                ))}
                {activeView === 'keys' && keyArray.map((k, i) => (
                  <div key={i} className="py-0.5 border-b border-slate-800/50 last:border-0"><span className="text-slate-500">{i}: </span><span className="text-brand-300">&ldquo;{k}&rdquo;</span></div>
                ))}
                {activeView === 'values' && valueArray.map((v, i) => (
                  <div key={i} className="py-0.5 border-b border-slate-800/50 last:border-0"><span className="text-slate-500">{i}: </span><span className="text-emerald-400 truncate">{v}</span></div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg mb-3">Test Methods</h2>
            <div className="flex items-center gap-2 mb-3">
              <input type="text" placeholder="Key" value={methodQueryKey} onChange={e => setMethodQueryKey(e.target.value)} className="flex-1 bg-surface border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-400 transition-colors" />
              <input type="text" placeholder="Value (for set)" value={methodQueryValue} onChange={e => setMethodQueryValue(e.target.value)} className="flex-1 bg-surface border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-400 transition-colors" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['has', 'get', 'getAll', 'set', 'delete', 'forEach', 'entries', 'keys', 'values'].map(method => (
                <button key={method} onClick={() => runMethodTest(method)} className="px-2.5 py-1 text-xs font-mono bg-surface-light border border-slate-600 rounded-md text-brand-300 hover:bg-brand-500/10 hover:border-brand-500/50 transition-all">.{method}()</button>
              ))}
            </div>
          </div>
          {methodLog.length > 0 && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {methodLog.map((log, i) => (
                <div key={i} className="card p-2.5 text-xs font-mono">
                  <div className="flex items-center gap-1.5 mb-1"><span className="text-amber-400">formData</span><span className="text-brand-300">.{log.method}({log.args})</span></div>
                  <div className="text-emerald-400 pl-4 break-all">&rarr; {log.result}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
