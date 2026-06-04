'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy, Check, Download, RefreshCw, Shield, Code2,
  Eye, EyeOff, Gauge, Zap, Layers, Hash, Binary,
  Shuffle, Fingerprint, AlertTriangle, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Technique {
  id: string;
  name: string;
  description: string;
  icon: typeof Shield;
  enabled: boolean;
  category: 'identifiers' | 'strings' | 'structure' | 'numbers';
}

type Preset = 'light' | 'medium' | 'heavy' | 'custom';

// ── Obfuscation Core ───────────────────────────────────────────────────────

// Simple but effective variable renaming
function obfuscateIdentifiers(code: string): string {
  const reservedWords = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
    'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
    'new', 'return', 'super', 'switch', 'this', 'throw', 'try',
    'typeof', 'var', 'void', 'while', 'with', 'yield', 'async',
    'await', 'of', 'from', 'as', 'get', 'set', 'static', 'enum',
    'implements', 'interface', 'package', 'private', 'protected', 'public',
    'null', 'true', 'false', 'undefined', 'NaN', 'Infinity',
    'console', 'window', 'document', 'Math', 'JSON', 'Array',
    'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
    'Error', 'Map', 'Set', 'Promise', 'Symbol', 'parseInt',
    'parseFloat', 'isNaN', 'isFinite', 'eval', 'arguments',
  ]);

  // Find all variable/function declarations
  const declarationRegex = /\b(?:var|let|const|function)\s+([a-zA-Z_$][\w$]*)/g;
  const identifiers = new Map<string, string>();
  let match;

  while ((match = declarationRegex.exec(code)) !== null) {
    const name = match[1];
    if (!reservedWords.has(name) && !identifiers.has(name)) {
      identifiers.set(name, generateObfuscatedName(identifiers.size));
    }
  }

  // Find function parameters
  const paramRegex = /\((?:\)|[^()]*?\))/g; // won't handle nested parens in params perfectly, but good enough
  const funcRegex = /function\s*(?:[a-zA-Z_$][\w$]*)?\s*\(([^)]*)\)|\(([^)]*)\)\s*=>|([a-zA-Z_$][\w$]*)\s*=>/g;
  while ((match = funcRegex.exec(code)) !== null) {
    const params = (match[1] || match[2] || '').split(',').map(p => p.trim()).filter(Boolean);
    for (const param of params) {
      const cleanParam = param.replace(/=.*$/, '').trim(); // handle defaults
      if (!reservedWords.has(cleanParam) && !identifiers.has(cleanParam) && /^[a-zA-Z_$][\w$]*$/.test(cleanParam)) {
        identifiers.set(cleanParam, generateObfuscatedName(identifiers.size));
      }
    }
  }

  // Replace identifiers (longest first to avoid partial matches)
  const sorted = [...identifiers.entries()].sort((a, b) => b[0].length - a[0].length);

  let result = code;
  for (const [original, obfuscated] of sorted) {
    // Only replace when it's a full word (not part of a larger identifier or string)
    const regex = new RegExp(`(?<!["'\\w$])${escapeRegex(original)}(?!["'\\w$])`, 'g');
    result = result.replace(regex, obfuscated);
  }

  return result;
}

function generateObfuscatedName(index: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const names = [
    ...singleCharNames(chars),
    ...doubleCharNames(chars),
    ...tripleCharNames(chars),
  ];
  return index < names.length ? names[index] : `_${index.toString(36)}`;
}

function singleCharNames(chars: string): string[] {
  return ['_', '$', ...chars.split('')];
}

function doubleCharNames(chars: string): string[] {
  const names: string[] = [];
  for (const c1 of chars) {
    for (const c2 of chars) {
      names.push(c1 + c2);
    }
  }
  return names;
}

