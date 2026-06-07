'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, ArrowUp, ArrowRight, ArrowDown, ArrowLeft, Sparkles, MousePointer2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Position = 'top' | 'right' | 'bottom' | 'left';
type AnimationType = 'none' | 'fade' | 'slide' | 'scale' | 'bounce';

interface TooltipConfig {
  text: string;
  position: Position;
  offset: number;
  bgColor: string;
  textColor: string;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  arrow: boolean;
  arrowSize: number;
  arrowColor: string;
  maxWidth: number;
  animation: AnimationType;
}

interface Preset {
  name: string;
  config: TooltipConfig;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Dark Classic',
    config: {
      text: 'This is a tooltip',
      position: 'top',
      offset: 8,
      bgColor: '#1e293b',
      textColor: '#f1f5f9',
      fontSize: 13,
      paddingX: 12,
      paddingY: 8,
      borderRadius: 8,
      arrow: true,
      arrowSize: 6,
      arrowColor: '#1e293b',
      maxWidth: 200,
      animation: 'fade',
    },
  },
  {
    name: 'Light',
    config: {
      text: 'Tooltip text',
      position: 'bottom',
      offset: 10,
      bgColor: '#ffffff',
      textColor: '#0f172a',
      fontSize: 13,
      paddingX: 14,
      paddingY: 10,
      borderRadius: 6,
      arrow: true,
      arrowSize: 6,
      arrowColor: '#ffffff',
      maxWidth: 220,
      animation: 'slide',
    },
  },
  {
    name: 'Brand Gradient',
    config: {
      text: '✨ Premium feature',
      position: 'top',
      offset: 10,
      bgColor: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      textColor: '#ffffff',
      fontSize: 13,
      paddingX: 16,
      paddingY: 10,
      borderRadius: 10,
      arrow: true,
      arrowSize: 7,
      arrowColor: '#6366f1',
      maxWidth: 200,
      animation: 'bounce',
    },
  },
  {
    name: 'Glass',
    config: {
      text: 'Glass effect',
      position: 'top',
      offset: 8,
      bgColor: 'rgba(255, 255, 255, 0.15)',
      textColor: '#ffffff',
      fontSize: 13,
      paddingX: 14,
      paddingY: 8,
      borderRadius: 12,
      arrow: true,
      arrowSize: 6,
      arrowColor: 'rgba(255, 255, 255, 0.15)',
      maxWidth: 200,
      animation: 'scale',
    },
  },
  {
    name: 'Neon Pink',
    config: {
      text: '⚡ Action required',
      position: 'top',
      offset: 8,
      bgColor: '#ec4899',
      textColor: '#ffffff',
      fontSize: 14,
      paddingX: 16,
      paddingY: 10,
      borderRadius: 4,
      arrow: true,
      arrowSize: 6,
      arrowColor: '#ec4899',
      maxWidth: 220,
      animation: 'slide',
    },
  },
  {
    name: 'Subtle',
    config: {
      text: 'More info',
      position: 'top',
      offset: 4,
      bgColor: '#334155',
      textColor: '#cbd5e1',
      fontSize: 12,
      paddingX: 10,
      paddingY: 6,
      borderRadius: 4,
      arrow: true,
      arrowSize: 4,
      arrowColor: '#334155',
      maxWidth: 180,
      animation: 'fade',
    },
  },
  {
    name: 'Warning',
    config: {
      text: '⚠️ This action cannot be undone',
      position: 'bottom',
      offset: 10,
      bgColor: '#f59e0b',
      textColor: '#1c1917',
      fontSize: 13,
      paddingX: 14,
      paddingY: 10,
      borderRadius: 8,
      arrow: true,
      arrowSize: 6,
      arrowColor: '#f59e0b',
      maxWidth: 260,
      animation: 'bounce',
    },
  },
  {
    name: 'Code',
    config: {
      text: 'Ctrl + Shift + P',
      position: 'right',
      offset: 8,
      bgColor: '#0f172a',
      textColor: '#38bdf8',
      fontSize: 12,
      paddingX: 12,
      paddingY: 8,
      borderRadius: 4,
      arrow: false,
      arrowSize: 5,
      arrowColor: '#0f172a',
      maxWidth: 200,
      animation: 'none',
    },
  },
];

