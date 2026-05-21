'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  Download,
  FileText,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Code,
  Quote,
  Heading1,
  Heading2,
  Table,
  Minus,
  Image,
  Strikethrough,
  Eye,
  Columns,
} from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_MARKDOWN = `# Welcome to Markdown Previewer

Start typing in the **left panel** and see the rendered HTML on the right.

## Features

- **Bold** and *italic* text, plus ~~strikethrough~~
- Inline \`code\` snippets
- [Links to websites](https://devbench-roan.vercel.app)
- Images: ![DevBench](https://via.placeholder.com/200x100/0ea5e9/ffffff?text=DevBench)
- > Blockquotes for citations
- \`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

### Task Lists

- [x] Build Markdown Previewer
- [x] Add live preview
- [ ] Add dark mode support
- [ ] Write documentation

### Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Headers | Done | High |
| Tables | Done | Medium |
| Images | Done | Low |

---

*Made with ❤️ on [DevBench](https://devbench-roan.vercel.app)*
`;

// --------------- Markdown Parser ---------------

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (ch) => map[ch]);
}

function parseInline(text: string): string {
  // Images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-md my-2" loading="lazy" />');
  // Links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:underline">$1</a>');
  // Bold + Italic ***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold **
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic *
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough ~~
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Inline code `...` (not inside code blocks which are already handled)
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  return text;
}

