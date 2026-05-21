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
  PaintBucket,
  Clock,
  Droplets,
  FileCode,
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
