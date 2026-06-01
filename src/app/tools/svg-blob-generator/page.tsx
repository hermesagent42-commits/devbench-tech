'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Download,
  RefreshCw,
  Shuffle,
  Palette,
  Code2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BlobConfig {
  complexity: number;
  randomness: number;
  smoothness: number;
  viewBox: number;
}

function generateBlob(config: BlobConfig, seed: number): string {
  const rand = mulberry32(seed);
  const { complexity, randomness, smoothness, viewBox } = config;
  const center = viewBox / 2;
  const baseRadius = viewBox * 0.42;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < complexity; i++) {
    const angle = (i / complexity) * Math.PI * 2 - Math.PI / 2;
    const noise = 1 - randomness * 0.6 + rand() * randomness * 0.6;
    const r = baseRadius * noise;
    points.push({
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    });
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < complexity; i++) {
    const p0 = points[(i - 1 + complexity) % complexity];
    const p1 = points[i];
    const p2 = points[(i + 1) % complexity];
    const p3 = points[(i + 2) % complexity];

    const tx1 = (p2.x - p0.x) * 0.5;
    const ty1 = (p2.y - p0.y) * 0.5;
    const tx2 = (p3.x - p1.x) * 0.5;
    const ty2 = (p3.y - p1.y) * 0.5;

    const cp1x = p1.x + tx1 * smoothness;
    const cp1y = p1.y + ty1 * smoothness;
    const cp2x = p2.x - tx2 * smoothness;
    const cp2y = p2.y - ty2 * smoothness;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  d += ' Z';
  return d;
}

type GradientType = 'solid' | 'linear' | 'radial';

interface ColorConfig {
  type: GradientType;
  color1: string;
  color2: string;
  angle: number;
}

function buildSvg(d: string, color: ColorConfig, viewBox: number): string {
  let defs = '';
  let fill = color.color1;

  if (color.type === 'linear') {
    const rad = (color.angle - 90) * (Math.PI / 180);
    const x1 = (50 - Math.cos(rad) * 50).toFixed(1);
    const y1 = (50 - Math.sin(rad) * 50).toFixed(1);
    const x2 = (50 + Math.cos(rad) * 50).toFixed(1);
    const y2 = (50 + Math.sin(rad) * 50).toFixed(1);
    defs = `<linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${color.color1}"/><stop offset="100%" stop-color="${color.color2}"/></linearGradient>`;
    fill = 'url(#g)';
  } else if (color.type === 'radial') {
    defs = `<radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${color.color1}"/><stop offset="100%" stop-color="${color.color2}"/></radialGradient>`;
    fill = 'url(#g)';
  }

  const defsBlock = defs ? `<defs>${defs}</defs>\n  ` : '';
  return `<svg viewBox="0 0 ${viewBox} ${viewBox}" xmlns="http://www.w3.org/2000/svg">\n  ${defsBlock}<path d="${d}" fill="${fill}" />\n</svg>`;
}

const PRESETS: {
  name: string;
  complexity: number;
  randomness: number;
  smoothness: number;
  type: GradientType;
  c1: string;
  c2: string;
  angle: number;
}[] = [
  { name: 'Soft Cloud', complexity: 8, randomness: 0.3, smoothness: 0.7, type: 'linear', c1: '#6366f1', c2: '#a855f7', angle: 135 },
  { name: 'Jagged Rock', complexity: 14, randomness: 0.6, smoothness: 0.4, type: 'linear', c1: '#f97316', c2: '#ef4444', angle: 45 },
  { name: 'Smooth Pebble', complexity: 6, randomness: 0.15, smoothness: 0.95, type: 'radial', c1: '#22d3ee', c2: '#3b82f6', angle: 0 },
  { name: 'Organic Blob', complexity: 10, randomness: 0.4, smoothness: 0.65, type: 'linear', c1: '#10b981', c2: '#06b6d4', angle: 90 },
  { name: 'Spiky Star', complexity: 12, randomness: 0.75, smoothness: 0.2, type: 'linear', c1: '#fbbf24', c2: '#f59e0b', angle: 180 },
  { name: 'Gentle Wave', complexity: 7, randomness: 0.35, smoothness: 0.8, type: 'solid', c1: '#8b5cf6', c2: '#000000', angle: 0 },
];

