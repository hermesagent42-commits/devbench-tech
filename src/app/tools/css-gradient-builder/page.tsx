'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Trash2, RotateCcw, Type, Circle, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';

type GradientType = 'linear' | 'radial' | 'conic';

interface ColorStop {
  id: number;
  color: string;
  position: number;
}

const PRESETS: { name: string; type: GradientType; angle: number; shape: string; centerX: number; centerY: number; stops: Omit<ColorStop, 'id'>[] }[] = [
  {
    name: 'Ocean Blue',
    type: 'linear',
    angle: 135,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    stops: [
      { color: '#0ea5e9', position: 0 },
      { color: '#0369a1', position: 50 },
      { color: '#0c4a6e', position: 100 },
    ],
  },
  {
    name: 'Sunset',
    type: 'linear',
    angle: 90,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    stops: [
      { color: '#f97316', position: 0 },
      { color: '#ec4899', position: 50 },
      { color: '#8b5cf6', position: 100 },
    ],
  },
  {
    name: 'Forest',
    type: 'linear',
    angle: 160,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    stops: [
      { color: '#22c55e', position: 0 },
      { color: '#15803d', position: 100 },
    ],
  },
  {
    name: 'Midnight',
    type: 'radial',
    angle: 0,
    shape: 'circle',
    centerX: 30,
    centerY: 30,
    stops: [
      { color: '#6366f1', position: 0 },
      { color: '#1e1b4b', position: 70 },
      { color: '#020617', position: 100 },
    ],
  },
  {
    name: 'Aurora',
    type: 'linear',
    angle: 45,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    stops: [
      { color: '#06b6d4', position: 0 },
      { color: '#10b981', position: 33 },
      { color: '#a855f7', position: 66 },
      { color: '#f43f5e', position: 100 },
    ],
  },
  {
    name: 'Conic Rainbow',
    type: 'conic',
    angle: 0,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    stops: [
      { color: '#ef4444', position: 0 },
      { color: '#f97316', position: 16 },
      { color: '#eab308', position: 33 },
      { color: '#22c55e', position: 50 },
      { color: '#3b82f6', position: 66 },
      { color: '#8b5cf6', position: 83 },
      { color: '#ef4444', position: 100 },
    ],
  },
  {
    name: 'Warm Stone',
    type: 'linear',
    angle: 180,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    stops: [
      { color: '#d6d3d1', position: 0 },
      { color: '#78716c', position: 100 },
    ],
  },
  {
    name: 'Neon Pulse',
    type: 'conic',
    angle: 0,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    stops: [
      { color: '#ec4899', position: 0 },
      { color: '#f97316', position: 25 },
      { color: '#eab308', position: 50 },
      { color: '#22c55e', position: 75 },
      { color: '#ec4899', position: 100 },
    ],
  },
];

let stopIdCounter = 0;
function nextStopId() {
  return ++stopIdCounter;
}

