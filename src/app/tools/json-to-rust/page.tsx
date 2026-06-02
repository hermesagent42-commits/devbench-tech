'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Settings2, Braces, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

type RustBasicType = 'String' | 'i64' | 'f64' | 'bool' | 'serde_json::Value';

function isFloat(value: unknown): boolean {
  return typeof value === 'number' && !Number.isInteger(value);
}

function inferRustType(value: unknown): RustBasicType {
  if (value === null) return 'serde_json::Value';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return isFloat(value) ? 'f64' : 'i64';
  if (typeof value === 'string') return 'String';
  return 'serde_json::Value';
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Root';
}

function snakeCase(str: string): string {
  return str
    .replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'field';
}

function sanitizeFieldName(name: string, snake: boolean): string {
  const rustKeywords = new Set([
    'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern',
    'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match',
    'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static',
    'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where',
    'while', 'async', 'await', 'dyn', 'abstract', 'become', 'box', 'do',
    'final', 'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual',
    'yield', 'try', 'union',
  ]);
  const base = snake ? snakeCase(name) : name;
  if (rustKeywords.has(base.toLowerCase())) {
    return 'r#' + base;
  }
  return base;
}

// ── Struct generation ─────────────────────────────────────────────────────

interface Options {
  rootTypeName: string;
  fieldNaming: 'snake_case' | 'original';
  useOption: boolean;
  deriveTraits: string[];
  includeSerdeRenames: boolean;
  allPublic: boolean;
  indentSpaces: number;
}

interface StructDef {
  name: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  rustType: string;
  serdeAttr: string;
  isOptional: boolean;
}

const ALL_TRAITS = ['Serialize', 'Deserialize', 'Debug', 'Clone', 'PartialEq'];

const DEFAULT_OPTIONS: Options = {
  rootTypeName: 'Root',
  fieldNaming: 'snake_case',
  useOption: true,
  deriveTraits: ['Serialize', 'Deserialize', 'Debug', 'Clone'],
  includeSerdeRenames: true,
  allPublic: true,
  indentSpaces: 4,
};

function buildStructs(
  value: unknown,
  typeName: string,
  options: Options,
  allStructs: StructDef[],
  seen: Map<unknown, string> = new Map()
): string {
  if (value === null) return 'serde_json::Value';
  if (typeof value !== 'object') return inferRustType(value);
  
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Vec<serde_json::Value>';
    const first = value[0];
    if (Array.isArray(first)) {
      const nested = buildStructs(first, pascalCase(`${typeName}Item`), options, allStructs, seen);
      return `Vec<Vec<${nested}>>`;
    }
    if (typeof first === 'object' && first !== null) {
      const itemName = pascalCase(typeName.replace(/s$/, '') + 'Item');
      const existing = seen.get(first);
      if (existing) return `Vec<${existing}>`;
      const innerType = buildStructs(first, itemName, options, allStructs, seen);
      return `Vec<${innerType}>`;
    }
    const elemType = inferRustType(first);
    return `Vec<${elemType}>`;
  }

  const existing = seen.get(value);
  if (existing) return existing;
  seen.set(value, typeName);

  const obj = value as Record<string, unknown>;
  const fields: FieldDef[] = [];
  const keySet = new Set<string>();

  for (const [key, val] of Object.entries(obj)) {
    const fieldName = sanitizeFieldName(key, options.fieldNaming === 'snake_case');
    if (keySet.has(fieldName)) {
      // duplicate — skip or append number
      continue;
    }
    keySet.add(fieldName);

    let rustType: string;
    let isOptional = false;

    if (val === null) {
      rustType = options.useOption ? 'Option<serde_json::Value>' : 'serde_json::Value';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        rustType = 'Vec<serde_json::Value>';
      } else {
        const first = val[0];
        if (Array.isArray(first)) {
          const nested = buildStructs(first, pascalCase(`${key}Item`), options, allStructs, seen);
          rustType = `Vec<Vec<${nested}>>`;
        } else if (typeof first === 'object' && first !== null) {
          const itemName = pascalCase(key);
          const existing = seen.get(first);
          if (existing) {
            rustType = `Vec<${existing}>`;
          } else {
            const innerType = buildStructs(first, itemName, options, allStructs, seen);
            rustType = `Vec<${innerType}>`;
          }
        } else {
          rustType = `Vec<${inferRustType(first)}>`;
        }
      }
    } else if (typeof val === 'object') {
      const nestedName = pascalCase(key);
      const existing = seen.get(val);
      if (existing) {
        rustType = existing;
      } else {
        rustType = buildStructs(val, nestedName, options, allStructs, seen);
      }
    } else {
      rustType = inferRustType(val);
    }

    const serdeAttr = options.includeSerdeRenames && key !== fieldName
      ? `#[serde(rename = "${key}")]`
      : '';

    fields.push({ name: fieldName, rustType, serdeAttr, isOptional });
  }

  const existingStruct = allStructs.find((s) => s.name === typeName);
  if (existingStruct) {
    for (const f of fields) {
      if (!existingStruct.fields.find((ef) => ef.name === f.name)) {
        existingStruct.fields.push(f);
      }
    }
  } else {
    allStructs.push({ name: typeName, fields });
  }

  return typeName;
}

