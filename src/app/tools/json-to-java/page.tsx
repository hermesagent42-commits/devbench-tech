'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ──────────────────────────────────────────────────────────

type JavaBasicType = 'String' | 'Integer' | 'Long' | 'Double' | 'Boolean' | 'Object';

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

function isLong(value: unknown): boolean {
  if (typeof value === 'string' && /^\d{10,}$/.test(value)) return true;
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value > 2147483647 || value < -2147483648;
  }
  return false;
}

function inferJavaType(value: unknown): JavaBasicType {
  if (value === null) return 'Object';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') {
    if (isFloat(value)) return 'Double';
    if (isLong(value)) return 'Long';
    return 'Integer';
  }
  if (typeof value === 'string') {
    if (/^\d{10,}$/.test(value)) return 'Long';
    return 'String';
  }
  return 'Object';
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
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

// ── Keyword handling ───────────────────────────────────────────────────────

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'var', 'record',
  'yield', 'sealed', 'permits', 'module', 'exports', 'requires', 'opens',
  'to', 'provides', 'uses', 'with',
]);

function sanitizeFieldName(name: string, naming: Options['fieldNaming']): string {
  const base = naming === 'camelCase' ? toCamelCase(name) : name;
  // ensure valid Java identifier
  let clean = base.replace(/[^a-zA-Z0-9_$]/g, '_');
  if (/^\d/.test(clean)) clean = '_' + clean;
  if (!clean) clean = 'field';
  if (JAVA_KEYWORDS.has(clean.toLowerCase())) clean = '_' + clean;
  return clean;
}

// ── POJO / Record generation ───────────────────────────────────────────────

type Serializer = 'jackson' | 'gson' | 'manual';

interface Options {
  rootTypeName: string;
  mode: 'record' | 'pojo';
  fieldNaming: 'camelCase' | 'original';
  serializer: Serializer;
  useLombok: boolean;
  generateGetters: boolean;
  generateSetters: boolean;
  useOptional: boolean;
  indentSpaces: number;
}

interface TypeDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  javaType: string;
  jsonProp: string;
  originalKey: string;
}

const SERIALIZER_INFO: Record<Serializer, { annotation: string; import_: string; fullAnnotation: string }> = {
  jackson: {
    annotation: 'JsonProperty',
    import_: 'import com.fasterxml.jackson.annotation.JsonProperty;',
    fullAnnotation: 'com.fasterxml.jackson.annotation.JsonProperty',
  },
  gson: {
    annotation: 'SerializedName',
    import_: 'import com.google.gson.annotations.SerializedName;',
    fullAnnotation: 'com.google.gson.annotations.SerializedName',
  },
  manual: {
    annotation: '',
    import_: '',
    fullAnnotation: '',
  },
};

const DEFAULT_OPTIONS: Options = {
  rootTypeName: 'Root',
  mode: 'record',
  fieldNaming: 'camelCase',
  serializer: 'jackson',
  useLombok: false,
  generateGetters: true,
  generateSetters: false,
  useOptional: false,
  indentSpaces: 4,
};

function getAnnotation(key: string, fieldName: string, serializer: Serializer): string {
  if (serializer === 'manual') return '';
  if (key === fieldName) return '';
  return `@${SERIALIZER_INFO[serializer].annotation}("${key}")`;
}

function buildTypes(
  value: unknown,
  typeName: string,
  options: Options,
  allTypes: TypeDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null) return 'Object';
  if (typeof value !== 'object') return inferJavaType(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<Object>';
    const first = value[0];
    if (Array.isArray(first)) {
      const nested = buildTypes(first, pascalCase(`${typeName}Item`), options, allTypes, seen);
      return `List<List<${nested}>>`;
    }
    if (typeof first === 'object' && first !== null) {
      const itemName = pascalCase(typeName.replace(/s$/, '') + 'Item');
      const existing = seen.get(first);
      if (existing) return `List<${existing}>`;
      const innerType = buildTypes(first, itemName, options, allTypes, seen);
      return `List<${innerType}>`;
    }
    const elemType = inferJavaType(first);
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

    let javaType: string;

    if (val === null) {
      javaType = 'Object';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        javaType = 'List<Object>';
      } else {
        const first = val[0];
        if (Array.isArray(first)) {
          const nested = buildTypes(first, pascalCase(`${key}Item`), options, allTypes, seen);
          javaType = `List<List<${nested}>>`;
        } else if (typeof first === 'object' && first !== null) {
          const itemName = pascalCase(key);
          const existing = seen.get(first);
          if (existing) {
            javaType = `List<${existing}>`;
          } else {
            const innerType = buildTypes(first, itemName, options, allTypes, seen);
            javaType = `List<${innerType}>`;
          }
        } else {
          javaType = `List<${inferJavaType(first)}>`;
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      const existing = seen.get(val);
      if (existing) {
        javaType = existing;
      } else {
        javaType = buildTypes(val, nestedName, options, allTypes, seen);
      }
    } else {
      javaType = inferJavaType(val);
    }

    const jsonProp = getAnnotation(key, fieldName, options.serializer);
    fields.push({ name: fieldName, javaType, jsonProp, originalKey: key });
  }

  const existingType = allTypes.find((t) => t.name === typeName);
  if (existingType) {
    for (const f of fields) {
      if (!existingType.fields.find((ef) => ef.name === f.name)) {
        existingType.fields.push(f);
      }
    }
  } else {
    allTypes.push({ name: typeName, fields });
  }

  return typeName;
}

