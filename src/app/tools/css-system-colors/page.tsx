'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Eye, PaintBucket, Monitor, Contrast, Palette, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface SystemColor {
  name: string;
  description: string;
  category: 'canvas' | 'text' | 'interactive' | 'decoration' | 'field';
}

// ── All CSS System Colors ──────────────────────────────────────────────────

const SYSTEM_COLORS: SystemColor[] = [
  // Canvas colors (backgrounds)
  { name: 'Canvas', description: 'Background of application content or documents', category: 'canvas' },
  { name: 'CanvasText', description: 'Text color in application content or documents', category: 'text' },
  { name: 'LinkText', description: 'Text color of non-active, non-visited links', category: 'interactive' },
  { name: 'VisitedText', description: 'Text color of visited links', category: 'interactive' },
  { name: 'ActiveText', description: 'Text color of active links', category: 'interactive' },

  // Button / control colors
  { name: 'ButtonFace', description: 'Background of push buttons', category: 'interactive' },
  { name: 'ButtonText', description: 'Text color of push buttons', category: 'text' },
  { name: 'ButtonBorder', description: 'Border color of push buttons', category: 'interactive' },

  // Field / input colors
  { name: 'Field', description: 'Background of input fields', category: 'field' },
  { name: 'FieldText', description: 'Text color in input fields', category: 'text' },

  // Highlight / selection
  { name: 'Highlight', description: 'Background of selected items or text', category: 'interactive' },
  { name: 'HighlightText', description: 'Text color of selected items or text', category: 'text' },
  { name: 'SelectedItem', description: 'Background of selected items (list boxes, etc.)', category: 'interactive' },
  { name: 'SelectedItemText', description: 'Text color of selected items', category: 'text' },
  { name: 'Mark', description: 'Background of marked/highlighted text', category: 'interactive' },
  { name: 'MarkText', description: 'Text color of marked/highlighted text', category: 'text' },

  // Decoration / chrome
  { name: 'GrayText', description: 'Disabled / grayed-out text', category: 'decoration' },
  { name: 'AccentColor', description: 'System accent / theme color', category: 'interactive' },
  { name: 'AccentColorText', description: 'Text on accent color background', category: 'text' },

  // Scrollbar
  { name: 'Scrollbar', description: 'Background of scrollbar track', category: 'decoration' },

  // Additional 
  { name: 'ThreeDDarkShadow', description: 'Dark 3D shadow for beveled UI', category: 'decoration' },
  { name: 'ThreeDFace', description: 'Face of 3D UI elements', category: 'decoration' },
  { name: 'ThreeDHighlight', description: 'Highlight for 3D UI elements', category: 'decoration' },
  { name: 'ThreeDLightShadow', description: 'Light shadow for 3D UI elements', category: 'decoration' },
  { name: 'ThreeDShadow', description: 'Shadow for 3D UI elements', category: 'decoration' },
  { name: 'Window', description: 'Background of windows / top-level containers', category: 'canvas' },
  { name: 'WindowFrame', description: 'Color of window frame / title bar', category: 'decoration' },
  { name: 'WindowText', description: 'Text color in windows', category: 'text' },

  // Additional interactive
  { name: 'ActiveBorder', description: 'Border of active window', category: 'decoration' },
  { name: 'ActiveCaption', description: 'Title bar of active window', category: 'interactive' },
  { name: 'AppWorkspace', description: 'Background of MDI workspace', category: 'canvas' },
  { name: 'Background', description: 'Desktop background', category: 'canvas' },
  { name: 'InactiveBorder', description: 'Border of inactive window', category: 'decoration' },
  { name: 'InactiveCaption', description: 'Title bar of inactive window', category: 'decoration' },
  { name: 'InactiveCaptionText', description: 'Text in inactive title bar', category: 'text' },
  { name: 'InfoBackground', description: 'Background of tooltip / info', category: 'canvas' },
  { name: 'InfoText', description: 'Text color in tooltips', category: 'text' },
  { name: 'Menu', description: 'Menu background', category: 'canvas' },
  { name: 'MenuText', description: 'Text in menus', category: 'text' },
];

