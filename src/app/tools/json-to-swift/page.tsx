'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

type SwiftType = 'String' | 'Int' | 'Double' | 'Bool' | 'Any' | 'URL';

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

function looksLikeURL(value: string): boolean {
  return /^https?:\/\/.+/.test(value);
}

function inferSwiftType(value: unknown): SwiftType {
  if (value === null) return 'Any';
  if (typeof value === 'boolean') return 'Bool';
  if (typeof value === 'number') return isFloat(value) ? 'Double' : 'Int';
  if (typeof value === 'string') {
    if (looksLikeURL(value)) return 'URL';
    return 'String';
  }
  return 'Any';
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Root';
}

function camelCase(str: string): string {
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

// ── Keyword handling ──────────────────────────────────────────────────────

const SWIFT_KEYWORDS = new Set([
  'as', 'associatedtype', 'break', 'case', 'catch', 'class', 'continue',
  'default', 'defer', 'deinit', 'do', 'else', 'enum', 'extension',
  'fallthrough', 'false', 'fileprivate', 'for', 'func', 'guard', 'if',
  'import', 'in', 'init', 'inout', 'internal', 'is', 'let', 'nil',
  'open', 'operator', 'precedencegroup', 'private', 'protocol', 'public',
  'repeat', 'rethrows', 'return', 'self', 'Self', 'static', 'struct',
  'subscript', 'super', 'switch', 'throw', 'throws', 'true', 'try',
  'typealias', 'var', 'where', 'while', 'actor', 'async', 'await',
  'nonisolated', 'isolated', '__consuming', '__owned', 'any', 'some',
  'Type', 'Protocol',
]);

function sanitizeFieldName(name: string): string {
  let result = camelCase(name);
  if (/^\d/.test(result)) result = '_' + result;
  if (!result || !/^[a-zA-Z_]/.test(result)) result = 'field';
  if (SWIFT_KEYWORDS.has(result)) result = '`' + result + '`';
  return result;
}

function sanitizeTypeName(name: string): string {
  let result = pascalCase(name);
  if (/^\d/.test(result)) result = 'T' + result;
  if (SWIFT_KEYWORDS.has(result) || SWIFT_KEYWORDS.has(result.toLowerCase())) {
    result = result + 'Type';
  }
  return result || 'Root';
}

// ── Struct generation ─────────────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  useCodingKeys: boolean;
  useOptional: boolean;
  useLet: boolean;
  useURLs: boolean;
  indentSpaces: number;
  includeSampleInit: boolean;
}

interface StructDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  jsonKey: string;
  propName: string;
  swiftType: string;
  isOptional: boolean;
  needsCodingKey: boolean;
}

const DEFAULT_OPTIONS: Options = {
  rootTypeName: 'Root',
  useCodingKeys: true,
  useOptional: true,
  useLet: true,
  useURLs: true,
  indentSpaces: 4,
  includeSampleInit: false,
};

