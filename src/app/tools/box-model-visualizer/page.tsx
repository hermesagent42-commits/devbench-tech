'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Box, Ruler, Code, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type BoxSizing = 'content-box' | 'border-box';

interface BoxValues {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  borderTop: number;
  borderRight: number;
  borderBottom: number;
  borderLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  contentWidth: number;
  contentHeight: number;
}

interface Preset {
  label: string;
  values: BoxValues;
  description: string;
  boxSizing: BoxSizing;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULTS: BoxValues = {
  marginTop: 20,
  marginRight: 20,
  marginBottom: 20,
  marginLeft: 20,
  borderTop: 4,
  borderRight: 4,
  borderBottom: 4,
  borderLeft: 4,
  paddingTop: 24,
  paddingRight: 24,
  paddingBottom: 24,
  paddingLeft: 24,
  contentWidth: 200,
  contentHeight: 120,
};

const PRESETS: Preset[] = [
  {
    label: 'Card',
    description: 'Classic card spacing with uniform padding',
    values: {
      marginTop: 16, marginRight: 16, marginBottom: 16, marginLeft: 16,
      borderTop: 1, borderRight: 1, borderBottom: 1, borderLeft: 1,
      paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24,
      contentWidth: 260, contentHeight: 160,
    },
    boxSizing: 'border-box',
  },
  {
    label: 'Button',
    description: 'Tight padding, no margin — compact click target',
    values: {
      marginTop: 4, marginRight: 4, marginBottom: 4, marginLeft: 4,
      borderTop: 2, borderRight: 2, borderBottom: 2, borderLeft: 2,
      paddingTop: 8, paddingRight: 16, paddingBottom: 8, paddingLeft: 16,
      contentWidth: 80, contentHeight: 24,
    },
    boxSizing: 'border-box',
  },
  {
    label: 'Section',
    description: 'Generous spacing for page sections',
    values: {
      marginTop: 48, marginRight: 0, marginBottom: 48, marginLeft: 0,
      borderTop: 0, borderRight: 0, borderBottom: 1, borderLeft: 0,
      paddingTop: 32, paddingRight: 32, paddingBottom: 32, paddingLeft: 32,
      contentWidth: 300, contentHeight: 140,
    },
    boxSizing: 'border-box',
  },
  {
    label: 'Input',
    description: 'Form input with comfortable padding',
    values: {
      marginTop: 0, marginRight: 0, marginBottom: 12, marginLeft: 0,
      borderTop: 2, borderRight: 2, borderBottom: 2, borderLeft: 2,
      paddingTop: 8, paddingRight: 12, paddingBottom: 8, paddingLeft: 12,
      contentWidth: 280, contentHeight: 20,
    },
    boxSizing: 'border-box',
  },
  {
    label: 'Image Frame',
    description: 'Picture frame with border and mat',
    values: {
      marginTop: 24, marginRight: 24, marginBottom: 24, marginLeft: 24,
      borderTop: 8, borderRight: 8, borderBottom: 8, borderLeft: 8,
      paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16,
      contentWidth: 200, contentHeight: 150,
    },
    boxSizing: 'content-box',
  },
  {
    label: 'Zero',
    description: 'Everything reset to zero — start from scratch',
    values: {
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
      borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      contentWidth: 200, contentHeight: 100,
    },
    boxSizing: 'content-box',
  },
];

// ── Calculations ───────────────────────────────────────────────────────────

interface ComputedBox {
  // Total box dimensions (margin to margin)
  totalWidth: number;
  totalHeight: number;
  // Element dimensions (border to border, what the element occupies)
  elementWidth: number;
  elementHeight: number;
  // CSS width/height property values
  cssWidth: number;
  cssHeight: number;
}

function computeBox(values: BoxValues, boxSizing: BoxSizing): ComputedBox {
  const marginH = values.marginLeft + values.marginRight;
  const marginV = values.marginTop + values.marginBottom;
  const borderH = values.borderLeft + values.borderRight;
  const borderV = values.borderTop + values.borderBottom;
  const paddingH = values.paddingLeft + values.paddingRight;
  const paddingV = values.paddingTop + values.paddingBottom;

  if (boxSizing === 'border-box') {
    // width/height includes padding + border + content
    const cssW = values.contentWidth + paddingH + borderH;
    const cssH = values.contentHeight + paddingV + borderV;
    return {
      totalWidth: marginH + cssW,
      totalHeight: marginV + cssH,
      elementWidth: cssW,
      elementHeight: cssH,
      cssWidth: cssW,
      cssHeight: cssH,
    };
  } else {
    // content-box: width/height is just content
    const elementW = values.contentWidth + paddingH + borderH;
    const elementH = values.contentHeight + paddingV + borderV;
    return {
      totalWidth: marginH + elementW,
      totalHeight: marginV + elementH,
      elementWidth: elementW,
      elementHeight: elementH,
      cssWidth: values.contentWidth,
      cssHeight: values.contentHeight,
    };
  }
}

// ── CSS Generation ─────────────────────────────────────────────────────────

function generateCSS(values: BoxValues, boxSizing: BoxSizing): string {
  const shortcut = (top: number, right: number, bottom: number, left: number) => {
    if (top === right && right === bottom && bottom === left) {
      return `${top}px`;
    }
    if (top === bottom && left === right) {
      return `${top}px ${right}px`;
    }
    if (left === right) {
      return `${top}px ${right}px ${bottom}px`;
    }
    return `${top}px ${right}px ${bottom}px ${left}px`;
  };

  const comp = computeBox(values, boxSizing);
  const lines: string[] = [];

  lines.push('.element {');

  if (boxSizing !== 'content-box') {
    lines.push('  box-sizing: border-box;');
  }

  lines.push(`  width: ${comp.cssWidth}px;`);
  lines.push(`  height: ${comp.cssHeight}px;`);

  const marginStr = shortcut(values.marginTop, values.marginRight, values.marginBottom, values.marginLeft);
  if (marginStr !== '0px') {
    lines.push(`  margin: ${marginStr};`);
  }

  const borderStr = shortcut(values.borderTop, values.borderRight, values.borderBottom, values.borderLeft);
  if (borderStr !== '0px') {
    lines.push(`  border: ${borderStr} solid #888;`);
  }

  const paddingStr = shortcut(values.paddingTop, values.paddingRight, values.paddingBottom, values.paddingLeft);
  if (paddingStr !== '0px') {
    lines.push(`  padding: ${paddingStr};`);
  }

  lines.push('}');

  return lines.join('\n');
}

// ── Labeled dimension line ─────────────────────────────────────────────────

function DimLine({ value, label, color, orientation, reverse }: {
  value: number;
  label: string;
  color: string;
  orientation: 'h' | 'v';
  reverse?: boolean;
}) {
  if (value === 0) return null;
  const arrowDir = reverse ? 'from' : 'to';
  const arrowClass = reverse ? 'border-r-0 border-l-[6px]' : 'border-l-0 border-r-[6px]';
  const barW = orientation === 'h' ? value : 2;
  const barH = orientation === 'h' ? 2 : value;

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        width: orientation === 'h' ? barW : undefined,
        height: orientation === 'v' ? barH : undefined,
        left: orientation === 'v' ? undefined : 0,
        top: orientation === 'v' ? 0 : undefined,
      }}
    >
      <div className="relative flex items-center">
        <div style={{ width: orientation === 'h' ? value - 16 : 2, height: orientation === 'h' ? 2 : value - 16, backgroundColor: color }} />
        <div
          className={`text-[10px] font-mono font-semibold whitespace-nowrap ${orientation === 'h' ? 'mx-1' : 'my-1'}`}
          style={{ color, writingMode: orientation === 'v' ? 'vertical-rl' : undefined }}
        >
          {label}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: `${orientation === 'h' ? 4 : 6}px solid transparent`,
            borderBottom: `${orientation === 'h' ? 4 : 6}px solid transparent`,
            [`border${orientation === 'h' ? (reverse ? 'Left' : 'Right') : reverse ? 'Top' : 'Bottom'}`]: `6px solid ${color}`,
            borderLeft: orientation === 'v' ? '6px solid transparent' : undefined,
            borderRight: orientation === 'v' ? '6px solid transparent' : undefined,
          }}
        />
      </div>
    </div>
  );
}

