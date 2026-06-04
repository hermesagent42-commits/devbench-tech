'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Eye, Code, Settings2, Layers, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ResetRule {
  id: string;
  label: string;
  css: string;
  category: 'box-model' | 'typography' | 'forms' | 'media' | 'misc' | 'normalize';
  description: string;
}

interface ResetPreset {
  id: string;
  label: string;
  description: string;
  author: string;
  ruleIds: string[];
}

// ── Rule definitions ───────────────────────────────────────────────────────

const RESET_RULES: Record<string, ResetRule> = {
  'box-sizing': {
    id: 'box-sizing',
    label: 'Box Sizing (border-box)',
    css: `*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}`,
    category: 'box-model',
    description: 'Makes padding and border part of element width/height calculations',
  },
  'margin-reset': {
    id: 'margin-reset',
    label: 'Margin Reset',
    css: `body,\nh1, h2, h3, h4, h5, h6,\np,\nul, ol, li,\nfigure,\nblockquote,\ndl, dd {\n  margin: 0;\n}`,
    category: 'box-model',
    description: 'Removes default margins from all block-level elements',
  },
  'padding-reset': {
    id: 'padding-reset',
    label: 'Padding Reset',
    css: `ul,\nol {\n  padding: 0;\n}`,
    category: 'box-model',
    description: 'Removes default left padding from lists',
  },
  'html-body-full': {
    id: 'html-body-full',
    label: 'HTML/Body Full Height',
    css: `html,\nbody {\n  height: 100%;\n}`,
    category: 'box-model',
    description: 'Sets html and body to 100% height for full-page layouts',
  },
  'media-responsive': {
    id: 'media-responsive',
    label: 'Responsive Media',
    css: `img,\npicture,\nvideo,\ncanvas,\nsvg {\n  display: block;\n  max-width: 100%;\n}`,
    category: 'media',
    description: 'Makes images and media responsive by default',
  },
  'form-reset': {
    id: 'form-reset',
    label: 'Form Element Reset',
    css: `input,\nbutton,\ntextarea,\nselect {\n  font: inherit;\n}`,
    category: 'forms',
    description: 'Forces form elements to inherit font from parent',
  },
  'button-reset': {
    id: 'button-reset',
    label: 'Button Reset',
    css: `button {\n  background: none;\n  border: none;\n  padding: 0;\n  cursor: pointer;\n}`,
    category: 'forms',
    description: 'Strips default button styling for custom designs',
  },
  'smooth-scroll': {
    id: 'smooth-scroll',
    label: 'Smooth Scrolling',
    css: `html:focus-within {\n  scroll-behavior: smooth;\n}`,
    category: 'misc',
    description: 'Enables smooth scroll when navigating via anchor links',
  },
  'remove-animations': {
    id: 'remove-animations',
    label: 'Reduced Motion Support',
    css: `@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n  }\n}`,
    category: 'misc',
    description: 'Respects prefers-reduced-motion user preference',
  },
  'typography-base': {
    id: 'typography-base',
    label: 'Typography Baseline',
    css: `body {\n  line-height: 1.5;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}`,
    category: 'typography',
    description: 'Sets baseline line-height and font smoothing',
  },
  'typography-heading': {
    id: 'typography-heading',
    label: 'Heading Reset',
    css: `h1, h2, h3, h4, h5, h6 {\n  font-size: inherit;\n  font-weight: inherit;\n}`,
    category: 'typography',
    description: 'Resets heading sizes and weights to define them yourself',
  },
  'link-reset': {
    id: 'link-reset',
    label: 'Link Reset (inherit color)',
    css: `a {\n  color: inherit;\n  text-decoration: inherit;\n}`,
    category: 'typography',
    description: 'Removes default link color and underline',
  },
  'text-wrap-balance': {
    id: 'text-wrap-balance',
    label: 'Text Wrap Balance',
    css: `h1, h2, h3, h4 {\n  text-wrap: balance;\n}\n\np, li, figcaption {\n  text-wrap: pretty;\n}`,
    category: 'typography',
    description: 'Uses modern text-wrap for improved text rendering',
  },
  'list-reset': {
    id: 'list-reset',
    label: 'List Style Reset',
    css: `ul,\nol {\n  list-style: none;\n}`,
    category: 'typography',
    description: 'Removes bullet points and numbers from lists',
  },
  'table-reset': {
    id: 'table-reset',
    label: 'Table Reset',
    css: `table {\n  border-collapse: collapse;\n  border-spacing: 0;\n}`,
    category: 'misc',
    description: 'Collapses table borders and removes spacing',
  },
  'normalize-html5': {
    id: 'normalize-html5',
    label: 'HTML5 Display Definitions',
    css: `article,\naside,\ndetails,\nfigcaption,\nfigure,\nfooter,\nheader,\nhgroup,\nmain,\nnav,\nsection {\n  display: block;\n}`,
    category: 'normalize',
    description: 'Corrects display of HTML5 elements in older browsers',
  },
  'normalize-hidden': {
    id: 'normalize-hidden',
    label: 'Hidden Attribute Support',
    css: `[hidden] {\n  display: none;\n}`,
    category: 'normalize',
    description: 'Corrects [hidden] not hiding in IE10',
  },
  'normalize-monospace': {
    id: 'normalize-monospace',
    label: 'Monospace Font Fix',
    css: `pre,\ncode,\nkbd,\nsamp {\n  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;\n  font-size: 0.95em;\n}`,
    category: 'normalize',
    description: 'Normalizes monospace font across browsers',
  },
  'normalize-sub-sup': {
    id: 'normalize-sub-sup',
    label: 'Sub/Superscript Fix',
    css: `sub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\n\nsub {\n  bottom: -0.25em;\n}\n\nsup {\n  top: -0.5em;\n}`,
    category: 'normalize',
    description: 'Prevents sub/sup from affecting line-height',
  },
};

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: ResetPreset[] = [
  {
    id: 'modern',
    label: 'Modern Reset',
    description: 'Minimal modern reset — great starting point for 2025+ projects.',
    author: 'Andy Bell',
    ruleIds: ['box-sizing', 'margin-reset', 'typography-base', 'media-responsive', 'form-reset', 'remove-animations'],
  },
  {
    id: 'minimal',
    label: 'Minimal Reset',
    description: 'Just the essentials: box-sizing, margin reset, and typography baseline.',
    author: 'Community',
    ruleIds: ['box-sizing', 'margin-reset', 'typography-base'],
  },
  {
    id: 'complete',
    label: 'Complete Reset',
    description: 'Box model, typography, forms, media, and utility fixes — the works.',
    author: 'DevBench',
    ruleIds: [
      'box-sizing', 'margin-reset', 'padding-reset', 'html-body-full',
      'media-responsive', 'form-reset', 'button-reset', 'smooth-scroll',
      'remove-animations', 'typography-base', 'typography-heading',
      'link-reset', 'text-wrap-balance', 'list-reset', 'table-reset',
    ],
  },
  {
    id: 'normalize',
    label: 'Normalize.css Style',
    description: 'Renders elements consistently without stripping all defaults.',
    author: 'Nicolas Gallagher',
    ruleIds: [
      'box-sizing', 'margin-reset', 'typography-base', 'media-responsive',
      'form-reset', 'table-reset', 'normalize-html5', 'normalize-hidden',
      'normalize-monospace', 'normalize-sub-sup',
    ],
  },
  {
    id: 'meyer',
    label: 'Meyer Reset Style',
    description: 'Classic style reset — removes browser defaults to start from a clean slate.',
    author: 'Eric Meyer',
    ruleIds: [
      'box-sizing', 'margin-reset', 'padding-reset', 'typography-heading',
      'list-reset', 'table-reset', 'media-responsive', 'link-reset',
    ],
  },
];

