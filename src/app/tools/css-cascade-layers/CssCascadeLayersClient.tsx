'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Layers, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Eye, EyeOff, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Layer {
  id: string;
  name: string;
  rules: string;
  collapsed: boolean;
  enabled: boolean;
}

interface Preset {
  name: string;
  description: string;
  layers: Layer[];
  html: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let _idCounter = 0;
function uid(): string {
  return `layer-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Classic Reset → Theme → Components',
    description: 'Standard three-layer architecture: reset base styles, define theme tokens, then component-specific overrides.',
    layers: [
      {
        id: 'reset',
        name: 'reset',
        rules: 'button {\n  all: unset;\n  cursor: pointer;\n  padding: 8px 20px;\n  border-radius: 6px;\n}',
        collapsed: false,
        enabled: true,
      },
      {
        id: 'theme',
        name: 'theme',
        rules: 'button {\n  background: #0ea5e9;\n  color: white;\n  font-weight: 600;\n}',
        collapsed: false,
        enabled: true,
      },
      {
        id: 'components',
        name: 'components',
        rules: 'button.danger {\n  background: #ef4444;\n}\n\nbutton.ghost {\n  background: transparent;\n  color: #94a3b8;\n  border: 1px solid #475569;\n}',
        collapsed: false,
        enabled: true,
      },
    ],
    html: `<div class="demo">
  <button>Default</button>
  <button class="danger">Delete</button>
  <button class="ghost">Ghost</button>
</div>`,
  },
  {
    name: 'Specificity Doesn\'t Matter',
    description: 'A weak selector in a later layer beats a strong one in an earlier layer. This is the killer feature of @layer.',
    layers: [
      {
        id: 'base',
        name: 'base',
        rules: '/* This has higher specificity */\ndiv#main p.intro {\n  color: #f97316;\n  font-size: 24px;\n}',
        collapsed: false,
        enabled: true,
      },
      {
        id: 'overrides',
        name: 'overrides',
        rules: '/* This has lower specificity but wins! */\np {\n  color: #38bdf8;\n  font-size: 18px;\n  font-style: italic;\n}',
        collapsed: false,
        enabled: true,
      },
    ],
    html: `<div class="demo" id="main">
  <p class="intro">I should be orange by specificity — but the override layer wins!</p>
</div>`,
  },
  {
    name: 'Framework + Customization',
    description: 'Simulate importing a third-party framework layer, then overriding it with your own custom layer.',
    layers: [
      {
        id: 'framework',
        name: 'framework',
        rules: '.card {\n  background: #1e293b;\n  border: 1px solid #334155;\n  border-radius: 8px;\n  padding: 20px;\n}\n\n.card h3 {\n  color: #f1f5f9;\n  margin-bottom: 8px;\n}\n\n.card p {\n  color: #94a3b8;\n  line-height: 1.6;\n}',
        collapsed: false,
        enabled: true,
      },
      {
        id: 'custom',
        name: 'custom',
        rules: '.card.featured {\n  background: linear-gradient(135deg, #0c4a6e, #075985);\n  border-color: #0ea5e9;\n}\n\n.card.featured h3 {\n  color: #7dd3fc;\n}\n\n.card.featured p {\n  color: #bae6fd;\n}',
        collapsed: false,
        enabled: true,
      },
    ],
    html: `<div class="demo grid-2">
  <div class="card">
    <h3>Standard Card</h3>
    <p>Framework default styles.</p>
  </div>
  <div class="card featured">
    <h3>Featured Card</h3>
    <p>Custom layer overrides framework.</p>
  </div>
</div>`,
  },
  {
    name: 'Dark Mode via Layers',
    description: 'Use layers to organize light/dark theme — base styles in one layer, theme overrides in later layers.',
    layers: [
      {
        id: 'base-theme',
        name: 'base',
        rules: 'body {\n  background: #f8fafc;\n  color: #0f172a;\n  font-family: system-ui, sans-serif;\n  padding: 20px;\n}\n\n.card {\n  background: white;\n  border-radius: 8px;\n  padding: 16px;\n  box-shadow: 0 1px 3px rgba(0,0,0,0.12);\n}',
        collapsed: false,
        enabled: true,
      },
      {
        id: 'dark-theme',
        name: 'dark',
        rules: 'body.dark {\n  background: #0f172a;\n  color: #f1f5f9;\n}\n\nbody.dark .card {\n  background: #1e293b;\n  box-shadow: 0 1px 3px rgba(0,0,0,0.5);\n}',
        collapsed: false,
        enabled: true,
      },
    ],
    html: `<div class="demo">
  <div class="card">
    <strong>Light card</strong>
    <p style="font-size:14px;margin-top:4px;">The base layer sets light theme.</p>
  </div>
  <br />
  <div class="card" style="background:#1e293b;color:#f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,0.5);">
    <strong>Dark card</strong>
    <p style="font-size:14px;margin-top:4px;">The dark layer overrides when body.dark.</p>
  </div>
</div>`,
  },
  {
    name: 'Five-Layer ITCSS',
    description: 'Inverted Triangle CSS: settings → tools → generic → elements → components',
    layers: [
      {
        id: 'settings',
        name: 'settings',
        rules: ':root {\n  --color-primary: #0ea5e9;\n  --color-text: #f1f5f9;\n  --spacing: 16px;\n}',
        collapsed: false,
        enabled: true,
      },
      {
        id: 'generic',
        name: 'generic',
        rules: '*, *::before, *::after {\n  box-sizing: border-box;\n  margin: 0;\n}',
        collapsed: true,
        enabled: true,
      },
      {
        id: 'elements',
        name: 'elements',
        rules: 'a {\n  color: var(--color-primary);\n  text-decoration: none;\n}\n\nh2 {\n  color: var(--color-text);\n  margin-bottom: var(--spacing);\n}',
        collapsed: true,
        enabled: true,
      },
      {
        id: 'objects',
        name: 'objects',
        rules: '.container {\n  max-width: 600px;\n  margin: 0 auto;\n  padding: 0 var(--spacing);\n}',
        collapsed: true,
        enabled: true,
      },
      {
        id: 'components-itcss',
        name: 'components',
        rules: '.btn {\n  display: inline-block;\n  padding: 10px 24px;\n  background: var(--color-primary);\n  color: white;\n  border-radius: 6px;\n  font-weight: 600;\n}\n\n.btn:hover {\n  opacity: 0.9;\n}',
        collapsed: false,
        enabled: true,
      },
    ],
    html: `<div class="demo">
  <h2>ITCSS Demo</h2>
  <p><a href="#">This link</a> uses the elements layer.</p>
  <p style="margin-top:12px;"><span class="btn">Component button</span></p>
  <p style="font-size:13px;color:#64748b;margin-top:8px;">settings → generic → elements → objects → components</p>
</div>`,
  },
  {
    name: 'Unlayered Always Wins',
    description: 'CSS outside any @layer always beats layered styles, regardless of layer order or specificity. Use for one-off overrides.',
    layers: [
      {
        id: 'framework-a',
        name: 'framework',
        rules: '.alert {\n  padding: 12px 16px;\n  border-radius: 6px;\n  background: #1e293b;\n  color: #94a3b8;\n  border-left: 4px solid #475569;\n}',
        collapsed: false,
        enabled: true,
      },
      {
        id: 'custom-override',
        name: 'custom',
        rules: '.alert {\n  background: #172554;\n  border-left-color: #3b82f6;\n  color: #93c5fd;\n}',
        collapsed: false,
        enabled: true,
      },
    ],
    html: `<div class="demo">
  <div class="alert" style="background:#1e293b;border-left:4px solid #f59e0b;color:#fef3c7;padding:12px 16px;border-radius:6px;">
    <strong>⚠ Unlayered alert</strong>
    <p style="font-size:13px;margin-top:4px;">This has unlayered inline styles — beats both layers.</p>
  </div>
  <br />
  <div class="alert">
    <strong>Layered alert</strong>
    <p style="font-size:13px;margin-top:4px;">Only layered styles — custom layer wins over framework.</p>
  </div>
</div>`,
  },
];

// ── Default state ──────────────────────────────────────────────────────────

const DEFAULT_TEXTAREA_ROWS = 3;

function defaultLayers(): Layer[] {
  return [
    {
      id: uid(),
      name: 'base',
      rules: '.box {\n  width: 100px;\n  height: 100px;\n  background: #475569;\n  border-radius: 8px;\n}',
      collapsed: false,
      enabled: true,
    },
    {
      id: uid(),
      name: 'theme',
      rules: '.box {\n  background: #0ea5e9;\n  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);\n}',
      collapsed: false,
      enabled: true,
    },
  ];
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CssCascadeLayersClient() {
  const [layers, setLayers] = useState<Layer[]>(defaultLayers);
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [showOutputTab, setShowOutputTab] = useState<'preview' | 'css'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Derived CSS ──────────────────────────────────────────────────────

  const generatedCSS = useMemo(() => {
    let css = '';
    for (const layer of layers) {
      if (!layer.enabled) continue;
      if (!layer.rules.trim()) continue;
      css += `@layer ${layer.name} {\n`;
      const indented = layer.rules.split('\n').map(line => `  ${line}`).join('\n');
      css += indented + '\n';
      css += '}\n\n';
    }
    return css.trim();
  }, [layers]);

  // ── Preview HTML ─────────────────────────────────────────────────────

  const previewHTML = useMemo(() => {
    const css = generatedCSS;
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #0f172a;
    color: #f1f5f9;
    padding: 24px;
    min-height: 100vh;
  }
  .demo {
    max-width: 560px;
    margin: 0 auto;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

${css.split('\n').map(l => '  ' + l).join('\n')}
</style>
</head>
<body>
  <div class="demo">
    ${(() => {
      // Check if there's a preset selected
      return ''; // We use the preset's html below
    })()}
  </div>
</body>
</html>`;
  }, [generatedCSS]);

