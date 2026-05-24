'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Plus, Minus, Type } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShadowLayer {
  id: number;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

const PRESETS: { name: string; layers: Omit<ShadowLayer, 'id'>[]; textColor: string; bgColor: string; sampleText: string }[] = [
  {
    name: 'Classic Drop',
    textColor: '#ffffff',
    bgColor: '#1e293b',
    sampleText: 'DevBench',
    layers: [
      { offsetX: 2, offsetY: 4, blur: 6, color: '#000000', opacity: 0.4 },
    ],
  },
  {
    name: 'Neon Glow',
    textColor: '#ffffff',
    bgColor: '#0f0f23',
    sampleText: 'NEON',
    layers: [
      { offsetX: 0, offsetY: 0, blur: 12, color: '#6366f1', opacity: 0.8 },
      { offsetX: 0, offsetY: 0, blur: 24, color: '#6366f1', opacity: 0.4 },
      { offsetX: 0, offsetY: 0, blur: 48, color: '#a855f7', opacity: 0.2 },
    ],
  },
  {
    name: 'Retro 3D',
    textColor: '#f97316',
    bgColor: '#1a1a2e',
    sampleText: 'RETRO',
    layers: [
      { offsetX: 1, offsetY: 1, blur: 0, color: '#eab308', opacity: 1 },
      { offsetX: 2, offsetY: 2, blur: 0, color: '#22c55e', opacity: 1 },
      { offsetX: 3, offsetY: 3, blur: 0, color: '#3b82f6', opacity: 1 },
      { offsetX: 4, offsetY: 4, blur: 0, color: '#a855f7', opacity: 1 },
    ],
  },
  {
    name: 'Embossed',
    textColor: '#94a3b8',
    bgColor: '#334155',
    sampleText: 'EMBOSS',
    layers: [
      { offsetX: -1, offsetY: -1, blur: 1, color: '#ffffff', opacity: 0.3 },
      { offsetX: 1, offsetY: 1, blur: 1, color: '#000000', opacity: 0.5 },
    ],
  },
  {
    name: 'Fire',
    textColor: '#ffffff',
    bgColor: '#1a0a00',
    sampleText: 'FIRE',
    layers: [
      { offsetX: 0, offsetY: 0, blur: 6, color: '#f97316', opacity: 0.9 },
      { offsetX: 0, offsetY: -4, blur: 12, color: '#ef4444', opacity: 0.7 },
      { offsetX: 2, offsetY: 4, blur: 10, color: '#fbbf24', opacity: 0.6 },
    ],
  },
  {
    name: 'Outline Text',
    textColor: '#1e293b',
    bgColor: '#0f172a',
    sampleText: 'OUTLINE',
    layers: [
      { offsetX: -1, offsetY: -1, blur: 0, color: '#6366f1', opacity: 1 },
      { offsetX: 1, offsetY: -1, blur: 0, color: '#6366f1', opacity: 1 },
      { offsetX: -1, offsetY: 1, blur: 0, color: '#6366f1', opacity: 1 },
      { offsetX: 1, offsetY: 1, blur: 0, color: '#6366f1', opacity: 1 },
    ],
  },
  {
    name: 'Double',
    textColor: '#ffffff',
    bgColor: '#0f172a',
    sampleText: 'DOUBLE',
    layers: [
      { offsetX: 3, offsetY: 3, blur: 0, color: '#ef4444', opacity: 0.8 },
      { offsetX: 6, offsetY: 6, blur: 0, color: '#3b82f6', opacity: 0.6 },
    ],
  },
  {
    name: 'Soft Halo',
    textColor: '#f8fafc',
    bgColor: '#0c0a1d',
    sampleText: 'HALO',
    layers: [
      { offsetX: 0, offsetY: 0, blur: 20, color: '#818cf8', opacity: 0.5 },
      { offsetX: 0, offsetY: 0, blur: 40, color: '#818cf8', opacity: 0.25 },
    ],
  },
];

