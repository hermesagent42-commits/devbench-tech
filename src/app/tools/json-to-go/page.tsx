'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

type GoBasicType = 'string' | 'int' | 'float64' | 'bool' | 'interface{}';

function inferGoType(value: unknown): GoBasicType {
  if (value === null) return 'interface{}';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return isFloat(value) ? 'float64' : 'int';
  if (typeof value === 'string') return 'string';
  return 'interface{}';
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Root';
}

function sanitizeFieldName(name: string): string {
  const sanitized = pascalCase(name);
  const goKeywords = new Set([
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer',
    'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import',
    'interface', 'map', 'package', 'range', 'return', 'select', 'struct',
    'switch', 'type', 'var',
  ]);
  if (goKeywords.has(sanitized.toLowerCase())) {
    return sanitized + 'Value';
  }
  return sanitized || 'Field';
}

// ── Struct generation ─────────────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  usePointers: boolean;
  omitEmpty: boolean;
  indentSpaces: number;
  includeSampleData: boolean;
}

interface StructDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  goType: string;
  jsonTag: string;
  comment: string;
}

function buildStructs(
  value: unknown,
  typeName: string,
  options: Options,
  allStructs: StructDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null) return 'interface{}';
  if (typeof value !== 'object') return inferGoType(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]interface{}';
    const first = value[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      const nestedName = pascalCase(typeName.endsWith('Item') ? typeName : `${typeName.replace(/s$/, '')}Item`);
      const existingName = seen.get(first);
      if (existingName) return `[]${existingName}`;
      seen.set(first, nestedName);
      const innerType = buildStructs(first, nestedName, options, allStructs, seen);
      return `[]${innerType}`;
    } else if (Array.isArray(first)) {
      const innerName = pascalCase(`${typeName}Item`);
      const inner = buildStructs(first, innerName, options, allStructs, seen);
      return `[][]${inner}`;
    } else {
      return `[]${inferGoType(first)}`;
    }
  }

  // Object
  const existingName = seen.get(value);
  if (existingName) return existingName;
  seen.set(value, typeName);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];

  for (const [key, val] of Object.entries(obj)) {
    const fieldName = sanitizeFieldName(key);
    let goType: string;

    if (val === null) {
      goType = 'interface{}';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        goType = '[]interface{}';
      } else {
        const first = val[0];
        if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
          const nestedName = pascalCase(key);
          const existing = seen.get(first);
          if (existing) {
            goType = `[]${existing}`;
          } else {
            seen.set(first, nestedName);
            const innerType = buildStructs(first, nestedName, options, allStructs, seen);
            goType = `[]${innerType}`;
          }
        } else if (Array.isArray(first)) {
          const innerName = pascalCase(`${key}Item`);
          const inner = buildStructs(first, innerName, options, allStructs, seen);
          goType = `[][]${inner}`;
        } else {
          goType = `[]${inferGoType(first)}`;
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      const existing = seen.get(val);
      if (existing) {
        goType = existing;
      } else {
        goType = buildStructs(val, nestedName, options, allStructs, seen);
      }
    } else {
      goType = inferGoType(val);
    }

    const ptrType = options.usePointers && (val === null) ? `*${goType}` : goType;
    const omitTag = options.omitEmpty ? ',omitempty' : '';
    const jsonTag = `\`json:"${key}${omitTag}"\``;
    const typeLabel = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
    const comment = `// ${typeLabel}`;

    fields.push({ name: fieldName, goType: ptrType, jsonTag, comment });
  }

  // Check if struct already exists and merge fields
  const existing = allStructs.find((s) => s.name === typeName);
  if (existing) {
    for (const f of fields) {
      if (!existing.fields.find((ef) => ef.name === f.name)) {
        existing.fields.push(f);
      }
    }
  } else {
    allStructs.push({ name: typeName, fields });
  }

  return typeName;
}

function formatGoStructs(allStructs: StructDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const lines: string[] = [];

  for (let i = 0; i < allStructs.length; i++) {
    const s = allStructs[i];
    if (s.fields.length === 0) continue;
    lines.push(`type ${s.name} struct {`);
    const maxNameLen = Math.max(...s.fields.map((f) => f.name.length));
    for (const f of s.fields) {
      const padded = f.name.padEnd(maxNameLen + 1);
      lines.push(`${indent}${padded} ${f.goType.padEnd(14)} ${f.jsonTag} ${f.comment}`);
    }
    lines.push('}');
    if (i < allStructs.length - 1) lines.push('');
  }

  return lines.join('\n');
}

// ── Sample Go code generator ──────────────────────────────────────────────

function generateSampleCode(value: unknown, indent: number): string {
  const pad = ' '.repeat(indent);
  const padInner = ' '.repeat(indent + 2);

  if (value === null) return 'nil';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return isFloat(value) ? String(value) : String(value);
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

  if (Array.isArray(value)) {
    if (value.length === 0) return `[]${(value as unknown[]).length === 0 ? '' : ''}{}`;
    const items = (value as unknown[]).map((v) => `${padInner}${generateSampleCode(v, indent + 2)}`);
    return `{\n${items.join(',\n')},\n${pad}}`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([k, v]) => {
      const fieldName = sanitizeFieldName(k);
      const val = generateSampleCode(v, indent);
      return `${pad}${fieldName}: ${val}`;
    });
    return '{\n' + lines.join(',\n') + ',\n}';
  }

  return String(value);
}