// ── Category metadata ──────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  canvas: { label: 'Canvas / Background', icon: PaintBucket, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  text: { label: 'Text / Foreground', icon: Eye, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  interactive: { label: 'Interactive / Controls', icon: Monitor, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  decoration: { label: 'Decoration / Chrome', icon: Palette, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  field: { label: 'Form Fields', icon: Smartphone, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

// ── UI Pattern Presets ─────────────────────────────────────────────────────

const UI_PATTERNS: { label: string; element: 'text' | 'bg' | 'button' | 'input' | 'card' | 'link'; keys: [string, string] }[] = [
  { label: 'Page Text', element: 'text', keys: ['CanvasText', 'Canvas'] },
  { label: 'Button', element: 'button', keys: ['ButtonText', 'ButtonFace'] },
  { label: 'Link', element: 'link', keys: ['LinkText', 'Canvas'] },
  { label: 'Input Field', element: 'input', keys: ['FieldText', 'Field'] },
  { label: 'Card / Surface', element: 'card', keys: ['CanvasText', 'Canvas'] },
  { label: 'Selection', element: 'bg', keys: ['HighlightText', 'Highlight'] },
  { label: 'Marked Text', element: 'bg', keys: ['MarkText', 'Mark'] },
  { label: 'Selected Item', element: 'bg', keys: ['SelectedItemText', 'SelectedItem'] },
];

// ── Color Swatch ───────────────────────────────────────────────────────────

