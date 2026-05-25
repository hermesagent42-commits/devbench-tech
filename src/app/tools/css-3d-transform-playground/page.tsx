'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Boxes, Eye, Layers, FlipHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

interface State3D {
  perspective: number;
  perspectiveOriginX: number;
  perspectiveOriginY: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateZ: number;
  scale: number;
  backfaceVisible: boolean;
  preserve3d: boolean;
}

interface Preset {
  name: string;
  values: State3D;
  description: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Card Flip',
    description: 'Classic 3D card flip effect',
    values: { perspective: 800, perspectiveOriginX: 50, perspectiveOriginY: 50, rotateX: 0, rotateY: 180, rotateZ: 0, translateZ: 0, scale: 1, backfaceVisible: false, preserve3d: true },
  },
  {
    name: 'Perspective Tilt',
    description: 'Hover-style 3D tilt card',
    values: { perspective: 600, perspectiveOriginX: 50, perspectiveOriginY: 50, rotateX: 8, rotateY: -12, rotateZ: 0, translateZ: 40, scale: 1.05, backfaceVisible: true, preserve3d: false },
  },
  {
    name: 'Book Opening',
    description: 'Open a book with rotateY',
    values: { perspective: 1000, perspectiveOriginX: 0, perspectiveOriginY: 50, rotateX: 0, rotateY: 60, rotateZ: 0, translateZ: 0, scale: 1, backfaceVisible: false, preserve3d: true },
  },
  {
    name: 'Falling Back',
    description: 'Lay flat with rotateX',
    values: { perspective: 500, perspectiveOriginX: 50, perspectiveOriginY: 0, rotateX: 75, rotateY: 0, rotateZ: 0, translateZ: 0, scale: 1, backfaceVisible: true, preserve3d: false },
  },
  {
    name: 'Corner Zoom',
    description: '3D pop from bottom-right',
    values: { perspective: 400, perspectiveOriginX: 100, perspectiveOriginY: 100, rotateX: -10, rotateY: -15, rotateZ: 5, translateZ: 60, scale: 1.1, backfaceVisible: true, preserve3d: false },
  },
  {
    name: 'Diamond Spin',
    description: 'Rotate on all 3 axes',
    values: { perspective: 700, perspectiveOriginX: 50, perspectiveOriginY: 50, rotateX: 15, rotateY: 15, rotateZ: 25, translateZ: 30, scale: 1, backfaceVisible: true, preserve3d: false },
  },
  {
    name: 'Door Swing',
    description: 'Open like a door from left',
    values: { perspective: 800, perspectiveOriginX: 0, perspectiveOriginY: 50, rotateX: 0, rotateY: -70, rotateZ: 0, translateZ: 0, scale: 1, backfaceVisible: false, preserve3d: true },
  },
  {
    name: 'Tablet View',
    description: 'Isometric 3D tablet angle',
    values: { perspective: 900, perspectiveOriginX: 50, perspectiveOriginY: 50, rotateX: 55, rotateY: 0, rotateZ: -25, translateZ: 20, scale: 0.9, backfaceVisible: true, preserve3d: false },
  },
  {
    name: 'Deep Zoom',
    description: 'Far perspective, big Z push',
    values: { perspective: 300, perspectiveOriginX: 50, perspectiveOriginY: 50, rotateX: 0, rotateY: 0, rotateZ: 0, translateZ: 150, scale: 1.4, backfaceVisible: true, preserve3d: false },
  },
  {
    name: 'Reset',
    description: 'Flat, no transforms',
    values: { perspective: 500, perspectiveOriginX: 50, perspectiveOriginY: 50, rotateX: 0, rotateY: 0, rotateZ: 0, translateZ: 0, scale: 1, backfaceVisible: true, preserve3d: false },
  },
];

const DEFAULT_STATE: State3D = {
  perspective: 500,
  perspectiveOriginX: 50,
  perspectiveOriginY: 50,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  translateZ: 0,
  scale: 1,
  backfaceVisible: true,
  preserve3d: false,
};

function buildCSSCode(state: State3D): string {
  const lines: string[] = [];
  if (state.perspective > 0) {
    lines.push(`perspective: ${state.perspective}px;`);
  }
  lines.push(`perspective-origin: ${state.perspectiveOriginX}% ${state.perspectiveOriginY}%;`);

  const transforms: string[] = [];
  if (state.translateZ !== 0) transforms.push(`translateZ(${state.translateZ}px)`);
  if (state.rotateX !== 0) transforms.push(`rotateX(${state.rotateX}deg)`);
  if (state.rotateY !== 0) transforms.push(`rotateY(${state.rotateY}deg)`);
  if (state.rotateZ !== 0) transforms.push(`rotateZ(${state.rotateZ}deg)`);
  if (state.scale !== 1) transforms.push(`scale(${state.scale.toFixed(2)})`);

  if (transforms.length > 0) {
    lines.push(`transform: ${transforms.join(' ')};`);
  }

  if (!state.backfaceVisible) {
    lines.push('backface-visibility: hidden;');
  }
  if (state.preserve3d) {
    lines.push('transform-style: preserve-3d;');
  }

  return lines.join('\n');
}

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs font-mono text-brand-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

