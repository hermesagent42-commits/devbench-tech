'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RefreshCw, GitBranch, Shuffle, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type BranchType = 'feature' | 'fix' | 'bugfix' | 'hotfix' | 'chore' | 'docs' | 'refactor' | 'test' | 'perf' | 'ci' | 'build' | 'release' | 'style';

interface BranchTypeDef {
  value: BranchType;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

const BRANCH_TYPES: BranchTypeDef[] = [
  { value: 'feature', label: 'feature', emoji: '✨', description: 'New functionality or enhancement', color: 'text-emerald-400' },
  { value: 'fix', label: 'fix', emoji: '🐛', description: 'Bug fix', color: 'text-red-400' },
  { value: 'bugfix', label: 'bugfix', emoji: '🔧', description: 'Bug fix (alternative prefix)', color: 'text-red-400' },
  { value: 'hotfix', label: 'hotfix', emoji: '🚑', description: 'Critical production fix', color: 'text-orange-400' },
  { value: 'chore', label: 'chore', emoji: '🧹', description: 'Maintenance, deps, config', color: 'text-slate-400' },
  { value: 'docs', label: 'docs', emoji: '📝', description: 'Documentation changes', color: 'text-blue-400' },
  { value: 'refactor', label: 'refactor', emoji: '♻️', description: 'Code restructure, no behavior change', color: 'text-purple-400' },
  { value: 'test', label: 'test', emoji: '✅', description: 'Adding or updating tests', color: 'text-yellow-400' },
  { value: 'perf', label: 'perf', emoji: '⚡', description: 'Performance improvements', color: 'text-amber-400' },
  { value: 'ci', label: 'ci', emoji: '👷', description: 'CI/CD pipeline changes', color: 'text-cyan-400' },
  { value: 'build', label: 'build', emoji: '📦', description: 'Build system / deps', color: 'text-cyan-400' },
  { value: 'release', label: 'release', emoji: '🔖', description: 'Release preparation', color: 'text-pink-400' },
  { value: 'style', label: 'style', emoji: '🎨', description: 'Formatting, whitespace, linting', color: 'text-teal-400' },
];

const SAMPLE_TICKETS = ['PROJ-123', 'JIRA-456', 'fix-login-timeout', 'add-dark-mode', 'update-readme'];

// ── Utilities ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 72);
}

function generateBranchName(type: BranchType, description: string, ticketId: string, includeTicket: boolean): string {
  const slug = slugify(description);
  let branch = `${type}/`;
  if (includeTicket && ticketId.trim()) {
    branch += `${ticketId.trim()}-`;
  }
  branch += slug || 'update';
  return branch;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GitBranchNameGeneratorPage() {
  const [branchType, setBranchType] = useState<BranchType>('feature');
  const [description, setDescription] = useState('add user authentication');
  const [ticketId, setTicketId] = useState('');
  const [includeTicket, setIncludeTicket] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const selectedTypeDef = useMemo(() => BRANCH_TYPES.find(t => t.value === branchType)!, [branchType]);

  const branchName = useMemo(
    () => generateBranchName(branchType, description, ticketId, includeTicket),
    [branchType, description, ticketId, includeTicket]
  );

  const copyBranchName = useCallback(() => {
    navigator.clipboard.writeText(branchName).then(
      () => toast.success('Branch name copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [branchName]);

  const copyGitCommand = useCallback(() => {
    navigator.clipboard.writeText(`git checkout -b ${branchName}`).then(
      () => toast.success('Git command copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [branchName]);

  const randomize = useCallback(() => {
    const randomType = BRANCH_TYPES[Math.floor(Math.random() * (BRANCH_TYPES.length - 1))].value;
    const randomDesc = SAMPLE_TICKETS[Math.floor(Math.random() * SAMPLE_TICKETS.length)];
    setBranchType(randomType);
    setDescription(randomDesc);
    setTicketId('');
    setIncludeTicket(false);
  }, []);

  const reset = useCallback(() => {
    setBranchType('feature');
    setDescription('');
    setTicketId('');
    setIncludeTicket(false);
  }, []);

  return (
    <ToolLayout
      title="Git Branch Name Generator"
      description="Generate clean, conventional Git branch names following best practices. Choose a branch type, describe your change, optionally add a ticket ID — and get a consistent, readable branch name."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-5">
          {/* Branch type */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Branch Type
            </label>
            <div className="relative">
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full flex items-center justify-between bg-surface-light border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <span className="flex items-center gap-2">
                  <span>{selectedTypeDef.emoji}</span>
                  <span className={`font-semibold ${selectedTypeDef.color}`}>{selectedTypeDef.label}</span>
                  <span className="text-slate-500">— {selectedTypeDef.description}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {showTypeDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-surface border border-slate-700/50 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {BRANCH_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => { setBranchType(type.value); setShowTypeDropdown(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-surface-light transition-colors ${
                        branchType === type.value ? 'bg-brand-500/10 border-l-2 border-brand-500' : ''
                      }`}
                    >
                      <span>{type.emoji}</span>
                      <span className={`font-medium ${type.color}`}>{type.label}</span>
                      <span className="text-slate-500 ml-auto text-xs">{type.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. add-user-authentication"
              className="w-full bg-surface-light border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Ticket */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTicket}
                onChange={e => setIncludeTicket(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-surface-light text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-300">Include ticket/issue ID</span>
            </label>
            {includeTicket && (
              <input
                type="text"
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
                placeholder="e.g. PROJ-123"
                className="w-full bg-surface-light border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={randomize}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 bg-surface-light border border-slate-700/50 hover:text-white transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Randomize
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 bg-surface-light border border-slate-700/50 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Right: Result */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Generated Branch Name
            </label>
            <div className="bg-surface border border-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-slate-400">Preview</span>
              </div>
              <code className="block text-lg font-mono text-white break-all mb-4">
                {branchName || <span className="text-slate-600">feature/your-description</span>}
              </code>
              <div className="flex gap-2">
                <button
                  onClick={copyBranchName}
                  disabled={!description.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Copy className="w-4 h-4" />
                  Copy Name
                </button>
                <button
                  onClick={copyGitCommand}
                  disabled={!description.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-surface-light border border-slate-700/50 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Copy className="w-4 h-4" />
                  Copy Command
                </button>
              </div>
            </div>
          </div>

          {/* Git command */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-2">Git Commands</h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="bg-surface-light rounded p-2.5 text-slate-300">
                <span className="text-slate-500">$</span> git checkout -b {branchName || 'feature/your-branch'}
              </div>
              <div className="bg-surface-light rounded p-2.5 text-slate-300">
                <span className="text-slate-500">$</span> git push -u origin {branchName || 'feature/your-branch'}
              </div>
            </div>
          </div>

          {/* Convention reference */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Convention Reference</h3>
            <div className="space-y-1.5">
              {BRANCH_TYPES.slice(0, 6).map(type => (
                <div key={type.value} className="flex items-center gap-2 text-xs">
                  <span>{type.emoji}</span>
                  <code className="text-slate-300 font-mono">{type.value}/</code>
                  <span className="text-slate-500">{type.description}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Following{' '}
              <span className="text-brand-400">Conventional Commits</span>
              {' '}branch naming keeps your repo organized and CI/CD pipelines predictable.
            </p>
          </div>
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {showTypeDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowTypeDropdown(false)}
        />
      )}
    </ToolLayout>
  );
}
