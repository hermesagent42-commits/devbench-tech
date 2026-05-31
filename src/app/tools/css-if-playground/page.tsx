'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, Play, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';

type QueryType = 'style' | 'media' | 'supports';

interface Preset {
  name: string;
  description: string;
  queryType: QueryType;
  condition: string;
  trueValue: string;
  falseValue: string;
  property: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Dark Mode Colors',
    description: 'Switch colors based on a custom property',
    queryType: 'style',
    condition: 'style(--theme: dark)',
    trueValue: '#f1f5f9',
    falseValue: '#0f172a',
    property: 'color',
  },
  {
    name: 'Responsive Font Size',
    description: 'Change font size based on viewport width',
    queryType: 'media',
    condition: 'media(width >= 768px)',
    trueValue: '2rem',
    falseValue: '1.25rem',
    property: 'font-size',
  },
  {
    name: 'Grid Support',
    description: 'Use grid if supported, fallback to flex',
    queryType: 'supports',
    condition: 'supports(display: grid)',
    trueValue: 'grid',
    falseValue: 'flex',
    property: 'display',
  },
  {
    name: 'Spacing Scale',
    description: 'Compact vs comfortable spacing',
    queryType: 'style',
    condition: 'style(--density: compact)',
    trueValue: '0.5rem',
    falseValue: '1.5rem',
    property: 'padding',
  },
  {
    name: 'Print Styles',
    description: 'Different colors for print',
    queryType: 'media',
    condition: 'media(print)',
    trueValue: '#000000',
    falseValue: '#3b82f6',
    property: 'color',
  },
  {
    name: 'Container Query Width',
    description: 'Style based on container width',
    queryType: 'style',
    condition: 'style(--variant: featured)',
    trueValue: '2px solid #f59e0b',
    falseValue: '1px solid #e2e8f0',
    property: 'border',
  },
  {
    name: 'Reduced Motion',
    description: 'Respect user motion preferences',
    queryType: 'media',
    condition: 'media(prefers-reduced-motion: reduce)',
    trueValue: '0s',
    falseValue: '0.3s',
    property: 'transition-duration',
  },
  {
    name: 'Backdrop Filter Support',
    description: 'Use backdrop-filter if supported',
    queryType: 'supports',
    condition: 'supports(backdrop-filter: blur(10px))',
    trueValue: 'blur(10px)',
    falseValue: 'none',
    property: 'backdrop-filter',
  },
];

const QUERY_TYPE_LABELS: Record<QueryType, string> = {
  style: 'Style Query — based on custom properties',
  media: 'Media Query — based on viewport/device',
  supports: 'Supports Query — based on feature support',
};

const QUERY_TYPE_ICONS: Record<QueryType, string> = {
  style: '🎨',
  media: '📱',
  supports: '✅',
};