function tripleCharNames(chars: string): string[] {
  const names: string[] = [];
  const firstChars = chars.slice(0, 10);
  for (const c1 of firstChars) {
    for (const c2 of chars.slice(0, 20)) {
      for (const c3 of chars.slice(0, 20)) {
        names.push(c1 + c2 + c3);
      }
    }
  }
  return names;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Encode string literals
function obfuscateStrings(code: string, method: 'base64' | 'hex' | 'rot13'): string {
  const stringRegex = /"((?:[^"\\]|\\.)*?)"|'((?:[^'\\]|\\.)*?)'|`((?:[^`\\]|\\.)*?)`/g;

  return code.replace(stringRegex, (match, double, single, template, offset) => {
    const str = double || single || template;
    if (!str || str.length === 0) return match;

    let encoded: string;
    let decoder: string;

    switch (method) {
      case 'base64':
        if (typeof btoa === 'function') {
          encoded = btoa(unescape(encodeURIComponent(str)));
          decoder = `(function(){var d=atob("${encoded}");try{return decodeURIComponent(escape(d))}catch(e){return d}})()`;
        } else {
          return match; // fallback, shouldn't happen in browser
        }
        return decoder;
      case 'hex':
        encoded = Array.from(str, (c: string) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        decoder = `(function(h){var r='';for(var i=0;i<h.length;i+=2){r+=String.fromCharCode(parseInt(h.substr(i,2),16));}return r;})("${encoded}")`;
        return decoder;
      case 'rot13':
        encoded = str.replace(/[a-zA-Z]/g, (c: string) =>
          String.fromCharCode(
            c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)
          )
        );
        decoder = `(function(s){return s.replace(/[a-zA-Z]/g,function(c){return String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<'n'?13:-13))})})("${encoded}")`;
        return decoder;
      default:
        return match;
    }
  });
}

