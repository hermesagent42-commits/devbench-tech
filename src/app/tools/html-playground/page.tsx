'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Play, Maximize2, Minimize2, Code2, FileCode, Palette, Wand2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PlaygroundPanel {
  html: string;
  css: string;
  js: string;
}

type Panel = 'html' | 'css' | 'js';

interface Template {
  name: string;
  description: string;
  icon: string;
  html: string;
  css: string;
  js: string;
}

// ── Templates ──────────────────────────────────────────────────────────────

const TEMPLATES: Template[] = [
  {
    name: 'Landing Hero',
    description: 'Modern hero section with gradient',
    icon: '🚀',
    html: `<div class="hero">
  <h1>Build Something Great</h1>
  <p>The fastest way to prototype web ideas. All client-side, zero setup.</p>
  <button onclick="handleClick()">Get Started</button>
</div>`,
    css: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero {
  text-align: center;
  color: white;
  padding: 2rem;
  max-width: 600px;
}

.hero h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.hero p {
  font-size: 1.25rem;
  opacity: 0.9;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.hero button {
  background: white;
  color: #667eea;
  border: none;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.hero button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}`,
    js: `function handleClick() {
  alert('🚀 Let\\'s build something amazing!');
}`,
  },
  {
    name: 'CSS Card',
    description: 'Animated card with hover effects',
    icon: '🎴',
    html: `<div class="card">
  <div class="card-icon">✨</div>
  <h2>Premium Feature</h2>
  <p>Unlock unlimited access to all tools, templates, and priority support.</p>
  <div class="card-footer">
    <span class="price">$9<span>/mo</span></span>
    <button>Subscribe</button>
  </div>
</div>`,
    css: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f0f2f5;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  width: 340px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: transform 0.3s, box-shadow 0.3s;
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.card h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #1a1a2e;
}

.card p {
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: 2rem;
  font-weight: 800;
  color: #1a1a2e;
}

.price span {
  font-size: 0.9rem;
  font-weight: 400;
  color: #94a3b8;
}

.card button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.card button:hover {
  opacity: 0.9;
}`,
    js: `// No JavaScript needed for this card — pure CSS magic!
console.log('Card template loaded ✨');`,
  },
  {
    name: 'Canvas Art',
    description: 'Generative canvas animation',
    icon: '🎨',
    html: `<canvas id="canvas"></canvas>`,
    css: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0f0f23;
  overflow: hidden;
}

canvas {
  display: block;
}`,
    js: `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let particles = [];
const PARTICLE_COUNT = 80;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class Particle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 2;
    this.speedY = (Math.random() - 0.5) * 2;
    this.hue = Math.random() * 360;
  }
  
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.hue = (this.hue + 0.5) % 360;
    
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
  }
  
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = \`hsl(\${this.hue}, 80%, 65%)\`;
    ctx.fill();
  }
}

function init() {
  resize();
  particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
}

function animate() {
  ctx.fillStyle = 'rgba(15, 15, 35, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
init();
animate();`,
  },
  {
    name: 'Counter App',
    description: 'Interactive state counter',
    icon: '🔢',
    html: `<div class="counter-app">
  <h1>Counter</h1>
  <div class="display" id="count">0</div>
  <div class="buttons">
    <button class="btn dec" onclick="updateCount(-1)">−</button>
    <button class="btn reset" onclick="resetCount()">Reset</button>
    <button class="btn inc" onclick="updateCount(1)">+</button>
  </div>
</div>`,
    css: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #1a1a2e;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter-app {
  text-align: center;
  color: white;
}

.counter-app h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.display {
  font-size: 6rem;
  font-weight: 800;
  margin-bottom: 2rem;
  font-variant-numeric: tabular-nums;
}

.buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  width: 70px;
  height: 70px;
  border: none;
  border-radius: 20px;
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.btn:active {
  transform: scale(0.95);
}

.dec {
  background: #ef4444;
  color: white;
}

.reset {
  background: #334155;
  color: white;
  font-size: 0.9rem;
}

.inc {
  background: #22c55e;
  color: white;
}`,
    js: `let count = 0;

function updateCount(delta) {
  count += delta;
  document.getElementById('count').textContent = count;
}

