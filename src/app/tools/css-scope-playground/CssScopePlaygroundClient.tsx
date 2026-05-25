'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Code2, Eye, Play } from 'lucide-react';
import toast from 'react-hot-toast';

interface Preset {
  name: string;
  html: string;
  css: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Card Scoping',
    html: `<div class="card">
  <h2>Card Title</h2>
  <p>This paragraph inherits scoped card styles.</p>
  <div class="nested">
    <p>Nested content with different styling.</p>
  </div>
</div>`,
    css: `@scope (.card) {
  :scope {
    border: 2px solid #4f46e5;
    border-radius: 12px;
    padding: 20px;
    max-width: 400px;
    margin: 20px auto;
    font-family: system-ui;
  }
  h2 {
    color: #4f46e5;
    margin: 0 0 12px 0;
  }
  p {
    color: #e2e8f0;
    line-height: 1.6;
  }
}`,
  },
  {
    name: 'Theme Section',
    html: `<div class="dark-section">
  <h3>Dark Theme</h3>
  <p>This section has a dark theme scoped to it.</p>
  <button>Scoped Button</button>
</div>
<div class="light-section">
  <h3>Light Theme</h3>
  <p>This section has a light theme.</p>
  <button>Different Button</button>
</div>`,
    css: `@scope (.dark-section) {
  :scope {
    background: #1e293b;
    padding: 24px;
    border-radius: 8px;
    margin: 16px 0;
    font-family: system-ui;
  }
  h3 { color: #93c5fd; margin: 0 0 8px 0; }
  p { color: #cbd5e1; }
  button {
    background: #4f46e5; color: white; border: none;
    padding: 8px 16px; border-radius: 6px; cursor: pointer;
  }
}

@scope (.light-section) {
  :scope {
    background: #f8fafc;
    padding: 24px;
    border-radius: 8px;
    margin: 16px 0;
    font-family: system-ui;
  }
  h3 { color: #1e293b; margin: 0 0 8px 0; }
  p { color: #475569; }
  button {
    background: #475569; color: white; border: none;
    padding: 8px 16px; border-radius: 6px; cursor: pointer;
  }
}`,
  },
  {
    name: 'Donut Scope',
    html: `<div class="outer">
  <div class="inner">
    <p>Inner content — inside the donut hole.</p>
  </div>
  <p>Outer content — in the donut ring.</p>
</div>`,
    css: `@scope (.outer) to (.inner) {
  p {
    color: #f59e0b;
    font-weight: 600;
    padding: 8px 12px;
    border: 1px dashed #f59e0b;
    border-radius: 6px;
  }
}

.inner p {
  color: #6b7280;
  border: 1px solid #374151;
}`,
  },
  {
    name: 'Proximity Scoping',
    html: `<div class="component-a">
  <h4>Component A</h4>
  <p>Styled by component A's scope.</p>
</div>
<div class="component-b">
  <h4>Component B</h4>
  <p>Styled by component B's scope — no conflicts!</p>
</div>`,
    css: `@scope (.component-a) {
  :scope {
    padding: 16px; border: 2px solid #ec4899;
    border-radius: 8px; margin: 12px 0;
  }
  h4 { color: #ec4899; margin: 0 0 8px 0; }
  p { color: #fbcfe8; }
}

@scope (.component-b) {
  :scope {
    padding: 16px; border: 2px solid #10b981;
    border-radius: 8px; margin: 12px 0;
  }
  h4 { color: #10b981; margin: 0 0 8px 0; }
  p { color: #a7f3d0; }
}`,
  },
  {
    name: 'Form Isolation',
    html: `<form class="signup-form">
  <label>Email</label>
  <input type="email" placeholder="you@example.com" />
  <label>Password</label>
  <input type="password" placeholder="••••••••" />
  <button type="button">Sign Up</button>
</form>`,
    css: `@scope (.signup-form) {
  :scope {
    max-width: 320px; margin: 20px auto;
    padding: 24px; background: #1e293b;
    border-radius: 12px;
    font-family: system-ui;
  }
  label {
    display: block; color: #94a3b8;
    font-size: 13px; margin: 12px 0 4px;
  }
  input {
    width: 100%; padding: 10px 12px;
    background: #0f172a; border: 1px solid #334155;
    border-radius: 8px; color: #e2e8f0;
    font-size: 14px; box-sizing: border-box;
  }
  button {
    width: 100%; margin-top: 16px;
    padding: 10px; background: #4f46e5;
    color: white; border: none;
    border-radius: 8px; font-size: 14px; cursor: pointer;
  }
}`,
  },
  {
    name: 'List Styling',
    html: `<ul class="feature-list">
  <li>Native CSS scoping — no preprocessors</li>
  <li>Baseline across all browsers</li>
  <li>Zero runtime overhead</li>
  <li>No naming conventions needed</li>
</ul>`,
    css: `@scope (.feature-list) {
  :scope {
    list-style: none; padding: 0;
    max-width: 420px; margin: 16px auto;
    font-family: system-ui;
  }
  li {
    padding: 12px 16px; margin: 8px 0;
    background: #1e293b; border-left: 3px solid #4f46e5;
    border-radius: 0 8px 8px 0; color: #cbd5e1;
    font-size: 14px;
  }
}`,
  },
  {
    name: 'Alert Messages',
    html: `<div class="alert info">
  <strong>ℹ Info</strong>
  <p>This is an informational message.</p>
</div>
<div class="alert success">
  <strong>✓ Success</strong>
  <p>Operation completed successfully.</p>
</div>
<div class="alert warning">
  <strong>⚠ Warning</strong>
  <p>Please review before continuing.</p>
</div>`,
    css: `@scope (.alert) {
  :scope {
    padding: 12px 16px; margin: 8px 0;
    border-radius: 8px; font-family: system-ui;
  }
  strong { display: block; margin-bottom: 4px; font-size: 14px; }
  p { margin: 0; font-size: 13px; }
}

@scope (.alert.info) {
  :scope { background: #1e3a5f; border: 1px solid #3b82f6; }
  strong { color: #93c5fd; }
  p { color: #bfdbfe; }
}

@scope (.alert.success) {
  :scope { background: #14532d; border: 1px solid #22c55e; }
  strong { color: #86efac; }
  p { color: #bbf7d0; }
}

@scope (.alert.warning) {
  :scope { background: #713f12; border: 1px solid #f59e0b; }
  strong { color: #fcd34d; }
  p { color: #fde68a; }
}`,
  },
];

