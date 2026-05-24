'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Gauge, Palette, Maximize2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Spinner types ───────────────────────────────────────────────────────────

interface SpinnerPreset {
  id: string;
  name: string;
  description: string;
  // CSS for the actual spinner element (uses CSS custom properties)
  html: string;
}

const SPINNERS: SpinnerPreset[] = [
  {
    id: 'border-spinner',
    name: 'Border Spinner',
    description: 'Classic spinning circle with a transparent track',
    html: `<div class="spinner-border"></div>`,
  },
  {
    id: 'dots-bounce',
    name: 'Bouncing Dots',
    description: 'Three dots bouncing in sequence',
    html: `<div class="spinner-dots">
  <span></span><span></span><span></span>
</div>`,
  },
  {
    id: 'dots-pulse',
    name: 'Pulsing Dots',
    description: 'Three dots pulsing in a wave pattern',
    html: `<div class="spinner-pulse">
  <span></span><span></span><span></span>
</div>`,
  },
  {
    id: 'dual-ring',
    name: 'Dual Ring',
    description: 'Two concentric rings spinning in opposite directions',
    html: `<div class="spinner-dual-ring"></div>`,
  },
  {
    id: 'ripple',
    name: 'Ripple',
    description: 'Expanding circles like a water ripple',
    html: `<div class="spinner-ripple">
  <div></div><div></div>
</div>`,
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    description: 'Hourglass shape that flips and fills',
    html: `<div class="spinner-hourglass"></div>`,
  },
  {
    id: 'bars-wave',
    name: 'Wave Bars',
    description: 'Vertical bars that pulse in a wave',
    html: `<div class="spinner-bars">
  <span></span><span></span><span></span><span></span><span></span>
</div>`,
  },
  {
    id: 'ring-spin',
    name: 'Ring Spin',
    description: 'A single ring that spins with a dash offset animation',
    html: `<div class="spinner-ring"></div>`,
  },
  {
    id: 'growing-circle',
    name: 'Growing Circle',
    description: 'Circle that grows and shrinks in a pulse',
    html: `<div class="spinner-growing"></div>`,
  },
  {
    id: 'flip-square',
    name: 'Flip Square',
    description: 'Square that flips and changes color',
    html: `<div class="spinner-flip"></div>`,
  },
  {
    id: 'chase-dots',
    name: 'Chase Dots',
    description: 'Multiple dots chasing each other in a circle',
    html: `<div class="spinner-chase">
  <span></span><span></span><span></span><span></span><span></span><span></span>
</div>`,
  },
  {
    id: 'cube-grid',
    name: 'Cube Grid',
    description: '3×3 grid of cubes pulsing in sequence',
    html: `<div class="spinner-cube-grid">
  <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
</div>`,
  },
];

// ── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: 'Brand Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'White', value: '#f1f5f9' },
  { name: 'Slate', value: '#64748b' },
];

// ── CSS generation ───────────────────────────────────────────────────────────

interface SpinnerStyles {
  color: string;
  size: number;
  speed: number;
  secondaryColor: string;
}