function formatJavaTypes(allTypes: TypeDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const lines: string[] = [];

  // Collect all imports
  const imports = new Set<string>();
  const needsList = allTypes.some((t) => t.fields.some((f) => f.javaType.startsWith('List<')));
  if (needsList) imports.add('import java.util.List;');

  if (options.serializer !== 'manual') {
    const hasAnnotations = allTypes.some((t) => t.fields.some((f) => f.jsonProp));
    if (hasAnnotations) imports.add(SERIALIZER_INFO[options.serializer].import_);
  }

  if (options.useOptional) {
    const hasOptional = allTypes.some((t) => t.fields.some((f) => {
      const typeName = f.javaType.replace(/^List</, '').replace(/>$/, '');
      // If field could be null, wrap in Optional
      return f.javaType.startsWith('List<') ? !allTypes.some((at) => at.name === typeName) : true;
    }));
    if (hasOptional) imports.add('import java.util.Optional;');
  }

  if (options.useLombok && options.mode === 'pojo') {
    imports.add('import lombok.Data;');
    imports.add('import lombok.NoArgsConstructor;');
    imports.add('import lombok.AllArgsConstructor;');
    if (options.serializer === 'jackson' && !imports.has(SERIALIZER_INFO.jackson.import_)) {
      imports.add(SERIALIZER_INFO.jackson.import_);
    }
  }

  // package
  lines.push('package com.example.model;');
  lines.push('');
  if (imports.size > 0) {
    lines.push(...Array.from(imports).sort());
    lines.push('');
  }

  let first = true;

  for (const td of allTypes) {
    if (td.fields.length === 0) continue;
    if (!first) lines.push('');

    if (options.mode === 'record') {
      // Java Record
      lines.push(`public record ${td.name}(`);

      for (let i = 0; i < td.fields.length; i++) {
        const field = td.fields[i];
        let annotatedType = field.javaType;
        if (options.useOptional && !field.javaType.startsWith('List<')) {
          annotatedType = `Optional<${field.javaType}>`;
        }
        const comma = i < td.fields.length - 1 ? ',' : '';
        const jsonAnnot = field.jsonProp;

        if (jsonAnnot) {
          lines.push(`${indent}${jsonAnnot}`);
        }
        lines.push(`${indent}${annotatedType} ${field.name}${comma}`);
      }

      lines.push(') {}');
    } else if (options.useLombok) {
      // Lombok POJO
      const hasAnnotated = td.fields.some((f) => f.jsonProp);
      if (hasAnnotated && options.serializer === 'jackson') {
        lines.push('@Data');
        lines.push('@NoArgsConstructor');
        lines.push('@AllArgsConstructor');
      } else {
        lines.push('@Data');
        lines.push('@NoArgsConstructor');
        lines.push('@AllArgsConstructor');
      }
      lines.push(`public class ${td.name} {`);

      for (const field of td.fields) {
        let annotatedType = field.javaType;
        if (options.useOptional && !field.javaType.startsWith('List<')) {
          annotatedType = `Optional<${annotatedType}>`;
        }
        if (field.jsonProp) {
          lines.push(`${indent}${field.jsonProp}`);
        }
        lines.push(`${indent}private ${annotatedType} ${field.name};`);
      }

      lines.push('}');
    } else {
      // Manual POJO
      lines.push(`public class ${td.name} {`);

      // Fields
      for (const field of td.fields) {
        if (field.jsonProp) {
          lines.push(`${indent}${field.jsonProp}`);
        }
        lines.push(`${indent}private ${field.javaType} ${field.name};`);
      }

      lines.push('');

      // Default constructor
      lines.push(`${indent}public ${td.name}() {}`);
      lines.push('');

      // All-args constructor
      const params = td.fields.map((f) => `${f.javaType} ${f.name}`).join(', ');
      lines.push(`${indent}public ${td.name}(${params}) {`);
      for (const field of td.fields) {
        lines.push(`${indent}${indent}this.${field.name} = ${field.name};`);
      }
      lines.push(`${indent}}`);
      lines.push('');

      // Getters
      if (options.generateGetters) {
        for (const field of td.fields) {
          const getterName = 'get' + field.name.charAt(0).toUpperCase() + field.name.slice(1);
          if (field.javaType === 'Boolean' || field.javaType === 'boolean') {
            const altName = 'is' + field.name.charAt(0).toUpperCase() + field.name.slice(1);
            lines.push(`${indent}public ${field.javaType} ${altName}() { return ${field.name}; }`);
          } else {
            lines.push(`${indent}public ${field.javaType} ${getterName}() { return ${field.name}; }`);
          }
        }
      }

      // Setters
      if (options.generateSetters) {
        for (const field of td.fields) {
          const setterName = 'set' + field.name.charAt(0).toUpperCase() + field.name.slice(1);
          lines.push(`${indent}public void ${setterName}(${field.javaType} ${field.name}) { this.${field.name} = ${field.name}; }`);
        }
      }

      lines.push('}');
    }

    first = false;
  }

  return lines.join('\n');
}

