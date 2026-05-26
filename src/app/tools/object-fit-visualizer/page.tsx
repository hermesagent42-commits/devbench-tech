'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Copy, RotateCcw, Code, Ruler, Columns, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ObjectFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

interface Position {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

interface Preset {
  label: string;
  icon: string;
  position: Position;
}

// ── Constants ──────────────────────────────────────────────────────────────

const FIT_OPTIONS: { value: ObjectFit; label: string; description: string }[] = [
  { value: 'fill', label: 'fill', description: 'Stretches to fill. Distorts aspect ratio.' },
  { value: 'contain', label: 'contain', description: 'Scales to fit inside. Always fully visible. Letterboxing if needed.' },
  { value: 'cover', label: 'cover', description: 'Scales to cover completely. May clip edges.' },
  { value: 'none', label: 'none', description: 'No scaling. Shows at intrinsic size. May overflow or crop.' },
  { value: 'scale-down', label: 'scale-down', description: 'Chooses none or contain — whichever is smaller.' },
];

const POSITION_PRESETS: Preset[] = [
  { label: 'Top Left', icon: '↖', position: { x: 0, y: 0 } },
  { label: 'Top Center', icon: '↑', position: { x: 50, y: 0 } },
  { label: 'Top Right', icon: '↗', position: { x: 100, y: 0 } },
  { label: 'Center Left', icon: '←', position: { x: 0, y: 50 } },
  { label: 'Center', icon: '⊙', position: { x: 50, y: 50 } },
  { label: 'Center Right', icon: '→', position: { x: 100, y: 50 } },
  { label: 'Bottom Left', icon: '↙', position: { x: 0, y: 100 } },
  { label: 'Bottom Center', icon: '↓', position: { x: 50, y: 100 } },
  { label: 'Bottom Right', icon: '↘', position: { x: 100, y: 100 } },
];

const SAMPLE_IMAGES = [
  { label: 'Wide Landscape (16:9)', url: 'https://picsum.photos/seed/landscape/1600/900' },
  { label: 'Portrait (2:3)', url: 'https://picsum.photos/seed/portrait/600/900' },
  { label: 'Square (1:1)', url: 'https://picsum.photos/seed/square/800/800' },
  { label: 'Ultrawide (21:9)', url: 'https://picsum.photos/seed/ultrawide/2100/900' },
];

const CONTAINER_PRESETS = [
  { label: 'Square', width: 300, height: 300 },
  { label: 'Landscape', width: 400, height: 250 },
  { label: 'Portrait', width: 220, height: 340 },
  { label: 'Wide', width: 450, height: 200 },
  { label: 'Tall', width: 180, height: 360 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function generateCSS(
  fit: ObjectFit,
  position: Position,
  containerWidth: number,
  containerHeight: number,
): string {
  const lines: string[] = [];
  lines.push('.image-container {');
  lines.push(`  width: ${containerWidth}px;`);
  lines.push(`  height: ${containerHeight}px;`);
  lines.push('  overflow: hidden;');
  if (fit === 'none') lines.push('  /* object-fit: none means image displays at intrinsic size. */');
  lines.push('}');
  lines.push('');
  lines.push('.image-container img {');
  lines.push(`  object-fit: ${fit};`);
  if (position.x !== 50 || position.y !== 50) {
    lines.push(`  object-position: ${position.x}% ${position.y}%;`);
  }
  lines.push('  width: 100%;');
  lines.push('  height: 100%;');
  lines.push('}');
  return lines.join('\n');
}

// ── Position Grid Control ──────────────────────────────────────────────────

function PositionGrid({
  position,
  onChange,
  fit,
}: {
  position: Position;
  onChange: (p: Position) => void;
  fit: ObjectFit;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
    onChange({ x, y });
  }, [onChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      updatePosition(e.clientX, e.clientY);
    },
    [updatePosition],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX, e.clientY);
    };
    const handleUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [updatePosition]);

