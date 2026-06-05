'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, RefreshCw, Code2, Settings2, Play, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface SchemaObject {
  type?: string | string[];
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject | SchemaObject[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  format?: string;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  [key: string]: unknown;
}

interface GenerationOptions {
  arrayCount: number;
  useExamples: boolean;
  useDefaults: boolean;
  nullProbability: number;
}

// ── Sample data pools ──────────────────────────────────────────────────────

const FIRST_NAMES = ['Alice','Bob','Charlie','Diana','Eve','Frank','Grace','Henry','Iris','Jack','Kate','Leo','Maya','Noah','Olivia','Paul','Quinn','Rose','Sam','Tina'];
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Anderson','Taylor','Thomas','Moore','Jackson','Martin','Lee','Perez','Thompson','White'];
const COMPANY_NAMES = ['Acme Corp','Globex','Initech','Umbrella','Stark Industries','Wayne Enterprises','Oscorp','Cyberdyne','Wonka Industries','Massive Dynamic','Aperture Science','Black Mesa','Tyrell Corp','Weyland-Yutani','Soylent Corp'];
const STREETS = ['Main St','Oak Ave','Elm St','Park Blvd','Cedar Ln','Maple Dr','Pine Rd','Lake View','Hilltop Rd','Sunset Blvd'];
const CITIES = ['New York','London','Tokyo','Paris','Berlin','Sydney','Toronto','Singapore','Dubai','Mumbai'];
const COUNTRIES = ['US','UK','JP','FR','DE','AU','CA','SG','AE','IN'];
const DOMAINS = ['example.com','test.org','demo.dev','app.io','mail.co'];
const LOREM_WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','ut','aliquip','ex','ea','commodo','consequat'];
const COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];
const HEX_CHARS = '0123456789abcdef';

// ── Helpers ────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(): boolean {
  return Math.random() > 0.5;
}

function randomString(minLen = 3, maxLen = 12): string {
  const len = randomInt(minLen, maxLen);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += alphabet[randomInt(0, alphabet.length - 1)];
  }
  return result;
}

function randomLorem(minLen = 5, maxLen = 30): string {
  const len = randomInt(minLen, maxLen);
  const words: string[] = [];
  for (let i = 0; i < len; i++) {
    words.push(randomPick(LOREM_WORDS));
  }
  // Capitalize first letter
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ') + '.';
}

function randomEmail(): string {
  return `${randomString(4, 8).toLowerCase()}@${randomPick(DOMAINS)}`;
}

function randomPhone(): string {
  return `+1 (${randomInt(200, 999)}) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomUrl(): string {
  return `https://${randomString(4, 8)}.${randomPick(DOMAINS)}/${randomString(3, 6)}`;
}

