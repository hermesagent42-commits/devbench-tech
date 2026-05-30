'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Search, GitBranch, GitCommit, GitMerge, GitPullRequest, FolderOpen, History, Bookmark, Filter, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface GitCommand {
  command: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  example?: string;
  aliases?: string[];
}

const GIT_COMMANDS: GitCommand[] = [
  // ── Setup & Config ──
  { command: 'git init', description: 'Initialize a new Git repository in the current directory', category: 'Setup & Config', level: 'beginner', example: 'git init my-project' },
  { command: 'git clone', description: 'Clone a repository from a remote URL to your local machine', category: 'Setup & Config', level: 'beginner', example: 'git clone https://github.com/user/repo.git', aliases: [] },
  { command: 'git clone --depth', description: 'Shallow clone — only the latest commit, much faster for large repos', category: 'Setup & Config', level: 'intermediate', example: 'git clone --depth 1 https://github.com/user/repo.git' },
  { command: 'git config', description: 'Set or get Git configuration values (user.name, user.email, etc.)', category: 'Setup & Config', level: 'beginner', example: 'git config --global user.name "Your Name"' },
  { command: 'git remote', description: 'Manage remote repository connections (add, remove, rename, show URL)', category: 'Setup & Config', level: 'beginner', example: 'git remote add origin https://github.com/user/repo.git' },

  // ── Staging & Commits ──
  { command: 'git status', description: 'Show the working tree status — staged, unstaged, and untracked files', category: 'Staging & Commits', level: 'beginner', example: 'git status -s' },
  { command: 'git add', description: 'Stage file changes for the next commit', category: 'Staging & Commits', level: 'beginner', example: 'git add . # stage all changes', aliases: [] },
  { command: 'git add -p', description: 'Interactively stage hunks of changes (patch mode) — pick which parts to commit', category: 'Staging & Commits', level: 'intermediate', example: 'git add -p' },
  { command: 'git commit', description: 'Record staged changes to the repository with a message', category: 'Staging & Commits', level: 'beginner', example: 'git commit -m "feat: add user authentication"' },
  { command: 'git commit --amend', description: 'Add staged changes to the most recent commit, or edit its message', category: 'Staging & Commits', level: 'intermediate', example: 'git commit --amend -m "New message"' },
  { command: 'git diff', description: 'Show changes between commits, the working tree, and the staging area', category: 'Staging & Commits', level: 'beginner', example: 'git diff HEAD~1' },
  { command: 'git diff --staged', description: 'Show changes that are staged for the next commit (vs last commit)', category: 'Staging & Commits', level: 'beginner', example: 'git diff --staged' },
  { command: 'git reset', description: 'Unstage files (soft) or reset the working tree (hard) to a commit', category: 'Staging & Commits', level: 'intermediate', example: 'git reset HEAD file.txt # unstage' },
  { command: 'git rm', description: 'Remove files from the working tree and stage the removal', category: 'Staging & Commits', level: 'beginner', example: 'git rm --cached file.txt' },
  { command: 'git stash', description: 'Temporarily save uncommitted changes and revert to a clean working tree', category: 'Staging & Commits', level: 'intermediate', example: 'git stash pop' },
  { command: 'git restore', description: 'Restore working tree files — discard local changes or unstage files', category: 'Staging & Commits', level: 'beginner', example: 'git restore file.txt # discard changes' },

  // ── Branching & Merging ──
  { command: 'git branch', description: 'List, create, or delete branches', category: 'Branching & Merging', level: 'beginner', example: 'git branch feature/new-thing' },
  { command: 'git branch -d', description: 'Delete a merged branch (safe). Use -D to force-delete unmerged', category: 'Branching & Merging', level: 'beginner', example: 'git branch -d feature/old' },
  { command: 'git checkout', description: 'Switch branches or restore working tree files', category: 'Branching & Merging', level: 'beginner', example: 'git checkout -b feature/new-branch' },
  { command: 'git switch', description: 'Switch to a branch (modern replacement for git checkout for branch switching)', category: 'Branching & Merging', level: 'beginner', example: 'git switch main' },
  { command: 'git merge', description: 'Merge another branch into the current branch', category: 'Branching & Merging', level: 'beginner', example: 'git merge feature/new-thing' },
  { command: 'git merge --squash', description: 'Merge without committing — squash all changes into the working tree for a single commit', category: 'Branching & Merging', level: 'intermediate', example: 'git merge --squash feature/big' },
  { command: 'git rebase', description: 'Reapply commits on top of another branch — linear history without merge commits', category: 'Branching & Merging', level: 'advanced', example: 'git rebase main' },
  { command: 'git rebase -i', description: 'Interactive rebase — squash, reorder, edit, or drop commits', category: 'Branching & Merging', level: 'advanced', example: 'git rebase -i HEAD~3' },
  { command: 'git cherry-pick', description: 'Apply a specific commit from another branch to the current branch', category: 'Branching & Merging', level: 'intermediate', example: 'git cherry-pick abc1234' },

  // ── Remote & Collaboration ──
  { command: 'git push', description: 'Upload local commits to a remote repository', category: 'Remote & Collaboration', level: 'beginner', example: 'git push origin main' },
  { command: 'git push --force', description: 'Force-push, overwriting remote history. Use --force-with-lease for safety', category: 'Remote & Collaboration', level: 'advanced', example: 'git push --force-with-lease' },
  { command: 'git fetch', description: 'Download remote commits and branches without merging', category: 'Remote & Collaboration', level: 'beginner', example: 'git fetch origin' },
  { command: 'git pull', description: 'Fetch and merge remote changes into the current branch (fetch + merge)', category: 'Remote & Collaboration', level: 'beginner', example: 'git pull origin main' },
  { command: 'git pull --rebase', description: 'Fetch and rebase local commits on top of remote — cleaner linear history', category: 'Remote & Collaboration', level: 'intermediate', example: 'git pull --rebase origin main' },
  { command: 'git remote prune', description: 'Remove remote-tracking branches that no longer exist on the remote', category: 'Remote & Collaboration', level: 'intermediate', example: 'git remote prune origin' },

  // ── History & Inspection ──
  { command: 'git log', description: 'Show commit history with messages, authors, and dates', category: 'History & Inspection', level: 'beginner', example: 'git log --oneline --graph --all' },
  { command: 'git log --oneline', description: 'Compact one-line-per-commit view of history', category: 'History & Inspection', level: 'beginner', example: 'git log --oneline -10' },
  { command: 'git log -p', description: 'Show commit history with the full diff for each commit', category: 'History & Inspection', level: 'intermediate', example: 'git log -p --follow file.txt' },
  { command: 'git show', description: 'Show details of a specific commit — message, diff, and metadata', category: 'History & Inspection', level: 'beginner', example: 'git show abc1234' },
  { command: 'git blame', description: 'Show who last modified each line of a file, and when', category: 'History & Inspection', level: 'intermediate', example: 'git blame file.txt -L 10,20' },
  { command: 'git bisect', description: 'Binary search through commit history to find the commit that introduced a bug', category: 'History & Inspection', level: 'advanced', example: 'git bisect start; git bisect bad; git bisect good v1.0' },
  { command: 'git reflog', description: 'Show a log of all reference updates (HEAD movements). Recovery tool for lost commits', category: 'History & Inspection', level: 'advanced', example: 'git reflog' },
  { command: 'git tag', description: 'Create, list, or delete tags (lightweight or annotated) to mark releases', category: 'History & Inspection', level: 'beginner', example: 'git tag -a v1.0.0 -m "Release 1.0.0"' },

  // ── Undoing & Fixing ──
  { command: 'git revert', description: 'Create a new commit that undoes a previous commit — safe, preserves history', category: 'Undoing & Fixing', level: 'intermediate', example: 'git revert abc1234' },
  { command: 'git reset --soft', description: 'Move HEAD to a previous commit but keep all changes staged', category: 'Undoing & Fixing', level: 'advanced', example: 'git reset --soft HEAD~1' },
  { command: 'git reset --hard', description: 'Move HEAD and discard all changes — completely reset to a commit', category: 'Undoing & Fixing', level: 'advanced', example: 'git reset --hard HEAD~1 # DANGER: loses work' },
  { command: 'git clean', description: 'Remove untracked files from the working tree', category: 'Undoing & Fixing', level: 'intermediate', example: 'git clean -fd # remove untracked files and dirs' },
  { command: 'git checkout --', description: 'Restore a file to its last committed state (discard local changes)', category: 'Undoing & Fixing', level: 'beginner', example: 'git checkout -- file.txt' },
];

