'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Trash2, Search, X, Check, FileCode, FolderOpen, Layers, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Gitignore Generator (pure client-side, zero deps) ─────────────────────

// Pre-assembled gitignore templates by tech stack.
// Each entry maps to a set of ignore patterns used by that technology.
// Patterns curated from GitHub's gitignore template collection.
const TEMPLATES: Record<string, { label: string; category: string; patterns: string[] }> = {
  node: {
    label: 'Node.js',
    category: 'JavaScript / Web',
    patterns: [
      '# Node.js',
      'node_modules/',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      '.pnpm-debug.log*',
      'package-lock.json',
      'yarn.lock',
      '.npm',
      '.eslintcache',
      '.node_repl_history',
      '*.tsbuildinfo',
      '# env files',
      '.env',
      '.env.local',
      '.env.*.local',
    ],
  },
  react: {
    label: 'React / Next.js',
    category: 'JavaScript / Web',
    patterns: [
      '# React / Next.js',
      'node_modules/',
      '/.next/',
      '/out/',
      '/build/',
      '# env files',
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      '# misc',
      '.DS_Store',
      '*.pem',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      '.pnpm-debug.log*',
      '# turbo',
      '.turbo',
      '# vercel',
      '.vercel',
    ],
  },
  vue: {
    label: 'Vue.js',
    category: 'JavaScript / Web',
    patterns: [
      '# Vue.js',
      'node_modules/',
      '/dist/',
      '.DS_Store',
      '*.local',
      '.env',
      '.env.local',
      '.env.*.local',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
    ],
  },
  angular: {
    label: 'Angular',
    category: 'JavaScript / Web',
    patterns: [
      '# Angular',
      'node_modules/',
      '/dist/',
      '/tmp/',
      '/out-tsc/',
      '.angular/',
      '# IDEs',
      '.vscode/',
      '.idea/',
      '*.launch',
      '*.sublime-workspace',
      '.DS_Store',
    ],
  },
  python: {
    label: 'Python',
    category: 'Backend',
    patterns: [
      '# Python',
      '__pycache__/',
      '*.py[cod]',
      '*$py.class',
      '*.so',
      '.Python',
      'env/',
      'venv/',
      '.venv/',
      'ENV/',
      '.env',
      'pip-log.txt',
      'pip-delete-this-directory.txt',
      '.pytest_cache/',
      '.mypy_cache/',
      '.ruff_cache/',
      '*.egg-info/',
      'dist/',
      'build/',
      '*.egg',
      '.coverage',
      'htmlcov/',
    ],
  },
  go: {
    label: 'Go',
    category: 'Backend',
    patterns: [
      '# Go',
      '*.exe',
      '*.exe~',
      '*.dll',
      '*.so',
      '*.dylib',
      '*.test',
      '*.out',
      '/vendor/',
      'go.work',
      'go.work.sum',
    ],
  },
  rust: {
    label: 'Rust',
    category: 'Backend',
    patterns: [
      '# Rust',
      '/target/',
      '**/*.rs.bk',
      '*.pdb',
      'Cargo.lock',
    ],
  },
  java: {
    label: 'Java / Maven / Gradle',
    category: 'Backend',
    patterns: [
      '# Java',
      '*.class',
      '*.jar',
      '*.war',
      '*.nar',
      '*.ear',
      '*.zip',
      '*.tar.gz',
      '*.rar',
      'target/',
      '.gradle/',
      'build/',
      '!gradle/wrapper/gradle-wrapper.jar',
      '!.mvn/wrapper/maven-wrapper.jar',
      '*.log',
    ],
  },
  'csharp-dotnet': {
    label: 'C# / .NET',
    category: 'Backend',
    patterns: [
      '# .NET',
      'bin/',
      'obj/',
      '*.user',
      '*.suo',
      '*.cache',
      '*.docstates',
      '*.userosscache',
      '*.sln.docstates',
      'packages/',
      '*.nupkg',
      'TestResults/',
      '.vs/',
    ],
  },
  rails: {
    label: 'Ruby on Rails',
    category: 'Backend',
    patterns: [
      '# Rails',
      '*.rbc',
      'capybara-*.html',
      '.rspec',
      '/log/',
      '/tmp/',
      '/db/*.sqlite3',
      '/db/*.sqlite3-journal',
      '/db/*.sqlite3-*',
      '/public/system/',
      '/coverage/',
      '/spec/tmp/',
      '*.orig',
      '/vendor/bundle/',
      '.env',
      '.env.*',
      '.byebug_history',
    ],
  },
  php: {
    label: 'PHP / Laravel',
    category: 'Backend',
    patterns: [
      '# PHP / Laravel',
      '/vendor/',
      '.env',
      '.phpunit.result.cache',
      '*.cache',
      '*.log',
      '/node_modules/',
      '/public/hot/',
      '/public/storage/',
      '/storage/*.key',
      '.php-cs-fixer.cache',
    ],
  },
  docker: {
    label: 'Docker',
    category: 'DevOps',
    patterns: [
      '# Docker',
      'docker-compose.override.yml',
      '.docker/',
      '*.dockerignore',
    ],
  },
  kubernetes: {
    label: 'Kubernetes',
    category: 'DevOps',
    patterns: [
      '# Kubernetes',
      '*.secret.yaml',
      '*.secret.yml',
      '*.token',
      '*.key',
      'kubeconfig',
      '*.kubeconfig',
      '.helm/',
      'charts/',
    ],
  },
  terraform: {
    label: 'Terraform',
    category: 'DevOps',
    patterns: [
      '# Terraform',
      '.terraform/',
      '*.tfstate',
      '*.tfstate.*',
      '*.tfvars',
      '*.tfvars.json',
      'override.tf',
      'override.tf.json',
      '.terraform.lock.hcl',
      'crash.log',
      'crash.*.log',
    ],
  },
  flutter: {
    label: 'Flutter / Dart',
    category: 'Mobile',
    patterns: [
      '# Flutter / Dart',
      '.dart_tool/',
      '.flutter-plugins',
      '.flutter-plugins-dependencies',
      '.packages',
      '.pub-cache/',
      '.pub/',
      '/build/',
      '*.iml',
      '*.ipr',
      '*.iws',
      '.idea/',
      'ios/Pods/',
      'android/.gradle/',
      'android/app/build/',
      'android/local.properties',
    ],
  },
  reactnative: {
    label: 'React Native',
    category: 'Mobile',
    patterns: [
      '# React Native',
      'node_modules/',
      '.expo/',
      'dist/',
      '.env',
      '.env.local',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'ios/Pods/',
      'ios/build/',
      'android/app/build/',
      'android/.gradle/',
      'android/local.properties',
      '*.jks',
      '*.p8',
      '*.p12',
      '*.key',
      '*.mobileprovision',
      '*.orig.*',
    ],
  },
  swift: {
    label: 'Swift / iOS',
    category: 'Mobile',
    patterns: [
      '# Swift / Xcode',
      '.build/',
      'DerivedData/',
      '*.xcworkspace',
      '!default.xcworkspace',
      '*.xcuserdata',
      '*.xcbkptlist',
      '*.xcuserstate',
      'Pods/',
      '*.ipa',
      '*.dSYM.zip',
      '*.dSYM',
      'Carthage/',
      'fastlane/report.xml',
      'fastlane/Preview.html',
      'fastlane/screenshots/',
      'fastlane/test_output/',
    ],
  },
  kotlin: {
    label: 'Kotlin / Android',
    category: 'Mobile',
    patterns: [
      '# Kotlin / Android',
      '.gradle/',
      '/build/',
      '/captures/',
      '.externalNativeBuild/',
      '.cxx/',
      'local.properties',
      '*.iml',
      '.idea/',
      '*.hprof',
      '*.apk',
      '*.aab',
      '*.dex',
      '*.class',
      'bin/',
      'gen/',
    ],
  },
  vscode: {
    label: 'VS Code',
    category: 'Editors / IDEs',
    patterns: [
      '# VS Code',
      '.vscode/',
      '!.vscode/settings.json',
      '!.vscode/tasks.json',
      '!.vscode/launch.json',
      '!.vscode/extensions.json',
      '*.code-workspace',
      '.history/',
    ],
  },
  jetbrains: {
    label: 'JetBrains IDEs',
    category: 'Editors / IDEs',
    patterns: [
      '# JetBrains',
      '.idea/',
      '*.iml',
      '*.iws',
      '*.ipr',
      'out/',
      '.idea_modules/',
      'atlassian-ide-plugin.xml',
    ],
  },
  vim: {
    label: 'Vim',
    category: 'Editors / IDEs',
    patterns: [
      '# Vim',
      '*.swp',
      '*.swo',
      '*~',
      '.netrwhist',
      'Session.vim',
      'Sessionx.vim',
      '.vim/',
    ],
  },
  macos: {
    label: 'macOS',
    category: 'OS',
    patterns: [
      '# macOS',
      '.DS_Store',
      '.AppleDouble',
      '.LSOverride',
      'Icon',
      '._*',
      '.DocumentRevisions-V100',
      '.fseventsd',
      '.Spotlight-V100',
      '.TemporaryItems',
      '.Trashes',
      '.VolumeIcon.icns',
      '.com.apple.timemachine.donotpresent',
    ],
  },
  windows: {
    label: 'Windows',
    category: 'OS',
    patterns: [
      '# Windows',
      'Thumbs.db',
      'Thumbs.db:encryptable',
      'ehthumbs.db',
      'ehthumbs_vista.db',
      '*.stackdump',
      '[Dd]esktop.ini',
      '$RECYCLE.BIN/',
      '*.cab',
      '*.msi',
      '*.msix',
      '*.msm',
      '*.msp',
      '*.lnk',
    ],
  },
  linux: {
    label: 'Linux',
    category: 'OS',
    patterns: [
      '# Linux',
      '*~',
      '.fuse_hidden*',
      '.directory',
      '.Trash-*',
      '.nfs*',
    ],
  },
  svelte: {
    label: 'Svelte / SvelteKit',
    category: 'JavaScript / Web',
    patterns: [
      '# Svelte / SvelteKit',
      'node_modules/',
      '/.svelte-kit/',
      '/build/',
      '.DS_Store',
      '.env',
      '.env.*',
      '!.env.example',
      'vite.config.js.timestamp-*',
      'vite.config.ts.timestamp-*',
    ],
  },
  astro: {
    label: 'Astro',
    category: 'JavaScript / Web',
    patterns: [
      '# Astro',
      'node_modules/',
      '/dist/',
      '.astro/',
      '.DS_Store',
      '.env',
      '.env.*',
      '!.env.example',
    ],
  },
  hugo: {
    label: 'Hugo',
    category: 'Static Site',
    patterns: [
      '# Hugo',
      '/public/',
      '/resources/',
      '.hugo_build.lock',
      'node_modules/',
      '.DS_Store',
    ],
  },
  gatsby: {
    label: 'Gatsby',
    category: 'JavaScript / Web',
    patterns: [
      '# Gatsby',
      'node_modules/',
      '/public/',
      '/.cache/',
      '.DS_Store',
      '.env',
      '.env.*',
      '!.env.example',
    ],
  },
  database: {
    label: 'Databases',
    category: 'Data',
    patterns: [
      '# Databases',
      '*.db',
      '*.sqlite',
      '*.sqlite3',
      '*.sqlite3-journal',
      '*.sqlite3-*',
      '# MySQL',
      '*.sql',
      '!schema.sql',
      '!seed.sql',
      '# PostgreSQL',
      '*.dump',
      '*.pgdump',
      '*.backup',
      '# Redis',
      'dump.rdb',
      'appendonly.aof',
    ],
  },
  jupyter: {
    label: 'Jupyter Notebooks',
    category: 'Data',
    patterns: [
      '# Jupyter',
      '.ipynb_checkpoints/',
      '*.ipynb',
      '!.ipynb_checkpoints/',
      'profile_default/',
      'ipython_config.py',
    ],
  },
  unity: {
    label: 'Unity',
    category: 'Game Dev',
    patterns: [
      '# Unity',
      '[Ll]ibrary/',
      '[Tt]emp/',
      '[Oo]bj/',
      '[Bb]uild/',
      '[Bb]uilds/',
      '[Ll]ogs/',
      '[Uu]ser[Ss]ettings/',
      '*.pidb.meta',
      '*.pdb.meta',
      '*.mdb.meta',
      '*.apk',
      '*.aab',
      '*.unitypackage',
      '*.app',
    ],
  },
  unreal: {
    label: 'Unreal Engine',
    category: 'Game Dev',
    patterns: [
      '# Unreal Engine',
      'Binaries/',
      'DerivedDataCache/',
      'Intermediate/',
      'Saved/',
      '.vs/',
      '*.VC.db',
      '*.opensdf',
      '*.sdf',
      '*.suo',
      '*.xcodeproj',
      '*.xcworkspace',
    ],
  },
};

