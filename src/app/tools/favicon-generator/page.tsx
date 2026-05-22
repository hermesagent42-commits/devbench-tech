'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Trash2, Grid, Palette, Eraser, Pipette, Undo, Redo } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Tool = 'brush' | 'eraser' | 'eyedropper';

interface PixelState {
  data: string[][];  // hex colors
  size: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c',
  '#292524', '#44403c', '#78716c', '#a8a29e', '#d6d3d1', '#e7e5e4',
];

const GRID_SIZES = [16, 32, 48, 64, 128];
const EXPORT_SIZES = [16, 32, 48, 64, 128, 256];

// ── Helpers ────────────────────────────────────────────────────────────────

function createEmptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 'transparent'));
}

function fillGridFromLarger(oldGrid: string[][], newSize: number): string[][] {
  const grid = createEmptyGrid(newSize);
  const ratio = oldGrid.length / newSize;
  for (let y = 0; y < newSize; y++) {
    for (let x = 0; x < newSize; x++) {
      const ox = Math.floor(x * ratio);
      const oy = Math.floor(y * ratio);
      if (oy < oldGrid.length && ox < oldGrid[0].length) {
        grid[y][x] = oldGrid[oy][ox];
      }
    }
  }
  return grid;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FaviconGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [gridSize, setGridSize] = useState(32);
  const [grid, setGrid] = useState<string[][]>(() => createEmptyGrid(32));
  const [activeColor, setActiveColor] = useState('#3b82f6');
  const [tool, setTool] = useState<Tool>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<PixelState[]>([]);
  const [redoStack, setRedoStack] = useState<PixelState[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const pushUndo = useCallback((g: string[][], size: number) => {
    setUndoStack((prev) => [...prev.slice(-49), { data: g.map((r) => [...r]), size }]);
    setRedoStack([]);
  }, []);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelSize = canvas.width / gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard for transparency
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const px = x * pixelSize;
        const py = y * pixelSize;
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#e5e5e5';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fillRect(px, py, pixelSize, pixelSize);
        // Draw pixel
        if (grid[y]?.[x] && grid[y][x] !== 'transparent') {
          ctx.fillStyle = grid[y][x];
          ctx.fillRect(px, py, pixelSize, pixelSize);
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      const pos = i * pixelSize;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }
  }, [grid, gridSize]);

  // Draw hover overlay
  const drawOverlay = useCallback((cell: { x: number; y: number } | null) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!cell) return;
    const pixelSize = canvas.width / gridSize;
    ctx.strokeStyle = tool === 'eyedropper' ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(cell.x * pixelSize + 1, cell.y * pixelSize + 1, pixelSize - 2, pixelSize - 2);
  }, [gridSize, tool]);

  useEffect(() => {
    drawCanvas();
    drawOverlay(hoveredCell);
  }, [drawCanvas, drawOverlay, hoveredCell]);

  // Handle canvas interactions
  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / (canvas.width / gridSize));
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / (canvas.height / gridSize));
      return {
        x: Math.min(gridSize - 1, Math.max(0, x)),
        y: Math.min(gridSize - 1, Math.max(0, y)),
      };
    },
    [gridSize],
  );

  const paintCell = useCallback(
    (cell: { x: number; y: number }) => {
      setGrid((prev) => {
        const color = tool === 'eraser' ? 'transparent' : activeColor;
        if (prev[cell.y][cell.x] === color) return prev;
        const next = prev.map((r) => [...r]);
        next[cell.y][cell.x] = color;
        return next;
      });
    },
    [tool, activeColor],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return; // left-click only
      const cell = getCellFromEvent(e);
      if (tool === 'eyedropper') {
        const picked = grid[cell.y]?.[cell.x];
        if (picked && picked !== 'transparent') {
          setActiveColor(picked);
          setTool('brush');
        }
        return;
      }
      pushUndo(grid, gridSize);
      setIsDrawing(true);
      paintCell(cell);
    },
    [tool, grid, gridSize, paintCell, pushUndo, getCellFromEvent],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromEvent(e);
      setHoveredCell(cell);
      if (isDrawing && tool !== 'eyedropper') {
        paintCell(cell);
      }
    },
    [isDrawing, tool, paintCell, getCellFromEvent],
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDrawing(false);
    setHoveredCell(null);
  }, []);

  // Touch support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(((touch.clientX - rect.left) * scaleX) / (canvas.width / gridSize));
      const y = Math.floor(((touch.clientY - rect.top) * scaleY) / (canvas.height / gridSize));
      const cell = {
        x: Math.min(gridSize - 1, Math.max(0, x)),
        y: Math.min(gridSize - 1, Math.max(0, y)),
      };
      if (tool === 'eyedropper') {
        const picked = grid[cell.y]?.[cell.x];
        if (picked && picked !== 'transparent') {
          setActiveColor(picked);
          setTool('brush');
        }
        return;
      }
      pushUndo(grid, gridSize);
      setIsDrawing(true);
      paintCell(cell);
    },
    [tool, grid, gridSize, paintCell, pushUndo],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawing || tool === 'eyedropper') return;
      const touch = e.touches[0];
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(((touch.clientX - rect.left) * scaleX) / (canvas.width / gridSize));
      const y = Math.floor(((touch.clientY - rect.top) * scaleY) / (canvas.height / gridSize));
      paintCell({
        x: Math.min(gridSize - 1, Math.max(0, x)),
        y: Math.min(gridSize - 1, Math.max(0, y)),
      });
    },
    [isDrawing, tool, gridSize, paintCell],
  );

  // Export
  const exportPNG = useCallback(
    (size: number) => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = size;
      offCanvas.height = size;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return;

      const pixelSize = size / gridSize;
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (grid[y]?.[x] && grid[y][x] !== 'transparent') {
            ctx.fillStyle = grid[y][x];
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          }
        }
      }

      // Trigger download
      offCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `favicon-${size}x${size}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    },
    [grid, gridSize],
  );

  const exportAll = useCallback(() => {
    EXPORT_SIZES.forEach((size) => {
      setTimeout(() => exportPNG(size), 100);
    });
    toast.success(`Exporting ${EXPORT_SIZES.length} sizes as PNG!`);
  }, [exportPNG]);

  // Actions
  const handleClear = useCallback(() => {
    if (grid.every((r) => r.every((c) => c === 'transparent'))) return;
    pushUndo(grid, gridSize);
    setGrid(createEmptyGrid(gridSize));
  }, [grid, gridSize, pushUndo]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, { data: grid.map((r) => [...r]), size: gridSize }]);
      setGrid(last.data);
      if (last.size !== gridSize) setGridSize(last.size);
      return prev.slice(0, -1);
    });
  }, [grid, gridSize]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      setUndoStack((u) => [...u, { data: grid.map((r) => [...r]), size: gridSize }]);
      setGrid(next.data);
      if (next.size !== gridSize) setGridSize(next.size);
      return prev.slice(0, -1);
    });
  }, [grid, gridSize]);

  const handleGridSizeChange = useCallback(
    (newSize: number) => {
      if (newSize === gridSize) return;
      pushUndo(grid, gridSize);
      setGrid(fillGridFromLarger(grid, newSize));
      setGridSize(newSize);
    },
    [grid, gridSize, pushUndo],
  );

  const hasContent = grid.some((r) => r.some((c) => c !== 'transparent'));

  return (
    <ToolLayout
      title="Favicon Generator"
      description="Design pixel-perfect favicons with a visual canvas editor. Draw with a brush, pick colors, and export in multiple sizes — 16×16 to 256×256, 100% client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* ── Left panel: controls ────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Tool selector */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Tool</h3>
            <div className="flex gap-2 flex-wrap">
              {([
                { id: 'brush' as const, icon: Palette, label: 'Brush' },
                { id: 'eraser' as const, icon: Eraser, label: 'Eraser' },
                { id: 'eyedropper' as const, icon: Pipette, label: 'Pick' },
              ]).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTool(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    tool === id
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                      : 'bg-surface text-slate-300 hover:bg-surface-light border border-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid size */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-brand-400" />
              Grid Size
            </h3>
            <div className="flex flex-wrap gap-2">
              {GRID_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => handleGridSizeChange(size)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all ${
                    gridSize === size
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-surface text-slate-400 hover:text-white border border-slate-700/50'
                  }`}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>

          {/* Color palette */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-brand-400" />
                Palette
              </h3>
              <div className="relative">
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => setActiveColor(e.target.value)}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                  title="Pick custom color"
                />
                <div
                  className="w-8 h-8 rounded-lg border-2 border-slate-600/50 cursor-pointer hover:border-brand-400/50 transition-colors"
                  style={{ backgroundColor: activeColor }}
                />
              </div>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setActiveColor(color);
                    setTool('brush');
                  }}
                  className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${
                    activeColor === color
                      ? 'border-white scale-110 ring-2 ring-white/20'
                      : 'border-slate-600/30 hover:border-slate-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color === '#ffffff' ? 'White' : color === '#000000' ? 'Black' : undefined}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="card space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="flex-1 btn-secondary flex items-center justify-center gap-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Undo className="w-4 h-4" />
                Undo
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="flex-1 btn-secondary flex items-center justify-center gap-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Redo className="w-4 h-4" />
                Redo
              </button>
            </div>
            <button
              onClick={handleClear}
              disabled={!hasContent}
              className="w-full btn-secondary flex items-center justify-center gap-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Clear Canvas
            </button>
          </div>

          {/* Export */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-brand-400" />
              Export
            </h3>
            <div className="space-y-2">
              <button
                onClick={exportAll}
                disabled={!hasContent}
                className="w-full btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download All Sizes (ZIP-like)
              </button>
              <div className="grid grid-cols-3 gap-1.5">
                {EXPORT_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => exportPNG(size)}
                    disabled={!hasContent}
                    className="px-2 py-1.5 rounded-lg text-xs font-mono bg-surface border border-slate-700/50 text-slate-400 hover:text-white hover:border-brand-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel: Canvas ──────────────────────────────────────── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">
              Canvas <span className="text-slate-500 font-normal">({gridSize}×{gridSize})</span>
            </span>
            <span className="text-xs text-slate-500">
              {tool === 'brush' && '🖌 Drawing'}
              {tool === 'eraser' && '🧹 Erasing'}
              {tool === 'eyedropper' && '💉 Picking color'}
            </span>
          </div>

          <div
            className="relative mx-auto rounded-lg overflow-hidden border-2 border-slate-700/50 bg-white"
            style={{ aspectRatio: '1/1', maxWidth: '480px', width: '100%' }}
          >
            <canvas
              ref={canvasRef}
              width={480}
              height={480}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            />
            <canvas
              ref={overlayRef}
              width={480}
              height={480}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>

          {/* Mini previews */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-xs text-slate-500">Live Preview:</span>
            {[16, 32, 48, 64].map((size) => (
              <div
                key={size}
                className="rounded border border-slate-700/50 bg-checkered overflow-hidden flex-shrink-0"
                style={{ width: size, height: size }}
              >
                <canvas
                  ref={(el) => {
                    if (!el) return;
                    const offCanvas = document.createElement('canvas');
                    offCanvas.width = size;
                    offCanvas.height = size;
                    const ctx = offCanvas.getContext('2d');
                    if (!ctx) return;
                    const ps = size / gridSize;
                    for (let y = 0; y < gridSize; y++) {
                      for (let x = 0; x < gridSize; x++) {
                        if (grid[y]?.[x] && grid[y][x] !== 'transparent') {
                          ctx.fillStyle = grid[y][x];
                          ctx.fillRect(x * ps, y * ps, Math.max(1, Math.ceil(ps)), Math.max(1, Math.ceil(ps)));
                        }
                      }
                    }
                    const targetCtx = el.getContext('2d');
                    if (targetCtx && el.width > 0) {
                      targetCtx.clearRect(0, 0, el.width, el.height);
                      targetCtx.drawImage(offCanvas, 0, 0);
                    }
                  }}
                  width={size}
                  height={size}
                  style={{ width: size, height: size }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
          <li>Start small (16×16 or 32×32) and scale up for best results.</li>
          <li>Use the color picker tool (💉) to sample colors directly from the canvas.</li>
          <li>Right-click a preset color to set it without switching to brush.</li>
          <li>Exported PNGs are crisp pixel-for-pixel replicas — no blurry scaling.</li>
          <li>All processing happens in your browser — your design never leaves your machine.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
