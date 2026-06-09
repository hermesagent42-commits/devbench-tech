'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, ToggleLeft, ToggleRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Preset {
  label: string;
  style: 'ios' | 'material' | 'neumorphic' | 'minimal';
  onColor: string;
  offColor: string;
  knobColor: string;
  knobShadow: string;
  width: number;
  height: number;
  knobSize: number;
  knobOffset: number;
  borderRadius: number;
  knobRadius: number;
  speed: number;
}

const PRESETS: Preset[] = [
  {
    label: 'iOS',
    onColor: '#34c759',
    offColor: '#e9e9ea',
    knobColor: '#ffffff',
    knobShadow: '0 2px 4px rgba(0,0,0,0.2)',
    width: 51,
    height: 31,
    knobSize: 27,
    knobOffset: 2,
    borderRadius: 31,
    knobRadius: 27,
    speed: 0.25,
    style: 'ios',
  },
  {
    label: 'Material',
    onColor: '#6750a4',
    offColor: '#49454f',
    knobColor: '#e8def8',
    knobShadow: '0 1px 3px rgba(0,0,0,0.3)',
    width: 52,
    height: 32,
    knobSize: 16,
    knobOffset: 8,
    borderRadius: 100,
    knobRadius: 100,
    speed: 0.2,
    style: 'material',
  },
  {
    label: 'Neumorphic',
    onColor: '#60a5fa',
    offColor: '#e2e8f0',
    knobColor: '#f1f5f9',
    knobShadow: '3px 3px 6px rgba(0,0,0,0.2), -2px -2px 4px rgba(255,255,255,0.1)',
    width: 60,
    height: 34,
    knobSize: 26,
    knobOffset: 4,
    borderRadius: 34,
    knobRadius: 26,
    speed: 0.3,
    style: 'neumorphic',
  },
  {
    label: 'Minimal',
    onColor: '#0ea5e9',
    offColor: '#475569',
    knobColor: '#f8fafc',
    knobShadow: 'none',
    width: 44,
    height: 24,
    knobSize: 18,
    knobOffset: 3,
    borderRadius: 12,
    knobRadius: 18,
    speed: 0.15,
    style: 'minimal',
  },
  {
    label: 'Large',
    onColor: '#22c55e',
    offColor: '#ef4444',
    knobColor: '#ffffff',
    knobShadow: '0 3px 8px rgba(0,0,0,0.3)',
    width: 80,
    height: 44,
    knobSize: 36,
    knobOffset: 4,
    borderRadius: 44,
    knobRadius: 36,
    speed: 0.35,
    style: 'ios',
  },
  {
    label: 'Dark Mode',
    onColor: '#7c3aed',
    offColor: '#334155',
    knobColor: '#cbd5e1',
    knobShadow: '0 2px 6px rgba(0,0,0,0.4)',
    width: 56,
    height: 30,
    knobSize: 24,
    knobOffset: 3,
    borderRadius: 30,
    knobRadius: 24,
    speed: 0.25,
    style: 'material',
  },
];

interface SizePreset {
  label: string;
  width: number;
  height: number;
  knobSize: number;
  knobOffset: number;
}

const SIZE_PRESETS: SizePreset[] = [
  { label: 'S', width: 36, height: 20, knobSize: 14, knobOffset: 3 },
  { label: 'M', width: 48, height: 28, knobSize: 20, knobOffset: 4 },
  { label: 'L', width: 60, height: 34, knobSize: 26, knobOffset: 4 },
  { label: 'XL', width: 80, height: 44, knobSize: 36, knobOffset: 4 },
];

