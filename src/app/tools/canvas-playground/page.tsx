'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Play, Copy, Trash2, Maximize2, Minimize2, Code2, Palette, Download, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { name: string; description: string; code: string }[] = [
  {
    name: 'Gradient Sky',
    description: 'Linear gradient, sun, and hills',
    code: `// Gradient sky with sun and hills
const { width, height } = ctx.canvas;

// Sky gradient
const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
skyGrad.addColorStop(0, '#1a1a2e');
skyGrad.addColorStop(0.4, '#16213e');
skyGrad.addColorStop(0.7, '#e94560');
skyGrad.addColorStop(1, '#f5a623');
ctx.fillStyle = skyGrad;
ctx.fillRect(0, 0, width, height);

// Sun
ctx.beginPath();
ctx.arc(width * 0.75, height * 0.35, 50, 0, Math.PI * 2);
ctx.fillStyle = '#fff3b0';
ctx.fill();
ctx.shadowColor = '#fff3b0';
ctx.shadowBlur = 30;
ctx.fill();
ctx.shadowBlur = 0;

// Hills
ctx.beginPath();
ctx.moveTo(0, height * 0.85);
ctx.quadraticCurveTo(width * 0.25, height * 0.55, width * 0.5, height * 0.75);
ctx.quadraticCurveTo(width * 0.75, height * 0.6, width, height * 0.8);
ctx.lineTo(width, height);
ctx.lineTo(0, height);
ctx.closePath();
ctx.fillStyle = '#2d1b4e';
ctx.fill();

// Stars (random dots)
for (let i = 0; i < 80; i++) {
  const x = Math.random() * width;
  const y = Math.random() * height * 0.5;
  const r = Math.random() * 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = \`rgba(255,255,255,\${0.3 + Math.random() * 0.7})\`;
  ctx.fill();
}
`,
  },
  {
    name: 'Mondrian Art',
    description: 'Geometric blocks with primary colors',
    code: `// Mondrian-style geometric composition
const { width, height } = ctx.canvas;

// White background
ctx.fillStyle = '#f5f5f0';
ctx.fillRect(0, 0, width, height);

// Grid lines
ctx.strokeStyle = '#1a1a1a';
ctx.lineWidth = 6;
ctx.lineCap = 'square';

// Vertical lines
const vLines = [0, width * 0.25, width * 0.55, width * 0.75, width];
// Horizontal lines
const hLines = [0, height * 0.3, height * 0.55, height * 0.85, height];

function fillBlock(x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x1 + 3, y1 + 3, x2 - x1 - 6, y2 - y1 - 6);
}

// Draw blocks with colors
fillBlock(0, 0, vLines[1], hLines[1], '#e2231a');          // Red top-left
fillBlock(vLines[2], 0, vLines[3], hLines[1], '#0f1f7a');    // Blue top
fillBlock(vLines[1], hLines[1], vLines[3], hLines[2], '#f5f5f0'); // White center
fillBlock(vLines[3], 0, vLines[4], hLines[2], '#ffd500');    // Yellow
fillBlock(0, hLines[2], vLines[1], hLines[3], '#f5f5f0');    // White bottom-left
fillBlock(vLines[1], hLines[2], vLines[2], hLines[3], '#ffd500'); // Yellow
fillBlock(vLines[2], hLines[2], vLines[3], hLines[3], '#e2231a');  // Red bottom
fillBlock(0, hLines[3], vLines[2], hLines[4], '#0f1f7a');    // Blue bottom-left
fillBlock(vLines[3], hLines[2], vLines[4], hLines[4], '#f5f5f0');  // White bottom-right

// Draw grid lines on top
for (const x of vLines) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
}
for (const y of hLines) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
}
`,
  },
  {
    name: 'Spiral Galaxy',
    description: 'Parametric spiral with stars',
    code: `// Archimedean spiral with stars and glow
const { width, height } = ctx.canvas;
const cx = width / 2;
const cy = height / 2;

// Dark space background
ctx.fillStyle = '#050510';
ctx.fillRect(0, 0, width, height);

// Spiral parameters
const turns = 6;
const maxR = Math.min(width, height) * 0.45;
const points = 600;

ctx.lineWidth = 2;

for (let i = 0; i < points; i++) {
  const t = i / points;
  const angle = t * turns * Math.PI * 2;
  const r = t * maxR;
  const x = cx + Math.cos(angle) * r;
  const y = cy + Math.sin(angle) * r;

  const hue = (t * 360 + 240) % 360;
  const alpha = 0.3 + t * 0.7;

  ctx.strokeStyle = \`hsla(\${hue}, 90%, 65%, \${alpha})\`;
  ctx.beginPath();

  if (i === 0) {
    ctx.moveTo(x, y);
  } else {
    const prevT = (i - 1) / points;
    const prevAngle = prevT * turns * Math.PI * 2;
    const prevR = prevT * maxR;
    ctx.moveTo(cx + Math.cos(prevAngle) * prevR, cy + Math.sin(prevAngle) * prevR);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// Scatter stars
for (let i = 0; i < 150; i++) {
  const sx = Math.random() * width;
  const sy = Math.random() * height;
  const sr = Math.random() * 2;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fillStyle = \`rgba(255,255,255,\${0.3 + Math.random() * 0.7})\`;
  ctx.fill();
}

// Center glow
const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
glow.addColorStop(0.5, 'rgba(255, 200, 255, 0.4)');
glow.addColorStop(1, 'rgba(255, 200, 255, 0)');
ctx.fillStyle = glow;
ctx.fillRect(cx - 40, cy - 40, 80, 80);
`,
  },
  {
    name: 'Bar Chart',
    description: 'Dynamic data visualization',
    code: `// Animated bar chart
const { width, height } = ctx.canvas;

// Data
const data = [
  { label: 'JS', value: 67, color: '#f0db4f' },
  { label: 'TS', value: 44, color: '#3178c6' },
  { label: 'Python', value: 55, color: '#3776ab' },
  { label: 'Rust', value: 28, color: '#dea584' },
  { label: 'Go', value: 21, color: '#00add8' },
  { label: 'Swift', value: 15, color: '#f05138' },
];

const padding = { top: 30, right: 30, bottom: 50, left: 50 };
const chartW = width - padding.left - padding.right;
const chartH = height - padding.top - padding.bottom;
const barGap = 16;
const barW = Math.max(8, (chartW - barGap * (data.length + 1)) / data.length);
const maxVal = Math.max(...data.map((d) => d.value));

// Grid lines
ctx.strokeStyle = '#334155';
ctx.lineWidth = 1;
for (let i = 0; i <= 5; i++) {
  const y = padding.top + (chartH / 5) * i;
  ctx.beginPath();
  ctx.moveTo(padding.left, y);
  ctx.lineTo(width - padding.right, y);
  ctx.stroke();

  // Y-axis labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(Math.round(maxVal - (maxVal / 5) * i).toString(), padding.left - 10, y + 4);
}

// Bars
data.forEach((d, i) => {
  const barH = (d.value / maxVal) * chartH;
  const x = padding.left + barGap + i * (barW + barGap);
  const y = padding.top + chartH - barH;

  // Bar with rounded top
  const radius = Math.min(barW / 2, 6);
  ctx.beginPath();
  ctx.moveTo(x, padding.top + chartH);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.lineTo(x + barW - radius, y);
  ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
  ctx.lineTo(x + barW, padding.top + chartH);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartH);
  gradient.addColorStop(0, d.color);
  gradient.addColorStop(1, d.color + '44');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Value label on top
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(d.value.toString(), x + barW / 2, y - 8);

  // X-axis label
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(d.label, x + barW / 2, padding.top + chartH + 18);
});

// Axes
ctx.strokeStyle = '#64748b';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(padding.left, padding.top);
ctx.lineTo(padding.left, padding.top + chartH);
ctx.lineTo(width - padding.right, padding.top + chartH);
ctx.stroke();
`,
  },
  {
    name: 'Checkerboard',
    description: 'Classic chessboard pattern',
    code: `// 8x8 checkerboard with 3D border
const { width, height } = ctx.canvas;
const size = Math.min(width, height) * 0.85;
const cellSize = size / 8;
const offsetX = (width - size) / 2;
const offsetY = (height - size) / 2;

// Board shadow
ctx.shadowColor = 'rgba(0,0,0,0.5)';
ctx.shadowBlur = 20;
ctx.shadowOffsetX = 5;
ctx.shadowOffsetY = 5;
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(offsetX - 4, offsetY - 4, size + 8, size + 8);
ctx.shadowColor = 'transparent';
ctx.shadowBlur = 0;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;

// Draw board
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    const isDark = (row + col) % 2 === 1;

    const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
    if (isDark) {
      grad.addColorStop(0, '#2d5a27');
      grad.addColorStop(0.5, '#1f3d1a');
      grad.addColorStop(1, '#183316');
    } else {
      grad.addColorStop(0, '#f0e6d3');
      grad.addColorStop(0.5, '#e8dcc8');
      grad.addColorStop(1, '#d4c4a8');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cellSize, cellSize);
  }
}

// Border
ctx.strokeStyle = '#8b7355';
ctx.lineWidth = 4;
ctx.strokeRect(offsetX, offsetY, size, size);

// Notation numbers
ctx.fillStyle = '#94a3b8';
ctx.font = '10px monospace';
ctx.textAlign = 'center';
for (let i = 0; i < 8; i++) {
  ctx.fillText((8 - i).toString(), offsetX - 14, offsetY + i * cellSize + cellSize / 2 + 4);
  ctx.fillText(String.fromCharCode(97 + i), offsetX + i * cellSize + cellSize / 2, offsetY + size + 18);
}
`,
  },
  {
    name: 'Sine Wave',
    description: 'Animated sine wave visualization',
    code: `// Multiple sine waves with interference pattern
const { width, height } = ctx.canvas;
const cx = width / 2;
const cy = height / 2;

// Dark background
ctx.fillStyle = '#0a0a1a';
ctx.fillRect(0, 0, width, height);

const amplitude = height * 0.2;
const frequency = 0.02;
const phase = 0.5; // static phase offset

for (let wave = 0; wave < 5; wave++) {
  const hue = (wave * 72) % 360;
  const yOffset = cy + (wave - 2) * 25;

  ctx.beginPath();
  ctx.strokeStyle = \`hsla(\${hue}, 80%, 60%, 0.8)\`;
  ctx.lineWidth = 2;

  for (let x = 0; x < width; x += 2) {
    const y = yOffset + Math.sin(x * frequency + wave * phase) * amplitude * (1 - wave * 0.1);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Wave label
  ctx.fillStyle = \`hsla(\${hue}, 80%, 60%, 0.9)\`;
  ctx.font = '10px monospace';
  ctx.fillText(\`Wave \${wave + 1} (\${(1 + wave * 0.6).toFixed(1)} Hz)\`, 12, yOffset - 8);
}

// Center axis
ctx.setLineDash([4, 8]);
ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(0, cy);
ctx.lineTo(width, cy);
ctx.stroke();
ctx.setLineDash([]);

// Title
ctx.fillStyle = '#e2e8f0';
ctx.font = 'bold 14px monospace';
ctx.textAlign = 'center';
ctx.fillText('Harmonic Sine Wave Interference', cx, height - 16);
`,
  },
  {
    name: 'Pie Chart',
    description: 'Donut chart with labels',
    code: `// Donut / pie chart with callouts
const { width, height } = ctx.canvas;
const cx = width / 2;
const cy = height / 2;
const outerR = Math.min(width, height) * 0.35;
const innerR = outerR * 0.5;

const segments = [
  { label: 'Chrome', value: 64, color: '#4285f4' },
  { label: 'Safari', value: 19, color: '#34c759' },
  { label: 'Firefox', value: 8, color: '#ff9500' },
  { label: 'Edge', value: 5, color: '#0078d4' },
  { label: 'Other', value: 4, color: '#94a3b8' },
];

const total = segments.reduce((s, d) => s + d.value, 0);
let startAngle = -Math.PI / 2;

// Draw segments
segments.forEach((seg) => {
  const sliceAngle = (seg.value / total) * Math.PI * 2;
  const endAngle = startAngle + sliceAngle;

  // Slice
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, startAngle, endAngle);
  ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx, cy, innerR * 0.8, cx, cy, outerR);
  grad.addColorStop(0, seg.color + 'cc');
  grad.addColorStop(1, seg.color);
  ctx.fillStyle = grad;
  ctx.fill();

  // Separator line
  ctx.strokeStyle = '#0a0a1a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Label line + text
  const midAngle = startAngle + sliceAngle / 2;
  const labelR = outerR + 20;
  const lx = cx + Math.cos(midAngle) * labelR;
  const ly = cy + Math.sin(midAngle) * labelR;
  const tx = cx + Math.cos(midAngle) * (outerR + 55);
  const ty = cy + Math.sin(midAngle) * (outerR + 55);

  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(midAngle) * (outerR - 5), cy + Math.sin(midAngle) * (outerR - 5));
  ctx.lineTo(lx, ly);
  ctx.lineTo(tx, ty);
  ctx.strokeStyle = seg.color + '88';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px monospace';
  ctx.textAlign = midAngle > Math.PI / 2 || midAngle < -Math.PI / 2 ? 'right' : 'left';
  ctx.fillText(\`\${seg.label} \${seg.value}%\`, tx, ty + 3);

  startAngle = endAngle;
});

// Center text
ctx.fillStyle = '#e2e8f0';
ctx.font = 'bold 14px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Browser', cx, cy - 8);
ctx.fillText('Share', cx, cy + 8);
`,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CanvasPlaygroundPage() {
  const [code, setCode] = useState(PRESETS[0].code);
  const [activePreset, setActivePreset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to display size (device pixel ratio for sharpness)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Execute user code
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', 'canvas', code);
      fn(ctx, canvas);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Show error on canvas
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#f87171';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Error: ${msg}`, rect.width / 2, rect.height / 2);
    }
  }, [code]);

  // Re-render on code change, resize, or canvas key
  useEffect(() => {
    // Small delay to let DOM catch up after key change
    const timer = setTimeout(renderCanvas, 50);
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [renderCanvas, canvasKey]);

  const handlePreset = useCallback((index: number) => {
    setCode(PRESETS[index].code);
    setActivePreset(index);
    setError(null);
    // Force canvas resize + redraw by remounting
    setCanvasKey((k) => k + 1);
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code copied!'),
      () => toast.error('Copy failed'),
    );
  }, [code]);

  const clearCode = useCallback(() => {
    setCode('// Write your Canvas 2D code here\n// Use ctx and canvas variables\nctx.fillStyle = "#1e293b";\nctx.fillRect(0, 0, canvas.width, canvas.height);\n');
    setError(null);
    setActivePreset(-1);
    setCanvasKey((k) => k + 1);
  }, []);

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'canvas-export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Downloaded as PNG!');
  }, []);

  return (
    <ToolLayout
      title="Canvas 2D Playground"
      description="Write Canvas 2D drawing code and see it render live. 7 presets — gradients, data viz, generative art, patterns, and more. Download your creations as PNG."
    >
      <div className={`grid ${fullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
        {/* Editor */}
        {!fullscreen && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                Canvas 2D Code
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={clearCode}
                  className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setActivePreset(-1);
              }}
              spellCheck={false}
              className="w-full h-[450px] p-4 rounded-lg border border-slate-700/50 bg-[#0d1117] text-slate-200 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors"
              placeholder="Write Canvas 2D code here..."
            />

            {/* Presets */}
            <div>
              <h3 className="text-white font-medium text-xs mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                Presets
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PRESETS.map((preset, i) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePreset(i)}
                    className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                      activePreset === i
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-slate-700/40 bg-surface hover:border-slate-600/50'
                    }`}
                  >
                    <div className="text-slate-200 font-medium truncate">{preset.name}</div>
                    <div className="text-slate-500 text-[10px] mt-0.5 truncate">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}
          </div>
        )}

        {/* Canvas Preview */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-400" />
              Live Preview
              {error && (
                <span className="text-red-400 text-xs font-normal ml-1">(error in canvas)</span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadPNG}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                PNG
              </button>
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5"
              >
                {fullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className={`relative rounded-lg overflow-hidden border border-slate-700/50 bg-[#0d1117] ${fullscreen ? 'h-[600px]' : 'h-[480px]'}`}>
            <canvas
              key={canvasKey}
              ref={canvasRef}
              className="w-full h-full"
            />
          </div>

          {/* Help text */}
          <div className="p-3 rounded-lg bg-surface border border-slate-700/30 text-xs text-slate-400">
            <span className="text-slate-300 font-medium">Available globals:</span>{' '}
            <code className="text-brand-400 bg-slate-800 px-1 rounded">ctx</code> — 2D rendering context,{' '}
            <code className="text-brand-400 bg-slate-800 px-1 rounded">canvas</code> — the canvas element.{' '}
            Use <code className="text-brand-400 bg-slate-800 px-1 rounded">{'{'} width, height {'}'} = ctx.canvas</code> for dimensions.
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
