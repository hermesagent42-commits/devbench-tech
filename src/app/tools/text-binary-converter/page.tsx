'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, ArrowLeftRight, Trash2, AlignJustify, Braces, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'text-to-binary' | 'binary-to-text';
type OutputFormat = 'spaced' | 'continuous' | 'grouped4';

export default function TextBinaryConverterPage() {
  const [tab, setTab] = useState<Tab>('text-to-binary');
  const [textInput, setTextInput] = useState('');
  const [binaryOutput, setBinaryOutput] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('spaced');
  const [binaryInput, setBinaryInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [binaryError, setBinaryError] = useState<string | null>(null);
  const [encoding, setEncoding] = useState<'utf8' | 'ascii'>('utf8');
  const [showUnicodeWarning, setShowUnicodeWarning] = useState(false);

  // ── Text → Binary ──────────────────────────────────────────────────────

  const textToBinary = useCallback(() => {
    if (!textInput.trim()) {
      setBinaryOutput('');
      setShowUnicodeWarning(false);
      return;
    }

    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(textInput);
      let binaryStr = '';
      let hasMultiByte = false;

      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] > 127) hasMultiByte = true;
        const bin = bytes[i].toString(2).padStart(8, '0');

        if (outputFormat === 'continuous') {
          binaryStr += bin;
        } else if (outputFormat === 'grouped4') {
          binaryStr += bin.slice(0, 4) + ' ' + bin.slice(4, 8) + '  ';
        } else {
          binaryStr += bin + ' ';
        }
      }

      setBinaryOutput(binaryStr.trimEnd());
      setShowUnicodeWarning(hasMultiByte && encoding === 'ascii');
    } catch {
      setBinaryOutput('Error: unable to encode this text');
      setShowUnicodeWarning(false);
    }
  }, [textInput, outputFormat, encoding]);

  // ── Binary → Text ──────────────────────────────────────────────────────

  const binaryToText = useCallback(() => {
    setBinaryError(null);
    const raw = binaryInput.replace(/\s/g, '');

    if (!raw) {
      setTextOutput('');
      return;
    }

    if (!/^[01]+$/.test(raw)) {
      setBinaryError('Invalid binary input — only 0 and 1 characters are allowed.');
      setTextOutput('');
      return;
    }

    if (raw.length % 8 !== 0) {
      setBinaryError(`Byte alignment error — binary length (${raw.length}) is not a multiple of 8. Each character needs exactly 8 bits.`);
      setTextOutput('');
      return;
    }

    try {
      const bytes = new Uint8Array(raw.length / 8);
      for (let i = 0; i < raw.length; i += 8) {
        bytes[i / 8] = parseInt(raw.slice(i, i + 8), 2);
      }
      const decoder = new TextDecoder();
      setTextOutput(decoder.decode(bytes));
    } catch {
      setBinaryError('Unable to decode this binary sequence into valid text.');
      setTextOutput('');
    }
  }, [binaryInput]);

  // ── Copy ───────────────────────────────────────────────────────────────

  const copyBinaryOutput = useCallback(() => {
    if (!binaryOutput) return;
    navigator.clipboard.writeText(binaryOutput).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [binaryOutput]);

  const copyTextOutput = useCallback(() => {
    if (!textOutput) return;
    navigator.clipboard.writeText(textOutput).then(
      () => toast.success('Copied!'),
      () => toast.error('Failed to copy')
    );
  }, [textOutput]);

  // ── Clear ──────────────────────────────────────────────────────────────

  const clearTextSide = useCallback(() => {
    setTextInput('');
    setBinaryOutput('');
    setShowUnicodeWarning(false);
  }, []);

  const clearBinarySide = useCallback(() => {
    setBinaryInput('');
    setTextOutput('');
    setBinaryError(null);
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────

  const textStats = useMemo(() => {
    const byteCount = binaryOutput
      ? outputFormat === 'continuous'
        ? binaryOutput.length / 8
        : outputFormat === 'spaced'
          ? binaryOutput.split(' ').filter(Boolean).length
          : binaryOutput.split('  ').filter(Boolean).length
      : 0;
    return {
      chars: textInput.length,
      bytes: byteCount,
      bits: byteCount * 8,
    };
  }, [textInput, binaryOutput, outputFormat]);

  const binaryStats = useMemo(() => {
    const raw = binaryInput.replace(/\s/g, '');
    return {
      bits: raw.length,
      bytes: raw.length > 0 ? raw.length / 8 : 0,
      valid: /^[01]*$/.test(raw) && raw.length % 8 === 0,
    };
  }, [binaryInput]);

  return (
    <ToolLayout
      title="Text ↔ Binary Converter"
      description="Convert text to binary (8-bit bytes) and binary back to text. UTF-8 aware with multiple output formats."
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-slate-800 inline-flex">
        <button
          onClick={() => setTab('text-to-binary')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'text-to-binary'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
          Text → Binary
        </button>
        <button
          onClick={() => setTab('binary-to-text')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'binary-to-text'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
          Binary → Text
        </button>
      </div>

      {/* ── TEXT → BINARY ──────────────────────────────────────────────── */}
      {tab === 'text-to-binary' && (
        <div>
          {/* Format controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Output Format</span>
            <div className="flex gap-1 p-1 rounded-lg bg-slate-800">
              {(['spaced', 'grouped4', 'continuous'] as OutputFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    outputFormat === fmt
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fmt === 'spaced' && <><AlignJustify className="w-3 h-3 inline mr-1" /> Byte-Spaced</>}
                  {fmt === 'grouped4' && <><Braces className="w-3 h-3 inline mr-1" /> Nibble-Grouped</>}
                  {fmt === 'continuous' && <><GripVertical className="w-3 h-3 inline mr-1" /> Continuous</>}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Text Input</label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyUp={() => textToBinary()}
              placeholder="Type or paste text here..."
              rows={5}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={textToBinary}
                className="px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                Convert to Binary
              </button>
              <button
                onClick={clearTextSide}
                className="px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                Clear
              </button>
            </div>
          </div>

          {/* Unicode Warning */}
          {showUnicodeWarning && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              Multi-byte UTF-8 characters detected. Each non-ASCII character produces multiple bytes in the binary output.
            </div>
          )}

          {/* Output */}
          {binaryOutput && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Binary Output</label>
                <button
                  onClick={copyBinaryOutput}
                  className="px-3 py-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  Copy
                </button>
              </div>
              <div className="relative">
                <pre className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-green-400 font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto select-all">
                  {binaryOutput}
                </pre>
              </div>
            </div>
          )}

          {/* Stats */}
          {binaryOutput && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                {textStats.chars} character{textStats.chars !== 1 ? 's' : ''}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                {textStats.bytes} byte{textStats.bytes !== 1 ? 's' : ''}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                {textStats.bits} bits
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── BINARY → TEXT ──────────────────────────────────────────────── */}
      {tab === 'binary-to-text' && (
        <div>
          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Binary Input
              <span className="text-xs text-slate-500 font-normal ml-2">(space-separated bytes or continuous stream)</span>
            </label>
            <textarea
              value={binaryInput}
              onChange={(e) => setBinaryInput(e.target.value)}
              onKeyUp={() => binaryToText()}
              placeholder="e.g. 01001000 01100101 01101100 01101100 01101111"
              rows={5}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-green-400 font-mono placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={binaryToText}
                className="px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                Convert to Text
              </button>
              <button
                onClick={clearBinarySide}
                className="px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                Clear
              </button>
            </div>
            {/* Live stats */}
            {binaryInput.trim() && (
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                  {binaryStats.bits} bit{binaryStats.bits !== 1 ? 's' : ''}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                  {binaryStats.bytes} byte{binaryStats.bytes !== 1 ? 's' : ''}
                </span>
                {binaryStats.bits > 0 && !binaryStats.valid && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    Invalid input
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {binaryError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {binaryError}
            </div>
          )}

          {/* Output */}
          {textOutput && !binaryError && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Text Output</label>
                <button
                  onClick={copyTextOutput}
                  className="px-3 py-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  Copy
                </button>
              </div>
              <div className="relative">
                <pre className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-slate-200 font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto select-all">
                  {textOutput}
                </pre>
              </div>
            </div>
          )}

          {/* Quick Reference */}
          <details className="mt-6">
            <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors select-none">
              Quick Reference — Common Characters in Binary
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs text-slate-400">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 pr-4 font-medium text-slate-300">Character</th>
                    <th className="text-left py-2 pr-4 font-medium text-slate-300">ASCII</th>
                    <th className="text-left py-2 pr-4 font-medium text-slate-300">Binary (8-bit)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['A', '65', '01000001'],
                    ['a', '97', '01100001'],
                    ['0', '48', '00110000'],
                    ['9', '57', '00111001'],
                    ['Space', '32', '00100000'],
                    ['!', '33', '00100001'],
                    ['@', '64', '01000000'],
                    ['~', '126', '01111110'],
                    ['\\n (LF)', '10', '00001010'],
                    ['\\r (CR)', '13', '00001101'],
                  ].map(([char, ascii, bin]) => (
                    <tr key={char} className="border-b border-slate-800">
                      <td className="py-2 pr-4 font-mono text-slate-200">{char}</td>
                      <td className="py-2 pr-4 font-mono text-amber-400">{ascii}</td>
                      <td className="py-2 pr-4 font-mono text-green-400">{bin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </ToolLayout>
  );
}
