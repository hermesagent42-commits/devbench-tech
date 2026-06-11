'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Plus, Trash2, Play, Palette, Variable, GripHorizontal, Code2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StyleProperty {
  id: string;
  name: string;
  value: string;
}

interface StyleQuery {
  id: string;
  property: string;
  comparator: '=' | '!=' | '<' | '<=' | '>' | '>=';
  value: string;
  childCSS: string;
}

interface ContainerDef {
  id: string;
  name: string;
  properties: StyleProperty[];
  queries: StyleQuery[];
}

interface Preset {
  name: string;
  description: string;
  container: ContainerDef;
}

// ─── ID generators ──────────────────────────────────────────────────────────

let cid = 0;
function nextContainerId() { cid += 1; return `c-${cid}`; }
let pid = 0;
function nextPropId() { pid += 1; return `p-${pid}`; }
let qid = 0;
function nextQueryId() { qid += 1; return `q-${qid}`; }

function createProp(overrides: Partial<StyleProperty> = {}): StyleProperty {
  return { id: nextPropId(), name: '--theme', value: 'light', ...overrides };
}

function createQuery(overrides: Partial<StyleQuery> = {}): StyleQuery {
  return {
    id: nextQueryId(),
    property: '--theme',
    comparator: '=',
    value: 'dark',
    childCSS: 'background: #1e293b;\ncolor: #f1f5f9;',
    ...overrides,
  };
}

function createContainer(overrides: Partial<ContainerDef> = {}): ContainerDef {
  return {
    id: nextContainerId(),
    name: 'card',
    properties: [createProp()],
    queries: [createQuery()],
    ...overrides,
  };
}

// ─── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Theme Switcher',
    description: 'Switch between light and dark themes using --theme custom property',
    container: createContainer({
      name: 'theme-card',
      properties: [
        createProp({ name: '--theme', value: 'light' }),
      ],
      queries: [
        createQuery({
          property: '--theme',
          comparator: '=',
          value: 'light',
          childCSS: 'background: #ffffff;\ncolor: #0f172a;\nborder: 1px solid #e2e8f0;',
        }),
        createQuery({
          property: '--theme',
          comparator: '=',
          value: 'dark',
          childCSS: 'background: #1e293b;\ncolor: #f1f5f9;\nborder: 1px solid #334155;',
        }),
      ],
    }),
  },
  {
    name: 'Layout Variants',
    description: 'Switch between grid and list layouts with --layout property',
    container: createContainer({
      name: 'layout-container',
      properties: [
        createProp({ name: '--layout', value: 'grid' }),
      ],
      queries: [
        createQuery({
          property: '--layout',
          comparator: '=',
          value: 'grid',
          childCSS: 'display: grid;\ngrid-template-columns: repeat(3, 1fr);\ngap: 1rem;',
        }),
        createQuery({
          property: '--layout',
          comparator: '=',
          value: 'list',
          childCSS: 'display: flex;\nflex-direction: column;\ngap: 0.5rem;',
        }),
      ],
    }),
  },
  {
    name: 'Component Size',
    description: 'Adjust padding and font size based on --density property',
    container: createContainer({
      name: 'density-box',
      properties: [
        createProp({ name: '--density', value: 'comfortable' }),
      ],
      queries: [
        createQuery({
          property: '--density',
          comparator: '=',
          value: 'compact',
          childCSS: 'padding: 0.5rem;\nfont-size: 0.875rem;\ngap: 0.25rem;',
        }),
        createQuery({
          property: '--density',
          comparator: '=',
          value: 'comfortable',
          childCSS: 'padding: 1rem;\nfont-size: 1rem;\ngap: 0.5rem;',
        }),
        createQuery({
          property: '--density',
          comparator: '=',
          value: 'spacious',
          childCSS: 'padding: 1.5rem;\nfont-size: 1.125rem;\ngap: 1rem;',
        }),
      ],
    }),
  },
  {
    name: 'Status Badge',
    description: 'Change badge colors based on --status (success/warning/error/info)',
    container: createContainer({
      name: 'status-badge',
      properties: [
        createProp({ name: '--status', value: 'success' }),
      ],
      queries: [
        createQuery({
          property: '--status',
          comparator: '=',
          value: 'success',
          childCSS: 'background: #16a34a;\ncolor: white;',
        }),
        createQuery({
          property: '--status',
          comparator: '=',
          value: 'warning',
          childCSS: 'background: #d97706;\ncolor: white;',
        }),
        createQuery({
          property: '--status',
          comparator: '=',
          value: 'error',
          childCSS: 'background: #dc2626;\ncolor: white;',
        }),
        createQuery({
          property: '--status',
          comparator: '=',
          value: 'info',
          childCSS: 'background: #2563eb;\ncolor: white;',
        }),
      ],
    }),
  },
  {
    name: 'Numeric Range',
    description: 'Style changes when --columns >= 3 (numeric comparison)',
    container: createContainer({
      name: 'columns-box',
      properties: [
        createProp({ name: '--columns', value: '2' }),
      ],
      queries: [
        createQuery({
          property: '--columns',
          comparator: '>=',
          value: '3',
          childCSS: 'display: grid;\ngrid-template-columns: repeat(3, 1fr);\ngap: 1rem;',
        }),
        createQuery({
          property: '--columns',
          comparator: '<',
          value: '3',
          childCSS: 'display: flex;\nflex-direction: column;\ngap: 0.5rem;',
        }),
      ],
    }),
  },
  {
    name: 'Boolean Toggle',
    description: 'Toggle styles with --active: true / false',
    container: createContainer({
      name: 'toggle-card',
      properties: [
        createProp({ name: '--active', value: 'false' }),
      ],
      queries: [
        createQuery({
          property: '--active',
          comparator: '=',
          value: 'true',
          childCSS: 'background: #7c3aed;\ncolor: white;\ntransform: scale(1.02);\nbox-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);',
        }),
        createQuery({
          property: '--active',
          comparator: '=',
          value: 'false',
          childCSS: 'background: #f1f5f9;\ncolor: #475569;\ntransform: scale(1);\nbox-shadow: 0 1px 3px rgba(0,0,0,0.1);',
        }),
      ],
    }),
  },
];

