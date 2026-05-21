import type { Metadata } from 'next';
import { BlogCard } from '@/components/BlogCard';
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tips, guides, and deep dives into developer tools, benchmarks, and best practices.',
};

interface BlogPostMeta {
  title: string;
  date: string;
  excerpt: string;
  slug: string;
  tags: string[];
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }

  return frontmatter;
}

function getBlogPosts(): BlogPostMeta[] {
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');

  if (!fs.existsSync(blogDir)) {
    return [];
  }

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));

  const posts = files.map((file) => {
    const filePath = path.join(blogDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    const slug = file.replace(/\.mdx$/, '');

    return {
      title: frontmatter.title || 'Untitled',
      date: frontmatter.date || '',
      excerpt: frontmatter.excerpt || '',
      slug,
      tags: frontmatter.tags
        ? frontmatter.tags.split(',').map((t) => t.trim())
        : [],
    };
  });

  // Sort by date descending
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return posts;
}

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h1 className="section-title">Blog</h1>
        <p className="section-subtitle mt-2">
          Tips, guides, and deep dives into developer tools and best practices.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-lg">No blog posts yet.</p>
          <p className="text-slate-500 text-sm mt-2">
            Add .mdx files to src/content/blog/ to populate this page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard
              key={post.slug}
              title={post.title}
              date={post.date}
              excerpt={post.excerpt}
              slug={post.slug}
              tags={post.tags}
            />
          ))}
        </div>
      )}
    </div>
  );
}