function generateUsageExample(input: string, structName: string, options: Options): string {
  const lines: string[] = [];
  lines.push('package main');
  lines.push('');
  lines.push('import (');
  lines.push('    "encoding/json"');
  lines.push('    "fmt"');
  lines.push(')');
  lines.push('');
  lines.push('func main() {');
  lines.push(`    input := \`${input.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\``);
  lines.push(`    var data ${structName}`);
  lines.push('    err := json.Unmarshal([]byte(input), &data)');
  lines.push('    if err != nil {');
  lines.push('        panic(err)');
  lines.push('    }');
  lines.push('    fmt.Printf("%+v\\n", data)');
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
  "tags": ["typescript", "go", "nextjs"],
  "role": "admin",
  "profile": {
    "avatar_url": "https://cdn.example.com/avatars/jane.jpg",
    "bio": "Full-stack developer",
    "preferences": {
      "theme": "dark",
      "email_notifications": true,
      "language": "en"
    }
  },
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with Go",
      "published": true,
      "views": 1520,
      "metadata": {
        "tags": ["go", "tutorial"],
        "rating": 4.8
      }
    },
    {
      "id": 2,
      "title": "Advanced Patterns",
      "published": false,
      "views": 890,
      "metadata": {
        "tags": ["go", "advanced"],
        "rating": 4.5
      }
    }
  ],
  "metadata": null,
  "emptyArray": []
}`;

// ── Component ─────────────────────────────────────────────────────────────

export default function JSONToGoPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>({
    rootTypeName: 'Root',
    usePointers: true,
    omitEmpty: false,
    indentSpaces: 2,
    includeSampleData: false,
  });
  const [activeTab, setActiveTab] = useState<'structs' | 'sample'>('structs');

  const { structs, output, error, sampleOutput, usageOutput } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const allStructs: StructDef[] = [];
      buildStructs(parsed, options.rootTypeName, options, allStructs);

      const goOutput = formatGoStructs(allStructs, options);

      let sample = '';
      let usage = '';
      if (options.includeSampleData) {
        const structName = pascalCase(options.rootTypeName);
        usage = generateUsageExample(input, structName, options);
      }

      return {
        structs: allStructs,
        output: goOutput,
        error: null as string | null,
        sampleOutput: sample,
        usageOutput: usage,
      };
    } catch (e) {
      return {
        structs: [] as StructDef[],
        output: '',
        error: (e as Error).message,
        sampleOutput: '',
        usageOutput: '',
      };
    }
  }, [input, options]);

  const structCount = structs.filter((s) => s.fields.length > 0).length;

  const handleCopy = useCallback(async () => {
    const text = activeTab === 'structs' ? output : usageOutput;
    if (!text) { toast.error('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [activeTab, output, usageOutput]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions({
      rootTypeName: 'Root',
      usePointers: true,
      omitEmpty: false,
      indentSpaces: 2,
      includeSampleData: false,
    });
  }, []);

  const handleLoadSample = useCallback(() => setInput(SAMPLE_JSON), []);

  return (
    <ToolLayout
      title="JSON to Go Struct"
      description="Convert JSON data into idiomatic Go struct definitions — nested types, json tags, optional *pointers, and usage code. 100% client-side."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Root</label>
            <input
              type="text"
              value={options.rootTypeName}
              onChange={(e) => setOptions((o) => ({ ...o, rootTypeName: e.target.value || 'Root' }))}
              className="w-24 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 font-mono"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.usePointers}
              onChange={(e) => setOptions((o) => ({ ...o, usePointers: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            nullable → *pointer
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.omitEmpty}
              onChange={(e) => setOptions((o) => ({ ...o, omitEmpty: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            omitempty
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.includeSampleData}
              onChange={(e) => setOptions((o) => ({ ...o, includeSampleData: e.target.checked }))}
              className="rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            include usage
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-mono">
              {error ? (
                <span className="text-red-400">Invalid JSON</span>
              ) : (
                <span className="text-green-400">{structCount} struct{structCount !== 1 ? 's' : ''}</span>
              )}
            </span>
            <button onClick={handleReset} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="Reset">
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
            <button onClick={handleLoadSample} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
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
              Go Output
            </label>
            <div className="flex items-center gap-2">
              {usageOutput && (
                <div className="flex rounded bg-slate-800 border border-slate-700 p-0.5">
                  <button
                    onClick={() => setActiveTab('structs')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      activeTab === 'structs' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Structs
                  </button>
                  <button
                    onClick={() => setActiveTab('sample')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                      activeTab === 'sample' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Usage
                  </button>
                </div>
              )}
              <button onClick={handleCopy} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="Copy">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-[500px] p-4 bg-slate-900 border border-slate-700 rounded-lg overflow-auto">
            {error ? (
              <pre className="text-sm text-red-400 font-mono whitespace-pre-wrap">{error}</pre>
            ) : activeTab === 'sample' && usageOutput ? (
              <pre className="text-sm text-slate-200 font-mono whitespace-pre">{usageOutput}</pre>
            ) : output ? (
              <pre className="text-sm text-slate-200 font-mono whitespace-pre">{output}</pre>
            ) : (
              <p className="text-sm text-slate-500 italic">Enter valid JSON to generate Go structs</p>
            )}
          </div>
        </div>
      </div>

      {/* Struct summary */}
      {structs.filter(s => s.fields.length > 0).length > 1 && (
        <div className="mt-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Generated Structs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {structs
              .filter((s) => s.fields.length > 0)
              .map((s) => (
                <div key={s.name} className="px-3 py-2 rounded bg-slate-800 border border-slate-700">
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