export default function CssGradientBuilderPage() {
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(135);
  const [shape, setShape] = useState<'circle' | 'ellipse'>('circle');
  const [centerX, setCenterX] = useState(50);
  const [centerY, setCenterY] = useState(50);
  const [stops, setStops] = useState<ColorStop[]>([
    { id: nextStopId(), color: '#0ea5e9', position: 0 },
    { id: nextStopId(), color: '#8b5cf6', position: 100 },
  ]);
  const [showCss, setShowCss] = useState(true);

  const cssCode = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sorted.map(s => `${s.color} ${s.position}%`).join(', ');

    switch (gradientType) {
      case 'linear':
        return `background: linear-gradient(${angle}deg, ${stopsStr});`;
      case 'radial':
        return `background: radial-gradient(${shape} at ${centerX}% ${centerY}%, ${stopsStr});`;
      case 'conic':
        return `background: conic-gradient(from ${angle}deg at ${centerX}% ${centerY}%, ${stopsStr});`;
    }
  }, [gradientType, angle, shape, centerX, centerY, stops]);

  const gradientStyle = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sorted.map(s => `${s.color} ${s.position}%`).join(', ');

    switch (gradientType) {
      case 'linear':
        return { background: `linear-gradient(${angle}deg, ${stopsStr})` };
      case 'radial':
        return { background: `radial-gradient(${shape} at ${centerX}% ${centerY}%, ${stopsStr})` };
      case 'conic':
        return { background: `conic-gradient(from ${angle}deg at ${centerX}% ${centerY}%, ${stopsStr})` };
    }
  }, [gradientType, angle, shape, centerX, centerY, stops]);

  const addStop = useCallback(() => {
    if (stops.length >= 8) {
      toast.error('Max 8 color stops');
      return;
    }
    // Insert in the middle of the widest gap
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    let bestPos = 50;
    let bestGap = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].position - sorted[i].position;
      if (gap > bestGap) {
        bestGap = gap;
        bestPos = Math.round((sorted[i].position + sorted[i + 1].position) / 2);
      }
    }
    if (bestGap === 0 && sorted.length > 0) {
      bestPos = sorted[sorted.length - 1].position + 10 > 100 ? 50 : sorted[sorted.length - 1].position + 10;
    }
    setStops(prev => [...prev, { id: nextStopId(), color: '#6366f1', position: bestPos }]);
  }, [stops]);

  const removeStop = useCallback((id: number) => {
    if (stops.length <= 2) {
      toast.error('Need at least 2 color stops');
      return;
    }
    setStops(prev => prev.filter(s => s.id !== id));
  }, [stops]);

  const updateStop = useCallback((id: number, field: 'color' | 'position', value: string | number) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    stopIdCounter = 0;
    setGradientType(preset.type);
    setAngle(preset.angle);
    setShape(preset.shape as 'circle' | 'ellipse');
    setCenterX(preset.centerX);
    setCenterY(preset.centerY);
    setStops(preset.stops.map(s => ({ ...s, id: nextStopId() })));
  }, []);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssCode).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [cssCode]);

  const resetAll = useCallback(() => {
    stopIdCounter = 0;
    setGradientType('linear');
    setAngle(135);
    setShape('circle');
    setCenterX(50);
    setCenterY(50);
    setStops([
      { id: nextStopId(), color: '#0ea5e9', position: 0 },
      { id: nextStopId(), color: '#8b5cf6', position: 100 },
    ]);
  }, []);

  return (
    <ToolLayout
      title="CSS Gradient Builder"
      description="Build beautiful CSS gradients visually — linear, radial, and conic. Copy the CSS and use it anywhere."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Preview */}
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-slate-300">Preview</label>
          <div
            className="w-full aspect-[4/3] rounded-xl border border-slate-700/50 shadow-lg transition-all duration-300"
            style={gradientStyle}
          />

          {/* Type Toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-surface-lighter">
            {([
              { value: 'linear', label: 'Linear', icon: Gauge },
              { value: 'radial', label: 'Radial', icon: Circle },
              { value: 'conic', label: 'Conic', icon: Type },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setGradientType(value)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  gradientType === value
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Angle / Position controls */}
          {gradientType !== 'radial' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-400">
                {gradientType === 'conic' ? 'Starting Angle' : 'Angle'}: {angle}°
              </label>
              <input
                type="range"
                min={0}
                max={360}
                value={angle}
                onChange={e => setAngle(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-surface-lighter cursor-pointer accent-brand-500"
              />
            </div>
          )}
          {gradientType !== 'linear' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Center X: {centerX}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={centerX}
                  onChange={e => setCenterX(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-surface-lighter cursor-pointer accent-brand-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                {gradientType === 'radial' ? (
                  <>
                    <label className="text-xs font-medium text-slate-400">Shape</label>
                    <div className="flex gap-1 p-0.5 rounded-md bg-surface-lighter">
                      <button
                        onClick={() => setShape('circle')}
                        className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                          shape === 'circle' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Circle
                      </button>
                      <button
                        onClick={() => setShape('ellipse')}
                        className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                          shape === 'ellipse' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Ellipse
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="text-xs font-medium text-slate-400">Center Y: {centerY}%</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={centerY}
                      onChange={e => setCenterY(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none bg-surface-lighter cursor-pointer accent-brand-500"
                    />
                  </>
                )}
              </div>
              {gradientType === 'radial' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Center Y: {centerY}%</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={centerY}
                    onChange={e => setCenterY(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none bg-surface-lighter cursor-pointer accent-brand-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col gap-6">
          {/* Color Stops */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Color Stops</label>
              <button
                onClick={addStop}
                disabled={stops.length >= 8}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-surface-lighter text-slate-300 hover:text-white hover:bg-surface-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stop
              </button>
            </div>

            {/* Gradient stop strip preview */}
            <div
              className="h-4 w-full rounded-md mb-4 border border-slate-700/30"
              style={{
                background: `linear-gradient(to right, ${[...stops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ')})`,
              }}
            />

            <div className="flex flex-col gap-3">
              {[...stops]
                .sort((a, b) => a.position - b.position)
                .map((stop) => (
                  <div key={stop.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-lighter/50 border border-slate-700/30">
                    <input
                      type="color"
                      value={stop.color}
                      onChange={e => updateStop(stop.id, 'color', e.target.value)}
                      className="w-9 h-9 rounded-md border-2 border-slate-600 cursor-pointer bg-transparent p-0.5"
                    />
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-xs font-mono text-slate-300">{stop.color.toUpperCase()}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={e => updateStop(stop.id, 'position', Number(e.target.value))}
                        className="w-full h-1.5 rounded accent-brand-500 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-10 text-right">{stop.position}%</span>
                    <button
                      onClick={() => removeStop(stop.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Remove stop"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">CSS Output</label>
              <div className="flex items-center gap-2">
                <button onClick={copyCss} className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3">
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <button onClick={resetAll} className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
            <pre className="p-4 rounded-lg bg-slate-950 border border-slate-700/50 text-sm font-mono text-brand-300 overflow-x-auto whitespace-pre-wrap break-all">
              {cssCode}
            </pre>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="mt-10 pt-8 border-t border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map((preset) => {
            const stopsStr = preset.stops
              .map(s => `${s.color} ${s.position}%`)
              .join(', ');
            let bg: string;
            switch (preset.type) {
              case 'linear':
                bg = `linear-gradient(${preset.angle}deg, ${stopsStr})`;
                break;
              case 'radial':
                bg = `radial-gradient(${preset.shape} at ${preset.centerX}% ${preset.centerY}%, ${stopsStr})`;
                break;
              case 'conic':
                bg = `conic-gradient(from ${preset.angle}deg at ${preset.centerX}% ${preset.centerY}%, ${stopsStr})`;
                break;
            }
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="group relative h-20 rounded-xl border border-slate-700/30 overflow-hidden hover:border-brand-500/50 transition-all duration-200 hover:scale-[1.02]"
                style={{ background: bg }}
              >
                <span className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white/90 text-center">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </ToolLayout>
  );
}
