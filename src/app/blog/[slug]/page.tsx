import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import fs from 'fs';
import path from 'path';
import { JsonLd } from '@/components/JsonLd';

interface Props {
  params: { slug: string };
}

function parseFrontmatter(content: string): { data: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const frontmatterRaw = match[1];
  const body = match[2];

  const data: Record<string, string> = {};
  const lines = frontmatterRaw.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }

  return { data, body };
}

function simpleMarkdownToHTML(md: string): string {
  let html = md;

  // Escape HTML first (except what we'll generate)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre class="code-block"><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4 class="post-h4">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="post-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="post-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="post-h1">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="post-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<li class="post-li">$1</li>');

  // Numbered list items
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li class="post-li">$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li class="post-li">.*<\/li>\n?)+)/g, '<ul class="post-ul">$1</ul>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="post-blockquote"><p>$1</p></blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="post-hr" />');

  // Paragraphs: wrap lines that aren't already HTML tags in <p>
  const lines = html.split('\n');
  const resultLines: string[] = [];
  let inParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      if (inParagraph) {
        resultLines.push('</p>');
        inParagraph = false;
      }
      resultLines.push('');
      continue;
    }

    // Skip lines that are already HTML block elements
    if (line.startsWith('<h') || line.startsWith('<pre') || line.startsWith('<ul') ||
        line.startsWith('<li') || line.startsWith('<blockquote') || line.startsWith('<hr') ||
        line.startsWith('</ul') || line.startsWith('</blockquote') || line.startsWith('</pre')) {
      if (inParagraph) {
        resultLines.push('</p>');
        inParagraph = false;
      }
      resultLines.push(line);
      continue;
    }

    if (!inParagraph) {
      resultLines.push('<p class="post-p">');
      inParagraph = true;
    }
    resultLines.push(line);
  }

  if (inParagraph) {
    resultLines.push('</p>');
  }

  return resultLines.join('\n');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const filePath = path.join(blogDir, `${params.slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return { title: 'Post Not Found' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { data } = parseFrontmatter(content);

  return {
    title: data.title || 'Blog Post',
    description: data.excerpt || '',
  };
}

export async function generateStaticParams() {
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');

  if (!fs.existsSync(blogDir)) {
    return [];
  }

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));

  return files.map((file) => ({
    slug: file.replace(/\.mdx$/, ''),
  }));
}

export default function BlogPostPage({ params }: Props) {
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const filePath = path.join(blogDir, `${params.slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, body } = parseFrontmatter(content);
  const html = simpleMarkdownToHTML(body);
  const tags = data.tags
    ? data.tags.split(',').map((t) => t.trim())
    : [];

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title || 'Untitled',
          description: data.excerpt || '',
          datePublished: data.date || '',
          author: {
            '@type': 'Organization',
            name: 'DevBench',
          },
          publisher: {
            '@type': 'Organization',
            name: 'DevBench',
            url: 'https://devbench-roan.vercel.app',
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://devbench-roan.vercel.app',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Blog',
              item: 'https://devbench-roan.vercel.app/blog',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: data.title || 'Post',
            },
          ],
        }}
      />
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-brand-400 text-sm transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Blog
      </Link>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
          {data.title || 'Untitled'}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          {data.date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {data.date}
            </span>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="badge-secondary flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div
        className="blog-content prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Styles for the blog content */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .blog-content .post-h1 { font-size: 1.75rem; font-weight: 700; color: #ffffff; margin-top: 2rem; margin-bottom: 1rem; }
        .blog-content .post-h2 { font-size: 1.5rem; font-weight: 600; color: #f1f5f9; margin-top: 1.75rem; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid #334155; }
        .blog-content .post-h3 { font-size: 1.25rem; font-weight: 600; color: #e2e8f0; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .blog-content .post-h4 { font-size: 1.1rem; font-weight: 600; color: #e2e8f0; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .blog-content .post-p { color: #cbd5e1; line-height: 1.75; margin-bottom: 1rem; }
        .blog-content .code-block { background: #0f172a; border: 1px solid #334155; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin: 1rem 0; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #e2e8f0; }
        .blog-content .inline-code { background: #1e293b; color: #38bdf8; padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-family: 'JetBrains Mono', monospace; font-size: 0.875em; }
        .blog-content .post-link { color: #38bdf8; text-decoration: underline; transition: color 0.2s; }
        .blog-content .post-link:hover { color: #7dd3fc; }
        .blog-content .post-ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; color: #cbd5e1; }
        .blog-content .post-li { margin-bottom: 0.25rem; line-height: 1.6; }
        .blog-content .post-blockquote { border-left: 3px solid #0ea5e9; padding: 0.5rem 1rem; margin: 1rem 0; background: rgba(14, 165, 233, 0.05); border-radius: 0 0.5rem 0.5rem 0; }
        .blog-content .post-blockquote p { color: #94a3b8; font-style: italic; }
        .blog-content .post-hr { border: none; border-top: 1px solid #334155; margin: 2rem 0; }
        .blog-content strong { color: #f1f5f9; font-weight: 600; }
        .blog-content em { font-style: italic; }
        `,
        }}
      />
    </article>
  );
}