function parseMarkdown(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Code blocks (fenced)
    if (/^```/.test(trimmed)) {
      const lang = trimmed.slice(3).trim();
      result.push('<div class="code-block-wrapper"><div class="code-lang-label">' + (lang || 'code') + '</div><pre><code class="language-' + escapeHtml(lang) + '">');
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trimEnd())) {
        result.push(escapeHtml(lines[i]) + '\n');
        i++;
      }
      result.push('</code></pre></div>');
      i++; // skip closing ```
      continue;
    }

    // Empty line
    if (trimmed === '') {
      result.push('\n');
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
      result.push('<hr class="my-6 border-slate-600/50" />');
      i++;
      continue;
    }

    // Headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = parseInline(headerMatch[2]);
      const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'];
      result.push(`<h${level} class="${sizes[level - 1]} font-bold text-white mt-6 mb-3 pb-1.5 border-b border-slate-700/50">${content}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote (>)
    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trimEnd())) {
        quoteLines.push(lines[i].trimEnd().replace(/^>\s?/, ''));
        i++;
      }
      const quoteContent = quoteLines.map(l => parseInline(l)).join('<br />');
      result.push(`<blockquote class="border-l-4 border-brand-500/50 pl-4 py-1 my-4 text-slate-300 italic bg-surface-light/50 rounded-r-lg">${quoteContent}</blockquote>`);
      continue;
    }

    // Task list items
    const taskMatch = trimmed.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)/);
    if (taskMatch) {
      const indent = taskMatch[1].length;
      const checked = taskMatch[2].toLowerCase() === 'x';
      const content = parseInline(taskMatch[3]);
      result.push(
        `<div class="flex items-start gap-2 py-0.5" style="padding-left: ${indent * 1.5}rem">` +
        `<input type="checkbox" ${checked ? 'checked' : ''} disabled class="mt-1 accent-brand-500" />` +
        `<span class="${checked ? 'line-through text-slate-500' : 'text-slate-200'}">${content}</span>` +
        `</div>`
      );
      i++;
      continue;
    }

    // Unordered list items
    const ulMatch = trimmed.match(/^(\s*)[-*+]\s+(?!\[)(.+)/);
    if (ulMatch) {
      const listItems: { indent: number; line: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].trimEnd().match(/^(\s*)[-*+]\s+(?!\[)(.+)/);
        if (!m) break;
        listItems.push({ indent: m[1].length, line: m[2] });
        // Consume continuation lines (indented text after a list item)
        i++;
        while (i < lines.length) {
          const cont = lines[i].trimEnd();
          if (cont === '' || /^(\s*)[-*+]/.test(cont) || /^\d+\./.test(cont)) break;
          if (/^\s{2,}/.test(lines[i])) {
            listItems[listItems.length - 1].line += '<br />' + parseInline(cont.trim());
            i++;
          } else {
            break;
          }
        }
      }
      if (listItems.length > 0) {
        result.push('<ul class="list-disc list-inside my-3 space-y-1">');
        for (const item of listItems) {
          result.push(`<li class="text-slate-200" style="padding-left: ${item.indent * 0.75}rem">${parseInline(item.line)}</li>`);
        }
        result.push('</ul>');
      }
      continue;
    }

    // Ordered list items
    const olMatch = trimmed.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      const listItems: { indent: number; line: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].trimEnd().match(/^(\s*)\d+\.\s+(.+)/);
        if (!m) break;
        listItems.push({ indent: m[1].length, line: m[2] });
        i++;
        while (i < lines.length) {
          const cont = lines[i].trimEnd();
          if (cont === '' || /^(\s*)[-*+]/.test(cont) || /^\d+\./.test(cont)) break;
          if (/^\s{2,}/.test(lines[i])) {
            listItems[listItems.length - 1].line += '<br />' + parseInline(cont.trim());
            i++;
          } else {
            break;
          }
        }
      }
      if (listItems.length > 0) {
        result.push('<ol class="list-decimal list-inside my-3 space-y-1">');
        for (const item of listItems) {
          result.push(`<li class="text-slate-200" style="padding-left: ${item.indent * 0.75}rem">${parseInline(item.line)}</li>`);
        }
        result.push('</ol>');
      }
      continue;
    }

    // Table (accumulate rows and render)
    const tableMatch = trimmed.match(/^\|(.+)\|/);
    if (tableMatch) {
      const tableRows: string[][] = [];
      while (i < lines.length) {
        const tLine = lines[i].trimEnd();
        const m = tLine.match(/^\|(.+)\|/);
        if (!m) break;
        const cells = m[1].split('|').map(c => c.trim());
        tableRows.push(cells);
        i++;
      }
      // Check if there's a separator row (second row matches |---| pattern)
      if (tableRows.length >= 2) {
        const sepRow = tableRows[1];
        const isSep = sepRow.every(c => /^:?-{3,}:?$/.test(c));
        let alignments: string[] = [];
        if (isSep) {
          alignments = sepRow.map(c => {
            if (c.startsWith(':') && c.endsWith(':')) return 'center';
            if (c.endsWith(':')) return 'right';
            return 'left';
          });
          // Remove separator row
          tableRows.splice(1, 1);
        }
        if (tableRows.length > 0) {
          result.push('<div class="overflow-x-auto my-4"><table class="w-full border-collapse"><thead><tr>');
          const headerRow = tableRows[0];
          for (let ci = 0; ci < headerRow.length; ci++) {
            result.push(`<th class="border border-slate-600/50 px-3 py-2 bg-surface-lighter text-slate-200 text-sm font-semibold text-${alignments[ci] || 'left'}">${parseInline(headerRow[ci])}</th>`);
          }
          result.push('</tr></thead><tbody>');
          for (let ri = 1; ri < tableRows.length; ri++) {
            result.push('<tr class="even:bg-surface-light/30">');
            for (let ci = 0; ci < tableRows[ri].length; ci++) {
              result.push(`<td class="border border-slate-700/30 px-3 py-2 text-slate-300 text-sm text-${alignments[ci] || 'left'}">${parseInline(tableRows[ri][ci])}</td>`);
            }
            result.push('</tr>');
          }
          result.push('</tbody></table></div>');
        }
      }
      continue;
    }

    // Regular paragraph
    const paraLines: string[] = [];
    while (i < lines.length) {
      const paraLine = lines[i].trimEnd();
      if (
        paraLine === '' ||
        /^```/.test(paraLine) ||
        /^#{1,6}\s/.test(paraLine) ||
        /^>\s?/.test(paraLine) ||
        /^(\s*)[-*+]\s/.test(paraLine) ||
        /^\d+\.\s/.test(paraLine) ||
        /^\|(.+)\|/.test(paraLine) ||
        /^(-{3,}|\*{3,}|_{3,})\s*$/.test(paraLine)
      ) {
        break;
      }
      paraLines.push(paraLine);
      i++;
    }
    if (paraLines.length > 0) {
      const paraContent = paraLines.map(l => parseInline(l)).join('<br />');
      result.push(`<p class="text-slate-300 leading-relaxed my-2">${paraContent}</p>`);
    }
  }

  return result.join('\n');
}