function generateCSS(p: {
  width: number;
  height: number;
  knobSize: number;
  knobOffset: number;
  borderRadius: number;
  knobRadius: number;
  onColor: string;
  offColor: string;
  knobColor: string;
  knobShadow: string;
  speed: number;
}): string {
  const knobTranslate = p.width - p.knobSize - p.knobOffset * 2 + p.knobOffset;
  return `.toggle {
  position: relative;
  display: inline-block;
  width: ${p.width}px;
  height: ${p.height}px;
  cursor: pointer;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${p.offColor};
  border-radius: ${p.borderRadius}px;
  transition: background ${p.speed}s ease;
}

.toggle input:checked + .toggle-track {
  background: ${p.onColor};
}

.toggle-knob {
  position: absolute;
  top: ${p.knobOffset}px;
  left: ${p.knobOffset}px;
  width: ${p.knobSize}px;
  height: ${p.knobSize}px;
  background: ${p.knobColor};
  border-radius: ${p.knobRadius}px;
  box-shadow: ${p.knobShadow};
  transition: transform ${p.speed}s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle input:checked ~ .toggle-knob {
  transform: translateX(${knobTranslate}px);
}`;
}

function generateHTML(): string {
  return `<label class="toggle">
  <input type="checkbox">
  <span class="toggle-track"></span>
  <span class="toggle-knob"></span>
</label>`;
}