export default function SvgBlobGeneratorPage() {
  const [complexity, setComplexity] = useState(8);
  const [randomness, setRandomness] = useState(0.4);
  const [smoothness, setSmoothness] = useState(0.65);
  const [viewBox] = useState(100);
  const [seed, setSeed] = useState(Math.floor(Math.random() * 100000));
  const [colorType, setColorType] = useState<GradientType>('linear');
  const [color1, setColor1] = useState('#6366f1');
  const [color2, setColor2] = useState('#a855f7');
  const [angle, setAngle] = useState(135);
  const [copied, setCopied] = useState(false);
  const svgPreviewRef = useRef<HTMLDivElement>(null);

  const colorConfig: ColorConfig = useMemo(
    () => ({ type: colorType, color1, color2, angle }),
    [colorType, color1, color2, angle],
  );
  const config: BlobConfig = useMemo(
    () => ({ complexity, randomness, smoothness, viewBox }),
    [complexity, randomness, smoothness, viewBox],
  );

  const pathData = useMemo(() => generateBlob(config, seed), [config, seed]);
  const svgCode = useMemo(() => buildSvg(pathData, colorConfig, viewBox), [pathData, colorConfig, viewBox]);

  const previewDefs = useMemo(() => {
    if (colorType === 'linear') {
      const rad = (angle - 90) * (Math.PI / 180);
      const x1 = (50 - Math.cos(rad) * 50).toFixed(1);
      const y1 = (50 - Math.sin(rad) * 50).toFixed(1);
      const x2 = (50 + Math.cos(rad) * 50).toFixed(1);
      const y2 = (50 + Math.sin(rad) * 50).toFixed(1);
      return `<linearGradient id="bg" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient>`;
    }
    if (colorType === 'radial') {
      return `<radialGradient id="bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></radialGradient>`;
    }
    return null;
  }, [colorType, color1, color2, angle]);

  const previewFill = colorType === 'solid' ? color1 : 'url(#bg)';

  const randomize = useCallback(() => {
    setSeed(Math.floor(Math.random() * 100000));
    setComplexity(4 + Math.floor(Math.random() * 16));
    setRandomness(Math.round((15 + Math.random() * 70)) / 100);
    setSmoothness(Math.round((20 + Math.random() * 75)) / 100);
  }, []);

  const applyPreset = useCallback((p: typeof PRESETS[number]) => {
    setComplexity(p.complexity);
    setRandomness(p.randomness);
    setSmoothness(p.smoothness);
    setColorType(p.type);
    setColor1(p.c1);
    setColor2(p.c2);
    setAngle(p.angle);
    setSeed(Math.floor(Math.random() * 100000));
  }, []);

  const newSeed = useCallback(() => setSeed(Math.floor(Math.random() * 100000)), []);

  const copySvg = useCallback(() => {
    navigator.clipboard.writeText(svgCode).then(
      () => {
        setCopied(true);
        toast.success('SVG code copied!');
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error('Failed to copy'),
    );
  }, [svgCode]);

  const downloadSvg = useCallback(() => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blob.svg';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SVG downloaded!');
  }, [svgCode]);

  const downloadPng = useCallback(() => {
    const svgEl = svgPreviewRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'blob.png';
      a.click();
      toast.success('PNG downloaded!');
    };
    img.src = url;
  }, []);

  return (
    <ToolLayout
      title="SVG Blob Generator"
      description="Generate organic blob shapes as SVG — perfect for hero sections, backgrounds, and design accents. Client-side only."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-left px-3 py-2 rounded-lg border border-slate-700 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all"
                >
                  <div className="text-xs text-slate-200 font-medium">{p.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.c1 }} />
                    {p.type !== 'solid' && (
                      <div className="w-3 h-3 rounded-full" style={{ background: p.c2 }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Shape */}
          <div className="card space-y-5">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-brand-400" />
              Shape
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Complexity — {complexity} points
              </label>
              <input
                type="range"
                min={4}
                max={20}
                step={1}
                value={complexity}
                onChange={(e) => setComplexity(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Randomness — {Math.round(randomness * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(randomness * 100)}
                onChange={(e) => setRandomness(Number(e.target.value) / 100)}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Smoothness — {Math.round(smoothness * 100)}%
              </label>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={Math.round(smoothness * 100)}
                onChange={(e) => setSmoothness(Number(e.target.value) / 100)}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Seed — {seed}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className="input-field flex-1 font-mono text-sm"
                />
                <button onClick={newSeed} className="btn-secondary px-3" title="Random seed">
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="card space-y-5">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-brand-400" />
              Color
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-2">Fill type</label>
              <div className="flex gap-1 p-1 rounded-lg bg-surface-lighter inline-flex">
                {(['solid', 'linear', 'radial'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setColorType(t)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                      colorType === t
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">
                  {colorType === 'solid' ? 'Color' : 'Color 1'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="w-10 h-9 rounded-md cursor-pointer border border-slate-700 bg-surface"
                  />
                  <input
                    type="text"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="input-field flex-1 font-mono text-xs h-9"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              {colorType !== 'solid' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Color 2</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color2}
                      onChange={(e) => setColor2(e.target.value)}
                      className="w-10 h-9 rounded-md cursor-pointer border border-slate-700 bg-surface"
                    />
                    <input
                      type="text"
                      value={color2}
                      onChange={(e) => setColor2(e.target.value)}
                      className="input-field flex-1 font-mono text-xs h-9"
                      placeholder="#a855f7"
                    />
                  </div>
                </div>
              )}
            </div>
            {colorType === 'linear' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">
                  Angle — {angle}°
                </label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={randomize}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Randomize
            </button>
            <button
              onClick={newSeed}
              className="btn-secondary flex items-center justify-center gap-2 text-sm px-4"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Preview + Code */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card flex flex-col items-center">
            <div
              ref={svgPreviewRef}
              className="w-full max-w-[320px] aspect-square flex items-center justify-center p-4"
            >
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full drop-shadow-xl"
                xmlns="http://www.w3.org/2000/svg"
              >
                {previewDefs && (
                  <defs dangerouslySetInnerHTML={{ __html: previewDefs }} />
                )}
                <path d={pathData} fill={previewFill} />
              </svg>
            </div>
            <div className="flex items-center gap-3 mt-4 pb-2">
              <button
                onClick={downloadSvg}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> SVG
              </button>
              <button
                onClick={downloadPng}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> PNG
              </button>
              <button
                onClick={copySvg}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Copy SVG'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-400" /> SVG Code
              </h3>
              <button
                onClick={copySvg}
                className="text-slate-400 hover:text-brand-400 transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <pre className="bg-[#0c1016] rounded-lg p-4 overflow-auto text-xs font-mono text-slate-300 border border-slate-700/50 max-h-64">
              <code>{svgCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
