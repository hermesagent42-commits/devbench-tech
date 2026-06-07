'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, RotateCcw, Braces, Eye, Key, Shield,
  Layers, Code2, Zap, BookOpen, Boxes, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Category = 'creation' | 'inspection' | 'manipulation' | 'protection' | 'iteration' | 'comparison';

interface MethodDef {
  name: string;
  signature: string;
  description: string;
  category: Category;
  execute: (obj: Record<string, unknown>) => { result: unknown; explanation: string };
}

const OBJECT_METHODS: MethodDef[] = [
  {
    name: 'Object.create()',
    signature: 'Object.create(proto, propertiesObject?)',
    description: 'Creates a new object with the specified prototype.',
    category: 'creation',
    execute: (obj) => {
      const child = Object.create(obj);
      child.childProp = 'own property';
      return { result: child, explanation: 'Created a new object with input as prototype. The child inherits all parent properties. childProp is own, others are inherited.' };
    },
  },
  {
    name: 'Object.assign()',
    signature: 'Object.assign(target, ...sources)',
    description: 'Copies enumerable own properties from sources to target.',
    category: 'creation',
    execute: (obj) => {
      const source = { newField: 42 };
      const result = Object.assign({}, obj, source);
      return { result, explanation: 'Merged source into a copy. Later sources overwrite earlier ones.' };
    },
  },
  {
    name: 'Object.fromEntries()',
    signature: 'Object.fromEntries(iterable)',
    description: 'Transforms key-value pairs into an object. Inverse of Object.entries().',
    category: 'creation',
    execute: (obj) => {
      const entries = Object.entries(obj);
      const modified = entries.map(([k, v]) => [k.toUpperCase(), typeof v === 'number' ? (v as number) * 2 : v]);
      return { result: Object.fromEntries(modified), explanation: 'Extracted entries, modified them (uppercased keys, doubled numbers), and rebuilt.' };
    },
  },
  {
    name: 'Object.keys()',
    signature: 'Object.keys(obj)',
    description: 'Returns array of own enumerable string property names.',
    category: 'inspection',
    execute: (obj) => ({ result: Object.keys(obj), explanation: 'Returns only own enumerable string keys. No inherited or Symbol keys.' }),
  },
  {
    name: 'Object.values()',
    signature: 'Object.values(obj)',
    description: 'Returns array of own enumerable property values.',
    category: 'inspection',
    execute: (obj) => ({ result: Object.values(obj), explanation: 'Returns values in the same order as Object.keys().' }),
  },
  {
    name: 'Object.entries()',
    signature: 'Object.entries(obj)',
    description: 'Returns [key, value] pairs for own enumerable properties.',
    category: 'inspection',
    execute: (obj) => ({ result: Object.entries(obj), explanation: 'Returns [key, value] pairs. Perfect for for...of, Map conversion, and React lists.' }),
  },
  {
    name: 'Object.hasOwn()',
    signature: 'Object.hasOwn(obj, prop) — ES2022',
    description: 'Checks if object has own (not inherited) property.',
    category: 'inspection',
    execute: (obj) => {
      const checks = Object.keys(obj).map((k) => ({ key: k, hasOwn: Object.hasOwn(obj, k) }));
      checks.push({ key: 'toString', hasOwn: Object.hasOwn(obj, 'toString') });
      return { result: checks, explanation: 'toString is inherited from prototype — hasOwn returns false. Modern replacement for hasOwnProperty().' };
    },
  },
  {
    name: 'Object.getOwnPropertyNames()',
    signature: 'Object.getOwnPropertyNames(obj)',
    description: 'Returns ALL own property names, including non-enumerable.',
    category: 'inspection',
    execute: (obj) => {
      const enumerable = Object.keys(obj);
      const all = Object.getOwnPropertyNames(obj);
      const nonEnum = all.filter((n) => !enumerable.includes(n));
      return { result: { all, enumerable, nonEnumerable: nonEnum }, explanation: `${all.length} total names — ${enumerable.length} enumerable, ${nonEnum.length} non-enumerable.` };
    },
  },
  {
    name: 'Object.getOwnPropertySymbols()',
    signature: 'Object.getOwnPropertySymbols(obj)',
    description: 'Returns all Symbol-keyed own properties.',
    category: 'inspection',
    execute: (obj) => {
      const sym = Symbol('secret');
      const enriched = { ...obj, [sym]: 'hidden' };
      const symbols = Object.getOwnPropertySymbols(enriched);
      return { result: symbols.map((s) => ({ symbol: s.toString(), value: (enriched as Record<symbol, unknown>)[s] })), explanation: 'Symbol properties are invisible to Object.keys() and for...in.' };
    },
  },
  {
    name: 'Object.getOwnPropertyDescriptor()',
    signature: 'Object.getOwnPropertyDescriptor(obj, prop)',
    description: 'Returns property descriptor: value, writable, enumerable, configurable.',
    category: 'inspection',
    execute: (obj) => {
      const keys = Object.keys(obj);
      if (keys.length === 0) return { result: null, explanation: 'No enumerable own properties.' };
      const desc = Object.getOwnPropertyDescriptor(obj, keys[0]);
      return { result: { key: keys[0], descriptor: desc }, explanation: `Descriptor for "${keys[0]}": writable=${desc?.writable}, enumerable=${desc?.enumerable}, configurable=${desc?.configurable}.` };
    },
  },
  {
    name: 'Object.getOwnPropertyDescriptors()',
    signature: 'Object.getOwnPropertyDescriptors(obj)',
    description: 'Returns all own property descriptors. Use with defineProperties() for cloning.',
    category: 'inspection',
    execute: (obj) => ({ result: Object.getOwnPropertyDescriptors(obj), explanation: 'Map of property name → descriptor. Clone objects while preserving attributes.' }),
  },
  {
    name: 'Object.is()',
    signature: 'Object.is(value1, value2)',
    description: 'Same-value comparison. Like === but handles NaN/-0 correctly.',
    category: 'comparison',
    execute: () => {
      const cases = [
        { a: 'NaN', b: 'NaN', ObjectIs: Object.is(NaN, NaN), strictEq: 'false (NaN !== NaN)' },
        { a: '0', b: '-0', ObjectIs: Object.is(0, -0), strictEq: 'true (0 === -0)' },
        { a: '1', b: '1', ObjectIs: Object.is(1, 1), strictEq: 'true' },
      ];
      return { result: cases, explanation: 'NaN equals NaN with Object.is() (=== says false). +0 != -0 (=== says true). Used internally by Map/Set.' };
    },
  },
  {
    name: 'Object.freeze()',
    signature: 'Object.freeze(obj)',
    description: 'Freezes object — no add/delete/change. Shallow only.',
    category: 'protection',
    execute: (obj) => {
      const copy = JSON.parse(JSON.stringify(obj));
      Object.freeze(copy);
      return { result: { frozen: copy, isFrozen: Object.isFrozen(copy), note: 'Adding/changing/deleting properties fails' }, explanation: 'Shallow freeze — nested objects are NOT frozen. Use deepFreeze pattern for deep immutability.' };
    },
  },
  {
    name: 'Object.seal()',
    signature: 'Object.seal(obj)',
    description: 'Seals object — prevents add/delete, but values can change.',
    category: 'protection',
    execute: (obj) => {
      const copy = JSON.parse(JSON.stringify(obj));
      Object.seal(copy);
      if (Object.keys(copy).length > 0) (copy as Record<string, unknown>)[Object.keys(copy)[0]] = 'modified!';
      return { result: { sealed: copy, isSealed: Object.isSealed(copy), note: 'Values CAN change (unlike freeze)' }, explanation: 'Existing values are mutable. Only add/delete is blocked.' };
    },
  },
  {
    name: 'Object.preventExtensions()',
    signature: 'Object.preventExtensions(obj)',
    description: 'Prevents new properties. Existing ones can be changed and deleted.',
    category: 'protection',
    execute: (obj) => {
      const copy = JSON.parse(JSON.stringify(obj));
      Object.preventExtensions(copy);
      return { result: { obj: copy, isExtensible: Object.isExtensible(copy), note: 'Weakest protection — can still modify and delete' }, explanation: 'Prevents only additions. Existing properties are fully mutable and deletable.' };
    },
  },
  {
    name: 'Object.defineProperty()',
    signature: 'Object.defineProperty(obj, prop, descriptor)',
    description: 'Defines property with precise attribute control.',
    category: 'manipulation',
    execute: (obj) => {
      const copy = { ...obj };
      Object.defineProperty(copy, 'readOnly', { value: 'cant change me', writable: false, enumerable: true, configurable: false });
      const desc = Object.getOwnPropertyDescriptor(copy, 'readOnly');
      return { result: { obj: copy, added: 'readOnly', descriptor: desc }, explanation: 'Added readOnly with full attribute control. Most powerful way to create properties.' };
    },
  },
  {
    name: 'Object.defineProperties()',
    signature: 'Object.defineProperties(obj, props)',
    description: 'Defines multiple properties at once.',
    category: 'manipulation',
    execute: (obj) => {
      const copy = { ...obj };
      Object.defineProperties(copy, {
        timestamp: { value: Date.now(), writable: false, enumerable: true },
        _internal: { value: 'hidden', writable: true, enumerable: false },
      });
      return { result: { obj: copy, visibleKeys: Object.keys(copy), allKeys: Object.getOwnPropertyNames(copy), note: '_internal hidden from iteration' }, explanation: '_internal is enumerable=false, so hidden from for...in and Object.keys().' };
    },
  },
  {
    name: 'Object.groupBy()',
    signature: 'Object.groupBy(items, callbackFn) — ES2024',
    description: 'Groups iterable elements by callback. Null-prototype result.',
    category: 'iteration',
    execute: (obj) => {
      const grouped = Object.groupBy(Object.values(obj), (item) => {
        if (item === null) return 'null';
        return typeof item;
      });
      return { result: grouped, explanation: 'Grouped all values by JS type. ES2024 — returns null-prototype object (no inherited toString, etc.).' };
    },
  },
  {
    name: 'Object.getPrototypeOf()',
    signature: 'Object.getPrototypeOf(obj)',
    description: 'Returns the internal [[Prototype]] of an object.',
    category: 'inspection',
    execute: (obj) => {
      const proto = Object.getPrototypeOf(obj);
      const isDefault = proto === Object.prototype;
      return { result: { prototype: isDefault ? 'Object.prototype' : proto?.constructor?.name || String(proto), isDefault }, explanation: isDefault ? 'Default prototype for plain objects.' : `Custom prototype: ${proto?.constructor?.name || String(proto)}.` };
    },
  },
  {
    name: 'Object.setPrototypeOf()',
    signature: 'Object.setPrototypeOf(obj, prototype)',
    description: 'Sets the [[Prototype]]. SLOW — prefer Object.create().',
    category: 'manipulation',
    execute: (obj) => {
      const copy = { ...obj };
      Object.setPrototypeOf(copy, { greet() { return 'hello'; } });
      return { result: { obj: copy, warning: '⚠ Mutating [[Prototype]] is extremely slow. Use Object.create() for new objects instead.' }, explanation: 'Changed prototype at runtime. Performance warning: this operation is slow on all JS engines.' };
    },
  },
];

