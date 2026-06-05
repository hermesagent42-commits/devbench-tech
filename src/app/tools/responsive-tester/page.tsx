'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCw,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Grid3X3,
  Columns,
  Copy,
  GripHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  icon: 'phone' | 'tablet' | 'laptop' | 'custom';
}

interface ActiveDevice {
  id: string;
  preset: DevicePreset;
  landscape: boolean;
  url: string;
  zoom: number;
}

// ── Presets ────────────────────────────────────────────────────────────────

const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'iPhone SE', width: 375, height: 667, icon: 'phone' },
  { name: 'iPhone 14', width: 390, height: 844, icon: 'phone' },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: 'phone' },
  { name: 'Pixel 7', width: 412, height: 915, icon: 'phone' },
  { name: 'Galaxy S23', width: 384, height: 854, icon: 'phone' },
  { name: 'iPad Mini', width: 768, height: 1024, icon: 'tablet' },
  { name: 'iPad Pro 11"', width: 834, height: 1194, icon: 'tablet' },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366, icon: 'tablet' },
  { name: 'Laptop 13"', width: 1280, height: 800, icon: 'laptop' },
  { name: 'Desktop 1080p', width: 1920, height: 1080, icon: 'laptop' },
  { name: 'Desktop 1440p', width: 2560, height: 1440, icon: 'laptop' },
];

function getDeviceIcon(icon: 'phone' | 'tablet' | 'laptop' | 'custom') {
  switch (icon) {
    case 'phone': return <Smartphone className="w-4 h-4" />;
    case 'tablet': return <Tablet className="w-4 h-4" />;
    case 'laptop': return <Monitor className="w-4 h-4" />;
    case 'custom': return <Maximize2 className="w-4 h-4" />;
  }
}

let idCounter = 0;
function nextId(): string {
  return `dev-${++idCounter}`;
}

// ── Device Frame Component ─────────────────────────────────────────────────

