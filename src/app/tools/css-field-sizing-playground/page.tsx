'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Maximize2, Minimize2, RefreshCw, Code2, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Preset {
  name: string;
  description: string;
  inputType: 'text' | 'textarea' | 'number' | 'email' | 'search';
  defaultValue: string;
  minWidth?: string;
}

interface ComparisonExample {
  label: string;
  element: 'input-text' | 'input-number' | 'input-email' | 'textarea' | 'select';
  width: string;
  placeholder: string;
  defaultValue: string;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Name Input',
    description: 'Auto-expands as you type longer names',
    inputType: 'text',
    defaultValue: 'John Smith',
    minWidth: '180px',
  },
  {
    name: 'Email Input',
    description: 'Grows to fit long email addresses',
    inputType: 'email',
    defaultValue: 'jane.doe@example.com',
    minWidth: '220px',
  },
  {
    name: 'Comment Box',
    description: 'Textarea that grows with your comment',
    inputType: 'textarea',
    defaultValue:
      'This textarea automatically resizes as you type. No JavaScript needed — pure CSS field-sizing: content handles everything.',
    minWidth: '100%',
  },
  {
    name: 'Search Field',
    description: 'Expands to fit search queries of any length',
    inputType: 'search',
    defaultValue: 'CSS field-sizing playground demo',
    minWidth: '200px',
  },
  {
    name: 'Phone Number',
    description: 'Accommodates international phone formats',
    inputType: 'text',
    defaultValue: '+1 (555) 123-4567',
    minWidth: '170px',
  },
  {
    name: 'Long URL',
    description: 'Auto-resizes for long URLs without truncation',
    inputType: 'text',
    defaultValue: 'https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing',
    minWidth: '200px',
  },
];

// ── Comparison Examples ────────────────────────────────────────────────────

const COMPARISON_EXAMPLES: ComparisonExample[] = [
  {
    label: 'Text Input',
    element: 'input-text',
    width: '100%',
    placeholder: 'Type something...',
    defaultValue: 'Short',
  },
  {
    label: 'Email Input',
    element: 'input-email',
    width: '100%',
    placeholder: 'email@example.com',
    defaultValue: 'user@domain.co',
  },
  {
    label: 'Number Input',
    element: 'input-number',
    width: '100%',
    placeholder: 'Number',
    defaultValue: '42',
  },
  {
    label: 'Textarea',
    element: 'textarea',
    width: '100%',
    placeholder: 'Write a message...',
    defaultValue: 'This textarea grows as you type more content. No JavaScript autoresize hacks needed.',
  },
  {
    label: 'Select Box',
    element: 'select',
    width: 'auto',
    placeholder: '',
    defaultValue: 'Regular option',
  },
];

// ── CSS Output Generator ───────────────────────────────────────────────────

function generateCSS(): string {
  return `/* ── CSS field-sizing: content ──────────────────────── */
/*
 * field-sizing: content — Baseline 2026
 * Makes form inputs auto-resize to fit their content.
 * No JavaScript, no hacks, no contenteditable divs.
 *
 * Supported on: <input>, <textarea>, <select>
 */

/* ── Basic Usage ───────────────────────────────────── */

/* Auto-resize any text input or textarea */
input[type="text"],
input[type="email"],
input[type="search"],
input[type="number"],
input[type="tel"],
input[type="url"],
textarea {
  field-sizing: content;
}

/* ── With a minimum width ──────────────────────────── */

.auto-resize-input {
  field-sizing: content;
  min-width: 150px;      /* Never shrink below this */
  max-width: 100%;       /* Don't overflow container */
}

/* ── Textarea that grows vertically ────────────────── */

.auto-resize-textarea {
  field-sizing: content;
  min-height: 40px;      /* Minimum height */
  max-height: 300px;     /* Cap at 300px, then scroll */
  resize: none;          /* Let field-sizing handle it */
}

/* ── Select that fits its options ──────────────────── */

select {
  field-sizing: content;
}

/* ── With :focus transition (fluid expand) ─────────── */

.fluid-search {
  width: 150px;
  field-sizing: content;
  transition: width 0.3s ease;
}

.fluid-search:focus {
  width: 300px;
  /* field-sizing still applies — the field
     will grow to fit content within the
     new width constraint */
}

/* ── Fallback for older browsers ───────────────────── */

@supports not (field-sizing: content) {
  textarea {
    resize: vertical;
    /* Fall back to manual resize handle */
  }
}

/* ── Complete Form Example ─────────────────────────── */

.comment-form input,
.comment-form textarea {
  field-sizing: content;
  min-width: 200px;
  max-width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font: inherit;
}

.comment-form textarea {
  min-height: 60px;
  max-height: 250px;
  resize: none;
}

/* ── Tailwind CSS ──────────────────────────────────── */
/*
 * Add to tailwind.config.ts:
 *
 * export default {
 *   theme: {
 *     extend: {
 *       // No built-in utility — use arbitrary:
 *       // <input class="[field-sizing:content]" />
 *     }
 *   }
 * }
 */

/* ── Browser Support ───────────────────────────────── */
/*
 * Chrome 123+   ✅
 * Firefox 128+  ✅
 * Safari 17.4+  ✅
 * Edge 123+     ✅
 *
 * Baseline 2026 — available in all modern browsers.
 * https://caniuse.com/mdn-css_properties_field-sizing
 */`;
}