// ── Category definitions ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'box-model', label: 'Box Model', icon: '📦' },
  { id: 'typography', label: 'Typography', icon: '🔤' },
  { id: 'forms', label: 'Forms & Buttons', icon: '📝' },
  { id: 'media', label: 'Media', icon: '🖼️' },
  { id: 'misc', label: 'Utilities', icon: '🔧' },
  { id: 'normalize', label: 'Normalize', icon: '⚖️' },
];

// ── Live preview HTML ──────────────────────────────────────────────────────

const PREVIEW_HTML = `<h1>DevBench Reset Preview</h1>
<p>This paragraph demonstrates how text looks with the selected reset rules applied. <a href="#">Inline links</a> should match the text color and inherit their decoration unless styled otherwise.</p>
<h2>Lists &amp; Structure</h2>
<ul>
  <li>Unordered list item — note the bullet points and indentation</li>
  <li>Second item for testing spacing between siblings</li>
  <li>Third item demonstrating multi-item lists</li>
</ul>
<hr>
<h2>Form Elements</h2>
<fieldset>
  <label>
    Text Input
    <input type="text" placeholder="Placeholder text...">
  </label>
  <label>
    Select
    <select>
      <option>Option One</option>
      <option>Option Two</option>
    </select>
  </label>
  <button type="button">Click Me</button>
</fieldset>
<hr>
<h2>Tables</h2>
<table>
  <thead><tr><th>Column A</th><th>Column B</th></tr></thead>
  <tbody>
    <tr><td>Cell 1</td><td>Cell 2</td></tr>
    <tr><td>Cell 3</td><td>Cell 4</td></tr>
  </tbody>
</table>
<hr>
<h2>Media</h2>
<figure>
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='200'%3E%3Crect fill='%23334155' width='600' height='200' rx='8'/%3E%3Ctext fill='%2394a3b8' font-family='system-ui' font-size='14' text-anchor='middle' x='300' y='105'%3EImage placeholder%3C/text%3E%3C/svg%3E" alt="Demo image" width="600" height="200">
  <figcaption>A responsive image with figcaption demonstrating media reset behavior.</figcaption>
</figure>
<hr>
<div>
  <blockquote>
    "The best way to predict the future is to invent it." — Alan Kay
  </blockquote>
</div>`;

