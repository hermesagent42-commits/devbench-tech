'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

function isInteger(value: unknown): boolean {
  return Number.isInteger(value);
}

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

type TSBasicType = 'string' | 'number' | 'boolean' | 'null' | 'any';

function inferTSType(value: unknown): TSBasicType {
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

function sanitizeKey(key: string, style: Options['keyStyle']): string {
  // If key needs quoting (has special chars), keep original and quote it
  if (/[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key)) {
    return `"${key}"`;
  }
  if (style === 'camelCase') return toCamelCase(key);
  return key; // preserve
}

// ── Interface/type generation ─────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  useInterface: boolean;
  exportTypes: boolean;
  optionalFields: boolean;
  keyStyle: 'preserve' | 'camelCase';
  indentSpaces: number;
  includeSampleData: boolean;
}

interface TypeDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  key: string;
  tsType: string;
  optional: boolean;
}

function generateTypes(
  value: unknown,
  typeName: string,
  options: Options,
  allTypes: TypeDef[],
  seen: Set<unknown> = new Set()
): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') return inferTSType(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const first = value[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      const nestedName = pascalCase(typeName.endsWith('Item') ? typeName : `${typeName}Item`);
      generateTypes(first, nestedName, options, allTypes);
      return `${nestedName}[]`;
    } else if (Array.isArray(first)) {
      const nestedName = pascalCase(`${typeName}Item`);
      const inner = generateTypes(first, nestedName, options, allTypes);
      return `${inner}[]`;
    } else {
      return `${inferTSType(first)}[]`;
    }
  }

  // Object
  if (seen.has(value)) return typeName;
  seen.add(value);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];

  for (const [key, val] of Object.entries(obj)) {
    const sanitized = sanitizeKey(key, options.keyStyle);
    const optional = val === null || options.optionalFields;

    if (val === null) {
      fields.push({ key: sanitized, tsType: 'null', optional: true });
      continue;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) {
        fields.push({ key: sanitized, tsType: 'unknown[]', optional });
      } else {
        const first = val[0];
        if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
          const nestedName = pascalCase(key);
          generateTypes(first, nestedName, options, allTypes);
          fields.push({ key: sanitized, tsType: `${nestedName}[]`, optional });
        } else {
          const scalar = inferTSType(first);
          fields.push({ key: sanitized, tsType: `${scalar}[]`, optional });
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      generateTypes(val, nestedName, options, allTypes);
      fields.push({ key: sanitized, tsType: nestedName, optional });
    } else {
      fields.push({ key: sanitized, tsType: inferTSType(val), optional });
    }
  }

  // Check if type already exists and merge fields
  const existing = allTypes.find((t) => t.name === typeName);
  if (existing) {
    for (const f of fields) {
      if (!existing.fields.find((ef) => ef.key === f.key)) {
        existing.fields.push(f);
      }
    }
  } else {
    allTypes.push({ name: typeName, fields });
  }

  return typeName;
}

function formatTypeScript(
  allTypes: TypeDef[],
  options: Options
): string {
  const indent = ' '.repeat(options.indentSpaces);
  const keyword = options.useInterface ? 'interface' : 'type';
  const prefix = options.exportTypes ? 'export ' : '';
  let output = '';

  for (let i = 0; i < allTypes.length; i++) {
    const t = allTypes[i];
    // Use interface syntax for interfaces, type syntax for types
    if (keyword === 'interface') {
      output += `${prefix}interface ${t.name} {\n`;
      for (const f of t.fields) {
        const opt = f.optional ? '?' : '';
        output += `${indent}${f.key}${opt}: ${f.tsType};\n`;
      }
      output += `}\n`;
    } else {
      output += `${prefix}type ${t.name} = {\n`;
      for (const f of t.fields) {
        const opt = f.optional ? '?' : '';
        output += `${indent}${f.key}${opt}: ${f.tsType};\n`;
      }
      output += `};\n`;
    }
    if (i < allTypes.length - 1) output += '\n';
  }

  return output;
}

