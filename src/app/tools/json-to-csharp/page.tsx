'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

type CsBasicType = 'string' | 'int' | 'long' | 'double' | 'float' | 'bool' | 'decimal' | 'DateTime' | 'object';

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

function isInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

function looksLikeDateTime(str: string): boolean {
  // ISO 8601 patterns
  return /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(str) ||
         /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function inferCsType(value: unknown): CsBasicType {
  if (value === null) return 'object';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return isFloat(value) ? 'double' : 'int';
  if (typeof value === 'string') return looksLikeDateTime(value) ? 'DateTime' : 'string';
  return 'object';
}

function pascalCase(str: string): string {
  // Convert snake_case, kebab-case, or camelCase to PascalCase
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Root';
}

// ── C# keywords to avoid ──────────────────────────────────────────────────

const CS_KEYWORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'record', 'ref', 'return', 'sbyte',
  'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong',
  'unchecked', 'unsafe', 'ushort', 'using', 'var', 'virtual', 'void',
  'volatile', 'while', 'when', 'where', 'yield', 'nameof', 'not', 'or', 'and',
  'init', 'record', 'required',
]);

function sanitizeName(name: string): string {
  const pascal = pascalCase(name);
  if (CS_KEYWORDS.has(pascal.toLowerCase())) {
    return pascal + '_';
  }
  if (/^\d/.test(pascal)) {
    return '_' + pascal;
  }
  return pascal;
}

// ── Options ────────────────────────────────────────────────────────────────

interface Options {
  namespaceName: string;
  useRecords: boolean;
  useJsonProperty: boolean; // System.Text.Json
  useNewtonsoft: boolean;   // Newtonsoft.Json
  useNullableReferences: boolean;
  dateTimeType: 'DateTime' | 'DateTimeOffset' | 'string';
  indentSpaces: number;
}

const DEFAULT_OPTIONS: Options = {
  namespaceName: 'MyApp.Models',
  useRecords: false,
  useJsonProperty: true,
  useNewtonsoft: false,
  useNullableReferences: true,
  dateTimeType: 'DateTime',
  indentSpaces: 4,
};

// ── Class building ─────────────────────────────────────────────────────────

interface FieldDef {
  name: string;
  csType: string;
  jsonName: string;
  isNullable: boolean;
}

interface ClassDef {
  name: string;
  fields: FieldDef[];
}

function buildClasses(
  value: unknown,
  typeName: string,
  options: Options,
  allClasses: ClassDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null || typeof value !== 'object') {
    return inferCsType(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<object>';
    const first = value[0];
    if (Array.isArray(first)) {
      const nested = buildClasses(first, pascalCase(typeName.replace(/s$/, '') + 'Item'), options, allClasses, seen);
      return `List<List<${nested}>>`;
    }
    if (typeof first === 'object' && first !== null) {
      const itemName = pascalCase(typeName.replace(/s$/, '') + 'Item');
      const existing = seen.get(first);
      if (existing) return `List<${existing}>`;
      const innerType = buildClasses(first, itemName, options, allClasses, seen);
      return `List<${innerType}>`;
    }
    const elemType = inferCsType(first);
    return `List<${elemType}>`;
  }

  const existing = seen.get(value);
  if (existing) return existing;
  seen.set(value, typeName);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];
  const keySet = new Set<string>();

  for (const [key, val] of Object.entries(obj)) {
    const name = sanitizeName(key);
    if (keySet.has(name)) continue;
    keySet.add(name);

    let csType: string;
    let isNullable = false;

    if (val === null) {
      csType = 'object';
      isNullable = true;
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        csType = 'List<object>';
      } else {
        const first = val[0];
        if (Array.isArray(first)) {
          const nestedName = pascalCase(name);
          const nested = buildClasses(first, nestedName, options, allClasses, seen);
          csType = `List<List<${nested}>>`;
        } else if (typeof first === 'object' && first !== null) {
          const itemName = pascalCase(name);
          const existing = seen.get(first);
          if (existing) {
            csType = `List<${existing}>`;
          } else {
            const innerType = buildClasses(first, itemName, options, allClasses, seen);
            csType = `List<${innerType}>`;
          }
        } else {
          csType = `List<${inferCsType(first)}>`;
        }
      }
      isNullable = true; // collections are nullable by default in C#
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(name);
      const existing = seen.get(val);
      if (existing) {
        csType = existing;
        isNullable = true;
      } else {
        csType = buildClasses(val, nestedName, options, allClasses, seen);
        isNullable = true;
      }
    } else {
      csType = inferCsType(val);
    }

    // Handle DateTime type override
    if (csType === 'DateTime' && options.dateTimeType !== 'DateTime') {
      csType = options.dateTimeType;
    }

    fields.push({ name, csType, jsonName: key, isNullable });
  }

  const existingClass = allClasses.find((c) => c.name === typeName);
  if (existingClass) {
    for (const f of fields) {
      if (!existingClass.fields.find((ef) => ef.name === f.name)) {
        existingClass.fields.push(f);
      }
    }
  } else {
    allClasses.push({ name: typeName, fields });
  }

  return typeName;
}

