'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, Eye, Code2, Grid3X3, List, Check, Info, ExternalLink, SlidersHorizontal, CalendarDays, Play } from 'lucide-react';
import toast from 'react-hot-toast';

// ── All HTML input types ─────────────────────────────────────────────────────

interface InputTypeDef {
  type: string;
  category: 'text' | 'numeric' | 'datetime' | 'selection' | 'file' | 'action' | 'other';
  description: string;
  label?: string;
  defaultValue?: string;
  note?: string;
  support?: 'baseline' | 'widely' | 'limited';
}

const INPUT_TYPES: InputTypeDef[] = [
  // Textual
  { type: 'text', category: 'text', description: 'Default single-line text field', label: 'Name', defaultValue: 'DevBench user', support: 'baseline' },
  { type: 'password', category: 'text', description: 'Obfuscated text input', label: 'Password', defaultValue: 's3cret!', support: 'baseline' },
  { type: 'email', category: 'text', description: 'Email address with validation', label: 'Email', defaultValue: 'hello@devbench.com', support: 'baseline' },
  { type: 'tel', category: 'text', description: 'Telephone number keypad on mobile', label: 'Phone', defaultValue: '+1 (555) 123-4567', support: 'baseline' },
  { type: 'url', category: 'text', description: 'URL with protocol validation', label: 'Website', defaultValue: 'https://devbench.com', support: 'baseline' },
  { type: 'search', category: 'text', description: 'Search field with clear button', label: 'Search', defaultValue: 'developer tools', support: 'baseline' },

  // Numeric
  { type: 'number', category: 'numeric', description: 'Numeric input with stepper arrows', label: 'Quantity', defaultValue: '42', support: 'baseline' },
  { type: 'range', category: 'numeric', description: 'Slider for selecting a value in a range', label: 'Volume', defaultValue: '75', support: 'baseline', note: 'min="0" max="100"' },

  // Date & Time
  { type: 'date', category: 'datetime', description: 'Date picker (year, month, day)', label: 'Start date', defaultValue: '2026-01-15', support: 'baseline' },
  { type: 'time', category: 'datetime', description: 'Time picker (hours, minutes)', label: 'Alarm', defaultValue: '09:00', support: 'baseline' },
  { type: 'datetime-local', category: 'datetime', description: 'Date + time picker (no timezone)', label: 'Appointment', defaultValue: '2026-01-15T09:00', support: 'baseline' },
  { type: 'month', category: 'datetime', description: 'Month + year picker', label: 'Billing month', defaultValue: '2026-01', support: 'baseline' },
  { type: 'week', category: 'datetime', description: 'Week + year picker', label: 'Sprint', defaultValue: '2026-W03', support: 'widely', note: 'Chrome, Edge, Opera. Not in Firefox.' },

  // Selection
  { type: 'checkbox', category: 'selection', description: 'Boolean toggle — on/off', label: 'Subscribe to newsletter', support: 'baseline' },
  { type: 'radio', category: 'selection', description: 'Single choice from a group', label: 'Plan', defaultValue: 'pro', support: 'baseline', note: 'Multiple with same name' },
  { type: 'color', category: 'selection', description: 'Native color picker', label: 'Favorite color', defaultValue: '#6366f1', support: 'baseline' },

  // File
  { type: 'file', category: 'file', description: 'File upload with native picker', label: 'Attachment', support: 'baseline' },

  // Action
  { type: 'submit', category: 'action', description: 'Form submit button', label: 'Submit', support: 'baseline' },
  { type: 'reset', category: 'action', description: 'Form reset button', label: 'Reset', support: 'baseline' },
  { type: 'button', category: 'action', description: 'Generic clickable button', label: 'Click me', support: 'baseline' },
  { type: 'image', category: 'action', description: 'Graphical submit button (image src)', label: 'Submit Image', support: 'baseline', note: 'Requires src attribute' },

  // Other
  { type: 'hidden', category: 'other', description: 'Invisible data — sent with form', label: 'Hidden field', support: 'baseline' },
];

const CATEGORIES = [
  { key: 'all', label: 'All Types', icon: Grid3X3 },
  { key: 'text', label: 'Text', icon: Code2 },
  { key: 'numeric', label: 'Numeric', icon: SlidersHorizontal },
  { key: 'datetime', label: 'Date & Time', icon: CalendarDays },
  { key: 'selection', label: 'Selection', icon: Check },
  { key: 'file', label: 'File', icon: ExternalLink },
  { key: 'action', label: 'Action', icon: Play },
] as const;

