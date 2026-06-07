'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Cookie,
  Trash2,
  Copy,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Check,
  X,
  Shield,
  Globe,
  Key,
  FileText,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string | null;
  secure: boolean;
  sameSite: string;
  raw: string;
}

interface EditingCookie {
  name: string;
  value: string;
  path: string;
  domain: string;
  maxAge: string;
  expires: string;
  secure: boolean;
  sameSite: 'Lax' | 'Strict' | 'None' | '';
}

const SAME_SITE_OPTIONS: EditingCookie['sameSite'][] = ['Lax', 'Strict', 'None', ''];

function parseAllCookies(): CookieEntry[] {
  const cookieString = document.cookie;
  if (!cookieString.trim()) return [];
  return cookieString.split(';').map((entry) => {
    const trimmed = entry.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
      return {
        name: trimmed, value: '',
        domain: window.location.hostname, path: '/',
        expires: null,
        secure: window.location.protocol === 'https:',
        sameSite: 'Lax', raw: trimmed,
      };
    }
    const name = trimmed.substring(0, eqIdx);
    const value = decodeURIComponent(trimmed.substring(eqIdx + 1));
    return {
      name, value,
      domain: window.location.hostname, path: '/',
      expires: null,
      secure: window.location.protocol === 'https:',
      sameSite: 'Lax',
      raw: `${name}=${encodeURIComponent(value)}`,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function buildCookieString(
  name: string, value: string,
  opts: Partial<{ path: string; domain: string; maxAge: string; expires: string; secure: boolean; sameSite: string }>
): string {
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (opts.path) str += `; path=${opts.path}`;
  if (opts.domain) str += `; domain=${opts.domain}`;
  if (opts.maxAge) str += `; max-age=${opts.maxAge}`;
  if (opts.expires) {
    try {
      const d = new Date(opts.expires);
      if (!isNaN(d.getTime())) str += `; expires=${d.toUTCString()}`;
    } catch { /* ignore */ }
  }
  if (opts.secure) str += '; secure';
  if (opts.sameSite && opts.sameSite !== '') str += `; samesite=${opts.sameSite}`;
  return str;
}

function deleteCookie(name: string, path: string, domain: string): void {
  const pastDate = new Date(0).toUTCString();
  let delStr = `${encodeURIComponent(name)}=; expires=${pastDate}`;
  if (path) delStr += `; path=${path}`; else delStr += '; path=/';
  if (domain) delStr += `; domain=${domain}`;
  document.cookie = delStr;
  if (domain) {
    document.cookie = `${encodeURIComponent(name)}=; expires=${pastDate}; path=${path || '/'}`;
  }
}

export default function CookieEditorPage() {
  const [cookies, setCookies] = useState<CookieEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingCookie>({
    name: '', value: '', path: '/', domain: '', maxAge: '', expires: '', secure: false, sameSite: 'Lax',
  });
  const [addForm, setAddForm] = useState<EditingCookie>({
    name: '', value: '', path: '/', domain: '', maxAge: '', expires: '', secure: false, sameSite: 'Lax',
  });
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const refreshCookies = useCallback(() => {
    setCookies(parseAllCookies());
  }, []);

  useEffect(() => { refreshCookies(); }, [refreshCookies]);

  const filteredCookies = useMemo(() => {
    if (!search.trim()) return cookies;
    const q = search.toLowerCase();
    return cookies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.value.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q)
    );
  }, [cookies, search]);

  const toggleValue = useCallback((name: string) => {
    setShowValues((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const handleDelete = useCallback((entry: CookieEntry) => {
    deleteCookie(entry.name, entry.path, entry.domain);
    toast.success(`Deleted: ${entry.name}`);
    refreshCookies();
  }, [refreshCookies]);

  const handleDeleteAll = useCallback(() => {
    cookies.forEach((c) => deleteCookie(c.name, c.path, c.domain));
    setCookies([]);
    toast.success('All cookies cleared');
  }, [cookies]);

  const handleSaveEdit = useCallback(() => {
    if (!editingName) return;
    try {
      document.cookie = buildCookieString(editForm.name, editForm.value, {
        path: editForm.path || '/', domain: editForm.domain || undefined,
        maxAge: editForm.maxAge || undefined, expires: editForm.expires || undefined,
        secure: editForm.secure, sameSite: editForm.sameSite || undefined,
      });
      toast.success(`Updated: ${editForm.name}`);
      setEditingName(null);
      setEditForm({ name: '', value: '', path: '/', domain: '', maxAge: '', expires: '', secure: false, sameSite: 'Lax' });
      refreshCookies();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [editingName, editForm, refreshCookies]);

  const handleAddCookie = useCallback(() => {
    if (!addForm.name.trim()) { toast.error('Name required'); return; }
    try {
      document.cookie = buildCookieString(addForm.name, addForm.value, {
        path: addForm.path || '/', domain: addForm.domain || undefined,
        maxAge: addForm.maxAge || undefined, expires: addForm.expires || undefined,
        secure: addForm.secure, sameSite: addForm.sameSite || undefined,
      });
      toast.success(`Added: ${addForm.name}`);
      setShowAddForm(false);
      setAddForm({ name: '', value: '', path: '/', domain: '', maxAge: '', expires: '', secure: false, sameSite: 'Lax' });
      refreshCookies();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [addForm, refreshCookies]);

  const handleEditClick = useCallback((entry: CookieEntry) => {
    setEditingName(entry.name);
    setEditForm({
      name: entry.name, value: entry.value, path: entry.path, domain: entry.domain,
      maxAge: '', expires: entry.expires || '', secure: entry.secure,
      sameSite: entry.sameSite as EditingCookie['sameSite'],
    });
  }, []);

  const handleImport = useCallback(() => {
    if (!importText.trim()) { toast.error('Paste a cookie string first'); return; }
    const entries = importText.split(/[\n;]+/).filter((s) => s.trim());
    let count = 0;
    for (const entry of entries) {
      const trimmed = entry.trim();
      const semiIdx = trimmed.indexOf(';');
      const pair = semiIdx === -1 ? trimmed : trimmed.substring(0, semiIdx);
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;
      const name = pair.substring(0, eqIdx).trim();
      const value = pair.substring(eqIdx + 1).trim();
      try {
        document.cookie = buildCookieString(name, value, { path: '/', sameSite: 'Lax' });
        count++;
      } catch { /* skip */ }
    }
    toast.success(`Imported ${count} cookies`);
    setImportText('');
    setShowImport(false);
    refreshCookies();
  }, [importText, refreshCookies]);

  const copyAll = useCallback(() => {
    const text = cookies.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [cookies]);

  const copyCookie = useCallback((entry: CookieEntry) => {
    navigator.clipboard.writeText(`${entry.name}=${encodeURIComponent(entry.value)}`).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, []);

  return (
    <ToolLayout
      title="Cookie Editor"
      description="Inspect, edit, add, and delete browser cookies — the document.cookie API, visualized."
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-9 w-full"
            placeholder="Search cookies by name, value, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={refreshCookies} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Add Cookie
        </button>
        <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
          <FileText className="w-4 h-4" /> Import
        </button>
        {cookies.length > 0 && (
          <>
            <button onClick={copyAll} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Copy className="w-4 h-4" /> Copy All
            </button>
            <button onClick={handleDeleteAll} className="btn-secondary flex items-center gap-1.5 text-sm border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          </>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="card px-4 py-2 flex items-center gap-2">
          <Cookie className="w-4 h-4 text-brand-400" />
          <span className="text-sm text-slate-300">{cookies.length} cookies</span>
        </div>
        <div className="card px-4 py-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-sm text-slate-300">{cookies.filter((c) => c.secure).length} secure</span>
        </div>
        <div className="card px-4 py-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-slate-300">
            Domain: {typeof window !== 'undefined' ? window.location.hostname : '...'}
          </span>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card mb-6 p-6 border-brand-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-400" /> Add New Cookie
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <CookieForm form={addForm} setForm={setAddForm} />
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddCookie} className="btn-primary flex items-center gap-1.5 text-sm">
              <Save className="w-4 h-4" /> Save Cookie
            </button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Import Form */}
      {showImport && (
        <div className="card mb-6 p-6 border-brand-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" /> Import Cookies
            </h3>
            <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Paste cookie strings (e.g. <code className="text-brand-400">name=value; name2=value2</code>)
          </p>
          <textarea
            className="input-field w-full min-h-[120px] font-mono text-sm"
            placeholder="session_id=abc123; theme=dark; lang=en"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={handleImport} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" /> Import Cookies
            </button>
            <button onClick={() => { setShowImport(false); setImportText(''); }} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingName && (
        <div className="card mb-6 p-6 border-amber-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" /> Edit: <code className="text-amber-400">{editingName}</code>
            </h3>
            <button onClick={() => { setEditingName(null); setEditForm({ name: '', value: '', path: '/', domain: '', maxAge: '', expires: '', secure: false, sameSite: 'Lax' }); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <CookieForm form={editForm} setForm={setEditForm} />
          <div className="flex gap-2 mt-4">
            <button onClick={handleSaveEdit} className="btn-primary flex items-center gap-1.5 text-sm">
              <Check className="w-4 h-4" /> Update Cookie
            </button>
            <button onClick={() => { setEditingName(null); setEditForm({ name: '', value: '', path: '/', domain: '', maxAge: '', expires: '', secure: false, sameSite: 'Lax' }); }} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredCookies.length === 0 && !showAddForm && !showImport && !editingName && (
        <div className="card p-12 text-center">
          <Cookie className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 text-lg mb-1">
            {cookies.length === 0 ? 'No cookies set on this domain' : 'No cookies match your search'}
          </p>
          <p className="text-slate-500 text-sm">
            {cookies.length === 0 ? 'Cookies you add here will appear in this list.' : 'Try a different search term.'}
          </p>
        </div>
      )}

      {/* Cookie Table */}
      {filteredCookies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-3">Name</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-3">Value</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-3">Domain</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-3">Path</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-3">Attributes</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCookies.map((cookie) => (
                <tr key={cookie.name} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-mono text-sm text-white font-medium">{cookie.name}</span>
                  </td>
                  <td className="py-3 px-3 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-300 truncate block max-w-[150px]">
                        {showValues[cookie.name] ? cookie.value : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                      </span>
                      <button onClick={() => toggleValue(cookie.name)} className="text-slate-500 hover:text-slate-300 flex-shrink-0" title={showValues[cookie.name] ? 'Hide' : 'Show'}>
                        {showValues[cookie.name] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3"><span className="font-mono text-xs text-slate-400">{cookie.domain}</span></td>
                  <td className="py-3 px-3"><span className="font-mono text-xs text-slate-400">{cookie.path}</span></td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {cookie.secure && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-green-500/10 text-green-400 border-green-500/30">
                          <Shield className="w-2.5 h-2.5 mr-0.5" /> Secure
                        </span>
                      )}
                      {cookie.sameSite && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-purple-500/10 text-purple-400 border-purple-500/30">
                          SameSite={cookie.sameSite}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => copyCookie(cookie)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleEditClick(cookie)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(cookie)} className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-400">
            <p className="font-medium text-amber-300 mb-1">About document.cookie</p>
            <p>
              This uses the browser&apos;s <code className="text-brand-400">document.cookie</code> API.
              HttpOnly cookies (server-set) are not accessible from JavaScript and won&apos;t appear here.
              Cookies are scoped to the current domain — you cannot read or set cookies for other domains.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

function CookieForm({
  form,
  setForm,
}: {
  form: EditingCookie;
  setForm: React.Dispatch<React.SetStateAction<EditingCookie>>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Name *</label>
        <input className="input-field w-full font-mono text-sm" placeholder="session_id"
          value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Value</label>
        <input className="input-field w-full font-mono text-sm" placeholder="abc123xyz"
          value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Path</label>
        <input className="input-field w-full font-mono text-sm" placeholder="/"
          value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Domain</label>
        <input className="input-field w-full font-mono text-sm" placeholder="example.com"
          value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Max-Age (seconds)</label>
        <input className="input-field w-full font-mono text-sm" placeholder="3600" type="number"
          value={form.maxAge} onChange={(e) => setForm((f) => ({ ...f, maxAge: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Expires</label>
        <input className="input-field w-full font-mono text-sm" type="datetime-local"
          value={form.expires ? form.expires.substring(0, 16) : ''}
          onChange={(e) => setForm((f) => ({ ...f, expires: e.target.value }))} />
        <p className="text-[10px] text-slate-500 mt-1">Leave blank for session cookie</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">SameSite</label>
        <select className="input-field w-full text-sm"
          value={form.sameSite}
          onChange={(e) => setForm((f) => ({ ...f, sameSite: e.target.value as EditingCookie['sameSite'] }))}>
          {SAME_SITE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt === '' ? 'Not set' : opt}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center pt-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.secure}
            onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500" />
          <span className="text-sm text-slate-300 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-green-400" /> Secure
          </span>
        </label>
      </div>
    </div>
  );
}