function buildStructs(
  value: unknown,
  typeName: string,
  options: Options,
  allStructs: StructDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null) return 'Any';
  if (typeof value !== 'object') return inferSwiftType(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[Any]';
    const first = value[0];

    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      const nestedName = sanitizeTypeName(typeName.replace(/s$/, '') + 'Item');
      const existingName = seen.get(first);
      if (existingName) return `[${existingName}]`;
      seen.set(first, nestedName);
      const innerType = buildStructs(first, nestedName, options, allStructs, seen);
      return `[${innerType}]`;
    }

    if (Array.isArray(first)) {
      const innerName = sanitizeTypeName(typeName + 'Item');
      const inner = buildStructs(first, innerName, options, allStructs, seen);
      return `[[${inner}]]`;
    }

    const elemType = inferSwiftType(first);
    return `[${elemType}]`;
  }

  // Object
  const existingName = seen.get(value);
  if (existingName) return existingName;
  seen.set(value, typeName);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];

  for (const [key, val] of Object.entries(obj)) {
    const propName = sanitizeFieldName(key);
    let swiftType: string;

    if (val === null) {
      swiftType = 'Any';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        swiftType = '[Any]';
      } else {
        const first = val[0];
        if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
          const nestedName = sanitizeTypeName(key);
          const existing = seen.get(first);
          if (existing) {
            swiftType = `[${existing}]`;
          } else {
            seen.set(first, nestedName);
            const innerType = buildStructs(first, nestedName, options, allStructs, seen);
            swiftType = `[${innerType}]`;
          }
        } else if (Array.isArray(first)) {
          const innerName = sanitizeTypeName(key + 'Item');
          const inner = buildStructs(first, innerName, options, allStructs, seen);
          swiftType = `[[${inner}]]`;
        } else {
          swiftType = `[${inferSwiftType(first)}]`;
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = sanitizeTypeName(key);
      const existing = seen.get(val);
      if (existing) {
        swiftType = existing;
      } else {
        swiftType = buildStructs(val, nestedName, options, allStructs, seen);
      }
    } else {
      swiftType = inferSwiftType(val);
    }

    const needsCodingKey = key !== propName && !propName.startsWith('`');
    const isOptional = options.useOptional && val === null;

    fields.push({
      jsonKey: key,
      propName,
      swiftType: isOptional ? `${swiftType}?` : swiftType,
      isOptional,
      needsCodingKey,
    });
  }

  // Merge with existing struct if same name
  const existing = allStructs.find((s) => s.name === typeName);
  if (existing) {
    for (const f of fields) {
      if (!existing.fields.find((ef) => ef.jsonKey === f.jsonKey)) {
        existing.fields.push(f);
      }
    }
  } else {
    allStructs.push({ name: typeName, fields });
  }

  return typeName;
}

// ── Code generation ───────────────────────────────────────────────────────

function formatSwiftStructs(allStructs: StructDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const lines: string[] = [];
  const keyword = options.useLet ? 'let' : 'var';

  if (options.useURLs) {
    lines.push('import Foundation');
    lines.push('');
  }

  for (let i = 0; i < allStructs.length; i++) {
    const s = allStructs[i];
    if (s.fields.length === 0) continue;

    const hasCodingKeys = options.useCodingKeys && s.fields.some((f) => f.needsCodingKey);

    lines.push(`struct ${s.name}: Codable {`);

    for (const f of s.fields) {
      lines.push(`${indent}${keyword} ${f.propName}: ${f.swiftType}`);
    }

    if (hasCodingKeys) {
      lines.push('');
      lines.push(`${indent}enum CodingKeys: String, CodingKey {`);
      for (const f of s.fields) {
        if (f.needsCodingKey) {
          lines.push(`${indent}${indent}case ${f.propName} = "${f.jsonKey}"`);
        }
      }
      lines.push(`${indent}}`);
    }

    lines.push('}');
    if (i < allStructs.length - 1) lines.push('');
  }

  return lines.join('\n');
}

function formatUsageExample(input: string, rootName: string, options: Options): string {
  const lines: string[] = [];
  lines.push('import Foundation');
  lines.push('');
  lines.push(`let json = """`);
  lines.push(input);
  lines.push('"""');
  lines.push('');
  lines.push('do {');
  lines.push(`${' '.repeat(options.indentSpaces)}let decoder = JSONDecoder()`);
  lines.push(`${' '.repeat(options.indentSpaces)}let data = json.data(using: .utf8)!`);
  lines.push(`${' '.repeat(options.indentSpaces)}let result = try decoder.decode(${rootName}.self, from: data)`);
  lines.push(`${' '.repeat(options.indentSpaces)}print(result)`);
  lines.push('} catch {');
  lines.push(`${' '.repeat(options.indentSpaces)}print("Decoding error: \\(error)")`);
  lines.push('}');
  return lines.join('\n');
}

