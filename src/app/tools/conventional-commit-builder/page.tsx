'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, GitCommit, Info, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type CommitType = {
  type: string;
  emoji: string;
  label: string;
  description: string;
  category: 'feature' | 'fix' | 'chore';
};

interface CommitState {
  type: string;
  scope: string;
  breakBefore: boolean;
  description: string;
  body: string;
  breakingChange: boolean;
  breakingChangeDesc: string;
  footerRefs: { token: string; value: string }[];
}

interface Preset {
  label: string;
  description: string;
  commit: CommitState;
}

// ── Constants ──────────────────────────────────────────────────────────────

const COMMIT_TYPES: CommitType[] = [
  { type: 'feat', emoji: '✨', label: 'feat', description: 'A new feature', category: 'feature' },
  { type: 'fix', emoji: '🐛', label: 'fix', description: 'A bug fix', category: 'fix' },
  { type: 'docs', emoji: '📝', label: 'docs', description: 'Documentation only changes', category: 'chore' },
  { type: 'style', emoji: '💄', label: 'style', description: 'Formatting, missing semicolons, etc; no code change', category: 'chore' },
  { type: 'refactor', emoji: '♻️', label: 'refactor', description: 'A code change that neither fixes a bug nor adds a feature', category: 'chore' },
  { type: 'perf', emoji: '⚡', label: 'perf', description: 'A code change that improves performance', category: 'chore' },
  { type: 'test', emoji: '✅', label: 'test', description: 'Adding missing tests or correcting existing tests', category: 'chore' },
  { type: 'build', emoji: '📦️', label: 'build', description: 'Changes that affect the build system or external dependencies', category: 'chore' },
  { type: 'ci', emoji: '👷', label: 'ci', description: 'Changes to CI configuration files and scripts', category: 'chore' },
  { type: 'chore', emoji: '🔧', label: 'chore', description: 'Other changes that don\'t modify src or test files', category: 'chore' },
  { type: 'revert', emoji: '⏪', label: 'revert', description: 'Reverts a previous commit', category: 'chore' },
];

const SCOPES = [
  'auth', 'api', 'ui', 'core', 'cli', 'config',
  'deps', 'docs', 'ci', 'db', 'router', 'state',
  'a11y', 'i18n', 'perf', 'security', 'tests', 'ux',
];

const PRESETS: Preset[] = [
  {
    label: 'New Feature',
    description: 'Standard feature commit',
    commit: {
      type: 'feat', scope: '', breakBefore: false,
      description: '', body: '', breakingChange: false, breakingChangeDesc: '',
      footerRefs: [],
    },
  },
  {
    label: 'Bug Fix',
    description: 'Bug fix with issue reference',
    commit: {
      type: 'fix', scope: '', breakBefore: false,
      description: '', body: '', breakingChange: false, breakingChangeDesc: '',
      footerRefs: [],
    },
  },
  {
    label: 'Breaking Change',
    description: 'Feature with breaking changes',
    commit: {
      type: 'feat', scope: 'api', breakBefore: true,
      description: '', body: '', breakingChange: true, breakingChangeDesc: 'Drops support for Node 14',
      footerRefs: [],
    },
  },
  {
    label: 'Docs Update',
    description: 'Documentation changes',
    commit: {
      type: 'docs', scope: '', breakBefore: false,
      description: '', body: '', breakingChange: false, breakingChangeDesc: '',
      footerRefs: [],
    },
  },
  {
    label: 'Dependency Update',
    description: 'Update or add dependencies',
    commit: {
      type: 'build', scope: 'deps', breakBefore: false,
      description: '', body: '', breakingChange: false, breakingChangeDesc: '',
      footerRefs: [],
    },
  },
  {
    label: 'CI Pipeline',
    description: 'CI/CD configuration changes',
    commit: {
      type: 'ci', scope: '', breakBefore: false,
      description: '', body: '', breakingChange: false, breakingChangeDesc: '',
      footerRefs: [],
    },
  },
];

const DEFAULT_STATE: CommitState = {
  type: 'feat',
  scope: '',
  breakBefore: false,
  description: '',
  body: '',
  breakingChange: false,
  breakingChangeDesc: '',
  footerRefs: [],
};

// ── Header length constants ──────────────────────────────────────────────────

const MAX_HEADER_LEN = 72;
const MAX_BODY_LINE_LEN = 100;

// ── Generate commit message ─────────────────────────────────────────────────

