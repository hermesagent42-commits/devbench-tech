'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

function isInteger(value: unknown): boolean {
  return Number.isInteger(value);
}

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

type BasicType = 'string' | 'number' | 'boolean' | 'null' | 'any';

function inferType(value: unknown): BasicType {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'any';
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Root';
}

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1).toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('') || 'root';
}

function isAllStrings(arr: unknown[]): boolean {
  return arr.every((v) => typeof v === 'string');
}

function hasUniqueStrings(arr: string[]): boolean {
  return new Set(arr).size === arr.length;
}

// ── Options ────────────────────────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  exportStyle: 'named' | 'const' | 'inferred';
  optionalFields: boolean;
  useCoerce: boolean;
  includeImports: boolean;
  keyStyle: 'preserve' | 'camelCase';
  indentSpaces: number;
  maxEnumLength: number;
}

const DEFAULT_OPTIONS: Options = {
  rootTypeName: 'MySchema',
  exportStyle: 'named',
  optionalFields: true,
  useCoerce: false,
  includeImports: true,
  keyStyle: 'preserve',
  indentSpaces: 2,
  maxEnumLength: 20,
};

// ── Zod schema generation ──────────────────────────────────────────────────

interface TypeDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  key: string;
  zodExp: string;
  optional: boolean;
  comments: string[];
}

const INDENT_CACHE = new Map<number, string>();
function indent(n: number): string {
  if (!INDENT_CACHE.has(n)) {
    INDENT_CACHE.set(n, ' '.repeat(n));
  }
  return INDENT_CACHE.get(n)!;
}

function buildZodSchema(
  value: unknown,
  typeName: string,
  options: Options,
  allTypes: TypeDef[],
  depth: number = 0,
  seen: Set<unknown> = new Set()
): string {
  const base = options.useCoerce ? 'z.coerce.' : 'z.';

  // Null
  if (value === null) {
    return `${base}null()`;
  }

  // Primitives
  if (typeof value === 'boolean') return `${base}boolean()`;
  if (typeof value === 'number') {
    if (isInteger(value)) {
      return `${base}number().int()`;
    }
    return `${base}number()`;
  }
  if (typeof value === 'string') {
    // Try to detect common patterns
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return `${base}string().datetime()`;
    }
    if (/^https?:\/\//.test(value)) {
      return `${base}string().url()`;
    }
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) {
      return `${base}string().uuid()`;
    }
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      return `${base}string().email()`;
    }
    return `${base}string()`;
  }

  if (typeof value !== 'object') {
    return `${base}any()`;
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) return `${base}array(${base}unknown())`;

    const first = value[0];

    // Array of primitives
    if (first === null || (typeof first !== 'object' && !Array.isArray(first))) {
      return `${base}array(${buildZodSchema(first, typeName, options, allTypes, depth, seen)})`;
    }

    // Array of strings that could be an enum
    if (isAllStrings(value) && hasUniqueStrings(value as string[]) && value.length >= 2 && value.length <= options.maxEnumLength) {
      const vals = (value as string[]).map((v) => `  ${indent(options.indentSpaces)}"${v}"`).join(',\n');
      return `${base}enum([\n${vals}\n${indent(options.indentSpaces * (depth))}])`;
    }

    // Array of objects
    if (typeof first === 'object' && !Array.isArray(first)) {
      const nestedName = pascalCase(typeName.endsWith('Item') ? typeName : `${typeName}Item`);
      buildZodSchema(first, nestedName, options, allTypes, depth + 1, seen);
      return `${base}array(${nestedName})`;
    }

    // Nested arrays
    if (Array.isArray(first)) {
      const nestedName = pascalCase(`${typeName}Item`);
      const inner = buildZodSchema(first, nestedName, options, allTypes, depth + 1, seen);
      return `${base}array(${inner})`;
    }

    return `${base}array(${base}unknown())`;
  }

  // Object
  return typeName;
}

