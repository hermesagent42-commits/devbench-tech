'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Download, RefreshCw, Shuffle, Palette,
  Code2, Check, Layers, Waves, Plus, Trash2, MoveVertical,
  GripHorizontal, ArrowUpDown, FlipHorizontal, FlipVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

type WaveType = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'custom';
type WaveDirection = 'up' | 'down' | 'both';
type GradientType = 'solid' | 'linear' | 'radial';

interface WaveLayer {
  id: number;
  type: WaveType;
  color1: string;
  color2: string;
  gradientType: GradientType;
  opacity: number;
  amplitude: number;
  frequency: number;
  offset: number;
  direction: WaveDirection;
  flipX: boolean;
  flipY: boolean;
  heightPercent: number;
}

interface WaveConfig {
  width: number;
  height: number;
  bgColor: string;
  layers: WaveLayer[];
  preserveAspectRatio: boolean;
}

let nextLayerId = 100;

function generateWavePath(
  type: WaveType,
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  offset: number,
  direction: WaveDirection,
  flipX: boolean,
  flipY: boolean,
): string {
  const baseY = direction === 'up' ? height : direction === 'down' ? 0 : height / 2;
  const amp = (amplitude / 100) * (height * 0.45);

  const rawPoints: { x: number; y: number }[] = [];
  const steps = Math.max(8, Math.floor(width / 3));

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const normalized = (flipX ? 1 - i / steps : i / steps) * frequency * 2 * Math.PI + (offset / 100) * 2 * Math.PI;

    let waveY: number;
    switch (type) {
      case 'sine':
        waveY = Math.sin(normalized);
        break;
      case 'triangle':
        waveY = (2 / Math.PI) * Math.asin(Math.sin(normalized));
        break;
      case 'square':
        waveY = Math.sign(Math.sin(normalized));
        break;
      case 'sawtooth':
        waveY = (2 / Math.PI) * Math.atan(1 / Math.tan(normalized / 2));
        break;
      case 'custom':
        waveY = Math.sin(normalized) + 0.3 * Math.sin(normalized * 3) + 0.15 * Math.sin(normalized * 5);
        waveY /= 1.45;
        break;
      default:
        waveY = Math.sin(normalized);
    }

    waveY *= (flipY ? -1 : 1);
    rawPoints.push({ x, y: baseY + waveY * amp });
  }

  let d = `M ${rawPoints[0].x.toFixed(2)} ${rawPoints[0].y.toFixed(2)}`;
  for (let i = 1; i < rawPoints.length; i++) {
    const p0 = rawPoints[i - 1];
    const p1 = rawPoints[i];
    const cpx = (p0.x + p1.x) / 2;
    d += ` Q ${cpx.toFixed(2)} ${p0.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  // Complete the shape
  const firstY = rawPoints[0].y;
  const lastX = rawPoints[rawPoints.length - 1].x;
  const lastY = rawPoints[rawPoints.length - 1].y;

  if (direction === 'up') {
    d += ` L ${lastX.toFixed(2)} ${height} L 0 ${height} Z`;
  } else if (direction === 'down') {
    d += ` L ${lastX.toFixed(2)} 0 L 0 0 Z`;
  } else {
    // 'both' - fill entire area
    d += ` L ${lastX.toFixed(2)} ${height} L 0 ${height} Z`;
  }

  return d;
}

function buildLayerDef(layer: WaveLayer, index: number): { def: string; fill: string; id: string } {
  let def = '';
  let fill = layer.color1;
  const id = `w${index}`;

  if (layer.gradientType === 'linear') {
    def = `<linearGradient id="${id}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${layer.color1}" stop-opacity="${layer.opacity}"/><stop offset="100%" stop-color="${layer.color2}" stop-opacity="${layer.opacity}"/></linearGradient>`;
    fill = `url(#${id})`;
  } else if (layer.gradientType === 'radial') {
    def = `<radialGradient id="${id}" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="${layer.color1}" stop-opacity="${layer.opacity}"/><stop offset="100%" stop-color="${layer.color2}" stop-opacity="${layer.opacity}"/></radialGradient>`;
    fill = `url(#${id})`;
  } else {
    fill = layer.color1;
    def = '';
  }

  return { def, fill, id };
}

