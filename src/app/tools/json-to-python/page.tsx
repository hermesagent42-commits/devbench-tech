'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

type PyBasicType = 'str' | 'int' | 'float' | 'bool' | 'Any';

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

function isInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

function inferPyType(value: unknown): PyBasicType {
  if (value === null) return 'Any';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return isFloat(value) ? 'float' : 'int';
  if (typeof value === 'string') return 'str';
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

function toSnakeCase(str: string): string {
  // Convert PascalCase or camelCase to snake_case
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .replace(/_{2,}/g, '_') || 'field';
}

const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
  'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
  'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
  'try', 'while', 'with', 'yield', 'match', 'case', 'type',
]);

function sanitizeFieldName(name: string, useSnake: boolean): string {
  const base = useSnake ? toSnakeCase(name) : name;
  if (PYTHON_KEYWORDS.has(base)) {
    return base + '_';
  }
  // Ensure valid Python identifier
  if (/^\d/.test(base) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(base)) {
    return 'field_' + base.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  return base;
}

// ── Dataclass generation ──────────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  fieldNaming: 'snake_case' | 'original';
  useOptional: boolean;
  includeFromDict: boolean;
  includeRepr: boolean;
  indentSpaces: number;
}

interface ClassDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  pyType: string;
  defaultVal: string;
  originalKey: string;
}

const DEFAULT_OPTIONS: Options = {
  rootTypeName: 'Root',
  fieldNaming: 'snake_case',
  useOptional: true,
  includeFromDict: true,
  includeRepr: false,
  indentSpaces: 4,
};

