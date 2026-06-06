'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Download, Image, Trash2, ArrowRight, RefreshCw, Info, Check, AlertTriangle, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface SourceImage {
  file: File;
  url: string;
  size: number;
  width: number;
  height: number;
  format: string;
  mimeType: string;
}

interface ConvertedImage {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

interface FormatConfig {
  mimeType: string;
  extension: string;
  label: string;
  description: string;
  supportsQuality: boolean;
  supportsTransparency: boolean;
  bestFor: string;
}

// ── Format definitions ─────────────────────────────────────────────────────

const FORMATS: FormatConfig[] = [
  {
    mimeType: 'image/png',
    extension: 'png',
    label: 'PNG',
    description: 'Lossless compression with full alpha transparency. Best for UI elements, logos, screenshots, and images with text.',
    supportsQuality: false,
    supportsTransparency: true,
    bestFor: 'Logos, UI elements, screenshots, text-heavy images, images requiring transparency',
  },
  {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    label: 'JPEG',
    description: 'Lossy compression with no transparency. Excellent compression ratios for photographs and natural images.',
    supportsQuality: true,
    supportsTransparency: false,
    bestFor: 'Photographs, web photos, social media images, thumbnails',
  },
  {
    mimeType: 'image/webp',
    extension: 'webp',
    label: 'WebP',
    description: 'Modern format by Google. Supports both lossy and lossless compression with transparency. ~25–35% smaller than JPEG/PNG at equivalent quality.',
    supportsQuality: true,
    supportsTransparency: true,
    bestFor: 'Web images, responsive images, replacing both JPEG and PNG on the web',
  },
  {
    mimeType: 'image/avif',
    extension: 'avif',
    label: 'AVIF',
    description: 'Next-gen format based on AV1. Superior compression (up to 50% smaller than JPEG) with HDR, wide color gamut, and transparency support.',
    supportsQuality: true,
    supportsTransparency: true,
    bestFor: 'Modern web images, HDR photography, bandwidth-sensitive applications',
  },
  {
    mimeType: 'image/bmp',
    extension: 'bmp',
    label: 'BMP',
    description: 'Uncompressed bitmap format. Large file sizes with no quality loss. Rarely used on the web but needed for legacy applications.',
    supportsQuality: false,
    supportsTransparency: false,
    bestFor: 'Legacy application compatibility, uncompressed archival',
  },
  {
    mimeType: 'image/x-icon',
    extension: 'ico',
    label: 'ICO',
    description: 'Windows icon format. Supports multiple sizes in one file. Commonly used for favicons and Windows application icons.',
    supportsQuality: false,
    supportsTransparency: true,
    bestFor: 'Favicons, Windows application icons, file type icons',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function getFormatFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/tiff': 'tiff',
  };
  return map[mimeType] || mimeType.split('/')[1] || 'unknown';
}

function getFormatLabel(ext: string): string {
  const map: Record<string, string> = {
    'jpg': 'JPEG', 'jpeg': 'JPEG',
    'png': 'PNG',
    'webp': 'WebP',
    'avif': 'AVIF',
    'bmp': 'BMP',
    'ico': 'ICO',
    'gif': 'GIF',
    'svg': 'SVG',
    'tiff': 'TIFF',
  };
  return map[ext] || ext.toUpperCase();
}

// ── Conversion engine ──────────────────────────────────────────────────────

async function convertImage(
  sourceUrl: string,
  sourceWidth: number,
  sourceHeight: number,
  config: FormatConfig,
  quality: number,
  canvasRef: HTMLCanvasElement | null,
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      if (!canvasRef) { reject(new Error('Canvas not available')); return; }

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvasRef.width = w;
      canvasRef.height = h;

      const ctx = canvasRef.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }

