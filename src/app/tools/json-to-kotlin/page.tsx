'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

type KotlinBasicType = 'String' | 'Int' | 'Long' | 'Double' | 'Boolean' | 'Any';

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

function inferKotlinType(value: unknown): KotlinBasicType {
  if (value === null) return 'Any';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') return isFloat(value) ? 'Double' : 'Int';
  if (typeof value === 'string') {
    // Heuristic: if string looks like a long number, use Long
    if (/^\d{10,}$/.test(value)) return 'Long';
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

const KOTLIN_HARD_KEYWORDS = new Set([
  'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun',
  'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return',
  'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var',
  'when', 'while', 'typeof',
]);

const KOTLIN_SOFT_KEYWORDS = new Set([
  'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file',
  'finally', 'get', 'import', 'init', 'param', 'property', 'receiver',
  'set', 'setparam', 'where', 'actual', 'expect', 'override', 'sealed',
  'data', 'enum', 'inner', 'lateinit', 'open', 'annotation', 'companion',
]);

function sanitizeFieldName(name: string, naming: 'camelCase' | 'original'): string {
  if (naming === 'original') {
    // If already valid Kotlin identifier, keep it with backtick if needed
    const base = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const clean = base.replace(/^(\d)/, '_$1') || 'field';
    if (KOTLIN_HARD_KEYWORDS.has(clean.toLowerCase()) || KOTLIN_SOFT_KEYWORDS.has(clean.toLowerCase())) {
      return '`' + clean + '`';
    }
    return clean;
  }
  // camelCase: convert to camelCase
  let c = camelCase(name);
  // Ensure it doesn't start with a digit
  if (/^\d/.test(c)) c = '_' + c;
  if (KOTLIN_HARD_KEYWORDS.has(c.toLowerCase())) {
    return '`' + c + '`';
  }
  // For soft keywords, also backtick to be safe in data class context
  if (KOTLIN_SOFT_KEYWORDS.has(c.toLowerCase())) {
    return '`' + c + '`';
  }
  return c || 'field';
}

// ── Data class generation ─────────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  fieldNaming: 'camelCase' | 'original';
  useNullable: boolean;
  useSerialization: boolean;
  serializationLib: 'kotlinx' | 'gson' | 'moshi' | 'jackson';
  useVal: boolean;
  includeCompanion: boolean;
  indentSpaces: number;
}

interface DataClassDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  kotlinType: string;
  annotation: string;
  isNullable: boolean;
}

const DEFAULT_OPTIONS: Options = {
  rootTypeName: 'Root',
  fieldNaming: 'camelCase',
  useNullable: true,
  useSerialization: true,
  serializationLib: 'kotlinx',
  useVal: true,
  includeCompanion: false,
  indentSpaces: 4,
};

function getAnnotation(key: string, fieldName: string, options: Options): string {
  if (!options.useSerialization) return '';
  const needsRename = key !== fieldName && !fieldName.startsWith('`');
  if (!needsRename) {
    // Still emit annotation for kotlinx so field name matches JSON
    return '';
  }
  switch (options.serializationLib) {
    case 'kotlinx':
      return `@SerialName("${key}")`;
    case 'gson':
      return `@SerializedName("${key}")`;
    case 'moshi':
      return `@Json(name = "${key}")`;
    case 'jackson':
      return `@JsonProperty("${key}")`;
    default:
      return '';
  }
}

