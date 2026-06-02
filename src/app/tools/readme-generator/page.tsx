'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, Eye, Edit3, Plus, RefreshCw, FileText, LayoutTemplate, Shield, Github, BookOpen, Terminal, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

type SectionKey = 'title' | 'description' | 'badges' | 'features' | 'installation' | 'usage' | 'api' | 'configuration' | 'contributing' | 'license' | 'acknowledgments';

interface Section {
  key: SectionKey;
  label: string;
  content: string;
  enabled: boolean;
}

interface Badge {
  label: string;
  url: string;
  shieldUrl: string;
}

const BADGE_PRESETS: Badge[] = [
  { label: 'npm version', url: 'https://www.npmjs.com/package/my-project', shieldUrl: 'https://img.shields.io/npm/v/my-project' },
  { label: 'npm downloads', url: 'https://www.npmjs.com/package/my-project', shieldUrl: 'https://img.shields.io/npm/dm/my-project' },
  { label: 'GitHub stars', url: 'https://github.com/user/repo', shieldUrl: 'https://img.shields.io/github/stars/user/repo' },
  { label: 'GitHub issues', url: 'https://github.com/user/repo/issues', shieldUrl: 'https://img.shields.io/github/issues/user/repo' },
  { label: 'GitHub license', url: 'https://github.com/user/repo/blob/main/LICENSE', shieldUrl: 'https://img.shields.io/github/license/user/repo' },
  { label: 'GitHub last commit', url: 'https://github.com/user/repo', shieldUrl: 'https://img.shields.io/github/last-commit/user/repo' },
  { label: 'GitHub contributors', url: 'https://github.com/user/repo/graphs/contributors', shieldUrl: 'https://img.shields.io/github/contributors/user/repo' },
  { label: 'GitHub PRs', url: 'https://github.com/user/repo/pulls', shieldUrl: 'https://img.shields.io/github/issues-pr/user/repo' },
  { label: 'CI status', url: 'https://github.com/user/repo/actions', shieldUrl: 'https://img.shields.io/github/actions/workflow/status/user/repo/ci.yml' },
  { label: 'bundle size', url: 'https://bundlephobia.com/package/my-project', shieldUrl: 'https://img.shields.io/bundlephobia/minzip/my-project' },
  { label: 'TypeScript', url: '#', shieldUrl: 'https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white' },
  { label: 'JavaScript', url: '#', shieldUrl: 'https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black' },
  { label: 'React', url: '#', shieldUrl: 'https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black' },
  { label: 'Node.js', url: '#', shieldUrl: 'https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white' },
  { label: 'Docker', url: '#', shieldUrl: 'https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white' },
  { label: 'license MIT', url: '#', shieldUrl: 'https://img.shields.io/badge/License-MIT-yellow.svg' },
];

function createInitialSections(): Record<SectionKey, Section> {
  return {
    title: { key: 'title', label: 'Title & Logo', content: '# My Project\n\n> A short tagline describing what this project does.', enabled: true },
    description: { key: 'description', label: 'Description', content: 'A detailed description of the project. Explain the problem it solves, why it exists, and what makes it unique.', enabled: true },
    badges: { key: 'badges', label: 'Badges', content: '', enabled: false },
    features: { key: 'features', label: 'Features', content: '- Feature one\n- Feature two\n- Feature three\n- Feature four', enabled: true },
    installation: { key: 'installation', label: 'Installation', content: '```bash\nnpm install my-project\n# or\nyarn add my-project\n# or\npnpm add my-project\n```', enabled: true },
    usage: { key: 'usage', label: 'Usage', content: "```javascript\nimport { myFunction } from 'my-project';\n\nconst result = myFunction({\n  param1: 'value',\n  param2: 42,\n});\n\nconsole.log(result);\n```", enabled: true },
    api: { key: 'api', label: 'API Reference', content: '### `myFunction(options)`\n\n| Parameter | Type | Default | Description |\n|-----------|------|---------|-------------|\n| `param1` | `string` | — | Description |\n| `param2` | `number` | `0` | Description |\n\n**Returns:** `Result`', enabled: false },
    configuration: { key: 'configuration', label: 'Configuration', content: '```json\n{\n  "option1": "default",\n  "option2": true\n}\n```\n\n| Option | Type | Default | Description |\n|--------|------|---------|-------------|\n| `option1` | `string` | `"default"` | Description |\n| `option2` | `boolean` | `true` | Description |', enabled: false },
    contributing: { key: 'contributing', label: 'Contributing', content: "Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).\n\n1. Fork the repo\n2. Create a feature branch (`git checkout -b feature/amazing`)\n3. Commit changes (`git commit -m 'Add amazing feature'`)\n4. Push (`git push origin feature/amazing`)\n5. Open a Pull Request", enabled: false },
    license: { key: 'license', label: 'License', content: 'MIT (c) [Your Name]', enabled: false },
    acknowledgments: { key: 'acknowledgments', label: 'Acknowledgments', content: '- [Project A](https://github.com/a) — inspiration\n- [Library B](https://github.com/b) — core dependency', enabled: false },
  };
}

