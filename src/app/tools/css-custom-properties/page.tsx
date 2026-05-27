'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Trash2, Palette, PaintBucket, RotateCcw, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Variable {
  id: string;
  name: string;
  value: string;
  description: string;
}

interface ThemePreset {
  name: string;
  variables: Omit<Variable, 'id'>[];
  previewBg: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_VARIABLES: Variable[] = [
  { id: '1', name: '--color-primary', value: '#3b82f6', description: 'Primary brand color' },
  { id: '2', name: '--color-primary-hover', value: '#2563eb', description: 'Primary hover state' },
  { id: '3', name: '--color-bg', value: '#0f172a', description: 'Page background' },
  { id: '4', name: '--color-surface', value: '#1e293b', description: 'Card/surface background' },
  { id: '5', name: '--color-text', value: '#f8fafc', description: 'Primary text color' },
  { id: '6', name: '--color-text-muted', value: '#94a3b8', description: 'Muted/secondary text' },
  { id: '7', name: '--radius', value: '0.5rem', description: 'Border radius' },
  { id: '8', name: '--spacing', value: '1rem', description: 'Base spacing unit' },
  { id: '9', name: '--shadow', value: '0 4px 6px -1px rgb(0 0 0 / 0.3)', description: 'Box shadow' },
  { id: '10', name: '--font-mono', value: "'Fira Code', monospace", description: 'Monospace font stack' },
];

const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'Dark (Default)',
    variables: DEFAULT_VARIABLES.slice(0, 10).map(({ name, value, description }) => ({ name, value, description })),
    previewBg: '#0f172a',
  },
  {
    name: 'Light',
    variables: [
      { name: '--color-primary', value: '#3b82f6', description: 'Primary brand color' },
      { name: '--color-primary-hover', value: '#2563eb', description: 'Primary hover state' },
      { name: '--color-bg', value: '#ffffff', description: 'Page background' },
      { name: '--color-surface', value: '#f8fafc', description: 'Card/surface background' },
      { name: '--color-text', value: '#0f172a', description: 'Primary text color' },
      { name: '--color-text-muted', value: '#64748b', description: 'Muted/secondary text' },
      { name: '--radius', value: '0.5rem', description: 'Border radius' },
      { name: '--spacing', value: '1rem', description: 'Base spacing unit' },
      { name: '--shadow', value: '0 4px 6px -1px rgb(0 0 0 / 0.1)', description: 'Box shadow' },
      { name: '--font-mono', value: "'Fira Code', monospace", description: 'Monospace font stack' },
    ],
    previewBg: '#ffffff',
  },
  {
    name: 'Cyberpunk',
    variables: [
      { name: '--color-primary', value: '#f0f', description: 'Primary neon magenta' },
      { name: '--color-primary-hover', value: '#d0d', description: 'Primary hover' },
      { name: '--color-bg', value: '#0a0a0a', description: 'Deep black' },
      { name: '--color-surface', value: '#1a1a1a', description: 'Dark surface' },
      { name: '--color-text', value: '#0ff', description: 'Neon cyan text' },
      { name: '--color-text-muted', value: '#088', description: 'Muted cyan' },
      { name: '--radius', value: '0', description: 'Sharp corners' },
      { name: '--spacing', value: '1.25rem', description: 'Base spacing' },
      { name: '--shadow', value: '0 0 20px #f0f', description: 'Neon glow' },
      { name: '--font-mono', value: "'Courier New', monospace", description: 'Terminal font' },
    ],
    previewBg: '#0a0a0a',
  },
  {
    name: 'Nature',
    variables: [
      { name: '--color-primary', value: '#059669', description: 'Forest green' },
      { name: '--color-primary-hover', value: '#047857', description: 'Dark green' },
      { name: '--color-bg', value: '#f0fdf4', description: 'Mint white' },
      { name: '--color-surface', value: '#dcfce7', description: 'Light green surface' },
      { name: '--color-text', value: '#064e3b', description: 'Dark forest text' },
      { name: '--color-text-muted', value: '#047857', description: 'Muted green' },
      { name: '--radius', value: '1rem', description: 'Rounded corners' },
      { name: '--spacing', value: '1.25rem', description: 'Generous spacing' },
      { name: '--shadow', value: '0 4px 12px rgb(5 150 105 / 0.15)', description: 'Green shadow' },
      { name: '--font-mono', value: "'JetBrains Mono', monospace", description: 'Monospace font' },
    ],
    previewBg: '#f0fdf4',
  },
  {
    name: 'Retro Warm',
    variables: [
      { name: '--color-primary', value: '#d97706', description: 'Amber' },
      { name: '--color-primary-hover', value: '#b45309', description: 'Dark amber' },
      { name: '--color-bg', value: '#fef3c7', description: 'Cream background' },
      { name: '--color-surface', value: '#fde68a', description: 'Warm surface' },
      { name: '--color-text', value: '#451a03', description: 'Dark brown text' },
      { name: '--color-text-muted', value: '#78350f', description: 'Muted brown' },
      { name: '--radius', value: '0.25rem', description: 'Subtle rounding' },
      { name: '--spacing', value: '1rem', description: 'Base spacing' },
      { name: '--shadow', value: '3px 3px 0 #451a03', description: 'Hard shadow (retro)' },
      { name: '--font-mono', value: "'IBM Plex Mono', monospace", description: 'Monospace font' },
    ],
    previewBg: '#fef3c7',
  },
];

