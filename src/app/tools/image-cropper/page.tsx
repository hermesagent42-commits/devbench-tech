'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Upload, Download, RotateCcw, ZoomIn, ZoomOut, Scissors, Crop as CropIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type HandleType =
  | 'nw' | 'ne' | 'sw' | 'se'
  | 'n' | 's' | 'e' | 'w'
  | 'move'
  | null;

interface DragState {
  type: HandleType;
  startMouseX: number;
  startMouseY: number;
  startRect: CropRect;
}

interface AspectPreset {
  label: string;
  ratio: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CANVAS_DISPLAY_SIZE = 640;
const MIN_CROP_SIZE = 40;
const HANDLE_SIZE = 10;

const ASPECT_PRESETS: AspectPreset[] = [
  { label: 'Freeform', ratio: null },
  { label: '1:1 Square', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '2:3', ratio: 2 / 3 },
  { label: '3:4', ratio: 3 / 4 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function constrainRect(rect: CropRect, maxW: number, maxH: number, aspectRatio: number | null): CropRect {
  let { x, y, width, height } = rect;

  x = clamp(x, 0, maxW - MIN_CROP_SIZE);
  y = clamp(y, 0, maxH - MIN_CROP_SIZE);
  width = clamp(width, MIN_CROP_SIZE, maxW - x);
  height = clamp(height, MIN_CROP_SIZE, maxH - y);

  if (aspectRatio !== null) {
    const targetH = width / aspectRatio;
    if (targetH <= maxH - y) {
      height = targetH;
    } else {
      height = maxH - y;
      width = height * aspectRatio;
      if (width > maxW - x) {
        width = maxW - x;
        height = width / aspectRatio;
        if (height > maxH - y) {
          height = maxH - y;
        }
      }
    }
  }

  if (x + width > maxW) {
    width = maxW - x;
    if (aspectRatio !== null) height = width / aspectRatio;
  }
  if (y + height > maxH) {
    height = maxH - y;
    if (aspectRatio !== null) width = height * aspectRatio;
  }

  width = clamp(width, MIN_CROP_SIZE, maxW);
  height = clamp(height, MIN_CROP_SIZE, maxH);

  return { x, y, width, height };
}

function getHandleType(mx: number, my: number, rect: CropRect): HandleType {
  const { x, y, width, height } = rect;
  const h = HANDLE_SIZE;
  const margin = 6;

  // Corners
  if (Math.abs(mx - x) <= h + margin && Math.abs(my - y) <= h + margin) return 'nw';
  if (Math.abs(mx - (x + width)) <= h + margin && Math.abs(my - y) <= h + margin) return 'ne';
  if (Math.abs(mx - x) <= h + margin && Math.abs(my - (y + height)) <= h + margin) return 'sw';
  if (Math.abs(mx - (x + width)) <= h + margin && Math.abs(my - (y + height)) <= h + margin) return 'se';

  // Edges
  if (Math.abs(mx - x) <= h + margin && my > y + h + margin && my < y + height - h - margin) return 'w';
  if (Math.abs(mx - (x + width)) <= h + margin && my > y + h + margin && my < y + height - h - margin) return 'e';
  if (Math.abs(my - y) <= h + margin && mx > x + h + margin && mx < x + width - h - margin) return 'n';
  if (Math.abs(my - (y + height)) <= h + margin && mx > x + h + margin && mx < x + width - h - margin) return 's';

  // Inside
  if (mx > x + h && mx < x + width - h && my > y + h && my < y + height - h) return 'move';

  return null;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ImageCropperPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 200, height: 200 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate image display dimensions
  const displayDims = useMemo(() => {
    if (!image) return { width: CANVAS_DISPLAY_SIZE, height: CANVAS_DISPLAY_SIZE };
    const scale = Math.min(CANVAS_DISPLAY_SIZE / image.naturalWidth, CANVAS_DISPLAY_SIZE / image.naturalHeight) * zoom;
    return {
      width: Math.round(image.naturalWidth * scale),
      height: Math.round(image.naturalHeight * scale),
    };
  }, [image, zoom]);

  // Scale factor from display to image coords
  const scaleFactor = useMemo(() => {
    if (!image) return 1;
    return image.naturalWidth / displayDims.width;
  }, [image, displayDims]);

  // ── Load image ──────────────────────────────────────────────────────

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        setImage(img);
        setImageName(file.name);
        setZoom(1);
        setShowPreview(false);
        // Initialize crop to center 60%
        const initialW = Math.round(img.naturalWidth * 0.6);
        const initialH = Math.round(img.naturalHeight * 0.6);
        const initialX = Math.round((img.naturalWidth - initialW) / 2);
        const initialY = Math.round((img.naturalHeight - initialH) / 2);
        setCropRect(constrainRect(
          { x: initialX, y: initialY, width: initialW, height: initialH },
          img.naturalWidth,
          img.naturalHeight,
          null,
        ));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Draw canvas ─────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = displayDims.width;
    canvas.height = displayDims.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, displayDims.width, displayDims.height);

    // Darken overlay outside crop
    const { x, y, width, height } = cropRect;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the crop area
    ctx.clearRect(x, y, width, height);
    ctx.drawImage(image, x * scaleFactor, y * scaleFactor, width * scaleFactor, height * scaleFactor, x, y, width, height);

    // Draw crop border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    // Thirds
    for (let i = 1; i < 3; i++) {
      const gx = x + (width * i) / 3;
      const gy = y + (height * i) / 3;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + width, gy);
      ctx.stroke();
    }

    // Draw handles
    ctx.setLineDash([]);
    const handles: { hx: number; hy: number }[] = [
      { hx: x, hy: y },
      { hx: x + width / 2, hy: y },
      { hx: x + width, hy: y },
      { hx: x + width, hy: y + height / 2 },
      { hx: x + width, hy: y + height },
      { hx: x + width / 2, hy: y + height },
      { hx: x, hy: y + height },
      { hx: x, hy: y + height / 2 },
    ];

    handles.forEach(({ hx, hy }) => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.stroke();
    });

