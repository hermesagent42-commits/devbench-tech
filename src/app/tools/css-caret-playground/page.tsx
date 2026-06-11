'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, RefreshCw, Code2, Type, PaintBucket, GripHorizontal, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type CaretShape = 'bar' | 'block' | 'underscore';

interface Preset {
  name: string;
  description: string;
  caretColor: string;
  caretShape: CaretShape;
  bgColor: string;
  textColor: string;
  fontSize: string;
  placeholder: string;
}

interface ComparisonSlot {
  label: string;
  caretColor: string;
  caretShape: CaretShape;
  bgColor: string;
  textColor: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Neon Cyan',
    description: 'Bright cyan cursor on dark background — terminal vibes',
    caretColor: '#06b6d4',
    caretShape: 'bar',
    bgColor: '#0f172a',
    textColor: '#e2e8f0',
    fontSize: '16px',
    placeholder: 'Type here — neon cyan caret...',
  },
  {
    name: 'Amber Retro',
    description: 'Warm amber block cursor — vintage CRT terminal feel',
    caretColor: '#f59e0b',
    caretShape: 'block',
    bgColor: '#1c1917',
    textColor: '#fbbf24',
    fontSize: '16px',
    placeholder: 'Amber block caret — retro terminal...',
  },
  {
    name: 'Minimal Gray',
    description: 'Subtle gray bar — clean, professional, unobtrusive',
    caretColor: '#94a3b8',
    caretShape: 'bar',
    bgColor: '#ffffff',
    textColor: '#0f172a',
    fontSize: '16px',
    placeholder: 'Subtle gray caret — clean and professional...',
  },
  {
    name: 'Brand Purple',
    description: 'Vibrant purple underscore — distinctive brand feel',
    caretColor: '#a855f7',
    caretShape: 'underscore',
    bgColor: '#faf5ff',
    textColor: '#4c1d95',
    fontSize: '16px',
    placeholder: 'Purple underscore caret — brand style...',
  },
  {
    name: 'Code Editor',
    description: 'Classic VS Code-style bright bar on dark background',
    caretColor: '#f8f8f2',
    caretShape: 'bar',
    bgColor: '#1e1e1e',
    textColor: '#d4d4d4',
    fontSize: '14px',
    placeholder: 'VS Code-style caret — monospace feel...',
  },
  {
    name: 'Overwrite Mode',
    description: 'Block caret simulating overwrite/insert toggle',
    caretColor: '#ef4444',
    caretShape: 'block',
    bgColor: '#fef2f2',
    textColor: '#991b1b',
    fontSize: '16px',
    placeholder: 'Red block — overwrite mode indicator...',
  },
  {
    name: 'Green Matrix',
    description: 'Green underscore on black — hacker aesthetic',
    caretColor: '#22c55e',
    caretShape: 'underscore',
    bgColor: '#000000',
    textColor: '#4ade80',
    fontSize: '16px',
    placeholder: 'Matrix green underscore caret...',
  },
  {
    name: 'Accessible High Contrast',
    description: 'Black block on white — maximum visibility for accessibility',
    caretColor: '#000000',
    caretShape: 'block',
    bgColor: '#ffffff',
    textColor: '#000000',
    fontSize: '18px',
    placeholder: 'High contrast block — accessible...',
  },
];

// ── Comparison Slots ───────────────────────────────────────────────────────

const COMPARISON_SLOTS: ComparisonSlot[] = [
  {
    label: 'Bar (default)',
    caretColor: '#3b82f6',
    caretShape: 'bar',
    bgColor: '#0f172a',
    textColor: '#e2e8f0',
  },
  {
    label: 'Block',
    caretColor: '#f59e0b',
    caretShape: 'block',
    bgColor: '#0f172a',
    textColor: '#e2e8f0',
  },
  {
    label: 'Underscore',
    caretColor: '#22c55e',
    caretShape: 'underscore',
    bgColor: '#0f172a',
    textColor: '#e2e8f0',
  },
  {
    label: 'Thin Bar',
    caretColor: '#ec4899',
    caretShape: 'bar',
    bgColor: '#fdf2f8',
    textColor: '#831843',
  },
  {
    label: 'Wide Block',
    caretColor: '#8b5cf6',
    caretShape: 'block',
    bgColor: '#f5f3ff',
    textColor: '#4c1d95',
  },
  {
    label: 'Subtle Underscore',
    caretColor: '#64748b',
    caretShape: 'underscore',
    bgColor: '#f8fafc',
    textColor: '#334155',
  },
];