function generateTypeBlock(
  value: unknown,
  typeName: string,
  options: Options,
  allTypes: TypeDef[],
  seen: Set<unknown> = new Set()
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;

  if (seen.has(value)) return;
  seen.add(value);

  const entries = Object.entries(value as Record<string, unknown>);
  const fields: FieldDef[] = [];
  const comments: string[] = [];

  for (const [key, val] of entries) {
    const fieldKey = options.keyStyle === 'camelCase' ? toCamelCase(key) : key;
    const needsQuoting = /[^a-zA-Z0-9_$]/.test(fieldKey) || /^\d/.test(fieldKey);

    if (val === null) {
      fields.push({
        key: needsQuoting ? `"${key}"` : fieldKey,
        zodExp: `z.null()`,
        optional: options.optionalFields,
        comments: [],
      });
    } else if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
      const nestedName = pascalCase(key);
      generateTypeBlock(val, nestedName, options, allTypes, seen);
      fields.push({
        key: needsQuoting ? `"${key}"` : fieldKey,
        zodExp: nestedName,
        optional: options.optionalFields,
        comments: [],
      });
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        fields.push({
          key: needsQuoting ? `"${key}"` : fieldKey,
          zodExp: 'z.array(z.unknown())',
          optional: options.optionalFields,
          comments: ['// empty array, type unknown'],
        });
      } else if (isAllStrings(val) && hasUniqueStrings(val as string[]) && val.length >= 2 && val.length <= options.maxEnumLength) {
        const enumVals = (val as string[]).map(v => `"${v}"`).join(', ');
        fields.push({
          key: needsQuoting ? `"${key}"` : fieldKey,
          zodExp: `z.enum([${enumVals}])`,
          optional: options.optionalFields,
          comments: [],
        });
      } else {
        const first = val[0];
        if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
          const nestedName = pascalCase(key.endsWith('s') ? key.slice(0, -1) : `${key}Item`);
          generateTypeBlock(first, nestedName, options, allTypes, seen);
          fields.push({
            key: needsQuoting ? `"${key}"` : fieldKey,
            zodExp: `z.array(${nestedName})`,
            optional: options.optionalFields,
            comments: [],
          });
        } else {
          const base = options.useCoerce ? 'z.coerce.' : 'z.';
          const elemType = buildZodSchema(first, key, options, allTypes, 0, new Set());
          fields.push({
            key: needsQuoting ? `"${key}"` : fieldKey,
            zodExp: `z.array(${elemType})`,
            optional: options.optionalFields,
            comments: [],
          });
        }
      }
    } else {
      const exp = buildZodSchema(val, key, options, allTypes, 0, new Set());
      const fieldComments: string[] = [];
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        // datetime is already in the expression
      }
      fields.push({
        key: needsQuoting ? `"${key}"` : fieldKey,
        zodExp: exp,
        optional: options.optionalFields,
        comments: fieldComments,
      });
    }
  }

  allTypes.push({ name: typeName, fields });
}

