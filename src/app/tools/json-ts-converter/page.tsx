'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowRightLeft, Code2, Settings2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

function inferType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapePropertyName(name: string): string {
  // If it's a valid JS identifier, return as-is; otherwise quote it
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return name;
  return `"${name}"`;
}

function generateType(
  value: unknown,
  indent: string,
  options: Options,
  seen: Set<unknown> = new Set()
): string {
  // Detect circular references
  if (isObject(value) || Array.isArray(value)) {
    if (seen.has(value)) return 'any /* circular */';
    seen.add(value);
  }

  const t = inferType(value);

  switch (t) {
    case 'string':
      return 'string';
    case 'number':
      if (Number.isInteger(value)) return 'number';
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'undefined':
      return 'undefined';
    case 'array': {
      const arr = value as unknown[];
      if (arr.length === 0) return 'unknown[]';
      // Collect all element types
      const elementTypes = arr.map((el) => generateType(el, indent, options, new Set(seen)));
      const unique = Array.from(new Set(elementTypes));
      if (unique.length === 1) {
        return `${unique[0]}[]`;
      }
      return `(${unique.join(' | ')})[]`;
    }
    case 'object': {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) return 'Record<string, unknown>';

      const properties = keys.map((key) => {
        const propType = generateType(obj[key], indent, options, new Set(seen));
        const mod = options.readonly ? 'readonly ' : '';
        const optional = options.optionalFields ? '?' : '';
        const escaped = escapePropertyName(key);
        return `${indent}  ${mod}${escaped}${optional}: ${propType};`;
      });

      const keyword = options.useInterface ? 'interface' : 'type';
      const body = properties.join('\n');

      if (options.useInterface) {
        const mod = options.exportPrefix ? 'export ' : '';
        return `{\n${body}\n${indent}}`;
      }

      return `{\n${body}\n${indent}}`;
    }
    default:
      return 'unknown';
  }
}

function generateRootType(
  value: unknown,
  rootName: string,
  options: Options
): { main: string; subTypes: string } {
  if (!isObject(value) && !Array.isArray(value)) {
    // Primitive root — just a type alias
    const primitiveType = generateType(value, '', options);
    return {
      main: `export type ${rootName} = ${primitiveType};\n`,
      subTypes: '',
    };
  }

  const subTypes: string[] = [];
  const mainParts: string[] = [];
  const typeCache = new Map<string, string>(); // shape hash -> type name
  let subTypeCounter = 0;

  function extractSubTypes(val: unknown, prefix: string): string {
    if (!isObject(val)) {
      if (Array.isArray(val) && val.length > 0 && isObject(val[0])) {
        // Array of objects — extract inner type
        return extractSubTypes(val[0], prefix);
      }
      return '';
    }

    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '';

    // Build shape signature
    const shapeSig = keys
      .map((k) => {
        const childType = inferType(obj[k]);
        if (isObject(obj[k])) return `${k}:object`;
        if (Array.isArray(obj[k])) {
          const arr = obj[k] as unknown[];
          if (arr.length > 0 && isObject(arr[0])) return `${k}:object[]`;
          return `${k}:${inferType(arr[0] ?? 'unknown')}[]`;
        }
        return `${k}:${childType}`;
      })
      .sort()
      .join('|');

    // Check cache
    if (typeCache.has(shapeSig)) return typeCache.get(shapeSig)!;

    // Create new type name
    subTypeCounter++;
    const typeName = `${prefix}${subTypeCounter}`;
    typeCache.set(shapeSig, typeName);

    // Build the type
    const exp = options.exportPrefix ? 'export ' : '';
    const keyword = options.useInterface ? 'interface' : 'type';
    const bodyLines: string[] = [];
    const nestedTypeDefs: string[] = [];

    for (const key of keys) {
      const child = obj[key];
      const childT = inferType(child);
      const escaped = escapePropertyName(key);
      const mod = options.readonly ? 'readonly ' : '';
      const opt = options.optionalFields ? '?' : '';

      if (isObject(child)) {
        const nestedName = extractSubTypes(child, `${typeName}_`);
        if (nestedName) {
          nestedTypeDefs.push(nestedName);
          bodyLines.push(`  ${mod}${escaped}${opt}: ${nestedName};`);
        } else {
          bodyLines.push(`  ${mod}${escaped}${opt}: Record<string, unknown>;`);
        }
      } else if (Array.isArray(child)) {
        const arr = child as unknown[];
        if (arr.length > 0 && isObject(arr[0])) {
          const itemTypeName = extractSubTypes(arr[0], `${typeName}_Item`);
          if (itemTypeName) {
            nestedTypeDefs.push(itemTypeName);
            bodyLines.push(`  ${mod}${escaped}${opt}: ${itemTypeName}[];`);
          } else {
            bodyLines.push(`  ${mod}${escaped}${opt}: unknown[];`);
          }
        } else if (arr.length > 0) {
          const elementTypes = Array.from(new Set(arr.map((el) => generateType(el, '', options))));
          const arrType =
            elementTypes.length === 1
              ? `${elementTypes[0]}[]`
              : `(${elementTypes.join(' | ')})[]`;
          bodyLines.push(`  ${mod}${escaped}${opt}: ${arrType};`);
        } else {
          bodyLines.push(`  ${mod}${escaped}${opt}: unknown[];`);
        }
      } else {
        bodyLines.push(`  ${mod}${escaped}${opt}: ${generateType(child, '', options)};`);
      }
    }

    if (options.useInterface) {
      subTypes.push(`\n${exp}${keyword} ${typeName} {\n${bodyLines.join('\n')}\n}`);
    } else {
      subTypes.push(`\n${exp}${keyword} ${typeName} = {\n${bodyLines.join('\n')}\n};`);
    }

    return typeName;
  }

  // Handle root
  if (Array.isArray(value) && value.length > 0 && isObject(value[0])) {
    const itemTypeName = extractSubTypes(value[0], rootName);
    if (itemTypeName) {
      mainParts.push(`export type ${rootName} = ${itemTypeName}[];`);
    } else {
      mainParts.push(`export type ${rootName} = unknown[];`);
    }
  } else if (isObject(value)) {
    const typeName = extractSubTypes(value, rootName);
    if (typeName) {
      mainParts.push(`export type ${rootName} = ${typeName};`);
    } else {
      mainParts.push(`export type ${rootName} = Record<string, unknown>;`);
    }
  }

  return {
    main: mainParts.join('\n') + '\n',
    subTypes: subTypes.join(''),
  };
}