function buildSvg(config: WaveConfig): string {
  const { width, height, bgColor, layers, preserveAspectRatio } = config;
  const parts: string[] = [];
  const defsParts: string[] = [];

  // Background
  if (bgColor && bgColor !== 'transparent') {
    parts.push(`<rect width="100%" height="100%" fill="${bgColor}"/>`);
  }

  // Layers
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const { def, fill, id } = buildLayerDef(layer, i);
    if (def) defsParts.push(def);

    const d = generateWavePath(
      layer.type, width, height, layer.amplitude, layer.frequency,
      layer.offset, layer.direction, layer.flipX, layer.flipY,
    );

    let fillAttr: string;
    if (layer.gradientType === 'solid') {
      fillAttr = `fill="${fill}" fill-opacity="${layer.opacity}"`;
    } else {
      fillAttr = `fill="${fill}"`;
    }

    parts.push(`<path d="${d}" ${fillAttr}/>`);
  }

  const defsStr = defsParts.length > 0 ? `<defs>${defsParts.join('')}</defs>` : '';
  const preserve = preserveAspectRatio ? ' preserveAspectRatio="none"' : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${preserve} width="100%" height="100%">
  ${defsStr}
  ${parts.join('\n  ')}
</svg>`;
}

const PRESET_PALETTES = [
  { name: 'Ocean', colors: ['#0ea5e9', '#0284c7', '#0369a1', '#075985'] },
  { name: 'Sunset', colors: ['#f97316', '#ea580c', '#db2777', '#e11d48'] },
  { name: 'Forest', colors: ['#22c55e', '#16a34a', '#15803d', '#166534'] },
  { name: 'Lavender', colors: ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9'] },
  { name: 'Rose', colors: ['#f43f5e', '#e11d48', '#be123c', '#9f1239'] },
  { name: 'Amber', colors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'] },
  { name: 'Nord', colors: ['#88c0d0', '#81a1c1', '#5e81ac', '#4c566a'] },
  { name: 'Dracula', colors: ['#bd93f9', '#ff79c6', '#8be9fd', '#50fa7b'] },
];

function createLayer(type: WaveType = 'sine'): WaveLayer {
  return {
    id: nextLayerId++,
    type,
    color1: '#3b82f6',
    color2: '#8b5cf6',
    gradientType: 'linear' as GradientType,
    opacity: 0.7,
    amplitude: 40,
    frequency: 1,
    offset: 0,
    direction: 'up' as WaveDirection,
    flipX: false,
    flipY: false,
    heightPercent: 100,
  };
}

const DEFAULT_LAYERS: WaveLayer[] = [
  {
    id: 1,
    type: 'sine',
    color1: '#3b82f6',
    color2: '#8b5cf6',
    gradientType: 'linear',
    opacity: 0.8,
    amplitude: 35,
    frequency: 1.5,
    offset: 0,
    direction: 'up',
    flipX: false,
    flipY: false,
    heightPercent: 100,
  },
  {
    id: 2,
    type: 'sine',
    color1: '#06b6d4',
    color2: '#3b82f6',
    gradientType: 'linear',
    opacity: 0.6,
    amplitude: 45,
    frequency: 2,
    offset: 40,
    direction: 'up',
    flipX: false,
    flipY: false,
    heightPercent: 100,
  },
  {
    id: 3,
    type: 'sine',
    color1: '#8b5cf6',
    color2: '#06b6d4',
    gradientType: 'linear',
    opacity: 0.4,
    amplitude: 55,
    frequency: 3,
    offset: 80,
    direction: 'up',
    flipX: false,
    flipY: false,
    heightPercent: 100,
  },
];

export default function SvgWaveGenerator() {
  const [width, setWidth] = useState(1440);
  const [height, setHeight] = useState(320);
  const [bgColor, setBgColor] = useState('#0f172a');
  const [layers, setLayers] = useState<WaveLayer[]>(DEFAULT_LAYERS);
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const config: WaveConfig = useMemo(() => ({
    width, height, bgColor, layers, preserveAspectRatio,
  }), [width, height, bgColor, layers, preserveAspectRatio]);

  const svgCode = useMemo(() => buildSvg(config), [config]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(svgCode).then(() => {
      setCopied(true);
      toast.success('SVG copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [svgCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wave.svg';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [svgCode]);

  const handleAddLayer = useCallback(() => {
    const last = layers[layers.length - 1];
    const newLayer = createLayer(last?.type ?? 'sine');
    newLayer.color1 = '#6366f1';
    newLayer.color2 = '#a855f7';
    newLayer.offset = (last?.offset ?? 0) + 50;
    newLayer.amplitude = (last?.amplitude ?? 40) + 10;
    setLayers([...layers, newLayer]);
  }, [layers]);

  const handleRemoveLayer = useCallback((id: number) => {
    if (layers.length <= 1) return;
    setLayers(layers.filter(l => l.id !== id));
  }, [layers]);

  const handleUpdateLayer = useCallback((id: number, updates: Partial<WaveLayer>) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  }, [layers]);

  const handleShuffle = useCallback(() => {
    const palette = PRESET_PALETTES[Math.floor(Math.random() * PRESET_PALETTES.length)];
    const types: WaveType[] = ['sine', 'triangle', 'sawtooth', 'custom'];
    setLayers(layers.map((layer, i) => ({
      ...layer,
      type: types[Math.floor(Math.random() * types.length)],
      color1: palette.colors[i % palette.colors.length],
      color2: palette.colors[(i + 1) % palette.colors.length],
      amplitude: 25 + Math.floor(Math.random() * 50),
      frequency: 0.5 + Math.random() * 3,
      offset: Math.floor(Math.random() * 100),
    })));
  }, [layers]);

  const handleReset = useCallback(() => {
    setLayers(DEFAULT_LAYERS);
    setWidth(1440);
    setHeight(320);
    setBgColor('#0f172a');
  }, []);

  const handleApplyPalette = useCallback((paletteIndex: number) => {
    const palette = PRESET_PALETTES[paletteIndex];
    setLayers(layers.map((layer, i) => ({
      ...layer,
      color1: palette.colors[i % palette.colors.length],
      color2: palette.colors[(i + 1) % palette.colors.length],
    })));
  }, [layers]);

  const dataUri = useMemo(() => {
    return `data:image/svg+xml,${encodeURIComponent(svgCode)}`;
  }, [svgCode]);

  return (
    <ToolLayout
      title="SVG Wave Generator"
      description="Create beautiful, layered SVG wave dividers for your website sections. Customize colors, curves, and export ready-to-use SVG code."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition-colors"
          >
            <Shuffle className="w-3 h-3" /> Randomize
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-600/50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-600/50 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy SVG'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-600/50 transition-colors"
          >
            <Download className="w-3 h-3" /> Download
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              showCode
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                : 'bg-slate-700/50 text-slate-300 border-slate-600/30 hover:bg-slate-600/50'
            }`}
          >
            <Code2 className="w-3 h-3" /> Code
          </button>
        </div>
      }
    >
      {/* Preview */}
      <div className="mb-8 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/30">
          <span className="text-xs text-slate-400 font-medium">Preview</span>
          <span className="text-xs text-slate-500">{width}×{height}</span>
        </div>
        <div
          ref={svgRef}
          className="w-full overflow-hidden"
          style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
          dangerouslySetInnerHTML={{ __html: svgCode }}
        />
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Dimensions */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <GripHorizontal className="w-4 h-4 text-brand-400" />
            Dimensions
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Width</label>
              <input
                type="range"
                min={400}
                max={2560}
                step={10}
                value={width}
                onChange={e => setWidth(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>400</span>
                <span className="text-brand-400 font-mono">{width}px</span>
                <span>2560</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Height</label>
              <input
                type="range"
                min={60}
                max={600}
                step={10}
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>60</span>
                <span className="text-brand-400 font-mono">{height}px</span>
                <span>600</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor === 'transparent' ? '#000000' : bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-slate-600"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono text-slate-300"
                />
                <button
                  onClick={() => setBgColor('transparent')}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    bgColor === 'transparent'
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/30 hover:bg-slate-600/50'
                  }`}
                >
                  None
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveAspectRatio}
                onChange={e => setPreserveAspectRatio(e.target.checked)}
                className="rounded accent-brand-500"
              />
              preserveAspectRatio=&ldquo;none&rdquo; (stretch to fill)
            </label>
          </div>
        </div>

        {/* Presets */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Palette className="w-4 h-4 text-brand-400" />
            Color Presets
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_PALETTES.map((palette, i) => (
              <button
                key={palette.name}
                onClick={() => handleApplyPalette(i)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 hover:bg-slate-600/50 transition-colors text-left"
              >
                <div className="flex -space-x-1.5">
                  {palette.colors.slice(0, 4).map(c => (
                    <div
                      key={c}
                      className="w-4 h-4 rounded-full border border-slate-700"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-300">{palette.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Layers management */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Layers className="w-4 h-4 text-brand-400" />
              Layers ({layers.length})
            </h3>
            <button
              onClick={handleAddLayer}
              disabled={layers.length >= 6}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {layers.map((layer, i) => (
              <div
                key={layer.id}
                className="flex items-center gap-2 p-2 rounded-md bg-slate-900/50 border border-slate-700/30"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${layer.color1}, ${layer.color2})` }}
                  />
                  <select
                    value={layer.type}
                    onChange={e => handleUpdateLayer(layer.id, { type: e.target.value as WaveType })}
                    className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-slate-300"
                  >
                    <option value="sine">Sine</option>
                    <option value="triangle">Triangle</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="custom">Multi-tone</option>
                  </select>
                  <span className="text-xs text-slate-500">#{i + 1}</span>
                </div>
                <input
                  type="color"
                  value={layer.color1}
                  onChange={e => handleUpdateLayer(layer.id, { color1: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer border border-slate-600 flex-shrink-0"
                  title="Primary color"
                />
                <button
                  onClick={() => handleRemoveLayer(layer.id)}
                  disabled={layers.length <= 1}
                  className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remove layer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer detail editor */}
      {layers.map((layer, i) => (
        <div key={layer.id} className="mb-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-4 h-4 rounded-full border border-slate-600"
              style={{ background: `linear-gradient(135deg, ${layer.color1}, ${layer.color2})` }}
            />
            <span className="text-sm font-medium text-slate-200">Layer {i + 1}</span>
            <span className="text-xs text-slate-500 capitalize">— {layer.type}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={layer.color1}
                  onChange={e => handleUpdateLayer(layer.id, { color1: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-slate-600"
                />
                <input
                  type="text"
                  value={layer.color1}
                  onChange={e => handleUpdateLayer(layer.id, { color1: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono text-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={layer.color2}
                  onChange={e => handleUpdateLayer(layer.id, { color2: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-slate-600"
                />
                <input
                  type="text"
                  value={layer.color2}
                  onChange={e => handleUpdateLayer(layer.id, { color2: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono text-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gradient</label>
              <select
                value={layer.gradientType}
                onChange={e => handleUpdateLayer(layer.id, { gradientType: e.target.value as GradientType })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300"
              >
                <option value="solid">Solid</option>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Opacity: {layer.opacity.toFixed(1)}</label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={layer.opacity}
                onChange={e => handleUpdateLayer(layer.id, { opacity: Number(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amplitude: {layer.amplitude}%</label>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={layer.amplitude}
                onChange={e => handleUpdateLayer(layer.id, { amplitude: Number(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Frequency: {layer.frequency.toFixed(1)}</label>
              <input
                type="range"
                min={0.3}
                max={6}
                step={0.1}
                value={layer.frequency}
                onChange={e => handleUpdateLayer(layer.id, { frequency: Number(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Phase Offset: {layer.offset}%</label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={layer.offset}
                onChange={e => handleUpdateLayer(layer.id, { offset: Number(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Direction</label>
              <div className="flex gap-1">
                {(['up', 'down', 'both'] as WaveDirection[]).map(d => (
                  <button
                    key={d}
                    onClick={() => handleUpdateLayer(layer.id, { direction: d })}
                    className={`flex-1 px-2 py-1 text-xs rounded border transition-colors capitalize ${
                      layer.direction === d
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                        : 'bg-slate-700/50 text-slate-400 border-slate-600/30 hover:bg-slate-600/50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Code view */}
      {showCode && (
        <div className="mt-6 rounded-xl overflow-hidden border border-slate-700/50">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/30">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5" /> SVG Code
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-600/50 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
            {svgCode}
          </pre>
        </div>
      )}

      {/* Data URI */}
      <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
        <h3 className="text-sm font-medium text-slate-200 mb-2">CSS Background Usage</h3>
        <div className="bg-slate-950 rounded p-3 text-xs font-mono text-slate-400 break-all">
          background-image: url(&quot;{dataUri}&quot;);
        </div>
        <p className="text-xs text-slate-500 mt-2">Use this as a CSS background-image for section dividers, or use the SVG inline.</p>
      </div>
    </ToolLayout>
  );
}