// ── CSS Output Generator ───────────────────────────────────────────────────

function generateCSS(caretColor: string, caretShape: CaretShape): string {
  const shapeComment =
    caretShape === 'bar'
      ? 'Thin vertical line (default)'
      : caretShape === 'block'
        ? 'Solid rectangle covering the character'
        : 'Horizontal line under the character';

  return `/* ── CSS Caret Styling ──────────────────────────────── */
/*
 * caret-color — sets the color of the text input cursor
 * caret-shape — sets the shape (bar, block, underscore)
 * caret       — shorthand for both
 *
 * Supported on: <input>, <textarea>, [contenteditable]
 */

/* ── Individual Properties ─────────────────────────── */

input, textarea, [contenteditable] {
  caret-color: ${caretColor};
  caret-shape: ${caretShape};  /* ${shapeComment} */
}

/* ── Shorthand ─────────────────────────────────────── */

input, textarea, [contenteditable] {
  caret: ${caretShape} ${caretColor};
}

/* ── Auto (match text color) ────────────────────────── */

input, textarea, [contenteditable] {
  caret-color: auto;  /* Matches the element's color property */
}

/* ── Transparent (hidden caret) ─────────────────────── */

.readonly-display {
  caret-color: transparent;  /* Hide caret for read-only displays */
}

/* ── Per-input styling ──────────────────────────────── */

input[type="text"] {
  caret: bar #3b82f6;
}

input[type="search"] {
  caret: block #f59e0b;
}

textarea {
  caret: underscore #22c55e;
}

/* ── Animation (caret-color only) ───────────────────── */

@keyframes caret-pulse {
  0%, 100% { caret-color: #3b82f6; }
  50%      { caret-color: #60a5fa; }
}

input:focus {
  animation: caret-pulse 1.5s ease-in-out infinite;
}

/* ── Browser Support ───────────────────────────────── */
/*
 * caret-color:
 *   Chrome 57+   ✅
 *   Firefox 53+  ✅
 *   Safari 11.1+ ✅
 *   Edge 79+     ✅
 *
 * caret-shape:
 *   Chrome 133+  ✅
 *   Firefox 135+ ✅
 *   Safari 18.4+ ✅
 *   Edge 133+    ✅
 *
 * Baseline 2026 — available in all modern browsers.
 * https://caniuse.com/mdn-css_properties_caret-color
 * https://caniuse.com/mdn-css_properties_caret-shape
 */`;
}

function generateTailwind(caretColor: string, caretShape: CaretShape): string {
  return `{/* ── Tailwind CSS: Caret Styling ──────────────────── */}

{/* Use arbitrary value syntax */}
<input
  type="text"
  className="[caret-color:#${caretColor.replace('#', '')}] [caret-shape:${caretShape}]"
  placeholder="Styled caret input"
/>

<textarea
  className="[caret:${caretShape}_#${caretColor.replace('#', '')}]"
  placeholder="Styled caret textarea"
/>

{/* Or define custom utilities in tailwind.config.ts */}
const config = {
  theme: {
    extend: {
      // Custom utility classes
    }
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.caret-bar': {
          'caret-shape': 'bar',
        },
        '.caret-block': {
          'caret-shape': 'block',
        },
        '.caret-underscore': {
          'caret-shape': 'underscore',
        },
        '.caret-auto': {
          'caret-color': 'auto',
        },
        '.caret-transparent': {
          'caret-color': 'transparent',
        },
      })
    }
  ]
}`;
}

// ── Code Block Component ────────────────────────────────────────────────────

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
      <pre className="p-4 bg-slate-900 rounded-b-lg border border-slate-700 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed max-h-[500px] overflow-y-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Color Picker Component ──────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider w-24 shrink-0">
        {label}
      </label>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border-2 border-slate-600 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') {
            onChange(v);
          }
        }}
        className="w-28 px-3 py-1.5 text-sm font-mono bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
        placeholder="#000000"
      />
    </div>
  );
}