interface Options {
  rootName: string;
  useInterface: boolean;
  exportPrefix: boolean;
  readonly: boolean;
  optionalFields: boolean;
}

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

export default function JSONToTypeScriptConverterPage() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [options, setOptions] = useState<Options>({
    rootName: 'Root',
    useInterface: false,
    exportPrefix: true,
    readonly: false,
    optionalFields: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  const parseAndGenerate = useCallback(
    (input: string, opts: Options) => {
      if (!input.trim()) {
        setError(null);
        setOutput('');
        return;
      }
      try {
        const parsed = JSON.parse(input);
        setError(null);
        const result = generateRootType(parsed, opts.rootName, opts);
        const fullOutput = result.subTypes + (result.subTypes ? '\n' : '') + result.main;
        setOutput(fullOutput.trim());
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
    <K extends keyof Options>(key: K, value: Options[K]) => {
      const newOptions = { ...options, [key]: value };
      setOptions(newOptions);
      parseAndGenerate(jsonInput, newOptions);
    },
    [jsonInput, options, parseAndGenerate]
  );

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('TypeScript copied!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const reset = useCallback(() => {
    setJsonInput(SAMPLE_JSON);
    setOptions({
      rootName: 'Root',
      useInterface: false,
      exportPrefix: true,
      readonly: false,
      optionalFields: false,
    });
    parseAndGenerate(SAMPLE_JSON, {
      rootName: 'Root',
      useInterface: false,
      exportPrefix: true,
      readonly: false,
      optionalFields: false,
    });
  }, [parseAndGenerate]);

  return (
    <ToolLayout
      title="JSON to TypeScript"
      description="Convert JSON data into TypeScript type definitions. Handles nested objects, arrays, unions, and optional fields — 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={reset} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button onClick={copyOutput} disabled={!output} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy TS
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

            {/* Root Name */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Root Type Name</label>
              <input
                type="text"
                value={options.rootName}
                onChange={(e) => updateOption('rootName', e.target.value)}
                placeholder="Root"
                className="input-field w-full text-sm py-2 font-mono"
              />
            </div>

            {/* Type style toggle */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Type Style</label>
              <div className="flex gap-2">
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
              </div>
            </div>

            {/* Checkbox options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.exportPrefix}
                  onChange={(e) => updateOption('exportPrefix', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Add <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">export</code> prefix
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.readonly}
                  onChange={(e) => updateOption('readonly', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Add <code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">readonly</code> modifier
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.optionalFields}
                  onChange={(e) => updateOption('optionalFields', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Make all fields optional (<code className="text-brand-400 font-mono text-xs bg-surface px-1 py-0.5 rounded">?</code>)
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
              TypeScript Output
            </h2>
            {output ? (
              <pre className="bg-slate-950 rounded-lg p-4 overflow-auto max-h-[500px] border border-slate-700/50">
                <code className="text-sm font-mono text-slate-200 whitespace-pre">{output}</code>
              </pre>
            ) : (
              <div className="bg-slate-950 rounded-lg p-8 border border-slate-700/50 text-center">
                <p className="text-slate-500 text-sm">
                  {jsonInput.trim() ? 'Invalid JSON — check input for errors' : 'Enter JSON to generate types'}
                </p>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">How it works</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>• Nested objects generate separate types for reusability</li>
              <li>• Arrays of objects extract the item type automatically</li>
              <li>• Mixed-type arrays generate union types</li>
              <li>• All processing happens in your browser — no data sent anywhere</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