function randomISODate(): string {
  const year = randomInt(2020, 2026);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomHexColor(): string {
  return randomPick(COLORS);
}

function randomIP(): string {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function randomPersonName(): string {
  return `${randomPick(FIRST_NAMES)} ${randomPick(LAST_NAMES)}`;
}

function randomAddress(): string {
  return `${randomInt(10, 9999)} ${randomPick(STREETS)}, ${randomPick(CITIES)}`;
}

// ── Schema parsing ─────────────────────────────────────────────────────────

function normalizeSchema(schema: SchemaObject | string): SchemaObject {
  if (typeof schema === 'string') {
    try {
      schema = JSON.parse(schema) as SchemaObject;
    } catch {
      return { type: 'string' };
    }
  }
  return schema;
}

function getType(schema: SchemaObject): string {
  if (schema.const !== undefined) return 'const';
  if (schema.enum) return 'enum';
  if (schema.oneOf) return 'oneOf';
  if (schema.anyOf) return 'anyOf';
  if (schema.type) {
    if (Array.isArray(schema.type)) return randomPick(schema.type) as string;
    return schema.type;
  }
  if (schema.properties) return 'object';
  if (schema.items) return 'array';
  return 'any';
}

function generateByFormat(format: string): unknown {
  switch (format) {
    case 'date-time': return new Date(Date.now() - randomInt(0, 31536000000)).toISOString();
    case 'date': return randomISODate();
    case 'time': return `${String(randomInt(0, 23)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`;
    case 'email': return randomEmail();
    case 'hostname': return `${randomString(4, 8)}.${randomPick(DOMAINS)}`;
    case 'ipv4': return randomIP();
    case 'ipv6': return '2001:db8::' + randomInt(1, 9999).toString(16);
    case 'uri': case 'url': return randomUrl();
    case 'uuid': return randomUUID();
    case 'phone': return randomPhone();
    case 'color': return randomHexColor();
    case 'json-pointer': return '/properties/' + randomString(3, 8);
    case 'regex': return '\\d{3}-\\d{2}-\\d{4}';
    default: return null;
  }
}

function generateValue(schema: SchemaObject, opts: GenerationOptions, depth = 0): unknown {
  if (depth > 10) return null; // Prevent infinite recursion

  // Handle const
  if (schema.const !== undefined) return schema.const;

  // Handle enum
  if (schema.enum && schema.enum.length > 0) return randomPick(schema.enum);

  // Handle oneOf/anyOf
  if (schema.oneOf && schema.oneOf.length > 0) {
    return generateValue(randomPick(schema.oneOf), opts, depth + 1);
  }
  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateValue(randomPick(schema.anyOf), opts, depth + 1);
  }
  if (schema.allOf && schema.allOf.length > 0) {
    // Merge allOf schemas
    const merged: SchemaObject = { type: 'object' };
    for (const s of schema.allOf) {
      if (s.properties) {
        merged.properties = { ...merged.properties, ...s.properties };
      }
      if (s.required) {
        merged.required = [...(merged.required || []), ...s.required];
      }
    }
    return generateValue(merged, opts, depth + 1);
  }

  // Handle defaults and examples
  if (opts.useDefaults && schema.default !== undefined) return schema.default;
  if (opts.useExamples && schema.examples && schema.examples.length > 0) {
    return randomPick(schema.examples);
  }

  // Null probability
  if (opts.nullProbability > 0 && Math.random() < opts.nullProbability) return null;

  const type = getType(schema);

  switch (type) {
    case 'string': {
      if (schema.format) {
        const fmtVal = generateByFormat(schema.format);
        if (fmtVal !== null) return fmtVal;
      }
      if (schema.pattern) {
        // Try pattern-based generation
        if (schema.pattern === '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$') return randomEmail();
        if (schema.pattern.includes('\\d{4}-\\d{2}-\\d{2}')) return randomISODate();
        return 'pattern_' + randomString(4, 8);
      }
      const minLen = schema.minLength || 3;
      const maxLen = schema.maxLength || 50;
      // Look at property name for hints
      return randomLorem(minLen, Math.min(maxLen, 30));
    }

    case 'number':
    case 'integer': {
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 1000;
      const val = Math.random() * (max - min) + min;
      return type === 'integer' ? Math.floor(val) : +val.toFixed(2);
    }

    case 'boolean':
      return randomBool();

    case 'null':
      return null;

    case 'object':
      return generateObject(schema, opts, depth);

    case 'array':
      return generateArray(schema, opts, depth);

    case 'any':
    default:
      // Pick a random type
      return generateValue({ type: randomPick(['string', 'number', 'boolean', 'object', 'array']) }, opts, depth);
  }
}

function generateObject(schema: SchemaObject, opts: GenerationOptions, depth = 0): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Use property name hints for smarter generation
  const nameHints: Record<string, () => unknown> = {
    name: randomPersonName,
    firstName: () => randomPick(FIRST_NAMES),
    lastName: () => randomPick(LAST_NAMES),
    email: randomEmail,
    phone: randomPhone,
    address: randomAddress,
    city: () => randomPick(CITIES),
    country: () => randomPick(COUNTRIES),
    company: () => randomPick(COMPANY_NAMES),
    url: randomUrl,
    website: randomUrl,
    uuid: randomUUID,
    id: randomUUID,
    color: randomHexColor,
    hexColor: randomHexColor,
    ip: randomIP,
    ipAddress: randomIP,
    createdAt: () => new Date(Date.now() - randomInt(0, 31536000000)).toISOString(),
    updatedAt: () => new Date(Date.now() - randomInt(0, 31536000000)).toISOString(),
    date: randomISODate,
    age: () => randomInt(18, 80),
    zipCode: () => String(randomInt(10000, 99999)),
    postalCode: () => String(randomInt(10000, 99999)),
    price: () => +(Math.random() * 200 + 1).toFixed(2),
    amount: () => +(Math.random() * 1000).toFixed(2),
    quantity: () => randomInt(0, 100),
    count: () => randomInt(0, 1000),
    isActive: randomBool,
    active: randomBool,
    enabled: randomBool,
    verified: randomBool,
    avatar: () => `https://api.dicebear.com/7.x/initials/svg?seed=${randomString(4, 8)}`,
    image: () => `https://picsum.photos/seed/${randomString(4, 8)}/600/400`,
    description: () => randomLorem(8, 25),
    title: () => randomLorem(2, 6),
    message: () => randomLorem(5, 20),
    comment: () => randomLorem(5, 20),
    bio: () => randomLorem(8, 20),
  };

  if (!schema.properties) return result;

  const required = new Set(schema.required || []);
  const props = schema.properties;

  for (const [key, propSchema] of Object.entries(props)) {
    // Use name hint if prop has no specific schema constraints and matches a hint
    const hasConstraints = propSchema.enum || propSchema.const || propSchema.format ||
      propSchema.pattern || propSchema.minimum !== undefined || propSchema.maximum !== undefined ||
      propSchema.minLength || propSchema.maxLength;
    const hint = nameHints[key.toLowerCase()];

    if (hint && !hasConstraints && (propSchema.type === 'string' || !propSchema.type)) {
      const hintVal = hint();
      if (typeof hintVal === (propSchema.type || typeof hintVal)) {
        result[key] = hintVal;
        continue;
      }
    }

    // If property name contains specific patterns, auto-infer type
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
      if (!hasConstraints) {
        result[key] = new Date(Date.now() - randomInt(0, 31536000000)).toISOString();
        continue;
      }
    }

    // Only generate required props by default, plus some optional ones
    if (required.has(key) || Math.random() > 0.3) {
      result[key] = generateValue(propSchema, opts, depth + 1);
    }
  }

  return result;
}