function generateTailwind(): string {
  return `{/* ── Tailwind CSS: field-sizing ───────────────────── */}

{/* Use arbitrary value syntax */}
<input
  type="text"
  className="[field-sizing:content] min-w-[180px] max-w-full px-3 py-2 border rounded-lg"
  placeholder="Auto-resize input"
/>

<textarea
  className="[field-sizing:content] min-h-[60px] max-h-[250px] resize-none w-full px-3 py-2 border rounded-lg"
  placeholder="Auto-resize textarea"
/>

{/* Or define a custom utility */}
{/* tailwind.config.ts */}
const config = {
  theme: {
    extend: {
      // Custom utility class
    }
  },
  plugins: [
    // Or as a plugin:
    function({ addUtilities }) {
      addUtilities({
        '.field-sizing-content': {
          'field-sizing': 'content',
        },
        '.field-sizing-fixed': {
          'field-sizing': 'fixed',
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

// ── Live Input Demo ─────────────────────────────────────────────────────────

function LiveFieldSizingDemo({
  inputType,
  defaultValue,
  minWidth,
}: {
  inputType: Preset['inputType'];
  defaultValue: string;
  minWidth: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, inputType]);

  const sharedStyle: React.CSSProperties = {
    fieldSizing: 'content' as any,
    minWidth: minWidth === '100%' ? '100%' : minWidth,
    maxWidth: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: '0.5rem',
    border: '1px solid #475569',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  if (inputType === 'textarea') {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type to see auto-resize..."
          rows={1}
          style={{
            ...sharedStyle,
            minHeight: '48px',
            maxHeight: '250px',
            resize: 'none',
            width: '100%',
          }}
          className="focus:border-brand-500"
        />
        <p className="text-xs text-slate-500">
          Character count: <span className="text-slate-300 font-mono">{value.length}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type={inputType}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Type to see auto-resize (${inputType})...`}
        style={sharedStyle}
        className="focus:border-brand-500"
      />
      <p className="text-xs text-slate-500">
        Character count: <span className="text-slate-300 font-mono">{value.length}</span>
      </p>
    </div>
  );
}

// ── Side-by-Side Comparison ─────────────────────────────────────────────────

