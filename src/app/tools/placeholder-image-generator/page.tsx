'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Image,
  Download,
  Copy,
  RotateCcw,
  PaintBucket,
  Type,
  Maximize2,
  Grid3X3,
  Check,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
// Presets
// ============================================================

interface Preset {
  label: string;
  width: number;
  height: number;
  text: string;
}

const PRESETS: Preset[] = [
  { label: 'Banner (1200×400)', width: 1200, height: 400, text: '1200×400' },
  { label: 'Hero (1600×600)', width: 1600, height: 600, text: 'Hero Image' },
  { label: 'Thumbnail (400×300)', width: 400, height: 300, text: 'Thumbnail' },
  { label: 'Square (600×600)', width: 600, height: 600, text: '600×600' },
  { label: 'Avatar (256×256)', width: 256, height: 256, text: 'Avatar' },
  { label: 'Story (1080×1920)', width: 1080, height: 1920, text: 'Story' },
  { label: 'Card (800×400)', width: 800, height: 400, text: 'Card Image' },
  { label: 'Wide (1600×900)', width: 1600, height: 900, text: '1600×900' },
  { label: 'Logo (200×80)', width: 200, height: 80, text: 'Logo' },
  { label: 'Og Image (1200×630)', width: 1200, height: 630, text: 'OG Image' },
  { label: 'Icon (64×64)', width: 64, height: 64, text: 'Icon' },
  { label: 'Profile (400×400)', width: 400, height: 400, text: 'Profile' },
];

// ============================================================
// Helpers
// ============================================================

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cellSize: number,
  c1: string,
  c2: string,
) {
  ctx.save();
  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? c1 : c2;
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }
  ctx.restore();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const rs = rgb.r / 255;
  const gs = rgb.g / 255;
  const bs = rgb.b / 255;
  const rLin = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const gLin = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const bLin = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

// ============================================================
// Component
// ============================================================

