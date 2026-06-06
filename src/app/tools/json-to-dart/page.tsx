'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

type DartPrimitive = 'String' | 'int' | 'double' | 'bool' | 'dynamic';

function inferDartType(value: unknown): DartPrimitive {
  if (value === null) return 'dynamic';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
  if (typeof value === 'string') return 'String';
  return 'dynamic';
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

function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'key';
}

// ── Keyword handling ──────────────────────────────────────────────────────

const DART_KEYWORDS = new Set([
  'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch',
  'class', 'const', 'continue', 'covariant', 'default', 'deferred', 'do',
  'dynamic', 'else', 'enum', 'export', 'extends', 'extension', 'external',
  'factory', 'false', 'final', 'finally', 'for', 'function', 'get', 'hide',
  'if', 'implements', 'import', 'in', 'interface', 'is', 'late', 'library',
  'mixin', 'new', 'null', 'on', 'operator', 'part', 'required', 'rethrow',
  'return', 'set', 'show', 'static', 'super', 'switch', 'sync', 'this',
  'throw', 'true', 'try', 'typedef', 'var', 'void', 'when', 'while',
  'with', 'yield', 'sealed',
]);

function sanitizeFieldName(name: string, naming: 'camelCase' | 'snake_case'): string {
  let result: string;
  if (naming === 'camelCase') {
    result = camelCase(name);
  } else {
    result = snakeCase(name);
  }
  if (/^\d/.test(result)) result = '_' + result;
  if (DART_KEYWORDS.has(result)) result = result + '_';
  return result || 'field';
}

// ── Class generation ──────────────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  fieldNaming: 'camelCase' | 'snake_case';
  useNullSafety: boolean;
  useJsonSerializable: boolean;
  useFinal: boolean;
  includeToJson: boolean;
  includeFromJson: boolean;
  indentSpaces: number;
}

interface ClassDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  dartType: string;
  jsonKey: string;
  hasJsonKeyAnnotation: boolean;
}

const DEFAULT_OPTIONS: Options = {
  rootTypeName: 'Root',
  fieldNaming: 'camelCase',
  useNullSafety: true,
  useJsonSerializable: false,
  useFinal: true,
  includeToJson: true,
  includeFromJson: true,
  indentSpaces: 2,
};