const DEFAULT_HTML = `<div class="demo">
  <h2>CSS @scope Demo</h2>
  <p>Styles here are scoped to .demo</p>
  <span class="highlight">Scoped span</span>
</div>`;

const DEFAULT_CSS = `@scope (.demo) {
  :scope {
    border: 2px solid #4f46e5;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    margin: 0 auto;
    font-family: system-ui;
  }
  h2 {
    color: #a5b4fc;
    margin: 0 0 8px 0;
  }
  p {
    color: #cbd5e1;
    margin: 0 0 12px 0;
  }
  .highlight {
    background: #4f46e533;
    color: #c4b5fd;
    padding: 2px 8px;
    border-radius: 4px;
  }
}`;

export default function CssScopePlaygroundClient() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [activePreset, setActivePreset] = useState('');

  const applyPreset = useCallback((preset: Preset) => {
    setHtml(preset.html);
    setCss(preset.css);
    setActivePreset(preset.name);
    toast.success('Loaded: ' + preset.name);
  }, []);

  const resetAll = useCallback(() => {
    setHtml(DEFAULT_HTML);
    setCss(DEFAULT_CSS);
    setActivePreset('');
    toast.success('Reset to defaults');
  }, []);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css).then(
      () => toast.success('CSS copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [css]);

  const copyHTML = useCallback(() => {
    navigator.clipboard.writeText(html).then(
      () => toast.success('HTML copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [html]);

  const combinedCode = useMemo(() => {
    return `<!-- HTML -->\n${html}\n\n/* CSS — @scope */\n${css}`;
  }, [html, css]);

  return (
    <ToolLayout
      title="CSS @scope Playground"
      description="Experiment with the CSS @scope at-rule — scoped styles without naming conventions. Live preview with real-time DOM rendering."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-400" />
              Presets
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    activePreset === p.name
                      ? 'border-brand-500/50 bg-brand-500/10 text-white'
                      : 'border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-medium">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* HTML Input */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">HTML</h2>
              <button
                onClick={copyHTML}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600/50 text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <textarea
              value={html}
              onChange={(e) => { setHtml(e.target.value); setActivePreset(''); }}
              className="input-field w-full h-48 text-xs font-mono resize-y"
              spellCheck={false}
            />
          </div>

          {/* CSS Input */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">CSS @scope</h2>
              <button
                onClick={copyCSS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600/50 text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <textarea
              value={css}
              onChange={(e) => { setCss(e.target.value); setActivePreset(''); }}
              className="input-field w-full h-48 text-xs font-mono resize-y"
              spellCheck={false}
            />
          </div>

          <button
            onClick={resetAll}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              Live Preview
            </h2>
            <div className="rounded-xl bg-slate-900/50 border border-slate-700/50 p-6 min-h-[400px]">
              <style>{css.replace(/@scope\s*\(/g, '@scope (')}</style>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>

          {/* Full code output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">Combined Output</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(combinedCode).then(
                    () => toast.success('Copied!'),
                    () => toast.error('Failed to copy'),
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-sm transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy All
              </button>
            </div>
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
              <code>{combinedCode}</code>
            </pre>
          </div>

          {/* Info */}
          <div className="card">
            <h2 className="text-white font-semibold text-base mb-3">About CSS @scope</h2>
            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
              <li><strong className="text-white">@scope</strong> lets you write scoped CSS without naming conventions like BEM.</li>
              <li>Use <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">@scope (.root) {'{'} ... {'}'}</code> to limit styles to a specific subtree.</li>
              <li>The <strong className="text-white">donut scope</strong> pattern: <code className="text-brand-400 bg-surface px-1.5 py-0.5 rounded text-xs">@scope (.outer) to (.inner)</code> styles the ring between outer and inner.</li>
              <li>Scoped styles have higher specificity than unscoped ones by default, preventing leaks.</li>
              <li>CSS @scope is Baseline as of 2026 — supported in all modern browsers.</li>
            </ol>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