function generateCSS(spinnerId: string, styles: SpinnerStyles): string {
  const { color, size, speed, secondaryColor } = styles;
  const trackColor = `${color}33`; // 20% opacity for track

  const base = `/* ${SPINNERS.find((s) => s.id === spinnerId)?.name || spinnerId} — Customizable */
.spinner {
  --spinner-color: ${color};
  --spinner-track: ${trackColor};
  --spinner-size: ${size}px;
  --spinner-speed: ${speed}s;
  --spinner-secondary: ${secondaryColor};
}

`;

  switch (spinnerId) {
    case 'border-spinner':
      return base + `.spinner-border {
  width: var(--spinner-size);
  height: var(--spinner-size);
  border: calc(var(--spinner-size) / 7) solid var(--spinner-track);
  border-top-color: var(--spinner-color);
  border-radius: 50%;
  animation: spin var(--spinner-speed) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}`;

    case 'dots-bounce':
      return base + `.spinner-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spinner-size) / 6);
  height: var(--spinner-size);
}
.spinner-dots span {
  width: calc(var(--spinner-size) / 4);
  height: calc(var(--spinner-size) / 4);
  background: var(--spinner-color);
  border-radius: 50%;
  animation: bounce var(--spinner-speed) ease-in-out infinite;
}
.spinner-dots span:nth-child(1) { animation-delay: calc(var(--spinner-speed) * -0.32); }
.spinner-dots span:nth-child(2) { animation-delay: calc(var(--spinner-speed) * -0.16); }
.spinner-dots span:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}`;

    case 'dots-pulse':
      return base + `.spinner-pulse {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spinner-size) / 8);
  height: var(--spinner-size);
}
.spinner-pulse span {
  width: calc(var(--spinner-size) / 5);
  height: calc(var(--spinner-size) / 5);
  background: var(--spinner-color);
  border-radius: 50%;
  animation: pulse var(--spinner-speed) ease-in-out infinite;
}
.spinner-pulse span:nth-child(2) { animation-delay: calc(var(--spinner-speed) / 3); }
.spinner-pulse span:nth-child(3) { animation-delay: calc(var(--spinner-speed) * 2 / 3); }

@keyframes pulse {
  0%, 100% { transform: scale(0.4); opacity: 0.3; }
  50% { transform: scale(1); opacity: 1; }
}`;

    case 'dual-ring':
      return base + `.spinner-dual-ring {
  width: var(--spinner-size);
  height: var(--spinner-size);
  display: inline-block;
  position: relative;
}
.spinner-dual-ring::after,
.spinner-dual-ring::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: calc(var(--spinner-size) / 10) solid transparent;
  animation: dual-ring var(--spinner-speed) linear infinite;
}
.spinner-dual-ring::before {
  border-top-color: var(--spinner-color);
  animation-direction: normal;
}
.spinner-dual-ring::after {
  border-bottom-color: var(--spinner-secondary);
  animation-direction: reverse;
  inset: calc(var(--spinner-size) / 6);
}

@keyframes dual-ring {
  to { transform: rotate(360deg); }
}`;

    case 'ripple':
      return base + `.spinner-ripple {
  width: var(--spinner-size);
  height: var(--spinner-size);
  display: inline-block;
  position: relative;
}
.spinner-ripple div {
  position: absolute;
  border: calc(var(--spinner-size) / 12) solid var(--spinner-color);
  border-radius: 50%;
  opacity: 1;
  animation: ripple var(--spinner-speed) cubic-bezier(0, 0.2, 0.8, 1) infinite;
}
.spinner-ripple div:nth-child(2) {
  animation-delay: calc(var(--spinner-speed) / 2);
}

@keyframes ripple {
  0% { inset: 0; opacity: 0; }
  4.9% { inset: 0; opacity: 0; }
  5% { inset: 0; opacity: 1; }
  100% { inset: 100%; opacity: 0; }
}`;

    case 'hourglass':
      return base + `.spinner-hourglass {
  width: var(--spinner-size);
  height: var(--spinner-size);
  display: inline-block;
  position: relative;
}
.spinner-hourglass::after,
.spinner-hourglass::before {
  content: '';
  position: absolute;
  left: 0;
  width: 0;
  height: 0;
  border-left: calc(var(--spinner-size) / 2) solid transparent;
  border-right: calc(var(--spinner-size) / 2) solid transparent;
}
.spinner-hourglass::before {
  top: 0;
  border-bottom: calc(var(--spinner-size) / 2) solid var(--spinner-color);
  animation: hourglass-top var(--spinner-speed) ease-in-out infinite;
}
.spinner-hourglass::after {
  bottom: 0;
  border-top: calc(var(--spinner-size) / 2) solid var(--spinner-color);
  animation: hourglass-bottom var(--spinner-speed) ease-in-out infinite;
}

@keyframes hourglass-top {
  0%, 49% { opacity: 1; transform: scaleY(1); }
  50%, 100% { opacity: 0; transform: scaleY(0); }
}
@keyframes hourglass-bottom {
  0%, 49% { opacity: 0; transform: scaleY(0); }
  50%, 100% { opacity: 1; transform: scaleY(1); }
}`;

    case 'bars-wave':
      return base + `.spinner-bars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spinner-size) / 15);
  height: var(--spinner-size);
}
.spinner-bars span {
  width: calc(var(--spinner-size) / 8);
  height: 100%;
  background: var(--spinner-color);
  border-radius: calc(var(--spinner-size) / 16);
  animation: bars-wave var(--spinner-speed) ease-in-out infinite;
}
.spinner-bars span:nth-child(1) { animation-delay: calc(var(--spinner-speed) * -0.4); }
.spinner-bars span:nth-child(2) { animation-delay: calc(var(--spinner-speed) * -0.3); }
.spinner-bars span:nth-child(3) { animation-delay: calc(var(--spinner-speed) * -0.2); }
.spinner-bars span:nth-child(4) { animation-delay: calc(var(--spinner-speed) * -0.1); }
.spinner-bars span:nth-child(5) { animation-delay: 0s; }

@keyframes bars-wave {
  0%, 100% { height: 30%; }
  50% { height: 100%; }
}`;

    case 'ring-spin':
      return base + `.spinner-ring {
  width: var(--spinner-size);
  height: var(--spinner-size);
  border-radius: 50%;
  border: calc(var(--spinner-size) / 10) solid var(--spinner-track);
  border-top-color: var(--spinner-color);
  clip-path: inset(0 0 0 0 round 50%);
  animation: spin var(--spinner-speed) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}`;

    case 'growing-circle':
      return base + `.spinner-growing {
  width: var(--spinner-size);
  height: var(--spinner-size);
  background: var(--spinner-color);
  border-radius: 50%;
  animation: growing var(--spinner-speed) ease-in-out infinite;
}

@keyframes growing {
  0%, 100% { transform: scale(0); opacity: 0.2; }
  50% { transform: scale(1); opacity: 1; }
}`;

    case 'flip-square':
      return base + `.spinner-flip {
  width: var(--spinner-size);
  height: var(--spinner-size);
  background: var(--spinner-color);
  animation: flip var(--spinner-speed) ease-in-out infinite;
}

@keyframes flip {
  0% { transform: perspective(120px) rotateX(0deg) rotateY(0deg); background: var(--spinner-color); }
  50% { transform: perspective(120px) rotateX(-180deg) rotateY(0deg); background: var(--spinner-secondary); }
  100% { transform: perspective(120px) rotateX(-180deg) rotateY(-180deg); background: var(--spinner-color); }
}`;

    case 'chase-dots':
      return base + `.spinner-chase {
  width: var(--spinner-size);
  height: var(--spinner-size);
  position: relative;
  animation: spin var(--spinner-speed) linear infinite;
}
.spinner-chase span {
  position: absolute;
  width: calc(var(--spinner-size) / 6);
  height: calc(var(--spinner-size) / 6);
  background: var(--spinner-color);
  border-radius: 50%;
  opacity: 0.6;
}
.spinner-chase span:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); animation: chase-dot var(--spinner-speed) linear infinite; }
.spinner-chase span:nth-child(2) { top: calc(var(--spinner-size) / 7); right: calc(var(--spinner-size) / 7); animation: chase-dot var(--spinner-speed) linear infinite calc(var(--spinner-speed) / -6); }
.spinner-chase span:nth-child(3) { top: 50%; right: 0; transform: translateY(-50%); animation: chase-dot var(--spinner-speed) linear infinite calc(var(--spinner-speed) / -3); }
.spinner-chase span:nth-child(4) { bottom: calc(var(--spinner-size) / 7); right: calc(var(--spinner-size) / 7); animation: chase-dot var(--spinner-speed) linear infinite calc(var(--spinner-speed) / -2); }
.spinner-chase span:nth-child(5) { bottom: 0; left: 50%; transform: translateX(-50%); animation: chase-dot var(--spinner-speed) linear infinite calc(var(--spinner-speed) * -2 / 3); }
.spinner-chase span:nth-child(6) { bottom: calc(var(--spinner-size) / 7); left: calc(var(--spinner-size) / 7); animation: chase-dot var(--spinner-speed) linear infinite calc(var(--spinner-speed) * -5 / 6); }

@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes chase-dot {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}`;

    case 'cube-grid':
      return base + `.spinner-cube-grid {
  width: var(--spinner-size);
  height: var(--spinner-size);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: calc(var(--spinner-size) / 12);
}
.spinner-cube-grid span {
  width: 100%;
  height: 100%;
  background: var(--spinner-color);
  animation: cube-grid var(--spinner-speed) ease-in-out infinite;
}
.spinner-cube-grid span:nth-child(1) { animation-delay: calc(var(--spinner-speed) * -0.8); }
.spinner-cube-grid span:nth-child(2) { animation-delay: calc(var(--spinner-speed) * -0.7); }
.spinner-cube-grid span:nth-child(3) { animation-delay: calc(var(--spinner-speed) * -0.6); }
.spinner-cube-grid span:nth-child(4) { animation-delay: calc(var(--spinner-speed) * -0.5); }
.spinner-cube-grid span:nth-child(5) { animation-delay: calc(var(--spinner-speed) * -0.4); }
.spinner-cube-grid span:nth-child(6) { animation-delay: calc(var(--spinner-speed) * -0.3); }
.spinner-cube-grid span:nth-child(7) { animation-delay: calc(var(--spinner-speed) * -0.2); }
.spinner-cube-grid span:nth-child(8) { animation-delay: calc(var(--spinner-speed) * -0.1); }
.spinner-cube-grid span:nth-child(9) { animation-delay: 0s; }

@keyframes cube-grid {
  0%, 70%, 100% { transform: scale3D(1, 1, 1); opacity: 0.4; }
  35% { transform: scale3D(0, 0, 1); opacity: 1; }
}`;

    default:
      return base + `/* Spinner CSS not available — check your selection */`;
  }
}