interface TemplateEntry {
  key: string;
  label: string;
  category: string;
  patterns: string[];
}

const templateEntries: TemplateEntry[] = Object.entries(TEMPLATES).map(([key, val]) => ({
  key,
  ...val,
}));

const categories = Array.from(new Set(templateEntries.map((t) => t.category)));

export default function GitignoreGeneratorPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return templateEntries.filter((t) => {
      if (activeCategory && t.category !== activeCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelected(new Set());
    toast.success('All templates cleared');
  }, []);

  const selectPreset = useCallback((preset: 'frontend' | 'fullstack' | 'python-ml') => {
    const map: Record<string, string[]> = {
      frontend: ['node', 'react', 'vscode', 'macos'],
      fullstack: ['node', 'react', 'python', 'docker', 'vscode', 'macos'],
      'python-ml': ['python', 'jupyter', 'vscode', 'macos', 'database'],
    };
    setSelected(new Set(map[preset]));
    toast.success('Preset loaded');
  }, []);

  const generatedGitignore = useMemo(() => {
    if (selected.size === 0) return '';

    const allPatterns: string[] = [];
    const usedCategories: Set<string> = new Set();

    for (const key of Array.from(selected)) {
      const tmpl = TEMPLATES[key];
      if (!tmpl) continue;

      // Add category header once per category
      if (!usedCategories.has(tmpl.category)) {
        usedCategories.add(tmpl.category);
        allPatterns.push(`# ── ${tmpl.category} ──`);
      }

      allPatterns.push(...tmpl.patterns);
      allPatterns.push('');
    }

    // Remove trailing blank lines and deduplicate adjacent blank lines
    const deduped = allPatterns.filter(
      (line, i, arr) => !(line === '' && arr[i - 1] === '')
    );

    // If last line is empty, remove it
    if (deduped[deduped.length - 1] === '') deduped.pop();

    return deduped.join('\n');
  }, [selected]);

  const copyOutput = useCallback(() => {
    if (!generatedGitignore) return;
    navigator.clipboard.writeText(generatedGitignore).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Copy failed')
    );
  }, [generatedGitignore]);

  const downloadOutput = useCallback(() => {
    if (!generatedGitignore) return;
    const blob = new Blob([generatedGitignore], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.gitignore';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded .gitignore');
  }, [generatedGitignore]);

  const selectedCount = selected.size;
  const totalLines = useMemo(
    () => (generatedGitignore ? generatedGitignore.split('\n').length : 0),
    [generatedGitignore]
  );
  const totalSize = useMemo(
    () => (generatedGitignore ? new Blob([generatedGitignore]).size : 0),
    [generatedGitignore]
  );

  return (
    <ToolLayout
      title="Gitignore Generator"
      description="Build .gitignore files for your tech stack — select languages, frameworks, editors, and OS. Zero dependencies, 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">
            {selectedCount} template{selectedCount !== 1 ? 's' : ''} selected
          </span>
          {selectedCount > 0 && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">
                {totalLines} lines · {(totalSize / 1024).toFixed(1)} KB
              </span>
            </>
          )}
          <span className="flex-1" />
          <button
            onClick={() => selectPreset('frontend')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors"
          >
            Frontend preset
          </button>
          <button
            onClick={() => selectPreset('fullstack')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors"
          >
            Fullstack preset
          </button>
          <button
            onClick={() => selectPreset('python-ml')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors"
          >
            Python/ML preset
          </button>
          {selectedCount > 0 && (
            <button
              onClick={clearAll}
              className="px-2.5 py-1 text-xs rounded-md bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/40 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* ── Left: Template Browser ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-slate-500 hover:text-slate-300" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                activeCategory === null
                  ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  activeCategory === cat
                    ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredTemplates.map((tmpl) => {
              const isSelected = selected.has(tmpl.key);
              return (
                <button
                  key={tmpl.key}
                  onClick={() => toggle(tmpl.key)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-brand-600/15 border-brand-500/40 shadow-sm shadow-brand-500/10'
                      : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600/70 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          isSelected ? 'text-brand-300' : 'text-slate-200'
                        }`}
                      >
                        {tmpl.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{tmpl.category}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
            {filteredTemplates.length === 0 && (
              <div className="col-span-2 text-center text-slate-500 py-8 text-sm">
                No templates match your search.
              </div>
            )}
          </div>

          {/* Quick info */}
          <div className="text-xs text-slate-500 bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
            <BookOpen className="w-3.5 h-3.5 inline-block mr-1.5 text-slate-400" />
            Select the technologies in your stack. Patterns are from GitHub&apos;s official gitignore templates.
            Combine multiple entries — duplicates are automatically handled.
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-300">.gitignore preview</h3>
            <span className="flex-1" />
            {generatedGitignore && (
              <>
                <button
                  onClick={copyOutput}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button
                  onClick={downloadOutput}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </>
            )}
          </div>

          {generatedGitignore ? (
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/30 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-slate-500 ml-2">.gitignore</span>
              </div>
              <pre className="p-4 text-sm text-slate-300 font-mono leading-relaxed overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar whitespace-pre">
                <code>{generatedGitignore}</code>
              </pre>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-700/30 rounded-lg flex flex-col items-center justify-center py-16 text-center px-8">
              <Layers className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-slate-500 text-sm mb-2">No templates selected</p>
              <p className="text-slate-600 text-xs max-w-xs">
                Select technologies from the left panel to build your .gitignore.
                Pick your language, framework, editor, and OS.
              </p>
            </div>
          )}

          {/* Selected summary */}
          {selectedCount > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Selected:</span>
              {Array.from(selected).map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-brand-600/15 text-brand-300 border border-brand-500/20"
                >
                  {TEMPLATES[key]?.label ?? key}
                  <button onClick={() => toggle(key)} className="hover:text-brand-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