function ColorSwatch({
  name,
  description,
  category,
  onCopy,
}: SystemColor & { onCopy: (name: string) => void }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  return (
    <div className="group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-brand-500/5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color}`}>
          {meta.label}
        </span>
        <button
          onClick={() => onCopy(name)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-brand-400"
          title={`Copy ${name}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color preview */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg overflow-hidden border border-slate-600">
          <div
            className="h-16 flex items-end p-2"
            style={{ backgroundColor: name }}
          >
            <span
              className="text-[10px] font-mono font-semibold"
              style={{ color: 'CanvasText' as any }}
            >
              Light
            </span>
          </div>
        </div>
        <div
          className="rounded-lg overflow-hidden border border-slate-600"
          style={{ colorScheme: 'dark' } as any}
        >
          <div
            className="h-16 flex items-end p-2"
            style={{ backgroundColor: name }}
          >
            <span
              className="text-[10px] font-mono font-semibold"
              style={{ color: 'CanvasText' as any }}
            >
              Dark
            </span>
          </div>
        </div>
      </div>

      {/* Name and description */}
      <div>
        <code className="text-sm font-mono font-semibold text-brand-400">{name}</code>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ── UI Pattern Preview Card ─────────────────────────────────────────────────

function PatternCard({
  label,
  element,
  keys: [fgKey, bgKey],
}: typeof UI_PATTERNS[number]) {
  const containerStyle: React.CSSProperties = {
    backgroundColor: bgKey as any,
    color: fgKey as any,
    colorScheme: 'only light',
  };

  const renderElement = () => {
    switch (element) {
      case 'text':
        return (
          <p className="text-lg font-medium" style={{ color: fgKey as any }}>
            The quick brown fox jumps over the lazy dog.
          </p>
        );
      case 'button':
        return (
          <button
            className="px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm border transition-colors"
            style={{
              backgroundColor: bgKey as any,
              color: fgKey as any,
              borderColor: (bgKey === 'ButtonFace' ? 'ButtonBorder' : bgKey) as any,
            }}
          >
            Click Me
          </button>
        );
      case 'link':
        return (
          <a
            href="#"
            className="text-lg font-medium underline underline-offset-2"
            style={{ color: fgKey as any }}
            onClick={(e) => e.preventDefault()}
          >
            Example Link → Documentation
          </a>
        );
      case 'input':
        return (
          <input
            type="text"
            placeholder="Type something..."
            className="px-4 py-2.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{
              backgroundColor: bgKey as any,
              color: fgKey as any,
              borderColor: (fgKey === 'FieldText' ? 'GrayText' : bgKey) as any,
            }}
          />
        );
      case 'card':
        return (
          <div className="p-4 rounded-xl border" style={{ borderColor: 'GrayText' as any }}>
            <h3 className="text-base font-semibold mb-1" style={{ color: fgKey as any }}>
              Card Title
            </h3>
            <p className="text-sm opacity-75" style={{ color: 'GrayText' as any }}>
              Card description with supporting text below.
            </p>
          </div>
        );
      case 'bg':
        return (
          <div className="px-4 py-2 rounded-lg text-center">
            <span className="text-sm font-semibold" style={{ color: fgKey as any }}>
              Selected / Highlighted
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl p-5 space-y-3" style={containerStyle}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60" style={{ color: fgKey as any }}>
          {label}
        </span>
        <span className="text-[10px] font-mono opacity-50" style={{ color: fgKey as any }}>
          {fgKey} / {bgKey}
        </span>
      </div>
      <div className="flex items-center justify-center min-h-[60px]">
        {renderElement()}
      </div>
    </div>
  );
}

// ── CSS Code Generator ──────────────────────────────────────────────────────

function CodeBlock({ code, language, label }: { code: string; language: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 rounded-t-lg border border-b-0 border-slate-700">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label || language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 bg-slate-900 rounded-b-lg border border-slate-700 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Generate Usage CSS ──────────────────────────────────────────────────────

function generateBaseThemeCSS(): string {
  return `/* ── Use system colors instead of hardcoded values ── */

:root {
  /* Let the OS handle light/dark mode automatically */
  color-scheme: light dark;
}

/* Body — adapts to OS theme without media queries */
body {
  background-color: Canvas;
  color: CanvasText;
}

/* Links — matches the user's browser link color */
a {
  color: LinkText;
}
a:visited {
  color: VisitedText;
}
a:active {
  color: ActiveText;
}

/* Buttons — match native OS look */
button, .btn {
  background-color: ButtonFace;
  color: ButtonText;
  border: 1px solid ButtonBorder;
}

/* Form inputs */
input, select, textarea {
  background-color: Field;
  color: FieldText;
}

/* Selection highlighting */
::selection {
  background-color: Highlight;
  color: HighlightText;
}

/* Disabled / muted text */
.text-muted, .text-disabled {
  color: GrayText;
}

/* Marked text (like <mark>) */
mark {
  background-color: Mark;
  color: MarkText;
}`;
}

function generateAccessibilityCSS(): string {
  return `/* ── High Contrast & Forced Colors ── */

/* System colors automatically adapt to forced-colors mode.
   No media queries needed — just use system colors! */

/* If you need to add borders that show in forced colors: */
.card {
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

@media (forced-colors: active) {
  .card {
    border-color: CanvasText; /* Visible border in forced colors */
  }
}

/* Override system colors for specific elements: */
.override-example {
  /* Use system colors as a base, then customize */
  background-color: Canvas;
  color: CanvasText;
  border-color: ButtonBorder;
}

/* Forced colors mode will respect these automatically */
@media (forced-colors: active) {
  .override-example {
    /* Your custom styles may be overridden by the OS */
    /* That's fine — the user needs high contrast! */
  }
}`;
}

function generatePatternCSS(): string {
  return `/* ── Common UI Pattern Examples ── */

/* Card component */
.card {
  background-color: Canvas;
  color: CanvasText;
  border: 1px solid ButtonBorder;
  border-radius: 8px;
  padding: 1.5rem;
}

/* Primary button */
.btn-primary {
  background-color: Highlight;
  color: HighlightText;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover {
  opacity: 0.9;
}

/* Input group */
.input-group input {
  background-color: Field;
  color: FieldText;
  border: 1px solid ButtonBorder;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

/* Tooltip */
.tooltip {
  background-color: InfoBackground;
  color: InfoText;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* Menu / dropdown */
.menu {
  background-color: Menu;
  color: MenuText;
  border: 1px solid ButtonBorder;
  border-radius: 8px;
  padding: 0.25rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

/* Selection styles */
::selection {
  background-color: Highlight;
  color: HighlightText;
}`;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CSSSystemColors() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredColors = useMemo(() => {
    if (!activeCategory) return SYSTEM_COLORS;
    return SYSTEM_COLORS.filter((c) => c.category === activeCategory);
  }, [activeCategory]);

  const handleCopy = useCallback((name: string) => {
    navigator.clipboard.writeText(name);
    toast.success(`Copied ${name}!`);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(SYSTEM_COLORS.map((c) => c.category));
    return Array.from(cats);
  }, []);

  return (
    <ToolLayout
      title="CSS System Colors Playground"
      description="Explore all CSS system colors — OS-adaptive color tokens that automatically match light/dark mode, high contrast, and forced colors. No media queries needed."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !activeCategory
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            All Colors
          </button>
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                  cat === activeCategory
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                <Icon className="w-3 h-3" />
                {meta.label}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="space-y-12">
        {/* ── Intro / Explanation ── */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 flex-shrink-0">
              <Contrast className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">What are CSS System Colors?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                System colors are CSS color keywords that map to the user&apos;s operating system theme. 
                They automatically adapt to <strong className="text-slate-300">light mode</strong>, <strong className="text-slate-300">dark mode</strong>, 
                <strong className="text-slate-300"> high contrast mode</strong>, and <strong className="text-slate-300">forced colors</strong> — 
                without a single media query. Modern browsers fully support them, making them the simplest way 
                to build accessible, theme-aware UIs.
              </p>
            </div>
          </div>
        </div>

        {/* ── Color Grid ── */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand-400" />
            Color Reference ({filteredColors.length} colors)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredColors.map((color) => (
              <ColorSwatch key={color.name} {...color} onCopy={handleCopy} />
            ))}
          </div>
        </section>

        {/* ── Live UI Patterns ── */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-brand-400" />
            Live UI Pattern Previews
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            See how system colors look applied to real UI elements. These adapt to your OS theme automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {UI_PATTERNS.map((pattern) => (
              <PatternCard key={pattern.label} {...pattern} />
            ))}
          </div>
        </section>

        {/* ── Code Snippets ── */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Copy className="w-5 h-5 text-brand-400" />
            Ready-to-Use CSS
          </h2>

          <div className="space-y-4">
            <CodeBlock
              code={generateBaseThemeCSS()}
              language="CSS"
              label="Base Theme — Light/Dark Auto-Adapting"
            />

            <CodeBlock
              code={generatePatternCSS()}
              language="CSS"
              label="Common UI Patterns (Button, Card, Input, Menu)"
            />

            <CodeBlock
              code={generateAccessibilityCSS()}
              language="CSS"
              label="Accessibility — Forced Colors & High Contrast"
            />
          </div>
        </section>

        {/* ── Pro Tips ── */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-400" />
            Pro Tips
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-2">🔧 No Media Queries Needed</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Skip <code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">@media (prefers-color-scheme: dark)</code> entirely.
                Use <code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">background-color: Canvas; color: CanvasText;</code> and the
                OS handles the rest automatically.
              </p>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-2">♿ Free Accessibility</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                System colors <strong className="text-slate-300">automatically</strong> work in forced-colors mode. Users with high contrast 
                settings see your UI in their preferred color scheme with zero extra work on your part.
              </p>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-2">🎨 Customize Selectively</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Use system colors as your base, then override with custom properties or hardcoded colors 
                where you want branded styles. System colors work great with CSS custom properties.
              </p>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-2">⚡ Works Everywhere</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                System colors are supported in <strong className="text-slate-300">all modern browsers</strong> — Chrome, Firefox, 
                Safari, and Edge. They&apos;ve been in the CSS spec since CSS Color Level 3 and are universally reliable.
              </p>
            </div>
          </div>
        </section>

        {/* ── Quick Reference Table ── */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Contrast className="w-5 h-5 text-brand-400" />
            Quick Reference: When to Use Each Color
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Use Case</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Text Color</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Background</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Page body</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">CanvasText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">Canvas</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Buttons</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">ButtonText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">ButtonFace</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Links</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">LinkText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">Canvas</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Form inputs</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">FieldText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">Field</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Text selection</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">HighlightText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">Highlight</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Disabled text</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">GrayText</code></td>
                  <td className="px-4 py-3"><code className="text-slate-500 text-xs">—</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Marked / highlighted</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">MarkText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">Mark</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Tooltips</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">InfoText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">InfoBackground</code></td>
                </tr>
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">Menus / dropdowns</td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">MenuText</code></td>
                  <td className="px-4 py-3"><code className="text-brand-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">Menu</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ToolLayout>
  );
}
