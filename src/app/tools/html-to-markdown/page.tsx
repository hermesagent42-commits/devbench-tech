'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, FileCode, FileText, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Sample HTML presets ──────────────────────────────────────────────────────

interface Preset {
  name: string;
  description: string;
  html: string;
}

const PRESETS: Preset[] = [
  {
    name: 'Simple Article',
    description: 'Headings, paragraphs, bold/italic, links, and images',
    html: `<h1>Welcome to My Blog</h1>
<p>This is a <strong>simple</strong> blog post about <em>web development</em>. We'll cover the basics of <a href="https://developer.mozilla.org">HTML</a> and how to convert it to Markdown.</p>
<h2>Getting Started</h2>
<p>First, you need to understand the <code>DOM</code> structure. Here's an image to help:</p>
<img src="https://placehold.co/600x300" alt="A helpful diagram" />
<p>That covers the basics! Stay tuned for <strong>more</strong>.</p>`,
  },
  {
    name: 'Documentation Page',
    description: 'Code blocks, inline code, lists, and tables',
    html: `<h1>API Reference</h1>
<p>The <code>fetchUser</code> endpoint retrieves user data by ID. It supports both <strong>GET</strong> and <strong>POST</strong> methods.</p>
<h2>Code Example</h2>
<pre><code class="language-javascript">const user = await fetchUser(42);
console.log(user.name); // "Alice"</code></pre>
<h2>Parameters</h2>
<table>
  <thead><tr><th>Name</th><th>Type</th><th>Required</th></tr></thead>
  <tbody>
    <tr><td>id</td><td>number</td><td>Yes</td></tr>
    <tr><td>fields</td><td>string[]</td><td>No</td></tr>
  </tbody>
</table>
<h2>Steps</h2>
<ol>
  <li>Authenticate with your API key</li>
  <li>Call the endpoint with user ID</li>
  <li>Parse the JSON response</li>
</ol>
<blockquote><p><strong>Note:</strong> Rate limit is 100 requests per minute.</p></blockquote>`,
  },
  {
    name: 'README Template',
    description: 'Typical GitHub README structure with badges, features, and install',
    html: `<h1 align="center">MyCoolProject</h1>
<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
</p>
<h2>Features</h2>
<ul>
  <li>⚡ <strong>Blazing fast</strong> — built with Rust</li>
  <li>🎨 <strong>Customizable</strong> — theme support</li>
  <li>🔒 <strong>Secure</strong> — zero dependencies</li>
</ul>
<h2>Installation</h2>
<pre><code class="language-bash">npm install my-cool-project</code></pre>
<p>Or with <strong>yarn</strong>:</p>
<pre><code class="language-bash">yarn add my-cool-project</code></pre>
<h2>Quick Start</h2>
<pre><code class="language-typescript">import { createApp } from 'my-cool-project';
const app = createApp({ theme: 'dark' });
app.start();</code></pre>
<h2>License</h2>
<p>MIT © 2026</p>`,
  },
];

// ── HTML to Markdown converter (pure client-side, no deps) ───────────────────

type MdNode = {
  md: string;
};