type TemplateName = 'default' | 'minimal' | 'extensive';

function applyTemplate(template: TemplateName): Record<SectionKey, Section> {
  const base = createInitialSections();
  if (template === 'minimal') {
    base.features.enabled = false;
    base.api.enabled = false;
    base.configuration.enabled = false;
    base.contributing.enabled = false;
    base.license.enabled = false;
    base.acknowledgments.enabled = false;
    base.badges.enabled = false;
  } else if (template === 'extensive') {
    base.badges.enabled = true;
    base.api.enabled = true;
    base.configuration.enabled = true;
    base.contributing.enabled = true;
    base.license.enabled = true;
    base.acknowledgments.enabled = true;
  }
  return base;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m: string, _lang: string, code: string) => {
    return '<pre class="bg-slate-900 rounded-lg p-4 overflow-x-auto my-3 text-sm font-mono text-slate-200 border border-slate-700"><code>' + escapeHtml(code) + '</code></pre>';
  });
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-brand-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-100 mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-100 mt-6 mb-3 border-b border-slate-700 pb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-slate-100 mt-4 mb-4 border-b border-slate-700 pb-2">$1</h1>');
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-brand-500 pl-4 py-1 my-3 text-slate-300 italic">$1</blockquote>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="text-slate-300">$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand-400 hover:text-brand-300 underline" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline-block h-5" />');
  html = html.replace(/^- (.+)$/gm, '<li class="text-slate-300 ml-4 list-disc my-0.5">$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="text-slate-300 ml-4 list-decimal my-0.5">$2</li>');
  html = html.replace(/^\|(.+)\|$/gm, (line: string) => {
    const cells = line.split('|').filter((c: string) => c.trim());
    if (cells.every((c: string) => /^[-: ]+$/.test(c.trim()) || c.trim() === '')) return '';
    const cellHtml = cells.map((c: string) => {
      const t = c.trim();
      if (/^\*\*(.+)\*\*$/.test(t)) {
        return '<th class="border border-slate-600 px-3 py-1.5 text-left text-sm font-semibold text-slate-200 bg-slate-800">' + t.replace(/^\*\*|\*\*$/g, '') + '</th>';
      }
      return '<td class="border border-slate-600 px-3 py-1.5 text-sm text-slate-300">' + t + '</td>';
    }).join('');
    return '</tr><tr>' + cellHtml;
  });
  html = html.replace(/^<\/tr>/, '');
  html = html.replace(/<\/li>\s*<li/g, '</li><li');
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul class="my-2">$1</ul>');
  html = html.replace(/^---$/gm, '<hr class="border-slate-700 my-4" />');
  const lines = html.split('\n');
  html = lines.map(line => {
    if (/^<[a-z]/.test(line)) return line;
    if (line.trim() === '') return line;
    return '<p class="text-slate-300 leading-relaxed my-1">' + line + '</p>';
  }).join('\n');
  return html;
}

