'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Plus, Trash2, Image, Monitor, Smartphone, Tablet, Palette, Globe, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface IconEntry {
  id: number;
  src: string;
  sizes: string;
  type: string;
}

interface ShortcutEntry {
  id: number;
  name: string;
  short_name: string;
  description: string;
  url: string;
}

interface ScreenshotEntry {
  id: number;
  src: string;
  sizes: string;
  type: string;
  label: string;
}

interface ManifestData {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: string;
  theme_color: string;
  background_color: string;
  lang: string;
  dir: 'auto' | 'ltr' | 'rtl';
  categories: string;
  iarc_rating_id: string;
  prefer_related_applications: boolean;
  related_applications: string;
  icons: IconEntry[];
  screenshots: ScreenshotEntry[];
  shortcuts: ShortcutEntry[];
}

// ── Presets ────────────────────────────────────────────────────────────────

const DISPLAY_OPTIONS = [
  { value: 'standalone', label: 'Standalone', desc: 'Looks like a native app (no browser chrome)' },
  { value: 'fullscreen', label: 'Fullscreen', desc: 'Takes up the entire display (no status bar)' },
  { value: 'minimal-ui', label: 'Minimal UI', desc: 'Standalone with minimal browser controls' },
  { value: 'browser', label: 'Browser', desc: 'Opens in a regular browser tab' },
];

const ORIENTATION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait-primary', label: 'Portrait Primary' },
  { value: 'landscape-primary', label: 'Landscape Primary' },
  { value: 'natural', label: 'Natural' },
];

const COLOR_PRESETS = [
  { name: 'Dark Blue', theme: '#1a1a2e', bg: '#0f0f1a' },
  { name: 'Forest', theme: '#2d6a4f', bg: '#1b4332' },
  { name: 'Purple', theme: '#7b2ff7', bg: '#1a0533' },
  { name: 'Coral', theme: '#ff6b6b', bg: '#2d132c' },
  { name: 'Ocean', theme: '#0077b6', bg: '#03045e' },
  { name: 'Sunset', theme: '#f77f00', bg: '#003049' },
  { name: 'Mint', theme: '#06d6a0', bg: '#073b4c' },
  { name: 'Rose', theme: '#e63946', bg: '#1d3557' },
];

const CATEGORY_PRESETS = [
  'books', 'business', 'education', 'entertainment', 'finance',
  'fitness', 'food', 'games', 'health', 'kids', 'lifestyle',
  'music', 'navigation', 'news', 'photo', 'productivity',
  'shopping', 'social', 'sports', 'travel', 'utilities', 'weather',
];

// ── Main Component ─────────────────────────────────────────────────────────

let nextId = 100;