      // For formats without transparency support, fill with white background first
      if (!config.supportsTransparency) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);

      // ICO format requires special handling — canvas.toBlob doesn't support it natively in all browsers.
      // Fall back to PNG for ICO if toBlob fails on that mime type.
      let mimeType = config.mimeType;
      let effectiveQuality = config.supportsQuality ? quality : undefined;

      canvasRef.toBlob(
        (blob) => {
          if (!blob) {
            // If ICO fails, try PNG
            if (config.mimeType === 'image/x-icon') {
              canvasRef!.toBlob(
                (pngBlob) => {
                  if (!pngBlob) { reject(new Error('Blob creation failed')); return; }
                  resolve({ blob: pngBlob, width: w, height: h });
                },
                'image/png',
              );
              return;
            }
            reject(new Error('Blob creation failed'));
            return;
          }
          resolve({ blob, width: w, height: h });
        },
        mimeType,
        effectiveQuality,
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = sourceUrl;
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ImageFormatConverterPage() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [converted, setConverted] = useState<ConvertedImage | null>(null);
  const [targetFormat, setTargetFormat] = useState<FormatConfig>(FORMATS[0]);
  const [quality, setQuality] = useState(0.85);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    // Revoke old URLs
    if (source) {
      URL.revokeObjectURL(source.url);
      if (converted) URL.revokeObjectURL(converted.url);
    }

    try {
      const dims = await getImageDimensions(file);
      const url = URL.createObjectURL(file);
      const ext = getFormatFromMimeType(file.type);
      setSource({
        file,
        url,
        size: file.size,
        width: dims.width,
        height: dims.height,
        format: ext,
        mimeType: file.type,
      });
      setConverted(null);
      setError(null);
    } catch {
      toast.error('Could not read image dimensions');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleConvert = useCallback(async () => {
    if (!source) return;
    setProcessing(true);
    setError(null);
    try {
      const result = await convertImage(
        source.url,
        source.width,
        source.height,
        targetFormat,
        quality,
        canvasRef.current,
      );
      const url = URL.createObjectURL(result.blob);
      setConverted({
        blob: result.blob,
        url,
        size: result.blob.size,
        width: result.width,
        height: result.height,
        format: targetFormat.extension,
      });
      toast.success(`Converted to ${targetFormat.label}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  }, [source, targetFormat, quality]);

  const handleDownload = useCallback(() => {
    if (!converted || !source) return;
    const baseName = source.file.name.replace(/\.[^.]+$/, '');
    const link = document.createElement('a');
    link.href = converted.url;
    link.download = `${baseName}.${targetFormat.extension}`;
    link.click();
    toast.success('Download started!');
  }, [converted, source, targetFormat]);

  const handleClear = useCallback(() => {
    if (source) URL.revokeObjectURL(source.url);
    if (converted) URL.revokeObjectURL(converted.url);
    setSource(null);
    setConverted(null);
    setError(null);
  }, [source, converted]);

  const sourceIsCurrentFormat = source && source.format === targetFormat.extension;

  const sizeChange = source && converted
    ? ((converted.size - source.size) / source.size * 100)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Image Format Converter"
      description="Convert images between PNG, JPEG, WebP, AVIF, BMP, and ICO. All processing happens in your browser — no uploads, no server, instant preview."
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* ── Left: upload/preview ── */}
        <div className="lg:col-span-3">
          {!source ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`card border-2 border-dashed cursor-pointer text-center py-20 transition-all ${
                dragging
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-slate-600/50 hover:border-brand-500/50 hover:bg-surface-light'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
              <p className="text-slate-300 font-medium mb-1 text-lg">Drop an image here or click to browse</p>
              <p className="text-sm text-slate-500">
                JPEG, PNG, WebP, AVIF, GIF, BMP, SVG, TIFF — up to 50MB
              </p>
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
              {/* Source card */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-brand-400" />
                    Source Image
                  </h2>
                  <button onClick={handleClear} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-slate-400">
                  <span className="text-slate-300 font-medium">{source.file.name}</span>
                  <span className="text-slate-600">|</span>
                  <span>{formatBytes(source.size)}</span>
                  <span className="text-slate-600">|</span>
                  <span>{source.width} × {source.height}</span>
                  <span className="text-slate-600">|</span>
                  <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 font-mono uppercase text-[11px]">
                    {getFormatLabel(source.format)}
                  </span>
                </div>
                <div className="bg-checkerboard rounded-lg overflow-hidden border border-slate-700/30 flex items-center justify-center p-3" style={{ maxHeight: 360 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={source.url}
                    alt="Source image"
                    className="max-h-[330px] object-contain rounded"
                  />
                </div>
              </div>

              {/* Converted card */}
              {converted && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                      <Image className="w-4 h-4 text-green-400" />
                      Converted — {getFormatLabel(converted.format)}
                    </h2>
                    {sizeChange !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        Math.abs(sizeChange) < 1
                          ? 'text-slate-400 bg-slate-500/10'
                          : sizeChange > 0
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-green-400 bg-green-500/10'
                      }`}>
                        {Math.abs(sizeChange) < 1
                          ? '≈ same size'
                          : sizeChange > 0
                            ? `+${sizeChange.toFixed(1)}% larger`
                            : `${Math.abs(sizeChange).toFixed(1)}% smaller`
                        }
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-slate-400">
                    <span>{formatBytes(converted.size)}</span>
                    <span className="text-slate-600">|</span>
                    <span>{converted.width} × {converted.height}</span>
                    <span className="text-slate-600">|</span>
                    <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-300 font-mono uppercase text-[11px]">
                      {getFormatLabel(converted.format)}
                    </span>
                  </div>
                  <div className="bg-checkerboard rounded-lg overflow-hidden border border-slate-700/30 flex items-center justify-center p-3" style={{ maxHeight: 360 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={converted.url}
                      alt="Converted image"
                      className="max-h-[330px] object-contain rounded"
                    />
                  </div>
                  <button
                    onClick={handleDownload}
                    className="mt-4 w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download as {getFormatLabel(converted.format)}
                  </button>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 text-sm font-medium">Conversion failed</p>
                    <p className="text-red-400 text-xs mt-0.5">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: controls ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format selector */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm">Target Format</h2>
            <div className="space-y-2">
              {FORMATS.map((fmt) => {
                const isSelected = targetFormat.mimeType === fmt.mimeType;
                const isCurrent = source?.format === fmt.extension && isSelected;
                return (
                  <button
                    key={fmt.mimeType}
                    onClick={() => {
                      setTargetFormat(fmt);
                      setConverted(null);
                      setError(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-slate-700/40 bg-surface hover:border-slate-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-brand-300' : 'text-white'}`}>
                        {fmt.label}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-slate-500">{fmt.extension}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{fmt.description}</p>
                    {isCurrent && (
                      <p className="text-xs text-slate-500 mt-1 italic">Same format as source</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality slider (only for lossy formats) */}
          {targetFormat.supportsQuality && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">Quality</h2>
                <span className="text-xs text-brand-300 font-mono bg-brand-500/10 px-2 py-0.5 rounded">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={quality}
                onChange={(e) => {
                  setQuality(Number(e.target.value));
                  setConverted(null);
                }}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Smallest file (5%)</span>
                <span>Best quality (100%)</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[0.1, 0.5, 0.75, 0.95].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`px-2 py-1 text-[11px] rounded font-medium transition-all ${
                      Math.abs(quality - q) < 0.02
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                        : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {Math.round(q * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format details */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-brand-400" />
              Format Details
            </h2>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-500">Transparency: </span>
                <span className={targetFormat.supportsTransparency ? 'text-green-400' : 'text-slate-400'}>
                  {targetFormat.supportsTransparency ? '✓ Supported' : '✗ Not supported (white background will be used)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Compression: </span>
                <span className="text-slate-400">
                  {targetFormat.supportsQuality ? 'Lossy (quality-adjustable)' : 'Lossless (or uncompressed)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Best for: </span>
                <span className="text-slate-400">{targetFormat.bestFor}</span>
              </div>
            </div>
          </div>

          {/* Convert button */}
          {source && (
            <button
              onClick={handleConvert}
              disabled={processing || !!sourceIsCurrentFormat}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                sourceIsCurrentFormat
                  ? 'bg-surface border border-slate-600/30 text-slate-500 cursor-not-allowed'
                  : processing
                    ? 'bg-brand-500/20 text-brand-300 cursor-wait'
                    : 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20'
              }`}
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : sourceIsCurrentFormat ? (
                <>
                  <Check className="w-4 h-4" />
                  Same Format
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Convert to {targetFormat.label}
                </>
              )}
            </button>
          )}

          {/* Source → Target summary */}
          {source && !sourceIsCurrentFormat && (
            <div className="p-3 rounded-lg bg-surface-light border border-slate-700/30 text-center text-xs text-slate-400">
              <span className="font-mono uppercase text-brand-300">{getFormatLabel(source.format)}</span>
              {' → '}
              <span className="font-mono uppercase text-brand-300">{targetFormat.label}</span>
              {targetFormat.supportsQuality && (
                <span className="text-slate-500"> @ {Math.round(quality * 100)}% quality</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="mt-12 border-t border-slate-700/30 pt-8">
        <h2 className="text-white text-lg font-semibold mb-4">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
          <div className="p-4 rounded-lg bg-surface border border-slate-700/30">
            <span className="text-brand-400 font-bold text-lg">1.</span>
            <p className="mt-1"><strong className="text-slate-300">Upload</strong> — Drag & drop any image or click to browse. Format is detected from the file.</p>
          </div>
          <div className="p-4 rounded-lg bg-surface border border-slate-700/30">
            <span className="text-brand-400 font-bold text-lg">2.</span>
            <p className="mt-1"><strong className="text-slate-300">Configure</strong> — Choose target format and quality (for lossy formats). All rendering is via the Canvas API.</p>
          </div>
          <div className="p-4 rounded-lg bg-surface border border-slate-700/30">
            <span className="text-brand-400 font-bold text-lg">3.</span>
            <p className="mt-1"><strong className="text-slate-300">Download</strong> — Converted image is generated in your browser. No server upload, no data leaves your machine.</p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-surface-light border border-slate-700/40">
          <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-brand-400" />
            Browser Compatibility Notes
          </h3>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• <strong>WebP</strong> — Supported in all modern browsers (Chrome 23+, Firefox 65+, Safari 14+). Safe for production use.</li>
            <li>• <strong>AVIF</strong> — Supported in Chrome 85+, Firefox 93+, Safari 16.1+. Full Baseline since 2024. Best compression but slower to encode client-side.</li>
            <li>• <strong>ICO</strong> — Canvas API has limited ICO support. A PNG fallback is used if ICO encoding fails on your browser.</li>
            <li>• <strong>BMP</strong> — Generates large uncompressed files. Use only when required for legacy compatibility.</li>
            <li>• Conversion is lossless for PNG→PNG. For all other conversions, some quality change may occur depending on source and target formats.</li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
