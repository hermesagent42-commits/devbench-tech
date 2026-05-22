'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, ArrowDown, ArrowUp, Link } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UrlEncoderPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode-uri' | 'encode-component' | 'decode-uri' | 'decode-component'>('encode-component');

  const process = useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      return;
    }
    try {
      switch (mode) {
        case 'encode-uri':
          setOutput(encodeURI(input));
          break;
        case 'encode-component':
          setOutput(encodeURIComponent(input));
          break;
        case 'decode-uri':
          setOutput(decodeURI(input));
          break;
        case 'decode-component':
          setOutput(decodeURIComponent(input));
          break;
      }
    } catch {
      toast.error('Invalid input — decoding failed');
      setOutput('');
    }
  }, [input, mode]);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied!'),
      () => toast.error('Copy failed')
    );
  }, [output]);

  const clear = useCallback(() => {
    setInput('');
    setOutput('');
  }, []);

  const swap = useCallback(() => {
    if (!output) return;
    setInput(output);
    setOutput('');
  }, [output]);

  return (
    <ToolLayout
      title="URL Encoder / Decoder"
      description="Encode and decode URLs and URI components. Handles special characters, query strings, and international text."
    >
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { id: 'encode-component', label: 'Encode Component', desc: 'encodeURIComponent()' },
          { id: 'encode-uri', label: 'Encode Full URI', desc: 'encodeURI()' },
          { id: 'decode-component', label: 'Decode Component', desc: 'decodeURIComponent()' },
          { id: 'decode-uri', label: 'Decode Full URI', desc: 'decodeURI()' },
        ] as const).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m.id
                ? 'bg-brand-500 text-white'
                : 'bg-surface text-slate-300 hover:bg-surface-light border border-slate-700/50'
            }`}
          >
            <div>{m.label}</div>
            <div className="text-[10px] opacity-60 font-mono">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Input / Output grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">Input</h2>
            <button onClick={clear} className="text-slate-500 hover:text-red-400 transition-colors" title="Clear">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) process(); }}
            placeholder={
              mode.startsWith('encode')
                ? 'Enter text to encode...\ne.g., Hello World & "special" chars\nhttps://example.com?q=hello world'
                : 'Enter encoded URL to decode...\ne.g., Hello%20World%20%26%20%22special%22%20chars'
            }
            className="input-field w-full h-48 resize-y font-mono text-sm"
            spellCheck={false}
          />
          <div className="mt-3 flex gap-2">
            <button onClick={process} className="btn-primary flex items-center gap-1.5 text-sm">
              {mode.startsWith('encode') ? (
                <><ArrowDown className="w-4 h-4" /> Encode</>
              ) : (
                <><ArrowUp className="w-4 h-4" /> Decode</>
              )}
            </button>
            {output && (
              <button onClick={swap} className="btn-secondary flex items-center gap-1.5 text-sm" title="Move output to input">
                <ArrowUp className="w-4 h-4" />
                Swap
              </button>
            )}
          </div>
        </div>

        {/* Output */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">Output</h2>
            {output && (
              <button onClick={copyOutput} className="text-slate-400 hover:text-brand-400 transition-colors" title="Copy">
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
          {output ? (
            <pre className="bg-surface rounded-lg p-4 border border-slate-700/50 h-48 overflow-y-auto font-mono text-sm text-brand-400 whitespace-pre-wrap break-all">
              {output}
            </pre>
          ) : (
            <div className="bg-surface rounded-lg p-4 border border-slate-700/50 h-48 flex items-center justify-center text-slate-500 text-sm">
              Process input to see results
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <Link className="w-4 h-4 text-brand-400" />
          When to use each mode
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-400">
          <div>
            <span className="text-brand-400 font-mono text-xs">encodeURIComponent()</span>
            <p className="mt-1">Use for query string values, form data, path segments. Encodes <code className="text-slate-300">/ ? & = #</code> and more.</p>
          </div>
          <div>
            <span className="text-brand-400 font-mono text-xs">encodeURI()</span>
            <p className="mt-1">Use for full URLs. Preserves <code className="text-slate-300">/ ? & = # : @</code> — only encodes characters that would break URL structure.</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