function buildDataClasses(
  value: unknown,
  typeName: string,
  options: Options,
  allClasses: DataClassDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null) return options.useNullable ? 'Any?' : 'Any';
  if (typeof value !== 'object') return inferKotlinType(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return options.useNullable ? 'List<Any?>?' : 'List<Any>';
    const first = value[0];
    if (Array.isArray(first)) {
      const nested = buildDataClasses(first, pascalCase(`${typeName}Item`), options, allClasses, seen);
      return `List<List<${nested}>>`;
    }
    if (typeof first === 'object' && first !== null) {
      const itemName = pascalCase(typeName.replace(/s$/, '') + 'Item');
      const existing = seen.get(first);
      if (existing) return `List<${existing}>`;
      const innerType = buildDataClasses(first, itemName, options, allClasses, seen);
      return `List<${innerType}>`;
    }
    const elemType = inferKotlinType(first);
    return `List<${elemType}>`;
  }

  const existing = seen.get(value);
  if (existing) return existing;
  seen.set(value, typeName);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];
  const keySet = new Set<string>();

  for (const [key, val] of Object.entries(obj)) {
    const fieldName = sanitizeFieldName(key, options.fieldNaming);
    if (keySet.has(fieldName)) continue;
    keySet.add(fieldName);

    let kotlinType: string;
    let isNullable = false;

    if (val === null) {
      kotlinType = options.useNullable ? 'Any?' : 'Any';
      isNullable = true;
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        kotlinType = options.useNullable ? 'List<Any?>?' : 'List<Any>';
      } else {
        const first = val[0];
        if (Array.isArray(first)) {
          const nested = buildDataClasses(first, pascalCase(`${key}Item`), options, allClasses, seen);
          kotlinType = `List<List<${nested}>>`;
        } else if (typeof first === 'object' && first !== null) {
          const itemName = pascalCase(key);
          const existing = seen.get(first);
          if (existing) {
            kotlinType = `List<${existing}>`;
          } else {
            const innerType = buildDataClasses(first, itemName, options, allClasses, seen);
            kotlinType = `List<${innerType}>`;
          }
        } else {
          const elemType = inferKotlinType(first);
          kotlinType = `List<${elemType}>`;
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      const existing = seen.get(val);
      if (existing) {
        kotlinType = existing;
      } else {
        kotlinType = buildDataClasses(val, nestedName, options, allClasses, seen);
      }
    } else {
      kotlinType = inferKotlinType(val);
    }

    const annotation = getAnnotation(key, fieldName, options);
    fields.push({ name: fieldName, kotlinType, annotation, isNullable });
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

function formatKotlinDataClasses(allClasses: DataClassDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const importLines: string[] = [];

  // Determine which imports are needed
  const hasAnnotations = allClasses.some((c) => c.fields.some((f) => f.annotation));
  if (hasAnnotations) {
    switch (options.serializationLib) {
      case 'kotlinx':
        importLines.push('import kotlinx.serialization.Serializable');
        importLines.push('import kotlinx.serialization.SerialName');
        break;
      case 'gson':
        importLines.push('import com.google.gson.annotations.SerializedName');
        break;
      case 'moshi':
        importLines.push('import com.squareup.moshi.Json');
        break;
      case 'jackson':
        importLines.push('import com.fasterxml.jackson.annotation.JsonProperty');
        break;
    }
  }

  const lines: string[] = [];

  // Package declaration
  lines.push('package com.example.model');
  lines.push('');

  // Imports
  if (importLines.length > 0) {
    lines.push(...importLines);
    lines.push('');
  }

  const valOrVar = options.useVal ? 'val' : 'var';
  let first = true;

  for (const dc of allClasses) {
    if (dc.fields.length === 0) continue;
    if (!first) lines.push('');

    // @Serializable annotation
    if (options.useSerialization && options.serializationLib === 'kotlinx') {
      lines.push('@Serializable');
    }

    lines.push(`data class ${dc.name}(`);

    const maxNameLen = Math.max(...dc.fields.map((f) => f.name.length));
    const maxTypeLen = Math.max(...dc.fields.map((f) => f.kotlinType.length));

    for (let i = 0; i < dc.fields.length; i++) {
      const field = dc.fields[i];
      const comma = i < dc.fields.length - 1 ? ',' : '';
      const namePadded = field.name.padEnd(maxNameLen + 1);
      const typePadded = field.kotlinType.padEnd(maxTypeLen + 1);

      if (field.annotation) {
        lines.push(`${indent}${field.annotation}`);
      }
      lines.push(`${indent}${valOrVar} ${namePadded}: ${typePadded}${comma}`);
    }

    lines.push(')');

    if (options.includeCompanion) {
      lines.push('');
      lines.push(`${indent}companion object {`);
      lines.push(`${indent}${indent}fun fromJson(json: String): ${dc.name} {`);
      if (options.useSerialization && options.serializationLib === 'kotlinx') {
        lines.push(`${indent}${indent}${indent}return Json.decodeFromString(json)`);
      } else if (options.serializationLib === 'gson') {
        lines.push(`${indent}${indent}${indent}return Gson().fromJson(json, ${dc.name}::class.java)`);
      } else {
        lines.push(`${indent}${indent}${indent}// TODO: implement deserialization`);
        lines.push(`${indent}${indent}${indent}throw NotImplementedError()`);
      }
      lines.push(`${indent}${indent}}`);
      lines.push(`${indent}}`);
    }

    first = false;
  }

  return lines.join('\n');
}

// ── Sample data ───────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": "usr_2aBc9XyZ",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "active": true,
  "score": 97.5,
  "tags": ["kotlin", "android", "ktor"],
  "role": "admin",
  "profile": {
    "avatar_url": "https://cdn.example.com/avatars/jane.jpg",
    "bio": "Android developer",
    "preferences": {
      "theme": "dark",
      "notifications": true,
      "language": "en"
    }
  },
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with Ktor",
      "slug": "getting-started-ktor",
      "published": true,
      "views": 1520,
      "metadata": {
        "tags": ["ktor", "tutorial"],
        "rating": 4.8
      }
    },
    {
      "id": 2,
      "title": "Compose Multiplatform Guide",
      "slug": "compose-multiplatform",
      "published": false,
      "views": 890,
      "metadata": {
        "tags": ["compose", "multiplatform"],
        "rating": 4.5
      }
    }
  ],
  "metadata": null,
  "created_at": "2026-05-30T12:00:00Z"
}`;

// ── Component ─────────────────────────────────────────────────────────────

export default function JSONToKotlinPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);

  const { dataClasses, output, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const allClasses: DataClassDef[] = [];
      buildDataClasses(parsed, options.rootTypeName, options, allClasses);

      const nonEmpty = allClasses.filter((c) => c.fields.length > 0);
      const kotlinOutput = formatKotlinDataClasses(nonEmpty, options);

      return {
        dataClasses: nonEmpty,
        output: kotlinOutput,
        error: null as string | null,
      };
    } catch (e) {
      return {
        dataClasses: [] as DataClassDef[],
        output: '',
        error: (e as Error).message,
      };
    }
  }, [input, options]);

  const classCount = dataClasses.length;

  const handleCopy = useCallback(async () => {
    if (!output) { toast.error('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(output);
      toast.success('Copied Kotlin data classes!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  const handleLoadSample = useCallback(() => setInput(SAMPLE_JSON), []);

  const serializationLibs: { value: Options['serializationLib']; label: string }[] = [
    { value: 'kotlinx', label: 'kotlinx.serialization' },
    { value: 'gson', label: 'Gson' },
    { value: 'moshi', label: 'Moshi' },
    { value: 'jackson', label: 'Jackson' },
  ];

  return (
    <ToolLayout
      title="JSON → Kotlin Data Class"
      description="Convert JSON data into idiomatic Kotlin data classes — nested types, @SerialName annotations, nullable types, and serialization library support (kotlinx.serialization, Gson, Moshi, Jackson). 100% client-side."
    >
      {/* Options bar */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Root name */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">Root name</label>
            <input
              type="text"
              value={options.rootTypeName}
              onChange={(e) => setOptions((o) => ({ ...o, rootTypeName: e.target.value || 'Root' }))}
              className="w-28 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Field naming */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Fields</label>
            <div className="flex rounded-lg bg-slate-950 border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setOptions((o) => ({ ...o, fieldNaming: 'camelCase' }))}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  options.fieldNaming === 'camelCase'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                camelCase
              </button>
              <button
                onClick={() => setOptions((o) => ({ ...o, fieldNaming: 'original' }))}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  options.fieldNaming === 'original'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                original
              </button>
            </div>
          </div>

          {/* Serialization lib */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">Library</label>
            <select
              value={options.serializationLib}
              onChange={(e) => setOptions((o) => ({ ...o, serializationLib: e.target.value as Options['serializationLib'] }))}
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {serializationLibs.map((lib) => (
                <option key={lib.value} value={lib.value}>{lib.label}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useNullable}
              onChange={(e) => setOptions((o) => ({ ...o, useNullable: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
            />
            nullable
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useSerialization}
              onChange={(e) => setOptions((o) => ({ ...o, useSerialization: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
            />
            annotations
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useVal}
              onChange={(e) => setOptions((o) => ({ ...o, useVal: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
            />
            val (immutable)
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.includeCompanion}
              onChange={(e) => setOptions((o) => ({ ...o, includeCompanion: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
            />
            companion
          </label>

          {/* Stats + reset */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-mono">
              {error ? (
                <span className="text-red-400">Invalid JSON</span>
              ) : (
                <span className="text-emerald-400">{classCount} data class{classCount !== 1 ? 'es' : ''}</span>
              )}
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${
                showSettings
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Indent:</span>
                <div className="flex rounded-lg bg-slate-950 border border-slate-700/50 overflow-hidden">
                  {[2, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setOptions((o) => ({ ...o, indentSpaces: n }))}
                      className={`px-3 py-1 text-xs transition-colors ${
                        options.indentSpaces === n
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {n} spaces
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-slate-500">
                <span className="mr-1">📦</span>
                <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs">
                  {options.serializationLib === 'kotlinx' && 'implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")'}
                  {options.serializationLib === 'gson' && 'implementation("com.google.code.gson:gson:2.11.0")'}
                  {options.serializationLib === 'moshi' && 'implementation("com.squareup.moshi:moshi-kotlin:1.15.1")'}
                  {options.serializationLib === 'jackson' && 'implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.18.1")'}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main grid: input + output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Braces className="w-4 h-4 text-emerald-400" />
              JSON Input
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadSample}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Load sample
              </button>
              <span className="text-xs text-slate-500 font-mono">
                {input.length.toLocaleString()} chars
              </span>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder-slate-600"
            placeholder='Paste JSON here...'
            spellCheck={false}
          />
          {error && (
            <div className="mt-3 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <span className="shrink-0">❌</span>
              <span className="font-mono">{error}</span>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              Kotlin Output
            </h3>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <span className="text-xs text-slate-500 font-mono">
                    {output.split('\n').length} lines
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </>
              )}
            </div>
          </div>
          {output ? (
            <pre className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg p-4 overflow-auto font-mono text-sm text-slate-200">
              <code>{output}</code>
            </pre>
          ) : (
            <div className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-600 text-sm">
              {error ? 'Fix JSON errors to see output' : 'Paste JSON to generate Kotlin data classes'}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