export default function PlaceholderImageGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(400);
  const [text, setText] = useState('800×400');
  const [bgColor, setBgColor] = useState('#3B82F6');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');
  const [fontSize, setFontSize] = useState(48);
  const [autoTextColor, setAutoTextColor] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [copied, setCopied] = useState(false);

  // When using preset, update fields
  const applyPreset = useCallback((preset: Preset) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setText(preset.text);
  }, []);

  // Draw the canvas (for download — full resolution)
  const drawCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, previewScale: number = 1) => {
      if (!canvas) return;
      const w = width;
      const h = height;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Scale for preview
      ctx.setTransform(previewScale, 0, 0, previewScale, 0, 0);

      // Checkerboard if transparent bg
      if (showGrid) {
        drawCheckerboard(ctx, w, h, 20, '#1E293B', '#334155');
      } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }

      // Determine text color
      let tColor = textColor;
      if (autoTextColor) {
        tColor = luminance(bgColor) > 0.5 ? '#111827' : '#FFFFFF';
      }

      // Draw text
      const displayText = text || `${w}×${h}`;
      const maxFontSize = Math.min(w / (displayText.length * 0.6), h / 2.5);
      const finalFontSize = Math.min(fontSize, maxFontSize);

      ctx.fillStyle = tColor;
      ctx.font = `600 ${finalFontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Word wrap for long text
      const words = displayText.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > w * 0.85 && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = finalFontSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      const startY = (h - totalHeight) / 2 + lineHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], w / 2, startY + i * lineHeight);
      }

      // Draw dimensions in small text at bottom
      const dimLabel = `${w} × ${h}`;
      const smallFontSize = Math.max(10, Math.min(finalFontSize * 0.35, 16));
      ctx.font = `400 ${smallFontSize}px ${fontFamily}`;
      ctx.fillStyle = tColor;
      ctx.globalAlpha = 0.5;
      ctx.fillText(dimLabel, w / 2, h - smallFontSize - 12);
      ctx.globalAlpha = 1;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    [width, height, text, bgColor, textColor, fontFamily, fontSize, autoTextColor, showGrid],
  );

  // Draw preview when any param changes
  useEffect(() => {
    drawCanvas(previewCanvasRef.current, 1);
  }, [drawCanvas]);

  // Download
  const handleDownload = useCallback(() => {
    const canvas = document.createElement('canvas');
    drawCanvas(canvas, 1);

    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    const mime = mimeMap[format];
    const quality = format === 'png' ? undefined : jpegQuality;
    const dataUrl = canvas.toDataURL(mime, quality);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `placeholder-${width}x${height}.${format}`;
    a.click();

    toast.success(`Downloaded ${width}×${height} ${format.toUpperCase()}`);
  }, [drawCanvas, width, height, format, jpegQuality]);

  // Copy data URL
  const handleCopyDataUrl = useCallback(async () => {
    const canvas = document.createElement('canvas');
    drawCanvas(canvas, 1);

    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    const mime = mimeMap[format];
    const quality = format === 'png' ? undefined : jpegQuality;
    const dataUrl = canvas.toDataURL(mime, quality);

    try {
      await navigator.clipboard.writeText(dataUrl);
      setCopied(true);
      toast.success('Data URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [drawCanvas, format, jpegQuality]);

  // Copy as HTML <img> tag
  const handleCopyImgTag = useCallback(async () => {
    const canvas = document.createElement('canvas');
    drawCanvas(canvas, 1);

    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    const mime = mimeMap[format];
    const quality = format === 'png' ? undefined : jpegQuality;
    const dataUrl = canvas.toDataURL(mime, quality);

    const imgTag = `<img src="${dataUrl}" alt="${text || 'placeholder'}" width="${width}" height="${height}" />`;

    try {
      await navigator.clipboard.writeText(imgTag);
      toast.success('HTML tag copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [drawCanvas, format, jpegQuality, text, width, height]);

  // Copy CSS background
  const handleCopyCss = useCallback(async () => {
    const canvas = document.createElement('canvas');
    drawCanvas(canvas, 1);

    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    const mime = mimeMap[format];
    const quality = format === 'png' ? undefined : jpegQuality;
    const dataUrl = canvas.toDataURL(mime, quality);

    const css = `.placeholder {\n  width: ${width}px;\n  height: ${height}px;\n  background: url('${dataUrl}') center/cover;\n}`;

    try {
      await navigator.clipboard.writeText(css);
      toast.success('CSS copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [drawCanvas, format, jpegQuality, width, height]);

  // Reset
  const handleReset = useCallback(() => {
    setWidth(800);
    setHeight(400);
    setText('800×400');
    setBgColor('#3B82F6');
    setTextColor('#FFFFFF');
    setFormat('png');
    setJpegQuality(0.92);
    setFontFamily('Inter, system-ui, sans-serif');
    setFontSize(48);
    setAutoTextColor(true);
    setShowGrid(false);
  }, []);

  const actualTextColor = autoTextColor
    ? luminance(bgColor) > 0.5
      ? '#111827'
      : '#FFFFFF'
    : textColor;

  return (
    <ToolLayout
      title="Placeholder Image Generator"
      description="Generate custom placeholder images for mockups and prototypes. Set dimensions, colors, text, and download in PNG, JPEG, or WebP — 100% client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden border border-slate-700/50 bg-surface-light">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/30 text-xs text-slate-400">
              <span>
                {width}×{height} · {format.toUpperCase()}
              </span>
              <span className="text-slate-500">
                {(width * height > 500000
                  ? `${((width * height) / 1_000_000).toFixed(1)} MP`
                  : `${Math.round((width * height) / 1000)}K px`)}
              </span>
            </div>
            <div className="flex items-center justify-center p-4 min-h-[320px] bg-[#0F172A]">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[480px] object-contain rounded shadow-lg"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download {format.toUpperCase()}
            </button>
            <button onClick={handleCopyDataUrl} className="btn-secondary flex items-center gap-2">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              Copy Data URL
            </button>
            <button onClick={handleCopyImgTag} className="btn-secondary flex items-center gap-2">
              <Image className="w-4 h-4" />
              Copy &lt;img&gt; Tag
            </button>
            <button onClick={handleCopyCss} className="btn-secondary flex items-center gap-2">
              <PaintBucket className="w-4 h-4" />
              Copy CSS
            </button>
            <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`px-2.5 py-1.5 text-xs rounded-md transition-all ${
                    width === preset.width && height === preset.height
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {preset.label.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Dimensions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(clamp(Number(e.target.value), 16, 4096))}
                  min={16}
                  max={4096}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(clamp(Number(e.target.value), 16, 4096))}
                  min={16}
                  max={4096}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Overlay Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. 800×400"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Font size */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Font Size ({fontSize}px)
            </label>
            <input
              type="range"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              min={8}
              max={200}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Colors */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Background Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-9 rounded border border-slate-600 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Text Color
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoTextColor}
                  onChange={(e) => setAutoTextColor(e.target.checked)}
                  className="rounded accent-brand-500"
                />
                Auto (contrast-based)
              </label>
            </div>
            {!autoTextColor && (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-9 rounded border border-slate-600 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
            {autoTextColor && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/30 rounded-md">
                <div
                  className="w-4 h-4 rounded-full border border-slate-600"
                  style={{ backgroundColor: actualTextColor }}
                />
                <span className="text-xs text-slate-400 font-mono">{actualTextColor}</span>
                <span className="text-[10px] text-slate-500 ml-auto">
                  {luminance(bgColor) > 0.5 ? 'Dark text (light bg)' : 'Light text (dark bg)'}
                </span>
              </div>
            )}
          </div>

          {/* Format & quality */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Format
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    format === fmt
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            {format !== 'png' && (
              <div className="mt-3">
                <label className="block text-[10px] text-slate-500 mb-1">
                  Quality: {Math.round(jpegQuality * 100)}%
                </label>
                <input
                  type="range"
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(Number(e.target.value))}
                  min={0.1}
                  max={1}
                  step={0.01}
                  className="w-full accent-brand-500"
                />
              </div>
            )}
          </div>

          {/* Grid toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded accent-brand-500"
            />
            <Grid3X3 className="w-3.5 h-3.5" />
            Show transparency grid
          </label>

          {/* Quick color presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Quick Colors
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                '#3B82F6', // blue
                '#10B981', // green
                '#F59E0B', // amber
                '#EF4444', // red
                '#8B5CF6', // violet
                '#EC4899', // pink
                '#06B6D4', // cyan
                '#F97316', // orange
                '#6366F1', // indigo
                '#14B8A6', // teal
                '#A855F7', // purple
                '#E11D48', // rose
                '#1E293B', // slate dark
                '#E2E8F0', // slate light
                '#111827', // near black
                '#F8FAFC', // near white
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  className="w-7 h-7 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor:
                      bgColor.toLowerCase() === color.toLowerCase()
                        ? '#FFFFFF'
                        : 'transparent',
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
