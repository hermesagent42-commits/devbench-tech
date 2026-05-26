'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Plus, Trash2, GripVertical, Copy, Info, Layers, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ───────────────────────────────────────────────────────────────────

interface CssRule {
  property: string;
  value: string;
}

interface Layer {
  id: string;
  name: string;
  color: string;
  rules: CssRule[];
}

const STYLE_PROPERTIES = [
  { prop: 'color', label: 'Text Color', type: 'color', default: '#ffffff' },
  { prop: 'background-color', label: 'Background', type: 'color', default: '#1e293b' },
  { prop: 'font-size', label: 'Font Size', type: 'text', default: '16px' },
  { prop: 'font-weight', label: 'Font Weight', type: 'select', options: ['normal','bold','300','400','500','600','700','800','900'], default: 'normal' },
  { prop: 'font-style', label: 'Font Style', type: 'select', options: ['normal','italic','oblique'], default: 'normal' },
  { prop: 'text-align', label: 'Text Align', type: 'select', options: ['left','center','right','justify'], default: 'left' },
  { prop: 'border', label: 'Border', type: 'text', default: '2px solid #475569' },
  { prop: 'border-radius', label: 'Border Radius', type: 'text', default: '8px' },
  { prop: 'padding', label: 'Padding', type: 'text', default: '24px' },
  { prop: 'margin', label: 'Margin', type: 'text', default: '0px' },
  { prop: 'width', label: 'Width', type: 'text', default: 'auto' },
  { prop: 'text-transform', label: 'Text Transform', type: 'select', options: ['none','uppercase','lowercase','capitalize'], default: 'none' },
  { prop: 'letter-spacing', label: 'Letter Spacing', type: 'text', default: 'normal' },
  { prop: 'box-shadow', label: 'Box Shadow', type: 'text', default: 'none' },
  { prop: 'opacity', label: 'Opacity', type: 'text', default: '1' },
];

const LAYER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6',
];

