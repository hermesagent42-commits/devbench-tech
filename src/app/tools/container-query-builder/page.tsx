'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Plus, Trash2, Play, Shrink, Maximize2, Columns, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

type ContainerType = 'size' | 'inline-size' | 'normal';
type Axis = 'width' | 'height' | 'inline-size' | 'block-size';
type Comparator = '<' | '<=' | '>' | '>=' | '=';

interface QueryRule {
  id: string;
  axis: Axis;
  comparator: Comparator;
  value: number;
  unit: 'px' | 'rem' | 'em' | 'vw' | 'vh' | '%' | 'ch';
}

interface ContainerDef {
  id: string;
  name: string;
  type: ContainerType;
  rules: QueryRule[];
  showQuery: boolean;
}

let idCounter = 0;
function nextContainerId(): string {
  idCounter += 1;
  return `container-${idCounter}`;
}

let ruleCounter = 0;
function nextRuleId(): string {
  ruleCounter += 1;
  return `rule-${ruleCounter}`;
}

function createRule(overrides: Partial<QueryRule> = {}): QueryRule {
  return {
    id: nextRuleId(),
    axis: 'width',
    comparator: '>=',
    value: 400,
    unit: 'px',
    ...overrides,
  };
}

function createContainer(overrides: Partial<ContainerDef> = {}): ContainerDef {
  const rules = [createRule()];
  return {
    id: nextContainerId(),
    name: 'card',
    type: 'inline-size',
    rules,
    showQuery: true,
    ...overrides,
  };
}

// Example child elements to style
const CHILD_DEMOS = [
  { label: 'Article Card', html: '<article class="card">\n  <h2>A headline</h2>\n  <p>Description here</p>\n  <button>Read more</button>\n</article>' },
  { label: 'Sidebar Nav', html: '<nav class="sidebar">\n  <ul>\n    <li><a href="#">Home</a></li>\n    <li><a href="#">About</a></li>\n    <li><a href="#">Contact</a></li>\n  </ul>\n</nav>' },
  { label: 'Dashboard Grid', html: '<div class="grid">\n  <div class="widget">Stats</div>\n  <div class="widget">Chart</div>\n  <div class="widget">Table</div>\n</div>' },
];

const PRESETS = [
  { name: 'Responsive Card', containers: [createContainer({ name: 'card', type: 'inline-size', rules: [createRule({ axis: 'width', comparator: '>=', value: 500, unit: 'px' })] })] },
  { name: 'Sidebar Collapse', containers: [createContainer({ name: 'sidebar', type: 'inline-size', rules: [createRule({ axis: 'width', comparator: '<=', value: 300, unit: 'px' })] })] },
  { name: 'Multi-Breakpoint Grid', containers: [createContainer({ name: 'grid', type: 'inline-size', rules: [createRule({ axis: 'width', comparator: '>=', value: 900, unit: 'px' }), createRule({ axis: 'width', comparator: '<', value: 900, unit: 'px' })] })] },
  { name: 'Height-Aware Hero', containers: [createContainer({ name: 'hero', type: 'size', rules: [createRule({ axis: 'height', comparator: '>=', value: 400, unit: 'px' })] })] },
];

// Generate container CSS
function generateContainerCSS(container: ContainerDef): string {
  return `.${container.name} {
  container-type: ${container.type};
  container-name: ${container.name}-container;${container.showQuery ? `\n}` : '\n}'}

${container.rules.map((rule, i) => {
    if (container.showQuery) {
      return `${i === 0 ? '' : '\n'}@container ${container.name}-container (${rule.axis} ${rule.comparator} ${rule.value}${rule.unit}) {
  .${container.name} > * {
    /* Style children when container ${rule.axis} ${rule.comparator} ${rule.value}${rule.unit} */
  }
}`;
    }
    return '';
  }).join('\n')}`;
}

// Generate combined CSS for all containers
function generateAllCSS(containers: ContainerDef[]): string {
  const containerDefs = containers.map((c) => `.${c.name} {
  container-type: ${c.type};
  container-name: ${c.name}-container;
}`).join('\n\n');

  const queries = containers.map((c) =>
    c.rules.map((r) =>
      `@container ${c.name}-container (${r.axis} ${r.comparator} ${r.value}${r.unit}) {
  /* @container ${c.name}: ${r.axis} ${r.comparator} ${r.value}${r.unit} */
  .${c.name} {
    /* Your styles here */
  }
}`
    ).join('\n\n')
  ).join('\n\n');

  return `${containerDefs}\n\n${queries}`;
}