// Extract just the spinner-specific CSS (no .spinner variable block) for preview injection
function extractPreviewCSS(fullCSS: string): string {
  // Split on first empty-line boundary after the .spinner variable block
  const parts = fullCSS.split(/\n\n/);
  if (parts.length < 2) return fullCSS;
  // Skip the comment header + .spinner block; return everything else
  return parts.slice(1).join('\n\n');
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CssLoaderGeneratorPage() {
  const [selectedSpinner, setSelectedSpinner] = useState<string>('border-spinner');
  const [color, setColor] = useState<string>('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState<string>('#f59e0b');
  const [size, setSize] = useState<number>(48);
  const [speed, setSpeed] = useState<number>(0.75);
  const [bgMode, setBgMode] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState(false);

  const styles = useMemo<SpinnerStyles>(
    () => ({ color, size, speed, secondaryColor }),
    [color, size, speed, secondaryColor]
  );

  const cssCode = useMemo(() => generateCSS(selectedSpinner, styles), [selectedSpinner, styles]);
  const previewCSS = useMemo(() => extractPreviewCSS(cssCode), [cssCode]);

  const preset = useMemo(() => SPINNERS.find((s) => s.id === selectedSpinner), [selectedSpinner]);

  const handleCopyHTML = useCallback(async () => {
    if (!preset) return;
    try {
      await navigator.clipboard.writeText(preset.html);
      toast.success('HTML copied!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [preset]);

  const handleCopyCSS = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      toast.success('CSS copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [cssCode]);

  const handleReset = useCallback(() => {
    setSelectedSpinner('border-spinner');
    setColor('#3b82f6');
    setSecondaryColor('#f59e0b');
    setSize(48);
    setSpeed(0.75);
  }, []);

  const trackColor = `${color}33`;

  return (
    <ToolLayout
      title="CSS Loader & Spinner Generator"
      description="Design and customize gorgeous loading spinners — 12 presets, live preview, and production-ready CSS. Zero JavaScript required for the spinners themselves."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Controls ──────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Spinner Selection Grid */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Spinner Type</h3>
            <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
              {SPINNERS.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSpinner(sp.id)}
                  className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                    selectedSpinner === sp.id
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 bg-surface hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="font-medium text-xs">{sp.name}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5 leading-tight">{sp.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-brand-400" />
              Colors
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-slate-400 text-sm w-24">Primary</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="bg-surface border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-sm w-24"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-slate-400 text-sm w-24">Secondary</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="bg-surface border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-sm w-24"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((cp) => (
                  <button
                    key={cp.name}
                    onClick={() => setColor(cp.value)}
                    className="w-7 h-7 rounded-md border border-slate-700/50 hover:scale-110 transition-transform"
                    style={{ backgroundColor: cp.value }}
                    title={cp.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-brand-400" />
              Size: {size}px
            </h3>
            <input
              type="range"
              min={16}
              max={120}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>16px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Speed */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-brand-400" />
              Speed: {speed}s
            </h3>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Fast (0.2s)</span>
              <span>Slow (3s)</span>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
        </div>

        {/* ── Right: Preview + Code ───────────────────────────────── */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Live Preview</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setBgMode('dark')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    bgMode === 'dark' ? 'bg-brand-500 text-white' : 'bg-surface text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setBgMode('light')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    bgMode === 'light' ? 'bg-brand-500 text-white' : 'bg-surface text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Light
                </button>
              </div>
            </div>
            <div
              className={`rounded-xl border border-slate-700/50 flex items-center justify-center min-h-[280px] transition-colors ${
                bgMode === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
              }`}
            >
              <style>{previewCSS}</style>
              <div
                key={`${selectedSpinner}-${color}-${size}-${speed}`}
                dangerouslySetInnerHTML={{ __html: preset?.html || '' }}
                style={{
                  ['--spinner-color' as string]: color,
                  ['--spinner-track' as string]: trackColor,
                  ['--spinner-size' as string]: `${size}px`,
                  ['--spinner-speed' as string]: `${speed}s`,
                  ['--spinner-secondary' as string]: secondaryColor,
                }}
              />
            </div>
          </div>

          {/* HTML code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">HTML</label>
              <button
                onClick={handleCopyHTML}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy HTML
              </button>
            </div>
            <pre className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-brand-400 font-mono text-sm overflow-x-auto">
              {preset?.html || ''}
            </pre>
          </div>

          {/* CSS code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">CSS</label>
              <button
                onClick={handleCopyCSS}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>
            <pre className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
              {cssCode}
            </pre>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-10 p-5 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-semibold text-sm mb-3">Usage Tips</h3>
        <ul className="text-sm text-slate-400 space-y-1.5 list-disc list-inside">
          <li>Copy the <strong className="text-slate-300">HTML</strong> into your page wherever you want the spinner to appear.</li>
          <li>Copy the <strong className="text-slate-300">CSS</strong> into your stylesheet — it uses CSS custom properties so you can override colors, size, and speed at any level.</li>
          <li>All spinners are <strong className="text-slate-300">pure CSS</strong> — no JavaScript animations, no heavy GIF files.</li>
          <li>Override via CSS classes: <code className="text-brand-400 text-xs">.spinner {'{'} --spinner-color: red; --spinner-size: 64px; {'}'}</code></li>
        </ul>
      </div>
    </ToolLayout>
  );
}
