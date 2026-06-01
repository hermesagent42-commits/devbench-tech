'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, ArrowRightLeft, FileJson, FileCode, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

type Mode = 'toml-to-json' | 'json-to-toml';

interface ConversionResult {
  output: string;
  error: string | null;
}

// ── TOML Parser (zero-dependency, pure JavaScript) ─────────────────────────

function setDeep(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown,
): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = path[path.length - 1];

  // If it's an array of tables, push into existing array or create one
  if (Array.isArray(current[lastKey])) {
    (current[lastKey] as unknown[]).push(value);
  } else if (current[lastKey] !== undefined) {
    // Already has a value — convert to array if it was scalar or first table
    current[lastKey] = [current[lastKey], value];
  } else {
    current[lastKey] = value;
  }
}

function parseTOML(input: string): unknown {
  const lines = input.split(/\r?\n/);
  const root: Record<string, unknown> = {};
  let currentTablePath: string[] = [];
  let isArrayOfTables = false;

  // Merge multi-line strings into single lines
  let mergedLines: string[] = [];
  let inMultiLineBasic = false;
  let multiLineDelim = '';
  let multiLineKey = '';
  let multiLineBuf: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (inMultiLineBasic) {
      if (trimmed.endsWith(multiLineDelim)) {
        multiLineBuf.push(trimmed.slice(0, -multiLineDelim.length));
        mergedLines.push(multiLineKey + ' = """' + multiLineBuf.join('\n') + '"""');
        inMultiLineBasic = false;
        multiLineBuf = [];
        multiLineKey = '';
        multiLineDelim = '';
      } else {
        multiLineBuf.push(line);
      }
      continue;
    }

    if (!trimmed.startsWith('#') && !trimmed.startsWith('[') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const valuePart = trimmed.slice(eqIdx + 1).trim();
      const isMulti = valuePart.startsWith('"""') && !(valuePart.endsWith('"""') && valuePart.length > 3);
      const isMultiLit = valuePart.startsWith("'''") && !(valuePart.endsWith("'''") && valuePart.length > 3);

      if (isMulti || isMultiLit) {
        const delim = isMulti ? '"""' : "'''";
        multiLineKey = trimmed.slice(0, eqIdx).trim();
        multiLineDelim = delim;
        inMultiLineBasic = true;
        const afterDelim = valuePart.slice(delim.length);
        if (afterDelim && !afterDelim.endsWith(delim)) {
          multiLineBuf.push(afterDelim);
        }
        continue;
      }
    }

    mergedLines.push(line);
  }

  // Main parse loop
  for (const line of mergedLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Table header: [table] or [table.sub]
    if (trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.startsWith('[[')) {
      const tableName = trimmed.slice(1, -1).trim();
      currentTablePath = tableName.includes('.')
        ? tableName.split('.').map((s) => s.trim())
        : [tableName];

      // Ensure path exists in root
      let cursor = root;
      for (const key of currentTablePath) {
        if (!(key in cursor) || typeof cursor[key] !== 'object' || cursor[key] === null || Array.isArray(cursor[key])) {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      isArrayOfTables = false;
      continue;
    }

    // Array of tables: [[array]]
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      const tableName = trimmed.slice(2, -2).trim();
      currentTablePath = tableName.includes('.')
        ? tableName.split('.').map((s) => s.trim())
        : [tableName];

      // Create a fresh table and push it via setDeep
      const newTable: Record<string, unknown> = {};
      setDeep(root, currentTablePath, newTable);
      isArrayOfTables = true;
      continue;
    }

    // Key-value pair
    if (trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const keyPart = trimmed.slice(0, eqIdx).trim();
      const valuePart = trimmed.slice(eqIdx + 1).trim();
      const value = parseTOMLValue(valuePart);

      // Find the target table
      let target: Record<string, unknown> = root;
      for (const key of currentTablePath) {
        if (isArrayOfTables && key === currentTablePath[currentTablePath.length - 1]) {
          // Array of tables: write into the last element of the array
          const arr = target[key] as Record<string, unknown>[];
          target = arr[arr.length - 1];
        } else {
          if (!(key in target)) target[key] = {};
          target = target[key] as Record<string, unknown>;
        }
      }
      target[keyPart] = value;
    }
  }

  return root;
}

