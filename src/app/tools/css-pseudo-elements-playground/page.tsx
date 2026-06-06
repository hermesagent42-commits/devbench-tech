'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Eye, EyeOff, Sparkles, Info, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface PseudoDef {
  key: string;
  selector: string;
  label: string;
  description: string;
  usage: string;
  category: 'content' | 'text' | 'form' | 'media' | 'list';
  properties: PropsField[];
  previewHTML: string;
  sampleCSS: string;
}

interface PropsField {
  name: string;
  cssProp: string;
  type: 'color' | 'text' | 'number' | 'select' | 'range';
  defaultValue: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: string; label: string }[];
}

interface Preset {
  name: string;
  description: string;
  pseudo: string;
  overrides: Record<string, string>;
}

// ── Pseudo-element definitions ─────────────────────────────────────────────

const PSEUDO_ELEMENTS: PseudoDef[] = [
  // ── Content ──────────────────────────────────────────────────────────────
  {
    key: 'before',
    selector: '::before',
    label: '::before',
    description: 'Inserts generated content before an element. Requires content property.',
    usage: 'Common for icons, decorative elements, quote marks, tooltips.',
    category: 'content',
    properties: [
      { name: 'Content', cssProp: 'content', type: 'text', defaultValue: '"★"' },
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#f59e0b' },
      { name: 'Font Size', cssProp: 'fontSize', type: 'text', defaultValue: '20px' },
      { name: 'Display', cssProp: 'display', type: 'select', defaultValue: 'inline-block', options: [
        { value: 'inline', label: 'inline' }, { value: 'inline-block', label: 'inline-block' },
        { value: 'block', label: 'block' }, { value: 'flex', label: 'flex' },
      ]},
      { name: 'Background', cssProp: 'background', type: 'color', defaultValue: 'transparent' },
      { name: 'Padding', cssProp: 'padding', type: 'text', defaultValue: '4px 8px' },
      { name: 'Border Radius', cssProp: 'borderRadius', type: 'text', defaultValue: '4px' },
      { name: 'Margin Right', cssProp: 'marginRight', type: 'text', defaultValue: '6px' },
    ],
    previewHTML: '<div class="demo-before">Premium feature</div>',
    sampleCSS: 'content: "★";\ncolor: #f59e0b;\nfont-size: 20px;\nmargin-right: 6px;',
  },
  {
    key: 'after',
    selector: '::after',
    label: '::after',
    description: 'Inserts generated content after an element. Requires content property.',
    usage: 'Common for clearfix, external-link indicators, decorative flourishes.',
    category: 'content',
    properties: [
      { name: 'Content', cssProp: 'content', type: 'text', defaultValue: '" →"' },
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#6366f1' },
      { name: 'Font Size', cssProp: 'fontSize', type: 'text', defaultValue: '16px' },
      { name: 'Display', cssProp: 'display', type: 'select', defaultValue: 'inline', options: [
        { value: 'inline', label: 'inline' }, { value: 'inline-block', label: 'inline-block' },
        { value: 'block', label: 'block' },
      ]},
      { name: 'Font Weight', cssProp: 'fontWeight', type: 'select', defaultValue: 'normal', options: [
        { value: 'normal', label: 'normal' }, { value: 'bold', label: 'bold' },
      ]},
      { name: 'Margin Left', cssProp: 'marginLeft', type: 'text', defaultValue: '4px' },
      { name: 'Opacity', cssProp: 'opacity', type: 'range', defaultValue: '1', min: 0, max: 1, step: 0.1 },
    ],
    previewHTML: '<a href="#" class="demo-link">Read more</a>',
    sampleCSS: 'content: " →";\ncolor: #6366f1;\nmargin-left: 4px;',
  },
  // ── Text ─────────────────────────────────────────────────────────────────
  {
    key: 'first-letter',
    selector: '::first-letter',
    label: '::first-letter',
    description: 'Styles the first letter of block-level text. No content property needed.',
    usage: 'Common for drop caps, magazine-style typography, call-out paragraphs.',
    category: 'text',
    properties: [
      { name: 'Font Size', cssProp: 'fontSize', type: 'text', defaultValue: '3em' },
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#6366f1' },
      { name: 'Font Weight', cssProp: 'fontWeight', type: 'select', defaultValue: 'bold', options: [
        { value: 'normal', label: 'normal' }, { value: 'bold', label: 'bold' },
        { value: '900', label: '900 (black)' },
      ]},
      { name: 'Float', cssProp: 'float', type: 'select', defaultValue: 'left', options: [
        { value: 'none', label: 'none' }, { value: 'left', label: 'left' },
      ]},
      { name: 'Line Height', cssProp: 'lineHeight', type: 'text', defaultValue: '0.85' },
      { name: 'Margin Right', cssProp: 'marginRight', type: 'text', defaultValue: '8px' },
      { name: 'Margin Top', cssProp: 'marginTop', type: 'text', defaultValue: '4px' },
      { name: 'Text Transform', cssProp: 'textTransform', type: 'select', defaultValue: 'none', options: [
        { value: 'none', label: 'none' }, { value: 'uppercase', label: 'uppercase' },
        { value: 'capitalize', label: 'capitalize' },
      ]},
    ],
    previewHTML: '<p class="demo-paragraph">Once upon a time, in a land far away, there lived a developer who discovered the joy of CSS pseudo-elements. The journey was long, but the typography was beautiful.</p>',
    sampleCSS: 'font-size: 3em;\nfont-weight: bold;\nfloat: left;\nline-height: 0.85;\nmargin-right: 8px;\ncolor: #6366f1;',
  },
  {
    key: 'first-line',
    selector: '::first-line',
    label: '::first-line',
    description: 'Styles the first line of text in a block container. Responds to viewport width.',
    usage: 'Common for lead-ins, newspaper-style formatting, emphasis on opening lines.',
    category: 'text',
    properties: [
      { name: 'Font Weight', cssProp: 'fontWeight', type: 'select', defaultValue: 'bold', options: [
        { value: 'normal', label: 'normal' }, { value: 'bold', label: 'bold' },
        { value: '600', label: 'semibold' },
      ]},
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#a78bfa' },
      { name: 'Text Transform', cssProp: 'textTransform', type: 'select', defaultValue: 'none', options: [
        { value: 'none', label: 'none' }, { value: 'uppercase', label: 'uppercase' },
      ]},
      { name: 'Font Size', cssProp: 'fontSize', type: 'text', defaultValue: '1.15em' },
      { name: 'Letter Spacing', cssProp: 'letterSpacing', type: 'text', defaultValue: '0.5px' },
    ],
    previewHTML: '<p class="demo-paragraph">The first line of this paragraph is styled with ::first-line. Notice how it looks different from the rest. Resize your browser to see the effect shift — ::first-line responds to the actual rendered line break.</p>',
    sampleCSS: 'font-weight: bold;\ncolor: #a78bfa;\nfont-size: 1.15em;\nletter-spacing: 0.5px;',
  },
  {
    key: 'selection',
    selector: '::selection',
    label: '::selection',
    description: 'Styles the portion of text selected by the user (highlighted with cursor/mouse).',
    usage: 'Brand-colored text highlights, matching your site theme for selected text.',
    category: 'text',
    properties: [
      { name: 'Background', cssProp: 'background', type: 'color', defaultValue: 'rgba(99, 102, 241, 0.35)' },
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#ffffff' },
      { name: 'Text Shadow', cssProp: 'textShadow', type: 'text', defaultValue: 'none' },
    ],
    previewHTML: '<p class="demo-paragraph">Select this text to see the ::selection pseudo-element in action. Drag your cursor across these words and watch the highlight color change. Every word you select will reflect your custom styling.</p>',
    sampleCSS: 'background: rgba(99, 102, 241, 0.35);\ncolor: #ffffff;',
  },
  // ── Form ─────────────────────────────────────────────────────────────────
  {
    key: 'placeholder',
    selector: '::placeholder',
    label: '::placeholder',
    description: 'Styles placeholder text in <input> and <textarea> elements.',
    usage: 'Soft, branded placeholder text. Note: use separate rules for each browser if needed.',
    category: 'form',
    properties: [
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#94a3b8' },
      { name: 'Opacity', cssProp: 'opacity', type: 'range', defaultValue: '0.7', min: 0, max: 1, step: 0.1 },
      { name: 'Font Style', cssProp: 'fontStyle', type: 'select', defaultValue: 'italic', options: [
        { value: 'normal', label: 'normal' }, { value: 'italic', label: 'italic' },
      ]},
      { name: 'Font Size', cssProp: 'fontSize', type: 'text', defaultValue: '14px' },
      { name: 'Letter Spacing', cssProp: 'letterSpacing', type: 'text', defaultValue: 'normal' },
    ],
    previewHTML: '<input type="text" class="demo-input" placeholder="Enter your email address..." />',
    sampleCSS: 'color: #94a3b8;\nopacity: 0.7;\nfont-style: italic;',
  },
  {
    key: 'file-selector-button',
    selector: '::file-selector-button',
    label: '::file-selector-button',
    description: 'Styles the "Choose File" button in <input type="file"> elements.',
    usage: 'Brand-styled upload buttons. The file name label is part of the input, not the pseudo.',
    category: 'form',
    properties: [
      { name: 'Background', cssProp: 'background', type: 'color', defaultValue: '#6366f1' },
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#ffffff' },
      { name: 'Border', cssProp: 'border', type: 'text', defaultValue: 'none' },
      { name: 'Padding', cssProp: 'padding', type: 'text', defaultValue: '8px 16px' },
      { name: 'Border Radius', cssProp: 'borderRadius', type: 'text', defaultValue: '6px' },
      { name: 'Font Weight', cssProp: 'fontWeight', type: 'select', defaultValue: '600', options: [
        { value: 'normal', label: 'normal' }, { value: '600', label: 'semibold' }, { value: 'bold', label: 'bold' },
      ]},
      { name: 'Cursor', cssProp: 'cursor', type: 'select', defaultValue: 'pointer', options: [
        { value: 'pointer', label: 'pointer' }, { value: 'default', label: 'default' },
      ]},
      { name: 'Margin Right', cssProp: 'marginRight', type: 'text', defaultValue: '12px' },
    ],
    previewHTML: '<input type="file" class="demo-file-input" />',
    sampleCSS: 'background: #6366f1;\ncolor: #ffffff;\nborder: none;\npadding: 8px 16px;\nborder-radius: 6px;\nfont-weight: 600;\ncursor: pointer;',
  },
  // ── List ─────────────────────────────────────────────────────────────────
  {
    key: 'marker',
    selector: '::marker',
    label: '::marker',
    description: 'Styles the bullet or number in list items (<li>). Works on <ol> and <ul>.',
    usage: 'Custom bullet colors, sized numbers, emoji markers. A clean way to style lists.',
    category: 'list',
    properties: [
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: '#6366f1' },
      { name: 'Font Size', cssProp: 'fontSize', type: 'text', defaultValue: '1.2em' },
      { name: 'Font Weight', cssProp: 'fontWeight', type: 'select', defaultValue: 'bold', options: [
        { value: 'normal', label: 'normal' }, { value: 'bold', label: 'bold' },
      ]},
      { name: 'Content (advanced)', cssProp: 'content', type: 'text', defaultValue: '""' },
    ],
    previewHTML: '<ul class="demo-list"><li>First item in the list</li><li>Second item — notice the markers</li><li>Third item with custom marker style</li></ul>',
    sampleCSS: 'color: #6366f1;\nfont-size: 1.2em;\nfont-weight: bold;',
  },
  // ── Media ────────────────────────────────────────────────────────────────
  {
    key: 'backdrop',
    selector: '::backdrop',
    label: '::backdrop',
    description: 'Styles the backdrop behind modal dialogs opened with <dialog>.showModal().',
    usage: 'Dimmed overlays, blur effects, branded modal backdrops. Only works with <dialog>.',
    category: 'media',
    properties: [
      { name: 'Background', cssProp: 'background', type: 'color', defaultValue: 'rgba(0, 0, 0, 0.6)' },
      { name: 'Backdrop Filter', cssProp: 'backdropFilter', type: 'text', defaultValue: 'none' },
      { name: 'Opacity', cssProp: 'opacity', type: 'range', defaultValue: '1', min: 0, max: 1, step: 0.1 },
    ],
    previewHTML: '<div class="demo-dialog-bg"><div class="demo-dialog-box">Modal content</div></div>',
    sampleCSS: 'background: rgba(0, 0, 0, 0.6);\nbackdrop-filter: blur(4px);',
  },
  {
    key: 'spelling-error',
    selector: '::spelling-error',
    label: '::spelling-error',
    description: 'Styles text flagged by the browser\'s spell checker. Experimental, limited support.',
    usage: 'Custom spell-check highlighting. Currently supported in Chrome/Edge behind a flag.',
    category: 'text',
    properties: [
      { name: 'Text Decoration', cssProp: 'textDecoration', type: 'text', defaultValue: 'underline wavy #ef4444' },
      { name: 'Background', cssProp: 'background', type: 'color', defaultValue: 'transparent' },
      { name: 'Color', cssProp: 'color', type: 'color', defaultValue: 'inherit' },
      { name: 'Text Decoration Color', cssProp: 'textDecorationColor', type: 'color', defaultValue: '#ef4444' },
      { name: 'Text Decoration Style', cssProp: 'textDecorationStyle', type: 'select', defaultValue: 'wavy', options: [
        { value: 'wavy', label: 'wavy' }, { value: 'dotted', label: 'dotted' },
        { value: 'dashed', label: 'dashed' },
      ]},
    ],
    previewHTML: '<p class="demo-paragraph">This sentance contains a mispelled word for testing ::spelling-error styling. Notice how the browser underlines it.</p>',
    sampleCSS: 'text-decoration: underline wavy #ef4444;',
  },
];

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Gold Star Badge',
    description: 'A gold star before premium labels',
    pseudo: 'before',
    overrides: { content: '"★ "', color: '#f59e0b', fontSize: '18px', fontWeight: 'bold', marginRight: '4px' },
  },
  {
    name: 'External Link Arrow',
    description: 'Arrow after external links',
    pseudo: 'after',
    overrides: { content: '" ↗"', color: '#6366f1', fontSize: '14px', fontWeight: 'bold', opacity: '0.8' },
  },
  {
    name: 'Magazine Drop Cap',
    description: 'Classic drop cap for articles',
    pseudo: 'first-letter',
    overrides: { fontSize: '3.5em', color: '#dc2626', fontWeight: 'bold', float: 'left', lineHeight: '0.85', marginRight: '8px' },
  },
  {
    name: 'Brand Selection',
    description: 'Brand-colored text selection',
    pseudo: 'selection',
    overrides: { background: 'rgba(99, 102, 241, 0.4)', color: '#ffffff' },
  },
  {
    name: 'Subtle Placeholder',
    description: 'Soft, italic placeholder text',
    pseudo: 'placeholder',
    overrides: { color: '#94a3b8', fontStyle: 'italic', opacity: '0.6', fontSize: '14px' },
  },
  {
    name: 'Styled Upload Button',
    description: 'Branded file upload button',
    pseudo: 'file-selector-button',
    overrides: { background: '#6366f1', color: '#ffffff', borderRadius: '8px', padding: '10px 20px', fontWeight: '600' },
  },
  {
    name: 'Colorful Bullets',
    description: 'Colored list markers',
    pseudo: 'marker',
    overrides: { color: '#f59e0b', fontSize: '1.3em', fontWeight: 'bold' },
  },
  {
    name: 'Dark Blur Backdrop',
    description: 'Dialog backdrop with blur',
    pseudo: 'backdrop',
    overrides: { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'content', label: 'Content', description: '::before, ::after — generated content' },
  { key: 'text', label: 'Text', description: '::first-letter, ::first-line, ::selection, ::spelling-error' },
  { key: 'form', label: 'Form', description: '::placeholder, ::file-selector-button' },
  { key: 'list', label: 'List', description: '::marker' },
  { key: 'media', label: 'Media', description: '::backdrop' },
];

