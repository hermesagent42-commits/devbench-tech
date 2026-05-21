'use client';

import { useState, useCallback } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowLeftRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'encode' | 'decode';

export default function Base64Page() {
  const [tab, setTab] = useState<Tab>('encode');
  const [encodeInput, setEncodeInput] = useState('');
  const [encodeOutput, setEncodeOutput] = useState('');
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeOutput, setDecodeOutput] = useState('');
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const handleEncode = useCallback(() => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(encodeInput)));
      setEncodeOutput(encoded);
    } catch {
      setEncodeOutput('Error: unable to encode this text');
    }
  }, [encodeInput]);

  const handleDecode = useCallback(() => {
    setDecodeError(null);
    try {
      const decoded = decodeURIComponent(escape(atob(decodeInput.trim())));
      setDecodeOutput(decoded);
    } catch {
      setDecodeError('Invalid Base64 string — check your input and try again.');
      setDecodeOutput('');
    }
  }, [decodeInput]);

  const copyEncodeOutput = useCallback(() => {
    if (!encodeOutput) return;
    navigator.clipboard.writeText(encodeOutput).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [encodeOutput]);

  const copyDecodeOutput = useCallback(() => {
    if (!decodeOutput) return;
    navigator.clipboard.writeText(decodeOutput).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [decodeOutput]);

  const clearEncode = useCallback(() => {
    setEncodeInput('');
    setEncodeOutput('');
  }, []);

  const clearDecode = useCallback(() => {
    setDecodeInput('');
    setDecodeOutput('');
    setDecodeError(null);
  }, []);

  return (
    <ToolLayout
      title="Base64 Encoder / Decoder"
      description="Encode text to Base64 or decode Base64 strings back to readable text."
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-surface-lighter inline-flex">
        <button
          onClick={() => setTab('encode')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'encode'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
          Encode
        </button>
        <button
          onClick={() => setTab('decode')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'decode'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
          Decode
        </button>
      </div>

      {tab === 'encode' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Encode Input */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-300">Text to Encode</label>
            <textarea
              className="input-field flex-1 min-h-[300px] font-mono text-sm resize-y"
              placeholder="Enter text to encode..."
              value={encodeInput}
              onChange={(e) => setEncodeInput(e.target.value)}
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={handleEncode} className="btn-primary flex items-center gap-1.5 text-sm">
                Encode
              </button>
              <button onClick={clearEncode} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Encode Output */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-300">Base64 Output</label>
            <textarea
              className="input-field flex-1 min-h-[300px] font-mono text-sm resize-y"
              readOnly
              value={encodeOutput}
              placeholder="Base64 output will appear here..."
            />
            <button
              onClick={copyEncodeOutput}
              disabled={!encodeOutput}
              className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Decode Input */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-300">Base64 to Decode</label>
            <textarea
              className="input-field flex-1 min-h-[300px] font-mono text-sm resize-y"
              placeholder="Paste Base64 string..."
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={handleDecode} className="btn-primary flex items-center gap-1.5 text-sm">
                Decode
              </button>
              <button onClick={clearDecode} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Decode Output */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-slate-300">Decoded Text</label>
            {decodeError ? (
              <div className="card border-red-500/30 bg-red-500/5 flex-1 min-h-[300px]">
                <p className="text-red-400 font-mono text-sm">{decodeError}</p>
              </div>
            ) : (
              <textarea
                className="input-field flex-1 min-h-[300px] font-mono text-sm resize-y"
                readOnly
                value={decodeOutput}
                placeholder="Decoded text will appear here..."
              />
            )}
            <button
              onClick={copyDecodeOutput}
              disabled={!decodeOutput}
              className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
