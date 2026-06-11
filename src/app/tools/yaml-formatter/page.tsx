'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Minimize2, Maximize2, Indent } from 'lucide-react';
import toast from 'react-hot-toast';

// ── YAML Tokenizer ──────────────────────────────────────────────────────────

type Token = { type: string; value: string; indent?: number };

function tokenizeYAML(input: string): Token[] {
  const lines = input.split('\n');
  const tokens: Token[] = [];

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    // Empty lines
    if (raw.trim() === '') {
      tokens.push({ type: 'NEWLINE', value: '' });
      continue;
    }

    // Indent level (only count leading spaces)
    let indentLevel = 0;
    for (let j = 0; j < raw.length; j++) {
      if (raw[j] === ' ') indentLevel++;
      else break;
    }

    const trimmed = raw.trimEnd();
    const content = trimmed.slice(indentLevel);

    // Comment line
    if (content.startsWith('#')) {
      tokens.push({ type: 'COMMENT', value: content, indent: indentLevel });
      continue;
    }

    // Document separator (--- or ...)
    if (content === '---' || content === '...') {
      tokens.push({ type: 'DOC_SEPARATOR', value: content, indent: indentLevel });
      continue;
    }

    // Key-value pairs and scalars
    // Quoted string
    if ((content.startsWith('"') || content.startsWith("'")) &&
        content.endsWith('"') || content.endsWith("'")) {
      const colonIdx = content.indexOf(':');
      if (colonIdx > 0 && colonIdx < content.lastIndexOf(content[content.length - 1])) {
        const key = content.slice(0, colonIdx).trim();
        const val = content.slice(colonIdx + 1).trim();
        tokens.push({ type: 'KEY_VALUE', value: `${key}: ${val}`, indent: indentLevel });
      } else {
        tokens.push({ type: 'SCALAR', value: content, indent: indentLevel });
      }
      continue;
    }

    // List item (- or *)
    if (/^\s*(-|\*)\s/.test(content)) {
      tokens.push({ type: 'LIST_ITEM', value: content, indent: indentLevel });
      continue;
    }

    // Anchors and aliases
    if (content.startsWith('&') || content.startsWith('*')) {
      tokens.push({ type: 'ANCHOR_ALIAS', value: content, indent: indentLevel });
      continue;
    }

    // Tags
    if (content.startsWith('!!') || content.startsWith('!<')) {
      tokens.push({ type: 'TAG', value: content, indent: indentLevel });
      continue;
    }

    // Flow sequences and mappings
    if (content === '[' || content === ']' || content === '{' || content === '}') {
      tokens.push({ type: 'FLOW_BRACKET', value: content, indent: indentLevel });
      continue;
    }

    // Multi-line indicators (|, >, |-, >-, |+, >+)
    if (/^[\w.-]+\s*:\s*[|>][-+]?\s*$/.test(content)) {
      const colonIdx = content.indexOf(':');
      const key = content.slice(0, colonIdx).trim();
      const indicator = content.slice(colonIdx + 1).trim();
      // Collect subsequent indented lines as block scalar
      let blockLines: string[] = [];
      li++;
      while (li < lines.length) {
        const nextLine = lines[li];
        if (nextLine.trim() === '') {
          blockLines.push('');
          li++;
          continue;
        }
        let nextIndent = 0;
        for (let j = 0; j < nextLine.length; j++) {
          if (nextLine[j] === ' ') nextIndent++;
          else break;
        }
        if (nextIndent > indentLevel) {
          blockLines.push(nextLine.slice(indentLevel + 2).trimEnd());
          li++;
        } else {
          li--;
          break;
        }
      }
      tokens.push({
        type: 'BLOCK_SCALAR',
        value: `${key}: ${indicator}`,
        indent: indentLevel,
      });
      continue;
    }

    // Key with colon (key: value or key:)
    const colonIdx = content.indexOf(':');
    if (colonIdx > 0) {
      const afterColon = content.slice(colonIdx + 1).trim();
      if (afterColon) {
        // key: value
        tokens.push({ type: 'KEY_VALUE', value: content, indent: indentLevel });
      } else {
        // key: (nested map indicator)
        tokens.push({ type: 'MAP_KEY', value: content, indent: indentLevel });
      }
      continue;
    }

    // Fallback
    tokens.push({ type: 'SCALAR', value: content, indent: indentLevel });
  }

  return tokens;
}

// ── YAML Formatter ──────────────────────────────────────────────────────────