// ── Shape Selector ──────────────────────────────────────────────────────────

function ShapeSelector({
  value,
  onChange,
}: {
  value: CaretShape;
  onChange: (shape: CaretShape) => void;
}) {
  const shapes: { value: CaretShape; label: string; icon: string; desc: string }[] = [
    { value: 'bar', label: 'Bar', icon: '▎', desc: 'Thin vertical line (default)' },
    { value: 'block', label: 'Block', icon: '█', desc: 'Solid rectangle over character' },
    { value: 'underscore', label: 'Underscore', icon: '▁', desc: 'Horizontal line below text' },
  ];

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider w-24 shrink-0">
        Shape
      </span>
      <div className="flex gap-2">
        {shapes.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
              value === s.value
                ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
            title={s.desc}
          >
            <span className="text-lg">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Live Caret Demo Input ───────────────────────────────────────────────────

function LiveCaretInput({
  caretColor,
  caretShape,
  bgColor,
  textColor,
  fontSize,
  placeholder,
}: {
  caretColor: string;
  caretShape: CaretShape;
  bgColor: string;
  textColor: string;
  fontSize: string;
  placeholder: string;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount so the caret is visible immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [caretColor, caretShape]);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        style={{
          caretColor: caretColor === 'auto' ? 'auto' : caretColor,
          caretShape: caretShape as any,
          backgroundColor: bgColor,
          color: textColor,
          fontSize,
          fontFamily: 'inherit',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: `2px solid ${caretColor}40`,
          outline: 'none',
          width: '100%',
          transition: 'border-color 0.2s',
        }}
        className="focus:border-current"
        onFocus={(e) => {
          e.currentTarget.style.borderColor = caretColor;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = `${caretColor}40`;
        }}
      />
      <p className="text-xs text-slate-500">
        Click the input above and start typing — the caret uses your selected color and shape.
      </p>
    </div>
  );
}

// ── Comparison Card ─────────────────────────────────────────────────────────

function ComparisonCard({ slot }: { slot: ComparisonSlot }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{slot.label}</span>
        <span
          className="w-3 h-3 rounded-full border border-slate-600"
          style={{ backgroundColor: slot.caretColor }}
        />
      </div>
      <input
        ref={inputRef}
        type="text"
        defaultValue="Click to see caret"
        onFocus={() => {}} // just to show caret
        style={{
          caretColor: slot.caretColor,
          caretShape: slot.caretShape as any,
          backgroundColor: slot.bgColor,
          color: slot.textColor,
          fontSize: '14px',
          fontFamily: 'inherit',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          border: `1px solid ${slot.bgColor === '#0f172a' ? '#334155' : '#cbd5e1'}`,
          outline: 'none',
          width: '100%',
        }}
        readOnly
      />
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function CSSCaretPlayground() {
  const [caretColor, setCaretColor] = useState('#3b82f6');
  const [caretShape, setCaretShape] = useState<CaretShape>('bar');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [textColor, setTextColor] = useState('#e2e8f0');
  const [fontSize, setFontSize] = useState('16px');
  const [placeholder, setPlaceholder] = useState('Type here to see your caret style...');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showCSS, setShowCSS] = useState(false);
  const [showTailwind, setShowTailwind] = useState(false);

  const applyPreset = useCallback((preset: Preset) => {
    setCaretColor(preset.caretColor);
    setCaretShape(preset.caretShape);
    setBgColor(preset.bgColor);
    setTextColor(preset.textColor);
    setFontSize(preset.fontSize);
    setPlaceholder(preset.placeholder);
    setActivePreset(preset.name);
  }, []);

  const reset = useCallback(() => {
    setCaretColor('#3b82f6');
    setCaretShape('bar');
    setBgColor('#0f172a');
    setTextColor('#e2e8f0');
    setFontSize('16px');
    setPlaceholder('Type here to see your caret style...');
    setActivePreset(null);
  }, []);

  const cssCode = generateCSS(caretColor, caretShape);
  const tailwindCode = generateTailwind(caretColor, caretShape);

  return (
    <ToolLayout
      title="CSS Caret Playground"
      description="Design custom text input cursors — caret-color, caret-shape (bar, block, underscore), and the caret shorthand. Live preview, 8 presets, instant CSS + Tailwind output."
      controls={
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* ── Presets ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <PaintBucket className="w-4 h-4 text-brand-400" />
            Presets
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  activePreset === preset.name
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: preset.caretColor }}
                  />
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {preset.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Controls ────────────────────────────────────────────── */}
        <section className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/20 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-brand-400" />
            Customize
          </h2>

          <ColorPicker value={caretColor} onChange={setCaretColor} label="Caret Color" />
          <ShapeSelector value={caretShape} onChange={setCaretShape} />
          <ColorPicker value={bgColor} onChange={setBgColor} label="Background" />
          <ColorPicker value={textColor} onChange={setTextColor} label="Text Color" />

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider w-24 shrink-0">
              Font Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {['12px', '14px', '16px', '18px', '20px', '24px'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider w-24 shrink-0">
              Placeholder
            </label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </section>

        {/* ── Live Preview ────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-400" />
            Live Preview
          </h2>
          <LiveCaretInput
            caretColor={caretColor}
            caretShape={caretShape}
            bgColor={bgColor}
            textColor={textColor}
            fontSize={fontSize}
            placeholder={placeholder}
          />
        </section>

        {/* ── Comparison Grid ─────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Type className="w-4 h-4 text-brand-400" />
            Shape Comparison
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Click any input to see the caret shape in action. Each slot uses a different
            color + shape combination.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COMPARISON_SLOTS.map((slot) => (
              <ComparisonCard key={slot.label} slot={slot} />
            ))}
          </div>
        </section>

        {/* ── CSS Output ──────────────────────────────────────────── */}
        <section>
          <button
            onClick={() => setShowCSS(!showCSS)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3 hover:text-brand-400 transition-colors"
          >
            <Code2 className="w-4 h-4 text-brand-400" />
            Generated CSS
            <span className="text-xs text-slate-500">
              {showCSS ? '▼' : '▶'}
            </span>
          </button>
          {showCSS && <CodeBlock code={cssCode} language="CSS" />}
        </section>

        {/* ── Tailwind Output ─────────────────────────────────────── */}
        <section>
          <button
            onClick={() => setShowTailwind(!showTailwind)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3 hover:text-brand-400 transition-colors"
          >
            <Code2 className="w-4 h-4 text-brand-400" />
            Tailwind CSS / JSX
            <span className="text-xs text-slate-500">
              {showTailwind ? '▼' : '▶'}
            </span>
          </button>
          {showTailwind && <CodeBlock code={tailwindCode} language="TSX" />}
        </section>

        {/* ── Browser Support ─────────────────────────────────────── */}
        <section className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/20">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Browser Support</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { browser: 'Chrome', version: '133+', status: '✅' },
              { browser: 'Firefox', version: '135+', status: '✅' },
              { browser: 'Safari', version: '18.4+', status: '✅' },
              { browser: 'Edge', version: '133+', status: '✅' },
            ].map((b) => (
              <div
                key={b.browser}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30"
              >
                <span className="text-slate-300 font-medium">{b.browser}</span>
                <span className="text-slate-500">
                  {b.version} {b.status}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            <code className="text-brand-400 bg-brand-400/10 px-1 py-0.5 rounded text-[11px]">
              caret-color
            </code>{' '}
            has been supported since Chrome 57 / Firefox 53 / Safari 11.1.{' '}
            <code className="text-brand-400 bg-brand-400/10 px-1 py-0.5 rounded text-[11px]">
              caret-shape
            </code>{' '}
            is newer — Baseline 2026 across all modern browsers. The{' '}
            <code className="text-brand-400 bg-brand-400/10 px-1 py-0.5 rounded text-[11px]">
              caret
            </code>{' '}
            shorthand works wherever both properties are supported.
          </p>
        </section>
      </div>
    </ToolLayout>
  );
}
