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
  Move,
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
  Network,
  Tags,
  ArrowUpDown,
  BarChart3,
  FileWarning,
  Type,
  FileText,
  Image,
  MapPin,
  Camera,
  Radius,
  TrendingUp,
  Ruler,
  Box,
  Container,
  Accessibility,
  Square,
  Loader2,
  Parentheses,
  Anchor,
  TreePine,
  ScrollText,
  Film,
  PenTool,
  Calendar,
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
    title: 'CSS Box-Shadow Generator',
    description: 'Design layered box‑shadows visually — offset, blur, spread, opacity, and inset. 10 presets, live preview, one‑click CSS copy.',
    href: '/tools/css-box-shadow-generator',
    icon: Square,
    tags: ['CSS', 'Box-Shadow', 'Design'],
  },
  {
    title: 'CSS Blend Mode Playground',
    description: 'Explore all 16 CSS blend modes with live color previews, math formulas, presets, and computed blend values — mix-blend-mode and background-blend-mode.',
    href: '/tools/css-blend-playground',
    icon: Layers,
    tags: ['CSS', 'Blend Mode', 'Design'],
  },
  {
    title: 'Text-Shadow Generator',
    description: 'Design layered text-shadows — neon glow, retro 3D, emboss effects. 8 presets, live preview, instant CSS copy.',
    href: '/tools/text-shadow-generator',
    icon: Type,
    tags: ['CSS', 'Text-Shadow', 'Typography'],
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
    title: 'CSS Transform Playground',
    description: 'Visually build CSS transforms — translate, scale, rotate, and skew. Set transform-origin, live preview, instant CSS copy.',
    href: '/tools/css-transform-playground',
    icon: Move,
    tags: ['CSS', 'Transform', 'Animation'],
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
  {
    title: 'Image to Base64',
    description: 'Convert images to Base64 strings and back. Drag-and-drop, paste from clipboard, decode Base64 to image — 100% client-side.',
    href: '/tools/image-base64',
    icon: Image,
    tags: ['Base64', 'Image', 'Converter'],
  },
  {
    title: 'Line Sorter',
    description: 'Sort, deduplicate, shuffle, and reverse lines of text. Natural sort handles file1, file2, file10 correctly — all client-side.',
    href: '/tools/line-sorter',
    icon: ArrowUpDown,
    tags: ['Sort', 'Deduplicate', 'Text'],
  },
  {
    title: 'IP Lookup',
    description: 'Look up geolocation, ISP, and network info for any IP address. Auto-detect your own IP — powered by ipapi.co.',
    href: '/tools/ip-lookup',
    icon: MapPin,
    tags: ['IP', 'Geolocation', 'Network'],
  },
  {
    title: 'CSS Loader Generator',
    description: 'Design pure-CSS loading spinners — 12 presets (spinners, dots, bars, ripples), live customization, and instant CSS/HTML copy.',
    href: '/tools/css-loader-generator',
    icon: Loader2,
    tags: ['CSS', 'Loader', 'Spinner', 'Animation'],
  },
  {
    title: 'CSS Filter Playground',
    description: 'Build CSS filter effects visually — blur, brightness, contrast, and more. 12 presets, live image preview, backdrop-filter mode.',
    href: '/tools/css-filter-playground',
    icon: Camera,
    tags: ['CSS', 'Filter', 'Design'],
  },
  {
    title: 'CSS Easing Playground',
    description: 'Design and preview cubic-bezier() easing curves visually. Drag control points, 10 presets, and live animation preview.',
    href: '/tools/css-easing-playground',
    icon: TrendingUp,
    tags: ['CSS', 'Easing', 'Animation'],
  },
  {
    title: 'CSS Unit Converter',
    description: 'Convert between px, rem, em, vw, vh, and 20+ CSS units. Configurable font size and viewport, presets, instant copy.',
    href: '/tools/css-unit-converter',
    icon: Ruler,
    tags: ['CSS', 'Units', 'Converter'],
  },
  {
    title: 'JSON Schema Generator',
    description: 'Generate JSON Schema from JSON data — Draft 7 or 2020-12. Nested objects, arrays, required fields — all client-side.',
    href: '/tools/json-schema-generator',
    icon: FileCode,
    tags: ['JSON Schema', 'API', 'Validation'],
  },
  {
    title: 'Container Query Builder',
    description: 'Visually build CSS container size queries. Set container-type, add range conditions, preview at different widths, and copy production-ready CSS.',
    href: '/tools/container-query-builder',
    icon: Container,
    tags: ['CSS', 'Container Queries', 'Responsive', '2026'],
  },
  {
    title: 'Box Model Visualizer',
    description: 'Interactively build and visualize the CSS box model — margin, border, padding, and content. Real-time rendering, presets, CSS output.',
    href: '/tools/box-model-visualizer',
    icon: Box,
    tags: ['CSS', 'Box Model', 'Layout'],
  },
  {
    title: 'CSS Typography Playground',
    description: 'Design type scales — 8 mathematical scales, font picker, live preview, and CSS output.',
    href: '/tools/css-typography-playground',
    icon: Type,
    tags: ['CSS', 'Typography', 'Design'],
  },
  {
    title: 'Color Blindness Simulator',
    description: 'Simulate any hex color with 4 types of color vision deficiency. Compare side-by-side, export accessibility reports.',
    href: '/tools/color-blindness-simulator',
    icon: Accessibility,
    tags: ['Accessibility', 'CVD', 'Simulation'],
  },
  {
    title: 'Glassmorphism Generator',
    description: 'Design frosted-glass panels with live preview. 8 presets, blur/opacity/tint controls, and instant CSS with backdrop-filter.',
    href: '/tools/glassmorphism-generator',
    icon: Layers,
    tags: ['CSS', 'Glassmorphism', 'Design'],
  },
  {
    title: 'CSS Anchor Positioning Playground',
    description: 'Visually build CSS Anchor Positioning layouts — the new Baseline 2026 API that replaces JavaScript tooltip libraries. 3×3 grid, live preview, instant CSS copy.',
    href: '/tools/css-anchor-playground',
    icon: Anchor,
    tags: ['CSS', 'Anchor', 'Baseline 2026'],
  },
  {
    title: 'CSS :has() Playground',
    description: 'Experiment with the :has() relational pseudo-class — now Baseline everywhere. 7 presets, live highlighting, match inspector.',
    href: '/tools/css-has-playground',
    icon: Parentheses,
    tags: ['CSS', ':has()', 'Selectors', '2026'],
  },
  {
    title: 'CSS Nesting Playground',
    description: 'Write native CSS nesting and see the expanded browser-ready output — now Baseline everywhere. No preprocessor needed. 8 presets, real-time expansion.',
    href: '/tools/css-nesting-playground',
    icon: TreePine,
    tags: ['CSS', 'Nesting', 'Baseline 2026'],
  },
  {
    title: 'Scroll-Driven Animations',
    description: 'Build CSS scroll-driven animations visually — the new 2026 Baseline API. 8 presets, live scroll preview, instant CSS copy.',
    href: '/tools/scroll-driven-animations',
    icon: ScrollText,
    tags: ['CSS', 'Scroll', 'Animation', 'Baseline 2026'],
  },
  {
    title: 'View Transitions Playground',
    description: 'Build and test View Transitions API animations — cross-fade, slide, 3D rotate, morph, and more. 9 presets, live preview, production-ready CSS.',
    href: '/tools/view-transitions-playground',
    icon: Film,
    tags: ['CSS', 'View Transitions', 'Animation', 'Baseline 2026'],
  },
  {
    title: 'SVG Previewer & Optimizer',
    description: 'Paste SVG code to preview, validate, and optimize. Strip whitespace, comments, and redundant attributes — see instant size savings. 5 sample SVGs, light/dark backgrounds.',
    href: '/tools/svg-previewer',
    icon: PenTool,
    tags: ['SVG', 'Preview', 'Optimizer'],
  },
  {
    title: 'Date Calculator',
    description: 'Calculate date differences with year/month/day breakdowns, add/subtract durations, and count down to events. Pure client-side.',
    href: '/tools/date-calculator',
    icon: Calendar,
    tags: ['Date', 'Calculator', 'Countdown'],
  },
];