// ── Sample data ────────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": "usr_2aBc9XyZ",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "active": true,
  "score": 97.5,
  "tags": ["java", "spring-boot", "hibernate"],
  "role": "admin",
  "profile": {
    "avatar_url": "https://cdn.example.com/avatars/jane.jpg",
    "bio": "Java developer",
    "preferences": {
      "theme": "dark",
      "notifications": true,
      "language": "en"
    }
  },
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with Spring Boot",
      "slug": "getting-started-spring-boot",
      "published": true,
      "views": 1520,
      "metadata": {
        "tags": ["spring-boot", "tutorial"],
        "rating": 4.8
      }
    },
    {
      "id": 2,
      "title": "Reactive Java with Project Loom",
      "slug": "reactive-java-loom",
      "published": false,
      "views": 890,
      "metadata": {
        "tags": ["loom", "reactive"],
        "rating": 4.5
      }
    }
  ],
  "metadata": null,
  "created_at": "2026-05-30T12:00:00Z"
}`;

// ── Component ──────────────────────────────────────────────────────────────

export default function JSONToJavaPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);

  const { types, output, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const allTypes: TypeDef[] = [];
      buildTypes(parsed, options.rootTypeName, options, allTypes);

      const nonEmpty = allTypes.filter((t) => t.fields.length > 0);
      const javaCode = formatJavaTypes(nonEmpty, options);

      return {
        types: nonEmpty,
        output: javaCode,
        error: null as string | null,
      };
    } catch (e) {
      return {
        types: [] as TypeDef[],
        output: '',
        error: (e as Error).message,
      };
    }
  }, [input, options]);

  const typeCount = types.length;

  const handleCopy = useCallback(async () => {
    if (!output) { toast.error('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(output);
      toast.success('Copied Java code!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  const handleLoadSample = useCallback(() => setInput(SAMPLE_JSON), []);

  const serializers: { value: Serializer; label: string }[] = [
    { value: 'jackson', label: 'Jackson' },
    { value: 'gson', label: 'Gson' },
    { value: 'manual', label: 'None' },
  ];

  return (
    <ToolLayout
      title="JSON → Java"
      description="Convert JSON data into Java classes — Java Records (JDK 16+) or classic POJOs. Supports Jackson, Gson annotations, Lombok, Optionals, getters/setters, and nested types. 100% client-side."
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

          {/* Mode — record vs pojo */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Mode</label>
            <div className="flex rounded-lg bg-slate-950 border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setOptions((o) => ({ ...o, mode: 'record' }))}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  options.mode === 'record'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                record
              </button>
              <button
                onClick={() => setOptions((o) => ({ ...o, mode: 'pojo' }))}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  options.mode === 'pojo'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                POJO
              </button>
            </div>
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

          {/* Serializer */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">Serializer</label>
            <select
              value={options.serializer}
              onChange={(e) => setOptions((o) => ({ ...o, serializer: e.target.value as Serializer }))}
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {serializers.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          {options.mode === 'pojo' && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.useLombok}
                  onChange={(e) => setOptions((o) => ({ ...o, useLombok: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                />
                Lombok
              </label>
              {!options.useLombok && (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={options.generateGetters}
                      onChange={(e) => setOptions((o) => ({ ...o, generateGetters: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                    />
                    getters
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={options.generateSetters}
                      onChange={(e) => setOptions((o) => ({ ...o, generateSetters: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                    />
                    setters
                  </label>
                </>
              )}
            </>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useOptional}
              onChange={(e) => setOptions((o) => ({ ...o, useOptional: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
            />
            Optional
          </label>

          {/* Stats + reset */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-mono">
              {error ? (
                <span className="text-red-400">Invalid JSON</span>
              ) : (
                <span className="text-emerald-400">{typeCount} class{typeCount !== 1 ? 'es' : ''}</span>
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
                <span className="mr-1">
                  {options.mode === 'record' && '📦 JDK 16+'}
                  {options.mode === 'pojo' && options.useLombok && '📦 Lombok'}
                  {options.mode === 'pojo' && !options.useLombok && '📦 Standard Java'}
                </span>
                {options.serializer === 'jackson' && (
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs">
                    com.fasterxml.jackson.core:jackson-annotations
                  </code>
                )}
                {options.serializer === 'gson' && (
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs">
                    com.google.code.gson:gson
                  </code>
                )}
                {options.mode === 'pojo' && options.useLombok && (
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs ml-2">
                    org.projectlombok:lombok
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
              Java Output
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
              {error ? 'Fix JSON errors to see output' : 'Paste JSON to generate Java classes'}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
