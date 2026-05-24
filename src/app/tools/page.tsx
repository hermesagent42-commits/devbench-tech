import type { Metadata } from 'next';
import { ToolCard } from '@/components/ToolCard';
import {
  Braces,
  Binary,
  Fingerprint,
  Regex,
  Palette,
  Key,
  Anchor,
  Hash,
  Layers,
  Minimize2,
  ArrowUpDown,
  PaintBucket,
  Clock,
  Droplets,
  FileCode,
  Layout,
  CalendarClock,
  Grid3X3,
  QrCode,
  Database,
  ArrowLeftRight,
  ArrowRightLeft,
  Shield,
  Server,
  Globe,
  Link,
  AlignLeft,
  ShieldCheck,
  SlidersHorizontal,
  Network,
  Tags,
  BarChart3,
  FileWarning,
  Type,
  FileText,
  Eye,
  MapPin,
  Camera,
  Search,
  Radius,
  Scissors,
  Sparkles,
  TrendingUp,
  Ruler,
  Code2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'All Tools',
  description:
    'Browse all free developer tools: JSON formatter, Base64 encoder/decoder, UUID generator, regex tester, CSS Anchor Playground, and more.',
};

const allTools = [
  {
    title: 'JSON Formatter',
    description: 'Format, minify, and validate JSON with syntax highlighting and error detection.',
    href: '/tools/json-formatter',
    icon: Braces,
    tags: ['JSON', 'Formatter', 'Validator'],
  },
  {
    title: 'Base64 Encoder/Decoder',
    description: 'Encode text to Base64 or decode Base64 back to text. Fast and client-side only.',
    href: '/tools/base64',
    icon: Binary,
    tags: ['Base64', 'Encoder', 'Decoder'],
  },
  {
    title: 'UUID Generator',
    description: 'Generate cryptographically random UUID v4 identifiers. Batch generation supported.',
    href: '/tools/uuid-generator',
    icon: Fingerprint,
    tags: ['UUID', 'Generator', 'Batch'],
  },
  {
    title: 'Regex Tester',
    description: 'Test regular expressions with real-time match highlighting and capture group analysis.',
    href: '/tools/regex-tester',
    icon: Regex,
    tags: ['Regex', 'Tester', 'Highlighting'],
  },
  {
    title: 'CSS Anchor Playground',
    description: 'Interactive playground for the new CSS Anchor Positioning API (Baseline 2026). Visual tooltip positioning.',
    href: '/tools/css-anchor-playground',
    icon: Anchor,
    tags: ['CSS', 'Anchor', 'Positioning'],
  },
  {
    title: 'Color Converter',
    description: 'Convert colors between HEX, RGB, and HSL in real-time with live preview and color picker.',
    href: '/tools/color-converter',
    icon: Palette,
    tags: ['Color', 'Converter', 'Picker'],
  },
  {
    title: 'CSS Gradient Builder',
    description: 'Build beautiful CSS gradients visually — linear, radial, and conic. Live preview, presets, and instant copy.',
    href: '/tools/css-gradient-builder',
    icon: PaintBucket,
    tags: ['CSS', 'Gradient', 'Design'],
  },
  {
    title: 'JWT Debugger',
    description: 'Decode and inspect JWT tokens. View header, payload, signature, and time claims — all client-side.',
    href: '/tools/jwt-debugger',
    icon: Key,
    tags: ['JWT', 'Debugger', 'Auth'],
  },
  {
    title: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-384 & SHA-512 hashes from text or files. Client-side only.',
    href: '/tools/hash-generator',
    icon: Hash,
    tags: ['Hash', 'SHA', 'MD5', 'Crypto'],
  },
  {
    title: 'Cron Expression Builder',
    description: 'Build and understand cron expressions visually. Human-readable output, presets, and next execution times.',
    href: '/tools/cron-builder',
    icon: Clock,
    tags: ['Cron', 'Scheduler', 'Expression'],
  },
  {
    title: 'Color Palette Generator',
    description: 'Generate color palettes using harmony rules — complementary, analogous, triadic, tetradic, and more. Export as CSS variables or Tailwind config.',
    href: '/tools/color-palette',
    icon: Droplets,
    tags: ['Color', 'Palette', 'Design', 'CSS'],
  },
  {
    title: 'Markdown Previewer',
    description: 'Write Markdown with a live split-pane preview. Formatting toolbar, HTML copy, and .md download — all client-side.',
    href: '/tools/markdown-previewer',
    icon: FileCode,
    tags: ['Markdown', 'Preview', 'Editor'],
  },
  {
    title: 'CSS Flexbox Playground',
    description: 'Visually build and test CSS Flexbox layouts. Adjust container and item properties, see live results, and copy the CSS.',
    href: '/tools/flexbox-playground',
    icon: Layout,
    tags: ['CSS', 'Flexbox', 'Layout', 'Design'],
  },
  {
    title: 'CSS Grid Generator',
    description: 'Visually build CSS Grid layouts with live preview. Adjust columns, rows, gaps, alignment, and presets — copy the generated CSS.',
    href: '/tools/css-grid-generator',
    icon: Grid3X3,
    tags: ['CSS', 'Grid', 'Layout', 'Design'],
  },
  {
    title: 'QR Code Generator',
    description: 'Generate QR codes from text, URLs, or any data. Customizable colors, error correction, and sizes — 100% client-side.',
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
    title: 'Timestamp Converter',
    description: 'Convert between UNIX timestamps and human-readable dates. Seconds or milliseconds, 12 timezones, relative time, ISO 8601 & RFC 2822 formats.',
    href: '/tools/timestamp-converter',
    icon: CalendarClock,
    tags: ['Timestamp', 'Date', 'Converter', 'UNIX'],
  },
  {
    title: 'JSON ↔ CSV Converter',
    description: 'Convert JSON arrays to CSV and back. Table preview, CSV escaping, download — all client-side.',
    href: '/tools/json-csv-converter',
    icon: ArrowRightLeft,
    tags: ['JSON', 'CSV', 'Converter', 'Data'],
  },
  {
    title: 'JSON to TypeScript',
    description: 'Generate TypeScript type definitions from JSON data. Nested objects, arrays, unions, optional fields, interface/type toggle — 100% client-side.',
    href: '/tools/json-ts-converter',
    icon: Code2,
    tags: ['JSON', 'TypeScript', 'Types', 'Code Generation'],
  },
  {
    title: 'Number Base Converter',
    description: 'Convert numbers between binary, octal, decimal, and hex in real-time. ASCII/Unicode preview, common reference values — all client-side.',
    href: '/tools/number-base-converter',
    icon: Hash,
    tags: ['Number', 'Base', 'Binary', 'Hex', 'Converter'],
  },
  {
    title: 'Password Strength Checker',
    description: 'Check password strength with entropy analysis, crack-time estimates, and a 10-point security checklist — 100% client-side.',
    href: '/tools/password-strength-checker',
    icon: Shield,
    tags: ['Password', 'Security', 'Strength', 'Entropy'],
  },
  {
    title: 'HTTP Status Codes',
    description: 'Complete reference for every HTTP status code. Search by code or name, filter by category (1xx–5xx), and get detailed explanations with MDN links.',
    href: '/tools/http-status-codes',
    icon: Server,
    tags: ['HTTP', 'Status', 'Reference', 'API'],
  },
  {
    title: 'URL Encoder / Decoder',
    description: 'Encode and decode URLs and URI components. Handles special characters, query strings, and international text — all client-side.',
    href: '/tools/url-encoder',
    icon: Link,
    tags: ['URL', 'Encoder', 'Decoder'],
  },
  {
    title: 'Lorem Ipsum Generator',
    description: 'Generate placeholder text for mockups, designs, and prototypes. Customize paragraphs, sentence count, and classic opening.',
    href: '/tools/lorem-ipsum',
    icon: AlignLeft,
    tags: ['Lorem', 'Text', 'Placeholder'],
  },
  {
    title: 'Unix Permissions Calculator',
    description: 'Visually build chmod permissions with checkboxes. See octal notation, symbolic notation, and chmod command output in real-time.',
    href: '/tools/chmod-calculator',
    icon: ShieldCheck,
    tags: ['chmod', 'Unix', 'Permissions'],
  },
  {
    title: 'Code Minifier',
    description: 'Minify CSS, JavaScript, and HTML — strip comments, whitespace, and shrink your code. 100% client-side with size comparison.',
    href: '/tools/code-minifier',
    icon: Minimize2,
    tags: ['Minifier', 'CSS', 'JavaScript', 'HTML'],
  },
  {
    title: 'Unit Converter',
    description: 'Convert between hundreds of units across 11 categories — length, area, volume, mass, temperature, speed, time, data storage, pressure, angle, and frequency. 100% client-side.',
    href: '/tools/unit-converter',
    icon: SlidersHorizontal,
    tags: ['Converter', 'Units', 'Length', 'Mass', 'Data'],
  },
  {
    title: 'DNS Lookup',
    description: 'Query DNS records for any domain — A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, CAA, PTR. Uses Cloudflare DNS-over-HTTPS, fully client-side.',
    href: '/tools/dns-lookup',
    icon: Network,
    tags: ['DNS', 'Lookup', 'Network', 'Domain'],
  },
  {
    title: 'YAML ↔ JSON Converter',
    description: 'Convert between YAML and JSON instantly. Handles nested objects, arrays, booleans, and nulls — pure client-side with sample data.',
    href: '/tools/yaml-json-converter',
    icon: ArrowUpDown,
    tags: ['YAML', 'JSON', 'Converter', 'Config'],
  },
  {
    title: 'Text Analyzer',
    description: 'Analyze text — word count, character count, reading time, speaking time, keyword density, and more. 100% client-side.',
    href: '/tools/text-analyzer',
    icon: BarChart3,
    tags: ['Text', 'Analysis', 'Writing', 'SEO'],
  },
  {
    title: 'Robots.txt Generator',
    description: 'Build robots.txt files interactively — configure user-agents, allow/disallow rules, crawl delays, and sitemaps. Live preview with syntax highlighting and one-click download.',
    href: '/tools/robots-txt-generator',
    icon: FileWarning,
    tags: ['Robots.txt', 'SEO', 'Crawlers', 'Generator'],
  },
  {
    title: 'Sitemap Generator',
    description: 'Build XML sitemaps for search engines — add URLs, set priority and change frequency, batch-import, drag-to-reorder, and export as sitemap.xml. 100% client-side.',
    href: '/tools/sitemap-generator',
    icon: Globe,
    tags: ['Sitemap', 'SEO', 'XML', 'Generator'],
  },
  {
    title: 'Text Case Converter',
    description: 'Convert text between 15 case styles — camelCase, snake_case, kebab-case, CONSTANT_CASE, and more. Smart word detection handles mixed input formats.',
    href: '/tools/text-case-converter',
    icon: Type,
    tags: ['Text', 'Case', 'Converter', 'Formatter'],
  },
  {
    title: 'HTML Entity Converter',
    description: 'Encode and decode HTML entities — named and numeric. Searchable reference table of 200+ entities for characters, symbols, math, arrows, and more.',
    href: '/tools/html-entity-converter',
    icon: FileText,
    tags: ['HTML', 'Entities', 'Encoder', 'Decoder'],
  },
  {
    title: 'Color Contrast Checker',
    description: 'Check color contrast ratios for WCAG 2.1 compliance. Test any foreground/background combination, see AA/AAA scores, and export reports — all client-side.',
    href: '/tools/color-contrast-checker',
    icon: Eye,
    tags: ['Color', 'Contrast', 'WCAG', 'Accessibility'],
  },
  {
    title: 'IP Lookup',
    description: 'Look up geolocation, ISP, timezone, and network info for any IPv4 or IPv6 address. Auto-detect your own IP, see country flags, and copy any field — powered by ipapi.co.',
    href: '/tools/ip-lookup',
    icon: MapPin,
    tags: ['IP', 'Geolocation', 'Network', 'Lookup'],
  },
  {
    title: 'CSS Filter Playground',
    description: 'Build CSS filter effects visually — blur, brightness, contrast, grayscale, hue-rotate, and more. 12 presets, live image preview, backdrop-filter CSS generation, all client-side.',
    href: '/tools/css-filter-playground',
    icon: Camera,
    tags: ['CSS', 'Filter', 'Design', 'Effects'],
  },
  {
    title: 'CSS Border-Radius Generator',
    description: 'Visually craft border-radius corners with individual control, 10 presets, live preview, and CSS output — uniform or per-corner, all client-side.',
    href: '/tools/border-radius-generator',
    icon: Radius,
    tags: ['CSS', 'Border-Radius', 'Design', 'Generator'],
  },
  {
    title: 'CSS Clip-Path Maker',
    description: 'Visually build CSS clip-path shapes — 14 presets (circle, ellipse, polygon stars, arrows, traps), parameter sliders, custom polygon editor, and live preview. Instantly copy CSS.',
    href: '/tools/clip-path-maker',
    icon: Scissors,
    tags: ['CSS', 'Clip-Path', 'Shapes', 'Design'],
  },
  {
    title: 'CSS Animation Builder',
    description: 'Design CSS @keyframes animations visually — multiple stops with transform, opacity, and color control. 8 presets, live preview, and full CSS output.',
    href: '/tools/css-animation-builder',
    icon: Sparkles,
    tags: ['CSS', 'Animation', 'Keyframes', 'Design'],
  },
  {
    title: 'CSS Easing Playground',
    description: 'Design and preview cubic-bezier() easing curves visually. Drag control points, 10 presets, live animation preview, and instant CSS output — all client-side.',
    href: '/tools/css-easing-playground',
    icon: TrendingUp,
    tags: ['CSS', 'Easing', 'Animation', 'cubic-bezier'],
  },
  {
    title: 'CSS Unit Converter',
    description: 'Convert between px, rem, em, vw, vh and 20+ CSS units. Absolute, font-relative, and viewport categories with configurable base font size — all client-side.',
    href: '/tools/css-unit-converter',
    icon: Ruler,
    tags: ['CSS', 'Units', 'Converter', 'px', 'rem'],
  },
];

export default function ToolsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h1 className="section-title">All Developer Tools</h1>
        <p className="section-subtitle mt-2">
          Everything runs locally in your browser — no data leaves your machine.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allTools.map((tool, i) => (
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
    </div>
  );
}