const CATEGORIES = Array.from(new Set(GIT_COMMANDS.map(c => c.category)));
const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Setup & Config': <FolderOpen className="w-4 h-4" />,
  'Staging & Commits': <GitCommit className="w-4 h-4" />,
  'Branching & Merging': <GitBranch className="w-4 h-4" />,
  'Remote & Collaboration': <GitPullRequest className="w-4 h-4" />,
  'History & Inspection': <History className="w-4 h-4" />,
  'Undoing & Fixing': <Bookmark className="w-4 h-4" />,
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export default function GitCommandExplorerPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return GIT_COMMANDS.filter((cmd) => {
      const matchesSearch = !search ||
        cmd.command.toLowerCase().includes(search.toLowerCase()) ||
        cmd.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory || cmd.category === activeCategory;
      const matchesLevel = !activeLevel || cmd.level === activeLevel;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [search, activeCategory, activeLevel]);

  const copyCommand = useCallback((command: string) => {
    navigator.clipboard.writeText(command).then(
      () => {
        toast.success('Command copied!');
        setCopied(command);
        setTimeout(() => setCopied(null), 1500);
      },
      () => toast.error('Copy failed')
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setActiveCategory(null);
    setActiveLevel(null);
  }, []);

  const hasFilters = search || activeCategory || activeLevel;

  return (
    <ToolLayout
      title="Git Command Explorer"
      description="Browse, search, and copy every essential Git command — from beginner basics to advanced recovery. 45+ commands with examples and explanations."
    >
      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search commands... (e.g., 'rebase', 'undo', 'commit')"
          className="w-full bg-slate-800/70 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 border border-slate-700 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 placeholder-slate-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Category pills */}
        <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Category:
        </span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              activeCategory === cat
                ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                : 'border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600'
            }`}
          >
            {CATEGORY_ICONS[cat]}
            {cat}
          </button>
        ))}

        <span className="text-slate-600 mx-2">|</span>

        {/* Level pills */}
        <span className="text-xs text-slate-500 mr-1">Level:</span>
        {LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => setActiveLevel(activeLevel === level ? null : level)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all capitalize ${
              activeLevel === level
                ? LEVEL_COLORS[level].replace('bg-', 'bg-').split(' ').filter(c => c.includes('bg')).join(' ') + ' ' +
                  LEVEL_COLORS[level].split(' ').filter(c => !c.includes('bg')).join(' ')
                : 'border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600'
            }`}
          >
            {level}
          </button>
        ))}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all ml-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="mb-4 text-xs text-slate-500">
        {filtered.length} command{filtered.length !== 1 ? 's' : ''} found
        {hasFilters && (
          <span className="text-slate-600"> (filtered from {GIT_COMMANDS.length})</span>
        )}
      </div>

      {/* Command List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <GitBranch className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No commands match your filters.</p>
            <button onClick={clearFilters} className="text-xs text-brand-400 hover:underline mt-2">Clear filters</button>
          </div>
        ) : (
          filtered.map((cmd) => (
            <div
              key={cmd.command}
              className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30 hover:border-slate-600/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="text-sm font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                      {cmd.command}
                    </code>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${LEVEL_COLORS[cmd.level]}`}>
                      {cmd.level}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-700/50">
                      {cmd.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{cmd.description}</p>
                  {cmd.example && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-600">Example:</span>
                      <code className="text-xs font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded">
                        {cmd.example}
                      </code>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => copyCommand(cmd.command)}
                  className={`shrink-0 p-2 rounded-lg transition-all ${
                    copied === cmd.command
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/20'
                  }`}
                  title="Copy command"
                >
                  {copied === cmd.command ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Reference Footer */}
      <div className="mt-10 p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-brand-400" />
          Quick Workflows
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-2">🆕 Start a new feature</div>
            <code className="block text-slate-400 font-mono">git checkout -b feature/new-thing</code>
            <code className="block text-slate-400 font-mono mt-1"># ... make changes ...</code>
            <code className="block text-slate-400 font-mono">git add . && git commit -m &quot;feat: new thing&quot;</code>
            <code className="block text-slate-400 font-mono mt-1">git push -u origin feature/new-thing</code>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-2">🔀 Pull latest & rebase</div>
            <code className="block text-slate-400 font-mono">git checkout main</code>
            <code className="block text-slate-400 font-mono">git pull --rebase origin main</code>
            <code className="block text-slate-400 font-mono">git checkout feature/branch</code>
            <code className="block text-slate-400 font-mono">git rebase main</code>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-2">⏪ Undo last commit (keep changes)</div>
            <code className="block text-slate-400 font-mono">git reset --soft HEAD~1</code>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <div className="font-semibold text-slate-300 mb-2">🧹 Clean merged branches</div>
            <code className="block text-slate-400 font-mono">git branch --merged | grep -v &quot;\\*\\|main&quot; | xargs -n 1 git branch -d</code>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
