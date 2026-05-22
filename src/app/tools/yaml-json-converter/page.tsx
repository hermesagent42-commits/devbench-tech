'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, ArrowRightLeft, FileJson, FileCode, Check, AlertTriangle, Indent, Outdent } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Mode = 'yaml-to-json' | 'json-to-yaml';

interface ConversionResult {
  output: string;
  error: string | null;
}

// ── YAML Parser (zero-dependency, supports common YAML features) ────────────

interface YAMLLine {
  indent: number;
  key: string;
  value: string;
  isListItem: boolean;
  raw: string;
}

function parseYAML(input: string): unknown {
  const lines = input.split(/\r?\n/);
  const parsed: YAMLLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    // List item: starts with "- "
    if (/^-\s/.test(trimmed)) {
      const value = trimmed.replace(/^-\s*/, '');
      const colonIdx = value.indexOf(':');
      if (colonIdx !== -1 && !/^\d/.test(value.substring(0, colonIdx).trim())) {
        // It's a key: value under a list item
        const key = value.substring(0, colonIdx).trim();
        const val = value.substring(colonIdx + 1).trim();
        parsed.push({ indent: indent + 2, key, value: val, isListItem: false, raw: line });
      } else {
        // Simple list value
        parsed.push({ indent, key: '', value, isListItem: true, raw: line });
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim();
    parsed.push({ indent, key, value, isListItem: false, raw: line });
  }

  return buildFromLines(parsed, 0, 0);
}

function buildFromLines(lines: YAMLLine[], startIdx: number, currentIndent: number): { result: unknown; nextIdx: number } {
  // Check if this is a list
  if (startIdx < lines.length && lines[startIdx].isListItem) {
    const arr: unknown[] = [];
    let i = startIdx;
    while (i < lines.length) {
      const line = lines[i];
      if (line.indent < currentIndent) break;
      if (!line.isListItem && line.indent <= currentIndent) break;

      if (line.isListItem) {
        // Check if next lines are indented children (object in list)
        if (i + 1 < lines.length && lines[i + 1].indent > line.indent && !lines[i + 1].isListItem) {
          const child = buildFromLines(lines, i + 1, line.indent + 2);
          arr.push(child.result);
          i = child.nextIdx;
        } else {
          arr.push(parseValue(line.value));
          i++;
        }
      } else if (line.indent > currentIndent) {
        i++;
      } else {
        break;
      }
    }
    return { result: arr, nextIdx: i };
  }

  // Object
  const obj: Record<string, unknown> = {};
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < currentIndent) break;
    if (line.isListItem && line.indent <= currentIndent) break;
    if (line.indent > currentIndent) { i++; continue; }

    if (line.value === '' || line.value === '|' || line.value === '>') {
      // Check if next line is a block scalar
      if (i + 1 < lines.length && lines[i + 1].indent > line.indent) {
        // Nested object
        const child = buildFromLines(lines, i + 1, line.indent + 2);
        obj[line.key] = child.result;
        i = child.nextIdx;
      } else if (line.value === '') {
        // Empty value — might be a nested object without children in this block
        // Check for multiline literal/block
        if (i + 1 < lines.length && lines[i + 1].indent > line.indent && lines[i + 1].isListItem) {
          const child = buildFromLines(lines, i + 1, line.indent + 2);
          obj[line.key] = child.result;
          i = child.nextIdx;
        } else {
          obj[line.key] = null;
          i++;
        }
      } else {
        obj[line.key] = null;
        i++;
      }
    } else {
      obj[line.key] = parseValue(line.value);
      i++;
    }
  }

  return { result: obj, nextIdx: i };
}

function parseValue(val: string): unknown {
  // Boolean
  if (/^(true|false)$/i.test(val)) return val.toLowerCase() === 'true';
  // Null
  if (/^(null|~|)$/i.test(val)) return null;
  // Float
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  // Integer
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  // Quoted string
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

// ── JSON → YAML serializer ─────────────────────────────────────────────────

function toYAML(obj: unknown, indent = 0, indentSize = 2): string {
  const pad = ' '.repeat(indent);
  const childPad = ' '.repeat(indent + indentSize);

  if (obj === null || obj === undefined) return pad + 'null';

  if (Array.isArray(obj)) {
    if (obj.length === 0) return pad + '[]';
    return obj.map((item) => {
      if (typeof item === 'object' && item !== null) {
        const nested = toYAML(item, indent + indentSize, indentSize);
        // If the nested object starts with spaces at our level, prefix with "- "
        const lines = nested.split('\n');
        lines[0] = pad + '- ' + lines[0].trimStart();
        return lines.join('\n');
      }
      return pad + '- ' + formatYamlValue(item);
    }).join('\n');
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return pad + '{}';
    return keys.map((key) => {
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === 'object' && val !== null) {
        return pad + key + ':\n' + toYAML(val, indent + indentSize, indentSize);
      }
      return pad + key + ': ' + formatYamlValue(val);
    }).join('\n');
  }

  return pad + formatYamlValue(obj);
}

function formatYamlValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  const str = String(val);
  // Quote strings that need it
  if (/[:#&*!|>%@`\{\}\[\],]/.test(str) || str.includes('\n') || str.startsWith(' ') || str.endsWith(' ') || /^(true|false|null|yes|no|on|off)$/i.test(str)) {
    return '"' + str.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  if (str === '') return "''";
  return str;
}

// ── Component ──────────────────────────────────────────────────────────────

const SAMPLE_YAML = `name: My App
version: 1.0.0
description: A sample configuration
debug: true
port: 3000
database:
  host: localhost
  port: 5432
  credentials:
    username: admin
    password: secret
features:
  - authentication
  - logging
  - caching
servers:
  - name: web-01
    ip: 10.0.0.1
    region: us-east
  - name: web-02
    ip: 10.0.0.2
    region: us-west`;

export default function YamlJsonConverterPage() {
  const [mode, setMode] = useState<Mode>('yaml-to-json');
  const [input, setInput] = useState(SAMPLE_YAML);
  const [indentSize, setIndentSize] = useState(2);

  const result = useMemo((): ConversionResult => {
    if (!input.trim()) return { output: '', error: null };

    try {
      if (mode === 'yaml-to-json') {
        const parsed = parseYAML(input);
        return { output: JSON.stringify(parsed, null, indentSize), error: null };
      } else {
        const parsed = JSON.parse(input);
        const yaml = toYAML(parsed, 0, indentSize);
        return { output: yaml, error: null };
      }
    } catch (err) {
      return { output: '', error: (err as Error).message };
    }
  }, [input, mode, indentSize]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result.output);
    toast.success('Copied to clipboard!');
  }, [result.output]);

  const handleDownload = useCallback(() => {
    const ext = mode === 'yaml-to-json' ? 'json' : 'yaml';
    const blob = new Blob([result.output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as output.${ext}`);
  }, [result.output, mode]);

  const handleSwap = useCallback(() => {
    if (result.output && !result.error) {
      setInput(result.output);
    }
    setMode(mode === 'yaml-to-json' ? 'json-to-yaml' : 'yaml-to-json');
  }, [result.output, result.error, mode]);

  const handleLoadSample = useCallback(() => {
    if (mode === 'yaml-to-json') {
      setInput(SAMPLE_YAML);
    } else {
      setInput(JSON.stringify({
        name: 'My App',
        version: '1.0.0',
        debug: true,
        port: 3000,
        database: {
          host: 'localhost',
          port: 5432,
          credentials: { username: 'admin', password: 'secret' }
        },
        features: ['authentication', 'logging', 'caching'],
        servers: [
          { name: 'web-01', ip: '10.0.0.1', region: 'us-east' },
          { name: 'web-02', ip: '10.0.0.2', region: 'us-west' }
        ]
      }, null, 2));
    }
    toast.success('Sample loaded');
  }, [mode]);

  const handleMinifyJson = useCallback(() => {
    if (mode === 'yaml-to-json' && result.output) {
      try {
        const parsed = JSON.parse(result.output);
        setInput(JSON.stringify(parsed));
        toast.success('Minified JSON loaded into input');
      } catch {
        toast.error('Could not minify');
      }
    }
  }, [mode, result.output]);

  const outputLineCount = result.output ? result.output.split('\n').length : 0;
  const inputLineCount = input ? input.split('\n').length : 0;

  return (
    <ToolLayout
      title="YAML ↔ JSON Converter"
      description="Convert between YAML and JSON formats instantly. Perfect for config files, API payloads, and data serialization — 100% client-side."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Mode Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setMode('yaml-to-json')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'yaml-to-json'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              YAML → JSON
            </button>
            <button
              onClick={() => setMode('json-to-yaml')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'json-to-yaml'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JSON → YAML
            </button>
          </div>

          {/* Indent Size */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Indent:</span>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={0}>0 (minified)</option>
            </select>
          </div>

          <div className="flex-1" />

          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 text-sm rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={handleSwap}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Swap
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              {mode === 'yaml-to-json' ? (
                <><FileCode className="w-4 h-4 text-orange-400" /> YAML Input</>
              ) : (
                <><FileJson className="w-4 h-4 text-blue-400" /> JSON Input</>
              )}
            </label>
            <span className="text-xs text-slate-500">{inputLineCount} lines</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'yaml-to-json' ? 'Paste YAML here...' : 'Paste JSON here...'}
            className="flex-1 min-h-[420px] w-full bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 resize-y focus:outline-none focus:border-brand-500/50 placeholder:text-slate-600"
            spellCheck={false}
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              {mode === 'yaml-to-json' ? (
                <><FileJson className="w-4 h-4 text-blue-400" /> JSON Output</>
              ) : (
                <><FileCode className="w-4 h-4 text-orange-400" /> YAML Output</>
              )}
            </label>
            <span className="text-xs text-slate-500">{outputLineCount} lines</span>
          </div>

          {result.error ? (
            <div className="flex-1 min-h-[420px] w-full bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-red-300 text-sm font-medium">Conversion Error</p>
              <p className="text-red-400/80 text-xs text-center max-w-xs font-mono">{result.error}</p>
            </div>
          ) : (
            <div className="relative flex-1 min-h-[420px]">
              <pre className="h-full w-full bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-auto whitespace-pre-wrap break-words">
                <code>{result.output || <span className="text-slate-600 italic">Output will appear here...</span>}</code>
              </pre>

              {result.output && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-md bg-slate-800/90 text-slate-400 hover:text-brand-400 hover:bg-slate-700/90 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-2 rounded-md bg-slate-800/90 text-slate-400 hover:text-brand-400 hover:bg-slate-700/90 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 p-4 bg-surface-light border border-slate-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">💡 Tips</h3>
        <ul className="text-xs text-slate-400 space-y-1.5">
          <li>• <strong>Swap</strong> converts the output back to input and flips the direction — great for round-trip testing.</li>
          <li>• The YAML parser supports nested objects, arrays, booleans, numbers, nulls, and quoted strings.</li>
          <li>• Use <strong>0 indent</strong> in JSON mode to minify output. In YAML mode it produces compact output.</li>
          <li>• YAML-to-JSON supports comments (lines starting with #) — they are stripped during conversion.</li>
          <li>• All conversion happens <strong>entirely in your browser</strong> — no data is sent anywhere.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
