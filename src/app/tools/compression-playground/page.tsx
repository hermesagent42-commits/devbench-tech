'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Download, RefreshCw, Trash2, FileArchive, BarChart3, CheckCircle2, Gauge, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

type Algorithm = 'gzip' | 'deflate' | 'deflate-raw';

interface CompressionResult {
  algorithm: Algorithm;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
  compressedData: Uint8Array;
  timeMs: number;
}

const ALGORITHMS: { id: Algorithm; label: string; available: boolean }[] = [
  { id: 'gzip', label: 'GZIP', available: true },
  { id: 'deflate', label: 'Deflate', available: true },
  { id: 'deflate-raw', label: 'Deflate Raw', available: true },
];

const SAMPLE_TEXT = `{
  "name": "DevBench",
  "version": "1.0.0",
  "description": "The developer toolkit that ships every hour.",
  "features": [
    "280+ client-side tools",
    "Zero dependencies per tool",
    "Instant builds with Next.js",
    "Browser-native APIs only"
  ],
  "categories": {
    "css": 95,
    "json": 22,
    "image": 12,
    "network": 8,
    "browser": 35,
    "developer": 40
  }
}`;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

async function compressData(input: string, algorithm: Algorithm): Promise<CompressionResult> {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(input);

  const start = performance.now();
  const stream = new CompressionStream(algorithm);
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const buf = new Uint8Array(inputBytes.length);
  buf.set(inputBytes);
  writer.write(buf);
  writer.close();

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const end = performance.now();

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const compressedData = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressedData.set(chunk, offset);
    offset += chunk.length;
  }

  return {
    algorithm,
    originalBytes: inputBytes.length,
    compressedBytes: compressedData.length,
    ratio: inputBytes.length > 0 ? ((1 - compressedData.length / inputBytes.length) * 100) : 0,
    compressedData,
    timeMs: end - start,
  };
}

async function decompressData(data: Uint8Array, algorithm: Algorithm): Promise<string> {
  const stream = new DecompressionStream(algorithm);
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const decBuf = new Uint8Array(data.length);
  decBuf.set(data);
  writer.write(decBuf);
  writer.close();

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const decompressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    decompressed.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(decompressed);
}

