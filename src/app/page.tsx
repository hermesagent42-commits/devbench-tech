import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Hero } from '@/components/Hero';
import { ToolCard } from '@/components/ToolCard';
import { BlogCard } from '@/components/BlogCard';
import {
  Braces,
  Binary,
  Fingerprint,
  Regex,
  Layers,
  Minimize2,
  PaintBucket,
  Palette,
  Clock,
  Droplets,
  FileCode,
  Layout,
  CalendarClock,
  ArrowLeftRight,
  ArrowRightLeft,
  Grid3X3,
  QrCode,
  Database,
  Hash,
  Shield,
  Server,
  Globe,
  AlignLeft,
  ShieldCheck,
  Network,
  Tags,
  ArrowUpDown,
  BarChart3,
  FileWarning,
  Type,
  FileText,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'DevBench — Developer Tools, Benchmarks & Calculators',
  description:
    'Free developer tools for everyday use: JSON formatter, Base64 encoder/decoder, UUID generator, regex tester, benchmarks, and more.',
};

const featuredTools = [
  {
    title: 'JSON Formatter',
    description: 'Format, minify, and validate JSON with syntax highlighting. Perfect for debugging API responses.',
    href: '/tools/json-formatter',
    icon: Braces,
    tags: ['JSON', 'Formatter'],
  },
  {
    title: 'Base64 Encoder/Decoder',
    description: 'Encode and decode Base64 strings instantly. Supports UTF-8 text and binary data.',
    href: '/tools/base64',
    icon: Binary,
    tags: ['Base64', 'Encoder'],
  },
  {
    title: 'UUID Generator',
    description: 'Generate random UUID v4 identifiers. Single or batch generation with copy support.',
    href: '/tools/uuid-generator',
    icon: Fingerprint,
    tags: ['UUID', 'Generator'],
  },
  {
    title: 'Regex Tester',
    description: 'Test regular expressions in real-time with match highlighting and capture group display.',
    href: '/tools/regex-tester',
    icon: Regex,
    tags: ['Regex', 'Tester'],
  },
  {
    title: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-384 & SHA-512 hashes. Text or file input, 100% client-side.',
    href: '/tools/hash-generator',
    icon: Hash,
    tags: ['Hash', 'SHA', 'MD5'],
  },
  {
    title: 'Markdown Previewer',
    description: 'Write Markdown with a live preview. Split-pane view, toolbar for formatting, and download or copy the rendered HTML.',
    href: '/tools/markdown-previewer',
    icon: FileCode,
    tags: ['Markdown', 'Preview', 'Editor'],
  },
  {
    title: 'CSS Flexbox Playground',
    description: 'Visually build and test CSS Flexbox layouts — adjust every property in real-time and copy the CSS.',
    href: '/tools/flexbox-playground',
    icon: Layout,
    tags: ['CSS', 'Flexbox', 'Layout'],
  },
  {
    title: 'CSS Gradient Builder',
    description: 'Build beautiful CSS gradients — linear, radial, and conic. Live preview, presets, instant CSS copy.',
    href: '/tools/css-gradient-builder',
    icon: PaintBucket,
    tags: ['CSS', 'Gradient', 'Design'],
  },
  {
    title: 'CSS Grid Generator',
    description: 'Visually build CSS Grid layouts with live preview. Columns, rows, gaps, alignment, 8 presets — copy the CSS instantly.',
    href: '/tools/css-grid-generator',
    icon: Grid3X3,
    tags: ['CSS', 'Grid', 'Layout'],
  },
  {
    title: 'Color Converter',
    description: 'Convert colors between HEX, RGB, and HSL in real-time with live preview and color picker.',
    href: '/tools/color-converter',
    icon: Palette,
    tags: ['Color', 'Design', 'Converter'],
  },
  {
    title: 'Cron Builder',
    description: 'Build cron expressions interactively with human-readable output, presets, and next execution preview.',
    href: '/tools/cron-builder',
    icon: Clock,
    tags: ['Cron', 'Scheduler', 'DevOps'],
  },
  {
    title: 'Timestamp Converter',
    description: 'Convert UNIX timestamps to dates and back. Seconds, milliseconds, timezones, relative time — all client-side.',
    href: '/tools/timestamp-converter',
    icon: CalendarClock,
    tags: ['Timestamp', 'Date', 'UNIX'],
  },
  {
    title: 'QR Code Generator',
    description: 'Generate QR codes from text, URLs, or any data. Customizable colors, error correction levels, and sizes — 100% client-side.',
    href: '/tools/qr-code-generator',
    icon: QrCode,
    tags: ['QR', 'Barcode', 'Generator'],
  },
  {
    title: 'SQL Formatter',
    description: 'Format, beautify, and minify SQL queries with syntax highlighting. Supports MySQL, PostgreSQL, SQLite and more.',
    href: '/tools/sql-formatter',
    icon: Database,
    tags: ['SQL', 'Formatter', 'Minifier'],
  },
  {
    title: 'Diff Checker',
    description: 'Compare text side-by-side with line and character-level diffing. Myers algorithm, unified view, download as patch.',
    href: '/tools/diff-checker',
    icon: ArrowLeftRight,
    tags: ['Diff', 'Compare', 'Text'],
  },
  {
    title: 'JSON ↔ CSV Converter',
    description: 'Convert JSON arrays to CSV and back. Interactive table preview, CSV escaping, download — all client-side.',
    href: '/tools/json-csv-converter',
    icon: ArrowRightLeft,
    tags: ['JSON', 'CSV', 'Converter'],
  },
  {
    title: 'Number Base Converter',
    description: 'Convert numbers between binary, octal, decimal, and hex in real-time. ASCII preview, reference table — pure client-side.',
    href: '/tools/number-base-converter',
    icon: Hash,
    tags: ['Number', 'Base', 'Binary', 'Hex'],
  },
  {
    title: 'Password Strength Checker',
    description: 'Check password strength with entropy analysis, crack-time estimates, and a 10-point security checklist — all client-side.',
    href: '/tools/password-strength-checker',
    icon: Shield,
    tags: ['Password', 'Security', 'Entropy'],
  },
  {
    title: 'HTTP Status Codes',
    description: 'Complete HTTP status code reference — 60+ codes with search, category filters, detailed explanations, and one-click copy.',
    href: '/tools/http-status-codes',
    icon: Server,
    tags: ['HTTP', 'Status', 'Reference'],
  },
  {
    title: 'URL Encoder / Decoder',
    description: 'Encode and decode URLs and URI components. Perfect for query strings, form data, and international text.',
    href: '/tools/url-encoder',
    icon: Globe,
    tags: ['URL', 'Encoder', 'Decoder'],
  },
  {
    title: 'Unix Permissions Calculator',
    description: 'Visually build chmod permissions with checkboxes. See octal, symbolic, and chmod commands in real-time.',
    href: '/tools/chmod-calculator',
    icon: ShieldCheck,
    tags: ['chmod', 'Unix', 'Permissions'],
  },
  {
    title: 'DNS Lookup',
    description: 'Query DNS records for any domain — A, AAAA, CNAME, MX, TXT, NS, and more via Cloudflare DNS-over-HTTPS.',
    href: '/tools/dns-lookup',
    icon: Network,
    tags: ['DNS', 'Network', 'Lookup'],
  },
  {
    title: 'Lorem Ipsum Generator',
    description: 'Generate placeholder text for mockups and prototypes. Customizable paragraphs, sentence count, and classic opening.',
    href: '/tools/lorem-ipsum',
    icon: AlignLeft,
    tags: ['Lorem', 'Text', 'Placeholder'],
  },
  {
    title: 'Code Minifier',
    description: 'Minify CSS, JavaScript, and HTML — strip comments and whitespace, see real-time size savings, download the result.',
    href: '/tools/code-minifier',
    icon: Minimize2,
    tags: ['Minifier', 'CSS', 'JavaScript', 'HTML'],
  },
  {
    title: 'Meta Tag Generator',
    description: 'Generate complete HTML meta tags for SEO, Open Graph, and Twitter Cards. Social preview, JSX/HTML output, live updates.',
    href: '/tools/meta-tag-generator',
    icon: Tags,
    tags: ['Meta', 'SEO', 'Open Graph', 'Twitter'],
  },
  {
    title: 'YAML ↔ JSON Converter',
    description: 'Convert between YAML and JSON instantly. Config files, API payloads — swap direction, download results, 100% client-side.',
    href: '/tools/yaml-json-converter',
    icon: ArrowUpDown,
    tags: ['YAML', 'JSON', 'Converter'],
  },
  {
    title: 'Text Analyzer',
    description: 'Analyze text — word count, reading time, keyword density, sentence stats. Load files or paste text, get a full report.',
    href: '/tools/text-analyzer',
    icon: BarChart3,
    tags: ['Text', 'Analysis', 'Writer'],
  },
  {
    title: 'Robots.txt Generator',
    description: 'Build robots.txt files interactively — configure user-agents, allow/disallow rules, crawl delays, and sitemaps. Live preview, one-click copy.',
    href: '/tools/robots-txt-generator',
    icon: FileWarning,
    tags: ['Robots.txt', 'SEO', 'Crawlers'],
  },
  {
    title: 'Sitemap Generator',
    description: 'Build XML sitemaps for search engines — add URLs, set priority, batch-import, drag-to-reorder, and export as sitemap.xml.',
    href: '/tools/sitemap-generator',
    icon: Globe,
    tags: ['Sitemap', 'SEO', 'XML'],
  },
  {
    title: 'Text Case Converter',
    description: 'Convert text between 15 case styles — camelCase, snake_case, kebab-case, and more. Smart word detection, one-click copy.',
    href: '/tools/text-case-converter',
    icon: Type,
    tags: ['Text', 'Case', 'Converter'],
  },
  {
    title: 'HTML Entity Converter',
    description: 'Encode and decode HTML entities — named and numeric formats. Searchable reference table of 200+ entities.',
    href: '/tools/html-entity-converter',
    icon: FileText,
    tags: ['HTML', 'Entities', 'Encoder'],
  },
];