// ── Slider Control ─────────────────────────────────────────────────────────

function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] font-mono text-slate-400 w-6 text-right shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-brand-500 cursor-pointer"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-12 px-1.5 py-0.5 text-xs font-mono bg-slate-800 border border-slate-600 rounded text-slate-200 text-center focus:outline-none focus:border-brand-500"
      />
      <span className="text-[10px] text-slate-500 w-4">px</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function BoxModelVisualizerPage() {
  const [values, setValues] = useState<BoxValues>(DEFAULTS);
  const [boxSizing, setBoxSizing] = useState<BoxSizing>('border-box');
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');

  const computed = computeBox(values, boxSizing);
  const css = generateCSS(values, boxSizing);

  const update = useCallback((key: keyof BoxValues) => (v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  }, []);

  const reset = useCallback(() => {
    setValues(DEFAULTS);
    setBoxSizing('border-box');
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setValues(preset.values);
    setBoxSizing(preset.boxSizing);
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(css);
    toast.success('CSS copied to clipboard');
  }, [css]);

  // Total canvas dimensions for the visual display
  const canvasWidth = computed.totalWidth + 120;
  const canvasHeight = computed.totalHeight + 140;

  // Colors
  const marginColor = '#f59e0b80'; // amber
  const marginBorder = '#f59e0b';
  const marginLabel = '#fbbf24';
  const borderColor = '#f9731680'; // orange
  const borderBorder = '#f97316';
  const borderLabel = '#fb923c';
  const paddingColor = '#22c55e80'; // green
  const paddingBorder = '#22c55e';
  const paddingLabel = '#4ade80';
  const contentColor = '#3b82f680'; // blue
  const contentBorder = '#3b82f6';
  const contentLabel = '#60a5fa';

  return (
    <ToolLayout
      title="CSS Box Model Visualizer"
      description="Interactively build and visualize the CSS box model — adjust margin, border, padding, and content in real-time. Copy the generated CSS."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Presets</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="text-left px-2.5 py-1.5 rounded bg-slate-800/80 border border-slate-700/50 hover:border-brand-500/50 hover:bg-slate-700/50 transition-colors text-xs"
                >
                  <div className="font-medium text-slate-200">{preset.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Box Sizing */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Box Sizing</h3>
            <div className="flex gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={() => setBoxSizing('content-box')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  boxSizing === 'content-box'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                content-box
              </button>
              <button
                onClick={() => setBoxSizing('border-box')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  boxSizing === 'border-box'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                border-box
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {boxSizing === 'border-box'
                ? 'width/height includes padding + border'
                : 'width/height is content only'}
            </p>
          </div>

          {/* Margin controls */}
          <div className="p-3 rounded-lg border" style={{ borderColor: marginBorder, backgroundColor: `${marginBorder}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: marginBorder }} />
              <span className="text-xs font-semibold" style={{ color: marginLabel }}>Margin</span>
            </div>
            <div className="space-y-1.5">
              <SliderInput label="T" value={values.marginTop} onChange={update('marginTop')} max={120} />
              <SliderInput label="R" value={values.marginRight} onChange={update('marginRight')} max={120} />
              <SliderInput label="B" value={values.marginBottom} onChange={update('marginBottom')} max={120} />
              <SliderInput label="L" value={values.marginLeft} onChange={update('marginLeft')} max={120} />
            </div>
          </div>

          {/* Border controls */}
          <div className="p-3 rounded-lg border" style={{ borderColor: borderBorder, backgroundColor: `${borderBorder}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: borderBorder }} />
              <span className="text-xs font-semibold" style={{ color: borderLabel }}>Border</span>
            </div>
            <div className="space-y-1.5">
              <SliderInput label="T" value={values.borderTop} onChange={update('borderTop')} max={20} />
              <SliderInput label="R" value={values.borderRight} onChange={update('borderRight')} max={20} />
              <SliderInput label="B" value={values.borderBottom} onChange={update('borderBottom')} max={20} />
              <SliderInput label="L" value={values.borderLeft} onChange={update('borderLeft')} max={20} />
            </div>
          </div>

          {/* Padding controls */}
          <div className="p-3 rounded-lg border" style={{ borderColor: paddingBorder, backgroundColor: `${paddingBorder}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: paddingBorder }} />
              <span className="text-xs font-semibold" style={{ color: paddingLabel }}>Padding</span>
            </div>
            <div className="space-y-1.5">
              <SliderInput label="T" value={values.paddingTop} onChange={update('paddingTop')} max={80} />
              <SliderInput label="R" value={values.paddingRight} onChange={update('paddingRight')} max={80} />
              <SliderInput label="B" value={values.paddingBottom} onChange={update('paddingBottom')} max={80} />
              <SliderInput label="L" value={values.paddingLeft} onChange={update('paddingLeft')} max={80} />
            </div>
          </div>

          {/* Content controls */}
          <div className="p-3 rounded-lg border" style={{ borderColor: contentBorder, backgroundColor: `${contentBorder}08` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: contentBorder }} />
              <span className="text-xs font-semibold" style={{ color: contentLabel }}>Content</span>
            </div>
            <div className="space-y-1.5">
              <SliderInput label="W" value={values.contentWidth} onChange={update('contentWidth')} min={40} max={400} />
              <SliderInput label="H" value={values.contentHeight} onChange={update('contentHeight')} min={20} max={300} />
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Default
          </button>
        </div>

        {/* Right: Visual + CSS */}
        <div className="lg:col-span-2 space-y-4">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700/50 w-fit">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'visual' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Visual
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'code' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              CSS Output
            </button>
          </div>

          {viewMode === 'visual' ? (
            <>
              {/* Box Model Visualization */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 flex items-center justify-center p-4 overflow-auto">
                <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
                  {/* Margin region */}
                  <div
                    className="absolute"
                    style={{
                      left: 0,
                      top: 0,
                      width: computed.totalWidth,
                      height: computed.totalHeight,
                      backgroundColor: marginColor,
                      border: `1px dashed ${marginBorder}`,
                    }}
                  >
                    {/* Margin label */}
                    <div className="absolute top-1 left-1.5 text-[10px] font-mono font-semibold" style={{ color: marginLabel }}>
                      margin{computed.totalWidth > 180 ? (
                        <span className="ml-1 text-[9px] opacity-70">{computed.totalWidth}×{computed.totalHeight}</span>
                      ) : null}
                    </div>

                    {/* Margin top dimension */}
                    <div
                      className="absolute left-0 right-0 flex items-center justify-center"
                      style={{ top: -18 }}
                    >
                      <span className="text-[10px] font-mono" style={{ color: marginLabel }}>{values.marginTop}px</span>
                    </div>

                    {/* Element (border-box) */}
                    <div
                      className="absolute"
                      style={{
                        left: values.marginLeft,
                        top: values.marginTop,
                        width: computed.elementWidth,
                        height: computed.elementHeight,
                        backgroundColor: borderColor,
                        border: `1px solid ${borderBorder}`,
                      }}
                    >
                      {/* Border label */}
                      <div className="absolute -top-5 left-1 text-[10px] font-mono font-semibold" style={{ color: borderLabel }}>border</div>
                      {/* Border dimension */}
                      {values.borderTop > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -(values.borderTop + 16) }}>
                          <span className="text-[10px] font-mono" style={{ color: borderLabel }}>{values.borderTop}px</span>
                        </div>
                      )}

                      {/* Padding area */}
                      <div
                        className="absolute"
                        style={{
                          left: values.borderLeft,
                          top: values.borderTop,
                          width: computed.elementWidth - values.borderLeft - values.borderRight,
                          height: computed.elementHeight - values.borderTop - values.borderBottom,
                          backgroundColor: paddingColor,
                          border: `1px solid ${paddingBorder}`,
                        }}
                      >
                        <div className="absolute top-0.5 left-1 text-[10px] font-mono font-semibold" style={{ color: paddingLabel }}>padding</div>

                        {/* Content area */}
                        <div
                          className="absolute"
                          style={{
                            left: values.paddingLeft,
                            top: values.paddingTop,
                            width: values.contentWidth,
                            height: values.contentHeight,
                            backgroundColor: contentColor,
                            border: `1.5px solid ${contentBorder}`,
                          }}
                        >
                          <div
                            className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
                            style={{ color: contentLabel }}
                          >
                            <div className="text-center">
                              <div>content</div>
                              <div className="text-[10px] opacity-70 font-mono mt-0.5">
                                {values.contentWidth}×{values.contentHeight}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Computed Dimensions Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-mono mb-0.5">Total Box</div>
                  <div className="text-sm font-mono font-semibold text-white">
                    {computed.totalWidth}×{computed.totalHeight}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-mono mb-0.5">Element</div>
                  <div className="text-sm font-mono font-semibold text-white">
                    {computed.elementWidth}×{computed.elementHeight}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-mono mb-0.5">CSS Width/Height</div>
                  <div className="text-sm font-mono font-semibold text-white">
                    {computed.cssWidth}×{computed.cssHeight}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-mono mb-0.5">Box Sizing</div>
                  <div className="text-sm font-mono font-semibold text-brand-400">{boxSizing}</div>
                </div>
              </div>

              {/* Quick formula hint */}
              <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <p className="text-[11px] text-slate-400 font-mono">
                  <span className="text-amber-400">margin</span>
                  {' + '}
                  <span className="text-orange-400">border</span>
                  {' + '}
                  <span className="text-green-400">padding</span>
                  {' + '}
                  <span className="text-blue-400">content</span>
                  {boxSizing === 'border-box'
                    ? ' → width/height covers border+padding+content'
                    : ' → width/height covers content only'}
                </p>
              </div>
            </>
          ) : (
            /* CSS Output View */
            <div className="rounded-xl border border-slate-700/50 bg-slate-950 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-900">
                <span className="text-xs font-mono text-slate-400">Generated CSS</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 text-sm font-mono text-slate-200 overflow-x-auto leading-relaxed">
                <code>{css}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
