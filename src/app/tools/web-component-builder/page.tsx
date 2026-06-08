'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Play,
  RefreshCw,
  Code2,
  Palette,
  ListTree,
  Eye,
  Layers,
  Plus,
  Trash2,
  Download,
  GripHorizontal,
  ChevronDown,
  Component,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────

type Tab = 'template' | 'styles' | 'logic';

interface Preset {
  name: string;
  tag: string;
  template: string;
  styles: string;
  attributes: string[];
  logic: string;
}

// ─── Presets ────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    name: 'Counter Button',
    tag: 'counter-btn',
    template: `<button id="btn">Clicked <span id="count">0</span> times</button>`,
    styles: `button {
  padding: 12px 24px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
  font-family: system-ui, sans-serif;
}
button:hover {
  background: #4f46e5;
}
#count {
  font-weight: 700;
}`,
    attributes: ['initial-count'],
    logic: `connectedCallback() {
  this._count = parseInt(this.getAttribute('initial-count')) || 0;
  this.shadowRoot.getElementById('btn').addEventListener('click', () => {
    this._count++;
    this.shadowRoot.getElementById('count').textContent = this._count;
    this.dispatchEvent(new CustomEvent('counter-change', {
      detail: { count: this._count },
      bubbles: true,
    }));
  });
  this.shadowRoot.getElementById('count').textContent = this._count;
}

static get observedAttributes() {
  return ['initial-count'];
}

attributeChangedCallback(name, oldVal, newVal) {
  if (name === 'initial-count' && oldVal !== newVal) {
    this._count = parseInt(newVal) || 0;
    const countEl = this.shadowRoot.getElementById('count');
    if (countEl) countEl.textContent = this._count;
  }
}`,
  },
  {
    name: 'Toggle Switch',
    tag: 'toggle-switch',
    template: `<label id="wrapper" class="switch">
  <input type="checkbox" id="checkbox">
  <span id="slider" class="slider"></span>
  <span id="label"><slot></slot></span>
</label>`,
    styles: `.switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  user-select: none;
}
.switch input { display: none; }
.slider {
  width: 48px;
  height: 26px;
  background: #475569;
  border-radius: 13px;
  position: relative;
  transition: background 0.3s;
}
.slider::after {
  content: '';
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.3s;
}
input:checked + .slider {
  background: #22c55e;
}
input:checked + .slider::after {
  transform: translateX(22px);
}
#label {
  font-size: 15px;
  color: #e2e8f0;
}`,
    attributes: ['checked'],
    logic: `connectedCallback() {
  const checkbox = this.shadowRoot.getElementById('checkbox');
  if (this.hasAttribute('checked')) {
    checkbox.checked = true;
  }
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
    this.dispatchEvent(new CustomEvent('toggle', {
      detail: { checked: checkbox.checked },
      bubbles: true,
    }));
  });
}

static get observedAttributes() {
  return ['checked'];
}

attributeChangedCallback(name, oldVal, newVal) {
  const checkbox = this.shadowRoot.getElementById('checkbox');
  if (!checkbox) return;
  if (name === 'checked') {
    checkbox.checked = newVal !== null;
  }
}`,
  },
  {
    name: 'Rating Stars',
    tag: 'rating-stars',
    template: `<div id="stars" class="stars"></div>
<span id="label" class="label"><slot></slot></span>`,
    styles: `.stars {
  display: inline-flex;
  gap: 4px;
}
.star {
  font-size: 28px;
  cursor: pointer;
  color: #475569;
  transition: color 0.15s, transform 0.15s;
  user-select: none;
}
.star:hover { transform: scale(1.15); }
.star.active { color: #f59e0b; }
.label {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #94a3b8;
  font-family: system-ui, sans-serif;
}`,
    attributes: ['max', 'value'],
    logic: `connectedCallback() {
  this._max = parseInt(this.getAttribute('max')) || 5;
  this._value = parseInt(this.getAttribute('value')) || 0;
  this._render();
  this.shadowRoot.getElementById('stars').addEventListener('click', (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    this._value = parseInt(star.dataset.index);
    this.setAttribute('value', String(this._value));
    this._render();
    this.dispatchEvent(new CustomEvent('rate', {
      detail: { value: this._value },
      bubbles: true,
    }));
  });
}

_render() {
  const container = this.shadowRoot.getElementById('stars');
  container.innerHTML = '';
  for (let i = 1; i <= this._max; i++) {
    const star = document.createElement('span');
    star.className = 'star' + (i <= this._value ? ' active' : '');
    star.dataset.index = String(i);
    star.textContent = '★';
    container.appendChild(star);
  }
}

static get observedAttributes() { return ['max', 'value']; }

attributeChangedCallback(name, oldVal, newVal) {
  if (name === 'max') this._max = parseInt(newVal) || 5;
  if (name === 'value') this._value = parseInt(newVal) || 0;
  if (this.shadowRoot.getElementById('stars')) this._render();
}`,
  },
  {
    name: 'Tab Panel',
    tag: 'tab-panel',
    template: `<div id="tabs" class="tabs"></div>
<div id="panels" class="panels">
  <slot></slot>
</div>`,
    styles: `.tabs {
  display: flex;
  border-bottom: 2px solid #334155;
  gap: 2px;
}
.tab-btn {
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn:hover { color: #e2e8f0; }
.tab-btn.active {
  color: #6366f1;
  border-bottom-color: #6366f1;
}
.panels {
  padding-top: 16px;
}
::slotted([slot]) { display: none; }
::slotted([slot].active) { display: block; }`,
    attributes: ['selected'],
    logic: `connectedCallback() {
  const slots = [...this.querySelectorAll('[slot]')];
  this._tabs = slots.map((el, i) => ({
    label: el.getAttribute('slot'),
    index: i,
  }));
  this._selected = parseInt(this.getAttribute('selected')) || 0;
  this._render();
  this.shadowRoot.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    this._select(parseInt(btn.dataset.index));
  });
}

_render() {
  const tabsEl = this.shadowRoot.getElementById('tabs');
  tabsEl.innerHTML = '';
  this._tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (i === this._selected ? ' active' : '');
    btn.dataset.index = String(i);
    btn.textContent = tab.label;
    tabsEl.appendChild(btn);
  });
  const slots = [...this.querySelectorAll('[slot]')];
  slots.forEach((el, i) => {
    el.classList.toggle('active', i === this._selected);
  });
}

_select(index) {
  this._selected = index;
  this.setAttribute('selected', String(index));
  this._render();
  this.dispatchEvent(new CustomEvent('tab-change', {
    detail: { index, label: this._tabs[index].label },
    bubbles: true,
  }));
}

static get observedAttributes() { return ['selected']; }

attributeChangedCallback(name, oldVal, newVal) {
  if (name === 'selected' && oldVal !== newVal) {
    this._select(parseInt(newVal) || 0);
  }
}`,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function buildComponentCode(
  tag: string,
  template: string,
  styles: string,
  logic: string,
): string {
  const cleanTemplate = template.trim();
  const cleanStyles = styles.trim();
  const cleanLogic = logic.trim();

  const classBody = cleanLogic
    ? `\n  ${cleanLogic.replace(/\n/g, '\n  ')}\n`
    : '';

  return `class ${kebabToPascal(tag)} extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = \`
      <style>
        ${cleanStyles}
      </style>
      ${cleanTemplate}
    \`;${classBody}}

customElements.define('${tag}', ${kebabToPascal(tag)});`;
}

function buildHTMLUsage(tag: string, attributes: string[]): string {
  const attrStr = attributes
    .map((a) => ` ${a}="${getAttrDefault(a)}"`)
    .join('');
  return `<${tag}${attrStr}>\n  <!-- slot content here -->\n</${tag}>`;
}

function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function getAttrDefault(attr: string): string {
  const defaults: Record<string, string> = {
    'initial-count': '0',
    checked: '',
    max: '5',
    value: '3',
    selected: '0',
  };
  return defaults[attr] ?? '';
}

// ─── Preview Iframe ──────────────────────────────────────────────────

function PreviewIframe({
  tag,
  template,
  styles,
  attributes,
  logic,
}: {
  tag: string;
  template: string;
  styles: string;
  attributes: string[];
  logic: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mountKey = useRef(0);

  useEffect(() => {
    mountKey.current++;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const attrStr = attributes
      .map((a) => ` ${a}="${getAttrDefault(a)}"`)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:200px;}</style></head>
<body>
  <${tag}${attrStr}>Demo Content</${tag}>
  <script>
    (${buildComponentCode(tag, template, styles, logic).replace(/`/g, '\\`')});
  <\\/script>
</body>
</html>`;

    doc.open();
    doc.write(html);
    doc.close();
  }, [tag, template, styles, attributes, logic]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full rounded-lg border border-slate-700/50"
      style={{ height: 260 }}
      title="Web Component Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function WebComponentBuilder() {
  const [tag, setTag] = useState('my-element');
  const [template, setTemplate] = useState(`<div class="wrapper">
  <h2>Hello <slot>World</slot>!</h2>
  <p>This is a web component.</p>
</div>`);
  const [styles, setStyles] = useState(`.wrapper {
  padding: 20px;
  background: #1e293b;
  border-radius: 10px;
  text-align: center;
  border: 1px solid #334155;
}
h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #f1f5f9;
}
p {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}`);
  const [attributes, setAttributes] = useState<string[]>([
    'greeting',
    'theme',
  ]);
  const [logic, setLogic] = useState(`connectedCallback() {
  const greeting = this.getAttribute('greeting') || 'Hello';
  const theme = this.getAttribute('theme') || 'light';
  this.shadowRoot.querySelector('h2').textContent = greeting + '!';
}

static get observedAttributes() { return ['greeting', 'theme']; }

attributeChangedCallback(name, oldVal, newVal) {
  if (!this.shadowRoot) return;
  if (name === 'greeting') {
    this.shadowRoot.querySelector('h2').textContent = newVal + '!';
  }
}`);
  const [activeTab, setActiveTab] = useState<Tab>('template');
  const [showPreview, setShowPreview] = useState(true);

  // ── Derived ──

  const fullCode = useMemo(
    () => buildComponentCode(tag, template, styles, logic),
    [tag, template, styles, logic],
  );

  const usageCode = useMemo(
    () => buildHTMLUsage(tag, attributes),
    [tag, attributes],
  );

  // ── Actions ──

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(fullCode).then(() => {
      toast.success('Component code copied!');
    });
  }, [fullCode]);

  const handleCopyUsage = useCallback(() => {
    navigator.clipboard.writeText(usageCode).then(() => {
      toast.success('Usage HTML copied!');
    });
  }, [usageCode]);

  const handleLoadPreset = useCallback((preset: Preset) => {
    setTag(preset.tag);
    setTemplate(preset.template);
    setStyles(preset.styles);
    setAttributes(preset.attributes);
    setLogic(preset.logic);
    toast.success(`Loaded "${preset.name}" preset`);
  }, []);

  const addAttribute = useCallback(() => {
    const name = prompt('Attribute name (kebab-case):');
    if (name && name.trim() && !attributes.includes(name.trim())) {
      setAttributes((prev) => [...prev, name.trim()]);
    }
  }, [attributes]);

  const removeAttribute = useCallback(
    (attr: string) => {
      setAttributes((prev) => prev.filter((a) => a !== attr));
    },
    [],
  );

  const tabs: { id: Tab; label: string; icon: typeof Code2 }[] = [
    { id: 'template', label: 'Template', icon: Layers },
    { id: 'styles', label: 'Styles', icon: Palette },
    { id: 'logic', label: 'Logic', icon: Code2 },
  ];

  return (
    <ToolLayout
      title="Web Component Builder"
      description="Visually build, preview, and export custom elements using the Custom Elements API and Shadow DOM. Zero dependencies, 100% native browser APIs."
      controls={
        <div className="flex items-center gap-2 flex-wrap w-full">
          <span className="text-xs text-slate-400 font-medium mr-1">
            Tag:
          </span>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="input-field w-36 text-sm"
            placeholder="my-element"
          />
          <span className="text-xs text-slate-500 mx-1">|</span>
          <span className="text-xs text-slate-400 font-medium mr-1">
            Presets:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.tag}
              onClick={() => handleLoadPreset(p)}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 hover:text-white transition-colors border border-slate-600/30"
              title={p.name}
            >
              {p.name}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 transition-colors border border-slate-600/30"
          >
            <Eye className="w-3.5 h-3.5" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 transition-colors border border-brand-500/20"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy JS
          </button>
        </div>
      }
    >
      <div
        className={`grid gap-6 ${
          showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {/* Left: Editor */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex bg-surface-light rounded-lg p-1 gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Template */}
          {activeTab === 'template' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                HTML template for your component&apos;s shadow DOM. Use{' '}
                <code className="text-brand-400">&lt;slot&gt;</code> for
                content projection and{' '}
                <code className="text-brand-400">&lt;slot name=&quot;...&quot;&gt;</code>{' '}
                for named slots.
              </p>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="input-field w-full font-mono text-sm min-h-[240px]"
                spellCheck={false}
                placeholder="<div>Hello World</div>"
              />
            </div>
          )}

          {/* Styles */}
          {activeTab === 'styles' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                CSS scoped to your component via Shadow DOM. Use{' '}
                <code className="text-brand-400">::slotted()</code> to style
                projected content,{' '}
                <code className="text-brand-400">:host</code> to style the
                element itself.
              </p>
              <textarea
                value={styles}
                onChange={(e) => setStyles(e.target.value)}
                className="input-field w-full font-mono text-sm min-h-[240px]"
                spellCheck={false}
                placeholder="/* Scoped styles */"
              />
            </div>
          )}

          {/* Logic */}
          {activeTab === 'logic' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Lifecycle callbacks and reactive logic. Define{' '}
                <code className="text-brand-400">connectedCallback</code>,{' '}
                <code className="text-brand-400">observedAttributes</code>,{' '}
                and <code className="text-brand-400">attributeChangedCallback</code>.
                Access shadow DOM with{' '}
                <code className="text-brand-400">
                  this.shadowRoot.getElementById(...)
                </code>.
              </p>
              <textarea
                value={logic}
                onChange={(e) => setLogic(e.target.value)}
                className="input-field w-full font-mono text-sm min-h-[240px]"
                spellCheck={false}
                placeholder="connectedCallback() { ... }"
              />
            </div>
          )}

          {/* Attributes */}
          <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ListTree className="w-4 h-4 text-brand-400" />
                Observed Attributes
              </h3>
              <button
                onClick={addAttribute}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {attributes.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No attributes defined. Add one to make your component
                reactive to attribute changes.
              </p>
            ) : (
              <div className="space-y-1.5">
                {attributes.map((attr) => (
                  <div
                    key={attr}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-800/50 border border-slate-700/30"
                  >
                    <code className="text-xs text-brand-300">{attr}</code>
                    <button
                      onClick={() => removeAttribute(attr)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview + Output */}
        {showPreview && (
          <div className="space-y-4">
            {/* Live Preview */}
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-light border-b border-slate-700/50">
                <Eye className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium text-slate-300">
                  Live Preview
                </span>
                <span className="text-xs text-slate-500 ml-auto">
                  &lt;{tag}&gt;
                </span>
              </div>
              <div className="p-1">
                <PreviewIframe
                  tag={tag}
                  template={template}
                  styles={styles}
                  attributes={attributes}
                  logic={logic}
                />
              </div>
            </div>

            {/* Generated Code */}
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-surface-light border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-slate-300">
                    Component Definition (JS)
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950/50 overflow-auto max-h-[320px] whitespace-pre">
                <code>{fullCode}</code>
              </pre>
            </div>

            {/* Usage HTML */}
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-surface-light border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Component className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium text-slate-300">
                    Usage in HTML
                  </span>
                </div>
                <button
                  onClick={handleCopyUsage}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-700/50 hover:bg-slate-600/60 text-slate-300 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950/50 overflow-auto max-h-[120px] whitespace-pre">
                <code>{usageCode}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="mt-8 p-5 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" />
          About Web Components
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
          <div>
            <strong className="text-slate-300">Shadow DOM</strong>
            <p className="mt-1">
              Styles and DOM are fully encapsulated. No CSS leaks in or out.
              Access elements via{' '}
              <code className="text-brand-400">this.shadowRoot</code>.
            </p>
          </div>
          <div>
            <strong className="text-slate-300">Custom Elements</strong>
            <p className="mt-1">
              Define new HTML tags with{' '}
              <code className="text-brand-400">
                customElements.define()
              </code>. Tag names must contain a hyphen.
            </p>
          </div>
          <div>
            <strong className="text-slate-300">Lifecycle</strong>
            <p className="mt-1">
              <code className="text-brand-400">connectedCallback</code> — added
              to DOM.{' '}
              <code className="text-brand-400">disconnectedCallback</code> —
              removed.{' '}
              <code className="text-brand-400">
                attributeChangedCallback
              </code>{' '}
              — attr change.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
