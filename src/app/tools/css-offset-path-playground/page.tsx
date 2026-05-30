'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, RotateCcw, Info, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

interface PathPreset {
  name: string;
  description: string;
  svgPath: string;
  cssOffsetPath: string;
  isCustom?: boolean;
}

interface Position {
  x: number;
  y: number;
  angle: number;
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: PathPreset[] = [
  {
    name: 'Circle',
    description: 'Perfect circular motion',
    svgPath: 'M 250,70 A 130,130 0 0,1 250,330 A 130,130 0 0,1 250,70',
    cssOffsetPath: 'circle(130px at 50% 50%)',
  },
  {
    name: 'Ellipse',
    description: 'Oval-shaped path with variable speed',
    svgPath: 'M 250,80 A 180,100 0 0,1 430,200 A 180,100 0 0,1 250,320 A 180,100 0 0,1 70,200 A 180,100 0 0,1 250,80',
    cssOffsetPath: 'ellipse(180px 100px at 50% 50%)',
  },
  {
    name: 'Rounded Rect',
    description: 'Stadium-shaped loop with straight edges',
    svgPath: 'M 100,70 L 400,70 A 30,30 0 0,1 430,100 L 430,300 A 30,30 0 0,1 400,330 L 100,330 A 30,30 0 0,1 70,300 L 70,100 A 30,30 0 0,1 100,70 Z',
    cssOffsetPath: "path('M 100,70 L 400,70 A 30,30 0 0,1 430,100 L 430,300 A 30,30 0 0,1 400,330 L 100,330 A 30,30 0 0,1 70,300 L 70,100 A 30,30 0 0,1 100,70 Z')",
  },
  {
    name: 'Sine Wave',
    description: 'Smooth oscillating wave pattern',
    svgPath: 'M 30,200 C 80,90 140,310 200,200 C 260,90 320,310 380,200 C 410,140 450,260 470,200',
    cssOffsetPath: "path('M 30,200 C 80,90 140,310 200,200 C 260,90 320,310 380,200 C 410,140 450,260 470,200')",
  },
  {
    name: 'Zigzag',
    description: 'Sharp back-and-forth bouncing motion',
    svgPath: 'M 50,60 L 150,340 L 250,60 L 350,340 L 450,60',
    cssOffsetPath: "path('M 50,60 L 150,340 L 250,60 L 350,340 L 450,60')",
  },
  {
    name: 'Heart',
    description: 'Romantic heart-shaped loop',
    svgPath: 'M 250,360 C 250,360 110,280 110,200 C 110,140 150,110 190,110 C 210,110 230,125 250,150 C 270,125 290,110 310,110 C 350,110 390,140 390,200 C 390,280 250,360 250,360 Z',
    cssOffsetPath: "path('M 250,360 C 250,360 110,280 110,200 C 110,140 150,110 190,110 C 210,110 230,125 250,150 C 270,125 290,110 310,110 C 350,110 390,140 390,200 C 390,280 250,360 250,360 Z')",
  },
  {
    name: 'Star',
    description: 'Five-pointed star path with sharp turns',
    svgPath: 'M 250,60 L 285,151 L 383,157 L 307,219 L 332,313 L 250,260 L 168,313 L 193,219 L 117,157 L 215,151 Z',
    cssOffsetPath: "path('M 250,60 L 285,151 L 383,157 L 307,219 L 332,313 L 250,260 L 168,313 L 193,219 L 117,157 L 215,151 Z')",
  },
  {
    name: 'Infinity',
    description: 'Classic lemniscate figure-8 loop',
    svgPath: 'M 250,200 C 250,100 140,100 140,200 C 140,300 250,300 250,200 C 250,100 360,100 360,200 C 360,300 250,300 250,200',
    cssOffsetPath: "path('M 250,200 C 250,100 140,100 140,200 C 140,300 250,300 250,200 C 250,100 360,100 360,200 C 360,300 250,300 250,200')",
  },
];

const ROTATE_OPTIONS = [
  { value: 'auto', label: 'auto — Follow path direction' },
  { value: 'reverse', label: 'reverse — Face opposite direction' },
  { value: '0', label: '0° — No rotation (always upright)' },
  { value: '45', label: '45°' },
  { value: '90', label: '90°' },
  { value: '180', label: '180°' },
  { value: '270', label: '270°' },
  { value: '-45', label: '-45°' },
];

const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];