function extractTextContent(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function htmlToMarkdown(html: string): string {
  // Normalize whitespace and trim
  let input = html.trim();

  // Remove HTML comments
  input = input.replace(/<!--[\s\S]*?-->/g, '');

  // Handle <pre><code class="language-xxx"> blocks before other transformations
  const codeBlocks: string[] = [];
  input = input.replace(
    /<pre>\s*<code(?:\s+class="language-(\w+)")?\s*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    ((_match: string, lang: string, code: string) => {
      const idx = codeBlocks.length;
      // Decode HTML entities in code
      const decoded = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      codeBlocks.push('```' + (lang || '') + '\n' + decoded + '\n```');
      return `%%CODEBLOCK_${idx}%%`;
    }) as unknown as string,
  );

  // Handle inline <code> (not inside pre)
  const inlineCodes: string[] = [];
  input = input.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, ((_match: string, code: string) => {
    const idx = inlineCodes.length;
    const decoded = code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    inlineCodes.push('`' + decoded.trim() + '`');
    return `%%INLINECODE_${idx}%%`;
  }) as unknown as string);

  // Handle links
  const links: { text: string; href: string; title: string }[] = [];
  input = input.replace(
    /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    ((_match: string, href: string, text: string) => {
      const idx = links.length;
      const cleanText = text.trim() || href;
      // Check for title attribute
      const titleMatch = _match.match(/title="([^"]*)"/i);
      const title = titleMatch ? titleMatch[1] : '';
      links.push({ text: cleanText, href, title });
      return `%%LINK_${idx}%%`;
    }) as unknown as string,
  );

  // Handle images
  const images: { alt: string; src: string }[] = [];
  input = input.replace(
    /<img\s+[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    ((_match: string, src: string, alt: string) => {
      const idx = images.length;
      images.push({ alt: alt || 'image', src });
      return `%%IMAGE_${idx}%%`;
    }) as unknown as string,
  );
  // Also catch images with alt first, src second
  input = input.replace(
    /<img\s+[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi,
    ((_match: string, alt: string, src: string) => {
      // Check if this was already processed
      if (!images.some((img) => img.src === src && img.alt === alt)) {
        const idx = images.length;
        images.push({ alt: alt || 'image', src });
        return `%%IMAGE_${idx}%%`;
      }
      return _match;
    }) as unknown as string,
  );

  // Handle headings
  input = input.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, ((_match: string, level: string, content: string) => {
    const clean = cleanInline(content);
    return '\n\n' + '#'.repeat(Number(level)) + ' ' + clean + '\n\n';
  }) as unknown as string);

  // Handle blockquotes
  input = input.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    ((_match: string, content: string) => {
      const lines = content
        .split('\n')
        .map((line: string) => '> ' + line.trim())
        .filter((l: string) => l !== '> ')
        .join('\n');
      return '\n\n' + lines + '\n\n';
    }) as unknown as string,
  );

  // Handle <hr>
  input = input.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // Handle tables
  input = input.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, ((_match: string, content: string) => {
    const allRows = content.replace(/<t(head|body|foot)[^>]*>/gi, '').replace(/<\/t(head|body|foot)>/gi, '');

    const parseRow = (rowHtml: string): string[] => {
      const cells: string[] = [];
      rowHtml.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, ((_m: string, cell: string) => {
        cells.push(cell.trim().replace(/\|/g, '\\|'));
        return '';
      }) as unknown as string);
      return cells;
    };

    const rows: string[][] = [];
    allRows.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, ((_m: string, rowContent: string) => {
      rows.push(parseRow(rowContent));
      return '';
    }) as unknown as string);

    if (rows.length === 0) return '\n\n';

    let md = '\n\n';
    // Header row
    const headerRow = rows[0].map((c) => c || ' ').join(' | ');
    const separator = rows[0].map(() => '---').join(' | ');
    md += '| ' + headerRow + ' |\n';
    md += '| ' + separator + ' |\n';

    for (let i = 1; i < rows.length; i++) {
      md += '| ' + rows[i].map((c) => c || ' ').join(' | ') + ' |\n';
    }

    return md + '\n';
  }) as unknown as string);

  // Handle <br>
  input = input.replace(/<br\s*\/?>/gi, '\n');

  // Handle list items — wrap in proper list blocks
  // Ordered lists
  input = input.replace(
    /(?:<ol[^>]*>)([\s\S]*?)(?:<\/ol>)/gi,
    ((_match: string, content: string) => {
      let counter = 0;
      const items = content
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, ((_m: string, item: string) => {
          counter++;
          return counter + '. ' + cleanInline(item.trim()) + '\n';
        }) as unknown as string);
      return '\n' + items.trim() + '\n';
    }) as unknown as string,
  );

  // Unordered lists
  input = input.replace(
    /(?:<ul[^>]*>)([\s\S]*?)(?:<\/ul>)/gi,
    ((_match: string, content: string) => {
      const items = content
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, ((_m: string, item: string) => {
          return '- ' + cleanInline(item.trim()) + '\n';
        }) as unknown as string);
      return '\n' + items.trim() + '\n';
    }) as unknown as string,
  );

  // Handle <p> tags
  input = input.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, ((_match: string, content: string) => {
    const clean = cleanInline(content.trim());
    if (!clean) return '';
    return '\n\n' + clean + '\n\n';
  }) as unknown as string);

  // Handle <strong>/<b>
  input = input.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');

  // Handle <em>/<i>
  input = input.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // Handle <del>/<s>/<strike>
  input = input.replace(/<(?:del|s|strike)>([\s\S]*?)<\/(?:del|s|strike)>/gi, '~~$1~~');

  // Remove remaining HTML tags
  input = input.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  input = input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Restore code blocks
  input = input.replace(/%%CODEBLOCK_(\d+)%%/g, ((_match: string, idx: string) => codeBlocks[Number(idx)] || '') as unknown as string);
  // Restore inline codes
  input = input.replace(/%%INLINECODE_(\d+)%%/g, ((_match: string, idx: string) => inlineCodes[Number(idx)] || '') as unknown as string);
  // Restore links
  input = input.replace(/%%LINK_(\d+)%%/g, ((_match: string, idx: string) => {
    const link = links[Number(idx)];
    if (!link) return '';
    const titlePart = link.title ? ' "' + link.title + '"' : '';
    return '[' + cleanInline(link.text) + '](' + link.href + titlePart + ')';
  }) as unknown as string);
  // Restore images
  input = input.replace(/%%IMAGE_(\d+)%%/g, ((_match: string, idx: string) => {
    const img = images[Number(idx)];
    if (!img) return '';
    return '![' + cleanInline(img.alt) + '](' + img.src + ')';
  }) as unknown as string);

  // Clean up excessive newlines
  input = input.replace(/\n{3,}/g, '\n\n');
  // Remove leading/trailing whitespace
  input = input.trim();

  return input;
}