// Inline sample blog posts until content/blog/ directory is populated
const sampleBlogPosts = [
  {
    title: 'Getting Started with Regular Expressions',
    date: '2024-12-15',
    excerpt: 'Learn the fundamentals of regular expressions, from basic patterns to advanced lookaheads and capture groups.',
    slug: 'getting-started-with-regex',
    tags: ['Regex', 'Guide'],
  },
  {
    title: 'Understanding Base64 Encoding',
    date: '2024-12-10',
    excerpt: 'A deep dive into how Base64 encoding works, when to use it, and common pitfalls to avoid.',
    slug: 'understanding-base64',
    tags: ['Base64', 'Encoding'],
  },
  {
    title: 'JSON Best Practices for API Design',
    date: '2024-12-05',
    excerpt: 'Best practices for designing clean, predictable JSON APIs that your consumers will love.',
    slug: 'json-best-practices',
    tags: ['JSON', 'API'],
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Featured Tools */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="section-title">Featured Tools</h2>
          <p className="section-subtitle mt-2">
            Start with our most popular developer tools — free, fast, and private.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTools.map((tool, i) => (
            <ToolCard
              key={tool.href}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              icon={tool.icon}
              tags={tool.tags}
              index={i}
            />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/tools" className="btn-primary inline-flex items-center gap-2">
            View All Tools
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Latest from the Blog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700/50">
        <div className="text-center mb-12">
          <h2 className="section-title">Latest from the Blog</h2>
          <p className="section-subtitle mt-2">
            Tips, guides, and deep dives into developer tools and practices.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleBlogPosts.map((post) => (
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

        <div className="text-center mt-10">
          <Link href="/blog" className="btn-secondary inline-flex items-center gap-2">
            Read All Posts
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
