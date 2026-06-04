'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Paintbrush, Type, Palette, Eye, SlidersHorizontal, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type PaintOrder = 'normal' | 'stroke';

interface Preset {
  name: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  paintOrder: PaintOrder;
  bgColor: string;
}

// ── Fonts ──────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: 'System Sans', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'System Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'System Mono', value: '"Fira Code", "Cascadia Code", monospace' },
  { label: 'Inter', value: '"Inter", system-ui, sans-serif' },
  { label: 'Playfair Display', value: '"Playfair Display", Georgia, serif' },
  { label: 'Poppins', value: '"Poppins", system-ui, sans-serif' },
  { label: 'Monoton', value: '"Monoton", cursive' },
  { label: 'Bangers', value: '"Bangers", cursive' },
  { label: 'Rubik', value: '"Rubik", system-ui, sans-serif' },
  { label: 'Oswald', value: '"Oswald", sans-serif' },
  { label: 'Impact', value: 'Impact, "Arial Black", sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
];

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Neon Outline',
    text: 'NEON',
    fontSize: 96,
    fontFamily: 'Impact, "Arial Black", sans-serif',
    strokeWidth: 3,
    strokeColor: '#00ff88',
    fillColor: '#111827',
    paintOrder: 'stroke',
    bgColor: '#0a0a0a',
  },
  {
    name: 'Comic Pop',
    text: 'POW!',
    fontSize: 80,
    fontFamily: '"Bangers", cursive',
    strokeWidth: 4,
    strokeColor: '#000000',
    fillColor: '#ff4757',
    paintOrder: 'stroke',
    bgColor: '#ffd700',
  },
  {
    name: 'Glass Outline',
    text: 'Glass',
    fontSize: 72,
    fontFamily: '"Poppins", system-ui, sans-serif',
    strokeWidth: 2,
    strokeColor: 'rgba(255,255,255,0.8)',
    fillColor: 'transparent',
    paintOrder: 'normal',
    bgColor: '#6366f1',
  },
  {
    name: 'Vintage Print',
    text: 'PRINT',
    fontSize: 64,
    fontFamily: '"Playfair Display", Georgia, serif',
    strokeWidth: 1.5,
    strokeColor: '#5c3d2e',
    fillColor: '#fef3c7',
    paintOrder: 'stroke',
    bgColor: '#f5f0e8',
  },
  {
    name: 'Duo Chrome',
    text: 'SHIFT',
    fontSize: 88,
    fontFamily: '"Oswald", sans-serif',
    strokeWidth: 5,
    strokeColor: '#a855f7',
    fillColor: '#06b6d4',
    paintOrder: 'stroke',
    bgColor: '#0f172a',
  },
  {
    name: 'Double Stroke',
    text: 'DOUBLE',
    fontSize: 72,
    fontFamily: '"Rubik", system-ui, sans-serif',
    strokeWidth: 6,
    strokeColor: '#1e293b',
    fillColor: '#ffffff',
    paintOrder: 'normal',
    bgColor: '#f8fafc',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CssTextStrokeGenerator() {
  const [text, setText] = useState('Hello World');
  const [fontSize, setFontSize] = useState(72);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#3b82f6');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [paintOrder, setPaintOrder] = useState<PaintOrder>('stroke');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [useTransparentFill, setUseTransparentFill] = useState(false);
  const [useTextShadow, setUseTextShadow] = useState(false);
  const [textShadowValue, setTextShadowValue] = useState('');

  // ── Generated CSS ─────────────────────────────────────────────────────

  const generatedCSS = useMemo(() => {
    const lines: string[] = [];
    lines.push('.text-stroke {');
    if (useTextShadow && textShadowValue.trim()) {
      lines.push(`  text-shadow: ${textShadowValue.trim()};`);
    }
    lines.push(`  -webkit-text-stroke: ${strokeWidth}px ${strokeColor};`);
    if (paintOrder === 'stroke') {
      lines.push('  paint-order: stroke fill;');
    }
    if (useTransparentFill) {
      lines.push('  -webkit-text-fill-color: transparent;');
    } else {
      lines.push(`  color: ${fillColor};`);
    }
    lines.push(`  font-size: ${fontSize}px;`);
    lines.push(`  font-family: ${fontFamily};`);
    lines.push(`  font-weight: 700;`);
    lines.push('  letter-spacing: 0.02em;');
    lines.push('}');
    return lines.join('\n');
  }, [strokeWidth, strokeColor, fillColor, paintOrder, fontSize, fontFamily, useTransparentFill, useTextShadow, textShadowValue]);

  // ── Preview style ─────────────────────────────────────────────────────

  const previewStyle: React.CSSProperties = useMemo(() => {
    const style: React.CSSProperties = {
      fontSize: `${fontSize}px`,
      fontFamily: fontFamily,
      fontWeight: 700,
      letterSpacing: '0.02em',
      WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
      lineHeight: 1.2,
      textAlign: 'center' as const,
      wordBreak: 'break-word' as const,
    };

    if (useTextShadow && textShadowValue.trim()) {
      style.textShadow = textShadowValue.trim();
    }

    if (paintOrder === 'stroke') {
      style.paintOrder = 'stroke fill';
    }

    if (useTransparentFill) {
      style.WebkitTextFillColor = 'transparent';
      style.color = 'transparent';
    } else {
      style.color = fillColor;
    }

    return style;
  }, [fontSize, fontFamily, strokeWidth, strokeColor, fillColor, paintOrder, useTransparentFill, useTextShadow, textShadowValue]);

  // ── Actions ───────────────────────────────────────────────────────────

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS);
    toast.success('CSS copied to clipboard!');
  }, [generatedCSS]);

  const applyPreset = useCallback((preset: Preset) => {
    setText(preset.text);
    setFontSize(preset.fontSize);
    setFontFamily(preset.fontFamily);
    setStrokeWidth(preset.strokeWidth);
    setStrokeColor(preset.strokeColor);
    setFillColor(preset.fillColor);
    setPaintOrder(preset.paintOrder);
    setBgColor(preset.bgColor);
    setUseTransparentFill(preset.fillColor === 'transparent');
    setUseTextShadow(false);
    setTextShadowValue('');
    toast.success(`Applied "${preset.name}" preset`);
  }, []);

  const resetAll = useCallback(() => {
    setText('Hello World');
    setFontSize(72);
    setFontFamily(FONT_FAMILIES[0].value);
    setStrokeWidth(3);
    setStrokeColor('#3b82f6');
    setFillColor('#ffffff');
    setPaintOrder('stroke');
    setBgColor('#0f172a');
    setUseTransparentFill(false);
    setUseTextShadow(false);
    setTextShadowValue('');
    toast.success('Reset to defaults');
  }, []);

  const downloadPreview = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.5;
    const padding = 60;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (paintOrder === 'stroke') {
      ctx.lineWidth = strokeWidth * 2;
      ctx.strokeStyle = strokeColor;
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
      if (!useTransparentFill) {
        ctx.fillStyle = fillColor;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      }
    } else {
      if (!useTransparentFill) {
        ctx.fillStyle = fillColor;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      }
      ctx.lineWidth = strokeWidth * 2;
      ctx.strokeStyle = strokeColor;
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }

    const link = document.createElement('a');
    link.download = `text-stroke-${text.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Preview downloaded as PNG');
  }, [text, fontSize, fontFamily, strokeWidth, strokeColor, fillColor, paintOrder, bgColor, useTransparentFill]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Text Stroke Generator"
      description="Design outlined text with -webkit-text-stroke. Live preview, paint order control, presets, and one-click CSS export."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={copyCSS}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy CSS
          </button>
          <button
            onClick={downloadPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PNG
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Live Preview */}
        <div
          className="rounded-xl border border-slate-700/50 overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: bgColor }}
        >
          <div className="flex items-center justify-center min-h-[200px] p-8 sm:p-12 md:p-16">
            <span style={previewStyle} className="transition-all duration-200 max-w-full">
              {text || 'Type something...'}
            </span>
          </div>
        </div>

        {/* Presets */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand-400" />
            Presets
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:border-brand-500/50 hover:bg-slate-700/50 transition-all text-left group"
              >
                <div
                  className="h-12 rounded-md flex items-center justify-center mb-2 overflow-hidden"
                  style={{ backgroundColor: preset.bgColor }}
                >
                  <span
                    style={{
                      fontSize: Math.min(preset.fontSize * 0.3, 20),
                      fontFamily: preset.fontFamily,
                      fontWeight: 700,
                      WebkitTextStroke: `${Math.max(preset.strokeWidth * 0.6, 0.5)}px ${preset.strokeColor}`,
                      color: preset.fillColor === 'transparent' ? 'transparent' : preset.fillColor,
                      WebkitTextFillColor: preset.fillColor === 'transparent' ? 'transparent' : preset.fillColor,
                      paintOrder: preset.paintOrder === 'stroke' ? 'stroke fill' : 'normal',
                    }}
                  >
                    {preset.text}
                  </span>
                </div>
                <span className="text-xs text-slate-400 group-hover:text-brand-400 transition-colors">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Type className="w-3.5 h-3.5" />
              Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Type className="w-3.5 h-3.5" />
              Font Family
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min={12}
              max={200}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>12px</span>
              <span>200px</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Paintbrush className="w-3.5 h-3.5" />
              Stroke Width: {strokeWidth}px
            </label>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0px</span>
              <span>20px</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              Stroke Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={strokeColor.startsWith('#') || strokeColor.startsWith('rgb') ? strokeColor : '#3b82f6'}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              Fill Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={fillColor.startsWith('#') || fillColor.startsWith('rgb') ? fillColor : '#ffffff'}
                onChange={(e) => { setFillColor(e.target.value); setUseTransparentFill(false); }}
                disabled={useTransparentFill}
                className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent disabled:opacity-30 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={fillColor}
                onChange={(e) => { setFillColor(e.target.value); setUseTransparentFill(false); }}
                placeholder="#ffffff"
                disabled={useTransparentFill}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors font-mono disabled:opacity-30"
              />
            </div>
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={useTransparentFill}
                onChange={(e) => setUseTransparentFill(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500/30"
              />
              <span className="text-xs text-slate-400">Transparent fill (outline only)</span>
            </label>
          </div>
        </div>

        {/* Paint Order + Background */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Paint Order
            </label>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => setPaintOrder('stroke')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  paintOrder === 'stroke'
                    ? 'bg-brand-500/20 text-brand-400 border-r border-slate-700'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 border-r border-slate-700'
                }`}
              >
                Stroke over fill
              </button>
              <button
                onClick={() => setPaintOrder('normal')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  paintOrder === 'normal'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                Fill over stroke
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {paintOrder === 'stroke'
                ? 'Stroke sits above the fill — it looks crisp and covers the edge'
                : 'Fill sits above the stroke — the stroke peeks out from behind'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              Preview Background
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor.startsWith('#') || bgColor.startsWith('rgb') ? bgColor : '#0f172a'}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#0f172a"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors font-mono"
              />
            </div>
            <div className="flex gap-2 mt-1">
              {['#0f172a', '#ffffff', '#6366f1', '#f8fafc', '#0a0a0a', '#1e1b4b'].map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  className={`w-6 h-6 rounded-md border-2 transition-all ${
                    bgColor === color ? 'border-brand-400 scale-110' : 'border-slate-600 hover:border-slate-400'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Background ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Optional text-shadow */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useTextShadow}
              onChange={(e) => setUseTextShadow(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500/30"
            />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Add text-shadow (for extra glow / depth)
            </span>
          </label>
          {useTextShadow && (
            <input
              type="text"
              value={textShadowValue}
              onChange={(e) => setTextShadowValue(e.target.value)}
              placeholder="e.g. 0 0 10px rgba(59,130,246,0.5)"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors font-mono"
            />
          )}
        </div>

        {/* Generated CSS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="text-brand-400">&lt;/&gt;</span>
              Generated CSS
            </h3>
            <button
              onClick={copyCSS}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 overflow-x-auto">
            <code className="text-sm text-slate-300 font-mono leading-relaxed">{generatedCSS}</code>
          </pre>
        </div>

        {/* Browser Support */}
        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-slate-400">
          <span className="font-semibold text-amber-400">Browser support:</span>{' '}
          <code className="text-xs bg-amber-500/10 px-1 py-0.5 rounded">-webkit-text-stroke</code> works in all modern
          browsers (Chrome, Firefox, Safari, Edge). <code className="text-xs bg-amber-500/10 px-1 py-0.5 rounded">paint-order</code>{' '}
          is supported in all browsers since 2020.
        </div>
      </div>
    </ToolLayout>
  );
}
