'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Plus, Trash2, Play, RefreshCw, Sparkles, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Property {
  id: number;
  name: string;
  syntax: string;
  inherits: boolean;
  initialValue: string;
}

const SYNTAX_TYPES = [
  '<length>',
  '<percentage>',
  '<length-percentage>',
  '<number>',
  '<integer>',
  '<color>',
  '<angle>',
  '<time>',
  '<resolution>',
  '<transform-function>',
  '<custom-ident>',
  '<string>',
  '<url>',
  '<image>',
  '<position>',
];

const SAMPLES: { label: string; properties: Property[] }[] = [
  {
    label: 'Progress Bar Animation',
    properties: [
      { id: 1, name: '--progress', syntax: '<percentage>', inherits: false, initialValue: '0%' },
    ],
  },
  {
    label: 'Color Theming',
    properties: [
      { id: 1, name: '--color-primary', syntax: '<color>', inherits: true, initialValue: '#3b82f6' },
      { id: 2, name: '--color-accent', syntax: '<color>', inherits: true, initialValue: '#f59e0b' },
      { id: 3, name: '--spacing-unit', syntax: '<length>', inherits: false, initialValue: '8px' },
    ],
  },
  {
    label: 'Gradient Sweep',
    properties: [
      { id: 1, name: '--gradient-angle', syntax: '<angle>', inherits: false, initialValue: '0deg' },
      { id: 2, name: '--gradient-color-1', syntax: '<color>', inherits: false, initialValue: '#06b6d4' },
      { id: 3, name: '--gradient-color-2', syntax: '<color>', inherits: false, initialValue: '#8b5cf6' },
    ],
  },
  {
    label: 'Fade In/Out',
    properties: [
      { id: 1, name: '--opacity', syntax: '<number>', inherits: false, initialValue: '0' },
    ],
  },
  {
    label: 'Transform Combo',
    properties: [
      { id: 1, name: '--rotate', syntax: '<angle>', inherits: false, initialValue: '0deg' },
      { id: 2, name: '--scale', syntax: '<number>', inherits: false, initialValue: '1' },
      { id: 3, name: '--translate-x', syntax: '<length>', inherits: false, initialValue: '0px' },
    ],
  },
];

function generateCSS(props: Property[]): string {
  const valid = props.filter((p) => p.name.trim());
  if (valid.length === 0) return '/* Add a property above to see generated CSS */';

  const rules: string[] = [];
  const animatedVars: string[] = [];

  for (const p of valid) {
    const cleanName = p.name.startsWith('--') ? p.name : '--' + p.name;
    rules.push(`@property ${cleanName} {
  syntax: "${p.syntax}";
  inherits: ${p.inherits};
  initial-value: ${p.initialValue};
}`);
    animatedVars.push(cleanName);
  }

  if (animatedVars.length > 0) {
    rules.push(`
.example {
${animatedVars.map((v) => `  ${v}: ${valid.find((p) => '--' + p.name === v || p.name === v)?.initialValue || 'initial'};`).join('\n')}
  transition: ${animatedVars.join(', ')} 0.3s ease;
}

.example:hover {
${animatedVars.map((v) => `  ${v}: /* hover value */;`).join('\n')}
}`);
  }

  // Keyframe example
  rules.push(`
/* Animation example */
@keyframes animate {
  to {
${animatedVars.map((v) => `    ${v}: /* target value */;`).join('\n')}
  }
}

.animated {
  animation: animate 2s ease-in-out infinite alternate;
}`);

  return rules.join('\n');
}

function generateAnimationCSS(props: Property[]): string {
  const valid = props.filter((p) => p.name.trim());
  if (valid.length === 0) return '';
  const varName = '--' + valid[0].name.replace(/^--/, '');

  return `.animated-box {
  ${varName}: ${valid[0].initialValue};
  animation: property-demo 2s ease-in-out infinite alternate;
}

@keyframes property-demo {
  to {
    ${varName}: ${getTargetValue(valid[0])};
  }
}`;
}

function getTargetValue(prop: Property): string {
  switch (prop.syntax) {
    case '<percentage>': return '100%';
    case '<length>': return '200px';
    case '<number>': return '1';
    case '<angle>': return '360deg';
    case '<time>': return '2s';
    case '<color>': return '#f59e0b';
    default: return prop.initialValue;
  }
}

