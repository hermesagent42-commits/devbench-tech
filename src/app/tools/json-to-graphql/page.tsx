'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Code2, Settings2, ArrowRightLeft, Braces, Network } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

function isInteger(value: unknown): boolean {
  return Number.isInteger(value) || (typeof value === 'string' && /^-?\d+$/.test(value));
}

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value)
    || (typeof value === 'string' && /^-?\d+\.\d+$/.test(value));
}

function inferGraphQLType(value: unknown, preferFloat: boolean): string | null {
  if (value === null) return null;
  if (typeof value === 'boolean') return 'Boolean';
  if (preferFloat && (isFloat(value) || isInteger(value))) return 'Float';
  if (isInteger(value)) return 'Int';
  if (isFloat(value)) return 'Float';
  if (typeof value === 'string') return 'String';
  if (typeof value === 'number') return 'Float';
  if (Array.isArray(value)) return null; // handled separately
  if (typeof value === 'object') return null; // custom type
  return 'String';
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Untyped';
}

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => i === 0 ? w.charAt(0).toLowerCase() + w.slice(1).toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'query';
}

// ── Schema generation ─────────────────────────────────────────────────────

interface GenOptions {
  rootTypeName: string;
  nullableFields: boolean;
  preferFloat: boolean;
  includeQuery: boolean;
  includeMutation: boolean;
  indentSpaces: number;
}

interface TypeDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  gqlType: string;
  required: boolean;
}

function generateTypes(
  value: unknown,
  typeName: string,
  options: GenOptions,
  allTypes: TypeDef[],
  seen: Set<unknown> = new Set()
): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return inferGraphQLType(value, options.preferFloat) || 'String';
  }

  // Guard against circular refs
  if (seen.has(value)) return typeName;
  seen.add(value);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];

  for (const [key, val] of Object.entries(obj)) {
    if (val === null) {
      fields.push({ name: key, gqlType: 'String', required: false });
      continue;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) {
        fields.push({ name: key, gqlType: '[String]', required: !options.nullableFields });
      } else {
        const first = val[0];
        if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
          const nestedName = pascalCase(key);
          generateTypes(first, nestedName, options, allTypes);
          fields.push({ name: key, gqlType: `[${nestedName}]`, required: !options.nullableFields });
        } else {
          const scalar = inferGraphQLType(first, options.preferFloat) || 'String';
          fields.push({ name: key, gqlType: `[${scalar}]`, required: !options.nullableFields });
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      generateTypes(val, nestedName, options, allTypes);
      fields.push({ name: key, gqlType: nestedName, required: !options.nullableFields });
    } else {
      const scalar = inferGraphQLType(val, options.preferFloat) || 'String';
      const req = !options.nullableFields;
      fields.push({ name: key, gqlType: scalar, required: req });
    }
  }

  // Check if type already exists and merge fields
  const existing = allTypes.find(t => t.name === typeName);
  if (existing) {
    // Merge any new fields
    for (const f of fields) {
      if (!existing.fields.find(ef => ef.name === f.name)) {
        existing.fields.push(f);
      }
    }
  } else {
    allTypes.push({ name: typeName, fields });
  }

  return typeName;
}

function formatGraphQLSDL(allTypes: TypeDef[], options: GenOptions): string {
  const indent = ' '.repeat(options.indentSpaces);
  let sdl = '';

  for (const t of allTypes) {
    sdl += `type ${t.name} {\n`;
    for (const f of t.fields) {
      const bang = f.required ? '!' : '';
      sdl += `${indent}${f.name}: ${f.gqlType}${bang}\n`;
    }
    sdl += `}\n\n`;
  }

  return sdl;
}

function formatQuery(rootTypeName: string, options: GenOptions): string {
  const camel = toCamelCase(rootTypeName);
  const indent = ' '.repeat(options.indentSpaces);
  return `type Query {\n${indent}${camel}(id: ID!): ${rootTypeName}\n${indent}all${pascalCase(camel)}s: [${rootTypeName}]\n}\n\n`;
}

function formatMutation(rootTypeName: string, options: GenOptions): string {
  const camel = toCamelCase(rootTypeName);
  const indent = ' '.repeat(options.indentSpaces);
  return `type Mutation {\n${indent}create${pascalCase(camel)}(input: ${rootTypeName}Input!): ${rootTypeName}\n${indent}update${pascalCase(camel)}(id: ID!, input: ${rootTypeName}Input!): ${rootTypeName}\n${indent}delete${pascalCase(camel)}(id: ID!): Boolean\n}\n`;
}

