'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Corners {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

interface Preset {
  name: string;
  corners: Corners;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Subtle Rounded',
    corners: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 },
  },
  {
    name: 'Card',
    corners: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
  },
  {
    name: 'Pill',
    corners: { topLeft: 50, topRight: 50, bottomRight: 50, bottomLeft: 50 },
  },
  {
    name: 'Chat Bubble Left',
    corners: { topLeft: 4, topRight: 20, bottomRight: 20, bottomLeft: 20 },
  },
  {
    name: 'Chat Bubble Right',
    corners: { topLeft: 20, topRight: 4, bottomRight: 20, bottomLeft: 20 },
  },
  {
    name: 'Leaf Shape',
    corners: { topLeft: 50, topRight: 8, bottomRight: 50, bottomLeft: 8 },
  },
  {
    name: 'Diagonal Slant',
    corners: { topLeft: 24, topRight: 0, bottomRight: 24, bottomLeft: 0 },
  },
  {
    name: 'Notch',
    corners: { topLeft: 16, topRight: 16, bottomRight: 0, bottomLeft: 16 },
  },
  {
    name: 'Squircle',
    corners: { topLeft: 30, topRight: 30, bottomRight: 30, bottomLeft: 30 },
  },
  {
    name: 'Sharp',
    corners: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
  },
];

const DEFAULT_CORNERS: Corners = {
  topLeft: 12,
  topRight: 12,
  bottomRight: 12,
  bottomLeft: 12,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function buildCSS(corners: Corners): string {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    if (topLeft === 0) return 'border-radius: 0;';
    return `border-radius: ${topLeft}px;`;
  }
  return `border-radius: ${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px;`;
}

function buildIndividualCSS(corners: Corners): string {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  const lines: string[] = [];
  if (topLeft > 0) lines.push(`border-top-left-radius: ${topLeft}px;`);
  if (topRight > 0) lines.push(`border-top-right-radius: ${topRight}px;`);
  if (bottomRight > 0) lines.push(`border-bottom-right-radius: ${bottomRight}px;`);
  if (bottomLeft > 0) lines.push(`border-bottom-left-radius: ${bottomLeft}px;`);
  return lines.length > 0 ? lines.join('\n') : 'border-radius: 0;';
}