    // Draw info text
    const imageCropW = Math.round(cropRect.width * scaleFactor);
    const imageCropH = Math.round(cropRect.height * scaleFactor);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    const infoText = `${imageCropW} × ${imageCropH}`;
    const textMetrics = ctx.measureText(infoText);
    const tx = x + 8;
    const ty = y + height - 8;
    ctx.strokeText(infoText, tx, ty);
    ctx.fillText(infoText, tx, ty);
  }, [image, cropRect, displayDims, scaleFactor]);

  // ── Mouse handlers ──────────────────────────────────────────────────

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;
    const { x, y } = getCanvasCoords(e);
    const handleType = getHandleType(x, y, cropRect);

    if (handleType) {
      setDragState({
        type: handleType,
        startMouseX: x,
        startMouseY: y,
        startRect: { ...cropRect },
      });
    } else {
      // Start new crop region
      setDragState({
        type: 'se',
        startMouseX: x,
        startMouseY: y,
        startRect: { x, y, width: 0, height: 0 },
      });
    }
  }, [image, cropRect, getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const { x, y } = getCanvasCoords(e);

    // Update cursor
    if (!dragState) {
      const handleType = getHandleType(x, y, cropRect);
      const cursors: Record<string, string> = {
        nw: 'nwse-resize', se: 'nwse-resize',
        ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize',
        e: 'ew-resize', w: 'ew-resize',
        move: 'move',
      };
      canvas.style.cursor = cursors[handleType ?? ''] || 'crosshair';
      return;
    }

    const maxW = displayDims.width;
    const maxH = displayDims.height;
    const dx = x - dragState.startMouseX;
    const dy = y - dragState.startMouseY;
    const { x: sx, y: sy, width: sw, height: sh } = dragState.startRect;

    let newRect: CropRect = { x: sx, y: sy, width: sw, height: sh };

    switch (dragState.type) {
      case 'move':
        newRect.x = clamp(sx + dx, 0, maxW - sw);
        newRect.y = clamp(sy + dy, 0, maxH - sh);
        break;
      case 'nw':
        newRect.x = clamp(sx + dx, 0, sx + sw - MIN_CROP_SIZE);
        newRect.y = clamp(sy + dy, 0, sy + sh - MIN_CROP_SIZE);
        newRect.width = sx + sw - newRect.x;
        newRect.height = sy + sh - newRect.y;
        break;
      case 'ne':
        newRect.y = clamp(sy + dy, 0, sy + sh - MIN_CROP_SIZE);
        newRect.width = clamp(sw + dx, MIN_CROP_SIZE, maxW - sx);
        newRect.height = sy + sh - newRect.y;
        break;
      case 'sw':
        newRect.x = clamp(sx + dx, 0, sx + sw - MIN_CROP_SIZE);
        newRect.width = sx + sw - newRect.x;
        newRect.height = clamp(sh + dy, MIN_CROP_SIZE, maxH - sy);
        break;
      case 'se':
        newRect.width = clamp(sw + dx, MIN_CROP_SIZE, maxW - sx);
        newRect.height = clamp(sh + dy, MIN_CROP_SIZE, maxH - sy);
        break;
      case 'n':
        newRect.y = clamp(sy + dy, 0, sy + sh - MIN_CROP_SIZE);
        newRect.height = sy + sh - newRect.y;
        break;
      case 's':
        newRect.height = clamp(sh + dy, MIN_CROP_SIZE, maxH - sy);
        break;
      case 'e':
        newRect.width = clamp(sw + dx, MIN_CROP_SIZE, maxW - sx);
        break;
      case 'w':
        newRect.x = clamp(sx + dx, 0, sx + sw - MIN_CROP_SIZE);
        newRect.width = sx + sw - newRect.x;
        break;
    }

    setCropRect(constrainRect(newRect, maxW, maxH, aspectRatio));
  }, [image, dragState, cropRect, displayDims, aspectRatio, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // ── Crop action ─────────────────────────────────────────────────────

  const handleCrop = useCallback(() => {
    if (!image) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const imageCropX = Math.round(cropRect.x * scaleFactor);
    const imageCropY = Math.round(cropRect.y * scaleFactor);
    const imageCropW = Math.round(cropRect.width * scaleFactor);
    const imageCropH = Math.round(cropRect.height * scaleFactor);

    canvas.width = imageCropW;
    canvas.height = imageCropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, imageCropX, imageCropY, imageCropW, imageCropH, 0, 0, imageCropW, imageCropH);

    setShowPreview(true);
    toast.success('Image cropped!');
  }, [image, cropRect, scaleFactor]);

  const handleDownload = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const ext = imageName.split('.').pop() || 'png';
    link.download = imageName.replace(/\.\w+$/, '') + '-cropped.' + ext;
    link.href = canvas.toDataURL(`image/${ext === 'jpg' ? 'jpeg' : 'png'}`, 0.95);
    link.click();
    toast.success('Downloaded!');
  }, [imageName]);

  const handleReset = useCallback(() => {
    setImage(null);
    setImageName('');
    setZoom(1);
    setShowPreview(false);
    setAspectRatio(null);
    setCropRect({ x: 0, y: 0, width: 200, height: 200 });
  }, []);

  // ── Zoom ────────────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), []);

  // ── Aspect ratio change ─────────────────────────────────────────────

  const handleAspectChange = useCallback((ratio: number | null) => {
    setAspectRatio(ratio);
    if (ratio !== null && image) {
      setCropRect((prev) =>
        constrainRect(prev, displayDims.width, displayDims.height, ratio),
      );
    }
  }, [image, displayDims]);

  // ── Drag & drop ─────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  }, [loadImage]);

  // ── Keyboard: Escape resets drag ────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDragState(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────

  const imageCropW = image ? Math.round(cropRect.width * scaleFactor) : 0;
  const imageCropH = image ? Math.round(cropRect.height * scaleFactor) : 0;

  return (
    <ToolLayout
      title="Image Cropper"
      description="Upload an image, drag to define the crop area, and export. Aspect ratio lock, zoom, rule-of-thirds grid, and instant preview."
      controls={
        image ? (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <button
              onClick={handleZoomOut}
              className="icon-btn"
              title="Zoom out"
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 tabular-nums min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="icon-btn"
              title="Zoom in"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="text-slate-600 mx-2">|</span>

            <select
              value={aspectRatio === null ? 'free' : String(aspectRatio)}
              onChange={(e) => {
                const v = e.target.value;
                handleAspectChange(v === 'free' ? null : parseFloat(v));
              }}
              className="input text-xs py-1 px-2 w-auto"
            >
              {ASPECT_PRESETS.map((p) => (
                <option key={p.label} value={p.ratio === null ? 'free' : String(p.ratio)}>
                  {p.label}
                </option>
              ))}
            </select>

            <span className="flex-1" />

            <button onClick={handleCrop} className="btn-primary text-sm">
              <Scissors className="w-4 h-4" />
              Crop
            </button>
            <button onClick={handleReset} className="icon-btn text-slate-400 hover:text-red-400" title="Reset">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Upload area */}
        {!image && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
              isDraggingOver
                ? 'border-brand-400 bg-brand-500/10'
                : 'border-slate-600 hover:border-slate-500 hover:bg-surface-light'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto text-slate-500 mb-4" />
            <p className="text-slate-300 text-lg font-medium mb-1">
              Drop an image here or click to browse
            </p>
            <p className="text-slate-500 text-sm">
              Supports JPG, PNG, GIF, WebP, SVG, BMP
            </p>
          </div>
        )}

        {/* Canvas */}
        {image && (
          <>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={displayDims.width}
                height={displayDims.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="max-w-full h-auto rounded-lg border border-slate-700 cursor-crosshair touch-none"
                style={{ maxHeight: '70vh' }}
              />
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>Crop size: <strong className="text-slate-200">{imageCropW} × {imageCropH}</strong> px</span>
              <span>|</span>
              <span>Original: <strong className="text-slate-200">{image.naturalWidth} × {image.naturalHeight}</strong> px</span>
            </div>
          </>
        )}

        {/* Preview */}
        {showPreview && (
          <div className="p-6 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <CropIcon className="w-5 h-5 text-brand-400" />
              Cropped Preview
            </h3>
            <div className="flex flex-col items-center gap-4">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full h-auto rounded-lg border border-slate-600"
                style={{ maxHeight: '400px' }}
              />
              <button onClick={handleDownload} className="btn-primary">
                <Download className="w-4 h-4" />
                Download Cropped Image
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