function cleanInline(text: string): string {
  return text
    .replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
    .replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*')
    .replace(/<(?:del|s|strike)>([\s\S]*?)<\/(?:del|s|strike)>/gi, '~~$1~~')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function HtmlToMarkdownPage() {
  const [htmlInput, setHtmlInput] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const markdownOutput = useMemo(() => {
    if (!htmlInput.trim()) return '';
    return htmlToMarkdown(htmlInput);
  }, [htmlInput]);

  const charCount = htmlInput.length;

  const applyPreset = useCallback((preset: Preset) => {
    setHtmlInput(preset.html);
    setActivePreset(preset.name);
  }, []);

  const resetAll = useCallback(() => {
    setHtmlInput('');
    setActivePreset(null);
  }, []);

  const copyMarkdown = useCallback(() => {
    if (!markdownOutput) return;
    navigator.clipboard.writeText(markdownOutput);
    toast.success('Markdown copied!');
  }, [markdownOutput]);

  return (
    <ToolLayout
      title="HTML to Markdown Converter"
      description="Paste HTML and get clean Markdown instantly. Handles headings, lists, tables, code blocks, links, images, and more — 100% client-side with live preview."
      controls={
        <>
          <button
            onClick={copyMarkdown}
            disabled={!markdownOutput}
            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Markdown
          </button>
          <button
            onClick={resetAll}
            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left sidebar: presets ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Sample HTML</h3>
            <div className="space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    activePreset === preset.name
                      ? 'bg-brand-500/10 border-brand-500/40'
                      : 'bg-surface-light border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-200">{preset.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div className="p-3 rounded-lg bg-surface-light border border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">What it handles</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Headings (h1–h6)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Bold, italic, strikethrough
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Links, images
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Code blocks (with language)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Inline code
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Ordered &amp; unordered lists
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Blockquotes
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Tables (with headers)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 shrink-0" />
                Horizontal rules
              </li>
            </ul>
          </div>
        </div>

        {/* ── Main: Input / Output ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200 inline-flex items-center gap-2">
                <FileCode className="w-4 h-4 text-brand-400" />
                HTML Input
              </h3>
              <span className="text-xs text-slate-500">
                {charCount.toLocaleString()} characters
              </span>
            </div>
            <textarea
              value={htmlInput}
              onChange={(e) => {
                setHtmlInput(e.target.value);
                setActivePreset(null);
              }}
              placeholder="Paste your HTML here..."
              className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-200 font-mono resize-y focus:outline-none focus:border-brand-500 placeholder:text-slate-600"
              spellCheck={false}
            />
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="p-1.5 rounded-full bg-surface-light border border-slate-700/50">
              <ArrowRight className="w-4 h-4 text-brand-400" />
            </div>
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200 inline-flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" />
                Markdown Output
              </h3>
              <span className="text-xs text-slate-500">
                {markdownOutput ? markdownOutput.length.toLocaleString() : 0} chars
              </span>
            </div>
            {markdownOutput ? (
              <pre className="w-full min-h-[200px] max-h-[600px] bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-200 font-mono overflow-auto whitespace-pre-wrap break-words focus:outline-none">
                {markdownOutput}
              </pre>
            ) : (
              <div className="w-full min-h-[200px] bg-slate-900 border border-slate-700 rounded-lg p-4 flex items-center justify-center">
                <p className="text-sm text-slate-500">
                  Paste HTML above to see the converted Markdown
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
