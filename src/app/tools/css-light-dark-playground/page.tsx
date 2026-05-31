'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Sun, Moon, RefreshCw, PaintBucket, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Preset {
  name: string;
  description: string;
  lightColor: string;
  darkColor: string;
  property: string;
}

interface ExampleCard {
  label: string;
  cssProperty: string;
  element: 'text' | 'bg' | 'border' | 'shadow' | 'fill';
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Body Text',
    description: 'Standard body copy — #1e293b light, #e2e8f0 dark',
    lightColor: '#1e293b',
    darkColor: '#e2e8f0',
    property: 'color',
  },
  {
    name: 'Page Background',
    description: 'White bg → dark slate',
    lightColor: '#ffffff',
    darkColor: '#0f172a',
    property: 'background-color',
  },
  {
    name: 'Card Surface',
    description: 'Light card → elevated dark card',
    lightColor: '#ffffff',
    darkColor: '#1e293b',
    property: 'background-color',
  },
  {
    name: 'Primary Accent',
    description: 'Blue-600 → blue-400',
    lightColor: '#2563eb',
    darkColor: '#60a5fa',
    property: 'color',
  },
  {
    name: 'Success Green',
    description: 'Emerald-600 → emerald-400',
    lightColor: '#059669',
    darkColor: '#34d399',
    property: 'background-color',
  },
  {
    name: 'Muted Text',
    description: 'Slate-500 → slate-400',
    lightColor: '#64748b',
    darkColor: '#94a3b8',
    property: 'color',
  },
  {
    name: 'Border',
    description: 'Slate-200 → slate-700',
    lightColor: '#e2e8f0',
    darkColor: '#334155',
    property: 'border-color',
  },
  {
    name: 'Warning Amber',
    description: 'Amber-500 → amber-300',
    lightColor: '#f59e0b',
    darkColor: '#fcd34d',
    property: 'background-color',
  },
  {
    name: 'Danger Red',
    description: 'Red-600 → red-400',
    lightColor: '#dc2626',
    darkColor: '#f87171',
    property: 'color',
  },
  {
    name: 'Info Blue',
    description: 'Sky-600 → sky-300',
    lightColor: '#0284c7',
    darkColor: '#7dd3fc',
    property: 'background-color',
  },
  {
    name: 'Box Shadow',
    description: 'Soft shadow → dark glow',
    lightColor: 'rgba(0,0,0,0.1)',
    darkColor: 'rgba(255,255,255,0.08)',
    property: 'box-shadow',
  },
  {
    name: 'Subtle Surface',
    description: 'Slate-50 → slate-800',
    lightColor: '#f8fafc',
    darkColor: '#1e293b',
    property: 'background-color',
  },
];

// ── Example Cards ───────────────────────────────────────────────────────────

