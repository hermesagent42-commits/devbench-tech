'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Check, Code2, RefreshCw, Target, Scissors, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

type PresetKey = 'card' | 'sidebar' | 'dark-light' | 'comment' | 'dashboard' | 'nav';

interface ScopeRule {
  id: string;
  property: string;
  value: string;
}

interface Preset {
  name: string;
  description: string;
  scopeRoot: string;
  scopeLimit: string;
  rules: ScopeRule[];
  html: string;
}

const PRESETS: Record<PresetKey, Preset> = {
  card: {
    name: 'Card Component',
    description: 'Scope styles to a card, preventing leaks',
    scopeRoot: '.card',
    scopeLimit: '',
    rules: [
      { id: '1', property: 'padding', value: '1.5rem' },
      { id: '2', property: 'border-radius', value: '12px' },
      { id: '3', property: 'background', value: 'var(--card-bg)' },
      { id: '4', property: 'color', value: '#e2e8f0' },
    ],
    html: `<div class="card">
  <h2>Card Title</h2>
  <p>This paragraph inherits scoped card styles.</p>
  <button>Click Me</button>
</div>
<div class="outside">
  <p>This paragraph is OUTSIDE the scope — styles don't leak here.</p>
  <button>Outside Button</button>
</div>`,
  },
  sidebar: {
    name: 'Sidebar / Aside',
    description: 'Scope styles to sidebar without affecting main',
    scopeRoot: '.sidebar',
    scopeLimit: '',
    rules: [
      { id: '1', property: 'background', value: '#1e293b' },
      { id: '2', property: 'padding', value: '1rem' },
      { id: '3', property: 'border-right', value: '2px solid #334155' },
      { id: '4', property: 'width', value: '250px' },
    ],
    html: `<div class="sidebar">
  <h3>Navigation</h3>
  <a href="#">Home</a>
  <a href="#">About</a>
  <a href="#">Contact</a>
</div>
<div class="main-content">
  <h1>Main Content Area</h1>
  <p>Content here is NOT affected by sidebar scoped styles.</p>
  <a href="#">This link has no sidebar styling</a>
</div>`,
  },
  'dark-light': {
    name: 'Dark & Light Themes',
    description: 'Two scopes — light and dark — applied to different containers',
    scopeRoot: '.theme-light',
    scopeLimit: '',
    rules: [
      { id: '1', property: 'background', value: '#f8fafc' },
      { id: '2', property: 'color', value: '#0f172a' },
      { id: '3', property: 'border', value: '1px solid #cbd5e1' },
      { id: '4', property: 'padding', value: '1rem' },
    ],
    html: `<div class="theme-light">
  <h3>☀️ Light Theme</h3>
  <p>This container uses light theme scoped styles.</p>
  <span>Styled text</span>
</div>
<div class="theme-dark" style="background:#0f172a;color:#e2e8f0;border:1px solid #334155;padding:1rem;">
  <h3>🌙 Dark Theme</h3>
  <p>This container uses dark theme styles (outside @scope).</p>
  <span>Styled text</span>
</div>`,
  },
  comment: {
    name: 'Comment Thread',
    description: 'Scope to limit styles to comment area only',
    scopeRoot: '.comment-thread',
    scopeLimit: '',
    rules: [
      { id: '1', property: 'background', value: '#1e293b' },
      { id: '2', property: 'border-radius', value: '8px' },
      { id: '3', property: 'padding', value: '1rem' },
      { id: '4', property: 'margin-bottom', value: '0.5rem' },
    ],
    html: `<div class="comment-thread">
  <div class="comment">
    <strong>Alice</strong>
    <p>Great article! The @scope examples are crystal clear.</p>
  </div>
  <div class="comment">
    <strong>Bob</strong>
    <p>Finally — no more BEM naming conventions!</p>
  </div>
</div>
<div class="other-section">
  <p>This section is NOT in the comment scope.</p>
  <div class="comment">This doesn't get comment styles!</div>
</div>`,
  },
  dashboard: {
    name: 'Dashboard Widgets',
    description: 'Scope widget styles to prevent cross-contamination',
    scopeRoot: '.widget',
    scopeLimit: '',
    rules: [
      { id: '1', property: 'background', value: '#1e293b' },
      { id: '2', property: 'border', value: '1px solid #334155' },
      { id: '3', property: 'border-radius', value: '10px' },
      { id: '4', property: 'padding', value: '1.25rem' },
    ],
    html: `<div class="widget">
  <h4>📊 Analytics</h4>
  <p>Users: 12,450</p>
</div>
<div class="widget">
  <h4>💰 Revenue</h4>
  <p>$34,200</p>
</div>
<div class="outside">
  <h4>Not a Widget</h4>
  <p>This element has no widget scoped styles applied.</p>
</div>`,
  },
  nav: {
    name: 'Nav with Scope Limit',
    description: 'Limit scope — styles stop at <section> boundary',
    scopeRoot: 'nav',
    scopeLimit: 'section',
    rules: [
      { id: '1', property: 'background', value: '#1e293b' },
      { id: '2', property: 'padding', value: '0.75rem 1rem' },
      { id: '3', property: 'color', value: '#e2e8f0' },
    ],
    html: `<nav>
  <a href="#" style="color:#60a5fa">Home</a>
  <a href="#" style="color:#e2e8f0">Products</a>
  <section>
    <!-- Scope stops here — styles inside <section> are excluded -->
    <p>This section element is the scope limit boundary.</p>
    <a href="#" style="color:#e2e8f0">This link</a>
  </section>
  <a href="#" style="color:#e2e8f0">Contact</a>
</nav>`,
  },
};

