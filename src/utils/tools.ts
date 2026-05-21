import type { LucideIcon } from 'lucide-react';
import { Braces, Binary, Fingerprint, Regex, Palette, Key } from 'lucide-react';
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
  { title: 'Color Converter', description: 'Convert between HEX, RGB, HSL color formats.', href: '/tools/color-converter', icon: Palette, tags: ['color', 'css', 'coming-soon'] },
  { title: 'JWT Debugger', description: 'Decode and inspect JWT tokens without sending data to a server.', href: '/tools/jwt-debugger', icon: Key, tags: ['jwt', 'auth', 'coming-soon'] },
];
