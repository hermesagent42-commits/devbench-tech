'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Upload,
  Download,
  Trash2,
  Image,
  Lock,
  Unlock,
  Ruler,
  Maximize2,
  Minimize2,
  FileImage,
  Copy,
  X,
  Percent,
  Monitor,
  Smartphone,
  Camera,
  Layout,
} from 'lucide-react';
import toast from 'react-hot-toast';

type LockMode = 'dimensions' | 'ratio';
type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp';
type ResizeMode = 'exact' | 'percent';

interface Preset {
  label: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

const PRESETS: Preset[] = [
  { label: 'Instagram Post', width: 1080, height: 1080, icon: <Camera className="w-4 h-4" /> },
  { label: 'Instagram Story', width: 1080, height: 1920, icon: <Smartphone className="w-4 h-4" /> },
  { label: 'Twitter Post', width: 1200, height: 675, icon: <Layout className="w-4 h-4" /> },
  { label: 'Twitter Header', width: 1500, height: 500, icon: <Layout className="w-4 h-4" /> },
  { label: 'Facebook Post', width: 1200, height: 630, icon: <Layout className="w-4 h-4" /> },
  { label: 'Facebook Cover', width: 851, height: 315, icon: <Layout className="w-4 h-4" /> },
  { label: 'LinkedIn Post', width: 1200, height: 627, icon: <Layout className="w-4 h-4" /> },
  { label: 'LinkedIn Banner', width: 1584, height: 396, icon: <Layout className="w-4 h-4" /> },
  { label: 'YouTube Thumbnail', width: 1280, height: 720, icon: <Monitor className="w-4 h-4" /> },
  { label: 'App Icon (iOS)', width: 1024, height: 1024, icon: <Smartphone className="w-4 h-4" /> },
  { label: 'Favicon', width: 64, height: 64, icon: <Minimize2 className="w-4 h-4" /> },
  { label: 'Hero (Web)', width: 1920, height: 1080, icon: <Monitor className="w-4 h-4" /> },
  { label: 'Thumbnail (Web)', width: 400, height: 300, icon: <Image className="w-4 h-4" /> },
  { label: 'Full HD', width: 1920, height: 1080, icon: <Monitor className="w-4 h-4" /> },
  { label: '4K', width: 3840, height: 2160, icon: <Monitor className="w-4 h-4" /> },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function ImageResizerPage() {
  const [image, setImage] = useState<{
    file: File;
    src: string;
    width: number;
    height: number;
    format: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Resize params
  const [resizeMode, setResizeMode] = useState<ResizeMode>('exact');
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [lockMode, setLockMode] = useState<LockMode>('dimensions');
  const [percent, setPercent] = useState<number>(100);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('original');
  const [quality, setQuality] = useState<number>(0.85);
  const [activePreset, setActivePreset] = useState<string>('');
  const [previewMax, setPreviewMax] = useState(400);

  // ── Load image ──────────────────────────────────────────────────────────

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPEG, GIF, WebP, SVG, etc.)');
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setImage({
        file,
        src: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type.replace('image/', '').toUpperCase(),
      });
      setTargetWidth(img.naturalWidth);
      setTargetHeight(img.naturalHeight);
      setPercent(100);
      setActivePreset('');
    };
    img.onerror = () => {
      toast.error('Failed to load image. Try a different file.');
    };
    img.src = url;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) loadImage(file);
    },
    [loadImage],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    },
    [loadImage],
  );

  // Paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            loadImage(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImage]);

  // ── Dimension updating with lock ────────────────────────────────────────

  const updateWidth = useCallback(
    (w: number) => {
      setTargetWidth(w);
      setActivePreset('');
      if (!image) return;
      if (lockMode === 'dimensions') {
        if (targetHeight > 0) {
          const ratio = image.width / image.height;
          setTargetHeight(Math.round(w / ratio));
        }
      }
      if (resizeMode === 'percent') {
        const p = Math.round((w / image.width) * 100);
        setPercent(p);
      }
    },
    [image, lockMode, resizeMode, targetHeight],
  );

  const updateHeight = useCallback(
    (h: number) => {
      setTargetHeight(h);
      setActivePreset('');
      if (!image) return;
      if (lockMode === 'dimensions') {
        if (targetWidth > 0) {
          const ratio = image.width / image.height;
          setTargetWidth(Math.round(h * ratio));
        }
      }
      if (resizeMode === 'percent') {
        const p = Math.round((h / image.height) * 100);
        setPercent(p);
      }
    },
    [image, lockMode, resizeMode, targetWidth],
  );

  const updatePercent = useCallback(
    (p: number) => {
      setPercent(p);
      setActivePreset('');
      if (!image) return;
      setTargetWidth(Math.round((image.width * p) / 100));
      setTargetHeight(Math.round((image.height * p) / 100));
    },
    [image],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      if (!image) return;
      const ratio = image.width / image.height;
      const presetRatio = preset.width / preset.height;

      if (ratio > 1.05 || ratio < 0.95) {
        // Different aspect ratio — fit inside
        let w = preset.width;
        let h = preset.height;
        if (ratio > presetRatio) {
          // image is wider — fit height
          h = preset.height;
          w = Math.round(h * ratio);
        } else {
          w = preset.width;
          h = Math.round(w / ratio);
        }
        setTargetWidth(w);
        setTargetHeight(h);
      } else {
        setTargetWidth(preset.width);
        setTargetHeight(preset.height);
      }
      setPercent(Math.round((targetWidth / image.width) * 100) || 100);
      setActivePreset(preset.label);
      setResizeMode('exact');
    },
    [image, targetWidth],
  );

  // ── Compute resized dimensions with limits ──────────────────────────────

  const clampedWidth = Math.min(Math.max(targetWidth, 1), 20000);
  const clampedHeight = Math.min(Math.max(targetHeight, 1), 20000);

  const scaleUp = clampedWidth > (image?.width ?? 0) || clampedHeight > (image?.height ?? 0);

  // ── Compute estimated output size ──────────────────────────────────────

  const getEstimatedSize = useCallback((): number | null => {
    if (!image) return null;
    const origPixels = image.width * image.height;
    const newPixels = clampedWidth * clampedHeight;

    // For PNG: roughly byte per pixel based on complexity; for JPEG/WebP: quality matters
    const format = outputFormat === 'original' ? image.file.type : `image/${outputFormat}`;

    if (format.includes('png')) {
      // PNG is roughly 2-5 bytes per pixel for photos
      return Math.round(newPixels * 0.25);
    }
    if (format.includes('webp')) {
      return Math.round(newPixels * quality * 0.08);
    }
    // JPEG
    return Math.round(newPixels * quality * 0.12);
  }, [image, clampedWidth, clampedHeight, outputFormat, quality]);

  // ── Download ───────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = clampedWidth;
    canvas.height = clampedHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, clampedWidth, clampedHeight);

      let mimeType: string;
      if (outputFormat === 'original') {
        mimeType = image.file.type;
      } else if (outputFormat === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (outputFormat === 'png') {
        mimeType = 'image/png';
      } else {
        mimeType = 'image/webp';
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error('Failed to generate image. Try a different format.');
            return;
          }
          const extension = mimeType.split('/')[1];
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `resized-image-${clampedWidth}x${clampedHeight}.${extension}`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`Downloaded ${clampedWidth}×${clampedHeight} ${formatSize(blob.size)}`);
        },
        mimeType,
        mimeType === 'image/jpeg' || mimeType === 'image/webp' ? quality : undefined,
      );
    };
    img.onerror = () => toast.error('Failed to process image.');
    img.src = image.src;
  }, [image, clampedWidth, clampedHeight, outputFormat, quality]);

  // ── Copy to clipboard ──────────────────────────────────────────────────

  const handleCopy = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = clampedWidth;
    canvas.height = clampedHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, clampedWidth, clampedHeight);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to copy image.');
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          toast.success('Resized image copied to clipboard!');
        } catch {
          toast.error('Clipboard copy not supported in this browser.');
        }
      });
    };
    img.src = image.src;
  }, [image, clampedWidth, clampedHeight]);

  const handleClear = useCallback(() => {
    if (image) URL.revokeObjectURL(image.src);
    setImage(null);
    setTargetWidth(0);
    setTargetHeight(0);
    setPercent(100);
    setActivePreset('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [image]);

  const estimatedSize = getEstimatedSize();

  return (
    <ToolLayout
      title="Image Resizer"
      description="Resize images to exact dimensions, scale by percentage, or apply social media presets — 100% client-side, instant download."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Upload ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !image && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all min-h-[220px] flex flex-col items-center justify-center gap-3 ${
              dragOver
                ? 'border-brand-400 bg-brand-500/10'
                : 'border-slate-600/50 hover:border-slate-500 hover:bg-surface-lighter'
            }`}
          >
            {image ? (
              <>
                <img
                  src={image.src}
                  alt="Original"
                  className="max-w-full rounded-lg shadow-lg"
                  style={{ maxHeight: `${previewMax}px` }}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Original: {image.width}×{image.height} — {image.format} — {formatSize(image.file.size)}
                </p>
                <p className="text-xs text-slate-600">Click to replace • Drag & drop • Paste (Ctrl+V)</p>
              </>
            ) : (
              <>
                <Upload className={`w-12 h-12 ${dragOver ? 'text-brand-400' : 'text-slate-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${dragOver ? 'text-brand-400' : 'text-slate-400'}`}>
                    {dragOver ? 'Drop image here' : 'Drop an image or click to browse'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">PNG, JPEG, GIF, WebP, SVG, BMP • paste from clipboard too</p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {image && (
            <>
              {/* Presets */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-400" />
                  Social Media &amp; Common Presets
                </h3>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                        activePreset === preset.label
                          ? 'bg-brand-500/15 text-brand-300 border-brand-500/40'
                          : 'bg-surface-lighter text-slate-400 border-slate-700/40 hover:border-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {preset.icon}
                      {preset.label}
                      <span className="text-slate-600 font-mono ml-0.5">
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimension controls */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-400" />
                  Resize Settings
                </h3>

                <div className="card bg-surface-lighter border-slate-700/30 space-y-4">
                  {/* Mode toggle */}
                  <div className="flex gap-1 p-1 rounded-lg bg-surface border border-slate-700/30 inline-flex">
                    <button
                      onClick={() => {
                        setResizeMode('exact');
                        setTargetWidth(image.width);
                        setTargetHeight(image.height);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        resizeMode === 'exact'
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5 inline mr-1" />
                      Exact Pixels
                    </button>
                    <button
                      onClick={() => {
                        setResizeMode('percent');
                        setPercent(100);
                        setTargetWidth(image.width);
                        setTargetHeight(image.height);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        resizeMode === 'percent'
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5 inline mr-1" />
                      Percentage
                    </button>
                  </div>

                  {resizeMode === 'exact' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Width (px)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={targetWidth}
                            onChange={(e) => updateWidth(Number(e.target.value))}
                            min={1}
                            max={20000}
                            className="input-field w-full text-sm"
                          />
                          <Maximize2 className="w-4 h-4 text-slate-600 shrink-0" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Height (px)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={targetHeight}
                            onChange={(e) => updateHeight(Number(e.target.value))}
                            min={1}
                            max={20000}
                            className="input-field w-full text-sm"
                          />
                          <Minimize2 className="w-4 h-4 text-slate-600 shrink-0" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">
                        Scale: <span className="text-slate-300 font-medium">{percent}%</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          value={percent}
                          onChange={(e) => updatePercent(Number(e.target.value))}
                          min={1}
                          max={500}
                          className="flex-1 accent-brand-500"
                        />
                        <input
                          type="number"
                          value={percent}
                          onChange={(e) => updatePercent(Number(e.target.value))}
                          min={1}
                          max={500}
                          className="input-field w-20 text-sm text-center"
                        />
                        <span className="text-xs text-slate-600">%</span>
                      </div>
                    </div>
                  )}

                  {/* Aspect ratio lock toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setLockMode((l) => (l === 'dimensions' ? 'ratio' : 'dimensions'))
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                          lockMode === 'dimensions'
                            ? 'bg-brand-500/15 text-brand-300 border-brand-500/40'
                            : 'bg-surface-lighter text-slate-500 border-slate-700/30 hover:border-slate-500'
                        }`}
                      >
                        {lockMode === 'dimensions' ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        {lockMode === 'dimensions' ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
                      </button>
                      <span className="text-xs text-slate-600">
                        ({image.width}:{image.height} —{' '}
                        {(image.width / image.height).toFixed(2)}:1)
                      </span>
                    </div>
                  </div>

                  {scaleUp && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
                      <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                      Upscaling from {image.width}×{image.height} to {clampedWidth}×{clampedHeight}. Quality may degrade.
                    </div>
                  )}

                  {/* Output format & quality */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Output Format</label>
                      <select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                        className="input-field w-full text-sm cursor-pointer"
                      >
                        <option value="original">Original ({image.format})</option>
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Quality{' '}
                        {outputFormat === 'png' || outputFormat === 'original'
                          ? '(PNG only)'
                          : `(${Math.round(quality * 100)}%)`}
                      </label>
                      <input
                        type="range"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        min={0.05}
                        max={1}
                        step={0.05}
                        className="w-full accent-brand-500"
                      />
                    </div>
                  </div>

                  {/* Info bar */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 pt-2 border-t border-slate-700/30">
                    <span>
                      Target: <span className="text-slate-300 font-mono">{clampedWidth}×{clampedHeight}</span>
                    </span>
                    <span>
                      Original:{' '}
                      <span className="text-slate-300 font-mono">
                        {image.width}×{image.height}
                      </span>
                    </span>
                    {estimatedSize && (
                      <span>
                        Est. output:{' '}
                        <span className="text-slate-300 font-mono">
                          ~{formatSize(estimatedSize)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownload}
                  className="btn-primary flex items-center gap-1.5 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download {clampedWidth}×{clampedHeight}
                </button>
                <button
                  onClick={handleCopy}
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </button>
                <button
                  onClick={handleClear}
                  className="btn-secondary flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Preview ── */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileImage className="w-4 h-4 text-brand-400" />
            Resized Preview
          </h3>

          <div className="card bg-surface-lighter border-slate-700/30 min-h-[300px] flex items-center justify-center relative">
            {!image ? (
              <div className="text-center">
                <Image className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Upload an image<br />to see the resized preview</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center p-4">
                  <img
                    src={image.src}
                    alt="Resized preview"
                    className="rounded-lg transition-all"
                    style={{
                      width: `${Math.min(clampedWidth, 350)}px`,
                      height: 'auto',
                      aspectRatio: `${clampedWidth}/${clampedHeight}`,
                      maxHeight: '400px',
                      objectFit: 'contain',
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-3 font-mono">
                  {clampedWidth} × {clampedHeight} px
                  {scaleUp && (
                    <span className="text-amber-400 ml-1">(upscaled)</span>
                  )}
                </p>
                {estimatedSize && (
                  <p className="text-xs text-slate-600 mt-1">
                    ~{formatSize(estimatedSize)} — {outputFormat === 'original' ? image.format : outputFormat.toUpperCase()}
                  </p>
                )}
                <div className="mt-3">
                  <label className="text-xs text-slate-500">
                    Preview size:{' '}
                    <input
                      type="range"
                      min={100}
                      max={600}
                      value={previewMax}
                      onChange={(e) => setPreviewMax(Number(e.target.value))}
                      className="w-24 align-middle accent-brand-500"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          {image && (
            <div className="card bg-surface-lighter border-slate-700/30 space-y-2">
              <p className="text-xs font-medium text-slate-400">💡 Tips</p>
              <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                <li>Lock aspect ratio to maintain proportions when changing one dimension</li>
                <li>Use WebP for the smallest file size with good quality</li>
                <li>Presets include safe dimensions for each platform</li>
                <li>Images are processed entirely in your browser — no uploads</li>
              </ul>
            </div>
          )}

          {/* Hidden canvas for rendering */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </ToolLayout>
  );
}