export default function CSS3DTransformPlaygroundPage() {
  const [state, setState] = useState<State3D>({ ...DEFAULT_STATE });
  const [showBackfaceDemo, setShowBackfaceDemo] = useState(false);

  const css = useMemo(() => buildCSSCode(state), [state]);

  const set = useCallback(<K extends keyof State3D>(key: K, value: State3D[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setState({ ...preset.values });
    if (preset.name === 'Card Flip' || preset.name === 'Door Swing' || preset.name === 'Book Opening') {
      setShowBackfaceDemo(true);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ ...DEFAULT_STATE });
    setShowBackfaceDemo(false);
  }, []);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Copy failed'),
    );
  }, [css]);

  const sceneStyle: React.CSSProperties = {
    perspective: `${state.perspective}px`,
    perspectiveOrigin: `${state.perspectiveOriginX}% ${state.perspectiveOriginY}%`,
  };

  const cardStyle: React.CSSProperties = {
    width: '160px',
    height: '160px',
    position: 'relative',
    transformStyle: state.preserve3d ? 'preserve-3d' : 'flat',
    transform: [
      state.translateZ !== 0 ? `translateZ(${state.translateZ}px)` : '',
      state.rotateX !== 0 ? `rotateX(${state.rotateX}deg)` : '',
      state.rotateY !== 0 ? `rotateY(${state.rotateY}deg)` : '',
      state.rotateZ !== 0 ? `rotateZ(${state.rotateZ}deg)` : '',
      state.scale !== 1 ? `scale(${state.scale.toFixed(2)})` : '',
    ].filter(Boolean).join(' '),
  };

  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    fontSize: '40px',
  };

  const frontFace: React.CSSProperties = {
    ...faceStyle,
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.5)',
    backfaceVisibility: state.backfaceVisible ? 'visible' : 'hidden',
  };

  const backFace: React.CSSProperties = {
    ...faceStyle,
    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
    boxShadow: '0 8px 32px rgba(245, 158, 11, 0.5)',
    transform: 'rotateY(180deg)',
    backfaceVisibility: state.backfaceVisible ? 'visible' : 'hidden',
  };

  return (
    <ToolLayout
      title="CSS 3D Transform Playground"
      description="Build CSS 3D transforms with perspective — rotateX, rotateY, rotateZ, translateZ, backface-visibility, and transform-style: preserve-3d. Live preview with 10 presets."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyCss} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button onClick={reset} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-5">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Presets</h2>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="text-left px-3 py-2 rounded-lg bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all group"
                >
                  <div className="text-xs font-medium group-hover:text-brand-300">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Perspective */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Perspective
            </h2>
            <p className="text-xs text-slate-500 mb-2">
              Lower values = more dramatic 3D effect. Set on the parent element.
            </p>
            <SliderControl
              label="perspective"
              value={state.perspective}
              min={100}
              max={2000}
              step={10}
              unit="px"
              onChange={(v) => set('perspective', v)}
            />
            <SliderControl
              label="Origin X"
              value={state.perspectiveOriginX}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => set('perspectiveOriginX', v)}
            />
            <SliderControl
              label="Origin Y"
              value={state.perspectiveOriginY}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => set('perspectiveOriginY', v)}
            />
          </div>

          {/* 3D Rotations */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <FlipHorizontal className="w-4 h-4 text-brand-400" />
              3D Rotations
            </h2>
            <SliderControl
              label="rotateX"
              value={state.rotateX}
              min={-180}
              max={180}
              unit="°"
              onChange={(v) => set('rotateX', v)}
            />
            <SliderControl
              label="rotateY"
              value={state.rotateY}
              min={-180}
              max={180}
              unit="°"
              onChange={(v) => set('rotateY', v)}
            />
            <SliderControl
              label="rotateZ"
              value={state.rotateZ}
              min={-180}
              max={180}
              unit="°"
              onChange={(v) => set('rotateZ', v)}
            />
          </div>

          {/* Translate Z + Scale */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              Depth &amp; Scale
            </h2>
            <SliderControl
              label="translateZ"
              value={state.translateZ}
              min={-200}
              max={300}
              step={5}
              unit="px"
              onChange={(v) => set('translateZ', v)}
            />
            <SliderControl
              label="scale"
              value={state.scale}
              min={0.1}
              max={2}
              step={0.05}
              onChange={(v) => set('scale', v)}
            />
          </div>

          {/* Backface & transform-style */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand-400" />
              3D Properties
            </h2>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.backfaceVisible}
                onChange={(e) => set('backfaceVisible', e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-brand-500"
              />
              <span className="text-xs text-slate-300">backface-visibility: visible</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.preserve3d}
                onChange={(e) => set('preserve3d', e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-brand-500"
              />
              <span className="text-xs text-slate-300">transform-style: preserve-3d</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBackfaceDemo}
                onChange={(e) => setShowBackfaceDemo(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-brand-500"
              />
              <span className="text-xs text-slate-300">Show back face (card with front/back)</span>
            </label>
          </div>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Live Preview</h2>
            <div
              className="flex items-center justify-center py-16 px-8 min-h-[340px] rounded-lg relative"
              style={{ background: '#0f172a' }}
            >
              {/* Grid for visual reference */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
                  `,
                  backgroundSize: '24px 24px',
                }}
              />
              {/* Perspective scene */}
              <div style={sceneStyle}>
                <div style={cardStyle}>
                  {/* Front face */}
                  <div style={frontFace}>
                    <span className="select-none">✦</span>
                  </div>
                  {/* Back face (shown when rotated past ~90 degrees) */}
                  {showBackfaceDemo && (
                    <div style={backFace}>
                      <span className="select-none">♠</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Generated CSS</h2>
              <button
                onClick={copyCss}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
              {css || '/* No transforms applied */'}
            </pre>
          </div>

          {/* Active Transforms */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Active 3D Transforms</h2>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-400 font-mono w-24 shrink-0">perspective</span>
                <span className="text-slate-400 font-mono">{state.perspective}px</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-400 font-mono w-24 shrink-0">persp-origin</span>
                <span className="text-slate-400 font-mono">
                  {state.perspectiveOriginX}% {state.perspectiveOriginY}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-400 font-mono w-24 shrink-0">rotateX</span>
                <span className="text-slate-400 font-mono">{state.rotateX}deg</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-400 font-mono w-24 shrink-0">rotateY</span>
                <span className="text-slate-400 font-mono">{state.rotateY}deg</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-400 font-mono w-24 shrink-0">rotateZ</span>
                <span className="text-slate-400 font-mono">{state.rotateZ}deg</span>
              </div>
              {state.translateZ !== 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-400 font-mono w-24 shrink-0">translateZ</span>
                  <span className="text-slate-400 font-mono">{state.translateZ}px</span>
                </div>
              )}
              {state.scale !== 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-400 font-mono w-24 shrink-0">scale</span>
                  <span className="text-slate-400 font-mono">{state.scale.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-400 font-mono w-24 shrink-0">backface</span>
                <span className={`font-mono text-xs ${state.backfaceVisible ? 'text-green-400' : 'text-amber-400'}`}>
                  {state.backfaceVisible ? 'visible' : 'hidden'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-brand-400 font-mono w-24 shrink-0">tfm-style</span>
                <span className={`font-mono text-xs ${state.preserve3d ? 'text-green-400' : 'text-slate-500'}`}>
                  {state.preserve3d ? 'preserve-3d' : 'flat'}
                </span>
              </div>
            </div>
          </div>

          {/* Learn more */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">How 3D Transforms Work</h2>
            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                <strong className="text-slate-300">perspective</strong> on the parent creates the 3D space.
                Lower values (e.g., 300px) create more dramatic depth.
              </p>
              <p>
                <strong className="text-slate-300">rotateX</strong> tilts the element forward/backward.
                {' '}
                <strong className="text-slate-300">rotateY</strong> spins it left/right.
                {' '}
                <strong className="text-slate-300">rotateZ</strong> is equivalent to the 2D rotate().
              </p>
              <p>
                <strong className="text-slate-300">translateZ</strong> pushes the element toward or away from the viewer along the z-axis.
              </p>
              <p>
                <strong className="text-slate-300">backface-visibility: hidden</strong> hides the back of the element when rotated past 90° — essential for card flips.
              </p>
              <p>
                <strong className="text-slate-300">transform-style: preserve-3d</strong> is needed on the parent when children should exist in 3D space (like front/back faces of a card).
              </p>
              <p className="text-amber-400">
                Browser support: All modern browsers (Chrome 36+, Firefox 16+, Safari 9+, Edge 12+).
                Use <code className="text-purple-400">-webkit-</code> prefixes for older Safari.
              </p>
            </div>
          </div>

          {/* Pro tips */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h2 className="text-white font-medium text-sm mb-2">Pro Tips</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Add <code className="text-brand-400">transition: transform 0.6s</code> for smooth 3D animations</li>
              <li>Always set <code className="text-brand-400">perspective</code> on the parent, not the element itself</li>
              <li>For card flips, use <code className="text-brand-400">backface-visibility: hidden</code> on both faces</li>
              <li>Try <code className="text-brand-400">perspective-origin</code> to change the vanishing point</li>
              <li>CSS 3D transforms are GPU-accelerated — great performance!</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