export default function ContainerQueryBuilderPage() {
  const [containers, setContainers] = useState<ContainerDef[]>([createContainer()]);
  const [activeContainerId, setActiveContainerId] = useState(containers[0].id);
  const [demoWidth, setDemoWidth] = useState(600);
  const [selectedDemo, setSelectedDemo] = useState(0);
  const [previewMode, setPreviewMode] = useState<'slider' | 'side-by-side'>('slider');

  const activeContainer = containers.find((c) => c.id === activeContainerId) ?? containers[0];

  const updateContainer = useCallback((id: string, updates: Partial<ContainerDef>) => {
    setContainers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const addContainer = useCallback(() => {
    const newContainer = createContainer();
    setContainers((prev) => [...prev, newContainer]);
    setActiveContainerId(newContainer.id);
  }, []);

  const removeContainer = useCallback((id: string) => {
    setContainers((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const fb = createContainer();
        setActiveContainerId(fb.id);
        return [fb];
      }
      if (id === activeContainerId) setActiveContainerId(filtered[0].id);
      return filtered;
    });
  }, [activeContainerId]);

  const addRule = useCallback((containerId: string) => {
    setContainers((prev) => prev.map((c) =>
      c.id === containerId ? { ...c, rules: [...c.rules, createRule()] } : c
    ));
  }, []);

  const removeRule = useCallback((containerId: string, ruleId: string) => {
    setContainers((prev) => prev.map((c) =>
      c.id === containerId ? { ...c, rules: c.rules.filter((r) => r.id !== ruleId) } : c
    ));
  }, []);

  const updateRule = useCallback((containerId: string, ruleId: string, updates: Partial<QueryRule>) => {
    setContainers((prev) => prev.map((c) =>
      c.id === containerId ? { ...c, rules: c.rules.map((r) => r.id === ruleId ? { ...r, ...updates } : r) } : c
    ));
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    const newContainers = preset.containers.map((c) => ({
      ...createContainer(),
      name: c.name,
      type: c.type,
      rules: c.rules.map((r) => createRule({ axis: r.axis, comparator: r.comparator, value: r.value, unit: r.unit })),
    }));
    setContainers(newContainers);
    setActiveContainerId(newContainers[0].id);
  }, []);

  const resetAll = useCallback(() => {
    const c = createContainer();
    setContainers([c]);
    setActiveContainerId(c.id);
    setDemoWidth(600);
  }, []);

  const copyCSS = useCallback(() => {
    const css = generateAllCSS(containers);
    navigator.clipboard.writeText(css).then(
      () => toast.success('Container query CSS copied!'),
      () => toast.error('Copy failed'),
    );
  }, [containers]);

  const allCSS = useMemo(() => generateAllCSS(containers), [containers]);

  // Determine which container query is active at current demo width
  const activeMatches = useMemo(() => {
    return containers.map((c) => {
      const matchingRules = c.rules.filter((r) => {
        const pxValue = r.unit === 'px' ? r.value
          : r.unit === 'rem' ? r.value * 16
          : r.unit === 'em' ? r.value * 16
          : r.unit === 'vw' ? r.value * 0.01 * demoWidth
          : r.unit === '%' ? r.value * 0.01 * demoWidth
          : r.axis === 'width' ? 400 : demoWidth;
        switch (r.comparator) {
          case '>=': return demoWidth >= pxValue;
          case '<=': return demoWidth <= pxValue;
          case '>': return demoWidth > pxValue;
          case '<': return demoWidth < pxValue;
          case '=': return demoWidth === pxValue;
          default: return false;
        }
      });
      return { container: c, matching: matchingRules };
    });
  }, [containers, demoWidth]);

  return (
    <ToolLayout
      title="CSS Container Query Builder"
      description="Visually build container size queries. Set container-type, add range conditions, preview at different widths, and copy production-ready CSS."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Presets</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 text-xs rounded-md bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Container list */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">
                Containers ({containers.length})
              </h2>
              <button
                onClick={addContainer}
                className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {containers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveContainerId(c.id)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    c.id === activeContainerId
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  .{c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active container settings */}
          {activeContainer && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">
                  .{activeContainer.name} Settings
                </h2>
                {containers.length > 1 && (
                  <button
                    onClick={() => removeContainer(activeContainer.id)}
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {/* Container name */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Container Name</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">.</span>
                  <input
                    type="text"
                    value={activeContainer.name}
                    onChange={(e) => updateContainer(activeContainer.id, { name: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                    className="flex-1 bg-surface border border-slate-600/50 rounded-md px-3 py-1.5 text-sm text-white font-mono focus:border-brand-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Container type */}
              <div>
                <label className="text-xs text-slate-400 block mb-2">container-type</label>
                <div className="flex gap-2">
                  {(['inline-size', 'size', 'normal'] as ContainerType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateContainer(activeContainer.id, { type: t })}
                      className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                        activeContainer.type === t
                          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                          : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {activeContainer.type === 'inline-size' && 'Queries inline axis only (width in horizontal writing modes). Most common.'}
                  {activeContainer.type === 'size' && 'Queries both inline and block dimensions.'}
                  {activeContainer.type === 'normal' && 'Not a query container (excludes from container queries).'}
                </p>
              </div>

              {/* Query rules */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400">@container Rules</label>
                  <button
                    onClick={() => addRule(activeContainer.id)}
                    className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Rule
                  </button>
                </div>
                <div className="space-y-3">
                  {activeContainer.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="bg-surface rounded-lg border border-slate-600/30 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-mono">
                          @container ({rule.axis} {rule.comparator} {rule.value}{rule.unit})
                        </span>
                        {activeContainer.rules.length > 1 && (
                          <button
                            onClick={() => removeRule(activeContainer.id, rule.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Axis */}
                        <select
                          value={rule.axis}
                          onChange={(e) => updateRule(activeContainer.id, rule.id, { axis: e.target.value as Axis })}
                          className="bg-slate-800 border border-slate-600/50 rounded-md px-2 py-1.5 text-xs text-white focus:border-brand-500/50 focus:outline-none"
                        >
                          <option value="width">width</option>
                          <option value="height">height</option>
                          <option value="inline-size">inline-size</option>
                          <option value="block-size">block-size</option>
                        </select>

                        {/* Comparator */}
                        <select
                          value={rule.comparator}
                          onChange={(e) => updateRule(activeContainer.id, rule.id, { comparator: e.target.value as Comparator })}
                          className="bg-slate-800 border border-slate-600/50 rounded-md px-2 py-1.5 text-xs text-white focus:border-brand-500/50 focus:outline-none"
                        >
                          <option value=">=">{'>='}</option>
                          <option value=">">{'>'}</option>
                          <option value="<=">{'<='}</option>
                          <option value="<">{'<'}</option>
                          <option value="=">{'='}</option>
                        </select>

                        {/* Unit */}
                        <select
                          value={rule.unit}
                          onChange={(e) => updateRule(activeContainer.id, rule.id, { unit: e.target.value as QueryRule['unit'] })}
                          className="bg-slate-800 border border-slate-600/50 rounded-md px-2 py-1.5 text-xs text-white focus:border-brand-500/50 focus:outline-none"
                        >
                          <option value="px">px</option>
                          <option value="rem">rem</option>
                          <option value="em">em</option>
                          <option value="vw">vw</option>
                          <option value="%">%</option>
                          <option value="ch">ch</option>
                        </select>
                      </div>

                      {/* Value slider + number input */}
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={rule.unit === 'vw' || rule.unit === '%' ? 100 : 1200}
                          value={rule.value}
                          onChange={(e) => updateRule(activeContainer.id, rule.id, { value: Number(e.target.value) })}
                          className="flex-1 accent-brand-500"
                        />
                        <input
                          type="number"
                          min={0}
                          value={rule.value}
                          onChange={(e) => updateRule(activeContainer.id, rule.id, { value: Number(e.target.value) })}
                          className="w-20 bg-surface border border-slate-600/50 rounded-md px-2 py-1 text-xs text-white font-mono text-right focus:border-brand-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Demo selector */}
          <div className="card space-y-3">
            <h2 className="text-white font-semibold text-sm">Demo Content</h2>
            <div className="flex flex-wrap gap-2">
              {CHILD_DEMOS.map((demo, i) => (
                <button
                  key={demo.label}
                  onClick={() => setSelectedDemo(i)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                    i === selectedDemo
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface border border-slate-600/30 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset all
          </button>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-6">
          {/* Width slider */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Container Width</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('slider')}
                  className={`p-1.5 rounded ${previewMode === 'slider' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <GripHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('side-by-side')}
                  className={`p-1.5 rounded ${previewMode === 'side-by-side' ? 'bg-brand-500/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Columns className="w-4 h-4" />
                </button>
              </div>
            </div>

            {previewMode === 'slider' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">200px</span>
                  <input
                    type="range"
                    min={200}
                    max={1000}
                    value={demoWidth}
                    onChange={(e) => setDemoWidth(Number(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-xs text-slate-500">1000px</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-slate-400 font-mono bg-surface px-2 py-0.5 rounded">
                    {demoWidth}px
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1 text-center">Narrow: 320px</div>
                  <div className="min-h-[150px] rounded-lg border border-dashed border-slate-600/50 bg-[#0f172a] p-4"
                    style={{ width: 320 }}
                  >
                    <div className="text-[10px] text-slate-600 mb-1">@container active</div>
                    {activeMatches.filter(m => m.matching.length > 0).map(m =>
                      m.matching.map((r, i) => (
                        <div key={i} className="text-[11px] text-brand-400 font-mono mb-1">
                          .{m.container.name}: {r.axis} {r.comparator} {r.value}{r.unit}
                        </div>
                      ))
                    )}
                    <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-700/50 pt-2 leading-relaxed whitespace-pre-line">
                      {CHILD_DEMOS[selectedDemo].html}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 text-center">Wide: 800px</div>
                  <div className="min-h-[150px] rounded-lg border border-dashed border-slate-600/50 bg-[#0f172a] p-4"
                    style={{ width: 800 }}
                  >
                    <div className="text-[10px] text-slate-600 mb-1">@container active</div>
                    <div className="text-[10px] text-slate-600 mb-1">(simulated at 800px width)</div>
                    <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-700/50 pt-2 leading-relaxed whitespace-pre-line">
                      {CHILD_DEMOS[selectedDemo].html}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-4">Preview at {demoWidth}px</h2>
            <div
              className="min-h-[180px] rounded-lg border border-dashed border-slate-600/50 bg-[#0f172a] p-6 transition-all duration-200 flex flex-col gap-3"
              style={{ maxWidth: demoWidth }}
            >
              {/* Active container queries */}
              <div className="text-[10px] text-slate-500 space-y-0.5">
                {activeMatches.map(({ container, matching }) =>
                  matching.length > 0 ? (
                    <div key={container.id} className="text-brand-400">
                      ✓ .{container.name}: {matching.map(r => `${r.axis} ${r.comparator} ${r.value}${r.unit}`).join(', ')}
                    </div>
                  ) : (
                    <div key={container.id} className="text-slate-600">
                      — .{container.name}: no matches at {demoWidth}px
                    </div>
                  )
                )}
              </div>

              {/* Simulated content */}
              <div className="flex-1 border-t border-slate-700/50 pt-3">
                <div className="text-[11px] text-slate-400 font-mono leading-relaxed whitespace-pre-line">
                  {CHILD_DEMOS[selectedDemo].html}
                </div>
              </div>
            </div>
          </div>

          {/* Rule match indicators */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3">Rule Status at {demoWidth}px</h2>
            <div className="space-y-2">
              {containers.map((c) => (
                c.rules.map((r) => {
                  const pxVal = r.unit === 'px' ? r.value : r.unit === 'rem' ? r.value * 16 : r.unit === 'em' ? r.value * 16 : r.unit === 'vw' ? r.value * 0.01 * demoWidth : r.unit === '%' ? r.value * 0.01 * demoWidth : demoWidth;
                  let matched = false;
                  switch (r.comparator) {
                    case '>=': matched = demoWidth >= pxVal; break;
                    case '<=': matched = demoWidth <= pxVal; break;
                    case '>': matched = demoWidth > pxVal; break;
                    case '<': matched = demoWidth < pxVal; break;
                    case '=': matched = demoWidth === pxVal; break;
                  }
                  return (
                    <div key={r.id} className="flex items-center gap-3 text-xs">
                      <div className={`w-2 h-2 rounded-full ${matched ? 'bg-green-400' : 'bg-slate-600'}`} />
                      <span className="text-slate-400 font-mono flex-1">
                        @container .{c.name} ({r.axis} {r.comparator} {r.value}{r.unit})
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${matched ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/30 text-slate-500'}`}>
                        {matched ? `✓ ${demoWidth}px ${r.comparator} ${pxVal}px` : `✗ ${demoWidth}px ≱ ${pxVal}px`}
                      </span>
                    </div>
                  );
                })
              ))}
            </div>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">CSS Output</h2>
              <button
                onClick={copyCSS}
                className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copy CSS
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-80 overflow-y-auto">
              {allCSS}
            </pre>
          </div>

          {/* Browser support */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">Browser Support</h2>
            <p className="text-xs text-slate-400">
              Container size queries are <span className="text-green-400">Baseline since 2023</span> — supported in Chrome 105+, Safari 16+, Firefox 110+.
              Container style queries are <span className="text-yellow-400">Interop 2026</span> — landing in Firefox 2026.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
