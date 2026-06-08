'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Layers, Eye, Info, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

// Types

interface StackLayer {
  id: number;
  label: string;
  color: string;
  zIndex: number;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

interface StackingContextProperty {
  name: string;
  key: string;
  description: string;
  createsContext: boolean;
  value: string;
  options: string[];
}

interface Preset {
  name: string;
  description: string;
  layers: StackLayer[];
  explanation: string;
}

// Constants: all CSS properties/values that create stacking contexts

const STACKING_PROPERTIES: StackingContextProperty[] = [
  {
    name: 'Document Root',
    key: 'root',
    description: '<html> always creates the root stacking context.',
    createsContext: true,
    value: 'auto',
    options: ['auto'],
  },
  {
    name: 'Position + z-index',
    key: 'positioned',
    description: 'relative/absolute/fixed/sticky + z-index != auto',
    createsContext: true,
    value: 'position: relative; z-index: 2',
    options: ['position: relative; z-index: 2', 'position: absolute; z-index: 3', 'position: fixed; z-index: 10'],
  },
  {
    name: 'Opacity < 1',
    key: 'opacity',
    description: 'opacity less than 1 creates a new stacking context.',
    createsContext: true,
    value: 'opacity: 0.99',
    options: ['opacity: 0.99', 'opacity: 0.5'],
  },
  {
    name: 'Transform',
    key: 'transform',
    description: 'transform != none creates stacking context.',
    createsContext: true,
    value: 'transform: none',
    options: ['transform: none', 'transform: scale(1)', 'transform: rotate(0deg)', 'transform: translateZ(0)'],
  },
  {
    name: 'Filter',
    key: 'filter',
    description: 'filter != none creates stacking context.',
    createsContext: true,
    value: 'filter: none',
    options: ['filter: none', 'filter: blur(0px)', 'filter: brightness(1)'],
  },
  {
    name: 'Will-Change',
    key: 'willChange',
    description: 'will-change of specific properties creates stacking context.',
    createsContext: true,
    value: 'will-change: auto',
    options: ['will-change: auto', 'will-change: transform', 'will-change: opacity', 'will-change: filter'],
  },
  {
    name: 'Isolation',
    key: 'isolation',
    description: 'isolation: isolate explicitly creates stacking context.',
    createsContext: true,
    value: 'isolation: auto',
    options: ['isolation: auto', 'isolation: isolate'],
  },
  {
    name: 'Mix-Blend-Mode',
    key: 'mixBlendMode',
    description: 'mix-blend-mode != normal creates stacking context.',
    createsContext: true,
    value: 'mix-blend-mode: normal',
    options: ['mix-blend-mode: normal', 'mix-blend-mode: multiply', 'mix-blend-mode: screen', 'mix-blend-mode: overlay'],
  },
  {
    name: 'Backdrop-Filter',
    key: 'backdropFilter',
    description: 'backdrop-filter != none creates stacking context.',
    createsContext: true,
    value: 'backdrop-filter: none',
    options: ['backdrop-filter: none', 'backdrop-filter: blur(5px)', 'backdrop-filter: brightness(0.8)'],
  },
  {
    name: 'Perspective',
    key: 'perspective',
    description: 'perspective != none creates stacking context.',
    createsContext: true,
    value: 'perspective: none',
    options: ['perspective: none', 'perspective: 1px'],
  },
  {
    name: 'Clip-Path',
    key: 'clipPath',
    description: 'clip-path != none creates stacking context.',
    createsContext: true,
    value: 'clip-path: none',
    options: ['clip-path: none', 'clip-path: inset(0)', 'clip-path: circle(100%)'],
  },
  {
    name: 'Mask',
    key: 'mask',
    description: 'mask != none creates stacking context.',
    createsContext: true,
    value: 'mask: none',
    options: ['mask: none', 'mask: linear-gradient(#000, #000)'],
  },
  {
    name: 'Contain (layout/paint)',
    key: 'contain',
    description: 'contain: layout, paint, or strict creates stacking context.',
    createsContext: true,
    value: 'contain: none',
    options: ['contain: none', 'contain: layout', 'contain: paint', 'contain: strict'],
  },
  {
    name: 'Content-Visibility',
    key: 'contentVisibility',
    description: 'content-visibility: auto creates stacking context.',
    createsContext: true,
    value: 'content-visibility: visible',
    options: ['content-visibility: visible', 'content-visibility: auto'],
  },
  {
    name: 'Flex/Grid z-index',
    key: 'flexGridZ',
    description: 'Flex/Grid items with z-index != auto create stacking context.',
    createsContext: true,
    value: 'z-index: auto',
    options: ['z-index: auto', 'z-index: 1 (flex item)', 'z-index: 2 (grid item)'],
  },
  {
    name: 'View Transitions',
    key: 'viewTransitions',
    description: 'view-transition-name creates stacking context (Chrome).',
    createsContext: true,
    value: 'view-transition-name: none',
    options: ['view-transition-name: none', 'view-transition-name: vt-box'],
  },
];

// Presets

const PRESETS: Preset[] = [
  {
    name: 'Simple z-index',
    description: 'Three overlapping positioned elements with different z-indices.',
    layers: [
      { id: 1, label: 'z-index: 1', color: '#3b82f6', zIndex: 1, xOffset: 0, yOffset: 0, width: 220, height: 160 },
      { id: 2, label: 'z-index: 2', color: '#f97316', zIndex: 2, xOffset: 40, yOffset: 30, width: 220, height: 160 },
      { id: 3, label: 'z-index: 3', color: '#22c55e', zIndex: 3, xOffset: 80, yOffset: 60, width: 220, height: 160 },
    ],
    explanation: 'All siblings are positioned (position: relative). Their z-index values directly determine paint order. Green (z-index: 3) paints last -- on top.',
  },
  {
    name: 'Opacity Trap',
    description: 'What happens when opacity < 1 meets a high z-index child.',
    layers: [
      { id: 1, label: 'opacity: 0.99', color: '#8b5cf6', zIndex: 0, xOffset: 0, yOffset: 0, width: 280, height: 210 },
      { id: 2, label: 'z-index: 9999', color: '#ef4444', zIndex: 0, xOffset: 25, yOffset: 25, width: 230, height: 160 },
      { id: 3, label: 'z-index: 5', color: '#06b6d4', zIndex: 0, xOffset: 140, yOffset: 55, width: 200, height: 120 },
    ],
    explanation: 'The purple box has opacity: 0.99, creating a NEW stacking context. Its child (red, z-index: 9999) is trapped inside -- it CANNOT paint above the cyan box (z-index: 5) which is a sibling of the purple box. The child\'s z-index only matters within the purple box\'s context.',
  },
  {
    name: 'Transform Context',
    description: 'transform: scale(1) creates a stacking context, locking children inside.',
    layers: [
      { id: 1, label: 'transform', color: '#ec4899', zIndex: 0, xOffset: 0, yOffset: 0, width: 250, height: 200 },
      { id: 2, label: 'child z:999', color: '#eab308', zIndex: 0, xOffset: 30, yOffset: 30, width: 190, height: 140 },
      { id: 3, label: 'sibling z: 1', color: '#06b6d4', zIndex: 0, xOffset: 150, yOffset: 70, width: 200, height: 120 },
    ],
    explanation: 'transform: scale(1) -- even a "no-op" transform -- creates a stacking context. The yellow child inside the pink box cannot escape to paint above the cyan sibling, regardless of z-index.',
  },
  {
    name: 'Isolation Rescue',
    description: 'isolation: isolate as an opt-in stacking context.',
    layers: [
      { id: 1, label: 'isolation', color: '#14b8a6', zIndex: 0, xOffset: 0, yOffset: 0, width: 240, height: 180 },
      { id: 2, label: 'child z: 10', color: '#a855f7', zIndex: 0, xOffset: 20, yOffset: 20, width: 200, height: 140 },
      { id: 3, label: 'sibling z: 0', color: '#f43f5e', zIndex: 0, xOffset: 140, yOffset: 50, width: 180, height: 110 },
    ],
    explanation: 'isolation: isolate is the clean way to explicitly create a stacking context -- no visual side effects. Perfect when you need to contain z-index without opacity/transform hacks.',
  },
  {
    name: 'Filter Creates Context',
    description: 'Even filter: brightness(1) creates a new stacking context.',
    layers: [
      { id: 1, label: 'filter:bright(1)', color: '#6366f1', zIndex: 0, xOffset: 0, yOffset: 0, width: 260, height: 200 },
      { id: 2, label: 'child z: 100', color: '#84cc16', zIndex: 0, xOffset: 30, yOffset: 30, width: 200, height: 140 },
      { id: 3, label: 'sibling z: 2', color: '#f59e0b', zIndex: 0, xOffset: 160, yOffset: 70, width: 200, height: 120 },
    ],
    explanation: 'filter: brightness(1) looks like a no-op but it creates a stacking context. The lime child inside indigo cannot escape to paint above orange -- similar to the opacity trap.',
  },
];

// Component

export default function CssStackingContextPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>('Simple z-index');
  const [showProps, setShowProps] = useState(false);
  const [highlightedProp, setHighlightedProp] = useState<string | null>(null);