const ANIMATIONS: { value: AnimationType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide', label: 'Slide' },
  { value: 'scale', label: 'Scale' },
  { value: 'bounce', label: 'Bounce' },
];

// ── CSS Generation ─────────────────────────────────────────────────────────

function generateTooltipCss(config: TooltipConfig): string {
  const position = config.position;
  const isGradient = config.bgColor.startsWith('linear-gradient') || config.bgColor.startsWith('radial-gradient');
  const bgValue = isGradient ? config.bgColor : config.bgColor;

  // Build the tooltip class
  let css = `/* Tooltip Container */
.tooltip {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}

/* Tooltip Text */
.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  white-space: normal;
  word-wrap: break-word;
  z-index: 1000;
  
  /* Visuals */
  background: ${bgValue};
  color: ${config.textColor};
  font-size: ${config.fontSize}px;
  line-height: 1.4;
  padding: ${config.paddingY}px ${config.paddingX}px;
  border-radius: ${config.borderRadius}px;
  max-width: ${config.maxWidth}px;
  width: max-content;
  text-align: center;
  
  /* Positioning */
`;

  const offsetPx = config.offset;
  const arrowSize = config.arrowSize;
  const centerAxis = 'left: 50%; transform: translateX(-50%);';

  switch (position) {
    case 'top':
      css += `  bottom: 100%;
  margin-bottom: ${offsetPx}px;
${centerAxis}`;
      break;
    case 'bottom':
      css += `  top: 100%;
  margin-top: ${offsetPx}px;
${centerAxis}`;
      break;
    case 'left':
      css += `  right: 100%;
  margin-right: ${offsetPx}px;
  top: 50%;
  transform: translateY(-50%);`;
      break;
    case 'right':
      css += `  left: 100%;
  margin-left: ${offsetPx}px;
  top: 50%;
  transform: translateY(-50%);`;
      break;
  }

  css += '\n';

  // Animation
  if (config.animation !== 'none') {
    css += `
  /* Animation */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;`;

    switch (config.animation) {
      case 'slide':
        if (position === 'top') css += '\n  transform: translateX(-50%) translateY(4px);';
        else if (position === 'bottom') css += '\n  transform: translateX(-50%) translateY(-4px);';
        else if (position === 'left') css += '\n  transform: translateY(-50%) translateX(4px);';
        else css += '\n  transform: translateY(-50%) translateX(-4px);';
        break;
      case 'scale':
        if (position === 'top' || position === 'bottom') css += '\n  transform: translateX(-50%) scale(0.9);';
        else css += '\n  transform: translateY(-50%) scale(0.9);';
        break;
      case 'bounce':
        css += '\n  animation: tooltipBounce 0.4s ease forwards;';
        break;
      case 'fade':
      default:
        break;
    }
  }

  css += '\n}\n';

  // Show on hover
  css += `
.tooltip:hover::after {
  opacity: 1;
  pointer-events: auto;`;

  if (config.animation === 'slide') {
    switch (position) {
      case 'top': css += '\n  transform: translateX(-50%) translateY(0);'; break;
      case 'bottom': css += '\n  transform: translateX(-50%) translateY(0);'; break;
      case 'left': css += '\n  transform: translateY(-50%) translateX(0);'; break;
      case 'right': css += '\n  transform: translateY(-50%) translateX(0);'; break;
    }
  } else if (config.animation === 'scale') {
    if (position === 'top' || position === 'bottom') css += '\n  transform: translateX(-50%) scale(1);';
    else css += '\n  transform: translateY(-50%) scale(1);';
  }

  css += '\n}\n';

  // Arrow
  if (config.arrow) {
    css += `
/* Arrow */
.tooltip::before {
  content: '';
  position: absolute;
  z-index: 1001;
`;

    const arrowColorValue = isGradient ? config.arrowColor : config.arrowColor;
    switch (position) {
      case 'top':
        css += `  bottom: 100%;
  margin-bottom: ${offsetPx - arrowSize}px;
  left: 50%;
  transform: translateX(-50%);
  border-left: ${arrowSize}px solid transparent;
  border-right: ${arrowSize}px solid transparent;
  border-top: ${arrowSize}px solid ${arrowColorValue};
`;
        break;
      case 'bottom':
        css += `  top: 100%;
  margin-top: ${offsetPx - arrowSize}px;
  left: 50%;
  transform: translateX(-50%);
  border-left: ${arrowSize}px solid transparent;
  border-right: ${arrowSize}px solid transparent;
  border-bottom: ${arrowSize}px solid ${arrowColorValue};
`;
        break;
      case 'left':
        css += `  right: 100%;
  margin-right: ${offsetPx - arrowSize}px;
  top: 50%;
  transform: translateY(-50%);
  border-top: ${arrowSize}px solid transparent;
  border-bottom: ${arrowSize}px solid transparent;
  border-left: ${arrowSize}px solid ${arrowColorValue};
`;
        break;
      case 'right':
        css += `  left: 100%;
  margin-left: ${offsetPx - arrowSize}px;
  top: 50%;
  transform: translateY(-50%);
  border-top: ${arrowSize}px solid transparent;
  border-bottom: ${arrowSize}px solid transparent;
  border-right: ${arrowSize}px solid ${arrowColorValue};
`;
        break;
    }

    // Hide arrow initially for animations
    if (config.animation !== 'none') {
      css += `  opacity: 0;
  transition: opacity 0.2s ease;
}
.tooltip:hover::before {
  opacity: 1;
`;
    }

    css += '}\n';
  }

  // Bounce keyframes
  if (config.animation === 'bounce') {
    css += `
@keyframes tooltipBounce {
  0% { opacity: 0; transform: ${position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)'} scale(0.8); }
  60% { opacity: 1; transform: ${position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)'} scale(1.05); }
  100% { opacity: 1; transform: ${position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)'} scale(1); }
}
`;
  }

  // Usage HTML
  css += `
/* HTML Usage */
/* <span class="tooltip" data-tooltip="${config.text}">Hover me</span> */`;

  return css;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssTooltipGeneratorPage() {
  const [config, setConfig] = useState<TooltipConfig>(PRESETS[0].config);

  const updateConfig = useCallback(<K extends keyof TooltipConfig>(key: K, value: TooltipConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetToPreset = useCallback((preset: Preset) => {
    setConfig({ ...preset.config });
  }, []);

  const cssOutput = useMemo(() => generateTooltipCss(config), [config]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied to clipboard!'),
      () => toast.error('Failed to copy')
    );
  }, [cssOutput]);

  const isGradient = config.bgColor.startsWith('linear-gradient') || config.bgColor.startsWith('radial-gradient');

  // ── Live Preview Tooltip Styles ──────────────────────────────────────

  const previewBaseStyles: React.CSSProperties = useMemo(() => ({
    position: 'absolute',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    zIndex: 1000,
    background: config.bgColor,
    color: config.textColor,
    fontSize: `${config.fontSize}px`,
    lineHeight: 1.4,
    padding: `${config.paddingY}px ${config.paddingX}px`,
    borderRadius: `${config.borderRadius}px`,
    maxWidth: `${config.maxWidth}px`,
    width: 'max-content',
    textAlign: 'center' as const,
  }), [config]);

  const previewPositionStyles: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {};
    const offsetPx = config.offset;

    switch (config.position) {
      case 'top':
        base.bottom = '100%';
        base.marginBottom = `${offsetPx}px`;
        base.left = '50%';
        base.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        base.top = '100%';
        base.marginTop = `${offsetPx}px`;
        base.left = '50%';
        base.transform = 'translateX(-50%)';
        break;
      case 'left':
        base.right = '100%';
        base.marginRight = `${offsetPx}px`;
        base.top = '50%';
        base.transform = 'translateY(-50%)';
        break;
      case 'right':
        base.left = '100%';
        base.marginLeft = `${offsetPx}px`;
        base.top = '50%';
        base.transform = 'translateY(-50%)';
        break;
    }
    return base;
  }, [config]);

  const arrowStyles: React.CSSProperties | null = useMemo(() => {
    if (!config.arrow) return null;

    const arrowSize = config.arrowSize;
    const arrowColor = isGradient ? config.arrowColor : config.arrowColor;
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1001,
    };

    switch (config.position) {
      case 'top':
        base.bottom = '100%';
        base.marginBottom = `${config.offset - arrowSize}px`;
        base.left = '50%';
        base.transform = 'translateX(-50%)';
        base.borderLeft = `${arrowSize}px solid transparent`;
        base.borderRight = `${arrowSize}px solid transparent`;
        base.borderTop = `${arrowSize}px solid ${arrowColor}`;
        break;
      case 'bottom':
        base.top = '100%';
        base.marginTop = `${config.offset - arrowSize}px`;
        base.left = '50%';
        base.transform = 'translateX(-50%)';
        base.borderLeft = `${arrowSize}px solid transparent`;
        base.borderRight = `${arrowSize}px solid transparent`;
        base.borderBottom = `${arrowSize}px solid ${arrowColor}`;
        break;
      case 'left':
        base.right = '100%';
        base.marginRight = `${config.offset - arrowSize}px`;
        base.top = '50%';
        base.transform = 'translateY(-50%)';
        base.borderTop = `${arrowSize}px solid transparent`;
        base.borderBottom = `${arrowSize}px solid transparent`;
        base.borderLeft = `${arrowSize}px solid ${arrowColor}`;
        break;
      case 'right':
        base.left = '100%';
        base.marginLeft = `${config.offset - arrowSize}px`;
        base.top = '50%';
        base.transform = 'translateY(-50%)';
        base.borderTop = `${arrowSize}px solid transparent`;
        base.borderBottom = `${arrowSize}px solid transparent`;
        base.borderRight = `${arrowSize}px solid ${arrowColor}`;
        break;
    }

    return base;
  }, [config, isGradient]);

  const handleBgBlur = useCallback(() => {
    // Auto-set arrow color to match solid bg
    if (!isGradient) {
      updateConfig('arrowColor', config.bgColor);
    }
  }, [config.bgColor, isGradient, updateConfig]);

  return (
    <ToolLayout
      title="CSS Tooltip Generator"
      description="Design beautiful, production-ready tooltips — position, arrow, colors, animations, and instant CSS copy. 100% visual, zero dependencies."
      controls={
        <>
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-xs text-slate-400">Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => resetToPreset(preset)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  config.text === preset.config.text &&
                  config.position === preset.config.position &&
                  config.bgColor === preset.config.bgColor
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                    : 'border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left panel: Controls */}
        <div className="space-y-6">
          {/* Content */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <MousePointer2 className="w-4 h-4 text-brand-400" />
              Content
            </h3>
            <input
              type="text"
              value={config.text}
              onChange={(e) => updateConfig('text', e.target.value)}
              placeholder="Tooltip text..."
              className="input-field w-full"
              maxLength={80}
            />
          </div>

          {/* Position */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Position</h3>
            <div className="flex gap-2">
              {([
                { value: 'top' as Position, icon: ArrowUp },
                { value: 'right' as Position, icon: ArrowRight },
                { value: 'bottom' as Position, icon: ArrowDown },
                { value: 'left' as Position, icon: ArrowLeft },
              ]).map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateConfig('position', value)}
                  className={`flex-1 p-3 rounded-lg border transition-colors flex items-center justify-center ${
                    config.position === value
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-3">
              <label className="text-xs text-slate-400">Offset:</label>
              <input
                type="range"
                min="0"
                max="30"
                value={config.offset}
                onChange={(e) => updateConfig('offset', Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-xs text-slate-300 w-8 text-right">{config.offset}px</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Arrow</h3>
              <button
                onClick={() => updateConfig('arrow', !config.arrow)}
                className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  config.arrow
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-slate-700/50 text-slate-500'
                }`}
              >
                {config.arrow ? 'On' : 'Off'}
              </button>
            </div>
            {config.arrow && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400">Size:</label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={config.arrowSize}
                    onChange={(e) => updateConfig('arrowSize', Number(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-xs text-slate-300 w-8 text-right">{config.arrowSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400">Color:</label>
                  <input
                    type="color"
                    value={config.arrowColor.startsWith('#') ? config.arrowColor : '#1e293b'}
                    onChange={(e) => updateConfig('arrowColor', e.target.value)}
                    className="w-10 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                  />
                  <button
                    onClick={() => updateConfig('arrowColor', config.bgColor.startsWith('#') ? config.bgColor : '#1e293b')}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Match background
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Colors
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Background</label>
                <input
                  type="text"
                  value={config.bgColor}
                  onChange={(e) => updateConfig('bgColor', e.target.value)}
                  onBlur={handleBgBlur}
                  placeholder="#1e293b or linear-gradient(...)"
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Text</label>
                <input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => updateConfig('textColor', e.target.value)}
                  className="w-full h-9 rounded border border-slate-600 cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4">Dimensions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 whitespace-nowrap">Font size:</label>
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={config.fontSize}
                  onChange={(e) => updateConfig('fontSize', Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-xs text-slate-300 w-10 text-right">{config.fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 whitespace-nowrap">Max width:</label>
                <input
                  type="range"
                  min="100"
                  max="400"
                  step="10"
                  value={config.maxWidth}
                  onChange={(e) => updateConfig('maxWidth', Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-xs text-slate-300 w-10 text-right">{config.maxWidth}px</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 whitespace-nowrap">Padding X:</label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={config.paddingX}
                  onChange={(e) => updateConfig('paddingX', Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-xs text-slate-300 w-10 text-right">{config.paddingX}px</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 whitespace-nowrap">Padding Y:</label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={config.paddingY}
                  onChange={(e) => updateConfig('paddingY', Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-xs text-slate-300 w-10 text-right">{config.paddingY}px</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 whitespace-nowrap">Border radius:</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={config.borderRadius}
                  onChange={(e) => updateConfig('borderRadius', Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-xs text-slate-300 w-10 text-right">{config.borderRadius}px</span>
              </div>
            </div>
          </div>

          {/* Animation */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-3">Animation</h3>
            <div className="flex gap-2">
              {ANIMATIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateConfig('animation', value)}
                  className={`flex-1 px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    config.animation === value
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/50 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel: Preview + Code */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4">Live Preview</h3>
            <div
              className="flex items-center justify-center bg-surface rounded-lg border border-slate-700/50"
              style={{ height: 240, padding: '20px', position: 'relative' }}
            >
              {/* The tooltip target */}
              <div
                className="group relative inline-flex cursor-pointer"
                style={{ position: 'relative' }}
              >
                {/* Target element */}
                <span className="px-5 py-2.5 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors select-none">
                  Hover me
                </span>

                {/* Tooltip arrow */}
                {arrowStyles && (
                  <div style={{ ...arrowStyles, width: 0, height: 0 }} />
                )}

                {/* Tooltip body */}
                <div
                  style={{
                    ...previewBaseStyles,
                    ...previewPositionStyles,
                  }}
                >
                  {config.text || 'Tooltip text'}
                </div>
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">CSS Output</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => resetToPreset(PRESETS[0])}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-surface transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={copyCss}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy CSS
                </button>
              </div>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 font-mono text-xs text-slate-300 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
              <code>{cssOutput}</code>
            </pre>
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Usage
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Copy the CSS above and add <code className="text-brand-400 bg-brand-500/10 px-1 rounded text-xs">class=&quot;tooltip&quot;</code> and{' '}
              <code className="text-brand-400 bg-brand-500/10 px-1 rounded text-xs">data-tooltip=&quot;Your text&quot;</code>{' '}
              to any HTML element. The tooltip appears on hover using pure CSS pseudo-elements — no JavaScript required.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