// ─── Child demo items ───────────────────────────────────────────────────────

const CHILD_DEMOS = [
  { label: 'Card', html: '<div class="child-card">\n  <h3>Title</h3>\n  <p>Description text here</p>\n</div>' },
  { label: 'Badge', html: '<span class="child-badge">Status</span>' },
  { label: 'Grid Items', html: '<div class="child-grid">\n  <div class="item">A</div>\n  <div class="item">B</div>\n  <div class="item">C</div>\n</div>' },
];

// ─── CSS Generation ─────────────────────────────────────────────────────────

function generateContainerCSS(container: ContainerDef): string {
  const lines: string[] = [];
  lines.push(`.${container.name} {`);
  lines.push(`  container-type: inline-size;`);
  for (const prop of container.properties) {
    lines.push(`  ${prop.name}: ${prop.value};`);
  }
  lines.push(`}`);
  lines.push(``);

  for (const query of container.queries) {
    const styleCondition = `style(${query.property}: ${query.value})`;
    lines.push(`@container ${styleCondition} {`);
    const childLines = query.childCSS.split('\n').filter(l => l.trim());
    for (const line of childLines) {
      lines.push(`  .child {`);
      lines.push(`    ${line.trim()}`);
      lines.push(`  }`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  return lines.join('\n');
}

function generateFullCSS(container: ContainerDef): string {
  const lines: string[] = [];
  // Container setup
  lines.push(`/* Container definition */`);
  lines.push(`.${container.name} {`);
  lines.push(`  container-type: inline-size;`);
  for (const prop of container.properties) {
    lines.push(`  ${prop.name}: ${prop.value};`);
  }
  lines.push(`}`);
  lines.push(``);

  // Default child styles
  lines.push(`/* Default child styles */`);
  lines.push(`.${container.name} .child {`);
  lines.push(`  padding: 1rem;`);
  lines.push(`  border-radius: 0.5rem;`);
  lines.push(`  transition: all 0.3s ease;`);
  lines.push(`}`);
  lines.push(``);

  // Style queries
  lines.push(`/* Container style queries */`);
  for (const query of container.queries) {
    const styleCondition = `style(${query.property}: ${query.value})`;
    lines.push(`@container ${styleCondition} {`);
    const childLines = query.childCSS.split('\n').filter(l => l.trim());
    for (const line of childLines) {
      lines.push(`  .child {`);
      lines.push(`    ${line.trim()}`);
      lines.push(`  }`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  return lines.join('\n');
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContainerStyleQueriesPage() {
  const [container, setContainer] = useState<ContainerDef>(() => createContainer({
    name: 'demo-container',
    properties: [
      createProp({ name: '--theme', value: 'light' }),
    ],
    queries: [
      createQuery({
        property: '--theme',
        comparator: '=',
        value: 'light',
        childCSS: 'background: #ffffff;\ncolor: #0f172a;\nborder: 1px solid #e2e8f0;',
      }),
      createQuery({
        property: '--theme',
        comparator: '=',
        value: 'dark',
        childCSS: 'background: #1e293b;\ncolor: #f1f5f9;\nborder: 1px solid #334155;',
      }),
    ],
  }));
  const [activeChildDemo, setActiveChildDemo] = useState(CHILD_DEMOS[0].label);
  const [showPreview, setShowPreview] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Property management ──────────────────────────────────────────────────

  const addProperty = useCallback(() => {
    setContainer(prev => ({
      ...prev,
      properties: [...prev.properties, createProp()],
    }));
  }, []);

  const updateProperty = useCallback((id: string, field: 'name' | 'value', val: string) => {
    setContainer(prev => ({
      ...prev,
      properties: prev.properties.map(p =>
        p.id === id ? { ...p, [field]: val } : p
      ),
    }));
  }, []);

  const removeProperty = useCallback((id: string) => {
    setContainer(prev => ({
      ...prev,
      properties: prev.properties.filter(p => p.id !== id),
    }));
  }, []);

  // ── Query management ─────────────────────────────────────────────────────

  const addQuery = useCallback(() => {
    setContainer(prev => ({
      ...prev,
      queries: [...prev.queries, createQuery()],
    }));
  }, []);

  const updateQuery = useCallback((id: string, field: keyof StyleQuery, val: string) => {
    setContainer(prev => ({
      ...prev,
      queries: prev.queries.map(q =>
        q.id === id ? { ...q, [field]: val } : q
      ),
    }));
  }, []);

  const removeQuery = useCallback((id: string) => {
    setContainer(prev => ({
      ...prev,
      queries: prev.queries.filter(q => q.id !== id),
    }));
  }, []);

  // ── Preset loading ───────────────────────────────────────────────────────

  const loadPreset = useCallback((preset: Preset) => {
    setContainer(JSON.parse(JSON.stringify(preset.container)));
  }, []);

  // ── Copy ─────────────────────────────────────────────────────────────────

  const copyCSS = useCallback(() => {
    const css = generateFullCSS(container);
    navigator.clipboard.writeText(css).then(() => {
      toast.success('CSS copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, [container]);

  const reset = useCallback(() => {
    setContainer(createContainer({
      name: 'demo-container',
      properties: [createProp({ name: '--theme', value: 'light' })],
      queries: [
        createQuery({ property: '--theme', comparator: '=', value: 'light', childCSS: 'background: #ffffff;\ncolor: #0f172a;\nborder: 1px solid #e2e8f0;' }),
        createQuery({ property: '--theme', comparator: '=', value: 'dark', childCSS: 'background: #1e293b;\ncolor: #f1f5f9;\nborder: 1px solid #334155;' }),
      ],
    }));
  }, []);

  // ── Preview CSS injection ────────────────────────────────────────────────

  const previewCSS = useMemo(() => {
    return generateContainerCSS(container);
  }, [container]);

  useEffect(() => {
    if (!previewRef.current) return;
    // Remove old style
    const oldStyle = previewRef.current.querySelector('style[data-preview]');
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.setAttribute('data-preview', 'true');
    style.textContent = previewCSS;
    previewRef.current.appendChild(style);
  }, [previewCSS]);

  // ── Active property value for the preview ────────────────────────────────

  const [activePropValues, setActivePropValues] = useState<Record<string, string>>({});

  // Sync active values when container properties change
  useEffect(() => {
    const values: Record<string, string> = {};
    for (const prop of container.properties) {
      values[prop.id] = prop.value;
    }
    setActivePropValues(values);
  }, [container.properties]);

  const setPropValue = useCallback((propId: string, value: string) => {
    setActivePropValues(prev => ({ ...prev, [propId]: value }));
  }, []);

  // Build inline style for the preview container
  const containerInlineStyle = useMemo(() => {
    const styles: string[] = [];
    for (const prop of container.properties) {
      const val = activePropValues[prop.id] ?? prop.value;
      styles.push(`${prop.name}: ${val}`);
    }
    return styles.join('; ');
  }, [container.properties, activePropValues]);

  // ── Determine which query matches ────────────────────────────────────────

  const matchingQuery = useMemo(() => {
    for (const query of container.queries) {
      const prop = container.properties.find(p => p.name === query.property);
      if (!prop) continue;
      const currentVal = activePropValues[prop.id] ?? prop.value;

      // Try numeric comparison
      const numCurrent = parseFloat(currentVal);
      const numQuery = parseFloat(query.value);
      const isNumeric = !isNaN(numCurrent) && !isNaN(numQuery);

      if (isNumeric) {
        switch (query.comparator) {
          case '=': if (numCurrent === numQuery) return query; break;
          case '!=': if (numCurrent !== numQuery) return query; break;
          case '<': if (numCurrent < numQuery) return query; break;
          case '<=': if (numCurrent <= numQuery) return query; break;
          case '>': if (numCurrent > numQuery) return query; break;
          case '>=': if (numCurrent >= numQuery) return query; break;
        }
      } else {
        // String comparison
        switch (query.comparator) {
          case '=': if (currentVal === query.value) return query; break;
          case '!=': if (currentVal !== query.value) return query; break;
        }
      }
    }
    return null;
  }, [container, activePropValues]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Container Style Queries Playground"
      description="Visually build @container style() queries — the new way to style children based on container custom properties. Switch themes, layouts, and component states without a single class name."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1">Presets:</span>
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => loadPreset(p)}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-700/50 hover:bg-brand-500/20 hover:text-brand-300 text-slate-300 border border-slate-600/50 transition-colors"
              title={p.description}
            >
              {p.name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowPreview(v => !v)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1.5 ${
                showPreview
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? 'Preview On' : 'Preview Off'}
            </button>
            <button
              onClick={copyCSS}
              className="px-2.5 py-1 text-xs rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy CSS
            </button>
            <button
              onClick={reset}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Editor ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Container name */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Container Name
            </label>
            <input
              type="text"
              value={container.name}
              onChange={e => setContainer(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-sm font-mono focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
              placeholder="my-container"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              This becomes the CSS class name. Container type is set to <code className="text-brand-400">inline-size</code> automatically.
            </p>
          </div>

          {/* Custom Properties */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Variable className="w-4 h-4 text-brand-400" />
                Custom Properties
              </h3>
              <button
                onClick={addProperty}
                className="px-2 py-1 text-xs rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Define CSS custom properties on the container. These are what your <code className="text-brand-400">@container style()</code> queries will check.
            </p>
            <div className="space-y-2">
              {container.properties.map(prop => (
                <div key={prop.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={prop.name}
                    onChange={e => updateProperty(prop.id, 'name', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-500/50"
                    placeholder="--my-prop"
                  />
                  <span className="text-slate-500 text-xs">:</span>
                  <input
                    type="text"
                    value={prop.value}
                    onChange={e => updateProperty(prop.id, 'value', e.target.value)}
                    className="w-28 px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-500/50"
                    placeholder="value"
                  />
                  <button
                    onClick={() => removeProperty(prop.id)}
                    className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove property"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {container.properties.length === 0 && (
                <p className="text-xs text-slate-600 italic">No properties defined. Add one to start.</p>
              )}
            </div>
          </div>

          {/* Style Queries */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                @container style() Queries
              </h3>
              <button
                onClick={addQuery}
                className="px-2 py-1 text-xs rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Query
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Each query defines a condition and the CSS to apply to children when it matches. The first matching query wins (cascade order).
            </p>
            <div className="space-y-4">
              {container.queries.map((query, idx) => (
                <div key={query.id} className="p-3 rounded-md bg-slate-800/50 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Query #{idx + 1}</span>
                    <button
                      onClick={() => removeQuery(query.id)}
                      className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove query"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Condition row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-slate-500 font-mono">@container style(</span>
                    <select
                      value={query.property}
                      onChange={e => updateQuery(query.id, 'property', e.target.value)}
                      className="px-2 py-1 rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-500/50"
                    >
                      {container.properties.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                      {container.properties.length === 0 && (
                        <option value="">--no-props</option>
                      )}
                    </select>
                    <select
                      value={query.comparator}
                      onChange={e => updateQuery(query.id, 'comparator', e.target.value)}
                      className="px-2 py-1 rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-500/50"
                    >
                      <option value="=">=</option>
                      <option value="!=">!=</option>
                      <option value="<">&lt;</option>
                      <option value="<=">&lt;=</option>
                      <option value=">">&gt;</option>
                      <option value=">=">&gt;=</option>
                    </select>
                    <input
                      type="text"
                      value={query.value}
                      onChange={e => updateQuery(query.id, 'value', e.target.value)}
                      className="w-24 px-2 py-1 rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-500/50"
                      placeholder="value"
                    />
                    <span className="text-xs text-slate-500 font-mono">)</span>
                  </div>

                  {/* Child CSS */}
                  <label className="block text-xs text-slate-500 mb-1">Child CSS to apply:</label>
                  <textarea
                    value={query.childCSS}
                    onChange={e => updateQuery(query.id, 'childCSS', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-xs font-mono focus:outline-none focus:border-brand-500/50 resize-y"
                    placeholder="background: red;\ncolor: white;"
                    spellCheck={false}
                  />
                </div>
              ))}
              {container.queries.length === 0 && (
                <p className="text-xs text-slate-600 italic">No queries defined. Add one to start.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Preview ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Live Preview */}
          {showPreview && (
            <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-400" />
                  Live Preview
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Child demo:</span>
                  <select
                    value={activeChildDemo}
                    onChange={e => setActiveChildDemo(e.target.value)}
                    className="px-2 py-1 text-xs rounded-md bg-slate-700 border border-slate-600 text-slate-200 focus:outline-none"
                  >
                    {CHILD_DEMOS.map(d => (
                      <option key={d.label} value={d.label}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Property value toggles */}
              <div className="mb-3 p-3 rounded-md bg-slate-800/50 border border-slate-700/30">
                <p className="text-xs text-slate-500 mb-2">Toggle property values to see queries activate:</p>
                <div className="flex flex-wrap gap-2">
                  {container.properties.map(prop => {
                    const currentVal = activePropValues[prop.id] ?? prop.value;
                    // Collect all unique values from queries targeting this property
                    const queryValues = container.queries
                      .filter(q => q.property === prop.name)
                      .map(q => q.value);
                    const uniqueValues = [...new Set([prop.value, ...queryValues])];

                    return (
                      <div key={prop.id} className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-mono">{prop.name}:</span>
                        <select
                          value={currentVal}
                          onChange={e => setPropValue(prop.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded-md bg-slate-700 border border-slate-600 text-slate-200 font-mono focus:outline-none"
                        >
                          {uniqueValues.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The actual preview */}
              <div
                ref={previewRef}
                className="rounded-lg border-2 border-dashed border-slate-600 p-4 min-h-[200px] transition-all"
                style={{ containerType: 'inline-size', containerName: container.name } as React.CSSProperties}
              >
                <div
                  className={`${container.name} rounded-lg p-4`}
                  style={{ [containerInlineStyle.split(';')[0]?.split(':')[0] ?? '']: '' } as React.CSSProperties}
                >
                  {/* Inject inline style for custom properties */}
                  <div
                    className="child rounded-lg p-4 transition-all duration-300"
                    style={{
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {activeChildDemo === 'Card' && (
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Title</h3>
                        <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>Description text here</p>
                      </div>
                    )}
                    {activeChildDemo === 'Badge' && (
                      <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 500 }}>
                        Status
                      </span>
                    )}
                    {activeChildDemo === 'Grid Items' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="item" style={{ padding: '0.5rem', borderRadius: '0.25rem', textAlign: 'center' }}>A</div>
                        <div className="item" style={{ padding: '0.5rem', borderRadius: '0.25rem', textAlign: 'center' }}>B</div>
                        <div className="item" style={{ padding: '0.5rem', borderRadius: '0.25rem', textAlign: 'center' }}>C</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active query indicator */}
              <div className="mt-3 p-2.5 rounded-md bg-slate-800/50 border border-slate-700/30">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${matchingQuery ? 'bg-green-400' : 'bg-slate-600'}`} />
                  <span className="text-xs text-slate-400">
                    {matchingQuery
                      ? <><span className="text-green-400 font-semibold">Active query:</span> <code className="text-brand-300 font-mono">@container style({matchingQuery.property}: {matchingQuery.value})</code></>
                      : <span className="text-slate-500">No query matches current property values</span>
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Generated CSS */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                Generated CSS
              </h3>
              <button
                onClick={copyCSS}
                className="px-2 py-1 text-xs rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="p-3 rounded-md bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre">
              <code>{generateFullCSS(container)}</code>
            </pre>
          </div>

          {/* How it works */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Palette className="w-4 h-4 text-brand-400" />
              How Container Style Queries Work
            </h3>
            <div className="text-xs text-slate-400 space-y-2">
              <p>
                <strong className="text-slate-300">@container style()</strong> queries let you style children based on the <em>computed values</em> of custom properties on a container element — not its size.
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Set <code className="text-brand-400">container-type: inline-size</code> (or <code className="text-brand-400">size</code>) on the parent</li>
                <li>Define custom properties on the container (e.g., <code className="text-brand-400">--theme: dark</code>)</li>
                <li>Write <code className="text-brand-400">@container style(--theme: dark) {'{ ... }'}</code> to apply styles when the property matches</li>
              </ol>
              <p className="text-slate-500 mt-2">
                <strong>Browser support:</strong> Baseline 2025 — Chrome 111+, Edge 111+, Safari 18.2+, Firefox 135+. Available in all modern browsers.
              </p>
              <p className="text-slate-500">
                <strong>Use cases:</strong> Theme switching without class toggling, component variants driven by data attributes mapped to custom properties, density/spacing presets, and any state-driven styling that avoids className soup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
