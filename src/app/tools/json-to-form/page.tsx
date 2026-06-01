'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Download,
  Code2,
  Eye,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'url'
  | 'number'
  | 'tel'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'color'
  | 'checkbox'
  | 'textarea'
  | 'select';

interface FormField {
  key: string;
  label: string;
  type: FieldType;
  placeholder: string;
  required: boolean;
  defaultValue: string;
  options?: string[];
  rows?: number;
}

// ── Auto-detect field type ─────────────────────────────────────────────────

function detectType(key: string, value: unknown): FieldType {
  const k = key.toLowerCase();

  if (k.includes('email') || k.includes('e-mail')) return 'email';
  if (k.includes('password') || k.includes('passwd') || k.includes('pwd')) return 'password';
  if (k.includes('url') || k.includes('website') || k.includes('link')) return 'url';
  if (k.includes('phone') || k.includes('mobile') || k.includes('tel')) return 'tel';
  if (k.includes('date') && !k.includes('birthday')) return 'date';
  if (k.includes('time') && !k.includes('datetime')) return 'time';
  if (k.includes('color') || k.includes('colour')) return 'color';
  if (k.includes('message') || k.includes('description') || k.includes('bio') || k.includes('notes') || k.includes('comment')) return 'textarea';
  if (k.includes('country') || k.includes('state') || k.includes('status') || k.includes('type') || k.includes('category') || k.includes('role')) return 'select';

  if (typeof value === 'boolean') return 'checkbox';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (/^https?:\/\//.test(value)) return 'url';
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return 'email';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return 'color';
    if (value.length > 100) return 'textarea';
  }

  return 'text';
}