function formatYAML(input: string, indentSize: number = 2): string {
  if (!input.trim()) return '';
  const tokens = tokenizeYAML(input);
  const indent = ' '.repeat(indentSize);
  const lines: string[] = [];
  let lastIndent = -1;
  let lastType = '';

  for (const tok of tokens) {
    if (tok.type === 'NEWLINE') {
      // Only add blank line if not consecutive
      if (lastType !== 'NEWLINE' && lastType !== 'BLOCK_SCALAR') {
        lines.push('');
      }
    } else if (tok.type === 'COMMENT') {
      const level = Math.max(0, Math.floor((tok.indent || 0) / 2));
      lines.push(indent.repeat(level) + tok.value);
    } else if (tok.type === 'DOC_SEPARATOR') {
      if (lastType !== '' && lastType !== 'NEWLINE') lines.push('');
      lines.push(tok.value);
    } else if (tok.type === 'LIST_ITEM') {
      const level = Math.max(0, Math.floor((tok.indent || 0) / 2));
      // Ensure list item starts with "- " properly spaced
      const cleaned = tok.value.replace(/^\s*(-|\*)\s*/, '$1 ').trimStart();
      const normalized = indent.repeat(level) + cleaned;
      lines.push(normalized);
    } else {
      const level = Math.max(0, Math.floor((tok.indent || 0) / 2));
      lines.push(indent.repeat(level) + tok.value);
    }
    lastIndent = tok.indent || 0;
    lastType = tok.type;
  }

  // Trim trailing blank lines
  let result = lines.join('\n');
  // Collapse 3+ newlines to 2
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trimEnd();
  if (result) result += '\n';
  return result;
}

// ── YAML Minifier ───────────────────────────────────────────────────────────

function minifyYAML(input: string): string {
  if (!input.trim()) return '';
  const tokens = tokenizeYAML(input);
  const parts: string[] = [];
  let braceDepth = 0;

  for (const tok of tokens) {
    if (tok.type === 'NEWLINE' || tok.type === 'COMMENT') continue;
    if (tok.type === 'DOC_SEPARATOR') {
      if (parts.length > 0) parts.push(' ');
      parts.push(tok.value);
      parts.push(' ');
      continue;
    }
    if (tok.type === 'FLOW_BRACKET') {
      if (tok.value === '{' || tok.value === '[') {
        braceDepth++;
        parts.push(tok.value);
      } else {
        braceDepth--;
        parts.push(tok.value);
      }
      continue;
    }
    if (tok.type === 'KEY_VALUE' || tok.type === 'SCALAR' ||
        tok.type === 'BLOCK_SCALAR' || tok.type === 'ANCHOR_ALIAS' ||
        tok.type === 'TAG' || tok.type === 'LIST_ITEM' || tok.type === 'MAP_KEY') {
      // Compact list items
      if (tok.type === 'LIST_ITEM') {
        parts.push(parts.length > 0 ? ' ' + tok.value.trim() : tok.value.trim());
      } else {
        parts.push(parts.length > 0 ? ' ' + tok.value : tok.value);
      }
    }
  }

  return parts.join('').replace(/\s+/g, ' ').trim();
}

// ── YAML Syntax Highlighting ────────────────────────────────────────────────

