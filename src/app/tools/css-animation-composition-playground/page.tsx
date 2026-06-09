'use client';

import { useState, useCallback, useMemo, type CSSProperties } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Play, Pause, RotateCcw, GripHorizontal, ChevronDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Composition = 'replace' | 'add' | 'accumulate';
type EasingPreset = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'cubic-bezier(0.34,1.56,0.64,1)';

interface AnimationLayer {
  id: string;
  property: string;
  from: string;
  to: string;
  duration: number;
  direction: 'normal' | 'alternate' | 'reverse' | 'alternate-reverse';
  easing: EasingPreset;
  composition: Composition;
  iterationCount: string;
}

const PROPERTY_PRESETS: { label: string; prop: string; from: string; to: string }[] = [
  { label: 'Scale', prop: 'scale', from: '1', to: '1.4' },
  { label: 'Translate X', prop: 'translateX', from: '0px', to: '80px' },
  { label: 'Translate Y', prop: 'translateY', from: '0px', to: '-60px' },
  { label: 'Rotate', prop: 'rotate', from: '0deg', to: '90deg' },
  { label: 'Opacity', prop: 'opacity', from: '1', to: '0.3' },
  { label: 'Skew X', prop: 'skewX', from: '0deg', to: '15deg' },
  { label: 'Skew Y', prop: 'skewY', from: '0deg', to: '-10deg' },
  { label: 'Scale X', prop: 'scaleX', from: '1', to: '0.6' },
  { label: 'Scale Y', prop: 'scaleY', from: '1', to: '1.3' },
  { label: 'Translate Z', prop: 'translateZ', from: '0px', to: '40px' },
];

const COMPOSITION_INFO: Record<Composition, string> = {
  replace: 'Replaces the underlying value. Only this animation&apos;s value is used.',
  add: 'Adds to the underlying value (as a composite). Best for transform combinations.',
  accumulate: 'Adds to the underlying value factoring in animation progress (accumulated sum).',
};

// ── Initial State ───────────────────────────────────────────────────────────