function toTitleCase(key: string): string {
  return key
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function defaultPlaceholder(type: FieldType, label: string): string {
  switch (type) {
    case 'email': return 'you@example.com';
    case 'url': return 'https://example.com';
    case 'password': return '••••••••';
    case 'tel': return '+1 (555) 000-0000';
    case 'number': return '0';
    case 'date': return 'YYYY-MM-DD';
    case 'time': return 'HH:MM';
    case 'datetime-local': return 'YYYY-MM-DDTHH:MM';
    case 'textarea': return `Enter ${label.toLowerCase()}...`;
    default: return `Enter ${label.toLowerCase()}`;
  }
}

// ── Generate HTML ──────────────────────────────────────────────────────────

function generateHtmlForm(
  fields: FormField[],
  includeCss: boolean,
  formId: string,
  submitLabel: string,
): string {
  const lines: string[] = [];

  if (includeCss) {
    lines.push(`<style>
  .auto-form { max-width: 560px; font-family: system-ui, sans-serif; }
  .auto-form .form-group { margin-bottom: 1.25rem; }
  .auto-form label { display: block; margin-bottom: 0.375rem; font-weight: 600; font-size: 0.875rem; color: #1e293b; }
  .auto-form label .req { color: #ef4444; margin-left: 0.125rem; }
  .auto-form input, .auto-form textarea, .auto-form select {
    width: 100%; padding: 0.625rem 0.75rem; border: 1.5px solid #cbd5e1;
    border-radius: 0.5rem; font-size: 0.9375rem; font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
    background: #fff; color: #0f172a;
  }
  .auto-form input:focus, .auto-form textarea:focus, .auto-form select:focus {
    outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }
  .auto-form textarea { resize: vertical; min-height: 100px; }
  .auto-form input[type="checkbox"] { width: auto; margin-right: 0.5rem; accent-color: #6366f1; }
  .auto-form .cb-group { display: flex; align-items: center; gap: 0.5rem; }
  .auto-form button[type="submit"] {
    padding: 0.6875rem 1.75rem; background: #6366f1; color: #fff; border: none;
    border-radius: 0.5rem; font-size: 0.9375rem; font-weight: 600; cursor: pointer;
    transition: background 0.15s;
  }
  .auto-form button[type="submit"]:hover { background: #4f46e5; }
</style>
`);
  }

  lines.push(`<form class="auto-form" id="${formId}" onsubmit="event.preventDefault(); console.log(Object.fromEntries(new FormData(event.target)));">`);

  for (const field of fields) {
    const lab = `${field.label}${field.required ? '<span class="req">*</span>' : ''}`;
    const req = field.required ? ' required' : '';
    const id = `f-${field.key.replace(/[^a-zA-Z0-9]/g, '-')}`;

    if (field.type === 'textarea') {
      lines.push(`  <div class="form-group">`);
      lines.push(`    <label for="${id}">${lab}</label>`);
      lines.push(`    <textarea id="${id}" name="${field.key}" placeholder="${field.placeholder}" rows="${field.rows || 4}"${req}>${esc(field.defaultValue)}</textarea>`);
      lines.push(`  </div>`);
    } else if (field.type === 'select') {
      lines.push(`  <div class="form-group">`);
      lines.push(`    <label for="${id}">${lab}</label>`);
      lines.push(`    <select id="${id}" name="${field.key}"${req}>`);
      for (const opt of (field.options || [])) {
        const sel = opt === field.defaultValue ? ' selected' : '';
        lines.push(`      <option value="${esc(opt)}"${sel}>${esc(opt)}</option>`);
      }
      lines.push(`    </select>`);
      lines.push(`  </div>`);
    } else if (field.type === 'checkbox') {
      const chk = field.defaultValue === 'true' ? ' checked' : '';
      lines.push(`  <div class="form-group">`);
      lines.push(`    <div class="cb-group">`);
      lines.push(`      <input type="checkbox" id="${id}" name="${field.key}"${chk}${req} />`);
      lines.push(`      <label for="${id}">${lab}</label>`);
      lines.push(`    </div>`);
      lines.push(`  </div>`);
    } else {
      lines.push(`  <div class="form-group">`);
      lines.push(`    <label for="${id}">${lab}</label>`);
      lines.push(`    <input type="${field.type}" id="${id}" name="${field.key}" placeholder="${field.placeholder}" value="${esc(field.defaultValue)}"${req} />`);
      lines.push(`  </div>`);
    }
  }

  lines.push(`  <button type="submit">${esc(submitLabel)}</button>`);
  lines.push(`</form>`);

  return lines.join('\n');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Samples ────────────────────────────────────────────────────────────────

const SAMPLES: Record<string, string> = {
  'Contact Form': JSON.stringify(
    {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 555-0123',
      message: 'Hi, I would like to learn more about your services.',
      preferredContact: 'email',
      subscribe: true,
    },
    null,
    2,
  ),
  'Sign Up Form': JSON.stringify(
    {
      username: 'janedev',
      email: 'jane@example.com',
      password: '',
      role: 'developer',
      acceptTerms: false,
    },
    null,
    2,
  ),
  'Product Form': JSON.stringify(
    {
      productName: '',
      price: 0,
      category: 'Electronics',
      color: '#6366f1',
      inStock: true,
      description: '',
      releaseDate: '2026-06-01',
    },
    null,
    2,
  ),
  'Job Application': JSON.stringify(
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      resumeUrl: 'https://example.com/resume.pdf',
      linkedIn: 'https://linkedin.com/in/janedoe',
      position: 'Frontend',
      coverLetter: '',
      availableFrom: '2026-07-01',
    },
    null,
    2,
  ),
};

// ── Component ──────────────────────────────────────────────────────────────

export default function JsonToFormPage() {
  const [jsonInput, setJsonInput] = useState(SAMPLES['Contact Form']);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formId, setFormId] = useState('auto-form');
  const [submitLabel, setSubmitLabel] = useState('Submit');
  const [includeCss, setIncludeCss] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const { fields, validJson } = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('JSON must be an object (not an array or primitive).');
        return { fields: [] as FormField[], validJson: false };
      }
      setJsonError(null);
      const obj = parsed as Record<string, unknown>;
      const keys = Object.keys(obj);
      const detected: FormField[] = keys.map((key) => {
        const value = obj[key];
        const type = detectType(key, value);
        const label = toTitleCase(key);
        return {
          key,
          label,
          type,
          placeholder: defaultPlaceholder(type, label),
          required: key.toLowerCase().includes('name') || key.toLowerCase().includes('email'),
          defaultValue:
            type === 'checkbox'
              ? String(Boolean(value))
              : type === 'number'
              ? String(value)
              : typeof value === 'string'
              ? value
              : '',
          options: type === 'select' ? [typeof value === 'string' ? value : 'Option 1', 'Option 2', 'Option 3'] : undefined,
          rows: type === 'textarea' ? 4 : undefined,
        };
      });
      return { fields: detected, validJson: true };
    } catch {
      setJsonError('Invalid JSON — please check syntax.');
      return { fields: [] as FormField[], validJson: false };
    }
  }, [jsonInput]);

  const generatedHtml = useMemo(() => {
    if (!validJson || fields.length === 0) return '';
    return generateHtmlForm(fields, includeCss, formId, submitLabel);
  }, [fields, includeCss, formId, submitLabel, validJson]);

  const copyHtml = useCallback(async () => {
    await navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    toast.success('HTML copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [generatedHtml]);

  const downloadHtml = useCallback(() => {
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formId || 'form'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [generatedHtml, formId]);

  const loadSample = useCallback((name: string) => {
    setJsonInput(SAMPLES[name] || SAMPLES['Contact Form']);
  }, []);

  const reset = useCallback(() => {
    setJsonInput(SAMPLES['Contact Form']);
    setFormId('auto-form');
    setSubmitLabel('Submit');
    setIncludeCss(true);
    setJsonError(null);
  }, []);

  return (
    <ToolLayout
      title="JSON to HTML Form Generator"
      description="Paste a JSON object and instantly get an accessible, production-ready HTML form. Auto-detects field types — email, password, URL, date, color, textarea, select, and more."
    >
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-lg bg-surface-light border border-slate-700/50">
        <select
          onChange={(e) => loadSample(e.target.value)}
          className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:border-brand-400"
          defaultValue=""
        >
          <option value="" disabled>Load sample...</option>
          {Object.keys(SAMPLES).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <label>Form ID:</label>
          <input
            type="text"
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            className="w-28 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <label>Button:</label>
          <input
            type="text"
            value={submitLabel}
            onChange={(e) => setSubmitLabel(e.target.value)}
            className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:border-brand-400"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCss}
            onChange={(e) => setIncludeCss(e.target.checked)}
            className="accent-brand-400"
          />
          Include CSS
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={copyHtml}
            className="px-3 py-1.5 rounded-md text-sm bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-1.5"
            disabled={!validJson}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy HTML'}
          </button>
          <button
            onClick={downloadHtml}
            className="px-3 py-1.5 rounded-md text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1.5"
            disabled={!validJson}
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>

      {/* Main Grid: JSON Input | Preview/Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: JSON Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Code2 className="w-4 h-4" /> JSON Input
            </h3>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-[460px] p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-slate-200 focus:outline-none focus:border-brand-400 resize-none"
            placeholder='{ "name": "Jane", "email": "jane@example.com" }'
            spellCheck={false}
          />
          {jsonError && (
            <div className="mt-2 flex items-center gap-1.5 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {jsonError}
            </div>
          )}
        </div>

        {/* Right: Tabs + Preview/Code */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-t-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-surface-light border border-slate-700 border-b-0 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" /> Live Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-t-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-surface-light border border-slate-700 border-b-0 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-4 h-4" /> HTML Code
            </button>
          </div>

          <div className="h-[460px] rounded-lg rounded-tl-none border border-slate-700 bg-surface-light overflow-auto">
            {activeTab === 'preview' && validJson && fields.length > 0 ? (
              <div className="p-6">
                {/* Field badges */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {fields.map((field, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300"
                    >
                      <span className="text-brand-400">{field.type}</span>
                      {field.label}
                      {field.required && <span className="text-red-400">*</span>}
                    </span>
                  ))}
                </div>
                {/* Rendered form */}
                <div dangerouslySetInnerHTML={{ __html: generatedHtml }} />
              </div>
            ) : activeTab === 'preview' ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {jsonError ? 'Fix JSON errors to see preview.' : 'Enter valid JSON to generate a form.'}
              </div>
            ) : validJson && fields.length > 0 ? (
              <pre className="p-4 text-sm font-mono text-slate-300 whitespace-pre overflow-auto h-full">
                <code>{generatedHtml}</code>
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {jsonError ? 'Fix JSON errors to see HTML.' : 'Enter valid JSON to generate HTML.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detection Rules */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Detection Rules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs text-slate-400">
          <div><span className="text-brand-400 font-mono">email</span> → keys with &quot;email&quot;</div>
          <div><span className="text-brand-400 font-mono">password</span> → keys with &quot;password&quot;</div>
          <div><span className="text-brand-400 font-mono">url</span> → keys with &quot;url&quot;, &quot;website&quot;, &quot;link&quot;</div>
          <div><span className="text-brand-400 font-mono">tel</span> → keys with &quot;phone&quot;, &quot;mobile&quot;</div>
          <div><span className="text-brand-400 font-mono">date</span> → keys with &quot;date&quot;</div>
          <div><span className="text-brand-400 font-mono">color</span> → keys with &quot;color&quot;</div>
          <div><span className="text-brand-400 font-mono">textarea</span> → keys with &quot;message&quot;, &quot;description&quot;, &quot;bio&quot;</div>
          <div><span className="text-brand-400 font-mono">number</span> → number values</div>
          <div><span className="text-brand-400 font-mono">checkbox</span> → boolean values</div>
          <div><span className="text-brand-400 font-mono">select</span> → keys with &quot;status&quot;, &quot;type&quot;, &quot;category&quot;, &quot;role&quot;</div>
          <div><span className="text-brand-400 font-mono">textarea</span> → values longer than 100 characters</div>
          <div><span className="text-slate-500">Required</span> → keys with &quot;name&quot; or &quot;email&quot;</div>
        </div>
      </div>
    </ToolLayout>
  );
}