function buildClasses(
  value: unknown,
  typeName: string,
  options: Options,
  allClasses: ClassDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null) return 'dynamic';
  if (typeof value !== 'object') return inferDartType(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return options.useNullSafety ? 'List<dynamic>?' : 'List<dynamic>';
    const first = value[0];
    if (Array.isArray(first)) {
      const nested = buildClasses(first, pascalCase(`${typeName}Item`), options, allClasses, seen);
      return `List<List<${nested}>>`;
    }
    if (typeof first === 'object' && first !== null) {
      const itemName = pascalCase(typeName.replace(/s$/, '') + 'Item');
      const existing = seen.get(first);
      if (existing) return `List<${existing}>`;
      const innerType = buildClasses(first, itemName, options, allClasses, seen);
      return `List<${innerType}>`;
    }
    const elemType = inferDartType(first);
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

    let dartType: string;
    const nullSafe = options.useNullSafety;

    if (val === null) {
      dartType = nullSafe ? 'dynamic?' : 'dynamic';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        dartType = nullSafe ? 'List<dynamic>?' : 'List<dynamic>';
      } else {
        const first = val[0];
        if (Array.isArray(first)) {
          const nested = buildClasses(first, pascalCase(`${key}Item`), options, allClasses, seen);
          dartType = `List<List<${nested}>>`;
        } else if (typeof first === 'object' && first !== null) {
          const itemName = pascalCase(key);
          const existing = seen.get(first);
          if (existing) {
            dartType = `List<${existing}>`;
          } else {
            const innerType = buildClasses(first, itemName, options, allClasses, seen);
            dartType = `List<${innerType}>`;
          }
        } else {
          dartType = `List<${inferDartType(first)}>`;
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      const existing = seen.get(val);
      if (existing) {
        dartType = existing;
      } else {
        dartType = buildClasses(val, nestedName, options, allClasses, seen);
      }
    } else {
      dartType = inferDartType(val);
    }

    const needsJsonKey = options.useJsonSerializable && key !== fieldName;

    fields.push({
      name: fieldName,
      dartType,
      jsonKey: key,
      hasJsonKeyAnnotation: !!needsJsonKey,
    });
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

function formatDartOutput(allClasses: ClassDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const lines: string[] = [];

  if (options.useJsonSerializable) {
    lines.push("import 'package:json_annotation/json_annotation.dart';");
    lines.push('');
    lines.push("part 'filename.g.dart';");
    lines.push('');
  }

  const modifier = options.useFinal ? 'final' : '';
  let first = true;

  for (const dc of allClasses) {
    if (dc.fields.length === 0) continue;
    if (!first) lines.push('');

    if (options.useJsonSerializable) {
      lines.push('@JsonSerializable()');
    }

    lines.push(`class ${dc.name} {`);

    // Fields
    for (const field of dc.fields) {
      if (field.hasJsonKeyAnnotation) {
        lines.push(`${indent}@JsonKey(name: '${field.jsonKey}')`);
      }
      lines.push(`${indent}${modifier} ${field.dartType} ${field.name};`);
    }

    lines.push('');

    // Constructor
    const constructorParams = dc.fields.map((f) => {
      const optional = (f.dartType.endsWith('?') || f.dartType === 'dynamic') && options.useNullSafety;
      const req = optional ? '' : 'required ';
      return `${req}this.${f.name}`;
    });
    lines.push(`${indent}${dc.name}({${constructorParams.join(', ')}});`);
    lines.push('');

    // fromJson factory
    if (options.includeFromJson) {
      if (options.useJsonSerializable) {
        lines.push(`${indent}factory ${dc.name}.fromJson(Map<String, dynamic> json) =>`);
        lines.push(`${indent}${indent}_$${dc.name}FromJson(json);`);
      } else {
        lines.push(`${indent}factory ${dc.name}.fromJson(Map<String, dynamic> json) {`);
        lines.push(`${indent}${indent}return ${dc.name}(`);
        for (const field of dc.fields) {
          const dartType = field.dartType.replace('?', '');
          if (dartType.startsWith('List<')) {
            const inner = dartType.match(/List<(.+)>/)?.[1] ?? 'dynamic';
            if (['String', 'int', 'double', 'bool', 'dynamic'].includes(inner)) {
              lines.push(`${indent}${indent}${indent}${field.name}: (json['${field.jsonKey}'] as List<dynamic>?)?.cast<${inner}>() ?? [],`);
            } else {
              lines.push(`${indent}${indent}${indent}${field.name}: (json['${field.jsonKey}'] as List<dynamic>?)`);
              lines.push(`${indent}${indent}${indent}${indent}?.map((e) => ${inner}.fromJson(e as Map<String, dynamic>))`);
              lines.push(`${indent}${indent}${indent}${indent}.toList() ?? [],`);
            }
          } else if (['String', 'int', 'double', 'bool', 'dynamic'].includes(dartType)) {
            const castMap: Record<string, string> = {
              String: 'String', int: 'int', double: 'double', bool: 'bool', dynamic: 'dynamic',
            };
            const cast = castMap[dartType] || 'dynamic';
            lines.push(`${indent}${indent}${indent}${field.name}: json['${field.jsonKey}'] as ${cast},`);
          } else {
            lines.push(`${indent}${indent}${indent}${field.name}: json['${field.jsonKey}'] != null`);
            lines.push(`${indent}${indent}${indent}${indent}? ${dartType}.fromJson(json['${field.jsonKey}'] as Map<String, dynamic>)`);
            lines.push(`${indent}${indent}${indent}${indent}: null,`);
          }
        }
        lines.push(`${indent}${indent});`);
        lines.push(`${indent}}`);
      }
      lines.push('');
    }

    // toJson method
    if (options.includeToJson) {
      if (options.useJsonSerializable) {
        lines.push(`${indent}Map<String, dynamic> toJson() => _$${dc.name}ToJson(this);`);
      } else {
        lines.push(`${indent}Map<String, dynamic> toJson() {`);
        lines.push(`${indent}${indent}return {`);
        for (const field of dc.fields) {
          const dartType = field.dartType.replace('?', '');
          if (dartType.startsWith('List<')) {
            const inner = dartType.match(/List<(.+)>/)?.[1] ?? 'dynamic';
            if (['String', 'int', 'double', 'bool', 'dynamic'].includes(inner)) {
              lines.push(`${indent}${indent}${indent}'${field.jsonKey}': ${field.name},`);
            } else {
              lines.push(`${indent}${indent}${indent}'${field.jsonKey}': ${field.name}?.map((e) => e.toJson()).toList(),`);
            }
          } else if (['String', 'int', 'double', 'bool', 'dynamic'].includes(dartType)) {
            lines.push(`${indent}${indent}${indent}'${field.jsonKey}': ${field.name},`);
          } else {
            lines.push(`${indent}${indent}${indent}'${field.jsonKey}': ${field.name}?.toJson(),`);
          }
        }
        lines.push(`${indent}${indent}};`);
        lines.push(`${indent}}`);
      }
    }

    lines.push('}');
    first = false;
  }

  return lines.join('\n');
}

// ── Sample data ───────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": "usr_2aBc9XyZ",
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "is_active": true,
  "score": 97.5,
  "tags": ["dart", "flutter", "mobile"],
  "role": "admin",
  "profile": {
    "avatar_url": "https://cdn.example.com/avatars/jane.jpg",
    "bio": "Flutter developer",
    "preferences": {
      "theme": "dark",
      "notifications_enabled": true,
      "language": "en"
    }
  },
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with Flutter",
      "slug": "getting-started-flutter",
      "published": true,
      "view_count": 1520,
      "metadata": {
        "tags": ["flutter", "tutorial"],
        "rating": 4.8
      }
    },
    {
      "id": 2,
      "title": "Dart Null Safety Guide",
      "slug": "dart-null-safety",
      "published": false,
      "view_count": 890,
      "metadata": {
        "tags": ["dart", "basics"],
        "rating": 4.5
      }
    }
  ],
  "metadata": null,
  "created_at": "2026-05-30T12:00:00Z"
}`;

// ── Highlight helper ──────────────────────────────────────────────────────

function highlightDart(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let result = escaped;

  // Keywords
  result = result.replace(
    /\b(import|export|class|factory|final|const|var|this|return|required|void|dynamic|static|@override|Map|List|Set|String|int|double|bool|null|true|false|part|as|is|new|function|typedef|extension|mixin|abstract|enum|super|if|else|switch|case|break|continue|for|while|do|try|catch|throw|rethrow|finally|async|await|yield|hide|show|on|with|implements|extends|library|typedef|external|get|set|operator|assert|covariant|late|sealed|base|interface|required)\b/g,
    (m) => `<span class="text-purple-400">${m}</span>`
  );

  // Annotations
  result = result.replace(
    /(@\w+(?:\([^)]*\))?)/g,
    '<span class="text-amber-400">$1</span>'
  );

  // String literals
  result = result.replace(
    /('[^']*'|"[^"]*")/g,
    '<span class="text-green-400">$&</span>'
  );

  // Numbers
  result = result.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="text-amber-400">$1</span>'
  );

  // Class names after 'class' keyword
  result = result.replace(
    /\bclass\s+([A-Z][a-zA-Z0-9_]*)\b/g,
    'class <span class="text-brand-400">$1</span>'
  );

  // Built-in types
  result = result.replace(
    /\b(String|int|double|bool|dynamic|void|List|Map|Set)\b/g,
    '<span class="text-sky-300">$1</span>'
  );

  // Comments
  result = result.replace(
    /(\/\/.*$)/gm,
    '<span class="text-slate-500">$1</span>'
  );

  // JSON key access
  result = result.replace(
    /(json\[(?:'[^']*'|"[^"]*")\])/g,
    '<span class="text-amber-300">$1</span>'
  );

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function JsonToDartPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);

  const { dataClasses, output, error } = useMemo(() => {
    if (!input.trim()) {
      return { dataClasses: [] as ClassDef[], output: '', error: null };
    }
    try {
      const parsed = JSON.parse(input.trim());
      const allClasses: ClassDef[] = [];
      buildClasses(parsed, options.rootTypeName, options, allClasses);

      const nonEmpty = allClasses.filter((c) => c.fields.length > 0);
      const dartOutput = formatDartOutput(nonEmpty, options);

      return {
        dataClasses: nonEmpty,
        output: dartOutput,
        error: null as string | null,
      };
    } catch (e) {
      return {
        dataClasses: [] as ClassDef[],
        output: '',
        error: (e as Error).message,
      };
    }
  }, [input, options]);

  const classCount = dataClasses.length;
  const highlighted = useMemo(() => highlightDart(output), [output]);

  const handleCopy = useCallback(async () => {
    if (!output) { toast.error('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(output);
      toast.success('Copied Dart classes!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  return (
    <ToolLayout
      title="JSON → Dart"
      description="Convert JSON data into Dart classes with fromJson/toJson — nested types, null safety, json_serializable annotations, camelCase/snake_case field naming, and factory constructors. 100% client-side."
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
              className="w-28 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
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
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                camelCase
              </button>
              <button
                onClick={() => setOptions((o) => ({ ...o, fieldNaming: 'snake_case' }))}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  options.fieldNaming === 'snake_case'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                snake_case
              </button>
            </div>
          </div>

          {/* Toggles */}
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useNullSafety}
              onChange={(e) => setOptions((o) => ({ ...o, useNullSafety: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            null safety
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useFinal}
              onChange={(e) => setOptions((o) => ({ ...o, useFinal: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            final
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.includeFromJson}
              onChange={(e) => setOptions((o) => ({ ...o, includeFromJson: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            fromJson
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.includeToJson}
              onChange={(e) => setOptions((o) => ({ ...o, includeToJson: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            toJson
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useJsonSerializable}
              onChange={(e) => setOptions((o) => ({ ...o, useJsonSerializable: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            json_serializable
          </label>

          {/* Stats + actions */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-mono">
              {error ? (
                <span className="text-red-400">Invalid JSON</span>
              ) : (
                <span className="text-blue-400">{classCount} class{classCount !== 1 ? 'es' : ''}</span>
              )}
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${
                showSettings
                  ? 'bg-blue-500/20 text-blue-400'
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
                          ? 'bg-blue-500/20 text-blue-400'
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
                {options.useJsonSerializable ? (
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs">
                    dart pub add json_annotation json_serializable build_runner
                  </code>
                ) : (
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs">
                    Zero dependencies — pure Dart, no packages needed
                  </code>
                )}
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
              <Braces className="w-4 h-4 text-blue-400" />
              JSON Input
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInput(SAMPLE_JSON)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
            className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors placeholder-slate-600"
            placeholder="Paste JSON here..."
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
              <FileCode className="w-4 h-4 text-blue-400" />
              Dart Output
            </h3>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <span className="text-xs text-slate-500 font-mono">
                    {output.split('\n').length} lines
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
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
              <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
          ) : (
            <div className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-600 text-sm">
              {error ? 'Fix JSON errors to see output' : 'Paste JSON to generate Dart classes'}
            </div>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card border-l-4 border-l-blue-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Dart Class Output</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Generates proper Dart classes with final fields</li>
            <li>• <code className="text-blue-400 bg-surface px-1 py-0.5 rounded text-[11px]">fromJson</code> factory constructors for deserialization</li>
            <li>• <code className="text-blue-400 bg-surface px-1 py-0.5 rounded text-[11px]">toJson</code> methods for serialization</li>
            <li>• Null safety: nullable types for fields that can be null</li>
            <li>• Nested objects become separate classes with automatic wiring</li>
            <li>• Arrays of objects map to <code className="text-blue-400 bg-surface px-1 py-0.5 rounded text-[11px]">List&lt;Type&gt;</code> with nested fromJson</li>
          </ul>
        </div>
        <div className="card border-l-4 border-l-green-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Usage in Flutter</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• <code className="text-green-400 bg-surface px-1 py-0.5 rounded text-[11px]">json_serializable</code> mode generates annotations — run <code className="text-green-400 bg-surface px-1 py-0.5 rounded text-[11px]">dart run build_runner build</code></li>
            <li>• Manual mode has zero dependencies — pure Dart, works everywhere</li>
            <li>• Choose <code className="text-green-400 bg-surface px-1 py-0.5 rounded text-[11px]">camelCase</code> or <code className="text-green-400 bg-surface px-1 py-0.5 rounded text-[11px]">snake_case</code> field naming</li>
            <li>• Toggle <code className="text-green-400 bg-surface px-1 py-0.5 rounded text-[11px]">final</code> for immutable classes</li>
            <li>• All processing happens in your browser — no data sent anywhere</li>
          </ul>
        </div>
      </div>
    </ToolLayout>
  );
}
