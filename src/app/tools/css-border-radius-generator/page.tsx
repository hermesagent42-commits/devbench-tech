'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Link, Unlink, Square } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface CornerValues {
  tlX: number;
  tlY: number;
  trX: number;
  trY: number;
  brX: number;
  brY: number;
  blX: number;
  blY: number;
}

interface Preset {
  name: string;
  description: string;
  values: CornerValues;
  color: string;
  size: number;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Default Rounded',
    description: 'Classic 16px all around',
    color: '#6366f1',
    size: 180,
    values: { tlX: 16, tlY: 16, trX: 16, trY: 16, brX: 16, brY: 16, blX: 16, blY: 16 },
  },
  {
    name: 'Pill',
    description: 'Fully rounded sides (50% radius)',
    color: '#22c55e',
    size: 180,
    values: { tlX: 90, tlY: 90, trX: 90, trY: 90, brX: 90, brY: 90, blX: 90, blY: 90 },
  },
  {
    name: 'Organic Blob',
    description: 'Asymmetric smooth curves',
    color: '#f97316',
    size: 180,
    values: { tlX: 60, tlY: 30, trX: 30, trY: 55, brX: 50, brY: 40, blX: 35, blY: 50 },
  },
  {
    name: 'Leaf Shape',
    description: 'Asymmetric top, rounded bottom',
    color: '#a855f7',
    size: 180,
    values: { tlX: 70, tlY: 20, trX: 20, trY: 70, brX: 60, brY: 60, blX: 40, blY: 40 },
  },
  {
    name: 'Quote Bubble',
    description: 'Rounded everywhere except bottom-left',
    color: '#06b6d4',
    size: 180,
    values: { tlX: 24, tlY: 24, trX: 24, trY: 24, brX: 24, brY: 24, blX: 4, blY: 4 },
  },
  {
    name: 'Badge / Tag',
    description: 'Sharp left, pill right',
    color: '#ef4444',
    size: 180,
    values: { tlX: 4, tlY: 4, trX: 70, trY: 70, brX: 70, brY: 70, blX: 4, blY: 4 },
  },
  {
    name: 'Diagonal Cut',
    description: 'Opposite corners rounded',
    color: '#eab308',
    size: 180,
    values: { tlX: 0, tlY: 0, trX: 40, trY: 40, brX: 0, brY: 0, blX: 40, blY: 40 },
  },
  {
    name: 'Tear Drop',
    description: 'Pointed top, rounded bottom',
    color: '#ec4899',
    size: 180,
    values: { tlX: 4, tlY: 4, trX: 4, trY: 4, brX: 50, brY: 50, blX: 50, blY: 50 },
  },
  {
    name: 'Notch Card',
    description: 'Deep cut on one corner',
    color: '#14b8a6',
    size: 180,
    values: { tlX: 80, tlY: 80, trX: 12, trY: 12, brX: 12, brY: 12, blX: 12, blY: 12 },
  },
  {
    name: 'Wide Rounded',
    description: 'Horizontal-heavy asymmetric curves',
    color: '#8b5cf6',
    size: 180,
    values: { tlX: 70, tlY: 25, trX: 25, trY: 60, brX: 55, brY: 30, blX: 30, blY: 55 },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function cornerCSS(values: CornerValues): string {
  const { tlX, tlY, trX, trY, brX, brY, blX, blY } = values;
  // If all 8 values are identical, use shorthand
  if (tlX === tlY && tlX === trX && tlX === trY && tlX === brX && tlX === brY && tlX === blX && tlX === blY) {
    return `border-radius: ${tlX}px;`;
  }
  // If horizontal=vertical per corner, use 4-value shorthand
  if (tlX === tlY && trX === trY && brX === brY && blX === blY) {
    return `border-radius: ${tlX}px ${trX}px ${brX}px ${blX}px;`;
  }
  // Full 8-value syntax: top-left-x top-right-x bottom-right-x bottom-left-x / top-left-y top-right-y bottom-right-y bottom-left-y
  return `border-radius: ${tlX}px ${trX}px ${brX}px ${blX}px / ${tlY}px ${trY}px ${brY}px ${blY}px;`;
}

function cornerTailwind(values: CornerValues): string {
  const { tlX, tlY, trX, trY, brX, brY, blX, blY } = values;
  const allSame = tlX === tlY && tlX === trX && tlX === trY && tlX === brX && tlX === brY && tlX === blX && tlX === blY;
  const symm = tlX === tlY && trX === trY && brX === brY && blX === blY;

  if (allSame) {
    if (tlX === 0) return 'rounded-none';
    if (tlX === 2) return 'rounded-sm';
    if (tlX === 4) return 'rounded';
    if (tlX === 6) return 'rounded-md';
    if (tlX === 8) return 'rounded-lg';
    if (tlX === 12) return 'rounded-xl';
    if (tlX === 16) return 'rounded-2xl';
    if (tlX === 24) return 'rounded-3xl';
    if (tlX >= 9999) return 'rounded-full';
    return `rounded-[${tlX}px]`;
  }
  if (symm) {
    const parts: string[] = [];
    if (tlX > 0) parts.push(`rounded-tl-[${tlX}px]`);
    if (trX > 0) parts.push(`rounded-tr-[${trX}px]`);
    if (brX > 0) parts.push(`rounded-br-[${brX}px]`);
    if (blX > 0) parts.push(`rounded-bl-[${blX}px]`);
    return parts.join(' ');
  }
  // For asymmetric, show the CSS as arbitrary value
  return `[border-radius:${tlX}px_${trX}px_${brX}px_${blX}px/${tlY}px_${trY}px_${brY}px_${blY}px]`;
}

// ── Slider Control ─────────────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-400 font-medium">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-slate-200 text-right font-mono focus:outline-none focus:border-brand-500"
          />
          <span className="text-[10px] text-slate-500">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CSSBorderRadiusGenerator() {
  const [values, setValues] = useState<CornerValues>({
    tlX: 16, tlY: 16,
    trX: 16, trY: 16,
    brX: 16, brY: 16,
    blX: 16, blY: 16,
  });
  const [linked, setLinked] = useState(true);
  const [previewColor, setPreviewColor] = useState('#6366f1');
  const [previewSize, setPreviewSize] = useState(180);
  const [showCode, setShowCode] = useState<'css' | 'tailwind'>('css');

  const setAll = useCallback((v: number) => {
    setValues({ tlX: v, tlY: v, trX: v, trY: v, brX: v, brY: v, blX: v, blY: v });
  }, []);

  const updateCorner = useCallback(
    (corner: keyof CornerValues, val: number) => {
      if (linked) {
        setAll(val);
      } else {
        setValues((prev) => ({ ...prev, [corner]: val }));
      }
    },
    [linked, setAll],
  );

  const applyPreset = useCallback((preset: Preset) => {
    setValues(preset.values);
    setPreviewColor(preset.color);
    setPreviewSize(preset.size);
    setLinked(false);
  }, []);

  const resetAll = useCallback(() => {
    setValues({ tlX: 16, tlY: 16, trX: 16, trY: 16, brX: 16, brY: 16, blX: 16, blY: 16 });
    setLinked(true);
    setPreviewColor('#6366f1');
    setPreviewSize(180);
  }, []);

  const copyCSS = useCallback(() => {
    const text = showCode === 'css' ? cornerCSS(values) : cornerTailwind(values);
    navigator.clipboard.writeText(text);
    toast.success(`${showCode === 'css' ? 'CSS' : 'Tailwind'} copied!`);
  }, [values, showCode]);

  const maxRadius = useMemo(() => Math.floor(previewSize / 2), [previewSize]);

  const cssOutput = useMemo(() => cornerCSS(values), [values]);
  const tailwindOutput = useMemo(() => cornerTailwind(values), [values]);

  // Generate SVG path for the border-radius overlay
  const svgPath = useMemo(() => {
    const { tlX, tlY, trX, trY, brX, brY, blX, blY } = values;
    const w = previewSize;
    const h = previewSize;

    // Clamp values
    const c = (v: number) => Math.min(v, maxRadius);

    const tlx = c(tlX); const tly = c(tlY);
    const trx = c(trX); const try_ = c(trY);
    const brx = c(brX); const bry = c(brY);
    const blx = c(blX); const bly = c(blY);

    // SVG path with true elliptical arcs
    // Top-left corner
    let path = `M ${tlx} 0`;
    // Top edge → top-right
    path += ` L ${w - trx} 0`;
    // Top-right corner (sweep-flag=1 for convex)
    if (trx > 0 || try_ > 0) {
      path += ` A ${trx} ${try_} 0 0 1 ${w} ${try_}`;
    } else {
      path += ` L ${w} ${try_}`;
    }
    // Right edge → bottom-right
    path += ` L ${w} ${h - bry}`;
    // Bottom-right corner
    if (brx > 0 || bry > 0) {
      path += ` A ${brx} ${bry} 0 0 1 ${w - brx} ${h}`;
    } else {
      path += ` L ${w - brx} ${h}`;
    }
    // Bottom edge → bottom-left
    path += ` L ${blx} ${h}`;
    // Bottom-left corner
    if (blx > 0 || bly > 0) {
      path += ` A ${blx} ${bly} 0 0 1 0 ${h - bly}`;
    } else {
      path += ` L 0 ${h - bly}`;
    }
    // Left edge → top-left
    path += ` L 0 ${tly}`;
    // Top-left corner
    if (tlx > 0 || tly > 0) {
      path += ` A ${tlx} ${tly} 0 0 1 ${tlx} 0`;
    } else {
      path += ` L ${tlx} 0`;
    }
    path += ' Z';

    return path;
  }, [values, previewSize, maxRadius]);

  return (
    <ToolLayout
      title="CSS Border‑Radius Generator"
      description="Design custom border‑radius shapes — control all 8 values (horizontal + vertical per corner), toggle symmetry, and copy CSS or Tailwind. 10 presets, live preview, pure client‑side."
      controls={
        <>
          <button onClick={copyCSS} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Copy {showCode === 'css' ? 'CSS' : 'Tailwind'}
          </button>
          <button onClick={resetAll} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Presets & Link Toggle ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-left p-2.5 rounded-lg bg-surface-light border border-slate-700/50 hover:border-brand-500/50 transition-colors"
                  title={p.description}
                >
                  <div className="text-xs font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Output code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Output</h3>
              <div className="flex bg-slate-800 rounded border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setShowCode('css')}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors ${showCode === 'css' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  CSS
                </button>
                <button
                  onClick={() => setShowCode('tailwind')}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors ${showCode === 'tailwind' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  Tailwind
                </button>
              </div>
            </div>
            <div className="p-3 rounded bg-slate-900/70 border border-slate-700/50">
              <pre className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {showCode === 'css' ? cssOutput : tailwindOutput}
              </pre>
            </div>
          </div>
        </div>

        {/* ── Center: Live Preview & Controls ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Preview</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-slate-500">Color</label>
                  <input
                    type="color"
                    value={previewColor}
                    onChange={(e) => setPreviewColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-slate-500">Size</label>
                  <input
                    type="range"
                    value={previewSize}
                    onChange={(e) => setPreviewSize(Number(e.target.value))}
                    min={80}
                    max={300}
                    step={10}
                    className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
                  />
                </div>
              </div>
            </div>
            {/* Preview with SVG overlay showing the actual curve */}
            <div className="h-80 rounded-lg flex items-center justify-center bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%,#1e293b)] bg-[length:20px_20px] bg-[#0f172a] border border-slate-700/30">
              <div className="relative" style={{ width: previewSize, height: previewSize }}>
                {/* Actual shape using clip-path with the SVG path */}
                <svg width={previewSize} height={previewSize} className="absolute inset-0">
                  <defs>
                    <clipPath id="radius-clip">
                      <path d={svgPath} />
                    </clipPath>
                  </defs>
                  <rect
                    width={previewSize}
                    height={previewSize}
                    fill={previewColor}
                    clipPath="url(#radius-clip)"
                  />
                  {/* Outline */}
                  <path
                    d={svgPath}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                  />
                  {/* Corner measurement guides */}
                  {[
                    { cx: 0, cy: 0, rx: values.tlX, ry: values.tlY, corner: 'TL' },
                    { cx: previewSize, cy: 0, rx: values.trX, ry: values.trY, corner: 'TR' },
                    { cx: previewSize, cy: previewSize, rx: values.brX, ry: values.brY, corner: 'BR' },
                    { cx: 0, cy: previewSize, rx: values.blX, ry: values.blY, corner: 'BL' },
                  ].map(({ cx, cy, rx, ry, corner }) => {
                    if (rx === 0 && ry === 0) return null;
                    const cVal = Math.min(rx, ry, maxRadius);
                    const signX = cx === 0 ? 1 : -1;
                    const signY = cy === 0 ? 1 : -1;
                    const labelX = cx + signX * cVal * 0.5;
                    const labelY = cy + signY * cVal * 0.5;
                    return (
                      <g key={corner}>
                        {/* Dashed arc */}
                        <ellipse
                          cx={cx}
                          cy={cy}
                          rx={Math.min(rx, maxRadius)}
                          ry={Math.min(ry, maxRadius)}
                          fill="none"
                          stroke="rgba(99,102,241,0.4)"
                          strokeWidth="1"
                          strokeDasharray="3 2"
                        />
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="rgba(255,255,255,0.5)"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {corner}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Link/Unlink Toggle */}
          <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">Corner Linking</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {linked
                  ? 'All 8 values move together — uniform rounding'
                  : 'Each corner is independent — asymmetric shapes'}
              </p>
            </div>
            <button
              onClick={() => setLinked(!linked)}
              className={`p-2 rounded-lg border transition-colors ${
                linked
                  ? 'bg-brand-500/10 border-brand-500/40 text-brand-400'
                  : 'bg-slate-800 border-slate-600 text-slate-400'
              }`}
            >
              {linked ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
            </button>
          </div>

          {/* Sliders */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Corner Values</h3>

            {/* Top-Left */}
            <div>
              <div className="text-[10px] text-slate-500 font-medium mb-1.5 border-b border-slate-700/30 pb-1">Top-Left Corner</div>
              <div className="grid grid-cols-2 gap-3">
                <SliderControl
                  label="Horizontal (↔)"
                  value={values.tlX}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('tlX', v)}
                />
                <SliderControl
                  label="Vertical (↕)"
                  value={values.tlY}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('tlY', v)}
                />
              </div>
            </div>

            {/* Top-Right */}
            <div>
              <div className="text-[10px] text-slate-500 font-medium mb-1.5 border-b border-slate-700/30 pb-1">Top-Right Corner</div>
              <div className="grid grid-cols-2 gap-3">
                <SliderControl
                  label="Horizontal (↔)"
                  value={values.trX}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('trX', v)}
                />
                <SliderControl
                  label="Vertical (↕)"
                  value={values.trY}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('trY', v)}
                />
              </div>
            </div>

            {/* Bottom-Right */}
            <div>
              <div className="text-[10px] text-slate-500 font-medium mb-1.5 border-b border-slate-700/30 pb-1">Bottom-Right Corner</div>
              <div className="grid grid-cols-2 gap-3">
                <SliderControl
                  label="Horizontal (↔)"
                  value={values.brX}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('brX', v)}
                />
                <SliderControl
                  label="Vertical (↕)"
                  value={values.brY}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('brY', v)}
                />
              </div>
            </div>

            {/* Bottom-Left */}
            <div>
              <div className="text-[10px] text-slate-500 font-medium mb-1.5 border-b border-slate-700/30 pb-1">Bottom-Left Corner</div>
              <div className="grid grid-cols-2 gap-3">
                <SliderControl
                  label="Horizontal (↔)"
                  value={values.blX}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('blX', v)}
                />
                <SliderControl
                  label="Vertical (↕)"
                  value={values.blY}
                  min={0}
                  max={200}
                  onChange={(v) => updateCorner('blY', v)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