// Number obfuscation — split numbers into expressions
function obfuscateNumbers(code: string): string {
  return code.replace(/\b(\d+)\b(?!["'`\w$])/g, (match, num) => {
    const n = parseInt(num, 10);
    if (n < 10 || n > 1000000) return match; // skip very small or very large
    const a = Math.floor(n / 2);
    const b = n - a;
    return `(${a}+${b})`;
  });
}

// Boolean obfuscation
function obfuscateBooleans(code: string): string {
  let result = code;
  // Only replace standalone true/false, not in strings
  result = result.replace(/\btrue\b(?!["'`\w$])/g, '!![]');
  result = result.replace(/\bfalse\b(?!["'`\w$])/g, '![]');
  return result;
}

// Dead code injection — adds unreachable code blocks
function injectDeadCode(code: string): string {
  const deadBlocks = [
    'if(!![]){(()=>{const _0x={};for(let i=0;i<0;i++){_0x[i]=i}})();}',
    ';(function _dEaD(){if(![]){var _b=Array.prototype.slice.call(arguments);return _b.length;}})();',
    ';{const _={};Object.defineProperty(_,\'x\',{get:()=>void 0});void _.x;}',
    ';(function(){try{null()}catch(_){void 0}})();',
  ];

  // Insert dead code at random-ish positions between statements
  const lines = code.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);
    // Add dead code after about 1 in 4 non-empty, non-comment lines
    if (lines[i].trim() && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*') && Math.random() < 0.25) {
      result.push(deadBlocks[Math.floor(Math.random() * deadBlocks.length)]);
    }
  }

  return result.join('\n');
}

// Control flow obfuscation — wraps blocks in while-switch pattern
function obfuscateControlFlow(code: string): string {
  // Split into statements
  const statements = code.split(';').map(s => s.trim()).filter(Boolean);

  if (statements.length < 5) return code; // too short to obfuscate meaningfully

  // Build a dispatcher table
  const cases = statements.map((stmt, i) =>
    `    case ${i}: ${stmt}; continue;`
  );

  return `(function(){var _i=[${statements.map((_, i) => i).join(',')}];var _s=0;while(_s<_i.length){switch(_i[_s++]){\n${cases.join('\n')}\n}}})();`;
}

// ── Main Obfuscation Pipeline ──────────────────────────────────────────────

function obfuscate(
  code: string,
  enabledTechniques: Set<string>,
  stringMethod: 'base64' | 'hex' | 'rot13',
): { output: string; stats: { originalSize: number; obfuscatedSize: number } } {
  let result = code;

  // Remove comments first (simplified)
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  result = result.replace(/\/\/.*$/gm, '');

  // Apply techniques in order
  if (enabledTechniques.has('booleans')) {
    result = obfuscateBooleans(result);
  }

  if (enabledTechniques.has('numbers')) {
    result = obfuscateNumbers(result);
  }

  if (enabledTechniques.has('strings')) {
    result = obfuscateStrings(result, stringMethod);
  }

  if (enabledTechniques.has('dead-code')) {
    result = injectDeadCode(result);
  }

  if (enabledTechniques.has('identifiers')) {
    result = obfuscateIdentifiers(result);
  }

  if (enabledTechniques.has('control-flow')) {
    result = obfuscateControlFlow(result);
  }

  // Whitespace minification
  result = result
    .replace(/^\s+|\s+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    output: result,
    stats: {
      originalSize: new Blob([code]).size,
      obfuscatedSize: new Blob([result]).size,
    },
  };
}

// ── Techniques Configuration ───────────────────────────────────────────────

const TECHNIQUES: Technique[] = [
  {
    id: 'identifiers',
    name: 'Rename Identifiers',
    description: 'Replace variable and function names with short meaningless names',
    icon: Shuffle,
    enabled: true,
    category: 'identifiers',
  },
  {
    id: 'strings',
    name: 'Encode Strings',
    description: 'Hide string literals with encoding — decodes at runtime',
    icon: Code2,
    enabled: true,
    category: 'strings',
  },
  {
    id: 'booleans',
    name: 'Obfuscate Booleans',
    description: 'Replace true/false with equivalent expressions like !![] and ![]',
    icon: Binary,
    enabled: false,
    category: 'structure',
  },
  {
    id: 'numbers',
    name: 'Split Numbers',
    description: 'Break numbers into arithmetic expressions like (42+58)',
    icon: Hash,
    enabled: false,
    category: 'numbers',
  },
  {
    id: 'dead-code',
    name: 'Dead Code Injection',
    description: 'Add unreachable code blocks that never execute',
    icon: Layers,
    enabled: false,
    category: 'structure',
  },
  {
    id: 'control-flow',
    name: 'Control Flow Flattening',
    description: 'Wrap code in a while-switch dispatcher to obscure logic flow',
    icon: Shuffle,
    enabled: false,
    category: 'structure',
  },
];

const PRESETS: Record<Exclude<Preset, 'custom'>, string[]> = {
  light: ['identifiers', 'strings'],
  medium: ['identifiers', 'strings', 'booleans', 'numbers'],
  heavy: ['identifiers', 'strings', 'booleans', 'numbers', 'dead-code', 'control-flow'],
};

// ── Default sample ─────────────────────────────────────────────────────────

const DEFAULT_CODE = `// Try obfuscating this code!
function calculateTotal(items, taxRate) {
  let subtotal = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemTotal = item.price * item.quantity;

    if (item.discount > 0) {
      subtotal += itemTotal * (1 - item.discount);
    } else {
      subtotal += itemTotal;
    }
  }

  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: subtotal,
    tax: tax,
    total: total,
    itemCount: items.length
  };
}

const cart = [
  { price: 29.99, quantity: 2, discount: 0 },
  { price: 49.99, quantity: 1, discount: 0.1 },
  { price: 9.99, quantity: 3, discount: 0.05 }
];

const result = calculateTotal(cart, 0.08);
console.log('Cart total:', result.total);
`;

// ── Component ──────────────────────────────────────────────────────────────

export default function JSObfuscatorPage() {
  const [input, setInput] = useState(DEFAULT_CODE);
  const [activePreset, setActivePreset] = useState<Preset>('light');
  const [techniques, setTechniques] = useState<Technique[]>(() =>
    TECHNIQUES.map(t => ({
      ...t,
      enabled: PRESETS.light.includes(t.id),
    })),
  );
  const [stringMethod, setStringMethod] = useState<'base64' | 'hex' | 'rot13'>('base64');
  const [copied, setCopied] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const enabledSet = useMemo(
    () => new Set(techniques.filter(t => t.enabled).map(t => t.id)),
    [techniques],
  );

  const { output, stats } = useMemo(() => {
    if (!input.trim()) {
      return { output: '', stats: null };
    }
    try {
      const result = obfuscate(input, enabledSet, stringMethod);
      setError(null);
      return { output: result.output, stats: result.stats };
    } catch (e: any) {
      setError(e.message || 'Obfuscation failed');
      return { output: '', stats: null };
    }
  }, [input, enabledSet, stringMethod]);

  const overhead = stats
    ? stats.originalSize > 0
      ? (((stats.obfuscatedSize - stats.originalSize) / stats.originalSize) * 100).toFixed(1)
      : '0'
    : null;

  const toggleTechnique = useCallback((id: string) => {
    setTechniques(prev => prev.map(t =>
      t.id === id ? { ...t, enabled: !t.enabled } : t,
    ));
    setActivePreset('custom');
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setActivePreset(preset);
    if (preset === 'custom') return;
    setTechniques(prev => prev.map(t => ({
      ...t,
      enabled: PRESETS[preset].includes(t.id),
    })));
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'obfuscated.js';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded obfuscated.js');
  }, [output]);

  const handleReset = useCallback(() => {
    setInput('');
    setActivePreset('light');
    applyPreset('light');
    setStringMethod('base64');
    setError(null);
    toast.success('Reset');
  }, [applyPreset]);

  const anyEnabled = techniques.some(t => t.enabled);

  return (
    <ToolLayout
      title="JavaScript Obfuscator"
      description="Protect your JavaScript code with multiple obfuscation techniques — identifier renaming, string encoding, dead code, and control flow flattening. 100% client-side."
      controls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Presets */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            {(['light', 'medium', 'heavy'] as Preset[]).map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activePreset === preset
                    ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
                {preset === 'light' && ' 🟢'}
                {preset === 'medium' && ' 🟡'}
                {preset === 'heavy' && ' 🔴'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-700/50 mx-1" />

          {/* Toggle input */}
          <button
            onClick={() => setShowInput(!showInput)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              showInput
                ? 'text-slate-300 bg-slate-700/50'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'
            }`}
          >
            {showInput ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Input
          </button>

          <div className="h-6 w-px bg-slate-700/50 mx-1" />

          {/* String method */}
          <select
            value={stringMethod}
            onChange={e => setStringMethod(e.target.value as any)}
            className="bg-slate-800/50 border border-slate-700/50 rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-brand-500/50"
            disabled={!enabledSet.has('strings')}
          >
            <option value="base64">String: Base64</option>
            <option value="hex">String: Hex</option>
            <option value="rot13">String: ROT13</option>
          </select>

          <div className="flex-1" />

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
    >
      {/* Technique Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {techniques.map(tech => {
          const Icon = tech.icon;
          return (
            <label
              key={tech.id}
              className={`relative flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                tech.enabled
                  ? 'border-brand-500/30 bg-brand-500/5'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
              }`}
            >
              <input
                type="checkbox"
                checked={tech.enabled}
                onChange={() => toggleTechnique(tech.id)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-brand-500 focus:ring-brand-500/30 focus:ring-offset-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${tech.enabled ? 'text-brand-400' : 'text-slate-500'}`} />
                  <span className={`text-sm font-medium ${tech.enabled ? 'text-slate-100' : 'text-slate-400'}`}>
                    {tech.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tech.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Editor Panels */}
      <div className={`grid ${showInput ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {/* Input */}
        {showInput && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Source Code
              </span>
              <span className="text-xs text-slate-500">
                {stats ? `${(stats.originalSize / 1024).toFixed(1)} KB` : ''}
              </span>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste your JavaScript code here..."
              className="w-full h-[500px] bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-slate-600"
              spellCheck={false}
            />
          </div>
        )}

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-brand-400 uppercase tracking-wider">
              Obfuscated Output
            </span>
            <div className="flex items-center gap-3">
              {stats && (
                <span className="text-xs text-slate-500">
                  {(stats.obfuscatedSize / 1024).toFixed(1)} KB
                  {overhead && overhead !== '0.0' && overhead !== '0' && (
                    <span className="text-amber-400 ml-1">(+{overhead}%)</span>
                  )}
                </span>
              )}
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
              <button
                onClick={handleDownload}
                disabled={!output}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
          </div>
          <div className="relative">
            {!anyEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-lg z-10">
                <div className="text-center p-6">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-300 font-medium">No techniques enabled</p>
                  <p className="text-xs text-slate-500 mt-1">Select at least one obfuscation technique above</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute top-2 right-2 z-20">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {error}
                </div>
              </div>
            )}
            <textarea
              ref={outputRef}
              value={output}
              readOnly
              placeholder="Obfuscated code will appear here..."
              className="w-full h-[500px] bg-slate-900/80 border border-brand-500/20 rounded-lg p-4 font-mono text-sm text-slate-300 resize-none focus:outline-none placeholder:text-slate-600"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="mt-4 flex flex-wrap items-center gap-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="flex items-center gap-2 text-xs">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Original:</span>
            <span className="text-slate-300 font-mono">{stats.originalSize.toLocaleString()} bytes</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Zap className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-slate-500">Obfuscated:</span>
            <span className="text-brand-400 font-mono">{stats.obfuscatedSize.toLocaleString()} bytes</span>
          </div>
          {overhead && (
            <div className="flex items-center gap-2 text-xs">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-500">Overhead:</span>
              <span className={`font-mono ${parseFloat(overhead) > 50 ? 'text-amber-400' : 'text-slate-300'}`}>
                {overhead}%
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs ml-auto">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Techniques active:</span>
            <span className="text-slate-300 font-medium">
              {techniques.filter(t => t.enabled).length} of {techniques.length}
            </span>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