export default function CssIfPlaygroundPage() {
  const [queryType, setQueryType] = useState<QueryType>('style');
  const [condition, setCondition] = useState('style(--theme: dark)');
  const [trueValue, setTrueValue] = useState('#f1f5f9');
  const [falseValue, setFalseValue] = useState('#0f172a');
  const [property, setProperty] = useState('color');
  const [showPreview, setShowPreview] = useState(false);
  const [toggleCondition, setToggleCondition] = useState(false); // false = false branch active

  const generatedCss = useMemo(() => {
    return `${property}: if(${condition}: ${trueValue}; else: ${falseValue});`;
  }, [property, condition, trueValue, falseValue]);

  const fallbackCss = useMemo(() => {
    // Generate a safe fallback for browsers that don't support if()
    return `${property}: ${falseValue}; /* fallback */\n/* Browsers supporting if() will use: */\n/* ${property}: if(${condition}: ${trueValue}; else: ${falseValue}); */`;
  }, [property, condition, trueValue, falseValue]);

  const previewStyle = useMemo(() => {
    const value = toggleCondition ? trueValue : falseValue;
    return { [property]: value };
  }, [property, trueValue, falseValue, toggleCondition]);

  const applyPreset = useCallback((preset: Preset) => {
    setQueryType(preset.queryType);
    setCondition(preset.condition);
    setTrueValue(preset.trueValue);
    setFalseValue(preset.falseValue);
    setProperty(preset.property);
    setToggleCondition(false);
  }, []);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(generatedCss).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [generatedCss]);

  const copyFallback = useCallback(() => {
    navigator.clipboard.writeText(fallbackCss).then(
      () => toast.success('Fallback CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [fallbackCss]);

  const reset = useCallback(() => {
    setQueryType('style');
    setCondition('style(--theme: dark)');
    setTrueValue('#f1f5f9');
    setFalseValue('#0f172a');
    setProperty('color');
    setToggleCondition(false);
  }, []);

  return (
    <ToolLayout
      title="CSS if() Playground"
      description="Experiment with the new CSS if() conditional function (Baseline 2026). Style, media, and supports queries to switch values inline."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={reset} className="btn btn-sm btn-ghost" title="Reset">
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-sm btn-ghost"
          >
            <Play className="w-4 h-4" /> {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      }
    >
      {/* Browser Support Banner */}
      <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium mb-1">
              Baseline 2026 — Newly available across all major browsers
            </p>
            <p className="text-amber-400/80 text-xs">
              Chrome 134+, Firefox 140+, Safari 18.2+. Always provide a plain fallback value for older browsers.
            </p>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Quick Presets
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PRESETS.slice(0, 8).map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-brand-500/50 hover:bg-brand-500/5 text-left transition-all group"
            >
              <div className="text-xs text-slate-500 mb-1">
                {QUERY_TYPE_ICONS[preset.queryType]} {preset.queryType}
              </div>
              <div className="text-sm font-medium text-slate-200 group-hover:text-brand-400">
                {preset.name}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Query Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Query Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['style', 'media', 'supports'] as QueryType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setQueryType(type);
                    // Reset condition to match type
                    if (type === 'style') setCondition('style(--theme: dark)');
                    if (type === 'media') setCondition('media(width >= 768px)');
                    if (type === 'supports') setCondition('supports(display: grid)');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    queryType === type
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {QUERY_TYPE_ICONS[type]} {type}()
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {QUERY_TYPE_LABELS[queryType]}
            </p>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Condition
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500"
              placeholder="style(--theme: dark)"
            />
          </div>

          {/* Property */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              CSS Property
            </label>
            <input
              type="text"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500"
              placeholder="color"
            />
          </div>

          {/* True Value */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="text-emerald-400">✓</span> Value when TRUE
            </label>
            <input
              type="text"
              value={trueValue}
              onChange={(e) => setTrueValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-700/50 text-emerald-300 text-sm font-mono focus:outline-none focus:border-emerald-500"
              placeholder="#f1f5f9"
            />
          </div>

          {/* False Value */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="text-red-400">✗</span> Value when FALSE (fallback)
            </label>
            <input
              type="text"
              value={falseValue}
              onChange={(e) => setFalseValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-red-700/50 text-red-300 text-sm font-mono focus:outline-none focus:border-red-500"
              placeholder="#0f172a"
            />
          </div>
        </div>

        {/* Right: Output */}
        <div className="space-y-6">
          {/* Generated CSS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Generated CSS
              </label>
              <button onClick={copyCss} className="btn btn-ghost btn-sm">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 border border-brand-500/30 text-sm font-mono text-brand-300 overflow-x-auto">
              <code>{generatedCss}</code>
            </pre>
          </div>

          {/* Fallback CSS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Safe Fallback Pattern
              </label>
              <button onClick={copyFallback} className="btn btn-ghost btn-sm">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-slate-400 overflow-x-auto">
              <code>{fallbackCss}</code>
            </pre>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Live Preview
                </label>
                <button
                  onClick={() => setToggleCondition(!toggleCondition)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    toggleCondition
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : 'bg-red-500/20 text-red-400 border border-red-500/50'
                  }`}
                >
                  {toggleCondition ? 'Condition: TRUE ✓' : 'Condition: FALSE ✗'}
                </button>
              </div>
              <div className="p-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center min-h-[120px]">
                <div
                  style={previewStyle as React.CSSProperties}
                  className="text-lg font-medium transition-all duration-300"
                >
                  {property === 'color' || property === 'border-color'
                    ? 'The quick brown fox jumps over the lazy dog.'
                    : property === 'font-size'
                    ? property === 'font-size' ? 'Typography Sample Text' : ''
                    : 'This element demonstrates the if() condition.'}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Toggle the condition to see how the value changes. In production, the condition is evaluated by the browser automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Syntax Reference */}
      <div className="mt-10 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          📖 CSS if() Syntax Reference
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-900/50">
            <div className="text-brand-400 font-mono text-sm mb-2">style()</div>
            <p className="text-xs text-slate-400">
              Tests a style condition — typically custom property values on the element or its container.
            </p>
            <code className="block mt-2 text-xs text-slate-300 bg-slate-950 p-2 rounded">
              if(style(--theme: dark): #eee; else: #111)
            </code>
          </div>
          <div className="p-4 rounded-lg bg-slate-900/50">
            <div className="text-brand-400 font-mono text-sm mb-2">media()</div>
            <p className="text-xs text-slate-400">
              Tests a media condition — viewport size, device type, user preferences.
            </p>
            <code className="block mt-2 text-xs text-slate-300 bg-slate-950 p-2 rounded">
              if(media(width {'>='} 768px): 2rem; else: 1rem)
            </code>
          </div>
          <div className="p-4 rounded-lg bg-slate-900/50">
            <div className="text-brand-400 font-mono text-sm mb-2">supports()</div>
            <p className="text-xs text-slate-400">
              Tests whether the browser supports a CSS feature. Feature detection without JS.
            </p>
            <code className="block mt-2 text-xs text-slate-300 bg-slate-950 p-2 rounded">
              if(supports(display: grid): grid; else: flex)
            </code>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