function SideBySideComparison() {
  const [content, setContent] = useState('Type here to compare...');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Test Text
        </label>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type to see the difference..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fixed sizing */}
        <div className="p-5 rounded-xl bg-surface-light border border-red-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">field-sizing: fixed</h3>
            <span className="text-[10px] text-red-500/60 bg-red-500/10 px-1.5 py-0.5 rounded">Default</span>
          </div>
          <p className="text-xs text-slate-500">
            The input has a fixed width. Long content overflows or gets clipped.
          </p>
          <input
            type="text"
            value={content}
            readOnly
            style={{
              width: '180px',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#e2e8f0',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              fieldSizing: 'fixed' as any,
            }}
          />
          <p className="text-[11px] text-red-400/70 font-mono">
            ⚠ Content overflows — user can&apos;t see everything they typed
          </p>

          <div className="mt-3">
            <textarea
              value={content.repeat(3)}
              readOnly
              rows={2}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #475569',
                background: '#1e293b',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                fieldSizing: 'fixed' as any,
              }}
            />
            <p className="text-[11px] text-red-400/70 mt-1 font-mono">
              ⚠ Textarea needs manual resize — or JS workaround
            </p>
          </div>
        </div>

        {/* Content sizing */}
        <div className="p-5 rounded-xl bg-surface-light border border-green-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-green-400">field-sizing: content</h3>
            <span className="text-[10px] text-green-500/60 bg-green-500/10 px-1.5 py-0.5 rounded">Baseline 2026</span>
          </div>
          <p className="text-xs text-slate-500">
            The input automatically resizes to fit whatever the user types.
          </p>
          <input
            type="text"
            value={content}
            readOnly
            style={{
              fieldSizing: 'content' as any,
              minWidth: '150px',
              maxWidth: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #22c55e',
              background: '#0f172a',
              color: '#e2e8f0',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
            }}
          />
          <p className="text-[11px] text-green-400/70 font-mono">
            ✓ Grows to fit content — no overflow, no truncation
          </p>

          <div className="mt-3">
            <textarea
              value={content.repeat(3)}
              readOnly
              rows={1}
              style={{
                fieldSizing: 'content' as any,
                minHeight: '44px',
                maxHeight: '250px',
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #22c55e',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
            <p className="text-[11px] text-green-400/70 mt-1 font-mono">
              ✓ Textarea auto-grows — no JS autoresize hacks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable() {
  const testValues = ['Short', 'Medium length text', 'Very long text that would normally overflow or get clipped'];

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        See how each element type behaves with <code className="text-brand-400">field-sizing: content</code> vs the default <code className="text-slate-500">field-sizing: fixed</code>:
      </p>

      {COMPARISON_EXAMPLES.map((ex) => (
        <div key={ex.label} className="p-4 rounded-xl bg-surface-light border border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
            {ex.label}
          </h4>
          <div className="space-y-2">
            {testValues.map((val, i) => {
              const sharedStyle: React.CSSProperties = {
                fieldSizing: 'content' as any,
                padding: '0.4rem 0.6rem',
                borderRadius: '0.3rem',
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: '0.8125rem',
                fontFamily: 'inherit',
                minWidth: '120px',
                maxWidth: '100%',
              };

              if (ex.element === 'textarea') {
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[10px] text-slate-600 mt-1.5 w-12 flex-shrink-0 font-mono">
                      {i + 1}
                    </span>
                    <textarea
                      value={val}
                      readOnly
                      rows={1}
                      style={{
                        ...sharedStyle,
                        minHeight: '32px',
                        resize: 'none',
                        width: '100%',
                      }}
                    />
                  </div>
                );
              }

              if (ex.element === 'select') {
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600 w-12 flex-shrink-0 font-mono">{i + 1}</span>
                    <select
                      style={{
                        ...sharedStyle,
                        width: 'auto',
                      }}
                      defaultValue={val}
                    >
                      <option>{val}</option>
                    </select>
                  </div>
                );
              }

              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-600 w-12 flex-shrink-0 font-mono">{i + 1}</span>
                  <input
                    type={ex.element === 'input-email' ? 'email' : ex.element === 'input-number' ? 'number' : 'text'}
                    value={val}
                    readOnly
                    style={sharedStyle}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CSSFieldSizingPlayground() {
  const [activePreset, setActivePreset] = useState(0);
  const [showTailwind, setShowTailwind] = useState(false);

  const preset = PRESETS[activePreset];
  const cssCode = generateCSS();
  const tailwindCode = generateTailwind();

  return (
    <ToolLayout
      title="CSS field-sizing Playground"
      description="Build auto-resizing form inputs with one CSS property — no JavaScript. field-sizing: content is Baseline 2026 across all browsers."
      controls={
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Code2 className="w-3.5 h-3.5" />
          <span>Baseline 2026 — Chrome 123+, Firefox 128+, Safari 17.4+</span>
        </div>
      }
    >
      <div className="space-y-8">
        {/* ── Preset Selector ─────────────────────────────── */}
        <section className="p-5 rounded-xl bg-surface-light border border-slate-700/50">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-3">
            Presets
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setActivePreset(i)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  activePreset === i
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
                title={p.description}
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">{preset.description}</p>
        </section>

        {/* ── Live Demo ───────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Live Demo — Type to See Auto-Resize
            </h3>
            <button
              onClick={() => setActivePreset(activePreset)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="p-6 rounded-xl bg-surface-light border border-slate-700/50">
            {/* Input type indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono uppercase">
                &lt;{preset.inputType === 'textarea' ? 'textarea' : `input type="${preset.inputType}"`}&gt;
              </span>
              <span className="text-[10px] text-green-500/70 bg-green-500/10 px-2 py-0.5 rounded font-mono">
                field-sizing: content
              </span>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono">
                min-width: {preset.minWidth}
              </span>
            </div>

            <LiveFieldSizingDemo
              inputType={preset.inputType}
              defaultValue={preset.defaultValue}
              minWidth={preset.minWidth || '150px'}
            />
          </div>
        </section>

        {/* ── Side-by-Side Comparison ─────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Side-by-Side: fixed vs content
          </h3>
          <SideBySideComparison />
        </section>

        {/* ── Element Comparison Table ────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            All Elements Compared
          </h3>
          <ComparisonTable />
        </section>

        {/* ── CSS Output ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">Generated Code</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTailwind(false)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  !showTailwind ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                CSS
              </button>
              <button
                onClick={() => setShowTailwind(true)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  showTailwind ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Tailwind
              </button>
            </div>
          </div>
          <CodeBlock code={showTailwind ? tailwindCode : cssCode} language={showTailwind ? 'TSX' : 'CSS'} />
        </section>

        {/* ── Browser Support ────────────────────────────── */}
        <section className="p-5 rounded-xl bg-surface-light border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Browser Support</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { browser: 'Chrome', version: '123+', icon: '🌐', status: '✅' },
              { browser: 'Firefox', version: '128+', icon: '🦊', status: '✅' },
              { browser: 'Safari', version: '17.4+', icon: '🧭', status: '✅' },
              { browser: 'Edge', version: '123+', icon: '🔷', status: '✅' },
            ].map((b) => (
              <div key={b.browser} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                <span className="text-xl">{b.icon}</span>
                <div>
                  <p className="text-sm text-slate-300">{b.browser}</p>
                  <p className="text-xs text-slate-500">{b.version}</p>
                </div>
                <span className="ml-auto text-sm">{b.status}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            field-sizing is <strong className="text-green-400">Baseline 2026</strong> — available in all modern
            browsers. No polyfill needed for modern projects.
          </p>
        </section>
      </div>
    </ToolLayout>
  );
}