let nextId = 100;

// ── Helpers ────────────────────────────────────────────────────────────────

function generateCSS(variables: Variable[]): string {
  const lines = [':root {'];
  for (const v of variables) {
    if (v.name.trim() && v.value.trim()) {
      lines.push(`  ${v.name}: ${v.value};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

function generatePreviewCSS(variables: Variable[]): Record<string, string> {
  const style: Record<string, string> = {};
  for (const v of variables) {
    if (v.name.trim() && v.value.trim()) {
      style[v.name] = v.value;
    }
  }
  return style;
}

function generateUsageSnippet(variables: Variable[]): string {
  const primary = variables.find(v => v.name === '--color-primary');
  const bg = variables.find(v => v.name === '--color-bg');
  const text = variables.find(v => v.name === '--color-text');
  const radius = variables.find(v => v.name === '--radius');
  const shadow = variables.find(v => v.name === '--shadow');

  return `.button {
  background: var(${primary?.name || '--color-primary'}, #3b82f6);
  color: var(${text?.name || '--color-text'}, white);
  border-radius: var(${radius?.name || '--radius'}, 0.5rem);
  box-shadow: var(${shadow?.name || '--shadow'}, none);
  padding: var(--spacing, 1rem) calc(var(--spacing, 1rem) * 2);
  border: none;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: opacity 0.2s;
}

.button:hover {
  opacity: 0.9;
}

.card {
  background: var(${bg?.name || '--color-surface'}, #1e293b);
  color: var(${text?.name || '--color-text'}, white);
  border-radius: var(${radius?.name || '--radius'}, 0.5rem);
  box-shadow: var(${shadow?.name || '--shadow'}, none);
  padding: var(--spacing, 1rem);
}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssCustomPropertiesPage() {
  const [variables, setVariables] = useState<Variable[]>(() =>
    DEFAULT_VARIABLES.map(v => ({ ...v }))
  );
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const cssOutput = useMemo(() => generateCSS(variables), [variables]);
  const previewStyle = useMemo(() => generatePreviewCSS(variables), [variables]);
  const usageSnippet = useMemo(() => generateUsageSnippet(variables), [variables]);

  // ── Variable management ──────────────────────────────────────────────────

  const updateVariable = useCallback((id: string, field: 'name' | 'value' | 'description', val: string) => {
    setVariables(prev =>
      prev.map(v => (v.id === id ? { ...v, [field]: val } : v))
    );
  }, []);

  const addVariable = useCallback(() => {
    if (!newName.trim() || !newValue.trim()) return;
    const id = String(++nextId);
    setVariables(prev => [...prev, { id, name: newName.trim(), value: newValue.trim(), description: newDesc.trim() }]);
    setNewName('');
    setNewValue('');
    setNewDesc('');
  }, [newName, newValue, newDesc]);

  const removeVariable = useCallback((id: string) => {
    setVariables(prev => prev.filter(v => v.id !== id));
  }, []);

  const applyPreset = useCallback((preset: ThemePreset) => {
    setVariables(
      preset.variables.map((v, i) => ({
        ...v,
        id: String(++nextId),
      }))
    );
    toast.success(`Applied "${preset.name}" theme`);
  }, []);

  const resetToDefault = useCallback(() => {
    setVariables(DEFAULT_VARIABLES.map(v => ({ ...v })));
    toast.success('Reset to default variables');
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy')
    );
  }, [cssOutput]);

  const copySnippet = useCallback(() => {
    navigator.clipboard.writeText(usageSnippet).then(
      () => toast.success('Usage snippet copied!'),
      () => toast.error('Failed to copy')
    );
  }, [usageSnippet]);

  // Drag-and-drop reorder
  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setVariables(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addVariable();
    }
  }, [addVariable]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Custom Properties Playground"
      description="Define, preview, and export CSS custom properties (variables). Build theme systems, test color schemes, and see live results in real-time."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column — Variable Editor */}
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Theme Presets
            </h3>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {preset.name}
                </button>
              ))}
              <button
                onClick={resetToDefault}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 border border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Add new variable */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Variable
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="--color-accent"
                className="sm:col-span-4 px-3 py-2 text-sm rounded-md bg-slate-900 border border-slate-700 text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono placeholder:text-slate-500"
              />
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="#a855f7"
                className="sm:col-span-4 px-3 py-2 text-sm rounded-md bg-slate-900 border border-slate-700 text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono placeholder:text-slate-500"
              />
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Description (optional)"
                className="sm:col-span-3 px-3 py-2 text-sm rounded-md bg-slate-900 border border-slate-700 text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none placeholder:text-slate-500"
              />
              <button
                onClick={addVariable}
                disabled={!newName.trim() || !newValue.trim()}
                className="sm:col-span-1 px-3 py-2 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Variable list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">
                Variables ({variables.length})
              </h3>
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {variables.map((v, idx) => (
                <div
                  key={v.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    dragIdx === idx
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                  }`}
                >
                  <button
                    className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0"
                    title="Drag to reorder"
                  >
                    <GripHorizontal className="w-4 h-4" />
                  </button>

                  {/* Color swatch */}
                  {v.value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/) && (
                    <div
                      className="w-6 h-6 rounded border border-slate-600 flex-shrink-0"
                      style={{ backgroundColor: v.value }}
                      title={v.value}
                    />
                  )}

                  <input
                    type="text"
                    value={v.name}
                    onChange={e => updateVariable(v.id, 'name', e.target.value)}
                    placeholder="--var-name"
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono rounded bg-slate-900/50 border border-slate-700/50 text-brand-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                  <input
                    type="text"
                    value={v.value}
                    onChange={e => updateVariable(v.id, 'value', e.target.value)}
                    placeholder="value"
                    className="w-32 px-2 py-1.5 text-xs font-mono rounded bg-slate-900/50 border border-slate-700/50 text-green-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                  <button
                    onClick={() => removeVariable(v.id)}
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {variables.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No variables defined. Add one above or apply a preset.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Preview + Output */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <PaintBucket className="w-4 h-4" />
              Live Preview
            </h3>
            <div
              className="rounded-xl border border-slate-700/50 p-8 space-y-4 transition-all duration-300"
              style={previewStyle as React.CSSProperties}
            >
              {/* Button preview */}
              <button
                className="px-4 py-2 font-medium cursor-default"
                style={{
                  backgroundColor: `var(--color-primary, #3b82f6)`,
                  color: `var(--color-text, #fff)`,
                  borderRadius: `var(--radius, 0.5rem)`,
                  boxShadow: `var(--shadow, none)`,
                  fontFamily: `system-ui, sans-serif`,
                }}
              >
                Primary Button
              </button>

              {/* Card preview */}
              <div
                className="p-6 space-y-3"
                style={{
                  backgroundColor: `var(--color-surface, #1e293b)`,
                  color: `var(--color-text, #f8fafc)`,
                  borderRadius: `var(--radius, 0.5rem)`,
                  boxShadow: `var(--shadow, none)`,
                  fontFamily: `system-ui, sans-serif`,
                }}
              >
                <h4 className="text-lg font-bold">Card Title</h4>
                <p className="text-sm" style={{ color: `var(--color-text-muted, #94a3b8)` }}>
                  This card uses your custom properties. Change the variables on the left to see
                  the theme update in real-time.
                </p>
                <code
                  className="block px-3 py-2 rounded text-xs"
                  style={{
                    backgroundColor: `var(--color-bg, #0f172a)`,
                    fontFamily: `var(--font-mono, monospace)`,
                    color: `var(--color-text-muted, #94a3b8)`,
                  }}
                >
                  var(--color-surface)
                </code>
              </div>

              {/* Badge / muted text preview */}
              <div className="flex gap-3">
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: `var(--color-primary, #3b82f6)`,
                    color: 'white',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  Badge
                </span>
                <span
                  className="text-xs"
                  style={{ color: `var(--color-text-muted, #94a3b8)`, fontFamily: 'system-ui, sans-serif' }}
                >
                  muted text
                </span>
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Generated CSS (:root)</h3>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy CSS
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700/50 text-sm font-mono text-green-300 overflow-x-auto max-h-64 overflow-y-auto">
              {cssOutput || '/* No variables defined */'}
            </pre>
          </div>

          {/* Usage Snippet */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Usage Example</h3>
              <button
                onClick={copySnippet}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Snippet
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700/50 text-sm font-mono text-slate-300 overflow-x-auto max-h-64 overflow-y-auto">
              {usageSnippet}
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