function renderZodSchema(
  allTypes: TypeDef[],
  options: Options,
  rootTypeName: string
): string {
  const lines: string[] = [];
  const sp = options.indentSpaces;
  const indent1 = indent(sp);
  const indent2 = indent(sp * 2);

  if (options.includeImports) {
    lines.push('import { z } from "zod";');
    lines.push('');
  }

  // Render types bottom-up (nested first, root last)
  for (const typeDef of allTypes) {
    const isRoot = typeDef.name === rootTypeName;
    let start: string;
    if (isRoot) {
      switch (options.exportStyle) {
        case 'named':
          start = `export const ${typeDef.name} = z.object({`;
          break;
        case 'const':
          start = `export const ${typeDef.name} = z.object({`;
          break;
        case 'inferred':
          start = `const ${typeDef.name} = z.object({`;
          break;
      }
    } else {
      start = `const ${typeDef.name} = z.object({`;
    }
    lines.push(start);

    for (const field of typeDef.fields) {
      let fieldLine = `${indent1}${field.key}: ${field.zodExp}`;
      if (field.optional) {
        fieldLine += '.optional()';
      }
      fieldLine += ',';
      if (field.comments.length > 0) {
        fieldLine += ` ${field.comments.join(' ')}`;
      }
      lines.push(fieldLine);
    }

    lines.push('});');
    lines.push('');
  }

  // If inferred style, add type export at the end
  if (options.exportStyle === 'inferred') {
    lines.push(`export type ${rootTypeName}Type = z.infer<typeof ${rootTypeName}>;`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Preset JSON examples ───────────────────────────────────────────────────

const PRESETS: { name: string; label: string; json: string }[] = [
  {
    name: 'user',
    label: '👤 User Profile',
    json: JSON.stringify({
      id: 1,
      name: 'Jane Doe',
      email: 'jane@example.com',
      avatar: 'https://example.com/avatar.jpg',
      role: 'admin',
      createdAt: '2026-01-15T08:30:00Z',
      isActive: true,
      tags: ['typescript', 'react', 'node'],
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
      },
    }, null, 2),
  },
  {
    name: 'api',
    label: '📡 API Response',
    json: JSON.stringify({
      success: true,
      data: {
        items: [
          {
            id: 'ck_1a2b3c',
            price: 29.99,
            quantity: 3,
            name: 'Widget Pro',
          },
          {
            id: 'ck_4d5e6f',
            price: 14.50,
            quantity: 1,
            name: 'Widget Lite',
          },
        ],
        total: 44.49,
        page: 1,
        pageSize: 20,
        hasMore: false,
      },
      error: null,
    }, null, 2),
  },
  {
    name: 'config',
    label: '⚙️ App Config',
    json: JSON.stringify({
      appName: 'MyApp',
      version: '2.1.0',
      port: 3000,
      debug: false,
      database: {
        host: 'localhost',
        port: 5432,
        name: 'myapp_db',
        pool: {
          min: 2,
          max: 10,
        },
      },
      features: {
        darkMode: true,
        notifications: true,
        analytics: false,
      },
    }, null, 2),
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function JsonToZodPage() {
  const [input, setInput] = useState(PRESETS[0].json);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [activePreset, setActivePreset] = useState('user');

  const parseResult = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      return { data: parsed, error: null };
    } catch (e: unknown) {
      return { data: null, error: (e as Error).message };
    }
  }, [input]);

  const output = useMemo(() => {
    if (!parseResult.data) return '';
    const allTypes: TypeDef[] = [];
    const rootName = pascalCase(options.rootTypeName || 'Root');
    const base = options.useCoerce ? 'z.coerce.' : 'z.';

    // For top-level arrays
    if (Array.isArray(parseResult.data)) {
      const arr = parseResult.data as unknown[];
      if (arr.length === 0) {
        const imp = options.includeImports ? 'import { z } from "zod";\n\n' : '';
        return `${imp}export const ${rootName} = z.array(z.unknown());\n`;
      }
      if (isAllStrings(arr) && hasUniqueStrings(arr as string[]) && arr.length >= 2 && arr.length <= options.maxEnumLength) {
        const vals = (arr as string[]).map((v) => `  "${v}"`).join(',\n');
        const imp = options.includeImports ? 'import { z } from "zod";\n\n' : '';
        return `${imp}export const ${rootName} = z.enum([\n${vals}\n]);\n`;
      }
      const first = arr[0];
      if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
        generateTypeBlock(first, rootName, options, allTypes, new Set());
        return renderZodSchema(allTypes, options, rootName);
      }
      const elemSchema = buildZodSchema(first, 'Item', options, allTypes, 0, new Set());
      const imp = options.includeImports ? 'import { z } from "zod";\n\n' : '';
      const exp = options.exportStyle === 'inferred'
        ? `const ${rootName} = z.array(${elemSchema});\n\nexport type ${rootName}Type = z.infer<typeof ${rootName}>;\n`
        : `export const ${rootName} = z.array(${elemSchema});\n`;
      return imp + exp;
    }

    generateTypeBlock(parseResult.data, rootName, options, allTypes, new Set());
    return renderZodSchema(allTypes, options, rootName);
  }, [parseResult.data, options]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success('Copied Zod schema!');
  }, [output]);

  const handleReset = useCallback(() => {
    setInput(PRESETS[0].json);
    setOptions(DEFAULT_OPTIONS);
    setActivePreset('user');
  }, []);

  const handlePreset = useCallback((name: string, json: string) => {
    setInput(json);
    setActivePreset(name);
  }, []);

  const outputStats = useMemo(() => {
    if (!output) return null;
    const lines = output.split('\n').length;
    const chars = output.length;
    return { lines, chars };
  }, [output]);

  return (
    <ToolLayout
      title="JSON → Zod Schema"
      description="Convert JSON data into type-safe Zod validation schemas. Paste any JSON and get production-ready Zod code — nested objects, arrays, enums, optional fields, and more. 100% client-side."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Input */}
        <div className="space-y-6">
          {/* Presets */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Braces className="w-3.5 h-3.5 text-brand-400" />
              Sample Data
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handlePreset(p.name, p.json)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    activePreset === p.name
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                      : 'bg-surface border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setInput('');
                  setActivePreset('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
              >
                ✏️ Custom
              </button>
            </div>
          </div>

          {/* JSON Input */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Braces className="w-3.5 h-3.5 text-brand-400" />
              JSON Input
            </h2>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setActivePreset('');
              }}
              placeholder='Paste JSON here...'
              className="w-full h-[400px] bg-slate-950 rounded-lg p-4 font-mono text-sm text-slate-200 border border-slate-700/50 resize-none focus:outline-none focus:border-brand-500/50 transition-colors"
              spellCheck={false}
            />
            {parseResult.error && (
              <p className="mt-2 text-xs text-red-400 font-mono">
                ❌ {parseResult.error}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-brand-400" />
              Options
            </h2>

            <div className="space-y-4">
              {/* Root name */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Root Schema Name
                </label>
                <input
                  type="text"
                  value={options.rootTypeName}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, rootTypeName: e.target.value || 'MySchema' }))
                  }
                  className="w-full bg-slate-950 rounded-lg px-3 py-2 text-sm text-slate-200 border border-slate-700/50 focus:outline-none focus:border-brand-500/50 transition-colors font-mono"
                />
              </div>

              {/* Export style */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Export Style
                </label>
                <div className="flex gap-2">
                  {(['named', 'const', 'inferred'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setOptions((o) => ({ ...o, exportStyle: s }))}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        options.exportStyle === s
                          ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                          : 'bg-surface border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      {s === 'named' && 'export const'}
                      {s === 'const' && 'export const'}
                      {s === 'inferred' && 'z.infer<>'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.optionalFields}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, optionalFields: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
                  />
                  <span className="text-xs text-slate-300">Optional fields</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.useCoerce}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, useCoerce: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
                  />
                  <span className="text-xs text-slate-300">Coerce mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeImports}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, includeImports: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
                  />
                  <span className="text-xs text-slate-300">Include import</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.keyStyle === 'camelCase'}
                    onChange={(e) =>
                      setOptions((o) => ({
                        ...o,
                        keyStyle: e.target.checked ? 'camelCase' : 'preserve',
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
                  />
                  <span className="text-xs text-slate-300">CamelCase keys</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Output */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                Zod Schema Output
              </h2>
              {output && (
                <div className="flex items-center gap-2">
                  {outputStats && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {outputStats.lines} lines · {outputStats.chars} chars
                    </span>
                  )}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-500/15 text-brand-300 border border-brand-500/30 hover:bg-brand-500/25 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              )}
            </div>
            {output ? (
              <pre className="bg-slate-950 rounded-lg p-4 overflow-auto max-h-[500px] border border-slate-700/50">
                <code className="text-sm font-mono text-slate-200 whitespace-pre">{output}</code>
              </pre>
            ) : (
              <div className="bg-slate-950 rounded-lg p-8 border border-slate-700/50 text-center">
                <p className="text-slate-500 text-sm">
                  {parseResult.data === null && input.trim()
                    ? parseResult.error
                      ? `Invalid JSON: ${parseResult.error}`
                      : 'Enter valid JSON to generate a Zod schema'
                    : 'Enter JSON to generate a Zod schema'}
                </p>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">How it works</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>
                • Infers Zod types: <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.string()</code>,{' '}
                <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.number()</code>,{' '}
                <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.boolean()</code>,{' '}
                <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.null()</code>
              </li>
              <li>
                • Nested objects become named <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.object()</code> declarations
              </li>
              <li>
                • Arrays infer element types; string arrays become{' '}
                <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.enum()</code> when appropriate
              </li>
              <li>
                • Auto-detects UUIDs, emails, URLs, and datetime strings — adds
                refinements (<code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">.uuid()</code>,{' '}
                <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">.email()</code>, etc.)
              </li>
              <li>
                • <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.coerce</code> mode for
                parsing string inputs (form data, query params)
              </li>
              <li>
                • <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">z.infer</code> export style
                for deriving TypeScript types from Zod schemas
              </li>
              <li>• All processing happens in your browser — no data sent anywhere</li>
            </ul>
          </div>

          {/* Zod Quick Reference */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">Zod Quick Reference</h2>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-1.5 pr-4 text-slate-400 font-medium">Type</th>
                    <th className="text-left py-1.5 pr-4 text-slate-400 font-medium">Zod Schema</th>
                    <th className="text-left py-1.5 text-slate-400 font-medium">TS Type</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 font-mono">
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-4 text-slate-500">String</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.string()</td>
                    <td className="py-1.5">string</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-4 text-slate-500">Number</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.number()</td>
                    <td className="py-1.5">number</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-4 text-slate-500">Boolean</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.boolean()</td>
                    <td className="py-1.5">boolean</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-4 text-slate-500">Array</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.array(z.string())</td>
                    <td className="py-1.5">string[]</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-4 text-slate-500">Object</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.object({'{ ... }'})</td>
                    <td className="py-1.5">{'{ ... }'}</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-4 text-slate-500">Enum</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.enum([&apos;a&apos;,&apos;b&apos;])</td>
                    <td className="py-1.5">&apos;a&apos; | &apos;b&apos;</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-1.5 pr-4 text-slate-500">Union</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.union([A, B])</td>
                    <td className="py-1.5">A | B</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4 text-slate-500">Optional</td>
                    <td className="py-1.5 pr-4 text-brand-300">z.string().optional()</td>
                    <td className="py-1.5">string | undefined</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>
    </ToolLayout>
  );
}
