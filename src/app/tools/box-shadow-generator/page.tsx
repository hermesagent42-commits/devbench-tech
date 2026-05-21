'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShadowLayer {
  id: number;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

const PRESETS: { name: string; layers: Omit<ShadowLayer, 'id'>[] }[] = [
  {
    name: 'Subtle Card',
    layers: [
      { offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: '#000000', opacity: 0.12, inset: false },
    ],
  },
  {
    name: 'Elevated Panel',
    layers: [
      { offsetX: 0, offsetY: 4, blur: 16, spread: -2, color: '#000000', opacity: 0.1, inset: false },
      { offsetX: 0, offsetY: 2, blur: 4, spread: -1, color: '#000000', opacity: 0.06, inset: false },
    ],
  },
  {
    name: 'Neumorphic',
    layers: [
      { offsetX: 8, offsetY: 8, blur: 16, spread: 0, color: '#000000', opacity: 0.15, inset: false },
      { offsetX: -8, offsetY: -8, blur: 16, spread: 0, color: '#ffffff', opacity: 0.7, inset: false },
    ],
  },
  {
    name: 'Glow',
    layers: [
      { offsetX: 0, offsetY: 0, blur: 24, spread: 4, color: '#6366f1', opacity: 0.4, inset: false },
    ],
  },
  {
    name: 'Deep Inner',
    layers: [
      { offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: '#000000', opacity: 0.2, inset: true },
    ],
  },
];

let nextId = 1;
function createLayer(overrides: Partial<Omit<ShadowLayer, 'id'>> = {}): ShadowLayer {
  return {
    id: nextId++,
    offsetX: 0,
    offsetY: 4,
    blur: 12,
    spread: 0,
    color: '#000000',
    opacity: 0.15,
    inset: false,
    ...overrides,
  };
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`;
}

function shadowToString(layer: ShadowLayer): string {
  const color = hexToRgba(layer.color, layer.opacity);
  return `${layer.inset ? 'inset ' : ''}${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${color}`;
}

export default function BoxShadowGeneratorPage() {
  const [layers, setLayers] = useState<ShadowLayer[]>([createLayer()]);
  const [previewBg, setPreviewBg] = useState('#1e293b');
  const [previewRadius, setPreviewRadius] = useState(12);
  const [activeLayerId, setActiveLayerId] = useState(layers[0]?.id ?? 0);

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0];

  const boxShadow = useMemo(() => {
    return layers.map(shadowToString).join(',\n       ');
  }, [layers]);

  const updateLayer = useCallback(
    (id: number, updates: Partial<ShadowLayer>) => {
      setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    },
    []
  );

  const addLayer = useCallback(() => {
    const newLayer = createLayer();
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, []);

  const removeLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const filtered = prev.filter((l) => l.id !== id);
        if (filtered.length === 0) {
          const fallback = createLayer();
          setActiveLayerId(fallback.id);
          return [fallback];
        }
        if (id === activeLayerId) {
          setActiveLayerId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeLayerId]
  );

  const resetAll = useCallback(() => {
    const newLayer = createLayer();
    setLayers([newLayer]);
    setActiveLayerId(newLayer.id);
    setPreviewBg('#1e293b');
    setPreviewRadius(12);
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    const newLayers = preset.layers.map((l) => createLayer(l));
    setLayers(newLayers);
    setActiveLayerId(newLayers[0].id);
  }, []);

  const copyCss = useCallback(() => {
    const css = layers.length === 1
      ? `box-shadow: ${boxShadow};`
      : `box-shadow:\n       ${boxShadow};`;

    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [boxShadow, layers.length]);

  const allCss = `box-shadow: ${boxShadow};
background: ${previewBg};
border-radius: ${previewRadius}px;`;

  return (
    <ToolLayout
      title="CSS Box-Shadow Generator"
      description="Create, customize, and layer box-shadows with a live preview. Copy the CSS directly."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Presets</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Layers */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">
                Layers ({layers.length})
              </h2>
              <button
                onClick={addLayer}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add layer
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    layer.id === activeLayerId
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {layer.inset ? 'inset' : 'drop'} #{layer.id}
                </button>
              ))}
            </div>
          </div>

          {/* Active Layer Controls */}
          {activeLayer && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">
                  Layer #{activeLayer.id} Settings
                </h2>
                {layers.length > 1 && (
                  <button
                    onClick={() => removeLayer(activeLayer.id)}
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>

              {/* Offset X */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Offset X</label>
                  <span className="text-xs text-slate-300 font-mono">{activeLayer.offsetX}px</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={activeLayer.offsetX}
                  onChange={(e) => updateLayer(activeLayer.id, { offsetX: Number(e.target.value) })}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Offset Y */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Offset Y</label>
                  <span className="text-xs text-slate-300 font-mono">{activeLayer.offsetY}px</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  value={activeLayer.offsetY}
                  onChange={(e) => updateLayer(activeLayer.id, { offsetY: Number(e.target.value) })}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Blur */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Blur Radius</label>
                  <span className="text-xs text-slate-300 font-mono">{activeLayer.blur}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={activeLayer.blur}
                  onChange={(e) => updateLayer(activeLayer.id, { blur: Number(e.target.value) })}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Spread */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Spread Radius</label>
                  <span className="text-xs text-slate-300 font-mono">{activeLayer.spread}px</span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  value={activeLayer.spread}
                  onChange={(e) => updateLayer(activeLayer.id, { spread: Number(e.target.value) })}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Opacity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Opacity</label>
                  <span className="text-xs text-slate-300 font-mono">{activeLayer.opacity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={activeLayer.opacity}
                  onChange={(e) => updateLayer(activeLayer.id, { opacity: Number(e.target.value) })}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Color */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400">Shadow Color</label>
                <input
                  type="color"
                  value={activeLayer.color}
                  onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-xs text-slate-300 font-mono">{activeLayer.color}</span>
              </div>

              {/* Inset toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeLayer.inset}
                  onChange={(e) => updateLayer(activeLayer.id, { inset: e.target.checked })}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-xs text-slate-400">Inset (inner shadow)</span>
              </label>
            </div>
          )}

          {/* Preview background */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Preview Settings</h2>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Background</label>
              <input
                type="color"
                value={previewBg}
                onChange={(e) => setPreviewBg(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs text-slate-300 font-mono">{previewBg}</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Border Radius</label>
                <span className="text-xs text-slate-300 font-mono">{previewRadius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                value={previewRadius}
                onChange={(e) => setPreviewRadius(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all
          </button>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Preview</h2>
            <div className="flex items-center justify-center py-16 px-8 min-h-[280px] rounded-lg" style={{ background: '#0f172a' }}>
              <div
                className="w-48 h-48 transition-all duration-150"
                style={{
                  boxShadow,
                  background: previewBg,
                  borderRadius: `${previewRadius}px`,
                }}
              />
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS Output</h2>
              <button
                onClick={copyCss}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy box-shadow
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-48 overflow-y-auto">
              {allCss}
            </pre>
          </div>

          {/* Visual Layers Legend */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Layer Breakdown</h2>
            <div className="space-y-2">
              {layers.map((layer, i) => (
                <div key={layer.id} className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500 font-mono w-6">#{i + 1}</span>
                  <span className="text-slate-400 truncate flex-1 font-mono">
                    {shadowToString(layer)}
                  </span>
                  <button
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`px-2 py-0.5 rounded text-xs ${
                      layer.id === activeLayerId
                        ? 'bg-brand-500/20 text-brand-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