  const disabled = fit === 'fill';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Object Position</span>
        <span className="text-[10px] font-mono text-brand-400">
          {position.x}% {position.y}%
        </span>
      </div>
      <div
        ref={gridRef}
        onMouseDown={disabled ? undefined : handleMouseDown}
        className={`relative w-full aspect-square rounded-lg border border-slate-600 bg-slate-900/80 overflow-hidden ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-crosshair'
        }`}
      >
        {/* Grid lines */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-0 right-0 border-t border-slate-700/50" />
          <div className="absolute top-2/3 left-0 right-0 border-t border-slate-700/50" />
          <div className="absolute left-1/3 top-0 bottom-0 border-l border-slate-700/50" />
          <div className="absolute left-2/3 top-0 bottom-0 border-l border-slate-700/50" />
        </div>
        {/* Crosshair at current position */}
        {!disabled && (
          <>
            <div
              className="absolute border-l border-brand-400/60"
              style={{ left: `${position.x}%`, top: 0, bottom: 0 }}
            />
            <div
              className="absolute border-t border-brand-400/60"
              style={{ top: `${position.y}%`, left: 0, right: 0 }}
            />
            <div
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-brand-500/30 shadow-lg shadow-brand-500/20"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            />
          </>
        )}
      </div>
      {disabled && (
        <p className="text-[10px] text-slate-500">
          object-position has no effect when object-fit is &ldquo;fill&rdquo;
        </p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ObjectFitVisualizerPage() {
  const [imgUrl, setImgUrl] = useState<string>('');
  const [activeURL, setActiveURL] = useState<string>('');
  const [fit, setFit] = useState<ObjectFit>('cover');
  const [position, setPosition] = useState<Position>({ x: 50, y: 50 });
  const [containerW, setContainerW] = useState(300);
  const [containerH, setContainerH] = useState(300);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [showComparison, setShowComparison] = useState(false);
  const [compareFit, setCompareFit] = useState<ObjectFit>('contain');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load default image
  useEffect(() => {
    setImgUrl(SAMPLE_IMAGES[0].url);
    setActiveURL(SAMPLE_IMAGES[0].url);
  }, []);

  const loadSample = useCallback((url: string) => {
    setImgUrl(url);
    setActiveURL(url);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedFile(url);
    setImgUrl(url);
    setActiveURL(url);
  }, []);

  const clearUpload = useCallback(() => {
    if (uploadedFile) {
      URL.revokeObjectURL(uploadedFile);
      setUploadedFile(null);
    }
    loadSample(SAMPLE_IMAGES[0].url);
  }, [uploadedFile, loadSample]);

  const handleCopy = useCallback(async () => {
    const css = generateCSS(fit, position, containerW, containerH);
    await navigator.clipboard.writeText(css);
    toast.success('CSS copied to clipboard');
  }, [fit, position, containerW, containerH]);

  const reset = useCallback(() => {
    setFit('cover');
    setPosition({ x: 50, y: 50 });
    setContainerW(300);
    setContainerH(300);
    setViewMode('visual');
    setShowComparison(false);
    if (uploadedFile) {
      URL.revokeObjectURL(uploadedFile);
      setUploadedFile(null);
    }
    loadSample(SAMPLE_IMAGES[0].url);
  }, [uploadedFile, loadSample]);

  const css = generateCSS(fit, position, containerW, containerH);

  return (
    <ToolLayout
      title="CSS object-fit Visualizer"
      description="Master object-fit and object-position — the CSS properties every dev uses but few truly understand. Upload an image, try all 5 fit modes, drag the position, and get production-ready CSS."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Image source */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Image Source</h3>
            <div className="space-y-2">
              {SAMPLE_IMAGES.map((s) => (
                <button
                  key={s.url}
                  onClick={() => loadSample(s.url)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    activeURL === s.url
                      ? 'border-brand-500/60 bg-brand-500/10 text-slate-200'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg border-2 border-dashed border-slate-700 hover:border-brand-500/50 bg-slate-800/30 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">Upload your own image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedFile && (
                <button
                  onClick={clearUpload}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-slate-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear uploaded image
                </button>
              )}
            </div>
          </div>

          {/* Object Fit */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">object-fit</h3>
            <div className="space-y-1">
              {FIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFit(opt.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    fit === opt.value
                      ? 'border-brand-500/60 bg-brand-500/10 text-slate-200'
                      : 'border-slate-700/50 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-semibold text-brand-400">{opt.value}</code>
                    <span className="text-[10px] text-slate-500">{opt.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Container Dimensions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Container Size</h3>
            <div className="flex gap-1 mb-2">
              {CONTAINER_PRESETS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => { setContainerW(c.width); setContainerH(c.height); }}
                  className={`flex-1 py-1 text-[10px] rounded border transition-colors ${
                    containerW === c.width && containerH === c.height
                      ? 'border-brand-500/60 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {c.label}
                  <br />
                  <span className="opacity-60">{c.width}×{c.height}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Width (px)</label>
                <input
                  type="number"
                  min={40}
                  max={600}
                  value={containerW}
                  onChange={(e) => setContainerW(Math.max(40, Math.min(600, Number(e.target.value) || 40)))}
                  className="w-full px-2 py-1.5 text-xs font-mono bg-slate-800 border border-slate-600 rounded text-slate-200 text-center focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Height (px)</label>
                <input
                  type="number"
                  min={40}
                  max={600}
                  value={containerH}
                  onChange={(e) => setContainerH(Math.max(40, Math.min(600, Number(e.target.value) || 40)))}
                  className="w-full px-2 py-1.5 text-xs font-mono bg-slate-800 border border-slate-600 rounded text-slate-200 text-center focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Object Position */}
          <PositionGrid position={position} onChange={setPosition} fit={fit} />

          {/* Position Presets */}
          {fit !== 'fill' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Position Presets</h3>
              <div className="grid grid-cols-3 gap-1">
                {POSITION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setPosition(preset.position)}
                    className={`py-1.5 text-[10px] rounded border transition-colors ${
                      position.x === preset.position.x && position.y === preset.position.y
                        ? 'border-brand-500/60 bg-brand-500/10 text-brand-400'
                        : 'border-slate-700/50 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    <span className="mr-1">{preset.icon}</span>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Preview + Code */}
        <div className="lg:col-span-2 space-y-4">
          {/* View toggle + comparison toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'visual' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Visual
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'code' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                CSS Output
              </button>
            </div>

            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showComparison
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                  : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Comparison Mode
            </button>
          </div>

          {/* Visual Preview */}
          {viewMode === 'visual' && (
            <div
              className={`grid ${showComparison ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}
            >
              {/* Primary preview */}
              <div className="space-y-2">
                {showComparison && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-slate-300 font-medium">object-fit: {fit}</span>
                    {fit !== 'fill' && (
                      <span className="text-slate-500">· position: {position.x}% {position.y}%</span>
                    )}
                  </div>
                )}
                <div
                  className="rounded-xl border-2 border-slate-600 overflow-hidden bg-slate-900 mx-auto relative group"
                  style={{ width: containerW, height: containerH }}
                >
                  {/* Grid background to show the container */}
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #64748b 1px, transparent 1px),
                        linear-gradient(-45deg, #64748b 1px, transparent 1px)
                      `,
                      backgroundSize: '16px 16px',
                    }}
                  />
                  {imgUrl && (
                    <img
                      src={imgUrl}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: fit,
                        objectPosition: `${position.x}% ${position.y}%`,
                      }}
                    />
                  )}
                </div>
                <p className="text-center text-[10px] text-slate-500">
                  Container: {containerW}×{containerH}px · object-fit: {fit}
                  {fit !== 'fill' && ` · position: ${position.x}% ${position.y}%`}
                </p>
              </div>

              {/* Comparison preview */}
              {showComparison && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <select
                      value={compareFit}
                      onChange={(e) => setCompareFit(e.target.value as ObjectFit)}
                      className="py-0.5 px-1.5 text-xs rounded border border-slate-600 bg-slate-800 text-slate-300"
                    >
                      {FIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.value}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-500">· position: {position.x}% {position.y}%</span>
                  </div>
                  <div
                    className="rounded-xl border-2 border-amber-500/40 overflow-hidden bg-slate-900 mx-auto relative group"
                    style={{ width: containerW, height: containerH }}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{
                        backgroundImage: `
                          linear-gradient(45deg, #64748b 1px, transparent 1px),
                          linear-gradient(-45deg, #64748b 1px, transparent 1px)
                        `,
                        backgroundSize: '16px 16px',
                      }}
                    />
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: compareFit,
                          objectPosition: `${position.x}% ${position.y}%`,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-center text-[10px] text-amber-400">
                    Container: {containerW}×{containerH}px · object-fit: {compareFit}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Code view */}
          {viewMode === 'code' && (
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700">
                <span className="text-xs text-slate-400">Generated CSS</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 text-sm font-mono text-slate-300 overflow-x-auto bg-slate-950/80">
                <code>{css}</code>
              </pre>
            </div>
          )}

          {/* Info box */}
          <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-brand-400" />
              How object-fit works
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
              {FIT_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className="p-2 rounded border border-slate-700/50 bg-slate-900/50"
                >
                  <code className="font-mono font-semibold text-brand-400">{opt.value}</code>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">{opt.description}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              <strong>object-position</strong> sets the focus point when parts of the image are cropped (cover, none) or when there&apos;s extra space (contain, scale-down). It has no effect with <code className="text-brand-400">object-fit: fill</code>.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