// ── Sample data ───────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": "usr_2aBc9XyZ",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "isActive": true,
  "role": "admin",
  "tags": ["typescript", "graphql"],
  "profile": {
    "avatar": "https://cdn.example.com/avatars/jane.jpg",
    "bio": "Full-stack developer",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  },
  "posts": [
    {
      "id": 1,
      "title": "Hello World",
      "tags": ["graphql", "apollo"],
      "published": true,
      "viewCount": 1523
    }
  ],
  "metadata": null
}`;

// ── Main component ────────────────────────────────────────────────────────

export default function JSONToGraphQLPage() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<GenOptions>({
    rootTypeName: 'User',
    nullableFields: false,
    preferFloat: false,
    includeQuery: true,
    includeMutation: true,
    indentSpaces: 2,
  });
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  const parseAndGenerate = useCallback(
    (input: string, opts: GenOptions) => {
      if (!input.trim()) {
        setError(null);
        setOutput('');
        return;
      }
      try {
        const parsed = JSON.parse(input);
        setError(null);

        const allTypes: TypeDef[] = [];
        generateTypes(parsed, opts.rootTypeName, opts, allTypes);

        let sdl = formatGraphQLSDL(allTypes, opts);

        if (opts.includeQuery) {
          sdl = formatQuery(opts.rootTypeName, opts) + sdl;
        }
        if (opts.includeMutation) {
          sdl += formatMutation(opts.rootTypeName, opts);
        }

        // Schema wrapper
        let result = '';
        if (opts.includeQuery || opts.includeMutation) {
          result += '# ── Schema ──\n\n';
          result += 'schema {\n  query: Query\n';
          if (opts.includeMutation) result += '  mutation: Mutation\n';
          result += '}\n\n';
        }
        result += sdl.trimEnd();

        setOutput(result);
      } catch (e) {
        setError((e as Error).message);
        setOutput('');
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
    <K extends keyof GenOptions>(key: K, value: GenOptions[K]) => {
      const newOptions = { ...options, [key]: value };
      setOptions(newOptions);
      parseAndGenerate(jsonInput, newOptions);
    },
    [jsonInput, options, parseAndGenerate]
  );

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('GraphQL schema copied!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const reset = useCallback(() => {
    const defaults: GenOptions = {
      rootTypeName: 'User',
      nullableFields: false,
      preferFloat: false,
      includeQuery: true,
      includeMutation: true,
      indentSpaces: 2,
    };
    setJsonInput(SAMPLE_JSON);
    setOptions(defaults);
    parseAndGenerate(SAMPLE_JSON, defaults);
  }, [parseAndGenerate]);

  const typeCount = useMemo(() => {
    if (!output) return 0;
    return (output.match(/^type \w+/gm) || []).length;
  }, [output]);

  return (
    <ToolLayout
      title="JSON to GraphQL Schema"
      description="Convert JSON data to GraphQL SDL type definitions — nested objects become named types, arrays with element type inference, optional Query/Mutation scaffolding. 100% client-side, zero dependencies."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={reset} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button onClick={copyOutput} disabled={!output} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy Schema
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
              <label className="text-xs text-slate-400 mb-1.5 block">Root Type Name</label>
              <input
                type="text"
                value={options.rootTypeName}
                onChange={(e) => updateOption('rootTypeName', e.target.value)}
                placeholder="MyType"
                className="input-field w-full text-sm py-2 font-mono"
              />
            </div>

            {/* Number type toggle */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Number Handling</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateOption('preferFloat', false)}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all font-mono ${
                    !options.preferFloat
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Int (integers)
                </button>
                <button
                  onClick={() => updateOption('preferFloat', true)}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all font-mono ${
                    options.preferFloat
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Float (all)
                </button>
              </div>
            </div>

            {/* Indent */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Indent Spaces</label>
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
                  checked={options.nullableFields}
                  onChange={(e) => updateOption('nullableFields', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Make all fields nullable (omit <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">!</code>)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.includeQuery}
                  onChange={(e) => updateOption('includeQuery', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Generate <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">Query</code> type
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.includeMutation}
                  onChange={(e) => updateOption('includeMutation', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Generate <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">Mutation</code> type (CRUD)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: Output */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-brand-400" />
              GraphQL SDL Output
            </h2>
            {output ? (
              <pre className="bg-slate-950 rounded-lg p-4 overflow-auto max-h-[500px] border border-slate-700/50">
                <code className="text-sm font-mono text-slate-200 whitespace-pre">{output}</code>
              </pre>
            ) : (
              <div className="bg-slate-950 rounded-lg p-8 border border-slate-700/50 text-center">
                <p className="text-slate-500 text-sm">
                  {jsonInput.trim() ? 'Invalid JSON — check input for errors' : 'Enter JSON to generate GraphQL schema'}
                </p>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">How it works</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>• Infers GraphQL scalars: <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">String</code>, <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">Int</code>, <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">Float</code>, <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">Boolean</code></li>
              <li>• Nested objects become named GraphQL <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">type</code> declarations</li>
              <li>• Arrays infer their element type from the first item</li>
              <li>• <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">null</code> values produce nullable fields</li>
              <li>• Optional <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">Query</code> and <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">Mutation</code> scaffolding for rapid API prototyping</li>
              <li>• Merge support: repeated nested shapes combine fields into a single type</li>
              <li>• All processing happens in your browser — no data sent anywhere</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