function generateArray(schema: SchemaObject, opts: GenerationOptions, depth = 0): unknown[] {
  const minItems = schema.minItems || 1;
  const maxItems = schema.maxItems || opts.arrayCount;
  const count = randomInt(minItems, Math.min(maxItems, opts.arrayCount));

  if (!schema.items) {
    // No item schema specified, generate generic items
    return Array.from({ length: count }, () => generateValue({ type: 'any' }, opts, depth + 1));
  }

  if (Array.isArray(schema.items)) {
    // Tuple validation
    return schema.items.map(item => generateValue(item, opts, depth + 1));
  }

  return Array.from({ length: count }, () => generateValue(schema.items as SchemaObject, opts, depth + 1));
}

function generateMockData(schemaInput: string, opts: GenerationOptions): { success: boolean; data?: unknown; error?: string } {
  if (!schemaInput.trim()) {
    return { success: false, error: 'Please enter a JSON Schema' };
  }

  let schema: SchemaObject;
  try {
    schema = JSON.parse(schemaInput);
  } catch {
    return { success: false, error: 'Invalid JSON. Please check your schema syntax.' };
  }

  if (!schema.type && !schema.properties && !schema.items && !schema.oneOf && !schema.anyOf && !schema.enum && schema.const === undefined) {
    return { success: false, error: 'Schema must have at least one of: type, properties, items, oneOf, anyOf, enum, or const' };
  }

  try {
    const data = generateValue(schema, opts, 0);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: `Generation error: ${(e as Error).message}` };
  }
}