function buildDataclasses(
  value: unknown,
  typeName: string,
  options: Options,
  allClasses: ClassDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null) return 'Any';
  if (typeof value !== 'object') return inferPyType(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return 'List[Any]';
    const first = value[0];
    if (Array.isArray(first)) {
      const nested = buildDataclasses(first, pascalCase(`${typeName}Item`), options, allClasses, seen);
      return `List[List[${nested}]]`;
    }
    if (typeof first === 'object' && first !== null) {
      const itemName = pascalCase(typeName.replace(/s$/, '') + 'Item');
      const existing = seen.get(first);
      if (existing) return `List[${existing}]`;
      const innerType = buildDataclasses(first, itemName, options, allClasses, seen);
      return `List[${innerType}]`;
    }
    const elemType = inferPyType(first);
    return `List[${elemType}]`;
  }

  const existing = seen.get(value);
  if (existing) return existing;
  seen.set(value, typeName);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];
  const keySet = new Set<string>();

  for (const [key, val] of Object.entries(obj)) {
    const fieldName = sanitizeFieldName(key, options.fieldNaming === 'snake_case');
    if (keySet.has(fieldName)) continue;
    keySet.add(fieldName);

    let pyType: string;
    let defaultVal = '';

    if (val === null) {
      pyType = options.useOptional ? 'Optional[Any]' : 'Any';
      defaultVal = '= None';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        pyType = 'List[Any]';
        defaultVal = '= field(default_factory=list)';
      } else {
        const first = val[0];
        if (Array.isArray(first)) {
          const nested = buildDataclasses(first, pascalCase(`${key}Item`), options, allClasses, seen);
          pyType = `List[List[${nested}]]`;
          defaultVal = '= field(default_factory=list)';
        } else if (typeof first === 'object' && first !== null) {
          const itemName = pascalCase(key);
          const existing = seen.get(first);
          if (existing) {
            pyType = `List[${existing}]`;
          } else {
            const innerType = buildDataclasses(first, itemName, options, allClasses, seen);
            pyType = `List[${innerType}]`;
          }
          defaultVal = '= field(default_factory=list)';
        } else {
          pyType = `List[${inferPyType(first)}]`;
          defaultVal = '= field(default_factory=list)';
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      const existing = seen.get(val);
      if (existing) {
        pyType = existing;
      } else {
        pyType = buildDataclasses(val, nestedName, options, allClasses, seen);
      }
    } else {
      pyType = inferPyType(val);
    }

    fields.push({ name: fieldName, pyType, defaultVal, originalKey: key });
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

function formatPythonCode(allClasses: ClassDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const lines: string[] = [];

  // Imports
  lines.push('from dataclasses import dataclass, field');
  if (options.useOptional || allClasses.some(c => c.fields.some(f => f.pyType.includes('Optional')))) {
    lines.push('from typing import Optional, Any, List');
  } else {
    lines.push('from typing import Any, List');
  }
  lines.push('');
  lines.push('');

  for (const cls of allClasses) {
    // Decorator
    const reprParam = options.includeRepr ? '' : ', repr=False';
    lines.push(`@dataclass${cls.fields.length > 0 && cls.fields.some(f => f.defaultVal) ? reprParam : (reprParam ? reprParam : '')}`);
    
    if (cls.fields.length === 0) {
      // Use just @dataclass for consistency
      lines[lines.length - 1] = '@dataclass';
    }

    // Class definition
    lines.push(`class ${cls.name}:`);

    if (cls.fields.length === 0) {
      lines.push(`${indent}pass`);
      lines.push('');
      continue;
    }

    const maxNameLen = Math.max(...cls.fields.map(f => f.name.length));
    const maxTypeLen = Math.max(...cls.fields.map(f => f.pyType.length));

    for (const field of cls.fields) {
      const namePad = ' '.repeat(maxNameLen - field.name.length);
      const typePad = ' '.repeat(maxTypeLen - field.pyType.length);
      lines.push(`${indent}${field.name}: ${field.pyType}${typePad} ${field.defaultVal}`.trimEnd());
    }

    lines.push('');
  }

  // Add from_dict at the end if enabled
  if (options.includeFromDict) {
    lines.push('');
    lines.push('# ── Utility: parse JSON into dataclasses ──────────────────────');
    lines.push('');
    lines.push('import json');
    lines.push('');
    lines.push('def from_dict(data: dict, target_class):');
    lines.push(`${indent}"""Recursively convert a dict to the given dataclass."""`);
    lines.push(`${indent}field_names = {f.name for f in fields(target_class)}`);
    lines.push(`${indent}kwargs = {}`);
    lines.push(`${indent}for key, value in data.items():`);
    lines.push(`${indent}${indent}snake_key = key`);
    if (options.fieldNaming === 'snake_case') {
      lines.push(`${indent}${indent}# Convert camelCase to snake_case`);
      lines.push(`${indent}${indent}snake_key = ''.join(['_' + c.lower() if c.isupper() else c for c in key]).lstrip('_')`);
    }
    lines.push(`${indent}${indent}if snake_key in field_names:`);
    lines.push(`${indent}${indent}${indent}field_type = target_class.__dataclass_fields__[snake_key].type`);
    lines.push(`${indent}${indent}${indent}# Handle Optional and List types`);
    lines.push(`${indent}${indent}${indent}kwargs[snake_key] = _convert_value(value, field_type)`);
    lines.push(`${indent}return target_class(**kwargs)`);
    lines.push('');
    lines.push('def _convert_value(value, type_hint):');
    lines.push(`${indent}"""Recursively convert a value based on type hint."""`);
    lines.push(`${indent}import typing`);
    lines.push(`${indent}if value is None:`);
    lines.push(`${indent}${indent}return None`);
    lines.push(`${indent}origin = typing.get_origin(type_hint)`);
    lines.push(`${indent}if origin is list or origin is List:`);
    lines.push(`${indent}${indent}args = typing.get_args(type_hint)`);
    lines.push(`${indent}${indent}if args and hasattr(args[0], '__dataclass_fields__'):`);
    lines.push(`${indent}${indent}${indent}return [from_dict(item, args[0]) for item in value]`);
    lines.push(`${indent}${indent}return value`);
    lines.push(`${indent}if hasattr(type_hint, '__dataclass_fields__'):`);
    lines.push(`${indent}${indent}return from_dict(value, type_hint)`);
    lines.push(`${indent}return value`);
    lines.push('');
    lines.push('');
    lines.push('# Usage:');
    lines.push(`# data = json.loads(json_string)`);
    lines.push(`# parsed = from_dict(data, ${allClasses[0]?.name || 'Root'})`);
  }

  return lines.join('\n');
}

// ── Sample data ───────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": 42,
  "name": "John Doe",
  "email": "john@example.com",
  "isActive": true,
  "score": 95.5,
  "profile": {
    "age": 30,
    "avatarUrl": "https://example.com/avatar.jpg",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "zipCode": "94105"
    }
  },
  "tags": ["developer", "python", "typescript"],
  "metadata": null,
  "projects": [
    {
      "id": 1,
      "title": "Cool Project",
      "stars": 150,
      "isPublic": true,
      "languages": ["python", "rust"]
    }
  ]
}`;

// ── Component ─────────────────────────────────────────────────────────────

export default function JsonToPythonPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);

  const { output, error, classCount } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const allClasses: ClassDef[] = [];
      buildDataclasses(parsed, options.rootTypeName, options, allClasses);
      const code = formatPythonCode(allClasses, options);
      return { output: code, error: '', classCount: allClasses.length };
    } catch (e) {
      return { output: '', error: (e as Error).message, classCount: 0 };
    }
  }, [input, options]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    toast.success('Python code copied!');
  }, [output]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  return (
    <ToolLayout
      title="JSON → Python Dataclasses"
      description="Convert JSON into type-annotated Python dataclass definitions with __init__, __repr__, and from_dict utility."
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
                  <label className="text-xs text-slate-400 block mb-1">Root Class Name</label>
                  <input
                    type="text"
                    value={options.rootTypeName}
                    onChange={(e) => setOptions({ ...options, rootTypeName: e.target.value || 'Root' })}
                    className="w-full px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Field Naming</label>
                  <select
                    value={options.fieldNaming}
                    onChange={(e) => setOptions({ ...options, fieldNaming: e.target.value as 'snake_case' | 'original' })}
                    className="w-full px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="snake_case">snake_case</option>
                    <option value="original">original</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.useOptional}
                    onChange={(e) => setOptions({ ...options, useOptional: e.target.checked })}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  Optional for nulls
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeFromDict}
                    onChange={(e) => setOptions({ ...options, includeFromDict: e.target.checked })}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  Include from_dict()
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeRepr}
                    onChange={(e) => setOptions({ ...options, includeRepr: e.target.checked })}
                    className="rounded bg-slate-700 border-slate-600 text-brand-500 focus:ring-brand-500"
                  />
                  Include __repr__
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
              Python Output
              {classCount > 0 && (
                <span className="text-xs text-slate-500 ml-1">
                  ({classCount} class{classCount !== 1 ? 'es' : ''})
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
              <span className="text-slate-500 italic">Valid JSON to see Python code...</span>
            )}
          </pre>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-8 card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">How it works</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          This tool infers Python types from your JSON structure and generates idiomatic 
          <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs mx-1">@dataclass</code>
          definitions. Nested objects become nested dataclasses, arrays use 
          <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs mx-1">List[...]</code>, 
          and null fields are typed as 
          <code className="text-brand-400 bg-brand-500/10 px-1 py-0.5 rounded text-xs mx-1">Optional[...]</code>
          . Enable the <strong>from_dict()</strong> utility to parse JSON directly into your dataclass instances — 
          like pydantic without the dependency. All processing happens client-side; your data never leaves the browser.
        </p>
      </div>
    </ToolLayout>
  );
}
