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
    description: 'Convert colors between HEX, RGB, HSL, and more. Coming soon!',
    href: '/tools/color-converter',
    icon: Palette,
    tags: ['Color', 'Converter', 'Coming Soon'],
    upcoming: true,
  },
  {
    title: 'JWT Debugger',
    description: 'Decode and inspect JWT tokens. View header, payload, and signature details. Coming soon!',
    href: '/tools/jwt-debugger',
    icon: Key,
    tags: ['JWT', 'Debugger', 'Coming Soon'],
    upcoming: true,
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
