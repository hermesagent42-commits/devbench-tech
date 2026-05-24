'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, Code2, Settings2, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Type inference ────────────────────────────────────────────────────────

function inferType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ── Schema generation ─────────────────────────────────────────────────────

interface SchemaOptions {
  draft: 'draft-07' | '2020-12';
  includeSchema: boolean;
  rootTitle: string;
  requiredFields: boolean;
  additionalProperties: boolean;
}

function getDraftUrl(draft: SchemaOptions['draft']): string {
  return draft === '2020-12'
    ? 'https://json-schema.org/draft/2020-12/schema'
    : 'http://json-schema.org/draft-07/schema#';
}

function generateSchema(
  value: unknown,
  options: SchemaOptions,
  seen: Set<unknown> = new Set()
): Record<string, unknown> {
  // Circular reference guard
  if (isObject(value) || Array.isArray(value)) {
    if (seen.has(value)) return { description: 'Circular reference' } as Record<string, unknown>;
    seen.add(value);
  }

  const t = inferType(value);

  switch (t) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'integer':
      return { type: 'integer' };
    case 'boolean':
      return { type: 'boolean' };
    case 'null':
      return { type: 'null' };
    case 'array': {
      const arr = value as unknown[];
      if (arr.length === 0) {
        return { type: 'array', items: {} };
      }
      // Collect element schemas
      const itemSchemas = arr.map((el) =>
        generateSchema(el, options, new Set(seen))
      );
      // Deduplicate by JSON serialization
      const uniqueSchemas: Record<string, unknown>[] = [];
      const seenSchemas = new Set<string>();
      for (const s of itemSchemas) {
        const key = JSON.stringify(s);
        if (!seenSchemas.has(key)) {
          seenSchemas.add(key);
          uniqueSchemas.push(s);
        }
      }
      if (uniqueSchemas.length === 1) {
        return { type: 'array', items: uniqueSchemas[0] };
      }
      return { type: 'array', items: { oneOf: uniqueSchemas } };
    }
    case 'object': {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return { type: 'object' };
      }

      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const key of keys) {
        properties[key] = generateSchema(obj[key], options, new Set(seen));
        if (options.requiredFields) {
          required.push(key);
        }
      }

      const schema: Record<string, unknown> = {
        type: 'object',
        properties,
      };

      if (options.requiredFields && required.length > 0) {
        schema.required = required;
      }

      if (!options.additionalProperties) {
        schema.additionalProperties = false;
      }

      return schema;
    }
    default:
      return {};
  }
}

function generateRootSchema(
  value: unknown,
  options: SchemaOptions
): Record<string, unknown> {
  const inner = generateSchema(value, options);

  if (options.includeSchema) {
    inner.$schema = getDraftUrl(options.draft);
  }

  if (options.rootTitle) {
    inner.title = options.rootTitle;
  }

  return inner;
}

// ── Main component ────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "id": "usr_2aBc9XyZ",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "isActive": true,
  "roles": ["admin", "editor"],
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
      "tags": ["typescript", "javascript"],
      "published": true
    }
  ],
  "metadata": null
}`;

export default function JSONSchemaGeneratorPage() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<SchemaOptions>({
    draft: '2020-12',
    includeSchema: true,
    rootTitle: 'Root',
    requiredFields: true,
    additionalProperties: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  const parseAndGenerate = useCallback(
    (input: string, opts: SchemaOptions) => {
      if (!input.trim()) {
        setError(null);
        setOutput('');
        return;
      }
      try {
        const parsed = JSON.parse(input);
        setError(null);
        const schema = generateRootSchema(parsed, opts);
        setOutput(JSON.stringify(schema, null, 2));
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
    <K extends keyof SchemaOptions>(key: K, value: SchemaOptions[K]) => {
      const newOptions = { ...options, [key]: value };
      setOptions(newOptions);
      parseAndGenerate(jsonInput, newOptions);
    },
    [jsonInput, options, parseAndGenerate]
  );

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Schema copied!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const reset = useCallback(() => {
    const defaultOpts: SchemaOptions = {
      draft: '2020-12',
      includeSchema: true,
      rootTitle: 'Root',
      requiredFields: true,
      additionalProperties: true,
    };
    setJsonInput(SAMPLE_JSON);
    setOptions(defaultOpts);
    parseAndGenerate(SAMPLE_JSON, defaultOpts);
  }, [parseAndGenerate]);

  return (
    <ToolLayout
      title="JSON Schema Generator"
      description="Generate JSON Schema (Draft 7 / 2020-12) from JSON data. Handles nested objects, arrays with union types, required fields, and additionalProperties — 100% client-side."
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
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: JSON Input + Options */}
        <div className="space-y-6">
          {/* Input */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-brand-400" />
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
              <p className="text-red-400 text-xs mt-2 font-mono">&#x26a0; {error}</p>
            )}
            {!error && jsonInput.trim() && (
              <p className="text-green-400 text-xs mt-2">&check; Valid JSON</p>
            )}
          </div>

          {/* Options */}
          <div className="card space-y-5">
            <h2 className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-brand-400" />
              Options
            </h2>

            {/* Schema Draft */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Schema Draft</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateOption('draft', '2020-12')}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all font-mono ${
                    options.draft === '2020-12'
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Draft 2020-12
                </button>
                <button
                  onClick={() => updateOption('draft', 'draft-07')}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all font-mono ${
                    options.draft === 'draft-07'
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                      : 'bg-surface border-slate-600/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Draft 7
                </button>
              </div>
            </div>

            {/* Root Title */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Root Title</label>
              <input
                type="text"
                value={options.rootTitle}
                onChange={(e) => updateOption('rootTitle', e.target.value)}
                placeholder="Root"
                className="input-field w-full text-sm py-2 font-mono"
              />
            </div>

            {/* Checkbox options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.includeSchema}
                  onChange={(e) => updateOption('includeSchema', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Include <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">$schema</code> declaration
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.requiredFields}
                  onChange={(e) => updateOption('requiredFields', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Mark all properties as <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">required</code>
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.additionalProperties}
                  onChange={(e) => updateOption('additionalProperties', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Allow <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">additionalProperties</code>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: Output */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-brand-400" />
              JSON Schema Output
            </h2>
            {output ? (
              <pre className="bg-slate-950 rounded-lg p-4 overflow-auto max-h-[500px] border border-slate-700/50">
                <code className="text-sm font-mono text-slate-200 whitespace-pre">{output}</code>
              </pre>
            ) : (
              <div className="bg-slate-950 rounded-lg p-8 border border-slate-700/50 text-center">
                <p className="text-slate-500 text-sm">
                  {jsonInput.trim() ? 'Invalid JSON — check input for errors' : 'Enter JSON to generate schema'}
                </p>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">How it works</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>&bull; Infer types from raw JSON: string, number, integer, boolean, null, array, object</li>
              <li>&bull; Nested objects generate nested <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">properties</code> recursively</li>
              <li>&bull; Arrays with mixed element types generate <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">oneOf</code> unions</li>
              <li>&bull; Toggle <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">required</code> fields and <code className="text-brand-300 bg-surface px-1 py-0.5 rounded text-[11px]">additionalProperties</code></li>
              <li>&bull; Choose Draft 2020-12 (latest) or Draft 7 (most widely supported)</li>
              <li>&bull; All processing happens in your browser — no data sent anywhere</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