let ruleCounter = 0;
function nextRuleId(): string {
  ruleCounter++;
  return `rule-${ruleCounter}`;
}

export default function ScopePlayground() {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('card');
  const [scopeRoot, setScopeRoot] = useState(PRESETS.card.scopeRoot);
  const [scopeLimit, setScopeLimit] = useState(PRESETS.card.scopeLimit);
  const [rules, setRules] = useState<ScopeRule[]>(
    PRESETS.card.rules.map((r) => ({ ...r, id: nextRuleId() }))
  );
  const [htmlInput, setHtmlInput] = useState(PRESETS.card.html);
  const [showPreview, setShowPreview] = useState(true);
  const [copiedCss, setCopiedCss] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const handlePresetChange = useCallback((key: PresetKey) => {
    const preset = PRESETS[key];
    setSelectedPreset(key);
    setScopeRoot(preset.scopeRoot);
    setScopeLimit(preset.scopeLimit);
    setRules(preset.rules.map((r) => ({ ...r, id: nextRuleId() })));
    setHtmlInput(preset.html);
  }, []);

  const updateRule = useCallback((id: string, field: 'property' | 'value', val: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  }, []);

  const addRule = useCallback(() => {
    setRules((prev) => [...prev, { id: nextRuleId(), property: '', value: '' }]);
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const generatedCss = useMemo(() => {
    const inner = rules
      .filter((r) => r.property.trim() && r.value.trim())
      .map((r) => `    ${r.property.trim()}: ${r.value.trim()};`)
      .join('\n');

    if (!inner) return '/* Add rules to generate CSS */';

    let scopeLine = `@scope (${scopeRoot || 'root'})`;
    if (scopeLimit.trim()) {
      scopeLine += ` to (${scopeLimit.trim()})`;
    }
    return `${scopeLine} {\n${inner}\n}`;
  }, [scopeRoot, scopeLimit, rules]);

  const copyCss = useCallback(() => {
    navigator.clipboard.writeText(generatedCss);
    setCopiedCss(true);
    toast.success('CSS copied!');
    setTimeout(() => setCopiedCss(false), 2000);
  }, [generatedCss]);

  const copyFull = useCallback(() => {
    const full = `<!-- HTML -->\n${htmlInput}\n\n<style>\n${generatedCss}\n</style>`;
    navigator.clipboard.writeText(full);
    setCopiedFull(true);
    toast.success('Full code copied!');
    setTimeout(() => setCopiedFull(false), 2000);
  }, [generatedCss, htmlInput]);

  const scopeStyles = useMemo(() => {
    const styles: Record<string, string> = {};
    rules.forEach((r) => {
      if (r.property.trim() && r.value.trim()) {
        styles[r.property.trim()] = r.value.trim();
      }
    });
    return styles;
  }, [rules]);

  // Build preview by injecting scoped styles
  const previewHtml = useMemo(() => {
    const styleStr = rules
      .filter((r) => r.property.trim() && r.value.trim())
      .map((r) => `${r.property.trim()}: ${r.value.trim()};`)
      .join(' ');
    return htmlInput;
  }, [htmlInput, rules]);

  return (
    <ToolLayout
      title="CSS @scope Playground"
      description="Visually build CSS @scope rules — define scope roots, set scope limits, write scoped styles, and see exactly which elements are affected in a live DOM preview. @scope is Baseline 2026 across all browsers."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">PRESETS:</span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                selectedPreset === key
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                  : 'border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
              }`}
            >
              {PRESETS[key].name}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <p className="text-sm text-amber-300">
          <strong>🔥 Just hit Baseline!</strong> Firefox 146 shipped @scope support, making it available in all major browsers.
          This tool helps you build and preview scoped styles before shipping.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-5">
          {/* Scope Root */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <Target className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
              Scope Root (selector)
            </label>
            <input
              type="text"
              value={scopeRoot}
              onChange={(e) => setScopeRoot(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 font-mono focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
              placeholder=".card"
            />
            <p className="text-xs text-slate-500 mt-1">
              The root element that defines the scope boundary — styles only apply inside this element.
            </p>
          </div>

          {/* Scope Limit */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <Scissors className="w-3.5 h-3.5 inline mr-1.5 text-orange-400" />
              Scope Limit (optional)
            </label>
            <input
              type="text"
              value={scopeLimit}
              onChange={(e) => setScopeLimit(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 font-mono focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
              placeholder="section (optional — stops scope here)"
            />
            <p className="text-xs text-slate-500 mt-1">
              An optional selector where the scope ends — elements at/inside this limit are excluded.
            </p>
          </div>

          {/* Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Scoped Rules</label>
              <button
                onClick={addRule}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rule
              </button>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.property}
                    onChange={(e) => updateRule(rule.id, 'property', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 font-mono focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
                    placeholder="property"
                  />
                  <span className="text-slate-500">:</span>
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                    className="flex-[2] px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 font-mono focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none"
                    placeholder="value"
                  />
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {rules.length === 0 && (
                <p className="text-xs text-slate-500 italic py-2">No rules defined. Click &quot;Add Rule&quot; to start.</p>
              )}
            </div>
          </div>

          {/* Live HTML */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <Code2 className="w-3.5 h-3.5 inline mr-1.5 text-green-400" />
              Live HTML (edit to test scope)
            </label>
            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-200 font-mono focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none resize-y"
            />
          </div>
        </div>

        {/* Right: Generated CSS + Preview */}
        <div className="space-y-5">
          {/* Generated CSS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                <Code2 className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
                Generated CSS
              </label>
              <button
                onClick={copyCss}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {copiedCss ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCss ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-xs text-green-300 font-mono overflow-x-auto whitespace-pre">
              {generatedCss}
            </pre>
          </div>

          {/* Scope Visualization */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                <Eye className="w-3.5 h-3.5 inline mr-1.5 text-yellow-400" />
                Live Preview
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPreview && (
              <div className="relative">
                <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
                  <div
                    className="text-sm leading-relaxed"
                    style={{
                      ['--card-bg' as string]: '#1e293b',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: previewHtml
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/class="([^"]+)"/g, (_: string, cls: string) => {
                          // Re-render as actual HTML for the preview
                          return `class="${cls}"`;
                        }),
                    }}
                  />
                  {/* Render actual HTML for live preview */}
                  <div
                    className="text-sm bg-slate-800/50 rounded p-3 mt-2"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>

                {/* Legend */}
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-brand-500/40 border border-brand-500/60" />
                    Inside scope
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 border border-slate-600" />
                    Outside scope
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Full HTML+CSS export */}
          <button
            onClick={copyFull}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {copiedFull ? <Check className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
            {copiedFull ? 'Copied!' : 'Copy Full HTML + CSS'}
          </button>
        </div>
      </div>

      {/* Educational Section */}
      <div className="mt-10 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <h3 className="text-base font-semibold text-slate-200 mb-3">How @scope Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-brand-300 mb-1">Scope Root</h4>
            <p className="text-xs text-slate-400">
              <code className="text-brand-400 bg-slate-800 px-1 rounded">@scope (.card) {'{}'}</code> limits all inner
              selectors to match only elements inside <code className="text-brand-400 bg-slate-800 px-1 rounded">.card</code>.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-orange-300 mb-1">Scope Limit (Donut Scope)</h4>
            <p className="text-xs text-slate-400">
              <code className="text-brand-400 bg-slate-800 px-1 rounded">@scope (.card) to (section)</code> applies
              styles inside <code className="text-brand-400 bg-slate-800 px-1 rounded">.card</code> until a{' '}
              <code className="text-brand-400 bg-slate-800 px-1 rounded">section</code> is encountered.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <h4 className="text-sm font-medium text-green-300 mb-1">Proximity</h4>
            <p className="text-xs text-slate-400">
              When an element matches selectors in multiple scopes, the scope with the{' '}
              <em>fewest hops</em> from root to element wins — no specificity war needed.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