function formatSampleData(
  value: unknown,
  indent: number,
  depth: number = 0
): string {
  const pad = ' '.repeat(indent * depth);
  const padInner = ' '.repeat(indent * (depth + 1));

  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value}'`;

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => formatSampleData(v, indent, depth)).join(`,\n${padInner}`);
    return `[\n${padInner}${items},\n${pad}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([k, v]) => {
      const val = formatSampleData(v, indent, depth + 1);
      return `${padInner}${/[\s\W]/.test(k) ? `"${k}"` : k}: ${val}`;
    });
    return `{\n${lines.join(',\n')},\n${pad}}`;
  }

  return String(value);
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
  "tags": ["typescript", "react", "nextjs"],
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
      "title": "Hello World",
      "slug": "hello-world",
      "tags": ["typescript", "tutorial"],
      "published": true,
      "viewCount": 1523,
      "metadata": {
        "seo_title": "Hello World - DevBench Blog",
        "description": "My first blog post"
      }
    }
  ],
  "metadata": null,
  "account_status": "active"
}`;

// ── Customizable samples ──────────────────────────────────────────────────

const SAMPLES: { name: string; json: string; typeName: string }[] = [
  { name: 'User API', json: SAMPLE_JSON, typeName: 'User' },
  {
    name: 'Config File',
    json: `{
  "app": {
    "name": "MyApp",
    "version": "2.1.0",
    "debug": false,
    "port": 3000
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "user": "admin",
    "password": "secret",
    "pool": {
      "min": 2,
      "max": 10
    }
  },
  "features": {
    "auth": true,
    "logging": true,
    "caching": false
  }
}`,
    typeName: 'AppConfig',
  },
  {
    name: 'Product Catalog',
    json: `{
  "products": [
    {
      "sku": "LAP-001",
      "name": "MacBook Pro 16",
      "price": 2499.99,
      "inStock": true,
      "specs": {
        "cpu": "M4 Max",
        "ram": "64GB",
        "storage": "2TB SSD"
      },
      "variants": [
        { "color": "Space Black", "sku": "LAP-001-BLK" },
        { "color": "Silver", "sku": "LAP-001-SLV" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total": 142
  }
}`,
    typeName: 'CatalogResponse',
  },
];

// ── Highlight helpers ─────────────────────────────────────────────────────

function highlightTS(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let result = escaped;

  // Keywords (export, interface, type, const, as, void)
  result = result.replace(
    /\b(export|interface|type|const|let|var|as|void|readonly|extends|implements)\b/g,
    (m) => `<span class="text-purple-400">${m}</span>`
  );

  // Type names (capitalized identifiers after keyword or at start of line)
  result = result.replace(
    /(?<=export (interface|type) |^interface |^type |^export interface |^export type )([A-Z][a-zA-Z0-9_]*)/gm,
    '<span class="text-brand-400">$2</span>'
  );

  // String literals
  result = result.replace(
    /(?:'[^']*'|"[^"]*"|`[^`]*`)/g,
    '<span class="text-green-400">$&</span>'
  );

  // Numbers
  result = result.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="text-amber-400">$1</span>'
  );

  // Booleans / null / undefined
  result = result.replace(
    /\b(true|false|null|undefined|unknown|never)\b/g,
    '<span class="text-purple-400">$1</span>'
  );

  // Built-in TS types
  result = result.replace(
    /\b(string|number|boolean|any|void)\b/g,
    '<span class="text-blue-400">$1</span>'
  );

  // Property names (identifiers followed by ?: or :)
  result = result.replace(
    /(^\s*)([a-zA-Z_$][\w$]*)(\??:)/gm,
    '$1<span class="text-sky-300">$2</span>$3'
  );

  // Comments
  result = result.replace(
    /(\/\/.*$)/gm,
    '<span class="text-slate-500">$1</span>'
  );

  return result;
}

// ── Main component ────────────────────────────────────────────────────────

