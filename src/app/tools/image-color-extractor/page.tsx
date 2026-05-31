'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Image,
  Upload,
  Copy,
  Trash2,
  X,
  Droplets,
  Palette,
  Download,
  RefreshCw,
  Check,
  Sparkles,
  SlidersHorizontal,
  Pipette,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  percentage: number;
}

// ── Color utilities ────────────────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(l * 100)];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === nr) h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6;
  else if (max === ng) h = ((nb - nr) / d + 2) / 6;
  else h = ((nr - ng) / d + 4) / 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return [
    parseInt(full.substring(0, 2), 16),
    parseInt(full.substring(2, 4), 16),
    parseInt(full.substring(4, 6), 16),
  ];
}

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── K-Means clustering for dominant colors ──────────────────────────────────

function extractColors(
  imageData: ImageData,
  numColors: number,
  sampleFactor: number = 1,
): ExtractedColor[] {
  const pixels = imageData.data;
  const totalPixels = imageData.width * imageData.height;

  // Sample pixels (every Nth pixel)
  const sampled: [number, number, number][] = [];
  for (let i = 0; i < pixels.length; i += 4 * sampleFactor) {
    // Skip transparent pixels
    if (pixels[i + 3] < 128) continue;
    sampled.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }

  if (sampled.length === 0) return [];

  // Initialize centroids using k-means++ initialization for better spread
  const centroids: [number, number, number][] = [];
  // First centroid: random
  centroids.push(sampled[Math.floor(Math.random() * sampled.length)]);

  // Remaining centroids: weighted by distance from existing centroids
  for (let c = 1; c < numColors; c++) {
    const distances = sampled.map((p) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const d =
          (p[0] - centroid[0]) ** 2 +
          (p[1] - centroid[1]) ** 2 +
          (p[2] - centroid[2]) ** 2;
        if (d < minDist) minDist = d;
      }
      return minDist;
    });
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < sampled.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroids.push(sampled[i]);
        break;
      }
    }
    if (centroids.length === c) centroids.push(sampled[0]);
  }

  // Run k-means iterations
  const MAX_ITERATIONS = 15;
  let assignments: number[] = [];
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Assign each pixel to nearest centroid
    assignments = sampled.map((p) => {
      let minDist = Infinity;
      let minIdx = 0;
      for (let i = 0; i < centroids.length; i++) {
        const d =
          (p[0] - centroids[i][0]) ** 2 +
          (p[1] - centroids[i][1]) ** 2 +
          (p[2] - centroids[i][2]) ** 2;
        if (d < minDist) {
          minDist = d;
          minIdx = i;
        }
      }
      return minIdx;
    });

    // Update centroids
    const newCentroids: [number, number, number][] = centroids.map(() => [
      0, 0, 0,
    ]);
    const counts = centroids.map(() => 0);
    for (let i = 0; i < sampled.length; i++) {
      const a = assignments[i];
      newCentroids[a][0] += sampled[i][0];
      newCentroids[a][1] += sampled[i][1];
      newCentroids[a][2] += sampled[i][2];
      counts[a]++;
    }

    let moved = false;
    for (let i = 0; i < centroids.length; i++) {
      if (counts[i] === 0) continue;
      const nr = Math.round(newCentroids[i][0] / counts[i]);
      const ng = Math.round(newCentroids[i][1] / counts[i]);
      const nb = Math.round(newCentroids[i][2] / counts[i]);
      if (
        Math.abs(nr - centroids[i][0]) > 1 ||
        Math.abs(ng - centroids[i][1]) > 1 ||
        Math.abs(nb - centroids[i][2]) > 1
      ) {
        moved = true;
      }
      centroids[i] = [nr, ng, nb];
    }
    if (!moved) break;
  }

  // Calculate percentages
  const counts = centroids.map(() => 0);
  for (const a of assignments) {
    counts[a]++;
  }
  const total = counts.reduce((a, b) => a + b, 0);

  // Build result sorted by frequency (descending)
  const result: ExtractedColor[] = centroids
    .map((c, i) => {
      const rgb: [number, number, number] = c;
      return {
        hex: rgbToHex(...c),
        rgb,
        hsl: rgbToHsl(...c),
        percentage: Math.round((counts[i] / total) * 100),
      };
    })
    .filter((c) => c.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  return result;
}

