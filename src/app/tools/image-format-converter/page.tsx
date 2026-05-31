'use client';

import { useState, useCallback, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Download, Image, Trash2, RefreshCw, FileImage, ArrowRight, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ConversionResult {
  blob: Blob;
  url: string;
  size: number;
  mimeType: string;
  extension: string;
  label: string;
}

interface SourceImage {
  file: File;
  url: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
  extension: string;
  label: string;
  hasAlpha: boolean;
}

type TargetFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp';

const FORMAT_SPECS: Record<TargetFormat, {
  mimeType: string;
  extension: string;
  label: string;
  supportsAlpha: boolean;
  supportsQuality: boolean;
  browserSupport: string;
}> = {
  jpeg: { mimeType: 'image/jpeg', extension: 'jpg', label: 'JPEG', supportsAlpha: false, supportsQuality: true, browserSupport: 'All browsers' },
  png: { mimeType: 'image/png', extension: 'png', label: 'PNG', supportsAlpha: true, supportsQuality: false, browserSupport: 'All browsers' },
  webp: { mimeType: 'image/webp', extension: 'webp', label: 'WebP', supportsAlpha: true, supportsQuality: true, browserSupport: 'All modern browsers (97%+)' },
  avif: { mimeType: 'image/avif', extension: 'avif', label: 'AVIF', supportsAlpha: true, supportsQuality: true, browserSupport: 'Modern browsers (93%+)' },
  bmp: { mimeType: 'image/bmp', extension: 'bmp', label: 'BMP', supportsAlpha: false, supportsQuality: false, browserSupport: 'All browsers' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

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

function getMimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/avif': 'AVIF',
    'image/bmp': 'BMP',
    'image/gif': 'GIF',
    'image/svg+xml': 'SVG',
    'image/tiff': 'TIFF',
  };
  return map[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'bin';
}

function checkAlphaSupport(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(false); return; }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, Math.min(canvas.width, 50), Math.min(canvas.height, 50)).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) { resolve(true); return; }
      }
      resolve(false);
    };
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ImageFormatConverterPage() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [results, setResults] = useState<Record<TargetFormat, ConversionResult | null>>({
    jpeg: null,
    png: null,
    webp: null,
    avif: null,
    bmp: null,
  });
  const [activeTargets, setActiveTargets] = useState<Set<TargetFormat>>(new Set<TargetFormat>(['webp']));
  const [quality, setQuality] = useState(0.85);
  const [maintainSize, setMaintainSize] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Toggle a target format ─────────────────────────────────────────────

  const toggleTarget = useCallback((format: TargetFormat) => {
    setActiveTargets((prev) => {
      const next = new Set(prev);
      if (next.has(format)) {
        if (next.size > 1) next.delete(format);
      } else {
        next.add(format);
      }
      return next;
    });
  }, []);

  // ── Handle file ───────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    // Revoke old URLs
    if (source) URL.revokeObjectURL(source.url);

    try {
      const dims = await getImageDimensions(file);
      const url = URL.createObjectURL(file);
      const hasAlpha = await checkAlphaSupport(file);

      setSource({
        file,
        url,
        size: file.size,
        width: dims.width,
        height: dims.height,
        mimeType: file.type,
        extension: getExtension(file.type),
        label: getMimeLabel(file.type),
        hasAlpha,
      });
      setResults({ jpeg: null, png: null, webp: null, avif: null, bmp: null });
      toast.success(`Loaded: ${file.name} (${file.type})`);
    } catch {
      toast.error('Could not read image');
    }
  }, [source]);

  // ── Convert ───────────────────────────────────────────────────────────

  const convert = useCallback(async () => {
    if (!source) return;
    setConverting(true);

    const targets = Array.from(activeTargets);
    const newResults = { ...results };

    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = source.url;
    });

    for (const target of targets) {
      try {
        const spec = FORMAT_SPECS[target];
        const canvas = canvasRef.current;
        if (!canvas) continue;

        let w = img.naturalWidth;
        let h = img.naturalHeight;

        if (!maintainSize && w > 2048) {
          const ratio = 2048 / w;
          w = 2048;
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // For formats without alpha support, fill with white background
        if (!spec.supportsAlpha && source.hasAlpha) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }

        ctx.drawImage(img, 0, 0, w, h);

        const blob = await new Promise<Blob | null>((res) => {
          canvas.toBlob(res, spec.mimeType, spec.supportsQuality ? quality : undefined);
        });

        if (blob) {
          const url = URL.createObjectURL(blob);
          newResults[target] = {
            blob,
            url,
            size: blob.size,
            mimeType: spec.mimeType,
            extension: spec.extension,
            label: spec.label,
          };
        }
      } catch {
        // Skip formats that fail (e.g., AVIF not supported in this browser)
        newResults[target] = null;
      }
    }

    setResults(newResults);
    setConverting(false);

    const succeeded = targets.filter((t) => newResults[t] !== null).length;
    if (succeeded === 0) {
      toast.error('Conversion failed for all selected formats');
    } else if (succeeded === targets.length) {
      toast.success('All conversions complete!');
    } else {
      toast.success(`${succeeded}/${targets.length} conversions complete`);
    }
  }, [source, activeTargets, quality, maintainSize, results]);

  // ── Download ──────────────────────────────────────────────────────────

  const downloadResult = useCallback((result: ConversionResult, source: SourceImage) => {
    const baseName = source.file.name.replace(/\.[^.]+$/, '');
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `${baseName}.${result.extension}`;
    link.click();
    toast.success(`Downloaded: ${link.download}`);
  }, []);

  const downloadAll = useCallback(() => {
    if (!source) return;
    Object.values(results).forEach((r) => {
      if (!r) return;
      const baseName = source.file.name.replace(/\.[^.]+$/, '');
      const link = document.createElement('a');
      link.href = r.url;
      link.download = `${baseName}.${r.extension}`;
      link.click();
    });
    toast.success('All downloads started');
  }, [results, source]);

  // ── Clear ─────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    if (source) URL.revokeObjectURL(source.url);
    Object.values(results).forEach((r) => {
      if (r) URL.revokeObjectURL(r.url);
    });
    setSource(null);
    setResults({ jpeg: null, png: null, webp: null, avif: null, bmp: null });
  }, [source, results]);

  // ── Drag handlers ─────────────────────────────────────────────────────

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

  const hasAnyResults = Object.values(results).some((r) => r !== null);

  return (
    <ToolLayout
      title="Image Format Converter"
      description="Convert images between JPEG, PNG, WebP, AVIF, and BMP — all client-side. No uploads, instant preview, quality control, and transparency handling."
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Left: Upload + Preview */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload area */}
          {!source ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`card border-2 border-dashed cursor-pointer text-center py-16 transition-all ${
                dragging
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-slate-600/50 hover:border-brand-500/50 hover:bg-surface-light'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
              <p className="text-slate-300 font-medium mb-1">Drop an image here or click to browse</p>
              <p className="text-xs text-slate-500 mb-4">JPEG, PNG, WebP, AVIF, GIF, BMP, SVG, TIFF</p>
              <div className="flex items-center justify-center gap-2">
                {(['jpeg', 'png', 'webp', 'avif'] as const).map((f) => (
                  <span key={f} className="px-2 py-1 rounded text-[10px] font-mono bg-surface border border-slate-600/30 text-slate-400">
                    → {f.toUpperCase()}
                  </span>
                ))}
              </div>
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
            <>
              {/* Source image card */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Image className="w-4 h-4 text-brand-400" />
                    Source Image
                  </h2>
                  <button onClick={clearAll} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-slate-400">
                  <span className="text-slate-300 truncate max-w-[200px]">{source.file.name}</span>
                  <span className="text-slate-600">|</span>
                  <span>{formatBytes(source.size)}</span>
                  <span className="text-slate-600">|</span>
                  <span>{source.width} × {source.height}</span>
                  <span className="text-slate-600">|</span>
                  <span className="uppercase bg-surface px-1.5 py-0.5 rounded text-[10px]">{source.label}</span>
                  {source.hasAlpha && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span className="text-brand-400 text-[10px]">Alpha channel</span>
                    </>
                  )}
                </div>
                <div className="bg-checkerboard rounded-lg overflow-hidden border border-slate-700/30 flex items-center justify-center p-3" style={{ maxHeight: 360 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={source.url}
                    alt="Source image preview"
                    className="max-h-[340px] object-contain rounded"
                  />
                </div>
              </div>

              {/* Conversion results */}
              {hasAnyResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-green-400" />
                      Converted Results
                    </h2>
                    <button onClick={downloadAll} className="text-xs btn-primary flex items-center gap-1.5 px-3 py-1.5">
                      <Download className="w-3.5 h-3.5" />
                      Download All
                    </button>
                  </div>
                  {(['webp', 'avif', 'jpeg', 'png', 'bmp'] as TargetFormat[]).map((fmt) => {
                    const r = results[fmt];
                    if (!r) return null;
                    const reduction = ((1 - r.size / source.size) * 100);
                    return (
                      <div key={fmt} className="card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-xs font-semibold bg-surface-light px-2 py-0.5 rounded">{r.label}</span>
                            {reduction > 0 ? (
                              <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">−{reduction.toFixed(0)}%</span>
                            ) : reduction < 0 ? (
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">+{Math.abs(reduction).toFixed(0)}%</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">{formatBytes(r.size)}</span>
                            <button
                              onClick={() => downloadResult(r, source)}
                              className="text-xs flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              .{r.extension}
                            </button>
                          </div>
                        </div>
                        <div className="bg-checkerboard rounded-lg overflow-hidden border border-slate-700/30 flex items-center justify-center p-2" style={{ maxHeight: 240 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.url}
                            alt={`${r.label} preview`}
                            className="max-h-[220px] object-contain rounded"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Converting state */}
              {converting && !hasAnyResults && (
                <div className="p-6 rounded-lg bg-surface-light border border-brand-500/20 text-center">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 text-brand-400 animate-spin" />
                  <p className="text-sm text-brand-300">Converting...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target format selector */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
              <FileImage className="w-4 h-4 text-brand-400" />
              Target Formats
            </h2>
            <p className="text-xs text-slate-400">Select one or more output formats</p>
            <div className="space-y-1.5">
              {(['webp', 'avif', 'jpeg', 'png', 'bmp'] as TargetFormat[]).map((fmt) => {
                const spec = FORMAT_SPECS[fmt];
                const active = activeTargets.has(fmt);
                return (
                  <button
                    key={fmt}
                    onClick={() => toggleTarget(fmt)}
                    className={`w-full text-left px-3 py-2.5 rounded-md transition-all border flex items-center justify-between ${
                      active
                        ? 'bg-brand-500/10 border-brand-500/30 text-white'
                        : 'bg-surface border-slate-600/30 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        active ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-500'
                      }`}>
                        {active && <Check className="w-3 h-3" />}
                      </span>
                      <div>
                        <span className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-300'}`}>
                          {spec.label}
                        </span>
                        <span className="block text-[10px] text-slate-500">{spec.browserSupport}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {spec.supportsAlpha ? (
                        <span className="text-[10px] text-green-500/70">Alpha ✓</span>
                      ) : (
                        <span className="text-[10px] text-slate-600">Alpha ✗</span>
                      )}
                    </div>
                  </button>
                );
              })}
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
              min={0.1}
              max={1}
              step={0.01}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10% (smallest)</span>
              <span>100% (best)</span>
            </div>
            <p className="text-[10px] text-slate-500 italic">Quality applies to JPEG, WebP, and AVIF. PNG and BMP are lossless.</p>
          </div>

          {/* Maintain size */}
          <div className="card space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={maintainSize}
                onChange={(e) => setMaintainSize(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <div>
                <span className="text-white text-sm font-medium">Maintain original size</span>
                <p className="text-[10px] text-slate-500">Uncheck to cap at 2048px wide for large images</p>
              </div>
            </label>
          </div>

          {/* Alpha warning */}
          {source?.hasAlpha && activeTargets.has('jpeg') && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">JPEG doesn&apos;t support transparency.</span>
                {' '}The alpha channel will be replaced with a white background.
              </div>
            </div>
          )}

          {source?.hasAlpha && activeTargets.has('bmp') && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">BMP doesn&apos;t support transparency.</span>
                {' '}The alpha channel will be replaced with a white background.
              </div>
            </div>
          )}

          {/* Convert button */}
          {source && (
            <button
              onClick={convert}
              disabled={converting}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
            >
              {converting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Convert to {Array.from(activeTargets).map((t) => FORMAT_SPECS[t].label).join(' + ')}
                </>
              )}
            </button>
          )}

          {/* Format comparison table */}
          <div className="card space-y-2">
            <h2 className="text-white font-semibold text-sm">Format Guide</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700/50">
                    <th className="text-left py-1.5 pr-3">Format</th>
                    <th className="text-left py-1.5 pr-3">Best for</th>
                    <th className="text-center py-1.5">Alpha</th>
                    <th className="text-center py-1.5">Lossy</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-3 text-white font-mono">WebP</td>
                    <td className="py-1.5 pr-3">Web, general use</td>
                    <td className="text-center py-1.5 text-green-400">✓</td>
                    <td className="text-center py-1.5">✓</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-3 text-white font-mono">AVIF</td>
                    <td className="py-1.5 pr-3">Smallest files, HDR</td>
                    <td className="text-center py-1.5 text-green-400">✓</td>
                    <td className="text-center py-1.5">✓</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-3 text-white font-mono">JPEG</td>
                    <td className="py-1.5 pr-3">Photos, no alpha needed</td>
                    <td className="text-center py-1.5 text-slate-600">✗</td>
                    <td className="text-center py-1.5">✓</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-3 text-white font-mono">PNG</td>
                    <td className="py-1.5 pr-3">Logos, transparency</td>
                    <td className="text-center py-1.5 text-green-400">✓</td>
                    <td className="text-center py-1.5 text-slate-600">✗</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 text-white font-mono">BMP</td>
                    <td className="py-1.5 pr-3">Legacy, raw pixel data</td>
                    <td className="text-center py-1.5 text-slate-600">✗</td>
                    <td className="text-center py-1.5 text-slate-600">✗</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