function createDefaultLayers(): AnimationLayer[] {
  return [
    {
      id: 'layer-1',
      property: 'scale',
      from: '1',
      to: '1.4',
      duration: 2,
      direction: 'alternate',
      easing: 'ease-in-out',
      composition: 'replace',
      iterationCount: 'infinite',
    },
    {
      id: 'layer-2',
      property: 'translateX',
      from: '0px',
      to: '60px',
      duration: 1.5,
      direction: 'alternate',
      easing: 'ease-in-out',
      composition: 'add',
      iterationCount: 'infinite',
    },
  ];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function layerToKeyframes(layer: AnimationLayer): string {
  const prop = layer.property;
  const from = layer.from;
  const to = layer.to;
  return `@keyframes anim-${layer.id} {
  from { ${prop}: ${from}; }
  to { ${prop}: ${to}; }
}`;
}

function layerToAnimationShorthand(layer: AnimationLayer): string {
  return `anim-${layer.id} ${layer.duration}s ${layer.easing} ${layer.direction} ${layer.iterationCount}`;
}

function buildFullCSS(layers: AnimationLayer[]): string {
  const keyframes = layers.map(l => layerToKeyframes(l)).join('\n\n');
  const animations = layers.map(l => layerToAnimationShorthand(l)).join(',\n       ');
  const compositions = layers
    .filter(l => l.composition !== 'replace')
    .map(l => `  animation-composition: ${l.composition}; /* per-animation: ${l.property} */`)
    .join('\n');

  return `${keyframes}

.animated-box {
  animation: ${animations};
${compositions || '  /* animation-composition defaults to "replace" for all */'}
}`;
}

function buildInlineStyle(layers: AnimationLayer[]): CSSProperties {
  if (layers.length === 0) return {};

  const animNames: string[] = [];
  const animDurations: string[] = [];
  const animEasings: string[] = [];
  const animDirections: string[] = [];
  const animIterations: string[] = [];
  const animCompositions: string[] = [];

  for (const l of layers) {
    animNames.push(`anim-${l.id}`);
    animDurations.push(`${l.duration}s`);
    animEasings.push(l.easing);
    animDirections.push(l.direction);
    animIterations.push(l.iterationCount);
    animCompositions.push(l.composition);
  }

  return {
    animationName: animNames.join(', '),
    animationDuration: animDurations.join(', '),
    animationTimingFunction: animEasings.join(', '),
    animationDirection: animDirections.join(', '),
    animationIterationCount: animIterations.join(', '),
    animationFillMode: 'both',
    animationComposition: animCompositions.join(', '),
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AnimationCompositionPlayground() {
  const [layers, setLayers] = useState<AnimationLayer[]>(createDefaultLayers);
  const [paused, setPaused] = useState(false);
  const [expandedLayer, setExpandedLayer] = useState<string | null>('layer-1');
  const [showComparison, setShowComparison] = useState(false);

  const inlineStyle = useMemo(() => buildInlineStyle(layers), [layers]);
  const fullCSS = useMemo(() => buildFullCSS(layers), [layers]);

  const updateLayer = useCallback((id: string, field: keyof AnimationLayer, value: string | number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }, []);

  const toggleLayerExpansion = useCallback((id: string) => {
    setExpandedLayer(prev => prev === id ? null : id);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(fullCSS).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [fullCSS]);

  const resetAll = useCallback(() => {
    setLayers(createDefaultLayers());
    setPaused(false);
  }, []);

  // ── Render Keyframe Styles ────────────────────────────────────────────────
  const keyframeStyles = useMemo(() => {
    return layers.map(l => {
      const prop = l.property;
      return `@keyframes anim-${l.id} { from { ${prop}: ${l.from}; } to { ${prop}: ${l.to}; } }`;
    }).join('\n');
  }, [layers]);

  return (
    <ToolLayout
      title="CSS animation-composition Playground"
      description="Visualize how animation-composition (replace | add | accumulate) controls how multiple animations combine on the same element."
    >
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: keyframeStyles }} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Left: Controls ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Animation Layers</h3>
              <span className="text-xs text-slate-500">{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
            </div>

            {layers.map((layer, idx) => {
              const isExpanded = expandedLayer === layer.id;
              const preset = PROPERTY_PRESETS.find(p => p.prop === layer.property);

              return (
                <div key={layer.id} className="border border-slate-700/50 rounded-lg overflow-hidden">
                  {/* Header bar */}
                  <button
                    onClick={() => toggleLayerExpansion(layer.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-lighter hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: idx === 0
                            ? 'linear-gradient(135deg, #f97316, #ec4899)'
                            : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        }}
                      />
                      <span className="text-sm font-medium text-slate-200">Layer {idx + 1}</span>
                      <span className="text-xs text-slate-500">
                        {preset?.label || layer.property} ({layer.composition})
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded controls */}
                  {isExpanded && (
                    <div className="p-4 space-y-3 border-t border-slate-700/50">
                      {/* Property selector */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Property</label>
                        <select
                          value={layer.property}
                          onChange={e => updateLayer(layer.id, 'property', e.target.value)}
                          className="input-field w-full text-xs"
                        >
                          {PROPERTY_PRESETS.map(p => (
                            <option key={p.prop} value={p.prop}>{p.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* From / To values */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">From</label>
                          <input
                            type="text"
                            value={layer.from}
                            onChange={e => updateLayer(layer.id, 'from', e.target.value)}
                            className="input-field w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">To</label>
                          <input
                            type="text"
                            value={layer.to}
                            onChange={e => updateLayer(layer.id, 'to', e.target.value)}
                            className="input-field w-full text-xs"
                          />
                        </div>
                      </div>

                      {/* Duration + Easing */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Duration ({layer.duration}s)
                          </label>
                          <input
                            type="range"
                            min="0.2"
                            max="5"
                            step="0.1"
                            value={layer.duration}
                            onChange={e => updateLayer(layer.id, 'duration', parseFloat(e.target.value))}
                            className="w-full accent-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Easing</label>
                          <select
                            value={layer.easing}
                            onChange={e => updateLayer(layer.id, 'easing', e.target.value as EasingPreset)}
                            className="input-field w-full text-xs"
                          >
                            <option value="ease">ease</option>
                            <option value="ease-in">ease-in</option>
                            <option value="ease-out">ease-out</option>
                            <option value="ease-in-out">ease-in-out</option>
                            <option value="linear">linear</option>
                            <option value="cubic-bezier(0.34,1.56,0.64,1)">spring</option>
                          </select>
                        </div>
                      </div>

                      {/* Direction + Iterations */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Direction</label>
                          <select
                            value={layer.direction}
                            onChange={e => updateLayer(layer.id, 'direction', e.target.value)}
                            className="input-field w-full text-xs"
                          >
                            <option value="normal">normal</option>
                            <option value="alternate">alternate</option>
                            <option value="reverse">reverse</option>
                            <option value="alternate-reverse">alternate-reverse</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Iterations</label>
                          <select
                            value={layer.iterationCount}
                            onChange={e => updateLayer(layer.id, 'iterationCount', e.target.value)}
                            className="input-field w-full text-xs"
                          >
                            <option value="infinite">infinite</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="5">5</option>
                          </select>
                        </div>
                      </div>

                      {/* Composition selector */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          animation-composition
                          <span
                            className="inline-flex items-center gap-0.5 ml-1 text-slate-500 cursor-help"
                            title={COMPOSITION_INFO[layer.composition]}
                          >
                            <Info className="w-3 h-3" />
                          </span>
                        </label>
                        <div className="flex gap-1 p-1 rounded-lg bg-surface border border-slate-700/30">
                          {(['replace', 'add', 'accumulate'] as Composition[]).map(mode => (
                            <button
                              key={mode}
                              onClick={() => updateLayer(layer.id, 'composition', mode)}
                              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                                layer.composition === mode
                                  ? 'bg-brand-500 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info card */}
          <div className="card bg-brand-500/5 border-brand-500/20">
            <h4 className="text-xs font-semibold text-brand-400 mb-2">About animation-composition</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><strong className="text-slate-300">replace</strong> — Default. New value overwrites the underlying value.</li>
              <li><strong className="text-slate-300">add</strong> — Adds the effect to the underlying value. Best for combining transforms.</li>
              <li><strong className="text-slate-300">accumulate</strong> — Similar to add, but accumulates progress across iterations.</li>
            </ul>
          </div>
        </div>

        {/* ── Right: Preview ───────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          {/* Preview area */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Live Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    showComparison
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/30'
                  }`}
                >
                  Compare
                </button>
                <button
                  onClick={() => setPaused(!paused)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/30 flex items-center gap-1"
                >
                  {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  {paused ? 'Play' : 'Pause'}
                </button>
                <button
                  onClick={resetAll}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-lighter text-slate-400 hover:text-slate-200 border border-slate-700/30 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {showComparison ? (
              /* Side-by-side comparison for each layer vs combined */
              <div className="grid grid-cols-3 gap-4">
                {layers.map((layer, idx) => {
                  const soloStyle: CSSProperties = {
                    animationName: `anim-${layer.id}`,
                    animationDuration: `${layer.duration}s`,
                    animationTimingFunction: layer.easing,
                    animationDirection: layer.direction,
                    animationIterationCount: layer.iterationCount,
                    animationFillMode: 'both',
                    animationPlayState: paused ? 'paused' : 'running',
                    animationComposition: 'replace',
                  };
                  return (
                    <div key={layer.id} className="flex flex-col items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Layer {idx + 1} ({layer.composition})
                      </span>
                      <div className="w-full aspect-square rounded-lg bg-surface border border-slate-700/50 flex items-center justify-center">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            background: idx === 0
                              ? 'linear-gradient(135deg, #f97316, #ec4899)'
                              : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            ...soloStyle,
                          }}
                        >
                          {idx + 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-green-400 font-medium">Combined</span>
                  <div className="w-full aspect-square rounded-lg bg-surface border border-brand-500/30 flex items-center justify-center">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #06b6d4)',
                        transform: 'perspective(200px)',
                        ...inlineStyle,
                        animationPlayState: paused ? 'paused' : 'running',
                      }}
                    >
                      &#x2726;
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Single combined preview */
              <div
                className="relative rounded-lg min-h-[400px] flex items-center justify-center overflow-hidden"
                style={{ background: 'radial-gradient(circle at center, rgba(15,23,42,0) 0%, #0f172a 100%)' }}
              >
                {/* Grid background */}
                <div className="absolute inset-0 opacity-[0.03]">
                  <div className="w-full h-full"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                      backgroundSize: '40px 40px',
                    }}
                  />
                </div>

                {/* Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-px h-full bg-slate-700/50" />
                  <div className="absolute w-full h-px bg-slate-700/50" />
                </div>

                {/* Animated element */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl shadow-lg relative z-10"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
                    boxShadow: '0 0 40px rgba(249, 115, 22, 0.3), 0 0 80px rgba(236, 72, 153, 0.15)',
                    ...inlineStyle,
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                >
                  <GripHorizontal className="w-5 h-5 text-white/60" />
                </div>

                {/* Axis labels */}
                <div className="absolute bottom-3 right-4 flex items-center gap-3 text-xs text-slate-600">
                  {layers.map((l, i) => (
                    <span key={l.id} className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{
                          background: i === 0
                            ? 'linear-gradient(135deg, #f97316, #ec4899)'
                            : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        }}
                      />
                      {l.property} ({l.composition})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Composition badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              {layers.map((layer, idx) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-slate-700/50"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: idx === 0
                        ? 'linear-gradient(135deg, #f97316, #ec4899)'
                        : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    }}
                  />
                  <span className="text-slate-300">{layer.property}</span>
                  <span className="text-slate-600">·</span>
                  <span className={`text-xs font-medium ${
                    layer.composition === 'replace' ? 'text-slate-400' :
                    layer.composition === 'add' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {layer.composition}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Generated CSS</h3>
              <button
                onClick={copyCSS}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
            <pre className="bg-surface border border-slate-700/50 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{fullCSS}</code>
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
