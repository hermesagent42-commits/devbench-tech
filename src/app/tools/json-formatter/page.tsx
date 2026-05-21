'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

function highlightJSON(json: string): string {
  // Escape HTML entities for safe rendering
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply syntax highlighting via regex substitutions
  return escaped
    // Strings (including keys inside quotes)
    .replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      '<span class="text-brand-400">$1</span>:'
    )
    // Remaining standalone strings
    .replace(
      /"(?:[^"\\]|\\.)*"/g,
      '<span class="text-green-400">$&</span>'
    )
    // Numbers
    .replace(
      /\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
      '<span class="text-amber-400">$1</span>'
    )
    // Booleans and null
    .replace(
      /\b(true|false|null)\b/g,
      '<span class="text-purple-400">$1</span>'
    );
}

export default function JsonFormatterPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFormatted, setIsFormatted] = useState(false);

  const format = useCallback(() => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      setOutput(formatted);
      setIsFormatted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Invalid JSON: ${message}`);
      setOutput('');
      setIsFormatted(false);
    }
  }, [input]);

  const minify = useCallback(() => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setIsFormatted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Invalid JSON: ${message}`);
      setOutput('');
      setIsFormatted(false);
    }
  }, [input]);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Failed to copy')
    );
  }, [output]);

  const clear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
    setIsFormatted(false);
  }, []);

  return (
    <ToolLayout
      title="JSON Formatter"
      description="Format, minify, and validate JSON with syntax highlighting."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-300">Input</label>
          <textarea
            className="input-field flex-1 min-h-[400px] font-mono text-sm resize-y"
            placeholder='{"hello": "world"}'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={format} className="btn-primary flex items-center gap-1.5 text-sm">
              <Maximize2 className="w-4 h-4" />
              Format
            </button>
            <button onClick={minify} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Minimize2 className="w-4 h-4" />
              Minify
            </button>
            <button onClick={clear} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-300">Output</label>
          {error ? (
            <div className="card border-red-500/30 bg-red-500/5 flex-1 min-h-[400px]">
              <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
          ) : isFormatted ? (
            <pre
              className="card flex-1 min-h-[400px] overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightJSON(output) }}
            />
          ) : (
            <div className="card flex-1 min-h-[400px] flex items-center justify-center">
              <p className="text-slate-500 text-sm">Formatted JSON will appear here</p>
            </div>
          )}
          <button
            onClick={copyOutput}
            disabled={!output}
            className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>
    </ToolLayout>
  );
}