function buildCSS(pe: PseudoDef, values: Record<string, string>): string {
  const lines: string[] = [];
  for (const prop of pe.properties) {
    const val = values[prop.name];
    if (!val || val === prop.defaultValue) continue;
    if (prop.cssProp === 'content' && (val === '""' || val === "''")) continue;
    const cssName = prop.cssProp.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`${cssName}: ${val};`);
  }
  return lines.join('\n');
}

function buildFullSelector(pe: PseudoDef, values: Record<string, string>): string {
  let cls = '.demo-' + pe.key.replace('file-selector-button', 'file-input');
  if (pe.key === 'first-letter' || pe.key === 'first-line' || pe.key === 'selection' || pe.key === 'spelling-error') cls = '.demo-paragraph';
  if (pe.key === 'backdrop') return `dialog${pe.selector} {\n${buildCSS(pe, values)}\n}`;
  const css = buildCSS(pe, values);
  return `${cls}${pe.selector} {\n${css}\n}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CSSPseudoElementsPlaygroundPage() {
  const [activePseudo, setActivePseudo] = useState<string>('before');
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    for (const pe of PSEUDO_ELEMENTS) {
      initial[pe.key] = {};
      for (const prop of pe.properties) {
        initial[pe.key][prop.name] = prop.defaultValue;
      }
    }
    return initial;
  });

  const activePE = useMemo(() => PSEUDO_ELEMENTS.find(p => p.key === activePseudo)!, [activePseudo]);
  const activeValues = useMemo(() => values[activePseudo] || {}, [values, activePseudo]);
  const generatedCSS = useMemo(() => buildCSS(activePE, activeValues), [activePE, activeValues]);
  const fullSelectorCSS = useMemo(() => buildFullSelector(activePE, activeValues), [activePE, activeValues]);

  const applyPreset = useCallback((preset: Preset) => {
    setActivePseudo(preset.pseudo);
    setValues(prev => {
      const pe = PSEUDO_ELEMENTS.find(p => p.key === preset.pseudo)!;
      const newVals: Record<string, string> = {};
      for (const prop of pe.properties) {
        newVals[prop.name] = preset.overrides[prop.name] ?? prop.defaultValue;
      }
      return { ...prev, [preset.pseudo]: newVals };
    });
  }, []);

  const updateValue = useCallback((name: string, value: string) => {
    setValues(prev => ({
      ...prev,
      [activePseudo]: { ...prev[activePseudo], [name]: value },
    }));
  }, [activePseudo]);

  const resetAll = useCallback(() => {
    setValues(prev => {
      const pe = PSEUDO_ELEMENTS.find(p => p.key === activePseudo)!;
      const reset: Record<string, string> = {};
      for (const prop of pe.properties) {
        reset[prop.name] = prop.defaultValue;
      }
      return { ...prev, [activePseudo]: reset };
    });
  }, [activePseudo]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(fullSelectorCSS).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [fullSelectorCSS]);

  // ── Build preview style ──────────────────────────────────────────────────

  const previewStyle = useMemo(() => {
    const style: Record<string, string> = {};
    for (const prop of activePE.properties) {
      const val = activeValues[prop.name];
      if (val && val !== prop.defaultValue) {
        style[prop.cssProp] = val;
      }
    }
    // Special handling for backdrop
    if (activePseudo === 'backdrop') {
      return style;
    }
    return style;
  }, [activePE, activeValues, activePseudo]);

  // ── Inline Styles for Preview ────────────────────────────────────────────

  const pseudoStyleCSS = useMemo(() => {
    let cls = '.demo-' + activePE.key.replace('file-selector-button', 'file-input');
    if (['first-letter', 'first-line', 'selection', 'spelling-error'].includes(activePE.key)) cls = '.demo-paragraph';
    if (activePE.key === 'backdrop') cls = '.demo-backdrop-sim';
    const inner = generatedCSS;
    if (!inner) return '';
    return `${cls}${activePE.selector} {\n${inner}\n}`;
  }, [activePE, generatedCSS]);

  return (
    <ToolLayout
      title="CSS Pseudo-Elements Playground"
      description="Interactively style every CSS pseudo-element — ::before, ::after, ::first-letter, ::selection, ::placeholder, ::marker, ::backdrop, ::file-selector-button and more. Live preview, presets, copy-ready CSS."
    >
      <style dangerouslySetInnerHTML={{ __html: pseudoStyleCSS }} />

      {/* Presets */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-semibold text-sm">Quick Presets</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className="px-3 py-1.5 text-xs rounded-md bg-surface border border-slate-600/50 text-slate-300 hover:border-brand-500/50 hover:text-white transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Pseudo-element selector */}
      <div className="card mb-6">
        <h2 className="text-white font-semibold text-sm mb-3">Select Pseudo-Element</h2>
        <div className="space-y-3">
          {CATEGORIES.map(cat => {
            const elems = PSEUDO_ELEMENTS.filter(p => p.category === cat.key);
            if (elems.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{cat.label}</span>
                  <span className="text-[10px] text-slate-600 hidden sm:inline">— {cat.description}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {elems.map(pe => (
                    <button
                      key={pe.key}
                      onClick={() => setActivePseudo(pe.key)}
                      className={`px-3 py-1.5 text-xs rounded-md font-mono transition-all ${
                        activePseudo === pe.key
                          ? 'bg-brand-500/25 border border-brand-500/60 text-brand-300 shadow-sm shadow-brand-500/10'
                          : 'bg-surface border border-slate-600/30 text-slate-400 hover:text-slate-200 hover:border-slate-500/50'
                      }`}
                      title={pe.description}
                    >
                      {pe.selector}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-5">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-sm">{activePE.selector}</h2>
                <p className="text-xs text-slate-400 mt-1">{activePE.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">{activePE.usage}</p>
              </div>
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Properties */}
            <div className="space-y-3">
              {activePE.properties.map(prop => (
                <div key={prop.name}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400 font-mono">{prop.cssProp}</label>
                    <span className="text-[10px] text-slate-500">{prop.name}</span>
                  </div>

                  {prop.type === 'color' && (
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded overflow-hidden border border-slate-600/50 shrink-0">
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: activeValues[prop.name] || prop.defaultValue }}
                        />
                        <input
                          type="color"
                          value={activeValues[prop.name] || prop.defaultValue}
                          onChange={(e) => updateValue(prop.name, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={activeValues[prop.name] || prop.defaultValue}
                        onChange={(e) => updateValue(prop.name, e.target.value)}
                        className="input-field flex-1 text-xs font-mono"
                      />
                    </div>
                  )}

                  {prop.type === 'text' && (
                    <input
                      type="text"
                      value={activeValues[prop.name] || prop.defaultValue}
                      onChange={(e) => updateValue(prop.name, e.target.value)}
                      className="input-field w-full text-xs font-mono"
                    />
                  )}

                  {prop.type === 'select' && (
                    <select
                      value={activeValues[prop.name] || prop.defaultValue}
                      onChange={(e) => updateValue(prop.name, e.target.value)}
                      className="input-field w-full text-xs"
                    >
                      {prop.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {prop.type === 'range' && (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={prop.min ?? 0}
                        max={prop.max ?? 1}
                        step={prop.step ?? 0.1}
                        value={activeValues[prop.name] || prop.defaultValue}
                        onChange={(e) => updateValue(prop.name, e.target.value)}
                        className="flex-1 accent-brand-500"
                      />
                      <span className="text-xs text-slate-400 font-mono w-8 text-right">
                        {activeValues[prop.name] || prop.defaultValue}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-brand-400" />
              <h2 className="text-white font-semibold text-sm">Sample CSS</h2>
            </div>
            <pre className="bg-surface rounded-lg p-3 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto">
              {activePE.sampleCSS}
            </pre>
          </div>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">Live Preview</h2>
              <span className="text-[10px] text-slate-500 font-mono bg-surface px-2 py-0.5 rounded">{activePE.selector}</span>
            </div>
            <div className="flex items-center justify-center py-12 min-h-[160px] rounded-lg bg-[#0f172a] border border-slate-700/30 overflow-hidden">
              <div className="w-full max-w-lg px-4" dangerouslySetInnerHTML={{ __html: activePE.previewHTML }} />
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">
              Pseudo-element styles are injected via a live &lt;style&gt; tag above
            </p>
          </div>

          {/* CSS Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                <h2 className="text-white font-semibold text-sm">Generated CSS</h2>
              </div>
              <button
                onClick={copyCSS}
                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Full Rule
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-green-400 overflow-x-auto max-h-[400px] overflow-y-auto">
              {fullSelectorCSS || '/* Use default values — no overrides to show */'}
            </pre>
          </div>

          {/* Quick tip card */}
          <div className="card bg-brand-500/5 border-brand-500/20">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-300">
                <p className="font-medium text-brand-300 mb-1">Pro Tip</p>
                <p>
                  <code className="text-brand-400 bg-brand-500/10 px-1 rounded">::before</code> and{' '}
                  <code className="text-brand-400 bg-brand-500/10 px-1 rounded">::after</code> need a{' '}
                  <code className="text-green-400 bg-surface px-1 rounded">content</code> property to render.
                  For <code className="text-brand-400 bg-brand-500/10 px-1 rounded">::backdrop</code>, use the native{' '}
                  <code className="text-green-400 bg-surface px-1 rounded">&lt;dialog&gt;</code> element with{' '}
                  <code className="text-green-400 bg-surface px-1 rounded">.showModal()</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