// ── Export helpers ──────────────────────────────────────────────────────────

function exportCSS(colors: ExtractedColor[]): string {
  return (
    ':root {\n' +
    colors
      .map(
        (c, i) =>
          `  --extracted-color-${i + 1}: ${c.hex};  /* ${c.percentage}% - ${hslToString(...c.hsl)} */`,
      )
      .join('\n') +
    '\n}'
  );
}

function exportTailwind(colors: ExtractedColor[]): string {
  return (
    '// tailwind.config.js extension\n' +
    'colors: {\n' +
    colors
      .map(
        (c, i) =>
          `  'extracted-${i + 1}': '${c.hex}',  // ${c.percentage}%`,
      )
      .join('\n') +
    '\n}'
  );
}

function exportJSON(colors: ExtractedColor[]): string {
  return JSON.stringify(
    colors.map((c) => ({
      hex: c.hex,
      rgb: c.rgb,
      hsl: c.hsl,
      hslString: hslToString(...c.hsl),
      percentage: c.percentage,
    })),
    null,
    2,
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ImageColorExtractorPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [numColors, setNumColors] = useState(8);
  const [sampleFactor, setSampleFactor] = useState(4);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handle file ─────────────────────────────────────────────────────────

  const processImage = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.');
        return;
      }

      setImageName(file.name);
      setLoading(true);
      setColors([]);
      setSelectedIndex(null);

      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        setImageSrc(src);
      };
      reader.onerror = () => toast.error('Failed to read file.');
      reader.readAsDataURL(file);
    },
    [],
  );

  // ── Extract colors when image or settings change ────────────────────────

  useEffect(() => {
    if (!imageSrc) return;

    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Scale down large images for performance
      const MAX_DIM = 400;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const extracted = extractColors(imageData, numColors, sampleFactor);
      setColors(extracted);
      setLoading(false);
    };
    img.onerror = () => {
      toast.error('Failed to load image.');
      setLoading(false);
    };
    img.src = imageSrc;
  }, [imageSrc, numColors, sampleFactor]);

  // ── Drag & drop ─────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processImage(file);
    },
    [processImage],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // ── Clipboard paste ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            processImage(blob);
          }
          break;
        }
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [processImage]);

  // ── Copy helpers ────────────────────────────────────────────────────────

  const copyHex = useCallback(async (hex: string) => {
    await navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast.success(`Copied ${hex}`);
    setTimeout(() => setCopiedHex(null), 1500);
  }, []);

  const copyRgb = useCallback(async (rgb: [number, number, number]) => {
    const s = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    await navigator.clipboard.writeText(s);
    toast.success(`Copied ${s}`);
  }, []);

  const copyHsl = useCallback(async (hsl: [number, number, number]) => {
    const s = hslToString(...hsl);
    await navigator.clipboard.writeText(s);
    toast.success(`Copied ${s}`);
  }, []);

  const copyAll = useCallback(
    async (format: 'css' | 'tailwind' | 'json') => {
      let text = '';
      if (format === 'css') text = exportCSS(colors);
      else if (format === 'tailwind') text = exportTailwind(colors);
      else text = exportJSON(colors);
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${format.toUpperCase()} export`);
    },
    [colors],
  );

  const downloadExport = useCallback(
    (format: 'css' | 'tailwind' | 'json') => {
      let text = '';
      let filename = '';
      let type = '';
      if (format === 'css') {
        text = exportCSS(colors);
        filename = `${imageName.replace(/\.[^.]+$/, '') || 'colors'}-palette.css`;
        type = 'text/css';
      } else if (format === 'tailwind') {
        text = exportTailwind(colors);
        filename = `${imageName.replace(/\.[^.]+$/, '') || 'colors'}-palette.js`;
        type = 'text/javascript';
      } else {
        text = exportJSON(colors);
        filename = `${imageName.replace(/\.[^.]+$/, '') || 'colors'}-palette.json`;
        type = 'application/json';
      }
      const blob = new Blob([text], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    },
    [colors, imageName],
  );

  // ── Clear ───────────────────────────────────────────────────────────────

  const clear = useCallback(() => {
    setImageSrc(null);
    setImageName('');
    setColors([]);
    setSelectedIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Contrast info ──────────────────────────────────────────────────────

  const contrastInfo = useMemo(() => {
    if (selectedIndex === null || !colors[selectedIndex]) return null;
    const selected = colors[selectedIndex];

    // Best text colors on this background: white or black
    const lum = luminance(...selected.rgb);
    const whiteContrast = contrastRatio(lum, 1); // white = 1
    const blackContrast = contrastRatio(lum, 0); // black = 0

    const onWhite = contrastRatio(1, lum);
    const onBlack = contrastRatio(0, lum);

    return {
      whiteText: {
        ratio: whiteContrast,
        passes: whiteContrast >= 4.5 ? 'AA' : whiteContrast >= 3 ? 'AA-large' : 'Fail',
        color: '#ffffff',
      },
      blackText: {
        ratio: blackContrast,
        passes: blackContrast >= 4.5 ? 'AA' : blackContrast >= 3 ? 'AA-large' : 'Fail',
        color: '#000000',
      },
    };
  }, [selectedIndex, colors]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Image Color Extractor"
      description="Upload an image and extract its dominant color palette using k-means clustering. Copy colors as HEX, RGB, or HSL — export to CSS, Tailwind, or JSON."
      controls={
        imageSrc ? (
          <>
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <label className="text-xs text-slate-400">Colors:</label>
            <select
              value={numColors}
              onChange={(e) => setNumColors(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            >
              {[3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <label className="text-xs text-slate-400 ml-2">Speed:</label>
            <select
              value={sampleFactor}
              onChange={(e) => setSampleFactor(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            >
              <option value={1}>Precise</option>
              <option value={2}>Balanced</option>
              <option value={4}>Fast</option>
              <option value={8}>Turbo</option>
            </select>
            <div className="ml-auto flex gap-2">
              <button
                onClick={clear}
                className="px-3 py-1 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                Clear
              </button>
            </div>
          </>
        ) : undefined
      }
    >
      {/* Hidden canvas for pixel extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Upload area */}
      {!imageSrc && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-brand-400 bg-brand-400/5 scale-[1.02]'
              : 'border-slate-600 hover:border-slate-500 bg-surface-light/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImage(file);
            }}
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-400/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-brand-400" />
            </div>
            <div>
              <p className="text-slate-200 font-medium text-lg">
                Drop an image here or click to browse
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Or paste an image from your clipboard (Ctrl/Cmd+V)
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Supports PNG, JPEG, WebP, GIF, BMP, SVG
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image + Palette view */}
      {imageSrc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image preview */}
          <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
              <Image className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 truncate flex-1">
                {imageName}
              </span>
              {loading && (
                <span className="text-xs text-brand-400 animate-pulse">
                  Analyzing...
                </span>
              )}
            </div>
            <div className="p-4 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWUyOTNCIiAvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWUyOTNCIiAvPjxyZWN0IHg9IjEwIiB5PSIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMyNDM0NDciIC8+PHJlY3QgeD0iMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzI0MzQ0NyIgLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiIC8+PC9zdmc+')]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={imageName}
                className="max-w-full max-h-[400px] rounded-lg object-contain"
              />
            </div>
          </div>

          {/* Color palette */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-5 h-5 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                {colors.length} Dominant Colors
              </h3>
            </div>

            {loading && (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: numColors }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-slate-800"
                  />
                ))}
              </div>
            )}

            {!loading && colors.length === 0 && (
              <p className="text-slate-500 text-sm py-8 text-center">
                No colors extracted. Try a different image.
              </p>
            )}

            {!loading && colors.length > 0 && (
              <>
                <div className="space-y-2">
                  {colors.map((color, i) => {
                    const isSelected = selectedIndex === i;
                    return (
                      <div
                        key={color.hex}
                        onClick={() =>
                          setSelectedIndex(isSelected ? null : i)
                        }
                        className={`rounded-lg border transition-all cursor-pointer overflow-hidden ${
                          isSelected
                            ? 'border-brand-400 ring-1 ring-brand-400/30'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-stretch h-14">
                          {/* Color swatch */}
                          <div
                            className="w-14 flex-shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: color.hex }}
                          >
                            <Pipette
                              className="w-4 h-4"
                              style={{
                                color:
                                  luminance(...color.rgb) > 0.5
                                    ? '#000'
                                    : '#fff',
                              }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 flex items-center px-3 py-2 min-w-0 bg-surface-light">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-semibold text-white">
                                  {color.hex.toUpperCase()}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {color.percentage}%
                                </span>
                              </div>
                              <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                                <span>
                                  rgb({color.rgb.join(', ')})
                                </span>
                                <span className="hidden sm:inline">
                                  {hslToString(...color.hsl)}
                                </span>
                              </div>
                            </div>

                            {/* Quick copy */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyHex(color.hex);
                              }}
                              className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                              title="Copy HEX"
                            >
                              {copiedHex === color.hex ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Percentage bar */}
                          <div
                            className="w-2 flex-shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                        </div>

                        {/* Expanded view */}
                        {isSelected && (
                          <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700 space-y-3">
                            {/* Copy buttons */}
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => copyHex(color.hex)}
                                className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
                              >
                                Copy HEX
                              </button>
                              <button
                                onClick={() => copyRgb(color.rgb)}
                                className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
                              >
                                Copy RGB
                              </button>
                              <button
                                onClick={() => copyHsl(color.hsl)}
                                className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
                              >
                                Copy HSL
                              </button>
                            </div>

                            {/* Contrast info */}
                            {contrastInfo && (
                              <div className="text-xs space-y-1.5">
                                <p className="text-slate-400 font-medium">
                                  Accessibility (WCAG)
                                </p>
                                <div className="flex gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-4 h-4 rounded border border-slate-600"
                                      style={{
                                        backgroundColor:
                                          contrastInfo.whiteText.color,
                                      }}
                                    />
                                    <span className="text-slate-300">
                                      White text:{' '}
                                      {contrastInfo.whiteText.ratio.toFixed(
                                        1,
                                      )}
                                      :1
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        contrastInfo.whiteText.passes ===
                                        'AA'
                                          ? 'bg-green-500/20 text-green-400'
                                          : contrastInfo.whiteText
                                                .passes === 'AA-large'
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-red-500/20 text-red-400'
                                      }`}
                                    >
                                      {contrastInfo.whiteText.passes}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-4 h-4 rounded border border-slate-600"
                                      style={{
                                        backgroundColor:
                                          contrastInfo.blackText.color,
                                      }}
                                    />
                                    <span className="text-slate-300">
                                      Black text:{' '}
                                      {contrastInfo.blackText.ratio.toFixed(
                                        1,
                                      )}
                                      :1
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        contrastInfo.blackText.passes ===
                                        'AA'
                                          ? 'bg-green-500/20 text-green-400'
                                          : contrastInfo.blackText
                                                .passes === 'AA-large'
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-red-500/20 text-red-400'
                                      }`}
                                    >
                                      {contrastInfo.blackText.passes}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Export controls */}
                <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-medium">
                    Export Palette
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => copyAll('css')}
                      className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600 flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> CSS
                    </button>
                    <button
                      onClick={() => copyAll('tailwind')}
                      className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600 flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> Tailwind
                    </button>
                    <button
                      onClick={() => copyAll('json')}
                      className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600 flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> JSON
                    </button>
                    <button
                      onClick={() => downloadExport('css')}
                      className="px-3 py-1.5 text-xs rounded bg-brand-400/10 hover:bg-brand-400/20 text-brand-400 transition-colors border border-brand-400/20 flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3" /> CSS
                    </button>
                    <button
                      onClick={() => downloadExport('json')}
                      className="px-3 py-1.5 text-xs rounded bg-brand-400/10 hover:bg-brand-400/20 text-brand-400 transition-colors border border-brand-400/20 flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3" /> JSON
                    </button>
                  </div>
                </div>

                {/* Color bar visualization */}
                <div className="mt-3 flex rounded-lg overflow-hidden h-3">
                  {colors.map((color) => (
                    <div
                      key={color.hex}
                      style={{
                        backgroundColor: color.hex,
                        width: `${color.percentage}%`,
                      }}
                      title={`${color.hex} — ${color.percentage}%`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