function formatCsCode(allClasses: ClassDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const lines: string[] = [];

  // Using statements
  lines.push('using System;');
  lines.push('using System.Collections.Generic;');
  if (options.useNewtonsoft) {
    lines.push('');
    lines.push('using Newtonsoft.Json;');
  } else if (options.useJsonProperty) {
    lines.push('using System.Text.Json.Serialization;');
  }
  lines.push('');

  // Namespace
  if (options.namespaceName) {
    lines.push(`namespace ${options.namespaceName};`);
    lines.push('');
  }

  for (const cls of allClasses) {
    const classKeyword = options.useRecords ? 'record' : 'class';

    // Class declaration
    lines.push(`public ${classKeyword} ${cls.name}`);

    if (cls.fields.length === 0) {
      lines.push('{');
      lines.push('}');
      lines.push('');
      continue;
    }

    // If record, use primary constructor style for clean output
    if (options.useRecords) {
      lines.push('{');
    } else {
      lines.push('{');
    }

    let needsRegion = false;

    for (const field of cls.fields) {
      // Add JsonProperty attribute
      if ((options.useJsonProperty || options.useNewtonsoft) && field.jsonName.toLowerCase() !== field.name.toLowerCase()) {
        const attr = options.useNewtonsoft
          ? `[JsonProperty("${field.jsonName}")]`
          : `[JsonPropertyName("${field.jsonName}")]`;
        lines.push(`${indent}${attr}`);
      }

      let typeStr = field.csType;
      if (options.useNullableReferences && field.isNullable && field.csType !== 'object') {
        // Add ? for nullable reference types
        if (typeStr === 'string' || /^List</.test(typeStr) || allClasses.some(c => c.name === typeStr)) {
          typeStr += '?';
        }
      }

      const type = typeStr;
      const propName = field.name;

      if (options.useRecords) {
        lines.push(`${indent}public ${type} ${propName} { get; init; }`);
      } else {
        lines.push(`${indent}public ${type} ${propName} { get; set; }`);
      }
    }

    lines.push('}');
    lines.push('');
  }

  // Add a utility deserializer
  lines.push('// ── Usage ────────────────────────────────────────────────');
  lines.push('// var obj = JsonSerializer.Deserialize<Root>(jsonString);');
  lines.push('');

  return lines.join('\n');
}

