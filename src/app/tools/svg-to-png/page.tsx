'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Upload, Image, Trash2, RefreshCw, Maximize2, Ruler, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type ExportFormat = 'png' | 'webp' | 'jpeg';

interface Dimensions {
  width: number;
  height: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 16;

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="50%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="20" fill="url(#g)"/>
  <circle cx="100" cy="80" r="40" fill="white" opacity="0.9"/>
  <polygon points="100,30 70,120 130,120" fill="white" opacity="0.2"/>
  <text x="100" y="160" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="bold" fill="white">SVG → PNG</text>
</svg>`;

// ── SVGO-like clean (basic, no deps) ──────────────────────────────────────

function sanitizeSvg(svg: string): string {
  // Strip scripts, event handlers, and foreignObject
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
}

// ── Parse viewBox ──────────────────────────────────────────────────────────

function parseViewBox(svg: string): Dimensions | null {
  const vbMatch = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vbMatch) {
    const parts = vbMatch[1].split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }
  // Try width/height attrs
  const wMatch = svg.match(/<svg[^>]*\swidth\s*=\s*["'](\d+(?:\.\d+)?)/i);
  const hMatch = svg.match(/<svg[^>]*\sheight\s*=\s*["'](\d+(?:\.\d+)?)/i);
  if (wMatch && hMatch) {
    return { width: Math.round(parseFloat(wMatch[1])), height: Math.round(parseFloat(hMatch[1])) };
  }
  return null;
}

function ensureViewBox(svg: string): string {
  if (/viewBox\s*=/i.test(svg)) return svg;
  const dims = parseViewBox(svg);
  if (dims) {
    return svg.replace(/<svg/i, `<svg viewBox="0 0 ${dims.width} ${dims.height}"`);
  }
  // Default fallback
  return svg.replace(/<svg/i, '<svg viewBox="0 0 200 200"');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SvgToPngPage() {
  const [svgInput, setSvgInput] = useState(SAMPLE_SVG);
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(400);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [transparent, setTransparent] = useState(false);
  const [scale, setScale] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Parse viewBox from input ─────────────────────────────────────────
  const parsedDims = parseViewBox(svgInput);

  // ── Lock aspect ratio when width changes ─────────────────────────────
  const handleWidthChange = useCallback((newWidth: number) => {
    setWidth(newWidth);
    if (lockAspect && parsedDims) {
      const ratio = parsedDims.height / parsedDims.width;
      setHeight(Math.round(newWidth * ratio));
    }
  }, [lockAspect, parsedDims]);

  const handleHeightChange = useCallback((newHeight: number) => {
    setHeight(newHeight);
    if (lockAspect && parsedDims) {
      const ratio = parsedDims.width / parsedDims.height;
      setWidth(Math.round(newHeight * ratio));
    }
  }, [lockAspect, parsedDims]);

  // ── Render SVG to canvas ─────────────────────────────────────────────
  const renderToCanvas = useCallback(async () => {
    setError(null);
    setIsRendering(true);
    setPreviewUrl(null);

    const cleanedSvg = sanitizeSvg(svgInput.trim());
    if (!cleanedSvg) {
      setError('SVG input is empty');
      setIsRendering(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas not available');
      setIsRendering(false);
      return;
    }

    const outputW = Math.min(Math.max(width * scale, MIN_DIMENSION), MAX_DIMENSION);
    const outputH = Math.min(Math.max(height * scale, MIN_DIMENSION), MAX_DIMENSION);

    canvas.width = outputW;
    canvas.height = outputH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not get 2D context');
      setIsRendering(false);
      return;
    }

    // Fill background
    if (!transparent || format === 'jpeg') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, outputW, outputH);
    } else {
      ctx.clearRect(0, 0, outputW, outputH);
    }

    // Render SVG via Image
    const svgWithViewBox = ensureViewBox(cleanedSvg);
    const blob = new Blob([svgWithViewBox], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      await new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            ctx.drawImage(img, 0, 0, outputW, outputH);
            URL.revokeObjectURL(url);
            resolve();
          } catch (err) {
            URL.revokeObjectURL(url);
            reject(err);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG. Check for syntax errors.'));
        };
        img.src = url;
      });

      // Generate preview URL
      const mimeType = format === 'webp' ? 'image/webp' : format === 'jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob((b) => {
        if (b) {
          const preview = URL.createObjectURL(b);
          setPreviewUrl(preview);
        }
      }, mimeType, format === 'png' ? undefined : quality);

      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRendering(false);
    }
  }, [svgInput, width, height, scale, format, quality, backgroundColor, transparent]);

  // ── Auto-render on change (debounced) ─────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (svgInput.trim()) {
        renderToCanvas();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [svgInput, width, height, scale, format, quality, backgroundColor, transparent]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual render for explicit button clicks ──────────────────────────
  const handleRender = useCallback(() => {
    renderToCanvas();
  }, [renderToCanvas]);

  // ── Download ─────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const extMap: Record<ExportFormat, string> = { png: 'png', webp: 'webp', jpeg: 'jpg' };
    const mimeMap: Record<ExportFormat, string> = { png: 'image/png', webp: 'image/webp', jpeg: 'image/jpeg' };
    const q = format === 'png' ? undefined : quality;

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Failed to create download');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export.${extMap[format]}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${extMap[format].toUpperCase()}`);
    }, mimeMap[format], q);
  }, [format, quality]);

  // ── Copy to clipboard (as PNG blob → clipboard) ─────────────────────
  const handleCopyImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      if (!blob) {
        toast.error('Failed to create image');
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast.success('Image copied to clipboard!');
    } catch {
      toast.error('Clipboard API not supported for images');
    }
  }, []);

  // ── Load sample ──────────────────────────────────────────────────────
  const handleLoadSample = useCallback(() => {
    setSvgInput(SAMPLE_SVG);
    const dims = parseViewBox(SAMPLE_SVG);
    if (dims) {
      setWidth(dims.width * 2);
      setHeight(dims.height * 2);
    }
    setTransparent(false);
    setFormat('png');
    setScale(1);
    toast.success('Sample loaded');
  }, []);

  // ── Use native dimensions ────────────────────────────────────────────
  const handleUseNativeDimensions = useCallback(() => {
    if (parsedDims) {
      setWidth(parsedDims.width);
      setHeight(parsedDims.height);
      setScale(1);
      toast.success(`Size set to ${parsedDims.width}×${parsedDims.height}`);
    } else {
      toast.error('No viewBox or dimensions found in SVG');
    }
  }, [parsedDims]);

  // ── File upload ──────────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.svg') && !file.type.includes('svg')) {
      toast.error('Please select an SVG file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setSvgInput(text);
      const dims = parseViewBox(text);
      if (dims) {
        setWidth(dims.width * 2);
        setHeight(dims.height * 2);
      }
      toast.success(`Loaded: ${file.name}`);
    };
    reader.readAsText(file);

    // Reset input so same file can be re-selected
    e.target.value = '';
  }, []);

  // ── Drag & Drop ──────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.svg') && !file.type.includes('svg')) {
      toast.error('Please drop an SVG file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setSvgInput(text);
      const dims = parseViewBox(text);
      if (dims) {
        setWidth(dims.width * 2);
        setHeight(dims.height * 2);
      }
      toast.success(`Loaded: ${file.name}`);
    };
    reader.readAsText(file);
  }, []);

  // ── Preset sizes ─────────────────────────────────────────────────────
  const sizePresets = [
    { label: '1×', desc: 'Native size', w: parsedDims?.width || 200, h: parsedDims?.height || 200 },
    { label: '2×', desc: 'Retina', w: (parsedDims?.width || 200) * 2, h: (parsedDims?.height || 200) * 2 },
    { label: '3×', desc: 'HiDPI', w: (parsedDims?.width || 200) * 3, h: (parsedDims?.height || 200) * 3 },
    { label: '512', desc: 'Favicon', w: 512, h: 512 },
    { label: '1024', desc: 'Hero', w: 1024, h: 1024 },
  ];

  const estimatedSize = width * scale * height * scale * 4; // rough bytes for RGBA

  return (
    <ToolLayout
      title="SVG to PNG Converter"
      description="Convert SVG to PNG, WebP, or JPEG — right in your browser. Set custom dimensions, scale for HiDPI, choose background color, and download. 100% client-side, no uploads."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Format */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Format:</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG</option>
            </select>
          </div>

          {/* Dimensions */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Size:</span>
            <input
              type="number"
              value={width}
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              onChange={(e) => handleWidthChange(parseInt(e.target.value) || MIN_DIMENSION)}
              className="w-20 bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-200 text-center focus:outline-none focus:border-brand-500"
            />
            <span className="text-slate-500 text-sm">×</span>
            <input
              type="number"
              value={height}
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              onChange={(e) => handleHeightChange(parseInt(e.target.value) || MIN_DIMENSION)}
              className="w-20 bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-200 text-center focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() => setLockAspect(!lockAspect)}
              className={`p-1.5 rounded-md text-xs transition-colors ${lockAspect ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
              title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            >
              <Ruler className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Scale:</span>
            <input
              type="range"
              value={scale}
              min={0.25}
              max={4}
              step={0.25}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-20 accent-brand-500"
            />
            <span className="text-xs text-slate-300 w-8">{scale}x</span>
          </div>

          <div className="flex-1" />

          {/* Background */}
          {(!transparent || format === 'jpeg') && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">BG:</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent"
              />
            </div>
          )}

          {/* Transparency toggle (PNG/WebP only) */}
          {format !== 'jpeg' && (
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
                className="rounded accent-brand-500"
              />
              Transparent
            </label>
          )}

          {/* JPEG quality */}
          {format !== 'png' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Quality:</span>
              <input
                type="range"
                value={quality * 100}
                min={10}
                max={100}
                step={5}
                onChange={(e) => setQuality(parseInt(e.target.value) / 100)}
                className="w-16 accent-brand-500"
              />
              <span className="text-xs text-slate-300 w-8">{Math.round(quality * 100)}%</span>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 text-sm rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Sample
          </button>
          <button
            onClick={handleRender}
            disabled={isRendering}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin' : ''}`} />
            Render
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: SVG Input */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Image className="w-4 h-4 text-orange-400" />
              SVG Input
            </label>
            <div className="flex items-center gap-2">
              {parsedDims && (
                <button
                  onClick={handleUseNativeDimensions}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-400 transition-colors"
                  title="Use native SVG dimensions"
                >
                  <Maximize2 className="w-3 h-3" />
                  {parsedDims.width}×{parsedDims.height}
                </button>
              )}
              <span className="text-xs text-slate-500">{svgInput.split('\n').length} lines</span>
            </div>
          </div>

          {/* Drop zone overlay */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex-1 ${isDragging ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-900 rounded-lg' : ''}`}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-brand-500/10 rounded-lg z-10 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-800 rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-sm text-brand-400 font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Drop SVG file here
                  </p>
                </div>
              </div>
            )}
            <textarea
              value={svgInput}
              onChange={(e) => setSvgInput(e.target.value)}
              placeholder="Paste SVG code or drop an .svg file here..."
              className="flex-1 min-h-[420px] w-full bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 resize-y focus:outline-none focus:border-brand-500/50 placeholder:text-slate-600"
              spellCheck={false}
            />
          </div>

          {/* Upload button */}
          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Upload .svg
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Size presets */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs text-slate-600">Size:</span>
              {sizePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setWidth(preset.w);
                    setHeight(preset.h);
                    setScale(1);
                  }}
                  className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                  title={preset.desc}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview & Output */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Image className="w-4 h-4 text-green-400" />
              Preview
            </label>
            <span className="text-xs text-slate-500">
              {width * scale}×{height * scale}px · ~{(estimatedSize / 1024).toFixed(1)} KB raw
            </span>
          </div>

          {error ? (
            <div className="flex-1 min-h-[420px] w-full bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-red-300 text-sm font-medium">Render Error</p>
              <p className="text-red-400/80 text-xs text-center max-w-xs font-mono">{error}</p>
            </div>
          ) : (
            <div className="relative flex-1 min-h-[420px] bg-slate-900 border border-slate-700 rounded-lg p-4 flex items-center justify-center overflow-auto">
              {/* Checkerboard for transparency */}
              {transparent && (
                <div
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #64748b 25%, transparent 25%),
                      linear-gradient(-45deg, #64748b 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #64748b 75%),
                      linear-gradient(-45deg, transparent 75%, #64748b 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  }}
                />
              )}

              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Rendered SVG"
                  className="max-w-full max-h-full object-contain relative z-10"
                  style={{ imageRendering: 'auto' }}
                />
              ) : (
                <p className="text-slate-600 text-sm italic relative z-10">
                  {isRendering ? 'Rendering...' : 'Enter SVG code to see preview'}
                </p>
              )}

              {/* Hidden canvas for rendering */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleDownload}
              disabled={!previewUrl || isRendering}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Download {format.toUpperCase()}
            </button>
            <button
              onClick={handleCopyImage}
              disabled={!previewUrl || isRendering}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Image
            </button>
            <button
              onClick={handleRender}
              disabled={isRendering}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-surface-light border border-slate-700/50 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">💡 Tips</h3>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• <strong>Drag & drop</strong> .svg files directly onto the input area.</li>
            <li>• Use <strong>2× or 3× scale</strong> for retina/HiDPI exports.</li>
            <li>• <strong>Transparent PNG</strong> is great for icons and logos.</li>
            <li>• <strong>WebP</strong> gives smaller files than PNG with transparency support.</li>
            <li>• <strong>JPEG</strong> is best for photos and complex gradients (no transparency).</li>
            <li>• Click the <strong>dimension chip</strong> to reset to the SVG&apos;s native viewBox size.</li>
          </ul>
        </div>
        <div className="p-4 bg-surface-light border border-slate-700/50 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">🔒 Privacy</h3>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• All rendering happens <strong>locally in your browser</strong> using the Canvas API.</li>
            <li>• Your SVG data is never sent to any server.</li>
            <li>• The canvas is hidden — only the final rendered preview is shown.</li>
            <li>• Script tags and event handlers are <strong>automatically stripped</strong> for safety.</li>
            <li>• Max output size: {MAX_DIMENSION}×{MAX_DIMENSION}px (prevents memory issues).</li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