export default function ReadmeGenerator() {
  const [sections, setSections] = useState<Record<SectionKey, Section>>(createInitialSections());
  const [activeBadges, setActiveBadges] = useState<Badge[]>([]);
  const [customBadgeLabel, setCustomBadgeLabel] = useState('');
  const [customBadgeUrl, setCustomBadgeUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'badges' | 'preview'>('edit');
  const [templateName, setTemplateName] = useState<TemplateName>('default');

  const updateSection = useCallback((key: SectionKey, content: string) => {
    setSections(prev => ({ ...prev, [key]: { ...prev[key], content } }));
  }, []);

  const toggleSection = useCallback((key: SectionKey) => {
    setSections(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  }, []);

  const applyTemplateAction = useCallback((name: TemplateName) => {
    setTemplateName(name);
    setSections(applyTemplate(name));
  }, []);

  const handleReset = useCallback(() => {
    setSections(createInitialSections());
    setActiveBadges([]);
    setCustomBadgeLabel('');
    setCustomBadgeUrl('');
    setTemplateName('default');
    toast.success('Reset to defaults');
  }, []);

  const toggleBadge = useCallback((badge: Badge) => {
    setActiveBadges(prev => {
      if (prev.some(b => b.label === badge.label)) return prev.filter(b => b.label !== badge.label);
      return [...prev, badge];
    });
  }, []);

  const addCustomBadge = useCallback(() => {
    if (!customBadgeLabel.trim() || !customBadgeUrl.trim()) return;
    setActiveBadges(prev => [...prev, { label: customBadgeLabel.trim(), url: '#', shieldUrl: customBadgeUrl.trim() }]);
    setCustomBadgeLabel('');
    setCustomBadgeUrl('');
    toast.success('Badge added');
  }, [customBadgeLabel, customBadgeUrl]);

  const removeBadge = useCallback((label: string) => {
    setActiveBadges(prev => prev.filter(b => b.label !== label));
  }, []);

  const markdown = useMemo(() => {
    const parts: string[] = [];
    const t = sections.title;
    if (t.enabled && t.content.trim()) parts.push(t.content.trim());
    if (sections.badges.enabled && activeBadges.length > 0) {
      parts.push('');
      parts.push(activeBadges.map(b => `[![${b.label}](${b.shieldUrl})](${b.url})`).join('\n'));
    }
    const ordered: SectionKey[] = ['description', 'features', 'installation', 'usage', 'api', 'configuration', 'contributing', 'license', 'acknowledgments'];
    for (const key of ordered) {
      const s = sections[key];
      if (s.enabled && s.content.trim()) {
        if (parts.length > 0) parts.push('');
        parts.push(s.content.trim());
      }
    }
    return parts.join('\n');
  }, [sections, activeBadges]);

  const previewHtml = useMemo(() => renderMarkdownToHtml(markdown), [markdown]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success('README copied!');
    } catch { toast.error('Failed to copy'); }
  }, [markdown]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'README.md'; a.click();
    URL.revokeObjectURL(url);
    toast.success('README.md downloaded!');
  }, [markdown]);

  const orderedKeys: SectionKey[] = ['title', 'badges', 'description', 'features', 'installation', 'usage', 'api', 'configuration', 'contributing', 'license', 'acknowledgments'];

  return (
    <ToolLayout
      title="README Generator"
      description="Build a polished README.md with live preview. Choose a template, toggle sections, add shields.io badges, then copy or download."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 mr-1">Template:</span>
          {(['default', 'minimal', 'extensive'] as TemplateName[]).map(name => (
            <button
              key={name}
              onClick={() => applyTemplateAction(name)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${templateName === name ? 'bg-brand-500/20 text-brand-400 border-brand-500/40' : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-slate-200 hover:border-slate-600'}`}
            >
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={handleReset} className="text-xs px-2.5 py-1 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-red-400 hover:border-red-500/40 transition-colors flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />Reset
            </button>
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-1 mb-4 border-b border-slate-700/50 pb-2">
        {([
          { key: 'edit' as const, icon: <Edit3 className="w-3.5 h-3.5" />, label: 'Edit Sections' },
          { key: 'badges' as const, icon: <Shield className="w-3.5 h-3.5" />, label: 'Badges' },
          { key: 'preview' as const, icon: <Eye className="w-3.5 h-3.5" />, label: 'Preview' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-slate-800 text-slate-200 border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleCopy} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-slate-800 text-slate-300 border border-slate-700 hover:border-brand-500/50 hover:text-brand-400 transition-colors">
            <Copy className="w-3 h-3" />Copy
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 transition-colors">
            <Download className="w-3 h-3" />Download
          </button>
        </div>
      </div>

      {activeTab === 'edit' && (
        <div className="space-y-3">
          {orderedKeys.filter(k => k !== 'badges').map(key => {
            const section = sections[key];
            return (
              <div key={key} className={`rounded-lg border transition-all ${section.enabled ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-800/15 border-slate-700/20 opacity-50'}`}>
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/30">
                  <button
                    onClick={() => toggleSection(key)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${section.enabled ? 'bg-brand-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${section.enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                  </button>
                  <span className="text-sm font-medium text-slate-200">{section.label}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{section.enabled ? 'enabled' : 'disabled'}</span>
                </div>
                {section.enabled && (
                  <div className="p-3">
                    <textarea
                      value={section.content}
                      onChange={e => updateSection(key, e.target.value)}
                      rows={Math.max(3, section.content.split('\n').length + 1)}
                      className="w-full px-3 py-2.5 bg-slate-900/70 text-slate-200 text-sm rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 placeholder-slate-500 transition-colors font-mono resize-y"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/40 border border-slate-700/60">
            <button
              onClick={() => toggleSection('badges')}
              className={`w-9 h-5 rounded-full transition-colors relative ${sections.badges.enabled ? 'bg-brand-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${sections.badges.enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
            <span className="text-sm font-medium text-slate-200">Include badges section</span>
            {activeBadges.length > 0 && <span className="text-xs text-slate-500 ml-auto">{activeBadges.length} selected</span>}
          </div>

          {sections.badges.enabled && (
            <>
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Preset Badges (click to toggle)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {BADGE_PRESETS.map(badge => {
                    const isActive = activeBadges.some(b => b.label === badge.label);
                    return (
                      <button
                        key={badge.label}
                        onClick={() => toggleBadge(badge)}
                        className={`p-2 rounded-lg border text-left transition-all ${isActive ? 'bg-brand-500/15 border-brand-500/40 ring-1 ring-brand-500/20' : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'}`}
                      >
                        <img src={badge.shieldUrl} alt={badge.label} className="h-5 mb-1" />
                        <p className="text-[10px] text-slate-400 truncate">{badge.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Custom Badge</h3>
                <div className="flex flex-wrap gap-2">
                  <input value={customBadgeLabel} onChange={e => setCustomBadgeLabel(e.target.value)} placeholder="Label (e.g. coverage 95%)" className="flex-1 min-w-[160px] px-3 py-2 bg-slate-900/70 text-slate-200 text-sm rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500/60 placeholder-slate-500 font-mono" />
                  <input value={customBadgeUrl} onChange={e => setCustomBadgeUrl(e.target.value)} placeholder="Shield URL (https://img.shields.io/...)" className="flex-[2] min-w-[240px] px-3 py-2 bg-slate-900/70 text-slate-200 text-sm rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500/60 placeholder-slate-500 font-mono" />
                  <button onClick={addCustomBadge} className="px-4 py-2 rounded-lg bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25 text-sm font-medium transition-colors flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />Add
                  </button>
                </div>
                {customBadgeUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Preview:</span>
                    <img src={customBadgeUrl} alt="custom badge" className="h-5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
          <div className="rounded-lg border border-slate-700/60 overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700/40 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Markdown</span>
              <span className="ml-auto text-xs text-slate-500">{markdown.split('\n').length} lines</span>
            </div>
            <pre className="flex-1 p-4 overflow-auto text-sm font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/50">
              {markdown || <span className="text-slate-600">No content. Enable sections in the Edit tab.</span>}
            </pre>
          </div>
          <div className="rounded-lg border border-slate-700/60 overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700/40 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Preview</span>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-slate-900/50" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-slate-600">No preview content.</p>' }} />
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