// --------------- Component ---------------

type ViewMode = 'split' | 'edit' | 'preview';

export default function MarkdownPreviewerPage() {
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [html, setHtml] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  // Defer parsing to client-side only (avoids SSR timeout)
  useEffect(() => {
    setMounted(true);
    setHtml(parseMarkdown(markdown));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted) {
      setHtml(parseMarkdown(markdown));
    }
  }, [markdown, mounted]);

  const insertAtCursor = useCallback((before: string, after: string = '') => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = markdown.slice(start, end);
    const newText = markdown.slice(0, start) + before + selected + after + markdown.slice(end);
    setMarkdown(newText);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }, [markdown]);

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(html).then(
      () => toast.success('HTML copied!'),
      () => toast.error('Failed to copy'),
    );
  }, [html]);

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [markdown]);

  const loadSample = useCallback(() => {
    setMarkdown(INITIAL_MARKDOWN);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ta = editorRef.current;
      if (!ta || document.activeElement !== ta) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        insertAtCursor('**', '**');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        insertAtCursor('*', '*');
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [insertAtCursor]);

  const toolbarButtons = [
    { label: 'Heading 1', icon: Heading1, action: () => insertAtCursor('# ', '') },
    { label: 'Heading 2', icon: Heading2, action: () => insertAtCursor('## ', '') },
    { label: 'Bold', icon: Bold, action: () => insertAtCursor('**', '**') },
    { label: 'Italic', icon: Italic, action: () => insertAtCursor('*', '*') },
    { label: 'Strikethrough', icon: Strikethrough, action: () => insertAtCursor('~~', '~~') },
    { label: 'Bullet List', icon: List, action: () => insertAtCursor('\n- ', '') },
    { label: 'Numbered List', icon: ListOrdered, action: () => insertAtCursor('\n1. ', '') },
    { label: 'Task', icon: FileText, action: () => insertAtCursor('\n- [ ] ', '') },
    { label: 'Link', icon: Link, action: () => insertAtCursor('[', '](url)') },
    { label: 'Image', icon: Image, action: () => insertAtCursor('![alt](', 'url)') },
    { label: 'Code', icon: Code, action: () => insertAtCursor('`', '`') },
    { label: 'Quote', icon: Quote, action: () => insertAtCursor('\n> ', '') },
    { label: 'Table', icon: Table, action: () => {
      insertAtCursor('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n');
    }},
    { label: 'Rule', icon: Minus, action: () => insertAtCursor('\n---\n', '') },
  ];

  return (
    <ToolLayout
      title="Markdown Previewer"
      description="Write Markdown and see the rendered HTML in real-time. Split-pane view with a toolbar for common syntax."
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 mb-4 p-2 rounded-lg bg-surface-light border border-slate-700/50">
        {/* View mode toggle */}
        <div className="flex gap-0.5 mr-3 pr-3 border-r border-slate-600/50">
          {([
            { mode: 'edit' as const, icon: Code, label: 'Edit' },
            { mode: 'split' as const, icon: Columns, label: 'Split' },
            { mode: 'preview' as const, icon: Eye, label: 'Preview' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === mode
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-lighter'
              }`}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Formatting buttons */}
        {toolbarButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-lighter transition-colors"
            title={btn.label}
          >
            <btn.icon className="w-4 h-4" />
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={loadSample}
          className="px-2.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-lighter transition-colors"
        >
          Sample
        </button>
        <button
          onClick={copyHtml}
          className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy HTML
        </button>
        <button
          onClick={downloadMarkdown}
          className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3"
        >
          <Download className="w-3.5 h-3.5" />
          Download .md
        </button>
      </div>

      {/* Editor + Preview */}
      <div className={`${viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}`}>
        {/* Editor panel */}
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Markdown</label>
            <textarea
              ref={editorRef}
              className="input-field w-full min-h-[550px] h-[70vh] font-mono text-sm leading-relaxed resize-none"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Type your markdown here..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview panel */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Preview</label>
            <div className="card w-full min-h-[550px] h-[70vh] overflow-y-auto">
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