const CATEGORIES: { key: Category; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: 'creation', label: 'Creation', icon: Boxes, color: 'text-green-400', bg: 'bg-green-500/10' },
  { key: 'inspection', label: 'Inspection', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'comparison', label: 'Comparison', icon: Layers, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { key: 'protection', label: 'Protection', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10' },
  { key: 'manipulation', label: 'Manipulation', icon: Code2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'iteration', label: 'Iteration', icon: RefreshCw, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
];

const PRESETS: Record<string, Record<string, unknown>> = {
  user: { name: 'Ada Lovelace', age: 36, role: 'programmer', active: true, tags: ['computing', 'analytics'] },
  config: { theme: 'dark', language: 'en', notifications: true, fontSize: 14, layout: 'grid' },
  product: { id: 'prod_9xK2m', name: 'Ergonomic Keyboard', price: 149.99, inStock: true, categories: ['electronics', 'office'], rating: 4.7 },
  nested: { user: { name: 'Grace', email: 'grace@example.com' }, settings: { theme: 'light' }, score: 95 },
  simple: { a: 1, b: 2, c: 3 },
};

export default function ObjectMethodsPlaygroundPage() {
  const [editorInput, setEditorInput] = useState(JSON.stringify(PRESETS.user, null, 2));
  const [selectedPreset, setSelectedPreset] = useState('user');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);

  const parsedObject = useMemo((): { obj: Record<string, unknown> | null; error: string | null } => {
    try {
      const parsed = JSON.parse(editorInput);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { obj: null, error: 'Input must be a JSON object (not array, null, or primitive).' };
      }
      return { obj: parsed as Record<string, unknown>, error: null };
    } catch (e) {
      return { obj: null, error: (e as Error).message };
    }
  }, [editorInput]);

  const executionResult = useMemo(() => {
    if (!selectedMethod || !parsedObject.obj) return null;
    const method = OBJECT_METHODS.find((m) => m.name === selectedMethod);
    if (!method) return null;
    try {
      return method.execute(parsedObject.obj);
    } catch (e) {
      return { result: null, explanation: `Error: ${(e as Error).message}` };
    }
  }, [selectedMethod, parsedObject.obj]);

  const filteredMethods = useMemo(() => {
    if (!categoryFilter) return OBJECT_METHODS;
    return OBJECT_METHODS.filter((m) => m.category === categoryFilter);
  }, [categoryFilter]);

  const handlePresetChange = useCallback((presetKey: string) => {
    setSelectedPreset(presetKey);
    const obj = PRESETS[presetKey];
    if (obj) setEditorInput(JSON.stringify(obj, null, 2));
  }, []);

  const handleCopyResult = useCallback(async () => {
    if (!executionResult) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(executionResult.result, null, 2));
      toast.success('Result copied!');
    } catch { toast.error('Failed to copy'); }
  }, [executionResult]);

  const handleReset = useCallback(() => {
    setEditorInput(JSON.stringify(PRESETS.user, null, 2));
    setSelectedPreset('user');
    setSelectedMethod(null);
    setCategoryFilter(null);
  }, []);

  const formatResult = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  };

  return (
    <ToolLayout
      title="JavaScript Object Methods Explorer"
      description="Explore every Object static method — keys, values, entries, freeze, seal, assign, create, defineProperty, groupBy, and more. 20+ methods with live execution and detailed explanations."
      controls={
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Preset:</label>
            <select value={selectedPreset} onChange={(e) => handlePresetChange(e.target.value)} className="px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200">
              {Object.keys(PRESETS).map((k) => (<option key={k} value={k}>{k}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-slate-500 mr-1">Filter:</span>
            <button onClick={() => setCategoryFilter(null)} className={`px-2 py-1 text-xs rounded font-medium transition-colors ${categoryFilter === null ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}>All</button>
            {CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => setCategoryFilter(cat.key)} className={`px-2 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1 ${categoryFilter === cat.key ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}>
                <cat.icon className="w-3 h-3" />{cat.label}
              </button>
            ))}
          </div>
          <button onClick={handleReset} className="ml-auto p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="Reset"><RotateCcw className="w-4 h-4" /></button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Input + method list */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Braces className="w-4 h-4" />JSON Object</label>
            <textarea value={editorInput} onChange={(e) => setEditorInput(e.target.value)} className="h-44 p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none" spellCheck={false} />
            {parsedObject.error && <p className="text-xs text-red-400 font-mono">⚠ {parsedObject.error}</p>}
            {parsedObject.obj && <p className="text-xs text-green-400 font-mono">✓ Valid — {Object.keys(parsedObject.obj).length} keys</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Zap className="w-4 h-4" />Select a Method</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredMethods.map((method) => (
                <button key={method.name} onClick={() => setSelectedMethod(method.name)} className={`text-left px-3 py-2 rounded-lg text-xs font-mono transition-all border ${selectedMethod === method.name ? 'bg-brand-500/10 border-brand-500/40 text-brand-300' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{method.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORIES.find((c) => c.key === method.category)?.bg} ${CATEGORIES.find((c) => c.key === method.category)?.color}`}>{method.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{method.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Explanation + Result */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {selectedMethod && executionResult ? (
            <>
              <div className="bg-surface-light rounded-lg border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-white font-mono">{selectedMethod}</h3>
                  <button onClick={handleCopyResult} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors" title="Copy result"><Copy className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-slate-400 font-mono mb-3">{OBJECT_METHODS.find((m) => m.name === selectedMethod)?.signature}</p>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-brand-500/10">
                  <div className="flex items-start gap-2"><BookOpen className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" /><p className="text-sm text-slate-300 leading-relaxed">{executionResult.explanation}</p></div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Eye className="w-4 h-4" />Result</label>
                <div className="flex-1 min-h-[280px] p-4 bg-slate-900 border border-slate-700 rounded-lg overflow-auto">
                  <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap break-all">{formatResult(executionResult.result)}</pre>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4"><Zap className="w-8 h-8 text-slate-600" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">Explore Object Methods</h3>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">Select a method from the left panel to see it executed live on your object. Each method includes a detailed explanation of what it does and when to use it.</p>
              <div className="grid grid-cols-3 gap-3 mt-6 max-w-sm">
                {CATEGORIES.map((cat) => (
                  <div key={cat.key} className={`flex flex-col items-center gap-1 p-3 rounded-lg ${cat.bg} border border-slate-700/30`}>
                    <cat.icon className={`w-5 h-5 ${cat.color}`} /><span className={`text-[10px] font-medium ${cat.color}`}>{cat.label}</span>
                    <span className="text-[10px] text-slate-500">{OBJECT_METHODS.filter((m) => m.category === cat.key).length} methods</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cheatsheet footer */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Key className="w-4 h-4 text-brand-400" />Method Cheatsheet</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {OBJECT_METHODS.map((m) => (
            <button key={m.name} onClick={() => setSelectedMethod(m.name)} className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${selectedMethod === m.name ? 'bg-brand-500/10 border border-brand-500/30 text-brand-300' : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}>
              <span className="font-mono font-semibold">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