// ── Slider sub-component ───────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  max = 200,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-300 font-mono tabular-nums w-10 text-right">
          {value}px
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function BorderRadiusGeneratorPage() {
  const [corners, setCorners] = useState<Corners>({ ...DEFAULT_CORNERS });
  const [uniform, setUniform] = useState(true);
  const [previewSize, setPreviewSize] = useState(200);

  const css = useMemo(() => buildCSS(corners), [corners]);
  const individualCSS = useMemo(() => buildIndividualCSS(corners), [corners]);

  const setAll = useCallback((value: number) => {
    setCorners({ topLeft: value, topRight: value, bottomRight: value, bottomLeft: value });
  }, []);

  const set = useCallback(
    (key: keyof Corners, value: number) => {
      setCorners((prev) => {
        if (uniform) {
          return { topLeft: value, topRight: value, bottomRight: value, bottomLeft: value };
        }
        return { ...prev, [key]: value };
      });
    },
    [uniform]
  );

  const toggleUniform = useCallback(() => {
    setUniform((prev) => {
      if (!prev) {
        // switching ON: snap all corners to topLeft
        setCorners((c) => {
          const v = c.topLeft;
          return { topLeft: v, topRight: v, bottomRight: v, bottomLeft: v };
        });
      }
      return !prev;
    });
  }, []);

  const reset = useCallback(() => {
    setCorners({ ...DEFAULT_CORNERS });
    setUniform(true);
    setPreviewSize(200);
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setCorners({ ...preset.corners });
    const all = preset.corners;
    if (
      all.topLeft === all.topRight &&
      all.topRight === all.bottomRight &&
      all.bottomRight === all.bottomLeft
    ) {
      setUniform(true);
    } else {
      setUniform(false);
    }
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [css]);

  const copyIndividualCSS = useCallback(() => {
    navigator.clipboard.writeText(individualCSS).then(
      () => toast.success('Individual CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [individualCSS]);

  // For visual corner overlays
  const overlayStyle = (corner: 'tl' | 'tr' | 'br' | 'bl'): React.CSSProperties => {
    const size = 32;
    const base: React.CSSProperties = {
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
      pointerEvents: 'none',
      zIndex: 10,
    };
    switch (corner) {
      case 'tl':
        return { ...base, top: 4, left: 4, borderTop: '1px solid rgba(99,102,241,0.6)', borderLeft: '1px solid rgba(99,102,241,0.6)' };
      case 'tr':
        return { ...base, top: 4, right: 4, borderTop: '1px solid rgba(99,102,241,0.6)', borderRight: '1px solid rgba(99,102,241,0.6)' };
      case 'br':
        return { ...base, bottom: 4, right: 4, borderBottom: '1px solid rgba(99,102,241,0.6)', borderRight: '1px solid rgba(99,102,241,0.6)' };
      case 'bl':
        return { ...base, bottom: 4, left: 4, borderBottom: '1px solid rgba(99,102,241,0.6)', borderLeft: '1px solid rgba(99,102,241,0.6)' };
    }
  };

  return (
    <ToolLayout
      title="CSS Border-Radius Generator"
      description="Visually craft border-radius for any element. Control individual corners, use presets, and copy ready-to-use CSS — all client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Presets</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Uniform toggle */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Corner Mode</h2>
              <button
                onClick={toggleUniform}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${
                  uniform
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                {uniform ? (
                  <>
                    <Lock className="w-3 h-3" /> Uniform
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" /> Individual
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Corner Controls */}
          <div className="card space-y-4">
            <h2 className="text-white font-semibold text-sm mb-2">Values</h2>
            {uniform ? (
              <SliderControl
                label="All Corners"
                value={corners.topLeft}
                onChange={(v) => setAll(v)}
              />
            ) : (
              <>
                <SliderControl
                  label="Top Left"
                  value={corners.topLeft}
                  onChange={(v) => set('topLeft', v)}
                />
                <SliderControl
                  label="Top Right"
                  value={corners.topRight}
                  onChange={(v) => set('topRight', v)}
                />
                <SliderControl
                  label="Bottom Right"
                  value={corners.bottomRight}
                  onChange={(v) => set('bottomRight', v)}
                />
                <SliderControl
                  label="Bottom Left"
                  value={corners.bottomLeft}
                  onChange={(v) => set('bottomLeft', v)}
                />
              </>
            )}
          </div>

          {/* Preview Size */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Preview Size</h2>
            <SliderControl
              label="Box Size"
              value={previewSize}
              max={400}
              onChange={setPreviewSize}
            />
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all
          </button>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Preview</h2>
            <div
              className="flex items-center justify-center py-12 min-h-[320px] rounded-lg relative"
              style={{ background: '#0f172a' }}
            >
              {/* Grid background */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
              {/* Box with border-radius */}
              <div className="relative">
                <div
                  className="transition-all duration-150 relative"
                  style={{
                    width: `${previewSize}px`,
                    height: `${previewSize}px`,
                    borderRadius: `${corners.topLeft}px ${corners.topRight}px ${corners.bottomRight}px ${corners.bottomLeft}px`,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                    boxShadow: '0 4px 24px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Corner labels */}
                  <div style={overlayStyle('tl')}>{corners.topLeft}px</div>
                  <div style={overlayStyle('tr')}>{corners.topRight}px</div>
                  <div style={overlayStyle('br')}>{corners.bottomRight}px</div>
                  <div style={overlayStyle('bl')}>{corners.bottomLeft}px</div>
                </div>
              </div>
            </div>
          </div>

          {/* CSS Output - Shorthand */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS Shorthand</h2>
              <button
                onClick={copyCSS}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto">
              {css}
            </pre>
          </div>

          {/* CSS Output - Individual */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Individual Properties</h2>
              <button
                onClick={copyIndividualCSS}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-32 overflow-y-auto">
              {individualCSS}
            </pre>
          </div>

          {/* Visual reference */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Shorthand Order</h2>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p>
                <code className="text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded">
                  border-radius: TL TR BR BL;
                </code>
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-brand-500/30" />
                  <span>TL: {corners.topLeft}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-purple-500/30" />
                  <span>TR: {corners.topRight}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-pink-500/30" />
                  <span>BR: {corners.bottomRight}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-cyan-500/30" />
                  <span>BL: {corners.bottomLeft}px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
