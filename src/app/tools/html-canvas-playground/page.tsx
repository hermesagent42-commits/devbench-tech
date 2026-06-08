'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Play, RefreshCw, Code2, Braces, PaintBucket, Square, Circle, Triangle, Waves, Sparkles, Star, Type } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type PresetTab = 'shapes' | 'gradients' | 'animations' | 'text' | 'filters' | 'transform';

type Preset = {
  name: string;
  tab: PresetTab;
  code: string;
};

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  // Shapes
  {
    name: 'Colored Rectangles',
    tab: 'shapes',
    code: `const ctx = canvas.getContext('2d');\n\nctx.fillStyle = '#3b82f6';\nctx.fillRect(20, 20, 120, 80);\n\nctx.fillStyle = '#10b981';\nctx.fillRect(100, 60, 120, 80);\n\nctx.fillStyle = '#f59e0b';\nctx.fillRect(180, 100, 120, 80);\n\nctx.strokeStyle = '#ef4444';\nctx.lineWidth = 4;\nctx.strokeRect(20, 20, 280, 160);`,
  },
  {
    name: 'Circles & Arcs',
    tab: 'shapes',
    code: `const ctx = canvas.getContext('2d');\n\n// Filled circle\nctx.beginPath();\nctx.arc(120, 100, 70, 0, Math.PI * 2);\nctx.fillStyle = '#8b5cf6';\nctx.fill();\n\n// Pie slice\nctx.beginPath();\nctx.moveTo(300, 100);\nctx.arc(300, 100, 60, 0, Math.PI * 1.3);\nctx.fillStyle = '#ec4899';\nctx.fill();\n\n// Ring\nctx.beginPath();\nctx.arc(210, 190, 40, 0, Math.PI * 2);\nctx.fillStyle = '#06b6d4';\nctx.fill();\nctx.beginPath();\nctx.arc(210, 190, 25, 0, Math.PI * 2);\nctx.fillStyle = '#0f172a';\nctx.fill();`,
  },
  {
    name: 'Star Polygon',
    tab: 'shapes',
    code: `const ctx = canvas.getContext('2d');\n\nfunction drawStar(cx, cy, spikes, outerR, innerR) {\n  let rot = Math.PI / 2 * 3;\n  let x = cx;\n  let y = cy;\n  const step = Math.PI / spikes;\n\n  ctx.beginPath();\n  ctx.moveTo(cx, cy - outerR);\n  for (let i = 0; i < spikes; i++) {\n    x = cx + Math.cos(rot) * outerR;\n    y = cy + Math.sin(rot) * outerR;\n    ctx.lineTo(x, y);\n    rot += step;\n    x = cx + Math.cos(rot) * innerR;\n    y = cy + Math.sin(rot) * innerR;\n    ctx.lineTo(x, y);\n    rot += step;\n  }\n  ctx.lineTo(cx, cy - outerR);\n  ctx.closePath();\n}\n\ndrawStar(160, 110, 5, 80, 35);\nctx.fillStyle = '#fbbf24';\nctx.fill();\nctx.strokeStyle = '#f59e0b';\nctx.lineWidth = 3;\nctx.stroke();`,
  },
  // Gradients
  {
    name: 'Linear Gradient',
    tab: 'gradients',
    code: `const ctx = canvas.getContext('2d');\n\nconst grad = ctx.createLinearGradient(0, 0, 400, 200);\ngrad.addColorStop(0, '#3b82f6');\ngrad.addColorStop(0.5, '#8b5cf6');\ngrad.addColorStop(1, '#ec4899');\n\nctx.fillStyle = grad;\nctx.fillRect(0, 0, canvas.width, canvas.height);`,
  },
  {
    name: 'Radial Gradient',
    tab: 'gradients',
    code: `const ctx = canvas.getContext('2d');\n\nconst grad = ctx.createRadialGradient(200, 100, 10, 200, 100, 150);\ngrad.addColorStop(0, '#ffffff');\ngrad.addColorStop(0.2, '#fbbf24');\ngrad.addColorStop(0.5, '#f97316');\ngrad.addColorStop(1, '#0f172a');\n\nctx.fillStyle = grad;\nctx.fillRect(0, 0, canvas.width, canvas.height);`,
  },
  {
    name: 'Conic Gradient',
    tab: 'gradients',
    code: `const ctx = canvas.getContext('2d');\n\nconst w = canvas.width;\nconst h = canvas.height;\nconst cx = w / 2, cy = h / 2;\nconst segments = 36;\n\nfor (let i = 0; i < segments; i++) {\n  const startAngle = (i / segments) * Math.PI * 2;\n  const endAngle = ((i + 1) / segments) * Math.PI * 2;\n  const hue = (i / segments) * 360;\n  \n  ctx.beginPath();\n  ctx.moveTo(cx, cy);\n  ctx.arc(cx, cy, 140, startAngle, endAngle);\n  ctx.closePath();\n  ctx.fillStyle = \`hsl(\${hue}, 80%, 60%)\`;\n  ctx.fill();\n}`,
  },
  // Animations
  {
    name: 'Bouncing Ball',
    tab: 'animations',
    code: `const ctx = canvas.getContext('2d');\nlet x = 50, y = 50, dx = 3, dy = 2, r = 20;\n\nfunction draw() {\n  ctx.clearRect(0, 0, canvas.width, canvas.height);\n  \n  // Draw trail\n  ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  \n  // Draw ball\n  ctx.beginPath();\n  ctx.arc(x, y, r, 0, Math.PI * 2);\n  ctx.fillStyle = '#38bdf8';\n  ctx.fill();\n  ctx.strokeStyle = '#0284c7';\n  ctx.lineWidth = 2;\n  ctx.stroke();\n  \n  // Bounce\n  if (x + r > canvas.width || x - r < 0) dx = -dx;\n  if (y + r > canvas.height || y - r < 0) dy = -dy;\n  x += dx;\n  y += dy;\n  \n  requestAnimationFrame(draw);\n}\ndraw();`,
  },
  {
    name: 'Particle Burst',
    tab: 'animations',
    code: `const ctx = canvas.getContext('2d');\nconst particles = [];\n\nfor (let i = 0; i < 100; i++) {\n  const angle = Math.random() * Math.PI * 2;\n  const speed = 1 + Math.random() * 3;\n  particles.push({\n    x: canvas.width / 2,\n    y: canvas.height / 2,\n    vx: Math.cos(angle) * speed,\n    vy: Math.sin(angle) * speed,\n    life: 1,\n    decay: 0.005 + Math.random() * 0.02,\n    color: \`hsl(\${Math.random() * 360}, 80%, 60%)\`,\n    size: 2 + Math.random() * 4,\n  });\n}\n\nfunction draw() {\n  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  \n  for (const p of particles) {\n    p.x += p.vx;\n    p.y += p.vy;\n    p.vy += 0.05;\n    p.life -= p.decay;\n    if (p.life <= 0) continue;\n    ctx.globalAlpha = p.life;\n    ctx.fillStyle = p.color;\n    ctx.beginPath();\n    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);\n    ctx.fill();\n  }\n  ctx.globalAlpha = 1;\n  requestAnimationFrame(draw);\n}\ndraw();`,
  },
  {
    name: 'Wave Pattern',
    tab: 'animations',
    code: `const ctx = canvas.getContext('2d');\nlet phase = 0;\n\nfunction draw() {\n  ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  \n  for (let row = 0; row < 6; row++) {\n    ctx.beginPath();\n    for (let x = 0; x <= canvas.width; x += 5) {\n      const y = 30 + row * 40 + Math.sin(x * 0.02 + phase + row * 0.5) * 15;\n      if (x === 0) ctx.moveTo(x, y);\n      else ctx.lineTo(x, y);\n    }\n    ctx.strokeStyle = \`hsl(\${(row * 60 + phase * 30) % 360}, 80%, 60%)\`;\n    ctx.lineWidth = 2;\n    ctx.stroke();\n  }\n  phase += 0.03;\n  requestAnimationFrame(draw);\n}\ndraw();`,
  },
  // Text
  {
    name: 'Text with Shadow',
    tab: 'text',
    code: `const ctx = canvas.getContext('2d');\n\nctx.font = 'bold 48px Inter, sans-serif';\nctx.textAlign = 'center';\nctx.textBaseline = 'middle';\n\n// Shadow\nctx.shadowColor = 'rgba(0, 0, 0, 0.5)';\nctx.shadowBlur = 10;\nctx.shadowOffsetX = 4;\nctx.shadowOffsetY = 4;\nctx.fillStyle = '#ffffff';\nctx.fillText('Hello Canvas', canvas.width / 2, 80);\n\n// Reset shadow\nctx.shadowColor = 'transparent';\nctx.shadowBlur = 0;\n\n// Gradient text\nconst grad = ctx.createLinearGradient(0, 100, 400, 100);\ngrad.addColorStop(0, '#3b82f6');\ngrad.addColorStop(0.5, '#8b5cf6');\ngrad.addColorStop(1, '#ec4899');\nctx.fillStyle = grad;\nctx.fillText('Hello Canvas', canvas.width / 2, 150);\n\n// Stroked text\nctx.font = 'bold 36px monospace';\nctx.strokeStyle = '#10b981';\nctx.lineWidth = 2;\nctx.strokeText('Hello Canvas', canvas.width / 2, 210);`,
  },
  // Filters
  {
    name: 'Image Filters',
    tab: 'filters',
    code: `const ctx = canvas.getContext('2d');\n\n// Draw base shapes\nfor (let i = 0; i < 4; i++) {\n  for (let j = 0; j < 3; j++) {\n    ctx.fillStyle = \`hsl(\${i * 90}, 70%, 60%)\`;\n    ctx.fillRect(i * 100, j * 80, 90, 70);\n    ctx.fillStyle = 'white';\n    ctx.font = '14px monospace';\n    const filters = ['none', 'blur', 'grayscale', 'sepia'];\n    if (j === 0) ctx.fillText(filters[i], i * 100 + 10, j * 80 + 40);\n  }\n}\n\n// Apply filters to quadrants\n\n// Top-right: blur\nctx.save();\nctx.filter = 'blur(3px)';\nctx.fillStyle = '#3b82f6';\nctx.fillRect(100, 10, 80, 90);\nctx.fillStyle = '#f59e0b';\nctx.fillRect(120, 30, 40, 50);\nctx.restore();\n\n// Bottom-left: grayscale\nctx.save();\nctx.filter = 'grayscale(1)';\nctx.fillStyle = '#ef4444';\nctx.fillRect(10, 90, 80, 90);\nctx.fillStyle = '#10b981';\nctx.fillRect(30, 110, 40, 50);\nctx.restore();\n\n// Bottom-right: sepia + saturate\nctx.save();\nctx.filter = 'sepia(1) saturate(2)';\nctx.fillStyle = '#8b5cf6';\nctx.fillRect(110, 90, 80, 90);\nctx.restore();`,
  },
  // Transform
  {
    name: 'Rotate & Scale',
    tab: 'transform',
    code: `const ctx = canvas.getContext('2d');\n\nctx.translate(200, 100);\n\n// Draw rotating squares\nfor (let i = 0; i < 12; i++) {\n  ctx.save();\n  ctx.rotate((i / 12) * Math.PI * 2);\n  ctx.scale(1, 0.3);\n  \n  ctx.fillStyle = \`hsl(\${i * 30}, 80%, 60%)\`;\n  ctx.fillRect(30, -15, 80, 30);\n  ctx.strokeStyle = 'white';\n  ctx.lineWidth = 1;\n  ctx.strokeRect(30, -15, 80, 30);\n  \n  ctx.restore();\n}`,
  },
  {
    name: 'Spiral Pattern',
    tab: 'transform',
    code: `const ctx = canvas.getContext('2d');\n\nctx.translate(200, 120);\n\nfor (let i = 0; i < 200; i++) {\n  ctx.save();\n  ctx.rotate(i * 0.15);\n  ctx.translate(i * 0.8, 0);\n  \n  const hue = (i * 3) % 360;\n  ctx.fillStyle = \`hsl(\${hue}, 80%, 65%)\`;\n  ctx.fillRect(-4, -4, 8, 8);\n  \n  ctx.restore();\n}`,
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function HTMLCanvasPlaygroundPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState(PRESETS[0].code);
  const [activeTab, setActiveTab] = useState<PresetTab>('shapes');
  const [animFrame, setAnimFrame] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCode = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Clean up previous animation
    if (animFrame !== null) cancelAnimationFrame(animFrame);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setError(null);

    try {
      const wrappedCode = `
        (function() {
          const canvas = document.querySelector('#canvas-playground');
          if (!canvas) return;
          ${code}
        })();
      `;
      
      // We use a Function constructor to safely eval the user code within our context
      // The canvas is available as a local variable via closure
      const fn = new Function('canvas', `"use strict";\n${code.replace(/canvas/g, 'arguments[0]')}`);
      fn(canvas);
    } catch (err: any) {
      setError(err.message);
    }
  }, [code, animFrame]);

  // Run on mount and code change
  useEffect(() => {
    const timer = setTimeout(runCode, 300);
    return () => clearTimeout(timer);
  }, [code, runCode]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrame !== null) cancelAnimationFrame(animFrame);
    };
  }, [animFrame]);

  const applyPreset = useCallback((preset: Preset) => {
    setCode(preset.code);
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [code]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'canvas-export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Downloaded!');
  }, []);

  const refresh = useCallback(() => {
    runCode();
    toast.success('Refreshed!');
  }, [runCode]);

  const tabs: { id: PresetTab; label: string; icon: React.ElementType }[] = [
    { id: 'shapes', label: 'Shapes', icon: Square },
    { id: 'gradients', label: 'Gradients', icon: PaintBucket },
    { id: 'animations', label: 'Animations', icon: Sparkles },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'filters', label: 'Filters', icon: Waves },
    { id: 'transform', label: 'Transform', icon: RefreshCw },
  ];

  const filteredPresets = PRESETS.filter(p => p.tab === activeTab);

  return (
    <ToolLayout
      title="HTML Canvas Playground"
      description="Write and run Canvas 2D API code live in your browser. Explore shapes, gradients, animations, text, filters, and transforms — 13 presets, live preview, export to PNG."
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ── Left: Code Editor ────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1.5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  activeTab === id
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-brand-400" />
              Presets
            </h2>
            <div className="flex flex-wrap gap-2">
              {filteredPresets.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                    code === p.code
                      ? 'border-brand-500/50 text-brand-300 bg-brand-500/10'
                      : 'border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-brand-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Code editor */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-brand-400" />
                JavaScript Code
              </h2>
              <button onClick={copyCode} className="text-xs text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              rows={16}
              className="input-field w-full font-mono text-xs resize-y leading-relaxed"
              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
            />
            {error && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-400 font-mono">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Preview ───────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex gap-2">
            <button onClick={refresh} className="btn-primary text-sm flex items-center gap-1.5 flex-1">
              <Play className="w-4 h-4" /> Run
            </button>
            <button onClick={downloadCanvas} className="btn-secondary text-sm flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Export PNG
            </button>
          </div>

          {/* Canvas preview */}
          <div className="card p-3">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <PaintBucket className="w-3.5 h-3.5 text-brand-400" />
              Live Preview
            </h2>
            <div className="rounded-lg overflow-hidden border border-slate-600/50 bg-slate-950 flex justify-center">
              <canvas
                id="canvas-playground"
                ref={canvasRef}
                width={400}
                height={240}
                className="w-full max-w-full h-auto"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-slate-500">400 × 240 px — Auto-refreshes as you type</p>
            </div>
          </div>

          {/* API Reference */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Braces className="w-3.5 h-3.5 text-brand-400" />
              Quick API Reference
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[
                { method: 'fillStyle / strokeStyle', desc: 'Set fill or stroke color (hex, rgb, hsl, rgba)' },
                { method: 'fillRect(x, y, w, h)', desc: 'Draw a filled rectangle' },
                { method: 'strokeRect(x, y, w, h)', desc: 'Draw a rectangle outline' },
                { method: 'clearRect(x, y, w, h)', desc: 'Erase a rectangular area' },
                { method: 'beginPath()', desc: 'Start a new path' },
                { method: 'moveTo(x, y) / lineTo(x, y)', desc: 'Move pen / draw line to point' },
                { method: 'arc(x, y, r, start, end)', desc: 'Draw an arc or circle' },
                { method: 'fill() / stroke()', desc: 'Fill or stroke the current path' },
                { method: 'fillText(text, x, y)', desc: 'Draw filled text' },
                { method: 'createLinearGradient(x1,y1,x2,y2)', desc: 'Create a linear gradient' },
                { method: 'createRadialGradient(x0,y0,r0,x1,y1,r1)', desc: 'Create a radial gradient' },
                { method: 'save() / restore()', desc: 'Save/restore the canvas state' },
                { method: 'translate(x, y)', desc: 'Move the origin' },
                { method: 'rotate(angle)', desc: 'Rotate (in radians)' },
                { method: 'scale(x, y)', desc: 'Scale the drawing context' },
                { method: 'filter', desc: 'Apply CSS filters (blur, grayscale, etc.)' },
                { method: 'globalAlpha', desc: 'Set global opacity (0–1)' },
                { method: 'lineWidth', desc: 'Set stroke line thickness' },
              ].map(entry => (
                <div key={entry.method} className="flex items-start gap-2 text-xs">
                  <code className="text-brand-300 font-mono text-[11px] shrink-0 bg-brand-500/10 px-1.5 py-0.5 rounded">
                    {entry.method}
                  </code>
                  <span className="text-slate-400">{entry.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
