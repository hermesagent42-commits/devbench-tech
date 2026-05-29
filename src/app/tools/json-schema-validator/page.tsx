'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, RotateCcw, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ValidationError {
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ── Schema Validator (Draft 7 subset) ─────────────────────────────────────

function resolveRef(schema: any, ref: string, root: any): any {
  if (ref === '#') return root;
  if (ref.startsWith('#/')) {
    const parts = ref.slice(2).split('/');
    let current = root;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }
  return null;
}

function validate(
  instance: any,
  schema: any,
  root: any,
  path: string = '$'
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (schema === undefined || schema === null) return errors;

  // $ref
  if (typeof schema === 'object' && '$ref' in schema) {
    const resolved = resolveRef(schema, schema.$ref, root);
    if (resolved === null) {
      errors.push({ path, message: `Could not resolve $ref: ${schema.$ref}` });
      return errors;
    }
    return validate(instance, resolved, root, path);
  }

  // type
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const instanceType = Array.isArray(instance) ? 'array' : (instance === null ? 'null' : typeof instance);
    let typeValid = false;
    for (const t of types) {
      if (t === 'integer') {
        if (Number.isInteger(instance) && typeof instance === 'number') { typeValid = true; break; }
      } else if (t === instanceType) {
        typeValid = true;
        break;
      }
    }
    if (!typeValid) {
      errors.push({ path, message: `Expected type ${types.join(' or ')}, got ${instanceType}` });
      return errors;
    }
  }

  if (instance === null && schema.type === 'null') return errors;
  if (instance === undefined) {
    errors.push({ path, message: 'Value is undefined' });
    return errors;
  }

  // enum
  if (Array.isArray(schema.enum)) {
    const match = schema.enum.some((v: any) => JSON.stringify(v) === JSON.stringify(instance));
    if (!match) {
      errors.push({ path, message: `Value must be one of: ${schema.enum.map(JSON.stringify).join(', ')}` });
    }
  }

  // const
  if (schema.const !== undefined) {
    if (JSON.stringify(instance) !== JSON.stringify(schema.const)) {
      errors.push({ path, message: `Value must be: ${JSON.stringify(schema.const)}` });
    }
  }

  if (typeof instance === 'number') {
    // multipleOf
    if (schema.multipleOf !== undefined) {
      if (instance % schema.multipleOf !== 0) {
        errors.push({ path, message: `Must be a multiple of ${schema.multipleOf}` });
      }
    }
    // minimum
    if (schema.minimum !== undefined) {
      if (schema.exclusiveMinimum ? instance <= schema.minimum : instance < schema.minimum) {
        errors.push({ path, message: `Must be ${schema.exclusiveMinimum ? '>' : '>='} ${schema.minimum}` });
      }
    }
    // maximum
    if (schema.maximum !== undefined) {
      if (schema.exclusiveMaximum ? instance >= schema.maximum : instance > schema.maximum) {
        errors.push({ path, message: `Must be ${schema.exclusiveMaximum ? '<' : '<='} ${schema.maximum}` });
      }
    }
  }

  if (typeof instance === 'string') {
    // minLength
    if (schema.minLength !== undefined && instance.length < schema.minLength) {
      errors.push({ path, message: `Must be at least ${schema.minLength} character(s) long` });
    }
    // maxLength
    if (schema.maxLength !== undefined && instance.length > schema.maxLength) {
      errors.push({ path, message: `Must be at most ${schema.maxLength} character(s) long` });
    }
    // pattern
    if (schema.pattern !== undefined) {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(instance)) {
          errors.push({ path, message: `Must match pattern "${schema.pattern}"` });
        }
      } catch {
        errors.push({ path, message: `Invalid regex pattern in schema: "${schema.pattern}"` });
      }
    }
    // format
    if (schema.format !== undefined) {
      const formatValid = validateFormat(instance, schema.format);
      if (!formatValid) {
        errors.push({ path, message: `Must be a valid ${schema.format} format` });
      }
    }
  }

  if (Array.isArray(instance)) {
    // minItems
    if (schema.minItems !== undefined && instance.length < schema.minItems) {
      errors.push({ path, message: `Must have at least ${schema.minItems} item(s)` });
    }
    // maxItems
    if (schema.maxItems !== undefined && instance.length > schema.maxItems) {
      errors.push({ path, message: `Must have at most ${schema.maxItems} item(s)` });
    }
    // uniqueItems
    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (let i = 0; i < instance.length; i++) {
        const str = JSON.stringify(instance[i]);
        if (seen.has(str)) {
          errors.push({ path: `${path}[${i}]`, message: 'Duplicate item (uniqueItems required)' });
          break;
        }
        seen.add(str);
      }
    }
    // items (tuple validation or single schema)
    if (schema.items !== undefined) {
      if (Array.isArray(schema.items)) {
        // tuple validation
        for (let i = 0; i < schema.items.length; i++) {
          if (i < instance.length) {
            errors.push(...validate(instance[i], schema.items[i], root, `${path}[${i}]`));
          }
        }
        // additionalItems
        if (instance.length > schema.items.length) {
          if (schema.additionalItems === false) {
            for (let i = schema.items.length; i < instance.length; i++) {
              errors.push({ path: `${path}[${i}]`, message: 'Additional items not allowed' });
            }
          } else if (typeof schema.additionalItems === 'object') {
            for (let i = schema.items.length; i < instance.length; i++) {
              errors.push(...validate(instance[i], schema.additionalItems, root, `${path}[${i}]`));
            }
          }
        }
      } else {
        // single schema for all items
        for (let i = 0; i < instance.length; i++) {
          errors.push(...validate(instance[i], schema.items, root, `${path}[${i}]`));
        }
      }
    }
    // contains
    if (schema.contains !== undefined && instance.length > 0) {
      const has = instance.some((item: any) => validate(item, schema.contains, root, `${path}`).length === 0);
      if (!has) {
        errors.push({ path, message: 'Must contain at least one item matching the contains schema' });
      }
    }
  }

  if (instance !== null && typeof instance === 'object' && !Array.isArray(instance)) {
    // minProperties
    const keys = Object.keys(instance);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
      errors.push({ path, message: `Must have at least ${schema.minProperties} propert${schema.minProperties === 1 ? 'y' : 'ies'}` });
    }
    // maxProperties
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
      errors.push({ path, message: `Must have at most ${schema.maxProperties} propert${schema.maxProperties === 1 ? 'y' : 'ies'}` });
    }
    // required
    if (Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (!(req in instance)) {
          errors.push({ path, message: `Missing required property: "${req}"` });
        }
      }
    }
    // properties
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (prop in instance) {
          errors.push(...validate(instance[prop], propSchema, root, `${path}.${prop}`));
        }
      }
    }
    // patternProperties
    if (schema.patternProperties && typeof schema.patternProperties === 'object') {
      for (const [pattern, patternSchema] of Object.entries(schema.patternProperties)) {
        try {
          const regex = new RegExp(pattern);
          for (const key of keys) {
            if (regex.test(key)) {
              errors.push(...validate(instance[key], patternSchema, root, `${path}.${key}`));
            }
          }
        } catch { /* skip invalid regex */ }
      }
    }
    // additionalProperties
    if (schema.additionalProperties !== undefined || schema.properties) {
      const propKeys = schema.properties ? Object.keys(schema.properties) : [];
      for (const key of keys) {
        // Check if covered by properties
        if (propKeys.includes(key)) continue;
        // Check if covered by patternProperties
        let coveredByPattern = false;
        if (schema.patternProperties) {
          for (const pattern of Object.keys(schema.patternProperties)) {
            try {
              if (new RegExp(pattern).test(key)) {
                coveredByPattern = true;
                break;
              }
            } catch { /* skip */ }
          }
        }
        if (coveredByPattern) continue;

        if (schema.additionalProperties === false) {
          errors.push({ path: `${path}.${key}`, message: `Additional property "${key}" is not allowed` });
        } else if (typeof schema.additionalProperties === 'object') {
          errors.push(...validate(instance[key], schema.additionalProperties, root, `${path}.${key}`));
        }
      }
    }
    // dependencies
    if (schema.dependencies && typeof schema.dependencies === 'object') {
      for (const [prop, dep] of Object.entries(schema.dependencies)) {
        if (prop in instance) {
          if (Array.isArray(dep)) {
            for (const requiredProp of dep as string[]) {
              if (!(requiredProp in instance)) {
                errors.push({ path, message: `Property "${prop}" requires "${requiredProp}" to be present` });
              }
            }
          } else if (typeof dep === 'object') {
            errors.push(...validate(instance, dep as any, root, path));
          }
        }
      }
    }
  }

  // allOf
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      errors.push(...validate(instance, sub, root, path));
    }
  }

  // anyOf
  if (Array.isArray(schema.anyOf)) {
    const anyMatch = schema.anyOf.some((sub: any) => validate(instance, sub, root, path).length === 0);
    if (!anyMatch) {
      errors.push({ path, message: `Must match at least one of ${schema.anyOf.length} schema(s)` });
    }
  }

  // oneOf
  if (Array.isArray(schema.oneOf)) {
    const matching = schema.oneOf.filter((sub: any) => validate(instance, sub, root, path).length === 0);
    if (matching.length === 0) {
      errors.push({ path, message: `Must match exactly one of ${schema.oneOf.length} schema(s), matched 0` });
    } else if (matching.length > 1) {
      errors.push({ path, message: `Must match exactly one of ${schema.oneOf.length} schema(s), matched ${matching.length}` });
    }
  }

  // not
  if (schema.not) {
    const notErrors = validate(instance, schema.not, root, path);
    if (notErrors.length === 0) {
      errors.push({ path, message: 'Must NOT match the "not" schema' });
    }
  }

  // if/then/else
  if (schema.if) {
    const ifErrors = validate(instance, schema.if, root, path);
    if (ifErrors.length === 0 && schema.then) {
      errors.push(...validate(instance, schema.then, root, path));
    } else if (ifErrors.length > 0 && schema.else) {
      errors.push(...validate(instance, schema.else, root, path));
    }
  }

  return errors;
}