function bytesToHex(bytes: Uint8Array, maxLen: number = 256): string {
  const show = bytes.slice(0, maxLen);
  return Array.from(show)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export default function CompressionPlaygroundPage() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Map<Algorithm, CompressionResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'hex'>('overview');
  const [decompressedVerify, setDecompressedVerify] = useState('');
  const [verifying, setVerifying] = useState(false);

  const runAll = useCallback(async () => {
    const text = input.trim();
    if (!text) {
      setResults(new Map());
      return;
    }
    setLoading(true);
    const newResults = new Map<Algorithm, CompressionResult>();

    for (const algo of ALGORITHMS) {
      try {
        const result = await compressData(text, algo.id);
        newResults.set(algo.id, result);
      } catch {
        // Algorithm not supported — skip
      }
    }

    setResults(newResults);
    setLoading(false);
  }, [input]);

  // Auto-compress on input change (debounced)
  useEffect(() => {
    if (!input.trim()) {
      setResults(new Map());
      setDecompressedVerify('');
      return;
    }
    const timer = setTimeout(runAll, 400);
    return () => clearTimeout(timer);
  }, [input, runAll]);

  const clearAll = useCallback(() => {
    setInput('');
    setResults(new Map());
    setDecompressedVerify('');
  }, []);

  const loadSample = useCallback(() => {
    setInput(SAMPLE_TEXT);
  }, []);

  const verifyDecompression = useCallback(async () => {
    // Use the first result that exists
    for (const algo of ALGORITHMS) {
      const result = results.get(algo.id);
      if (result) {
        setVerifying(true);
        try {
          const decompressed = await decompressData(result.compressedData, result.algorithm);
          setDecompressedVerify(decompressed);
        } catch {
          setDecompressedVerify('[Decompression failed]');
        }
        setVerifying(false);
        return;
      }
    }
  }, [results]);

  const copyHex = useCallback(() => {
    const firstResult = results.values().next().value as CompressionResult | undefined;
    if (!firstResult) return;
    const hex = bytesToHex(firstResult.compressedData, firstResult.compressedData.length);
    navigator.clipboard.writeText(hex).then(
      () => toast.success('Hex data copied!'),
      () => toast.error('Failed to copy')
    );
  }, [results]);

  const downloadCompressed = useCallback(() => {
    const firstResult = results.values().next().value as CompressionResult | undefined;
    if (!firstResult) return;
    const blob = new Blob([new Uint8Array(firstResult.compressedData)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed-${firstResult.algorithm}-${Date.now()}.bin`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded compressed data');
  }, [results]);

  // Find best algorithm
  const bestAlgo = Array.from(results.values()).reduce((best, r) =>
    !best || r.ratio > best.ratio ? r : best, null as CompressionResult | null
  );

  return (
    <ToolLayout
      title="Compression Playground"
      description="Test GZIP, Deflate, and Deflate Raw compression — compare sizes, ratios, and hex output. All client-side via the CompressionStream API."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <label className="text-white font-semibold text-sm block mb-3">
              Input Text / JSON / HTML
            </label>
            <textarea
              className="input-field w-full h-48 resize-y font-mono text-xs"
              placeholder="Paste text, JSON, HTML, or any content to test compression..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500">
                {input.length} chars · {formatBytes(new TextEncoder().encode(input).length)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadSample}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Load sample
                </button>
                <button
                  onClick={clearAll}
                  className="text-slate-500 hover:text-red-400 transition-colors text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Algorithms description */}
          <div className="card space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-brand-400" />
              Algorithms
            </h3>
            <div className="space-y-2">
              <div className="text-xs">
                <span className="text-brand-400 font-medium">GZIP</span>
                <span className="text-slate-500 ml-2">Most common, used in HTTP Content-Encoding. Wraps Deflate with headers/checksums.</span>
              </div>
              <div className="text-xs">
                <span className="text-amber-400 font-medium">Deflate</span>
                <span className="text-slate-500 ml-2">ZLIB format (with 2-byte header and 4-byte checksum). Used by PNG images.</span>
              </div>
              <div className="text-xs">
                <span className="text-emerald-400 font-medium">Deflate Raw</span>
                <span className="text-slate-500 ml-2">Bare DEFLATE stream, no wrapper. Used where you handle framing yourself.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-lighter border border-slate-700/50 mt-2">
              <p className="text-xs text-slate-400">
                💡 Powered by the browser&apos;s native <code className="text-brand-400">CompressionStream</code> API.
                No dependencies. All processing happens in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3 space-y-6">
          {/* Results Cards */}
          {results.size > 0 ? (
            <>
              {/* Summary bar */}
              <div className="card flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-brand-400" />
                  <span className="text-sm text-slate-300">
                    Best: <span className="text-brand-400 font-semibold">{bestAlgo?.algorithm.toUpperCase()}</span>
                    {' '}saved <span className="text-emerald-400 font-semibold">{bestAlgo ? formatPercent(bestAlgo.ratio) : '—'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-slate-300">
                    Original: <span className="text-white font-semibold">{formatBytes(bestAlgo?.originalBytes ?? 0)}</span>
                  </span>
                </div>
              </div>

              {/* Per-algorithm results */}
              <div className="space-y-3">
                {ALGORITHMS.map((algo) => {
                  const result = results.get(algo.id);
                  if (!result) return null;
                  const isBest = bestAlgo?.algorithm === algo.id;
                  return (
                    <div
                      key={algo.id}
                      className={`card border-2 transition-colors ${
                        isBest
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isBest ? 'text-emerald-400' : 'text-white'}`}>
                            {algo.label}
                          </span>
                          {isBest && (
                            <span className="badge-primary text-[10px]">BEST</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {result.timeMs.toFixed(1)} ms
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Original</div>
                          <div className="text-sm text-slate-300 font-mono">{formatBytes(result.originalBytes)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Compressed</div>
                          <div className={`text-sm font-mono ${isBest ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {formatBytes(result.compressedBytes)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Saved</div>
                          <div className={`text-sm font-mono font-bold ${result.ratio > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatPercent(result.ratio)}
                          </div>
                        </div>
                      </div>

                      {/* Compression bar */}
                      <div className="mt-3 h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isBest ? 'bg-emerald-500' : 'bg-brand-500'
                          }`}
                          style={{
                            width: `${Math.min(result.ratio, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View toggle & actions */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1 p-1 rounded-lg bg-surface-lighter inline-flex">
                  <button
                    onClick={() => setViewMode('overview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'overview'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3 inline mr-1" />
                    Overview
                  </button>
                  <button
                    onClick={() => setViewMode('hex')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'hex'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Hex View
                  </button>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={copyHex} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                    <Copy className="w-3 h-3" />
                    Copy Hex
                  </button>
                  <button onClick={downloadCompressed} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                    <Download className="w-3 h-3" />
                    Download .bin
                  </button>
                </div>
              </div>

              {/* Hex View */}
              {viewMode === 'hex' && (
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Compressed Data (hex)</h4>
                    <span className="text-xs text-slate-500">
                      First 512 bytes shown
                    </span>
                  </div>
                  {ALGORITHMS.map((algo) => {
                    const result = results.get(algo.id);
                    if (!result) return null;
                    return (
                      <div key={algo.id} className="mb-3 last:mb-0">
                        <div className="text-xs text-slate-400 mb-1">{algo.label}</div>
                        <pre className="text-xs font-mono text-slate-300 bg-surface p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                          {bytesToHex(result.compressedData)}
                          {result.compressedBytes > 256 && (
                            <span className="text-slate-600"> ... ({result.compressedBytes - 256} more bytes)</span>
                          )}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Verification */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Verify Round-Trip
                  </h4>
                  <button
                    onClick={verifyDecompression}
                    disabled={verifying || results.size === 0}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
                    {verifying ? 'Decompressing...' : 'Test Decompression'}
                  </button>
                </div>
                {decompressedVerify ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {decompressedVerify === input ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-emerald-400 font-medium">
                            Perfect match! Round-trip successful.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-red-400">⚠️ Mismatch detected</span>
                        </>
                      )}
                    </div>
                    <pre className="text-xs font-mono text-slate-300 bg-surface p-3 rounded-lg overflow-auto max-h-48">
                      {decompressedVerify.slice(0, 1000)}
                      {decompressedVerify.length > 1000 && '\n... (truncated)'}
                    </pre>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Decompress the output to verify the round-trip works correctly.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                <FileArchive className="w-10 h-10 text-brand-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                Enter text to compare compression
              </h3>
              <p className="text-slate-400 text-sm max-w-xs text-center">
                See how GZIP, Deflate, and Deflate Raw compress your content.
                All processing happens in your browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