export default function JSONToTypeScriptPage() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>({
    rootTypeName: 'User',
    useInterface: true,
    exportTypes: true,
    optionalFields: false,
    keyStyle: 'preserve',
    indentSpaces: 2,
    includeSampleData: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [selectedSample, setSelectedSample] = useState(0);

  const parseAndGenerate = useCallback(
    (input: string, opts: Options) => {
      if (!input.trim()) {
        setError(null);
        setOutput('');
        setSampleOutput('');
        return;
      }
      try {
        const parsed = JSON.parse(input);
        setError(null);

        const allTypes: TypeDef[] = [];
        generateTypes(parsed, opts.rootTypeName, opts, allTypes);
        const ts = formatTypeScript(allTypes, opts);
        setOutput(ts);

        if (opts.includeSampleData) {
          setSampleOutput(formatSampleData(parsed, opts.indentSpaces));
        } else {
          setSampleOutput('');
        }
      } catch (e) {
        setError((e as Error).message);
        setOutput('');
        setSampleOutput('');
      }
    },
    []
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setJsonInput(value);
      parseAndGenerate(value, options);
    },
    [options, parseAndGenerate]
  );

  const updateOption = useCallback(
    <K extends keyof Options>(key: K, value: Options[K]) => {
      const newOptions = { ...options, [key]: value };
      setOptions(newOptions);
      parseAndGenerate(jsonInput, newOptions);
    },
    [jsonInput, options, parseAndGenerate]
  );

  const copyOutput = useCallback(() => {
    if (!output) return;
    const full = output + (sampleOutput ? '\n\n' + sampleOutput : '');
    navigator.clipboard.writeText(full).then(
      () => toast.success('TypeScript copied!'),
      () => toast.error('Failed to copy')
    );
  }, [output, sampleOutput]);

  const reset = useCallback(() => {
    const defaults: Options = {
      rootTypeName: 'User',
      useInterface: true,
      exportTypes: true,
      optionalFields: false,
      keyStyle: 'preserve',
      indentSpaces: 2,
      includeSampleData: false,
    };
    setJsonInput(SAMPLE_JSON);
    setOptions(defaults);
    setSelectedSample(0);
    parseAndGenerate(SAMPLE_JSON, defaults);
  }, [parseAndGenerate]);

  const loadSample = useCallback(
    (index: number) => {
      const sample = SAMPLES[index];
      setSelectedSample(index);
      setJsonInput(sample.json);
      const newOptions = { ...options, rootTypeName: sample.typeName };
      setOptions(newOptions);
      parseAndGenerate(sample.json, newOptions);
    },
    [options, parseAndGenerate]
  );

  const typeCount = useMemo(() => {
    if (!output) return 0;
    return (output.match(/^(export )?(interface|type) (\w+)/gm) || []).length;
  }, [output]);

  const highlighted = useMemo(() => highlightTS(output), [output]);

  return (
    <ToolLayout
      title="JSON to TypeScript"
      description="Convert JSON data into TypeScript interfaces or type aliases — nested objects become named types, arrays infer element types, full control over key casing, optionality, and exports. 100% client-side, zero dependencies."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={reset}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={copyOutput}
            disabled={!output}
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy TypeScript
          </button>
          {output && (
            <span className="text-xs text-slate-400 ml-auto tabular-nums">
              {typeCount} type{typeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: JSON Input + Options */}
        <div className="space-y-6">
          {/* Input */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Braces className="w-3.5 h-3.5 text-brand-400" />
              JSON Input
            </h2>

            {/* Sample picker */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {SAMPLES.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => loadSample(i)}
                  className={`px-2.5 py-1 text-[11px] rounded-md border transition-all font-medium ${
                    selectedSample === i
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder='{"key": "value"}'
              spellCheck={false}
              className="input-field w-full h-72 font-mono text-sm resize-none"
            />
            {error && (
              <p className="text-red-400 text-xs mt-2 font-mono">⚠ {error}</p>
            )}
            {!error && jsonInput.trim() && (
              <p className="text-green-400 text-xs mt-2">✓ Valid JSON</p>
            )}
          </div>

          {/* Options */}
          <div className="card space-y-5">
            <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-brand-400" />
              Options
            </h2>

            {/* Root type name */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Root Type Name
              </label>
              <input
                type="text"
                value={options.rootTypeName}
                onChange={(e) => updateOption('rootTypeName', e.target.value)}
                placeholder="MyType"
                className="input-field w-full text-sm py-2 font-mono"
              />
            </div>

            {/* Interface vs Type */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                Declaration Style
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateOption('useInterface', true)}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all font-mono ${
                    options.useInterface
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  interface
                </button>
                <button
                  onClick={() => updateOption('useInterface', false)}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all font-mono ${
                    !options.useInterface
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  type
                </button>
              </div>
            </div>

            {/* Key style */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">
                Key Casing
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateOption('keyStyle', 'preserve')}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all ${
                    options.keyStyle === 'preserve'
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Preserve
                </button>
                <button
                  onClick={() => updateOption('keyStyle', 'camelCase')}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all ${
                    options.keyStyle === 'camelCase'
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  camelCase
                </button>
              </div>
            </div>

            {/* Indent */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Indent Spaces
              </label>
              <div className="flex gap-2">
                {[2, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateOption('indentSpaces', n)}
                    className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all font-mono ${
                      options.indentSpaces === n
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                        : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox options */}
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.exportTypes}
                  onChange={(e) => updateOption('exportTypes', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Export types (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">export</code> keyword)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.optionalFields}
                  onChange={(e) =>
                    updateOption('optionalFields', e.target.checked)
                  }
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  All fields optional (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">?</code>)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.includeSampleData}
                  onChange={(e) =>
                    updateOption('includeSampleData', e.target.checked)
                  }
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Include sample data (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">const</code>) 
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: Output */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-brand-400" />
              TypeScript Output
            </h2>
            {output ? (
              <pre className="bg-slate-950 rounded-lg p-4 overflow-auto max-h-[500px] border border-slate-700/50">
                <code
                  className="text-sm font-mono text-slate-200 whitespace-pre"
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
                {sampleOutput && (
                  <code className="text-sm font-mono text-slate-200 whitespace-pre">
                    {'\n\n'}
                    <span className="text-purple-400">const </span>
                    <span className="text-brand-400">
                      {toCamelCase(options.rootTypeName)}Data
                    </span>
                    <span className="text-slate-200">: </span>
                    <span className="text-brand-400">
                      {options.rootTypeName}
                    </span>
                    <span className="text-slate-200"> = </span>
                    {'\n'}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: sampleOutput.replace(
                          /('[^']*')/g,
                          '<span class="text-green-400">$1</span>'
                        ).replace(
                          /\b(\d+\.?\d*)\b/g,
                          '<span class="text-amber-400">$1</span>'
                        ).replace(
                          /\b(true|false|null)\b/g,
                          '<span class="text-purple-400">$1</span>'
                        )
                      }}
                    />
                    <span>;</span>
                  </code>
                )}
              </pre>
            ) : (
              <div className="bg-slate-950 rounded-lg p-8 border border-slate-700/50 text-center">
                <p className="text-slate-500 text-sm">
                  {jsonInput.trim()
                    ? 'Invalid JSON — check input for errors'
                    : 'Enter JSON to generate TypeScript types'}
                </p>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">
              How it works
            </h2>
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>
                • Infers TypeScript primitives:{' '}
                <code className="text-blue-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  string
                </code>
                ,{' '}
                <code className="text-blue-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  number
                </code>
                ,{' '}
                <code className="text-blue-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  boolean
                </code>
                ,{' '}
                <code className="text-blue-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  any
                </code>
              </li>
              <li>
                • Nested objects become named{' '}
                <code className="text-purple-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  interface
                </code>{' '}
                /{' '}
                <code className="text-purple-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  type
                </code>{' '}
                declarations
              </li>
              <li>
                • Arrays infer their element type from the first item
              </li>
              <li>
                •{' '}
                <code className="text-purple-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  null
                </code>{' '}
                values produce nullable/optional fields
              </li>
              <li>
                • Merge support: repeated nested shapes combine fields into a
                single type
              </li>
              <li>
                • Preserve or camelCase key names — special characters are{' '}
                <code className="text-green-400 bg-surface px-1 py-0.5 rounded text-[11px]">
                  &quot;
                </code>
                -quoted
              </li>
              <li>
                • All processing happens in your browser — no data sent anywhere
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