// ── Component ───────────────────────────────────────────────────────────────

export default function CSSOffsetPathPlayground() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [offsetDistance, setOffsetDistance] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(3);
  const [offsetRotate, setOffsetRotate] = useState('auto');
  const [customPath, setCustomPath] = useState('');
  const [customPresets, setCustomPresets] = useState<PathPreset[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 250, y: 200, angle: 0 });

  const pathRef = useRef<SVGPathElement>(null);
  const animFrameRef = useRef<number>(0);

  const allPresets = useMemo(() => [...PRESETS, ...customPresets], [customPresets]);
  const currentPreset = allPresets[selectedPreset] || PRESETS[0];

  // ── Position computation ──────────────────────────────────────────────────

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    const totalLen = pathEl.getTotalLength();
    if (totalLen === 0 || isNaN(totalLen)) {
      setPosition({ x: 250, y: 200, angle: 0 });
      return;
    }
    const dist = totalLen * (offsetDistance / 100);
    const pt = pathEl.getPointAtLength(Math.min(dist, totalLen));

    // Compute tangent angle from two nearby points
    const delta = totalLen * 0.002;
    const ptAhead = pathEl.getPointAtLength(Math.min(dist + delta, totalLen));
    const ptBehind = pathEl.getPointAtLength(Math.max(dist - delta, 0));
    const angle =
      Math.atan2(ptAhead.y - ptBehind.y, ptAhead.x - ptBehind.x) * (180 / Math.PI);

    setPosition({ x: pt.x, y: pt.y, angle });
  }, [selectedPreset, offsetDistance, customPresets]);

  // ── Animation loop ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying) return;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = (elapsed % duration) / duration;
      setOffsetDistance(progress * 100);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, duration]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAddCustom = useCallback(() => {
    const trimmed = customPath.trim();
    if (!trimmed) {
      toast.error('Please enter valid SVG path data');
      return;
    }
    const idx = customPresets.length;
    const newPreset: PathPreset = {
      name: `Custom ${idx + 1}`,
      description: 'Your custom path',
      svgPath: trimmed,
      cssOffsetPath: `path('${trimmed.replace(/'/g, "\\'")}')`,
      isCustom: true,
    };
    setCustomPresets((prev) => [...prev, newPreset]);
    setSelectedPreset(PRESETS.length + idx);
    setCustomPath('');
    setShowCustom(false);
    setIsPlaying(false);
    toast.success('Custom path added!');
  }, [customPath, customPresets.length]);

  const handleRemoveCustom = useCallback(
    (idx: number) => {
      setCustomPresets((prev) => {
        const next = prev.filter((_, i) => i !== idx - PRESETS.length);
        return next;
      });
      setSelectedPreset(0);
      toast.success('Custom path removed');
    },
    []
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setOffsetDistance(0);
  }, []);

  // ── Rotation ──────────────────────────────────────────────────────────────

  const getRotateTransform = useCallback(() => {
    switch (offsetRotate) {
      case 'auto':
        return position.angle;
      case 'reverse':
        return position.angle + 180;
      default:
        return parseFloat(offsetRotate);
    }
  }, [offsetRotate, position.angle]);

  // ── CSS Output ────────────────────────────────────────────────────────────

  const generatedCSS = useMemo(() => {
    const lines: string[] = [];
    lines.push('.motion-element {');
    lines.push(`  offset-path: ${currentPreset.cssOffsetPath};`);
    lines.push(`  offset-distance: ${Math.round(offsetDistance)}%;`);

    if (offsetRotate === 'auto' || offsetRotate === 'reverse') {
      lines.push(`  offset-rotate: ${offsetRotate};`);
    } else {
      lines.push(`  offset-rotate: ${offsetRotate}deg;`);
    }
    lines.push('}');

    if (isPlaying) {
      lines.push('');
      lines.push('/* Continuous animation */');
      lines.push('@keyframes move-along-path {');
      lines.push('  from { offset-distance: 0%; }');
      lines.push('  to   { offset-distance: 100%; }');
      lines.push('}');
      lines.push('');
      lines.push('.motion-element.animated {');
      lines.push(`  animation: move-along-path ${duration}s linear infinite;`);
      lines.push('}');
    }

    return lines.join('\n');
  }, [currentPreset, offsetDistance, offsetRotate, isPlaying, duration]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [generatedCSS]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Offset Path Playground"
      description="Visually build motion paths using the CSS offset-path property — animate elements along circles, ellipses, sine waves, hearts, stars, and custom SVG paths. Baseline 2026 across all major browsers."
      controls={
        <span className="text-xs text-slate-400">
          Path:{' '}
          <span className="text-brand-400 font-mono">
            {currentPreset.name}
          </span>
          <span className="mx-2 text-slate-600">|</span>
          Distance:{' '}
          <span className="text-amber-400 font-mono">
            {Math.round(offsetDistance)}%
          </span>
        </span>
      }
    >
      {/* ── Preset pills ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {allPresets.map((preset, i) => (
          <button
            key={`${preset.name}-${i}`}
            onClick={() => {
              setSelectedPreset(i);
              setIsPlaying(false);
            }}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              i === selectedPreset
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40 shadow-sm shadow-brand-500/10'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            {preset.name}
            {preset.isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCustom(i);
                }}
                className="ml-0.5 p-0.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Remove custom path"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}

        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border border-dashed transition-colors ${
            showCustom
              ? 'bg-brand-500/10 text-brand-400 border-brand-500/40'
              : 'bg-slate-800 text-slate-500 border-slate-600 hover:border-slate-500 hover:text-slate-400'
          }`}
        >
          + Custom
        </button>
      </div>

      {/* ── Custom path input ─────────────────────────────────────────────── */}
      {showCustom && (
        <div className="mb-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
          <label className="block text-xs font-semibold text-slate-400 mb-2">
            Custom SVG Path Data
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              placeholder="M 250,70 A 130,130 0 0,1 250,330 ..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-brand-500/50"
            />
            <button
              onClick={handleAddCustom}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Add Path
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Paste any valid SVG path data. ViewBox is 500×400 — keep coordinates
            within that range for best results.
          </p>
        </div>
      )}

      {/* ── SVG Canvas ────────────────────────────────────────────────────── */}
      <div
        className="relative mb-6 bg-slate-950 rounded-xl border border-slate-700/40 overflow-hidden shadow-inner"
        style={{ aspectRatio: '5/4' }}
      >
        <svg viewBox="0 0 500 400" className="w-full h-full">
          {/* Subtle grid background */}
          <defs>
            <pattern
              id="offsetGrid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.5"
              />
            </pattern>
            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="500" height="400" fill="url(#offsetGrid)" />

          {/* Path glow */}
          <path
            d={currentPreset.svgPath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="10"
            strokeOpacity="0.1"
          />

          {/* Path trace */}
          <path
            ref={pathRef}
            d={currentPreset.svgPath}
            fill="none"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeDasharray="10 5"
            strokeLinecap="round"
          />

          {/* Moving indicator */}
          <g
            transform={`translate(${position.x},${position.y}) rotate(${getRotateTransform()})`}
            filter="url(#glow)"
          >
            {/* Outer glow ring */}
            <circle cx="0" cy="0" r="16" fill="#f59e0b" opacity="0.15" />
            <circle cx="0" cy="0" r="9" fill="#f59e0b" opacity="0.3" />
            {/* Core dot */}
            <circle cx="0" cy="0" r="5" fill="#fbbf24" />
            <circle cx="0" cy="0" r="2.5" fill="#fef3c7" />
            {/* Direction pointer */}
            <line
              x1="0"
              y1="0"
              x2="11"
              y2="0"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <polygon
              points="11,-3.5 11,3.5 16,0"
              fill="#fbbf24"
            />
          </g>

          {/* Center registration mark */}
          <circle
            cx="250"
            cy="200"
            r="3"
            fill="none"
            stroke="#475569"
            strokeWidth="1"
          />
        </svg>

        {/* Overlay label */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/50 text-xs text-slate-500 font-mono">
          SVG viewBox 500×400
        </div>
      </div>

      {/* ── Controls grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* offset-distance slider */}
        <div className="md:col-span-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              offset-distance
            </label>
            <span className="text-sm font-mono font-bold text-amber-400">
              {Math.round(offsetDistance)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={offsetDistance}
            onChange={(e) => setOffsetDistance(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-slate-700 cursor-pointer accent-brand-500
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-brand-500/30
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-brand-300"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Play / Pause / Reset */}
        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 shadow-sm shadow-amber-500/10'
                : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30 shadow-sm shadow-brand-500/10'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Play
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-700 hover:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Duration */}
        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}s
              </option>
            ))}
          </select>
        </div>

        {/* offset-rotate */}
        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            offset-rotate
          </label>
          <select
            value={offsetRotate}
            onChange={(e) => setOffsetRotate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            {ROTATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Live CSS preview ──────────────────────────────────────────────── */}
      <div className="mb-6 p-5 bg-slate-800/40 rounded-xl border border-slate-700/40">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Live CSS Preview
          </h3>
          <span className="text-xs text-slate-500">
            Real browser offset-path rendering — zero JS positioning
          </span>
        </div>
        <div className="relative h-52 bg-slate-950 rounded-lg border border-slate-700/30 overflow-hidden">
          {/* The element positioned purely by CSS offset-path */}
          <div
            className="absolute w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/40 flex items-center justify-center"
            style={
              {
                offsetPath: currentPreset.cssOffsetPath,
                offsetDistance: `${offsetDistance}%`,
                offsetRotate:
                  offsetRotate === 'auto'
                    ? 'auto'
                    : offsetRotate === 'reverse'
                      ? 'reverse'
                      : `${offsetRotate}deg`,
              } as React.CSSProperties
            }
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <polygon points="6,1 10,11 2,4 10,4 2,11" fill="white" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Info banner ────────────────────────────────────────────────────── */}
      <div className="mb-6 p-4 bg-brand-500/5 rounded-xl border border-brand-500/15 flex items-start gap-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">CSS offset-path</strong> (formerly
            motion-path) lets you position and animate elements along any geometric
            path — no JavaScript required. It accepts{' '}
            <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs">
              circle()
            </code>
            ,{' '}
            <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs">
              ellipse()
            </code>
            ,{' '}
            <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs">
              ray()
            </code>
            ,{' '}
            <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs">
              path()
            </code>
            , and{' '}
            <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs">
              url()
            </code>
            . Baseline across all major browsers since early 2026. Pair with
            @keyframes for scroll-free motion animations, or with scroll-driven
            animations for immersive scroll experiences.
          </p>
        </div>
      </div>

      {/* ── Generated CSS ─────────────────────────────────────────────────── */}
      <div className="p-5 bg-slate-900 rounded-xl border border-slate-700/40">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Generated CSS
          </h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:border-slate-600 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
        </div>
        <pre className="text-sm text-slate-300 font-mono bg-slate-950 p-4 rounded-lg overflow-x-auto leading-relaxed">
          <code>{generatedCSS}</code>
        </pre>
      </div>
    </ToolLayout>
  );
}
