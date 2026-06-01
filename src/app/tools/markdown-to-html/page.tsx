'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, FileText, FileCode, ArrowRight, Eye, Code2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Simple Markdown to HTML renderer ────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseInlineMarkdown(text: string): string {
  // Bold (**text** or __text__)
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic (*text* or _text_)
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  return text;
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Code block fence
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
        if (listType) { result.push(`</${listType}>`); listType = null; inList = false; }
        continue;
      } else {
        const langClass = codeBlockLang ? ` class="language-${escapeHtml(codeBlockLang)}"` : '';
        result.push(`<pre><code${langClass}>${codeBlockContent.join('\n')}</code></pre>`);
        inCodeBlock = false;
        codeBlockContent = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent.push(escapeHtml(rawLine));
      continue;
    }

    // Empty line
    if (line === '') {
      if (listType) { result.push(`</${listType}>`); listType = null; inList = false; }
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
      if (listType) { result.push(`</${listType}>`); listType = null; inList = false; }
      result.push('<hr />');
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      if (listType) { result.push(`</${listType}>`); listType = null; inList = false; }
      const content = line.replace(/^>\s?/, '');
      result.push(`<blockquote>${parseInlineMarkdown(content)}</blockquote>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (listType !== 'ol') {
        if (listType) result.push(`</${listType}>`);
        result.push('<ol>');
        listType = 'ol';
        inList = true;
      }
      result.push(`<li>${parseInlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      if (listType !== 'ul') {
        if (listType) result.push(`</${listType}>`);
        result.push('<ul>');
        listType = 'ul';
        inList = true;
      }
      const content = line.replace(/^[-*+]\s+/, '');
      result.push(`<li>${parseInlineMarkdown(content)}</li>`);
      continue;
    }

    // Task list
    if (/^[-*+]\s+\[([ x])\]\s+/.test(line)) {
      if (listType !== 'ul') {
        if (listType) result.push(`</${listType}>`);
        result.push('<ul class="task-list">');
        listType = 'ul';
        inList = true;
      }
      const checked = line.match(/^[-*+]\s+\[([ x])\]\s+(.*)/);
      if (checked) {
        const checkedAttr = checked[1] === 'x' ? ' checked' : '';
        result.push(`<li class="task-list-item"><input type="checkbox"${checkedAttr} disabled /> ${parseInlineMarkdown(checked[2])}</li>`);
      }
      continue;
    }

    // End list if not a list item
    if (listType && !olMatch && !/^[-*+]\s+/.test(line) && !/^[-*+]\s+\[([ x])\]\s+/.test(line)) {
      result.push(`</${listType}>`);
      listType = null;
      inList = false;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      result.push(`<h${level}>${parseInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Table detection (simple)
    if (line.startsWith('|') && line.endsWith('|')) {
      if (i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s\-:|]+\|$/)) {
        // Header row
        const headers = line.split('|').slice(1, -1).map(h => h.trim());
        const headerHtml = headers.map(h => `<th>${parseInlineMarkdown(h)}</th>`).join('');
        result.push(`<table><thead><tr>${headerHtml}</tr></thead><tbody>`);
        i++; // skip separator line

        // Body rows
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].trim().endsWith('|')) {
          i++;
          const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
          const cellHtml = cells.map(c => `<td>${parseInlineMarkdown(c)}</td>`).join('');
          result.push(`<tr>${cellHtml}</tr>`);
        }
        result.push('</tbody></table>');
        continue;
      }
    }

    // Regular paragraph
    result.push(`<p>${parseInlineMarkdown(line)}</p>`);
  }

  // Close any open list
  if (listType) {
    result.push(`</${listType}>`);
  }

  // Close open code blocks
  if (inCodeBlock) {
    result.push(`<pre><code>${codeBlockContent.join('\n')}</code></pre>`);
  }

  return result.join('\n');
}

// ── Sample presets ──────────────────────────────────────────────────────────

const PRESETS = [
  {
    name: 'README Basics',
    description: 'Headings, bold, italic, code, links, and images',
    markdown: `# My Project

A **bold** description with *italic* emphasis and \`inline code\`.

## Features

- Fast and **lightweight**
- Easy to use
- Well documented

## Getting Started

Visit our [documentation](https://example.com/docs) or check out the code:

\`\`\`javascript
console.log("Hello, world!");
\`\`\`

> **Note**: This is a blockquote with important information.`,
  },
  {
    name: 'API Documentation',
    description: 'Tables, code blocks, lists, and task lists',
    markdown: `# API Reference

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Authenticate user |
| GET | /auth/me | Get current user |

## Endpoints

### GET /api/users

Returns a list of users.

\`\`\`json
{
  "users": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}
\`\`\`

### Todo List

- [x] Add authentication
- [x] Write tests
- [ ] Deploy to production
- [ ] Write documentation`,
  },
  {
    name: 'Blog Post',
    description: 'Rich formatting, links, images, and inline elements',
    markdown: `## Why I Love Markdown

Markdown is the **best** way to write for the web. It's:

1. Simple to learn
2. Easy to read as plain text
3. Universally supported

### A Picture Tells a Thousand Words

![Placeholder](https://placehold.co/600x300/0ea5e9/ffffff?text=Markdown+Magic)

### Final Thoughts

Markdown lets you focus on *content*, not formatting. That's why it's used everywhere from **GitHub** to **Stack Overflow** to **DevBench**! ~~HTML~~ Long live Markdown.`,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function MarkdownToHtmlPage() {
  const [markdown, setMarkdown] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'html'>('split');

  const htmlOutput = useMemo(() => {
    if (!markdown.trim()) return '';
    return markdownToHtml(markdown);
  }, [markdown]);

  const handleLoadPreset = useCallback((md: string) => {
    setMarkdown(md);
  }, []);

  const handleClear = useCallback(() => {
    setMarkdown('');
  }, []);

  const copyHtml = useCallback(() => {
    if (!htmlOutput) {
      toast.error('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(htmlOutput).then(
      () => toast.success('HTML copied to clipboard!'),
      () => toast.error('Copy failed')
    );
  }, [htmlOutput]);

  const copyMarkdown = useCallback(() => {
    if (!markdown.trim()) {
      toast.error('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(markdown).then(
      () => toast.success('Markdown copied!'),
      () => toast.error('Copy failed')
    );
  }, [markdown]);

  const wordCount = useMemo(() => {
    return markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  }, [markdown]);

  const charCount = useMemo(() => markdown.length, [markdown]);

  return (
    <ToolLayout
      title="Markdown to HTML Converter"
      description="Convert Markdown to clean, semantic HTML in real-time. Supports headings, lists, tables, code blocks, blockquotes, task lists, images, and inline formatting — all client-side."
    >
      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-slate-800/50 rounded-lg w-fit">
        {([
          { id: 'split', label: 'Split View', icon: Eye },
          { id: 'preview', label: 'Preview', icon: FileText },
          { id: 'html', label: 'HTML Source', icon: Code2 },
        ] as const).map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === mode.id
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <mode.icon className="w-3.5 h-3.5" />
            {mode.label}
          </button>
        ))}
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handleLoadPreset(preset.markdown)}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/50
                       hover:text-brand-400 hover:border-brand-500/40 transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Editor + Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{wordCount} words</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>{charCount.toLocaleString()} chars</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-slate-800/70 border border-slate-700 text-slate-300 hover:text-brand-400 hover:border-brand-500/40 transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Markdown
          </button>
          <button
            onClick={copyHtml}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-all"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Copy HTML
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/70 transition-colors"
            title="Clear"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Markdown Editor — hidden in preview mode if not split */}
        {(viewMode === 'split' || viewMode === 'html') && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Markdown
            </label>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Type or paste Markdown here..."
              rows={20}
              className="w-full px-4 py-3 bg-slate-800/70 text-slate-200 text-sm rounded-lg border border-slate-700
                         focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30
                         placeholder-slate-500 transition-colors font-mono resize-y min-h-[400px]"
            />
          </div>
        )}

        {/* Preview or HTML Output */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Preview
            </label>
            <div
              className="w-full min-h-[400px] px-5 py-4 bg-white rounded-lg border border-slate-700 overflow-auto
                         prose prose-sm prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlOutput }}
            />
          </div>
        )}

        {/* HTML Source */}
        {viewMode === 'html' && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              HTML Output
            </label>
            <pre className="w-full min-h-[400px] px-4 py-3 bg-slate-900 text-slate-300 text-xs rounded-lg border border-slate-700
                            overflow-auto font-mono whitespace-pre-wrap break-all">
              {htmlOutput || <span className="text-slate-600">HTML output will appear here...</span>}
            </pre>
          </div>
        )}
      </div>

      {/* Supported syntax */}
      <div className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Supported Markdown Syntax</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs text-slate-400">
          {[
            'Headings (# ## ###)',
            'Bold & Italic (** *_)',
            'Strikethrough (~~)',
            'Inline code (`)',
            'Code blocks (```)',
            'Blockquotes (>)',
            'Unordered lists (- *)',
            'Ordered lists (1.)',
            'Task lists (- [ ])',
            'Links & Images',
            'Tables',
            'Horizontal rules (---)',
          ].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