const SUPPORT_BADGES: Record<string, { label: string; cls: string }> = {
  baseline: { label: 'Baseline', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  widely: { label: 'Widely Available', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  limited: { label: 'Limited', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

const CATEGORY_COLORS: Record<string, string> = {
  text: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
  numeric: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  datetime: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  selection: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  file: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
  action: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  other: 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
};

// ── Page Component ──────────────────────────────────────────────────────────

export default function HtmlInputExplorerPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [renderedValues, setRenderedValues] = useState<Record<string, string>>({});
  const [showSourceFor, setShowSourceFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let types = INPUT_TYPES;
    if (categoryFilter !== 'all') {
      types = types.filter(t => t.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      types = types.filter(
        t =>
          t.type.includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.label?.toLowerCase().includes(q) ||
          t.category.toLowerCase() === q,
      );
    }
    return types;
  }, [search, categoryFilter]);

  const handleValueChange = useCallback((type: string, value: string) => {
    setRenderedValues(prev => ({ ...prev, [type]: value }));
  }, []);

  const copyHtml = useCallback((def: InputTypeDef) => {
    const val = renderedValues[def.type] ?? def.defaultValue ?? '';
    let html = `<input type="${def.type}"`;

    if (def.type === 'range') {
      html += ' min="0" max="100"';
    }
    if (def.type === 'number') {
      html += ' min="0" max="999"';
    }
    if (def.type === 'checkbox' && val === 'checked') {
      html += ' checked';
    }
    if (def.type === 'radio') {
      html += ` name="group" value="${val}"`;
    }
    if (!['checkbox', 'radio', 'submit', 'reset', 'button', 'image', 'hidden'].includes(def.type)) {
      html += ` placeholder="${def.label}"`;
      if (val && def.type !== 'password' && def.type !== 'file' && def.type !== 'color') {
        html += ` value="${val.replace(/"/g, '&quot;')}"`;
      }
    }
    if (def.type === 'color' && val) {
      html += ` value="${val}"`;
    }

    html += '>';
    if (def.type === 'submit' || def.type === 'reset' || def.type === 'button') {
      html = `<button type="${def.type}">${def.label}</button>`;
    }

    navigator.clipboard.writeText(html);
    toast.success(`Copied <input type="${def.type}"> HTML`);
  }, [renderedValues]);

  const copyAllHtml = useCallback(() => {
    let fullHtml = '<form>\n';
    for (const def of INPUT_TYPES) {
      if (def.type === 'hidden') {fullHtml += `  <!-- ${def.description} -->\n  <input type="hidden" name="hidden-field" value="secret">\n`; continue;}
      if (['submit','reset','button'].includes(def.type)) {
        fullHtml += `  <button type="${def.type}">${def.label}</button>\n`;
        continue;
      }
      if (def.type === 'image') {fullHtml += `  <input type="image" src="btn.png" alt="${def.label}">\n`; continue;}
      const val = renderedValues[def.type] ?? def.defaultValue ?? '';
      let el = `  <label>${def.label}<br><input type="${def.type}"`;
      if (def.type==='range') el+=' min="0" max="100"';
      if (['checkbox','radio','file','color'].includes(def.type) || val) {
        if (def.type==='checkbox' && val==='checked') el+=' checked';
        else if (def.type==='radio') el+=` name="group" value="${val}"${val==='pro'?' checked':''}`;
        else if (def.type==='color' && val) el+=` value="${val}"`;
        else if (!['checkbox','radio','file','color'].includes(def.type) && val && def.type!=='password') el+=` value="${val.replace(/"/g, '&quot;')}"`;
      }
      el+='>';

      if (def.type==='radio') {
        fullHtml += `${el}</label>\n`;
        const altVal = val==='pro'?'free':'pro';
        fullHtml += `  <label><input type="radio" name="group" value="${altVal}"${val!=='pro'?' checked':''}> ${altVal}</label>\n`;
      } else {
        el += '</label>\n';
        fullHtml += el;
      }
    }
    fullHtml += '</form>';
    navigator.clipboard.writeText(fullHtml);
    toast.success('Copied full HTML form with all input types');
  }, [renderedValues]);

  return (
    <ToolLayout
      title="HTML Input Explorer"
      description="Interactive reference for every HTML <input> type — see them rendered live, copy the HTML, and understand browser support."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyAllHtml}
            className="px-3 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 text-sm font-medium border border-brand-500/30 transition-colors flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy All
          </button>
        </div>
      }
    >
      {/* Search & Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter inputs by name, description, or category..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 items-center bg-slate-800/30 rounded-lg p-1 border border-slate-700/50">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = cat.key === 'all' ? INPUT_TYPES.length : INPUT_TYPES.filter(t => t.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                categoryFilter === cat.key
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
              <span className="opacity-50 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500 mb-4">
        Showing {filtered.length} of {INPUT_TYPES.length} input types
      </p>

      {/* Input Cards */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((def) => (
            <InputCard
              key={def.type}
              def={def}
              value={renderedValues[def.type] ?? def.defaultValue ?? ''}
              onValueChange={(v) => handleValueChange(def.type, v)}
              onCopy={() => copyHtml(def)}
              showSource={showSourceFor === def.type}
              onToggleSource={() => setShowSourceFor(showSourceFor === def.type ? null : def.type)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((def) => (
            <InputRow
              key={def.type}
              def={def}
              value={renderedValues[def.type] ?? def.defaultValue ?? ''}
              onValueChange={(v) => handleValueChange(def.type, v)}
              onCopy={() => copyHtml(def)}
              showSource={showSourceFor === def.type}
              onToggleSource={() => setShowSourceFor(showSourceFor === def.type ? null : def.type)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No input types match your search</p>
          <p className="text-sm mt-1">Try a different query or category filter.</p>
        </div>
      )}

      {/* Reference footer */}
      <div className="mt-12 p-5 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">About &lt;input&gt; Types</h2>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          HTML defines 24 input types. Unknown types fall back to <code className="text-slate-300 bg-slate-700/50 px-1 rounded">type=&quot;text&quot;</code>.
          Newer types like <code className="text-slate-300 bg-slate-700/50 px-1 rounded">week</code> and <code className="text-slate-300 bg-slate-700/50 px-1 rounded">color</code> may render differently across browsers
          — always test in your target browsers. MDN references:{' '}
          <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input" target="_blank" rel="noopener" className="text-brand-400 hover:underline">
            &lt;input&gt; element
          </a>
          {' '}·{' '}
          <a href="https://caniuse.com/?search=input%20type" target="_blank" rel="noopener" className="text-brand-400 hover:underline">
            Can I Use
          </a>
        </p>
      </div>
    </ToolLayout>
  );
}

// ── Grid Card ────────────────────────────────────────────────────────────────

function InputCard({
  def,
  value,
  onValueChange,
  onCopy,
  showSource,
  onToggleSource,
}: {
  def: InputTypeDef;
  value: string;
  onValueChange: (v: string) => void;
  onCopy: () => void;
  showSource: boolean;
  onToggleSource: () => void;
}) {
  const badge = SUPPORT_BADGES[def.support ?? 'baseline'];
  const gradient = CATEGORY_COLORS[def.category] ?? CATEGORY_COLORS.other;

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${gradient} p-4 flex flex-col group`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono font-semibold text-white bg-slate-900/60 px-2 py-0.5 rounded">
            type=&quot;{def.type}&quot;
          </code>
          {badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSource}
            className={`p-1 rounded-md transition-colors ${showSource ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="View HTML source"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCopy}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
            title="Copy HTML"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-3">{def.description}</p>

      {/* Live render */}
      <div className="flex-1 flex items-end">
        <div className="w-full">
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            {def.label}
          </label>
          {renderInput(def, value, onValueChange)}
        </div>
      </div>

      {/* Source code preview */}
      {showSource && (
        <div className="mt-3 pt-3 border-t border-slate-700/40">
          <pre className="text-xs font-mono text-emerald-300 bg-slate-950/70 rounded-lg p-2.5 overflow-x-auto">
            <code>{buildInputHtml(def, value)}</code>
          </pre>
        </div>
      )}

      {/* Note */}
      {def.note && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {def.note}
        </div>
      )}
    </div>
  );
}

// ── List Row ─────────────────────────────────────────────────────────────────

function InputRow({
  def,
  value,
  onValueChange,
  onCopy,
  showSource,
  onToggleSource,
}: {
  def: InputTypeDef;
  value: string;
  onValueChange: (v: string) => void;
  onCopy: () => void;
  showSource: boolean;
  onToggleSource: () => void;
}) {
  const badge = SUPPORT_BADGES[def.support ?? 'baseline'];
  const gradient = CATEGORY_COLORS[def.category] ?? CATEGORY_COLORS.other;

  return (
    <div className={`rounded-xl border bg-gradient-to-r ${gradient} p-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-sm font-mono font-semibold text-white bg-slate-900/60 px-2 py-0.5 rounded">
              type=&quot;{def.type}&quot;
            </code>
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{def.description}</p>
          {def.note && (
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> {def.note}
            </p>
          )}
        </div>

        {/* Live render */}
        <div className="sm:w-64 flex-shrink-0">
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            {def.label}
          </label>
          {renderInput(def, value, onValueChange)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggleSource} className={`p-1.5 rounded-md transition-colors ${showSource ? 'bg-brand-500/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Code2 className="w-4 h-4" />
          </button>
          <button onClick={onCopy} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 transition-colors">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSource && (
        <div className="mt-3 pt-3 border-t border-slate-700/40">
          <pre className="text-xs font-mono text-emerald-300 bg-slate-950/70 rounded-lg p-2.5 overflow-x-auto">
            <code>{buildInputHtml(def, value)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Render the actual input element ──────────────────────────────────────────

const baseInputClass =
  'w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-colors placeholder:text-slate-600';

function renderInput(def: InputTypeDef, value: string, onChange: (v: string) => void) {
  switch (def.type) {
    case 'textarea':
      return null; // not in this dataset

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === 'checked'}
            onChange={e => onChange(e.target.checked ? 'checked' : '')}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800/60 text-brand-500 focus:ring-brand-500/30 cursor-pointer"
          />
          <span className="text-xs text-slate-400">I agree</span>
        </label>
      );

    case 'radio':
      return (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`radio-${def.type}`}
              value="pro"
              checked={value === 'pro'}
              onChange={e => onChange(e.target.value)}
              className="w-4 h-4 border-slate-600 bg-slate-800/60 text-brand-500 focus:ring-brand-500/30 cursor-pointer"
            />
            <span className="text-xs text-slate-400">Pro</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={`radio-${def.type}`}
              value="free"
              checked={value === 'free'}
              onChange={e => onChange(e.target.value)}
              className="w-4 h-4 border-slate-600 bg-slate-800/60 text-brand-500 focus:ring-brand-500/30 cursor-pointer"
            />
            <span className="text-xs text-slate-400">Free</span>
          </label>
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#6366f1'}
            onChange={e => onChange(e.target.value)}
            className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
          />
          <code className="text-xs font-mono text-slate-400">{value || '#6366f1'}</code>
        </div>
      );

    case 'range':
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={value || '75'}
            onChange={e => onChange(e.target.value)}
            className="flex-1 h-2 rounded-full appearance-none bg-slate-700 cursor-pointer accent-brand-500"
          />
          <span className="text-xs font-mono text-slate-400 w-8 text-right">{value || '75'}</span>
        </div>
      );

    case 'file':
      return (
        <input
          type="file"
          onChange={e => onChange(e.target.files?.[0]?.name ?? '')}
          className={`${baseInputClass} file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-brand-500/20 file:text-brand-400 hover:file:bg-brand-500/30 cursor-pointer`}
        />
      );

    case 'submit':
      return (
        <button
          type="submit"
          onClick={e => e.preventDefault()}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Submit
        </button>
      );

    case 'reset':
      return (
        <button
          type="reset"
          onClick={e => e.preventDefault()}
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors border border-slate-600"
        >
          Reset
        </button>
      );

    case 'button':
      return (
        <button
          type="button"
          onClick={e => e.preventDefault()}
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 transition-colors border border-slate-600"
        >
          Click me
        </button>
      );

    case 'image':
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Eye className="w-3.5 h-3.5" />
          Would render an image button (needs src attr)
        </div>
      );

    case 'hidden':
      return (
        <div className="flex items-center gap-2 text-xs text-slate-600 italic">
          <Eye className="w-3.5 h-3.5" />
          Rendered invisibly — sent with form data
        </div>
      );

    case 'password':
      return (
        <input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={baseInputClass}
        />
      );

    case 'search':
      return (
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={baseInputClass}
        />
      );

    default:
      return (
        <input
          type={def.type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={def.label}
          className={baseInputClass}
        />
      );
  }
}

// ── Build HTML string ────────────────────────────────────────────────────────

function buildInputHtml(def: InputTypeDef, value: string): string {
  if (def.type === 'hidden') {
    return '<input type="hidden" name="secret" value="...">';
  }
  if (['submit', 'reset', 'button'].includes(def.type)) {
    const label = def.type === 'submit' ? 'Submit' : def.type === 'reset' ? 'Reset' : 'Click me';
    return `<button type="${def.type}">${label}</button>`;
  }
  if (def.type === 'image') {
    return '<input type="image" src="button.png" alt="Submit">';
  }

  let html = `<input type="${def.type}"`;

  if (def.type === 'range') {
    html += ' min="0" max="100"';
  }
  if (def.type === 'number') {
    html += ' min="0" max="999"';
  }
  if (def.type === 'checkbox' && value === 'checked') {
    html += ' checked';
  }
  if (def.type === 'radio') {
    html += ` name="plan" value="${value}"${value === 'pro' ? ' checked' : ''}`;
  }
  if (!['checkbox', 'radio', 'submit', 'reset', 'button', 'image', 'hidden'].includes(def.type)) {
    html += ` placeholder="${def.label}"`;
    if (value && def.type !== 'password' && def.type !== 'color') {
      html += ` value="${value.replace(/"/g, '&quot;')}"`;
    }
  }
  if (def.type === 'color' && value) {
    html += ` value="${value}"`;
  }

  html += '>';
  return html;
}
