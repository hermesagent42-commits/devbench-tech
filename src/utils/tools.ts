import type { LucideIcon } from 'lucide-react';
import { Braces, Binary, Fingerprint, Regex, Palette, Key, Anchor, Layers, PaintBucket, Layout, Database, Shield, Server, BarChart3, FileText, Eye } from 'lucide-react';
export interface Tool {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tags: string[];
}
export const tools: Tool[] = [
  { title: 'JSON Formatter', description: 'Format, minify and validate JSON with syntax highlighting.', href: '/tools/json-formatter', icon: Braces, tags: ['formatter', 'json'] },
  { title: 'Base64 Encoder/Decoder', description: 'Encode strings to Base64 or decode Base64 back to text.', href: '/tools/base64', icon: Binary, tags: ['encoding', 'base64'] },
  { title: 'UUID Generator', description: 'Generate random UUID v4 identifiers, single or in batch.', href: '/tools/uuid-generator', icon: Fingerprint, tags: ['uuid', 'generator'] },
  { title: 'Regex Tester', description: 'Test regular expressions with real-time matching and capture groups.', href: '/tools/regex-tester', icon: Regex, tags: ['regex', 'testing'] },
  { title: 'CSS Anchor Playground', description: 'Interactive CSS Anchor Positioning tool — visual playground for the new Baseline 2026 API.', href: '/tools/css-anchor-playground', icon: Anchor, tags: ['css', 'anchor', 'positioning'] },
  { title: 'Color Converter', description: 'Convert between HEX, RGB, HSL color formats.', href: '/tools/color-converter', icon: Palette, tags: ['color', 'css', 'coming-soon'] },
  { title: 'JWT Debugger', description: 'Decode and inspect JWT tokens — view header, payload, signature, and time claims.', href: '/tools/jwt-debugger', icon: Key, tags: ['jwt', 'auth', 'debugger'] },
  { title: 'Box Shadow Generator', description: 'Visually create CSS box-shadows with multiple layers, presets, and live preview.', href: '/tools/box-shadow-generator', icon: Layers, tags: ['css', 'shadows', 'design'] },
  { title: 'CSS Gradient Builder', description: 'Build CSS gradients visually — linear, radial, conic with live preview and presets.', href: '/tools/css-gradient-builder', icon: PaintBucket, tags: ['css', 'gradients', 'design'] },
  { title: 'CSS Flexbox Playground', description: 'Visually build and test CSS Flexbox layouts — live preview and CSS generation.', href: '/tools/flexbox-playground', icon: Layout, tags: ['css', 'flexbox', 'layout'] },
  { title: 'SQL Formatter', description: 'Format, beautify, and minify SQL queries with keyword highlighting.', href: '/tools/sql-formatter', icon: Database, tags: ['sql', 'formatter', 'database'] },
  { title: 'Password Strength Checker', description: 'Check password strength with entropy analysis, crack-time estimates, and security checklist.', href: '/tools/password-strength-checker', icon: Shield, tags: ['password', 'security', 'checker'] },
  { title: 'HTTP Status Codes', description: 'Complete HTTP status code reference — search, filter by category, detailed explanations, and MDN links.', href: '/tools/http-status-codes', icon: Server, tags: ['http', 'status', 'reference'] },
  { title: 'Text Analyzer', description: 'Analyze text — word count, character count, reading time, speaking time, keyword density, and more.', href: '/tools/text-analyzer', icon: BarChart3, tags: ['text', 'analysis', 'writing', 'seo'] },
  { title: 'HTML Entity Converter', description: 'Encode and decode HTML entities — named and numeric. Includes a searchable reference table of 200+ entities.', href: '/tools/html-entity-converter', icon: FileText, tags: ['html', 'entities', 'encoder', 'decoder'] },
  { title: 'Color Contrast Checker', description: 'Check color contrast ratios for WCAG 2.1 compliance. AA/AAA scores, live preview, presets — all client-side.', href: '/tools/color-contrast-checker', icon: Eye, tags: ['color', 'contrast', 'wcag', 'accessibility'] },
];
