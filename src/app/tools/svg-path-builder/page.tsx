'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Trash2, Plus, Grid3X3, Eye, EyeOff, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

type Point = { x: number; y: number };
type PathCommand = {
  type: 'M' | 'L' | 'C' | 'Q' | 'A' | 'Z';
  points: Point[];
  relative: boolean;
  // Arc-specific
  rx?: number;
  ry?: number;
  xAxisRotation?: number;
  largeArc?: boolean;
  sweep?: boolean;
};

interface ShapeTemplate {
  name: string;
  path: string;
  viewBox: string;
}

const templates: ShapeTemplate[] = [
  {
    name: 'Triangle',
    path: 'M 50 10 L 90 90 L 10 90 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Heart',
    path: 'M 50 88 C 20 65, 5 40, 5 25 C 5 8, 25 -5, 50 15 C 75 -5, 95 8, 95 25 C 95 40, 80 65, 50 88 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Star',
    path: 'M 50 5 L 61 38 L 97 38 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 3 38 L 39 38 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Arrow Right',
    path: 'M 5 30 L 65 30 L 65 10 L 95 50 L 65 90 L 65 70 L 5 70 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Chevron',
    path: 'M 20 10 L 80 50 L 20 90',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Circle (arc)',
    path: 'M 50 10 A 40 40 0 1 1 49.9 10 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Rounded Rect',
    path: 'M 20 10 L 80 10 Q 90 10 90 20 L 90 80 Q 90 90 80 90 L 20 90 Q 10 90 10 80 L 10 20 Q 10 10 20 10 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Diamond',
    path: 'M 50 5 L 95 50 L 50 95 L 5 50 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Cross',
    path: 'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z',
    viewBox: '0 0 100 100',
  },
  {
    name: 'Moon',
    path: 'M 70 5 A 45 45 0 1 0 70 95 A 35 35 0 1 1 70 5 Z',
    viewBox: '0 0 100 100',
  },
];

const CANVAS_SIZE = 400;
const GRID_SIZE = 20;