export default function PWAManifestGeneratorPage() {
  const [manifest, setManifest] = useState<ManifestData>({
    name: 'My PWA App',
    short_name: 'PWA App',
    description: 'A progressive web application',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: '',
    theme_color: '#1a1a2e',
    background_color: '#0f0f1a',
    lang: 'en',
    dir: 'auto',
    categories: '',
    iarc_rating_id: '',
    prefer_related_applications: false,
    related_applications: '',
    icons: [
      { id: 1, src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { id: 2, src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    screenshots: [],
    shortcuts: [],
  });

  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet'>('mobile');
  const [activeTab, setActiveTab] = useState<'output' | 'preview'>('output');

  const update = useCallback(<K extends keyof ManifestData>(key: K, value: ManifestData[K]) => {
    setManifest(prev => ({ ...prev, [key]: value }));
  }, []);

  const addIcon = useCallback(() => {
    const id = nextId++;
    setManifest(prev => ({
      ...prev,
      icons: [...prev.icons, { id, src: '', sizes: '', type: 'image/png' }],
    }));
  }, []);

  const updateIcon = useCallback((id: number, field: keyof IconEntry, value: string) => {
    setManifest(prev => ({
      ...prev,
      icons: prev.icons.map(i => i.id === id ? { ...i, [field]: value } : i),
    }));
  }, []);

  const removeIcon = useCallback((id: number) => {
    setManifest(prev => ({ ...prev, icons: prev.icons.filter(i => i.id !== id) }));
  }, []);

  const addShortcut = useCallback(() => {
    const id = nextId++;
    setManifest(prev => ({
      ...prev,
      shortcuts: [...prev.shortcuts, { id, name: '', short_name: '', description: '', url: '' }],
    }));
  }, []);

  const updateShortcut = useCallback((id: number, field: keyof ShortcutEntry, value: string) => {
    setManifest(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  }, []);

  const removeShortcut = useCallback((id: number) => {
    setManifest(prev => ({ ...prev, shortcuts: prev.shortcuts.filter(s => s.id !== id) }));
  }, []);

  const addScreenshot = useCallback(() => {
    const id = nextId++;
    setManifest(prev => ({
      ...prev,
      screenshots: [...prev.screenshots, { id, src: '', sizes: '', type: 'image/png', label: '' }],
    }));
  }, []);

  const updateScreenshot = useCallback((id: number, field: keyof ScreenshotEntry, value: string) => {
    setManifest(prev => ({
      ...prev,
      screenshots: prev.screenshots.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  }, []);

  const removeScreenshot = useCallback((id: number) => {
    setManifest(prev => ({ ...prev, screenshots: prev.screenshots.filter(s => s.id !== id) }));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setManifest(prev => {
      const current = prev.categories ? prev.categories.split(',').map(c => c.trim()).filter(Boolean) : [];
      if (current.includes(cat)) {
        return { ...prev, categories: current.filter(c => c !== cat).join(', ') };
      } else {
        return { ...prev, categories: [...current, cat].join(', ') };
      }
    });
  }, []);

  const manifestJSON = useMemo(() => {
    const result: Record<string, unknown> = {
      name: manifest.name,
      short_name: manifest.short_name,
      description: manifest.description,
      start_url: manifest.start_url,
      scope: manifest.scope,
      display: manifest.display,
      theme_color: manifest.theme_color,
      background_color: manifest.background_color,
      lang: manifest.lang,
    };
    if (manifest.orientation) result.orientation = manifest.orientation;
    if (manifest.dir !== 'auto') result.dir = manifest.dir;
    if (manifest.categories) result.categories = manifest.categories.split(',').map(c => c.trim()).filter(Boolean);
    if (manifest.iarc_rating_id) result.iarc_rating_id = manifest.iarc_rating_id;
    result.prefer_related_applications = manifest.prefer_related_applications;
    if (manifest.related_applications) {
      try { result.related_applications = JSON.parse(manifest.related_applications); }
      catch { result.related_applications = []; }
    }
    if (manifest.icons.length > 0) {
      result.icons = manifest.icons
        .filter(i => i.src)
        .map(i => ({ src: i.src, sizes: i.sizes, type: i.type }));
    }
    if (manifest.screenshots.length > 0) {
      result.screenshots = manifest.screenshots
        .filter(s => s.src)
        .map(s => ({ src: s.src, sizes: s.sizes, type: s.type, label: s.label }));
    }
    if (manifest.shortcuts.length > 0) {
      result.shortcuts = manifest.shortcuts
        .filter(s => s.name && s.url)
        .map(s => ({
          name: s.name,
          ...(s.short_name ? { short_name: s.short_name } : {}),
          ...(s.description ? { description: s.description } : {}),
          url: s.url,
        }));
    }
    // Strip empty arrays
    if (result.icons && (result.icons as []).length === 0) delete result.icons;
    if (result.screenshots && (result.screenshots as []).length === 0) delete result.screenshots;
    if (result.shortcuts && (result.shortcuts as []).length === 0) delete result.shortcuts;
    return result;
  }, [manifest]);

  const manifestString = useMemo(() => JSON.stringify(manifestJSON, null, 2), [manifestJSON]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(manifestString);
      toast.success('Manifest copied!');
    } catch { toast.error('Failed to copy'); }
  }, [manifestString]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([manifestString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('manifest.json downloaded!');
  }, [manifestString]);

  const selectedCategories = manifest.categories ? manifest.categories.split(',').map(c => c.trim()).filter(Boolean) : [];

  return (
    <ToolLayout
      title="PWA Manifest Generator"
      description="Build a web app manifest.json visually — name, icons, theme colors, display mode, screenshots, shortcuts, and more. Instant JSON output for installable PWAs."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-400" />
              Basic Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">App Name *</label>
                <input type="text" value={manifest.name} onChange={e => update('name', e.target.value)}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Short Name *</label>
                <input type="text" value={manifest.short_name} onChange={e => update('short_name', e.target.value)}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <input type="text" value={manifest.description} onChange={e => update('description', e.target.value)}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start URL</label>
                <input type="text" value={manifest.start_url} onChange={e => update('start_url', e.target.value)}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm font-mono text-green-400 focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Scope</label>
                <input type="text" value={manifest.scope} onChange={e => update('scope', e.target.value)}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm font-mono text-green-400 focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Language</label>
                <input type="text" value={manifest.lang} onChange={e => update('lang', e.target.value)}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Direction</label>
                <select value={manifest.dir} onChange={e => update('dir', e.target.value as ManifestData['dir'])}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50">
                  <option value="auto">Auto</option>
                  <option value="ltr">LTR (Left-to-Right)</option>
                  <option value="rtl">RTL (Right-to-Left)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-brand-400" />
              Display Settings
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Display Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {DISPLAY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => update('display', opt.value as ManifestData['display'])}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                        manifest.display === opt.value
                          ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                          : 'bg-surface text-slate-400 border-slate-700/50 hover:border-slate-500'
                      }`}>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Orientation</label>
                <select value={manifest.orientation} onChange={e => update('orientation', e.target.value)}
                  className="w-full bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50">
                  {ORIENTATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Theme Color
                  </label>
                  <div className="flex gap-2">
                    <input type="color" value={manifest.theme_color} onChange={e => update('theme_color', e.target.value)}
                      className="h-9 w-12 rounded border border-slate-600/50 bg-surface cursor-pointer" />
                    <input type="text" value={manifest.theme_color} onChange={e => update('theme_color', e.target.value)}
                      className="flex-1 bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Background Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={manifest.background_color} onChange={e => update('background_color', e.target.value)}
                      className="h-9 w-12 rounded border border-slate-600/50 bg-surface cursor-pointer" />
                    <input type="text" value={manifest.background_color} onChange={e => update('background_color', e.target.value)}
                      className="flex-1 bg-surface rounded-md border border-slate-600/50 px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/50" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Color Presets</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map(p => (
                    <button key={p.name} onClick={() => { update('theme_color', p.theme); update('background_color', p.bg); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-slate-700/50 hover:border-slate-500 text-xs text-slate-400 transition-all">
                      <span className="w-3.5 h-3.5 rounded border border-slate-500/30" style={{ background: `linear-gradient(135deg, ${p.theme} 50%, ${p.bg} 50%)` }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Categories</h2>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS.map(cat => (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    selectedCategories.includes(cat)
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'bg-surface text-slate-500 border border-slate-700/30 hover:border-slate-500 hover:text-slate-300'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Icons */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Image className="w-4 h-4 text-brand-400" />
                Icons ({manifest.icons.length})
              </h2>
              <button onClick={addIcon} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {manifest.icons.map(icon => (
                <div key={icon.id} className="flex items-center gap-2 bg-surface rounded-lg border border-slate-700/30 p-2">
                  <input type="text" placeholder="e.g. /icon-192.png" value={icon.src}
                    onChange={e => updateIcon(icon.id, 'src', e.target.value)}
                    className="flex-1 bg-transparent text-sm font-mono text-green-400 placeholder-slate-600 focus:outline-none" />
                  <input type="text" placeholder="e.g. 192x192" value={icon.sizes}
                    onChange={e => updateIcon(icon.id, 'sizes', e.target.value)}
                    className="w-24 bg-surface-lighter rounded px-2 py-1 text-xs font-mono text-slate-300 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                  <input type="text" placeholder="image/png" value={icon.type}
                    onChange={e => updateIcon(icon.id, 'type', e.target.value)}
                    className="w-24 bg-surface-lighter rounded px-2 py-1 text-xs font-mono text-slate-300 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                  <button onClick={() => removeIcon(icon.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {manifest.icons.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-3">No icons added. At minimum, a 192x192 and 512x512 icon are recommended.</p>
              )}
            </div>
          </div>

          {/* Screenshots */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-400" />
                Screenshots ({manifest.screenshots.length})
              </h2>
              <button onClick={addScreenshot} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {manifest.screenshots.map(ss => (
                <div key={ss.id} className="flex flex-wrap items-center gap-2 bg-surface rounded-lg border border-slate-700/30 p-2">
                  <input type="text" placeholder="Image URL" value={ss.src}
                    onChange={e => updateScreenshot(ss.id, 'src', e.target.value)}
                    className="flex-1 min-w-[120px] bg-transparent text-sm font-mono text-green-400 placeholder-slate-600 focus:outline-none" />
                  <input type="text" placeholder="e.g. 1280x720" value={ss.sizes}
                    onChange={e => updateScreenshot(ss.id, 'sizes', e.target.value)}
                    className="w-24 bg-surface-lighter rounded px-2 py-1 text-xs font-mono text-slate-300 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                  <input type="text" placeholder="Label" value={ss.label}
                    onChange={e => updateScreenshot(ss.id, 'label', e.target.value)}
                    className="w-24 bg-surface-lighter rounded px-2 py-1 text-xs text-slate-300 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                  <button onClick={() => removeScreenshot(ss.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">App Shortcuts ({manifest.shortcuts.length})</h2>
              <button onClick={addShortcut} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {manifest.shortcuts.map(sc => (
                <div key={sc.id} className="space-y-1.5 bg-surface rounded-lg border border-slate-700/30 p-3">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Name" value={sc.name}
                      onChange={e => updateShortcut(sc.id, 'name', e.target.value)}
                      className="flex-1 bg-surface-lighter rounded px-2 py-1 text-xs text-slate-200 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                    <input type="text" placeholder="Short name" value={sc.short_name}
                      onChange={e => updateShortcut(sc.id, 'short_name', e.target.value)}
                      className="w-28 bg-surface-lighter rounded px-2 py-1 text-xs text-slate-200 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                    <button onClick={() => removeShortcut(sc.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input type="text" placeholder="Description" value={sc.description}
                    onChange={e => updateShortcut(sc.id, 'description', e.target.value)}
                    className="w-full bg-surface-lighter rounded px-2 py-1 text-xs text-slate-300 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                  <input type="text" placeholder="URL (e.g. /new-post)" value={sc.url}
                    onChange={e => updateShortcut(sc.id, 'url', e.target.value)}
                    className="w-full bg-surface-lighter rounded px-2 py-1 text-xs font-mono text-green-400 border border-slate-700/30 focus:outline-none focus:border-brand-500/30" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview + Output */}
        <div className="lg:sticky lg:top-24 h-fit space-y-4">
          {/* Tab Toggle */}
          <div className="flex gap-1 bg-surface rounded-lg p-1">
            <button onClick={() => setActiveTab('output')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'output' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-300'
              }`}>
              JSON Output
            </button>
            <button onClick={() => setActiveTab('preview')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'preview' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-300'
              }`}>
              Live Preview
            </button>
          </div>

          {activeTab === 'output' && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold text-sm">manifest.json</h2>
                <div className="flex gap-2">
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-lighter text-slate-400 hover:text-white border border-slate-700/30 transition-all">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  <button onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 border border-brand-500/30 transition-all">
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>
              <pre className="bg-[#0d1117] rounded-lg border border-slate-700/50 p-4 overflow-auto max-h-[600px] text-xs font-mono text-slate-300 leading-relaxed">
                {manifestString}
              </pre>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold text-sm">App Install Preview</h2>
                <div className="flex gap-1 bg-surface-lighter rounded-lg p-0.5">
                  <button onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded transition-all ${previewDevice === 'mobile' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-500'}`}>
                    <Smartphone className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPreviewDevice('tablet')}
                    className={`p-1.5 rounded transition-all ${previewDevice === 'tablet' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-500'}`}>
                    <Tablet className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Mock device */}
              <div className={`mx-auto border-4 border-slate-700 rounded-3xl overflow-hidden bg-white ${
                previewDevice === 'mobile' ? 'w-[280px]' : 'w-[400px]'
              }`}>
                {/* Status bar */}
                <div className="h-10 flex items-center justify-between px-4 text-[10px] font-medium text-white"
                  style={{ backgroundColor: manifest.theme_color }}>
                  <span>{manifest.short_name || manifest.name}</span>
                  <span>12:00</span>
                </div>
                {/* App content area */}
                <div className="h-64 flex flex-col items-center justify-center" style={{ backgroundColor: manifest.background_color }}>
                  {/* Mock icon */}
                  <div className="w-14 h-14 rounded-2xl mb-3 flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: manifest.theme_color }}>
                    {manifest.short_name ? manifest.short_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <p className="text-sm font-semibold text-white/80">{manifest.short_name || manifest.name}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{manifest.start_url}</p>
                </div>
                {/* Bottom hint */}
                <div className="h-1 bg-slate-200 mx-auto w-1/3 rounded-full my-2" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: manifest.theme_color }} />
                  <span className="text-slate-400">Theme: {manifest.theme_color}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded border border-slate-500" style={{ backgroundColor: manifest.background_color }} />
                  <span className="text-slate-400">Background: {manifest.background_color}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Display: <span className="text-slate-300">{manifest.display}</span> · Orientation: <span className="text-slate-300">{manifest.orientation || 'any'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