export default function CssAtPropertyPage() {
  const [properties, setProperties] = useState<Property[]>(SAMPLES[0].properties);
  const [idCounter, setIdCounter] = useState(3);
  const [activeTab, setActiveTab] = useState<'css' | 'preview'>('css');
  const [animate, setAnimate] = useState(false);

  const addProperty = useCallback(() => {
    const newId = idCounter + 1;
    setIdCounter(newId);
    setProperties((prev) => [
      ...prev,
      { id: newId, name: '', syntax: '<color>', inherits: false, initialValue: '' },
    ]);
  }, [idCounter]);

  const updateProperty = useCallback(
    (id: number, field: keyof Property, value: string | boolean) => {
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  const removeProperty = useCallback((id: number) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const loadSample = useCallback((sample: (typeof SAMPLES)[0]) => {
    setProperties(sample.properties);
    setIdCounter(sample.properties.length);
    setAnimate(false);
  }, []);

  const css = useMemo(() => generateCSS(properties), [properties]);
  const animationCSS = useMemo(() => generateAnimationCSS(properties), [properties]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Copy failed')
    );
  }, [css]);

  const firstProperty = properties.find((p) => p.name.trim());
  const demoVarName = firstProperty ? '--' + firstProperty.name.replace(/^--/, '') : '--demo-prop';

  const demoStyle = firstProperty
    ? {
        [demoVarName]: animate
          ? getTargetValue(firstProperty)
          : (firstProperty.initialValue || firstProperty.syntax === '<percentage>' ? '0%' : 'initial'),
      } as React.CSSProperties
    : {};

  return (
    <ToolLayout
      title="CSS @property Playground"
      description="Define typed CSS custom properties with the @property at-rule — syntax checking, inheritance control, animation support. Visualize with live preview, generate production-ready CSS."
    >
      <style>{`
        .animated-box {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-accent, #f59e0b));
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .animated-box.animating {
          animation: property-demo 2s ease-in-out infinite alternate;
        }
        .progress-bar {
          width: var(--progress, 0%);
          height: 24px;
          background: linear-gradient(90deg, #06b6d4, #8b5cf6);
          border-radius: 12px;
          transition: width 0.3s ease;
        }
        .progress-bar.animating {
          animation: progress-anim 2s ease-in-out infinite alternate;
        }
        @keyframes progress-anim {
          to { width: var(--progress-target, 100%); }
        }
      `}</style>

      {/* Sample picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            onClick={() => loadSample(s)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700/50
                       hover:text-brand-400 hover:border-brand-500/40 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Property Builder + CSS Output */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Left: Property Builder */}
        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            Properties
          </h3>

          <div className="space-y-3">
            {properties.map((prop) => (
              <div
                key={prop.id}
                className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={prop.name}
                    onChange={(e) => updateProperty(prop.id, 'name', e.target.value)}
                    placeholder="property-name"
                    className="flex-[2] bg-slate-900 text-brand-400 text-sm rounded-lg px-3 py-2 border border-slate-700
                               focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20
                               placeholder-slate-600 transition-colors font-mono"
                  />
                  <select
                    value={prop.syntax}
                    onChange={(e) => updateProperty(prop.id, 'syntax', e.target.value)}
                    className="flex-1 bg-slate-900 text-slate-300 text-sm rounded-lg px-3 py-2 border border-slate-700
                               focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20
                               transition-colors"
                  >
                    {SYNTAX_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeProperty(prop.id)}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={prop.initialValue}
                    onChange={(e) => updateProperty(prop.id, 'initialValue', e.target.value)}
                    placeholder="Initial value"
                    className="flex-1 bg-slate-900 text-slate-300 text-sm rounded-lg px-3 py-2 border border-slate-700
                               focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20
                               placeholder-slate-600 transition-colors font-mono"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <input
                      type="checkbox"
                      checked={prop.inherits}
                      onChange={(e) => updateProperty(prop.id, 'inherits', e.target.checked)}
                      className="rounded bg-slate-700 border-slate-600"
                    />
                    Inherits
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addProperty}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-brand-500/10 text-brand-400
                       border border-brand-500/20 hover:bg-brand-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Property
          </button>
        </div>

        {/* Right: Generated CSS */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <CodeIcon />
              Generated CSS
            </h3>
            <button
              onClick={copyCSS}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300
                         border border-slate-600/30 hover:bg-slate-700 hover:text-slate-100 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <pre className="text-xs text-slate-300 bg-slate-900 rounded-lg p-4 border border-slate-700 overflow-auto max-h-[400px] font-mono leading-relaxed">
            <code className="code-block">{css}</code>
          </pre>
        </div>
      </div>

      {/* Live Preview */}
      <div className="p-6 rounded-xl bg-slate-800/20 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-400" />
            Live Preview
          </h3>
          <button
            onClick={() => setAnimate(!animate)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              animate
                ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                : 'bg-slate-700/50 text-slate-300 border-slate-600/30 hover:bg-slate-700'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            {animate ? 'Animating' : 'Animate'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-8 justify-center min-h-[180px]">
          {/* Box with animation */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-2">
              {firstProperty?.name || '--property'}
            </p>
            <div
              className={`animated-box ${animate ? 'animating' : ''}`}
              style={demoStyle}
            />
            <p className="text-xs text-slate-600 mt-2">
              {animate
                ? getTargetValue(firstProperty || properties[0])
                : firstProperty?.initialValue || '0%'}
            </p>
          </div>

          {/* Progress bar example (if percentage property found) */}
          {properties.some((p) => p.syntax === '<percentage>' && p.name.trim()) && (
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-2">Progress</p>
              <div className="w-48 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`progress-bar ${animate ? 'animating' : ''}`}
                  style={
                    {
                      '--progress': animate ? undefined : properties.find((p) => p.syntax === '<percentage>' && p.name.trim())?.initialValue || '0%',
                      '--progress-target': '100%',
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          )}

          {!firstProperty && (
            <p className="text-slate-500 text-sm">
              Add a property above to see the live preview
            </p>
          )}
        </div>
      </div>

      {/* Documentation Quick Reference */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-brand-400" />
          @property Quick Reference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'Why @property?',
              desc: 'Typed CSS custom properties enable smooth animations between values that were previously impossible — like colors, gradients, and transforms.',
            },
            {
              title: 'Browser Support',
              desc: 'Baseline 2025 — fully supported in all modern browsers. No polyfills needed for production use.',
            },
            {
              title: 'Syntax Types',
              desc: 'Use MDN-supported syntax strings: <color>, <length>, <percentage>, <angle>, <time>, <number>, <transform-function>, and more.',
            },
            {
              title: 'Animation',
              desc: 'The browser can interpolate typed properties smoothly in @keyframes and transitions — no JS required.',
            },
          ].map((ref) => (
            <div
              key={ref.title}
              className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
            >
              <span className="text-xs font-semibold text-brand-400">{ref.title}</span>
              <p className="text-xs text-slate-400 mt-1">{ref.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}

function CodeIcon() {
  return (
    <svg className="w-4 h-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