function parseTOMLValue(valueStr: string): unknown {
  if (!valueStr) return '';

  // Boolean
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;

  // Integer with underscores
  if (/^[+-]?\d[\d_]*$/.test(valueStr)) {
    return parseInt(valueStr.replace(/_/g, ''), 10);
  }

  // Hex/octal/binary
  if (/^0x[0-9A-Fa-f_]+$/.test(valueStr)) {
    return parseInt(valueStr.replace(/_/g, ''), 16);
  }
  if (/^0o[0-7_]+$/.test(valueStr)) {
    return parseInt(valueStr.replace(/_/g, '').slice(2), 8);
  }
  if (/^0b[01_]+$/.test(valueStr)) {
    return parseInt(valueStr.replace(/_/g, '').slice(2), 2);
  }

  // Float (with optional underscores)
  if (/^[+-]?\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d[\d_]*)?$/.test(valueStr) && valueStr.includes('.')) {
    return parseFloat(valueStr.replace(/_/g, ''));
  }
  if (/^[+-]?(inf|nan)$/i.test(valueStr)) {
    return valueStr.toLowerCase() === 'inf' || valueStr.toLowerCase() === '+inf'
      ? Infinity
      : valueStr.toLowerCase() === '-inf'
        ? -Infinity
        : NaN;
  }

  // Inline table
  if (valueStr.startsWith('{') && valueStr.endsWith('}')) {
    const inner = valueStr.slice(1, -1).trim();
    if (!inner) return {};
    const obj: Record<string, unknown> = {};
    const pairs = splitTopLevel(inner, ',');
    for (const pair of pairs) {
      const kvIdx = pair.indexOf('=');
      if (kvIdx === -1) continue;
      const k = pair.slice(0, kvIdx).trim();
      const v = pair.slice(kvIdx + 1).trim();
      obj[k] = parseTOMLValue(v);
    }
    return obj;
  }

  // Array
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    const inner = valueStr.slice(1, -1).trim();
    if (!inner) return [];
    const items = splitTopLevel(inner, ',');
    return items.map((item) => parseTOMLValue(item.trim()));
  }

  // Multi-line basic string
  if (valueStr.startsWith('"""') && valueStr.endsWith('"""')) {
    let str = valueStr.slice(3, -3);
    // Remove leading newline if present
    if (str.startsWith('\n')) str = str.slice(1);
    // Unescape
    return str
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');
  }

  // Multi-line literal string
  if (valueStr.startsWith("'''") && valueStr.endsWith("'''")) {
    let str = valueStr.slice(3, -3);
    if (str.startsWith('\n')) str = str.slice(1);
    return str;
  }

  // Basic string
  if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
    return valueStr
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  // Literal string
  if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
    return valueStr.slice(1, -1);
  }

  // Offset date-time / local date-time / local date / local time
  // These are complex; for a pure parser, treat as strings if they look like dates
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(valueStr)) {
    return valueStr;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(valueStr)) {
    return valueStr;
  }
  if (/^\d{2}:\d{2}:\d{2}/.test(valueStr)) {
    return valueStr;
  }

  return valueStr;
}

// Split comma-separated items respecting nested brackets and strings
function splitTopLevel(str: string, separator: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      current += ch;
      if (ch === '\\') {
        i++;
        if (i < str.length) current += str[i];
      } else if (ch === stringChar) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '{' || ch === '[') {
      depth++;
      current += ch;
    } else if (ch === '}' || ch === ']') {
      depth--;
      current += ch;
    } else if (ch === separator && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

// ── JSON → TOML serializer ─────────────────────────────────────────────────

function toTOML(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);

  if (obj === null || obj === undefined) return '""';

  if (typeof obj === 'boolean') return obj ? 'true' : 'false';

  if (typeof obj === 'number') {
    if (!isFinite(obj)) {
      return obj > 0 ? 'inf' : obj < 0 ? '-inf' : 'nan';
    }
    return String(obj);
  }

  if (typeof obj === 'string') {
    return tomlString(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';

    // Check if array contains objects (array of tables pattern)
    if (obj.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))) {
      const arr = obj as Record<string, unknown>[];
      // Check if all objects have the same keys
      const allKeys = new Set<string>();
      arr.forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));

      let result = '';
      for (const item of arr) {
        result += '\n[[' + 'items' + ']]\n';
        for (const [key, value] of Object.entries(item)) {
          result += key + ' = ' + toTOML(value) + '\n';
        }
      }
      return result.trim();
    }

    // Simple array
    const items = obj.map((item) => toTOML(item));
    // Check line length — inline if short, multi-line if long
    const joined = items.join(', ');
    if (joined.length < 80 && !joined.includes('\n')) {
      return '[' + joined + ']';
    }
    return '[\n' + pad + '  ' + items.join(',\n' + pad + '  ') + ',\n' + pad + ']';
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';

    const lines: string[] = [];
    const subTables: { key: string; value: Record<string, unknown> }[] = [];

    for (const [key, value] of entries) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        subTables.push({ key, value: value as Record<string, unknown> });
      } else {
        lines.push(key + ' = ' + toTOML(value));
      }
    }

    let result = lines.join('\n');

    for (const { key, value } of subTables) {
      result += '\n\n[' + key + ']\n';
      result += toTOML(value);
    }

    return result;
  }

  return tomlString(String(obj));
}