export default function SvgPathBuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pathData, setPathData] = useState('M 50 10 L 90 90 L 10 90 Z');
  const [viewBox, setViewBox] = useState('0 0 100 100');
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillColor, setFillColor] = useState('#6366f1');
  const [fillOpacity, setFillOpacity] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [showHandles, setShowHandles] = useState(true);
  const [points, setPoints] = useState<Point[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [svgCode, setSvgCode] = useState('');

  // Parse path to points
  const parsePathToPoints = useCallback((d: string, vb: string): Point[] => {
    const pts: Point[] = [];
    const [vx, vy, vw, vh] = vb.split(/\s+/).map(Number);
    const scaleX = CANVAS_SIZE / vw;
    const scaleY = CANVAS_SIZE / vh;

    const tokens = d.match(/[MLCQAZmlcqaz]|[-+]?\d*\.?\d+/g) || [];
    let px = 0, py = 0;
    let i = 0;

    while (i < tokens.length) {
      const cmd = tokens[i];
      if (/[MLCQAZmlcqaz]/.test(cmd)) {
        const isRelative = cmd === cmd.toLowerCase();
        const upper = cmd.toUpperCase();

        if (upper === 'Z') {
          i++;
          continue;
        }

        const numArgs: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, A: 7 };
        const count = numArgs[upper] || 2;
        const args: number[] = [];

        for (let j = 1; j <= count && i + j < tokens.length; j++) {
          const n = parseFloat(tokens[i + j]);
          if (!isNaN(n)) args.push(n);
        }

        if (args.length >= 2) {
          let x = isRelative ? px + args[args.length - 2] : args[args.length - 2];
          let y = isRelative ? py + args[args.length - 1] : args[args.length - 1];
          pts.push({ x: (x - vx) * scaleX, y: (y - vy) * scaleY });
          if (upper === 'C' && args.length >= 6) {
            // Add control points too for bezier
            let cx1 = isRelative ? px + args[0] : args[0];
            let cy1 = isRelative ? py + args[1] : args[1];
            let cx2 = isRelative ? px + args[2] : args[2];
            let cy2 = isRelative ? py + args[3] : args[3];
            pts.push({ x: (cx1 - vx) * scaleX, y: (cy1 - vy) * scaleY });
            pts.push({ x: (cx2 - vx) * scaleX, y: (cy2 - vy) * scaleY });
          } else if (upper === 'Q' && args.length >= 4) {
            let cx = isRelative ? px + args[0] : args[0];
            let cy = isRelative ? py + args[1] : args[1];
            pts.push({ x: (cx - vx) * scaleX, y: (cy - vy) * scaleY });
          }
          px = x;
          py = y;
        }

        i += count + 1;
      } else {
        i++;
      }
    }
    return pts;
  }, []);

  // Generate SVG code
  const generateSvg = useCallback(() => {
    const ns = 'http://www.w3.org/2000/svg';
    const fill = fillOpacity > 0 ? ` fill="${fillColor}" fill-opacity="${fillOpacity / 100}"` : ' fill="none"';
    return `<svg xmlns="${ns}" viewBox="${viewBox}" width="400" height="400">
  <path d="${pathData}"${fill} stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
  }, [pathData, viewBox, strokeColor, strokeWidth, fillColor, fillOpacity]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_SIZE; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_SIZE; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_SIZE, y);
        ctx.stroke();
      }
    }

    // Draw the path
    const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
    const scaleX = CANVAS_SIZE / vw;
    const scaleY = CANVAS_SIZE / vh;

    // Create an SVG string and render via Path2D or manual parsing
    // Use the canvas to render via an offscreen SVG approach
    const img = new Image();
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">
      <path d="${pathData}" fill="${fillOpacity > 0 ? fillColor : 'none'}" fill-opacity="${fillOpacity / 100}" stroke="${strokeColor}" stroke-width="${strokeWidth * 2}" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // Draw handles
      if (showHandles) {
        const pts = parsePathToPoints(pathData, viewBox);
        setPoints(pts);
        pts.forEach((p, idx) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = idx === 0 ? '#22c55e' : '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    };
    img.src = url;
  }, [pathData, viewBox, strokeColor, strokeWidth, fillColor, fillOpacity, showGrid, showHandles, parsePathToPoints]);

  useEffect(() => {
    setSvgCode(generateSvg());
  }, [generateSvg]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showHandles || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = 0; i < points.length; i++) {
      const dx = mx - points[i].x;
      const dy = my - points[i].y;
      if (Math.sqrt(dx * dx + dy * dy) < 8) {
        setDragging(i);
        return;
      }
    }
  }, [points, showHandles]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Update the path point
    const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
    const scaleX = vw / CANVAS_SIZE;
    const scaleY = vh / CANVAS_SIZE;
    const newX = Math.round((mx * scaleX + vx) * 10) / 10;
    const newY = Math.round((my * scaleY + vy) * 10) / 10;

    // Parse path and update the point
    const tokens = pathData.match(/[MLCQAZmlcqaz]|[-+]?\d*\.?\d+/g) || [];
    const cmdIndices: number[] = [];
    tokens.forEach((t, i) => {
      if (/[MLCQAZmlcqaz]/.test(t)) cmdIndices.push(i);
    });

    // Find which command and arg index to update
    let cmdIdx = 0;
    let argOffset = 0;
    for (const ci of cmdIndices) {
      const upper = tokens[ci].toUpperCase();
      if (upper === 'Z') continue;
      const count = { M: 2, L: 2, C: 6, Q: 4, A: 7 }[upper] || 2;
      if (dragging >= cmdIdx && dragging < cmdIdx + 1) {
        // This command — update its endpoint (last x,y)
        const xIdx = ci + count - 1; // second-to-last arg
        const yIdx = ci + count;     // last arg
        if (yIdx < tokens.length) {
          tokens[xIdx] = String(newX);
          tokens[yIdx] = String(newY);
        }
        break;
      }
      cmdIdx++;
      argOffset += count;
    }

    const newPath = tokens.join(' ').replace(/\s+/g, ' ').trim();
    setPathData(newPath);
  }, [dragging, pathData, viewBox]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const copySvg = useCallback(() => {
    navigator.clipboard.writeText(svgCode).then(
      () => toast.success('SVG code copied!'),
      () => toast.error('Copy failed')
    );
  }, [svgCode]);

  const downloadSvg = useCallback(() => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'path.svg';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [svgCode]);

  const applyTemplate = useCallback((t: ShapeTemplate) => {
    setPathData(t.path);
    setViewBox(t.viewBox);
    toast.success(`Applied: ${t.name}`);
  }, []);

  const clearPath = useCallback(() => {
    setPathData('');
    toast.success('Cleared');
  }, []);

  const resetToDefault = useCallback(() => {
    setPathData('M 50 10 L 90 90 L 10 90 Z');
    setViewBox('0 0 100 100');
    setStrokeColor('#6366f1');
    setStrokeWidth(2);
    setFillColor('#6366f1');
    setFillOpacity(20);
    toast.success('Reset to default');
  }, []);

  // Parse current path to count commands for info
  const pathInfo = useMemo(() => {
    const tokens = pathData.match(/[MLCQAZmlcqaz]/g) || [];
    const count: Record<string, number> = {};
    tokens.forEach(t => {
      const u = t.toUpperCase();
      count[u] = (count[u] || 0) + 1;
    });
    return count;
  }, [pathData]);

  return (
    <ToolLayout
      title="SVG Path Builder"
      description="Visually build and edit SVG path data with live preview. Drag points, apply shape templates, and export production-ready SVG code."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Canvas */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Live Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-1.5 rounded-md transition-colors ${showGrid ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Toggle grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowHandles(!showHandles)}
                  className={`p-1.5 rounded-md transition-colors ${showHandles ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Toggle handles"
                >
                  {showHandles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={resetToDefault}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center bg-[#0a0f1a] rounded-lg p-4 border border-slate-700/50">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="cursor-crosshair rounded"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            {showHandles && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                <span className="text-green-400">●</span> Start point &nbsp;
                <span className="text-amber-400">●</span> Anchor points &nbsp;|&nbsp;
                Drag points to reshape
              </p>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="space-y-6">
          {/* Templates */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Shape Templates</h2>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => applyTemplate(t)}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-surface border border-slate-700/50 text-slate-300 hover:border-brand-500/50 hover:text-brand-400 transition-all text-left"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Style Controls */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Style</h2>

            <div className="space-y-4">
              {/* Stroke Color */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Stroke Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="input-field flex-1 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Stroke Width */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Stroke Width: {strokeWidth}px</label>
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* Fill Color */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Fill Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="input-field flex-1 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Fill Opacity */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Fill Opacity: {fillOpacity}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fillOpacity}
                  onChange={(e) => setFillOpacity(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Path Info */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Path Info</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              {Object.entries(pathInfo).map(([cmd, count]) => (
                <div key={cmd} className="bg-surface rounded-lg p-2 border border-slate-700/50">
                  <div className="text-brand-400 font-mono text-lg font-bold">{cmd}</div>
                  <div className="text-slate-500 text-[10px]">{count} command{count !== 1 ? 's' : ''}</div>
                </div>
              ))}
              {Object.keys(pathInfo).length === 0 && (
                <div className="col-span-3 text-slate-500 text-sm py-2">No path data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Path Data Editor */}
      <div className="mt-6 card">
        <h2 className="text-white font-semibold text-sm mb-3">Path Data (d attribute)</h2>
        <textarea
          value={pathData}
          onChange={(e) => setPathData(e.target.value)}
          className="input-field w-full h-24 resize-y font-mono text-sm"
          placeholder="M 50 10 L 90 90 L 10 90 Z"
          spellCheck={false}
        />
      </div>

      {/* ViewBox Editor */}
      <div className="mt-4 card">
        <h2 className="text-white font-semibold text-sm mb-3">ViewBox</h2>
        <input
          type="text"
          value={viewBox}
          onChange={(e) => setViewBox(e.target.value)}
          className="input-field w-full font-mono text-sm"
          placeholder="0 0 100 100"
          spellCheck={false}
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={copySvg} className="btn-primary flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Copy SVG
        </button>
        <button onClick={downloadSvg} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download .svg
        </button>
        <button onClick={clearPath} className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
          Clear Path
        </button>
      </div>

      {/* SVG Code Preview */}
      <div className="mt-6 card">
        <h2 className="text-white font-semibold text-sm mb-3">Generated SVG</h2>
        <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 overflow-x-auto font-mono text-xs text-slate-300">
          {svgCode}
        </pre>
      </div>

      {/* Reference */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-3">SVG Path Command Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {[
            { cmd: 'M x y', desc: 'Move to (absolute)', ex: 'M 10 20' },
            { cmd: 'm dx dy', desc: 'Move to (relative)', ex: 'm 5 10' },
            { cmd: 'L x y', desc: 'Line to (absolute)', ex: 'L 90 80' },
            { cmd: 'l dx dy', desc: 'Line to (relative)', ex: 'l 20 30' },
            { cmd: 'H x', desc: 'Horizontal line to', ex: 'H 100' },
            { cmd: 'V y', desc: 'Vertical line to', ex: 'V 80' },
            { cmd: 'C x1 y1, x2 y2, x y', desc: 'Cubic Bézier', ex: 'C 20 5, 80 5, 90 80' },
            { cmd: 'Q x1 y1, x y', desc: 'Quadratic Bézier', ex: 'Q 50 5, 90 80' },
            { cmd: 'A rx ry rot large sweep x y', desc: 'Arc', ex: 'A 40 40 0 0 1 90 80' },
            { cmd: 'Z', desc: 'Close path', ex: 'Z' },
          ].map(({ cmd, desc, ex }) => (
            <div key={cmd} className="bg-surface rounded-lg p-2.5 border border-slate-700/50">
              <code className="text-brand-400 font-mono font-semibold">{cmd}</code>
              <p className="text-slate-400 mt-0.5">{desc}</p>
              <code className="text-slate-500 text-[10px] block mt-1">{ex}</code>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