// ── Sample data ───────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": 42,
  "name": "John Doe",
  "email": "john@example.com",
  "isActive": true,
  "score": 95.5,
  "createdAt": "2026-06-06T12:00:00Z",
  "profile": {
    "age": 30,
    "avatarUrl": "https://example.com/avatar.jpg",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "zipCode": "94105"
    }
  },
  "tags": ["developer", "csharp", "dotnet"],
  "metadata": null,
  "projects": [
    {
      "id": 1,
      "title": "Cool Project",
      "stars": 150,
      "isPublic": true,
      "languages": ["csharp", "fsharp"]
    }
  ]
}`;

// ── Component ─────────────────────────────────────────────────────────────

export default function JsonToCSharpPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);

  const { output, error, classCount } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const allClasses: ClassDef[] = [];
      buildClasses(parsed, 'Root', options, allClasses);
      const code = formatCsCode(allClasses, options);
      return { output: code, error: '', classCount: allClasses.length };
    } catch (e) {
      return { output: '', error: (e as Error).message, classCount: 0 };
    }
  }, [input, options]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    toast.success('C# code copied!');
  }, [output]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  return (
    <ToolLayout
      title="JSON → C# Class"
      description="Convert JSON into idiomatic C# class or record definitions with System.Text.Json or Newtonsoft.Json attributes."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Braces className="w-4 h-4 text-brand-400" />
              JSON Input
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-md text-sm transition-colors ${
                  showSettings ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-300'
                }`}
                title="Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-300 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Namespace</label>
                  <input
                    type="text"
                    value={options.namespaceName}
                    onChange={(e) => setOptions({ ...options, namespaceName: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-brand-500"
                    placeholder="MyApp.Models"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Type Style</label>
                  <select
                    value={options.useRecords ? 'record' : 'class'}
                    onChange={(e) => setOptions({ ...options, useRecords: e.target.value === 'record' })}
                    className="w-full px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="class">Class</option>
                    <option value="record">Record (init-only)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">JSON Library</label>
                  <select
                    value={options.useNewtonsoft ? 'newtonsoft' : 'system-text'}
                    onChange={(e) => {
                      const isNewtonsoft = e.target.value === 'newtonsoft';
                      setOptions({ ...options, useNewtonsoft: isNewtonsoft, useJsonProperty: !isNewtonsoft });
                    }}
                    className="w-full px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="system-text">System.Text.Json</option>
                    <option value="newtonsoft">Newtonsoft.Json</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Date Handling</label>
                  <select
                    value={options.dateTimeType}
                    onChange={(e) => setOptions({ ...options, dateTimeType: e.target.value as Options['dateTimeType'] })}
                    className="w-full px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="DateTime">DateTime</option>
                    <option value="DateTimeOffset">DateTimeOffset</option>
                    <option value="string">string</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.useJsonProperty || options.useNewtonsoft}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOptions({ ...options, useJsonProperty: true, useNewtonsoft: false });
                      } else {
                        setOptions({ ...options, useJsonProperty: false, useNewtonsoft: false });
                      }
                    }}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  Add JSON attributes
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.useNullableReferences}
                    onChange={(e) => setOptions({ ...options, useNullableReferences: e.target.checked })}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  Nullable references (?)
                </label>
              </div>
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-[460px] px-4 py-3 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
            placeholder="Paste JSON here..."
            spellCheck={false}
          />
          {error && (
            <p className="text-sm text-red-400 font-mono bg-red-500/10 px-3 py-2 rounded-md border border-red-500/20">
              {error}
            </p>
          )}
        </div>

        {/* Output Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-400" />
              C# Output
              {classCount > 0 && (
                <span className="text-xs text-slate-500 ml-1">
                  ({classCount} {options.useRecords ? 'record' : 'class'}
                  {classCount !== 1 ? 'es' : ''})
                </span>
              )}
            </label>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <pre className="w-full h-[460px] px-4 py-3 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-300 overflow-auto whitespace-pre">
            {output || (
              <span className="text-slate-500 italic">Enter valid JSON to see C# code...</span>
            )}
          </pre>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-8 card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">How it works</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          This tool infers C# types from your JSON structure and generates idiomatic
          <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs mx-1">class</code>
          or
          <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs mx-1">record</code>
          definitions. Nested objects become nested types, arrays use
          <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs mx-1">List&lt;T&gt;</code>,
          and ISO 8601 date strings are detected as
          <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs mx-1">DateTime</code>.
          JSON property name attributes are added automatically when names differ.
          All processing happens client-side — your data never leaves the browser.
        </p>
      </div>
    </ToolLayout>
  );
}