function validateFormat(value: string, format: string): boolean {
  switch (format) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'uri':
    case 'uri-reference':
      try { new URL(value); return true; } catch { return false; }
    case 'date-time':
      return !isNaN(Date.parse(value)) && value.includes('T');
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
    case 'time':
      return /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)?$/.test(value);
    case 'hostname':
      return /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(value) && value.length <= 253;
    case 'ipv4':
      return /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(value);
    case 'ipv6':
      return /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4})$/.test(value);
    case 'uuid':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    case 'json-pointer':
      return /^(\/([^~]|~0|~1)*)*$/.test(value);
    case 'regex':
      try { new RegExp(value); return true; } catch { return false; }
    default:
      return true;
  }
}

// ── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9_-]+$",
      "minLength": 3,
      "maxLength": 32
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["admin", "editor", "viewer"]
      },
      "uniqueItems": true
    },
    "profile": {
      "type": "object",
      "properties": {
        "avatar": { "type": "string", "format": "uri" },
        "bio": { "type": "string", "maxLength": 500 }
      }
    }
  }
}`;

const SAMPLE_JSON = `{
  "id": "usr_2abc9xyz",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "age": 29,
  "roles": ["admin", "editor"],
  "profile": {
    "avatar": "https://example.com/avatar.jpg",
    "bio": "Full-stack developer"
  }
}`;

const SAMPLE_INVALID = `{
  "id": "a",
  "name": "",
  "email": "not-an-email",
  "age": -5,
  "roles": ["admin", "admin", "hacker"],
  "extraField": true
}`;

// ── Component ──────────────────────────────────────────────────────────────

export default function JSONSchemaValidatorPage() {
  const [schemaInput, setSchemaInput] = useState(SAMPLE_SCHEMA);
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['$']));

  const runValidation = useCallback((schemaStr: string, jsonStr: string) => {
    // Reset everything
    setSchemaError(null);
    setJsonError(null);
    setResult(null);
    if (!jsonStr.trim() && !schemaStr.trim()) return;

    let schema: any;
    try {
      schema = JSON.parse(schemaStr);
    } catch (e) {
      setSchemaError((e as Error).message);
      return;
    }

    let json: any;
    try {
      json = JSON.parse(jsonStr);
    } catch (e) {
      setJsonError((e as Error).message);
      return;
    }

    const errors = validate(json, schema, schema, '$');
    setResult({ valid: errors.length === 0, errors });
  }, []);

  const handleSchemaChange = useCallback((value: string) => {
    setSchemaInput(value);
    runValidation(value, jsonInput);
  }, [jsonInput, runValidation]);

  const handleJsonChange = useCallback((value: string) => {
    setJsonInput(value);
    runValidation(schemaInput, value);
  }, [schemaInput, runValidation]);

  const copyAll = useCallback(() => {
    if (!result) return;
    const text = result.valid ? '✓ Valid — JSON matches the schema.' : result.errors.map(e => `${e.path}: ${e.message}`).join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [result]);

  const resetAll = useCallback(() => {
    setSchemaInput(SAMPLE_SCHEMA);
    setJsonInput(SAMPLE_JSON);
    setResult(null);
    setSchemaError(null);
    setJsonError(null);
    runValidation(SAMPLE_SCHEMA, SAMPLE_JSON);
  }, [runValidation]);

  const loadInvalid = useCallback(() => {
    setJsonInput(SAMPLE_INVALID);
    runValidation(schemaInput, SAMPLE_INVALID);
  }, [schemaInput, runValidation]);

  const toggleExpand = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  // Group errors by top-level path for tree display
  const errorTree = result ? buildErrorTree(result.errors) : null;

  return (
    <ToolLayout
      title="JSON Schema Validator"
      description="Validate JSON data against a JSON Schema (Draft 7). See every error with exact paths, deep validation of nested structures, and format validation — 100% client-side."
      controls={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={loadInvalid} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <XCircle className="w-3.5 h-3.5 text-orange-400" />
            Load Invalid
          </button>
          <button onClick={resetAll} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button onClick={copyAll} disabled={!result} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Copy className="w-3.5 h-3.5" />
            Copy Results
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Schema & JSON inputs */}
        <div className="space-y-6">
          {/* Schema Input */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
              JSON Schema
            </h2>
            <textarea
              value={schemaInput}
              onChange={(e) => handleSchemaChange(e.target.value)}
              placeholder='{"type": "object", "properties": {...}}'
              spellCheck={false}
              className="input-field w-full h-56 font-mono text-sm resize-none"
            />
            {schemaError && (
              <p className="text-red-400 text-xs mt-2 font-mono">⚠ {schemaError}</p>
            )}
            {!schemaError && schemaInput.trim() && (
              <p className="text-green-400 text-xs mt-2">✓ Valid JSON Schema</p>
            )}
          </div>

          {/* JSON Input */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
              JSON Data
            </h2>
            <textarea
              value={jsonInput}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder='{"key": "value"}'
              spellCheck={false}
              className="input-field w-full h-56 font-mono text-sm resize-none"
            />
            {jsonError && (
              <p className="text-red-400 text-xs mt-2 font-mono">⚠ {jsonError}</p>
            )}
            {!jsonError && jsonInput.trim() && (
              <p className="text-green-400 text-xs mt-2">✓ Valid JSON</p>
            )}
          </div>
        </div>

        {/* RIGHT: Validation Results */}
        <div className="space-y-6">
          {/* Result Banner */}
          {result && (
            <div className={`card border-2 ${result.valid ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center gap-3">
                {result.valid ? (
                  <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <h2 className={`text-lg font-bold ${result.valid ? 'text-green-300' : 'text-red-300'}`}>
                    {result.valid ? '✓ Valid' : `✗ Invalid — ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.valid
                      ? 'JSON data conforms to the schema.'
                      : 'See detailed error list below.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && (
            <div className="card border-slate-700/50">
              <div className="text-center py-12">
                <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Enter a JSON Schema and JSON data to validate</p>
              </div>
            </div>
          )}

          {/* Error Tree View */}
          {result && !result.valid && errorTree && (
            <div className="card">
              <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                Error Details
              </h2>
              <div className="space-y-0">
                <ErrorTreeNode
                  node={errorTree}
                  expanded={expanded}
                  onToggle={(path) => toggleExpand(path)}
                  depth={0}
                />
              </div>
            </div>
          )}

          {/* Flat error list (full view) */}
          {result && !result.valid && (
            <div className="card">
              <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                All Errors (Flat)
              </h2>
              <div className="space-y-1.5 max-h-[300px] overflow-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-slate-950/80 rounded-md p-2.5 border border-slate-700/50">
                    <span className="text-red-400 font-mono font-semibold flex-shrink-0">{err.path}</span>
                    <span className="text-slate-300">—</span>
                    <span className="text-slate-300 leading-relaxed">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schema keyword reference */}
          <div className="card">
            <h2 className="text-white font-semibold text-sm mb-2">Supported Keywords</h2>
            <div className="text-xs text-slate-400 space-y-1 leading-relaxed">
              <p><strong className="text-slate-300">Types:</strong> type (string/number/integer/boolean/array/object/null)</p>
              <p><strong className="text-slate-300">Numbers:</strong> minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf</p>
              <p><strong className="text-slate-300">Strings:</strong> minLength, maxLength, pattern, format (email, uri, date-time, uuid, ipv4, ipv6, hostname)</p>
              <p><strong className="text-slate-300">Arrays:</strong> items, minItems, maxItems, uniqueItems, contains</p>
              <p><strong className="text-slate-300">Objects:</strong> properties, required, additionalProperties, patternProperties, minProperties, maxProperties, dependencies</p>
              <p><strong className="text-slate-300">Composition:</strong> allOf, anyOf, oneOf, not, if/then/else</p>
              <p><strong className="text-slate-300">Values:</strong> enum, const, $ref</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

// ── Error Tree ─────────────────────────────────────────────────────────────

interface ErrorNode {
  path: string;
  name: string;
  errors: string[];
  children: ErrorNode[];
}

function buildErrorTree(errors: ValidationError[]): ErrorNode {
  const root: ErrorNode = { path: '$', name: 'Root', errors: [], children: [] };

  for (const err of errors) {
    const parts = err.path === '$' ? ['$'] : err.path.split('.');
    let current = root;

    // Errors at root level
    if (parts.length === 1) {
      root.errors.push(err.message);
      continue;
    }

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // Check if this is an array index
      const isArrayIndex = /^\[\d+\]$/.test(part);
      const cleanPart = isArrayIndex ? part : part.replace(/\[(\d+)\]$/, '[$1]');

      let child = current.children.find(c => c.name === cleanPart);
      if (!child) {
        child = { path: parts.slice(0, i + 1).join('.'), name: cleanPart, errors: [], children: [] };
        current.children.push(child);
      }

      if (i === parts.length - 1) {
        child.errors.push(err.message);
      }
      current = child;
    }
  }

  return root;
}

function ErrorTreeNode({
  node,
  expanded,
  onToggle,
  depth,
}: {
  node: ErrorNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  depth: number;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.path);
  const errorCount = node.errors.length + node.children.reduce((sum, c) => sum + c.errors.length + c.children.reduce((s, cc) => s + cc.errors.length, 0), 0);

  return (
    <div className="border-l border-slate-700/50 ml-1">
      <button
        onClick={() => onToggle(node.path)}
        className={`w-full flex items-center gap-1.5 py-1.5 px-2 text-left hover:bg-slate-800/50 rounded-r transition-colors ${depth === 0 ? 'bg-slate-800/30' : ''}`}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        <span className={`font-mono text-xs ${node.name.startsWith('[') ? 'text-amber-400' : 'text-blue-300'}`}>
          {node.name}
        </span>
        <span className="text-xs text-slate-400">
          ({errorCount} error{errorCount !== 1 ? 's' : ''})
        </span>
      </button>

      {isExpanded && (
        <div className="ml-3">
          {node.errors.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs py-1 px-2 border-l-2 border-red-500/40 ml-3"
            >
              <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-300">{err}</span>
            </div>
          ))}
          {node.children.map((child) => (
            <ErrorTreeNode
              key={child.path}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