function DeviceFrame({
  device,
  onRemove,
  onToggleLandscape,
  onUpdateUrl,
  onReload,
  onZoomIn,
  onZoomOut,
  isOnly,
  globalUrl,
}: {
  device: ActiveDevice;
  onRemove: () => void;
  onToggleLandscape: () => void;
  onUpdateUrl: (url: string) => void;
  onReload: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isOnly: boolean;
  globalUrl: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const w = device.landscape ? device.preset.height : device.preset.width;
  const h = device.landscape ? device.preset.width : device.preset.height;

  const displayWidth = Math.round(w * device.zoom);
  const displayHeight = Math.round(h * device.zoom);

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(device.url).then(
      () => toast.success('URL copied!'),
      () => toast.error('Failed to copy')
    );
  }, [device.url]);

  const openInTab = useCallback(() => {
    window.open(device.url || globalUrl, '_blank');
  }, [device.url, globalUrl]);

  return (
    <div className="card flex flex-col shrink-0" style={{ minWidth: displayWidth + 32 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/40">
        <div className="flex items-center gap-2 min-w-0">
          {getDeviceIcon(device.preset.icon)}
          <span className="text-sm font-semibold text-white truncate">{device.preset.name}</span>
          <span className="text-xs text-slate-500 shrink-0">
            {w}×{h}
          </span>
          {device.zoom !== 1 && (
            <span className="text-xs text-amber-400 shrink-0">{Math.round(device.zoom * 100)}%</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onZoomOut}
            disabled={device.zoom <= 0.3}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors disabled:opacity-30"
            title="Zoom out"
          >
            <span className="text-xs font-bold">−</span>
          </button>
          <button
            onClick={onZoomIn}
            disabled={device.zoom >= 1.5}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors disabled:opacity-30"
            title="Zoom in"
          >
            <span className="text-xs font-bold">+</span>
          </button>
          <button
            onClick={onToggleLandscape}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReload}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Reload frame"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={openInTab}
            className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          {!isOnly && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-colors"
              title="Remove device"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-1.5 mb-2">
        <input
          type="text"
          value={device.url}
          onChange={(e) => onUpdateUrl(e.target.value)}
          placeholder="Enter URL (e.g. https://example.com)"
          className="flex-1 bg-surface border border-slate-700/50 rounded px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-500/40 placeholder:text-slate-600"
          spellCheck={false}
        />
        <button
          onClick={copyUrl}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors shrink-0"
          title="Copy URL"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Device frame */}
      <div
        className="relative bg-white rounded-lg overflow-hidden shadow-2xl mx-auto"
        style={{ width: displayWidth, height: displayHeight }}
      >
        {device.url ? (
          <iframe
            ref={iframeRef}
            src={device.url}
            className="border-0"
            style={{
              width: w,
              height: h,
              transform: `scale(${device.zoom})`,
              transformOrigin: 'top left',
            }}
            title={`${device.preset.name} preview`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400 text-xs">
            Enter a URL to preview
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom Device Modal ────────────────────────────────────────────────────

function CustomDeviceModal({
  onAdd,
  onClose,
}: {
  onAdd: (preset: DevicePreset) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState('1280');
  const [height, setHeight] = useState('800');

  const add = useCallback(() => {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (!name.trim() || isNaN(w) || isNaN(h) || w < 100 || h < 100 || w > 5120 || h > 5120) {
      toast.error('Enter valid name, width, and height (100–5120px)');
      return;
    }
    onAdd({ name: name.trim(), width: w, height: h, icon: 'custom' });
    onClose();
  }, [name, width, height, onAdd, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="card max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold text-sm mb-4">Add Custom Device</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Device Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Device"
              className="w-full bg-surface border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                min={100}
                max={5120}
                className="w-full bg-surface border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min={100}
                max={5120}
                className="w-full bg-surface border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/40"
              />
            </div>
          </div>
          <button
            onClick={add}
            className="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-400 transition-colors mt-2"
          >
            Add Device
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

const DEFAULT_URL = 'https://example.com';

export default function ResponsiveTesterPage() {
  const [devices, setDevices] = useState<ActiveDevice[]>([
    {
      id: nextId(),
      preset: DEVICE_PRESETS[0],
      landscape: false,
      url: DEFAULT_URL,
      zoom: 1,
    },
    {
      id: nextId(),
      preset: DEVICE_PRESETS[6],
      landscape: false,
      url: DEFAULT_URL,
      zoom: 1,
    },
  ]);
  const [globalUrl, setGlobalUrl] = useState(DEFAULT_URL);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');

  const addDevice = useCallback(
    (preset: DevicePreset) => {
      setDevices((prev) => [
        ...prev,
        { id: nextId(), preset, landscape: false, url: globalUrl, zoom: 1 },
      ]);
      toast.success(`Added ${preset.name}`);
    },
    [globalUrl]
  );

  const removeDevice = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const toggleLandscape = useCallback((id: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, landscape: !d.landscape } : d))
    );
  }, []);

  const updateDeviceUrl = useCallback((id: string, url: string) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, url } : d)));
  }, []);

  const reloadDevice = useCallback((id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        // Force iframe re-render by clearing and restoring URL
        return { ...d, url: '' };
      })
    );
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          return { ...d, url: d.url || globalUrl || DEFAULT_URL };
        })
      );
    }, 50);
  }, [globalUrl]);

  const zoomIn = useCallback((id: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, zoom: Math.min(1.5, +(d.zoom + 0.1).toFixed(1)) } : d))
    );
  }, []);

  const zoomOut = useCallback((id: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, zoom: Math.max(0.3, +(d.zoom - 0.1).toFixed(1)) } : d))
    );
  }, []);

  const applyGlobalUrl = useCallback(() => {
    if (!globalUrl.trim()) {
      toast.error('Enter a URL first');
      return;
    }
    setDevices((prev) => prev.map((d) => ({ ...d, url: globalUrl })));
    toast.success('URL applied to all devices');
  }, [globalUrl]);

  const reloadAll = useCallback(() => {
    setDevices((prev) => prev.map((d) => ({ ...d, url: '' })));
    setTimeout(() => {
      setDevices((prev) => prev.map((d) => ({ ...d, url: globalUrl || DEFAULT_URL })));
    }, 50);
  }, [globalUrl]);

  const addCustomDevice = useCallback(
    (preset: DevicePreset) => {
      addDevice(preset);
    },
    [addDevice]
  );

  const clearAll = useCallback(() => {
    setDevices([
      {
        id: nextId(),
        preset: DEVICE_PRESETS[0],
        landscape: false,
        url: globalUrl,
        zoom: 1,
      },
    ]);
  }, [globalUrl]);

  return (
    <ToolLayout
      title="Responsive Design Tester"
      description="Test any URL across multiple device sizes simultaneously — phones, tablets, and desktops in side-by-side live previews. Perfect for responsive design QA."
    >
      {/* Global controls */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Test URL
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={globalUrl}
                onChange={(e) => setGlobalUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyGlobalUrl()}
                placeholder="https://your-site.com"
                className="flex-1 bg-surface border border-slate-700/50 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500/40 placeholder:text-slate-600"
                spellCheck={false}
              />
              <button
                onClick={applyGlobalUrl}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-400 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={reloadAll}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-lighter transition-colors"
                title="Reload all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            {/* Layout toggle */}
            <div className="flex rounded-lg bg-surface border border-slate-700/50 overflow-hidden h-[38px]">
              <button
                onClick={() => setLayoutMode('horizontal')}
                className={`px-2.5 flex items-center transition-colors ${
                  layoutMode === 'horizontal'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Horizontal scroll"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('vertical')}
                className={`px-2.5 flex items-center border-x border-slate-700/50 transition-colors ${
                  layoutMode === 'vertical'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vertical stack"
              >
                <GripHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('grid')}
                className={`px-2.5 flex items-center transition-colors ${
                  layoutMode === 'grid'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowCustomModal(true)}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors flex items-center gap-1.5 h-[38px]"
            >
              <Plus className="w-4 h-4" />
              Custom
            </button>

            <button
              onClick={clearAll}
              className="px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-red-400 transition-colors h-[38px]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Quick add presets */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-slate-500 mr-1">Quick add:</span>
        {DEVICE_PRESETS.map((preset) => {
          const alreadyAdded = devices.some((d) => d.preset.name === preset.name);
          return (
            <button
              key={preset.name}
              onClick={() => !alreadyAdded && addDevice(preset)}
              disabled={alreadyAdded}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                alreadyAdded
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                  : 'bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {getDeviceIcon(preset.icon)}
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* Device frames */}
      {devices.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-slate-500">
          <Monitor className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No devices added. Select a preset above to start testing.</p>
        </div>
      ) : (
        <div
          className={
            layoutMode === 'horizontal'
              ? 'flex gap-4 overflow-x-auto pb-4'
              : layoutMode === 'vertical'
              ? 'flex flex-col gap-6'
              : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
          }
        >
          {devices.map((device) => (
            <DeviceFrame
              key={device.id}
              device={device}
              onRemove={() => removeDevice(device.id)}
              onToggleLandscape={() => toggleLandscape(device.id)}
              onUpdateUrl={(url) => updateDeviceUrl(device.id, url)}
              onReload={() => reloadDevice(device.id)}
              onZoomIn={() => zoomIn(device.id)}
              onZoomOut={() => zoomOut(device.id)}
              isOnly={devices.length === 1}
              globalUrl={globalUrl}
            />
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="card mt-6">
        <h3 className="text-white font-semibold text-sm mb-2">Tips</h3>
        <ul className="text-slate-400 text-sm space-y-1.5">
          <li>• Add multiple device presets and switch between horizontal scroll, vertical stack, or grid layouts.</li>
          <li>• Use the <strong className="text-slate-300">zoom</strong> buttons to fit larger screens in your viewport.</li>
          <li>• Toggle <strong className="text-slate-300">landscape</strong> mode to test tablet/phone orientations.</li>
          <li>• Each device can have its own URL — great for comparing staging vs production.</li>
          <li>• <strong className="text-amber-400">Note:</strong> Some sites block iframe embedding via <code className="text-xs bg-surface px-1 py-0.5 rounded">X-Frame-Options</code> or CSP headers. Use a local dev server for those.</li>
          <li>• <strong className="text-brand-400">100% client-side</strong> — no data leaves your browser.</li>
        </ul>
      </div>

      {/* Custom device modal */}
      {showCustomModal && (
        <CustomDeviceModal
          onAdd={addCustomDevice}
          onClose={() => setShowCustomModal(false)}
        />
      )}
    </ToolLayout>
  );
}