function tomlString(str: string): string {
  // Check if basic string works
  const needsEscape = /[\0-\x08\x0B\x0C\x0E-\x1F\x7F"\\]/.test(str);
  const hasNewlines = str.includes('\n');

  if (hasNewlines) {
    // Multi-line basic string
    return '"""\n' + str.replace(/"""/g, '""\\"') + '\n"""';
  }

  if (needsEscape) {
    return '"' + str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, (ch) =>
        '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'),
      ) + '"';
  }

  // Use literal string if possible (no apostrophes)
  if (!str.includes("'") && !str.includes('\\')) {
    return "'" + str + "'";
  }

  // Basic string
  return '"' + str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r') + '"';
}

// ── Samples ────────────────────────────────────────────────────────────────

const TOML_SAMPLE = `# My Project Configuration
title = "My Awesome App"
version = "1.2.3"
description = "A sample TOML config for demonstration"
debug = true
port = 8080

[database]
host = "localhost"
port = 5432
enable_ssl = false
max_connections = 100

[database.credentials]
username = "admin"
password = "s3cret!"

[server]
host = "0.0.0.0"

[[server.endpoints]]
path = "/api/v1"
method = "GET"
rate_limit = 1000

[[server.endpoints]]
path = "/api/v2"
method = "POST"
rate_limit = 500

[features]
authentication = true
logging = true
caching = false

[features.restrictions]
allowed_origins = ["localhost", "example.com"]
max_upload_size = 10485760`;

// ── Component ──────────────────────────────────────────────────────────────

export default function TomlJsonConverterPage() {
  const [mode, setMode] = useState<Mode>('toml-to-json');
  const [input, setInput] = useState(TOML_SAMPLE);
  const [indentSize, setIndentSize] = useState(2);

  const result = useMemo((): ConversionResult => {
    if (!input.trim()) return { output: '', error: null };

    try {
      if (mode === 'toml-to-json') {
        const parsed = parseTOML(input);
        return { output: JSON.stringify(parsed, null, indentSize), error: null };
      } else {
        const parsed = JSON.parse(input);
        const toml = toTOML(parsed);
        return { output: toml, error: null };
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
    const ext = mode === 'toml-to-json' ? 'json' : 'toml';
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
    setMode(mode === 'toml-to-json' ? 'json-to-toml' : 'toml-to-json');
  }, [result.output, result.error, mode]);

  const handleLoadSample = useCallback(() => {
    if (mode === 'toml-to-json') {
      setInput(TOML_SAMPLE);
    } else {
      const parsed = parseTOML(TOML_SAMPLE);
      setInput(JSON.stringify(parsed, null, 2));
    }
    toast.success('Sample loaded');
  }, [mode]);

  const outputLineCount = result.output ? result.output.split('\n').length : 0;
  const inputLineCount = input ? input.split('\n').length : 0;

  return (
    <ToolLayout
      title="TOML ↔ JSON Converter"
      description="Convert between TOML and JSON formats. Perfect for Cargo.toml, pyproject.toml, and other config files — 100% client-side, zero dependencies."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Mode Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setMode('toml-to-json')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'toml-to-json'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TOML → JSON
            </button>
            <button
              onClick={() => setMode('json-to-toml')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'json-to-toml'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JSON → TOML
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
              <option value={0}>0 (minified JSON)</option>
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
              {mode === 'toml-to-json' ? (
                <><FileCode className="w-4 h-4 text-green-400" /> TOML Input</>
              ) : (
                <><FileJson className="w-4 h-4 text-blue-400" /> JSON Input</>
              )}
            </label>
            <span className="text-xs text-slate-500">{inputLineCount} lines</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'toml-to-json' ? 'Paste TOML here...' : 'Paste JSON here...'}
            className="flex-1 min-h-[420px] w-full bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-200 resize-y focus:outline-none focus:border-brand-500/50 placeholder:text-slate-600"
            spellCheck={false}
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              {mode === 'toml-to-json' ? (
                <><FileJson className="w-4 h-4 text-blue-400" /> JSON Output</>
              ) : (
                <><FileCode className="w-4 h-4 text-green-400" /> TOML Output</>
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
          <li>• TOML is the configuration format used by <strong>Cargo.toml</strong> (Rust), <strong>pyproject.toml</strong> (Python), <strong>go.mod</strong> (alternative), and many more.</li>
          <li>• <strong>Swap</strong> converts the output back to input and flips the direction — great for round-trip testing.</li>
          <li>• The TOML parser supports tables <code>[table]</code>, array of tables <code>[[array]]</code>, inline tables, arrays, all primitive types, and comments.</li>
          <li>• JSON → TOML conversion uses sub-tables (<code>[section]</code>) for nested objects.</li>
          <li>• Use <strong>0 indent</strong> for minified JSON output. JSON formatting only affects JSON output, not TOML.</li>
          <li>• All conversion happens <strong>entirely in your browser</strong> — no data is sent anywhere.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}