function formatRustStructs(allStructs: StructDef[], options: Options): string {
  const indent = ' '.repeat(options.indentSpaces);
  const lines: string[] = [];

  for (let i = 0; i < allStructs.length; i++) {
    const s = allStructs[i];
    if (s.fields.length === 0) continue;

    // Derive macros
    const deriveLine = `#[derive(${options.deriveTraits.join(', ')})]`;
    lines.push(deriveLine);

    const vis = options.allPublic ? 'pub ' : '';
    lines.push(`${vis}struct ${s.name} {`);

    // Compute max field name length for alignment
    const maxNameLen = Math.max(...s.fields.map((f) => f.name.length));
    const maxTypeLen = Math.max(...s.fields.map((f) => f.rustType.length));

    for (const field of s.fields) {
      if (field.serdeAttr) {
        lines.push(`${indent}${field.serdeAttr}`);
      }
      const visField = options.allPublic ? 'pub ' : '';
      const namePadded = field.name.padEnd(maxNameLen + 1);
      const typePadded = field.rustType.padEnd(maxTypeLen + 1);
      lines.push(`${indent}${visField}${namePadded}: ${typePadded},`);
    }

    lines.push('}');
    if (i < allStructs.length - 1) lines.push('');
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
  "tags": ["rust", "wasm", "cli"],
  "role": "admin",
  "profile": {
    "avatar_url": "https://cdn.example.com/avatars/jane.jpg",
    "bio": "Full-stack developer",
    "preferences": {
      "theme": "dark",
      "notifications": true,
      "language": "en"
    }
  },
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with Rust",
      "slug": "getting-started-rust",
      "published": true,
      "views": 1520,
      "metadata": {
        "tags": ["rust", "tutorial"],
        "rating": 4.8
      }
    },
    {
      "id": 2,
      "title": "Advanced Patterns in Rust",
      "slug": "advanced-patterns",
      "published": false,
      "views": 890,
      "metadata": {
        "tags": ["rust", "advanced"],
        "rating": 4.5
      }
    }
  ],
  "metadata": null,
  "created_at": "2026-05-30T12:00:00Z"
}`;

// ── Component ─────────────────────────────────────────────────────────────

export default function JSONToRustPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);

  const { structs, output, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(input);
      const allStructs: StructDef[] = [];
      buildStructs(parsed, options.rootTypeName, options, allStructs);

      // Filter empty structs
      const nonEmpty = allStructs.filter((s) => s.fields.length > 0);

      const rustOutput = formatRustStructs(nonEmpty, options);

      return {
        structs: nonEmpty,
        output: rustOutput,
        error: null as string | null,
      };
    } catch (e) {
      return {
        structs: [] as StructDef[],
        output: '',
        error: (e as Error).message,
      };
    }
  }, [input, options]);

  const structCount = structs.length;

  const handleCopy = useCallback(async () => {
    if (!output) { toast.error('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(output);
      toast.success('Copied Rust structs!');
    } catch {
      toast.error('Failed to copy');
    }
  }, [output]);

  const handleReset = useCallback(() => {
    setInput(SAMPLE_JSON);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  const handleLoadSample = useCallback(() => setInput(SAMPLE_JSON), []);

  const toggleTrait = useCallback((trait: string) => {
    setOptions((o) => ({
      ...o,
      deriveTraits: o.deriveTraits.includes(trait)
        ? o.deriveTraits.filter((t) => t !== trait)
        : [...o.deriveTraits, trait],
    }));
  }, []);

  return (
    <ToolLayout
      title="JSON → Rust Struct"
      description="Convert JSON data into idiomatic Rust struct definitions with serde — nested types, rename attributes, Option types, and derive macros. 100% client-side."
    >
      {/* Options bar */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Root name */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">Root name</label>
            <input
              type="text"
              value={options.rootTypeName}
              onChange={(e) => setOptions((o) => ({ ...o, rootTypeName: e.target.value || 'Root' }))}
              className="w-28 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          {/* Field naming */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Fields</label>
            <div className="flex rounded-lg bg-slate-950 border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setOptions((o) => ({ ...o, fieldNaming: 'snake_case' }))}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  options.fieldNaming === 'snake_case'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                snake_case
              </button>
              <button
                onClick={() => setOptions((o) => ({ ...o, fieldNaming: 'original' }))}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  options.fieldNaming === 'original'
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                original
              </button>
            </div>
          </div>

          {/* Toggles */}
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.useOption}
              onChange={(e) => setOptions((o) => ({ ...o, useOption: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            null → Option
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.includeSerdeRenames}
              onChange={(e) => setOptions((o) => ({ ...o, includeSerdeRenames: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            serde rename
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.allPublic}
              onChange={(e) => setOptions((o) => ({ ...o, allPublic: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            pub fields
          </label>

          {/* Derive traits */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 mr-1">#[derive(...</span>
            {ALL_TRAITS.map((trait) => (
              <button
                key={trait}
                onClick={() => toggleTrait(trait)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-all border ${
                  options.deriveTraits.includes(trait)
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                    : 'bg-surface border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                {trait}
              </button>
            ))}
            <span className="text-xs text-slate-500">)]</span>
          </div>

          {/* Stats + reset */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-mono">
              {error ? (
                <span className="text-red-400">Invalid JSON</span>
              ) : (
                <span className="text-green-400">{structCount} struct{structCount !== 1 ? 's' : ''}</span>
              )}
            </span>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main grid: input + output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Braces className="w-4 h-4 text-brand-400" />
              JSON Input
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadSample}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
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
            className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors placeholder-slate-600"
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
              <FileCode className="w-4 h-4 text-orange-400" />
              Rust Output
            </h3>
            <div className="flex items-center gap-2">
              {output && (
                <span className="text-xs text-slate-500 font-mono">
                  {output.split('\n').length} lines
                </span>
              )}
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/15 text-brand-300 border border-brand-500/30 hover:bg-brand-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>
          {error ? (
            <div className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg flex items-center justify-center">
              <p className="text-slate-500 text-sm">Fix JSON errors to see output</p>
            </div>
          ) : output ? (
            <pre className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg p-4 overflow-auto font-mono text-sm text-slate-200">
              <code>{output}</code>
            </pre>
          ) : (
            <div className="w-full h-[500px] bg-slate-950 border border-slate-700/50 rounded-lg flex items-center justify-center">
              <p className="text-slate-500 text-sm">Enter valid JSON to generate Rust structs</p>
            </div>
          )}
        </div>
      </div>

      {/* Struct summary */}
      {structs.length > 1 && (
        <div className="mt-6 card">
          <h3 className="text-white font-semibold text-sm mb-3">Generated Structs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {structs.map((s) => (
              <div key={s.name} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700/50">
                <span className="text-xs font-mono text-brand-400">{s.name}</span>
                <span className="text-xs text-slate-500 ml-2">{s.fields.length}f</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-orange-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Type Mapping</h4>
          <div className="space-y-1.5">
            {[
              ['string', 'String'],
              ['integer', 'i64'],
              ['float', 'f64'],
              ['boolean', 'bool'],
              ['null', 'Option<_> or Value'],
              ['array', 'Vec<_>'],
              ['object', 'struct { }'],
            ].map(([json, rust]) => (
              <div key={json} className="flex items-center justify-between text-xs">
                <code className="text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded font-mono">{json}</code>
                <span className="text-slate-300 font-mono text-[11px]">{rust}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card border-l-4 border-l-brand-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Serde Features</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• <code className="text-brand-300 bg-slate-950 px-1 py-0.5 rounded text-[11px]">{'#[serde(rename = "...")]'}</code> on snake_case fields</li>
            <li>• Configurable <code className="text-brand-300 bg-slate-950 px-1 py-0.5 rounded text-[11px]">#[derive(...)]</code> traits</li>
            <li>• <code className="text-brand-300 bg-slate-950 px-1 py-0.5 rounded text-[11px]">Option&lt;T&gt;</code> for nullable fields</li>
            <li>• <code className="text-brand-300 bg-slate-950 px-1 py-0.5 rounded text-[11px]">pub</code> visibility modifiers</li>
            <li>• Nested structs for nested objects</li>
          </ul>
        </div>

        <div className="card border-l-4 border-l-green-500/50">
          <h4 className="text-white font-semibold text-sm mb-2">Usage Example</h4>
          <pre className="text-xs text-slate-400 font-mono bg-slate-950 rounded-lg p-3 overflow-auto">
{`// Cargo.toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"

// main.rs
let data = serde_json::from_str::<Root>(json)?;`}
          </pre>
        </div>
      </div>
    </ToolLayout>
  );
}