function generateMultipleItems(schemaInput: string, count: number, opts: GenerationOptions): { success: boolean; data?: unknown; error?: string } {
  if (!schemaInput.trim()) {
    return { success: false, error: 'Please enter a JSON Schema' };
  }

  let schema: SchemaObject;
  try {
    schema = JSON.parse(schemaInput);
  } catch {
    return { success: false, error: 'Invalid JSON. Please check your schema syntax.' };
  }

  try {
    const items = Array.from({ length: count }, () => generateValue(schema, opts, 0));
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: `Generation error: ${(e as Error).message}` };
  }
}

// ── Examples ────────────────────────────────────────────────────────────────

const EXAMPLE_SCHEMAS: { label: string; schema: string }[] = [
  {
    label: 'User Profile',
    schema: `{
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 13, "maximum": 120 },
    "isVerified": { "type": "boolean" },
    "role": { "type": "string", "enum": ["admin", "user", "moderator"] },
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "zipCode": { "type": "string" }
      }
    },
    "tags": { "type": "array", "items": { "type": "string" } },
    "createdAt": { "type": "string", "format": "date-time" }
  }
}`,
  },
  {
    label: 'Product',
    schema: `{
  "type": "object",
  "required": ["id", "name", "price"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "price": { "type": "number", "minimum": 0.01 },
    "currency": { "type": "string", "enum": ["USD", "EUR", "GBP", "JPY"] },
    "inStock": { "type": "boolean" },
    "quantity": { "type": "integer", "minimum": 0 },
    "categories": {
      "type": "array",
      "items": { "type": "string" }
    },
    "rating": { "type": "number", "minimum": 0, "maximum": 5 },
    "imageUrl": { "type": "string", "format": "uri" }
  }
}`,
  },
  {
    label: 'REST API Response',
    schema: `{
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "type": { "const": "article" },
          "attributes": {
            "type": "object",
            "properties": {
              "title": { "type": "string" },
              "body": { "type": "string" },
              "publishedAt": { "type": "string", "format": "date-time" }
            }
          }
        }
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "total": { "type": "integer" },
        "page": { "type": "integer" }
      }
    }
  }
}`,
  },
  {
    label: 'Event Log',
    schema: `{
  "type": "object",
  "properties": {
    "eventId": { "type": "string", "format": "uuid" },
    "eventType": { "type": "string", "enum": ["click", "pageview", "purchase", "signup", "error"] },
    "timestamp": { "type": "string", "format": "date-time" },
    "userId": { "type": "string" },
    "metadata": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "page": { "type": "string", "format": "uri" },
            "referrer": { "type": "string", "format": "uri" }
          }
        },
        {
          "type": "object",
          "properties": {
            "amount": { "type": "number" },
            "items": { "type": "integer" }
          }
        }
      ]
    }
  }
}`,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function JSONSchemaMockDataPage() {
  const [schemaInput, setSchemaInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [opts, setOpts] = useState<GenerationOptions>({
    arrayCount: 3,
    useExamples: true,
    useDefaults: true,
    nullProbability: 0,
  });
  const [generationCount, setGenerationCount] = useState(1);
  const [showOptions, setShowOptions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = useCallback(() => {
    setError('');
    if (!schemaInput.trim()) {
      setError('Please enter a JSON Schema');
      return;
    }

    if (generationCount === 1) {
      const result = generateMockData(schemaInput, opts);
      if (result.success) {
        setOutput(JSON.stringify(result.data, null, 2));
        toast.success('Mock data generated!');
      } else {
        setError(result.error || 'Unknown error');
        setOutput('');
      }
    } else {
      const result = generateMultipleItems(schemaInput, generationCount, opts);
      if (result.success) {
        setOutput(JSON.stringify(result.data, null, 2));
        toast.success(`${generationCount} mock items generated!`);
      } else {
        setError(result.error || 'Unknown error');
        setOutput('');
      }
    }
  }, [schemaInput, opts, generationCount]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Failed to copy'),
    );
  }, [output]);

  const handleClear = useCallback(() => {
    setSchemaInput('');
    setOutput('');
    setError('');
  }, []);

  const handleLoadExample = useCallback((schema: string) => {
    setSchemaInput(schema);
    setError('');
    setOutput('');
  }, []);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const formattedOutput = useMemo(() => {
    if (!output) return '';
    try {
      return JSON.stringify(JSON.parse(output), null, 2);
    } catch {
      return output;
    }
  }, [output]);

  return (
    <ToolLayout
      title="JSON Schema → Mock Data"
      description="Generate realistic mock data from JSON Schema definitions. Paste any JSON Schema and instantly get sample data for testing, prototyping, or API documentation."
    >
      {/* Example schemas */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Examples</h3>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_SCHEMAS.map((ex) => (
            <button
              key={ex.label}
              onClick={() => handleLoadExample(ex.schema)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Options
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        </button>
        {showOptions && (
          <div className="mt-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Array Items</label>
              <input
                type="number"
                min={1}
                max={20}
                value={opts.arrayCount}
                onChange={(e) => setOpts({ ...opts, arrayCount: Math.max(1, Math.min(20, +e.target.value)) })}
                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Null Probability</label>
              <select
                value={opts.nullProbability}
                onChange={(e) => setOpts({ ...opts, nullProbability: +e.target.value })}
                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value={0}>0% (never)</option>
                <option value={0.05}>5%</option>
                <option value={0.1}>10%</option>
                <option value={0.2}>20%</option>
                <option value={0.3}>30%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Use Examples</label>
              <select
                value={opts.useExamples ? 'yes' : 'no'}
                onChange={(e) => setOpts({ ...opts, useExamples: e.target.value === 'yes' })}
                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Use Defaults</label>
              <select
                value={opts.useDefaults ? 'yes' : 'no'}
                onChange={(e) => setOpts({ ...opts, useDefaults: e.target.value === 'yes' })}
                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">JSON Schema</label>
            <button
              onClick={handleClear}
              className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
              title="Clear"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={schemaInput}
            onChange={(e) => { setSchemaInput(e.target.value); setError(''); }}
            placeholder='Paste your JSON Schema here... e.g. {"type": "object", "properties": {...}}'
            className="w-full h-[420px] px-4 py-3 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mock Data</label>
            <div className="flex items-center gap-1">
              {output && (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded text-slate-500 hover:text-indigo-400 transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="relative">
            {error && (
              <div className="w-full h-[420px] px-4 py-3 text-sm font-mono bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 flex items-start overflow-auto">
                <div>
                  <span className="font-semibold">Error: </span>
                  {error}
                </div>
              </div>
            )}
            {!error && !output && (
              <div className="w-full h-[420px] px-4 py-3 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-600 flex items-center justify-center">
                <div className="text-center">
                  <Code2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Generated JSON will appear here</p>
                </div>
              </div>
            )}
            {!error && output && (
              <textarea
                readOnly
                value={formattedOutput}
                className="w-full h-[420px] px-4 py-3 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-green-400 focus:outline-none resize-none"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/25"
          >
            <Play className="w-4 h-4" />
            Generate
          </button>
          <button
            onClick={handleRegenerate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Regenerate with new random values"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-slate-400">Generate</label>
          <input
            type="number"
            min={1}
            max={50}
            value={generationCount}
            onChange={(e) => setGenerationCount(Math.max(1, Math.min(50, +e.target.value)))}
            className="w-16 px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-200 text-center focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-xs text-slate-400">items</span>
        </div>
      </div>

      {/* Feature list */}
      <div className="mt-8 p-5 rounded-lg bg-slate-800/30 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">What this tool supports</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400">
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            All JSON Schema types (string, number, integer, boolean, array, object, null)
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            Format-aware generation (email, date-time, uuid, uri, ipv4, etc.)
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            Smart property name hints (name → person name, price → currency, etc.)
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            enum, const, oneOf, anyOf, allOf
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            minLength, maxLength, minimum, maximum
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            Nested objects and arrays
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            Bulk generation (1-50 items)
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5">✓</span>
            100% client-side, no data sent anywhere
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
