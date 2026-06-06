'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Copy,
  ArrowLeftRight,
  FileJson,
  AlertTriangle,
  Check,
  RotateCcw,
  Play,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Mode = 'apply' | 'generate';

interface PatchOp {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

function parsePointer(path: string): string[] {
  if (path === '' || path === '/') return [];
  return path.split('/').slice(1).map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const tokens = parsePointer(path);
  if (tokens.length === 0) return;
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    if (!(token in current) || typeof current[token] !== 'object' || current[token] === null) {
      current[token] = {};
    }
    current = current[token] as Record<string, unknown>;
  }
  current[tokens[tokens.length - 1]] = value;
}

function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  const tokens = parsePointer(path);
  if (tokens.length === 0) return obj;
  let current: unknown = obj;
  for (const token of tokens) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function removeAtPath(obj: Record<string, unknown>, path: string): void {
  const tokens = parsePointer(path);
  if (tokens.length === 0) return;
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    if (!(token in current) || typeof current[token] !== 'object' || current[token] === null) return;
    current = current[token] as Record<string, unknown>;
  }
  const last = tokens[tokens.length - 1];
  if (Array.isArray(current) && /^\d+$/.test(last)) {
    current.splice(Number(last), 1);
  } else {
    delete current[last];
  }
}

function encodeTokens(tokens: string[]): string {
  return '/' + tokens.map((t) => t.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

function applyPatch(source: Record<string, unknown>, ops: PatchOp[]): { result: Record<string, unknown> | null; error: string | null } {
  try {
    const doc = JSON.parse(JSON.stringify(source));
    for (const op of ops) {
      switch (op.op) {
        case 'add': {
          const tokens = parsePointer(op.path);
          if (tokens.length === 0) return { result: null, error: 'Cannot add to root' };
          const lastToken = tokens[tokens.length - 1];
          const parent = tokens.length === 1 ? doc : getAtPath(doc, encodeTokens(tokens.slice(0, -1)));
          if (Array.isArray(parent)) {
            if (lastToken === '-') { parent.push(op.value); }
            else {
              const idx = Number(lastToken);
              if (isNaN(idx) || idx < 0 || idx > parent.length) return { result: null, error: 'Invalid array index: ' + lastToken };
              parent.splice(idx, 0, op.value);
            }
          } else if (typeof parent === 'object' && parent !== null) {
            (parent as Record<string, unknown>)[lastToken] = op.value;
          } else {
            return { result: null, error: 'Cannot add to path: ' + op.path };
          }
          break;
        }
        case 'remove': {
          if (parsePointer(op.path).length === 0) return { result: null, error: 'Cannot remove root' };
          removeAtPath(doc, op.path);
          break;
        }
        case 'replace': {
          if (getAtPath(doc, op.path) === undefined && op.path !== '') return { result: null, error: 'Path not found: ' + op.path };
          setAtPath(doc, op.path, op.value);
          break;
        }
        case 'move': {
          if (!op.from) return { result: null, error: 'move requires "from"' };
          const val = getAtPath(doc, op.from);
          if (val === undefined) return { result: null, error: 'From path not found: ' + op.from };
          removeAtPath(doc, op.from);
          setAtPath(doc, op.path, val);
          break;
        }
        case 'copy': {
          if (!op.from) return { result: null, error: 'copy requires "from"' };
          const val = getAtPath(doc, op.from);
          if (val === undefined) return { result: null, error: 'From path not found: ' + op.from };
          setAtPath(doc, op.path, JSON.parse(JSON.stringify(val)));
          break;
        }
        case 'test': {
          if (JSON.stringify(getAtPath(doc, op.path)) !== JSON.stringify(op.value)) {
            return { result: null, error: 'Test failed at ' + op.path };
          }
          break;
        }
      }
    }
    return { result: doc, error: null };
  } catch (e) {
    return { result: null, error: (e as Error).message };
  }
}

function generateDiff(oldDoc: Record<string, unknown>, newDoc: Record<string, unknown>): PatchOp[] {
  const ops: PatchOp[] = [];
  function walk(oldVal: unknown, newVal: unknown, path: string) {
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return;
    if (typeof oldVal === 'object' && oldVal !== null && !Array.isArray(oldVal) && typeof newVal === 'object' && newVal !== null && !Array.isArray(newVal)) {
      const oldO = oldVal as Record<string, unknown>;
      const newO = newVal as Record<string, unknown>;
      for (const key of Object.keys(oldO)) {
        if (!(key in newO)) { ops.push({ op: 'remove', path: path + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1') }); }
      }
      for (const key of Object.keys(newO)) {
        const cp = path + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1');
        if (!(key in oldO)) { ops.push({ op: 'add', path: cp, value: newO[key] }); }
        else { walk(oldO[key], newO[key], cp); }
      }
    } else {
      ops.push({ op: 'replace', path, value: newVal });
    }
  }
  walk(oldDoc, newDoc, '');
  return ops;
}

const SAMPLE_SOURCE = '{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com",\n  "address": {\n    "street": "123 Main St",\n    "city": "Springfield",\n    "zip": "12345"\n  },\n  "tags": ["developer", "javascript"]\n}';
const SAMPLE_PATCH = '[\n  { "op": "replace", "path": "/email", "value": "john.doe@example.com" },\n  { "op": "add", "path": "/phone", "value": "+1-555-0123" },\n  { "op": "remove", "path": "/address/zip" },\n  { "op": "add", "path": "/tags/-", "value": "typescript" }\n]';
const SAMPLE_OLD = '{\n  "title": "Hello",\n  "version": 1\n}';
const SAMPLE_NEW = '{\n  "title": "Hello World",\n  "version": 2,\n  "author": "Jane"\n}';

export default function JsonPatchPage() {
  const [mode, setMode] = useState<Mode>('apply');
  const [sourceJson, setSourceJson] = useState(SAMPLE_SOURCE);
  const [patchJson, setPatchJson] = useState(SAMPLE_PATCH);
  const [appliedResult, setAppliedResult] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [oldJson, setOldJson] = useState(SAMPLE_OLD);
  const [newJson, setNewJson] = useState(SAMPLE_NEW);
  const [generatedPatch, setGeneratedPatch] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handleApply = useCallback(() => {
    try {
      const source = JSON.parse(sourceJson);
      const ops: PatchOp[] = JSON.parse(patchJson);
      if (!Array.isArray(ops)) throw new Error('Patch must be an array of operations');
      const { result, error } = applyPatch(source, ops);
      if (error) { setApplyError(error); setAppliedResult(null); }
      else { setApplyError(null); setAppliedResult(JSON.stringify(result, null, 2)); }
    } catch (e) { setApplyError((e as Error).message); setAppliedResult(null); }
  }, [sourceJson, patchJson]);

  const handleGenerate = useCallback(() => {
    try {
      const oldDoc = JSON.parse(oldJson);
      const newDoc = JSON.parse(newJson);
      const diff = generateDiff(oldDoc, newDoc);
      setGenError(null);
      setGeneratedPatch(JSON.stringify(diff, null, 2));
    } catch (e) { setGenError((e as Error).message); setGeneratedPatch(null); }
  }, [oldJson, newJson]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <ToolLayout
      title="JSON Patch (RFC 6902)"
      description="Apply and generate JSON Patch operations — the standard for partial JSON updates used in REST APIs (HTTP PATCH method)."
      controls={
        <div className="flex items-center gap-2">
          <button onClick={() => setMode('apply')} className={'px-3 py-1.5 rounded-md text-sm font-medium transition-colors ' + (mode === 'apply' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent')}>
            <Play className="w-3.5 h-3.5 inline mr-1.5" />Apply
          </button>
          <button onClick={() => setMode('generate')} className={'px-3 py-1.5 rounded-md text-sm font-medium transition-colors ' + (mode === 'generate' ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent')}>
            <Wand2 className="w-3.5 h-3.5 inline mr-1.5" />Generate
          </button>
        </div>
      }
    >
      <div className="mb-6 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <FileJson className="w-4 h-4 text-brand-400" />RFC 6902 Operations
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {[{op:'add',desc:'Add a value',c:'text-green-400'},{op:'remove',desc:'Remove a value',c:'text-red-400'},{op:'replace',desc:'Replace a value',c:'text-yellow-400'},{op:'move',desc:'Move from path',c:'text-blue-400'},{op:'copy',desc:'Copy from path',c:'text-purple-400'},{op:'test',desc:'Assert value',c:'text-orange-400'}].map(({op,desc,c}) => (
            <div key={op} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/30">
              <span className={'font-mono font-bold ' + c}>{op}</span>
              <span className="text-slate-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {mode === 'apply' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Source JSON</label>
                <button onClick={() => { setSourceJson(SAMPLE_SOURCE); setPatchJson(SAMPLE_PATCH); setAppliedResult(null); setApplyError(null); }} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"><RotateCcw className="w-3 h-3" />Reset</button>
              </div>
              <textarea value={sourceJson} onChange={(e) => setSourceJson(e.target.value)} className="w-full h-52 p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-slate-200 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 resize-none" spellCheck={false} placeholder="Paste source JSON here..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Patch Operations</label>
              </div>
              <textarea value={patchJson} onChange={(e) => setPatchJson(e.target.value)} className="w-full h-52 p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-slate-200 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 resize-none" spellCheck={false} placeholder='[{"op": "replace", "path": "/key", "value": "new"}]' />
            </div>
          </div>
          <button onClick={handleApply} className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2"><Play className="w-4 h-4" />Apply Patch</button>
          {applyError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div><p className="text-red-400 font-medium text-sm">Error</p><p className="text-red-300/80 text-sm mt-0.5 font-mono">{applyError}</p></div>
            </div>
          )}
          {appliedResult && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-green-400 flex items-center gap-2"><Check className="w-4 h-4" />Result</label>
                <button onClick={() => handleCopy(appliedResult)} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
              </div>
              <pre className="w-full p-4 rounded-lg bg-slate-900 border border-green-500/30 font-mono text-sm text-slate-200 overflow-x-auto max-h-96 overflow-y-auto">{appliedResult}</pre>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Original JSON</label>
                <button onClick={() => { setOldJson(SAMPLE_OLD); setNewJson(SAMPLE_NEW); setGeneratedPatch(null); setGenError(null); }} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"><RotateCcw className="w-3 h-3" />Reset</button>
              </div>
              <textarea value={oldJson} onChange={(e) => setOldJson(e.target.value)} className="w-full h-52 p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-slate-200 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 resize-none" spellCheck={false} placeholder="Original JSON document..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Updated JSON</label>
              </div>
              <textarea value={newJson} onChange={(e) => setNewJson(e.target.value)} className="w-full h-52 p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-slate-200 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 resize-none" spellCheck={false} placeholder="Updated JSON document..." />
            </div>
          </div>
          <button onClick={handleGenerate} className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2"><Wand2 className="w-4 h-4" />Generate Patch</button>
          {genError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div><p className="text-red-400 font-medium text-sm">Error</p><p className="text-red-300/80 text-sm mt-0.5 font-mono">{genError}</p></div>
            </div>
          )}
          {generatedPatch && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-green-400 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" />Generated Patch</label>
                <button onClick={() => handleCopy(generatedPatch)} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
              </div>
              <pre className="w-full p-4 rounded-lg bg-slate-900 border border-green-500/30 font-mono text-sm text-slate-200 overflow-x-auto max-h-96 overflow-y-auto">{generatedPatch}</pre>
              <p className="text-xs text-slate-500 mt-2">Copy this patch and switch to Apply mode to test it against the original document.</p>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