function highlightYAML(formatted: string): string {
  const html = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = html.split('\n');
  const result = lines.map(line => {
    if (line.trim() === '') return '';

    let hl = line;

    // Comments
    hl = hl.replace(/^(\s*)(#.*)$/, '$1<span class="text-slate-500 italic">$2</span>');

    // Document separators
    hl = hl.replace(/^(\s*)(---|\.\.\.)$/, '$1<span class="text-amber-400 font-bold">$2</span>');

    // Tags
    hl = hl.replace(/(!!\S+|!&lt;\S+&gt;)/g, '<span class="text-pink-400">$1</span>');

    // Anchors and aliases
    hl = hl.replace(/(&amp;\w+|\*\w+)/g, '<span class="text-orange-400">$1</span>');

    // Booleans and null
    hl = hl.replace(/(?<=:\s)(true|false|null|yes|no|on|off)(?=\s*$)/g,
      '<span class="text-purple-400">$1</span>');

    // Numbers
    hl = hl.replace(/(?<=:\s)(-?\d+\.?\d*(?:e[+-]?\d+)?)(?=\s*$)/gi,
      '<span class="text-amber-400">$1</span>');

    // Strings (double-quoted)
    hl = hl.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>');

    // Strings (single-quoted)
    hl = hl.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-green-400">$1</span>');

    // Keys (before colon)
    // Match a key: pattern at the current indent level
    hl = hl.replace(/^(\s*)([\w][\w.-]*)(\s*:)/gm,
      '$1<span class="text-cyan-400">$2</span>$3');

    // Flow brackets
    hl = hl.replace(/[\[\]\{\}]/g, (m) =>
      `<span class="text-slate-400">${m}</span>`);

    // List markers
    hl = hl.replace(/^(\s*)(-|\*)(\s)/gm,
      '$1<span class="text-brand-400">$2</span>$3');

    // Inline flow commas
    hl = hl.replace(/(,)(?=\s)/g, '<span class="text-slate-400">$1</span>');

    return hl;
  });

  return result.join('\n');
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { name: string; yaml: string }[] = [
  {
    name: 'GitHub Actions',
    yaml: `name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        run: npx vercel --prod --token=\${{ secrets.VERCEL_TOKEN }}
`,
  },
  {
    name: 'Docker Compose',
    yaml: `version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/app
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
`,
  },
  {
    name: 'Kubernetes Pod',
    yaml: `apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    tier: frontend
spec:
  containers:
    - name: nginx
      image: nginx:1.25-alpine
      ports:
        - containerPort: 80
          protocol: TCP
      resources:
        requests:
          memory: "64Mi"
          cpu: "250m"
        limits:
          memory: "128Mi"
          cpu: "500m"
      livenessProbe:
        httpGet:
          path: /health
          port: 80
        initialDelaySeconds: 10
        periodSeconds: 5
      env:
        - name: ENVIRONMENT
          value: production
`,
  },
  {
    name: 'OpenAPI Spec',
    yaml: `openapi: "3.1.0"
info:
  title: Task API
  version: "1.0.0"
  description: A simple task management API

servers:
  - url: https://api.example.com/v1
    description: Production server

paths:
  /tasks:
    get:
      summary: List all tasks
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, done, archived]
      responses:
        "200":
          description: Task list
          content:
            application/json:
              schema:
                type: array
                items:
                  \$ref: "#/components/schemas/Task"
    post:
      summary: Create a task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              \$ref: "#/components/schemas/NewTask"
      responses:
        "201":
          description: Created

components:
  schemas:
    Task:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        status:
          type: string
          enum: [pending, done, archived]
        created_at:
          type: string
          format: date-time
    NewTask:
      type: object
      required: [title]
      properties:
        title:
          type: string
`,
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function YAMLFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isFormatted, setIsFormatted] = useState(false);
  const [indentSize, setIndentSize] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const format = useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }
    try {
      const result = formatYAML(input, indentSize);
      setOutput(result);
      setIsFormatted(true);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Formatting error');
      setOutput('');
    }
  }, [input, indentSize]);

  const minify = useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }
    try {
      const result = minifyYAML(input);
      setOutput(result);
      setIsFormatted(true);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Minification error');
      setOutput('');
    }
  }, [input]);

  const clearAll = useCallback(() => {
    setInput('');
    setOutput('');
    setIsFormatted(false);
    setError(null);
  }, []);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      toast.success('Copied to clipboard');
    });
  }, [output]);

  const loadPreset = useCallback((yaml: string) => {
    setInput(yaml);
    setOutput('');
    setIsFormatted(false);
    setError(null);
  }, []);

  return (
    <ToolLayout
      title="YAML Formatter"
      description="Format, beautify, and minify YAML with syntax highlighting. Perfect for config files, CI pipelines, Kubernetes manifests, Docker Compose, and OpenAPI specs — all client-side."
    >
      <div className="space-y-6">
        {/* ── Controls / Presets ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={format}
              disabled={!input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              Format
            </button>
            <button
              onClick={minify}
              disabled={!input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              Minify
            </button>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Indent className="w-4 h-4 text-slate-400" />
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </div>
        </div>

        {/* ── Presets ── */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.yaml)}
              className="px-3 py-1.5 text-xs rounded-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/50 hover:border-slate-500 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── Input / Output ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
              Input YAML
            </label>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setOutput('');
                setIsFormatted(false);
                setError(null);
              }}
              placeholder={`# Paste your YAML here...\n\nname: My Project\nversion: "1.0.0"\ndependencies:\n  - react: ^19.0\n  - next: ^15.0\ndevDependencies:\n  - typescript: ^5.5`}
              className="w-full h-[420px] bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 text-sm font-mono text-slate-200 resize-none focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 placeholder:text-slate-600"
              spellCheck={false}
            />
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">
                {isFormatted ? 'Formatted YAML' : 'Output'}
              </label>
              {output && (
                <button
                  onClick={copyOutput}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              )}
            </div>
            <div className="relative">
              {output ? (
                <pre
                  className="w-full h-[420px] bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 text-sm font-mono text-slate-200 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: highlightYAML(output) }}
                />
              ) : (
                <div className="absolute inset-0 h-[420px] bg-slate-900/20 border border-slate-700/30 rounded-lg flex items-center justify-center">
                  <p className="text-slate-500 text-sm">
                    Formatted output will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        {output && (
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="font-mono">Input: {input.length.toLocaleString()} chars</span>
            <span className="font-mono">Output: {output.length.toLocaleString()} chars</span>
            {input.length > 0 && (
              <span className="font-mono">
                Ratio: {((output.length / input.length) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