  const currentPreset = useMemo(
    () => PRESETS.find((p) => p.name === selectedPreset) || PRESETS[0],
    [selectedPreset],
  );

  const sortedLayers = useMemo(() => {
    return [...currentPreset.layers].sort((a, b) => a.zIndex - b.zIndex);
  }, [currentPreset]);

  const copyCss = useCallback(
    (prop: StackingContextProperty) => {
      navigator.clipboard.writeText(prop.value).then(
        () => toast.success('CSS copied!'),
        () => toast.error('Failed to copy'),
      );
    },
    [],
  );

  return (
    <ToolLayout
      title="CSS Stacking Context Visualizer"
      description="Understand how CSS stacking contexts work -- one of the most confusing parts of the cascade. See how opacity, transform, filter, and other properties create invisible z-index boundaries that trap children."
      controls={
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 text-sm font-medium">Preset:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setSelectedPreset(p.name)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedPreset === p.name
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                    : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setShowProps(!showProps)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showProps
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-surface-light text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              What Creates Stacking Context?
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* LEFT PANEL: Visualization */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <p className="text-slate-300 text-sm leading-relaxed">{currentPreset.description}</p>
          </div>

          {/* The visual stacking playground */}
          <div
            className="relative rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 overflow-hidden"
            style={{ height: 420 }}
          >
            {sortedLayers.map((layer) => (
              <div
                key={layer.id}
                className="absolute rounded-xl border-2 flex items-center justify-center transition-all duration-300"
                style={{
                  left: layer.xOffset,
                  top: layer.yOffset,
                  width: layer.width,
                  height: layer.height,
                  backgroundColor: layer.color + '33',
                  borderColor: layer.color,
                  zIndex: layer.zIndex,
                }}
              >
                <div className="text-center">
                  <span
                    className="inline-block px-2.5 py-1 rounded-md text-xs font-bold"
                    style={{ backgroundColor: layer.color + 'CC', color: '#fff' }}
                  >
                    {layer.label}
                  </span>
                  {layer.zIndex > 0 && (
                    <div
                      className="mt-1.5 text-xs font-mono px-2 py-0.5 rounded"
                      style={{ color: layer.color }}
                    >
                      z-index: {layer.zIndex}
                    </div>
                  )}
                </div>
                <div
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                  style={{ backgroundColor: layer.color, color: '#fff' }}
                  title={`z-index: ${layer.zIndex}`}
                >
                  {layer.zIndex}
                </div>
              </div>
            ))}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-600/50">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">
                Paint order: lowest z-index to highest z-index
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-amber-300 font-semibold text-sm mb-2">Why This Happens</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{currentPreset.explanation}</p>
              </div>
            </div>
          </div>

          {/* Layer details */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-slate-200 font-semibold text-sm mb-3">Layers</h3>
            <div className="space-y-2">
              {currentPreset.layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30"
                >
                  <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: layer.color }} />
                  <span className="text-sm text-slate-300 flex-1">{layer.label}</span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    {layer.width}x{layer.height}
                  </span>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: layer.color + '22', color: layer.color }}
                  >
                    z: {layer.zIndex}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Property Reference */}
        <div className="lg:col-span-2 space-y-6">
          {showProps && (
            <div className="space-y-3">
              <h3 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Properties That Create Stacking Contexts
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Click any property to copy its CSS value. Hover to inspect.
              </p>
              {STACKING_PROPERTIES.filter((p) => p.key !== 'root').map((prop) => (
                <button
                  key={prop.key}
                  onClick={() => copyCss(prop)}
                  onMouseEnter={() => setHighlightedProp(prop.key)}
                  onMouseLeave={() => setHighlightedProp(null)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    highlightedProp === prop.key
                      ? 'bg-brand-500/10 border-brand-500/40 scale-[1.02]'
                      : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/60 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{prop.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{prop.description}</div>
                    </div>
                    <span className="text-xs font-mono text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      {prop.value.split(':')[0]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* What does NOT create stacking context */}
          <div className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
            <h3 className="text-slate-200 font-semibold text-sm mb-3">Does NOT Create Stacking Context</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&times;</span>
                <span><code className="text-slate-500">position: relative</code> without z-index</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&times;</span>
                <span><code className="text-slate-500">z-index: auto</code> (not a positioned element)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&times;</span>
                <span><code className="text-slate-500">opacity: 1</code> (exactly 1)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&times;</span>
                <span><code className="text-slate-500">transform: none</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&times;</span>
                <span><code className="text-slate-500">filter: none</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&times;</span>
                <span><code className="text-slate-500">display: flex/grid</code> (only items with z-index)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&times;</span>
                <span><code className="text-slate-500">overflow: hidden</code> (does NOT create stacking context)</span>
              </li>
            </ul>
          </div>

          {/* Key Takeaway */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20">
            <h3 className="text-brand-300 font-semibold text-sm mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Key Insight
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              A <strong className="text-white">stacking context</strong> is an invisible box that isolates
              z-index values. Children inside can never paint above siblings of the context-creating
              element -- no matter how high their z-index. Think of it as a &quot;z-index jail.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Bottom: Full property reference grid (always visible) */}
      <div className="mt-12 p-6 rounded-xl bg-surface-light border border-slate-700/50">
        <h2 className="text-slate-200 font-semibold text-lg mb-2">
          Complete Stacking Context Triggers
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          All CSS properties/values that create a new stacking context. From{' '}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 underline"
          >
            MDN docs
          </a>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STACKING_PROPERTIES.map((prop) => (
            <button
              key={prop.key}
              onClick={() => copyCss(prop)}
              className="text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/60 hover:bg-slate-800/80 transition-all cursor-pointer group"
            >
              <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                {prop.name}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">{prop.value}</div>
              <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">{prop.description}</div>
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
