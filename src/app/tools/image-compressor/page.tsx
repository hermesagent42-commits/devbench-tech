'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Download, Image, Trash2, Info, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompressedResult {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

interface OriginalInfo {
  file: File;
  url: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

const PRESETS = [
  { label: 'Web (1200px)', maxWidth: 1200, quality: 0.82, format: 'jpeg' as const },
  { label: 'Thumbnail (400px)', maxWidth: 400, quality: 0.78, format: 'jpeg' as const },
  { label: 'Social Post (1080px)', maxWidth: 1080, quality: 0.85, format: 'jpeg' as const },
  { label: 'Hero Image (1920px)', maxWidth: 1920, quality: 0.88, format: 'jpeg' as const },
  { label: 'WebP Lossy', maxWidth: 1200, quality: 0.80, format: 'webp' as const },
  { label: 'WebP Lossless', maxWidth: 0, quality: 1, format: 'webp-lossless' as const },
  { label: 'PNG-8 (256 colors)', maxWidth: 0, quality: 0.75, format: 'png-8' as const },
  { label: 'Tiny Avatar (128px)', maxWidth: 128, quality: 0.72, format: 'jpeg' as const },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatPct(reduction: number): string {
  return `${reduction.toFixed(1)}%`;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function getFormatLabel(format: string): string {
  switch (format) {
    case 'jpeg': return 'JPEG';
    case 'webp': return 'WebP';
    case 'webp-lossless': return 'WebP (Lossless)';
    case 'png': return 'PNG';
    case 'png-8': return 'PNG-8 (quantized)';
    default: return format.toUpperCase();
  }
}

export default function ImageCompressorPage() {
  const [original, setOriginal] = useState<OriginalInfo | null>(null);
  const [compressed, setCompressed] = useState<CompressedResult | null>(null);
  const [quality, setQuality] = useState(0.80);
  const [maxWidth, setMaxWidth] = useState(1200);
  const [format, setFormat] = useState<'jpeg' | 'webp' | 'webp-lossless' | 'png' | 'png-8'>('jpeg');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dimensionsDisplay, setDimensionsDisplay] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = useCallback(async (
    sourceUrl: string,
    sourceWidth: number,
    sourceHeight: number,
    mw: number,
    q: number,
    fmt: typeof format,
  ): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) { reject(new Error('Canvas not available')); return; }

        let w = img.naturalWidth;
        let h = img.naturalHeight;

        if (mw > 0 && w > mw) {
          const ratio = mw / w;
          w = mw;
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }

        ctx.drawImage(img, 0, 0, w, h);

        if (fmt === 'png-8') {
          // Reduce to 256 colors via color quantization
          const imageData = ctx.getImageData(0, 0, w, h);
          const reduced = quantizeColors(imageData, 256);
          ctx.putImageData(reduced, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('Blob creation failed')); return; }
              resolve({ blob, width: w, height: h });
            },
            'image/png',
          );
          return;
        }

        let mimeType = 'image/jpeg';
        let effectiveQuality = q;
        if (fmt === 'webp' || fmt === 'webp-lossless') {
          mimeType = 'image/webp';
          if (fmt === 'webp-lossless') effectiveQuality = 1;
        } else if (fmt === 'png') {
          mimeType = 'image/png';
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Blob creation failed')); return; }
            resolve({ blob, width: w, height: h });
          },
          mimeType,
          effectiveQuality,
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = sourceUrl;
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    try {
      const dims = await getImageDimensions(file);
      const url = URL.createObjectURL(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      setOriginal({
        file,
        url,
        size: file.size,
        width: dims.width,
        height: dims.height,
        format: ext,
      });
      setCompressed(null);
      setDimensionsDisplay(`${dims.width} × ${dims.height}`);
    } catch {
      toast.error('Could not read image dimensions');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const compress = useCallback(async () => {
    if (!original) return;
    setProcessing(true);
    try {
      const result = await processImage(original.url, original.width, original.height, maxWidth, quality, format);
      const url = URL.createObjectURL(result.blob);
      setCompressed({
        blob: result.blob,
        url,
        size: result.blob.size,
        width: result.width,
        height: result.height,
        format: getFormatLabel(format),
      });
      toast.success('Compression complete!');
    } catch {
      toast.error('Compression failed');
    } finally {
      setProcessing(false);
    }
  }, [original, maxWidth, quality, format, processImage]);

  // Auto-compress when params change
  useEffect(() => {
    if (original) {
      const timer = setTimeout(() => compress(), 200);
      return () => clearTimeout(timer);
    }
  }, [original, maxWidth, quality, format]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setMaxWidth(preset.maxWidth);
    setQuality(preset.quality);
    setFormat(preset.format);
  }, []);

  const download = useCallback(() => {
    if (!compressed || !original) return;
    const baseName = original.file.name.replace(/\.[^.]+$/, '');
    let ext: string;
    switch (format) {
      case 'webp':
      case 'webp-lossless':
        ext = 'webp';
        break;
      case 'png':
      case 'png-8':
        ext = 'png';
        break;
      default:
        ext = 'jpg';
    }
    const link = document.createElement('a');
    link.href = compressed.url;
    link.download = `${baseName}-compressed.${ext}`;
    link.click();
    toast.success('Download started!');
  }, [compressed, original, format]);

  const clearAll = useCallback(() => {
    if (original) URL.revokeObjectURL(original.url);
    if (compressed) URL.revokeObjectURL(compressed.url);
    setOriginal(null);
    setCompressed(null);
    setQuality(0.80);
    setMaxWidth(1200);
    setFormat('jpeg');
    setDimensionsDisplay('');
  }, [original, compressed]);

  const reduction = original && compressed
    ? ((1 - compressed.size / original.size) * 100)
    : null;

  return (
    <ToolLayout
      title="Image Compressor"
      description="Compress and resize images client-side. JPEG, WebP, PNG — no uploads, instant preview, quality slider, and presets for web, social, and thumbnails."
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Upload area */}
        <div className="lg:col-span-3">
          {!original ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`card border-2 border-dashed cursor-pointer text-center py-16 transition-all ${
                dragging
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-slate-600/50 hover:border-brand-500/50 hover:bg-surface-light'
              }`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
              <p className="text-slate-300 font-medium mb-1">Drop an image here or click to browse</p>
              <p className="text-xs text-slate-500">JPEG, PNG, WebP, GIF, SVG, BMP — up to 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Original preview */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Image className="w-4 h-4 text-brand-400" />
                    Original
                  </h2>
                  <button onClick={clearAll} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
                  <span>{original.file.name}</span>
                  <span className="text-slate-600">|</span>
                  <span>{formatBytes(original.size)}</span>
                  <span className="text-slate-600">|</span>
                  <span>{original.width} × {original.height}</span>
                  <span className="text-slate-600">|</span>
                  <span className="uppercase">{original.format}</span>
                </div>
                <div className="bg-checkerboard rounded-lg overflow-hidden border border-slate-700/30 flex items-center justify-center p-2" style={{ maxHeight: 320 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={original.url}
                    alt="Original image preview"
                    className="max-h-[300px] object-contain rounded"
                  />
                </div>
              </div>

              {/* Compressed preview */}
              {compressed && (
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                      <Image className="w-4 h-4 text-green-400" />
                      Compressed
                    </h2>
                    {reduction !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        reduction > 0
                          ? 'text-green-400 bg-green-500/10'
                          : 'text-amber-400 bg-amber-500/10'
                      }`}>
                        {reduction > 0 ? `−${formatPct(reduction)}` : `+${formatPct(Math.abs(reduction))}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
                    <span>{formatBytes(compressed.size)}</span>
                    <span className="text-slate-600">|</span>
                    <span>{compressed.width} × {compressed.height}</span>
                    <span className="text-slate-600">|</span>
                    <span>{compressed.format}</span>
                  </div>
                  <div className="bg-checkerboard rounded-lg overflow-hidden border border-slate-700/30 flex items-center justify-center p-2" style={{ maxHeight: 320 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={compressed.url}
                      alt="Compressed image preview"
                      className="max-h-[300px] object-contain rounded"
                    />
                  </div>
                  <button
                    onClick={download}
                    className="mt-4 w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Compressed Image
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format selector */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Output Format</h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { val: 'jpeg', label: 'JPEG' },
                { val: 'webp', label: 'WebP' },
                { val: 'webp-lossless', label: 'WebP Lossless' },
                { val: 'png', label: 'PNG' },
                { val: 'png-8', label: 'PNG-8 (256c)' },
              ] as const).map((f) => (
                <button
                  key={f.val}
                  onClick={() => setFormat(f.val)}
                  className={`px-3 py-2 text-xs rounded-md font-medium transition-all ${
                    format === f.val
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Quality</h2>
              <span className="text-xs text-slate-300 font-mono">{Math.round(quality * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>5% (tiny)</span>
              <span>100% (best)</span>
            </div>
          </div>

          {/* Max width */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                Max Width
              </h2>
              <span className="text-xs text-slate-300 font-mono">
                {maxWidth === 0 ? 'Original size' : `${maxWidth}px`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3840}
              step={10}
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Original</span>
              <span>4K</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <label className="text-xs text-slate-400">Custom:</label>
              <input
                type="number"
                value={maxWidth}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(3840, Number(e.target.value)));
                  setMaxWidth(v);
                }}
                className="w-24 px-2 py-1 rounded bg-surface border border-slate-600/50 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50"
              />
              <span className="text-xs text-slate-500">px (0 = no resize)</span>
            </div>
          </div>

          {/* Presets */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Presets</h2>
            <div className="space-y-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-3 py-2 rounded-md text-xs bg-surface border border-slate-600/30 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all flex justify-between items-center"
                >
                  <span>{preset.label}</span>
                  <span className="text-[10px] text-slate-500">
                    {preset.maxWidth > 0 ? `${preset.maxWidth}px · ` : ''}{Math.round(preset.quality * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Info panel */}
          {original && !compressed && processing && (
            <div className="p-4 rounded-lg bg-surface-light border border-brand-500/20 text-center text-sm text-brand-300">
              Processing...
            </div>
          )}

          {reduction !== null && (
            <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-2">
              <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-400" />
                Compression Summary
              </h3>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Original</span>
                  <span className="text-slate-300 font-mono">{formatBytes(original!.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Compressed</span>
                  <span className="text-slate-300 font-mono">{formatBytes(compressed!.size)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700/30 pt-1 mt-1">
                  <span>Reduction</span>
                  <span className={`font-mono font-semibold ${reduction > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                    {reduction > 0 ? `−${formatPct(reduction)}` : `+${formatPct(Math.abs(reduction))}`}
                  </span>
                </div>
                {original!.width !== compressed!.width && (
                  <div className="flex justify-between">
                    <span>Resized</span>
                    <span className="text-slate-300 font-mono">
                      {original!.width}×{original!.height} → {compressed!.width}×{compressed!.height}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}

// Simple color quantization for PNG-8
function quantizeColors(imageData: ImageData, maxColors: number): ImageData {
  const data = imageData.data;

  // Simple quantization: reduce each channel to fewer levels
  const bitsPerChannel = Math.max(2, Math.floor(Math.log2(Math.pow(maxColors, 1 / 3))));
  const levels = Math.pow(2, bitsPerChannel);

  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    output[i] = Math.round((Math.round(data[i] / (256 / levels)) * (256 / levels)));
    output[i + 1] = Math.round((Math.round(data[i + 1] / (256 / levels)) * (256 / levels)));
    output[i + 2] = Math.round((Math.round(data[i + 2] / (256 / levels)) * (256 / levels)));
    output[i + 3] = data[i + 3];
  }

  return new ImageData(output, imageData.width, imageData.height);
}