// ── Sample data ───────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": "usr_2aBc9XyZ",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "isActive": true,
  "createdAt": "2026-05-30T12:00:00Z",
  "score": 97.5,
  "avatar_url": "https://cdn.example.com/avatars/jane.jpg",
  "tags": ["swift", "ios", "swiftui"],
  "role": "admin",
  "profile": {
    "bio": "Full-stack developer",
    "website": "https://jane.dev",
    "preferences": {
      "theme": "dark",
      "emailNotifications": true,
      "language": "en"
    }
  },
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with SwiftUI",
      "published": true,
      "views": 1520,
      "metadata": {
        "tags": ["swift", "swiftui"],
        "rating": 4.8
      }
    },
    {
      "id": 2,
      "title": "Advanced Codable Patterns",
      "published": false,
      "views": 890,
      "metadata": {
        "tags": ["swift", "codable"],
        "rating": 4.5
      }
    }
  ],
  "metadata": null,
  "emptyArray": []
}`;

// ── Component ─────────────────────────────────────────────────────────────

export default function JSONToSwiftPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [activeTab, setActiveTab] = useState<'structs' | 'usage'>('structs');

  const { structs, output, error, usageOutput } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const allStructs: StructDef[] = [];
      const rootName = sanitizeTypeName(options.rootTypeName || 'Root');
      buildStructs(parsed, rootName, options, allStructs);

      const swiftOutput = formatSwiftStructs(allStructs, options);
      const usage = formatUsageExample(input, rootName, options);

      return {
        structs: allStructs,
        output: swiftOutput,
        error: null as string | null,
        usageOutput: usage,
      };
    } catch (e) {
      return {
        structs: [] as StructDef[],
        output: '',
        error: (e as Error).message,
        usageOutput: '',
      };
    }
  }, [input, options]);

  const structCount = structs.filter((s) => s.fields.length > 0).length;

  const handleCopy = useCallback(async () => {
    const text = activeTab === 'structs' ? output : usageOutput;
    if (!text) {
      toast.error('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [activeTab, output, usageOutput]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  const handleLoadSample = useCallback(() => setInput(SAMPLE_JSON), []);

  return (
    <ToolLayout
      title="JSON to Swift Codable"
      description="Convert JSON data into idiomatic Swift structs with Codable conformance — nested types, CodingKeys for snake_case mapping, Optional handling, and ready-to-use decoder code. 100% client-side."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Root</label>
            <input
              type="text"
              value={options.rootTypeName}
              onChange={(e) =>
                setOptions((o) => ({ ...o, rootTypeName: e.target.value || 'Root' }))
              }
              className="w-24 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 font-mono"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useCodingKeys}
              onChange={(e) => setOptions((o) => ({ ...o, useCodingKeys: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            CodingKeys
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useOptional}
              onChange={(e) => setOptions((o) => ({ ...o, useOptional: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            nullable → Optional
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useLet}
              onChange={(e) => setOptions((o) => ({ ...o, useLet: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            let (vs var)
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useURLs}
              onChange={(e) => setOptions((o) => ({ ...o, useURLs: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            URLs → URL type
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-mono">
              {error ? (
                <span className="text-red-400">Invalid JSON</span>
              ) : (
                <span className="text-green-400">
                  {structCount} struct{structCount !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            <button
              onClick={handleReset}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Braces className="w-4 h-4" />
              JSON Input
            </label>
            <button
              onClick={handleLoadSample}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 min-h-[500px] p-4 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
            placeholder='{"key": "value"}'
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Swift Output
            </label>
            <div className="flex items-center gap-2">
              <div className="flex rounded bg-slate-800 border border-slate-700 p-0.5">
                <button
                  onClick={() => setActiveTab('structs')}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    activeTab === 'structs'
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Structs
                </button>
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    activeTab === 'usage'
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Usage
                </button>
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-[500px] p-4 bg-slate-900 border border-slate-700 rounded-lg overflow-auto">
            {error ? (
              <pre className="text-sm text-red-400 font-mono whitespace-pre-wrap">{error}</pre>
            ) : activeTab === 'usage' ? (
              <pre className="text-sm text-slate-200 font-mono whitespace-pre">{usageOutput}</pre>
            ) : output ? (
              <pre className="text-sm text-slate-200 font-mono whitespace-pre">{output}</pre>
            ) : (
              <p className="text-sm text-slate-500 italic">Enter valid JSON to generate Swift structs</p>
            )}
          </div>
        </div>
      </div>

      {/* Struct summary */}
      {structs.filter((s) => s.fields.length > 0).length > 1 && (
        <div className="mt-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Generated Structs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {structs
              .filter((s) => s.fields.length > 0)
              .map((s) => (
                <div
                  key={s.name}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-700"
                >
                  <span className="text-xs font-mono text-brand-400">{s.name}</span>
                  <span className="text-xs text-slate-500 ml-2">{s.fields.length}f</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