const EXAMPLE_CARDS: ExampleCard[] = [
  { label: 'Heading Text', cssProperty: 'color', element: 'text' },
  { label: 'Card Background', cssProperty: 'background-color', element: 'bg' },
  { label: 'Button Accent', cssProperty: 'background-color', element: 'bg' },
  { label: 'Border', cssProperty: 'border-color', element: 'border' },
  { label: 'Link Color', cssProperty: 'color', element: 'text' },
  { label: 'Badge', cssProperty: 'background-color', element: 'bg' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function isValidHexOrColor(val: string): boolean {
  if (/^#[0-9a-fA-F]{3,8}$/.test(val)) return true;
  if (/^rgba?\(/.test(val)) return true;
  if (/^hsla?\(/.test(val)) return true;
  // named colors
  if (/^[a-zA-Z]+$/.test(val) && CSS.supports('color', val)) return true;
  return false;
}

function generateCSS(
  lightColor: string,
  darkColor: string,
  property: string
): string {
  if (!isValidHexOrColor(lightColor) || !isValidHexOrColor(darkColor)) {
    return '/* Enter valid colors above */';
  }

  const lines: string[] = [];
  lines.push('/* Set color-scheme on :root for light-dark() to work */');
  lines.push(':root {');
  lines.push('  color-scheme: light dark;');
  lines.push('}');
  lines.push('');
  lines.push('/* Use light-dark() in any color property */');
  lines.push(`.my-element {`);
  lines.push(`  ${property}: light-dark(${lightColor}, ${darkColor});`);
  lines.push('}');
  lines.push('');
  lines.push('/* Fallback for older browsers without light-dark() support */');
  lines.push('.my-element {');
  lines.push(`  ${property}: ${lightColor}; /* light default */`);
  lines.push('}');
  lines.push('@media (prefers-color-scheme: dark) {');
  lines.push('  .my-element {');
  lines.push(`    ${property}: ${darkColor};`);
  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

function generateTailwind(
  lightColor: string,
  darkColor: string,
  property: string
): string {
  if (!isValidHexOrColor(lightColor) || !isValidHexOrColor(darkColor)) {
    return '/* Enter valid colors above */';
  }
  const tailwindProp = property.replace('background-color', 'bg').replace('border-color', 'border');
  return `<!-- Use arbitrary values for light-dark() -->
<div class="${tailwindProp}-[light-dark(${lightColor},${darkColor})]">
  Adaptive element
</div>

<!-- Or: configure in tailwind.config.ts -->
<script>
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        adaptive: 'light-dark(${lightColor}, ${darkColor})',
      }
    }
  }
}
</script>`;
}

// ── Color Picker Wrapper ────────────────────────────────────────────────────

function ColorInput({
  label,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={
            /^#[0-9a-fA-F]{3,8}$/.test(value)
              ? value.length === 7 ? value : value
              : '#000000'
          }
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer bg-transparent p-0.5 flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ── Live Preview Card ──────────────────────────────────────────────────────

function LivePreview({
  lightColor,
  darkColor,
  property,
}: {
  lightColor: string;
  darkColor: string;
  property: string;
}) {
  const value = `light-dark(${lightColor || '#000'}, ${darkColor || '#fff'})`;

  const style: React.CSSProperties = {};
  if (property === 'color') style.color = value as any;
  else if (property === 'background-color') style.backgroundColor = value as any;
  else if (property === 'border-color') {
    style.borderColor = value as any;
    style.borderWidth = '2px';
    style.borderStyle = 'solid';
  } else if (property === 'box-shadow') {
    style.boxShadow = `0 2px 12px ${value}`;
  } else {
    (style as any)[property] = value;
  }

  return (
    <div
      className="rounded-xl p-6 flex items-center justify-center min-h-[120px] transition-colors duration-300"
      style={{
        ...style,
        colorScheme: 'light dark',
      }}
    >
      <div className="text-center">
        <p
          className="text-lg font-semibold"
          style={property === 'color' ? { color: value as any } : property === 'background-color' ? { color: '#94a3b8' } : {}}
        >
          Preview
        </p>
        <p
          className="text-xs mt-1 opacity-60 font-mono"
          style={property === 'color' ? { color: value as any } : property === 'background-color' ? { color: '#94a3b8' } : {}}
        >
          {property}: {value}
        </p>
      </div>
    </div>
  );
}

// ── Multi-Example Grid ─────────────────────────────────────────────────────

function ExampleGrid({
  lightColor,
  darkColor,
}: {
  lightColor: string;
  darkColor: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {EXAMPLE_CARDS.map((ex) => {
        const value = `light-dark(${lightColor || '#000'}, ${darkColor || '#fff'})`;
        const style: React.CSSProperties = { colorScheme: 'light dark' };

        if (ex.element === 'text') {
          style.color = value as any;
          style.backgroundColor = 'transparent';
        } else if (ex.element === 'bg') {
          style.backgroundColor = value as any;
          style.color = '#94a3b8';
        } else if (ex.element === 'border') {
          style.borderColor = value as any;
          style.borderWidth = '2px';
          style.borderStyle = 'solid';
          style.color = '#94a3b8';
          style.backgroundColor = 'transparent';
        } else if (ex.element === 'shadow') {
          style.boxShadow = `0 2px 12px ${value}`;
          style.color = '#94a3b8';
        } else if (ex.element === 'fill') {
          style.fill = value as any;
        }

        return (
          <div
            key={ex.label}
            className="rounded-lg p-4 text-center transition-colors duration-300"
            style={style}
          >
            <span className="text-xs font-medium">
              {ex.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Code Block ──────────────────────────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language: string }) {
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
          {language}
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

// ── Main Component ──────────────────────────────────────────────────────────

export default function CSSLightDarkPlayground() {
  const [lightColor, setLightColor] = useState('#1e293b');
  const [darkColor, setDarkColor] = useState('#e2e8f0');
  const [property, setProperty] = useState('color');
  const [showTailwind, setShowTailwind] = useState(false);

  const cssCode = useMemo(
    () => generateCSS(lightColor, darkColor, property),
    [lightColor, darkColor, property]
  );

  const tailwindCode = useMemo(
    () => generateTailwind(lightColor, darkColor, property),
    [lightColor, darkColor, property]
  );

  const handlePreset = useCallback((preset: Preset) => {
    setLightColor(preset.lightColor);
    setDarkColor(preset.darkColor);
    setProperty(preset.property);
  }, []);

  const handleReset = useCallback(() => {
    setLightColor('#1e293b');
    setDarkColor('#e2e8f0');
    setProperty('color');
  }, []);

  const bothValid = isValidHexOrColor(lightColor) && isValidHexOrColor(darkColor);

  return (
    <ToolLayout
      title="CSS light-dark() Playground"
      description="Build mode-adaptive colors with the light-dark() CSS function. Define light and dark variants in a single declaration — Baseline 2024."
      controls={
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Monitor className="w-3.5 h-3.5" />
          <span>Responds to system color scheme</span>
        </div>
      }
    >
      <div className="space-y-8">
        {/* ── Color Inputs ─────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-surface-light border border-slate-700/50 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Light Mode Color
            </h3>
            <ColorInput
              label="Color"
              value={lightColor}
              onChange={setLightColor}
              icon={Sun}
            />
            <p className="text-xs text-slate-500">
              This color is used when the user prefers light color scheme.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface-light border border-slate-700/50 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              Dark Mode Color
            </h3>
            <ColorInput
              label="Color"
              value={darkColor}
              onChange={setDarkColor}
              icon={Moon}
            />
            <p className="text-xs text-slate-500">
              This color is used when the user prefers dark color scheme.
            </p>
          </div>
        </section>

        {/* ── CSS Property Selector ────────────────────────── */}
        <section className="p-5 rounded-xl bg-surface-light border border-slate-700/50">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-3">
            CSS Property
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'color', label: 'color' },
              { value: 'background-color', label: 'background-color' },
              { value: 'border-color', label: 'border-color' },
              { value: 'box-shadow', label: 'box-shadow' },
              { value: 'text-decoration-color', label: 'text-decoration-color' },
              { value: 'outline-color', label: 'outline-color' },
              { value: 'caret-color', label: 'caret-color' },
              { value: 'accent-color', label: 'accent-color' },
              { value: 'fill', label: 'fill (SVG)' },
              { value: 'stroke', label: 'stroke (SVG)' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setProperty(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  property === value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Live Preview ─────────────────────────────────── */}
        {bothValid && (
          <section>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Live Preview</h3>
            <LivePreview lightColor={lightColor} darkColor={darkColor} property={property} />
          </section>
        )}

        {/* ── Example Cards ────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            How It Looks Across UI Elements
          </h3>
          <ExampleGrid lightColor={lightColor} darkColor={darkColor} />
          <p className="text-xs text-slate-500 mt-2">
            Switch your OS/browser to dark mode to see these update live.
          </p>
        </section>

        {/* ── Presets ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">Presets</h3>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset)}
                className="text-left p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-brand-500/50 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: preset.lightColor }}
                  />
                  <span className="text-xs text-slate-400">→</span>
                  <span
                    className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: preset.darkColor }}
                  />
                </div>
                <p className="text-xs font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                  {preset.name}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{preset.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── CSS Output ────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Generated Code</h3>
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setShowTailwind(false)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  !showTailwind
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CSS
              </button>
              <button
                onClick={() => setShowTailwind(true)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  showTailwind
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tailwind
              </button>
            </div>
          </div>
          <CodeBlock
            code={showTailwind ? tailwindCode : cssCode}
            language={showTailwind ? 'Tailwind / HTML' : 'CSS'}
          />
        </section>

        {/* ── How It Works ──────────────────────────────────── */}
        <section className="p-5 rounded-xl bg-surface-light border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <PaintBucket className="w-4 h-4 text-brand-400" />
            How light-dark() Works
          </h3>
          <div className="space-y-3 text-sm text-slate-400">
            <p>
              <code className="text-brand-300 bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
                light-dark(lightColor, darkColor)
              </code>{' '}
              is a CSS color function that returns the first argument in light mode
              and the second in dark mode.
            </p>
            <div className="space-y-1.5">
              <p className="font-medium text-slate-300">Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-500">
                <li>
                  <code className="text-brand-300 bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">
                    color-scheme: light dark;
                  </code>{' '}
                  must be set (usually on <code className="text-brand-300 bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">:root</code>)
                </li>
                <li>The user&apos;s OS/browser must have a light or dark preference</li>
                <li>Works with any CSS property that accepts a color value</li>
                <li>Baseline 2024 — supported in all modern browsers</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 mt-3">
              <p className="text-xs text-slate-300">
                <strong className="text-brand-300">💡 Pro tip:</strong> Combine with CSS custom properties for a complete theming system:
              </p>
              <pre className="mt-2 text-[11px] font-mono text-slate-400">
                {`:root {\n  color-scheme: light dark;\n  --text: light-dark(#1e293b, #e2e8f0);\n  --surface: light-dark(#fff, #0f172a);\n}\n\nbody {\n  color: var(--text);\n  background: var(--surface);\n}`}
              </pre>
            </div>
          </div>
        </section>

        {/* ── Browser Support ───────────────────────────────── */}
        <section className="p-5 rounded-xl bg-surface-light border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Browser Support</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { browser: 'Chrome', version: '123+', icon: '🌐' },
              { browser: 'Firefox', version: '120+', icon: '🦊' },
              { browser: 'Safari', version: '17.5+', icon: '🧭' },
              { browser: 'Edge', version: '123+', icon: '🔷' },
            ].map(({ browser, version, icon }) => (
              <div
                key={browser}
                className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-center"
              >
                <span className="text-lg">{icon}</span>
                <p className="text-xs font-medium text-slate-200 mt-1">{browser}</p>
                <p className="text-[10px] text-brand-400">{version}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ToolLayout>
  );
}