// ── Component ──────────────────────────────────────────────────────────────

export default function CssResetGenerator() {
  const [activePreset, setActivePreset] = useState<string>('modern');
  const [enabledRules, setEnabledRules] = useState<Set<string>>(() => {
    const preset = PRESETS.find(p => p.id === 'modern');
    return new Set(preset?.ruleIds ?? []);
  });
  const [showPreview, setShowPreview] = useState(true);

  // Apply preset
  const applyPreset = useCallback((presetId: string) => {
    setActivePreset(presetId);
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setEnabledRules(new Set(preset.ruleIds));
    }
  }, []);

  // Toggle a rule
  const toggleRule = useCallback((ruleId: string) => {
    setEnabledRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
    setActivePreset('custom');
  }, []);

  // Generate CSS from enabled rules
  const generatedCSS = useMemo(() => {
    const rules: string[] = [];
    const byCategory: Record<string, string[]> = {};

    for (const id of enabledRules) {
      const rule = RESET_RULES[id];
      if (!rule) continue;
      if (!byCategory[rule.category]) byCategory[rule.category] = [];
      byCategory[rule.category].push(rule.css);
    }

    const categoryOrder = ['box-model', 'typography', 'media', 'forms', 'normalize', 'misc'];
    for (const cat of categoryOrder) {
      if (byCategory[cat]) {
        const catName = CATEGORIES.find(c => c.id === cat);
        if (catName) {
          rules.push(`/* ${catName.icon} ${catName.label} */`);
        }
        rules.push(...byCategory[cat]);
        rules.push('');
      }
    }

    return rules.join('\n').trim();
  }, [enabledRules]);

  const copyCSS = useCallback(async () => {
    await navigator.clipboard.writeText(generatedCSS);
    toast.success('CSS copied to clipboard!');
  }, [generatedCSS]);

  const ruleCount = enabledRules.size;
  const totalRules = Object.keys(RESET_RULES).length;

  // Check which preset matches
  const presetsMatch = useMemo(() => {
    const sorted = [...enabledRules].sort().join(',');
    for (const preset of PRESETS) {
      if ([...preset.ruleIds].sort().join(',') === sorted) return preset;
    }
    return null;
  }, [enabledRules]);

  return (
    <ToolLayout
      title="CSS Reset Generator"
      description="Build your own CSS reset by toggling rules from popular resets. Preview live HTML to see the effect, then copy perfect reset CSS for your next project."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            {ruleCount} / {totalRules} rules active
          </span>
          {presetsMatch && activePreset !== 'custom' && (
            <span className="text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
              {presetsMatch.label}
            </span>
          )}
          {activePreset === 'custom' && (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              Custom
            </span>
          )}
        </div>
      }
    >
      {/* Preset selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" />
          Choose a starting preset
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
          {PRESETS.map(preset => {
            const isActive = (activePreset === preset.id) || 
              (activePreset === 'custom' && presetsMatch?.id === preset.id);
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'border-brand-500/60 bg-brand-500/10 ring-1 ring-brand-500/30'
                    : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <div className="text-sm font-medium text-white mb-1">{preset.label}</div>
                <div className="text-xs text-slate-400 leading-relaxed mb-1">{preset.description}</div>
                <div className="text-[10px] text-slate-500">by {preset.author}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Rules toggles */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-brand-400" />
              Toggle Rules
            </h2>
            <button
              onClick={() => setShowPreview(s => !s)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
                showPreview 
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
                  : 'text-slate-400 border border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const catRules = Object.values(RESET_RULES).filter(r => r.category === cat.id);
              if (catRules.length === 0) return null;
              const allInCat = catRules.every(r => enabledRules.has(r.id));
              const someInCat = catRules.some(r => enabledRules.has(r.id));
              return (
                <div key={cat.id} className="border border-slate-700/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setEnabledRules(prev => {
                        const next = new Set(prev);
                        if (allInCat) {
                          catRules.forEach(r => next.delete(r.id));
                        } else {
                          catRules.forEach(r => next.add(r.id));
                        }
                        return next;
                      });
                      setActivePreset('custom');
                    }}
                    className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <span className="text-base">{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className="text-xs text-slate-500 ml-1">({catRules.length})</span>
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      allInCat ? 'bg-green-500/20 text-green-400' :
                      someInCat ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-700/50 text-slate-500'
                    }`}>
                      {allInCat ? 'All on' : someInCat ? 'Mixed' : 'All off'}
                    </span>
                  </button>
                  <div className="divide-y divide-slate-700/30">
                    {catRules.map(rule => (
                      <label
                        key={rule.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={enabledRules.has(rule.id)}
                          onChange={() => toggleRule(rule.id)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700 text-brand-500 focus:ring-brand-500/40 focus:ring-offset-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-200">{rule.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{rule.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generated CSS + Preview */}
        <div className="space-y-4">
          {/* CSS Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-brand-400" />
                Generated CSS
              </h2>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/50 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <pre className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 overflow-auto text-xs font-mono text-slate-300 leading-relaxed max-h-[400px]">
              {generatedCSS || (
                <span className="text-slate-500 italic">{"/* Select rules to generate CSS */"}</span>
              )}
            </pre>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-400" />
                  Live Preview
                </h2>
                <span className="text-[10px] text-slate-500">Rendered with your reset</span>
              </div>
              <div className="border border-slate-700/50 rounded-lg bg-white text-slate-900 overflow-auto max-h-[500px]">
                <style>{generatedCSS}</style>
                <div
                  className="p-6"
                  dangerouslySetInnerHTML={{ __html: PREVIEW_HTML }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-8 p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
        <div className="flex items-start gap-3">
          <Code className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-slate-200 mb-1">How to use this reset</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Copy the generated CSS and include it at the very top of your stylesheet, before any other styles.
              For Tailwind users, the <code className="text-brand-400 bg-slate-700/50 px-1 py-0.5 rounded text-[11px]">border-box</code> and <code className="text-brand-400 bg-slate-700/50 px-1 py-0.5 rounded text-[11px]">typography-base</code> rules pair particularly well.
              If you&apos;re building a component library, the Modern Reset is usually the best starting point — it&apos;s minimal,
              doesn&apos;t fight your design system, and pairs well with any CSS framework.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