function generateCommitMessage(state: CommitState): string {
  const { type, scope, breakBefore, description, body, breakingChange, breakingChangeDesc, footerRefs } = state;

  // Build header
  let header = type;
  if (scope.trim()) {
    header += `(${scope.trim()})`;
  }
  if (breakBefore) {
    header += '!';
  }
  header += `: ${description || '<description>'}`;

  const parts: string[] = [header];

  if (body.trim()) {
    parts.push('');
    parts.push(body.trim());
  }

  const hasFooter = breakingChange || footerRefs.some(f => f.token.trim() && f.value.trim());
  if (hasFooter) {
    parts.push('');
    if (breakingChange && breakingChangeDesc.trim()) {
      parts.push(`BREAKING CHANGE: ${breakingChangeDesc.trim()}`);
    }
    for (const ref of footerRefs) {
      if (ref.token.trim() && ref.value.trim()) {
        parts.push(`${ref.token.trim()}: ${ref.value.trim()}`);
      }
    }
  }

  return parts.join('\n');
}

// ── Validation ─────────────────────────────────────────────────────────────

interface Validation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateCommit(state: CommitState): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!state.description.trim()) {
    errors.push('Description is required');
  }

  const header = `${state.type}${state.scope.trim() ? `(${state.scope.trim()})` : ''}${state.breakBefore ? '!' : ''}: ${state.description}`;
  if (header.length > MAX_HEADER_LEN) {
    errors.push(`Header is ${header.length} chars (max ${MAX_HEADER_LEN})`);
  }

  if (state.description.trim() && /\.$/.test(state.description.trim())) {
    warnings.push('Description should not end with a period');
  }

  if (state.body) {
    const bodyLines = state.body.split('\n');
    const longLines = bodyLines.filter(l => l.length > MAX_BODY_LINE_LEN);
    if (longLines.length > 0) {
      warnings.push(`${longLines.length} body line(s) exceed ${MAX_BODY_LINE_LEN} chars`);
    }
  }

  if (state.breakingChange && !state.breakingChangeDesc.trim()) {
    errors.push('BREAKING CHANGE requires a description');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Commit type info tooltip ────────────────────────────────────────────────

function CommitTypeTooltip({ type }: { type: CommitType }) {
  return (
    <div className="absolute z-20 left-0 top-full mt-2 w-72 p-3 rounded-lg bg-slate-800 border border-slate-600 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{type.emoji}</span>
        <code className="text-brand-400 font-mono text-sm font-bold">{type.type}</code>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
          {type.category === 'feature' ? 'Feature' : type.category === 'fix' ? 'Fix' : 'Chore'}
        </span>
      </div>
      <p className="text-slate-300 text-xs leading-relaxed">{type.description}</p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ConventionalCommitBuilder() {
  const [state, setState] = useState<CommitState>(DEFAULT_STATE);
  const [showPresets, setShowPresets] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const commitMessage = useMemo(() => generateCommitMessage(state), [state]);
  const validation = useMemo(() => validateCommit(state), [state]);

  const headerLen = useMemo(() => {
    const header = `${state.type}${state.scope.trim() ? `(${state.scope.trim()})` : ''}${state.breakBefore ? '!' : ''}: ${state.description}`;
    return header.length;
  }, [state]);

  // Close type dropdown on outside click
  useEffect(() => {
    if (!typeDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [typeDropdownOpen]);

  const update = useCallback(<K extends keyof CommitState>(key: K, value: CommitState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setState({ ...preset.commit });
    setShowPresets(false);
  }, []);

  const reset = useCallback(() => {
    setState({ ...DEFAULT_STATE });
  }, []);

  const copyMessage = useCallback(() => {
    navigator.clipboard.writeText(commitMessage)
      .then(() => toast.success('Commit message copied!'))
      .catch(() => toast.error('Failed to copy'));
  }, [commitMessage]);

  const copyCommand = useCallback(() => {
    const cmd = `git commit -m "${commitMessage.split('\n')[0]}"`;
    if (state.body || state.footerRefs.some(f => f.token.trim())) {
      const full = `git commit -m "${commitMessage.split('\n')[0]}" -m "${commitMessage.split('\n').slice(2).join('\n').trim().replace(/"/g, '\\"')}"`;
      navigator.clipboard.writeText(full)
        .then(() => toast.success('Git command copied!'))
        .catch(() => toast.error('Failed to copy'));
      return;
    }
    navigator.clipboard.writeText(cmd)
      .then(() => toast.success('Git command copied!'))
      .catch(() => toast.error('Failed to copy'));
  }, [commitMessage, state]);

  const selectedType = COMMIT_TYPES.find(t => t.type === state.type)!;

  const addFooterRef = useCallback(() => {
    update('footerRefs', [...state.footerRefs, { token: '', value: '' }]);
  }, [state.footerRefs, update]);

  const updateFooterRef = useCallback((idx: number, field: 'token' | 'value', val: string) => {
    const refs = [...state.footerRefs];
    refs[idx] = { ...refs[idx], [field]: val };
    update('footerRefs', refs);
  }, [state.footerRefs, update]);

  const removeFooterRef = useCallback((idx: number) => {
    update('footerRefs', state.footerRefs.filter((_, i) => i !== idx));
  }, [state.footerRefs, update]);

  const handleBodyPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Allow normal paste behavior
  }, []);

  return (
    <ToolLayout
      title="Conventional Commits Builder"
      description="Build spec-compliant conventional commit messages with a visual editor. Choose types, add scopes, flag breaking changes, and copy ready-to-use git commands."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Editor */}
        <div className="space-y-5">
          {/* Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Templates</label>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {showPresets ? 'Hide' : 'Show'} presets ({PRESETS.length})
              </button>
            </div>
            {showPresets && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(p)}
                    className="text-left p-2.5 rounded-lg border border-slate-700/50 hover:border-brand-500/50 bg-slate-800/50 hover:bg-slate-800 transition-all group"
                  >
                    <div className="text-xs font-medium text-slate-200">{p.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type Selector */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Type <span className="text-red-400">*</span>
            </label>
            <div ref={typeDropdownRef} className="relative">
              <button
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedType.emoji}</span>
                  <code className="text-brand-400 font-mono font-bold text-sm">{selectedType.type}</code>
                  <span className="text-slate-500 text-xs">— {selectedType.description}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {typeDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 rounded-lg bg-slate-800 border border-slate-600 shadow-2xl py-1 max-h-64 overflow-y-auto">
                  {COMMIT_TYPES.map(t => (
                    <button
                      key={t.type}
                      onClick={() => { update('type', t.type); setTypeDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-700/50 transition-colors ${
                        state.type === t.type ? 'bg-brand-500/10 border-l-2 border-brand-500' : ''
                      }`}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <div>
                        <code className="text-slate-200 font-mono text-sm font-semibold">{t.type}</code>
                        <span className="text-slate-500 text-xs ml-1.5">{t.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Scope <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={state.scope}
                onChange={e => update('scope', e.target.value)}
                placeholder="e.g. auth, api, ui..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-sm text-slate-200 placeholder-slate-600 font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {SCOPES.map(s => (
                <button
                  key={s}
                  onClick={() => update('scope', state.scope === s ? '' : s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                    state.scope === s
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Breaking Change Toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={state.breakBefore}
                onChange={e => update('breakBefore', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 rounded-full bg-slate-700 peer-checked:bg-red-500/80 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <div>
              <span className="text-sm text-slate-300 font-medium">Breaking Change (<code className="text-red-400 text-xs">!</code>)</span>
              <span className="text-xs text-slate-500 ml-1">— MAJOR version bump</span>
            </div>
          </label>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
              <span>Description <span className="text-red-400">*</span></span>
              <span className={`text-xs font-mono ${headerLen > MAX_HEADER_LEN ? 'text-red-400' : 'text-slate-500'}`}>
                {headerLen}/{MAX_HEADER_LEN}
              </span>
            </label>
            <input
              type="text"
              value={state.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Add a short description in imperative mood..."
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-sm text-slate-200 placeholder-slate-600 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Use imperative mood: &quot;add&quot; not &quot;added&quot; or &quot;adds&quot;
            </p>
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Body <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={state.body}
              onChange={e => update('body', e.target.value)}
              onPaste={handleBodyPaste}
              placeholder="Additional details, motivation, context..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-sm text-slate-200 placeholder-slate-600 font-mono resize-y"
            />
          </div>

          {/* Breaking Change Description */}
          {state.breakingChange && (
            <div>
              <label className="text-sm font-medium text-red-400 mb-2 block">
                BREAKING CHANGE description <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={state.breakingChangeDesc}
                onChange={e => update('breakingChangeDesc', e.target.value)}
                placeholder="Describe what breaks and how to migrate..."
                className="w-full px-3 py-2 rounded-lg bg-red-950/30 border border-red-800/50 focus:border-red-500 focus:outline-none text-sm text-slate-200 placeholder-slate-600 font-mono"
              />
            </div>
          )}

          {/* Footer References */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Footer References <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <button
                onClick={addFooterRef}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
              >
                + Add reference
              </button>
            </div>
            {state.footerRefs.map((ref, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <select
                  value={ref.token}
                  onChange={e => updateFooterRef(idx, 'token', e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-xs text-slate-200 font-mono"
                >
                  <option value="">— token —</option>
                  <option value="Closes">Closes</option>
                  <option value="Fixes">Fixes</option>
                  <option value="Resolves">Resolves</option>
                  <option value="Refs">Refs</option>
                  <option value="Reviewed-by">Reviewed-by</option>
                  <option value="Co-authored-by">Co-authored-by</option>
                  <option value="Signed-off-by">Signed-off-by</option>
                  <option value="Acked-by">Acked-by</option>
                </select>
                <input
                  type="text"
                  value={ref.value}
                  onChange={e => updateFooterRef(idx, 'value', e.target.value)}
                  placeholder="e.g. #42 or name@example.com"
                  className="flex-1 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none text-xs text-slate-200 placeholder-slate-600 font-mono"
                />
                <button
                  onClick={() => removeFooterRef(idx)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={copyCommand}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
            >
              <GitCommit className="w-4 h-4" />
              Copy git commit cmd
            </button>
            <button
              onClick={copyMessage}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy message
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Right: Preview & Validation */}
        <div className="space-y-5">
          {/* Preview */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Preview</label>
            <div className="rounded-lg bg-slate-950 border border-slate-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-900/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">commit message</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  validation.valid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {validation.valid ? 'VALID' : 'INVALID'}
                </span>
              </div>
              <div className="p-4">
                <pre className="text-sm font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {commitMessage.split('\n').map((line, i) => {
                    if (i === 0) {
                      // Header line — highlight parts
                      const colonIdx = line.indexOf(': ');
                      const before = colonIdx > -1 ? line.slice(0, colonIdx) : line;
                      const after = colonIdx > -1 ? line.slice(colonIdx) : '';
                      return (
                        <span key={i} className="block">
                          <span className="text-yellow-400">{before}</span>
                          <span className="text-slate-300">{after}</span>
                          {headerLen > MAX_HEADER_LEN && (
                            <span className="text-red-400 text-[10px] ml-2">⚠ too long</span>
                          )}
                        </span>
                      );
                    }
                    if (line.startsWith('BREAKING CHANGE:')) {
                      return <span key={i} className="block text-red-400">{line}</span>;
                    }
                    if (/^[A-Z][a-z-]+:/.test(line) || /^[A-Z][a-z-]+-#?:/.test(line)) {
                      return <span key={i} className="block text-sky-400">{line}</span>;
                    }
                    return <span key={i} className={`block ${line === '' ? 'h-3' : 'text-slate-400'}`}>{line || ' '}</span>;
                  })}
                </pre>
              </div>
            </div>
          </div>

          {/* Validation */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Validation</label>
            <div className="space-y-2">
              {validation.errors.length === 0 && validation.warnings.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Commit message is valid
                </div>
              ) : (
                <>
                  {validation.errors.map((err, i) => (
                    <div key={`e-${i}`} className="flex items-start gap-2 text-red-400 text-sm p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {err}
                    </div>
                  ))}
                  {validation.warnings.map((warn, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-2 text-amber-400 text-sm p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      {warn}
                    </div>
                  ))}
                  {validation.valid && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      All critical checks passed
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick Reference */}
          <div>
            <button
              onClick={() => setExpandedHelp(!expandedHelp)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Info className="w-4 h-4" />
              Conventional Commits Reference
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedHelp ? 'rotate-180' : ''}`} />
            </button>
            {expandedHelp && (
              <div className="mt-3 space-y-3 text-sm text-slate-400 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <div>
                  <h4 className="text-slate-200 font-semibold mb-1">Format</h4>
                  <code className="text-xs bg-slate-950 px-2 py-1 rounded text-yellow-400 block">
                    &lt;type&gt;[optional scope]: &lt;description&gt;<br />
                    [optional body]<br />
                    [optional footer(s)]
                  </code>
                </div>
                <div>
                  <h4 className="text-slate-200 font-semibold mb-1">Types</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {COMMIT_TYPES.map(t => (
                      <div key={t.type} className="flex items-center gap-1.5 text-xs">
                        <span>{t.emoji}</span>
                        <code className="text-brand-400">{t.type}</code>
                        <span className="text-slate-500">— {t.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-slate-200 font-semibold mb-1">Rules</h4>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    <li>Description must be in <strong>imperative mood</strong></li>
                    <li>No period at end of description</li>
                    <li>Header ≤ {MAX_HEADER_LEN} characters</li>
                    <li>Body wraps at {MAX_BODY_LINE_LEN} chars</li>
                    <li>Breaking changes use <code className="text-red-400">!</code> before colon</li>
                    <li><code className="text-red-400">BREAKING CHANGE:</code> footer triggers MAJOR bump</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-200 font-semibold mb-1">Spec</h4>
                  <a
                    href="https://www.conventionalcommits.org/en/v1.0.0/"
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    conventionalcommits.org <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
