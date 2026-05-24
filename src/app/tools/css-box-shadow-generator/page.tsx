'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Plus, Minus, Square, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

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

interface Preset {
  name: string;
  description: string;
  layers: Omit<ShadowLayer, 'id'>[];
  cardColor: string;
  cardRadius: number;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Classic Card',
    description: 'Subtle elevation — the go-to card shadow',
    cardColor: '#ffffff',
    cardRadius: 12,
    layers: [
      { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: '#000000', opacity: 0.12, inset: false },
      { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.08, inset: false },
    ],
  },
  {
    name: 'Elevated Card',
    description: 'Stronger lift for important surfaces',
    cardColor: '#ffffff',
    cardRadius: 12,
    layers: [
      { offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: '#000000', opacity: 0.1, inset: false },
      { offsetX: 0, offsetY: 10, blur: 15, spread: -3, color: '#000000', opacity: 0.1, inset: false },
    ],
  },
  {
    name: 'Neumorphism Flat',
    description: 'Soft inset/outset combo for neumorphic design',
    cardColor: '#e0e5ec',
    cardRadius: 20,
    layers: [
      { offsetX: 8, offsetY: 8, blur: 16, spread: 0, color: '#a3b1c6', opacity: 0.4, inset: false },
      { offsetX: -8, offsetY: -8, blur: 16, spread: 0, color: '#ffffff', opacity: 0.8, inset: false },
    ],
  },
  {
    name: 'Neumorphism Pressed',
    description: 'Pressed/inset neumorphic look',
    cardColor: '#e0e5ec',
    cardRadius: 20,
    layers: [
      { offsetX: 6, offsetY: 6, blur: 12, spread: 0, color: '#a3b1c6', opacity: 0.3, inset: true },
      { offsetX: -6, offsetY: -6, blur: 12, spread: 0, color: '#ffffff', opacity: 0.7, inset: true },
    ],
  },
  {
    name: 'Glow Border',
    description: 'Colored glow effect — no spread shadow',
    cardColor: '#1e293b',
    cardRadius: 16,
    layers: [
      { offsetX: 0, offsetY: 0, blur: 20, spread: 0, color: '#6366f1', opacity: 0.4, inset: false },
      { offsetX: 0, offsetY: 0, blur: 40, spread: 0, color: '#6366f1', opacity: 0.15, inset: false },
    ],
  },
  {
    name: 'Hard Shadow',
    description: 'Sharp, no-blur shadow for brutalist style',
    cardColor: '#ffffff',
    cardRadius: 0,
    layers: [
      { offsetX: 4, offsetY: 4, blur: 0, spread: 0, color: '#000000', opacity: 0.9, inset: false },
    ],
  },
  {
    name: 'Layered 3D',
    description: 'Multiple offset layers for a 3D pop effect',
    cardColor: '#ffffff',
    cardRadius: 12,
    layers: [
      { offsetX: 1, offsetY: 1, blur: 0, spread: 0, color: '#f97316', opacity: 1, inset: false },
      { offsetX: 2, offsetY: 2, blur: 0, spread: 0, color: '#eab308', opacity: 1, inset: false },
      { offsetX: 3, offsetY: 3, blur: 0, spread: 0, color: '#22c55e', opacity: 1, inset: false },
      { offsetX: 4, offsetY: 4, blur: 0, spread: 0, color: '#3b82f6', opacity: 1, inset: false },
      { offsetX: 5, offsetY: 5, blur: 0, spread: 0, color: '#a855f7', opacity: 1, inset: false },
    ],
  },
  {
    name: 'Material v3',
    description: 'Google Material Design 3 elevation (level 3)',
    cardColor: '#ffffff',
    cardRadius: 16,
    layers: [
      { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.3, inset: false },
      { offsetX: 0, offsetY: 2, blur: 6, spread: 2, color: '#000000', opacity: 0.15, inset: false },
    ],
  },
  {
    name: 'Inner Bevel',
    description: 'Subtle inset for sunken panels',
    cardColor: '#f1f5f9',
    cardRadius: 8,
    layers: [
      { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: '#000000', opacity: 0.06, inset: true },
      { offsetX: 0, offsetY: -1, blur: 2, spread: 0, color: '#000000', opacity: 0.04, inset: true },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function shadowCSS(layer: ShadowLayer): string {
  const color = hexToRgba(layer.color, layer.opacity);
  const inset = layer.inset ? 'inset ' : '';
  return `${inset}${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${color}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fullCSS(layers: ShadowLayer[], cardRadius: number): string {
  if (layers.length === 0) return 'box-shadow: none;';
  const shadows = layers.map(shadowCSS).join(',\n       ');
  return `box-shadow: ${shadows};\nborder-radius: ${cardRadius}px;`;
}

const DEFAULT_LAYER: Omit<ShadowLayer, 'id'> = {
  offsetX: 0,
  offsetY: 4,
  blur: 8,
  spread: 0,
  color: '#000000',
  opacity: 0.15,
  inset: false,
};

let nextId = 1;

// ── Slider + Number Input ─────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 font-medium">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-16 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-slate-200 text-right font-mono focus:outline-none focus:border-brand-500"
          />
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSSBoxShadowGenerator() {
  const [layers, setLayers] = useState<ShadowLayer[]>([
    { id: nextId++, ...DEFAULT_LAYER },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<number>(layers[0]?.id ?? 0);
  const [cardRadius, setCardRadius] = useState(12);
  const [cardColor, setCardColor] = useState('#ffffff');
  const [previewBg, setPreviewBg] = useState('#0f172a');

  const activeLayer = useMemo(
    () => layers.find((l) => l.id === activeLayerId) ?? null,
    [layers, activeLayerId],
  );

  const updateLayer = useCallback(
    (id: number, patch: Partial<ShadowLayer>) => {
      setLayers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      );
    },
    [],
  );

  const addLayer = useCallback(() => {
    const newLayer: ShadowLayer = { id: nextId++, ...DEFAULT_LAYER };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, []);

  const removeLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const next = prev.filter((l) => l.id !== id);
        if (next.length === 0) {
          const fallback: ShadowLayer = { id: nextId++, ...DEFAULT_LAYER };
          setActiveLayerId(fallback.id);
          return [fallback];
        }
        if (activeLayerId === id) {
          setActiveLayerId(next[0].id);
        }
        return next;
      });
    },
    [activeLayerId],
  );

  const resetAll = useCallback(() => {
    const newLayer: ShadowLayer = { id: nextId++, ...DEFAULT_LAYER };
    setLayers([newLayer]);
    setActiveLayerId(newLayer.id);
    setCardRadius(12);
    setCardColor('#ffffff');
    setPreviewBg('#0f172a');
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    const newLayers: ShadowLayer[] = preset.layers.map((l) => ({
      ...l,
      id: nextId++,
    }));
    setLayers(newLayers);
    setActiveLayerId(newLayers[0]?.id ?? 0);
    setCardRadius(preset.cardRadius);
    setCardColor(preset.cardColor);
  }, []);

  const copyCSS = useCallback(() => {
    const css = fullCSS(layers, cardRadius);
    navigator.clipboard.writeText(css);
    toast.success('CSS copied!');
  }, [layers, cardRadius]);

  return (
    <ToolLayout
      title="CSS Box‑Shadow Generator"
      description="Visually design box‑shadows — layer multiple shadows, adjust offset, blur, spread, opacity, and toggle inset. 10 presets, live preview, one‑click CSS copy."
      controls={
        <>
          <button onClick={copyCSS} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button onClick={resetAll} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Presets & Layer List ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-left p-2.5 rounded-lg bg-surface-light border border-slate-700/50 hover:border-brand-500/50 transition-colors"
                  title={p.description}
                >
                  <div className="text-xs font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Layer Stack */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Layers</h3>
              <button
                onClick={addLayer}
                className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {[...layers].reverse().map((layer, revIdx) => {
                const isActive = layer.id === activeLayerId;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-colors ${
                      isActive
                        ? 'bg-brand-500/10 border-brand-500/40'
                        : 'bg-surface-light border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-200 truncate">
                        Layer {layers.length - revIdx}
                        {layer.inset ? ' (inset)' : ''}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {layer.offsetX}, {layer.offsetY} / {layer.blur} / {layer.spread}
                      </div>
                    </div>
                    {layers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLayer(layer.id);
                        }}
                        className="text-slate-500 hover:text-red-400 shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 p-2 rounded bg-slate-800/50 border border-slate-700/30">
              <pre className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {fullCSS(layers, cardRadius)}
              </pre>
            </div>
          </div>
        </div>

        {/* ── Center: Live Preview ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Preview</h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-500">BG:</label>
                <input
                  type="color"
                  value={previewBg}
                  onChange={(e) => setPreviewBg(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
            <div
              className="h-64 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: previewBg }}
            >
              <div
                className="w-40 h-40 flex items-center justify-center text-sm font-semibold transition-all duration-150"
                style={{
                  backgroundColor: cardColor,
                  borderRadius: `${cardRadius}px`,
                  boxShadow: layers.map(shadowCSS).join(', ') || 'none',
                  color: cardColor === '#ffffff' || cardColor === '#e0e5ec' || cardColor === '#f1f5f9' ? '#334155' : '#ffffff',
                }}
              >
                <Square className="w-6 h-6 opacity-60" />
              </div>
            </div>
          </div>

          {/* Card Settings */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-300 mb-3">Card Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Card Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-600"
                  />
                  <input
                    type="text"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Border Radius</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={cardRadius}
                    onChange={(e) => setCardRadius(Number(e.target.value))}
                    min={0}
                    max={48}
                    step={1}
                    className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
                  />
                  <span className="w-10 text-right text-xs text-slate-400 font-mono">{cardRadius}px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Layer Controls */}
          {activeLayer && (
            <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300">
                  Layer {layers.findIndex((l) => l.id === activeLayer.id) + 1} Controls
                </h3>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-400">Inset</span>
                  <button
                    onClick={() => updateLayer(activeLayer.id, { inset: !activeLayer.inset })}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      activeLayer.inset ? 'bg-brand-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        activeLayer.inset ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SliderControl
                  label="Offset X"
                  value={activeLayer.offsetX}
                  min={-60}
                  max={60}
                  onChange={(v) => updateLayer(activeLayer.id, { offsetX: v })}
                />
                <SliderControl
                  label="Offset Y"
                  value={activeLayer.offsetY}
                  min={-60}
                  max={60}
                  onChange={(v) => updateLayer(activeLayer.id, { offsetY: v })}
                />
                <SliderControl
                  label="Blur"
                  value={activeLayer.blur}
                  min={0}
                  max={100}
                  onChange={(v) => updateLayer(activeLayer.id, { blur: v })}
                />
                <SliderControl
                  label="Spread"
                  value={activeLayer.spread}
                  min={-40}
                  max={40}
                  onChange={(v) => updateLayer(activeLayer.id, { spread: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Shadow Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeLayer.color}
                      onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-600"
                    />
                    <input
                      type="text"
                      value={activeLayer.color}
                      onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Opacity</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      value={activeLayer.opacity}
                      onChange={(e) => updateLayer(activeLayer.id, { opacity: Number(e.target.value) })}
                      min={0}
                      max={1}
                      step={0.01}
                      className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
                    />
                    <span className="w-10 text-right text-xs text-slate-400 font-mono">
                      {Math.round(activeLayer.opacity * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
