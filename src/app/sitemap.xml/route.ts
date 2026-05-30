import fs from 'fs';
import path from 'path';

export async function GET() {
  const baseUrl = 'https://devbench-roan.vercel.app';

  // Static pages
  const staticPages = [
    { url: '', changefreq: 'daily', priority: '1.0' },
    { url: '/tools', changefreq: 'weekly', priority: '0.9' },
    { url: '/blog', changefreq: 'weekly', priority: '0.8' },
    { url: '/benchmarks', changefreq: 'weekly', priority: '0.7' },
    { url: '/about', changefreq: 'monthly', priority: '0.5' },
  ];

  // Tool pages
  const toolsDir = path.join(process.cwd(), 'src', 'app', 'tools');
  const toolSlugs: string[] = [];

  if (fs.existsSync(toolsDir)) {
    const entries = fs.readdirSync(toolsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('[')) {
        // Check if page.tsx exists
        const pagePath = path.join(toolsDir, entry.name, 'page.tsx');
        if (fs.existsSync(pagePath)) {
          toolSlugs.push(`/tools/${entry.name}`);
        }
      }
    }
  }

  // Blog posts
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const blogSlugs: string[] = [];

  if (fs.existsSync(blogDir)) {
    const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));
    for (const file of files) {
      blogSlugs.push(`/blog/${file.replace(/\.mdx$/, '')}`);
    }
  }

  const urls: string[] = [];

  // Static pages
  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Tool pages
  for (const slug of toolSlugs.sort()) {
    urls.push(`  <url>
    <loc>${baseUrl}${slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Blog posts
  for (const slug of blogSlugs.sort()) {
    urls.push(`  <url>
    <loc>${baseUrl}${slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