let nextId = 1;
function createLayer(overrides: Partial<Omit<ShadowLayer, 'id'>> = {}): ShadowLayer {
  return {
    id: nextId++,
    offsetX: 2,
    offsetY: 2,
    blur: 4,
    color: '#000000',
    opacity: 0.4,
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
  return `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${color}`;
}

export default function TextShadowGeneratorPage() {
  const [layers, setLayers] = useState<ShadowLayer[]>([createLayer()]);
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#1e293b');
  const [sampleText, setSampleText] = useState('DevBench');
  const [fontSize, setFontSize] = useState(64);
  const [fontWeight, setFontWeight] = useState(700);
  const [textAlign, setTextAlign] = useState<'center' | 'left' | 'right'>('center');
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');
  const [activeLayerId, setActiveLayerId] = useState(layers[0]?.id ?? 0);

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0];

  const textShadow = useMemo(() => {
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
    setTextColor('#ffffff');
    setBgColor('#1e293b');
    setSampleText('DevBench');
    setFontSize(64);
    setFontWeight(700);
    setTextAlign('center');
    setFontFamily('Inter, system-ui, sans-serif');
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    const newLayers = preset.layers.map((l) => createLayer(l));
    setLayers(newLayers);
    setActiveLayerId(newLayers[0].id);
    setTextColor(preset.textColor);
    setBgColor(preset.bgColor);
    setSampleText(preset.sampleText);
  }, []);

  const copyCss = useCallback(() => {
    const css = layers.length === 1
      ? `text-shadow: ${textShadow};`
      : `text-shadow:\n       ${textShadow};`;

    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [textShadow, layers.length]);

  const allCss = `text-shadow: ${textShadow};
color: ${textColor};
font-size: ${fontSize}px;
font-weight: ${fontWeight};
font-family: ${fontFamily};
text-align: ${textAlign};`;

  const availableFonts = [
    'Inter, system-ui, sans-serif',
    'Georgia, serif',
    '"Courier New", monospace',
    '"Times New Roman", serif',
    'Impact, sans-serif',
    '"Comic Sans MS", cursive',
  ];

  return (
    <ToolLayout
      title="CSS Text-Shadow Generator"
      description="Design layered text-shadows with a live preview. Perfect for headings, hero text, neon effects, and 3D typography."
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

          {/* Text Content */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Text</h2>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value || 'Text')}
              placeholder="Your text here"
              className="w-full px-3 py-2 rounded-md bg-surface border border-slate-600/50 text-white text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 w-20 shrink-0">Font Family</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md bg-surface border border-slate-600/50 text-white text-sm focus:outline-none focus:border-brand-500/50"
              >
                {availableFonts.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Layers */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">
                Shadow Layers ({layers.length})
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
                  #{layer.id}
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
                  min={-30}
                  max={30}
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
                  min={-30}
                  max={30}
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
                  max={60}
                  value={activeLayer.blur}
                  onChange={(e) => updateLayer(activeLayer.id, { blur: Number(e.target.value) })}
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
                <label className="text-xs text-slate-400">Color</label>
                <input
                  type="color"
                  value={activeLayer.color}
                  onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-xs text-slate-300 font-mono">{activeLayer.color}</span>
              </div>
            </div>
          )}

          {/* Text Styling */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm">Text Style</h2>

            {/* Text Color */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Text Color</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs text-slate-300 font-mono">{textColor}</span>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Font Size</label>
                <span className="text-xs text-slate-300 font-mono">{fontSize}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={160}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            {/* Font Weight */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Font Weight</label>
                <span className="text-xs text-slate-300 font-mono">{fontWeight}</span>
              </div>
              <input
                type="range"
                min={100}
                max={900}
                step={100}
                value={fontWeight}
                onChange={(e) => setFontWeight(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            {/* Text Align */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Text Align</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setTextAlign(align)}
                    className={`px-4 py-1.5 text-xs rounded-md capitalize transition-all ${
                      textAlign === align
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                        : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Background */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Preview Background</h2>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Background</label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs text-slate-300 font-mono">{bgColor}</span>
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
            <div
              className="flex items-center justify-center py-16 px-8 min-h-[300px] rounded-lg"
              style={{ background: bgColor }}
            >
              <span
                className="transition-all duration-150 break-words max-w-full"
                style={{
                  textShadow: textShadow || undefined,
                  color: textColor,
                  fontSize: `${fontSize}px`,
                  fontWeight: fontWeight,
                  fontFamily: fontFamily,
                  textAlign: textAlign,
                  lineHeight: 1.2,
                }}
              >
                {sampleText}
              </span>
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
                Copy text-shadow
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-56 overflow-y-auto">
              {allCss}
            </pre>
          </div>

          {/* Layer Breakdown */}
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

          {/* Tips */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">
              <Type className="w-4 h-4 inline mr-1.5" />
              Quick Tips
            </h2>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>• Layer multiple shadows for rich 3D and glow effects</li>
              <li>• Use <code className="text-brand-400 bg-surface px-1 py-0.5 rounded">blur: 0</code> for sharp outline/3D effects</li>
              <li>• High blur + low opacity = soft glow</li>
              <li>• Offset (±1, ±1) × 4 directions = outline text</li>
              <li>• Negative offsets push shadows up/left</li>
              <li>• Unlike box-shadow, text-shadow has no spread or inset</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