export default function CssToggleGeneratorPage() {
  const [width, setWidth] = useState(51);
  const [height, setHeight] = useState(31);
  const [knobSize, setKnobSize] = useState(27);
  const [knobOffset, setKnobOffset] = useState(2);
  const [borderRadius, setBorderRadius] = useState(31);
  const [knobRadius, setKnobRadius] = useState(27);
  const [onColor, setOnColor] = useState('#34c759');
  const [offColor, setOffColor] = useState('#e9e9ea');
  const [knobColor, setKnobColor] = useState('#ffffff');
  const [knobShadow, setKnobShadow] = useState('0 2px 4px rgba(0,0,0,0.2)');
  const [speed, setSpeed] = useState(0.25);
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState<'css' | 'html' | null>(null);

  const knobTranslate = width - knobSize - knobOffset * 2 + knobOffset;

  const cssOutput = useMemo(
    () =>
      generateCSS({
        width,
        height,
        knobSize,
        knobOffset,
        borderRadius,
        knobRadius,
        onColor,
        offColor,
        knobColor,
        knobShadow,
        speed,
      }),
    [width, height, knobSize, knobOffset, borderRadius, knobRadius, onColor, offColor, knobColor, knobShadow, speed]
  );

  const htmlOutput = useMemo(() => generateHTML(), []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => {
        setCopied('css');
        toast.success('CSS copied!');
        setTimeout(() => setCopied(null), 2000);
      },
      () => toast.error('Failed to copy')
    );
  }, [cssOutput]);

  const copyHTML = useCallback(() => {
    navigator.clipboard.writeText(htmlOutput).then(
      () => {
        setCopied('html');
        toast.success('HTML copied!');
        setTimeout(() => setCopied(null), 2000);
      },
      () => toast.error('Failed to copy')
    );
  }, [htmlOutput]);

  const copyBoth = useCallback(() => {
    const full = `${htmlOutput}\n\n<style>\n${cssOutput}\n</style>`;
    navigator.clipboard.writeText(full).then(
      () => {
        toast.success('Full code copied!');
      },
      () => toast.error('Failed to copy')
    );
  }, [cssOutput, htmlOutput]);

  const applyPreset = useCallback((p: Preset) => {
    setWidth(p.width);
    setHeight(p.height);
    setKnobSize(p.knobSize);
    setKnobOffset(p.knobOffset);
    setBorderRadius(p.borderRadius);
    setKnobRadius(p.knobRadius);
    setOnColor(p.onColor);
    setOffColor(p.offColor);
    setKnobColor(p.knobColor);
    setKnobShadow(p.knobShadow);
    setSpeed(p.speed);
  }, []);

  const applySize = useCallback((s: SizePreset) => {
    setWidth(s.width);
    setHeight(s.height);
    setKnobSize(s.knobSize);
    setKnobOffset(s.knobOffset);
    setBorderRadius(s.height);
    setKnobRadius(s.knobSize);
  }, []);

  const reset = useCallback(() => {
    applyPreset(PRESETS[0]);
    setChecked(false);
  }, [applyPreset]);

  const toggleStyle: React.CSSProperties = {
    '--tw-width': `${width}px`,
    '--tw-height': `${height}px`,
    '--tw-knob-size': `${knobSize}px`,
    '--tw-knob-offset': `${knobOffset}px`,
    '--tw-border-radius': `${borderRadius}px`,
    '--tw-knob-radius': `${knobRadius}px`,
    '--tw-on': onColor,
    '--tw-off': offColor,
    '--tw-knob': knobColor,
    '--tw-knob-shadow': knobShadow,
    '--tw-speed': `${speed}s`,
  } as React.CSSProperties;

  return (
    <ToolLayout
      title="CSS Toggle Switch Generator"
      description="Build pure-CSS toggle switches — iOS, Material, neumorphic styles. Live preview, copy-ready code, zero dependencies."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-1 space-y-5">
          {/* Presets */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Style Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="text-xs px-3 py-2 rounded-lg bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 transition-all hover:text-white text-left"
                >
                  <div className="font-medium text-white text-sm">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.style}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Size</h3>
            <div className="flex gap-2 mb-4">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => applySize(s)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all bg-surface-lighter text-slate-300 hover:bg-slate-600 border border-slate-600/50 hover:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Width</label>
                  <span className="text-xs text-brand-400 font-mono">{width}px</span>
                </div>
                <input type="range" min={30} max={120} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Height</label>
                  <span className="text-xs text-brand-400 font-mono">{height}px</span>
                </div>
                <input type="range" min={16} max={60} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Knob Size</label>
                  <span className="text-xs text-brand-400 font-mono">{knobSize}px</span>
                </div>
                <input type="range" min={10} max={52} value={knobSize} onChange={(e) => setKnobSize(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Knob Offset</label>
                  <span className="text-xs text-brand-400 font-mono">{knobOffset}px</span>
                </div>
                <input type="range" min={0} max={10} value={knobOffset} onChange={(e) => setKnobOffset(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Colors</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">ON Color</label>
                <div className="flex gap-2">
                  <input type="color" value={onColor} onChange={(e) => setOnColor(e.target.value)} className="w-9 h-9 rounded border border-slate-600 cursor-pointer bg-transparent flex-shrink-0" />
                  <input type="text" value={onColor} onChange={(e) => setOnColor(e.target.value)} className="input-field flex-1 font-mono text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">OFF Color</label>
                <div className="flex gap-2">
                  <input type="color" value={offColor} onChange={(e) => setOffColor(e.target.value)} className="w-9 h-9 rounded border border-slate-600 cursor-pointer bg-transparent flex-shrink-0" />
                  <input type="text" value={offColor} onChange={(e) => setOffColor(e.target.value)} className="input-field flex-1 font-mono text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Knob Color</label>
                <div className="flex gap-2">
                  <input type="color" value={knobColor} onChange={(e) => setKnobColor(e.target.value)} className="w-9 h-9 rounded border border-slate-600 cursor-pointer bg-transparent flex-shrink-0" />
                  <input type="text" value={knobColor} onChange={(e) => setKnobColor(e.target.value)} className="input-field flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {['#34c759', '#6750a4', '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#ec4899', '#7c3aed', '#0ea5e9', '#14b8a6'].map((c) => (
                <button key={c} onClick={() => setOnColor(c)} className="w-5 h-5 rounded border transition-all hover:scale-110" style={{ backgroundColor: c, borderColor: onColor === c ? '#fff' : 'transparent' }} title={c} />
              ))}
            </div>
          </div>

          {/* Behavior */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Behavior</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Track Border Radius</label>
                  <span className="text-xs text-brand-400 font-mono">{borderRadius}px</span>
                </div>
                <input type="range" min={0} max={50} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Knob Border Radius</label>
                  <span className="text-xs text-brand-400 font-mono">{knobRadius}px</span>
                </div>
                <input type="range" min={0} max={50} value={knobRadius} onChange={(e) => setKnobRadius(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Animation Speed</label>
                  <span className="text-xs text-brand-400 font-mono">{speed}s</span>
                </div>
                <input type="range" min={0.05} max={0.6} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-brand-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Knob Shadow</label>
                <input type="text" value={knobShadow} onChange={(e) => setKnobShadow(e.target.value)} className="input-field w-full font-mono text-xs" />
              </div>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 transition-colors bg-surface-lighter border border-slate-600/50 hover:border-red-500/30"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        </div>

        {/* Preview + Code Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Live Preview */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Live Preview
            </h3>
            <div className="bg-[#1e293b] rounded-lg border border-slate-700/50 p-8 flex flex-col items-center gap-6">
              {/* The Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{checked ? 'ON' : 'OFF'}</span>
                <label
                  className="relative inline-block cursor-pointer select-none"
                  style={{ width: `${width}px`, height: `${height}px` }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className="absolute inset-0 rounded-full transition-colors"
                    style={{
                      backgroundColor: checked ? onColor : offColor,
                      borderRadius: `${borderRadius}px`,
                      transitionDuration: `${speed}s`,
                    }}
                  />
                  <span
                    className="absolute rounded-full transition-transform"
                    style={{
                      top: `${knobOffset}px`,
                      left: `${knobOffset}px`,
                      width: `${knobSize}px`,
                      height: `${knobSize}px`,
                      backgroundColor: knobColor,
                      borderRadius: `${knobRadius}px`,
                      boxShadow: knobShadow,
                      transform: checked ? `translateX(${knobTranslate}px)` : 'translateX(0)',
                      transitionDuration: `${speed}s`,
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </label>
                <span className="text-xs text-slate-400">{checked ? 'ON' : 'OFF'}</span>
              </div>

              {/* Dimensions info */}
              <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 font-mono">
                <span>{width}×{height}px</span>
                <span>knob: {knobSize}px</span>
                <span>translate: {knobTranslate}px</span>
                <span>speed: {speed}s</span>
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Generated CSS</h3>
              <div className="flex gap-2">
                <button
                  onClick={copyCSS}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                    copied === 'css'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-slate-400 hover:text-brand-400 bg-surface-lighter border border-slate-600/50'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied === 'css' ? 'Copied!' : 'Copy CSS'}
                </button>
                <button
                  onClick={copyBoth}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-brand-400 bg-surface-lighter border border-slate-600/50 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </button>
              </div>
            </div>
            <pre className="bg-[#0d1117] rounded-lg p-4 border border-slate-700/50 text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre max-h-[400px] overflow-y-auto">
              {cssOutput}
            </pre>
          </div>

          {/* HTML Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">HTML Markup</h3>
              <button
                onClick={copyHTML}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                  copied === 'html'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-slate-400 hover:text-brand-400 bg-surface-lighter border border-slate-600/50'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                {copied === 'html' ? 'Copied!' : 'Copy HTML'}
              </button>
            </div>
            <pre className="bg-[#0d1117] rounded-lg p-4 border border-slate-700/50 text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
              {htmlOutput}
            </pre>
          </div>

          {/* How it works */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">How it works</h3>
            <div className="text-slate-400 text-sm space-y-2">
              <p>
                This toggle is built with pure CSS — <strong className="text-slate-300">no JavaScript required</strong> for the switch animation.
                It uses the <code className="text-brand-400">:checked</code> pseudo-class on a hidden checkbox input to drive the state.
              </p>
              <p>
                The <strong className="text-slate-300">track</strong> is a full-size span with <code className="text-brand-400">border-radius</code> for the pill shape.
                The <strong className="text-slate-300">knob</strong> is a smaller span positioned absolutely inside the label.
                When checked, <code className="text-brand-400">transform: translateX()</code> moves the knob to the right — animated via CSS <code className="text-brand-400">transition</code>.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Browser support: All modern browsers. Works in IE10+ with vendor prefixes. Accessible by default — the hidden checkbox is keyboard-focusable and screen-reader-friendly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