const DEFAULT_LAYERS: Layer[] = [
  {
    id: '1', name: 'reset', color: '#64748b',
    rules: [
      { property: 'margin', value: '0' },
      { property: 'padding', value: '0' },
      { property: 'font-weight', value: 'normal' },
    ],
  },
  {
    id: '2', name: 'base', color: '#3b82f6',
    rules: [
      { property: 'color', value: '#e2e8f0' },
      { property: 'background-color', value: '#0f172a' },
      { property: 'font-size', value: '18px' },
      { property: 'padding', value: '24px' },
      { property: 'border-radius', value: '8px' },
    ],
  },
  {
    id: '3', name: 'components', color: '#22c55e',
    rules: [
      { property: 'border', value: '2px solid #334155' },
      { property: 'font-weight', value: '500' },
    ],
  },
  {
    id: '4', name: 'utilities', color: '#ef4444',
    rules: [
      { property: 'color', value: '#f87171' },
      { property: 'font-weight', value: '700' },
      { property: 'text-transform', value: 'uppercase' },
      { property: 'letter-spacing', value: '0.1em' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function resolveStyles(layers: Layer[]): Record<string, { value: string; layerId: string; layerName: string; color: string }> {
  const resolved: Record<string, { value: string; layerId: string; layerName: string; color: string }> = {};
  // First layer = lowest priority, last = highest (like CSS cascade)
  for (const layer of layers) {
    for (const rule of layer.rules) {
      if (rule.value && rule.value.trim()) {
        resolved[rule.property] = { value: rule.value, layerId: layer.id, layerName: layer.name, color: layer.color };
      }
    }
  }
  return resolved;
}

function generateLayerCSS(layers: Layer[]): string {
  return layers.map(layer => {
    const rules = layer.rules
      .filter(r => r.value && r.value.trim())
      .map(r => `  ${r.property}: ${r.value};`)
      .join('\n');
    return rules ? `@layer ${layer.name} {\n${rules}\n}` : '';
  }).filter(Boolean).join('\n\n');
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function CascadeLayersPage() {
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [selectedLayerId, setSelectedLayerId] = useState<string>(DEFAULT_LAYERS[3].id);
  const [previewText, setPreviewText] = useState('Cascade Layers');

  const resolvedStyles = useMemo(() => resolveStyles(layers), [layers]);
  const selectedLayer = layers.find(l => l.id === selectedLayerId) || null;

  // ── Layer Actions ─────────────────────────────────────────────────────────

  const addLayer = useCallback(() => {
    const count = layers.length;
    const newLayer: Layer = {
      id: generateId(),
      name: `layer-${count + 1}`,
      color: LAYER_COLORS[count % LAYER_COLORS.length],
      rules: [],
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers.length]);

  const removeLayer = useCallback((id: string) => {
    if (layers.length <= 1) return;
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const next = prev.filter(l => l.id !== id);
      if (selectedLayerId === id) {
        const newIdx = Math.min(idx, next.length - 1);
        if (next[newIdx]) setSelectedLayerId(next[newIdx].id);
      }
      return next;
    });
  }, [layers, selectedLayerId]);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (direction === 'up' && idx < prev.length - 1) {
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      }
      if (direction === 'down' && idx > 0) {
        const next = [...prev];
        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
        return next;
      }
      return prev;
    });
  }, []);

  const updateLayerName = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }, []);

  const updateLayerColor = useCallback((id: string, color: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, color } : l));
  }, []);

  // ── Rule Actions ──────────────────────────────────────────────────────────

  const addRule = useCallback((layerId: string) => {
    const unusedProp = STYLE_PROPERTIES.find(
      sp => !layers.find(l => l.id === layerId)?.rules.some(r => r.property === sp.prop)
    );
    if (!unusedProp) {
      toast.error('All properties already added to this layer.');
      return;
    }
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, rules: [...l.rules, { property: unusedProp.prop, value: unusedProp.default }] } : l
    ));
  }, [layers]);

  const updateRuleValue = useCallback((layerId: string, property: string, value: string) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, rules: l.rules.map(r => r.property === property ? { ...r, value } : r) } : l
    ));
  }, []);

  const removeRule = useCallback((layerId: string, property: string) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, rules: l.rules.filter(r => r.property !== property) } : l
    ));
  }, []);

  const reset = useCallback(() => {
    setLayers(DEFAULT_LAYERS);
    setSelectedLayerId(DEFAULT_LAYERS[3].id);
    setPreviewText('Cascade Layers');
  }, []);

  const copyCSS = useCallback(() => {
    const css = generateLayerCSS(layers);
    navigator.clipboard.writeText(css);
    toast.success('CSS copied!');
  }, [layers]);

  // ── Render ────────────────────────────────────────────────────────────────

  const previewInlineStyle = Object.fromEntries(
    Object.entries(resolvedStyles).map(([prop, info]) => [prop, info.value])
  );

  return (
    <ToolLayout
      title="CSS Cascade Layers Playground"
      description="Visually explore CSS @layer — organize your styles by priority and see exactly how the cascade resolves conflicts. Rearrange layers, add CSS rules, and watch the browser choose the winner."
    >
      <div className="space-y-6">
        {/* Top Bar: Reset + Copy */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">
              Layers are ordered by priority — <strong>top = highest</strong> (last declared), <strong>bottom = lowest</strong> (first declared). Drag layers up for higher priority.
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
            <button onClick={copyCSS} className="btn-primary text-xs px-3 py-2 inline-flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy CSS
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left: Layer List ────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              Layer Stack
              <span className="text-xs text-slate-500 font-normal">(top wins)</span>
            </h3>

            {layers.map((layer, idx) => {
              const isHighest = idx === 0;
              const isLowest = idx === layers.length - 1;
              const isSelected = layer.id === selectedLayerId;

              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`card cursor-pointer transition-all ${
                    isSelected ? 'ring-1 ring-brand-500/30 border-brand-500/30' : 'hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Priority badge */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }}
                        disabled={isHighest}
                        className="p-0.5 rounded text-slate-600 hover:text-white hover:bg-surface-lighter disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] font-mono text-slate-500">{idx + 1}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }}
                        disabled={isLowest}
                        className="p-0.5 rounded text-slate-600 hover:text-white hover:bg-surface-lighter disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Color swatch */}
                    <div className="relative shrink-0">
                      <div
                        className="w-8 h-8 rounded-lg border border-slate-600/50"
                        style={{ backgroundColor: layer.color }}
                      />
                      <input
                        type="color"
                        value={layer.color}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateLayerColor(layer.id, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>

                    {/* Name */}
                    <input
                      type="text"
                      value={layer.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateLayerName(layer.id, e.target.value)}
                      className="bg-transparent text-white text-sm font-mono border-b border-transparent hover:border-slate-600 focus:border-brand-500 focus:outline-none w-32 px-1"
                    />

                    {/* Rule count */}
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {layer.rules.length} rule{layer.rules.length !== 1 ? 's' : ''}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                      disabled={layers.length <= 1}
                      className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mini rule preview */}
                  {layer.rules.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {layer.rules.slice(0, 4).map(r => (
                        <span
                          key={r.property}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: layer.color + '20', color: layer.color, borderColor: layer.color + '30', border: '1px solid ' + layer.color + '30' }}
                        >
                          {r.property}: {r.value}
                        </span>
                      ))}
                      {layer.rules.length > 4 && (
                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5">+{layer.rules.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={addLayer} className="w-full btn-secondary text-xs py-2.5 inline-flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Layer
            </button>
          </div>

          {/* ── Right: Preview + Layer Editor ─────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Preview */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Live Preview</h3>
              <div className="card p-0 overflow-hidden">
                <div className="min-h-[200px] flex items-center justify-center p-8 bg-slate-950/50">
                  <div
                    className="flex items-center justify-center transition-all duration-200"
                    style={previewInlineStyle}
                  >
                    {previewText}
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-slate-700/50 flex items-center gap-3">
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="Preview text..."
                    className="bg-transparent text-xs text-slate-300 flex-1 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Change text to preview styling</span>
                </div>
              </div>
            </div>

            {/* Cascade Resolution Table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Cascade Resolution</h3>
              <p className="text-xs text-slate-500 mb-3">
                Each property shows which layer&apos;s value wins. The <strong>winner</strong> is the highest-priority layer (top of the stack) that sets the property.
              </p>
              <div className="card overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left text-slate-400 font-medium px-3 py-2">Property</th>
                      <th className="text-left text-slate-400 font-medium px-3 py-2">Winning Value</th>
                      <th className="text-left text-slate-400 font-medium px-3 py-2">From Layer</th>
                      <th className="text-left text-slate-400 font-medium px-3 py-2">Overridden By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resolvedStyles).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                          No properties set. Add rules to layers.
                        </td>
                      </tr>
                    )}
                    {Object.entries(resolvedStyles).map(([prop, info]) => {
                      // Find all layers that also set this property (below this one in priority)
                      const winnerIdx = layers.findIndex(l => l.id === info.layerId);
                      const overrides = layers.slice(0, winnerIdx).filter(l =>
                        l.rules.some(r => r.property === prop && r.value && r.value.trim())
                      );
                      return (
                        <tr key={prop} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-mono text-slate-300">{prop}</td>
                          <td className="px-3 py-2 font-mono">
                            <span className="text-white">{info.value}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono"
                              style={{ backgroundColor: info.color + '20', color: info.color }}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                              @layer {info.layerName}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {overrides.length > 0
                              ? overrides.map(l => (
                                  <span
                                    key={l.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] mr-1"
                                    style={{ backgroundColor: l.color + '15', color: l.color, textDecoration: 'line-through' }}
                                  >
                                    {l.name}
                                  </span>
                                ))
                              : <span className="text-[10px] text-slate-600">(uncontested)</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Layer Editor */}
            {selectedLayer && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    Edit{' '}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono"
                      style={{ backgroundColor: selectedLayer.color + '20', color: selectedLayer.color }}
                    >
                      @layer {selectedLayer.name}
                    </span>
                  </h3>
                  <button
                    onClick={() => addRule(selectedLayer.id)}
                    className="btn-secondary text-[10px] px-2 py-1 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Rule
                  </button>
                </div>

                {selectedLayer.rules.length === 0 ? (
                  <div className="card text-center py-8 text-slate-500 text-xs">
                    No rules in this layer. Click &ldquo;Add Rule&rdquo; to start.
                  </div>
                ) : (
                  <div className="card space-y-3">
                    {selectedLayer.rules.map(rule => {
                      const styleDef = STYLE_PROPERTIES.find(sp => sp.prop === rule.property);
                      const winningInfo = resolvedStyles[rule.property];
                      const isWinning = winningInfo?.layerId === selectedLayer.id;

                      return (
                        <div key={rule.property} className="flex items-center gap-3">
                          {/* Property label */}
                          <label className="text-xs text-slate-400 font-mono w-32 shrink-0 truncate">
                            {rule.property}
                          </label>

                          {/* Value input */}
                          {(!styleDef || styleDef.type === 'text') && (
                            <input
                              type="text"
                              value={rule.value}
                              onChange={(e) => updateRuleValue(selectedLayer.id, rule.property, e.target.value)}
                              className="input-field text-xs py-1.5 px-2 flex-1 min-w-0"
                            />
                          )}
                          {styleDef?.type === 'color' && (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="relative w-7 h-7 shrink-0">
                                <div
                                  className="w-7 h-7 rounded-md border border-slate-600/50"
                                  style={{ backgroundColor: rule.value }}
                                />
                                <input
                                  type="color"
                                  value={rule.value.startsWith('#') ? rule.value : '#ffffff'}
                                  onChange={(e) => updateRuleValue(selectedLayer.id, rule.property, e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </div>
                              <input
                                type="text"
                                value={rule.value}
                                onChange={(e) => updateRuleValue(selectedLayer.id, rule.property, e.target.value)}
                                className="input-field text-xs py-1.5 px-2 flex-1 min-w-0"
                              />
                            </div>
                          )}
                          {styleDef?.type === 'select' && (
                            <select
                              value={rule.value}
                              onChange={(e) => updateRuleValue(selectedLayer.id, rule.property, e.target.value)}
                              className="input-field text-xs py-1.5 px-2 flex-1 min-w-0"
                            >
                              {styleDef.options!.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {/* Win indicator */}
                          <span
                            className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isWinning
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-slate-600 bg-slate-800/50 line-through'
                            }`}
                          >
                            {isWinning ? 'wins' : 'lost'}
                          </span>

                          {/* Remove */}
                          <button
                            onClick={() => removeRule(selectedLayer.id, rule.property)}
                            className="shrink-0 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Generated CSS */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Generated CSS</h3>
          <div className="card">
            <pre className="text-xs text-slate-300 font-mono overflow-x-auto p-0 whitespace-pre">
              {generateLayerCSS(layers) || '/* Add rules to layers to see generated CSS */'}
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
