'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, RefreshCw, Image, Type } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Shape = 'square' | 'rounded' | 'circle';
type Preset = { name: string; bg: string; fg: string; shape: Shape };

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  { name: 'Classic', bg: '#3B82F6', fg: '#FFFFFF', shape: 'rounded' },
  { name: 'Dark Mode', bg: '#1E293B', fg: '#38BDF8', shape: 'rounded' },
  { name: 'Neon', bg: '#0F172A', fg: '#22D3EE', shape: 'circle' },
  { name: 'Fire', bg: '#DC2626', fg: '#FEF3C7', shape: 'rounded' },
  { name: 'Forest', bg: '#166534', fg: '#BBF7D0', shape: 'rounded' },
  { name: 'Purple Haze', bg: '#7C3AED', fg: '#EDE9FE', shape: 'circle' },
  { name: 'Sunset', bg: '#EA580C', fg: '#FFF7ED', shape: 'rounded' },
  { name: 'Mint', bg: '#059669', fg: '#FFFFFF', shape: 'square' },
  { name: 'Midnight', bg: '#020617', fg: '#A78BFA', shape: 'rounded' },
  { name: 'Coral', bg: '#E11D48', fg: '#FFFFFF', shape: 'circle' },
];

const SIZES = [16, 32, 48, 64, 128, 256];

// ── Canvas Rendering ──────────────────────────────────────────────────────

function renderFavicon(
  canvas: HTMLCanvasElement,
  text: string,
  bgColor: string,
  fgColor: string,
  shape: Shape,
  fontSize: number,
  size: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  // Clear
  ctx.clearRect(0, 0, size, size);

  // Draw background shape
  ctx.beginPath();
  const margin = 0;
  if (shape === 'circle') {
    const r = size / 2 - margin;
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  } else if (shape === 'rounded') {
    const r = size * 0.2;
    ctx.moveTo(r + margin, margin);
    ctx.lineTo(size - r - margin, margin);
    ctx.quadraticCurveTo(size - margin, margin, size - margin, r + margin);
    ctx.lineTo(size - margin, size - r - margin);
    ctx.quadraticCurveTo(size - margin, size - margin, size - r - margin, size - margin);
    ctx.lineTo(r + margin, size - margin);
    ctx.quadraticCurveTo(margin, size - margin, margin, size - r - margin);
    ctx.lineTo(margin, r + margin);
    ctx.quadraticCurveTo(margin, margin, r + margin, margin);
    ctx.closePath();
  } else {
    ctx.rect(margin, margin, size - margin * 2, size - margin * 2);
  }
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Draw text
  if (text.trim()) {
    // Find the best character(s) to display
    const displayText = getDisplayText(text);
    
    // Calculate font size
    let displaySize = fontSize;
    if (displaySize <= 0) {
      displaySize = size * 0.55;
    }
    
    ctx.fillStyle = fgColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Use system sans-serif for clean rendering
    ctx.font = `bold ${displaySize}px system-ui, -apple-system, sans-serif`;
    
    // Measure and scale down if too wide
    let metrics = ctx.measureText(displayText);
    let adjustedSize = displaySize;
    if (metrics.width > size * 0.78) {
      adjustedSize = displaySize * ((size * 0.78) / metrics.width);
      ctx.font = `bold ${adjustedSize}px system-ui, -apple-system, sans-serif`;
    }
    
    ctx.fillText(displayText, size / 2, size / 2);
  }
}

function getDisplayText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // Check if it's likely an emoji (single character in the supplementary plane or common emoji range)
  const codePoint = trimmed.codePointAt(0);
  const isEmoji = codePoint !== undefined && (
    codePoint >= 0x1F300 || // Misc Symbols and Pictographs
    codePoint >= 0x1F600 || // Emoticons
    codePoint >= 0x1F900 || // Supplemental Symbols and Pictographs
    codePoint >= 0x2300 && codePoint <= 0x27BF // Miscellaneous Technical, Dingbats
  );
  
  if (isEmoji && (trimmed.length <= 2 || (trimmed.length > 2 && codePoint > 0xFFFF && trimmed.length <= 4))) {
    // Single emoji (may be 1 or 2 code units in UTF-16)
    return Array.from(trimmed).slice(0, 1).join('');
  }
  
  // Otherwise, take first 2 characters (usually initials)
  const letters = trimmed.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '');
  if (letters.length > 0) {
    return letters.slice(0, 2).toUpperCase();
  }
  
  return trimmed.slice(0, 1);
}