// Inline sample blog posts — latest featured on homepage
const sampleBlogPosts = [
  {
    title: 'CSS Anchor Positioning Is Baseline — The End of JavaScript Tooltip Libraries',
    date: '2026-05-24',
    excerpt: 'CSS Anchor Positioning just hit Baseline across all browsers. No more Floating UI, Popper, or Tippy.js — the browser now natively tethers elements with zero JavaScript.',
    slug: 'css-anchor-positioning-guide',
    tags: ['CSS', 'Anchor Positioning', 'Baseline 2026'],
  },
  {
    title: 'CSS :has() — The Parent Selector That Changes Everything',
    date: '2026-05-24',
    excerpt: 'The :has() pseudo-class is now Baseline across all major browsers. It\'s not just a parent selector — it\'s a relational selector that unlocks patterns we\'ve needed JavaScript for. Complete guide with 6 real-world patterns.',
    slug: 'css-has-selector-guide',
    tags: ['CSS', ':has()', 'Web Platform', 'Selectors'],
  },
  {
    title: 'CSS Scroll-Driven Animations: The Complete Guide',
    date: '2026-05-24',
    excerpt: 'Scroll-driven animations let you drive CSS animations by scroll position instead of time. Now Baseline everywhere — everything you need to know with 5 real-world patterns.',
    slug: 'scroll-driven-animations',
    tags: ['CSS', 'Scroll-Driven', 'Animation', 'Web Platform'],
  },
  {
    title: 'The View Transitions API: Smooth Page Animations Without JavaScript',
    date: '2026-05-24',
    excerpt: 'View Transitions API is now Baseline across all major browsers. Learn how to add smooth cross-page animations with one line of CSS.',
    slug: 'view-transitions-api-guide',
    tags: ['CSS', 'View Transitions', 'Web Platform'],
  },
  {
    title: 'Google I/O 2026: Every Web Platform Announcement',
    date: '2026-05-21',
    excerpt: 'From CSS Anchor Positioning reaching Baseline to HTML-in-Canvas, here\'s everything announced for web developers at Google I/O 2026.',
    slug: 'google-io-2026-web-platform',
    tags: ['CSS', 'Google I/O', 'Chrome'],
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