  const previewHTMLWithDemo = useMemo(() => {
    let demoHTML = '';
    if (currentPreset) {
      const preset = PRESETS.find(p => p.name === currentPreset);
      if (preset) {
        demoHTML = preset.html;
      }
    } else {
      demoHTML = `<div class="box"></div>
<p style="margin-top:16px;font-size:14px;color:#94a3b8;">The box above gets its styles from the <strong>theme</strong> layer, overriding the <strong>base</strong> layer even if base had higher specificity.</p>`;
    }

    const css = generatedCSS;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #0f172a;
    color: #f1f5f9;
    padding: 24px;
    min-height: 100vh;
  }
  .demo {
    max-width: 560px;
    margin: 0 auto;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  /* ── USER LAYERS ── */

${css}
</style>
</head>
<body>
  ${demoHTML}
</body>
</html>`;
  }, [generatedCSS, currentPreset]);

  // Update iframe when preview changes
  useEffect(() => {
    if (iframeRef.current) {
      const blob = new Blob([previewHTMLWithDemo], { type: 'text/html' });
      iframeRef.current.src = URL.createObjectURL(blob);
    }
  }, [previewHTMLWithDemo]);

  // ── Actions ──────────────────────────────────────────────────────────

  const addLayer = useCallback(() => {
    const newLayer: Layer = {
      id: uid(),
      name: `layer-${layers.length + 1}`,
      rules: '',
      collapsed: false,
      enabled: true,
    };
    setLayers(prev => [...prev, newLayer]);
    setCurrentPreset(null);
  }, [layers.length]);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    setCurrentPreset(null);
  }, []);

  const updateLayer = useCallback((id: string, field: keyof Layer, value: unknown) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    setCurrentPreset(null);
  }, []);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
    setCurrentPreset(null);
  }, []);

  const loadPreset = useCallback((preset: Preset) => {
    // Assign fresh IDs to avoid collisions
    const newLayers = preset.layers.map(lyr => ({
      ...lyr,
      id: uid(),
    }));
    setLayers(newLayers);
    setCurrentPreset(preset.name);
  }, []);

  const reset = useCallback(() => {
    setLayers(defaultLayers());
    setCurrentPreset(null);
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(generatedCSS).then(
      () => toast.success('CSS copied to clipboard!'),
      () => toast.error('Failed to copy.')
    );
  }, [generatedCSS]);

  const toggleLayer = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, collapsed: !l.collapsed } : l));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="CSS Cascade Layers Playground"
      description="Build and test CSS @layer — the Baseline 2025 feature that lets you control the cascade explicitly. Organize styles into ordered layers and see how specificity stops mattering."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Editor ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    currentPreset === p.name
                      ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                      : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-surface-light'
                  }`}
                  title={p.description}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Layer Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Layers ({layers.length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  className="p-1.5 text-slate-400 hover:text-brand-400 transition-colors rounded"
                  title="Reset to default"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={addLayer}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Layer
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  className={`rounded-lg border transition-colors ${
                    layer.enabled
                      ? 'border-slate-600 bg-surface-light'
                      : 'border-slate-700/50 bg-slate-800/30 opacity-60'
                  }`}
                >
                  {/* Layer Header */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    {/* Order indicator */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveLayer(layer.id, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move layer up (earlier in cascade)"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveLayer(layer.id, 'down')}
                        disabled={index === layers.length - 1}
                        className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move layer down (later in cascade)"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-mono text-slate-500 min-w-[24px] text-center">
                      {index + 1}
                    </span>

                    {/* Collapse toggle */}
                    <button
                      onClick={() => toggleCollapse(layer.id)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {layer.collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Layer name input */}
                    <input
                      type="text"
                      value={layer.name}
                      onChange={e => updateLayer(layer.id, 'name', e.target.value)}
                      className="flex-1 bg-transparent text-sm font-mono text-brand-400 outline-none border-b border-transparent focus:border-brand-500/50 px-1 py-0.5"
                      placeholder="layer-name"
                    />

                    {/* Enable/disable toggle */}
                    <button
                      onClick={() => toggleLayer(layer.id)}
                      className={`p-1 rounded transition-colors ${
                        layer.enabled
                          ? 'text-brand-400 hover:text-brand-300'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={layer.enabled ? 'Disable layer' : 'Enable layer'}
                    >
                      {layer.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => removeLayer(layer.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove layer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Layer Body (collapsible) */}
                  {!layer.collapsed && (
                    <div className="px-3 pb-3">
                      <textarea
                        value={layer.rules}
                        onChange={e => updateLayer(layer.id, 'rules', e.target.value)}
                        rows={DEFAULT_TEXTAREA_ROWS}
                        className="w-full bg-slate-900 text-slate-200 font-mono text-xs p-3 rounded-md border border-slate-600 focus:border-brand-500 focus:outline-none resize-none"
                        placeholder={`/* CSS rules for ${layer.name} layer */\n.button {\n  color: red;\n}`}
                        spellCheck={false}
                      />
                    </div>
                  )}

                  {layer.collapsed && layer.rules && (
                    <div className="px-3 pb-2">
                      <p className="text-xs text-slate-500 italic truncate">
                        {layer.rules.split('\n').filter(l => l.trim()).length} rule(s)
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {layers.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No layers defined. Add a layer to start.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Output ──────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-surface-light rounded-lg p-1 border border-slate-600">
            <button
              onClick={() => setShowOutputTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                showOutputTab === 'preview'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setShowOutputTab('css')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                showOutputTab === 'css'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Generated CSS
            </button>
          </div>

          {/* Preview */}
          {showOutputTab === 'preview' && (
            <div className="rounded-lg border border-slate-600 overflow-hidden bg-slate-900">
              <div className="flex items-center justify-between px-3 py-2 bg-surface-light border-b border-slate-600">
                <span className="text-xs text-slate-400 font-medium">Live Preview</span>
                <span className="text-xs text-slate-500">
                  {layers.filter(l => l.enabled).length} active layer(s)
                </span>
              </div>
              <div className="relative" style={{ minHeight: '300px' }}>
                <iframe
                  ref={iframeRef}
                  className="w-full border-0"
                  style={{ height: '400px' }}
                  title="CSS Cascade Layers Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          )}

          {/* CSS Output */}
          {showOutputTab === 'css' && (
            <div className="rounded-lg border border-slate-600 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-surface-light border-b border-slate-600">
                <span className="text-xs text-slate-400 font-medium">Generated CSS</span>
                <button
                  onClick={copyCSS}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-200 font-mono text-xs p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
                {generatedCSS || (
                  <span className="text-slate-500">{'/* Add layers and CSS rules to see output */'}</span>
                )}
              </pre>
            </div>
          )}

          {/* How it works */}
          <div className="rounded-lg border border-slate-600 bg-surface-light/50 p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">How @layer Works</h3>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>
                <span className="text-brand-400 font-semibold">• Layer order matters more than specificity.</span> A weak selector in layer 3 beats a strong one in layer 1.
              </li>
              <li>
                <span className="text-brand-400 font-semibold">• Layers cascade top to bottom.</span> Higher-numbered layers (shown lower in the editor) win.
              </li>
              <li>
                <span className="text-brand-400 font-semibold">• Unlayered styles beat all layers.</span> CSS outside any @layer always wins, regardless of specificity.
              </li>
              <li>
                <span className="text-brand-400 font-semibold">• Baseline 2025</span> — supported in all modern browsers.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