function resetCount() {
  count = 0;
  document.getElementById('count').textContent = count;
}`,
  },
];

// ── Helper: build full document ────────────────────────────────────────────

function buildDocument(html: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
}

// ── Panel Header Component ─────────────────────────────────────────────────

function PanelHeader({ label, icon, active, onClick }: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${
        active
          ? 'bg-slate-800 text-white border-brand-400'
          : 'bg-slate-900/50 text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function HtmlPlaygroundPage() {
  const [panels, setPanels] = useState<PlaygroundPanel>({
    html: TEMPLATES[0].html,
    css: TEMPLATES[0].css,
    js: TEMPLATES[0].js,
  });
  const [activePanel, setActivePanel] = useState<Panel>('html');
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build and inject into iframe
  const updatePreview = useCallback((p: PlaygroundPanel) => {
    if (!iframeRef.current) return;
    const doc = buildDocument(p.html, p.css, p.js);
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
    // Clean up old blob after new one loads
    return () => URL.revokeObjectURL(url);
  }, []);

  // Auto-run with debounce
  const scheduleUpdate = useCallback((p: PlaygroundPanel) => {
    if (!autoRun) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updatePreview(p), 300);
  }, [autoRun, updatePreview]);

  // Run immediately (manual)
  const run = useCallback(() => {
    updatePreview(panels);
  }, [panels, updatePreview]);

  // Initial render + on panel change
  useEffect(() => {
    updatePreview(panels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track changes
  const updatePanel = useCallback((panel: Panel, value: string) => {
    setPanels((prev) => {
      const next = { ...prev, [panel]: value };
      scheduleUpdate(next);
      return next;
    });
  }, [scheduleUpdate]);

  // Load template
  const loadTemplate = useCallback((t: Template) => {
    const next = { html: t.html, css: t.css, js: t.js };
    setPanels(next);
    updatePreview(next);
    toast.success(`Loaded: ${t.name}`);
  }, [updatePreview]);

  // Reset to blank
  const reset = useCallback(() => {
    const blank = { html: '', css: '', js: '' };
    setPanels(blank);
    updatePreview(blank);
    toast.success('Cleared');
  }, [updatePreview]);

  // Copy combined HTML
  const copyFull = useCallback(async () => {
    const doc = buildDocument(panels.html, panels.css, panels.js);
    try {
      await navigator.clipboard.writeText(doc);
      toast.success('Full HTML copied!');
    } catch {
      toast.error('Copy failed');
    }
  }, [panels]);

  // Download
  const download = useCallback(() => {
    const doc = buildDocument(panels.html, panels.css, panels.js);
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playground.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [panels]);

  const panelConfigs: { key: Panel; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'html', label: 'HTML', icon: <FileCode className="w-4 h-4" />, color: 'text-orange-400' },
    { key: 'css', label: 'CSS', icon: <Palette className="w-4 h-4" />, color: 'text-blue-400' },
    { key: 'js', label: 'JS', icon: <Code2 className="w-4 h-4" />, color: 'text-yellow-400' },
  ];

  const totalChars = panels.html.length + panels.css.length + panels.js.length;

  return (
    <ToolLayout
      title="HTML Playground"
      description="Live HTML, CSS & JavaScript editor with instant preview. Prototype ideas, test snippets, and experiment — all in your browser, no setup needed."
      controls={
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Auto-run toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
            />
            Auto-run
          </label>

          <div className="flex-1" />

          <span className="text-xs text-slate-500 font-mono">{totalChars.toLocaleString()} chars</span>

          <button
            onClick={run}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors font-medium"
            title="Run (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panels */}
        <div className="flex flex-col">
          {/* Panel Tabs */}
          <div className="flex gap-0 mb-0">
            {panelConfigs.map(({ key, label, icon }) => (
              <PanelHeader
                key={key}
                label={label}
                icon={icon}
                active={activePanel === key}
                onClick={() => setActivePanel(key)}
              />
            ))}
          </div>

          {/* Code Editor */}
          <textarea
            value={panels[activePanel]}
            onChange={(e) => updatePanel(activePanel, e.target.value)}
            className="flex-1 min-h-[420px] w-full bg-slate-900 border border-slate-700 rounded-b-lg rounded-tr-lg p-4 font-mono text-sm text-slate-200 resize-y focus:outline-none focus:border-brand-500/50 placeholder:text-slate-600"
            placeholder={`Enter ${activePanel.toUpperCase()} code here...`}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                run();
              }
            }}
          />
        </div>

        {/* Preview Panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Preview
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFullPreview(!isFullPreview)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title={isFullPreview ? 'Exit full preview' : 'Full preview'}
              >
                {isFullPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={copyFull}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title="Copy full document"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={download}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title="Download HTML file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={`relative ${isFullPreview ? 'lg:absolute lg:inset-4 lg:z-50' : ''}`}>
            <iframe
              ref={iframeRef}
              className={`w-full bg-white rounded-lg border border-slate-700 ${
                isFullPreview ? 'min-h-[600px]' : 'min-h-[420px]'
              }`}
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-brand-400" />
          Templates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => loadTemplate(t)}
              className="group p-4 rounded-lg bg-slate-800 border border-slate-700/50 hover:border-brand-500/50 hover:bg-slate-750 transition-all text-left"
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="text-sm font-semibold text-slate-200 group-hover:text-brand-400 transition-colors">
                {t.name}
              </div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-6 p-4 bg-surface-light border border-slate-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">⌨️ Shortcuts & Tips</h3>
        <ul className="text-xs text-slate-400 space-y-1.5">
          <li>• <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono text-[11px]">Ctrl+Enter</kbd> — Run the code manually (even with auto-run on)</li>
          <li>• <strong>Auto-run</strong> updates the preview automatically as you type (300ms debounce)</li>
          <li>• Click a <strong>template</strong> to load a complete working example — great starting points</li>
          <li>• The preview runs in an isolated iframe with <code className="bg-slate-700 px-1 rounded">sandbox=&quot;allow-scripts&quot;</code> for safety</li>
          <li>• Use <strong>Download</strong> to save your work as a standalone HTML file</li>
          <li>• Switch between HTML/CSS/JS panels using the tabs above the editor</li>
          <li>• All code stays <strong>entirely in your browser</strong> — nothing is sent anywhere</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