function downloadFavicon(canvas: HTMLCanvasElement, size: number) {
  // Create a temporary canvas at the exact size (no DPR scaling for export)
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = size;
  exportCanvas.height = size;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;
  
  ctx.drawImage(canvas, 0, 0, size, size);
  
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `favicon-${size}x${size}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function copyCanvasToClipboard(canvas: HTMLCanvasElement, size: number) {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = size;
  exportCanvas.height = size;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;
  
  ctx.drawImage(canvas, 0, 0, size, size);
  
  exportCanvas.toBlob(async (blob) => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy image');
    }
  }, 'image/png');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FaviconGeneratorPage() {
  const [text, setText] = useState('DB');
  const [bgColor, setBgColor] = useState('#3B82F6');
  const [fgColor, setFgColor] = useState('#FFFFFF');
  const [shape, setShape] = useState<Shape>('rounded');
  const [fontSize, setFontSize] = useState(0); // 0 = auto
  const [selectedSize, setSelectedSize] = useState(64);
  
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const largeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render previews
  useEffect(() => {
    if (previewCanvasRef.current) {
      renderFavicon(previewCanvasRef.current, text, bgColor, fgColor, shape, fontSize, selectedSize);
    }
    if (largeCanvasRef.current) {
      renderFavicon(largeCanvasRef.current, text, bgColor, fgColor, shape, fontSize, 256);
    }
  }, [text, bgColor, fgColor, shape, fontSize, selectedSize]);

  const handleDownload = useCallback(() => {
    if (previewCanvasRef.current) {
      downloadFavicon(previewCanvasRef.current, selectedSize);
      toast.success(`Downloaded ${selectedSize}×${selectedSize} PNG!`);
    }
  }, [selectedSize]);

  const handleCopy = useCallback(() => {
    if (previewCanvasRef.current) {
      copyCanvasToClipboard(previewCanvasRef.current, selectedSize);
    }
  }, [selectedSize]);

  const handlePreset = useCallback((preset: Preset) => {
    setBgColor(preset.bg);
    setFgColor(preset.fg);
    setShape(preset.shape);
  }, []);

  const handleReset = useCallback(() => {
    setText('DB');
    setBgColor('#3B82F6');
    setFgColor('#FFFFFF');
    setShape('rounded');
    setFontSize(0);
    setSelectedSize(64);
  }, []);

  const displayText = getDisplayText(text);

  return (
    <ToolLayout
      title="Favicon Generator"
      description="Design favicons with text, emoji, or initials. Pick colors, choose a shape, and export at any size — 100% client-side, no uploads needed."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Text / Emoji / Initials
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. DB, 🚀, Acme"
              maxLength={10}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-500"
            />
            {displayText && displayText !== text && (
              <p className="text-xs text-slate-500 mt-1">
                Displaying: <span className="text-brand-400 font-mono">{displayText}</span>
              </p>
            )}
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border-2 border-slate-600 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border-2 border-slate-600 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Shape */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Shape
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'square' as Shape, label: 'Square' },
                { value: 'rounded' as Shape, label: 'Rounded' },
                { value: 'circle' as Shape, label: 'Circle' },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setShape(value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    shape === value
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Size: {fontSize === 0 ? 'Auto' : `${fontSize}px`}
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Auto</span>
              <span>200px</span>
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Export Size
            </label>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    selectedSize === s
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 btn-primary inline-flex items-center justify-center gap-2 py-2.5"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 btn-secondary inline-flex items-center justify-center gap-2 py-2.5"
            >
              <Copy className="w-4 h-4" />
              Copy Image
            </button>
          </div>

          <button
            onClick={handleReset}
            className="w-full text-slate-500 hover:text-slate-300 text-sm inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Large Preview */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 flex flex-col items-center">
            <h3 className="text-sm font-medium text-slate-400 mb-6">Live Preview</h3>
            <div className="relative">
              {/* Checkerboard background to show transparency */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #334155 25%, transparent 25%),
                    linear-gradient(-45deg, #334155 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #334155 75%),
                    linear-gradient(-45deg, transparent 75%, #334155 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  padding: '32px',
                }}
              >
                <canvas
                  ref={largeCanvasRef}
                  className="block mx-auto"
                  style={{ width: '256px', height: '256px' }}
                />
              </div>
            </div>

            {/* Size previews at different scales */}
            <div className="mt-8 flex items-center gap-6 flex-wrap justify-center">
              {SIZES.map((s) => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`rounded-lg p-2 transition-all ${
                      selectedSize === s
                        ? 'bg-brand-500/10 ring-2 ring-brand-500/50'
                        : 'bg-slate-900/50'
                    }`}
                    style={{
                      backgroundImage: s <= 32 ? `
                        linear-gradient(45deg, #334155 25%, transparent 25%),
                        linear-gradient(-45deg, #334155 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #334155 75%),
                        linear-gradient(-45deg, transparent 75%, #334155 75%)
                      ` : undefined,
                      backgroundSize: s <= 32 ? '8px 8px' : undefined,
                      backgroundPosition: s <= 32 ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
                    }}
                  >
                    <canvas
                      ref={s === selectedSize ? previewCanvasRef : undefined}
                      width={s}
                      height={s}
                      className="block"
                      style={{ width: `${s}px`, height: `${s}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {s}px
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Presets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all text-left"
                >
                  <span
                    className="w-6 h-6 rounded flex-shrink-0 border border-slate-600"
                    style={{
                      backgroundColor: preset.bg,
                      borderRadius: preset.shape === 'circle' ? '50%' : preset.shape === 'rounded' ? '4px' : '0',
                    }}
                  />
                  <span className="text-xs text-slate-400 truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
